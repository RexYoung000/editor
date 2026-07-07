# NewTextArea 字体库选择与本地字体上传 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 NewTextArea 元素增加字体库选择(三类:派培优/豌豆口才/豌豆益智)与本地 TTF 上传能力,本地字体优先级高于库字体;有文字内容但未选字体的元素阻止发布。

**Architecture:**
- 字体库以代码常量(`fontLibrary.ts`)定义,与 `builtinAssets` / `keyboardPresets` 同构
- 通过 `FontFace API` 懒加载,Promise 缓存
- 字段加在 `NewTextArea.props` 上(`fontLibraryId` / `fontLocalPath`),`Element` 接口不变
- 沿用现有 `bakeTextElements` 烘焙路径,发布包不含 TTF
- 发布前用模态对话框列举所有未选字体的元素,支持一键跳转

**Tech Stack:** TypeScript / React 18 / Zustand / Electron(IPC)/ Canvas 2D / FontFace API

**Convention notes (this codebase, override TDD defaults):**
- 仓库无单元测试框架(CLAUDE.md: "There is no test suite")。本计划用 **类型检查 + dev 模式人工验证** 替代单测;关键步骤会指明验证方法
- 用户明确要求"不要自动 git commit",每个 Task 末尾不写 commit 步骤
- 设计文档在 `docs/superpowers/specs/2026-05-22-newtextarea-font-library-design.md`,如有疑义以本计划为准

---

## Task 1: 字体资源迁移与英文化命名

**Files:**
- Move: `public/res/atlas/share/方正兰亭黑简体.TTF` → `public/builtin/runtime/fonts/FZLanTingHei.TTF`
- Add:  `public/builtin/runtime/fonts/FZKaiti.TTF`(从 `D:\1\方正楷体简体.TTF` 拷贝)

- [ ] **Step 1.1: 创建目标目录**

PowerShell:
```powershell
New-Item -ItemType Directory -Path "d:\aiproject\forge\public\builtin\runtime\fonts" -Force
```

期望输出:目录已创建(或已存在)。

- [ ] **Step 1.2: 移动派培优字体并改名为英文**

```powershell
Move-Item "d:\aiproject\forge\public\res\atlas\share\方正兰亭黑简体.TTF" "d:\aiproject\forge\public\builtin\runtime\fonts\FZLanTingHei.TTF"
```

- [ ] **Step 1.3: 拷入豌豆口才字体**

```powershell
Copy-Item "D:\1\方正楷体简体.TTF" "d:\aiproject\forge\public\builtin\runtime\fonts\FZKaiti.TTF"
```

- [ ] **Step 1.4: 验证两个 TTF 都到位**

```powershell
Get-ChildItem "d:\aiproject\forge\public\builtin\runtime\fonts"
```

期望输出:列表包含 `FZLanTingHei.TTF` 和 `FZKaiti.TTF` 两个文件,文件大小非 0。

- [ ] **Step 1.5: 确认旧目录已无该 TTF**

```powershell
Test-Path "d:\aiproject\forge\public\res\atlas\share\方正兰亭黑简体.TTF"
```

期望输出:`False`。

---

## Task 2: 新增字体库元数据模块

**Files:**
- Create: `src/elements/fontLibrary.ts`

- [ ] **Step 2.1: 创建 fontLibrary.ts 文件**

写入完整内容到 [src/elements/fontLibrary.ts](src/elements/fontLibrary.ts):

```ts
// 字体库元数据。新增字体只改这一份配置,UI 下拉、loader、烘焙都从这里读取。
// fontFace 字段用 ASCII,与 TTF 文件名严格一致;同 family 重名时按 <name>-2.TTF 命名。

export type FontCategory = '派培优' | '豌豆口才' | '豌豆益智';

export interface FontEntry {
  id: string;          // 全局唯一 id,如 'paipeiyou.lantinghei'
  category: FontCategory;
  label: string;       // 下拉里显示给用户的中文名,如 '方正兰亭黑简体'
  url: string;         // 编辑器加载 TTF 的 public 相对路径
  fontFace: string;    // FontFace family name(注册到 document.fonts),必须 ASCII
}

export const FONT_LIBRARY: FontEntry[] = [
  {
    id: 'paipeiyou.lantinghei',
    category: '派培优',
    label: '方正兰亭黑简体',
    url: '/builtin/runtime/fonts/FZLanTingHei.TTF',
    fontFace: 'FZLanTingHei',
  },
  {
    id: 'koucai.kaiti',
    category: '豌豆口才',
    label: '方正楷体简体',
    url: '/builtin/runtime/fonts/FZKaiti.TTF',
    fontFace: 'FZKaiti',
  },
];

// 类别顺序(下拉 optgroup 显示顺序);'豌豆益智' 暂无字体,显示但 disabled
export const FONT_CATEGORIES: FontCategory[] = ['派培优', '豌豆口才', '豌豆益智'];

export function lookupFont(id: string): FontEntry | undefined {
  return FONT_LIBRARY.find((f) => f.id === id);
}

/** 默认兜底字体 id(派培优兰亭黑) */
export const DEFAULT_FONT_ID = 'paipeiyou.lantinghei';
```

- [ ] **Step 2.2: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0,无新增错误。

---

## Task 3: 字体加载器(FontFace API + Promise 缓存)

**Files:**
- Create: `src/utils/fontLoader.ts`

- [ ] **Step 3.1: 创建 fontLoader.ts**

写入到 [src/utils/fontLoader.ts](src/utils/fontLoader.ts):

```ts
// 编辑器侧字体加载,所有 TTF 入口统一从这里走。
// - 库字体: 按 fontEntry.url 加载 TTF,fontFace 名直接用 entry.fontFace
// - 本地字体: 通过 Electron IPC 读 <courseDir>/<relPath> 转 dataUrl,fontFace 名 = 'LocalFont_' + md5前8位
// - resolveElementFont: 元素侧统一入口,优先本地→库→DEFAULT,失败兜底 FZLanTingHei

import { lookupFont, DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { readFileAsDataUrl } from './electronFs';

const _libCache = new Map<string, Promise<string | null>>();   // libraryId → fontFace name(或 null)
const _localCache = new Map<string, Promise<string | null>>(); // 'courseId|relPath' → fontFace name

/** 加载库字体;成功返回注册后的 fontFace name,失败返回 null。重复调用零成本(Promise 缓存)。 */
export function loadLibraryFont(id: string): Promise<string | null> {
  if (!id) return Promise.resolve(null);
  const cached = _libCache.get(id);
  if (cached) return cached;
  const p = (async () => {
    const entry = lookupFont(id);
    if (!entry) return null;
    try {
      const ff = new FontFace(entry.fontFace, `url(${entry.url})`);
      await ff.load();
      document.fonts.add(ff);
      return entry.fontFace;
    } catch (e) {
      console.warn('[fontLoader] loadLibraryFont failed:', id, e);
      return null;
    }
  })();
  _libCache.set(id, p);
  return p;
}

/** 加载本地字体(<courseDir>/<relPath>);成功返回 'LocalFont_<md5前8位>',失败返回 null。 */
export function loadLocalFont(courseId: string, relPath: string): Promise<string | null> {
  if (!courseId || !relPath) return Promise.resolve(null);
  const key = `${courseId}|${relPath}`;
  const cached = _localCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    try {
      const dataUrl = await readFileAsDataUrl(courseId, relPath);
      if (!dataUrl) return null;
      // relPath 形如 'images/fonts/<md5>.ttf',md5 即文件 stem
      const md5 = relPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
      if (!md5) return null;
      const fontFace = `LocalFont_${md5.slice(0, 8)}`;
      const ff = new FontFace(fontFace, `url(${dataUrl})`);
      await ff.load();
      document.fonts.add(ff);
      return fontFace;
    } catch (e) {
      console.warn('[fontLoader] loadLocalFont failed:', courseId, relPath, e);
      return null;
    }
  })();
  _localCache.set(key, p);
  return p;
}

/** 解析元素应使用的 fontFace name;优先本地,其次库,失败兜底 DEFAULT_FONT_ID 的 fontFace。 */
export async function resolveElementFont(
  courseId: string,
  fontLocalPath: string,
  fontLibraryId: string,
): Promise<string> {
  if (fontLocalPath) {
    const f = await loadLocalFont(courseId, fontLocalPath);
    if (f) return f;
  }
  if (fontLibraryId) {
    const f = await loadLibraryFont(fontLibraryId);
    if (f) return f;
  }
  // 兜底:加载并返回 DEFAULT 字体的 fontFace name(始终是 'FZLanTingHei')
  const fallback = await loadLibraryFont(DEFAULT_FONT_ID);
  return fallback ?? 'FZLanTingHei';
}
```

- [ ] **Step 3.2: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

---

## Task 4: 替换三处旧 TTF 硬编码引用,统一走 fontLoader

**Files:**
- Modify: [src/utils/laya/core.ts](src/utils/laya/core.ts) 行 190-196(硬编码 `new FontFace(...)` 块)
- Modify: [src/utils/textToImage.ts](src/utils/textToImage.ts) 整体重构
- Modify: [src/utils/fontGenerator.ts](src/utils/fontGenerator.ts) 移除内部 FontFace 注册

- [ ] **Step 4.1: 改造 src/utils/laya/core.ts**

在 [src/utils/laya/core.ts](src/utils/laya/core.ts) 文件顶部 import 区(约行 1-10)添加:

```ts
import { loadLibraryFont } from '../fontLoader';
import { DEFAULT_FONT_ID } from '../../elements/fontLibrary';
```

把 [src/utils/laya/core.ts:190-196](src/utils/laya/core.ts#L190-L196) 这段:

```ts
    const fontFace = new FontFace('FZLanTingHei', 'url(res/atlas/share/方正兰亭黑简体.TTF)');
    fontFace.load().then(() => {
      document.fonts.add(fontFace);
      console.log('[laya-bridge] FZLanTingHei font loaded');
    }).catch((e) => {
      console.warn('[laya-bridge] FZLanTingHei font load failed:', e);
    });
```

替换为:

```ts
    loadLibraryFont(DEFAULT_FONT_ID).then((name) => {
      if (name) console.log('[laya-bridge] default font loaded:', name);
    }).catch((e) => {
      console.warn('[laya-bridge] default font load failed:', e);
    });
```

- [ ] **Step 4.2: 重构 src/utils/textToImage.ts**

把 [src/utils/textToImage.ts](src/utils/textToImage.ts) **整体替换**为:

```ts
/**
 * 文字 → PNG 图像渲染。
 * 用 Canvas 2D API 把一段文字按 NewTextArea 的视觉属性烘焙成位图。
 * 字体由 fontLoader 统一管理,优先级:本地字体 → 库字体 → DEFAULT(派培优兰亭黑)。
 */

import { resolveElementFont } from './fontLoader';
import { DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { loadLibraryFont } from './fontLoader';

export interface RenderTextProps {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wordWrap?: boolean;
  leading?: number;
  fontLibraryId?: string;
  fontLocalPath?: string;
}

/**
 * 把文本渲染成 PNG data URL。
 * @param text       文本内容(可含 \n)
 * @param width      元素宽(1× 设计稿尺寸)
 * @param height     元素高
 * @param props      视觉属性 + 字体设置
 * @param scale      渲染倍率,默认 2
 * @param courseId   解析本地字体需要;为空则走库字体或兜底
 */
export async function renderTextToImage(
  text: string,
  width: number,
  height: number,
  props: RenderTextProps = {},
  scale = 2,
  courseId?: string,
): Promise<string> {
  let fontFace: string;
  if (courseId) {
    fontFace = await resolveElementFont(courseId, props.fontLocalPath ?? '', props.fontLibraryId ?? '');
  } else {
    fontFace = (await loadLibraryFont(DEFAULT_FONT_ID)) ?? 'FZLanTingHei';
  }

  const fontSize = props.fontSize ?? 20;
  const color = props.color ?? '#333333';
  const align = props.align ?? 'left';
  const valign = props.valign ?? 'top';
  const wordWrap = props.wordWrap !== false;
  const leading = props.leading ?? 0;
  const lineHeight = fontSize + leading;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px "${fontFace}"`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    if (!wordWrap || raw.length === 0) { lines.push(raw); continue; }
    let cur = '';
    for (const ch of raw) {
      const w = ctx.measureText(cur + ch).width;
      if (w > width && cur.length > 0) { lines.push(cur); cur = ch; }
      else { cur = cur + ch; }
    }
    lines.push(cur);
  }

  const totalHeight = lines.length * lineHeight;
  let startY: number;
  if (valign === 'middle') startY = (height - totalHeight) / 2;
  else if (valign === 'bottom') startY = height - totalHeight;
  else startY = 0;

  let drawX: number;
  if (align === 'center') { ctx.textAlign = 'center'; drawX = width / 2; }
  else if (align === 'right') { ctx.textAlign = 'right'; drawX = width; }
  else { ctx.textAlign = 'left'; drawX = 0; }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], drawX, startY + i * lineHeight);
  }

  return canvas.toDataURL('image/png');
}
```

- [ ] **Step 4.3: 改造 src/utils/fontGenerator.ts**

修改 [src/utils/fontGenerator.ts:22-56](src/utils/fontGenerator.ts#L22-L56) 区域。

(a) 移除原顶部:

```ts
const DEFAULT_FONT_PATH = '/res/atlas/share/方正兰亭黑简体.TTF';
```

替换为(在文件顶部 imports 之后):

```ts
import { loadLibraryFont } from './fontLoader';
import { lookupFont, DEFAULT_FONT_ID } from '../elements/fontLibrary';
```

(b) `generateBitmapFont` 函数签名 + options 类型扩展。把:

```ts
export async function generateBitmapFont(
  chars: string,
  options?: {
    fontSize?: number;
    fontPath?: string;
    lineHeight?: number;
    padding?: number;
    textureWidth?: number;
  },
): Promise<BitmapFontResult> {
  const fontSize = options?.fontSize ?? 50;
  const fontPath = options?.fontPath ?? DEFAULT_FONT_PATH;
  const lineHeight = options?.lineHeight ?? fontSize;
  const padding = options?.padding ?? 2;
  const textureWidth = options?.textureWidth ?? 256;
```

替换为:

```ts
export async function generateBitmapFont(
  chars: string,
  options?: {
    fontSize?: number;
    fontId?: string;
    lineHeight?: number;
    padding?: number;
    textureWidth?: number;
  },
): Promise<BitmapFontResult> {
  const fontSize = options?.fontSize ?? 50;
  const fontId = options?.fontId ?? DEFAULT_FONT_ID;
  const lineHeight = options?.lineHeight ?? fontSize;
  const padding = options?.padding ?? 2;
  const textureWidth = options?.textureWidth ?? 256;

  const entry = lookupFont(fontId);
  if (!entry) throw new Error(`generateBitmapFont: 字体 id 不存在 ${fontId}`);
```

(c) 删除原本第 53-56 行的内联 FontFace 加载代码:

```ts
  // 加载字体为 FontFace
  const fontFace = new FontFace('FZLanTingHei', `url(${fontPath})`);
  await fontFace.load();
  document.fonts.add(fontFace);
```

替换为:

```ts
  // 通过 fontLoader 统一加载,避免重复注册同名 FontFace
  const fontFace = await loadLibraryFont(fontId);
  if (!fontFace) throw new Error(`generateBitmapFont: 字体加载失败 ${fontId}`);
```

(d) 把所有 `'FZLanTingHei'` 字面量(measureCtx.font / ctx.font / buildFntXml fontFace 参数等)替换为 `entry.fontFace` 或 `fontFace`(由 loadLibraryFont 返回)。具体行:

- 第 63 行附近 `measureCtx.font = \`${fontSize}px FZLanTingHei\`;` → `measureCtx.font = \`${fontSize}px "${fontFace}"\`;`
- 第 121 行附近 `ctx.font = \`${fontSize}px FZLanTingHei\`;` → `ctx.font = \`${fontSize}px "${fontFace}"\`;`
- 第 132 行附近 `fontFace: 'FZLanTingHei',` → `fontFace: entry.fontFace,`(在 buildFntXml 的 params 对象里)

- [ ] **Step 4.4: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0,无新增错误。

- [ ] **Step 4.5: dev 模式人工验证**

```powershell
pnpm dev
```

打开任一已有课件,画布上 NewTextArea 用 FZLanTingHei 兜底渲染应正常(本步骤还未启用新字段,只验证 TTF 路径迁移没有破坏现有渲染)。`F12` 控制台不应出现 `404` 加载 `方正兰亭黑简体.TTF` 的错误,也不应出现 `FZLanTingHei font load failed`。

---

## Task 5: NewTextArea 元素元数据扩展(新增 fontLibraryId / fontLocalPath)

**Files:**
- Modify: [src/elements/elementMeta.ts:219-236](src/elements/elementMeta.ts#L219-L236)(NewTextArea 定义)
- Modify: [src/elements/elementMeta.ts:415-428](src/elements/elementMeta.ts#L415-L428)(`createDefaultElement` 注入"上次选择"记忆)

- [ ] **Step 5.1: 修改 NewTextArea defaultProps 与 properties**

把 [src/elements/elementMeta.ts:219-236](src/elements/elementMeta.ts#L219-L236) 整段:

```ts
  NewTextArea: {
    layaType: 'TextArea',
    label: '文本输入',
    category: 'newComponents',
    defaultSize: { width: 1458, height: 137 },
  defaultPosition: { x: 262, y: 108 },
    defaultProps: { text: '文本编辑', fontSize: 38, color: '#0d0d0d', leading: 24, wordWrap: true, align: 'left', valign: 'top', mouseEnabled: false, font: 'FZLanTingHei' },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'text', label: '文本', type: 'textarea', group: '文本' },
      { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
      { key: 'color', label: '颜色', type: 'color', group: '文本' },
      { key: 'align', label: '水平对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }], group: '文本' },
      { key: 'valign', label: '垂直对齐', type: 'select', options: [{ label: '顶部', value: 'top' }, { label: '居中', value: 'middle' }, { label: '底部', value: 'bottom' }], group: '文本' },
      { key: 'wordWrap', label: '自动换行', type: 'boolean', group: '文本' },
      { key: 'leading', label: '行间距', type: 'number', min: 0, group: '文本' },
    ],
  },
```

替换为:

```ts
  NewTextArea: {
    layaType: 'TextArea',
    label: '文本输入',
    category: 'newComponents',
    defaultSize: { width: 1458, height: 137 },
    defaultPosition: { x: 262, y: 108 },
    defaultProps: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: '',     // 库字体 id(FONT_LIBRARY.id),空 = 未选
      fontLocalPath: '',     // 本地 TTF 相对路径('images/fonts/<md5>.ttf'),空 = 未上传
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'text', label: '文本', type: 'textarea', group: '文本' },
      { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
      { key: 'color', label: '颜色', type: 'color', group: '文本' },
      { key: 'fontLibraryId', label: '字体', type: 'fontLibrary', group: '文本' },
      { key: 'fontLocalPath', label: '本地字体', type: 'fontLocal', group: '文本' },
      { key: 'align', label: '水平对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }], group: '文本' },
      { key: 'valign', label: '垂直对齐', type: 'select', options: [{ label: '顶部', value: 'top' }, { label: '居中', value: 'middle' }, { label: '底部', value: 'bottom' }], group: '文本' },
      { key: 'wordWrap', label: '自动换行', type: 'boolean', group: '文本' },
      { key: 'leading', label: '行间距', type: 'number', min: 0, group: '文本' },
    ],
  },
```

要点:
- `font: 'FZLanTingHei'` **删除**(烘焙路径不读取此字段,Laya Label 编辑模式下我们会在 applyKlProps 里手动 set)
- 新增 `fontLibraryId` / `fontLocalPath` 两个空字符串
- properties 数组里在 `color` 后插入两条:`fontLibrary` 和 `fontLocal` 类型(下一 Task 会注册渲染器)

- [ ] **Step 5.2: 在 createDefaultElement 注入"上次选择"字体**

打开 [src/elements/elementMeta.ts:415-428](src/elements/elementMeta.ts#L415-L428):

```ts
export function createDefaultElement(type: string): Element {
  const meta = elementMeta[type];
  if (!meta) console.warn('[elementMeta] Unknown type:', type);
  _typeCounters[type] = (_typeCounters[type] ?? 0) + 1;
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    layaType: meta?.layaType ?? 'Box',
    name: `${type}_${_typeCounters[type]}`,
    x: meta?.defaultPosition?.x ?? 100, y: meta?.defaultPosition?.y ?? 100,
    ...(meta?.defaultSize ?? { width: 100, height: 100 }),
    opacity: 1, rotation: 0, actions: [],
    props: { ...(meta?.defaultProps ?? {}), ...(meta?.varFromName ? { var: `${type}_${_typeCounters[type]}` } : {}) },
  } as Element;
}
```

替换为:

```ts
export function createDefaultElement(type: string): Element {
  const meta = elementMeta[type];
  if (!meta) console.warn('[elementMeta] Unknown type:', type);
  _typeCounters[type] = (_typeCounters[type] ?? 0) + 1;
  // NewTextArea 新建时,从 localStorage 读"上次选过的字体" 注入 fontLibraryId
  const extraProps: Record<string, unknown> = {};
  if (type === 'NewTextArea') {
    try {
      const last = localStorage.getItem('forge_lastFontLibraryId');
      if (last) extraProps.fontLibraryId = last;
    } catch { /* localStorage 失败时不干预 */ }
  }
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    layaType: meta?.layaType ?? 'Box',
    name: `${type}_${_typeCounters[type]}`,
    x: meta?.defaultPosition?.x ?? 100, y: meta?.defaultPosition?.y ?? 100,
    ...(meta?.defaultSize ?? { width: 100, height: 100 }),
    opacity: 1, rotation: 0, actions: [],
    props: {
      ...(meta?.defaultProps ?? {}),
      ...extraProps,
      ...(meta?.varFromName ? { var: `${type}_${_typeCounters[type]}` } : {}),
    },
  } as Element;
}
```

- [ ] **Step 5.3: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。注意:此时 `properties` 引用了 `type: 'fontLibrary' | 'fontLocal'` 这两个字面量;若 `PropertyDef.type` 是有限并集类型,类型检查会报错。Task 6 第一步会扩展该类型。**若 Step 5.3 报错提示 `'fontLibrary'/'fontLocal' is not assignable to type ...`,继续做 Task 6 Step 6.1 后再回来重跑此命令即可。**

---

## Task 6: PropertyDef 类型扩展 + IPC saveFontToCourse

**Files:**
- Modify: [src/elements/elementMeta.ts](src/elements/elementMeta.ts)(PropertyDef.type 联合类型扩展)
- Modify: [electron/main.cjs](electron/main.cjs)(新增 `save-font-to-course` handler)
- Modify: [electron/preload.cjs](electron/preload.cjs)(暴露 `saveFontToCourse`)
- Modify: [src/types/electron.d.ts](src/types/electron.d.ts)(类型声明)

- [ ] **Step 6.1: 扩展 PropertyDef.type 联合类型**

打开 [src/elements/elementMeta.ts](src/elements/elementMeta.ts) 顶部 `PropertyDef` 定义。先用搜索定位:

```powershell
pnpm exec grep -n "type:" src/elements/elementMeta.ts | Select-Object -First 5
```

找到形如 `type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder';` 的 `type:` 字段定义,在末尾增加 `| 'fontLibrary' | 'fontLocal'`。

例如(若原文为):

```ts
  type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder';
```

替换为:

```ts
  type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder' | 'fontLibrary' | 'fontLocal';
```

(确切内容以仓库实际为准;若 `PropertyDef` 已经用 `string` 宽类型则跳过此步。)

- [ ] **Step 6.2: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:Task 5 引入的字面量错误消除。`FieldRenderer` 的 `switch (field.type)` 会因新 case 没覆盖到而走 `default: return null`,这是预期行为(下个 Task 加渲染器)。

- [ ] **Step 6.3: 新增 IPC `save-font-to-course` handler**

打开 [electron/main.cjs](electron/main.cjs),在 `ipcMain.handle('save-image-to-course', ...)`(行 257)代码块结束后追加:

```js
ipcMain.handle('save-font-to-course', (_event, courseDir, _fileName, base64Data, ext) => {
  try {
    const targetDir = path.join(courseDir, 'images', 'fonts');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const crypto = require('crypto');
    const buf = Buffer.from(base64Data, 'base64');
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    const cleanExt = String(ext || 'ttf').replace(/^\./, '').toLowerCase();
    const fileName = `${md5}.${cleanExt}`;
    const destPath = path.join(targetDir, fileName);

    if (!fs.existsSync(destPath)) fs.writeFileSync(destPath, buf);
    return `images/fonts/${fileName}`;
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
```

参数 `_fileName` 留空形参与 `save-image-to-course` 对齐(我们用 md5 命名,不用原始文件名)。

- [ ] **Step 6.4: 在 preload.cjs 暴露 saveFontToCourse**

打开 [electron/preload.cjs:14](electron/preload.cjs#L14) 附近,找到 `saveImageToCourse: (...) => ipcRenderer.invoke('save-image-to-course', ...)` 这一行,**在它之后**增加:

```js
  saveFontToCourse: (courseDir, fileName, base64Data, ext) => ipcRenderer.invoke('save-font-to-course', courseDir, fileName, base64Data, ext),
```

注意逗号格式与同文件其他 IPC entry 保持一致。

- [ ] **Step 6.5: 在 src/types/electron.d.ts 增加类型签名**

打开 [src/types/electron.d.ts](src/types/electron.d.ts),找到 `saveImageToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;` 那一行,**紧接其后**追加同样形态的:

```ts
saveFontToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
```

- [ ] **Step 6.6: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

- [ ] **Step 6.7: cleanupUnreferencedImages 加入 fonts 子目录**

打开 [electron/main.cjs:345-372](electron/main.cjs#L345-L372)。找到:

```js
  const dirsToClean = ['images', 'images/animation', 'images/sound'];
```

替换为:

```js
  const dirsToClean = ['images', 'images/animation', 'images/sound', 'images/fonts'];
```

之后该 handler 的 `if (file.startsWith('.')) continue;` 与目录跳过逻辑不变 — 字体文件用 md5 命名,不是 `.` 开头,会被正常按 `referencedPaths` 比对。

- [ ] **Step 6.8: collectImageReferences 自动覆盖 fontLocalPath**

阅读 [src/utils/electronFs.ts:162-187](src/utils/electronFs.ts#L162-L187) 现有实现:它遍历 `el.props` 所有字符串值,只要以 `images/` 开头就收集。`fontLocalPath` 形如 `images/fonts/<md5>.ttf`,**已经天然命中**,无需改动。

只验证不修改:

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

---

## Task 7: FieldRenderer 新增 fontLibrary / fontLocal 渲染器

**Files:**
- Modify: [src/components/FieldRenderer.tsx](src/components/FieldRenderer.tsx)

- [ ] **Step 7.1: 在文件顶部添加 import**

在 [src/components/FieldRenderer.tsx:1-11](src/components/FieldRenderer.tsx#L1-L11) 现有 import 区追加:

```ts
import { FONT_LIBRARY, FONT_CATEGORIES, lookupFont } from '../elements/fontLibrary';
import { loadLocalFont } from '../utils/fontLoader';
```

- [ ] **Step 7.2: 在 FieldRenderer switch 中增加两个 case**

打开 [src/components/FieldRenderer.tsx:486-490](src/components/FieldRenderer.tsx#L486-L490) 区域(`case 'spineFolder' ... default: return null;`),在 `default:` 之前插入两个新 case:

```ts
    case 'fontLibrary': {
      const currentId = isMulti ? '' : ((val as string) ?? '');
      const entry = currentId ? lookupFont(currentId) : undefined;
      const displayLabel = entry ? `${entry.category} / ${entry.label}` : '';
      const isUnselected = !currentId && !isMulti;
      return (
        <Row label={field.label}>
          <select
            className={`${inputCls} ${isUnselected ? 'border-red-500' : ''}`}
            value={currentId}
            title={isUnselected ? '发布前必须选择字体' : displayLabel}
            onChange={(e) => {
              const newId = e.target.value;
              onChange(field.key, newId);
              if (newId) {
                try { localStorage.setItem('forge_lastFontLibraryId', newId); } catch { /* ignore */ }
              }
            }}
          >
            <option value="">{isMulti ? t('multipleValues') : '-- 未选择字体 --'}</option>
            {FONT_CATEGORIES.map((cat) => {
              const list = FONT_LIBRARY.filter((f) => f.category === cat);
              return (
                <optgroup key={cat} label={cat}>
                  {list.length === 0
                    ? <option value="" disabled>(暂无字体)</option>
                    : list.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </optgroup>
              );
            })}
          </select>
        </Row>
      );
    }

    case 'fontLocal': {
      const currentPath = isMulti ? '' : ((val as string) ?? '');
      const baseName = currentPath ? (currentPath.split('/').pop() ?? currentPath) : '';
      const inputId = `font-upload-${elements[0]?.id ?? 'multi'}`;
      return (
        <Row label={field.label} stacked>
          <div className="flex items-center gap-1 mb-1">
            <input
              className={`${inputCls} flex-1`}
              value={baseName}
              placeholder={isMulti ? t('multipleValues') : '(未使用)'}
              readOnly
            />
            <input
              type="file"
              accept=".ttf,.TTF"
              className="hidden"
              id={inputId}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  const courseId = useEditorStore.getState().currentCourse?.id;
                  if (!courseId) { showToast(t('uploadFailed'), 'error'); return; }
                  const courseDir = getCourseDirPath(courseId);
                  if (!courseDir) { showToast(t('uploadFailed'), 'error'); return; }
                  const arrayBuffer = await file.arrayBuffer();
                  const bytes = new Uint8Array(arrayBuffer);
                  let binary = '';
                  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                  const base64 = btoa(binary);
                  const ext = file.name.split('.').pop() ?? 'ttf';
                  const relPath = await window.electronAPI.saveFontToCourse(courseDir, file.name, base64, ext);
                  onChange(field.key, relPath);
                  // 立即把字体注册到 document.fonts,让画布即时切换
                  await loadLocalFont(courseId, relPath);
                } catch {
                  showToast(t('uploadFailed'), 'error');
                }
              }}
            />
            <button
              onClick={() => document.getElementById(inputId)?.click()}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer">
              {t('upload')}
            </button>
            {currentPath && (
              <button
                onClick={() => onChange(field.key, '')}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-red-900 border border-slate-600 rounded text-slate-400 cursor-pointer">
                {t('clear')}
              </button>
            )}
          </div>
          {currentPath && (
            <div className="text-[10px] text-amber-400">⚠ 优先级高于库字体</div>
          )}
        </Row>
      );
    }

```

注意:`showToast` / `getCourseDirPath` / `useEditorStore` 都已在文件顶部 imports 中,无需额外引入。`t('upload')` / `t('clear')` 在 i18n 中已有,沿用 `FileField` 的同款 key;若 `t('upload')` 不存在,改用字面量 `'上传'` `'清除'` 也可。

- [ ] **Step 7.3: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

- [ ] **Step 7.4: dev 模式人工验证**

```powershell
pnpm dev
```

打开任一课件,选中或新建一个 NewTextArea。属性面板应:
- "字体" 行显示下拉,默认 `-- 未选择字体 --`(红色描边),展开后看到 3 个 optgroup:派培优(方正兰亭黑简体)、豌豆口才(方正楷体简体)、豌豆益智((暂无字体)disabled)
- "本地字体" 行显示空 readonly 输入框 + 上传按钮
- 选定下拉里的库字体后再新建一个 NewTextArea,新元素的下拉应自动选中刚才那一项(localStorage 记忆)

---

## Task 8: 编辑器画布渲染联动 + 双击编辑浮层字体

**Files:**
- Modify: [src/utils/laya/components.ts](src/utils/laya/components.ts)(`applyKlProps` 增加 NewTextArea 字体分支)
- Modify: [src/components/CanvasOverlay.tsx](src/components/CanvasOverlay.tsx)(双击编辑 textarea 应用字体)

- [ ] **Step 8.1: applyKlProps 写入 Label.font(NewTextArea 编辑模式分支)**

打开 [src/utils/laya/components.ts](src/utils/laya/components.ts) 顶部 imports 区,追加:

```ts
import { resolveElementFont } from '../fontLoader';
```

在 `applyKlProps` 函数末尾(行 287-292 通用 props 写入循环之后,但在外层 `}` 之前)插入:

```ts
  // NewTextArea 编辑模式下被替换成 Label,需要把字体 face 写到 comp.font。
  // 字体加载是异步的,先用兜底 'FZLanTingHei' 让画面不空,加载完成后再 set 一次。
  if (!isPreviewMode() && element.type === 'NewTextArea') {
    try { comp.font = 'FZLanTingHei'; } catch { /* ignore */ }
    const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
    if (courseId) {
      const fontLocalPath = (props.fontLocalPath as string | undefined) ?? '';
      const fontLibraryId = (props.fontLibraryId as string | undefined) ?? '';
      resolveElementFont(courseId, fontLocalPath, fontLibraryId)
        .then((name) => { try { comp.font = name; } catch { /* ignore */ } })
        .catch(() => { /* 已被 resolveElementFont 兜底,这里不再处理 */ });
    }
  }
```

放置位置说明:必须在 [src/utils/laya/components.ts:287-292](src/utils/laya/components.ts#L287-L292) 通用 `for (const [key, value] of Object.entries(props))` 循环**之后**,因为该循环里有 `try { comp[key] = value; }` 兜底,但我们的 `font` 字段不在 props 里(已从 defaultProps 移除),不会被那里改写。同时要在函数最后 `}` 之前。

- [ ] **Step 8.2: 双击编辑浮层使用解析后的字体**

打开 [src/components/CanvasOverlay.tsx](src/components/CanvasOverlay.tsx),顶部 imports 追加:

```ts
import { useEffect, useState } from 'react';   // 若已 import 仅追加缺失项
import { resolveElementFont } from '../utils/fontLoader';
import { useEditorStore } from '../store/editorStore';   // 若已 import 跳过
```

在 [src/components/CanvasOverlay.tsx:457-516](src/components/CanvasOverlay.tsx#L457-L516) `inline editing textarea` 块上方(进入 IIFE 之前的合适位置),增加一个 hook 解析字体名:

定位到形如 `{editingElement && (() => {` 的开头(行 458)。把整个 IIFE 替换为带字体 state 的版本。**简化做法**:在 `CanvasOverlay` 函数体顶部,与其他 `useState` 一起声明:

```ts
const [overlayFontFamily, setOverlayFontFamily] = useState<string>('FZLanTingHei');
useEffect(() => {
  if (!editingElement || editingElement.type !== 'NewTextArea') {
    setOverlayFontFamily('FZLanTingHei');
    return;
  }
  const courseId = useEditorStore.getState().currentCourse?.id ?? '';
  if (!courseId) return;
  const p = (editingElement.props ?? {}) as Record<string, unknown>;
  const fontLocalPath = (p.fontLocalPath as string | undefined) ?? '';
  const fontLibraryId = (p.fontLibraryId as string | undefined) ?? '';
  resolveElementFont(courseId, fontLocalPath, fontLibraryId)
    .then(setOverlayFontFamily)
    .catch(() => setOverlayFontFamily('FZLanTingHei'));
}, [editingElement]);
```

把 [src/components/CanvasOverlay.tsx:505](src/components/CanvasOverlay.tsx#L505) 的 textarea 内联样式:

```ts
                fontFamily: 'inherit',
```

替换为:

```ts
                fontFamily: `"${overlayFontFamily}"`,
```

- [ ] **Step 8.3: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

- [ ] **Step 8.4: dev 模式人工验证**

```powershell
pnpm dev
```

- 在画布选中 NewTextArea → 属性面板选 "豌豆口才 / 方正楷体简体" → 画布上文字应在数百毫秒内切换为楷体
- 双击该元素进入行内编辑 → 浮层 textarea 也应是楷体,而不是浏览器默认 sans-serif
- 上传一个本地 TTF → 画布 + 浮层应再次切换为该字体(优先级高于库字体)

---

## Task 9: 烘焙时使用元素字体 + Course 级 publish 校验

**Files:**
- Modify: [src/utils/exportProject.ts:21-48](src/utils/exportProject.ts#L21-L48)(`bakeTextElements`)
- Modify: [src/utils/exportPreviewProject.ts](src/utils/exportPreviewProject.ts)(若有镜像 `bakeTextElements`)
- Create: [src/utils/checkFontReady.ts](src/utils/checkFontReady.ts)

- [ ] **Step 9.1: 改造 exportProject.ts 的 bakeTextElements,传入 courseId**

打开 [src/utils/exportProject.ts:21-48](src/utils/exportProject.ts#L21-L48),把整段函数:

```ts
async function bakeTextElements(course: Course): Promise<Course> {
  const cloned = structuredClone(course) as Course;
  for (const stage of cloned.stages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(text, el.width, el.height, (el.props ?? {}) as RenderTextProps, 2);
        el.type = 'Image';
        el.layaType = 'Image';
        el.props = { skin: dataUrl, mouseEnabled: false };
      }
    }
  }
  for (const stage of (cloned.previewStages ?? [])) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(text, el.width, el.height, (el.props ?? {}) as RenderTextProps, 2);
        el.type = 'Image';
        el.layaType = 'Image';
        el.props = { skin: dataUrl, mouseEnabled: false };
      }
    }
  }
  return cloned;
}
```

替换为:

```ts
async function bakeTextElements(course: Course): Promise<Course> {
  const cloned = structuredClone(course) as Course;
  const allStages = [...cloned.stages, ...(cloned.previewStages ?? [])];
  for (const stage of allStages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(
          text,
          el.width,
          el.height,
          (el.props ?? {}) as RenderTextProps,
          2,
          course.id,
        );
        el.type = 'Image';
        el.layaType = 'Image';
        el.props = { skin: dataUrl, mouseEnabled: false };
      }
    }
  }
  return cloned;
}
```

要点:合并正课/预习两个循环,所有 NewTextArea 走同一份代码;`renderTextToImage` 多传一个 `course.id` 让 fontLoader 能解析本地字体路径。

- [ ] **Step 9.2: 检查 exportPreviewProject.ts 是否有镜像 bakeTextElements**

```powershell
pnpm exec grep -n "bakeTextElements\|renderTextToImage" src/utils/exportPreviewProject.ts
```

如果搜得到 `renderTextToImage(...)` 的调用,把对应位置同步加上第 6 个参数 `course.id`(签名兼容,旧调用传 5 个参数仍可,默认走兜底字体)。如果没有命中(只 import 不用),跳过此步。

- [ ] **Step 9.3: 创建 checkFontReady.ts**

写入到 [src/utils/checkFontReady.ts](src/utils/checkFontReady.ts):

```ts
import type { Course, Stage } from '../types';

export interface FontMissingItem {
  stageKind: 'normal' | 'preview' | 'homework';
  stageId: string;
  stageIndex: number;        // 1-based
  stageName: string;
  pageId: string;
  pageIndex: number;         // 1-based
  pageName: string;
  elementId: string;
  elementName: string;
}

/**
 * 收集所有"有文字内容但未选字体"的 NewTextArea 元素。
 * 拦截规则:
 *   - el.type === 'NewTextArea'
 *   - props.text 去空白后非空(没字内容的不拦)
 *   - props.fontLibraryId 与 props.fontLocalPath 都为空才算未选
 */
export function findMissingFontElements(course: Course): FontMissingItem[] {
  const items: FontMissingItem[] = [];
  const collectFrom = (stages: Stage[], kindFallback: 'normal' | 'preview' | 'homework') => {
    stages.forEach((stage, si) => {
      stage.subPages.forEach((page, pi) => {
        page.elements.forEach((el) => {
          if (el.type !== 'NewTextArea') return;
          const props = el.props as Record<string, unknown> | undefined;
          const text = String(props?.text ?? '').trim();
          if (text === '') return;
          if (props?.fontLibraryId || props?.fontLocalPath) return;
          items.push({
            stageKind: course.kind === 'homework' ? 'homework' : kindFallback,
            stageId: stage.id,
            stageIndex: si + 1,
            stageName: stage.name ?? '',
            pageId: page.id,
            pageIndex: pi + 1,
            pageName: page.name ?? '',
            elementId: el.id,
            elementName: el.name ?? el.id,
          });
        });
      });
    });
  };
  collectFrom(course.stages, 'normal');
  collectFrom(course.previewStages ?? [], 'preview');
  return items;
}

/** stageKind → 显示前缀文案 */
export const STAGE_KIND_LABEL: Record<FontMissingItem['stageKind'], string> = {
  normal: '正课',
  preview: '预习',
  homework: '作业',
};
```

- [ ] **Step 9.4: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

注:`Course` / `Stage` 类型路径需对照 `src/types/index.ts`。如果 `Stage` 不是顶层 export 而叫别的(如 `CourseStage`),换成对应名;`stage.name` / `page.name` 字段如不存在,改为 `(stage as Record<string, unknown>).name as string ?? ''` 容错。

---

## Task 10: FontMissingDialog 模态对话框

**Files:**
- Create: `src/components/FontMissingDialog.tsx`

- [ ] **Step 10.1: 创建组件骨架**

写入文件 `src/components/FontMissingDialog.tsx`:

```tsx
import React from 'react';
import { useEditorStore } from '../store/editorStore';
import type { FontMissingItem } from '../utils/checkFontReady';
import { STAGE_KIND_LABEL } from '../utils/checkFontReady';

interface Props {
  items: FontMissingItem[];
  onClose: () => void;
}

export const FontMissingDialog: React.FC<Props> = ({ items, onClose }) => {
  if (items.length === 0) return null;

  const handleJump = (item: FontMissingItem) => {
    const store = useEditorStore.getState();
    // 切换到对应关卡 + 子页 + 选中元素
    // 注:具体方法名依赖 editorStore.ts 现有 API,实现时如有差异按实际签名落地
    if (typeof (store as unknown as { setCurrentSubPage?: (sid: string, pid: string) => void }).setCurrentSubPage === 'function') {
      (store as unknown as { setCurrentSubPage: (sid: string, pid: string) => void })
        .setCurrentSubPage(item.stageId, item.pageId);
    } else {
      // fallback:分两步
      (store as unknown as { setCurrentStage?: (id: string) => void }).setCurrentStage?.(item.stageId);
      (store as unknown as { setCurrentPage?: (id: string) => void }).setCurrentPage?.(item.pageId);
    }
    (store as unknown as { selectElement?: (id: string) => void }).selectElement?.(item.elementId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[70vh] flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">请先选择字体</h2>
        </div>
        <div className="px-6 py-4 overflow-auto flex-1">
          <p className="mb-3 text-sm text-gray-700">
            以下 {items.length} 个文本组件未选择字体:
          </p>
          <ul className="space-y-2">
            {items.map(item => (
              <li
                key={item.elementId}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
              >
                <span className="text-sm">
                  {STAGE_KIND_LABEL[item.stageKind]} {item.stageIndex}
                  {item.stageName ? `:${item.stageName}` : ''} —
                  第 {item.pageIndex} 页 — {item.elementName}
                </span>
                <button
                  onClick={() => handleJump(item)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  跳转
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">请选择字体后继续发布。</p>
        </div>
        <div className="px-6 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 10.2: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。如有 store 方法名错位,在该步骤 fallback 兜底逻辑里据实修正;以现有 `editorStore.ts` 的真实 API 为准(如 `setCurrentStageId` / `setActiveStage` 等)。

---

## Task 11: Toolbar 接入字体检查

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 11.1: 在 Toolbar 顶部 import 新增**

文件顶部 import 区追加:

```ts
import { findMissingFontElements, type FontMissingItem } from '../utils/checkFontReady';
import { FontMissingDialog } from './FontMissingDialog';
import { useState } from 'react';
```

(`useState` 如已存在则忽略。)

- [ ] **Step 11.2: 在组件函数体内增加状态**

`Toolbar` 函数体顶部(其他 `useState` 旁)增加:

```ts
const [fontMissingItems, setFontMissingItems] = useState<FontMissingItem[]>([]);
```

- [ ] **Step 11.3: 在发布按钮 onClick 处理函数(约 Toolbar.tsx:218-233 的 `exportProject(currentCourse)` 调用前)插入检查**

在 `await exportProject(currentCourse)` 之前(同一个 onClick handler 内)加:

```ts
if (currentCourse) {
  const missing = findMissingFontElements(currentCourse);
  if (missing.length > 0) {
    setFontMissingItems(missing);
    return;
  }
}
```

- [ ] **Step 11.4: 编译/预览按钮处理函数同样插入检查**

定位到 `runCompileBuildAndOpen` / 编译按钮 onClick(约 Toolbar.tsx:245-253),在调用编译之前同样加这段逻辑。两处都要拦截。

- [ ] **Step 11.5: 在 Toolbar 返回的 JSX 末尾(最外层 fragment 内)挂载对话框**

```tsx
<FontMissingDialog
  items={fontMissingItems}
  onClose={() => setFontMissingItems([])}
/>
```

- [ ] **Step 11.6: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

- [ ] **Step 11.7: 手动验证发布拦截**

1. `pnpm dev` 起 vite,Electron 打开课件
2. 新建 NewTextArea,输入文字,不选字体
3. 点"发布工程" → 弹出 FontMissingDialog,列出该元素
4. 点"跳转" → 编辑器自动切到对应关卡/页并选中元素,对话框关闭
5. 选定字体后再次发布 → 不再弹出,正常进入发布流程

---

## Task 12: 画布警示边框

**Files:**
- Modify: `src/components/CanvasOverlay.tsx`

- [ ] **Step 12.1: 在 NewTextArea 渲染分支内追加警示样式**

`CanvasOverlay.tsx` 渲染元素时,对 `el.type === 'NewTextArea'` 的 `<div>` 容器(非编辑态)按需追加边框 className。

定位 NewTextArea 渲染 div 的 className 拼接处,改为:

```tsx
const props = el.props as Record<string, unknown> | undefined;
const fontLibraryId = (props?.fontLibraryId as string) ?? '';
const fontLocalPath = (props?.fontLocalPath as string) ?? '';
const noFont = !fontLibraryId && !fontLocalPath;

// className 拼接增加 noFont 分支
const warnClass = noFont ? ' border-2 border-dashed border-orange-400' : '';
```

把 `warnClass` 拼到该 div 的 className 字符串末尾。

注:CanvasOverlay 的具体渲染结构需对照实际代码;若 NewTextArea 未单独渲染容器(完全交由 Laya 渲染),则在 overlay 层为该元素的 bbox 单独画一个 absolute 定位的覆盖层 div,展示橘黄虚线边框。

- [ ] **Step 12.2: 类型检查通过**

```powershell
pnpm exec tsc -b --noEmit
```

期望:exit 0。

- [ ] **Step 12.3: 手动验证警示**

`pnpm dev` → 编辑器内创建 NewTextArea(未选字体)→ 画布上元素四周显示橘黄色虚线边框。选定字体后边框消失。

---

## 验证清单

实现完成后,逐项过一遍:

- [ ] 1. **资源迁移**:`public/builtin/runtime/fonts/FZLanTingHei.TTF` 和 `FZKaiti.TTF` 存在;`public/res/atlas/share/方正兰亭黑简体.TTF` 已删除
- [ ] 2. **现有功能不退化**:打开任意旧课件,画布上 NewTextArea 用 FZLanTingHei 兜底渲染正常
- [ ] 3. **字体下拉**:属性面板下拉显示三个分组,豌豆益智显示"(暂无字体)"灰色 disabled 项
- [ ] 4. **字体切换**:选定不同字体后画布即时更新渲染(可能 100~200ms 延迟,可接受)
- [ ] 5. **本地字体上传**:上传 TTF 后画布渲染切换;`<courseDir>/images/fonts/<md5>.ttf` 文件存在
- [ ] 6. **优先级**:同时设了 `fontLibraryId` 和 `fontLocalPath`,画布用本地字体
- [ ] 7. **上次选择记忆**:选完字体后再新建 NewTextArea 默认选中该字体;localStorage 中 `forge_lastFontLibraryId` 有值
- [ ] 8. **发布拦截**:有文字未选字体时弹模态框列举所有元素,点[跳转]能定位到对应元素
- [ ] 9. **跳过空文本**:文字为空的 NewTextArea 不进拦截列表
- [ ] 10. **三业态覆盖**:正课、预习、作业各创建一个未选字体的 NewTextArea,模态框正确分类显示
- [ ] 11. **烘焙正确**:发布后的 PNG 像素与编辑器画布一致(同字体、字号、颜色、对齐)
- [ ] 12. **画布警示**:未选字体的 NewTextArea 在画布上有橘黄色虚线边框
- [ ] 13. **导出包零字体文件**:发布后的 `preview-server/lessons/<projName>/` 目录无 TTF
- [ ] 14. **类型检查通过**:`pnpm exec tsc -b --noEmit` 无新增错误

---

## 执行模式选择

Plan complete and saved to `docs/superpowers/plans/2026-05-22-newtextarea-font-library.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

