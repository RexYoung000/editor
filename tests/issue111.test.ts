import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { assetSrc } from '../src/elements/builtinAssets';
import {
  filterPresetVideos,
  PRESET_VIDEOS,
  presetVideoTabVisible,
} from '../src/elements/presetVideos';
import type { Course } from '../src/types';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

test('预设视频注册表覆盖正课与复习课正式素材，并保留无素材课件的隐藏规则', () => {
  assert.equal(PRESET_VIDEOS.length, 39);
  assert.equal(new Set(PRESET_VIDEOS.map((video) => video.id)).size, 39);
  assert.equal(PRESET_VIDEOS.filter((video) => video.courseKind === 'normal').length, 33);
  assert.equal(PRESET_VIDEOS.filter((video) => video.courseKind === 'review').length, 6);
  assert.equal(PRESET_VIDEOS.filter((video) => video.courseKind === 'homework').length, 0);
  assert.equal(PRESET_VIDEOS.filter((video) => video.courseKind === 'sEvaluation').length, 0);
  assert.equal(presetVideoTabVisible('normal'), true);
  assert.equal(presetVideoTabVisible('review'), true);
  assert.equal(presetVideoTabVisible('homework'), false);
  assert.equal(presetVideoTabVisible('sEvaluation'), false);
});

test('每条预设视频都通过内置注册引用真实 MP4，且大小与 MD5 一致', () => {
  for (const video of PRESET_VIDEOS) {
    assert.match(video.assetPath, /^runtime\/video-stage\/.+\.mp4$/);
    assert.equal(assetSrc(video.assetId), `/builtin/${video.assetPath}`);
    assert.ok(video.size > 0 && video.size <= 50 * 1024 * 1024);
    assert.doesNotMatch(video.displayName, /_batch|\b(?:EN|YY|TW)\b|202[46]|_1|-新/i);

    const filePath = join(process.cwd(), 'public', 'builtin', video.assetPath);
    const data = readFileSync(filePath);
    assert.equal(statSync(filePath).size, video.size, `${video.id} 文件大小`);
    assert.equal(createHash('md5').update(data).digest('hex'), video.md5, `${video.id} MD5`);
  }
});

test('预设筛选按课件、语言和名称取交集，并正确映射 EN、YY、TW', () => {
  const english = filterPresetVideos('normal', 'english', '');
  const cantonese = filterPresetVideos('normal', 'cantonese', '');
  const traditional = filterPresetVideos('normal', 'traditional-zh', '');
  assert.equal(english.length, 11);
  assert.equal(cantonese.length, 11);
  assert.equal(traditional.length, 11);
  assert.ok(english.every((video) => video.originalFileName.includes('EN')));
  assert.ok(cantonese.every((video) => video.originalFileName.includes('YY')));
  assert.ok(traditional.every((video) => video.assetPath.includes('traditional-zh')));

  assert.deepEqual(
    filterPresetVideos('normal', 'english', '问题探索').map((video) => video.id),
    ['normal-english-transition-01'],
  );
  assert.deepEqual(
    filterPresetVideos('normal', 'cantonese', '问题探索').map((video) => video.id),
    ['normal-cantonese-transition-01'],
  );
  assert.deepEqual(filterPresetVideos('review', 'english', '片尾').map((video) => video.id), [
    'review-english-closing',
  ]);
  assert.deepEqual(filterPresetVideos('homework', 'all', ''), []);
});

test('正课、预习和复习课创建时直接写入视频引用，不生成空视频关卡', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const normalCourse: Course = { id: 'issue111-normal', kind: 'normal', stages: [] };
  useEditorStore.getState().setCurrentCourse(normalCourse);
  useEditorStore.getState().addStageFromPreset('video', 'images/animation/video_abc123.mp4');
  useEditorStore.getState().addPreviewStageFromPreset('video', 'images/animation/video_def456.mp4');

  let course = useEditorStore.getState().currentCourse!;
  const normalPage = course.stages[0].subPages[0];
  const previewPage = course.previewStages![0].subPages[0];
  assert.equal(normalPage.frozen, true);
  assert.equal(normalPage.elements[0].locked, true);
  assert.equal(normalPage.elements[0].props.videoUrl, 'images/animation/video_abc123.mp4');
  assert.equal(previewPage.elements[0].props.videoUrl, 'images/animation/video_def456.mp4');

  const reviewCourse: Course = { id: 'issue111-review', kind: 'review', stages: [] };
  useEditorStore.getState().setCurrentCourse(reviewCourse);
  useEditorStore.getState().addVideoStage('images/animation/video_789abc.mp4');
  course = useEditorStore.getState().currentCourse!;
  assert.equal(course.stages[0].subPages[0].elements[0].props.videoUrl, 'images/animation/video_789abc.mp4');
});

test('作业和专题测评虽隐藏预设 Tab，仍可创建并导出本地或资源库视频关卡', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  for (const kind of ['homework', 'sEvaluation'] as const) {
    const videoUrl = `images/animation/video_${kind}.mp4`;
    const course: Course = { id: `issue111-${kind}`, kind, stages: [] };
    useEditorStore.getState().setCurrentCourse(course);
    useEditorStore.getState().addStageFromPreset('video', videoUrl);
    const current = useEditorStore.getState().currentCourse!;
    assert.equal(current.stages[0].subPages[0].elements[0].props.videoUrl, videoUrl);

    const artifacts = buildExportRegressionArtifacts(current, new Map());
    assert.deepEqual((artifacts.config.pages as unknown[])[0], {
      type: 'video',
      videoUrl: `game_hw/animation/video_${kind}.mp4`,
      classType: '',
    });
  }
});
