import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, Element } from '../src/types';
import {
  getElementParentContainment,
  getElementWorldCorners,
  getFitContainerToChildrenUpdates,
} from '../src/utils/canvasGeometry';
import { getSelectionOverflowContextContainerIds } from '../src/utils/canvasSelection';
import { createInternalPagesSubPage } from '../src/utils/internalPages';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

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

function assertPointSetsClose(
  actual: Array<{ x: number; y: number }>,
  expected: Array<{ x: number; y: number }>,
): void {
  assert.equal(actual.length, expected.length);
  actual.forEach((point, index) => {
    assert.ok(Math.abs(point.x - expected[index].x) < 0.000001);
    assert.ok(Math.abs(point.y - expected[index].y) < 0.000001);
  });
}

function applyGeometryUpdates(elements: Element[], updates: ReturnType<typeof getFitContainerToChildrenUpdates>): Element[] {
  const updateMap = new Map((updates ?? []).map((update) => [update.id, update]));
  return elements.map((item) => ({ ...item, ...(updateMap.get(item.id) ?? {}) }));
}

test('父容器局部范围能区分完全包含与四向越界', () => {
  const parent = element('parent', { type: 'ContainerBox', width: 100, height: 100 });
  const inside = element('inside', { x: 10, y: 20, width: 30, height: 40, parentId: 'parent' });
  const rightBottom = element('right-bottom', { x: 80, y: 90, width: 30, height: 20, parentId: 'parent' });
  const leftTop = element('left-top', { x: -10, y: -15, width: 20, height: 20, parentId: 'parent' });
  const elements = [parent, inside, rightBottom, leftTop];

  assert.equal(getElementParentContainment(inside, elements)?.isOverflowing, false);
  assert.deepEqual(getElementParentContainment(rightBottom, elements)?.correction, { x: -10, y: -10 });
  assert.deepEqual(getElementParentContainment(leftTop, elements)?.correction, { x: 10, y: 15 });
});

test('越界判断同时支持旋转子元素和旋转父容器', () => {
  const parent = element('parent', { type: 'ContainerBox', width: 100, height: 100, rotation: 90 });
  const rotatedChild = element('rotated-child', {
    x: 90,
    y: 90,
    width: 20,
    height: 40,
    rotation: 90,
    parentId: 'parent',
  });
  const rightChild = element('right-child', { x: 80, y: 10, width: 30, height: 20, parentId: 'parent' });
  const elements = [parent, rotatedChild, rightChild];

  const rotatedContainment = getElementParentContainment(rotatedChild, elements);
  assert.equal(rotatedContainment?.isOverflowing, true);
  assert.ok(Math.abs((rotatedContainment?.correction.y ?? 0) + 10) < 0.000001);
  assert.deepEqual(getElementParentContainment(rightChild, elements)?.correction, { x: -10, y: 0 });
  assert.deepEqual([...getSelectionOverflowContextContainerIds(elements, ['rotated-child'])], ['parent']);
});

test('子元素旋转范围大于父容器时不能完整移回', () => {
  const parent = element('parent', { type: 'ContainerBox', width: 100, height: 100 });
  const child = element('child', { x: -10, width: 120, height: 20, parentId: 'parent' });
  const containment = getElementParentContainment(child, [parent, child]);
  assert.equal(containment?.isOverflowing, true);
  assert.equal(containment?.canFit, false);
});

test('扩展容器包含全部后代，扩展右下边界时不缩小原范围', () => {
  const parent = element('parent', { type: 'ContainerBox', width: 100, height: 100 });
  const child = element('child', { x: 80, y: 90, width: 40, height: 30, parentId: 'parent' });
  const updates = getFitContainerToChildrenUpdates(parent, [parent, child]);
  const parentUpdate = updates?.find((update) => update.id === 'parent');
  assert.deepEqual(parentUpdate, { id: 'parent', x: 0, y: 0, width: 120, height: 120 });
});

test('扩展旋转容器的左上边界后，直接子元素和深层后代画布位置不变', () => {
  const parent = element('parent', {
    type: 'ContainerBox',
    x: 200,
    y: 100,
    width: 100,
    height: 100,
    rotation: 90,
    props: { anchorX: 0.5, anchorY: 0.5 },
  });
  const child = element('child', {
    type: 'ContainerBox',
    x: -20,
    y: -10,
    width: 30,
    height: 30,
    parentId: 'parent',
  });
  const grandchild = element('grandchild', { x: 5, y: 5, width: 10, height: 10, parentId: 'child' });
  const elements = [parent, child, grandchild];
  const childBefore = getElementWorldCorners(child, elements);
  const grandchildBefore = getElementWorldCorners(grandchild, elements);
  const updates = getFitContainerToChildrenUpdates(parent, elements);
  const updatedElements = applyGeometryUpdates(elements, updates);
  const updatedParent = updatedElements.find((item) => item.id === 'parent')!;
  const updatedChild = updatedElements.find((item) => item.id === 'child')!;
  const updatedGrandchild = updatedElements.find((item) => item.id === 'grandchild')!;

  assert.equal(updatedParent.width, 120);
  assert.equal(updatedParent.height, 110);
  assertPointSetsClose(getElementWorldCorners(updatedChild, updatedElements), childBefore);
  assertPointSetsClose(getElementWorldCorners(updatedGrandchild, updatedElements), grandchildBefore);
});

test('移回容器只生成一条历史并可一次撤销', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const parent = element('parent', { type: 'ContainerBox', width: 100, height: 100 });
  const child = element('child', { x: 90, y: 20, width: 20, height: 20, parentId: 'parent' });
  const course: Course = {
    id: 'move-into-parent-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '小关卡 1-1', elements: [parent, child] }] }],
  };
  useEditorStore.getState().setCurrentCourse(course);

  assert.deepEqual(useEditorStore.getState().moveElementIntoParent('child'), { ok: true });
  assert.equal(useEditorStore.getState().history.length, 2);
  assert.equal(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements[1].x, 80);
  useEditorStore.getState().undo();
  assert.equal(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements[1].x, 90);
});

test('扩展容器在内部页面只生成一条历史并可一次撤销', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('sub', '内部页面关卡');
  subPage.internalPages!.push({
    id: 'content',
    name: '内容页',
    kind: 'content',
    elements: [
      element('parent', { type: 'ContainerBox', width: 100, height: 100 }),
      element('child', { x: 90, width: 20, height: 20, parentId: 'parent' }),
    ],
  });
  const course: Course = {
    id: 'fit-internal-parent-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };
  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().setCurrentInternalPage('content');

  assert.deepEqual(useEditorStore.getState().fitContainerToChildren('parent'), { ok: true });
  let currentSubPage = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(currentSubPage.elements.length, 0);
  assert.equal(currentSubPage.internalPages![0].elements[0].width, 110);
  assert.equal(useEditorStore.getState().history.length, 2);
  useEditorStore.getState().undo();
  currentSubPage = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(currentSubPage.internalPages![0].elements[0].width, 100);
});
