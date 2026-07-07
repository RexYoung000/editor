# 口才课选择题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在口才课组件分类下添加"选择题"按钮，一键创建 ChoiceBox + 4个 SelectableObj 选项卡片，支持动态增减选项和自定义皮肤。

**Architecture:** 工具栏"选择题"按钮创建组合元素（ChoiceBox + 4 SelectableObj 子节点），复用现有 ChoiceBox 运行时类。SelectableObj 是新增 elementMeta 条目，带 placeholderImage 和 exportChildren（前景图+背景图），编辑器通过 `_foregroundSkin` 和 `_bgSkin` 属性管理选项皮肤，导出管线将这两个属性转换为子 Image 节点。

**Tech Stack:** React, Zustand (immer), Laya Air, TypeScript

---

### Task 1: 创建占位图资源 + 注册 builtinAssets

**Files:**
- Create: `public/builtin/editor/selectable-obj-placeholder.png`
- Modify: `src/elements/builtinAssets.ts`

- [ ] **Step 1: 生成 SelectableObj 卡片占位图**

使用 Node.js 生成一个 400x300 的灰色卡片占位图（矩形+圆角暗示+内容区域示意）：

```bash
node -e "
const zlib = require('zlib');
const fs = require('fs');
const width = 400, height = 300;
const rawRows = [];
for (let y = 0; y < height; y++) {
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    const offset = 1 + x * 3;
    const inBorder = (x >= 5 && x <= 395 && y >= 5 && y <= 295) && (x === 5 || x === 395 || y === 5 || y === 295);
    const inContent = (x >= 50 && x <= 350 && y >= 50 && y <= 200);
    if (inBorder) { row[offset] = 100; row[offset+1] = 120; row[offset+2] = 140; }
    else if (inContent) { row[offset] = 80; row[offset+1] = 90; row[offset+2] = 100; }
    else { row[offset] = 60; row[offset+1] = 70; row[offset+2] = 80; }
  }
  rawRows.push(row);
}
const rawData = Buffer.concat(rawRows);
const compressed = zlib.deflateSync(rawData);
function crc32(buf) { let crc = 0xFFFFFFFF; const table = new Int32Array(256); for (let i = 0; i < 256; i++) { table[i] = i; for (let j = 0; j < 8; j++) table[i] = (table[i] >>> 1) ^ (table[i] & 1 ? 0xEDB88320 : 0); } for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const typeB = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data]))); return Buffer.concat([len, typeB, data, crcB]); }
const sig = Buffer.from([137,80,78,71,13,10,26,10]);
const ihdrData = Buffer.alloc(13); ihdrData.writeUInt32BE(width, 0); ihdrData.writeUInt32BE(height, 4); ihdrData[8] = 8; ihdrData[9] = 2;
const ihdr = chunk('IHDR', ihdrData); const idat = chunk('IDAT', compressed); const iend = chunk('IEND', Buffer.alloc(0));
fs.writeFileSync('public/builtin/editor/selectable-obj-placeholder.png', Buffer.concat([sig, ihdr, idat, iend]));
console.log('OK');
"
```

- [ ] **Step 2: 在 builtinAssets.ts 注册资源**

在 `BUILTIN_ASSETS` 数组末尾添加：

```ts
  // ─── 口才课选择题：选项卡片占位图 ───
  { id: 'selectableObj.placeholder', src: 'editor/selectable-obj-placeholder.png' },
```

- [ ] **Step 3: Commit**

```bash
git add public/builtin/editor/selectable-obj-placeholder.png src/elements/builtinAssets.ts
git commit -m "feat: 添加口才课选择题选项卡片占位图资源"
```

---

### Task 2: 添加 SelectableObj elementMeta 条目 + i18n

**Files:**
- Modify: `src/elements/elementMeta.ts`
- Modify: `src/elements/elementMetaI18n.ts`
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: 在 elementMeta.ts 添加 SelectableObj 条目**

在 `PageTurnImage` 条目之后、闭合 `}` 之前添加：

```ts
  // ─── 口才课选择题：选项卡片（组合创建，toolbarHidden）───
  SpeechSelectableObj: {
    layaType: 'SelectableObj',
    label: '选项卡片',
    category: 'speechCourse',
    defaultSize: { width: 400, height: 300 },
    placeholderImage: assetSrc('selectableObj.placeholder'),
    toolbarHidden: true,
    runtime: 'com.klzz.ui.custom.SelectableObj',
    defaultProps: {
      isSelected: false,
      filterColor: '#ffff00',
      filterBlur: 6,
      cus1: '',
      cus2: '',
      _foregroundSkin: '',
      _bgSkin: '',
    },
    properties: [
      { key: 'name', label: '选项名称', type: 'text', group: '交互' },
      { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观' },
      { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观' },
      { key: '_foregroundSkin', label: '前景图片', type: 'file', group: '外观' },
      { key: '_bgSkin', label: '背景图片', type: 'file', group: '外观' },
      { key: 'cus1', label: '自定义1', type: 'text', group: '交互' },
      { key: 'cus2', label: '自定义2', type: 'text', group: '交互' },
    ],
  },
```

注意：`_foregroundSkin` 和 `_bgSkin` 以 `_` 开头，是编辑器专用属性，导出时被自动剔除。导出管线通过自定义逻辑将它们转换为子 Image 节点。

- [ ] **Step 2: 在 elementMetaI18n.ts 添加翻译映射**

在 `elementMap` 中添加：

```ts
'选项卡片': 'elementSpeechSelectableObj',
'选择题': 'elementSpeechChoice',
```

在 `propMap` 中添加：

```ts
'选项名称': 'propOptionName',
'前景图片': 'propForegroundSkin',
'背景图片': 'propBgSkin',
'自定义1': 'propCus1',
'自定义2': 'propCus2',
```

- [ ] **Step 3: 在 translations.ts 添加翻译键**

`en` 对象添加：
```ts
elementSpeechSelectableObj: 'Option Card',
elementSpeechChoice: 'Choice Question',
propOptionName: 'Option Name',
propForegroundSkin: 'Foreground Image',
propBgSkin: 'Background Image',
propCus1: 'Custom 1',
propCus2: 'Custom 2',
```

`zh` 对象添加：
```ts
elementSpeechSelectableObj: '选项卡片',
elementSpeechChoice: '选择题',
propOptionName: '选项名称',
propForegroundSkin: '前景图片',
propBgSkin: '背景图片',
propCus1: '自定义1',
propCus2: '自定义2',
```

- [ ] **Step 4: 验证编译**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/elements/elementMeta.ts src/elements/elementMetaI18n.ts src/i18n/translations.ts
git commit -m "feat: 添加口才课选项卡片 SpeechSelectableObj elementMeta 条目和 i18n"
```

---

### Task 3: 工具栏"选择题"按钮组合创建逻辑

**Files:**
- Modify: `src/components/ElementToolbar.tsx`

- [ ] **Step 1: 添加 handleAddChoice 函数**

在 `handleAddPageTurn` 函数之后添加：

```ts
  /** 口才课选择题：创建 ChoiceBox + 4个选项卡片 */
  const handleAddChoice = () => {
    if (frozen) return;
    const choiceBox = createDefaultElement('ChoiceBox');
    choiceBox.width = 900;
    choiceBox.height = 700;
    choiceBox.x = 510;
    choiceBox.y = 190;
    choiceBox.props = { ...choiceBox.props, upperLimit: 1, rightItemNames: '' };

    const optionNames = ['a', 'b', 'c', 'd'];
    const positions = [
      { x: 50, y: 50 }, { x: 470, y: 50 },
      { x: 50, y: 360 }, { x: 470, y: 360 },
    ];
    const options = optionNames.map((name, i) => {
      const opt = createDefaultElement('SpeechSelectableObj');
      opt.name = name;
      opt.x = positions[i].x;
      opt.y = positions[i].y;
      opt.parentId = choiceBox.id;
      return opt;
    });

    const choiceObj = createLayaComponent(choiceBox);
    if (choiceObj) registerObject(choiceBox.id, choiceObj);
    addElement(choiceBox);

    options.forEach(opt => {
      const obj = createLayaComponent(opt);
      if (obj) registerObject(opt.id, obj);
      addElement(opt);
    });

    selectElement(choiceBox.id, false);
  };
```

- [ ] **Step 2: 在工具栏添加"选择题"按钮**

在现有 `{activeTab === 'speechCourse' && ... 翻页组件按钮}` 之后，添加第二个按钮：

```tsx
        {activeTab === 'speechCourse' && (
          <>
            <button onClick={handleAddPageTurn} disabled={frozen} className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${frozen ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'}`}>
              {translateLabel('翻页组件', language)}
            </button>
            <button onClick={handleAddChoice} disabled={frozen} className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${frozen ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'}`}>
              {translateLabel('选择题', language)}
            </button>
          </>
        )}
```

注意：需要把原来单独的翻页组件按钮改成 `<>...</>` 包裹的两个按钮。

- [ ] **Step 3: 验证编译并测试**

```bash
pnpm build
```

启动应用，切换到口才课组件标签页，确认显示"翻页组件"和"选择题"两个按钮，点击"选择题"创建 ChoiceBox + 4 选项卡片。

- [ ] **Step 4: Commit**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "feat: 口才课选择题工具栏组合创建逻辑"
```

---

### Task 4: ChoiceBox 属性面板添加选项管理按钮

**Files:**
- Modify: `src/components/PropertyPanel.tsx`
- Modify: `src/store/editorStore.ts`

- [ ] **Step 1: 在 editorStore 添加选项增减 actions**

在 store 的 action 区域添加：

```ts
      /** 口才课选择题：添加选项 */
      addChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const choiceBox = page.elements.find(e => e.id === choiceBoxId);
            if (!choiceBox) return;
            // 找到已有选项，计算下一个 name
            const existingNames = page.elements
              .filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj')
              .map(e => e.name);
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const nextName = letters.split('').find(l => !existingNames.includes(l)) || 'x';
            // 新选项放在最后一个选项下方
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            const lastOpt = existingOptions[existingOptions.length - 1];
            const newOpt = createDefaultElement('SpeechSelectableObj');
            newOpt.name = nextName;
            newOpt.parentId = choiceBoxId;
            newOpt.x = lastOpt ? lastOpt.x : 50;
            newOpt.y = lastOpt ? lastOpt.y + lastOpt.height + 10 : 50;
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(newOpt);
              return state;
            });
            const obj = createLayaComponent(newOpt);
            if (obj) registerObject(newOpt.id, obj);
          }
        }
      },

      /** 口才课选择题：删除最后一个选项 */
      removeChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            if (existingOptions.length <= 2) return; // 至少保留2个选项
            const lastOpt = existingOptions[existingOptions.length - 1];
            get().deleteElement(lastOpt.id);
          }
        }
      },
```

需要在 editorStore.ts 中确认 `createDefaultElement` 和 `createLayaComponent`、`registerObject` 的 import 是否已存在。`createDefaultElement` 从 elementMeta 导入，`createLayaComponent` 和 `registerObject` 从 layaBridge 导入。如果缺少需添加。

- [ ] **Step 2: 在 PropertyPanel.tsx 添加选项管理按钮**

在 PropertyPanel 中添加 store action 引用：

```ts
  const addChoiceOption = useEditorStore((s) => s.addChoiceOption);
  const removeChoiceOption = useEditorStore((s) => s.removeChoiceOption);
```

在 `{/* 翻页图片：页面管理 */}` 区块之后添加：

```tsx
              {/* 口才课选择题：选项管理 */}
              {single && single.type === 'ChoiceBox' && currentPage?.elements.some(e => e.parentId === single.id && e.type === 'SpeechSelectableObj') && (
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-slate-500 mb-1.5">{t('optionManagement') || '选项管理'}</div>
                  <div className="flex gap-1">
                    <button onClick={() => addChoiceOption(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> {t('addOption') || '添加选项'}
                    </button>
                    <button onClick={() => removeChoiceOption(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
```

确保 `Plus` 和 `Trash2` 已在 PropertyPanel.tsx 的 lucide-react import 中（它们已存在）。

在 translations.ts 添加翻译键：
- `en`: `optionManagement: 'Option Management'`, `addOption: 'Add Option'`
- `zh`: `optionManagement: '选项管理'`, `addOption: '添加选项'`

- [ ] **Step 3: 验证编译**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/store/editorStore.ts src/components/PropertyPanel.tsx src/i18n/translations.ts
git commit -m "feat: ChoiceBox 属性面板选项管理按钮（添加/删除选项）"
```

---

### Task 5: SelectableObj 导出管线 — 前景图和背景图子节点

**Files:**
- Modify: `src/utils/export.ts`

- [ ] **Step 1: 在 elementToLayaNode 中添加 SelectableObj 自定义导出**

在 `elementToLayaNode` 函数中，`SoundButton` 特殊处理之后（大约第 243 行），添加 SelectableObj 的自定义导出逻辑：

```ts
  // SelectableObj：将 _foregroundSkin 和 _bgSkin 转换为子 Image 节点
  if (element.layaType === 'SelectableObj') {
    const mergedProps = { ...(meta?.defaultProps ?? {}), ...(element.props ?? {}) } as Record<string, unknown>;
    const rewritten = rewriteProps(mergedProps, resourceMap);
    const childImages: Record<string, unknown>[] = [];
    // 前景图
    const fgSkin = rewritten._foregroundSkin;
    if (fgSkin && fgSkin !== '') {
      childImages.push({ type: 'Image', props: { skin: fgSkin, left: 0, top: 0, right: 0, bottom: 0 } });
    }
    // 背景图（name="bg"）
    const bgSkin = rewritten._bgSkin;
    if (bgSkin && bgSkin !== '') {
      childImages.push({ type: 'Image', props: { name: 'bg', skin: bgSkin, left: 0, top: 0, right: 0, bottom: 0 } });
    }
    // 移除 _ 前缀属性（已转换为子节点）
    for (const key of Object.keys(props)) {
      if (key.startsWith('_')) delete props[key];
    }
    // 合入子节点
    const existingChildren = allElements.filter(e => e.parentId === element.id);
    if (childImages.length || existingChildren.length) {
      node.child = [
        ...childImages,
        ...existingChildren.map(c => elementToLayaNode(c, allElements, resourceMap)),
      ];
    }
  }
```

注意：`_foregroundSkin` 和 `_bgSkin` 已经在主循环中被 `for (const [key, value] of Object.entries(rewritten))` 处理——`if (key.startsWith('_')) continue;` 会跳过它们。所以它们不会出现在 props 中。我需要在跳过 `_` 前缀之前先提取这两个值，然后转换为子 Image。

实际上，更好的做法是在主合并循环之前提取它们：

找到这段代码（约第 228-235 行）：

```ts
  // 合并 defaultProps + element.props（老数据补齐）
  const merged: Record<string, unknown> = { ...(meta?.defaultProps ?? {}), ...(element.props ?? {}) };
  const rewritten = rewriteProps(merged, resourceMap);
  for (const [key, value] of Object.entries(rewritten)) {
    if (key.startsWith('_')) continue; // 编辑器专用字段不导出
    if (value !== undefined && value !== null && value !== '') {
      props[key] = value;
    }
  }
```

在 `for` 循环之后，添加 SelectableObj 的子节点生成：

```ts
  // SelectableObj：将编辑器专用皮肤属性转换为子 Image 节点
  let selectableObjChildren: Record<string, unknown>[] | null = null;
  if (element.layaType === 'SelectableObj') {
    selectableObjChildren = [];
    const fgSkin = rewritten._foregroundSkin;
    if (typeof fgSkin === 'string' && fgSkin !== '') {
      selectableObjChildren.push({ type: 'Image', props: { skin: fgSkin, left: 0, top: 0, right: 0, bottom: 0 } });
    }
    const bgSkin = rewritten._bgSkin;
    if (typeof bgSkin === 'string' && bgSkin !== '') {
      selectableObjChildren.push({ type: 'Image', props: { name: 'bg', skin: bgSkin, left: 0, top: 0, right: 0, bottom: 0 } });
    }
  }
```

然后在构建子节点列表的地方（约第 259-266 行），修改为：

```ts
  if (fixedChildren.length || children.length || (selectableObjChildren && selectableObjChildren.length)) {
    node.child = [
      ...(selectableObjChildren ?? []),
      ...fixedChildren,
      ...children.map(c => elementToLayaNode(c, allElements, resourceMap)),
    ];
  }
```

- [ ] **Step 2: 在 collectResources 中收集 SelectableObj 的皮肤资源**

在 `collectResources` 函数的 `page.elements.forEach` 内部，翻页图片资源收集之后添加：

```ts
        // 选项卡片：前景图和背景图资源
        if (el.type === 'SpeechSelectableObj') {
          const sProps = el.props as { _foregroundSkin?: string; _bgSkin?: string };
          collectValue(sProps._foregroundSkin);
          collectValue(sProps._bgSkin);
        }
```

- [ ] **Step 3: 验证编译**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/export.ts
git commit -m "feat: SelectableObj 导出管线——前景图和背景图转换为子 Image 节点"
```

---

### Task 6: 整体验证

- [ ] **Step 1: 创建选择题并验证基本功能**

启动应用，切换到口才课组件标签页：
1. 点击"选择题"按钮 → 确认创建 ChoiceBox + 4 个选项卡片
2. 自动选中 ChoiceBox

- [ ] **Step 2: 验证选项管理**

3. 选中 ChoiceBox，属性面板显示"选项管理"
4. 点击"添加选项" → 新增选项 e
5. 点击删除按钮 → 删除最后一个选项

- [ ] **Step 3: 验证选项皮肤**

6. 选中某个选项卡片，属性面板显示前景图片和背景图片字段
7. 上传前景图片 → 确认占位图替换
8. 上传背景图片 → 确认替换

- [ ] **Step 4: 验证导出**

9. 发布预览 → 检查 LessonZK.js 中 SelectableObj 的子节点结构（前景 Image + bg Image）

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: 口才课选择题完整功能——组合创建、选项管理、导出管线"
```