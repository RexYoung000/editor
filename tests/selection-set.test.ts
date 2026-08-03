import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element, Course } from '../src/types';
import {
  getSelectionAlignmentUpdates,
  getSelectionGeometryUpdates,
  getSelectionSetBounds,
} from '../src/utils/selectionSet';
import { getElementWorldBounds } from '../src/utils/canvasGeometry';

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

function applyUpdates(elements: Element[], updates: ReturnType<typeof getSelectionGeometryUpdates>): Element[] {
  return elements.map((item) => {
    const update = updates.find((candidate) => candidate.id === item.id);
    return update ? { ...item, ...update } : item;
  });
}

test('选择集包围框使用画布坐标，并在跨父容器时保持世界几何', () => {
  const parent = element('parent', { x: 100, y: 80, width: 300, height: 300 });
  const child = element('child', { parentId: 'parent', x: 20, y: 30, width: 40, height: 20 });
  const other = element('other', { x: 420, y: 250, width: 60, height: 30 });
  const elements = [parent, child, other];

  assert.deepEqual(getSelectionSetBounds(elements, ['child', 'other']), {
    x: 120,
    y: 110,
    width: 360,
    height: 170,
  });

  const updates = getSelectionGeometryUpdates(elements, ['child', 'other'], { key: 'x', value: 220 });
  const next = applyUpdates(elements, updates);
  const nextBounds = getSelectionSetBounds(next, ['child', 'other']);
  assert.equal(nextBounds?.x, 220);
  assert.equal(getElementWorldBounds(next[1], next).x, 220);
  assert.equal(getElementWorldBounds(next[2], next).x, 520);
});

test('选择集宽高比锁定按当前包围框比例联动另一项', () => {
  const first = element('first', { x: 100, y: 100, width: 40, height: 20 });
  const second = element('second', { x: 240, y: 180, width: 60, height: 30 });
  const elements = [first, second];
  const updates = getSelectionGeometryUpdates(elements, ['first', 'second'], {
    key: 'width',
    value: 400,
    lockAspectRatio: true,
  });
  const nextBounds = getSelectionSetBounds(applyUpdates(elements, updates), ['first', 'second']);
  assert.equal(nextBounds?.width, 400);
  assert.equal(nextBounds?.height, 220);
});

test('对齐和分布使用世界坐标，分布不足三个可编辑根时不执行', () => {
  const parent = element('parent', { x: 100, y: 100, width: 300, height: 300, rotation: 0 });
  const child = element('child', { parentId: 'parent', x: 30, y: 20, width: 40, height: 40 });
  const second = element('second', { x: 360, y: 180, width: 50, height: 40 });
  const third = element('third', { x: 620, y: 300, width: 60, height: 40 });
  const elements = [parent, child, second, third];

  assert.deepEqual(getSelectionAlignmentUpdates(elements, ['child', 'second'], 'distributeH'), []);
  const alignUpdates = getSelectionAlignmentUpdates(elements, ['child', 'second', 'third'], 'left');
  const aligned = applyUpdates(elements, alignUpdates);
  const alignedBounds = ['child', 'second', 'third'].map((id) => {
    const item = aligned.find((candidate) => candidate.id === id)!;
    return getElementWorldBounds(item, aligned).x;
  });
  assert.deepEqual(alignedBounds, [130, 130, 130]);

  const distributionUpdates = getSelectionAlignmentUpdates(elements, ['child', 'second', 'third'], 'distributeH');
  const distributed = applyUpdates(elements, distributionUpdates);
  const distributedBounds = ['child', 'second', 'third'].map((id) => {
    const item = distributed.find((candidate) => candidate.id === id)!;
    return getElementWorldBounds(item, distributed).x;
  });
  assert.deepEqual(distributedBounds, [130, 370, 620]);
});

test('选择集几何通过编辑器状态只写入一条历史', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const first = element('first', { x: 100, y: 100, width: 40, height: 20 });
  const second = element('second', { x: 240, y: 180, width: 60, height: 30 });
  const course: Course = {
    id: 'selection-set-history-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '页面', elements: [first, second] }] }],
  };
  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().selectElements(['first', 'second']);
  useEditorStore.getState().updateSelectionSetGeometry({ key: 'x', value: 200 }, true);
  const state = useEditorStore.getState();
  assert.equal(state.history.length, 2);
  const page = state.currentCourse!.stages[0].subPages[0];
  assert.equal(getSelectionSetBounds(page.elements, ['first', 'second'])?.x, 200);
});
