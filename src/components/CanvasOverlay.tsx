// DOM overlay for selection boxes, handles, marquee, inline editing.
// All visual selection UI is screen-pixel sized (not scaled by zoom).

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Element } from '../types';
import { useEditorStore } from '../store/editorStore';
import { getObject } from '../utils/layaBridge';
import { clientToWorld, worldRectToScreen, setOverlayHandling } from '../utils/laya/selection';
import { resolveElementFont } from '../utils/fontLoader';

const HANDLE_SIZE = 10;
// 容器型元素：即使在 z 序更顶层也不抢选中（避免全屏容器压住具体元素）
const CONTAINER_TYPES = new Set(['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox']);
const HANDLE_DEFS = [
  { id: 'nw', rx: 0,   ry: 0,   cursor: 'nw-resize' },
  { id: 'n',  rx: 0.5, ry: 0,   cursor: 'n-resize' },
  { id: 'ne', rx: 1,   ry: 0,   cursor: 'ne-resize' },
  { id: 'e',  rx: 1,   ry: 0.5, cursor: 'e-resize' },
  { id: 'se', rx: 1,   ry: 1,   cursor: 'se-resize' },
  { id: 's',  rx: 0.5, ry: 1,   cursor: 's-resize' },
  { id: 'sw', rx: 0,   ry: 1,   cursor: 'sw-resize' },
  { id: 'w',  rx: 0,   ry: 0.5, cursor: 'w-resize' },
];

interface WorldState {
  zoom: number;
  panX: number;
  panY: number;
}

interface MarqueeState {
  startWX: number;
  startWY: number;
  endWX: number;
  endWY: number;
}

type DragState = {
  corner: string | null;
  startWX: number;
  startWY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  elementId: string;
  // 拖拽期间各元素的起始位置（用于 batch commit）
  startPositions: Map<string, { x: number; y: number; w: number; h: number }>;
};

// ─── helper: absolute world rect for nested elements ───

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
  // anchorX/Y 使 Laya 组件的 (x,y) 为锚点位置而非左上角，包围框需偏移补偿
  const props = el.props as Record<string, unknown>;
  const anchorX = Number(props.anchorX ?? 0);
  const anchorY = Number(props.anchorY ?? 0);
  if (anchorX || anchorY) {
    absX -= anchorX * el.width;
    absY -= anchorY * el.height;
  }
  return { x: absX, y: absY, w: el.width, h: el.height };
}

// ─── component ───

interface CanvasOverlayProps {
  layaHostRef: React.RefObject<HTMLDivElement | null>;
  world: WorldState;
  selectedIds: string[];
  currentPage: { elements: Element[] } | null;
  editingElement: Element | null;
  snap: (v: number) => number;
  /** Laya calls onMarqueeStart when clicking empty space — overlay starts tracking */
  marqueeStart: { wx: number; wy: number } | null;
  onMarqueeComplete: (ids: string[]) => void;
  setEditingId: (id: string | null) => void;
}

export default function CanvasOverlay({
  layaHostRef, world, selectedIds, currentPage, editingElement, snap,
  marqueeStart, onMarqueeComplete, setEditingId,
}: CanvasOverlayProps) {
  const dragRef = useRef<DragState | null>(null);
  const [localMarquee, setLocalMarquee] = useState<MarqueeState | null>(null);
  const localMarqueeRef = useRef(localMarquee);
  useEffect(() => { localMarqueeRef.current = localMarquee; }, [localMarquee]);

  // 拖拽期间的偏移量，用于更新选框位置而不触发 store 重渲染
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number; dw?: number; dh?: number } | null>(null);
  const dragOffsetRef = useRef(dragOffset);
  useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);

  const worldRef = useRef(world);
  useEffect(() => { worldRef.current = world; }, [world]);

  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const snapRef = useRef(snap);
  useEffect(() => { snapRef.current = snap; }, [snap]);

  const [overlayFontFamily, setOverlayFontFamily] = useState<string>('FZLanTingHei');
  useEffect(() => {
    if (!editingElement || editingElement.type !== 'NewTextArea') {
      setOverlayFontFamily('FZLanTingHei');
      return;
    }
    const courseId = useEditorStore.getState().currentCourse?.id ?? '';
    if (!courseId) return;
    const p = (editingElement.props ?? {}) as Record<string, unknown>;
    const fontLocalPath = (p.fontLocalPath as string | undefined) ?? '';
    const fontLibraryId = (p.fontLibraryId as string | undefined) ?? '';
    resolveElementFont(courseId, fontLocalPath, fontLibraryId)
      .then(setOverlayFontFamily)
      .catch(() => setOverlayFontFamily('FZLanTingHei'));
  }, [editingElement]);

  // ─── marquee start signal from Laya ───
  useEffect(() => {
    if (!marqueeStart) return;
    setLocalMarquee({
      startWX: marqueeStart.wx,
      startWY: marqueeStart.wy,
      endWX: marqueeStart.wx,
      endWY: marqueeStart.wy,
    });
  }, [marqueeStart]);

  // ─── drag: mousedown on border / handle ───
  const startDrag = useCallback((e: React.MouseEvent, corner: string | null, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setOverlayHandling(true);
    const el = currentPage?.elements.find(e2 => e2.id === elementId);
    if (!el) return;
    const hostRect = layaHostRef.current!.getBoundingClientRect();
    const { wx, wy } = clientToWorld(e.clientX, e.clientY, hostRect, world.panX, world.panY, world.zoom);
    // 记录所有参与拖拽元素的起始位置
    const startPositions = new Map<string, { x: number; y: number; w: number; h: number }>();
    const store = useEditorStore.getState();
    const selected = store.selectedElementIds;
    const page = currentPage;
    if (selected.length > 1 && selected.includes(elementId) && page) {
      selected.forEach(sid => {
        const selEl = page.elements.find(e2 => e2.id === sid);
        if (selEl) startPositions.set(sid, { x: selEl.x, y: selEl.y, w: selEl.width, h: selEl.height });
      });
    } else {
      startPositions.set(elementId, { x: el.x, y: el.y, w: el.width, h: el.height });
    }
    dragRef.current = {
      corner,
      startWX: wx, startWY: wy,
      startX: el.x, startY: el.y,
      startW: el.width, startH: el.height,
      elementId,
      startPositions,
    };
  }, [currentPage, world, layaHostRef]);

  // ─── document-level mousemove/mouseup for drag + marquee ───
  useEffect(() => {
    const onDocMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const marquee = localMarqueeRef.current;

      if (drag) {
        const hostRect = layaHostRef.current!.getBoundingClientRect();
        const { wx, wy } = clientToWorld(e.clientX, e.clientY, hostRect, worldRef.current.panX, worldRef.current.panY, worldRef.current.zoom);
        const dx = wx - drag.startWX;
        const dy = wy - drag.startWY;
        const s = snapRef.current;
        const selected = selectedIdsRef.current;
        const page = currentPageRef.current;

        if (drag.corner === null) {
          // ── move: 只更新 Laya 对象位置 + dragOffset，不触发 store 重渲染 ──
          const nx = s(drag.startX + dx), ny = s(drag.startY + dy);
          const mainObj = getObject(drag.elementId);
          if (mainObj) { mainObj.x = nx; mainObj.y = ny; }

          if (selected.length > 1 && selected.includes(drag.elementId) && page) {
            const dragStart = drag.startPositions.get(drag.elementId);
            if (!dragStart) return;
            const dxTotal = nx - dragStart.x, dyTotal = ny - dragStart.y;
            selected.forEach(sid => {
              if (sid === drag.elementId) return;
              const start = drag.startPositions.get(sid);
              if (!start) return;
              const nx2 = start.x + dxTotal, ny2 = start.y + dyTotal;
              const obj = getObject(sid);
              if (obj) { obj.x = nx2; obj.y = ny2; }
            });
          }
          // 更新选框偏移（用 setState 让 DOM 跟随，但不触发 store）
          setDragOffset({ dx: nx - drag.startX, dy: ny - drag.startY });
        } else {
          // ── resize: 只更新 Laya 对象 + dragOffset ──
          let x = drag.startX, y = drag.startY;
          let w = drag.startW, h = drag.startH;
          const c = drag.corner;
          if (c.includes('e')) w = Math.max(20, drag.startW + dx);
          if (c.includes('w')) { w = Math.max(20, drag.startW - dx); x = drag.startX + (drag.startW - w); }
          if (c.includes('s')) h = Math.max(20, drag.startH + dy);
          if (c.includes('n')) { h = Math.max(20, drag.startH - dy); y = drag.startY + (drag.startH - h); }
          x = s(x); y = s(y); w = s(w); h = s(h);
          const obj = getObject(drag.elementId);
          if (obj) { obj.x = x; obj.y = y; obj.width = w; obj.height = h; }
          setDragOffset({ dx: x - drag.startX, dy: y - drag.startY, dw: w - drag.startW, dh: h - drag.startH });
        }
        return;
      }

      if (marquee) {
        const hostRect = layaHostRef.current!.getBoundingClientRect();
        const { wx, wy } = clientToWorld(e.clientX, e.clientY, hostRect, worldRef.current.panX, worldRef.current.panY, worldRef.current.zoom);
        setLocalMarquee({ ...marquee, endWX: wx, endWY: wy });
        return;
      }
    };

    const onDocMouseUp = () => {
      setOverlayHandling(false);
      const drag = dragRef.current;
      if (drag) {
        dragRef.current = null;
        setDragOffset(null);
        // batch commit: 一次性把所有元素最终位置写入 store
        const store = useEditorStore.getState();
        const selected = store.selectedElementIds;
        const page = currentPageRef.current;
        if (drag.corner === null) {
          // move — 从 Laya 对象读取最终位置
          if (selected.length > 1 && selected.includes(drag.elementId) && page) {
            selected.forEach(sid => {
              const obj = getObject(sid);
              if (obj) {
                store.updateElement(sid, { x: obj.x, y: obj.y });
              }
              // 翻页图片：同步画布位置到当前页
              const selEl = page.elements.find(e => e.id === sid);
              if (selEl && selEl.type === 'PageTurnImage') {
                const props = selEl.props as { pages?: Array<{ x: number; y: number }>; currentPageIndex?: number };
                const pages = [...(props.pages ?? [])];
                const idx = props.currentPageIndex ?? 0;
                if (idx >= 0 && idx < pages.length && obj) {
                  pages[idx] = { ...pages[idx], x: obj.x, y: obj.y };
                  store.updateElement(sid, { props: { ...selEl.props, pages } });
                }
              }
            });
          } else {
            const obj = getObject(drag.elementId);
            if (obj) {
              store.updateElement(drag.elementId, { x: obj.x, y: obj.y });
            }
            // 翻页图片：同步画布位置到当前页
            const dragEl = page?.elements.find(e => e.id === drag.elementId);
            if (dragEl && dragEl.type === 'PageTurnImage') {
              const props = dragEl.props as { pages?: Array<{ x: number; y: number }>; currentPageIndex?: number };
              const pages = [...(props.pages ?? [])];
              const idx = props.currentPageIndex ?? 0;
              if (idx >= 0 && idx < pages.length && obj) {
                pages[idx] = { ...pages[idx], x: obj.x, y: obj.y };
                store.updateElement(drag.elementId, { props: { ...dragEl.props, pages } });
              }
            }
          }
        } else {
          // resize
          const obj = getObject(drag.elementId);
          if (obj) {
            store.updateElement(drag.elementId, { x: obj.x, y: obj.y, width: obj.width, height: obj.height });
          }
        }
        store.saveHistory();
        return;
      }
      if (localMarqueeRef.current) {
        const m = localMarqueeRef.current;
        const rx = Math.min(m.startWX, m.endWX);
        const ry = Math.min(m.startWY, m.endWY);
        const rw = Math.abs(m.endWX - m.startWX);
        const rh = Math.abs(m.endWY - m.startWY);
        const page = currentPageRef.current;
        const ids: string[] = [];
        if (rw > 4 && rh > 4 && page) {
          for (const el of page.elements) {
            const props = el.props as Record<string, unknown>;
            if (props._editorHidden === true) continue;
            const abs = getAbsoluteWorldRect(el, page.elements);
            if (abs.x < rx + rw && abs.x + abs.w > rx && abs.y < ry + rh && abs.y + abs.h > ry) {
              ids.push(el.id);
            }
          }
        }
        setLocalMarquee(null);
        onMarqueeComplete(ids);
        return;
      }
    };

    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    return () => {
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);
    };
  }, [layaHostRef, onMarqueeComplete]);

  // ─── render ───

  const elements = currentPage?.elements ?? [];
  const { zoom, panX, panY } = world;

  // single selection element
  const selectedElement = selectedIds.length === 1
    ? elements.find(e => e.id === selectedIds[0])
    : null;

  // multi-selection elements
  const multiElements = selectedIds.length > 1
    ? elements.filter(e => selectedIds.includes(e.id))
    : [];

  // group colors for multi-selection
  const groupColors = new Map<string, string>();
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  let colorIdx = 0;
  for (const el of multiElements) {
    if (el.groupId && !groupColors.has(el.groupId)) {
      groupColors.set(el.groupId, colors[colorIdx % colors.length]);
      colorIdx++;
    }
  }

  return (
    <div data-keep-selection style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {/* ── single selection: border + handles ── */}
      {/* 编辑播放 Video / 编辑 NewTextArea 时隐藏选择框，避免拦截视频控件/文本框事件 */}
      {selectedElement && !(editingElement && editingElement.id === selectedElement.id) && (() => {
        // 拖拽期间：用 store 原始位置 + dragOffset 计算选框位置，避免依赖 store 实时更新
        const abs = getAbsoluteWorldRect(selectedElement, elements);
        const ex = abs.x + (dragOffset?.dx ?? 0);
        const ey = abs.y + (dragOffset?.dy ?? 0);
        const ew = abs.w + (dragOffset?.dw ?? 0);
        const eh = abs.h + (dragOffset?.dh ?? 0);
        const rect = worldRectToScreen(ex, ey, ew, eh, panX, panY, zoom);
        const isLocked = selectedElement.locked;
        return (
          <div
            style={{
              position: 'absolute',
              left: rect.left, top: rect.top,
              width: rect.width, height: rect.height,
              border: isLocked ? '1px solid #f59e0b' : '1px solid #3b82f6',
              boxSizing: 'border-box',
              pointerEvents: isLocked ? 'none' : 'auto',
              cursor: isLocked ? 'default' : 'move',
            }}
            onMouseDown={(e) => {
              // 中键不启动拖拽，放行给 Canvas 做画布平移
              if (e.button !== 0) return;
              // 当前选中元素的选中框被点击：先看点击点是否落在数组更靠后（视觉更顶层）的某个非容器元素上，
              // 是 → 切选到那个元素；否 → 拖当前选中元素。
              // 容器（Box/KlInputBox 等）即使数组靠后也不参与，否则全屏容器会一直"压住"上面的小元素。
              const page = currentPage;
              if (page) {
                const hostRect = layaHostRef.current!.getBoundingClientRect();
                const { wx, wy } = clientToWorld(e.clientX, e.clientY, hostRect, world.panX, world.panY, world.zoom);
                const selectedIdx = page.elements.findIndex(e2 => e2.id === selectedElement.id);
                for (let i = page.elements.length - 1; i > selectedIdx; i--) {
                  const el = page.elements[i];
                  if (CONTAINER_TYPES.has(el.type)) continue;
                  const elProps = el.props as Record<string, unknown>;
                  if (elProps._editorHidden === true) continue;
                  const abs = getAbsoluteWorldRect(el, page.elements);
                  if (wx >= abs.x && wx <= abs.x + abs.w && wy >= abs.y && wy <= abs.y + abs.h) {
                    e.stopPropagation();
                    useEditorStore.getState().selectElement(el.id);
                    return;
                  }
                }
              }
              startDrag(e, null, selectedElement.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (selectedElement.type === 'NewTextArea' || selectedElement.type === 'Video') {
                setEditingId(selectedElement.id);
              }
            }}
          >
            {!isLocked && HANDLE_DEFS.map(def => (
              <div
                key={def.id}
                style={{
                  position: 'absolute',
                  left: def.rx * rect.width - HANDLE_SIZE / 2,
                  top: def.ry * rect.height - HANDLE_SIZE / 2,
                  width: HANDLE_SIZE, height: HANDLE_SIZE,
                  background: '#fff',
                  border: '2px solid #3b82f6',
                  cursor: def.cursor,
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                }}
                onMouseDown={(e) => { if (e.button === 0) startDrag(e, def.id, selectedElement.id); }}
              />
            ))}
          </div>
        );
      })()}

      {/* ── multi-selection: borders per element ── */}
      {multiElements.map(el => {
        const abs = getAbsoluteWorldRect(el, elements);
        const ex = abs.x + (dragOffset?.dx ?? 0);
        const ey = abs.y + (dragOffset?.dy ?? 0);
        const rect = worldRectToScreen(ex, ey, abs.w, abs.h, panX, panY, zoom);
        let borderColor = '#3b82f6';
        if (el.groupId && groupColors.has(el.groupId)) {
          borderColor = groupColors.get(el.groupId)!;
        }
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: rect.left, top: rect.top,
              width: rect.width, height: rect.height,
              border: '1.5px solid ' + borderColor,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* ── marquee rect ── */}
      {localMarquee && (() => {
        const startScreen = worldRectToScreen(localMarquee.startWX, localMarquee.startWY, 0, 0, panX, panY, zoom);
        const endScreen = worldRectToScreen(localMarquee.endWX, localMarquee.endWY, 0, 0, panX, panY, zoom);
        const left = Math.min(startScreen.left, endScreen.left);
        const top = Math.min(startScreen.top, endScreen.top);
        const width = Math.abs(endScreen.left - startScreen.left);
        const height = Math.abs(endScreen.top - startScreen.top);
        return (
          <div style={{
            position: 'absolute',
            left, top, width, height,
            border: '2px dashed #3b82f6',
            background: 'rgba(59, 130, 246, 0.12)',
            pointerEvents: 'none',
          }} />
        );
      })()}

      {/* ── inline editing textarea ── */}
      {editingElement && (() => {
        const p = (editingElement.props ?? {}) as Record<string, unknown>;
        const fontSize = (p.fontSize as number) ?? 16;
        const leading = (p.leading as number) ?? 0;
        const valign = (p.valign as string) ?? 'top';
        const sx = editingElement.x * zoom + panX;
        const sy = editingElement.y * zoom + panY;
        return (
          <div
            style={{
              position: 'absolute',
              left: sx, top: sy,
              width: editingElement.width * zoom,
              height: editingElement.height * zoom,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start',
              background: '#ffffff',
              border: '1px solid #3b82f6',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
            }}
          >
            <textarea
              autoFocus
              value={(p.text as string) ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => useEditorStore.getState().updateElement(editingElement.id, { props: { ...p, text: e.target.value } })}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => { setEditingId(null); useEditorStore.getState().saveHistory(); }}
              style={{
                width: '100%',
                flexShrink: 0,
                maxHeight: '100%',
                margin: 0, padding: 0,
                border: 'none', outline: 'none',
                background: 'transparent',
                resize: 'none',
                overflow: 'auto',
                fontFamily: `"${overlayFontFamily}"`,
                fontSize,
                lineHeight: `${fontSize + leading}px`,
                color: (p.color as string) ?? '#333',
                textAlign: ((p.align as 'left' | 'center' | 'right') ?? 'left'),
                whiteSpace: p.wordWrap === false ? 'pre' : 'pre-wrap',
                wordBreak: p.wordWrap === false ? 'normal' : 'break-word',
              }}
            />
          </div>
        );
      })()}

      {/* ── video playback overlay ── */}
      {editingElement && editingElement.type === 'Video' && (() => {
        const p = (editingElement.props ?? {}) as Record<string, unknown>;
        const videoUrl = (p.videoUrl as string) ?? '';
        if (!videoUrl) return null;
        // Resolve video URL: Electron forge-local protocol or relative path
        const courseId = useEditorStore.getState().currentCourse?.id ?? '';
        const src = `forge-local://${courseId}/${videoUrl}`;
        const sx = editingElement.x * zoom + panX;
        const sy = editingElement.y * zoom + panY;
        return (
          <div
            style={{
              position: 'absolute',
              left: sx, top: sy,
              width: editingElement.width * zoom,
              height: editingElement.height * zoom,
              zIndex: 50,
              background: '#000',
              border: '1px solid #3b82f6',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              key={`video-${editingElement.id}`}
              autoPlay
              controls
              src={src}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      })()}
    </div>
  );
}