import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course } from '../src/types';
import {
  createPublishManifest,
  getConfirmedScopes,
  initialPublishProgress,
  movePublishProgress,
  normalizePublishParentPath,
  orderProjectUrls,
  projectNamesForCourse,
  requiredPublishScopes,
  stableStringify,
  type CoursePublishState,
} from '../src/utils/coursePublishing';

function course(kind: Course['kind'] = 'normal', hasPreview = false): Course {
  return {
    id: 's4_v9_02_YY',
    kind,
    stages: [{ id: 'stage-1', name: '第一关', subPages: [] }],
    previewStages: hasPreview ? [{ id: 'preview-1', name: '预习', subPages: [] }] : [],
  };
}

test('不同课型只要求确认实际发布的完整工程', () => {
  assert.deepEqual(requiredPublishScopes(course('normal', true)), ['preview', 'lesson']);
  assert.deepEqual(projectNamesForCourse(course('normal', true)), ['Game1_PREVIEW', 'Game1_LT']);
  assert.deepEqual(projectNamesForCourse(course('homework')), ['Game1_HW']);
  assert.deepEqual(projectNamesForCourse(course('sEvaluation')), ['Game1_HW']);
  assert.deepEqual(projectNamesForCourse(course('review')), ['Game1_REVIEW']);
});

test('预习与正课确认按各自工程指纹独立失效', () => {
  const state: CoursePublishState = {
    confirmations: {
      preview: {
        scope: 'preview', projectName: 'Game1_PREVIEW', directoryDigest: 'preview-v1',
        courseDigest: 'preview-course', previewedAt: '2026-08-04T00:00:00.000Z', confirmedAt: '2026-08-04T00:10:00.000Z', editorVersion: '1.4.0', environmentVersion: 'env-1',
      },
      lesson: {
        scope: 'lesson', projectName: 'Game1_LT', directoryDigest: 'lesson-v1',
        courseDigest: 'lesson-course', previewedAt: '2026-08-04T00:00:00.000Z', confirmedAt: '2026-08-04T00:10:00.000Z', editorVersion: '1.4.0', environmentVersion: 'env-1',
      },
    },
  };
  const result = getConfirmedScopes(course('normal', true), state, {
    Game1_PREVIEW: 'preview-v2',
    Game1_LT: 'lesson-v1',
  }, { preview: 'preview-course', lesson: 'lesson-course' }, '1.4.0', 'env-1');
  assert.deepEqual(result.valid, ['lesson']);
  assert.deepEqual(result.invalid, ['preview']);
});

test('SVN 父目录只接受相对业务路径并只追加一次课件名', () => {
  const result = normalizePublishParentPath(
    ' V9\\三年级//S8/第一讲/ ',
    'svn://192.168.74.9/product/trunk/course/Math/',
    's4_v9_02_YY',
  );
  assert.deepEqual(result, {
    ok: true,
    normalizedParentPath: 'V9/三年级/S8/第一讲',
    finalUrl: 'svn://192.168.74.9/product/trunk/course/Math/V9/三年级/S8/第一讲/s4_v9_02_YY',
  });
  assert.equal(normalizePublishParentPath('../S8', 'svn://server/base', 'lesson').ok, false);
  assert.equal(normalizePublishParentPath('svn://server/base/S8', 'svn://server/base', 'lesson').ok, false);
  assert.equal(normalizePublishParentPath('S8/lesson', 'svn://server/base', 'lesson').ok, false);
});

test('打包机 URL 始终把预习工程放在首位', () => {
  assert.deepEqual(orderProjectUrls(['Game1_LT', 'Game1_PREVIEW'], {
    Game1_LT: 'svn://server/course/Game1_LT',
    Game1_PREVIEW: 'svn://server/course/Game1_PREVIEW',
  }), ['svn://server/course/Game1_PREVIEW', 'svn://server/course/Game1_LT']);
});

test('发布状态只把当前阶段标为处理中并完成此前阶段', () => {
  const progress = movePublishProgress(initialPublishProgress(), 'notify', '正在发送请求');
  assert.deepEqual(progress.map((step) => step.state), ['complete', 'complete', 'complete', 'active', 'pending']);
  assert.equal(progress[3].detail, '正在发送请求');
});

test('身份文件使用稳定工程顺序并记录完整工程树指纹', () => {
  const manifest = createPublishManifest({
    course: course('normal', true),
    courseFolderName: 's4_v9_02_YY',
    editorVersion: '1.4.0',
    environmentVersion: 'env-1',
    contentDigest: 'content',
    projectTreeDigest: 'tree',
    projectDigests: {
      Game1_PREVIEW: 'preview', Game1_LT: 'lesson', Game1_HW: '', Game1_REVIEW: '',
    },
    generatedAt: '2026-08-04T00:00:00.000Z',
  });
  assert.deepEqual(manifest.projects, [
    { name: 'Game1_PREVIEW', digest: 'preview' },
    { name: 'Game1_LT', digest: 'lesson' },
  ]);
  assert.equal(manifest.projectTreeDigest, 'tree');
  assert.equal(manifest.environmentVersion, 'env-1');
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
});
