# 通用状态属性：hidden & blockThrough

## 背景

当前 `_hidden` 属性通过 PropertyPanel 硬编码注入（带 `_` 前缀），被视为 editor-only hack。这有两个问题：
1. `_` 前缀属性按约定是"编辑器内部、不持久化"的，但 `hidden` 应该是正式属性
2. 新增类似的状态属性（如"阻止穿透")只能继续用 hack 模式，缺乏扩展性

本设计将 `hidden` 和 `blockThrough` 从 hack 升级为 elementMeta 通用状态属性，通过自动合并机制对所有元素类型生效。

## 设计

### 1. elementMeta.ts — 通用状态属性模板

定义 `COMMON_STATE_PROPS` 常量，在构建每个 elementMeta 条目时自动合并到 `properties` 数组开头：

```typescript
const COMMON_STATE_PROPS: PropertyDef[] = [
  { key: 'hidden', label: '隐藏', type: 'boolean', group: '状态' },
  { key: 'blockThrough', label: '阻止穿透', type: 'boolean', group: '状态' },
];
```

每个条目的 properties 改为：`properties: [...COMMON_STATE_PROPS, ...原有properties]`。

### 2. PropertyPanel.tsx — 移除硬编码注入

删除当前的 `_hidden` 手动注入逻辑（第 159-162 行）：
```typescript
// 删除这两行：
const properties: PropertyDef[] = [
  { key: '_hidden', label: '隐藏', type: 'boolean', group: '状态' },
  ...(meta?.properties ?? []),
];
```
改为直接使用 `meta?.properties ?? []`，因为 `hidden` 和 `blockThrough` 已通过 elementMeta 自动合并。

### 3. 导出转换逻辑

在 `exportProject.ts` 和 `exportPreviewProject.ts` 的 `buildSceneNode` 中：

**属性过滤**：在遍历 rewritten props 的循环中，显式跳过 `hidden` 和 `blockThrough`（它们是状态标记，不出现在导出的 props 中）：
```typescript
for (const [k, v] of Object.entries(rewritten)) {
  if (k.startsWith('_')) continue;
  if (k === 'hidden') continue;          // 状态标记，导出时转换为 visible
  if (k === 'blockThrough') continue;    // 状态标记，导出时转换为 mouseEnabled/mouseThrough
  ...
}
```

**转换输出**（在循环之后）：
```typescript
// hidden=true → visible=false
if (rewritten.hidden === true) props.visible = false;
// blockThrough=true → mouseEnabled=true, mouseThrough=false
if (rewritten.blockThrough === true) {
  props.mouseEnabled = true;
  props.mouseThrough = false;
}
```

### 4. 默认值

`hidden` 和 `blockThrough` 默认都是 `false`（不勾选）。不需要添加到每个条目的 `defaultProps`——undefined 在 boolean checkbox 中自然表现为未勾选状态。

### 5. 编辑器画布行为

- `hidden=true`：编辑器画布上元素仍可见（仅导出时 `visible=false`），但属性面板 checkbox 勾选后可加视觉提示（如半透明/标记），当前暂不做视觉提示，只改导出逻辑
- `blockThrough`：编辑器画布无特殊行为，仅影响导出属性

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/elements/elementMeta.ts` | 新增 `COMMON_STATE_PROPS`，所有条目 properties 合入 |
| `src/components/PropertyPanel.tsx` | 删除 `_hidden` 硬编码注入，改用 meta.properties |
| `src/utils/exportProject.ts` | `hidden`/`blockThrough` 过滤 + 转换逻辑 |
| `src/utils/exportPreviewProject.ts` | 同上 |

## 扩展性

未来新增类似的状态属性只需在 `COMMON_STATE_PROPS` 中添加一条，并在导出文件中添加对应的转换规则。无需修改每个 elementMeta 条目或 PropertyPanel。