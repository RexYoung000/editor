const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const VERSION_CONTROL_ENTRIES = new Set(['.svn', '.git']);
const GENERATED_ENTRIES = new Set(['project', 'esBuild']);
const TRANSACTION_PREFIX = '.forge-save-';

class CourseSaveAsError extends Error {
  constructor(code, cause) {
    super(code, cause ? { cause } : undefined);
    this.name = 'CourseSaveAsError';
    this.code = code;
  }
}

function saveAsError(code, cause) {
  return cause instanceof CourseSaveAsError ? cause : new CourseSaveAsError(code, cause);
}

function mapFileSystemError(error, fallback = 'SAVE_AS_FAILED') {
  if (error instanceof CourseSaveAsError) return error;
  if (error && typeof error === 'object') {
    if (error.code === 'ENOSPC') return saveAsError('DISK_FULL', error);
    if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'EROFS') {
      return saveAsError('PERMISSION_DENIED', error);
    }
    if (error.code === 'EBUSY' || error.code === 'ETXTBSY') return saveAsError('FILE_BUSY', error);
    if (error.code === 'ENOENT') return saveAsError('SOURCE_NOT_FOUND', error);
  }
  return saveAsError(fallback, error);
}

function validateCourseId(courseId) {
  if (typeof courseId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(courseId)) {
    throw saveAsError('INVALID_COURSE_ID');
  }
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function canonicalizePath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw saveAsError('INVALID_PATH');
  }

  const absolutePath = path.resolve(inputPath);
  const missingParts = [];
  let cursor = absolutePath;

  while (true) {
    try {
      const real = await fsp.realpath(cursor);
      return path.join(real, ...missingParts.reverse());
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw mapFileSystemError(error, 'INVALID_PATH');
      const parent = path.dirname(cursor);
      if (parent === cursor) throw saveAsError('INVALID_PATH', error);
      missingParts.push(path.basename(cursor));
      cursor = parent;
    }
  }
}

function comparisonPath(inputPath, platform = process.platform) {
  const normalized = path.normalize(inputPath).replace(/[\\/]+$/, '');
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function getPathRelation(sourceDir, targetDir, platform = process.platform) {
  const source = comparisonPath(sourceDir, platform);
  const target = comparisonPath(targetDir, platform);
  if (source === target) return 'same';

  const targetFromSource = path.relative(source, target);
  if (targetFromSource && !targetFromSource.startsWith('..') && !path.isAbsolute(targetFromSource)) {
    return 'target-inside-source';
  }

  const sourceFromTarget = path.relative(target, source);
  if (sourceFromTarget && !sourceFromTarget.startsWith('..') && !path.isAbsolute(sourceFromTarget)) {
    return 'source-inside-target';
  }

  return 'separate';
}

function transactionPaths(parentDir, targetCourseId, transactionId = crypto.randomUUID()) {
  const baseName = `${TRANSACTION_PREFIX}${targetCourseId}`;
  return {
    markerPath: path.join(parentDir, `${baseName}.json`),
    markerWritePath: path.join(parentDir, `${baseName}.json.write`),
    tempDir: path.join(parentDir, `${baseName}-${transactionId}.tmp`),
    backupDir: path.join(parentDir, `${baseName}-${transactionId}.backup`),
  };
}

function isSafeTransactionPath(parentDir, targetCourseId, candidate, suffix) {
  if (!candidate || path.dirname(path.resolve(candidate)) !== path.resolve(parentDir)) return false;
  const name = path.basename(candidate);
  return name.startsWith(`${TRANSACTION_PREFIX}${targetCourseId}-`) && name.endsWith(suffix);
}

async function readCourseJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isCourseShape(course, expectedId) {
  return Boolean(
    course
    && typeof course === 'object'
    && course.id === expectedId
    && Array.isArray(course.stages),
  );
}

async function validateCourseDirectory(courseDir, expectedId) {
  const expectedFile = path.join(courseDir, `${expectedId}.json`);
  const expectedCourse = await readCourseJson(expectedFile);
  if (!isCourseShape(expectedCourse, expectedId)) {
    return { valid: false, reason: 'missing-or-invalid-course-json' };
  }

  const entries = await fsp.readdir(courseDir, { withFileTypes: true });
  let courseJsonCount = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;
    const candidate = await readCourseJson(path.join(courseDir, entry.name));
    if (candidate && typeof candidate.id === 'string' && Array.isArray(candidate.stages)) {
      courseJsonCount += 1;
    }
  }

  if (courseJsonCount !== 1) return { valid: false, reason: 'ambiguous-course-json' };
  return { valid: true, course: expectedCourse };
}

async function inspectTargetContents(targetDir, targetCourseId) {
  if (!(await pathExists(targetDir))) {
    return { state: 'available', targetExists: false, hasVersionControlMetadata: false };
  }

  const stat = await fsp.stat(targetDir);
  if (!stat.isDirectory()) {
    return { state: 'invalid', targetExists: true, hasVersionControlMetadata: false };
  }

  const entries = await fsp.readdir(targetDir, { withFileTypes: true });
  const hasVersionControlMetadata = entries.some((entry) => VERSION_CONTROL_ENTRIES.has(entry.name));
  const contentEntries = entries.filter((entry) => !VERSION_CONTROL_ENTRIES.has(entry.name));
  if (contentEntries.length === 0) {
    return { state: 'available', targetExists: true, hasVersionControlMetadata };
  }

  const validation = await validateCourseDirectory(targetDir, targetCourseId);
  if (validation.valid) {
    return { state: 'replaceable', targetExists: true, hasVersionControlMetadata };
  }
  return { state: 'invalid', targetExists: true, hasVersionControlMetadata };
}

async function inspectCourseSaveTarget(params, options = {}) {
  validateCourseId(params.targetCourseId);
  const sourceDir = await canonicalizePath(params.sourceDir);
  const parentDir = await canonicalizePath(params.parentPath);
  const targetDir = await canonicalizePath(path.join(parentDir, params.targetCourseId));

  const sourceStat = await fsp.stat(sourceDir).catch((error) => {
    throw mapFileSystemError(error, 'SOURCE_NOT_FOUND');
  });
  if (!sourceStat.isDirectory()) throw saveAsError('SOURCE_NOT_FOUND');

  const relation = getPathRelation(sourceDir, targetDir, options.platform);
  if (relation === 'same') return { state: 'current', sourceDir, parentDir, targetDir };
  if (relation === 'target-inside-source') {
    return { state: 'target-inside-source', sourceDir, parentDir, targetDir };
  }
  if (relation === 'source-inside-target') {
    return { state: 'source-inside-target', sourceDir, parentDir, targetDir };
  }

  const expectedTargetDir = path.join(parentDir, params.targetCourseId);
  if (comparisonPath(targetDir, options.platform) !== comparisonPath(expectedTargetDir, options.platform)) {
    return { state: 'invalid', sourceDir, parentDir, targetDir };
  }

  await recoverPendingSaveAs({ parentDir, targetDir, targetCourseId: params.targetCourseId });
  const target = await inspectTargetContents(targetDir, params.targetCourseId);
  return { ...target, sourceDir, parentDir, targetDir };
}

function shouldCopySourceEntry(sourceDir, sourcePath) {
  const relativePath = path.relative(sourceDir, sourcePath);
  if (!relativePath) return true;
  const parts = relativePath.split(path.sep);
  if (parts.some((part) => VERSION_CONTROL_ENTRIES.has(part))) return false;
  if (parts.some((part) => part.startsWith(TRANSACTION_PREFIX))) return false;
  return !GENERATED_ENTRIES.has(parts[0]);
}

async function calculateCopySize(entryPath, sourceDir) {
  if (!shouldCopySourceEntry(sourceDir, entryPath)) return 0;
  const stat = await fsp.lstat(entryPath);
  if (!stat.isDirectory()) return stat.size;
  const entries = await fsp.readdir(entryPath);
  let total = 0;
  for (const entry of entries) total += await calculateCopySize(path.join(entryPath, entry), sourceDir);
  return total;
}

async function ensureDiskSpace(sourceDir, targetDir) {
  if (typeof fsp.statfs !== 'function') return;
  try {
    const [required, disk] = await Promise.all([
      calculateCopySize(sourceDir, sourceDir),
      fsp.statfs(path.dirname(targetDir)),
    ]);
    const available = Number(disk.bavail) * Number(disk.bsize);
    const buffer = Math.min(64 * 1024 * 1024, Math.ceil(required * 0.05));
    if (available < required + buffer) throw saveAsError('DISK_FULL');
  } catch (error) {
    if (error instanceof CourseSaveAsError) throw error;
    // 某些网络盘不支持 statfs；复制本身仍会返回可识别的 ENOSPC。
  }
}

async function copyVersionControlMetadata(sourceTargetDir, tempDir) {
  for (const entryName of VERSION_CONTROL_ENTRIES) {
    const sourceEntry = path.join(sourceTargetDir, entryName);
    if (!(await pathExists(sourceEntry))) continue;
    await fsp.cp(sourceEntry, path.join(tempDir, entryName), {
      recursive: true,
      force: false,
      errorOnExist: true,
      verbatimSymlinks: true,
    });
  }
}

async function writeTransactionMarker(markerPath, markerWritePath, marker) {
  const handle = await fsp.open(markerWritePath, 'wx');
  try {
    await handle.writeFile(JSON.stringify(marker, null, 2), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.rename(markerWritePath, markerPath);
}

async function removeIfExists(targetPath) {
  await fsp.rm(targetPath, { recursive: true, force: true });
}

async function readTransactionMarker(markerPath, parentDir, targetCourseId, targetDir) {
  const marker = await readCourseJson(markerPath);
  if (!marker || marker.version !== 1 || marker.targetCourseId !== targetCourseId) {
    throw saveAsError('RECOVERY_FAILED');
  }
  if (path.resolve(marker.targetDir) !== path.resolve(targetDir)) throw saveAsError('RECOVERY_FAILED');
  if (!isSafeTransactionPath(parentDir, targetCourseId, marker.tempDir, '.tmp')) {
    throw saveAsError('RECOVERY_FAILED');
  }
  if (!isSafeTransactionPath(parentDir, targetCourseId, marker.backupDir, '.backup')) {
    throw saveAsError('RECOVERY_FAILED');
  }
  return marker;
}

async function recoverPendingSaveAs({ parentDir, targetDir, targetCourseId }) {
  const { markerPath, markerWritePath } = transactionPaths(parentDir, targetCourseId, 'recovery');
  await removeIfExists(markerWritePath);
  if (!(await pathExists(markerPath))) return { outcome: 'none' };

  const marker = await readTransactionMarker(markerPath, parentDir, targetCourseId, targetDir);
  const [targetExists, tempExists, backupExists] = await Promise.all([
    pathExists(targetDir),
    pathExists(marker.tempDir),
    pathExists(marker.backupDir),
  ]);

  if (backupExists) {
    if (targetExists) {
      const targetValidation = await validateCourseDirectory(targetDir, targetCourseId);
      if (targetValidation.valid) {
        await removeIfExists(marker.backupDir);
        if (tempExists) await removeIfExists(marker.tempDir);
        await removeIfExists(markerPath);
        return { outcome: 'committed' };
      }
      await removeIfExists(targetDir);
    }
    await fsp.rename(marker.backupDir, targetDir);
    if (tempExists) await removeIfExists(marker.tempDir);
    await removeIfExists(markerPath);
    return { outcome: 'rolled-back' };
  }

  if (marker.targetExisted) {
    if (!targetExists) throw saveAsError('RECOVERY_FAILED');
    if (tempExists) await removeIfExists(marker.tempDir);
    await removeIfExists(markerPath);
    return { outcome: 'rolled-back' };
  }

  if (targetExists) {
    const validation = await validateCourseDirectory(targetDir, targetCourseId);
    if (validation.valid) {
      if (tempExists) await removeIfExists(marker.tempDir);
      await removeIfExists(markerPath);
      return { outcome: 'committed' };
    }
    await removeIfExists(targetDir);
  }
  if (tempExists) await removeIfExists(marker.tempDir);
  await removeIfExists(markerPath);
  return { outcome: 'rolled-back' };
}

async function saveCourseAsTransaction(params) {
  try {
    validateCourseId(params.sourceCourseId);
  } catch (error) {
    throw saveAsError('SOURCE_INVALID', error);
  }

  let inspection;
  try {
    inspection = await inspectCourseSaveTarget(params);
  } catch (error) {
    throw mapFileSystemError(error);
  }

  const stateErrors = {
    current: 'CURRENT_PATH',
    'target-inside-source': 'TARGET_INSIDE_SOURCE',
    'source-inside-target': 'SOURCE_INSIDE_TARGET',
    invalid: 'TARGET_INVALID',
  };
  if (stateErrors[inspection.state]) throw saveAsError(stateErrors[inspection.state]);
  if (inspection.state === 'replaceable' && !params.overwrite) {
    throw saveAsError('TARGET_REQUIRES_CONFIRMATION');
  }

  let newCourse;
  try {
    newCourse = JSON.parse(params.courseJson);
  } catch (error) {
    throw saveAsError('SOURCE_INVALID', error);
  }
  if (!isCourseShape(newCourse, params.targetCourseId)) throw saveAsError('SOURCE_INVALID');

  const sourceJson = await readCourseJson(path.join(inspection.sourceDir, `${params.sourceCourseId}.json`));
  if (!isCourseShape(sourceJson, params.sourceCourseId)) throw saveAsError('SOURCE_INVALID');

  const paths = transactionPaths(inspection.parentDir, params.targetCourseId);
  const marker = {
    version: 1,
    targetCourseId: params.targetCourseId,
    targetDir: inspection.targetDir,
    tempDir: paths.tempDir,
    backupDir: paths.backupDir,
    targetExisted: inspection.targetExists,
  };

  try {
    await ensureDiskSpace(inspection.sourceDir, inspection.targetDir);
    await writeTransactionMarker(paths.markerPath, paths.markerWritePath, marker);
    await fsp.cp(inspection.sourceDir, paths.tempDir, {
      recursive: true,
      force: false,
      errorOnExist: true,
      verbatimSymlinks: true,
      filter: (sourcePath) => shouldCopySourceEntry(inspection.sourceDir, sourcePath),
    });

    const sourceJsonPath = path.join(paths.tempDir, `${params.sourceCourseId}.json`);
    const targetJsonPath = path.join(paths.tempDir, `${params.targetCourseId}.json`);
    await fsp.writeFile(targetJsonPath, params.courseJson, 'utf8');
    if (sourceJsonPath !== targetJsonPath) await fsp.rm(sourceJsonPath, { force: true });

    if (inspection.targetExists) {
      await copyVersionControlMetadata(inspection.targetDir, paths.tempDir);
    }

    const preparedValidation = await validateCourseDirectory(paths.tempDir, params.targetCourseId);
    if (!preparedValidation.valid) throw saveAsError('SOURCE_INVALID');

    if (inspection.targetExists) await fsp.rename(inspection.targetDir, paths.backupDir);
    await fsp.rename(paths.tempDir, inspection.targetDir);

    const finalValidation = await validateCourseDirectory(inspection.targetDir, params.targetCourseId);
    if (!finalValidation.valid) throw saveAsError('SAVE_AS_FAILED');

    await removeIfExists(paths.backupDir);
    await removeIfExists(paths.markerPath);
    return {
      targetDir: inspection.targetDir,
      filePath: path.join(inspection.targetDir, `${params.targetCourseId}.json`),
      replaced: inspection.targetExists,
    };
  } catch (error) {
    let recovery;
    try {
      recovery = await recoverPendingSaveAs({
        parentDir: inspection.parentDir,
        targetDir: inspection.targetDir,
        targetCourseId: params.targetCourseId,
      });
    } catch (recoveryError) {
      throw saveAsError('RECOVERY_FAILED', recoveryError);
    }
    if (recovery.outcome === 'committed') {
      return {
        targetDir: inspection.targetDir,
        filePath: path.join(inspection.targetDir, `${params.targetCourseId}.json`),
        replaced: inspection.targetExists,
      };
    }
    throw mapFileSystemError(error);
  } finally {
    await removeIfExists(paths.markerWritePath).catch(() => {});
  }
}

function serializeSaveAsError(error) {
  const mapped = mapFileSystemError(error);
  return { ok: false, code: mapped.code };
}

module.exports = {
  CourseSaveAsError,
  getPathRelation,
  inspectCourseSaveTarget,
  recoverPendingSaveAs,
  saveCourseAsTransaction,
  serializeSaveAsError,
  transactionPaths,
  validateCourseDirectory,
};
