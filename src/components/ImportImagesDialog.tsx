import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { selectDirectory, getCourseDirPath } from '../utils/electronFs';
import { createDefaultElement } from '../elements/elementMeta';
import ConfirmDialog from './ConfirmDialog';
import type { SubPage, Stage } from '../types';

type Step = 'select-folder' | 'importing';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

// 自然数排序：image2.png < image10.png（而不是 image10 < image2）
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// 复用 ImportPPTDialog 的分块编码模式，避免大图片 spread 栈溢出
function uint8ArrayToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

interface ImportImagesDialogProps {
  onClose: () => void;
}

export default function ImportImagesDialog({ onClose }: ImportImagesDialogProps) {
  const currentCourse = useEditorStore((state) => state.currentCourse);

  const [step, setStep] = useState<Step>('select-folder');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  // 取消令牌：组件卸载或用户主动关闭时设为 true，循环里检查到就立即退出
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleSelectFolder = async () => {
    if (!currentCourse) {
      setErrorDialog({ title: '无法导入', message: '请先打开或新建课程' });
      return;
    }

    const folderPath = await selectDirectory();
    if (!folderPath) return;

    setStep('importing');
    cancelledRef.current = false;

    const startStageCount = currentCourse.stages.length;

    const rollbackOnCancel = () => {
      useEditorStore.setState((state) => {
        if (state.currentCourse && state.currentCourse.stages.length > startStageCount) {
          state.currentCourse.stages.splice(startStageCount);
        }
      });
    };

    try {
      // 列出文件夹下所有图片
      const entries = await window.electronAPI.listDirectory(folderPath);
      const imageFiles = entries
        .filter((e: { name: string; isDir: boolean }) => !e.isDir)
        .map((e: { name: string; isDir: boolean }) => e.name)
        .filter((name: string) => IMAGE_EXTS.some((ext) => name.toLowerCase().endsWith(ext)))
        .sort(naturalCompare);

      if (imageFiles.length === 0) {
        throw new Error('文件夹下没有图片文件');
      }

      setProgress({ current: 0, total: imageFiles.length });

      const courseDirPath = getCourseDirPath(currentCourse.id);
      if (!courseDirPath) {
        throw new Error('课程目录不存在');
      }

      const sep = folderPath.includes('\\') ? '\\' : '/';

      for (let i = 0; i < imageFiles.length; i++) {
        if (cancelledRef.current) {
          rollbackOnCancel();
          return;
        }

        const fileName = imageFiles[i];
        const srcAbsPath = `${folderPath}${sep}${fileName}`;

        // 读源文件为 buffer → base64，再走 saveImageToCourse
        // 这样命名（img_<hash>.ext）和去重逻辑（按 hash 全目录扫描）与 PPT 导入一致
        const buffer = await window.electronAPI.readFileAsBuffer(srcAbsPath);
        if (cancelledRef.current) { rollbackOnCancel(); return; }
        if (!buffer) throw new Error(`读取图片失败: ${fileName}`);
        const base64 = uint8ArrayToBase64(buffer);

        // 提取扩展名（去掉前导点，传给 saveImageToCourse）
        const ext = (fileName.match(/\.([^.]+)$/)?.[1] || 'png').toLowerCase();
        const relativePath = await window.electronAPI.saveImageToCourse(
          courseDirPath,
          fileName, // 实际不会用作文件名前缀（图片会强制成 img_<hash>），传一个占位即可
          base64,
          ext
        );
        if (cancelledRef.current) { rollbackOnCancel(); return; }

        // 文件名（不含扩展名）作为 SubPage 名字前缀
        const baseName = fileName.replace(/\.[^.]+$/, '');

        const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const newSubPageId = genId('subpage');

        // 复用 createDefaultElement 拿到自动命名（NewImage_N）
        const newElement = createDefaultElement('NewImage', newSubPageId);
        newElement.x = 0;
        newElement.y = 0;
        newElement.width = 1920;
        newElement.height = 1080;
        newElement.props = { ...newElement.props, skin: relativePath };

        const newSubPage: SubPage = {
          id: newSubPageId,
          name: `${baseName} - 页 ${i + 1}`,
          elements: [newElement],
        };

        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 ${useEditorStore.getState().currentCourse!.stages.length + 1}`,
          subPages: [newSubPage],
        };

        // 用 setState 走 immer draft，直接对 getState() 突变会因 freeze 报错
        useEditorStore.setState((state) => {
          if (state.currentCourse) {
            state.currentCourse.stages.push(newStage);
          }
        });

        setProgress({ current: i + 1, total: imageFiles.length });
      }

      if (cancelledRef.current) {
        rollbackOnCancel();
        return;
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

      onClose();
    } catch (e) {
      // 取消导致的异常静默退出
      if (cancelledRef.current) {
        rollbackOnCancel();
        return;
      }
      // 回滚已添加的关卡
      useEditorStore.setState((state) => {
        if (state.currentCourse && state.currentCourse.stages.length > startStageCount) {
          state.currentCourse.stages.splice(startStageCount);
        }
      });
      setErrorDialog({
        title: '导入失败',
        message: `无法导入图片：${(e as Error).message}\n\n请检查文件夹是否包含有效的图片文件。`,
      });
      setStep('select-folder');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={step === 'importing' ? undefined : onClose}
    >
      <div className="bg-slate-800 rounded-lg shadow-xl w-[500px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <span className="text-lg font-medium">导入图片</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'select-folder' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">选择包含图片的文件夹，每张图片会生成一个大关卡</p>
              <p className="text-xs text-slate-500">支持格式：PNG / JPG / JPEG / GIF / WEBP / BMP</p>
              <button
                onClick={handleSelectFolder}
                className="py-3 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
              >
                选择图片文件夹
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">正在导入图片</p>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: progress ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-sm text-slate-400">
                {progress ? `第 ${progress.current} / ${progress.total} 张` : '正在扫描文件夹...'}
              </p>
            </div>
          )}
        </div>
      </div>

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
