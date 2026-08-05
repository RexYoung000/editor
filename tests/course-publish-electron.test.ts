import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type SvnResult = { stdout: string; stderr: string };
type SvnRunner = (args: string[], options?: Record<string, unknown>) => Promise<SvnResult>;
type Committer = (params: { commitPath: string; message: string }) => Promise<void>;
type InspectionResult = Record<string, unknown> & {
  identity: string;
  targetExists: boolean;
  revision: number;
  localFolder: { localTargetPath: string };
};
type PreparedPublish = Record<string, unknown> & {
  targetPath: string;
  inspection: Record<string, unknown>;
};

const publish = require(join(process.cwd(), 'electron/coursePublish.cjs')) as {
  CoursePublishError: new (code: string, message: string) => Error & { code: string };
  buildTarget: (base: string, parent: string, folder: string) => { finalUrl: string };
  cancelPreparedPublish: (prepared: Record<string, unknown>, runner: SvnRunner) => Promise<void>;
  commitPreparedPublish: (
    prepared: Record<string, unknown>,
    message: string,
    dependencies: { runner: SvnRunner; committer: Committer },
  ) => Promise<{
    revision: number;
    finalUrl: string;
    projectUrls: Record<string, string>;
    contentDigest: string;
  }>;
  configureSvnRuntime: (params: { isPackaged: boolean; platform: string; resourcesPath: string }) => {
    command: string;
    bundled: boolean;
  };
  hashDirectory: (root: string, options?: { excludedNames?: string[] }) => string;
  inspectPublishTarget: (params: Record<string, unknown>, runner: SvnRunner) => Promise<InspectionResult>;
  inspectSvnCapability: (
    runner: SvnRunner,
    tortoiseLocator: () => Promise<string | null>,
  ) => Promise<{ binaryPath: string; bundled: boolean; version: string; tortoisePath: string | null }>;
  mapLocalSvnTarget: (params: Record<string, unknown>) => {
    remainingSegments: string[];
    localTargetPath: string;
  };
  localPathRelation: (sourcePath: string, targetPath: string, platform?: string) => string;
  parseCommittedRevision: (xml: string) => number;
  parseSvnStatus: (value: string) => Array<{ code: string; path: string }>;
  preparePublish: (params: Record<string, unknown>, dependencies: { runner: SvnRunner }) => Promise<PreparedPublish>;
  runFile: (command: string, args: string[]) => Promise<SvnResult>;
};

function svnError(code: string, message: string): Error & { code: string } {
  return new publish.CoursePublishError(code, message);
}

function assertNoRemoteSvnCalls(calls: string[][]): void {
  const forbiddenCommands = new Set(['cat', 'list', 'update', 'cleanup', 'commit']);
  for (const args of calls) {
    assert.ok(!forbiddenCommands.has(args[0]), `不应执行远程型 SVN 命令：${args.join(' ')}`);
    assert.ok(!args.some((arg) => /^svn:\/\//i.test(arg)), `不应把 SVN URL 传给内置 CLI：${args.join(' ')}`);
  }
}

test('Electron 发布服务拒绝重复课件目录并生成唯一最终地址', () => {
  assert.equal(
    publish.buildTarget('svn://server/Math/', 'V9/S6', 's6_v9_02_YY').finalUrl,
    'svn://server/Math/V9/S6/s6_v9_02_YY',
  );
  assert.throws(() => publish.buildTarget('svn://server/Math', 'V9/课件 A', '课件 A'), /不能重复/);
  assert.throws(() => publish.buildTarget('svn://server/Math', '/absolute/path', '课件 A'), /只填写/);
  assert.throws(() => publish.buildTarget('svn://server/Math', 'C:\\course', '课件 A'), /只填写/);
});

test('目录指纹覆盖相对路径、空目录和文件内容，并忽略 SVN 元数据', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-publish-hash-'));
  try {
    await mkdir(join(root, 'Game1_LT', 'empty'), { recursive: true });
    await mkdir(join(root, '.svn'), { recursive: true });
    await writeFile(join(root, 'Game1_LT', 'config.json'), '{"v":1}');
    await writeFile(join(root, '.svn', 'wc.db'), 'metadata');
    const first = publish.hashDirectory(root);
    await writeFile(join(root, '.svn', 'wc.db'), 'changed metadata');
    assert.equal(publish.hashDirectory(root), first);
    await writeFile(join(root, 'Game1_LT', 'config.json'), '{"v":2}');
    assert.notEqual(publish.hashDirectory(root), first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SVN 状态和旧开发提交 revision 使用机器稳定格式解析', () => {
  assert.deepEqual(publish.parseSvnStatus('M       C:\\wc\\Game1_LT\\a.ts\n!       C:\\wc\\old.ts\n'), [
    { code: 'M', path: 'C:\\wc\\Game1_LT\\a.ts', line: 'M       C:\\wc\\Game1_LT\\a.ts' },
    { code: '!', path: 'C:\\wc\\old.ts', line: '!       C:\\wc\\old.ts' },
  ]);
  assert.equal(publish.parseCommittedRevision('<commit revision="4312"></commit>'), 4312);
});

test('E210007 认证机制错误优先于外层 E170013 网络错误', async () => {
  await assert.rejects(
    publish.runFile(process.execPath, ['-e', "process.stderr.write('svn: E170013: Unable to connect\\nsvn: E210007: Cannot negotiate authentication mechanism'); process.exit(1)"]),
    (error: unknown) => (error as { code?: string }).code === 'SVN_AUTH_MECHANISM_UNSUPPORTED',
  );
});

test('E155007 普通目录被识别为无效本地 SVN 文件夹', async () => {
  await assert.rejects(
    publish.runFile(process.execPath, ['-e', "process.stderr.write('svn: E155007: is not a working copy'); process.exit(1)"]),
    (error: unknown) => (error as { code?: string }).code === 'LOCAL_SVN_FOLDER_INVALID',
  );
});

test('正式 Windows 客户端同时检查内置 CLI 和 TortoiseSVN', async () => {
  const runtime = publish.configureSvnRuntime({ isPackaged: true, platform: 'win32', resourcesPath: '/app/resources' });
  assert.equal(runtime.bundled, true);
  assert.equal(runtime.command, join('/app/resources', 'svn-cli', 'bin', 'svn.exe'));
  const capability = await publish.inspectSvnCapability(
    async (args) => {
      assert.deepEqual(args, ['--version', '--quiet']);
      return { stdout: '1.14.5\n', stderr: '' };
    },
    async () => 'D:\\SoftWare\\SVN\\bin\\TortoiseProc.exe',
  );
  assert.equal(capability.tortoisePath, 'D:\\SoftWare\\SVN\\bin\\TortoiseProc.exe');
  await assert.rejects(
    publish.inspectSvnCapability(async () => ({ stdout: '1.14.5\n', stderr: '' }), async () => null),
    (error: unknown) => (error as { code?: string }).code === 'TORTOISE_NOT_FOUND',
  );
  publish.configureSvnRuntime({ isPackaged: false, platform: process.platform, resourcesPath: '' });
});

test('本地 SVN 文件夹按真实 URL 只映射尚未覆盖的剩余路径', () => {
  const aboveBase = publish.mapLocalSvnTarget({
    localPath: 'D:\\SVN\\course',
    localUrl: 'svn://server/product/trunk/course',
    repositoryRootUrl: 'svn://server/product',
    baseUrl: 'svn://server/product/trunk/course/Math',
    finalUrl: 'svn://server/product/trunk/course/Math/V9/S6/s6_v9_02_YY',
  });
  assert.deepEqual(aboveBase.remainingSegments, ['Math', 'V9', 'S6', 's6_v9_02_YY']);

  const belowBase = publish.mapLocalSvnTarget({
    localPath: 'D:\\SVN\\Math\\V9',
    localUrl: 'svn://server/product/trunk/course/Math/V9',
    repositoryRootUrl: 'svn://server/product',
    baseUrl: 'svn://server/product/trunk/course/Math',
    finalUrl: 'svn://server/product/trunk/course/Math/V9/S6/s6_v9_02_YY',
  });
  assert.deepEqual(belowBase.remainingSegments, ['S6', 's6_v9_02_YY']);

  assert.throws(() => publish.mapLocalSvnTarget({
    localPath: 'D:\\SVN\\S8',
    localUrl: 'svn://server/product/trunk/course/Math/V9/S8',
    repositoryRootUrl: 'svn://server/product',
    baseUrl: 'svn://server/product/trunk/course/Math',
    finalUrl: 'svn://server/product/trunk/course/Math/V9/S6/s6_v9_02_YY',
  }), (error: unknown) => (error as { code?: string }).code === 'LOCAL_SVN_FOLDER_MISMATCH');

  assert.throws(() => publish.mapLocalSvnTarget({
    localPath: 'D:\\SVN\\Math',
    localUrl: 'svn://other/product/trunk/course/Math',
    repositoryRootUrl: 'svn://other/product',
    baseUrl: 'svn://server/product/trunk/course/Math',
    finalUrl: 'svn://server/product/trunk/course/Math/V9/S6/s6_v9_02_YY',
  }), (error: unknown) => (error as { code?: string }).code === 'LOCAL_SVN_REPOSITORY_MISMATCH');
});

test('目标检查只读取本地工作副本并识别现有课件身份和 revision', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'forge-inspect-local-'));
  const targetPath = join(workspace, 'V9', 'S6', 'course');
  const calls: string[][] = [];
  try {
    await mkdir(join(workspace, '.svn'));
    await mkdir(join(targetPath, 'Game1_LT'), { recursive: true });
    await writeFile(join(targetPath, 'forge-publish.json'), JSON.stringify({
      courseId: 'course', courseKind: 'normal', courseFolderName: 'course', projects: [{ name: 'Game1_LT' }],
    }));
    const runner: SvnRunner = async (args) => {
      calls.push(args);
      const item = args[2];
      const localPath = args[3];
      if (item === 'url' && localPath === workspace) return { stdout: 'svn://server/base\n', stderr: '' };
      if (item === 'repos-root-url') return { stdout: 'svn://server\n', stderr: '' };
      if (item === 'kind' && localPath === targetPath) return { stdout: 'dir\n', stderr: '' };
      if (item === 'url' && localPath === targetPath) return { stdout: 'svn://server/base/V9/S6/course\n', stderr: '' };
      if (item === 'last-changed-revision') return { stdout: '4312\n', stderr: '' };
      throw svnError('SVN_COMMAND_FAILED', `unexpected: ${args.join(' ')}`);
    };
    const inspection = await publish.inspectPublishTarget({
      courseId: 'course', courseKind: 'normal', courseFolderName: 'course',
      baseUrl: 'svn://server/base', parentPath: 'V9/S6', projectNames: ['Game1_LT'], workspacePath: workspace,
    }, runner);
    assert.equal(inspection.identity, 'matching');
    assert.equal(inspection.targetExists, true);
    assert.equal(inspection.revision, 4312);
    assert.equal(inspection.localFolder.localTargetPath, targetPath);
    assertNoRemoteSvnCalls(calls);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('课件目录等于最终 SVN 目录时识别为原地首次发布', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-publish-in-place-inspect-'));
  const courseDir = join(root, 'V9', 'S6', 'course');
  try {
    await mkdir(join(root, '.svn'));
    await mkdir(join(courseDir, 'images'), { recursive: true });
    await mkdir(join(courseDir, 'project', 'course', 'Game1_LT'), { recursive: true });
    await writeFile(join(courseDir, 'course.json'), '{"id":"course","stages":[]}');
    const runner: SvnRunner = async (args) => {
      const item = args[2];
      const localPath = args[3];
      if (args[0] === 'info' && item === 'url' && localPath === root) return { stdout: 'svn://server/base\n', stderr: '' };
      if (args[0] === 'info' && item === 'repos-root-url' && localPath === root) return { stdout: 'svn://server\n', stderr: '' };
      if (args[0] === 'info' && item === 'kind' && localPath === courseDir) return { stdout: 'dir\n', stderr: '' };
      if (args[0] === 'info' && item === 'url' && localPath === courseDir) return { stdout: 'svn://server/base/V9/S6/course\n', stderr: '' };
      if (args[0] === 'info' && item === 'last-changed-revision') return { stdout: '12\n', stderr: '' };
      throw svnError('SVN_COMMAND_FAILED', `unexpected: ${args.join(' ')}`);
    };
    const inspection = await publish.inspectPublishTarget({
      courseId: 'course', courseKind: 'normal', courseFolderName: 'course',
      baseUrl: 'svn://server/base', parentPath: 'V9/S6', projectNames: ['Game1_LT'],
      workspacePath: root, sourceCourseDir: courseDir,
    }, runner);
    assert.equal(inspection.transferMode, 'in-place');
    assert.equal(inspection.identity, 'new');
    assert.equal(inspection.publishExists, false);
    assert.equal(inspection.localFolder.localTargetPath, courseDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('课件目录与最终 SVN 目录互相嵌套时拒绝发布', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-publish-overlap-'));
  const courseDir = join(root, 'V9', 'S6', 'course', 'source');
  try {
    await mkdir(courseDir, { recursive: true });
    await mkdir(join(root, '.svn'));
    const runner: SvnRunner = async (args) => {
      const item = args[2];
      const localPath = args[3];
      if (args[0] === 'info' && item === 'url' && localPath === root) return { stdout: 'svn://server/base\n', stderr: '' };
      if (args[0] === 'info' && item === 'repos-root-url' && localPath === root) return { stdout: 'svn://server\n', stderr: '' };
      throw svnError('SVN_COMMAND_FAILED', `unexpected: ${args.join(' ')}`);
    };
    await assert.rejects(
      publish.inspectPublishTarget({
        courseId: 'course', courseKind: 'normal', courseFolderName: 'course',
        baseUrl: 'svn://server/base', parentPath: 'V9/S6', projectNames: ['Game1_LT'],
        workspacePath: root, sourceCourseDir: courseDir,
      }, runner),
      (error: unknown) => (error as { code?: string }).code === 'SOURCE_TARGET_OVERLAP',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('准备首次发布只创建本地待提交内容，取消后恢复且全程不访问远程 SVN', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-prepare-local-'));
  const workspace = join(root, 'workspace');
  const sourceRoot = join(root, 'source');
  const calls: string[][] = [];
  try {
    await mkdir(join(workspace, '.svn'), { recursive: true });
    await writeFile(join(workspace, 'unrelated.txt'), 'keep');
    await mkdir(join(sourceRoot, 'Game1_LT'), { recursive: true });
    await writeFile(join(sourceRoot, 'Game1_LT', 'config.json'), '{"lesson":1}');
    const runner: SvnRunner = async (args) => {
      calls.push(args);
      if (args[0] === 'info' && args[2] === 'url' && args[3] === workspace) return { stdout: 'svn://server/base\n', stderr: '' };
      if (args[0] === 'info' && args[2] === 'repos-root-url') return { stdout: 'svn://server\n', stderr: '' };
      return { stdout: '', stderr: '' };
    };
    const prepared = await publish.preparePublish({
      courseId: 'course', courseKind: 'normal', courseFolderName: 'course',
      baseUrl: 'svn://server/base', parentPath: 'V9/S6', projectNames: ['Game1_LT'],
      editorVersion: '1.4.0', environmentVersion: 'env-1', contentDigest: 'content',
      sourceRoot, workspacePath: workspace, workspaceKind: 'existing', generatedAt: '2026-08-05T00:00:00.000Z',
    }, { runner });
    assert.equal(await readFile(join(prepared.targetPath, 'Game1_LT', 'config.json'), 'utf8'), '{"lesson":1}');
    assert.equal(JSON.parse(await readFile(join(prepared.targetPath, 'forge-publish.json'), 'utf8')).courseId, 'course');
    assertNoRemoteSvnCalls(calls);
    await publish.cancelPreparedPublish(prepared, runner);
    assert.equal(await readFile(join(workspace, 'unrelated.txt'), 'utf8'), 'keep');
    await assert.rejects(access(join(workspace, 'V9')));
    assertNoRemoteSvnCalls(calls);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('原地发布只同步发布文件并保留课件源文件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-prepare-in-place-'));
  const courseDir = join(root, 'V9', 'S6', 'course');
  const sourceRoot = join(courseDir, 'project', 'course');
  const calls: string[][] = [];
  let statusCount = 0;
  let cancelled = false;
  try {
    await mkdir(join(root, '.svn'), { recursive: true });
    await mkdir(join(courseDir, 'images'), { recursive: true });
    await mkdir(join(sourceRoot, 'Game1_LT'), { recursive: true });
    await writeFile(join(courseDir, 'course.json'), '{"id":"course","stages":[]}');
    await writeFile(join(courseDir, 'images', 'source.png'), 'source');
    await writeFile(join(sourceRoot, 'Game1_LT', 'config.json'), '{"lesson":1}');
    const runner: SvnRunner = async (args) => {
      calls.push(args);
      const item = args[2];
      const localPath = args[3];
      if (args[0] === 'info' && item === 'url' && localPath === root) return { stdout: 'svn://server/base\n', stderr: '' };
      if (args[0] === 'info' && item === 'repos-root-url' && localPath === root) return { stdout: 'svn://server\n', stderr: '' };
      if (args[0] === 'info' && item === 'kind' && localPath === courseDir) return { stdout: 'dir\n', stderr: '' };
      if (args[0] === 'info' && item === 'url' && localPath === courseDir) return { stdout: 'svn://server/base/V9/S6/course\n', stderr: '' };
      if (args[0] === 'info' && item === 'last-changed-revision') return { stdout: '12\n', stderr: '' };
      if (args[0] === 'revert') {
        cancelled = true;
        await rm(args[2], { recursive: true, force: true });
        return { stdout: '', stderr: '' };
      }
      if (args[0] === 'status') {
        statusCount += 1;
        const sourceChanges = `M       ${join(courseDir, 'course.json')}\n?       ${join(courseDir, 'images', 'source.png')}\n`;
        if (cancelled) return { stdout: sourceChanges, stderr: '' };
        if (statusCount === 1) return { stdout: sourceChanges, stderr: '' };
        return { stdout: `${sourceChanges}A       ${join(courseDir, 'forge-publish.json')}\nA       ${join(courseDir, 'Game1_LT')}\n`, stderr: '' };
      }
      return { stdout: '', stderr: '' };
    };
    const prepared = await publish.preparePublish({
      courseId: 'course', courseKind: 'normal', courseFolderName: 'course',
      baseUrl: 'svn://server/base', parentPath: 'V9/S6', projectNames: ['Game1_LT'],
      sourceRoot, sourceCourseDir: courseDir, workspacePath: root, workspaceKind: 'existing',
      editorVersion: '1.4.1', environmentVersion: 'env-1', contentDigest: 'content',
    }, { runner });
    assert.equal(prepared.inspection.transferMode, 'in-place');
    assert.equal(prepared.inspection.publishExists, false);
    assert.deepEqual(prepared.changes.map((entry) => entry.path), [
      join(courseDir, 'forge-publish.json'),
      join(courseDir, 'Game1_LT'),
    ]);
    assert.equal(await readFile(join(courseDir, 'course.json'), 'utf8'), '{"id":"course","stages":[]}');
    assert.equal(await readFile(join(courseDir, 'images', 'source.png'), 'utf8'), 'source');
    assert.equal(await readFile(join(courseDir, 'Game1_LT', 'config.json'), 'utf8'), '{"lesson":1}');
    assertNoRemoteSvnCalls(calls);
    await publish.cancelPreparedPublish(prepared, runner);
    await assert.rejects(access(join(courseDir, 'Game1_LT')));
    await assert.rejects(access(join(courseDir, 'forge-publish.json')));
    assert.equal(await readFile(join(courseDir, 'course.json'), 'utf8'), '{"id":"course","stages":[]}');
    assert.equal(await readFile(join(courseDir, 'images', 'source.png'), 'utf8'), 'source');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createPreparedCommitFixture() {
  const root = await mkdtemp(join(tmpdir(), 'forge-commit-local-'));
  const workspacePath = join(root, 'workspace');
  const targetPath = join(workspacePath, 'V9', 'S6', 'course');
  const manifest = {
    schemaVersion: 1,
    courseId: 'course',
    courseKind: 'normal',
    courseFolderName: 'course',
    contentDigest: 'content',
    projects: [{ name: 'Game1_LT', digest: 'digest' }],
  };
  await mkdir(join(targetPath, 'Game1_LT'), { recursive: true });
  await writeFile(join(targetPath, 'forge-publish.json'), JSON.stringify(manifest));
  return {
    root,
    prepared: {
      workspacePath,
      targetPath,
      inspection: { finalUrl: 'svn://server/base/V9/S6/course' },
      manifest,
    },
  };
}

test('TortoiseSVN 取消或漏提文件时保持在提交阶段且不产出打包机参数', async () => {
  const { root, prepared } = await createPreparedCommitFixture();
  let opened = false;
  try {
    await assert.rejects(
      publish.commitPreparedPublish(prepared, '发布课件', {
        committer: async () => { opened = true; },
        runner: async (args) => args[0] === 'status'
          ? { stdout: `M       ${join(prepared.targetPath, 'forge-publish.json')}\n`, stderr: '' }
          : { stdout: '', stderr: '' },
      }),
      (error: unknown) => (error as { code?: string }).code === 'TORTOISE_COMMIT_INCOMPLETE',
    );
    assert.equal(opened, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('提交成功后从本地身份文件和工程目录读取实际 revision 与 URL', async () => {
  const { root, prepared } = await createPreparedCommitFixture();
  const calls: string[][] = [];
  let commitPath = '';
  try {
    const result = await publish.commitPreparedPublish(prepared, '发布课件', {
      committer: async (params) => { commitPath = params.commitPath; },
      runner: async (args) => {
        calls.push(args);
        if (args[0] === 'status') return { stdout: '', stderr: '' };
        const item = args[2];
        const localPath = args[3];
        if (item === 'url' && localPath === prepared.targetPath) return { stdout: 'svn://server/base/V9/S6/course\n', stderr: '' };
        if (item === 'last-changed-revision') return { stdout: '4312\n', stderr: '' };
        if (item === 'url' && localPath === join(prepared.targetPath, 'Game1_LT')) {
          return { stdout: 'svn://server/base/V9/S6/course/Game1_LT\n', stderr: '' };
        }
        throw svnError('SVN_COMMAND_FAILED', `unexpected: ${args.join(' ')}`);
      },
    });
    assert.equal(commitPath, prepared.targetPath);
    assert.equal(result.revision, 4312);
    assert.equal(result.finalUrl, 'svn://server/base/V9/S6/course');
    assert.equal(result.projectUrls.Game1_LT, 'svn://server/base/V9/S6/course/Game1_LT');
    assert.equal(result.contentDigest, 'content');
    assertNoRemoteSvnCalls(calls);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('原地提交后忽略课件源文件修改，只核验发布文件范围', async () => {
  const { root, prepared } = await createPreparedCommitFixture();
  const sourcePath = join(prepared.targetPath, 'course.json');
  let receivedCommitPaths: string[] = [];
  try {
    await writeFile(sourcePath, '{"id":"course","stages":[]}');
    const result = await publish.commitPreparedPublish({
      ...prepared,
      inspection: { ...prepared.inspection, transferMode: 'in-place' },
      rootNeedsCommit: false,
      commitPaths: [join(prepared.targetPath, 'forge-publish.json'), join(prepared.targetPath, 'Game1_LT')],
    }, '发布课件', {
      committer: async (params) => { receivedCommitPaths = params.commitPaths; },
      runner: async (args) => {
        if (args[0] === 'status') return { stdout: `M       ${sourcePath}\n`, stderr: '' };
        const item = args[2];
        const localPath = args[3];
        if (item === 'url' && localPath === prepared.targetPath) return { stdout: 'svn://server/base/V9/S6/course\n', stderr: '' };
        if (item === 'last-changed-revision') return { stdout: '4312\n', stderr: '' };
        if (item === 'url' && localPath === join(prepared.targetPath, 'Game1_LT')) {
          return { stdout: 'svn://server/base/V9/S6/course/Game1_LT\n', stderr: '' };
        }
        throw svnError('SVN_COMMAND_FAILED', `unexpected: ${args.join(' ')}`);
      },
    });
    assert.deepEqual(receivedCommitPaths, [join(prepared.targetPath, 'forge-publish.json'), join(prepared.targetPath, 'Game1_LT')]);
    assert.equal(result.revision, 4312);
    assert.equal(result.projectUrls.Game1_LT, 'svn://server/base/V9/S6/course/Game1_LT');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('提交后身份文件与本次发布不一致时不通知打包机', async () => {
  const { root, prepared } = await createPreparedCommitFixture();
  try {
    await writeFile(join(prepared.targetPath, 'forge-publish.json'), JSON.stringify({
      ...prepared.manifest,
      courseId: 'other-course',
    }));
    await assert.rejects(
      publish.commitPreparedPublish(prepared, '发布课件', {
        committer: async () => {},
        runner: async () => ({ stdout: '', stderr: '' }),
      }),
      (error: unknown) => (error as { code?: string }).code === 'COMMITTED_IDENTITY_MISMATCH',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
