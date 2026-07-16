import type { Element } from '../types';
import {
  getElementWorldBounds,
  type CanvasPoint,
  type CanvasRect,
} from './canvasGeometry';
import { isElementHidden } from './canvasSelection';
import type { SnapAxis } from './canvasSnap';

export interface SpacingItem {
  id: string;
  bounds: CanvasRect;
}

export interface SpacingLock {
  patternKey: string;
}

export interface SpacingLocks {
  x?: SpacingLock;
  y?: SpacingLock;
}

export interface EqualSpacingSegment {
  axis: SnapAxis;
  start: number;
  end: number;
  cross: number;
  distance: number;
}

export interface EqualSpacingHint {
  axis: SnapAxis;
  distance: number;
  segments: [EqualSpacingSegment, EqualSpacingSegment];
}

export interface EqualSpacingResult {
  correction: CanvasPoint;
  locks: SpacingLocks;
}

export interface EqualSpacingOptions {
  zoom: number;
  previous?: SpacingLocks;
  thresholdPx?: number;
  releaseThresholdPx?: number;
}

type PatternMode = 'between' | 'after' | 'before';

interface SpacingPattern {
  key: string;
  axis: SnapAxis;
  mode: PatternMode;
  first: SpacingItem;
  second: SpacingItem;
  targetStart: number;
  distance: number;
  span: number;
  cross: number;
}

const DEFAULT_THRESHOLD_PX = 5;
const DEFAULT_RELEASE_THRESHOLD_PX = 8;
const MAX_NEARBY_ITEMS_PER_AXIS = 24;
const EPSILON = 0.000001;

function isDescendantOfAny(
  element: Element,
  ancestorIds: Set<string>,
  elementMap: Map<string, Element>,
): boolean {
  const visited = new Set<string>();
  let parentId = element.parentId;
  while (parentId && !visited.has(parentId)) {
    if (ancestorIds.has(parentId)) return true;
    visited.add(parentId);
    parentId = elementMap.get(parentId)?.parentId;
  }
  return false;
}

function isAncestorOfAny(
  element: Element,
  descendantIds: Set<string>,
  elementMap: Map<string, Element>,
): boolean {
  for (const descendantId of descendantIds) {
    const visited = new Set<string>();
    let parentId = elementMap.get(descendantId)?.parentId;
    while (parentId && !visited.has(parentId)) {
      if (parentId === element.id) return true;
      visited.add(parentId);
      parentId = elementMap.get(parentId)?.parentId;
    }
  }
  return false;
}

export function createEqualSpacingItems(
  elements: Element[],
  movingRootIds: string[],
): SpacingItem[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const movingRoots = new Set(movingRootIds);
  return elements.flatMap((element) => {
    if (
      movingRoots.has(element.id)
      || isDescendantOfAny(element, movingRoots, elementMap)
      || isAncestorOfAny(element, movingRoots, elementMap)
      || isElementHidden(element, elementMap)
    ) return [];
    return [{ id: element.id, bounds: getElementWorldBounds(element, elements) }];
  });
}

function axisStart(rect: CanvasRect, axis: SnapAxis): number {
  return axis === 'x' ? rect.x : rect.y;
}

function axisSize(rect: CanvasRect, axis: SnapAxis): number {
  return axis === 'x' ? rect.width : rect.height;
}

function axisEnd(rect: CanvasRect, axis: SnapAxis): number {
  return axisStart(rect, axis) + axisSize(rect, axis);
}

function crossStart(rect: CanvasRect, axis: SnapAxis): number {
  return axis === 'x' ? rect.y : rect.x;
}

function crossEnd(rect: CanvasRect, axis: SnapAxis): number {
  return crossStart(rect, axis) + (axis === 'x' ? rect.height : rect.width);
}

function commonCross(
  axis: SnapAxis,
  moving: CanvasRect,
  first: CanvasRect,
  second: CanvasRect,
): number | null {
  const start = Math.max(
    crossStart(moving, axis),
    crossStart(first, axis),
    crossStart(second, axis),
  );
  const end = Math.min(
    crossEnd(moving, axis),
    crossEnd(first, axis),
    crossEnd(second, axis),
  );
  return end - start > EPSILON ? (start + end) / 2 : null;
}

function addPattern(
  patterns: SpacingPattern[],
  axis: SnapAxis,
  mode: PatternMode,
  moving: CanvasRect,
  first: SpacingItem,
  second: SpacingItem,
  targetStart: number,
  distance: number,
): void {
  if (distance <= EPSILON) return;
  const cross = commonCross(axis, moving, first.bounds, second.bounds);
  if (cross === null) return;
  const orderedStart = Math.min(
    axisStart(first.bounds, axis),
    axisStart(second.bounds, axis),
    targetStart,
  );
  const orderedEnd = Math.max(
    axisEnd(first.bounds, axis),
    axisEnd(second.bounds, axis),
    targetStart + axisSize(moving, axis),
  );
  patterns.push({
    key: `${axis}:${mode}:${first.id}:${second.id}`,
    axis,
    mode,
    first,
    second,
    targetStart,
    distance,
    span: orderedEnd - orderedStart,
    cross,
  });
}

function createAxisPatterns(
  moving: CanvasRect,
  items: SpacingItem[],
  axis: SnapAxis,
): SpacingPattern[] {
  const movingSize = axisSize(moving, axis);
  const movingCenter = axisStart(moving, axis) + movingSize / 2;
  const relevant = items
    .filter((item) => (
      crossEnd(item.bounds, axis) > crossStart(moving, axis) + EPSILON
      && crossStart(item.bounds, axis) < crossEnd(moving, axis) - EPSILON
    ))
    .sort((left, right) => (
      Math.abs(axisStart(left.bounds, axis) + axisSize(left.bounds, axis) / 2 - movingCenter)
      - Math.abs(axisStart(right.bounds, axis) + axisSize(right.bounds, axis) / 2 - movingCenter)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, MAX_NEARBY_ITEMS_PER_AXIS)
    .sort((left, right) => (
      axisStart(left.bounds, axis) - axisStart(right.bounds, axis)
      || left.id.localeCompare(right.id)
    ));
  const patterns: SpacingPattern[] = [];

  for (let firstIndex = 0; firstIndex < relevant.length - 1; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < relevant.length; secondIndex++) {
      const first = relevant[firstIndex];
      const second = relevant[secondIndex];
      const staticGap = axisStart(second.bounds, axis) - axisEnd(first.bounds, axis);
      if (staticGap < -EPSILON) continue;

      const betweenDistance = (
        axisStart(second.bounds, axis)
        - axisEnd(first.bounds, axis)
        - movingSize
      ) / 2;
      addPattern(
        patterns,
        axis,
        'between',
        moving,
        first,
        second,
        axisEnd(first.bounds, axis) + betweenDistance,
        betweenDistance,
      );
      addPattern(
        patterns,
        axis,
        'after',
        moving,
        first,
        second,
        axisEnd(second.bounds, axis) + staticGap,
        staticGap,
      );
      addPattern(
        patterns,
        axis,
        'before',
        moving,
        first,
        second,
        axisStart(first.bounds, axis) - staticGap - movingSize,
        staticGap,
      );
    }
  }
  return patterns;
}

function matchAxis(
  axis: SnapAxis,
  moving: CanvasRect,
  items: SpacingItem[],
  previous: SpacingLock | undefined,
  threshold: number,
  releaseThreshold: number,
): { correction: number; lock: SpacingLock } | null {
  const patterns = createAxisPatterns(moving, items, axis);
  const currentStart = axisStart(moving, axis);
  if (previous) {
    const retained = patterns.find((pattern) => pattern.key === previous.patternKey);
    if (retained) {
      const correction = retained.targetStart - currentStart;
      if (Math.abs(correction) <= releaseThreshold) {
        return { correction, lock: previous };
      }
    }
  }
  const matches = patterns
    .map((pattern) => ({
      pattern,
      correction: pattern.targetStart - currentStart,
    }))
    .filter(({ correction }) => Math.abs(correction) <= threshold)
    .sort((left, right) => (
      Math.abs(left.correction) - Math.abs(right.correction)
      || left.pattern.span - right.pattern.span
      || left.pattern.key.localeCompare(right.pattern.key)
    ));
  const best = matches[0];
  return best
    ? { correction: best.correction, lock: { patternKey: best.pattern.key } }
    : null;
}

export function snapBoundsToEqualSpacing(
  moving: CanvasRect,
  items: SpacingItem[],
  options: EqualSpacingOptions,
): EqualSpacingResult {
  const zoom = Math.max(options.zoom, EPSILON);
  const threshold = (options.thresholdPx ?? DEFAULT_THRESHOLD_PX) / zoom;
  const releaseThreshold = (options.releaseThresholdPx ?? DEFAULT_RELEASE_THRESHOLD_PX) / zoom;
  const xMatch = matchAxis(
    'x',
    moving,
    items,
    options.previous?.x,
    threshold,
    releaseThreshold,
  );
  const yMatch = matchAxis(
    'y',
    moving,
    items,
    options.previous?.y,
    threshold,
    releaseThreshold,
  );
  return {
    correction: {
      x: xMatch?.correction ?? 0,
      y: yMatch?.correction ?? 0,
    },
    locks: {
      x: xMatch?.lock,
      y: yMatch?.lock,
    },
  };
}

function buildHint(
  moving: CanvasRect,
  pattern: SpacingPattern,
): EqualSpacingHint {
  const ordered = pattern.mode === 'between'
    ? [pattern.first.bounds, moving, pattern.second.bounds]
    : pattern.mode === 'after'
      ? [pattern.first.bounds, pattern.second.bounds, moving]
      : [moving, pattern.first.bounds, pattern.second.bounds];
  const createSegment = (first: CanvasRect, second: CanvasRect): EqualSpacingSegment => ({
    axis: pattern.axis,
    start: axisEnd(first, pattern.axis),
    end: axisStart(second, pattern.axis),
    cross: pattern.cross,
    distance: pattern.distance,
  });
  return {
    axis: pattern.axis,
    distance: pattern.distance,
    segments: [
      createSegment(ordered[0], ordered[1]),
      createSegment(ordered[1], ordered[2]),
    ],
  };
}

export function getEqualSpacingHints(
  moving: CanvasRect,
  items: SpacingItem[],
  zoom: number,
): EqualSpacingHint[] {
  const tolerance = 0.5 / Math.max(zoom, EPSILON);
  return (['x', 'y'] as const).flatMap((axis) => {
    const currentStart = axisStart(moving, axis);
    const match = createAxisPatterns(moving, items, axis)
      .filter((pattern) => Math.abs(pattern.targetStart - currentStart) <= tolerance)
      .sort((left, right) => (
        left.span - right.span
        || left.key.localeCompare(right.key)
      ))[0];
    return match ? [buildHint(moving, match)] : [];
  });
}
