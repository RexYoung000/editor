import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  getPathRelation,
  inspectCourseSaveTarget,
  recoverPendingSaveAs,
  saveCourseAsTransaction,
  transactionPaths,
} = require(join(process.cwd(), 'electron/courseSaveAs.cjs'));

async function makeCourse(directory: string, id: string, marker: string): Promise<void> {
  await mkdir(join(directory, 'images'), { recursive: true });
  await writeFile(join(directory, `${id}.json`), JSON.stringify({
    id,
    kind: 'normal',
    stages: [],
    marker,
  }), 'utf8');
  await writeFile(join(directory, 'images', 'asset.txt'), marker, 'utf8');
}

async function readCourseMarker(directory: string, id: string): Promise<string> {
  const course = JSON.parse(await readFile(join(directory, `${id}.json`), 'utf8'));
  return course.marker;
}

async function withTempRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'forge-save-as-'));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('规范化路径关系阻止同路径和双向嵌套，Windows 比较忽略大小写', () => {
  assert.equal(getPathRelation('/courses/A', '/courses/A'), 'same');
  assert.equal(getPathRelation('/courses/A', '/courses/A/B'), 'target-inside-source');
  assert.equal(getPathRelation('/courses/A/B', '/courses/A'), 'source-inside-target');
  assert.equal(getPathRelation('/courses/A', '/backup/A'), 'separate');
  assert.equal(getPathRelation('/Courses/A', '/courses/a', 'win32'), 'same');
});

test('目标检查区分可用目录、有效同名课件、普通非空目录和危险路径', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetParent = join(root, 'target');
    await makeCourse(sourceDir, 'A', 'source');
    await mkdir(targetParent, { recursive: true });

    let inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: targetParent, targetCourseId: 'A' });
    assert.equal(inspection.state, 'available');

    await makeCourse(join(targetParent, 'A'), 'A', 'target');
    inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: targetParent, targetCourseId: 'A' });
    assert.equal(inspection.state, 'replaceable');

    await mkdir(join(targetParent, 'B'), { recursive: true });
    await writeFile(join(targetParent, 'B', 'notes.txt'), 'not a course', 'utf8');
    inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: targetParent, targetCourseId: 'B' });
    assert.equal(inspection.state, 'invalid');

    inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: join(root, 'source'), targetCourseId: 'A' });
    assert.equal(inspection.state, 'current');
    inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: sourceDir, targetCourseId: 'B' });
    assert.equal(inspection.state, 'target-inside-source');
  });
});

test('目标课件名是符号链接时不跟随到所选父目录之外', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetParent = join(root, 'target');
    const externalTarget = join(root, 'external-course');
    await makeCourse(sourceDir, 'A', 'source');
    await makeCourse(externalTarget, 'A', 'external');
    await mkdir(targetParent, { recursive: true });
    await symlink(externalTarget, join(targetParent, 'A'));

    const inspection = await inspectCourseSaveTarget({ sourceDir, parentPath: targetParent, targetCourseId: 'A' });
    assert.equal(inspection.state, 'invalid');
    assert.equal(await readCourseMarker(externalTarget, 'A'), 'external');
  });
});

test('同 ID 可以另存到其他路径并排除生成产物与源版本管理信息', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetParent = join(root, 'target');
    await makeCourse(sourceDir, 'A', 'source');
    await mkdir(join(sourceDir, 'project', 'A'), { recursive: true });
    await mkdir(join(sourceDir, 'esBuild'), { recursive: true });
    await mkdir(join(sourceDir, '.svn'), { recursive: true });
    await mkdir(join(sourceDir, '.git'), { recursive: true });
    await writeFile(join(sourceDir, 'project', 'A', 'old.txt'), 'generated', 'utf8');
    await writeFile(join(sourceDir, '.svn', 'wc.db'), 'source-svn', 'utf8');
    await mkdir(targetParent, { recursive: true });

    const result = await saveCourseAsTransaction({
      sourceDir,
      sourceCourseId: 'A',
      targetCourseId: 'A',
      parentPath: targetParent,
      courseJson: JSON.stringify({ id: 'A', kind: 'normal', stages: [], marker: 'saved' }),
      overwrite: false,
    });

    assert.equal(result.targetDir, await realpath(join(targetParent, 'A')));
    assert.equal(await readCourseMarker(result.targetDir, 'A'), 'saved');
    assert.equal(await readFile(join(result.targetDir, 'images', 'asset.txt'), 'utf8'), 'source');
    assert.equal(await readCourseMarker(sourceDir, 'A'), 'source');
    assert.deepEqual((await readdir(result.targetDir)).sort(), ['A.json', 'images']);
  });
});

test('新 ID 另存会重命名课程 JSON 且不留下旧课程文件', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetParent = join(root, 'target');
    await makeCourse(sourceDir, 'A', 'source');
    await mkdir(targetParent, { recursive: true });

    const result = await saveCourseAsTransaction({
      sourceDir,
      sourceCourseId: 'A',
      targetCourseId: 'B',
      parentPath: targetParent,
      courseJson: JSON.stringify({ id: 'B', kind: 'normal', stages: [], marker: 'copy' }),
      overwrite: false,
    });

    assert.equal(await readCourseMarker(result.targetDir, 'B'), 'copy');
    assert.deepEqual((await readdir(result.targetDir)).sort(), ['B.json', 'images']);
  });
});

test('确认替换会移除目标旧内容并保留目标自己的版本管理信息', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetDir = join(root, 'target', 'A');
    await makeCourse(sourceDir, 'A', 'source');
    await makeCourse(targetDir, 'A', 'old-target');
    await writeFile(join(targetDir, 'stale.txt'), 'stale', 'utf8');
    await mkdir(join(targetDir, '.svn'), { recursive: true });
    await writeFile(join(targetDir, '.svn', 'wc.db'), 'target-svn', 'utf8');
    await writeFile(join(targetDir, '.git'), 'gitdir: ../target-git', 'utf8');

    await assert.rejects(
      saveCourseAsTransaction({
        sourceDir,
        sourceCourseId: 'A',
        targetCourseId: 'A',
        parentPath: join(root, 'target'),
        courseJson: JSON.stringify({ id: 'A', kind: 'normal', stages: [], marker: 'new-target' }),
        overwrite: false,
      }),
      (error: { code?: string }) => error.code === 'TARGET_REQUIRES_CONFIRMATION',
    );

    const result = await saveCourseAsTransaction({
      sourceDir,
      sourceCourseId: 'A',
      targetCourseId: 'A',
      parentPath: join(root, 'target'),
      courseJson: JSON.stringify({ id: 'A', kind: 'normal', stages: [], marker: 'new-target' }),
      overwrite: true,
    });

    assert.equal(await readCourseMarker(result.targetDir, 'A'), 'new-target');
    assert.equal(await readFile(join(result.targetDir, '.svn', 'wc.db'), 'utf8'), 'target-svn');
    assert.equal(await readFile(join(result.targetDir, '.git'), 'utf8'), 'gitdir: ../target-git');
    await assert.rejects(stat(join(result.targetDir, 'stale.txt')), { code: 'ENOENT' });
  });
});

test('非课件目录不会因确认参数而被覆盖', async () => {
  await withTempRoot(async (root) => {
    const sourceDir = join(root, 'source', 'A');
    const targetDir = join(root, 'target', 'A');
    await makeCourse(sourceDir, 'A', 'source');
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'personal.txt'), 'keep', 'utf8');

    await assert.rejects(
      saveCourseAsTransaction({
        sourceDir,
        sourceCourseId: 'A',
        targetCourseId: 'A',
        parentPath: join(root, 'target'),
        courseJson: JSON.stringify({ id: 'A', kind: 'normal', stages: [], marker: 'copy' }),
        overwrite: true,
      }),
      (error: { code?: string }) => error.code === 'TARGET_INVALID',
    );
    assert.equal(await readFile(join(targetDir, 'personal.txt'), 'utf8'), 'keep');
  });
});

test('中断发生在目标备份后时恢复原课件，中断发生在激活后时完成新课件', async () => {
  await withTempRoot(async (root) => {
    const parentDir = join(root, 'target');
    const targetDir = join(parentDir, 'A');
    await mkdir(parentDir, { recursive: true });

    const rolledBackPaths = transactionPaths(parentDir, 'A', 'rollback');
    await makeCourse(rolledBackPaths.backupDir, 'A', 'original');
    await makeCourse(rolledBackPaths.tempDir, 'A', 'prepared');
    await writeFile(rolledBackPaths.markerPath, JSON.stringify({
      version: 1,
      targetCourseId: 'A',
      targetDir,
      tempDir: rolledBackPaths.tempDir,
      backupDir: rolledBackPaths.backupDir,
      targetExisted: true,
    }), 'utf8');

    let recovery = await recoverPendingSaveAs({ parentDir, targetDir, targetCourseId: 'A' });
    assert.equal(recovery.outcome, 'rolled-back');
    assert.equal(await readCourseMarker(targetDir, 'A'), 'original');

    await rm(targetDir, { recursive: true, force: true });
    const committedPaths = transactionPaths(parentDir, 'A', 'commit');
    await makeCourse(committedPaths.backupDir, 'A', 'old');
    await makeCourse(targetDir, 'A', 'new');
    await writeFile(committedPaths.markerPath, JSON.stringify({
      version: 1,
      targetCourseId: 'A',
      targetDir,
      tempDir: committedPaths.tempDir,
      backupDir: committedPaths.backupDir,
      targetExisted: true,
    }), 'utf8');

    recovery = await recoverPendingSaveAs({ parentDir, targetDir, targetCourseId: 'A' });
    assert.equal(recovery.outcome, 'committed');
    assert.equal(await readCourseMarker(targetDir, 'A'), 'new');
    await assert.rejects(stat(committedPaths.backupDir), { code: 'ENOENT' });
  });
});
