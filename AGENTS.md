# AGENTS.md

> 全局协作方式见 `~/.pi/agent/USER.md`（由 pi 自动注入）。本文件只放 **forge 项目专属** 的技术约定与协作补充。

## 命令

包管理用 **pnpm 10**（见 `package.json` 的 `packageManager`）。别用 npm。详细命令清单见 [docs/commands.md](docs/commands.md)。

## 部署形态

forge 是 **Electron 桌面应用**，Vite 仅做开发服务器，不做生产构建。典型部署是 **电脑 A 跑 Vite（远端服务器）、电脑 B 跑 Electron（客户端）**。所有新功能按远程模式设计——不要往远程 Vite 发本机绝对路径。

## 架构

### 编辑模式 vs 预览模式

- `src/utils/laya/core.ts` 持有单例 `_objects` map 和 `_previewMode` 标记。
- **编辑模式**下若干 sdk_baiya 组件被替换成更轻的占位类型，避免实例化真组件时崩溃或误触发动画——`TextInput` / `DragViewBox` / `DropObj` → `Box`，`TextArea` → `Label`，`SoundButton` → `Image`，`Spine` → 原生 `Laya.Skeleton`（绕过会自动重播的 `KlSkeleton1`），带 `meta.placeholderImage` 的一律 → `Image`。逻辑都在 `src/utils/laya/components.ts` 的 `createLayaComponent`。
  - 例外：「文本输入」`NewTextArea`（`layaType: 'TextArea'`）只在编辑模式按上面规则用 `Label` 占位实时显示文字。**导出时**由 `src/utils/exportProject.ts` 的 `bakeTextElements()` 用 Canvas 2D 把文字烘焙成 PNG data URL，元素就地替换成 `type/layaType='Image'`（走 `data:image` → `game/image/skin_<n>.png` 通道），最终课件包里**没有 `TextArea`**。即"编辑期是文本，发布期是图片"。
- **预览模式**（`setPreviewMode(true)`）下绕过上述替换，按 `layaType` 实例化真实组件。`applyKlProps` 处理两种模式的属性应用；它故意把 `stateNum`/`sizeGrid` 写在 `skin` **之前**，因为 sdk_baiya 内部 `skin` 赋值会触发 `changeClips` 渲染。
- `core.ts` 的 `preloadAtlas()` 既做 Laya 启动，也 mock 出 sdk_baiya 运行时上下文（`GlobalModel.user`、`ViewManager._instance`、`VipThink._config`），保证组件在没有 GameLoader 包裹的情况下不崩。

### 元素模型与 `elementMeta`

- 所有组件都声明在**一个文件**里：`src/elements/elementMeta.ts`。每条把 forge `type` 映射到 `layaType`（sdk_baiya 类名）+ `defaultProps` + `properties`（属性面板字段），还可以注入导出期行为：
  - `runtime`：导出时强制写 `runtime: "..."` 属性，让 Laya UI parser 实例化指定 runtime 类。
  - `exportChildren`：固定子节点（如 KlInputImage 的三层 skin），加进导出树但用户看不到。
  - `exportWrapper`：导出时套一层包装节点，可以 `promoteProps` 把内层属性提到外层（KlInputImage → KlInputBox 把 `answer` 提上去）。
  - `placeholderImage`：仅编辑模式下换成 Laya `Image`，避免在画布上跑真组件。
- 分类固定在文件顶部 `CATEGORIES` 里，由 `ElementToolbar` 渲染成 tab。
- `_` 前缀的属性（如 `_bgColor`、`_borderRadius`）是**编辑器专用的自定义皮肤字段**，喂给 `src/utils/skinGenerator.ts` 用 Canvas API 生成皮肤图，导出前会被剥掉。

### 内置资源

- 不要把资源路径硬写在代码里。所有编辑器内置资源放在 `public/builtin/` 下，并在 `src/elements/builtinAssets.ts` 注册 `id`、`src`（编辑器 URL）、可选 `exportPath`（发布课件包内路径）。
- 编辑器侧用 `assetSrc(id)`，导出写进 `LessonZK.js` 的路径用 `assetExport(id)`。`lookupBuiltinByExportPath` 让导出流程能从路径反查内置资源。
- 目录约定：`public/builtin/editor/` 仅编辑器用（不发布），`public/builtin/runtime/<课件相对路径>/...` 编辑器和发布都用。
- `public/builtin/runtime/game/` 目录新增图片后必须重新打包game.zip，否则导出的课件找不到新资源。PowerShell 打包：`Compress-Archive -Path "public/builtin/runtime/game/*" -DestinationPath "public/builtin/runtime/game.zip" -Force`。

### 导出流程

Toolbar 两个按钮（发布工程 / 预览）都走 `src/utils/exportProject.ts`，发布走 SVN 提交，预览走本地编译 + 上传 + 浏览器开 GameLoader。一次调用最多产出 `Game1_LT` / `Game1_HW` / `Game1_PREVIEW` 三种 LayaAir 工程。改导出相关代码前先看 [docs/export-pipeline.md](docs/export-pipeline.md)。

### 自定义模板（本地文件夹方案）

自定义模板**不存 localStorage**，存到用户选定的本地目录，按 MD5 内容去重，跨课件复用。改模板相关代码前先看 [docs/custom-templates.md](docs/custom-templates.md)。

### 开发服务器即后端

forge 没有独立的 Node 服务，所有后端能力都是 `vite.config.ts` 里 `forgePlugin()` 注册的 Vite middleware，分四类：

1. **课件文件动态路由** — `/preview-server/lessons/` 和 `/lessons/` 按 `*_LessonZK/HW/FXK/SSEVALUATION` 后缀反查 `courseOutputDirs`
2. **preview-server 静态代理** — `/preview-server/...` 和根路径 `/share/` `/cfg/` `/res/` 等
3. **`/preview-game/*.html`** — iframe 预览页面，从 `public/preview-game/` 直发
4. **`/api/*` 接口** — `ws-config` / `upload-compiled-zip`(300MB) / `upload-resource`(100MB) / `save-preset-thumbnail` / `library/{list,file-info,spine-files}` / `download-vcredist`

加新接口、改 `lessonSuffix`、调双斜杠防护或排查"基础配置加载失败"前先看 [docs/dev-server.md](docs/dev-server.md)。

`pnpm build` 产物是纯静态 SPA，**这些接口只在 dev 下存在**，没有生产服务器。

### 状态管理

只有一个 Zustand store：`src/store/editorStore.ts`（用 immer 中间件）。它持有 `currentCourse`、选中状态、剪贴板、50 步历史栈。`App.tsx` 在 course 变化时做 **15 秒**防抖的 `writeBackToLocalFile` 写**本地课件文件**，并同时 `cleanupUnreferencedImages` 清理无引用图片；Ctrl+S 立即触发同一路径。`src/utils/storage.ts` 里的 `saveCourse` 是 localStorage 旧路径，目前仅 StartPage 还在用。没有 Redux，没有 Context 管 app 状态——直接动 store。

### sdk_baiya 在哪儿加载

`index.html` 在 React 启动**之前**同步引入 `/libs/GameLoader.max.js` 和 `/libs/sdk_baiya_base.js`（来自 `public/libs/`），保证 `core.ts` 跑起来时 `window.Laya` / `window.com.klzz.*` 已经就位。**别试图懒加载这两个文件**。

### 其他约定

- 所有 UI 文案是中文（zh-CN）。`src/i18n/` 和 `I18nProvider` 只是占位，组件和 `elementMeta` 里的中文字符串就是事实标准。
- `Element.props` 是开放的 `Record<string, unknown>`。`src/types/index.ts` 里 `Element` 接口还挂着一堆标了 "legacy" 的旧字段（`content`、`fontSize` 等），**不要往那里加新字段**——新字段一律放进 `props`，并在 `elementMeta.properties` 里声明。
- 加新组件时，通常**只需要改 `src/elements/elementMeta.ts`**（如果带默认皮肤再加 `builtinAssets.ts`）。工具栏、属性面板、导出流程都是从这份 metadata 读的。
- **占位规则**：凡是需要避免在画布上跑真实 sdk_baiya runtime 的组件（实例化会崩 / 自动播放 / 缩放动画干扰编辑），都在 meta 条目设 `placeholderImage: assetSrc(...)`，`createLayaComponent` 见到就把 `layaType` → `Image`。导出时仍然写真正的 `layaType`。当前 `CATEGORIES` 只有 `commonComponents`（常用组件）和 `speechCourse`（豌豆口才）两类，加新组件就归到这两类之一——不要往代码里假设别的分类名。
- `applyKlProps` 里皮肤生成路径靠 `skin` 字符串的**前缀**判断：`share/comp/...` 表示"用自动生成的默认皮肤"，其它（uploads、`data:image`、内置路径）按真实资源处理。

## 远程模式约束细则

远程模式下不能违反的几条：
- **所有新功能始终按远程模式设计**，不使用 `isLocalServer()` 本机模式优化路径
- `outputDir`（Electron 本机路径）**绝不能**发给远程 Vite 服务器——远程机器无法读取另一台机器的本地路径
- 客户端 `isLocalServer()` 检查 Vite URL 是否为 localhost——远程模式下 `outputDir: null`
- 大文件（视频等）通过 `POST /api/upload-resource`（multipart，100MB 限制）单独上传到 preview-server 课件目录
- Electron 本机磁盘副本始终通过 `copyLocalFile` IPC 从本地课程目录拷贝，不依赖远程服务器

## Electron 打包（electron-builder）注意事项

Electron 打包有 pnpm 符号链接 / 传递依赖 / ELECTRON_RUN_AS_NODE 等多个坑。改 build 配置或 `compile-build` IPC 前先看 [docs/electron-packaging.md](docs/electron-packaging.md)。

---

## 版本号

forge 使用语义化版本（SemVer），版本号写在 `package.json` 的 `version` 字段。
发版规则、版本号同步的三处显示、发版流程详见 [docs/versioning.md](docs/versioning.md)。

## 协作偏好（项目补充）

- **中等以上改动前先讲方案再动代码**。看到需求不要直接开干；需求对齐后可直接实施，不必每一步重复请示。
- **一律用中文回复，不要用英文**。包括对话回复、解释、总结、commit message、代码注释、文档。原文件是中文注释的跟着用中文，原文件是英文注释的也优先写中文。
- **如果需求有多种解读，全部列出来等我选**，不要默默挑一个；每轮优先只问一个最关键问题。
- **看到更简单的做法直接反驳**，不要顺着我做明显复杂的方案。
- **失败两次停下来讲根因**，不要小修小补反复试。
- **完成实施、测试和文档回写后，可直接 commit 和 push**，无需再确认。commit message 用中文，具体说明改了什么。强制推送、覆盖历史、删除数据等不可逆操作仍需先说明风险并确认。
- **不替我执行最终发布或生产部署**；准备好命令、前置条件和风险说明后，由我执行。

## 工具调用经验

- **写大段长文件用 PowerShell here-string + `Out-File`**，不要用 `Write` 工具。`Write` 工具在 Windows 平台上写入超过约 200 行的新文件时常常出现 `InputValidationError: required parameter missing`，反复重试都不会通过。绕过方式：用 `PowerShell` 工具，把内容塞进 `@'...'@` here-string，再 `| Out-File -FilePath <绝对路径> -Encoding utf8` 写出。计划文档（superpowers writing-plans）、设计文档这种长文件优先走这条路径。
- 已存在的文件做局部改动仍然用 `Edit`/`Read`，这条规则只针对"新建一个长文件"的场景。
