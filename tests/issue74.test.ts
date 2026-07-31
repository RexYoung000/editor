import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { elementMeta } from '../src/elements/elementMeta';
import { KEYBOARD_PRESETS } from '../src/elements/keyboardPresets';
import {
  buildExportRegressionArtifacts,
  buildMathKeyboardInitCode,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
} from './fixtures/export-courses';
import type { Element, SubPage } from '../src/types';

function sceneNodes(value: Record<string, unknown>): Array<{ type?: string; props?: Record<string, unknown> }> {
  const nodes: Array<{ type?: string; props?: Record<string, unknown> }> = [];
  const visit = (node: { type?: string; props?: Record<string, unknown>; child?: unknown[] }) => {
    nodes.push(node);
    for (const child of node.child ?? []) {
      if (child && typeof child === 'object') visit(child as typeof node);
    }
  };
  visit(value as typeof nodes[number]);
  return nodes;
}

function fractionElement(id: string): Element {
  return {
    id,
    type: 'FractionInput',
    layaType: 'FractionInput',
    x: 200,
    y: 200,
    width: 360,
    height: 120,
    rotation: 0,
    opacity: 1,
    props: { _judgeAnswer: '12<3_4>', camp: 'L12_FRACTION-1' },
  };
}

function decimalKeyboardElement(id: string): Element {
  return {
    id,
    type: 'KlBaseKeyboard',
    layaType: 'KlBaseKeyboard',
    x: 600,
    y: 500,
    width: 330,
    height: 420,
    rotation: 0,
    opacity: 1,
    props: { _keyboardPreset: { id: 'decimal' }, camp: 'L12_DECIMAL-1' },
  };
}

function decimalInputElement(id: string): Element {
  return {
    id,
    type: 'KlInputImage',
    layaType: 'KlInputImage',
    name: 'decimal input',
    x: 300,
    y: 300,
    width: 120,
    height: 60,
    rotation: 0,
    opacity: 1,
    props: { camp: 'L12_DECIMAL-1', place: 4, _judgeAnswer: '1.2' },
  };
}

test('数字与分数键盘的兼容矩阵和资源注册完整', () => {
  assert.deepEqual(
    Object.fromEntries(KEYBOARD_PRESETS.map((preset) => [preset.id, preset.compatibleInputTypes])),
    {
      preset1: ['KlInputImage'],
      preset2: ['KlInputImage'],
      decimal: ['KlInputImage'],
      percent: ['KlInputImage'],
      percentDecimal: ['KlInputImage'],
      percentOperators: ['KlInputImage'],
      percentExpression: ['KlInputImage'],
      fraction: ['FractionInput'],
      decimalFraction: ['FractionInput'],
      mathExpression: ['FractionInput'],
      customAnswer: ['KlInputImage'],
    },
  );
  assert.equal(elementMeta.FractionInput?.runtime, 'Components.FractionInput');
  assert.equal(elementMeta.FractionInput?.defaultProps?.sizeGrid, '10,10,10,10');
  assert.equal(elementMeta.FractionInput?.defaultProps?.sheet, '0123456789+-×÷=()><.tabcdxyπ²');
  assert.equal(Array.from(String(elementMeta.FractionInput?.defaultProps?.sheet)).length, 29);
  assert.match(String(elementMeta.FractionInput?.placeholderImage), /runtime\/game\/inputImg\/img_1\.png$/);
  assert.match(String(elementMeta.FractionInput?.defaultProps?.lineSkin), /mathKeyboard\/img_line\.png$/);
  assert.match(String(elementMeta.FractionInput?.defaultProps?.fontClipSkin), /mathKeyboard\/img_w2Input\.png$/);
});

test('正课、作业、预习导出都引用 FractionInput 运行时', () => {
  const normal = normalCourseFixture();
  normal.stages[0].subPages[0].elements.push(fractionElement('normal-fraction'));
  const normalArtifacts = buildExportRegressionArtifacts(normal);
  assert.match(normalArtifacts.scenes[0].source, /import FractionInput from "\.\/Components\/FractionInput"/);
  assert.match(normalArtifacts.scenes[0].source, /_ref = \[FractionInput\]/);
  assert.ok(sceneNodes(normalArtifacts.scenes[0].scene).some((node) => node.type === 'FractionInput'));
  assert.ok(Object.keys(normalArtifacts.resources).some((path) => path.endsWith('game/mathKeyboard/img_line.png')));
  assert.ok(Object.keys(normalArtifacts.resources).some((path) => path.endsWith('game/mathKeyboard/img_w2Input.png')));

  const homework = homeworkCourseFixture();
  homework.stages[0].subPages[0].elements.push(fractionElement('homework-fraction'));
  const homeworkArtifacts = buildExportRegressionArtifacts(homework);
  assert.match(homeworkArtifacts.scenes[0].source, /import FractionInput from "\.\/Components\/FractionInput"/);
  assert.match(homeworkArtifacts.scenes[0].source, /_ref = \[FractionInput\]/);
  const homeworkPage = (homeworkArtifacts.config.pages as Array<Record<string, unknown>>)[0];
  assert.ok((homeworkPage.res as Array<Record<string, unknown>>).some((entry) =>
    entry.url === 'res/atlas/game_hw/image/inputImg.atlas',
  ));

  const preview = previewCourseFixture();
  preview.previewStages![0].subPages[0].elements.push(fractionElement('preview-fraction'));
  const previewArtifacts = buildPreviewExportRegressionArtifacts(preview);
  assert.match(previewArtifacts.scenes[0].source, /import FractionInput from "\.\/Components\/FractionInput"/);
  assert.match(previewArtifacts.scenes[0].source, /_ref = \[FractionInput\]/);
});

test('旧版分数输入框导出时迁移完整位图字符表', () => {
  const course = normalCourseFixture();
  course.stages[0].subPages[0].elements.push({
    ...fractionElement('legacy-fraction'),
    props: { _judgeAnswer: '', sheet: '0123456789' },
  });
  const artifacts = buildExportRegressionArtifacts(course);
  const fractionNode = sceneNodes(artifacts.scenes[0].scene).find((node) => node.type === 'FractionInput');
  assert.equal(fractionNode?.props?.sheet, '0123456789+-×÷=()><.tabcdxyπ²');
});

test('普通数字与分数混排时按实际字体缩放宽度推进位置', () => {
  const runtimeFiles = [
    'public/builtin/layaProjectModel/Game1_LT/src/view/game_lt/Components/FractionInput.ts',
    'public/builtin/layaProjectModel/Game1_HW/src/view/game_hw/Components/FractionInput.ts',
    'public/builtin/layaProjectModel/Game1_PREVIEW/src/view/game_preview/Components/FractionInput.ts',
  ];
  const expectedAdvance = 4 * 42 * 1.3;
  assert.ok(expectedAdvance > 4 * 42, '四位数字的实际绘制宽度必须大于未缩放宽度');

  for (const relativePath of runtimeFiles) {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
    assert.match(source, /public fontScale = 1\.3/);
    assert.match(source, /font\.scale\(this\.fontScale, this\.fontScale\)/);
    assert.match(source, /x \+= this\.getFontClipAdvance\(str\.length\) \+ this\.getLayoutGap\(\)/);
    assert.match(source, /return charCount \* \(fontWidth \+ this\.getLayoutGap\(\)\) \* this\.fontScale/);
    assert.match(source, /public fractionWidthScale = 1/);
    assert.match(source, /box\.width = \(this\.fractionDigits \* this\.fontWidth \+ 20\) \* this\.fractionWidthScale/);
    assert.match(source, /input1\.width = this\.fractionDigits \* this\.fontWidth \* this\.fractionWidthScale/);
    assert.match(source, /box\.width = \(this\.fractionPlace2 \* this\.fontWidth \+ 20\) \* this\.fractionWidthScale/);
    assert.match(source, /img\.x = x - 10 \* this\.fractionWidthScale/);
    assert.match(source, /img\.width = box\.width/);
  }
});

test('分数的分子分母子输入格禁止再次插入分数结构', () => {
  const runtimeFiles = [
    'public/builtin/layaProjectModel/Game1_LT/src/view/game_lt/Components/FractionInput.ts',
    'public/builtin/layaProjectModel/Game1_HW/src/view/game_hw/Components/FractionInput.ts',
    'public/builtin/layaProjectModel/Game1_PREVIEW/src/view/game_preview/Components/FractionInput.ts',
  ];

  for (const relativePath of runtimeFiles) {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
    assert.match(source, /input1\["inputValidator"\] = \(value: string\) => value !== "<_>" && value !== "\[<_>\]"/);
  }
});

test('嵌套键盘皮肤目录生成完整 atlas 路径', () => {
  const normal = normalCourseFixture();
  normal.stages[0].subPages[0].elements.push(decimalKeyboardElement('normal-decimal-keyboard'));
  normal.stages[0].subPages[0].elements.push(decimalInputElement('normal-decimal-input'));
  const normalArtifacts = buildExportRegressionArtifacts(normal);
  const normalPage = (normalArtifacts.config.pages as Array<Record<string, unknown>>)[0];
  assert.ok((normalPage.res as Array<Record<string, unknown>>).some((entry) =>
    entry.url === 'res/atlas/game_lt/image/mathKeyboard/yellow.atlas',
  ));
  const exportedInput = sceneNodes(normalArtifacts.scenes[0].scene).find((node) =>
    node.type === 'KlInputImage' && node.props?.camp === 'L12_DECIMAL-1' && node.props?.place === 4,
  );
  assert.ok(exportedInput?.props?.var, '数学键盘输入格必须带有运行时 var');

  const preview = previewCourseFixture();
  preview.previewStages![0].subPages[0].elements.push(decimalKeyboardElement('preview-decimal-keyboard'));
  const previewPage = (buildPreviewExportRegressionArtifacts(preview).config.pages as Array<Record<string, unknown>>)[0];
  assert.ok((previewPage.res as Array<Record<string, unknown>>).some((entry) =>
    entry.url === 'res/atlas/game_preview/image/mathKeyboard/yellow.atlas',
  ));
});

test('绑定小数键盘的输入框生成首位补零和重复小数点约束', () => {
  const page: SubPage = {
    id: 'decimal-page',
    name: 'decimal-page',
    elements: [
      {
        ...fractionElement('decimal-keyboard'),
        type: 'KlBaseKeyboard',
        layaType: 'KlBaseKeyboard',
        props: { camp: 'L12_DECIMAL-1', _keyboardPreset: { id: 'decimal' } },
      },
      {
        ...fractionElement('decimal-input'),
        type: 'KlInputImage',
        layaType: 'KlInputImage',
        props: { camp: 'L12_DECIMAL-1', place: 4 },
      },
    ],
  };
  const code = buildMathKeyboardInitCode(page, (element) => element.id.replace(/-/g, '_'));
  assert.match(code, /indexOf\("\."\)/);
  assert.match(code, /target\.place >= 2 \? "0\."/);
  assert.ok(code.includes('replace(/\\./g'), code);
});
