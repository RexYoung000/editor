# 翻页组件改造：ContainerBox 替换 Image 切页

## 背景

当前翻页组件由 3 个元素组成：左按钮 + 右按钮 + PageTurnImage。PageTurnImage 存储一个 pages 图片数组，切换页面时更换 skin 属性显示不同图片。每页只能是一张静态图片，无法放置其他子元素。

改造目标：将中间的 PageTurnImage 替换为 PageTurnBox（管理中枢）+ 多个 ContainerBox（每页一个独立容器），切换页面时直接切换 ContainerBox 的 visible 属性。每页容器内可自由放置任意子元素。

## 数据模型变更

### PageTurnImage → PageTurnBox

- type 名改为 `PageTurnBox`，layaType 改为 `'Box'`
- 去掉 `skin` 属性和 `pages` 数组
- 保留 `pageTurnGroup`（关联同组所有 ContainerBox 和按钮）
- 保留 `currentPageIndex`（当前显示第几页，对应同 group 下 ContainerBox 的排列顺序）

PageTurnBox 的 props：
```
{ pageTurnGroup: string, currentPageIndex: number }
```

### ContainerBox 新增 pageTurnGroup

ContainerBox 的 defaultProps 新增可选字段 `pageTurnGroup`。属于翻页组的 ContainerBox 在导出时带 visible 切换逻辑。不在翻页组中的 ContainerBox 不受影响。

## 创建流程

点击"翻页组件"按钮时，创建 4 个元素：

1. `PageTurnLeftBtn` — 翻页左按钮（同现有）
2. `PageTurnRightBtn` — 翻页右按钮（同现有）
3. `PageTurnBox` — 翻页管理中枢（替代原 PageTurnImage，toolbarHidden=true）
4. `ContainerBox` — 第1页容器（visible=true，pageTurnGroup=groupId）

全部共享同一个 `pageTurnGroup`。选中 PageTurnBox 时显示页面管理面板。

## 管理面板（PageTurnPageList）

选中 PageTurnBox 时，属性面板显示 PageTurnPageList：

- 列出同 group 下所有 ContainerBox（按元素在 page.elements 中的顺序排列）
- "添加页面" → 创建新 ContainerBox，设置 pageTurnGroup=groupId，visible=false，加入当前 page.elements
- "删除页面" → 删除对应的 ContainerBox 元素及其子元素
- 点击缩略图 → switchPage：当前页 ContainerBox visible=false，目标页 visible=true，更新 PageTurnBox 的 currentPageIndex

缩略图显示：ContainerBox 无 skin，缩略图可显示占位图或编号。

## 导出逻辑变更

当前：PageTurnImage → 外层大 Box `_pageTurnBox`，内含多个 Image 子节点（每页一张图 skin）+ 左右按钮。

改为：PageTurnBox → 外层大 Box `_pageTurnBox`，内含同 group 下所有 ContainerBox（走标准 buildSceneNode 递归导出，带 visible 和 name=`_page0/_page1/...`）+ 左右按钮。

关键点：
- ContainerBox 内部的子元素按正常嵌套导出（layaType='Box'，走标准递归）
- 同 group 的 ContainerBox 作为 `_pageTurnBox` 的子节点
- 左右按钮仍作为 `_pageTurnBox` 的子节点（不变）
- PageTurnBox 本身不出现在导出树中（它是管理中枢）

exportProject.ts 和 exportPreviewProject.ts 两处导出逻辑都必须同步修改。

## Store 变更

- `switchPageTurnPage`：从切换 pages 数组中的 skin 改为切换同 group 下 ContainerBox 的 visible 属性 + 同步 Laya 节点 visible + 更新 PageTurnBox.currentPageIndex
- `addPageTurnPage`：从 push pages 数组改为创建新 ContainerBox 元素并加入 page.elements
- `removePageTurnPage`：从删除 pages 条目改为删除 ContainerBox 元素（及其子元素）
- `updatePageTurnImageSkin`：废弃（不再有 skin 切换）

## ElementMeta 变更

- `PageTurnImage` 条目改为 `PageTurnBox`：layaType='Box'，去掉 skin/pages 属性，新增 placeholderImage（编辑器中显示管理中枢的占位图）
- `ContainerBox` defaultProps 新增 `pageTurnGroup: ''`

## Canvas 渲染

ContainerBox 已有 placeholderImage，visible=false 时 Laya 节点应同步隐藏。需要确保 applyKlProps 在切换页时正确设置 Laya 节点的 visible 属性。