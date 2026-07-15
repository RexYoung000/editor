import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const projectRoot = resolve(import.meta.dirname, '..');
const testsDir = join(projectRoot, 'tests');
const outputDir = await mkdtemp(join(tmpdir(), 'forge-tests-'));

try {
  const entries = (await readdir(testsDir))
    .filter((name) => name.endsWith('.test.ts'))
    .map((name) => join(testsDir, name));

  await build({
    entryPoints: entries,
    outdir: outputDir,
    entryNames: '[name]',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['node:*'],
    logLevel: 'silent',
  });

  const outputs = (await readdir(outputDir))
    .filter((name) => name.endsWith('.test.js'))
    .map((name) => join(outputDir, name));
  const result = spawnSync(process.execPath, ['--test', ...outputs], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
