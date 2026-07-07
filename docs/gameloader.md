# GameLoader 完整文档

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 来源：`GameLoaderProd/src/GameLoader.as` + `pageshare-laya-research/tasks/`  
> 更新日期：2026-04-23

---

## 一、完整启动流程（13 步）

```
new GameLoader()
    ↓
initLaya()          — 初始化 LayaAir 引擎
    ↓
initSubject()       — 初始化学科（Math/Chinese/English）
    ↓
loadSysRes()        — 加载 sys_config.json + module_config.json
    ↓
onSysConfigLoaded() — 初始化 Native Bridge
    ↓
ResourceVersion.enable() — 激活全局资源版本映射
    ↓
loadSDK()           — eval() 注入 sdk_baiya.js
    ↓
loadCourseVersion() — 加载课件 version_{cid}.json，合并到全局 manifest
    ↓
loadCourseConfig()  — 加载 finalConfig.json
    ↓
loadCourseRes()     — 预加载 pages 中声明的所有资源
    ↓
loadCourseMainJs()  — eval() 注入 LessonXXX.js
    ↓
实例化主类          — new Main()（由课件 JS 末尾自动执行）
    ↓
VipThink.__init__() — 课件内部调用，启动 sdk_baiya 业务逻辑
```

### 关键事实

**课件 JS 通过 `window.eval()` 注入，不是 `<script>` 标签**
```javascript
window.eval(data + "//# sourceURL=" + courseInfo.mainJsPath);
```

**两种启动模式**

| 模式 | 配置 | 说明 |
|------|------|------|
| 新模式（推荐） | `isFinalConfig: true` + `autoRunMain: true` | JS 末尾自带 `new Main()`，eval 后自动启动 |
| 旧模式 | `autoRunMain: false` | GameLoader 手动 `eval("new " + mainClsName + "()")` |

**课件 ID 与路径映射**
```
课件 ID:    s9_v8_89
URL:        lessons/Math/V8/YZ/S9/s9_v8_89_LessonZK
fullName:   s9_v8_89_LessonZK
mainClsName: LessonZK（URL 最后一个 _ 之后的部分）
mainJsPath: LessonZK.js
```

---

## 二、SDK 选择逻辑

### 默认选择路径

`GameLoader` 并不是固定加载 `sdk_baiya.js`，而是先经过 `SubjectLogic.init()` 选择 SDK：

- `Laya.isVersion2 === true` → `share/sdk/sdk_baiya_base2.js`
- `Laya.isVersion2 === false` → `share/sdk/sdk_baiya_base.js`

关键位置：`preview-server/libs/GameLoader.max.js:1799-1822`

同时会按学科追加 `subSdkUrl`：
- 数学 → `share/sdk/sdk_baiya_math.js`
- 英语 → `share/sdk/sdk_baiya_english.js`
- 语文 → `share/sdk/sdk_baiya_chinese.js`

### 切换到完整 SDK 的路径

切到完整运行时不是默认行为，而是 `SubjectLogic.oldSdkTest()` / `subSdkTest()` 触发的灰度分支：

- `Laya.isVersion2 === true` → `share/sdk/sdk_baiya2.js`
- `Laya.isVersion2 === false` → `share/sdk/sdk_baiya.js`

关键位置：`preview-server/libs/GameLoader.max.js:2000-2005`

触发条件依赖后台 `sdkConfig`：
- `oldSdkTestParam`
- `subSdkTest`
- `subSdkTestParam`
- `subSdkTestUids`
- `unSdkTestParam`
- 当前 `coursewareCode/course`
- 当前 `uid/id`

### 本次排查结论

在 forge 预览环境里，`GameLoader` 默认选中了：

- `share/sdk/sdk_baiya_base.js`

这条路径会导致预览运行在一份更“基础”的 SDK 上，而不是 `share/sdk/sdk_baiya.js` 那份更完整的运行时。

最终落地方案不是继续 patch `sdk_baiya_base.js`，而是在 forge 预览入口显式追加 `sdk=full`，再由 `GameLoader.max.js` 优先识别该参数并强制切到：

- `share/sdk/sdk_baiya.js`
- 或 `share/sdk/sdk_baiya2.js`

这样只影响 forge 预览，不影响默认运行时选择逻辑，也避免长期维护 base 版上的临时补丁。

鼠标同步问题最终不是课件 JS 主链路造成的，而是这份 `sdk_baiya_base.js` 的 cursor 事务链路缺失：

1. `SendCursorTrans` 没有把 `cursorData` 组进 `req.list`
2. `cursorData` 没有映射到 `handleCursor`
3. `HandleCursorTrans` 没有进入初始化列表

因此，后续如果要彻底收口，不应继续长期 patch `sdk_baiya_base.js`，而应优先确认：

- 真实可用课件最终加载的是 `sdk_baiya.js` 还是 `sdk_baiya_base.js`
- forge 预览是否应该走和真实课件一致的 SDK 选择路径

---

## 三、finalConfig.json 完整格式

### 顶层结构

```json
{
  "isFinalConfig": true,
  "autoRunMain": true,
  "release": "dev",
  "feedback": "spirit",
  "pages": []
}
```

| 字段 | 类型 | 必须 | 说明 |
|------|------|------|------|
| isFinalConfig | Boolean | ✅ | 固定 true，标识新模式 |
| autoRunMain | Boolean | ✅ | 固定 true，自动启动主类 |
| release | String | — | `"dev"` / `"official"` |
| feedback | String | — | 反馈系统类型，通常 `"spirit"` |
| pages | Array | ✅ | 关卡数组 |

### pages 数组 — 自定义关卡

```json
{
  "name": "lt1",
  "subviews": [
    {
      "view": "view/game_lt/GameLT1.ts",
      "param": "1",
      "classType": "lt"
    }
  ],
  "res": [
    { "url": "game_lt/image/bigImg/img_1.jpg", "type": "image" },
    { "url": "res/atlas/game_lt/image/common.atlas" }
  ]
}
```

### pages 数组 — 内置视频关卡

```json
{
  "type": "video",
  "classType": "gc",
  "param": {
    "isv5": 1,
    "isAutoPlay": 1,
    "vName": "wtts22901be6"
  }
}
```

### pages 数组 — 小老师任务

```json
{
  "type": "littleTeacher",
  "classType": "xlsrw",
  "param": {
    "no_horn": 1,
    "mainskin": "game_lt/image/img_xlssp.jpg",
    "datadesc": "请你来当小老师，给爸爸妈妈讲一下这道题目吧！",
    "datasound": "",
    "datasize": 41
  }
}
```

### classType 枚举

| classType | 含义 | 说明 |
|-----------|------|------|
| `fm` | 封面 Cover | 课件开始的封面页 |
| `lt` | 讲题 Lecture | 老师讲解题目 |
| `lx` | 练习 Exercise | 学生练习题目 |
| `gc` | 过场 Transition | 过场视频或动画 |
| `zj` | 总结 Summary | 课程总结 |
| `swdt` | 思维导图 | 知识点总结 |
| `xlsrw` | 小老师任务 | 学生讲解题目 |

---

## 三、课件 JS 文件（LessonXXX.js）结构

### 整体骨架

```javascript
(function () {
    'use strict';

    // TypeScript helpers
    var __extends = (this && this.__extends) || (function () { ... }());

    // 1. 注册 UI 类
    var REG = Laya.ClassUtils.regClass;
    REG("ui.game_lt.GameCoverUI", GameCoverUI);

    // 2. 定义 UI 类（继承 Laya.View）
    var GameCoverUI = (function (_super) {
        __extends(GameCoverUI, _super);
        function GameCoverUI() { GameCoverUI.super(this); }
        GameCoverUI.uiView = {
            "type": "KlBox",
            "props": { "width": 1920, "height": 1080 },
            "child": [ ... ]
        };
        return GameCoverUI;
    }(Laya.View));

    // 3. 注册逻辑类
    var reg = Laya.ClassUtils.regClass;
    reg("view/game_lt/GameCover.ts", GameCover);

    // 4. 定义逻辑类（继承 KlView）
    var GameCover = (function (_super) {
        __extends(GameCover, _super);
        function GameCover() { GameCover.super(this); }
        GameCover.prototype.initView = function (byReset) {
            GameCover.super.prototype.initView.call(this, byReset);
            // 绑定事件、初始化数据
        };
        return GameCover;
    }(KlView));

    // 5. 主类
    var Main = (function () {
        function Main() { /* 初始化 */ }
        return Main;
    }());

    // 6. 自启动（autoRunMain = true 时必须）
    new Main();
}());
```

### 必须包含的元素

| 元素 | 必须 | 说明 |
|------|------|------|
| IIFE 包裹 | ✅ | `(function() { ... }())` |
| `'use strict'` | ✅ | 严格模式 |
| UI 类注册 | ✅ | `REG("ui.xxx", UIClass)` |
| UI 类定义 | ✅ | 继承 `Laya.View`，含 `uiView` 静态属性 |
| 逻辑类注册 | ✅ | `reg("view/xxx.ts", LogicClass)`，路径须与 finalConfig 一致 |
| 逻辑类定义 | ✅ | 继承 `KlView`，实现 `initView()` |
| 主类 | ✅ | `Main` 类 |
| 自启动 | ✅ | `new Main()` |

### uiView JSON 格式（Laya UI 树）

```json
{
  "type": "KlBox",
  "props": { "width": 1920, "height": 1080 },
  "child": [
    {
      "type": "KlLabel",
      "props": { "name": "title", "x": 100, "y": 50, "text": "你好", "fontSize": 32 }
    },
    {
      "type": "ScaleButton",
      "props": { "name": "btn_start", "x": 760, "y": 500, "width": 400, "height": 100, "label": "开始" }
    }
  ]
}
```

---

## 四、KlView 生命周期

### 状态机

```
null → loading → loaded → ctoring → willRecover → ctored → prepared
                                                              ↓
                                                    clearing → cleared → destroy
```

### 5 个核心方法

**`createChildren()`** — UI 构建入口
- 由 LayaAir 在资源加载完毕后自动调用
- 课件类无需重写

**`initView(byReset: Boolean)`** — 初始化页面 ⭐
- 首次加载和每次重置后调用
- **课件类必须重写，第一行必须调用 `super.initView(byReset)`**
```javascript
GameCover.prototype.initView = function (byReset) {
    GameCover.super.prototype.initView.call(this, byReset);
    this.btn_start.on(Laya.Event.CLICK, this, this.onStart);
};
```

**`reset(active, inGame)`** — 重置页面
- 用户点击重置、切换关卡前调用
- 内部调用 `clearView()` 再重新调用 `initView(true)`
- 课件类可选重写

**`beforeRecover(data)`** — 数据还原
- 多端同步时由 sdk_baiya 自动调用
- 课件类无需重写

**`clearView()`** — 清理视图
- 清除事件监听、动画、子节点
- 课件类无需重写，可重写 `onClear()` 钩子

### 完整流程

```
资源加载完毕
  → createChildren()
  → createView(uiView)    构建 UI 树
  → reset(active)
  → initView(false)       首次初始化
  → beforeRecover(data)   数据还原（如有）
  → [STATUS_PREPARED]     就绪，等待用户交互

用户点击重置
  → reset(active)
  → clearView()
  → onClear()
  → createChildren()
  → initView(true)        重置后初始化
```

---

## 五、资源版本机制

### version.json 格式

```json
{
  "lessons/Math/V8/YZ/S9/s9_v8_89_LessonZK/LessonZK.js":
    "lessons/Math/V8/YZ/S9/s9_v8_89_LessonZK/LessonZK2c3e16c6.js",
  "lessons/Math/V8/YZ/S9/s9_v8_89_LessonZK/game_lt/image/img.jpg":
    "lessons/Math/V8/YZ/S9/s9_v8_89_LessonZK/game_lt/image/img8f3a2b1c.jpg"
}
```

- Key：原始资源路径（相对 CDN 根目录）
- Value：带 MD5 前 8 位 hash 的实际路径
- Hash 插入位置：文件名与扩展名之间

### 转换器生成 version.json 的步骤

```typescript
// 1. 计算 MD5
const hash = crypto.createHash('md5').update(fileContent).digest('hex').slice(0, 8);

// 2. 构建映射
const versionMap = {};
for (const file of allFiles) {
    const hashed = file.replace(/(\.\w+)$/, `${hash}$1`);
    versionMap[`${cdnBase}/${file}`] = `${cdnBase}/${hashed}`;
}

// 3. 写入 version_{cid}.json
fs.writeFileSync(`version_${cid}.json`, JSON.stringify(versionMap));

// 4. 重命名实际文件
for (const [orig, hashed] of Object.entries(versionMap)) {
    fs.renameSync(orig, hashed);
}
```

---

## 六、三端差异

| 维度 | iPad | PC | Android |
|------|------|-----|---------|
| 运行时 | LayaNative iOS | LayaNative PC | LayaNative Android |
| 资源缓存 | 本地文件系统 | 本地文件系统 | 本地文件系统 |
| 视频播放 | 系统原生播放器 | HTML5 `<video>` | 系统原生播放器 |
| 键盘 | 系统键盘 | KlBaseKeyboard | 系统键盘 |
| Native Bridge | `window.conch` | `window.conch` | `window.conch` |

**结论：** 资源路径差异由 native 层透明处理，课件 JS 无需关心三端差异。KlInputBox 和 KlBaseKeyboard 已封装键盘差异。
