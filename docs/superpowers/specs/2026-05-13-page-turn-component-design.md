# 翻页组件设计文档

日期：2026-05-13

## 概述

在组件栏添加新分类"口才课组件"，并在该分类下添加"翻页组件"。翻页组件由三个可独立拖拽的子元素组成：左翻页按钮、右翻页按钮、翻页图片区。纯编辑器组件，导出为 Box 容器包住子节点，运行时翻页逻辑由课件开发者自行处理。

## 方案选择

**方案 A（选定）：三个独立元素 + 组合创建**

- 工具栏"翻页组件"按钮一次性创建 3 个独立 forge 元素
- 每个元素自然支持画布独立拖拽（复用现有机制）
- 三个元素通过 `pageTurnGroup` 属性关联
- 导出时检测同一 group 的元素，包裹为 Box 容器输出

## 设计详情

### 1. 分类与元素模型

**新分类**：

```ts
{ id: 'speechCourse', label: '口才课组件' }
```

**三个 elementMeta 条目**：

| 元素 | layaType | label | defaultSize | placeholderImage |
|---|---|---|---|---|
| PageTurnLeftBtn | ScaleButton | 翻页左按钮 | 121x122 | pageTurn.btnLeft |
| PageTurnRightBtn | ScaleButton | 翻页右按钮 | 121x122 | pageTurn.btnRight |
| PageTurnImage | Image | 翻页图片 | 200x200 | pageTurn.placeholder |

PageTurnLeftBtn / PageTurnRightBtn：
- `layaType: 'ScaleButton'`，带 `placeholderImage`，编辑模式用 Image 占位，导出为 ScaleButton
- `defaultProps`: `{ skin: assetExport('pageTurn.btnLeft/btnRight'), stateNum: 1, label: '', pageTurnGroup: '' }`
- `properties`: skin（按钮图片）、pageTurnGroup（翻页组 ID）

PageTurnImage：
- `layaType: 'Image'`，带 `placeholderImage`
- `defaultProps`: `{ skin: '', pageTurnGroup: '', currentPageIndex: 0, pages: [] }`
- `properties`: skin（当前页图片）、pageTurnGroup（翻页组 ID）
- `pages` 和 `currentPageIndex` 是复杂属性，由自定义属性面板管理，不在 PropertyDef 列表中

**内置资源**（需复制到 public/builtin/ 并注册到 builtinAssets）：

| id | src | exportPath |
|---|---|---|
| pageTurn.btnLeft | runtime/game/pageTurn/btn_return_new.png | game/pageTurn/btn_return_new.png |
| pageTurn.btnRight | runtime/game/pageTurn/btn_you.png | game/pageTurn/btn_you.png |
| pageTurn.placeholder | editor/page-turn-placeholder.png | — (仅编辑器) |

按钮图片源：`C:\Users\wwjie\Desktop\3D通用按钮切图\按钮切图\btn_return_new.png` 和 `btn_you.png`

### 2. 创建流程

点击工具栏"翻页组件"按钮时（参考 NewInput + KlBaseKeyboard 组合创建模式）：

1. 生成组 ID：`ptg_${Date.now()}_${random}`
2. 批量创建 3 个元素：
   - PageTurnLeftBtn：位置约 (800, 500)，pageTurnGroup = groupId
   - PageTurnRightBtn：位置约 (1000, 500)，pageTurnGroup = groupId
   - PageTurnImage：位置约 (900, 400)，pageTurnGroup = groupId，currentPageIndex = 0，pages = [{src:'', x:900, y:400, width:200, height:200}]
3. 工具栏只显示一个"翻页组件"按钮，不显示三个单独按钮
4. 创建后自动选中 PageTurnImage（主元素）

### 3. PageTurnImage 行为逻辑

**状态模型**（存储在 Element.props）：

```ts
pages: Array<{ src: string; x: number; y: number; width: number; height: number }>
currentPageIndex: number
```

**核心行为**：

1. **画布拖拽同步位置**：PageTurnImage 拖动后，新位置自动保存到 `pages[currentPageIndex].x/y`

2. **切换页面**：
   - 先将当前 Element.x/y 写入 `pages[currentPageIndex].x/y`
   - 将 Element.x/y 更新为 `pages[newIndex].x/y`
   - 将 Element.props.skin 更新为 `pages[newIndex].src`
   - 更新 currentPageIndex
   - 画布节点同步移动到新位置并显示新图片

3. **上传图片**：保留原图尺寸（复用 FileField 自动 resize 逻辑），初始位置居中于 1920x1080 画布（x=960-width/2, y=540-height/2）

4. **添加页面**：新增 `{src:'', x:当前Element.x, y:当前Element.y, width:200, height:200}` 到 pages 数组

5. **删除页面**：从 pages 移除条目，若删除当前页则切换到相邻页

### 4. 属性面板

**PageTurnImage 自定义属性面板**（参考 NewTabImg/ConfirmButton 自定义模式）：

- **标准属性区域**：当前页图片（skin）、翻页组 ID（pageTurnGroup）
- **自定义"页面管理"区域**：
  - 可滚动的页面缩略图列表（有图片显示缩略图，无图片显示空白占位）
  - 当前页高亮标记
  - 点击缩略图 → 切换页面
  - "添加页面"按钮
  - "删除页面"按钮
- 当前页图片可通过 FileField 上传替换

**PageTurnLeftBtn / PageTurnRightBtn**：
- 标准属性：按钮图片（skin）、翻页组 ID（pageTurnGroup）
- 可替换按钮图片

### 5. 导出管线

**导出结构**（LessonZK.js）：

```
Box (x:0, y:0, width:1920, height:1080, mouseThrough:true)
  ├── Image (page0, skin:pages[0].src, x:pages[0].x, y:pages[0].y, visible:true)
  ├── Image (page1, skin:pages[1].src, x:pages[1].x, y:pages[1].y, visible:false)
  └── ...
  ├── ScaleButton (左按钮, skin:..., x:左按钮.x, y:左按钮.y, label:'', stateNum:1)
  └── ScaleButton (右按钮, skin:..., x:右按钮.x, y:右按钮.y, label:'', stateNum:1)
```

- 图片页在底层，按钮在最上层（Laya 子节点渲染顺序：后面的在上）

**导出逻辑**：

1. 遍历课程元素时，PageTurnLeftBtn 和 PageTurnRightBtn 跳过正常导出
2. 导出 PageTurnImage 时：
   - 查找同 pageTurnGroup 的左/右按钮元素
   - 生成 Box 容器节点（1920x1080, mouseThrough:true）
   - 添加 pages 数组中的 Image 子节点（仅 currentPageIndex 对应页 visible:true）
   - 在最上层添加左/右 ScaleButton 子节点
3. 资源收集：pages 中的图片 src 按现有逻辑处理

## 实现要点

- 复用现有 ConfirmButton 的 placeholderImage + ScaleButton layaType 模式
- 复用 NewInput + KlBaseKeyboard 的组合创建模式
- PageTurnImage 的 pages 状态通过自定义 React 属性面板组件管理
- 画布拖拽位置同步需要监听 element position 变更并写入 pages
- 导出管线需要自定义分组逻辑：检测 pageTurnGroup，跳过按钮元素，由 PageTurnImage 统一导出