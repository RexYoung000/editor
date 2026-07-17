import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../src/types/index';
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

test('新增内部页面只提交一次历史记录，并可一次撤销完整恢复', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('sub', '内部页面关卡');
  const course: Course = {
    id: 'history-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().addInternalPage('dialog', '提示弹窗');

  let state = useEditorStore.getState();
  assert.equal(state.currentCourse?.stages[0].subPages[0].internalPages?.length, 1);
  assert.equal(state.history.length, 2);
  assert.equal(state.historyIndex, 1);

  state.undo();
  state = useEditorStore.getState();
  assert.equal(state.currentCourse?.stages[0].subPages[0].internalPages?.length, 0);
  assert.equal(state.historyIndex, 0);
});

test('页面分组支持创建、组内新增、跨组排序和删除后移入未分组', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('group-sub', '内部页面关卡');
  const course: Course = {
    id: 'group-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  const firstGroup = useEditorStore.getState().addInternalPageGroup('第一题');
  const secondGroup = useEditorStore.getState().addInternalPageGroup('第二题');
  assert.ok(firstGroup);
  assert.ok(secondGroup);
  const contentId = useEditorStore.getState().addInternalPage('content', '讲解页', { pageGroupId: firstGroup! });
  const dialogId = useEditorStore.getState().addInternalPage('dialog', '提示弹窗', { pageGroupId: firstGroup! });
  assert.ok(contentId);
  assert.ok(dialogId);

  let updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(updated.internalPages?.map((page) => page.pageGroupId), [firstGroup, firstGroup]);
  const historyBeforeMove = useEditorStore.getState().history.length;
  assert.equal(useEditorStore.getState().moveInternalPageInList(dialogId!, secondGroup!, 0), true);
  updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(updated.internalPages?.find((page) => page.id === dialogId)?.pageGroupId, secondGroup);
  assert.equal(useEditorStore.getState().currentInternalPageId, dialogId);
  assert.equal(useEditorStore.getState().history.length, historyBeforeMove + 1);
  assert.equal(useEditorStore.getState().moveInternalPageInList(dialogId!, secondGroup!, 0), false);
  assert.equal(useEditorStore.getState().history.length, historyBeforeMove + 1);

  useEditorStore.getState().reorderInternalPageGroups(1, 0);
  updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(updated.internalPageGroups?.map((group) => group.name), ['第二题', '第一题']);

  useEditorStore.getState().deleteInternalPageGroup(firstGroup!);
  updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(updated.internalPages?.find((page) => page.id === contentId)?.pageGroupId, undefined);
  assert.equal(updated.internalPages?.find((page) => page.id === dialogId)?.pageGroupId, secondGroup);
  assert.deepEqual(updated.internalPageGroups?.map((group) => group.name), ['第二题']);
});

test('删除分组及组内页面只提交一次历史，并把选中状态安全切回主界面', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('delete-group-sub', '内部页面关卡');
  const course: Course = {
    id: 'delete-group-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  const groupId = useEditorStore.getState().addInternalPageGroup('待删除题目')!;
  const contentId = useEditorStore.getState().addInternalPage('content', '题目内容', { pageGroupId: groupId })!;
  useEditorStore.getState().addInternalPage('dialog', '题目提示', { pageGroupId: groupId });
  useEditorStore.getState().addInternalPage('content', '保留页面');
  useEditorStore.getState().setCurrentInternalPage(contentId);
  const historyBeforeDelete = useEditorStore.getState().history.length;

  useEditorStore.getState().deleteInternalPageGroup(groupId, true);

  let state = useEditorStore.getState();
  let updated = state.currentCourse!.stages[0].subPages[0];
  assert.deepEqual(updated.internalPages?.map((page) => page.name), ['保留页面']);
  assert.equal(updated.internalPageGroups?.length, 0);
  assert.equal(state.currentInternalPageId, updated.id);
  assert.equal(state.history.length, historyBeforeDelete + 1);

  state.undo();
  state = useEditorStore.getState();
  updated = state.currentCourse!.stages[0].subPages[0];
  assert.deepEqual(updated.internalPages?.map((page) => page.name), ['题目内容', '题目提示', '保留页面']);
  assert.equal(updated.internalPageGroups?.[0].id, groupId);
});

test('顶部新增继承当前页面分组并插在当前页面下方', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('insert-sub', '内部页面关卡');
  const course: Course = {
    id: 'insert-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  const groupId = useEditorStore.getState().addInternalPageGroup('第一题')!;
  const firstId = useEditorStore.getState().addInternalPage('content', '第一页', { pageGroupId: groupId })!;
  useEditorStore.getState().addInternalPage('content', '第二页', { pageGroupId: groupId });
  const insertedId = useEditorStore.getState().addInternalPage('dialog', '第一页提示', { afterPageId: firstId })!;

  const updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.deepEqual(updated.internalPages?.map((page) => page.id), [firstId, insertedId, updated.internalPages?.[2].id]);
  assert.equal(updated.internalPages?.[1].pageGroupId, groupId);
  assert.equal(updated.internalPages?.[1].kind, 'dialog');
});

test('组合组件的子元素操作写入当前内部页，不误写主界面', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const subPage = createInternalPagesSubPage('special-sub', '内部页面关卡');
  subPage.internalPages!.push({
    id: 'content',
    name: '题目页',
    kind: 'content',
    elements: [{
      id: 'choice',
      type: 'ChoiceBox',
      layaType: 'ChoiceBox',
      name: 'choice',
      x: 0,
      y: 0,
      width: 600,
      height: 300,
      rotation: 0,
      opacity: 1,
      actions: [],
      props: {},
    }],
  });
  const course: Course = {
    id: 'special-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().setCurrentInternalPage('content');
  useEditorStore.getState().addChoiceOption('choice');

  const updated = useEditorStore.getState().currentCourse!.stages[0].subPages[0];
  assert.equal(updated.elements.length, 0);
  assert.equal(updated.internalPages?.[0].elements.length, 2);
  assert.equal(updated.internalPages?.[0].elements[1].parentId, 'choice');
});
