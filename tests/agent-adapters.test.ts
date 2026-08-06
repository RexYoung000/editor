import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const adapters = ['codex', 'claude-code', 'opencode', 'workbuddy'];

test('四端适配产物来自同一 Skill 版本与源码哈希', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'agent/dist/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.adapters, adapters);
  assert.equal(manifest.capabilityDiscovery, 'dynamic-via-mcp');
  const hashes = adapters.map((adapter) => {
    const metadata = JSON.parse(readFileSync(join(root, 'agent/dist', adapter, 'adapter.json'), 'utf8'));
    assert.equal(metadata.skillVersion, manifest.skillVersion);
    assert.equal(metadata.executableToken, '<FORGE_EXECUTABLE_PATH>');
    const skill = readFileSync(join(root, 'agent/dist', adapter, 'skills/forge-homework-authoring/SKILL.md'), 'utf8');
    assert.match(skill, /forge_get_manifest/);
    assert.doesNotMatch(skill, /forge_publish|SVN.*调用/);
    return metadata.sourceSha256;
  });
  assert.equal(new Set(hashes).size, 1);
  assert.equal(hashes[0], manifest.sourceSha256);
});

test('四端 MCP 配置只启动本机可见 Forge stdio 模式', () => {
  const files = [
    'agent/dist/codex/config.toml',
    'agent/dist/claude-code/.mcp.json',
    'agent/dist/opencode/opencode.json',
    'agent/dist/workbuddy/mcp.json',
  ];
  files.forEach((file) => {
    const content = readFileSync(join(root, file), 'utf8');
    assert.match(content, /<FORGE_EXECUTABLE_PATH>/);
    assert.match(content, /--mcp/);
    assert.doesNotMatch(content, /https?:\/\//);
  });
});
