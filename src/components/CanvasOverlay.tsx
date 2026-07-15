import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Element } from '../types';
import { useEditorStore } from '../store/editorStore';
import { getObject } from '../utils/layaBridge';
import { clientToWorld, worldRectToScreen } from '../utils/laya/selection';
import { resolveElementFont } from '../utils/fontLoader';
import {
  getElementWorldBounds,
  worldDeltaToElementParent,
  type CanvasPoint,
} from '../utils/canvasGeometry';
import {
  findTopElementAtPoint,
  normalizeSelection,
  resolveMarqueeSelection,
  resolvePointerSelection,
  selectElementsInRect,
} from '../utils/canvasSelection';
import {
  createMoveTransaction,
  previewMoveTransaction,
  transactionHasChanges,
  type MoveTransaction,
} from '../utils/canvasTransformTransaction';

const HANDLE_SIZE = 10;
const POINTER_START_THRESHOLD = 3;
const HANDLE_DEFS = [
  { id: 'nw', rx: 0, ry: 0, cursor: 'nw-resize' },
  { id: 'n', rx: 0.5, ry: 0, cursor: 'n-resize' },
  { id: 'ne', rx: 1, ry: 0, cursor: 'ne-resize' },
  { id: 'e', rx: 1, ry: 0.5, cursor: 'e-resize' },
  { id: 'se', rx: 1, ry: 1, cursor: 'se-resize' },
  { id: 's', rx: 0.5, ry: 1, cursor: 's-resize' },
  { id: 'sw', rx: 0, ry: 1, cursor: 'sw-resize' },
  { id: 'w', rx: 0, ry: 0.5, cursor: 'w-resize' },
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

interface PointerBase {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  started: boolean;
}

interface MovePointer extends PointerBase {
  kind: 'move';
  startWorld: CanvasPoint;
  transaction: MoveTransaction;
  clickSelection: string[] | null;
}

interface MarqueePointer extends PointerBase {
  kind: 'marquee';
  startWorld: CanvasPoint;
  initialSelection: string[];
  intersect: boolean;
  toggle: boolean;
}

interface ResizePointer extends PointerBase {
  kind: 'resize';
  startWorld: CanvasPoint;
  elementId: string;
  corner: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  previewX: number;
  previewY: number;
  previewWidth: number;
  previewHeight: number;
}

type PointerInteraction = MovePointer | MarqueePointer | ResizePointer;

interface CanvasOverlayProps {
  layaHostRef: React.RefObject<HTMLDivElement | null>;
  world: WorldState;
  selectedIds: string[];
  currentPage: { elements: Element[] } | null;
  editingElement: Element | null;
  snap: (value: number) => number;
  setEditingId: (id: string | null) => void;
}

export default function CanvasOverlay({
  layaHostRef,
  world,
  selectedIds,
  currentPage,
  editingElement,
  snap,
  setEditingId,
}: CanvasOverlayProps) {
  const interactionRef = useRef<PointerInteraction | null>(null);
  const [localMarquee, setLocalMarqueeState] = useState<MarqueeState | null>(null);
  const localMarqueeRef = useRef<MarqueeState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number; dw?: number; dh?: number } | null>(null);
  const worldRef = useRef(world);
  const currentPageRef = useRef(currentPage);
  const snapRef = useRef(snap);

  useEffect(() => { worldRef.current = world; }, [world]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { snapRef.current = snap; }, [snap]);

  const setLocalMarquee = useCallback((value: MarqueeState | null) => {
    localMarqueeRef.current = value;
    setLocalMarqueeState(value);
  }, []);

  const [resolvedFont, setResolvedFont] = useState<{ elementId: string; fontFamily: string } | null>(null);
  useEffect(() => {
    if (!editingElement || editingElement.type !== 'NewTextArea') return;
    const courseId = useEditorStore.getState().currentCourse?.id ?? '';
    if (!courseId) return;
    const props = editingElement.props as Record<string, unknown>;
    let cancelled = false;
    resolveElementFont(
      courseId,
      (props.fontLocalPath as string | undefined) ?? '',
      (props.fontLibraryId as string | undefined) ?? '',
    ).then((fontFamily) => {
      if (!cancelled) setResolvedFont({ elementId: editingElement.id, fontFamily });
    }).catch(() => {
      if (!cancelled) setResolvedFont({ elementId: editingElement.id, fontFamily: 'FZLanTingHei' });
    });
    return () => { cancelled = true; };
  }, [editingElement]);
  const overlayFontFamily = resolvedFont && resolvedFont.elementId === editingElement?.id
    ? resolvedFont.fontFamily
    : 'FZLanTingHei';

  const pointerToWorld = useCallback((clientX: number, clientY: number) => {
    const host = layaHostRef.current;
    if (!host) return null;
    const viewport = worldRef.current;
    const point = clientToWorld(
      clientX,
      clientY,
      host.getBoundingClientRect(),
      viewport.panX,
      viewport.panY,
      viewport.zoom,
    );
    return { x: point.wx, y: point.wy };
  }, [layaHostRef]);

  const restorePreview = useCallback((interaction: PointerInteraction) => {
    if (interaction.kind === 'move') {
      for (const start of interaction.transaction.roots) {
        const object = getObject(start.id);
        if (object) {
          object.x = start.x;
          object.y = start.y;
        }
      }
    } else if (interaction.kind === 'resize') {
      const object = getObject(interaction.elementId);
      if (object) {
        object.x = interaction.startX;
        object.y = interaction.startY;
        object.width = interaction.startWidth;
        object.height = interaction.startHeight;
      }
    }
  }, []);

  const commitPageTurnPosition = useCallback((element: Element, x: number, y: number) => {
    if (element.type !== 'PageTurnImage') return;
    const props = element.props as { pages?: Array<{ x: number; y: number }>; currentPageIndex?: number };
    const pages = [...(props.pages ?? [])];
    const index = props.currentPageIndex ?? 0;
    if (index < 0 || index >= pages.length) return;
    pages[index] = { ...pages[index], x, y };
    useEditorStore.getState().updateElement(element.id, { props: { ...element.props, pages } });
  }, []);

  const finishInteraction = useCallback((commit: boolean) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    interactionRef.current = null;
    setDragOffset(null);

    const page = currentPageRef.current;
    const store = useEditorStore.getState();
    if (!commit) {
      restorePreview(interaction);
      setLocalMarquee(null);
      return;
    }

    if (interaction.kind === 'move') {
      if (!interaction.started) {
        if (interaction.clickSelection) store.selectElements(interaction.clickSelection);
        return;
      }
      if (!transactionHasChanges(interaction.transaction)) {
        restorePreview(interaction);
        return;
      }
      for (const preview of interaction.transaction.preview) {
        store.updateElement(preview.id, { x: preview.x, y: preview.y });
        const element = page?.elements.find((item) => item.id === preview.id);
        if (element) commitPageTurnPosition(element, preview.x, preview.y);
      }
      store.saveHistory();
      return;
    }

    if (interaction.kind === 'resize') {
      if (!interaction.started) return;
      const changed = Math.abs(interaction.previewX - interaction.startX) > 0.000001
        || Math.abs(interaction.previewY - interaction.startY) > 0.000001
        || Math.abs(interaction.previewWidth - interaction.startWidth) > 0.000001
        || Math.abs(interaction.previewHeight - interaction.startHeight) > 0.000001;
      if (!changed) {
        restorePreview(interaction);
        return;
      }
      store.updateElement(interaction.elementId, {
        x: interaction.previewX,
        y: interaction.previewY,
        width: interaction.previewWidth,
        height: interaction.previewHeight,
      });
      store.saveHistory();
      return;
    }

    const marquee = localMarqueeRef.current;
    setLocalMarquee(null);
    if (!interaction.started || !marquee || !page) return;
    const rect = {
      x: Math.min(marquee.startWX, marquee.endWX),
      y: Math.min(marquee.startWY, marquee.endWY),
      width: Math.abs(marquee.endWX - marquee.startWX),
      height: Math.abs(marquee.endWY - marquee.startWY),
    };
    const hits = selectElementsInRect(page.elements, rect, interaction.intersect);
    store.selectElements(resolveMarqueeSelection(
      page.elements,
      interaction.initialSelection,
      hits,
      interaction.toggle,
    ));
  }, [commitPageTurnPosition, restorePreview, setLocalMarquee]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || interactionRef.current) return;
    if ((event.target as HTMLElement).closest('[data-canvas-interactive]')) return;
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const store = useEditorStore.getState();
    const currentIds = store.selectedElementIds;
    const hit = findTopElementAtPoint(page.elements, point, currentIds);
    const toggle = event.metaKey || event.ctrlKey;
    if (hit) {
      const hitWasSelected = currentIds.includes(hit.id);
      const pointerSelection = hitWasSelected && !toggle
        ? normalizeSelection(page.elements, currentIds)
        : resolvePointerSelection(page.elements, currentIds, hit.id, toggle);
      store.selectElements(pointerSelection);
      const transaction = createMoveTransaction(page.elements, pointerSelection, hit.id);
      if (!transaction) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }
      interactionRef.current = {
        kind: 'move',
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWorld: point,
        started: false,
        transaction,
        clickSelection: hitWasSelected && !toggle
          ? resolvePointerSelection(page.elements, currentIds, hit.id, false)
          : null,
      };
      return;
    }

    if (!toggle) store.clearSelection();
    interactionRef.current = {
      kind: 'marquee',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorld: point,
      initialSelection: currentIds,
      intersect: event.altKey,
      toggle,
      started: false,
    };
  }, [pointerToWorld]);

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const corner = event.currentTarget.dataset.resizeCorner;
    const elementId = event.currentTarget.dataset.elementId;
    const element = currentPageRef.current?.elements.find((item) => item.id === elementId);
    if (!corner || !element) return;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorld: point,
      started: false,
      elementId: element.id,
      corner,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      previewX: element.x,
      previewY: element.y,
      previewWidth: element.width,
      previewHeight: element.height,
    };
  }, [pointerToWorld]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - interaction.startClientX,
      event.clientY - interaction.startClientY,
    );
    if (!interaction.started && distance < POINTER_START_THRESHOLD) return;
    interaction.started = true;
    const point = pointerToWorld(event.clientX, event.clientY);
    const page = currentPageRef.current;
    if (!point || !page) return;

    if (interaction.kind === 'move') {
      interaction.transaction = previewMoveTransaction(
        interaction.transaction,
        page.elements,
        { x: point.x - interaction.startWorld.x, y: point.y - interaction.startWorld.y },
        snapRef.current,
        event.shiftKey,
      );
      for (const preview of interaction.transaction.preview) {
        const object = getObject(preview.id);
        if (object) {
          object.x = preview.x;
          object.y = preview.y;
        }
      }
      setDragOffset({
        dx: interaction.transaction.worldDelta.x,
        dy: interaction.transaction.worldDelta.y,
      });
      return;
    }

    if (interaction.kind === 'marquee') {
      setLocalMarquee({
        startWX: interaction.startWorld.x,
        startWY: interaction.startWorld.y,
        endWX: point.x,
        endWY: point.y,
      });
      return;
    }

    const element = page.elements.find((item) => item.id === interaction.elementId);
    if (!element) return;
    const localDelta = worldDeltaToElementParent(element, page.elements, {
      x: point.x - interaction.startWorld.x,
      y: point.y - interaction.startWorld.y,
    });
    let x = interaction.startX;
    let y = interaction.startY;
    let width = interaction.startWidth;
    let height = interaction.startHeight;
    if (interaction.corner.includes('e')) width = Math.max(20, interaction.startWidth + localDelta.x);
    if (interaction.corner.includes('w')) {
      width = Math.max(20, interaction.startWidth - localDelta.x);
      x = interaction.startX + interaction.startWidth - width;
    }
    if (interaction.corner.includes('s')) height = Math.max(20, interaction.startHeight + localDelta.y);
    if (interaction.corner.includes('n')) {
      height = Math.max(20, interaction.startHeight - localDelta.y);
      y = interaction.startY + interaction.startHeight - height;
    }
    interaction.previewX = snapRef.current(x);
    interaction.previewY = snapRef.current(y);
    interaction.previewWidth = snapRef.current(width);
    interaction.previewHeight = snapRef.current(height);
    const object = getObject(interaction.elementId);
    if (object) {
      object.x = interaction.previewX;
      object.y = interaction.previewY;
      object.width = interaction.previewWidth;
      object.height = interaction.previewHeight;
    }
    setDragOffset({
      dx: interaction.previewX - interaction.startX,
      dy: interaction.previewY - interaction.startY,
      dw: interaction.previewWidth - interaction.startWidth,
      dh: interaction.previewHeight - interaction.startHeight,
    });
  }, [pointerToWorld, setLocalMarquee]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishInteraction(true);
  }, [finishInteraction]);

  useEffect(() => {
    const cancel = () => finishInteraction(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !interactionRef.current) return;
      event.preventDefault();
      cancel();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', cancel);
      cancel();
    };
  }, [finishInteraction]);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-canvas-interactive]')) return;
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) return;
    const hit = findTopElementAtPoint(page.elements, point, useEditorStore.getState().selectedElementIds);
    if (hit && (hit.type === 'NewTextArea' || hit.type === 'Video')) setEditingId(hit.id);
  }, [pointerToWorld, setEditingId]);

  const elements = currentPage?.elements ?? [];
  const { zoom, panX, panY } = world;
  const selectedElement = selectedIds.length === 1
    ? elements.find((element) => element.id === selectedIds[0])
    : null;
  const multiElements = selectedIds.length > 1
    ? elements.filter((element) => selectedIds.includes(element.id))
    : [];

  const groupColors = new Map<string, string>();
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  let colorIndex = 0;
  for (const element of multiElements) {
    if (element.groupId && !groupColors.has(element.groupId)) {
      groupColors.set(element.groupId, colors[colorIndex % colors.length]);
      colorIndex++;
    }
  }

  return (
    <div
      data-keep-selection
      className="absolute inset-0"
      style={{ pointerEvents: 'auto', zIndex: 5, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => finishInteraction(false)}
      onDoubleClick={handleDoubleClick}
    >
      {selectedElement && !(editingElement && editingElement.id === selectedElement.id) && (() => {
        const bounds = getElementWorldBounds(selectedElement, elements);
        const rect = worldRectToScreen(
          bounds.x + (dragOffset?.dx ?? 0),
          bounds.y + (dragOffset?.dy ?? 0),
          bounds.width + (dragOffset?.dw ?? 0),
          bounds.height + (dragOffset?.dh ?? 0),
          panX,
          panY,
          zoom,
        );
        const isLocked = selectedElement.locked;
        return (
          <div style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: isLocked ? '1px solid #f59e0b' : '1px solid #3b82f6',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}>
            {!isLocked && HANDLE_DEFS.map((definition) => (
              <div
                key={definition.id}
                style={{
                  position: 'absolute',
                  left: definition.rx * rect.width - HANDLE_SIZE / 2,
                  top: definition.ry * rect.height - HANDLE_SIZE / 2,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: '#fff',
                  border: '2px solid #3b82f6',
                  cursor: definition.cursor,
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                }}
                data-resize-corner={definition.id}
                data-element-id={selectedElement.id}
                onPointerDown={startResize}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => finishInteraction(false)}
              />
            ))}
          </div>
        );
      })()}

      {multiElements.map((element) => {
        const bounds = getElementWorldBounds(element, elements);
        const rect = worldRectToScreen(
          bounds.x + (dragOffset?.dx ?? 0),
          bounds.y + (dragOffset?.dy ?? 0),
          bounds.width,
          bounds.height,
          panX,
          panY,
          zoom,
        );
        const borderColor = element.groupId && groupColors.has(element.groupId)
          ? groupColors.get(element.groupId)
          : '#3b82f6';
        return (
          <div key={element.id} style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: `1.5px solid ${borderColor}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }} />
        );
      })}

      {localMarquee && (() => {
        const start = worldRectToScreen(localMarquee.startWX, localMarquee.startWY, 0, 0, panX, panY, zoom);
        const end = worldRectToScreen(localMarquee.endWX, localMarquee.endWY, 0, 0, panX, panY, zoom);
        return <div style={{
          position: 'absolute',
          left: Math.min(start.left, end.left),
          top: Math.min(start.top, end.top),
          width: Math.abs(end.left - start.left),
          height: Math.abs(end.top - start.top),
          border: '2px dashed #3b82f6',
          background: 'rgba(59, 130, 246, 0.12)',
          pointerEvents: 'none',
        }} />;
      })()}

      {editingElement && editingElement.type === 'NewTextArea' && (() => {
        const props = editingElement.props as Record<string, unknown>;
        const fontSize = (props.fontSize as number) ?? 16;
        const leading = (props.leading as number) ?? 0;
        const verticalAlign = (props.valign as string) ?? 'top';
        return (
          <div data-canvas-interactive style={{
            position: 'absolute',
            left: editingElement.x * zoom + panX,
            top: editingElement.y * zoom + panY,
            width: editingElement.width,
            height: editingElement.height,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
            background: '#ffffff',
            border: '1px solid #3b82f6',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          }}>
            <textarea
              autoFocus
              value={(props.text as string) ?? ''}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => useEditorStore.getState().updateElement(editingElement.id, {
                props: { ...props, text: event.target.value },
              })}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                setEditingId(null);
                useEditorStore.getState().saveHistory();
              }}
              style={{
                width: '100%',
                flexShrink: 0,
                maxHeight: '100%',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                resize: 'none',
                overflow: 'auto',
                fontFamily: `"${overlayFontFamily}"`,
                fontSize,
                lineHeight: `${fontSize + leading}px`,
                color: (props.color as string) ?? '#333',
                textAlign: (props.align as 'left' | 'center' | 'right') ?? 'left',
                whiteSpace: props.wordWrap === false ? 'pre' : 'pre-wrap',
                wordBreak: props.wordWrap === false ? 'normal' : 'break-word',
              }}
            />
          </div>
        );
      })()}

      {editingElement && editingElement.type === 'Video' && (() => {
        const props = editingElement.props as Record<string, unknown>;
        const videoUrl = (props.videoUrl as string) ?? '';
        if (!videoUrl) return null;
        const courseId = useEditorStore.getState().currentCourse?.id ?? '';
        return (
          <div data-canvas-interactive style={{
            position: 'absolute',
            left: editingElement.x * zoom + panX,
            top: editingElement.y * zoom + panY,
            width: editingElement.width * zoom,
            height: editingElement.height * zoom,
            zIndex: 50,
            background: '#000',
            border: '1px solid #3b82f6',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          }} onKeyDown={(event) => { if (event.key === 'Escape') setEditingId(null); }}>
            <video
              key={`video-${editingElement.id}`}
              autoPlay
              controls
              src={`forge-local://${courseId}/${videoUrl}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      })()}
    </div>
  );
}
