import { Undo, Redo, Languages, Download, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { exportProject } from '../utils/exportProject';
import { compileBuild } from '../utils/compileBuild';
import { showToast } from '../utils/toast';
import { createProjectInDirectory, openProjectFromDirectory, writeBackToLocalFile, getCourseFilePath, getCourseDirPath, selectDirectory, openFolder, cleanupUnreferencedImages, collectImageReferences, saveProjectAs } from '../utils/electronFs';
import { useState } from 'react';
import FileMenu from './FileMenu';
import CreateProjectDialog from './CreateProjectDialog';
import SaveAsDialog from './SaveAsDialog';
import ConfirmDialog from './ConfirmDialog';
import SyncSettings from './SyncSettings';
import type { SyncConfig } from './SyncSettings';
import { useI18n } from '../i18n/context';
import { findMissingResourceElements, type ResourceMissingItem } from '../utils/checkResourceReady';
import { ResourceMissingDialog } from './ResourceMissingDialog';
import { isFlatLesson } from '../utils/courseKind';
import { collectInternalPageIssues, isInternalPagesWorkbenchReadonly } from '../utils/internalPages';
import { requestPageThumbnailFlush } from '../utils/pageThumbnailSync';
import { commitPendingPropertyEdits } from '../utils/propertyEditSession';

export default function Toolbar({ isDirty, onBack }: { isDirty?: boolean; onBack?: () => void }) {
  const { language, setLanguage, t } = useI18n();
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const historyIndex = useEditorStore((state) => state.historyIndex);
  const history = useEditorStore((state) => state.history);
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const workbenchReadonly = useEditorStore((state) => isInternalPagesWorkbenchReadonly(
    state.currentCourse,
    state.currentSubPageId,
    state.focusSubPageId,
  ));
  const setCurrentCourse = useEditorStore((state) => state.setCurrentCourse);
  const setFeedback = useEditorStore((state) => state.setFeedback);

  const [publishError, setPublishError] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showPreviewChoice, setShowPreviewChoice] = useState(false);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ ip: '127.0.0.1', port: '9001', roomId: '10001' });
  const [resourceMissingItems, setResourceMissingItems] = useState<ResourceMissingItem[]>([]);
  const [resourceMissingContinue, setResourceMissingContinue] = useState<{ label: string; action: () => void } | null>(null);

  const canUndo = !workbenchReadonly && historyIndex > 0;
  const canRedo = !workbenchReadonly && historyIndex < history.length - 1;

  const handleNew = () => {
    commitPendingPropertyEdits();
    if (currentCourse && [...currentCourse.stages, ...(currentCourse.previewStages ?? [])].some(s => s.subPages.some(sp => sp.elements.length > 0))) {
      setShowNewConfirm(true);
      return;
    }
    setShowCreateDialog(true);
  };

  const handleCreateConfirm = async (courseId: string, dirPath: string, kind: 'normal' | 'homework' | 'sEvaluation' | 'review' = 'normal') => {
    try {
      const { course } = await createProjectInDirectory(courseId, dirPath, kind);
      setShowCreateDialog(false);
      setCurrentCourse(course);
    } catch (e) {
      if ((e as Error).message === 'DIR_ALREADY_EXISTS') {
        showToast(t('courseDirAlreadyExists'), 'error');
      } else {
        showToast(t('createFailed'), 'error');
      }
    }
  };

  const handleOpen = async () => {
    commitPendingPropertyEdits();
    const dir = await selectDirectory();
    if (!dir) return;
    // SVN 检查暂时禁用，后续需要时恢复
    // if (typeof dir === 'string' && !(await isSvnDirectory(dir))) {
    //   showToast(t('notSvnDir'), 'error');
    //   return;
    // }
    const result = await openProjectFromDirectory(dir);
    if (result) {
      setCurrentCourse(result.course);
    } else {
      showToast(t('noCourseFileFound'), 'error');
    }
  };

  const handleSave = async () => {
    commitPendingPropertyEdits();
    if (!currentCourse) return;
    try {
      requestPageThumbnailFlush();
      const filePath = getCourseFilePath(currentCourse.id);
      if (filePath) {
        await writeBackToLocalFile(currentCourse.id, currentCourse);
        showToast(t('saveSuccess'), 'success');
      } else {
        showToast(t('noLocalFileHandle'), 'error');
      }
    } catch {
      showToast(t('saveFailed'), 'error');
    }
  };

  const handleSaveAs = async () => {
    commitPendingPropertyEdits();
    if (!currentCourse) return;
    if (!getCourseDirPath(currentCourse.id)) {
      showToast(t('saveAsNoSourceDir'), 'error');
      return;
    }
    try {
      requestPageThumbnailFlush();
      await writeBackToLocalFile(currentCourse.id, currentCourse);
    } catch {
      showToast(t('saveFailed'), 'error');
      return;
    }
    setShowSaveAsDialog(true);
  };

  const handleSaveAsConfirm = async (newId: string, dirPath: string) => {
    if (!currentCourse) return;
    setShowSaveAsDialog(false);
    try {
      const { course: newCourse } = await saveProjectAs(currentCourse, newId, dirPath);
      setCurrentCourse(newCourse);
      showToast(t('saveAsSuccess'), 'success');
    } catch (e) {
      setErrorDialog({ title: t('saveAsFailed'), message: (e as Error).message });
    }
  };

  const handleOpenCourseFolder = async () => {
    if (!currentCourse) return;
    const dirPath = getCourseDirPath(currentCourse.id);
    if (dirPath) {
      await openFolder(dirPath);
    }
  };

  const isFlat = isFlatLesson(currentCourse?.kind);
  const hasPreviewStages = !isFlat && (currentCourse?.previewStages?.length ?? 0) > 0;
  const canPublish = !busy && currentCourse && (currentCourse.stages.length > 0 || (currentCourse.previewStages?.length ?? 0) > 0);
  const canPreview = !busy && currentCourse && (currentCourse.stages.length > 0 || (currentCourse.previewStages?.length ?? 0) > 0);

  const checkResourcesUploaded = (): boolean => {
    if (!currentCourse) return true;
    const missing = findMissingResourceElements(currentCourse);
    if (missing.length > 0) { setResourceMissingItems(missing); return false; }
    return true;
  };

  const assertInternalPagesReady = (mode: 'preview' | 'publish'): void => {
    if (!currentCourse) return;
    const issues = collectInternalPageIssues(currentCourse);
    const blocking = issues.filter((issue) => issue.severity === 'blocking');
    if (blocking.length > 0 && mode === 'publish') {
      const details = blocking.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
      const more = blocking.length > 8 ? `\n另有 ${blocking.length - 8} 项未显示` : '';
      throw new Error(`内部页面关系尚未完成，不能发布：\n\n${details}${more}`);
    }
    if (blocking.length > 0) showToast(`内部页面有 ${blocking.length} 项阻塞发布的问题；本次仅预览，仍可继续检查`, 'warning');
    const warnings = issues.filter((issue) => issue.severity === 'warning' && issue.code !== 'capacity');
    if (warnings.length > 0) showToast(`内部页面有 ${warnings.length} 项非阻塞提醒，可在专注工作区查看`, 'info');
  };

  // 共享流程：导出工程（不提交 SVN）→ 编译 → 打 zip → 上传 → 打开预览
  // previewMode: false=正课, true=预习关卡
  const runCompileBuildAndOpen = async (previewMode: boolean) => {
    commitPendingPropertyEdits();
    if (!currentCourse) return;
    assertInternalPagesReady('preview');
    requestPageThumbnailFlush();
    await writeBackToLocalFile(currentCourse.id, currentCourse);
    await cleanupUnreferencedImages(currentCourse.id, collectImageReferences(currentCourse));
    await exportProject(currentCourse, { skipSvn: true });
    showToast(t('compiling'), 'success');
    const result = await compileBuild(currentCourse);
    if (!result.ok || !result.outputDir) {
      throw new Error(result.error || t('compileFailed'));
    }
    const zipResult = await window.electronAPI.zipDirectory(result.outputDir);
    if (!zipResult.ok || !zipResult.data) {
      throw new Error(zipResult.error || '打包 zip 失败');
    }
    const zipBuffer = zipResult.data;

    const srv = (localStorage.getItem('forge_server_url') || window.location.origin).replace(/\/+$/, '');
    const tid = localStorage.getItem('forge_teacher_id') || '';
    const formData = new FormData();
    formData.append('courseId', currentCourse.id);
    formData.append('teacherId', tid);
    formData.append('kind', currentCourse.kind || 'normal');
    formData.append('file', new Blob([zipBuffer]), 'compiled.zip');
    const resp = await fetch(`${srv}/api/upload-compiled-zip`, { method: 'POST', body: formData });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || '上传 zip 失败');

    const cid = json.cid || currentCourse.id;
    const cnBase = tid ? `test_${tid}_${cid}` : `test_${cid}`;
    const cn = previewMode ? `${cnBase}_preview` : cnBase;
    window.open(`${srv}/preview-server/?course=${cn}&type=1&ct=1&rl=dev&sdk=full`, '_blank');
  };

  // 发布工程核心流程（不含资源检查，便于"继续发布工程"按钮跳过资源检查后调用）
  const runPublishFlow = async () => {
    commitPendingPropertyEdits();
    if (!currentCourse || busy) return;
    setBusy(true);
    try {
      assertInternalPagesReady('publish');
      requestPageThumbnailFlush();
      await writeBackToLocalFile(currentCourse.id, currentCourse);
      await cleanupUnreferencedImages(currentCourse.id, collectImageReferences(currentCourse));
      const result = await exportProject(currentCourse);
      if (result.svnSubmitted) {
        showToast('工程导出并提交 SVN 成功', 'success');
      } else {
        setPublishError('工程导出成功，但当前目录不是 SVN 目录，所以没有提交 SVN。\n\n如需正式发布，请将课件目录放到 SVN 工作副本中再重新发布。');
      }
    } catch (e) {
      setPublishError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 预览核心流程（不含资源检查），previewMode 区分预习/正课
  const runPreviewFlow = async (previewMode: boolean) => {
    if (!currentCourse || busy) return;
    setBusy(true);
    try {
      await runCompileBuildAndOpen(previewMode);
    } catch (e) {
      setPublishError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 relative">
      <div className="flex items-center gap-2">
        <img src="/favicon.ico" className="w-7 h-7 rounded" alt="豌豆课件编辑器" />
        <span className="font-semibold text-sm">豌豆课件编辑器</span>
        <span className="text-[10px] text-slate-400 select-none" title="编辑器版本">v{__APP_VERSION__}</span>
        {onBack && (
          <button onClick={onBack} className="px-2 py-1 hover:bg-slate-700 rounded text-xs text-slate-400 hover:text-white">
            {t('backToStart')}
          </button>
        )}
      </div>

      <FileMenu
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />

      {currentCourse && (
        <>
          <div
            className="text-sm text-slate-400 cursor-pointer hover:text-blue-400 transition-colors"
            onClick={handleOpenCourseFolder}
          >{currentCourse.id}</div>
          <span className={`text-[10px] ml-1 ${isDirty ? 'text-amber-400' : 'text-emerald-400'}`}>{isDirty ? t('unsaved') : t('saved')}</span>
        </>
      )}

      <div className="flex-1" />

      {currentCourse && (
        <div className="flex items-center gap-1.5 mr-1">
          <span className="text-xs text-slate-400">通用反馈动画:</span>
          <div className="flex items-center bg-slate-700 rounded border border-slate-600 overflow-hidden">
            <button
              onClick={() => setFeedback('spirit')}
              className={`px-2 py-1 text-xs ${(currentCourse.feedback ?? 'spirit') === 'spirit' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
            >
              豌豆精灵
            </button>
            <button
              onClick={() => setFeedback('newLD')}
              className={`px-2 py-1 text-xs border-l border-slate-600 ${currentCourse.feedback === 'newLD' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
            >
              乐迪
            </button>
          </div>
        </div>
      )}

      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="撤销 (Ctrl+Z)"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="重做 (Ctrl+Shift+Z)"
      >
        <Redo size={16} />
      </button>

      <div className="w-px h-6 bg-slate-700" />

      <button
        onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        className="p-1.5 hover:bg-slate-700 rounded flex items-center gap-1 text-xs"
        title="切换语言 / Switch Language"
      >
        <Languages size={16} />
        {language === 'zh' ? 'EN' : '中'}
      </button>

      {/* 发布 / 预览按钮组：busy 时蒙版防重复点击 */}
      <div className="flex items-center gap-2 relative">
        {busy && <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center rounded cursor-not-allowed select-none text-xs text-white animate-pulse">处理中...</div>}
        <button
          disabled={!canPublish}
          onClick={async () => {
            if (!currentCourse || busy) return;
            if (!checkResourcesUploaded()) {
              setResourceMissingContinue({ label: '继续发布工程', action: () => runPublishFlow() });
              return;
            }
            await runPublishFlow();
          }}
          className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm ${canPublish ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-700/50 text-white/40 cursor-not-allowed'}`}
          title={t('publishProject')}
        >
          <Download size={16} />
          {t('publishProject')}
        </button>

        <div className="flex items-center gap-1 ml-1 border-l border-slate-600 pl-2">
          <button
            onClick={async () => {
              if (!currentCourse || busy) return;
              if (!checkResourcesUploaded()) {
                if (hasPreviewStages) {
                  setResourceMissingContinue({ label: '继续预览', action: () => setShowPreviewChoice(true) });
                } else {
                  setResourceMissingContinue({ label: '继续预览', action: () => runPreviewFlow(false) });
                }
                return;
              }
              if (hasPreviewStages) {
                setShowPreviewChoice(true);
                return;
              }
              await runPreviewFlow(false);
            }}
            disabled={!canPreview}
          className={`px-2.5 py-1.5 rounded text-xs ${canPreview ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-700/50 text-white/40 cursor-not-allowed'}`}
          title={t('previewOnly')}
        >
          {t('preview')}
        </button>
        <button
          disabled
          className="px-2.5 py-1.5 bg-orange-700/50 rounded text-xs text-white/40 cursor-not-allowed"
          title={t('teacherPreview')}
        >
          {t('teacher')}
        </button>
        <button
          disabled
          className="px-2.5 py-1.5 bg-cyan-700/50 rounded text-xs text-white/40 cursor-not-allowed"
          title={t('studentPreview')}
        >
          {t('student')}
        </button>
        <button
          disabled
          className="px-2.5 py-1.5 bg-slate-600/50 rounded text-xs text-white/40 cursor-not-allowed"
          title={t('observerPreview')}
        >
          {t('observer')}
        </button>
        <button
          onClick={() => setShowSyncSettings(true)}
          className="px-1.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded text-xs"
          title={t('syncSettings')}
        >
          ⚙
        </button>
      </div>
      </div>
    </div>
    {showNewConfirm && (
      <ConfirmDialog
        title={t('newCourseDialog')}
        message={t('newCourseConfirm')}
        confirmText={t('newCourse')}
        danger
        onConfirm={() => { setShowNewConfirm(false); setShowCreateDialog(true); }}
        onCancel={() => setShowNewConfirm(false)}
      />
    )}
    {showCreateDialog && (
      <CreateProjectDialog onConfirm={handleCreateConfirm} onCancel={() => setShowCreateDialog(false)} />
    )}
    {showSaveAsDialog && currentCourse && (
      <SaveAsDialog
        currentCourseId={currentCourse.id}
        kind={currentCourse.kind ?? 'normal'}
        onConfirm={handleSaveAsConfirm}
        onCancel={() => setShowSaveAsDialog(false)}
      />
    )}
    {showSyncSettings && (
      <SyncSettings config={syncConfig} onSave={setSyncConfig} onClose={() => setShowSyncSettings(false)} />
    )}
    {publishError && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPublishError(null)}>
        <div className="bg-slate-800 rounded-lg shadow-xl w-[640px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <span className="text-lg font-medium text-red-400">发布失败</span>
            <button onClick={() => setPublishError(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="px-6 py-6 max-h-[400px] overflow-y-auto">
            <p className="text-base text-slate-300 break-all">{publishError}</p>
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-slate-700">
            <button onClick={() => setPublishError(null)} className="flex-1 py-2.5 text-base bg-slate-700 hover:bg-slate-600 rounded text-slate-300">关闭</button>
          </div>
        </div>
      </div>
    )}
    {errorDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setErrorDialog(null)}>
        <div className="bg-slate-800 rounded-lg shadow-xl w-[640px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <span className="text-lg font-medium text-red-400">{errorDialog.title}</span>
            <button onClick={() => setErrorDialog(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="px-6 py-6 max-h-[400px] overflow-y-auto">
            <p className="text-base text-slate-300 break-all">{errorDialog.message}</p>
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-slate-700">
            <button onClick={() => setErrorDialog(null)} className="flex-1 py-2.5 text-base bg-slate-700 hover:bg-slate-600 rounded text-slate-300">关闭</button>
          </div>
        </div>
      </div>
    )}
    {showPreviewChoice && currentCourse && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPreviewChoice(false)}>
        <div className="bg-slate-800 rounded-lg shadow-xl w-[400px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <span className="text-lg font-medium">{t('preview')}</span>
            <button onClick={() => setShowPreviewChoice(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          <div className="px-6 py-6 flex flex-col gap-4">
            <button
              onClick={async () => {
                setShowPreviewChoice(false);
                await runPreviewFlow(true);
              }}
              className="py-3 text-base bg-green-700 hover:bg-green-600 rounded text-white font-medium"
            >
              {t('previewStages')}
            </button>
            <button
              onClick={async () => {
                setShowPreviewChoice(false);
                await runPreviewFlow(false);
              }}
              className="py-3 text-base bg-indigo-700 hover:bg-indigo-600 rounded text-white font-medium"
            >
              {t('normalStages')}
            </button>
          </div>
        </div>
      </div>
    )}
      <ResourceMissingDialog
        items={resourceMissingItems}
        onClose={() => { setResourceMissingItems([]); setResourceMissingContinue(null); }}
        onContinue={resourceMissingContinue ? resourceMissingContinue.action : undefined}
        continueLabel={resourceMissingContinue?.label}
      />
    </>
  );
}
