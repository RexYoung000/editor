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
