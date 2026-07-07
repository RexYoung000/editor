import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const GAME_DIR = 'public/builtin/runtime/game';
const OUTPUT = 'public/builtin/runtime/game.zip';

async function pack() {
  const zip = new JSZip();

  function addDir(dirPath, zipPrefix) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        addDir(full, zipPath);
      } else {
        zip.file(zipPath, fs.readFileSync(full));
      }
    }
  }

  addDir(GAME_DIR, '');

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(OUTPUT, buf);

  const verify = await JSZip.loadAsync(buf);
  let count = 0;
  const dirs = new Set();
  verify.forEach((p, f) => {
    if (!f.dir && !p.endsWith('/')) {
      count++;
      dirs.add(p.split('/')[0]);
    }
  });
  console.log(`game.zip: ${count} files, directories: ${Array.from(dirs).join(', ')}`);
}

pack().catch(e => { console.error(e); process.exit(1); });