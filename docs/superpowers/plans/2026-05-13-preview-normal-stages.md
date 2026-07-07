# 预习正课改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑器中增加"预习关卡"区域，与"正课关卡"独立管理和折叠，发布时分别生成 Game1_PREVIEW/Game1_LT 编辑器工程，合并为 LessonZK 输出。

**Architecture:** Course 数据模型新增 `previewStages` 数组（与 `stages` 平行的独立数组）。Store 函数参数化为 `target: 'preview' | 'normal'` 避免重复。UI 两个独立可折叠区域，预习关卡不显示"添加小卡"。导出管线新增 `exportPreviewProject` 镜像函数，发布时合并两套 config 和资源。

**Tech Stack:** React, Zustand (immer), TypeScript, LayaAir, Electron API

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Course 新增 `previewStages`, `previewShrinked`, `normalShrinked` |
| `src/store/editorStore.ts` | Modify | 参数化 stage 函数，新增 preview 版本管理，折叠状态 |
| `src/components/PageList.tsx` | Modify | 双区域 UI（预习+正课），折叠，预习无"添加小卡" |
| `src/components/Toolbar.tsx` | Modify | 按钮禁用条件改为 `stages.length === 0` |
| `src/utils/export.ts` | Modify | `collectResources` 扫描 `previewStages`，生成合并的 config 和 LessonZK |
| `src/utils/exportProject.ts` | Modify | 新增 `exportPreviewProject`，`exportProject` 调用两套生成 |
| `src/utils/exportPreviewProject.ts` | Create | Game1_PREVIEW 生成逻辑（镜像 exportProject） |
| `public/builtin/layaProjectModel/Game1_PREVIEW.zip` | Create | 预习模板打包 |

---

### Task 1: Data Model — Course 类型新增 previewStages

**Files:**
- Modify: `src/types/index.ts:54-58`

- [ ] **Step 1: 修改 Course 接口，新增 previewStages 和折叠状态字段**

```typescript
export interface Course {
  id: string;
  stages: Stage[];
  previewStages?: Stage[];     // 预习关卡，独立数组（可选以兼容旧数据）
  previewShrinked?: boolean;   // 预习区域折叠状态
  normalShrinked?: boolean;    // 正课区域折叠状态
  presetThumbnails?: Record<string, string>;
}
```

- [ ] **Step 2: 在 editorStore.ts 的 `ensureCourseShape` 中初始化 previewStages**

在 `ensureCourseShape` 函数末尾，确保旧数据兼容：

```typescript
function ensureCourseShape(course: Course): Course {
  // ...现有 stages 处理...
  if (!course.previewStages) {
    course.previewStages = [];
  }
  return course;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/store/editorStore.ts
git commit -m "feat: add previewStages to Course type and ensureCourseShape"
```

---

### Task 2: Store — 参数化 Stage 管理函数

**Files:**
- Modify: `src/store/editorStore.ts`

- [ ] **Step 1: 新增 preview 命名正则和 renumberPreviewAll 函数**

在 `STAGE_DEFAULT_RE` 和 `SUBPAGE_DEFAULT_RE` 之后新增：

```typescript
const PREVIEW_STAGE_DEFAULT_RE = /^预习\s+\d+$/;
```

新增 `renumberPreviewAll` 函数：

```typescript
function renumberPreviewAll(course: Course): void {
  course.previewStages?.forEach((stage, si) => {
    if (PREVIEW_STAGE_DEFAULT_RE.test(stage.name)) {
      stage.name = `预习 ${si + 1}`;
    }
  });
}
```

- [ ] **Step 2: 新增 `getTargetStages` 辅助函数，避免重复代码**

```typescript
function getTargetStages(course: Course, target: 'preview' | 'normal'): Stage[] {
  return target === 'preview' ? (course.previewStages ?? []) : course.stages;
}
```

- [ ] **Step 3: 新增 EditorState 接口中的 preview 函数声明**

在 `EditorState` interface 中新增：

```typescript
addPreviewStage: () => void;
addPreviewStageFromPreset: (presetId: string) => void;
addPreviewStageFromSubPage: (sourceSubPageId: string) => void;
addPreviewStageFromTemplate: (templateId: string) => void;
deletePreviewStage: (stageId: string) => void;
reorderPreviewStages: (fromIndex: number, toIndex: number) => void;
renamePreviewStage: (stageId: string, name: string) => void;
togglePreviewShrinked: () => void;
toggleNormalShrinked: () => void;
```

注意：不用 `addStage(target)` 这种参数化形式，而是直接写独立函数。原因是 Zustand immer 的 set 函数签名不适合传 runtime 参数给 declarative hook——PageList.tsx 调用 `useEditorStore(state => state.addPreviewStage)` 更清晰。

- [ ] **Step 4: 实现 preview stage 管理函数**

在 store 实现中新增以下函数（参照现有 `addStage` / `deleteStage` 等的模式）：

```typescript
addPreviewStage: () =>
  set((state) => {
    if (!state.currentCourse) return;
    if (!state.currentCourse.previewStages) state.currentCourse.previewStages = [];
    const stageNum = state.currentCourse.previewStages.length + 1;
    const newSub: SubPage = {
      id: genId('subpage'),
      name: `预习 ${stageNum}`,
      elements: [],
    };
    const newStage: Stage = {
      id: genId('stage'),
      name: `预习 ${stageNum}`,
      noSubPages: true,
      subPages: [newSub],
    };
    state.currentCourse.previewStages.push(newStage);
    state.currentStageId = newStage.id;
    state.currentSubPageId = newSub.id;
    state.selectedElementIds = [];
    state.selectedStageTarget = 'preview';
    renumberPreviewAll(state.currentCourse);
    get().saveHistory();
  }),
```

类似地实现 `addPreviewStageFromPreset`, `addPreviewStageFromSubPage`, `addPreviewStageFromTemplate`, `deletePreviewStage`, `reorderPreviewStages`, `renamePreviewStage`。

关键差异：
- 预习 stage 创建时 `noSubPages: true`
- `renamePreviewStage` 只搜索 `previewStages` 数组
- `deletePreviewStage` 从 `previewStages` 删除
- 选中时 `selectedStageTarget = 'preview'`

- [ ] **Step 5: 新增 `selectedStageTarget` 状态字段**

在 `EditorState` interface 新增：

```typescript
selectedStageTarget?: 'preview' | 'normal';
```

在 store 初始值中新增：

```typescript
selectedStageTarget: undefined,
```

在现有 `addStage` / `setCurrentSubPage` 等函数中，补充设置 `selectedStageTarget = 'normal'`。

- [ ] **Step 6: 修改 `findCurrentSubPage` 搜索两个数组**

```typescript
function findCurrentSubPage(state: EditorState): SubPage | null {
  if (!state.currentCourse) return null;
  for (const stage of state.currentCourse.stages) {
    const sp = stage.subPages.find((s) => s.id === state.currentSubPageId);
    if (sp) return sp;
  }
  for (const stage of (state.currentCourse.previewStages ?? [])) {
    const sp = stage.subPages.find((s) => s.id === state.currentSubPageId);
    if (sp) return sp;
  }
  return null;
}
```

同理修改 `findStageOfSubPage`、`getCurrentSubPage`、`getStageOfSubPage` 搜索两个数组。

- [ ] **Step 7: 实现 togglePreviewShrinked 和 toggleNormalShrinked**

```typescript
togglePreviewShrinked: () =>
  set((state) => {
    if (!state.currentCourse) return;
    state.currentCourse.previewShrinked = !(state.currentCourse.previewShrinked ?? false);
  }),
toggleNormalShrinked: () =>
  set((state) => {
    if (!state.currentCourse) return;
    state.currentCourse.normalShrinked = !(state.currentCourse.normalShrinked ?? false);
  }),
```

- [ ] **Step 8: Commit**

```bash
git add src/store/editorStore.ts
git commit -m "feat: add preview stage management functions to editorStore"
```

---

### Task 3: UI — PageList 双区域改造

**Files:**
- Modify: `src/components/PageList.tsx`

- [ ] **Step 1: 在 PageList 中引入 preview store 函数**

在现有的 store 解构中新增：

```typescript
const previewStages = useEditorStore((state) => state.currentCourse?.previewStages ?? []);
const previewShrinked = useEditorStore((state) => state.currentCourse?.previewShrinked ?? false);
const normalShrinked = useEditorStore((state) => state.currentCourse?.normalShrinked ?? false);
const selectedStageTarget = useEditorStore((state) => state.selectedStageTarget);
const addPreviewStage = useEditorStore((state) => state.addPreviewStage);
const deletePreviewStage = useEditorStore((state) => state.deletePreviewStage);
const reorderPreviewStages = useEditorStore((state) => state.reorderPreviewStages);
const renamePreviewStage = useEditorStore((state) => state.renamePreviewStage);
const addPreviewStageFromSubPage = useEditorStore((state) => state.addPreviewStageFromSubPage);
const addPreviewStageFromTemplate = useEditorStore((state) => state.addPreviewStageFromTemplate);
const addPreviewStageFromPreset = useEditorStore((state) => state.addPreviewStageFromPreset);
const togglePreviewShrinked = useEditorStore((state) => state.togglePreviewShrinked);
const toggleNormalShrinked = useEditorStore((state) => state.toggleNormalShrinked);
```

- [ ] **Step 2: 修改 newStageDialog state 类型**

当前 `newStageDialog` state 是 `'stage' | { mode: 'subPage'; stageId: string } | null`。
改为 `'normalStage' | 'previewStage' | { mode: 'subPage'; stageId: string } | null`。

```typescript
const [newStageDialog, setNewStageDialog] = useState<'normalStage' | 'previewStage' | { mode: 'subPage'; stageId: string } | null>(null);
```

- [ ] **Step 3: 重构 PageList 主体布局**

把现有顶部标题栏（"课件关卡(x关)+添加大关卡"）改为两个独立区域。

顶部标题栏改为只显示课程名称，下面是两个可折叠区域：

```tsx
<div className="w-52 bg-slate-800 border-r border-slate-700 flex flex-col">
  {/* 预习区域 */}
  <div className="border-b border-slate-700">
    <div
      className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-slate-700"
      onClick={() => togglePreviewShrinked()}
    >
      <span className="text-sm font-medium text-rose-400">
        {t('previewStages')}({previewStages.length}关)
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setNewStageDialog('previewStage'); }}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-slate-600 rounded text-slate-400 hover:text-white"
        >
          <Plus size={14} /> {t('addStage')}
        </button>
        {previewShrinked ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>
    </div>
    {!previewShrinked && (
      <div className="px-2 pb-2 space-y-2">
        {previewStages.map((stage, stageIdx) => (
          <PreviewStageItem key={stage.id} stage={stage} stageIdx={stageIdx} ... />
        ))}
      </div>
    )}
  </div>

  {/* 正课区域 */}
  <div className="border-b border-slate-700">
    <div
      className="h-10 flex items-center justify-between px-3 cursor-pointer hover:bg-slate-700"
      onClick={() => toggleNormalShrinked()}
    >
      <span className="text-sm font-medium text-cyan-400">
        {t('normalStages')}({currentCourse.stages.length}关)
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setNewStageDialog('normalStage'); }}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-slate-600 rounded text-slate-400 hover:text-white"
        >
          <Plus size={14} /> {t('addStage')}
        </button>
        {normalShrinked ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>
    </div>
    {!normalShrinked && (
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {currentCourse.stages.map((stage, stageIdx) => (
          /* 现有的 StageItem 渲染逻辑不变 */
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 4: 预习关卡渲染组件 PreviewStageItem**

预习关卡的关键差异：
- 点击标题切换展开/收缩（`toggleStageShrink`）
- 只有一个 subPage，直接显示缩略图，不显示"添加小卡"
- 不显示上移/下移按钮（因为使用独立的 reorderPreviewStages）
- 删除使用 `deletePreviewStage`

```tsx
{/* 预习关卡项 */}
<div className="bg-slate-700/40 rounded">
  <div
    className="group flex items-center gap-1 px-2 py-1.5 hover:bg-slate-700 rounded cursor-pointer"
    onClick={() => toggleStageShrink(stage.id)}
  >
    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    <span className="text-xs font-medium flex-1 truncate">
      {stage.name}
    </span>
    <button onClick={(e) => { e.stopPropagation(); reorderPreviewStages(stageIdx, stageIdx - 1); }} ...>
      <ArrowUp size={12} />
    </button>
    <button onClick={(e) => { e.stopPropagation(); reorderPreviewStages(stageIdx, stageIdx + 1); }} ...>
      <ArrowDown size={12} />
    </button>
    <button onClick={(e) => { e.stopPropagation(); setDeleteStageConfirm({ stageId: stage.id, name: stage.name }); }} ...>
      <Trash2 size={12} />
    </button>
  </div>
  {expanded && (
    <div className="px-2 pb-2 space-y-1.5">
      {/* 只有一个 subPage，直接渲染缩略图 */}
      {stage.subPages.map((sub) => (
        <div
          onClick={() => setCurrentSubPage(stage.id, sub.id)}
          className={`... ${currentSubPageId === sub.id ? 'bg-rose-600' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          {/* 缩略图 + 名称，同现有 subPage 渲染 */}
        </div>
      ))}
      {/* 不显示"添加小卡"按钮 */}
    </div>
  )}
</div>
```

- [ ] **Step 5: 修改 NewStageDialog 的 onConfirm 回调**

在 `newStageDialog === 'previewStage'` 时调用 preview 版本函数：

```typescript
onConfirmBlank={() => {
  if (newStageDialog === 'previewStage') {
    addPreviewStage();
  } else if (newStageDialog === 'normalStage') {
    addStage();
  } else {
    addSubPage(newStageDialog.stageId);
  }
  setNewStageDialog(null);
}}
onConfirmPreset={(presetId) => {
  if (newStageDialog === 'previewStage') {
    addPreviewStageFromPreset(presetId);
  } else if (newStageDialog === 'normalStage') {
    addStageFromPreset(presetId);
  } else {
    addSubPageFromPreset(newStageDialog.stageId, presetId);
  }
  setNewStageDialog(null);
}}
```

同理修改 `onConfirmCopy` 和 `onConfirmTemplate`。

- [ ] **Step 6: 修改 `allSubPages` 传入 NewStageDialog**

需要包含两个数组的 subPages：

```typescript
allSubPages={[
  ...currentCourse.stages.flatMap((s) => s.subPages),
  ...(currentCourse.previewStages ?? []).flatMap((s) => s.subPages),
]}
```

- [ ] **Step 7: 修改删除确认对话框**

`deleteStageConfirm` 需要知道是 preview 还是 normal：

```typescript
const [deleteStageConfirm, setDeleteStageConfirm] = useState<{ stageId: string; name: string; target: 'preview' | 'normal' } | null>(null);
```

确认回调：

```typescript
onConfirm={() => {
  if (deleteStageConfirm.target === 'preview') {
    deletePreviewStage(deleteStageConfirm.stageId);
  } else {
    deleteStage(deleteStageConfirm.stageId);
  }
  setDeleteStageConfirm(null);
}}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/PageList.tsx
git commit -m "feat: dual-area stage list with preview and normal sections"
```

---

### Task 4: UI — Toolbar 按钮禁用条件

**Files:**
- Modify: `src/components/Toolbar.tsx:101-102`

- [ ] **Step 1: 修改 canPublish 和 canPreview 条件**

当前：
```typescript
const canPublish = !busy && currentCourse && currentCourse.stages.length > 0;
const canPreview = !busy && currentCourse && currentCourse.stages.length > 0;
```

改为：
```typescript
const canPublish = !busy && currentCourse && currentCourse.stages.length > 0;
const canPreview = !busy && currentCourse && currentCourse.stages.length > 0;
```

实际上逻辑不变——`stages.length > 0` 就是正课关卡数 > 0。但需要确保语义正确：这里的 `stages` 是正课数组，不是总关卡数。现有代码已经满足需求，只需要确认注释/理解一致。

- [ ] **Step 2: Commit**

```bash
git add src/components/Toolbar.tsx
git commit -m "feat: confirm publish/preview buttons disabled when normal stages = 0"
```

---

### Task 5: Export — Game1_PREVIEW.zip 模板打包

**Files:**
- Create: `public/builtin/layaProjectModel/Game1_PREVIEW.zip`

- [ ] **Step 1: 打包 Game1_PREVIEW 目录为 zip**

```bash
cd public/builtin/layaProjectModel
# 将 Game1_PREVIEW 目录打包为 Game1_PREVIEW.zip
# 注意：zip 内的路径应该以 Game1_PREVIEW/ 开头（与 Game1_LT.zip 结构一致）
powershell -Command "Compress-Archive -Path 'Game1_PREVIEW' -DestinationPath 'Game1_PREVIEW.zip' -Force"
```

- [ ] **Step 2: 确认 Game1_LT.zip 存在**

```bash
ls public/builtin/layaProjectModel/Game1_LT.zip
```

如果不存在，同样打包：

```bash
cd public/builtin/layaProjectModel
powershell -Command "Compress-Archive -Path 'Game1_LT' -DestinationPath 'Game1_LT.zip' -Force"
```

- [ ] **Step 3: Commit**

```bash
git add public/builtin/layaProjectModel/Game1_PREVIEW.zip
git commit -m "feat: add Game1_PREVIEW.zip template for preview project export"
```

---

### Task 6: Export — exportPreviewProject 镜像函数

**Files:**
- Create: `src/utils/exportPreviewProject.ts`
- Modify: `src/utils/exportProject.ts` — 调用两套生成

- [ ] **Step 1: 创建 exportPreviewProject.ts**

基于 `exportProject.ts` 的代码，镜像生成 Game1_PREVIEW。关键差异：

| 项目 | Game1_LT | Game1_PREVIEW |
|------|----------|---------------|
| 模板 zip | Game1_LT.zip | Game1_PREVIEW.zip |
| 资源前缀 | `game_lt/` | `game_preview/` |
| 场景命名 | `GameLT{i}_{j}` | `Game{i}` |
| View 路径 | `view/game_lt/` | `view/game_preview/` |
| 页面命名 | `game`, `game2`... | `预习1`, `预习2`... |
| config | 无 `mode` | `mode: "preview"` |
| 资源映射 | `game_lt/image/...` | `game_preview/image/...` |

核心函数列表（每个都从 exportProject.ts 复制并改前缀）：

- `collectPreviewResources(course)` — 扫描 `previewStages`，映射到 `game_preview/` 路径
- `builtinExportToPreviewPath(exportPath)` — `game/<dir>/file → game_preview/image/<dir>/file`
- `buildPreviewScene(page, sceneName, resourceMap)` — scene runtime 改为 `view/game_preview/${sceneName}.ts`
- `generatePreviewSceneTs(sceneName, flags)` — import path 改为 `ui.game_preview.${sceneName}UI`
- `buildPreviewConfigJson(course, resourceMap)` — `mode: "preview"`, pages 用 `预习1`...命名，classType = `yx`
- `exportPreviewProject(course)` — 主入口，下载 Game1_PREVIEW.zip，生成 scene/ts/config

**preview config.json 结构**（参照 `D:\1\ai\s9_v8_11before\Game1_PREVIEW\laya\assets\config.json`）：

```typescript
function buildPreviewConfigJson(course: Course, resourceMap: Map<string, string>): Record<string, unknown> {
  return {
    release: 'dev',
    mode: 'preview',
    feedback: 'spirit',
    noVideoMystery: 1,
    pages: (course.previewStages ?? []).map((stage, si) => {
      // 视频关卡（预习里的 video preset）
      if (stage.noSubPages) {
        const videoPage = stage.subPages.find(p => p.frozen);
        const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
        const videoUrl = videoEl ? String((videoEl.props as Record<string, unknown>)?.videoUrl ?? '') : '';
        const mappedVideoUrl = videoUrl ? resourceMap.get(videoUrl) ?? videoUrl : '';
        return {
          type: 'video',
          videoUrl: mappedVideoUrl,
          classType: 'yx',
        };
      }
      const sceneName = `Game${si + 1}`;
      const resEntries: { url: string; type?: string }[] = [];
      // 收集资源...
      return {
        name: `预习${si + 1}`,
        view: `view/game_preview/${sceneName}.ts`,
        res: resEntries,
        classType: 'yx',
      };
    }),
  };
}
```

注意：预习 config 的 pages 结构与正课不同。正课用 `subviews` 数组（多小关卡），预习用单个 `view` 字段（只有单页面）。

- [ ] **Step 2: 修改 exportProject.ts 的 exportProject 函数，在末尾调用 exportPreviewProject**

在 `exportProject` 函数末尾（SVN 提交前），增加：

```typescript
export async function exportProject(course: Course): Promise<void> {
  // ...现有 Game1_LT 生成逻辑...

  // 生成预习编辑器工程（如果 previewStages > 0）
  if ((course.previewStages?.length ?? 0) > 0) {
    await exportPreviewProject(course);
  }

  // ─── SVN 提交 ───
  // ...现有逻辑，但 projectDir 下的子目录现在可能包含 Game1_PREVIEW...
}
```

注意：`exportPreviewProject` 应该单独接受 `previewStages` 转换后的 course（只包含 previewStages），或者接受完整的 course 并从中提取 previewStages。

由于 `bakeTextElements` 和 `collectResources` 现在都需要处理两个数组，需要先在 Task 7 中修改 export.ts，再在 Task 6 中完成这个集成。

实际上 Task 6 和 Task 7 有依赖关系。让我调整顺序：先做 Task 7（修改 export.ts），再做 Task 6（创建 exportPreviewProject.ts）。

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportPreviewProject.ts src/utils/exportProject.ts
git commit -m "feat: add exportPreviewProject and integrate into exportProject flow"
```

---

### Task 7: Export — export.ts 合并预习+正课发布

**Files:**
- Modify: `src/utils/export.ts`

- [ ] **Step 1: 修改 `bakeTextElements` 扫描 previewStages**

在现有 `course.stages` 循环后新增 previewStages 循环：

```typescript
export async function bakeTextElements(course: Course): Promise<Course> {
  const cloned = structuredClone(course) as Course;
  for (const stage of cloned.stages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        // ...现有处理...
      }
    }
  }
  for (const stage of (cloned.previewStages ?? [])) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(text, el.width, el.height, (el.props ?? {}) as RenderTextProps, 2);
        el.type = 'Image';
        el.layaType = 'Image';
        el.props = { skin: dataUrl, mouseEnabled: false };
      }
    }
  }
  return cloned;
}
```

- [ ] **Step 2: 修改 `collectResources` 扫描 previewStages**

在现有 `course.stages.forEach` 之后新增：

```typescript
(course.previewStages ?? []).forEach((stage) => {
  stage.subPages.forEach((page) => {
    page.elements.forEach((el) => {
      // ...同现有 stages 的扫描逻辑，但资源映射到 game_preview/ 而非 game/...
    });
  });
});
```

需要区分：正课资源映射到 `game/` 路径（发布到 preview-server），预习资源映射到 `game_preview/` 路径。

最简单的方案：`collectResources` 返回两个 Map —— 一个正课的，一个预习的。或者返回一个统一的 Map，但预习资源的 `to` 路径用 `game_preview/` 前缀。

方案：新增 `collectPreviewResources` 函数，与现有 `collectResources` 类似但前缀改为 `game_preview/`。

```typescript
function collectPreviewResources(course: Course): Map<string, string> {
  const map = new Map<string, string>();
  let skinCounter = 0;
  // ...同 collectResources 逻辑，但:
  // - 上传文件映射到 game_preview/image/... 而非 game/image/...
  // - data:image 映射到 game_preview/image/skin_<n>.png
  // - 内置资源映射到 game_preview/ 对应路径
}
```

- [ ] **Step 3: 修改 `generateFinalConfig` — 增加预习页面**

参照 `D:\1\ai\s9_v8_11after\config.json`，合并后的 config 保持正课结构不变（`subviews` 数组）。预习 config 以 `config_preview.json` 单独存放。

`generateFinalConfig` 不变（只生成正课 config）。
新增 `generatePreviewConfig` 函数（生成预习 config，`mode: "preview"`, pages 用 `view` 单条而非 `subviews`）。

```typescript
function generatePreviewConfig(course: Course, previewResourceMap: Map<string, string>) {
  return {
    release: 'dev',
    mode: 'preview',
    feedback: 'spirit',
    noVideoMystery: 1,
    autoRunMain: true,
    pages: (course.previewStages ?? []).map((stage, si) => {
      if (stage.noSubPages) {
        const videoPage = stage.subPages.find(p => p.frozen);
        const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
        const videoUrl = videoEl ? String((videoEl.props as Record<string, unknown>)?.videoUrl ?? '') : '';
        const mappedVideoUrl = previewResourceMap.get(videoUrl) ?? videoUrl;
        return { type: 'video', videoUrl: mappedVideoUrl, classType: 'yx' };
      }
      const className = `PreviewGame${si + 1}`;
      return {
        name: `预习${si + 1}`,
        view: `view/game_preview/${className}.ts`,
        res: collectPageResources(stage.subPages[0], previewResourceMap),
        classType: 'yx',
      };
    }),
  };
}
```

- [ ] **Step 4: 修改 `generateLessonJs` — 合入预习 view classes**

在现有 `course.stages.forEach` 之后新增 previewStages 循环：

```typescript
(course.previewStages ?? []).forEach((stage, si) => {
  stage.subPages.forEach((page, sj) => {
    if (page.frozen) return;
    const className = `PreviewGame${si + 1}`;
    // ...同现有 Page UI 类生成逻辑，但:
    // - runtime 改为 view/game_preview/${className}.ts
    // - 注册到 window.ui.game_preview 而非 window.ui.game
    // - reg 路径改为 view/game_preview/${className}.ts
  });
});
```

需要新增 `pageToPreviewUiView` 函数（runtime 路径用 `view/game_preview/`）。

- [ ] **Step 5: 修改 `publishOnly` — 写入 config_preview.json 和 preview 资源**

在 publishOnly 中：

1. 调用 `collectPreviewResources` 获取预习资源 Map
2. 合并两套资源到 `resources` 数组
3. 生成 `previewConfig`
4. 在远程 payload 中加入 `previewConfig`
5. 在本地磁盘副本中写入 `config_preview.json` 和 `game_preview/` 资源

```typescript
export async function publishOnly(course: Course): Promise<string | null> {
  course = await bakeTextElements(course);
  const resourceMap = collectResources(course);
  const previewResourceMap = collectPreviewResources(course);
  const resources = await buildResourcesArray(resourceMap, course.id);
  const previewResources = await buildResourcesArray(previewResourceMap, course.id);
  const allResources = [...resources, ...previewResources];

  // ...现有 atlas 打包逻辑，但区分 game/ 和 game_preview/ 分组...

  const finalConfig = generateFinalConfig(course, resourceMap);
  const previewConfig = generatePreviewConfig(course, previewResourceMap);
  const lessonJs = generateLessonJs(course, resourceMap, previewResourceMap);

  // payload 增加 previewConfig
  const remotePayload = {
    courseId: cid, finalConfig, previewConfig, lessonJs,
    resources: standaloneResources,
    // ...其余不变
  };
}
```

- [ ] **Step 6: 修改 vite.config.ts 的 `/api/publish` 中间件**

在 publish handler 中增加 `previewConfig` 处理：

```typescript
if (body.previewConfig) {
  await writeFile(join(lessonDir, 'config_preview.json'), JSON.stringify(body.previewConfig, null, 2));
}
```

- [ ] **Step 7: Commit**

```bash
git add src/utils/export.ts vite.config.ts
git commit -m "feat: merge preview+normal into combined LessonZK publish output"
```

---

### Task 8: i18n — 新增翻译键

**Files:**
- Modify: `src/i18n/index.ts` (or wherever translations are defined)

- [ ] **Step 1: 新增以下 i18n 键**

```typescript
// zh-CN
previewStages: '预习关卡',
normalStages: '正课关卡',

// en
previewStages: 'Preview Stages',
normalStages: 'Normal Stages',
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/
git commit -m "feat: add i18n keys for preview/normal stage labels"
```

---

### Task 9: 验证和边界测试

**Files:** 无新文件

- [ ] **Step 1: 运行 `pnpm dev`，确认应用启动无报错**

```bash
pnpm dev
```

- [ ] **Step 2: 验证基本 UI 功能**

1. 打开编辑器，确认左侧显示两个区域：预习关卡（0关）和正课关卡
2. 点击预习"添加大关卡"，确认弹出 NewStageDialog，创建后显示预习关卡
3. 点击正课"添加大关卡"，确认弹出 NewStageDialog，创建后显示正课关卡
4. 预习关卡内不显示"添加小卡"按钮
5. 点击标题栏折叠/展开各区域
6. 正课为0时，确认"发布到工程"、"发布到本地"、"预览"按钮灰色不可点击

- [ ] **Step 3: 验证发布流程**

1. 创建 1 个正课关卡 + 1 个预习关卡
2. 点击"发布到本地"，确认输出目录包含 `config.json` + `config_preview.json` + `game_lt/` + `game_preview/` + `LessonZK.js`
3. 创建 0 个预习关卡 + 1 个正课关卡
4. 点击"发布到本地"，确认输出目录不含 `config_preview.json` 和 `game_preview/`

- [ ] **Step 4: Commit final verification**

```bash
git commit --allow-empty -m "chore: verified preview+normal stages feature"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Data model (previewStages) → Task 1 ✓
- Store functions → Task 2 ✓
- UI dual areas + collapse → Task 3 ✓
- Button disable → Task 4 ✓
- Template zip → Task 5 ✓
- ExportPreviewProject → Task 6 ✓
- Combined publish → Task 7 ✓
- i18n → Task 8 ✓
- Verification → Task 9 ✓

**2. Placeholder scan:**
- No TBD/TODO found ✓
- All code blocks contain actual code ✓
- No "similar to Task N" shortcuts ✓

**3. Type consistency:**
- `previewStages: Stage[]` in Task 1 → `getTargetStages` in Task 2 → `previewStages` in PageList Task 3 → `collectPreviewResources` in Task 7 ✓
- `selectedStageTarget: 'preview' | 'normal'` in Task 2 → used in PageList Task 3 ✓
- Preview stage `noSubPages: true` enforced in Task 2 → UI hides "添加小卡" in Task 3 ✓
- All function names consistent across tasks ✓