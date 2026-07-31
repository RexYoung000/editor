import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element } from '../src/types';
import { elementMeta } from '../src/elements/elementMeta';
import {
  DEFAULT_INPUT_TEXT_THEME,
  DEFAULT_INPUT_FRACTION_FONT_SCALE,
  DEFAULT_INPUT_LETTER_SPACING,
  DEFAULT_FRACTION_INPUT_LETTER_SPACING,
  clampInputFractionFontScale,
  clampInputLetterSpacing,
  effectiveInputFontSize,
  effectiveInputLetterSpacing,
  getInputFractionLayoutMetrics,
  getInputFontGlyphMetrics,
  inputFontRuntimeProps,
  normalizeInputPreviewSample,
  readInputTextTheme,
  uniqueInputCharacters,
} from '../src/utils/inputFont';
import { bakeCustomAnswerKeyboardTextAssets } from '../src/utils/customAnswerKeyboardText';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';

function element(
  id: string,
  type: string,
  props: Record<string, unknown>,
  width: number,
  height: number,
): Element {
  return {
    id,
    type,
    layaType: type,
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
    opacity: 1,
    props,
  };
}

function courseWith(elements: Element[]): Course {
  return {
    id: 'issue-137',
    kind: 'normal',
    stages: [{
      id: 'stage',
      name: '正课 1',
      subPages: [{ id: 'page', name: '小关卡 1-1', elements }],
    }],
  };
}

test('新建普通与分数输入框默认蓝色，历史输入框不伪造新主题', () => {
  assert.equal(elementMeta.KlInputImage.defaultProps?._inputTextTheme, DEFAULT_INPUT_TEXT_THEME);
  assert.equal(elementMeta.FractionInput.defaultProps?._inputTextTheme, DEFAULT_INPUT_TEXT_THEME);
  assert.equal(elementMeta.KlInputImage.defaultProps?._inputFontSize, 36);
  assert.equal(elementMeta.KlInputImage.defaultProps?._inputLetterSpacing, DEFAULT_INPUT_LETTER_SPACING);
  assert.equal(elementMeta.KlInputImage.defaultProps?._inputFontPreview, '1234');
  assert.equal(elementMeta.FractionInput.defaultProps?._inputFontSize, 42);
  assert.equal(
    elementMeta.FractionInput.defaultProps?._inputLetterSpacing,
    DEFAULT_FRACTION_INPUT_LETTER_SPACING,
  );
  assert.equal(elementMeta.FractionInput.defaultProps?._inputFractionFontScale, DEFAULT_INPUT_FRACTION_FONT_SCALE);
  assert.equal(readInputTextTheme({ props: { _inputTextTheme: 'green' } }), 'green');
  assert.equal(readInputTextTheme({ props: { fontClipSkin: 'legacy.png' } }), undefined);
  assert.ok(elementMeta.KlInputImage.properties.some((field) => field.type === 'inputTextTheme'));
  assert.ok(elementMeta.FractionInput.properties.some((field) => field.type === 'inputTextTheme'));
});

test('普通输入框测试样例始终遵守字符表与输入位数', () => {
  assert.equal(normalizeInputPreviewSample('123.45', '0123456789.', 4), '123.');
  assert.equal(normalizeInputPreviewSample('12A34', '0123456789', 4), '1234');
  assert.equal(normalizeInputPreviewSample('1234', '0123456789', 2), '12');
});

test('分数字号比例限制在 40% 到 100%', () => {
  assert.equal(clampInputFractionFontScale(0.2), 0.4);
  assert.equal(clampInputFractionFontScale(0.72), 0.72);
  assert.equal(clampInputFractionFontScale(1.2), 1);
});

test('框体等比缩放后实际字号同比变化，非等比扩宽不放大字号', () => {
  const base = element('input', 'KlInputImage', {
    _inputFontSize: 36,
    _inputFontReferenceWidth: 120,
    _inputFontReferenceHeight: 60,
  }, 120, 60);
  assert.equal(effectiveInputFontSize(base), 36);
  assert.equal(effectiveInputFontSize({ ...base, width: 240, height: 120 }), 72);
  assert.equal(effectiveInputFontSize({ ...base, width: 240, height: 60 }), 36);
  assert.equal(effectiveInputFontSize({ ...base, width: 20, height: 10 }), 12);
});

test('统一字符间距支持收紧、加宽并随框体等比缩放', () => {
  assert.equal(clampInputLetterSpacing(-30), -20);
  assert.equal(clampInputLetterSpacing(24), 24);
  assert.equal(clampInputLetterSpacing(80), 60);

  const normal = element('input', 'KlInputImage', {
    _inputLetterSpacing: 4,
    _inputFontReferenceWidth: 120,
    _inputFontReferenceHeight: 60,
  }, 120, 60);
  assert.equal(effectiveInputLetterSpacing(normal), 4);
  assert.equal(effectiveInputLetterSpacing({ ...normal, width: 240, height: 120 }), 8);
  assert.equal(effectiveInputLetterSpacing({ ...normal, width: 240, height: 60 }), 4);

  const fraction = element('fraction', 'FractionInput', {}, 360, 120);
  assert.equal(effectiveInputLetterSpacing(fraction), DEFAULT_FRACTION_INPUT_LETTER_SPACING);
});

test('普通与分数输入框共用字形指标，窄字符和分数结构使用紧凑动态占位', () => {
  const metrics = getInputFontGlyphMetrics(42, '0123456789+-×÷=()');
  assert.deepEqual(metrics, { cellWidth: 39, cellHeight: 59, fontSize: 42, stroke: 2 });
  assert.deepEqual(getInputFractionLayoutMetrics(metrics, 0.8, 1, 1), {
    width: 52,
    height: 101,
    partHeight: 47.2,
    horizontalPadding: 10,
    verticalGap: 6,
    tokenGap: 6,
  });
  assert.equal(getInputFractionLayoutMetrics(metrics, 0.8, 4, 2).width, 160);
  assert.equal(getInputFractionLayoutMetrics(metrics, 0.8, 4, 2, -20).width, 97);
  assert.deepEqual(inputFontRuntimeProps(
    element('normal', 'KlInputImage', {}, 120, 60),
    metrics,
  ), { contentScale: 1, spaceX: 0 });
  assert.deepEqual(inputFontRuntimeProps(
    element('fraction', 'FractionInput', {}, 360, 120),
    metrics,
  ), {
    contentScale: 1,
    spaceX: 6,
    fontWidth: 39,
    fontHeight: 59,
    fontScale: 1,
    fractionPartScale: 0.64,
    dynamicFractionLayout: true,
    fractionHorizontalPadding: 10,
    fractionVerticalGap: 6,
    tokenGap: 6,
  });
  assert.deepEqual(inputFontRuntimeProps(
    element('fraction-large', 'FractionInput', { _inputFractionFontScale: 0.8 }, 360, 120),
    metrics,
  ), {
    contentScale: 1,
    spaceX: 6,
    fontWidth: 39,
    fontHeight: 59,
    fontScale: 1,
    fractionPartScale: 0.8,
    dynamicFractionLayout: true,
    fractionHorizontalPadding: 10,
    fractionVerticalGap: 6,
    tokenGap: 6,
  });
  assert.equal(uniqueInputCharacters('0012+12'), '012+');
});

test('自定义答案只提供字符集合，输入框主题不会被键盘主题覆盖', async () => {
  const keyboard = element('keyboard', 'KlBaseKeyboard', {
    camp: 'TEXT-1',
    _keyboardPreset: { id: 'customAnswer' },
    _customAnswerKeyboard: { answers: ['东南', '西北'], theme: 'green' },
  }, 460, 320);
  const input = element('input', 'KlInputImage', {
    camp: 'TEXT-1',
    _inputTextTheme: 'blue',
    _inputFontSize: 36,
    _inputFontReferenceWidth: 160,
    _inputFontReferenceHeight: 70,
    _inputFontPreview: '东南',
    sheet: '',
  }, 160, 70);
  const course = courseWith([keyboard, input]);
  const inputCalls: Array<{ characters: string; theme: string; fontSize: number }> = [];
  await bakeCustomAnswerKeyboardTextAssets(course, {
    answerText: async (answer, theme) => `data:image/png;base64,key-${theme}-${answer}`,
    inputFont: async (characters, theme, metrics) => {
      inputCalls.push({ characters, theme, fontSize: metrics.fontSize });
      return `data:image/png;base64,input-${theme}`;
    },
  });

  assert.deepEqual(inputCalls, [{ characters: '东南西北', theme: 'blue', fontSize: 36 }]);
  assert.equal(input.props.sheet, '东南西北');
  assert.equal(input.props.place, 1);
  assert.equal(input.props.contentScale, 1);
  assert.equal(input.props.spaceX, 0);
  assert.equal(input.props.fontClipSkin, 'data:image/png;base64,input-blue');
  assert.equal((keyboard.props._customAnswerKeyboard as Record<string, unknown>).theme, 'green');
});

test('三色字体图进入导出资源，预览样例和配置字段不进入 scene', async () => {
  const themedInput = element('themed', 'KlInputImage', {
    _inputTextTheme: 'yellow',
    _inputFontSize: 28,
    _inputLetterSpacing: 8,
    _inputFontReferenceWidth: 120,
    _inputFontReferenceHeight: 60,
    _inputFontPreview: '12+3',
    sheet: '0123456789+',
    place: 4,
  }, 120, 60);
  const legacyInput = element('legacy', 'KlInputImage', {
    sheet: '0123456789',
    fontClipSkin: 'game/inputImg/jp_num40.png',
    place: 4,
  }, 120, 60);
  const course = courseWith([themedInput, legacyInput]);
  await bakeCustomAnswerKeyboardTextAssets(course, {
    answerText: async () => '',
    inputFont: async (_characters, theme) => `data:image/png;base64,font-${theme}`,
  });

  assert.equal(themedInput.props.fontClipSkin, 'data:image/png;base64,font-yellow');
  assert.equal(themedInput.props.spaceX, 8);
  assert.equal(legacyInput.props.fontClipSkin, 'game/inputImg/jp_num40.png');
  const artifacts = buildExportRegressionArtifacts(course);
  const scene = JSON.stringify(artifacts.scenes);
  assert.match(scene, /skin_\d+\.png/);
  assert.doesNotMatch(scene, /_inputTextTheme|_inputFontSize|_inputLetterSpacing|_inputFontReference|_inputFontPreview|12\+3/);
  assert.match(scene, /game_lt\/image\/inputImg\/jp_num40\.png/);
});
