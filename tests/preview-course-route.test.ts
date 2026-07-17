import assert from 'node:assert/strict';
import test from 'node:test';
import { getCourseRouteCandidates } from '../src/utils/previewCourseRoute';

test('正课预览只查找自己的上传目录', () => {
  assert.deepEqual(
    getCourseRouteCandidates('/test_1_lesson_LessonZK/version_test_1_lesson.json'),
    {
      projectName: 'test_1_lesson_LessonZK',
      registryKeys: ['test_1_lesson'],
      fallbackProjectNames: ['test_1_lesson_LessonZK'],
      relativePath: 'version_test_1_lesson.json',
    },
  );
});

test('预习预览优先查完整标识，再复用对应正课上传目录', () => {
  assert.deepEqual(
    getCourseRouteCandidates('/test_1_lesson_preview_LessonZK/config_test_1_lesson_preview.json'),
    {
      projectName: 'test_1_lesson_preview_LessonZK',
      registryKeys: ['test_1_lesson_preview', 'test_1_lesson'],
      fallbackProjectNames: [
        'test_1_lesson_preview_LessonZK',
        'test_1_lesson_LessonZK',
      ],
      relativePath: 'config_test_1_lesson_preview.json',
    },
  );
});

test('GameLoader 缓存参数不会进入课件文件路径', () => {
  assert.equal(
    getCourseRouteCandidates(
      '/test_1_lesson_preview_LessonZK/version_test_1_lesson.json?t=1784275831837',
    )?.relativePath,
    'version_test_1_lesson.json',
  );
});

test('无教师 ID 的预习课程同样回退到正课共享目录', () => {
  assert.deepEqual(
    getCourseRouteCandidates('/lesson_preview_LessonZK/game_preview/image/bg.png')?.registryKeys,
    ['lesson_preview', 'lesson'],
  );
});

test('课程名中间包含 preview 时不误删普通名称', () => {
  assert.deepEqual(
    getCourseRouteCandidates('/lesson_preview_unit_LessonZK/config.json')?.registryKeys,
    ['lesson_preview_unit'],
  );
});

test('不支持的课件目录不会产生路由候选', () => {
  assert.equal(getCourseRouteCandidates('/unknown/course/config.json'), null);
  assert.equal(getCourseRouteCandidates('/lesson_LessonOTHER/config.json'), null);
});
