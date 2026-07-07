# SpeechSelectableObj 默认皮肤 — 内置图片方案

## 背景

当前 SpeechSelectableObj（选项卡片）没有默认皮肤——只有编辑器占位图，用户必须手动上传前景/背景图片。需要给它一个自带默认前景/背景图片的外观。

## 设计方案

**方案 A：defaultProps 直接填内置图路径**。新建 SelectableObj 即自带两张内置皮肤图，用户可随时替换。

### 资源注册

两张图片已拷入 `public/builtin/runtime/game/selectableObj/`：
- `m_1.png` — 前景图（3D 按钮前层）
- `m_2.png` — 背景图（3D 按钮后层）

在 `src/elements/builtinAssets.ts` 注册：

| id | src | exportPath |
|---|---|---|
| `selectableObj.fg` | `runtime/game/selectableObj/m_1.png` | `game/selectableObj/m_1.png` |
| `selectableObj.bg` | `runtime/game/selectableObj/m_2.png` | `game/selectableObj/m_2.png` |

### elementMeta defaultProps 变化

`SpeechSelectableObj.defaultProps`：

| 属性 | 旧值 | 新值 |
|---|---|---|
| `_foregroundSkin` | `''` | `assetExport('selectableObj.fg')` |
| `_bgSkin` | `''` | `assetExport('selectableObj.bg')` |

### 渲染逻辑（无需改动）

`components.ts:89` 已有逻辑：编辑模式下 `_foregroundSkin` 有值时用它做 skin 覆盖 placeholderImage。现在 defaultProps 有值，自动生效。

### 导出逻辑（无需改动）

`exportProject.ts` 已正确处理 `_foregroundSkin`/`_bgSkin` 有值的情况，生成双层 Image 子节点。

### 涉及文件

| 文件 | 变化 |
|---|---|
| `public/builtin/runtime/game/selectableObj/m_1.png` | 新增（前景图） |
| `public/builtin/runtime/game/selectableObj/m_2.png` | 新增（背景图） |
| `src/elements/builtinAssets.ts` | 新增两条 selectableObj 资源注册 |
| `src/elements/elementMeta.ts` | defaultProps 中 `_foregroundSkin`/`_bgSkin` 从空字符串改为 assetExport 调用 |

### 不变的部分

- 用户上传自定义图片后覆盖默认值（PropertyPanel 已有逻辑）
- 选中滤镜机制（filterColor/filterBlur）
- 导出双层 Image 结构
- PropertyPanel 的自动调尺寸逻辑（上传前景图后读原图尺寸）
- placeholderImage 机制（编辑模式无 _foregroundSkin 时仍用 placeholder）