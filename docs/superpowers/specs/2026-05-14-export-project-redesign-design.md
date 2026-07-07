# 发布工程（exportProject）重构设计

## 背景

当前 `exportProject.ts` 在客户端做了所有重活：下载模板 zip → 解压 → 下载 game.zip → 按目录过滤解压 → 逐个拷贝用户资源 → 生成场景文件 → 写本地磁盘 → SVN 提交。客户端代码约 650 行，逻辑复杂且与 `export.ts` 大量重复。

核心问题：
1. **两套并行管线**：`export.ts` 和 `exportProject.ts` 有重复的 `collectResources`、`rewriteProps`、节点构建逻辑，每加新组件需改两处
2. **game.zip 手动维护**：新增内置资源需同时改 `builtinAssets.ts` 和 `game.zip`，容易遗漏（翻页按钮皮肤 bug 就因此产生）
3. **客户端做了不该做的事**：下载 zip、解压、路径映射、组装文件这些操作应在服务器完成
4. **并发不安全**：全局 `_compId` 计数器在多用户同时导出时会冲突

## 目标

- 服务器生成完整 Laya 项目 zip，客户端只需下载解压
- 消除 `game.zip`，内置资源按需从 `public/builtin/` 动态打包
- 新组件只需一处改动，两种导出格式自动生效
- 并发安全：每个请求独立生成，无共享可变状态

## 架构

```
客户端 (Electron)                     服务器 (Vite middleware)
──────────────────                     ──────────────────────
                                      ┌─ 读取模板骨架 ──────────┐
                                      │ (Game1_LT.zip 在内存解压) │
                                      └─────────────────────────┘
                                      ┌─ 生成课程动态内容 ──────┐
                                      │ scene 文件 + ts 文件    │
                                      │ config.json             │
                                      └─────────────────────────┘
                                      ┌─ 按需打包内置资源 ──────┐
1. 上传本地 images/ 资源               │ 从 public/builtin/ 读取 │
   → POST /api/upload-project-resource │ 按 builtinAssets 映射   │
                                      └─────────────────────────┘
                                      ┌─ 打包用户上传资源 ──────┐
2. POST 课程数据                       │ 从 public/uploads/ 读取 │
   → POST /api/export-project ────────>│                          │
                                      └─────────────────────────┘
                                      ┌─ 打包客户端资源 ────────┐
                                      │ 从暂存目录读取           │
                                      └─────────────────────────┘
                                      ┌─ 内存中合并为 zip ──────┐
                                      │ JSZip 合成               │
                                      └─────────────────────────┘
3. 下载 zip ←──────────────────────── ← 返回 zip 二进制流
4. 解压到本地 project 目录
5. SVN 提交（本地操作）
```

## 详细设计

### 1. 新增服务器 API

#### `POST /api/export-project`

输入（JSON body）：
```json
{
  "courseId": "xxx",
  "course": { /* Course 对象（stages/pages/elements） */ },
  "localResources": {
    "images/sound/right.mp3": "data:audio/mpeg;base64,...",
    "images/animation/video.mp4": "<暂存文件路径>"
  }
}
```

输出：完整的 Laya 项目 zip（binary response，Content-Type: application/zip）

客户端上传的本地资源（`images/` 路径的音视频/图片）有两种处理方式：
- 小文件（图片）：直接在 JSON 中传 data URL
- 大文件（视频/音频）：先通过 `POST /api/upload-project-resource` 上传到服务器暂存目录，然后在请求中传暂存路径引用

#### `POST /api/upload-project-resource`

与现有 `/api/upload-resource` 类似，但资源写入服务器临时目录而非 preview-server lesson 目录。用于导出前上传客户端本地的大文件。

### 2. 消除 game.zip

**不再需要 `game.zip` 文件。** 内置资源按需动态打包：

1. 服务器从课程数据中收集引用的内置资源（通过 `collectResources`）
2. 对每个引用的内置资源，从 `public/builtin/<src>` 直接读取文件
3. 写入 zip 中的正确位置（通过 `builtinExportToProjectPath(exportPath)` 映射）

路径映射规则（同现有逻辑）：
- `game/image/xxx.png` → zip 内 `game_lt/image/img/xxx.png`
- `game/inputImg/xxx.png` → zip 内 `game_lt/image/inputImg/xxx.png`
- `game/jpL11/xxx.png` → zip 内 `game_lt/image/jpL11/xxx.png`

**新增内置资源只需改 `builtinAssets.ts`，不再需要手动更新 `game.zip`。**

### 3. 模板处理

`Game1_LT.zip` 保留在 `public/builtin/layaProjectModel/`，但改为服务器端在内存中处理：

1. 服务器用 JSZip 在内存中读取 `Game1_LT.zip`
2. 将模板骨架文件直接写入输出 zip
3. 覆盖/添加动态生成的文件（scene、ts、config、version 等）
4. 覆盖/添加资源文件

不再需要客户端下载和解压模板。

### 4. 服务器端生成模块

新增 `server/exportProjectServer.ts`（Node.js 模块），包含：

- `collectResources(course)` — 收集课程引用的所有资源，返回 `Map<sourcePath, projectPath>`
- `builtinExportToProjectPath(exportPath)` — 路径映射（与现有逻辑相同）
- `buildSceneNode(element, allElements, resourceMap, parentId, compIdGen)` — 构建 .scene JSON 节点
- `buildScene(page, sceneName, resourceMap, compIdGen)` — 构建完整 scene
- `generateSceneTs(sceneName, flags)` — 生成 ts 文件内容
- `buildConfigJson(course, resourceMap)` — 构建 config.json
- `generateProjectZip(course, localResources)` — **主入口**，返回 JSZip 实例

`compIdGen` 是每请求独立的 ID 生成器（解决并发问题）。

### 5. 组件特殊逻辑（统一一处）

服务器端模块包含所有组件的特殊导出逻辑，且两种导出格式共用：

- **PageTurn**：导出为 Box 容器包裹 Image 子节点 + ScaleButton 按钮，按钮层次在上层。从 topLevel 过滤 PageTurnLeftBtn/PageTurnRightBtn
- **SelectableObj**：`_foregroundSkin` / `_bgSkin` 转为子 Image 节点
- **ChoiceBox**：`mouseEnabled: false` 正常导出（已在 defaultProps 中）
- **SoundButton**：`isNeedAni` / `showInStu` 导出为字符串
- **exportWrapper**：KlInputImage 包裹为 KlInputBox，promoteProps 逻辑
- **_lockBox 注入**：答题页面注入锁定遮罩

后续新增组件只需在此模块中添加逻辑，LessonZK 导出和项目导出都自动生效。

### 6. 客户端简化

`exportProject.ts` 从 ~650 行缩减为 ~30 行：

```typescript
export async function exportProject(course: Course): Promise<void> {
  const dirPath = getCourseDirPath(course.id);
  if (!dirPath) throw new Error('未找到课件目录');
  const eApi = window.electronAPI;
  if (!eApi) throw new Error('仅支持 Electron');

  // 1. 上传本地 images/ 资源到服务器暂存
  const localResources = await uploadLocalResources(course, eApi);

  // 2. POST 课程数据 + 本地资源引用，获取项目 zip
  const courseData = JSON.stringify({ courseId: course.id, course, localResources });
  const response = await fetch(`${getApiBaseUrl()}/api/export-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: courseData,
  });
  if (!response.ok) throw new Error(`导出失败: ${response.status}`);

  // 3. 下载 zip，解压到本地 project 目录
  const zipData = await response.arrayBuffer();
  const projectRoot = `${dirPath}/project/${course.id}/Game1_LT`;
  await eApi.removeDir(projectRoot);
  await extractZip(zipData, projectRoot, eApi);

  // 4. SVN 提交（如有）
  const isSvn = await eApi.isSvnDirectory(dirPath);
  if (!isSvn) return;
  // ... 现有 SVN 流程不变
}
```

客户端不再有：collectResources、rewriteProps、buildSceneNode、game.zip 处理、模板下载、资源 base64 转换、gameDirs 收集等。

### 7. 并发安全

- `compId` 生成器改为每请求独立（函数参数或闭包）
- zip 在内存生成，无磁盘中间文件
- `public/builtin/` 和 `public/uploads/` 是只读文件，多请求并发读无冲突
- 暂存目录按 `courseId + timestamp` 命名，避免冲突

### 8. 与 export.ts 的关系

`export.ts`（LessonZK 导出）保持不变，继续用于预览模式（`publishOnly` / `publishAndPreview`）。

新增组件的特殊逻辑放在服务器端模块中。未来可以考虑让 `export.ts` 也从同一模块获取逻辑，但目前两个管线输出格式差异较大（JS 代码 vs scene JSON），合并收益有限。先聚焦于简化 `exportProject` 侧。

### 9. 删除的文件/内容

- 删除 `public/builtin/runtime/game.zip`
- 删除客户端 `exportProject.ts` 中所有生成逻辑（collectResources、rewriteProps、buildSceneNode 等）
- 删除 `extractZipFromServer`（客户端不再需要下载 zip 再解压，改为直接解压服务器返回的 zip buffer）

保留的内容：
- `public/builtin/layaProjectModel/Game1_LT.zip`（模板骨架，服务器端读取）
- 客户端 SVN 提交逻辑
- 客户端 zip 解压函数（从内存 buffer 解压到本地目录）

### 10. 新增文件

- `server/exportProjectServer.ts` — 服务器端项目生成模块（Node.js）
- `vite.config.ts` 新增 `POST /api/export-project` 和 `POST /api/upload-project-resource` middleware

## 风险和缓解

| 风险 | 缓解 |
|------|------|
| 大文件（视频 100MB+）在 JSON 中传 data URL 太大 | 先通过 `/api/upload-project-resource` 上传暂存，请求中只传路径引用 |
| 内存压力（多用户同时导出） | zip 生成后立即返回释放内存；单次 zip 约 3-5MB，可控 |
| 服务器端 JSZip 依赖 | JSZip 已是项目依赖（客户端已用），Node.js 中同样可用 |
| 暂存目录清理 | 导出完成后删除暂存目录；设置超时清理（如 10 分钟后自动删除） |

## 实施步骤概要

1. 新建 `server/exportProjectServer.ts`，移植并统一核心生成逻辑（含 PageTurn、SelectableObj 等）
2. `vite.config.ts` 新增 API endpoints
3. 客户端 `exportProject.ts` 简化为 API 调用 + 解压 + SVN
4. 删除 `game.zip`
5. 验证并发安全（compId 独立化）
6. 测试完整导出流程