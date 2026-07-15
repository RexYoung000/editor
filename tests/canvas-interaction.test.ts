import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element } from '../src/types';
import {
  getElementWorldBounds,
  isPointInsideElement,
} from '../src/utils/canvasGeometry';
import {
  findTopElementAtPoint,
  getTransformRootIds,
  normalizeSelection,
  resolvePointerSelection,
  selectElementsInRect,
} from '../src/utils/canvasSelection';
import {
  createMoveTransaction,
  previewMoveTransaction,
  transactionHasChanges,
} from '../src/utils/canvasTransformTransaction';

function element(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: 'Image',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
    ...overrides,
  };
}

test('旋转元素使用真实四边形命中和包围范围', () => {
  const item = element('rotated', { x: 100, y: 100, width: 100, height: 40, rotation: 90 });
  assert.equal(isPointInsideElement({ x: 80, y: 150 }, item, [item]), true);
  assert.equal(isPointInsideElement({ x: 140, y: 110 }, item, [item]), false);
  assert.deepEqual(getElementWorldBounds(item, [item]), { x: 60, y: 100, width: 40, height: 100 });
});

test('命中优先选择子元素，已选元素区域优先保持可拖', () => {
  const parent = element('parent', { width: 300, height: 300 });
  const child = element('child', { x: 20, y: 20, parentId: 'parent' });
  const upper = element('upper', { x: 30, y: 30 });
  const elements = [parent, child, upper];
  assert.equal(findTopElementAtPoint(elements, { x: 40, y: 40 }, [])?.id, 'upper');
  assert.equal(findTopElementAtPoint(elements, { x: 25, y: 25 }, [])?.id, 'child');
  assert.equal(findTopElementAtPoint(elements, { x: 40, y: 40 }, ['child'])?.id, 'child');
  assert.equal(findTopElementAtPoint(elements, { x: 25, y: 25 }, ['parent'])?.id, 'child');
});

test('父子不会同时作为选择或变换根，锁定元素不参与变换', () => {
  const parent = element('parent');
  const child = element('child', { parentId: 'parent' });
  const locked = element('locked', { locked: true });
  assert.deepEqual(normalizeSelection([parent, child, locked], ['child', 'parent']), ['parent']);
  assert.deepEqual(normalizeSelection([parent, child, locked], ['parent', 'child'], 'child'), ['child']);
  assert.deepEqual(getTransformRootIds([parent, child, locked], ['parent', 'child', 'locked']), ['parent']);
});

test('编组点击会选择整组，修饰键再次点击会移除整组', () => {
  const first = element('first', { groupId: 'group-1' });
  const second = element('second', { groupId: 'group-1' });
  const elements = [first, second];
  assert.deepEqual(resolvePointerSelection(elements, [], 'first', false), ['first', 'second']);
  assert.deepEqual(resolvePointerSelection(elements, ['first', 'second'], 'second', true), []);
});

test('框选默认选择相交元素，并排除锁定元素和拥有子元素的容器', () => {
  const inside = element('inside', { x: 10, y: 10, width: 20, height: 20 });
  const crossing = element('crossing', { x: 25, y: 25, width: 20, height: 20 });
  const locked = element('locked', { x: 12, y: 12, width: 10, height: 10, locked: true });
  const container = element('container', { width: 100, height: 100 });
  const child = element('child', { x: 25, y: 5, width: 20, height: 20, parentId: 'container' });
  const elements = [inside, crossing, locked, container, child];
  const rect = { x: 0, y: 0, width: 30, height: 30 };
  assert.deepEqual(selectElementsInRect(elements, rect), ['inside', 'crossing', 'child']);
});

test('跨父容器移动保持相同画布位移并只修改变换根', () => {
  const leftParent = element('left-parent', { x: 100, y: 100, width: 300, height: 300 });
  const rotatedParent = element('rotated-parent', { x: 500, y: 100, width: 300, height: 300, rotation: 90 });
  const first = element('first', { x: 20, y: 30, parentId: 'left-parent' });
  const second = element('second', { x: 40, y: 50, parentId: 'rotated-parent' });
  const elements = [leftParent, rotatedParent, first, second];
  const transaction = createMoveTransaction(elements, ['first', 'second'], 'first');
  assert.ok(transaction);
  const preview = previewMoveTransaction(transaction, elements, { x: 30, y: 10 }, (value) => value, false);
  const firstResult = preview.preview.find((item) => item.id === 'first');
  const secondResult = preview.preview.find((item) => item.id === 'second');
  assert.deepEqual({ x: firstResult?.x, y: firstResult?.y }, { x: 50, y: 40 });
  assert.ok(Math.abs((secondResult?.x ?? 0) - 50) < 0.000001);
  assert.ok(Math.abs((secondResult?.y ?? 0) - 20) < 0.000001);
  assert.equal(transactionHasChanges(preview), true);
  assert.equal(transactionHasChanges(transaction), false);
});
