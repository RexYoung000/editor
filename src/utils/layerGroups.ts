import type { EditorLayerGroup, Element, SubPage } from '../types';

export interface ResolvedEditorLayerGroup extends EditorLayerGroup {
  memberIds: string[];
  /** 旧课件只有 Element.groupId 时生成的兼容组。 */
  legacy: boolean;
  /** 旧编组成员跨越多个运行父级，不能直接转成新图层组。 */
  crossRuntimeParent: boolean;
}

export function getEditorLayerGroups(page: Pick<SubPage, 'editorLayerGroups'>): EditorLayerGroup[] {
  return Array.isArray(page.editorLayerGroups) ? page.editorLayerGroups : [];
}

export function getNextEditorLayerGroupName(groups: Pick<EditorLayerGroup, 'name'>[]): string {
  const usedNames = new Set(groups.map((group) => group.name));
  let name = '图层组';
  let suffix = 2;
  while (usedNames.has(name)) name = `图层组 ${suffix++}`;
  return name;
}

function getCommonRuntimeParent(elements: Element[]): { parentId?: string; cross: boolean } {
  const parentIds = new Set(elements.map((element) => element.parentId));
  if (parentIds.size <= 1) return { parentId: elements[0]?.parentId, cross: false };
  return { cross: true };
}

/** 将显式元数据与旧 groupId 编组合并成图层面板可用的兼容视图。 */
export function resolveEditorLayerGroups(page: Pick<SubPage, 'elements' | 'editorLayerGroups'>): ResolvedEditorLayerGroup[] {
  const elements = page.elements ?? [];
  const explicit = getEditorLayerGroups(page);
  const explicitIds = new Set(explicit.map((group) => group.id));
  const groups: ResolvedEditorLayerGroup[] = explicit.map((group) => {
    const members = elements.filter((element) => element.groupId === group.id);
    const common = getCommonRuntimeParent(members);
    return {
      ...group,
      memberIds: members.map((element) => element.id),
      runtimeParentId: group.runtimeParentId ?? common.parentId,
      legacy: false,
      crossRuntimeParent: common.cross,
    };
  });

  const legacyIds = new Set(elements.map((element) => element.groupId).filter((id): id is string => Boolean(id)));
  for (const groupId of legacyIds) {
    if (explicitIds.has(groupId)) continue;
    const members = elements.filter((element) => element.groupId === groupId);
    const common = getCommonRuntimeParent(members);
    groups.push({
      id: groupId,
      name: '图层组',
      runtimeParentId: common.parentId,
      memberIds: members.map((element) => element.id),
      legacy: true,
      crossRuntimeParent: common.cross,
    });
  }
  return groups;
}

export function getGroupMembers(elements: Element[], groupId: string): Element[] {
  return elements.filter((element) => element.groupId === groupId);
}

export function isGroupDescendant(groups: EditorLayerGroup[], groupId: string, ancestorId: string): boolean {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const visited = new Set<string>();
  let current = byId.get(groupId);
  while (current?.parentGroupId && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentGroupId === ancestorId) return true;
    current = byId.get(current.parentGroupId);
  }
  return false;
}

export function canAssignElementsToGroup(
  elements: Element[],
  ids: string[],
  group: Pick<EditorLayerGroup, 'runtimeParentId'> & { memberIds?: string[] },
): boolean {
  const selected = elements.filter((element) => ids.includes(element.id));
  if (selected.length === 0 || selected.length !== new Set(ids).size) return false;
  const runtimeParentId = group.runtimeParentId ?? (
    group.memberIds?.length === 0 ? selected[0]?.parentId : undefined
  );
  return selected.every((element) => element.parentId === runtimeParentId);
}

export function canNestGroup(
  groups: EditorLayerGroup[],
  groupId: string,
  parentGroupId: string | undefined,
): boolean {
  if (!parentGroupId) return true;
  if (groupId === parentGroupId) return false;
  const parent = groups.find((group) => group.id === parentGroupId);
  if (!parent) return false;
  return !isGroupDescendant(groups, parentGroupId, groupId);
}
