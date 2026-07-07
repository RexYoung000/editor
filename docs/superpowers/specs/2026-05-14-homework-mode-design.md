# 作业模式设计文档

日期: 2026-05-14

## 概述

在 forge 编辑器中新增"作业"课件类型。用户在新建工程时选择"作业"，进入简化版编辑器（无预习/正课分组、无小关卡操作），发布时生成 `Game1_HW` 编辑器工程和 `_LessonHW` 编译产物。

## 决策记录

| 问题 | 决策 |
|------|------|
| 课件类型标识 | Course 加 `kind?: 'normal' \| 'homework'`，缺省 = normal |
| 数据结构 | 复用 `Course.stages`，作业关卡 = 单 subPage 的 Stage |
| PageList 行为 | 隐藏添加小关卡按钮 + 小关卡行无操作按钮 |
| 大关卡创建 | 只能空白创建（不弹 NewStageDialog） |
| 大关卡操作 | 复制/删除/拖拽排序/双击重命名保留 |
| 课件 ID 校验 | 强制 `_hw` 后缀 |
| 预览 URL | 复用正课结构，GameLoader 按 `_hw` 后缀自动识别 |
| 旧课件兼容 | 严格按 `kind` 字段，不做后缀推断 |
| 上传接口 | 复用 `/api/upload-resource`，多传 `kind` 字段 |
| 代码组织 | 在现有函数加 `if homework` 分支（方案 2） |

## 数据模型

```ts
// src/types/index.ts
export interface Course {
  id: string;
  kind?: 'normal' | 'homework';  // 缺省 = 'normal'
  stages: Stage[];
  previewStages?: Stage[];
  // ...其余不变
}
```

作业模式下：
- `stages` = 作业关卡列表，每个 Stage 只有 1 个 SubPage
- `previewStages` 始终为空/不使用

## CreateProjectDialog 改造

1. 新增单选组："预习/正课" | "作业"（默认"预习/正课"）
2. 选"作业"时 placeholder 改为 `s8_v8_01_hw`
3. 提交校验：选"作业"时 ID 必须以 `_hw` 结尾
4. `onConfirm` 回调签名：`onConfirm(courseId, dirPath, kind)`

## PageList 作业模式

判断条件：`currentCourse?.kind === 'homework'`

| 功能 | 正课模式 | 作业模式 |
|------|---------|---------|
| 预习区域 | 显示 | 隐藏 |
| 正课区域 header | "正课关卡(x关)" | "作业关卡(x关)" |
| 添加大关卡按钮 | 弹 NewStageDialog | 直接创建空白关卡 |
| 小关卡列表行 | 显示，带缩略图 + 操作按钮 | 显示缩略图，无操作按钮 |
| 添加小关卡按钮 | 显示 | 隐藏 |
| 大关卡操作 | 复制/删除/拖拽排序/双击重命名 | 同正课 |

## Toolbar 发布/预览行为

- **发布工程**：调 `exportProject` + `publishOnly`，内部按 `kind` 分流
- **发布到本地**：同上
- **预览**：作业模式直接打开 URL（不弹预习/正课选择框）
- **预览 URL**：`?course=test_{tid}_{cid}&type=1&ct=1&rl=dev&sdk=full`（与正课结构相同）

## 导出流程 — publishOnly（编译产物）

作业模式 `if (course.kind === 'homework')`：

| 项目 | 正课 | 作业 |
|------|------|------|
| config.json 格式 | `generateFinalConfig` | `generateHomeworkConfig` |
| JS 文件名 | `LessonZK.js` | `LessonHW.js` |
| 资源前缀 | `game/image/...` | `game_hw/image/...` |
| view 路径 | `view/game/Page{si}_{sj}.ts` | `view/game_hw/Game{si+1}.ts` |
| atlas 路径 | `res/atlas/game/image/...` | `res/atlas/game_hw/image/...` |
| previewConfig | 有预习时生成 | 不生成 |
| 目录后缀 | `_LessonZK` | `_LessonHW` |

### generateHomeworkConfig 输出格式

```json
{
  "pages": [
    {
      "name": "game1",
      "view": "view/game_hw/Game1.ts",
      "param": { "soundpath": "", "question": "" },
      "res": [...],
      "classType": ""
    }
  ],
  "release": "dev",
  "newEva": 1,
  "classify": "homeworkOnline",
  "isSound": false
}
```

### generateLessonHwJs

与 `generateLessonJs` 类似，但：
- 类注册到 `ui.game_hw` 命名空间
- view 路径 `view/game_hw/Game{si+1}.ts`
- 每个 stage 只有 1 个 subPage

## 导出流程 — exportProject（编辑器工程）

作业模式 `if (course.kind === 'homework')`：

| 项目 | 正课 | 作业 |
|------|------|------|
| 模板 zip | `Game1_LT.zip` | `Game1_HW.zip` |
| 工程目录 | `project/{cid}/Game1` | `project/{cid}/Game1_HW` |
| scene 目录 | `laya/pages/game_lt/` | `laya/pages/game_hw/` |
| scene 命名 | `Page{si}_{sj}.scene` | `Game{si+1}.scene` |
| ts 目录 | `src/view/game_lt/` | `src/view/game_hw/` |
| 资源前缀 | `game_lt/...` | `game_hw/...` |
| config.json | 正课格式 | homework 格式 |

## vite.config.ts 服务端改动

### /api/publish

- payload 新增 `kind` 字段
- 目录后缀：`kind === 'homework' ? '_LessonHW' : '_LessonZK'`
- JS 文件名：`kind === 'homework' ? 'LessonHW.js' : 'LessonZK.js'`
- 不写 `config_preview.json`（作业无预习）

### serveCourseFile

- URL 匹配正则从 `([^/]+_LessonZK)` 改为 `([^/]+_Lesson(?:ZK|HW))`

### /api/upload-resource

- 客户端多传 `kind` 字段
- 服务端按 `kind` 拼目录后缀

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/types/index.ts` | Course 加 `kind` 字段 |
| `src/components/CreateProjectDialog.tsx` | 课件类型单选 + `_hw` 校验 + 回调传 kind |
| `src/components/Toolbar.tsx` | handleCreateConfirm 接收 kind，预览按 kind 分流 |
| `src/components/PageList.tsx` | isHomework 条件渲染 |
| `src/utils/export.ts` | publishOnly 加 homework 分支 |
| `src/utils/exportProject.ts` | exportProject 加 homework 分支 |
| `vite.config.ts` | /api/publish、serveCourseFile、/api/upload-resource |
| `src/utils/electronFs.ts` | createProjectInDirectory 接收 kind 写入 .forge.json |
| `src/i18n/translations.ts` | 新增 homework 相关 i18n key |
| `public/builtin/layaProjectModel/Game1_HW.zip` | 已打包 |
