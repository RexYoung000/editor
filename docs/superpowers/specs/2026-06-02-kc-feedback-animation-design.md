# 口才文字反馈动画事件 设计文档

日期：2026-06-02
作者：bin_bin.liu
状态：待实施

## 背景

forge 当前已有 `onClickInitConfirm` / `onClickInitConfirmWithLock` 两个"点击+SDK通用判断"事件，绑在 ConfirmButton 上，由 sdk_baiya 的 `GameUtils.initConfirm` / `initChoiceBoxConfirm` 一行接管"判定 + 错误效果 + 锁屏"全流程。但这套 SDK 流程的反馈效果是 SDK 内置的，无法定制。

口才课程需要一种新的判定流程：**判定逻辑由项目代码直接管，错误/正确反馈用两个固定的 Spine 动画**（zx_yes / zx_no）来呈现。这套动画是跨课件通用的，需要由 forge 内置并按需注入到导出工程。

## 目标

新增 2 个事件 `onClickInitConfirmCH` / `onClickInitConfirmCHWithLock`，配合内置的两个 Spine 反馈动画，实现：

1. 用户在 ConfirmButton 上选这两个事件后，无需手动放置 Spine 元素
2. 导出工程时自动把 2 个 Spine 节点注入到 .scene（`visible: false`，放在节点末尾）
3. 导出 .ts 时自动生成 `GameUtile.initConfirmCH` / `initChoiceBoxCH` 调用 + `playRightAni` / `playWrongAni` / `playEnd` 三个回调函数
4. 顺手把作业 / 专题测评模式下的 4 个 ConfirmButton 判断事件统一隐藏（这两种模式有自己的 onChoiceJudge / onInputJudge 判定体系，根本用不到）

## 非目标

- 不改 sdk_baiya 的运行时代码（`GameUtile.initConfirmCH` / `initChoiceBoxCH` 假定已存在或将由 SDK 团队实现）
- 不支持复习课（review）—— 复习课是纯视频课件，没有判断组件
- 不引入"远端按需下载 Spine 资源"机制（资源直接打进课件包）
- 不支持自定义 Spine 资源（zx_yes / zx_no 是固定的两个）

## 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     ActionEditor.tsx                          │
│  - 新增 2 个事件选项：onClickInitConfirmCH / *WithLock        │
│  - 作业 + 专题测评模式下隐藏全部 4 个 ConfirmButton 判断事件   │
└──────────────────────────┬──────────────────────────────────┘
                           │ 用户选择事件
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Course / SubPage 数据                        │
│  Element.actions[].event = 'onClickInitConfirmCH' / *WithLock │
└──────────────────────────┬──────────────────────────────────┘
                           │ 导出
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   exportProject.ts                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. collectResources：扫描事件，收集 feedback.CH 资源  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 2. buildScene：检测事件，注入 2 个 Spine 节点        │    │
│  │    （visible:false，放 child 数组末尾）              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 3. generateSceneTs：在 initView 注入 GameUtile 调用   │    │
│  │    + playRightAni / playWrongAni / playEnd 回调       │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     课件运行时                                │
│  事件触发 → GameUtile.initConfirmCH 判定 → 调用回调           │
│  → playRightAni() 显示 Spine_kcFeedbackYes 并播放             │
│  → playWrongAni() 显示 Spine_kcFeedbackNo 并播放 + 锁交互     │
└─────────────────────────────────────────────────────────────┘
```

## 详细设计

### Part 1：内置资源管理

#### 1.1 资源放置

从 `D:\project\v1\test\L12_v1_test_14\images\animation\` 拷贝原始 Spine 文件到 forge：

```
public/builtin/runtime/game/animation/
├── zx_yes/
│   ├── zx_yes.png
│   └── zx_yes.sk
└── zx_no/
    ├── zx_no.png
    └── zx_no.sk
```

#### 1.2 在 `src/elements/builtinAssets.ts` 注册 4 条资源

```typescript
{
  id: 'feedback.CH.yes.sk',
  src: '/builtin/runtime/game/animation/zx_yes/zx_yes.sk',
  exportPath: 'animation/feedback_CH_yes/zx_yes.sk',
},
{
  id: 'feedback.CH.yes.png',
  src: '/builtin/runtime/game/animation/zx_yes/zx_yes.png',
  exportPath: 'animation/feedback_CH_yes/zx_yes.png',
},
{
  id: 'feedback.CH.no.sk',
  src: '/builtin/runtime/game/animation/zx_no/zx_no.sk',
  exportPath: 'animation/feedback_CH_no/zx_no.sk',
},
{
  id: 'feedback.CH.no.png',
  src: '/builtin/runtime/game/animation/zx_no/zx_no.png',
  exportPath: 'animation/feedback_CH_no/zx_no.png',
}
```

#### 1.3 命名规则说明

`exportPath` 用 `feedback_CH_yes` / `feedback_CH_no`（不用 `ani100`/`ani101` 占编号），避免和用户上传的 `ani1, ani2, ani3...` 编号体系冲突。

#### 1.4 重新打包 game.zip

按 CLAUDE.md 约定，`public/builtin/runtime/game/` 下新增资源后，需要重新打包 `public/builtin/runtime/game.zip`，否则导出的课件找不到新资源。

#### 1.5 导出后的课件包目录

```
<课件包>/animation/
├── feedback_CH_yes/     # 内置"对"动画
│   ├── zx_yes.png
│   └── zx_yes.sk
├── feedback_CH_no/      # 内置"错"动画
│   ├── zx_no.png
│   └── zx_no.sk
├── ani1/                # 用户上传的动画
└── ...
```

---

### Part 2：ActionEditor 新增事件选项

#### 2.1 新增事件类型

在 `src/components/ActionEditor.tsx` 的 `EVENT_OPTS` 数组中，紧跟 `onClickInitConfirmWithLock` 后面新增 2 条：

```typescript
...(isConfirmButton && hasChoiceOrInput && !isHwOrEval ? [
  { value: 'onClickInitConfirm', label: '点击+SDK通用判断' },
  { value: 'onClickInitConfirmWithLock', label: '点击+SDK通用判断+锁屏' },
  { value: 'onClickInitConfirmCH', label: '点击+口才文字动画通用判断(不经SDK)' },
  { value: 'onClickInitConfirmCHWithLock', label: '点击+口才文字动画通用判断(不经SDK)+锁屏' },
] : []),
```

#### 2.2 显示条件

- **可见前提**：`isConfirmButton && hasChoiceOrInput`（与现有 SDK 判断事件一致）
- **课程类型限制**：`!isHwOrEval`（作业 + 专题测评隐藏）

#### 2.3 新增 isHwOrEval 判断

在组件顶部：

```typescript
const course = useEditorStore((s) => s.currentCourse);
const isHwOrEval = course?.kind === 'homework' || course?.kind === 'sEvaluation';
```

#### 2.4 各课程类型行为对照表

| 课程类型 | 4 个判断事件是否显示 |
|---|---|
| 正课 / 默认（speechCourse） | 显示 |
| 预习 | 显示 |
| 复习课（review） | 不影响（纯视频，没有 ConfirmButton/ChoiceBox/KlInputBox） |
| 作业（homework） | **隐藏** |
| 专题测评（sEvaluation） | **隐藏** |

#### 2.5 target 限制

不变。和现有 `onClickInitConfirm` 一致，target 只能选 `KlInputBox` 或 `ChoiceBox`。

---

### Part 3：导出 .scene - 自动注入 Spine 节点

#### 3.1 注入时机

在 `src/utils/exportProject.ts` 的 `buildScene` 函数末尾（构造完 `sceneNode` 之后、return 之前）。

#### 3.2 检测条件

```typescript
const needsCHFeedback = page.elements.some(el => 
  (el.actions ?? []).some(a => 
    a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock'
  )
);
```

#### 3.3 注入的 Spine 节点结构

只在 `needsCHFeedback === true` 时执行，向 `sceneNode.child` 数组**末尾**追加：

```typescript
// Spine_kcFeedbackYes (正确反馈)
{
  type: 'SkeletonPlayer',
  props: {
    name: 'Spine_kcFeedbackYes',
    x: -5,
    y: 1076,
    width: 400,
    height: 400,
    url: '<viewDir>/animation/feedback_CH_yes/zx_yes.sk',
    currAniName: 'animation',
    isLoop: 'false',
    stopAt: 0,
    visible: false,
    var: 'Spine_kcFeedbackYes',
  }
}

// Spine_kcFeedbackNo (错误反馈)
{
  type: 'SkeletonPlayer',
  props: {
    name: 'Spine_kcFeedbackNo',
    x: 1,
    y: 1080,
    width: 400,
    height: 400,
    url: '<viewDir>/animation/feedback_CH_no/zx_no.sk',
    currAniName: 'animation',
    isLoop: 'false',
    stopAt: 0,
    visible: false,
    var: 'Spine_kcFeedbackNo',
  }
}
```

注意：
- 字段名是 `url`（不是 `skin`），对齐 LayaAir IDE .scene 格式和 [elementMeta.ts](../../../src/elements/elementMeta.ts) 中 Spine 元素的定义
- `isLoop` 用字符串 `'false'`（与现有 Spine 导出逻辑一致，见 `exportProject.ts:391`）

#### 3.4 关键细节

- **var 名固定**：`Spine_kcFeedbackYes` / `Spine_kcFeedbackNo`（Part 4 .ts 生成依赖这两个名字）
- **visible: false**：初始隐藏，运行时由 playRightAni / playWrongAni 控制显示
- **viewDir 适配**：根据当前导出的 `viewDir` 动态拼接（`game_lt`，专题测评/作业不会走到这里）
- **位置/尺寸**：从测试数据提取（x=-5/y=1076 和 x=1/y=1080，400×400）
- **动画名固定**：`currAniName: 'animation'`（从测试 sk 文件提取）
- **isLoop: false / stopAt: 0**：播一次到第 0 帧停住

#### 3.5 collectResources 集成

`collectResources` 函数同样要扫描 actions，当发现 `onClickInitConfirmCH` / `*WithLock` 时，主动把 4 个内置资源（2 个 .sk + 2 个 .png）的 `src` 路径加入 `resourceMap`，确保导出时这些文件被正确写入。

---

### Part 4：导出 .ts - initView 调用与回调函数

#### 4.1 检测条件

在 `src/utils/exportProject.ts` 的 `generateSceneTs` 函数中：

```typescript
const chConfirmActions: Array<{ event: string; action: Action; el: Element; targetEl: Element }> = [];
for (const el of page.elements) {
  for (const action of (el.actions ?? [])) {
    if (action.event === 'onClickInitConfirmCH' || action.event === 'onClickInitConfirmCHWithLock') {
      const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
      if (targetEl) chConfirmActions.push({ event: action.event, action, el, targetEl });
    }
  }
}
const hasCHConfirm = chConfirmActions.length > 0;
```

#### 4.2 initView 中的调用代码

对每个匹配的事件，根据 target 类型 + 是否锁屏，生成对应一行调用：

| target 类型 | 锁屏 | 生成的代码 |
|---|---|---|
| KlInputBox | 否 | `GameUtile.initConfirmCH(this, this.${btnVar}, this.${kbVar}, null, null, this.playRightAni, this.playWrongAni);` |
| KlInputBox | 是 | `GameUtile.initConfirmCH(this, this.${btnVar}, this.${kbVar}, null, this._lockBox, this.playRightAni, this.playWrongAni);` |
| ChoiceBox | 否 | `GameUtile.initChoiceBoxCH(this, this.${btnVar}, this.${cbVar}, null, null, this.playRightAni, this.playWrongAni);` |
| ChoiceBox | 是 | `GameUtile.initChoiceBoxCH(this, this.${btnVar}, this.${cbVar}, null, this._lockBox, this.playRightAni, this.playWrongAni);` |

`btnVar`、`kbVar`、`cbVar` 通过 `varAssignment` 取得。

#### 4.3 回调函数生成

仅当 `hasCHConfirm === true` 时，在类方法区追加 3 个方法：

```typescript
playRightAni() {
    let t = this.Spine_kcFeedbackYes;
    if(t && t.play){
        t.visible = true;
        t.play("animation", false);
    }
}

playWrongAni() {
    let t = this.Spine_kcFeedbackNo;
    if(t && t.play){
        t.visible = true;
        t.play("animation", false);
    }
    this.mouseEnabled = false;
    t.once(Laya.Event.END, this, this.playEnd);
}

playEnd() {
    this.mouseEnabled = true;
}
```

#### 4.4 关键细节

- **3 个函数固定生成**：不管事件用了几次、几条，每个 .scene 只生成一份这 3 个函数
- **Spine var 引用**：`this.Spine_kcFeedbackYes` / `this.Spine_kcFeedbackNo`（必须和 Part 3 注入的 var 名一致）
- **动画名 hardcode 为 "animation"**：从测试 sk 文件提取
- **正确动画**：仅显示 + 播放，不锁交互
- **错误动画**：显示 + 播放 + `mouseEnabled = false`，监听 `Laya.Event.END` 后 `playEnd()` 恢复 `mouseEnabled = true`
- **GameUtile 第 4 参数（正确音效）**：固定传 `null`，由 SDK 内部用默认音效
- **GameUtile 第 5 参数（锁屏容器）**：根据事件类型传 `null` 或 `this._lockBox`

---

### Part 5：作业模式不展示判断事件

#### 5.1 修改范围

**只改 `ActionEditor.tsx`**。`exportProject.ts` 不动 —— 作业 / 专题测评模式下用户根本选不到这 4 个事件，导出端无需额外保护。

#### 5.2 实现方式

见 Part 2.3 / 2.4。

#### 5.3 影响面

- 用户在作业 / 专题测评的 ConfirmButton 上将看不到任何"判断类"事件
- 历史课件如果意外有这类 actions 数据：导出端旧逻辑保持不变（exportProject.ts 没动），仍能正常导出，只是 UI 上不可见 / 不可改 —— 实际上是更好的行为
- 这一改动同时清理了一个潜在 bug：之前作业模式下用户拖一个 ConfirmButton 到画布，再加 ChoiceBox/KlInputBox，能选到 `onClickInitConfirm`，但导出后行为和作业判定体系冲突

---

## 数据流

```
用户操作:
  画布上 ConfirmButton + ChoiceBox/KlInputBox
  → ActionEditor 选 'onClickInitConfirmCH' 或 '*WithLock'
  → action.targetId 指向 ChoiceBox/KlInputBox

存储:
  Course → Stage → SubPage → Element.actions[]
  { event: 'onClickInitConfirmCH', targetId: '<choiceBox-id>', actionType: '...', ... }

导出:
  collectResources 扫到事件 → 把 feedback.CH.yes.sk/png + feedback.CH.no.sk/png 加入 resourceMap
  buildScene 扫到事件 → 在 .scene child 末尾注入 2 个 Spine 节点 (visible: false)
  generateSceneTs 扫到事件 → initView 注入 GameUtile.initConfirmCH/initChoiceBoxCH 调用
                          → 类末尾追加 playRightAni/playWrongAni/playEnd 三个方法

运行时:
  用户点 ConfirmButton
  → GameUtile.initConfirmCH 内部判定
  → 正确：调 playRightAni() → 显示 Spine_kcFeedbackYes 并播放 "animation"
  → 错误：调 playWrongAni() → 显示 Spine_kcFeedbackNo 并播放 "animation" + 锁交互
                          → END 事件触发 → playEnd() 恢复交互
  → (锁屏变体) this._lockBox.visible = true 由 GameUtile 内部处理
```

## 错误处理

- **GameUtile API 不存在**：假定 SDK 团队会实现。如果运行时报"GameUtile.initConfirmCH is not a function"，说明 SDK 还没出，与 forge 端无关
- **target 缺失**：和现有 `onClickInitConfirm` 行为一致，导出时跳过该事件，不报错
- **资源缺失**：`game.zip` 没及时打包是常见问题，按 CLAUDE.md 约定让用户自查；导出端不做额外保护
- **var 冲突**：`Spine_kcFeedbackYes` / `Spine_kcFeedbackNo` 用了"kcFeedback"前缀降低冲突概率；如果用户自己命名了同名 Spine，理论上有风险，但概率极低（用户一般不会用 `Spine_kcFeedbackYes` 这种命名）

## 测试

由于 forge 没有自动化测试套件（CLAUDE.md 已说明），手动验证以下场景：

### 5.1 正常路径

1. 新建正课，加 ChoiceBox + 4 个 SpeechSelectableObj + ConfirmButton
2. 选 ConfirmButton，事件改成"点击+口才文字动画通用判断(不经SDK)+锁屏"，target 选 ChoiceBox
3. 点"发布工程"导出
4. 检查 `<课件包>/laya/pages/game_lt/Game1.scene`：
   - child 数组末尾应有 2 个 SkeletonPlayer 节点（var: Spine_kcFeedbackYes / Spine_kcFeedbackNo），visible: false
5. 检查 `<课件包>/src/view/game_lt/Game1.ts`：
   - `initView` 内有 `GameUtile.initChoiceBoxCH(this, this.ConfirmButton_X, this.ChoiceBox_X, null, this._lockBox, this.playRightAni, this.playWrongAni);`
   - 类末尾有 `playRightAni` / `playWrongAni` / `playEnd` 三个方法
6. 检查 `<课件包>/laya/assets/game_lt/animation/feedback_CH_yes/` 和 `feedback_CH_no/` 目录下有对应的 .sk + .png

### 5.2 KlInputBox 路径

1. 新建正课，加 KlInputBox + 1 个 KlInputImage + ConfirmButton
2. 选 ConfirmButton，事件改成"点击+口才文字动画通用判断(不经SDK)"（不锁屏），target 选 KlInputBox
3. 导出
4. .ts 中应该是 `GameUtile.initConfirmCH(this, this.ConfirmButton_X, this.KlInputBox_X, null, null, this.playRightAni, this.playWrongAni);`（第 5 参数是 `null` 而非 `this._lockBox`）

### 5.3 作业模式隐藏

1. 新建作业课件，加 ChoiceBox + ConfirmButton
2. 选 ConfirmButton 查看事件下拉框：4 个判断事件应**全部不可见**

### 5.4 专题测评模式隐藏

同 5.3，新建专题测评课件验证。

### 5.5 不用此事件不影响其他课件

1. 新建一个不用这两个事件的正课
2. 导出 → .scene 不应有 Spine_kcFeedbackYes/No 节点；.ts 不应有 playRightAni 等函数
3. 课件包 `animation/` 目录下不应该有 `feedback_CH_yes/` `feedback_CH_no/` 目录
   （这是必须保证的：`collectResources` 必须按需收集，未使用相关事件的课件不应携带这两个 Spine 资源）

### 5.6 一个 .scene 多个事件

1. 在同一个 SubPage 加 2 个 ConfirmButton + 2 个 ChoiceBox，分别绑定两个 ConfirmCH 事件
2. 导出
3. .scene 中应只有 1 套 Spine_kcFeedbackYes/No（不要重复注入）
4. .ts 中 initView 应有 2 行 GameUtile 调用，但 playRightAni/playWrongAni/playEnd 只生成 1 份

---

## 风险与未决事项

- **GameUtile API 由 SDK 团队提供**：本设计假定 `GameUtile.initConfirmCH` / `initChoiceBoxCH` 已经或将由 sdk_baiya 团队实现，签名与文档[添加新的事件.md](../../添加新的事件.md)一致。如果实际 API 名或参数不同，Part 4 生成的代码需要相应调整
- **位置坐标硬编码**：x/y 直接来自测试工程，如果将来需要让用户自定义反馈动画的位置，要把这部分改成可配置（例如从一个全局配置或 ConfirmButton 的 props 里读）。当前需求是"按现在的摆放"，所以直接硬编码
