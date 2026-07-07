import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { showToast } from '../utils/toast';
import { detectPowerPoint } from '../utils/powerPointDetect';
import { checkVCRuntimeInstalled, downloadVCRedist } from '../utils/vcRedist';
import { getCourseDirPath } from '../utils/electronFs';
import { createDefaultElement } from '../elements/elementMeta';
import ConfirmDialog from './ConfirmDialog';
import type { SubPage, Stage } from '../types';

function uint8ArrayToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

type Step = 'select-file' | 'detecting' | 'need-install' | 'converting' | 'need-vcredist' | 'downloading-vcredist' | 'waiting-vcredist-install';

interface ImportPPTDialogProps {
  onClose: () => void;
}

export default function ImportPPTDialog({ onClose }: ImportPPTDialogProps) {
  const currentCourse = useEditorStore((state) => state.currentCourse);

  const [step, setStep] = useState<Step>('select-file');
  const [pptPath, setPptPath] = useState<string | null>(null);
  const [showMacWarning, setShowMacWarning] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const [convertProgress, setConvertProgress] = useState<{ current: number; total: number } | null>(null);

  // 取消令牌：组件卸载或用户主动关闭时设为 true，循环里检查到就立即退出
  const cancelledRef = useRef(false);
  // 当前转换任务 id，用于通知主进程取消 soffice/pdftoppm
  const conversionIdRef = useRef<string | null>(null);

  // 卸载时取消转换（避免点 X 后主进程还在跑、关卡还在 push）
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (conversionIdRef.current) {
        window.electronAPI.cancelPptConversion?.(conversionIdRef.current).catch(() => { /* 忽略 */ });
      }
    };
  }, []);

  const handleConvert = async (pptPath: string, progId: string) => {
    if (!currentCourse) {
      setErrorDialog({ title: '无法导入', message: '请先打开或新建课程' });
      return;
    }

    const startStageCount = currentCourse.stages.length;
    // 生成本次转换的唯一 id，主进程用它把 spawn 出的 soffice/pdftoppm 句柄登记起来
    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    conversionIdRef.current = conversionId;
    cancelledRef.current = false;

    try {
      const result = await window.electronAPI.convertPptToImages({ pptPath, progId, conversionId });

      // 如果是用户取消导致的失败，静默退出，不弹错误
      if (cancelledRef.current || result.cancelled) return;

      if (!result.ok) {
        throw new Error(result.error);
      }

      const images = result.images || [];
      const tempDir = result.tempDir;
      setConvertProgress({ current: 0, total: images.length });

      const courseId = currentCourse.id;
      const courseDirPath = getCourseDirPath(courseId);
      if (!courseDirPath) {
        throw new Error('课程目录不存在');
      }

      const pptFileName = pptPath.split(/[/\\]/).pop()!.replace(/\.(pptx?|PPTX?)$/, '');
      const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      for (let i = 0; i < images.length; i++) {
        // 每次循环开头检查取消标记，用户点 X 后立刻退出循环
        if (cancelledRef.current) {
          // 清理已写入但未使用的临时目录
          if (tempDir) {
            window.electronAPI.cleanupTempDir(tempDir).catch(() => { /* 忽略 */ });
          }
          // 回滚已添加的关卡
          useEditorStore.setState((state) => {
            if (state.currentCourse && state.currentCourse.stages.length > startStageCount) {
              state.currentCourse.stages.splice(startStageCount);
            }
          });
          return;
        }

        const imgPath = images[i];

        const buffer = await window.electronAPI.readFileAsBuffer(imgPath);
        if (cancelledRef.current) continue; // 让下一轮循环开头的检查触发清理
        if (!buffer) throw new Error(`读取图片失败: ${imgPath}`);
        const base64 = uint8ArrayToBase64(buffer);

        const relativePath = await window.electronAPI.saveImageToCourse(
          courseDirPath,
          `ppt_page_${i + 1}`,
          base64,
          'png'
        );
        if (cancelledRef.current) continue;

        const stageNum = useEditorStore.getState().currentCourse!.stages.length + 1;

        const newSubPageId = genId('subpage');
        // 复用 createDefaultElement 拿到自动命名（NewImage_N）和默认属性
        const newElement = createDefaultElement('NewImage', newSubPageId);
        newElement.x = 0;
        newElement.y = 0;
        newElement.width = 1920;
        newElement.height = 1080;
        newElement.props = { ...newElement.props, skin: relativePath };

        const newSubPage: SubPage = {
          id: newSubPageId,
          name: `${pptFileName} - 页 ${i + 1}`,
          elements: [newElement],
        };

        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 ${stageNum}`,
          subPages: [newSubPage],
        };

        // 用 setState 走 immer draft，直接对 getState() 返回值突变会因 freeze 报错
        useEditorStore.setState((state) => {
          if (state.currentCourse) {
            state.currentCourse.stages.push(newStage);
          }
        });

        setConvertProgress({ current: i + 1, total: images.length });
      }

      if (cancelledRef.current) return;

      if (tempDir) {
        await window.electronAPI.cleanupTempDir(tempDir);
      }

      // 重新编号关卡（保持连续）+ 写一次历史
      useEditorStore.setState((state) => {
        if (state.currentCourse) {
          state.currentCourse.stages.forEach((stage, idx) => {
            stage.name = `关卡 ${idx + 1}`;
          });
        }
      });
      useEditorStore.getState().saveHistory();

      showToast(`成功导入 ${images.length} 页 PPT`, 'success');
      onClose();

    } catch (e) {
      // 取消导致的异常静默退出
      if (cancelledRef.current) {
        useEditorStore.setState((state) => {
          if (state.currentCourse && state.currentCourse.stages.length > startStageCount) {
            state.currentCourse.stages.splice(startStageCount);
          }
        });
        return;
      }
      // 回滚已添加的关卡（用 setState 走 immer draft）
      useEditorStore.setState((state) => {
        if (state.currentCourse && state.currentCourse.stages.length > startStageCount) {
          state.currentCourse.stages.splice(startStageCount);
        }
      });
      setErrorDialog({
        title: '转换失败',
        message: `无法转换 PPT 文件：${(e as Error).message}\n\n请检查文件是否损坏，或尝试用其他 PPT 文件。`
      });
      setStep('select-file');
    } finally {
      conversionIdRef.current = null;
    }
  };

  const handleSelectFile = async () => {
    // 当前仅支持 Windows 客户端：Mac 端 pdftoppm 二进制未打包
    const { platform } = await window.electronAPI.getPlatform();
    if (platform !== 'win32') {
      setShowMacWarning(true);
      return;
    }

    const result = await window.electronAPI.selectFile?.({
      filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt'] }],
    });

    if (!result) return;

    setPptPath(result);
    setStep('detecting');

    // 第一步：检测 PowerPoint/WPS
    const detected = await detectPowerPoint();
    if (!detected.engine || !detected.progId) {
      setStep('need-install');
      return;
    }

    // 第二步：检测 VC++ Runtime（pdftoppm 依赖）
    const vcInstalled = await checkVCRuntimeInstalled();
    if (!vcInstalled) {
      setStep('need-vcredist');
      return;
    }

    // 都检测通过，开始转换
    setStep('converting');
    await handleConvert(result, detected.progId);
  };

  const handleDownloadVCRedist = async () => {
    setStep('downloading-vcredist');
    try {
      const serverUrl = (localStorage.getItem('forge_server_url') || window.location.origin).replace(/\/+$/, '');
      const installerPath = await downloadVCRedist(serverUrl, () => {
        // VC++ Runtime 安装包较小（~25MB），不显示进度
      });

      await window.electronAPI.openInstaller(installerPath);
      setStep('waiting-vcredist-install');
    } catch (e) {
      setErrorDialog({
        title: '下载失败',
        message: `无法下载 VC++ Redistributable 安装包：${(e as Error).message}\n\n请检查网络连接或稍后重试。`
      });
      setStep('need-vcredist');
    }
  };

  const handleRetryVCRedist = async () => {
    setStep('detecting');
    const vcInstalled = await checkVCRuntimeInstalled();

    if (vcInstalled) {
      const detected = await detectPowerPoint();
      if (!detected.engine || !detected.progId) {
        setErrorDialog({ title: '异常', message: 'PowerPoint/WPS 检测失败，请重新打开导入对话框' });
        setStep('select-file');
        return;
      }
      setStep('converting');
      await handleConvert(pptPath!, detected.progId);
    } else {
      setErrorDialog({
        title: '未检测到 VC++ Runtime',
        message: '仍未检测到 Microsoft Visual C++ Redistributable，请确认已完成安装，然后重试。\n\n如果已安装但仍提示此错误，请尝试重启应用。'
      });
      setStep('waiting-vcredist-install');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={step === 'converting' || step === 'downloading-vcredist' ? undefined : onClose}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl w-[500px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <span className="text-lg font-medium">导入 PPT</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'select-file' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">选择要导入的 PowerPoint 文件</p>
              <button
                onClick={handleSelectFile}
                className="py-3 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
              >
                选择 PPT 文件
              </button>
            </div>
          )}

          {step === 'detecting' && (
            <div className="flex flex-col gap-4 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-300">检测 PowerPoint/WPS...</p>
            </div>
          )}

          {step === 'need-install' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">
                导入 PPT 需要 Microsoft Office 或 WPS Office 支持。
              </p>
              <p className="text-sm text-slate-400">
                请先安装 Microsoft Office 或 WPS Office，然后重新打开导入对话框。
              </p>
              <button
                onClick={onClose}
                className="py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              >
                取消
              </button>
            </div>
          )}

          {step === 'need-vcredist' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">
                需要 Microsoft Visual C++ Redistributable
              </p>
              <p className="text-sm text-slate-400">
                PPT 导入功能依赖 VC++ 运行库（约 25 MB）。
                下载完成后会自动打开安装向导，按提示完成安装即可。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  取消
                </button>
                <button
                  onClick={handleDownloadVCRedist}
                  className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
                >
                  下载并安装
                </button>
              </div>
            </div>
          )}

          {step === 'downloading-vcredist' && (
            <div className="flex flex-col gap-4 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-300">正在下载 VC++ Redistributable...</p>
            </div>
          )}

          {step === 'waiting-vcredist-install' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">请完成 VC++ Redistributable 安装向导</p>
              <p className="text-sm text-slate-400">
                安装向导已打开，请按提示完成安装。安装完成后点击下方按钮继续。
              </p>
              <button
                onClick={handleRetryVCRedist}
                className="py-2.5 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
              >
                我已安装完成，继续
              </button>
            </div>
          )}

          {step === 'converting' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">正在转换并保存</p>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: convertProgress ? `${(convertProgress.current / convertProgress.total) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-sm text-slate-400">
                {convertProgress
                  ? `第 ${convertProgress.current} / ${convertProgress.total} 页`
                  : '正在解析 PPT...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showMacWarning && (
        <ConfirmDialog
          title="功能暂未支持"
          message="PPT 导入功能当前仅支持 Windows 客户端。Mac 版本的 PDF 转换工具（pdftoppm）打包较为复杂，计划在后续版本中提供支持。"
          confirmText="我知道了"
          cancelText=""
          onConfirm={() => setShowMacWarning(false)}
          onCancel={() => setShowMacWarning(false)}
        />
      )}

      {errorDialog && (
        <ConfirmDialog
          title={errorDialog.title}
          message={errorDialog.message}
          confirmText="确定"
          cancelText=""
          danger={true}
          onConfirm={() => setErrorDialog(null)}
          onCancel={() => setErrorDialog(null)}
        />
      )}
    </div>
  );
}