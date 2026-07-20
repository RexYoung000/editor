import type { Element } from '../types';

export interface LayerState {
  explicitHidden: boolean;
  effectiveHidden: boolean;
  hiddenById?: string;
  explicitLocked: boolean;
  effectiveLocked: boolean;
  lockedById?: string;
}

export function createElementMap(elements: Element[]): Map<string, Element> {
  return new Map(elements.map((element) => [element.id, element]));
}

export function isElementExplicitlyHidden(element: Element): boolean {
  return (element.props as Record<string, unknown>)._editorHidden === true;
}

export function getElementLayerState(element: Element, elementMap: Map<string, Element>): LayerState {
  const explicitHidden = isElementExplicitlyHidden(element);
  const state: LayerState = {
    explicitHidden,
    effectiveHidden: explicitHidden,
    explicitLocked: element.locked === true,
    effectiveLocked: element.locked === true,
  };

  const visited = new Set<string>([element.id]);
  let parentId = element.parentId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = elementMap.get(parentId);
    if (!parent) break;
    if (state.hiddenById === undefined && isElementExplicitlyHidden(parent)) {
      state.hiddenById = parent.id;
      state.effectiveHidden = true;
    }
    if (state.lockedById === undefined && parent.locked === true) {
      state.lockedById = parent.id;
      state.effectiveLocked = true;
    }
    parentId = parent.parentId;
  }
  return state;
}

export function isElementHidden(element: Element, elementMap: Map<string, Element>): boolean {
  return getElementLayerState(element, elementMap).effectiveHidden;
}

export function isElementLocked(element: Element, elementMap: Map<string, Element>): boolean {
  return getElementLayerState(element, elementMap).effectiveLocked;
}
