# Forge 交接架构图

本文给接手人提供当前系统的责任边界和数据地图。组件、导出规则和发布细节仍以 `docs/` 下对应专项文档为准。

## 产品与运行模型

Forge 是面向豌豆思维课件制作的 Electron 桌面编辑器。React 管理编辑界面和课程状态，LayaAir 与 `sdk_baiya` 渲染课件组件，Electron 访问老师电脑上的文件并执行本地编译，Vite 开发服务提供编辑器页面、资源库、预览上传和 GameLoader 路由。

```text
老师 / 维护者
  -> Windows 或 macOS Electron
       -> 远程 Vite 页面（通常是公司局域网）
       -> 本机课程目录、模板目录、编译工具和发布状态
            -> GameLoader 预览
            -> 本地 SVN 文件夹 + TortoiseSVN
                 -> 现有打包机
```

Vite 不是独立生产后端。`pnpm build` 只生成静态 SPA；课程预览、资源库和发布配置依赖 `pnpm dev` 注册的 middleware。

## 组件与所有权

| 组件 | 主要入口 | 持有的数据或副作用 |
| --- | --- | --- |
| React 编辑器 | `src/App.tsx`、`src/components/*` | 用户操作、界面状态、课程编辑意图 |
| Zustand store | `src/store/editorStore.ts` | 当前课程、页面、元素、动作、选择和 50 步历史的唯一全局状态 |
| Laya 桥接 | `src/utils/laya/*`、`src/elements/elementMeta.ts` | 真实画布对象、编辑/预览模式、组件元数据 |
| 导出器 | `src/utils/exportProject.ts`、`src/utils/exportPreviewProject.ts` | Laya 工程、场景、脚本、配置、资源映射 |
| Electron 主进程 | `electron/main.cjs`、`electron/preload.cjs` | 文件选择与写盘、本地协议、编译、发布 IPC、用户目录状态 |
| Vite 服务 | `vite.config.ts` | `/api/*`、资源库、预览上传、课件动态路由 |
| GameLoader | `preview-server/`、`public/libs/` | 加载编译后的课件并执行 Laya/sdk 运行时 |
| 发布服务 | `electron/coursePublish.cjs`、`src/utils/coursePublishing.ts` | 本地 SVN 映射、发布身份、TortoiseSVN 提交、打包通知 |

## 数据地图

| 数据 | 权威位置 | 是否进入 Git | 恢复与风险 |
| --- | --- | --- | --- |
| 课程内容 | 老师选择的课程目录：课程 JSON + `images/` | 否 | 必须单独备份；localStorage 不是课程权威来源 |
| 编辑会话状态 | renderer 内存中的 Zustand store | 否 | 15 秒自动保存和显式保存写回课程目录 |
| 课程路径映射、界面偏好 | 浏览器 localStorage | 否 | 可以重建，但丢失后需要重新选择课程/模板目录 |
| 服务器地址 | Electron `userData/server_config.json`；页面也保存 `forge_server_url` | 否 | 重装、换用户或清理用户目录后需重新配置 |
| 发布确认与待通知任务 | Electron `userData/course-publish-state.json` | 否 | 内容或环境指纹变化会使确认失效 |
| 外置素材库 | Vite 机器的 `public/builtin/library/` | 默认否 | 必须有独立快照和来源记录 |
| 上传与预览结果 | `public/uploads/`、`preview-server/lessons/` | 否 | 部署更新时保留；不是长期课程备份 |
| 内置 runtime | `public/builtin/runtime/`、模板目录与生成 ZIP | 是 | 修改后按对应脚本重新打包并回归所有课型 |
| 正式发布工程 | 老师选择的本地 SVN 文件夹与远端 SVN | 否 | 由 `forge-publish.json` 和实际 revision 标识 |

## 信任边界

1. **浏览器页面到 Electron IPC**：renderer 不能直接使用 Node；preload 只暴露受控 API。所有文件路径在主进程再次校验。
2. **Electron 到远程 Vite**：Electron 本机路径和 `outputDir` 不发送给服务器；远程需要的二进制通过上传接口传递。
3. **局域网客户端到 Vite**：API 做路径隔离但没有身份认证。网络本身是部署前提，不是代码内授权系统。
4. **编辑器到课程目录**：课程 JSON 是用户数据；另存、覆盖、符号链接和目录嵌套必须在写盘前检查。
5. **编辑器到 SVN**：内置 CLI 只做本地检查和整理；远程提交由老师在 TortoiseSVN 窗口确认，Forge 不保存 SVN 密码。
6. **SVN 到打包机**：只有提交后核验身份、revision 和工程 URL 成功，才发送 `integrationRequest`；通知成功不等于打包完成。
7. **维护者到 GitHub/部署机**：GitHub、公司服务器、素材快照和发布权限属于组织流程，不由应用内权限系统管理。

## 权限与后台能力说明

- 应用没有用户登录、Token、角色表、数据库或行级权限；权限主要来自本机 OS 用户、公司网络和外部系统账号。
- 没有自动邮件、定时任务、SEO 页面或公共索引路由，因此不建立 `emails.md`、`cron.md` 或 `seo.md`。
- 当前 `main` 没有内置 AI Agent；本机 Issue #161 分支增加的 stdio MCP 仍是待评审成果，见 [自动化边界](./automation.md)。

## 已知风险与假设

- `vite.config.ts` 同时承担开发服务器和业务 API，进程守护、访问控制和观测能力有限。
- LayaAir、GameLoader、`sdk_baiya`、模板 ZIP 和 runtime 资源必须配套；单改一处容易产生编辑器可见但真实课件缺资源的问题。
- 部分关键流程只能在 Windows、公司 SVN、打包机和双机局域网中验证，CI 无法模拟完整环境。
- 大型素材、课程、预览内容与 Electron 用户目录都不在 Git；仓库完整不等于可运行环境完整。
- GitHub Project 与 Release 状态会变化，交接文档只记录核对时间点，不替代实时查询。

## Related Documents

- [项目交接总览](./handoff.md)
- [关键运行流程](./flows.md)
- [权限与责任矩阵](./permissions.md)
- [配置与本机数据](./variables.md)
- [自动化与 Agent](./automation.md)
- [验证地图](./tests.md)
- [项目系统架构](../docs/architecture.md)
- [开发服务器](../docs/dev-server.md)
- [导出流程](../docs/export-pipeline.md)
- [老师课件发布](../docs/course-publishing.md)
- [正式发板与内部部署](../docs/internal-deployment.md)
