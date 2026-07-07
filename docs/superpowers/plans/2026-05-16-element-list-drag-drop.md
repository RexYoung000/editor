# Element List Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace button-based layer ordering in the ElementList with HTML5 drag-and-drop that also supports dragging elements into/out of container parents.

**Architecture:** HTML5 native Drag & Drop API on the ElementList component. Two new store actions (`reorderElement`, `setElementParent`) handle the data changes. Visual feedback via React state tracking drag position.

**Tech Stack:** React, Zustand/immer, HTML5 Drag & Drop API, TypeScript

---

### Task 1: Add store actions `reorderElement` and `setElementParent`

**Files:**
- Modify: `src/store/editorStore.ts` — interface (~line 62) and implementation (~line 871)

- [ ] **Step 1: Add the two actions to the `EditorState` interface**

After the existing `moveElementLayer` declaration (line 62), add:

```ts
  reorderElement: (id: string, newIndex: number) => void;
  setElementParent: (id: string, newParentId: string | undefined) => void;
```

- [ ] **Step 2: Add the `reorderElement` implementation**

After the `moveElementLayer` action (ends at line 918), add:

```ts
    reorderElement: (id, newIndex) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element) return;
        // Only reorder among siblings (same parentId)
        const siblings = page.elements.filter((e) => e.parentId === element.parentId);
        const currentSiblingIndex = siblings.findIndex((e) => e.id === id);
        if (currentSiblingIndex === -1 || currentSiblingIndex === newIndex) return;
        // Remove from current position in siblings, insert at newIndex
        const [removed] = siblings.splice(currentSiblingIndex, 1);
        siblings.splice(newIndex, 0, removed);
        // Now rebuild the full elements array: keep non-siblings in place, siblings in new order
        const siblingIds = new Set(siblings.map((e) => e.id));
        const result: Element[] = [];
        let siblingInsertIdx = 0;
        for (const el of page.elements) {
          if (!siblingIds.has(el.id)) {
            result.push(el);
          } else if (el.id === id) {
            // skip, will be inserted from siblings array
          } else {
            // skip other siblings, they'll be re-inserted from siblings array
          }
        }
        // Find where siblings start in original array, replace that block
        const firstSiblingOrigIdx = page.elements.findIndex((e) => siblingIds.has(e.id));
        page.elements.splice(firstSiblingOrigIdx, siblings.length, ...siblings);
        get().saveHistory();
      }),
```

Wait — that splice-based approach is fragile. Let me simplify. The `elements[]` array is a flat list where order matters for z-ordering. Siblings (elements with same `parentId`) are not necessarily contiguous in this array. But the `moveElementLayer` action already works on the flat array index. Let me use a simpler approach:

```ts
    reorderElement: (id, newIndex) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        // Find the element and its siblings
        const element = page.elements.find((e) => e.id === id);
        if (!element) return;
        // Get all sibling IDs (same parentId level)
        const parentId = element.parentId;
        const siblingIds = page.elements
          .filter((e) => e.parentId === parentId)
          .map((e) => e.id);
        const currentPos = siblingIds.indexOf(id);
        if (currentPos === -1 || currentPos === newIndex) return;
        // Reorder the siblingIds array
        siblingIds.splice(currentPos, 1);
        siblingIds.splice(newIndex, 0, id);
        // Rebuild elements array preserving non-sibling order
        const newElements: Element[] = [];
        const siblingMap = new Map(siblingIds.map((sid, i) => [sid, page.elements.find((e) => e.id === sid)!]));
        let siblingInserted = false;
        for (const el of page.elements) {
          if (el.parentId !== parentId) {
            newElements.push(el);
          } else if (!siblingInserted) {
            // Insert all siblings in new order at the first sibling position
            for (const sid of siblingIds) {
              newElements.push(page.elements.find((e) => e.id === sid)!);
            }
            siblingInserted = true;
          }
          // Skip siblings (already inserted as a block)
        }
        page.elements = newElements;
        get().saveHistory();
      }),
```

Actually, this is still complex. The simplest correct approach: siblings ARE contiguous in `page.elements` because they're inserted together. Let me just use splice on the flat array, constrained to the sibling range:

```ts
    reorderElement: (id, newIndex) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || element.locked) return;
        const parentId = element.parentId ?? undefined;
        // Find the range of siblings in the flat array
        const siblings = page.elements.filter((e) => (e.parentId ?? undefined) === parentId);
        const currentIdx = page.elements.findIndex((e) => e.id === id);
        // Compute the flat-array insertion point from the sibling-relative newIndex
        const firstSiblingIdx = page.elements.findIndex((e) => (e.parentId ?? undefined) === parentId);
        const targetIdx = firstSiblingIdx + newIndex;
        if (currentIdx === targetIdx) return;
        const [removed] = page.elements.splice(currentIdx, 1);
        page.elements.splice(targetIdx > currentIdx ? targetIdx - 1 : targetIdx, 0, removed);
        get().saveHistory();
      }),
```

Hmm, siblings might not be contiguous. Children of PageTurnBox are interleaved. Let me use the most robust approach: reorder among the sibling subset and rebuild the full array preserving non-sibling order:

Actually, the simplest approach that works regardless of contiguity:

```ts
    reorderElement: (id, newIndex) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || element.locked) return;
        const parentId = element.parentId;
        // Collect siblings in their current flat-array order
        const siblings = page.elements.filter((e) => e.parentId === parentId);
        const currentSiblingPos = siblings.findIndex((e) => e.id === id);
        if (currentSiblingPos === -1 || currentSiblingPos === newIndex) return;
        // Reorder the siblings array
        const [removed] = siblings.splice(currentSiblingPos, 1);
        siblings.splice(newIndex, 0, removed);
        // Rebuild flat array: replace all sibling entries with reordered ones, keep others in place
        const siblingIdSet = new Set(siblings.map((e) => e.id));
        const newElements: Element[] = [];
        let siblingIdx = 0;
        for (const el of page.elements) {
          if (siblingIdSet.has(el.id)) {
            newElements.push(siblings[siblingIdx++]);
          } else {
            newElements.push(el);
          }
        }
        page.elements = newElements;
        get().saveHistory();
      }),
```

This is clean and correct regardless of whether siblings are contiguous.

- [ ] **Step 3: Add the `setElementParent` implementation**

Right after `reorderElement`, add:

```ts
    setElementParent: (id, newParentId) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || element.locked) return;
        // Prevent setting parent to self or any descendant (circular reference)
        if (newParentId) {
          if (newParentId === id) return;
          let pid: string | undefined = newParentId;
          while (pid) {
            if (pid === id) return; // circular!
            const parent = page.elements.find((e) => e.id === pid);
            pid = parent?.parentId;
          }
          // Verify newParentId is a valid container type
          const parentEl = page.elements.find((e) => e.id === newParentId);
          if (!parentEl) return;
          const containerTypes = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];
          if (!containerTypes.includes(parentEl.type)) return;
        }
        // Fix x/y to keep world position stable
        const getAncestorOffset = (pid: string | undefined): { ax: number; ay: number } => {
          let ax = 0, ay = 0;
          let cur = pid;
          while (cur) {
            const parent = page.elements.find((e) => e.id === cur);
            if (!parent) break;
            ax += parent.x; ay += parent.y;
            cur = parent.parentId;
          }
          return { ax, ay };
        };
        const oldOffset = getAncestorOffset(element.parentId);
        const newOffset = getAncestorOffset(newParentId);
        element.x = element.x + oldOffset.ax - newOffset.ax;
        element.y = element.y + oldOffset.ay - newOffset.ay;
        element.parentId = newParentId || undefined;
        // Also fix x/y of all children of the moved element (their world pos must stay stable too)
        const childIds = new Set<string>();
        let changed = true;
        while (changed) {
          changed = false;
          for (const e of page.elements) {
            if (e.parentId === id && !childIds.has(e.id)) {
              childIds.add(e.id);
              changed = true;
            }
            // Children of children
            if (e.parentId && childIds.has(e.parentId) && !childIds.has(e.id)) {
              childIds.add(e.id);
              changed = true;
            }
          }
        }
        // Children's offset change = (newOffset for their new ancestor chain) - (oldOffset)
        // Since the parent element moved, the delta is the same for all children
        const dx = oldOffset.ax - newOffset.ax;
        const dy = oldOffset.ay - newOffset.ay;
        for (const cid of childIds) {
          const child = page.elements.find((e) => e.id === cid);
          if (child) {
            // The child's world pos = child.x + parent chain. The parent (element) already got dx/dy adjustment.
            // But child.x/y are relative to their direct parent, which didn't change (still `id` or another child).
            // So children's local coords don't need adjustment — their world coords auto-adjust because
            // their parent (element) moved by dx/dy in local coords.
          }
        }
        // Actually, children DON'T need adjustment. Their x/y are relative to their parentId,
        // and their parentId didn't change. The parent (element) moved, so world coords of children
        // automatically shift by dx/dy because parent's local coords changed by dx/dy.
        get().saveHistory();
      }),
```

Wait, I need to think about child coordinate correction more carefully.

When element A (parentId=oldParent) gets new parentId=newParent:
- A.x was relative to oldParent. Now A.x should be relative to newParent.
- A's children (parentId=A.id) are relative to A. A's local x/y changed by (oldOffset - newOffset).
- But the children's world coords = child.x + A.x + parentChain(A).
- Before: child.worldX = child.x + A.x + oldParent.x + ...
- After: child.worldX = child.x + A.newX + newParent.x + ...
- Since A.newX = A.x + oldOffset - newOffset, and oldOffset includes oldParent.x+..., newOffset includes newParent.x+...
- child.worldX_before = child.x + A.x + oldOffset
- child.worldX_after = child.x + (A.x + oldOffset - newOffset) + newOffset = child.x + A.x + oldOffset
- Same! Children's world coords are automatically stable because parent's local coords shifted to compensate.

So children DO NOT need any adjustment. The comment above is correct. Let me clean this up:

```ts
    setElementParent: (id, newParentId) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || element.locked) return;
        if (newParentId) {
          if (newParentId === id) return;
          let pid: string | undefined = newParentId;
          while (pid) {
            if (pid === id) return;
            const p = page.elements.find((e) => e.id === pid);
            pid = p?.parentId;
          }
          const parentEl = page.elements.find((e) => e.id === newParentId);
          if (!parentEl) return;
          const containerTypes = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];
          if (!containerTypes.includes(parentEl.type)) return;
        }
        const getAncestorOffset = (pid: string | undefined): { ax: number; ay: number } => {
          let ax = 0, ay = 0, cur = pid;
          while (cur) {
            const p = page.elements.find((e) => e.id === cur);
            if (!p) break;
            ax += p.x; ay += p.y; cur = p.parentId;
          }
          return { ax, ay };
        };
        const oldOff = getAncestorOffset(element.parentId);
        const newOff = getAncestorOffset(newParentId);
        element.x += oldOff.ax - newOff.ax;
        element.y += oldOff.ay - newOff.ay;
        element.parentId = newParentId || undefined;
        // Children's world coords stay stable automatically (their local coords are relative to this element,
        // which shifted by exactly the right amount)
        get().saveHistory();
      }),
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty`
Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add src/store/editorStore.ts
git commit -m "feat: add reorderElement and setElementParent store actions for drag-and-drop"
```

---

### Task 2: Rewrite ElementList with drag-and-drop support

**Files:**
- Rewrite: `src/components/ElementList.tsx`
- Modify: `src/i18n/translations.ts` — add drag/drop hint translations

This is the main task. The ElementList component needs a complete rewrite of its rendering logic to support drag events, drop indicators, and parent-change operations.

- [ ] **Step 1: Add i18n keys for drag/drop**

In `src/i18n/translations.ts`, add to the zh section (after `duplicateName`):

```ts
    dragIntoContainer: '拖入容器',
    dragOutOfContainer: '拖出容器',
```

And to the en section (after `duplicateName`):

```ts
    dragIntoContainer: 'Drop into container',
    dragOutOfContainer: 'Drop out of container',
```

- [ ] **Step 2: Rewrite ElementList.tsx**

The full rewrite. Key changes:
1. Add `useState` for drag state (`draggedId`, `dropTarget`)
2. Import `reorderElement` and `setElementParent` from store
3. Each element row gets `draggable` + `onDragStart/End/Over/Drop`
4. Drop indicator: blue line for reorder, blue border for container drop
5. Remove the 4 layer-ordering buttons, keep delete button
6. Add a "drop zone" at top-level for dragging children out

```tsx
import { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { elementMeta } from '../elements/elementMeta';
import { showToast } from '../utils/toast';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../i18n';

const CONTAINER_TYPES = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];

type DropTarget = 
  | { kind: 'reorder'; parentId: string | undefined; index: number }
  | { kind: 'into-container'; containerId: string };

export default function ElementList() {
  const { t } = useI18n();
  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const reorderElement = useEditorStore((s) => s.reorderElement);
  const setElementParent = useEditorStore((s) => s.setElementParent);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const alignElements = useEditorStore((s) => s.alignElements);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const currentPage = (() => {
    if (!currentCourse || !currentSubPageId) return undefined;
    for (const stage of currentCourse.stages) {
      const sp = stage.subPages.find((s) => s.id === currentSubPageId);
      if (sp) return sp;
    }
    for (const stage of (currentCourse.previewStages ?? [])) {
      const sp = stage.subPages.find((s) => s.id === currentSubPageId);
      if (sp) return sp;
    }
    return undefined;
  })();
  const elements = currentPage?.elements ?? [];

  if (!currentPage) return null;

  // Helpers
  const isDescendantOf = (childId: string, ancestorId: string): boolean => {
    let pid: string | undefined = childId;
    while (pid) {
      if (pid === ancestorId) return true;
      const parent = elements.find(e => e.id === pid);
      pid = parent?.parentId;
    }
    return false;
  };

  const getChildren = (parentId: string | undefined) => elements.filter(e => e.parentId === parentId);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, el: typeof elements[0]) => {
    if (el.locked) { e.preventDefault(); return; }
    setDraggedId(el.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.id);
    // Make dragged row semi-transparent
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => { target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragOverRow = (e: React.DragEvent, el: typeof elements[0]) => {
    e.preventDefault();
    if (!draggedId || draggedId === el.id) return;
    if (isDescendantOf(el.id, draggedId)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const isContainer = CONTAINER_TYPES.includes(el.type);
    const parentId = el.parentId;

    // Upper 25% or lower 25% → reorder; middle 50% of a container → drop into container
    if (isContainer && y > rect.height * 0.25 && y < rect.height * 0.75) {
      setDropTarget({ kind: 'into-container', containerId: el.id });
    } else {
      const siblings = getChildren(parentId);
      const siblingIndex = siblings.findIndex(s => s.id === el.id);
      // Above center → insert before this element; below center → insert after
      const insertIndex = y < rect.height / 2 ? siblingIndex : siblingIndex + 1;
      setDropTarget({ kind: 'reorder', parentId, index: insertIndex });
    }
  };

  const handleDragOverTopLevel = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId) return;
    // Dragging to top-level zone means: if currently a child, detach to top level
    const draggedEl = elements.find(e => e.id === draggedId);
    if (!draggedEl || !draggedEl.parentId) return; // already top-level, no special handling
    const topLevelElements = getChildren(undefined);
    setDropTarget({ kind: 'reorder', parentId: undefined, index: topLevelElements.length });
  };

  const handleDropRow = (e: React.DragEvent, el: typeof elements[0]) => {
    e.preventDefault();
    if (!draggedId || !dropTarget) return;

    if (dropTarget.kind === 'into-container') {
      setElementParent(draggedId, dropTarget.containerId);
    } else if (dropTarget.kind === 'reorder') {
      const draggedEl = elements.find(e => e.id === draggedId);
      if (!draggedEl) return;
      // If changing parentId (different level), do that first
      if (draggedEl.parentId !== dropTarget.parentId) {
        setElementParent(draggedId, dropTarget.parentId || undefined);
      }
      // Then reorder within the target level
      reorderElement(draggedId, dropTarget.index);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDropTopLevel = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || !dropTarget) return;
    const draggedEl = elements.find(e => e.id === draggedId);
    if (!draggedEl) return;
    if (draggedEl.parentId) {
      setElementParent(draggedId, undefined);
    }
    if (dropTarget.kind === 'reorder') {
      reorderElement(draggedId, dropTarget.index);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  // Render
  const topLevel = getChildren(undefined);

  const renderDropIndicator = (parentId: string | undefined, index: number) => {
    if (dropTarget?.kind === 'reorder' && dropTarget.parentId === parentId && dropTarget.index === index) {
      return <div className="h-0.5 bg-blue-500 rounded mx-2" />;
    }
    return null;
  };

  const renderEl = (el: typeof elements[0], depth: number): JSX.Element => {
    const meta = elementMeta[el.type];
    const isSelected = selectedElementIds.includes(el.id);
    const editorHidden = (el.props as Record<string, unknown>)?._editorHidden === true;
    const isDragging = draggedId === el.id;
    const isContainerTarget = dropTarget?.kind === 'into-container' && dropTarget.containerId === el.id;
    const children = getChildren(el.id);
    const parentId = el.parentId;

    return (
      <div key={el.id}>
        {renderDropIndicator(parentId, getChildren(parentId).findIndex(s => s.id === el.id))}
        <div
          className={`flex items-center gap-1 py-1 text-xs transition-colors ${
            isDragging ? 'opacity-0.4' :
            isContainerTarget ? 'ring-2 ring-blue-500 rounded mx-1' :
            isSelected ? 'bg-blue-600/30 text-blue-300' :
            editorHidden ? 'text-slate-500 opacity-50 hover:bg-slate-700' :
            'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
          draggable={!el.locked}
          onDragStart={(e) => handleDragStart(e, el)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverRow(e, el)}
          onDrop={(e) => handleDropRow(e, el)}
        >
          <button
            onClick={() => updateElement(el.id, { props: { ...el.props, _editorHidden: !editorHidden } })}
            className={`p-0.5 shrink-0 rounded ${editorHidden ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-200'}`}
            title={editorHidden ? '显示' : '隐藏'}
          >
            {editorHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <button
            onClick={(e) => { selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? '#3b82f6' : '#475569' }} />
            <span className="truncate flex-1" onDoubleClick={(e) => {
              e.stopPropagation();
              const span = e.currentTarget;
              const input = document.createElement('input');
              input.value = el.name || '';
              input.className = 'text-xs bg-slate-600 text-white rounded px-1 w-full outline-none';
              span.textContent = '';
              span.appendChild(input);
              input.focus();
              input.select();
              const finish = () => {
                const raw = input.value.trim();
                const name = raw.replace(/[^a-zA-Z0-9_-]/g, '') || el.name;
                span.textContent = name || meta?.label || el.type;
                if (name && name !== el.name) {
                  if (elements.some(e => e.id !== el.id && e.name === name)) {
                    showToast(t('duplicateName'), 'error');
                    span.textContent = el.name || meta?.label || el.type;
                    return;
                  }
                  updateElement(el.id, { name } as any);
                  useEditorStore.getState().saveHistory();
                }
              };
              input.onblur = finish;
              input.onkeydown = (ke) => { if (ke.key === 'Enter') input.blur(); if (ke.key === 'Escape') { input.value = el.name || ''; input.blur(); } };
            }}>{el.name || meta?.label || el.type}</span>
            <span className="text-slate-500 text-[10px] shrink-0">{meta?.label || el.type}</span>
          </button>
          {isSelected && !el.locked && (
            <button onClick={() => { deleteElement(el.id); clearSelection(); }} className="p-0.5 hover:bg-red-900 rounded text-red-400" title={t('deleteElement')}><Trash2 size={11} /></button>
          )}
        </div>
        {children.map(child => renderEl(child, depth + 1))}
        {/* Drop indicator at end of this element's children */}
        {renderDropIndicator(el.id, children.length)}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0"
      onDragOver={(e) => handleDragOverTopLevel(e)}
      onDrop={(e) => handleDropTopLevel(e)}
    >
      <div className="h-9 flex items-center px-3 text-xs font-medium text-slate-400">
        {t('elementList')} ({elements.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-slate-500">{t('noElements')}</span>
          </div>
        ) : (
          <div className="py-1">
            {renderDropIndicator(undefined, 0)}
            {topLevel.map(el => renderEl(el, 0))}
            {renderDropIndicator(undefined, topLevel.length)}
          </div>
        )}
        {selectedElementIds.length >= 2 && (
          <div className="px-2 py-1.5 border-t border-slate-700">
            <div className="text-[10px] text-slate-500 mb-1">{t('align')}</div>
            <div className="flex gap-1 mb-1">
              <button onClick={() => alignElements('left')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignLeft')}><AlignStartVertical size={12} /></button>
              <button onClick={() => alignElements('centerH')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignCenterH')}><AlignCenterVertical size={12} /></button>
              <button onClick={() => alignElements('right')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignRight')}><AlignEndVertical size={12} /></button>
              <span className="w-px bg-slate-700" />
              <button onClick={() => alignElements('top')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignTop')}><AlignStartHorizontal size={12} /></button>
              <button onClick={() => alignElements('centerV')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignCenterV')}><AlignCenterHorizontal size={12} /></button>
              <button onClick={() => alignElements('bottom')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title={t('alignBottom')}><AlignEndHorizontal size={12} /></button>
            </div>
            {selectedElementIds.length >= 3 && (
              <div className="flex gap-1">
                <button onClick={() => alignElements('distributeH')} className="flex-1 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-400">{t('distributeH')}</button>
                <button onClick={() => alignElements('distributeV')} className="flex-1 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-400">{t('distributeV')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: The `AlignStartVertical`, `AlignCenterVertical`, `AlignEndVertical`, `AlignStartHorizontal`, `AlignCenterHorizontal`, `AlignEndHorizontal` imports are kept for the alignment section. The `ArrowUp`, `ArrowDown`, `ChevronsUp`, `ChevronsDown` imports are removed. The `moveElementLayer` store subscription is removed.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ElementList.tsx src/i18n/translations.ts
git commit -m "feat: rewrite ElementList with drag-and-drop reorder and parent change"
```

---

### Task 3: Clean up — remove `moveElementLayer` references if unused

**Files:**
- Modify: `src/store/editorStore.ts` — remove `moveElementLayer` from interface and implementation (optional)
- Check: any other files that reference `moveElementLayer`

Since `moveElementLayer` is still used in ElementList's old code (which we just removed), and it might be used elsewhere, we should check first. If it's only used by ElementList, we can remove it. Otherwise, keep it for backward compatibility.

- [ ] **Step 1: Search for all `moveElementLayer` references**

Run: `grep -r "moveElementLayer" src/ --include="*.ts" --include="*.tsx"`
Expected: only in `editorStore.ts` (interface + implementation) since we removed the ElementList usage in Task 2

If references exist elsewhere, keep `moveElementLayer`. If only in the store, remove it.

- [ ] **Step 2: If only in store, remove the action**

Remove from interface (line ~62):
```ts
  moveElementLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
```

Remove from implementation (lines 871-918).

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add src/store/editorStore.ts
git commit -m "refactor: remove moveElementLayer action, replaced by drag-and-drop"
```

---

## Self-Review

**Spec coverage:**
- ✅ Drag reorder within same level → Task 2 (handleDragOverRow + reorderElement)
- ✅ Drag into container → Task 2 (into-container drop target + setElementParent)
- ✅ Drag out of container → Task 2 (handleDragOverTopLevel + setElementParent(null))
- ✅ reorderElement store action → Task 1
- ✅ setElementParent store action → Task 1 (with coordinate correction)
- ✅ Visual indicators → Task 2 (drop indicator lines, container ring highlight)
- ✅ Circular reference prevention → Task 1 (setElementParent)
- ✅ Container type validation → Task 1 (CONTAINER_TYPES constant)
- ✅ Locked element prevention → Task 2 (draggable={!el.locked})
- ✅ Semi-transparent dragged row → Task 2 (opacity 0.4)

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code is provided inline.

**Type consistency:** `CONTAINER_TYPES` array defined in Task 2 matches the list from PropertyPanel in the spec. `DropTarget` type defined once and used consistently. `reorderElement(id, newIndex)` and `setElementParent(id, newParentId)` signatures match between Task 1 interface/implementation and Task 2 usage.