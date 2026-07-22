import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element, SubPage } from '../src/types';
import {
  buildFillAnswerSchemeInitCode,
  collectFillAnswerSchemeIssues,
  createFillAnswerScheme,
  FILL_ANSWER_SCHEMES_KEY,
  hasFillAnswerSchemes,
  remapFillAnswerSchemeRefs,
  type FillAnswerScheme,
} from '../src/utils/fillAnswerSchemes';
import {
  buildExportRegressionArtifacts,
  collectElementsNeedingVar,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
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

function activePage(course: Course, preview = false): SubPage {
  return (preview ? course.previewStages! : course.stages)[0].subPages[0];
}

function answerPage(orderMode: FillAnswerScheme['orderMode'] = 'fixed'): {
  page: SubPage;
  target: Element;
  normalInput: Element;
  fractionInput: Element;
} {
  const target = element('fill-box', 'KlInputBox');
  const normalInput = element('normal-input', 'KlInputImage', { parentId: target.id });
  const fractionInput = element('fraction-input', 'FractionInput', { parentId: target.id });
  target.props[FILL_ANSWER_SCHEMES_KEY] = [{
    id: 'scheme-1',
    orderMode,
    slots: [
      { inputId: normalInput.id, inputNameSnapshot: normalInput.name, answer: '5' },
      { inputId: fractionInput.id, inputNameSnapshot: fractionInput.name, answer: '6' },
    ],
  } satisfies FillAnswerScheme];
  return {
    page: { id: 'page', name: '页面', elements: [target, normalInput, fractionInput] },
    target,
    normalInput,
    fractionInput,
  };
}

function installGeneratedJudge(page: SubPage): Record<string, { fontClipValue?: string; valueOrSkinIsNull?: boolean; isRight?: () => boolean; isNull?: () => boolean }> {
  const context: Record<string, { fontClipValue?: string; valueOrSkinIsNull?: boolean; isRight?: () => boolean; isNull?: () => boolean }> = {};
  for (const item of page.elements) context[item.name ?? item.id] = {};
  const code = buildFillAnswerSchemeInitCode(page, (item) => item.name ?? item.id);
  Function('context', `return (function() { ${code} return this; }).call(context);`)(context);
  return context;
}

test('固定顺序方案按稳定输入引用判定，并在多套方案之间取 OR', () => {
  const { page, target } = answerPage('fixed');
  const schemes = target.props[FILL_ANSWER_SCHEMES_KEY] as FillAnswerScheme[];
  target.props[FILL_ANSWER_SCHEMES_KEY] = [
    ...schemes,
    {
      id: 'scheme-2',
      orderMode: 'fixed',
      slots: schemes[0].slots.map((slot, index) => ({ ...slot, answer: index === 0 ? '7' : '8' })),
    },
  ];
  const runtime = installGeneratedJudge(page);
  const box = runtime.fill_box;
  runtime.normal_input.fontClipValue = '7';
  runtime.normal_input.valueOrSkinIsNull = false;
  runtime.fraction_input.fontClipValue = '8';
  runtime.fraction_input.valueOrSkinIsNull = false;
  assert.equal(box.isNull?.(), false);
  assert.equal(box.isRight?.(), true);

  runtime.normal_input.fontClipValue = '8';
  runtime.fraction_input.fontClipValue = '7';
  assert.equal(box.isRight?.(), false);
  runtime.fraction_input.valueOrSkinIsNull = true;
  assert.equal(box.isNull?.(), true);
  assert.equal(box.isRight?.(), false);
});

test('可互换方案保留重复次数，允许 5、6 互换但拒绝 5、5', () => {
  const { page } = answerPage('interchangeable');
  const runtime = installGeneratedJudge(page);
  runtime.normal_input.fontClipValue = '6';
  runtime.normal_input.valueOrSkinIsNull = false;
  runtime.fraction_input.fontClipValue = '5';
  runtime.fraction_input.valueOrSkinIsNull = false;
  assert.equal(runtime.fill_box.isRight?.(), true);

  runtime.normal_input.fontClipValue = '5';
  runtime.fraction_input.fontClipValue = '5';
  assert.equal(runtime.fill_box.isRight?.(), false);
});

test('答案引用不受改名和排序影响，新增或删除空位会给出可修复问题', () => {
  const { page, target, normalInput, fractionInput } = answerPage();
  normalInput.name = 'renamed_input';
  page.elements = [fractionInput, target, normalInput];
  assert.deepEqual(collectFillAnswerSchemeIssues(target, page.elements), []);

  const newInput = element('new-input', 'KlInputImage', { parentId: target.id });
  page.elements.push(newInput);
  assert.ok(collectFillAnswerSchemeIssues(target, page.elements).some((issue) => issue.code === 'missing-slot'));
  page.elements = page.elements.filter((item) => item.id !== fractionInput.id);
  assert.ok(collectFillAnswerSchemeIssues(target, page.elements).some((issue) => issue.code === 'missing-input'));
});

test('复制页面时答案方案同步重建输入引用和方案 ID', () => {
  const { target, normalInput, fractionInput } = answerPage();
  const idMap = new Map([
    [target.id, 'fill-box-copy'],
    [normalInput.id, 'normal-input-copy'],
    [fractionInput.id, 'fraction-input-copy'],
  ]);
  const cloned = structuredClone(target);
  remapFillAnswerSchemeRefs(cloned, idMap, (prefix) => `${prefix}-copy`);
  const scheme = (cloned.props[FILL_ANSWER_SCHEMES_KEY] as FillAnswerScheme[])[0];
  assert.equal(scheme.id, 'answer-scheme-copy');
  assert.deepEqual(scheme.slots.map((slot) => slot.inputId), ['normal-input-copy', 'fraction-input-copy']);
});

test('答案方案输入格会生成 var，并在正常、作业和预习导出中注入同一判定', () => {
  const addQuestion = (page: SubPage) => {
    const answer = answerPage();
    page.elements.push(...answer.page.elements);
  };

  const normal = normalCourseFixture();
  addQuestion(activePage(normal));
  const normalPage = activePage(normal);
  const normalVars = collectElementsNeedingVar(normalPage);
  assert.ok(normalVars.has('normal-input'));
  assert.ok(normalVars.has('fraction-input'));
  const normalArtifacts = buildExportRegressionArtifacts(normal, regressionImageSizes('game_lt'));
  assert.match(normalArtifacts.scenes[0].source, /__target\.isRight = function\(\)/);
  assert.doesNotMatch(JSON.stringify(normalArtifacts.scenes[0].scene), /_answerSchemes/);

  const homework = homeworkCourseFixture();
  addQuestion(activePage(homework));
  const homeworkSource = buildExportRegressionArtifacts(homework, regressionImageSizes('game_hw')).scenes[0].source;
  assert.match(homeworkSource, /__target\.isNull = function\(\)/);

  const preview = previewCourseFixture();
  addQuestion(activePage(preview, true));
  const previewSource = buildPreviewExportRegressionArtifacts(preview, regressionImageSizes('game_preview')).scenes[0].source;
  assert.match(previewSource, /__target\.isRight = function\(\)/);
});

test('旧 KlInputBox 未配置结构化方案时继续保留原 answer 行为', () => {
  const target = element('legacy-box', 'KlInputBox', { props: { answer: '1,2' } });
  const input1 = element('legacy-1', 'KlInputImage', { parentId: target.id });
  const input2 = element('legacy-2', 'KlInputImage', { parentId: target.id });
  const page: SubPage = { id: 'legacy-page', name: '旧页面', elements: [target, input1, input2] };
  assert.equal(buildFillAnswerSchemeInitCode(page, (item) => item.name ?? item.id), '');
  assert.deepEqual(collectFillAnswerSchemeIssues(target, page.elements), []);
  const seeded = createFillAnswerScheme([input1, input2], String(target.props.answer).split(','));
  assert.deepEqual(seeded.slots.map((slot) => slot.answer), ['1', '2']);
});

test('删除最后一套方案后回退到旧答案模式', () => {
  const target = element('legacy-box', 'KlInputBox', { props: { _answerSchemes: undefined } });
  assert.equal(hasFillAnswerSchemes(target), false);
  assert.deepEqual(collectFillAnswerSchemeIssues(target, [target]), []);
});
