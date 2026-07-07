// Spine → Laya .sk 转换 CLI
// 用法: node spineToSkCli.cjs <spine文件夹路径> [输出文件夹路径]
//
// 输入文件夹应包含（与 Laya IDE 一致）:
//   <name>.json   Spine 骨骼/动画 JSON (3.4-3.7)
//   <name>.atlas  Spine atlas 文本
//   <name>.png    Spine atlas 纹理
//
// 输出（同名于 .json 的 basename）:
//   <name>.sk     Laya 骨骼动画二进制
//   <name>.png    纹理（直接复制源 png）

const fs = require('fs');
const path = require('path');

const { loadLayaAnimationTool } = require('./loader.cjs');

// 从 PNG 文件头读宽高（不需要解码图像数据）
function readPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    // PNG 签名 8B + IHDR(4B长度 + "IHDR" + width(4) + height(4))
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG: ' + filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    fs.closeSync(fd);
  }
}

// 在文件夹里找 .json + .atlas + .png（同名）的 Spine 工程
// 支持三种布局：
//   1) 平铺：     D:/foo/bar/game.json + game.atlas + game.png
//   2) json 子目录：D:/foo/bar/json/game.json + ...   （IDE 标配）
//   3) 同名子目录：D:/foo/bar/{bar_name}/game.json + ...
//      （部分工程把素材整个塞到与外层同名的子文件夹里，比如点赞页面的 zx_sthsh_zan1/zx_sthsh_zan1/）
function locateSpineFiles(inputDir) {
  // 收集候选目录：当前、json 子目录、所有一级子目录（兜底兼容各种打包习惯）
  const candidates = [inputDir, path.join(inputDir, 'json')];
  try {
    const entries = fs.readdirSync(inputDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'json' && e.name !== 'images') {
        candidates.push(path.join(inputDir, e.name));
      }
    }
  } catch { /* ignore */ }

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }
    const jsons = files.filter((f) => f.toLowerCase().endsWith('.json'));
    for (const json of jsons) {
      const base = json.replace(/\.json$/i, '');
      const atlas = path.join(dir, base + '.atlas');
      const png = path.join(dir, base + '.png');
      if (fs.existsSync(atlas) && fs.existsSync(png)) {
        return { name: base, dir, json: path.join(dir, json), atlas, png };
      }
    }
  }
  throw new Error(`未在 ${inputDir} 中找到 Spine 工程（需要 *.json + *.atlas + *.png 三件套）`);
}

function convertSpineToSk(inputDir, outputDir) {
  const tool = loadLayaAnimationTool();
  const { SpineFactory, TestLayaAnimation, Tools, parseJsonInSandbox } = tool;

  const files = locateSpineFiles(inputDir);
  console.log(`[spineToSk] 输入: ${files.dir}`);
  console.log(`[spineToSk]   ${files.name}.{json,atlas,png}`);

  // 读取 Spine 三件套
  // spine json 必须在 sandbox 内部 parse — vendor 代码用 `arr instanceof Array`
  // 检查曲线数据，要求所有数组用同一个 Array 构造函数
  const spineJson = parseJsonInSandbox(fs.readFileSync(files.json, 'utf8'));
  const atlasText = fs.readFileSync(files.atlas, 'utf8');
  const { width, height } = readPngSize(files.png);

  // Atlas.init 需要 textureMap：{ '<atlas第一行的纹理文件名>': { width, height } }
  // Spine atlas 第一行就是 "game.png"
  const firstLine = atlasText.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!firstLine) throw new Error('atlas 文件为空或格式错误');
  const textureMap = { [firstLine.trim()]: { width, height } };

  // 跑 IDE 转换链路
  const factory = new SpineFactory();
  factory.parseData(textureMap, atlasText, spineJson);

  const tla = new TestLayaAnimation();
  // 此版本 getLayaBoneAni 直接返回 LayaAnimationData 对象（IDE 注释里 JSON.parse 是早期版本残留）
  const ret = tla.getLayaBoneAni(
    factory.mSkeletonData.mArmatureArr,
    factory.mDBTextureDataArray,
  );
  const layaAnimationData = (typeof ret === 'string') ? JSON.parse(ret) : ret;

  // getObjectBuffer 在 Tools.prototype 上，借一个 Tools 实例调用
  // mFactoryType=1 表示 Spine（默认 0 是 DragonBones）
  // 这一字节写在 .sk 文件末尾，影响运行时分支判断
  const tools = new Tools();
  tools.mFactoryType = 1;
  const arrayBuf = tools.getObjectBuffer(layaAnimationData);
  const skBuffer = Buffer.from(arrayBuf);

  // 写出
  const outDir = outputDir || files.dir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const skPath = path.join(outDir, files.name + '.sk');
  const pngPath = path.join(outDir, files.name + '.png');
  fs.writeFileSync(skPath, skBuffer);
  fs.copyFileSync(files.png, pngPath);

  // 只拷贝 events 中引用的音频文件
  try {
    const raw = JSON.parse(fs.readFileSync(files.json, 'utf8'));
    if (raw.events && typeof raw.events === 'object') {
      const audioDirs = [inputDir, path.join(inputDir, 'mp3'), path.join(inputDir, 'audio'), path.join(inputDir, 'sound')];
      for (const ev of Object.values(raw.events)) {
        if (!ev || !ev.audio) continue;
        for (const dir of audioDirs) {
          const src = path.join(dir, ev.audio);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(outDir, ev.audio));
            console.log(`[spineToSk] 音频: ${path.join(outDir, ev.audio)}`);
            break;
          }
        }
      }
    }
  } catch { /* ignore */ }

  console.log(`[spineToSk] 输出: ${skPath} (${skBuffer.length} bytes)`);
  console.log(`[spineToSk]      ${pngPath}`);
  return { skPath, pngPath };
}

function locateAllSpineFiles(inputDir) {
  const candidates = [inputDir, path.join(inputDir, 'json')];
  try {
    const entries = fs.readdirSync(inputDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'json' && e.name !== 'images') {
        candidates.push(path.join(inputDir, e.name));
      }
    }
  } catch { /* ignore */ }

  const results = [];
  const seen = new Set();
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }
    const jsons = files.filter((f) => f.toLowerCase().endsWith('.json'));
    for (const json of jsons) {
      const base = json.replace(/\.json$/i, '');
      const atlas = path.join(dir, base + '.atlas');
      const png = path.join(dir, base + '.png');
      if (fs.existsSync(atlas) && fs.existsSync(png) && !seen.has(base.toLowerCase())) {
        seen.add(base.toLowerCase());
        results.push({ name: base, dir, json: path.join(dir, json), atlas, png });
      }
    }
  }
  return results;
}

function convertAllSpineToSk(inputDir, outputDir) {
  const allFiles = locateAllSpineFiles(inputDir);
  if (allFiles.length === 0) {
    throw new Error(`未在 ${inputDir} 中找到 Spine 工程（需要 *.json + *.atlas + *.png 三件套）`);
  }
  const tool = loadLayaAnimationTool();
  const { SpineFactory, TestLayaAnimation, Tools, parseJsonInSandbox } = tool;
  const outDir = outputDir || inputDir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  const referencedAudio = new Set();
  for (const files of allFiles) {
    console.log(`[spineToSk] 转换: ${files.name}`);
    const jsonText = fs.readFileSync(files.json, 'utf8');
    const spineJson = parseJsonInSandbox(jsonText);
    const atlasText = fs.readFileSync(files.atlas, 'utf8');
    const { width, height } = readPngSize(files.png);
    const firstLine = atlasText.split(/\r?\n/).find((l) => l.trim().length > 0);
    if (!firstLine) { console.warn(`[spineToSk] ${files.name}.atlas 为空，跳过`); continue; }
    const textureMap = { [firstLine.trim()]: { width, height } };
    const factory = new SpineFactory();
    factory.parseData(textureMap, atlasText, spineJson);
    const tla = new TestLayaAnimation();
    const ret = tla.getLayaBoneAni(factory.mSkeletonData.mArmatureArr, factory.mDBTextureDataArray);
    const layaAnimationData = (typeof ret === 'string') ? JSON.parse(ret) : ret;
    const tools = new Tools();
    tools.mFactoryType = 1;
    const arrayBuf = tools.getObjectBuffer(layaAnimationData);
    const skBuffer = Buffer.from(arrayBuf);
    const skPath = path.join(outDir, files.name + '.sk');
    const pngPath = path.join(outDir, files.name + '.png');
    fs.writeFileSync(skPath, skBuffer);
    fs.copyFileSync(files.png, pngPath);
    console.log(`[spineToSk] 输出: ${skPath} (${skBuffer.length} bytes)`);
    results.push({ skPath, pngPath });

    // 收集 events 中引用的音频文件名
    try {
      const raw = JSON.parse(jsonText);
      if (raw.events && typeof raw.events === 'object') {
        for (const ev of Object.values(raw.events)) {
          if (ev && ev.audio) referencedAudio.add(ev.audio);
        }
      }
    } catch { /* ignore */ }
  }

  // 只拷贝被 events 引用的音频文件
  if (referencedAudio.size > 0) {
    const audioDirs = [inputDir, path.join(inputDir, 'mp3'), path.join(inputDir, 'audio'), path.join(inputDir, 'sound')];
    const copied = new Set();
    for (const audioName of referencedAudio) {
      if (copied.has(audioName)) continue;
      for (const dir of audioDirs) {
        const src = path.join(dir, audioName);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(outDir, audioName));
          copied.add(audioName);
          console.log(`[spineToSk] 音频: ${path.join(outDir, audioName)}`);
          break;
        }
      }
    }
  }

  return results;
}

if (require.main === module) {
  const [, , inputDir, outputDir] = process.argv;
  if (!inputDir) {
    console.error('用法: node spineToSkCli.cjs <spine文件夹路径> [输出文件夹路径]');
    process.exit(1);
  }
  try {
    convertSpineToSk(inputDir, outputDir);
  } catch (e) {
    console.error('[spineToSk] 失败:', e.message);
    console.error(e.stack);
    process.exit(2);
  }
}

module.exports = { convertSpineToSk, convertAllSpineToSk };
