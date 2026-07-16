export type CanvasViewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export type ViewportPoint = { x: number; y: number };

export const MIN_CANVAS_ZOOM = 0.1;
export const MAX_CANVAS_ZOOM = 2;
export const CANVAS_ZOOM_BUTTON_STEP = 0.05;
export const CANVAS_FIT_PADDING = 24;
export const CANVAS_MIN_VISIBLE_PX = 48;

const WHEEL_LINE_PX = 16;
const MAX_WHEEL_DELTA_PX = 80;
const WHEEL_ZOOM_SENSITIVITY = 0.001;

export function clampCanvasZoom(zoom: number): number {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom));
}

export function normalizeWheelDelta(delta: number, deltaMode: number, viewportExtent: number): number {
  const pixels = deltaMode === 1
    ? delta * WHEEL_LINE_PX
    : deltaMode === 2
      ? delta * viewportExtent
      : delta;
  return Math.max(-MAX_WHEEL_DELTA_PX, Math.min(MAX_WHEEL_DELTA_PX, pixels));
}

export function zoomViewportAtPoint(
  viewport: CanvasViewport,
  nextZoom: number,
  anchor: ViewportPoint,
): CanvasViewport {
  const zoom = clampCanvasZoom(nextZoom);
  if (zoom === viewport.zoom) return viewport;
  const worldX = (anchor.x - viewport.panX) / viewport.zoom;
  const worldY = (anchor.y - viewport.panY) / viewport.zoom;
  return {
    zoom,
    panX: anchor.x - worldX * zoom,
    panY: anchor.y - worldY * zoom,
  };
}

export function zoomViewportByWheel(
  viewport: CanvasViewport,
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
  anchor: ViewportPoint,
): CanvasViewport {
  const delta = normalizeWheelDelta(deltaY, deltaMode, viewportHeight);
  const nextZoom = viewport.zoom * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
  return zoomViewportAtPoint(viewport, nextZoom, anchor);
}

export function panViewportByWheel(
  viewport: CanvasViewport,
  deltaX: number,
  deltaY: number,
  deltaMode: number,
  viewportWidth: number,
  viewportHeight: number,
  horizontalFromShift = false,
): CanvasViewport {
  const x = normalizeWheelDelta(deltaX, deltaMode, viewportWidth);
  const y = normalizeWheelDelta(deltaY, deltaMode, viewportHeight);
  return {
    ...viewport,
    panX: viewport.panX - (horizontalFromShift && x === 0 ? y : x),
    panY: viewport.panY - (horizontalFromShift ? 0 : y),
  };
}

export function fitCanvasViewport(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = CANVAS_FIT_PADDING,
): CanvasViewport {
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const zoom = clampCanvasZoom(Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight));
  return {
    zoom,
    panX: (viewportWidth - canvasWidth * zoom) / 2,
    panY: (viewportHeight - canvasHeight * zoom) / 2,
  };
}

export function constrainViewportToWorkspace(
  viewport: CanvasViewport,
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  minVisible = CANVAS_MIN_VISIBLE_PX,
): CanvasViewport {
  const contentWidth = canvasWidth * viewport.zoom;
  const contentHeight = canvasHeight * viewport.zoom;
  const constrainAxis = (pan: number, viewportLength: number, contentLength: number) => {
    const visibleLength = Math.min(minVisible, contentLength, viewportLength);
    const minPan = visibleLength - contentLength;
    const maxPan = viewportLength - visibleLength;
    return Math.min(maxPan, Math.max(minPan, pan));
  };
  return {
    ...viewport,
    panX: constrainAxis(viewport.panX, viewportWidth, contentWidth),
    panY: constrainAxis(viewport.panY, viewportHeight, contentHeight),
  };
}
