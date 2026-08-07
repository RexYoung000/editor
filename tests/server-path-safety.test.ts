import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolvePathInside } from '../server/pathSafety';

const previewRoot = path.resolve('/tmp/forge-security/preview-server');
const lessonsRoot = path.join(previewRoot, 'lessons');
const thumbnailRoot = path.resolve('/tmp/forge-security/public/builtin/editor');

test('预览读取、课件上传和缩略图写入保留正常嵌套路径', () => {
  assert.equal(
    resolvePathInside(previewRoot, 'share/config/system.json'),
    path.join(previewRoot, 'share/config/system.json'),
  );
  assert.equal(
    resolvePathInside(lessonsRoot, 'test_teacher_course_LessonZK'),
    path.join(lessonsRoot, 'test_teacher_course_LessonZK'),
  );
  assert.equal(
    resolvePathInside(lessonsRoot, 'course_LessonZK/game/image/bg.png'),
    path.join(lessonsRoot, 'course_LessonZK/game/image/bg.png'),
  );
  assert.equal(
    resolvePathInside(thumbnailRoot, 'question-layout-blue.png'),
    path.join(thumbnailRoot, 'question-layout-blue.png'),
  );
});

test('读写接口拒绝父目录跳转及其编码和反斜杠变体', () => {
  for (const unsafePath of [
    '../secret.txt',
    'share/../../secret.txt',
    'share/../config.json',
    '..\\secret.txt',
    'share\\..\\..\\secret.txt',
    'share\\..\\config.json',
  ]) {
    assert.equal(resolvePathInside(previewRoot, unsafePath), null, unsafePath);
  }
  for (const unsafePath of [
    '%2e%2e%2fsecret.txt',
    'share%2f%2e%2e%2fconfig.json',
    '%2E%2E%5Csecret.txt',
  ]) {
    assert.equal(resolvePathInside(previewRoot, unsafePath, { decodeUrl: true }), null, unsafePath);
  }
});

test('读写接口拒绝 POSIX、Windows、UNC 绝对路径与空字节', () => {
  for (const unsafePath of [
    '/etc/passwd',
    'C:\\Windows\\system.ini',
    'C:Windows\\system.ini',
    '\\\\server\\share\\secret.txt',
    'safe/file.txt\0.png',
  ]) {
    assert.equal(resolvePathInside(previewRoot, unsafePath), null, unsafePath);
  }
  assert.equal(
    resolvePathInside(previewRoot, 'safe/file.txt%00.png', { decodeUrl: true }),
    null,
  );
});

test('读写接口拒绝非法编码且不会被相似根目录前缀绕过', () => {
  assert.equal(resolvePathInside(previewRoot, '%E0%A4%A', { decodeUrl: true }), null);
  assert.equal(resolvePathInside(previewRoot, '../preview-server-backup/secret.txt'), null);
});

test('课件标识、ZIP 条目、资源目标和缩略图名称使用同一目录边界', () => {
  const lessonDir = resolvePathInside(lessonsRoot, 'test_teacher_course_LessonZK');
  assert.ok(lessonDir);

  assert.equal(resolvePathInside(lessonsRoot, 'test_teacher_/../../outside'), null);
  assert.equal(resolvePathInside(lessonDir, 'game/../../../outside.js'), null);
  assert.equal(resolvePathInside(lessonDir, 'images\\..\\..\\outside.png'), null);
  assert.equal(resolvePathInside(thumbnailRoot, '../../outside.png'), null);
});

test('multipart 与 ZIP 文件名保留合法百分号，URL 路径按编码解码', () => {
  assert.equal(
    resolvePathInside(lessonsRoot, 'course_LessonZK/images/100%完成.png'),
    path.join(lessonsRoot, 'course_LessonZK/images/100%完成.png'),
  );
  assert.equal(
    resolvePathInside(previewRoot, 'share%2fconfig%2fsystem.json', { decodeUrl: true }),
    path.join(previewRoot, 'share/config/system.json'),
  );
});
