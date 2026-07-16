import { useEditorStore } from './store/editorStore';
import { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import ElementToolbar from './components/ElementToolbar';
import ElementList from './components/ElementList';
import StartPage from './components/StartPage';
import { writeBackToLocalFile, getCourseFilePath, getCourseDirPath, cleanupUnreferencedImages, collectImageReferences } from './utils/electronFs';
import { I18nProvider } from './i18n';
import type { Course } from './types';
import FocusWorkspace from './components/FocusWorkspace';
import { isInternalPagesSubPage } from './utils/internalPages';

function App() {
  const setCurrentCourse = useEditorStore((state) => state.setCurrentCourse);
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const currentStageId = useEditorStore((state) => state.currentStageId);
  const currentSubPageId = useEditorStore((state) => state.currentSubPageId);
  const focusSubPageId = useEditorStore((state) => state.focusSubPageId);
  const enterFocusWorkspace = useEditorStore((state) => state.enterFocusWorkspace);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const copyElements = useEditorStore((state) => state.copyElements);
  const pasteElements = useEditorStore((state) => state.pasteElements);
  const duplicateElements = useEditorStore((state) => state.duplicateElements);
  const selectAll = useEditorStore((state) => state.selectAll);
  const groupElements = useEditorStore((state) => state.groupElements);
  const ungroupElements = useEditorStore((state) => state.ungroupElements);
  const [phase, setPhase] = useState<'landing' | 'editor'>('landing');
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [focusWidth, setFocusWidth] = useState(() => Math.min(440, Math.max(280, Number(localStorage.getItem('forge_focus_workspace_width')) || 320)));

  // GameLoader 初始化时会创建 layaContainer 并以黑色 canvas 覆盖整个视口
  // 在 landing 阶段需要隐藏它，进入 editor 后 Canvas 组件会把它移到正确位置
  useEffect(() => {
    const layaContainer = document.getElementById('layaContainer');
    if (layaContainer) {
      layaContainer.style.display = phase === 'landing' ? 'none' : '';
    }
  }, [phase]);

  const handleEnterEditor = (course: Course) => {
    setCurrentCourse(course);
    setPhase('editor');
  };

  // 课件切换时统一同步 window.__forgeCourseId 和 forge-local 协议的 courseId→dir 映射。
  // 不仅是从 landing 进入 editor 时，编辑器内 Toolbar"打开已有课件"切换也要走这里，
  // 否则 components.ts 拼 forge-local URL 时会用旧 courseId、Electron 主进程也找不到新课件目录。
  useEffect(() => {
    if (!currentCourse) return;
    (window as unknown as { __forgeCourseId?: string }).__forgeCourseId = currentCourse.id;
    const courseDir = getCourseDirPath(currentCourse.id);
    if (courseDir) window.electronAPI?.registerCourseDir?.(currentCourse.id, courseDir);
  }, [currentCourse]);

  // Toast 监听
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('forge:toast', handler);
    return () => window.removeEventListener('forge:toast', handler);
  }, []);

  // Auto-save with 15s debounce: 写入本地文件
  useEffect(() => {
    if (!currentCourse || phase !== 'editor') return;
    const timer = setTimeout(async () => {
      setIsDirty(true);
      try {
        const filePath = getCourseFilePath(currentCourse.id);
        if (filePath) {
          await writeBackToLocalFile(currentCourse.id, currentCourse);
          await cleanupUnreferencedImages(currentCourse.id, collectImageReferences(currentCourse));
        }
      } catch { /* 写入失败，忽略 */ }
      setIsDirty(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [currentCourse, phase]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (phase !== 'editor') return;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if (mod && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); redo();
      } else if (mod && e.key === 'c' && !isInput) {
        e.preventDefault(); copyElements();
      } else if (mod && e.key === 'v' && !isInput) {
        e.preventDefault(); pasteElements();
      } else if (mod && e.key === 'd' && !isInput) {
        e.preventDefault(); duplicateElements();
      } else if (mod && e.key === 'a' && !isInput) {
        e.preventDefault(); selectAll();
      } else if (mod && e.key === 's') {
        e.preventDefault();
        if (currentCourse) {
          const filePath = getCourseFilePath(currentCourse.id);
          if (filePath) {
            await writeBackToLocalFile(currentCourse.id, currentCourse);
            await cleanupUnreferencedImages(currentCourse.id, collectImageReferences(currentCourse));
          }
          setIsDirty(false);
        }
      } else if (mod && e.key === 'g' && !e.shiftKey && !isInput) {
        e.preventDefault(); groupElements();
      } else if (mod && e.key === 'g' && e.shiftKey && !isInput) {
        e.preventDefault(); ungroupElements();
      } else if (e.key === 'Enter' && !isInput && !focusSubPageId && currentCourse && currentStageId && currentSubPageId) {
        const subPage = [...currentCourse.stages, ...(currentCourse.previewStages ?? [])]
          .flatMap((stage) => stage.subPages)
          .find((page) => page.id === currentSubPageId);
        if (isInternalPagesSubPage(subPage)) {
          e.preventDefault();
          enterFocusWorkspace(currentStageId, currentSubPageId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copyElements, pasteElements, duplicateElements, selectAll, groupElements, ungroupElements, currentCourse, currentStageId, currentSubPageId, focusSubPageId, enterFocusWorkspace, phase]);

  // 点 Laya host 外的 UI 区域（Toolbar / 面板等）取消选中。
  // Laya host 内的点击（无论画布内外）由 selection.ts 的 hit-test 统一处理：
  // 命中组件 → 选中；空白 → onDeselect → clearSelection。
  // 例外：
  // - [data-property-panel]：编辑属性不应清空选中。
  // - [data-keep-selection]：通用白名单（如 ElementList 删除按钮）。
  useEffect(() => {
    if (phase !== 'editor') return;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-property-panel]') || target.closest('[data-keep-selection]')) return;
      // 点击在 Laya host 内（canvas 区域）：让 Laya 自己处理选中/取消
      const host = document.querySelector('[data-laya-host]') as HTMLElement | null;
      if (host && host.contains(target)) return;
      useEditorStore.getState().clearSelection();
    };
    window.addEventListener('mousedown', handleMouseDown, true);
    return () => window.removeEventListener('mousedown', handleMouseDown, true);
  }, [phase]);

  return (
    <>
    <I18nProvider>
      {phase === 'landing' ? (
        <StartPage onEnterEditor={handleEnterEditor} />
      ) : (
        <div className="h-screen flex flex-col bg-slate-900 text-white">
          <Toolbar isDirty={isDirty} onBack={() => setPhase('landing')} />
          <div className="flex-1 flex overflow-hidden">
            <div
              className={`relative bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 ${focusSubPageId ? 'overflow-visible z-30' : 'overflow-hidden'}`}
              style={{ width: focusSubPageId ? focusWidth : 240 }}
            >
              {focusSubPageId ? (
                <>
                  <FocusWorkspace />
                  <div
                    className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-[60]"
                    onDoubleClick={() => { setFocusWidth(320); localStorage.setItem('forge_focus_workspace_width', '320'); }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      const startX = event.clientX;
                      const startWidth = focusWidth;
                      const move = (moveEvent: MouseEvent) => setFocusWidth(Math.min(440, Math.max(280, startWidth + moveEvent.clientX - startX)));
                      const up = (upEvent: MouseEvent) => {
                        const next = Math.min(440, Math.max(280, startWidth + upEvent.clientX - startX));
                        setFocusWidth(next);
                        localStorage.setItem('forge_focus_workspace_width', String(next));
                        window.removeEventListener('mousemove', move);
                        window.removeEventListener('mouseup', up);
                      };
                      window.addEventListener('mousemove', move);
                      window.addEventListener('mouseup', up);
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="flex-[0_1_60%] flex flex-col overflow-hidden min-h-0"><PageList /></div>
                  <div className="flex-[1_0_40%] flex flex-col overflow-hidden min-h-0 border-t border-slate-700"><ElementList /></div>
                </>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <ElementToolbar />
              <Canvas />
            </div>
            <PropertyPanel />
          </div>
        </div>
      )}
    </I18nProvider>
    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2 rounded-lg shadow-lg text-sm ${
        toast.type === 'success' ? 'bg-emerald-600 text-white' :
        toast.type === 'error' ? 'bg-red-600 text-white' :
        'bg-slate-700 text-white'
      }`}>
        {toast.message}
      </div>
    )}
    </>
  );
}

export default App;
