# 左侧面板重构 — 属性面板与元素列表同时可见 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将元素列表从右侧 PropertyPanel 的 tab 中提取出来，移到左侧 PageList 下方，让属性面板和元素列表始终同时可见。

**Architecture:** 左侧面板加宽到 240px (w-60)，上下分割放 PageList (~45%) 和 ElementList (~55%)。右侧 PropertyPanel 去掉 tab 切换，始终只显示属性内容。新建独立 ElementList.tsx 组件。

**Tech Stack:** React, Zustand, Tailwind CSS, TypeScript

---

### Task 1: 创建 ElementList 独立组件

**Files:**
- Create: `src/components/ElementList.tsx`

从 PropertyPanel.tsx 第 162-238 行提取元素列表部分，创建为独立组件。保持所有原有功能（选中高亮、层级排序、删除、多选对齐按钮、双击重命名）。

- [ ] **Step 1: 创建 ElementList.tsx**

将 PropertyPanel 中元素列表的 JSX 和相关逻辑提取出来。组件从 store 读取数据，不依赖 PropertyPanel 的任何 state。

```tsx
import { useEditorStore } from '../store/editorStore';
import { elementMeta } from '../elements/elementMeta';
import { ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Trash2, Plus, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ElementList() {
  const { t, language } = useI18n();
  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const moveElementLayer = useEditorStore((s) => s.moveElementLayer);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const alignElements = useEditorStore((s) => s.alignElements);

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
  const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));

  if (!currentPage) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
            {elements.map((el) => {
              const meta = elementMeta[el.type];
              const isSelected = selectedElementIds.includes(el.id);
              const depth = el.parentId ? 1 : 0;
              return (
                <div key={el.id} className={`flex items-center gap-1 py-1 text-xs transition-colors ${
                  isSelected ? 'bg-blue-600/30 text-blue-300' : 'text-slate-300 hover:bg-slate-700'
                }`} style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}>
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
                        const name = input.value.trim() || el.name;
                        span.textContent = name || meta?.label || el.type;
                        if (name && name !== el.name) updateElement(el.id, { name } as any);
                      };
                      input.onblur = finish;
                      input.onkeydown = (ke) => { if (ke.key === 'Enter') input.blur(); if (ke.key === 'Escape') { input.value = el.name || ''; input.blur(); } };
                    }}>{el.name || meta?.label || el.type}</span>
                    <span className="text-slate-500 text-[10px] shrink-0">{meta?.label || el.type}</span>
                  </button>
                  {isSelected && !el.locked && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => moveElementLayer(el.id, 'bottom')} className="p-0.5 hover:bg-slate-600 rounded" title={t('sendToBack')}><ChevronsUp size={11} /></button>
                      <button onClick={() => moveElementLayer(el.id, 'down')} className="p-0.5 hover:bg-slate-600 rounded" title={t('sendBackward')}><ArrowUp size={11} /></button>
                      <button onClick={() => moveElementLayer(el.id, 'up')} className="p-0.5 hover:bg-slate-600 rounded" title={t('bringForward')}><ArrowDown size={11} /></button>
                      <button onClick={() => moveElementLayer(el.id, 'top')} className="p-0.5 hover:bg-slate-600 rounded" title={t('bringToFront')}><ChevronsDown size={11} /></button>
                      <button onClick={() => { deleteElement(el.id); clearSelection(); }} className="p-0.5 hover:bg-red-900 rounded text-red-400" title={t('deleteElement')}><Trash2 size={11} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* 多选时显示对齐按钮 */}
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

- [ ] **Step 2: 验证组件无编译错误**

Run: `pnpm build`
Expected: 编译通过（ElementList 暂未被引用，不会影响现有功能）

- [ ] **Step 3: Commit**

```bash
git add src/components/ElementList.tsx
git commit -m "feat: create standalone ElementList component extracted from PropertyPanel"
```

---

### Task 2: 简化 PropertyPanel — 移除 tab 切换逻辑

**Files:**
- Modify: `src/components/PropertyPanel.tsx`

删除 tab 切换相关代码，让 PropertyPanel 始终只显示属性内容。无选中时显示空状态。

- [ ] **Step 1: 删除 tab 状态和自动切换逻辑**

删除 PropertyPanel.tsx 中以下代码：

- 第 35 行: `const [tab, setTab] = useState<'elements' | 'props'>('elements');`
- 第 64-68 行: 选中时自动切换的 `useEffect`
- 第 138 行: `const activeTab = hasSelection ? tab : 'elements';`

- [ ] **Step 2: 删除 tab 按钮 UI 和元素列表分支**

删除 PropertyPanel.tsx 中以下代码：

- 第 143-160 行: tab 按钮区域（两个按钮的 `<div className="h-10 ...">`)
- 第 162-238 行: `activeTab === 'elements'` 分支（整个元素列表渲染部分）
- 保留第 239-512 行: `activeTab === 'props'` 分支的内容，但去掉条件分支，直接作为 PropertyPanel 的唯一内容

最终 PropertyPanel 的 JSX 结构变为：

```tsx
<div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
  <div className="flex-1 overflow-y-auto p-3 space-y-1">
    {!hasSelection ? (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-slate-500">{t('noSelection')}</span>
      </div>
    ) : (
      <>
        {/* 属性内容保持原样 — single 判断、变换属性、组件属性、ActionEditor、删除按钮 */}
      </>
    )}
  </div>
</div>
```

- [ ] **Step 3: 清理不再需要的 import**

删除不再使用的 import：
- `elementMeta` 和 `PropertyDef` type — 检查是否仍在属性渲染部分使用（属性渲染部分仍在用，**保留**）
- `ArrowUp`, `ArrowDown`, `ChevronsUp`, `ChevronsDown`, `Trash2`（层级按钮用的） — 在 ElementList 中用，PropertyPanel 的删除按钮也用 `Trash2`，检查后保留需要的那几个
- `Plus` — 仅在 ChoiceBox 选项管理中使用，保留
- `AlignStartVertical` 等 6 个对齐图标 — 仅在元素列表多选时用，现在移到 ElementList 了，**删除**这 6 个 import

- [ ] **Step 4: 验证编译通过**

Run: `pnpm build`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: remove tab switching from PropertyPanel, always show properties only"
```

---

### Task 3: 重构 App.tsx 和 PageList 布局

**Files:**
- Modify: `src/App.tsx:120-130`
- Modify: `src/components/PageList.tsx:58`
- Modify (import): `src/App.tsx:5`

将左侧改为 w-60 容器，上下分割放 PageList 和 ElementList。PageList 去掉自身宽度类，由父容器控制。

- [ ] **Step 1: 修改 App.tsx 布局**

在 App.tsx 中：
1. 添加 `ElementList` import（第 5 行附近）
2. 修改编辑器布局 JSX（第 122-129 行），改为：

```tsx
<div className="flex-1 flex overflow-hidden">
  <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
    <PageList />
    <ElementList />
  </div>
  <div className="flex-1 flex flex-col overflow-hidden">
    <ElementToolbar />
    <Canvas />
  </div>
  <PropertyPanel />
</div>
```

- [ ] **Step 2: 修改 PageList 宽度**

在 PageList.tsx 第 58 行，将 `w-52` 改为去掉宽度类（由父容器 w-60 控制），同时去掉 `bg-slate-800` 和 `border-r border-slate-700`（这些也由父容器提供）：

```tsx
// 原来第 58 行:
<div className="w-52 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
// 改为:
<div className="flex flex-col overflow-hidden">
```

- [ ] **Step 3: 给 PageList 和 ElementList 之间加分隔线**

PageList 底部已有 `border-b border-slate-700`（预习区域底部和正课区域都有），但整个 PageList 组件最外层没有底边分隔线。需要确保 PageList 底部和 ElementList 之间有视觉分隔。

检查 PageList 最外层 div 是否有底部边框。如果没有，添加。当前 PageList 的正课区域 `<div className="flex-1 flex flex-col min-h-0 border-b border-slate-700">` 已有底部边框，所以分隔线已存在。

- [ ] **Step 4: 验证编译和界面**

Run: `pnpm build`
Expected: 编译通过

手动验证：
1. 启动 `pnpm dev`
2. 进入编辑器
3. 确认左侧面板宽度 240px，页面列表在上，元素列表在下
4. 确认右侧属性面板始终显示属性（不再有 tab 切换）
5. 点击元素 → 左侧元素列表高亮 + 右侧属性面板显示属性
6. 取消选中 → 左侧取消高亮 + 右侧显示"未选择元素"

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/PageList.tsx
git commit -m "feat: restructure layout — left sidebar holds PageList + ElementList side by side"
```

---

### Task 4: 验证和修复交互细节

**Files:**
- Modify: `src/components/ElementList.tsx` (如有问题)
- Modify: `src/components/PropertyPanel.tsx` (如有问题)

手动测试各种交互场景，确保功能无损。

- [ ] **Step 1: 测试元素选中交互**

1. 点击画布上的元素 → 检查左侧元素列表是否高亮对应条目，右侧属性面板是否显示属性
2. Shift/Ctrl 多选 → 检查左侧多选高亮，右侧显示多选属性
3. 点击左侧元素列表中的条目 → 检查画布上元素被选中，右侧属性面板更新
4. 取消选中（点击画布空白区域） → 检查左侧取消高亮，右侧显示空状态

- [ ] **Step 2: 测试层级排序和删除**

1. 选中元素后，左侧元素列表中的层级按钮（上移/下移/最上/最下）是否正常工作
2. 删除按钮是否正常工作
3. 多选时对齐按钮是否正常显示和工作

- [ ] **Step 3: 测试页面切换**

1. 切换不同页面 → 元素列表应该更新为新页面的元素
2. 属性面板应该重置

- [ ] **Step 4: 测试双击重命名**

1. 在左侧元素列表中双击元素名称 → 能否弹出 inline input 进行重命名

- [ ] **Step 5: 修复发现的问题并 commit**

如有任何交互问题，修复后 commit。

```bash
git add -A
git commit -m "fix: interaction polish after panel layout restructure"
```

---

## Self-Review

**1. Spec coverage:**
- 左侧面板 240px (w-60) → Task 3 Step 1-2 ✓
- 上下分割页面列表和元素列表 → Task 3 Step 1 ✓
- PropertyPanel 去掉 tab → Task 2 ✓
- 元素列表独立组件 → Task 1 ✓
- 属性面板始终显示属性 → Task 2 Step 2 ✓
- 无选中时空状态 → Task 2 Step 2 ✓
- 交互逻辑（选中/取消/切换页面）→ Task 4 ✓

**2. Placeholder scan:** No TBD/TODO found. All steps contain actual code.

**3. Type consistency:** ElementList uses same store hooks and element data as PropertyPanel's original element list section — no signature mismatches.