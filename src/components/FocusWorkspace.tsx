import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  GripVertical,
  MoreHorizontal,
  MoveRight,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEditorStore, findSubPage } from '../store/editorStore';
import { analyzeInternalPageMove, collectInternalPageIssues, getElementPages, isInternalPagesSubPage, type InternalPageMoveImpact } from '../utils/internalPages';
import type { InternalPage, InternalPageKind, SubPage } from '../types';
import ElementList from './ElementList';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from '../utils/toast';

type Filter = 'all' | 'content' | 'dialog' | 'issues';

type DragState = { pageId: string; kind: InternalPageKind; index: number };
type MoveRequest = { pageId: string; targetSubPageId: string; targetIndex: number; targetName: string; impact: InternalPageMoveImpact };

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
  const reorderInternalPages = useEditorStore((state) => state.reorderInternalPages);
  const moveInternalPage = useEditorStore((state) => state.moveInternalPage);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [createKind, setCreateKind] = useState<InternalPageKind | null>(null);
  const [createName, setCreateName] = useState('');
  const [deletePage, setDeletePage] = useState<InternalPage | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [movePageId, setMovePageId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  const [lastDrop, setLastDrop] = useState<{ visualIndex: number; targetIndex: number; after: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<{ direction: -1 | 0 | 1; since: number }>({ direction: 0, since: 0 });
  const targetEdgeRef = useRef<{ direction: -1 | 0 | 1; since: number }>({ direction: 0, since: 0 });
  const rafRef = useRef<number | null>(null);

  const subPage = findSubPage(currentCourse, currentSubPageId);
  const stage = stageForSubPage(currentCourse, currentSubPageId);
  const issues = useMemo(() => currentCourse ? collectInternalPageIssues(currentCourse).filter((issue) => issue.subPageId === currentSubPageId) : [], [currentCourse, currentSubPageId]);
  const issuePageIds = useMemo(() => new Set(issues.map((issue) => issue.pageId).filter(Boolean)), [issues]);

  useEffect(() => {
    const tick = () => {
      const edge = edgeRef.current;
      if (edge.direction && Date.now() - edge.since >= 300 && scrollRef.current) {
        scrollRef.current.scrollTop += edge.direction * 2;
      }
      const targetEdge = targetEdgeRef.current;
      if (targetEdge.direction && Date.now() - targetEdge.since >= 300 && targetScrollRef.current) {
        targetScrollRef.current.scrollTop += targetEdge.direction * 2;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  if (!subPage || !isInternalPagesSubPage(subPage) || !stage) return null;

  const pages = getElementPages(subPage);
  const internalPages = subPage.internalPages;
  const showSearch = internalPages.length >= 6;
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (page: (typeof pages)[number]) => {
    if (filter === 'content' && page.kind === 'dialog') return false;
    if (filter === 'dialog' && page.kind !== 'dialog') return false;
    if (filter === 'issues' && !issuePageIds.has(page.id)) return false;
    if (!normalizedQuery) return true;
    return page.name.toLowerCase().includes(normalizedQuery)
      || page.elements.some((element) => (element.name ?? '').toLowerCase().includes(normalizedQuery));
  };
  const contentPages = pages.filter((page) => page.kind !== 'dialog' && matches(page));
  const dialogPages = pages.filter((page) => page.kind === 'dialog' && matches(page));

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

  const startCreate = (kind: InternalPageKind) => {
    const base = kind === 'content' ? '内容页' : '弹窗';
    let index = 1;
    let name = `${base} ${index}`;
    while (internalPages.some((page) => page.name === name)) name = `${base} ${++index}`;
    setCreateName(name);
    setCreateKind(kind);
  };

  const handleScrollDrag = (event: React.DragEvent) => {
    if (!drag) return;
    event.preventDefault();
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zone = 72;
    const direction: -1 | 0 | 1 = event.clientY < rect.top + zone ? -1 : event.clientY > rect.bottom - zone ? 1 : 0;
    if (edgeRef.current.direction !== direction) edgeRef.current = { direction, since: Date.now() };
  };

  const stopDrag = () => {
    edgeRef.current = { direction: 0, since: 0 };
    targetEdgeRef.current = { direction: 0, since: 0 };
    setDrag(null);
    setLastDrop(null);
  };

  const requestMove = (pageId: string, target: SubPage & { internalPages: InternalPage[] }) => {
    const page = internalPages.find((item) => item.id === pageId);
    if (!page) return;
    const impact = analyzeInternalPageMove(subPage, target, page.id);
    if (!impact) return;
    const targetIndex = target.internalPages.filter((item) => item.kind === page.kind).length;
    setMoveRequest({ pageId, targetSubPageId: target.id, targetIndex, targetName: target.name, impact });
    setMovePageId(null);
    stopDrag();
  };

  const handleTargetScrollDrag = (event: React.DragEvent) => {
    event.preventDefault();
    edgeRef.current = { direction: 0, since: 0 };
    const rect = targetScrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const direction: -1 | 0 | 1 = event.clientY < rect.top + 72 ? -1 : event.clientY > rect.bottom - 72 ? 1 : 0;
    if (targetEdgeRef.current.direction !== direction) targetEdgeRef.current = { direction, since: Date.now() };
  };

  const renderPage = (page: (typeof pages)[number], index: number) => {
    const selected = currentInternalPageId === page.id;
    const internal = page.internalPage;
    const pageIssues = issues.filter((issue) => issue.pageId === page.id);
    return (
      <div key={page.id} className="relative">
        {drag?.kind === page.kind && lastDrop?.visualIndex === index && !lastDrop.after && <div className="h-0.5 bg-blue-400 mx-2 rounded" />}
        <div
          draggable={page.kind !== 'main'}
          onDragStart={(event) => {
            if (page.kind === 'main') return;
            event.dataTransfer.effectAllowed = 'move';
            const fullGroup = internalPages.filter((item) => item.kind === page.kind);
            setDrag({ pageId: page.id, kind: page.kind, index: fullGroup.findIndex((item) => item.id === page.id) });
            setMovePageId(page.id);
          }}
          onDragEnd={() => { stopDrag(); setMovePageId(null); }}
          onDragOver={(event) => {
            if (!drag || drag.kind !== page.kind) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const fullGroup = internalPages.filter((item) => item.kind === page.kind);
            const targetIndex = fullGroup.findIndex((item) => item.id === page.id);
            const before = event.clientY < rect.top + rect.height / 2;
            const finalIndex = before
              ? targetIndex - (drag.index < targetIndex ? 1 : 0)
              : targetIndex + (drag.index > targetIndex ? 1 : 0);
            setLastDrop({
              visualIndex: index,
              targetIndex: Math.max(0, Math.min(finalIndex, fullGroup.length - 1)),
              after: !before,
            });
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (drag && drag.kind === page.kind && lastDrop && drag.index !== lastDrop.targetIndex) {
              reorderInternalPages(drag.kind, drag.index, lastDrop.targetIndex);
            }
            stopDrag();
          }}
          onClick={() => setCurrentInternalPage(page.id)}
          className={`group mx-2 mt-1 rounded-lg border transition-colors ${selected ? 'border-blue-400 bg-blue-500/15' : 'border-slate-700 bg-slate-800 hover:bg-slate-700/70'}`}
        >
          <div className="flex items-center gap-2 p-2">
            <span className={`shrink-0 ${page.kind === 'main' ? 'w-3' : 'text-slate-500 cursor-grab'}`}>
              {page.kind !== 'main' && <GripVertical size={14} />}
            </span>
            <div className="w-16 aspect-video rounded bg-slate-950 overflow-hidden flex items-center justify-center text-[9px] text-slate-500">
              {pageThumbnails[page.id] ? <img src={pageThumbnails[page.id]} className="w-full h-full object-cover" alt="" /> : page.kind === 'main' ? '主界面' : page.kind === 'dialog' ? '弹窗' : '内容页'}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-xs text-slate-100 truncate"
                onDoubleClick={(event) => {
                  if (!internal) return;
                  event.stopPropagation();
                  const next = window.prompt('页面名称', internal.name);
                  if (next !== null && !renameInternalPage(internal.id, next)) showToast('页面名称不能为空或与现有页面重复', 'error');
                }}
              >{page.name}</div>
              <div className="text-[10px] text-slate-500">{page.kind === 'main' ? '固定入口' : page.kind === 'dialog' ? '弹窗' : '内容页'} · {page.elements.length} 元素</div>
            </div>
            {pageIssues.length > 0 && <AlertTriangle size={14} className={pageIssues.some((issue) => issue.severity === 'blocking') ? 'text-red-400' : 'text-amber-400'} />}
            {internal && (
              <div className="flex items-center opacity-0 group-hover:opacity-100">
                <button className="p-1 hover:bg-slate-600 rounded" title="复制页面" onClick={(event) => { event.stopPropagation(); duplicateInternalPage(page.id); }}><Copy size={13} /></button>
                <button className="p-1 hover:bg-slate-600 rounded" title="移动到其他小关卡" onClick={(event) => { event.stopPropagation(); setMovePageId(page.id); }}><MoveRight size={13} /></button>
                <button className="p-1 hover:bg-red-500/30 text-red-400 rounded" title="删除页面" onClick={(event) => { event.stopPropagation(); setDeletePage(internal); }}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
          {pageIssues.length > 0 && selected && (
            <div className="px-3 pb-2 space-y-1">
              {pageIssues.map((issue, issueIndex) => <div key={`${issue.code}-${issueIndex}`} className={`text-[10px] ${issue.severity === 'blocking' ? 'text-red-300' : 'text-amber-300'}`}>{issue.message}</div>)}
            </div>
          )}
        </div>
        {drag?.kind === page.kind && lastDrop?.visualIndex === index && lastDrop.after && <div className="h-0.5 bg-blue-400 mx-2 rounded" />}
        {selected && (
          <div className="mx-3 mb-2 h-56 border-x border-b border-slate-700 rounded-b-lg bg-slate-900/60 overflow-hidden">
            <ElementList />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative z-30 h-full flex flex-col bg-slate-900" data-keep-selection>
      <div className="h-12 px-2 border-b border-slate-700 flex items-center gap-2 shrink-0">
        <button onClick={exitFocusWorkspace} className="p-1.5 hover:bg-slate-700 rounded text-slate-300" title="返回工作台"><ArrowLeft size={17} /></button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 truncate">{stage.name}</div>
          <div className="text-sm font-medium truncate">{subPage.name}</div>
        </div>
        <button onClick={() => startCreate('content')} className="p-1.5 hover:bg-slate-700 rounded text-blue-300" title="新增内容页"><Plus size={16} /></button>
        <button onClick={() => startCreate('dialog')} className="p-1.5 hover:bg-slate-700 rounded text-violet-300" title="新增弹窗"><MoreHorizontal size={16} /></button>
      </div>

      {showSearch && (
        <div className="p-2 border-b border-slate-800 space-y-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索页面或元素" className="w-full h-7 pl-7 pr-2 text-xs bg-slate-800 border border-slate-700 rounded outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-1">
            {([['all', '全部'], ['content', '内容页'], ['dialog', '弹窗'], ['issues', '有问题']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} className={`px-2 py-1 text-[10px] rounded ${filter === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {issues.some((issue) => issue.code === 'capacity') && (
        <div className="mx-2 mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">当前小关卡规模较大，请通过真实预览检查首次加载性能。</div>
      )}

      <div
        ref={scrollRef}
        onDragOver={handleScrollDrag}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) edgeRef.current = { direction: 0, since: 0 }; }}
        className="flex-1 min-h-0 overflow-y-auto pb-6"
      >
        <div className="px-3 pt-3 pb-1 text-[10px] font-medium text-slate-500 uppercase tracking-wide">内容页</div>
        {contentPages.map((page, index) => renderPage(page, index))}
        <div className="px-3 pt-4 pb-1 text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center justify-between">
          <span>弹窗</span><span>{dialogPages.length}</span>
        </div>
        {dialogPages.length === 0 && <button onClick={() => startCreate('dialog')} className="mx-2 w-[calc(100%-16px)] py-3 border border-dashed border-slate-700 rounded text-xs text-slate-500 hover:text-slate-300 hover:border-slate-500">+ 新增弹窗</button>}
        {dialogPages.map((page, index) => renderPage(page, index))}
      </div>

      {movePageId && (
        <div
          ref={targetScrollRef}
          onDragOver={handleTargetScrollDrag}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) targetEdgeRef.current = { direction: 0, since: 0 }; }}
          className="absolute left-full top-12 ml-2 w-64 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-2xl p-2 z-50"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-medium">移动到其他小关卡</span>
            <button onClick={() => { setMovePageId(null); stopDrag(); }} className="text-slate-400 hover:text-white"><X size={14} /></button>
          </div>
          {allSameAreaSubPages.length === 0 ? <div className="p-3 text-xs text-slate-500">没有兼容的小关卡</div> : allSameAreaSubPages.map((target) => (
            <button
              key={target.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                requestMove(movePageId, target);
              }}
              onClick={() => {
                requestMove(movePageId, target);
              }}
              className="w-full text-left px-3 py-2 mb-1 rounded border border-slate-700 bg-slate-900/60 hover:border-blue-500 hover:bg-blue-500/10"
            >
              <div className="text-xs text-slate-200 truncate">{target.name}</div>
              <div className="text-[10px] text-slate-500">移入末尾 · {target.internalPages.length + 1} 页</div>
            </button>
          ))}
        </div>
      )}

      {createKind && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center" onClick={() => setCreateKind(null)}>
          <div className="w-96 rounded-lg border border-slate-700 bg-slate-800 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-700 text-sm font-medium">新增{createKind === 'dialog' ? '弹窗' : '内容页'}</div>
            <div className="p-4 space-y-3">
              <label className="block text-xs text-slate-400">页面名称</label>
              <input autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && createName.trim()) { addInternalPage(createKind, createName); setCreateKind(null); } }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm outline-none focus:border-blue-500" />
              {internalPages.some((page) => page.name === createName.trim()) && <div className="text-xs text-red-400">同一小关卡内页面名称不能重复</div>}
            </div>
            <div className="p-3 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => setCreateKind(null)} className="px-4 py-2 text-xs bg-slate-700 rounded">取消</button>
              <button disabled={!createName.trim() || internalPages.some((page) => page.name === createName.trim())} onClick={() => { addInternalPage(createKind, createName); setCreateKind(null); }} className="px-4 py-2 text-xs bg-blue-600 disabled:opacity-40 rounded">创建</button>
            </div>
          </div>
        </div>
      )}

      {deletePage && (
        <ConfirmDialog
          title={`删除${deletePage.kind === 'dialog' ? '弹窗' : '内容页'}`}
          message={`${deletePage.elements.length > 0 ? `页面包含 ${deletePage.elements.length} 个元素。\n` : ''}${referenceCount(subPage, deletePage.id) > 0 ? `删除后将有 ${referenceCount(subPage, deletePage.id)} 条页面关系失效。\n` : ''}确定删除“${deletePage.name}”吗？可使用撤销恢复。`}
          danger
          onCancel={() => setDeletePage(null)}
          onConfirm={() => { deleteInternalPage(deletePage.id); setDeletePage(null); }}
        />
      )}
      {moveRequest && (
        <ConfirmDialog
          title="确认跨小关卡移动"
          message={[
            `目标：${moveRequest.targetName}`,
            moveRequest.impact.invalidRelationCount > 0
              ? `将产生 ${moveRequest.impact.invalidRelationCount} 条失效页面关系，移动后会保留断链提醒。`
              : '不会产生失效页面关系。',
            moveRequest.impact.changesDialogBase ? '该弹窗的底板将切换为目标小关卡主界面。' : '',
            moveRequest.impact.nameCollision ? `目标存在同名页面，将自动命名为“${moveRequest.impact.resolvedName}”。` : '',
          ].filter(Boolean).join('\n')}
          confirmText="确认移动"
          onConfirm={() => {
            const result = moveInternalPage(moveRequest.pageId, moveRequest.targetSubPageId, moveRequest.targetIndex);
            if (!result.ok) showToast(result.error ?? '移动失败', 'error');
            else showToast(`已移动到 ${moveRequest.targetName}`, 'success');
            setMoveRequest(null);
          }}
          onCancel={() => setMoveRequest(null)}
        />
      )}
    </div>
  );
}
