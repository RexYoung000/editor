import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, Element } from '../src/types';
import {
  createPageThumbnailScheduler,
  isSamePageThumbnailTarget,
  PAGE_THUMBNAIL_DEBOUNCE_MS,
  type PageThumbnailTarget,
} from '../src/utils/pageThumbnailSync';

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
      const pending = [...tasks.entries()];
      tasks.clear();
      pending.forEach(([, task]) => task.callback());
    },
  };
}

function target(courseId: string, pageId: string): PageThumbnailTarget {
  return { courseId, pageId };
}

function element(id: string, type = 'Image'): Element {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
  };
}

test('画布连续变化会重置 500ms 计时，只提交最后一次缩略图', () => {
  const fake = createFakeClock();
  const captured: PageThumbnailTarget[] = [];
  const scheduler = createPageThumbnailScheduler((value) => captured.push(value), { clock: fake.clock });

  scheduler.schedule(target('course', 'page'));
  assert.equal([...fake.tasks.values()][0]?.delayMs, PAGE_THUMBNAIL_DEBOUNCE_MS);
  scheduler.schedule(target('course', 'page'));

  assert.equal(fake.tasks.size, 1);
  assert.deepEqual(captured, []);
  fake.runPending();
  assert.deepEqual(captured, [target('course', 'page')]);
});

test('保存或预览边界会立即提交，并取消尚未执行的延迟任务', () => {
  const fake = createFakeClock();
  const captured: PageThumbnailTarget[] = [];
  const scheduler = createPageThumbnailScheduler((value) => captured.push(value), { clock: fake.clock });
  const current = target('course', 'page');

  scheduler.schedule(current);
  scheduler.flush(current);

  assert.deepEqual(captured, [current]);
  assert.equal(fake.tasks.size, 0);
  fake.runPending();
  assert.deepEqual(captured, [current]);
});

test('页面或课件变化会取消旧目标，同名页面仍按课程隔离', () => {
  const fake = createFakeClock();
  const captured: PageThumbnailTarget[] = [];
  const scheduler = createPageThumbnailScheduler((value) => captured.push(value), { clock: fake.clock });
  const oldCourse = target('course-a', 'shared-page');
  const newCourse = target('course-b', 'shared-page');

  assert.equal(isSamePageThumbnailTarget(oldCourse, newCourse), false);
  assert.equal(isSamePageThumbnailTarget(oldCourse, target('course-a', 'shared-page')), true);

  scheduler.schedule(oldCourse);
  scheduler.schedule(newCourse);
  fake.runPending();

  assert.deepEqual(captured, [newCourse]);
});

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

test('折叠预习区、正课区或当前大关卡都不改变当前页面', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const course: Course = {
    id: 'fold-course',
    stages: [{
      id: 'normal-stage',
      name: '正课',
      subPages: [{ id: 'normal-page', name: '普通页', elements: [element('image')] }],
    }],
    previewStages: [{
      id: 'preview-stage',
      name: '预习',
      subPages: [{ id: 'preview-page', name: '视频页', elements: [element('video', 'Video')] }],
    }],
  };

  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().setCurrentSubPage('preview-stage', 'preview-page');

  for (const collapse of [
    () => useEditorStore.getState().togglePreviewShrinked(),
    () => useEditorStore.getState().toggleNormalShrinked(),
    () => useEditorStore.getState().toggleStageShrink('preview-stage'),
  ]) {
    collapse();
    const state = useEditorStore.getState();
    assert.equal(state.currentStageId, 'preview-stage');
    assert.equal(state.currentSubPageId, 'preview-page');
    assert.equal(state.currentCourse?.previewStages?.[0].subPages[0].elements[0].type, 'Video');
  }

  useEditorStore.getState().setCurrentSubPage('normal-stage', 'normal-page');
  assert.equal(useEditorStore.getState().currentSubPageId, 'normal-page');
  useEditorStore.getState().setCurrentSubPage('preview-stage', 'preview-page');
  assert.equal(useEditorStore.getState().currentSubPageId, 'preview-page');
});
