import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Course, Element, Stage, SubPage } from '../src/types';
import {
  cloneStageWithNewIds,
  createInternalPagesSubPage,
  getElementPages,
} from '../src/utils/internalPages';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import { previewCourseFixture } from './fixtures/export-courses';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

let sequence = 0;
const makeId = (prefix: string) => `${prefix}-issue130-${++sequence}`;

function element(id: string, actions: Action[] = []): Element {
  return {
    id,
    type: 'ScaleButton',
    layaType: 'ScaleButton',
    name: id,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    opacity: 1,
    actions,
    props: {},
  };
}

function page(id: string, name: string, elements: Element[] = []): SubPage {
  return { id, name, elements };
}

function stage(id: string, name: string, subPages: SubPage[], noSubPages = false): Stage {
  return { id, name, subPages, noSubPages };
}

function normalCourse(stages: Stage[], previewStages: Stage[] = []): Course {
  return { id: `issue130-course-${++sequence}`, kind: 'normal', stages, previewStages };
}

test('复制大关卡会重建全部层级 ID，并把跨小关卡跳转改到副本', () => {
  const first = page('sub-1', '小关卡 1-1', [
    element('button-1', [{
      id: 'action-change-page',
      event: 'onClick',
      actionType: 'changePage',
      value: 'sub-2',
    }]),
  ]);
  const second = createInternalPagesSubPage('sub-2', '小关卡 1-2');
  second.internalPages = [{
    id: 'content-2',
    name: '内容页',
    kind: 'content',
    elements: [element('content-button')],
  }];
  second.elements = [element('open-content', [{
    id: 'action-open-content',
    event: 'onClick',
    actionType: 'navigateInternalPage',
    pageTargetId: 'content-2',
  }])];
  const source = stage('stage-1', '关卡 1', [first, second]);

  const cloned = cloneStageWithNewIds(source, makeId);
  assert.notEqual(cloned.id, source.id);
  assert.deepEqual(cloned.subPages.map((subPage) => subPage.id).some((id) => ['sub-1', 'sub-2'].includes(id)), false);
  assert.equal(cloned.subPages[0].elements[0].actions?.[0].value, cloned.subPages[1].id);
  assert.notEqual(cloned.subPages[1].internalPages?.[0].id, 'content-2');
  assert.equal(
    cloned.subPages[1].elements[0].actions?.[0].pageTargetId,
    cloned.subPages[1].internalPages?.[0].id,
  );
  const sourceElementIds = new Set(source.subPages.flatMap((subPage) =>
    getElementPages(subPage).flatMap((elementPage) => elementPage.elements.map((item) => item.id)),
  ));
  const clonedElementIds = cloned.subPages.flatMap((subPage) =>
    getElementPages(subPage).flatMap((elementPage) => elementPage.elements.map((item) => item.id)),
  );
  assert.equal(clonedElementIds.some((id) => sourceElementIds.has(id)), false);
});

test('旧预习关卡加载后开放多小关卡，并支持新增、复制小关卡和复制整关', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const preview = stage(
    'preview-stage',
    '预习 1',
    [page('preview-sub', '预习 1', [element('preview-element')])],
    true,
  );
  useEditorStore.getState().setCurrentCourse(normalCourse(
    [stage('normal-stage', '关卡 1', [page('normal-sub', '小关卡 1-1')])],
    [preview],
  ));

  let current = useEditorStore.getState().currentCourse!;
  assert.equal(current.previewStages?.[0].noSubPages, false);
  assert.equal(current.previewStages?.[0].subPages[0].name, '小关卡 1-1');

  useEditorStore.getState().addSubPage('preview-stage');
  current = useEditorStore.getState().currentCourse!;
  assert.deepEqual(current.previewStages?.[0].subPages.map((subPage) => subPage.name), [
    '小关卡 1-1',
    '小关卡 1-2',
  ]);

  useEditorStore.getState().duplicateSubPage('preview-stage', 'preview-sub');
  current = useEditorStore.getState().currentCourse!;
  assert.equal(current.previewStages?.[0].subPages.length, 3);
  assert.equal(current.previewStages?.[0].subPages[1].name, '小关卡 1-2');
  assert.notEqual(current.previewStages?.[0].subPages[1].id, 'preview-sub');
  assert.notEqual(current.previewStages?.[0].subPages[1].elements[0].id, 'preview-element');

  useEditorStore.getState().duplicateStage('preview-stage');
  current = useEditorStore.getState().currentCourse!;
  assert.equal(current.previewStages?.length, 2);
  assert.equal(current.previewStages?.[1].name, '预习 2');
  assert.equal(current.previewStages?.[1].subPages.length, 3);
  assert.equal(current.previewStages?.[1].subPages[0].name, '小关卡 2-1');
  assert.notEqual(current.previewStages?.[1].id, 'preview-stage');
});

test('正课普通大关卡和视频大关卡都可整体复制，单页课程保持原边界', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const videoElement: Element = {
    ...element('video-element'),
    type: 'Video',
    locked: true,
    props: { videoUrl: 'images/animation/lesson.mp4' },
  };
  const videoPage = page('video-sub', '视频关卡', [videoElement]);
  videoPage.frozen = true;
  const normal = stage('normal-stage', '关卡 1', [page('normal-sub', '小关卡 1-1')]);
  const video = stage('video-stage', '视频关卡', [videoPage], true);
  useEditorStore.getState().setCurrentCourse(normalCourse([normal, video]));

  useEditorStore.getState().duplicateStage('normal-stage');
  useEditorStore.getState().duplicateStage('video-stage');
  let current = useEditorStore.getState().currentCourse!;
  assert.equal(current.stages.length, 4);
  assert.equal(current.stages[1].name, '关卡 2');
  const videoCopy = current.stages[3];
  assert.equal(videoCopy.noSubPages, true);
  assert.equal(videoCopy.subPages[0].frozen, true);
  assert.equal(videoCopy.subPages[0].elements[0].props.videoUrl, 'images/animation/lesson.mp4');
  assert.notEqual(videoCopy.subPages[0].elements[0].id, 'video-element');

  useEditorStore.getState().setCurrentCourse({
    id: 'homework-course',
    kind: 'homework',
    stages: [stage('homework-stage', '关卡 1', [page('homework-sub', '小关卡 1-1')], true)],
  });
  useEditorStore.getState().duplicateStage('homework-stage');
  current = useEditorStore.getState().currentCourse!;
  assert.equal(current.stages.length, 1);
});

test('预习大关卡的每个小关卡都生成独立场景和同组 subviews', () => {
  const course = previewCourseFixture();
  const firstStage = course.previewStages?.[0];
  assert.ok(firstStage);
  const secondPage = structuredClone(firstStage.subPages[0]);
  secondPage.id = 'preview-page-2';
  secondPage.name = '小关卡 1-2';
  secondPage.elements = secondPage.elements.map((item, index) => ({
    ...item,
    id: `${item.id}-copy-${index}`,
    actions: item.actions?.map((action, actionIndex) => ({
      ...action,
      id: `${action.id}-copy-${actionIndex}`,
    })),
  }));
  firstStage.subPages.push(secondPage);

  const artifacts = buildPreviewExportRegressionArtifacts(course);
  assert.deepEqual(artifacts.scenes.map((scene) => scene.name), ['Game1', 'Game1_2']);
  const pages = artifacts.config.pages as Array<Record<string, unknown>>;
  assert.deepEqual(pages[0].subviews, [
    { view: 'view/game_preview/Game1.ts', param: '1', classType: 'yx' },
    { view: 'view/game_preview/Game1_2.ts', param: '1_2', classType: 'yx' },
  ]);
  assert.deepEqual(pages[1], {
    type: 'video',
    videoUrl: 'game_preview/animation/preview.mp4',
    classType: 'yxdh',
  });
});
