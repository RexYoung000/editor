// Hit detection + coordinate helpers
// Visual selection boxes are DOM overlay (CanvasOverlay.tsx).
// Mouse conversion uses stage.mouseX/Y + _canvasTransform
// (CSS transform reset to none, but _canvasTransform tx/ty kept).

import type { LayaAny } from './core';
import type { Course, Element } from '../../types';
import { laya, objects, getWorldTransform, setHideSelectionBox } from './core';
import { findActiveElementPage } from '../internalPages';

function getAbsoluteWorldRect(el: Element, allElements: Element[]) {
  let absX = el.x, absY = el.y;
  let cur = el;
  const map = new Map(allElements.map(e => [e.id, e]));
  while (cur.parentId) {
    const parent = map.get(cur.parentId);
    if (!parent) break;
    absX += parent.x;
    absY += parent.y;
    cur = parent;
  }
  const elProps = el.props as Record<string, unknown>;
  const anchorX = Number(elProps.anchorX ?? 0);
  const anchorY = Number(elProps.anchorY ?? 0);
  if (anchorX || anchorY) {
    absX -= anchorX * el.width;
    absY -= anchorY * el.height;
  }
  return { x: absX, y: absY, w: el.width, h: el.height };
}

type EditorStateSnapshot = {
  currentCourse: Course | null;
  currentSubPageId: string | null;
  currentInternalPageId: string | null;
  selectedElementIds: string[];
};

type EditorStoreAccess = EditorStateSnapshot | { getState: () => EditorStateSnapshot };

export type EditorCallbacks = {
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMarqueeStart: (wx: number, wy: number) => void;
  getStore: () => EditorStoreAccess;
  /** DOM host element — available for external callers that need hostRect */
  getHostElement: () => HTMLElement | null;
};

let _editorCb: EditorCallbacks | null = null;
let _stageMouseDownHandler: ((e: LayaAny) => void) | null = null;
let _overlayHandling = false;

export function editorCb(): EditorCallbacks | null { return _editorCb; }
export function setEditorCb(cb: EditorCallbacks | null): void { _editorCb = cb; }

/** overlay 正在处理鼠标事件时设置此标志，阻止 Laya stage handler 抢夺选中 */
export function setOverlayHandling(v: boolean): void { _overlayHandling = v; }

// ─── Coordinate helpers ───

export function clientToWorld(
  clientX: number, clientY: number,
  hostRect: DOMRect,
  panX: number, panY: number, zoom: number,
) {
  const sx = clientX - hostRect.left;
  const sy = clientY - hostRect.top;
  return { wx: (sx - panX) / zoom, wy: (sy - panY) / zoom };
}

export function worldRectToScreen(
  x: number, y: number, w: number, h: number,
  panX: number, panY: number, zoom: number,
) {
  const px = panX || 0, py = panY || 0, z = zoom || 0.1;
  return {
    left: x * z + px,
    top: y * z + py,
    width: w * z,
    height: h * z,
  };
}

// ─── Hit detection via Laya stage mousedown ───

export function initEditorInteraction(cb: EditorCallbacks): void {
  _editorCb = cb;
  const L = laya();
  if (!L?.stage) { console.warn('[forge] initEditorInteraction: no stage'); return; }

  if (_stageMouseDownHandler) {
    L.stage.off('mousedown', null, _stageMouseDownHandler);
    _stageMouseDownHandler = null;
  }

  const _objs = objects();

  _stageMouseDownHandler = (e: LayaAny) => {
    // overlay 正在处理拖拽/选中时，跳过 stage 的命中检测
    if (_overlayHandling) return;
    const wt = getWorldTransform();

    // Use native DOM MouseEvent clientX/clientY for coordinate conversion.
    // This is consistent with clientToWorld used by the DOM overlay,
    // and avoids _canvasTransform inconsistencies (DPR, stale tx/ty offsets).
    const hostEl = _editorCb?.getHostElement?.();
    const hostRect = hostEl?.getBoundingClientRect();
    const nativeEvt = e.nativeEvent as MouseEvent | undefined;
    let wx: number, wy: number;

    if (nativeEvt && hostRect) {
      const c2w = clientToWorld(nativeEvt.clientX, nativeEvt.clientY, hostRect, wt.panX, wt.panY, wt.zoom);
      wx = c2w.wx;
      wy = c2w.wy;
    } else {
      // Fallback: reverse _canvasTransform (less reliable)
      const ct = L?.stage?._canvasTransform;
      const sx = (L?.stage?.mouseX ?? 0) * (ct?.a ?? 1) + (ct?.tx ?? 0) - (hostRect?.left ?? 0);
      const sy = (L?.stage?.mouseY ?? 0) * (ct?.d ?? 1) + (ct?.ty ?? 0) - (hostRect?.top ?? 0);
      wx = (sx - wt.panX) / wt.zoom;
      wy = (sy - wt.panY) / wt.zoom;
    }

    // 收集当前选中元素的所有祖先 ID（点击祖先容器不应抢夺子元素的选中）
    const ancestorIds = new Set<string>();
    let selectableIds: Set<string> | null = null;
    const store = _editorCb?.getStore?.();
    if (store) {
      const state = 'getState' in store ? store.getState() : store;
      const page = findActiveElementPage(
        state.currentCourse,
        state.currentSubPageId,
        state.currentInternalPageId,
      );
      if (page) {
        selectableIds = new Set(page.elements.map((element) => element.id));
        if (_overlayHandling) return;

        const selectedIds = state.selectedElementIds || [];
        if (selectedIds.length === 1) {
          const selectedEl = page.elements.find(e => e.id === selectedIds[0]);
          if (selectedEl) {
            const elMap = new Map(page.elements.map(e => [e.id, e]));
            let cur = selectedEl.parentId ? elMap.get(selectedEl.parentId) : undefined;
            while (cur) {
              ancestorIds.add(cur.id);
              cur = cur.parentId ? elMap.get(cur.parentId) : undefined;
            }
          }
        }

        // 倒序循环 flat 数组，第一个命中的就是 z-order 最高的（数组末尾 = 视觉最上层）
        const CANVAS_WIDTH = 1920;
        const CANVAS_HEIGHT = 1080;
        for (let i = page.elements.length - 1; i >= 0; i--) {
          const el = page.elements[i];
          const elProps = el.props as Record<string, unknown>;
          if (elProps._editorHidden === true) continue;
          if (ancestorIds.has(el.id)) continue;
          const abs = getAbsoluteWorldRect(el, page.elements);
          if (wx >= abs.x && wx <= abs.x + abs.w && wy >= abs.y && wy <= abs.y + abs.h) {
            // 元素被命中，但需要检查点击位置是否在画布内
            // 只有点击位置在画布内时才选中元素（防止点击画布外误选画布内的全屏元素）
            if (wx >= 0 && wx <= CANVAS_WIDTH && wy >= 0 && wy <= CANVAS_HEIGHT) {
              _editorCb?.onSelect(el.id);
              return;
            }
          }
        }
      }
    }

    // Laya sprite 命中回退：从 target 往上走，跳过祖先容器
    let node: LayaAny = e.target;
    while (node && node !== L.stage) {
      for (const [id, obj] of _objs) {
        if (obj === node) {
          if (selectableIds && !selectableIds.has(id)) continue;
          if (ancestorIds.has(id)) return;
          _editorCb?.onSelect(id);
          return;
        }
      }
      node = node.parent;
    }

    // 3) 空白区域 → deselect + 通知 overlay 开始框选
    _editorCb?.onDeselect();
    _editorCb?.onMarqueeStart(wx, wy);
  };
  L.stage.on('mousedown', null, _stageMouseDownHandler);
}

// ─── Cleanup ───

export function cleanupEditorInteraction(): void {
  const L = laya();
  if (_stageMouseDownHandler) {
    L?.stage?.off('mousedown', null, _stageMouseDownHandler);
    _stageMouseDownHandler = null;
  }
  _editorCb = null;
}

// core.ts removeObject 仍调用 _hideSelectionBox，设置 noop 避免报错
setHideSelectionBox(() => {});
