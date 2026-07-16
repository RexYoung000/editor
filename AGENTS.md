# forge AI 协作规则

本文件是 forge 仓库内所有 AI 开发工具的统一入口。它只保留长期有效的任务契约、项目不变量和文档路由；GitHub 协作细节以 [CONTRIBUTING.md](CONTRIBUTING.md) 为准，专项实现细节以对应 `docs/` 文档为准。

## 目标与授权边界

- 以用户可感知结果为目标，确保需求、文档、代码和真实产品表现一致。
- 查询、解释、评审、诊断或规划任务：检查相关事实并汇报，不擅自修改项目。
- 修改、修复或建设任务：在已对齐范围内先同步相关文档，再完成实施和必要验证，不因普通步骤反复请求许可。
- 最终生产发布、强制推送、覆盖历史、删除数据、生产迁移或明显扩大任务范围，必须先说明影响并取得明确确认。
- 能从仓库确认的信息自行确认；存在影响产品目标、范围、体验或实施结果的多种解读时，每轮只询问一个最关键问题。
- 同一问题连续两次尝试仍失败时，停止零散修补，说明根因、影响和可选路径。

## 开始任务前

1. 阅读关联 GitHub Issue、[forge 编辑器迭代看板](https://github.com/users/RexYoung000/projects/1)、本文和 Issue 指向的专项文档；领取任务前确认状态为“可领取”、没有负责人且依赖已满足。
2. 检查当前分支、工作区和远端状态，不覆盖来源不明的改动；发现已合并的本地任务分支时，先按 `CONTRIBUTING.md` 完成清理。
3. 确认不在 `main` 上实施，并使用 `<type>/<issue-number>-<short-name>` 短期分支。
4. `.codegraph/` 存在时，理解或定位代码先使用 `codegraph explore`，再按需读取文件或使用 `rg`。
5. 中等以上改动先说明用户结果、影响范围、主要取舍和风险；无实质疑问后主动推进。

## 实施与完成标准

- 默认使用中文沟通、文档、提交信息和新增代码注释；代码标识符遵循现有英文命名。
- 优先复用现有状态源、模型、工具和模式，不建立平行实现，不顺手重构无关模块。
- 先把已经对齐的决定写入实际承载它的现有文档，再修改代码、配置或界面；实施产生的新限制必须回写。
- 验证强度与改动风险匹配。最低合并检查是 `pnpm lint`、`pnpm test` 和 `pnpm build`；不得通过关闭规则、扩大 ignore 或降低类型约束制造通过。
- 画布、Electron、本地文件、预览、导出和视觉改动必须增加真实体验验收，说明入口、路径、结果和未覆盖场景。
- 完成意味着用户结果、文档和实现一致，必要检查通过，改动已用中文提交并推送短期分支，PR 已关联 Issue。AI 不自行合并 `main`，也不执行最终生产发布。

## 环境与命令

Node.js 使用 22 LTS，包管理固定使用 pnpm 10，禁止使用 npm 或 yarn。

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm electron:dev
pnpm lint
pnpm test
pnpm build
```

命令用途见 [docs/commands.md](docs/commands.md)，测试与真实体验要求见 [docs/testing.md](docs/testing.md)。

## 项目不变量与文档路由

### 远程模式与开发服务器

- 始终按“电脑 A 运行 Vite、电脑 B 运行 Electron”设计，不增加只对 localhost 成立的产品能力。
- `outputDir` 是 Electron 客户端本机路径，不能发送给远程 Vite；远程请求必须传 `null`。
- 大文件通过 `POST /api/upload-resource` 上传，Electron 本机文件副本通过 `copyLocalFile` IPC 处理。
- Vite API 只存在于 `pnpm dev`；`pnpm build` 是纯静态 SPA。
- 改远程服务、API、课件路由或预览代理前阅读 [docs/dev-server.md](docs/dev-server.md)。

### 状态、元素与运行时

- 全局状态以 `src/store/editorStore.ts` 的 Zustand store 为唯一来源，不增加 Redux 或新的全局 Context。
- 新组件字段进入 `Element.props`，并统一在 `src/elements/elementMeta.ts` 声明；不向 legacy 类型字段继续加属性，也不建立第二套组件元数据。
- 编辑模式、预览模式、sdk_baiya 组件占位、属性应用顺序和特殊组件规则见 [docs/sdk-baiya-components.md](docs/sdk-baiya-components.md)；系统状态边界见 [docs/architecture.md](docs/architecture.md)。

### 内置资源

- 不在业务代码中硬编码内置资源路径。资源在 `public/builtin/` 存放并由 `src/elements/builtinAssets.ts` 注册，编辑器和导出分别使用 `assetSrc(id)` 与 `assetExport(id)`。
- `public/builtin/editor/` 只供编辑器使用，`public/builtin/runtime/` 同时供编辑器和课件使用；修改 `public/builtin/runtime/game/` 后必须运行 `pnpm pack-game`。
- `public/builtin/library/` 默认不入 Git；依赖素材库的任务必须确认本机资源版本和来源。
- 详细规则见 [docs/resource-management.md](docs/resource-management.md) 和 [docs/commands.md](docs/commands.md)。

### 导出、模板与打包

- 发布工程和预览统一从 `src/utils/exportProject.ts` 进入。改导出前阅读 [docs/export-pipeline.md](docs/export-pipeline.md)。
- 自定义模板保存在用户选择的本地目录并按 MD5 去重，不使用 localStorage。改模板前阅读 [docs/custom-templates.md](docs/custom-templates.md) 和关联阶段或 Issue 文档。
- 改 `electron-builder`、依赖打包或编译 IPC 前阅读 [docs/electron-packaging.md](docs/electron-packaging.md)，不要绕开现有 pnpm 符号链接、传递依赖和 `ELECTRON_RUN_AS_NODE` 处理。

## GitHub 协作入口

Issue 拆分、Project 状态、任务领取、分支、提交、检查、PR、评审、合并、本地分支清理和版本发布均遵循 [CONTRIBUTING.md](CONTRIBUTING.md)。一个 Issue 对应一个短期分支和一个 PR；AI 在领取时同步“开发中”，创建 PR 后同步“评审中”，阻塞时记录原因并同步“已阻塞”，PR 合并收尾后同步“已完成”，但不自行改变产品范围、优先级或里程碑。
