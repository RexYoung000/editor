import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element } from '../src/types';
import {
  createEqualSpacingItems,
  getEqualSpacingHints,
  snapBoundsToEqualSpacing,
  type SpacingItem,
} from '../src/utils/canvasSpacing';

function item(id: string, x: number, y: number, width = 100, height = 100): SpacingItem {
  return { id, bounds: { x, y, width, height } };
}

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

test('移动项位于两个元素之间时吸附为水平等间距并显示两段距离', () => {
  const references = [item('left', 0, 0), item('right', 300, 0)];
  const moving = { x: 146, y: 0, width: 100, height: 100 };
  const result = snapBoundsToEqualSpacing(moving, references, { zoom: 1 });
  assert.equal(result.correction.x, 4);
  const finalBounds = { ...moving, x: moving.x + result.correction.x };
  const hints = getEqualSpacingHints(finalBounds, references, 1);
  assert.equal(hints[0].axis, 'x');
  assert.equal(hints[0].distance, 50);
  assert.deepEqual(hints[0].segments.map((segment) => [segment.start, segment.end]), [
    [100, 150],
    [250, 300],
  ]);
});

test('移动项位于连续两个元素外侧时吸附为相同水平间距', () => {
  const references = [item('first', 0, 0), item('second', 140, 0)];
  const moving = { x: 276, y: 0, width: 100, height: 100 };
  const result = snapBoundsToEqualSpacing(moving, references, { zoom: 1 });
  assert.equal(result.correction.x, 4);
  const hints = getEqualSpacingHints({ ...moving, x: 280 }, references, 1);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].distance, 40);
  assert.deepEqual(hints[0].segments.map((segment) => [segment.start, segment.end]), [
    [100, 140],
    [240, 280],
  ]);
});

test('垂直等间距吸附容差按屏幕距离换算', () => {
  const references = [item('first', 0, 0), item('second', 0, 140)];
  const moving = { x: 0, y: 274, width: 100, height: 100 };
  assert.equal(snapBoundsToEqualSpacing(moving, references, { zoom: 1 }).correction.y, 0);
  assert.equal(snapBoundsToEqualSpacing(moving, references, { zoom: 0.5 }).correction.y, 6);
  assert.equal(snapBoundsToEqualSpacing(moving, references, { zoom: 2 }).correction.y, 0);
});

test('等间距目标在释放范围内保持，离开后才取消', () => {
  const references = [item('first', 0, 0), item('second', 140, 0)];
  const first = snapBoundsToEqualSpacing(
    { x: 277, y: 0, width: 100, height: 100 },
    references,
    { zoom: 1 },
  );
  assert.equal(first.locks.x?.patternKey, 'x:after:first:second');
  const retained = snapBoundsToEqualSpacing(
    { x: 287, y: 0, width: 100, height: 100 },
    references,
    { zoom: 1, previous: first.locks },
  );
  assert.equal(retained.correction.x, -7);
  assert.equal(retained.locks.x?.patternKey, 'x:after:first:second');
  const released = snapBoundsToEqualSpacing(
    { x: 289, y: 0, width: 100, height: 100 },
    references,
    { zoom: 1, previous: retained.locks },
  );
  assert.equal(released.locks.x, undefined);
});

test('等间距候选排除移动项、后代、祖先和隐藏元素，保留锁定元素', () => {
  const parent = element('parent', { type: 'ContainerBox', x: 100, y: 100, width: 400, height: 300 });
  const child = element('child', { parentId: 'parent', x: 20, y: 20 });
  const grandchild = element('grandchild', { parentId: 'child', x: 10, y: 10 });
  const hidden = element('hidden', { x: 600, props: { _editorHidden: true } });
  const locked = element('locked', { x: 800, locked: true });
  const items = createEqualSpacingItems(
    [parent, child, grandchild, hidden, locked],
    ['child'],
  );
  assert.deepEqual(items.map((candidate) => candidate.id), ['locked']);
});
