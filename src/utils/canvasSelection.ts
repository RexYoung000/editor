import type { Element } from '../types';
import {
  doesElementIntersectRect,
  isPointInsideElement,
  type CanvasPoint,
  type CanvasRect,
} from './canvasGeometry';
import { isContainerElementType } from './elementContainers';

export function isElementHidden(element: Element, elementMap: Map<string, Element>): boolean {
  let current: Element | undefined = element;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if ((current.props as Record<string, unknown>)._editorHidden === true) return true;
    current = current.parentId ? elementMap.get(current.parentId) : undefined;
  }
  return false;
}

export function getContainerIds(elements: Element[]): Set<string> {
  return new Set(elements.flatMap((element) => {
    const ids: string[] = [];
    if (isContainerElementType(element.type)) ids.push(element.id);
    if (element.parentId) ids.push(element.parentId);
    return ids;
  }));
}

function isLocked(element: Element, elementMap: Map<string, Element>): boolean {
  let current: Element | undefined = element;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.locked) return true;
    current = current.parentId ? elementMap.get(current.parentId) : undefined;
  }
  return false;
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

export function expandLayerGroups(elements: Element[], ids: string[]): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const expanded: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const element = elementMap.get(id);
    const groupIds = element?.groupId
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

export function normalizeSelection(elements: Element[], ids: string[], preferredId?: string): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  let normalized = expandLayerGroups(elements, ids).filter((id) => elementMap.has(id));
  const preferredIds = preferredId ? new Set(expandLayerGroups(elements, [preferredId])) : null;

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
): string[] {
  if (!hitId) return [];
  const hitGroup = expandLayerGroups(elements, [hitId]);
  if (!toggle) return normalizeSelection(elements, hitGroup, hitId);
  const current = new Set(currentIds);
  const remove = hitGroup.every((id) => current.has(id));
  const next = remove
    ? currentIds.filter((id) => !hitGroup.includes(id))
    : [...currentIds, ...hitGroup];
  return normalizeSelection(elements, next, remove ? undefined : hitId);
}

export function resolveMarqueeSelection(
  elements: Element[],
  currentIds: string[],
  hitIds: string[],
  toggle: boolean,
): string[] {
  const expandedHits = expandLayerGroups(elements, hitIds);
  if (!toggle) return normalizeSelection(elements, expandedHits);
  const next = new Set(currentIds);
  for (const id of expandedHits) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
  }
  return normalizeSelection(elements, [...next]);
}

export function findTopElementAtPoint(
  elements: Element[],
  point: CanvasPoint,
  selectedIds: string[],
): Element | null {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const hits = elements.filter((element) => (
    !containerIds.has(element.id)
    && !isElementHidden(element, elementMap)
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

export function getTransformRootIds(elements: Element[], selectedIds: string[]): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  return normalizeSelection(elements, selectedIds).filter((id) => {
    const element = elementMap.get(id);
    return element ? !isLocked(element, elementMap) : false;
  });
}

export function selectElementsInRect(
  elements: Element[],
  rect: CanvasRect,
): string[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(elements);
  const hits = elements.filter((element) => {
    if (containerIds.has(element.id)) return false;
    if (isElementHidden(element, elementMap) || isLocked(element, elementMap)) return false;
    return doesElementIntersectRect(element, elements, rect);
  });
  return normalizeSelection(elements, hits.map((element) => element.id));
}
