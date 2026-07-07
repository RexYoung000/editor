# 通用状态属性 (hidden & blockThrough) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `_hidden` 从 editor-only hack 升级为 elementMeta 通用状态属性 `hidden`，并新增 `blockThrough` 属性，两者对所有元素类型自动生效，导出时转换为 Laya 运行时属性。

**Architecture:** 定义 `COMMON_STATE_PROPS` 常量数组，通过 spread 合入每个 elementMeta 条目的 `properties`。PropertyPanel 不再硬编码注入。导出文件中 `hidden`/`blockThrough` 作为状态标记被过滤，转换为 `visible`/`mouseEnabled`/`mouseThrough`。

**Tech Stack:** TypeScript, React (Zustand store), Vite

---

### Task 1: elementMeta.ts — 定义 COMMON_STATE_PROPS 并合入所有条目

**Files:**
- Modify: `src/elements/elementMeta.ts:54-60` (插入 COMMON_STATE_PROPS 定义)
- Modify: `src/elements/elementMeta.ts:152-386` (所有条目的 properties 字段)

- [ ] **Step 1: 在 elementMeta.ts 中定义 COMMON_STATE_PROPS**

在 `CATEGORIES` 定义之后、`P_TEXT` 定义之前（约第 54 行位置）插入：

```typescript
// ─── 通用状态属性（所有元素类型自动合入，导出时转换为 Laya 运行时属性）───
const COMMON_STATE_PROPS: PropertyDef[] = [
  { key: 'hidden', label: '隐藏', type: 'boolean', group: '状态' },
  { key: 'blockThrough', label: '阻止穿透', type: 'boolean', group: '状态' },
];
```

- [ ] **Step 2: 将 COMMON_STATE_PROPS 合入每个条目的 properties**

逐个修改 `elementMeta` 中每个条目的 `properties` 字段，改为 `[...COMMON_STATE_PROPS, ...原有properties]`。

具体改动清单（每个条目当前 properties 值 → 新值）：

| 条目 | 当前 | 改为 |
|------|------|------|
| `Label` | `P_TEXT` | `[...COMMON_STATE_PROPS, ...P_TEXT]` |
| `ScaleButton` | `[...P_LABEL, ...P_SKIN, ...]` | `[...COMMON_STATE_PROPS, ...P_LABEL, ...P_SKIN, ...]` |
| `SoundButton` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `Image` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `TextInput` | `[{ key: 'prompt', ...}]` | `[...COMMON_STATE_PROPS, { key: 'prompt', ...}]` |
| `CheckBox` | `[{ key: 'label', ...}]` | `[...COMMON_STATE_PROPS, { key: 'label', ...}]` |
| `Radio` | `[{ key: 'label', ...}]` | `[...COMMON_STATE_PROPS, { key: 'label', ...}]` |
| `RadioGroup` | `[{ key: 'labels', ...}]` | `[...COMMON_STATE_PROPS, { key: 'labels', ...}]` |
| `ProgressBar` | `[{ key: 'value', ...}]` | `[...COMMON_STATE_PROPS, { key: 'value', ...}]` |
| `VSlider` | `[{ key: 'value', ...}]` | `[...COMMON_STATE_PROPS, { key: 'value', ...}]` |
| `Tab` | `[{ key: 'labels', ...}]` | `[...COMMON_STATE_PROPS, { key: 'labels', ...}]` |
| `FontClip` | `[{ key: 'value', ...}]` | `[...COMMON_STATE_PROPS, { key: 'value', ...}]` |
| `Box` | `[]` | `[...COMMON_STATE_PROPS]` |
| `HBox` | `[{ key: 'space', ...}]` | `[...COMMON_STATE_PROPS, { key: 'space', ...}]` |
| `VBox` | `[{ key: 'space', ...}]` | `[...COMMON_STATE_PROPS, { key: 'space', ...}]` |
| `Panel` | `[]` | `[...COMMON_STATE_PROPS]` |
| `List` | `[{ key: 'repeatX', ...}]` | `[...COMMON_STATE_PROPS, { key: 'repeatX', ...}]` |
| `ViewStack` | `[{ key: 'selectedIndex', ...}]` | `[...COMMON_STATE_PROPS, { key: 'selectedIndex', ...}]` |
| `ChoiceBox` | `[{ key: 'rightItemNames', ...}]` | `[...COMMON_STATE_PROPS, { key: 'rightItemNames', ...}]` |
| `KlInputBox` | `[{ key: 'answer', ...}]` | `[...COMMON_STATE_PROPS, { key: 'answer', ...}]` |
| `KlInputImage` | `KL_INPUT_IMAGE_CONFIG.properties` | `[...COMMON_STATE_PROPS, ...KL_INPUT_IMAGE_CONFIG.properties]` |
| `DragView` | `[{ key: 'mode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'mode', ...}]` |
| `DragObj` | `[...P_GROUP, ...]` | `[...COMMON_STATE_PROPS, ...P_GROUP, ...]` |
| `DropObj` | `[...P_GROUP, ...]` | `[...COMMON_STATE_PROPS, ...P_GROUP, ...]` |
| `DragViewBox` | `[{ key: 'mode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'mode', ...}]` |
| `MatchingGame` | `[{ key: 'mode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'mode', ...}]` |
| `MatchingItem` | `[{ key: 'camp', ...}]` | `[...COMMON_STATE_PROPS, { key: 'camp', ...}]` |
| `OneStrokeGame` | `[{ key: 'mode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'mode', ...}]` |
| `OneStrokeItem` | `[{ key: 'connectItems', ...}]` | `[...COMMON_STATE_PROPS, { key: 'connectItems', ...}]` |
| `MazeView` | `[{ key: 'clickDragMode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'clickDragMode', ...}]` |
| `MazeMoveObj` | `[{ key: 'camp', ...}]` | `[...COMMON_STATE_PROPS, { key: 'camp', ...}]` |
| `MazeGoalObj` | `[{ key: 'camp', ...}]` | `[...COMMON_STATE_PROPS, { key: 'camp', ...}]` |
| `BrushSprite` | `[{ key: 'brushMode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'brushMode', ...}]` |
| `CountDown` | `[{ key: 'allTime', ...}]` | `[...COMMON_STATE_PROPS, { key: 'allTime', ...}]` |
| `PriviewGuideFinger` | `[{ key: 'mode', ...}]` | `[...COMMON_STATE_PROPS, { key: 'mode', ...}]` |
| `ImageScaleTime` | `[]` | `[...COMMON_STATE_PROPS]` |
| `KlChangeColorBox` | `[{ key: 'fcolor', ...}]` | `[...COMMON_STATE_PROPS, { key: 'fcolor', ...}]` |
| `Video` | `[{ key: 'videoUrl', ...}]` | `[...COMMON_STATE_PROPS, { key: 'videoUrl', ...}]` |
| `Spine` | `[{ key: 'url', ...}]` | `[...COMMON_STATE_PROPS, { key: 'url', ...}]` |
| `Skeleton` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `NewImage` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `NewTextArea` | `[{ key: 'text', ...}]` | `[...COMMON_STATE_PROPS, { key: 'text', ...}]` |
| `NewInput` | `KL_INPUT_IMAGE_CONFIG.properties.filter(...)` | `[...COMMON_STATE_PROPS, ...KL_INPUT_IMAGE_CONFIG.properties.filter(...)]` |
| `KlBaseKeyboard` | `[{ key: 'camp', ...}]` | `[...COMMON_STATE_PROPS, { key: 'camp', ...}]` |
| `ConfirmButton` | `[{ key: 'var', ...}]` | `[...COMMON_STATE_PROPS, { key: 'var', ...}]` |
| `ChoiceBoxOkBtn` | `[{ key: 'var', ...}]` | `[...COMMON_STATE_PROPS, { key: 'var', ...}]` |
| `NormalBtn` | `[{ key: 'var', ...}]` | `[...COMMON_STATE_PROPS, { key: 'var', ...}]` |
| `NewTabImg` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `ContainerBox` | `[{ key: 'pageTurnGroup', ...}]` | `[...COMMON_STATE_PROPS, { key: 'pageTurnGroup', ...}]` |
| `PageTurnLeftBtn` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `PageTurnRightBtn` | `[{ key: 'skin', ...}]` | `[...COMMON_STATE_PROPS, { key: 'skin', ...}]` |
| `PageTurnBox` | `[{ key: 'pageTurnGroup', ...}]` | `[...COMMON_STATE_PROPS, { key: 'pageTurnGroup', ...}]` |
| `SpeechSelectableObj` | `[{ key: 'name', ...}]` | `[...COMMON_STATE_PROPS, { key: 'name', ...}]` |

- [ ] **Step 3: 验证编译无报错**

Run: `pnpm build`
Expected: 编译成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: add COMMON_STATE_PROPS (hidden, blockThrough) to all elementMeta entries"
```

---

### Task 2: PropertyPanel.tsx — 移除 _hidden 硬编码注入

**Files:**
- Modify: `src/components/PropertyPanel.tsx:159-162`

- [ ] **Step 1: 删除 _hidden 硬编码注入**

将第 159-162 行从：
```typescript
const properties: PropertyDef[] = [
  { key: '_hidden', label: '隐藏', type: 'boolean', group: '状态' },
  ...(meta?.properties ?? []),
];
```

改为：
```typescript
const properties: PropertyDef[] = meta?.properties ?? [];
```

因为 `hidden` 和 `blockThrough` 已通过 `COMMON_STATE_PROPS` 合入每个条目的 `properties` 中。

- [ ] **Step 2: 验证编译无报错**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "refactor: remove hardcoded _hidden injection from PropertyPanel, now via elementMeta"
```

---

### Task 3: exportProject.ts — 更新 hidden/blockThrough 导出转换逻辑

**Files:**
- Modify: `src/utils/exportProject.ts:224-235`

- [ ] **Step 1: 在属性过滤循环中跳过 hidden 和 blockThrough**

将第 224-230 行从：
```typescript
for (const [k, v] of Object.entries(rewritten)) {
  if (k.startsWith('_')) continue;
  // scene 里只有根节点有 runtime，子节点不注入
  if (k === 'runtime') continue;
  // ChoiceBox 的 mouseEnabled 由 runtime 内部控制，scene 不导出
  if (element.layaType === 'ChoiceBox' && k === 'mouseEnabled') continue;
  if (v !== undefined && v !== null && v !== '') props[k] = v;
}
```

改为：
```typescript
for (const [k, v] of Object.entries(rewritten)) {
  if (k.startsWith('_')) continue;
  // scene 里只有根节点有 runtime，子节点不注入
  if (k === 'runtime') continue;
  // 通用状态标记，导出时转换为 Laya 运行时属性（hidden→visible, blockThrough→mouseEnabled/mouseThrough）
  if (k === 'hidden') continue;
  if (k === 'blockThrough') continue;
  // ChoiceBox 的 mouseEnabled 由 runtime 内部控制，scene 不导出
  if (element.layaType === 'ChoiceBox' && k === 'mouseEnabled') continue;
  if (v !== undefined && v !== null && v !== '') props[k] = v;
}
```

- [ ] **Step 2: 更新 _hidden 转换为 hidden 转换，并添加 blockThrough 转换**

将第 234-235 行从：
```typescript
// _hidden=true → visible=false（勾选隐藏时导出不可见）
if (rewritten._hidden === true) props.visible = false;
```

改为：
```typescript
// hidden=true → visible=false（勾选隐藏时导出不可见）
if (rewritten.hidden === true) props.visible = false;
// blockThrough=true → mouseEnabled=true, mouseThrough=false（勾选阻止穿透时导出拦截点击）
if (rewritten.blockThrough === true) {
  props.mouseEnabled = true;
  props.mouseThrough = false;
}
```

- [ ] **Step 3: 验证编译无报错**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: export hidden→visible and blockThrough→mouseEnabled/mouseThrough"
```

---

### Task 4: exportPreviewProject.ts — 同步导出逻辑

**Files:**
- Modify: `src/utils/exportPreviewProject.ts:170-178`

- [ ] **Step 1: 在属性过滤循环中跳过 hidden 和 blockThrough**

将第 170-174 行从：
```typescript
for (const [k, v] of Object.entries(rewritten)) {
  if (k.startsWith('_')) continue;
  if (k === 'runtime') continue;
  if (v !== undefined && v !== null && v !== '') props[k] = v;
}
```

改为：
```typescript
for (const [k, v] of Object.entries(rewritten)) {
  if (k.startsWith('_')) continue;
  if (k === 'runtime') continue;
  if (k === 'hidden') continue;
  if (k === 'blockThrough') continue;
  if (v !== undefined && v !== null && v !== '') props[k] = v;
}
```

- [ ] **Step 2: 更新 _hidden 转换为 hidden 转换，并添加 blockThrough 转换**

将第 177-178 行从：
```typescript
// _hidden=true → visible=false
if (rewritten._hidden === true) props.visible = false;
```

改为：
```typescript
// hidden=true → visible=false
if (rewritten.hidden === true) props.visible = false;
// blockThrough=true → mouseEnabled=true, mouseThrough=false
if (rewritten.blockThrough === true) {
  props.mouseEnabled = true;
  props.mouseThrough = false;
}
```

- [ ] **Step 3: 验证编译无报错**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src/utils/exportPreviewProject.ts
git commit -m "feat: preview export hidden/blockThrough conversion (sync with exportProject)"
```

---

### Task 5: 数据迁移兼容性处理

**Files:**
- Modify: `src/utils/exportProject.ts:217` (buildSceneNode 的 merged 构造)
- Modify: `src/utils/exportPreviewProject.ts:163` (同上)

- [ ] **Step 1: 在两个导出文件的 merged 构造中添加 _hidden → hidden 迁移**

用户已有的课件数据中 `element.props._hidden` 可能存在。导出时需将旧的 `_hidden` 迁移为 `hidden` 以确保转换逻辑生效。

在 `exportProject.ts` 第 217 行，将：
```typescript
const merged = { ...(meta?.defaultProps ?? {}), ...(element.props ?? {}) };
```

改为：
```typescript
const rawProps = { ...(element.props ?? {}) };
// 旧数据兼容：_hidden → hidden
if ('_hidden' in rawProps && !('hidden' in rawProps)) rawProps.hidden = rawProps._hidden;
const merged = { ...(meta?.defaultProps ?? {}), ...rawProps };
```

在 `exportPreviewProject.ts` 第 163 行，做同样的改动。

- [ ] **Step 2: 验证编译无报错**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportProject.ts src/utils/exportPreviewProject.ts
git commit -m "feat: backward compat _hidden→hidden migration in export"
```

---

## Self-Review

1. **Spec coverage:** 所有设计要求都有对应 Task：COMMON_STATE_PROPS 定义(Task1)、PropertyPanel移除注入(Task2)、导出过滤+转换(Task3&4)、默认值处理(无需action，undefined=falsy)、数据迁移(Task5)

2. **Placeholder scan:** 无 TBD/TODO，所有步骤都有完整代码

3. **Type consistency:** `hidden` 和 `blockThrough` 在所有文件中一致使用，无命名矛盾