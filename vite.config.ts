import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import * as crypto from 'node:crypto'
import { createRequire } from 'module'

// 本地定义 lessonSuffix 函数（避免引入跨模块构建依赖）
function lessonSuffix(kind?: string): string {
  if (kind === 'homework') return '_LessonHW';
  if (kind === 'sEvaluation') return '_LessonSSEVALUATION';
  if (kind === 'review') return '_LessonFXK';
  return '_LessonZK';
}

// Vite 会把 vite.config.ts 编译到 .vite-temp/ 跑，导致 require('jszip') 内部的相对 require 失效。
// 锚定到项目根，让 require 从 forge/node_modules 解析。
const requireFromConfig = createRequire(path.resolve(process.cwd(), 'vite.config.ts'));

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COMPILED_ZIP_SIZE = 300 * 1024 * 1024; // 300MB

// 资源库根目录（绝对路径，dev server 启动时一次性算出）
const LIBRARY_ROOT = path.resolve(process.cwd(), 'public/builtin/library');
const QUICK_PRESET_ROOT = path.join(LIBRARY_ROOT, '通用素材', '控件');

const QUICK_PRESET_RULES = {
  confirm: /确定|確定|确认|確認|提交|完成答题|完成答題|一键完成|一鍵完成/,
  previous: /上一页|上一頁|上页|上頁|左翻页|左翻頁/,
  next: /下一页|下一頁|下页|下頁|右翻页|右翻頁/,
  audio: /播放声音|播放聲音|播放音频|播放音頻|喇叭|音频|音頻|音效|播放/,
  brush: /画笔|畫筆|笔-小|筆/,
  clear: /清空|橡皮|擦除/,
} as const;

type QuickPresetKind = keyof typeof QUICK_PRESET_RULES;

function detectQuickPresetTag(text: string, choices: Array<[RegExp, string]>): string {
  for (const [pattern, label] of choices) {
    if (pattern.test(text)) return label;
  }
  return '';
}

function listQuickPresets(kind: QuickPresetKind) {
  if (!fs.existsSync(QUICK_PRESET_ROOT)) return [];

  const presets: Array<{
    libraryPath: string;
    name: string;
    series: string;
    color: string;
    language: string;
    theme: string;
    directory: string;
  }> = [];
  const imagePattern = /\.(png|jpe?g|gif|webp)$/i;
  const namePattern = QUICK_PRESET_RULES[kind];

  function walk(absDir: string, relDir: string): void {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const childAbs = path.join(absDir, entry.name);
      const childRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(childAbs, childRel);
        continue;
      }
      if (!imagePattern.test(entry.name) || !namePattern.test(entry.name)) continue;

      const pathParts = relDir.split('/').filter(Boolean);
      const searchText = `${relDir}/${entry.name}`;
      const series = pathParts[0] ?? '';
      const theme = series.startsWith('S9') && pathParts[1] && pathParts[1] !== '控件'
        ? pathParts[1]
        : '';
      presets.push({
        libraryPath: `通用素材/控件/${childRel}`,
        name: entry.name.replace(/\.[^.]+$/, ''),
        series,
        color: detectQuickPresetTag(searchText, [
          [/绿色|绿-/u, '绿色'],
          [/蓝色|蓝-/u, '蓝色'],
          [/黄色|黄-/u, '黄色'],
          [/橙色|橙/u, '橙色'],
          [/红色|红-/u, '红色'],
        ]),
        language: detectQuickPresetTag(searchText, [
          [/简体/u, '简体'],
          [/繁体/u, '繁体'],
          [/英文/u, '英文'],
        ]),
        theme,
        directory: relDir,
      });
    }
  }

  walk(QUICK_PRESET_ROOT, '');
  return presets.sort((a, b) => a.libraryPath.localeCompare(b.libraryPath, 'zh-CN', { numeric: true }));
}

/**
 * 把外部传入的相对路径规范化并做越界校验。
 * 拒绝绝对路径、Windows 盘符、`..` 越界、null 字符。
 */
function sanitizeLibraryPath(rel: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!rel) return { ok: true, value: '' };
  if (rel.includes('\0')) return { ok: false, error: '非法字符' };
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) {
    return { ok: false, error: '不接受绝对路径' };
  }
  const normalized = path.posix.normalize(rel.replace(/\\/g, '/'));
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    return { ok: false, error: '路径越界' };
  }
  return { ok: true, value: normalized.replace(/^\/+/, '') };
}

function jsonOk(res: any, data: Record<string, unknown>) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, ...data }));
}

function jsonError(res: any, status: number, message: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error: message }));
}

/**
 * 检测一个目录是否为 Spine 工程文件夹。
 * 复刻 src/utils/electronFs.ts findAllSpineJsons + electron/spineToSk/spineToSkCli.cjs locateSpineFiles 的逻辑：
 * 候选目录 = 自身、json 子目录、所有非 json/images 的一级子目录；
 * 任一候选目录里存在 X.json + X.atlas + X.png 同名三件套即视为 Spine 工程。
 */
function detectSpineProject(absDir: string): boolean {
  let topEntries: fs.Dirent[];
  try {
    topEntries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return false;
  }

  const candidates: string[] = [absDir, path.join(absDir, 'json')];
  for (const e of topEntries) {
    if (e.isDirectory() && e.name !== 'json' && e.name !== 'images') {
      candidates.push(path.join(absDir, e.name));
    }
  }

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const fileNames = entries.filter(e => !e.isDirectory()).map(e => e.name);
    const lowerSet = new Set(fileNames.map(n => n.toLowerCase()));
    for (const f of fileNames) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      const base = f.slice(0, -5);
      const baseLower = base.toLowerCase();
      if (lowerSet.has(`${baseLower}.atlas`) && lowerSet.has(`${baseLower}.png`)) {
        return true;
      }
    }
  }
  return false;
}

type HashCacheEntry = { hash: string; mtime: number; size: number };
const HASH_CACHE_DIR = path.join(LIBRARY_ROOT, '.cache');
const HASH_CACHE_FILE = path.join(HASH_CACHE_DIR, 'hash.json');

const hashCache = new Map<string, HashCacheEntry>();
let hashCacheLoaded = false;
let hashCacheSaveTimer: NodeJS.Timeout | null = null;

function loadHashCacheFromDisk(): void {
  if (hashCacheLoaded) return;
  hashCacheLoaded = true;
  try {
    if (!fs.existsSync(HASH_CACHE_FILE)) return;
    const raw = fs.readFileSync(HASH_CACHE_FILE, 'utf-8');
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object'
          && typeof (v as any).hash === 'string'
          && typeof (v as any).mtime === 'number'
          && typeof (v as any).size === 'number') {
          hashCache.set(k, v as HashCacheEntry);
        }
      }
    }
  } catch {
    // 缓存损坏，忽略，用空缓存继续
  }
}

function scheduleSaveHashCacheToDisk(): void {
  if (hashCacheSaveTimer) clearTimeout(hashCacheSaveTimer);
  hashCacheSaveTimer = setTimeout(() => {
    hashCacheSaveTimer = null;
    try {
      if (!fs.existsSync(HASH_CACHE_DIR)) fs.mkdirSync(HASH_CACHE_DIR, { recursive: true });
      const obj: Record<string, HashCacheEntry> = {};
      for (const [k, v] of hashCache.entries()) obj[k] = v;
      fs.writeFileSync(HASH_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.error('[library] hash cache save failed:', e);
    }
  }, 500);
}

/**
 * 算指定文件 SHA-256 前 8 字符 hex（约 32 bit），有缓存则复用，文件 mtime/size 变了重算。
 */
function computeFileHash(safeRel: string, absFile: string): string {
  loadHashCacheFromDisk();
  const stat = fs.statSync(absFile);
  const cached = hashCache.get(safeRel);
  if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
    return cached.hash;
  }
  const buf = fs.readFileSync(absFile);
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
  hashCache.set(safeRel, { hash, mtime: stat.mtimeMs, size: stat.size });
  scheduleSaveHashCacheToDisk();
  return hash;
}

function forgePlugin() {
  const courseOutputDirs = new Map<string, string>(); // courseId → localOutputDir
  const installersDir = path.resolve(__dirname, 'installers');

  
  return {
    name: 'forge-server',
    configureServer(server: any) {
      // preview-server 静态代理：将 /preview-server/ 请求映射到物理文件
      server.middlewares.use((req: any, res: any, next: any) => {
        const rawUrl = (req.url || '').replace(/\/\/+/g, '/');
        if (!rawUrl.startsWith('/preview-server')) return next();
        const afterPrefix = rawUrl.slice('/preview-server'.length);
        let relativePath = (afterPrefix.startsWith('/') ? afterPrefix.slice(1) : afterPrefix).replace(/\?.*$/, '');
        if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
        const filePath = path.resolve(__dirname, 'preview-server', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css',
            '.atlas': 'text/plain', '.sk': 'application/octet-stream',
            '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });

      // GameLoader 在 preview-server/ 下运行时，资源请求不带 /preview-server/ 前缀
      // 代理 share/、cfg/、res/ 等根路径请求到 preview-server/ 对应文件
      const previewServerRootPaths = ['/share/', '/cfg/', '/res/', '/share_chinese/', '/share_english/', '/share_extend/', '/lessons-en/', '/record/'];
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || '').replace(/\/\/+/g, '/').replace(/\?.*$/, '');
        if (previewServerRootPaths.some(p => url.startsWith(p))) {
          const filePath = path.resolve(__dirname, 'preview-server', url.slice(1));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const mimeTypes: Record<string, string> = {
              '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
              '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css',
              '.atlas': 'text/plain', '.sk': 'application/octet-stream',
              '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });

      // 课件文件动态代理：拦截 /preview-server/lessons/ 和根路径 /lessons/ 请求
      // GameLoader 在 preview-server/index.html 下运行，资源请求用相对路径（如 lessons/Math/V8/...），
      // 这里从 URL 中提取 *_LessonZK 或 *_LessonHW 段，再查找实际文件位置。
      function serveCourseFile(urlPath: string, res: any, next: any) {
        const lessonMatch = urlPath.match(/([^/]+_Lesson(?:ZK|HW|SSEVALUATION|FXK))/);
        if (!lessonMatch) { next(); return; }
        const projName = lessonMatch[1];
        const suffixMatch = projName.match(/_Lesson(ZK|HW|SSEVALUATION|FXK)$/);
        const courseId = suffixMatch
          ? projName.slice(0, -(suffixMatch[0].length)) : null;

        const afterProj = urlPath.slice(urlPath.indexOf(projName) + projName.length);

        let baseDir: string | null = null;
        if (courseId && courseOutputDirs.has(courseId)) {
          baseDir = courseOutputDirs.get(courseId)!;
        } else {
          const fallbackDir = path.resolve(__dirname, 'preview-server/lessons', projName);
          if (fs.existsSync(fallbackDir)) baseDir = fallbackDir;
        }

        if (!baseDir) { next(); return; }

        const relativePath = afterProj.startsWith('/') ? afterProj.slice(1) : afterProj;
        if (!relativePath) { next(); return; }
        const filePath = path.join(baseDir, relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css',
            '.atlas': 'text/plain', '.sk': 'application/octet-stream',
            '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      }

      server.middlewares.use('/preview-server/lessons', (req: any, res: any, next: any) => {
        serveCourseFile(req.url || '', res, next);
      });
      // GameLoader 在 preview-server/ 下运行时，资源请求不带 /preview-server/ 前缀
      server.middlewares.use('/lessons', (req: any, res: any, next: any) => {
        serveCourseFile(req.url || '', res, next);
      });

      // preview-game HTML 拦截
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/preview-game/') && req.url?.endsWith('.html')) {
          const filePath = path.resolve(__dirname, 'public', req.url.slice(1));
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/html');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });

      // GET /api/ws-config — 返回打包机 WebSocket 配置（运行 vite 的机器通过环境变量设定）
      server.middlewares.use('/api/ws-config', (req: any, res: any) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end('Method not allowed'); return; }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          wsServer: process.env.WS_SERVER || 'ws://10.200.15.62:8187', // 打包机 WebSocket 接口地址
          wsHost: process.env.WS_HOST || '10.200.15.41:7800',          // 打包机拉取课件的目标服务器地址
        }));
      });
      // POST /api/upload-compiled-zip — Electron 编译发布产物 zip 上传
      // 接收 multipart：courseId / teacherId / kind / file(zip)
      // Vite 端在内存解压 → 写入 preview-server/lessons/{projName}/，zip 不落盘
      server.middlewares.use('/api/upload-compiled-zip', (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_COMPILED_ZIP_SIZE + 1024 * 10) {
            res.statusCode = 413;
            res.end(JSON.stringify({ ok: false, error: 'zip 过大，限制 300MB' }));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', async () => {
          try {
            const raw = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';
            const boundary = contentType.split('boundary=')[1];
            if (!boundary) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: '缺少 boundary' })); return; }
            const parts = parseMultipart(raw, boundary);
            const courseId = parts.find((p: any) => p.name === 'courseId')?.data?.toString() || '';
            const teacherId = parts.find((p: any) => p.name === 'teacherId')?.data?.toString() || '';
            const kind = parts.find((p: any) => p.name === 'kind')?.data?.toString() || 'normal';
            const filePart = parts.find((p: any) => p.filename);
            if (!courseId || !filePart) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: '缺少 courseId 或 file' })); return; }

            const tid = teacherId || '';
            const suffix = lessonSuffix(kind);
            const projName = tid ? `test_${tid}_${courseId}${suffix}` : `${courseId}${suffix}`;
            const regKey = tid ? `test_${tid}_${courseId}` : courseId;
            const lessonDir = path.resolve(__dirname, 'preview-server/lessons', projName);

            // 清空旧目录后重建
            if (fs.existsSync(lessonDir)) fs.rmSync(lessonDir, { recursive: true, force: true });
            fs.mkdirSync(lessonDir, { recursive: true });

            // 内存解压 zip → 写入 lessonDir
            const JSZip = requireFromConfig('jszip');
            const zip = await JSZip.loadAsync(filePart.data);
            const entries = Object.values(zip.files) as any[];
            for (const entry of entries) {
              if (entry.dir) continue;
              const content = await entry.async('nodebuffer');
              const destPath = path.join(lessonDir, entry.name);
              fs.mkdirSync(path.dirname(destPath), { recursive: true });
              fs.writeFileSync(destPath, content);
            }

            // 注册路由（GameLoader 资源请求按 regKey 查找）
            courseOutputDirs.set(regKey, lessonDir);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, cid: courseId }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      });

      // POST /api/upload-resource — 远程 Electron 上传资源（视频等）直接写入 preview-server lesson 目录
      server.middlewares.use('/api/upload-resource', (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_VIDEO_SIZE + 1024 * 10) {
            res.statusCode = 413;
            res.end(JSON.stringify({ ok: false, error: '文件过大，限制 100MB' }));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';
            const boundary = contentType.split('boundary=')[1];
            if (!boundary) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: '缺少 boundary' })); return; }
            const parts = parseMultipart(raw, boundary);
            const courseId = parts.find((p: any) => p.name === 'courseId')?.data?.toString() || 'default';
            const teacherId = parts.find((p: any) => p.name === 'teacherId')?.data?.toString() || '';
            const kind = parts.find((p: any) => p.name === 'kind')?.data?.toString() || 'normal';
            const destPath = parts.find((p: any) => p.name === 'destPath')?.data?.toString();
            const filePart = parts.find((p: any) => p.filename);
            if (!destPath || !filePart) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: '缺少 destPath 或 file' })); return; }
            const tid = teacherId || '';
            const suffix = lessonSuffix(kind);
            const projName = tid ? `test_${tid}_${courseId}${suffix}` : `${courseId}${suffix}`;
            const lessonDir = path.resolve(__dirname, 'preview-server/lessons', projName);
            if (!fs.existsSync(lessonDir)) { res.statusCode = 404; res.end(JSON.stringify({ ok: false, error: 'lesson 目录不存在，请先发布' })); return; }
            const filePath = path.join(lessonDir, destPath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, filePart.data);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); }
        });
      });

      // POST /api/save-preset-thumbnail — 把 canvas 截图保存到 public/builtin/editor/
      server.middlewares.use('/api/save-preset-thumbnail', (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(body);
            if (!name || !dataUrl) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: '缺少 name 或 dataUrl' })); return; }
            const base64 = dataUrl.split(',')[1];
            if (!base64) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: 'dataUrl 格式错误' })); return; }
            const filePath = path.resolve(__dirname, 'public/builtin/editor', `${name}.png`);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: `/builtin/editor/${name}.png` }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      });

      // ─── 资源库 API ───
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url) return next();

        const cleanedUrl = req.url.replace(/\/\/+/g, '/');
        const urlObj = new URL(cleanedUrl, 'http://localhost');
        const pathname = urlObj.pathname;

        // GET /api/library/quick-presets — 按功能类型返回通用素材中的快捷组件候选
        if (pathname === '/api/library/quick-presets') {
          try {
            const kind = urlObj.searchParams.get('kind') as QuickPresetKind | null;
            if (!kind || !(kind in QUICK_PRESET_RULES)) {
              return jsonError(res, 400, '不支持的快捷组件类型');
            }
            return jsonOk(res, { kind, presets: listQuickPresets(kind) });
          } catch (e: any) {
            return jsonError(res, 500, String(e?.message ?? e));
          }
        }

        // GET /api/library/list — 列出某资源库目录的内容
        if (pathname === '/api/library/list') {
          try {
            const relPath = decodeURIComponent(urlObj.searchParams.get('path') ?? '');
            const safe = sanitizeLibraryPath(relPath);
            if (!safe.ok) return jsonError(res, 400, safe.error);

            const absDir = path.join(LIBRARY_ROOT, safe.value);
            if (!fs.existsSync(absDir)) return jsonError(res, 404, '目录不存在');
            const stat = fs.statSync(absDir);
            if (!stat.isDirectory()) return jsonError(res, 400, '不是目录');

            const dirents = fs.readdirSync(absDir, { withFileTypes: true });
            const entries = dirents
              .filter(e => !e.name.startsWith('.'))
              .map((e) => {
                const full = path.join(absDir, e.name);
                if (e.isDirectory()) {
                  return {
                    name: e.name,
                    isDir: true,
                    isSpineProject: detectSpineProject(full),
                  };
                }
                const s = fs.statSync(full);
                return { name: e.name, isDir: false, size: s.size, mtime: s.mtimeMs };
              });
            return jsonOk(res, { path: safe.value, entries });
          } catch (e: any) {
            return jsonError(res, 500, String(e?.message ?? e));
          }
        }

        // GET /api/library/file-info — 取单文件 hash/size/mtime（用于秒传 / 比对）
        if (pathname === '/api/library/file-info') {
          try {
            const relPath = decodeURIComponent(urlObj.searchParams.get('path') ?? '');
            const safe = sanitizeLibraryPath(relPath);
            if (!safe.ok) return jsonError(res, 400, safe.error);
            if (!safe.value) return jsonError(res, 400, '需要 path 参数');

            const absFile = path.join(LIBRARY_ROOT, safe.value);
            if (!fs.existsSync(absFile)) return jsonError(res, 404, '文件不存在');
            const stat = fs.statSync(absFile);
            if (!stat.isFile()) return jsonError(res, 400, '不是文件');

            const hash = computeFileHash(safe.value, absFile);
            return jsonOk(res, { path: safe.value, hash, size: stat.size, mtime: stat.mtimeMs });
          } catch (e: any) {
            return jsonError(res, 500, String(e?.message ?? e));
          }
        }

        // GET /api/library/spine-files — 列出 Spine 工程目录下所有受支持的资源文件
        if (pathname === '/api/library/spine-files') {
          try {
            const relPath = decodeURIComponent(urlObj.searchParams.get('path') ?? '');
            const safe = sanitizeLibraryPath(relPath);
            if (!safe.ok) return jsonError(res, 400, safe.error);

            const absDir = path.join(LIBRARY_ROOT, safe.value);
            if (!fs.existsSync(absDir)) return jsonError(res, 404, '目录不存在');
            if (!detectSpineProject(absDir)) return jsonError(res, 400, '不是 Spine 工程文件夹');

            const SUPPORTED = /\.(json|atlas|png|mp3|wav|ogg)$/i;
            const files: string[] = [];
            function walk(currentAbs: string, currentRel: string) {
              const entries = fs.readdirSync(currentAbs, { withFileTypes: true });
              for (const e of entries) {
                if (e.name.startsWith('.')) continue;
                const childAbs = path.join(currentAbs, e.name);
                const childRel = currentRel ? `${currentRel}/${e.name}` : e.name;
                if (e.isDirectory()) {
                  walk(childAbs, childRel);
                } else if (SUPPORTED.test(e.name)) {
                  files.push(childRel);
                }
              }
            }
            walk(absDir, '');

            return jsonOk(res, { path: safe.value, files });
          } catch (e: any) {
            return jsonError(res, 500, String(e?.message ?? e));
          }
        }

        next();
      });

      // GET /api/download-vcredist — 流式下载 VC++ Redistributable（仅 Windows）
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.replace(/\/\/+/g, '/').replace(/\?.*$/, '');
        if (!url?.startsWith('/api/download-vcredist')) return next();

        const fileName = 'vc_redist.x64.exe';
        const filePath = path.join(installersDir, fileName);

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('VC++ Redistributable installer not found');
          return;
        }

        const stat = fs.statSync(filePath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

function parseMultipart(raw: Buffer, boundary: string): { name?: string; filename?: string; data: Buffer }[] {
  const sep = Buffer.from(`--${boundary}`);
  const parts: { name?: string; filename?: string; data: Buffer }[] = [];
  let start = 0;

  while (true) {
    const idx = raw.indexOf(sep, start);
    if (idx === -1) break;
    if (start > 0) {
      const partBuf = raw.subarray(start, idx - 2); // -2 for \r\n before boundary
      const headerEnd = partBuf.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = partBuf.subarray(0, headerEnd).toString();
        const data = partBuf.subarray(headerEnd + 4);
        const nameMatch = header.match(/name="([^"]+)"/);
        const fileMatch = header.match(/filename="([^"]+)"/);
        parts.push({
          name: nameMatch?.[1],
          filename: fileMatch?.[1],
          data,
        });
      }
    }
    start = idx + sep.length + 2; // +2 for \r\n after boundary
  }

  return parts;
}

export default defineConfig({
  plugins: [react(), forgePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  server: {
    port: 6688,
    host: '0.0.0.0',
    cors: true,
  },
  appType: 'spa',
})
