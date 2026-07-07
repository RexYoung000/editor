# PPT 导入功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在文件菜单新增"导入 PPT"功能，将 PowerPoint 每页转为图片并生成关卡。

**Architecture:** LibreOffice CLI 转 PPT→PDF，pdftoppm 转 PDF→PNG（1920×1080），Electron 主进程处理转换，渲染进程 UI 展示进度并生成关卡。首次使用时从 Vite 服务下载 LibreOffice 安装包，用户手动安装。

**Tech Stack:** Electron IPC、Vite middleware、LibreOffice CLI、pdftoppm、React、Zustand

---

## 文件结构

### 新建文件
- `resources/bin/pdftoppm.exe` - Windows PDF 转 PNG 工具（~2MB）
- `resources/bin/pdftoppm` - Mac PDF 转 PNG 工具（~2MB，需 chmod +x）
- `src/utils/pptImport.ts` - LibreOffice 检测工具函数
- `src/components/ImportPPTDialog.tsx` - PPT 导入对话框 UI
- `src/types/electron.d.ts` - Electron API 类型定义（如不存在）

### 修改文件
- `vite.config.ts` - 添加 `/api/download-libreoffice` middleware
- `electron/main.cjs` - 添加 6 个新 IPC handler
- `electron/preload.cjs` - 暴露 6 个新接口
- `src/components/FileMenu.tsx` - 添加"导入 PPT"菜单项
- `package.json` - 添加 electron-builder extraResources 配置（如需要）

---

## Task 1: 准备 pdftoppm 二进制

**Files:**
- Create: `resources/bin/pdftoppm.exe`
- Create: `resources/bin/pdftoppm`

- [ ] **步骤 1: 创建 resources/bin 目录**

```bash
mkdir -p resources/bin
```

- [ ] **步骤 2: 下载 Windows pdftoppm**

从 http://blog.alivate.com.au/poppler-windows/ 下载 poppler 预编译版，解压出 `pdftoppm.exe`（约 2MB），复制到 `resources/bin/pdftoppm.exe`。

或使用已有的 poppler 安装：
```bash
# 如果本机装了 poppler
cp /path/to/poppler/bin/pdftoppm.exe resources/bin/
```

- [ ] **步骤 3: 下载 Mac pdftoppm**

```bash
# Mac 上用 Homebrew
brew install poppler
cp /opt/homebrew/bin/pdftoppm resources/bin/pdftoppm
```

- [ ] **步骤 4: 设置 Mac 二进制可执行权限**

```bash
chmod +x resources/bin/pdftoppm
```

- [ ] **步骤 5: 验证二进制可用**

```bash
# Windows (PowerShell)
.\resources\bin\pdftoppm.exe -h

# Mac
./resources/bin/pdftoppm -h
```

Expected: 显示 pdftoppm 帮助信息

- [ ] **步骤 6: Commit**

```bash
git add resources/bin/
git commit -m "feat: 添加 pdftoppm 二进制用于 PDF 转 PNG"
```


## Task 2: Vite Middleware - 下载 LibreOffice

**Files:**
- Modify: `vite.config.ts`

- [ ] **步骤 1: 在 forgePlugin 里添加 middleware**

在 `vite.config.ts` 的 `forgePlugin()` 函数中，找到 `configureServer` 部分，在现有 middleware 之后添加：

```typescript
// 在 server.middlewares.use 已有的 middleware 之后添加
const installersDir = path.resolve(__dirname, 'installers');

server.middlewares.use((req, res, next) => {
  const url = req.url?.replace(/\/\/+/g, '/').replace(/\?.*$/, '');
  if (!url?.startsWith('/api/download-libreoffice')) return next();
  
  const platform = new URL(req.url, 'http://x').searchParams.get('platform');
  if (platform !== 'win' && platform !== 'mac') {
    res.statusCode = 400;
    res.end('Invalid platform');
    return;
  }
  
  const fileName = platform === 'win'
    ? 'LibreOffice_25.8.6_Win_x86-64.msi'
    : 'LibreOffice_25.8.6_MacOS_x86-64.dmg';
  
  const filePath = path.join(installersDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Installer not found');
    return;
  }
  
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  
  fs.createReadStream(filePath).pipe(res);
});
```

- [ ] **步骤 2: 测试 middleware**

启动 vite：
```bash
pnpm dev
```

用浏览器访问：
- `http://localhost:6688/api/download-libreoffice?platform=win`

Expected: 浏览器开始下载 LibreOffice_25.8.6_Win_x86-64.msi

- [ ] **步骤 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: 添加 LibreOffice 下载 middleware"
```


## Task 3: Electron IPC - 检测 LibreOffice

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`

- [ ] **步骤 1: main.cjs 添加检测 handler**

在 `electron/main.cjs` 中，找到其他 `ipcMain.handle` 的位置，添加新的 handler：

```javascript
ipcMain.handle('get-libreoffice-path', async (_event, method) => {
  if (process.platform === 'win32') {
    if (method === 'registry' || method === 'registry-wow64') {
      const key = method === 'registry'
        ? 'HKLM\\SOFTWARE\\LibreOffice\\UNO\\InstallPath'
        : 'HKLM\\SOFTWARE\\WOW6432Node\\LibreOffice\\UNO\\InstallPath';
      
      return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(`reg query "${key}" /v Path`, (err, stdout) => {
          if (err) return resolve(null);
          const match = stdout.match(/Path\s+REG_SZ\s+(.+)/);
          if (match) {
            const installPath = match[1].trim();
            const soffice = path.join(installPath, 'program', 'soffice.exe');
            return resolve(fs.existsSync(soffice) ? soffice : null);
          }
          resolve(null);
        });
      });
    }
  }
  return null;
});
```

- [ ] **步骤 2: preload.cjs 暴露接口**

在 `electron/preload.cjs` 的 `contextBridge.exposeInMainWorld('electronAPI', { ... })` 对象中添加：

```javascript
getLibreOfficePath: (method) => ipcRenderer.invoke('get-libreoffice-path', method),
```

- [ ] **步骤 3: Commit**

```bash
git add electron/main.cjs electron/preload.cjs
git commit -m "feat: 添加 LibreOffice 路径检测 IPC"
```


## Task 4: Electron IPC - 下载与安装

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`

- [ ] **步骤 1: main.cjs 添加下载 handler**

在 `electron/main.cjs` 中添加：

```javascript
ipcMain.handle('download-libreoffice', async (event, serverUrl) => {
  const platform = process.platform === 'win32' ? 'win' : 'mac';
  const ext = platform === 'win' ? '.msi' : '.dmg';
  const url = `${serverUrl}/api/download-libreoffice?platform=${platform}`;
  const dest = path.join(app.getPath('temp'), `libreoffice-installer${ext}`);
  
  return new Promise((resolve, reject) => {
    const protocol = serverUrl.startsWith('https') ? require('https') : require('http');
    
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      const total = parseInt(res.headers['content-length'], 10);
      let downloaded = 0;
      let lastProgressTime = 0;
      
      const out = fs.createWriteStream(dest);
      
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const now = Date.now();
        if (now - lastProgressTime > 200) {
          event.sender.send('libreoffice-download-progress', { downloaded, total });
          lastProgressTime = now;
        }
      });
      
      res.pipe(out);
      
      out.on('finish', () => {
        event.sender.send('libreoffice-download-progress', { downloaded: total, total });
        resolve(dest);
      });
      
      out.on('error', reject);
    }).on('error', reject);
  });
});
```

- [ ] **步骤 2: main.cjs 添加打开安装器 handler**

```javascript
ipcMain.handle('open-installer', async (_event, installerPath) => {
  const { shell } = require('electron');
  await shell.openPath(installerPath);
  return { ok: true };
});
```

- [ ] **步骤 3: main.cjs 添加文件选择 handler**

```javascript
ipcMain.handle('select-file', async (_event, options) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters || [],
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
});
```

- [ ] **步骤 4: preload.cjs 暴露接口**

在 `electron/preload.cjs` 中添加：

```javascript
downloadLibreOffice: (serverUrl) => ipcRenderer.invoke('download-libreoffice', serverUrl),
on: (channel, callback) => {
  if (channel === 'libreoffice-download-progress') {
    ipcRenderer.on(channel, callback);
  }
},
off: (channel, callback) => {
  if (channel === 'libreoffice-download-progress') {
    ipcRenderer.removeListener(channel, callback);
  }
},
openInstaller: (installerPath) => ipcRenderer.invoke('open-installer', installerPath),
selectFile: (options) => ipcRenderer.invoke('select-file', options),
```

- [ ] **步骤 5: Commit**

```bash
git add electron/main.cjs electron/preload.cjs
git commit -m "feat: 添加下载与安装 LibreOffice 的 IPC"
```


## Task 5: Electron IPC - PPT 转换

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`

- [ ] **步骤 1: main.cjs 添加转换 handler**

在 `electron/main.cjs` 中添加（这是最长的一个 handler）：

```javascript
ipcMain.handle('convert-ppt-to-images', async (event, { pptPath, sofficeExe }) => {
  const tempDir = path.join(app.getPath('temp'), `ppt-convert-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // 步骤 1：PPT → PDF
    const pdfPath = path.join(tempDir, 'output.pdf');
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(sofficeExe, [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', tempDir,
        pptPath
      ]);
      
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d; });
      
      proc.on('close', (code) => {
        if (code !== 0) return reject(new Error(`soffice 失败: ${stderr}`));
        const actualPdf = path.join(tempDir, path.basename(pptPath, path.extname(pptPath)) + '.pdf');
        if (!fs.existsSync(actualPdf)) {
          return reject(new Error('PDF 未生成'));
        }
        fs.renameSync(actualPdf, pdfPath);
        resolve(null);
      });
      
      proc.on('error', reject);
    });
    
    // 步骤 2：PDF → PNG
    const isDev = !app.isPackaged;
    const binDir = isDev
      ? path.join(__dirname, '..', 'resources', 'bin')
      : path.join(process.resourcesPath, 'bin');
    const pdftoppm = path.join(binDir, process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm');
    
    if (!fs.existsSync(pdftoppm)) {
      throw new Error(`pdftoppm not found at ${pdftoppm}`);
    }
    
    const outputPrefix = path.join(tempDir, 'page');
    
    await new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(pdftoppm, [
        '-png',
        '-scale-to-x', '1920',
        '-scale-to-y', '1080',
        pdfPath,
        outputPrefix
      ]);
      
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d; });
      
      proc.on('close', (code) => {
        if (code !== 0) return reject(new Error(`pdftoppm 失败: ${stderr}`));
        resolve(null);
      });
      
      proc.on('error', reject);
    });
    
    // 步骤 3：收集 PNG 文件
    const files = fs.readdirSync(tempDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)[1]);
        const numB = parseInt(b.match(/page-(\d+)\.png/)[1]);
        return numA - numB;
      })
      .map(f => path.join(tempDir, f));
    
    return { ok: true, images: files, tempDir };
    
  } catch (e) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    return { ok: false, error: e.message };
  }
});
```

- [ ] **步骤 2: main.cjs 添加清理临时目录 handler**

```javascript
ipcMain.handle('cleanup-temp-dir', async (_event, dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  return { ok: true };
});
```

- [ ] **步骤 3: preload.cjs 暴露接口**

在 `electron/preload.cjs` 中添加：

```javascript
convertPptToImages: (params) => ipcRenderer.invoke('convert-ppt-to-images', params),
cleanupTempDir: (dirPath) => ipcRenderer.invoke('cleanup-temp-dir', dirPath),
```

- [ ] **步骤 4: Commit**

```bash
git add electron/main.cjs electron/preload.cjs
git commit -m "feat: 添加 PPT 转图片的 IPC handler"
```


## Task 6: 工具函数 - detectLibreOffice

**Files:**
- Create: `src/utils/pptImport.ts`

- [ ] **步骤 1: 创建 pptImport.ts 文件**

创建 `src/utils/pptImport.ts` 并写入：

```typescript
export async function detectLibreOffice(): Promise<string | null> {
  const platform = await window.electronAPI.getPlatform();
  
  if (platform === 'win32') {
    // ① 注册表 HKLM\SOFTWARE\LibreOffice\UNO\InstallPath
    let path = await window.electronAPI.getLibreOfficePath('registry');
    if (path) return path;
    
    // ② 注册表 WoW6432Node
    path = await window.electronAPI.getLibreOfficePath('registry-wow64');
    if (path) return path;
    
    // ③ 常见路径
    const commonPath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    const exists = await window.electronAPI.pathExists(commonPath);
    if (exists) return commonPath;
    
    return null;
  }
  
  if (platform === 'darwin') {
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    const exists = await window.electronAPI.pathExists(macPath);
    return exists ? macPath : null;
  }
  
  return null;
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/utils/pptImport.ts
git commit -m "feat: 添加 detectLibreOffice 工具函数"
```


## Task 7: UI 组件 - ImportPPTDialog (Part 1/2)

**Files:**
- Create: `src/components/ImportPPTDialog.tsx`

由于这个组件较大，分两部分实现。

### Part 1: 基础结构和状态管理

- [ ] **步骤 1: 创建组件文件并导入依赖**

创建 `src/components/ImportPPTDialog.tsx`，写入导入和类型定义：

```typescript
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { showToast } from '../utils/toast';
import { detectLibreOffice } from '../utils/pptImport';
import { getCourseDirPath } from '../utils/electronFs';
import type { Element, SubPage, Stage } from '../types';

type Step = 'select-file' | 'detecting' | 'need-install' | 'downloading' | 'waiting-install' | 'converting';

interface ImportPPTDialogProps {
  onClose: () => void;
}
```

- [ ] **步骤 2: 添加组件主体和状态**

继续在文件中添加：

```typescript
export default function ImportPPTDialog({ onClose }: ImportPPTDialogProps) {
  const currentCourse = useEditorStore((state) => state.currentCourse);
  
  const [step, setStep] = useState<Step>('select-file');
  const [pptPath, setPptPath] = useState<string | null>(null);
  const [sofficeExe, setSofficeExe] = useState<string | null>(null);
  
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [convertProgress, setConvertProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    const progressHandler = (_: any, progress: { downloaded: number; total: number }) => {
      setDownloadProgress(progress);
    };
    window.electronAPI.on?.('libreoffice-download-progress', progressHandler);
    return () => window.electronAPI.off?.('libreoffice-download-progress', progressHandler);
  }, []);
```

- [ ] **步骤 3: 添加文件选择和检测逻辑**

继续添加：

```typescript
  const handleSelectFile = async () => {
    const result = await window.electronAPI.selectFile?.({
      filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt'] }],
    });
    
    if (!result) return;
    
    setPptPath(result);
    setStep('detecting');
    
    const detected = await detectLibreOffice();
    
    if (detected) {
      setSofficeExe(detected);
      setStep('converting');
      await handleConvert(result, detected);
    } else {
      setStep('need-install');
    }
  };

  const handleDownload = async () => {
    setStep('downloading');
    try {
      const serverUrl = (localStorage.getItem('forge_server_url') || window.location.origin).replace(/\/+$/, '');
      const installerPath = await window.electronAPI.downloadLibreOffice(serverUrl);
      setDownloadProgress(null);
      
      await window.electronAPI.openInstaller(installerPath);
      setStep('waiting-install');
    } catch (e) {
      showToast('下载失败: ' + (e as Error).message, 'error');
      setStep('need-install');
    }
  };

  const handleRetryDetect = async () => {
    setStep('detecting');
    const detected = await detectLibreOffice();
    
    if (detected) {
      setSofficeExe(detected);
      setStep('converting');
      await handleConvert(pptPath!, detected);
    } else {
      showToast('仍未检测到 LibreOffice，请确认安装成功', 'error');
      setStep('waiting-install');
    }
  };
```

- [ ] **步骤 4: Commit Part 1**

```bash
git add src/components/ImportPPTDialog.tsx
git commit -m "feat(ImportPPTDialog): 添加基础结构和状态管理"
```


### Part 2: 转换逻辑和 UI 渲染

- [ ] **步骤 5: 添加转换核心逻辑**

继续在 `ImportPPTDialog.tsx` 中添加：

```typescript
  const handleConvert = async (pptPath: string, sofficeExe: string) => {
    if (!currentCourse) {
      showToast('请先打开或新建课程', 'error');
      return;
    }
    
    try {
      const result = await window.electronAPI.convertPptToImages({ pptPath, sofficeExe });
      
      if (!result.ok) {
        throw new Error(result.error);
      }
      
      const { images, tempDir } = result;
      setConvertProgress({ current: 0, total: images.length });
      
      const courseId = currentCourse.id;
      const courseDirPath = getCourseDirPath(courseId);
      if (!courseDirPath) {
        throw new Error('课程目录不存在');
      }
      
      const pptFileName = pptPath.split(/[/\\]/).pop()!.replace(/\.(pptx?|PPTX?)$/, '');
      const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      for (let i = 0; i < images.length; i++) {
        const imgPath = images[i];
        
        const buffer = await window.electronAPI.readFileAsBuffer(imgPath);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        
        const relativePath = await window.electronAPI.saveImageToCourse(
          courseDirPath,
          `ppt_page_${i + 1}`,
          base64,
          'png'
        );
        
        const stageNum = currentCourse.stages.length + 1;
        
        const newElement: Element = {
          id: genId('el'),
          type: 'NewImage',
          layaType: 'Image',
          name: '背景图',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          rotation: 0,
          opacity: 1,
          locked: false,
          props: { skin: relativePath },
          actions: [],
        };
        
        const newSubPage: SubPage = {
          id: genId('subpage'),
          name: `${pptFileName} - 页 ${i + 1}`,
          elements: [newElement],
        };
        
        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 ${stageNum}`,
          subPages: [newSubPage],
        };
        
        useEditorStore.getState().currentCourse!.stages.push(newStage);
        
        setConvertProgress({ current: i + 1, total: images.length });
      }
      
      await window.electronAPI.cleanupTempDir(tempDir);
      
      const { currentCourse: course } = useEditorStore.getState();
      if (course) {
        course.stages.forEach((stage, idx) => {
          stage.name = `关卡 ${idx + 1}`;
        });
        useEditorStore.getState().saveHistory();
      }
      
      showToast(`成功导入 ${images.length} 页 PPT`, 'success');
      onClose();
      
    } catch (e) {
      showToast('转换失败: ' + (e as Error).message, 'error');
      setStep('select-file');
    }
  };
```

- [ ] **步骤 6: 添加 UI 渲染部分**

继续添加 JSX 渲染：

```typescript
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-[500px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <span className="text-lg font-medium">导入 PPT</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'select-file' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">选择要导入的 PowerPoint 文件</p>
              <button
                onClick={handleSelectFile}
                className="py-3 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
              >
                选择 PPT 文件
              </button>
            </div>
          )}

          {step === 'detecting' && (
            <div className="flex flex-col gap-4 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-300">检测 LibreOffice...</p>
            </div>
          )}

          {step === 'need-install' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">
                导入 PPT 需要 LibreOffice 支持。
              </p>
              <p className="text-sm text-slate-400">
                首次使用需下载安装 LibreOffice（约 350 MB）。
                下载完成后会自动打开安装向导，按提示完成安装即可。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  取消
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
                >
                  下载并安装
                </button>
              </div>
            </div>
          )}

          {step === 'downloading' && downloadProgress && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">下载 LibreOffice</p>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-400">
                {(downloadProgress.downloaded / 1024 / 1024).toFixed(1)} MB / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          )}

          {step === 'waiting-install' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">请完成 LibreOffice 安装向导</p>
              <p className="text-sm text-slate-400">
                安装向导已打开，请按提示完成安装。安装完成后点击下方按钮继续。
              </p>
              <button
                onClick={handleRetryDetect}
                className="py-2.5 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium"
              >
                我已安装完成，继续
              </button>
            </div>
          )}

          {step === 'converting' && convertProgress && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">正在转换并保存</p>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${(convertProgress.current / convertProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-400">
                第 {convertProgress.current} / {convertProgress.total} 页
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 7: Commit Part 2**

```bash
git add src/components/ImportPPTDialog.tsx
git commit -m "feat(ImportPPTDialog): 添加转换逻辑和 UI 渲染"
```


## Task 8: FileMenu 集成

**Files:**
- Modify: `src/components/FileMenu.tsx`

- [ ] **步骤 1: 导入依赖**

在 `src/components/FileMenu.tsx` 文件顶部添加导入：

```typescript
import ImportPPTDialog from './ImportPPTDialog';
import { FileInput } from 'lucide-react';
```

- [ ] **步骤 2: 添加状态**

在组件内部，找到现有的 `useState` 声明，添加新状态：

```typescript
const [showImportPPT, setShowImportPPT] = useState(false);
```

- [ ] **步骤 3: 在 menuItems 数组中添加菜单项**

找到 `menuItems` 数组定义，在最后添加：

```typescript
{ label: '导入 PPT', icon: FileInput, onClick: () => { setShowImportPPT(true); setIsOpen(false); }, shortcut: '' },
```

完整的 menuItems 应该类似：

```typescript
const menuItems = [
  { label: t('newCourse'), icon: FileText, onClick: onNew, shortcut: 'Ctrl+N' },
  { label: t('openCourse'), icon: FolderOpen, onClick: onOpen, shortcut: 'Ctrl+O' },
  { label: t('saveCourse'), icon: Save, onClick: onSave, shortcut: 'Ctrl+S' },
  { label: t('saveAs'), icon: FilePlus2, onClick: onSaveAs, shortcut: '' },
  { label: '导入 PPT', icon: FileInput, onClick: () => { setShowImportPPT(true); setIsOpen(false); }, shortcut: '' },
];
```

- [ ] **步骤 4: 在组件末尾渲染对话框**

在组件的 return 语句最后，`</div>` 之前添加：

```typescript
{showImportPPT && (
  <ImportPPTDialog onClose={() => setShowImportPPT(false)} />
)}
```

- [ ] **步骤 5: 测试菜单显示**

启动应用：
```bash
pnpm dev
```

在 Electron 中打开应用，点击"文件"菜单。

Expected: 菜单中显示"导入 PPT"选项

- [ ] **步骤 6: Commit**

```bash
git add src/components/FileMenu.tsx
git commit -m "feat: 在文件菜单添加"导入 PPT"选项"
```


## Task 9: TypeScript 类型定义

**Files:**
- Create or Modify: `src/types/electron.d.ts`

- [ ] **步骤 1: 检查文件是否存在**

```bash
ls src/types/electron.d.ts
```

如果文件不存在，创建它。如果存在，继续下一步。

- [ ] **步骤 2: 添加或更新 ElectronAPI 接口**

在 `src/types/electron.d.ts` 中，找到 `interface ElectronAPI` 定义，添加新接口：

```typescript
interface ElectronAPI {
  // ... 现有接口 ...
  
  // PPT 导入相关
  getLibreOfficePath: (method: 'registry' | 'registry-wow64') => Promise<string | null>;
  downloadLibreOffice: (serverUrl: string) => Promise<string>;
  on?: (channel: string, callback: (...args: any[]) => void) => void;
  off?: (channel: string, callback: (...args: any[]) => void) => void;
  openInstaller: (installerPath: string) => Promise<{ ok: boolean }>;
  selectFile?: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  convertPptToImages: (params: { pptPath: string; sofficeExe: string }) => Promise<{
    ok: boolean;
    images?: string[];
    tempDir?: string;
    error?: string;
  }>;
  cleanupTempDir: (dirPath: string) => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

如果文件是新建的，完整内容应该是：

```typescript
interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  listDirectory: (dirPath: string) => Promise<any[]>;
  createDirectory: (parentPath: string, dirName: string) => Promise<string>;
  readCourseFile: (filePath: string) => Promise<any>;
  writeCourseFile: (filePath: string, courseJson: string) => Promise<void>;
  pathExists: (filePath: string) => Promise<boolean>;
  ensureDir: (dirPath: string) => Promise<void>;
  openFolder: (folderPath: string) => Promise<void>;
  getPlatform: () => Promise<string>;
  copyImageToCourse: (courseDir: string, srcPath: string) => Promise<string>;
  saveImageToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
  saveFontToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
  readFileAsDataUrl: (courseDir: string, relativePath: string) => Promise<string | null>;
  cleanupUnreferencedImages: (courseDir: string, referencedPaths: string[]) => Promise<void>;
  writeTextFile: (filePath: string, content: string) => Promise<void>;
  writeBinaryFile: (filePath: string, base64Data: string) => Promise<void>;
  copyDir: (srcPath: string, destPath: string) => Promise<boolean>;
  removeDir: (dirPath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
  isSvnDirectory: (dirPath: string) => Promise<boolean>;
  svnCommit: (dirPath: string) => Promise<any>;
  svnGetUrl: (dirPath: string) => Promise<string | null>;
  svnHasUnversioned: (dirPath: string) => Promise<boolean>;
  getSubdirs: (dirPath: string) => Promise<string[]>;
  getServerUrl: () => Promise<string | null>;
  registerCourseDir: (courseId: string, dirPath: string) => Promise<void>;
  copyLocalFile: (srcAbsPath: string, destAbsPath: string) => Promise<void>;
  hashFile: (absPath: string) => Promise<string>;
  statFile: (absPath: string) => Promise<any>;
  readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>;
  compileBuild: (params: any) => Promise<any>;
  zipDirectory: (dirPath: string) => Promise<any>;
  convertSpine: (params: { inputDir: string; outputDir: string }) => Promise<any>;
  convertSpineAll: (params: { inputDir: string; outputDir: string }) => Promise<any>;
  
  // PPT 导入相关
  getLibreOfficePath: (method: 'registry' | 'registry-wow64') => Promise<string | null>;
  downloadLibreOffice: (serverUrl: string) => Promise<string>;
  on?: (channel: string, callback: (...args: any[]) => void) => void;
  off?: (channel: string, callback: (...args: any[]) => void) => void;
  openInstaller: (installerPath: string) => Promise<{ ok: boolean }>;
  selectFile?: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  convertPptToImages: (params: { pptPath: string; sofficeExe: string }) => Promise<{
    ok: boolean;
    images?: string[];
    tempDir?: string;
    error?: string;
  }>;
  cleanupTempDir: (dirPath: string) => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

- [ ] **步骤 3: Commit**

```bash
git add src/types/electron.d.ts
git commit -m "feat: 添加 PPT 导入相关的 TypeScript 类型定义"
```


---

## 测试计划

完成所有 Task 后，进行端到端测试：

### 测试 1: 完整流程（已安装 LibreOffice）

**前置条件**: 本机已安装 LibreOffice

- [ ] 启动应用：`pnpm dev`
- [ ] 打开或新建课程
- [ ] 点击"文件 → 导入 PPT"
- [ ] 选择测试 PPT 文件（准备一个 3-5 页的 pptx）
- [ ] 观察状态：应该直接跳到"正在转换并保存"
- [ ] 等待完成，关卡列表出现新关卡

**Expected**: 
- 每页 PPT 生成一个关卡
- SubPage.name = "文件名 - 页 N"
- 每个关卡包含一张 1920×1080 的背景图

### 测试 2: 完整流程（未安装 LibreOffice）

**前置条件**: 临时重命名 LibreOffice 安装目录模拟未安装

- [ ] 启动应用
- [ ] 打开或新建课程
- [ ] 点击"文件 → 导入 PPT"
- [ ] 选择测试 PPT 文件
- [ ] 观察状态：应该提示"需要下载安装 LibreOffice"
- [ ] 点击"下载并安装"
- [ ] 观察下载进度条
- [ ] 下载完成后安装向导自动打开
- [ ] 完成安装，点"我已安装完成，继续"
- [ ] 观察状态：应该跳到"正在转换并保存"
- [ ] 等待完成

**Expected**: 下载、安装、转换全流程成功

### 测试 3: 错误处理

- [ ] **测试取消选择文件**: 打开对话框后点取消，对话框应该关闭
- [ ] **测试选择损坏的 PPT**: 选择一个非 ppt 文件或损坏文件，应该 toast 提示转换失败
- [ ] **测试网络中断**: 下载过程中断网，应该 toast 提示下载失败
- [ ] **测试未安装就点继续**: 未安装 LibreOffice 时点"我已安装完成"，应该 toast 提示未检测到

### 测试 4: 多页 PPT

- [ ] 准备一个 12 页的 PPT
- [ ] 导入
- [ ] 验证生成 12 个关卡
- [ ] 验证关卡编号连续（如原有 5 个关卡，新增应该是"关卡 6"到"关卡 17"）
- [ ] 验证每个 SubPage.name 正确（"文件名 - 页 1" 到 "文件名 - 页 12"）

---

## 自我审查清单

完成实现后，检查以下项：

- [ ] 所有 9 个 Task 已完成并 commit
- [ ] pdftoppm 二进制在 `resources/bin/` 目录
- [ ] Vite 服务能下载 msi/dmg（浏览器测试 `/api/download-libreoffice?platform=win`）
- [ ] Electron IPC 所有 handler 都已添加
- [ ] preload.cjs 暴露了所有新接口
- [ ] ImportPPTDialog 6 个状态都能正确切换
- [ ] FileMenu 显示"导入 PPT"菜单项
- [ ] TypeScript 编译无错误
- [ ] 端到端测试通过

---

## 未来优化（不在本计划范围）

- 断点续传（下载中断后继续）
- 批量导入（一次选多个 PPT）
- 页面预览与筛选（导入前预览并勾选要导入的页）
- 便携版自动化（自动解压 LibreOffice 到 appdata，无需用户手动安装）
- 实时进度（转换阶段显示"正在转换第 X 页"）

---

**计划完成。开始实施前请确保：**
1. 已准备好 pdftoppm 二进制（Win + Mac）
2. `installers/` 目录包含 LibreOffice 安装包
3. 本地或远程有测试用 PPT 文件
4. 已读完整个计划并理解每个步骤

