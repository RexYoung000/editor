import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, Element } from '../src/types';
import {
  getExplicitLayerLabel,
  getLayerDisplayName,
  getNextLayerCopyName,
  getVisualSiblings,
  visualDropToStorageIndex,
  withLayerLabel,
} from '../src/utils/layerPresentation';

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
    name: id,
    props: {},
    ...overrides,
  };
}

function courseWith(elements: Element[]): Course {
  return {
    id: 'layer-course',
    stages: [{
      id: 'stage',
      name: '关卡 1',
      subPages: [{ id: 'page', name: '小关卡 1-1', elements }],
    }],
  };
}

test('图层名称兼容旧数据，且可以独立保存中文、空格和重复名称', async () => {
  const oldElement = element('old', { name: 'confirmButton' });
  assert.equal(getLayerDisplayName(oldElement, '确定按钮'), 'confirmButton');
  assert.equal(getLayerDisplayName(element('unnamed', { name: undefined }), '图片'), '图片');

  const { useEditorStore } = await import('../src/store/editorStore');
  const first = element('first', { name: 'firstButton' });
  const second = element('second', { name: 'secondButton' });
  useEditorStore.getState().setCurrentCourse(courseWith([first, second]));

  useEditorStore.getState().updateElement('first', {
    props: withLayerLabel(first.props, '  确定 按钮  '),
  });
  useEditorStore.getState().updateElement('second', {
    props: withLayerLabel(second.props, '确定 按钮'),
  });
  useEditorStore.getState().saveHistory();

  const page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(getExplicitLayerLabel(page.elements[0]), '确定 按钮');
  assert.equal(getExplicitLayerLabel(page.elements[1]), '确定 按钮');
  assert.equal(page.elements[0].name, 'firstButton');
  assert.equal(page.elements[1].name, 'secondButton');

  useEditorStore.getState().undo();
  assert.equal(getExplicitLayerLabel(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements[0]), '');
  useEditorStore.getState().redo();
  assert.equal(getExplicitLayerLabel(useEditorStore.getState().currentCourse!.stages[0].subPages[0].elements[0]), '确定 按钮');
});

test('图层视觉顺序与存储顺序反向，拖放索引会先移除当前图层再换算', () => {
  const low = element('low');
  const middle = element('middle');
  const high = element('high');
  const siblings = [low, middle, high];

  assert.deepEqual(getVisualSiblings(siblings, undefined).map((item) => item.id), ['high', 'middle', 'low']);
  assert.equal(visualDropToStorageIndex(siblings, 'low', 0), 2);
  assert.equal(visualDropToStorageIndex(siblings, 'high', 3), 0);
  assert.equal(visualDropToStorageIndex(siblings, 'middle', 1), 1);

  const targetSiblings = [element('target-low'), element('target-high')];
  assert.equal(visualDropToStorageIndex(targetSiblings, 'external', 0), 2);
  assert.equal(visualDropToStorageIndex(targetSiblings, 'external', 2), 0);
});

test('同级和跨父级拖放保持存储语义，并分别只写一条历史', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const container = element('container', { type: 'Box' });
  const childLow = element('child-low', { parentId: 'container' });
  const childHigh = element('child-high', { parentId: 'container' });
  const root = element('root');
  useEditorStore.getState().setCurrentCourse(courseWith([container, childLow, childHigh, root]));

  const childSiblings = [childLow, childHigh];
  useEditorStore.getState().reorderElement(
    'child-low',
    visualDropToStorageIndex(childSiblings, 'child-low', 0),
  );
  assert.equal(useEditorStore.getState().history.length, 2);
  let page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(
    page.elements.filter((item) => item.parentId === 'container').map((item) => item.id),
    ['child-high', 'child-low'],
  );

  const rootSiblings = page.elements.filter((item) => item.parentId === undefined);
  const storageIndex = visualDropToStorageIndex(rootSiblings, 'child-high', rootSiblings.length);
  useEditorStore.getState().setElementParent('child-high', undefined, false);
  useEditorStore.getState().reorderElement('child-high', storageIndex, false);
  useEditorStore.getState().saveHistory();

  assert.equal(useEditorStore.getState().history.length, 3);
  page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(page.elements.find((item) => item.id === 'child-high')?.parentId, undefined);
  assert.equal(getVisualSiblings(page.elements, undefined).at(-1)?.id, 'child-high');
});

test('上移、下移、置顶和置底使用视觉方向但保持原有存储语义', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse(courseWith([
    element('low'),
    element('middle'),
    element('high'),
  ]));

  useEditorStore.getState().moveElementLayer('middle', 'up');
  let page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(page.elements.map((item) => item.id), ['low', 'high', 'middle']);

  useEditorStore.getState().moveElementLayer('middle', 'bottom');
  page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(page.elements.map((item) => item.id), ['middle', 'low', 'high']);

  useEditorStore.getState().moveElementLayer('middle', 'top');
  page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(page.elements.map((item) => item.id), ['low', 'high', 'middle']);

  useEditorStore.getState().moveElementLayer('middle', 'down');
  page = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(page.elements.map((item) => item.id), ['low', 'middle', 'high']);
});

test('连续复制生成唯一组件标识和递增副本名称，不叠加副本后缀', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const source = element('source', {
    name: 'confirmButton',
    props: withLayerLabel({}, '确定按钮'),
  });
  useEditorStore.getState().setCurrentCourse(courseWith([source]));
  useEditorStore.getState().selectElements(['source']);

  const firstCopy = useEditorStore.getState().duplicateElements();
  assert.ok(firstCopy);
  const first = firstCopy.elements.find((item) => item.id === firstCopy.selectedIds[0])!;
  assert.equal(first.name, 'confirmButton_2');
  assert.equal(getExplicitLayerLabel(first), '确定按钮 副本');

  useEditorStore.getState().selectElements(['source']);
  const secondCopy = useEditorStore.getState().duplicateElements();
  assert.ok(secondCopy);
  const second = secondCopy.elements.find((item) => item.id === secondCopy.selectedIds[0])!;
  assert.equal(second.name, 'confirmButton_3');
  assert.equal(getExplicitLayerLabel(second), '确定按钮 副本 2');

  useEditorStore.getState().selectElements([second.id]);
  const thirdCopy = useEditorStore.getState().duplicateElements();
  assert.ok(thirdCopy);
  const third = thirdCopy.elements.find((item) => item.id === thirdCopy.selectedIds[0])!;
  assert.equal(getExplicitLayerLabel(third), '确定按钮 副本 3');
  assert.equal(getNextLayerCopyName('确定按钮 副本 8', ['确定按钮 副本']), '确定按钮 副本 2');
});
