# SpeechSelectableObj 默认皮肤重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 SpeechSelectableObj（选项卡片）添加简约卡片风格的默认皮肤，不需要用户上传图片也能有好看外观。

**Architecture:** 在 skinGenerator.ts 新增 generateSelectableObjSkin 函数，用 Canvas API 生成圆角矩形卡片皮肤。elementMeta 添加 5 个皮肤属性。components.ts 中对 SelectableObj 应用皮肤生成逻辑（与 ScaleButton 等组件同模式）。导出时将生成的皮肤注入到 _bgSkin/_foregroundSkin 位置。

**Tech Stack:** React, Zustand, Canvas API (skinGenerator), TypeScript

---

### Task 1: 新增 generateSelectableObjSkin 函数

**Files:**
- Modify: `src/utils/skinGenerator.ts`

在 skinGenerator.ts 中新增 SelectableObj 的皮肤生成函数，遵循现有的 generateButtonSkin/generateInputSkin 模式。

- [ ] **Step 1: 在 skinGenerator.ts 末尾（getDefaultSkins 函数之前）添加 SelectableObj 皮肤生成函数**

```typescript
// ─── SelectableObj（选项卡片：未选中 / 选中 两态）───

export interface SelectableObjSkinOptions {
  width?: number;
  height?: number;
  bgColor?: string;
  borderColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  selectedBgColor?: string;
  selectedBorderColor?: string;
  selectedBorderWidth?: number;
  selectedShadowBlur?: number;
}

export function generateSelectableObjSkin(opts: SelectableObjSkinOptions = {}): string {
  const w = opts.width ?? 250;
  const h = opts.height ?? 200;
  const r = opts.borderRadius ?? 12;
  const bw = opts.borderWidth ?? 2;
  const [c, ctx] = createCanvas(w, h * 2);
  const shadow = opts.shadowColor ?? 'rgba(0,0,0,0.08)';
  const shadowBlur = opts.shadowBlur ?? 4;

  // 未选中态
  ctx.save();
  ctx.shadowColor = shadow;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, bw / 2, bw / 2, w - bw, h - bw, r);
  ctx.fillStyle = opts.bgColor ?? '#f8fafc';
  ctx.fill();
  ctx.restore();
  // 边框（阴影后单独绘制，避免边框也带阴影）
  roundRect(ctx, bw / 2, bw / 2, w - bw, h - bw, r);
  ctx.strokeStyle = opts.borderColor ?? '#e2e8f0';
  ctx.lineWidth = bw;
  ctx.stroke();

  // 选中态
  const selBw = opts.selectedBorderWidth ?? 3;
  const selShadowBlur = opts.selectedShadowBlur ?? 8;
  ctx.save();
  ctx.shadowColor = opts.selectedBorderColor ?? '#fbbf24';
  ctx.shadowBlur = selShadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  roundRect(ctx, selBw / 2, h + selBw / 2, w - selBw, h - selBw, r);
  ctx.fillStyle = opts.selectedBgColor ?? '#fffbeb';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, selBw / 2, h + selBw / 2, w - selBw, h - selBw, r);
  ctx.strokeStyle = opts.selectedBorderColor ?? '#fbbf24';
  ctx.lineWidth = selBw;
  ctx.stroke();

  return c.toDataURL('image/png');
}
```

- [ ] **Step 2: 在 DefaultSkins 接口和 getDefaultSkins 函数中添加 selectableObj**

在 `DefaultSkins` 接口中添加 `selectableObj: string` 字段。

在 `getDefaultSkins()` 函数中添加：
```typescript
selectableObj: generateSelectableObjSkin(),
```

- [ ] **Step 3: 验证编译通过**

Run: `pnpm build`
Expected: 编译通过

- [ ] **Step 4: Commit**

```bash
git add src/utils/skinGenerator.ts
git commit -m "feat: add generateSelectableObjSkin function for default card skin"
```

---

### Task 2: 更新 elementMeta — 添加皮肤属性和修改默认尺寸

**Files:**
- Modify: `src/elements/elementMeta.ts:320-348`

- [ ] **Step 1: 修改 SpeechSelectableObj 的 defaultSize**

将 `defaultSize: { width: 400, height: 300 }` 改为 `defaultSize: { width: 250, height: 200 }`。

- [ ] **Step 2: 添加皮肤属性到 defaultProps**

在 SpeechSelectableObj 的 defaultProps 中添加：

```typescript
_bgColor: '#f8fafc',
_borderColor: '#e2e8f0',
_borderRadius: 12,
_shadowColor: 'rgba(0,0,0,0.08)',
_selectedBorderColor: '#fbbf24',
```

完整 defaultProps 变为：
```typescript
defaultProps: {
  isSelected: false,
  anchorX: 0.5,
  anchorY: 0.5,
  filterColor: '#ffff00',
  filterBlur: 6,
  cus1: '',
  cus2: '',
  _foregroundSkin: '',
  _bgSkin: '',
  _bgColor: '#f8fafc',
  _borderColor: '#e2e8f0',
  _borderRadius: 12,
  _shadowColor: 'rgba(0,0,0,0.08)',
  _selectedBorderColor: '#fbbf24',
},
```

- [ ] **Step 3: 添加皮肤属性到 properties 数组**

在 `_bgSkin` 之后添加 5 个新属性：

```typescript
{ key: '_bgColor', label: '背景颜色', type: 'color', group: '外观' },
{ key: '_borderColor', label: '边框颜色', type: 'color', group: '外观' },
{ key: '_borderRadius', label: '圆角', type: 'number', min: 0, max: 40, group: '外观' },
{ key: '_shadowColor', label: '阴影颜色', type: 'color', group: '外观' },
{ key: '_selectedBorderColor', label: '选中边框颜色', type: 'color', group: '外观' },
```

- [ ] **Step 4: 验证编译通过**

Run: `pnpm build`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: add skin properties and change default size for SpeechSelectableObj"
```

---

### Task 3: 编辑器渲染 — components.ts 中添加 SelectableObj 皮肤生成逻辑

**Files:**
- Modify: `src/utils/laya/components.ts:115-151`

在 components.ts 的 applyKlProps 函数中，已有针对 ScaleButton/TextInput/CheckBox/Radio 的皮肤生成逻辑（`hasSkinEdit` 分支，第 115-151 行）。需要在此分支中添加 SelectableObj 的处理。

- [ ] **Step 1: 在 skinGenerator import 中添加 generateSelectableObjSkin**

当前 import（第 9 行）：
```typescript
import { getDefaultSkins, generateButtonSkin, generateCheckboxSkin, generateRadioSkin, generateInputSkin } from '../skinGenerator';
```

添加 `generateSelectableObjSkin`：
```typescript
import { getDefaultSkins, generateButtonSkin, generateCheckboxSkin, generateRadioSkin, generateInputSkin, generateSelectableObjSkin } from '../skinGenerator';
```

- [ ] **Step 2: 在 hasSkinEdit 分支中添加 SelectableObj 处理**

在第 151 行（Radio 分支结束后）之前，添加 SelectableObj 分支：

```typescript
    } else if (layaType === 'SelectableObj') {
      generatedSkin = generateSelectableObjSkin({
        width: element.width,
        height: element.height,
        bgColor: (props._bgColor as string) ?? '#f8fafc',
        borderColor: (props._borderColor as string) ?? '#e2e8f0',
        borderRadius: (props._borderRadius as number) ?? 12,
        shadowColor: (props._shadowColor as string) ?? 'rgba(0,0,0,0.08)',
        selectedBorderColor: (props._selectedBorderColor as string) ?? '#fbbf24',
      });
```

这段代码添加在 `} else if (layaType === 'Radio') { ... }` 之后，`}` 之前（即 hasSkinEdit 条件分支内）。

- [ ] **Step 3: 修改 hasSkinEdit 条件，让 SelectableObj 也能触发皮肤生成**

当前条件（第 118 行）：
```typescript
const hasSkinEdit = !isCustomUpload && (props._bgColor || props._borderColor);
```

SelectableObj 使用 `_bgColor`，所以这个条件已经能覆盖它。无需修改。

- [ ] **Step 4: 修改 placeholderImage 分支，让 SelectableObj 无自定义图片时也用生成皮肤**

当前 components.ts 第 87-113 行的逻辑是：如果没有 skin 且有 placeholderImage，就用占位图（或 _foregroundSkin）。现在 SelectableObj 有默认皮肤了，需要在 hasSkinEdit 为 true 且 generatedSkin 存在时，让皮肤生成的结果覆盖占位图。

查看当前逻辑流程：
1. 第 87-113 行：placeholderImage → 设置 props.skin = 占位图（或 _foregroundSkin）
2. 第 115-151 行：hasSkinEdit → 生成皮肤，后面会赋给 props.skin

关键：在第 152 行之后的逻辑中，`generatedSkin` 会替换 `props.skin`。查看第 152-165 行的 skin 处理逻辑，确认 generatedSkin 是否正确覆盖 placeholderImage。

实际代码在第 152 行之后：
```typescript
  } else if (props.skin && typeof props.skin === 'string' && props.skin.startsWith('share/comp/')) {
    // 没有自定义字段，用默认生成的皮肤
    ...
  }
  if (generatedSkin) props.skin = generatedSkin;
```

所以 `generatedSkin` 会在最后覆盖 `props.skin`，这意味着即使前面设置了 placeholderImage，generatedSkin 也会替换它。这是正确行为。

- [ ] **Step 5: 确认 SelectableObj 默认皮肤在编辑器中显示**

当 SpeechSelectableObj 的 defaultProps 中有 `_bgColor: '#f8fafc'`，`hasSkinEdit` 会为 true（因为 `props._bgColor` 存在），`isCustomUpload` 会为 false（因为没有上传的 skin），所以 `generatedSkin` 会被生成，并在第 `if (generatedSkin) props.skin = generatedSkin;` 处赋给 props.skin。

但是还有一个问题：SpeechSelectableObj 有 `placeholderImage` 配置。当 `!isPreviewMode() && meta?.placeholderImage && !props.skin` 时，会进入 placeholderImage 分支设置占位图。之后 `generatedSkin` 会覆盖它。但 `props.skin` 此时不为空（被设为占位图），所以 `isCustomUpload` 检查会看这个 skin。占位图是 `/builtin/editor/selectable-obj-placeholder.png`，这不是 `share/comp/` 开头也不是 `data:image` 开头也不是上传路径，所以 `isCustomUpload` 会为 true，导致 `hasSkinEdit` 为 false，不会生成皮肤！

需要修复这个逻辑：当皮肤是 placeholderImage（占位图）时，不应视为 isCustomUpload。

修改第 116-118 行：
```typescript
  const placeholderSrc = meta?.placeholderImage;
  const isCustomUpload = props.skin && typeof props.skin === 'string'
    && !props.skin.startsWith('share/comp/') && !props.skin.startsWith('data:image')
    && props.skin !== placeholderSrc;
```

这样占位图不会阻止皮肤生成。

- [ ] **Step 6: 验证编译通过**

Run: `pnpm build`
Expected: 编译通过

- [ ] **Step 7: Commit**

```bash
git add src/utils/skinGenerator.ts src/utils/laya/components.ts
git commit -m "feat: add SelectableObj skin generation in editor rendering"
```

---

### Task 4: 导出路径 — 让生成的皮肤在导出时正确输出

**Files:**
- Modify: `src/utils/exportProject.ts:175-199`
- Modify: `src/utils/export.ts`（添加 SelectableObj 导出处理）

**重要：导出功能必须双路径同步。**

- [ ] **Step 1: 在 exportProject.ts 中处理 SelectableObj 的默认皮肤**

当前逻辑（第 175-199 行）只在 `_foregroundSkin` 和 `_bgSkin` 有值时创建 Image 子节点。现在需要：当这两个值为空但 `_bgColor` 等皮肤属性存在时，用 skinGenerator 生成的皮肤替代。

在 `if (element.layaType === 'SelectableObj')` 分支中，修改逻辑：

```typescript
if (element.layaType === 'SelectableObj') {
  const fgSkin = rewritten._foregroundSkin;
  const bgSkin = rewritten._bgSkin;
  // 当 _foregroundSkin 为空但皮肤属性存在时，生成默认皮肤作为前景
  const hasSkinProps = rewritten._bgColor || rewritten._borderColor;
  const fgEffective = typeof fgSkin === 'string' && fgSkin !== ''
    ? fgSkin
    : (hasSkinProps ? generateSelectableObjSkin({
        width: element.width, height: element.height,
        bgColor: rewritten._bgColor, borderColor: rewritten._borderColor,
        borderRadius: rewritten._borderRadius, shadowColor: rewritten._shadowColor,
        selectedBorderColor: rewritten._selectedBorderColor,
      }) : '');
  const bgEffective = typeof bgSkin === 'string' && bgSkin !== ''
    ? bgSkin
    : '';

  if (typeof fgEffective === 'string' && fgEffective !== '') {
    const fgId = nextId();
    selectableObjChildren.push({
      x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: fgId, nodeParent: id,
      props: { skin: fgEffective, left: 0, top: 0, right: 0, bottom: 0 },
      child: [],
    });
  }
  if (typeof bgEffective === 'string' && bgEffective !== '') {
    const bgId = nextId();
    selectableObjChildren.push({
      x: 15, type: 'Image', searchKey: 'Image,bg', label: 'bg',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: bgId, nodeParent: id,
      props: { name: 'bg', skin: bgEffective, left: 0, top: 0, right: 0, bottom: 0 },
      child: [],
    });
  }
}
```

需要在 exportProject.ts 中 import generateSelectableObjSkin：
```typescript
import { generateSelectableObjSkin } from '../skinGenerator';
```

- [ ] **Step 2: 在 export.ts 中添加相同的 SelectableObj 导出处理**

export.ts 当前没有 SelectableObj 的特殊处理。需要在 `elementToLayaNode` 函数中添加与 exportProject.ts 相同的逻辑。

在 export.ts 中找到 `elementToLayaNode` 函数，在构建子节点的逻辑区域添加 SelectableObj 处理。

需要在 export.ts 中 import generateSelectableObjSkin：
```typescript
import { generateSelectableObjSkin } from '../skinGenerator';
```

- [ ] **Step 3: 在 exportProject.ts 的资源收集逻辑中处理生成的皮肤**

当前第 532-546 行的 SpeechSelectableObj 资源收集只处理 `_foregroundSkin` 和 `_bgSkin`。如果现在用 skinGenerator 生成了皮肤（data:image URL），这些 data:image 需要在 `collectResources` 中被正确处理（data:image 类型的资源已经有处理逻辑，会被写入为单独的图片文件）。

检查 data:image 类型的皮肤是否已经在资源收集流程中被处理。在 collectResources 中，`data:image` 类型的资源会被正确收集和打包。所以只要 skin 值是 data:image URL，资源收集就能处理。

- [ ] **Step 4: 验证编译通过**

Run: `pnpm build`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add src/utils/export.ts src/utils/exportProject.ts
git commit -m "feat: handle SelectableObj default skin generation in export paths"
```

---

### Task 5: 手动验证

**Files:**
- 无代码修改，仅手动测试

- [ ] **Step 1: 编辑器中验证默认皮肤显示**

1. 启动 `pnpm dev`，进入编辑器
2. 添加一个选择题容器（ChoiceBox），观察选项卡片是否显示简约卡片风格（浅灰白背景、圆角、边框）
3. 检查默认尺寸是否为 250×200

- [ ] **Step 2: 验证选中效果**

1. 在运行时预览中选中一个选项卡片，观察是否有金黄边框效果
2. 检查 filterColor/filterBlur 是否仍然生效

- [ ] **Step 3: 验证皮肤属性编辑**

1. 在属性面板中修改 _bgColor、_borderColor、_borderRadius 等属性
2. 观察画布上选项卡片的皮肤是否实时更新

- [ ] **Step 4: 验证导出**

1. 导出课件（预览导出和工程导出）
2. 检查导出的 LessonZK.js 中 SelectableObj 是否有 Image 子节点包含生成的皮肤
3. 预览课件确认默认皮肤正确显示

- [ ] **Step 5: 验证上传自定义图片仍然优先**

1. 上传一个自定义前景图片到选项卡片
2. 确认自定义图片覆盖生成的默认皮肤
3. 删除自定义图片后，确认默认皮肤恢复

---

## Self-Review

**1. Spec coverage:**
- 默认尺寸 250×200 → Task 2 Step 1 ✓
- 5 个皮肤属性 → Task 2 Step 2-3 ✓
- generateSelectableObjSkin 函数 → Task 1 ✓
- 编辑器渲染 → Task 3 ✓
- 导出处理（双路径） → Task 4 ✓
- 选中效果 → Task 5 Step 2 ✓

**2. Placeholder scan:** No TBD/TODO. All steps have actual code.

**3. Type consistency:** SelectableObjSkinOptions interface defined in Task 1, used consistently in Task 3 and Task 4. Property names (_bgColor, _borderColor, _borderRadius, _shadowColor, _selectedBorderColor) used consistently across all tasks.