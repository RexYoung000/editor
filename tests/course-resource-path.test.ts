import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course } from '../src/types';
import {
  clearCourseResourceCache,
  getCourseResourceUrl,
  readFileAsDataUrl,
  saveProjectAs,
} from '../src/utils/electronFs';

test('同 ID 另存后使用独立可编辑副本、更新活动路径并隔离旧目录资源缓存', async () => {
  const storage = new Map<string, string>([
    ['forge_course_dir_A', '/source/A'],
    ['forge_course_file_A', '/source/A/A.json'],
  ]);
  const reads: string[] = [];
  let saveParams: Record<string, unknown> | null = null;

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      electronAPI: {
        readFileAsDataUrl: async (courseDir: string, relativePath: string) => {
          reads.push(`${courseDir}:${relativePath}`);
          return `data:${courseDir}:${relativePath}`;
        },
        saveCourseAs: async (params: Record<string, unknown>) => {
          saveParams = params;
          return { ok: true, targetDir: '/backup/A', filePath: '/backup/A/A.json', replaced: false };
        },
      },
    },
  });

  clearCourseResourceCache();
  const oldResourceUrl = getCourseResourceUrl('A', 'images/example.mp4');
  assert.equal(await readFileAsDataUrl('A', 'images/example.png'), 'data:/source/A:images/example.png');
  assert.equal(await readFileAsDataUrl('A', 'images/example.png'), 'data:/source/A:images/example.png');
  assert.equal(reads.length, 1);

  const frozenPreviewStage = Object.freeze({
    id: 'preview-1',
    name: '预习 1',
    subPages: Object.freeze([]),
    noSubPages: false,
  });
  const course = Object.freeze({
    id: 'A',
    kind: 'normal',
    stages: Object.freeze([]),
    previewStages: Object.freeze([frozenPreviewStage]),
  }) as unknown as Course;
  const { course: savedCourse } = await saveProjectAs(course, 'A', '/backup', false);

  assert.equal(storage.get('forge_course_dir_A'), '/backup/A');
  assert.equal(storage.get('forge_course_file_A'), '/backup/A/A.json');
  assert.equal(saveParams?.overwrite, false);
  assert.equal(saveParams?.sourceDir, '/source/A');
  assert.notEqual(getCourseResourceUrl('A', 'images/example.mp4'), oldResourceUrl);
  assert.equal(await readFileAsDataUrl('A', 'images/example.png'), 'data:/backup/A:images/example.png');
  assert.equal(reads.length, 2);
  assert.notEqual(savedCourse.previewStages, course.previewStages);
  assert.notEqual(savedCourse.previewStages?.[0], course.previewStages?.[0]);
  assert.doesNotThrow(() => {
    savedCourse.previewStages![0].name = '预习 2';
    savedCourse.previewStages![0].noSubPages = true;
  });
});
