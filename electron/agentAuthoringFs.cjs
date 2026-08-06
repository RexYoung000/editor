const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AGENT_DIR = '.forge';
const CHECKPOINT_DIR = 'agent-checkpoints';
const CAPTURE_DIR = 'agent-captures';
const LOCK_FILE = 'agent.lock';
const CHECKPOINT_LIMIT = 20;

function ensureInside(baseDir, targetPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error('AGENT_PATH_OUTSIDE_COURSE');
  }
  return target;
}

function agentPath(courseDir, ...segments) {
  return ensureInside(courseDir, path.join(courseDir, AGENT_DIR, ...segments));
}

function safeFilePart(value, fallback) {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return normalized || fallback;
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function acquireDraftLock(courseDir, sessionId) {
  const lockPath = agentPath(courseDir, LOCK_FILE);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (existing.sessionId !== sessionId && processExists(existing.pid)) {
      return { ok: false, error: 'DRAFT_LOCKED：另一个 Agent 正在编辑此草稿' };
    }
  } catch {
    // 缺失或损坏的锁不会阻止重新获取。
  }
  const lock = { sessionId, pid: process.pid, acquiredAt: new Date().toISOString() };
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf8');
  return { ok: true, lock };
}

function releaseDraftLock(courseDir, sessionId) {
  const lockPath = agentPath(courseDir, LOCK_FILE);
  try {
    const existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (existing.sessionId === sessionId) fs.unlinkSync(lockPath);
  } catch {
    // 已释放或损坏时视为完成。
  }
  return { ok: true };
}

function listCheckpointFiles(courseDir) {
  const directory = agentPath(courseDir, CHECKPOINT_DIR);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = ensureInside(directory, path.join(directory, name));
      const stat = fs.statSync(filePath);
      return { name, filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function writeCheckpoint(courseDir, courseId, courseJson, metadata = {}) {
  const directory = agentPath(courseDir, CHECKPOINT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const createdAt = new Date().toISOString();
  const checkpointId = `${createdAt.replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
  const filePath = ensureInside(directory, path.join(directory, `${checkpointId}.json`));
  const course = JSON.parse(courseJson);
  const payload = {
    checkpointId,
    courseId,
    createdAt,
    reason: String(metadata.reason || 'Agent 提交前快照'),
    sessionId: safeFilePart(metadata.sessionId, 'unknown'),
    course,
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const stale = listCheckpointFiles(courseDir).slice(CHECKPOINT_LIMIT);
  stale.forEach((item) => fs.unlinkSync(item.filePath));
  return { ok: true, checkpointId, path: filePath };
}

function listCheckpoints(courseDir) {
  return {
    ok: true,
    checkpoints: listCheckpointFiles(courseDir).map((item) => {
      try {
        const payload = JSON.parse(fs.readFileSync(item.filePath, 'utf8'));
        return {
          checkpointId: payload.checkpointId,
          courseId: payload.courseId,
          createdAt: payload.createdAt,
          reason: payload.reason,
        };
      } catch {
        return null;
      }
    }).filter(Boolean),
  };
}

function readCheckpoint(courseDir, checkpointId) {
  const safeId = safeFilePart(checkpointId, 'invalid');
  const filePath = agentPath(courseDir, CHECKPOINT_DIR, `${safeId}.json`);
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!payload.course || payload.checkpointId !== checkpointId) throw new Error('检查点内容无效');
    return { ok: true, courseJson: JSON.stringify(payload.course), metadata: {
      checkpointId: payload.checkpointId,
      createdAt: payload.createdAt,
      reason: payload.reason,
    } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function saveCapture(courseDir, pageId, dataUrl) {
  const match = String(dataUrl).match(/^data:image\/(png|jpeg);base64,(.+)$/s);
  if (!match) return { ok: false, error: '截图数据格式无效' };
  const directory = agentPath(courseDir, CAPTURE_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const ext = match[1] === 'jpeg' ? 'jpg' : 'png';
  const filePath = ensureInside(directory, path.join(directory, `${safeFilePart(pageId, 'page')}.${ext}`));
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
  return { ok: true, path: filePath };
}

function writeFeedbackReport(baseDir, report) {
  const directory = path.join(baseDir, 'agent-feedback');
  fs.mkdirSync(directory, { recursive: true });
  const reportId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
  const filePath = path.join(directory, `${reportId}.json`);
  const sanitized = JSON.parse(JSON.stringify(report, (key, value) => {
    if (/absolutePath|sourcePath|token|password|credential/i.test(key)) return '[REDACTED]';
    return value;
  }));
  fs.writeFileSync(filePath, JSON.stringify({ reportId, createdAt: new Date().toISOString(), ...sanitized }, null, 2), 'utf8');
  return { ok: true, reportId, path: filePath };
}

module.exports = {
  acquireDraftLock,
  listCheckpoints,
  readCheckpoint,
  releaseDraftLock,
  saveCapture,
  writeCheckpoint,
  writeFeedbackReport,
};
