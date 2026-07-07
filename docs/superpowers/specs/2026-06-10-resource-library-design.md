# 资源库（远程文件浏览）设计文档

- **日期**: 2026-06-10
- **状态**: 待 review
- **作者**: Claude（与大佬协作 brainstorming）

## 1. 背景

forge 当前的"内置资源"机制（`src/elements/builtinAssets.ts` + `public/builtin/runtime/game/` + game.zip）依赖**逐条注册资源 ID**：

```ts
{ id: 'tabImg.img_lt_1', src: 'runtime/game/tabImg/img_lt_1.png', exportPath: 'game/tabImg/img_lt_1.png' }
```

每新增一张图片就要：
1. 把文件放到 `public/builtin/runtime/game/<目录>/` 下
2. 在 `builtinAssets.ts` 加一行注册
3. 重新打包 `game.zip`（CLAUDE.md 明确写了这个流程）
4. 提交代码、走发布

这套机制对**少量稳定的运行时基础资源**（输入框三态背景、键盘按钮等）是合理的，但对**大量频繁增删的素材类资源**（标签图、确定按钮、装饰图、Spine 动画素材库）成本极高。

## 2. 目标

让维护资源像"在 Windows 资源管理器里组织文件"一样简单：

1. **零编码加资源**：往 `public/builtin/library/` 下任意子目录放文件即可，不改代码、不重启 Vite
2. **支持任意目录层级**：维护者可以按"课程类型/年级/资源类型"或任何其他维度自由组织（含中文目录名），分类调整随时可改
3. **复用所有现有上传/编辑/导出链路**：远程库下载下来的资源等同于"用户从本地上传的一份文件"，不引入新的资源命名空间
4. **跟现有"上传文件"按钮并存**：每个 file 字段都拆成「资源库文件 / 本地文件」两个按钮，用户在编辑器里随时切换
5. **Spine 文件夹同等支持**："选择 Spine 文件夹"按钮拆成「资源库 Spine 文件夹 / 本地 Spine 文件夹」
6. **旧课件零迁移**：不影响任何已发布课件的打开、编辑、导出

## 3. 非目标

- 本次**不**替代现有 `OkBtnPicker` / `TabImgPicker` 等内置 picker（这些 picker 维持现状，未来可作为渐进迁移）
- 本次**不**改 `builtinAssets.ts` / game.zip 体系（旧体系保留兼容旧课件）
- 本次**不**改字体相关字段类型（`fontLibrary` / `fontLocal` 已有独立机制）
- 本次**不**支持 Spine 工程的"完全分散布局"（.json 在 json 子目录、.atlas/.png 在 images 子目录这种拆开放置的形式）；维护者负责把库里的 Spine 整理成现有 `locateSpineFiles` 支持的三种布局之一
- 本次**不**做跨课件的资源副本去重（每个课件目录独立维护本地副本）

## 4. 整体架构

### 4.1 数据流

```
属性面板字段（图片/音频/Spine）
  ┌──────────────┐  ┌──────────────┐
  │ 资源库文件    │  │ 本地文件      │
  └──────┬───────┘  └──────┬───────┘
         │                 │
         ▼                 ▼
  ┌─────────────┐    ┌────────────────────┐
  │ LibraryBrowser│    │ 现有上传/Spine 选择 │ ← 完全不动
  │ (新增组件)    │    │  对话框             │
  └──────┬──────┘    └─────────┬──────────┘
         │                     │
         ▼                     │
  ┌──────────────────┐         │
  │ Vite API         │         │
  │ /api/library/list│         │
  │ /api/library/info│         │
  │ /builtin/library/│         │
  └──────┬───────────┘         │
         │                     │
         ▼                     │
  ┌─────────────────────────────────────────────┐
  │ 客户端下载逻辑 (src/utils/electronFs.ts)        │
  │  ├─ 图片/音频:                                │
  │  │   算 SHA-256 前 8                          │
  │  │   pathExists 跳过 / 下载到                  │
  │  │   images/library/<hash>_<原名>.ext         │
  │  │   或 images/sound/library/<hash>_<原名>.ext │
  │  └─ Spine 文件夹:                             │
  │      下载三件套到本地临时目录                    │
  │      调现有 importSpineFolder()                │
  │      落到 images/animation/aniN/               │
  └────────┬─────────────────────────────────────┘
           ▼
  element.props.skin / url / 等字段写入：
    "images/library/a3f5b8c2_img_lt_1.png"
    "images/sound/library/a3f5b8c2_right.mp3"
    "images/animation/ani3/game.sk"
           ▼
  ┌─────────────────────────────────────────────┐
  │ 现有体系（一字不动）                          │
  │  - isUploadPath / isLocalSkPath / isLocalSoundPath │
  │  - electronFs IPC 读写                        │
  │  - exportProject 资源收集和导出                │
  └─────────────────────────────────────────────┘
```

### 4.2 核心思想

**远程文件 = 一份从远程库下载下来的本地文件**。下载完成后，element.props 里存的是 `images/library/<hash>_<原名>.<ext>` 这种形式，跟用户从本地上传的文件**走同一条路径**。

这意味着：
- 选中后那一刻文件就在课件本地了，离线也能编辑
- 下游所有逻辑（编辑期渲染、导出工程、发布课件）零改动
- 旧课件因为存的是别的格式路径（`images/xxx.png`、`game/...`），跟新方案天然隔离，互不影响

## 5. UI 设计：LibraryBrowser

新建组件 [src/components/LibraryBrowser.tsx](src/components/LibraryBrowser.tsx)。

### 5.1 整体形态

居中显示的超大模态弹窗（约 90vw × 90vh）。

```
┌──────────────────────────────────────────────────────────────┐
│  📁 资源库                                              [ ✕ ] │
├──────────────────────────────────────────────────────────────┤
│  全部 / 思维课 / 一年级 / 标签                          ←面包屑 │
├──────────────────────────────────────────────────────────────┤
│  ▍文件夹                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │📁思维课  │ │📁口才课  │ │📁通用    │ │🦴鼓掌    │              │
│  │         │ │         │ │         │ │(Spine)  │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                              │
│  ▍文件                                                        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │缩略 │ │缩略 │ │缩略 │ │缩略 │ │缩略 │ │缩略 │ │缩略 │ │缩略 ││
│  │图1  │ │图2  │ │图3  │ │图4  │ │图5  │ │图6  │ │图7  │ │图8  ││
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│  ┌─────┐ ┌─────┐ ...                                          │
│  └─────┘ └─────┘                                              │
├──────────────────────────────────────────────────────────────┤
│  已选: img_lt_1.png                          [取消]   [确定]   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 关键交互

| 元素 | 行为 |
|---|---|
| 面包屑每段 | 可点击，跳到该层 |
| 普通文件夹按钮 | 单击 → 进入下一层（更新面包屑 + 重新拉目录清单） |
| Spine 工程文件夹 | 显示特殊样式（带 🦴 图标 + "(Spine)" 标记）；mode='spineFolder' 时单击选中、双击确定；mode='file' 时显示禁用 |
| 文件缩略图（图片） | 单击 → 选中（蓝色边框）；双击 → 选中并确定 |
| 音频文件（无缩略图） | 列表项展示文件名 + 时长（可选）；单击选中 |
| ✕ / ESC / 取消 | 关闭弹窗，不修改 element |
| 确定 | 触发下载逻辑 + 写 element.props + 关闭弹窗 |
| 缩略图大小 | 每行 8 个，约 100×100，紧凑展示 |
| 搜索框 | 不提供（保持简洁，纯靠目录导航） |
| 浏览器初始定位 | 永远打开 library 根目录（不记忆历史位置） |

**`mode='spineFolder'` 时的过滤规则**：
- 普通文件夹（非 Spine 工程）→ 显示，可进入
- Spine 工程文件夹 → 显示并可选中
- 所有单文件（图片/音频/视频）→ **不显示**（场景错配）

**`mode='file'` 时的过滤规则**：
- 普通文件夹 → 显示，可进入
- Spine 工程文件夹 → 显示但**禁用灰色**（无法进入也无法选中）
- 单文件 → 按 `fileFilter` 过滤展示（详见下方默认值规则）

### 5.3 组件接口

```ts
type LibraryBrowserProps = {
  mode: 'file' | 'spineFolder';
  fileFilter?: 'image' | 'audio' | 'video';   // mode='file' 时按扩展名过滤；undefined 时默认 'image'
  onSelect: (result: SelectResult) => void | Promise<void>;
  onClose: () => void;
};

type SelectResult =
  | { type: 'file'; libraryPath: string }      // 'mode=file' 选中单文件
  | { type: 'spine'; libraryPath: string };    // 'mode=spineFolder' 选中 Spine 工程文件夹
```

`fileFilter` 与扩展名过滤规则：
- `'image'` → 显示 .png / .jpg / .jpeg / .gif / .webp
- `'audio'` → 显示 .mp3 / .wav / .ogg
- `'video'` → 显示 .mp4 / .webm / .mov
- `undefined` → 默认按 `'image'` 处理（最常见场景）

下载和写 element.props 的逻辑放在调用方（FieldRenderer），LibraryBrowser 只负责"选择"。

### 5.4 错误反馈

任何下载/转换失败一律用**模态弹窗**（不用 toast），错误必须用户主动关闭：

```
┌─────────────────────────────────────┐
│  ⚠️  操作失败                       │
├─────────────────────────────────────┤
│  无法下载远程资源:                   │
│  library/思维课/一年级/标签/img.png    │
│                                     │
│  原因: 网络连接超时                  │
│                                     │
│                          [ 知道了 ] │
└─────────────────────────────────────┘
```

成功时不弹任何提示，浏览器直接关闭 + 字段值更新即是反馈。

## 6. 库内目录组织

`public/builtin/library/` 下完全自由分层，由维护者按业务维度组织。示例：

```
public/builtin/library/
├── 思维课/
│   ├── 一年级/
│   │   ├── 背景/bg_1.png, bg_2.png, ...
│   │   ├── 标签/img_lt_1.png, ...
│   │   └── Spine/
│   │       └── 鼓掌/                  ← Spine 工程文件夹
│   │           ├── game.json
│   │           ├── game.atlas
│   │           ├── game.png
│   │           └── audio.mp3 (可选)
│   └── 二年级/...
├── 口才课/...
└── 通用/...
```

**关键约束**：
- 不约束顶层分类、不约束层级深度，**完全靠维护者自由组织**
- Spine 工程文件夹**必须**含 `<name>.json + <name>.atlas + <name>.png` 三件套同名共存
  - 三种支持布局：平铺 / `json/` 子目录 / 同名子目录（详见 [electron/spineToSk/spineToSkCli.cjs:34-67](electron/spineToSk/spineToSkCli.cjs#L34-L67) 的 `locateSpineFiles` 注释）
  - 不支持的布局：三件套分散在不同子目录
- 不支持的资源类型（按扩展名）会被前端过滤掉

**改名/挪文件夹的影响**：
- Vite 不需要重启
- 已经下载到课件本地的副本不变（用 hash 编码命名，跟库内路径解耦）
- 用户下次打开浏览器看到新结构

## 7. Vite 后端接口

所有接口加在 [vite.config.ts](vite.config.ts) 的 `forgePlugin()` 里，跟 `/api/upload-compiled-zip`、`/api/upload-resource` 同位置。`pnpm build` 不带这些接口（仅 dev 时存在），跟现有约定一致。

### 7.1 `GET /api/library/list?path=<相对路径>`

列指定目录下的子项。`path` 是相对 `public/builtin/library/` 的相对路径，由前端动态拼接（不写死）。

返回示例：
```json
{
  "path": "思维课/一年级/标签",
  "entries": [
    { "name": "img_lt_1.png", "isDir": false, "size": 12345, "mtime": 1718000000000 },
    { "name": "img_lt_2.png", "isDir": false, "size": 23456, "mtime": 1718000000000 },
    { "name": "新分组", "isDir": true, "isSpineProject": false },
    { "name": "鼓掌", "isDir": true, "isSpineProject": true }
  ]
}
```

- **不返回 hash**（避免列目录时算所有文件 hash，浪费性能）
- 缩略图加载：浏览器直接 `<img src="/builtin/library/思维课/一年级/标签/img_lt_1.png">`
- `isSpineProject` 由后端检测三件套得出（复刻 `findAllSpineJsons` 逻辑）

### 7.2 `GET /api/library/file-info?path=<文件相对路径>`

按需算 SHA-256 前 8 字符 + 内存缓存 + 落盘缓存。

返回：
```json
{ "path": "...", "hash": "a3f5b8c2", "size": 12345, "mtime": 1718000000000 }
```

缓存策略：
- 内存 `Map<path, { hash, mtime, size }>`
- 落盘到 `public/builtin/library/.cache/hash.json`（500ms 防抖）
- mtime 或 size 变了就重算

只对**用户实际选中点确定的文件**调用，不会预热。

### 7.3 `GET /api/library/spine-files?path=<Spine文件夹相对路径>`

返回 Spine 文件夹下需要下载的全部文件清单（递归收集 `.json`/`.atlas`/`.png` 三件套 + 音频）。

返回：
```json
{
  "path": "思维课/一年级/Spine/鼓掌",
  "files": ["json/game.json", "json/game.atlas", "json/game.png", "audio.mp3"]
}
```

`files` 数组中是相对该 Spine 文件夹根的路径，前端拿到后逐个 fetch `/builtin/library/<path>/<file>` 写到本地临时目录。

### 7.4 `GET /builtin/library/<rel>`

**Vite 自带**：`public/` 目录默认就是静态根，无需写代码。前端直接通过 URL 加载缩略图、下载文件二进制。

### 7.5 路径安全校验

`/api/library/*` 三个接口的 `path` 参数必须经过 `sanitizeLibraryPath()`：

```ts
function sanitizeLibraryPath(rel: string): { ok: true; value: string } | { ok: false; error: string } {
  if (!rel) return { ok: true, value: '' };
  if (rel.includes('\0')) return { ok: false, error: '非法字符' };
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) return { ok: false, error: '不接受绝对路径' };
  const normalized = path.posix.normalize(rel.replace(/\\/g, '/'));
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
    return { ok: false, error: '路径越界' };
  }
  return { ok: true, value: normalized.replace(/^\/+/, '') };
}
```

`/builtin/library/<rel>` 静态服务由 Vite 自带逻辑保护，只暴露 public 目录，不需额外校验。

## 8. 客户端下载与去重

### 8.1 图片/音频：`downloadLibraryFile()`

新增到 [src/utils/electronFs.ts](src/utils/electronFs.ts)。

```ts
export async function downloadLibraryFile(courseId: string, libraryPath: string): Promise<{ localRelPath: string }> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 拿 hash + size
  const info = await fetch(`/api/library/file-info?path=${encodeURIComponent(libraryPath)}`).then(r => r.json());

  // 2. 算本地路径（按扩展名分发）
  const ext = libraryPath.match(/\.[^.]+$/)?.[0].toLowerCase() ?? '';
  const baseName = libraryPath.split('/').pop()!.replace(ext, '');
  const subdir = pickLocalSubdir(ext);  // 'images/library' | 'images/sound/library' | 'images/animation'
  const localRel = `${subdir}/${info.hash}_${baseName}${ext}`;
  const absPath = `${courseDir}${sep}${localRel.replace(/\//g, sep)}`;

  // 3. 已存在 → 复用（pathExists 即去重）
  if (await api().pathExists(absPath)) return { localRelPath: localRel };

  // 4. 下载 + 写盘
  const dirOnly = absPath.substring(0, absPath.lastIndexOf(sep));
  await api().ensureDir(dirOnly);
  const fileBuf = await fetch(`/builtin/library/${encodeURIComponent(libraryPath).replace(/%2F/g, '/')}`).then(r => r.arrayBuffer());
  await api().writeBinaryFile(absPath, arrayBufferToBase64(fileBuf));

  return { localRelPath: localRel };
}

function pickLocalSubdir(ext: string): string {
  if (/^\.(png|jpg|jpeg|gif|webp)$/i.test(ext)) return 'images/library';
  if (/^\.(mp3|wav|ogg)$/i.test(ext)) return 'images/sound/library';
  if (/^\.(mp4|webm|mov)$/i.test(ext)) return 'images/animation/library';
  throw new Error(`不支持的资源类型: ${ext}`);
}
```

**去重机制**：本地路径含 hash 前缀 → `pathExists` 即去重。**不需要额外 manifest**（Spine 那个 manifest 是因为 folderName 是另起的，文件系统看不出对应关系；图片/音频的本地文件名直接编码 hash，文件系统本身就是去重表）。

### 8.2 Spine 文件夹：`downloadLibrarySpine()`

```ts
export async function downloadLibrarySpine(courseId: string, libraryPath: string): Promise<SpineImportResult[]> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 拉文件清单
  const list = await fetch(`/api/library/spine-files?path=${encodeURIComponent(libraryPath)}`).then(r => r.json());

  // 2. 创建临时目录
  const tmpDir = `${courseDir}${sep}.tmp${sep}spine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await api().ensureDir(tmpDir);

  try {
    // 3. 逐个下载文件到 tmpDir，保留相对路径
    for (const f of list.files) {
      const buf = await fetch(`/builtin/library/${libraryPath}/${f}`).then(r => r.arrayBuffer());
      const target = `${tmpDir}${sep}${f.replace(/\//g, sep)}`;
      await api().ensureDir(target.substring(0, target.lastIndexOf(sep)));
      await api().writeBinaryFile(target, arrayBufferToBase64(buf));
    }

    // 4. 调现有 importSpineFolder（转换 + 拷贝到 images/animation/aniN/ + 写 manifest）
    const results = await importSpineFolder(courseId, tmpDir);
    return results;
  } finally {
    // 5. 清理临时目录
    await api().removeDir(tmpDir).catch(() => { /* 忽略清理失败 */ });
  }
}
```

**优化机会**（可后续加）：先只下 .json，parse 拿 `skeleton.hash`，查 `.manifest.json`：
- 命中 → 直接复用 `images/animation/aniN/`，省略剩余文件下载
- 未命中 → 下载剩余文件走完整流程

首版实现可以直接走完整流程（不复杂，几百毫秒），命中缓存的优化留给后续。

### 8.3 进度反馈

| 场景 | UI 表现 |
|---|---|
| 图片下载（< 1MB） | 浏览器右下角 inline loading 状态（轻量） |
| 大图片/音频 | 同上但显示进度百分比 |
| Spine 工程下载 | 弹窗保持打开 + 显示「下载中（3/4 文件）」→「转换中」→ 完成关闭 |
| 网络/转换失败 | 模态错误弹窗（必须主动关闭） |

## 9. 资源落地策略

| 资源类型 | 本地存储路径 | element.props 存的值 | 课件包导出路径 | 现有识别函数 |
|---|---|---|---|---|
| 图片 | `images/library/<hash>_xx.png` | `images/library/<hash>_xx.png` | `game_lt/image/img/<hash>_xx.png` | `isUploadPath` |
| 音频 | `images/sound/library/<hash>_xx.mp3` | `images/sound/library/<hash>_xx.mp3` | `game_lt/sound/<hash>_xx.mp3` | `isLocalSoundPath` |
| Spine | `images/animation/aniN/...` | `images/animation/aniN/game.sk` | `game_lt/animation/aniN/...` | `isLocalSkPath` |
| 视频 | `images/animation/library/<hash>_xx.mp4` | `images/animation/library/<hash>_xx.mp4` | `game_lt/animation/<hash>_xx.mp4` | `isLocalVideoPath` |

**用 `library/` 子目录隔离的好处**：跟用户上传文件**物理分开**，未来要清理"所有从库下载的副本"，删 `images/library/` + `images/sound/library/` + `images/animation/library/` 即可，不会误删用户上传。Spine 因为已有 manifest 去重机制（合并相同 hash 的本地选 / 库选 Spine），不加 `library/` 子层。

## 10. 属性面板入口改造

### 10.1 字段类型识别（仅两类）

| 字段类型 | 现状按钮 | 改造后 |
|---|---|---|
| `type: 'file'` | "上传" | "资源库文件" + "本地文件" |
| `type: 'spineFolder'` | "选择 Spine 文件夹" | "资源库 Spine 文件夹" + "本地 Spine 文件夹" |

不动的字段：`type: 'fontLibrary'` / `type: 'fontLocal'`（字体已有独立机制）。

### 10.2 elementMeta 字段定义增加可选 fileType

```ts
properties: [
  { key: 'skin',     label: '皮肤', type: 'file', fileType: 'image', group: '外观' }
  { key: 'videoUrl', label: '视频', type: 'file', fileType: 'video' }
  { key: 'soundUrl', label: '音频', type: 'file', fileType: 'audio' }
]
```

`fileType` 默认 `'image'`（绝大多数 file 字段都是图片）。当前需要显式标的字段：

| 组件 | 字段 | 加 fileType |
|---|---|---|
| Video | `videoUrl` | `'video'` |
| (未来) | `soundUrl` 等 | `'audio'` |

### 10.3 type: 'file' 字段改造（FieldRenderer）

```
现有：
┌────────┬──────┐
│ 文件名  │  上传 │
└────────┴──────┘

改造后：
┌────────┬─────────────┬──────────┐
│ 文件名  │ [资源库文件] │ [本地文件] │
└────────┴─────────────┴──────────┘
```

- 「本地文件」= 现"上传"按钮逻辑改名，不变
- 「资源库文件」点击 → 弹 `LibraryBrowser` 组件（`mode='file'`，`fileFilter=fileType`）
  - 选完后调 `downloadLibraryFile()` → 写入 element.props

### 10.4 type: 'spineFolder' 字段改造（SpineFolderField）

```
现有：
┌──────────────────────────┐
│  当前: ani3/game.sk        │
│  动画: [animation1] ▼      │
├──────────────────────────┤
│      [选择 Spine 文件夹]    │
└──────────────────────────┘

改造后：
┌──────────────────────────┐
│  当前: ani3/game.sk        │
│  动画: [animation1] ▼      │
├──────────────────────┬───┤
│ [资源库 Spine 文件夹] │ [本地 Spine 文件夹]│
└──────────────────────┴───┘
```

- 「本地 Spine 文件夹」= 现"选择 Spine 文件夹"逻辑改名，不变
- 「资源库 Spine 文件夹」点击 → 弹 `LibraryBrowser`（`mode='spineFolder'`）
  - 选完后调 `downloadLibrarySpine()` → 写入 element.props（含 url / _animationList / _skFiles）

## 11. Electron IPC 现状

**所有现有 IPC 已经够用，零新增**：

| 用途 | 复用 IPC |
|---|---|
| 下载文件落本地 | `writeBinaryFile(path, base64)` |
| 判断是否已下载（去重） | `pathExists(path)` |
| 创建目录（含 library 子层） | `ensureDir(path)` |
| Spine 临时目录创建/删除 | `ensureDir` + `removeDir(path)` |
| Spine 转换 | `convertSpineAll(in, out)` |
| Spine manifest 维护 | 现有 `importSpineFolder` 内部已实现 |

[electron/preload.cjs](electron/preload.cjs) 和 [electron/main.cjs](electron/main.cjs) **一字不动**。

## 12. 旧课件兼容

旧课件 `element.props.skin` 里存的是这几种格式：
- `images/xxx.png`（用户上传）
- `images/animation/aniN/game.sk`（用户选 Spine）
- `images/sound/xxx.mp3`（用户上传音频）
- `game/tabImg/img_lt_1.png`（旧内置资源）
- `share/comp/xxx.png`、`/uploads/xxx.png` 等

新方案产生的格式：
- `images/library/<hash>_xxx.png`
- `images/sound/library/<hash>_xxx.mp3`
- `images/animation/aniN/game.sk`（跟旧的同前缀，但 manifest 自动按 skeleton.hash 去重，不冲突）

**新老格式天然隔离，永远共存。** 任何老课件打开后都能正常加载、编辑、导出。

## 13. 改造文件清单

### 13.1 新建（1 个文件）

| 文件 | 职责 |
|---|---|
| [src/components/LibraryBrowser.tsx](src/components/LibraryBrowser.tsx) | 资源库浏览器组件（弹窗 + 面包屑 + 文件夹/文件网格 + 选中确认） |

### 13.2 修改（5 个文件）

| 文件 | 改动 |
|---|---|
| [vite.config.ts](vite.config.ts) | `forgePlugin()` 加 3 个接口：`/api/library/list`、`/api/library/file-info`、`/api/library/spine-files`；新增 `sanitizeLibraryPath`、`detectSpineProject`、hash 缓存 |
| [src/components/FieldRenderer.tsx](src/components/FieldRenderer.tsx) | `case 'file'` 分支增加"资源库文件"按钮；`SpineFolderField` 增加"资源库 Spine 文件夹"按钮（按钮文案"上传"改"本地文件"，"选择 Spine 文件夹"改"本地 Spine 文件夹"） |
| [src/types/index.ts](src/types/index.ts) | 给 ElementProperty 类型加可选 `fileType?: 'image' \| 'audio' \| 'video'` |
| [src/elements/elementMeta.ts](src/elements/elementMeta.ts) | Video 组件 `videoUrl` 字段加 `fileType: 'video'` |
| [src/utils/electronFs.ts](src/utils/electronFs.ts) | 新增 `downloadLibraryFile()` 和 `downloadLibrarySpine()` 函数 |

### 13.3 不动（关键现有逻辑）

- [src/utils/exportProject.ts](src/utils/exportProject.ts) — 资源收集和路径转换
- [src/utils/coursePackage.ts](src/utils/coursePackage.ts) — 课程包打包
- [electron/preload.cjs](electron/preload.cjs) / [electron/main.cjs](electron/main.cjs) — IPC 全部复用
- [electron/spineToSk/spineToSkCli.cjs](electron/spineToSk/spineToSkCli.cjs) — Spine 转换逻辑
- [src/elements/builtinAssets.ts](src/elements/builtinAssets.ts) — 老内置资源体系（保留兼容）

## 14. 风险与权衡

### 14.1 hash 算法选择

选了 SHA-256 前 8 字符（约 32 bit），碰撞概率 1 / 2^32 ≈ 0.0000002%。在单课件本地副本规模（最多几百到几千个文件）下完全足够，且 Node 内置 crypto 零依赖。如果未来发现碰撞可以扩展到 12 字符（不影响向后兼容）。

### 14.2 库内目录改名/挪动

- **已下载到本地的副本不受影响**（hash 编码命名解耦）
- **未下载的资源会出现在新位置**，老资源在浏览器里不再可见
- 如果用户在某课件里之前选了一张图（已下载到本地），后来库里删了该图，课件仍能正常用本地副本

这个行为是符合直觉的：**库变化不影响已使用的资源**。

### 14.3 库内文件被覆盖（同名 + 内容不同）

- mtime 变了 → file-info 接口重算 hash → 返回新 hash
- 用户下次选同一个库内路径 → 新 hash → 新本地路径 `<新hash>_xxx.png`
- 老 hash 的本地副本仍然在课件目录里，被旧引用使用
- 不会自动同步老引用到新副本

这个行为也是合理的：**已选过的资源不会被库的变化偷偷换掉**。

### 14.4 Spine 转换性能

每个 Spine 工程文件夹首次下载需要 fetch 多个文件 + 调用 LayaAir 内嵌工具链转换，约几百毫秒到 1-2 秒。后续 manifest 命中（同 skeleton.hash）跳过转换，秒返回。可接受。

### 14.5 库目录递归扫描成本

`/api/library/list` 只列**当前目录**一层（不递归），成本 O(当前目录子项数)。`detectSpineProject` 检查每个子目录的 1 层文件清单，成本可控。

## 15. 验收标准

1. **零编码加资源**：往 `public/builtin/library/思维课/一年级/标签/` 放一张新 PNG，刷新编辑器、打开"资源库文件"按钮就能看到、选中就能用
2. **跨课件去重**：在两个不同课件里选同一张库图，每个课件目录各自有一份本地副本，互不影响
3. **同一课件内去重**：在同一课件里两次选同一张库图，本地只有一份副本（hash 一致 → pathExists 命中）
4. **库改名不影响已用资源**：选完一张图后，把库内的目录改名，重新打开课件该图仍能正常显示
5. **Spine 工程识别**：维护者把 Spine 工程整个目录拷进 `library/Spine/<名字>/`，浏览器打开后能识别为 Spine 工程并正确选中
6. **导出工程**：选中库内图片/Spine 后，发布工程能正确把这些资源拷进对应的 `game_lt/image/img/`、`game_lt/sound/`、`game_lt/animation/aniN/` 路径
7. **错误处理**：网络断开时下载失败弹模态错误窗，用户主动关闭后能重试
8. **旧课件零影响**：随便打开一个老课件，所有原本的引用都能正常加载和导出

## 16. 后续可能的扩展（非本次范围）

- 把现有 `OkBtnPicker` / `TabImgPicker` 等内置 picker 也改成 LibraryBrowser 的"自动定位到指定子目录"模式
- 现有 `builtinAssets.ts` 里的 PNG 资源（`tabImg/`、`okBtn/` 等）渐进迁移到 library 目录
- 资源库浏览器加搜索框
- 资源库浏览器加"最近使用"标签
- 减少 Spine 二次选中的下载量（先下 .json 查 manifest，命中就不下其他文件）
