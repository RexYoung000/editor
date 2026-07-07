# 课件保存到本地目录 + 预览功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify preview service onto vite dev server (6688) and save courseware files to user's local directory in Electron mode.

**Architecture:** Vite middleware proxies `preview-server/` static assets and dynamically serves courseware files from local directories (with fallback to `preview-server/lessons/test/`). Electron IPC adds generic file-writing capabilities so `export.ts` can write courseware to the user's local course directory.

**Tech Stack:** Vite middleware, Electron IPC, React (Toolbar), TypeScript

---

## Phase 1: Static proxy + preview URL migration (Steps 1 & 6)

### Task 1: Add preview-server static proxy middleware to vite.config.ts

**Files:**
- Modify: `vite.config.ts:15-26` (insert new middleware before preview-game handler)

- [ ] **Step 1: Add static proxy middleware in forgePlugin()**

Insert a new middleware at the top of `configureServer()` that serves `preview-server/` directory files under `/preview-server/` URL path. This must be placed before the existing preview-game handler so it takes precedence.

```typescript
// Add inside configureServer(), before the existing preview-game middleware (line 16)
// preview-server 静态代理：将 /preview-server/ 请求映射到物理文件
server.middlewares.use('/preview-server', (req: any, res: any, next: any) => {
  const filePath = path.resolve(__dirname, 'preview-server', req.url?.slice(1) || '');
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
```

- [ ] **Step 2: Verify static proxy works**

Run: `pnpm dev`
Expected: Server starts on :6688. In browser, `http://localhost:6688/preview-server/sys_config.json` should return the JSON config file. `http://localhost:6688/preview-server/libs/GameLoader.max.js` should return the JS file.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add /preview-server/ static proxy middleware on vite :6688"
```

---

### Task 2: Change preview URLs from 8080 to 6688 in Toolbar.tsx

**Files:**
- Modify: `src/components/Toolbar.tsx:174` (teacher preview URL)
- Modify: `src/components/Toolbar.tsx:181` (student preview URL)
- Modify: `src/components/Toolbar.tsx:188` (observer preview URL)

- [ ] **Step 1: Replace all localhost:8080 with localhost:6688/preview-server**

Replace the 3 preview URLs. Each URL changes from `http://localhost:8080/?course=...` to `http://localhost:6688/preview-server/?course=...`:

Line 174 (teacher):
```typescript
window.open(`http://localhost:6688/preview-server/?course=${cid}&type=1&ip=${syncConfig.ip}&port=${syncConfig.port}&roomid=${syncConfig.roomId}&id=1001&ct=1&rl=dev&sc=1&sdk=full`, '_blank');
```

Line 181 (student):
```typescript
window.open(`http://localhost:6688/preview-server/?course=${cid}&type=2&ip=${syncConfig.ip}&port=${syncConfig.port}&roomid=${syncConfig.roomId}&id=2001&ct=1&rl=dev&sc=1&sdk=full`, '_blank');
```

Line 188 (observer):
```typescript
window.open(`http://localhost:6688/preview-server/?course=${cid}&type=3&ip=${syncConfig.ip}&port=${syncConfig.port}&roomid=${syncConfig.roomId}&id=3001&ct=1&rl=dev&sc=1&sdk=full`, '_blank');
```

- [ ] **Step 2: Also fix the URL in export.ts:571**

In `publishAndPreview()`, line 571:
```typescript
window.open(`http://localhost:6688/preview-server/?course=${result.cid}&type=1&ct=1&rl=dev`, '_blank');
```

- [ ] **Step 3: Verify preview loads on 6688**

Run: `pnpm dev`
Expected: Click publish → preview opens at `http://localhost:6688/preview-server/...`. The GameLoader page loads, and courseware preview works identically to the old 8080 setup. You can also start the old 8080 server separately for comparison.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toolbar.tsx src/utils/export.ts
git commit -m "feat: migrate preview URLs from :8080 to :6688/preview-server"
```

---

## Phase 2: Dynamic courseware proxy with fallback (Step 2)

### Task 3: Add courseware path registry and dynamic proxy middleware

**Files:**
- Modify: `vite.config.ts` (add registry Map + dynamic middleware after static proxy)

- [ ] **Step 1: Add in-memory path registry and dynamic courseware middleware**

After the `/preview-server` static proxy middleware, add a path registry and dynamic middleware. The registry maps `courseId → localOutputDir`. The middleware intercepts requests to `/preview-server/lessons/test/<projName>/...`, checks the registry first, then falls back to `preview-server/lessons/test/` on disk.

```typescript
// Add at top of forgePlugin() body (before configureServer return):
const courseOutputDirs = new Map<string, string>(); // courseId → localOutputDir

// Inside configureServer(), after the /preview-server static middleware:
// 课件文件动态代理：注册表优先，fallback 到 preview-server 静态文件
server.middlewares.use('/preview-server/lessons/test', (req: any, res: any, next: any) => {
  // URL pattern: /preview-server/lessons/test/<projName>/<file>
  const urlPath = req.url || '';
  const segments = urlPath.split('/').filter(Boolean); // [projName, file, ...]
  if (segments.length === 0) { next(); return; }
  const projName = segments[0];
  // projName format: "test_<courseId>_LessonZK"
  const courseId = projName.startsWith('test_') && projName.endsWith('_LessonZK')
    ? projName.slice(5, -9) : null;

  let baseDir: string | null = null;
  if (courseId && courseOutputDirs.has(courseId)) {
    baseDir = courseOutputDirs.get(courseId)!;
  } else {
    // fallback: preview-server 静态文件
    const fallbackDir = path.resolve(__dirname, 'preview-server/lessons/test', projName);
    if (fs.existsSync(fallbackDir)) baseDir = fallbackDir;
  }

  if (!baseDir) { next(); return; }

  const relativePath = segments.slice(1).join('/');
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
});
```

- [ ] **Step 2: Verify fallback works**

Run: `pnpm dev`, then publish a courseware via the editor.
Expected: Preview still works (fallback reads from `preview-server/lessons/test/`). No behavioral change from Phase 1. If vite restarts without re-publishing, preview still works because the middleware falls back to disk files.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add courseware path registry and dynamic proxy with fallback"
```

---

## Phase 3: Electron local directory writing (Steps 3, 4, 5)

### Task 4: Add write-text-file and write-binary-file IPC handlers in Electron

**Files:**
- Modify: `electron/main.cjs` (add 2 new IPC handlers)
- Modify: `electron/preload.cjs` (expose new handlers)
- Modify: `src/types/electron.d.ts` (add TypeScript declarations)

- [ ] **Step 1: Add IPC handlers in electron/main.cjs**

Add after the existing `cleanup-unreferenced-images` handler (after line 127):

```javascript
// 写文本文件到任意路径
ipcMain.handle('write-text-file', async (_event, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error('write-text-file error:', e);
    return false;
  }
});

// 写二进制文件到任意路径（base64 编码）
ipcMain.handle('write-binary-file', async (_event, filePath, base64Data) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return true;
  } catch (e) {
    console.error('write-binary-file error:', e);
    return false;
  }
});
```

Note: `fs` and `path` are already imported at the top of `main.cjs` (line 1-2).

- [ ] **Step 2: Expose new APIs in electron/preload.cjs**

Add to the `contextBridge.exposeInMainWorld` object (after `cleanupUnreferencedImages`):

```javascript
writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
writeBinaryFile: (filePath, base64Data) => ipcRenderer.invoke('write-binary-file', filePath, base64Data),
```

- [ ] **Step 3: Add TypeScript declarations in src/types/electron.d.ts**

Add to the `ElectronAPI` interface (after `cleanupUnreferencedImages`):

```typescript
writeTextFile: (filePath: string, content: string) => Promise<boolean>;
writeBinaryFile: (filePath: string, base64Data: string) => Promise<boolean>;
```

- [ ] **Step 4: Commit**

```bash
git add electron/main.cjs electron/preload.cjs src/types/electron.d.ts
git commit -m "feat: add write-text-file and write-binary-file IPC handlers for Electron"
```

---

### Task 5: Modify /api/publish to accept outputDir and register in path table

**Files:**
- Modify: `vite.config.ts:126-182` (the `/api/publish` handler)

- [ ] **Step 1: Modify publish handler to support outputDir**

Change the `/api/publish` handler body to accept `outputDir` from the request payload. When `outputDir` is provided, write files to that local directory instead of `preview-server/`. Register the courseId → outputDir mapping in `courseOutputDirs`.

Replace the publish handler body (lines 130-176) with:

```typescript
const { courseId, finalConfig, lessonJs, resources, atlases, fileconfig, versionMap, outputDir } = JSON.parse(body);
const cid = `test_${courseId ?? 'forge'}`;
const projName = `${cid}_LessonZK`;

// 决定输出目录：Electron 模式传入本地路径，FSA 模式 fallback 到 preview-server
const lessonDir = outputDir
  ? path.join(outputDir, projName)
  : path.resolve(__dirname, 'preview-server/lessons/test', projName);
fs.mkdirSync(lessonDir, { recursive: true });

// 注册到路径表（动态代理优先读此目录）
if (outputDir) {
  courseOutputDirs.set(courseId ?? 'forge', outputDir);
}

fs.writeFileSync(path.join(lessonDir, 'finalConfig.json'), JSON.stringify(finalConfig, null, 2));
fs.writeFileSync(path.join(lessonDir, 'LessonZK.js'), lessonJs);
fs.writeFileSync(path.join(lessonDir, 'config.json'), JSON.stringify(finalConfig, null, 2));
fs.writeFileSync(path.join(lessonDir, `version_${cid}.json`), JSON.stringify(versionMap ?? {}, null, 2));
fs.writeFileSync(path.join(lessonDir, 'fileconfig.json'), JSON.stringify(fileconfig ?? {}, null, 2));

// atlas 文件
if (Array.isArray(atlases)) {
  for (const { atlasJson, pngBase64, atlasPath, pngPath } of atlases) {
    const ap = path.join(lessonDir, atlasPath);
    const pp = path.join(lessonDir, pngPath);
    fs.mkdirSync(path.dirname(ap), { recursive: true });
    fs.writeFileSync(ap, atlasJson);
    const pngData = pngBase64.split(',')[1];
    if (pngData) fs.writeFileSync(pp, Buffer.from(pngData, 'base64'));
  }
}

// 资源文件
if (Array.isArray(resources)) {
  for (const { from, to } of resources) {
    const hashedTo = (versionMap && versionMap[to]) ?? to;
    const destPath = path.join(lessonDir, hashedTo);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    if (from.startsWith('data:image')) {
      const base64 = from.split(',')[1];
      if (base64) fs.writeFileSync(destPath, Buffer.from(base64, 'base64'));
    } else {
      const srcPath = path.resolve(__dirname, 'public', from.startsWith('/') ? from.slice(1) : from);
      if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
    }
  }
}
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ ok: true, cid }));
```

Note: The `courseOutputDirs` Map is already defined in Task 3, so it's accessible within `forgePlugin()`.

- [ ] **Step 2: Verify fallback still works in FSA mode**

Run: `pnpm dev` (in browser, not Electron)
Expected: Publishing works as before — `outputDir` is null, files go to `preview-server/`, preview loads normally.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: /api/publish accepts outputDir, writes to local dir in Electron mode"
```

---

### Task 6: Modify export.ts to pass outputDir in Electron mode

**Files:**
- Modify: `src/utils/export.ts:558-562` (publishAndPreview payload)
- Modify: `src/utils/export.ts:614-618` (publishOnly payload)

- [ ] **Step 1: Add outputDir to payload in publishAndPreview()**

In `publishAndPreview()` (around line 558), add `outputDir` to the payload:

```typescript
const outputDir = window.electronAPI ? getCourseDirPath(course.id) : null;
const payload = {
  courseId: course.id, finalConfig, lessonJs, resources,
  atlases: atlases.map(a => ({ atlasJson: a.atlasJson, pngBase64: a.pngBase64, atlasPath: a.atlasPath, pngPath: a.pngPath })),
  fileconfig, versionMap, outputDir,
};
```

Add the import for `getCourseDirPath` at the top of the file (it's already imported via `readFileAsDataUrl` from `./electronFs` — just add `getCourseDirPath` to the import):

```typescript
import { readFileAsDataUrl, getCourseDirPath } from './electronFs';
```

- [ ] **Step 2: Add outputDir to payload in publishOnly()**

In `publishOnly()` (around line 614), same change:

```typescript
const outputDir = window.electronAPI ? getCourseDirPath(course.id) : null;
const payload = {
  courseId: course.id, finalConfig, lessonJs, resources,
  atlases: atlases.map(a => ({ atlasJson: a.atlasJson, pngBase64: a.pngBase64, atlasPath: a.atlasPath, pngPath: a.pngPath })),
  fileconfig, versionMap, outputDir,
};
```

- [ ] **Step 3: Verify Electron mode writes to local directory**

Run: `pnpm dev` + Electron app
Expected: Create/edit a course → click publish → check that the local course directory (the one shown in the toolbar course name click) now has a `test_<courseId>_LessonZK/` subdirectory with all courseware files. Preview URL on 6688 loads the courseware from the local directory.

- [ ] **Step 4: Commit**

```bash
git add src/utils/export.ts
git commit -m "feat: export.ts passes outputDir in Electron mode for local directory publishing"
```

---

## Phase 4: Remove 8080 port service (Step 7)

### Task 7: Remove 8080 port service from start.sh

**Files:**
- Modify: `start.sh:17-22` (remove preview server lines)
- Modify: `start.sh:33-35` (update preview URL examples)

- [ ] **Step 1: Remove npx serve from start.sh and update URL examples**

Remove lines 17-22 (the preview server startup). Change the URL examples to use 6688/preview-server:

```bash
#!/bin/bash
cd "$(dirname "$0")"

# ========== 启动流程 ==========
echo "=== Forge 启动 ==="

# 1. 停掉旧进程
./stop.sh 2>/dev/null

# 2. 启动编辑器 (端口 6688，含预览服务)
pnpm dev &
EDITOR_PID=$!
echo $EDITOR_PID > .pid
echo "编辑器+预览启动: http://localhost:6688 (pid $EDITOR_PID)"

# 3. 启动同步服务器 (端口 9001)
( cd socket_baiya && exec java -jar teachingService.jar ) &
SOCKET_PID=$!
echo $SOCKET_PID > .socket-pid
echo "同步服务器启动: localhost:9001 (pid $SOCKET_PID)"

echo ""
echo "=== 全部就绪 ==="
echo "编辑器: http://localhost:6688"
echo "预览真实课件: http://localhost:6688/preview-server/?course=s9_v8_89&type=1&ct=1&rl=dev"
echo "预览(教师): http://localhost:6688/preview-server/?course=test_forge&type=1&ip=127.0.0.1&port=9001&roomid=forge01&id=teacher&ct=1&rl=dev"
echo "预览(学生): http://localhost:6688/preview-server/?course=test_forge&type=2&ip=127.0.0.1&port=9001&roomid=forge01&id=student&ct=1&rl=dev"
echo ""
echo "停止: ./stop.sh"
```

- [ ] **Step 2: Update stop.sh to remove .preview-pid handling**

Check `stop.sh` and remove the preview-pid kill logic since there's no separate 8080 process anymore.

- [ ] **Step 3: Verify no 8080 dependency remains**

Run: `pnpm dev` (no separate 8080 server)
Expected: All preview functionality works via 6688/preview-server/. No references to 8080 remain in the codebase.

- [ ] **Step 4: Commit**

```bash
git add start.sh stop.sh
git commit -m "feat: remove 8080 preview server, all preview via :6688/preview-server"
```

---

## Self-Review

**1. Spec coverage:**
- Step 1 (static proxy): Covered in Task 1
- Step 2 (dynamic proxy + registry): Covered in Task 3
- Step 3 (publish outputDir): Covered in Task 5
- Step 4 (Electron IPC): Covered in Task 4
- Step 5 (export.ts outputDir): Covered in Task 6
- Step 6 (preview URL migration): Covered in Task 2
- Step 7 (remove 8080): Covered in Task 7
- FSA vs Electron mode split: Covered — `outputDir` is null in FSA mode, local path in Electron mode
- Fallback mechanism: Covered — dynamic proxy checks registry then falls back to disk

**2. Placeholder scan:** No TBD/TODO/fill-in-later found. All code blocks contain actual implementation code.

**3. Type consistency:**
- `getCourseDirPath(courseId)` returns `string | null` — matches the null check in export.ts
- `outputDir` type is `string | null` — consistent between export.ts payload and vite.config.ts handler
- `writeTextFile(filePath: string, content: string)` and `writeBinaryFile(filePath: string, base64Data: string)` — consistent across main.cjs, preload.cjs, and electron.d.ts
- `courseOutputDirs` Map keyed by courseId string — matches how `projName` derives courseId in the dynamic proxy