# Forge 配置与本机数据

本文列出环境变量、用户目录和被 Git 忽略的数据。变量名可以进入仓库，变量值、凭据和机器路径不能进入仓库。

## 环境变量

| 名称 | 使用位置 | 默认/来源 | 风险与交接动作 |
| --- | --- | --- | --- |
| `WS_SERVER` | `vite.config.ts`、同步预览 | 内置公司 WebSocket 地址；`.env` 可覆盖 | 指向打包机接口；交接时确认地址、可达性和反馈联系人，不写凭据 |
| `WS_HOST` | `vite.config.ts`、打包机拉取课件 | 内置公司服务地址；`.env` 可覆盖 | 打包机读取课件的目标地址；必须和部署网络匹配 |
| `SVN_BASE_NORMAL` | `/api/publish-config` | 正课默认基础地址；`.env` 可覆盖 | 会影响老师发布目标展示；变更前确认课型映射和 SVN 权限 |
| `SVN_BASE_HOMEWORK` | `/api/publish-config` | 默认复用正课基础地址 | 不要与正课路径产生重复课件层级 |
| `SVN_BASE_EVALUATION` | `/api/publish-config` | 专题测评默认地址 | 需要专题测评仓库权限和真实 URL 验收 |
| `SVN_BASE_REVIEW` | `/api/publish-config` | 复习课默认地址 | 需要复习课仓库权限和真实 URL 验收 |
| `FORGE_SVN_BINARY` | `electron/coursePublish.cjs` | 开发环境使用系统 `svn` | 只用于本地诊断或测试；正式 Windows 包使用内置 CLI，不用它远程提交 |
| `FORGE_TORTOISE_PROC` | `electron/coursePublish.cjs` | Windows 自动搜索 TortoiseProc | 仅用于验收定位 TortoiseSVN；不写账号参数，不提交真实路径 |
| `ELECTRON_RUN_AS_NODE` | Electron 子进程内部 | 编译 IPC 临时设置为 `1` | 不要从开发终端继承；否则 Electron 可能以 Node 模式启动 |
| `ESBUILD_BINARY_PATH` | Electron 编译准备 | 主进程按平台自动解析 | 只有排查打包机/符号链接问题时查看，不手动提交本机路径 |
| `npm_package_version` | Vite 注入 `__APP_VERSION__` | 来自 `package.json` | 版本号必须与 Tag、Release、安装包和部署记录一致 |

`.env.example` 只提供变量名和占位值。真正部署配置通过公司安全渠道注入，不能把内部凭据、证书或密码放入 `.env`、Issue、PR 或 Release。

## Electron 用户目录

Electron 使用 `app.getPath('userData')` 保存与课程内容分离的状态：

- `server_config.json`：最近成功使用的 Vite 服务地址。
- `course-publish-state.json`：课程发布确认、内容指纹和 SVN 提交后待通知状态。
- Agent 分支另有脱敏反馈报告和检查点目录；该能力尚未进入 `main`。

这些文件不能当作课程备份。迁移电脑时只在老师确认后迁移必要状态，并重新验证服务器地址、编辑器版本和课程指纹。

## 浏览器 localStorage

常见键包括：

- `forge_server_url`、`forge_teacher_id`
- `forge_course_dir_<courseId>`、`forge_course_file_<courseId>`
- `forge_custom_template_dir`
- `forge_focus_workspace_width`、图层面板布局、页面/元素展开状态
- `forge_lastFontLibraryId`、`forge_courses`（历史兼容数据）

它们只保存连接、路径指针和界面偏好，不是课程内容权威来源。清除后需要重新选择服务器、课程目录和模板目录。

## Git 忽略但运行必需的目录

| 路径 | 作用 | 交接要求 |
| --- | --- | --- |
| `public/builtin/library/` | 大型素材库 | 记录素材快照、来源和授权；部署前单独备份/同步 |
| `public/uploads/` | 开发上传内容 | 保留部署数据，不用 `git clean` 清理 |
| `preview-server/lessons/` | 预览编译课件 | 视为可重建缓存，但更新前保留可恢复副本 |
| `conf/`、`socket_baiya/conf/` | 服务配置、证书、数据库连接 | 只通过安全渠道交接，不能提交 |
| `release/` | 本地打包产物 | 不作为正式版本证据，正式安装包以 Release Asset 为准 |
| 课程目录、模板目录、SVN 工作副本 | 老师数据和外部发布 | 交接路径标识和备份，不写个人绝对路径 |

## 上线前配置检查

1. 复制 `.env.example` 为部署机自己的 `.env`，填入经过确认的 WebSocket、SVN 和打包服务值。
2. 启动前检查 Vite 端口、局域网可达性、素材快照和预览目录权限。
3. 在 Electron 中确认服务器地址实际连接成功；不要只看输入框里保存的旧值。
4. 在 Windows 包中确认内置 `svn-cli` 和 TortoiseSVN 定位均可用。
5. 对一个真实课程完成保存、资源读取、预览和发布前校验；真实 commit 需按发布授权另行执行。
6. 记录版本 Tag、素材快照、备份标识和回退点，不记录密码或完整个人路径。
