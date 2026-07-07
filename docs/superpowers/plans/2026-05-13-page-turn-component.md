# 翻页组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在口才课组件分类下添加翻页组件，由左按钮、右按钮、翻页图片三个独立可拖拽元素组成，支持动态添加页面、每页独立位置保存、属性面板页面管理，导出为 Box 容器。

**Architecture:** 工具栏显示"翻页组件"按钮，点击一次创建 3 个独立元素（共享 pageTurnGroup）。PageTurnImage 持有 pages 数组和 currentPageIndex，画布拖拽时同步位置到当前页，切换页面时更新 Element 位置和皮肤。导出时 PageTurnImage 负责生成 Box 容器包裹所有子节点。

**Tech Stack:** React, Zustand (immer), Laya Air, TypeScript

---

### Task 1: 复制资源文件 + 注册 builtinAssets

**Files:**
- Create: `public/builtin/runtime/game/pageTurn/btn_return_new.png`
- Create: `public/builtin/runtime/game/pageTurn/btn_you.png`
- Create: `public/builtin/editor/page-turn-placeholder.png`
- Modify: `src/elements/builtinAssets.ts`

- [ ] **Step 1: 创建 pageTurn 目录并复制按钮图片**

```bash
mkdir -p public/builtin/runtime/game/pageTurn
cp "C:/Users/wwjie/Desktop/3D通用按钮切图/按钮切图/btn_return_new.png" public/builtin/runtime/game/pageTurn/btn_return_new.png
cp "C:/Users/wwjie/Desktop/3D通用按钮切图/按钮切图/btn_you.png" public/builtin/runtime/game/pageTurn/btn_you.png
```

- [ ] **Step 2: 创建翻页图片占位图**

使用 PowerShell 创建一个简单的灰色占位图（200x200 灰色矩形 + 页面图标暗示）：

```powershell
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(200, 200)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(60, 70, 80))
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 120, 140), 2)
$g.DrawRectangle($pen, 60, 40, 80, 100)
$g.DrawLine($pen, 80, 50, 120, 70)
$g.DrawLine($pen, 80, 70, 120, 90)
$g.Dispose()
$pen.Dispose()
$bmp.Save("public/builtin/editor/page-turn-placeholder.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
```

- [ ] **Step 3: 在 builtinAssets.ts 注册三个资源**

在 `BUILTIN_ASSETS` 数组末尾（`okBtn.btn_qd4` 之后）添加：

```ts
  // ─── 翻页组件资源 ───
  { id: 'pageTurn.btnLeft',       src: 'runtime/game/pageTurn/btn_return_new.png', exportPath: 'game/pageTurn/btn_return_new.png' },
  { id: 'pageTurn.btnRight',      src: 'runtime/game/pageTurn/btn_you.png',         exportPath: 'game/pageTurn/btn_you.png' },
  { id: 'pageTurn.placeholder',   src: 'editor/page-turn-placeholder.png' },
```

- [ ] **Step 4: 验证资源可访问**

启动 vite dev server，浏览器打开 `http://localhost:6688/builtin/runtime/game/pageTurn/btn_return_new.png` 和 `btn_you.png`，确认图片正常加载。

- [ ] **Step 5: Commit**

```bash
git add public/builtin/runtime/game/pageTurn/ public/builtin/editor/page-turn-placeholder.png src/elements/builtinAssets.ts
git commit -m "feat: 添加翻页组件内置资源文件和 builtinAssets 注册"
```

---

### Task 2: 添加分类 + elementMeta 条目 + i18n

**Files:**
- Modify: `src/elements/elementMeta.ts`
- Modify: `src/elements/elementMetaI18n.ts`

- [ ] **Step 1: 在 elementMeta.ts 添加新分类**

修改 `CATEGORIES` 数组（第 45-47 行）：

```ts
export const CATEGORIES = [
  { id: 'newComponents', label: '常用组件' },
  { id: 'speechCourse', label: '口才课组件' },
];
```

- [ ] **Step 2: 在 Meta 接口添加 toolbarHidden 字段**

在 `Meta` 接口（第 21-43 行）中，`exportWrapper` 之后添加：

```ts
  /** 工具栏中隐藏此条目（用于组合创建的子元素，单独添加无意义） */
  toolbarHidden?: boolean;
```

- [ ] **Step 3: 在 elementMeta 对象末尾添加三个新条目**

在 `NewTabImg` 条目之后、闭合 `}` 之前添加：

```ts
  // ─── 口才课组件：翻页组件（组合创建，工具栏只显示"翻页组件"入口按钮）───
  PageTurnLeftBtn: {
    layaType: 'ScaleButton',
    label: '翻页左按钮',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    defaultPosition: { x: 800, y: 500 },
    placeholderImage: assetSrc('pageTurn.btnLeft'),
    toolbarHidden: true,
    defaultProps: {
      skin: assetExport('pageTurn.btnLeft'),
      stateNum: 1,
      label: '',
      pageTurnGroup: '',
    },
    properties: [
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
      { key: 'pageTurnGroup', label: '翻页组', type: 'text', group: '交互' },
    ],
  },
  PageTurnRightBtn: {
    layaType: 'ScaleButton',
    label: '翻页右按钮',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    defaultPosition: { x: 1000, y: 500 },
    placeholderImage: assetSrc('pageTurn.btnRight'),
    toolbarHidden: true,
    defaultProps: {
      skin: assetExport('pageTurn.btnRight'),
      stateNum: 1,
      label: '',
      pageTurnGroup: '',
    },
    properties: [
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
      { key: 'pageTurnGroup', label: '翻页组', type: 'text', group: '交互' },
    ],
  },
  PageTurnImage: {
    layaType: 'Image',
    label: '翻页图片',
    category: 'speechCourse',
    defaultSize: { width: 200, height: 200 },
    defaultPosition: { x: 900, y: 400 },
    placeholderImage: assetSrc('pageTurn.placeholder'),
    toolbarHidden: true,
    defaultProps: {
      skin: '',
      pageTurnGroup: '',
      currentPageIndex: 0,
      pages: [],
    },
    properties: [
      { key: 'skin', label: '当前页图片', type: 'file', group: '外观' },
      { key: 'pageTurnGroup', label: '翻页组', type: 'text', group: '交互' },
    ],
  },
```

注意：`pages` 和 `currentPageIndex` 不在 `properties` 列表中，由自定义属性面板管理。

- [ ] **Step 4: 在 elementMetaI18n.ts 添加翻译映射**

在 `categoryMap` 中添加：

```ts
'口才课组件': 'categorySpeechCourse',
```

在 `elementMap` 中添加：

```ts
'翻页左按钮': 'elementPageTurnLeftBtn',
'翻页右按钮': 'elementPageTurnRightBtn',
'翻页图片': 'elementPageTurnImage',
```

在 `propMap` 中添加：

```ts
'按钮图片': 'propBtnImage',
'翻页组': 'propPageTurnGroup',
'当前页图片': 'propCurrentPageImage',
```

- [ ] **Step 5: 在 translations.ts 添加英文翻译**

在 `src/i18n/translations.ts` 中，找到 `en` 对象，添加对应键值：

```ts
categorySpeechCourse: 'Speech Course',
elementPageTurnLeftBtn: 'Page Turn Left',
elementPageTurnRightBtn: 'Page Turn Right',
elementPageTurnImage: 'Page Turn Image',
propBtnImage: 'Button Image',
propPageTurnGroup: 'Page Turn Group',
propCurrentPageImage: 'Current Page Image',
```

- [ ] **Step 6: 验证编译无错误**

```bash
pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add src/elements/elementMeta.ts src/elements/elementMetaI18n.ts src/i18n/translations.ts
git commit -m "feat: 添加口才课组件分类和翻页组件 elementMeta 条目"
```

---

### Task 3: 工具栏组合创建逻辑

**Files:**
- Modify: `src/components/ElementToolbar.tsx`

- [ ] **Step 1: 在 ElementToolbar 添加翻页组件组合创建函数**

在 `handlePresetSelected` 函数之后、`items` 变量之前，添加 `handleAddPageTurn` 函数：

```ts
  /** 翻页组件：一次创建 3 个元素（左按钮 + 右按钮 + 翻页图片） */
  const handleAddPageTurn = () => {
    if (frozen) return;
    const groupId = `ptg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const leftBtn = createDefaultElement('PageTurnLeftBtn');
    leftBtn.props = { ...leftBtn.props, pageTurnGroup: groupId };
    const rightBtn = createDefaultElement('PageTurnRightBtn');
    rightBtn.props = { ...rightBtn.props, pageTurnGroup: groupId };
    const pageImage = createDefaultElement('PageTurnImage');
    pageImage.props = {
      ...pageImage.props,
      pageTurnGroup: groupId,
      currentPageIndex: 0,
      pages: [{ src: '', x: pageImage.x, y: pageImage.y, width: pageImage.width, height: pageImage.height }],
    };

    const leftObj = createLayaComponent(leftBtn);
    if (leftObj) registerObject(leftBtn.id, leftObj);
    const rightObj = createLayaComponent(rightBtn);
    if (rightObj) registerObject(rightBtn.id, rightObj);
    const imgObj = createLayaComponent(pageImage);
    if (imgObj) registerObject(pageImage.id, imgObj);

    addElement(leftBtn);
    addElement(rightBtn);
    addElement(pageImage);
    selectElement(pageImage.id, false);
  };
```

- [ ] **Step 2: 修改 items 过滤逻辑，排除 toolbarHidden 条目**

将第 145 行的 `items` 过滤改为：

```ts
  const items = Object.entries(elementMeta).filter(([, m]) => m.category === activeTab && m.label !== '视频' && !m.toolbarHidden);
```

- [ ] **Step 3: 在工具栏渲染区域添加翻页组件入口按钮**

在 `<div className="flex items-center gap-1.5 flex-wrap">` 内部，在 `{items.map(...)}` 之前添加：

```tsx
        {activeTab === 'speechCourse' && (
          <button
            onClick={handleAddPageTurn}
            disabled={frozen}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
              frozen
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
            }`}
          >
            {translateLabel('翻页组件', language)}
          </button>
        )}
```

同时在 `elementMetaI18n.ts` 的 `elementMap` 和 `translations.ts` 的 `en` 对象中添加：

```ts
// elementMetaI18n.ts elementMap:
'翻页组件': 'elementPageTurn',

// translations.ts en:
elementPageTurn: 'Page Turn',
```

- [ ] **Step 4: 验证工具栏显示**

启动 dev server + Electron，切换到"口才课组件"标签页，确认只显示"翻页组件"按钮，点击后创建 3 个元素（左按钮、右按钮、翻页图片），自动选中翻页图片。

- [ ] **Step 5: Commit**

```bash
git add src/components/ElementToolbar.tsx src/elements/elementMetaI18n.ts src/i18n/translations.ts
git commit -m "feat: 翻页组件工具栏组合创建逻辑"
```

---

### Task 4: PageTurnImage 位置同步 + 页面切换 store 逻辑

**Files:**
- Modify: `src/store/editorStore.ts`

- [ ] **Step 1: 添加 switchPageTurnPage action**

在 `editorStore.ts` 中，找到 store 定义（`create` 函数内部），在其他 action 旁边添加：

```ts
      /** 翻页图片：切换页面索引，同步位置和皮肤 */
      switchPageTurnPage: (elementId: string, newIndex: number) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const el = page.elements.find(e => e.id === elementId);
            if (!el || el.type !== 'PageTurnImage') return;
            const props = el.props as { pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>; currentPageIndex?: number };
            const pages = props.pages ?? [];
            if (newIndex < 0 || newIndex >= pages.length) return;
            // 先保存当前位置到旧页面
            const oldIndex = props.currentPageIndex ?? 0;
            if (oldIndex >= 0 && oldIndex < pages.length) {
              pages[oldIndex] = { ...pages[oldIndex], x: el.x, y: el.y, width: el.width, height: el.height };
            }
            // 切换到新页面：更新 Element 位置、尺寸、皮肤
            const newPage = pages[newIndex];
            el.x = newPage.x;
            el.y = newPage.y;
            el.width = newPage.width;
            el.height = newPage.height;
            el.props = {
              ...el.props,
              skin: newPage.src,
              currentPageIndex: newIndex,
              pages: [...pages],
            };
            // 同步 Laya 节点位置和皮肤
            const obj = getObject(elementId);
            if (obj) {
              obj.x = el.x;
              obj.y = el.y;
              obj.width = el.width;
              obj.height = el.height;
              if (typeof obj.skin !== 'undefined') {
                obj.skin = newPage.src || '';
              }
            }
            return;
          }
        }
      },

      /** 翻页图片：添加新页面 */
      addPageTurnPage: (elementId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const el = page.elements.find(e => e.id === elementId);
            if (!el || el.type !== 'PageTurnImage') return;
            const props = el.props as { pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>; currentPageIndex?: number };
            const pages = props.pages ?? [];
            const currentIndex = props.currentPageIndex ?? 0;
            // 先保存当前位置到当前页
            if (currentIndex >= 0 && currentIndex < pages.length) {
              pages[currentIndex] = { ...pages[currentIndex], x: el.x, y: el.y, width: el.width, height: el.height };
            }
            // 新页面默认位置 = 当前位置，空图片
            pages.push({ src: '', x: el.x, y: el.y, width: 200, height: 200 });
            el.props = { ...el.props, pages: [...pages], currentPageIndex: pages.length - 1 };
            // 切换到新页面
            get().switchPageTurnPage(elementId, pages.length - 1);
            return;
          }
        }
      },

      /** 翻页图片：删除页面 */
      removePageTurnPage: (elementId: string, pageIndex: number) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const el = page.elements.find(e => e.id === elementId);
            if (!el || el.type !== 'PageTurnImage') return;
            const props = el.props as { pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>; currentPageIndex?: number };
            const pages = props.pages ?? [];
            if (pages.length <= 1) return; // 至少保留 1 页
            if (pageIndex < 0 || pageIndex >= pages.length) return;
            // 保存当前位置
            const currentIndex = props.currentPageIndex ?? 0;
            if (currentIndex >= 0 && currentIndex < pages.length) {
              pages[currentIndex] = { ...pages[currentIndex], x: el.x, y: el.y, width: el.width, height: el.height };
            }
            pages.splice(pageIndex, 1);
            // 切换到相邻页面
            let newIdx = currentIndex;
            if (pageIndex <= currentIndex) newIdx = Math.max(0, currentIndex - 1);
            if (newIdx >= pages.length) newIdx = pages.length - 1;
            el.props = { ...el.props, pages: [...pages] };
            get().switchPageTurnPage(elementId, newIdx);
            return;
          }
        }
      },

      /** 翻页图片：更新当前页的图片资源，同时保存位置 */
      updatePageTurnImageSkin: (elementId: string, skinPath: string, naturalWidth: number, naturalHeight: number) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const el = page.elements.find(e => e.id === elementId);
            if (!el || el.type !== 'PageTurnImage') return;
            const props = el.props as { pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>; currentPageIndex?: number };
            const pages = props.pages ?? [];
            const idx = props.currentPageIndex ?? 0;
            if (idx < 0 || idx >= pages.length) return;
            // 保存当前位置到当前页
            pages[idx] = { ...pages[idx], x: el.x, y: el.y, width: naturalWidth || el.width, height: naturalHeight || el.height, src: skinPath };
            // 更新 Element
            el.width = naturalWidth || el.width;
            el.height = naturalHeight || el.height;
            el.props = {
              ...el.props,
              skin: skinPath,
              pages: [...pages],
              _naturalWidth: naturalWidth,
              _naturalHeight: naturalHeight,
            };
            // 同步 Laya 节点
            const obj = getObject(elementId);
            if (obj) {
              obj.width = el.width;
              obj.height = el.height;
              if (typeof obj.skin !== 'undefined') obj.skin = skinPath;
            }
            return;
          }
        }
      },
```

需要在 editorStore.ts 文件顶部添加 import：

```ts
import { getObject } from '../utils/layaBridge';
```

- [ ] **Step 2: 画布拖拽时同步位置到 pages**

在 CanvasOverlay.tsx 的拖拽 batch commit 逻辑中（约第 213-230 行），在 `store.updateElement(sid, { x: obj.x, y: obj.y })` 之后添加 PageTurnImage 位置同步：

找到这段代码（move 分支，单选情况）：

```ts
          const obj = getObject(drag.elementId);
          if (obj) {
            store.updateElement(drag.elementId, { x: obj.x, y: obj.y });
          }
```

改为：

```ts
          const obj = getObject(drag.elementId);
          if (obj) {
            store.updateElement(drag.elementId, { x: obj.x, y: obj.y });
          }
          // 翻页图片：同步画布位置到当前页
          const dragEl = page?.elements.find(e => e.id === drag.elementId);
          if (dragEl && dragEl.type === 'PageTurnImage') {
            const props = dragEl.props as { pages?: Array<{ x: number; y: number }>; currentPageIndex?: number };
            const pages = props.pages ?? [];
            const idx = props.currentPageIndex ?? 0;
            if (idx >= 0 && idx < pages.length) {
              pages[idx] = { ...pages[idx], x: obj!.x, y: obj!.y };
              store.updateElement(drag.elementId, { props: { ...dragEl.props, pages: [...pages] } });
            }
          }
```

同样，多选移动分支也需要类似处理（约第 219-225 行）：

```ts
          if (selected.length > 1 && selected.includes(drag.elementId) && page) {
            selected.forEach(sid => {
              const obj = getObject(sid);
              if (obj) {
                store.updateElement(sid, { x: obj.x, y: obj.y });
              }
              // 翻页图片：同步画布位置到当前页
              const selEl = page.elements.find(e => e.id === sid);
              if (selEl && selEl.type === 'PageTurnImage') {
                const props = selEl.props as { pages?: Array<{ x: number; y: number }>; currentPageIndex?: number };
                const pages = props.pages ?? [];
                const idx = props.currentPageIndex ?? 0;
                if (idx >= 0 && idx < pages.length) {
                  pages[idx] = { ...pages[idx], x: obj!.x, y: obj!.y };
                  store.updateElement(sid, { props: { ...selEl.props, pages: [...pages] } });
                }
              }
            });
          }
```

- [ ] **Step 3: 验证位置同步**

启动 dev server + Electron，创建翻页组件，拖动翻页图片，确认位置变更后属性面板中 pages 的当前页 x/y 也跟着更新。

- [ ] **Step 4: Commit**

```bash
git add src/store/editorStore.ts src/components/CanvasOverlay.tsx
git commit -m "feat: 翻页图片位置同步和页面切换 store 逻辑"
```

---

### Task 5: PageTurnPageList 自定义属性面板组件

**Files:**
- Create: `src/components/PageTurnPageList.tsx`

- [ ] **Step 1: 创建 PageTurnPageList.tsx**

```tsx
import React from 'react';
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

  const props = element.props as {
    pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>;
    currentPageIndex?: number;
  };
  const pages = props.pages ?? [];
  const currentIndex = props.currentPageIndex ?? 0;

  return (
    <div className="mb-2 pb-2 border-b border-slate-700">
      <div className="text-xs text-slate-500 mb-1.5">{t('pageManagement') || '页面管理'}</div>

      {/* 页面缩略图列表 */}
      <div className="flex gap-1 overflow-x-auto mb-1.5 pb-1">
        {pages.map((page, i) => (
          <button
            key={i}
            onClick={() => switchPage(element.id, i)}
            className={`shrink-0 w-16 h-16 rounded border-2 transition-colors overflow-hidden ${
              i === currentIndex
                ? 'border-blue-500 bg-blue-600/20'
                : 'border-slate-600 bg-slate-700 hover:border-slate-500'
            }`}
            title={`第${i + 1}页`}
          >
            {page.src ? (
              <img
                src={page.src.startsWith('/uploads/') ? page.src : page.src.startsWith('data:') ? page.src : `/builtin/${page.src}`}
                alt={`第${i + 1}页`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                {i + 1}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-1">
        <button
          onClick={() => addPage(element.id)}
          className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
        >
          <Plus size={12} /> {t('addPage') || '添加页面'}
        </button>
        {pages.length > 1 && (
          <button
            onClick={() => removePage(element.id, currentIndex)}
            className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* 当前页信息 */}
      <div className="text-[10px] text-slate-500 mt-1">
        {t('currentPage') || '当前页'}: 第{currentIndex + 1}页 / 共{pages.length}页
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 translations.ts 添加翻译键**

在 `en` 对象中添加：

```ts
pageManagement: 'Page Management',
addPage: 'Add Page',
currentPage: 'Current Page',
```

在 `zh` 对象中添加：

```ts
pageManagement: '页面管理',
addPage: '添加页面',
currentPage: '当前页',
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PageTurnPageList.tsx src/i18n/translations.ts
git commit -m "feat: 翻页图片页面管理属性面板组件"
```

---

### Task 6: PropertyPanel 集成 PageTurnPageList

**Files:**
- Modify: `src/components/PropertyPanel.tsx`

- [ ] **Step 1: 导入 PageTurnPageList 和 store actions**

在 PropertyPanel.tsx 顶部 imports 区域添加：

```ts
import PageTurnPageList from './PageTurnPageList';
```

在 `const updateElement = ...` 行之后添加：

```ts
  const switchPageTurnPage = useEditorStore((s) => s.switchPageTurnPage);
  const addPageTurnPage = useEditorStore((s) => s.addPageTurnPage);
  const removePageTurnPage = useEditorStore((s) => s.removePageTurnPage);
  const updatePageTurnImageSkin = useEditorStore((s) => s.updatePageTurnImageSkin);
```

- [ ] **Step 2: 在属性面板渲染区域添加 PageTurnImage 自定义部分**

在 `{/* 确定按钮：替换资源按钮 */}` 区块（约第 234-242 行）之后添加：

```tsx
              {/* 翻页图片：页面管理 */}
              {single && single.type === 'PageTurnImage' && (
                <PageTurnPageList element={single} />
              )}
```

- [ ] **Step 3: 修改 PageTurnImage 的 skin 属性更新逻辑**

当前 `handleChange` 函数通用处理 props 更新。对 PageTurnImage 的 `skin` 字段，需要改为调用 `updatePageTurnImageSkin` 以同步 pages 数据。

在 `handleChange` 函数（约第 59-68 行）中，在 `updateElement` 调用之前添加 PageTurnImage 特殊处理：

```ts
  const handleChange = (key: string, value: unknown) => {
    selectedElements.forEach((el) => {
      if (el.type === 'PageTurnImage' && key === 'skin') {
        // 翻页图片：更新皮肤时同步 pages 数据
        const props = el.props as Record<string, unknown>;
        const naturalWidth = Number(props._naturalWidth ?? el.width);
        const naturalHeight = Number(props._naturalHeight ?? el.height);
        updatePageTurnImageSkin(el.id, String(value), naturalWidth, naturalHeight);
        return;
      }
      const newProps: Record<string, unknown> = { ...el.props, [key]: value };
      // NewInput：可输入位数 = 正确答案位数 + 1
      if (el.type === 'NewInput' && key === 'answer') {
        newProps.place = String(value ?? '').length + 1;
      }
      updateElement(el.id, { props: newProps } as Partial<Element>);
    });
  };
```

- [ ] **Step 4: 验证属性面板**

启动 dev server + Electron，创建翻页组件，选中翻页图片，确认：
1. 属性面板显示"页面管理"区域，带缩略图列表
2. 点击缩略图可以切换页面，画布图片位置和内容跟着变化
3. 添加/删除页面功能正常
4. 上传图片时保留原尺寸，位置居中

- [ ] **Step 5: Commit**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: PropertyPanel 集成翻页图片页面管理"
```

---

### Task 7: 导出管线修改

**Files:**
- Modify: `src/utils/export.ts`

- [ ] **Step 1: 在 buildTopLevelChildren 中跳过 PageTurn 按钮元素**

在 `buildTopLevelChildren` 函数（约第 295-353 行）中，修改 `topLevel` 过滤逻辑：

将第 296 行：

```ts
  const topLevel = page.elements.filter(e => !e.parentId);
```

改为：

```ts
  const topLevel = page.elements.filter(e => !e.parentId && e.type !== 'PageTurnLeftBtn' && e.type !== 'PageTurnRightBtn');
```

- [ ] **Step 2: 在 buildTopLevelChildren 中处理 PageTurnImage 导出**

在 `buildTopLevelChildren` 函数的 `for (const el of topLevel)` 循环中，`getWrapper` 调用之前，添加 PageTurnImage 特殊处理：

```ts
  for (const el of topLevel) {
    // ─── 翻页组件导出 ───
    if (el.type === 'PageTurnImage') {
      const props = el.props as { pageTurnGroup?: string; pages?: Array<{ src: string; x: number; y: number; width: number; height: number }>; currentPageIndex?: number };
      const groupId = props.pageTurnGroup;
      // 查找同组的左按钮和右按钮
      const leftBtn = page.elements.find(e => e.type === 'PageTurnLeftBtn' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
      const rightBtn = page.elements.find(e => e.type === 'PageTurnRightBtn' && (e.props as Record<string, unknown>).pageTurnGroup === groupId);
      const pages = props.pages ?? [];
      const currentIndex = props.currentPageIndex ?? 0;

      const children: Record<string, unknown>[] = [];
      // 先放页面图片（底层）
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const rewrittenSkin = rewriteProps({ skin: p.src }, resourceMap).skin ?? '';
        children.push({
          type: 'Image',
          props: {
            name: `_page${i}`,
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            skin: rewrittenSkin,
            visible: i === currentIndex,
          },
        });
      }
      // 再放按钮（最上层）
      if (leftBtn) {
        children.push(elementToLayaNode(leftBtn, page.elements, resourceMap));
      }
      if (rightBtn) {
        children.push(elementToLayaNode(rightBtn, page.elements, resourceMap));
      }

      out.push({
        type: 'Box',
        props: { x: 0, y: 0, width: 1920, height: 1080, mouseThrough: true, name: '_pageTurnBox' },
        child: children,
      });
      continue;
    }

    const wrapper = getWrapper(el);
    // ... 后续逻辑不变 ...
```

- [ ] **Step 3: 在 collectResources 中收集 pages 图片资源**

在 `collectResources` 函数的 `page.elements.forEach` 内部（约第 135-148 行），在 `scanFixed(meta?.exportChildren)` 之后添加 pages 图片资源收集：

```ts
        // 翻页图片：pages 数组中的图片资源
        if (el.type === 'PageTurnImage') {
          const pages = (el.props as { pages?: Array<{ src: string }> })?.pages ?? [];
          for (const p of pages) {
            collectValue(p.src);
          }
        }
```

- [ ] **Step 4: 验证导出**

创建一个包含翻页组件的课件，点击"发布预览"，检查生成的 LessonZK.js 中翻页组件导出结构：
- Box 容器包裹所有子节点
- 图片页在底层，按钮在最上层
- 仅当前页 visible:true

- [ ] **Step 5: Commit**

```bash
git add src/utils/export.ts
git commit -m "feat: 翻页组件导出管线——Box 容器包裹 + 页面/按钮分层"
```

---

### Task 8: 整体验证

- [ ] **Step 1: 创建翻页组件并验证基本功能**

启动 dev server + Electron：
1. 切换到"口才课组件"标签页
2. 点击"翻页组件"按钮
3. 确认画布上出现 3 个元素：左按钮、右按钮、翻页图片
4. 确认自动选中翻页图片

- [ ] **Step 2: 验证独立拖拽**

5. 拖动左按钮到新位置 → 位置独立变化
6. 拖动右按钮到新位置 → 位置独立变化
7. 拖动翻页图片到新位置 → 位置同步到当前页的 pages 数据

- [ ] **Step 3: 验证页面管理**

8. 选中翻页图片，属性面板显示"页面管理"
9. 添加 2 个新页面
10. 为第 1 页上传一张图片 → 确认保留原尺寸，位置居中
11. 为第 2 页上传另一张图片 → 确认尺寸正确
12. 点击缩略图切换到第 2 页 → 确认画布图片位置和内容跟随切换
13. 切换回第 1 页 → 确认回到第 1 页的位置和图片

- [ ] **Step 4: 验证导出**

14. 点击"发布预览"
15. 检查 LessonZK.js 中的翻页组件结构：Box 包住所有子节点，图片在底层，按钮在最上层，当前页 visible:true

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: 翻页组件完整功能——口才课分类、组合创建、页面管理、导出管线"
```