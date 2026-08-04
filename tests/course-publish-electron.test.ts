import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const publish = require(join(process.cwd(), 'electron/coursePublish.cjs')) as {
  CoursePublishError: new (code: string, message: string) => Error & { code: string };
  cancelPreparedPublish: (prepared: Record<string, unknown>, runner: SvnRunner) => Promise<void>;
  commitPreparedPublish: (prepared: Record<string, unknown>, message: string, runner: SvnRunner) => Promise<Record<string, unknown>>;
  configureSvnRuntime: (params: { isPackaged: boolean; platform: string; resourcesPath: string }) => { command: string; bundled: boolean };
  ensureWorkspace: (params: Record<string, unknown>, inspection: Record<string, unknown>, runner: SvnRunner) => Promise<Record<string, unknown>>;
  preparePublish: (params: Record<string, unknown>, dependencies: { runner: SvnRunner }) => Promise<Record<string, unknown>>;
  buildTarget: (base: string, parent: string, folder: string) => { finalUrl: string };
  hashDirectory: (root: string, options?: { excludedNames?: string[] }) => string;
  inspectPublishTarget: (params: Record<string, unknown>, runner: SvnRunner) => Promise<Record<string, unknown>>;
  inspectSvnCapability: (runner: SvnRunner) => Promise<{ binaryPath: string; bundled: boolean; version: string }>;
  mapLocalSvnTarget: (params: Record<string, unknown>) => {
    remainingSegments: string[];
    localTargetPath: string;
  };
  parseCommittedRevision: (xml: string) => number;
  parseSvnStatus: (value: string) => Array<{ code: string; path: string }>;
};

type SvnRunner = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

function svnFailure(message: string): Error & { code: string } {
  return new publish.CoursePublishError('SVN_COMMAND_FAILED', message);
}

function svnPathNotFound(): Error & { code: string } {
  return new publish.CoursePublishError('SVN_PATH_NOT_FOUND', 'not found');
}

test('Electron 发布服务拒绝重复课件目录并生成唯一最终地址', () => {
  assert.equal(
    publish.buildTarget('svn://server/Math/', 'V9/S6', 's6_v9_02_YY').finalUrl,
    'svn://server/Math/V9/S6/s6_v9_02_YY',
  );
  assert.throws(() => publish.buildTarget('svn://server/Math', 'V9/课件 A', '课件 A'), /不能重复/);
  assert.throws(() => publish.buildTarget('svn://server/Math', '/absolute/path', '课件 A'), /只填写/);
  assert.throws(() => publish.buildTarget('svn://server/Math', 'C:\\course', '课件 A'), /只填写/);
  assert.throws(() => publish.buildTarget('svn://server/Math', 'svn://other/path', '课件 A'), /只填写/);
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

test('工程树指纹可排除身份文件以检测后续人工修改', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-publish-manifest-'));
  try {
    await writeFile(join(root, 'Game1_LT.txt'), 'course');
    const tree = publish.hashDirectory(root, { excludedNames: ['forge-publish.json'] });
    await writeFile(join(root, 'forge-publish.json'), '{"schemaVersion":1}');
    assert.equal(publish.hashDirectory(root, { excludedNames: ['forge-publish.json'] }), tree);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SVN 状态和 commit revision 使用机器稳定格式解析', () => {
  assert.deepEqual(publish.parseSvnStatus('M       C:\\wc\\Game1_LT\\a.ts\n!       C:\\wc\\old.ts\n'), [
    { code: 'M', path: 'C:\\wc\\Game1_LT\\a.ts', line: 'M       C:\\wc\\Game1_LT\\a.ts' },
    { code: '!', path: 'C:\\wc\\old.ts', line: '!       C:\\wc\\old.ts' },
  ]);
  assert.equal(publish.parseCommittedRevision('<?xml version="1.0"?><commit revision="4312"></commit>'), 4312);
});

test('首次发布连同缺失父目录一次提交，已有目标只提交当前课件目录', async () => {
  const calls: string[][] = [];
  const runner: SvnRunner = async (args) => {
    calls.push(args);
    if (args[0] === 'commit') return { stdout: '<commit revision="4312"></commit>', stderr: '' };
    return { stdout: '', stderr: '' };
  };
  const common = {
    targetPath: '/wc/V9/S6/course',
    workspacePath: '/wc',
    inspection: { finalUrl: 'svn://server/base/V9/S6/course' },
    manifest: { contentDigest: 'content', projects: [{ name: 'Game1_LT' }] },
  };
  await publish.commitPreparedPublish({ ...common, createdRootPath: '/wc/S6' }, '首次发布', runner);
  assert.equal(calls.find((args) => args[0] === 'commit')?.at(-1), '/wc/S6');
  calls.length = 0;
  await publish.commitPreparedPublish(common, '更新课件', runner);
  assert.equal(calls.find((args) => args[0] === 'commit')?.at(-1), '/wc/V9/S6/course');
});

test('正式 Windows 客户端固定调用安装资源内的 SVN CLI', async () => {
  const runtime = publish.configureSvnRuntime({ isPackaged: true, platform: 'win32', resourcesPath: '/app/resources' });
  assert.equal(runtime.bundled, true);
  assert.equal(runtime.command, join('/app/resources', 'svn-cli', 'bin', 'svn.exe'));
  const capability = await publish.inspectSvnCapability(async (args) => {
    assert.deepEqual(args, ['--version', '--quiet']);
    return { stdout: '1.14.5\n', stderr: '' };
  });
  assert.deepEqual(capability, { binaryPath: runtime.command, bundled: true, version: '1.14.5' });
  publish.configureSvnRuntime({ isPackaged: false, platform: process.platform, resourcesPath: '' });
});

test('选择非 SVN 的已有目录时拒绝使用且不删除老师文件', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'forge-existing-workspace-'));
  try {
    await writeFile(join(workspace, 'keep.txt'), 'teacher file');
    await assert.rejects(
      publish.ensureWorkspace(
        { workspacePath: workspace, workspaceKind: 'existing' },
        { baseUrl: 'svn://server/base', finalUrl: 'svn://server/base/V9/course', nearestExistingUrl: 'svn://server/base' },
        async () => { throw svnFailure('not a working copy'); },
      ),
      (error: unknown) => (error as { code?: string }).code === 'LOCAL_SVN_FOLDER_INVALID',
    );
    assert.equal(await readFile(join(workspace, 'keep.txt'), 'utf8'), 'teacher file');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('SVN 登录或网络错误不会被误判为待创建目录', async () => {
  const authError = new publish.CoursePublishError('SVN_AUTH_REQUIRED', 'SVN 登录已失效');
  const workspace = await mkdtemp(join(tmpdir(), 'forge-auth-workspace-'));
  try {
    await assert.rejects(
      publish.inspectPublishTarget({
        courseId: 'course',
        courseKind: 'normal',
        baseUrl: 'svn://server/base',
        parentPath: 'V9',
        courseFolderName: 'course',
        projectNames: ['Game1_LT'],
        workspacePath: workspace,
      }, async () => { throw authError; }),
      (error: unknown) => (error as { code?: string }).code === 'SVN_AUTH_REQUIRED',
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
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
  assert.ok(!belowBase.localTargetPath.includes(`${join('Math', 'V9')}${join('Math', 'V9')}`));

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

test('取消首次发布只清理本次新增目录链并保留已有工作副本内容', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'forge-cancel-workspace-'));
  const calls: string[][] = [];
  try {
    await mkdir(join(workspace, '.svn'));
    await writeFile(join(workspace, 'unrelated.txt'), 'keep');
    const runner: SvnRunner = async (args) => {
      calls.push(args);
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'url') {
        return { stdout: 'svn://server/base\n', stderr: '' };
      }
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'repos-root-url') {
        return { stdout: 'svn://server\n', stderr: '' };
      }
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'kind') {
        throw svnPathNotFound();
      }
      return { stdout: '', stderr: '' };
    };
    const inspection = {
      baseUrl: 'svn://server/base',
      finalUrl: 'svn://server/base/V9/course',
      nearestExistingUrl: 'svn://server/base',
      targetExists: false,
    };
    const prepared = await publish.ensureWorkspace(
      { workspacePath: workspace, workspaceKind: 'existing' },
      inspection,
      runner,
    );
    await publish.cancelPreparedPublish({ ...prepared, inspection }, runner);
    assert.equal(await readFile(join(workspace, 'unrelated.txt'), 'utf8'), 'keep');
    await assert.rejects(access(join(workspace, 'V9')));
    assert.ok(calls.some((args) => args[0] === 'revert' && args.at(-1) === join(workspace, 'V9')));
    assert.ok(!calls.some((args) => args[0] === 'revert' && args.at(-1) === workspace));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('准备阶段失败后自动恢复本次新增目录并保持工作副本干净边界', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-prepare-restore-'));
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
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'url') {
        return { stdout: 'svn://server/base\n', stderr: '' };
      }
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'repos-root-url') {
        return { stdout: 'svn://server\n', stderr: '' };
      }
      if (args[0] === 'info' && args[1] === '--show-item' && args[2] === 'kind') {
        const url = args[3];
        if (url === 'svn://server/base') return { stdout: 'dir\n', stderr: '' };
        throw svnPathNotFound();
      }
      if (args[0] === 'add' && args[1] === '--force') throw svnFailure('simulated add failure');
      return { stdout: '', stderr: '' };
    };
    await assert.rejects(
      publish.preparePublish({
        courseId: 'course',
        courseKind: 'normal',
        courseFolderName: 'course',
        baseUrl: 'svn://server/base',
        parentPath: 'V9',
        projectNames: ['Game1_LT'],
        editorVersion: '1.4.0',
        environmentVersion: 'env-1',
        contentDigest: 'content',
        sourceRoot,
        workspacePath: workspace,
        workspaceKind: 'existing',
      }, { runner }),
      /simulated add failure/,
    );
    assert.equal(await readFile(join(workspace, 'unrelated.txt'), 'utf8'), 'keep');
    await assert.rejects(access(join(workspace, 'V9')));
    assert.ok(!calls.some((args) => args[0] === 'revert' && args.at(-1) === workspace));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
