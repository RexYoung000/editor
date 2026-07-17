import { useState, type ReactElement } from 'react';
import { useEditorStore } from '../store/editorStore';
import { elementMeta } from '../elements/elementMeta';
import { Trash2, Eye, EyeOff, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { findActiveElementPage } from '../utils/internalPages';
import { isContainerElementType } from '../utils/elementContainers';
import {
  getExplicitLayerLabel,
  getLayerDisplayName,
  getVisualSiblings,
  visualDropToStorageIndex,
  withLayerLabel,
} from '../utils/layerPresentation';

type DropTarget =
  | {
    kind: 'reorder';
    parentId: string | undefined;
    visualIndex: number;
    storageIndex: number;
  }
  | { kind: 'into-container'; containerId: string };

export default function ElementList() {
  const { t } = useI18n();
  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const currentInternalPageId = useEditorStore((s) => s.currentInternalPageId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const reorderElement = useEditorStore((s) => s.reorderElement);
  const setElementParent = useEditorStore((s) => s.setElementParent);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const alignElements = useEditorStore((s) => s.alignElements);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerDraft, setLayerDraft] = useState('');

  const currentPage = findActiveElementPage(currentCourse, currentSubPageId, currentInternalPageId);
  const elements = currentPage?.elements ?? [];

  if (!currentPage) return null;

  const isDescendantOf = (childId: string, ancestorId: string): boolean => {
    let pid: string | undefined = childId;
    while (pid) {
      if (pid === ancestorId) return true;
      const parent = elements.find(e => e.id === pid);
      pid = parent?.parentId;
    }
    return false;
  };

  const getChildren = (parentId: string | undefined) => elements.filter(e => e.parentId === parentId);
  const getVisualChildren = (parentId: string | undefined) => getVisualSiblings(elements, parentId);

  const commitLayerName = (el: typeof elements[0], value: string) => {
    const normalized = value.trim();
    setEditingLayerId(null);
    setLayerDraft('');
    if (normalized === getExplicitLayerLabel(el)) return;
    updateElement(el.id, { props: withLayerLabel(el.props, normalized) });
    useEditorStore.getState().saveHistory();
  };

  const handleDragStart = (e: React.DragEvent, el: typeof elements[0]) => {
    if (el.locked) { e.preventDefault(); return; }
    setDraggedId(el.id);
    setDropTarget(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.id);
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => { target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '';
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragOverRow = (e: React.DragEvent, el: typeof elements[0]) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === el.id || isDescendantOf(el.id, draggedId)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const isContainer = isContainerElementType(el.type);
    const parentId = el.parentId;

    if (isContainer && y > rect.height * 0.25 && y < rect.height * 0.75) {
      setDropTarget({ kind: 'into-container', containerId: el.id });
    } else {
      const siblings = getChildren(parentId);
      const visualSiblings = getVisualChildren(parentId);
      const siblingIndex = visualSiblings.findIndex(s => s.id === el.id);
      const visualIndex = y < rect.height / 2 ? siblingIndex : siblingIndex + 1;
      setDropTarget({
        kind: 'reorder',
        parentId,
        visualIndex,
        storageIndex: visualDropToStorageIndex(siblings, draggedId, visualIndex),
      });
    }
  };

  const handleDragOverTopLevel = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId) return;
    const draggedEl = elements.find(e => e.id === draggedId);
    if (!draggedEl) return;
    const topLevelElements = getChildren(undefined);
    const visualIndex = topLevelElements.length;
    setDropTarget({
      kind: 'reorder',
      parentId: undefined,
      visualIndex,
      storageIndex: visualDropToStorageIndex(topLevelElements, draggedId, visualIndex),
    });
  };

  const handleDropRow = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || !dropTarget) return;

    const draggedEl = elements.find(el => el.id === draggedId);
    if (!draggedEl) { setDraggedId(null); setDropTarget(null); return; }

    // 拖拽约束：DragDropBox/DragDragBox 不可被移动
    if (draggedEl.type === 'DragDropBox' || draggedEl.type === 'DragDragBox') {
      setDraggedId(null); setDropTarget(null); return;
    }

    if (dropTarget.kind === 'into-container') {
      const targetEl = elements.find(el => el.id === dropTarget.containerId);
      // DropObj 只能放入 DragDropBox，DragObj 只能放入 DragDragBox
      if (draggedEl.type === 'DropObj' && targetEl?.type !== 'DragDropBox') { setDraggedId(null); setDropTarget(null); return; }
      if (draggedEl.type === 'DragObj' && targetEl?.type !== 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
      setElementParent(draggedId, dropTarget.containerId);
    } else if (dropTarget.kind === 'reorder') {
      if (draggedEl.parentId !== dropTarget.parentId) {
        // 跨容器 reorder 也需要约束检查
        const targetParent = dropTarget.parentId ? elements.find(el => el.id === dropTarget.parentId) : undefined;
        if (draggedEl.type === 'DropObj' && targetParent?.type !== 'DragDropBox') { setDraggedId(null); setDropTarget(null); return; }
        if (draggedEl.type === 'DragObj' && targetParent?.type !== 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
        setElementParent(draggedId, dropTarget.parentId || undefined, false);
        reorderElement(draggedId, dropTarget.storageIndex, false);
        useEditorStore.getState().saveHistory();
      } else {
        reorderElement(draggedId, dropTarget.storageIndex);
      }
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDropTopLevel = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || !dropTarget) return;
    const draggedEl = elements.find(el => el.id === draggedId);
    if (!draggedEl) return;
    // 拖拽约束：这些类型不能拖到顶层
    if (['DragDropBox', 'DragDragBox', 'DropObj', 'DragObj'].includes(draggedEl.type)) {
      setDraggedId(null); setDropTarget(null); return;
    }
    if (draggedEl.parentId) {
      setElementParent(draggedId, undefined, false);
      if (dropTarget.kind === 'reorder') {
        reorderElement(draggedId, dropTarget.storageIndex, false);
      }
      useEditorStore.getState().saveHistory();
    } else if (dropTarget.kind === 'reorder') {
      reorderElement(draggedId, dropTarget.storageIndex);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const topLevel = getVisualChildren(undefined);

  const renderDropIndicator = (parentId: string | undefined, visualIndex: number) => {
    if (dropTarget?.kind === 'reorder' && dropTarget.parentId === parentId && dropTarget.visualIndex === visualIndex) {
      return <div className="h-0.5 bg-blue-500 rounded mx-2" />;
    }
    return null;
  };

  const renderEl = (el: typeof elements[0], depth: number, visualIndex: number): ReactElement => {
    const meta = elementMeta[el.type];
    const isSelected = selectedElementIds.includes(el.id);
    const editorHidden = (el.props as Record<string, unknown>)?._editorHidden === true;
    const isDragging = draggedId === el.id;
    const isContainerTarget = dropTarget?.kind === 'into-container' && dropTarget.containerId === el.id;
    const children = getVisualChildren(el.id);
    const parentId = el.parentId;
    const layerName = getLayerDisplayName(el, meta?.label);
    const isEditingLayer = editingLayerId === el.id;

    return (
      <div key={el.id}>
        {renderDropIndicator(parentId, visualIndex)}
        <div
          className={`flex items-center gap-1 py-1 text-xs transition-colors ${
            isDragging ? 'opacity-40' :
            isContainerTarget ? 'ring-2 ring-blue-500 rounded mx-1' :
            isSelected ? 'bg-blue-600/30 text-blue-300' :
            editorHidden ? 'text-slate-500 opacity-50 hover:bg-slate-700' :
            'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
          draggable={!el.locked}
          onDragStart={(e) => handleDragStart(e, el)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverRow(e, el)}
          onDrop={handleDropRow}
        >
          <button
            onClick={() => updateElement(el.id, { props: { ...el.props, _editorHidden: !editorHidden } })}
            className={`p-0.5 shrink-0 rounded ${editorHidden ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-200'}`}
            title={editorHidden ? '显示' : '隐藏'}
          >
            {editorHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
            title={`${layerName} · ${el.name || el.type} · ${meta?.label || el.type}`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#3b82f6' : '#475569' }} />
            {isEditingLayer ? (
              <input
                autoFocus
                draggable={false}
                value={layerDraft}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setLayerDraft(event.target.value)}
                onBlur={() => commitLayerName(el, layerDraft)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') {
                    setEditingLayerId(null);
                    setLayerDraft('');
                  }
                }}
                className="text-xs bg-slate-600 text-white rounded px-1 flex-1 min-w-0 outline-none"
              />
            ) : (
              <span
                className="truncate flex-1"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  setEditingLayerId(el.id);
                  setLayerDraft(getExplicitLayerLabel(el) || layerName);
                }}
              >
                {layerName}
              </span>
            )}
            <span className="text-slate-500 text-[10px] shrink-0">{meta?.label || el.type}</span>
          </div>
          {isSelected && !el.locked && (
            <button onClick={() => { deleteElement(el.id); clearSelection(); }} className="p-0.5 hover:bg-red-900 rounded text-red-400" title={t('deleteElement')}><Trash2 size={11} /></button>
          )}
        </div>
        {children.map((child, index) => renderEl(child, depth + 1, index))}
        {renderDropIndicator(el.id, children.length)}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0"
      data-keep-selection
      onDragOver={handleDragOverTopLevel}
      onDrop={handleDropTopLevel}
    >
      <div className="h-9 flex items-center px-3 text-xs font-medium text-slate-400">
        {t('elementList')} ({elements.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-slate-500">{t('noElements')}</span>
          </div>
        ) : (
          <div className="py-1">
            {topLevel.map((el, index) => renderEl(el, 0, index))}
            {renderDropIndicator(undefined, topLevel.length)}
          </div>
        )}
        {selectedElementIds.length >= 2 && (
          <div className="px-2 py-1.5 border-t border-slate-700">
            <div className="text-[10px] text-slate-500 mb-1">{t('align')}</div>
            <div className="flex gap-1 mb-1">
              <button onClick={() => alignElements('left')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignLeft')}><AlignStartVertical size={12} /></button>
              <button onClick={() => alignElements('centerH')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignCenterH')}><AlignCenterVertical size={12} /></button>
              <button onClick={() => alignElements('right')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignRight')}><AlignEndVertical size={12} /></button>
              <span className="w-px bg-slate-700" />
              <button onClick={() => alignElements('top')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignTop')}><AlignStartHorizontal size={12} /></button>
              <button onClick={() => alignElements('centerV')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignCenterV')}><AlignCenterHorizontal size={12} /></button>
              <button onClick={() => alignElements('bottom')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignBottom')}><AlignEndHorizontal size={12} /></button>
            </div>
            {selectedElementIds.length >= 3 && (
              <div className="flex gap-1">
                <button onClick={() => alignElements('distributeH')} className="flex-1 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-400">{t('distributeH')}</button>
                <button onClick={() => alignElements('distributeV')} className="flex-1 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-400">{t('distributeV')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
