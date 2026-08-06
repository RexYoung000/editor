import type { AgentHomeworkQuestionSpec, Course } from '../types';
import { useEditorStore } from '../store/editorStore';
import {
  copyImageToCourse,
  createProjectInDirectory,
  downloadLibraryFile,
  getCourseDirPath,
  openProjectFromDirectory,
  writeBackToLocalFile,
} from '../utils/electronFs';
import { requestPageThumbnailFlush } from '../utils/pageThumbnailSync';
import { PRESET_TEMPLATES } from '../presets';
import {
  assertAgentHomeworkCourseId,
  createAgentHomeworkDraft,
  evaluateAgentCompatibility,
  FORGE_CAPABILITY_REVISION,
  FORGE_COURSE_SCHEMA_VERSION,
  FORGE_MCP_API_VERSION,
  FORGE_SKILL_VERSION,
  rebuildAgentHomeworkCourse,
  summarizeAgentHomework,
  validateAgentHomeworkCourse,
} from './homeworkAuthoring';

type JsonRecord = Record<string, unknown>;

export interface AgentRendererRequest {
  id: string;
  sessionId: string;
  capabilityRevision?: string;
  tool: string;
  arguments?: JsonRecord;
}

interface AgentTransaction {
  sessionId: string;
  courseId: string;
  baseCourseJson: string;
  workingCourse: Course;
}

const TOOL_NAMES = [
  'forge_get_manifest',
  'forge_list_capabilities',
  'forge_get_capability_changes',
  'forge_check_compatibility',
  'forge_get_tool_guidance',
  'forge_get_setup_status',
  'forge_configure_workspace',
  'forge_create_homework_draft',
  'forge_open_agent_draft',
  'forge_get_editor_state',
  'forge_begin_transaction',
  'forge_commit_transaction',
  'forge_rollback_transaction',
  'forge_list_homework_presets',
  'forge_add_homework_question',
  'forge_update_homework_question',
  'forge_remove_homework_question',
  'forge_reorder_homework_questions',
  'forge_search_library',
  'forge_import_library_image',
  'forge_import_authorized_image',
  'forge_validate_draft',
  'forge_capture_page',
  'forge_open_preview',
  'forge_list_checkpoints',
  'forge_restore_checkpoint',
  'forge_check_requirement_support',
  'forge_diagnose_failure',
  'forge_get_known_issues',
  'forge_create_feedback_report',
  'forge_export_reproduction_bundle',
] as const;

const READ_ONLY_TOOLS = new Set([
  'forge_get_manifest',
  'forge_list_capabilities',
  'forge_get_capability_changes',
  'forge_check_compatibility',
  'forge_get_tool_guidance',
  'forge_get_setup_status',
  'forge_get_editor_state',
  'forge_list_homework_presets',
  'forge_search_library',
  'forge_validate_draft',
  'forge_capture_page',
  'forge_list_checkpoints',
  'forge_check_requirement_support',
  'forge_diagnose_failure',
  'forge_get_known_issues',
]);

const GUIDANCE: Record<string, string> = {
  forge_create_homework_draft: '新建 Agent 作业草稿前调用。courseId 只能包含字母、数字、下划线和连字符，长度 3-80，且必须以 _hw 结尾；workspacePath 必须是老师明确选择的目录。',
  forge_open_agent_draft: '只打开默认工作目录中由 Agent 创建的作业草稿。courseId 必须遵守作业命名规则并以 _hw 结尾，不能包含路径分隔符。',
  forge_check_compatibility: '传入当前会话锁定的 capabilityRevision 和正在使用的 skillVersion；返回 update-skill-and-reconnect 时先更新 Skill，再重新连接 MCP。',
  forge_begin_transaction: '在修改已打开的 Agent 作业草稿前调用。一次老师要求只使用一个事务；失败时回滚。',
  forge_add_homework_question: '仅在活动事务中调用。每次增加一道题和一个作业关卡；AI 推导答案必须保持 answerConfirmed=false，直到老师明确确认。',
  forge_update_homework_question: '仅更新 Agent 草稿中的题目语义字段，不接受原始 Element 或 Course JSON。',
  forge_commit_transaction: '提交前会检查能力版本和老师是否手动修改了课程；成功后一次写回 Zustand 并保存检查点。',
  forge_capture_page: '提交后按 questionIndex 截取编辑器真实画布，返回本机 PNG 路径。',
  forge_open_preview: '生成并打开真实 GameLoader 预览；只打开预览，不替老师确认审核，也不发布。',
  forge_import_authorized_image: '只传老师在当前对话中明确提供的图片绝对路径；MCP 不提供目录浏览。',
  forge_create_feedback_report: '编辑器缺能力或疑似缺陷时生成脱敏本地报告，不自动上传或创建 Issue。',
};

let activeTransaction: AgentTransaction | null = null;

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} 不能为空`);
  return value.trim();
}

function asIndex(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new Error(`${field} 必须是从 0 开始的整数`);
  return Number(value);
}

function assertCapabilityRevision(request: AgentRendererRequest): void {
  if (request.capabilityRevision && request.capabilityRevision !== FORGE_CAPABILITY_REVISION) {
    throw new Error('CAPABILITY_REVISION_CHANGED：编辑器能力已更新，请重新连接并开始新会话');
  }
}

function assertAgentCourse(course: Course | null): asserts course is Course {
  if (!course || course.kind !== 'homework' || course.aiAuthoring?.origin !== 'agent') {
    throw new Error('当前未打开 Agent 创建的作业草稿');
  }
}

function currentCourse(): Course | null {
  return useEditorStore.getState().currentCourse;
}

function requireTransaction(request: AgentRendererRequest): AgentTransaction {
  assertCapabilityRevision(request);
  if (!activeTransaction || activeTransaction.sessionId !== request.sessionId) {
    throw new Error('NO_ACTIVE_TRANSACTION：请先调用 forge_begin_transaction');
  }
  return activeTransaction;
}

function normalizeQuestion(raw: unknown, fallbackId?: string): AgentHomeworkQuestionSpec {
  if (!raw || typeof raw !== 'object') throw new Error('question 必须是对象');
  const source = raw as JsonRecord;
  const type = source.type;
  if (!['single-choice', 'multiple-choice', 'fill-blank', 'content'].includes(String(type))) {
    throw new Error('不支持的题型');
  }
  const answerSource = source.answerSource ?? 'none';
  if (!['teacher', 'source', 'inferred', 'none'].includes(String(answerSource))) {
    throw new Error('不支持的答案来源');
  }
  const options = Array.isArray(source.options)
    ? source.options.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('options 必须是对象数组');
      const option = item as JsonRecord;
      return {
        id: typeof option.id === 'string' && option.id.trim() ? option.id.trim() : String.fromCharCode(97 + index),
        text: asString(option.text, `options[${index}].text`),
      };
    })
    : undefined;
  const answers = Array.isArray(source.answers)
    ? source.answers.map((group) => {
      if (!Array.isArray(group)) throw new Error('answers 必须是二维字符串数组');
      return group.map((answer) => String(answer).trim()).filter(Boolean);
    })
    : undefined;
  const image = source.image && typeof source.image === 'object'
    ? (() => {
      const input = source.image as JsonRecord;
      return {
        relativePath: asString(input.relativePath, 'image.relativePath'),
        ...(typeof input.x === 'number' ? { x: input.x } : {}),
        ...(typeof input.y === 'number' ? { y: input.y } : {}),
        ...(typeof input.width === 'number' ? { width: input.width } : {}),
        ...(typeof input.height === 'number' ? { height: input.height } : {}),
      };
    })()
    : undefined;
  return {
    id: fallbackId ?? (typeof source.id === 'string' && source.id.trim() ? source.id.trim() : crypto.randomUUID()),
    type: type as AgentHomeworkQuestionSpec['type'],
    title: asString(source.title, 'title'),
    body: typeof source.body === 'string' ? source.body : undefined,
    options,
    correctOptionIds: Array.isArray(source.correctOptionIds) ? source.correctOptionIds.map(String) : undefined,
    answers,
    answerSource: answerSource as AgentHomeworkQuestionSpec['answerSource'],
    answerConfirmed: source.answerConfirmed === true,
    image,
  };
}

function replaceQuestions(transaction: AgentTransaction, questions: AgentHomeworkQuestionSpec[]): void {
  const priorQuestions = transaction.workingCourse.aiAuthoring!.questions;
  const priorStages = transaction.workingCourse.stages;
  const idsByQuestion = new Map(priorQuestions.map((question, index) => [question.id, {
    stageId: priorStages[index]?.id,
    subPageId: priorStages[index]?.subPages[0]?.id,
  }]));
  transaction.workingCourse.aiAuthoring!.questions = questions;
  transaction.workingCourse = rebuildAgentHomeworkCourse(transaction.workingCourse);
  transaction.workingCourse.stages.forEach((stage, index) => {
    const prior = idsByQuestion.get(questions[index].id);
    if (!prior) return;
    if (prior.stageId) stage.id = prior.stageId;
    if (prior.subPageId) stage.subPages[0].id = prior.subPageId;
  });
}

async function searchLibrary(args: JsonRecord) {
  const params = new URLSearchParams({
    type: typeof args.type === 'string' ? args.type : 'image',
    q: typeof args.query === 'string' ? args.query : '',
    series: typeof args.series === 'string' ? args.series : '',
    color: typeof args.color === 'string' ? args.color : '',
    language: typeof args.language === 'string' ? args.language : '',
    quickTag: typeof args.quickTag === 'string' ? args.quickTag : '',
    limit: String(Math.min(100, Math.max(1, Number(args.limit) || 30))),
  });
  const response = await fetch(`/api/library/search?${params.toString()}`);
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.error ?? `资源库搜索失败：HTTP ${response.status}`);
  return result;
}

async function waitForPageThumbnail(pageId: string): Promise<string> {
  requestPageThumbnailFlush();
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const dataUrl = useEditorStore.getState().pageThumbnails[pageId];
    if (dataUrl) return dataUrl;
  }
  throw new Error('画布截图超时，请确认编辑器画布已完成加载');
}

async function openRealPreview(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('真实预览启动超时')), 180_000);
    window.dispatchEvent(new CustomEvent('forge:agent-open-preview', {
      detail: {
        resolve: (value: unknown) => { window.clearTimeout(timeout); resolve(value); },
        reject: (error: unknown) => { window.clearTimeout(timeout); reject(error); },
      },
    }));
  });
}

async function handleRequest(request: AgentRendererRequest, openCourse: (course: Course) => void): Promise<unknown> {
  const args = request.arguments ?? {};
  if (!READ_ONLY_TOOLS.has(request.tool)) assertCapabilityRevision(request);

  switch (request.tool) {
    case 'forge_get_manifest':
      return {
        editorVersion: __APP_VERSION__,
        mcpApiVersion: FORGE_MCP_API_VERSION,
        skillVersion: FORGE_SKILL_VERSION,
        courseSchemaVersion: FORGE_COURSE_SCHEMA_VERSION,
        capabilityRevision: FORGE_CAPABILITY_REVISION,
        transport: 'stdio',
        writeBoundary: 'renderer-zustand',
        reviewAuthority: 'teacher-only',
      };
    case 'forge_list_capabilities':
      return {
        capabilityRevision: FORGE_CAPABILITY_REVISION,
        tools: TOOL_NAMES,
        questionTypes: ['single-choice', 'multiple-choice', 'fill-blank', 'content'],
        forbidden: ['review-confirmation', 'svn', 'publish', 'production-deploy', 'raw-course-json'],
      };
    case 'forge_get_capability_changes':
      return {
        currentRevision: FORGE_CAPABILITY_REVISION,
        requestedRevision: typeof args.sinceRevision === 'string' ? args.sinceRevision : null,
        reconnectRequired: Boolean(args.sinceRevision && args.sinceRevision !== FORGE_CAPABILITY_REVISION),
        changes: args.sinceRevision === FORGE_CAPABILITY_REVISION ? [] : [{ revision: FORGE_CAPABILITY_REVISION, summary: 'Agent 作业草稿 ID 统一要求以 _hw 结尾' }],
      };
    case 'forge_check_compatibility': {
      const compatibility = evaluateAgentCompatibility(
        typeof args.capabilityRevision === 'string' ? args.capabilityRevision : undefined,
        typeof args.skillVersion === 'string' ? args.skillVersion : undefined,
      );
      return {
        ...compatibility,
        current: {
          editorVersion: __APP_VERSION__,
          mcpApiVersion: FORGE_MCP_API_VERSION,
          skillVersion: FORGE_SKILL_VERSION,
          capabilityRevision: FORGE_CAPABILITY_REVISION,
        },
      };
    }
    case 'forge_get_tool_guidance': {
      const toolName = asString(args.toolName, 'toolName');
      if (!TOOL_NAMES.includes(toolName as typeof TOOL_NAMES[number])) throw new Error(`未知工具：${toolName}`);
      return { toolName, guidance: GUIDANCE[toolName] ?? '按工具输入结构调用；修改类工具必须遵守事务和老师审核边界。' };
    }
    case 'forge_get_setup_status':
      return { workspacePath: localStorage.getItem('forge_agent_workspace'), configured: Boolean(localStorage.getItem('forge_agent_workspace')) };
    case 'forge_configure_workspace': {
      const workspacePath = asString(args.workspacePath, 'workspacePath');
      if (!(await window.electronAPI.pathExists(workspacePath))) throw new Error('工作目录不存在');
      localStorage.setItem('forge_agent_workspace', workspacePath);
      return { configured: true, workspacePath };
    }
    case 'forge_create_homework_draft': {
      if (activeTransaction) throw new Error('请先提交或回滚当前事务');
      const courseId = asString(args.courseId, 'courseId');
      assertAgentHomeworkCourseId(courseId);
      const workspacePath = typeof args.workspacePath === 'string' ? args.workspacePath : localStorage.getItem('forge_agent_workspace');
      if (!workspacePath) throw new Error('尚未配置 Agent 默认工作目录');
      const created = await createProjectInDirectory(courseId, workspacePath, 'homework');
      const course = createAgentHomeworkDraft(courseId);
      await writeBackToLocalFile(courseId, course);
      openCourse(course);
      return { created: true, courseId, filePath: created.filePath, status: 'ai-draft' };
    }
    case 'forge_open_agent_draft': {
      if (activeTransaction) throw new Error('请先提交或回滚当前事务');
      const courseId = asString(args.courseId, 'courseId');
      assertAgentHomeworkCourseId(courseId);
      const workspacePath = localStorage.getItem('forge_agent_workspace');
      if (!workspacePath) throw new Error('尚未配置 Agent 默认工作目录');
      const result = await openProjectFromDirectory(`${workspacePath}/${courseId}`);
      if (!result) throw new Error('未找到课件草稿');
      assertAgentCourse(result.course);
      openCourse(result.course);
      return summarizeAgentHomework(result.course);
    }
    case 'forge_get_editor_state': {
      const course = activeTransaction?.sessionId === request.sessionId
        ? activeTransaction.workingCourse
        : currentCourse();
      return course ? summarizeAgentHomework(course) : { courseId: null, status: 'no-course' };
    }
    case 'forge_begin_transaction': {
      if (activeTransaction) throw new Error('已有活动事务，请先提交或回滚');
      const course = currentCourse();
      assertAgentCourse(course);
      const courseDir = getCourseDirPath(course.id);
      if (!courseDir) throw new Error('当前草稿没有本地目录');
      const lock = await window.electronAPI.agentAcquireDraftLock(courseDir, request.sessionId);
      if (!lock.ok) throw new Error(lock.error);
      const baseCourseJson = JSON.stringify(course);
      activeTransaction = {
        sessionId: request.sessionId,
        courseId: course.id,
        baseCourseJson,
        workingCourse: JSON.parse(baseCourseJson),
      };
      return { started: true, courseId: course.id, baseRevision: course.aiAuthoring!.revision };
    }
    case 'forge_add_homework_question': {
      const transaction = requireTransaction(request);
      const question = normalizeQuestion(args.question);
      if (transaction.workingCourse.aiAuthoring!.questions.some((candidate) => candidate.id === question.id)) {
        throw new Error(`题目 ID 已存在：${question.id}`);
      }
      replaceQuestions(transaction, [...transaction.workingCourse.aiAuthoring!.questions, question]);
      return { added: true, questionId: question.id, questionCount: transaction.workingCourse.stages.length };
    }
    case 'forge_update_homework_question': {
      const transaction = requireTransaction(request);
      const questionId = asString(args.questionId, 'questionId');
      const index = transaction.workingCourse.aiAuthoring!.questions.findIndex((question) => question.id === questionId);
      if (index < 0) throw new Error(`未找到题目：${questionId}`);
      const current = transaction.workingCourse.aiAuthoring!.questions[index];
      const updates = args.updates && typeof args.updates === 'object' ? args.updates as JsonRecord : {};
      const question = normalizeQuestion({ ...current, ...updates, id: questionId }, questionId);
      const questions = [...transaction.workingCourse.aiAuthoring!.questions];
      questions[index] = question;
      replaceQuestions(transaction, questions);
      return { updated: true, questionId };
    }
    case 'forge_remove_homework_question': {
      const transaction = requireTransaction(request);
      const questionId = asString(args.questionId, 'questionId');
      const questions = transaction.workingCourse.aiAuthoring!.questions.filter((question) => question.id !== questionId);
      if (questions.length === transaction.workingCourse.aiAuthoring!.questions.length) throw new Error(`未找到题目：${questionId}`);
      replaceQuestions(transaction, questions);
      return { removed: true, questionId, questionCount: questions.length };
    }
    case 'forge_reorder_homework_questions': {
      const transaction = requireTransaction(request);
      const fromIndex = asIndex(args.fromIndex, 'fromIndex');
      const toIndex = asIndex(args.toIndex, 'toIndex');
      const questions = [...transaction.workingCourse.aiAuthoring!.questions];
      if (fromIndex >= questions.length || toIndex >= questions.length) throw new Error('题目索引越界');
      const [moved] = questions.splice(fromIndex, 1);
      questions.splice(toIndex, 0, moved);
      replaceQuestions(transaction, questions);
      return { reordered: true, fromIndex, toIndex };
    }
    case 'forge_commit_transaction': {
      const transaction = requireTransaction(request);
      const current = currentCourse();
      assertAgentCourse(current);
      if (current.id !== transaction.courseId || JSON.stringify(current) !== transaction.baseCourseJson) {
        throw new Error('EDITOR_STATE_CHANGED：老师已修改或切换课程，请回滚后重新读取状态');
      }
      const courseDir = getCourseDirPath(current.id);
      if (!courseDir) throw new Error('当前草稿没有本地目录');
      await window.electronAPI.agentWriteCheckpoint(courseDir, current.id, transaction.baseCourseJson, {
        sessionId: request.sessionId,
        reason: typeof args.summary === 'string' ? args.summary : 'Agent 事务提交前快照',
      });
      transaction.workingCourse.aiAuthoring!.revision += 1;
      transaction.workingCourse.aiAuthoring!.updatedAt = new Date().toISOString();
      const committed: Course = JSON.parse(JSON.stringify(transaction.workingCourse));
      useEditorStore.getState().setCurrentCourse(committed);
      await writeBackToLocalFile(committed.id, committed);
      await window.electronAPI.agentReleaseDraftLock(courseDir, request.sessionId);
      activeTransaction = null;
      return { committed: true, ...summarizeAgentHomework(committed) };
    }
    case 'forge_rollback_transaction': {
      const transaction = requireTransaction(request);
      const courseDir = getCourseDirPath(transaction.courseId);
      if (courseDir) await window.electronAPI.agentReleaseDraftLock(courseDir, request.sessionId);
      activeTransaction = null;
      return { rolledBack: true };
    }
    case 'forge_list_homework_presets':
      return PRESET_TEMPLATES.filter((preset) => preset.courseKinds?.includes('homework')).map((preset) => ({
        id: preset.id,
        labelKey: preset.labelKey,
        structure: preset.structure,
      }));
    case 'forge_search_library':
      return searchLibrary(args);
    case 'forge_import_library_image': {
      const transaction = requireTransaction(request);
      const libraryPath = asString(args.libraryPath, 'libraryPath');
      const result = await downloadLibraryFile(transaction.courseId, libraryPath);
      return { imported: true, relativePath: result.localRelPath, source: 'library' };
    }
    case 'forge_import_authorized_image': {
      const transaction = requireTransaction(request);
      const sourcePath = asString(args.sourcePath, 'sourcePath');
      const result = await copyImageToCourse(transaction.courseId, sourcePath);
      if (typeof result !== 'string') throw new Error('授权图片导入失败');
      return { imported: true, relativePath: result, source: 'authorized-attachment' };
    }
    case 'forge_validate_draft': {
      const course = activeTransaction?.sessionId === request.sessionId ? activeTransaction.workingCourse : currentCourse();
      assertAgentCourse(course);
      const issues = validateAgentHomeworkCourse(course);
      return { valid: issues.every((issue) => issue.severity !== 'blocking'), issues, summary: summarizeAgentHomework(course) };
    }
    case 'forge_capture_page': {
      const course = currentCourse();
      assertAgentCourse(course);
      const questionIndex = asIndex(args.questionIndex, 'questionIndex');
      const stage = course.stages[questionIndex];
      const page = stage?.subPages[0];
      if (!stage || !page) throw new Error('题目索引越界');
      useEditorStore.getState().setCurrentSubPage(stage.id, page.id);
      const dataUrl = await waitForPageThumbnail(page.id);
      const courseDir = getCourseDirPath(course.id);
      if (!courseDir) throw new Error('当前草稿没有本地目录');
      const result = await window.electronAPI.agentSaveCapture(courseDir, page.id, dataUrl);
      if (!result.ok) throw new Error(result.error);
      return { captured: true, questionIndex, path: result.path };
    }
    case 'forge_open_preview':
      return { opened: true, result: await openRealPreview(), reviewConfirmed: false };
    case 'forge_list_checkpoints': {
      const course = currentCourse();
      assertAgentCourse(course);
      const courseDir = getCourseDirPath(course.id);
      if (!courseDir) throw new Error('当前草稿没有本地目录');
      return window.electronAPI.agentListCheckpoints(courseDir);
    }
    case 'forge_restore_checkpoint': {
      if (activeTransaction) throw new Error('请先提交或回滚当前事务');
      const course = currentCourse();
      assertAgentCourse(course);
      const courseDir = getCourseDirPath(course.id);
      if (!courseDir) throw new Error('当前草稿没有本地目录');
      const checkpointId = asString(args.checkpointId, 'checkpointId');
      const restored = await window.electronAPI.agentReadCheckpoint(courseDir, checkpointId);
      if (!restored.ok) throw new Error(restored.error);
      const restoredCourse = JSON.parse(restored.courseJson) as Course;
      assertAgentCourse(restoredCourse);
      await window.electronAPI.agentWriteCheckpoint(courseDir, course.id, JSON.stringify(course), {
        sessionId: request.sessionId,
        reason: `恢复检查点 ${checkpointId} 前快照`,
      });
      restoredCourse.aiAuthoring!.revision = Math.max(course.aiAuthoring!.revision + 1, restoredCourse.aiAuthoring!.revision + 1);
      restoredCourse.aiAuthoring!.updatedAt = new Date().toISOString();
      useEditorStore.getState().setCurrentCourse(restoredCourse);
      await writeBackToLocalFile(restoredCourse.id, restoredCourse);
      return { restored: true, checkpointId, ...summarizeAgentHomework(restoredCourse) };
    }
    case 'forge_check_requirement_support': {
      const requirement = String(args.requirement ?? '').toLowerCase();
      const unsupported = [
        ['拖拽', 'drag'], ['连线', 'matching'], ['分数', 'fraction'], ['复杂算式', 'formula'], ['生图', 'image-generation'],
      ].find(([keyword]) => requirement.includes(keyword));
      return unsupported
        ? { supported: false, category: 'editor-capability-missing', capability: unsupported[1], nextStep: '向老师说明限制，并用 forge_create_feedback_report 生成反馈' }
        : { supported: true, supportedQuestionTypes: ['single-choice', 'multiple-choice', 'fill-blank', 'content'] };
    }
    case 'forge_diagnose_failure':
      return {
        categories: ['requirement-unclear', 'asset-missing', 'agent-limitation', 'editor-capability-missing', 'editor-defect', 'editor-outdated', 'temporary-runtime'],
        recommendation: '根据错误证据选择唯一主分类；不要把能力缺失伪装为已经完成。',
      };
    case 'forge_get_known_issues':
      return { editorVersion: __APP_VERSION__, capabilityRevision: FORGE_CAPABILITY_REVISION, issues: [] };
    case 'forge_create_feedback_report': {
      const course = currentCourse();
      const report = {
        category: asString(args.category, 'category'),
        summary: asString(args.summary, 'summary'),
        expected: typeof args.expected === 'string' ? args.expected : '',
        observed: typeof args.observed === 'string' ? args.observed : '',
        editorVersion: __APP_VERSION__,
        capabilityRevision: FORGE_CAPABILITY_REVISION,
        courseId: course?.id ?? null,
      };
      return window.electronAPI.agentWriteFeedbackReport(report);
    }
    case 'forge_export_reproduction_bundle': {
      const course = currentCourse();
      return window.electronAPI.agentWriteFeedbackReport({
        type: 'reproduction-bundle',
        editorVersion: __APP_VERSION__,
        capabilityRevision: FORGE_CAPABILITY_REVISION,
        courseSummary: course?.aiAuthoring ? summarizeAgentHomework(course) : null,
        diagnostics: args.diagnostics ?? null,
      });
    }
    default:
      throw new Error(`未知 MCP 工具：${request.tool}`);
  }
}

export function installAgentAuthoringBridge(openCourse: (course: Course) => void): () => void {
  if (!window.electronAPI?.onAgentRequest || !window.electronAPI?.replyAgentRequest) return () => {};
  const reply = window.electronAPI.replyAgentRequest;
  const dispose = window.electronAPI.onAgentRequest((request) => {
    void handleRequest(request, openCourse)
      .then((result) => reply(request.id, { ok: true, result }))
      .catch((error: unknown) => reply(request.id, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }));
  });
  window.electronAPI.markAgentRendererReady?.();
  return dispose;
}
