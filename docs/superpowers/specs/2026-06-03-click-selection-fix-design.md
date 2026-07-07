# 点击选中逻辑修正设计文档

**日期**：2026-06-03  
**作者**：Claude  
**状态**：设计阶段

## 背景

编辑器当前的画布点击选中逻辑存在两个主要问题：

1. **命中优先级判断错误**：当多个元素重叠时，`selection.ts` 使用 `getDepth`（嵌套层级）来决定选哪个，而不是按照 `page.elements` flat 数组的 z-order。这导致嵌套更深的子元素会被选中，即使数组中有更靠后（视觉上更上层）的顶级元素。

2. **已选元素被抢走**：`CanvasOverlay.tsx` 在用户点击已选元素的选中框时，会主动扫描数组中更靠后的非容器元素并切选过去。这违反了"先选中的元素被遮挡时仍能拖动"的直觉行为。

根据需求文档 `docs/点击选中逻辑.md`：
- 元素列表中下方的元素层级更高（数组索引更大 = z-order 更高）
- 点击画布时优先选中层级高的元素
- 先在列表中选中的元素，即使被其他高层级元素遮挡，在画布上拖动时也应拖动该元素本身，而不是切换到遮挡它的元素

## 设计目标

建立两条一致的选中规则：

**规则 A — 严格 z-order 命中**  
画布 mousedown 命中多个元素时，选择 `page.elements` flat 数组中索引最大的那个（视觉最上层）。容器类型和非容器类型一视同仁，不再有 `CONTAINER_TYPES` 豁免机制。

**规则 B — 已选元素优先可拖**  
当前已选中元素 X 被另一个 z 更高的元素 Y 遮挡时，鼠标按在 X 的可视区域内，保持 X 的拖拽能力，不切选到 Y。要选 Y 必须先点空白/别处取消 X 的选中，再点击 Y。

**例外（保留）**：祖先排除——当元素 X 已选中，点击落到 X 的祖先容器 P 上时，跳过 P，让 X 维持选中。这是"已选优先"思路的延伸，防止点击空白父容器抢走子元素的选中状态。

## 方案选择

评估了两种实现方案：

### 方案 A：最小改动（选定）

- 修改 `selection.ts` 的命中逻辑：从"按嵌套层级"改为"按 flat 数组索引"
- 修改 `CanvasOverlay.tsx` 选中框 mousedown：删除"扫描数组靠后元素切选"逻辑，直接启动拖拽
- 删除 `CanvasOverlay.tsx` 中的 `CONTAINER_TYPES` 常量（失效代码）
- 改动量 < 30 行，行为完全对齐需求文档

### 方案 B：抽共享 hitTest

封装 `hitTestTopmost(wx, wy, page, options)` 函数，供 stage mousedown、CanvasOverlay 选中框 mousedown、marquee 都复用。

**不选理由**：
- marquee 是矩形相交不是点命中，API 不匹配
- CanvasOverlay 选中框 mousedown 根本不需要再做命中判断（直接拖当前选中元素即可）
- 实际复用面有限，属于 over-engineering

**结论**：采用方案 A。

## 详细设计

### 改动 ① — selection.ts 命中判断（严格 z-order）

**文件**：`src/utils/laya/selection.ts`  
**位置**：第 148-171 行  
**当前逻辑**：使用 getDepth 计算嵌套层级，选择层级最深的命中元素

**修改后**：倒序循环 flat 数组，第一个命中的就是 z-order 最高的

**Why**：`page.elements` flat 数组的顺序与 Laya 渲染的 z-order 一致（数组末尾 = 视觉最上层），倒序循环第一个命中就是正确答案。

**How to apply**：祖先排除（`ancestorIds`）继续生效，隐藏元素（`_editorHidden`）继续跳过。

### 改动 ② — CanvasOverlay 选中框 mousedown（已选优先）

**文件**：`src/components/CanvasOverlay.tsx`  
**位置**：第 375-400 行  
**当前逻辑**：扫描数组更靠后的非容器元素，如果命中就切选

**修改后**：直接调用 startDrag，不做额外命中判断

**Why**：用户已经选中 `selectedElement`，点击其选中框的意图是拖动它，而不是切换到可能遮挡它的上层元素。要选上层元素应该先取消当前选中（点空白或其他元素），再点击上层元素。

**How to apply**：双击进入编辑的逻辑（NewTextArea / Video）保留，`onDoubleClick` handler 不变。

### 改动 ③ — 删除 CanvasOverlay 中的 CONTAINER_TYPES 常量

**文件**：`src/components/CanvasOverlay.tsx`  
**位置**：第 13 行  
**操作**：删除该行定义

**Why**：改动 ② 删除了选中框 mousedown 中唯一使用 `CONTAINER_TYPES` 的地方（第 388 行），该常量成为死代码。

**注意**：`ElementList.tsx:8` 中有同名常量，用于 drag-drop 容器约束判定，**不删除**。

### 改动 ④ — sprite 回退路径（保留现有逻辑）

**文件**：`src/utils/laya/selection.ts`  
**位置**：第 176-187 行  
**说明**：当 flat 数组扫描未命中时，进入 Laya sprite 命中回退路径，用 `_objs` Map 反查元素 id。此路径用于处理元素 anchorX/Y 或自定义 hitArea 导致屏幕命中区域与 `getAbsoluteWorldRect` 计算结果不一致的场景。

**决策**：保留该 fallback，祖先排除（`ancestorIds.has(id)`）继续生效。如果未来发现此路径仍与规则 A 不一致，再单独处理。

## 验证场景

| # | 场景 | 期望行为 |
|---|---|---|
| 1 | 顶级元素 A、B 重叠，B 在数组更靠后位置 | 点击重叠区 → 选中 B（规则 A） |
| 2 | 顶级元素 A、容器 P，P 在数组更靠后且全屏覆盖 A | 点击 A 范围 → 选中 P（严格 z-order，无容器豁免） |
| 3 | 选中 A 后，B 遮挡 A，鼠标按在 A 的可视区域 | 拖动 A，不切选到 B（规则 B） |
| 4 | 选中 A 后点击画布空白区域 | 取消选中，开始 marquee 框选 |
| 5 | 选中子元素 A 后，点击其祖先容器 P 的可视区域 | A 维持选中（祖先排除例外） |
| 6 | 选中 A 后双击 A（A 是 NewTextArea 或 Video） | 进入内联编辑/播放模式 |
| 7 | A 被拖出 viewport，选中框已不在原位 | 选中框跟随 A 移出屏幕，规则 B 自然失效 |

## 不在范围内

- `selection.ts` 的 sprite 回退路径细节（改动 ④ 已说明保留现有逻辑）
- `ElementList.tsx` 的 drag-drop 容器类型约束（与选中逻辑无关）
- 多选拖动逻辑（当前实现已支持规则 B：`selected.includes(elementId)` 分支会批量移动所有选中元素）
- marquee 框选的矩形相交判定（已是正确实现，不需改动）

## 风险与注意事项

**风险**：全屏容器（如背景 Box）被拖到数组末尾时会压住上面的小元素。

**缓解**：这是"严格 z-order"的自然结果。用户可以：
1. 在 ElementList 中拖动元素调整 z-order
2. 先点空白取消选中，再点击小元素
3. 在 ElementList 中直接选中小元素

现有工作流中，用户通常不会把背景容器拖到数组末尾（它们在模板中就是靠前的），因此实际影响有限。

## 实现顺序

1. 改动 ①：修正 `selection.ts` 命中逻辑（核心修复）
2. 改动 ②：修正 `CanvasOverlay.tsx` 选中框 mousedown（核心修复）
3. 改动 ③：清理 `CanvasOverlay.tsx` 死代码（维护性）
4. 验证所有场景（测试）

总改动量约 25 行（净减少 15 行代码）。
