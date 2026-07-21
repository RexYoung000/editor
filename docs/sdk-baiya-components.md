# sdk_baiya 组件文档

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 来源：`sdk_baiya_base_prod_2.0` 源码 + `sdk_baiya_base.js` 编译产物  
> 更新日期：2026-07-21

所有组件均实现 `ISyncComp` 接口，属性变更时自动触发三端同步。

## forge 编辑器接入约束

- 所有组件统一声明在 `src/elements/elementMeta.ts`。`runtime`、`exportChildren`、`exportWrapper` 和 `placeholderImage` 同时承担编辑、预览与导出能力，不建立旁路元数据。
- 新组件字段写入 `Element.props` 并在 metadata 中声明；`_` 前缀属性只用于编辑器皮肤生成，导出前必须剥离。
- `src/utils/laya/core.ts` 持有 Laya 对象单例 map 和 `_previewMode`；编辑模式通过 `src/utils/laya/components.ts` 的 `createLayaComponent` 避免真实 sdk 组件崩溃、自动播放或干扰编辑，预览模式由 `setPreviewMode(true)` 实例化真实组件。
- `TextInput`、`DragViewBox`、`DropObj` 编辑时使用 `Box` 占位；`TextArea` 使用 `Label`；`SoundButton` 使用 `Image`；`Spine` 使用原生 `Laya.Skeleton`。带 `meta.placeholderImage` 的组件统一使用 `Image`。
- `NewTextArea` 导出时由 `bakeTextElements()` 烘焙成 PNG，最终课件不保留 `TextArea`。
- `applyKlProps` 必须在 `skin` 前应用 `stateNum` 和 `sizeGrid`，因为 sdk_baiya 的 `skin` 赋值会触发内部渲染。
- `share/comp/...` 皮肤前缀表示自动生成默认皮肤，其他路径按真实资源处理。
- `index.html` 必须在 React 启动前同步加载 `/libs/GameLoader.max.js` 和 `/libs/sdk_baiya_base.js`，不能改为懒加载。

---

## 公共基础属性

所有组件都继承以下属性（来自 Laya Sprite / UIComponent）：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| x | Number | 0 | X 坐标 |
| y | Number | 0 | Y 坐标 |
| width | Number | - | 宽度 |
| height | Number | - | 高度 |
| scaleX | Number | 1 | X 轴缩放 |
| scaleY | Number | 1 | Y 轴缩放 |
| rotation | Number | 0 | 旋转角度 |
| alpha | Number | 1 | 透明度 |
| visible | Boolean | true | 是否可见 |
| zOrder | Number | 0 | 层级 |
| mouseEnabled | Boolean | true | 是否响应鼠标 |
| name | String | - | 组件名称（用于 Action 引用） |

---

## 文本类

### KlLabel

继承：`Label → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | String | "" | 文本内容 |
| color | String | "#000000" | 文本颜色 |
| fontSize | Number | 12 | 字体大小 |
| font | String | - | 字体名称 |
| bold | Boolean | false | 粗体 |
| italic | Boolean | false | 斜体 |
| align | String | "left" | 水平对齐（left/center/right） |
| valign | String | "top" | 垂直对齐（top/middle/bottom） |
| wordWrap | Boolean | false | 自动换行 |
| leading | Number | 0 | 行间距 |
| bgColor | String | - | 背景颜色 |
| borderColor | String | - | 边框颜色 |
| stroke | Number | 0 | 描边宽度 |
| strokeColor | String | "#000000" | 描边颜色 |
| padding | String | "0,0,0,0" | 内边距（上,右,下,左） |
| overflow | String | "hidden" | 溢出处理 |

---

## 按钮类

### KlButton

继承：`Button → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | String | "" | 按钮文本 |
| skin | String | - | 按钮皮肤图片 |
| selected | Boolean | false | 是否选中 |
| disabled | Boolean | false | 是否禁用 |
| gray | Boolean | false | 是否灰显 |
| labelColors | String | - | 各状态文字颜色（逗号分隔） |
| fontSize | Number | - | 字体大小 |
| bold | Boolean | false | 粗体 |
| stateNum | Number | 3 | 皮肤状态数（1/2/3） |

### ScaleButton

继承：`KlButton`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| scaleTime | Number | 80 | 缩放动画时长（ms） |
| isScaleBig | Boolean | false | 是否放大状态 |
| isNeedSound | Boolean | true | 点击时播放声音 |
| isChangeSmall | Boolean | false | 点击变小模式 |
| showInStu | Boolean | true | 学生端是否显示 |
| unSyncProps | String | "scaleX,scaleY" | 不同步属性 |

方法：`playClickSound()`

### SoundButton

继承：`ScaleButton`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| soundPath | String | "" | 音频文件路径 |
| isNeedAni | Boolean | false | 是否需要动画 |
| isShowAni | Boolean | true | 是否显示动画 |

方法：`stopSound()`

---

## 输入类

### KlInputImage

继承：`KlImage`（单个可键盘输入的图片输入格）

| 属性 | 类型 | 说明 |
|------|------|------|
| `fontClipValue` | String | 当前输入内容 |
| `valueOrSkinIsNull` | Boolean | 当前内容是否为空 |
| `place` | Number | 可输入位数 |

`KlInputImage` 没有 `isRight()`、`isNull()` 或 SDK `answer` 属性。forge 允许独立输入格作为判定目标：正确答案保存在编辑器专用 `_judgeAnswer`，导出时比较 `fontClipValue`，并用 `valueOrSkinIsNull` 区分未完成；`_judgeAnswer` 不写入运行时 scene。

### KlTextInput

继承：`TextInput → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | String | "" | 输入内容 |
| prompt | String | "" | 占位提示文字 |
| fontSize | Number | - | 字体大小 |
| color | String | - | 文字颜色 |
| maxChars | Number | 0 | 最大字符数（0=不限） |
| restrict | String | - | 输入限制正则 |
| editable | Boolean | true | 是否可编辑 |
| multiline | Boolean | false | 是否多行 |

### KlInputBox

继承：`KlBox`（输入框容器，包含多个 KlInputImage）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| answer | String | - | 正确答案 |
| curIsRight | Boolean | false | 当前是否正确 |
| curIsNull | Boolean | true | 当前是否为空 |

方法：`isRight()`, `isNull()`, `getAllInputs()`, `getWrongIdx()`

事件：`INPUT_LATER`

#### v1.2.0 计划扩展（尚未实施）

[Issue #74](https://github.com/RexYoung000/editor/issues/74) 将新增可视化分数输入框，并与普通输入框按键盘兼容性分别绑定；一个分数固定占外框 3 个逻辑字符位，分子与分母各最多 4 位，外框缩放只改变显示尺寸，不改变老师配置的最大字符数。

[Issue #72](https://github.com/RexYoung000/editor/issues/72) 将在同一个填空题判定目标内部增加多套完整答案方案和指定空位互换规则。该计划不等于 SDK 当前已经提供多目标聚合 API；实现需要保持编辑器、预览和导出结果一致。

---

## 图片类

### KlImage

继承：`Image → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| skin | String | - | 图片资源路径 |
| sizeGrid | String | - | 九宫格切割参数 |
| group | Number | - | 分组 |
| anchorX | Number | 0 | X 轴锚点（0-1） |
| anchorY | Number | 0 | Y 轴锚点（0-1） |
| skewX | Number | 0 | X 轴倾斜 |
| skewY | Number | 0 | Y 轴倾斜 |
| disabled | Boolean | false | 是否禁用 |
| gray | Boolean | false | 是否灰显 |

---

## 容器类

### KlBox

继承：`Box → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| disabled | Boolean | false | 是否禁用 |
| gray | Boolean | false | 是否灰显 |
| anchorX | Number | 0 | X 轴锚点 |
| anchorY | Number | 0 | Y 轴锚点 |

### KlHBox

继承：`HBox → ISyncComp`（水平自动布局容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| space | Number | 0 | 子元素间距 |
| align | String | "top" | 垂直对齐 |

### KlVBox

继承：`VBox → ISyncComp`（垂直自动布局容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| space | Number | 0 | 子元素间距 |
| align | String | "left" | 水平对齐 |

---

## 选择类

### KlCheckBox

继承：`CheckBox → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | String | "" | 标签文本 |
| selected | Boolean | false | 是否选中 |
| skin | String | - | 皮肤图片 |
| labelColors | String | - | 各状态文字颜色 |
| fontSize | Number | - | 字体大小 |

### KlRadio

继承：`Radio → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | String | "" | 标签文本 |
| selected | Boolean | false | 是否选中 |
| skin | String | - | 皮肤图片 |
| value | String | - | 选项值 |

### KlRadioGroup

继承：`RadioGroup → ISyncComp`

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| selectedIndex | Number | -1 | 选中项索引 |
| selectedValue | String | - | 选中项值 |
| labels | String | - | 标签列表（逗号分隔） |
| values | String | - | 值列表（逗号分隔） |
| skin | String | - | 皮肤图片 |
| space | Number | 0 | 间距 |
| direction | String | "horizontal" | 排列方向 |

### ChoiceBox

继承：`KlBox`（多选容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| rightItemNames | String | - | 正确选项名（逗号/竖线分隔） |
| upperLimit | Number | 0 | 最多选几个（0=不限） |
| requireSel | Boolean | false | 是否要求至少选一个 |
| isRight | Boolean | false | 是否全部正确 |
| isNull | Boolean | true | 是否未选 |

方法：`cancelSel(name)`, `cancelAllSel()`, `pushSel(name)`, `getSelRetArray()`, `currSelObjs()`

#### v1.2.0 计划扩展（尚未实施）

[Issue #76](https://github.com/RexYoung000/editor/issues/76) 将在编辑器侧增加明确的单选/多选模式和按子选项元素引用保存的正确答案配置。单选模式限制一个答案；多选模式允许配置多个答案并做完整集合比较。现有 `rightItemNames` 和 `upperLimit` 仍是当前运行时事实，兼容或迁移方式需在实施 Issue 中确定，不能把计划字段当作当前 SDK 属性。

---

## 拖拽类

### DragObj

继承：`KlBox → IDragAndDrop`（可拖拽对象）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| group | String | "-1" | 分组标识 |
| rightDropObjName | String | - | 正确放置目标名称 |
| hasDrop | Boolean | false | 是否已放置 |
| canOverlayDrop | Boolean | false | 是否可与其他 DragObj 重叠 |
| isSelect | Boolean | false | 是否选中 |
| isMoveEvent | Boolean | true | 是否可移动 |
| canSelect | Boolean | false | 是否可选中 |
| filterColor | String | "#ffff00" | 选中滤镜颜色 |
| filterBlur | Number | 6 | 滤镜模糊度 |
| cusAttribute | * | - | 自定义属性 1 |
| cusAttribute1 | * | - | 自定义属性 2 |

### DropObj

继承：`KlBox → IDragAndDrop`（放置目标区域）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| group | String | "-1" | 分组标识 |
| hasDrop | Boolean | false | 是否已有对象放置 |
| isNeedTip | Boolean | true | 是否需要提示框 |
| showNotice | Boolean | false | 是否显示提示边框 |
| noticeColor | String | "#ff0000" | 提示颜色 |
| noticeBlur | Number | 4 | 提示模糊度 |
| arrangePos | Array | [] | 自动排列坐标 |
| getHitDrop | Boolean | true | 是否可吸附 |
| cusAttribute | * | - | 自定义属性 1 |
| cusAttribute1 | * | - | 自定义属性 2 |

方法：`clearTween()`

### DragView

继承：`KlView`（拖拽系统容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| mode | Number | 1 | 放置模式（0-3） |
| backToInitPos | Boolean | true | 放置失败返回原位 |
| changePos | Boolean | true | 放置成功改变位置 |
| autoSorting | Boolean | true | 自动排序 |
| reverseOrder | Boolean | false | 反向排序 |
| clickPlace | Boolean | false | 支持点击放置 |
| backAni | Boolean | true | 返回动画 |
| dropNotice | Boolean | true | 放置提示 |
| successPosMode | Number | 0 | 成功放置位置模式 |

方法：`reInit()`, `get dragUtil()`, `get dropObjList()`

---

## 游戏类

### MatchingGame

继承：`KlBox`（连线匹配游戏容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| mode | Number | 1 | 匹配模式（1-3） |
| direction | Number | 0 | 连线方向 |
| lineSkin | String | "share/ui/line1.png" | 连线皮肤 |
| lineHeight | Number | 15 | 连线高度 |
| wrongLineskin | String | "" | 错误连线皮肤 |
| single | Number | 0 | 单一模式（0/1） |

事件：`EVENT_ALLRIGHT`, `Event_RIGHT`, `EVENT_WRONG`, `EVENT_LINE`, `EVENT_CLICKLINE`

方法：`init()`

### MatchingItem

继承：`KlBox`（连线匹配项）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| camp | String | - | 阵营标识 |
| isSelected | Boolean | false | 是否选中 |
| connectableCamps | String | - | 可连接的阵营（逗号分隔） |
| rightItemNames | String | - | 正确连接项名称 |
| filterColor | String | "#ffff00" | 选中滤镜颜色 |
| filterBlur | Number | 10 | 滤镜模糊度 |

方法：`reset()`, `canConnectWith(item, single)`, `get isRight()`, `get hasLine()`

事件：`SELECTE`

---

## 特效类

### BrushSprite

继承：`KlSprite → ISyncComp`（画笔/白板）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| brushMode | Number | 1 | 画笔模式（1=随意 2=线段 3=矩形 4=圆形 5=点） |
| brushColor | String | "#ec0626" | 画笔颜色 |
| thickness | Number | 10 | 画笔粗细 |
| brushFillColor | String | null | 填充颜色（矩形/圆形模式） |
| thickTime | Number | 3 | 碰撞热区倍数 |

方法：`undoDraw()`, `redoDraw()`, `clearDraw()`, `getBrushDrawDate()`

### TwinkleBox

继承：`KlBox`（闪烁/动画容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| isTrue | Boolean | false | 是否激活 |
| PLAYING | Boolean | false | 是否正在播放 |

方法：
- `play(aniName, loop, alpha1, alpha2, timer, rate)` — 播放动画
- `stop()` — 停止
- `playShan()` — 闪烁动画
- `playSuo()` — 缩放动画
- `playZhuan()` — 旋转动画

动画名：`"shan"` / `"suo"` / `"zhuan"`

### CountDown

继承：`KlBox`（倒计时）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| allTime | Number | 60 | 总时间（秒） |
| play | Boolean | false | 是否播放 |
| type | Number | 0 | 方向（0=竖向 1=横向） |
| mode | Number | 0 | 模式（0=空白 1=铺满） |
| frames | Number | 30 | 同步间隔（ms） |

方法：`init()`

---

## 迷宫类

### MazeView

继承：`KlView`（迷宫游戏容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| moveObjIndex | Number | -1 | 当前拖拽对象索引 |
| clickDragMode | Boolean | false | 点击拖拽模式（无需长按） |
| checkFreqScale | Number | 3 | 碰撞检测粒度 |
| drawlineArr | Array | [] | 所有拖拽对象的轨迹点 |
| lineArr | Array | [] | 当前操作轨迹点 |

方法：`initView(byReset)`, `resetMoveObjByIndex(objIndex)`, `clearView()`

事件：`onArriveGoalHandler` — 对象到达目标时回调

### MazeMoveObj

继承：`KlBox`（迷宫可拖拽对象）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| camp | * | - | 阵营标识 |
| lineColor | String | "#000000" | 移动轨迹颜色 |
| lineWidth | Number | 5 | 轨迹宽度 |
| needDrawLine | Boolean | true | 是否绘制轨迹 |

### MazeGoalObj

继承：`KlBox`（迷宫目标区域）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| camp | * | - | 阵营标识（与 MazeMoveObj 匹配） |

---

## 一笔画类

### OneStrokeGame

继承：`KlBox`（一笔画游戏容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| boxItemsName | String | - | 包含连线项的容器名 |
| lineSkin | String | - | 连线图片皮肤 |
| lineHeight | Number | - | 连线高度 |
| lineSizeGrid | String | - | 连线九宫格参数 |
| mode | Number | 1 | 游戏模式（1=拖拽 2=点击 3=其他） |
| isRest | Boolean | false | 未完成时是否重置 |
| stepArr | Array | [] | 连接步骤数组 |

方法：`init()`, `isRight()`, `isNull()`, `restGame()`, `reCall()`, `gainLianLinesNames()`

事件：`EVENT_ALLRIGHT`, `EVENT_LINE`, `EVENT_WRONG`

### OneStrokeItem

继承：`KlBox`（一笔画连接项）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| isSelected | Boolean | false | 是否选中 |
| connectItems | String | - | 可连接项名称（逗号分隔） |
| filterColor | String | "#ffff00" | 选中滤镜颜色 |
| filterBlur | Number | 10 | 滤镜模糊度 |

方法：`reset()`, `canConnectWith(item)`

事件：`SELECTE`

---

## 键盘类

### KlBaseKeyboard

继承：`KlBox`（虚拟键盘）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| pattern | Number | - | 键盘样式（14-26 / 31-40 / 41+） |
| colorType | Number | 1 | 配色方案（1=蓝 2=黄 3=红 4=绿） |
| camp | * | - | 阵营，用于路由输入 |
| fixed | Boolean | false | 固定位置 |
| isHide | Boolean | false | 初始隐藏 |
| currIptXpath | String | - | 当前输入框 xpath |
| keyCondi | String | - | 按键条件（启用/禁用） |
| needKbBtn | Boolean | false | 显示隐藏按钮 |
| kbBtnSide | Number | 1 | 按钮位置（1-6） |

方法：`init()`, `onActive(evt)`, `getIptOffset()`, `getKeyboardOffset()`

### KlKey

继承：`KlBox`（单个键盘按键）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| output | String | - | 按键输出字符 |
| type | Number | 1 | 内容类型（1=FontClip 2=Image） |
| camp | * | - | 阵营标识 |
| condition | Number | 0 | 按键状态（0=正常 1=禁用 2=隐藏） |
| isSelected | Boolean | false | 是否选中 |

事件：`KlKeyboardEvent.KEY_CLICK`, `KlKeyboardEvent.INPUT`

### KlKeyboard

继承：`KlBaseKeyboard`（完整键盘组件，含布局）

#### v1.2.0 新键盘预设（尚未实施）

[Issue #74](https://github.com/RexYoung000/editor/issues/74) 将在现有选择器中新增两种预设：

- 数字与小数点键盘：0–9、小数点、删除；最多一个小数点，首位小数点自动补为 `0.`。
- 分数输入键盘：0–9、分数按钮、删除；只绑定计划新增的分数输入框。

2026-07-21 已确认新预设复用键盘资源：键盘外框、普通/按下键帽、数字和小数点字形、删除图标、分数按钮、分数线均作为内置运行资源注册。新版资源提供黄色、蓝色、绿色三套皮肤，#74 第一版默认使用黄色主题，并沿用 SDK `KeyBoard41UI` 的 `330×420` 底板和 3 列 4 行布局。分数输入框外框继续复用 `klInput` 普通、聚焦、错误三态皮肤；禁用态使用普通态降低透明度并去饱和，同时关闭输入响应，不增加独立切图。分子/分母焦点高亮由运行状态动态绘制。

数学表达式键盘（数字、分数、运算符、括号和小数点组合）不在 v1.2.0 范围。视觉资源需在领取 #74 后向开发者索要，资源未到位时不得自行定稿皮肤。

### KlInputImage

继承：`KlBox`（图片/文字输入框）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| camp | * | - | 阵营，路由到对应键盘 |
| place | Number | 1 | 输入位数 |
| contentType | Number | 1 | 内容类型（1=FontClip 2=Image） |
| fontClipSkin | String | - | FontClip 皮肤 |
| isSelected | Boolean | false | 是否选中 |
| canSelected | Boolean | true | 是否可选中 |
| arrowDirection | Number | 0 | 键盘箭头方向（0-4） |
| location | Number | 0 | 光标位置 |
| pattern | Number | - | 键盘样式 |
| min | Number | - | 最小值 |
| max | Number | - | 最大值 |
| align | String | "center" | 文字对齐 |

---

## 扩展容器类

### DragViewBox

继承：`KlBox`（拖拽系统容器，DragView 的容器版）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| mode | Number | 1 | 放置模式（0=鼠标位 1=放置位 2=自定义 3=自动排列） |
| autoSorting | Boolean | true | 自动排序 |
| backToInitPos | Boolean | true | 放置失败返回原位 |
| backAni | Boolean | true | 返回动画 |
| changePos | Boolean | true | 允许改变位置 |
| clickPlace | Boolean | false | 点击放置 |
| dropNotice | Boolean | true | 放置提示 |
| reverseOrder | Boolean | false | 反向排序 |

方法：`reInit()`, `resetAllDragObj()`, `resetSingleDragObj(drag)`, `dragsAllDrop()`, `getDragByDrop(drop)`, `dragsOnRightDrops()`

事件：`EVENT_SUCCESS`, `EVENT_FAILD`, `EVENT_DRAGOBJBACK`

### KlChangeColorBox

继承：`KlBox`（颜色滤镜容器）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| fcolor | String | "#ffffff" | 滤镜颜色（十六进制） |

方法：`grayingApe(_img)`, `makeRedApe(_img, value)`, `hex2rgb(a)`

---

## 引导与动画类

### PriviewGuideFinger

继承：`KlBox`（动画引导手指）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| isShow | Boolean | false | 是否显示 |
| mode | Number | 1 | 引导模式（1=点击 2=拖拽 3=滑动） |
| tx | Number | 0 | 目标 X 坐标 |
| ty | Number | 0 | 目标 Y 坐标 |
| aniTime | Number | 1000 | 动画时长（ms） |
| fingerDownSkin | String | - | 按下状态图片 |
| fingerUpSkin | String | - | 抬起状态图片 |

方法：`startGuide()`

### ImageScaleTime

继承：`KlBox`（图片缩放控件）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| minScale | Number | 0.5 | 最小缩放比例 |
| maxScale | Number | 5 | 最大缩放比例 |

方法：`setClickCallBack(fn)`, `onDestroy()`

支持鼠标滚轮缩放和双指触控缩放。

---

## 小豌豆 PK 类

### LittlePeaPKKlView

继承：`KlView`（小豌豆 PK 游戏视图）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| answer | Number | - | 答案值 |

方法：`submitAnswer()`, `getAnswer()`, `setAnswer(answer)`, `setMouseEnabled(v)`, `feedbackAnswerRightAniComplete()`, `feedbackAnswerWrongAniComplete()`

### LittlePeaPKDragView

继承：`KlView`（小豌豆 PK 拖拽视图）

属性和方法同 `LittlePeaPKKlView`。

---

## 思维导图类

### SwdtItem

继承：`KlBox`（思维导图节点）

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| fatherItemName | String | - | 父节点名称 |

---

## Kl* 标准 UI 包装类

以下组件均继承对应的 Laya 原生 UI 组件并实现 `ISyncComp` 接口，属性与原生组件一致。

### KlPanel

继承：`Panel → ISyncComp`（可滚动容器）

| 属性 | 类型 | 说明 |
|------|------|------|
| scrollType | Number | 滚动方向（0=无 1=水平 2=垂直 3=双向） |
| vScrollBarSkin | String | 垂直滚动条皮肤 |
| hScrollBarSkin | String | 水平滚动条皮肤 |
| elasticEnabled | Boolean | 弹性滚动 |

### KlList

继承：`List → ISyncComp`（列表容器）

| 属性 | 类型 | 说明 |
|------|------|------|
| selectedIndex | Number | 选中项索引 |
| repeatX | Number | 水平重复数 |
| repeatY | Number | 垂直重复数 |
| spaceX | Number | 水平间距 |
| spaceY | Number | 垂直间距 |
| skin | String | 列表项皮肤 |

### KlTextArea

继承：`TextArea → ISyncComp`（多行文本输入）

| 属性 | 类型 | 说明 |
|------|------|------|
| text | String | 文本内容 |
| fontSize | Number | 字体大小 |
| color | String | 文字颜色 |
| editable | Boolean | 是否可编辑 |
| vScrollBarSkin | String | 滚动条皮肤 |

### KlTab

继承：`Tab → ISyncComp`（标签页控件）

| 属性 | 类型 | 说明 |
|------|------|------|
| selectedIndex | Number | 选中标签索引 |
| labels | String | 标签文本（逗号分隔） |
| skin | String | 标签皮肤 |
| direction | String | 排列方向 |

### KlProgressBar

继承：`ProgressBar → ISyncComp`（进度条）

| 属性 | 类型 | 说明 |
|------|------|------|
| value | Number | 当前值（0-1） |
| skin | String | 进度条皮肤 |
| sizeGrid | String | 九宫格参数 |

### KlFontClip

继承：`FontClip → ISyncComp`（字体图片剪切）

| 属性 | 类型 | 说明 |
|------|------|------|
| value | String | 显示值 |
| skin | String | 字体图片路径 |
| sheet | String | 字符映射表 |
| spaceX | Number | 字符水平间距 |
| spaceY | Number | 字符垂直间距 |
| direction | String | 排列方向（horizontal/vertical） |

### KlViewStack

继承：`ViewStack → ISyncComp`（视图堆栈）

| 属性 | 类型 | 说明 |
|------|------|------|
| selectedIndex | Number | 当前显示的子视图索引 |

### KlSkeleton1

继承：`Skeleton → ISyncComp`（骨骼动画）

| 属性 | 类型 | 说明 |
|------|------|------|
| skin | String | 骨骼动画资源路径 |
| animation | String | 当前播放动画名 |
| loop | Boolean | 是否循环 |
| autoPlay | Boolean | 是否自动播放 |

### KlVSlider

继承：`VSlider → ISyncComp`（垂直滑块）

| 属性 | 类型 | 说明 |
|------|------|------|
| value | Number | 当前值 |
| min | Number | 最小值 |
| max | Number | 最大值 |
| tick | Number | 步长 |
| skin | String | 滑块皮肤 |

事件：`EVENT_VALCHANGE`

---

## 组件注册表

以下是通过 `View.regComponent()` 注册的所有组件名（可直接用于 Laya UI JSON 的 `type` 字段）：

```
基础 UI：Label, Text, Button, CheckBox, Radio, RadioGroup,
         Image, Box, HBox, VBox, Panel, List,
         TextInput, TextArea, Tab, ProgressBar, FontClip,
         ViewStack, View, Skeleton, VSlider

Kl* 系列：KlButton, KlLabel, KlCheckBox, KlRadio, KlRadioGroup,
           KlImage, KlBox, KlHBox, KlVBox, KlPanel, KlList,
           KlTextInput, KlTextArea, KlTab, KlProgressBar, KlFontClip,
           KlViewStack, KlView, KlSkeleton1, KlVSlider

自定义交互：ScaleButton, SoundButton,
            DragView, DragObj, DropObj,
            MazeView, MazeMoveObj, MazeGoalObj,
            MatchingGame, MatchingItem,
            OneStrokeGame, OneStrokeItem,
            KlKeyboard, KlKey, KlBaseKeyboard,
            ChoiceBox, KlInputBox, KlInputImage,
            BrushSprite, TwinkleBox, CountDown,
            DragViewBox, KlChangeColorBox,
            PriviewGuideFinger, ImageScaleTime,
            LittlePeaPKKlView, LittlePeaPKDragView, SwdtItem
```

---

## 初始化

使用任何组件前必须调用：

```javascript
// 注册所有组件到 Laya ClassUtils
window.Klzz.__init__(1920, 1080, null, null, null, null);
```

已在 `layaBridge.ts` 的 `preloadAtlas()` 中调用。
