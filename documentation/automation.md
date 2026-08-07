# Forge 自动化与 Agent 边界

本文区分当前 `main` 已存在的外部自动化和本机未合并的 Agent MCP，防止接手人把实验能力当成已交付产品。

## 当前 main 的自动化

### Vite 开发服务

`vite.config.ts` 在 `pnpm dev` 时注册：

- 课件预览静态代理和动态 lesson 路由。
- `/api/upload-compiled-zip`：接收 Electron 编译 ZIP，验证后替换预览目录。
- `/api/upload-resource`：把远程 Electron 的大文件写入已登记的 lesson 目录。
- `/api/library/*`：资源库列举、搜索、hash、Spine 文件和快捷预设。
- `/api/publish-config`：返回只读课型 SVN 基础地址和版本信息。
- `/api/ws-config`：返回打包机 WebSocket 地址和拉取课件地址。

这些接口没有应用登录或 Token 鉴权，路径校验不等于访问控制；只能在受控公司网络运行。

### 发布通知

老师完成 TortoiseSVN commit 且本地身份、revision 和工程 URL 核验通过后，renderer 通过现有 `integrationRequest` 通知打包机。通知发送、打包完成反馈和老师界面最终状态是不同阶段；提交成功但通知失败时允许只重试通知，不重复 SVN 提交。

当前没有 cron、队列、自动邮件、Webhook 或后台守护进程。Vite 进程退出后，页面、资源库、预览上传和发布配置都会不可用。

## 待评审 Agent MCP（只在本机 #161 分支）

### 触发与所有者

- 触发：老师在 Codex、Claude Code、OpenCode 或 WorkBuddy 中提出作业制作/修改要求。
- 所有者：老师的 Agent；Forge 只提供本机 stdio MCP 和 renderer 事务桥接。
- 当前状态：本地提交 `b7060a2`，未推送、未评审、未进入 v1.5.1 `main`。
- Skill：`agent/skill/forge-homework-authoring/SKILL.md`；能力和参数必须从当前 MCP manifest 动态发现。

### 工具表

| 类别 | 工具 |
| --- | --- |
| 发现与兼容 | `forge_get_manifest`、`forge_list_capabilities`、`forge_get_capability_changes`、`forge_check_compatibility`、`forge_get_tool_guidance` |
| 工作区与草稿 | `forge_get_setup_status`、`forge_configure_workspace`、`forge_create_homework_draft`、`forge_open_agent_draft`、`forge_get_editor_state` |
| 事务 | `forge_begin_transaction`、`forge_commit_transaction`、`forge_rollback_transaction`、`forge_list_checkpoints`、`forge_restore_checkpoint` |
| 作业题目 | `forge_list_homework_presets`、`forge_add_homework_question`、`forge_update_homework_question`、`forge_remove_homework_question`、`forge_reorder_homework_questions` |
| 素材 | `forge_search_library`、`forge_import_library_image`、`forge_import_authorized_image` |
| 验证与预览 | `forge_validate_draft`、`forge_capture_page`、`forge_open_preview` |
| 失败与反馈 | `forge_check_requirement_support`、`forge_diagnose_failure`、`forge_get_known_issues`、`forge_create_feedback_report`、`forge_export_reproduction_bundle` |

### 硬约束与输出

- MCP 是本机 stdio，不监听公网或局域网端口；课程 JSON 不允许被工具直接读写。
- Agent 会话先锁定 `editorVersion`、`mcpApiVersion`、`skillVersion`、`courseSchemaVersion` 和 `capabilityRevision`；变化后必须重连。
- 同一草稿同时只有一个写租约；老师手动修改后旧租约失效。
- 每轮修改使用事务，提交前生成检查点，失败整轮回滚。
- 作业 ID 必须以 `_hw` 结尾；一个关卡只放一道题。
- PDF/参考图只在老师明确授权后导入；资源库未命中时可裁取必要题图，但题干仍保持可编辑。
- Agent 推导答案必须保留 `answerConfirmed=false`，校验结果必须阻塞老师审核。
- 工具表不含审核确认、SVN、发布、部署或任意课程 JSON 写入能力。
- Agent 无法满足需求时必须分类失败并生成脱敏反馈报告，不能掩盖成“已完成”。

### 当前控制缺口

- MCP 的限流、跨机器多用户认证、长期审计日志和生产分发仍未建立。
- Agent POC 的真实 Electron 预览已验证，但四端配置产物、客户端升级策略和 Windows 安装包内置验证尚未进入主线评审。
- 合并前必须先处理 v1.5.1 与 #161 的发布 IPC 冲突，并重新确认 Skill 版本/能力修订策略。

## 停止和回退

停止 Agent：关闭 MCP stdio 会话即可阻止新调用；当前事务失败时先 rollback。编辑器升级或能力修订变化时不继续使用旧会话。若发现草稿、资源或预览异常，保留检查点和脱敏复现包，先由老师决定是否继续，不自动提交 Issue 或发布。
