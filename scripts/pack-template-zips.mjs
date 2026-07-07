import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const TEMPLATES = [
  { src: 'public/builtin/layaProjectModel/Game1_LT', out: 'public/builtin/layaProjectModel/Game1_LT.zip' },
  { src: 'public/builtin/layaProjectModel/Game1_HW', out: 'public/builtin/layaProjectModel/Game1_HW.zip' },
  { src: 'public/builtin/layaProjectModel/Game1_PREVIEW', out: 'public/builtin/layaProjectModel/Game1_PREVIEW.zip' },
];

async function pack(srcDir, outFile) {
  const zip = new JSZip();
  function addDir(dirPath, zipPrefix) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) addDir(full, zipPath);
      else zip.file(zipPath, fs.readFileSync(full));
    }
  }
  addDir(srcDir, '');
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outFile, buf);
  const verify = await JSZip.loadAsync(buf);
  let count = 0;
  verify.forEach((p, f) => { if (!f.dir && !p.endsWith('/')) count++; });
  console.log(`${path.basename(outFile)}: ${count} files`);
}

for (const { src, out } of TEMPLATES) {
  await pack(src, out);
}
