import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Course, Element, SubPage } from '../src/types';
import {
  buildExportRegressionArtifacts,
  buildHomeworkStandaloneInputJudgeCode,
  buildSdkJudgeClickInitCode,
  collectElementsNeedingVar,
  collectHomeworkStandaloneInputJudgeTargets,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  getSdkJudgeCapability,
  isSdkJudgeTarget,
  SDK_JUDGE_EVENT,
} from '../src/utils/sdkJudge';
import {
  evaluationCourseFixture,
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
  const inputImage = element('input-image', 'KlInputImage');
  const input = element('input', 'KlInputBox');
  const choice = element('choice', 'ChoiceBox');
  const drag = element('drag', 'DragViewBox');
  const matching = element('matching', 'MatchingGame');
  const image = element('image', 'Image');

  assert.deepEqual(getSdkJudgeCapability(inputImage)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(getSdkJudgeCapability(inputImage)?.answerKey, '_judgeAnswer');
  assert.deepEqual(getSdkJudgeCapability(input)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(getSdkJudgeCapability(input)?.answerKey, 'answer');
  assert.deepEqual(getSdkJudgeCapability(choice)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(getSdkJudgeCapability(choice)?.answerKey, 'rightItemNames');
  assert.deepEqual(getSdkJudgeCapability(drag)?.conditions, ['right', 'wrong']);
  assert.deepEqual(getSdkJudgeCapability(matching)?.conditions, ['right', 'wrong', 'null']);
  assert.equal(isSdkJudgeTarget(image), false);
});

test('独立输入格使用编辑器答案生成正确、错误和未完成判定', () => {
  const input = element('single-input', 'KlInputImage', { props: { _judgeAnswer: '8' } });
  const trigger = element('single-trigger', 'Image', { actions: judgeActions(input) });
  const page: SubPage = { id: 'page', name: '页面', elements: [trigger, input] };
  const code = buildSdkJudgeClickInitCode(
    page,
    (item) => item.name ?? item.id,
    (action) => `run_${action.branchCondition};`,
    true,
  );

  assert.match(code, /!this\.single_input\.valueOrSkinIsNull/);
  assert.match(code, /this\.single_input\.fontClipValue === "8"/);
  assert.match(code, /else if \(this\.single_input\.valueOrSkinIsNull\)/);
  assert.match(code, /this\.result = true/);
  assert.match(code, /this\.result = false/);
  assert.match(code, /this\.result = null/);
  assert.doesNotMatch(code, /\.isRight\(\)/);
});

test('作业预设完成只收集配置答案的独立输入控件', () => {
  const inputBox = element('input-box', 'KlInputBox');
  const standaloneInput = element('standalone-input', 'KlInputImage', {
    props: { _judgeAnswer: '12.5' },
  });
  const standaloneFraction = element('standalone-fraction', 'FractionInput', {
    props: { _judgeAnswer: '12<3_4>' },
  });
  const plainInput = element('plain-input', 'KlInputImage', {
    props: { _judgeAnswer: '' },
  });
  const nestedInput = element('nested-input', 'KlInputImage', {
    parentId: inputBox.id,
    props: { _judgeAnswer: '8' },
  });
  const page: SubPage = {
    id: 'page',
    name: '页面',
    elements: [inputBox, standaloneInput, standaloneFraction, plainInput, nestedInput],
  };

  assert.deepEqual(
    collectHomeworkStandaloneInputJudgeTargets(page).map((item) => item.id),
    ['standalone-input', 'standalone-fraction'],
  );

  const code = buildHomeworkStandaloneInputJudgeCode(
    page,
    (item) => item.name ?? item.id,
  );
  assert.match(code, /this\.standalone_input\.valueOrSkinIsNull/);
  assert.match(code, /this\.standalone_input\.fontClipValue \|\| ""\) === "12\.5"/);
  assert.match(code, /this\.standalone_fraction\.valueOrSkinIsNull/);
  assert.match(code, /this\.standalone_fraction\.fontClipValue \|\| ""\) === "12<3_4>"/);
  assert.doesNotMatch(code, /plain_input/);
  assert.doesNotMatch(code, /nested_input/);

  const vars = collectElementsNeedingVar(page);
  assert.equal(vars.has(standaloneInput.id), true);
  assert.equal(vars.has(standaloneFraction.id), true);
  assert.equal(vars.has(plainInput.id), false);
  assert.equal(vars.has(nestedInput.id), false);
});

test('作业与专题测评预设完成聚合多个独立输入答案', () => {
  for (const course of [homeworkCourseFixture(), evaluationCourseFixture()]) {
    const page = activePage(course);
    page.elements.push(
      element(`${course.kind}-answer-input`, 'KlInputImage', {
        props: { _judgeAnswer: '12.5' },
      }),
      element(`${course.kind}-answer-fraction`, 'FractionInput', {
        props: { _judgeAnswer: '12<3_4>' },
      }),
      element(`${course.kind}-plain-input`, 'KlInputImage', {
        props: { _judgeAnswer: '' },
      }),
    );

    const artifact = buildExportRegressionArtifacts(course).scenes[0];
    const source = artifact.source;
    const inputVar = `${course.kind}_answer_input`;
    const fractionVar = `${course.kind}_answer_fraction`;

    assert.match(source, new RegExp(`this\\.${inputVar}\\.valueOrSkinIsNull`));
    assert.match(source, new RegExp(`this\\.${fractionVar}\\.valueOrSkinIsNull`));
    assert.match(source, /__forgeJudgeResults\.indexOf\(null\) >= 0/);
    assert.match(source, /__forgeJudgeResults\.every\(function\(value\) \{ return value === true; \}\)/);
    assert.equal((source.match(/this\.result = __forgeJudgeResults/g) ?? []).length, 1);
    assert.doesNotMatch(source, new RegExp(`${course.kind}_plain_input\\.fontClipValue`));
    assert.doesNotMatch(JSON.stringify(artifact.scene), /_judgeAnswer/);
  }
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
  const normalInput = element('normal-judge-input', 'KlInputImage', { props: { _judgeAnswer: '8' } });
  const normalFeedback = element('normal-judge-feedback', 'Image');
  const normalTrigger = element('normal-judge-trigger', 'Image', {
    actions: judgeActions(normalInput, normalFeedback),
  });
  activePage(normal).elements.push(normalTrigger, normalInput, normalFeedback);
  const normalArtifacts = buildExportRegressionArtifacts(normal, regressionImageSizes('game_lt'));
  const normalSource = normalArtifacts.scenes[0].source;
  assert.match(normalSource, /this\.normal_judge_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(normalSource, /!this\.normal_judge_input\.valueOrSkinIsNull/);
  assert.match(normalSource, /this\.normal_judge_input\.fontClipValue === "8"/);
  assert.match(normalSource, /this\.normal_judge_feedback/);
  assert.doesNotMatch(JSON.stringify(normalArtifacts.scenes[0].scene), /_judgeAnswer/);

  const homework = homeworkCourseFixture();
  const homeworkChoice = element('homework-choice', 'ChoiceBox', { props: { rightItemNames: 'B' } });
  const homeworkTrigger = element('homework-trigger', 'Image', { actions: judgeActions(homeworkChoice) });
  const homeworkInput = element('homework-input', 'KlInputImage', { props: { _judgeAnswer: 'B' } });
  const homeworkInputTrigger = element('homework-input-trigger', 'Image', { actions: judgeActions(homeworkInput) });
  activePage(homework).elements.push(homeworkTrigger, homeworkChoice, homeworkInputTrigger, homeworkInput);
  const homeworkSource = buildExportRegressionArtifacts(
    homework,
    regressionImageSizes('game_hw'),
  ).scenes[0].source;
  assert.match(homeworkSource, /this\.homework_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(homeworkSource, /this\.homework_choice\.isNull/);
  assert.match(homeworkSource, /this\.result = null/);
  assert.match(homeworkSource, /this\.homework_input\.fontClipValue === "B"/);

  const preview = previewCourseFixture();
  const previewMatching = element('preview-matching', 'MatchingGame');
  const previewTrigger = element('preview-trigger', 'Image', { actions: judgeActions(previewMatching) });
  const previewInput = element('preview-input', 'KlInputImage', { props: { _judgeAnswer: 'A' } });
  const previewInputTrigger = element('preview-input-trigger', 'Image', { actions: judgeActions(previewInput) });
  activePage(preview, true).elements.push(
    previewTrigger,
    previewMatching,
    previewInputTrigger,
    previewInput,
  );
  const previewSource = buildPreviewExportRegressionArtifacts(
    preview,
    regressionImageSizes('game_preview'),
  ).scenes[0].source;
  assert.match(previewSource, /this\.preview_trigger\.on\(Laya\.Event\.CLICK/);
  assert.match(previewSource, /this\.preview_matching\.allRight/);
  assert.match(previewSource, /this\.preview_matching\.isNull\(\)/);
  assert.match(previewSource, /this\.preview_input\.fontClipValue === "A"/);
});
