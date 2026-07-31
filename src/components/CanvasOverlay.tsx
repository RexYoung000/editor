import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EditorLayerGroup, Element } from '../types';
import { useEditorStore } from '../store/editorStore';
import { getCourseResourceUrl } from '../utils/electronFs';
import { applyElementTransform, getObject } from '../utils/layaBridge';
import { applyNewTextAreaRender } from '../utils/laya/components';
import { clientToWorld, worldRectToScreen } from '../utils/laya/selection';
import { resolveElementFont } from '../utils/fontLoader';
import { DEFAULT_FONT_FACE } from '../elements/fontLibrary';
import { caretOffsetAtPoint, layoutText, normalizeTextSizingMode } from '../utils/textLayout';
import type { RenderTextProps } from '../utils/textToImage';
import { NEW_TEXT_DEFAULT_CONTENT } from '../elements/elementMeta';
import {
  getElementWorldBounds,
  getElementWorldMatrix,
  invertMatrix,
  transformPoint,
  type CanvasPoint,
} from '../utils/canvasGeometry';
import {
  findCanvasPointerTarget,
  findTopElementAtPoint,
  getContainerIds,
  getSelectionContextContainerIds,
  getSelectionOverflowContextContainerIds,
  getTransformRootIds,
  isElementHidden,
  isElementLocked,
  normalizeSelection,
  resolveMarqueeSelection,
  resolvePointerSelection,
  selectElementsInRect,
} from '../utils/canvasSelection';
import {
  createMoveTransaction,
  createResizeTransaction,
  createRotateTransaction,
  getFrameHandleWorldPoint,
  getSelectionFrame,
  previewMoveTransaction,
  previewResizeTransaction,
  previewRotateTransaction,
  translateMoveTransaction,
  transactionHasChanges,
  type CanvasTransformTransaction,
  type MoveTransaction,
  type ResizeTransaction,
  type RotateTransaction,
  type SelectionFrame,
  type TransformHandle,
  type TransformSnapshot,
} from '../utils/canvasTransformTransaction';
import {
  createSmartSnapCandidates,
  getResizeSnapAxes,
  getSelectionFrameBounds,
  snapBoundsToCandidates,
  snapPointToCandidates,
  type SnapCandidate,
  type SnapGuide,
  type SnapLocks,
  type SnapResult,
} from '../utils/canvasSnap';
import { isChoiceOption } from '../utils/choiceAnswerRules';
import {
  createEqualSpacingItems,
  getDistanceHintBetweenRects,
  getEqualSpacingHints,
  getNearestDistanceHint,
  snapBoundsToEqualSpacing,
  type DistanceHint,
  type EqualSpacingHint,
  type EqualSpacingResult,
  type SpacingItem,
  type SpacingLocks,
} from '../utils/canvasSpacing';

const HANDLE_SIZE = 10;
const POINTER_START_THRESHOLD = 3;
const NO_SNAP = (value: number) => value;
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

function chooseAxisCorrection(
  smartCorrection: number,
  smartMatched: boolean,
  spacingCorrection: number,
  spacingMatched: boolean,
): { correction: number; source: 'smart' | 'spacing' | null } {
  if (!smartMatched && !spacingMatched) return { correction: 0, source: null };
  if (!spacingMatched) return { correction: smartCorrection, source: 'smart' };
  if (!smartMatched) return { correction: spacingCorrection, source: 'spacing' };
  return Math.abs(smartCorrection) <= Math.abs(spacingCorrection)
    ? { correction: smartCorrection, source: 'smart' }
    : { correction: spacingCorrection, source: 'spacing' };
}

function formatSpacingDistance(distance: number): string {
  const rounded = Math.round(distance);
  return Math.abs(distance - rounded) < 0.05 ? String(rounded) : distance.toFixed(1);
}

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
  snapCandidates: SnapCandidate[] | null;
  snapLocks: SnapLocks;
  spacingItems: SpacingItem[] | null;
  spacingLocks: SpacingLocks;
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
  snapCandidates: SnapCandidate[] | null;
  snapLocks: SnapLocks;
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
  currentPage: { elements: Element[]; editorLayerGroups?: EditorLayerGroup[] } | null;
  editingElement: Element | null;
  pageWidth: number;
  pageHeight: number;
  snap: (value: number) => number;
  smartSnapEnabled: boolean;
  showSnapGuides: boolean;
  distanceHintsEnabled: boolean;
  setEditingId: (id: string | null) => void;
  textCaretPoint: { x: number; y: number } | null;
  setTextCaretPoint: (point: { x: number; y: number } | null) => void;
  selectAllTextOnEdit: boolean;
  setSelectAllTextOnEdit: (value: boolean) => void;
  onTextSessionEnd: (id: string) => void;
}

export default function CanvasOverlay({
  layaHostRef,
  world,
  selectedIds,
  currentPage,
  editingElement,
  pageWidth,
  pageHeight,
  snap,
  smartSnapEnabled,
  showSnapGuides,
  distanceHintsEnabled,
  setEditingId,
  textCaretPoint,
  setTextCaretPoint,
  selectAllTextOnEdit,
  setSelectAllTextOnEdit,
  onTextSessionEnd,
}: CanvasOverlayProps) {
  const interactionRef = useRef<PointerInteraction | null>(null);
  const [localMarquee, setLocalMarqueeState] = useState<MarqueeState | null>(null);
  const localMarqueeRef = useRef<MarqueeState | null>(null);
  const [previewTransforms, setPreviewTransforms] = useState<TransformSnapshot[] | null>(null);
  const [previewFrame, setPreviewFrame] = useState<SelectionFrame | null>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [spacingHints, setSpacingHints] = useState<EqualSpacingHint[]>([]);
  const [distanceHint, setDistanceHint] = useState<DistanceHint | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const textResizeFrameRef = useRef<number | null>(null);
  const pendingTextResizeRef = useRef<{ element: Element; width: number; height: number } | null>(null);
  const caretAppliedForRef = useRef<string | null>(null);
  const committedTextSessionRef = useRef<string | null>(null);
  const [textDraftState, setTextDraftState] = useState({ id: '', value: '' });
  const editingTextId = editingElement?.type === 'NewTextArea' ? editingElement.id : null;
  const textDraft = editingTextId && textDraftState.id === editingTextId
    ? textDraftState.value
    : editingElement?.type === 'NewTextArea'
      ? String(editingElement.props.text ?? '')
      : '';

  useEffect(() => {
    committedTextSessionRef.current = null;
    caretAppliedForRef.current = null;
  }, [editingTextId]);
  const worldRef = useRef(world);
  const currentPageRef = useRef(currentPage);
  const snapRef = useRef(snap);
  const smartSnapEnabledRef = useRef(smartSnapEnabled);
  const showSnapGuidesRef = useRef(showSnapGuides);
  const distanceHintsEnabledRef = useRef(distanceHintsEnabled);

  useEffect(() => { worldRef.current = world; }, [world]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { snapRef.current = snap; }, [snap]);
  useEffect(() => { smartSnapEnabledRef.current = smartSnapEnabled; }, [smartSnapEnabled]);
  useEffect(() => { showSnapGuidesRef.current = showSnapGuides; }, [showSnapGuides]);
  useEffect(() => { distanceHintsEnabledRef.current = distanceHintsEnabled; }, [distanceHintsEnabled]);

  const setLocalMarquee = useCallback((value: MarqueeState | null) => {
    localMarqueeRef.current = value;
    setLocalMarqueeState(value);
  }, []);

  const cancelTextResizePreview = useCallback(() => {
    if (textResizeFrameRef.current !== null) {
      cancelAnimationFrame(textResizeFrameRef.current);
      textResizeFrameRef.current = null;
    }
    pendingTextResizeRef.current = null;
  }, []);

  const scheduleTextResizePreview = useCallback((element: Element, width: number, height: number) => {
    const renderPreview = (pending: { element: Element; width: number; height: number }) => {
      const object = getObject(pending.element.id);
      if (!object) return;
      object.width = pending.width;
      object.height = pending.height;
      applyNewTextAreaRender(object, {
        ...pending.element,
        width: pending.width,
        height: pending.height,
      });
    };
    if (textResizeFrameRef.current !== null) {
      pendingTextResizeRef.current = { element, width, height };
      return;
    }
    renderPreview({ element, width, height });
    textResizeFrameRef.current = requestAnimationFrame(() => {
      textResizeFrameRef.current = null;
      const pending = pendingTextResizeRef.current;
      pendingTextResizeRef.current = null;
      if (!pending) return;
      renderPreview(pending);
    });
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
      if (!cancelled) setResolvedFont({ elementId: editingElement.id, fontFamily: DEFAULT_FONT_FACE });
    });
    return () => { cancelled = true; };
  }, [editingElement]);
  const overlayFontFamily = resolvedFont && resolvedFont.elementId === editingElement?.id
    ? resolvedFont.fontFamily
    : DEFAULT_FONT_FACE;

  useEffect(() => {
    if (!editingElement || editingElement.type !== 'NewTextArea') return;
    const object = getObject(editingElement.id);
    if (!object) return;
    const previousVisible = object.visible;
    object.visible = false;
    return () => { object.visible = previousVisible; };
  }, [editingElement]);

  const finishTextEditing = useCallback(() => {
    if (!editingElement || editingElement.type !== 'NewTextArea') return;
    if (committedTextSessionRef.current === editingElement.id) return;
    committedTextSessionRef.current = editingElement.id;
    const props = editingElement.props as Record<string, unknown>;
    const nextProps = { ...props, text: textDraft };
    const layout = layoutText(textDraft, editingElement.width, editingElement.height, nextProps as RenderTextProps, overlayFontFamily);
    const mode = normalizeTextSizingMode(props.textSizingMode);
    const changed = textDraft !== String(props.text ?? '')
      || (mode !== 'fixed' && (layout.width !== editingElement.width || layout.height !== editingElement.height));
    if (changed) {
      useEditorStore.getState().updateElement(editingElement.id, {
        width: layout.width,
        height: layout.height,
        props: nextProps,
      });
      useEditorStore.getState().saveHistory();
    }
    setEditingId(null);
    onTextSessionEnd(editingElement.id);
  }, [editingElement, onTextSessionEnd, overlayFontFamily, setEditingId, textDraft]);

  useLayoutEffect(() => {
    const textarea = textAreaRef.current;
    if (!textarea || !editingElement || editingElement.type !== 'NewTextArea') return;
    if (caretAppliedForRef.current === editingElement.id) return;
    caretAppliedForRef.current = editingElement.id;
    textarea.focus();
    if (selectAllTextOnEdit) {
      textarea.setSelectionRange(0, textDraft.length);
    } else if (textCaretPoint) {
      const props = editingElement.props as Record<string, unknown>;
      textarea.setSelectionRange(
        caretOffsetAtPoint(textDraft, editingElement.width, props, textCaretPoint.x, textCaretPoint.y, overlayFontFamily),
        caretOffsetAtPoint(textDraft, editingElement.width, props, textCaretPoint.x, textCaretPoint.y, overlayFontFamily),
      );
    } else {
      textarea.setSelectionRange(textDraft.length, textDraft.length);
    }
  }, [editingElement, overlayFontFamily, selectAllTextOnEdit, textCaretPoint, textDraft]);

  // CanvasOverlay 阻止画布默认 pointer 行为时，浏览器不会替 textarea 自然触发失焦。
  // 在文档捕获阶段主动提交，保证点击画布、属性面板或工具栏都能结束编辑。
  useEffect(() => {
    if (!editingTextId) return;
    const handleDocumentPointerDown = (event: Event) => {
      const textarea = textAreaRef.current;
      const target = event.target;
      if (!textarea || !(target instanceof Node)) return;
      const editor = textarea.closest('[data-text-editor]');
      if (editor?.contains(target)) return;
      textarea.blur();
    };
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('mousedown', handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('mousedown', handleDocumentPointerDown, true);
    };
  }, [editingTextId]);

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
        const element = currentPageRef.current?.elements.find((item) => item.id === start.id);
        if (element) {
          applyElementTransform(object, { ...element, ...start });
        } else {
          object.x = start.x;
          object.y = start.y;
          object.width = start.width;
          object.height = start.height;
          object.rotation = start.rotation;
        }
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
    cancelTextResizePreview();
    interactionRef.current = null;
    setPreviewTransforms(null);
    setPreviewFrame(null);
    setPreviewAngle(null);
    setSnapGuides([]);
    setSpacingHints([]);
    setDistanceHint(null);

    const page = currentPageRef.current;
    const store = useEditorStore.getState();
    if (!commit) {
      restorePreview(interaction);
      if (interaction.kind === 'resize') {
        const page = currentPageRef.current;
        for (const root of interaction.transaction.roots) {
          const element = page?.elements.find((item) => item.id === root.id);
          const object = element ? getObject(element.id) : undefined;
          if (element?.type === 'NewTextArea' && object) applyNewTextAreaRender(object, element);
        }
      }
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
    const editorLayerGroupIds = new Set(page.editorLayerGroups?.map((group) => group.id) ?? []);
    const hits = selectElementsInRect(page.elements, rect, editorLayerGroupIds);
    store.selectElements(resolveMarqueeSelection(
      page.elements,
      interaction.initialSelection,
      hits,
      interaction.toggle,
      editorLayerGroupIds,
    ));
  }, [cancelTextResizePreview, commitPageTurnPosition, restorePreview, setLocalMarquee]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || interactionRef.current) return;
    setDistanceHint(null);
    setSpacingHints([]);
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
    const hit = findCanvasPointerTarget(
      page.elements,
      point,
      currentIds,
      containerHandle?.dataset.containerHandle,
    );
    const toggle = event.metaKey || event.ctrlKey;
    const duplicateOnDrag = IS_MAC ? event.altKey : event.ctrlKey;
    const editorLayerGroupIds = new Set(page.editorLayerGroups?.map((group) => group.id) ?? []);
    if (hit) {
      const hitWasSelected = currentIds.includes(hit.id);
      const delayedMacToggle = IS_MAC && event.metaKey && hitWasSelected;
      const pointerSelection = duplicateOnDrag && hitWasSelected
        ? normalizeSelection(page.elements, currentIds, undefined, editorLayerGroupIds)
        : hitWasSelected && (!toggle || delayedMacToggle)
        ? normalizeSelection(page.elements, currentIds, undefined, editorLayerGroupIds)
        : resolvePointerSelection(page.elements, currentIds, hit.id, toggle, editorLayerGroupIds);
      store.selectElements(pointerSelection);
      const elementMap = new Map(page.elements.map((element) => [element.id, element]));
      const transaction = isElementLocked(hit, elementMap)
        ? null
        : createMoveTransaction(page.elements, pointerSelection, hit.id, editorLayerGroupIds);
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
        clickSelection: delayedMacToggle
          ? resolvePointerSelection(page.elements, currentIds, hit.id, true, editorLayerGroupIds)
          : duplicateOnDrag && toggle
          ? resolvePointerSelection(page.elements, currentIds, hit.id, true, editorLayerGroupIds)
          : hitWasSelected && !toggle
            ? resolvePointerSelection(page.elements, currentIds, hit.id, false, editorLayerGroupIds)
            : null,
        duplicateOnDrag,
        duplicateIds: null,
        originalSelection: currentIds,
        transactionElements: null,
        snapCandidates: null,
        snapLocks: {},
        spacingItems: null,
        spacingLocks: {},
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
      new Set(page.editorLayerGroups?.map((group) => group.id) ?? []),
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
      snapCandidates: null,
      snapLocks: {},
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
      new Set(page.editorLayerGroups?.map((group) => group.id) ?? []),
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

  const updateHoverDistance = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!distanceHintsEnabledRef.current || !event.altKey || selectedIds.length === 0) {
      setDistanceHint(null);
      return;
    }
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) {
      setDistanceHint(null);
      return;
    }
    const frame = getSelectionFrame(page.elements, selectedIds, {
      editorLayerGroupIds: new Set(page.editorLayerGroups?.map((group) => group.id) ?? []),
    });
    const hit = findTopElementAtPoint(page.elements, point, [], { includeLocked: true });
    if (!frame || !hit || selectedIds.includes(hit.id)) {
      setDistanceHint(null);
      return;
    }
    setSpacingHints([]);
    setDistanceHint(getDistanceHintBetweenRects(
      getSelectionFrameBounds(frame),
      getElementWorldBounds(hit, page.elements),
      hit.id,
    ));
  }, [pointerToWorld, selectedIds]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      updateHoverDistance(event);
      return;
    }
    if (interaction.pointerId !== event.pointerId) return;
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
    const smartSnapTemporarilyDisabled = IS_MAC ? event.metaKey : event.altKey;

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
      const requestedWorldDelta = {
        x: point.x - interaction.startWorld.x,
        y: point.y - interaction.startWorld.y,
      };
      let nextTransaction = previewMoveTransaction(
        interaction.transaction,
        transactionElements,
        requestedWorldDelta,
        snapRef.current,
        event.shiftKey,
      );
      const movingBounds = getSelectionFrameBounds(nextTransaction.previewFrame);
      const smartSnapActive = smartSnapEnabledRef.current && !smartSnapTemporarilyDisabled;
      const distanceAssistActive = distanceHintsEnabledRef.current;
      const candidates = smartSnapActive
        ? interaction.snapCandidates ?? createSmartSnapCandidates(
          transactionElements,
          nextTransaction.roots.map((root) => root.id),
          pageWidth,
          pageHeight,
        )
        : [];
      if (smartSnapActive) interaction.snapCandidates = candidates;
      const spacingItems = distanceAssistActive
        ? interaction.spacingItems ?? createEqualSpacingItems(
          transactionElements,
          nextTransaction.roots.map((root) => root.id),
        )
        : [];
      if (distanceAssistActive) interaction.spacingItems = spacingItems;
      const smartResult: SnapResult = smartSnapActive
        ? snapBoundsToCandidates(
          movingBounds,
          candidates,
          { zoom: worldRef.current.zoom, previous: interaction.snapLocks },
        )
        : { correction: { x: 0, y: 0 }, guides: [], locks: {} };
      const spacingResult: EqualSpacingResult = distanceAssistActive
        ? snapBoundsToEqualSpacing(
          movingBounds,
          spacingItems,
          { zoom: worldRef.current.zoom, previous: interaction.spacingLocks },
        )
        : { correction: { x: 0, y: 0 }, locks: {} };

      if (event.shiftKey) {
        const horizontal = Math.abs(requestedWorldDelta.x) >= Math.abs(requestedWorldDelta.y);
        if (horizontal) {
          smartResult.correction.y = 0;
          smartResult.locks.y = undefined;
          spacingResult.correction.y = 0;
          spacingResult.locks.y = undefined;
        } else {
          smartResult.correction.x = 0;
          smartResult.locks.x = undefined;
          spacingResult.correction.x = 0;
          spacingResult.locks.x = undefined;
        }
      }

      const xChoice = chooseAxisCorrection(
        smartResult.correction.x,
        Boolean(smartResult.locks.x),
        spacingResult.correction.x,
        Boolean(spacingResult.locks.x),
      );
      const yChoice = chooseAxisCorrection(
        smartResult.correction.y,
        Boolean(smartResult.locks.y),
        spacingResult.correction.y,
        Boolean(spacingResult.locks.y),
      );
      nextTransaction = translateMoveTransaction(
        nextTransaction,
        transactionElements,
        { x: xChoice.correction, y: yChoice.correction },
      );
      interaction.snapLocks = {
        x: xChoice.source === 'smart' ? smartResult.locks.x : undefined,
        y: yChoice.source === 'smart' ? smartResult.locks.y : undefined,
      };
      interaction.spacingLocks = {
        x: xChoice.source === 'spacing' ? spacingResult.locks.x : undefined,
        y: yChoice.source === 'spacing' ? spacingResult.locks.y : undefined,
      };

      const finalBounds = getSelectionFrameBounds(nextTransaction.previewFrame);
      if (!smartSnapActive) {
        interaction.snapLocks = {};
        setSnapGuides([]);
      } else if (showSnapGuidesRef.current) {
        const exactGuides = snapBoundsToCandidates(
          finalBounds,
          candidates,
          { zoom: worldRef.current.zoom, thresholdPx: 0.5, releaseThresholdPx: 0.5 },
        ).guides;
        setSnapGuides(event.shiftKey
          ? exactGuides.filter((guide) => (
            Math.abs(requestedWorldDelta.x) >= Math.abs(requestedWorldDelta.y)
              ? guide.axis === 'x'
              : guide.axis === 'y'
          ))
          : exactGuides);
      } else {
        setSnapGuides([]);
      }
      if (distanceAssistActive) {
        const exactHints = getEqualSpacingHints(finalBounds, spacingItems, worldRef.current.zoom);
        const visibleSpacingHints = event.shiftKey
          ? exactHints.filter((hint) => (
            Math.abs(requestedWorldDelta.x) >= Math.abs(requestedWorldDelta.y)
              ? hint.axis === 'x'
              : hint.axis === 'y'
          ))
          : exactHints;
        setSpacingHints(visibleSpacingHints);
        setDistanceHint(
          visibleSpacingHints.length > 0
            ? null
            : getNearestDistanceHint(finalBounds, spacingItems),
        );
      } else {
        interaction.spacingLocks = {};
        setSpacingHints([]);
        setDistanceHint(null);
      }
      interaction.transaction = nextTransaction;
      for (const preview of interaction.transaction.preview) {
        const object = getObject(preview.id);
        if (object) {
          const element = page.elements.find((item) => item.id === preview.id);
          if (element) {
            applyElementTransform(object, { ...element, ...preview });
          } else {
            object.x = preview.x;
            object.y = preview.y;
            object.width = preview.width;
            object.height = preview.height;
            object.rotation = preview.rotation;
          }
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
      setSnapGuides([]);
      setSpacingHints([]);
      setDistanceHint(null);
      setLocalMarquee({
        startWX: interaction.startWorld.x,
        startWY: interaction.startWorld.y,
        endWX: point.x,
        endWY: point.y,
      });
      return;
    }

    if (interaction.kind === 'resize') {
      let nextTransaction = previewResizeTransaction(
        interaction.transaction,
        page.elements,
        point,
        event.shiftKey,
        snapRef.current,
      );
      if (!smartSnapEnabledRef.current || smartSnapTemporarilyDisabled) {
        interaction.snapLocks = {};
        setSnapGuides([]);
      } else {
        const candidates = interaction.snapCandidates ?? createSmartSnapCandidates(
          page.elements,
          nextTransaction.roots.map((root) => root.id),
          pageWidth,
          pageHeight,
        );
        interaction.snapCandidates = candidates;
        const axes = getResizeSnapAxes(nextTransaction.handle, nextTransaction.frame.rotation);
        let snapResult = snapPointToCandidates(
          getFrameHandleWorldPoint(nextTransaction.previewFrame, nextTransaction.handle),
          axes,
          candidates,
          { zoom: worldRef.current.zoom, previous: interaction.snapLocks },
        );
        let adjustedPoint = {
          x: point.x + snapResult.correction.x,
          y: point.y + snapResult.correction.y,
        };
        for (let index = 0; index < 4; index++) {
          if (Math.hypot(snapResult.correction.x, snapResult.correction.y) <= 0.001) break;
          nextTransaction = previewResizeTransaction(
            interaction.transaction,
            page.elements,
            adjustedPoint,
            event.shiftKey,
            NO_SNAP,
          );
          snapResult = snapPointToCandidates(
            getFrameHandleWorldPoint(nextTransaction.previewFrame, nextTransaction.handle),
            axes,
            candidates,
            { zoom: worldRef.current.zoom, previous: snapResult.locks },
          );
          adjustedPoint = {
            x: adjustedPoint.x + snapResult.correction.x,
            y: adjustedPoint.y + snapResult.correction.y,
          };
        }
        interaction.snapLocks = snapResult.locks;
        setSnapGuides(showSnapGuidesRef.current ? snapResult.guides : []);
      }
      if (nextTransaction.handle === 'e' || nextTransaction.handle === 'w') {
        const root = nextTransaction.preview.length === 1 ? nextTransaction.preview[0] : null;
        const element = root ? page.elements.find((item) => item.id === root.id) : null;
        if (root && element?.type === 'NewTextArea' && normalizeTextSizingMode(element.props.textSizingMode) === 'fixed-width') {
          const measured = layoutText(String(element.props.text ?? ''), root.width, root.height, element.props, overlayFontFamily);
          nextTransaction = {
            ...nextTransaction,
            preview: nextTransaction.preview.map((item) => item.id === root.id ? { ...item, height: measured.height } : item),
            previewFrame: { ...nextTransaction.previewFrame, height: measured.height },
          };
        }
      }
      setSpacingHints([]);
      setDistanceHint(null);
      interaction.transaction = nextTransaction;
    } else {
      setSnapGuides([]);
      setSpacingHints([]);
      setDistanceHint(null);
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
        const element = page.elements.find((item) => item.id === preview.id);
        const preserveTextMetrics = interaction.kind === 'resize' && element?.type === 'NewTextArea';
        if (!preserveTextMetrics && element) {
          applyElementTransform(object, { ...element, ...preview });
        } else {
          object.x = preview.x;
          object.y = preview.y;
          object.rotation = preview.rotation;
          if (!preserveTextMetrics) {
            object.width = preview.width;
            object.height = preview.height;
          }
        }
        if (preserveTextMetrics && element) {
          scheduleTextResizePreview(element, preview.width, preview.height);
        }
      }
    }
    setPreviewTransforms(interaction.transaction.preview);
    setPreviewFrame(interaction.transaction.previewFrame);
    setPreviewAngle(interaction.kind === 'rotate' ? interaction.transaction.angleDelta : null);
  }, [overlayFontFamily, pageHeight, pageWidth, pointerToWorld, scheduleTextResizePreview, setLocalMarquee, updateHoverDistance]);

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
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') setDistanceHint(null);
    };
    const onBlur = () => {
      setDistanceHint(null);
      cancel();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      cancel();
    };
  }, [finishInteraction]);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-canvas-interactive]')) return;
    const page = currentPageRef.current;
    const point = pointerToWorld(event.clientX, event.clientY);
    if (!page || !point) return;
    const hit = findTopElementAtPoint(page.elements, point, useEditorStore.getState().selectedElementIds);
    const elementMap = new Map(page.elements.map((element) => [element.id, element]));
    if (!hit || isElementLocked(hit, elementMap) || (hit.type !== 'NewTextArea' && hit.type !== 'Video')) return;
    if (hit.type === 'NewTextArea') {
      const selectDefaultContent = String(hit.props.text ?? '') === NEW_TEXT_DEFAULT_CONTENT;
      setSelectAllTextOnEdit(selectDefaultContent);
      const inverse = invertMatrix(getElementWorldMatrix(hit, page.elements));
      setTextCaretPoint(selectDefaultContent ? null : (inverse ? transformPoint(inverse, point) : null));
    } else {
      setSelectAllTextOnEdit(false);
      setTextCaretPoint(null);
    }
    setEditingId(hit.id);
  }, [pointerToWorld, setEditingId, setSelectAllTextOnEdit, setTextCaretPoint]);

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
  const editorLayerGroupIds = new Set(currentPage?.editorLayerGroups?.map((group) => group.id) ?? []);
  const containerIds = getContainerIds(displayElements);
  const containerElements = displayElements.filter((element) => (
    containerIds.has(element.id) && !isElementHidden(element, elementMap)
  ));
  const contextContainerIds = getSelectionContextContainerIds(displayElements, selectedIds);
  const overflowContextContainerIds = getSelectionOverflowContextContainerIds(displayElements, selectedIds);
  const selectionFrame = previewFrame ?? getSelectionFrame(displayElements, selectedIds, {
    includeLocked: true,
    editorLayerGroupIds,
  });
  const canTransform = getTransformRootIds(displayElements, selectedIds, editorLayerGroupIds).length > 0;
  const selectedTextMode = selectedElement?.type === 'NewTextArea'
    ? normalizeTextSizingMode(selectedElement.props.textSizingMode)
    : null;
  const resizeHandleDefinitions = selectedTextMode === 'auto'
    ? []
    : selectedTextMode === 'fixed-width' || (selectedElement && isChoiceOption(selectedElement, displayElements))
      ? HANDLE_DEFS.filter((definition) => definition.id === 'e' || definition.id === 'w')
      : HANDLE_DEFS;
  const selectedTextOverflow = selectedElement?.type === 'NewTextArea'
    ? layoutText(
      String(selectedElement.props.text ?? ''),
      selectedElement.width,
      selectedElement.height,
      selectedElement.props,
      overlayFontFamily,
    ).overflow
    : false;

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
      onPointerLeave={() => {
        if (!interactionRef.current) setDistanceHint(null);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {distanceHintsEnabled && distanceHint && (() => {
        const horizontal = distanceHint.axis === 'x';
        const start = Math.min(distanceHint.start, distanceHint.end);
        const length = Math.max(1, Math.abs(distanceHint.end - distanceHint.start) * zoom);
        const lineLeft = horizontal ? start * zoom + panX : distanceHint.cross * zoom + panX;
        const lineTop = horizontal ? distanceHint.cross * zoom + panY : start * zoom + panY;
        const label = formatSpacingDistance(distanceHint.distance);
        return (
          <>
            <div
              data-distance-hint-line={distanceHint.axis}
              style={{
                position: 'absolute',
                left: lineLeft,
                top: lineTop,
                width: horizontal ? length : 1,
                height: horizontal ? 1 : length,
                background: '#ff3366',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.72)',
                pointerEvents: 'none',
                zIndex: 41,
              }}
            >
              <span style={{
                position: 'absolute',
                left: horizontal ? 0 : -3,
                top: horizontal ? -3 : 0,
                width: horizontal ? 1 : 7,
                height: horizontal ? 7 : 1,
                background: '#ff3366',
              }} />
              <span style={{
                position: 'absolute',
                right: horizontal ? 0 : undefined,
                bottom: horizontal ? undefined : 0,
                left: horizontal ? undefined : -3,
                top: horizontal ? -3 : undefined,
                width: horizontal ? 1 : 7,
                height: horizontal ? 7 : 1,
                background: '#ff3366',
              }} />
            </div>
            <div
              data-distance-hint-value={label}
              style={{
                position: 'absolute',
                left: horizontal ? lineLeft + length / 2 : lineLeft + 7,
                top: horizontal ? lineTop - 15 : lineTop + length / 2,
                transform: horizontal ? 'translateX(-50%)' : 'translateY(-50%)',
                minWidth: 18,
                padding: '1px 4px',
                borderRadius: 4,
                color: '#fff',
                background: '#e11d48',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.8), 0 2px 5px rgba(0, 0, 0, 0.35)',
                fontSize: 10,
                fontWeight: 600,
                lineHeight: '14px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 42,
              }}
            >
              {label}
            </div>
          </>
        );
      })()}

      {distanceHintsEnabled && spacingHints.flatMap((hint, hintIndex) => hint.segments.map((segment, segmentIndex) => {
        const horizontal = segment.axis === 'x';
        const start = Math.min(segment.start, segment.end);
        const length = Math.max(1, Math.abs(segment.end - segment.start) * zoom);
        const lineLeft = horizontal ? start * zoom + panX : segment.cross * zoom + panX;
        const lineTop = horizontal ? segment.cross * zoom + panY : start * zoom + panY;
        const label = formatSpacingDistance(segment.distance);
        return (
          <React.Fragment key={`${hint.axis}-${hintIndex}-${segmentIndex}`}>
            <div
              data-equal-spacing-line={segment.axis}
              style={{
                position: 'absolute',
                left: lineLeft,
                top: lineTop,
                width: horizontal ? length : 1,
                height: horizontal ? 1 : length,
                background: '#ff3366',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.72)',
                pointerEvents: 'none',
                zIndex: 41,
              }}
            >
              <span style={{
                position: 'absolute',
                left: horizontal ? 0 : -3,
                top: horizontal ? -3 : 0,
                width: horizontal ? 1 : 7,
                height: horizontal ? 7 : 1,
                background: '#ff3366',
              }} />
              <span style={{
                position: 'absolute',
                right: horizontal ? 0 : undefined,
                bottom: horizontal ? undefined : 0,
                left: horizontal ? undefined : -3,
                top: horizontal ? -3 : undefined,
                width: horizontal ? 1 : 7,
                height: horizontal ? 7 : 1,
                background: '#ff3366',
              }} />
            </div>
            <div
              data-equal-spacing-distance={label}
              style={{
                position: 'absolute',
                left: horizontal
                  ? lineLeft + length / 2
                  : lineLeft + 7,
                top: horizontal
                  ? lineTop - 15
                  : lineTop + length / 2,
                transform: horizontal ? 'translateX(-50%)' : 'translateY(-50%)',
                minWidth: 18,
                padding: '1px 4px',
                borderRadius: 4,
                color: '#fff',
                background: '#e11d48',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.8), 0 2px 5px rgba(0, 0, 0, 0.35)',
                fontSize: 10,
                fontWeight: 600,
                lineHeight: '14px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 42,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      }))}

      {showSnapGuides && snapGuides.map((guide, index) => {
        const vertical = guide.axis === 'x';
        const start = Math.min(guide.start, guide.end);
        const guideOverhang = 10;
        const length = Math.max(1, Math.abs(guide.end - guide.start) * zoom) + guideOverhang * 2;
        return (
          <div
            key={`${guide.axis}-${guide.position}-${index}`}
            data-smart-snap-guide={guide.axis}
            style={{
              position: 'absolute',
              left: vertical
                ? guide.position * zoom + panX
                : start * zoom + panX - guideOverhang,
              top: vertical
                ? start * zoom + panY - guideOverhang
                : guide.position * zoom + panY,
              width: vertical ? 1 : length,
              height: vertical ? length : 1,
              background: '#ff3366',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.78), 0 0 5px rgba(255, 51, 102, 0.9)',
              pointerEvents: 'none',
              zIndex: 40,
            }}
          />
        );
      })}

      {containerElements.map((element) => {
        const bounds = getElementWorldBounds(element, displayElements);
        const rect = worldRectToScreen(bounds.x, bounds.y, bounds.width, bounds.height, panX, panY, zoom);
        const selected = selectedIds.includes(element.id);
        const contextHighlighted = contextContainerIds.has(element.id);
        const overflowHighlighted = overflowContextContainerIds.has(element.id);
        const label = element.name || element.type;
        return (
          <div
            key={`container-${element.id}`}
            data-container-context={contextHighlighted ? 'true' : undefined}
            data-container-overflow={overflowHighlighted ? 'true' : undefined}
            style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: selected
              ? '1px dashed rgba(59, 130, 246, 0.9)'
              : overflowHighlighted
                ? '2px dashed rgb(245, 158, 11)'
                : contextHighlighted
                ? '2px dashed rgb(34, 211, 238)'
                : '1px dashed rgba(148, 163, 184, 0.55)',
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
              color: selected
                ? '#bfdbfe'
                : overflowHighlighted
                  ? '#fffbeb'
                  : contextHighlighted
                    ? '#ecfeff'
                    : 'rgba(203, 213, 225, 0.8)',
              background: selected
                ? 'rgba(30, 64, 175, 0.9)'
                : overflowHighlighted
                  ? 'rgba(146, 64, 14, 0.95)'
                  : contextHighlighted
                  ? 'rgba(8, 145, 178, 0.95)'
                  : 'rgba(30, 41, 59, 0.78)',
              fontSize: 10,
              fontWeight: selected || contextHighlighted || overflowHighlighted ? 600 : 400,
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
            border: selectedElement?.type === 'NewTextArea' ? '1px solid #fff' : canTransform ? '1px solid #3b82f6' : '1px solid #f59e0b',
            boxShadow: selectedElement?.type === 'NewTextArea'
              ? `0 0 0 2px ${selectedTextOverflow ? '#f97316' : '#1677ff'}, 0 2px 8px rgba(0, 0, 0, 0.9)`
              : undefined,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            transform: `rotate(${selectionFrame.rotation}deg)`,
            transformOrigin: '0 0',
          }}>
            {canTransform && resizeHandleDefinitions.map((definition) => (
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
                  boxShadow: '0 1px 4px rgba(0,0,0,0.9)',
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
        const memberFrame = getSelectionFrame(displayElements, [element.id], { editorLayerGroupIds });
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
        const liveLayout = layoutText(textDraft, editingElement.width, editingElement.height, props, overlayFontFamily);
        const matrix = getElementWorldMatrix(editingElement, elements);
        const decorationScale = 1 / Math.max(zoom, 0.05);
        return (
          <div data-canvas-interactive data-text-editor data-text-editor-state="editing" style={{
            position: 'absolute',
            left: matrix.tx * zoom + panX,
            top: matrix.ty * zoom + panY,
            width: liveLayout.width,
            height: liveLayout.height,
            transform: `matrix(${matrix.a * zoom}, ${matrix.b * zoom}, ${matrix.c * zoom}, ${matrix.d * zoom}, 0, 0)`,
            transformOrigin: '0 0',
            zIndex: 50,
            background: 'transparent',
            backgroundColor: 'transparent',
            outline: `${2 * decorationScale}px solid #06b6d4`,
            outlineOffset: decorationScale,
            boxShadow: `0 0 0 ${decorationScale}px #fff, 0 0 0 ${4 * decorationScale}px rgba(8, 145, 178, 0.38), 0 ${3 * decorationScale}px ${10 * decorationScale}px rgba(0, 0, 0, 0.9)`,
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            cursor: 'text',
          }}>
            <textarea
              ref={textAreaRef}
              value={textDraft}
              aria-label="编辑文本"
              onChange={(event) => setTextDraftState({ id: editingElement.id, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={finishTextEditing}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                backgroundColor: 'transparent',
                backgroundImage: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                resize: 'none',
                cursor: 'text',
                caretColor: '#ff2d55',
                overflow: normalizeTextSizingMode(props.textSizingMode) === 'fixed' ? 'auto' : 'hidden',
                fontFamily: `"${overlayFontFamily}"`,
                fontSize,
                fontWeight: props.bold ? 700 : 400,
                fontStyle: props.italic ? 'italic' : 'normal',
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
              src={getCourseResourceUrl(courseId, videoUrl)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      })()}
    </div>
  );
}
