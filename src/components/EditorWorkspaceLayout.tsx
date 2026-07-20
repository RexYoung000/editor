import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronRight, FolderPlus, GripVertical, Layers, RotateCcw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { findActiveElementPage, isInternalPagesWorkbenchReadonly } from '../utils/internalPages';
import { getNextEditorLayerGroupName, resolveEditorLayerGroups } from '../utils/layerGroups';
import { showToast } from '../utils/toast';
import {
  DEFAULT_LAYER_PANEL_LAYOUT,
  LAYER_PANEL_HEADER_SIZE,
  LAYER_PANEL_LAYOUT_STORAGE_KEY,
  constrainBottomHeight,
  constrainFloatingLayerPanel,
  constrainSideWidth,
  normalizeLayerPanelLayout,
  resolveLayerPanelSnap,
  type LayerPanelLayoutState,
  type LayerPanelMode,
} from '../utils/layerPanelLayout';
import ElementList from './ElementList';

interface EditorWorkspaceLayoutProps {
  sidebar: ReactNode;
  sidebarWidth: number;
  sidebarOverflowVisible?: boolean;
  sidebarResizeHandle?: ReactNode;
  canvas: ReactNode;
  propertyPanel: ReactNode;
}

interface WorkspaceDimensions {
  width: number;
  height: number;
  propertyWidth: number;
}

interface PanelGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

const COLLAPSED_SIDE_WIDTH = 44;
const MIN_CANVAS_REMAINDER = 120;

function readLayerPanelLayout(): LayerPanelLayoutState {
  try {
    const stored = localStorage.getItem(LAYER_PANEL_LAYOUT_STORAGE_KEY);
    if (stored) return normalizeLayerPanelLayout(JSON.parse(stored));

    // 兼容专注工作区旧版只记录展开状态与高度的偏好。
    const legacy = JSON.parse(localStorage.getItem('forge:focus-workspace:layer-panel') ?? 'null') as {
      open?: boolean;
      height?: number;
    } | null;
    return normalizeLayerPanelLayout({
      ...DEFAULT_LAYER_PANEL_LAYOUT,
      open: legacy?.open,
      bottomHeight: legacy?.height,
    });
  } catch {
    return normalizeLayerPanelLayout(null);
  }
}

function saveLayerPanelLayout(layout: LayerPanelLayoutState) {
  localStorage.setItem(LAYER_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export default function EditorWorkspaceLayout({
  sidebar,
  sidebarWidth,
  sidebarOverflowVisible = false,
  sidebarResizeHandle,
  canvas,
  propertyPanel,
}: EditorWorkspaceLayoutProps) {
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const currentSubPageId = useEditorStore((state) => state.currentSubPageId);
  const currentInternalPageId = useEditorStore((state) => state.currentInternalPageId);
  const addEditorLayerGroup = useEditorStore((state) => state.addEditorLayerGroup);
  const currentPage = findActiveElementPage(currentCourse, currentSubPageId, currentInternalPageId);
  const workbenchReadonly = useEditorStore((state) => isInternalPagesWorkbenchReadonly(
    state.currentCourse,
    state.currentSubPageId,
    state.focusSubPageId,
  ));

  const [layout, setLayout] = useState(readLayerPanelLayout);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const propertyRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayerPanelLayoutState>(layout);
  const cleanupInteractionRef = useRef<(() => void) | null>(null);
  const [dimensions, setDimensions] = useState<WorkspaceDimensions>({ width: 0, height: 0, propertyWidth: 256 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [snapTarget, setSnapTarget] = useState<Exclude<LayerPanelMode, 'floating'> | null>(null);

  const previewLayout = useCallback((next: LayerPanelLayoutState) => {
    layoutRef.current = next;
    setLayout(next);
  }, []);

  const commitLayout = useCallback((next: LayerPanelLayoutState) => {
    previewLayout(next);
    saveLayerPanelLayout(next);
  }, [previewLayout]);

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    const property = propertyRef.current;
    if (!workspace || !property) return;
    const measure = () => {
      const workspaceRect = workspace.getBoundingClientRect();
      const propertyRect = property.getBoundingClientRect();
      setDimensions((current) => {
        const next = {
          width: workspaceRect.width,
          height: workspaceRect.height,
          propertyWidth: propertyRect.width,
        };
        return current.width === next.width
          && current.height === next.height
          && current.propertyWidth === next.propertyWidth
          ? current
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    observer.observe(property);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => cleanupInteractionRef.current?.(), []);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || layoutRef.current.mode !== 'floating') return;
    const current = layoutRef.current;
    const floating = constrainFloatingLayerPanel(current.floating, dimensions);
    if (
      floating.x === current.floating.x
      && floating.y === current.floating.y
      && floating.width === current.floating.width
      && floating.height === current.floating.height
    ) return;
    commitLayout({ ...current, floating });
  }, [commitLayout, dimensions]);

  const availableSideWidth = Math.max(
    LAYER_PANEL_HEADER_SIZE,
    dimensions.width - sidebarWidth - dimensions.propertyWidth - MIN_CANVAS_REMAINDER,
  );
  const sideWidth = constrainSideWidth(layout.sideWidth, availableSideWidth);
  const bottomHeight = constrainBottomHeight(layout.bottomHeight, dimensions.height);
  const dockWidth = layout.open ? sideWidth : COLLAPSED_SIDE_WIDTH;
  const dockHeight = layout.open ? bottomHeight : LAYER_PANEL_HEADER_SIZE;
  const floating = constrainFloatingLayerPanel(layout.floating, dimensions);

  const panelGeometry: PanelGeometry = (() => {
    if (layout.mode === 'bottom') {
      return {
        left: 0,
        top: Math.max(0, dimensions.height - dockHeight),
        width: sidebarWidth,
        height: dockHeight,
      };
    }
    if (layout.mode === 'left') {
      return { left: sidebarWidth, top: 0, width: dockWidth, height: dimensions.height };
    }
    if (layout.mode === 'right') {
      return {
        left: Math.max(0, dimensions.width - dimensions.propertyWidth - dockWidth),
        top: 0,
        width: dockWidth,
        height: dimensions.height,
      };
    }
    return {
      left: floating.x,
      top: floating.y,
      width: floating.width,
      height: layout.open ? floating.height : LAYER_PANEL_HEADER_SIZE,
    };
  })();

  const cleanupInteraction = () => {
    cleanupInteractionRef.current?.();
    cleanupInteractionRef.current = null;
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dimensions.width <= 0 || dimensions.height <= 0) return;
    event.preventDefault();
    cleanupInteraction();
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect) return;

    const original = layoutRef.current;
    const dragWidth = original.mode === 'floating'
      ? floating.width
      : Math.min(Math.max(panelGeometry.width, 240), dimensions.width);
    const dragHeight = original.open
      ? Math.min(Math.max(
        original.mode === 'left' || original.mode === 'right'
          ? original.floating.height
          : panelGeometry.height,
        180,
      ), dimensions.height)
      : LAYER_PANEL_HEADER_SIZE;
    const initialFloating = constrainFloatingLayerPanel({
      x: panelGeometry.left,
      y: panelGeometry.top,
      width: dragWidth,
      height: dragHeight,
    }, dimensions);
    const pointerX = event.clientX - workspaceRect.left;
    const pointerY = event.clientY - workspaceRect.top;
    const offsetX = Math.min(initialFloating.width, Math.max(0, pointerX - initialFloating.x));
    const offsetY = Math.min(LAYER_PANEL_HEADER_SIZE, Math.max(0, pointerY - initialFloating.y));
    previewLayout({ ...original, mode: 'floating', floating: initialFloating });
    setDragging(true);

    let latest = layoutRef.current;
    let latestSnap: Exclude<LayerPanelMode, 'floating'> | null = null;
    let completed = false;
    const clear = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', keydown);
      cleanupInteractionRef.current = null;
      setDragging(false);
      setSnapTarget(null);
    };
    const move = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - workspaceRect.left;
      const y = moveEvent.clientY - workspaceRect.top;
      latest = {
        ...layoutRef.current,
        mode: 'floating',
        floating: constrainFloatingLayerPanel({
          ...layoutRef.current.floating,
          x: x - offsetX,
          y: y - offsetY,
        }, dimensions),
      };
      previewLayout(latest);
      latestSnap = resolveLayerPanelSnap(
        { x, y },
        {
          sidebarRight: sidebarWidth,
          propertyLeft: dimensions.width - dimensions.propertyWidth,
          workspaceHeight: dimensions.height,
        },
      );
      setSnapTarget(latestSnap);
    };
    const finish = () => {
      if (completed) return;
      completed = true;
      const next = latestSnap ? { ...latest, mode: latestSnap } : latest;
      commitLayout(next);
      clear();
    };
    const cancel = () => {
      if (completed) return;
      completed = true;
      previewLayout(original);
      clear();
    };
    const keydown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== 'Escape') return;
      keyboardEvent.preventDefault();
      cancel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', keydown);
    cleanupInteractionRef.current = cancel;
  };

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !layout.open) return;
    event.preventDefault();
    event.stopPropagation();
    cleanupInteraction();
    const original = layoutRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    let latest = original;
    let completed = false;
    setResizing(true);

    const clear = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', keydown);
      cleanupInteractionRef.current = null;
      setResizing(false);
    };
    const move = (moveEvent: PointerEvent) => {
      if (original.mode === 'bottom') {
        latest = {
          ...original,
          bottomHeight: constrainBottomHeight(original.bottomHeight + startY - moveEvent.clientY, dimensions.height),
        };
      } else if (original.mode === 'left') {
        latest = {
          ...original,
          sideWidth: constrainSideWidth(original.sideWidth + moveEvent.clientX - startX, availableSideWidth),
        };
      } else if (original.mode === 'right') {
        latest = {
          ...original,
          sideWidth: constrainSideWidth(original.sideWidth + startX - moveEvent.clientX, availableSideWidth),
        };
      } else {
        latest = {
          ...original,
          floating: constrainFloatingLayerPanel({
            ...original.floating,
            width: original.floating.width + moveEvent.clientX - startX,
            height: original.floating.height + moveEvent.clientY - startY,
          }, dimensions),
        };
      }
      previewLayout(latest);
    };
    const finish = () => {
      if (completed) return;
      completed = true;
      commitLayout(latest);
      clear();
    };
    const cancel = () => {
      if (completed) return;
      completed = true;
      previewLayout(original);
      clear();
    };
    const keydown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') cancel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', keydown);
    cleanupInteractionRef.current = cancel;
  };

  const resetLayout = () => commitLayout(normalizeLayerPanelLayout(DEFAULT_LAYER_PANEL_LAYOUT));
  const toggleOpen = () => commitLayout({ ...layoutRef.current, open: !layoutRef.current.open });
  const compactSide = !layout.open && (layout.mode === 'left' || layout.mode === 'right');
  const pageFrozen = Boolean(currentPage && 'frozen' in currentPage && currentPage.frozen);
  const canCreateLayerGroup = !pageFrozen && !workbenchReadonly;
  const createLayerGroup = () => {
    if (!canCreateLayerGroup || !currentPage) return;
    const groupId = addEditorLayerGroup(
      getNextEditorLayerGroupName(resolveEditorLayerGroups(currentPage)),
    );
    if (!groupId) showToast('图层组成员必须属于同一运行父级，且名称不能重复', 'error');
  };

  const leftReservation = layout.mode === 'left' ? dockWidth : 0;
  const rightReservation = layout.mode === 'right' ? dockWidth : 0;
  const bottomReservation = layout.mode === 'bottom' ? dockHeight : 0;

  return (
    <div ref={workspaceRef} className="relative flex-1 flex overflow-hidden">
      <div
        className={`relative bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 ${sidebarOverflowVisible ? 'overflow-visible z-30' : 'overflow-hidden'}`}
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{sidebar}</div>
        {bottomReservation > 0 && <div className="shrink-0" style={{ height: bottomReservation }} />}
        {sidebarResizeHandle}
      </div>

      {leftReservation > 0 && <div className="shrink-0" style={{ width: leftReservation }} />}
      <div className="relative z-0 flex-1 min-w-0 flex flex-col overflow-hidden">{canvas}</div>
      {rightReservation > 0 && <div className="shrink-0" style={{ width: rightReservation }} />}
      <div ref={propertyRef} className="shrink-0 flex">{propertyPanel}</div>

      {dragging && snapTarget && (
        <div className="pointer-events-none absolute inset-0 z-40" aria-hidden="true">
          {snapTarget === 'bottom' && (
            <div className="absolute left-3 bottom-2 h-px bg-blue-300/70" style={{ width: Math.max(0, sidebarWidth - 24) }}>
              <span className="absolute right-0 -top-6 rounded bg-slate-950/75 px-2 py-1 text-[10px] text-blue-200">停回左下角</span>
            </div>
          )}
          {snapTarget === 'left' && (
            <div className="absolute top-3 bottom-3 w-px bg-blue-300/70" style={{ left: sidebarWidth }}>
              <span className="absolute left-2 top-2 whitespace-nowrap rounded bg-slate-950/75 px-2 py-1 text-[10px] text-blue-200">吸附左侧</span>
            </div>
          )}
          {snapTarget === 'right' && (
            <div className="absolute top-3 bottom-3 w-px bg-blue-300/70" style={{ right: dimensions.propertyWidth }}>
              <span className="absolute right-2 top-2 whitespace-nowrap rounded bg-slate-950/75 px-2 py-1 text-[10px] text-blue-200">吸附右侧</span>
            </div>
          )}
        </div>
      )}

      <section
        data-layer-panel
        data-keep-selection
        data-layer-panel-mode={layout.mode}
        className={`absolute z-50 flex flex-col overflow-hidden border border-slate-600 text-white transition-[box-shadow,background-color] duration-150 ${
          layout.mode === 'floating'
            ? 'rounded-lg bg-slate-900/90 shadow-2xl backdrop-blur-md'
            : 'bg-slate-900'
        } ${dragging ? 'shadow-[0_18px_50px_rgba(0,0,0,0.48)]' : ''} ${resizing ? 'select-none' : ''}`}
        style={{
          left: panelGeometry.left,
          top: panelGeometry.top,
          width: panelGeometry.width,
          height: panelGeometry.height,
          opacity: dragging ? 0.65 : 1,
          visibility: dimensions.width > 0 && dimensions.height > 0 ? 'visible' : 'hidden',
        }}
      >
        <div className="h-9 shrink-0 flex items-center border-b border-slate-700/80 bg-slate-800/90">
          <div
            onPointerDown={beginDrag}
            className="h-full min-w-0 flex-1 cursor-grab active:cursor-grabbing flex items-center gap-2 px-2"
            title="拖动完整图层面板；靠近边缘可磁吸"
          >
            <GripVertical size={15} className="shrink-0 text-slate-500" />
            {!compactSide && <Layers size={15} className="shrink-0 text-slate-300" />}
            {!compactSide && <span className="truncate text-xs font-medium text-slate-100">图层</span>}
            {!compactSide && <span className="text-[11px] text-slate-500">({currentPage?.elements.length ?? 0})</span>}
          </div>
          {!compactSide && (
            <button
              type="button"
              onClick={createLayerGroup}
              disabled={!canCreateLayerGroup}
              className="p-1.5 text-slate-500 hover:text-slate-100 disabled:opacity-30"
              title="创建空图层组，随后拖入图层"
              aria-label="创建空图层组"
            >
              <FolderPlus size={14} />
            </button>
          )}
          {!compactSide && (
            <button
              type="button"
              onClick={resetLayout}
              className="p-1.5 text-slate-500 hover:text-slate-100"
              title="恢复默认布局"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleOpen}
            className="p-1.5 mr-1 text-slate-400 hover:text-white"
            title={layout.open ? '收起图层面板' : '展开图层面板'}
          >
            {layout.open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
        {layout.open && <div className="flex flex-1 min-h-0 flex-col overflow-hidden"><ElementList showHeader={false} /></div>}

        {layout.open && layout.mode === 'bottom' && (
          <div onPointerDown={beginResize} className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-400/70" title="拖动调整高度" />
        )}
        {layout.open && layout.mode === 'left' && (
          <div onPointerDown={beginResize} className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/70" title="拖动调整宽度" />
        )}
        {layout.open && layout.mode === 'right' && (
          <div onPointerDown={beginResize} className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/70" title="拖动调整宽度" />
        )}
        {layout.open && layout.mode === 'floating' && (
          <div onPointerDown={beginResize} className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize" title="拖动调整宽高">
            <span className="absolute right-1 bottom-1 h-2 w-2 border-r border-b border-slate-400" />
          </div>
        )}
      </section>
    </div>
  );
}
