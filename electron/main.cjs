const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net: electronNet } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const {
  inspectCourseSaveTarget,
  saveCourseAsTransaction,
  serializeSaveAsError,
} = require('./courseSaveAs.cjs');

// 本地定义工具函数（避免引入跨模块依赖）
function lessonSuffix(kind) {
  if (kind === 'homework') return '_LessonHW';
  if (kind === 'sEvaluation') return '_LessonSSEVALUATION';
  if (kind === 'review') return '_LessonFXK';
  return '_LessonZK';
}

function mainClassName(kind) {
  if (kind === 'homework') return 'LessonHW';
  if (kind === 'sEvaluation') return 'LessonSSEVALUATION';
  if (kind === 'review') return 'LessonFXK';
  return 'LessonZK';
}

// 启用 GPU 加速，确保 WebGL 正常工作（Laya 依赖 WebGL 渲染）
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// 注册 forge-local 为特权协议（standard + secure + support CORS + streaming），
// 否则浏览器会把 forge-local:// URL 视为 opaque path，<video> 无法跨源加载
protocol.registerSchemesAsPrivileged([
  { scheme: 'forge-local', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

let mainWindow;
let inputWindowRef = null; // 服务器输入窗口引用，用于延迟销毁
let currentServerUrl = ''; // 供 IPC get-server-url 读取
const courseDirMap = new Map(); // courseId → courseDir，供 forge-local:// 协议查询

// ─── 服务器连接配置 ───

// 直接从 argv 匹配 URL（避免 Chromium 拒绝 --server= 等未知 switch）
function getServerUrlFromArgs() {
  return process.argv.find(a => /^https?:\/\//.test(a));
}

function loadSavedServerUrl() {
  const configPath = path.join(app.getPath('userData'), 'server_config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.serverUrl || '';
  } catch { return ''; }
}

function saveServerUrl(url) {
  const configPath = path.join(app.getPath('userData'), 'server_config.json');
  fs.writeFileSync(configPath, JSON.stringify({ serverUrl: url }), 'utf-8');
}

function checkServerReachable(url) {
  return new Promise((resolve) => {
    try {
      const match = url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/);
      if (!match) { resolve(false); return; }
      const host = match[1];
      const port = parseInt(match[2] || '80', 10);
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, host);
    } catch { resolve(false); }
  });
}

// ─── 服务器输入窗口（打包模式无 --server= 时使用） ───

// 注册 IPC：输入窗口提交服务器地址
ipcMain.handle('submit-server-url', (_event, url) => {
  if (!url) return { ok: false, error: '请输入服务器地址' };
  return { ok: true, url };
});

function showServerInputWindow() {
  const savedUrl = loadSavedServerUrl();

  return new Promise((resolve) => {
    inputWindowRef = new BrowserWindow({
      width: 480,
      height: 320,
      frame: false,
      resizable: false,
      center: true,
      webPreferences: {
        preload: path.join(__dirname, 'serverInputPreload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; -webkit-app-region: drag; }
  .box { text-align: center; width: 90%; }
  h1 { font-size: 1.5rem; letter-spacing: 0.1em; margin-bottom: 0.25rem; }
  p { font-size: 0.75rem; color: #94a3b8; margin-bottom: 1.25rem; }
  input { width: 100%; padding: 0.6rem 1rem; background: #1e293b; color: white; border-radius: 0.5rem; font-size: 0.9rem; border: 1px solid #475569; outline: none; margin-bottom: 0.75rem; -webkit-app-region: no-drag; }
  input:focus { border-color: #2563eb; }
  .error { color: #f87171; font-size: 0.75rem; margin-bottom: 0.5rem; min-height: 1rem; }
  button { width: 100%; padding: 0.75rem; background: #2563eb; color: white; border-radius: 0.5rem; font-size: 1rem; font-weight: 500; border: none; cursor: pointer; -webkit-app-region: no-drag; }
  .close-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; -webkit-app-region: no-drag; }
	  .close-btn:hover { background: #ef4444; color: white; }
</style></head>
<body>
  <button class="close-btn" onclick="window.close()">&times;</button>
  <div class="box">
    <h1>课件编辑器</h1>
    <p>课件编辑器 — 请输入服务器地址</p>
    <input id="url" type="text" placeholder="http://服务器IP:6688" value="${savedUrl}" />
    <div class="error" id="err"></div>
    <button id="btn" onclick="submit()">连接服务器</button>
  </div>
  <script>
    function submit() {
      var url = document.getElementById('url').value.trim();
      if (!url) return;
      window.electronServerInput.submit(url).then(function(result) {
        if (result.ok) {
          document.getElementById('btn').textContent = '连接中...';
        } else {
          document.getElementById('err').textContent = result.error;
        }
      });
    }
    document.getElementById('url').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submit();
    });
    document.getElementById('url').focus();
  </script>
</body>
</html>`;

    inputWindowRef.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // 监听 IPC 结果：只隐藏窗口，不关闭（避免 window-all-closed 触发 app.quit 闪退）
    ipcMain.once('server-url-result', (_event, url) => {
      saveServerUrl(url);
      inputWindowRef.hide();
      resolve(url);
    });

    inputWindowRef.on('closed', () => {
      inputWindowRef = null;
      resolve(null);
    });
  });
}

// ─── 主窗口创建 ───

async function createMainWindow() {
  // dev 和 packaged 统一走输入窗口选择服务器地址
  let serverUrl = getServerUrlFromArgs();
  if (!serverUrl) {
    serverUrl = await showServerInputWindow();
  }
  if (!serverUrl) {
    app.quit();
    return;
  }

  currentServerUrl = serverUrl;

  // 验证服务器可连接
  const reachable = await checkServerReachable(serverUrl);
  if (!reachable) {
    dialog.showErrorBox('连接失败', `无法连接到服务器 ${serverUrl}\n请确保服务器正在运行后重试。`);
    app.quit();
    return;
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenu(null);

  // setMenu(null) 会一并清掉 View 菜单里的 DevTools accelerator（F12 / Ctrl+Shift+I），
  // 这里手动绑定快捷键，恢复开关 DevTools 的能力。
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const isToggleDevtools =
      input.key === 'F12' ||
      (input.control && input.shift && (input.key === 'I' || input.key === 'i'));
    if (isToggleDevtools) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
      return;
    }
    // Ctrl+R / Ctrl+Shift+R 刷新（菜单清空后默认快捷键也失效，顺便补上）
    if (input.control && (input.key === 'R' || input.key === 'r')) {
      if (input.shift) mainWindow.webContents.reloadIgnoringCache();
      else mainWindow.webContents.reload();
      event.preventDefault();
    }
  });

  // 主窗口已创建，现在安全销毁输入窗口
  if (inputWindowRef) {
    inputWindowRef.destroy();
    inputWindowRef = null;
  }

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    dialog.showErrorBox('渲染进程崩溃', `reason: ${details.reason}\nexitCode: ${details.exitCode}`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    dialog.showErrorBox('页面加载失败', `${errorDescription} (${errorCode})\n${serverUrl}`);
  });

  mainWindow.loadURL(serverUrl);
}

// ─── IPC handlers ───

ipcMain.handle('get-server-url', () => currentServerUrl);

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('list-directory', (_event, dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(d => ({
      name: d.name,
      isDir: d.isDirectory(),
    }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('create-directory', (_event, parentPath, dirName) => {
  const fullPath = path.join(parentPath, dirName);
  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
});

ipcMain.handle('read-course-file', (_event, filePath) => {
  const text = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
});

ipcMain.handle('write-course-file', (_event, filePath, courseJson) => {
  fs.writeFileSync(filePath, courseJson, 'utf-8');
  return true;
});

ipcMain.handle('path-exists', (_event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('inspect-course-save-target', async (_event, params) => {
  try {
    return { ok: true, ...(await inspectCourseSaveTarget(params)) };
  } catch (error) {
    return serializeSaveAsError(error);
  }
});

ipcMain.handle('save-course-as', async (_event, params) => {
  try {
    const result = await saveCourseAsTransaction(params);
    courseDirMap.set(params.targetCourseId, result.targetDir);
    return { ok: true, ...result };
  } catch (error) {
    console.error('save-course-as error:', error);
    return serializeSaveAsError(error);
  }
});

ipcMain.handle('ensure-dir', (_event, dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
});

ipcMain.handle('open-folder', (_event, folderPath) => {
  shell.openPath(folderPath);
  return true;
});

ipcMain.handle('get-platform', () => {
  return { isElectron: true, platform: process.platform };
});

// ─── 图片相关 IPC ───

ipcMain.handle('save-image-to-course', (_event, courseDir, fileName, base64Data, ext) => {
  try {
    const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
    const SOUND_EXTS = ['.wav', '.mp3'];
    const isVideo = VIDEO_EXTS.includes('.' + ext);
    const isSound = SOUND_EXTS.includes('.' + ext);
    const subDir = isVideo ? 'images/animation' : isSound ? 'images/sound' : 'images';
    const imagesDir = path.join(courseDir, subDir);
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    // MD5 去重：所有类型都用 hash 判断是否已存在，内容相同直接返回已有路径
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(Buffer.from(base64Data, 'base64')).digest('hex').slice(0, 6);

    // 通用去重：扫描目录中是否已有含此 hash 的文件
    const existing = fs.readdirSync(imagesDir);
    for (const f of existing) {
      if (f.endsWith('.' + ext) && f.includes('_' + hash + '.')) {
        return `${subDir}/${f}`;
      }
    }

    // 视频文件：video_<hash>.<ext>
    if (isVideo) {
      const destName = `video_${hash}.${ext}`;
      const destPath = path.join(imagesDir, destName);
      fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
      return `${subDir}/${destName}`;
    }

    // 音频文件：audio_<hash>.<ext>
    if (isSound) {
      const destName = `audio_${hash}.${ext}`;
      const destPath = path.join(imagesDir, destName);
      fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
      return `${subDir}/${destName}`;
    }

    // 图片：img_<hash>.<ext>
    const destName = `img_${hash}.${ext}`;
    const destPath = path.join(imagesDir, destName);
    fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
    return `${subDir}/${destName}`;
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('copy-image-to-course', (_event, courseDir, srcPath) => {
  const ext = path.extname(srcPath).toLowerCase();
  const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
  const isVideo = VIDEO_EXTS.includes(ext);
  const subDir = isVideo ? 'images/animation' : 'images';
  const imagesDir = path.join(courseDir, subDir);
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  if (isVideo) {
    let idx = 0;
    const existing = fs.readdirSync(imagesDir);
    for (const f of existing) {
      const m = f.match(/^video_(\d+)\./);
      if (m) idx = Math.max(idx, parseInt(m[1]));
    }
    const destName = `video_${idx + 1}${ext}`;
    const destPath = path.join(imagesDir, destName);
    fs.copyFileSync(srcPath, destPath);
    return `${subDir}/${destName}`;
  }

  const baseName = path.basename(srcPath, ext);
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(fs.readFileSync(srcPath)).digest('hex').slice(0, 6);
  const destName = `${baseName}_${hash}${ext}`;
  const destPath = path.join(imagesDir, destName);
  if (!fs.existsSync(destPath)) fs.copyFileSync(srcPath, destPath);
  return `${subDir}/${destName}`;
});

ipcMain.handle('read-file-as-dataurl', (_event, courseDir, relativePath) => {
  const filePath = path.join(courseDir, relativePath);
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' }[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  const base64 = data.toString('base64');
  return `data:${mime};base64,${base64}`;
});

ipcMain.handle('save-font-to-course', (_event, courseDir, _fileName, base64Data, ext) => {
  try {
    const targetDir = path.join(courseDir, 'images', 'fonts');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const crypto = require('crypto');
    const buf = Buffer.from(base64Data, 'base64');
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    const cleanExt = String(ext || 'ttf').replace(/^\./, '').toLowerCase();
    const fileName = `${md5}.${cleanExt}`;
    const destPath = path.join(targetDir, fileName);

    if (!fs.existsSync(destPath)) fs.writeFileSync(destPath, buf);
    return `images/fonts/${fileName}`;
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('cleanup-unreferenced-images', (_event, courseDir, referencedPaths) => {
  const dirsToClean = [
    'images',
    'images/animation',
    'images/sound',
    'images/fonts',
    'images/library',
    'images/sound/library',
    'images/animation/library',
  ];
  const removedAnimFolders = [];
  for (const subDir of dirsToClean) {
    const dir = path.join(courseDir, subDir);
    if (!fs.existsSync(dir)) continue;
    const existing = fs.readdirSync(dir);
    for (const file of existing) {
      const fullPath = path.join(dir, file);
      if (file.startsWith('.')) continue;
      if (fs.statSync(fullPath).isDirectory()) {
        if (subDir === 'images/animation') {
          // library 子目录走独立条目（images/animation/library）按文件逐个清理，这里整体跳过
          if (file === 'library') continue;
          const prefix = `images/animation/${file}/`;
          const isReferenced = referencedPaths.some(p => p.startsWith(prefix));
          if (!isReferenced) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            removedAnimFolders.push(file);
          }
        }
        continue;
      }
      const relPath = `${subDir}/${file}`;
      if (!referencedPaths.includes(relPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    // animation 目录：同步清理 .manifest.json 中指向已删除目录的条目
    if (subDir === 'images/animation' && removedAnimFolders.length > 0) {
      const manifestPath = path.join(dir, '.manifest.json');
      if (fs.existsSync(manifestPath)) {
        const remaining = fs.readdirSync(dir);
        const hasSubDirs = remaining.some(f => {
          const fp = path.join(dir, f);
          return !f.startsWith('.') && fs.statSync(fp).isDirectory();
        });
        if (!hasSubDirs) {
          fs.unlinkSync(manifestPath);
        } else {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const removedSet = new Set(removedAnimFolders);
            let changed = false;
            for (const [hash, folder] of Object.entries(manifest)) {
              if (removedSet.has(folder)) {
                delete manifest[hash];
                changed = true;
              }
            }
            if (changed) {
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            }
          } catch { /* manifest 解析失败不阻塞清理 */ }
        }
      }
    }
  }
});

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

ipcMain.handle('remove-dir', async (_event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    return true;
  } catch (e) {
    console.error('remove-dir error:', e);
    throw e;
  }
});

ipcMain.handle('rename-file', async (_event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return true;
  } catch (e) {
    console.error('rename-file error:', e);
    return false;
  }
});

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

ipcMain.handle('copy-dir', async (_event, srcPath, destPath) => {
  try {
    // 注意：打包后 public/ 不在 asar 内（app.getAppPath() 指向 asar），
    // 使用此接口拷贝 public/ 资源时，需在 package.json build.extraResources 中配置 public/ 目录，
    // 并将此处的路径解析改为 process.resourcesPath
    const resolvedSrc = srcPath.startsWith('public/')
      ? path.join(app.getAppPath(), srcPath)
      : srcPath;
    copyDirRecursive(resolvedSrc, destPath);
    return true;
  } catch (e) {
    console.error('copy-dir error:', e);
    return false;
  }
});

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(src, entry.name);
    const destEntry = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

const { execFile } = require('child_process');

ipcMain.handle('get-subdirs', (_event, dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(dirPath, d.name));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('svn-commit', (_event, dirPath) => {
  return new Promise((resolve) => {
    execFile('TortoiseProc.exe', ['/command:commit', `/path:${dirPath}`, '/closeonend:2'], (err) => {
      resolve({ ok: !err || err.code === 0 });
    });
  });
});

ipcMain.handle('svn-get-url', (_event, dirPath) => {
  return new Promise((resolve) => {
    execFile('svn', ['info', '--show-item', 'url', dirPath], (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });
});

ipcMain.handle('svn-has-unversioned', (_event, dirPath) => {
  return new Promise((resolve) => {
    execFile('svn', ['status', dirPath], (err, stdout) => {
      resolve(!err && stdout.trim().length > 0);
    });
  });
});

ipcMain.handle('is-svn-directory', (_event, dirPath) => {
  let current = dirPath;
  while (current) {
    if (fs.existsSync(path.join(current, '.svn'))) return true;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return false;
});

// ─── forge-local:// 自定义协议 ───
// URL 格式: forge-local://<courseId>/<relativePath>
// 渲染进程通过 register-course-dir IPC 注册 courseId → courseDir 映射，
// 协议处理器据此找到磁盘文件并流式返回（适合大文件如视频）
//
// 注意：forge-local 不是 WHATWG "special scheme"，new URL() 会把它当作 opaque path，
// hostname 为空、pathname 包含 //courseId/... 。所以用字符串手动拆分代替 new URL()。

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.json': 'application/json', '.js': 'application/javascript',
    '.atlas': 'text/plain',
  }[ext] || 'application/octet-stream';
}

// CORS headers: forge-local 是跨源协议（渲染进程来自 http://server），
// 需要显式返回 Access-Control-Allow-Origin 才能让 <video> crossOrigin + canvas.drawImage 正常工作
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
  'Cache-Control': 'no-store',
};

function handleForgeLocalProtocol(request) {
  try {
    // OPTIONS 预检请求直接返回 204
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 手动拆分: forge-local://courseId/images/file.mp4
    const afterScheme = request.url.replace(/^forge-local:\/\//, '');
    const slashIdx = afterScheme.indexOf('/');
    const courseId = slashIdx >= 0 ? afterScheme.slice(0, slashIdx) : afterScheme;
    const resourcePath = slashIdx >= 0 ? afterScheme.slice(slashIdx + 1) : '';
    const relativePath = resourcePath.split(/[?#]/, 1)[0];
    // Standard scheme 会把 hostname 小写化，需要大小写不敏感查找
    const courseDir = courseDirMap.get(courseId)
      || [...courseDirMap.entries()].find(([k]) => k.toLowerCase() === courseId.toLowerCase())?.[1];
    if (!courseDir) {
      return new Response('Course not found: ' + courseId, { status: 404, headers: CORS_HEADERS });
    }
    let decodedRelativePath;
    try { decodedRelativePath = decodeURIComponent(relativePath); } catch { decodedRelativePath = relativePath; }
    const filePath = path.join(courseDir, decodedRelativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response('File not found', { status: 404, headers: CORS_HEADERS });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mime = getMimeType(filePath);

    // 解析 Range 请求（视频 seek 需要 206 Partial Content）
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
        const clampedEnd = Math.min(end, fileSize - 1);
        const chunkSize = clampedEnd - start + 1;

        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(chunkSize);
        fs.readSync(fd, buffer, 0, chunkSize, start);
        fs.closeSync(fd);

        return new Response(buffer, {
          status: 206,
          headers: {
            ...CORS_HEADERS,
            'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`,
            'Content-Length': chunkSize.toString(),
            'Content-Type': mime,
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }

    // 无 Range 请求：返回完整文件
    const data = fs.readFileSync(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': mime,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500, headers: CORS_HEADERS });
  }
}

// ─── IPC: register-course-dir ───

ipcMain.handle('register-course-dir', (_event, courseId, dirPath) => {
  if (courseId && dirPath) courseDirMap.set(courseId, dirPath);
  return true;
});

// ─── IPC: copy-local-file ───
// 磁盘级拷贝，不走 base64，适合大文件（视频等）

ipcMain.handle('copy-local-file', (_event, srcAbsPath, destAbsPath) => {
  try {
    fs.mkdirSync(path.dirname(destAbsPath), { recursive: true });
    fs.copyFileSync(srcAbsPath, destAbsPath);
    return true;
  } catch (e) {
    console.error('copy-local-file error:', e);
    return false;
  }
});

const VIDEO_FILE_LIMIT = 50 * 1024 * 1024;

function hashFileStream(absPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(absPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function promoteVideoTempFile(courseDir, tempPath, hash) {
  const animationDir = path.join(courseDir, 'images', 'animation');
  fs.mkdirSync(animationDir, { recursive: true });
  const candidates = [`video_${hash.slice(0, 6)}.mp4`, `video_${hash}.mp4`];
  for (const fileName of candidates) {
    const destPath = path.join(animationDir, fileName);
    if (!fs.existsSync(destPath)) {
      fs.renameSync(tempPath, destPath);
      return `images/animation/${fileName}`;
    }
    if (await hashFileStream(destPath) === hash) {
      fs.rmSync(tempPath, { force: true });
      return `images/animation/${fileName}`;
    }
  }
  throw new Error('视频内容哈希冲突');
}

function validateRemoteVideoPath(remotePath) {
  if (typeof remotePath !== 'string' || !remotePath.startsWith('/')) {
    throw new Error('视频下载路径无效');
  }
  const decoded = decodeURIComponent(remotePath);
  if (decoded.includes('..') || (
    !decoded.startsWith('/builtin/runtime/video-stage/')
    && !decoded.startsWith('/builtin/library/')
  )) {
    throw new Error('视频下载路径不在允许范围');
  }
  if (!/\.mp4$/i.test(decoded)) throw new Error('视频关卡只支持 MP4');
}

async function downloadVideoToTemp(remotePath, tempPath, expectedSize) {
  validateRemoteVideoPath(remotePath);
  if (!currentServerUrl) throw new Error('尚未连接资源服务器');
  const server = new URL(currentServerUrl);
  const target = new URL(remotePath, server.origin);
  if (target.origin !== server.origin) throw new Error('视频下载地址与当前服务器不一致');
  const transport = target.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.get(target, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`视频下载失败: HTTP ${response.statusCode}`));
        return;
      }
      const contentLength = Number(response.headers['content-length'] || 0);
      if (contentLength > VIDEO_FILE_LIMIT) {
        response.resume();
        reject(new Error('视频不能超过 50MB'));
        return;
      }
      if (expectedSize && contentLength && contentLength !== expectedSize) {
        response.resume();
        reject(new Error('视频大小与注册信息不一致'));
        return;
      }

      let size = 0;
      const md5 = crypto.createHash('md5');
      const sha256 = crypto.createHash('sha256');
      const validator = new Transform({
        transform(chunk, _encoding, callback) {
          size += chunk.length;
          if (size > VIDEO_FILE_LIMIT) {
            callback(new Error('视频不能超过 50MB'));
            return;
          }
          md5.update(chunk);
          sha256.update(chunk);
          callback(null, chunk);
        },
      });

      pipeline(response, validator, fs.createWriteStream(tempPath, { flags: 'wx' }))
        .then(() => {
          if (expectedSize && size !== expectedSize) throw new Error('视频大小与注册信息不一致');
          resolve({
            md5: md5.digest('hex'),
            sha256: sha256.digest('hex'),
            size,
          });
        })
        .catch(reject);
    });
    request.setTimeout(30000, () => request.destroy(new Error('视频下载超时')));
    request.on('error', reject);
  });
}

ipcMain.handle('materialize-video-to-course', async (_event, params) => {
  const courseDir = params?.courseDir;
  const source = params?.source;
  if (!courseDir || !source) return { ok: false, error: '缺少视频落盘参数' };

  const animationDir = path.join(courseDir, 'images', 'animation');
  fs.mkdirSync(animationDir, { recursive: true });
  const tempPath = path.join(animationDir, `.video-import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.tmp`);

  try {
    let hash;
    let size;
    if (source.kind === 'local') {
      if (path.extname(source.path || '').toLowerCase() !== '.mp4') throw new Error('视频关卡只支持 MP4');
      const stat = fs.statSync(source.path);
      if (!stat.isFile()) throw new Error('所选路径不是文件');
      if (stat.size > VIDEO_FILE_LIMIT) throw new Error('视频不能超过 50MB');
      size = stat.size;
      hash = await hashFileStream(source.path);
      await fs.promises.copyFile(source.path, tempPath);
    } else if (source.kind === 'remote') {
      const downloaded = await downloadVideoToTemp(source.path, tempPath, source.expectedSize);
      hash = downloaded.md5;
      size = downloaded.size;
      if (source.expectedHash) {
        const expectedHashAlgorithm = source.expectedHashAlgorithm || 'md5';
        const actualHash = expectedHashAlgorithm === 'md5'
          ? downloaded.md5
          : expectedHashAlgorithm === 'sha256-8'
            ? downloaded.sha256.slice(0, 8)
            : null;
        if (!actualHash) throw new Error('视频校验算法无效');
        if (actualHash !== source.expectedHash) {
          throw new Error('视频内容与注册信息不一致');
        }
      }
    } else {
      throw new Error('未知的视频来源');
    }

    const relativePath = await promoteVideoTempFile(courseDir, tempPath, hash);
    return { ok: true, relativePath, hash, size };
  } catch (error) {
    try { fs.rmSync(tempPath, { force: true }); } catch { /* ignore cleanup failure */ }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// ─── IPC: hash-file ───
// 流式 MD5，支持大文件（视频等），不一次性读进内存
ipcMain.handle('hash-file', (_event, absPath) => {
  return new Promise((resolve) => {
    try {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(absPath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve({ ok: true, hash: hash.digest('hex') }));
      stream.on('error', (err) => resolve({ ok: false, error: err.message }));
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
});

// ─── IPC: stat-file ───
// 返回 mtime 和 size，给 hash 缓存判失效用
ipcMain.handle('stat-file', (_event, absPath) => {
  try {
    const stat = fs.statSync(absPath);
    return { ok: true, mtime: stat.mtimeMs, size: stat.size };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── IPC: read-file-as-buffer ───
// 读取文件为 ArrayBuffer（用于远程上传视频等大文件）

ipcMain.handle('read-file-as-buffer', (_event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    // Electron IPC 会自动将 Buffer 序列化为 ArrayBuffer
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (e) {
    console.error('read-file-as-buffer error:', e);
    return null;
  }
});

// ─── IPC: compile-build ───
// 把 project/ 下的多个工程合并编译，输出到 esBuild/ 目录
// 参数: { courseDir, courseId, kind }
//   courseDir: 课件根目录 (如 D:/courses/s8_v8_01)
//   courseId: 课件 ID
//   kind: 'normal' | 'homework'

ipcMain.handle('compile-build', async (_event, { courseDir, courseId, kind, teacherId }) => {
  const os = require('os');
  const { execFileSync } = require('child_process');

  const projectDir = path.join(courseDir, 'project', courseId);
  if (!fs.existsSync(projectDir)) {
    return { ok: false, error: `project 目录不存在: ${projectDir}` };
  }

  const jsName = mainClassName(kind);

  // 1. 收集 project 下的子工程目录
  const subdirs = fs.readdirSync(projectDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => {
      // PREVIEW 排前面 (lessonTool 的做法：预习在整合列表首位)
      if (a.includes('PREVIEW')) return -1;
      if (b.includes('PREVIEW')) return 1;
      return a.localeCompare(b);
    });

  if (subdirs.length === 0) {
    return { ok: false, error: 'project 目录下没有子工程' };
  }

  const projPaths = subdirs.map(d => path.join(projectDir, d));

  // 2. 创建临时工作区 (以第一个工程为模板)
  const tempDir = path.join(os.tmpdir(), `forge_compile_${courseId}_${Date.now()}`);
  try {
    // 复制第一个工程作为基础模板
    copyDirRecursive(projPaths[0], tempDir);

    // 3. 合并其余工程的资源
    for (let i = 1; i < projPaths.length; i++) {
      const srcProj = projPaths[i];
      // 合并 src/view/ 下的子目录 (每个工程有自己的 game_lt/, game_preview/ 等)
      mergeDirContents(path.join(srcProj, 'src', 'view'), path.join(tempDir, 'src', 'view'));
      // 合并 laya/pages/ 下的子目录 (.scene 文件)
      mergeDirContents(path.join(srcProj, 'laya', 'pages'), path.join(tempDir, 'laya', 'pages'));
      // 合并 laya/assets/ 下的子目录 (资源文件)
      mergeDirContents(path.join(srcProj, 'laya', 'assets'), path.join(tempDir, 'laya', 'assets'));
    }

    // 4. 运行 layaair2-cmd ui 生成 layaMaxUI.ts
    // LayaAirCmdTool.max.js 参数: args[2]=laya/.laya路径, args[3+]=key=value
    // 完成判定：检测 "All Work complete" 后等待一段时间，让异步 fork（atlas/fileconfig 写文件）落盘
    // 打包后 process.execPath 是 Electron 主程序，需 ELECTRON_RUN_AS_NODE=1 才能当 node 用

    // 4.1 生成/更新 laya/styles.xml：把 animation 目录标记为 pack="2"（排除 atlas），
    // 防止 layaair2-cmd 把骨骼动画纹理 .png 打进 atlas 并删除原文件
    const stylesXmlPath = path.join(tempDir, 'laya', 'styles.xml');
    const stylesAssetsDir = path.join(tempDir, 'laya', 'assets');
    if (fs.existsSync(stylesAssetsDir)) {
      let stylesContent = fs.existsSync(stylesXmlPath) ? fs.readFileSync(stylesXmlPath, 'utf-8') : '<res>\n</res>';
      for (const dir of fs.readdirSync(stylesAssetsDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const animDir = path.join(stylesAssetsDir, dir.name, 'animation');
        if (!fs.existsSync(animDir)) continue;
        const entryName = `${dir.name}/animation`;
        if (!stylesContent.includes(`name="${entryName}"`)) {
          const item = `   <item name="${entryName}" type="" compress="0" pack="2" quality="80" props="" picType="0" scale="0"/>`;
          stylesContent = stylesContent.replace('</res>', `${item}\n</res>`);
        }
      }
      fs.writeFileSync(stylesXmlPath, stylesContent);
    }

    const layaCmdToolPath = resolveToolPath('layaair2-cmd', 'ProjectExportTools/LayaAirCmdTool.max.js');
    if (layaCmdToolPath) {
      try {
        const layaDotLaya = path.join(tempDir, 'laya', '.laya');
        const { execFile } = require('child_process');
        const logFile = path.join(os.tmpdir(), `forge_layaair_${Date.now()}.log`);
        const writeLog = (msg) => { try { fs.appendFileSync(logFile, msg); } catch { /* ignore */ } };
        writeLog(`[forge] layaair2-cmd start\n  execPath=${process.execPath}\n  layaCmdToolPath=${layaCmdToolPath}\n  tempDir=${tempDir}\n  isPackaged=${app.isPackaged}\n`);
        await new Promise((resolve, reject) => {
          // 子进程环境：必须设置 ELECTRON_RUN_AS_NODE=1，并清除 ATOM_SHELL_INTERNAL_RUN_AS_NODE
          // 让 layaair2-cmd 内部 child_process.fork() 的子进程也能继承这些 env，正常作为 Node 运行
          const childEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
          delete childEnv.ELECTRON_NO_ASAR;
          // 移除 Electron 相关 NODE_OPTIONS 干扰
          delete childEnv.NODE_OPTIONS;
          const child = execFile(process.execPath, [
            layaCmdToolPath,
            layaDotLaya,
            'clear=true',
            'exportUICode=true',
            'exportRes=true',
          ], {
            cwd: tempDir,
            timeout: 90000,
            env: childEnv,
            maxBuffer: 1024 * 1024 * 50,
          }, (err) => {
            writeLog(`[forge] layaair2-cmd exit: err=${err ? err.message : 'none'} killed=${err && err.killed}\n`);
            if (err && err.killed) resolve();
            else if (err) reject(err);
            else resolve();
          });
          let output = '';
          let killTimer = null;
          const fileconfigPath = path.join(tempDir, 'bin', 'fileconfig.json');
          const scheduleKill = () => {
            if (killTimer) return;
            // "All Work complete" 后，layaair2-cmd 还有 exportFileConfig 等异步 fork 在写文件
            // 轮询 fileconfig.json：存在且大小稳定后再 kill；最多等 30 秒兜底
            // （安装到 Program Files 等带空格/中文路径时，I/O 比 win-unpacked 慢）
            const startedAt = Date.now();
            let lastSize = -1;
            let stableCount = 0;
            const tick = () => {
              if (Date.now() - startedAt > 30000) {
                try { child.kill(); } catch { /* ignore */ }
                return;
              }
              try {
                const st = fs.statSync(fileconfigPath);
                if (st.size > 2 && st.size === lastSize) {
                  stableCount += 1;
                  if (stableCount >= 2) {
                    try { child.kill(); } catch { /* ignore */ }
                    return;
                  }
                } else {
                  stableCount = 0;
                  lastSize = st.size;
                }
              } catch { /* 文件还没出现 */ }
              killTimer = setTimeout(tick, 500);
            };
            killTimer = setTimeout(tick, 500);
          };
          child.stdout.on('data', (d) => {
            output += d;
            writeLog(`[stdout] ${d}`);
            if (output.includes('All Work complete')) scheduleKill();
          });
          child.stderr.on('data', (d) => { output += d; writeLog(`[stderr] ${d}`); });
        });
        // 把 fileconfig 是否生成、大小记录下来，方便诊断
        try {
          const fcPath = path.join(tempDir, 'bin', 'fileconfig.json');
          if (fs.existsSync(fcPath)) {
            const st = fs.statSync(fcPath);
            writeLog(`[forge] fileconfig.json exists, size=${st.size}\n`);
          } else {
            writeLog(`[forge] fileconfig.json NOT generated\n`);
          }
          const resPath = path.join(tempDir, 'bin', 'res');
          writeLog(`[forge] bin/res exists: ${fs.existsSync(resPath)}\n`);
        } catch (e) { writeLog(`[forge] check err: ${e.message}\n`); }
        writeLog(`[forge] log saved at: ${logFile}\n`);
        console.log('[forge] layaair2-cmd diagnostic log:', logFile);
      } catch (e) {
        console.warn('layaair2-cmd ui warning:', e.message || e);
      }
    }

    // 4.5. 修正 layaMaxUI.ts：layaair2-cmd 默认 ScaleButton.xml 把 runtime 写成
    // "component.ScaleButton"（未注册），sdk_baiya 实际注册为 "ScaleButton"，
    // 移除该字段后 getCompInstance 会按 type 走 uiClassMap 找到正确类
    const layaMaxUiPath = path.join(tempDir, 'src', 'ui', 'layaMaxUI.ts');
    if (fs.existsSync(layaMaxUiPath)) {
      let layaMaxUi = fs.readFileSync(layaMaxUiPath, 'utf-8');
      layaMaxUi = layaMaxUi.replace(/,?\s*"runtime"\s*:\s*"component\.ScaleButton"/g, '');
      fs.writeFileSync(layaMaxUiPath, layaMaxUi);
    }

    // 5. 重写 Main.ts（GameLoader 已初始化引擎，只需 init + __init__）
    const mainTs = `import GameConfig from "./GameConfig";
class ${jsName} {
    constructor() {
        GameConfig.init();
        com.biz.VipThink.__init__();
    }
}
Laya.class(${jsName},'${jsName}',null,null);
`;
    fs.writeFileSync(path.join(tempDir, 'src', 'Main.ts'), mainTs);

    // 6. 重新生成 GameConfig.ts (扫描所有 view 下的 scene ts，去重注册)
    generateGameConfig(tempDir);

    // 7. 运行 esbuild 编译（使用 JS API，避免二进制路径解析问题）
    const esbuild = resolveEsbuildModule();
    if (!esbuild) {
      return { ok: false, error: '找不到 esbuild 模块，请确保已安装 esbuild 依赖' };
    }

    const outJsPath = path.join(tempDir, 'bin', `${jsName}.js`);
    fs.mkdirSync(path.join(tempDir, 'bin'), { recursive: true });

    try {
      esbuild.buildSync({
        entryPoints: [path.join(tempDir, 'src', 'Main.ts')],
        outfile: outJsPath,
        bundle: true,
        charset: 'utf8',
        platform: 'browser',
        format: 'iife',
      });
    } catch (e) {
      const msg = e.errors ? e.errors.map(err => `${err.location?.file || ''}:${err.location?.line || ''} ${err.text}`).join('\n') : (e.message || String(e));
      return { ok: false, error: `esbuild 编译失败:\n${msg}` };
    }

    // 8. 合并 config.json (多工程的 pages 数组拼接)
    const { configJson, previewConfigJson } = mergeConfigs(projPaths, courseId);

    // 9. 输出到 esBuild/ 目录（先清空整个 esBuild 避免残留旧课件/旧 kind 产物）
    const suffix = lessonSuffix(kind);
    const outputName = `${courseId}${suffix}`;
    const esBuildRoot = path.join(courseDir, 'esBuild');
    if (fs.existsSync(esBuildRoot)) {
      fs.rmSync(esBuildRoot, { recursive: true, force: true });
    }
    const outputDir = path.join(esBuildRoot, outputName);
    fs.mkdirSync(outputDir, { recursive: true });

    // 拷贝编译产物
    if (fs.existsSync(outJsPath)) {
      // layaair2-cmd 编译时会从 laya.editorUI.xml 给组件注入 runtime 字段（如 "Laya.Skeleton"），
      // 但 sdk_baiya 已通过 regComponent 按 type 短名注册了所有组件类，不需要 runtime 辅助查找。
      // 错误的 runtime（如 "Laya.Skeleton"）反而会导致节点实例化失败。
      // 只保留 .ts 结尾的 runtime（页面级 view 路径），其余全部剥掉。
      let jsContent = fs.readFileSync(outJsPath, 'utf-8');
      jsContent = jsContent.replace(/(,\s*)?"runtime"\s*:\s*"([^"]*)"(\s*,)?/g, (match, before, value, after) => {
        if (value.endsWith('.ts')) return match;
        if (before && after) return ',';
        return '';
      });
      fs.writeFileSync(path.join(outputDir, `${jsName}.js`), jsContent);
    }

    // config.json（GameLoader 加载的主配置）
    fs.writeFileSync(path.join(outputDir, 'config.json'), JSON.stringify(configJson, null, 2));
    // finalConfig.json（与 config.json 内容相同，预览流程兼容）
    fs.writeFileSync(path.join(outputDir, 'finalConfig.json'), JSON.stringify(configJson, null, 2));
    if (previewConfigJson) {
      // GameLoader 按 regKey（test_<tid>_<cid>）请求预习配置
      const tid = teacherId || '';
      const regKey = tid ? `test_${tid}_${courseId}` : courseId;
      fs.writeFileSync(
        path.join(outputDir, `config_${regKey}_preview.json`),
        JSON.stringify(previewConfigJson, null, 2),
      );
    }

    // 拷贝 laya/assets/ 下的所有资源到输出目录
    const assetsDir = path.join(tempDir, 'laya', 'assets');
    if (fs.existsSync(assetsDir)) {
      copyAssetsToOutput(assetsDir, outputDir);
    }

    // 拷贝 animation 目录 (从各工程的 laya/assets/game_*/animation/ 到输出的 game_*/)
    copyAnimations(projPaths, outputDir);

    // 拷贝 atlas 目录（layaair2-cmd ui -a 生成在 bin/res/atlas/）
    const atlasSrc = path.join(tempDir, 'bin', 'res');
    if (fs.existsSync(atlasSrc)) {
      copyDirRecursive(atlasSrc, path.join(outputDir, 'res'));
    }

    // version_<regKey>.json（GameLoader 按 simpleCid 请求版本文件，预习/正课共用）
    const tidForVersion = teacherId || '';
    const regKeyForVersion = tidForVersion ? `test_${tidForVersion}_${courseId}` : courseId;
    fs.writeFileSync(path.join(outputDir, `version_${regKeyForVersion}.json`), JSON.stringify({}, null, 2));

    // fileconfig.json（atlas 图集映射）
    const fileconfigSrc = path.join(tempDir, 'bin', 'fileconfig.json');
    if (fs.existsSync(fileconfigSrc)) {
      fs.copyFileSync(fileconfigSrc, path.join(outputDir, 'fileconfig.json'));
    } else {
      fs.writeFileSync(path.join(outputDir, 'fileconfig.json'), JSON.stringify({}, null, 2));
    }

    // 按 fileconfig.json 修正 config.json 的 res 数组，并删除已入 atlas 的小图物理文件
    // fileconfig 结构: { "res/atlas/game_lt/image/img.atlas": ["game_lt/image/img/", ["a.png", ...]] }
    try {
      const fileconfig = JSON.parse(fs.readFileSync(path.join(outputDir, 'fileconfig.json'), 'utf-8'));

      // 构建集合：已进 atlas 的完整相对路径（如 "game_lt/image/img/img_01be32.png"）
      // 以及 prefix → atlasUrl 映射（如 "game_lt/image/img/" → "res/atlas/game_lt/image/img.atlas"）
      const atlasFiles = new Set();        // 已进 atlas 的图片相对路径
      const prefixToAtlas = new Map();     // prefix → atlasUrl
      for (const [atlasUrl, val] of Object.entries(fileconfig)) {
        const [prefix, files] = val;
        const normalPrefix = String(prefix).replace(/\\/g, '/').replace(/\/$/, '');
        prefixToAtlas.set(normalPrefix, atlasUrl);
        for (const f of files) {
          atlasFiles.add(`${normalPrefix}/${f}`);
        }
      }

      // 修正 config.json / finalConfig.json / preview config
      const configFiles = [
        path.join(outputDir, 'config.json'),
        path.join(outputDir, 'finalConfig.json'),
      ];
      // 扫描 preview config（config_*_preview.json）
      try {
        for (const f of fs.readdirSync(outputDir)) {
          if (f.startsWith('config_') && f.endsWith('_preview.json')) {
            configFiles.push(path.join(outputDir, f));
          }
        }
      } catch { /* ignore */ }

      for (const cfgPath of configFiles) {
        if (!fs.existsSync(cfgPath)) continue;
        try {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
          if (!Array.isArray(cfg.pages)) continue;
          let modified = false;
          for (const page of cfg.pages) {
            if (!Array.isArray(page.res)) continue;
            const newRes = [];
            const addedAtlas = new Set();
            for (const entry of page.res) {
              const url = entry.url;
              if (entry.type === 'image' && atlasFiles.has(url)) {
                // 这张图已进 atlas：不加散图条目，改加 atlas 引用
                // 找到该图所属 prefix
                const lastSlash = url.lastIndexOf('/');
                const prefix = url.slice(0, lastSlash);
                const atlasUrl = prefixToAtlas.get(prefix);
                if (atlasUrl && !addedAtlas.has(atlasUrl)) {
                  newRes.push({ url: atlasUrl });
                  addedAtlas.add(atlasUrl);
                }
                modified = true;
              } else {
                // atlas 条目本身或其他类型：原样保留（去重 atlas 引用）
                if (!entry.type && String(url).startsWith('res/atlas/')) {
                  if (!addedAtlas.has(url)) {
                    newRes.push(entry);
                    addedAtlas.add(url);
                  }
                } else {
                  newRes.push(entry);
                }
              }
            }
            if (modified) page.res = newRes;
          }
          if (modified) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        } catch { /* ignore */ }
      }

      // 删除已被打入 atlas 的小图物理文件（animation 目录的骨骼纹理除外）
      for (const [, val] of Object.entries(fileconfig)) {
        const [prefix, files] = val;
        for (const file of files) {
          const relFile = `${String(prefix).replace(/\\/g, '/')}${file}`;
          if (relFile.includes('/animation/')) continue;
          const p = path.join(outputDir, String(prefix).replace(/\//g, path.sep), file);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      }
    } catch { /* ignore */ }

    return { ok: true, outputDir };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  } finally {
    // 清理临时目录
    try {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
});

// 合并目录内容（不覆盖 share 目录）
function mergeDirContents(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'share') continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 解析 layaair2-cmd 路径 (dev: node_modules, packaged: extraResources)
function resolveToolPath(toolName, entryFile) {
  entryFile = entryFile || 'out/index.js';
  // 打包模式：extraResources/node_modules/layaair2-cmd
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, 'node_modules', toolName, entryFile);
    if (fs.existsSync(p)) return p;
  }
  // 开发模式：项目 node_modules
  const devPath = path.join(__dirname, '..', 'node_modules', toolName, entryFile);
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

// 解析 esbuild 模块（JS API）
function resolveEsbuildModule() {
  // 设置 ESBUILD_BINARY_PATH，绕过 esbuild 包查找逻辑（避免 @esbuild/win32-x64 找不到）
  if (!process.env.ESBUILD_BINARY_PATH) {
    const candidates = [];
    const platformDir = `${process.platform}-${process.arch}`; // 如 win32-x64
    if (app.isPackaged) {
      // 打包后：extraResources 下的二进制
      candidates.push(path.join(process.resourcesPath, 'node_modules', '@esbuild', platformDir, 'esbuild.exe'));
      candidates.push(path.join(process.resourcesPath, 'node_modules', '@esbuild', platformDir, 'bin', 'esbuild'));
    } else {
      // 开发环境：pnpm 的 @esbuild/win32-x64 在 .pnpm 下
      candidates.push(path.join(__dirname, '..', 'node_modules', '@esbuild', platformDir, 'esbuild.exe'));
      candidates.push(path.join(__dirname, '..', 'node_modules', '.pnpm', `@esbuild+${platformDir}@0.25.12`, 'node_modules', '@esbuild', platformDir, 'esbuild.exe'));
    }
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        process.env.ESBUILD_BINARY_PATH = c;
        break;
      }
    }
  }

  try { return require('esbuild'); } catch { /* ignore */ }
  // 打包模式：extraResources/node_modules/esbuild
  if (app.isPackaged) {
    try {
      const p = path.join(process.resourcesPath, 'node_modules', 'esbuild');
      return require(p);
    } catch { /* ignore */ }
  }
  return null;
}

// 重新生成 GameConfig.ts：扫描 src/view/ 下所有场景 ts，建立 import + reg
function generateGameConfig(workDir) {
  const viewDir = path.join(workDir, 'src', 'view');
  if (!fs.existsSync(viewDir)) return;

  const imports = [];
  const regs = [];
  const classNames = new Set();

  // 递归扫描 view 下所有 Game*.ts (排除 GameUtils.ts, Components/)
  function scanDir(dir, relBase) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'Components') continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else if (entry.isFile() && /^Game\w+\.ts$/.test(entry.name) && entry.name !== 'GameUtils.ts') {
        const baseName = entry.name.replace('.ts', '');
        const regPath = `view/${relPath}`;
        // 类名去重：同名时加上目录前缀
        let className = baseName;
        if (classNames.has(className)) {
          const dirName = relBase ? relBase.split('/').pop() : '';
          className = `${dirName}_${baseName}`;
        }
        classNames.add(className);
        imports.push(`import ${className} from "./view/${relPath.replace('.ts', '')}"`);
        regs.push(`        reg("${regPath}",${className});Laya.View.regComponent("${regPath}",${className});`);
      }
    }
  }

  scanDir(viewDir, '');

  // 扫描 MyKlView.ts (如果存在)
  const myKlViewPath = path.join(viewDir, 'MyKlView.ts');
  if (fs.existsSync(myKlViewPath)) {
    if (!classNames.has('MyKlView')) {
      imports.push('import MyKlView from "./view/MyKlView"');
      regs.push('        reg("view/MyKlView.ts",MyKlView);');
      classNames.add('MyKlView');
    }
  }

  const gameConfigTs = `/**This class is automatically generated by forge compile-build. */
${imports.join('\n')}
export default class GameConfig{
    static width:number=1920;
    static height:number=1080;
    static scaleMode:string="fixedwidth";
    static screenMode:string="horizontal";
    static alignV:string="middle";
    static alignH:string="center";
    static startScene:any="";
    static sceneRoot:string="";
    static debug:boolean=false;
    static stat:boolean=false;
    static physicsDebug:boolean=false;
    static exportSceneToJson:boolean=true;
    constructor(){}
    static init(){
        var reg: Function = Laya.ClassUtils.regClass;
${regs.join('\n')}
    }
}
GameConfig.init();`;

  fs.writeFileSync(path.join(workDir, 'src', 'GameConfig.ts'), gameConfigTs);
}

// 合并多工程 config.json：拼接 pages 数组，预习 config 单独提取
function mergeConfigs(projPaths, courseId) {
  let configJson = { pages: [] };
  let previewConfigJson = null;

  for (const projPath of projPaths) {
    const configPath = path.join(projPath, 'laya', 'assets', 'config.json');
    if (!fs.existsSync(configPath)) continue;

    let data;
    try { data = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { continue; }

    if (data.mode === 'preview') {
      previewConfigJson = data;
      continue;
    }

    // 合并顶层属性 (pages 除外)
    for (const key in data) {
      if (key !== 'pages') configJson[key] = data[key];
    }
    delete configJson['autoRunMain'];
    delete configJson['release'];

    if (Array.isArray(data.pages)) {
      for (const page of data.pages) {
        configJson.pages.push(page);
      }
    }
  }

  return { configJson, previewConfigJson };
}

// 拷贝 laya/assets/ 下的资源到输出目录 (game_lt/image/... 等)
function copyAssetsToOutput(assetsDir, outputDir) {
  const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'config.json' || entry.name === 'version.json') continue;
    const srcPath = path.join(assetsDir, entry.name);
    const destPath = path.join(outputDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 拷贝各工程中的 animation 目录到输出
function copyAnimations(projPaths, outputDir) {
  for (const projPath of projPaths) {
    const viewDir = path.join(projPath, 'src', 'view');
    if (!fs.existsSync(viewDir)) continue;
    const gameDirs = fs.readdirSync(viewDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const gd of gameDirs) {
      const animDir = path.join(projPath, 'laya', 'assets', gd.name, 'animation');
      if (fs.existsSync(animDir)) {
        const destAnimDir = path.join(outputDir, gd.name, 'animation');
        copyDirRecursive(animDir, destAnimDir);
      }
    }
  }
}

// ─── IPC: zip-directory ───
// 把目录递归打包成 zip，返回 ArrayBuffer（不带顶层目录，文件直接平铺）
// 用 electron/vendor/jszip.min.js（UMD 自包含，无外部依赖），跨平台稳定
ipcMain.handle('zip-directory', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return { ok: false, error: `目录不存在或不是目录: ${dirPath}` };
    }
    const jszipPath = path.join(__dirname, 'vendor', 'jszip.bundle.cjs');
    if (!fs.existsSync(jszipPath)) {
      return { ok: false, error: `jszip.bundle.cjs 未找到: ${jszipPath}` };
    }
    const JSZipMod = require(jszipPath);
    // 兼容不同导出形式：CommonJS / ES module default / 工厂函数未调用
    const JSZip = (typeof JSZipMod === 'function')
      ? JSZipMod
      : (typeof JSZipMod?.default === 'function' ? JSZipMod.default : null);
    if (!JSZip) {
      return { ok: false, error: `JSZip 加载异常: typeof=${typeof JSZipMod}, keys=${JSZipMod ? Object.keys(JSZipMod).join(',') : 'null'}` };
    }
    const zip = new JSZip();

    function addToZip(currentPath, zipPrefix) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentPath, entry.name);
        const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addToZip(full, zipPath);
        } else {
          zip.file(zipPath, fs.readFileSync(full));
        }
      }
    }
    addToZip(dirPath, '');

    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { ok: true, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  } catch (e) {
    console.error('zip-directory error:', e);
    return { ok: false, error: (e && e.stack) || String(e) };
  }
});

// ─── IPC: convert-spine ───
// Spine 文件夹 → Laya .sk + .png 转换
// 输入: { inputDir: string, outputDir?: string }
// 输出: { ok: true, skPath, pngPath } | { ok: false, error }
ipcMain.handle('convert-spine', async (_event, { inputDir, outputDir }) => {
  try {
    const { convertSpineToSk } = require('./spineToSk/spineToSkCli.cjs');
    const result = convertSpineToSk(inputDir, outputDir || undefined);
    return { ok: true, ...result };
  } catch (e) {
    console.error('convert-spine error:', e);
    return { ok: false, error: (e && e.message) || String(e) };
  }
});

// ─── IPC: convert-spine-all ───
// 批量转换：找到文件夹中所有 Spine 三件套并逐个转换
ipcMain.handle('convert-spine-all', async (_event, { inputDir, outputDir }) => {
  try {
    const { convertAllSpineToSk } = require('./spineToSk/spineToSkCli.cjs');
    const results = convertAllSpineToSk(inputDir, outputDir || undefined);
    return { ok: true, results };
  } catch (e) {
    console.error('convert-spine-all error:', e);
    return { ok: false, error: (e && e.message) || String(e) };
  }
});

// ─── IPC: PPT 导入相关 ───

// 检测 PowerPoint/WPS（Office 或 WPS Presentation）
ipcMain.handle('detect-powerpoint-engine', async () => {
  if (process.platform !== 'win32') {
    return { engine: null, error: 'Only Windows is supported' };
  }

  try {
    const { execSync } = require('child_process');

    // 注册表查询大小写不敏感；COM ProgID 也是。
    // 但 HKLM / HKCU / WOW6432Node 是不同位置：
    //   - Office/WPS 企业版通常注册到 HKLM
    //   - WPS 个人版/部分企业精简版只注册到 HKCU
    //   - 32位 WPS 装在 64 位 Windows 上时，会落到 HKLM\SOFTWARE\WOW6432Node\Classes
    const tryReg = (path) => {
      try {
        execSync(`reg query "${path}"`, { stdio: 'ignore' });
        return true;
      } catch { return false; }
    };

    // 1. 检测 Microsoft Office PowerPoint
    const officePaths = [
      'HKLM\\SOFTWARE\\Classes\\PowerPoint.Application',
      'HKCU\\SOFTWARE\\Classes\\PowerPoint.Application',
      'HKLM\\SOFTWARE\\WOW6432Node\\Classes\\PowerPoint.Application',
    ];
    if (officePaths.some(tryReg)) {
      return { engine: 'office', progId: 'PowerPoint.Application' };
    }

    // 2. 检测 WPS Presentation
    const wpsPaths = [
      'HKLM\\SOFTWARE\\Classes\\KWPP.Application',
      'HKCU\\SOFTWARE\\Classes\\KWPP.Application',
      'HKCU\\SOFTWARE\\Classes\\Kwpp.Application',
      'HKLM\\SOFTWARE\\WOW6432Node\\Classes\\KWPP.Application',
    ];
    if (wpsPaths.some(tryReg)) {
      return { engine: 'wps', progId: 'KWPP.Application' };
    }

    // 3. 都没有
    return { engine: null };
  } catch (e) {
    return { engine: null, error: e.message };
  }
});

// 检测 VC++ Runtime 是否已安装
ipcMain.handle('check-vcruntime', async () => {
  if (process.platform !== 'win32') return { installed: true }; // 非 Windows 无需检测

  try {
    const { execSync } = require('child_process');
    // 查注册表：VC++ 2015-2022 Redistributable (x64)
    // 这个版本的注册表键是 14.0（涵盖 2015-2022）
    execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Version', { stdio: 'ignore' });
    return { installed: true };
  } catch {
    return { installed: false };
  }
});

// 下载 VC++ Redistributable 安装包（从 Vite 服务器）
ipcMain.handle('download-vcredist', async (event, serverUrl) => {
  const url = `${serverUrl}/api/download-vcredist`;
  const dest = path.join(app.getPath('temp'), 'vc_redist.x64.exe');

  return new Promise((resolve, reject) => {
    const protocol = serverUrl.startsWith('https') ? require('https') : require('http');

    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const total = parseInt(res.headers['content-length'], 10) || 0;
      let downloaded = 0;
      let lastProgressTime = 0;

      const out = fs.createWriteStream(dest);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const now = Date.now();
        // 每 200ms 报告一次进度，避免频繁 IPC
        if (now - lastProgressTime > 200) {
          event.sender.send('download-vcredist-progress', { downloaded, total });
          lastProgressTime = now;
        }
      });

      res.pipe(out);

      out.on('finish', () => {
        out.close();
        resolve({ ok: true, path: dest });
      });

      out.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
});

// 打开安装包（调用系统默认方式）
ipcMain.handle('open-installer', async (_event, installerPath) => {
  await shell.openPath(installerPath);
  return { ok: true };
});

// 选择文件对话框
ipcMain.handle('select-file', async (_event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters || [],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// PPT 转换的活动进程注册表，key=conversionId，value={ proc, tempDir, cancelled }
// 用于支持点 X 时取消正在进行的转换
const _activePptConversions = new Map();

// PPT → PNG 转换（PowerShell + COM API）
ipcMain.handle('convert-ppt-to-images', async (event, { pptPath, progId, conversionId }) => {
  const tempDir = path.join(app.getPath('temp'), `ppt-convert-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // 注册可取消任务
  const cancelledRef = { value: false };
  if (conversionId) _activePptConversions.set(conversionId, { tempDir, cancelledRef });

  const cleanupTaskAndDir = () => {
    if (conversionId) _activePptConversions.delete(conversionId);
    if (fs.existsSync(tempDir)) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* 忽略 */ }
    }
  };

  try {
    if (cancelledRef.value) throw new Error('已取消');

    // PowerShell 脚本内容
    const psScript = `
param([string]$ProgId, [string]$PptPath, [string]$OutputDir)
try {
    $app = New-Object -ComObject $ProgId
    $pres = $app.Presentations.Open($PptPath, $true, $false, $false)
    for ($i = 1; $i -le $pres.Slides.Count; $i++) {
        $slide = $pres.Slides.Item($i)
        $outputPath = Join-Path $OutputDir "page-$i.png"
        $slide.Export($outputPath, "PNG", 1920, 1080)
    }
    $pres.Close()
    $app.Quit()
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`;

    // 将脚本写入临时文件
    const scriptPath = path.join(tempDir, 'convert.ps1');
    fs.writeFileSync(scriptPath, psScript, 'utf-8');

    // 调用 PowerShell 执行脚本
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-ProgId', progId,
        '-PptPath', pptPath,
        '-OutputDir', tempDir
      ]);

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d; });
      proc.stderr.on('data', (d) => { stderr += d; });

      proc.on('close', (code) => {
        if (cancelledRef.value) return reject(new Error('已取消'));
        if (code !== 0) {
          return reject(new Error(`PowerShell 脚本执行失败 (退出码 ${code}):\n${stderr || stdout}`));
        }
        resolve(null);
      });

      proc.on('error', reject);

      // 定期检查取消标记
      const checkInterval = setInterval(() => {
        if (cancelledRef.value) {
          clearInterval(checkInterval);
          try { proc.kill(); } catch { /* 忽略 */ }
          reject(new Error('已取消'));
        }
      }, 500);

      proc.on('close', () => clearInterval(checkInterval));
    });

    if (cancelledRef.value) throw new Error('已取消');

    // 收集生成的 PNG 文件
    const images = fs.readdirSync(tempDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)[1]);
        const numB = parseInt(b.match(/page-(\d+)\.png/)[1]);
        return numA - numB;
      })
      .map(f => path.join(tempDir, f));

    if (conversionId) _activePptConversions.delete(conversionId);
    return { ok: true, images, tempDir };

  } catch (e) {
    cleanupTaskAndDir();
    return { ok: false, error: e.message, cancelled: cancelledRef.value };
  }
});

// 取消正在进行的 PPT 转换
ipcMain.handle('cancel-ppt-conversion', async (_event, conversionId) => {
  const task = _activePptConversions.get(conversionId);
  if (!task) return { ok: false, error: 'no active conversion' };
  task.cancelled = true;
  if (task.proc) {
    try {
      // Windows 上 spawn 的子进程要用 taskkill /F /T 才能杀干净（包括子孙进程）
      if (process.platform === 'win32') {
        require('child_process').exec(`taskkill /pid ${task.proc.pid} /F /T`);
      } else {
        task.proc.kill('SIGTERM');
      }
    } catch { /* 忽略 */ }
  }
  return { ok: true };
});

// 清理临时转换目录
ipcMain.handle('cleanup-temp-dir', async (_event, dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  return { ok: true };
});

app.whenReady().then(async () => {
  // 注册 forge-local 自定义协议（须在 app ready 之后）
  protocol.handle('forge-local', handleForgeLocalProtocol);

  try {
    await createMainWindow();
  } catch (e) {
    console.error('Failed to create main window:', e);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
