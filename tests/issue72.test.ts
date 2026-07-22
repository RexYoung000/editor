import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element, SubPage } from '../src/types';
import {
  buildInputRuleInitCode,
  buildInputRuleConfirmInitCode,
  collectInputRuleIssues,
  createInputRelation,
  evaluateStructuredInputRuleState,
  evaluateInputRelation,
  findInputRuleHostAncestor,
  getFillAnswerInputs,
  getInputAnswerCandidates,
  getInputRuleDisplayName,
  hasStructuredInputRules,
  INPUT_ANSWER_CANDIDATES_KEY,
  INPUT_RELATIONS_KEY,
  INPUT_RULE_ENABLED_KEY,
  isInputRuleHost,
  parseRuleNumber,
  remapInputRelationRefs,
  splitAnswerCandidates,
  type InputRelation,
} from '../src/utils/inputAnswerRules';
import { buildExportRegressionArtifacts, collectElementsNeedingVar } from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import { withLayerLabel } from '../src/utils/layerPresentation';
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

function relationPage(withStandaloneSlot = false): {
  page: SubPage;
  target: Element;
  left: Element;
  right: Element;
  standalone?: Element;
} {
  const target = element('fill-box', 'KlInputBox');
  const left = element('left-input', 'KlInputImage', { parentId: target.id });
  const right = element('right-input', 'KlInputImage', { parentId: target.id });
  const relation: InputRelation = {
    id: 'relation-1',
    leftInputId: left.id,
    rightInputId: right.id,
    operator: 'multiply',
    target: '4',
  };
  target.props[INPUT_RELATIONS_KEY] = [relation];
  const standalone = withStandaloneSlot
    ? element('standalone-slot', 'FractionInput', {
        parentId: target.id,
        props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['<1_2>', '<2_3>'] },
      })
    : undefined;
  return { page: { id: 'page', name: '页面', elements: [target, left, right, ...(standalone ? [standalone] : [])] }, target, left, right, standalone };
}

function installGeneratedJudge(page: SubPage): Record<string, {
  fontClipValue?: string;
  valueOrSkinIsNull?: boolean;
  isRight?: () => boolean;
  isNull?: () => boolean;
}> {
  const context: Record<string, {
    fontClipValue?: string;
    valueOrSkinIsNull?: boolean;
    isRight?: () => boolean;
    isNull?: () => boolean;
  }> = {};
  for (const item of page.elements) context[item.name ?? item.id] = {};
  const code = buildInputRuleInitCode(page, (item) => item.name ?? item.id);
  Function('context', `return (function() { ${code} return this; }).call(context);`)(context);
  return context;
}

test('普通输入框支持逗号、分号和回车分隔多个候选答案', () => {
  assert.deepEqual(splitAnswerCandidates('1, 2；3\n2'), ['1', '2', '3']);
  const input = element('input', 'KlInputImage', { props: { _judgeAnswer: '甲;乙，丙' } });
  assert.deepEqual(getInputAnswerCandidates(input), ['甲', '乙', '丙']);
  input.props[INPUT_ANSWER_CANDIDATES_KEY] = ['新答案', '另一个'];
  assert.deepEqual(getInputAnswerCandidates(input), ['新答案', '另一个']);
});

test('关系配置显示用户图层名称，并在重命名后立即读取新名称', () => {
  const input = element('input', 'KlInputImage', { name: 'KlInputImage_1' });
  input.props = withLayerLabel(input.props, '左因数');
  assert.equal(getInputRuleDisplayName(input), '左因数');
  input.props = withLayerLabel(input.props, '新的左因数');
  assert.equal(getInputRuleDisplayName(input), '新的左因数');
  assert.equal(input.name, 'KlInputImage_1');
});

test('ContainerBox 只有显式开启后才成为答题判定容器', () => {
  const target = element('answer-group', 'ContainerBox', {
    props: { [INPUT_RULE_ENABLED_KEY]: false },
  });
  const left = element('group-left', 'KlInputImage', {
    parentId: target.id,
    props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['1'] },
  });
  const right = element('group-right', 'KlInputImage', {
    parentId: target.id,
    props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['4'] },
  });
  const page: SubPage = { id: 'container-page', name: '容器页', elements: [target, left, right] };

  assert.equal(isInputRuleHost(target), false);
  assert.equal(findInputRuleHostAncestor(left, page.elements), undefined);
  assert.deepEqual(getFillAnswerInputs(target, page.elements), []);
  assert.equal(hasStructuredInputRules(target, page.elements), false);

  target.props[INPUT_RULE_ENABLED_KEY] = true;
  target.props[INPUT_RELATIONS_KEY] = [createInputRelation(left.id, right.id, 'multiply', '4')];
  assert.equal(isInputRuleHost(target), true);
  assert.equal(findInputRuleHostAncestor(left, page.elements)?.id, target.id);
  assert.deepEqual(getFillAnswerInputs(target, page.elements).map((item) => item.id), [left.id, right.id]);
  assert.deepEqual(collectInputRuleIssues(target, page.elements), []);
  assert.match(buildInputRuleInitCode(page, (item) => item.name ?? item.id), /this\.answer_group/);

  target.props[INPUT_RULE_ENABLED_KEY] = false;
  assert.equal(hasStructuredInputRules(target, page.elements), false);
  assert.ok(Array.isArray(target.props[INPUT_RELATIONS_KEY]), '关闭开关应保留已有关系配置');
});

test('嵌套答题容器只收集离输入框最近的一组', () => {
  const outer = element('outer-box', 'KlInputBox');
  const inner = element('inner-box', 'ContainerBox', {
    parentId: outer.id,
    props: { [INPUT_RULE_ENABLED_KEY]: true },
  });
  const outerInput = element('outer-input', 'KlInputImage', {
    parentId: outer.id,
    props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['1'] },
  });
  const innerInput = element('inner-input', 'KlInputImage', {
    parentId: inner.id,
    props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['2'] },
  });
  const elements = [outer, inner, outerInput, innerInput];

  assert.deepEqual(getFillAnswerInputs(outer, elements).map((item) => item.id), [outerInput.id]);
  assert.deepEqual(getFillAnswerInputs(inner, elements).map((item) => item.id), [innerInput.id]);
  assert.equal(findInputRuleHostAncestor(innerInput, elements)?.id, inner.id);

  inner.props[INPUT_RULE_ENABLED_KEY] = false;
  assert.deepEqual(getFillAnswerInputs(outer, elements).map((item) => item.id), [outerInput.id, innerInput.id]);
  assert.equal(findInputRuleHostAncestor(innerInput, elements)?.id, outer.id);
});

test('ContainerBox 确定按钮使用通用三态判定而不调用 KlInputBox 专用方法', () => {
  const button = element('confirm-button', 'ConfirmButton');
  const target = element('answer-box', 'ContainerBox', {
    props: { [INPUT_RULE_ENABLED_KEY]: true },
  });
  const code = buildInputRuleConfirmInitCode(button, target, (item) => item.name ?? item.id, true);
  let clickHandler: (() => void) | undefined;
  const faces: number[] = [];
  let state: boolean | null = null;
  const context = {
    confirm_button: {
      on: (_event: string, caller: unknown, handler: () => void) => {
        clickHandler = handler.bind(caller);
      },
    },
    answer_box: {
      isNull: () => state === null,
      isRight: () => state === true,
    },
    _lockBox: { visible: false },
    showAnswerFace: (face: number) => faces.push(face),
  };
  Function('context', 'Laya', `return (function() { ${code} }).call(context);`)(context, { Event: { CLICK: 'click' } });
  assert.ok(clickHandler);

  clickHandler?.();
  assert.deepEqual(faces, []);
  assert.equal(context._lockBox.visible, false);

  state = false;
  clickHandler?.();
  assert.deepEqual(faces, [2]);
  assert.equal(context._lockBox.visible, false);

  state = true;
  clickHandler?.();
  assert.deepEqual(faces, [2, 1]);
  assert.equal(context._lockBox.visible, true);
  assert.doesNotMatch(code, /GameUtils\.initConfirm|getWrongIdx|showWrongTips/);
});

test('数值解析支持小数、简单分数和带整数部分的结构化分数', () => {
  assert.equal(parseRuleNumber('0.5'), 0.5);
  assert.equal(parseRuleNumber('1/2'), 0.5);
  assert.equal(parseRuleNumber('<1_2>'), 0.5);
  assert.equal(parseRuleNumber('1<1_2>'), 1.5);
  assert.equal(parseRuleNumber('<1_0>'), null);
  assert.equal(parseRuleNumber('1+2'), null);
});

test('乘法关系动态接受所有满足目标的整数和小数答案', () => {
  const relation = createInputRelation('left', 'right', 'multiply', '4');
  assert.equal(evaluateInputRelation(relation, '1', '4'), true);
  assert.equal(evaluateInputRelation(relation, '4', '1'), true);
  assert.equal(evaluateInputRelation(relation, '2', '2'), true);
  assert.equal(evaluateInputRelation(relation, '0.5', '8'), true);
  assert.equal(evaluateInputRelation(relation, '<1_2>', '8'), true);
  assert.equal(evaluateInputRelation(relation, '1', '1'), false);
  assert.equal(evaluateInputRelation(relation, '2', '3'), false);
});

test('加减乘除和相等关系覆盖浮点容差与除零', () => {
  assert.equal(evaluateInputRelation(createInputRelation('a', 'b', 'add', '0.3'), '0.1', '0.2'), true);
  assert.equal(evaluateInputRelation(createInputRelation('a', 'b', 'subtract', '2'), '5', '3'), true);
  assert.equal(evaluateInputRelation(createInputRelation('a', 'b', 'divide', '2'), '4', '2'), true);
  assert.equal(evaluateInputRelation(createInputRelation('a', 'b', 'divide', '2'), '4', '0'), false);
  assert.equal(evaluateInputRelation(createInputRelation('a', 'b', 'equal'), '<1_2>', '0.5'), true);
});

test('填空题将算式关系与未关联空位候选答案做 AND 聚合', () => {
  const { page } = relationPage(true);
  const runtime = installGeneratedJudge(page);
  runtime.left_input.fontClipValue = '0.5';
  runtime.left_input.valueOrSkinIsNull = false;
  runtime.right_input.fontClipValue = '8';
  runtime.right_input.valueOrSkinIsNull = false;
  runtime.standalone_slot.fontClipValue = '<1_2>';
  runtime.standalone_slot.valueOrSkinIsNull = false;
  assert.equal(runtime.fill_box.isNull?.(), false);
  assert.equal(runtime.fill_box.isRight?.(), true);

  runtime.standalone_slot.fontClipValue = '<3_4>';
  assert.equal(runtime.fill_box.isRight?.(), false);
  runtime.standalone_slot.valueOrSkinIsNull = true;
  assert.equal(runtime.fill_box.isNull?.(), true);
});

test('编辑器即时预览与导出使用相同的结构化判定状态', () => {
  const { page, target, left, right } = relationPage();
  const values = new Map<string, { value: string; isEmpty: boolean }>([
    [left.id, { value: '0.5', isEmpty: false }],
    [right.id, { value: '8', isEmpty: false }],
  ]);
  assert.equal(evaluateStructuredInputRuleState(target, page.elements, (input) => values.get(input.id)), true);
  values.set(right.id, { value: '7', isEmpty: false });
  assert.equal(evaluateStructuredInputRuleState(target, page.elements, (input) => values.get(input.id)), false);
  values.set(right.id, { value: '', isEmpty: true });
  assert.equal(evaluateStructuredInputRuleState(target, page.elements, (input) => values.get(input.id)), null);
});

test('关系引用稳定，并阻止重复占用、失效输入和无规则空位', () => {
  const { page, target, left, right } = relationPage();
  assert.deepEqual(collectInputRuleIssues(target, page.elements), []);
  const extra = element('extra-input', 'KlInputImage', { parentId: target.id });
  page.elements.push(extra);
  assert.ok(collectInputRuleIssues(target, page.elements).some((issue) => issue.code === 'missing-answer'));
  extra.props[INPUT_ANSWER_CANDIDATES_KEY] = ['9'];
  (target.props[INPUT_RELATIONS_KEY] as InputRelation[]).push({
    id: 'relation-2',
    leftInputId: left.id,
    rightInputId: extra.id,
    operator: 'add',
    target: '10',
  });
  assert.ok(collectInputRuleIssues(target, page.elements).some((issue) => issue.code === 'duplicate-input'));
  page.elements = page.elements.filter((item) => item.id !== right.id);
  assert.ok(collectInputRuleIssues(target, page.elements).some((issue) => issue.code === 'missing-input'));
});

test('复制页面时算式关系同步重建输入引用和关系 ID', () => {
  const { target, left, right } = relationPage();
  const cloned = structuredClone(target);
  remapInputRelationRefs(cloned, new Map([
    [target.id, 'fill-box-copy'],
    [left.id, 'left-copy'],
    [right.id, 'right-copy'],
  ]), (prefix) => `${prefix}-copy`);
  const relation = (cloned.props[INPUT_RELATIONS_KEY] as InputRelation[])[0];
  assert.equal(relation.id, 'input-relation-copy');
  assert.equal(relation.leftInputId, 'left-copy');
  assert.equal(relation.rightInputId, 'right-copy');
});

test('正常、作业和预习导出注入同一关系判定并剥离编辑器字段', () => {
  const addQuestion = (page: SubPage) => page.elements.push(...relationPage(true).page.elements);

  const normal = normalCourseFixture();
  addQuestion(activePage(normal));
  const normalPage = activePage(normal);
  const vars = collectElementsNeedingVar(normalPage);
  assert.ok(vars.has('left-input'));
  assert.ok(vars.has('right-input'));
  const normalArtifacts = buildExportRegressionArtifacts(normal, regressionImageSizes('game_lt'));
  assert.match(normalArtifacts.scenes[0].source, /__target\.isRight = function\(\)/);
  assert.match(normalArtifacts.scenes[0].source, /Math\.abs\(a - b\)/);
  assert.doesNotMatch(JSON.stringify(normalArtifacts.scenes[0].scene), /_inputRelations|_judgeAnswers/);

  const homework = homeworkCourseFixture();
  addQuestion(activePage(homework));
  assert.match(buildExportRegressionArtifacts(homework, regressionImageSizes('game_hw')).scenes[0].source, /__target\.isNull = function\(\)/);

  const preview = previewCourseFixture();
  addQuestion(activePage(preview, true));
  assert.match(buildPreviewExportRegressionArtifacts(preview, regressionImageSizes('game_preview')).scenes[0].source, /__target\.isRight = function\(\)/);
});

test('正常与预习导出为 ContainerBox 确定按钮生成通用点击监听', () => {
  const addQuestion = (page: SubPage) => {
    const target = element('container-answer-box', 'ContainerBox', {
      props: { [INPUT_RULE_ENABLED_KEY]: true },
    });
    const left = element('container-left', 'KlInputImage', {
      parentId: target.id,
      props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['1'] },
    });
    const right = element('container-right', 'KlInputImage', {
      parentId: target.id,
      props: { [INPUT_ANSWER_CANDIDATES_KEY]: ['6'] },
    });
    target.props[INPUT_RELATIONS_KEY] = [createInputRelation(left.id, right.id, 'multiply', '6')];
    const button = element('container-confirm', 'ConfirmButton', {
      actions: [{
        id: 'container-confirm-action',
        event: 'onClickInitConfirmWithLock',
        targetId: target.id,
        targetNameSnapshot: target.name,
        actionType: 'toggleVisible',
      }],
    });
    page.elements.push(target, left, right, button);
  };

  const normal = normalCourseFixture();
  addQuestion(activePage(normal));
  const normalSource = buildExportRegressionArtifacts(normal, regressionImageSizes('game_lt')).scenes[0].source;
  assert.match(normalSource, /this\.container_confirm\.on\(Laya\.Event\.CLICK/);
  assert.match(normalSource, /this\.container_answer_box/);
  assert.doesNotMatch(normalSource, /GameUtils\.initConfirm\(this, this\.container_confirm/);

  const preview = previewCourseFixture();
  addQuestion(activePage(preview, true));
  const previewSource = buildPreviewExportRegressionArtifacts(preview, regressionImageSizes('game_preview')).scenes[0].source;
  assert.match(previewSource, /this\.container_confirm\.on\(Laya\.Event\.CLICK/);
  assert.doesNotMatch(previewSource, /GameUtils\.initConfirm\(this, this\.container_confirm/);
});

test('没有新候选或关系的历史填空题继续使用原 answer 判定', () => {
  const target = element('legacy-box', 'KlInputBox', { props: { answer: '1,2' } });
  const input1 = element('legacy-1', 'KlInputImage', { parentId: target.id });
  const input2 = element('legacy-2', 'KlInputImage', { parentId: target.id });
  const page: SubPage = { id: 'legacy-page', name: '旧页面', elements: [target, input1, input2] };
  assert.equal(hasStructuredInputRules(target, page.elements), false);
  assert.equal(buildInputRuleInitCode(page, (item) => item.name ?? item.id), '');
  assert.deepEqual(collectInputRuleIssues(target, page.elements), []);
});
