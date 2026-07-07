# 连线题功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在"豌豆口才"分类下添加"连线题"按钮，支持创建连线游戏、三种连线方向切换、MatchingItem 图片上传、属性面板配置及正确导出。

**Architecture:** 复用现有 MatchingGame/MatchingItem 组件定义，在 ElementToolbar 添加组合创建逻辑（参考选择题），PropertyPanel 添加 direction 切换和 _itemImage 上传处理，导出时处理可选字段和 Image 子节点生成。

**Tech Stack:** TypeScript, React, Laya 引擎, Zustand (editorStore)

**Spec:** [2026-06-05-matching-game-design.md](../specs/2026-06-05-matching-game-design.md)

---

## 文件结构

修改的文件（不创建新文件）：

- `src/elements/elementMeta.ts` - 添加 PropertyDef.tooltip 字段；更新 MatchingGame/MatchingItem 属性定义
- `src/components/ElementToolbar.tsx` - 添加 handleAddMatching 函数和按钮
- `src/components/PropertyPanel.tsx` - 添加 direction 切换、_itemImage 上传处理、tooltip 渲染
- `src/utils/exportProject.ts` - 处理 wrongLineskin / lineSkin 可选导出，生成 MatchingItem Image 子节点
- `src/i18n/translations.ts` - 添加"连线题"翻译

---

## Task 1: 在 PropertyDef 接口添加 tooltip 字段

**Files:**
- Modify: `src/elements/elementMeta.ts:4-17`

- [ ] **Step 1: 编辑 PropertyDef 接口**

在 `src/elements/elementMeta.ts` 的 PropertyDef 接口中（第 4-17 行附近），添加 tooltip 字段：

```typescript
export interface PropertyDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder' | 'fontLibrary' | 'fontLocal';
  group?: string;
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  min?: number; max?: number; step?: number;
  elementFilter?: string[];
  scopedToAncestorType?: string;
  advanced?: boolean;
  /** 鼠标悬停时显示的提示文案 */
  tooltip?: string;
}
```

- [ ] **Step 2: 验证类型**

运行 `pnpm build`，确认无 TypeScript 错误。

- [ ] **Step 3: 提交**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: PropertyDef 增加 tooltip 字段"
```

---

## Task 2: 更新 MatchingGame 属性定义

**Files:**
- Modify: `src/elements/elementMeta.ts:180`

**目的:** 把现有 MatchingGame 调整为豌豆口才分类、补全 direction/mode/wrongLineskin/single/boxItemsName 属性，使用 select 类型 + tooltip。

- [ ] **Step 1: 替换 MatchingGame 定义**

把 `src/elements/elementMeta.ts:180` 那一行（MatchingGame）整体替换为：

```typescript
  MatchingGame: {
    layaType: 'MatchingGame',
    label: '连线游戏',
    category: 'speechCourse',
    toolbarHidden: true,
    defaultSize: { width: 1920, height: 1080 },
    defaultPosition: { x: 0, y: 0 },
    runtime: 'com.klzz.ui.custom.MatchingGame.MatchingGame',
    defaultProps: { mode: 3, direction: 0, single: 0 },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'direction', label: '连线方向', type: 'select', group: '交互', options: [
        { label: '左右', value: 0 },
        { label: '上下', value: 1 },
        { label: '中心点', value: 2 },
      ] },
      { key: 'mode', label: '连线模式', type: 'select', group: '交互',
        tooltip: '1为点击连线，2为鼠标滑动连线，3为可点可滑',
        options: [
          { label: '点击', value: 1 },
          { label: '滑动', value: 2 },
          { label: '可点可滑', value: 3 },
        ] },
      { key: 'single', label: '是否单线模式', type: 'select', group: '交互', options: [
        { label: '是', value: 0 },
        { label: '否', value: 1 },
      ] },
      { key: 'boxItemsName', label: '连线项容器名', type: 'text', group: '交互' },
      { key: 'lineSkin', label: '连线皮肤', type: 'file', group: '外观' },
      { key: 'wrongLineskin', label: '连线错误提示皮肤', type: 'file', group: '外观' },
      { key: 'lineHeight', label: '连线高度', type: 'number', group: '外观' },
    ],
  },
```

**说明:**
- `category` 从 `'line'` 改为 `'speechCourse'`，并加 `toolbarHidden: true`，因为它由"连线题"按钮组合创建，不在工具栏单独出现
- `wrongLineskin` 注意是小写 s（参考 GameLX2.scene 实际字段名）

- [ ] **Step 2: 验证编译**

运行 `pnpm build`，确认无错误。

- [ ] **Step 3: 提交**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: 完善 MatchingGame 属性定义"
```

---

## Task 3: 更新 MatchingItem 属性定义

**Files:**
- Modify: `src/elements/elementMeta.ts:181`

**目的:** 把现有 MatchingItem 调整为豌豆口才分类，添加 _itemImage 编辑器专用字段。

- [ ] **Step 1: 替换 MatchingItem 定义**

把 `src/elements/elementMeta.ts:181` 那一行（MatchingItem）整体替换为：

```typescript
  MatchingItem: {
    layaType: 'MatchingItem',
    label: '连线项',
    category: 'speechCourse',
    toolbarHidden: true,
    defaultSize: { width: 80, height: 80 },
    runtime: 'com.klzz.ui.custom.MatchingGame.MatchingItem',
    defaultProps: { filterColor: '#ffff00' },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'camp', label: '阵营', type: 'text', group: '交互' },
      { key: 'connectableCamps', label: '可连阵营', type: 'text', group: '交互' },
      { key: 'rightItemNames', label: '正确连接', type: 'text', group: '交互' },
      { key: '_itemImage', label: '图片', type: 'file', group: '外观' },
      ...P_FILTER,
    ],
  },
```

**说明:**
- `_itemImage` 是编辑器专用字段（`_` 前缀），导出时不写到 props，由导出层另行处理
- `category: 'speechCourse'` + `toolbarHidden: true`，与 MatchingGame 一致

- [ ] **Step 2: 验证编译**

运行 `pnpm build`，确认无错误。

- [ ] **Step 3: 提交**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: MatchingItem 添加 _itemImage 字段"
```

---

## Task 4: PropertyPanel 渲染 tooltip

**Files:**
- Modify: `src/components/PropertyPanel.tsx`

**目的:** 让带 `tooltip` 的属性 label 鼠标悬停时显示提示。

- [ ] **Step 1: 找到属性 label 渲染处**

在 `src/components/PropertyPanel.tsx` 中搜索 `prop.label` 或属性 label 渲染的地方（通常是 `<label>` 或 `<span>` 标签），找到所有渲染属性 label 的位置。

- [ ] **Step 2: 添加 title 属性**

修改属性 label 渲染，让它在 tooltip 存在时透传到 title：

```tsx
<label title={prop.tooltip}>{prop.label}</label>
```

或者类似的写法（保持与现有代码风格一致）。`title={undefined}` 时浏览器不会显示提示，所以无需条件判断。

- [ ] **Step 3: 启动 dev 服务器手动验证**

```bash
pnpm dev
```

打开编辑器，给画布加一个 MatchingGame，鼠标悬停在"连线模式"标签上，应显示提示"1为点击连线，2为鼠标滑动连线，3为可点可滑"。

- [ ] **Step 4: 提交**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: PropertyPanel 渲染 PropertyDef.tooltip"
```

---

## Task 5: 抽取连线题布局表

**Files:**
- Modify: `src/components/ElementToolbar.tsx`（顶部新增常量）

**目的:** Task 6 和 Task 7 都需要 direction → 位置/命名 的映射，先把它抽出来共享。

- [ ] **Step 1: 在 ElementToolbar.tsx 顶部添加布局常量**

在 ElementToolbar.tsx 的 `import` 语句之后、组件函数之前，添加：

```typescript
/** 连线题：根据 direction 给前3个、后3个 MatchingItem 分配位置和 name */
type MatchingLayoutItem = { x: number; y: number; name: string };
type MatchingLayout = { items: MatchingLayoutItem[] };

export function getMatchingLayout(direction: 0 | 1 | 2): MatchingLayout {
  if (direction === 0) {
    return { items: [
      { x: 750,  y: 450, name: 'l1' },
      { x: 750,  y: 540, name: 'l2' },
      { x: 750,  y: 630, name: 'l3' },
      { x: 1130, y: 450, name: 'r1' },
      { x: 1130, y: 540, name: 'r2' },
      { x: 1130, y: 630, name: 'r3' },
    ] };
  }
  if (direction === 1) {
    return { items: [
      { x: 860,  y: 300, name: 't1' },
      { x: 960,  y: 300, name: 't2' },
      { x: 1060, y: 300, name: 't3' },
      { x: 860,  y: 780, name: 'b1' },
      { x: 960,  y: 780, name: 'b2' },
      { x: 1060, y: 780, name: 'b3' },
    ] };
  }
  // direction === 2 中心点：位置同左右，命名 item1/3/5（左）和 item2/4/6（右）
  return { items: [
    { x: 750,  y: 450, name: 'item1' },
    { x: 750,  y: 540, name: 'item3' },
    { x: 750,  y: 630, name: 'item5' },
    { x: 1130, y: 450, name: 'item2' },
    { x: 1130, y: 540, name: 'item4' },
    { x: 1130, y: 630, name: 'item6' },
  ] };
}
```

- [ ] **Step 2: 验证编译**

运行 `pnpm build`，确认无错误。

- [ ] **Step 3: 提交**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "feat: 抽取连线题 direction 布局映射表"
```

---

## Task 6: 添加 handleAddMatching 函数

**Files:**
- Modify: `src/components/ElementToolbar.tsx`

**目的:** 实现"连线题"按钮的组合创建逻辑：MatchingGame → MatchBox → 6 个 MatchingItem。

- [ ] **Step 1: 添加 handleAddMatching 函数**

在 ElementToolbar.tsx 中找到 `handleAddChoice` 函数（第 219 行附近），在其后添加：

```typescript
  /** 连线题：MatchingGame + MatchBox + 6 个 MatchingItem */
  const handleAddMatching = () => {
    if (frozen) return;

    // 1. 创建 MatchingGame 容器
    const matchingGame = createDefaultElement('MatchingGame');

    // 2. 创建 MatchBox 中间层
    const matchBox = createDefaultElement('Box');
    matchBox.parentId = matchingGame.id;
    matchBox.x = 0;
    matchBox.y = 0;
    matchBox.width = 1920;
    matchBox.height = 1080;
    matchBox.name = `_matchBox_${matchBox.id.slice(-6)}`;

    // 3. MatchingGame 的 boxItemsName 同步为 MatchBox.name
    matchingGame.props = { ...matchingGame.props, boxItemsName: matchBox.name };

    // 4. 创建 6 个 MatchingItem（默认 direction=0 布局）
    const layout = getMatchingLayout(0);
    const items = layout.items.map((cfg, i) => {
      const item = createDefaultElement('MatchingItem');
      item.parentId = matchBox.id;
      item.name = cfg.name;
      item.x = cfg.x;
      item.y = cfg.y;
      const isLeft = i < 3;
      item.props = {
        ...item.props,
        camp: isLeft ? 'camp1' : 'camp2',
        connectableCamps: isLeft ? 'camp2' : 'camp1',
        rightItemNames: '',
      };
      return item;
    });

    // 5. 创建 Laya 对象并注册
    const gameObj = createLayaComponent(matchingGame);
    if (gameObj) registerObject(matchingGame.id, gameObj);

    const boxObj = createLayaComponent(matchBox, gameObj);
    if (boxObj) registerObject(matchBox.id, boxObj);

    items.forEach(item => {
      const obj = createLayaComponent(item, boxObj);
      if (obj) registerObject(item.id, obj);
    });

    // 6. 添加到 store
    addElement(matchingGame);
    addElement(matchBox);
    items.forEach(item => addElement(item));

    // 7. 默认选中 MatchingGame
    selectElement(matchingGame.id, false);
  };
```

- [ ] **Step 2: 添加"连线题"按钮**

在 JSX 中找到"填空题"按钮（搜索"填空题"），在其后添加：

```tsx
<button
  onClick={handleAddMatching}
  disabled={frozen}
  className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
    frozen
      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
      : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
  }`}
>
  {translateLabel('连线题', language)}
</button>
```

- [ ] **Step 3: 启动 dev 服务器手动验证**

```bash
pnpm dev
```

打开编辑器，进入豌豆口才课程，点击"连线题"按钮：
- 画布上应出现 MatchingGame
- 元素列表显示 MatchingGame > Box > 6 个 MatchingItem
- 6 个 MatchingItem 的 name 是 l1/l2/l3/r1/r2/r3
- 选中 MatchingItem，属性面板能看到 camp（camp1/camp2）和 connectableCamps（camp2/camp1）

- [ ] **Step 4: 提交**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "feat: 添加连线题创建按钮和组合逻辑"
```

---

## Task 7: PropertyPanel direction 切换时重排子项

**Files:**
- Modify: `src/components/PropertyPanel.tsx`

**目的:** 用户在属性面板修改 MatchingGame.direction 时，自动更新所有 MatchingItem 子项的 name 和 x/y。

- [ ] **Step 1: 引入布局函数**

在 PropertyPanel.tsx 顶部 import 区添加：

```typescript
import { getMatchingLayout } from './ElementToolbar';
```

如果有循环依赖问题，把 `getMatchingLayout` 抽到 `src/utils/matchingLayout.ts`，让两边都从那里 import。

- [ ] **Step 2: 找到属性更新入口**

在 PropertyPanel.tsx 中找到属性变更的处理函数（通常是 `onChange` 或调用 `updateElementProp` 的地方）。

- [ ] **Step 3: 添加 direction 切换的副作用**

在属性更新逻辑里，识别 `element.type === 'MatchingGame'` 且变更 key 是 `direction` 的情况，执行：

```typescript
// MatchingGame direction 切换：批量重命名/重定位 MatchingItem 子项
if (element.type === 'MatchingGame' && propKey === 'direction') {
  const newDirection = Number(newValue) as 0 | 1 | 2;
  const matchBox = allElements.find(e => e.parentId === element.id && e.type === 'Box');
  if (matchBox) {
    const items = allElements.filter(e => e.parentId === matchBox.id && e.type === 'MatchingItem');
    const layout = getMatchingLayout(newDirection);
    items.forEach((item, i) => {
      const cfg = layout.items[i];
      if (!cfg) return; // 子项数量超出布局表时跳过（边界处理）
      updateElement(item.id, {
        name: cfg.name,
        x: cfg.x,
        y: cfg.y,
      });
    });
  }
}
```

**说明:**
- `allElements` / `updateElement` 用 PropertyPanel 现有的访问方式（看周围代码风格）
- 子项数量不为 6 时按现有数量依次应用，超出布局表的 item 跳过
- 不修改 `camp` / `connectableCamps`，它们已在创建时设好

- [ ] **Step 4: 启动 dev 验证**

```bash
pnpm dev
```

打开连线题，选中 MatchingGame，把 direction 从"左右"改为"上下"：
- 6 个 MatchingItem 的 name 变成 t1/t2/t3/b1/b2/b3
- 位置变成上下布局
- 改为"中心点"，name 变成 item1/item3/item5/item2/item4/item6
- 改回"左右"，恢复 l1~r3

- [ ] **Step 5: 提交**

```bash
git add src/components/PropertyPanel.tsx
git commit -m "feat: PropertyPanel 切换 direction 时同步更新子项位置和命名"
```

---

## Task 8: PropertyPanel _itemImage 上传后调整宽高

**Files:**
- Modify: `src/components/PropertyPanel.tsx`

**目的:** 用户给 MatchingItem 上传 `_itemImage` 后，自动把 MatchingItem 的 width/height 调整为图片的实际尺寸。

- [ ] **Step 1: 添加 _itemImage 切换的副作用**

在与 Task 7 相同的属性变更处理里，加入：

```typescript
// MatchingItem _itemImage 上传：读取图片实际宽高，更新 MatchingItem 尺寸
if (element.type === 'MatchingItem' && propKey === '_itemImage') {
  const url = String(newValue ?? '');
  if (url) {
    const img = new window.Image();
    img.onload = () => {
      updateElement(element.id, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      // 图片加载失败时不改 size，避免画布消失
    };
    img.src = url;
  }
}
```

**说明:**
- 用浏览器原生 `Image` 对象读尺寸，加载完成后写回 store
- 加载失败不改尺寸（保持原状），避免误操作

- [ ] **Step 2: 让画布上的 MatchingItem 显示 _itemImage**

找到 `src/utils/laya/components.ts` 的 `createLayaComponent` 中，编辑模式下创建 MatchingItem 占位的逻辑。如果当前没有特殊处理，加：

```typescript
// MatchingItem 编辑模式：用 Image 占位显示 _itemImage
if (element.type === 'MatchingItem') {
  const img = new Laya.Image();
  const skin = element.props?._itemImage as string | undefined;
  if (skin) img.skin = skin;
  img.width = element.width;
  img.height = element.height;
  return img;
}
```

或者把 MatchingItem 加入 `createLayaComponent` 中已有的"用 Image 占位"那个分支（看 components.ts 的现有约定，参考 NewImage 或 placeholderImage 路径）。

- [ ] **Step 3: 启动 dev 验证**

```bash
pnpm dev
```

选中一个 MatchingItem，给"图片"字段上传一张 PNG：
- MatchingItem 在画布上显示这张图
- MatchingItem 的 width/height 自动变成图片实际尺寸（比如 200x150）

- [ ] **Step 4: 提交**

```bash
git add src/components/PropertyPanel.tsx src/utils/laya/components.ts
git commit -m "feat: MatchingItem 上传图片后自动调整宽高并显示"
```

---

## Task 9: 导出层处理 lineSkin / wrongLineskin 可选导出

**Files:**
- Modify: `src/utils/exportProject.ts`

**目的:** lineSkin / wrongLineskin 在用户没传时不写到导出 .scene。

- [ ] **Step 1: 找到 MatchingGame 导出 props 的代码**

在 `src/utils/exportProject.ts` 搜索 props 写入逻辑。一般有一个统一的导出函数遍历 `element.props` 并写 .scene。

- [ ] **Step 2: 加可选字段过滤**

在导出 MatchingGame 的 props 时，对 `lineSkin` 和 `wrongLineskin` 做空值过滤：

```typescript
// 过滤空值的可选字段（lineSkin / wrongLineskin）
function filterOptionalFileFields(props: Record<string, unknown>): Record<string, unknown> {
  const result = { ...props };
  for (const key of ['lineSkin', 'wrongLineskin']) {
    const v = result[key];
    if (v === '' || v === undefined || v === null) {
      delete result[key];
    }
  }
  return result;
}
```

在 MatchingGame 的导出处调用这个过滤函数。

- [ ] **Step 3: 测试导出**

发布工程或预览，检查导出 .scene 中：
- 用户没上传 lineSkin → .scene 里没这个字段
- 用户上传了 lineSkin → .scene 里有这个字段

- [ ] **Step 4: 提交**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: 导出 MatchingGame 时过滤未上传的 lineSkin/wrongLineskin"
```

---

## Task 10: 导出 MatchingItem 时生成 Image 子节点

**Files:**
- Modify: `src/utils/exportProject.ts`

**目的:** MatchingItem 的 `_itemImage` 不写到自身 props，但要在其下生成一个 type=Image、props.skin=_itemImage 的子节点。

- [ ] **Step 1: 找到 MatchingItem 导出代码**

在 `exportProject.ts` 中找到处理子节点的部分（一般是递归 `child` 字段的地方）。

- [ ] **Step 2: 剥离 _itemImage**

在导出 MatchingItem 的 props 时，删除 `_itemImage`：

```typescript
function stripItemImage(props: Record<string, unknown>): { cleanProps: Record<string, unknown>; itemImage: string | undefined } {
  const cleanProps = { ...props };
  const itemImage = typeof cleanProps._itemImage === 'string' ? cleanProps._itemImage : undefined;
  delete cleanProps._itemImage;
  return { cleanProps, itemImage };
}
```

- [ ] **Step 3: 注入 Image 子节点**

如果 `itemImage` 非空，在 MatchingItem 的 child 数组里 prepend 一个：

```typescript
{
  type: 'Image',
  props: { skin: itemImage },
}
```

参考 GameLX2.scene 的实际结构（每个 MatchingItem 有一个 child Image 节点，props 只有 skin）。

- [ ] **Step 4: 测试导出**

发布或预览：
- 给 MatchingItem 上传图片，导出的 .scene 里 MatchingItem 自己没有 _itemImage 字段
- MatchingItem 下有一个 child Image 节点，skin 是上传的路径
- 没上传图片的 MatchingItem，没有 child Image 节点

- [ ] **Step 5: 提交**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: 导出 MatchingItem 时把 _itemImage 转换为 Image 子节点"
```

---

## Task 11: 添加国际化翻译

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: 添加翻译条目**

在 `src/i18n/translations.ts` 中，找到与"选择题"/"填空题"相邻的位置，添加：

```typescript
'连线题': { 'zh-CN': '连线题', 'en': 'Matching Game' },
```

注意：项目以中文为事实标准，英文条目可有可无，与现有键的处理方式保持一致。

- [ ] **Step 2: 提交**

```bash
git add src/i18n/translations.ts
git commit -m "feat: 添加连线题 i18n 条目"
```

---

## Task 12: 端到端验证

**Files:**
- 不修改文件

- [ ] **Step 1: 启动 dev**

```bash
pnpm dev
```

- [ ] **Step 2: 验证创建**

进入豌豆口才课程，点击"连线题"按钮：
- 画布出现 MatchingGame，元素列表显示 MatchingGame > Box > 6 MatchingItem
- 6 个 MatchingItem name 是 l1/l2/l3/r1/r2/r3
- 默认选中 MatchingGame

- [ ] **Step 3: 验证属性面板**

选中 MatchingGame：
- "连线方向"下拉显示左右/上下/中心点
- "连线模式"下拉显示点击/滑动/可点可滑
- 鼠标悬停"连线模式"显示提示
- "是否单线模式"下拉显示是/否，默认"是"
- "连线皮肤"/"连线错误提示皮肤"可上传

- [ ] **Step 4: 验证 direction 切换**

把 direction 从左右 → 上下 → 中心点 → 左右循环，子项 name 和位置正确变换。

- [ ] **Step 5: 验证 _itemImage 上传**

选中一个 MatchingItem，上传图片：
- MatchingItem 宽高变为图片尺寸
- 画布上显示图片

- [ ] **Step 6: 验证导出**

发布工程，对比导出的 .scene 和参考文件 GameLX2.scene：
- MatchingGame 包含 direction、mode、boxItemsName、single；用户上传过的 lineSkin/wrongLineskin
- MatchingItem 不含 _itemImage；上传过图片的 MatchingItem 有 child Image 节点

- [ ] **Step 7: 提交（如有遗漏修复）**

```bash
git add -A
git commit -m "fix: 连线题端到端调整"
```

如果一切正常，无需此提交。

---

## 自检清单

执行完成后确认：

- [ ] PropertyDef.tooltip 字段在接口中定义且 PropertyPanel 渲染时透传
- [ ] MatchingGame 默认 mode=3, direction=0, single=0
- [ ] MatchingGame 的 boxItemsName 与 MatchBox.name 一致
- [ ] MatchingItem 的 _itemImage 是 file 类型，上传后 width/height 自动调整
- [ ] direction 切换时 6 个子项 name 和 position 正确更新
- [ ] 导出 .scene 中 lineSkin/wrongLineskin 仅在用户上传时出现
- [ ] 导出 .scene 中 wrongLineskin 是小写 s
- [ ] 导出 MatchingItem 自身不带 _itemImage，下面有 child Image 节点
- [ ] 工具栏"豌豆口才"分类下"填空题"后出现"连线题"按钮
- [ ] 所有 commit message 用中文
