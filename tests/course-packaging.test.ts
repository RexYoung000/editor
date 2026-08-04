import assert from 'node:assert/strict';
import test from 'node:test';
import { createCoursePackagingPayload } from '../src/utils/websocket';

test('现有打包机请求保持 integrationRequest 和 devSVNPaths 契约', () => {
  const payload = createCoursePackagingPayload('course-1', [
    'svn://server/course/Game1_PREVIEW',
    'svn://server/course/Game1_LT',
  ], '10.0.0.1:7800') as { SIGN: string; DATA: string };
  assert.equal(payload.SIGN, 'integrationRequest');
  const data = JSON.parse(payload.DATA);
  assert.equal(data.host, '10.0.0.1:7800');
  assert.equal(data.data.courseSID, 'course-1');
  assert.deepEqual(data.data.devSVNPaths, [
    'svn://server/course/Game1_PREVIEW',
    'svn://server/course/Game1_LT',
  ]);
});
