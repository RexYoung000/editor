# 自定义模板（本地文件夹方案）

forge 编辑器的"自定义关卡模板"功能。模板**不存 localStorage**，存到用户选定的本地目录，资源按 MD5 内容去重，跨课件复用。

代码集中在 [src/utils/customTemplateFs.ts](../src/utils/customTemplateFs.ts) 与 [src/utils/collectResourceRefs.ts](../src/utils/collectResourceRefs.ts)。

---

## 一、目录路径与引导

- 模板根目录路径存 `localStorage.forge_custom_template_dir`，全局一份（不与课件绑定）。
- 未设置时 [NewStageDialog](../src/components/NewStageDialog.tsx) 的"自定义模板"tab 显示引导按钮，点击触发 `selectDirectory` IPC，选完目录写入 localStorage 并加载列表。
- 设置过则在 tab 顶部显示当前目录条，紧跟两个按钮：
  - **更换**：先弹推荐警告（"原目录的模板不会被删除但在编辑器中将不可见，建议保留作备份"），确认后再走选目录。
  - **导入**：从另一个模板根目录批量导入到当前目录（详见第七节）。
- 模板卡片悬浮时显示三个角标按钮（左到右）：**置顶 / 重命名 / 删除**。
  - 置顶详见第八节。
  - 删除会先弹确认弹窗（参考"更换目录"样式），点确认才真正调 `removeCustomTemplateAction`，避免误删。
- 保存模板按钮（小关卡卡片上的紫色书签）若发现尚未设目录，会先引导选目录，再继续保存。

---

## 二、目录布局

### 模板根目录

```
<templateRootDir>/
  templates.json           # 索引：[{ id, name, createdAt, elementCount, thumbnail? }]
  <templateId>/
    template.json          # 旧格式保存 elements；内部页面格式保存完整 subPage
    thumbnail.png          # 缩略图（保存时由 dataUrl 转 PNG 落盘）
    images/
      img_<32位md5>.<ext>            # 用户上传图片
      animation/
        <spineHash>/                 # Spine 整目录，按 spine 自身 skeleton.hash 命名
          <base>.sk
          <base>.png
          *.mp3 (可选)
        video_<32位md5>.<ext>        # 上传视频
      sound/
        audio_<32位md5>.<ext>        # 上传音频
```

模板侧用 **32 位完整 MD5** 命名（长期资源库容量大、避免碰撞）。

### 课件目录（既有约定）

```
<courseDir>/
  images/
    img_<6位md5>.<ext>             # 与 save-image-to-course 一致
    animation/
      aniN/<base>.sk + .png + *.mp3 # Spine（aniN 由 importSpineFolder 分配）
      video_<6位md5>.<ext>
      .manifest.json                # spineHash → folderName 映射
    sound/
      audio_<6位md5>.<ext>
```

课件侧延续 **6 位短 hash** 约定。

---

## 三、MD5 内容去重

`hash-file` IPC 流式算 MD5（[main.cjs](../electron/main.cjs) 的 `crypto.createHash('md5')` + `createReadStream`），前端 `customTemplateFs` 内置以 `mtime+size` 失效的内存缓存（`hashCache: Map<absPath, { mtime, size, hash }>`）。

### 保存模板

[customTemplateFs.saveTemplate](../src/utils/customTemplateFs.ts) 的去重流程：

1. 旧模板扫描 `elements`；内部页面模板同时扫描主界面和全部 `internalPages[].elements`，拿到引用集（image / video / sound / spineSkPaths）。
2. 对每个普通文件引用：算源 MD5 → 模板侧目标名 `<prefix>_<full-md5>.<ext>` → 已存在则跳过拷贝，否则 `copyLocalFile` 拷过去。
3. Spine 整目录：按 manifest 反查 `aniN → spineHash`（拿不到则用 `.sk` 文件本身的 MD5 兜底） → 模板侧目录名 `images/animation/<spineHash>/` → 已存在跳过，否则 `copyDir` 整目录拷贝（含 .png 纹理 + 同目录音频）。
4. 用 `pathMap` 调 `rewriteResourceRefs` 把所有页面元素内的路径换成模板侧路径。
5. 写 `template.json`、`thumbnail.png`，更新根目录的 `templates.json` 索引。

### 加载模板

[customTemplateFs.applyTemplate](../src/utils/customTemplateFs.ts) 是反向流程。缺少 `model` 的历史模板继续按单页元素模板处理；`model: 'internal-pages-v1'` 的模板整体恢复一个小关卡：

1. `collectResourceRefs(template.elements)` 同上。
2. 普通文件：算源 MD5 → 取 6 位作短 hash → 优先扫课件目录里同前缀的同扩展名文件验完整 hash 一致即复用；不命中再写新文件用 `<prefix>_<6位>.<ext>` 命名；若 6 位前缀已被占用且 hash 不一致（极少见），降级到完整 hash 文件名。
3. Spine：模板侧路径 `images/animation/<spineHash>/...`，先查课件 `.manifest.json` 是否已有该 spineHash → 有就复用对应 `aniN`，无则扫 animation 子目录分配新的 `aniN` → `copyDir` 整目录拷贝 → 更新 manifest。
4. `rewriteResourceRefs` 把模板侧路径换成课件侧路径；内部页面模板会为小关卡、页面、元素和动作重新生成 ID，并同步重写页面与元素关系。
5. 模板保存先写临时目录，资源与 JSON 完整成功后再原子进入索引；应用失败不会创建残缺小关卡。

### 内部页面模板结构

- `model: 'internal-pages-v1'` 标记完整小关卡模板；旧格式视为 `legacy-elements`。
- `subPage.elements` 保存主界面，`subPage.internalPages` 保存内容页和弹窗，遮罩设置和页面动作一并保留。
- 索引增加 `model`、`pageCount`，`elementCount` 统计全部页面；卡片缩略图仍使用主界面并显示页数。
- 关系问题的“暂不配置”状态不随模板复制，应用后按新小关卡重新计算提醒。

---

## 四、Spine 反查 manifest 的来由

Spine 元素的 `props.url` 是 `.sk` 文件路径（如 `images/animation/ani1/game.sk`），不是目录。但同目录内的 `.png` 纹理 + 可选 `.mp3/.wav/.ogg` 是骨骼内部加载、不会出现在元素 `props` 里——必须按整目录处理。

更麻烦的是课件目录里**只有 `.sk` + `.png`（+ 音频）**，没有原始 `.json`，拿不到 `skeleton.hash`。所以保存模板时：

- 读 `<courseDir>/images/animation/.manifest.json`（[importSpineFolder](../src/utils/electronFs.ts) 在导入时维护）。
- manifest 形如 `{ "<spineHash>": "ani1", ... }`，反向查找 `aniN === folder` 拿到 spineHash。
- 模板侧用 spineHash 做目录名，未来加载时直接按 spineHash 查重。
- manifest 缺失或没记录该 aniN（旧课件 / 转换前数据）时降级到对 `.sk` 文件本身算 MD5——能跑，但跨课件可能算出不同结果，无法跨课件去重。

---

## 五、API 入口

| 调用方 | 接口 | 说明 |
|---|---|---|
| editorStore | `loadCustomTemplates()` | 读取根目录索引 + 加载缩略图 |
| editorStore | `setCustomTemplateDir(dir)` | 写入 localStorage 并刷新列表 |
| editorStore | `saveAsCustomTemplate(subPageId)` | 普通小关卡保存单页元素；内部页面小关卡保存主界面、全部内部页、关系与资源 |
| editorStore | `addStageFromTemplate / addSubPageFromTemplate / addPreviewStageFromTemplate` | 加载模板到当前课件（调 `applyTemplate` 拷资源 + 重写路径，再入 store） |
| editorStore | `renameCustomTemplate(id, name)` | 同步 `templates.json` 索引和 `template.json` 主体 |
| editorStore | `removeCustomTemplateAction(id)` | `removeDir` 删整个模板目录 + 更新索引 |
| editorStore | `importCustomTemplates(sourceDir)` | 从另一个模板根目录批量导入到当前根目录，返回 `{ added, failures }` |
| editorStore | `pinCustomTemplate(id)` | 把模板置顶到列表第一位（修改 `createdAt`） |

模板相关的 store action **全部异步**（IPC 调用），UI 调用要 `await`。

---

## 六、命名冲突的兜底

- **保存自动命名**：根据现有索引按"自定义模板1/2/3..."递增（generateAutoName）。
- **重命名重名**：UI 双击模板卡片下方文字进入编辑态，回车提交；`renameTemplate` 检测到重名抛 `NAME_TAKEN`，UI 显示"当前名字已被占用，请重新输入"。
- **导入重名**：`自定义模板N` 类按数字递增，其他名按 `xxx(1)/(2)/...` 追加；详见第七节。
- **课件侧 6 位 hash 碰撞**：`copyFileToCourse` 校验完整 hash 不一致时降级用完整 hash 命名，不会覆盖已有文件。

---

## 七、批量导入模板

入口：自定义模板 tab 顶部路径条上的"导入"按钮。点击后调 `selectDirectory` IPC 选源目录 → 调 [importTemplatesFromDir(sourceDir)](../src/utils/customTemplateFs.ts)。

### 流程

1. **路径校验**：源/目标目录规一化（统一斜杠、Windows 大小写不敏感）后比较，源等于目标、源是目标的子目录、目标是源的子目录三种情况均抛 `INVALID_DIR`。
2. **读源 `templates.json`**：缺失或解析失败或空数组抛 `EMPTY_SOURCE`。
3. **逐条拷贝**（每条独立 try/catch，单条失败不中断后续）：
   - 生成新的 `templateId`（与目标已有 id 比对，极少冲突循环兜底）。
   - 用规则解析新名字（见下）。
   - `copyDir(<sourceDir>/<srcId>, <targetDir>/<newId>)` 整目录拷贝。模板侧资源是 32 位 MD5 命名，跨目录同名等于同内容，**不再做 hash 校验**。
   - 改写新目录里 `template.json` 的 `id`、`name`、`createdAt`（`createdAt` 同时写主体和索引，避免 listTemplates 排序按主体读到旧值的问题）。
   - 缩略图相对路径换成 `<newId>/thumbnail.png`。
   - 单条失败时 `removeDir` 清理半成品 + 把 `{ name, error }` 推进 failures，回收已占用的 name / id。
4. 全部处理完一次性 `writeIndex(targetDir, [...oldIndex, ...pendingEntries])`。
5. 返回 `{ added: number, failures: Array<{ name, error }> }`。

### 命名冲突解析

```
resolveImportName(srcName, taken):
  if /^自定义模板\d+$/.test(srcName):
    i = 1; while taken.has(`自定义模板${i}`) i++; return `自定义模板${i}`
  else:
    if !taken.has(srcName) return srcName
    n = 1; while taken.has(`${srcName}(${n})`) n++; return `${srcName}(${n})`
```

- "自定义模板N" 这类自动名一律按数字递增，不会带括号。
- 其他名按 `xxx`、`xxx(1)`、`xxx(2)` 递推。
- 源名本身就是 `xxx(2)`、目标也已有 `xxx(2)` → 再加一层 → `xxx(2)(1)`（规则简单一致，不识别尾部 `(N)` 做版本递增）。
- 解析完即把新名加进 `taken` 集合，防止同批多个同名互相冲突。

### `createdAt` 处理

导入的模板一律改为导入时刻 `Date.now()`，**主体和索引同步写**。`listTemplates` 按 `tmpl.createdAt`（主体里的字段）升序排，所以导入的模板都堆在列表末尾，符合"最新加的在右下"的视觉直觉，不依赖两台电脑的时钟一致性。

### UI 反馈

全部用弹窗，不用 toast：

| 场景 | 标题 | 正文 |
|---|---|---|
| `INVALID_DIR` | 目录不可用 | 不能选择当前模板目录或其子目录 |
| `EMPTY_SOURCE` | 无可导入的模板 | 该目录不是有效的模板目录,或目录中没有可导入的模板 |
| 全成功 | 导入成功 | 已成功导入 N 个模板 |
| 部分失败 | 导入完成（部分失败） | 成功 N 个 + 失败 M 个 + 失败清单（可滚动） |
| 全失败 | 导入失败 | 失败清单 |

失败清单每条形如 `<模板名> — <错误原因>`。用户取消选目录走静默路径不弹窗。导入期间整个对话框上覆遮罩 + spinner，禁用导入按钮防止并发触发。

---

## 八、置顶模板

模板卡片悬浮时左侧的图钉按钮调 [pinTemplate(id)](../src/utils/customTemplateFs.ts)。

排序按 `createdAt` 升序，置顶 = 把目标模板的 `createdAt` 改成比当前最小值还小 1，**主体和索引同步写**（避免 `listTemplates` 读主体里的字段踩第七节同一类坑）。多次置顶不同模板时，最后被置顶的自然排在最前。

理论上反复置顶可能让 `createdAt` 一直减小到很大的负数，但每次只 -1，几亿次才到边界，实际不会触发问题。

---

## 九、注意事项

- 不要把模板根目录设成课件目录或其子目录——会和 `images/` 路径冲突。当前没有强校验，靠用户自觉。
- 本功能仅 Electron 模式可用（依赖 `selectDirectory` / `hashFile` / `copyDir` 等 IPC）。Web 模式无此功能入口。
- 跨机器迁移：用第七节的"导入"功能更安全；手动复制粘贴模板目录到另一台机器也行，但要保证 `templates.json` 索引也带上对应条目。
