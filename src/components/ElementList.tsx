import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useEditorStore } from '../store/editorStore';
import { elementMeta } from '../elements/elementMeta';
import { Trash2, Eye, EyeOff, Lock, Unlock, Folder, FolderOpen, FolderPlus, FolderMinus, FolderInput, ArrowUp, ArrowDown, ChevronRight, ChevronDown, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { findActiveElementPage, isInternalPagesWorkbenchReadonly } from '../utils/internalPages';
import { isContainerElementType } from '../utils/elementContainers';
import {
  getExplicitLayerLabel,
  getLayerDisplayName,
  getVisualSiblings,
  visualDropToStorageIndex,
  withLayerLabel,
} from '../utils/layerPresentation';
import { createElementMap, getElementLayerState } from '../utils/layerState';
import { getNextEditorLayerGroupName, resolveEditorLayerGroups, type ResolvedEditorLayerGroup } from '../utils/layerGroups';
import { showToast } from '../utils/toast';

type DropTarget =
  | {
    kind: 'reorder';
    parentId: string | undefined;
    visualIndex: number;
    storageIndex: number;
  }
  | { kind: 'into-container'; containerId: string }
  | { kind: 'into-group'; groupId: string };

export default function ElementList({ showHeader = true }: { showHeader?: boolean } = {}) {
  const { t } = useI18n();
  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const currentInternalPageId = useEditorStore((s) => s.currentInternalPageId);
  const workbenchReadonly = useEditorStore((s) => isInternalPagesWorkbenchReadonly(
    s.currentCourse,
    s.currentSubPageId,
    s.focusSubPageId,
  ));
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const selectElements = useEditorStore((s) => s.selectElements);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setElementEditorHidden = useEditorStore((s) => s.setElementEditorHidden);
  const setElementsEditorHidden = useEditorStore((s) => s.setElementsEditorHidden);
  const setElementLocked = useEditorStore((s) => s.setElementLocked);
  const setElementsLocked = useEditorStore((s) => s.setElementsLocked);
  const addEditorLayerGroup = useEditorStore((s) => s.addEditorLayerGroup);
  const renameEditorLayerGroup = useEditorStore((s) => s.renameEditorLayerGroup);
  const deleteEditorLayerGroup = useEditorStore((s) => s.deleteEditorLayerGroup);
  const setEditorLayerGroupMembers = useEditorStore((s) => s.setEditorLayerGroupMembers);
  const setEditorLayerGroupParent = useEditorStore((s) => s.setEditorLayerGroupParent);
  const reorderEditorLayerGroup = useEditorStore((s) => s.reorderEditorLayerGroup);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const reorderElement = useEditorStore((s) => s.reorderElement);
  const setElementParent = useEditorStore((s) => s.setElementParent);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const alignElements = useEditorStore((s) => s.alignElements);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerDraft, setLayerDraft] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const skipNextGroupPreferenceSave = useRef(false);

  const currentPage = findActiveElementPage(currentCourse, currentSubPageId, currentInternalPageId);
  const elements = currentPage?.elements ?? [];
  const elementMap = createElementMap(elements);
  const layerGroups = currentPage ? resolveEditorLayerGroups(currentPage) : [];
  const pageFrozen = Boolean(currentPage && 'frozen' in currentPage && currentPage.frozen);
  const groupPreferenceKey = currentCourse && currentPage
    ? `forge.layer-groups.${currentCourse.id}.${currentPage.id}`
    : null;

  useEffect(() => {
    skipNextGroupPreferenceSave.current = true;
    if (!groupPreferenceKey) {
      setExpandedGroups(new Set()); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(groupPreferenceKey) ?? '[]');
      setExpandedGroups(new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []));
    } catch {
      setExpandedGroups(new Set());
    }
  }, [groupPreferenceKey]);

  useEffect(() => {
    if (!groupPreferenceKey) return;
    if (skipNextGroupPreferenceSave.current) {
      skipNextGroupPreferenceSave.current = false;
      return;
    }
    localStorage.setItem(groupPreferenceKey, JSON.stringify([...expandedGroups]));
  }, [expandedGroups, groupPreferenceKey]);

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

  const commitGroupName = (group: ResolvedEditorLayerGroup, value: string) => {
    const normalized = value.trim();
    setEditingGroupId(null);
    setGroupDraft('');
    if (!normalized || normalized === group.name) return;
    if (!renameEditorLayerGroup(group.id, normalized)) showToast('图层组名称不能为空或重复', 'error');
  };

  const createGroupFromSelection = () => {
    const groupId = addEditorLayerGroup(getNextEditorLayerGroupName(layerGroups));
    if (!groupId) {
      showToast('图层组成员必须属于同一运行父级，且名称不能重复', 'error');
      return;
    }
    setExpandedGroups((previous) => new Set(previous).add(groupId));
  };

  const handleDragStart = (e: React.DragEvent, el: typeof elements[0]) => {
    if (getElementLayerState(el, elementMap).effectiveLocked || pageFrozen) { e.preventDefault(); return; }
    setDraggedId(el.id);
    setDraggedGroupId(null);
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
    if (draggedGroupId) {
      if (!setEditorLayerGroupParent(draggedGroupId, undefined)) showToast('图层组已经位于顶层', 'info');
      setDraggedGroupId(null);
      setDropTarget(null);
      return;
    }
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

  const handleDropGroup = (event: React.DragEvent, group: ResolvedEditorLayerGroup) => {
    event.preventDefault();
    event.stopPropagation();
    if (draggedGroupId) {
      if (draggedGroupId !== group.id && !group.legacy && !setEditorLayerGroupParent(draggedGroupId, group.id)) {
        showToast('图层组必须保持同一运行父级，且不能嵌套到自己的后代', 'error');
      }
      setDraggedGroupId(null);
      setDropTarget(null);
      return;
    }
    if (!draggedId || group.crossRuntimeParent) return;
    if (!setEditorLayerGroupMembers(group.id, [draggedId])) {
      showToast('图层组只接收同一运行父级下的成员', 'error');
    } else {
      setExpandedGroups((previous) => new Set(previous).add(group.id));
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
    const layerState = getElementLayerState(el, elementMap);
    const editorHidden = layerState.explicitHidden;
    const inheritedHidden = Boolean(layerState.hiddenById);
    const inheritedLocked = Boolean(layerState.lockedById);
    const effectiveLocked = layerState.effectiveLocked;
    const isDragging = draggedId === el.id;
    const isContainerTarget = dropTarget?.kind === 'into-container' && dropTarget.containerId === el.id;
    const children = getVisualChildren(el.id).filter((child) => !child.groupId);
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
            layerState.effectiveHidden ? 'text-slate-500 opacity-50 hover:bg-slate-700' :
            inheritedLocked ? 'text-amber-200/80 hover:bg-slate-700' :
            'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
          draggable={!effectiveLocked && !pageFrozen}
          onDragStart={(e) => handleDragStart(e, el)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverRow(e, el)}
          onDrop={handleDropRow}
        >
          <button
            onClick={(event) => { event.stopPropagation(); setElementEditorHidden(el.id, !editorHidden); }}
            className={`p-0.5 shrink-0 rounded ${layerState.effectiveHidden ? (inheritedHidden ? 'text-amber-400 hover:text-amber-200' : 'text-slate-600 hover:text-slate-400') : 'text-slate-400 hover:text-slate-200'}`}
            title={inheritedHidden ? `受父级隐藏：${getLayerDisplayName(elementMap.get(layerState.hiddenById!)!, elementMeta[elementMap.get(layerState.hiddenById!)!.type]?.label)}` : (editorHidden ? '显示此图层' : '隐藏此图层')}
            aria-label={inheritedHidden ? '受父级隐藏' : (editorHidden ? '显示此图层' : '隐藏此图层')}
          >
            {layerState.effectiveHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); setElementLocked(el.id, !el.locked); }}
            className={`p-0.5 shrink-0 rounded ${effectiveLocked ? (inheritedLocked ? 'text-amber-400 hover:text-amber-200' : 'text-amber-300 hover:text-amber-100') : 'text-slate-500 hover:text-slate-200'}`}
            title={inheritedLocked ? `受父级锁定：${getLayerDisplayName(elementMap.get(layerState.lockedById!)!, elementMeta[elementMap.get(layerState.lockedById!)!.type]?.label)}` : (el.locked ? '解锁此图层' : '锁定此图层')}
            aria-label={inheritedLocked ? '受父级锁定' : (el.locked ? '解锁此图层' : '锁定此图层')}
            disabled={pageFrozen}
          >
            {effectiveLocked ? <Lock size={11} /> : <Unlock size={11} />}
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
                  if (effectiveLocked) return;
                  setEditingLayerId(el.id);
                  setLayerDraft(getExplicitLayerLabel(el) || layerName);
                }}
              >
                {layerName}
              </span>
            )}
            <span className="text-slate-500 text-[10px] shrink-0">{meta?.label || el.type}</span>
          </div>
          {isSelected && !effectiveLocked && !pageFrozen && (
            <button onClick={() => { deleteElement(el.id); clearSelection(); }} className="p-0.5 hover:bg-red-900 rounded text-red-400" title={t('deleteElement')}><Trash2 size={11} /></button>
          )}
        </div>
        {children.map((child, index) => renderEl(child, depth + 1, index))}
        {renderDropIndicator(el.id, children.length)}
      </div>
    );
  };

  const renderGroup = (group: ResolvedEditorLayerGroup, depth: number): ReactElement => {
    const expanded = expandedGroups.has(group.id);
    const members = elements
      .filter((element) => group.memberIds.includes(element.id))
      .reverse();
    const childGroups = layerGroups.filter((candidate) => candidate.parentGroupId === group.id);
    const isEditing = editingGroupId === group.id;
    const groupIndex = layerGroups.findIndex((candidate) => candidate.id === group.id);
    return (
      <div key={`layer-group-${group.id}`}>
        <div
          className={`flex items-center gap-1 py-1 text-xs ${
            dropTarget?.kind === 'into-group' && dropTarget.groupId === group.id
              ? 'ring-2 ring-emerald-500 bg-emerald-950/30'
              : group.crossRuntimeParent
                ? 'text-amber-300 bg-amber-950/20'
                : 'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
          title={group.crossRuntimeParent ? '旧版跨运行父级编组：保持原有编组行为，重新编组后可转换为新图层组' : `${group.name} · ${members.length} 个成员`}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (draggedId && !group.crossRuntimeParent) setDropTarget({ kind: 'into-group', groupId: group.id });
          }}
          onDrop={(event) => handleDropGroup(event, group)}
          draggable={!pageFrozen && !group.legacy}
          onDragStart={(event) => {
            event.stopPropagation();
            setDraggedGroupId(group.id);
            setDropTarget(null);
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', `layer-group:${group.id}`);
          }}
          onDragEnd={() => { setDraggedGroupId(null); setDropTarget(null); }}
        >
          <button
            className="p-0.5 shrink-0 text-slate-500 hover:text-slate-200"
            onClick={() => setExpandedGroups((previous) => {
              const next = new Set(previous);
              if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
              return next;
            })}
            aria-label={expanded ? '收起图层组' : '展开图层组'}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {expanded ? <FolderOpen size={13} className="shrink-0 text-blue-300" /> : <Folder size={13} className="shrink-0 text-blue-300" />}
          {isEditing ? (
            <input
              autoFocus
              value={groupDraft}
              onChange={(event) => setGroupDraft(event.target.value)}
              onBlur={() => commitGroupName(group, groupDraft)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') { setEditingGroupId(null); setGroupDraft(''); }
              }}
              className="flex-1 min-w-0 bg-slate-600 text-white rounded px-1 outline-none"
            />
          ) : (
            <span
              className="truncate flex-1"
              onClick={() => selectElements(group.memberIds)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (pageFrozen || group.crossRuntimeParent) return;
                setEditingGroupId(group.id);
                setGroupDraft(group.name);
              }}
            >
              {group.name}
            </span>
          )}
          <span className="text-[10px] text-slate-500 shrink-0">{members.length}</span>
          <button
            onClick={() => reorderEditorLayerGroup(groupIndex, groupIndex - 1)}
            disabled={pageFrozen || groupIndex <= 0}
            className="p-0.5 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30"
            title="上移图层组"
            aria-label="上移图层组"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={() => reorderEditorLayerGroup(groupIndex, groupIndex + 1)}
            disabled={pageFrozen || groupIndex < 0 || groupIndex >= layerGroups.length - 1}
            className="p-0.5 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30"
            title="下移图层组"
            aria-label="下移图层组"
          >
            <ArrowDown size={11} />
          </button>
          <button
            onClick={() => {
              if (pageFrozen) return;
              if (!setEditorLayerGroupMembers(group.id, selectedElementIds)) showToast('选中的图层必须属于同一运行父级', 'error');
              else setExpandedGroups((previous) => new Set(previous).add(group.id));
            }}
            disabled={pageFrozen || group.crossRuntimeParent}
            className="p-0.5 rounded text-slate-500 hover:text-slate-200 disabled:opacity-30"
            title="将选中图层移入此组"
            aria-label="将选中图层移入此组"
          >
            <FolderInput size={12} />
          </button>
          <button
            onClick={() => deleteEditorLayerGroup(group.id, false)}
            disabled={pageFrozen}
            className="p-0.5 rounded text-slate-500 hover:text-amber-300 disabled:opacity-30"
            title="解散图层组并保留内容"
            aria-label="解散图层组并保留内容"
          >
            <FolderMinus size={12} />
          </button>
          <button
            onClick={() => deleteEditorLayerGroup(group.id, true)}
            disabled={pageFrozen}
            className="p-0.5 rounded text-slate-500 hover:text-red-300 disabled:opacity-30"
            title="删除图层组及其内容"
            aria-label="删除图层组及其内容"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {expanded && (
          <div>
            {childGroups.map((child) => renderGroup(child, depth + 1))}
            {members.map((member, index) => renderEl(member, depth + 1, index))}
            {members.length === 0 && childGroups.length === 0 && (
              <div className="py-1 text-[10px] text-slate-600" style={{ paddingLeft: `${24 + depth * 16}px` }}>空图层组</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 ${workbenchReadonly ? 'pointer-events-none opacity-60' : ''}`}
      data-keep-selection
      aria-disabled={workbenchReadonly}
      inert={workbenchReadonly ? true : undefined}
      onDragOver={handleDragOverTopLevel}
      onDrop={handleDropTopLevel}
    >
      {showHeader && (
        <div className="h-9 flex items-center gap-2 px-3 text-xs font-medium text-slate-400">
          <span className="flex-1">{t('elementList')} ({elements.length})</span>
          <button
            onClick={createGroupFromSelection}
            disabled={pageFrozen}
            className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30"
            title="创建空图层组，随后拖入图层"
            aria-label="创建空图层组"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-slate-500">{t('noElements')}</span>
          </div>
        ) : (
          <div className="py-1">
            {layerGroups.filter((group) => !group.parentGroupId).map((group) => renderGroup(group, 0))}
            {topLevel.filter((el) => !el.groupId).map((el, index) => renderEl(el, 0, index))}
            {renderDropIndicator(undefined, topLevel.length)}
          </div>
        )}
        {selectedElementIds.length >= 2 && (
          <div className="px-2 py-1.5 border-t border-slate-700">
            <div className="flex gap-1 mb-1">
              <button onClick={() => setElementsEditorHidden(selectedElementIds, true)} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="隐藏选中图层" aria-label="隐藏选中图层"><EyeOff size={12} /></button>
              <button onClick={() => setElementsEditorHidden(selectedElementIds, false)} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="显示选中图层" aria-label="显示选中图层"><Eye size={12} /></button>
              <button onClick={() => setElementsLocked(selectedElementIds, true)} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="锁定选中图层" aria-label="锁定选中图层"><Lock size={12} /></button>
              <button onClick={() => setElementsLocked(selectedElementIds, false)} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="解锁选中图层" aria-label="解锁选中图层"><Unlock size={12} /></button>
            </div>
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
