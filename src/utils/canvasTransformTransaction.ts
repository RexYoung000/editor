import type { Element } from '../types';
import {
  elementParentDeltaToWorld,
  worldDeltaToElementParent,
  type CanvasPoint,
} from './canvasGeometry';
import { getTransformRootIds } from './canvasSelection';

export interface TransformSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MoveTransaction {
  primaryId: string;
  roots: TransformSnapshot[];
  preview: TransformSnapshot[];
  worldDelta: CanvasPoint;
}

export function createMoveTransaction(
  elements: Element[],
  selectedIds: string[],
  primaryId: string,
): MoveTransaction | null {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const rootIds = getTransformRootIds(elements, selectedIds);
  if (!rootIds.includes(primaryId)) return null;
  const roots = rootIds.flatMap((id) => {
    const element = elementMap.get(id);
    return element ? [{
      id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
    }] : [];
  });
  return { primaryId, roots, preview: roots.map((item) => ({ ...item })), worldDelta: { x: 0, y: 0 } };
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

  const preview = transaction.roots.map((start) => {
    const element = elementMap.get(start.id);
    if (!element) return { ...start };
    const localDelta = worldDeltaToElementParent(element, elements, worldDelta);
    return { ...start, x: start.x + localDelta.x, y: start.y + localDelta.y };
  });
  return { ...transaction, preview, worldDelta };
}

export function transactionHasChanges(transaction: MoveTransaction): boolean {
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
