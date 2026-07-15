import type { Element } from '../types';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

const IDENTITY_MATRIX: Matrix2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    tx: left.a * right.tx + left.c * right.ty + left.tx,
    ty: left.b * right.tx + left.d * right.ty + left.ty,
  };
}

function getLocalMatrix(element: Element): Matrix2D {
  const props = element.props as Record<string, unknown>;
  const pivotX = Number(props.anchorX ?? 0) * element.width;
  const pivotY = Number(props.anchorY ?? 0) * element.height;
  const radians = (element.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    tx: element.x - cos * pivotX + sin * pivotY,
    ty: element.y - sin * pivotX - cos * pivotY,
  };
}

function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 0.0000001) return null;
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    tx: (matrix.c * matrix.ty - matrix.d * matrix.tx) / determinant,
    ty: (matrix.b * matrix.tx - matrix.a * matrix.ty) / determinant,
  };
}

export function transformPoint(matrix: Matrix2D, point: CanvasPoint): CanvasPoint {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
    y: matrix.b * point.x + matrix.d * point.y + matrix.ty,
  };
}

export function getElementWorldMatrix(element: Element, elements: Element[]): Matrix2D {
  const elementMap = new Map(elements.map((item) => [item.id, item]));
  const chain: Element[] = [];
  const visited = new Set<string>();
  let current: Element | undefined = element;
  while (current && !visited.has(current.id)) {
    chain.unshift(current);
    visited.add(current.id);
    current = current.parentId ? elementMap.get(current.parentId) : undefined;
  }
  return chain.reduce(
    (matrix, item) => multiplyMatrix(matrix, getLocalMatrix(item)),
    IDENTITY_MATRIX,
  );
}

export function getElementWorldCorners(element: Element, elements: Element[]): CanvasPoint[] {
  const matrix = getElementWorldMatrix(element, elements);
  return [
    transformPoint(matrix, { x: 0, y: 0 }),
    transformPoint(matrix, { x: element.width, y: 0 }),
    transformPoint(matrix, { x: element.width, y: element.height }),
    transformPoint(matrix, { x: 0, y: element.height }),
  ];
}

export function getPointsBounds(points: CanvasPoint[]): CanvasRect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

export function getElementWorldBounds(element: Element, elements: Element[]): CanvasRect {
  return getPointsBounds(getElementWorldCorners(element, elements));
}

export function isPointInsideElement(point: CanvasPoint, element: Element, elements: Element[]): boolean {
  const inverse = invertMatrix(getElementWorldMatrix(element, elements));
  if (!inverse) return false;
  const local = transformPoint(inverse, point);
  return local.x >= 0 && local.x <= element.width && local.y >= 0 && local.y <= element.height;
}

function orientation(a: CanvasPoint, b: CanvasPoint, c: CanvasPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointOnSegment(point: CanvasPoint, start: CanvasPoint, end: CanvasPoint): boolean {
  return Math.abs(orientation(start, end, point)) < 0.000001
    && point.x >= Math.min(start.x, end.x) - 0.000001
    && point.x <= Math.max(start.x, end.x) + 0.000001
    && point.y >= Math.min(start.y, end.y) - 0.000001
    && point.y <= Math.max(start.y, end.y) + 0.000001;
}

function segmentsIntersect(a1: CanvasPoint, a2: CanvasPoint, b1: CanvasPoint, b2: CanvasPoint): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  if ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)) return true;
  return pointOnSegment(b1, a1, a2)
    || pointOnSegment(b2, a1, a2)
    || pointOnSegment(a1, b1, b2)
    || pointOnSegment(a2, b1, b2);
}

function isPointInsideRect(point: CanvasPoint, rect: CanvasRect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function isElementInsideRect(element: Element, elements: Element[], rect: CanvasRect): boolean {
  return getElementWorldCorners(element, elements).every((point) => isPointInsideRect(point, rect));
}

export function doesElementIntersectRect(element: Element, elements: Element[], rect: CanvasRect): boolean {
  const polygon = getElementWorldCorners(element, elements);
  if (polygon.some((point) => isPointInsideRect(point, rect))) return true;
  const rectPoints = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  if (rectPoints.some((point) => isPointInsideElement(point, element, elements))) return true;
  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex++) {
    const polygonNext = (polygonIndex + 1) % polygon.length;
    for (let rectIndex = 0; rectIndex < rectPoints.length; rectIndex++) {
      const rectNext = (rectIndex + 1) % rectPoints.length;
      if (segmentsIntersect(polygon[polygonIndex], polygon[polygonNext], rectPoints[rectIndex], rectPoints[rectNext])) return true;
    }
  }
  return false;
}

function getParentWorldMatrix(element: Element, elements: Element[]): Matrix2D {
  if (!element.parentId) return IDENTITY_MATRIX;
  const parent = elements.find((item) => item.id === element.parentId);
  return parent ? getElementWorldMatrix(parent, elements) : IDENTITY_MATRIX;
}

export function worldDeltaToElementParent(
  element: Element,
  elements: Element[],
  delta: CanvasPoint,
): CanvasPoint {
  const parentMatrix = getParentWorldMatrix(element, elements);
  const determinant = parentMatrix.a * parentMatrix.d - parentMatrix.b * parentMatrix.c;
  if (Math.abs(determinant) < 0.0000001) return delta;
  return {
    x: (parentMatrix.d * delta.x - parentMatrix.c * delta.y) / determinant,
    y: (-parentMatrix.b * delta.x + parentMatrix.a * delta.y) / determinant,
  };
}

export function elementParentDeltaToWorld(
  element: Element,
  elements: Element[],
  delta: CanvasPoint,
): CanvasPoint {
  const parentMatrix = getParentWorldMatrix(element, elements);
  return {
    x: parentMatrix.a * delta.x + parentMatrix.c * delta.y,
    y: parentMatrix.b * delta.x + parentMatrix.d * delta.y,
  };
}
