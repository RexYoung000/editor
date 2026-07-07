# 画笔组件（NewBrushSprite）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 在 forge 「常用组件」分类下新增"画笔"组件 NewBrushSprite，工具栏一键创建 Box+SelectableObj+ScaleButton 三件套，导出时往 Box 注入 NewBrushSprite 真实节点（宽高跟随 Box、画笔属性透传），并在 Game1.ts initView() 注入 GameUtils.initDraw 调用。

**架构：** 走现有 elementMeta + exportChildren + buildVarAssignment 机制，最小化对导出主流程的侵入：扩展 ExportChild 三个字段（inheritSize / inheritProps / inheritVar），把外层 Box 分配的 var 借调给注入的子节点。事件代码在 generateSceneTs / generateHomeworkSceneTs 的 initView 段调用 GameUtils.initDraw。

**Tech Stack：** TypeScript + React 18 + Zustand + Vite 5 + LayaAir UI parser (sdk_baiya)。

**关联设计：** [docs/superpowers/specs/2026-06-15-new-brush-sprite-design.md](../specs/2026-06-15-new-brush-sprite-design.md)

---

## 文件结构

实现会触碰以下文件（按数据流向排序）：

| 文件 | 作用 | 改动类型 |
|------|------|---------|
| `public/builtin/runtime/game/image/img/img_draw.png` | 画笔开关按钮前景图 | 新增（拷贝） |
| `public/builtin/runtime/game/image/img/img_anniu-xz.png` | 画笔开关按钮选中态背景 | 新增（拷贝） |
| `public/builtin/runtime/game/image/img/img_cel.png` | 清空按钮皮肤 | 新增（拷贝） |
| `public/builtin/editor/new-brush-sprite-placeholder.png` | NewBrushSprite Box 编辑器占位图 | 新增（手工生成） |
| `public/builtin/runtime/game.zip` | 课件运行资源包 | 重新打包 |
| `src/elements/builtinAssets.ts` | 内置资源注册表 | 加 4 条 |
| `src/elements/elementMeta.ts` | element 元数据 + ExportChild 类型 | 加 3 条 element + 3 个新字段 |
| `src/utils/laya/components.ts` | 编辑器占位渲染色板 | 加 3 条色板 |
| `src/components/ElementToolbar.tsx` | 工具栏入口 | 加 handleAddBrush + 按钮 |
| `src/store/editorStore.ts` | element store + deleteElement | 加禁删守卫 |
| `src/utils/exportProject.ts` | 发布工程导出 | 扩展 ExportChild 处理 + var 集合 + initView 事件注入 |
| `src/utils/exportPreviewProject.ts` | 预览工程导出 | 同上同步 |

---

## Task 0：拷贝运行时图片资源 + 重打 game.zip

**Files:**
- Create: `public/builtin/runtime/game/image/img/img_draw.png`（从 `D:\project\v8\V8\S8\s8_v8_test_51_hw\Game1_HW\laya\assets\game_hw\image\img\img_draw.png` 拷贝）
- Create: `public/builtin/runtime/game/image/img/img_anniu-xz.png`
- Create: `public/builtin/runtime/game/image/img/img_cel.png`
- Modify: `public/builtin/runtime/game.zip`（重打）

- [ ] **Step 1：拷贝 3 张 PNG 到 forge 内置资源目录**

```powershell
$src = "D:\project\v8\V8\S8\s8_v8_test_51_hw\Game1_HW\laya\assets\game_hw\image\img"
$dst = "d:\aiproject\forge\public\builtin\runtime\game\image\img"
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }
Copy-Item -Force "$src\img_draw.png" $dst
Copy-Item -Force "$src\img_anniu-xz.png" $dst
Copy-Item -Force "$src\img_cel.png" $dst
Get-Item "$dst\img_draw.png", "$dst\img_anniu-xz.png", "$dst\img_cel.png" | Select-Object Name, Length
```

预期输出：3 行，分别显示 6256、20070、6190 字节左右。

- [ ] **Step 2：重新打包 game.zip**

```powershell
$gameRoot = "d:\aiproject\forge\public\builtin\runtime\game"
$zipPath = "d:\aiproject\forge\public\builtin\runtime\game.zip"
Compress-Archive -Path "$gameRoot\*" -DestinationPath $zipPath -Force
"game.zip size: $((Get-Item $zipPath).Length) bytes"
```

预期输出：`game.zip size: <数字> bytes`，文件被刷新。

- [ ] **Step 3：commit**

```powershell
git add public/builtin/runtime/game/image/img/img_draw.png public/builtin/runtime/game/image/img/img_anniu-xz.png public/builtin/runtime/game/image/img/img_cel.png public/builtin/runtime/game.zip
git commit -m "feat(画笔): 拷入画笔组件运行时图片资源并重打 game.zip"
```

---

## Task 1：生成编辑器 Box 占位图

**Files:**
- Create: `public/builtin/editor/new-brush-sprite-placeholder.png`

参考已有占位图风格（见 [public/builtin/editor/container-box-placeholder.png](../../../public/builtin/editor/container-box-placeholder.png) 和 [public/builtin/editor/page-turn-placeholder.png](../../../public/builtin/editor/page-turn-placeholder.png)），生成一张半透明灰底带"画笔区域"四个字的占位图，1920×1080，PNG 格式。

- [ ] **Step 1：用 .NET System.Drawing 生成占位图**

```powershell
Add-Type -AssemblyName System.Drawing
$w = 1920; $h = 1080
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(40, 200, 200, 200))
# 虚线边框
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 100, 100, 100)), 4
$pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawRectangle($pen, 4, 4, $w-8, $h-8)
# 居中文字
$font = New-Object System.Drawing.Font("Microsoft YaHei", 80, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 80, 80, 80))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, $w, $h
$g.DrawString("画笔区域", $font, $brush, $rect, $sf)
$g.Dispose()
$out = "d:\aiproject\forge\public\builtin\editor\new-brush-sprite-placeholder.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"saved: $((Get-Item $out).Length) bytes"
```

预期输出：`saved: <数字> bytes`，文件存在。

- [ ] **Step 2：commit**

```powershell
git add public/builtin/editor/new-brush-sprite-placeholder.png
git commit -m "feat(画笔): 新增画笔 Box 编辑器占位图"
```

---

## Task 2：在 builtinAssets.ts 注册 4 条 asset id

**Files:**
- Modify: `src/elements/builtinAssets.ts:216`（在数组末尾 `];` 之前插入）

- [ ] **Step 1：在 BUILTIN_ASSETS 数组末尾追加 4 条**

文件结尾大约是这样（[src/elements/builtinAssets.ts:212-217](../../../src/elements/builtinAssets.ts#L212-L217)）：

```ts
  { id: 'feedback.CH.no.sk', src: 'runtime/game/animation/zx_no/zx_no.sk', exportPath: 'game/animation/zx_no/zx_no.sk' },
  { id: 'feedback.CH.no.png', src: 'runtime/game/animation/zx_no/zx_no.png', exportPath: 'game/animation/zx_no/zx_no.png' },
];
```

在 `feedback.CH.no.png` 行和 `];` 之间插入：

```ts
  // ─── 画笔组件资源 ───
  { id: 'newBrushSprite.drawBtn',   src: 'runtime/game/image/img/img_draw.png',     exportPath: 'game/image/img/img_draw.png' },
  { id: 'newBrushSprite.drawBtnBg', src: 'runtime/game/image/img/img_anniu-xz.png', exportPath: 'game/image/img/img_anniu-xz.png' },
  { id: 'newBrushSprite.clearBtn',  src: 'runtime/game/image/img/img_cel.png',      exportPath: 'game/image/img/img_cel.png' },
  { id: 'newBrushSprite.placeholder', src: 'editor/new-brush-sprite-placeholder.png' },
```

- [ ] **Step 2：跑 lint 验证**

```powershell
pnpm lint
```

预期：无错误（warning 不计）。

- [ ] **Step 3：commit**

```powershell
git add src/elements/builtinAssets.ts
git commit -m "feat(画笔): 注册画笔组件 4 个内置资源 id"
```

---

## Task 3：扩展 ExportChild 类型，加 inheritSize / inheritProps / inheritVar

**Files:**
- Modify: `src/elements/elementMeta.ts:24-28`

- [ ] **Step 1：替换 ExportChild 接口定义**

打开 [src/elements/elementMeta.ts:24-28](../../../src/elements/elementMeta.ts#L24-L28)，原内容：

```ts
export interface ExportChild {
  type: string;
  props: Record<string, unknown>;
  child?: ExportChild[];
}
```

改为：

```ts
export interface ExportChild {
  type: string;
  props: Record<string, unknown>;
  child?: ExportChild[];
  /** 注入子节点导出时把外层 element 的 width/height 写到 props（用于画板节点宽高跟随 Box） */
  inheritSize?: boolean;
  /** 注入子节点导出时从外层 element.props 搬运的字段名列表（搬过来后外层 props 会剥掉这些字段） */
  inheritProps?: string[];
  /** 注入子节点导出时接收外层 element 在 varAssignment 里分配到的 var 名；外层节点自身不写 var */
  inheritVar?: boolean;
}
```

- [ ] **Step 2：跑 lint + tsc 检查类型**

```powershell
pnpm lint
pnpm tsc -b --noEmit
```

预期：lint 通过；tsc 通过（仅扩展可选字段，不破坏现有用法）。

- [ ] **Step 3：commit**

```powershell
git add src/elements/elementMeta.ts
git commit -m "feat(画笔): ExportChild 新增 inheritSize/inheritProps/inheritVar 字段"
```

---

## Task 4：在 elementMeta.ts 注册 3 个新 element type

**Files:**
- Modify: `src/elements/elementMeta.ts`（找到 commonComponents 段，在 ContainerBox 后面插入）

- [ ] **Step 1：找到 commonComponents 段最后一项 ContainerBox**

`grep -n "ContainerBox.*commonComponents" src/elements/elementMeta.ts` 应该定位到大约 [src/elements/elementMeta.ts:352](../../../src/elements/elementMeta.ts#L352)：

```ts
  ContainerBox: { layaType: 'Box', label: '容器Box', category: 'commonComponents', defaultSize: { width: 300, height: 300 }, defaultPosition: { x: 200, y: 200 }, placeholderImage: assetSrc('containerBox.placeholder'), defaultProps: {}, properties: [...COMMON_STATE_PROPS] },
```

- [ ] **Step 2：在该行后面插入 3 个新 element 定义**

```ts
  // ─── 画笔组件（commonComponents 分类，组合创建：Box + SelectableObj + ScaleButton；导出时注入 NewBrushSprite 子节点）───
  NewBrushSprite: {
    layaType: 'Box',
    label: '画笔',
    category: 'commonComponents',
    defaultSize: { width: 1920, height: 1080 },
    defaultPosition: { x: 0, y: 0 },
    placeholderImage: assetSrc('newBrushSprite.placeholder'),
    defaultProps: {
      brushMode: 1,
      brushColor: '#ec0626',
      thickness: 10,
      brushFillColor: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'brushMode', label: '画笔模式', type: 'select', group: '交互',
        options: [
          { label: '随意', value: 1 },
          { label: '线段', value: 2 },
          { label: '矩形', value: 3 },
          { label: '圆形', value: 4 },
          { label: '点',   value: 5 },
        ] },
      { key: 'brushColor',     label: '画笔颜色', type: 'color',  group: '外观' },
      { key: 'thickness',      label: '画笔粗细', type: 'number', min: 1, max: 50, group: '外观' },
      { key: 'brushFillColor', label: '填充颜色', type: 'color',  group: '外观' },
    ],
    exportChildren: [
      {
        type: 'NewBrushSprite',
        inheritSize: true,
        inheritProps: ['brushMode', 'brushColor', 'thickness', 'brushFillColor'],
        inheritVar: true,
        props: {
          x: 0,
          y: 0,
          visible: false,
          group: -1,
        },
      },
    ],
  },
  BrushDrawBtn: {
    layaType: 'SelectableObj',
    label: '画笔开关',
    category: 'commonComponents',
    toolbarHidden: true,
    defaultSize: { width: 107, height: 109 },
    defaultPosition: { x: 1781, y: 566 },
    placeholderImage: assetSrc('newBrushSprite.drawBtn'),
    runtime: 'com.klzz.ui.custom.SelectableObj',
    defaultProps: {
      isSelected: false,
      anchorX: 0,
      anchorY: 0,
      filterColor: '#ffff00',
      filterBlur: 6,
      _foregroundSkin: assetExport('newBrushSprite.drawBtn'),
      _bgSkin:         assetExport('newBrushSprite.drawBtnBg'),
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: '_foregroundSkin', label: '前景图（笔图标）', type: 'file', group: '外观' },
      { key: '_bgSkin',         label: '选中态背景图',     type: 'file', group: '外观' },
    ],
  },
  BrushClearBtn: {
    layaType: 'ScaleButton',
    label: '画笔清空',
    category: 'commonComponents',
    toolbarHidden: true,
    defaultSize: { width: 100, height: 100 },
    defaultPosition: { x: 1781, y: 705 },
    placeholderImage: assetSrc('newBrushSprite.clearBtn'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      skin: assetExport('newBrushSprite.clearBtn'),
      stateNum: 1,
      label: '',
      visible: false,
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
    ],
  },
```

> 注：SelectableObj/ScaleButton 的默认 anchorX/anchorY 设为 0（左上角锚点），这样 forge 的 `defaultPosition: {x:1781, y:566}` 就直接是参考 .scene 里的左上角坐标。SpeechSelectableObj 用的是 anchorX/anchorY=0.5，那是给"选项卡片"特定排版用的，画笔按钮不需要中心锚点。

- [ ] **Step 3：跑 lint + tsc**

```powershell
pnpm lint
pnpm tsc -b --noEmit
```

预期：通过。

- [ ] **Step 4：commit**

```powershell
git add src/elements/elementMeta.ts
git commit -m "feat(画笔): 注册 NewBrushSprite/BrushDrawBtn/BrushClearBtn 三个 element type"
```

---

## Task 5：在 components.ts 加 3 个占位色板（编辑模式占位渲染）

**Files:**
- Modify: `src/utils/laya/components.ts:527`（BrushSprite 那条附近）

- [ ] **Step 1：在 placeholderColorMap 加 3 条**

打开 [src/utils/laya/components.ts:527](../../../src/utils/laya/components.ts#L527)，原内容：

```ts
    'BrushSprite':  { bg: '#fafafa', border: '#616161', text: '画板' },
    'TwinkleBox':   { bg: '#fffde7', border: '#fdd835', text: '闪烁' },
```

在 `BrushSprite` 行后面、`TwinkleBox` 行前面插入：

```ts
    'NewBrushSprite': { bg: '#e3f2fd', border: '#1976d2', text: '画笔区域' },
    'BrushDrawBtn':   { bg: '#fff3e0', border: '#fb8c00', text: '画笔开关' },
    'BrushClearBtn':  { bg: '#fce4ec', border: '#d81b60', text: '画笔清空' },
```

> 这些色板只在 `placeholderImage` 加载失败的兜底渲染时用，正常情况下三个组件都是显示对应的 placeholderImage。

- [ ] **Step 2：commit**

```powershell
git add src/utils/laya/components.ts
git commit -m "feat(画笔): 编辑器占位色板新增画笔三件套兜底色"
```

---

## Task 6：在 ElementToolbar.tsx 增加"画笔"工具栏入口和 handleAddBrush

**Files:**
- Modify: `src/components/ElementToolbar.tsx`（参考 handleAddPageTurn [src/components/ElementToolbar.tsx:189-249](../../../src/components/ElementToolbar.tsx#L189-L249) 的位置，在它后面加 handleAddBrush）

- [ ] **Step 1：找到 handleAddPageTurn 函数末尾（第 249 行附近）**

`grep -n "const handleAddPageTurn" src/components/ElementToolbar.tsx` 找到起点，函数体到 `selectElement(ptBox.id, false); }; ` 结束。

- [ ] **Step 2：在 handleAddPageTurn 后面插入 handleAddBrush**

```ts
  /** 画笔组件：一次创建 NewBrushSprite Box + 画笔开关 + 清空按钮 */
  const handleAddBrush = () => {
    if (frozen) return;

    const brushBox = createDefaultElement('NewBrushSprite');
    const drawBtn  = createDefaultElement('BrushDrawBtn');
    const clearBtn = createDefaultElement('BrushClearBtn');
    drawBtn.parentId  = brushBox.id;
    clearBtn.parentId = brushBox.id;

    const boxObj = createLayaComponent(brushBox);
    if (boxObj) registerObject(brushBox.id, boxObj);
    const drawObj = createLayaComponent(drawBtn, boxObj);
    if (drawObj) registerObject(drawBtn.id, drawObj);
    const clearObj = createLayaComponent(clearBtn, boxObj);
    if (clearObj) registerObject(clearBtn.id, clearObj);

    addElement(brushBox);
    addElement(drawBtn);
    addElement(clearBtn);
    selectElement(brushBox.id, false);
  };
```

- [ ] **Step 3：在 handleAdd 函数顶部加 'NewBrushSprite' 分流**

工具栏按钮渲染逻辑会自动遍历当前 tab 的 elementMeta 项生成按钮（[src/components/ElementToolbar.tsx:612](../../../src/components/ElementToolbar.tsx#L612)），按钮 onClick 调 `handleAdd(type)`（[src/components/ElementToolbar.tsx:694](../../../src/components/ElementToolbar.tsx#L694)）。NewBrushSprite 因为 `category: 'commonComponents'` 且没有 `toolbarHidden`，会自动出现一个按钮，但默认会走 `handleAdd` 的"创建单个元素"路径，不会带子节点。

正确做法是在 `handleAdd` 顶部加分流（参考它对 `'KlBaseKeyboard'` 的处理 [src/components/ElementToolbar.tsx:74-77](../../../src/components/ElementToolbar.tsx#L74-L77)）：

打开 [src/components/ElementToolbar.tsx:72-77](../../../src/components/ElementToolbar.tsx#L72-L77)：

```ts
  const handleAdd = (type: string) => {
    if (frozen) return;
    if (type === 'KlBaseKeyboard') {
      setKeyboardDialogOpen(true);
      return;
    }
    const element = createDefaultElement(type);
```

改为：

```ts
  const handleAdd = (type: string) => {
    if (frozen) return;
    if (type === 'KlBaseKeyboard') {
      setKeyboardDialogOpen(true);
      return;
    }
    if (type === 'NewBrushSprite') {
      handleAddBrush();
      return;
    }
    const element = createDefaultElement(type);
```

> 这样不动 items.map 的渲染逻辑，"画笔"按钮自动出现在 commonComponents tab 中（label 来自 elementMeta 的 `'画笔'`）。BrushDrawBtn / BrushClearBtn 因为 `toolbarHidden: true`，不会出现独立按钮。

- [ ] **Step 4：跑 dev 起编辑器手动验证**

```powershell
pnpm dev
```

打开 http://localhost:6688，新建/打开一个课件，「常用组件」tab 找"画笔"按钮，点击：
- 画布上出现 1 个 1920×1080 的 Box 占位（半透明灰底"画笔区域"四字）
- Box 内部右下区域 (1781, 566) 出现 draw 按钮占位（笔图标）
- Box 内部 (1781, 705) 出现清空按钮占位（叉号图标）
- 元素列表面板能看到 3 个元素，BrushDrawBtn 和 BrushClearBtn 是 NewBrushSprite 的子节点
- 选中 NewBrushSprite，属性面板能看到画笔模式 / 画笔颜色 / 画笔粗细 / 填充颜色

如果工具栏没出现"画笔"按钮，检查 elementMeta 是否成功被前端识别（hot reload 是否刷新），刷新页面再试。

- [ ] **Step 5：commit**

```powershell
git add src/components/ElementToolbar.tsx
git commit -m "feat(画笔): 工具栏新增画笔组合入口（一次创建 Box+开关+清空）"
```

---

## Task 7：在 deleteElement 入口加禁删守卫

**Files:**
- Modify: `src/store/editorStore.ts:1029-1052`

- [ ] **Step 1：在 deleteElement 函数体最前面加守卫**

打开 [src/store/editorStore.ts:1029-1052](../../../src/store/editorStore.ts#L1029-L1052)，原内容：

```ts
    deleteElement: (id) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const el = page.elements.find((e) => e.id === id);
        if (el?.locked) return;
        const toDelete = new Set([id]);
```

把它改为：

```ts
    deleteElement: (id) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const el = page.elements.find((e) => e.id === id);
        if (el?.locked) return;
        // 禁止单独删除画笔子节点（必须随 NewBrushSprite Box 联动删除）
        if (el && (el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn')) {
          const parent = el.parentId ? page.elements.find((e) => e.id === el.parentId) : null;
          if (parent && parent.type === 'NewBrushSprite') return;
        }
        const toDelete = new Set([id]);
```

> 三个删除入口（[Canvas.tsx:463](../../../src/components/Canvas.tsx#L463) 键盘 Delete、[ElementList.tsx:222](../../../src/components/ElementList.tsx#L222) 列表删除按钮、[PropertyPanel.tsx:404](../../../src/components/PropertyPanel.tsx#L404) 属性面板删除按钮）都最终调 `editorStore.deleteElement(id)`，所以一处守卫覆盖三处。

- [ ] **Step 2：跑 dev 验证**

```powershell
pnpm dev
```

操作：
- 用 Task 6 的"画笔"按钮创建画笔组合
- 在元素列表选中 BrushDrawBtn → 点删除按钮 → 应不能删除（元素仍在）
- 选中 NewBrushSprite Box → 点删除按钮 → 三个元素一起消失

- [ ] **Step 3：commit**

```powershell
git add src/store/editorStore.ts
git commit -m "feat(画笔): 禁止单独删除画笔子节点（守卫加在 deleteElement 入口）"
```

---

## Task 8：在 buildSceneNode 处理 ExportChild 的新字段（exportProject.ts）

**Files:**
- Modify: `src/utils/exportProject.ts:412-419`（var 写入逻辑）
- Modify: `src/utils/exportProject.ts:565-587`（cloneFixed + fixedChildren）

- [ ] **Step 1：让外层 NewBrushSprite Box 的 var 写入跳过（var 借调给子节点）**

打开 [src/utils/exportProject.ts:412-419](../../../src/utils/exportProject.ts#L412-L419)：

```ts
  // var 按需导出：只有在 .ts 中需要 this.xxx 引用的元素才写 var；
  // 其它组件导出的 .scene 不会带 var 字段
  const assignedVar = varAssignment?.get(element.id);
  if (assignedVar) {
    props.var = assignedVar;
  } else {
    delete props.var;
  }
```

把它改为：

```ts
  // var 按需导出：只有在 .ts 中需要 this.xxx 引用的元素才写 var；
  // 其它组件导出的 .scene 不会带 var 字段
  const assignedVar = varAssignment?.get(element.id);
  // 当 element 的 exportChildren 里有 inheritVar 项时，外层节点不写 var，留给注入的子节点接收
  const hasInheritVarChild = !!meta?.exportChildren?.some(c => c.inheritVar);
  if (assignedVar && !hasInheritVarChild) {
    props.var = assignedVar;
  } else {
    delete props.var;
  }
```

- [ ] **Step 2：剥掉外层 props 里被 inheritProps 声明要搬走的字段**

紧接着上一步的代码下面（still in `buildSceneNode`），找到 [src/utils/exportProject.ts:565-587](../../../src/utils/exportProject.ts#L565-L587)：

```ts
  const directChildren = allElements.filter(e => e.parentId === element.id);
  const presetChildren = (element.props as { _keyboardPreset?: { children?: ExportChild[] } } | undefined)?._keyboardPreset?.children;
  const fixedSource: ExportChild[] = presetChildren ?? meta?.exportChildren ?? [];

  const cloneFixed = (c: ExportChild, pid: number): Record<string, unknown> => {
    const cid = nextId();
    const cProps = rewriteProps({ ...c.props }, resourceMap);
    const node: Record<string, unknown> = {
      x: 15, type: c.type, searchKey: c.type, label: c.type,
      isDirectory: !!(c.child?.length), isAniNode: true, hasChild: !!(c.child?.length),
      compId: cid, nodeParent: pid, props: cProps, child: [],
    };
    if (c.child?.length) node.child = c.child.map(cc => cloneFixed(cc, cid));
    return node;
  };

  const fixedChildren = fixedSource.map(c => cloneFixed(c, id));
```

替换整段为：

```ts
  const directChildren = allElements.filter(e => e.parentId === element.id);
  const presetChildren = (element.props as { _keyboardPreset?: { children?: ExportChild[] } } | undefined)?._keyboardPreset?.children;
  const fixedSource: ExportChild[] = presetChildren ?? meta?.exportChildren ?? [];

  // 注入子节点可声明从外层 element 搬运字段；此处先汇总要搬走的 key 集合，最后从外层 props 剥掉
  const propsToStrip = new Set<string>();
  for (const c of fixedSource) {
    if (c.inheritProps) for (const k of c.inheritProps) propsToStrip.add(k);
  }

  const cloneFixed = (c: ExportChild, pid: number): Record<string, unknown> => {
    const cid = nextId();
    const baseProps: Record<string, unknown> = { ...c.props };
    // inheritSize：把外层 element 的 width/height 拷贝到子节点 props
    if (c.inheritSize) {
      baseProps.width = element.width;
      baseProps.height = element.height;
    }
    // inheritProps：从外层 element.props 搬运字段到子节点 props
    if (c.inheritProps) {
      for (const k of c.inheritProps) {
        const v = (element.props as Record<string, unknown> | undefined)?.[k];
        if (v !== undefined && v !== null && v !== '') baseProps[k] = v;
      }
    }
    // inheritVar：把 varAssignment 里分配给外层 element 的 var 名写到子节点 props.var
    if (c.inheritVar) {
      const v = varAssignment?.get(element.id);
      if (v) baseProps.var = v;
    }
    const cProps = rewriteProps(baseProps, resourceMap);
    const childTagsForKey: string[] = [c.type];
    if (cProps.name) childTagsForKey.push(String(cProps.name));
    if (cProps.var && cProps.var !== cProps.name) childTagsForKey.push(String(cProps.var));
    const childLabel = (cProps.name as string | undefined) ?? (cProps.var as string | undefined) ?? c.type;
    const node: Record<string, unknown> = {
      x: 15, type: c.type, searchKey: childTagsForKey.join(','), label: childLabel,
      isDirectory: !!(c.child?.length), isAniNode: true, hasChild: !!(c.child?.length),
      compId: cid, nodeParent: pid, props: cProps, child: [],
    };
    if (c.child?.length) node.child = c.child.map(cc => cloneFixed(cc, cid));
    return node;
  };

  const fixedChildren = fixedSource.map(c => cloneFixed(c, id));

  // 从外层 props 剥掉被 inheritProps 搬走的字段（外层 Box 不识别这些画笔属性）
  for (const k of propsToStrip) {
    delete props[k];
  }
```

> 关键：`propsToStrip` 删除是放在 fixedChildren 计算之后，因为 `props` 此时已经是最终要导出的对象；此前给 `cloneFixed` 用的是从 `element.props` 直接读，不受 propsToStrip 影响。

- [ ] **Step 3：把 NewBrushSprite Box / BrushDrawBtn / BrushClearBtn 加入 collectElementsNeedingVar**

找到 [src/utils/exportProject.ts:314-320](../../../src/utils/exportProject.ts#L314-L320) 的"特殊硬编码组件"段：

```ts
  // 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）
  for (const el of elements) {
    // DragViewBox：generateSceneTs 监听 EVENT_SUCCESS / EVENT_FAILD
    if (el.type === 'DragViewBox') needsVar.add(el.id);
    // MatchingGame：onClickInitGameConfirm* 时需要 var 引用（this.<var>.allRight）
    if (el.type === 'MatchingGame') needsVar.add(el.id);
  }
```

把循环体扩成：

```ts
  // 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）
  for (const el of elements) {
    // DragViewBox：generateSceneTs 监听 EVENT_SUCCESS / EVENT_FAILD
    if (el.type === 'DragViewBox') needsVar.add(el.id);
    // MatchingGame：onClickInitGameConfirm* 时需要 var 引用（this.<var>.allRight）
    if (el.type === 'MatchingGame') needsVar.add(el.id);
    // 画笔组合：NewBrushSprite Box（var 借调给注入的画板子节点）+ 画笔开关 + 清空按钮
    if (el.type === 'NewBrushSprite' || el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn') {
      needsVar.add(el.id);
    }
  }
```

- [ ] **Step 4：跑 lint + tsc**

```powershell
pnpm lint
pnpm tsc -b --noEmit
```

预期：通过。

- [ ] **Step 5：commit**

```powershell
git add src/utils/exportProject.ts
git commit -m "feat(画笔): exportProject 支持 ExportChild 注入字段并把画笔组合纳入 var 分配"
```

---

## Task 9：在 generateSceneTs 注入画笔事件代码（exportProject.ts）

**Files:**
- Modify: `src/utils/exportProject.ts:1052+`（generateSceneTs 函数 initCode 段）

- [ ] **Step 1：在 generateSceneTs 的 initCode 累积段加画笔事件代码**

`grep -n "function generateSceneTs" src/utils/exportProject.ts` 找到 generateSceneTs 入口（约 [exportProject.ts:1052](../../../src/utils/exportProject.ts#L1052)）。

定位插入点：找到处理 `onClickInitConfirm / onClickInitConfirmWithLock` 的 for 循环（约 [exportProject.ts:1156-1171](../../../src/utils/exportProject.ts#L1156-L1171)），那段 `for (const el of page.elements) { ... if (rawEvent === 'onClickInitConfirm' || ...) { ... continue; } }` 整体结束（即 `}` 闭合 outer for 循环之后）的位置。

在该 outer for 循环结束后、return 之前的位置，紧贴着加一段独立的 for 循环：

```ts
  // 画笔组合：每个 NewBrushSprite Box 生成两段 inline 事件代码
  // - 清空按钮 onClick → 画板 undoDraw
  // - 画笔开关 onClick → 同步画板/清空按钮可见性
  for (const el of page.elements) {
    if (el.type !== 'NewBrushSprite') continue;
    const brushVar = getVar(el); // var 借调给注入的画板子节点
    const drawBtn  = page.elements.find(e => e.parentId === el.id && e.type === 'BrushDrawBtn');
    const clearBtn = page.elements.find(e => e.parentId === el.id && e.type === 'BrushClearBtn');
    if (!drawBtn || !clearBtn) continue;
    const drawVar  = getVar(drawBtn);
    const clearVar = getVar(clearBtn);
    initCode += `        this.${clearVar}.on(Laya.Event.CLICK, this, () => { this.${brushVar}.undoDraw(); });\n`;
    initCode += `        this.${drawVar}.on(Laya.Event.CLICK, this, () => {\n`;
    initCode += `            this.${brushVar}.visible = this.${drawVar}.isSelected;\n`;
    initCode += `            this.${clearVar}.visible = this.${drawVar}.isSelected;\n`;
    initCode += `        });\n`;
  }
```

> 实际定位时按这个标志找：搜 `'onClickInitConfirmWithLock'`，找到那个 if-continue 块，往下数到对应 outer for `}` 结束，新代码加在那个 `}` 之后。如果你的版本里 generateSceneTs 已经被改过位置不一样，按"在 initCode 还能继续累加、所有 onClickInit* 处理之后、其它 initCode 收尾代码之前"这个语义去找位置。

- [ ] **Step 2：在 generateHomeworkSceneTs 也注入相同代码**

`grep -n "function generateHomeworkSceneTs" src/utils/exportProject.ts` 找到入口（约 [exportProject.ts:1435](../../../src/utils/exportProject.ts#L1435)）。同样在 initCode 累积段加入上一步那段循环代码（一字不变）。

- [ ] **Step 3：跑 lint + tsc**

```powershell
pnpm lint
pnpm tsc -b --noEmit
```

预期：通过。

- [ ] **Step 4：commit**

```powershell
git add src/utils/exportProject.ts
git commit -m "feat(画笔): generateSceneTs/generateHomeworkSceneTs 注入画笔 inline 事件代码"
```

---

## Task 10：exportPreviewProject.ts 同步画笔逻辑

**Files:**
- Modify: `src/utils/exportPreviewProject.ts`

- [ ] **Step 1：先核对 preview 导出的代码结构**

```powershell
grep -nE "buildSceneNode|cloneFixed|exportChildren|onClickInitConfirm|generateSceneTs|collectElementsNeedingVar" d:/aiproject/forge/src/utils/exportPreviewProject.ts | head -40
```

预期：preview 项目用的是同一套 `buildScene` / `buildSceneNode` / 或者它复用 exportProject.ts 里的导出函数。看到结果再决定下一步。

- [ ] **Step 2：把 Task 8 的两处改动同步到 preview 路径**

如果 exportPreviewProject.ts 内部有自己的 `buildSceneNode` / `cloneFixed`：把 Task 8 的 Step 1（var 跳过）和 Step 2（cloneFixed 增强 + propsToStrip）都复制过来。

如果它复用 exportProject.ts 的 `buildSceneNode`：跳过这一步。

- [ ] **Step 3：把 Task 9 的事件注入同步到 preview 路径**

`grep -n "onClickInitConfirm" d:/aiproject/forge/src/utils/exportPreviewProject.ts` 看 preview 是否也有 initCode 累积逻辑（约 [exportPreviewProject.ts:557](../../../src/utils/exportPreviewProject.ts#L557)）。有的话把 Task 9 Step 1 的画笔事件循环代码同步加一份。

- [ ] **Step 4：跑 lint + tsc**

```powershell
pnpm lint
pnpm tsc -b --noEmit
```

预期：通过。

- [ ] **Step 5：commit**

```powershell
git add src/utils/exportPreviewProject.ts
git commit -m "feat(画笔): exportPreviewProject 同步注入字段和事件代码"
```

---

## Task 11：端到端验证（发布工程）

无单元测试，全靠手动跑一遍发布流程。

- [ ] **Step 1：起编辑器创建一个测试课件**

```powershell
pnpm dev
```

打开 http://localhost:6688，新建一个空白课件页（任意 stage 任意 subPage）。

- [ ] **Step 2：放一个画笔组合并改属性**

- 「常用组件」点"画笔" → 画布出现三件套
- 选中 NewBrushSprite Box → 改画笔颜色 `#0066ff`、画笔粗细 20、画笔模式"线段"（value=2）
- 选中 BrushDrawBtn → 改 x=1700, y=500
- 选中 BrushClearBtn → 改 x=1700, y=620

- [ ] **Step 3：点工具栏发布工程，等编译完成**

工具栏发布按钮 → 等 toast 提示发布成功。

- [ ] **Step 4：检查产物 .scene 文件**

发布后产物在某个 lesson 目录，cat 出 Game1.scene 看 NewBrushSprite Box 节点：

```powershell
$lessonRoot = "d:\aiproject\forge\preview-server\lessons"
Get-ChildItem -Recurse -Filter "Game1.scene" -Path $lessonRoot | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName }
```

预期：找到的 .scene 里有 NewBrushSprite 子节点：
- `type: "NewBrushSprite"` 节点存在，`width: 1920, height: 1080`，`brushMode: 2, brushColor: "#0066ff", thickness: 20`，`var: "NewBrushSprite"`
- 外层 Box 节点不带 brushMode/brushColor/thickness/brushFillColor 字段，也不带 var
- `type: "SelectableObj"` 节点 `var: "SelectableObj"`，x=1700, y=500，下面有两个 Image 子节点
- `type: "ScaleButton"` 节点 `var: "ScaleButton"`，x=1700, y=620，初始 visible=false

- [ ] **Step 5：检查产物 Game1.ts 文件**

```powershell
Get-ChildItem -Recurse -Filter "Game1.ts" -Path $lessonRoot | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName }
```

预期：initView() 里包含两段 inline 事件代码：

```ts
this.ScaleButton.on(Laya.Event.CLICK, this, () => { this.NewBrushSprite.undoDraw(); });
this.SelectableObj.on(Laya.Event.CLICK, this, () => {
    this.NewBrushSprite.visible = this.SelectableObj.isSelected;
    this.ScaleButton.visible = this.SelectableObj.isSelected;
});
```

（实际 var 名按 buildVarAssignment 跑出来的为准；如果页面只有一个画笔组合，应该正好是 NewBrushSprite/SelectableObj/ScaleButton，不带数字后缀。）

- [ ] **Step 6：用 GameLoader 预览跑通运行时**

工具栏点"预览"按钮 → 跳转 GameLoader 页面：
- 看到 draw 按钮（笔图标）；画板和清空按钮初始隐藏
- 点 draw 按钮 → SelectableObj 进入选中态（背景显示），画板可见，清空按钮可见
- 在画板区域拖动 → 看到画出蓝色线段
- 点清空按钮 → 画板被清空（线段消失）
- 再点 draw 按钮 → 画板和清空按钮再次隐藏

如果有任何一步失败：
- 画板不可见 / undoDraw 报错：检查 .scene 里 NewBrushSprite 子节点的 var 字段
- 画线无效：检查 brushMode/brushColor/thickness 是否正确写到 NewBrushSprite 节点
- 按钮位置不对：检查 SelectableObj/ScaleButton 的 x/y/anchor

- [ ] **Step 7：第二个画笔组合验证 var 后缀**

回到编辑器，**再点一次"画笔"**（同一页加第二个画笔组合）→ 移到画面左侧避免遮挡 → 重新发布 → 检查 .ts 文件应该有 4 段事件代码（每个画笔组合 2 段），var 自动加 `_2` 后缀（NewBrushSprite_2 / SelectableObj_2 / ScaleButton_2）。

- [ ] **Step 8：最终 commit（如果验证中发现问题、改动了任何代码）**

```powershell
git status
# 如果有 fix 改动
git add ...
git commit -m "fix(画笔): <具体修复点>"
```

---

## 完成标准

全部 Task 完成 + Task 11 端到端验证通过 → 计划完成。

后续可选优化（**不在本计划范围**）：
- i18n 加新元素的中英文映射
- `_foregroundSkin / _bgSkin` 用 skinGenerator 实时生成自定义皮肤（如果用户改了皮肤）
- 多语言占位图
- 工具栏按钮 icon
