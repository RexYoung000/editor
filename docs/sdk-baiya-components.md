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
- `TextInput`、`DragViewBox`、`DropObj` 编辑时使用 `Box` 占位；普通 `TextArea` 使用 `Label`，`NewTextArea` 使用共享文字烘焙得到的 `Image`；`SoundButton` 使用 `Image`；`Spine` 使用原生 `Laya.Skeleton`。带 `meta.placeholderImage` 的组件统一使用 `Image`。
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

在作业和专题测评中，不属于答题判定容器的 `KlInputImage` 只要配置了非空 `_judgeAnswer`，就会自动参与运行时预设“完成”判定，不要求额外添加确认按钮或 `onClickSdkJudge`。同页多个独立输入控件按“任一未填为未作答、全部填写且全对为正确、全部填写但任一错误为错误”聚合；嵌套输入格仍由最近的答题判定容器负责，避免重复判定。答题判定容器包括 `KlInputBox` 和显式开启该能力的 `ContainerBox`。

`FractionInput` 使用 `img_w2Input.png` 的 29 格位图字体，字符表固定为 `0123456789+-×÷=()><.tabcdxyπ²`。字符表数量必须与素材切片数量一致，否则单次输入会显示相邻的整段美术资源，并导致内容宽度计算错误。普通字符按字体实际缩放后的 advance width（字符格宽度与字间距的合计）参与布局，分数结构和普通字符之间的间距也必须计入；外框内容按真实字符宽度自适应缩放，不允许溢出九宫格外框。每个普通分数结构占 3 个逻辑字符位，分子和分母各最多 4 位数字。子输入格获得焦点时，分数键必须置灰并禁用，不能只在点击后静默拒绝嵌套分数；切回外框或其他允许插入分数的输入格后恢复。

分数结构重绘时会复用分子、分母子输入格。外框删除完整分数结构或同步答案值时，清理子输入格不得再次触发 `INPUT_LATER` 反向改写外框值；一次删除必须得到完整的新结构或空值，不能留下半销毁节点、旧焦点或调试渲染残影。

`FractionInput` 沿用与独立 `KlInputImage` 相同的作业预设完成规则，并按当前结构化字符串精确比较 `_judgeAnswer` 与 `fontClipValue`；本能力不自动约分或换算数学等值分数。

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

#### v1.2.0 扩展

[Issue #74](https://github.com/RexYoung000/editor/issues/74) 将新增可视化分数输入框，并与普通输入框按键盘兼容性分别绑定；一个分数固定占外框 3 个逻辑字符位，分子与分母各最多 4 位，外框缩放只改变显示尺寸，不改变老师配置的最大字符数。

[Issue #72](https://github.com/RexYoung000/editor/issues/72) 允许 `KlInputImage` 与 `FractionInput` 保存多个候选正确答案，并允许同一个答题判定容器内的两个输入框建立算式关系。`KlInputBox` 默认是答题判定容器；普通 `ContainerBox` 必须显式开启“启用答题判定”。独立输入格和未关联空位按候选答案 OR 判定；加、减、乘、除和相等关系读取两个输入值动态计算。普通小数与简单分数按数值参与关系，例如目标为 4 时，允许小数输入的 `0.5 × 8` 应正确。

算式关系用 `_inputRelations` 按输入控件 ID 保存到父容器；一个输入框最多参与一条关系，不跨答题判定容器连接，嵌套时输入框只归属最近的答题判定容器。运行时不会把编辑器专用候选、关系和 `ContainerBox` 开关字段写入 scene，而是在生成的场景初始化代码中为答题判定容器注入统一 `isRight()` / `isNull()`。关闭 `ContainerBox` 开关会保留配置但停用组判定；没有新配置的历史课件继续走原有 `_judgeAnswer` 或 `KlInputBox.answer`。引用失效、重复占用、目标结果无效或存在无判定规则的空位时必须先修复。

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

#### forge 编辑器映射

[Issue #76](https://github.com/RexYoung000/editor/issues/76) 起，编辑器不再直接开放 `rightItemNames` 和 `upperLimit`。`ChoiceBox.props._correctOptionIds` 保存直属选项的稳定元素 ID：1 个答案自动按单选交互，2 个及以上自动按多选交互。导出时才把 ID 转成当前选项名称写入 `rightItemNames`，并自动生成 `upperLimit=1` 或 `0`，因此改名不会破坏答案引用。该字段只属于编辑器数据，不进入 `.scene`。

选项视觉由五个互斥图层组成：通常、按压、选中、正确和错误。判定正确后锁定；判定错误只标记已选项且允许继续修改。正课和预习由画布确认按钮应用结果，作业和专题测评在右上角通用提交读取 `result` 时应用结果。

正课和预习使用的画布确认按钮属于 `ConfirmButton` 元素。选择题、填空题、连线题、拖拽题等快捷题型模板自动生成的按钮，默认使用内置的 S3-S7 黄色繁体确定按钮资源，并标记为题型模板按钮；老师可以在属性面板从本地文件、正式资源库或确定按钮预设中替换图片，三种来源共享同一 `skin` 字段和尺寸同步规则。独立的 `ConfirmButton` 组件和“快捷组件 → 确定”不改变现有默认资源与创建流程。

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

2026-07-22 补充分数按钮资源映射：黄色 `img_fraction3.png` / `img_fraction4.png`、蓝色 `img_fraction5.png` / `img_fraction6.png`、绿色 `img_fraction7.png` / `img_fraction8.png`，各组依次对应普通态和按下态。当前预设只启用黄色主题，运行资源与选择器缩略图均使用黄色组；蓝色和绿色只记录映射，待未来正式开放主题选择时再注册使用。

编辑器中的 `FractionInput` 外框也复用 `klInput` 普通态底图，并设置 `sizeGrid=10,10,10,10`；调整分数输入框宽度时只拉伸中间区域，不拉伸四角。发布课件继续由普通、聚焦、错误三层子节点分别使用同一九宫格规则。

### 键盘绑定规则（编辑器）

- 绑定列表扫描当前编辑页面内所有 `KlBaseKeyboard`，不能只依赖编辑器生成的 `_keyboardPreset.id`。
- 历史课件中的键盘可能只有 `pattern`、尺寸、按键子节点和 `camp`，没有 `_keyboardPreset`；这类组件显示为“旧版/自定义键盘”，不应被误报为“没有键盘”。
- 绑定已有键盘时，输入框和键盘必须写入同一个非空 `camp`。旧键盘缺少 `camp` 时由编辑器补发页面内唯一阵营标识，并同步写回两者。
- 新增输入框先复用当前页面兼容的已有键盘；只有找不到可用键盘时才打开预设选择并创建一个新的键盘，禁止静默创建重复键盘。
- 能明确识别预设的键盘继续按输入框类型过滤；无法明确识别的旧版/自定义键盘保留在绑定列表中，并由使用者确认其实际按键能力。

数学表达式键盘（数字、分数、运算符、括号和小数点组合）不在 v1.2.0 范围。视觉资源需在领取 #74 后向开发者索要，资源未到位时不得自行定稿皮肤。

#### 自定义答案键盘

[Issue #112](https://github.com/RexYoung000/editor/issues/112) 在现有键盘选择器中增加“自定义答案键盘”，用于学生不能自由打字、只能从老师配置的文本答案中点选的填空场景。

- 每个键盘实例独立保存 2～9 个答案，不通过新增代码预设或逐题切图承载题目内容。
- 每个答案首版支持 1～4 个显示字符，显示文字与运行时输出保持一致；空答案、重复答案和超长答案均视为无效配置。
- 点击答案时整项替换输入框当前内容，不连续拼接；点击其他答案直接切换，清空键恢复未填写状态。
- 正确答案必须存在于当前键盘的答案选项中，否则预览和发布前阻止继续。
- 布局由系统生成，老师不拖动单键、不调整单键尺寸：
  - 2 个答案使用两列；
  - 3 个答案使用三列；
  - 4 个答案使用两列两行；
  - 5～9 个答案使用三列网格；
  - 清空键固定占最后一行。
- 键盘沿用数学键盘的 `330×420` 底板与键帽尺寸体系，答案与清空键作为一个整体在底板内垂直居中。
- 每个实例可选择黄色、蓝色或绿色主题，默认黄色。三套主题分别使用同源底板、普通/按下键帽、宽键、清空图标和箭头；切换主题不改变答案、布局、绑定和判定。
- 键帽文字使用编辑器内置中文字体与主题固定的字号、颜色、描边和按下态规则。老师不单独设置字体、字号或颜色。
- 编辑器画布必须实时显示当前答案、顺序、布局和主题，不能继续只显示固定预设缩略图。
- 编辑器画布、预览和正式导出共用同一套文字图片生成规则：按“主题 + 答案文本”把键帽文字渲染为透明 PNG，并复用缓存结果。
- 输入框按自身尺寸和本题最长答案生成专属横向 FontClip 字库图，图片本身即为运行时最终字号，不依赖 SDK 的缩放属性；同一答案键盘绑定不同尺寸输入框时分别生成。
- 内置字体只在编辑器生成文字图片时使用。预览和正式课件不得携带或在运行时加载 TTF，也不得保留动态 `Label` 文字，避免不同设备的字体安装、加载时机和渲染引擎造成差异。
- 文字图片生成失败时必须阻止预览和发布并明确提示，不允许回退到设备系统字体。

首版不包含超过 9 个答案、分页或滚动键盘、自由行列布局、单键尺寸编辑、连续词语组句，以及用户自定义字体或混搭主题资源。

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

### forge NewTextArea 编辑约定

`NewTextArea` 是编辑器中的可视化文本工具，发布前仍由 `bakeTextElements()` 烘焙为 PNG，不在运行时保留可编辑文本控件。

- 工具栏名称为“文本”。点击后在当前可见画布中央创建空文本并立即获得输入焦点；未输入内容直接退出时取消创建。
- 默认宽度为 `800px`，默认尺寸模式为“固定宽度、自动高度”。尺寸模式保存在 `props.textSizingMode`：`auto`（自动宽高，无手柄）、`fixed-width`（固定宽度自动高度，仅左右手柄）、`fixed`（固定宽高，八个手柄）。缺失该字段的历史 `NewTextArea` 按 `fixed` 解释。
- 拖动尺寸手柄只改变文本框体，不缩放字形或字号；拖动过程中按新框体宽高实时重新换行和对齐。右侧直接修改宽高遵循同一规则。
- 编辑态使用原生光标、选区、中文输入法和浏览器撤销；`Cmd/Ctrl+Enter`、`Esc` 或点击编辑区域外退出，画布、属性面板、工具栏等区域均适用。编辑态拖动用于选择文字，不能移动组件；选中态拖动文本框内部可移动组件；双击按点击位置放置光标。
- 一次进入到退出只产生一条画布历史。普通文本和编辑中的输入底板保持透明，不增加会发布的默认底板。编辑辅助框使用蓝白双层描边、深色投影和高对比手柄；固定宽高发生溢出时使用橙色外描边提示。
- 支持整段字体、字号、颜色、粗体、斜体、左中右对齐和行距；不支持局部混排、列表、链接、下划线和完整富文本。

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
            ChoiceBox, KlInputBox, KlInputImage, FractionInput,
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

`FractionInput` 是课件工程按页生成的自定义组件。为兼容旧版场景 JSON，生成代码会同时注册 `Components.FractionInput` 和 `FractionInput` 两个名称；两者都可以作为 Laya UI JSON 的 `type` 使用。
