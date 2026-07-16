# forge AI 协作规则

本文件是 forge 仓库内所有 AI 开发工具的统一规则入口。适用于 Codex、Cursor、Claude Code、Gemini、OpenCode 及其他参与本项目的 Agent。不要在不同工具配置中复制本文件正文；工具确实无法读取 `AGENTS.md` 时，只允许增加指向本文件的薄适配入口。

## 开始任务前

1. 阅读关联的 GitHub Issue、本文和 Issue 指向的专项文档。
2. 检查 `.codegraph/`：存在时，理解或定位代码先使用 `codegraph explore`，再按需读取文件。
3. 检查当前分支、工作区和远端状态，不覆盖他人的未提交改动；发现已合并的本地任务分支时，按 `CONTRIBUTING.md` 完成清理后再开始新任务。
4. 确认当前分支符合 `<type>/<issue-number>-<short-name>`，禁止在 `main` 直接实施。
5. 能从项目确认的信息自行确认；存在影响产品目标、范围、体验或实施结果的多种解读时，每轮只询问一个最关键问题。

完整 GitHub 协作、提交与评审规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 实施原则

- 默认使用中文沟通、文档、提交信息和新增代码注释；代码标识符遵循项目现有英文命名。
- 中等以上改动先说明产品方案、影响范围、取舍和风险，需求对齐后再实施。
- 对齐后先更新承载本次决定的现有文档，再修改代码、配置或界面。
- 按用户可感知结果控制改动范围，不顺手重构无关模块。
- 优先复用项目现有模型、工具和模式，不引入重复状态源或平行实现。
- 两次尝试仍失败时，停止零散修补，说明根因、影响和可选路径。
- 完成后执行与风险匹配的自动检查和真实体验验收，并回看文档是否仍准确。
- AI 可以提交、推送功能分支并创建 PR；不能直接推送或自行绕过保护规则合并 `main`。
- PR 合并后必须同步 `main`，确认没有未推送成果，再删除对应的本地任务分支；不能把已合并分支长期留在本机。
- 不执行最终生产发布。准备命令、前置条件和风险后交由项目负责人执行。

## 命令

包管理固定使用 pnpm 10，禁止使用 npm 或 yarn。Node.js 使用 22 LTS。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm electron:dev
pnpm test
pnpm build
pnpm lint
```

命令用途和当前检查状态见 [docs/commands.md](docs/commands.md) 与 [docs/testing.md](docs/testing.md)。

## 部署形态与远程模式

forge 是 Electron 桌面应用，Vite 既是开发页面服务器，也是预览资源和 `/api/*` 接口的开发后端。典型部署是电脑 A 运行 Vite，电脑 B 运行 Electron。

所有新功能必须遵守：

- 始终按远程模式设计，不增加只对 localhost 生效的产品能力。
- `outputDir` 是 Electron 客户端本机路径，绝不能发送给远程 Vite。
- 远程模式下客户端传给 Vite 的 `outputDir` 必须为 `null`。
- 视频等大文件通过 `POST /api/upload-resource` 单独上传，当前限制为 100MB。
- Electron 本机课件副本通过 `copyLocalFile` IPC 处理，不依赖远程服务器读取本机路径。
- Vite API 只存在于 `pnpm dev`，`pnpm build` 产物是纯静态 SPA。

改远程服务、API、课件动态路由或预览代理前先读 [docs/dev-server.md](docs/dev-server.md)。

## 核心架构

### 状态管理

- 全局状态只使用 `src/store/editorStore.ts` 的 Zustand store，不增加 Redux 或新的全局 Context。
- `Element.props` 是开放属性字典。新组件字段放入 `props`，并在 `src/elements/elementMeta.ts` 声明；不要向 `src/types/index.ts` 的 legacy 字段继续加属性。
- `App.tsx` 对课程变化做 15 秒防抖写回本地课件文件，并清理无引用图片；Ctrl+S 立即走同一路径。
- `src/utils/storage.ts` 的 localStorage 保存方式是旧路径，不用于新功能。

### 编辑模式与预览模式

- `src/utils/laya/core.ts` 持有 Laya 对象单例 map 和 `_previewMode`。
- 编辑模式会把可能崩溃、自动播放或干扰编辑的 sdk_baiya 组件替换成轻量占位组件；逻辑位于 `src/utils/laya/components.ts` 的 `createLayaComponent`。
- 预览模式通过 `setPreviewMode(true)` 实例化真实组件。
- `applyKlProps` 必须在 `skin` 前应用 `stateNum` 和 `sizeGrid`，因为 sdk_baiya 的 `skin` 赋值会触发内部渲染。
- `index.html` 在 React 启动前同步加载 `/libs/GameLoader.max.js` 和 `/libs/sdk_baiya_base.js`，不要改为懒加载。

### 元素与组件元数据

- 所有组件统一声明在 `src/elements/elementMeta.ts`。
- 新组件通常只修改 `elementMeta.ts`；需要默认资源时再修改 `src/elements/builtinAssets.ts`。
- `runtime`、`exportChildren`、`exportWrapper` 和 `placeholderImage` 是导出及编辑占位能力，不创建旁路实现。
- `_` 前缀属性只用于编辑器皮肤生成，导出前必须剥离。
- 当前分类只有 `commonComponents` 和 `speechCourse`，不要假设存在其他分类。
- `share/comp/...` 皮肤前缀表示自动生成默认皮肤，其他路径按真实资源处理。

### 特殊组件规则

- `TextInput`、`DragViewBox`、`DropObj` 编辑时用 `Box` 占位。
- `TextArea` 编辑时用 `Label` 占位；`NewTextArea` 导出时由 `bakeTextElements()` 烘焙成 PNG，最终课件不包含 `TextArea`。
- `SoundButton` 编辑时用 `Image` 占位。
- `Spine` 编辑时使用原生 `Laya.Skeleton`，避免 sdk 组件自动重播。
- 带 `meta.placeholderImage` 的组件编辑时统一使用 `Image`。

### 内置资源

- 不在代码中硬编码内置资源路径。
- 资源放在 `public/builtin/`，并在 `src/elements/builtinAssets.ts` 注册。
- 编辑器使用 `assetSrc(id)`，导出课件路径使用 `assetExport(id)`。
- `public/builtin/editor/` 只供编辑器使用；`public/builtin/runtime/` 同时供编辑器和发布课件使用。
- `public/builtin/runtime/game/` 新增文件后必须执行 `pnpm pack-game` 更新 `game.zip`。
- `public/builtin/library/` 默认不入 Git，依赖素材库的任务必须确认本机资源版本和来源。

### 导出与模板

- 发布工程和预览都从 `src/utils/exportProject.ts` 进入，可能生成 `Game1_LT`、`Game1_HW` 和 `Game1_PREVIEW`。
- 改导出前先读 [docs/export-pipeline.md](docs/export-pipeline.md)。
- 自定义模板存放在用户选择的本地目录，按 MD5 去重，不存入 localStorage。
- 改模板前先读 [docs/custom-templates.md](docs/custom-templates.md) 和相关阶段/Issue 文档。

### Electron 打包

改 `electron-builder`、依赖打包或编译 IPC 前先读 [docs/electron-packaging.md](docs/electron-packaging.md)。pnpm 符号链接、传递依赖和 `ELECTRON_RUN_AS_NODE` 已有明确处理，不凭经验重写。

## 测试与完成标准

- 最低合并检查是 `pnpm lint`、`pnpm test` 和 `pnpm build`。
- lint 错误必须修复，不能通过关闭规则、扩大 ignore 或降级类型约束规避。
- 画布、Electron、本地文件、预览、导出和视觉改动必须补充真实体验验收。
- 报告测试覆盖了什么、未覆盖什么、已知限制和 Rex 的验收路径，不能只说“测试通过”。
- PR 必须关联 Issue，并使用 Squash Merge；提交与 PR 标题遵循 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 不可逆操作

强制推送、覆盖历史、删除数据、生产迁移和其他明显不可逆操作，必须先说明风险并获得明确确认。任何时候都不要用破坏性命令处理未知来源的工作区改动。
