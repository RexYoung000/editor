const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const MANIFEST_FILE = 'forge-publish.json';
const PROJECT_NAMES = new Set(['Game1_LT', 'Game1_PREVIEW', 'Game1_HW', 'Game1_REVIEW']);

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
          message = '未找到 SVN 命令，请先安装或修复公司 SVN 客户端';
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
  return runFile('svn', ['--non-interactive', ...args], options);
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

async function svnItemExists(url, runner = runSvn) {
  try {
    const { stdout } = await runner(['info', '--show-item', 'kind', url]);
    return stdout.trim() === 'dir';
  } catch (error) {
    if (error instanceof CoursePublishError && error.code === 'SVN_PATH_NOT_FOUND') return false;
    throw error;
  }
}

async function svnItemRevision(url, runner = runSvn) {
  const { stdout } = await runner(['info', '--show-item', 'revision', url]);
  const revision = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(revision) ? revision : 0;
}

async function readRemoteManifest(finalUrl, runner = runSvn) {
  try {
    const { stdout } = await runner(['cat', `${finalUrl}/${MANIFEST_FILE}`]);
    return JSON.parse(stdout);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CoursePublishError('MANIFEST_INVALID', '远端发布身份文件无法读取，已阻止覆盖');
    }
    if (error instanceof CoursePublishError && error.code === 'SVN_PATH_NOT_FOUND') return null;
    throw error;
  }
}

async function listRemoteProjects(finalUrl, runner = runSvn) {
  try {
    const { stdout } = await runner(['list', finalUrl]);
    return stdout.split(/\r?\n/)
      .map((entry) => entry.replace(/\/$/, '').trim())
      .filter((entry) => PROJECT_NAMES.has(entry));
  } catch (error) {
    if (error instanceof CoursePublishError && error.code === 'SVN_PATH_NOT_FOUND') return [];
    throw error;
  }
}

async function findNearestExistingUrl(baseUrl, parentPath, runner = runSvn) {
  const segments = normalizeRelativePath(parentPath).split('/');
  for (let length = segments.length; length >= 0; length -= 1) {
    const suffix = segments.slice(0, length).join('/');
    const url = suffix ? `${baseUrl}/${suffix}` : baseUrl;
    if (await svnItemExists(url, runner)) {
      return { url, existingSegments: segments.slice(0, length), missingSegments: segments.slice(length) };
    }
  }
  throw new CoursePublishError('SVN_BASE_NOT_FOUND', '当前课型的 SVN 基础地址不可访问');
}

async function inspectPublishTarget(params, runner = runSvn) {
  const target = buildTarget(params.baseUrl, params.parentPath, params.courseFolderName);
  const targetExists = await svnItemExists(target.finalUrl, runner);
  const parentExists = await svnItemExists(target.parentUrl, runner);
  const nearest = parentExists
    ? { url: target.parentUrl, existingSegments: target.parentPath.split('/'), missingSegments: [] }
    : await findNearestExistingUrl(target.baseUrl, target.parentPath, runner);
  const manifest = targetExists ? await readRemoteManifest(target.finalUrl, runner) : null;
  const existingProjects = targetExists ? await listRemoteProjects(target.finalUrl, runner) : [];
  const revision = targetExists ? await svnItemRevision(target.finalUrl, runner) : 0;
  let identity = 'new';
  if (targetExists && manifest) {
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
    parentExists,
    nearestExistingUrl: nearest.url,
    missingParentSegments: nearest.missingSegments,
    identity,
    manifest,
    existingProjects,
    revision,
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

function parseSvnStatus(stdout) {
  return String(stdout).split(/\r?\n/).filter(Boolean).map((line) => ({
    code: line[0],
    path: line.slice(8).trim(),
    line,
  }));
}

async function markSvnChanges(targetPath, runner = runSvn) {
  await runner(['add', '--force', targetPath]);
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

function relativeUrlSegments(ancestorUrl, targetUrl) {
  const ancestor = normalizeSvnUrl(ancestorUrl);
  const target = normalizeSvnUrl(targetUrl);
  if (target !== ancestor && !target.startsWith(`${ancestor}/`)) {
    throw new CoursePublishError('WORKSPACE_URL_MISMATCH', '所选工作副本与当前 SVN 目标不对应');
  }
  return target.slice(ancestor.length).replace(/^\//, '').split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

async function workspaceUrl(workspacePath, runner = runSvn) {
  const { stdout } = await runner(['info', '--show-item', 'url', workspacePath]);
  return normalizeSvnUrl(stdout.trim());
}

async function ensureWorkspace(params, inspection, runner = runSvn) {
  const workspacePath = params.workspacePath;
  const workspaceKind = params.workspaceKind ?? 'managed';
  let rootUrl;
  if (fs.existsSync(path.join(workspacePath, '.svn'))) {
    rootUrl = await workspaceUrl(workspacePath, runner);
    const initialSegments = relativeUrlSegments(rootUrl, inspection.finalUrl);
    if (workspaceKind === 'existing') {
      const status = await runner(['status', '--depth', initialSegments.length === 0 ? 'infinity' : 'empty', workspacePath]);
      if (status.stdout.trim()) {
        throw new CoursePublishError('WORKSPACE_HAS_CHANGES', '当前课件目标有尚未提交的修改，请先通过 SVN 客户端处理后重试');
      }
    }
    if (workspaceKind !== 'existing') {
      await runner(['revert', '--recursive', workspacePath]);
    }
    await runner(['cleanup', workspacePath]);
    await runner(['update', '--depth', 'empty', workspacePath]);
  } else {
    if (workspaceKind === 'existing') {
      throw new CoursePublishError('WORKSPACE_NOT_SVN', '所选目录不是 SVN 工作副本，请重新选择');
    }
    fs.rmSync(workspacePath, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
    await runner(['checkout', '--depth', 'empty', inspection.nearestExistingUrl, workspacePath]);
    rootUrl = inspection.nearestExistingUrl;
  }

  const segments = relativeUrlSegments(rootUrl, inspection.finalUrl);
  let currentPath = workspacePath;
  let currentUrl = rootUrl;
  let createdRootPath = null;
  try {
    for (const segment of segments) {
      currentPath = path.join(currentPath, segment);
      currentUrl = `${currentUrl}/${encodeURIComponent(segment)}`;
      if (workspaceKind === 'existing' && fs.existsSync(currentPath)) {
        const status = await runner(['status', '--depth', currentUrl === inspection.finalUrl ? 'infinity' : 'empty', currentPath]);
        if (status.stdout.trim()) {
          throw new CoursePublishError('WORKSPACE_HAS_CHANGES', '当前课件目标有尚未提交的修改，请先通过 SVN 客户端处理后重试');
        }
      }
      if (await svnItemExists(currentUrl, runner)) {
        await runner(['update', '--depth', currentUrl === inspection.finalUrl ? 'infinity' : 'empty', currentPath]);
      } else {
        if (!createdRootPath) createdRootPath = currentPath;
        fs.mkdirSync(currentPath, { recursive: true });
        await runner(['add', '--parents', currentPath]);
      }
    }
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
  return { workspacePath, targetPath: currentPath, rootUrl, createdRootPath };
}

async function restorePreparedTarget(prepared, runner = runSvn) {
  const restorePath = prepared.createdRootPath ?? prepared.targetPath;
  try {
    await runner(['revert', '--recursive', restorePath]);
  } catch {
    // 首次发布目录尚未形成可回滚节点时，直接清理本地新增目录。
  }
  if (prepared.inspection.targetExists) {
    await runner(['update', '--depth', 'infinity', prepared.targetPath]);
  } else {
    fs.rmSync(restorePath, { recursive: true, force: true });
  }
  await runner(['cleanup', prepared.workspacePath]);
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
      const existingDigest = hashDirectory(workspace.targetPath, { excludedNames: [MANIFEST_FILE] });
      if (existingDigest !== inspection.manifest.projectTreeDigest) {
        throw new CoursePublishError('REMOTE_MODIFIED', 'SVN 课件已被其他人修改，需要先确认处理');
      }
    }

    clearPublishTarget(workspace.targetPath);
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
    const copiedDigest = hashDirectory(workspace.targetPath, { excludedNames: [MANIFEST_FILE] });
    if (copiedDigest !== sourceTreeDigest) {
      throw new CoursePublishError('SYNC_INCOMPLETE', '生成工程与待提交工程不完整一致，已停止发布');
    }
    const changes = await markSvnChanges(workspace.targetPath, runner);
    return {
      inspection,
      workspacePath: workspace.workspacePath,
      targetPath: workspace.targetPath,
      workspaceKind: params.workspaceKind ?? 'managed',
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

async function commitPreparedPublish(prepared, message, runner = runSvn) {
  const { stdout } = await runner(['commit', '--xml', '-m', message, prepared.targetPath], { timeout: 10 * 60 * 1000 });
  const revision = parseCommittedRevision(stdout);
  const status = await runner(['status', prepared.targetPath]);
  if (status.stdout.trim()) {
    throw new CoursePublishError('WORKSPACE_NOT_CLEAN', 'SVN 已提交，但本地工作区仍有未同步内容');
  }
  const projectUrls = Object.fromEntries(prepared.manifest.projects.map(({ name }) => [name, `${prepared.inspection.finalUrl}/${name}`]));
  return {
    revision,
    finalUrl: prepared.inspection.finalUrl,
    projectUrls,
    workspacePath: prepared.workspacePath,
    contentDigest: prepared.manifest.contentDigest,
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
  getCoursePublishState,
  hashDirectory,
  inspectPublishTarget,
  ensureWorkspace,
  normalizeRelativePath,
  parseCommittedRevision,
  parseSvnStatus,
  preparePublish,
  serializePublishError,
  setCoursePublishState,
};
