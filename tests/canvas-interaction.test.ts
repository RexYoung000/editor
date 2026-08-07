import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element } from '../src/types';
import {
  getElementWorldBounds,
  isPointInsideElement,
} from '../src/utils/canvasGeometry';
import {
  findCanvasPointerTarget,
  findTopElementAtPoint,
  getContainerIds,
  getSelectionContextContainerIds,
  getTransformRootIds,
  normalizeSelection,
  resolvePointerSelection,
  selectElementsInRect,
} from '../src/utils/canvasSelection';
import {
  createMoveTransaction,
  createResizeTransaction,
  createRotateTransaction,
  getSelectionFrame,
  previewMoveTransaction,
  previewResizeTransaction,
  previewRotateTransaction,
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

test('容器内部点击穿透到普通组件，内部空白用于框选', () => {
  const covered = element('covered', { x: 40, y: 40, width: 50, height: 50 });
  const container = element('container', { type: 'ContainerBox', width: 300, height: 300 });
  const child = element('child', { x: 200, y: 200, width: 50, height: 50, parentId: 'container' });
  const emptyContainer = element('empty-container', { type: 'Box', x: 400, width: 100, height: 100 });
  const emptyCovered = element('empty-covered', { x: 420, y: 20, width: 50, height: 50 });
  const elements = [covered, container, child, emptyCovered, emptyContainer];

  assert.deepEqual([...getContainerIds(elements)], ['container', 'empty-container']);
  assert.equal(findTopElementAtPoint(elements, { x: 50, y: 50 }, [])?.id, 'covered');
  assert.equal(findTopElementAtPoint(elements, { x: 50, y: 50 }, ['container'])?.id, 'covered');
  assert.equal(findTopElementAtPoint(elements, { x: 210, y: 210 }, [])?.id, 'child');
  assert.equal(findTopElementAtPoint(elements, { x: 150, y: 150 }, []), null);
  assert.equal(findTopElementAtPoint(elements, { x: 430, y: 30 }, [])?.id, 'empty-covered');
});

test('弹窗编辑态底板与遮罩不参与点击或框选，只命中弹窗内容', () => {
  const base = element('dialog-base', { width: 1920, height: 1080, locked: true, props: { __editorCanvasHitThrough: true } });
  const mask = element('dialog-mask', { width: 1920, height: 1080, locked: true, props: { __editorCanvasHitThrough: true } });
  const content = element('dialog-content', { x: 100, y: 100 });
  const elements = [base, mask, content];
  assert.equal(findTopElementAtPoint(elements, { x: 120, y: 120 }, [])?.id, 'dialog-content');
  assert.equal(findTopElementAtPoint(elements, { x: 500, y: 500 }, []), null);
  assert.deepEqual(selectElementsInRect(elements, { x: 0, y: 0, width: 1920, height: 1080 }), ['dialog-content']);
});

test('选中子组件只派生直接父容器上下文，不把几何覆盖视为父子关系', () => {
  const parent = element('parent', { type: 'ContainerBox', width: 300, height: 300 });
  const child = element('child', { parentId: 'parent' });
  const sibling = element('sibling', { x: 120, parentId: 'parent' });
  const otherParent = element('other-parent', { type: 'Box', x: 400, width: 300, height: 300 });
  const otherChild = element('other-child', { parentId: 'other-parent' });
  const coveredOnly = element('covered-only', { x: 20, y: 20 });
  const elements = [coveredOnly, parent, child, sibling, otherParent, otherChild];

  assert.deepEqual([...getSelectionContextContainerIds(elements, ['child'])], ['parent']);
  assert.deepEqual([...getSelectionContextContainerIds(elements, ['child', 'sibling'])], ['parent']);
  assert.deepEqual([...getSelectionContextContainerIds(elements, ['child', 'other-child'])], ['parent', 'other-parent']);
  assert.deepEqual([...getSelectionContextContainerIds(elements, ['covered-only'])], []);
  assert.deepEqual([...getSelectionContextContainerIds(elements, ['parent', 'child'])], []);
});

test('父子不会同时作为选择或变换根，锁定元素不参与变换', () => {
  const parent = element('parent');
  const child = element('child', { parentId: 'parent' });
  const locked = element('locked', { locked: true });
  assert.deepEqual(normalizeSelection([parent, child, locked], ['child', 'parent']), ['parent']);
  assert.deepEqual(normalizeSelection([parent, child, locked], ['parent', 'child'], 'child'), ['child']);
  assert.deepEqual(getTransformRootIds([parent, child, locked], ['parent', 'child', 'locked']), ['parent']);
});

test('锁定元素退出画布命中并穿透到下方未锁定元素', () => {
  const below = element('below', { x: 10, y: 10 });
  const locked = element('locked', { x: 10, y: 10, locked: true });
  const lockedButton = element('locked-button', { type: 'ScaleButton', x: 10, y: 10, locked: true });
  const point = { x: 20, y: 20 };

  assert.equal(findTopElementAtPoint([below, locked], point, [])?.id, 'below');
  assert.equal(findTopElementAtPoint([locked, below], point, [])?.id, 'below');
  assert.equal(findTopElementAtPoint([below, lockedButton], point, [])?.id, 'below');
  assert.equal(findTopElementAtPoint([below, locked], point, ['locked'])?.id, 'below');
  assert.equal(findTopElementAtPoint([locked], point, []), null);
  assert.equal(findTopElementAtPoint([locked], point, [], { includeLocked: true })?.id, 'locked');
  assert.deepEqual(selectElementsInRect([locked], { x: 0, y: 0, width: 100, height: 100 }), []);
  assert.equal(getSelectionFrame([locked], ['locked']), null);
  assert.ok(getSelectionFrame([locked], ['locked'], { includeLocked: true }));
});

test('父级锁定后代和锁定容器画布入口都不能截获点击', () => {
  const below = element('below', { x: 10, y: 10 });
  const parent = element('parent', { type: 'ContainerBox', locked: true, width: 300, height: 300 });
  const child = element('child', { x: 10, y: 10, parentId: 'parent' });
  const point = { x: 20, y: 20 };
  const elements = [below, parent, child];

  assert.equal(findTopElementAtPoint(elements, point, ['child'])?.id, 'below');
  assert.equal(findCanvasPointerTarget(elements, point, ['parent'], 'parent')?.id, 'below');
  assert.equal(findCanvasPointerTarget([parent, child], point, ['parent'], 'parent'), null);
  parent.locked = false;
  assert.equal(findCanvasPointerTarget(elements, point, [], 'parent')?.id, 'parent');
});

test('编组点击会选择整组，修饰键再次点击会移除整组', () => {
  const first = element('first', { groupId: 'group-1' });
  const second = element('second', { groupId: 'group-1' });
  const elements = [first, second];
  assert.deepEqual(resolvePointerSelection(elements, [], 'first', false), ['first', 'second']);
  assert.deepEqual(resolvePointerSelection(elements, ['first', 'second'], 'second', true), []);
});

test('显式编辑器图层组的成员可以独立点击、框选和变换', () => {
  const first = element('first', { groupId: 'group-1', x: 10, y: 10, width: 20, height: 20 });
  const second = element('second', { groupId: 'group-1', x: 100, y: 100, width: 20, height: 20 });
  const elements = [first, second];
  const editorLayerGroupIds = new Set(['group-1']);

  assert.deepEqual(resolvePointerSelection(elements, [], 'first', false, editorLayerGroupIds), ['first']);
  assert.deepEqual(resolvePointerSelection(elements, ['first'], 'second', true, editorLayerGroupIds), ['first', 'second']);
  assert.deepEqual(selectElementsInRect(elements, { x: 0, y: 0, width: 40, height: 40 }, editorLayerGroupIds), ['first']);
  assert.deepEqual(getTransformRootIds(elements, ['first'], editorLayerGroupIds), ['first']);
  assert.deepEqual(createMoveTransaction(elements, ['first'], 'first', editorLayerGroupIds)?.roots.map((root) => root.id), ['first']);
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

test('单选变换框沿元素真实旋转方向显示', () => {
  const rotated = element('rotated', { x: 100, y: 100, width: 100, height: 40, rotation: 90 });
  const frame = getSelectionFrame([rotated], ['rotated']);
  assert.ok(frame);
  assert.ok(Math.abs(frame.origin.x - 100) < 0.000001);
  assert.ok(Math.abs(frame.origin.y - 100) < 0.000001);
  assert.ok(Math.abs(frame.width - 100) < 0.000001);
  assert.ok(Math.abs(frame.height - 40) < 0.000001);
  assert.ok(Math.abs(frame.rotation - 90) < 0.000001);
});

test('多选支持自由缩放和 Shift 等比缩放', () => {
  const first = element('first');
  const second = element('second', { x: 200, y: 100 });
  const elements = [first, second];
  const transaction = createResizeTransaction(elements, ['first', 'second'], 'se');
  assert.ok(transaction);

  const free = previewResizeTransaction(transaction, elements, { x: 600, y: 300 }, false, (value) => value);
  const freeSecond = free.preview.find((item) => item.id === 'second');
  assert.deepEqual(
    { x: freeSecond?.x, y: freeSecond?.y, width: freeSecond?.width, height: freeSecond?.height },
    { x: 400, y: 150, width: 200, height: 150 },
  );

  const proportional = previewResizeTransaction(transaction, elements, { x: 600, y: 300 }, true, (value) => value);
  const proportionalSecond = proportional.preview.find((item) => item.id === 'second');
  assert.deepEqual(
    { x: proportionalSecond?.x, y: proportionalSecond?.y, width: proportionalSecond?.width, height: proportionalSecond?.height },
    { x: 400, y: 200, width: 200, height: 200 },
  );
});

test('跨旋转父容器缩放仍按画布绝对坐标更新', () => {
  const leftParent = element('left-parent', { x: 100, y: 100, width: 300, height: 300 });
  const rotatedParent = element('rotated-parent', { x: 500, y: 100, width: 300, height: 300, rotation: 90 });
  const first = element('first', { x: 20, y: 30, parentId: 'left-parent' });
  const second = element('second', { x: 40, y: 50, parentId: 'rotated-parent' });
  const elements = [leftParent, rotatedParent, first, second];
  const transaction = createResizeTransaction(elements, ['first', 'second'], 'se');
  assert.ok(transaction);
  const pointer = {
    x: transaction.frame.origin.x + transaction.frame.width * 2,
    y: transaction.frame.origin.y + transaction.frame.height * 2,
  };
  const preview = previewResizeTransaction(transaction, elements, pointer, false, (value) => value);
  for (const result of preview.preview) {
    const start = transaction.roots.find((item) => item.id === result.id)!;
    const expectedX = transaction.frame.origin.x + (start.worldPivot.x - transaction.frame.origin.x) * 2;
    const expectedY = transaction.frame.origin.y + (start.worldPivot.y - transaction.frame.origin.y) * 2;
    assert.ok(Math.abs(result.worldPivot.x - expectedX) < 0.000001);
    assert.ok(Math.abs(result.worldPivot.y - expectedY) < 0.000001);
  }
});

test('多选整体旋转围绕选择中心并支持角度吸附', () => {
  const first = element('first');
  const second = element('second', { x: 200 });
  const elements = [first, second];
  const transaction = createRotateTransaction(elements, ['first', 'second'], { x: 150, y: -50 });
  assert.ok(transaction);

  const rightAngle = previewRotateTransaction(transaction, elements, { x: 250, y: 50 }, false);
  const firstResult = rightAngle.preview.find((item) => item.id === 'first');
  const secondResult = rightAngle.preview.find((item) => item.id === 'second');
  assert.ok(Math.abs((firstResult?.x ?? 0) - 200) < 0.000001);
  assert.ok(Math.abs((firstResult?.y ?? 0) + 100) < 0.000001);
  assert.ok(Math.abs((secondResult?.x ?? 0) - 200) < 0.000001);
  assert.ok(Math.abs((secondResult?.y ?? 0) - 100) < 0.000001);
  assert.equal(firstResult?.rotation, 90);
  assert.equal(secondResult?.rotation, 90);

  const radians = -52 * Math.PI / 180;
  const snapped = previewRotateTransaction(transaction, elements, {
    x: 150 + Math.cos(radians) * 100,
    y: 50 + Math.sin(radians) * 100,
  }, true);
  assert.equal(snapped.angleDelta, 45);
});
