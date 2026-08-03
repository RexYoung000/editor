import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useEditorStore } from '../store/editorStore';
import { elementMeta } from '../elements/elementMeta';
import { Trash2, Eye, EyeOff, Lock, Unlock, Folder, FolderOpen, FolderPlus, ChevronRight, ChevronDown, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Search, Crosshair, X } from 'lucide-react';
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
import {
  getLayerAncestorKeys,
  getLayerNodeKey,
  getLayerRangeSelection,
  getLayerTreeElementOrder,
  getLayerTreeVisibility,
  type LayerFilter,
} from '../utils/layerTree';

type DropTarget =
  | {
    kind: 'reorder';
    parentId: string | undefined;
    editorGroupId?: string;
    visualIndex: number;
    storageIndex: number;
  }
  | { kind: 'into-container'; containerId: string }
  | { kind: 'into-group'; groupId: string };

type LayerSelectModifiers = {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

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
  const selectedEditorLayerGroupId = useEditorStore((s) => s.selectedEditorLayerGroupId);
  const primarySelectedElementId = useEditorStore((s) => s.primarySelectedElementId);
  const selectionOrigin = useEditorStore((s) => s.selectionOrigin);
  const hoveredElementId = useEditorStore((s) => s.hoveredElementId);
  const selectElement = useEditorStore((s) => s.selectElement);
  const selectElements = useEditorStore((s) => s.selectElements);
  const selectEditorLayerGroup = useEditorStore((s) => s.selectEditorLayerGroup);
  const setHoveredElementId = useEditorStore((s) => s.setHoveredElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setElementEditorHidden = useEditorStore((s) => s.setElementEditorHidden);
  const setElementsEditorHidden = useEditorStore((s) => s.setElementsEditorHidden);
  const setElementLocked = useEditorStore((s) => s.setElementLocked);
  const setElementsLocked = useEditorStore((s) => s.setElementsLocked);
  const addEditorLayerGroup = useEditorStore((s) => s.addEditorLayerGroup);
  const deleteEditorLayerGroup = useEditorStore((s) => s.deleteEditorLayerGroup);
  const setEditorLayerGroupMembers = useEditorStore((s) => s.setEditorLayerGroupMembers);
  const setEditorLayerGroupParent = useEditorStore((s) => s.setEditorLayerGroupParent);
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
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [focusedLayerKey, setFocusedLayerKey] = useState<string | null>(null);
  const selectionAnchorRef = useRef<string | null>(null);
  const focusClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextGroupPreferenceSave = useRef(false);
  const skipNextContainerPreferenceSave = useRef(false);

  const currentPage = findActiveElementPage(currentCourse, currentSubPageId, currentInternalPageId);
  const elements = useMemo(() => currentPage?.elements ?? [], [currentPage?.elements]);
  const elementMap = useMemo(() => createElementMap(elements), [elements]);
  const layerGroups = useMemo(() => currentPage ? resolveEditorLayerGroups(currentPage) : [], [currentPage]);
  const explicitLayerGroupIds = new Set(currentPage?.editorLayerGroups?.map((group) => group.id) ?? []);
  const pageFrozen = Boolean(currentPage && 'frozen' in currentPage && currentPage.frozen);
  const groupPreferenceKey = currentCourse && currentPage
    ? `forge.layer-groups.${currentCourse.id}.${currentPage.id}`
    : null;
  const containerPreferenceKey = currentCourse && currentPage
    ? `forge.layer-containers.${currentCourse.id}.${currentPage.id}`
    : null;

  useEffect(() => {
    skipNextGroupPreferenceSave.current = true;
    skipNextContainerPreferenceSave.current = true;
    if (!groupPreferenceKey) {
      setExpandedGroups(new Set()); // eslint-disable-line react-hooks/set-state-in-effect
      setExpandedContainers(new Set());
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(groupPreferenceKey) ?? '[]');
      setExpandedGroups(new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []));
    } catch {
      setExpandedGroups(new Set());
    }
    try {
      const saved = containerPreferenceKey ? localStorage.getItem(containerPreferenceKey) : null;
      if (saved === null) {
        setExpandedContainers(new Set(elements.filter((element) => elements.some((child) => child.parentId === element.id)).map((element) => element.id)));
      } else {
        const parsed = JSON.parse(saved);
        setExpandedContainers(new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []));
      }
    } catch {
      setExpandedContainers(new Set());
    }
  }, [containerPreferenceKey, elements, groupPreferenceKey]);

  useEffect(() => {
    if (!groupPreferenceKey) return;
    if (skipNextGroupPreferenceSave.current) {
      skipNextGroupPreferenceSave.current = false;
      return;
    }
    localStorage.setItem(groupPreferenceKey, JSON.stringify([...expandedGroups]));
  }, [expandedGroups, groupPreferenceKey]);

  useEffect(() => {
    if (!containerPreferenceKey) return;
    if (skipNextContainerPreferenceSave.current) {
      skipNextContainerPreferenceSave.current = false;
      return;
    }
    localStorage.setItem(containerPreferenceKey, JSON.stringify([...expandedContainers]));
  }, [containerPreferenceKey, expandedContainers]);

  useEffect(() => {
    selectionAnchorRef.current = null;
    setHoveredElementId(null);
  }, [currentPage?.id, setHoveredElementId]);

  const getElementSearchText = (element: typeof elements[number]): string => {
    const parts: string[] = [];
    const visited = new Set<string>();
    let current: typeof element | undefined = element;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const meta = elementMeta[current.type];
      parts.push(
        getLayerDisplayName(current, meta?.label),
        current.id,
        current.name ?? '',
        current.type,
        meta?.label ?? '',
      );
      current = current.parentId ? elementMap.get(current.parentId) : undefined;
    }
    const group = currentPage ? layerGroups.find((candidate) => candidate.id === element.groupId) : undefined;
    if (group) {
      const groupNames: string[] = [];
      const visitedGroups = new Set<string>();
      let currentGroup: ResolvedEditorLayerGroup | undefined = group;
      while (currentGroup && !visitedGroups.has(currentGroup.id)) {
        visitedGroups.add(currentGroup.id);
        groupNames.push(currentGroup.name, currentGroup.id);
        currentGroup = currentGroup.parentGroupId
          ? layerGroups.find((candidate) => candidate.id === currentGroup?.parentGroupId)
          : undefined;
      }
      parts.push(...groupNames);
    }
    return parts.join(' ');
  };

  const elementSearchText = new Map(elements.map((element) => [element.id, getElementSearchText(element)]));
  const groupSearchText = new Map(layerGroups.map((group) => {
    const parts: string[] = [];
    const visitedGroups = new Set<string>();
    let currentGroup: ResolvedEditorLayerGroup | undefined = group;
    while (currentGroup && !visitedGroups.has(currentGroup.id)) {
      visitedGroups.add(currentGroup.id);
      parts.push(currentGroup.name, currentGroup.id);
      currentGroup = currentGroup.parentGroupId
        ? layerGroups.find((candidate) => candidate.id === currentGroup?.parentGroupId)
        : undefined;
    }
    return [group.id, parts.join(' ')] as const;
  }));
  const layerStates = new Map(elements.map((element) => [element.id, getElementLayerState(element, elementMap)]));
  const visibility = getLayerTreeVisibility({
    elements,
    groups: layerGroups,
    searchTerm,
    filter: layerFilter,
    typeFilter,
    selectedIds: selectedElementIds,
    selectedGroupId: selectedEditorLayerGroupId,
    elementSearchText,
    groupSearchText,
    layerStates,
  });
  const expandedElementIds = new Set([...expandedContainers, ...visibility.autoExpandedElementIds]);
  const expandedGroupIds = new Set([...expandedGroups, ...visibility.autoExpandedGroupIds]);
  const visibleElementOrder = getLayerTreeElementOrder(
    elements,
    layerGroups,
    visibility.visibleElementIds,
    visibility.visibleGroupIds,
    expandedElementIds,
    expandedGroupIds,
  );
  const typeOptions = [...new Set(elements.map((element) => element.type))]
    .sort((left, right) => (elementMeta[left]?.label ?? left).localeCompare(elementMeta[right]?.label ?? right, 'zh-CN'));

  useEffect(() => {
    if (!currentPage || selectionOrigin !== 'canvas') return;
    const targetKind = selectedEditorLayerGroupId ? 'group' : primarySelectedElementId ? 'element' : null;
    const targetId = selectedEditorLayerGroupId ?? primarySelectedElementId ?? selectedElementIds.at(-1);
    if (!targetKind || !targetId) return;
    const ancestors = getLayerAncestorKeys(targetId, targetKind, elements, layerGroups);
    const targetKey = getLayerNodeKey(targetKind, targetId);
    const scrollTimer = window.setTimeout(() => {
      if (ancestors.elementIds.length > 0) {
        setExpandedContainers((previous) => new Set([...previous, ...ancestors.elementIds]));
      }
      if (ancestors.groupIds.length > 0) {
        setExpandedGroups((previous) => new Set([...previous, ...ancestors.groupIds]));
      }
      window.setTimeout(() => {
        const row = [...document.querySelectorAll<HTMLElement>('[data-layer-row]')]
          .find((candidate) => candidate.dataset.layerRow === targetKey);
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFocusedLayerKey(targetKey);
        if (focusClearTimerRef.current) clearTimeout(focusClearTimerRef.current);
        focusClearTimerRef.current = setTimeout(() => setFocusedLayerKey(null), 900);
      }, 0);
    }, 0);
    return () => window.clearTimeout(scrollTimer);
  }, [currentPage, elements, layerGroups, primarySelectedElementId, selectedEditorLayerGroupId, selectedElementIds, selectionOrigin]);

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
  const isElementVisible = (id: string) => visibility.visibleElementIds.has(id);
  const isGroupVisible = (id: string) => visibility.visibleGroupIds.has(id);
  const isElementExpanded = (id: string) => expandedElementIds.has(id);
  const isGroupExpanded = (id: string) => expandedGroupIds.has(id);

  const handleElementSelect = (el: typeof elements[number], event: LayerSelectModifiers) => {
    const toggle = event.ctrlKey || event.metaKey;
    if (event.shiftKey && !toggle) {
      const range = getLayerRangeSelection(visibleElementOrder, selectionAnchorRef.current, el.id);
      if (range.length > 0) {
        selectElements(range, 'layer', el.id);
      }
    } else {
      selectElement(el.id, toggle, 'layer');
      selectionAnchorRef.current = el.id;
    }
    if (!event.shiftKey || !selectionAnchorRef.current) selectionAnchorRef.current = el.id;
  };

  const handleGroupSelect = (groupId: string, event?: LayerSelectModifiers) => {
    selectionAnchorRef.current = null;
    selectEditorLayerGroup(groupId, Boolean(event?.ctrlKey || event?.metaKey), 'layer');
  };

  const scrollToLayerRow = (targetKind: 'element' | 'group', targetId: string) => {
    const targetKey = getLayerNodeKey(targetKind, targetId);
    const row = [...document.querySelectorAll<HTMLElement>('[data-layer-row]')]
      .find((candidate) => candidate.dataset.layerRow === targetKey);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedLayerKey(targetKey);
    if (focusClearTimerRef.current) clearTimeout(focusClearTimerRef.current);
    focusClearTimerRef.current = setTimeout(() => setFocusedLayerKey(null), 900);
  };

  const locateSelection = () => {
    const targetKind = selectedEditorLayerGroupId ? 'group' : 'element';
    const targetId = selectedEditorLayerGroupId ?? primarySelectedElementId ?? selectedElementIds.at(-1);
    if (!targetId) return;
    const ancestors = getLayerAncestorKeys(targetId, targetKind, elements, layerGroups);
    setExpandedContainers((previous) => new Set([...previous, ...ancestors.elementIds]));
    setExpandedGroups((previous) => new Set([...previous, ...ancestors.groupIds]));
    window.setTimeout(() => scrollToLayerRow(targetKind, targetId), 0);
  };

  const commitLayerName = (el: typeof elements[0], value: string) => {
    const normalized = value.trim();
    setEditingLayerId(null);
    setLayerDraft('');
    if (normalized === getExplicitLayerLabel(el)) return;
    updateElement(el.id, { props: withLayerLabel(el.props, normalized) });
    useEditorStore.getState().saveHistory();
  };

  const createGroupFromSelection = () => {
    const groupId = addEditorLayerGroup(getNextEditorLayerGroupName(layerGroups));
    if (!groupId) {
      showToast('图层组成员必须属于同一运行父级，且名称不能重复', 'error');
      return;
    }
    setExpandedGroups((previous) => new Set(previous).add(groupId));
  };

  const deleteLayerGroup = (group: ResolvedEditorLayerGroup) => {
    const contents = group.memberIds.length > 0 ? '及其成员' : '';
    if (!window.confirm(`确定删除图层组“${group.name}”${contents}吗？此操作可以撤销。`)) return;
    deleteEditorLayerGroup(group.id, true);
    selectEditorLayerGroup(null);
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
        editorGroupId: el.groupId && explicitLayerGroupIds.has(el.groupId) ? el.groupId : undefined,
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
      if (draggedEl.groupId && explicitLayerGroupIds.has(draggedEl.groupId)) {
        setElementParent(draggedId, dropTarget.containerId, false);
        setEditorLayerGroupMembers(undefined, [draggedId], false);
        useEditorStore.getState().saveHistory();
      } else {
        setElementParent(draggedId, dropTarget.containerId);
      }
    } else if (dropTarget.kind === 'reorder') {
      const targetGroupId = dropTarget.editorGroupId;
      const currentGroupIsExplicit = Boolean(draggedEl.groupId && explicitLayerGroupIds.has(draggedEl.groupId));
      const membershipWillChange = (currentGroupIsExplicit || Boolean(targetGroupId)) && draggedEl.groupId !== targetGroupId;
      const targetGroup = targetGroupId ? layerGroups.find((group) => group.id === targetGroupId) : undefined;
      if (targetGroupId && (!targetGroup || targetGroup.crossRuntimeParent || targetGroup.runtimeParentId !== dropTarget.parentId)) {
        showToast('图层组只接收同一运行父级下的成员', 'error');
        setDraggedId(null); setDropTarget(null); return;
      }
      if (draggedEl.parentId !== dropTarget.parentId || membershipWillChange) {
        // 跨容器 reorder 也需要约束检查
        const targetParent = dropTarget.parentId ? elements.find(el => el.id === dropTarget.parentId) : undefined;
        if (draggedEl.type === 'DropObj' && targetParent?.type !== 'DragDropBox') { setDraggedId(null); setDropTarget(null); return; }
        if (draggedEl.type === 'DragObj' && targetParent?.type !== 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
        if (draggedEl.parentId !== dropTarget.parentId) setElementParent(draggedId, dropTarget.parentId || undefined, false);
        reorderElement(draggedId, dropTarget.storageIndex, false);
        if (membershipWillChange) setEditorLayerGroupMembers(targetGroupId, [draggedId], false);
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
    const membershipWillChange = Boolean(draggedEl.groupId && explicitLayerGroupIds.has(draggedEl.groupId));
    if (draggedEl.parentId || membershipWillChange) {
      if (draggedEl.parentId) setElementParent(draggedId, undefined, false);
      if (dropTarget.kind === 'reorder') {
        reorderElement(draggedId, dropTarget.storageIndex, false);
      }
      if (membershipWillChange) setEditorLayerGroupMembers(undefined, [draggedId], false);
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

  const renderDropIndicator = (parentId: string | undefined, visualIndex: number, editorGroupId?: string) => {
    if (dropTarget?.kind === 'reorder'
      && dropTarget.parentId === parentId
      && dropTarget.editorGroupId === editorGroupId
      && dropTarget.visualIndex === visualIndex) {
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
    const children = getVisualChildren(el.id).filter((child) => !child.groupId && isElementVisible(child.id));
    const hasChildren = children.length > 0;
    const expanded = isElementExpanded(el.id);
    const parentId = el.parentId;
    const editorGroupId = el.groupId && explicitLayerGroupIds.has(el.groupId) ? el.groupId : undefined;
    const layerName = getLayerDisplayName(el, meta?.label);
    const isEditingLayer = editingLayerId === el.id;
    const isFocused = focusedLayerKey === getLayerNodeKey('element', el.id);
    const isHovered = hoveredElementId === el.id;

    return (
      <div key={el.id}>
        {renderDropIndicator(parentId, visualIndex, editorGroupId)}
        <div
          data-layer-row={getLayerNodeKey('element', el.id)}
          className={`group flex items-center gap-1 py-1 text-xs transition-colors ${
            isDragging ? 'opacity-40' :
            isContainerTarget ? 'ring-2 ring-blue-500 rounded mx-1' :
            isFocused ? 'ring-2 ring-cyan-300/90 rounded mx-1' :
            isSelected ? 'bg-blue-600/30 text-blue-300' :
            isHovered ? 'bg-cyan-400/15 text-cyan-100' :
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
          onMouseEnter={() => setHoveredElementId(el.id)}
          onMouseLeave={() => {
            if (useEditorStore.getState().hoveredElementId === el.id) setHoveredElementId(null);
          }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('button, input')) return;
            handleElementSelect(el, event);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpandedContainers((previous) => {
                  const next = new Set(previous);
                  if (next.has(el.id)) next.delete(el.id); else next.add(el.id);
                  return next;
                });
              }}
              className="p-0.5 shrink-0 text-slate-500 hover:text-slate-200"
              aria-label={expanded ? '收起子图层' : '展开子图层'}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : <span className="w-[18px] shrink-0" />}
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
            onClick={(e) => {
              e.stopPropagation();
              handleElementSelect(el, e);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleElementSelect(el, e);
              }
            }}
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
          {!effectiveLocked && !pageFrozen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!window.confirm(t('deleteElementConfirm'))) return;
                const wasSelected = selectedElementIds.includes(el.id);
                deleteElement(el.id);
                if (wasSelected) clearSelection();
              }}
              className={`p-0.5 rounded text-red-400 hover:bg-red-900 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              title={t('deleteElement')}
              aria-label={`删除图层 ${layerName}`}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        {expanded && children.map((child, index) => renderEl(child, depth + 1, index))}
        {expanded && renderDropIndicator(el.id, children.length)}
      </div>
    );
  };

  const renderGroup = (group: ResolvedEditorLayerGroup, depth: number): ReactElement => {
    const expanded = isGroupExpanded(group.id);
    const members = elements
      .filter((element) => group.memberIds.includes(element.id) && isElementVisible(element.id))
      .reverse();
    const childGroups = layerGroups.filter((candidate) => candidate.parentGroupId === group.id && isGroupVisible(candidate.id));
    const isSelected = selectedEditorLayerGroupId === group.id;
    const isFocused = focusedLayerKey === getLayerNodeKey('group', group.id);
    return (
      <div key={`layer-group-${group.id}`}>
        <div
          data-layer-row={getLayerNodeKey('group', group.id)}
          className={`group flex items-center gap-1 py-1 text-xs ${
            dropTarget?.kind === 'into-group' && dropTarget.groupId === group.id
              ? 'ring-2 ring-emerald-500 bg-emerald-950/30'
              : isFocused
                ? 'ring-2 ring-cyan-300/90 rounded mx-1'
              : isSelected
                ? 'bg-blue-600/30 text-blue-200'
                : group.crossRuntimeParent
                ? 'text-amber-300 bg-amber-950/20'
                : 'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
          aria-selected={isSelected}
          onClick={(event) => handleGroupSelect(group.id, event)}
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
            onClick={(event) => {
              event.stopPropagation();
              setExpandedGroups((previous) => {
                const next = new Set(previous);
                if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
                return next;
              });
            }}
            aria-label={expanded ? '收起图层组' : '展开图层组'}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {expanded ? <FolderOpen size={13} className="shrink-0 text-blue-300" /> : <Folder size={13} className="shrink-0 text-blue-300" />}
          <span
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            className="truncate flex-1 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              handleGroupSelect(group.id, event);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleGroupSelect(group.id, event);
              }
            }}
          >
            {group.name}
          </span>
          <span className="text-[10px] text-slate-500 shrink-0">{members.length}</span>
          {!pageFrozen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                deleteLayerGroup(group);
              }}
              className={`p-0.5 rounded text-red-400 hover:bg-red-900 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              title="删除图层组及其成员"
              aria-label={`删除图层组 ${group.name}`}
            >
              <Trash2 size={11} />
            </button>
          )}
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
      className={`h-full flex-1 flex flex-col min-h-0 ${workbenchReadonly ? 'pointer-events-none opacity-60' : ''}`}
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
      <div className="shrink-0 border-b border-slate-700/80 bg-slate-800 px-2 py-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded border border-slate-600 bg-slate-900/60 px-1.5 focus-within:border-cyan-400">
            <Search size={12} className="shrink-0 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索图层名称、标识或类型"
              aria-label="搜索图层"
              className="min-w-0 flex-1 bg-transparent py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="shrink-0 text-slate-500 hover:text-slate-200" aria-label="清空图层搜索">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={locateSelection}
            disabled={!selectedEditorLayerGroupId && !primarySelectedElementId && selectedElementIds.length === 0}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-cyan-200 disabled:opacity-30"
            title="在图层面板中定位当前选择"
            aria-label="在图层面板中定位当前选择"
          >
            <Crosshair size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={layerFilter}
            onChange={(event) => {
              const value = event.target.value as LayerFilter;
              setLayerFilter(value);
              if (value !== 'type') setTypeFilter('');
            }}
            aria-label="图层筛选"
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-300 outline-none focus:border-cyan-400"
          >
            <option value="all">全部图层</option>
            <option value="selected">仅选中</option>
            <option value="hidden">隐藏</option>
            <option value="locked">锁定</option>
            <option value="type">按组件类型</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setLayerFilter(event.target.value ? 'type' : 'all');
            }}
            aria-label="按组件类型筛选"
            disabled={layerFilter !== 'type' && !typeFilter}
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-300 outline-none focus:border-cyan-400 disabled:opacity-40"
          >
            <option value="">选择类型</option>
            {typeOptions.map((type) => <option key={type} value={type}>{elementMeta[type]?.label ?? type}</option>)}
          </select>
        </div>
        {(searchTerm || layerFilter !== 'all' || typeFilter) && (
          <div className="flex items-center justify-between text-[10px] text-slate-500" aria-live="polite">
            <span>显示 {visibility.visibleElementIds.size} / {elements.length} 个图层</span>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setLayerFilter('all'); setTypeFilter(''); }}
              className="text-cyan-400 hover:text-cyan-200"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-slate-500">{t('noElements')}</span>
          </div>
        ) : visibility.visibleElementIds.size === 0 && visibility.visibleGroupIds.size === 0 ? (
          <div className="flex h-32 items-center justify-center px-5 text-center text-xs text-slate-500">
            没有匹配的图层，试试清除搜索或筛选条件
          </div>
        ) : (
          <div className="py-1">
            {layerGroups.filter((group) => !group.parentGroupId && isGroupVisible(group.id)).map((group) => renderGroup(group, 0))}
            {topLevel.filter((el) => !el.groupId && isElementVisible(el.id)).map((el, index) => renderEl(el, 0, index))}
            {renderDropIndicator(undefined, topLevel.length)}
          </div>
        )}
        {!selectedEditorLayerGroupId && selectedElementIds.length >= 2 && (
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
