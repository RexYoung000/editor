# 预习正课改造方案 Design Spec

Date: 2026-05-13

## Summary

在编辑器中增加"预习关卡"区域，将现有"课件关卡"改为"正课关卡"，两个区域独立折叠、独立管理。发布时预习关卡生成 Game1_PREVIEW 编辑器工程，正课关卡生成 Game1_LT 编辑器工程，最终合并为 xxx_LessonZK 编译输出。

## 1. Data Model

### Course 类型变更

```typescript
interface Course {
  // ...现有字段不变
  stages: Stage[];            // 正课关卡（原名不变，语义改为正课）
  previewStages: Stage[];     // 预习关卡，独立数组
  previewShrinked?: boolean;  // 预习区域折叠状态
  normalShrinked?: boolean;   // 正课区域折叠状态
}
```

### Preview Stage 约束

- `noSubPages: true` 始终为 true，只有单页面（SubPage）
- `subPages` 数组长度始终为 1（创建时自动带一个默认页面）
- 不允许添加/删除 subPages（UI 隐藏"添加小卡"按钮）
- Stage 类型本身不改——preview 和 normal 共用同一个 `Stage` 接口，通过在哪个数组里来区分语义，不加 `type` 字段

### 命名规则

- 预习关卡默认名：`预习 1`、`预习 2`、`预习 3`…
- 正课关卡默认名保持不变：`关卡 1`、`关卡 2`、`关卡 3`…
- 删除/重排后自动重新编号

## 2. Store Changes

### 参数化管理函数

```typescript
addStage(target: 'preview' | 'normal')
addStageFromSubPage(sourceSubPageId, target: 'preview' | 'normal')
addStageFromPreset(presetId, target: 'preview' | 'normal')
deleteStage(stageId, target: 'preview' | 'normal')
reorderStages(fromIndex, toIndex, target: 'preview' | 'normal')
renameStage(stageId, name, target: 'preview' | 'normal')
duplicateStage(stageId, target: 'preview' | 'normal')
```

### 折叠状态

```typescript
togglePreviewShrinked()
toggleNormalShrinked()
```

### 选择逻辑

```typescript
selectedStageTarget?: 'preview' | 'normal'  // 标识选中 stage 属于哪个数组
```

### 约束

- `addStage('preview')` 创建时强制 `noSubPages: true` + `subPages.length === 1`
- `deleteSubPage` / `addSubPage` 当 `selectedStageTarget === 'preview'` 时不可执行
- 拖拽排序只在同一数组内进行，不允许跨数组拖拽

## 3. UI Changes

### 关卡列表布局

两个可折叠区域纵向排列，预习在上正课在下：

- **预习区域**：标题 "预习关卡（x关）"，红色色调区分。点击标题栏折叠/展开。展开时显示预习关卡列表 + "添加大关卡"按钮。每个预习关卡不显示"添加小卡"按钮。
- **正课区域**：标题 "正课关卡（x关）"，蓝色色调区分（保持现有配色）。点击标题栏折叠/展开。展开时显示正课关卡列表 + "添加大关卡"按钮。每个正课关卡保留"添加小卡"按钮（视频关卡除外）。
- **折叠行为**：收缩后只显示标题栏+关卡数量，内容完全隐藏。
- **添加大关卡**：两个区域都使用 NewStageDialog（同样的预设模板、自定义模板选项）。
- **选中状态**：选中的关卡高亮，`selectedStageTarget` 标识属于哪个区域。

### 按钮 UI 约束

- 正课 `stages.length === 0` → "发布到工程"、"发布到本地"、"预览"三个按钮全部 disabled
- 预习 `previewStages.length === 0` → 正常可用，不影响按钮

## 4. Export/Publish Pipeline

### 4.1 发布到工程（exportProject）

| 条件 | 生成内容 |
|------|----------|
| stages > 0 且 previewStages > 0 | Game1_LT + Game1_PREVIEW 同目录 |
| stages > 0 且 previewStages = 0 | 只 Game1_LT |
| stages = 0 | 按钮禁用 |

Game1_PREVIEW 生成与 Game1_LT 镜像，关键差异：

| 项目 | Game1_LT | Game1_PREVIEW |
|------|----------|---------------|
| 模板 | Game1_LT.zip | Game1_PREVIEW.zip（需打包） |
| 资源目录 | game_lt/ | game_preview/ |
| 场景命名 | GameLT1, GameLX1_1 | Game1, Game2 |
| View 路径 | view/game_lt/ | view/game_preview/ |
| 页面命名 | fm, lt1, lx1_1 | 预习1, 预习2 |
| config mode | 无 mode 字段 | "mode": "preview" |
| 视频页面 | zj（总结） | yx（预习） |

### 4.2 发布到本地/预览（publishOnly）

输出结构参照 s9_v8_11after：

```
xxx_LessonZK/
├── config.json              # 正课 config（无 mode）
├── config_preview.json      # 预习 config（mode: "preview"，仅预习>0）
├── finalConfig.json         # 同 config.json
├── LessonZK.js              # 合正课+预习 view classes
├── fileconfig.json          # 两组 atlas 配置
├── version_<cid>.json
├── game_lt/                 # 正课资源
├── game_preview/            # 预习资源（仅预习>0）
└── res/atlas/
    ├── game_lt/             # 正课 atlas
    └── game_preview/        # 预习 atlas
```

合并策略：
- config.json pages 数组只含正课页面
- config_preview.json 单独存放预习页面（mode: "preview"）
- LessonZK.js 合入两套 view classes
- 资源各自放入对应目录，atlas 按目录独立打包
- 预习为 0 时，不生成 config_preview.json、game_preview/ 和相关 atlas

### 4.3 模板准备

- 需将 `public/builtin/layaProjectModel/Game1_PREVIEW/` 打包为 `Game1_PREVIEW.zip`，供 exportProject 下载解压

## References

- 参考目录 D:\1\ai\s9_v8_11before：期望生成的编辑器工程
- 参考目录 D:\1\ai\s9_v8_11befores9_v8_11after：期望生成的编译后工程
- 模板目录 D:\aiproject\forge\public\builtin\layaProjectModel\Game1_PREVIEW
- 改造需求文档 D:\aiproject\forge文档\预习正课改造方案.md