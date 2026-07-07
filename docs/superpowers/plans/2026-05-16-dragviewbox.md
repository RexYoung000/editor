# DragViewBox 拖拽题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在豌豆口才 tab 下实现「拖拽题」一键创建，含 DragViewBox + dropbox/dragbox + DragObj/DropObj 完整结构，属性面板增删管理，导出 .scene 与 LayaIDE 对齐。

**Architecture:** 复用 ChoiceBox 的「组合创建 + 属性面板增删」模式。引入 DragDropBox/DragDragBox 两个 meta 条目作为 dropbox/dragbox 的编辑器类型（layaType=Box），使 ElementList 显示中文 label。导出时 defaultProps.name 自然写入 .scene。

**Tech Stack:** TypeScript, React, Zustand (immer), LayaAir 2.x runtime

**Spec:** `docs/superpowers/specs/2026-05-16-dragviewbox-design.md`

**Note:** 本项目无测试框架。每个 Task 以 `pnpm build`（tsc 编译）验证，最终以 dev server 手动验证功能。用户自行审查后手动 git commit。

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/elements/elementMeta.ts` | 替换 DragViewBox/DragObj/DropObj 条目，新增 DragDropBox/DragDragBox |
| Modify | `src/store/editorStore.ts` | 新增 4 个 action + 接口声明 + containerTypes 白名单 |
| Modify | `src/components/ElementToolbar.tsx` | 新增「拖拽题」按钮 + handleAddDragGame |
| Modify | `src/components/PropertyPanel.tsx` | 新增拖拽组件管理 section + 父容器白名单 |
| Modify | `src/components/ElementList.tsx` | CONTAINER_TYPES 白名单 + 拖拽约束 |
| Modify | `src/i18n/translations.ts` | 新增翻译条目 |

---

### Task 1: 更新 elementMeta.ts — 替换/新增 5 条 meta

**Files:**
- Modify: `src/elements/elementMeta.ts:174-177` (替换 DragView 后面的 DragObj/DropObj/DragViewBox)

- [ ] **Step 1: 替换 DragObj 条目（line 175）**

将现有 `DragObj` 替换为完整版本（category 改为 speechCourse，去掉 runtime，加 toolbarHidden + varFromName + 完整 properties）：

```ts
  DragObj:      { layaType: 'DragObj',     label: '拖拽对象', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', filterColor: '#ffff00', filterBlur: 6, canSelect: 'false' }, properties: [{ key: 'rightDropObjName', label: '正确目标', type: 'elementRef', group: '交互', elementFilter: ['DropObj'] }, { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互' }, { key: 'group', label: '分组', type: 'text', group: '交互' }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canSelect', label: '可选中', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canOverlayDrop', label: '可重叠', type: 'boolean', group: '交互' }, { key: 'isMoveEvent', label: '可移动', type: 'boolean', group: '交互' }, ...P_FILTER, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观' }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观' }] },
```

- [ ] **Step 2: 替换 DropObj 条目（line 176）**

```ts
  DropObj:      { layaType: 'DropObj',     label: '放置区域', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', isNeedTip: false, noticeColor: '#ff0000', noticeBlur: 4 }, properties: [{ key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互' }, { key: 'group', label: '分组', type: 'text', group: '交互' }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'isNeedTip', label: '显示提示', type: 'boolean', group: '交互' }, { key: 'showNotice', label: '提示边框', type: 'boolean', group: '外观' }, { key: 'noticeColor', label: '提示颜色', type: 'color', group: '外观' }, { key: 'noticeBlur', label: '提示模糊', type: 'number', min: 0, max: 20, group: '外观' }, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观' }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观' }] },
```

- [ ] **Step 3: 替换 DragViewBox 条目（line 177）**

```ts
  DragViewBox:  { layaType: 'DragViewBox', label: '拖拽容器', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultPosition: { x: 0, y: 0 }, defaultProps: { mode: 1, successPosMode: 0, dropNotice: 'true', clickPlace: 'false', changePos: 'true', backToInitPos: 'true', backAni: 'true', autoSorting: 'true' }, properties: [{ key: 'mode', label: '放置模式', type: 'select', group: '交互', options: [{ label: '鼠标位', value: 0 }, { label: '放置位', value: 1 }, { label: '自定义', value: 2 }, { label: '自动排列', value: 3 }] }, { key: 'successPosMode', label: '成功位模式', type: 'number', group: '交互' }, { key: 'dropNotice', label: '放置提示', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'clickPlace', label: '点击放置', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'changePos', label: '改变位置', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backToInitPos', label: '失败返回', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backAni', label: '返回动画', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'autoSorting', label: '自动排序', type: 'select', group: '交互', options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }] },
```

- [ ] **Step 4: 新增 DragDropBox 和 DragDragBox 条目**

在 DragViewBox 条目后面紧跟添加：

```ts
  DragDropBox:  { layaType: 'Box', label: '放置', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultProps: { mouseThrough: true, name: 'dropbox' }, properties: [] },
  DragDragBox:  { layaType: 'Box', label: '拖动', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultProps: { mouseThrough: true, name: 'dragbox' }, properties: [] },
```

- [ ] **Step 5: 验证编译**

Run: `pnpm build`
Expected: 编译通过，无 TS 错误。

---

### Task 2: 更新 CONTAINER_TYPES 白名单（3 处）

**Files:**
- Modify: `src/components/ElementList.tsx:8`
- Modify: `src/store/editorStore.ts:917`
- Modify: `src/components/PropertyPanel.tsx:330`

- [ ] **Step 1: ElementList.tsx — 加入 DragDropBox, DragDragBox**

```ts
const CONTAINER_TYPES = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];
```

- [ ] **Step 2: editorStore.ts:917 — 同步更新**

```ts
          const containerTypes = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];
```

- [ ] **Step 3: PropertyPanel.tsx:330 — 同步更新**

```ts
                      if (!['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'].includes(el.type)) return false;
```

- [ ] **Step 4: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 3: Store actions — addDropObj / removeDropObj / addDragObj / removeDragObj

**Files:**
- Modify: `src/store/editorStore.ts:86-87` (interface 声明)
- Modify: `src/store/editorStore.ts:1351` (在 removeChoiceOption 后面添加实现)

- [ ] **Step 1: 在 EditorState interface 中声明 4 个 action（约 line 87 后）**

```ts
  addDropObj: (dragViewBoxId: string) => void;
  removeDropObj: (dragViewBoxId: string) => void;
  addDragObj: (dragViewBoxId: string) => void;
  removeDragObj: (dragViewBoxId: string) => void;
```

- [ ] **Step 2: 在 removeChoiceOption 实现后面添加 addDropObj**

```ts
      addDropObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const dropbox = page.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDropBox');
            if (!dropbox) return;
            const existing = page.elements.filter(e => e.parentId === dropbox.id && e.type === 'DropObj');
            const n = existing.length + 1;
            const last = existing[existing.length - 1];
            const newEl = createDefaultElement('DropObj');
            newEl.name = `dj${n}`;
            newEl.parentId = dropbox.id;
            newEl.x = last ? last.x + 280 : 606;
            newEl.y = last ? last.y : 445;
            if (newEl.x > 1700) { newEl.x = 606; newEl.y = (last?.y ?? 445) + 220; }
            newEl.props = { ...newEl.props, var: `dj${n}` };
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(newEl);
              return state;
            });
            const obj = createLayaComponent(newEl);
            if (obj) registerObject(newEl.id, obj);
            return;
          }
        }
      },
```

- [ ] **Step 3: 添加 removeDropObj**

```ts
      removeDropObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const dropbox = page.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDropBox');
            if (!dropbox) return;
            const existing = page.elements.filter(e => e.parentId === dropbox.id && e.type === 'DropObj');
            if (existing.length <= 1) return;
            const last = existing[existing.length - 1];
            get().deleteElement(last.id);
            return;
          }
        }
      },
```

- [ ] **Step 4: 添加 addDragObj**

```ts
      addDragObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const dragbox = page.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDragBox');
            if (!dragbox) return;
            const existing = page.elements.filter(e => e.parentId === dragbox.id && e.type === 'DragObj');
            const n = existing.length + 1;
            const last = existing[existing.length - 1];
            const newEl = createDefaultElement('DragObj');
            newEl.name = `a${n}`;
            newEl.parentId = dragbox.id;
            newEl.x = last ? last.x + 280 : 606;
            newEl.y = last ? last.y : 734;
            if (newEl.x > 1700) { newEl.x = 606; newEl.y = (last?.y ?? 734) + 220; }
            newEl.props = { ...newEl.props, var: `a${n}` };
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(newEl);
              return state;
            });
            const obj = createLayaComponent(newEl);
            if (obj) registerObject(newEl.id, obj);
            // 创建子 Image
            const img = createDefaultElement('Image');
            img.name = '';
            img.parentId = newEl.id;
            img.x = 7.5; img.y = 6;
            img.width = newEl.width - 15; img.height = newEl.height - 12;
            img.props = { skin: '' };
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(img);
              return state;
            });
            const imgObj = createLayaComponent(img);
            if (imgObj) registerObject(img.id, imgObj);
            return;
          }
        }
      },
```

- [ ] **Step 5: 添加 removeDragObj**

```ts
      removeDragObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const dragbox = page.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDragBox');
            if (!dragbox) return;
            const existing = page.elements.filter(e => e.parentId === dragbox.id && e.type === 'DragObj');
            if (existing.length <= 1) return;
            const last = existing[existing.length - 1];
            // 先删子 Image
            const children = page.elements.filter(e => e.parentId === last.id);
            for (const child of children) get().deleteElement(child.id);
            get().deleteElement(last.id);
            return;
          }
        }
      },
```

- [ ] **Step 6: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 4: ElementToolbar — 添加「拖拽题」按钮

**Files:**
- Modify: `src/components/ElementToolbar.tsx:187-220` (在 handleAddChoice 后面添加 handleAddDragGame)
- Modify: `src/components/ElementToolbar.tsx:255-265` (在「选择题」按钮后面添加「拖拽题」按钮)

- [ ] **Step 1: 在 handleAddChoice 函数后面添加 handleAddDragGame**

```tsx
  /** 口才课拖拽题：创建 DragViewBox + dropbox + dragbox + 默认 DropObj + DragObj + Image */
  const handleAddDragGame = () => {
    if (frozen) return;
    const dvb = createDefaultElement('DragViewBox');
    dvb.name = '';

    const dropbox = createDefaultElement('DragDropBox');
    dropbox.name = '';
    dropbox.parentId = dvb.id;
    dropbox.x = 0; dropbox.y = 0;
    dropbox.locked = true;

    const dragbox = createDefaultElement('DragDragBox');
    dragbox.name = '';
    dragbox.parentId = dvb.id;
    dragbox.x = 0; dragbox.y = 0;
    dragbox.locked = true;

    const dropObj = createDefaultElement('DropObj');
    dropObj.name = 'dj1';
    dropObj.parentId = dropbox.id;
    dropObj.x = 606; dropObj.y = 445;
    dropObj.props = { ...dropObj.props, var: 'dj1' };

    const dragObj = createDefaultElement('DragObj');
    dragObj.name = 'a1';
    dragObj.parentId = dragbox.id;
    dragObj.x = 606; dragObj.y = 734;
    dragObj.props = { ...dragObj.props, var: 'a1' };

    const img = createDefaultElement('Image');
    img.name = '';
    img.parentId = dragObj.id;
    img.x = 7.5; img.y = 6;
    img.width = dragObj.width - 15; img.height = dragObj.height - 12;
    img.props = { skin: '' };

    const allEls = [dvb, dropbox, dragbox, dropObj, dragObj, img];
    allEls.forEach(el => {
      const obj = createLayaComponent(el);
      if (obj) registerObject(el.id, obj);
      addElement(el);
    });

    selectElement(dvb.id, false);
  };
```

- [ ] **Step 2: 在「选择题」按钮后面添加「拖拽题」按钮 UI**

在 `handleAddChoice` 按钮的 `</button>` 后面添加：

```tsx
            <button
              onClick={handleAddDragGame}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('拖拽题', language)}
            </button>
```

- [ ] **Step 3: 确保 import 中有 createLayaComponent, registerObject**

检查 ElementToolbar.tsx 顶部 import。如果已有（从 `../utils/layaBridge`），跳过。否则添加：

```ts
import { createLayaComponent, registerObject } from '../utils/layaBridge';
```

同样确保 `createDefaultElement` 已从 `'../elements/elementMeta'` 导入。

- [ ] **Step 4: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 5: PropertyPanel — 拖拽组件管理 section

**Files:**
- Modify: `src/components/PropertyPanel.tsx:29-30` (import store actions)
- Modify: `src/components/PropertyPanel.tsx:303-315` (在 ChoiceBox section 后面添加 DragViewBox section)

- [ ] **Step 1: 在 store hooks 区域添加 4 个 action 引用**

在 `const removeChoiceOption = ...` 后面添加：

```tsx
  const addDropObj = useEditorStore((s) => s.addDropObj);
  const removeDropObj = useEditorStore((s) => s.removeDropObj);
  const addDragObj = useEditorStore((s) => s.addDragObj);
  const removeDragObj = useEditorStore((s) => s.removeDragObj);
```

- [ ] **Step 2: 在 ChoiceBox 选项管理 section 后面添加 DragViewBox 管理 section**

在 `{/* 口才课选择题：选项管理 */}` 的 `</>` 闭合后面添加：

```tsx
              {/* 拖拽题：组件管理 */}
              {single && single.type === 'DragViewBox' && (
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-slate-500 mb-1.5">拖拽组件管理</div>
                  <div className="flex gap-1 mb-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">放置：</span>
                    <button onClick={() => addDropObj(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> 添加
                    </button>
                    <button onClick={() => removeDropObj(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">拖动：</span>
                    <button onClick={() => addDragObj(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> 添加
                    </button>
                    <button onClick={() => removeDragObj(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
```

- [ ] **Step 3: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 6: ElementList — 拖拽约束（DropObj 只进 dropbox，DragObj 只进 dragbox）

**Files:**
- Modify: `src/components/ElementList.tsx` (reparent 逻辑处)

- [ ] **Step 1: 在 ElementList.tsx handleDropRow 中添加约束**

在 `handleDropRow` 函数（约 line 103）中，`if (dropTarget.kind === 'into-container')` 分支内，在 `setElementParent` 调用前添加约束检查：

```tsx
  const handleDropRow = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || !dropTarget) return;

    if (dropTarget.kind === 'into-container') {
      const draggedEl = elements.find(e => e.id === draggedId);
      const targetEl = elements.find(e => e.id === dropTarget.containerId);
      // 拖拽约束：DropObj 只能放入 DragDropBox，DragObj 只能放入 DragDragBox
      if (draggedEl?.type === 'DropObj' && targetEl?.type !== 'DragDropBox') { setDraggedId(null); setDropTarget(null); return; }
      if (draggedEl?.type === 'DragObj' && targetEl?.type !== 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
      // DragDropBox/DragDragBox 不可被拖出
      if (draggedEl?.type === 'DragDropBox' || draggedEl?.type === 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
      setElementParent(draggedId, dropTarget.containerId);
    } else if (dropTarget.kind === 'reorder') {
```

注意：这是替换现有 `handleDropRow` 的前半段。保留 `reorder` 分支不变。同样在 `reorder` 分支中，如果 `draggedEl.parentId !== dropTarget.parentId` 触发 reparent，也需要加同样的约束。在 `setElementParent(draggedId, dropTarget.parentId || undefined)` 前添加：

```tsx
      // 拖拽约束同上
      if (draggedEl.type === 'DropObj' || draggedEl.type === 'DragObj' || draggedEl.type === 'DragDropBox' || draggedEl.type === 'DragDragBox') {
        const targetParent = dropTarget.parentId ? elements.find(e => e.id === dropTarget.parentId) : undefined;
        if (draggedEl.type === 'DropObj' && targetParent?.type !== 'DragDropBox') { setDraggedId(null); setDropTarget(null); return; }
        if (draggedEl.type === 'DragObj' && targetParent?.type !== 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
        if (draggedEl.type === 'DragDropBox' || draggedEl.type === 'DragDragBox') { setDraggedId(null); setDropTarget(null); return; }
      }
```

- [ ] **Step 2: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 7: i18n 翻译条目

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: 在 zh-CN 和 en 翻译对象中添加条目**

在 `elementDragViewBox` 附近添加（如果已有 elementDragViewBox 则更新）：

zh-CN:
```ts
    elementDragViewBox: '拖拽容器',
    elementDragDropBox: '放置',
    elementDragDragBox: '拖动',
    elementDragObj: '拖拽对象',
    elementDropObj: '放置区域',
    dragGameManagement: '拖拽组件管理',
    dragGame: '拖拽题',
```

en:
```ts
    elementDragViewBox: 'Drag View Box',
    elementDragDropBox: 'Drop Zone',
    elementDragDragBox: 'Drag Zone',
    elementDragObj: 'Drag Object',
    elementDropObj: 'Drop Object',
    dragGameManagement: 'Drag Components',
    dragGame: 'Drag Game',
```

- [ ] **Step 2: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 8: 端到端手动验证

**Files:** 无新修改

- [ ] **Step 1: 启动 dev server**

Run: `pnpm dev`

- [ ] **Step 2: 验证工具栏**

打开浏览器 → 「豌豆口才」tab → 确认「拖拽题」按钮存在 → 点击 → 元素列表出现：
- DragViewBox
  - 放置
    - DropObj (dj1)
  - 拖动
    - DragObj (a1)
      - Image

- [ ] **Step 3: 验证属性面板**

选中 DragViewBox → 属性面板显示「拖拽组件管理」section，有放置 +/− 和拖动 +/− 按钮。
点击放置 + → 新增 DropObj dj2。点击拖动 + → 新增 DragObj a2 + Image。
点击 − → 删除最后一个。最少保留 1 个时 − 无效。

- [ ] **Step 4: 验证 DragObj 属性**

选中 DragObj → 属性面板显示：正确目标（elementRef 下拉）、自定义属性、分组、已放置、可选中、滤镜颜色/模糊、轴心X/Y。

- [ ] **Step 5: 验证导出 .scene 结构**

执行课件导出 → 打开生成的 .scene 文件 → 确认：
- DragViewBox 节点 props 包含 mode/successPosMode/dropNotice/clickPlace/changePos/backToInitPos/backAni/autoSorting
- DragViewBox 节点 props **不包含** runtime
- 子节点 Box name=dropbox 包含 DropObj 子节点
- 子节点 Box name=dragbox 包含 DragObj 子节点，DragObj 内含 Image
- DragObj/DropObj props 不包含 runtime

- [ ] **Step 6: 验证拖拽约束**

在元素列表中尝试拖动 DropObj 到 dragbox → 应被阻止。
尝试拖动 DragDropBox 到其他容器 → 应被阻止。
