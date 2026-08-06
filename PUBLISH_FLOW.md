# 发布流程说明

> 历史资料：本文记录早期发布实现，不能替代当前的 [老师课件发布流程](./docs/course-publishing.md)。当前流程区分预览确认、工程生成、SVN commit、打包通知和最终完成反馈。

## 按钮一览

| 按钮 | 颜色 | 函数 | 文件 |
|------|------|------|------|
| 发布工程 | 靛蓝 | `exportProject()` | exportProject.ts |
| 预览 | 紫色 | `runCompileBuildAndOpen(false)` | Toolbar.tsx |
| 预习预览 | 紫色（弹窗选择） | `runCompileBuildAndOpen(true)` | Toolbar.tsx |

---

## 一、发布工程

**入口：** Toolbar 靛蓝按钮 → `writeBackToLocalFile()` → `cleanupUnreferencedImages()` → `exportProject()`

### 第1阶段：导出 LayaAir 工程源码（exportProject.ts）

1. **预处理** `bakeTextElements()` — 将 NewTextArea 文本元素烘焙成 PNG 图片，替换为 Image 类型
2. **收集资源** `collectResources()` — 扫描所有元素属性，建立资源映射表（源路径 → 目标路径）
3. **读取图片尺寸** `collectImageSizes()` — 并发读取所有图片真实像素尺寸，失败则中止发布
4. **生成场景** 每个 stage 的每个 subPage 生成：
   - `.scene` 文件（Laya UI 场景定义，JSON 格式）
   - `.ts` 文件（场景运行逻辑，含 initView + 事件绑定）
5. **生成配置** `buildConfigJson()` — 按真实像素尺寸判断大小图（≥512px 散图，<512px atlas）
6. **下载模板 zip** 从 vite 服务器下载 `Game1_LT.zip` → 解压到 `<课件目录>/project/<courseId>/Game1_LT/`
7. **写 .scene + .ts 文件** 覆盖模板中的场景文件
8. **写 config.json + version.json**
9. **下载 game.zip** 从 vite 服务器下载 `game.zip` → 按引用精确解压到 `game_lt/image/` 下
10. **写用户资源** base64 皮肤图片和上传图片写入 `game_lt/image/img/`
11. **导出预习工程**（如有 previewStages）→ `exportPreviewProject()` 同理写 `Game1_PREVIEW/`

产物目录结构：
```
<课件目录>/project/<courseId>/Game1_LT/
  ├── .laya/                    ← Laya IDE 配置
  ├── laya/
  │   ├── pages/game_lt/        ← .scene 文件
  │   └── assets/
  │       ├── config.json        ← 关卡配置（大图散图 + 小图 atlas 引用）
  │       ├── version.json
  │       └── game_lt/image/     ← 内置皮肤 + 用户图片（原图，未打 atlas）
  ├── src/view/game_lt/          ← .ts 场景逻辑
  └── tsconfig.json
```

### 第2阶段：SVN 提交 + 通知打包机

11. `isSvnDirectory()` — 检查是否 SVN 工作副本，不是则跳过
12. `svnCommit()` — 弹出 TortoiseProc 提交窗口
13. `svnHasUnversioned()` — 检查是否有未提交文件，有则中止
14. `svnGetUrl()` — 获取各子工程的 SVN URL
15. `sendCourseToServer()` — WebSocket 通知打包机构建

打包机收到后会自行跑 layaair2-cmd 生成 atlas + fileconfig，再编译出最终 runtime 产物。

---

## 二、预览

**入口：** Toolbar 紫色按钮 → `runCompileBuildAndOpen(previewMode)`

1. **保存 + 清理** `writeBackToLocalFile()` + `cleanupUnreferencedImages()`
2. **导出工程** `exportProject(course, { skipSvn: true })` — 同"发布工程"第1阶段，但不提交 SVN
3. **本地编译** `compileBuild(course)` → Electron IPC `compile-build`：
   - 合并各子工程到 tempDir
   - 生成 styles.xml（animation 排除 atlas）
   - 跑 layaair2-cmd → 产出 atlas + fileconfig.json
   - esbuild bundle → LessonZK.js
   - mergeConfigs 合并各子工程 config.json
   - 按 fileconfig 修正 config.json（剔除已进 atlas 的散图条目，补 atlas 引用）
   - 删除已进 atlas 的小图物理文件
4. **打 zip** `zipDirectory(outputDir)`
5. **上传** `POST /api/upload-compiled-zip` → vite 内存解压到 `preview-server/lessons/<projName>/`
6. **打开浏览器** `window.open(/preview-server/?course=...)`

产物目录结构（esBuild 输出 = runtime 可直接加载）：
```
<课件目录>/esBuild/<courseId>_LessonZK/
  ├── LessonZK.js               ← esbuild bundle
  ├── config.json                ← 最终配置（经 fileconfig 修正）
  ├── finalConfig.json
  ├── fileconfig.json            ← atlas 映射
  ├── version_*.json
  ├── res/atlas/                 ← atlas 文件（.atlas + .png）
  ├── game_lt/image/             ← 大图散图（小图已删）
  ├── game_lt/sound/
  └── game_lt/animation/         ← 骨骼动画（不进 atlas）
```

---

## 三者对比

| 功能 | 发布工程 | 预览 |
|------|----------|------|
| LayaAir 工程源码 | 是 | 是（中间产物） |
| 本地编译（layaair2-cmd + esbuild） | 否 | 是 |
| SVN 提交 | 是 | 否 |
| 打包机通知 | 是 | 否 |
| 打开浏览器预览 | 否 | 是 |
| 产物用途 | 给打包机 | 给 GameLoader 直接加载 |

---

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/utils/exportProject.ts` | exportProject — LayaAir 工程导出 + SVN |
| `src/utils/exportPreviewProject.ts` | 预习工程导出 |
| `src/utils/imageSize.ts` | collectImageSizes — 图片像素尺寸读取 |
| `src/utils/compileBuild.ts` | compileBuild — 调用 Electron IPC 编译 |
| `src/utils/websocket.ts` | sendCourseToServer — 打包机 WebSocket 通知 |
| `src/utils/atlasPacker.ts` | packAtlas — 浏览器端精灵图集打包（画布预览用） |
| `src/elements/elementMeta.ts` | 元素类型定义 + 属性 + 导出配置 |
| `src/elements/builtinAssets.ts` | 内置资源注册（src ↔ exportPath 映射） |
| `electron/main.cjs` | IPC: compile-build、文件读写、SVN、zip |
| `vite.config.ts` | Dev server 中间件（upload、upload-compiled-zip） |
