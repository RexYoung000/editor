import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, Element } from '../src/types';

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

test('拖动复制重建内部 ID 关系，取消前不写历史', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const first = element('first', {
    groupId: 'group-old',
    actions: [{
      id: 'action-first',
      event: 'onClick',
      actionType: 'toggleVisible',
      targetId: 'second',
      groupId: 'action-group-old',
      branchId: 'branch-old',
    }],
  });
  const second = element('second', {
    x: 200,
    groupId: 'group-old',
    actions: [{
      id: 'action-second',
      event: 'onClick',
      actionType: 'toggleVisible',
      targetId: 'first',
      groupId: 'action-group-old',
      branchId: 'branch-old',
    }],
  });
  const child = element('child', { x: 20, y: 20, parentId: 'first' });
  const course: Course = {
    id: 'drag-copy-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '小关卡 1-1', elements: [first, second, child] }] }],
  };
  useEditorStore.getState().setCurrentCourse(course);

  const result = useEditorStore.getState().duplicateElementsForDrag(['first', 'second']);
  assert.ok(result);
  assert.equal(useEditorStore.getState().history.length, 1);
  assert.equal(result.allIds.length, 3);
  assert.equal(result.selectedIds.length, 2);

  const cloneFirst = result.elements.find((item) => item.id === result.idMap.first)!;
  const cloneSecond = result.elements.find((item) => item.id === result.idMap.second)!;
  const cloneChild = result.elements.find((item) => item.id === result.idMap.child)!;
  assert.notEqual(cloneFirst.groupId, 'group-old');
  assert.equal(cloneFirst.groupId, cloneSecond.groupId);
  assert.equal(cloneChild.parentId, cloneFirst.id);
  assert.equal(cloneFirst.actions?.[0].targetId, cloneSecond.id);
  assert.equal(cloneSecond.actions?.[0].targetId, cloneFirst.id);
  assert.notEqual(cloneFirst.actions?.[0].id, 'action-first');
  assert.notEqual(cloneFirst.actions?.[0].groupId, 'action-group-old');
  assert.equal(cloneFirst.actions?.[0].groupId, cloneSecond.actions?.[0].groupId);
  assert.notEqual(cloneFirst.actions?.[0].branchId, 'branch-old');
  assert.equal(cloneFirst.actions?.[0].branchId, cloneSecond.actions?.[0].branchId);

  useEditorStore.getState().updateElementsWithoutHistory(result.selectedIds.map((id) => ({
    id,
    x: 50,
    y: 60,
    width: 120,
    height: 130,
    rotation: 15,
  })));
  assert.equal(useEditorStore.getState().history.length, 1);
  const movedClone = useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements
    .find((item) => item.id === result.selectedIds[0]);
  assert.deepEqual(
    { x: movedClone?.x, y: movedClone?.y, width: movedClone?.width, height: movedClone?.height, rotation: movedClone?.rotation },
    { x: 50, y: 60, width: 120, height: 130, rotation: 15 },
  );

  useEditorStore.getState().removeElementsWithoutHistory(result.allIds);
  const page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(page.elements.map((item) => item.id), ['first', 'second', 'child']);
  assert.equal(useEditorStore.getState().history.length, 1);
});

test('普通复制只新增一条历史并可一次撤销', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const source = element('source', { name: 'source' });
  const course: Course = {
    id: 'duplicate-history-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '小关卡 1-1', elements: [source] }] }],
  };
  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().selectElements(['source']);

  const result = useEditorStore.getState().duplicateElements();
  assert.ok(result);
  assert.equal(useEditorStore.getState().history.length, 2);
  assert.equal(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements.length, 2);

  useEditorStore.getState().undo();
  assert.equal(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements.length, 1);
  assert.equal(useEditorStore.getState().historyIndex, 0);
});
