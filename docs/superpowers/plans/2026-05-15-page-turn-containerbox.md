# 翻页组件改造：PageTurnBox + ContainerBox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将翻页组件的 PageTurnImage 替换为 PageTurnBox（管理中枢）+ 多个 ContainerBox（每页一个独立容器），切换页面时直接切换 ContainerBox 的 visible 属性。

**Architecture:** PageTurnBox 是 toolbarHidden 的管理中枢，通过 pageTurnGroup 关联所有 ContainerBox 和左右按钮。每页是一个独立 ContainerBox 元素，用户可自由往里放子元素。导出时所有同 group 的 ContainerBox + 左右按钮放在一个外层 `_pageTurnBox` 下，各 ContainerBox 带 visible 切换。

**Tech Stack:** React + Zustand + Laya Air + TypeScript

---

### Task 1: ElementMeta — PageTurnBox 定义 + ContainerBox pageTurnGroup

**Files:**
- Modify: `src/elements/elementMeta.ts:328-346` (PageTurnImage → PageTurnBox)
- Modify: `src/elements/elementMeta.ts:284` (ContainerBox defaultProps)

- [ ] **Step 1: 修改 PageTurnImage 条目为 PageTurnBox**

将 `src/elements/elementMeta.ts` 中 `PageTurnImage` 条目替换为：

```typescript
PageTurnBox: {
  layaType: 'Box',
  label: '翻页管理',
  category: 'speechCourse',
  defaultSize: { width: 300, height: 300 },
  defaultPosition: { x: 900, y: 400 },
  placeholderImage: assetSrc('containerBox.placeholder'),
  toolbarHidden: true,
  defaultProps: {
    pageTurnGroup: '',
    currentPageIndex: 0,
  },
  properties: [
    { key: 'pageTurnGroup', label: '翻页组', type: 'text', group: '交互' },
  ],
},
```

删除原来的 `PageTurnImage` 条目（含 skin、pages、skin 属性定义）。

- [ ] **Step 2: 修改 ContainerBox defaultProps 新增 pageTurnGroup**

将 `src/elements/elementMeta.ts` 中 ContainerBox 条目改为：

```typescript
ContainerBox: { layaType: 'Box', label: '容器Box', category: 'newComponents', defaultSize: { width: 300, height: 300 }, defaultPosition: { x: 200, y: 200 }, placeholderImage: assetSrc('containerBox.placeholder'), defaultProps: { pageTurnGroup: '' }, properties: [{ key: 'pageTurnGroup', label: '翻页组', type: 'text', group: '交互' }] },
```

- [ ] **Step 3: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: PageTurnImage → PageTurnBox + ContainerBox pageTurnGroup"
```

---

### Task 2: i18n + 元数据翻译

**Files:**
- Modify: `src/elements/elementMetaI18n.ts:64`
- Modify: `src/i18n/translations.ts:317-320,746-749`

- [ ] **Step 1: 更新 elementMetaI18n.ts**

将 `'翻页图片': 'elementPageTurnImage'` 改为 `'翻页管理': 'elementPageTurnBox'`。

- [ ] **Step 2: 更新 translations.ts zh 部分**

将 `elementPageTurnImage: '翻页图片'` 改为 `elementPageTurnBox: '翻页管理'`。

- [ ] **Step 3: 更新 translations.ts en 部分**

将 `elementPageTurnImage: 'Page Turn Image'` 改为 `elementPageTurnBox: 'Page Turn Manager'`。

- [ ] **Step 4: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add src/elements/elementMetaI18n.ts src/i18n/translations.ts
git commit -m "feat: i18n for PageTurnBox rename"
```

---

### Task 3: ElementToolbar — 翻页组件创建流程

**Files:**
- Modify: `src/components/ElementToolbar.tsx:150-176`

- [ ] **Step 1: 修改 handleAddPageTurn**

将 `src/components/ElementToolbar.tsx` 的 `handleAddPageTurn` 函数替换为：

```typescript
const handleAddPageTurn = () => {
  if (frozen) return;
  const groupId = `ptg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const leftBtn = createDefaultElement('PageTurnLeftBtn');
  leftBtn.props = { ...leftBtn.props, pageTurnGroup: groupId };
  const rightBtn = createDefaultElement('PageTurnRightBtn');
  rightBtn.props = { ...rightBtn.props, pageTurnGroup: groupId };
  const ptBox = createDefaultElement('PageTurnBox');
  ptBox.props = {
    ...ptBox.props,
    pageTurnGroup: groupId,
    currentPageIndex: 0,
  };
  const pageBox = createDefaultElement('ContainerBox');
  pageBox.props = { ...pageBox.props, pageTurnGroup: groupId, visible: true };

  const leftObj = createLayaComponent(leftBtn);
  if (leftObj) registerObject(leftBtn.id, leftObj);
  const rightObj = createLayaComponent(rightBtn);
  if (rightObj) registerObject(rightBtn.id, rightObj);
  const ptObj = createLayaComponent(ptBox);
  if (ptObj) registerObject(ptBox.id, ptObj);
  const pageObj = createLayaComponent(pageBox);
  if (pageObj) registerObject(pageBox.id, pageObj);

  addElement(leftBtn);
  addElement(rightBtn);
  addElement(ptBox);
  addElement(pageBox);
  selectElement(ptBox.id, false);
};
```

- [ ] **Step 2: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "feat: 翻页组件创建流程改用 PageTurnBox + ContainerBox"
```

---

### Task 4: Store — 翻页相关 actions 重写

**Files:**
- Modify: `src/store/editorStore.ts:81-84` (interface)
- Modify: `src/store/editorStore.ts:1141-1309` (implementations)

- [ ] **Step 1: 更新 store interface**

将 `src/store/editorStore.ts` interface 中的翻页方法签名改为：

```typescript
switchPageTurnPage: (elementId: string, newIndex: number) => void;
addPageTurnPage: (elementId: string) => void;
removePageTurnPage: (elementId: string, pageIndex: number) => void;
```

删除 `updatePageTurnImageSkin` 行。

- [ ] **Step 2: 重写 switchPageTurnPage**

替换 `src/store/editorStore.ts` 中 `switchPageTurnPage` 实现为：

```typescript
switchPageTurnPage: (elementId: string, newIndex: number) => {
  // 找到 PageTurnBox 获取 groupId 和 currentPageIndex
  const course = get().currentCourse;
  const subPageId = get().currentSubPageId;
  if (!course || !subPageId) return;
  let groupId = '';
  let oldIndex = 0;
  let page: { elements: Element[] } | undefined;
  for (const stage of course.stages) {
    for (const sp of stage.subPages) {
      if (sp.id === subPageId) { page = sp; break; }
    }
    if (page) break;
  }
  if (!page) return;
  const ptBox = page.elements.find(e => e.id === elementId);
  if (!ptBox || ptBox.type !== 'PageTurnBox') return;
  groupId = (ptBox.props as Record<string, unknown>).pageTurnGroup as string;
  oldIndex = (ptBox.props as Record<string, unknown>).currentPageIndex as number;

  // 获取同 group 的 ContainerBox 列表
  const pageBoxes = page.elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  if (newIndex < 0 || newIndex >= pageBoxes.length) return;

  // 切换 visible：旧页 false，新页 true
  const oldPageBox = pageBoxes[oldIndex];
  const newPageBox = pageBoxes[newIndex];
  set((state) => {
    const course = state.currentCourse;
    const subPageId = state.currentSubPageId;
    if (!course || !subPageId) return state;
    for (const stage of course.stages) {
      for (const p of stage.subPages) {
        if (p.id !== subPageId) continue;
        const el = p.elements.find(e => e.id === oldPageBox.id);
        if (el) el.props = { ...el.props, visible: false };
        const el2 = p.elements.find(e => e.id === newPageBox.id);
        if (el2) el2.props = { ...el2.props, visible: true };
        const ptEl = p.elements.find(e => e.id === elementId);
        if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: newIndex };
        return state;
      }
    }
    return state;
  });
  // 同步 Laya 节点 visible
  const oldObj = getObject(oldPageBox.id);
  if (oldObj) oldObj.visible = false;
  const newObj = getObject(newPageBox.id);
  if (newObj) newObj.visible = true;
},
```

- [ ] **Step 3: 重写 addPageTurnPage**

替换 `addPageTurnPage` 实现为：

```typescript
addPageTurnPage: (elementId: string) => {
  // 找到 PageTurnBox 获取 groupId
  const course = get().currentCourse;
  const subPageId = get().currentSubPageId;
  if (!course || !subPageId) return;
  let groupId = '';
  let page: { elements: Element[] } | undefined;
  for (const stage of course.stages) {
    for (const sp of stage.subPages) {
      if (sp.id === subPageId) { page = sp; break; }
    }
    if (page) break;
  }
  if (!page) return;
  const ptBox = page.elements.find(e => e.id === elementId);
  if (!ptBox || ptBox.type !== 'PageTurnBox') return;
  groupId = (ptBox.props as Record<string, unknown>).pageTurnGroup as string;

  // 创建新 ContainerBox
  const newBox = createDefaultElement('ContainerBox');
  newBox.props = { ...newBox.props, pageTurnGroup: groupId, visible: false };

  // 先将当前页设为不可见，新页设为可见，然后切换
  const pageBoxes = page.elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  const currentIdx = pageBoxes.length;

  set((state) => {
    const course = state.currentCourse;
    const subPageId = state.currentSubPageId;
    if (!course || !subPageId) return state;
    for (const stage of course.stages) {
      for (const p of stage.subPages) {
        if (p.id !== subPageId) continue;
        // 将当前可见页设为不可见
        const currentVisible = pageBoxes.find(e => (e.props as Record<string, unknown>).visible === true);
        if (currentVisible) {
          const el = p.elements.find(e2 => e2.id === currentVisible.id);
          if (el) el.props = { ...el.props, visible: false };
        }
        // 新页设为可见
        newBox.props = { ...newBox.props, visible: true };
        p.elements.push(newBox);
        // 更新 currentPageIndex
        const ptEl = p.elements.find(e2 => e2.id === elementId);
        if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: currentIdx };
        return state;
      }
    }
    return state;
  });
  // 创建 Laya 节点
  const newObj = createLayaComponent(newBox);
  if (newObj) registerObject(newBox.id, newObj);
  // 同步 Laya visible
  const currentVisible = pageBoxes.find(e => (e.props as Record<string, unknown>).visible === true);
  if (currentVisible) {
    const obj = getObject(currentVisible.id);
    if (obj) obj.visible = false;
  }
  const newObj2 = getObject(newBox.id);
  if (newObj2) newObj2.visible = true;
},
```

注意：`createDefaultElement` 和 `createLayaComponent`/`registerObject` 已从 `elementMeta` 和 `layaBridge` 导入，需确认 store 中已有这些 import。`createDefaultElement` 已在 store 中 import（line 7），但 `createLayaComponent` 和 `registerObject` 需确认。

- [ ] **Step 4: 确认 store 中的 import**

检查 `src/store/editorStore.ts` 顶部 import 是否包含 `createLayaComponent` 和 `registerObject`。如果没有，需新增：

```typescript
import { createLayaComponent, registerObject, getObject } from '../utils/layaBridge';
```

`getObject` 已在 store 中有引用（在 switchPageTurnPage 原实现中）。确认 `createLayaComponent` 和 `registerObject` 的导入情况，缺失则补上。

- [ ] **Step 5: 重写 removePageTurnPage**

替换 `removePageTurnPage` 实现为：

```typescript
removePageTurnPage: (elementId: string, pageIndex: number) => {
  // 找到 PageTurnBox 获取 groupId
  const course = get().currentCourse;
  const subPageId = get().currentSubPageId;
  if (!course || !subPageId) return;
  let groupId = '';
  let page: { elements: Element[] } | undefined;
  for (const stage of course.stages) {
    for (const sp of stage.subPages) {
      if (sp.id === subPageId) { page = sp; break; }
    }
    if (page) break;
  }
  if (!page) return;
  const ptBox = page.elements.find(e => e.id === elementId);
  if (!ptBox || ptBox.type !== 'PageTurnBox') return;
  groupId = (ptBox.props as Record<string, unknown>).pageTurnGroup as string;

  const pageBoxes = page.elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  if (pageIndex < 0 || pageIndex >= pageBoxes.length || pageBoxes.length <= 1) return;

  const boxToRemove = pageBoxes[pageIndex];
  // 删除 ContainerBox 及其子元素
  const idsToDelete = new Set<string>();
  idsToDelete.add(boxToRemove.id);
  // 也删除 boxToRemove 的子元素（parentId === boxToRemove.id）
  for (const el of page.elements) {
    if (el.parentId === boxToRemove.id) idsToDelete.add(el.id);
  }

  set((state) => {
    const course = state.currentCourse;
    const subPageId = state.currentSubPageId;
    if (!course || !subPageId) return state;
    for (const stage of course.stages) {
      for (const p of stage.subPages) {
        if (p.id !== subPageId) continue;
        p.elements = p.elements.filter(e => !idsToDelete.has(e.id));
        // 更新 currentPageIndex
        const currentIndex = (ptBox.props as Record<string, unknown>).currentPageIndex as number;
        let newIdx = currentIndex;
        if (pageIndex < currentIndex) newIdx = currentIndex - 1;
        else if (pageIndex === currentIndex) newIdx = Math.min(currentIndex, pageBoxes.length - 2);
        const ptEl = p.elements.find(e => e.id === elementId);
        if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: newIdx };
        // 确保新当前页可见
        const remainingBoxes = p.elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
        if (remainingBoxes.length > 0) {
          const visibleBox = remainingBoxes.find(e => (e.props as Record<string, unknown>).visible === true);
          if (!visibleBox) {
            const newVisible = remainingBoxes[newIdx] ?? remainingBoxes[0];
            const el = p.elements.find(e2 => e2.id === newVisible.id);
            if (el) el.props = { ...el.props, visible: true };
          }
        }
        return state;
      }
    }
    return state;
  });
  // 删除 Laya 节点
  for (const id of idsToDelete) removeObject(id);
},
```

- [ ] **Step 6: 删除 updatePageTurnImageSkin**

删除 `updatePageTurnImageSkin` 的整个实现（约 line 1269-1308）。

- [ ] **Step 7: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`
Expected: 无错误

- [ ] **Step 8: Commit**

```bash
git add src/store/editorStore.ts
git commit -m "feat: 重写翻页组件 store actions（ContainerBox visible 切换）"
```

---

### Task 5: PropertyPanel — PageTurnPageList 条件 + 删除旧 skin 逻辑

**Files:**
- Modify: `src/components/PropertyPanel.tsx:26,62-68,181-182`

- [ ] **Step 1: 删除 updatePageTurnImageSkin 引用**

将 `src/components/PropertyPanel.tsx` line 26 的 `const updatePageTurnImageSkin = useEditorStore((s) => s.updatePageTurnImageSkin);` 删除。

- [ ] **Step 2: 删除 handleChange 中 PageTurnImage skin 特殊处理**

将 line 62-68 的 `if (el.type === 'PageTurnImage' && key === 'skin') { ... return; }` 整块删除。

- [ ] **Step 3: 修改 PageTurnPageList 条件**

将 line 181 的 `single.type === 'PageTurnImage'` 改为 `single.type === 'PageTurnBox'`：

```typescript
{single && single.type === 'PageTurnBox' && (
  <PageTurnPageList element={single} />
)}
```

- [ ] **Step 4: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: PropertyPanel 改用 PageTurnBox 条件，删除旧 skin 逻辑"
```

---

### Task 6: PageTurnPageList — UI 改造

**Files:**
- Modify: `src/components/PageTurnPageList.tsx` (整文件重写)

- [ ] **Step 1: 重写 PageTurnPageList.tsx**

```typescript
import { useEditorStore } from '../store/editorStore';
import { useI18n } from '../i18n';
import { Plus, Trash2 } from 'lucide-react';
import type { Element } from '../types';

interface PageTurnPageListProps {
  element: Element;
}

export default function PageTurnPageList({ element }: PageTurnPageListProps) {
  const { t } = useI18n();
  const switchPage = useEditorStore((s) => s.switchPageTurnPage);
  const addPage = useEditorStore((s) => s.addPageTurnPage);
  const removePage = useEditorStore((s) => s.removePageTurnPage);

  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);

  // 获取同 group 的 ContainerBox 列表
  const groupId = (element.props as Record<string, unknown>).pageTurnGroup as string;
  const currentPageIndex = (element.props as Record<string, unknown>).currentPageIndex as number;

  const page = (() => {
    if (!currentCourse || !currentSubPageId) return undefined;
    for (const stage of currentCourse.stages) {
      const sp = stage.subPages.find(s => s.id === currentSubPageId);
      if (sp) return sp;
    }
    return undefined;
  })();

  const elements = page?.elements ?? [];
  const pageBoxes = elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);

  return (
    <div className="mb-2 pb-2 border-b border-slate-700">
      <div className="text-xs text-slate-500 mb-1.5">{t('pageManagement') || '页面管理'}</div>

      {/* 页面缩略图列表 */}
      <div className="flex gap-1 overflow-x-auto mb-1.5 pb-1">
        {pageBoxes.map((box, i) => {
          const isVisible = (box.props as Record<string, unknown>).visible === true;
          return (
            <button
              key={box.id}
              onClick={() => switchPage(element.id, i)}
              className={`shrink-0 w-16 h-16 rounded border-2 transition-colors overflow-hidden ${
                i === currentPageIndex
                  ? 'border-blue-500 bg-blue-600/20'
                  : isVisible
                    ? 'border-green-500 bg-green-600/20'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              }`}
              title={`第${i + 1}页 - ${box.name || '容器Box'}`}
            >
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold">{i + 1}</span>
                  <span className="text-[8px] text-slate-500 truncate max-w-[50px]">{box.name || 'Box'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-1">
        <button
          onClick={() => addPage(element.id)}
          className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
        >
          <Plus size={12} /> {t('addPageTurnPage') || '添加页面'}
        </button>
        {pageBoxes.length > 1 && (
          <button
            onClick={() => removePage(element.id, currentPageIndex)}
            className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* 当前页信息 */}
      <div className="text-[10px] text-slate-500 mt-1">
        {t('pageTurnCurrentPage') || '当前页'}: 第{currentPageIndex + 1}页 / 共{pageBoxes.length}页
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/components/PageTurnPageList.tsx
git commit -m "feat: PageTurnPageList 改为管理 ContainerBox 列表"
```

---

### Task 7: 导出逻辑 — exportPreviewProject.ts

**Files:**
- Modify: `src/utils/exportPreviewProject.ts:103-107,255-296,539-558`

- [ ] **Step 1: 修改资源收集逻辑**

将 line 103-107 的 PageTurnImage pages 收集改为 PageTurnBox 资源收集。PageTurnBox 本身没有 pages 数组了，但同 group 的 ContainerBox 的子元素资源会被主循环正常收集，所以这段可以简化为跳过 PageTurnBox 的特殊处理：

将：
```typescript
// 翻页图片：pages 数组中的图片资源
if (el.type === 'PageTurnImage') {
  const pages = (el.props as { pages?: Array<{ src: string }> })?.pages ?? [];
  for (const p of pages) collectValue(p.src);
}
```

改为：
```typescript
// 翻页管理中枢：PageTurnBox 不携带额外资源，同 group ContainerBox 的资源由主循环收集
// （无需特殊处理）
```

- [ ] **Step 2: 修改导出构建逻辑**

将 line 265-296 的 PageTurnImage 导出块替换为 PageTurnBox 导出：

```typescript
// ─── 翻页组件导出 ───
if (el.type === 'PageTurnBox') {
  const ptProps = el.props as { pageTurnGroup?: string; currentPageIndex?: number };
  const groupId = ptProps.pageTurnGroup;
  const leftBtn = page.elements.find(e => e.type === 'PageTurnLeftBtn' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  const rightBtn = page.elements.find(e => e.type === 'PageTurnRightBtn' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  const pageBoxes = page.elements.filter(e => e.type === 'ContainerBox' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
  const currentIndex = ptProps.currentPageIndex ?? 0;
  const boxId = nextId();
  const ptChildren: Record<string, unknown>[] = [];
  for (let i = 0; i < pageBoxes.length; i++) {
    const pBox = pageBoxes[i];
    const isVisible = i === currentIndex;
    const pBoxNode = buildSceneNode(pBox, page.elements, resourceMap, boxId);
    // 注入 name 和 visible
    (pBoxNode.props as Record<string, unknown>).name = `_page${i}`;
    (pBoxNode.props as Record<string, unknown>).visible = isVisible;
    ptChildren.push(pBoxNode);
  }
  if (leftBtn) ptChildren.push(buildSceneNode(leftBtn, page.elements, resourceMap, boxId));
  if (rightBtn) ptChildren.push(buildSceneNode(rightBtn, page.elements, resourceMap, boxId));
  pageTurnItems.push({ idx: ti, node: {
    x: 15, type: 'Box', searchKey: 'Box,_pageTurnBox', label: '_pageTurnBox',
    isOpen: true, isDirectory: ptChildren.length > 0, isAniNode: true, hasChild: ptChildren.length > 0,
    compId: boxId, nodeParent: parentId,
    props: { x: 0, y: 0, width: 1920, height: 1080, mouseThrough: true, name: '_pageTurnBox' },
    child: ptChildren,
  } });
  continue;
}
```

同时修改 topLevel 过滤条件，将 `PageTurnBox` 也排除（它不应作为独立顶层节点出现）：

```typescript
const topLevel = page.elements.filter(e => !e.parentId && e.type !== 'PageTurnLeftBtn' && e.type !== 'PageTurnRightBtn' && e.type !== 'PageTurnBox');
```

- [ ] **Step 3: 修改资源复制逻辑**

将 line 539-558 的 PageTurnImage pages 资源复制段删除或改为注释说明 PageTurnBox 不需要特殊资源收集：

```typescript
// PageTurnBox 不携带 pages 数组，同 group ContainerBox 的子元素资源由主循环收集
// （不再需要 PageTurnImage 的 pages 显式收集）
```

- [ ] **Step 4: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add src/utils/exportPreviewProject.ts
git commit -m "feat: 预览导出改用 PageTurnBox + ContainerBox"
```

---

### Task 8: 导出逻辑 — exportProject.ts

**Files:**
- Modify: `src/utils/exportProject.ts:157-161,322,331-363,709-728`

与 Task 7 完全相同的模式，同步修改工程导出。

- [ ] **Step 1: 修改资源收集逻辑**

将 line 157-161 改为：
```typescript
// 翻页管理中枢：PageTurnBox 不携带额外资源
// （无需特殊处理，同 Task 7）
```

- [ ] **Step 2: 修改顶层过滤 + 导出构建逻辑**

将 line 322 改为：
```typescript
const topLevel = page.elements.filter(e => !e.parentId && e.type !== 'PageTurnLeftBtn' && e.type !== 'PageTurnRightBtn' && e.type !== 'PageTurnBox');
```

将 line 331-363 的 PageTurnImage 导出块替换为与 Task 7 Step 2 相同的 PageTurnBox 导出逻辑（代码完全一致，只是文件不同）。

- [ ] **Step 3: 修改资源复制逻辑**

将 line 709-728 的 PageTurnImage pages 资源段删除或替换为注释。

- [ ] **Step 4: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: 工程导出改用 PageTurnBox + ContainerBox"
```

---

### Task 9: Canvas — visible 同步

**Files:**
- Modify: `src/utils/laya/components.ts` (applyKlProps visible 处理确认)

- [ ] **Step 1: 确认 applyKlProps 处理 visible 属性**

读取 `src/utils/laya/components.ts` 中 `applyKlProps` 函数，确认它是否已处理 `visible` 属性。如果已有 `if ('visible' in props) obj.visible = props.visible` 类的逻辑，无需修改。如果没有，需新增：

在 applyKlProps 的属性应用循环中确保 visible 被处理。查看现有代码，确认 Canvas.tsx 中同步元素时是否将 visible 属性传递到 Laya 节点。

- [ ] **Step 2: 如需修改，添加 visible 同步**

如果 applyKlProps 不处理 visible，在合适位置新增：

```typescript
if (props.visible !== undefined) obj.visible = props.visible;
```

- [ ] **Step 3: 确认 store 的 updateElement 会触发 Laya visible 同步**

查看 Canvas.tsx 中 useEffect 监听 elements 变化时是否调用 `syncProps` 或 `applyKlProps`，确认 visible 变化会传播到 Laya 节点。

- [ ] **Step 4: 验证编译**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit (如有修改)**

```bash
git add src/utils/laya/components.ts src/components/Canvas.tsx
git commit -m "feat: 确保 ContainerBox visible 属性同步到 Laya 节点"
```

---

### Task 10: 全量验证

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd D:/hltn/课件资源/工具/forge && npx tsc --noEmit --pretty`
Expected: 无错误

- [ ] **Step 2: ESLint 检查**

Run: `cd D:/hltn/课件资源/工具/forge && pnpm lint`
Expected: 无新增 lint 错误

- [ ] **Step 3: 手动功能验证**

启动 `pnpm dev`，在浏览器中测试：
1. 点击"翻页组件"按钮，确认创建 4 个元素（左按钮、右按钮、PageTurnBox、ContainerBox）
2. 选中 PageTurnBox，确认属性面板显示页面管理面板
3. 添加新页面，确认创建新 ContainerBox（visible=false）
4. 切换页面，确认 visible 切换正常
5. 删除页面，确认 ContainerBox 被删除
6. 在 ContainerBox 中拖放子元素，确认嵌套正常
7. 元素列表树形显示正确

- [ ] **Step 4: Final commit (如有遗留修改)**

```bash
git add -A
git commit -m "feat: 翻页组件改造完成 — PageTurnBox + ContainerBox visible 切换"
```