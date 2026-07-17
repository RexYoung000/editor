import type { Element } from '../types';

export const EDITOR_LAYER_LABEL_KEY = '_editorLabel';

export function getExplicitLayerLabel(element: Element): string {
  const value = element.props?.[EDITOR_LAYER_LABEL_KEY];
  return typeof value === 'string' ? value.trim() : '';
}

export function getLayerDisplayName(element: Element, typeLabel?: string): string {
  return getExplicitLayerLabel(element)
    || element.name?.trim()
    || typeLabel?.trim()
    || element.type;
}

export function withLayerLabel(
  props: Record<string, unknown>,
  label: string,
): Record<string, unknown> {
  const next = { ...props };
  const normalized = label.trim();
  if (normalized) {
    next[EDITOR_LAYER_LABEL_KEY] = normalized;
  } else {
    delete next[EDITOR_LAYER_LABEL_KEY];
  }
  return next;
}

export function getNextLayerCopyName(
  sourceName: string,
  existingNames: Iterable<string>,
): string {
  const normalizedSource = sourceName.trim() || '图层';
  const baseName = normalizedSource.replace(/\s+副本(?:\s+\d+)?$/, '').trim() || normalizedSource;
  const used = new Set(Array.from(existingNames, (name) => name.trim()).filter(Boolean));
  const firstCopy = `${baseName} 副本`;
  if (!used.has(firstCopy)) return firstCopy;

  let index = 2;
  while (used.has(`${firstCopy} ${index}`)) {
    index += 1;
  }
  return `${firstCopy} ${index}`;
}

export function getVisualSiblings(
  elements: Element[],
  parentId: string | undefined,
): Element[] {
  return elements.filter((element) => element.parentId === parentId).reverse();
}

/**
 * 把图层面板中的视觉插入位换算为 elements[] 的同级存储插入位。
 * 面板从高到低展示，存储则保持索引越大视觉层级越高。
 */
export function visualDropToStorageIndex(
  siblings: Element[],
  draggedId: string,
  visualInsertIndex: number,
): number {
  const visualSiblings = [...siblings].reverse();
  const currentVisualIndex = visualSiblings.findIndex((element) => element.id === draggedId);
  let finalVisualIndex = Math.max(0, Math.min(visualInsertIndex, visualSiblings.length));

  if (currentVisualIndex >= 0 && currentVisualIndex < finalVisualIndex) {
    finalVisualIndex -= 1;
  }

  const remainingCount = visualSiblings.length - (currentVisualIndex >= 0 ? 1 : 0);
  finalVisualIndex = Math.max(0, Math.min(finalVisualIndex, remainingCount));
  return remainingCount - finalVisualIndex;
}
