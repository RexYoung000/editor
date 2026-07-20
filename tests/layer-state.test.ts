import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, Element } from '../src/types';
import { getElementLayerState, createElementMap } from '../src/utils/layerState';

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

function courseWith(elements: Element[]): Course {
  return {
    id: 'layer-state-course',
    stages: [{
      id: 'stage',
      name: '关卡 1',
      subPages: [{ id: 'page', name: '小关卡 1-1', elements }],
    }],
  };
}

test('有效图层状态区分自身状态、父级继承和来源', () => {
  const root = element('root', { props: { _editorHidden: true } });
  const parent = element('parent', { parentId: 'root', locked: true });
  const child = element('child', { parentId: 'parent', props: { _editorHidden: true } });
  const grandchild = element('grandchild', { parentId: 'child' });
  const map = createElementMap([root, parent, child, grandchild]);

  assert.deepEqual(getElementLayerState(parent, map), {
    explicitHidden: false,
    effectiveHidden: true,
    hiddenById: 'root',
    explicitLocked: true,
    effectiveLocked: true,
  });
  assert.deepEqual(getElementLayerState(child, map), {
    explicitHidden: true,
    effectiveHidden: true,
    hiddenById: 'root',
    explicitLocked: false,
    effectiveLocked: true,
    lockedById: 'parent',
  });
  assert.deepEqual(getElementLayerState(grandchild, map), {
    explicitHidden: false,
    effectiveHidden: true,
    hiddenById: 'child',
    explicitLocked: false,
    effectiveLocked: true,
    lockedById: 'parent',
  });
});

test('父级显隐解除后保留子级自身显隐状态，并各自只写一条历史', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const parent = element('parent');
  const child = element('child', { parentId: 'parent' });
  useEditorStore.getState().setCurrentCourse(courseWith([parent, child]));

  useEditorStore.getState().setElementEditorHidden('parent', true);
  let state = useEditorStore.getState();
  assert.equal(state.history.length, 2);
  let elements = state.currentCourse!.stages[0].subPages[0].elements;
  assert.equal(getElementLayerState(elements[1], createElementMap(elements)).effectiveHidden, true);

  useEditorStore.getState().setElementEditorHidden('child', true);
  useEditorStore.getState().setElementEditorHidden('parent', false);
  state = useEditorStore.getState();
  assert.equal(state.history.length, 4);
  elements = state.currentCourse!.stages[0].subPages[0].elements;
  assert.equal(getElementLayerState(elements[1], createElementMap(elements)).explicitHidden, true);
  assert.equal(getElementLayerState(elements[1], createElementMap(elements)).effectiveHidden, true);
});

test('父级锁定限制后代几何与结构操作，但子级仍可保留自身锁定状态', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const parent = element('parent');
  const child = element('child', { parentId: 'parent', x: 20 });
  const sibling = element('sibling', { x: 200 });
  useEditorStore.getState().setCurrentCourse(courseWith([parent, child, sibling]));

  useEditorStore.getState().setElementLocked('parent', true);
  let state = useEditorStore.getState();
  assert.equal(state.history.length, 2);
  const before = state.currentCourse!.stages[0].subPages[0].elements[1].x;

  useEditorStore.getState().updateElement('child', { x: 90 });
  useEditorStore.getState().deleteElement('child');
  useEditorStore.getState().reorderElement('child', 0);
  useEditorStore.getState().setElementParent('child', undefined);
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements.find((item) => item.id === 'child')?.x, before);
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements.find((item) => item.id === 'child')?.parentId, 'parent');
  assert.equal(state.history.length, 2);

  useEditorStore.getState().setElementLocked('child', true);
  useEditorStore.getState().setElementLocked('parent', false);
  state = useEditorStore.getState();
  const elements = state.currentCourse!.stages[0].subPages[0].elements;
  const childState = getElementLayerState(elements.find((item) => item.id === 'child')!, createElementMap(elements));
  assert.equal(childState.explicitLocked, true);
  assert.equal(childState.effectiveLocked, true);
});

test('父级锁定解除后，子级自身未锁定即可恢复可编辑', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const parent = element('parent');
  const child = element('child', { parentId: 'parent', x: 20 });
  useEditorStore.getState().setCurrentCourse(courseWith([parent, child]));
  useEditorStore.getState().setElementLocked('parent', true);
  useEditorStore.getState().setElementLocked('parent', false);

  useEditorStore.getState().updateElement('child', { x: 80 });
  const state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements.find((item) => item.id === 'child')?.x, 80);
  assert.equal(state.history.length, 3);
});
