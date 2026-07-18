export type LayerPanelMode = 'bottom' | 'left' | 'right' | 'floating';

export interface LayerPanelLayoutState {
  mode: LayerPanelMode;
  open: boolean;
  bottomHeight: number;
  sideWidth: number;
  floating: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LayerPanelBounds {
  width: number;
  height: number;
}

export interface LayerPanelSnapGeometry {
  sidebarRight: number;
  propertyLeft: number;
  workspaceHeight: number;
}

export const LAYER_PANEL_LAYOUT_STORAGE_KEY = 'forge:layer-panel-layout';
export const LAYER_PANEL_HEADER_SIZE = 36;
export const LAYER_PANEL_MIN_FLOAT_WIDTH = 240;
export const LAYER_PANEL_MIN_FLOAT_HEIGHT = 180;
export const LAYER_PANEL_MIN_SIDE_WIDTH = 240;
export const LAYER_PANEL_MAX_SIDE_WIDTH = 420;
export const LAYER_PANEL_MIN_BOTTOM_HEIGHT = 140;
export const LAYER_PANEL_MAX_BOTTOM_HEIGHT = 420;

export const DEFAULT_LAYER_PANEL_LAYOUT: LayerPanelLayoutState = {
  mode: 'bottom',
  open: true,
  bottomHeight: 224,
  sideWidth: 280,
  floating: {
    x: 280,
    y: 72,
    width: 300,
    height: 360,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function normalizeLayerPanelLayout(value: unknown): LayerPanelLayoutState {
  if (!isRecord(value)) return structuredClone(DEFAULT_LAYER_PANEL_LAYOUT);
  const mode = value.mode;
  const floating = isRecord(value.floating) ? value.floating : {};
  return {
    mode: mode === 'bottom' || mode === 'left' || mode === 'right' || mode === 'floating'
      ? mode
      : DEFAULT_LAYER_PANEL_LAYOUT.mode,
    open: typeof value.open === 'boolean' ? value.open : DEFAULT_LAYER_PANEL_LAYOUT.open,
    bottomHeight: clamp(
      finiteNumber(value.bottomHeight, DEFAULT_LAYER_PANEL_LAYOUT.bottomHeight),
      LAYER_PANEL_MIN_BOTTOM_HEIGHT,
      LAYER_PANEL_MAX_BOTTOM_HEIGHT,
    ),
    sideWidth: clamp(
      finiteNumber(value.sideWidth, DEFAULT_LAYER_PANEL_LAYOUT.sideWidth),
      LAYER_PANEL_MIN_SIDE_WIDTH,
      LAYER_PANEL_MAX_SIDE_WIDTH,
    ),
    floating: {
      x: finiteNumber(floating.x, DEFAULT_LAYER_PANEL_LAYOUT.floating.x),
      y: finiteNumber(floating.y, DEFAULT_LAYER_PANEL_LAYOUT.floating.y),
      width: Math.max(LAYER_PANEL_MIN_FLOAT_WIDTH, finiteNumber(floating.width, DEFAULT_LAYER_PANEL_LAYOUT.floating.width)),
      height: Math.max(LAYER_PANEL_MIN_FLOAT_HEIGHT, finiteNumber(floating.height, DEFAULT_LAYER_PANEL_LAYOUT.floating.height)),
    },
  };
}

export function constrainFloatingLayerPanel(
  floating: LayerPanelLayoutState['floating'],
  bounds: LayerPanelBounds,
): LayerPanelLayoutState['floating'] {
  const availableWidth = Math.max(0, bounds.width);
  const availableHeight = Math.max(0, bounds.height);
  const width = Math.min(
    Math.max(Math.min(LAYER_PANEL_MIN_FLOAT_WIDTH, availableWidth), floating.width),
    availableWidth,
  );
  const height = Math.min(
    Math.max(Math.min(LAYER_PANEL_MIN_FLOAT_HEIGHT, availableHeight), floating.height),
    availableHeight,
  );
  return {
    x: clamp(floating.x, 0, availableWidth - width),
    y: clamp(floating.y, 0, availableHeight - height),
    width,
    height,
  };
}

export function constrainSideWidth(sideWidth: number, availableWidth: number): number {
  const usableWidth = Math.max(LAYER_PANEL_HEADER_SIZE, availableWidth);
  const minimum = Math.min(LAYER_PANEL_MIN_SIDE_WIDTH, usableWidth);
  return clamp(sideWidth, minimum, Math.min(LAYER_PANEL_MAX_SIDE_WIDTH, usableWidth));
}

export function constrainBottomHeight(bottomHeight: number, availableHeight: number): number {
  const usableHeight = Math.max(LAYER_PANEL_HEADER_SIZE, availableHeight);
  const minimum = Math.min(LAYER_PANEL_MIN_BOTTOM_HEIGHT, usableHeight);
  return clamp(bottomHeight, minimum, Math.min(LAYER_PANEL_MAX_BOTTOM_HEIGHT, usableHeight));
}

export function resolveLayerPanelSnap(
  pointer: { x: number; y: number },
  geometry: LayerPanelSnapGeometry,
  threshold = 24,
): Exclude<LayerPanelMode, 'floating'> | null {
  const nearSidebar = pointer.x <= geometry.sidebarRight + threshold
    && pointer.x >= -threshold;
  if (nearSidebar && pointer.y >= geometry.workspaceHeight - Math.max(72, threshold * 3)) {
    return 'bottom';
  }
  if (Math.abs(pointer.x - geometry.sidebarRight) <= threshold) return 'left';
  if (Math.abs(pointer.x - geometry.propertyLeft) <= threshold) return 'right';
  return null;
}
