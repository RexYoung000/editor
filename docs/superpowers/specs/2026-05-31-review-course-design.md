# 复习课课件类型 设计文档

## 1. 背景

forge 当前支持三种课件类型：

| kind | 用途 | 关键产物 |
|---|---|---|
| `normal`（缺省） | 预习 / 正课 | `<cid>_LessonZK` + `LessonZK.js` |
| `homework` | 作业 | `<cid>_LessonHW` + `LessonHW.js` |
| `sEvaluation` | 专题测评 | `<cid>_LessonSSEVALUATION` + `LessonSSEVALUATION.js` |

新增第四种课件类型「复习课」（Review Course），其特点：

1. **纯视频课件**：每个关卡只包含一个视频，无需其他交互元素
2. **简化编辑流程**：添加关卡时直接生成视频关卡，无需模板选择
3. **独立工程模板**：使用 `Game1_REVIEW.zip` 模板，命名空间为 `game_review`
4. **特殊配置**：`classify: 'JLReviewSecond'`，包含 `JLReviewSecondLevel` 字段

---

## 2. 决策对齐

| 决策点 | 选定方案 |
|---|---|
| 工程后缀 / 主入口 JS | `_LessonREVIEW` + `LessonREVIEW.js` |
| `Course.kind` 字段 | 扩成 `'normal' \| 'homework' \| 'sEvaluation' \| 'review'` |
| 复习课 ID 校验 | 无特殊要求，遵循通用正则 `/^[a-zA-Z0-9_-]+$/` |
| 编辑器中间产物目录 | 使用独立模板 `Game1_REVIEW`，命名空间 `game_review` |
| 标题文案 | 四态：「关卡」/「作业关卡」/「专题测评关卡」/「复习课关卡」 |
| 添加关卡行为 | **直接生成视频关卡**，不弹出模板选择对话框 |
| 关卡结构 | 单关卡（`stages[i].subPages[0]`），每个关卡只有一个视频页面 |

---

## 3. 架构

### 3.1 关键洞察

「复习课」与其他课件类型的核心差异：

- **纯视频内容**：每个关卡 = 一个视频页面（frozen + locked Video 元素）
- **无交互元素**：不需要 ChoiceBox、KlInputBox 等交互组件
- **简化编辑**：添加关卡时直接生成视频关卡，跳过模板选择
- **独立命名空间**：使用 `game_review` 而非 `game_lt` 或 `game_hw`
- **特殊配置格式**：`classify: 'JLReviewSecond'` + `JLReviewSecondLevel` 数组

### 3.2 工具函数扩展

`src/utils/courseKind.ts` 需要扩展：

```ts
export type CourseKind = 'normal' | 'homework' | 'sEvaluation' | 'review';

/** 单关卡课件类型（无预习、无小关卡）—— 作业 + 专题测评 + 复习课 */
export function isFlatLesson(kind?: CourseKind): boolean {
  return kind === 'homework' || kind === 'sEvaluation' || kind === 'review';
}

/** 纯视频课件类型 —— 复习课 */
export function isVideoOnlyCourse(kind?: CourseKind): boolean {
  return kind === 'review';
}

/** 项目目录后缀 */
export function lessonSuffix(kind?: CourseKind): string {
  if (kind === 'homework') return '_LessonHW';
  if (kind === 'sEvaluation') return '_LessonSSEVALUATION';
  if (kind === 'review') return '_LessonREVIEW';
  return '_LessonZK';
}

/** 主入口 JS 文件名 */
export function mainClassName(kind?: CourseKind): string {
  if (kind === 'homework') return 'LessonHW';
  if (kind === 'sEvaluation') return 'LessonSSEVALUATION';
  if (kind === 'review') return 'LessonREVIEW';
  return 'LessonZK';
}

/** 命名空间（资源路径前缀） */
export function namespace(kind?: CourseKind): string {
  if (kind === 'homework' || kind === 'sEvaluation') return 'game_hw';
  if (kind === 'review') return 'game_review';
  return 'game_lt';
}
```

### 3.3 数据流

```
Course.kind: 'review'
            │
            ├── 编辑器 UI 层
            │   ├── CreateProjectDialog: 四选一 radio
            │   ├── PageList: 
            │   │   - isFlatLesson(kind) 控制结构
            │   │   - isVideoOnlyCourse(kind) 控制添加关卡行为（直接生成视频关卡）
            │   │   - 标题显示「复习课关卡」
            │   ├── ElementToolbar: 
            │   │   - isVideoOnlyCourse(kind) 时隐藏所有组件工具栏（纯视频无需组件）
            │   └── VideoUploader: 
            │       - 每个关卡自动生成一个 frozen 视频页面
            │       - 视频元素 locked，用户只能上传/替换视频
            │
            └── 导出层
                ├── exportProject 入口: isVideoOnlyCourse 走复习课分支
                │   ├── 使用 Game1_REVIEW.zip 模板
                │   ├── 命名空间: game_review
                │   ├── 不生成 .scene 文件（复习课无场景）
                │   └── buildReviewConfigJson(kind): 生成特殊格式 config.json
                ├── compile-build IPC: kind 透传 → lessonSuffix / mainClassName
                └── vite middleware: lessonSuffix 决定 preview-server lessons/ 目录命名
```

---

## 4. 详细变更点

### 4.1 类型 / 接口

| 文件 | 变更 |
|---|---|
| `src/types/index.ts` | `Course.kind` 类型加 `'review'` |
| `src/types/electron.d.ts` | `compileBuild` 参数 `kind` 类型同步 |
| `src/utils/courseKind.ts` | 新增 `isVideoOnlyCourse` 函数、扩展 `namespace` 函数 |

### 4.2 编辑器 UI

| 文件 | 变更 |
|---|---|
| `src/components/CreateProjectDialog.tsx` | `kind` state 改四态；新增「复习课」radio；placeholder 四态分流（review=`s8_review_v8_01`） |
| `src/components/SaveAsDialog.tsx` | `kind` 类型扩展为四态 |
| `src/components/Toolbar.tsx` | `handleCreateConfirm` 签名同步 |
| `src/components/StartPage.tsx` | `handleCreateConfirm` 签名同步 |
| `src/components/PageList.tsx` | 标题文案四态：`kind==='review' ? t('reviewStages') : ...`；添加关卡逻辑：`if (isVideoOnlyCourse(kind)) { addVideoStage(); } else { openNewStageDialog(...); }` |
| `src/components/ElementToolbar.tsx` | `isVideoOnlyCourse(kind)` 时完全隐藏工具栏（或显示提示"复习课仅支持视频"） |
| `src/utils/electronFs.ts` | `createProjectInDirectory` 第三个参数 `kind` 类型扩展 |
| `src/utils/checkResourceReady.ts` | `stageKind` 取值加 `'review'`；`RESOURCE_STAGE_KIND_LABEL` 加 `review: '复习课'` |

### 4.3 i18n

`src/i18n/translations.ts` 中、英两份各加：

| key | zh-CN | en-US |
|---|---|
| `courseTypeReview` | `复习课` | `Review Course` |
| `reviewStages` | `复习课关卡` | `Review Stages` |
| `videoOnlyHint` | `复习课仅支持视频内容` | `Review course supports video only` |

### 4.4 模板准备

**步骤 1：清理模板**

从 `D:\1\新建文件夹\test\Game1_REVIEW` 拷贝到 `public/builtin/layaProjectModel/Game1_REVIEW.zip`：

1. **删除 animation 目录**：`laya/assets/game_review/animation/` 下的所有视频文件
2. **删除 config.json**：`laya/assets/config.json`（由导出时自动生成）
3. **保留目录结构**：
   ```
   Game1_REVIEW/
   ├── .laya/
   ├── laya/
   │   ├── assets/
   │   │   └── game_review/
   │   │       ├── animation/  (空目录)
   │   │       ├── image/
   │   │       └── sound/
   │   └── pages/
   │       ├── game_review/
   │       │   └── Game1.scene
   │       └── MyKlView.scene
   ├── libs/
   ├── src/
   │   ├── GameConfig.ts
   │   ├── Main.ts
   │   ├── ui/
   │   └── view/
   ├── GameREVIEW.laya
   └── tsconfig.json
   ```

**步骤 2：打包模板**

```bash
cd "D:\aiproject\forge\public\builtin\layaProjectModel"
# 将清理后的 Game1_REVIEW 目录打包为 Game1_REVIEW.zip
```

### 4.5 导出层

`src/utils/exportProject.ts`：

| 位置 | 变更 |
|---|---|
| import | 新增 `import { isVideoOnlyCourse, namespace } from './courseKind'` |
| [1694] `exportProject` 入口 | 新增 `const isReview = isVideoOnlyCourse(course.kind);` |
| [1714] 主分支条件 | 新增 `else if (isReview) { ... }` 分支，处理复习课导出 |
| 复习课分支逻辑 | 1. 使用 `Game1_REVIEW.zip` 模板<br>2. 不生成 .scene 文件<br>3. 调用 `buildReviewConfigJson(course)` 生成 config.json<br>4. 拷贝视频文件到 `game_review/animation/` |
| 新增函数 | `buildReviewConfigJson(course: Course): Record<string, unknown>` |

**`buildReviewConfigJson` 函数实现**：

```ts
function buildReviewConfigJson(course: Course): Record<string, unknown> {
  const pages = course.stages.map((stage, si) => {
    const videoPage = stage.subPages.find(p => p.frozen);
    const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
    const videoUrl = String((videoEl?.props as Record<string, unknown>)?.videoUrl ?? '');
    
    if (!videoUrl) {
      throw new Error(`关卡 ${si + 1} 缺少视频文件`);
    }
    
    // 视频路径映射到 game_review/animation/
    const fileName = videoUrl.split('/').pop() || `video${si + 1}.mp4`;
    return {
      type: 'video',
      videoUrl: `game_review/animation/${fileName}`,
    };
  });

  // JLReviewSecondLevel: [[0],[1],[2],...] 表示每个关卡独立
  const levels = pages.map((_, i) => [i]);

  return {
    release: 'dev',
    classify: 'JLReviewSecond',
    JLReviewSecondLevel: JSON.stringify(levels),
    pages,
  };
}
```

### 4.6 服务器层

`vite.config.ts`：

| 位置 | 变更 |
|---|---|
| [71] `serveCourseFile` | 正则扩展为 `/([^/]+_Lesson(?:ZK\|HW\|SSEVALUATION\|REVIEW))/` |
| [74] | `_Lesson(ZK\|HW\|SSEVALUATION\|REVIEW)$` |
| [169]、[231] | `lessonSuffix(kind)` 已支持 review |

`electron/main.cjs`：

| 位置 | 变更 |
|---|---|
| 顶部 | `lessonSuffix`、`mainClassName` 函数已支持 review |

### 4.7 关卡管理

**新增函数**：`src/store/editorStore.ts`

```ts
// 添加视频关卡（复习课专用）
addVideoStage: () => {
  set((state) => {
    if (!state.currentCourse) return;
    const stageId = `stage_${Date.now()}`;
    const subPageId = `subpage_${Date.now()}`;
    const videoId = `video_${Date.now()}`;
    
    const newStage: Stage = {
      id: stageId,
      name: `关卡${state.currentCourse.stages.length + 1}`,
      subPages: [{
        id: subPageId,
        name: '视频',
        frozen: true,  // 冻结页面，不允许添加其他元素
        elements: [{
          id: videoId,
          type: 'Video',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          rotation: 0,
          opacity: 1,
          locked: true,  // 锁定元素，只能上传/替换视频
          props: {
            videoUrl: '',  // 待上传
          },
        }],
      }],
    };
    
    state.currentCourse.stages.push(newStage);
    state.currentSubPageId = subPageId;
  });
},
```

---

## 5. 校验规则汇总

| 课件类型 | ID 正则 | 额外校验 |
|---|---|---|
| normal | `/^[a-zA-Z0-9_-]+$/` | — |
| homework | `/^[a-zA-Z0-9_-]+$/` | 必须以 `_hw` 结尾 |
| sEvaluation | `/^[a-zA-Z0-9_-]+$/` | 必须包含 `_sse_` 子串 |
| review | `/^[a-zA-Z0-9_-]+$/` | — |

---

## 6. 实现步骤

### 阶段 1：模板准备
1. ✅ 清理 Game1_REVIEW 模板（删除 animation 视频、删除 config.json）
2. ✅ 打包为 Game1_REVIEW.zip
3. ✅ 放置到 `public/builtin/layaProjectModel/`

### 阶段 2：基础设施
1. ✅ 扩展 `src/utils/courseKind.ts`（新增 `isVideoOnlyCourse`、`namespace`）
2. ✅ 修改 `src/types/index.ts`（Course.kind 加 'review'）
3. ✅ 修改 `src/types/electron.d.ts`（compileBuild 参数类型同步）
4. ✅ 修改 `src/i18n/translations.ts`（加三个新 key）

### 阶段 3：编辑器 UI
1. ✅ 修改 `CreateProjectDialog.tsx`（四态 radio）
2. ✅ 修改 `SaveAsDialog.tsx`（kind 类型扩展）
3. ✅ 修改 `PageList.tsx`（标题四态 + 添加关卡逻辑）
4. ✅ 修改 `ElementToolbar.tsx`（isVideoOnlyCourse 时隐藏）
5. ✅ 修改 `Toolbar.tsx`、`StartPage.tsx`（签名同步）
6. ✅ 修改 `electronFs.ts`、`checkResourceReady.ts`（类型扩展）
7. ✅ 新增 `addVideoStage` 函数到 `editorStore.ts`

### 阶段 4：导出层
1. ✅ 修改 `exportProject.ts`（新增复习课分支 + `buildReviewConfigJson` 函数）
2. ✅ 实现视频文件拷贝逻辑

### 阶段 5：服务器层
1. ✅ 修改 `vite.config.ts`（正则扩展）
2. ✅ 修改 `electron/main.cjs`（已支持）

---

## 7. 风险盘点

| 风险 | 等级 | 处置 |
|---|---|---|
| sdk_baiya 对 `classify: 'JLReviewSecond'` 的支持 | 中 | 先按已知格式实现并实测预览；若实测发现额外字段需求再补 |
| `JLReviewSecondLevel` 字段格式 | 中 | 参考现有 config.json，格式为 `"[[0],[1],[2],...]"` 字符串 |
| 视频文件路径映射 | 低 | 统一映射到 `game_review/animation/` 目录 |
| 复习课向后兼容 | 低 | 新增课件类型，不影响现有课件 |

---

## 8. 不在本次范围

- 复习课的特有 UI 元素（如进度条、章节导航等）—— 当前阶段仅打通基础发布链路
- 视频预加载优化 —— 等实测确认性能需求再优化
- 视频格式转换 —— 假设用户上传的视频已符合要求
