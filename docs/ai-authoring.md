# Agent 作业草稿制作与 Forge MCP

本文定义老师通过自己的 Agent 操作 Forge 制作作业草稿的产品边界、MCP 契约、Skill 分发和第一版 POC。实现与验收以 [Issue #161](https://github.com/RexYoung000/editor/issues/161) 为准。

## 产品定位

Forge 不是文本教案生成器。老师的 Agent 负责理解老师提供的需求、教案、文档和参考图，持续对齐内容与版式；Forge 负责提供受控、可发现、可验证的编辑能力，并保存、渲染、截图、校验和打开真实预览。

第一版只支持 Agent 从零创建或继续修改自己创建的作业草稿：

- 一个作业关卡对应一道题。
- 支持单选、多选、普通填空和纯图文题干。
- 不支持拖拽、连线、分数结构、复杂算式和 AI 图片生成。
- 预设是优先起点，Agent 可通过语义工具继续调整受支持的组件、内容、版式和交互。
- 不接管老师已有或历史手工课件。

参考图只用于分析版式、视觉风格和信息层级。题目、选项和答案以老师需求、教案或老师确认的推导结果为准，不能从参考图猜内容或答案。老师对沟通深度和制作节奏的要求始终优先，不建立固定的强制确认频率。

## 系统边界

```text
老师
  -> Codex / Claude Code / OpenCode / WorkBuddy
       -> 中立 Forge Skill：对话、分析、操作顺序、审核与失败反馈
            -> 本机 stdio MCP：能力发现、会话、事务和语义命令
                 -> Electron 主进程受控桥接
                      -> renderer / Zustand store：唯一课程状态与 Laya 渲染
                           -> 本机草稿、截图、真实预览和现有发布确认
```

- MCP 随 Forge 客户端一起安装和升级，不建立独立云服务，也不监听局域网或公网端口。
- 启动 MCP 时同时检查、启动并显示 Forge 编辑器。首次配置服务器地址和默认工作目录，后续复用。
- MCP 不能直接编辑课程 JSON；所有编辑命令必须在 renderer 中通过现有课程模型、组件元数据和状态源执行。
- MCP 可以脱离 Skill 完成基础编辑；Skill 不能保存一份会随编辑器升级而失真的静态接口全集。
- CLI 只用于构建、配置、验证和诊断，不作为老师制作课件的产品入口。
- 远程模式继续遵守 Electron 本机路径边界；资源库搜索请求发送给 Vite，Electron 本机课程目录不发送给远程 Vite。

## 版本与能力发现

每次任务开始必须调用 MCP 获取：

- `editorVersion`
- `mcpApiVersion`
- `skillVersion`
- `courseSchemaVersion`
- `capabilityRevision`

核心发现工具为：

- `forge_get_manifest`
- `forge_list_capabilities`
- `forge_get_capability_changes`
- `forge_check_compatibility`
- `forge_get_tool_guidance`

一个制作会话锁定同一 `capabilityRevision`。编辑器或能力目录发生变化时，当前会话停止写入并要求 Agent 重新连接或开启新会话；第一版不支持制作过程中的接口热更新。

能力目录必须来自当前编辑器的组件元数据、作业预设和显式业务规则。工具 guidance 描述前置条件、参数边界、结果、可能错误和下一步，不让 Agent仅凭工具名推测用法。

## 会话与权限

- 每个 MCP 连接创建临时会话标识，不保存 Agent 的长期凭据。
- 不同草稿可以并行；同一草稿同一时间只允许一个 Agent 写入。
- 老师手动修改后，Agent 原有写入租约失效；继续前必须重新读取最新状态。
- 默认工作目录在首次配置时由老师明确选择。每次新建由 Agent 提议合法且不重名的课件 ID，老师确认后创建；作业课件 ID 必须沿用现有编辑器规则，以 `_hw` 结尾，否则 GameLoader 会按普通课入口加载。
- 对话中明确提供的附件视为本次会话授权素材。MCP 只接收明确路径，不提供浏览老师其他目录的工具。
- 参考图默认不进入课件。老师明确作为课件素材提供的文件复制到当前草稿目录，不保存来源绝对路径。

MCP 永远不提供以下能力：

- 人工预览确认；
- SVN 准备或提交；
- 正式发布或打包机通知；
- 生产部署；
- 任意课程 JSON 读写。

## 编辑事务与持久恢复

老师的一轮要求对应一个 Agent 事务：

1. `forge_begin_transaction` 从 renderer 当前状态创建会话内工作副本。
2. Agent 在工作副本上调用多个语义工具。
3. `forge_commit_transaction` 校验能力修订、课程结构、答案和素材后，一次写回 Zustand store 并保存草稿。
4. 任一步失败或 Agent 主动取消时，`forge_rollback_transaction` 丢弃整轮工作副本，不留下半成品。

一次提交只产生一个老师可读的撤销节点。每次提交前的完整课程快照保存在课件目录的 `.forge/agent-checkpoints/`，只保留最近 20 个；快照不参与资源扫描、预览、导出和发布。重启后可以列出和恢复快照，恢复本身也形成新的事务记录。

## 第一版语义工具

### 草稿与状态

- `forge_get_setup_status`
- `forge_configure_workspace`
- `forge_create_homework_draft`：只接受以 `_hw` 结尾的作业课件 ID。
- `forge_open_agent_draft`
- `forge_get_editor_state`

### 作业制作

- `forge_list_homework_presets`
- `forge_add_homework_question`
- `forge_update_homework_question`
- `forge_remove_homework_question`
- `forge_reorder_homework_questions`

题目工具接受结构化题型、题干、正文、选项、答案来源、答案确认状态、素材引用和受控版式参数。工具内部使用现有预设、组件元数据和题型关系，不接受原始 Element 或 Course JSON。

### 素材、检查与预览

- `forge_search_library`
- `forge_import_authorized_image`
- `forge_validate_draft`
- `forge_capture_page`
- `forge_open_preview`
- `forge_list_checkpoints`
- `forge_restore_checkpoint`

资源库未命中时，Agent 可以从老师明确提供的 PDF 中裁取题图，再作为授权图片导入。应重建可编辑题干，只裁取必要图形和尺寸标注，不能把整页截图当作可交互题目。

### 失败与反馈

- `forge_check_requirement_support`
- `forge_diagnose_failure`
- `forge_get_known_issues`
- `forge_create_feedback_report`
- `forge_export_reproduction_bundle`

失败必须分类为需求不明确、素材不足、Agent 自身能力不足、编辑器缺少能力、编辑器疑似缺陷、编辑器版本过旧或临时运行失败。第一版只生成脱敏本地报告和复现包交给老师，不自动创建 GitHub Issue、不上传课件，也不联系制作者。

## 老师审核与发布边界

Agent 创建的课程写入 `aiAuthoring` 元数据并在编辑器显示“AI 草稿”。MCP 可以生成截图、校验并打开真实预览，但不能确认审核。

正式发布继续复用 [老师课件发布流程](./course-publishing.md)：

1. 老师打开当前内容对应的真实 GameLoader 预览。
2. 老师在 Forge 发布窗口手动勾选“我已确认内容无误”。
3. 只有确认记录与当前课程内容、编辑器版本和运行环境指纹一致时，才能进入发布目标和 SVN 步骤。
4. 任何内容修改都会改变课程指纹，使原确认自动失效并恢复为待审核。

AI 推导答案必须单独标记为待确认。老师通过对话确认后，Agent 才能把答案写入题型判定；未确认答案可以保留视觉草稿，但 `forge_validate_draft` 必须把它列为阻塞审核问题。

## Skill 与多 Agent 分发

仓库只维护一份中立 Skill 源码。构建脚本从该源码生成 Codex、Claude Code、OpenCode 和 WorkBuddy 的薄适配包与 MCP 配置片段；四端不得复制或改写业务工作流。

Skill 负责：

- 以老师需求为准持续对齐内容和版式；
- 区分参考图和真实素材；
- 在每次任务开始执行能力与兼容性发现；
- 按事务调用 MCP，并在提交后展示截图与校验结果；
- 引导老师进入真实预览和人工确认；
- 在缺陷或能力不足时生成结构化反馈，而不是掩盖问题。

Agent 不支持视觉时，继续支持纯文本需求和基础编辑；涉及参考图时明确说明降级，并请老师补充版式描述。编辑器升级后，安装器更新 MCP 和生成产物；已运行的 Agent 会话必须重连。

## 第 9 讲 POC

- 课程 ID：`s8_v9_09_homework_poc_hw`
- 课程类型：作业。
- 内容来源：`s8_v9_09~12_YY讲义（最最最最新版）.pdf` 第 9 讲作业，第 10-11 页。
- 结构：6 道图形面积填空题，6 个关卡。
- 版式：优先使用 `question-layout-blue-01`，保留蓝色方格背景、顶部题号与题干纸条、中央答题板和右侧数学键盘。
- 题干使用可编辑文本；资源库没有匹配题图时，从 PDF 只裁取几何图和尺寸标注。
- 讲义没有标准答案。Agent 可以推导并展示计算依据，老师确认后才写入正确答案。

POC 需要验证完整链路，而不是把六题 JSON 作为固定产品能力写死。样例文件和本机绝对路径不进入仓库；验收时由老师再次通过对话授权。

## 版本迭代闭环

```text
老师需求
  -> Agent 查询当前能力并尝试制作
     -> 成功：截图、校验、真实预览、老师审核
     -> 失败：分类并生成脱敏反馈报告
        -> 老师转交 Forge 制作者
           -> 制作者评估并迭代编辑器/MCP
              -> 新版本更新能力目录与变更记录
                 -> Agent 重连后继续
```

静态 Skill 只保留稳定工作流。新增组件、字段和工具先进入编辑器的动态能力目录和变更记录；如果最低 Skill 版本变化，兼容性检查必须阻止旧 Skill 继续写入并提示更新。
