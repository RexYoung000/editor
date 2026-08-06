# Forge 项目交接总览

本文是新负责人的第一阅读入口。它区分已经进入 `main` 的产品事实、本机尚未交付的成果、外部系统状态和历史资料；任何带有“待刷新”或“未验证”的内容都不能解释为已完成。

## 当前产品基线

| 项目 | 已核对状态 | 接手判断 |
| --- | --- | --- |
| 本地 `main`、`origin/main` 与 Tag | 均指向 `v1.5.1`，提交 `f624a9e` | 这是当前本地可证明的代码基线 |
| 产品形态 | React + LayaAir 编辑界面、Electron 本机能力、Vite 开发服务、GameLoader 运行时 | 不是纯网页，也没有独立生产后端 |
| 环境 | Node.js 22 LTS、pnpm 10 | 不使用 npm 或 yarn |
| 正式运行 | 公司台式机运行明确 Release Tag 的 `pnpm dev`，老师电脑运行匹配的 Windows Electron 客户端 | 静态 `pnpm build` / `pnpm preview` 不能替代服务 |
| 当前版本外部验收 | 仓库记录仍把 v1.5.1 Windows 安装、升级、局域网发布和公司环境部署列为待验证 | 不得仅凭 Tag、构建或安装包宣称已部署 |
| GitHub 当前状态 | 交接整理时 GitHub API 无法连接 | PR、Issue、Project、Release、Actions 和安装包必须重新查询 |

版本范围与剩余验收见 [v1.5.1 发布记录](../docs/releases/v1.5.1.md)。正式部署只按 [内部部署流程](../docs/internal-deployment.md) 执行。

## 未进入主线的本机成果

### Issue #161 Agent 作业 MCP

- 本地分支：`feat/161-agent-homework-mcp`
- 本地提交：`b7060a2 feat(agent): 支持通过 Forge MCP 制作可审核作业草稿`
- 分支起点：`v1.5.0`，没有包含 `main` 后续的 v1.5.1 发布摘要热修复。
- 远端状态：没有上游分支，尚未推送、创建 PR 或进入评审。
- 本地验证记录：Skill 校验通过，`pnpm lint`、342 项单元测试和 `pnpm build` 通过；真实 Electron POC 可以显示六道填空题并打开 GameLoader。
- 产品边界：只能创建、修改、截图、校验和预览 AI 作业草稿；六道推导答案保持待老师确认，MCP 不能审核、SVN 提交或发布。

接手时不要直接把该分支合并到 `main`。先基于 v1.5.1 rebase 或重建分支，重点复核 `electron/main.cjs`、`electron/preload.cjs`、`electron/coursePublish.cjs`、`src/utils/coursePublishing.ts` 和发布测试的冲突，确保不会回退 #163 的局域网 HTTP 摘要修复。然后重新执行 MCP 协议测试、完整自动检查和真实 Electron POC。

该分支还保留一份未提交的 `docs/action-system.md` 两行改动，描述 `onInputJudge` 自动判定和答对后锁定范围。来源和归属尚未确认；接手人应先确认对应需求或 Issue，再决定独立提交或保留，不能随分支清理一起删除。

Agent POC、PDF 和裁图是本机验收材料，不在 Git 中。需要继续该功能时，应通过安全的内部交接取得样例，或根据 Issue #161 和老师再次授权的原始资料重建；不要把个人绝对路径写入仓库。

### 旧 worktree

本机还存在 `editor-issue-147` worktree，处于 detached HEAD `155a55e`，检查时工作区干净。该提交已经出现在 `main` 历史中，但在确认没有工具或人工流程仍引用该目录前不要删除。清理前再次执行 `git worktree list` 和目标目录的 `git status`。

## 新负责人第一天

1. 取得 GitHub 私有仓库、Project #1、Issues、PR、Actions 和 Releases 的访问权限。
2. 确认 CODEOWNERS、合并审核人和最终发布责任人，不继续只依赖离任负责人。
3. 取得公司台式机、Windows 验收机、TortoiseSVN、本地 SVN 文件夹、打包机和素材快照的合规访问方式；凭据通过公司安全渠道交接，不写入 Git。
4. 从干净目录克隆仓库，执行 `corepack enable`、`pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm test` 和 `pnpm build`。
5. 启动 `pnpm dev` 与 `pnpm electron:dev`，在 localhost 和另一台电脑的局域网地址各完成一次课程打开、保存和预览。
6. 重新查询远端状态，不依赖本文的时间点快照：

```bash
git fetch --tags --prune origin
git branch -vv
git worktree list
gh pr list --state open --limit 100
gh issue list --state open --limit 100
gh project item-list 1 --owner RexYoung000 --limit 200 --format json
gh release list --limit 20
gh run list --limit 20
```

7. 对照 Project #1 选择实际“可领取”、无人负责且依赖满足的 Issue，再按 [CONTRIBUTING.md](../CONTRIBUTING.md) 开始工作。
8. 单独决定 Issue #161 的继续、移交或终止方式，不让未推送本地成果长期成为唯一副本。

## 需要原负责人完成的权限交接

| 范围 | 必须完成的动作 | 不应写入仓库的内容 |
| --- | --- | --- |
| GitHub | 添加新负责人并授予所需仓库与 Project 权限；通过 PR 更新 CODEOWNERS | Token、SSH 私钥、个人恢复码 |
| 发布 | 明确谁能创建 Tag、Release、触发 Windows workflow 和上传安装包 | GitHub 凭据 |
| 公司服务 | 交接部署机登录、服务启动方式、备份位置、当前 Tag 和回退点 | 真实 IP 之外的凭据、证书、密码 |
| SVN | 交接 TortoiseSVN 安装、仓库权限和本地工作目录规则 | SVN 账号密码、SASL 凭据 |
| 打包机 | 交接 WebSocket 地址、反馈渠道、故障联系人和成功判定 | 内部凭据或个人联系方式明文 |
| 素材与样例 | 交接 `public/builtin/library/` 对应快照、代表性课程和授权范围 | 未授权课程内容、个人桌面路径 |

## 当前主要风险

1. Vite `/api/*` 没有登录和网络鉴权，只能部署在受控公司网络，不能直接暴露公网。
2. 公司服务没有仓库内的 Windows 服务、守护或自动重启方案；`pnpm dev` 进程退出即中断老师使用。
3. 大型素材库、上传内容、预览课程、本机课程和发布状态不随 Git；只克隆代码不能复原完整环境。
4. LayaAir 与 `sdk_baiya` 通过全局脚本加载，初始化顺序、模板 ZIP、运行资源和 GameLoader 之间存在强耦合。
5. 自动测试和静态构建不能替代 Electron、本地文件、双机远程模式、Windows 安装、公司 SVN 和打包机验收。
6. 私有仓库在现有套餐下没有强制 Branch Protection，禁止直接推送 `main` 目前主要依赖协作纪律。
7. `docs/roadmap/*` 和 GitHub Issue 状态会变化；路线文档只解释依赖，Project #1 才是领取与执行状态来源。

## 文档可信度

当前实施以 [AGENTS.md](../AGENTS.md)、[CONTRIBUTING.md](../CONTRIBUTING.md)、[系统架构](../docs/architecture.md)、[测试与验收](../docs/testing.md)、[内部部署](../docs/internal-deployment.md)、[发布流程](../docs/course-publishing.md) 和本目录文档为准。

根目录 `RELEASE.md`、`PUBLISH_FLOW.md`、`ELECTRON_BUILD.md`、`SYNC_FLOW_COMPLETE.md`，以及 `docs/review.md`、`docs/user-audit.md`、`docs/milestones.md` 是历史资料。它们可用于理解演进，但其中的版本、流程、功能完成度、性能数字和发布结论不能作为当前事实。

## 禁止事项

- 不在部署目录执行 `git clean`，也不删除来源不明的本地分支、worktree 或未提交修改。
- 不把 `main`、某个提交或一次构建当成正式版本；正式版本必须是已发布的 `vX.Y.Z` Tag 和 GitHub Release。
- 不把预览生成、SVN 提交、通知已发送和打包完成混写成同一个“发布成功”。
- 不把 Electron 本机路径发送给远程 Vite，不把课程、凭据、证书或素材快照提交到 Git。
- 不在没有 v1.5.1 回归的情况下交付 Issue #161。

## 交接完成标准

新负责人能够独立完成以下操作，才算真正接手：

- 访问并维护仓库、Project、Issue、PR、Actions 与 Release。
- 在干净环境启动 Vite 和 Electron，打开、保存、预览一个真实课程。
- 说明哪些数据在 Git、Electron 用户目录、课程目录、资源服务器和 SVN 中。
- 说明老师审核、SVN 提交、打包通知和产品版本发布各自的责任边界。
- 知道 v1.5.1 的外部验收缺口、Issue #161 的本地状态以及安全回退方式。
