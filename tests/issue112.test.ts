import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element, SubPage } from '../src/types';
import {
  CUSTOM_ANSWER_KEYBOARD_FONT,
  KEYBOARD_PRESETS,
  getCustomAnswerKeyboardLayout,
  getKeyboardChildren,
} from '../src/elements/keyboardPresets';
import { applyKeyboardBindingProps } from '../src/utils/keyboardBinding';
import { collectCourseCustomAnswerKeyboardIssues } from '../src/utils/customAnswerKeyboardRules';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
} from './fixtures/export-courses';

function element(
  id: string,
  type: string,
  props: Record<string, unknown>,
  extra: Partial<Element> = {},
): Element {
  return {
    id,
    type,
    layaType: type,
    x: 0,
    y: 0,
    width: type === 'KlBaseKeyboard' ? 460 : 120,
    height: type === 'KlBaseKeyboard' ? 550 : 60,
    rotation: 0,
    opacity: 1,
    props,
    ...extra,
  };
}

function customKeyboard(
  id: string,
  answers: string[] = ['东', '南', '西', '北'],
  theme = 'yellow',
): Element {
  return element(id, 'KlBaseKeyboard', {
    camp: `TEXT_ANSWER-${id}`,
    _keyboardPreset: { id: 'customAnswer' },
    _customAnswerKeyboard: { answers, theme },
  });
}

function firstEditablePage(course: Course): SubPage {
  const page = course.stages.flatMap((stage) => stage.subPages).find((candidate) => !candidate.frozen);
  assert.ok(page);
  return page;
}

function treeNodes(children: ReturnType<typeof getKeyboardChildren>) {
  const nodes: NonNullable<typeof children>[number][] = [];
  const visit = (node: NonNullable<typeof children>[number]) => {
    nodes.push(node);
    node.child?.forEach(visit);
  };
  children?.forEach(visit);
  return nodes;
}

test('自定义答案键盘按 2～9 项规则生成稳定布局', () => {
  assert.deepEqual(
    [2, 3, 4, 5, 9].map((count) => {
      const layout = getCustomAnswerKeyboardLayout(count);
      return [count, layout.columns, layout.answerRows, layout.answerPositions.length];
    }),
    [
      [2, 2, 1, 2],
      [3, 3, 1, 3],
      [4, 2, 2, 4],
      [5, 3, 2, 5],
      [9, 3, 3, 9],
    ],
  );
  const nine = getCustomAnswerKeyboardLayout(9);
  assert.equal(nine.answerPositions[0].y, 72);
  assert.equal(nine.answerPositions[8].y, 256);
  assert.deepEqual(nine.clearPosition, { x: 165, y: 348 });
});

test('每个键盘实例按答案和主题动态生成中文按键、清空键与字体资源', () => {
  const keyboard = customKeyboard('one', ['春', '夏天', '秋季风', '冬天到了'], 'blue');
  const children = getKeyboardChildren(keyboard);
  const nodes = treeNodes(children);
  const keys = nodes.filter((node) => node.type === 'KlKey');
  assert.deepEqual(keys.map((key) => key.props.output), ['春', '夏天', '秋季风', '冬天到了', ' ']);
  assert.ok(nodes.some((node) => node.props.skin === 'game/textKeyboard/blue/key-normal.png'));
  assert.ok(nodes.some((node) => node.props.text === '冬天到了' && node.props.font === CUSTOM_ANSWER_KEYBOARD_FONT));
  assert.ok(nodes.some((node) => node.resources?.includes('game/textKeyboard/FZLanTingYuanZhongCu.ttf')));
});

test('绑定自定义答案键盘时自动切换为文本整项替换模式', () => {
  const props = applyKeyboardBindingProps({ place: 4, sheet: '0123456789' }, 'TEXT_ANSWER-1', 'customAnswer');
  assert.equal(props.contentType, 3);
  assert.equal(props.place, 1);
  assert.equal(props.font, CUSTOM_ANSWER_KEYBOARD_FONT);
  assert.equal(props.sheet, '');

  const restored = applyKeyboardBindingProps(props, 'L12_DECIMAL-1', 'decimal');
  assert.equal(restored.contentType, undefined);
  assert.equal(restored.font, undefined);
  assert.equal(restored.place, 4);
  assert.equal(restored.sheet, '0123456789.');
});

test('自定义答案键盘预设进入兼容矩阵', () => {
  const preset = KEYBOARD_PRESETS.find((candidate) => candidate.id === 'customAnswer');
  assert.ok(preset);
  assert.equal(preset.thumbnail, '/builtin/editor/keyboard-custom-answer-thumb.png');
  assert.deepEqual(preset.compatibleInputTypes, ['KlInputImage']);
  assert.deepEqual(
    (preset.defaultProps._customAnswerKeyboard as { answers: string[]; theme: string }),
    { answers: ['东', '南', '西', '北'], theme: 'yellow' },
  );
});

test('正式与预习导出包含动态答案、主题皮肤和 TTF 资源', () => {
  for (const fixture of [normalCourseFixture, homeworkCourseFixture]) {
    const course = fixture();
    firstEditablePage(course).elements.push(customKeyboard('export', ['红', '黄', '蓝'], 'green'));
    const artifacts = buildExportRegressionArtifacts(course);
    const sceneText = JSON.stringify(artifacts.scenes);
    const configText = JSON.stringify(artifacts.config);
    assert.match(sceneText, /"output":"红"/);
    assert.match(sceneText, /textKeyboard\/green\/key-normal\.png/);
    assert.match(sceneText, /FZLanTingYuanZhongCu/);
    assert.match(configText, /textKeyboard\/FZLanTingYuanZhongCu\.ttf/);
    assert.match(configText, /"type":"ttf"/);
  }

  const previewCourse = previewCourseFixture();
  const previewPage = previewCourse.previewStages?.flatMap((stage) => stage.subPages)
    .find((candidate) => !candidate.frozen);
  assert.ok(previewPage);
  previewPage.elements.push(customKeyboard('preview-export', ['对', '错'], 'blue'));
  const previewArtifacts = buildPreviewExportRegressionArtifacts(previewCourse);
  assert.match(JSON.stringify(previewArtifacts.scenes), /"output":"对"/);
  assert.match(JSON.stringify(previewArtifacts.config), /"type":"ttf"/);
});

test('发布校验阻止无效选项和无法作答的正确答案', () => {
  const course = normalCourseFixture();
  const page = firstEditablePage(course);
  const keyboard = customKeyboard('invalid', ['东', '东', ''], 'purple');
  const camp = String(keyboard.props.camp);
  page.elements.push(
    keyboard,
    element('answer-input', 'KlInputImage', { camp, _judgeAnswer: '西' }, { name: '方向答案' }),
  );

  const messages = collectCourseCustomAnswerKeyboardIssues(course).map((issue) => issue.message);
  assert.ok(messages.some((message) => message.includes('空答案')));
  assert.ok(messages.some((message) => message.includes('重复答案')));
  assert.ok(messages.some((message) => message.includes('皮肤配置无效')));
  assert.ok(messages.some((message) => message.includes('正确答案“西”不在键盘选项中')));
});
