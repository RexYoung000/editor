import type { Element } from '../types';
import {
  doesElementIntersectRect,
  getElementParentContainment,
  isPointInsideElement,
  type CanvasPoint,
  type CanvasRect,
} from './canvasGeometry';
import { isContainerElementType } from './elementContainers';
import { isEditorCanvasHitThrough } from './canvasComposite';
import { isElementHidden, isElementLocked } from './layerState';
import type { LayerSelectionMode } from './layerTree';
import type { ResolvedEditorLayerGroup } from './layerGroups';

export { isElementHidden, isElementLocked } from './layerState';

export function getContainerIds(elements: Element[]): Set<string> {
  return new Set(elements.flatMap((element) => {
    const ids: string[] = [];
    if (isContainerElementType(element.type)) ids.push(element.id);
    if (element.parentId) ids.push(element.parentId);
    return ids;
  }));
}

export function getSelectionContextContainerIds(elements: Element[], selectedIds: string[]): Set<string> {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const selected = new Set(selectedIds);
  const contextIds = new Set<string>();
  for (const id of selectedIds) {
    const parentId = elementMap.get(id)?.parentId;
    if (parentId && containerIds.has(parentId) && !selected.has(parentId)) contextIds.add(parentId);
  }
  return contextIds;
}

export function getSelectionOverflowContextContainerIds(elements: Element[], selectedIds: string[]): Set<string> {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const selected = new Set(selectedIds);
  const overflowIds = new Set<string>();
  for (const id of selectedIds) {
    const element = elementMap.get(id);
    if (!element?.parentId || selected.has(element.parentId) || !containerIds.has(element.parentId)) continue;
    if (getElementParentContainment(element, elements)?.isOverflowing) overflowIds.add(element.parentId);
  }
  return overflowIds;
}

function isAncestor(ancestorId: string, descendantId: string, elementMap: Map<string, Element>): boolean {
  let current = elementMap.get(descendantId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = elementMap.get(current.parentId);
  }
  return false;
}

export function expandLayerGroups(
  elements: Element[],
  ids: string[],
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const explicitGroupIds = new Set(editorLayerGroupIds);
  const expanded: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const element = elementMap.get(id);
    const groupIds = element?.groupId && !explicitGroupIds.has(element.groupId)
      ? elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)
      : [id];
    for (const groupId of groupIds) {
      if (!seen.has(groupId)) {
        seen.add(groupId);
        expanded.push(groupId);
      }
    }
  }
  return expanded;
}

export function normalizeSelection(
  elements: Element[],
  ids: string[],
  preferredId?: string,
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  let normalized = expandLayerGroups(elements, ids, editorLayerGroupIds).filter((id) => elementMap.has(id));
  const preferredIds = preferredId ? new Set(expandLayerGroups(elements, [preferredId], editorLayerGroupIds)) : null;

  if (preferredIds) {
    normalized = normalized.filter((id) => {
      if (preferredIds.has(id)) return true;
      for (const preferred of preferredIds) {
        if (isAncestor(id, preferred, elementMap) || isAncestor(preferred, id, elementMap)) return false;
      }
      return true;
    });
  }

  const selected = new Set(normalized);
  return normalized.filter((id) => {
    if (preferredIds?.has(id)) return true;
    let current = elementMap.get(id);
    const visited = new Set<string>();
    while (current?.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      if (selected.has(current.parentId)) return false;
      current = elementMap.get(current.parentId);
    }
    return true;
  });
}

export function resolvePointerSelection(
  elements: Element[],
  currentIds: string[],
  hitId: string | null,
  toggle: boolean,
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  if (!hitId) return [];
  const hitGroup = expandLayerGroups(elements, [hitId], editorLayerGroupIds);
  if (!toggle) return normalizeSelection(elements, hitGroup, hitId, editorLayerGroupIds);
  const current = new Set(currentIds);
  const remove = hitGroup.every((id) => current.has(id));
  const next = remove
    ? currentIds.filter((id) => !hitGroup.includes(id))
    : [...currentIds, ...hitGroup];
  return normalizeSelection(elements, next, remove ? undefined : hitId, editorLayerGroupIds);
}

export interface ModePointerSelection {
  ids: string[];
  editorLayerGroupId?: string;
}

/** 根据画布工具栏的“组件 / 组”模式确定选择粒度。 */
export function resolvePointerSelectionByMode(
  elements: Element[],
  currentIds: string[],
  hitId: string | null,
  toggle: boolean,
  mode: LayerSelectionMode,
  groups: ResolvedEditorLayerGroup[] = [],
): ModePointerSelection {
  if (!hitId) return { ids: [] };
  if (mode === 'group') {
    const group = groups.find((candidate) => !candidate.legacy && candidate.memberIds.includes(hitId));
    if (group) return { ids: group.memberIds, editorLayerGroupId: group.id };
    // 组模式只认编辑器图层组；旧 groupId 继续在组件模式中保持兼容整组选择，
    // 但在“组”模式下没有对应的编辑器组时回退到实际组件。
    const allGroupIds = new Set(groups.map((groupItem) => groupItem.id));
    return {
      ids: resolvePointerSelection(elements, currentIds, hitId, toggle, allGroupIds),
    };
  }
  const editorLayerGroupIds = new Set(groups.filter((group) => !group.legacy).map((group) => group.id));
  return {
    ids: resolvePointerSelection(elements, currentIds, hitId, toggle, editorLayerGroupIds),
  };
}

export function resolveMarqueeSelection(
  elements: Element[],
  currentIds: string[],
  hitIds: string[],
  toggle: boolean,
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  const expandedHits = expandLayerGroups(elements, hitIds, editorLayerGroupIds);
  if (!toggle) return normalizeSelection(elements, expandedHits, undefined, editorLayerGroupIds);
  const next = new Set(currentIds);
  for (const id of expandedHits) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
  }
  return normalizeSelection(elements, [...next], undefined, editorLayerGroupIds);
}

export function findTopElementAtPoint(
  elements: Element[],
  point: CanvasPoint,
  selectedIds: string[],
  options: { includeLocked?: boolean } = {},
): Element | null {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const hits = elements.filter((element) => (
    !containerIds.has(element.id)
    && !isEditorCanvasHitThrough(element)
    && !isElementHidden(element, elementMap)
    && (options.includeLocked === true || !isElementLocked(element, elementMap))
    && isPointInsideElement(point, element, elements)
  ));
  const chooseTop = (candidates: Element[]) => {
    for (let index = candidates.length - 1; index >= 0; index--) {
      const candidate = candidates[index];
      if (!candidates.some((other) => other.id !== candidate.id && isAncestor(candidate.id, other.id, elementMap))) {
        return candidate;
      }
    }
    return null;
  };
  const selected = hits.filter((element) => selectedIds.includes(element.id));
  const topSelected = chooseTop(selected);
  const topHit = chooseTop(hits);
  if (topSelected && topHit && isAncestor(topSelected.id, topHit.id, elementMap)) return topHit;
  return topSelected ?? topHit;
}

export function findCanvasPointerTarget(
  elements: Element[],
  point: CanvasPoint,
  selectedIds: string[],
  containerHandleId?: string,
): Element | null {
  if (containerHandleId) {
    const elementMap = new Map(elements.map((element) => [element.id, element]));
    const handleElement = elementMap.get(containerHandleId);
    if (
      handleElement
      && getContainerIds(elements).has(handleElement.id)
      && !isElementHidden(handleElement, elementMap)
      && !isElementLocked(handleElement, elementMap)
    ) {
      return handleElement;
    }
  }
  return findTopElementAtPoint(elements, point, selectedIds);
}

export function getTransformRootIds(
  elements: Element[],
  selectedIds: string[],
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  return normalizeSelection(elements, selectedIds, undefined, editorLayerGroupIds).filter((id) => {
    const element = elementMap.get(id);
    return element ? !isElementLocked(element, elementMap) : false;
  });
}

export function selectElementsInRect(
  elements: Element[],
  rect: CanvasRect,
  editorLayerGroupIds: Iterable<string> = [],
): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const hits = elements.filter((element) => {
    if (containerIds.has(element.id)) return false;
    if (isEditorCanvasHitThrough(element)) return false;
    if (isElementHidden(element, elementMap) || isElementLocked(element, elementMap)) return false;
    return doesElementIntersectRect(element, elements, rect);
  });
  return normalizeSelection(elements, hits.map((element) => element.id), undefined, editorLayerGroupIds);
}
