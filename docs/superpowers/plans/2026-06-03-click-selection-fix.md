# 点击选中逻辑修正实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正画布点击选中逻辑，实现严格 z-order 命中和已选元素优先可拖

**Architecture:** 修改 selection.ts 的命中判断从"按嵌套层级"改为"按 flat 数组索引"；修改 CanvasOverlay.tsx 选中框 mousedown 删除"扫描切选"逻辑，直接启动拖拽；清理死代码。

**Tech Stack:** TypeScript, React, LayaAir

---

## 文件清单

**修改文件：**
- `src/utils/laya/selection.ts` — 修正画布命中判断逻辑（第 148-172 行）
- `src/components/CanvasOverlay.tsx` — 修正选中框 mousedown 逻辑（第 13 行、第 375-400 行）

**无需新增文件**

---

### 任务 1：修正 selection.ts 命中判断（严格 z-order）

**Files:**
- Modify: `src/utils/laya/selection.ts:148-172`

**目标：** 删除 `getDepth` 函数和相关变量，改为倒序循环第一个命中即返回（按 flat 数组索引 = z-order）

- [ ] **步骤 1: 读取当前代码确认修改范围**

运行：直接读取 `src/utils/laya/selection.ts:148-172`

预期：看到 `getDepth` 函数定义、`best`/`bestDepth` 变量、以及在循环里调用 `getDepth(el)` 的逻辑

- [ ] **步骤 2: 删除 getDepth 相关代码，改为第一个命中即返回**

修改 `src/utils/laya/selection.ts` 第 148-172 行：

**删除：**
```ts
const elMap = new Map(page.elements.map(e => [e.id, e]));
const getDepth = (el: Element) => {
  let d = 0, cur = el;
  while (cur.parentId) {
    const p = elMap.get(cur.parentId);
    if (!p) break;
    d++; cur = p;
  }
  return d;
};
let best: Element | null = null;
let bestDepth = -1;
for (let i = page.elements.length - 1; i >= 0; i--) {
  const el = page.elements[i];
  const elProps = el.props as Record<string, unknown>;
  if (elProps._editorHidden === true) continue;
  if (ancestorIds.has(el.id)) continue;
  const abs = getAbsoluteWorldRect(el, page.elements);
  if (wx >= abs.x && wx <= abs.x + abs.w && wy >= abs.y && wy <= abs.y + abs.h) {
    const depth = getDepth(el);
    if (depth > bestDepth) { best = el; bestDepth = depth; }
  }
}
if (best) { _editorCb?.onSelect(best.id); return; }
```

**替换为：**
```ts
// 倒序循环 flat 数组，第一个命中的就是 z-order 最高的（数组末尾 = 视觉最上层）
for (let i = page.elements.length - 1; i >= 0; i--) {
  const el = page.elements[i];
  const elProps = el.props as Record<string, unknown>;
  if (elProps._editorHidden === true) continue;
  if (ancestorIds.has(el.id)) continue;
  const abs = getAbsoluteWorldRect(el, page.elements);
  if (wx >= abs.x && wx <= abs.x + abs.w && wy >= abs.y && wy <= abs.y + abs.h) {
    _editorCb?.onSelect(el.id);
    return;
  }
}
```

- [ ] **步骤 3: 验证语法无误**

运行：`pnpm lint src/utils/laya/selection.ts`

预期：无 ESLint 错误

- [ ] **步骤 4: 启动开发服务器测试场景 1-2**

运行：`pnpm dev`（如果尚未启动）

测试场景 1：在编辑器中创建两个顶级元素 A、B，拖动 B 到数组末尾（ElementList 下方），让它们部分重叠。点击重叠区域。

预期：选中 B（数组靠后的元素）

测试场景 2：创建顶级元素 A 和一个全屏容器 P（如 Box），将 P 拖到数组末尾覆盖 A。点击 A 原来的范围。

预期：选中 P（严格 z-order，容器也参与）

- [ ] **步骤 5: 提交改动（注意：用户要求不自动提交 git，此步骤仅作记录，实际执行时跳过提交）**

```bash
# 仅作记录，实际不执行
# git add src/utils/laya/selection.ts
# git commit -m "fix: 修正 selection.ts 命中判断为严格 z-order"
```

---

### 任务 2：修正 CanvasOverlay 选中框 mousedown（已选优先）

**Files:**
- Modify: `src/components/CanvasOverlay.tsx:375-400`

**目标：** 删除选中框 mousedown 中的"扫描数组靠后元素切选"逻辑，直接调用 startDrag

- [ ] **步骤 1: 读取当前代码确认修改范围**

运行：直接读取 `src/components/CanvasOverlay.tsx:375-400`

预期：看到 onMouseDown 中有 `const page = currentPage;` 和一个 for 循环扫描 `page.elements` 的逻辑

- [ ] **步骤 2: 简化 onMouseDown 为直接启动拖拽**

修改 `src/components/CanvasOverlay.tsx` 第 375-400 行：

**删除：**
```tsx
onMouseDown={(e) => {
  // 中键不启动拖拽，放行给 Canvas 做画布平移
  if (e.button !== 0) return;
  // 当前选中元素的选中框被点击：先看点击点是否落在数组更靠后（视觉更顶层）的某个非容器元素上，
  // 是 → 切选到那个元素；否 → 拖当前选中元素。
  // 容器（Box/KlInputBox 等）即使数组靠后也不参与，否则全屏容器会一直"压住"上面的小元素。
  const page = currentPage;
  if (page) {
    const hostRect = layaHostRef.current!.getBoundingClientRect();
    const { wx, wy } = clientToWorld(e.clientX, e.clientY, hostRect, world.panX, world.panY, world.zoom);
    const selectedIdx = page.elements.findIndex(e2 => e2.id === selectedElement.id);
    for (let i = page.elements.length - 1; i > selectedIdx; i--) {
      const el = page.elements[i];
      if (CONTAINER_TYPES.has(el.type)) continue;
      const elProps = el.props as Record<string, unknown>;
      if (elProps._editorHidden === true) continue;
      const abs = getAbsoluteWorldRect(el, page.elements);
      if (wx >= abs.x && wx <= abs.x + abs.w && wy >= abs.y && wy <= abs.y + abs.h) {
        e.stopPropagation();
        useEditorStore.getState().selectElement(el.id);
        return;
      }
    }
  }
  startDrag(e, null, selectedElement.id);
}}
```

**替换为：**
```tsx
onMouseDown={(e) => {
  if (e.button !== 0) return;
  startDrag(e, null, selectedElement.id);
}}
```

- [ ] **步骤 3: 验证语法无误**

运行：`pnpm lint src/components/CanvasOverlay.tsx`

预期：无 ESLint 错误

- [ ] **步骤 4: 测试场景 3-5**

测试场景 3：在编辑器中选中元素 A，然后创建元素 B 并拖到数组末尾让它遮挡 A。保持 A 的选中状态，点击 A 的可视区域拖动。

预期：拖动 A，不会切选到 B

测试场景 4：选中元素 A 后，点击画布空白区域。

预期：取消选中，开始 marquee 框选

测试场景 5：创建一个容器 P 和其子元素 A。先在 ElementList 中选中 A，然后点击画布上容器 P 的可视区域（不是 A 的范围）。

预期：A 维持选中（祖先排除，这个逻辑在 selection.ts 中，此任务不涉及）

- [ ] **步骤 5: 提交改动（注意：用户要求不自动提交 git，此步骤仅作记录，实际执行时跳过提交）**

```bash
# 仅作记录，实际不执行
# git add src/components/CanvasOverlay.tsx
# git commit -m "fix: 修正 CanvasOverlay 选中框 mousedown 为已选优先"
```

---

### 任务 3：清理 CanvasOverlay 死代码（CONTAINER_TYPES 常量）

**Files:**
- Modify: `src/components/CanvasOverlay.tsx:13`

**目标：** 删除第 13 行的 `CONTAINER_TYPES` 常量定义（已成为死代码）

- [ ] **步骤 1: 读取第 13 行确认常量定义**

运行：直接读取 `src/components/CanvasOverlay.tsx:10-15`

预期：看到 `const CONTAINER_TYPES = new Set([...]);`

- [ ] **步骤 2: 删除 CONTAINER_TYPES 常量定义**

修改 `src/components/CanvasOverlay.tsx` 第 13 行：

**删除整行：**
```ts
const CONTAINER_TYPES = new Set(['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox']);
```

- [ ] **步骤 3: 确认 ElementList.tsx 中的 CONTAINER_TYPES 保持不变**

运行：搜索 `ElementList.tsx` 中是否有 `CONTAINER_TYPES` 定义

预期：`src/components/ElementList.tsx:8` 有同名常量，用于 drag-drop 容器约束，保持不动

- [ ] **步骤 4: 验证语法和引用无误**

运行：`pnpm lint src/components/CanvasOverlay.tsx`

预期：无 ESLint 错误，无"未使用的变量"警告

- [ ] **步骤 5: 提交改动（注意：用户要求不自动提交 git，此步骤仅作记录，实际执行时跳过提交）**

```bash
# 仅作记录，实际不执行
# git add src/components/CanvasOverlay.tsx
# git commit -m "refactor: 清理 CanvasOverlay 死代码 CONTAINER_TYPES"
```

---

### 任务 4：完整验证所有场景

**目标：** 完整测试设计文档中列出的 7 个验证场景

- [ ] **步骤 1: 验证场景 1 - 顶级元素重叠 z-order**

操作：创建两个顶级图片元素 A、B，将 B 拖到 ElementList 下方（数组末尾），让它们部分重叠。点击重叠区域。

预期：选中 B

- [ ] **步骤 2: 验证场景 2 - 容器严格 z-order**

操作：创建顶级图片 A 和一个全屏 Box 容器 P，将 P 拖到 ElementList 下方覆盖 A。点击 A 原来的范围。

预期：选中 P（容器也参与 z-order，不豁免）

- [ ] **步骤 3: 验证场景 3 - 已选元素优先可拖**

操作：在 ElementList 中选中元素 A，然后创建元素 B 并拖到数组末尾遮挡 A。保持 A 选中，点击 A 的可视区域并拖动。

预期：拖动 A，不切选到 B

- [ ] **步骤 4: 验证场景 4 - 空白取消选中**

操作：选中任意元素后，点击画布空白区域。

预期：取消选中，开始 marquee 框选（拖动出蓝色虚线框）

- [ ] **步骤 5: 验证场景 5 - 祖先排除**

操作：创建容器 P 和子元素 A。在 ElementList 中选中 A，然后点击画布上 P 的可视区域（不是 A 的范围）。

预期：A 维持选中（不会切到 P）

- [ ] **步骤 6: 验证场景 6 - 双击进入编辑**

操作：创建一个 NewTextArea 元素，选中后双击。

预期：进入内联编辑模式（出现文本输入框）

- [ ] **步骤 7: 验证场景 7 - 元素拖出 viewport**

操作：选中元素 A，将其拖出画布可视区域（通过拖动或缩放让它移到 viewport 外）。

预期：选中框跟随 A 移出屏幕，选中状态保持

- [ ] **步骤 8: 记录测试结果**

所有场景通过后，在本地记录测试完成。

---

## 自查清单

**Spec 覆盖检查：**
- ✅ 改动 ① 对应设计文档"改动 ① — selection.ts 命中判断（严格 z-order）"
- ✅ 改动 ② 对应设计文档"改动 ② — CanvasOverlay 选中框 mousedown（已选优先）"
- ✅ 改动 ③ 对应设计文档"改动 ③ — 删除 CanvasOverlay 中的 CONTAINER_TYPES 常量"
- ✅ 改动 ④（sprite 回退路径）设计文档明确标注"保留现有逻辑"，无需修改
- ✅ 7 个验证场景全部覆盖在任务 4

**占位符扫描：**
- ✅ 无 TBD / TODO / "实现后续" / "添加适当的" 等占位符
- ✅ 所有代码块都是完整的可执行代码

**类型一致性：**
- ✅ `_editorCb?.onSelect(el.id)` 在任务 1 中使用
- ✅ `startDrag(e, null, selectedElement.id)` 在任务 2 中使用
- ✅ 方法签名和变量命名在各任务间一致

**测试覆盖：**
- ✅ 任务 1 步骤 4 测试场景 1-2
- ✅ 任务 2 步骤 4 测试场景 3-5
- ✅ 任务 4 完整覆盖全部 7 个场景

---

## 注意事项

**重要：** 用户明确要求"不自动提交 git"，所有任务中的"提交改动"步骤仅作记录，实际执行时跳过提交操作。用户会自行审查后手动提交。

**改动范围：** 总改动约 25 行（净减少约 15 行代码），符合设计文档预期。

**风险缓解：** 全屏容器被拖到数组末尾会压住小元素，但用户可通过 ElementList 调整 z-order 或重新选择解决。
