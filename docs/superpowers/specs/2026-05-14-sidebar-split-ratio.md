# 左侧面板比例分割：PageList 最多占 60%（历史方案）

> 状态：已于 2026-07-18 被 Issue #52 的可自由浮动图层面板方案取代。本文件仅保留最初固定比例问题和历史决策；当前交互以 `docs/roadmap/canvas-layer-interaction-design.md` 的“图层面板”章节为准。

## 背景

左侧面板（w-60, 240px）上下排列 PageList 和 ElementList。当关卡列表展开（显示缩略图等），PageList 会占满整个面板，导致 ElementList 被挤到看不见。

## 设计方案

**方案 A：固定比例分割 + 内部滚动。**

- PageList 最多占 60% 高度，超过时内部滚动
- ElementList 保证至少 40% 高度，始终可见
- 两个区域各自独立滚动

### 具体实现

修改 `src/App.tsx` 中左侧容器内的 flex 属性：

1. **PageList** — 添加 `flex: 0 1 60%`，即最多占 60%，可收缩，内容多时内部滚动
2. **ElementList** — 添加 `flex: 1 0 40%`，即至少占 40%，可扩展

当前 PageList 的外层 div 已经是 `flex flex-col overflow-hidden`，内部有独立的滚动区域，所以只需在 App.tsx 中给两个组件的外层 div 添加 flex 属性即可。

或者，直接在 PageList 和 ElementList 组件自身的最外层 div 上添加 style/class 来控制比例。

### 涉及文件

| 文件 | 变化 |
|------|------|
| `src/App.tsx` | 给 PageList 和 ElementList 的 wrapper div 添加 flex 属性控制比例 |
| 或 `src/components/PageList.tsx` | 在最外层 div 添加 max-height/flex 样式 |
| 或 `src/components/ElementList.tsx` | 在最外层 div 添加 min-height/flex 样式 |

### 不变的部分

- 页面列表内容、折叠逻辑不变
- 元素列表功能不变
- 两个区域各自的内部滚动不变

## 后续结论

固定 60/40 比例只能缓解两个列表互相挤压，不能满足用户按当前任务安排图层位置的需要。Issue #52 的交互 Demo 已确认采用以下方向：完整图层面板可以在编辑器内自由放置，靠近边缘时弱磁吸到左下角、左侧列或右侧列，并按停靠方式调整尺寸。普通工作区和专注工作区只保留一个图层面板实例，布局仅作为本机偏好保存。
