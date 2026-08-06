import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const sourceDir = resolve(projectRoot, 'agent/skill/forge-homework-authoring');
const outputRoot = resolve(projectRoot, 'agent/dist');
const executableToken = '<FORGE_EXECUTABLE_PATH>';
const skillName = 'forge-homework-authoring';
const skillVersion = '0.1.1';

const jsonConfig = {
  mcpServers: {
    forge: {
      command: executableToken,
      args: ['--mcp'],
    },
  },
};

const adapters = {
  codex: {
    configName: 'config.toml',
    config: `[mcp_servers.forge]\ncommand = "${executableToken}"\nargs = ["--mcp"]\n`,
  },
  'claude-code': {
    configName: '.mcp.json',
    config: `${JSON.stringify(jsonConfig, null, 2)}\n`,
  },
  opencode: {
    configName: 'opencode.json',
    config: `${JSON.stringify({
      mcp: {
        forge: {
          type: 'local',
          command: [executableToken, '--mcp'],
          enabled: true,
        },
      },
    }, null, 2)}\n`,
  },
  workbuddy: {
    configName: 'mcp.json',
    config: `${JSON.stringify(jsonConfig, null, 2)}\n`,
  },
};

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const sourceSkill = await readFile(resolve(sourceDir, 'SKILL.md'));
const sourceSha256 = createHash('sha256').update(sourceSkill).digest('hex');

for (const [name, adapter] of Object.entries(adapters)) {
  const adapterRoot = resolve(outputRoot, name);
  await mkdir(adapterRoot, { recursive: true });
  await cp(sourceDir, resolve(adapterRoot, 'skills', skillName), { recursive: true });
  await writeFile(resolve(adapterRoot, adapter.configName), adapter.config, 'utf8');
  await writeFile(resolve(adapterRoot, 'adapter.json'), `${JSON.stringify({
    agent: name,
    skillName,
    skillVersion,
    sourceSha256,
    executableToken,
    generated: true,
  }, null, 2)}\n`, 'utf8');
}

await writeFile(resolve(outputRoot, 'manifest.json'), `${JSON.stringify({
  skillName,
  skillVersion,
  sourceSha256,
  capabilityDiscovery: 'dynamic-via-mcp',
  adapters: Object.keys(adapters),
}, null, 2)}\n`, 'utf8');
