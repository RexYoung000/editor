import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const fix = process.argv.includes('--fix');
const all = process.argv.includes('--all');
const utf8 = new TextDecoder('utf-8', { fatal: true });
const textExts = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.css', '.scss', '.html', '.xml', '.yml', '.yaml', '.txt', '.ps1', '.sh']);
const textNames = new Set(['.npmrc', '.nvmrc', '.gitignore', '.gitattributes', '.env', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'CONTRIBUTING.md', 'PUBLISH_FLOW.md', 'RELEASE.md', 'SYNC_FLOW_COMPLETE.md', 'ELECTRON_BUILD.md']);

function isTextCandidate(file) {
  const ext = path.extname(file).toLowerCase();
  return textExts.has(ext) || textNames.has(path.basename(file)) || file.endsWith('.env.example');
}

function gitLines(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
}

function hasRef(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef() {
  return hasRef('@{upstream}') ? '@{upstream}' : null;
}

const baseRef = resolveBaseRef();
const listedFiles = all
  ? gitLines(['ls-files'])
  : Array.from(new Set([
      ...gitLines(['diff', '--name-only', '--diff-filter=ACMRTUXB']),
      ...gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']),
      ...(baseRef ? gitLines(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${baseRef}...HEAD`]) : []),
    ]));

const files = listedFiles.filter(isTextCandidate);
const problems = [];

for (const file of files) {
  const abs = path.join(root, file);
  const buf = readFileSync(abs);
  if (buf.length === 0 || buf.includes(0)) continue;

  let text;
  try {
    text = utf8.decode(buf);
  } catch {
    problems.push(`${file}: invalid utf-8`);
    continue;
  }

  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const hasCrlf = text.includes('\r\n');
  if (!hasBom && !hasCrlf) continue;

  if (fix) {
    const next = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    writeFileSync(abs, next, 'utf8');
  } else {
    problems.push(`${file}: ${hasBom ? 'BOM ' : ''}${hasCrlf ? 'CRLF' : ''}`.trim());
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(fix ? 'encoding normalized' : 'encoding ok');
}
