import type { Element } from '../types';
import {
  elementParentDeltaToWorld,
  getElementWorldCorners,
  getElementWorldMatrix,
  getPointsBounds,
  transformPoint,
  worldDeltaToElementParent,
  type CanvasPoint,
} from './canvasGeometry';
import { getTransformRootIds, normalizeSelection, isElementHidden } from './canvasSelection';

export type TransformHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface TransformSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  worldPivot: CanvasPoint;
}

export interface SelectionFrame {
  origin: CanvasPoint;
  width: number;
  height: number;
  rotation: number;
}

interface TransformTransactionBase {
  roots: TransformSnapshot[];
  preview: TransformSnapshot[];
  frame: SelectionFrame;
  previewFrame: SelectionFrame;
}

export interface MoveTransaction extends TransformTransactionBase {
  kind: 'move';
  primaryId: string;
  worldDelta: CanvasPoint;
}

export interface ResizeTransaction extends TransformTransactionBase {
  kind: 'resize';
  handle: TransformHandle;
}

export interface RotateTransaction extends TransformTransactionBase {
  kind: 'rotate';
  center: CanvasPoint;
  startPointerAngle: number;
  angleDelta: number;
}

export type CanvasTransformTransaction = MoveTransaction | ResizeTransaction | RotateTransaction;

const HANDLE_POSITION: Record<TransformHandle, CanvasPoint> = {
  nw: { x: 0, y: 0 },
  n: { x: 0.5, y: 0 },
  ne: { x: 1, y: 0 },
  e: { x: 1, y: 0.5 },
  se: { x: 1, y: 1 },
  s: { x: 0.5, y: 1 },
  sw: { x: 0, y: 1 },
  w: { x: 0, y: 0.5 },
};

function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function rotateVector(point: CanvasPoint, degrees: number): CanvasPoint {
  const radians = degreesToRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function rotatePoint(point: CanvasPoint, center: CanvasPoint, degrees: number): CanvasPoint {
  const rotated = rotateVector({ x: point.x - center.x, y: point.y - center.y }, degrees);
  return { x: center.x + rotated.x, y: center.y + rotated.y };
}

function framePointToWorld(frame: SelectionFrame, point: CanvasPoint): CanvasPoint {
  const rotated = rotateVector(point, frame.rotation);
  return { x: frame.origin.x + rotated.x, y: frame.origin.y + rotated.y };
}

export function getFrameHandleWorldPoint(
  frame: SelectionFrame,
  handle: TransformHandle,
): CanvasPoint {
  const ratio = HANDLE_POSITION[handle];
  return framePointToWorld(frame, {
    x: ratio.x * frame.width,
    y: ratio.y * frame.height,
  });
}

function worldPointToFrame(frame: SelectionFrame, point: CanvasPoint): CanvasPoint {
  return rotateVector({ x: point.x - frame.origin.x, y: point.y - frame.origin.y }, -frame.rotation);
}

function getFrameCenter(frame: SelectionFrame): CanvasPoint {
  return framePointToWorld(frame, { x: frame.width / 2, y: frame.height / 2 });
}

function getElementWorldPivot(element: Element, elements: Element[]): CanvasPoint {
  const props = element.props as Record<string, unknown>;
  return transformPoint(getElementWorldMatrix(element, elements), {
    x: Number(props.anchorX ?? 0) * element.width,
    y: Number(props.anchorY ?? 0) * element.height,
  });
}

function createSnapshots(
  elements: Element[],
  selectedIds: string[],
  editorLayerGroupIds: Iterable<string>,
): TransformSnapshot[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  return getTransformRootIds(elements, selectedIds, editorLayerGroupIds).flatMap((id) => {
    const element = elementMap.get(id);
    return element ? [{
      id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      worldPivot: getElementWorldPivot(element, elements),
    }] : [];
  });
}

export function getSelectionFrame(
  elements: Element[],
  selectedIds: string[],
  options: { includeLocked?: boolean; editorLayerGroupIds?: Iterable<string> } = {},
): SelectionFrame | null {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const rootIds = options.includeLocked
    ? normalizeSelection(elements, selectedIds, undefined, options.editorLayerGroupIds).filter((id) => {
      const element = elementMap.get(id);
      return element ? !isElementHidden(element, elementMap) : false;
    })
    : getTransformRootIds(elements, selectedIds, options.editorLayerGroupIds);
  const roots = rootIds.flatMap((id) => {
    const element = elementMap.get(id);
    return element ? [element] : [];
  });
  if (roots.length === 0) return null;
  if (roots.length === 1) {
    const corners = getElementWorldCorners(roots[0], elements);
    return {
      origin: corners[0],
      width: Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y),
      height: Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y),
      rotation: Math.atan2(corners[1].y - corners[0].y, corners[1].x - corners[0].x) * 180 / Math.PI,
    };
  }
  const bounds = getPointsBounds(roots.flatMap((element) => getElementWorldCorners(element, elements)));
  return { origin: { x: bounds.x, y: bounds.y }, width: bounds.width, height: bounds.height, rotation: 0 };
}

export function createMoveTransaction(
  elements: Element[],
  selectedIds: string[],
  primaryId: string,
  editorLayerGroupIds: Iterable<string> = [],
): MoveTransaction | null {
  const roots = createSnapshots(elements, selectedIds, editorLayerGroupIds);
  const frame = getSelectionFrame(elements, selectedIds, { editorLayerGroupIds });
  if (!frame || !roots.some((item) => item.id === primaryId)) return null;
  return {
    kind: 'move',
    primaryId,
    roots,
    preview: roots.map((item) => ({ ...item, worldPivot: { ...item.worldPivot } })),
    frame,
    previewFrame: frame,
    worldDelta: { x: 0, y: 0 },
  };
}

function previewMoveWithWorldDelta(
  transaction: MoveTransaction,
  elements: Element[],
  worldDelta: CanvasPoint,
): MoveTransaction {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const preview = transaction.roots.map((start) => {
    const element = elementMap.get(start.id);
    if (!element) return { ...start };
    const localDelta = worldDeltaToElementParent(element, elements, worldDelta);
    return {
      ...start,
      x: start.x + localDelta.x,
      y: start.y + localDelta.y,
      worldPivot: { x: start.worldPivot.x + worldDelta.x, y: start.worldPivot.y + worldDelta.y },
    };
  });
  return {
    ...transaction,
    preview,
    previewFrame: {
      ...transaction.frame,
      origin: {
        x: transaction.frame.origin.x + worldDelta.x,
        y: transaction.frame.origin.y + worldDelta.y,
      },
    },
    worldDelta,
  };
}

export function previewMoveTransaction(
  transaction: MoveTransaction,
  elements: Element[],
  requestedWorldDelta: CanvasPoint,
  snap: (value: number) => number,
  lockAxis: boolean,
): MoveTransaction {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  let worldDelta = requestedWorldDelta;
  if (lockAxis) {
    worldDelta = Math.abs(worldDelta.x) >= Math.abs(worldDelta.y)
      ? { x: worldDelta.x, y: 0 }
      : { x: 0, y: worldDelta.y };
  }

  const primaryStart = transaction.roots.find((item) => item.id === transaction.primaryId);
  const primaryElement = elementMap.get(transaction.primaryId);
  if (!primaryStart || !primaryElement) return transaction;
  const primaryLocalDelta = worldDeltaToElementParent(primaryElement, elements, worldDelta);
  const snappedLocalDelta = {
    x: snap(primaryStart.x + primaryLocalDelta.x) - primaryStart.x,
    y: snap(primaryStart.y + primaryLocalDelta.y) - primaryStart.y,
  };
  worldDelta = elementParentDeltaToWorld(primaryElement, elements, snappedLocalDelta);
  return previewMoveWithWorldDelta(transaction, elements, worldDelta);
}

export function translateMoveTransaction(
  transaction: MoveTransaction,
  elements: Element[],
  correction: CanvasPoint,
): MoveTransaction {
  return previewMoveWithWorldDelta(transaction, elements, {
    x: transaction.worldDelta.x + correction.x,
    y: transaction.worldDelta.y + correction.y,
  });
}

export function createResizeTransaction(
  elements: Element[],
  selectedIds: string[],
  handle: TransformHandle,
  editorLayerGroupIds: Iterable<string> = [],
): ResizeTransaction | null {
  const roots = createSnapshots(elements, selectedIds, editorLayerGroupIds);
  const frame = getSelectionFrame(elements, selectedIds, { editorLayerGroupIds });
  if (!frame || roots.length === 0 || frame.width < 0.000001 || frame.height < 0.000001) return null;
  return {
    kind: 'resize',
    handle,
    roots,
    preview: roots.map((item) => ({ ...item, worldPivot: { ...item.worldPivot } })),
    frame,
    previewFrame: frame,
  };
}

export function previewResizeTransaction(
  transaction: ResizeTransaction,
  elements: Element[],
  pointer: CanvasPoint,
  lockAspectRatio: boolean,
  snap: (value: number) => number,
): ResizeTransaction {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const handleRatio = HANDLE_POSITION[transaction.handle];
  const handleStart = {
    x: handleRatio.x * transaction.frame.width,
    y: handleRatio.y * transaction.frame.height,
  };
  const fixed = {
    x: (1 - handleRatio.x) * transaction.frame.width,
    y: (1 - handleRatio.y) * transaction.frame.height,
  };
  const pointerInFrame = worldPointToFrame(transaction.frame, pointer);
  let scaleX = handleRatio.x === 0.5 ? 1 : (pointerInFrame.x - fixed.x) / (handleStart.x - fixed.x);
  let scaleY = handleRatio.y === 0.5 ? 1 : (pointerInFrame.y - fixed.y) / (handleStart.y - fixed.y);
  scaleX = Math.max(0.01, scaleX);
  scaleY = Math.max(0.01, scaleY);
  if (lockAspectRatio) {
    const uniformScale = handleRatio.x === 0.5
      ? scaleY
      : handleRatio.y === 0.5
        ? scaleX
        : Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
    scaleX = uniformScale;
    scaleY = uniformScale;
  }

  const fixedWorld = framePointToWorld(transaction.frame, fixed);
  const nextOriginOffset = rotateVector({ x: -fixed.x * scaleX, y: -fixed.y * scaleY }, transaction.frame.rotation);
  const previewFrame: SelectionFrame = {
    origin: { x: fixedWorld.x + nextOriginOffset.x, y: fixedWorld.y + nextOriginOffset.y },
    width: transaction.frame.width * scaleX,
    height: transaction.frame.height * scaleY,
    rotation: transaction.frame.rotation,
  };
  const preview = transaction.roots.map((start) => {
    const element = elementMap.get(start.id);
    if (!element) return { ...start };
    const pivotInFrame = worldPointToFrame(transaction.frame, start.worldPivot);
    const pivotOffset = rotateVector({
      x: (pivotInFrame.x - fixed.x) * scaleX,
      y: (pivotInFrame.y - fixed.y) * scaleY,
    }, transaction.frame.rotation);
    const worldPivot = { x: fixedWorld.x + pivotOffset.x, y: fixedWorld.y + pivotOffset.y };
    const localDelta = worldDeltaToElementParent(element, elements, {
      x: worldPivot.x - start.worldPivot.x,
      y: worldPivot.y - start.worldPivot.y,
    });
    return {
      ...start,
      x: snap(start.x + localDelta.x),
      y: snap(start.y + localDelta.y),
      width: Math.max(1, snap(start.width * scaleX)),
      height: Math.max(1, snap(start.height * scaleY)),
      worldPivot,
    };
  });
  return { ...transaction, preview, previewFrame };
}

function pointerAngle(center: CanvasPoint, pointer: CanvasPoint): number {
  return Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180 / Math.PI;
}

function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

export function createRotateTransaction(
  elements: Element[],
  selectedIds: string[],
  pointer: CanvasPoint,
  editorLayerGroupIds: Iterable<string> = [],
): RotateTransaction | null {
  const roots = createSnapshots(elements, selectedIds, editorLayerGroupIds);
  const frame = getSelectionFrame(elements, selectedIds, { editorLayerGroupIds });
  if (!frame || roots.length === 0) return null;
  const center = getFrameCenter(frame);
  return {
    kind: 'rotate',
    roots,
    preview: roots.map((item) => ({ ...item, worldPivot: { ...item.worldPivot } })),
    frame,
    previewFrame: frame,
    center,
    startPointerAngle: pointerAngle(center, pointer),
    angleDelta: 0,
  };
}

export function previewRotateTransaction(
  transaction: RotateTransaction,
  elements: Element[],
  pointer: CanvasPoint,
  snapToSteps: boolean,
): RotateTransaction {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  let angleDelta = normalizeAngle(pointerAngle(transaction.center, pointer) - transaction.startPointerAngle);
  if (snapToSteps) {
    angleDelta = Math.round(angleDelta / 15) * 15;
  } else {
    const targetFrameAngle = transaction.frame.rotation + angleDelta;
    const nearestRightAngle = Math.round(targetFrameAngle / 90) * 90;
    if (Math.abs(normalizeAngle(targetFrameAngle - nearestRightAngle)) <= 4) {
      angleDelta = nearestRightAngle - transaction.frame.rotation;
    }
  }
  const preview = transaction.roots.map((start) => {
    const element = elementMap.get(start.id);
    if (!element) return { ...start };
    const worldPivot = rotatePoint(start.worldPivot, transaction.center, angleDelta);
    const localDelta = worldDeltaToElementParent(element, elements, {
      x: worldPivot.x - start.worldPivot.x,
      y: worldPivot.y - start.worldPivot.y,
    });
    return {
      ...start,
      x: start.x + localDelta.x,
      y: start.y + localDelta.y,
      rotation: start.rotation + angleDelta,
      worldPivot,
    };
  });
  return {
    ...transaction,
    preview,
    previewFrame: {
      ...transaction.frame,
      origin: rotatePoint(transaction.frame.origin, transaction.center, angleDelta),
      rotation: transaction.frame.rotation + angleDelta,
    },
    angleDelta,
  };
}

export function transactionHasChanges(transaction: CanvasTransformTransaction): boolean {
  return transaction.preview.some((preview) => {
    const start = transaction.roots.find((item) => item.id === preview.id);
    return start && (
      Math.abs(start.x - preview.x) > 0.000001
      || Math.abs(start.y - preview.y) > 0.000001
      || Math.abs(start.width - preview.width) > 0.000001
      || Math.abs(start.height - preview.height) > 0.000001
      || Math.abs(start.rotation - preview.rotation) > 0.000001
    );
  });
}
