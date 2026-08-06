import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAgentHomeworkCourseId,
  createAgentHomeworkDraft,
  createHomeworkChoiceElements,
  createHomeworkFillBlankElements,
  evaluateAgentCompatibility,
  FORGE_CAPABILITY_REVISION,
  FORGE_SKILL_VERSION,
  rebuildAgentHomeworkCourse,
  validateAgentHomeworkCourse,
} from '../src/agent/homeworkAuthoring';
import { getChoiceCorrectOptionIds } from '../src/utils/choiceAnswerRules';
import { getInputAnswerCandidates } from '../src/utils/inputAnswerRules';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

test('Agent 作业草稿使用当前能力修订并保持 AI 草稿边界', () => {
  const course = createAgentHomeworkDraft('s8_v9_09_homework_poc_hw');
  assert.equal(course.kind, 'homework');
  assert.equal(course.aiAuthoring?.status, 'ai-draft');
  assert.equal(course.aiAuthoring?.capabilityRevision, FORGE_CAPABILITY_REVISION);
  assert.equal(course.stages.length, 0);
});

test('Agent 作业草稿沿用编辑器的 _hw ID 规则', () => {
  assert.doesNotThrow(() => assertAgentHomeworkCourseId('s8_v9_09_homework_poc_hw'));
  assert.throws(
    () => assertAgentHomeworkCourseId('s8_v9_09_homework_poc'),
    /必须以 _hw 结尾/,
  );
  assert.throws(
    () => assertAgentHomeworkCourseId('../s8_v9_09_hw'),
    /只能包含字母、数字、下划线和连字符/,
  );
});

test('兼容性检查同时阻止过期能力修订和过期 Skill', () => {
  assert.deepEqual(
    evaluateAgentCompatibility(FORGE_CAPABILITY_REVISION, FORGE_SKILL_VERSION),
    { compatible: true, action: 'continue' },
  );
  assert.deepEqual(
    evaluateAgentCompatibility('old-revision', FORGE_SKILL_VERSION),
    { compatible: false, action: 'reconnect' },
  );
  assert.deepEqual(
    evaluateAgentCompatibility(FORGE_CAPABILITY_REVISION, '0.0.1'),
    { compatible: false, action: 'update-skill-and-reconnect' },
  );
});

test('填空题只有老师确认后才把答案写入判定字段', () => {
  const base = {
    id: 'q1',
    type: 'fill-blank' as const,
    title: '求图形面积。',
    answers: [['24']],
    answerSource: 'inferred' as const,
  };
  const pending = createHomeworkFillBlankElements({ ...base, answerConfirmed: false }, 'page-1');
  const confirmed = createHomeworkFillBlankElements({ ...base, answerConfirmed: true }, 'page-2');
  const pendingInput = pending.find((element) => element.type === 'KlInputImage');
  const confirmedInput = confirmed.find((element) => element.type === 'KlInputImage');
  assert.ok(pendingInput);
  assert.ok(confirmedInput);
  assert.deepEqual(getInputAnswerCandidates(pendingInput), []);
  assert.deepEqual(getInputAnswerCandidates(confirmedInput), ['24']);
});

test('选择题工厂共享作业自动判定规则并使用稳定语义选项', () => {
  const elements = createHomeworkChoiceElements({
    id: 'q-choice',
    type: 'multiple-choice',
    title: '选择正确说法。',
    options: [
      { id: 'a', text: '选项 A' },
      { id: 'b', text: '选项 B' },
      { id: 'c', text: '选项 C' },
    ],
    correctOptionIds: ['a', 'c'],
    answerSource: 'teacher',
    answerConfirmed: true,
  }, 'page-choice');
  const box = elements.find((element) => element.type === 'ChoiceBox');
  assert.ok(box);
  assert.deepEqual(box.actions?.map((action) => action.branchCondition), ['right', 'wrong', 'null']);
  const correctNames = getChoiceCorrectOptionIds(box).map((id) => elements.find((element) => element.id === id)?.name);
  assert.deepEqual(correctNames, ['a', 'c']);
});

test('六道待确认推导题生成六个关卡并阻塞审核', () => {
  const course = createAgentHomeworkDraft('s8_v9_09_homework_poc_hw');
  course.aiAuthoring!.questions = Array.from({ length: 6 }, (_, index) => ({
    id: `q${index + 1}`,
    type: 'fill-blank' as const,
    title: `第 ${index + 1} 题`,
    answers: [[String(index + 1)]],
    answerSource: 'inferred' as const,
    answerConfirmed: false,
  }));
  const rebuilt = rebuildAgentHomeworkCourse(course);
  assert.equal(rebuilt.stages.length, 6);
  assert.ok(rebuilt.stages.every((stage) => stage.noSubPages && stage.subPages.length === 1));
  const issues = validateAgentHomeworkCourse(rebuilt);
  assert.equal(issues.filter((issue) => issue.code === 'inferred-answer-unconfirmed').length, 6);
});
