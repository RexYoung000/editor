import test from 'node:test';
import assert from 'node:assert/strict';
import type { EditorLayerGroup, Element } from '../src/types';
import {
  getLayerAncestorKeys,
  getLayerRangeSelection,
  getLayerTreeElementOrder,
  getLayerTreeVisibility,
} from '../src/utils/layerTree';
import { resolveEditorLayerGroups } from '../src/utils/layerGroups';

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

test('图层树搜索保留父级路径并临时展开必要祖先', () => {
  const elements = [
    element('root', { type: 'Box', name: '课堂容器' }),
    element('deep', { parentId: 'root', name: '确定按钮', type: 'ScaleButton' }),
    element('other', { name: '背景' }),
  ];
  const visibility = getLayerTreeVisibility({
    elements,
    groups: [],
    searchTerm: '确定按钮',
    filter: 'all',
    typeFilter: '',
    selectedIds: [],
    elementSearchText: new Map([
      ['root', '课堂容器 root Box'],
      ['deep', '确定按钮 deep ScaleButton 课堂容器 root'],
      ['other', '背景 other Image'],
    ]),
  });

  assert.deepEqual([...visibility.matchedElementIds], ['deep']);
  assert.deepEqual([...visibility.visibleElementIds].sort(), ['deep', 'root']);
  assert.deepEqual([...visibility.autoExpandedElementIds], ['root']);
  assert.equal(visibility.visibleElementIds.has('other'), false);
});

test('图层树筛选支持选中、隐藏、锁定和组件类型，并保留组祖先', () => {
  const elements = [
    element('a', { type: 'Image' }),
    element('b', { type: 'ScaleButton', groupId: 'group', locked: true }),
    element('c', { type: 'Label', groupId: 'group', props: { _editorHidden: true } }),
  ];
  const groups = resolveEditorLayerGroups({
    elements,
    editorLayerGroups: [{ id: 'group', name: '课堂素材' }],
  });
  const layerStates = new Map([
    ['a', { explicitHidden: false, effectiveHidden: false, explicitLocked: false, effectiveLocked: false }],
    ['b', { explicitHidden: false, effectiveHidden: false, explicitLocked: true, effectiveLocked: true }],
    ['c', { explicitHidden: true, effectiveHidden: true, explicitLocked: false, effectiveLocked: false }],
  ] as const);
  const common = {
    elements,
    groups,
    searchTerm: '',
    typeFilter: '',
    selectedIds: ['b'],
    elementSearchText: new Map(elements.map((item) => [item.id, item.id])),
    groupSearchText: new Map([['group', '课堂素材 group']]),
    layerStates,
  };

  assert.deepEqual([...getLayerTreeVisibility({ ...common, filter: 'selected' }).visibleElementIds], ['b']);
  assert.deepEqual([...getLayerTreeVisibility({ ...common, filter: 'hidden' }).visibleElementIds], ['c']);
  assert.deepEqual([...getLayerTreeVisibility({ ...common, filter: 'locked' }).visibleElementIds], ['b']);
  assert.deepEqual([...getLayerTreeVisibility({ ...common, filter: 'type', typeFilter: 'Label' }).visibleElementIds], ['c']);
  assert.deepEqual([...getLayerTreeVisibility({ ...common, filter: 'selected' }).visibleGroupIds], ['group']);
});

test('图层树视觉顺序支持容器、图层组和 Shift 连续选择', () => {
  const elements = [
    element('low'),
    element('container', { type: 'Box' }),
    element('child-low', { parentId: 'container' }),
    element('child-high', { parentId: 'container' }),
    element('group-low', { groupId: 'group' }),
    element('group-high', { groupId: 'group' }),
  ];
  const groups = resolveEditorLayerGroups({
    elements,
    editorLayerGroups: [{ id: 'group', name: '素材' }],
  });
  const allElements = new Set(elements.map((item) => item.id));
  const allGroups = new Set(groups.map((group) => group.id));
  const order = getLayerTreeElementOrder(elements, groups, allElements, allGroups, allElements, allGroups);

  assert.deepEqual(order, ['group-high', 'group-low', 'container', 'child-high', 'child-low', 'low']);
  assert.deepEqual(getLayerRangeSelection(order, 'group-low', 'child-high'), ['group-low', 'container', 'child-high']);
});

test('图层行定位会返回运行父级和编辑器组的展开路径', () => {
  const elements = [
    element('container', { type: 'Box' }),
    element('member', { parentId: 'container', groupId: 'group' }),
  ];
  const groups: EditorLayerGroup[] = [
    { id: 'parent-group', name: '父组' },
    { id: 'group', name: '子组', parentGroupId: 'parent-group' },
  ];
  assert.deepEqual(
    getLayerAncestorKeys('member', 'element', elements, groups),
    { elementIds: ['container'], groupIds: ['group', 'parent-group'] },
  );
  assert.deepEqual(
    getLayerAncestorKeys('group', 'group', elements, groups),
    { elementIds: [], groupIds: ['parent-group'] },
  );
});

test('图层树在 300+ 图层下仍保留完整可见顺序和搜索祖先', () => {
  const elements = [
    element('root', { type: 'Box', name: '批量容器' }),
    ...Array.from({ length: 320 }, (_, index) => element(`item-${index}`, {
      parentId: 'root',
      name: index === 319 ? '目标图层' : `图层 ${index}`,
    })),
  ];
  const elementSearchText = new Map(elements.map((item) => [
    item.id,
    [item.name, item.id, item.type, item.parentId ?? ''].join(' '),
  ]));
  const visibility = getLayerTreeVisibility({
    elements,
    groups: [],
    searchTerm: '目标图层',
    filter: 'all',
    typeFilter: '',
    selectedIds: [],
    elementSearchText,
  });
  const order = getLayerTreeElementOrder(
    elements,
    [],
    new Set(elements.map((item) => item.id)),
    new Set(),
    new Set(['root']),
    new Set(),
  );

  assert.equal(elements.length, 321);
  assert.equal(order.length, 321);
  assert.equal(visibility.matchedElementIds.has('item-319'), true);
  assert.equal(visibility.visibleElementIds.has('root'), true);
  assert.equal(visibility.autoExpandedElementIds.has('root'), true);
});
