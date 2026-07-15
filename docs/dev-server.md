# 开发服务器即后端

forge 没有独立的 Node 服务，所有"后端"能力都由 [vite.config.ts](../vite.config.ts) 里 `forgePlugin()` 注册的 Vite middleware 提供。

`pnpm build` 产物是纯静态 SPA，**这些接口只在 dev 模式下存在**，生产环境没有这些 API。

总共四类能力：

## 1. 课件文件动态路由

`/preview-server/lessons/<projName>/...` 和根路径 `/lessons/<projName>/...`（GameLoader 在 preview-server 下跑时资源请求不带 `/preview-server/` 前缀）。

`forgePlugin` 内部维护 `courseOutputDirs: Map<courseId, localOutputDir>`，由 `/api/upload-compiled-zip` 在发布时注册。请求来时从 URL 提以下后缀拿到 `projName`：

| 后缀 | 课件类型 |
|---|---|
| `*_LessonZK` | 正课 |
| `*_LessonHW` | 作业 |
| `*_LessonFXK` | 复习课 |
| `*_LessonSSEVALUATION` | 专题测评 |

`vite.config.ts` 顶部的 `lessonSuffix(kind)` 是这套后缀的**单一源**。反查到本地目录就从那里读；查不到就 fallback 到 `preview-server/lessons/<projName>/`。

## 2. preview-server 静态资源代理

- `/preview-server/...` → `preview-server/` 下对应文件
- 根路径 `/share/`、`/cfg/`、`/res/`、`/share_chinese/`、`/share_english/`、`/share_extend/`、`/lessons-en/`、`/record/` 也代理到 `preview-server/`（GameLoader 用相对路径加载这些公共资源）

## 3. `/preview-game/*.html`

直接从 `public/preview-game/` 发，让编辑器能 iframe 一个 GameLoader 预览，不走 SPA。

## 4. `/api/*` 接口

| 接口 | 用途 |
|---|---|
| `GET /api/ws-config` | 返回打包机 WebSocket 配置 `{ wsServer, wsHost }`，由跑 vite 的机器通过 `WS_SERVER` / `WS_HOST` 环境变量设定。`src/utils/websocket.ts` 在用 |
| `POST /api/upload-compiled-zip` | 接收 Electron 的编译产物 zip（`compileBuild` + `zipDirectory`），**300MB 上限**，**内存解压**到 `preview-server/lessons/<projName>/`（先 `rmSync` 清空旧目录再重建），zip 不落盘，最后把 `regKey → lessonDir` 写进 `courseOutputDirs` |
| `POST /api/upload-resource` | multipart 上传，**100MB 上限**，让远程 Electron 把视频等大文件直接写进对应 lesson 目录的 `destPath`，要求 lesson 目录已存在（即先发布过） |
| `POST /api/save-preset-thumbnail` | 把 canvas 截图（`{ name, dataUrl }`）写到 `public/builtin/editor/<name>.png`，预设缩略图用 |
| `GET /api/library/list?path=<rel>` | 列出 `public/builtin/library/<rel>` 目录条目，目录会判 Spine 工程，文件返回 size/mtime；路径过 `sanitizeLibraryPath` 防越界 |
| `GET /api/library/search?q=<关键词>&type=<类型>` | 全库搜索受支持资源；自由关键词只匹配文件名，多个空格关键词按无序 AND 匹配；`series/color/language` 与用途 `quickTag` 读取完整相对路径，因此目录归类可参与筛选；响应返回当前资源类型可用的快捷标签及数量，结果最多 200 条 |
| `GET /api/library/file-info?path=<rel>` | 取单文件 SHA-256 前 8 字符 hash + size/mtime，hash 缓存在 `public/builtin/library/.cache/hash.json`（按 mtime+size 失效） |
| `GET /api/library/spine-files?path=<rel>` | 传入 Spine 工程目录，递归列出 `.json/.atlas/.png/.mp3/.wav/.ogg` 文件 |
| `GET /api/library/quick-presets?kind=<kind>` | 递归扫描 `public/builtin/library/通用素材/控件/`，返回快捷组件候选图片及系列、颜色、语言标签；`kind` 首批支持 `confirm/previous/next/audio/brush/clear` |
| `GET /api/download-vcredist` | 流式下载 `installers/vc_redist.x64.exe`，给 Electron 安装器引导 Windows VC++ Redistributable 用 |

### 通用素材与快捷组件

资源服务器上的正式通用素材按以下结构部署，不增加课程品牌层级：

```text
public/builtin/library/
└── 通用素材/
    ├── 二级窗口/
    ├── 其他设计底框/
    ├── 控件/
    ├── 通用框/
    └── 通用背景图/
```

- 资源库是 Vite 服务器的内容目录，已被 Git 忽略，不随 Electron 安装包发布；部署资源服务器时需要单独同步。
- PSD 是美术源文件，不进入资源库；浏览和课件下载只使用 PNG/JPG 等可直接使用的图片。
- 资源库搜索跨全部目录，目录路径只用于结果展示和同名资源区分，不参与关键词命中；清空关键词与筛选后恢复原有三级目录浏览。
- 用途快捷标签由服务端维护同义词匹配规则，标签内部是 OR、标签与其他搜索条件之间是 AND；自由搜索不扩展同义词。
- 语言筛选统一素材中的同义命名：`国内/简体/簡體` 归为“简体”，`英语/英文` 归为“英文”，`繁体/繁體` 归为“繁体”。
- 搜索索引按短周期自动刷新，不依赖平台文件监听；资源新增、删除或替换后无需重启 Vite 服务。
- 快捷组件不是把所有图片平铺到工具栏，而是保留稳定的功能入口，再按目录、系列、颜色、语言和关键词筛选候选美术。
- 用户确认预设后，客户端沿用 `downloadLibraryFile()` 把所选图片下载到当前课件的 `images/library/`，课件只携带实际使用的素材。
- 首批快捷预设包括确定、上一页、下一页、播放/音频、画笔、清空。确定按钮优先绑定当前页可识别的题型容器，上一页/下一页优先绑定当前页的 `PageTurnBox`；缺少题型目标、翻页管理组件或音频文件时保留组件并提示用户补充，不猜测绑定对象。
- 画笔和清空仍按现有 `NewBrushSprite + BrushDrawBtn + BrushClearBtn` 组合创建，选择任一类预设时优先在同目录自动配对另一类皮肤。

## Preview URL 双斜杠防护

`localStorage.getItem('forge_server_url')` 可能带尾斜杠（如 `http://10.200.15.117:6688/`），拼接 `/preview-server` 会产生 `//preview-server`，导致 middleware 的 `startsWith('/preview-server')` 匹配失败，GameLoader 加载 `sys_config.json` / `module_config.json` 报"基础配置加载失败"。两处防护：

- `Toolbar.tsx`：所有 preview 按钮 `srv` 变量用 `.replace(/\/+$/, '')` 去尾斜杠
- `vite.config.ts`：所有 middleware 入口用 `.replace(/\/\/+/g, '/')` 合并双斜杠，`.replace(/\?.*$/, '')` 剥查询串后再做文件路径匹配
