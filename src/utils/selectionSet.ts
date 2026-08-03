import type { Element } from '../types';
import {
  getElementWorldBounds,
  getElementWorldMatrix,
  getPointsBounds,
  transformPoint,
  worldDeltaToElementParent,
  type CanvasPoint,
  type CanvasRect,
} from './canvasGeometry';
import { getTransformRootIds } from './canvasSelection';

const GEOMETRY_EPSILON = 0.000001;

export type SelectionAlignmentDirection =
  | 'left'
  | 'centerH'
  | 'right'
  | 'top'
  | 'centerV'
  | 'bottom'
  | 'distributeH'
  | 'distributeV';

export type SelectionGeometryKey = 'x' | 'y' | 'width' | 'height';

export interface SelectionGeometryChange {
  key: SelectionGeometryKey;
  value: number;
  lockAspectRatio?: boolean;
}

export interface SelectionGeometryUpdate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface SelectionRootEntry {
  element: Element;
  bounds: CanvasRect;
}

function getSelectionRoots(
  elements: Element[],
  selectedIds: string[],
  editorLayerGroupIds: Iterable<string> = [],
): SelectionRootEntry[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  return getTransformRootIds(elements, selectedIds, editorLayerGroupIds).flatMap((id) => {
    const element = elementMap.get(id);
    return element ? [{ element, bounds: getElementWorldBounds(element, elements) }] : [];
  });
}

function getElementWorldPivot(element: Element, elements: Element[]): CanvasPoint {
  const props = element.props as Record<string, unknown>;
  return transformPoint(getElementWorldMatrix(element, elements), {
    x: Number(props.anchorX ?? 0) * element.width,
    y: Number(props.anchorY ?? 0) * element.height,
  });
}

function getBounds(entries: SelectionRootEntry[]): CanvasRect | null {
  if (entries.length === 0) return null;
  return getPointsBounds(entries.flatMap(({ bounds }) => ([
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ])));
}

export function getSelectionSetBounds(
  elements: Element[],
  selectedIds: string[],
  editorLayerGroupIds: Iterable<string> = [],
): CanvasRect | null {
  return getBounds(getSelectionRoots(elements, selectedIds, editorLayerGroupIds));
}

export function getSelectionGeometryUpdates(
  elements: Element[],
  selectedIds: string[],
  change: SelectionGeometryChange,
  editorLayerGroupIds: Iterable<string> = [],
): SelectionGeometryUpdate[] {
  const roots = getSelectionRoots(elements, selectedIds, editorLayerGroupIds);
  const bounds = getBounds(roots);
  if (!bounds || !Number.isFinite(change.value)) return [];

  const nextOrigin = {
    x: change.key === 'x' ? change.value : bounds.x,
    y: change.key === 'y' ? change.value : bounds.y,
  };
  let nextWidth = change.key === 'width' ? Math.max(1, change.value) : bounds.width;
  let nextHeight = change.key === 'height' ? Math.max(1, change.value) : bounds.height;
  if (change.lockAspectRatio && (change.key === 'width' || change.key === 'height')) {
    const ratio = bounds.width / Math.max(bounds.height, GEOMETRY_EPSILON);
    if (change.key === 'width') nextHeight = Math.max(1, nextWidth / Math.max(ratio, GEOMETRY_EPSILON));
    else nextWidth = Math.max(1, nextHeight * ratio);
  }

  const scaleX = bounds.width > GEOMETRY_EPSILON ? nextWidth / bounds.width : 1;
  const scaleY = bounds.height > GEOMETRY_EPSILON ? nextHeight / bounds.height : 1;
  return roots.map(({ element }) => {
    const pivot = getElementWorldPivot(element, elements);
    const nextPivot = {
      x: nextOrigin.x + (pivot.x - bounds.x) * scaleX,
      y: nextOrigin.y + (pivot.y - bounds.y) * scaleY,
    };
    const localDelta = worldDeltaToElementParent(element, elements, {
      x: nextPivot.x - pivot.x,
      y: nextPivot.y - pivot.y,
    });
    return {
      id: element.id,
      x: element.x + localDelta.x,
      y: element.y + localDelta.y,
      width: Math.max(1, element.width * scaleX),
      height: Math.max(1, element.height * scaleY),
      rotation: element.rotation,
    };
  });
}

function getAlignmentCoordinate(entry: SelectionRootEntry, direction: SelectionAlignmentDirection): number {
  const { bounds } = entry;
  switch (direction) {
    case 'left': return bounds.x;
    case 'centerH': return bounds.x + bounds.width / 2;
    case 'right': return bounds.x + bounds.width;
    case 'top': return bounds.y;
    case 'centerV': return bounds.y + bounds.height / 2;
    case 'bottom': return bounds.y + bounds.height;
    default: return 0;
  }
}

export function getSelectionAlignmentUpdates(
  elements: Element[],
  selectedIds: string[],
  direction: SelectionAlignmentDirection,
  editorLayerGroupIds: Iterable<string> = [],
): SelectionGeometryUpdate[] {
  const roots = getSelectionRoots(elements, selectedIds, editorLayerGroupIds);
  if (roots.length < 2) return [];
  if ((direction === 'distributeH' || direction === 'distributeV') && roots.length < 3) return [];

  const updates = new Map<string, { x: number; y: number }>();
  if (direction === 'distributeH' || direction === 'distributeV') {
    const horizontal = direction === 'distributeH';
    const sorted = [...roots].sort((left, right) => horizontal
      ? left.bounds.x - right.bounds.x
      : left.bounds.y - right.bounds.y);
    const first = sorted[0].bounds;
    const last = sorted[sorted.length - 1].bounds;
    const start = horizontal ? first.x : first.y;
    const end = horizontal
      ? last.x + last.width
      : last.y + last.height;
    const totalSize = sorted.reduce((total, entry) => total + (horizontal ? entry.bounds.width : entry.bounds.height), 0);
    const gap = (end - start - totalSize) / (sorted.length - 1);
    let cursor = start;
    sorted.forEach((entry) => {
      const target = cursor;
      updates.set(entry.element.id, {
        x: horizontal ? target - entry.bounds.x : 0,
        y: horizontal ? 0 : target - entry.bounds.y,
      });
      cursor += (horizontal ? entry.bounds.width : entry.bounds.height) + gap;
    });
  } else {
    const target = direction === 'left' || direction === 'top'
      ? Math.min(...roots.map((entry) => getAlignmentCoordinate(entry, direction)))
      : direction === 'right' || direction === 'bottom'
        ? Math.max(...roots.map((entry) => getAlignmentCoordinate(entry, direction)))
        : (Math.min(...roots.map((entry) => getAlignmentCoordinate(entry, direction)))
          + Math.max(...roots.map((entry) => getAlignmentCoordinate(entry, direction)))) / 2;
    roots.forEach((entry) => {
      const delta = target - getAlignmentCoordinate(entry, direction);
      updates.set(entry.element.id, {
        x: direction === 'left' || direction === 'centerH' || direction === 'right' ? delta : 0,
        y: direction === 'top' || direction === 'centerV' || direction === 'bottom' ? delta : 0,
      });
    });
  }

  return roots.map(({ element }) => {
    const delta = updates.get(element.id) ?? { x: 0, y: 0 };
    const localDelta = worldDeltaToElementParent(element, elements, delta);
    return {
      id: element.id,
      x: Math.round(element.x + localDelta.x),
      y: Math.round(element.y + localDelta.y),
      width: element.width,
      height: element.height,
      rotation: element.rotation,
    };
  });
}
