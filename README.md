# forge

forge 是面向豌豆思维课件制作的 Electron 桌面编辑器。编辑器使用 React 管理操作界面和课程状态，通过 LayaAir 与 `sdk_baiya` 渲染课件组件，并将结果导出为 GameLoader 可运行的课件工程。

当前版本：`1.1.0`

## 开发前须知

- 项目是 Electron 客户端与远程 Vite 开发服务器配合运行的桌面应用。
- Vite 同时承载前端页面、预览静态资源和 `/api/*` 开发接口，不是生产服务器。
- 所有功能必须支持“电脑 A 运行 Vite，电脑 B 运行 Electron”的远程模式。
- Electron 本机路径不能发送给远程 Vite 服务器。
- 项目包管理器固定为 pnpm 10，不使用 npm 或 yarn。

AI 开发前必须先阅读 [AGENTS.md](./AGENTS.md)，开发者协作流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 环境要求

- Git
- Node.js 22 LTS
- pnpm 10（建议通过 Corepack 启用）
- macOS 或 Windows
- Electron 真实体验验收所需的课件目录和可访问的 Vite 服务

## 首次安装

```bash
git clone https://github.com/RexYoung000/editor.git
cd editor
corepack enable
pnpm install --frozen-lockfile
```

仓库是私有仓库。新成员克隆前需要由仓库所有者添加为 Collaborator。

## 本地开发

先启动 Vite 开发服务器：

```bash
pnpm dev
```

默认地址为 `http://localhost:6688`。浏览器可用于基础界面调试，但涉及本地文件、课件目录、预览发布和 Electron IPC 的功能必须在 Electron 中验收。

另开终端启动 Electron：

```bash
pnpm electron:dev
```

在启动窗口中填写 Vite 地址。远程协作时填写开发服务器的局域网或可访问网络地址，例如 `http://192.168.1.20:6688`。

## 提交前检查

```bash
pnpm lint
pnpm test
pnpm build
```

三项检查均为 PR 合并前的必需检查，并由 GitHub Actions 自动执行。

## 协作入口

所有开发任务采用以下流程：

1. 从 [forge 编辑器迭代看板](https://github.com/users/RexYoung000/projects/1) 领取“可领取”且无负责人的 Issue，并转为“开发中”。
2. 从最新 `main` 创建短期分支。
3. 先同步相关文档，再实施代码或配置。
4. 完成自动测试和真实界面验收。
5. 推送分支并创建关联 Issue 的 PR，将任务转为“评审中”。
6. 自动检查通过、评审完成后 Squash 合并；GitHub 关闭 Issue，负责收尾的开发者或 AI 将看板转为“已完成”。
7. 合并后同步 `main`，确认成果完整，并删除远端及本地任务分支。

详细规则见 [CONTRIBUTING.md](./CONTRIBUTING.md)。禁止直接向 `main` 推送功能改动。

当前私有仓库使用 GitHub Free，平台暂时不能强制启用 Branch Protection；升级前由团队按同一规则自律执行，限制与后续处理见 CONTRIBUTING 的“当前 GitHub 执行状态”。

## 文档导航

- [开发环境](./docs/development.md)：安装、启动、远程模式和常见问题。
- [命令清单](./docs/commands.md)：项目脚本说明。
- [系统架构](./docs/architecture.md)：当前真实架构和关键边界。
- [测试与验收](./docs/testing.md)：自动检查和人工验收要求。
- [版本管理](./docs/versioning.md)：SemVer、Tag 和发布流程。
- [正式发板与内部部署](./docs/internal-deployment.md)：Windows 安装包、GitHub Release、公司台式机、老师端更新和回退流程。
- [导出流程](./docs/export-pipeline.md)：预览、发布和课件工程生成。
- [开发服务器](./docs/dev-server.md)：Vite middleware、路由和 API。
- [自定义模板](./docs/custom-templates.md)：本地模板存储与资源去重。
- [迭代路线](./docs/roadmap/editor-iteration-roadmap.md)：阶段目标和 Issue 拆解依据。
- [代码健康治理](./docs/roadmap/code-health-refactoring.md)：核心风险、渐进式重构顺序和后续复评机制。

## 项目结构

```text
src/                    React 编辑器、状态管理和导出逻辑
electron/               Electron 主进程、preload 和本地文件 IPC
public/libs/            LayaAir、GameLoader 和 sdk_baiya 运行时
public/builtin/         编辑器与课件导出的内置资源
public/preview-game/    发布预览页面
scripts/                测试与资源打包脚本
tests/                  Node 单元测试
docs/                   架构、流程、设计和迭代文档
.github/                Issue、PR、CODEOWNERS 和 CI 配置
```

## 发布边界

普通开发 PR 不升级版本，也不执行最终发布。准备发布时单独创建版本 Issue 和发布 PR，完成版本号、测试、Electron 打包、Tag 与 GitHub Release。公司台式机只部署正式 Release 对应的 Tag；安装包、素材库、老师端交付、更新和回退按 [正式发板与内部部署](./docs/internal-deployment.md) 执行。最终生产发布由项目负责人执行。
