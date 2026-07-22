# sdk_baiya 同步机制文档

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 来源：`sdk_baiya_as3_prod_2.0/src/com/klzz/`  
> 更新日期：2026-04-23

---

## 一、整体架构

sdk_baiya 的同步机制负责将教师端的操作实时同步到学生端（以及录制/回放）。

```
教师端操作
    ↓
组件属性变更（comp.prop = newVal）
    ↓
ISyncComp.sync(prop, oriVal, toVal)
    ↓
TransManager.doTrans(TransType.SYNC, ...)
    ↓
MySocketHandler.send(syncMsg)
    ↓
学生端接收 → 找到对应组件（xpath） → 设置属性
```

---

## 二、ISyncComp 接口

所有可同步组件必须实现此接口：

```actionscript
public interface ISyncComp {
    // 触发属性同步
    function sync(prop:String, oriVal:*, toVal:*, cls:String = null):void;

    // 不参与同步的属性列表（逗号分隔）
    function set unSyncProps(props:String):void;
    function get unSyncProps():String;
}
```

### sync() 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| prop | String | 属性名，如 `"text"`, `"selected"`, `"currIndices"` |
| oriVal | * | 变更前的值 |
| toVal | * | 变更后的值 |
| cls | String | 可选，自定义命令类名（覆盖默认同步行为） |

### 典型调用方式

```javascript
// 组件内部 setter 中调用
set text(v:String):void {
    var old:String = _text;
    _text = v;
    // ... 更新显示 ...
    sync("text", old, v);   // 触发同步
}
```

### unSyncProps

用于排除不需要同步的属性，如动画状态、临时视觉效果：

```javascript
// ScaleButton 排除缩放动画属性
comp.unSyncProps = "scaleX,scaleY";
```

---

## 三、xpath 机制

xpath 是组件在视图树中的唯一路径标识，用于跨端定位组件。

### 格式

```
page_X.page_X_view_Y.componentName.childName
```

或带页面索引前缀：

```
pageidx:X_Y.componentName
```

### 计算方式

```actionscript
// ViewManager.getXpathByComp()
public function getXpathByComp(comp:Sprite, addPagePrefix:Boolean = false):String {
    var path:Array = [];
    var node:Sprite = comp;
    while (node && node !== _root) {
        if (node.name) path.unshift(node.name);
        node = node.parent as Sprite;
    }
    var xpath:String = path.join(".");
    if (addPagePrefix) {
        xpath = "pageidx:" + currPageIdx + "_" + currSubviewIdx + "." + xpath;
    }
    return xpath;
}
```

### 反向查找

```actionscript
// ViewManager.getCompByXpath()
public function getCompByXpath(path:String, pageIdx:int = -1, viewIdx:int = -1):Node {
    // 解析 path，定位到对应 PageView → KlView → 子组件
}
```

---

## 四、TransManager

事务管理器，负责将同步操作排队、执行、回放。

### 核心方法

```actionscript
// 执行事务
TransManager.doTrans(
    flag:String,              // 事务类型，如 TransType.SYNC
    onCompleteParam:Array,    // 完成回调参数
    transParam:Array          // 事务参数 [xpath, prop, oriVal, toVal, cls]
):ITransaction

// 注册自定义事务类
TransManager.regTransCls(type:String, cls:Class):void

// 停止事务
TransManager.stopTrans(trans:ITransaction):Boolean
```

### 事务类型（TransType）

| 常量 | 说明 |
|------|------|
| `SYNC` | 属性同步 |
| `PREPARE` | 初始化准备 |
| `JUMP_PAGE` | 页面跳转 |
| `RESET` | 重置页面 |

### 同步事务流程

```
sync(prop, oriVal, toVal)
    ↓
计算当前组件的 xpath
    ↓
TransManager.doTrans(TransType.SYNC, null, [xpath, prop, oriVal, toVal, cls])
    ↓
SyncTransaction.execute()
    ↓
MySocketHandler.send({ xpath, prop, toVal, ... })
    ↓
对端接收 → ViewManager.getCompByXpath(xpath) → comp[prop] = toVal
```

---

## 五、师生数据流

### 教师 → 学生（实时同步）

```
教师操作组件
    → ISyncComp.sync()
    → TransManager → Socket → 学生端
    → 学生端 ViewManager.getCompByXpath()
    → 找到对应组件
    → 直接设置属性（不再触发 sync，避免循环）
```

### 学生 → 教师（答题数据）

```
学生提交答案
    → CourseDataUtil.setData(key, value)
    → 数据持久化到本地
    → 通过 NativeAPI 上报给服务端
    → 教师端通过 DataCaptureManager 接收
```

### 页面跳转同步

```
教师点击下一页
    → ViewManager.setCurrPageIdx(idx)
    → MainView.currIndices = [pageIdx, subviewIdx]
    → MainView.sync("currIndices", oldIdx, newIdx)
    → 学生端同步跳转
```

---

## 六、录制与回放

### 录制

- 所有 `sync()` 调用都被 `RecordManager` 拦截并记录时间戳
- 格式：`{ time: 1234, xpath: "...", prop: "text", val: "hello" }`
- 存储为 JSON 数组

### 回放

- `PlaybackController` 按时间戳顺序重放同步事件
- 通过 `ViewManager.getCompByXpath()` 找到组件并设置属性
- 页面跳转通过 `ViewManager.setCurrPageIdx()` 执行

---

## 七、Action 系统

Action 是课件内部的事件响应机制（与网络同步无关，是本地交互逻辑）。

### Action 结构

```typescript
type Action = {
    event: 'onClick' | 'onLoad' | 'onChange';  // 触发事件
    actionType: 'toggleVisible' | 'setProperty' | 'changePage';  // 动作类型
    targetId?: string;    // 目标组件 ID（默认为自身）
    property?: string;    // setProperty 时的属性名
    value?: unknown;      // setProperty 时的新值 / changePage 时的页码
};
```

### 执行流程（forge 编辑器中）

```typescript
// layaBridge.ts 中的预览模式
function _executePreviewAction(action: Action, selfId: string): void {
    const targetId = action.targetId ?? selfId;
    switch (action.actionType) {
        case 'toggleVisible':
            obj.alpha = obj.alpha > 0 ? 0 : 1;
            break;
        case 'setProperty':
            el[action.property] = action.value;
            applyProps(obj, el);
            break;
        case 'changePage':
            previewGoToPage(Number(action.value));
            break;
    }
}
```

### 与 sdk_baiya 的对应关系

sdk_baiya 中没有独立的 "Action" 概念，对应逻辑分散在：
- 课件 JS 的 `initView()` 中手动绑定事件
- `KlView` 的生命周期钩子
- `TransManager` 的事务系统

forge 编辑器的 Action 系统是对这些模式的可视化抽象。

---

## 八、unSyncProps 参考

常见需要排除同步的属性：

| 组件 | unSyncProps | 原因 |
|------|-------------|------|
| ScaleButton | `"scaleX,scaleY"` | 点击缩放动画，不需要同步 |
| TwinkleBox | `"PLAYING"` | 本地动画状态 |
| BrushSprite | `"brushMode"` | 画笔模式为本地设置 |
| KlInputImage | `"isSelected"` | 选中状态为本地 UI 状态 |

---

## 九、forge 编辑器集成要点

当 forge 编辑器生成课件时，同步机制由 sdk_baiya 自动处理，课件 JS 无需手动调用 `sync()`。

关键点：
1. 组件属性通过 setter 赋值时自动触发同步
2. `unSyncProps` 用于排除纯视觉属性
3. 组件必须有唯一的 `name` 属性，否则 xpath 无法定位
4. 页面跳转通过 `ViewManager.setCurrPageIdx()` 而非直接操作 MainView

---

## 十、运行时 SDK 差异与本次排查结论

### 1. 真实课件包与运行时壳子是分离的

在上层目录 `/Users/wills/code/vipthink/resource/s9_v8_89_LessonZK/` 中可以找到真实课件包，例如：

- `finalConfigb0579747.json`
- `config_s9_v8_89_preview81596251.json`
- `LessonZK2c3e16c6.js`

这些文件证明真实课件包本身是完整的，包含：
- 正课 `finalConfig`（`fm/lt/lx/gc/zj/swdt/xlsrw`）
- 预习 `config_preview`（`mode: "preview"`）
- 编译后的主课件 JS

但它们**不决定最终加载哪一份 baiya SDK**。SDK 选择发生在外部 `GameLoader.max.js` 中，而不是课件包内部。

### 2. forge 预览问题的真正来源

本次排查确认：

- 登录成功
- `lessonStart -> EnterRoom` 链路正常
- 教师端和学生端都成功进入同一房间
- 服务端可收到同步消息

真正的问题出在 **GameLoader 默认把 forge 预览带到了 `share/sdk/sdk_baiya_base.js` 这条运行时路径**。

而这份实际加载的 SDK 在 cursor 同步上缺了 3 个环节：

1. `SendCursorTrans` 不组 `cursorData`
2. `cursorData` 不映射到 `handleCursor`
3. `HandleCursorTrans` 不在初始化列表里

这就是为什么会依次出现：
- 学生端收不到鼠标 frame
- 补发送后收到大量数据，但 `NoticeHandler` 不能处理
- 补接收分发和事务注册后，鼠标才能真正移动

### 3. 当前结论

因此，这次鼠标同步问题的核心并不是：
- forge 课件主逻辑错误
- socket 底层通讯错误
- 登录或 EnterRoom 主流程错误

而是：

**GameLoader 为 forge 预览选择了一个更基础的 SDK 路径，而不是完整课件运行时路径。**

后续更合理的治理方向是：
- 确认真实课件在真实壳子里最终选中的 sdkUrl
- 让 forge 预览走同一条 SDK 选择路径
- 避免长期继续 patch `sdk_baiya_base.js`

本次已经验证可行的落地方案是：
- `Toolbar.tsx` 在预览 URL 上追加 `sdk=full`
- `preview-server/libs/GameLoader.max.js` 优先识别 `sdk=full`
- 命中后直接加载 `share/sdk/sdk_baiya.js`（v2 时为 `sdk_baiya2.js`）
- 不再走默认的 `sdk_baiya_base.js` / `sdk_baiya_base2.js` 路径

这个方案的优点是只影响 forge 预览环境，能快速对齐完整 SDK 行为，不会把临时 cursor 修补长期留在 base 版运行时里。

`sdk=full` 同时意味着 GameLoader 不再加载 `sdk_baiya_math.js`。因此，数学 SDK 中与完整 SDK 重叠的运行行为必须显式保持一致；当前豌豆精灵反馈的胜利、失败和遗憾音效已经同步到 `sdk_baiya.js`。不能为了恢复学科反馈直接移除 `sdk=full`，否则 cursor 接收事务会再次缺失。

