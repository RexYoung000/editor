import { useMemo, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ChevronDown,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { findCanvasElementPage } from '../utils/internalPages';
import { getTransformRootIds } from '../utils/canvasSelection';
import type { SelectionAlignmentDirection } from '../utils/selectionSet';

const ALIGNMENT_ACTIONS: Array<{
  direction: SelectionAlignmentDirection;
  label: string;
  title: string;
  icon: typeof AlignStartVertical;
}> = [
  { direction: 'left', label: '左对齐', title: '左对齐', icon: AlignStartVertical },
  { direction: 'centerH', label: '水平居中', title: '水平居中', icon: AlignCenterVertical },
  { direction: 'right', label: '右对齐', title: '右对齐', icon: AlignEndVertical },
  { direction: 'top', label: '顶部对齐', title: '顶部对齐', icon: AlignStartHorizontal },
  { direction: 'centerV', label: '垂直居中', title: '垂直居中', icon: AlignCenterHorizontal },
  { direction: 'bottom', label: '底部对齐', title: '底部对齐', icon: AlignEndHorizontal },
];

function ActionButton({
  direction,
  label,
  title,
  icon: Icon,
  disabled,
  compact = false,
  onClick,
}: {
  direction: SelectionAlignmentDirection;
  label: string;
  title: string;
  icon: typeof AlignStartVertical;
  disabled: boolean;
  compact?: boolean;
  onClick: (direction: SelectionAlignmentDirection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(direction)}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={`flex items-center justify-center gap-1 rounded border border-slate-600 bg-slate-800/90 text-slate-200 transition-colors hover:border-blue-400 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${compact ? 'w-full px-2 py-1.5 text-[11px]' : 'h-7 w-7'}`}
    >
      <Icon size={compact ? 13 : 14} aria-hidden="true" />
      {compact && <span>{label}</span>}
    </button>
  );
}

export default function SelectionArrangeToolbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const currentSubPageId = useEditorStore((state) => state.currentSubPageId);
  const currentInternalPageId = useEditorStore((state) => state.currentInternalPageId);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const selectedEditorLayerGroupId = useEditorStore((state) => state.selectedEditorLayerGroupId);
  const alignElements = useEditorStore((state) => state.alignElements);

  const editableCount = useMemo(() => {
    const page = findCanvasElementPage(currentCourse, currentSubPageId, currentInternalPageId);
    if (!page) return 0;
    return getTransformRootIds(
      page.elements,
      selectedElementIds,
      page.editorLayerGroups?.map((group) => group.id),
    ).length;
  }, [currentCourse, currentInternalPageId, currentSubPageId, selectedElementIds]);

  if (selectedEditorLayerGroupId || selectedElementIds.length < 2) return null;

  const alignmentDisabled = editableCount < 2;
  const distributionDisabled = editableCount < 3;
  const alignmentTitle = alignmentDisabled ? '至少选择 2 个可编辑图层' : undefined;
  const distributionTitle = distributionDisabled ? '至少选择 3 个可编辑图层' : undefined;
  const handleAction = (direction: SelectionAlignmentDirection) => {
    alignElements(direction);
    setMenuOpen(false);
  };

  return (
    <div
      data-keep-selection
      data-canvas-interactive
      className="absolute left-1/2 top-3 z-40 -translate-x-1/2"
      aria-label="排列工具"
    >
      <div className="hidden items-center gap-1 rounded-lg border border-slate-600 bg-slate-950/90 px-2 py-1.5 shadow-xl backdrop-blur sm:flex">
        <span className="px-1 text-[11px] font-medium text-slate-300">排列</span>
        <span className="h-4 w-px bg-slate-700" aria-hidden="true" />
        {ALIGNMENT_ACTIONS.slice(0, 3).map((action) => (
          <ActionButton key={action.direction} {...action} disabled={alignmentDisabled} title={alignmentDisabled ? (alignmentTitle ?? action.title) : action.title} onClick={handleAction} />
        ))}
        <span className="mx-0.5 h-4 w-px bg-slate-700" aria-hidden="true" />
        {ALIGNMENT_ACTIONS.slice(3).map((action) => (
          <ActionButton key={action.direction} {...action} disabled={alignmentDisabled} title={alignmentDisabled ? (alignmentTitle ?? action.title) : action.title} onClick={handleAction} />
        ))}
        <span className="mx-0.5 h-4 w-px bg-slate-700" aria-hidden="true" />
        <button
          type="button"
          onClick={() => handleAction('distributeH')}
          disabled={distributionDisabled}
          title={distributionTitle}
          aria-label="水平分布"
          className="rounded border border-slate-600 bg-slate-800/90 px-1.5 py-1 text-[10px] text-slate-200 transition-colors hover:border-blue-400 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          横向分布
        </button>
        <button
          type="button"
          onClick={() => handleAction('distributeV')}
          disabled={distributionDisabled}
          title={distributionTitle}
          aria-label="垂直分布"
          className="rounded border border-slate-600 bg-slate-800/90 px-1.5 py-1 text-[10px] text-slate-200 transition-colors hover:border-blue-400 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          纵向分布
        </button>
      </div>

      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950/90 px-3 text-xs font-medium text-slate-200 shadow-xl backdrop-blur hover:border-blue-400 hover:bg-slate-800"
        >
          排列
          <ChevronDown size={13} className={menuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
        </button>
        {menuOpen && (
          <div role="menu" aria-label="排列工具菜单" className="absolute left-1/2 top-10 grid w-48 -translate-x-1/2 grid-cols-2 gap-1 rounded-lg border border-slate-600 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
            {ALIGNMENT_ACTIONS.map((action) => (
              <ActionButton key={action.direction} {...action} compact disabled={alignmentDisabled} title={alignmentDisabled ? (alignmentTitle ?? action.title) : action.title} onClick={handleAction} />
            ))}
            <ActionButton
              direction="distributeH"
              label="横向分布"
              title={distributionTitle ?? '横向分布'}
              icon={AlignCenterHorizontal}
              compact
              disabled={distributionDisabled}
              onClick={handleAction}
            />
            <ActionButton
              direction="distributeV"
              label="纵向分布"
              title={distributionTitle ?? '纵向分布'}
              icon={AlignCenterVertical}
              compact
              disabled={distributionDisabled}
              onClick={handleAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
