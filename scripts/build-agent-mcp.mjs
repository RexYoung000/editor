import { build } from 'esbuild';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');

await build({
  entryPoints: [resolve(projectRoot, 'electron/mcp/forgeMcpServer.cjs')],
  outfile: resolve(projectRoot, 'electron/vendor/forge-mcp-server.bundle.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  minify: true,
  sourcemap: false,
  legalComments: 'eof',
  logLevel: 'info',
});
