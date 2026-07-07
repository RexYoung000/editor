# 资源库（远程文件浏览）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 forge 编辑器加一套"资源库"机制，让维护者把图片/音频/Spine 拷进 `public/builtin/library/` 下任意目录后，编辑器无需改代码即可浏览选用，所有库下载来的资源都走"已上传文件"链路被现有导出逻辑零修改地处理。

**Architecture:** Vite 提供 3 个只读 API（list / file-info / spine-files），前端新增 LibraryBrowser 组件做模态浏览，选中后调用新增的 `downloadLibraryFile`/`downloadLibrarySpine` 工具函数把资源拷到本地课件目录的 `images/library/` (图片) / `images/sound/library/` (音频) / `images/animation/library/` (视频) / `images/animation/aniN/` (Spine, 复用现有 importSpineFolder)。属性面板 type:'file'/spineFolder 字段拆成"资源库 + 本地"两个并排按钮。

**Tech Stack:** Vite (dev 中间件) + React + TypeScript + Electron (复用现有 IPC 不新增) + Node crypto (SHA-256 hash) + 现有 spineToSk 转换链路。

**测试策略说明：** 本项目无测试套件（详见 [CLAUDE.md](../../../CLAUDE.md)）。每个任务采用"启动 dev server + 浏览器/网络面板/磁盘核查"的手工验证方式代替单元测试。任何 UI 变更必须在浏览器实际操作一遍。

**配套文档：** [设计文档](../specs/2026-06-10-resource-library-design.md)

---

## 文件结构

| 文件 | 操作 | 主要职责 |
|---|---|---|
| `src/types/index.ts` | 修改 | 给 ElementProperty 加可选 `fileType?: 'image' \| 'audio' \| 'video'` |
| `src/elements/elementMeta.ts` | 修改 | Video 组件 `videoUrl` 字段加 `fileType: 'video'` |
| `vite.config.ts` | 修改 | forgePlugin 加 3 个 API（list/file-info/spine-files）+ sanitizeLibraryPath + detectSpineProject + hash 缓存 |
| `src/utils/electronFs.ts` | 修改 | 加 `downloadLibraryFile()` 和 `downloadLibrarySpine()` 函数 + `pickLocalSubdir()` 工具 |
| `src/components/LibraryBrowser.tsx` | 新建 | 资源库浏览器组件（模态弹窗 + 面包屑 + 文件夹/文件网格 + 错误弹窗） |
| `src/components/FieldRenderer.tsx` | 修改 | type:'file' 加"资源库文件"按钮、SpineFolderField 加"资源库 Spine 文件夹"按钮，原"上传"改"本地文件"，原"选择 Spine 文件夹"改"本地 Spine 文件夹" |

---

## 任务总览

| # | 任务 | 大致复杂度 |
|---|---|---|
| 1 | 类型扩展（ElementProperty.fileType） | 小 |
| 2 | Vite: 路径校验 + 常量 + LIBRARY_ROOT | 小 |
| 3 | Vite: detectSpineProject 辅助 | 小 |
| 4 | Vite: hash 缓存基础设施 | 中 |
| 5 | Vite: GET /api/library/list 接口 | 中 |
| 6 | Vite: GET /api/library/file-info 接口 | 小 |
| 7 | Vite: GET /api/library/spine-files 接口 | 小 |
| 8 | electronFs: pickLocalSubdir + downloadLibraryFile | 中 |
| 9 | electronFs: downloadLibrarySpine | 中 |
| 10 | LibraryBrowser: 组件骨架 + 数据加载 | 中 |
| 11 | LibraryBrowser: 文件夹/文件渲染 + 选中交互 | 中 |
| 12 | LibraryBrowser: 错误弹窗 + Loading 状态 | 小 |
| 13 | FieldRenderer: type:'file' 字段集成 | 中 |
| 14 | FieldRenderer: SpineFolderField 集成 | 中 |
| 15 | 端到端浏览器手工验收 | 小 |

---

## Task 1: 类型扩展（ElementProperty.fileType）

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/elements/elementMeta.ts`

- [ ] **Step 1: 在 ElementProperty 类型加 fileType 可选字段**

打开 `src/types/index.ts`，找到 ElementProperty 类型定义。在 `type` 字段附近加一个可选 `fileType` 字段。如果文件里 ElementProperty 接口长这样：

```ts
export interface ElementProperty {
  key: string;
  label: string;
  type: 'text' | 'number' | 'file' | 'spineFolder' | ...;
  group?: string;
  // ...
}
```

加一行：

```ts
export interface ElementProperty {
  key: string;
  label: string;
  type: 'text' | 'number' | 'file' | 'spineFolder' | ...;
  group?: string;
  /** 仅 type:'file' 时生效；undefined 时按 'image' 处理 */
  fileType?: 'image' | 'audio' | 'video';
  // ...
}
```

- [ ] **Step 2: 给 Video 组件的 videoUrl 字段标 fileType:'video'**

打开 `src/elements/elementMeta.ts`，找到 Video 组件定义（含 `videoUrl` 字段），把字段从：

```ts
{ key: 'videoUrl', label: '视频地址', type: 'file' }
```

改为：

```ts
{ key: 'videoUrl', label: '视频地址', type: 'file', fileType: 'video' }
```

其他 type:'file' 字段（绝大多数 skin/_xxxSkin）**不动**——它们都是图片，由 LibraryBrowser 走默认 'image'。

- [ ] **Step 3: 验证 TypeScript 编译通过**

运行：

```powershell
pnpm tsc --noEmit
```

预期：无错误输出（如果其他地方有类型错误，是已有的，不是本次改动引入）。

- [ ] **Step 4: 暂不 commit**

按用户偏好，所有任务的 commit 由大佬自己审完后手动操作。本计划任何步骤都不自动 git commit。

---


## Task 2: Vite 后端基础（常量 + 路径校验）

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 在 vite.config.ts 顶部加常量和 sanitize 函数**

在 `vite.config.ts` 的 `forgePlugin` 函数定义之前（导入语句之后），加入：

```ts
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
// 注意：如果上面这些已经 import 了，跳过即可

// 资源库根目录（绝对路径，dev server 启动时一次性算出）
const LIBRARY_ROOT = path.resolve(process.cwd(), 'public/builtin/library');

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

/** 把 res 上回 JSON */
function jsonOk(res: any, data: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function jsonError(res: any, status: number, message: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message }));
}
```

如果 `path` / `fs` / `crypto` 已在文件顶部导入了，**不要重复 import**，只在已导入的语句上补缺。

- [ ] **Step 2: 启动 dev server 确认未破坏现有逻辑**

```powershell
pnpm dev
```

预期：dev server 正常启动，监听 :6688，原有功能（编辑器加载、上传等）不受影响。Ctrl+C 停止。

- [ ] **Step 3: 创建 LIBRARY_ROOT 物理目录（占位）**

```powershell
New-Item -ItemType Directory -Force -Path "d:\aiproject\forge\public\builtin\library"
```

如果目录已存在，命令幂等不报错。

---

## Task 3: detectSpineProject 辅助函数

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 把 detectSpineProject 加入 vite.config.ts**

紧跟 sanitizeLibraryPath 后面加：

```ts
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
```

- [ ] **Step 2: TypeScript 编译检查**

```powershell
pnpm tsc --noEmit
```

预期：无新错误。

---

## Task 4: hash 缓存基础设施

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 加 hash 缓存数据结构和落盘逻辑**

紧跟 detectSpineProject 后面加：

```ts
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
```

- [ ] **Step 2: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无新错误。

- [ ] **Step 3: 启动 dev server，确认 .cache 目录尚未创建**

```powershell
pnpm dev
```

启动后另开终端：

```powershell
Test-Path "d:\aiproject\forge\public\builtin\library\.cache"
```

预期：**False**（缓存按需生成，启动时不主动创建）。Ctrl+C 停止 dev server。

---


## Task 5: GET /api/library/list 接口

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 在 forgePlugin 的 configureServer 里加 list 接口处理**

在 `vite.config.ts` 的 `forgePlugin()` 函数里找到 `configureServer(server)` 内的 `server.middlewares.use(...)` 中间件链路。在现有 `/api/upload-compiled-zip`、`/api/upload-resource` 等接口的同一片段里**插入新的中间件**（位置：在所有 `/api/*` 处理之前，在静态资源路由之后即可）：

```ts
server.middlewares.use(async (req, res, next) => {
  if (!req.url) return next();

  // 解析 URL（注意防御双斜杠/查询串）
  const cleanedUrl = req.url.replace(/\/\/+/g, '/');
  const urlObj = new URL(cleanedUrl, 'http://localhost');
  const pathname = urlObj.pathname;

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
        .filter(e => !e.name.startsWith('.'))  // 隐藏 .cache 等
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

  next();
});
```

具体位置：放在 `forgePlugin` 现有 middleware 链路里，跟其他 `/api/*` 同位置即可。**不要替换或删除任何已有 middleware**。

- [ ] **Step 2: 在资源库根目录建测试结构**

```powershell
$libRoot = "d:\aiproject\forge\public\builtin\library"
New-Item -ItemType Directory -Force -Path "$libRoot\测试分类\背景"
"placeholder" | Out-File -FilePath "$libRoot\测试分类\背景\placeholder.txt" -Encoding utf8
```

- [ ] **Step 3: 启动 dev server 并用 curl 验证**

```powershell
pnpm dev
```

另开终端：

```powershell
# 列根目录
curl.exe "http://localhost:6688/api/library/list?path="

# 列子目录
curl.exe "http://localhost:6688/api/library/list?path=%E6%B5%8B%E8%AF%95%E5%88%86%E7%B1%BB"
```

预期返回 JSON 含 `entries` 数组，根目录看到 `测试分类`，子目录看到 `背景`。

- [ ] **Step 4: 验证安全：路径越界返回 400**

```powershell
curl.exe -i "http://localhost:6688/api/library/list?path=../../"
```

预期：HTTP 400 + `{"error":"路径越界"}`。Ctrl+C 停止 dev server。

---

## Task 6: GET /api/library/file-info 接口

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 在 list 接口的 middleware 内同位置加 file-info 分支**

把 Task 5 加的 middleware 扩展，在 `if (pathname === '/api/library/list')` 块**之后、`next()` 之前**追加：

```ts
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
```

- [ ] **Step 2: 启动 dev server 测试**

```powershell
pnpm dev
```

另开终端，用刚才创建的 placeholder 测：

```powershell
curl.exe "http://localhost:6688/api/library/file-info?path=%E6%B5%8B%E8%AF%95%E5%88%86%E7%B1%BB%2F%E8%83%8C%E6%99%AF%2Fplaceholder.txt"
```

预期返回 `{ path, hash:"<8 字符 hex>", size, mtime }`。

- [ ] **Step 3: 验证缓存落盘**

第二次相同请求：

```powershell
curl.exe "http://localhost:6688/api/library/file-info?path=%E6%B5%8B%E8%AF%95%E5%88%86%E7%B1%BB%2F%E8%83%8C%E6%99%AF%2Fplaceholder.txt"
```

返回相同 hash。等 ≥1 秒后检查缓存文件存在：

```powershell
Test-Path "d:\aiproject\forge\public\builtin\library\.cache\hash.json"
Get-Content "d:\aiproject\forge\public\builtin\library\.cache\hash.json"
```

预期：True，且 JSON 含一条记录。Ctrl+C 停止 dev server。

---

## Task 7: GET /api/library/spine-files 接口

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: 在 file-info 分支后追加 spine-files 分支**

在 Task 6 加的 `if (pathname === '/api/library/file-info')` 块之后追加：

```ts
if (pathname === '/api/library/spine-files') {
  try {
    const relPath = decodeURIComponent(urlObj.searchParams.get('path') ?? '');
    const safe = sanitizeLibraryPath(relPath);
    if (!safe.ok) return jsonError(res, 400, safe.error);

    const absDir = path.join(LIBRARY_ROOT, safe.value);
    if (!fs.existsSync(absDir)) return jsonError(res, 404, '目录不存在');
    if (!detectSpineProject(absDir)) return jsonError(res, 400, '不是 Spine 工程文件夹');

    // 递归收集 .json/.atlas/.png/.mp3/.wav/.ogg 文件，相对 absDir 的 POSIX 路径
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
```

- [ ] **Step 2: 准备一个测试用的 Spine 三件套（最小化）**

为了测试接口，可以**临时**复制现有 sample Spine 进库（如果有的话）。如果项目里没现成的可用 Spine 工程，可以建空文件占位：

```powershell
$dir = "d:\aiproject\forge\public\builtin\library\Spine\测试鼓掌"
New-Item -ItemType Directory -Force -Path $dir
"" | Out-File -FilePath "$dir\game.json" -Encoding utf8
"" | Out-File -FilePath "$dir\game.atlas" -Encoding utf8
[System.IO.File]::WriteAllBytes("$dir\game.png", [byte[]](0x89,0x50,0x4E,0x47))
```

注意：**这只是为了测 API**，转换会失败（因为 .json/.atlas 是空内容），但 spine-files 接口只看文件名，不解析内容。

- [ ] **Step 3: 启动 dev server 验证**

```powershell
pnpm dev
```

```powershell
curl.exe "http://localhost:6688/api/library/spine-files?path=Spine%2F%E6%B5%8B%E8%AF%95%E9%BC%93%E6%8E%8C"
```

预期：JSON 含 `files: ["game.atlas", "game.json", "game.png"]`（顺序可能不同）。

- [ ] **Step 4: 验证非 Spine 文件夹返回 400**

```powershell
curl.exe -i "http://localhost:6688/api/library/spine-files?path=%E6%B5%8B%E8%AF%95%E5%88%86%E7%B1%BB"
```

预期：HTTP 400 + `{"error":"不是 Spine 工程文件夹"}`。Ctrl+C 停止 dev server。

- [ ] **Step 5: 清理测试占位文件（保留目录结构以便后续 UI 测试）**

可以保留 `测试分类/背景/placeholder.txt` 和 `Spine/测试鼓掌/` 给后续浏览器手工验证用，也可以删掉重建真实素材。建议**保留这些占位**直到 Task 15 端到端验收完成。

---


## Task 8: electronFs - pickLocalSubdir + downloadLibraryFile

**Files:**
- Modify: `src/utils/electronFs.ts`

- [ ] **Step 1: 在 electronFs.ts 适当位置加 pickLocalSubdir 工具**

在 `src/utils/electronFs.ts` 文件**末尾**（最后一个 export 之后）追加：

```ts
// ─── 资源库下载（远程库 → 本地课程目录） ───

/**
 * 根据扩展名决定库下载文件落在课程目录的哪个子目录。
 * 子目录里加 'library' 这一层是为了和"用户上传文件"物理隔离，便于将来清理。
 * Spine 走单独的 downloadLibrarySpine（落 images/animation/aniN/，不走这里）。
 */
function pickLocalSubdir(ext: string): string {
  const e = ext.toLowerCase();
  if (/^\.(png|jpg|jpeg|gif|webp)$/.test(e)) return 'images/library';
  if (/^\.(mp3|wav|ogg)$/.test(e)) return 'images/sound/library';
  if (/^\.(mp4|webm|mov)$/.test(e)) return 'images/animation/library';
  throw new Error(`不支持的资源类型: ${ext}`);
}

/** ArrayBuffer → base64（writeBinaryFile 需要 base64 入参） */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  // btoa 在浏览器中可用；electronFs 在 renderer 进程，btoa 存在
  return btoa(binary);
}
```

- [ ] **Step 2: 在 pickLocalSubdir 后追加 downloadLibraryFile**

```ts
/**
 * 把资源库里的单个图片/音频/视频下载到本课程目录，自动按扩展名分发到 images/library/ 等子目录。
 * 已存在则直接复用（hash 编码进文件名 → pathExists 即去重）。
 *
 * @param courseId 当前课程 id
 * @param libraryPath 库内相对路径，如 '思维课/一年级/标签/img_lt_1.png'
 * @returns 写进 element.props 的相对路径，如 'images/library/a3f5b8c2_img_lt_1.png'
 */
export async function downloadLibraryFile(
  courseId: string,
  libraryPath: string,
): Promise<{ localRelPath: string }> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 取 hash + size
  const infoRes = await fetch(`/api/library/file-info?path=${encodeURIComponent(libraryPath)}`);
  if (!infoRes.ok) throw new Error(`file-info 失败: HTTP ${infoRes.status}`);
  const info = await infoRes.json() as { hash: string; size: number };
  if (!info.hash) throw new Error('file-info 返回缺少 hash');

  // 2. 算本地路径
  const lastSlash = libraryPath.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? libraryPath.slice(lastSlash + 1) : libraryPath;
  const dotIdx = fileName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? fileName.slice(dotIdx) : '';
  const baseName = dotIdx >= 0 ? fileName.slice(0, dotIdx) : fileName;
  if (!ext) throw new Error(`资源库文件缺少扩展名: ${libraryPath}`);

  const subdir = pickLocalSubdir(ext);
  const localRel = `${subdir}/${info.hash}_${baseName}${ext}`;
  const absPath = `${courseDir}${sep}${localRel.split('/').join(sep)}`;

  // 3. 已存在 → 直接复用（pathExists 即去重）
  if (await api().pathExists(absPath)) {
    return { localRelPath: localRel };
  }

  // 4. 下载文件
  const fileRes = await fetch(`/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}`);
  if (!fileRes.ok) throw new Error(`下载文件失败: HTTP ${fileRes.status}`);
  const fileBuf = await fileRes.arrayBuffer();

  // 5. 确保目录 + 写盘
  const dirOnly = absPath.substring(0, absPath.lastIndexOf(sep));
  await api().ensureDir(dirOnly);
  await api().writeBinaryFile(absPath, arrayBufferToBase64(fileBuf));

  return { localRelPath: localRel };
}
```

- [ ] **Step 3: TypeScript 编译检查**

```powershell
pnpm tsc --noEmit
```

预期：无新错误。

注：本任务暂不能跑 UI 验证（还没 LibraryBrowser 调用它）。集成测试在 Task 15。

---

## Task 9: electronFs - downloadLibrarySpine

**Files:**
- Modify: `src/utils/electronFs.ts`

- [ ] **Step 1: 在 downloadLibraryFile 后追加 downloadLibrarySpine**

在 Task 8 添加的代码块**末尾**追加：

```ts
/**
 * 把资源库里的 Spine 工程文件夹下载到本地临时目录，转交给 importSpineFolder 走原有转换/缓存流程。
 * 现有 importSpineFolder 内部按 skeleton.hash 去重（同 hash 的不同选择会复用 images/animation/aniN/）。
 *
 * @param courseId 当前课程 id
 * @param libraryPath 库内相对路径，如 '思维课/一年级/Spine/鼓掌'
 * @returns SpineImportResult[] —— 每个元素含 skinRelPath / animationNames / pngRelPath
 */
export async function downloadLibrarySpine(
  courseId: string,
  libraryPath: string,
): Promise<SpineImportResult[]> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 拉取 Spine 文件夹下所有文件清单
  const listRes = await fetch(`/api/library/spine-files?path=${encodeURIComponent(libraryPath)}`);
  if (!listRes.ok) throw new Error(`spine-files 失败: HTTP ${listRes.status}`);
  const list = await listRes.json() as { files: string[] };
  if (!Array.isArray(list.files) || list.files.length === 0) {
    throw new Error('Spine 工程没有可下载文件');
  }

  // 2. 创建本地临时目录
  const tmpName = `spine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = `${courseDir}${sep}.tmp${sep}${tmpName}`;
  await api().ensureDir(tmpDir);

  try {
    // 3. 逐个下载到 tmpDir，保留相对子目录
    for (const f of list.files) {
      const url = `/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}/${f.split('/').map(encodeURIComponent).join('/')}`;
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error(`下载 ${f} 失败: HTTP ${fileRes.status}`);
      const buf = await fileRes.arrayBuffer();

      const target = `${tmpDir}${sep}${f.split('/').join(sep)}`;
      const dirOnly = target.substring(0, target.lastIndexOf(sep));
      await api().ensureDir(dirOnly);
      await api().writeBinaryFile(target, arrayBufferToBase64(buf));
    }

    // 4. 调现有 importSpineFolder（转换 + 拷贝到 images/animation/aniN/ + 写 manifest）
    const results = await importSpineFolder(courseId, tmpDir);
    return results;
  } finally {
    // 5. 清理临时目录（失败不阻断主流程）
    try {
      await api().removeDir(tmpDir);
    } catch {
      // 忽略清理失败
    }
  }
}
```

- [ ] **Step 2: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无新错误。如果报 `importSpineFolder 找不到`，确认它已在同一文件中导出（应已存在），可能需要把这两个函数挪到 importSpineFolder 之后；或者在文件顶部用前向引用。

- [ ] **Step 3: 验证编译产物**

```powershell
pnpm build 2>&1 | Select-Object -Last 20
```

预期：build 成功（已有的 SVN/SK 等 warn 可忽略；不应有新增 ts/build 错误）。

---


## Task 10: LibraryBrowser 组件骨架 + 数据加载

**Files:**
- Create: `src/components/LibraryBrowser.tsx`

- [ ] **Step 1: 新建 LibraryBrowser.tsx 文件，写入完整骨架**

新建文件 `src/components/LibraryBrowser.tsx`，内容：

```tsx
import { useEffect, useState, useCallback } from 'react';

// ─── 类型 ───

export type LibraryEntry =
  | { name: string; isDir: true; isSpineProject: boolean }
  | { name: string; isDir: false; size: number; mtime: number };

export type LibraryListResponse = {
  path: string;
  entries: LibraryEntry[];
};

export type SelectResult =
  | { type: 'file'; libraryPath: string }
  | { type: 'spine'; libraryPath: string };

export type LibraryBrowserProps = {
  mode: 'file' | 'spineFolder';
  /** mode='file' 时按扩展名过滤；undefined 时按 'image' 处理 */
  fileFilter?: 'image' | 'audio' | 'video';
  onSelect: (result: SelectResult) => void | Promise<void>;
  onClose: () => void;
};

// ─── 扩展名过滤 ───

const EXT_BY_FILTER: Record<NonNullable<LibraryBrowserProps['fileFilter']>, RegExp> = {
  image: /\.(png|jpg|jpeg|gif|webp)$/i,
  audio: /\.(mp3|wav|ogg)$/i,
  video: /\.(mp4|webm|mov)$/i,
};

function fileMatchesFilter(name: string, filter: LibraryBrowserProps['fileFilter']): boolean {
  return EXT_BY_FILTER[filter ?? 'image'].test(name);
}

// ─── 主组件 ───

export default function LibraryBrowser(props: LibraryBrowserProps) {
  const { mode, fileFilter, onSelect, onClose } = props;

  // 路径栈：例如 ['思维课', '一年级', '标签']，空数组 = 根目录
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ name: string; isDir: boolean } | null>(null);

  const currentPath = pathStack.join('/');

  // 数据加载
  const loadEntries = useCallback(async (relPath: string) => {
    setLoading(true);
    setLoadError(null);
    setSelected(null);
    try {
      const url = `/api/library/list?path=${encodeURIComponent(relPath)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data: LibraryListResponse = await res.json();
      setEntries(data.entries);
    } catch (e: any) {
      setLoadError(String(e?.message ?? e));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 路径变化时重新加载
  useEffect(() => {
    void loadEntries(currentPath);
  }, [currentPath, loadEntries]);

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 进入子目录
  const enterFolder = (name: string) => {
    setPathStack((prev) => [...prev, name]);
  };

  // 面包屑跳转：index 是栈中位置（-1 表示根）
  const jumpToBreadcrumb = (index: number) => {
    setPathStack((prev) => prev.slice(0, index + 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl flex flex-col"
        style={{ width: '90vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
          <div className="text-lg font-semibold">📁 资源库</div>
          <button
            className="text-slate-400 hover:text-white text-xl px-2"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 面包屑 */}
        <div className="px-6 py-2 border-b border-slate-700 flex items-center text-sm">
          <button
            className={pathStack.length === 0 ? 'text-slate-300' : 'text-blue-400 hover:underline'}
            onClick={() => jumpToBreadcrumb(-1)}
            disabled={pathStack.length === 0}
          >
            全部
          </button>
          {pathStack.map((seg, i) => (
            <span key={i} className="flex items-center">
              <span className="mx-2 text-slate-500">/</span>
              <button
                className={i === pathStack.length - 1 ? 'text-slate-300' : 'text-blue-400 hover:underline'}
                onClick={() => jumpToBreadcrumb(i)}
                disabled={i === pathStack.length - 1}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        {/* 内容区域（滚动） */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading && <div className="text-slate-400">加载中...</div>}
          {loadError && <div className="text-red-400">加载失败: {loadError}</div>}
          {!loading && !loadError && (
            <FolderAndFileGrid
              entries={entries}
              mode={mode}
              fileFilter={fileFilter}
              currentPath={currentPath}
              selected={selected}
              setSelected={setSelected}
              onEnterFolder={enterFolder}
              onConfirm={() => handleConfirm(selected, currentPath, mode, onSelect, onClose)}
            />
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 text-sm">
          <div className="text-slate-400">
            {selected ? `已选: ${selected.name}` : '未选'}
          </div>
          <div className="space-x-3">
            <button
              className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
              onClick={onClose}
            >
              取消
            </button>
            <button
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              disabled={!selected}
              onClick={() => handleConfirm(selected, currentPath, mode, onSelect, onClose)}
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// FolderAndFileGrid 在 Task 11 实现
function FolderAndFileGrid(_p: any) {
  return <div className="text-slate-500">（Task 11 实现）</div>;
}

// 确认逻辑
async function handleConfirm(
  selected: { name: string; isDir: boolean } | null,
  currentPath: string,
  mode: LibraryBrowserProps['mode'],
  onSelect: LibraryBrowserProps['onSelect'],
  onClose: LibraryBrowserProps['onClose'],
) {
  if (!selected) return;
  const libraryPath = currentPath ? `${currentPath}/${selected.name}` : selected.name;
  if (mode === 'spineFolder') {
    if (!selected.isDir) return;
    await onSelect({ type: 'spine', libraryPath });
  } else {
    if (selected.isDir) return;
    await onSelect({ type: 'file', libraryPath });
  }
  onClose();
}

// 让 fileMatchesFilter 暴露给 Task 11 的子组件
export { fileMatchesFilter };
```

- [ ] **Step 2: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无错误。

- [ ] **Step 3: 验证文件存在**

```powershell
Test-Path "d:\aiproject\forge\src\components\LibraryBrowser.tsx"
```

预期：True。

注：本任务还不能在 UI 上验证（FolderAndFileGrid 是占位、FieldRenderer 还没集成）。完整 UI 验证在 Task 15。

---


## Task 11: LibraryBrowser - 文件夹/文件渲染 + 选中交互

**Files:**
- Modify: `src/components/LibraryBrowser.tsx`

- [ ] **Step 1: 替换 FolderAndFileGrid 占位为完整实现**

打开 `src/components/LibraryBrowser.tsx`，把 Task 10 中的占位：

```tsx
function FolderAndFileGrid(_p: any) {
  return <div className="text-slate-500">（Task 11 实现）</div>;
}
```

整段替换成下面的完整实现：

```tsx
type FolderAndFileGridProps = {
  entries: LibraryEntry[];
  mode: LibraryBrowserProps['mode'];
  fileFilter: LibraryBrowserProps['fileFilter'];
  currentPath: string;
  selected: { name: string; isDir: boolean } | null;
  setSelected: (s: { name: string; isDir: boolean } | null) => void;
  onEnterFolder: (name: string) => void;
  onConfirm: () => void;
};

function FolderAndFileGrid(props: FolderAndFileGridProps) {
  const { entries, mode, fileFilter, currentPath, selected, setSelected, onEnterFolder, onConfirm } = props;

  // 根据 mode 过滤要展示的项
  const visibleEntries = entries.filter((e) => {
    if (e.isDir) return true;
    // mode='spineFolder' 时不显示任何单文件
    if (mode === 'spineFolder') return false;
    return fileMatchesFilter(e.name, fileFilter);
  });

  const folders = visibleEntries.filter((e): e is Extract<LibraryEntry, { isDir: true }> => e.isDir);
  const files = visibleEntries.filter((e): e is Extract<LibraryEntry, { isDir: false }> => !e.isDir);

  if (visibleEntries.length === 0) {
    return <div className="text-slate-500">该目录下没有可选项</div>;
  }

  return (
    <div className="space-y-6">
      {/* 文件夹区 */}
      {folders.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">▍文件夹</div>
          <div className="flex flex-wrap gap-3">
            {folders.map((f) => {
              const isSpineProj = f.isSpineProject;
              const disabledForFile = mode === 'file' && isSpineProj;
              const isSelected =
                mode === 'spineFolder' && isSpineProj &&
                selected?.isDir === true && selected.name === f.name;

              const baseCls =
                'px-4 py-3 rounded border min-w-[140px] text-center text-sm transition-colors';
              const selectedCls = isSelected ? 'border-blue-500 bg-blue-900/40' : 'border-slate-600';
              const interactCls = disabledForFile
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-slate-800 cursor-pointer';

              const handleClick = () => {
                if (disabledForFile) return;
                if (mode === 'spineFolder' && isSpineProj) {
                  setSelected({ name: f.name, isDir: true });
                } else {
                  // 普通文件夹（任意 mode）：进入下一层
                  onEnterFolder(f.name);
                }
              };

              const handleDoubleClick = () => {
                if (disabledForFile) return;
                if (mode === 'spineFolder' && isSpineProj) {
                  setSelected({ name: f.name, isDir: true });
                  // 异步触发 onConfirm 让 selected 已生效
                  setTimeout(() => onConfirm(), 0);
                }
              };

              return (
                <button
                  key={f.name}
                  className={`${baseCls} ${selectedCls} ${interactCls}`}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  title={isSpineProj ? `${f.name} (Spine 工程)` : f.name}
                >
                  <div>{isSpineProj ? '🦴' : '📁'} {f.name}</div>
                  {isSpineProj && <div className="text-xs text-slate-400 mt-1">(Spine)</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 文件区 */}
      {files.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">▍文件</div>
          <div className="grid grid-cols-8 gap-2">
            {files.map((f) => {
              const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name);
              const fileLibraryPath = currentPath ? `${currentPath}/${f.name}` : f.name;
              const thumbUrl = `/builtin/library/${fileLibraryPath.split('/').map(encodeURIComponent).join('/')}`;

              const isSelected =
                selected?.isDir === false && selected.name === f.name;

              const baseCls =
                'border rounded p-1 text-center cursor-pointer transition-colors';
              const selectedCls = isSelected ? 'border-blue-500 bg-blue-900/40' : 'border-slate-700 hover:border-slate-500';

              return (
                <div
                  key={f.name}
                  className={`${baseCls} ${selectedCls}`}
                  onClick={() => setSelected({ name: f.name, isDir: false })}
                  onDoubleClick={() => {
                    setSelected({ name: f.name, isDir: false });
                    setTimeout(() => onConfirm(), 0);
                  }}
                  title={f.name}
                >
                  {isImage ? (
                    <img
                      src={thumbUrl}
                      alt={f.name}
                      className="w-full h-20 object-contain bg-slate-800"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center text-2xl bg-slate-800">
                      🎵
                    </div>
                  )}
                  <div className="text-xs mt-1 truncate">{f.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无错误。

- [ ] **Step 3: 暂不能直接 UI 验证**

LibraryBrowser 还需要 FieldRenderer 集成才能在编辑器里弹出。完整 UI 验证在 Task 15。

---

## Task 12: LibraryBrowser - 错误弹窗 + 下载 Loading 状态

**Files:**
- Modify: `src/components/LibraryBrowser.tsx`

- [ ] **Step 1: 加错误弹窗子组件和下载中遮罩**

在 `src/components/LibraryBrowser.tsx` 文件**底部**追加：

```tsx
// ─── 错误弹窗（导出供 FieldRenderer 用） ───

export function LibraryErrorDialog(props: { title?: string; detail: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      onClick={props.onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-700 text-base font-semibold">
          ⚠️ {props.title ?? '操作失败'}
        </div>
        <div className="px-5 py-4 text-sm whitespace-pre-wrap break-all">{props.detail}</div>
        <div className="px-5 py-3 border-t border-slate-700 flex justify-end">
          <button
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500"
            onClick={props.onClose}
            autoFocus
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 LibraryBrowser 主体加 busy 状态遮罩**

修改 LibraryBrowser 主体，让"确定"按钮在调用 onSelect 时显示 loading（"确定"按钮需变 disabled，整个弹窗加半透明遮罩）。

把现有 LibraryBrowser 函数的状态部分加一行：

```tsx
const [busy, setBusy] = useState(false);
```

把"确定"按钮的 onClick 改为内联 wrapper 处理 busy：

```tsx
<button
  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
  disabled={!selected || busy}
  onClick={async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await handleConfirm(selected, currentPath, mode, onSelect, onClose);
    } catch {
      // onSelect 抛错由调用方决定如何提示；这里不二次处理
    } finally {
      setBusy(false);
    }
  }}
>
  {busy ? '处理中...' : '确定'}
</button>
```

同时把双击文件/Spine 的 setTimeout(onConfirm, 0) 处也加上 busy 检查。简单起见，把 FolderAndFileGrid 的 onConfirm 包装成"如果 busy 不触发"，最简洁的做法是从 props 把 busy 也透传下去：

把 `FolderAndFileGridProps` 加：

```tsx
type FolderAndFileGridProps = {
  // ...原字段...
  busy: boolean;
};
```

把 LibraryBrowser 渲染处把 busy 传下去：

```tsx
<FolderAndFileGrid
  entries={entries}
  mode={mode}
  fileFilter={fileFilter}
  currentPath={currentPath}
  selected={selected}
  setSelected={setSelected}
  onEnterFolder={enterFolder}
  onConfirm={async () => {
    if (busy) return;
    setBusy(true);
    try {
      await handleConfirm(selected, currentPath, mode, onSelect, onClose);
    } finally {
      setBusy(false);
    }
  }}
  busy={busy}
/>
```

把 FolderAndFileGrid 函数签名补上 busy，并在双击触发 onConfirm 之前判断：

```tsx
function FolderAndFileGrid(props: FolderAndFileGridProps) {
  const { /* ... */, busy } = props;
  // ...
  // 在双击文件夹/文件的 setTimeout(onConfirm, 0) 之前加：
  // if (busy) return;
}
```

如果觉得 busy 透传太麻烦，可以用更简单的写法：直接在 `onConfirm` 实参里通过闭包检查 busy。具体怎么干净随实现者风格，关键是 **busy 时不让用户重复触发下载**。

- [ ] **Step 3: 在内容区加全局 loading 遮罩（busy 时）**

在 LibraryBrowser 主 div 内最后追加（兄弟节点位置）：

```tsx
{busy && (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-lg">
    <div className="text-white text-sm">下载中...</div>
  </div>
)}
```

注意外层容器（90vw × 90vh 的弹窗）需要加 `relative` 定位才能让这个绝对遮罩生效：把弹窗外层 `<div className="bg-slate-900 ..." style={{...}}>` 加上 `relative`：

```tsx
<div
  className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl flex flex-col relative"
  style={{ width: '90vw', height: '90vh' }}
  onClick={(e) => e.stopPropagation()}
>
```

- [ ] **Step 4: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无错误。

---


## Task 13: FieldRenderer - type:file 字段集成资源库按钮

**Files:**
- Modify: `src/components/FieldRenderer.tsx`

- [ ] **Step 1: 找到现有 case file 分支并理解**

打开 `src/components/FieldRenderer.tsx`，找到 `case 'file':` 分支（约 543 行）。这个分支当前只渲染一个"上传"按钮（约 627 行附近），逻辑是 `<input type="file">` 触发用户上传。**保留现有上传逻辑不动**（仅按钮文字改成"本地文件"）。

- [ ] **Step 2: 在文件顶部加 import**

在 FieldRenderer.tsx 顶部 import 区域加：

```tsx
import LibraryBrowser, { LibraryErrorDialog, type SelectResult } from './LibraryBrowser';
import { downloadLibraryFile, downloadLibrarySpine } from '../utils/electronFs';
```

如果某些已 import，去重。

- [ ] **Step 3: 在 case file 分支内增加资源库浏览器状态和按钮**

在 case 'file' 分支的渲染逻辑里，把"上传"按钮改造成两个按钮 + 浏览器/错误弹窗。简化结构如下（具体融入现有 JSX 时按现有缩进/结构调整）：

```tsx
case 'file': {
  const fileType = property.fileType;  // 'image' | 'audio' | 'video' | undefined

  // 已有的 inputRef、上传 onChange 等保持不变...

  // 新增：浏览器 + 错误弹窗状态
  const [libBrowserOpen, setLibBrowserOpen] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);

  const handleLibrarySelect = async (result: SelectResult) => {
    if (result.type !== 'file') return;
    try {
      const courseId = currentCourseId;  // 从现有上下文取 courseId
      const { localRelPath } = await downloadLibraryFile(courseId, result.libraryPath);
      onChange(property.key, localRelPath);
    } catch (e: any) {
      setLibError(`无法下载资源库文件: ${result.libraryPath}\n\n原因: ${String(e?.message ?? e)}`);
    }
  };

  return (
    <div>
      {/* 现有显示路径/缩略图的 JSX 保持不变 */}

      {/* 按钮区改成两个并排按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLibBrowserOpen(true)}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-blue-600 text-xs"
        >
          资源库文件
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
        >
          本地文件
        </button>
        <input ref={inputRef} type="file" hidden onChange={/* 现有 onChange */} />
      </div>

      {libBrowserOpen && (
        <LibraryBrowser
          mode="file"
          fileFilter={fileType}
          onSelect={handleLibrarySelect}
          onClose={() => setLibBrowserOpen(false)}
        />
      )}

      {libError && (
        <LibraryErrorDialog
          detail={libError}
          onClose={() => setLibError(null)}
        />
      )}
    </div>
  );
}
```

**重要**：上面是结构示意。实际改的时候要：
- 找到现有"上传"按钮的具体位置和样式，保持现有 className/外观
- 把那个按钮的文案从"上传"改为"本地文件"
- 在它之前/之后加一个"资源库文件"按钮
- 把浏览器和错误弹窗的渲染加在 case 'file' 整个返回 JSX 的末尾（兄弟节点）
- `currentCourseId` 应该按 FieldRenderer 现有从 store/context 取 courseId 的方式拿（看现有上传 onChange 是怎么取的，复用同一个）

- [ ] **Step 4: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无错误。

- [ ] **Step 5: 浏览器手工验证（仅图片字段）**

```powershell
pnpm dev
```

打开 http://localhost:6688，新建/打开任意课件，加一个 Image 组件（或其他有 skin 字段的组件）。

按以下步骤验证：
1. 点击 skin 字段的"资源库文件"按钮 → 资源库弹窗出现，显示 90vw × 90vh 的居中模态框
2. 看到根目录列出 `测试分类`、`Spine` 等文件夹（之前 Task 5/7 创建的）
3. 点击 `测试分类` → 进入下一层，面包屑变成 `全部 / 测试分类`
4. 点击面包屑的 `全部` → 回到根目录
5. ESC 键 → 关闭弹窗，element 不变
6. 关闭再打开 → 永远从根目录开始（不记忆历史位置）

预期：以上 6 项全部通过。Ctrl+C 停止 dev server。

- [ ] **Step 6: 验证现有"本地文件"功能未受影响**

重启 dev server，点击同一个字段的"本地文件"按钮，弹出系统文件选择对话框，选一张本地图片，确认 element.props.skin 被正确填充（跟改造前行为一致）。

---


## Task 14: FieldRenderer - SpineFolderField 集成资源库按钮

**Files:**
- Modify: `src/components/FieldRenderer.tsx`

- [ ] **Step 1: 找到 SpineFolderField 组件**

在 `src/components/FieldRenderer.tsx` 找到 SpineFolderField 函数（约 144-301 行），它内部有"选择 Spine 文件夹"按钮（约 257 行）。

- [ ] **Step 2: 改造 SpineFolderField 加资源库按钮**

类似 Task 13 的方式：
1. 把"选择 Spine 文件夹"按钮文字改为"本地 Spine 文件夹"
2. 在它旁边加一个新按钮"资源库 Spine 文件夹"
3. 加 LibraryBrowser 和 错误弹窗状态

```tsx
// 在 SpineFolderField 函数内部加：
const [libBrowserOpen, setLibBrowserOpen] = useState(false);
const [libError, setLibError] = useState<string | null>(null);

const handleLibrarySpineSelect = async (result: SelectResult) => {
  if (result.type !== 'spine') return;
  setBusy(true);
  try {
    const courseId = currentCourseId;  // 按现有取法
    const results = await downloadLibrarySpine(courseId, result.libraryPath);
    if (results.length === 0) {
      setLibError(`资源库 Spine 工程无法导入: ${result.libraryPath}`);
      return;
    }
    // 跟现有 onPickFolder 处理 importSpineFolder 返回结果完全一致：
    // 写入 url / _animationList / _skFiles 等到 element.props
    // 复用 onPickFolder 的后半段逻辑（提到一个共享函数 applySpineImportResults 更整洁）
    applySpineImportResults(results);
  } catch (e: any) {
    setLibError(`无法下载资源库 Spine 文件夹: ${result.libraryPath}\n\n原因: ${String(e?.message ?? e)}`);
  } finally {
    setBusy(false);
  }
};
```

**重要**：现有的 onPickFolder 函数（约 165-195 行）在选完本地 Spine 文件夹后有一段处理 importSpineFolder 返回结果的逻辑（设置 url、_animationList、_skFiles）。把那段逻辑**抽成一个内联函数 applySpineImportResults(results)**，让"本地"和"资源库"两条路径共用。

抽函数示意（具体看 SpineFolderField 现有代码再调整）：

```tsx
function applySpineImportResults(results: SpineImportResult[]) {
  // 把现有 onPickFolder 内 importSpineFolder() 调用之后的处理代码原样搬进来
  // 通常是：updateElement(elementId, { props: { ..., url: results[0].skinRelPath, _animationList: ..., _skFiles: ... } });
}
```

然后 onPickFolder 改为：

```tsx
const onPickFolder = async () => {
  setBusy(true);
  try {
    const folder = await selectDirectory();
    if (!folder) return;
    const results = await importSpineFolder(courseId, folder);
    applySpineImportResults(results);
  } catch (e: any) {
    setLibError(`本地 Spine 导入失败\n\n原因: ${String(e?.message ?? e)}`);
  } finally {
    setBusy(false);
  }
};
```

- [ ] **Step 3: 在 SpineFolderField 渲染处替换按钮**

把现有：

```tsx
<button onClick={onPickFolder}>
  {busy ? '转换中...' : '选择 Spine 文件夹'}
</button>
```

换成：

```tsx
<div className="flex gap-2">
  <button
    type="button"
    onClick={() => setLibBrowserOpen(true)}
    disabled={busy}
    className="px-3 py-1 rounded bg-slate-700 hover:bg-blue-600 text-xs disabled:opacity-50"
  >
    {busy ? '处理中...' : '资源库 Spine 文件夹'}
  </button>
  <button
    type="button"
    onClick={onPickFolder}
    disabled={busy}
    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs disabled:opacity-50"
  >
    {busy ? '转换中...' : '本地 Spine 文件夹'}
  </button>
</div>

{libBrowserOpen && (
  <LibraryBrowser
    mode="spineFolder"
    onSelect={handleLibrarySpineSelect}
    onClose={() => setLibBrowserOpen(false)}
  />
)}

{libError && (
  <LibraryErrorDialog detail={libError} onClose={() => setLibError(null)} />
)}
```

- [ ] **Step 4: 类型检查**

```powershell
pnpm tsc --noEmit
```

预期：无错误。

- [ ] **Step 5: 浏览器手工验证（仅 UI 显示）**

```powershell
pnpm dev
```

打开任意课件，加一个 Spine 组件。在属性面板看到两个并排按钮：「资源库 Spine 文件夹」「本地 Spine 文件夹」。点「资源库 Spine 文件夹」弹出资源库浏览器（mode=spineFolder），看到 `Spine` 文件夹（之前 Task 7 创建的占位）。点进 `Spine` 看到 `测试鼓掌` 显示成 🦴 + (Spine) 标记。

实际选中并下载在 Task 15 完整验收里测（这里因为 Spine 占位文件内容是空的，转换会失败，会弹错误弹窗——这也是预期行为之一，验证错误弹窗能弹）。

Ctrl+C 停止。

---


## Task 15: 端到端浏览器手工验收

**Files:** 无代码改动；仅运行验证

- [ ] **Step 1: 准备真实测试素材**

清理之前 Task 5/7 创建的占位目录（包括 `测试分类/`、`Spine/测试鼓掌/`、`.cache/`），方法：用资源管理器或 PowerShell 自行删除（命令略，按使用习惯来）。

然后**手工**放入：
- `public/builtin/library/思维课/一年级/标签/img_lt_1.png`、`img_lt_2.png`（任意可显示 PNG）
- `public/builtin/library/思维课/一年级/Spine/鼓掌/(完整有效的 Spine 三件套)`
  - 找一个项目里现有的 Spine 工程文件夹（看看 `images/animation/` 下任意已转换的反向找源工程，或者从 sdk_baiya 现成 sample 取）拷贝过来。**必须**含 `<name>.json + <name>.atlas + <name>.png` 三件套，且 .json 内容是合法的 Spine JSON

如果暂时拿不到合法 Spine 三件套，本任务 Spine 部分跳过验收，**单独写明跳过原因**给 reviewer 看。

- [ ] **Step 2: 启动 dev server + 打开编辑器**

```powershell
pnpm dev
```

打开浏览器 http://localhost:6688。

- [ ] **Step 3: 验收 1 - 零编码加资源**

新建/打开测试课件，加一个 NewImage 组件，点 skin 字段「资源库文件」。

预期：
- 弹出 90vw × 90vh 居中模态框
- 看到 `思维课` 文件夹（无需重启 Vite，无需改代码）

- [ ] **Step 4: 验收 2 - 浏览导航**

逐层进入 `思维课` → `一年级` → `标签`。

预期：
- 面包屑变化正确：`全部 / 思维课 / 一年级 / 标签`
- 看到 `img_lt_1.png` 和 `img_lt_2.png` 缩略图，每行最多 8 个
- 点击 `全部` 回到根目录

- [ ] **Step 5: 验收 3 - 选中下载（图片）**

点击 `img_lt_1.png` → 蓝色边框选中 → 点「确定」。

预期：
- 弹窗关闭
- 编辑器画布上出现这张图
- 检查本地课程目录有 `images/library/<8字符hex>_img_lt_1.png` 文件

```powershell
# 找当前课程目录（具体路径根据 forge 的 localStorage 配置）
ls "<courseDir>\images\library\"
```

- [ ] **Step 6: 验收 4 - 同一课件去重**

再次给同一组件选同一张 `img_lt_1.png`。

预期：
- 选中后秒级返回（pathExists 命中）
- 课程目录里只有一份 `images/library/<hash>_img_lt_1.png`（不是两份）

- [ ] **Step 7: 验收 5 - 库改名不影响已用资源**

停 dev server，把 `public/builtin/library/思维课/一年级/标签` 重命名为 `标签_新`，重启 dev server，重新打开课件。

预期：
- 已选的图仍然正常显示在画布上（本地副本不变）
- 资源库浏览器现在看到的是 `标签_新` 文件夹（新名）

- [ ] **Step 8: 验收 6 - Spine 工程识别和导入**

（前提：Step 1 准备了合法 Spine 三件套）

加 Spine 组件，点「资源库 Spine 文件夹」，进入 `思维课/一年级/Spine`，看到 `鼓掌` 显示成 🦴 + (Spine) 标记。点击选中→点「确定」。

预期：
- 等待几百毫秒到几秒（下载 + 转换）
- 弹窗关闭，element.props.url 被设置为 `images/animation/aniN/<basename>.sk`
- 课程目录 `images/animation/aniN/` 含 `.sk` `.png`（+ 可能的音频）
- 课程目录 `images/animation/.manifest.json` 含一条记录

第二次选同一 Spine：
- 命中 manifest，秒级返回，没有新建 ani(N+1)

- [ ] **Step 9: 验收 7 - 错误弹窗**

模拟网络错误：先把库内某文件**临时删掉**或临时关闭 dev server，再选一张已经在浏览器里看到的图（用浏览器缓存到的目录列表）。

预期：
- 弹出 ⚠️ 操作失败 模态弹窗，显示具体错误
- 用户必须点「知道了」关闭（不会自动消失）

如果缓存命中导致不弹错，可在 Network tab 模拟离线后再点。

- [ ] **Step 10: 验收 8 - 导出工程**

选完几张库图 + 一个库 Spine 后，点击 forge 工具栏「发布工程」或「预览」按钮。

预期：
- 编译成功
- 课件包内 `game_lt/image/img/<hash>_xxx.png` 存在
- 课件包内 `game_lt/animation/aniN/<basename>.sk` 存在
- LessonZK.js 里 skin 字段写的是 `game_lt/image/img/<hash>_xxx.png`、url 写的是 `game_lt/animation/aniN/<basename>.sk`
- 用预览模式打开，资源能正常加载

- [ ] **Step 11: 验收 9 - 旧课件零影响**

打开任意一个老课件（不用资源库新功能，全是旧路径）。

预期：
- 所有原本的 skin/url 字段照常加载
- 编辑、保存、导出全部正常
- LessonZK.js 中老路径保持不变

- [ ] **Step 12: 全部验收通过后清理 .cache 占位（可选）**

`public/builtin/library/.cache/` 下次访问会自动重建，可手工清空（也可保留）。

- [ ] **Step 13: 把 .cache 加到 .gitignore（按需）**

如果项目希望不提交 hash 缓存：检查 `.gitignore` 有没有 `**/.cache/` 或类似规则。如果没有，建议加：

```gitignore
public/builtin/library/.cache/
```

但**不要自动 commit 这个改动**，由大佬决定。

---

## Self-Review

- [x] **Spec coverage**：以下 spec 章节都有对应任务
  - Section 4 整体架构 → Task 8-12（客户端逻辑）
  - Section 5 LibraryBrowser UI → Task 10-12
  - Section 6 库内组织 → Task 5 测试结构 + Task 15 真实素材
  - Section 7 Vite 接口（list/file-info/spine-files/静态） → Task 5/6/7（静态由 Vite 自带，无需任务）
  - Section 7.5 路径校验 → Task 2
  - Section 8 客户端下载/去重 → Task 8（图片/音频/视频）+ Task 9（Spine）
  - Section 9 资源落地策略 → Task 8 pickLocalSubdir
  - Section 10 属性面板入口 → Task 1（fileType）+ Task 13（file 字段）+ Task 14（spineFolder）
  - Section 11 Electron IPC 零改动 → 无任务（验证就是没动 preload.cjs/main.cjs）
  - Section 12 旧课件兼容 → Task 15 验收 11
  - Section 13 改造文件清单 → 任务覆盖了所有 5 个文件改动 + 1 个新建
  - Section 14 风险与权衡 → 信息性，无任务
  - Section 15 验收标准 → Task 15 八条全部覆盖

- [x] **Placeholder scan**：搜索"TODO" / "TBD" / "implement later"——计划里没有这些字样

- [x] **Type consistency**：核对类型/方法/字段名
  - `LibraryBrowserProps` / `SelectResult` / `LibraryEntry`：Task 10 定义，Task 11/12/13/14 一致使用
  - `downloadLibraryFile(courseId, libraryPath)`：Task 8 定义返回 `{ localRelPath: string }`，Task 13 用 `{ localRelPath }` 解构 ✓
  - `downloadLibrarySpine(courseId, libraryPath)`：Task 9 定义返回 `SpineImportResult[]`（来自 electronFs 已有类型），Task 14 用 .length 和 [0].skinRelPath ✓
  - `fileType`：Task 1 在 ElementProperty 加 `'image' | 'audio' | 'video'`，Task 13 透传到 LibraryBrowser 的 fileFilter（同类型集合）✓
  - `pickLocalSubdir(ext)` 返回 'images/library' / 'images/sound/library' / 'images/animation/library' ✓ 跟 spec Section 9 表格一致

---

## 给执行者的总体提示

1. **不要自动 git commit**（CLAUDE.md 约定）。每个 Task 末尾的"Step N: 暂不 commit"是有意保留的，由大佬审完后手动整理 commit
2. **Vite dev 服务器在另一台机器上跑也行**，但 LIBRARY_ROOT 是 dev server 那台机器的本地路径——所以维护 library 资源也要在 dev server 那台机器上做
3. **PowerShell 写大段长文件用 here-string + Out-File**（CLAUDE.md 约定，本计划已经在 Task 8/9/10 里给了完整代码可直接 Edit）
4. 任务执行顺序很关键：Task 1（类型）→ 2-7（后端）→ 8-9（客户端 utils）→ 10-12（组件）→ 13-14（集成）→ 15（验收）。**一律按顺序**，不要跳跃
5. 每个任务的"类型检查"步骤都要跑 `pnpm tsc --noEmit`，不要为了赶进度跳过
