# MP4 视频编辑态预览 + 导出管道修复

## 背景

编辑器现有 Video 组件（`elementMeta.ts`）只有空白 Sprite 占位 + `videoUrl` 文本属性，编辑态无法预览播放 MP4。导出管道也遗漏了 Electron 本地路径的视频文件，导致预览（GameLoader）无法加载视频。

## 交互设计

与 NewTextArea 行内编辑模式完全一致：

| 状态 | 画布显示 | 用户操作 |
|------|----------|----------|
| 未选中 | placeholderImage 占位图（灰色矩形 + 播放图标） | 单击选中 |
| 选中但未双击 | placeholderImage + 选择框/拖拽手柄 | 可拖动/缩放 |
| 双击进入播放 | DOM overlay `<video>` 覆盖在元素位置上方 | 播放视频，有浏览器原生 controls |
| ESC / 点击空白 | 回到占位图 | 退出播放 |

## 架构设计

### 1. DOM overlay `<video>` 浮层

复用 CanvasOverlay 的行内编辑模式。当 `editingElement?.type === 'Video'` 时，渲染 `<video>` 元素：

```
位置：worldRectToScreen(editingElement.x, y, w, h, panX, panY, zoom)
尺寸：rect.width × rect.height
controls：浏览器原生 controls（play/pause/进度条/音量）
pointerEvents：auto（视频区域可交互）
```

退出条件（和 NewTextArea 一致）：
- ESC 键
- 点击画布空白区域（Laya mousedown handler 触发 deselect）
- 点击其他元素

视频 URL 来源：
- **Electron 模式**：`forge-local://<courseId>/<videoUrl>` 自定义协议，直接流式读取本地文件
- **Web 模式**：不在本次范围

### 2. Electron 自定义协议 `forge-local://`

在 Electron 主进程注册 `forge-local` 协议：
- URL 格式：`forge-local://<courseId>/game_lt/animation/video.mp4`
- 拦截请求，从课程目录读取文件并返回 stream response
- 用于 `<video>` 元素直接播放本地 MP4，无需 base64 编码
- 也可以给 GameLoader 预览 iframe 使用

### 3. placeholderImage

Video 元素改为 `newComponents` 分类（遵循新组件规范：编辑态用 Image 占位）。

- 占位图：灰色矩形 + 居中播放三角形图标（Canvas API 绘制，存为 `public/builtin/runtime/video_placeholder.png`）
- `elementMeta.ts` 添加 `placeholderImage: assetSrc('videoPlaceholder')`

### 4. 导出管道修复（3 处改动）

**4a. `collectResources` 增加 Electron 本地路径识别**

当前只识别 `/uploads/` 和 `images/` 前缀。新增识别课件相对路径：

```typescript
function isElectronLocalPath(v: unknown): v is string {
  return typeof v === 'string' && (
    v.startsWith('game_lt/') || v.startsWith('game/') || v.startsWith('share/')
  );
}
```

映射规则沿用 `RESOURCE_EXTS`：`.mp4` → `game/animation/`。

**4b. vite publish 中间端支持课程目录**

当前 publish handler 只从 `public/` 目录查找资源文件。对于 Electron 本地路径，需要从 `outputDir`（课程目录）查找：

```
原有：path.resolve(__dirname, 'public', from)
新增：如果 outputDir 存在且 public/ 下找不到文件，从 outputDir 查找
```

`outputDir` 已在 publish payload 中传递（export.ts:587, :592）。

**4c. Electron 本地拷贝：直接磁盘复制**

当前流程对每个资源文件走 `fetch(vite server) → blob → base64 → writeBinaryFile`，对大 MP4 文件非常慢。

新增 `electronAPI.copyLocalFile(srcAbsPath, destAbsPath)`：直接在磁盘上复制文件，不经过网络和 base64 编码。

对于 Electron 本地路径的资源，本地拷贝流程改为：
```
旧：fetch from vite server → base64 → writeBinaryFile
新：copyLocalFile(courseDir/relPath, lessonDir/exportPath)
```

### 5. 文件上传限制放宽（仅 Electron 模式）

- `FieldRenderer.tsx`：Electron 路径的 `5 * 1024 * 1024` 判断 → 对视频文件放宽到 50MB，图片仍限 5MB
- `Canvas.tsx` 拖拽上传：`IMAGE_EXTS` 不包含 `.mp4`，新增 `VIDEO_EXTS` 处理（同样只走 Electron 路径）
- Web 模式上传不在本次范围

## 需要改动的文件

| 文件 | 改动内容 |
|------|----------|
| `elementMeta.ts` | Video 移到 newComponents，加 placeholderImage |
| `builtinAssets.ts` | 注册 videoPlaceholder 资源 |
| `CanvasOverlay.tsx` | 新增 `<video>` 浮层渲染（和 textarea 平行） |
| `Canvas.tsx` | 双击检测新增 Video 类型，新增 VIDEO_EXTS 拖拽上传 |
| `FieldRenderer.tsx` | Electron 路径视频文件大小限制 5MB → 50MB |
| `export.ts` | collectResources 新增 isElectronLocalPath，本地拷贝用 copyLocalFile |
| `vite.config.ts` | publish handler 从 outputDir 读取 Electron 本地路径资源 |
| `electron main process` | 注册 forge-local 协议 + copyLocalFile API |
| `electron.d.ts` | 新增 copyLocalFile 类型定义 |

## 不在本次范围

- Web 模式视频上传/播放适配
- 自定义视频播放器 UI（使用浏览器原生 controls）
- 视频自动播放（只在双击后播放）
- 视频帧精确同步到 Laya canvas（overlay 和 canvas 是两个渲染层）