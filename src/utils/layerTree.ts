import type { EditorLayerGroup, Element } from '../types';
import type { ResolvedEditorLayerGroup } from './layerGroups';
import { createElementMap, getElementLayerState, type LayerState } from './layerState';

export type LayerFilter = 'all' | 'selected' | 'hidden' | 'locked' | 'type';

export type LayerNodeKind = 'element' | 'group';

export function getLayerNodeKey(kind: LayerNodeKind, id: string): string {
  return `${kind}:${id}`;
}

function getGroupChain(
  groupId: string | undefined,
  groups: Pick<EditorLayerGroup, 'id' | 'parentGroupId'>[],
): string[] {
  if (!groupId) return [];
  const byId = new Map(groups.map((group) => [group.id, group]));
  const result: string[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = groupId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const group = byId.get(currentId);
    if (!group) break;
    result.push(group.id);
    currentId = group.parentGroupId;
  }
  return result;
}

export interface LayerAncestorKeys {
  elementIds: string[];
  groupIds: string[];
}

/** 返回目标行需要展开的祖先，不包含目标本身。 */
export function getLayerAncestorKeys(
  targetId: string,
  kind: LayerNodeKind,
  elements: Element[],
  groups: Pick<EditorLayerGroup, 'id' | 'parentGroupId'>[],
): LayerAncestorKeys {
  const elementMap = createElementMap(elements);
  const elementIds: string[] = [];
  const groupIds: string[] = [];
  const visitedElements = new Set<string>();

  if (kind === 'element') {
    let current = elementMap.get(targetId);
    while (current?.parentId && !visitedElements.has(current.id)) {
      visitedElements.add(current.id);
      const parent = elementMap.get(current.parentId);
      if (!parent) break;
      elementIds.push(parent.id);
      current = parent;
    }
    const target = elementMap.get(targetId);
    groupIds.push(...getGroupChain(target?.groupId, groups));
  } else {
    const byId = new Map(groups.map((group) => [group.id, group]));
    const visitedGroups = new Set<string>();
    let current = byId.get(targetId);
    while (current?.parentGroupId && !visitedGroups.has(current.id)) {
      visitedGroups.add(current.id);
      const parent = byId.get(current.parentGroupId);
      if (!parent) break;
      groupIds.push(parent.id);
      current = parent;
    }
  }

  return { elementIds, groupIds };
}

export interface LayerTreeVisibilityOptions {
  elements: Element[];
  groups: ResolvedEditorLayerGroup[];
  searchTerm: string;
  filter: LayerFilter;
  typeFilter: string;
  selectedIds: string[];
  selectedGroupId?: string | null;
  elementSearchText?: Map<string, string>;
  groupSearchText?: Map<string, string>;
  layerStates?: Map<string, LayerState>;
}

export interface LayerTreeVisibility {
  visibleElementIds: Set<string>;
  visibleGroupIds: Set<string>;
  matchedElementIds: Set<string>;
  matchedGroupIds: Set<string>;
  autoExpandedElementIds: Set<string>;
  autoExpandedGroupIds: Set<string>;
}

function includesSearch(text: string | undefined, term: string): boolean {
  return Boolean(term) && Boolean(text?.toLocaleLowerCase().includes(term));
}

/**
 * 计算图层面板当前应该保留的行。筛选只隐藏行，不改变元素存储顺序；祖先始终保留，
 * 以便用户能看懂命中项所在的运行容器或编辑器图层组。
 */
export function getLayerTreeVisibility(options: LayerTreeVisibilityOptions): LayerTreeVisibility {
  const {
    elements,
    groups,
    searchTerm,
    filter,
    typeFilter,
    selectedIds,
    selectedGroupId,
    elementSearchText = new Map(),
    groupSearchText = new Map(),
    layerStates,
  } = options;
  const term = searchTerm.trim().toLocaleLowerCase();
  const active = Boolean(term) || filter !== 'all';
  const visibleElementIds = new Set<string>();
  const visibleGroupIds = new Set<string>();
  const matchedElementIds = new Set<string>();
  const matchedGroupIds = new Set<string>();
  const autoExpandedElementIds = new Set<string>();
  const autoExpandedGroupIds = new Set<string>();

  if (!active) {
    return {
      visibleElementIds: new Set(elements.map((element) => element.id)),
      visibleGroupIds: new Set(groups.map((group) => group.id)),
      matchedElementIds,
      matchedGroupIds,
      autoExpandedElementIds,
      autoExpandedGroupIds,
    };
  }

  const selected = new Set(selectedIds);
  const elementMap = createElementMap(elements);
  const resolvedLayerStates = layerStates ?? new Map(
    elements.map((element) => [element.id, getElementLayerState(element, elementMap)]),
  );

  const addGroupAncestors = (groupId: string | undefined) => {
    for (const id of getGroupChain(groupId, groups)) visibleGroupIds.add(id);
  };

  const addElementAncestors = (elementId: string) => {
    const visited = new Set<string>();
    let current = elementMap.get(elementId);
    while (current?.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = elementMap.get(current.parentId);
      if (!parent) break;
      visibleElementIds.add(parent.id);
      current = parent;
    }
  };

  const addElement = (elementId: string) => {
    const element = elementMap.get(elementId);
    if (!element) return;
    visibleElementIds.add(element.id);
    addElementAncestors(element.id);
    addGroupAncestors(element.groupId);
  };

  const addGroupBranch = (groupId: string) => {
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return;
    visibleGroupIds.add(group.id);
    addGroupAncestors(group.parentGroupId);
    for (const memberId of group.memberIds) addElement(memberId);
    for (const child of groups.filter((candidate) => candidate.parentGroupId === group.id)) {
      addGroupBranch(child.id);
    }
  };

  const matchesFilter = (element: Element): boolean => {
    if (filter === 'selected') return selected.has(element.id);
    if (filter === 'hidden') return resolvedLayerStates.get(element.id)?.effectiveHidden === true;
    if (filter === 'locked') return resolvedLayerStates.get(element.id)?.effectiveLocked === true;
    if (filter === 'type') return !typeFilter || element.type === typeFilter;
    return true;
  };

  for (const element of elements) {
    const searchMatches = !term || includesSearch(elementSearchText.get(element.id), term);
    if (!matchesFilter(element) || !searchMatches) continue;
    matchedElementIds.add(element.id);
    addElement(element.id);
  }

  if (term) {
    for (const group of groups) {
      if (!includesSearch(groupSearchText.get(group.id), term)) continue;
      matchedGroupIds.add(group.id);
      addGroupBranch(group.id);
    }
  }

  if (filter === 'selected' && selectedGroupId) addGroupBranch(selectedGroupId);

  // 过滤结果只保留必要的图层组祖先；没有可见成员的空组仍保留自身，便于搜索组名。
  for (const groupId of [...visibleGroupIds]) {
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) continue;
    addGroupAncestors(group.parentGroupId);
  }

  if (term) {
    for (const elementId of matchedElementIds) {
      const ancestors = getLayerAncestorKeys(elementId, 'element', elements, groups);
      ancestors.elementIds.forEach((id) => autoExpandedElementIds.add(id));
      ancestors.groupIds.forEach((id) => autoExpandedGroupIds.add(id));
    }
    for (const groupId of matchedGroupIds) {
      const ancestors = getLayerAncestorKeys(groupId, 'group', elements, groups);
      ancestors.groupIds.forEach((id) => autoExpandedGroupIds.add(id));
    }
  }

  return {
    visibleElementIds,
    visibleGroupIds,
    matchedElementIds,
    matchedGroupIds,
    autoExpandedElementIds,
    autoExpandedGroupIds,
  };
}

/** 按图层面板视觉顺序返回可选择的元素行，支持 Shift 连续选择。 */
export function getLayerTreeElementOrder(
  elements: Element[],
  groups: ResolvedEditorLayerGroup[],
  visibleElementIds: Set<string>,
  visibleGroupIds: Set<string>,
  expandedElementIds: Set<string>,
  expandedGroupIds: Set<string>,
): string[] {
  const order: string[] = [];
  const walkElement = (element: Element) => {
    if (!visibleElementIds.has(element.id)) return;
    order.push(element.id);
    if (!expandedElementIds.has(element.id)) return;
    elements
      .filter((child) => child.parentId === element.id && !child.groupId)
      .reverse()
      .forEach(walkElement);
  };

  const walkGroup = (group: ResolvedEditorLayerGroup) => {
    if (!visibleGroupIds.has(group.id)) return;
    if (!expandedGroupIds.has(group.id)) return;
    groups.filter((child) => child.parentGroupId === group.id).forEach(walkGroup);
    elements
      .filter((element) => group.memberIds.includes(element.id) && visibleElementIds.has(element.id))
      .reverse()
      .forEach(walkElement);
  };

  groups.filter((group) => !group.parentGroupId).forEach(walkGroup);
  elements
    .filter((element) => !element.parentId && !element.groupId && visibleElementIds.has(element.id))
    .reverse()
    .forEach(walkElement);
  return order;
}

export function getLayerRangeSelection(
  visibleElementOrder: string[],
  anchorId: string | null | undefined,
  targetId: string,
): string[] {
  const targetIndex = visibleElementOrder.indexOf(targetId);
  if (targetIndex < 0) return [];
  const anchorIndex = anchorId ? visibleElementOrder.indexOf(anchorId) : -1;
  if (anchorIndex < 0) return [targetId];
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return visibleElementOrder.slice(start, end + 1);
}
