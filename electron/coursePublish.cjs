const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const MANIFEST_FILE = 'forge-publish.json';
const PROJECT_NAMES = new Set(['Game1_LT', 'Game1_PREVIEW', 'Game1_HW', 'Game1_REVIEW']);
const MANAGED_PUBLISH_NAMES = new Set([MANIFEST_FILE, ...PROJECT_NAMES]);
let svnRuntime = {
  command: process.env.FORGE_SVN_BINARY || 'svn',
  bundled: false,
  platform: process.platform,
  isPackaged: false,
};

class CoursePublishError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'CoursePublishError';
    this.code = code;
    this.details = details;
  }
}

function runFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: options.timeout ?? 120000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        const commandOutput = String(stderr || stdout || error.message).trim();
        let code = 'SVN_COMMAND_FAILED';
        let message = commandOutput;
        if (error.code === 'ENOENT') {
          code = 'SVN_NOT_FOUND';
          message = svnRuntime.bundled
            ? '客户端内置的 SVN 发布组件缺失或损坏，请重新安装当前版本或联系维护人员'
            : '开发环境未找到 SVN 命令行工具，请安装 SVN CLI 或通过 FORGE_SVN_BINARY 指定路径';
        } else if (/(?:E155007|not a working copy|不是工作副本)/i.test(commandOutput)) {
          code = 'LOCAL_SVN_FOLDER_INVALID';
          message = '所选目录不是已通过公司 SVN 客户端拉取的本地 SVN 文件夹，请重新选择';
        } else if (/(?:E210007|cannot negotiate authentication mechanism)/i.test(commandOutput)) {
          code = 'SVN_AUTH_MECHANISM_UNSUPPORTED';
          message = '当前 SVN 工具不支持公司服务器的认证方式，请使用公司 TortoiseSVN 完成提交';
        } else if (/(?:E175013|access.*forbidden|permission denied|没有权限|权限不足)/i.test(commandOutput)) {
          code = 'SVN_PERMISSION_DENIED';
          message = '当前账号没有该 SVN 目录的访问或提交权限';
        } else if (/(?:E170001|E215004|authentication failed|authorization failed|认证失败|授权失败)/i.test(commandOutput)) {
          code = 'SVN_AUTH_REQUIRED';
          message = 'SVN 登录已失效，请先通过公司现有 SVN 客户端重新登录';
        } else if (/(?:E170013|could not connect|connection refused|timed out|host not found|无法连接|连接超时)/i.test(commandOutput)) {
          code = 'SVN_UNREACHABLE';
          message = '无法连接 SVN 服务器，请检查公司网络后重试';
        } else if (/(?:does not exist|non-existent|not found|不存在|找不到)/i.test(commandOutput)) {
          code = 'SVN_PATH_NOT_FOUND';
        }
        const wrapped = new CoursePublishError(
          code,
          message,
          { command, args, exitCode: error.code },
        );
        reject(wrapped);
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function runSvn(args, options = {}) {
  return runFile(svnRuntime.command, ['--non-interactive', ...args], options);
}

function configureSvnRuntime({ isPackaged, platform, resourcesPath }) {
  if (isPackaged && platform === 'win32') {
    svnRuntime = { command: path.join(resourcesPath, 'svn-cli', 'bin', 'svn.exe'), bundled: true, platform, isPackaged };
  } else if (process.env.FORGE_SVN_BINARY) {
    svnRuntime = { command: process.env.FORGE_SVN_BINARY, bundled: false, platform, isPackaged };
  } else {
    svnRuntime = { command: 'svn', bundled: false, platform, isPackaged };
  }
  return { ...svnRuntime };
}

function hashText(value) {
  if (typeof value !== 'string') {
    throw new CoursePublishError('INVALID_HASH_TEXT', '课件内容摘要只能处理文本');
  }
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function runRawFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: options.timeout ?? 30000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        error.commandOutput = String(stderr || stdout || error.message).trim();
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

function existingTortoiseCandidate(value) {
  if (!value) return null;
  const candidate = path.resolve(String(value).replace(/^"|"$/g, ''));
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
}

async function findTortoiseProc() {
  if (svnRuntime.platform !== 'win32') return null;
  const env = process.env;
  const candidates = [env.FORGE_TORTOISE_PROC];
  const pathEntries = String(env.PATH || env.Path || '').split(';').filter(Boolean);
  candidates.push(...pathEntries.map((entry) => path.join(entry.replace(/^"|"$/g, ''), 'TortoiseProc.exe')));
  for (const root of [env.ProgramW6432, env.ProgramFiles, env['ProgramFiles(x86)']]) {
    if (root) candidates.push(path.join(root, 'TortoiseSVN', 'bin', 'TortoiseProc.exe'));
  }
  for (const candidate of candidates) {
    const existing = existingTortoiseCandidate(candidate);
    if (existing) return existing;
  }

  const registryKeys = [
    'HKLM\\SOFTWARE\\TortoiseSVN',
    'HKLM\\SOFTWARE\\WOW6432Node\\TortoiseSVN',
    'HKCU\\SOFTWARE\\TortoiseSVN',
  ];
  for (const key of registryKeys) {
    try {
      const { stdout } = await runRawFile('reg.exe', ['query', key, '/v', 'Directory']);
      const match = stdout.match(/Directory\s+REG_\w+\s+([^\r\n]+)/i);
      if (!match) continue;
      const directory = match[1].trim();
      for (const candidate of [path.join(directory, 'TortoiseProc.exe'), path.join(directory, 'bin', 'TortoiseProc.exe')]) {
        const existing = existingTortoiseCandidate(candidate);
        if (existing) return existing;
      }
    } catch {
      // 注册表位置因安装方式不同可能不存在，继续检查其他位置。
    }
  }
  return null;
}

async function inspectSvnCapability(runner = runSvn, tortoiseLocator = findTortoiseProc) {
  const { stdout } = await runner(['--version', '--quiet']);
  const tortoisePath = await tortoiseLocator();
  if (svnRuntime.platform === 'win32' && !tortoisePath) {
    throw new CoursePublishError(
      'TORTOISE_NOT_FOUND',
      '未找到公司 TortoiseSVN 客户端，请先安装或修复后再发布',
    );
  }
  return {
    binaryPath: svnRuntime.command,
    bundled: svnRuntime.bundled,
    version: stdout.trim(),
    tortoisePath,
  };
}

function normalizeSvnUrl(value) {
  const normalized = String(value ?? '').trim().replace(/\/+$/g, '');
  if (!/^svn:\/\/[\w.:-]+(?:\/[^\0]*)?$/i.test(normalized)) {
    throw new CoursePublishError('INVALID_SVN_URL', '当前课型没有有效的 SVN 基础地址');
  }
  return normalized;
}

function normalizeRelativePath(value) {
  const raw = String(value ?? '').trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) || /^[a-z]:/i.test(raw) || raw.startsWith('/') || raw.startsWith('\\')) {
    throw new CoursePublishError('INVALID_PARENT_PATH', '这里只填写基础地址之后的业务父目录');
  }
  const normalized = raw.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
  const segments = normalized.split('/').map((segment) => segment.trim());
  if (!normalized || segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\0'))) {
    throw new CoursePublishError('INVALID_PARENT_PATH', '业务父目录包含无效路径段');
  }
  return segments.join('/');
}

function validateFolderName(value) {
  const folderName = String(value ?? '').trim();
  if (!folderName || folderName === '.' || folderName === '..' || /[\\/\0]/.test(folderName)) {
    throw new CoursePublishError('INVALID_COURSE_FOLDER', '当前课件文件夹名称无效');
  }
  return folderName;
}

function buildTarget(baseUrl, parentPath, courseFolderName) {
  const base = normalizeSvnUrl(baseUrl);
  const parent = normalizeRelativePath(parentPath);
  const folder = validateFolderName(courseFolderName);
  if (parent.split('/').at(-1)?.toLocaleLowerCase() === folder.toLocaleLowerCase()) {
    throw new CoursePublishError('DUPLICATE_COURSE_FOLDER', '父目录末尾不能重复填写当前课件名称');
  }
  const encodedFolder = encodeURIComponent(folder);
  return {
    baseUrl: base,
    parentPath: parent,
    courseFolderName: folder,
    parentUrl: `${base}/${parent}`,
    finalUrl: `${base}/${parent}/${encodedFolder}`,
  };
}

function readLocalManifest(targetPath) {
  const manifestPath = path.join(targetPath, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    throw new CoursePublishError('MANIFEST_INVALID', '本地发布身份文件无法读取，已阻止覆盖');
  }
}

function listLocalProjects(targetPath) {
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) return [];
  return fs.readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && PROJECT_NAMES.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function comparableLocalPath(inputPath, platform = svnRuntime.platform) {
  let resolved = path.resolve(String(inputPath ?? ''));
  try {
    resolved = fs.realpathSync.native?.(resolved) ?? fs.realpathSync(resolved);
  } catch {
    // 尚未创建的目标继续使用规范化绝对路径比较。
  }
  const normalized = path.normalize(resolved).replace(/[\\/]+$/, '');
  return platform === 'win32' ? normalized.toLocaleLowerCase() : normalized;
}

function localPathRelation(sourcePath, targetPath, platform = svnRuntime.platform) {
  const source = comparableLocalPath(sourcePath, platform);
  const target = comparableLocalPath(targetPath, platform);
  if (source === target) return 'same';
  const targetFromSource = path.relative(source, target);
  if (targetFromSource && !targetFromSource.startsWith('..') && !path.isAbsolute(targetFromSource)) return 'target-inside-source';
  const sourceFromTarget = path.relative(target, source);
  if (sourceFromTarget && !sourceFromTarget.startsWith('..') && !path.isAbsolute(sourceFromTarget)) return 'source-inside-target';
  return 'separate';
}

async function localInfoItem(item, localPath, runner = runSvn, optional = false) {
  try {
    const { stdout } = await runner(['info', '--show-item', item, localPath]);
    return stdout.trim();
  } catch (error) {
    if (optional && error instanceof CoursePublishError
      && ['SVN_COMMAND_FAILED', 'SVN_PATH_NOT_FOUND', 'LOCAL_SVN_FOLDER_INVALID'].includes(error.code)) return null;
    throw error;
  }
}

function appendUrlSegments(baseUrl, segments) {
  if (segments.length === 0) return baseUrl;
  return `${baseUrl}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

async function inspectPublishTarget(params, runner = runSvn) {
  const target = buildTarget(params.baseUrl, params.parentPath, params.courseFolderName);
  const localFolder = await inspectLocalSvnFolder({
    localPath: params.workspacePath,
    baseUrl: target.baseUrl,
    finalUrl: target.finalUrl,
  }, runner);
  const parentSegments = localFolder.remainingSegments.slice(0, -1);
  const sourceTargetRelation = params.sourceCourseDir
    ? localPathRelation(params.sourceCourseDir, localFolder.localTargetPath)
    : 'separate';
  if (sourceTargetRelation !== 'same' && sourceTargetRelation !== 'separate') {
    throw new CoursePublishError(
      'SOURCE_TARGET_OVERLAP',
      '当前课件目录与最终发布目录互相包含但不完全相同，请调整业务父目录或本地 SVN 文件夹',
      { sourceCourseDir: params.sourceCourseDir, localTargetPath: localFolder.localTargetPath },
    );
  }
  const transferMode = sourceTargetRelation === 'same' ? 'in-place' : 'copy';
  let existingParentCount = 0;
  let currentPath = localFolder.localPath;
  for (const segment of parentSegments) {
    currentPath = path.join(currentPath, segment);
    if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isDirectory()) break;
    existingParentCount += 1;
  }

  const targetExists = fs.existsSync(localFolder.localTargetPath);
  if (targetExists && !fs.statSync(localFolder.localTargetPath).isDirectory()) {
    throw new CoursePublishError('LOCAL_SVN_TARGET_INVALID', '本地发布位置已存在同名文件，不能创建课件目录');
  }
  const targetKind = targetExists
    ? await localInfoItem('kind', localFolder.localTargetPath, runner, true)
    : null;
  const targetVersioned = targetKind === 'dir';
  if (targetVersioned) {
    const actualTargetUrl = normalizeSvnUrl(await localInfoItem('url', localFolder.localTargetPath, runner));
    if (actualTargetUrl !== normalizeSvnUrl(target.finalUrl)) {
      throw new CoursePublishError(
        'LOCAL_SVN_TARGET_SWITCHED',
        `本地课件目录实际对应 ${actualTargetUrl}，与计划发布地址 ${target.finalUrl} 不一致`,
      );
    }
  }

  const manifest = targetExists ? readLocalManifest(localFolder.localTargetPath) : null;
  const existingProjects = targetExists ? listLocalProjects(localFolder.localTargetPath) : [];
  const revisionText = targetVersioned
    ? await localInfoItem('last-changed-revision', path.join(localFolder.localTargetPath, manifest ? MANIFEST_FILE : ''), runner, true)
    : null;
  const revision = Number.parseInt(revisionText || '', 10) || 0;
  const publishExists = Boolean(manifest || existingProjects.length > 0);
  let identity = 'new';
  if (transferMode === 'in-place' && targetExists && !publishExists) {
    identity = 'new';
  } else if (targetExists && !targetVersioned) {
    identity = 'conflict';
  } else if (targetExists && manifest) {
    identity = manifest.courseId === params.courseId
      && manifest.courseKind === params.courseKind
      && manifest.courseFolderName === target.courseFolderName
      ? 'matching'
      : 'conflict';
  } else if (targetExists) {
    const expected = new Set(params.projectNames);
    const compatible = existingProjects.length > 0 && existingProjects.every((name) => expected.has(name));
    identity = compatible ? 'historical' : 'conflict';
  }
  return {
    ...target,
    targetExists,
    publishExists,
    targetVersioned,
    transferMode,
    parentExists: existingParentCount === parentSegments.length,
    nearestExistingUrl: appendUrlSegments(localFolder.localUrl, parentSegments.slice(0, existingParentCount)),
    missingParentSegments: parentSegments.slice(existingParentCount),
    identity,
    manifest,
    existingProjects,
    revision,
    localFolder,
  };
}

function walkFiles(rootPath, relativePath = '', entries = []) {
  if (!fs.existsSync(rootPath)) return entries;
  const dirEntries = fs.readdirSync(rootPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const entry of dirEntries) {
    if (entry.name === '.svn') continue;
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childPath = path.join(rootPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new CoursePublishError('SYMLINK_NOT_ALLOWED', `发布工程包含符号链接：${childRelative}`);
    }
    if (entry.isDirectory()) {
      entries.push({ kind: 'dir', relativePath: childRelative });
      walkFiles(childPath, childRelative, entries);
    } else if (entry.isFile()) {
      entries.push({ kind: 'file', relativePath: childRelative, filePath: childPath });
    }
  }
  return entries;
}

function hashDirectory(rootPath, options = {}) {
  const excludedNames = new Set(options.excludedNames ?? []);
  const hash = crypto.createHash('sha256');
  for (const entry of walkFiles(rootPath)) {
    if (excludedNames.has(entry.relativePath) || excludedNames.has(path.basename(entry.relativePath))) continue;
    hash.update(entry.kind);
    hash.update('\0');
    hash.update(entry.relativePath.replace(/\\/g, '/'));
    hash.update('\0');
    if (entry.kind === 'file') hash.update(fs.readFileSync(entry.filePath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function hashPublishProjects(rootPath, projectNames) {
  const hash = crypto.createHash('sha256');
  const entries = [];
  for (const projectName of [...projectNames].sort()) {
    const projectPath = path.join(rootPath, projectName);
    if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) continue;
    entries.push({ kind: 'dir', relativePath: projectName });
    walkFiles(projectPath, projectName, entries);
  }
  for (const entry of entries) {
    hash.update(entry.kind);
    hash.update('\0');
    hash.update(entry.relativePath.replace(/\\/g, '/'));
    hash.update('\0');
    if (entry.kind === 'file') hash.update(fs.readFileSync(entry.filePath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function assertProjects(sourceRoot, projectNames) {
  const actual = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && PROJECT_NAMES.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  const expected = [...projectNames].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new CoursePublishError('PROJECT_LIST_MISMATCH', `生成工程不完整：应为 ${expected.join('、')}，实际为 ${actual.join('、') || '无'}`);
  }
}

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isSymbolicLink()) throw new CoursePublishError('SYMLINK_NOT_ALLOWED', `发布工程包含符号链接：${entry.name}`);
    if (entry.isDirectory()) copyTree(sourcePath, targetPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, targetPath);
  }
}

function clearPublishTarget(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.name === '.svn') continue;
    fs.rmSync(path.join(targetPath, entry.name), { recursive: true, force: true });
  }
}

function clearManagedPublishTarget(targetPath) {
  for (const entryName of MANAGED_PUBLISH_NAMES) {
    fs.rmSync(path.join(targetPath, entryName), { recursive: true, force: true });
  }
}

function parseSvnStatus(stdout) {
  return String(stdout).split(/\r?\n/).filter(Boolean).map((line) => ({
    code: line[0],
    path: line.slice(8).trim(),
    line,
  }));
}

function managedStatusEntries(stdout, targetPath, includeRoot = false) {
  const root = path.resolve(targetPath);
  return parseSvnStatus(stdout).filter((entry) => {
    const absolute = path.resolve(entry.path);
    const relative = path.relative(root, absolute);
    if (!relative) return includeRoot;
    if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
    return MANAGED_PUBLISH_NAMES.has(relative.split(path.sep)[0]);
  });
}

function managedCommitPaths(targetPath, changes, includeRoot = false) {
  if (includeRoot) return [targetPath];
  const paths = new Set();
  const root = path.resolve(targetPath);
  for (const entry of changes) {
    const relative = path.relative(root, path.resolve(entry.path));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) continue;
    const topLevel = relative.split(path.sep)[0];
    if (MANAGED_PUBLISH_NAMES.has(topLevel)) paths.add(path.join(targetPath, topLevel));
  }
  return [...paths].sort();
}

async function markSvnChanges(targetPath, runner = runSvn) {
  await runner(['add', '--parents', '--force', targetPath]);
  const { stdout } = await runner(['status', targetPath]);
  for (const entry of parseSvnStatus(stdout)) {
    if (entry.code === '!' && entry.path) await runner(['delete', '--force', entry.path]);
  }
  const finalStatus = await runner(['status', targetPath]);
  const unversioned = parseSvnStatus(finalStatus.stdout).filter((entry) => entry.code === '?');
  if (unversioned.length > 0) {
    throw new CoursePublishError('UNVERSIONED_FILES', '待提交工程仍有未纳管文件，已停止发布', unversioned.map((entry) => entry.path));
  }
  return parseSvnStatus(finalStatus.stdout);
}

async function markManagedSvnChanges(targetPath, projectNames, runner = runSvn, rootNeedsCommit = false) {
  if (rootNeedsCommit) await runner(['add', '--depth', 'empty', targetPath]);
  for (const entryName of [MANIFEST_FILE, ...projectNames]) {
    await runner(['add', '--parents', '--force', path.join(targetPath, entryName)]);
  }
  const status = await runner(['status', targetPath]);
  for (const entry of managedStatusEntries(status.stdout, targetPath, rootNeedsCommit)) {
    if (entry.code === '!' && entry.path) await runner(['delete', '--force', entry.path]);
  }
  const finalStatus = await runner(['status', targetPath]);
  const changes = managedStatusEntries(finalStatus.stdout, targetPath, rootNeedsCommit);
  const unversioned = changes.filter((entry) => entry.code === '?');
  if (unversioned.length > 0) {
    throw new CoursePublishError('UNVERSIONED_FILES', '待提交工程仍有未纳管文件，已停止发布', unversioned.map((entry) => entry.path));
  }
  return changes;
}

function relativeUrlSegments(ancestorUrl, targetUrl) {
  const ancestor = normalizeSvnUrl(ancestorUrl);
  const target = normalizeSvnUrl(targetUrl);
  if (target !== ancestor && !target.startsWith(`${ancestor}/`)) {
    throw new CoursePublishError('LOCAL_SVN_FOLDER_MISMATCH', '所选本地 SVN 文件夹不覆盖最终课件地址，请选择其上级目录或对应目录');
  }
  return target.slice(ancestor.length).replace(/^\//, '').split('/').filter(Boolean).map((segment) => {
    const decoded = decodeURIComponent(segment);
    if (!decoded || decoded === '.' || decoded === '..' || /[\\/\0]/.test(decoded)) {
      throw new CoursePublishError('INVALID_SVN_PATH_SEGMENT', 'SVN 目标地址包含无法安全映射到本地的目录名称');
    }
    return decoded;
  });
}

async function workspaceUrl(workspacePath, runner = runSvn) {
  try {
    const { stdout } = await runner(['info', '--show-item', 'url', workspacePath]);
    return normalizeSvnUrl(stdout.trim());
  } catch (error) {
    if (error instanceof CoursePublishError && error.code === 'SVN_COMMAND_FAILED') {
      throw new CoursePublishError('LOCAL_SVN_FOLDER_INVALID', '所选目录不是已拉取的本地 SVN 文件夹，请重新选择');
    }
    throw error;
  }
}

function mapLocalSvnTarget(params) {
  const localUrl = normalizeSvnUrl(params.localUrl);
  const repositoryRootUrl = normalizeSvnUrl(params.repositoryRootUrl);
  const baseUrl = normalizeSvnUrl(params.baseUrl);
  const finalUrl = normalizeSvnUrl(params.finalUrl);
  if (baseUrl !== repositoryRootUrl && !baseUrl.startsWith(`${repositoryRootUrl}/`)) {
    throw new CoursePublishError(
      'LOCAL_SVN_REPOSITORY_MISMATCH',
      `所选目录属于 ${repositoryRootUrl}，与当前课型基础地址 ${baseUrl} 不是同一个 SVN 仓库`,
    );
  }
  if (finalUrl !== localUrl && !finalUrl.startsWith(`${localUrl}/`)) {
    throw new CoursePublishError(
      'LOCAL_SVN_FOLDER_MISMATCH',
      `所选目录对应 ${localUrl}，不能覆盖最终地址 ${finalUrl}；请选择最终地址的上级目录或对应目录`,
    );
  }
  const remainingSegments = relativeUrlSegments(localUrl, finalUrl);
  return {
    localUrl,
    repositoryRootUrl,
    remainingSegments,
    localTargetPath: path.join(params.localPath, ...remainingSegments),
  };
}

async function inspectLocalSvnFolder(params, runner = runSvn) {
  const localPath = path.resolve(String(params.localPath ?? ''));
  if (!params.localPath || !fs.existsSync(localPath) || !fs.statSync(localPath).isDirectory()) {
    throw new CoursePublishError('LOCAL_SVN_FOLDER_MISSING', '请选择一个已经拉取到电脑上的本地 SVN 文件夹');
  }
  const localUrl = await workspaceUrl(localPath, runner);
  const { stdout: repositoryRoot } = await runner(['info', '--show-item', 'repos-root-url', localPath]);
  return {
    localPath,
    ...mapLocalSvnTarget({
      localPath,
      localUrl,
      repositoryRootUrl: repositoryRoot.trim(),
      baseUrl: params.baseUrl,
      finalUrl: params.finalUrl,
    }),
  };
}

async function ensureWorkspace(params, inspection, runner = runSvn) {
  const workspacePath = params.workspacePath;
  if (!workspacePath) {
    throw new CoursePublishError('LOCAL_SVN_FOLDER_MISSING', '请选择一个已经拉取到电脑上的本地 SVN 文件夹');
  }
  const mapping = await inspectLocalSvnFolder({
    localPath: workspacePath,
    baseUrl: inspection.baseUrl,
    finalUrl: inspection.finalUrl,
  }, runner);
  if (inspection.transferMode === 'in-place') {
    const status = await runner(['status', mapping.localTargetPath]);
    const managedChanges = managedStatusEntries(status.stdout, mapping.localTargetPath);
    if (managedChanges.length > 0) {
      throw new CoursePublishError(
        'LOCAL_SVN_FOLDER_HAS_CHANGES',
        '当前课件的发布文件有尚未提交的本地修改，请先通过公司 SVN 客户端处理后重试',
        managedChanges.map((entry) => entry.path),
      );
    }
    return {
      workspacePath,
      targetPath: mapping.localTargetPath,
      createdRootPath: null,
      rootNeedsCommit: !inspection.targetVersioned,
    };
  }
  const initialSegments = mapping.remainingSegments;
  let deepestExistingPath = workspacePath;
  for (const segment of initialSegments) {
    const candidate = path.join(deepestExistingPath, segment);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) break;
    deepestExistingPath = candidate;
  }
  const targetAlreadyExists = fs.existsSync(mapping.localTargetPath);
  const statusPath = targetAlreadyExists ? mapping.localTargetPath : deepestExistingPath;
  const status = await runner(['status', '--depth', targetAlreadyExists ? 'infinity' : 'empty', statusPath]);
  if (status.stdout.trim()) {
    throw new CoursePublishError('LOCAL_SVN_FOLDER_HAS_CHANGES', '当前课件目标有尚未提交的本地修改，请先通过公司 SVN 客户端处理后重试');
  }

  let currentPath = workspacePath;
  let createdRootPath = null;
  try {
    for (const segment of initialSegments) {
      currentPath = path.join(currentPath, segment);
      if (!fs.existsSync(currentPath)) {
        if (!createdRootPath) createdRootPath = currentPath;
        fs.mkdirSync(currentPath);
      }
    }
    if (createdRootPath) await runner(['add', '--parents', currentPath]);
  } catch (error) {
    if (createdRootPath) {
      try {
        await runner(['revert', '--recursive', createdRootPath]);
      } catch {
        // 本地新增路径可能尚未完整进入 SVN，随后仍按创建边界清理。
      }
      fs.rmSync(createdRootPath, { recursive: true, force: true });
    }
    throw error;
  }
  return { workspacePath, targetPath: currentPath, createdRootPath, rootNeedsCommit: false };
}

async function restorePreparedTarget(prepared, runner = runSvn) {
  if (prepared.inspection.transferMode === 'in-place') {
    if (prepared.rootNeedsCommit) {
      try {
        await runner(['revert', '--recursive', prepared.targetPath]);
      } catch {
        // 新增课件目录尚未形成完整 SVN 节点时继续清理受管发布文件。
      }
      clearManagedPublishTarget(prepared.targetPath);
      const remaining = await runner(['status', prepared.targetPath]);
      if (managedStatusEntries(remaining.stdout, prepared.targetPath).length > 0) {
        throw new CoursePublishError('LOCAL_RESTORE_INCOMPLETE', '取消准备后未能完整恢复本地发布文件，请先通过公司 SVN 客户端处理');
      }
      return;
    } else {
      for (const entryName of MANAGED_PUBLISH_NAMES) {
        try {
          await runner(['revert', '--recursive', path.join(prepared.targetPath, entryName)]);
        } catch {
          // 未纳管或本次未出现的发布文件不需要恢复。
        }
      }
    }
    const { stdout } = await runner(['status', prepared.targetPath]);
    for (const entry of managedStatusEntries(stdout, prepared.targetPath)) {
      if (entry.code === '?' && entry.path) fs.rmSync(entry.path, { recursive: true, force: true });
    }
    const remaining = await runner(['status', prepared.targetPath]);
    if (managedStatusEntries(remaining.stdout, prepared.targetPath).length > 0) {
      throw new CoursePublishError('LOCAL_RESTORE_INCOMPLETE', '取消准备后未能完整恢复本地发布文件，请先通过公司 SVN 客户端处理');
    }
    return;
  }
  const restorePath = prepared.createdRootPath ?? prepared.targetPath;
  try {
    await runner(['revert', '--recursive', restorePath]);
  } catch {
    // 首次发布目录尚未形成可回滚节点时，直接清理本地新增目录。
  }
  if (!prepared.inspection.targetExists) {
    fs.rmSync(restorePath, { recursive: true, force: true });
    return;
  }
  const { stdout } = await runner(['status', prepared.targetPath]);
  for (const entry of parseSvnStatus(stdout)) {
    if (entry.code === '?' && entry.path) fs.rmSync(entry.path, { recursive: true, force: true });
  }
  const remaining = await runner(['status', prepared.targetPath]);
  if (remaining.stdout.trim()) {
    throw new CoursePublishError('LOCAL_RESTORE_INCOMPLETE', '取消准备后未能完整恢复本地 SVN 文件夹，请先通过公司 SVN 客户端处理');
  }
}

function validateExistingIdentity(inspection, params) {
  if (inspection.identity === 'conflict') {
    throw new CoursePublishError('IDENTITY_CONFLICT', 'SVN 中的同名目录不属于当前课件，已阻止覆盖');
  }
  if (inspection.identity === 'historical' && !params.adoptHistorical) {
    throw new CoursePublishError('HISTORICAL_CONFIRMATION_REQUIRED', '该目录没有 forge 发布身份，需要先确认这是同一课件');
  }
}

async function preparePublish(params, dependencies = {}) {
  const runner = dependencies.runner ?? runSvn;
  const inspection = await inspectPublishTarget(params, runner);
  validateExistingIdentity(inspection, params);
  assertProjects(params.sourceRoot, params.projectNames);

  const sourceTreeDigest = hashDirectory(params.sourceRoot);
  const projectDigests = Object.fromEntries(params.projectNames.map((name) => [name, hashDirectory(path.join(params.sourceRoot, name))]));
  const workspace = await ensureWorkspace(params, inspection, runner);
  const preparedBase = { ...workspace, inspection };
  try {
    if (inspection.targetExists && inspection.manifest?.projectTreeDigest) {
      const existingProjectNames = inspection.manifest.projects.map((project) => project.name);
      const existingDigest = inspection.transferMode === 'in-place'
        ? hashPublishProjects(workspace.targetPath, existingProjectNames)
        : hashDirectory(workspace.targetPath, { excludedNames: [MANIFEST_FILE] });
      if (existingDigest !== inspection.manifest.projectTreeDigest) {
        throw new CoursePublishError('LOCAL_PUBLISH_MODIFIED', '本地 SVN 课件内容与上次发布记录不一致，请先通过公司 SVN 客户端处理');
      }
    }

    if (inspection.transferMode === 'in-place') clearManagedPublishTarget(workspace.targetPath);
    else clearPublishTarget(workspace.targetPath);
    for (const projectName of params.projectNames) {
      copyTree(path.join(params.sourceRoot, projectName), path.join(workspace.targetPath, projectName));
    }

    const manifest = {
      schemaVersion: 1,
      courseId: params.courseId,
      courseKind: params.courseKind,
      courseFolderName: inspection.courseFolderName,
      editorVersion: params.editorVersion,
      environmentVersion: params.environmentVersion,
      generatedAt: params.generatedAt ?? new Date().toISOString(),
      contentDigest: params.contentDigest,
      projectTreeDigest: sourceTreeDigest,
      projects: params.projectNames.map((name) => ({ name, digest: projectDigests[name] })),
    };
    fs.writeFileSync(path.join(workspace.targetPath, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    const copiedDigest = inspection.transferMode === 'in-place'
      ? hashPublishProjects(workspace.targetPath, params.projectNames)
      : hashDirectory(workspace.targetPath, { excludedNames: [MANIFEST_FILE] });
    if (copiedDigest !== sourceTreeDigest) {
      throw new CoursePublishError('SYNC_INCOMPLETE', '生成工程与待提交工程不完整一致，已停止发布');
    }
    const changes = inspection.transferMode === 'in-place'
      ? await markManagedSvnChanges(workspace.targetPath, params.projectNames, runner, workspace.rootNeedsCommit)
      : await markSvnChanges(workspace.targetPath, runner);
    const commitPaths = inspection.transferMode === 'in-place'
      ? managedCommitPaths(workspace.targetPath, changes, workspace.rootNeedsCommit)
      : [workspace.createdRootPath ?? workspace.targetPath];
    return {
      inspection,
      workspacePath: workspace.workspacePath,
      targetPath: workspace.targetPath,
      workspaceKind: 'existing',
      createdRootPath: workspace.createdRootPath,
      rootNeedsCommit: workspace.rootNeedsCommit,
      commitPaths,
      manifest,
      changes,
      projectDigests,
      sourceTreeDigest,
    };
  } catch (error) {
    await restorePreparedTarget(preparedBase, runner);
    throw error;
  }
}

function parseCommittedRevision(xml) {
  const match = String(xml).match(/<commit\s+revision="(\d+)"/);
  const revision = match ? Number.parseInt(match[1], 10) : 0;
  if (!revision) throw new CoursePublishError('REVISION_MISSING', 'SVN 已返回成功，但未取得 revision');
  return revision;
}

async function launchTortoiseCommit({ commitPaths, message, tortoiseLocator = findTortoiseProc }) {
  const tortoisePath = await tortoiseLocator();
  if (!tortoisePath) {
    throw new CoursePublishError('TORTOISE_NOT_FOUND', '未找到公司 TortoiseSVN 客户端，请先安装或修复后再发布');
  }
  try {
    await runRawFile(tortoisePath, [
      '/command:commit',
      `/path:${commitPaths.join('*')}`,
      `/logmsg:${message}`,
      '/closeonend:0',
    ], { timeout: 10 * 60 * 1000 });
  } catch (error) {
    throw new CoursePublishError(
      'TORTOISE_COMMIT_FAILED',
      'TortoiseSVN 提交未完成，未通知打包机',
      { exitCode: error?.code, output: error?.commandOutput },
    );
  }
}

async function defaultCommitter({ commitPath, commitPaths, message, runner }) {
  if (svnRuntime.platform === 'win32') {
    await launchTortoiseCommit({ commitPaths, message });
    return;
  }
  await runner(['commit', '--xml', '-m', message, ...commitPaths], { timeout: 10 * 60 * 1000 });
}

function assertCommittedManifest(actual, expected) {
  if (!actual
    || actual.courseId !== expected.courseId
    || actual.courseKind !== expected.courseKind
    || actual.courseFolderName !== expected.courseFolderName
    || actual.contentDigest !== expected.contentDigest) {
    throw new CoursePublishError('COMMITTED_IDENTITY_MISMATCH', '提交后的课件身份与本次发布不一致，未通知打包机');
  }
}

async function commitPreparedPublish(prepared, message, dependencies = {}) {
  const normalizedDependencies = typeof dependencies === 'function' ? { runner: dependencies } : dependencies;
  const runner = normalizedDependencies.runner ?? runSvn;
  const committer = normalizedDependencies.committer ?? defaultCommitter;
  const commitPath = prepared.createdRootPath ?? prepared.targetPath;
  const commitPaths = prepared.commitPaths?.length ? prepared.commitPaths : [commitPath];
  await committer({ commitPath, commitPaths, message, runner, prepared });
  const status = await runner(['status', commitPath]);
  const remainingChanges = prepared.inspection.transferMode === 'in-place'
    ? managedStatusEntries(status.stdout, prepared.targetPath, prepared.rootNeedsCommit)
    : parseSvnStatus(status.stdout);
  if (remainingChanges.length > 0) {
    throw new CoursePublishError(
      'TORTOISE_COMMIT_INCOMPLETE',
      'TortoiseSVN 提交已取消或未包含全部课件文件，未通知打包机',
      remainingChanges.map((entry) => entry.path),
    );
  }

  const actualManifest = readLocalManifest(prepared.targetPath);
  assertCommittedManifest(actualManifest, prepared.manifest);
  const actualFinalUrl = normalizeSvnUrl(await localInfoItem('url', prepared.targetPath, runner));
  if (actualFinalUrl !== normalizeSvnUrl(prepared.inspection.finalUrl)) {
    throw new CoursePublishError('COMMITTED_URL_MISMATCH', '提交后的课件 SVN 地址与确认目标不一致，未通知打包机');
  }
  const revisionText = await localInfoItem(
    'last-changed-revision',
    path.join(prepared.targetPath, MANIFEST_FILE),
    runner,
  );
  const revision = Number.parseInt(revisionText, 10);
  if (!Number.isFinite(revision) || revision <= 0) {
    throw new CoursePublishError('REVISION_MISSING', 'TortoiseSVN 已关闭，但未取得本次提交 revision，未通知打包机');
  }
  const projectUrls = {};
  for (const { name } of actualManifest.projects) {
    if (!PROJECT_NAMES.has(name) || !prepared.manifest.projects.some((project) => project.name === name)) {
      throw new CoursePublishError('COMMITTED_PROJECT_MISMATCH', '提交后的工程清单与本次发布不一致，未通知打包机');
    }
    const projectPath = path.join(prepared.targetPath, name);
    const projectUrl = normalizeSvnUrl(await localInfoItem('url', projectPath, runner));
    if (projectUrl !== `${actualFinalUrl}/${name}`) {
      throw new CoursePublishError('COMMITTED_PROJECT_URL_MISMATCH', `${name} 的实际 SVN 地址与课件目录不一致，未通知打包机`);
    }
    projectUrls[name] = projectUrl;
  }
  if (Object.keys(projectUrls).length !== prepared.manifest.projects.length) {
    throw new CoursePublishError('COMMITTED_PROJECT_MISMATCH', '提交后的工程清单不完整，未通知打包机');
  }
  return {
    revision,
    finalUrl: actualFinalUrl,
    projectUrls,
    workspacePath: prepared.workspacePath,
    contentDigest: actualManifest.contentDigest,
    committedAt: new Date().toISOString(),
  };
}

async function cancelPreparedPublish(prepared, runner = runSvn) {
  await restorePreparedTarget(prepared, runner);
}

function stateFilePath(userDataPath) {
  return path.join(userDataPath, 'course-publish-state.json');
}

function readPublishStates(userDataPath) {
  try {
    const value = JSON.parse(fs.readFileSync(stateFilePath(userDataPath), 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writePublishStates(userDataPath, states) {
  fs.mkdirSync(userDataPath, { recursive: true });
  const target = stateFilePath(userDataPath);
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(states, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, target);
}

function getCoursePublishState(userDataPath, courseId) {
  return readPublishStates(userDataPath)[courseId] ?? { confirmations: {} };
}

function setCoursePublishState(userDataPath, courseId, state) {
  const states = readPublishStates(userDataPath);
  states[courseId] = state;
  writePublishStates(userDataPath, states);
  return state;
}

function serializePublishError(error) {
  if (error instanceof CoursePublishError) return { ok: false, code: error.code, error: error.message, details: error.details };
  return { ok: false, code: 'PUBLISH_FAILED', error: error instanceof Error ? error.message : String(error) };
}

module.exports = {
  CoursePublishError,
  buildTarget,
  cancelPreparedPublish,
  commitPreparedPublish,
  configureSvnRuntime,
  getCoursePublishState,
  hashDirectory,
  hashText,
  hashPublishProjects,
  inspectLocalSvnFolder,
  inspectPublishTarget,
  inspectSvnCapability,
  ensureWorkspace,
  findTortoiseProc,
  launchTortoiseCommit,
  mapLocalSvnTarget,
  localPathRelation,
  managedStatusEntries,
  normalizeRelativePath,
  parseCommittedRevision,
  parseSvnStatus,
  preparePublish,
  runFile,
  serializePublishError,
  setCoursePublishState,
};
