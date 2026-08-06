---
name: forge-homework-authoring
description: 通过本机 Forge MCP 与老师持续对话，从需求、教案、PDF 或参考图创建和修改可审核的作业课件草稿。用于老师要求制作单选、多选、普通填空或纯图文作业，搜索 Forge 资源库、导入老师明确授权的图片、复刻参考版式、截图校验或打开真实预览时；不得用于代替老师审核、SVN、正式发布、生产部署或直接编辑课程 JSON。
---

# Forge 作业课件制作

使用当前安装的 Forge MCP 操作可见编辑器。把老师的需求作为最终准则；根据任务复杂度决定沟通深度，不设置固定确认频率。

## 开始任务

1. 调用 `forge_get_manifest`，记录 `editorVersion`、`mcpApiVersion`、`skillVersion`、`courseSchemaVersion` 和 `capabilityRevision`。
2. 调用 `forge_list_capabilities`，只按当前返回的题型、预设和工具制定方案。
3. 调用 `forge_check_compatibility`。发现版本或 `capabilityRevision` 变化时停止写入，重连后重新开始会话。
4. 对不熟悉的工具调用 `forge_get_tool_guidance`，不要凭工具名猜参数或保存静态接口全集。
5. 只在真正影响内容、版式或答案的歧义上询问老师；老师要求直接制作时继续推进，并把未确认项留在校验结果中。

## 理解老师需求

- 自行分析老师提供的教案、PDF、参考图和文字要求，提取题目、顺序、题型、素材、版式和交互目标。
- 把参考图当作版式、风格和信息层级参考，不从参考图猜题目或答案。
- 优先搜索 Forge 资源库。没有合适题图时，只从老师明确提供的 PDF 或图片中裁取必要图形和标注；保持题干为可编辑文本，不把整页截图作为题目。
- 把对话中老师明确提供的文件视为本次会话授权素材。只传入明确文件路径，不探索老师的其他本机目录。
- 不调用 AI 生图完成第一版不支持的内容。

## 制作草稿

1. 用 `forge_get_setup_status` 检查工作目录；只有老师明确选择目录后才调用 `forge_configure_workspace`。
2. 新课件先向老师确认合法且不重名、并以 `_hw` 结尾的作业课件 ID，再调用 `forge_create_homework_draft`。继续制作时只调用 `forge_open_agent_draft` 打开 Agent 自己创建的草稿。
3. 每一轮老师要求调用一次 `forge_begin_transaction`。
4. 在事务内使用结构化作业工具增删改题目；一个关卡只放一道题。不要提交原始 Element 或 Course JSON。
5. 需要素材时调用 `forge_search_library`，选定后调用 `forge_import_library_image`；老师授权的本机图调用 `forge_import_authorized_image`。
6. 本轮任何操作失败时调用 `forge_rollback_transaction`。全部完成后调用 `forge_commit_transaction`，用简短中文概括本轮改动。
7. 如果提交提示老师已手动修改课程，回滚事务、调用 `forge_get_editor_state` 重新读取，再根据老师当前内容继续。

## 答案与审核

- 来源材料明确给出答案时标记 `answerSource=source`；老师直接给出时标记 `teacher`。
- 自行推导答案时标记 `answerSource=inferred` 和 `answerConfirmed=false`，向老师展示答案与依据。只有老师明确确认后，才能在后续事务中改为 `answerConfirmed=true` 并写入判定。
- 提交后调用 `forge_validate_draft`。阻塞问题未解决时明确告诉老师，不能宣称课件已可发布。
- 对需要视觉判断的题目调用 `forge_capture_page`，把截图展示给老师并按反馈继续修改。
- 老师要求体验时调用 `forge_open_preview` 打开真实 GameLoader 预览。该工具不代表老师已确认。
- 始终让老师在 Forge 现有发布窗口亲自勾选审核确认。不得尝试确认审核、SVN、发布、打包机通知或生产部署。

## 能力不足或失败

1. 先调用 `forge_check_requirement_support` 和 `forge_diagnose_failure`，区分需求不明确、素材不足、Agent 限制、编辑器缺少能力、编辑器疑似缺陷、版本过旧和临时运行问题。
2. 能通过当前能力合理降级时先向老师说明影响，由老师决定是否接受。
3. 无法满足时明确说明未完成的结果、实际证据和缺少能力。调用 `forge_create_feedback_report` 生成脱敏报告交给老师转给编辑器制作者。
4. 不自动创建 Issue、不上传课件、不联系制作者，也不掩盖失败。
