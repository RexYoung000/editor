# DragViewBox 拖拽题组件设计

日期：2026-05-16
范围：在豌豆口才课件编辑器中实现 DragViewBox（拖拽题），导出 .scene 与 LayaIDE 对齐。

## 背景

参考 `D:\project\v6\s8\s8_v6_72\Game1_LT\laya\pages\game_lt\Game3test.scene` 的真实工程结构，
DragViewBox 是 sdk_baiya 提供的拖拽题运行时容器，内部固定包含两个 Box（dropbox 与 dragbox），
分别盛放 DropObj（放置目标）与 DragObj（拖动对象）。

forge 当前只在 `elementMeta.ts` 中给 DragViewBox / DragObj / DropObj 留了占位条目，
属性极不完整、且分类在不可见的 `drag` 类目下，没有工具栏入口、没有联动创建逻辑、没有
属性面板增删功能、没有验证过的导出路径。

本设计补齐这套组件，使「豌豆口才」教师可以一键创建拖拽题、可视化调整 DragObj/DropObj
的位置与皮肤、编辑器导出的 .scene 与 LayaIDE 工程一致，可被 layaair2-cmd 正常构建。

## 目标产物（.scene 结构，与参考对齐）

```
KlView (1920x1080, runtime: view/game_lt/<scene>.ts)   ← 仅 KlView 有 runtime（场景控制器）
└─ DragViewBox (1920x1080)                              ← props 不含 runtime
   ├─ Box (name: dropbox, mouseThrough, 1920x1080)
   │   └─ DropObj (× N，默认 1)                         ← props 不含 runtime
   └─ Box (name: dragbox, mouseThrough, 1920x1080)
       └─ DragObj (× N，默认 1)                         ← props 不含 runtime
           └─ Image (skin)
```

DragViewBox / DragObj / DropObj 的 .scene 节点 `props` 中**不包含 runtime 字段**
（参考 Game3test.scene 已确认）。layaair2-cmd UI 解析器按 `type` 名直接定位到
`com.klzz.ui.custom.DragViewBox` 等运行时类。仅 KlView 顶层节点写入场景控制器
`runtime: view/game_lt/<scene>.ts`，由 forge 现有逻辑统一处理。

## 编辑器内的元素树

```
DragViewBox
├─ 放置                ← layaType=Box, name=dropbox
│   └─ DropObj         ← 默认 1 个，名 dj1
└─ 拖动                ← layaType=Box, name=dragbox
    └─ DragObj         ← 默认 1 个，名 a1
        └─ Image       ← DragObj 的皮肤
```

ElementList 显示规则为 `el.name || meta?.label || el.type`。
要求：列表中显示「放置」「拖动」（中文），但导出 .scene 时 `props.name` 必须为
`dropbox` / `dragbox`（运行时按 name 查找）。

**采用方案**：为 dropbox / dragbox 各引入一个 elementMeta 条目：
- `DragDropBox`（layaType: Box, label: 放置, toolbarHidden: true）
- `DragDragBox`（layaType: Box, label: 拖动, toolbarHidden: true）

创建时 `el.name` 留空 → ElementList fallback 到 `meta.label` → 显示「放置/拖动」。
两条 meta 的 `defaultProps` 都设置 `name: 'dropbox'` 与 `name: 'dragbox'`。
导出 `buildSceneNode` 已有逻辑：`element.name` 为空时，会从 merged props 写入
`props.name`（来自 defaultProps）。无需在 buildSceneNode 中加特例分支。

## 工具栏入口

「豌豆口才」tab 下新增按钮「拖拽题」，参考已有的「选择题」按钮 (`handleAddChoice`)。
点击后一次性创建并 `addElement`：

| 元素 | x | y | width | height | 备注 |
|------|---|---|-------|--------|------|
| DragViewBox | 0 | 0 | 1920 | 1080 | 顶层 |
| DragDropBox（放置） | 0 | 0 | 1920 | 1080 | parent=DragViewBox |
| DropObj（dj1） | 606 | 445 | 258 | 187 | parent=放置；name=dj1，var=dj1 |
| DragDragBox（拖动） | 0 | 0 | 1920 | 1080 | parent=DragViewBox |
| DragObj（a1） | 606 | 734 | 258 | 187 | parent=拖动；name=a1，var=a1 |
| Image | 7.5 | 6 | 243 | 175 | parent=DragObj；skin=''（用户后填） |

创建顺序：先创建所有 elements，最后 `selectElement(dragViewBox.id)`。

## 严格锁定

- DragDropBox / DragDragBox 节点 `locked: true`（不可删除、不可拖出 DragViewBox）。
- ElementList 的拖拽白名单（CONTAINER_TYPES）保持不变；新增类型 `DragDropBox` /
  `DragDragBox` 加入 CONTAINER_TYPES，使其他容器（DragObj 例外）不能被拖入。
- DragObj 只能放在 DragDragBox（dragbox）下；DropObj 只能放在 DragDropBox（dropbox）
  下。在 ElementList 的 reparent 逻辑中加入这两条目标类型校验。

## 属性面板（src/components/PropertyPanel.tsx）

DragViewBox 选中时，仿 ChoiceBox 的「选项管理」section，新增「拖拽组件管理」section：

- **放置组件**：`+`（addDropObj） `−`（removeDropObj），最少 1 个。
- **拖动组件**：`+`（addDragObj） `−`（removeDragObj），最少 1 个。

命名规则：DropObj `dj{n}`，DragObj `a{n}`，n 从 1 起按已有最大值 +1。
新建的 DropObj/DragObj 位置：参考最后一个的位置，x +267（与参考 .scene 中三个
对象的 x 间距 ~340 一致，可调整）；超出 1920 则换到 y+250 行首。
新建 DragObj 时同时创建一个空 skin Image 作为子元素。

## 元数据修订（src/elements/elementMeta.ts）

修改/新增以下条目：

```ts
DragViewBox: {
  layaType: 'DragViewBox',
  label: '拖拽容器',
  category: 'speechCourse',     // 从 drag 改为 speechCourse
  toolbarHidden: true,           // 由「拖拽题」按钮统一创建
  defaultSize: { width: 1920, height: 1080 },
  defaultPosition: { x: 0, y: 0 },
  // 注意：不设 runtime —— 参考 .scene 中 DragViewBox/DragObj/DropObj
  // 的 props 都不包含 runtime 字段；layaair2-cmd UI 解析器按 type 名直接
  // 解析为 com.klzz.ui.custom.DragViewBox。即使设了 runtime，也会被
  // exportPreviewProject.ts 的 rewriteProps/buildSceneNode 强制 strip。
  defaultProps: {
    mode: 1, successPosMode: 0,
    dropNotice: 'true', clickPlace: 'false',
    changePos: 'true', backToInitPos: 'true',
    backAni: 'true', autoSorting: 'true',
  },
  properties: [
    { key: 'mode', label: '放置模式', type: 'select', group: '交互',
      options: [
        { label: '鼠标位', value: 0 }, { label: '放置位', value: 1 },
        { label: '自定义', value: 2 }, { label: '自动排列', value: 3 },
      ] },
    { key: 'successPosMode', label: '成功位模式', type: 'number', group: '交互' },
    { key: 'dropNotice', label: '放置提示', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'clickPlace', label: '点击放置', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'changePos', label: '改变位置', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'backToInitPos', label: '失败返回', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'backAni', label: '返回动画', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'autoSorting', label: '自动排序', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
  ],
},

DragDropBox: {
  layaType: 'Box',
  label: '放置',
  category: 'speechCourse',
  toolbarHidden: true,
  defaultSize: { width: 1920, height: 1080 },
  defaultProps: { mouseThrough: true, name: 'dropbox' },
  properties: [],
},
DragDragBox: {
  layaType: 'Box',
  label: '拖动',
  category: 'speechCourse',
  toolbarHidden: true,
  defaultSize: { width: 1920, height: 1080 },
  defaultProps: { mouseThrough: true, name: 'dragbox' },
  properties: [],
},

DragObj: {
  layaType: 'DragObj',
  label: '拖拽对象',
  category: 'speechCourse',
  toolbarHidden: true,
  defaultSize: { width: 258, height: 187 },
  // 不设 runtime（同 DragViewBox 说明）
  varFromName: true,
  defaultProps: {
    hasDrop: 'false', group: '-1',
    filterColor: '#ffff00', filterBlur: 6,
    canSelect: 'false',
  },
  properties: [
    { key: 'rightDropObjName', label: '正确目标', type: 'elementRef',
      group: '交互', elementFilter: ['DropObj'] },
    { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互' },
    { key: 'group', label: '分组', type: 'text', group: '交互' },
    { key: 'hasDrop', label: '已放置', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'canSelect', label: '可选中', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'canOverlayDrop', label: '可重叠', type: 'boolean', group: '交互' },
    { key: 'isMoveEvent', label: '可移动', type: 'boolean', group: '交互' },
    { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观' },
    { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观' },
    { key: 'pivotX', label: '轴心X', type: 'number', group: '外观' },
    { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观' },
  ],
},

DropObj: {
  layaType: 'DropObj',
  label: '放置区域',
  category: 'speechCourse',
  toolbarHidden: true,
  defaultSize: { width: 258, height: 187 },
  // 不设 runtime（同 DragViewBox 说明）
  varFromName: true,
  defaultProps: {
    hasDrop: 'false', group: '-1',
    isNeedTip: false,
    noticeColor: '#ff0000', noticeBlur: 4,
  },
  properties: [
    { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互' },
    { key: 'group', label: '分组', type: 'text', group: '交互' },
    { key: 'hasDrop', label: '已放置', type: 'select', group: '交互',
      options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] },
    { key: 'isNeedTip', label: '显示提示', type: 'boolean', group: '交互' },
    { key: 'showNotice', label: '提示边框', type: 'boolean', group: '外观' },
    { key: 'noticeColor', label: '提示颜色', type: 'color', group: '外观' },
    { key: 'noticeBlur', label: '提示模糊', type: 'number', min: 0, max: 20, group: '外观' },
    { key: 'pivotX', label: '轴心X', type: 'number', group: '外观' },
    { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观' },
  ],
},
```

注意：现有 `drag` 分类下的 DragView/DragObj/DropObj/DragViewBox 旧条目，
DragView 是另一个组件（runtime 不同），保留不动；DragObj/DropObj/DragViewBox
按上表替换。

## Store actions（src/store/editorStore.ts）

新增四个 action：

- `addDropObj(dragViewBoxId)`：找 DragDropBox 子节点（dropbox），在其下创建新 DropObj，name=dj{n+1}（n=已有最大值），位置参考最后一个 +x 偏移。
- `removeDropObj(dragViewBoxId)`：删除 dropbox 下最后一个 DropObj，最少保留 1 个。
- `addDragObj(dragViewBoxId)`：找 DragDragBox 子节点（dragbox），在其下创建新 DragObj，name=a{n+1}，位置参考最后一个 +x 偏移；并自动创建一个 Image 子节点 `parentId=newDragObj.id`，skin=''。
- `removeDragObj(dragViewBoxId)`：删除 dragbox 下最后一个 DragObj 及其所有子元素。

实现风格与 `addChoiceOption` / `removeChoiceOption` 完全一致（包括 `createLayaComponent` + `registerObject` 的副作用）。

## 导出对齐（src/utils/exportPreviewProject.ts）

`buildSceneNode` 已支持递归处理 `parentId`，DragViewBox/dropbox/dragbox/DragObj/DropObj/Image 全部按层级自然输出。需要确认/小改的几点：

1. **DragDropBox / DragDragBox 的 name**：
   两个条目的 `defaultProps.name` 已写为 `dropbox` / `dragbox`，`buildSceneNode`
   merged props 直接写出，无需新增分支。同时 `var` 通过现有逻辑（`!props.var && props.name` → `var = props.name`）自动得到。

2. **字符串布尔值**：
   DragViewBox/DragObj/DropObj 的部分字段（dropNotice、clickPlace、changePos、backToInitPos、backAni、autoSorting、hasDrop、canSelect）在 .scene 中以字符串 `"true"` / `"false"` 出现，与运行时类型期待一致。我们的 `defaultProps` 已直接写字符串，`buildSceneNode` 不会动它（不为 string→bool 转换）。验证导出后字段值仍是字符串。

3. **数字字段**：
   group 默认 `"-1"`、cusAttribute 默认数字字符串等均按用户输入直接写入。

4. **DragObj 子 Image**：
   走当前 `buildSceneNode` 递归。Image 的 `skin` 经 `rewriteProps` 走资源映射（uploads / data:image / 内置）。

5. **不引入 exportWrapper / exportChildren**：
   所有结构均由编辑器中真实的 element 树承载，导出时按层级写出。

6. **正课导出（exportProject.ts）**：
   该文件存在但本次只验证 preview 流程；正课 export pipeline 若使用同套 buildSceneNode 逻辑，应一并工作。本设计在执行阶段会 grep `exportProject.ts` 确认；如有差异，做对应修改。

## 资源/构建无新增

- 不引入新内置资源；DragObj 的子 Image 默认 skin 为空，用户上传图片即可。
- 不需要修改 `public/builtin/runtime/game/` 内容；不需要重新打 `game.zip`。
- layaair2-cmd / esbuild 编译流程不需要改动（已支持 DragViewBox / DragObj / DropObj 的运行时类）。

## 画布渲染（编辑模式）

- DragViewBox / DragDropBox / DragDragBox：透明 Box，仅在选中时显示选中边框（默认行为已支持）。
- DragObj / DropObj：因 elementMeta.runtime 在编辑模式下不创建真实 sdk_baiya 实例（`createLayaComponent` 已处理 fallback → Box），仅作为可选中容器存在。Image 子元素正常渲染图片。

## 校验方案

实现完成后的验证步骤：

1. 「豌豆口才」tab 下点击「拖拽题」按钮 → 画布出现完整结构，元素列表显示「DragViewBox / 放置（DropObj dj1）/ 拖动（DragObj a1 / Image）」。
2. 选中 DragViewBox → 属性面板显示「拖拽组件管理」section，能 +/− DropObj 与 DragObj。
3. DragObj 子 Image 上传任意图片 → 画布上正常显示。
4. 修改 DragObj 的 `rightDropObjName` → 下拉显示当前页所有 DropObj 名字。
5. 课件导出 → preview-server/Game1_LT/laya/pages/game_lt/Game{N}.scene 中
   DragViewBox 节点结构与字段与参考 Game3test.scene 对齐（人工 diff 检查）。
6. layaair2-cmd 构建工程 → 编译通过；浏览器打开 preview → DragViewBox 拖拽交互正常工作。

## 不在本期范围

- 不实现 DragView（旧版拖拽容器）的迁移；保留旧条目。
- 不实现作业模式（Game1_HW）特殊处理；当前导出按 preview/正课流程一致处理即可。
- 不实现 DragObj 多 Image 子元素的批量管理 UI；用户可手动复制 Image。
- 不实现 successPosMode 的可视化预览（成功位模式需要自定义放置点等）。
