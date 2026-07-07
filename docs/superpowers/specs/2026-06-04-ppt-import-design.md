# PPT 导入功能设计文档

**日期**: 2026-06-04  
**作者**: Claude  
**状态**: 待审核

## 概述

在文件菜单新增"导入 PPT"功能，将 PowerPoint 文件的每一页转换为图片并导入到课件中，每页对应一个大关卡。

## 核心决策

### 技术选型

- **转换引擎**: LibreOffice CLI（`soffice --headless --convert-to pdf`）+ pdftoppm（PDF → PNG）
- **依赖管理**: 
  - LibreOffice: 首次使用时从 Vite 服务下载标准安装包（msi/dmg），用户手动安装到系统
  - pdftoppm: 预编译二进制（Win/Mac 各 ~2MB）打包进 Electron app 的 `resources/bin/` 目录
- **转换链路**: PPT → PDF → PNG（1920×1080）
- **安装包位置**: `D:\aiproject\forge\installers/`（手动提交到 git）

### 用户体验

- **目标形态**: 每页 PPT 生成一个 Stage（大关卡），Stage 包含一个 SubPage，SubPage 内一个 Image 元素作为背景图
- **命名规则**: 
  - Stage.name = "关卡 N"（编号连续）
  - SubPage.name = "PPT文件名 - 页 N"（如 "G7_v3_Qs_12角的初步 - 页 1"）
- **导入位置**: 追加到所有关卡最后

## 整体架构

### 数据流

```
用户点击"文件 → 导入 PPT"
    ↓
选择 .pptx 文件
    ↓
检测 LibreOffice
    ├─ 已装 → 直接转换
    └─ 未装 → 下载安装流程
        ↓
    从 Vite 服务下载 msi/dmg（显示进度）
        ↓
    拉起安装向导（用户手动安装）
        ↓
    用户点"我已安装完成，继续"→ 重新检测
        ↓
转换流程
    ① soffice --convert-to pdf file.pptx
    ② pdftoppm -png -scale-to-x 1920 -scale-to-y 1080 file.pdf
    ③ 逐张调 saveImageToCourse 写入 images/
    ④ 生成 N 个 Stage（显示进度"第 X/Y 页"）
        ↓
完成：关卡列表新增 N 个关卡
```

### 新增文件清单

```
forge/
├─ installers/                            # 已完成拷贝
│   ├─ LibreOffice_25.8.6_Win_x86-64.msi  (349 MB)
│   └─ LibreOffice_25.8.6_MacOS_x86-64.dmg (296 MB)
├─ resources/                             # 新建
│   └─ bin/
│       ├─ pdftoppm.exe                   # Windows，~2MB
│       └─ pdftoppm                       # Mac，~2MB (chmod +x)
├─ src/
│   ├─ components/
│   │   ├─ FileMenu.tsx                   # 修改：加"导入 PPT"按钮
│   │   └─ ImportPPTDialog.tsx            # 新建：主流程 UI
│   └─ utils/
│       └─ pptImport.ts                   # 新建：detectLibreOffice 工具函数
├─ electron/
│   ├─ preload.cjs                        # 修改：暴露 6 个新 IPC
│   └─ main.cjs                           # 修改：新增 6 个 IPC handler
└─ vite.config.ts                         # 修改：新增 download-libreoffice middleware
```


## 详细设计

### 1. LibreOffice 检测

#### Windows 探测逻辑（按优先级）

1. 读注册表 `HKLM\SOFTWARE\LibreOffice\UNO\InstallPath`
2. 读注册表 `HKLM\SOFTWARE\WOW6432Node\LibreOffice\UNO\InstallPath`（32-bit Office on 64-bit Windows）
3. 检查固定路径 `C:\Program Files\LibreOffice\program\soffice.exe`

#### Mac 探测逻辑

- 检查 `/Applications/LibreOffice.app/Contents/MacOS/soffice`

#### 实现

**electron/main.cjs**:
```js
ipcMain.handle('get-libreoffice-path', async (_event, method) => {
  if (process.platform === 'win32') {
    if (method === 'registry' || method === 'registry-wow64') {
      const key = method === 'registry'
        ? 'HKLM\SOFTWARE\LibreOffice\UNO\InstallPath'
        : 'HKLM\SOFTWARE\WOW6432Node\LibreOffice\UNO\InstallPath';
      
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

**src/utils/pptImport.ts**:
```ts
export async function detectLibreOffice(): Promise<string | null> {
  const platform = await window.electronAPI.getPlatform();
  
  if (platform === 'win32') {
    let path = await window.electronAPI.getLibreOfficePath('registry');
    if (path) return path;
    
    path = await window.electronAPI.getLibreOfficePath('registry-wow64');
    if (path) return path;
    
    const commonPath = 'C:\Program Files\LibreOffice\program\soffice.exe';
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

### 2. 下载与安装

#### Vite Middleware

在 `vite.config.ts` 的 `forgePlugin()` 里添加：

```js
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

#### Electron 下载 Handler

**electron/main.cjs**:
```js
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

ipcMain.handle('open-installer', async (_event, installerPath) => {
  const { shell } = require('electron');
  await shell.openPath(installerPath);
  return { ok: true };
});
```

**Why**: 标准安装（用户手动点击安装向导）是最稳定的方式，无需处理权限提升、组策略限制等问题。


### 3. PPT 转换

#### pdftoppm 准备

**获取方式**:
- Windows: 从 [poppler for Windows](http://blog.alivate.com.au/poppler-windows/) 下载预编译版
- Mac: `brew install poppler` 后从 `/opt/homebrew/bin/pdftoppm` 复制

**放置位置**: `resources/bin/pdftoppm.exe` (Win) 和 `resources/bin/pdftoppm` (Mac)

**Electron 打包配置**:
```json
{
  "build": {
    "extraResources": [
      {
        "from": "resources/bin",
        "to": "bin",
        "filter": ["**/*"]
      }
    ]
  }
}
```

**运行时路径**:
```js
const isDev = !app.isPackaged;
const binDir = isDev
  ? path.join(__dirname, '..', 'resources', 'bin')
  : path.join(process.resourcesPath, 'bin');
const pdftoppm = path.join(binDir, process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm');
```

#### 转换 Handler

**electron/main.cjs**:
```js
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

ipcMain.handle('cleanup-temp-dir', async (_event, dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  return { ok: true };
});
```

**Why**: LibreOffice CLI 不支持直接导出 PNG，必须经过 PDF 中转。pdftoppm 是 C++ 实现，速度快且稳定。


### 4. UI 实现

#### FileMenu 集成

在 `src/components/FileMenu.tsx` 中：

```tsx
import ImportPPTDialog from './ImportPPTDialog';
import { FileInput } from 'lucide-react';

// 在 menuItems 数组里添加
{ label: '导入 PPT', icon: FileInput, onClick: () => { setShowImportPPT(true); setIsOpen(false); }, shortcut: '' }

// 组件末尾渲染对话框
{showImportPPT && (
  <ImportPPTDialog onClose={() => setShowImportPPT(false)} />
)}
```

#### ImportPPTDialog 状态机

```tsx
type Step = 'select-file' | 'detecting' | 'need-install' | 'downloading' | 'waiting-install' | 'converting';

状态转换：
  select-file → (用户选文件) → detecting
  detecting → (检测到) → converting
  detecting → (未检测到) → need-install
  need-install → (点"下载并安装") → downloading
  downloading → (下载完) → waiting-install
  waiting-install → (点"我已安装完成") → detecting
  converting → (成功) → 关闭对话框
```

**关键点**:
- 6 个状态对应 6 种 UI 展示
- `downloadProgress` 和 `convertProgress` 两个进度条
- 错误处理：toast 提示 + 回退到合适状态

完整实现见第四节设计。

### 5. 关卡生成

在 `ImportPPTDialog.tsx` 的 `handleConvert` 中：

```tsx
const pptFileName = pptPath.split(/[/\]/).pop()!.replace(/\.(pptx?|PPTX?)$/, '');
const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

for (let i = 0; i < images.length; i++) {
  const imgPath = images[i];
  
  // 读文件为 base64
  const buffer = await window.electronAPI.readFileAsBuffer(imgPath);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
  // 保存到课程 images/ 目录（自动去重）
  const relativePath = await window.electronAPI.saveImageToCourse(
    getCourseDirPath(courseId)!,
    `ppt_page_${i + 1}`,
    base64,
    'png'
  );
  
  // 生成元素
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
  
  // 生成小关卡
  const newSubPage: SubPage = {
    id: genId('subpage'),
    name: `${pptFileName} - 页 ${i + 1}`,
    elements: [newElement],
  };
  
  // 生成大关卡
  const stageNum = currentCourse.stages.length + 1;
  const newStage: Stage = {
    id: genId('stage'),
    name: `关卡 ${stageNum}`,
    subPages: [newSubPage],
  };
  
  useEditorStore.getState().currentCourse!.stages.push(newStage);
  
  setConvertProgress({ current: i + 1, total: images.length });
}

// 清理临时目录
await window.electronAPI.cleanupTempDir(tempDir);

// 重新编号和保存历史
const { currentCourse: course } = useEditorStore.getState();
if (course) {
  course.stages.forEach((stage, idx) => {
    stage.name = `关卡 ${idx + 1}`;
  });
  useEditorStore.getState().saveHistory();
}
```

**Why**: 
- SubPage.name 用 PPT 文件名 + 页码，便于用户识别来源
- Stage.name 保持"关卡 N"编号连续
- 图片用 `saveImageToCourse` 自动 MD5 去重


### 6. IPC 接口清单

#### preload.cjs 新增

```js
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有接口 ...
  
  getLibreOfficePath: (method) => ipcRenderer.invoke('get-libreoffice-path', method),
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
  convertPptToImages: (params) => ipcRenderer.invoke('convert-ppt-to-images', params),
  cleanupTempDir: (dirPath) => ipcRenderer.invoke('cleanup-temp-dir', dirPath),
});
```

#### main.cjs 新增 6 个 Handler

1. **get-libreoffice-path**: 通过注册表/固定路径检测 LibreOffice
2. **download-libreoffice**: 从 Vite 服务下载安装包到临时目录，推送进度事件
3. **open-installer**: 拉起 msi/dmg 安装向导
4. **select-file**: 文件选择对话框（通用）
5. **convert-ppt-to-images**: PPT → PDF → PNG，返回图片路径数组和临时目录路径
6. **cleanup-temp-dir**: 清理临时目录

#### TypeScript 类型定义

在 `src/types/electron.d.ts` 中补充：

```ts
interface ElectronAPI {
  // ... 现有接口 ...
  
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
```

### 7. 错误处理

| 错误场景 | 捕获位置 | 处理方式 |
|---------|---------|---------|
| Vite 服务无安装包 | download middleware | 返回 404，前端 toast "服务器未配置安装包" |
| 下载中断/网络错误 | download handler | reject，前端 toast "下载失败，请重试" |
| 用户取消安装 | 点"我已安装完成"后重新检测 | 检测失败 toast "未检测到 LibreOffice" |
| soffice 转换失败（损坏的 PPT） | convert handler | 返回 `{ok: false, error}`, 前端 toast |
| PDF 生成但 pdftoppm 失败 | convert handler | 同上，cleanup tempDir |
| pdftoppm 二进制缺失 | convert handler | throw Error "pdftoppm not found"，前端 toast |
| 课程目录不存在 | handleConvert 调 saveImageToCourse 前 | throw Error，前端 toast |
| 用户关闭对话框时正在转换 | onClose | 不做中断（主进程无法优雅中断），临时目录下次启动被系统清理 |

**日志记录**: 关键步骤加 `console.log('[PPT Import] ...')`，便于排查问题。

## 为什么选择这个方案

### 对比其他方案

**方案 A（本方案）: 标准安装 + pdftoppm**
- ✓ 代码最简单（~150 行新代码）
- ✓ 转换快（pdftoppm 是 C++ 实现）
- ✓ app 体积增加最小（+4MB）
- ✓ 无环境依赖
- ✗ 首次需用户手动安装 LibreOffice（点几下）

**方案 B: 标准安装 + pdf.js**
- ✗ 需要 Python + C++ 编译工具链（`canvas` npm 包）
- ✗ 转换慢 3-5 倍
- ✗ app 体积增加 +15MB

**方案 C: 便携版 + pdftoppm**
- ✓ 完全自动，用户零点击
- ✗ 代码复杂度高（~250 行）
- ✗ msiexec /a 和 dmg 挂载在企业环境可能被组策略拦截
- ✗ 首次解压时间长（30 秒 - 1 分钟）

**结论**: 方案 A 是最稳定、维护成本最低的选择。LibreOffice 是一次性安装，为"省几次点击"而引入复杂的便携版逻辑不值得。

## 实现计划

实现顺序（按依赖关系）:

1. **准备 pdftoppm 二进制** — 下载 Win/Mac 版本，放到 `resources/bin/`，chmod +x Mac 版本
2. **Vite middleware** — 添加 `/api/download-libreoffice` 接口
3. **Electron IPC (main.cjs)** — 6 个新 handler
4. **Electron preload** — 暴露 6 个接口到渲染进程
5. **pptImport.ts** — `detectLibreOffice` 工具函数
6. **ImportPPTDialog.tsx** — 完整 UI 流程（6 个状态）
7. **FileMenu.tsx** — 添加"导入 PPT"按钮
8. **TypeScript 类型** — electron.d.ts 补充类型定义
9. **测试** — 准备几个不同页数的 PPT，测试完整流程

预计工作量：1-2 天（含测试）

## 未来优化方向

- **Mac 端支持**: 当前只支持 Windows 客户端。Mac 端 pdftoppm 二进制获取较复杂（Homebrew 编译版依赖大量 dylib + 硬编码 rpath，复制不能直接运行；xpdf-tools-mac 提供便携版但是 GPL v3 协议）。后续如需支持 Mac 客户端，可选方案：
  1. xpdf-tools-mac（GPL 协议项目可用）
  2. Homebrew bottle + `install_name_tool` 重写 rpath（需 Mac 机器上跑一次重写脚本，~15 个 dylib，~10MB）
  3. 运行时检测系统已装 poppler（要求 Mac 用户先 `brew install poppler`）
- **断点续传**: 下载中断后可以继续（HTTP Range 头）
- **批量导入**: 一次选多个 PPT，顺序导入
- **页面筛选**: 导入前预览所有页，让用户勾选要导入哪些页
- **便携版自动化**: 如果用户反馈"不想装到系统"，可升级到方案 C（自动解压到 appdata）
- **进度优化**: 转换阶段能实时显示"正在转换第 X 页"（目前 soffice 和 pdftoppm 都是批量处理）

---

**设计完成，待审核。**
