import assert from 'node:assert/strict';
import test from 'node:test';
import { caretOffsetAtPoint, layoutText, normalizeTextSizingMode } from '../src/utils/textLayout';

test('历史文本缺少尺寸模式时保持固定宽高', () => {
  assert.equal(normalizeTextSizingMode(undefined), 'fixed');
  const layout = layoutText('一二三四五六', 60, 24, { fontSize: 20, leading: 4 });
  assert.equal(layout.width, 60);
  assert.equal(layout.height, 24);
  assert.equal(layout.overflow, true);
});

test('固定宽度文本换行后自动增长高度', () => {
  const layout = layoutText('一二三四五六', 60, 24, {
    fontSize: 20,
    leading: 4,
    textSizingMode: 'fixed-width',
  });
  assert.deepEqual(layout.lines, ['一二三', '四五六']);
  assert.equal(layout.width, 60);
  assert.equal(layout.height, 48);
  assert.equal(layout.overflow, false);
});

test('自动宽高文本保留最小可编辑尺寸并支持点击定位光标', () => {
  const props = { fontSize: 20, leading: 0, textSizingMode: 'auto' as const };
  const layout = layoutText('abc', 800, 20, props);
  assert.equal(layout.width, 40);
  assert.equal(layout.height, 20);
  assert.equal(caretOffsetAtPoint('abc', 800, props, 12, 2), 1);
});
