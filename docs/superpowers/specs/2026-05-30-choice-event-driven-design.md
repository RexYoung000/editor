# 选择题事件驱动改造设计

日期：2026-05-30
作者：bin_bin.liu

## 背景

选择题流程目前散落着多处硬编码：

- `ChoiceBox` 的 `var` 写死为 `'choiceBox'`，`ChoiceBoxOkBtn` 的 `var` 写死为 `'btn_ok'`（[elementMeta.ts:173](../../../src/elements/elementMeta.ts#L173)、[elementMeta.ts:270](../../../src/elements/elementMeta.ts#L270)）。
- 判分逻辑直接拼字符串塞进 `generateSceneTs`：检测到「同页同时存在 `var=='btn_ok'` 的元素 + 一个 layaType 为 `ChoiceBox` 的元素」就生成 `this.btn_ok.on(Event.CLICK, ...) { if(this.choiceBox.isRight) ... }`（[exportProject.ts:677-686](../../../src/utils/exportProject.ts#L677-L686)）。用户没法在 ActionEditor 里看到、改、删这段逻辑。
- 资源清单 `right.mp3` / `wrong.mp3` 也跟着 `hasBtnOk + hasChoiceBox` 推断进包（[exportProject.ts:1182](../../../src/utils/exportProject.ts#L1182)）。
- 一键创建「选择题」只创建容器和 4 个选项，不附带确定按钮，确定按钮要靠用户从工具栏单独添加 `ChoiceBoxOkBtn`。

填空题已经走过相同的改造：通过 `onClickInitConfirm` / `onClickInitConfirmWithLock` 事件驱动 `GameUtils.initConfirm`（[exportProject.ts:777-789](../../../src/utils/exportProject.ts#L777-L789)），ConfirmButton 是统一的 `varFromName: true` 组件。sdk_baiya 已经提供对称的 `GameUtils.initChoiceBoxConfirm`（[gameUtilsSource.ts:443](../../../src/utils/gameUtilsSource.ts#L443)），完全可以让选择题也走事件驱动。

不考虑存量课件兼容（暂未投入制作）。

## 目标

让选择题与填空题走完全一致的事件驱动判分路径，删除所有 generateSceneTs 中的隐式选择题硬编码。

## 改动方案

### 1. 删除 `ChoiceBoxOkBtn`

- 删除 [elementMeta.ts:257](../../../src/elements/elementMeta.ts#L257) 整条 `ChoiceBoxOkBtn` 定义。
- 删除 [elementMetaI18n.ts](../../../src/elements/elementMetaI18n.ts) 中相关 i18n 映射（如有）。
- `m_qddk_on` 仍保留在 `okBtn` 资源组（[builtinAssets.ts:180](../../../src/elements/builtinAssets.ts#L180)），通过 ConfirmButton 的属性面板「换资源」按钮（[PropertyPanel.tsx:300](../../../src/components/PropertyPanel.tsx#L300)）依然可选。

### 2. ChoiceBox 解硬编码 var

[elementMeta.ts:173](../../../src/elements/elementMeta.ts#L173) 的 `ChoiceBox` 条目：

- 删除 `defaultProps.var: 'choiceBox'`
- 增加 `varFromName: true`

创建出来的 ChoiceBox 自动 `var === name`（如 `ChoiceBox_1` / `ChoiceBox_2`），与其他用 `varFromName` 的组件一致。

### 3. ConfirmButton 事件支持 ChoiceBox target

**ActionEditor 侧**（[ActionEditor.tsx](../../../src/components/ActionEditor.tsx)）：

- target 下拉候选：`onClickInitConfirm` / `onClickInitConfirmWithLock` 事件下，候选元素从只列 `KlInputBox` 改为同时列 `KlInputBox` 和 `ChoiceBox`。
- [ActionEditor.tsx:156-162](../../../src/components/ActionEditor.tsx#L156-L162) 切换事件时的默认 target：找第一个 `ChoiceBox` 或 `KlInputBox`。

**导出 .ts 侧**（[exportProject.ts:777-789](../../../src/utils/exportProject.ts#L777-L789)）：

按 target 类型路由：

```
target.type === 'KlInputBox'    → GameUtils.initConfirm(this, btn, target[, _lockBox])
target.layaType === 'ChoiceBox' → GameUtils.initChoiceBoxConfirm(this, btn, target, null[, _lockBox])
```

注意：`initChoiceBoxConfirm` 函数签名为 `(_view, _btnConfirm, _choiceBox, _hook, _lockBox, otherCb, doBeforeAFace, doAfterAFace)`，`_lockBox` 在 `_hook` 之后。锁屏变体调用时 `_hook` 传 `null` 占位。

### 4. 删除硬编码判分代码与 SceneFlags

- 删除 [exportProject.ts:677-686](../../../src/utils/exportProject.ts#L677-L686) 整段 `if (flags.hasBtnOk && flags.hasChoiceBox)` 拼接代码。
- 删除 [exportProject.ts:1182](../../../src/utils/exportProject.ts#L1182) 的 `if (flags.hasBtnOk && flags.hasChoiceBox) { needRight = true; needWrong = true; }`，保留下面已有的 `playRightSound` / `playWrongSound` action 累加逻辑（[exportProject.ts:1187-1188](../../../src/utils/exportProject.ts#L1187-L1188)）。
- 删除 [exportProject.ts:527-544](../../../src/utils/exportProject.ts#L527-L544) `SceneFlags` 接口和 `detectSceneFlags` 函数。
- `generateSceneTs` 函数签名去掉 `flags` 参数（[exportProject.ts:671](../../../src/utils/exportProject.ts#L671)），调用处 [exportProject.ts:1503](../../../src/utils/exportProject.ts#L1503) 同步去掉实参。

### 5. 收集 var 简化

[exportProject.ts:264-272](../../../src/utils/exportProject.ts#L264-L272)：

- 删除 `if (merged.var === 'btn_ok') needsVar.add(el.id);`
- 删除 `if (meta?.layaType === 'ChoiceBox') needsVar.add(el.id);`

ConfirmButton 是 action 源（`el.actions.length > 0`），ChoiceBox 是 action target（被 `action.targetId` 引用），二者自然走「action 源 + action target 都需要 var」通用规则（[exportProject.ts:254-262](../../../src/utils/exportProject.ts#L254-L262)），不需要特殊处理。

`onAutoClick` 父 ChoiceBox 的规则保留（[exportProject.ts:289-295](../../../src/utils/exportProject.ts#L289-L295)）。DragViewBox 的 var 规则保留。

### 6. 一键创建「选择题」改造

[ElementToolbar.tsx:213-246](../../../src/components/ElementToolbar.tsx#L213-L246) `handleAddChoice`：

1. 创建 `ChoiceBox`（不再覆盖 `upperLimit` / `rightItemNames`，走默认 props，var 由 `varFromName` 自动产生）
2. 创建 4 个 `SpeechSelectableObj`，name 为 `a` / `b` / `c` / `d`，位置 `(343, 938)` / `(714, 938)` / `(1085, 938)` / `(1456, 938)`，前景图 `selectableObj.btn1-4`
3. 创建 1 个 `ConfirmButton`，位置 `(1666, 960)`（与填空题一致），不覆盖 `skin`（保留 ConfirmButton 默认绿色 `btn_qd`，用户可后续换皮肤）
4. ConfirmButton 预设一个 action：`event: 'onClickInitConfirmWithLock'`, `targetId: choiceBox.id`, `actionType: 'toggleVisible'`（`actionType` 在 initConfirm 系列里不参与代码生成，给个无害默认值满足 Action 接口要求）

### 7. 选项管理（[editorStore.ts:1721-1769](../../../src/store/editorStore.ts#L1721-L1769)）

**`addChoiceOption`**：

- name 生成规则改为：a-z 用完后继续 aa, ab, ac, ..., zz（双字母）。算法：
  - 取已用 name 集合
  - 遍历单字母 a-z，找第一个未用
  - 全部用完则遍历双字母 aa-zz，找第一个未用
- 新选项位置：上一个选项**右侧** + 10 像素，与一键创建的横向布局一致（替换原「下方 +10」的逻辑）

**`removeChoiceOption`**：

- 删除「最少保留 2 个选项」限制（[editorStore.ts:1763](../../../src/store/editorStore.ts#L1763)），允许删到 0 个。

## 行为差异（主动接受）

改造前选择题硬编码代码额外做了三件事：

```ts
this.btn_ok.on(Event.CLICK, this, function() {
    if (this.choiceBox.isRight) {
        this.playSound("game_lt/sound/right.mp3");      // 显式播 right.mp3
    } else {
        this.playSound("game_lt/sound/wrong.mp3");      // 显式播 wrong.mp3
        this.choiceBox.cancelAllSel();                  // 取消所有已选
    }
});
```

`GameUtils.initChoiceBoxConfirm` 内部不做这三件事——内部只调 `showAnswerFace(1/2)`（笑/哭脸 + sdk 内置反馈音）和给选错的项加 `showWrongTipsBySeleObj` 红框。

改造后：

- 取消选对额外 `right.mp3`、选错额外 `wrong.mp3`、选错 `cancelAllSel`。
- 保留 sdk 内部 `showAnswerFace` 反馈、错误高亮。锁屏由事件变体决定：`onClickInitConfirmWithLock` 锁屏、`onClickInitConfirm` 不锁屏。

行为与填空题完全对称。如果用户需要 right/wrong 音效，可以在 ConfirmButton 上多加两个 action：`playRightSound` / `playWrongSound`（已在 [ActionEditor.tsx:65-66](../../../src/components/ActionEditor.tsx#L65-L66) 暴露）。

## 验证清单

1. 老填空题一键创建（ConfirmButton + KlInputBox）继续正常工作。
2. 新选择题一键创建后直接发布预览：选对锁屏 + 笑脸反馈；选错红框 + 哭脸反馈。
3. 用户修改 ChoiceBox 的 var、ConfirmButton 的 var，导出 .ts 用新 var。
4. 删掉 ConfirmButton 后选择题不再生成判分代码（不再出现孤立的 `this.btn_ok` / `this.choiceBox`）。
5. 同页放两组「ChoiceBox + ConfirmButton」，两组判分独立工作。
6. ConfirmButton 换皮肤面板可选到 `m_qddk_on`（粉色卡通）。
7. 选项添加超过 26 个时 name 走 aa-zz，不重复。
8. 选项可以删到 0 个。

## 不在改造范围

- `ChoiceBox.mouseEnabled` 不写入 .scene 的特例保留（[exportProject.ts:361](../../../src/utils/exportProject.ts#L361)）。
- `SelectableObj` 拆 `_foregroundSkin` / `_bgSkin` 子节点的导出逻辑保留（[exportProject.ts:404-428](../../../src/utils/exportProject.ts#L404-L428)）。
- `onAutoClick` 在 ChoiceBox 内的处理保留（[exportProject.ts:758-775](../../../src/utils/exportProject.ts#L758-L775)）。
- `PageTurnBox` 内 `SpeechSelectableObj` 强制 `isSelected: false` 的导出特例保留（[exportProject.ts:398-402](../../../src/utils/exportProject.ts#L398-L402)）。
- ChoiceBox 编辑模式占位渲染（透明 placeholderImage）保留。
