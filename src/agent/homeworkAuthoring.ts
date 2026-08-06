import type {
  AgentHomeworkQuestionSpec,
  Course,
  Element,
  Stage,
  SubPage,
} from '../types';
import { createDefaultElement } from '../elements/elementMeta';
import { assetExport } from '../elements/builtinAssets';
import { KEYBOARD_PRESETS } from '../elements/keyboardPresets';
import { PRESET_TEMPLATES } from '../presets';
import { CHOICE_CORRECT_OPTION_IDS_KEY } from '../utils/choiceAnswerRules';
import { INPUT_ANSWER_CANDIDATES_KEY } from '../utils/inputAnswerRules';

export const FORGE_MCP_API_VERSION = '1.0.0';
export const FORGE_SKILL_VERSION = '0.1.1';
export const FORGE_COURSE_SCHEMA_VERSION = '1';
export const FORGE_CAPABILITY_REVISION = '2026-08-06.1';
export const DEFAULT_HOMEWORK_PRESET_ID = 'question-layout-blue-01';

export type AgentCompatibilityAction = 'continue' | 'reconnect' | 'update-skill-and-reconnect';

export function assertAgentHomeworkCourseId(courseId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/.test(courseId)) {
    throw new Error('课件 ID 只能包含字母、数字、下划线和连字符，长度 3-80');
  }
  if (!courseId.endsWith('_hw')) {
    throw new Error('作业课件 ID 必须以 _hw 结尾');
  }
}

export function evaluateAgentCompatibility(
  capabilityRevision?: string,
  skillVersion?: string,
): { compatible: boolean; action: AgentCompatibilityAction } {
  if (skillVersion && skillVersion !== FORGE_SKILL_VERSION) {
    return { compatible: false, action: 'update-skill-and-reconnect' };
  }
  if (capabilityRevision && capabilityRevision !== FORGE_CAPABILITY_REVISION) {
    return { compatible: false, action: 'reconnect' };
  }
  return { compatible: true, action: 'continue' };
}

export interface AgentDraftIssue {
  code: string;
  severity: 'blocking' | 'warning';
  questionId?: string;
  message: string;
}

export interface HomeworkQuestionFactoryOptions {
  layout?: 'agent-blue' | 'toolbar-default';
  includeOptionLabels?: boolean;
  includeKeyboard?: boolean;
  keyboardCamp?: string;
}

function makeId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.()
    ? `${prefix}-${globalThis.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneElementsWithNewIds(elements: Element[]): Element[] {
  const cloned: Element[] = JSON.parse(JSON.stringify(elements));
  const idMap = new Map(cloned.map((element) => [element.id, makeId('el')]));
  return cloned.map((element) => {
    const next = { ...element, id: idMap.get(element.id)! };
    if (next.parentId && idMap.has(next.parentId)) next.parentId = idMap.get(next.parentId);
    next.actions = next.actions?.map((action) => ({
      ...action,
      id: makeId('action'),
      groupId: action.groupId ? makeId('group') : undefined,
      branchId: action.branchId ? makeId('branch') : undefined,
      targetId: action.targetId && idMap.has(action.targetId) ? idMap.get(action.targetId) : action.targetId,
      judgeTargetId: action.judgeTargetId && idMap.has(action.judgeTargetId) ? idMap.get(action.judgeTargetId) : action.judgeTargetId,
    }));
    return next;
  });
}

function makeAutomaticJudgeActions(event: 'onChoiceJudge' | 'onInputJudge'): Element['actions'] {
  const groupId = makeId('group');
  return (['right', 'wrong', 'null'] as const).map((branchCondition) => ({
    id: makeId('action'),
    event,
    actionType: 'none',
    groupId,
    branchId: makeId('branch'),
    branchCondition,
  }));
}

function setQuestionText(elements: Element[], label: string, text: string): void {
  const element = elements.find((candidate) => candidate.props?._editorLabel === label);
  if (element) element.props = { ...element.props, text };
}

function createQuestionImage(spec: AgentHomeworkQuestionSpec, subPageId: string): Element[] {
  if (!spec.image?.relativePath) return [];
  const image = createDefaultElement('NewImage', subPageId);
  image.name = 'AgentQuestionImage';
  image.x = spec.image.x ?? 420;
  image.y = spec.image.y ?? 300;
  image.width = spec.image.width ?? 760;
  image.height = spec.image.height ?? 430;
  image.props = {
    ...image.props,
    skin: spec.image.relativePath,
    mouseEnabled: false,
    _editorLabel: '题图',
  };
  return [image];
}

export function createHomeworkChoiceElements(
  spec: AgentHomeworkQuestionSpec,
  subPageId: string,
  factoryOptions: HomeworkQuestionFactoryOptions = {},
): Element[] {
  const choiceBox = createDefaultElement('ChoiceBox', subPageId);
  choiceBox.name = 'AgentChoiceBox';
  choiceBox.x = 0;
  choiceBox.y = 0;
  choiceBox.width = 1920;
  choiceBox.height = 1080;
  choiceBox.actions = makeAutomaticJudgeActions('onChoiceJudge');

  const options = spec.options ?? [];
  const toolbarLayout = factoryOptions.layout === 'toolbar-default';
  const elements: Element[] = [choiceBox];
  const columns = toolbarLayout ? Math.max(1, options.length) : options.length <= 3 ? options.length : 2;
  const cardWidth = columns === 1 ? 620 : 520;
  const startX = toolbarLayout ? 343 : columns === 1 ? 650 : 390;
  const gapX = 110;
  const startY = toolbarLayout ? 938 : spec.image ? 770 : 560;
  const gapY = 150;

  options.forEach((option, index) => {
    const card = createDefaultElement('SpeechSelectableObj', subPageId);
    card.name = option.id;
    card.parentId = choiceBox.id;
    card.width = toolbarLayout ? 237 : cardWidth;
    card.height = toolbarLayout ? 77 : 108;
    card.x = toolbarLayout
      ? startX + index * 371
      : startX + (index % Math.max(1, columns)) * (cardWidth + gapX);
    card.y = startY + Math.floor(index / Math.max(1, columns)) * gapY;
    card.props = {
      ...card.props,
      _foregroundSkin: assetExport('choiceOption.normal'),
      _pressedSkin: assetExport('choiceOption.pressed'),
      _bgSkin: assetExport('choiceOption.selected'),
      _correctSkin: assetExport('choiceOption.correct'),
      _wrongSkin: assetExport('choiceOption.wrong'),
      _editorLabel: `选项 ${option.id}`,
    };
    elements.push(card);

    if (factoryOptions.includeOptionLabels === false) return;
    const label = createDefaultElement('NewTextArea', subPageId);
    label.name = `AgentChoiceLabel_${option.id}`;
    label.parentId = card.id;
    label.x = 28;
    label.y = 18;
    label.width = cardWidth - 56;
    label.height = 72;
    label.props = {
      ...label.props,
      text: option.text,
      fontSize: 32,
      align: 'center',
      valign: 'middle',
      mouseEnabled: false,
      _editorLabel: `选项 ${option.id} 文本`,
    };
    elements.push(label);
  });

  if (spec.answerConfirmed) {
    const correctIds = new Set(spec.correctOptionIds ?? []);
    choiceBox.props = {
      ...choiceBox.props,
      [CHOICE_CORRECT_OPTION_IDS_KEY]: elements
        .filter((element) => element.type === 'SpeechSelectableObj' && correctIds.has(element.name ?? ''))
        .map((element) => element.id),
    };
  }
  return elements;
}

export function createHomeworkFillBlankElements(
  spec: AgentHomeworkQuestionSpec,
  subPageId: string,
  factoryOptions: HomeworkQuestionFactoryOptions = {},
): Element[] {
  const keyboardPreset = KEYBOARD_PRESETS.find((preset) => preset.id === 'preset2');
  const keyboard = createDefaultElement('KlBaseKeyboard', subPageId);
  const camp = factoryOptions.keyboardCamp ?? `AGENT_${spec.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (keyboardPreset) {
    keyboard.width = keyboardPreset.defaultSize.width;
    keyboard.height = keyboardPreset.defaultSize.height;
    keyboard.props = {
      ...keyboardPreset.defaultProps,
      camp,
      _keyboardPreset: { id: keyboardPreset.id },
      _editorLabel: '数学键盘',
    };
  }
  keyboard.name = 'AgentMathKeyboard';
  const toolbarLayout = factoryOptions.layout === 'toolbar-default';
  keyboard.x = toolbarLayout && keyboardPreset
    ? Math.round((1920 - keyboardPreset.defaultSize.width) / 2)
    : 1210;
  keyboard.y = toolbarLayout && keyboardPreset
    ? 1080 - keyboardPreset.defaultSize.height
    : 620;

  const inputBox = createDefaultElement('KlInputBox', subPageId);
  inputBox.name = 'AgentInputBox';
  if (!toolbarLayout) {
    inputBox.x = 360;
    inputBox.y = spec.image ? 760 : 620;
    inputBox.width = 760;
    inputBox.height = 180;
  }
  inputBox.actions = makeAutomaticJudgeActions('onInputJudge');
  inputBox.props = { ...inputBox.props, _editorLabel: '填空答案区' };

  const answers = spec.answers?.length ? spec.answers : [[]];
  const inputs = answers.map((answerCandidates, index) => {
    const input = createDefaultElement('KlInputImage', subPageId);
    input.name = `AgentInput_${index + 1}`;
    input.parentId = inputBox.id;
    input.x = toolbarLayout ? 366 + index * (input.width + 10) : 20 + index * 190;
    input.y = toolbarLayout ? 366 : 18;
    input.props = {
      ...input.props,
      camp,
      _editorLabel: `填空 ${index + 1}`,
      ...(spec.answerConfirmed ? { [INPUT_ANSWER_CANDIDATES_KEY]: answerCandidates } : {}),
    };
    return input;
  });

  return factoryOptions.includeKeyboard === false
    ? [inputBox, ...inputs]
    : [keyboard, inputBox, ...inputs];
}

export function createHomeworkQuestionStage(
  spec: AgentHomeworkQuestionSpec,
  questionIndex: number,
  presetId = DEFAULT_HOMEWORK_PRESET_ID,
): Stage {
  const preset = PRESET_TEMPLATES.find((candidate) => candidate.id === presetId);
  if (!preset || !preset.courseKinds?.includes('homework')) {
    throw new Error(`不支持的作业预设：${presetId}`);
  }
  const subPageId = makeId('subpage');
  const elements = cloneElementsWithNewIds(preset.elements);
  setQuestionText(elements, '题号', `Q${questionIndex + 1}:`);
  setQuestionText(elements, '题目', spec.title);
  setQuestionText(elements, '正文', spec.body ?? '');
  elements.push(...createQuestionImage(spec, subPageId));

  if (spec.type === 'fill-blank') {
    elements.push(...createHomeworkFillBlankElements(spec, subPageId));
  } else if (spec.type === 'single-choice' || spec.type === 'multiple-choice') {
    elements.push(...createHomeworkChoiceElements(spec, subPageId));
  }

  const subPage: SubPage = {
    id: subPageId,
    name: `第 ${questionIndex + 1} 题`,
    elements,
    frozen: false,
  };
  return {
    id: makeId('stage'),
    name: `第 ${questionIndex + 1} 题`,
    noSubPages: true,
    subPages: [subPage],
  };
}

export function createAgentHomeworkDraft(courseId: string): Course {
  assertAgentHomeworkCourseId(courseId);
  const now = new Date().toISOString();
  return {
    id: courseId,
    kind: 'homework',
    stages: [],
    aiAuthoring: {
      origin: 'agent',
      status: 'ai-draft',
      skillVersion: FORGE_SKILL_VERSION,
      capabilityRevision: FORGE_CAPABILITY_REVISION,
      revision: 0,
      updatedAt: now,
      presetId: DEFAULT_HOMEWORK_PRESET_ID,
      questions: [],
    },
  };
}

export function rebuildAgentHomeworkCourse(course: Course): Course {
  if (!course.aiAuthoring || course.kind !== 'homework') {
    throw new Error('当前课程不是 Agent 创建的作业草稿');
  }
  const next: Course = JSON.parse(JSON.stringify(course));
  next.stages = next.aiAuthoring!.questions.map((question, index) => (
    createHomeworkQuestionStage(question, index, next.aiAuthoring!.presetId)
  ));
  next.aiAuthoring!.updatedAt = new Date().toISOString();
  return next;
}

export function validateAgentHomeworkCourse(course: Course): AgentDraftIssue[] {
  const issues: AgentDraftIssue[] = [];
  if (course.kind !== 'homework' || course.aiAuthoring?.origin !== 'agent') {
    return [{ code: 'not-agent-homework', severity: 'blocking', message: '当前课程不是 Agent 作业草稿' }];
  }
  const questions = course.aiAuthoring.questions;
  if (questions.length === 0) {
    issues.push({ code: 'no-questions', severity: 'blocking', message: '作业草稿还没有题目' });
  }
  if (questions.length !== course.stages.length) {
    issues.push({ code: 'stage-count-mismatch', severity: 'blocking', message: '题目元数据与关卡数量不一致' });
  }
  questions.forEach((question) => {
    if (!question.title.trim()) {
      issues.push({ code: 'missing-title', severity: 'blocking', questionId: question.id, message: '题目缺少题干' });
    }
    if ((question.type === 'single-choice' || question.type === 'multiple-choice') && (question.options?.length ?? 0) < 2) {
      issues.push({ code: 'too-few-options', severity: 'blocking', questionId: question.id, message: '选择题至少需要两个选项' });
    }
    if (question.answerSource === 'inferred' && !question.answerConfirmed) {
      issues.push({ code: 'inferred-answer-unconfirmed', severity: 'blocking', questionId: question.id, message: 'AI 推导答案尚未获得老师确认' });
    } else if (question.type !== 'content' && !question.answerConfirmed) {
      issues.push({ code: 'answer-unconfirmed', severity: 'blocking', questionId: question.id, message: '答案尚未获得老师确认' });
    }
  });
  return issues;
}

export function summarizeAgentHomework(course: Course) {
  return {
    courseId: course.id,
    kind: course.kind,
    status: course.aiAuthoring?.status,
    revision: course.aiAuthoring?.revision,
    questionCount: course.aiAuthoring?.questions.length ?? 0,
    questions: (course.aiAuthoring?.questions ?? []).map((question, index) => ({
      index: index + 1,
      id: question.id,
      type: question.type,
      title: question.title,
      answerSource: question.answerSource,
      answerConfirmed: question.answerConfirmed,
      hasImage: Boolean(question.image?.relativePath),
    })),
  };
}
