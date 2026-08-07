import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import JSZip from 'jszip';
import { BUILTIN_ASSETS } from '../src/elements/builtinAssets';
import { elementMeta } from '../src/elements/elementMeta';
import {
  DEFAULT_MATH_KEYBOARD_THEME,
  getKeyboardChildren,
  getMathKeyboardLayout,
  isMathKeyboardPresetId,
  KEYBOARD_PRESETS,
  MATH_KEY_SHEET,
  readMathKeyboardTheme,
  type ExportChild,
  type MathKeyboardPresetId,
} from '../src/elements/keyboardPresets';
import type { Element } from '../src/types';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';
import { applyKeyboardBindingProps } from '../src/utils/keyboardBinding';
import { normalCourseFixture } from './fixtures/export-courses';

const mathPresetIds: MathKeyboardPresetId[] = [
  'decimal',
  'percent',
  'percentDecimal',
  'percentOperators',
  'percentExpression',
  'fraction',
  'decimalFraction',
  'mathExpression',
];

const expectedOutputs: Record<MathKeyboardPresetId, string[]> = {
  decimal: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'del'],
  percent: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '%', 'del'],
  percentDecimal: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '%', '.', 'del'],
  percentOperators: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '=', '(', ')', '%', 'del'],
  percentExpression: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '=', '(', ')', '%', '.', 'del'],
  fraction: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '<_>', 'del'],
  decimalFraction: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '<_>', 'del'],
  mathExpression: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '×', '÷', '=', '(', ')', '.', '<_>', 'del'],
};

function keyboardElement(id: MathKeyboardPresetId, theme?: string): Element {
  return {
    id: `keyboard-${id}`,
    type: 'KlBaseKeyboard',
    layaType: 'KlBaseKeyboard',
    x: 0,
    y: 0,
    width: KEYBOARD_PRESETS.find((preset) => preset.id === id)?.defaultSize.width ?? 0,
    height: KEYBOARD_PRESETS.find((preset) => preset.id === id)?.defaultSize.height ?? 0,
    rotation: 0,
    opacity: 1,
    props: {
      _keyboardPreset: { id },
      ...(theme ? { _mathKeyboardTheme: theme } : {}),
      camp: `${id}-1`,
    },
  };
}

function keyNodes(children: ExportChild[]): ExportChild[] {
  const keysBox = children.find((child) => child.props.name === 'keysBox');
  return keysBox?.child ?? [];
}

test('八种数学键盘按已确认顺序进入现有预设选择器', () => {
  assert.deepEqual(
    KEYBOARD_PRESETS.map((preset) => preset.id),
    [
      'preset1',
      'preset2',
      'decimal',
      'percent',
      'percentDecimal',
      'percentOperators',
      'percentExpression',
      'fraction',
      'decimalFraction',
      'mathExpression',
      'customAnswer',
    ],
  );
  for (const id of mathPresetIds) {
    const preset = KEYBOARD_PRESETS.find((candidate) => candidate.id === id);
    assert.ok(preset?.math);
    assert.equal(preset.defaultProps._mathKeyboardTheme, 'yellow');
    assert.equal(preset.defaultSize.width, getMathKeyboardLayout(preset.math).elementWidth);
    assert.equal(preset.defaultSize.height, getMathKeyboardLayout(preset.math).elementHeight);
  }
  assert.equal(isMathKeyboardPresetId('toString'), false);
});

test('三列和五列布局保持固定键帽并让删除键占满剩余列', () => {
  for (const id of mathPresetIds) {
    const preset = KEYBOARD_PRESETS.find((candidate) => candidate.id === id);
    assert.ok(preset?.math);
    const layout = getMathKeyboardLayout(preset.math);
    const expectedRows = id === 'percentDecimal' || id === 'decimalFraction' ? 5 : 4;
    assert.equal(layout.rows, expectedRows);
    assert.equal(layout.columns, id === 'percentOperators' || id === 'percentExpression' || id === 'mathExpression' ? 5 : 3);
    assert.equal(layout.boardWidth, layout.columns === 3 ? 330 : 522);
    assert.equal(layout.boardHeight, expectedRows === 4 ? 446 : 546);
    for (const key of layout.keys) {
      assert.ok(key.x - key.width / 2 >= 0);
      assert.ok(key.x + key.width / 2 <= layout.boardWidth);
      assert.ok(key.y - key.height / 2 >= 0);
      assert.ok(key.y + key.height / 2 <= layout.boardHeight);
      assert.equal(key.height, 88);
    }
    const deleteKey = layout.keys.at(-1);
    assert.equal(deleteKey?.output, 'del');
    if (id === 'percentDecimal' || id === 'decimalFraction') assert.equal(deleteKey.width, 276);
    if (id === 'percentOperators') assert.equal(deleteKey.width, 180);
  }
});

test('每种数学键盘输出集合、完整九宫格和退格分层结构准确', () => {
  for (const id of mathPresetIds) {
    const children = getKeyboardChildren(keyboardElement(id));
    assert.ok(children);
    assert.equal(children[0].props.sizeGrid, '53,52,57,52');
    const keys = keyNodes(children);
    assert.deepEqual(keys.map((key) => String(key.props.output)), expectedOutputs[id]);
    const deleteKey = keys.at(-1);
    assert.equal(deleteKey?.props.output, 'del');
    assert.equal(deleteKey?.child?.length, 2);
    for (const state of deleteKey?.child ?? []) {
      assert.equal(state.type, 'Image');
      assert.equal(state.child?.length, 1);
      assert.equal(state.child?.[0].type, 'Image');
      assert.equal(state.child?.[0].props.centerX, 0);
    }
  }
  assert.equal(MATH_KEY_SHEET, '0123456789+-*/=<>()p%');
});

test('数学键盘支持三色主题且历史课件缺少字段时保持黄色', () => {
  assert.equal(DEFAULT_MATH_KEYBOARD_THEME, 'yellow');
  assert.equal(readMathKeyboardTheme(keyboardElement('decimal')), 'yellow');
  assert.equal(readMathKeyboardTheme(keyboardElement('decimal', 'unknown')), 'yellow');
  for (const theme of ['yellow', 'blue', 'green'] as const) {
    const children = getKeyboardChildren(keyboardElement('mathExpression', theme));
    assert.ok(children);
    const serialized = JSON.stringify(children);
    assert.ok(serialized.includes(`textKeyboard/${theme}`));
    assert.ok(serialized.includes(`mathKeyboard/${theme}/glyph-normal.png`));
    assert.ok(serialized.includes(`mathKeyboard/${theme}/fraction-normal.png`));
  }
});

test('三色数学资源和六张新增缩略图均已注册并存在', () => {
  const ids = new Set(BUILTIN_ASSETS.map((asset) => asset.id));
  for (const theme of ['yellow', 'blue', 'green']) {
    for (const suffix of [
      'bg',
      'keyNormal',
      'keyActive',
      'wideNormal',
      'wideActive',
      'glyphNormal',
      'glyphActive',
      'delNormal',
      'delActive',
      'fractionNormal',
      'fractionActive',
      'arrow',
    ]) {
      const id = `keyboard.math.${theme}.${suffix}`;
      assert.ok(ids.has(id), id);
      const asset = BUILTIN_ASSETS.find((candidate) => candidate.id === id);
      assert.ok(asset && existsSync(join(process.cwd(), 'public/builtin', asset.src)), id);
    }
  }
  for (const id of mathPresetIds.slice(1)) {
    const preset = KEYBOARD_PRESETS.find((candidate) => candidate.id === id);
    assert.ok(preset?.thumbnail.startsWith('/builtin/editor/'));
    assert.ok(existsSync(join(process.cwd(), 'public', preset.thumbnail)));
  }
});

test('game.zip 包含数学键盘三色资源和百分比输入字库', async () => {
  const zip = await JSZip.loadAsync(
    readFileSync(join(process.cwd(), 'public/builtin/runtime/game.zip')),
  );
  const assetIds = BUILTIN_ASSETS
    .filter((asset) => asset.id.startsWith('keyboard.math.'))
    .map((asset) => asset.id);
  assetIds.push('klInput.fontPercent');

  for (const id of assetIds) {
    const asset = BUILTIN_ASSETS.find((candidate) => candidate.id === id);
    assert.ok(asset, id);
    const zipPath = asset.src.replace(/^runtime\/game\//, '');
    assert.ok(zip.file(zipPath), `game.zip 缺少 ${zipPath}`);
  }
});

test('百分比预设绑定后使用包含百分号的普通输入框字库', () => {
  assert.equal(elementMeta.KlInputImage?.defaultProps?.sheet, '0123456789°+-*/=().');
  assert.match(String(elementMeta.KlInputImage?.defaultProps?.fontClipSkin), /inputImg\/jp_num40\.png$/);
  for (const id of ['percent', 'percentDecimal', 'percentOperators', 'percentExpression']) {
    const props = applyKeyboardBindingProps(
      {
        sheet: '0123456789°+-*/=().',
        fontClipSkin: 'game/inputImg/jp_num40.png',
      },
      `${id}-1`,
      id,
    );
    assert.equal(props.sheet, '0123456789°+-*/=().%');
    assert.match(String(props.fontClipSkin), /inputImg\/jp_num40_percent\.png$/);
  }

  const percentProps = applyKeyboardBindingProps(
    {
      sheet: '0123456789°+-*/=().',
      fontClipSkin: 'game/inputImg/jp_num40.png',
    },
    'L12_PERCENT-1',
    'percent',
  );
  const restoredProps = applyKeyboardBindingProps(
    percentProps,
    'L12_DECIMAL-1',
    'decimal',
  );
  assert.equal(restoredProps._percentKeyboardBinding, undefined);
  assert.equal(restoredProps.sheet, '0123456789.');
  assert.match(String(restoredProps.fontClipSkin), /inputImg\/jp_num40\.png$/);
});

test('正式导出按键输出与所选主题资源保持一致', () => {
  const course = normalCourseFixture();
  course.stages[0].subPages[0].elements.push(keyboardElement('mathExpression', 'blue'));
  const artifacts = buildExportRegressionArtifacts(course);
  const sceneText = JSON.stringify(artifacts.scenes);
  assert.ok(sceneText.includes('"output":"<_>"'));
  assert.ok(sceneText.includes('"output":"×"'));
  assert.ok(sceneText.includes('textKeyboard/blue/bg.png'));
  assert.ok(sceneText.includes('mathKeyboard/blue/glyph-normal.png'));
  assert.ok(sceneText.includes('mathKeyboard/blue/fraction-normal.png'));
  assert.ok(Object.keys(artifacts.resources).some((resource) =>
    resource.endsWith('game/mathKeyboard/blue/glyph-normal.png'),
  ));
});
