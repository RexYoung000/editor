# 导出流程

forge 编辑器的导出流程由 Toolbar 上发布与预览入口触发，**工程生成共用** `exportProject`，之后分别进入发布窗口或本地编译预览。本文档先按入口说明两条主线，再展开共用核心。

---

## 一、两个入口对比

| 触发 | 调用 | 关键差异 |
|---|---|---|
| **发布工程** ([Toolbar.tsx](../src/components/Toolbar.tsx)) | 打开统一发布窗口；确认预览后由窗口调用 `exportProject(course, { cleanBuildOutput: true })` | 生成、校验、SVN 提交，再通知打包机 |
| **预览** ([Toolbar.tsx](../src/components/Toolbar.tsx)) | `exportProject(course)` → `compileBuild` → `zipDirectory` → `POST /api/upload-compiled-zip` → `window.open` | 本地 Electron 编译后上传 Vite，浏览器开 GameLoader，不接触 SVN |

两条流程都先跑**前置检查（资源就绪检查）**，再跑导出共用部分（`writeBackToLocalFile` 写回课件 JSON → `cleanupUnreferencedImages` 清未引用图 → 实际导出）。

内部页面课件在资源检查之后增加结构校验：目标不存在、目标类型不兼容、同一次点击包含多个页面动作或弹窗没有关闭出口时阻止预览与发布；无入口内容页和无打开入口弹窗只提示，不阻断。运行时仍会在页面显隐切换前校验页面 ID 和页面类型，异常断链数据只能兜底到当前内容页或主界面，不允许隐藏全部内部页面根节点。

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

老师发布不再要求当前可编辑课件本身位于 SVN 工作副本。工具栏先打开统一发布窗口，由窗口完成最新预览确认、SVN 目标确认、工程生成、课件级工作副本同步、commit 和现有打包机通知。完整产品规则、身份保护和失败恢复见 [老师课件发布流程](course-publishing.md)。

1. **共用核心**：`exportProject(course)` 清理 `project/<courseId>/`，烘焙编辑内容，收集资源并生成当前课型需要的完整 `Game1_*` 工程；正式发布额外传入 `{ cleanBuildOutput: true }` 清理旧编译产物，复习课也进入同一工程生成入口。
2. **预览一致性**：预览后按范围记录完整工程目录指纹；正式发布重新生成并逐项比对，避免确认后发布了不同内容。
3. **SVN 发布**：Electron 发布服务只把身份文件和完整 `Game1_*` 同步到老师确认的最终课件目录，取得 revision 后返回工程 SVN URL；普通课件存在预习时 `Game1_PREVIEW` 仍位于 `devSVNPaths` 首位。
4. **打包通知**：渲染进程通过现有 `integrationRequest` 发送工程 URL。请求成功发送即显示“发布已提交”，后续可获得的文本反馈继续更新为成功或明确失败。

---

## 三、预览（编译 + 本地预览）

入口 [Toolbar.tsx:124-157](../src/components/Toolbar.tsx#L124-L157) 的 `runCompileBuildAndOpen(previewMode)`：

1. **`exportProject(course)`** ← 只生成完整工程，不动 SVN 或 WebSocket
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
   - `sdk=full` 保留完整 cursor 同步链路；该模式不会再加载数学学科 SDK，因此豌豆精灵通用反馈的胜利、失败和遗憾音效由 `share/sdk/sdk_baiya.js` 自身绑定
   - 动作和场景导出只触发 SDK 通用反馈，不重复注入正确或错误音效

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

文本的编辑器画布、编辑结束后的画布、编辑器预览和正式导出共享同一套字体测量、换行、行高、粗体/斜体和尺寸模式规则。编辑态只暂时覆盖底层文本图像，退出编辑时一次提交文本与自动计算后的尺寸；预览和导出继续使用同一 PNG 烘焙路径。这样不会出现“编辑器看起来能放下、预览或发布却换行/裁切不同”的三套排版结果。

字体选择与默认值以 [字体库与历史兼容](font-library.md) 为准。历史课件中的旧方正字体 ID 会在进入编辑器时迁移为“思源黑体 Regular”，字体解析入口也执行同一缺省归一化；导出只携带烘焙后的 PNG，不携带或动态加载 OTF/TTF。

### 4.1.1 输入框字体图烘焙

`bakeCourseAssets` 在同一份课程副本中统一烘焙 `KlInputImage`、`FractionInput` 和自定义答案键盘的文字资源。显式配置了新输入框文字主题的组件按“字符表 + 黄色/蓝色/绿色主题 + 当前比例字号”生成横向 FontClip PNG，并把运行时需要的 `fontClipSkin`、`sheet`、单元宽高、字符间距与缩放参数写入副本。一个字符间距值统一控制连续字符、分子分母和字符与分数结构之间的间隔，并与字号一起按框体比例缩放。分数输入框还把独立分数字号比例转换为分子分母缩放、分数线宽度和纵向结构比例，默认 `64%`；普通输入框和分数输入框必须调用同一套样式与字形生成器，自定义答案键盘只提供答案字符集合，不能覆盖输入框自己的主题。

生成结果仍是 `data:image/png;base64,...`，因此继续通过统一资源收集、路径重写和写盘链路进入 Electron 预览与正式工程，不在课件运行时加载字体文件。输入框字号弹窗保存的测试样例属于 `_` 前缀编辑器配置，在构建 scene 前剥离；它不得成为 `fontClipValue`、正确答案或运行时资源。没有新主题字段的历史输入框跳过这一步，保留原 `fontClipSkin` 和旧显示行为。

### 4.2 资源收集 `collectResources(course, viewDir, stages, options)`

[exportProject.ts](../src/utils/exportProject.ts)。正式工程与预习工程共用该入口，通过 `viewDir` 和待遍历 stages 决定课程命名空间，遍历所有元素的 `props` / `actions` / `exportChildren` / `_keyboardPreset.children`，产出 `Map<src, dest>`：

视频关卡在创建或替换时已经按 [视频关卡来源选择](video-stage-selection.md) 把预设、本地或资源库 MP4 统一落入当前课件目录。导出只读取实际 `videoUrl`，不能扫描或整批复制内置预设目录。

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

[exportProject.ts](../src/utils/exportProject.ts)。正式工程与预习工程共用，把元素 props 中的所有 src 路径替换成 resourceMap 里的 dest。**跳过 `runtime`** 字段（scene 里只有根节点写 runtime）。

### 4.6 `.scene` 节点构建 `buildSceneNode`

[exportProject.ts](../src/utils/exportProject.ts)。正式工程与预习工程统一从 `buildScene` 进入，复用变量分配、包装节点和特殊组件子节点规则；课程类型只传入不同 `viewDir` 和场景名。节点构建遍历元素树产出 LayaAir Designer 风格结构（`{x, type, searchKey, label, compId, nodeParent, props, child}`）。特殊行为：

- **DragObj/DropObj 锚点 0.5 补偿**：sdk_baiya 运行时构造函数强制 `anchorX=0.5, anchorY=0.5`（中心锚点），编辑器 `element.x/y` 是左上角。导出时 `props.x = element.x + element.width / 2`、y 同理，让 Laya 可见左上角与编辑器一致
- **普通图片镜像补偿**：`Image` / `NewImage` 的 `mirrorX`、`mirrorY` 是课程中的编辑状态，不直接写入 scene。导出时转换为 `scaleX=-1` / `scaleY=-1`，再按图片尺寸、锚点和自身旋转方向补偿 `x/y`；镜像前后的可见外框和选区位置必须一致，正式与预习工程复用同一规则
- **选择题 SelectableObj 五态拆子节点**：`_foregroundSkin`、`_pressedSkin`、`_bgSkin`、`_correctSkin`、`_wrongSkin` 分别生成通常、按压、选中、正确、错误图层；状态图层互斥，底框和描边使用九宫格横向拉伸
- **DragObj `dropSkin` → 第二个 Image 子节点**：`visible: false`，`anchorX/Y = 0.5`，运行时由 `EVENT_SUCCESS` 切换显隐
- **DropObj `tipSkin` → name=tip Image 子节点**：同时设置 `props.isNeedTip = true`；没有 tipSkin 时显式 `isNeedTip = false`
- **`exportChildren` 注入**：从 `elementMeta.exportChildren` 或 `_keyboardPreset.children` 读固定子节点（如 KlInputImage 的三层皮肤），递归 `cloneFixed` 克隆
- **`_` 前缀 props 一律剥掉**（编辑器专用）；`runtime` / `hidden` / `blockThrough` 不写入 scene
- **点击触发源热区**：只要元素会被导出为运行时 `click` 监听源，`.scene` 自动写入 `mouseEnabled=true, mouseThrough=false`。这覆盖普通 `onClick` / `onClickSound`、`onClickSdkJudge`、内部页面点击动作、翻页动作和历史确认按钮事件；`blockThrough` 继续作为手动阻止穿透开关保留，但不再是点击事件能触发的前提
- **ChoiceBox 的 `mouseEnabled` 不导出**，由 runtime 内部控制
- **ChoiceBox 答案转换**：编辑器 `_correctOptionIds` 不进入 scene；导出时按直属选项当前名称生成 `rightItemNames`，并按答案数量生成 `upperLimit`（1 个为单选，2 个及以上为不限数量多选）
- **选项文字点击穿透**：选择题选项内部 Label 强制 `mouseEnabled=false, mouseThrough=true`，点击文字区域仍由选项元素接收
- **`var` 缺失时自动用 `name`** 补齐
- 子节点顺序：`selectableObjChildren + dragSkinChildren + fixedChildren + userChildren`

### 4.7 顶层场景拼装 `buildTopLevelSceneChildren`

[exportProject.ts:452-617](../src/utils/exportProject.ts#L452-L617)。三件大事：

**(a) PageTurnBox 翻页组导出**：把同一 `pageTurnGroup` 的 `ContainerBox` + `PageTurnLeftBtn` + `PageTurnRightBtn` 收编进一个 `_pageTurnBox` Box 节点（`width=1920, height=1080, mouseThrough=true`）；`ContainerBox.visible` 按 `currentPageIndex` 设；非这三类的其他直接子也一并塞进 `_pageTurnBox`。这样翻页只切 `_pageTurnBox` 内的 ContainerBox 显隐，不会影响外层。

**(b) `exportWrapper` 包裹**：`elementMeta.exportWrapper` 声明的元素被分组（同类相邻的合并到一个 wrapper），导出时套外层节点（如 `KlInputImage` → `KlInputBox`）；`promoteProps` 列出的属性（如 `answer`）从内层 children 收集再以逗号串接写到 wrapper 的对应字段。

**(c) `_lockBox` 注入**：末尾**无条件**追加 Box（`width=1920, height=1080, visible=false, var='_lockBox'`），内含一个 KlInputImage 子节点（`fontClipSkin: 'share/ui/0-9-fuhao_0.png'`），用于运行时锁屏覆盖。

### 4.8 场景根节点 `buildScene`

[exportProject.ts](../src/utils/exportProject.ts)。包一层 `KlView` 根节点：`width=1920, height=1080, sceneColor='#000000', runtime='view/<viewDir>/<sceneName>.ts'`。正课默认按动作注入口才反馈动画节点；预习复用同一场景构建入口，但通过显式选项关闭这项正课专用能力，避免生成未收集资源的节点。

内部页面小关卡仍只生成一个场景：主界面、内容页和弹窗分别编译为持久容器。内容页互斥显示；弹窗显示时以主界面为只读底板。切换仅改变容器显隐，不重新创建已进入页面，因此同一轮运行内保留输入、选择、拖拽和显隐状态。隐藏页面的加载动作延迟到首次显示时执行一次。

页面动作生成的 `__forgeShowContent`、`__forgeOpenDialog` 和 `__forgeCloseDialog` 使用编译时页面类型表防护目标：内容跳转必须落在主界面或内容页，打开或替换弹窗必须落在弹窗页。无效目标不会写入当前底板页面，也不会触发首次加载动作；关闭弹窗默认返回打开前保留的内容页，保留值失效时回到主界面。

### 4.9 `.ts` 生成

[exportProject.ts:639-853](../src/utils/exportProject.ts#L639-L853)。`generateSceneTs(sceneName, flags, page, resourceMap, uiNamespace='game_lt')` 产出每个场景对应的 ts 文件，模板继承 `ui.<viewDir>.<sceneName>UI`，在 `initView(byReset)` 内拼装：

1. **确认判定初始化**：根据确认按钮指向的目标生成 `GameUtils.initConfirm`、`GameUtils.initChoiceBoxConfirm` 或结构化填空判定；正课与预习共用同一目标规则
2. **ChoiceBox 五态运行时**：选项点击只更新选择与黄色描边；确认后用绿/红描边替换。正确后锁定，错误后下一次修改清除结果；作业和专题测评只在通用提交读取 `result` 时应用结果
3. **`PageTurnBox` 翻页 JS**：每个翻页组生成 `var _ptPages_<gid> = [...]; var _ptIndex_<gid> = ...; var _ptTotal_<gid> = ...;` + 左右按钮的 `Event.CLICK` 切换 visible
4. **`DragObj` 带 `dropSkin` 的 `EVENT_SUCCESS / EVENT_FAILD` 监听**：找最近的 `DragViewBox` 祖先节点，挂事件——成功时切换 `slcDragObj.getChildAt(0/1)` 的 visible 实现 dropSkin 切换，失败时回滚
5. **用户 Action 映射表 + `buildActionBody`**：

普通事件绑定由正课、预习、作业和专题测评共享：`onClick`、`onClickSound`、`onLoad`、`onChange` 统一按元素和事件分组，每组只生成一个监听，再在监听中顺序执行动作。`onClickSound` 每次事件只在动作序列前播放一次点击音效。内部页面动作、SDK 判定、PageTurnBox 翻页和其他专项动作从普通事件序列中排除，由对应编译器单独生成，避免重复监听。

| forge `event` | Laya 事件 | 备注 |
|---|---|---|
| `onClick` | `click` | 直接绑定 |
| `onClickSound` | `click` | body 前自动 `playSound("<viewDir>/sound/btn_click.wav")` |
| `onClickSdkJudge` | `click` | 通过 `judgeTargetId` 按目标类型调用现有 SDK 判定，只执行匹配的结果分支；`targetId` 仍表示分支动作目标 |
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

**Homework 模板** `generateHomeworkSceneTs`：继承 `ui.game_hw` 并保留 `_result` / `checkResult` getter/setter，同时复用上述普通事件绑定。题型组件继续通过 `onChoiceJudge`、`onInputJudge`、`onDragJudge`、`onMatchingJudge` 接入结果；显式 `onClickSdkJudge` 继续生成点击监听。除此之外，导出器会收集不属于答题判定容器且配置了非空 `_judgeAnswer` 的 `KlInputImage` / `FractionInput`，在 `checkResult()` 中按“任一未填为 `null`、全部填写且全对为 `true`、全部填写但任一错误为 `false`”聚合。未配置答案的普通输入控件不会进入判定，编辑器专用 `_judgeAnswer` 仍不写入 scene。

配置了多候选答案或 `_inputRelations` 的 `KlInputBox`，以及显式开启“启用答题判定”的 `ContainerBox`，会在正常、作业和预习场景的 `initView()` 中注入实例级判定：`isNull()` 统一检查该组全部输入格，`isRight()` 将未关联空位的候选答案判断与两框算式关系判断做 AND 聚合。输入格只归属最近的答题判定容器，嵌套容器不会重复收集。关系支持加、减、乘、除和相等，小数使用稳定容差，简单分数转换为数值后参与计算。被引用输入格会强制生成 scene `var`，编辑器专用候选、关系和容器开关字段仍从 scene 剥离。这样通用点击判定、`GameUtils.initConfirm` 和作业 `checkResult()` 无需建立平行入口即可得到同一结果；失效引用、重复占用、无效目标或无规则空位会在预览与发布前中止并返回可修复信息。

快捷确定按钮引用 `KlInputBox` 时继续生成 `GameUtils.initConfirm`；引用启用答题判定的 `ContainerBox` 时改为生成通用三态点击监听，直接调用容器已注入的 `isNull()` / `isRight()`，并按事件配置执行默认正确、错误反馈和锁屏。失效的确认目标在工程生成前统一校验并阻止继续，不能静默跳过监听代码。

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

正常课、作业、专题测评和预习的普通场景都必须同时扫描两类固定子节点资源：`elementMeta.exportChildren` 与 `getKeyboardChildren(element)`。前者承载 `KlInputImage` 等组件的输入框底图，后者承载键盘预设的动态按键与底板；任何课程类型漏掉其中一类，编译后都可能出现“场景节点存在，但对应图集未预加载、组件不可见”的结果。复习课当前只生成视频配置，不导出题目场景，因此不进入这项资源一致性约束。
  - 末尾 `imageDirs.forEach(dir => res.push({url: 'res/atlas/<viewDir>/image/<dir>.atlas'}))`
  - 内置音效条件加入：扫 stage 内所有 actions，**用到 `onClickSound`** → 加 `<viewDir>/sound/btn_click.wav`；**有 `playRightSound`** → 加 `right.mp3`；**有 `playWrongSound`** → 加 `wowo.mp3`（preview 是 `wrong.mp3`）

### 4.11 模板与 game.zip 解压 `extractZipFromServer`

[exportProject.ts](../src/utils/exportProject.ts)。正式工程与预习工程共用下载、目录创建和二进制写盘实现，统一从 `${getApiBaseUrl()}/builtin/...` 用 fetch 拉 zip，JSZip 内存解压：

1. **工程模板**：`Game1_LT.zip` / `Game1_HW.zip` / `Game1_PREVIEW.zip` 解压到 `${dirPath}/project/<cid>/Game1_XX/`，`pathMapper` 不传，整包还原
2. **`game.zip` 内置资源**：`collectGameZipFiles(resourceMap)` 算出**实际被引用**的精确路径集合（去掉 `game/` 前缀），filter 命中才解压；引用路径和解压落点统一由同一映射决定：`sound/` → `<viewDir>/sound/`，`animation/` → `<viewDir>/animation/`，`image/` → `<viewDir>/image/img/`，其他图片目录 → `<viewDir>/image/<topDir>/`

运行时组件源码属于工程模板，不属于 `game.zip` 素材包。以 `FractionInput` 为例，正课、作业和预习分别从三份模板中的 `src/view/*/Components/FractionInput.ts` 编译；修改该组件时必须同步三份源目录并执行 `node scripts/pack-template-zips.mjs`，否则开发预览和正式导出可能因使用旧模板而表现不一致。该类修复不应改动 `game.zip`，除非同时变更了 `public/builtin/runtime/game/` 下的素材。

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

文件 [src/utils/exportPreviewProject.ts](../src/utils/exportPreviewProject.ts)。预习只保留课程类型特有的场景代码、配置和写盘编排；资源收集、路径重写、变量分配、包装节点、特殊组件节点、内置资源筛选和 zip 解压均复用 [exportProject.ts](../src/utils/exportProject.ts) 的共享核心。实质差异如下：

1. **入参**：直接接收**已 baked** 的 course（由 `exportProject` 统一调用前传入），自身**不重做** `bakeTextElements`
2. **资源前缀**：`game_preview/` 一以贯之
3. **不调 `enrichAnimAudioResources`**：preview 工程不补 Spine 同目录音频（实际差异，按需评估是否要补齐）
4. **`.scene` 构建**：直接复用 `buildScene`，把 `viewDir` 设为 `game_preview`，并关闭正课专用的口才反馈动画注入；其余节点、变量、包装和特殊组件规则与正式工程保持一致
5. **`.ts` 模板** `generatePreviewSceneTs`：
   - **有** `GameUtils.initConfirm`、PageTurnBox 翻页、DragObj `EVENT_SUCCESS/FAILD`
   - **有** `onClickSdkJudge` 通用点击判定，复用与正式工程一致的目标能力和结果分支生成器
   - **有**与正课、作业和专题测评共享的 `onClick`、`onClickSound`、`onLoad`、`onChange` 普通事件绑定
   - **无** `btn_ok + choiceBox` 对错音效绑定（preview 通常不出题判对错）
   - 内部页面动作、PageTurnBox 翻页和通用点击判定按明确入口单独生成，不与普通事件重复绑定
6. **`finalConfig.json`** `buildPreviewConfigJson`：
   - 顶层 `mode: 'preview'`，`feedback: 'spirit'`，无 `noVideoMystery`
   - 视频关卡保持单页配置，不生成 `subviews`
   - 普通大关卡与正课使用相同的页面容器结构：每个 stage 生成一个 page，stage 内每个 subPage 生成一个独立场景并按顺序写入 `subviews`
   - 第一个预习场景继续使用 `Game<i+1>` 名称以兼容既有单页工程；后续小关卡使用 `Game<i+1>_<j+1>`，每项 `classType: 'yx'`
   - 运行时默认显示第一个 `subview`，继续由现有 PageView 协议上下切换小关卡；大关卡本身不额外生成场景
   - 普通 page 的 `res` 与正式工程保持固定子节点资源边界一致：同时收集 `elementMeta.exportChildren` 和键盘预设 children，保证输入框底图与键盘皮肤对应图集都进入预加载清单
   - 内置音效中 wrong 文件名是 **`wrong.mp3`** 而非主流程的 `wowo.mp3`
   - 也有 `onClickSound → btn_click.wav` / `playRightSound → right.mp3` / `playWrongSound → wrong.mp3` 的条件加入
7. **不做 SVN/WebSocket**：`exportProject` 只生成工程；发布窗口统一处理 SVN 与打包机通知
8. **模板 zip**：从 `${serverUrl}/builtin/layaProjectModel/Game1_PREVIEW.zip` 单独拉

内部页面编译、页面动作生成、关系校验和页面资源遍历由正式工程与预习工程共享，不能再各自维护一份规则。正课、作业、专题测评和预习区均支持 `internal-pages-v1`；复习课和视频关卡继续走原流程。

普通课件复制大关卡后，预习与正课导出都必须按副本的完整 `subPages` 重新生成页面配置和场景；不得复用原关卡 ID、场景实例或内部页面引用。视频大关卡副本继续按独立视频 page 导出。

---

## 六、按文件路径对照表

| 阶段 | 主入口 | preview 入口 |
|---|---|---|
| 文本烘焙 | `bakeTextElements` ([exportProject.ts:21](../src/utils/exportProject.ts#L21)) | 复用主流程的 baked course |
| 资源收集 | `collectResources` ([exportProject.ts](../src/utils/exportProject.ts)) | 复用 `collectResources`，传入 `previewStages` 与 `game_preview` |
| 动画音频补全 | `enrichAnimAudioResources` ([exportProject.ts:198](../src/utils/exportProject.ts#L198)) | （无） |
| `.scene` 节点 | `buildSceneNode` ([exportProject.ts](../src/utils/exportProject.ts)) | 复用同一实现 |
| 顶层场景 | `buildTopLevelSceneChildren` ([exportProject.ts](../src/utils/exportProject.ts)) | 复用同一实现 |
| 场景根 | `buildScene` ([exportProject.ts](../src/utils/exportProject.ts)) | 复用 `buildScene`，使用 `game_preview` 命名空间 |
| `.ts` 生成 | `generateSceneTs` / `generateHomeworkSceneTs` ([exportProject.ts:639](../src/utils/exportProject.ts#L639), [exportProject.ts:855](../src/utils/exportProject.ts#L855)) | `generatePreviewSceneTs` ([exportPreviewProject.ts:534](../src/utils/exportPreviewProject.ts#L534)) |
| `finalConfig.json` | `buildConfigJson` / `buildHomeworkConfigJson` ([exportProject.ts:939](../src/utils/exportProject.ts#L939), [exportProject.ts:1088](../src/utils/exportProject.ts#L1088)) | `buildPreviewConfigJson` ([exportPreviewProject.ts:655](../src/utils/exportPreviewProject.ts#L655)) |
| zip 解压 | `extractZipFromServer` ([exportProject.ts](../src/utils/exportProject.ts)) | 复用同一实现 |
| 主入口 | `exportProject` ([exportProject.ts:1239](../src/utils/exportProject.ts#L1239)) | `exportPreviewProject` ([exportPreviewProject.ts:844](../src/utils/exportPreviewProject.ts#L844)) |

---

## 七、导出结果回归测试

[Issue #32](https://github.com/RexYoung000/editor/issues/32) 为导出核心增加不依赖 Electron 写盘、SVN、网络和本机素材的结构测试入口：

- `buildExportRegressionArtifacts` 生成正常课、作业、专题测评、复习课和内部页面的资源映射、`.scene` 结构、场景代码与 `config.json`。
- `buildPreviewExportRegressionArtifacts` 生成预习课对应的同类结构产物。
- 共享场景断言使用同一页面分别生成正式与预习 `.scene`，除工程命名空间和场景名外，节点、变量、包装与特殊组件结构必须完全一致。
- 真实导出写盘复用与测试入口相同的结构组合逻辑；测试不会另写一套模拟导出规则。
- 图片尺寸由测试显式传入，用于稳定验证大图散图与小图 atlas 规则，不读取开发者本机文件。
- 断言只覆盖组件树、坐标属性、变量、动作、内部页面运行代码、课程类型差异和关键资源路径，不保存整文件快照。

代表性夹具固定覆盖正常课、作业课、专题测评、预习、复习课和内部页面。夹具只使用仓库内注册的内置资源路径与虚拟 `images/` 路径，不依赖未入库素材；如果当前导出行为本身存在问题，应另建缺陷 Issue，不在回归测试任务中顺手改变输出。

这层测试保护的是导出规则和最终结构，不覆盖文本 Canvas 烘焙、Spine 目录伴随音频扫描、模板 zip 下载、资源真实写盘、SVN 提交、编译与 GameLoader 打开。这些外部集成仍按本文前述流程和 [测试与验收](testing.md) 执行。

## 八、关联文档

- [docs/electron-packaging.md](electron-packaging.md) — `compileBuild` IPC 内部细节、pnpm 符号链接坑、`ELECTRON_RUN_AS_NODE`、轮询 `fileconfig.json`
- [docs/dev-server.md](dev-server.md) — `/api/upload-compiled-zip` 服务端解压、动态路由注册和 Preview URL 双斜杠防护
- [docs/sdk-baiya-components.md](sdk-baiya-components.md) — sdk_baiya runtime 类语义，以及新组件在 `elementMeta` 中声明 `runtime` / `exportChildren` / `exportWrapper` / `placeholderImage` 的接入约束
