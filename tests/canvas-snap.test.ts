import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element } from '../src/types';
import {
  createSmartSnapCandidates,
  getResizeSnapAxes,
  getSelectionFrameBounds,
  snapBoundsToCandidates,
  snapPointToCandidates,
  type SnapCandidate,
} from '../src/utils/canvasSnap';
import {
  createMoveTransaction,
  getFrameHandleWorldPoint,
  previewMoveTransaction,
  translateMoveTransaction,
  type SelectionFrame,
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

function verticalCandidate(key: string, value: number): SnapCandidate {
  return {
    key,
    axis: 'x',
    value,
    extentStart: 0,
    extentEnd: 100,
    priority: 2,
  };
}

test('页面四边和中心作为移动吸附目标', () => {
  const candidates = createSmartSnapCandidates([], [], 1920, 1080);
  const edge = snapBoundsToCandidates(
    { x: -4, y: 200, width: 100, height: 100 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(edge.correction.x, 4);
  assert.equal(edge.guides.some((guide) => guide.axis === 'x' && guide.position === 0), true);

  const center = snapBoundsToCandidates(
    { x: 906, y: 200, width: 100, height: 100 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(center.correction.x, 4);
  assert.equal(center.guides.some((guide) => guide.axis === 'x' && guide.position === 960), true);
});

test('同尺寸组件整体对齐时同时显示两条外边线并省略重复中心线', () => {
  const target = element('target', { x: 100, y: 200, width: 120, height: 80 });
  const candidates = createSmartSnapCandidates([target], [], 1920, 1080);
  const verticallyAligned = snapBoundsToCandidates(
    { x: 300, y: 204, width: 120, height: 80 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(verticallyAligned.correction.y, -4);
  assert.deepEqual(
    verticallyAligned.guides
      .filter((guide) => guide.axis === 'y')
      .map((guide) => guide.position),
    [200, 280],
  );

  const horizontallyAligned = snapBoundsToCandidates(
    { x: 104, y: 400, width: 120, height: 80 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(horizontallyAligned.correction.x, -4);
  assert.deepEqual(
    horizontallyAligned.guides
      .filter((guide) => guide.axis === 'x')
      .map((guide) => guide.position),
    [100, 220],
  );
});

test('不同尺寸只有中心重合时继续显示单条中心线', () => {
  const target = element('target', { x: 100, y: 200, width: 120, height: 80 });
  const candidates = createSmartSnapCandidates([target], [], 1920, 1080);
  const result = snapBoundsToCandidates(
    { x: 300, y: 224, width: 60, height: 40 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(result.correction.y, -4);
  assert.deepEqual(
    result.guides
      .filter((guide) => guide.axis === 'y')
      .map((guide) => guide.position),
    [240],
  );
});

test('页面中心与组件边线同位置时仍显示完整组件关系而非贯穿页面线', () => {
  const target = element('target', { x: 100, y: 460, width: 120, height: 80 });
  const candidates = createSmartSnapCandidates([target], [], 1920, 1080);
  const result = snapBoundsToCandidates(
    { x: 300, y: 464, width: 120, height: 80 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(result.correction.y, -4);
  const horizontalGuides = result.guides.filter((guide) => guide.axis === 'y');
  assert.deepEqual(horizontalGuides.map((guide) => guide.position), [460, 540]);
  assert.deepEqual(
    horizontalGuides.map((guide) => ({ start: guide.start, end: guide.end })),
    [
      { start: 100, end: 420 },
      { start: 100, end: 420 },
    ],
  );
});

test('可见锁定元素参与候选，隐藏元素与隐藏后代被排除', () => {
  const locked = element('locked', { x: 300, locked: true });
  const hidden = element('hidden', { x: 500, props: { _editorHidden: true } });
  const hiddenChild = element('hidden-child', { x: 20, parentId: 'hidden' });
  const candidates = createSmartSnapCandidates(
    [locked, hidden, hiddenChild],
    [],
    1920,
    1080,
  );
  assert.equal(candidates.some((candidate) => candidate.key.startsWith('element:locked:')), true);
  assert.equal(candidates.some((candidate) => candidate.key.startsWith('element:hidden:')), false);
  assert.equal(candidates.some((candidate) => candidate.key.startsWith('element:hidden-child:')), false);
});

test('移动容器时排除自身后代，移动子元素时保留直接父容器', () => {
  const parent = element('parent', { type: 'ContainerBox', x: 100, y: 100, width: 300, height: 300 });
  const child = element('child', { x: 20, y: 20, parentId: 'parent' });
  const movingParent = createSmartSnapCandidates([parent, child], ['parent'], 1920, 1080);
  assert.equal(movingParent.some((candidate) => candidate.key.startsWith('element:child:')), false);

  const movingChild = createSmartSnapCandidates([parent, child], ['child'], 1920, 1080);
  const parentCandidates = movingChild.filter((candidate) => candidate.key.startsWith('element:parent:'));
  assert.equal(parentCandidates.length, 6);
  assert.equal(parentCandidates.every((candidate) => candidate.priority === 0), true);
});

test('吸附容差按屏幕距离随缩放换算', () => {
  const candidates = createSmartSnapCandidates([], [], 1920, 1080);
  const bounds = { x: 6, y: 200, width: 100, height: 100 };
  assert.equal(snapBoundsToCandidates(bounds, candidates, { zoom: 1 }).correction.x, 0);
  assert.equal(snapBoundsToCandidates(bounds, candidates, { zoom: 0.5 }).correction.x, -6);
  assert.equal(snapBoundsToCandidates(bounds, candidates, { zoom: 2 }).correction.x, 0);
});

test('已命中目标在释放范围内优先保持，离开后才切换目标', () => {
  const candidates = [
    verticalCandidate('first', 100),
    verticalCandidate('second', 106),
  ];
  const first = snapBoundsToCandidates(
    { x: 97, y: 0, width: 0, height: 20 },
    candidates,
    { zoom: 1 },
  );
  assert.equal(first.locks.x?.candidateKey, 'first');

  const retained = snapBoundsToCandidates(
    { x: 104.5, y: 0, width: 0, height: 20 },
    candidates,
    { zoom: 1, previous: first.locks },
  );
  assert.equal(retained.locks.x?.candidateKey, 'first');
  assert.equal(retained.correction.x, -4.5);

  const switched = snapBoundsToCandidates(
    { x: 109, y: 0, width: 0, height: 20 },
    candidates,
    { zoom: 1, previous: retained.locks },
  );
  assert.equal(switched.locks.x?.candidateKey, 'second');
  assert.equal(switched.correction.x, -3);
});

test('旋转选择使用真实包围范围，旋转侧边手柄按实际移动轴吸附', () => {
  const frame: SelectionFrame = {
    origin: { x: 100, y: 100 },
    width: 100,
    height: 40,
    rotation: 90,
  };
  const bounds = getSelectionFrameBounds(frame);
  assert.ok(Math.abs(bounds.x - 60) < 0.000001);
  assert.ok(Math.abs(bounds.y - 100) < 0.000001);
  assert.ok(Math.abs(bounds.width - 40) < 0.000001);
  assert.ok(Math.abs(bounds.height - 100) < 0.000001);
  assert.deepEqual(getResizeSnapAxes('e', 90), ['y']);
  assert.deepEqual(getResizeSnapAxes('s', 90), ['x']);
  assert.deepEqual(getResizeSnapAxes('se', 90), ['x', 'y']);

  const handle = getFrameHandleWorldPoint(frame, 'e');
  assert.ok(Math.abs(handle.x - 80) < 0.000001);
  assert.ok(Math.abs(handle.y - 200) < 0.000001);
});

test('智能吸附修正移动事务时保持跨父容器的同一画布位移', () => {
  const parent = element('parent', { x: 100, y: 100 });
  const rotatedParent = element('rotated-parent', { x: 500, y: 100, rotation: 90 });
  const first = element('first', { x: 20, y: 30, parentId: 'parent' });
  const second = element('second', { x: 40, y: 50, parentId: 'rotated-parent' });
  const elements = [parent, rotatedParent, first, second];
  const transaction = createMoveTransaction(elements, ['first', 'second'], 'first');
  assert.ok(transaction);
  const moved = previewMoveTransaction(transaction, elements, { x: 28, y: 8 }, (value) => value, false);
  const snapped = translateMoveTransaction(moved, elements, { x: 2, y: 2 });
  assert.deepEqual(snapped.worldDelta, { x: 30, y: 10 });
  for (const result of snapped.preview) {
    const start = transaction.roots.find((root) => root.id === result.id);
    assert.ok(start);
    assert.ok(Math.abs(result.worldPivot.x - start.worldPivot.x - 30) < 0.000001);
    assert.ok(Math.abs(result.worldPivot.y - start.worldPivot.y - 10) < 0.000001);
  }
});

test('缩放手柄可以只匹配允许的轴', () => {
  const candidates = [
    verticalCandidate('vertical', 100),
    {
      key: 'horizontal',
      axis: 'y' as const,
      value: 200,
      extentStart: 0,
      extentEnd: 100,
      priority: 2,
    },
  ];
  const result = snapPointToCandidates(
    { x: 97, y: 197 },
    ['y'],
    candidates,
    { zoom: 1 },
  );
  assert.deepEqual(result.correction, { x: 0, y: 3 });
  assert.equal(result.guides.length, 1);
  assert.equal(result.guides[0].axis, 'y');
});
