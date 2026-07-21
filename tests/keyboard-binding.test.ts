import assert from 'node:assert/strict';
import test from 'node:test';
import type { Element } from '../src/types';
import {
  inferKeyboardPreset,
  keyboardBindingInfo,
  keyboardSupportsInput,
  nextKeyboardCamp,
} from '../src/utils/keyboardBinding';

function element(id: string, type: string, props: Record<string, unknown>, parentId?: string): Element {
  return { id, type, layaType: type, x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, props, parentId };
}

test('绑定列表识别没有预设 id 的历史键盘', () => {
  const keyboard = element('legacy-keyboard', 'KlBaseKeyboard', { pattern: 13, camp: '2' });
  const child = element('legacy-key', 'KlKey', { output: '1' }, keyboard.id);
  const info = keyboardBindingInfo(keyboard, [keyboard, child]);
  assert.equal(info.legacy, true);
  assert.equal(info.label, '旧版/自定义键盘');
  assert.equal(keyboardSupportsInput(keyboard, 'KlInputImage', [keyboard, child]), true);
  assert.equal(keyboardSupportsInput(keyboard, 'FractionInput', [keyboard, child]), true);
});

test('有明确字符表的历史键盘可以识别为已有预设', () => {
  const keyboard = element('legacy-decimal', 'KlBaseKeyboard', { pattern: 13 });
  const child = element('legacy-decimal-key', 'KlKey', { output: '.' , sheet: '0123456789.' }, keyboard.id);
  assert.equal(inferKeyboardPreset(keyboard, [keyboard, child])?.id, 'decimal');
});

test('缺失阵营时生成页面内不冲突的键盘阵营', () => {
  const elements = [
    element('keyboard-1', 'KlBaseKeyboard', { camp: 'KB-1' }),
    element('keyboard-2', 'KlBaseKeyboard', { camp: '2' }),
  ];
  assert.equal(nextKeyboardCamp(elements), 'KB-2');
});
