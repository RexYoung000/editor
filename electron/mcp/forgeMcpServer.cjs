const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod/v4');

const TOOL_DEFINITIONS = [
  ['forge_get_manifest', '读取当前 Forge、MCP、Skill、课程结构和能力修订版本。', z.object({})],
  ['forge_list_capabilities', '列出当前编辑器真实支持的 Agent 工具、题型和禁止能力。', z.object({})],
  ['forge_get_capability_changes', '比较能力修订并判断是否需要重连。', z.object({ sinceRevision: z.string().optional() })],
  ['forge_check_compatibility', '检查 Agent 会话与当前编辑器能力是否兼容。', z.object({ capabilityRevision: z.string().optional(), skillVersion: z.string().optional() })],
  ['forge_get_tool_guidance', '读取某个工具的前置条件、边界和下一步。', z.object({ toolName: z.string() })],
  ['forge_get_setup_status', '读取 Agent 默认工作目录配置状态。', z.object({})],
  ['forge_configure_workspace', '配置老师明确选择的 Agent 默认工作目录。', z.object({ workspacePath: z.string() })],
  ['forge_create_homework_draft', '创建空白 AI 作业草稿并在可见编辑器中打开；作业课件 ID 必须以 _hw 结尾。', z.object({ courseId: z.string(), workspacePath: z.string().optional() })],
  ['forge_open_agent_draft', '从默认工作目录打开 Agent 自己创建的作业草稿；作业课件 ID 必须以 _hw 结尾。', z.object({ courseId: z.string() })],
  ['forge_get_editor_state', '读取当前草稿或当前事务工作副本的语义状态。', z.object({})],
  ['forge_begin_transaction', '从 renderer 当前 Zustand 状态开启一轮编辑事务。', z.object({})],
  ['forge_commit_transaction', '校验并一次提交当前事务，保存草稿和提交前检查点。', z.object({ summary: z.string().optional() })],
  ['forge_rollback_transaction', '放弃当前轮全部未提交修改。', z.object({})],
  ['forge_list_homework_presets', '列出当前编辑器可用于作业的版式预设。', z.object({})],
  ['forge_add_homework_question', '在事务中新增一道结构化作业题。', z.object({ question: z.record(z.string(), z.unknown()) })],
  ['forge_update_homework_question', '在事务中修改一道 Agent 作业题。', z.object({ questionId: z.string(), updates: z.record(z.string(), z.unknown()) })],
  ['forge_remove_homework_question', '在事务中删除一道 Agent 作业题。', z.object({ questionId: z.string() })],
  ['forge_reorder_homework_questions', '在事务中调整题目与关卡顺序。', z.object({ fromIndex: z.number().int().nonnegative(), toIndex: z.number().int().nonnegative() })],
  ['forge_search_library', '从当前 Forge 资源库跨目录搜索素材。', z.object({ query: z.string().optional(), type: z.enum(['image', 'audio', 'video', 'spine']).optional(), series: z.string().optional(), color: z.string().optional(), language: z.string().optional(), quickTag: z.string().optional(), limit: z.number().int().positive().max(100).optional() })],
  ['forge_import_library_image', '把选定的资源库图片复制到当前 Agent 草稿。', z.object({ libraryPath: z.string() })],
  ['forge_import_authorized_image', '导入老师在当前对话中明确授权的图片路径。', z.object({ sourcePath: z.string() })],
  ['forge_validate_draft', '校验题目结构、素材和答案确认状态。', z.object({})],
  ['forge_capture_page', '截取已提交题目在真实编辑画布中的画面。', z.object({ questionIndex: z.number().int().nonnegative() })],
  ['forge_open_preview', '生成并打开真实 GameLoader 预览，不确认审核。', z.object({})],
  ['forge_list_checkpoints', '列出当前草稿最近的 Agent 检查点。', z.object({})],
  ['forge_restore_checkpoint', '恢复一个检查点，并先保存当前内容快照。', z.object({ checkpointId: z.string() })],
  ['forge_check_requirement_support', '判断老师需求是否在当前作业能力范围内。', z.object({ requirement: z.string() })],
  ['forge_diagnose_failure', '获取失败分类和反馈准则。', z.object({ error: z.string().optional(), operation: z.string().optional() })],
  ['forge_get_known_issues', '读取当前版本已知的 Agent 制作问题。', z.object({})],
  ['forge_create_feedback_report', '生成脱敏的能力缺失或缺陷反馈报告。', z.object({ category: z.string(), summary: z.string(), expected: z.string().optional(), observed: z.string().optional() })],
  ['forge_export_reproduction_bundle', '导出不含课件正文和来源路径的最小复现信息。', z.object({ diagnostics: z.unknown().optional() })],
];

const DISCOVERY_TOOLS = new Set([
  'forge_get_manifest',
  'forge_list_capabilities',
  'forge_get_capability_changes',
  'forge_check_compatibility',
  'forge_get_tool_guidance',
]);

async function startForgeMcpServer(options) {
  const sessionId = options.sessionId;
  let capabilityRevision = null;
  const server = new McpServer({ name: 'forge-editor', version: options.version || '0.0.0' });

  for (const [name, description, inputSchema] of TOOL_DEFINITIONS) {
    server.registerTool(name, {
      description,
      inputSchema,
      annotations: {
        readOnlyHint: ['forge_get_', 'forge_list_', 'forge_check_', 'forge_search_', 'forge_validate_', 'forge_capture_'].some((prefix) => name.startsWith(prefix)),
        destructiveHint: false,
        openWorldHint: name === 'forge_search_library' || name === 'forge_open_preview',
      },
    }, async (args) => {
      try {
        if (!capabilityRevision && !DISCOVERY_TOOLS.has(name)) {
          throw new Error('请先调用 forge_get_manifest 锁定当前 capabilityRevision');
        }
        const result = await options.invokeRenderer({
          sessionId,
          capabilityRevision: capabilityRevision || undefined,
          tool: name,
          arguments: args,
        });
        if (name === 'forge_get_manifest') capabilityRevision = result.capabilityRevision;
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result && typeof result === 'object' && !Array.isArray(result) ? result : { result },
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        };
      }
    });
  }

  const transport = options.transport || new StdioServerTransport();
  await server.connect(transport);
  return server;
}

module.exports = { startForgeMcpServer, TOOL_DEFINITIONS };
