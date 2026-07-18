import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  GripVertical,
  MoreHorizontal,
  MoveRight,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEditorStore, findSubPage } from '../store/editorStore';
import {
  analyzeInternalPageMove,
  collectInternalPageIssues,
  getElementPages,
  getInternalPageGroups,
  isInternalPagesSubPage,
  type InternalPageMoveImpact,
} from '../utils/internalPages';
import type { InternalPage, InternalPageGroup, InternalPageKind, SubPage } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from '../utils/toast';

type Filter = 'all' | 'content' | 'dialog' | 'issues';
type PagePlacement = { pageGroupId?: string; afterPageId?: string };
type DragState =
  | { type: 'page'; pageId: string }
  | { type: 'group'; groupId: string; sourceIndex: number };
type PageDrop = { pageGroupId?: string; targetIndex: number };
type MoveRequest = { pageId: string; targetSubPageId: string; targetIndex: number; targetName: string; impact: InternalPageMoveImpact };
type DeleteGroupRequest = { group: InternalPageGroup; deletePages: boolean };

const UNGROUPED_KEY = '__ungrouped__';

function stageForSubPage(course: ReturnType<typeof useEditorStore.getState>['currentCourse'], subPageId: string | null) {
  if (!course || !subPageId) return null;
  return [...course.stages, ...(course.previewStages ?? [])].find((stage) => stage.subPages.some((page) => page.id === subPageId)) ?? null;
}

function referenceCount(subPage: SubPage, pageId: string): number {
  let count = 0;
  for (const page of getElementPages(subPage)) {
    for (const element of page.elements) {
      for (const action of element.actions ?? []) {
        if (action.pageTargetId === pageId || action.afterClose?.pageTargetId === pageId) count++;
      }
    }
  }
  return count;
}

function externalGroupReferenceCount(subPage: SubPage, pageIds: Set<string>): number {
  let count = 0;
  for (const page of getElementPages(subPage)) {
    if (pageIds.has(page.id)) continue;
    for (const element of page.elements) {
      for (const action of element.actions ?? []) {
        if (action.pageTargetId && pageIds.has(action.pageTargetId)) count++;
        if (action.afterClose?.pageTargetId && pageIds.has(action.afterClose.pageTargetId)) count++;
      }
    }
  }
  return count;
}

function collapsedStorageKey(courseId: string | undefined, subPageId: string) {
  return `forge:focus-workspace:collapsed-groups:${courseId ?? 'course'}:${subPageId}`;
}

function readCollapsedGroups(key: string, validGroupIds: Set<string>): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
    return stored.filter((id) => validGroupIds.has(id));
  } catch {
    return [];
  }
}

function GroupDropSlot({
  active,
  onTarget,
  onComplete,
}: {
  active: boolean;
  onTarget: () => void;
  onComplete: () => void;
}) {
  return (
    <div
      onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); onTarget(); }}
      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onComplete(); }}
      className={`mx-2 transition-[height] duration-150 ${active ? 'h-9' : 'h-2'}`}
    >
      <div className={`w-full rounded border ${active ? 'h-7 border-blue-400 bg-blue-500/10' : 'h-0 border-transparent'}`} />
    </div>
  );
}

export default function FocusWorkspace() {
  const currentCourse = useEditorStore((state) => state.currentCourse);
  const currentSubPageId = useEditorStore((state) => state.currentSubPageId);
  const currentInternalPageId = useEditorStore((state) => state.currentInternalPageId);
  const pageThumbnails = useEditorStore((state) => state.pageThumbnails);
  const exitFocusWorkspace = useEditorStore((state) => state.exitFocusWorkspace);
  const setCurrentInternalPage = useEditorStore((state) => state.setCurrentInternalPage);
  const addInternalPage = useEditorStore((state) => state.addInternalPage);
  const renameInternalPage = useEditorStore((state) => state.renameInternalPage);
  const duplicateInternalPage = useEditorStore((state) => state.duplicateInternalPage);
  const deleteInternalPage = useEditorStore((state) => state.deleteInternalPage);
  const addInternalPageGroup = useEditorStore((state) => state.addInternalPageGroup);
  const renameInternalPageGroup = useEditorStore((state) => state.renameInternalPageGroup);
  const deleteInternalPageGroup = useEditorStore((state) => state.deleteInternalPageGroup);
  const reorderInternalPageGroups = useEditorStore((state) => state.reorderInternalPageGroups);
  const moveInternalPageInList = useEditorStore((state) => state.moveInternalPageInList);
  const moveInternalPage = useEditorStore((state) => state.moveInternalPage);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createKind, setCreateKind] = useState<InternalPageKind | null>(null);
  const [createName, setCreateName] = useState('');
  const [createPlacement, setCreatePlacement] = useState<PagePlacement | undefined>();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState('');
  const [groupMenuId, setGroupMenuId] = useState<string | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<DeleteGroupRequest | null>(null);
  const [deletePage, setDeletePage] = useState<InternalPage | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pageDrop, setPageDrop] = useState<PageDrop | null>(null);
  const [groupDropIndex, setGroupDropIndex] = useState<number | null>(null);
  const [movePageId, setMovePageId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  const [collapsedBySubPage, setCollapsedBySubPage] = useState<Record<string, string[]>>({});
  const [pendingScrollPageId, setPendingScrollPageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const pageDropRef = useRef<PageDrop | null>(null);
  const movePanelByDragRef = useRef(false);
  const rightHoverRef = useRef<{ since: number; pageId: string } | null>(null);
  const edgeRef = useRef<{ direction: -1 | 0 | 1; since: number; intensity: number }>({ direction: 0, since: 0, intensity: 0 });
  const targetEdgeRef = useRef<{ direction: -1 | 0 | 1; since: number; intensity: number }>({ direction: 0, since: 0, intensity: 0 });
  const rafRef = useRef<number | null>(null);

  const subPage = findSubPage(currentCourse, currentSubPageId);
  const stage = stageForSubPage(currentCourse, currentSubPageId);
  const issues = useMemo(() => currentCourse ? collectInternalPageIssues(currentCourse).filter((issue) => issue.subPageId === currentSubPageId) : [], [currentCourse, currentSubPageId]);
  const issuePageIds = useMemo(() => new Set(issues.map((issue) => issue.pageId).filter(Boolean)), [issues]);

  useEffect(() => {
    const tick = () => {
      const edge = edgeRef.current;
      if (edge.direction && Date.now() - edge.since >= 100 && scrollRef.current) {
        scrollRef.current.scrollTop += edge.direction * (2 + edge.intensity * 10);
      }
      const targetEdge = targetEdgeRef.current;
      if (targetEdge.direction && Date.now() - targetEdge.since >= 100 && targetScrollRef.current) {
        targetScrollRef.current.scrollTop += targetEdge.direction * (2 + targetEdge.intensity * 10);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (!pendingScrollPageId) return;
    requestAnimationFrame(() => {
      document.querySelector(`[data-internal-page-id="${pendingScrollPageId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setPendingScrollPageId(null);
    });
  }, [pendingScrollPageId, currentCourse]);

  useEffect(() => {
    if (!createMenuOpen && !groupMenuId && !movePageId) return;
    const closeTransientSurfaces = () => {
      setCreateMenuOpen(false);
      setGroupMenuId(null);
      if (!movePanelByDragRef.current) setMovePageId(null);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-focus-transient]')) closeTransientSurfaces();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTransientSurfaces();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [createMenuOpen, groupMenuId, movePageId]);

  useEffect(() => {
    if (!drag) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      edgeRef.current = { direction: 0, since: 0, intensity: 0 };
      targetEdgeRef.current = { direction: 0, since: 0, intensity: 0 };
      rightHoverRef.current = null;
      ghostRef.current?.remove();
      ghostRef.current = null;
      setDrag(null);
      pageDropRef.current = null;
      setPageDrop(null);
      setGroupDropIndex(null);
      if (movePanelByDragRef.current) setMovePageId(null);
    };
    const handleDocumentDrag = (event: DragEvent) => {
      if (drag.type !== 'page' || !scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      if (event.clientX > rect.right + 24) {
        if (rightHoverRef.current?.pageId !== drag.pageId) rightHoverRef.current = { since: Date.now(), pageId: drag.pageId };
        if (rightHoverRef.current && Date.now() - rightHoverRef.current.since >= 140) {
          movePanelByDragRef.current = true;
          setMovePageId(drag.pageId);
        }
      } else {
        rightHoverRef.current = null;
        if (movePanelByDragRef.current) {
          movePanelByDragRef.current = false;
          setMovePageId(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('dragover', handleDocumentDrag);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('dragover', handleDocumentDrag);
    };
  }, [drag]);

  useEffect(() => {
    if (drag !== null) return;
    edgeRef.current = { direction: 0, since: 0, intensity: 0 };
    targetEdgeRef.current = { direction: 0, since: 0, intensity: 0 };
    rightHoverRef.current = null;
    ghostRef.current?.remove();
    ghostRef.current = null;
    pageDropRef.current = null;
  }, [drag]);

  if (!subPage || !isInternalPagesSubPage(subPage) || !stage) return null;

  const pages = getElementPages(subPage);
  const mainPage = pages.find((page) => page.kind === 'main');
  const internalPages = subPage.internalPages;
  const groups = getInternalPageGroups(subPage);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const collapseKey = collapsedStorageKey(currentCourse?.id, subPage.id);
  const collapsedGroupIds = new Set(collapsedBySubPage[collapseKey] ?? readCollapsedGroups(collapseKey, validGroupIds));
  const showSearch = internalPages.length >= 6;
  const normalizedQuery = query.trim().toLowerCase();
  const sortingDisabled = normalizedQuery.length > 0 || filter !== 'all';

  const pageGroupId = (page: InternalPage) => page.pageGroupId && validGroupIds.has(page.pageGroupId) ? page.pageGroupId : undefined;
  const matchesBaseFilter = (page: InternalPage) => {
    if (filter === 'content' && page.kind !== 'content') return false;
    if (filter === 'dialog' && page.kind !== 'dialog') return false;
    if (filter === 'issues' && !issuePageIds.has(page.id)) return false;
    return true;
  };
  const matchesPage = (page: InternalPage, groupName?: string) => {
    if (!matchesBaseFilter(page)) return false;
    if (!normalizedQuery || groupName?.toLowerCase().includes(normalizedQuery)) return true;
    return page.name.toLowerCase().includes(normalizedQuery)
      || page.elements.some((element) => (element.name ?? '').toLowerCase().includes(normalizedQuery));
  };

  const allSameAreaSubPages = (() => {
    const currentIsPreview = currentCourse?.previewStages?.some((item) => item.id === stage.id) ?? false;
    const stages = currentIsPreview ? currentCourse?.previewStages ?? [] : currentCourse?.stages ?? [];
    return stages.flatMap((item) => item.subPages)
      .filter((item): item is SubPage & { internalPages: InternalPage[] } => (
        item.id !== subPage.id
        && isInternalPagesSubPage(item)
        && item.templateId === subPage.templateId
      ));
  })();

  const topPlacement = (): PagePlacement | undefined => {
    const current = internalPages.find((page) => page.id === currentInternalPageId);
    return current ? { afterPageId: current.id } : undefined;
  };

  const nextPageName = (kind: InternalPageKind) => {
    const base = kind === 'content' ? '内容页' : '弹窗';
    let index = 1;
    let name = `${base} ${index}`;
    while (internalPages.some((page) => page.name === name)) name = `${base} ${++index}`;
    return name;
  };

  const startCreate = (kind: InternalPageKind, placement?: PagePlacement) => {
    setCreateMenuOpen(false);
    setGroupMenuId(null);
    setMovePageId(null);
    setCreateName(nextPageName(kind));
    setCreatePlacement(placement);
    setCreateKind(kind);
  };

  const quickCreate = (kind: InternalPageKind, placement?: PagePlacement) => {
    setCreateMenuOpen(false);
    setGroupMenuId(null);
    setMovePageId(null);
    const createdId = addInternalPage(kind, nextPageName(kind), placement);
    if (!createdId) {
      showToast('页面创建失败，请重试', 'error');
      return;
    }
    setPendingScrollPageId(createdId);
  };

  const commitCreate = () => {
    if (!createKind) return;
    const createdId = addInternalPage(createKind, createName, createPlacement);
    if (!createdId) {
      showToast('页面名称不能为空或与现有页面重复', 'error');
      return;
    }
    setPendingScrollPageId(createdId);
    setCreateKind(null);
    setCreatePlacement(undefined);
  };

  const commitCreateGroup = () => {
    const groupId = addInternalPageGroup(createGroupName);
    if (!groupId) {
      showToast('分组名称不能为空或与现有分组重复', 'error');
      return;
    }
    setCreateGroupOpen(false);
    setCreateGroupName('');
    setCreateMenuOpen(false);
    setGroupMenuId(null);
  };

  const persistCollapsedGroups = (next: Set<string>) => {
    setCollapsedBySubPage((current) => ({ ...current, [collapseKey]: [...next] }));
    localStorage.setItem(collapsedStorageKey(currentCourse?.id, subPage.id), JSON.stringify([...next]));
  };

  const toggleGroup = (groupId: string) => {
    const next = new Set(collapsedGroupIds);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    persistCollapsedGroups(next);
  };

  const beginDragImage = (event: React.DragEvent, label: string) => {
    ghostRef.current?.remove();
    const ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.className = 'fixed -left-[9999px] top-0 rounded-lg border border-blue-400 bg-slate-800 px-4 py-3 text-xs text-white shadow-2xl';
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 24, 20);
    ghostRef.current = ghost;
  };

  const clearGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const stopDrag = () => {
    edgeRef.current = { direction: 0, since: 0, intensity: 0 };
    targetEdgeRef.current = { direction: 0, since: 0, intensity: 0 };
    rightHoverRef.current = null;
    clearGhost();
    setDrag(null);
    pageDropRef.current = null;
    setPageDrop(null);
    setGroupDropIndex(null);
    if (movePanelByDragRef.current) {
      movePanelByDragRef.current = false;
      setMovePageId(null);
    }
  };

  const updateEdge = (event: React.DragEvent, element: HTMLElement | null, target: 'list' | 'targets') => {
    if (!drag || !element) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const zone = 56;
    let direction: -1 | 0 | 1 = 0;
    let intensity = 0;
    if (event.clientY < rect.top + zone) {
      direction = -1;
      intensity = Math.min(1, Math.max(0, (rect.top + zone - event.clientY) / zone));
    } else if (event.clientY > rect.bottom - zone) {
      direction = 1;
      intensity = Math.min(1, Math.max(0, (event.clientY - (rect.bottom - zone)) / zone));
    }
    const ref = target === 'list' ? edgeRef : targetEdgeRef;
    if (ref.current.direction !== direction) ref.current = { direction, since: Date.now(), intensity };
    else ref.current.intensity = intensity;
  };

  const completePageDrop = () => {
    const latestDrop = pageDropRef.current;
    if (drag?.type !== 'page' || !latestDrop) return stopDrag();
    const changed = moveInternalPageInList(drag.pageId, latestDrop.pageGroupId, latestDrop.targetIndex);
    if (changed) showToast('页面顺序已调整，可撤销', 'success');
    stopDrag();
  };

  const completeGroupDrop = (targetIndex: number) => {
    if (drag?.type === 'group' && targetIndex !== drag.sourceIndex) {
      reorderInternalPageGroups(drag.sourceIndex, targetIndex);
      showToast('分组顺序已调整，可撤销', 'success');
    }
    setDrag(null);
    setPageDrop(null);
    setGroupDropIndex(null);
  };

  const requestMove = (pageId: string, target: SubPage & { internalPages: InternalPage[] }) => {
    const page = internalPages.find((item) => item.id === pageId);
    if (!page) return;
    const impact = analyzeInternalPageMove(subPage, target, page.id);
    if (!impact) return;
    const targetGroups = new Set(getInternalPageGroups(target).map((group) => group.id));
    const targetIndex = target.internalPages.filter((item) => !item.pageGroupId || !targetGroups.has(item.pageGroupId)).length;
    setMoveRequest({ pageId, targetSubPageId: target.id, targetIndex, targetName: target.name, impact });
    setMovePageId(null);
    stopDrag();
  };

  const pageDropSlot = (groupId: string | undefined, targetIndex: number, slotId: string, enabled = true) => {
    const available = drag?.type === 'page' && !sortingDisabled && enabled;
    const active = available && pageDrop?.pageGroupId === groupId && pageDrop?.targetIndex === targetIndex;
    return (
      <div
        key={`page-slot-${groupId ?? UNGROUPED_KEY}-${slotId}`}
        data-page-drop-slot={`${groupId ?? UNGROUPED_KEY}:${slotId}`}
        className={`${groupId ? 'ml-7 mr-2' : 'mx-2'} flex items-center transition-[height] duration-150 ${available ? (active ? 'h-9' : 'h-3') : 'h-0 pointer-events-none'}`}
        onDragOver={(event) => {
          if (!available) return;
          event.preventDefault();
          event.stopPropagation();
          const next = { pageGroupId: groupId, targetIndex };
          pageDropRef.current = next;
          setPageDrop(next);
        }}
        onDrop={(event) => {
          if (!available) return;
          event.preventDefault();
          event.stopPropagation();
          completePageDrop();
        }}
      >
        <div className={`w-full rounded border transition-all ${active ? 'h-7 border-blue-400 bg-blue-500/10' : 'h-0 border-transparent'}`} />
      </div>
    );
  };

  const renderPage = (internal: InternalPage, grouped = false) => {
    const page = pages.find((item) => item.id === internal.id);
    if (!page) return null;
    const selected = currentInternalPageId === page.id;
    const pageIssues = issues.filter((issue) => issue.pageId === page.id);
    const dragging = drag?.type === 'page' && drag.pageId === page.id;
    const groupId = pageGroupId(internal);
    const startPageDrag = (event: React.DragEvent) => {
      const target = event.target as HTMLElement;
      if (sortingDisabled || target.closest('[data-page-action]')) return event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', page.id);
      beginDragImage(event, page.name);
      setDrag({ type: 'page', pageId: page.id });
    };
    return (
      <div
        key={page.id}
        data-internal-page-id={page.id}
        draggable={!sortingDisabled}
        onDragStart={startPageDrag}
        onDragEnd={stopDrag}
        onDragOver={(event) => {
          if (drag?.type !== 'page' || sortingDisabled || dragging) return;
          event.preventDefault();
          const groupPages = internalPages.filter((item) => pageGroupId(item) === groupId && item.id !== drag.pageId);
          const index = groupPages.findIndex((item) => item.id === page.id);
          const rect = event.currentTarget.getBoundingClientRect();
          const next = { pageGroupId: groupId, targetIndex: index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0) };
          pageDropRef.current = next;
          setPageDrop(next);
        }}
        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); completePageDrop(); }}
        onClick={() => setCurrentInternalPage(page.id)}
        className={`group ${grouped ? 'ml-7 mr-2' : 'mx-2'} rounded-lg border transition-all duration-150 ${dragging ? 'cursor-grabbing scale-[0.98] opacity-35' : 'cursor-pointer'} ${selected ? 'border-blue-400 bg-blue-500/15' : 'border-slate-700 bg-slate-800 hover:bg-slate-700/70'}`}
      >
        <div className="relative flex items-center gap-2 p-2">
          <span
            draggable={!sortingDisabled}
            onDragStart={startPageDrag}
            onDragEnd={(event) => { event.stopPropagation(); stopDrag(); }}
            className={`shrink-0 p-1 text-slate-500 ${sortingDisabled ? 'cursor-not-allowed opacity-35' : 'cursor-grab active:cursor-grabbing'}`}
            title={sortingDisabled ? '搜索或筛选状态下不能排序' : '拖动页面'}
          >
            <GripVertical size={14} />
          </span>
          <div className="w-16 aspect-video rounded bg-slate-950 overflow-hidden flex items-center justify-center text-[9px] text-slate-500">
            {pageThumbnails[page.id] ? <img src={pageThumbnails[page.id]} draggable={false} className="w-full h-full object-cover" alt="" /> : page.kind === 'dialog' ? '弹窗' : '内容页'}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs text-slate-100 truncate"
              onDoubleClick={(event) => {
                event.stopPropagation();
                const next = window.prompt('页面名称', internal.name);
                if (next !== null && !renameInternalPage(internal.id, next)) showToast('页面名称不能为空或与现有页面重复', 'error');
              }}
            >{page.name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className={`shrink-0 whitespace-nowrap rounded px-1 py-0.5 ${page.kind === 'dialog' ? 'bg-violet-500/15 text-violet-300' : 'bg-cyan-500/15 text-cyan-300'}`}>{page.kind === 'dialog' ? '弹窗' : '内容'}</span>
              <span className="shrink-0 whitespace-nowrap">{page.elements.length} 元素</span>
            </div>
          </div>
          {pageIssues.length > 0 && <AlertTriangle size={14} className={pageIssues.some((issue) => issue.severity === 'blocking') ? 'text-red-400' : 'text-amber-400'} />}
          <div data-page-action className="pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center rounded-md bg-slate-800/95 pl-1 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <button className="p-1 hover:bg-slate-600 rounded" title="复制页面" onClick={(event) => { event.stopPropagation(); duplicateInternalPage(page.id); }}><Copy size={13} /></button>
            <button className="p-1 hover:bg-slate-600 rounded" title="移动到其他小关卡" onClick={(event) => {
              event.stopPropagation();
              movePanelByDragRef.current = false;
              setCreateMenuOpen(false);
              setGroupMenuId(null);
              setMovePageId((current) => current === page.id ? null : page.id);
            }}><MoveRight size={13} /></button>
            <button className="p-1 hover:bg-red-500/30 text-red-400 rounded" title="删除页面" onClick={(event) => { event.stopPropagation(); setDeletePage(internal); }}><Trash2 size={13} /></button>
          </div>
        </div>
        {pageIssues.length > 0 && selected && (
          <div className="px-3 pb-2 space-y-1">
            {pageIssues.map((issue, issueIndex) => <div key={`${issue.code}-${issueIndex}`} className={`text-[10px] ${issue.severity === 'blocking' ? 'text-red-300' : 'text-amber-300'}`}>{issue.message}</div>)}
          </div>
        )}
      </div>
    );
  };

  const renderQuickAdd = (groupId?: string) => {
    if (sortingDisabled) return null;
    return (
      <div className={`${groupId ? 'ml-7 mr-2' : 'mx-2'} mt-1 flex items-center gap-1`}>
        <button onClick={() => quickCreate('content', { pageGroupId: groupId })} className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Plus size={12} />内容页</button>
        <button onClick={() => quickCreate('dialog', { pageGroupId: groupId })} className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-800 hover:text-slate-200"><Plus size={12} />弹窗</button>
      </div>
    );
  };

  const renderGroup = (group: InternalPageGroup) => {
    const allPages = internalPages.filter((page) => pageGroupId(page) === group.id);
    const visiblePages = allPages.filter((page) => matchesPage(page, group.name));
    const collapsed = !sortingDisabled && collapsedGroupIds.has(group.id);
    const groupDragging = drag?.type === 'group' && drag.groupId === group.id;
    const groupEndDropIndex = allPages.filter((page) => drag?.type !== 'page' || page.id !== drag.pageId).length;
    const groupPageTarget = drag?.type === 'page'
      && pageDrop?.pageGroupId === group.id
      && pageDrop.targetIndex === groupEndDropIndex;
    if (sortingDisabled && visiblePages.length === 0) return null;
    return (
      <section key={group.id} className={`mt-1 transition-all ${groupDragging ? 'opacity-35 scale-[0.99]' : ''}`}>
        <div
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('[data-group-action]')) return;
            toggleGroup(group.id);
          }}
          onDragOver={(event) => {
            if (drag?.type !== 'page' || sortingDisabled) return;
            event.preventDefault();
            event.stopPropagation();
            const next = { pageGroupId: group.id, targetIndex: groupEndDropIndex };
            pageDropRef.current = next;
            setPageDrop(next);
          }}
          onDrop={(event) => {
            const latestDrop = pageDropRef.current;
            if (drag?.type !== 'page' || latestDrop?.pageGroupId !== group.id) return;
            event.preventDefault();
            event.stopPropagation();
            completePageDrop();
          }}
          className={`mx-2 flex cursor-pointer items-center gap-1 rounded-md px-1 py-1.5 text-slate-400 transition-all hover:bg-slate-800/70 ${groupPageTarget ? 'ring-1 ring-blue-400 bg-blue-500/10 text-blue-200' : ''}`}
        >
          <span
            data-group-action
            draggable={!sortingDisabled}
            onDragStart={(event) => {
              if (sortingDisabled) return event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              beginDragImage(event, group.name);
              setDrag({ type: 'group', groupId: group.id, sourceIndex: groups.findIndex((item) => item.id === group.id) });
            }}
            onDragEnd={stopDrag}
            className={`p-1 ${sortingDisabled ? 'cursor-not-allowed opacity-35' : 'cursor-grab active:cursor-grabbing'}`}
            title={sortingDisabled ? '搜索或筛选状态下不能排序' : '拖动分组'}
          ><GripVertical size={13} /></span>
          <button data-group-action onClick={() => toggleGroup(group.id)} className="p-1 rounded hover:bg-slate-700" title={collapsed ? '展开分组' : '收起分组'}>{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>
          <Folder size={13} className={groupPageTarget ? 'text-blue-300' : 'text-slate-500'} />
          <span className="min-w-0 flex-1 truncate text-left text-[11px] font-medium">{group.name}</span>
          <span className="text-[10px] text-slate-600">{allPages.length}</span>
          <div className="relative" data-focus-transient data-group-action>
            <button onClick={(event) => {
              event.stopPropagation();
              setCreateMenuOpen(false);
              setMovePageId(null);
              setGroupMenuId((id) => id === group.id ? null : group.id);
            }} className="p-1 rounded hover:bg-slate-700"><MoreHorizontal size={13} /></button>
            {groupMenuId === group.id && (
              <div className="absolute right-0 top-full z-40 w-40 rounded-md border border-slate-600 bg-slate-800 p-1 shadow-xl">
                <button onClick={() => {
                  const next = window.prompt('分组名称', group.name);
                  setGroupMenuId(null);
                  if (next !== null && !renameInternalPageGroup(group.id, next)) showToast('分组名称不能为空或与现有分组重复', 'error');
                }} className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-700">重命名</button>
                <button onClick={() => { setGroupMenuId(null); setDeleteGroup({ group, deletePages: false }); }} className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-700">解散分组并保留页面</button>
                <button onClick={() => { setGroupMenuId(null); setDeleteGroup({ group, deletePages: true }); }} className="w-full rounded px-2 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/15">删除分组及页面…</button>
              </div>
            )}
          </div>
        </div>
        {!collapsed && (
          <div>
            {(() => {
              let targetIndex = 0;
              return visiblePages.flatMap((page) => {
                const isDragged = drag?.type === 'page' && drag.pageId === page.id;
                const slot = pageDropSlot(group.id, targetIndex, `before-${page.id}`, !isDragged);
                if (!isDragged) targetIndex++;
                return [slot, renderPage(page, true)];
              });
            })()}
            {pageDropSlot(group.id, visiblePages.filter((page) => drag?.type !== 'page' || drag.pageId !== page.id).length, 'last')}
            {visiblePages.length === 0 && <div className="ml-8 mr-3 py-2 text-[10px] text-slate-600">暂无页面，可拖入或快速创建</div>}
            {renderQuickAdd(group.id)}
          </div>
        )}
      </section>
    );
  };

  const ungroupedPages = internalPages.filter((page) => pageGroupId(page) === undefined && matchesPage(page));

  return (
    <div className="relative z-30 h-full flex flex-col bg-slate-900" data-keep-selection>
      <div className="h-12 px-2 border-b border-slate-700 flex items-center gap-2 shrink-0">
        <button onClick={exitFocusWorkspace} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="返回工作台"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 truncate">{stage.name}</div>
          <div className="text-sm font-medium truncate">{subPage.name}</div>
        </div>
        <div className="relative" data-focus-transient>
          <button onClick={() => {
            setGroupMenuId(null);
            setMovePageId(null);
            setCreateMenuOpen((open) => !open);
          }} className={`p-1.5 rounded text-blue-300 ${createMenuOpen ? 'bg-slate-700' : 'hover:bg-slate-700'}`} title="新增页面或分组" aria-haspopup="menu" aria-expanded={createMenuOpen}><Plus size={16} /></button>
          {createMenuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-2xl z-50 p-1">
              <button role="menuitem" onClick={() => startCreate('content', topPlacement())} className="w-full rounded px-3 py-2 text-left hover:bg-slate-700"><div className="text-xs text-slate-100">新增内容页</div><div className="mt-0.5 text-[10px] text-slate-500">插入当前页面下方</div></button>
              <button role="menuitem" onClick={() => startCreate('dialog', topPlacement())} className="w-full rounded px-3 py-2 text-left hover:bg-slate-700"><div className="text-xs text-slate-100">新增弹窗</div><div className="mt-0.5 text-[10px] text-slate-500">插入当前页面下方</div></button>
              <div className="my-1 border-t border-slate-700" />
              <button role="menuitem" onClick={() => { setCreateGroupName(''); setCreateGroupOpen(true); setCreateMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left text-xs text-slate-100 hover:bg-slate-700">新建分组</button>
            </div>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="p-2 border-b border-slate-800 space-y-2 shrink-0">
          <div className="relative"><Search size={13} className="absolute left-2 top-2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索页面、元素或分组" className="w-full h-7 pl-7 pr-2 text-xs bg-slate-800 border border-slate-700 rounded outline-none focus:border-blue-500" /></div>
          <div className="flex gap-1">
            {([['all', '全部'], ['content', '内容页'], ['dialog', '弹窗'], ['issues', '有问题']] as const).map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`px-2 py-1 text-[10px] rounded ${filter === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{label}</button>)}
          </div>
          {sortingDisabled && <div className="text-[10px] text-slate-500">搜索或筛选期间暂停排序，清除条件后可继续拖动。</div>}
        </div>
      )}

      {issues.some((issue) => issue.code === 'capacity') && <div className="mx-2 mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">当前小关卡规模较大，请通过真实预览检查首次加载性能。</div>}

      <div ref={scrollRef} onDragOver={(event) => updateEdge(event, scrollRef.current, 'list')} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) edgeRef.current = { direction: 0, since: 0, intensity: 0 }; }} className="flex-1 min-h-0 overflow-y-auto pb-4">
        <div className="px-3 pt-3 pb-1 text-[10px] font-medium text-slate-500 uppercase tracking-wide">主界面</div>
        {mainPage && (
          <button onClick={() => setCurrentInternalPage(mainPage.id)} className={`mx-2 w-[calc(100%-16px)] rounded-lg border text-left transition-colors ${currentInternalPageId === mainPage.id ? 'border-blue-400 bg-blue-500/15' : 'border-slate-700 bg-slate-800 hover:bg-slate-700/70'}`}>
            <div className="flex items-center gap-2 p-2"><span className="w-6" /><div className="w-16 aspect-video rounded bg-slate-950 overflow-hidden flex items-center justify-center text-[9px] text-slate-500">{pageThumbnails[mainPage.id] ? <img src={pageThumbnails[mainPage.id]} className="w-full h-full object-cover" alt="" /> : '主界面'}</div><div className="min-w-0 flex-1"><div className="text-xs text-slate-100 truncate">{mainPage.name}</div><div className="text-[10px] text-slate-500">固定入口 · {mainPage.elements.length} 元素</div></div></div>
          </button>
        )}

        <div className="h-3" />
        {(() => {
          let targetIndex = 0;
          const rendered = groups.flatMap((group) => {
            const isDragged = drag?.type === 'group' && drag.groupId === group.id;
            const slot = drag?.type === 'group' && !sortingDisabled && !isDragged ? (
              <GroupDropSlot
                key={`group-slot-${group.id}`}
                active={groupDropIndex === targetIndex}
                onTarget={() => setGroupDropIndex(targetIndex)}
                onComplete={() => completeGroupDrop(targetIndex)}
              />
            ) : null;
            if (!isDragged) targetIndex++;
            return [slot, renderGroup(group)];
          });
          return drag?.type === 'group' && !sortingDisabled
            ? [...rendered, <GroupDropSlot key="group-slot-last" active={groupDropIndex === targetIndex} onTarget={() => setGroupDropIndex(targetIndex)} onComplete={() => completeGroupDrop(targetIndex)} />]
            : rendered;
        })()}

        {groups.length > 0 && ungroupedPages.length > 0 && <div className="h-2" />}
        {(() => {
          let targetIndex = 0;
          return ungroupedPages.flatMap((page) => {
            const isDragged = drag?.type === 'page' && drag.pageId === page.id;
            const slot = pageDropSlot(undefined, targetIndex, `before-${page.id}`, !isDragged);
            if (!isDragged) targetIndex++;
            return [slot, renderPage(page)];
          });
        })()}
        {pageDropSlot(undefined, ungroupedPages.filter((page) => drag?.type !== 'page' || drag.pageId !== page.id).length, 'last')}
        {renderQuickAdd()}
      </div>

      {movePageId && (
        <div ref={targetScrollRef} data-focus-transient onDragOver={(event) => updateEdge(event, targetScrollRef.current, 'targets')} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) targetEdgeRef.current = { direction: 0, since: 0, intensity: 0 }; }} className="absolute left-full top-12 ml-2 w-64 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-2xl p-2 z-50">
          <div className="flex items-center justify-between px-1 pb-2"><span className="text-xs font-medium">移动到其他小关卡</span><button onClick={() => { setMovePageId(null); stopDrag(); }} className="text-slate-400 hover:text-white"><X size={14} /></button></div>
          {allSameAreaSubPages.length === 0 ? <div className="p-3 text-xs text-slate-500">没有兼容的小关卡</div> : allSameAreaSubPages.map((target) => (
            <button key={target.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); requestMove(movePageId, target); }} onClick={() => requestMove(movePageId, target)} className="w-full text-left px-3 py-2 mb-1 rounded border border-slate-700 bg-slate-900/60 hover:border-blue-500 hover:bg-blue-500/10">
              <div className="text-xs text-slate-200 truncate">{target.name}</div><div className="text-[10px] text-slate-500">移入未分组末尾 · {target.internalPages.length + 1} 页</div>
            </button>
          ))}
        </div>
      )}

      {createKind && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center" onClick={() => setCreateKind(null)}>
          <div className="w-96 rounded-lg border border-slate-700 bg-slate-800 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-700 text-sm font-medium">新增{createKind === 'dialog' ? '弹窗' : '内容页'}</div>
            <div className="p-4 space-y-3"><label className="block text-xs text-slate-400">页面名称</label><input autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && createName.trim()) commitCreate(); }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm outline-none focus:border-blue-500" />{internalPages.some((page) => page.name === createName.trim()) && <div className="text-xs text-red-400">同一小关卡内页面名称不能重复</div>}</div>
            <div className="p-3 border-t border-slate-700 flex justify-end gap-2"><button onClick={() => setCreateKind(null)} className="px-4 py-2 text-xs bg-slate-700 rounded">取消</button><button disabled={!createName.trim() || internalPages.some((page) => page.name === createName.trim())} onClick={commitCreate} className="px-4 py-2 text-xs bg-blue-600 disabled:opacity-40 rounded">创建</button></div>
          </div>
        </div>
      )}

      {createGroupOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center" onClick={() => setCreateGroupOpen(false)}>
          <div className="w-96 rounded-lg border border-slate-700 bg-slate-800 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-700 text-sm font-medium">新建页面分组</div>
            <div className="p-4 space-y-3"><label className="block text-xs text-slate-400">分组名称</label><input autoFocus value={createGroupName} onChange={(event) => setCreateGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && createGroupName.trim()) commitCreateGroup(); }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm outline-none focus:border-blue-500" /></div>
            <div className="p-3 border-t border-slate-700 flex justify-end gap-2"><button onClick={() => setCreateGroupOpen(false)} className="px-4 py-2 text-xs bg-slate-700 rounded">取消</button><button disabled={!createGroupName.trim()} onClick={commitCreateGroup} className="px-4 py-2 text-xs bg-blue-600 disabled:opacity-40 rounded">创建</button></div>
          </div>
        </div>
      )}

      {deleteGroup && (() => {
        const groupPages = internalPages.filter((page) => pageGroupId(page) === deleteGroup.group.id);
        const affectedRelations = externalGroupReferenceCount(subPage, new Set(groupPages.map((page) => page.id)));
        return deleteGroup.deletePages
          ? <ConfirmDialog
              title="删除分组及全部页面"
              message={[`将删除“${deleteGroup.group.name}”及其中 ${groupPages.length} 个页面。`, affectedRelations > 0 ? `删除后将有 ${affectedRelations} 条来自其他页面的关系失效。` : '', '该操作会作为一次修改记录，可使用撤销完整恢复。'].filter(Boolean).join('\n')}
              confirmText={`删除 ${groupPages.length} 个页面`}
              danger
              onCancel={() => setDeleteGroup(null)}
              onConfirm={() => { deleteInternalPageGroup(deleteGroup.group.id, true); setDeleteGroup(null); }}
            />
          : <ConfirmDialog
              title="解散页面分组"
              message={`解散“${deleteGroup.group.name}”后，组内 ${groupPages.length} 个页面会保留并移到列表末尾。可使用撤销恢复。`}
              confirmText="解散分组"
              onCancel={() => setDeleteGroup(null)}
              onConfirm={() => { deleteInternalPageGroup(deleteGroup.group.id); setDeleteGroup(null); }}
            />;
      })()}
      {deletePage && <ConfirmDialog title={`删除${deletePage.kind === 'dialog' ? '弹窗' : '内容页'}`} message={`${deletePage.elements.length > 0 ? `页面包含 ${deletePage.elements.length} 个元素。\n` : ''}${referenceCount(subPage, deletePage.id) > 0 ? `删除后将有 ${referenceCount(subPage, deletePage.id)} 条页面关系失效。\n` : ''}确定删除“${deletePage.name}”吗？可使用撤销恢复。`} danger onCancel={() => setDeletePage(null)} onConfirm={() => { deleteInternalPage(deletePage.id); setDeletePage(null); }} />}
      {moveRequest && <ConfirmDialog title="确认跨小关卡移动" message={[`目标：${moveRequest.targetName}`, moveRequest.impact.invalidRelationCount > 0 ? `将产生 ${moveRequest.impact.invalidRelationCount} 条失效页面关系，移动后会保留断链提醒。` : '不会产生失效页面关系。', moveRequest.impact.changesDialogBase ? '该弹窗的底板将切换为目标小关卡主界面。' : '', moveRequest.impact.nameCollision ? `目标存在同名页面，将自动命名为“${moveRequest.impact.resolvedName}”。` : ''].filter(Boolean).join('\n')} confirmText="确认移动" onConfirm={() => { const result = moveInternalPage(moveRequest.pageId, moveRequest.targetSubPageId, moveRequest.targetIndex); if (!result.ok) showToast(result.error ?? '移动失败', 'error'); else showToast(`已移动到 ${moveRequest.targetName}`, 'success'); setMoveRequest(null); }} onCancel={() => setMoveRequest(null)} />}
    </div>
  );
}
