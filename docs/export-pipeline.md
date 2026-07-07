# 导出流程

forge 编辑器的导出流程由 Toolbar 上两个按钮触发，**前段共用** `exportProject`，**尾段在 SVN/编译两条岔路上分开**。本文档先按按钮拉两条主线讲尾段差异，再展开共用核心。

---

## 一、两个入口对比

| 触发 | 调用 | 关键差异 |
|---|---|---|
| **发布工程** ([Toolbar.tsx:222-242](../src/components/Toolbar.tsx#L222-L242)) | `exportProject(course)` | 走完整 SVN 提交 + WebSocket 通知打包机 |
| **预览** ([Toolbar.tsx:251-274](../src/components/Toolbar.tsx#L251-L274)) | `exportProject(course, { skipSvn: true })` → `compileBuild` → `zipDirectory` → `POST /api/upload-compiled-zip` → `window.open` | 跳过 SVN，本地 Electron 编译后上传 Vite，浏览器开 GameLoader |

两条流程都先跑**前置检查（资源就绪检查）**，再跑导出共用部分（`writeBackToLocalFile` 写回课件 JSON → `cleanupUnreferencedImages` 清未引用图 → 实际导出）。

### 1.1 发布前置检查（资源就绪检查）

按钮点下后跑 [checkResourceReady.ts](../src/utils/checkResourceReady.ts) 的 `findMissingResourceElements`，扫所有 Stage（含 previewStages），收集以下三类未上传资源的元素：

- **视频**：`Video.videoUrl` 为空
- **音频**：`SoundButton.soundPath` 为空
- **动画**：`Spine.url` 为空（spine 动画文件夹未选）

有缺失则弹 [ResourceMissingDialog](../src/components/ResourceMissingDialog.tsx)，列出每条缺失（`[音频/视频/动画] 正课/预习/作业 N:stageName — 第 X 页 — elementName`），每条带"跳转"按钮直达对应关卡 + 元素。

Dialog 底部有一个"继续"按钮，label 由触发来源决定：
- 发布工程按钮触发 → "继续发布工程"
- 预览按钮触发 → "继续预览"

点继续按钮跳过资源检查直接走核心导出。

实现上，[Toolbar.tsx](../src/components/Toolbar.tsx) 把发布/预览的核心逻辑抽成两个函数：
- `runPublishFlow()`
- `runPreviewFlow(previewMode)`

资源检查在按钮 onClick 里前置（不在核心函数内部），所以 continue 按钮直接调上面两个函数就能绕过检查。

预览的 continue 路径要注意：当 `hasPreviewStages` 为真时，预览按钮的弹窗"继续预览"回调不能直接跑 `runPreviewFlow`，要先弹"正课/预习"二选一对话框（`setShowPreviewChoice(true)`），由用户在那里选完再走对应的 `runPreviewFlow(previewMode)`。


---

## 二、发布工程

`runPublishFlow` 直接调 `exportProject(currentCourse)`，跑完整流水线：

1. **共用核心**：清理 `project/<courseId>/` + `esBuild/` → `bakeTextElements` → `collectResources` → `enrichAnimAudioResources` → `collectImageSizes` → 按 `course.kind` 走 normal 或 homework 分支（详见三、四）→ 有预习关卡则调 `exportPreviewProject`
2. **SVN 提交**（`options.skipSvn` 为 false 才走，[exportProject.ts:1431-1464](../src/utils/exportProject.ts#L1431-L1464)）：
   - `eApi.isSvnDirectory(dirPath)` 判断课件目录是否在 SVN 仓库下，不是直接 return
   - `eApi.svnCommit(dirPath)` 弹 SVN 提交对话框，用户取消即抛错中止发布
   - `eApi.svnHasUnversioned(dirPath)` 检查是否还有未加入版本控制的文件，有就要求重新发布
   - `eApi.getSubdirs(${dirPath}/project/${course.id})` 拿到所有子工程目录（`Game1_LT` / `Game1_HW` / `Game1_PREVIEW`），对每个走 `eApi.svnGetUrl()` 拿 SVN URL
   - 有预习时把 `Game1_PREVIEW` 的 URL **unshift 到首位**（打包机约定首位是项目根路径）
   - `loadWsConfig()` + `sendCourseToServer(course.id, svnPaths, ...)` 通过 WebSocket 通知后端打包机

---

## 三、预览（编译 + 本地预览）

入口 [Toolbar.tsx:124-157](../src/components/Toolbar.tsx#L124-L157) 的 `runCompileBuildAndOpen(previewMode)`：

1. **`exportProject(course, { skipSvn: true })`** ← 跑核心导出但跳过 SVN（导出完直接 return，不动 SVN/WebSocket）
2. **`compileBuild(course)`** Electron IPC：调 `layaair2-cmd` + `esbuild` 把 sdk_baiya 工程编译成 `bin/`，产出包含 `index.html` 的可运行目录
   - 实现细节参见 [docs/electron-packaging.md](electron-packaging.md)（pnpm 符号链接 / `ELECTRON_RUN_AS_NODE` / 轮询 `fileconfig.json` 等坑）
3. **`window.electronAPI.zipDirectory(outputDir)`** Electron 把编译产物打成 zip Buffer（dev 服务器约定 300MB 上限）
4. **`POST ${forge_server_url}/api/upload-compiled-zip`** multipart 上传，body 包含 `courseId` / `teacherId` / `kind` / `file`
   - Server 端在 `vite.config.ts` 的 `forgePlugin()` 中间件里**内存解压**到 `preview-server/lessons/<projName>/`，先 `rmSync` 清空旧目录再重建，zip 不落盘
   - 解压完写 `courseOutputDirs` Map（`regKey → lessonDir`），后续 `/preview-server/lessons/...` 请求才能找到这次发布的资源
5. **`window.open(${srv}/preview-server/?course=${cn}&type=1&ct=1&rl=dev&sdk=full)`**：
   - `cn` = `test_<teacherId>_<courseId>`（无 teacherId 时退化成 `test_<courseId>`）
   - `previewMode=true` 时在 `cn` 后追加 `_preview` 后缀，URL 指向 `Game1_PREVIEW` 工程
   - URL 拼接前对 `forge_server_url` 做 `.replace(/\/+$/, '')` 去尾斜杠，避免双斜杠破坏 middleware 匹配

> **预习关卡选择对话框**：当课件有 `previewStages.length > 0` 时，预览按钮先弹「预习关卡 / 正常关卡」二选一，**只决定 URL 后缀**，不影响 `exportProject` 导出哪几个工程（永远全导）。

---

## 四、共用核心：`exportProject(course, options)`

文件 [src/utils/exportProject.ts](../src/utils/exportProject.ts)。一次调用最多产出三个 LayaAir 工程：

| 课件类型 | 工程目录 | 资源前缀 (`viewDir`) | 来源文件 |
|---|---|---|---|
| `course.kind === 'homework'` | `project/<cid>/Game1_HW` | `game_hw/` | exportProject.ts |
| 普通课件 | `project/<cid>/Game1_LT` | `game_lt/` | exportProject.ts |
| `course.previewStages?.length > 0`（仅 normal）| `project/<cid>/Game1_PREVIEW` | `game_preview/` | exportPreviewProject.ts |

> Homework 互斥：作业课件**不会**生成 LT 或 PREVIEW；预习只在 normal 课件下额外生成。

### 4.1 文本烘焙 `bakeTextElements`

[exportProject.ts:21-44](../src/utils/exportProject.ts#L21-L44)。`structuredClone` 深拷 course，把所有 `NewTextArea` 元素就地替换成 `Image`，`skin` = `renderTextToImage` 渲染出的 `data:image/png;base64,...`。后续流程对它一无所知，data URL 走 `data:image` 通道。

### 4.2 资源收集 `collectResources(course, viewDir)`

[exportProject.ts:100-194](../src/utils/exportProject.ts#L100-L194)。遍历所有元素的 `props` / `actions` / `exportChildren` / `_keyboardPreset.children`，产出 `Map<src, dest>`：

| src 形态 | 落点（`viewDir = game_lt` 为例） | 说明 |
|---|---|---|
| `/uploads/<file>` 或 `images/<file>`（非 animation/sound） | `game_lt/image/img/<file>` 或 `game_lt/animation/<file>`（视频）| 用户上传，按扩展名分流：图片 → image/img，视频(.mp4/.webm/.mov) → animation 平铺 |
| `images/animation/<n>/<base>.sk` | `game_lt/animation/<n>/<base>.sk` + 同名 `.png` 一同入表 | Spine 骨骼，保留 ani 子目录 |
| `images/animation/<n>/<file>.mp4` | `game_lt/animation/<file>.mp4` | 本地视频 |
| `images/sound/<file>.wav\|mp3` | `game_lt/sound/<file>` | 本地音频 |
| `data:image/...` | `game_lt/image/img/skin_<n>.png\|jpg` | 自动生成的皮肤、烘焙的文本图，自增计数 |
| 内置 export 路径（如 `game/inputImg/img_1.png`） | `builtinExportToProjectPath` 重写：`game_lt/image/inputImg/img_1.png` | `game/image/xxx → image/img/xxx`，其他 `game/<dir>/xxx → image/<dir>/xxx` |
| `/builtin/<...>` 编辑器 src 路径 | 经 `lookupBuiltinBySrcPath` 反查 exportPath 后同上 |  |

### 4.3 动画音频补全 `enrichAnimAudioResources`

[exportProject.ts:198-219](../src/utils/exportProject.ts#L198-L219)。资源 Map 收集只看元素 props 里直接引用的字段，但 Spine 项目目录下可能有 `.mp3/.wav/.ogg` 配套音频被骨骼内部加载。这里扫每个已收录 `.sk` 所在目录，把同目录下所有音频 push 进 Map。**preview 工程不调用这个函数**（exportPreviewProject 没引用）。

### 4.4 图片尺寸采集 `collectImageSizes`

[src/utils/imageSize.ts](../src/utils/imageSize.ts)。读所有图片资源的真实像素尺寸；`isLargeImage(mapped, sizes)` 用阈值 ≥512px 区分大小图——大图走 single file 条目，小图进 atlas。

### 4.5 路径重写 `rewriteProps`

[exportProject.ts:223-236](../src/utils/exportProject.ts#L223-L236)。把元素 props 中的所有 src 路径替换成 resourceMap 里的 dest。**跳过 `runtime`** 字段（scene 里只有根节点写 runtime）。

### 4.6 `.scene` 节点构建 `buildSceneNode`

[exportProject.ts:243-415](../src/utils/exportProject.ts#L243-L415)。遍历元素树产出 LayaAir Designer 风格的节点（`{x, type, searchKey, label, compId, nodeParent, props, child}`）。特殊行为：

- **DragObj/DropObj 锚点 0.5 补偿**：sdk_baiya 运行时构造函数强制 `anchorX=0.5, anchorY=0.5`（中心锚点），编辑器 `element.x/y` 是左上角。导出时 `props.x = element.x + element.width / 2`、y 同理，让 Laya 可见左上角与编辑器一致
- **SelectableObj 双 skin 拆子节点**：`_foregroundSkin` 和 `_bgSkin` 拆成两个 Image 子节点（`name='img'` / `name='bg'`），用 `left/top/right/bottom = 0` 撑满
- **DragObj `dropSkin` → 第二个 Image 子节点**：`visible: false`，`anchorX/Y = 0.5`，运行时由 `EVENT_SUCCESS` 切换显隐
- **DropObj `tipSkin` → name=tip Image 子节点**：同时设置 `props.isNeedTip = true`；没有 tipSkin 时显式 `isNeedTip = false`
- **`exportChildren` 注入**：从 `elementMeta.exportChildren` 或 `_keyboardPreset.children` 读固定子节点（如 KlInputImage 的三层皮肤），递归 `cloneFixed` 克隆
- **`_` 前缀 props 一律剥掉**（编辑器专用）；`runtime` / `hidden` / `blockThrough` 不写入 scene
- **ChoiceBox 的 `mouseEnabled` 不导出**，由 runtime 内部控制
- **`var` 缺失时自动用 `name`** 补齐
- 子节点顺序：`selectableObjChildren + dragSkinChildren + fixedChildren + userChildren`

### 4.7 顶层场景拼装 `buildTopLevelSceneChildren`

[exportProject.ts:452-617](../src/utils/exportProject.ts#L452-L617)。三件大事：

**(a) PageTurnBox 翻页组导出**：把同一 `pageTurnGroup` 的 `ContainerBox` + `PageTurnLeftBtn` + `PageTurnRightBtn` 收编进一个 `_pageTurnBox` Box 节点（`width=1920, height=1080, mouseThrough=true`）；`ContainerBox.visible` 按 `currentPageIndex` 设；非这三类的其他直接子也一并塞进 `_pageTurnBox`。这样翻页只切 `_pageTurnBox` 内的 ContainerBox 显隐，不会影响外层。

**(b) `exportWrapper` 包裹**：`elementMeta.exportWrapper` 声明的元素被分组（同类相邻的合并到一个 wrapper），导出时套外层节点（如 `KlInputImage` → `KlInputBox`）；`promoteProps` 列出的属性（如 `answer`）从内层 children 收集再以逗号串接写到 wrapper 的对应字段。

**(c) `_lockBox` 注入**：末尾**无条件**追加 Box（`width=1920, height=1080, visible=false, var='_lockBox'`），内含一个 KlInputImage 子节点（`fontClipSkin: 'share/ui/0-9-fuhao_0.png'`），用于运行时锁屏覆盖。

### 4.8 场景根节点 `buildScene`

[exportProject.ts:619-635](../src/utils/exportProject.ts#L619-L635)。包一层 `KlView` 根节点：`width=1920, height=1080, sceneColor='#000000', runtime='view/<viewDir>/<sceneName>.ts'`。

### 4.9 `.ts` 生成

[exportProject.ts:639-853](../src/utils/exportProject.ts#L639-L853)。`generateSceneTs(sceneName, flags, page, resourceMap, uiNamespace='game_lt')` 产出每个场景对应的 ts 文件，模板继承 `ui.<viewDir>.<sceneName>UI`，在 `initView(byReset)` 内拼装：

1. **`GameUtils.initConfirm`**：当 `flags.hasBtnConfirm && hasKlInputBox` 时插入，把 `_btnConfirm` / `_klInputBox` / `_lockBox` 串起来
2. **`btn_ok` + `choiceBox` 对错音效**（`hasBtnOk && hasChoiceBox`）：点击 `btn_ok` 时根据 `choiceBox.isRight` 播 `<viewDir>/sound/right.mp3` 或 `wrong.mp3`，错时还调 `cancelAllSel()` 取消选中
3. **`PageTurnBox` 翻页 JS**：每个翻页组生成 `var _ptPages_<gid> = [...]; var _ptIndex_<gid> = ...; var _ptTotal_<gid> = ...;` + 左右按钮的 `Event.CLICK` 切换 visible
4. **`DragObj` 带 `dropSkin` 的 `EVENT_SUCCESS / EVENT_FAILD` 监听**：找最近的 `DragViewBox` 祖先节点，挂事件——成功时切换 `slcDragObj.getChildAt(0/1)` 的 visible 实现 dropSkin 切换，失败时回滚
5. **用户 Action 映射表 + `buildActionBody`**：

| forge `event` | Laya 事件 | 备注 |
|---|---|---|
| `onClick` | `click` | 直接绑定 |
| `onClickSound` | `click` | body 前自动 `playSound("<viewDir>/sound/btn_click.wav")` |
| `onLoad` | `display` | 元素显示时触发 |
| `onChange` | `change` | |
| `onAllRight` | `EVENT_SUCCESS` | body 包 `if (elRef.dragsOnRightDrops()) { ... }` |
| `onAutoPlay` | — | 不绑事件，直接生成 `elRef.play(elRef.currAniName, loop)`（`spineLoop !== 'false'` 时循环） |
| `onPlayEnd` | Spine `Event.END` | 一次性回调，可选先隐藏自身 |
| `onAutoClick`（特殊） | — | 父节点是 ChoiceBox 时：`__sel.isSelected = true; parent.pushSel(name)` 后串接 onClick/onClickSound 的动作 |

| `actionType` | 生成代码 |
|---|---|
| `toggleVisible` | `t.visible = !t.visible` |
| `setVisible` | `t.visible = true / false` |
| `setProperty` | `t[property] = JSON.stringify(value)` |
| `playSound` | `this.playSound(<resourceMap.get(value)>)` |
| `playRightSound` | `this.playSound("<viewDir>/sound/right.mp3")` |
| `playWrongSound` | `this.playSound("<viewDir>/sound/wowo.mp3")` |
| `animate`（Spine 目标）| `t.play(value, loop)`，`spineLoop !== 'false'` 时循环 |
| `animate`（其他目标）| `t.play(value ?? 'shan')` |

**Homework 模板** `generateHomeworkSceneTs`：极简，只有 `super.initView(byReset)` 和占位的 `_result` / `checkResult` getter/setter，没有任何 action / 翻页逻辑（作业模式由 sdk_baiya 的作业题型类自行处理交互）。

### 4.10 `finalConfig.json`

`buildConfigJson`（normal）/ `buildHomeworkConfigJson`（homework）。Normal 顶层：`{ release: 'dev', feedback: 'spirit', noVideoMystery: 1, pages: [...] }`；homework 加 `classify: 'homeworkOnline'`、`newEva: 1`、`isSound: false`。

每个 page：
- **视频关卡**（`subPages` 中存在 `frozen=true` 且包含锁定 Video 元素）→ `{ type: 'video', videoUrl: <mappedVideoUrl>, classType: 'gc' }`
- 否则正常课件 page：
  - `subviews`：每个 subPage 一项，第一个 `classType='lt'`（主视图），后续 `classType='lx'`（练习步骤）；`view = view/<viewDir>/<sceneName>.ts`
  - `res`：扫所有元素的 props/`exportChildren`/`_keyboardPreset`/`actions(playSound/stopSound)`：
    - `<viewDir>/image/...`：`isLargeImage` 为 true → push `{url, type:'image'}` 单文件；为 false → 把 `parts[2]`（一级子目录名）加入 `imageDirs`
    - `<viewDir>/sound/...`：单独 push `{url, type:'sound'}`
    - `<viewDir>/animation/<...>.sk`：push `{url}` + 同目录 `.png` push `{url, type:'image'}`
  - 末尾 `imageDirs.forEach(dir => res.push({url: 'res/atlas/<viewDir>/image/<dir>.atlas'}))`
  - 内置音效条件加入：扫 stage 内所有 actions，**用到 `onClickSound`** → 加 `<viewDir>/sound/btn_click.wav`；**有 `playRightSound`** → 加 `right.mp3`；**有 `playWrongSound`** → 加 `wowo.mp3`（preview 是 `wrong.mp3`）

### 4.11 模板与 game.zip 解压 `extractZipFromServer`

[exportProject.ts:1198-1235](../src/utils/exportProject.ts#L1198-L1235)。统一从 `${getApiBaseUrl()}/builtin/...` 用 fetch 拉 zip，JSZip 内存解压：

1. **工程模板**：`Game1_LT.zip` / `Game1_HW.zip` / `Game1_PREVIEW.zip` 解压到 `${dirPath}/project/<cid>/Game1_XX/`，`pathMapper` 不传，整包还原
2. **`game.zip` 内置资源**：`collectGameZipFiles(resourceMap)` 算出**实际被引用**的精确路径集合（去掉 `game/` 前缀），filter 命中才解压；`pathMapper` 把 `<topDir>/...` 映射到 `<viewDir>/image/<destDirName>/...`，其中 `topDir === 'image'` 时 `destDirName = 'img'`，其他原样

每个 zip entry 通过 `eApi.writeBinaryFile(destPath, base64)` IPC 写盘；空目录通过 `eApi.ensureDir` 创建。

### 4.12 用户上传资源落盘

[exportProject.ts:1399-1423](../src/utils/exportProject.ts#L1399-L1423)。`for (const [from, to] of resourceMap)`：

| 类型判定 | 落盘方式 |
|---|---|
| 内置资源（`lookupBuiltinByExportPath` 命中或 `/builtin/` 前缀） | **跳过**（已由 game.zip 解压处理） |
| `data:image/...` | `src.split(',')[1]` 取 base64 → `eApi.writeBinaryFile(destPath, base64)` |
| `images/animation/.../.sk` / `.mp4` / `images/sound/...` | `eApi.copyLocalFile(${dirPath}/${src}, destPath)`（大文件磁盘直拷，避免 base64 内存放大） |
| 其他 `images/...` | `eApi.readFileAsDataUrl(dirPath, src)` 取 dataUrl → 提 base64 → `writeBinaryFile` |

---

## 五、`exportPreviewProject` 与主流程的差异

文件 [src/utils/exportPreviewProject.ts](../src/utils/exportPreviewProject.ts)。结构镜像 exportProject，但有以下实质差异：

1. **入参**：直接接收**已 baked** 的 course（由 `exportProject` 统一调用前传入），自身**不重做** `bakeTextElements`
2. **资源前缀**：`game_preview/` 一以贯之
3. **不调 `enrichAnimAudioResources`**：preview 工程不补 Spine 同目录音频（实际差异，按需评估是否要补齐）
4. **`.scene` 构建**：`buildPreviewScene` 与主流程节点结构一致，差别只在 `runtime` 路径前缀 `view/game_preview/`
5. **`.ts` 模板** `generatePreviewSceneTs`：
   - **有** `GameUtils.initConfirm`、PageTurnBox 翻页、DragObj `EVENT_SUCCESS/FAILD`
   - **无** `btn_ok + choiceBox` 对错音效绑定（preview 通常不出题判对错）
   - **无** 用户 Action 绑定逻辑（preview 关卡是导览/演示性质，不挂用户行为）
6. **`finalConfig.json`** `buildPreviewConfigJson`：
   - 顶层 `mode: 'preview'`，`feedback: 'spirit'`，无 `noVideoMystery`
   - 视频关卡 `classType: 'yx'`
   - 普通 page：`name: '预习<i+1>'`、`classType: 'yx'`，**无 subviews**（每个预习关卡单 page）
   - 内置音效中 wrong 文件名是 **`wrong.mp3`** 而非主流程的 `wowo.mp3`
   - 也有 `onClickSound → btn_click.wav` / `playRightSound → right.mp3` / `playWrongSound → wrong.mp3` 的条件加入
7. **不做 SVN/WebSocket**：发布尾段统一在 `exportProject` 中处理
8. **模板 zip**：从 `${serverUrl}/builtin/layaProjectModel/Game1_PREVIEW.zip` 单独拉

---

## 六、按文件路径对照表

| 阶段 | 主入口 | preview 入口 |
|---|---|---|
| 文本烘焙 | `bakeTextElements` ([exportProject.ts:21](../src/utils/exportProject.ts#L21)) | 复用主流程的 baked course |
| 资源收集 | `collectResources` ([exportProject.ts:100](../src/utils/exportProject.ts#L100)) | `collectPreviewResources` ([exportPreviewProject.ts:56](../src/utils/exportPreviewProject.ts#L56)) |
| 动画音频补全 | `enrichAnimAudioResources` ([exportProject.ts:198](../src/utils/exportProject.ts#L198)) | （无） |
| `.scene` 节点 | `buildSceneNode` ([exportProject.ts:243](../src/utils/exportProject.ts#L243)) | `buildSceneNode` ([exportPreviewProject.ts](../src/utils/exportPreviewProject.ts)) |
| 顶层场景 | `buildTopLevelSceneChildren` ([exportProject.ts:452](../src/utils/exportProject.ts#L452)) | `buildTopLevelSceneChildren` ([exportPreviewProject.ts](../src/utils/exportPreviewProject.ts)) |
| 场景根 | `buildScene` ([exportProject.ts:619](../src/utils/exportProject.ts#L619)) | `buildPreviewScene` ([exportPreviewProject.ts:514](../src/utils/exportPreviewProject.ts#L514)) |
| `.ts` 生成 | `generateSceneTs` / `generateHomeworkSceneTs` ([exportProject.ts:639](../src/utils/exportProject.ts#L639), [exportProject.ts:855](../src/utils/exportProject.ts#L855)) | `generatePreviewSceneTs` ([exportPreviewProject.ts:534](../src/utils/exportPreviewProject.ts#L534)) |
| `finalConfig.json` | `buildConfigJson` / `buildHomeworkConfigJson` ([exportProject.ts:939](../src/utils/exportProject.ts#L939), [exportProject.ts:1088](../src/utils/exportProject.ts#L1088)) | `buildPreviewConfigJson` ([exportPreviewProject.ts:655](../src/utils/exportPreviewProject.ts#L655)) |
| zip 解压 | `extractZipFromServer` ([exportProject.ts:1198](../src/utils/exportProject.ts#L1198)) | `extractZipFromServer` ([exportPreviewProject.ts:799](../src/utils/exportPreviewProject.ts#L799)) |
| 主入口 | `exportProject` ([exportProject.ts:1239](../src/utils/exportProject.ts#L1239)) | `exportPreviewProject` ([exportPreviewProject.ts:844](../src/utils/exportPreviewProject.ts#L844)) |

---

## 七、关联文档

- [docs/electron-packaging.md](electron-packaging.md) — `compileBuild` IPC 内部细节、pnpm 符号链接坑、`ELECTRON_RUN_AS_NODE`、轮询 `fileconfig.json`
- [CLAUDE.md](../CLAUDE.md)「开发服务器即后端」节 — `/api/upload-compiled-zip` server 端解压逻辑、动态路由 `courseOutputDirs` 注册
- [CLAUDE.md](../CLAUDE.md)「Preview URL 双斜杠防护」节 — `forge_server_url` 尾斜杠处理
- [docs/sdk-baiya-components.md](sdk-baiya-components.md) — sdk_baiya runtime 类（KlView / KlInputBox / DragViewBox 等）的语义
- [docs/添加组件方法记录.md](添加组件方法记录.md) — 新组件如何在 `elementMeta` 中声明 `runtime` / `exportChildren` / `exportWrapper` / `placeholderImage`
