# sdk_baiya 视图架构文档

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 来源：`sdk_baiya_as3_prod_2.0/src/com/klzz/ui/` + `src/com/biz/VipThink.as`  
> 更新日期：2026-04-23

---

## 一、类层次总览

```
ViewManager（单例）
  └─ MainView（extends PageView）
       └─ _viewList: Vector.<PageView>
            └─ PageView[i]（extends KlView）
                 └─ _viewList: Vector.<KlView>
                      └─ KlView（游戏/动画/图片）
```

对应 finalConfig.json 结构：

```
pages[i]                    → PageView[i]
  subviews[j]               → KlView[j]（游戏逻辑类）
    view: "path/to/Game.ts" → ClassUtils.getInstance(ctorParam)
```

---

## 二、ViewManager

**文件：** `src/com/klzz/ui/ViewManager.as`
**模式：** 单例（`ViewManager.instance`）

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| _mainView | MainView | 主视图引用 |
| _root | Sprite | 根显示容器 |
| stage | Stage | Laya Stage 引用 |
| viewCfgList | Vector.\<ViewCfgVO\> | 页面配置列表（从 finalConfig 解析） |
| _oldIndices | Array | 上一次的 [pageIdx, subviewIdx] |
| _initComplete | Boolean | 是否初始化完成 |

### 核心方法

```actionscript
// 初始化（由 VipThink.__init__() 调用）
__init__(mv:MainView):ViewManager

// 页面导航（对外 API）
setCurrPageIdx(idxp:int, idxv:int = 0, force:Boolean = false):void
jumpToPage(idxp:int, idxv:int, force:Boolean):void

// 组件定位
getCompByXpath(path:String, pageIdx:int = -1, viewIdx:int = -1):Node
getXpathByComp(comp:Sprite, addPagePrefix:Boolean = false):String

// 重置当前页
reset(active:Boolean = false, param:Object = null):void
```

### 事件

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| `INIT_COMPLETE` | 初始化完成 | - |
| `Event.CHANGE` | 即将切换页面 | - |
| `Event.CHANGED` | 页面切换完成 | [oldPageIdx, oldSubviewIdx, newPageIdx, newSubviewIdx, force] |
| `"wiilJumpPage"` | 切换前询问（可拦截） | handler 回调 |

### 页面切换流程

```
setCurrPageIdx(pageIdx, subviewIdx)
    ↓
验证索引合法性
    ↓
触发 "wiilJumpPage" 事件（监听者可拒绝）
    ↓
jumpToPage()
    ↓
MainView.currIndices = [pageIdx, subviewIdx]
    ↓
触发 Event.CHANGED
```

---

## 三、MainView

**文件：** `src/com/klzz/ui/MainView.as`
**继承：** `PageView → KlView → View`

MainView 是整个课件的根视图，管理所有 PageView 实例。

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| _pageCfgList | Vector.\<ViewCfgVO\> | 所有页面配置 |
| _indices | Array | 当前 [pageIdx, subviewIdx] |
| _indicesBeforeCutPage | Array | 切换前的索引（用于回放） |
| lastPageIdxs | Array | 上一次的页面索引 |
| preloadNum | int | 预加载页数（默认 1） |
| activeResetPage | Boolean | 是否为主动切换（vs 被动同步） |
| _removeIdx | Array | 待移除页面的索引 |

### 核心 Setter/Getter

```actionscript
// 设置页面配置列表（触发所有 PageView 构建）
set pageCfgList(v:Vector.<ViewCfgVO>):void

// 设置当前索引（触发页面切换 + 同步）
set currIndices(idxs:Array):void
get currIndices():Array

// 不触发同步的跳转（本地跳转）
set currIndicesUnSync(indices:Array):void

// 当前子视图
get currSubview():KlView
get currSubviewIdx():int
```

### 与 PageView 的关系

- MainView **继承** PageView，自身也是一个 PageView
- `_viewList` 中存放的是各个 `PageView` 实例（每个对应一个 pages[i]）
- `currViewIdx` 切换当前显示的 PageView
- 切换时旧 PageView 加入 `_removeIdx`，新页面显示后销毁旧页面

### 与同步机制的关系

```actionscript
set currIndices(idxs:Array):void {
    var old:Array = _indices.concat();
    _indices = idxs;
    // ... 切换页面 ...
    sync("currIndices", old, _indices);  // 同步到学生端
    CourseDataUtil.setData(TYPE_CURRINDICES, _indices);  // 持久化
}
```

---

## 四、PageView

**文件：** `src/com/klzz/ui/PageView.as`
**继承：** `KlView → View`

PageView 对应 finalConfig.json 中的一个 page 条目，管理该页内的所有子视图（subviews）。

### 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| _viewList | Vector.\<KlView\> | 子视图列表（对应 subviews） |
| _currViewIdx | int | 当前子视图索引 |
| _isResLoaded | Boolean | 资源是否已加载 |
| config | ViewCfgVO | 本页配置对象 |

### 核心方法

```actionscript
// 切换子视图
set currViewIdx(v:int):void
get currView():KlView

// 子视图管理
getViewAt(idx:int):KlView
removeView(idx:int, destroy:Boolean):void
removeAllView(destroy:Boolean):void

// 资源加载完成回调
onPageResLoaded(idx:int):void

// 工厂方法（根据 ViewCfgVO.type 创建对应视图）
static createKlView(cfg:ViewCfgVO, idx:int, pv:PageView):KlView
```

### ViewCfgVO.type → 视图类映射

| type 值 | 创建的视图类 |
|---------|------------|
| `"game"` | `ClassUtils.getInstance(cfg.ctorParam)`（课件逻辑类） |
| `"img"` | `KlImgView` |
| `"animation"` / `"DialogAni"` | `KlSkePlayer` |
| `"video"` | `VideoView` |
| `"littleTeacher"` | `LittleTeacherView` |
| `"ch_littleTeacher"` | `ClassUtils.getInstance(cfg.ctorParam)` |
| `"rushResult"` | `RushResultView` |
| `"parkResult"` | `ParkResultView` |
| `"evaGuide"` | `EvaGuide` |
| `"evaGuide_v4"` | `EvaGuideV4` |
| `"ascendCeremonyV3"` | `AscendCeremonyV3` |

### classType 与 type 的关系

`classType`（lt/gc/lx/fm/zj/swdt/xlsrw）是 forge 编辑器层面的分类标识，传入 `param` 字段，由具体游戏类内部处理。视图框架本身只关心 `type` 字段。

---

## 五、ViewCfgVO

页面配置值对象，对应 finalConfig.json 中的一个 page 条目。

```actionscript
class ViewCfgVO {
    var name:String;           // 页面名称
    var type:String;           // 视图类型（见上表）
    var ctorParam:String;      // 游戏类路径（type="game" 时使用）
    var param:Object;          // 传给游戏类的参数
    var res:Array;             // 需要预加载的资源列表
    var subViews:Vector.<ViewCfgVO>;  // 子视图配置（多题页）
    var expand:String;         // 扩展类型（plotToGame/rush 等）
    var knowledge:int;         // 知识点 ID
    var difficulty:int;        // 难度
    var videoUrl:String;       // 视频 URL
    var musicUrl:String;       // 背景音乐 URL
}
```

---

## 六、VipThink.__init__() 完整流程

```
GameLoader eval() 注入 LessonXXX.js
    ↓
new Main()（IIFE 末尾自动执行）
    ↓
Main 构造函数调用 VipThink.__init__()
    ↓
Klzz.__init__(1920, 1080, MySocketHandler, MyTransMgr, MyViewManager)
    ↓
NativeAPI.__init__()  ← 建立与 Native 层的通信
    ↓
NativeAPI 回调：接收启动参数（config）
    ↓
GameMgr.instance.init(config)
ResManager.__init__()
    ↓
loadBaseRes()  ← 加载 config.json（或 finalConfig.json）
    ↓
onBaseResLoaded()
    ↓
GameMgr.getCfgHandler().getPageCfg(config.courseCfg)
    → 解析 pages 数组 → Vector.<ViewCfgVO>
    ↓
ViewManager.viewCfgList = pcfg
ResManager.pageConfig = pcfg
    ↓
TransManager.doTrans(TransType.PREPARE)
    ↓
MainView.pageCfgList = viewCfgList
    → 构建所有 PageView
    → 加载第一页资源
    → 显示第一页
    ↓
ViewManager.initComplete = true
    → 触发 INIT_COMPLETE 事件
```

---

## 七、forge 编辑器的对应实现

forge 编辑器目前没有实现完整的 ViewManager/MainView/PageView 层，而是直接在 Laya stage 上管理元素。

完整实现路径：

| sdk_baiya 概念 | forge 对应 |
|---------------|-----------|
| ViewManager | `editorStore.ts` 中的页面管理逻辑 |
| MainView | 整个 Canvas 组件 |
| PageView | 单个 Page（`currentPage`） |
| KlView（游戏类） | 单个 Element 的 Laya 组件 |
| ViewCfgVO | `Page` 类型 |
| finalConfig.json | 序列化导出目标 |

导出时，forge 需要将 `Page[]` 转换为 `finalConfig.json` + `LessonXXX.js`，其中每个 Page 对应一个 `pages[i]`，每个 Element 对应 Laya UI JSON 中的一个节点。
