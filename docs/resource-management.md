# 课件资源管理方案

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 基于真实课件 s9_v8_89_LessonZK 的资源体系分析  
> 更新日期：2026-04-24

---

## 一、真实课件的资源体系

### 课件包结构

```
s9_v8_89_LessonZK/
├── config.json                  # 页面配置（含每页 res 列表）
├── fileconfig.json              # atlas → 图片映射
├── version_s9_v8_89.json        # 原始路径 → hash 路径映射
├── LessonZK.js                  # 课件主 JS
├── game_lt/                     # 课件专属资源
│   ├── image/
│   │   ├── bigImg/              # 大图（封面、背景）
│   │   ├── img/                 # 通用图片
│   │   ├── key/                 # 按钮/键盘皮肤
│   │   └── swdt/                # 思维导图图片
│   └── animation/               # 视频/动画
└── res/atlas/                   # 打包后的图集
    └── game_lt/image/
        ├── common.atlas + .png  # 通用 UI 图集
        ├── key.atlas + .png     # 按钮图集
        └── img.atlas + .png     # 图片图集
```

### 资源分两类

| 类型 | 路径前缀 | 说明 | 打包方式 |
|------|---------|------|---------|
| 共享资源 | `share/` | sdk_baiya 自带的 UI 皮肤、音效、动画 | 全局预加载，所有课件共用 |
| 课件资源 | `game_lt/` | 课件专属的图片、音频、视频 | 打包到课件目录，按页预加载 |

### 三个关键配置文件

**config.json** — 每页声明需要的资源：
```json
{
  "pages": [{
    "name": "lt1",
    "res": [
      { "url": "game_lt/image/bigImg/img_1.jpg", "type": "image" },
      { "url": "res/atlas/game_lt/image/key.atlas" }
    ]
  }]
}
```

**fileconfig.json** — atlas 包含哪些图片：
```json
{
  "res/atlas/game_lt/image/key.atlas": [
    "game_lt/image/key/",
    ["img_nor.png", "img_sele.png", "img_bg.png"]
  ]
}
```

当内置资源存在多级目录时，atlas 路径必须保留完整目录层级。例如
`game_lt/image/mathKeyboard/yellow/img_jpk.png` 对应
`res/atlas/game_lt/image/mathKeyboard/yellow.atlas`，不能截断为
`mathKeyboard.atlas`。`config.json` 中的 atlas URL 必须与
`fileconfig.json` 的 key 和目录前缀一一对应。

**version.json** — 文件名 hash 映射（缓存控制）：
```json
{
  "game_lt/image/key/img_nor.png": "game_lt/image/key/img_nor3dc791ab.png"
}
```

### 运行时加载流程

```
GameLoader 加载 config.json
    ↓
提取所有页面的 res 列表
    ↓
通过 version.json 映射为 hash 文件名
    ↓
并行加载所有资源（图片 + atlas）
    ↓
组件设置 skin 时：
    → 先查 atlas（通过 fileconfig）
    → 有：从 sprite sheet 裁切
    → 无：直接加载图片文件
```

---

## 二、forge 编辑器的资源管理方案

### 简化策略

forge 第一版不做 atlas 打包和 hash 版本控制。原因：
1. atlas 打包需要图片处理工具（如 TexturePacker），增加复杂度
2. hash 版本控制是 CDN 缓存优化，本地开发不需要
3. GameLoader 在找不到 atlas 时会回退到直接加载图片文件

### 资源目录结构

内置字体是受版本管理的运行时资源，统一保存在
`public/builtin/runtime/fonts/` 并通过字体库元数据引用。字体资源不进入业务代码硬编码，
也不依赖播放电脑安装；完整注册、默认字体和历史兼容规则见
[字体库与历史兼容](font-library.md)。

```
编辑器 public/uploads/          → 用户上传的资源暂存
    ↓ 导出时
课件包 test_forge_LessonZK/
├── config.json
├── LessonZK.js
├── version_test_forge.json      → {}（空映射）
├── fileconfig.json              → {}（不使用 atlas）
└── game/                        → 课件资源目录
    └── image/
        ├── btn_start.png        → 用户上传的按钮皮肤
        ├── bg_cover.jpg         → 用户上传的背景图
        └── icon_sound.png       → 用户上传的音频图标
```

### 资源路径规则

| 场景 | 编辑器中的路径 | 导出后的路径 | config.json 中的声明 |
|------|--------------|-------------|-------------------|
| 共享皮肤 | `share/comp/button.png` | 不打包（GameLoader 自带） | 不需要声明 |
| 用户上传 | `/uploads/btn_start.png` | `game/image/btn_start.png` | `{ "url": "game/image/btn_start.png", "type": "image" }` |
| 用户上传音频 | `/uploads/click.wav` | `game/sound/click.wav` | `{ "url": "game/sound/click.wav", "type": "sound" }` |

### 完整流程

```
1. 用户在编辑器上传图片
   → POST /api/upload → 保存到 public/uploads/xxx.png
   → 返回路径 /uploads/xxx.png
   → 组件 skin 设为 /uploads/xxx.png

2. 编辑器中预览
   → Vite 直接 serve public/uploads/xxx.png
   → 组件正常渲染

3. 点击"发布预览"
   → 扫描所有元素的 props，收集 /uploads/ 开头的路径
   → 复制文件到课件目录 game/image/ 或 game/sound/
   → 改写 props 中的路径为相对路径
   → 在 config.json 的 pages[].res 中声明资源
   → 生成空的 fileconfig.json 和 version.json

4. GameLoader 加载
   → 读 config.json，预加载 res 列表中的资源
   → 组件 skin 指向 game/image/xxx.png
   → 直接加载文件（不走 atlas）
```

---

## 三、皮肤制作规范

### ScaleButton / SoundButton 皮肤

**格式要求：**
- 文件格式：PNG
- 尺寸：宽度自定，高度 = 单态高度 × stateNum
- stateNum=3 时，图片从上到下分为三段：
  - 第 1 段：正常状态（up）
  - 第 2 段：悬停状态（over）
  - 第 3 段：按下状态（down）
- stateNum=1 时：只有一个状态，图片不分段

**示例（120×69，stateNum=3，每态 120×23）：**
```
┌──────────────┐ ← up 状态
│   正常按钮    │
├──────────────┤ ← over 状态
│   悬停按钮    │
├──────────────┤ ← down 状态
│   按下按钮    │
└──────────────┘
```

**九宫格（sizeGrid）：**
- 格式：`"上,右,下,左"`（像素值）
- 作用：四个角保持原始尺寸，中间区域拉伸
- 示例：`"5,5,5,5"` 表示四边各保留 5px 不拉伸

### CheckBox 皮肤

**格式要求：**
- PNG，宽度自定，高度 = 单态高度 × 3
- 三段：未选中 / 悬停 / 选中

### Radio 皮肤

**格式要求：**
- 同 CheckBox，三段式

### TextInput 皮肤

**格式要求：**
- PNG，单张图片
- 通常是一个带边框的矩形背景
- 支持九宫格拉伸

### ProgressBar 皮肤

**格式要求：**
- PNG，包含背景条
- 需要配套 `$bar` 后缀的进度条图片
- 如 `progress.png`（背景）+ `progress$bar.png`（进度条）

### Tab 皮肤

**格式要求：**
- PNG，高度 = 单态高度 × 2
- 两段：未选中 / 选中

### Image 组件

**格式要求：**
- 任意图片格式（PNG/JPG）
- 直接设置 skin 路径即可
- 支持九宫格拉伸

### 通用规则

1. **路径不能包含中文和空格**
2. **建议使用 PNG 格式**（支持透明）
3. **大背景图可用 JPG**（文件更小）
4. **音频使用 WAV 格式**（Laya 原生支持）
5. **共享资源路径以 `share/` 开头**，不需要打包到课件
6. **课件资源路径以 `game/` 开头**，会打包到课件目录

---

## 四、补充考虑

### 4.1 音频/视频资源

视频关卡的预设、本地上传、资源库选择、50MB 限制、流式落盘和内容哈希去重遵循 [视频关卡来源选择](video-stage-selection.md)。视频关卡三种来源统一只接受 MP4；旧通用视频字段对其他格式的兼容不用于视频关卡选择弹窗。

| 资源类型 | 格式 | 编辑器路径 | 导出路径 | config.json type |
|---------|------|-----------|---------|-----------------|
| 图片 | PNG/JPG | `/uploads/xxx.png` | `game/image/xxx.png` | `"image"` |
| 音频 | WAV/MP3 | `/uploads/xxx.wav` | `game/sound/xxx.wav` | `"sound"` |
| 视频 | MP4 | `/uploads/xxx.mp4` | `game/animation/xxx.mp4` | `"video"` |
| 骨骼动画 | SK+PNG | `/uploads/xxx.sk` | `game/animation/xxx.sk` | `"arraybuffer"` |

导出时根据文件扩展名自动分类到对应子目录。

### 4.2 共享资源的自定义

教研想替换默认皮肤时，有两种方式：

| 方式 | 做法 | 导出结果 |
|------|------|---------|
| 上传替换 | 上传自定义图片，skin 指向 `/uploads/xxx.png` | 打包到 `game/image/`，不依赖共享资源 |
| 使用默认 | skin 保持 `share/comp/button.png` | 不打包，运行时从共享资源加载 |

规则：`share/` 开头的路径不打包，`/uploads/` 开头的路径打包并改写。

### 4.3 资源去重

导出时按文件内容 MD5 去重：

```
扫描所有元素 props 中的资源路径
    ↓
对每个文件计算 MD5
    ↓
相同 MD5 的文件只复制一份
    ↓
多个组件引用同一文件时，路径指向同一个文件
```

### 4.4 资源大小限制

| 限制项 | 建议值 | 原因 |
|-------|-------|------|
| 单文件上传 | ≤ 5MB | 避免过大的图片影响加载速度 |
| 视频关卡单个 MP4 | ≤ 50MB | 保持课件迁移和运行时加载边界 |
| 课件包总大小 | ≤ 50MB | iPad 端内存限制 |
| 图片分辨率 | ≤ 1920×1080 | 匹配设计稿尺寸 |
| 音频时长 | ≤ 60s | 课件音效通常很短 |

上传时在前端校验，超限提示用户压缩。

### 4.5 资源预览

属性面板的 `file` 类型字段增加缩略图预览：

```
┌─────────────────────┐
│ 皮肤                 │
│ ┌───┐ btn_start.png │
│ │ 🖼 │ 120×69       │
│ └───┘               │
│ [选择文件] [清除]    │
└─────────────────────┘
```

- 图片类型：显示缩略图 + 尺寸信息
- 音频类型：显示文件名 + 时长
- 视频类型：显示文件名 + 时长

### 4.6 多页资源分配

config.json 的每页 `res` 列表只包含该页用到的资源，不是全部：

```typescript
// 导出时，按页扫描
course.pages.forEach((page, i) => {
  const pageRes: Set<string> = new Set();
  page.elements.forEach((el) => {
    // 收集该页元素引用的所有资源路径
    collectResourcePaths(el.props, pageRes);
  });
  config.pages[i].res = Array.from(pageRes).map(url => ({
    url,
    type: getResourceType(url),
  }));
});
```

这样 GameLoader 按页预加载时，只加载当前页需要的资源。

### 4.7 资源删除与清理

| 场景 | 处理方式 |
|------|---------|
| 删除组件 | 不立即删除 uploads 中的文件（其他组件可能引用） |
| 清理孤立资源 | 提供"清理未使用资源"功能，扫描所有页面，删除未被引用的文件 |
| 切换课件 | uploads 目录按课件 ID 隔离：`uploads/{courseId}/` |

### 4.8 base64 内联（小图标优化）

Laya 引擎支持 `data:image` 格式的 skin 路径（源码确认：`GameLoader.max.js` 第 29871、48565 行）。

| 条件 | 处理 |
|------|------|
| 文件 < 4KB | 转为 base64，内联到 uiView JSON 的 props.skin 中 |
| 文件 ≥ 4KB | 作为独立文件打包到课件目录 |

好处：减少 HTTP 请求数，小图标不需要单独文件。
注意：base64 编码后体积增大约 33%，所以只对小文件使用。

```typescript
// 导出时判断
if (fileSize < 4096) {
  props.skin = `data:image/png;base64,${base64Data}`;
} else {
  props.skin = `game/image/${filename}`;
  // 复制文件到课件目录
}
```

---

## 五、图集（atlas）扩展方案

当前第一版不做 atlas 打包，后续优化时按以下方案实施：

### 5.1 为什么需要 atlas

| 指标 | 无 atlas | 有 atlas |
|------|---------|---------|
| 一页 20 张图片 | 20 个 HTTP 请求 | 1-2 个请求（atlas + png） |
| 加载时间 | 慢（串行/并发限制） | 快（一次加载） |
| 内存占用 | 每张图片一个纹理 | 合并为一个纹理 |
| WebGL drawcall | 每张图片一次 | 同 atlas 的图片合批 |

### 5.2 atlas 构建流程

```
导出时：
1. 收集课件目录下所有图片
2. 按目录分组（game/image/key/、game/image/img/ 等）
3. 每组用 sprite packing 算法排列到一张大图上
4. 生成 atlas JSON（frame 坐标）+ PNG（sprite sheet）
5. 生成 fileconfig.json（atlas → 图片映射）
6. config.json 的 res 列表引用 atlas 而不是单张图片
```

### 5.3 实现方式

两个选择：

**方案 A：浏览器端打包（推荐）**
- 用 Canvas API 在浏览器里拼接图片
- 不需要额外工具
- 导出时自动完成
- 限制：图片总面积不能超过 Canvas 最大尺寸（通常 4096×4096）

**方案 B：服务端打包**
- 用 Node.js 的 sharp/canvas 库
- 在 Vite 插件里处理
- 支持更大的图集
- 需要安装额外依赖

### 5.4 兼容性

atlas 是纯增量优化，不影响功能：
- 有 atlas：GameLoader 从 sprite sheet 裁切，性能好
- 无 atlas：GameLoader 直接加载单张图片，功能正常
- 可以逐步迁移，不需要一次全部改完

### 5.5 hash 版本控制

同样是优化项，后续实施：

```typescript
// 构建时
const hash = md5(fileContent).slice(0, 8);
const hashedName = filename.replace(/(\.\w+)$/, `${hash}$1`);
versionMap[originalPath] = hashedPath;

// 输出
// version_test_forge.json: { "game/image/btn.png": "game/image/btn3dc791ab.png" }
// 实际文件重命名为 btn3dc791ab.png
```

---

## 六、实施步骤（更新）

### 阶段 1：基础资源管理（当前）

1. `/api/upload` 接口 — 保存文件到 `public/uploads/{courseId}/`
2. FieldRenderer 文件上传 — 真正上传文件，返回 URL 路径
3. 属性面板资源预览 — 缩略图 + 文件信息
4. 导出时资源打包 — 扫描、复制、改写路径、生成 res 列表
5. base64 内联 — 小文件自动内联
6. 资源去重 — MD5 去重
7. 多页资源分配 — 按页生成 res 列表

### 阶段 2：atlas 优化（后续）

1. 浏览器端 sprite packing
2. 生成 atlas JSON + PNG
3. 生成 fileconfig.json
4. config.json 引用 atlas

### 阶段 3：版本控制（后续）

1. 文件内容 MD5 hash
2. 生成 version.json
3. 文件重命名
