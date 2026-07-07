# 画笔组件（NewBrushSprite）设计

> 日期：2026-06-15
> 关联文档：[docs/画笔功能.md](../../画笔功能.md)
> 参考 .scene：`D:\project\v8\V8\S8\s8_v8_test_51_hw\Game1_HW\laya\pages\game_hw\Game1.scene`

## 背景

在「常用组件」(`commonComponents`) 下新增"画笔"组件。运行时是 sdk_baiya 已有的 `com.klzz.ui.custom.NewBrushSprite`（[baiya2.d.ts:313](../../../public/builtin/layaProjectModel/Game1_HW/libs/baiya2.d.ts#L313)），forge 这边没登记过。

参考 .scene 里的形态：一个 Box 容器，下挂三个节点 —— `NewBrushSprite`（铺满 Box 的画板，初始隐藏）、`SelectableObj`（开关画笔的图标按钮，可见）、`ScaleButton`（清空按钮，初始隐藏）。点 SelectableObj 切换 isSelected，画板和清空按钮跟着显隐；点清空按钮调 `NewBrushSprite.undoDraw()` 清画板。

GameUtils 里已经有 `GameUtils.initDraw(_view, _btnDraw, _btnReFresh, _newBrushSp)` 帮手函数（[gameUtilsSource.ts:298](../../../src/utils/gameUtilsSource.ts#L298)），本设计**直接调用**它来注入画笔初始化代码。

## 范围

- 新增一个 forge element type `NewBrushSprite`，工具栏一次性创建 3 个元素
- SelectableObj / ScaleButton 子元素 `toolbarHidden`，但允许在画布上选中调位置
- 删除 NewBrushSprite 容器时**联动删除子节点**，禁止单独删除子节点
- 导出 .scene 时往 Box 下注入 NewBrushSprite 真实节点（forge 编辑器里看不到这个节点）
- 导出 Game1.ts `initView()` 时生成 inline 事件代码

不在本设计内的：
- BrushSprite 老组件保持不变，不删不动（兼容已有课件）
- 不引入新的 action type，所有事件直接 inline 生成

## 编辑器侧

### Element 登记

文件 [src/elements/elementMeta.ts](../../../src/elements/elementMeta.ts) 在 `commonComponents` 段新增 4 条：

| forge type | layaType | 工具栏可见 | 角色 |
|------------|----------|-----------|------|
| `NewBrushSprite` | `Box` | 是（"画笔"按钮） | 容器 + 画笔属性载体 |
| `BrushDrawBtn` | `SelectableObj` | 否（toolbarHidden） | 画笔开关按钮 |
| `BrushClearBtn` | `ScaleButton` | 否（toolbarHidden） | 清空按钮 |
| —— | —— | —— | NewBrushSprite 节点不登记成 element，导出阶段注入 |

> **取名说明**：用 `BrushDrawBtn` / `BrushClearBtn` 而不是 `SpeechSelectableObj` / 重用现有按钮，是为了让属性面板可以裁剪（只暴露皮肤/位置/状态），避免选项卡片那一堆 `_foregroundSkin / _bgSkin / _wrongSkin / cus1 / cus2 / filterColor / filterBlur` 字段干扰。

### 默认值

参考 .scene 还原（坐标按 1920×1080 KlView）：

**NewBrushSprite（容器 Box）**
```ts
{
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
}
```

**BrushDrawBtn（画笔开关 SelectableObj）**
```ts
{
  layaType: 'SelectableObj',
  label: '画笔开关',
  category: 'commonComponents',
  toolbarHidden: true,
  defaultSize: { width: 107, height: 109 },
  defaultPosition: { x: 1781, y: 566 },  // 节点 x/y 是 LayaAir 子节点相对父 Box 的坐标；与参考 .scene 一致
  placeholderImage: assetSrc('newBrushSprite.drawBtn'),
  runtime: 'com.klzz.ui.custom.SelectableObj',
  defaultProps: {
    isSelected: false,
    filterColor: '#ffff00',
    filterBlur: 6,
    _foregroundSkin: assetExport('newBrushSprite.drawBtn'),  // img_draw.png
    _bgSkin:         assetExport('newBrushSprite.drawBtnBg'), // img_anniu-xz.png
  },
  properties: [
    ...COMMON_STATE_PROPS,
    { key: '_foregroundSkin', label: '前景图（笔图标）', type: 'file', group: '外观' },
    { key: '_bgSkin',         label: '选中态背景图',     type: 'file', group: '外观' },
  ],
}
```

> SelectableObj 的 `_foregroundSkin / _bgSkin` 通过现有的 skinGenerator 机制走 `exportChildren`（参见 [SpeechSelectableObj 现有实现](../../../src/elements/elementMeta.ts) 的同名字段处理），导出时会自动生成两个 Image 子节点（一个铺满+一个 name=bg+top/right/left/bottom 全 -8）。**这套机制现成，不需要改**。

**BrushClearBtn（清空 ScaleButton）**
```ts
{
  layaType: 'ScaleButton',
  label: '画笔清空',
  category: 'commonComponents',
  toolbarHidden: true,
  defaultSize: { width: 100, height: 100 },
  defaultPosition: { x: 1781, y: 705 },
  placeholderImage: assetSrc('newBrushSprite.clearBtn'),
  runtime: 'com.klzz.ui.custom.ScaleButton',
  defaultProps: {
    skin: assetExport('newBrushSprite.clearBtn'),
    stateNum: 1,
    label: '',
    visible: false,  // 初始隐藏，跟 SelectableObj.isSelected 联动
  },
  properties: [
    ...COMMON_STATE_PROPS,
    { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
  ],
}
```

### 工具栏入口

[src/components/ElementToolbar.tsx](../../../src/components/ElementToolbar.tsx) 仿照 `handleAddPageTurn` 增加一个 `handleAddBrush` 处理函数：

```ts
const handleAddBrush = () => {
  if (frozen) return;
  const brushBox = createDefaultElement('NewBrushSprite');
  const drawBtn  = createDefaultElement('BrushDrawBtn');
  const clearBtn = createDefaultElement('BrushClearBtn');
  drawBtn.parentId  = brushBox.id;
  clearBtn.parentId = brushBox.id;

  // 把 SelectableObj/ScaleButton 的位置按相对 Box 写
  // (defaultPosition 已经按 1781/566 给出，这是相对 KlView 的；
  //  当 brushBox 位置在 0,0 时刚好等于全局位置；
  //  实际 Box 也铺满 KlView，所以子元素 x/y 直接用 defaultPosition 即可)

  const boxObj = createLayaComponent(brushBox);
  if (boxObj) registerObject(brushBox.id, boxObj);
  const drawObj  = createLayaComponent(drawBtn,  boxObj);
  if (drawObj)  registerObject(drawBtn.id,  drawObj);
  const clearObj = createLayaComponent(clearBtn, boxObj);
  if (clearObj) registerObject(clearBtn.id, clearObj);

  addElement(brushBox);
  addElement(drawBtn);
  addElement(clearBtn);
  selectElement(brushBox.id, false);
};
```

把入口按钮加到 `commonComponents` tab 的工具栏区域，标签"画笔"。

### 删除联动

P3 决策：删 NewBrushSprite 时连带删除子节点；禁止单独删除 BrushDrawBtn / BrushClearBtn。

**联动删除已经现成**：[src/store/editorStore.ts:1029-1052](../../../src/store/editorStore.ts#L1029-L1052) 的 `deleteElement` 已经按 `parentId` 做递归删除（while 循环把所有 parentId 在 toDelete 里的元素拉进来）。删 NewBrushSprite Box 自动带走 BrushDrawBtn / BrushClearBtn，无需新代码。

**只需新增"禁止单独删子节点"守卫**：在 `deleteElement` 入口加一个判断：如果 `el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn'`，且其 `parentId` 指向的元素 `type === 'NewBrushSprite'`，直接 return 不删（也可以同时 toast 提示，但 toast 不在本设计强制要求）。

入口拦截只需要改 `deleteElement` 一处即可——三处删除入口（[Canvas.tsx:463](../../../src/components/Canvas.tsx#L463) 键盘 Delete、[ElementList.tsx:222](../../../src/components/ElementList.tsx#L222) 列表删除按钮、[PropertyPanel.tsx:404](../../../src/components/PropertyPanel.tsx#L404) 属性面板删除按钮）都最终调 `editorStore.deleteElement(id)`。

### 编辑模式渲染

按 `commonComponents` 约定，三者都走 `placeholderImage` → 在编辑模式下 `createLayaComponent` 把 `layaType` 替换为 `Image`。SelectableObj / ScaleButton 的实例化在编辑模式下也用占位图，运行行为编辑器里不模拟（只能调位置/换皮肤）。

## 内置资源

新增 3 张图，从参考工程拷贝到 `public/builtin/runtime/game/image/img/`：

| 源 | 目标 | builtinAssets id |
|----|------|------------------|
| `D:\project\v8\V8\S8\s8_v8_test_51_hw\Game1_HW\laya\assets\game_hw\image\img\img_draw.png` | `public/builtin/runtime/game/image/img/img_draw.png` | `newBrushSprite.drawBtn` |
| `…\img_anniu-xz.png` | `public/builtin/runtime/game/image/img/img_anniu-xz.png` | `newBrushSprite.drawBtnBg` |
| `…\img_cel.png` | `public/builtin/runtime/game/image/img/img_cel.png` | `newBrushSprite.clearBtn` |

另外画板容器需要一张占位图（编辑器里 Box 自身的占位）：

| 来源 | 目标 | builtinAssets id |
|------|------|------------------|
| 编辑器自制（淡灰底 + "画笔区域"四字） | `public/builtin/editor/newBrushSprite-placeholder.png` | `newBrushSprite.placeholder` |

> `editor/` 目录只在编辑器使用、不参与发布；`runtime/game/` 目录的图编辑器和发布课件都用，加完图必须重打 `public/builtin/runtime/game.zip`（CLAUDE.md 已注明）。

[src/elements/builtinAssets.ts](../../../src/elements/builtinAssets.ts) 注册 4 个 id。

## 导出侧

### 节点注入：扩展 `exportChildren` 字段

现有 `exportChildren` 只支持固定的子节点结构（[src/elements/elementMeta.ts:42](../../../src/elements/elementMeta.ts#L42) 定义）。本设计需要的注入比 KlInputImage 复杂一点：**注入的 NewBrushSprite 节点的 `width/height` 要等于外层 Box 的 `width/height`，且要从外层 props 搬运 brushMode/brushColor/thickness/brushFillColor，并接收外层 Box "借调"过来的 var**。

方案：给 `ExportChild` 类型增加三个可选字段：

```ts
type ExportChild = {
  type: string;
  props: Record<string, unknown>;
  inheritSize?: boolean;     // 新增：true 时把外层 width/height 写进来
  inheritProps?: string[];   // 新增：要从外层 props 搬运的 key 列表
  inheritVar?: boolean;      // 新增：true 时接收外层 element 在 varAssignment 里分配到的 var；外层节点自身不写 var
  child?: ExportChild[];
};
```

然后 NewBrushSprite 元素 meta 的 `exportChildren` 写：

```ts
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
```

修改点：导出阶段处理 `exportChildren` 的代码（[src/utils/exportProject.ts](../../../src/utils/exportProject.ts) 里相关段落）需要在生成子节点 props 时：
1. 读 `inheritSize` → 写 `width: outer.width, height: outer.height`
2. 遍历 `inheritProps` → 把外层 element.props 里对应字段拷过来
3. 读 `inheritVar` → 把 `varAssignment.get(outer.id)` 写到子节点 props.var；同时让 buildSceneNode 在生成外层 Box 节点时跳过写 var
4. **从外层 Box 的导出 props 里剥掉 brushMode/brushColor/thickness/brushFillColor**（Box 不识别这些，否则 LayaAir 解析时会报警告/失败）

[src/utils/exportPreviewProject.ts](../../../src/utils/exportPreviewProject.ts) 同步修改。

> z 序：注入到 child 数组**最前面**（P1 决策 A），让 NewBrushSprite 在 SelectableObj/ScaleButton 下方。参考 .scene 也是这个顺序（NewBrushSprite → SelectableObj → ScaleButton）。

### 变量名策略（P1 决策 A：显式 var）

**采用现有的 `collectElementsNeedingVar` + `buildVarAssignment` 机制**（[exportProject.ts:300-374](../../../src/utils/exportProject.ts#L300-L374)），不引入新的 var 分配通道。这套机制已经能：
- 按 `el.name` 作为 base，相同 base 自动加 `_2 / _3` 后缀防冲突
- 把分配结果通过 `varAssignment: Map<string, string>` 传给 `buildSceneNode` 和 `generateSceneTs`

**接入步骤**：

1. **告诉系统这三类元素需要 var**：在 `collectElementsNeedingVar` 的"特殊硬编码组件"段（约 [exportProject.ts:314-320](../../../src/utils/exportProject.ts#L314-L320)）追加：
   ```ts
   if (el.type === 'NewBrushSprite' || el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn') {
     needsVar.add(el.id);
   }
   ```

2. **base 名约定（决策 P1.5）**：拍板用贴合样例的 `NewBrushSprite / SelectableObj / ScaleButton` 作为 base，依靠 buildVarAssignment 自动后缀消冲突。具体做法是在 `createDefaultElement('BrushDrawBtn')` 时把 `element.name` 设为 `'SelectableObj'`，`'BrushClearBtn'` 设为 `'ScaleButton'`，`'NewBrushSprite'` 设为 `'NewBrushSprite'`。
   - 第一个画笔组合 → `NewBrushSprite / SelectableObj / ScaleButton`（如果页面没别的同名 var）
   - 同页有第二个画笔组合 → `NewBrushSprite_2 / SelectableObj_2 / ScaleButton_2`
   - 同页同时有选择题（其 SpeechSelectableObj base 名是 `a/b/c/d`，不冲突）→ 不影响
   - 同页有别的元素正好叫 `SelectableObj` → 自动让画笔的变成 `SelectableObj_2`

3. **注入的 NewBrushSprite 子节点的 var**：buildVarAssignment 是按 forge element 的 id 分配的，但**注入的 NewBrushSprite 节点不是一个 forge element**（它在 exportChildren 里）。所以 NewBrushSprite 子节点的 var 用**外层 NewBrushSprite Box 的同一个 var 名**。具体：在 buildSceneNode 处理 exportChildren 时，把外层 element 的 `varAssignment.get(el.id)` 写到注入子节点的 props.var 上（外层 Box 自己的 var 会被一个特殊处理——见下条）。

4. **外层 NewBrushSprite Box 不要 var**：因为外层 Box 在 .ts 里不会被 `this.NewBrushSprite_N` 引用（事件代码引用的是注入的 NewBrushSprite **子节点**）。所以：
   - `collectElementsNeedingVar` 标记 NewBrushSprite element 需要 var（用于在 buildVarAssignment 里占用一个名字）
   - 但 `buildSceneNode` 在生成外层 Box 节点时，**不写** props.var（避免 LayaAir 在 .ts 里同时出现两个同名 `_${var}` 字段冲突）
   - 把这个 var 名"借调"给注入的子 NewBrushSprite 节点

   实现细节：在 elementMeta 的 NewBrushSprite 条目上加一个新字段 `varForInjectedChild?: boolean`（或者直接 hardcode by type），指示导出时把分配的 var 写到注入子节点而非外层 Box。

5. **样例对照**：用户给的代码是 `this.ScaleButton_1.on(...)`。在 forge 默认场景（页面只有一个画笔组合，没有别的同名元素）下，导出的 var 就是 `ScaleButton_1` 吗？需要看 buildVarAssignment 的实际行为：base="ScaleButton"，第一次 used 不冲突 → candidate = "ScaleButton"（**不带 `_1`**）。所以默认会是 `this.ScaleButton`，不是 `this.ScaleButton_1`。

   两个解法：
   - **解法 a（推荐）**：直接接受 `this.ScaleButton`、`this.SelectableObj`、`this.NewBrushSprite`（无 `_1` 后缀）；用户给的样例代码里的 `_1` 是因为他参考的 .scene 里另有节点同名导致的自动后缀，不是必需。
   - **解法 b**：让画笔组合的 base 强制带 `_1` 后缀（但 buildVarAssignment 现在不支持这种 "base 已带数字" 的递增——它会变成 SelectableObj_1 → SelectableObj_1_2，不雅观）。

   **拍板解法 a**。注意更新文档示例代码的 var 名要去掉 `_1`，详见下节。

### 事件代码生成

[src/utils/exportProject.ts](../../../src/utils/exportProject.ts) 在生成 `initView()` 的 `initCode` 阶段（参考 `onClickInitConfirm` 的处理位置 [exportProject.ts:1156](../../../src/utils/exportProject.ts#L1156)）扫描页面所有 `type === 'NewBrushSprite'` 元素，检查该元素自己是否配置了 `onInitBrush` 事件，如果有则生成：

```ts
GameUtils.initDraw(this, this.{SelectableObjVar}, this.{ScaleButtonVar}, this.{NewBrushSpriteVar});
```

三个 `*Var` 占位都从 `varAssignment` 里读：
- `NewBrushSpriteVar` = `varAssignment.get(brushBoxElement.id)`（即"借调"给注入子节点的那个 var）
- `SelectableObjVar` = `varAssignment.get(brushDrawBtnElement.id)`
- `ScaleButtonVar` = `varAssignment.get(brushClearBtnElement.id)`

页面上只有一个画笔组合时实际生成的代码：
```ts
GameUtils.initDraw(this, this.SelectableObj, this.ScaleButton, this.NewBrushSprite);
```

页面有多个或与其它 SelectableObj/ScaleButton 共存时按 buildVarAssignment 自动加 `_2 / _3` 后缀。

[src/utils/exportPreviewProject.ts](../../../src/utils/exportPreviewProject.ts) 同步修改。

## 数据流

```
[工具栏] 点"画笔"
   ↓
handleAddBrush()
   ↓
createDefaultElement('NewBrushSprite') + 'BrushDrawBtn' + 'BrushClearBtn'
   ↓
addElement × 3（带 parentId 链接）
   ↓
[编辑器] 三个 placeholderImage 渲染在画布上
   ↓
用户拖动按钮位置、改画笔颜色等
   ↓
[导出] exportProject.ts 遍历元素树
   ├── NewBrushSprite Box → 处理 exportChildren，注入 NewBrushSprite 子节点
   │     宽高 = Box 宽高，brushMode/brushColor/thickness/brushFillColor 搬过来
   │     Box 自己 props 剥掉这 4 个字段
   │     Box 自己 var 留空；分配的 var 名借调给注入的 NewBrushSprite 子节点
   ├── BrushDrawBtn → SelectableObj 节点，var 由 buildVarAssignment 分配（默认 SelectableObj，冲突时 _2/_3）
   │     带两个 Image 子节点（_foregroundSkin / _bgSkin）
   └── BrushClearBtn → ScaleButton 节点，var 由 buildVarAssignment 分配（默认 ScaleButton，冲突时 _2/_3）
   ↓
.scene 文件
   ↓
initView() 注入 inline 事件代码
   ↓
Game1.ts
```

## 错误与边界

- **用户单独删了 SelectableObj/ScaleButton 子节点**：P3 决策禁止；UI 阻止 + 提示"无法单独删除画笔子节点"。
- **用户复制粘贴 NewBrushSprite Box**：粘贴时按现有 `pasteElement` 的递归逻辑会带子节点一起；编号在导出阶段重新计算（按 element 顺序），自然递增。
- **用户改了 BrushDrawBtn/BrushClearBtn 的 name 字段**：name 只影响 forge 内部显示，导出 var 名按上面的命名规则强制覆盖，不读 name。
- **页面上同时有 NewBrushSprite 和 SelectableObj 选项卡片**：选项卡片的 base 名是 `a/b/c/d`（[ElementToolbar.tsx:268](../../../src/components/ElementToolbar.tsx#L268) 的 `optionNames`），跟画笔的 `SelectableObj` 不冲突；即使有同名也会被 buildVarAssignment 自动加 `_2` 后缀。
- **Box width/height 是 0**：注入的 NewBrushSprite 也是 0，无效。校验由用户自己负责，不在导出做强制。

## 测试与验证

无单元测试套件，按现有项目惯例手动验证：

1. `pnpm dev` 起编辑器；新建一个课件页
2. 「常用组件」点"画笔"，画布上出现 Box 占位 + draw 按钮 + 清空按钮
3. 调整 Box 大小、按钮位置、画笔颜色/粗细
4. 试单独删 draw 按钮 → 应被阻止
5. 删 NewBrushSprite Box → 三个子节点联动消失
6. 工具栏发布工程，检查产物：
   - `Game1_HW/laya/pages/.../Game1.scene` 里三个节点带正确 var、NewBrushSprite 宽高跟随 Box、画笔属性写在 NewBrushSprite 节点上
   - `Game1_HW/src/.../Game1.ts` `initView()` 包含两段 inline 事件代码
7. 用 GameLoader 预览，点 draw 按钮可以画线，点清空按钮清空，再点 draw 按钮关闭画板
8. 一个页面放两个画笔组合，var 自动加后缀，各自工作互不干扰

## 改动清单（待 plan 阶段细化）

- [src/elements/elementMeta.ts](../../../src/elements/elementMeta.ts)：新增 3 条 element + `ExportChild` 类型扩展（`inheritSize / inheritProps / inheritVar`）
- [src/elements/builtinAssets.ts](../../../src/elements/builtinAssets.ts)：注册 4 个 asset id
- `public/builtin/runtime/game/image/img/`：拷入 3 张 PNG，重打 game.zip
- `public/builtin/editor/newBrushSprite-placeholder.png`：新增 1 张占位图
- [src/components/ElementToolbar.tsx](../../../src/components/ElementToolbar.tsx)：新增 `handleAddBrush` + 工具栏按钮
- [src/store/editorStore.ts](../../../src/store/editorStore.ts)：`deleteElement` 入口加守卫，禁止单独删除画笔子节点
- [src/utils/exportProject.ts](../../../src/utils/exportProject.ts)：
  - `collectElementsNeedingVar` 加入 NewBrushSprite / BrushDrawBtn / BrushClearBtn
  - `buildSceneNode` 处理 exportChildren 时支持 inheritSize / inheritProps / inheritVar
  - `generateSceneTs` 注入画笔 inline 事件代码
- [src/utils/exportPreviewProject.ts](../../../src/utils/exportPreviewProject.ts)：同上
- [src/utils/laya/components.ts](../../../src/utils/laya/components.ts)：3 个新 type 的占位色板（[components.ts:527](../../../src/utils/laya/components.ts#L527) 同位置）
- 可选：[src/i18n/translations.ts](../../../src/i18n/translations.ts) + [src/elements/elementMetaI18n.ts](../../../src/elements/elementMetaI18n.ts) 加新元素的中英文映射
