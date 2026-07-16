import { setHideSelectionBox } from './core';

export function clientToWorld(
  clientX: number,
  clientY: number,
  hostRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number,
) {
  const screenX = clientX - hostRect.left;
  const screenY = clientY - hostRect.top;
  return {
    wx: (screenX - panX) / zoom,
    wy: (screenY - panY) / zoom,
  };
}

export function worldRectToScreen(
  x: number,
  y: number,
  width: number,
  height: number,
  panX: number,
  panY: number,
  zoom: number,
) {
  const safePanX = panX || 0;
  const safePanY = panY || 0;
  const safeZoom = zoom || 0.1;
  return {
    left: x * safeZoom + safePanX,
    top: y * safeZoom + safePanY,
    width: width * safeZoom,
    height: height * safeZoom,
  };
}

// core.ts 删除对象时仍会调用该钩子；选框现由 React Overlay 生命周期管理。
setHideSelectionBox(() => {});
