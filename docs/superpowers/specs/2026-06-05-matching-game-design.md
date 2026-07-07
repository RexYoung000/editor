# 连线题功能设计文档

**日期**: 2026-06-05
**功能**: 在"豌豆口才"分类下添加"连线题"按钮，支持三种连线方向，配置连线模式与皮肤

---

## 需求概述

在编辑器工具栏的"豌豆口才"分类下添加"连线题"按钮，用户点击后自动创建包含连线游戏容器和6个连线项的完整结构。支持三种连线方向（左右、上下、中心点），用户可在属性面板切换方向，系统自动调整子项的位置和命名。

属性面板需暴露：
- **连线方向（direction）**：0=左右（默认），1=上下，2=中心点
- **连线模式（mode）**：1=点击连线，2=滑动连线，3=可点可滑（默认）
- **连线皮肤（lineSkin）**：用户上传图片，可选
- **连线错误提示皮肤（wrongLineskin）**：用户上传图片，可选（注意：导出字段名是小写 `wrongLineskin`）
- **是否单线模式（single）**：是（默认，导出 single=0）/ 否（导出 single=1）

MatchingItem 需暴露：
- **图片（_itemImage）**：用户上传图片，上传后自动调整 MatchingItem 宽高为图片实际尺寸，画布上直接显示图片，导出时自动生成 Image 子节点

参考现有的选择题实现模式，导出的 .scene 参考 `D:\project\v6\S6\s6_v6_15\Game2_LT1\laya\pages\game_lt1\GameLX2.scene`。导出的 .ts 文件暂不实现。

---

## 组件结构

### 已有组件

项目中已存在以下组件定义（在 `src/elements/elementMeta.ts` 中）：

- **MatchingGame**: 连线游戏容器
  - layaType: 'MatchingGame'
  - runtime: 'com.klzz.ui.custom.MatchingGame.MatchingGame'
  - 关键属性：
    - `direction` (select): 连线方向，0=左右，1=上下，2=中心点
    - `mode` (select): 连线模式（1=点击，2=滑动，3=可点可滑）
    - `lineSkin` (file): 连线皮肤（可选）
    - `wrongLineSkin` (file): 连线错误提示皮肤（可选）
    - `boxItemsName` (text): 连线项容器的名字（导出时引用 MatchBox.name）
    - `single` (select): 是否单线模式（"是"=0/"否"=1）
    - `lineHeight` (number): 连线高度

- **MatchingItem**: 连线项
  - layaType: 'MatchingItem'
  - runtime: 'com.klzz.ui.custom.MatchingGame.MatchingItem'
  - 关键属性：
    - `camp` (text): 本项所属阵营
    - `connectableCamps` (text): 可连接到哪些阵营
    - `rightItemNames` (text): 正确的连接对象名称
    - `_itemImage` (file): **编辑器专用字段**，用户上传图片后存储路径，上传后自动调整 MatchingItem 宽高为图片实际尺寸
  
  **编辑器行为**：
  - 用户上传图片后，`_itemImage` 存储图片路径
  - 画布上 MatchingItem 显示这张图片，宽高自动设为图片实际尺寸
  - **不创建子节点**（编辑器中保持干净）
  
  **导出行为**：
  - 导出 .scene 时，MatchingItem 自身不包含 `_itemImage` 或 skin 字段（保持干净）
  - 如果 `_itemImage` 非空，在 MatchingItem 下自动生成一个 Image 子节点
  - Image 子节点的 `type: "Image"`，`props.skin` 为 `_itemImage` 的值

### 创建结构

用户点击"连线题"按钮后，创建以下层级结构：

```
MatchingGame (x=0, y=0, 1920x1080, direction=0, mode=3)
└── MatchBox (Box类型, x=0, y=0, 1920x1080)
    ├── MatchingItem (l1) - 左侧第1个
    ├── MatchingItem (l2) - 左侧第2个
    ├── MatchingItem (l3) - 左侧第3个
    ├── MatchingItem (r1) - 右侧第1个
    ├── MatchingItem (r2) - 右侧第2个
    └── MatchingItem (r3) - 右侧第3个
```

**说明**：
- MatchBox 是中间层容器，类型为普通 Box，用于组织所有连线项
- MatchBox 的 name 会被 MatchingGame 引用为 `boxItemsName`，导出 .scene 时使用
- 默认创建 direction=0（左右连线），mode=3（可点可滑）
- 共8个元素：1个 MatchingGame + 1个 MatchBox + 6个 MatchingItem

---

## 默认配置

### MatchingGame 默认属性

- 位置：x=0, y=0
- 尺寸：width=1920, height=1080
- direction: 0（左右连线）
- mode: 3（可点可滑）
- single: 0（是，单线模式）
- lineSkin: 空（用户未传不导出）
- wrongLineskin: 空（用户未传不导出，注意小写s）
- boxItemsName: MatchBox 的 name（创建时同步）

### MatchBox 默认属性

- 类型：Box
- 位置：x=0, y=0（相对于 MatchingGame）
- 尺寸：width=1920, height=1080
- 父节点：MatchingGame

### MatchingItem 默认配置（direction=0）

| 项 | name | x | y | camp | connectableCamps | _itemImage |
|----|------|---|---|------|------------------|-----------|
| 前3个 | l1 | 750 | 450 | camp1 | camp2 | 空 |
|      | l2 | 750 | 540 | camp1 | camp2 | 空 |
|      | l3 | 750 | 630 | camp1 | camp2 | 空 |
| 后3个 | r1 | 1130 | 450 | camp2 | camp1 | 空 |
|      | r2 | 1130 | 540 | camp2 | camp1 | 空 |
|      | r3 | 1130 | 630 | camp2 | camp1 | 空 |

- 所有项的 `rightItemNames` 默认为空字符串（用户后续填写正确匹配）
- 所有项的 `_itemImage` 默认为空（用户后续上传图片）
- 所有项的父节点为 MatchBox
- 用户上传 `_itemImage` 后，MatchingItem 的 width/height 自动调整为图片实际尺寸

---

## 属性面板配置

### MatchingGame 暴露的属性

需要在 `elementMeta.ts` 的 MatchingGame 定义中调整 properties 数组：

| 属性 key | 标签 | 类型 | 默认值 | 备注 |
|---------|------|------|-------|------|
| direction | 连线方向 | select | 0 | 选项：左右(0)/上下(1)/中心点(2) |
| mode | 连线模式 | select | 3 | 选项：点击(1)/滑动(2)/可点可滑(3)，**hover 提示** |
| lineSkin | 连线皮肤 | file | 空 | 用户上传，未传不导出 |
| wrongLineskin | 连线错误提示皮肤 | file | 空 | 用户上传，未传不导出，**注意小写s** |
| single | 是否单线模式 | select | 0 | 选项：是(0)/否(1)，导出值与显示值一致 |

### MatchingItem 暴露的属性

| 属性 key | 标签 | 类型 | 默认值 | 备注 |
|---------|------|------|-------|------|
| camp | 阵营 | text | camp1/camp2 | 创建时自动设置 |
| connectableCamps | 可连阵营 | text | camp2/camp1 | 创建时自动设置 |
| rightItemNames | 正确连接 | text | 空 | 用户填写 |
| _itemImage | 图片 | file | 空 | **编辑器专用**，上传后自动调整 MatchingItem 宽高为图片尺寸 |
| filterColor | 滤镜颜色 | color | #ffff00 | 已有，保留 |

### "连线模式" hover 提示

属性面板渲染 `mode` 字段的标签时，需要支持 `tooltip` 显示：
- 提示文案: `"1为点击连线，2为鼠标滑动连线，3为可点可滑"`
- 实现方式：在 `PropertyDef` 接口添加可选的 `tooltip?: string` 字段，PropertyPanel 渲染 label 时透传到 `title` 属性（项目已用 `title` 实现 tooltip）

---

## direction 切换规则

用户在属性面板修改 MatchingGame 的 `direction` 属性时，系统自动更新所有 MatchingItem 子项的位置和命名。

### direction=0（左右连线）

**前3个项（左侧，camp1）**:
- 位置: x=750, y=450/540/630
- 命名: l1, l2, l3
- camp='camp1', connectableCamps='camp2'

**后3个项（右侧，camp2）**:
- 位置: x=1130, y=450/540/630
- 命名: r1, r2, r3
- camp='camp2', connectableCamps='camp1'

### direction=1（上下连线）

**前3个项（上侧，camp1）**:
- 位置: x=860/960/1060, y=300
- 命名: t1, t2, t3
- camp='camp1', connectableCamps='camp2'

**后3个项（下侧，camp2）**:
- 位置: x=860/960/1060, y=780
- 命名: b1, b2, b3
- camp='camp2', connectableCamps='camp1'

### direction=2（中心点连线）

**前3个项（左侧，camp1）**:
- 位置: x=750, y=450/540/630（与左右连线相同）
- 命名: item1, item3, item5
- camp='camp1', connectableCamps='camp2'

**后3个项（右侧，camp2）**:
- 位置: x=1130, y=450/540/630（与左右连线相同）
- 命名: item2, item4, item6
- camp='camp2', connectableCamps='camp1'

**特点**: 中心点连线的布局与左右连线相同，但命名规则不同（单数在左，双数在右），语义上所有item都可以与中心点连线。

---

## 实现要点

### 1. 元素定义更新（elementMeta.ts）

**MatchingItem 添加 `_itemImage` 属性**：

在 MatchingItem 的 properties 数组中添加：
```typescript
{ key: '_itemImage', label: '图片', type: 'file', group: '外观' }
```

**处理逻辑**：
- `_` 前缀标记这是编辑器专用字段，不会导出到 .scene 的 props
- 用户上传图片后，PropertyPanel 需要：
  1. 更新 `_itemImage` 属性值为图片路径
  2. 读取图片实际宽高
  3. 自动更新 MatchingItem 的 width/height 为图片实际尺寸
  4. 触发画布重绘，显示图片

### 2. 工具栏按钮（ElementToolbar.tsx）

**位置**: "豌豆口才"分类下，紧跟"填空题"按钮之后

**功能**: 添加 `handleAddMatching` 函数，实现以下逻辑：

1. 创建 MatchingGame 容器（x=0, y=0, 1920x1080, direction=0, mode=3, single=0）
2. 创建 MatchBox 中间层（Box类型，x=0, y=0, 1920x1080，父节点为 MatchingGame）
3. 设置 MatchingGame 的 `boxItemsName` 为 MatchBox 的 name
4. 创建 6 个 MatchingItem 子项：
   - 父节点设为 MatchBox
   - 按照 direction=0 的默认配置设置位置、命名和属性
   - `_itemImage` 默认为空
5. 依次创建 Laya 对象并注册到运行时
6. 将 8 个元素添加到 editorStore
7. 默认选中 MatchingGame 容器

**参考实现**: 选择题的 `handleAddChoice` 函数

### 3. 属性面板 direction 切换（PropertyPanel.tsx）

**触发条件**: 检测到 `element.type === 'MatchingGame' && changedKey === 'direction'`

**处理逻辑**:

1. 获取当前 MatchingGame 的 MatchBox 子节点
2. 通过 MatchBox.id 找到所有 MatchingItem 子项
3. 按照子项在数组中的顺序（前3个、后3个）
4. 根据新的 direction 值，查表得到每个子项的新位置和新命名
5. 批量更新所有子项的以下属性：
   - `name`: 新命名
   - `x`, `y`: 新位置
   - `camp`, `connectableCamps` 保持不变（始终是 camp1/camp2）
6. 调用 store 的批量更新方法一次性提交

**边界处理**:
- 如果子项数量不是6个，按现有数量依次应用规则（支持用户手动添加/删除子项）
- 只更新 MatchingItem 类型的子项，忽略其他类型

### 4. PropertyDef tooltip 支持

**修改 `src/elements/elementMeta.ts`**：

```typescript
export interface PropertyDef {
  // ... 已有字段
  /** 鼠标悬停时显示的提示文案 */
  tooltip?: string;
}
```

**修改 `src/components/PropertyPanel.tsx`**：

在渲染属性 label 时，如果 PropertyDef 有 tooltip，则在 label 元素上添加 `title={prop.tooltip}` 属性。

### 5. MatchingItem _itemImage 图片上传处理（PropertyPanel.tsx）

**触发条件**: 检测到 `element.type === 'MatchingItem' && changedKey === '_itemImage'`

**处理逻辑**:

1. 用户上传图片后，`_itemImage` 属性更新为图片路径
2. 读取图片实际宽高（通过 Image 对象加载）
3. 自动更新当前 MatchingItem 的 width 和 height 为图片实际尺寸
4. 触发画布重绘，MatchingItem 在画布上显示上传的图片

**画布渲染**:
- MatchingItem 如果有 `_itemImage`，在画布上用 Laya.Image 显示该图片
- 如果没有 `_itemImage`，显示占位符或默认样式

### 6. 导出条件控制（exportProject.ts）

`lineSkin` 和 `wrongLineskin` 是可选导出字段：
- 用户上传了（值非空字符串）→ 导出该字段
- 用户没传（值为空或 undefined）→ 不导出该字段
- **注意**：字段名是 `wrongLineskin`（小写 s），不是 `wrongLineSkin`

`boxItemsName` 在导出时：
- 从 MatchingGame 的 props 读取（创建时已同步为 MatchBox.name）
- 始终导出

`mode` 在导出时：
- 默认值为 3，始终导出

`single` 在导出时：
- 默认值为 0（是，单线模式），始终导出
- 选"是"→ 导出 `"single": 0`，选"否"→ 导出 `"single": 1`

`direction` 在导出时：
- 默认值为 0（左右连线），始终导出
- 左右连线 → 0，上下连线 → 1，中心点连线 → 2

**MatchingItem 的 `_itemImage` 导出处理**：
- `_itemImage` 是编辑器专用字段，**不导出到 MatchingItem 的 props**
- 如果 `_itemImage` 非空，在导出的 MatchingItem 节点下自动生成一个 Image 子节点：
  ```json
  {
    "type": "Image",
    "props": {
      "skin": "<_itemImage的值>"
    }
  }
  ```
- 如果 `_itemImage` 为空，不生成 Image 子节点
- 参考 GameLX2.scene 的实际结构（每个 MatchingItem 下有一个 Image 子节点）

### 7. 国际化（src/i18n/translations.ts）

添加以下翻译条目：

```typescript
'连线题': { 'zh-CN': '连线题', 'en': 'Matching Game' }
```

---

## 技术细节

### Laya 对象创建顺序

```typescript
// 1. 创建并注册 MatchingGame
const gameObj = createLayaComponent(matchingGame);
if (gameObj) registerObject(matchingGame.id, gameObj);

// 2. 创建并注册 MatchBox（父节点为 gameObj）
const boxObj = createLayaComponent(matchBox, gameObj);
if (boxObj) registerObject(matchBox.id, boxObj);

// 3. 依次创建并注册 6 个 MatchingItem（父节点为 boxObj）
items.forEach(item => {
  const itemObj = createLayaComponent(item, boxObj);
  if (itemObj) registerObject(item.id, itemObj);
});
```

### 批量更新子项

```typescript
// 伪代码示例
const matchBox = allElements.find(el => el.parentId === matchingGame.id && el.type === 'Box');
const items = allElements.filter(el => el.parentId === matchBox.id && el.type === 'MatchingItem');
const updates = items.map((item, index) => ({
  id: item.id,
  name: getNewName(direction, index),
  x: getNewX(direction, index),
  y: getNewY(direction, index),
}));
batchUpdateElements(updates);
```

---

## 测试要点

1. **创建功能**
   - 点击"连线题"按钮后，画布上出现完整的 8 个元素
   - 元素列表显示正确的层级结构（MatchingGame > MatchBox > 6个MatchingItem）
   - 默认选中 MatchingGame 容器
   - 6 个 MatchingItem 的位置和命名符合 direction=0 的规则
   - MatchingGame 的 mode 默认为 3，boxItemsName 等于 MatchBox 的 name

2. **属性面板**
   - direction 字段下拉显示"左右/上下/中心点"三个选项
   - mode 字段下拉显示"点击/滑动/可点可滑"三个选项
   - mode 字段标签鼠标悬停时显示提示文案
   - single 字段下拉显示"是/否"两个选项，默认"是"
   - lineSkin / wrongLineskin 可正常上传图片
   - MatchingItem 的 _itemImage 可正常上传图片，上传后自动调整 MatchingItem 宽高为图片实际尺寸

3. **direction 切换**
   - 在属性面板将 direction 从 0 改为 1，所有子项位置和命名正确更新
   - 从 1 改为 2，位置和命名正确更新
   - 从 2 改回 0，能正确恢复到左右连线的布局

4. **手动调整兼容性**
   - 用户手动删除某个 MatchingItem 后，切换 direction 不会崩溃
   - 用户手动添加第7个 MatchingItem，切换 direction 只影响前6个
   - 用户手动修改 MatchingItem 的位置后，切换 direction 会覆盖手动位置

5. **导出验证**
   - 导出的 .scene 文件结构符合参考文件 GameLX2.scene 的格式
   - MatchingGame 的 runtime、direction、mode、boxItemsName、single 字段正确写入
   - lineSkin / wrongLineskin 仅在用户上传时才导出（注意 wrongLineskin 是小写 s）
   - MatchingItem 的 camp/connectableCamps/rightItemNames 属性正确导出
   - MatchingItem 的 _itemImage 不导出到 props
   - 如果 MatchingItem 有 _itemImage，导出时在其下自动生成 Image 子节点，skin 为 _itemImage 的值

---

## 未来扩展

- 支持自定义 MatchingItem 数量（当前固定6个）
- 实现导出 .ts 文件的自动判定逻辑
- 支持预览模式下测试连线交互
