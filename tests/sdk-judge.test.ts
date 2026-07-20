import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Course, Element, SubPage } from '../src/types';
import {
  buildExportRegressionArtifacts,
  buildSdkJudgeClickInitCode,
  collectElementsNeedingVar,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  getSdkJudgeCapability,
  isSdkJudgeTarget,
  SDK_JUDGE_EVENT,
} from '../src/utils/sdkJudge';
import {
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
  regressionImageSizes,
} from './fixtures/export-courses';

function element(id: string, type: string, extra: Partial<Element> = {}): Element {
  return {
    id,
    type,
    layaType: type,
    name: id.replace(/-/g, '_'),
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
    ...extra,
  };
}

function judgeActions(judgeTarget: Element, actionTarget?: Element): Action[] {
  return [
    {
      id: 'judge-right',
      event: SDK_JUDGE_EVENT,
      actionType: actionTarget ? 'setVisible' : 'showAnswerRight',
      targetId: actionTarget?.id,
      value: true,
      groupId: 'judge-group',
      branchId: 'right-branch',
      branchCondition: 'right',
      judgeTargetId: judgeTarget.id,
      judgeTargetNameSnapshot: judgeTarget.name,
    },
    {
      id: 'judge-wrong',
      event: SDK_JUDGE_EVENT,
      actionType: 'showAnswerWrong',
      groupId: 'judge-group',
      branchId: 'wrong-branch',
      branchCondition: 'wrong',
      judgeTargetId: judgeTarget.id,
      judgeTargetNameSnapshot: judgeTarget.name,
    },
    {
      id: 'judge-null',
      event: SDK_JUDGE_EVENT,
      actionType: 'none',
      groupId: 'judge-group',
      branchId: 'null-branch',
      branchCondition: 'null',
      judgeTargetId: judgeTarget.id,
      judgeTargetNameSnapshot: judgeTarget.name,
    },
  ];
}

function activePage(course: Course, preview = false): SubPage {
  const stages = preview ? course.previewStages ?? [] : course.stages;
  return stages[0].subPages[0];
}

test('SDK 判定目标矩阵只接受现有题型组件并返回真实结果能力', () => {
  const input = element('input', 'KlInputBox');
  const choice = element('choice', 'ChoiceBox');
  const drag = element('drag', 'DragViewBox');
  const matching = element('matching', 'MatchingGame');
  const image = element('image', 'Image');

  assert.deepEqual(getSdkJudgeCapability(input)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(getSdkJudgeCapability(input)?.answerKey, 'answer');
  assert.deepEqual(getSdkJudgeCapability(choice)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(getSdkJudgeCapability(choice)?.answerKey, 'rightItemNames');
  assert.deepEqual(getSdkJudgeCapability(drag)?.conditions, ['right', 'wrong']);
  assert.deepEqual(getSdkJudgeCapability(matching)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(isSdkJudgeTarget(image), false);
});

test('通用点击判定分离判定目标与结果动作目标', () => {
  const input = element('answer-input', 'KlInputBox');
  const feedback = element('feedback-image', 'Image');
  const trigger = element('trigger-image', 'Image', { actions: judgeActions(input, feedback) });
  const page: SubPage = { id: 'page', name: '页面', elements: [trigger, input, feedback] };
  const code = buildSdkJudgeClickInitCode(
    page,
    (item) => item.name ?? item.id,
    (action) => `run_${action.actionType}_${action.targetId ?? 'self'};`,
  );

  assert.match(code, /this\.trigger_image\.on\(Laya\.Event\.CLICK/);
  assert.match(code, /this\.answer_input\.isRight\(\)/);
  assert.match(code, /this\.answer_input\.isNull\(\)/);
  assert.match(code, /run_setVisible_feedback-image/);
  assert.match(code, /run_showAnswerWrong_self/);

  const vars = collectElementsNeedingVar(page);
  assert.equal(vars.has(trigger.id), true);
  assert.equal(vars.has(input.id), true);
  assert.equal(vars.has(feedback.id), true);
});

test('拖拽目标只生成正确和错误分支，作业模式同步 result', () => {
  const drag = element('drag-target', 'DragViewBox');
  const trigger = element('drag-trigger', 'Image', { actions: judgeActions(drag) });
  const page: SubPage = { id: 'page', name: '页面', elements: [trigger, drag] };
  const code = buildSdkJudgeClickInitCode(
    page,
    (item) => item.name ?? item.id,
    (action) => `run_${action.branchCondition};`,
    true,
  );

  assert.match(code, /dragsOnRightDrops\(\)/);
  assert.match(code, /this\.result = true/);
  assert.match(code, /this\.result = false/);
  assert.doesNotMatch(code, /isNull/);
  assert.doesNotMatch(code, /run_null/);
});

test('失效或不兼容的判定目标不会生成悬空运行代码', () => {
  const trigger = element('trigger', 'Image', {
    actions: [{
      ...judgeActions(element('missing', 'KlInputBox'))[0],
      judgeTargetId: 'missing',
    }],
  });
  const page: SubPage = { id: 'page', name: '页面', elements: [trigger] };
  const code = buildSdkJudgeClickInitCode(page, (item) => item.name ?? item.id, () => 'run;');
  assert.equal(code, '');
});

test('正常课、作业和预习导出都生成通用点击判定', () => {
  const normal = normalCourseFixture();
  const normalInput = element('normal-judge-input', 'KlInputBox', { props: { answer: '8' } });
  const normalFeedback = element('normal-judge-feedback', 'Image');
  const normalTrigger = element('normal-judge-trigger', 'Image', {
    actions: judgeActions(normalInput, normalFeedback),
  });
  activePage(normal).elements.push(normalTrigger, normalInput, normalFeedback);
  const normalArtifacts = buildExportRegressionArtifacts(normal, regressionImageSizes('game_lt'));
  const normalSource = normalArtifacts.scenes[0].source;
  assert.match(normalSource, /this\.normal_judge_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(normalSource, /this\.normal_judge_input\.isRight\(\)/);
  assert.match(normalSource, /this\.normal_judge_feedback/);

  const homework = homeworkCourseFixture();
  const homeworkChoice = element('homework-choice', 'ChoiceBox', { props: { rightItemNames: 'B' } });
  const homeworkTrigger = element('homework-trigger', 'Image', { actions: judgeActions(homeworkChoice) });
  activePage(homework).elements.push(homeworkTrigger, homeworkChoice);
  const homeworkSource = buildExportRegressionArtifacts(
    homework,
    regressionImageSizes('game_hw'),
  ).scenes[0].source;
  assert.match(homeworkSource, /this\.homework_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(homeworkSource, /this\.homework_choice\.isNull/);
  assert.match(homeworkSource, /this\.result = null/);

  const preview = previewCourseFixture();
  const previewMatching = element('preview-matching', 'MatchingGame');
  const previewTrigger = element('preview-trigger', 'Image', { actions: judgeActions(previewMatching) });
  activePage(preview, true).elements.push(previewTrigger, previewMatching);
  const previewSource = buildPreviewExportRegressionArtifacts(
    preview,
    regressionImageSizes('game_preview'),
  ).scenes[0].source;
  assert.match(previewSource, /this\.preview_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(previewSource, /this\.preview_matching\.allRight/);
  assert.match(previewSource, /this\.preview_matching\.isNull\(\)/);
});
