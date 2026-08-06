import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  acquireDraftLock,
  listCheckpoints,
  readCheckpoint,
  releaseDraftLock,
  saveCapture,
  writeCheckpoint,
  writeFeedbackReport,
} = require(join(process.cwd(), 'electron/agentAuthoringFs.cjs'));

test('草稿锁拒绝其他会话，并允许持有者释放', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'forge-agent-lock-'));
  try {
    assert.equal(acquireDraftLock(dir, 'session-a').ok, true);
    const blocked = acquireDraftLock(dir, 'session-b');
    assert.equal(blocked.ok, false);
    assert.match(blocked.error, /DRAFT_LOCKED/);
    assert.equal(releaseDraftLock(dir, 'session-a').ok, true);
    assert.equal(acquireDraftLock(dir, 'session-b').ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Agent 检查点跨重启保存且只保留最近 20 个', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'forge-agent-checkpoint-'));
  try {
    for (let index = 0; index < 22; index += 1) {
      writeCheckpoint(dir, 'course-1', JSON.stringify({ id: 'course-1', stages: [], revision: index }), {
        sessionId: 'session-a',
        reason: `提交 ${index}`,
      });
    }
    const listed = listCheckpoints(dir);
    assert.equal(listed.ok, true);
    assert.equal(listed.checkpoints.length, 20);
    const restored = readCheckpoint(dir, listed.checkpoints[0].checkpointId);
    assert.equal(restored.ok, true);
    assert.equal(JSON.parse(restored.courseJson).id, 'course-1');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('画布截图与脱敏反馈只写入受控目录', async () => {
  const courseDir = await mkdtemp(join(tmpdir(), 'forge-agent-capture-'));
  const userDataDir = await mkdtemp(join(tmpdir(), 'forge-agent-feedback-'));
  try {
    const png = saveCapture(courseDir, '../page-1', 'data:image/png;base64,iVBORw0KGgo=');
    assert.equal(png.ok, true);
    assert.ok(png.path.startsWith(courseDir));

    const report = writeFeedbackReport(userDataDir, {
      summary: '缺少能力',
      sourcePath: '/private/teacher/material.png',
      token: 'secret',
    });
    const saved = JSON.parse(await readFile(report.path, 'utf8'));
    assert.equal(saved.sourcePath, '[REDACTED]');
    assert.equal(saved.token, '[REDACTED]');
  } finally {
    await rm(courseDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
});
