import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Element } from '../types';
import { useEditorStore } from '../store/editorStore';
import { getObject } from '../utils/layaBridge';
import { clientToWorld, worldRectToScreen } from '../utils/laya/selection';
import { resolveElementFont } from '../utils/fontLoader';
import {
  getElementWorldBounds,
  type CanvasPoint,
} from '../utils/canvasGeometry';
import {
  findTopElementAtPoint,
  getContainerIds,
  getTransformRootIds,
  isElementHidden,
  normalizeSelection,
  resolveMarqueeSelection,
  resolvePointerSelection,
  selectElementsInRect,
} from '../utils/canvasSelection';
import {
  createMoveTransaction,
  createResizeTransaction,
  createRotateTransaction,
  getSelectionFrame,
  previewMoveTransaction,
  previewResizeTransaction,
  previewRotateTransaction,
  transactionHasChanges,
  type CanvasTransformTransaction,
  type MoveTransaction,
  type ResizeTransaction,
  type RotateTransaction,
  type SelectionFrame,
  type TransformHandle,
  type TransformSnapshot,
} from '../utils/canvasTransformTransaction';

const HANDLE_SIZE = 10;
const POINTER_START_THRESHOLD = 3;
const HANDLE_DEFS: Array<{ id: TransformHandle; rx: number; ry: number; cursor: string }> = [
  { id: 'nw', rx: 0, ry: 0, cursor: 'nw-resize' },
  { id: 'n', rx: 0.5, ry: 0, cursor: 'n-resize' },
  { id: 'ne', rx: 1, ry: 0, cursor: 'ne-resize' },
  { id: 'e', rx: 1, ry: 0.5, cursor: 'e-resize' },
  { id: 'se', rx: 1, ry: 1, cursor: 'se-resize' },
  { id: 's', rx: 0.5, ry: 1, cursor: 's-resize' },
  { id: 'sw', rx: 0, ry: 1, cursor: 'sw-resize' },
  { id: 'w', rx: 0, ry: 0.5, cursor: 'w-resize' },
];
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

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
  duplicateOnDrag: boolean;
  duplicateIds: string[] | null;
  originalSelection: string[];
  transactionElements: Element[] | null;
}

interface MarqueePointer extends PointerBase {
  kind: 'marquee';
  startWorld: CanvasPoint;
  initialSelection: string[];
  toggle: boolean;
}

interface ResizePointer extends PointerBase {
  kind: 'resize';
  transaction: ResizeTransaction;
}

interface RotatePointer extends PointerBase {
  kind: 'rotate';
  transaction: RotateTransaction;
}

type PointerInteraction = MovePointer | MarqueePointer | ResizePointer | RotatePointer;

function getTransformTransaction(interaction: PointerInteraction): CanvasTransformTransaction | null {
  return interaction.kind === 'marquee' ? null : interaction.transaction;
}

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
  const [previewTransforms, setPreviewTransforms] = useState<TransformSnapshot[] | null>(null);
  const [previewFrame, setPreviewFrame] = useState<SelectionFrame | null>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
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
    const transaction = getTransformTransaction(interaction);
    if (!transaction) return;
    for (const start of transaction.roots) {
      const object = getObject(start.id);
      if (object) {
        object.x = start.x;
        object.y = start.y;
        object.width = start.width;
        object.height = start.height;
        object.rotation = start.rotation;
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
    setPreviewTransforms(null);
    setPreviewFrame(null);
    setPreviewAngle(null);

    const page = currentPageRef.current;
    const store = useEditorStore.getState();
    if (!commit) {
      restorePreview(interaction);
      if (interaction.kind === 'move' && interaction.duplicateIds) {
        store.removeElementsWithoutHistory(interaction.duplicateIds);
        store.selectElements(interaction.originalSelection);
      }
      setLocalMarquee(null);
      return;
    }

    if (interaction.kind !== 'marquee') {
      if (!interaction.started) {
        if (interaction.kind === 'move' && interaction.clickSelection) {
          store.selectElements(interaction.clickSelection);
        }
        return;
      }
      if (!transactionHasChanges(interaction.transaction)) {
        restorePreview(interaction);
        if (interaction.kind === 'move' && interaction.duplicateIds) {
          store.removeElementsWithoutHistory(interaction.duplicateIds);
          store.selectElements(interaction.originalSelection);
        }
        return;
      }
      for (const preview of interaction.transaction.preview) {
        store.updateElement(preview.id, {
          x: preview.x,
          y: preview.y,
          width: preview.width,
          height: preview.height,
          rotation: preview.rotation,
        });
        const element = page?.elements.find((item) => item.id === preview.id)
          ?? (interaction.kind === 'move' ? interaction.transactionElements?.find((item) => item.id === preview.id) : undefined);
        if (element) commitPageTurnPosition(element, preview.x, preview.y);
      }
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
    const hits = selectElementsInRect(page.elements, rect);
    store.selectElements(resolveMarqueeSelection(
      page.elements,
      interaction.initialSelection,
      hits,
      interaction.toggle,
    ));
  }, [commitPageTurnPosition, restorePreview, setLocalMarquee]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || interactionRef.current) return;
    const target = event.target as HTMLElement;
    const containerHandle = target.closest<HTMLElement>('[data-container-handle]');
    if (target.closest('[data-canvas-interactive]') && !containerHandle) return;
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const store = useEditorStore.getState();
    const currentIds = store.selectedElementIds;
    const hit = containerHandle
      ? page.elements.find((element) => element.id === containerHandle.dataset.containerHandle) ?? null
      : findTopElementAtPoint(page.elements, point, currentIds);
    const hitIsUnselectedContainerInterior = Boolean(
      hit
      && !containerHandle
      && getContainerIds(page.elements).has(hit.id)
      && !currentIds.includes(hit.id),
    );
    const toggle = event.metaKey || event.ctrlKey;
    const duplicateOnDrag = IS_MAC ? event.altKey : event.ctrlKey;
    if (hit && !hitIsUnselectedContainerInterior) {
      const hitWasSelected = currentIds.includes(hit.id);
      const pointerSelection = duplicateOnDrag && hitWasSelected
        ? normalizeSelection(page.elements, currentIds)
        : hitWasSelected && !toggle
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
        clickSelection: duplicateOnDrag && toggle
          ? resolvePointerSelection(page.elements, currentIds, hit.id, true)
          : hitWasSelected && !toggle
            ? resolvePointerSelection(page.elements, currentIds, hit.id, false)
            : null,
        duplicateOnDrag,
        duplicateIds: null,
        originalSelection: currentIds,
        transactionElements: null,
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
      toggle,
      started: false,
    };
  }, [pointerToWorld]);

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const corner = event.currentTarget.dataset.resizeCorner;
    const page = currentPageRef.current;
    if (!corner || !page) return;
    const transaction = createResizeTransaction(
      page.elements,
      useEditorStore.getState().selectedElementIds,
      corner as TransformHandle,
    );
    if (!transaction) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      started: false,
      transaction,
    };
  }, []);

  const startRotate = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) return;
    const transaction = createRotateTransaction(
      page.elements,
      useEditorStore.getState().selectedElementIds,
      point,
    );
    if (!transaction) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: 'rotate',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      started: false,
      transaction,
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
    const justStarted = !interaction.started;
    interaction.started = true;
    const point = pointerToWorld(event.clientX, event.clientY);
    const page = currentPageRef.current;
    if (!point || !page) return;

    if (interaction.kind === 'move') {
      if (justStarted && interaction.duplicateOnDrag && !interaction.duplicateIds) {
        const duplicate = useEditorStore.getState().duplicateElementsForDrag(
          interaction.transaction.roots.map((root) => root.id),
        );
        const mappedPrimaryId = duplicate?.idMap[interaction.transaction.primaryId];
        const duplicateTransaction = duplicate && mappedPrimaryId
          ? createMoveTransaction(duplicate.elements, duplicate.selectedIds, mappedPrimaryId)
          : null;
        if (!duplicate || !duplicateTransaction) {
          if (duplicate) useEditorStore.getState().removeElementsWithoutHistory(duplicate.allIds);
          interaction.duplicateOnDrag = false;
        } else {
          interaction.transaction = duplicateTransaction;
          interaction.duplicateIds = duplicate.allIds;
          interaction.transactionElements = duplicate.elements;
        }
      }
      const transactionElements = interaction.transactionElements ?? page.elements;
      interaction.transaction = previewMoveTransaction(
        interaction.transaction,
        transactionElements,
        { x: point.x - interaction.startWorld.x, y: point.y - interaction.startWorld.y },
        snapRef.current,
        event.shiftKey,
      );
      for (const preview of interaction.transaction.preview) {
        const object = getObject(preview.id);
        if (object) {
          object.x = preview.x;
          object.y = preview.y;
          object.width = preview.width;
          object.height = preview.height;
          object.rotation = preview.rotation;
        }
      }
      if (interaction.duplicateIds) {
        useEditorStore.getState().updateElementsWithoutHistory(interaction.transaction.preview);
      }
      setPreviewTransforms(interaction.transaction.preview);
      setPreviewFrame(interaction.transaction.previewFrame);
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

    if (interaction.kind === 'resize') {
      interaction.transaction = previewResizeTransaction(
        interaction.transaction,
        page.elements,
        point,
        event.shiftKey,
        snapRef.current,
      );
    } else {
      interaction.transaction = previewRotateTransaction(
        interaction.transaction,
        page.elements,
        point,
        event.shiftKey,
      );
    }
    for (const preview of interaction.transaction.preview) {
      const object = getObject(preview.id);
      if (object) {
        object.x = preview.x;
        object.y = preview.y;
        object.width = preview.width;
        object.height = preview.height;
        object.rotation = preview.rotation;
      }
    }
    setPreviewTransforms(interaction.transaction.preview);
    setPreviewFrame(interaction.transaction.previewFrame);
    setPreviewAngle(interaction.kind === 'rotate' ? interaction.transaction.angleDelta : null);
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
  const previewMap = new Map((previewTransforms ?? []).map((snapshot) => [snapshot.id, snapshot]));
  const displayElements = elements.map((element) => {
    const preview = previewMap.get(element.id);
    return preview ? {
      ...element,
      x: preview.x,
      y: preview.y,
      width: preview.width,
      height: preview.height,
      rotation: preview.rotation,
    } : element;
  });
  const { zoom, panX, panY } = world;
  const selectedElement = selectedIds.length === 1
    ? displayElements.find((element) => element.id === selectedIds[0])
    : null;
  const multiElements = selectedIds.length > 1
    ? displayElements.filter((element) => selectedIds.includes(element.id))
    : [];
  const elementMap = new Map(displayElements.map((element) => [element.id, element]));
  const containerIds = getContainerIds(displayElements);
  const containerElements = displayElements.filter((element) => (
    containerIds.has(element.id) && !isElementHidden(element, elementMap)
  ));
  const selectionFrame = previewFrame ?? getSelectionFrame(displayElements, selectedIds);
  const canTransform = getTransformRootIds(displayElements, selectedIds).length > 0;

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
      {containerElements.map((element) => {
        const bounds = getElementWorldBounds(element, displayElements);
        const rect = worldRectToScreen(bounds.x, bounds.y, bounds.width, bounds.height, panX, panY, zoom);
        const selected = selectedIds.includes(element.id);
        const label = element.name || element.type;
        return (
          <div key={`container-${element.id}`} style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: selected ? '1px dashed rgba(59, 130, 246, 0.9)' : '1px dashed rgba(148, 163, 184, 0.55)',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}>
            <div data-container-handle={element.id} style={{
              position: 'absolute',
              left: -1,
              top: -18,
              maxWidth: Math.max(rect.width, 80),
              padding: '1px 4px',
              overflow: 'hidden',
              color: selected ? '#bfdbfe' : 'rgba(203, 213, 225, 0.8)',
              background: selected ? 'rgba(30, 64, 175, 0.9)' : 'rgba(30, 41, 59, 0.78)',
              fontSize: 10,
              lineHeight: '15px',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              cursor: 'move',
            }}>
              {label}
            </div>
            <div data-container-handle={element.id} style={{
              position: 'absolute', left: -4, right: -4, top: -4, height: 8, pointerEvents: 'auto', cursor: 'move',
            }} />
            <div data-container-handle={element.id} style={{
              position: 'absolute', left: -4, right: -4, bottom: -4, height: 8, pointerEvents: 'auto', cursor: 'move',
            }} />
            <div data-container-handle={element.id} style={{
              position: 'absolute', top: 4, bottom: 4, left: -4, width: 8, pointerEvents: 'auto', cursor: 'move',
            }} />
            <div data-container-handle={element.id} style={{
              position: 'absolute', top: 4, bottom: 4, right: -4, width: 8, pointerEvents: 'auto', cursor: 'move',
            }} />
          </div>
        );
      })}

      {selectionFrame && !(editingElement && selectedElement?.id === editingElement.id) && (() => {
        const origin = worldRectToScreen(
          selectionFrame.origin.x,
          selectionFrame.origin.y,
          0,
          0,
          panX,
          panY,
          zoom,
        );
        const frameWidth = selectionFrame.width * zoom;
        const frameHeight = selectionFrame.height * zoom;
        return (
          <div style={{
            position: 'absolute',
            left: origin.left,
            top: origin.top,
            width: frameWidth,
            height: frameHeight,
            border: canTransform ? '1px solid #3b82f6' : '1px solid #f59e0b',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            transform: `rotate(${selectionFrame.rotation}deg)`,
            transformOrigin: '0 0',
          }}>
            {canTransform && HANDLE_DEFS.map((definition) => (
              <div
                key={definition.id}
                style={{
                  position: 'absolute',
                  left: definition.rx * frameWidth - HANDLE_SIZE / 2,
                  top: definition.ry * frameHeight - HANDLE_SIZE / 2,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: '#fff',
                  border: '2px solid #3b82f6',
                  cursor: definition.cursor,
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                }}
                data-resize-corner={definition.id}
                onPointerDown={startResize}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => finishInteraction(false)}
              />
            ))}
            {canTransform && (
              <>
                <div style={{
                  position: 'absolute',
                  left: frameWidth / 2,
                  top: -28,
                  width: 1,
                  height: 28,
                  background: '#3b82f6',
                }} />
                <div
                  data-rotate-handle
                  style={{
                    position: 'absolute',
                    left: frameWidth / 2 - 7,
                    top: -35,
                    width: 14,
                    height: 14,
                    border: '2px solid #3b82f6',
                    borderRadius: '50%',
                    background: '#fff',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                    cursor: 'grab',
                  }}
                  onPointerDown={startRotate}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => finishInteraction(false)}
                />
                {previewAngle !== null && (
                  <div style={{
                    position: 'absolute',
                    left: frameWidth / 2 + 12,
                    top: -40,
                    padding: '1px 4px',
                    color: '#fff',
                    background: 'rgba(30, 41, 59, 0.9)',
                    fontSize: 11,
                    lineHeight: '16px',
                    whiteSpace: 'nowrap',
                    transform: `rotate(${-selectionFrame.rotation}deg)`,
                    transformOrigin: 'left center',
                  }}>
                    {Math.round(previewAngle)}°
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {multiElements.map((element) => {
        const memberFrame = getSelectionFrame(displayElements, [element.id]);
        if (!memberFrame) return null;
        const origin = worldRectToScreen(
          memberFrame.origin.x,
          memberFrame.origin.y,
          0,
          0,
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
            left: origin.left,
            top: origin.top,
            width: memberFrame.width * zoom,
            height: memberFrame.height * zoom,
            border: `1.5px solid ${borderColor}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            transform: `rotate(${memberFrame.rotation}deg)`,
            transformOrigin: '0 0',
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
