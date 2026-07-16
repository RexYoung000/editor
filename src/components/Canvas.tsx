import { useEditorStore } from '../store/editorStore';
import { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import type { Element } from '../types';
import {
  preloadAtlas, removeObject,
  clearAllObjects, createLayaComponent, registerObject, getObject, syncTransform,
  initWorldRoot, setWorldTransform, getWorldTransform,
} from '../utils/layaBridge';
import { applyKlProps, drawPlaceholder } from '../utils/laya/components';
import { objects, canvasRoot, laya } from '../utils/laya/core';
import CanvasOverlay from './CanvasOverlay';
import { useI18n } from '../i18n/context';
import CanvasRuler, { RULER_PX } from './CanvasRuler';
import { createDefaultElement } from '../elements/elementMeta';
import { getCourseDirPath, readFileAsDataUrl } from '../utils/electronFs';
import { showToast } from '../utils/toast';
import { extractVideoFirstFrame, getCachedVideoThumbnail } from '../utils/videoThumbnail';
import { isFlatLesson, isVideoOnlyCourse } from '../utils/courseKind';
import { findCanvasElementPage } from '../utils/internalPages';
import {
  CANVAS_ZOOM_BUTTON_STEP,
  constrainViewportToWorkspace,
  fitCanvasViewport,
  panViewportByWheel,
  zoomViewportAtPoint,
  zoomViewportByWheel,
} from '../utils/canvasViewport';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

/**
 * 按"父先于子"的拓扑顺序排序子元素列表。
 * 用 BFS：先把所有以"无父"为父的（虽然这里都已带 parentId）放进队列，逐层展开。
 * 实际逻辑：把传入的 children 按它们的 parentId 是否已在 result 集合里 / 是顶层 / 是已处理过的子来分批加入。
 * 输入：所有带 parentId 的元素；输出：按层级顺序排序的相同元素，保证遍历时父对象一定已被创建。
 */
function sortChildrenParentFirst(children: Element[], topLevelIds: Set<string>): Element[] {
  const result: Element[] = [];
  const known = new Set<string>(topLevelIds);
  let pending = [...children];
  while (pending.length > 0) {
    const next: Element[] = [];
    let progressed = false;
    for (const el of pending) {
      if (el.parentId && known.has(el.parentId)) {
        result.push(el);
        known.add(el.id);
        progressed = true;
      } else {
        next.push(el);
      }
    }
    if (!progressed) {
      // 父亲不在 elements 里（数据异常）：把剩余按原顺序追加，避免死循环
      result.push(...next);
      break;
    }
    pending = next;
  }
  return result;
}

export default function Canvas() {
  const { t } = useI18n();
  const currentCourse    = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const currentInternalPageId = useEditorStore((s) => s.currentInternalPageId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectElement    = useEditorStore((s) => s.selectElement);
  const updateElement    = useEditorStore((s) => s.updateElement);
  const deleteElement    = useEditorStore((s) => s.deleteElement);
  const saveHistory      = useEditorStore((s) => s.saveHistory);
  const setPageThumbnail = useEditorStore((s) => s.setPageThumbnail);

  const layaHostRef = useRef<HTMLDivElement>(null);
  const resizeStageRef = useRef<(() => void) | null>(null);
  const frameLoopFnRef = useRef<(() => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [layaReady, setLayaReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const prevPageIdRef = useRef<string | null>(null);
  const prevElementsRef = useRef<Map<string, Element>>(new Map());

  // ─── 固定工作区 + 整体页面画布状态 ───
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });
  const [world, setWorldRaw] = useState({ zoom: 0.4, panX: 0, panY: 0 });
  const worldRef = useRef(world);
  const setWorld = useCallback((w: { zoom: number; panX: number; panY: number }) => {
    if (isNaN(w.zoom) || isNaN(w.panX) || isNaN(w.panY)) {
      console.warn('[forge] setWorld NaN detected:', w);
      console.trace('[forge] NaN callstack');
      const host = layaHostRef.current;
      const fallback = host
        ? fitCanvasViewport(host.clientWidth, host.clientHeight, CANVAS_W, CANVAS_H)
        : { zoom: 0.4, panX: 0, panY: 0 };
      worldRef.current = fallback;
      setWorldRaw(fallback);
      return;
    }
    const host = layaHostRef.current;
    const next = host && host.clientWidth > 0 && host.clientHeight > 0
      ? constrainViewportToWorkspace(w, host.clientWidth, host.clientHeight, CANVAS_W, CANVAS_H)
      : w;
    worldRef.current = next;
    setWorldRaw(next);
  }, []);
  useLayoutEffect(() => { worldRef.current = world; }, [world]);

  const currentPage = useMemo(
    () => findCanvasElementPage(currentCourse, currentSubPageId, currentInternalPageId),
    [currentCourse, currentSubPageId, currentInternalPageId],
  );

  const spacePressedRef = useRef(false);
  const panningRef = useRef(false);
  const panStartRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const showGridRef = useRef(false);
  const snap = (v: number) => showGridRef.current ? Math.round(v / 20) * 20 : Math.round(v);

  const layaContainerRef = useRef<HTMLElement | null>(null);

  // ─── 初始化 Laya ───
  const initLaya = useCallback(() => {
    const host = layaHostRef.current;
    if (!host || !window.Laya) return;

    // layaContainer 铺满 host（不再固定 1920×1080）
    const layaContainer = document.getElementById('layaContainer');
    if (layaContainer && layaContainer.parentElement !== host) {
      host.appendChild(layaContainer);
      layaContainerRef.current = layaContainer;
      Object.assign(layaContainer.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%',
      });
    }

    const L = laya();
    L.stage.screenAdaptationEnabled = false;

    // Laya 通过 canvas CSS transform 实现 viewport 偏移渲染（如左侧栏宽度 156px），
    // 导致 Laya 渲染和 DOM overlay 不对齐。用 Laya timer 每帧强制 canvas.style.transform = none，
    // 并守护 worldRoot 变换，避免内部页面重建或预览返回后标尺与实际画布采用不同视口。
    // 注意：_canvasTransform.tx/ty 不重置！它们是 Laya 鼠标坐标转换所需的，
    // 清零会导致命中检测偏移。
    const resetCanvasRendering = () => {
      const canvasEl = host.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvasEl && canvasEl.style.transform && canvasEl.style.transform !== 'none') {
        canvasEl.style.transform = 'none';
        canvasEl.style.transformOrigin = '0 0';
      }
      const expected = worldRef.current;
      const actual = getWorldTransform();
      if (
        Math.abs(actual.panX - expected.panX) > 0.01
        || Math.abs(actual.panY - expected.panY) > 0.01
        || Math.abs(actual.zoom - expected.zoom) > 0.0001
      ) {
        setWorldTransform(expected.panX, expected.panY, expected.zoom);
      }
    };
    L.timer.frameLoop(1, null, resetCanvasRendering);
    frameLoopFnRef.current = resetCanvasRendering;

    // stage 跟随 host 尺寸（铺满视口）
    const hostRect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    L.stage.width = hostRect.width;
    L.stage.height = hostRect.height;
    L.stage.setScreenSize(hostRect.width * dpr, hostRect.height * dpr);
    setWorkspaceSize({ width: hostRect.width, height: hostRect.height });
    resetCanvasRendering();

    const resizeStage = () => {
      const r = host.getBoundingClientRect();
      const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
      const lc = layaContainerRef.current;
      const dpr2 = window.devicePixelRatio || 1;
      L.stage.width = r.width;
      L.stage.height = r.height;
      L.stage.setScreenSize(r.width * dpr2, r.height * dpr2);
      resetCanvasRendering();
      L.stage.bgColor = '#1e293b';
      // 强制 layaContainer 铺满 host
      if (lc) {
        lc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;margin:0;padding:0;border:0;';
      }
      // 强制 canvas 铺满 host，同时用 transform:none 清除 Laya 可能设置的 CSS 偏移
      if (canvas) {
        canvas.style.cssText = `position:absolute;top:0;left:0;width:${r.width}px;height:${r.height}px;margin:0;padding:0;border:0;transform:none;transform-origin:0 0;`;
      }
      setWorkspaceSize((previous) => previous.width === r.width && previous.height === r.height
        ? previous
        : { width: r.width, height: r.height });
      // 工作区变化时只约束页面的可见范围，不改变当前缩放比例。
      setWorld({ ...worldRef.current });
      setWorldTransform(worldRef.current.panX, worldRef.current.panY, worldRef.current.zoom);
    };
    resizeStageRef.current = resizeStage;
    resizeStage();
    const ro = new ResizeObserver(resizeStage);
    ro.observe(host);
    resizeObserverRef.current = ro;

    preloadAtlas().then(() => {
      // Klzz/GameLoader 可能修改了 stage，需要重置为 viewport 尺寸
      resizeStage();
      // worldRoot + boundaryFrame
      initWorldRoot();
      // 初始状态让完整页面占据工作区约九成，并明确显示页面边界。
      const initialViewport = fitCanvasViewport(host.clientWidth, host.clientHeight, CANVAS_W, CANVAS_H);
      setWorld(initialViewport);
      setWorldTransform(initialViewport.panX, initialViewport.panY, initialViewport.zoom);
      setLayaReady(true);
    });
  }, [setWorld]);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.Laya?.stage) { clearInterval(timer); initLaya(); }
      if (Date.now() - start > 30000) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [initLaya]);

  // ─── world 变化时同步到 worldRoot ───
  useLayoutEffect(() => {
    if (!layaReady) return;
    setWorldTransform(world.panX, world.panY, world.zoom);
  }, [world, layaReady]);

  const captureThumb = useCallback((pageId: string) => {
    const canvas = layaHostRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    try { setPageThumbnail(pageId, canvas.toDataURL('image/jpeg', 0.5)); } catch { /* tainted */ }
  }, [setPageThumbnail]);

  // ─── 课件切换：强制清除所有对象 ───
  // 必须在重建元素之前更新 __forgeCourseId，否则 Spine 动画会用旧 courseId 拼 forge-local URL，
  // 导致 templet._path 指向旧课件目录，音频路径错误。
  useEffect(() => {
    if (!layaReady) return;
    if (currentCourse) {
      (window as unknown as { __forgeCourseId?: string }).__forgeCourseId = currentCourse.id;
    }
    clearAllObjects();
    prevElementsRef.current = new Map();
  }, [currentCourse, layaReady]);

  // ─── 页面切换：全量重建 ───
  useEffect(() => {
    if (!layaReady) return;
    if (!currentPage) {
      if (prevPageIdRef.current) captureThumb(prevPageIdRef.current);
      prevPageIdRef.current = null;
      clearAllObjects();
      prevElementsRef.current = new Map();
      return;
    }
    if (prevPageIdRef.current && prevPageIdRef.current !== currentPage.id) {
      captureThumb(prevPageIdRef.current);
    }
    prevPageIdRef.current = currentPage.id;
    clearAllObjects();
    prevElementsRef.current = new Map();
    const topLevel = currentPage.elements.filter(e => !e.parentId);
    const children = currentPage.elements.filter(e => e.parentId);
    topLevel.forEach((el) => {
      const obj = createLayaComponent(el);
      if (obj) registerObject(el.id, obj);
    });
    // 按"父先于子"的拓扑顺序创建：避免子元素在 elements 数组里出现得比父早时挂错位置
    const sortedChildren = sortChildrenParentFirst(children, new Set(topLevel.map(e => e.id)));
    sortedChildren.forEach((el) => {
      const parentObj = el.parentId ? getObject(el.parentId) : undefined;
      const obj = createLayaComponent(el, parentObj);
      if (obj) registerObject(el.id, obj);
    });
    prevElementsRef.current = new Map(currentPage.elements.map(e => [e.id, { ...e, props: { ...e.props } }]));
    let cancelled = false;
    setTimeout(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          captureThumb(currentPage.id);
        });
      });
    }, 500);
    return () => { cancelled = true; };
  }, [currentPage?.id, layaReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 统一同步 effect：增删改 + z-order ───
  useEffect(() => {
    if (!layaReady || !currentPage) return;
    const prev = prevElementsRef.current;
    const next = new Map(currentPage.elements.map(e => [e.id, e]));
    const _objs = objects();

    for (const id of _objs.keys()) {
      if (!next.has(id)) removeObject(id);
    }

    // 按"父先于子"顺序遍历：处理新增对象时确保父对象已存在
    // 现存对象不受顺序影响，所以排序只对 obj 不存在（即新建）那条分支起作用
    const allEls = currentPage.elements;
    const topLevelIds = new Set(allEls.filter(e => !e.parentId).map(e => e.id));
    const childrenSorted = sortChildrenParentFirst(allEls.filter(e => e.parentId), topLevelIds);
    const iterOrder = [...allEls.filter(e => !e.parentId), ...childrenSorted];
    for (const el of iterOrder) {
      const id = el.id;
      const obj = getObject(id);
      if (!obj) {
        const parentObj = el.parentId ? getObject(el.parentId) : undefined;
        const newObj = createLayaComponent(el, parentObj);
        if (newObj) registerObject(el.id, newObj);
      } else {
        const prevEl = prev.get(id);
        if (prevEl && prevEl.parentId !== el.parentId) {
          obj.removeSelf?.();
          const newParent = el.parentId ? getObject(el.parentId) : canvasRoot();
          if (newParent?.addChild) newParent.addChild(obj);
        }
        if (!prevEl || prevEl.x !== el.x || prevEl.y !== el.y || prevEl.width !== el.width || prevEl.height !== el.height || prevEl.opacity !== el.opacity || prevEl.rotation !== el.rotation) {
          syncTransform(id, el.x, el.y, el.width, el.height);
          obj.alpha = el.opacity;
          obj.rotation = el.rotation;
          const sizeChanged = !prevEl || prevEl.width !== el.width || prevEl.height !== el.height;
          const isTextAreaEdit = el.layaType === 'TextArea';
          if (sizeChanged && !el.props?.skin && !obj.skin && !((obj._childs ?? obj._children) && (obj._childs ?? obj._children).length > 0) && !isTextAreaEdit && el.layaType !== 'DragViewBox' && el.type !== 'DragDropBox' && el.type !== 'DragDragBox') {
            drawPlaceholder(obj, el);
          }
        }
        if (!prevEl || prevEl.props !== el.props) {
          applyKlProps(obj, el);
        }
      }
    }

    // z-order 同步：页面背景和边框位于 index 0，元素从 index 1 开始。
    const root = canvasRoot();
    if (root) {
      const topLevel = currentPage.elements.filter(e => !e.parentId);
      topLevel.forEach((el, i) => {
        const obj = getObject(el.id);
        if (obj?.parent === root) {
          try { root.setChildIndex(obj, i + 1); } catch { /* ignore */ }
        }
      });
      // 子元素 z-order 同步：同一父容器内按 elements 数组顺序排列
      const parentIds = new Set(currentPage.elements.filter(e => e.parentId).map(e => e.parentId!));
      for (const pid of parentIds) {
        const parentObj = getObject(pid);
        if (!parentObj) continue;
        const children = currentPage.elements.filter(e => e.parentId === pid);
        children.forEach((el, i) => {
          const obj = getObject(el.id);
          if (obj?.parent === parentObj) {
            try { parentObj.setChildIndex(obj, i); } catch { /* ignore */ }
          }
        });
      }
    }

    prevElementsRef.current = new Map(currentPage.elements.map(e => [e.id, { ...e, props: { ...e.props } }]));

    // 异步提取 Video 元素的缩略图，data URL 直接赋 skin，不走 Laya loader
    const videoElements = currentPage.elements.filter(e => e.type === 'Video');
    if (videoElements.length > 0 && currentCourse) {
      const courseId = currentCourse.id;
      for (const el of videoElements) {
        const videoUrl = (el.props as Record<string, unknown>)?.videoUrl as string;
        if (!videoUrl) continue;
        const applyThumbnail = (thumbnail: string) => {
          const obj = getObject(el.id);
          if (obj) {
            try { obj.skin = thumbnail; } catch { /* ignore */ }
          }
        };
        const cached = getCachedVideoThumbnail(videoUrl);
        if (cached) {
          applyThumbnail(cached);
        } else {
          extractVideoFirstFrame(videoUrl, courseId).then((thumbnail) => {
            if (thumbnail) applyThumbnail(thumbnail);
          });
        }
      }
    }
  }, [currentPage?.elements, layaReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 预览关闭后重建 ───
  useEffect(() => {
    const handler = () => {
      if (!currentPage) return;
      clearAllObjects();
      prevElementsRef.current = new Map();
      const topLevel = currentPage.elements.filter(e => !e.parentId);
      const children = currentPage.elements.filter(e => e.parentId);
      topLevel.forEach((el) => {
        const obj = createLayaComponent(el);
        if (obj) registerObject(el.id, obj);
      });
      // 按"父先于子"的拓扑顺序创建子元素
      const sortedChildren = sortChildrenParentFirst(children, new Set(topLevel.map(e => e.id)));
      sortedChildren.forEach((el) => {
        const parentObj = el.parentId ? getObject(el.parentId) : undefined;
        const obj = createLayaComponent(el, parentObj);
        if (obj) registerObject(el.id, obj);
      });
      prevElementsRef.current = new Map(currentPage.elements.map(e => [e.id, { ...e, props: { ...e.props } }]));
      // 恢复编辑态 world transform + stage 尺寸
      resizeStageRef.current?.();
      setWorldTransform(worldRef.current.panX, worldRef.current.panY, worldRef.current.zoom);
    };
    window.addEventListener('forge:preview-closed', handler);
    return () => window.removeEventListener('forge:preview-closed', handler);
  }, [currentPage]);

  useEffect(() => {
    return () => {
      try {
        // Stop Laya frameLoop
        const L = laya();
        if (L && frameLoopFnRef.current) {
          L.timer.clear(null, frameLoopFnRef.current);
        }
        frameLoopFnRef.current = null;
        // Disconnect ResizeObserver
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        // Clear all Laya objects
        clearAllObjects();
        // Move layaContainer off-screen and hide it
        const lc = layaContainerRef.current;
        if (lc && lc.parentElement) {
          lc.style.display = 'none';
          document.body.appendChild(lc);
        }
      } catch (e) {
        console.warn('[forge] Canvas cleanup error:', e);
      }
    };
  }, []);

  // ─── 键盘：删除 + 方向键微调 ───
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // locked 元素不允许删除
        if (currentPage) {
          selectedElementIds.forEach((id) => {
            const el = currentPage.elements.find((e) => e.id === id);
            if (el && !el.locked) deleteElement(id);
          });
        }
        return;
      }

      const arrowMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      };
      const dir = arrowMap[e.key];
      if (dir && selectedElementIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        selectedElementIds.forEach((id) => {
          const el = currentPage?.elements.find((el) => el.id === id);
          if (el) updateElement(id, { x: el.x + dir[0] * step, y: el.y + dir[1] * step });
        });
        saveHistory();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedElementIds, deleteElement, currentPage, updateElement, saveHistory]);

  const [showGrid, setShowGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [dragHover, setDragHover] = useState(false);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);

  // ─── Axure 风格画布导航：空格拖拽、滚轮平移、修饰键缩放 ───
  const getZoomAnchor = useCallback(() => {
    const host = layaHostRef.current;
    if (!host) return null;
    return lastPointerRef.current ?? { x: host.clientWidth / 2, y: host.clientHeight / 2 };
  }, []);

  const zoomByStep = useCallback((direction: -1 | 1) => {
    const anchor = getZoomAnchor();
    if (!anchor) return;
    const viewport = worldRef.current;
    const nextZoom = Math.round((viewport.zoom + direction * CANVAS_ZOOM_BUTTON_STEP) * 100) / 100;
    setWorld(zoomViewportAtPoint(viewport, nextZoom, anchor));
  }, [getZoomAnchor, setWorld]);

  const zoomIn = useCallback(() => zoomByStep(1), [zoomByStep]);
  const zoomOut = useCallback(() => zoomByStep(-1), [zoomByStep]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const host = layaHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) return;
    e.preventDefault();
    const anchor = { x: localX, y: localY };
    lastPointerRef.current = anchor;
    const viewport = worldRef.current;
    const next = e.metaKey || e.ctrlKey
      ? zoomViewportByWheel(viewport, e.deltaY, e.deltaMode, rect.height, anchor)
      : panViewportByWheel(viewport, e.deltaX, e.deltaY, e.deltaMode, rect.width, rect.height, e.shiftKey);
    setWorld(next);
  }, [setWorld]);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || element?.isContentEditable;
    };
    const releaseNavigation = () => {
      spacePressedRef.current = false;
      panningRef.current = false;
      setSpacePressed(false);
      setIsPanning(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isEditableTarget(event.target)) return;
      event.preventDefault();
      if (!spacePressedRef.current) {
        spacePressedRef.current = true;
        setSpacePressed(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') releaseNavigation();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseNavigation);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseNavigation);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const host = layaHostRef.current;
      if (host) {
        const rect = host.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        if (localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height) {
          lastPointerRef.current = { x: localX, y: localY };
        }
      }
      if (!panningRef.current) return;
      setWorld({
        ...worldRef.current,
        panX: panStartRef.current.ox + event.clientX - panStartRef.current.mx,
        panY: panStartRef.current.oy + event.clientY - panStartRef.current.my,
      });
    };
    const onMouseUp = () => {
      if (!panningRef.current) return;
      panningRef.current = false;
      setIsPanning(false);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [setWorld]);

  useEffect(() => {
    if (!isPanning) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => { document.body.style.cursor = previous; };
  }, [isPanning]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const shouldPan = e.button === 1 || (e.button === 0 && spacePressedRef.current);
    if (!shouldPan) return;
    const host = layaHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) return;
    e.preventDefault();
    e.stopPropagation();
    panningRef.current = true;
    setIsPanning(true);
    panStartRef.current = { mx: e.clientX, my: e.clientY, ox: worldRef.current.panX, oy: worldRef.current.panY };
  }, []);

  const handleFitZoom = useCallback(() => {
    const host = layaHostRef.current;
    if (!host) return;
    setWorld(fitCanvasViewport(host.clientWidth, host.clientHeight, CANVAS_W, CANVAS_H));
  }, [setWorld]);

  // ─── 拖拽图片到画布 ───
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragHover) setDragHover(true);
  }, [dragHover]);

  const handleDragLeave = useCallback(() => { setDragHover(false); }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragHover(false);
    if (!currentCourse) return;

    const files = e.dataTransfer.files;
    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif'];
    const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
    const AUDIO_EXTS = ['.wav', '.mp3'];
    const imageFiles = Array.from(files).filter(f =>
      IMAGE_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)),
    );
    const videoFiles = Array.from(files).filter(f =>
      VIDEO_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)),
    );
    const audioFiles = Array.from(files).filter(f =>
      AUDIO_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)),
    );
    if (imageFiles.length === 0 && videoFiles.length === 0 && audioFiles.length === 0) return;

    // ── 视频文件：直接创建视频关卡（不依赖 currentSubPageId） ──
    if (videoFiles.length > 0) {
      const isReview = isVideoOnlyCourse(currentCourse.kind);
      const isFlat = isFlatLesson(currentCourse.kind);
      const target = useEditorStore.getState().selectedStageTarget ?? 'preview';
      const courseId = currentCourse.id;
      const courseDir = getCourseDirPath(courseId);
      for (const file of videoFiles) {
        if (file.size > 50 * 1024 * 1024) { showToast(t('fileTooLarge'), 'error'); continue; }
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
          const base64 = btoa(binary);
          const ext = file.name.split('.').pop() ?? 'mp4';
          const relPath = await window.electronAPI.saveImageToCourse(courseDir!, file.name, base64, ext);
          // 先创建视频关卡，再设置 videoUrl
          if (isReview) {
            // 复习课：直接创建视频关卡
            useEditorStore.getState().addVideoStage();
          } else if (isFlat) {
            // 作业/专题测评：单关卡结构，没有预习区，一律走 addStageFromPreset
            useEditorStore.getState().addStageFromPreset('video');
          } else {
            // 正课/预习：根据 selectedStageTarget 选择
            if (target === 'preview') {
              useEditorStore.getState().addPreviewStageFromPreset('video');
            } else {
              useEditorStore.getState().addStageFromPreset('video');
            }
          }
          // 找到刚创建的视频关卡的锁定元素，设置 videoUrl
          const state = useEditorStore.getState();
          const allStages = [...state.currentCourse?.stages ?? [], ...(state.currentCourse?.previewStages ?? [])];
          const lockedEl = allStages
            .flatMap(s => s.subPages)
            .find(sp => sp.id === state.currentSubPageId)
            ?.elements.find(e => e.locked);
          if (lockedEl) {
            useEditorStore.getState().updateElement(lockedEl.id, { props: { videoUrl: relPath } });
          }
        } catch {
          showToast(t('uploadFailed'), 'error');
        }
      }
      return;
    }

    // ── 音频/图片文件需要当前选中页面 ──
    if (!currentSubPageId) return;

    // ── 音频文件：创建 SoundButton 元素 ──
    if (audioFiles.length > 0) {
      if (currentPage?.frozen) return;
      const host = layaHostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const { zoom, panX, panY } = worldRef.current;
      const wx = (e.clientX - rect.left - panX) / zoom;
      const wy = (e.clientY - rect.top - panY) / zoom;
      const addElement = useEditorStore.getState().addElement;
      const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
      const courseId = currentCourse.id;
      const courseDir = getCourseDirPath(courseId);

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        if (file.size > 20 * 1024 * 1024) { showToast(t('fileTooLarge'), 'error'); continue; }
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
          const base64 = btoa(binary);
          const ext = file.name.split('.').pop() ?? 'wav';
          const relPath = await window.electronAPI.saveImageToCourse(courseDir!, file.name, base64, ext);

          const el = createDefaultElement('SoundButton', subPageId);
          el.props = { ...el.props, soundPath: relPath };
          el.x = snap(wx + i * 115 - 52);
          el.y = snap(wy + i * 20 - 53);
          addElement(el);
          selectElement(el.id, false);
        } catch {
          showToast(t('uploadFailed'), 'error');
        }
      }
      return;
    }

    // ── 图片文件：frozen 页面不允许拖入 ──
    if (currentPage?.frozen) return;

    // client → world 坐标
    const host = layaHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const { zoom, panX, panY } = worldRef.current;
    const wx = (e.clientX - rect.left - panX) / zoom;
    const wy = (e.clientY - rect.top - panY) / zoom;

    const addElement = useEditorStore.getState().addElement;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    const courseId = currentCourse.id;
    const courseDir = getCourseDirPath(courseId);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
        const base64 = btoa(binary);
        const ext = file.name.split('.').pop() ?? 'png';
        const relPath = await window.electronAPI.saveImageToCourse(courseDir!, file.name, base64, ext);

        const el = createDefaultElement('NewImage', subPageId);
        el.props = { ...el.props, skin: relPath };
        addElement(el);
        selectElement(el.id, false);

        const dataUrl = await readFileAsDataUrl(courseId, relPath);
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth, h = img.naturalHeight;
          if (w > 0 && h > 0) {
            useEditorStore.getState().updateElement(el.id, {
              x: snap(wx + i * 20 - w / 2),
              y: snap(wy + i * 20 - h / 2),
              width: w,
              height: h,
              props: { _naturalWidth: w, _naturalHeight: h },
            });
          }
        };
        img.src = dataUrl ?? relPath;
      } catch {
        showToast(t('uploadFailed'), 'error');
      }
    }
  }, [currentCourse, currentSubPageId, currentPage?.frozen, selectElement, t]);

  // 行内编辑元素
  const editingElement = editingId
    ? (currentPage?.elements.find((e) => e.id === editingId && (e.type === 'NewTextArea' || e.type === 'Video')) ?? null)
    : null;

  const pageScreenWidth = CANVAS_W * world.zoom;
  const pageScreenHeight = CANVAS_H * world.zoom;
  const pageRight = world.panX + pageScreenWidth;
  const pageBottom = world.panY + pageScreenHeight;
  const visiblePageLeft = Math.max(0, Math.min(workspaceSize.width, world.panX));
  const visiblePageTop = Math.max(0, Math.min(workspaceSize.height, world.panY));
  const visiblePageRight = Math.max(0, Math.min(workspaceSize.width, pageRight));
  const visiblePageBottom = Math.max(0, Math.min(workspaceSize.height, pageBottom));
  return (
    <div ref={canvasRef} className={`flex-1 flex flex-col overflow-hidden bg-slate-800 relative ${isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : ''}`}
        onMouseDownCapture={handleMouseDown}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onContextMenu={(e) => e.preventDefault()}>
      <div className="flex-1 overflow-hidden relative">
        {spacePressed && (
          <div
            className={`absolute inset-0 z-50 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            aria-hidden="true"
          />
        )}
        {/* 拖拽图片高亮 */}
        {dragHover && (
          <div className="absolute inset-0 border-2 border-blue-400 bg-blue-400/10 rounded pointer-events-none z-20" />
        )}
        {/* layaHost 铺满视口 */}
        <div ref={layaHostRef} data-laya-host className="absolute inset-0" />
        {/* 页面画布整体缩放平移；工作区遮罩同时明确页面边界并裁掉越界内容。 */}
        {workspaceSize.width > 0 && (
          <>
            <div className="absolute left-0 right-0 top-0 bg-slate-800 pointer-events-none" style={{ height: visiblePageTop, zIndex: 1 }} />
            <div className="absolute left-0 right-0 bottom-0 bg-slate-800 pointer-events-none" style={{ top: visiblePageBottom, zIndex: 1 }} />
            <div className="absolute left-0 top-0 bottom-0 bg-slate-800 pointer-events-none" style={{ width: visiblePageLeft, zIndex: 1 }} />
            <div className="absolute right-0 top-0 bottom-0 bg-slate-800 pointer-events-none" style={{ left: visiblePageRight, zIndex: 1 }} />
            <div className="absolute pointer-events-none border border-slate-400/70 shadow-[0_8px_24px_rgba(0,0,0,0.28)]" style={{
              left: world.panX,
              top: world.panY,
              width: pageScreenWidth,
              height: pageScreenHeight,
              zIndex: 3,
            }} />
          </>
        )}
        {currentPage?.kind === 'dialog' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3 py-1 rounded-full bg-slate-950/80 border border-violet-400/40 text-[11px] text-violet-200">
            弹窗编辑 · 主界面底板只读
          </div>
        )}
        {layaReady && (
          <div className="absolute inset-0" style={{ zIndex: 5 }}>
            <CanvasOverlay
              layaHostRef={layaHostRef}
              world={world}
              selectedIds={selectedElementIds}
              currentPage={currentPage}
              editingElement={editingElement}
              snap={snap}
              setEditingId={setEditingId}
            />
          </div>
        )}
        {!layaReady && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10">
            {t('layaInitializing')}
          </div>
        )}
        {layaReady && currentPage && currentPage.elements.length === 0 && (
          <div className="absolute flex items-center justify-center pointer-events-none" style={{
            left: world.panX,
            top: world.panY,
            width: pageScreenWidth,
            height: pageScreenHeight,
            zIndex: 2,
          }}>
            <div className="text-center text-slate-400/40">
              <div className="text-lg mb-2">{t('addComponentsHint')}</div>
              <div className="text-xs space-y-1">
                <div>{t('keyboardShortcuts')}</div>
                <div>{t('canvasHint')}</div>
              </div>
            </div>
          </div>
        )}
        {showGrid && (
          <div className="absolute pointer-events-none overflow-hidden" style={{
            left: world.panX,
            top: world.panY,
            width: pageScreenWidth,
            height: pageScreenHeight,
            zIndex: 2,
          }}>
            <div className="absolute" style={{
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px),
                linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)
              `,
              backgroundSize: `${20 * world.zoom}px ${20 * world.zoom}px, ${20 * world.zoom}px ${20 * world.zoom}px, ${100 * world.zoom}px ${100 * world.zoom}px, ${100 * world.zoom}px ${100 * world.zoom}px`,
            }} />
          </div>
        )}
        {/* 标尺 */}
        {showRuler && (
          <>
            <div className="absolute pointer-events-none bg-slate-800 border-r border-b border-slate-700" style={{ left: 0, top: 0, width: RULER_PX, height: RULER_PX, zIndex: 10 }} />
            <CanvasRuler orientation="horizontal" length={CANVAS_W} zoom={world.zoom} offsetX={RULER_PX} offsetY={RULER_PX} viewportLength={Math.max(0, workspaceSize.width - RULER_PX)} contentOffset={world.panX - RULER_PX} rulerWidth={RULER_PX} />
            <CanvasRuler orientation="vertical" length={CANVAS_H} zoom={world.zoom} offsetX={RULER_PX} offsetY={RULER_PX} viewportLength={Math.max(0, workspaceSize.height - RULER_PX)} contentOffset={world.panY - RULER_PX} rulerWidth={RULER_PX} />
          </>
        )}
      </div>

      <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center justify-center gap-3 px-4 shrink-0">
        <button onClick={handleFitZoom} className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-700">{t('fit')}</button>
        <button onClick={zoomOut} className="text-slate-400 hover:text-white w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-sm">−</button>
        <span className="text-xs text-slate-300 w-12 text-center" title="⌘/Ctrl + 滚轮缩放 · 空格 + 左键拖拽">{Math.round(world.zoom * 100)}%</span>
        <button onClick={zoomIn} className="text-slate-400 hover:text-white w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 text-sm">+</button>
        <span className="text-xs text-slate-600 ml-2">1920 × 1080</span>
        <button onClick={() => setShowGrid(!showGrid)} className={`ml-2 text-xs px-2 py-0.5 rounded ${showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          {t('grid')}
        </button>
        <button onClick={() => setShowRuler(!showRuler)} className={`text-xs px-2 py-0.5 rounded ${showRuler ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          {t('ruler')}
        </button>
      </div>
    </div>
  );
}
