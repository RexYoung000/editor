import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element, SubPage } from '../src/types';
import {
  KEYBOARD_PRESETS,
  getCustomAnswerKeyboardLayout,
  getCustomAnswerTextStyle,
  getKeyboardChildren,
} from '../src/elements/keyboardPresets';
import { applyKeyboardBindingProps } from '../src/utils/keyboardBinding';
import { collectCourseCustomAnswerKeyboardIssues } from '../src/utils/customAnswerKeyboardRules';
import {
  bakeCustomAnswerKeyboardTextAssets,
  customAnswerInputSheet,
  getCustomAnswerInputGlyphMetrics,
} from '../src/utils/customAnswerKeyboardText';
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
  assert.equal(nine.answerPositions[0].y, 60);
  assert.equal(nine.answerPositions[8].y, 260);
  assert.deepEqual(nine.clearPosition, { x: 165, y: 360 });

  const mixed = getCustomAnswerKeyboardLayout(['第一次', '第二次', '第三次', '北']);
  assert.equal(mixed.keyWidth, 168);
  assert.equal(mixed.boardWidth, 402);
  assert.deepEqual(mixed.answerPositions.map(({ width }) => width), [168, 168, 168, 168]);
  assert.deepEqual(
    mixed.answerPositions.map(({ x }) => x),
    [111, 291, 111, 291],
  );
  const crowded = getCustomAnswerKeyboardLayout(Array.from({ length: 9 }, () => '第三次'));
  assert.equal(crowded.boardWidth, 582);
  assert.deepEqual(crowded.answerPositions.slice(0, 3).map(({ width }) => width), [168, 168, 168]);
  assert.equal(
    getCustomAnswerTextStyle('green', '第一次').fontSize,
    getCustomAnswerTextStyle('green', '北').fontSize,
  );
});

test('每个键盘实例按答案和主题动态生成中文按键、清空键与文字图片', () => {
  const keyboard = customKeyboard('one', ['春', '夏天', '秋季风', '冬天到了'], 'blue');
  (keyboard.props._customAnswerKeyboard as Record<string, unknown>).textSkins = [
    'data:image/png;base64,spring',
    'data:image/png;base64,summer',
    'data:image/png;base64,autumn',
    'data:image/png;base64,winter',
  ];
  const children = getKeyboardChildren(keyboard);
  const nodes = treeNodes(children);
  const keys = nodes.filter((node) => node.type === 'KlKey');
  assert.deepEqual(keys.map((key) => key.props.output), ['春', '夏天', '秋季风', '冬天到了', ' ']);
  assert.deepEqual(keys.slice(0, 4).map((key) => key.props.width), [210, 210, 210, 210]);
  assert.ok(nodes.some((node) => node.props.sizeGrid === '0,28,0,28'));
  assert.ok(nodes.some((node) => node.props.sizeGrid === '53,52,57,52'));
  assert.ok(nodes.some((node) => node.props.skin === 'game/textKeyboard/blue/key-normal.png'));
  assert.ok(nodes.some((node) => node.props.skin === 'data:image/png;base64,winter'));
  assert.ok(!nodes.some((node) => node.type === 'Label'));
  assert.ok(!nodes.some((node) => node.resources?.some((resource) => /\.ttf$/i.test(resource))));
});

test('绑定自定义答案键盘时自动切换为位图字库整项替换模式', () => {
  const props = applyKeyboardBindingProps({ place: 4, sheet: '0123456789' }, 'TEXT_ANSWER-1', 'customAnswer');
  assert.equal(props.contentType, 1);
  assert.equal(props.place, 1);
  assert.equal(props.sheet, '');
  assert.equal(props.fontClipSkin, '');
  assert.equal(props._customAnswerKeyboardBinding, true);

  const restored = applyKeyboardBindingProps(props, 'L12_DECIMAL-1', 'decimal');
  assert.equal(restored.contentType, undefined);
  assert.equal(restored.fontClipSkin, undefined);
  assert.equal(restored._customAnswerKeyboardBinding, undefined);
  assert.equal(restored.place, 4);
  assert.equal(restored.sheet, '0123456789.');
});

test('预览发布前为键帽和绑定输入框生成位图资源并保留文本答案', async () => {
  const course = normalCourseFixture();
  const page = firstEditablePage(course);
  const keyboard = customKeyboard('bake', ['东北', '东南', '西北'], 'green');
  const input = element(
    'answer-input',
    'KlInputImage',
    { camp: keyboard.props.camp, _judgeAnswer: '东北' },
    { width: 160, height: 70 },
  );
  page.elements.push(keyboard, input);

  let renderedInputMetrics: ReturnType<typeof getCustomAnswerInputGlyphMetrics> | undefined;
  const renderedTextWidths: number[] = [];
  await bakeCustomAnswerKeyboardTextAssets(course, {
    answerText: async (answer, theme, width) => {
      renderedTextWidths.push(width);
      return `data:image/png;base64,key-${theme}-${answer}`;
    },
    inputFont: async (characters, theme, metrics) => {
      renderedInputMetrics = metrics;
      return `data:image/png;base64,input-${theme}-${characters}`;
    },
  });

  const config = keyboard.props._customAnswerKeyboard as {
    answers: string[];
    textSkins: string[];
    inputFontSkin: string;
    inputSheet: string;
  };
  assert.deepEqual(config.answers, ['东北', '东南', '西北']);
  assert.deepEqual(config.textSkins, [
    'data:image/png;base64,key-green-东北',
    'data:image/png;base64,key-green-东南',
    'data:image/png;base64,key-green-西北',
  ]);
  assert.deepEqual(renderedTextWidths, [126, 126, 126]);
  assert.equal(config.inputSheet, '东北南西');
  assert.equal(config.inputFontSkin, 'data:image/png;base64,input-green-东北南西');
  assert.equal(input.props.contentType, 1);
  assert.equal(input.props.fontClipSkin, config.inputFontSkin);
  assert.equal(input.props.sheet, config.inputSheet);
  assert.equal(input.props.contentScale, 1);
  assert.deepEqual(renderedInputMetrics, getCustomAnswerInputGlyphMetrics(160, 70, 2));
  assert.equal(input.props._judgeAnswer, '东北');
  assert.equal(input.props.font, undefined);
  assert.equal(customAnswerInputSheet(['东北', '东南', '西北']), '东北南西');
  assert.equal(customAnswerInputSheet(['天天', '天地']), '天地');
});

test('输入框字库图片自身适配最长四字答案，不依赖运行时缩放', () => {
  const metrics = getCustomAnswerInputGlyphMetrics(120, 60, 4);
  assert.ok(metrics.cellWidth * 4 <= 120 - 16);
  assert.ok(metrics.cellHeight <= 60 - 10);
  assert.ok(metrics.fontSize <= metrics.cellWidth);
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

test('正式与预习导出包含动态答案、主题皮肤和位图字库，不包含运行时字体', async () => {
  const renderer = {
    answerText: async (answer: string, theme: 'yellow' | 'blue' | 'green') => (
      `data:image/png;base64,key-${theme}-${answer}`
    ),
    inputFont: async (characters: string, theme: 'yellow' | 'blue' | 'green') => (
      `data:image/png;base64,input-${theme}-${characters}`
    ),
  };
  for (const fixture of [normalCourseFixture, homeworkCourseFixture]) {
    const course = fixture();
    const page = firstEditablePage(course);
    const keyboard = customKeyboard('export', ['红', '黄', '蓝'], 'green');
    page.elements.push(
      keyboard,
      element('export-input', 'KlInputImage', { camp: keyboard.props.camp, _judgeAnswer: '红' }),
    );
    await bakeCustomAnswerKeyboardTextAssets(course, renderer);
    const artifacts = buildExportRegressionArtifacts(course);
    const sceneText = JSON.stringify(artifacts.scenes);
    const configText = JSON.stringify(artifacts.config);
    assert.match(sceneText, /"output":"红"/);
    assert.match(sceneText, /textKeyboard\/green\/key-normal\.png/);
    assert.match(sceneText, /"contentType":1/);
    assert.match(sceneText, /"sheet":"红黄蓝"/);
    assert.match(sceneText, /skin_\d+\.png/);
    assert.doesNotMatch(sceneText, /FZLanTingYuanZhongCu|\.ttf|"type":"Label"/);
    assert.doesNotMatch(configText, /\.ttf|"type":"ttf"/);
  }

  const previewCourse = previewCourseFixture();
  const previewPage = previewCourse.previewStages?.flatMap((stage) => stage.subPages)
    .find((candidate) => !candidate.frozen);
  assert.ok(previewPage);
  const previewKeyboard = customKeyboard('preview-export', ['对', '错'], 'blue');
  previewPage.elements.push(
    previewKeyboard,
    element('preview-input', 'KlInputImage', { camp: previewKeyboard.props.camp, _judgeAnswer: '对' }),
  );
  await bakeCustomAnswerKeyboardTextAssets(previewCourse, renderer);
  const previewArtifacts = buildPreviewExportRegressionArtifacts(previewCourse);
  const previewSceneText = JSON.stringify(previewArtifacts.scenes);
  const previewConfigText = JSON.stringify(previewArtifacts.config);
  assert.match(previewSceneText, /"output":"对"/);
  assert.match(previewSceneText, /"contentType":1/);
  assert.match(previewSceneText, /"sheet":"对错"/);
  assert.doesNotMatch(previewSceneText, /FZLanTingYuanZhongCu|\.ttf|"type":"Label"/);
  assert.doesNotMatch(previewConfigText, /\.ttf|"type":"ttf"/);
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
