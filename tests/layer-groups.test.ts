import test from 'node:test';
import assert from 'node:assert/strict';
import type { Element, EditorLayerGroup, SubPage } from '../src/types';
import {
  canAssignElementsToGroup,
  canNestGroup,
  isGroupDescendant,
  resolveEditorLayerGroups,
} from '../src/utils/layerGroups';
import { cloneSubPageWithNewIds } from '../src/utils/internalPages';
import { buildScene } from '../src/utils/exportProject';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

function element(id: string, parentId?: string, groupId?: string): Element {
  return {
    id,
    type: 'Image',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    parentId,
    groupId,
    props: {},
  };
}

function page(elements: Element[], editorLayerGroups?: EditorLayerGroup[]): SubPage {
  return { id: 'page', name: '页面', elements, editorLayerGroups };
}

test('旧 groupId 自动生成兼容图层组，并标记跨运行父级编组', () => {
  const resolved = resolveEditorLayerGroups(page([
    element('a', 'container-a', 'legacy'),
    element('b', 'container-a', 'legacy'),
    element('c', 'container-b', 'cross'),
    element('d', 'container-c', 'cross'),
  ]));

  assert.deepEqual(resolved.map((group) => group.id), ['legacy', 'cross']);
  assert.equal(resolved[0].legacy, true);
  assert.equal(resolved[0].crossRuntimeParent, false);
  assert.deepEqual(resolved[0].memberIds, ['a', 'b']);
  assert.equal(resolved[1].crossRuntimeParent, true);
});

test('新图层组覆盖同 ID 旧编组并保留空组元数据', () => {
  const resolved = resolveEditorLayerGroups(page(
    [element('a', undefined, 'named')],
    [{ id: 'named', name: '课堂素材' }, { id: 'empty', name: '空组' }],
  ));

  assert.deepEqual(resolved.map((group) => group.name), ['课堂素材', '空组']);
  assert.equal(resolved[0].legacy, false);
  assert.deepEqual(resolved[1].memberIds, []);
});

test('图层组成员必须属于同一运行父级，嵌套不能形成循环', () => {
  const groups: EditorLayerGroup[] = [
    { id: 'root', name: '根组' },
    { id: 'child', name: '子组', parentGroupId: 'root' },
  ];
  const elements = [element('a'), element('b'), element('c', 'container')];

  assert.equal(canAssignElementsToGroup(elements, ['a', 'b'], { runtimeParentId: undefined }), true);
  assert.equal(canAssignElementsToGroup(elements, ['a', 'c'], { runtimeParentId: undefined }), false);
  assert.equal(canAssignElementsToGroup(elements, ['c'], { runtimeParentId: undefined, memberIds: [] }), true);
  assert.equal(canAssignElementsToGroup(elements, ['a', 'c'], { runtimeParentId: undefined, memberIds: [] }), false);
  assert.equal(isGroupDescendant(groups, 'child', 'root'), true);
  assert.equal(canNestGroup(groups, 'root', 'child'), false);
  assert.equal(canNestGroup(groups, 'child', undefined), true);
});

test('复制页面时重建图层组 ID、成员引用和运行父级引用', () => {
  const source = page([
    element('container'),
    element('child', 'container', 'group-old'),
  ], [{ id: 'group-old', name: '素材', runtimeParentId: 'container' }]);
  const cloned = cloneSubPageWithNewIds(source, (prefix) => `${prefix}-new`);
  const clonedGroup = cloned.editorLayerGroups?.[0];
  assert.ok(clonedGroup);
  assert.notEqual(clonedGroup.id, 'group-old');
  assert.notEqual(clonedGroup.runtimeParentId, 'container');
  assert.equal(cloned.elements.find((element) => element.name === undefined && element.groupId)?.groupId, clonedGroup.id);
});

test('图层组创建、重命名、移入和解散各自只写一条历史', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const parent = element('parent');
  const first = element('first', undefined);
  const second = element('second', undefined);
  const other = element('other', 'runtime-parent');
  useEditorStore.getState().setCurrentCourse({
    id: 'layer-group-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '页面', elements: [parent, first, second, other] }] }],
  });

  const groupId = useEditorStore.getState().addEditorLayerGroup('素材', ['first', 'second']);
  assert.ok(groupId);
  let state = useEditorStore.getState();
  assert.equal(state.history.length, 2);
  let pageState = state.currentCourse!.stages[0].subPages[0];
  assert.equal(pageState.editorLayerGroups?.[0].name, '素材');
  assert.deepEqual(pageState.elements.filter((item) => item.groupId === groupId).map((item) => item.id), ['first', 'second']);
  assert.equal(useEditorStore.getState().setEditorLayerGroupMembers(groupId, ['first', 'other']), false);
  assert.equal(useEditorStore.getState().renameEditorLayerGroup(groupId, '课堂素材'), true);
  assert.equal(useEditorStore.getState().deleteEditorLayerGroup(groupId, false), undefined);
  state = useEditorStore.getState();
  pageState = state.currentCourse!.stages[0].subPages[0];
  assert.equal(pageState.editorLayerGroups?.length, 0);
  assert.equal(pageState.elements.some((item) => item.groupId === groupId), false);
});

test('空图层组可以先创建，再接收同一运行父级的成员', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const first = element('first', 'runtime-parent');
  const second = element('second', 'runtime-parent');
  useEditorStore.getState().setCurrentCourse({
    id: 'empty-layer-group-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '页面', elements: [first, second] }] }],
  });

  const groupId = useEditorStore.getState().addEditorLayerGroup('待整理');
  assert.ok(groupId);
  assert.equal(useEditorStore.getState().setEditorLayerGroupMembers(groupId, ['first']), true);
  assert.equal(useEditorStore.getState().setEditorLayerGroupMembers(groupId, ['second']), true);
  const pageState = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(pageState.editorLayerGroups?.[0].runtimeParentId, 'runtime-parent');
  assert.deepEqual(pageState.elements.filter((item) => item.groupId === groupId).map((item) => item.id), ['first', 'second']);
});

test('快捷键编组写入一条历史，撤销后恢复未编组状态', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse({
    id: 'layer-group-shortcut-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [{ id: 'page', name: '页面', elements: [element('a'), element('b')] }] }],
  });
  useEditorStore.getState().selectElements(['a', 'b']);
  useEditorStore.getState().groupElements();
  let state = useEditorStore.getState();
  assert.equal(state.history.length, 2);
  assert.equal(state.currentCourse!.stages[0].subPages[0].editorLayerGroups?.length, 1);
  useEditorStore.getState().undo();
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].editorLayerGroups?.length ?? 0, 0);
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements.some((item) => item.groupId), false);
});

test('删除父图层组会递归清理嵌套组关系', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse({
    id: 'layer-group-nested-course',
    stages: [{
      id: 'stage',
      name: '关卡 1',
      subPages: [{
        id: 'page',
        name: '页面',
        elements: [element('a', undefined, 'root'), element('b', undefined, 'child')],
        editorLayerGroups: [
          { id: 'root', name: '根组' },
          { id: 'child', name: '子组', parentGroupId: 'root' },
        ],
      }],
    }],
  });
  useEditorStore.getState().deleteEditorLayerGroup('root', false);
  const pageState = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(pageState.editorLayerGroups, []);
  assert.equal(pageState.elements.some((item) => item.groupId), false);
});

test('图层组元数据不改变运行场景导出结构', () => {
  const grouped = page(
    [element('a', undefined, 'group')],
    [{ id: 'group', name: '仅编辑器可见' }],
  );
  const withoutMetadata = page([element('a', undefined, 'group')]);
  const groupedScene = buildScene(grouped, 'scene', new Map()).json;
  const plainScene = buildScene(withoutMetadata, 'scene', new Map()).json;
  assert.deepEqual(groupedScene, plainScene);
  assert.equal(JSON.stringify(groupedScene).includes('editorLayerGroups'), false);
  assert.equal(JSON.stringify(groupedScene).includes('仅编辑器可见'), false);
});

test('复制粘贴会重建图层组 ID，并为副本生成可区分的组名', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse({
    id: 'layer-group-paste-course',
    stages: [{
      id: 'stage',
      name: '关卡 1',
      subPages: [{
        id: 'page',
        name: '页面',
        elements: [element('a', undefined, 'group')],
        editorLayerGroups: [{ id: 'group', name: '素材' }],
      }],
    }],
  });
  useEditorStore.getState().selectElements(['a']);
  useEditorStore.getState().copyElements();
  const result = useEditorStore.getState().pasteElements();
  assert.ok(result);
  const pageState = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(pageState.editorLayerGroups?.length, 2);
  assert.deepEqual(pageState.editorLayerGroups?.map((group) => group.name), ['素材', '素材 副本']);
  const groupIds = pageState.elements.map((item) => item.groupId).filter(Boolean);
  assert.equal(new Set(groupIds).size, 2);
});
