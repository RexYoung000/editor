# NewTextArea 字体库选择与本地字体上传

> **历史方案：** 本文记录 2026 年 5 月的原始字体库设计，已由 Issue #129
> 的单层字体库与历史迁移方案取代。当前有效规则见
> [字体库与历史兼容](../../font-library.md)；下文仅保留为历史决策记录，
> 不代表现行产品行为。

**日期**: 2026-05-22
**作者**: 设计阶段（brainstorming skill）
**状态**: 设计已确认，待实现

## 背景与目标

forge 编辑器中 `NewTextArea`（文本输入组件）当前硬编码使用单一字体 `FZLanTingHei`（方正兰亭黑简体）。产品按业务线划分了三类字体：

- **派培优**：方正兰亭黑简体（即现有字体）
- **豌豆口才**：方正楷体简体（新增）
- **豌豆益智**：暂无字体（占位类别，未来添加）

本次扩展给每个 NewTextArea 增加：

1. **字体库选择**：先选类别（豌豆口才/豌豆益智/派培优），再选该类别下的字体
2. **本地字体上传**:用户可上传自定义 TTF;若同时存在,本地字体**优先级高于**库字体
3. **首次默认无选**:新装实例默认不选字体;用户首次选过后,新建 NewTextArea 默认选中"上次选择"
4. **发布拦截**:有文字内容(text 非空)但未选字体的 NewTextArea 阻止发布,弹模态框列表展示问题元素并支持一键跳转定位

## 范围

- 三种课件业态全覆盖:正课(`stages`)、预习(`previewStages`)、作业(`stages` with `kind=homework`)
- 不做老课件迁移:本次按"全新做"处理,假设所有 NewTextArea 都从一开始就有字体字段定义
- 不引入运行时字体加载:沿用现有"烘焙成 PNG"路径,发布包不含 TTF 文件,跨设备绝对像素一致

## 整体方案

字体库定义为代码常量(`src/elements/fontLibrary.ts`),与现有 `builtinAssets.ts`、`keyboardPresets.ts` 模式同构。运行时通过 `FontFace API` 按需懒加载,带 Promise 缓存避免重复下载。导出阶段仍走 `bakeTextElements` 把 NewTextArea 渲染成 PNG,只是在 Canvas 渲染前根据元素的字体字段挑对应的 fontFace name 注册字体。

数据模型变化只在 `NewTextArea.props` 上加两个新字段(`fontLibraryId`、`fontLocalPath`),`Element` 接口不变。

## 模块 1:字体库元数据 + 资源放置

### 1.1 新增 `src/elements/fontLibrary.ts`

```ts
export type FontCategory = '派培优' | '豌豆口才' | '豌豆益智';

export interface FontEntry {
  id: string;          // 全局唯一,如 'paipeiyou.lantinghei'
  category: FontCategory;
  label: string;       // 下拉里显示给用户的字体名,如"方正兰亭黑简体"
  url: string;         // public 下相对路径,编辑器加载 TTF
  fontFace: string;    // 注册到 document.fonts 的 family name(必须 ASCII)
}

export const FONT_LIBRARY: FontEntry[] = [
  { id: 'paipeiyou.lantinghei', category: '派培优',
    label: '方正兰亭黑简体',
    url: '/builtin/runtime/fonts/FZLanTingHei.TTF',
    fontFace: 'FZLanTingHei' },
  { id: 'koucai.kaiti', category: '豌豆口才',
    label: '方正楷体简体',
    url: '/builtin/runtime/fonts/FZKaiti.TTF',
    fontFace: 'FZKaiti' },
];

export const FONT_CATEGORIES: FontCategory[] = ['派培优', '豌豆口才', '豌豆益智'];

export function lookupFont(id: string): FontEntry | undefined {
  return FONT_LIBRARY.find(f => f.id === id);
}
```

### 1.2 资源文件放置

统一目录,英文 ASCII 文件名:

```
public/builtin/runtime/fonts/
├── FZLanTingHei.TTF     ← 派培优(原 public/res/atlas/share/方正兰亭黑简体.TTF 移动至此)
└── FZKaiti.TTF          ← 豌豆口才(用户提供的 D:\1\方正楷体简体.TTF 拷至此)
```

**文件命名规则**:用 fontFace family name(英文 ASCII)当文件名。未来同 family 字体冲突时,按 `<FontFace>-2.TTF`、`<FontFace>-3.TTF` 命名(短横杠+数字后缀)。

### 1.3 FontFace 命名约定

- **库字体**:`fontFace` 字段(英文 ASCII,如 `FZLanTingHei` / `FZKaiti`)
- **本地字体**:`LocalFont_<md5前8位>`(避免不同本地字体撞 family name)
- **Canvas 字体设置**:`ctx.font = \`${size}px "${fontFace}"\``(family name 加引号,与变量对齐避免转义问题)

### 1.4 旧 TTF 引用同步迁移

派培优 TTF 移动后,以下三处旧路径必须同步改:

| 文件 | 旧路径 | 改造方式 |
|---|---|---|
| `src/utils/textToImage.ts:8` | `/res/atlas/share/方正兰亭黑简体.TTF` | 删除硬编码,通过 `resolveElementFont(...)` 解析 |
| `src/utils/laya/core.ts:190` | `res/atlas/share/方正兰亭黑简体.TTF` | 改为 `await loadLibraryFont('paipeiyou.lantinghei')` |
| `src/utils/fontGenerator.ts:22` | `/res/atlas/share/方正兰亭黑简体.TTF` | 改为 `await loadLibraryFont('paipeiyou.lantinghei')`,移除内部 FontFace 注册逻辑 |

`public/libs/laya.js` 中的 `TTFLoader` 是 LayaAir 内部机制,不动。

## 模块 2:NewTextArea 元素数据结构

### 2.1 `elementMeta.ts` 调整

`NewTextArea.defaultProps` 新增两个字段、删除旧的 `font` 字段(沿用烘焙路径不需要 font 名进 .scene):

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
    fontLibraryId: '',     // 新增:库字体 id (FONT_LIBRARY.id),空 = 未选
    fontLocalPath: '',     // 新增:本地 TTF 相对路径('images/fonts/<md5>.ttf'),空 = 未上传
    // font 字段移除(原值 'FZLanTingHei',烘焙路径不读取此字段)
  },
  properties: [
    ...COMMON_STATE_PROPS,
    { key: 'text', label: '文本', type: 'textarea', group: '文本' },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
    { key: 'color', label: '颜色', type: 'color', group: '文本' },
    { key: 'fontLibraryId', label: '字体', type: 'fontLibrary', group: '文本' },   // 新增 type
    { key: 'fontLocalPath', label: '本地字体', type: 'fontLocal', group: '文本' }, // 新增 type
    { key: 'align', label: '水平对齐', type: 'select', /* ... */ },
    { key: 'valign', label: '垂直对齐', type: 'select', /* ... */ },
    { key: 'wordWrap', label: '自动换行', type: 'boolean', group: '文本' },
    { key: 'leading', label: '行间距', type: 'number', min: 0, group: '文本' },
  ],
}
```

### 2.2 字体优先级(编辑器渲染 + 导出烘焙都遵循此规则)

```
fontLocalPath 非空 → 使用本地字体
fontLocalPath 为空 + fontLibraryId 非空 → 使用库字体
两者都为空 → 使用 FZLanTingHei(兜底,仅用于编辑器画布占位渲染;发布会被拦截)
```

### 2.3 "上次选择"记忆

- localStorage key:`forge_lastFontLibraryId`
- 写入时机:用户在属性面板选定库字体(`fontLibrary` 渲染器的 onChange)
- 读取时机:`createDefaultElement('NewTextArea')` 创建新实例时,把 key 值填入 `defaultProps.fontLibraryId`
- 初始情况:key 不存在 → `fontLibraryId = ''` → 触发"未选字体"状态
- 仅影响**新建**,不修改已存在元素的字段

### 2.4 字段命名理由

- `fontLibraryId` 比 `fontId` 更清晰(区分库 vs 本地)
- `fontLocalPath` 比 `fontFile` 一眼可见是相对路径

`Element.props` 是开放结构(`Record<string, unknown>`),不需要修改 `Element` 接口。

## 模块 3:属性面板 UI

`FieldRenderer.tsx` 新增两种 property type:`fontLibrary` 和 `fontLocal`。

### 3.1 `fontLibrary` 渲染器(库字体下拉)

#### UI 状态

未选字体时,`<select>` 红色描边(`border-red-500`)+ tooltip 提示"发布前必须选择字体"。

```
字体  ┌──────────────────────────────────┐
      │ -- 未选择字体 --             ▼  │  (红色描边)
      └──────────────────────────────────┘
```

选定后:

```
字体  ┌──────────────────────────────────┐
      │ 豌豆口才 / 方正楷体简体     ▼   │
      └──────────────────────────────────┘
```

#### 下拉内容(HTML 原生 `<optgroup>`)

```html
<select value={fontLibraryId} onChange={...}>
  <option value="">-- 未选择字体 --</option>

  {FONT_CATEGORIES.map(cat => (
    <optgroup label={cat}>
      {FONT_LIBRARY.filter(f => f.category === cat).length === 0
        ? <option disabled>(暂无字体)</option>
        : FONT_LIBRARY
            .filter(f => f.category === cat)
            .map(f => <option value={f.id}>{f.label}</option>)}
    </optgroup>
  ))}
</select>
```

- 空类别(豌豆益智)显示 `<option disabled>(暂无字体)</option>`,告知用户该类别存在但暂无字体
- onChange 时同步写 `localStorage.setItem('forge_lastFontLibraryId', newId)`

### 3.2 `fontLocal` 渲染器(本地字体上传)

#### UI 状态

未上传:

```
本地  ┌────────────────────┐ ┌────┐ ┌────┐
      │ (未使用)            │ │上传 │ │清除 │
      └────────────────────┘ └────┘ └────┘
```

已上传(显示文件名 + 当前优先级提示):

```
本地  ┌────────────────────┐ ┌────┐ ┌────┐
      │ <md5>.ttf  ✓使用中  │ │上传 │ │清除 │
      └────────────────────┘ └────┘ └────┘
      ⚠ 优先级高于库字体
```

#### 上传流程

仿照 `ActionEditor.tsx:281-298` 的音频上传:

```ts
<input type="file" accept=".ttf,.TTF" onChange={async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const courseId = useEditorStore.getState().currentCourse?.id;
  const courseDir = getCourseDirPath(courseId!);
  if (!courseDir) return;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
  const base64 = btoa(binary);
  const ext = file.name.split('.').pop() ?? 'ttf';
  const relPath = await window.electronAPI.saveFontToCourse(courseDir, file.name, base64, ext);
  // relPath 形如 'images/fonts/<md5>.ttf'
  update({ fontLocalPath: relPath });
  await loadLocalFont(courseId!, relPath); // 立即注册让画布更新
}} />
```

#### 清除按钮

`update({ fontLocalPath: '' })`,文件留在 `<courseDir>/images/fonts/` 中。

清理由现有 `cleanupUnreferencedImages` 流程负责(发布前自动清未被引用的资源)——需要扩展该函数让它识别 `images/fonts/` 子目录,在收集"已被引用"的资源时把所有元素的 `fontLocalPath` 加入白名单。

#### 文件名显示

从 `fontLocalPath` 取 basename(如 `images/fonts/abc123.ttf` 显示成 `abc123.ttf`),不存储原始文件名(与 `saveImageToCourse` 处理一致)。

### 3.3 画布视觉警示

未选字体的 NewTextArea(`!fontLibraryId && !fontLocalPath`)在画布上加橘黄色虚线边框(`border-2 border-dashed border-orange-400`),CanvasOverlay 渲染时按选中状态判定逻辑增加分支即可。

仅编辑器侧渲染,不影响导出。

### 3.4 IPC 端实现:`saveFontToCourse`

新增 IPC handler,实现仿照 `saveImageToCourse`:

```ts
// electron/main 进程
ipcMain.handle('save-font-to-course', async (_, courseDir, fileName, base64, ext) => {
  const buf = Buffer.from(base64, 'base64');
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const targetDir = path.join(courseDir, 'images', 'fonts');
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, `${md5}.${ext}`);
  if (!fs.existsSync(target)) fs.writeFileSync(target, buf);
  return `images/fonts/${md5}.${ext}`;
});
```

`src/types/electron.d.ts` 同步添加方法签名:

```ts
saveFontToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
```

## 模块 4:字体加载器与编辑器画布渲染联动

### 4.1 新增 `src/utils/fontLoader.ts`

```ts
import { lookupFont } from '../elements/fontLibrary';
import { readFileAsDataUrl } from './electronFs';

const _libCache = new Map<string, Promise<string | null>>();   // id → fontFace name
const _localCache = new Map<string, Promise<string | null>>(); // 'courseId|relPath' → fontFace name

/** 加载库字体;返回注册后的 fontFace name(失败返回 null) */
export function loadLibraryFont(id: string): Promise<string | null> {
  if (!id) return Promise.resolve(null);
  let p = _libCache.get(id);
  if (p) return p;
  p = (async () => {
    const entry = lookupFont(id);
    if (!entry) return null;
    try {
      const ff = new FontFace(entry.fontFace, `url(${entry.url})`);
      await ff.load();
      document.fonts.add(ff);
      return entry.fontFace;
    } catch { return null; }
  })();
  _libCache.set(id, p);
  return p;
}

/** 加载本地字体;用 md5 短 hash 当 fontFace name */
export function loadLocalFont(courseId: string, relPath: string): Promise<string | null> {
  if (!courseId || !relPath) return Promise.resolve(null);
  const key = `${courseId}|${relPath}`;
  let p = _localCache.get(key);
  if (p) return p;
  p = (async () => {
    try {
      const dataUrl = await readFileAsDataUrl(courseId, relPath);
      if (!dataUrl) return null;
      const md5 = relPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
      const fontFace = `LocalFont_${md5.slice(0, 8)}`;
      const ff = new FontFace(fontFace, `url(${dataUrl})`);
      await ff.load();
      document.fonts.add(ff);
      return fontFace;
    } catch { return null; }
  })();
  _localCache.set(key, p);
  return p;
}

/** 解析元素应使用的 fontFace name;优先本地,其次库,兜底 FZLanTingHei */
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
  await loadLibraryFont('paipeiyou.lantinghei');
  return 'FZLanTingHei';
}
```

### 4.2 编辑器画布渲染联动

NewTextArea 编辑模式下被替换成 `Label` 渲染(`src/utils/laya/components.ts:34`)。`applyKlProps` 在写 props 到 Label 时把 `font` 字段设成解析后的 fontFace name。

**异步加载与同步赋值的桥接**

`applyKlProps` 当前是同步函数。字体加载是异步的。处理方式:

```ts
// applyKlProps 内对 NewTextArea 的分支
if (element.type === 'NewTextArea') {
  comp.font = 'FZLanTingHei'; // 立即兜底,画布不空白
  const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
  if (courseId) {
    resolveElementFont(courseId, props.fontLocalPath as string, props.fontLibraryId as string)
      .then(name => { comp.font = name; });
  }
}
```

与现有 skin 异步加载(`L.loader.load(...)`)模式一致。`fontLoader` 内部是 Promise 缓存,重复调用零成本。

### 4.3 启动期字体加载改造

`src/utils/laya/core.ts:190` 当前是硬编码加载 FZLanTingHei。改为:

```ts
// core.ts preloadAtlas 内
import { loadLibraryFont } from '../fontLoader';
loadLibraryFont('paipeiyou.lantinghei').catch(() => { /* ignore */ });
```

效果:同一 fontFace name 不会被注册两次(浏览器警告),所有字体加载走单一入口。

### 4.4 `fontGenerator.ts` 改造

`src/utils/fontGenerator.ts:54-56` 当前自己 `new FontFace(...)` 注册,与 fontLoader 重复。改为:

```ts
import { loadLibraryFont } from './fontLoader';
import { lookupFont } from '../elements/fontLibrary';

export async function generateBitmapFont(chars: string, options?: {...}) {
  const fontId = options?.fontId ?? 'paipeiyou.lantinghei';
  const fontFace = await loadLibraryFont(fontId);
  if (!fontFace) throw new Error('字体加载失败');
  const entry = lookupFont(fontId)!;
  // ... 后续 measureCtx.font / canvas.font 用 entry.fontFace
}
```

`generateBitmapFont` 增加可选 `fontId` 参数,默认派培优(保持现状)。BMFont 流程未来需要支持其他字体时按这个 id 切换。

### 4.5 双击编辑 HTML 浮层的字体

`src/components/Canvas.tsx:485` 的 NewTextArea 双击进入 HTML `<textarea>` 行内编辑,这个浮层也要用对应字体。

```tsx
// 渲染 textarea overlay 时
const courseId = currentCourse?.id ?? '';
const [overlayFont, setOverlayFont] = useState('FZLanTingHei');
useEffect(() => {
  if (!editingId) return;
  const el = currentPage?.elements.find(e => e.id === editingId);
  if (!el) return;
  resolveElementFont(courseId,
    el.props?.fontLocalPath as string ?? '',
    el.props?.fontLibraryId as string ?? '')
    .then(setOverlayFont);
}, [editingId]);

<textarea style={{ fontFamily: `"${overlayFont}"`, ... }} />
```

## 模块 5:导出烘焙 + 发布拦截

### 5.1 烘焙时使用元素的字体设置

#### `renderTextToImage` 签名扩展

```ts
export interface RenderTextProps {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wordWrap?: boolean;
  leading?: number;
  fontLibraryId?: string;   // 新增
  fontLocalPath?: string;   // 新增
}

export async function renderTextToImage(
  text: string,
  width: number,
  height: number,
  props: RenderTextProps = {},
  scale = 2,
  courseId?: string,        // 新增(解析本地字体需要)
): Promise<string> {
  const fontFace = courseId
    ? await resolveElementFont(courseId, props.fontLocalPath ?? '', props.fontLibraryId ?? '')
    : 'FZLanTingHei';
  ctx.font = `${fontSize}px "${fontFace}"`;
  // ... 其余逻辑不变
}
```

`textToImage.ts` 内部移除 `FONT_PATH` / `FONT_FACE` 常量与 `ensureFontLoaded` 函数(改由 `fontLoader` 统一管理)。

#### `bakeTextElements` 同步调整

`src/utils/exportProject.ts:21` 的烘焙函数:

```ts
async function bakeTextElements(course: Course): Promise<Course> {
  const cloned = structuredClone(course) as Course;
  for (const stage of [...cloned.stages, ...(cloned.previewStages ?? [])]) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(
          text, el.width, el.height,
          (el.props ?? {}) as RenderTextProps,
          2,
          course.id,  // 新增
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

烘焙后元素 props 整体替换为 `{ skin, mouseEnabled }`,`fontLibraryId` / `fontLocalPath` 不会出现在最终的 .scene / LessonZK.js 里。

`exportPreviewProject.ts` 的镜像调用同步保持。

#### 字体加载兜底

`resolveElementFont` 失败时回退 FZLanTingHei,烘焙不中断。理论上前置检查(5.2)会在发布前拦住未选字体的元素,所以这个兜底分支实际很少触发。

### 5.2 新增 `src/utils/checkFontReady.ts`

```ts
import type { Course } from '../types';

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

export function findMissingFontElements(course: Course): FontMissingItem[] {
  const items: FontMissingItem[] = [];
  const collectFrom = (stages, kindFallback: 'normal' | 'preview' | 'homework') => {
    stages.forEach((stage, si) => {
      stage.subPages.forEach((page, pi) => {
        page.elements.forEach(el => {
          if (el.type !== 'NewTextArea') return;
          const props = el.props as Record<string, unknown> | undefined;
          const text = String(props?.text ?? '').trim();
          if (text === '') return;
          if (props?.fontLibraryId || props?.fontLocalPath) return;
          items.push({
            stageKind: course.kind === 'homework' ? 'homework' : kindFallback,
            stageId: stage.id, stageIndex: si + 1, stageName: stage.name,
            pageId: page.id, pageIndex: pi + 1, pageName: page.name ?? '',
            elementId: el.id, elementName: el.name ?? el.id,
          });
        });
      });
    });
  };
  collectFrom(course.stages, 'normal');
  collectFrom(course.previewStages ?? [], 'preview');
  return items;
}
```

筛选条件:
- `el.type === 'NewTextArea'`
- `text.trim() !== ''`(空文本组件不拦)
- `!fontLibraryId && !fontLocalPath`(两个都没设才算未选)

业态前缀(stageKind):
- `course.kind === 'homework'` → 全部标 `homework`
- 否则 `course.stages` → `normal`、`course.previewStages` → `preview`

### 5.3 Toolbar 接入

`src/components/Toolbar.tsx:101` 已有 `checkMediaUploaded`。新增字体检查在它后面:

```ts
const checkFontReady = (): FontMissingItem[] => {
  if (!currentCourse) return [];
  return findMissingFontElements(currentCourse);
};

// 发布按钮 / 编译按钮 onClick:
const fontMissing = checkFontReady();
if (fontMissing.length > 0) {
  setFontMissingItems(fontMissing);  // 触发模态框
  return;
}
```

涉及的入口(全部加这个检查):
- 发布工程按钮(`exportProject` 调用前)
- 编译发布按钮(`runCompileBuildAndOpen` 调用前,正课和预习两条路径)

### 5.4 模态对话框 `src/components/FontMissingDialog.tsx`

```
┌─ 请先选择字体 ──────────────────────────────────┐
│                                                  │
│ 以下 3 个文本组件未选择字体:                    │
│                                                  │
│  • 正课 1-1:第 2 页 — NewTextArea_3   [跳转]   │
│  • 预习 1:第 1 页 — NewTextArea_1     [跳转]   │
│  • 作业 1-2:第 1 页 — NewTextArea_2   [跳转]   │
│                                                  │
│ 请选择字体后继续发布。                           │
│                                                  │
│              [关闭]                              │
└──────────────────────────────────────────────────┘
```

stageKind 前缀文案:

| stageKind | 前缀 |
|---|---|
| `normal` | 正课 |
| `preview` | 预习 |
| `homework` | 作业 |

#### 跳转交互

[跳转]按钮调用 editorStore 现有方法定位:

```ts
const store = useEditorStore.getState();
store.setCurrentStage(item.stageId);  // 切换到对应关卡
store.setCurrentPage(item.pageId);    // 切换到对应页
store.selectElement(item.elementId);  // 选中元素
onClose();                             // 关闭对话框
```

(具体方法名以现有 store API 为准,需在实现阶段对照 editorStore.ts 落地。)

对话框关闭时不清空选中状态,用户被定位到第一个问题元素后接着改即可。

### 5.5 副作用清理清单

| 旧位置 | 新位置 / 操作 |
|---|---|
| `public/res/atlas/share/方正兰亭黑简体.TTF` | 移动到 `public/builtin/runtime/fonts/FZLanTingHei.TTF`,删除原文件 |
| `elementMeta.ts:225` `font: 'FZLanTingHei'` | 删除该字段 |
| `core.ts:190` 硬编码 FontFace 注册 | `await loadLibraryFont('paipeiyou.lantinghei')` |
| `textToImage.ts:8-20` `FONT_PATH` / `FONT_FACE` / `ensureFontLoaded` | 整体删除,改走 `resolveElementFont` |
| `fontGenerator.ts:22 / 54-56 / 63 / 121 / 132` 硬编码 | 改用 `loadLibraryFont(fontId)` 单一入口 |
| `cleanupUnreferencedImages` | 扩展白名单识别 `images/fonts/` 子目录 + 收集所有元素的 `fontLocalPath` |
| `electron/main` IPC | 新增 `save-font-to-course` handler |
| `src/types/electron.d.ts` | 添加 `saveFontToCourse` 方法签名 |

`public/libs/laya.js` 内部 TTFLoader 不动(LayaAir 私有机制,与本次需求无关)。

## 不在本次范围

- 老课件 NewTextArea 字体迁移(本次按"全新做"处理)
- 运行时动态加载 TTF(沿用烘焙路径,发布包不含 TTF)
- 字体预览图(下拉项纯文字标签,如需可在后续迭代)
- 字体使用统计/管理面板(无此需求)
- 字体粗细/斜体属性(NewTextArea 当前不支持,本次不引入)

## 验证清单

完成实现后逐项验证:

1. **资源迁移**:`public/builtin/runtime/fonts/` 下两个 TTF 存在,旧路径已删除
2. **现有功能不退化**:打开任意课件,画布上 NewTextArea 用 FZLanTingHei 兜底渲染正常
3. **字体下拉**:属性面板下拉显示三个分组,豌豆益智显示"(暂无字体)"灰色 disabled 项
4. **字体切换**:选定不同字体后画布即时更新渲染(可能有 100~200ms 延迟,接受)
5. **本地字体上传**:上传 TTF 后画布渲染切换;`<courseDir>/images/fonts/<md5>.ttf` 存在
6. **优先级**:同时设了 `fontLibraryId` 和 `fontLocalPath`,画布用本地字体
7. **上次选择记忆**:选完字体后新建 NewTextArea 默认选中该字体
8. **发布拦截**:有文字未选字体时弹模态框列举所有元素,点[跳转]能定位到对应元素
9. **跳过空文本**:文字为空的 NewTextArea 不进拦截列表
10. **三业态覆盖**:正课、预习、作业各创建一个未选字体的 NewTextArea,模态框正确分类显示
11. **烘焙正确**:发布后的 PNG 像素与编辑器画布一致(同字体、字号、颜色、对齐)
12. **画布警示**:未选字体的 NewTextArea 在画布上有橘黄色虚线边框
13. **导出包零字体文件**:发布后的课件目录无 TTF
14. **类型检查通过**:`pnpm exec tsc -b --noEmit` 无新增错误

