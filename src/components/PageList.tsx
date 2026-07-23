import { courseHasAuthoredContent, useEditorStore } from '../store/editorStore';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, ArrowUp, ArrowDown, BookmarkPlus, MoreHorizontal, PanelTopOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { showToast } from '../utils/toast';
import { PRESET_TEMPLATES } from '../presets';
import ConfirmDialog from './ConfirmDialog';
import NewStageDialog from './NewStageDialog';
import CourseSettingsDialog from './CourseSettingsDialog';
import { isFlatLesson, isVideoOnlyCourse } from '../utils/courseKind';
import { isInternalPagesSubPage } from '../utils/internalPages';
import type { SubPage } from '../types';

type InternalPageCardActionsProps = {
  subPage: SubPage;
  open: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onEnter: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  onDuplicate?: () => void;
  onSaveTemplate?: () => void;
  onDelete: () => void;
};

function InternalPageCardActions({
  subPage,
  open,
  onToggle,
  onRename,
  onEnter,
  onMoveUp,
  onMoveDown,
  moveUpDisabled,
  moveDownDisabled,
  onDuplicate,
  onSaveTemplate,
  onDelete,
}: InternalPageCardActionsProps) {
  return (
    <div
      data-internal-card-actions
      className="mt-1"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 items-center gap-1">
        <div
          className="min-w-0 flex-1 truncate text-[11px]"
          onDoubleClick={(event) => {
            const container = event.currentTarget;
            const input = document.createElement('input');
            input.value = subPage.name;
            input.className = 'text-[11px] bg-slate-600 text-white rounded px-1 w-full outline-none';
            container.textContent = '';
            container.appendChild(input);
            input.focus();
            input.select();
            const finish = () => {
              const name = input.value.trim() || subPage.name;
              container.textContent = name;
              if (name !== subPage.name) onRename(name);
            };
            input.onblur = finish;
            input.onkeydown = (keyEvent) => {
              if (keyEvent.key === 'Enter') input.blur();
              if (keyEvent.key === 'Escape') {
                input.value = subPage.name;
                input.blur();
              }
            };
          }}
        >
          {subPage.name}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-200 ${open ? 'bg-slate-800/80' : 'bg-slate-900/30 hover:bg-slate-800/60'}`}
          title="更多关卡操作"
          aria-label="更多关卡操作"
          aria-expanded={open}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
      <button
        type="button"
        onClick={onEnter}
        className="mt-1 flex h-8 w-full items-center justify-center gap-1.5 rounded border border-cyan-300/60 bg-cyan-600 text-[11px] font-medium text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
      >
        <PanelTopOpen size={13} />
        进入编辑
      </button>
      {open && (
        <div role="menu" className="mt-1.5 grid grid-cols-2 gap-0.5 rounded border border-slate-600 bg-slate-800 p-1 shadow-lg">
          {onMoveUp && (
            <button type="button" role="menuitem" onClick={onMoveUp} disabled={moveUpDisabled} className="flex h-7 w-full items-center gap-2 rounded px-2 text-[11px] text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowUp size={12} /> 上移
            </button>
          )}
          {onMoveDown && (
            <button type="button" role="menuitem" onClick={onMoveDown} disabled={moveDownDisabled} className="flex h-7 w-full items-center gap-2 rounded px-2 text-[11px] text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowDown size={12} /> 下移
            </button>
          )}
          {onDuplicate && (
            <button type="button" role="menuitem" onClick={onDuplicate} className="flex h-7 w-full items-center gap-2 rounded px-2 text-[11px] text-slate-200 hover:bg-slate-700">
              <Copy size={12} /> 复制关卡
            </button>
          )}
          {onSaveTemplate && (
            <button type="button" role="menuitem" onClick={onSaveTemplate} className="flex h-7 w-full items-center gap-2 rounded px-2 text-[11px] text-slate-200 hover:bg-slate-700">
              <BookmarkPlus size={12} /> 保存为模板
            </button>
          )}
          <div className="col-span-2 mt-0.5 border-t border-slate-700 pt-0.5">
            <button type="button" role="menuitem" onClick={onDelete} className="flex h-7 w-full items-center gap-2 rounded px-2 text-[11px] text-red-300 hover:bg-red-950/60">
              <Trash2 size={12} /> 删除关卡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageList() {
  const { t } = useI18n();
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const currentSubPageId = useEditorStore((state) => state.currentSubPageId);
  const pageThumbnails = useEditorStore((state) => state.pageThumbnails);
  const setCurrentSubPage = useEditorStore((state) => state.setCurrentSubPage);
  const setCourseType = useEditorStore((state) => state.setCourseType);
  const toggleStageShrink = useEditorStore((state) => state.toggleStageShrink);
  const addStage = useEditorStore((state) => state.addStage);
  const addVideoStage = useEditorStore((state) => state.addVideoStage);
  const deleteStage = useEditorStore((state) => state.deleteStage);
  const clearAllStages = useEditorStore((state) => state.clearAllStages);
  const reorderStages = useEditorStore((state) => state.reorderStages);
  const addSubPage = useEditorStore((state) => state.addSubPage);
  const deleteSubPage = useEditorStore((state) => state.deleteSubPage);
  const duplicateSubPage = useEditorStore((state) => state.duplicateSubPage);
  const reorderSubPages = useEditorStore((state) => state.reorderSubPages);
  const renameStage = useEditorStore((state) => state.renameStage);
  const renameSubPage = useEditorStore((state) => state.renameSubPage);
  const addStageFromSubPage = useEditorStore((state) => state.addStageFromSubPage);
  const addSubPageFromSubPage = useEditorStore((state) => state.addSubPageFromSubPage);
  const addStageFromTemplate = useEditorStore((state) => state.addStageFromTemplate);
  const addSubPageFromTemplate = useEditorStore((state) => state.addSubPageFromTemplate);
  const addStageFromPreset = useEditorStore((state) => state.addStageFromPreset);
  const addSubPageFromPreset = useEditorStore((state) => state.addSubPageFromPreset);
  const customTemplates = useEditorStore((state) => state.customTemplates);
  const customTemplateDir = useEditorStore((state) => state.customTemplateDir);
  const setCustomTemplateDir = useEditorStore((state) => state.setCustomTemplateDir);
  const loadCustomTemplates = useEditorStore((state) => state.loadCustomTemplates);
  const saveAsCustomTemplate = useEditorStore((state) => state.saveAsCustomTemplate);
  const removeCustomTemplateAction = useEditorStore((state) => state.removeCustomTemplateAction);
  const renameCustomTemplate = useEditorStore((state) => state.renameCustomTemplate);
  const importCustomTemplates = useEditorStore((state) => state.importCustomTemplates);
  const pinCustomTemplate = useEditorStore((state) => state.pinCustomTemplate);
  const previewStages = useEditorStore((state) => state.currentCourse?.previewStages ?? []);
  const previewShrinked = useEditorStore((state) => state.currentCourse?.previewShrinked ?? false);
  const normalShrinked = useEditorStore((state) => state.currentCourse?.normalShrinked ?? false);
  const addPreviewStage = useEditorStore((state) => state.addPreviewStage);
  const deletePreviewStage = useEditorStore((state) => state.deletePreviewStage);
  const reorderPreviewStages = useEditorStore((state) => state.reorderPreviewStages);
  const renamePreviewStage = useEditorStore((state) => state.renamePreviewStage);
  const addPreviewStageFromSubPage = useEditorStore((state) => state.addPreviewStageFromSubPage);
  const addPreviewStageFromTemplate = useEditorStore((state) => state.addPreviewStageFromTemplate);
  const addPreviewStageFromPreset = useEditorStore((state) => state.addPreviewStageFromPreset);
  const togglePreviewShrinked = useEditorStore((state) => state.togglePreviewShrinked);
  const toggleNormalShrinked = useEditorStore((state) => state.toggleNormalShrinked);
  const enterFocusWorkspace = useEditorStore((state) => state.enterFocusWorkspace);

  const [draggedStageIdx, setDraggedStageIdx] = useState<number | null>(null);
  const [draggedSub, setDraggedSub] = useState<{ stageId: string; idx: number } | null>(null);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<{ stageId: string; subId: string; name: string } | null>(null);
  const [deleteStageConfirm, setDeleteStageConfirm] = useState<{ stageId: string; name: string; target: 'preview' | 'normal' } | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [newStageDialog, setNewStageDialog] = useState<'normalStage' | 'previewStage' | { mode: 'subPage'; stageId: string } | null>(null);
  const [showCourseSettings, setShowCourseSettings] = useState(false);
  const [openSubPageActions, setOpenSubPageActions] = useState<string | null>(null);

  useEffect(() => {
    if (!openSubPageActions) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-internal-card-actions]')) setOpenSubPageActions(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenSubPageActions(null);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openSubPageActions]);

  if (!currentCourse) return null;

  const isFlat = isFlatLesson(currentCourse.kind);
  const isVideoOnly = isVideoOnlyCourse(currentCourse.kind);
  const kind = currentCourse.kind;

  // 选择/更换自定义模板目录
  const pickTemplateDir = async (): Promise<boolean> => {
    const dir = await window.electronAPI.selectDirectory();
    if (!dir) return false;
    await setCustomTemplateDir(dir);
    return true;
  };

  // 保存为自定义模板：未设置目录时先引导选择
  const handleSaveTemplate = async (subPageId: string) => {
    if (!customTemplateDir) {
      const ok = await pickTemplateDir();
      if (!ok) return;
    }
    const r = await saveAsCustomTemplate(subPageId);
    if (r.ok) {
      showToast(t('templateSaved'), 'success');
    } else if (r.error === 'NO_TEMPLATE_DIR') {
      showToast('请先设置自定义模板目录', 'error');
    } else {
      showToast(`模板保存失败: ${r.error}`, 'error');
    }
  };

  // 从另一个目录批量导入模板
  const handleImportTemplates = async (): Promise<
    | { kind: 'cancelled' }
    | { kind: 'invalid' }
    | { kind: 'empty' }
    | { kind: 'result'; added: number; failures: Array<{ name: string; error: string }> }
    | { kind: 'error'; error: string }
  > => {
    const dir = await window.electronAPI.selectDirectory();
    if (!dir) return { kind: 'cancelled' };
    try {
      const result = await importCustomTemplates(dir);
      return { kind: 'result', added: result.added, failures: result.failures };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'INVALID_DIR') return { kind: 'invalid' };
      if (msg === 'EMPTY_SOURCE') return { kind: 'empty' };
      return { kind: 'error', error: msg };
    }
  };

  // 打开模板对话框前刷新一次列表
  const openNewStageDialog = (which: 'normalStage' | 'previewStage' | { mode: 'subPage'; stageId: string }) => {
    if (customTemplateDir) loadCustomTemplates();
    setNewStageDialog(which);
  };

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        {/* 预习区域 */}
        {!isFlat && (
        <div className="border-b border-slate-700 flex flex-col min-h-0">
          <div
            className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-slate-700"
            onClick={() => togglePreviewShrinked()}
          >
            <span className="text-sm font-medium text-rose-400">
              预习关卡({previewStages.length}关)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); openNewStageDialog('previewStage'); }}
                className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-slate-600 rounded text-slate-400 hover:text-white"
              >
                <Plus size={14} /> {t('addStage')}
              </button>
              {previewShrinked ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </div>
          {!previewShrinked && (
            <div className="px-2 pb-2 space-y-2 overflow-y-auto min-h-0">
              {previewStages.map((stage, stageIdx) => {
                const expanded = !stage.shrinked;
                return (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={(e) => { setDraggedStageIdx(stageIdx); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedStageIdx !== null && draggedStageIdx !== stageIdx) {
                        reorderPreviewStages(draggedStageIdx, stageIdx);
                      }
                      setDraggedStageIdx(null);
                    }}
                    className={`bg-slate-700/40 rounded ${draggedStageIdx === stageIdx ? 'opacity-50' : ''}`}
                  >
                    {/* Preview stage header */}
                    <div
                      className="group flex items-center gap-1 px-2 py-1.5 hover:bg-slate-700 rounded cursor-pointer"
                      onClick={() => toggleStageShrink(stage.id)}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span
                        className="text-xs font-medium flex-1 truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const span = e.currentTarget;
                          const input = document.createElement('input');
                          input.value = stage.name;
                          input.className = 'text-xs bg-slate-600 text-white rounded px-1 w-full outline-none';
                          span.textContent = '';
                          span.appendChild(input);
                          input.focus();
                          input.select();
                          const finish = () => {
                            const name = input.value.trim() || stage.name;
                            span.textContent = name;
                            if (name !== stage.name) renamePreviewStage(stage.id, name);
                          };
                          input.onblur = finish;
                          input.onkeydown = (ke) => {
                            if (ke.key === 'Enter') input.blur();
                            if (ke.key === 'Escape') { input.value = stage.name; input.blur(); }
                          };
                        }}
                      >
                        {stage.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (stageIdx > 0) reorderPreviewStages(stageIdx, stageIdx - 1);
                        }}
                        disabled={stageIdx === 0}
                        className="p-0.5 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                        title="上移"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (stageIdx < previewStages.length - 1) reorderPreviewStages(stageIdx, stageIdx + 1);
                        }}
                        disabled={stageIdx === previewStages.length - 1}
                        className="p-0.5 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                        title="下移"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteStageConfirm({ stageId: stage.id, name: stage.name, target: 'preview' });
                        }}
                        className="p-0.5 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100"
                        title={t('deletePage')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Preview sub-pages */}
                    {expanded && (
                      <div className="px-2 pb-2 space-y-1.5">
                        {stage.subPages.map((sub, subIdx) => (
                          <div
                            key={sub.id}
                            onClick={() => setCurrentSubPage(stage.id, sub.id)}
                            onDoubleClick={() => { if (isInternalPagesSubPage(sub)) enterFocusWorkspace(stage.id, sub.id); }}
                            className={`group relative p-1.5 rounded cursor-pointer ${
                              currentSubPageId === sub.id
                                ? 'bg-rose-600'
                                : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                          >
                            <div className="aspect-video bg-slate-900 rounded mb-1 overflow-hidden flex items-center justify-center text-[10px] text-slate-500">
                              {pageThumbnails[sub.id]
                                ? <img src={pageThumbnails[sub.id]} className="w-full h-full object-cover" alt="" />
                                : <span>{stageIdx + 1}-{subIdx + 1}</span>
                              }
                            </div>
                            {isInternalPagesSubPage(sub) ? (
                              <InternalPageCardActions
                                subPage={sub}
                                open={openSubPageActions === `${stage.id}:${sub.id}`}
                                onToggle={() => setOpenSubPageActions((current) => current === `${stage.id}:${sub.id}` ? null : `${stage.id}:${sub.id}`)}
                                onRename={(name) => renameSubPage(sub.id, name)}
                                onEnter={() => enterFocusWorkspace(stage.id, sub.id)}
                                onDuplicate={!sub.frozen ? () => {
                                  setOpenSubPageActions(null);
                                  duplicateSubPage(stage.id, sub.id);
                                } : undefined}
                                onSaveTemplate={!sub.frozen ? () => {
                                  setOpenSubPageActions(null);
                                  handleSaveTemplate(sub.id);
                                } : undefined}
                                onDelete={() => {
                                  setOpenSubPageActions(null);
                                  setDeleteSubConfirm({ stageId: stage.id, subId: sub.id, name: sub.name });
                                }}
                              />
                            ) : (
                              <div
                                className="text-[11px] truncate"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  const div = e.currentTarget;
                                  const input = document.createElement('input');
                                  input.value = sub.name;
                                  input.className = 'text-[11px] bg-slate-600 text-white rounded px-1 w-full outline-none';
                                  div.textContent = '';
                                  div.appendChild(input);
                                  input.focus();
                                  input.select();
                                  const finish = () => {
                                    const name = input.value.trim() || sub.name;
                                    div.textContent = name;
                                    if (name !== sub.name) renameSubPage(sub.id, name);
                                  };
                                  input.onblur = finish;
                                  input.onkeydown = (ke) => {
                                    if (ke.key === 'Enter') input.blur();
                                    if (ke.key === 'Escape') { input.value = sub.name; input.blur(); }
                                  };
                                }}
                              >
                                {sub.name}
                              </div>
                            )}
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              {isInternalPagesSubPage(sub) && (
                                <button onClick={(e) => { e.stopPropagation(); enterFocusWorkspace(stage.id, sub.id); }} className="p-0.5 bg-cyan-600 hover:bg-cyan-500 rounded" title="专注编辑"><PanelTopOpen size={10} /></button>
                              )}
                              {!sub.frozen && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateSubPage(stage.id, sub.id);
                                }}
                                className="p-0.5 bg-blue-600 hover:bg-blue-500 rounded"
                                title={t('duplicatePage')}
                              >
                                <Copy size={10} />
                              </button>
                            )}
                              {!sub.frozen && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveTemplate(sub.id);
                                }}
                                className="p-0.5 bg-purple-600 hover:bg-purple-500 rounded"
                                title={t('saveAsTemplate')}
                              >
                                <BookmarkPlus size={10} />
                              </button>
                            )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteSubConfirm({ stageId: stage.id, subId: sub.id, name: sub.name });
                                }}
                                className="p-0.5 bg-red-600 hover:bg-red-500 rounded"
                                title={t('deletePage')}
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* 正课/作业区域 */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-slate-700">
          <div
            className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-slate-700"
            onClick={() => toggleNormalShrinked()}
          >
            <span className="text-sm font-medium text-cyan-400">
              {kind === 'homework' ? t('homeworkStages') : kind === 'sEvaluation' ? t('sEvaluationStages') : kind === 'review' ? t('reviewStages') : t('pages')}({currentCourse.stages.length}关)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isVideoOnly) {
                    addVideoStage();
                  } else {
                    openNewStageDialog('normalStage');
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-slate-600 rounded text-slate-400 hover:text-white"
              >
                <Plus size={14} /> {t('addStage')}
              </button>
              {currentCourse.stages.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setClearAllConfirm(true);
                  }}
                  title="清空所有关卡"
                  className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-red-600/30 rounded text-slate-400 hover:text-red-400"
                >
                  <Trash2 size={14} /> 清空
                </button>
              )}
              {normalShrinked ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </div>
          {!normalShrinked && (
            <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
          {currentCourse.stages.map((stage, stageIdx) => {
            const expanded = !stage.shrinked;
            return (
              <div
                key={stage.id}
                draggable
                onDragStart={(e) => { setDraggedStageIdx(stageIdx); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedStageIdx !== null && draggedStageIdx !== stageIdx) {
                    reorderStages(draggedStageIdx, stageIdx);
                  }
                  setDraggedStageIdx(null);
                }}
                className={`bg-slate-700/40 rounded ${draggedStageIdx === stageIdx ? 'opacity-50' : ''}`}
              >
                {/* Stage header */}
                <div
                  className="group flex items-center gap-1 px-2 py-1.5 hover:bg-slate-700 rounded cursor-pointer"
                  onClick={() => toggleStageShrink(stage.id)}
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span
                    className="text-xs font-medium flex-1 truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const span = e.currentTarget;
                      const input = document.createElement('input');
                      input.value = stage.name;
                      input.className = 'text-xs bg-slate-600 text-white rounded px-1 w-full outline-none';
                      span.textContent = '';
                      span.appendChild(input);
                      input.focus();
                      input.select();
                      const finish = () => {
                        const name = input.value.trim() || stage.name;
                        span.textContent = `${name} (${stage.subPages.length}关)`;
                        if (name !== stage.name) renameStage(stage.id, name);
                      };
                      input.onblur = finish;
                      input.onkeydown = (ke) => {
                        if (ke.key === 'Enter') input.blur();
                        if (ke.key === 'Escape') { input.value = stage.name; input.blur(); }
                      };
                    }}
                  >
                    {stage.name} ({stage.subPages.length}关)
                  </span>
                  {!stage.noSubPages && (<>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stageIdx > 0) reorderStages(stageIdx, stageIdx - 1);
                    }}
                    disabled={stageIdx === 0}
                    className="p-0.5 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                    title="上移"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stageIdx < currentCourse.stages.length - 1) reorderStages(stageIdx, stageIdx + 1);
                    }}
                    disabled={stageIdx === currentCourse.stages.length - 1}
                    className="p-0.5 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                    title="下移"
                  >
                    <ArrowDown size={12} />
                  </button>
                  </>)}
                  {!isFlat && !stage.noSubPages && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewStageDialog({ mode: 'subPage', stageId: stage.id });
                      }}
                      className="p-0.5 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100"
                      title={t('addSubPage')}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteStageConfirm({ stageId: stage.id, name: stage.name, target: 'normal' });
                    }}
                    className="p-0.5 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100"
                    title={t('deletePage')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Sub-pages */}
                {expanded && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {stage.subPages.map((sub, subIdx) => (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggedSub({ stageId: stage.id, idx: subIdx });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedSub && draggedSub.stageId === stage.id && draggedSub.idx !== subIdx) {
                            reorderSubPages(stage.id, draggedSub.idx, subIdx);
                          }
                          setDraggedSub(null);
                        }}
                        onClick={() => setCurrentSubPage(stage.id, sub.id)}
                        onDoubleClick={() => { if (isInternalPagesSubPage(sub)) enterFocusWorkspace(stage.id, sub.id); }}
                        className={`group relative p-1.5 rounded cursor-pointer ${
                          currentSubPageId === sub.id
                            ? 'bg-blue-600'
                            : 'bg-slate-700 hover:bg-slate-600'
                        } ${draggedSub?.stageId === stage.id && draggedSub.idx === subIdx ? 'opacity-50' : ''}`}
                      >
                        <div className="aspect-video bg-slate-900 rounded mb-1 overflow-hidden flex items-center justify-center text-[10px] text-slate-500">
                          {pageThumbnails[sub.id]
                            ? <img src={pageThumbnails[sub.id]} className="w-full h-full object-cover" alt="" />
                            : <span>{stageIdx + 1}-{subIdx + 1}</span>
                          }
                        </div>
                        {isInternalPagesSubPage(sub) ? (
                          <InternalPageCardActions
                            subPage={sub}
                            open={openSubPageActions === `${stage.id}:${sub.id}`}
                            onToggle={() => setOpenSubPageActions((current) => current === `${stage.id}:${sub.id}` ? null : `${stage.id}:${sub.id}`)}
                            onRename={(name) => renameSubPage(sub.id, name)}
                            onEnter={() => enterFocusWorkspace(stage.id, sub.id)}
                            onMoveUp={() => {
                              setOpenSubPageActions(null);
                              if (subIdx > 0) {
                                reorderSubPages(stage.id, subIdx, subIdx - 1);
                                setCurrentSubPage(stage.id, sub.id);
                              }
                            }}
                            onMoveDown={() => {
                              setOpenSubPageActions(null);
                              if (subIdx < stage.subPages.length - 1) {
                                reorderSubPages(stage.id, subIdx, subIdx + 1);
                                setCurrentSubPage(stage.id, sub.id);
                              }
                            }}
                            moveUpDisabled={subIdx === 0}
                            moveDownDisabled={subIdx === stage.subPages.length - 1}
                            onDuplicate={!sub.frozen ? () => {
                              setOpenSubPageActions(null);
                              duplicateSubPage(stage.id, sub.id);
                            } : undefined}
                            onSaveTemplate={!sub.frozen ? () => {
                              setOpenSubPageActions(null);
                              handleSaveTemplate(sub.id);
                            } : undefined}
                            onDelete={() => {
                              setOpenSubPageActions(null);
                              setDeleteSubConfirm({ stageId: stage.id, subId: sub.id, name: sub.name });
                            }}
                          />
                        ) : (
                          <div
                            className="text-[11px] truncate"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              const div = e.currentTarget;
                              const input = document.createElement('input');
                              input.value = sub.name;
                              input.className = 'text-[11px] bg-slate-600 text-white rounded px-1 w-full outline-none';
                              div.textContent = '';
                              div.appendChild(input);
                              input.focus();
                              input.select();
                              const finish = () => {
                                const name = input.value.trim() || sub.name;
                                div.textContent = name;
                                if (name !== sub.name) renameSubPage(sub.id, name);
                              };
                              input.onblur = finish;
                              input.onkeydown = (ke) => {
                                if (ke.key === 'Enter') input.blur();
                                if (ke.key === 'Escape') { input.value = sub.name; input.blur(); }
                              };
                            }}
                          >
                            {sub.name}
                          </div>
                        )}
                        {!isFlat && (
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          {isInternalPagesSubPage(sub) && (
                            <button onClick={(e) => { e.stopPropagation(); enterFocusWorkspace(stage.id, sub.id); }} className="p-0.5 bg-cyan-600 hover:bg-cyan-500 rounded" title="专注编辑"><PanelTopOpen size={10} /></button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (subIdx > 0) {
                                reorderSubPages(stage.id, subIdx, subIdx - 1);
                                setCurrentSubPage(stage.id, sub.id);
                              }
                            }}
                            disabled={subIdx === 0}
                            className="p-0.5 bg-slate-600 hover:bg-slate-500 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上移"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (subIdx < stage.subPages.length - 1) {
                                reorderSubPages(stage.id, subIdx, subIdx + 1);
                                setCurrentSubPage(stage.id, sub.id);
                              }
                            }}
                            disabled={subIdx === stage.subPages.length - 1}
                            className="p-0.5 bg-slate-600 hover:bg-slate-500 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下移"
                          >
                            <ArrowDown size={10} />
                          </button>
                          {!sub.frozen && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateSubPage(stage.id, sub.id);
                            }}
                            className="p-0.5 bg-blue-600 hover:bg-blue-500 rounded"
                            title={t('duplicatePage')}
                          >
                            <Copy size={10} />
                          </button>
                        )}
                          {!sub.frozen && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTemplate(sub.id);
                            }}
                            className="p-0.5 bg-purple-600 hover:bg-purple-500 rounded"
                            title={t('saveAsTemplate')}
                          >
                            <BookmarkPlus size={10} />
                          </button>
                        )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSubConfirm({ stageId: stage.id, subId: sub.id, name: sub.name });
                            }}
                            className="p-0.5 bg-red-600 hover:bg-red-500 rounded"
                            title={t('deletePage')}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        )}
                      </div>
                    ))}
                    {!isFlat && !stage.noSubPages && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewStageDialog({ mode: 'subPage', stageId: stage.id });
                        }}
                        className="w-full py-1 flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-white border border-dashed border-slate-600 hover:border-slate-400 rounded"
                      >
                        <Plus size={11} /> {t('addSubPage')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </div>
      </div>

      {deleteSubConfirm && (
        <ConfirmDialog
          title={t('deletePage')}
          message={t('deletePageConfirm').replace('{name}', deleteSubConfirm.name)}
          confirmText={t('delete')}
          danger
          onConfirm={() => {
            deleteSubPage(deleteSubConfirm.stageId, deleteSubConfirm.subId);
            setDeleteSubConfirm(null);
          }}
          onCancel={() => setDeleteSubConfirm(null)}
        />
      )}
      {deleteStageConfirm && (
        <ConfirmDialog
          title={t('deletePage')}
          message={t('deletePageConfirm').replace('{name}', deleteStageConfirm.name)}
          confirmText={t('delete')}
          danger
          onConfirm={() => {
            if (deleteStageConfirm.target === 'preview') {
              deletePreviewStage(deleteStageConfirm.stageId);
            } else {
              deleteStage(deleteStageConfirm.stageId);
            }
            setDeleteStageConfirm(null);
          }}
          onCancel={() => setDeleteStageConfirm(null)}
        />
      )}
      {clearAllConfirm && (
        <ConfirmDialog
          title="清空所有关卡"
          message="确定要删除所有的关卡吗？"
          confirmText={t('delete')}
          danger
          onConfirm={() => {
            clearAllStages();
            setClearAllConfirm(false);
          }}
          onCancel={() => setClearAllConfirm(false)}
        />
      )}
      {newStageDialog && (
        <NewStageDialog
          mode={newStageDialog === 'normalStage' || newStageDialog === 'previewStage' ? 'stage' : 'subPage'}
          targetStageId={newStageDialog !== 'normalStage' && newStageDialog !== 'previewStage' ? newStageDialog.stageId : undefined}
          allSubPages={[
            ...currentCourse.stages.flatMap((s) => s.subPages),
            ...(currentCourse.previewStages ?? []).flatMap((s) => s.subPages),
          ]}
          customTemplates={customTemplates}
          customTemplateDir={customTemplateDir}
          pageThumbnails={pageThumbnails}
          presetTemplates={PRESET_TEMPLATES}
          supportsInternalPages={kind !== 'review'}
          stageIndexOf={(spId) => {
            for (let i = 0; i < currentCourse.stages.length; i++) {
              if (currentCourse.stages[i].subPages.some((sp) => sp.id === spId)) return i;
            }
            return 0;
          }}
          subPageIndexOf={(spId) => {
            for (const stage of currentCourse.stages) {
              const idx = stage.subPages.findIndex((sp) => sp.id === spId);
              if (idx !== -1) return idx;
            }
            return 0;
          }}
          onConfirmBlank={() => {
            if (newStageDialog === 'previewStage') {
              addPreviewStage();
            } else if (newStageDialog === 'normalStage') {
              addStage();
            } else {
              addSubPage(newStageDialog.stageId);
            }
            setNewStageDialog(null);
          }}
          onConfirmCopy={(sourceSubPageId) => {
            if (newStageDialog === 'previewStage') {
              addPreviewStageFromSubPage(sourceSubPageId);
            } else if (newStageDialog === 'normalStage') {
              addStageFromSubPage(sourceSubPageId);
            } else {
              addSubPageFromSubPage(newStageDialog.stageId, sourceSubPageId);
            }
            setNewStageDialog(null);
          }}
          onConfirmPreset={(presetId) => {
            if (newStageDialog === 'previewStage') {
              addPreviewStageFromPreset(presetId);
            } else if (newStageDialog === 'normalStage') {
              addStageFromPreset(presetId);
            } else {
              addSubPageFromPreset(newStageDialog.stageId, presetId);
            }
            setNewStageDialog(null);
          }}
          onConfirmTemplate={async (templateId) => {
            try {
              if (newStageDialog === 'previewStage') {
                await addPreviewStageFromTemplate(templateId);
              } else if (newStageDialog === 'normalStage') {
                await addStageFromTemplate(templateId);
              } else {
                await addSubPageFromTemplate(newStageDialog.stageId, templateId);
              }
              setNewStageDialog(null);
            } catch (e) {
              showToast(`模板加载失败: ${(e as Error).message}`, 'error');
            }
          }}
          onRemoveTemplate={(templateId) => {
            removeCustomTemplateAction(templateId);
          }}
          onPickTemplateDir={pickTemplateDir}
          onRenameTemplate={renameCustomTemplate}
          onImportTemplates={handleImportTemplates}
          onPinTemplate={pinCustomTemplate}
          onOpenCourseSettings={() => {
            setNewStageDialog(null);
            setShowCourseSettings(true);
          }}
          onCancel={() => setNewStageDialog(null)}
        />
      )}
      {showCourseSettings && (
        <CourseSettingsDialog
          initialType={currentCourse.type}
          requiresConfirmation={courseHasAuthoredContent(currentCourse)}
          onConfirm={(type, confirmed) => {
            const updated = setCourseType(type, { confirmed });
            if (!updated) {
              showToast(t('courseTypeChangeRejected'), 'error');
              return;
            }
            setShowCourseSettings(false);
            showToast(t('courseTypeUpdated'), 'success');
          }}
          onCancel={() => setShowCourseSettings(false)}
        />
      )}
    </>
  );
}
