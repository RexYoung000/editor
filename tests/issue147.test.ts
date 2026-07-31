import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  getCustomAnswerKeyboardLayout,
  getKeyboardChildren,
  normalizeCustomAnswerOptions,
} from '../src/elements/keyboardPresets';
import type { Course, Element } from '../src/types';
import { collectCourseCustomAnswerKeyboardIssues } from '../src/utils/customAnswerKeyboardRules';
import { bakeCustomAnswerKeyboardTextAssets } from '../src/utils/customAnswerKeyboardText';

function answerOptions(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `选项${index + 1}`);
}

function singleCharacterAnswers(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String.fromCodePoint(0x4e00 + index));
}

function keyboard(answers: string[]): Element {
  return {
    id: 'keyboard-147',
    type: 'KlBaseKeyboard',
    layaType: 'KlBaseKeyboard',
    x: 0,
    y: 0,
    width: 460,
    height: 550,
    rotation: 0,
    opacity: 1,
    props: {
      camp: 'TEXT_ANSWER-147',
      _keyboardPreset: { id: 'customAnswer' },
      _customAnswerKeyboard: { answers, theme: 'yellow' },
    },
  };
}

function courseWithKeyboard(element: Element): Course {
  return {
    id: 'issue-147',
    stages: [{
      id: 'stage-147',
      name: '正课',
      subPages: [{ id: 'page-147', name: '题目', elements: [element] }],
    }],
  };
}

test('自定义答案配置完整保留超过 9 项的数据', () => {
  const answers = answerOptions(50);
  assert.deepEqual(normalizeCustomAnswerOptions(answers), answers);
  assert.deepEqual(normalizeCustomAnswerOptions(['  东  ', '  西  ']), ['东', '西']);
});

test('50 项答案使用可扩展排版并完整生成所有按键', () => {
  const answers = answerOptions(50);
  const layout = getCustomAnswerKeyboardLayout(answers);
  assert.equal(layout.answerPositions.length, 50);
  assert.ok(layout.rowCount > getCustomAnswerKeyboardLayout(9).rowCount);
  assert.ok(layout.boardHeight > 1080);

  const children = getKeyboardChildren(keyboard(answers));
  const outputs = children?.flatMap((node) => (
    node.props.name === 'keysBox'
      ? (node.child ?? []).map((child) => child.props.output)
      : []
  ));
  assert.equal(outputs?.length, 51);
  assert.deepEqual(outputs?.slice(0, 50), answers);
  assert.equal(outputs?.at(-1), ' ');
});

test('答案优先向前排满，末行清空键通过九宫格填满剩余宽度', () => {
  for (const count of [8, 15, 19]) {
    const answers = singleCharacterAnswers(count);
    const layout = getCustomAnswerKeyboardLayout(answers);
    const leftPadding = layout.answerPositions[0].x - layout.answerPositions[0].width / 2;
    assert.deepEqual(
      layout.answerPositions.slice(0, 8).map(({ x, y }) => [x, y]),
      [
        [69, 60],
        [165, 60],
        [261, 60],
        [357, 60],
        [69, 160],
        [165, 160],
        [261, 160],
        [357, 160],
      ],
    );
    if (count === 8) {
      assert.equal(layout.rowCount, 3);
      assert.deepEqual(layout.clearPosition, { x: 213, y: 260, width: 372 });
    }
    assert.equal(
      layout.clearPosition.x + layout.clearPosition.width / 2,
      layout.boardWidth - leftPadding,
    );
    assert.equal(layout.clearPosition.width, 372);

    const children = getKeyboardChildren(keyboard(answers));
    const keysBox = children?.find((node) => node.props.name === 'keysBox');
    const clearKey = keysBox?.child?.at(-1);
    assert.equal(clearKey?.props.width, layout.clearPosition.width);
    assert.deepEqual(
      clearKey?.child?.map((state) => [state.props.width, state.props.sizeGrid]),
      [[372, '0,28,0,28'], [372, '0,28,0,28']],
    );
    assert.ok(clearKey?.child?.every((state) => state.child?.[0]?.props.centerX === 0));
  }
});

test('发布校验只保留至少 2 项的下限，不限制较大答案数量', () => {
  const manyAnswers = answerOptions(50);
  assert.deepEqual(
    collectCourseCustomAnswerKeyboardIssues(courseWithKeyboard(keyboard(manyAnswers))),
    [],
  );

  const messages = collectCourseCustomAnswerKeyboardIssues(
    courseWithKeyboard(keyboard(['唯一答案'])),
  ).map((issue) => issue.message);
  assert.ok(messages.some((message) => message.includes('至少需要配置 2 个答案')));
});

test('文字资源烘焙覆盖第 10 项以后的全部答案', async () => {
  const answers = answerOptions(20);
  const element = keyboard(answers);
  const renderedAnswers: string[] = [];
  await bakeCustomAnswerKeyboardTextAssets(courseWithKeyboard(element), {
    answerText: async (answer) => {
      renderedAnswers.push(answer);
      return `data:image/png;base64,${answer}`;
    },
    inputFont: async () => 'data:image/png;base64,input',
  });

  assert.deepEqual(renderedAnswers, answers);
  const config = element.props._customAnswerKeyboard as { answers: string[]; textSkins: string[] };
  assert.deepEqual(config.answers, answers);
  assert.equal(config.textSkins.length, 20);
});

test('属性面板持续允许新增并显示无上限数量', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/FieldRenderer.tsx'), 'utf8');
  assert.doesNotMatch(source, /config\.answers\.length\s*>=\s*9/);
  assert.doesNotMatch(source, /\{config\.answers\.length\}\/9\s*项/);
  assert.match(source, /\{config\.answers\.length\}\s*项/);
});
