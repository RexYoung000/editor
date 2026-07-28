import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commitPendingPropertyEdits,
  createPropertyEditSession,
  parseFiniteNumberDraft,
  PROPERTY_EDIT_IDLE_MS,
} from '../src/utils/propertyEditSession';

function createFakeClock() {
  let nextId = 1;
  const tasks = new Map<number, { callback: () => void; delayMs: number }>();
  return {
    clock: {
      set(callback: () => void, delayMs: number) {
        const id = nextId++;
        tasks.set(id, { callback, delayMs });
        return id;
      },
      clear(timer: unknown) {
        tasks.delete(timer as number);
      },
    },
    tasks,
    runPending() {
      const pending = [...tasks.values()];
      tasks.clear();
      pending.forEach((task) => task.callback());
    },
  };
}

test('数值草稿只在形成有限数字后才可实时写入', () => {
  for (const draft of ['', '-', '+', '.', '-.', '1e', 'Infinity']) {
    assert.equal(parseFiniteNumberDraft(draft), null);
  }
  assert.equal(parseFiniteNumberDraft('0'), 0);
  assert.equal(parseFiniteNumberDraft('-12.5'), -12.5);
  assert.equal(parseFiniteNumberDraft('.75'), 0.75);
  assert.equal(parseFiniteNumberDraft('1e3'), 1000);
});

test('连续属性输入实时更新，但停止输入只提交一条历史', () => {
  const fake = createFakeClock();
  let value = 10;
  const history: number[] = [];
  const session = createPropertyEditSession(
    () => String(value),
    () => history.push(value),
    { clock: fake.clock },
  );

  session.change(() => { value = 20; });
  session.change(() => { value = 30; });

  assert.equal(value, 30);
  assert.equal(fake.tasks.size, 1);
  assert.equal([...fake.tasks.values()][0]?.delayMs, PROPERTY_EDIT_IDLE_MS);
  assert.deepEqual(history, []);

  fake.runPending();
  assert.deepEqual(history, [30]);
  session.dispose();
});

test('保存和切换边界会立即提交，未变化的会话不制造历史', () => {
  const fake = createFakeClock();
  let value = 'old';
  const history: string[] = [];
  const session = createPropertyEditSession(
    () => value,
    () => history.push(value),
    { clock: fake.clock },
  );

  session.begin();
  commitPendingPropertyEdits();
  assert.deepEqual(history, []);

  session.change(() => { value = 'new'; });
  commitPendingPropertyEdits();
  assert.deepEqual(history, ['new']);
  assert.equal(fake.tasks.size, 0);

  session.change(() => { value = 'final'; });
  assert.equal(session.commit(), true);
  assert.deepEqual(history, ['new', 'final']);
  session.dispose();
});

test('属性输入立即更新真实课件，并可一次撤销和重做整次编辑', async () => {
  const storage = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    window: { electronAPI: {} },
  });
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse({
    id: 'property-edit-course',
    stages: [{
      id: 'stage',
      name: '关卡',
      subPages: [{
        id: 'page',
        name: '页面',
        elements: [{
          id: 'element',
          type: 'Image',
          x: 10,
          y: 20,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          props: {},
        }],
      }],
    }],
  });

  const session = createPropertyEditSession(
    () => JSON.stringify(useEditorStore.getState().currentCourse),
    () => useEditorStore.getState().saveHistory(),
  );
  session.change(() => useEditorStore.getState().updateElement('element', { x: 30 }));
  session.change(() => useEditorStore.getState().updateElement('element', { x: 45 }));

  assert.equal(useEditorStore.getState().currentCourse?.stages[0].subPages[0].elements[0].x, 45);
  assert.equal(useEditorStore.getState().historyIndex, 0);

  session.commit();
  assert.equal(useEditorStore.getState().historyIndex, 1);
  useEditorStore.getState().undo();
  assert.equal(useEditorStore.getState().currentCourse?.stages[0].subPages[0].elements[0].x, 10);
  useEditorStore.getState().redo();
  assert.equal(useEditorStore.getState().currentCourse?.stages[0].subPages[0].elements[0].x, 45);
  session.dispose();
});
