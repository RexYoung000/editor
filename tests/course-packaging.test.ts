import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

test('Windows 安装资源携带锁定版本的完整 SVN CLI 与许可证', async () => {
  const vendorRoot = join(process.cwd(), 'electron/vendor/svn-cli/windows-x64');
  const [svnExecutable, runtimeDll, subversionLicense, sourceNote, packageJson] = await Promise.all([
    readFile(join(vendorRoot, 'bin/svn.exe')),
    readFile(join(vendorRoot, 'bin/libsvn_client-1.dll')),
    readFile(join(vendorRoot, 'Licenses/Subversion License.txt')),
    readFile(join(vendorRoot, 'SOURCE.md'), 'utf8'),
    readFile(join(process.cwd(), 'package.json'), 'utf8'),
  ]);
  assert.equal(createHash('sha256').update(svnExecutable).digest('hex'), '514bbd1a03109aba979b9ecb7fad46a43e3f29da6741adb827d36cabf0690b6d');
  assert.ok(runtimeDll.length > 0);
  assert.match(subversionLicense.toString('utf8'), /Apache License/);
  assert.match(sourceNote, /Apache-Subversion-1\.14\.5-4\.zip/);
  assert.match(packageJson, /electron\/vendor\/svn-cli\/windows-x64/);
  assert.match(packageJson, /"to": "svn-cli"/);
});
