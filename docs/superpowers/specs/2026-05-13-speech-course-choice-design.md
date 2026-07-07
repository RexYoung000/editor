# 口才课选择题组件设计文档

日期：2026-05-13

## 概述

在口才课组件分类下添加"选择题"按钮，点击后一键创建 ChoiceBox + 4个 SelectableObj 选项卡片。口才课选择题与现有通用 ChoiceBox 功能完全一致（点击选中+判断对错），区别在于拥有专属的卡片式皮肤和布局。

## 方案选择

选定方案：新组件入口（一键创建），在口才课分类下添加一个"选择题"按钮，点击后自动创建 ChoiceBox + SelectableObj 子节点。复用翻页组件的组合创建模式。

## 设计详情

### 1. 创建流程

点击工具栏"选择题"按钮时（类似翻页组件的组合创建模式）：

1. 创建 1 个 ChoiceBox 容器：`upperLimit: 1`（单选），`rightItemNames: ''`（用户后续填写），defaultSize 约 900x700
2. 创建 4 个 SelectableObj 选项卡片：
   - name 分别为 a/b/c/d
   - parentId 指向 ChoiceBox（作为子节点）
   - defaultSize 约 400x300
   - 带 placeholderImage 显示卡片式占位图
3. 自动选中 ChoiceBox

### 2. 选项布局

默认 4 个选项以 2x2 网格排列：
- 选项 a: 左上 (~50, ~50)
- 选项 b: 右上 (~470, ~50)
- 选项 c: 左下 (~50, ~360)
- 选项 d: 右下 (~470, ~360)

ChoiceBox 容器约 900x700，选项卡片约 400x300。

### 3. 选项皮肤结构

每个 SelectableObj 有 2 个 Image 子节点（通过 exportChildren 注入）：
- `name: "bg"` — 卡片背景图（带边框/发光效果的 Image）
- 无名 Image — 卡片前景图（内容图片）

选中效果：通过 `filterColor` + `filterBlur`（黄色发光）实现，不使用单独的选中皮肤图片。

编辑模式：每个 SelectableObj 用 placeholderImage 显示占位图，导出时真实 SelectableObj 运行时类实例化。

### 4. 属性面板

**ChoiceBox 属性**（跟现有一致）：
- `rightItemNames`（正确答案，如"a"或"a,b"）
- `upperLimit`（最多选几个）
- `requireSel`（必须选择）
- "添加选项"按钮 — 动态新增 SelectableObj 子节点，name 自动递增（e/f/g...）
- "删除选项"按钮 — 删除最后一个子节点

**SelectableObj 属性**：
- 前景图片（skin）、背景图片（bg skin）
- `name`（选项标识 a/b/c/d...）
- `filterColor`、`filterBlur`（选中效果）
- `cus1`、`cus2`（自定义属性）

### 5. 导出与运行时

完全复用现有 ChoiceBox + SelectableObj 的导出逻辑和运行时类，不需要新的 runtime 或特殊导出处理。

导出结构：
```
ChoiceBox (upperLimit:1, rightItemNames:"a", runtime:"com.klzz.ui.custom.ChoiceBox")
  ├── SelectableObj (name:"a", filterColor, filterBlur)
  │   ├── Image (前景图)
  │   └── Image (bg, 背景图)
  ├── SelectableObj (name:"b")
  │   ├── Image (前景图)
  │   ├── Image (bg, 背景图)
  ├── SelectableObj (name:"c")
  │   ├── Image (前景图)
  │   ├── Image (bg, 背景图)
  └── SelectableObj (name:"d")
  │   ├── Image (前景图)
  │   ├── Image (bg, 背景图)
```

选中效果通过 filterColor+filterBlur 实现，运行时逻辑由 ChoiceBox/SelectableObj 自身处理。

## 实现要点

- 工具栏只显示"选择题"按钮，ChoiceBox 和 SelectableObj 的通用版本仍在原分类中可用
- SelectableObj 需要在 elementMeta 中增加口才课版本的条目（带 placeholderImage + toolbarHidden）
- 一键创建时 SelectableObj 的 parentId 设为 ChoiceBox 的 id，让它们成为子节点
- 选项增减功能需要自定义属性面板（类似翻页组件的 PageTurnPageList）
- placeholderImage 需要创建专属的卡片占位图资源