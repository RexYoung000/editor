import type { Element } from '../types';
import {
  getElementWorldBounds,
  getPointsBounds,
  type CanvasPoint,
  type CanvasRect,
} from './canvasGeometry';
import { isElementHidden } from './canvasSelection';
import type { SelectionFrame, TransformHandle } from './canvasTransformTransaction';

export type SnapAxis = 'x' | 'y';
export type SnapAnchorKind = 'start' | 'center' | 'end';

export interface SnapCandidate {
  key: string;
  sourceKey?: string;
  axis: SnapAxis;
  kind?: SnapAnchorKind;
  value: number;
  extentStart: number;
  extentEnd: number;
  priority: number;
}

export interface SnapLock {
  anchor: SnapAnchorKind;
  candidateKey: string;
}

export interface SnapLocks {
  x?: SnapLock;
  y?: SnapLock;
}

export interface SnapGuide {
  axis: SnapAxis;
  position: number;
  start: number;
  end: number;
}

export interface SnapResult {
  correction: CanvasPoint;
  guides: SnapGuide[];
  locks: SnapLocks;
}

export interface SnapMatchOptions {
  zoom: number;
  previous?: SnapLocks;
  thresholdPx?: number;
  releaseThresholdPx?: number;
}

interface MovingAnchor {
  kind: SnapAnchorKind;
  value: number;
}

interface AxisMatch {
  correction: number;
  guides: SnapGuide[];
  lock: SnapLock;
}

const DEFAULT_THRESHOLD_PX = 5;
const DEFAULT_RELEASE_THRESHOLD_PX = 8;

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

function addBoundsCandidates(
  candidates: SnapCandidate[],
  keyPrefix: string,
  bounds: CanvasRect,
  priority: number,
): void {
  candidates.push(
    {
      key: `${keyPrefix}:x:start`,
      sourceKey: keyPrefix,
      axis: 'x',
      kind: 'start',
      value: bounds.x,
      extentStart: bounds.y,
      extentEnd: bounds.y + bounds.height,
      priority,
    },
    {
      key: `${keyPrefix}:x:center`,
      sourceKey: keyPrefix,
      axis: 'x',
      kind: 'center',
      value: bounds.x + bounds.width / 2,
      extentStart: bounds.y,
      extentEnd: bounds.y + bounds.height,
      priority,
    },
    {
      key: `${keyPrefix}:x:end`,
      sourceKey: keyPrefix,
      axis: 'x',
      kind: 'end',
      value: bounds.x + bounds.width,
      extentStart: bounds.y,
      extentEnd: bounds.y + bounds.height,
      priority,
    },
    {
      key: `${keyPrefix}:y:start`,
      sourceKey: keyPrefix,
      axis: 'y',
      kind: 'start',
      value: bounds.y,
      extentStart: bounds.x,
      extentEnd: bounds.x + bounds.width,
      priority,
    },
    {
      key: `${keyPrefix}:y:center`,
      sourceKey: keyPrefix,
      axis: 'y',
      kind: 'center',
      value: bounds.y + bounds.height / 2,
      extentStart: bounds.x,
      extentEnd: bounds.x + bounds.width,
      priority,
    },
    {
      key: `${keyPrefix}:y:end`,
      sourceKey: keyPrefix,
      axis: 'y',
      kind: 'end',
      value: bounds.y + bounds.height,
      extentStart: bounds.x,
      extentEnd: bounds.x + bounds.width,
      priority,
    },
  );
}

export function createSmartSnapCandidates(
  elements: Element[],
  movingRootIds: string[],
  pageWidth: number,
  pageHeight: number,
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const movingRoots = new Set(movingRootIds);
  const directParentIds = new Set(movingRootIds.flatMap((id) => {
    const parentId = elementMap.get(id)?.parentId;
    return parentId ? [parentId] : [];
  }));

  addBoundsCandidates(candidates, 'page', {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  }, 1);

  for (const element of elements) {
    if (
      movingRoots.has(element.id)
      || isDescendantOfAny(element, movingRoots, elementMap)
      || isElementHidden(element, elementMap)
    ) continue;
    addBoundsCandidates(
      candidates,
      `element:${element.id}`,
      getElementWorldBounds(element, elements),
      directParentIds.has(element.id) ? 0 : 2,
    );
  }
  return candidates;
}

function getThresholds(options: SnapMatchOptions): { threshold: number; releaseThreshold: number } {
  const zoom = Math.max(options.zoom, 0.000001);
  return {
    threshold: (options.thresholdPx ?? DEFAULT_THRESHOLD_PX) / zoom,
    releaseThreshold: (options.releaseThresholdPx ?? DEFAULT_RELEASE_THRESHOLD_PX) / zoom,
  };
}

function compareMatches(
  left: { distance: number; candidate: SnapCandidate; anchor: MovingAnchor },
  right: { distance: number; candidate: SnapCandidate; anchor: MovingAnchor },
): number {
  return left.distance - right.distance
    || left.candidate.priority - right.candidate.priority
    || left.candidate.key.localeCompare(right.candidate.key)
    || left.anchor.kind.localeCompare(right.anchor.kind);
}

function buildSimultaneousGuides(
  axis: SnapAxis,
  anchors: MovingAnchor[],
  candidates: SnapCandidate[],
  correction: number,
  movingExtentStart: number,
  movingExtentEnd: number,
): SnapGuide[] {
  const relations = candidates.flatMap((candidate) => anchors.flatMap((anchor) => (
    Math.abs(candidate.value - anchor.value - correction) <= 0.000001
      ? [{ candidate, anchor }]
      : []
  )));
  const outerKindsBySource = new Map<string, Set<SnapAnchorKind>>();
  for (const { candidate, anchor } of relations) {
    if (!candidate.sourceKey || candidate.kind !== anchor.kind) continue;
    const kinds = outerKindsBySource.get(candidate.sourceKey) ?? new Set<SnapAnchorKind>();
    kinds.add(anchor.kind);
    outerKindsBySource.set(candidate.sourceKey, kinds);
  }
  const visibleRelations = relations.filter(({ candidate, anchor }) => {
    if (
      candidate.sourceKey
      && candidate.kind === 'center'
      && anchor.kind === 'center'
    ) {
      const kinds = outerKindsBySource.get(candidate.sourceKey);
      if (kinds?.has('start') && kinds.has('end')) return false;
    }
    return true;
  });
  const positionsWithSpecificRelations = new Set(
    visibleRelations.flatMap(({ candidate }) => (
      candidate.sourceKey && candidate.sourceKey !== 'page'
        ? [candidate.value.toFixed(6)]
        : []
    )),
  );
  const guidesByPosition = new Map<string, SnapGuide>();
  for (const { candidate } of visibleRelations) {
    const positionKey = candidate.value.toFixed(6);
    if (candidate.sourceKey === 'page' && positionsWithSpecificRelations.has(positionKey)) continue;
    const existing = guidesByPosition.get(positionKey);
    const start = Math.min(movingExtentStart, candidate.extentStart);
    const end = Math.max(movingExtentEnd, candidate.extentEnd);
    if (existing) {
      existing.start = Math.min(existing.start, start);
      existing.end = Math.max(existing.end, end);
    } else {
      guidesByPosition.set(positionKey, {
        axis,
        position: candidate.value,
        start,
        end,
      });
    }
  }
  return [...guidesByPosition.values()].sort((left, right) => left.position - right.position);
}

function matchAxis(
  axis: SnapAxis,
  anchors: MovingAnchor[],
  candidates: SnapCandidate[],
  movingExtentStart: number,
  movingExtentEnd: number,
  previous: SnapLock | undefined,
  threshold: number,
  releaseThreshold: number,
): AxisMatch | null {
  const axisCandidates = candidates.filter((candidate) => candidate.axis === axis);
  if (previous) {
    const candidate = axisCandidates.find((item) => item.key === previous.candidateKey);
    const anchor = anchors.find((item) => item.kind === previous.anchor);
    if (candidate && anchor) {
      const correction = candidate.value - anchor.value;
      if (Math.abs(correction) <= releaseThreshold) {
        return {
          correction,
          guides: buildSimultaneousGuides(
            axis,
            anchors,
            axisCandidates,
            correction,
            movingExtentStart,
            movingExtentEnd,
          ),
          lock: previous,
        };
      }
    }
  }

  const matches = axisCandidates.flatMap((candidate) => anchors.flatMap((anchor) => {
    const correction = candidate.value - anchor.value;
    return Math.abs(correction) <= threshold
      ? [{ distance: Math.abs(correction), correction, candidate, anchor }]
      : [];
  }));
  matches.sort(compareMatches);
  const best = matches[0];
  if (!best) return null;
  return {
    correction: best.correction,
    guides: buildSimultaneousGuides(
      axis,
      anchors,
      axisCandidates,
      best.correction,
      movingExtentStart,
      movingExtentEnd,
    ),
    lock: { anchor: best.anchor.kind, candidateKey: best.candidate.key },
  };
}

function anchorsForRange(start: number, size: number): MovingAnchor[] {
  return [
    { kind: 'start', value: start },
    { kind: 'center', value: start + size / 2 },
    { kind: 'end', value: start + size },
  ];
}

export function snapBoundsToCandidates(
  bounds: CanvasRect,
  candidates: SnapCandidate[],
  options: SnapMatchOptions,
): SnapResult {
  const { threshold, releaseThreshold } = getThresholds(options);
  const xMatch = matchAxis(
    'x',
    anchorsForRange(bounds.x, bounds.width),
    candidates,
    bounds.y,
    bounds.y + bounds.height,
    options.previous?.x,
    threshold,
    releaseThreshold,
  );
  const yMatch = matchAxis(
    'y',
    anchorsForRange(bounds.y, bounds.height),
    candidates,
    bounds.x,
    bounds.x + bounds.width,
    options.previous?.y,
    threshold,
    releaseThreshold,
  );
  return {
    correction: { x: xMatch?.correction ?? 0, y: yMatch?.correction ?? 0 },
    guides: [...(xMatch?.guides ?? []), ...(yMatch?.guides ?? [])],
    locks: { x: xMatch?.lock, y: yMatch?.lock },
  };
}

export function snapPointToCandidates(
  point: CanvasPoint,
  axes: SnapAxis[],
  candidates: SnapCandidate[],
  options: SnapMatchOptions,
): SnapResult {
  const { threshold, releaseThreshold } = getThresholds(options);
  const axisSet = new Set(axes);
  const xMatch = axisSet.has('x')
    ? matchAxis(
      'x',
      [{ kind: 'center', value: point.x }],
      candidates,
      point.y,
      point.y,
      options.previous?.x,
      threshold,
      releaseThreshold,
    )
    : null;
  const yMatch = axisSet.has('y')
    ? matchAxis(
      'y',
      [{ kind: 'center', value: point.y }],
      candidates,
      point.x,
      point.x,
      options.previous?.y,
      threshold,
      releaseThreshold,
    )
    : null;
  return {
    correction: { x: xMatch?.correction ?? 0, y: yMatch?.correction ?? 0 },
    guides: [...(xMatch?.guides ?? []), ...(yMatch?.guides ?? [])],
    locks: { x: xMatch?.lock, y: yMatch?.lock },
  };
}

export function getSelectionFrameBounds(frame: SelectionFrame): CanvasRect {
  const radians = frame.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const transform = (x: number, y: number): CanvasPoint => ({
    x: frame.origin.x + x * cos - y * sin,
    y: frame.origin.y + x * sin + y * cos,
  });
  return getPointsBounds([
    transform(0, 0),
    transform(frame.width, 0),
    transform(frame.width, frame.height),
    transform(0, frame.height),
  ]);
}

export function getResizeSnapAxes(handle: TransformHandle, rotation: number): SnapAxis[] {
  if (handle.length === 2) return ['x', 'y'];
  const radians = rotation * Math.PI / 180;
  const direction = handle === 'e' || handle === 'w'
    ? { x: Math.cos(radians), y: Math.sin(radians) }
    : { x: -Math.sin(radians), y: Math.cos(radians) };
  return Math.abs(direction.x) >= Math.abs(direction.y) ? ['x'] : ['y'];
}
