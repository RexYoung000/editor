# 口才文字反馈动画事件 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 onClickInitConfirmCH / onClickInitConfirmCHWithLock 两个事件，配合内置 Spine 反馈动画（zx_yes / zx_no），实现口才课程的自定义判定反馈流程

**Architecture:** 
- 内置资源管理：zx_yes / zx_no 作为内置 Spine 动画注册到 builtinAssets.ts
- ActionEditor：新增 2 个事件选项，作业 + 专题测评模式隐藏全部 4 个 ConfirmButton 判断事件
- 导出流程：collectResources 按需收集资源，buildScene 注入 Spine 节点到 .scene，generateSceneTs 生成 GameUtile 调用 + 回调函数

**Tech Stack:** TypeScript, React, Zustand, LayaAir .scene format, Spine 动画

---

## 文件结构

**创建文件：**
- 无（全部是修改现有文件）

**修改文件：**
- `public/builtin/runtime/game/animation/zx_yes/zx_yes.sk` + `.png` (新增)
- `public/builtin/runtime/game/animation/zx_no/zx_no.sk` + `.png` (新增)
- `public/builtin/runtime/game.zip` (重新打包)
- `src/elements/builtinAssets.ts` (注册 4 个资源)
- `src/components/ActionEditor.tsx` (新增事件选项 + 隐藏判断事件)
- `src/utils/exportProject.ts` (collectResources + buildScene + generateSceneTs 三处修改)

---

## Task 1: 拷贝 Spine 资源到内置资源目录

**Files:**
- Create: `public/builtin/runtime/game/animation/zx_yes/zx_yes.sk`
- Create: `public/builtin/runtime/game/animation/zx_yes/zx_yes.png`
- Create: `public/builtin/runtime/game/animation/zx_no/zx_no.sk`
- Create: `public/builtin/runtime/game/animation/zx_no/zx_no.png`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p "public/builtin/runtime/game/animation/zx_yes"
mkdir -p "public/builtin/runtime/game/animation/zx_no"
```

- [ ] **Step 2: 拷贝 zx_yes 资源**

```bash
cp "D:/project/v1/test/L12_v1_test_14/images/animation/ani2/zx_yes.sk" "public/builtin/runtime/game/animation/zx_yes/"
cp "D:/project/v1/test/L12_v1_test_14/images/animation/ani2/zx_yes.png" "public/builtin/runtime/game/animation/zx_yes/"
```

- [ ] **Step 3: 拷贝 zx_no 资源**

```bash
cp "D:/project/v1/test/L12_v1_test_14/images/animation/ani3/zx_no.sk" "public/builtin/runtime/game/animation/zx_no/"
cp "D:/project/v1/test/L12_v1_test_14/images/animation/ani3/zx_no.png" "public/builtin/runtime/game/animation/zx_no/"
```

- [ ] **Step 4: 验证文件存在**

```bash
ls -la "public/builtin/runtime/game/animation/zx_yes/"
ls -la "public/builtin/runtime/game/animation/zx_no/"
```

预期：每个目录下有 .sk 和 .png 各一个文件

- [ ] **Step 5: Commit**

```bash
git add public/builtin/runtime/game/animation/zx_yes/ public/builtin/runtime/game/animation/zx_no/
git commit -m "feat: 添加口才反馈动画内置资源（zx_yes / zx_no）"
```

---

## Task 2: 在 builtinAssets.ts 注册 4 个资源

**Files:**
- Modify: `src/elements/builtinAssets.ts` (在 BUILTIN_ASSETS 数组末尾追加)

- [ ] **Step 1: 打开 builtinAssets.ts 找到 BUILTIN_ASSETS 数组末尾**

查看文件末尾的最后一个资源条目，准备在其后追加 4 条新资源。

- [ ] **Step 2: 在 BUILTIN_ASSETS 数组末尾追加 4 个资源**

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
  },
```

注意：在前一个资源条目的闭合花括号后加逗号，保持数组语法正确。

- [ ] **Step 3: 验证语法正确**

```bash
pnpm run lint src/elements/builtinAssets.ts
```

预期：无错误

- [ ] **Step 4: Commit**

```bash
git add src/elements/builtinAssets.ts
git commit -m "feat: 注册口才反馈动画内置资源到 builtinAssets"
```

---

## Task 3: ActionEditor 新增事件选项 + 隐藏作业/专题测评模式判断事件

**Files:**
- Modify: `src/components/ActionEditor.tsx` (新增 isHwOrEval 判断 + 修改 EVENT_OPTS 条件)

- [ ] **Step 1: 在组件顶部新增 isHwOrEval 判断**

找到 `export default function ActionEditor()` 函数体开头，在现有 `const` 声明区域添加：

```typescript
const course = useEditorStore((s) => s.currentCourse);
const isHwOrEval = course?.kind === 'homework' || course?.kind === 'sEvaluation';
```

- [ ] **Step 2: 找到 EVENT_OPTS 中 isConfirmButton 判断事件的代码块**

搜索 `onClickInitConfirm`，找到类似这样的代码：

```typescript
...(isConfirmButton && hasChoiceOrInput ? [
  { value: 'onClickInitConfirm', label: '点击+SDK通用判断' },
  { value: 'onClickInitConfirmWithLock', label: '点击+SDK通用判断+锁屏' },
] : []),
```

- [ ] **Step 3: 修改条件并新增 2 个事件选项**

将上述代码块替换为：

```typescript
...(isConfirmButton && hasChoiceOrInput && !isHwOrEval ? [
  { value: 'onClickInitConfirm', label: '点击+SDK通用判断' },
  { value: 'onClickInitConfirmWithLock', label: '点击+SDK通用判断+锁屏' },
  { value: 'onClickInitConfirmCH', label: '点击+口才文字动画通用判断(不经SDK)' },
  { value: 'onClickInitConfirmCHWithLock', label: '点击+口才文字动画通用判断(不经SDK)+锁屏' },
] : []),
```

关键改动：
1. 条件从 `isConfirmButton && hasChoiceOrInput` 改为 `isConfirmButton && hasChoiceOrInput && !isHwOrEval`
2. 数组末尾新增 2 个事件选项

- [ ] **Step 4: 验证语法正确**

```bash
pnpm run lint src/components/ActionEditor.tsx
```

预期：无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/ActionEditor.tsx
git commit -m "feat: ActionEditor 新增口才判断事件 + 作业/专题测评隐藏判断事件"
```

---

## Task 4: exportProject.ts - collectResources 按需收集反馈动画资源

**Files:**
- Modify: `src/utils/exportProject.ts:101-191` (collectResources 函数)

- [ ] **Step 1: 在 collectResources 函数末尾、return 前新增扫描逻辑**

找到 `function collectResources` 的 `return map;` 语句，在其之前插入：

```typescript
  // 口才反馈动画：扫描 actions，发现 onClickInitConfirmCH / *WithLock 时主动收集 4 个内置资源
  let needsCHFeedback = false;
  for (const stage of course.stages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if ((el.actions ?? []).some(a => a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock')) {
          needsCHFeedback = true;
          break;
        }
      }
      if (needsCHFeedback) break;
    }
    if (needsCHFeedback) break;
  }

  if (needsCHFeedback) {
    const yesSkSrc = '/builtin/runtime/game/animation/zx_yes/zx_yes.sk';
    const yesPngSrc = '/builtin/runtime/game/animation/zx_yes/zx_yes.png';
    const noSkSrc = '/builtin/runtime/game/animation/zx_no/zx_no.sk';
    const noPngSrc = '/builtin/runtime/game/animation/zx_no/zx_no.png';
    
    if (!map.has(yesSkSrc)) map.set(yesSkSrc, `${viewDir}/animation/feedback_CH_yes/zx_yes.sk`);
    if (!map.has(yesPngSrc)) map.set(yesPngSrc, `${viewDir}/animation/feedback_CH_yes/zx_yes.png`);
    if (!map.has(noSkSrc)) map.set(noSkSrc, `${viewDir}/animation/feedback_CH_no/zx_no.sk`);
    if (!map.has(noPngSrc)) map.set(noPngSrc, `${viewDir}/animation/feedback_CH_no/zx_no.png`);
  }

  return map;
```

- [ ] **Step 2: 验证语法正确**

```bash
pnpm run lint src/utils/exportProject.ts
```

预期：无错误

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: collectResources 按需收集口才反馈动画资源"
```

---

## Task 5: exportProject.ts - buildScene 注入 Spine 节点到 .scene

**Files:**
- Modify: `src/utils/exportProject.ts` (buildScene 函数)

- [ ] **Step 1: 找到 buildScene 函数的 return 语句**

搜索 `function buildScene`，找到函数末尾的 `return { json: sceneNode, varAssignment };` 语句。

- [ ] **Step 2: 在 return 前插入检测和注入逻辑**

在 `return { json: sceneNode, varAssignment };` **之前**插入：

```typescript
  // 口才反馈动画：检测到 onClickInitConfirmCH / *WithLock 事件时，在 child 末尾注入 2 个 Spine 节点
  const needsCHFeedback = page.elements.some(el => 
    (el.actions ?? []).some(a => 
      a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock'
    )
  );

  if (needsCHFeedback) {
    const yesSpine = {
      type: 'SkeletonPlayer',
      props: {
        name: 'Spine_kcFeedbackYes',
        x: -5,
        y: 1076,
        width: 400,
        height: 400,
        url: `${viewDir}/animation/feedback_CH_yes/zx_yes.sk`,
        currAniName: 'animation',
        isLoop: 'false',
        stopAt: 0,
        visible: false,
        var: 'Spine_kcFeedbackYes',
      }
    };

    const noSpine = {
      type: 'SkeletonPlayer',
      props: {
        name: 'Spine_kcFeedbackNo',
        x: 1,
        y: 1080,
        width: 400,
        height: 400,
        url: `${viewDir}/animation/feedback_CH_no/zx_no.sk`,
        currAniName: 'animation',
        isLoop: 'false',
        stopAt: 0,
        visible: false,
        var: 'Spine_kcFeedbackNo',
      }
    };

    sceneNode.child.push(yesSpine);
    sceneNode.child.push(noSpine);
    varAssignment.set('Spine_kcFeedbackYes', 'Spine_kcFeedbackYes');
    varAssignment.set('Spine_kcFeedbackNo', 'Spine_kcFeedbackNo');
  }
```

- [ ] **Step 3: 验证语法正确**

```bash
pnpm run lint src/utils/exportProject.ts
```

预期：无错误

- [ ] **Step 4: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: buildScene 自动注入口才反馈 Spine 节点到 .scene"
```

---

## Task 6: exportProject.ts - generateSceneTs 生成 GameUtile 调用 + 回调函数

**Files:**
- Modify: `src/utils/exportProject.ts` (generateSceneTs 函数)

- [ ] **Step 1: 在 generateSceneTs 开头新增检测逻辑**

找到 `function generateSceneTs` 的参数列表后，在函数体开头（`const getVar = ...` 之前）插入：

```typescript
  // 检测是否有口才反馈动画事件
  const chConfirmActions: Array<{ event: string; el: Element; targetEl: Element }> = [];
  for (const el of page.elements) {
    for (const action of (el.actions ?? [])) {
      if (action.event === 'onClickInitConfirmCH' || action.event === 'onClickInitConfirmCHWithLock') {
        const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
        if (targetEl) chConfirmActions.push({ event: action.event, el, targetEl });
      }
    }
  }
  const hasCHConfirm = chConfirmActions.length > 0;
```

- [ ] **Step 2: 找到 generateSceneTs 中 initView 的构建位置**

搜索 `initView()` 或 `function initView`，找到 `let initCode = '';` 的位置。

- [ ] **Step 3: 在 initCode 构建末尾、return 前插入 GameUtile 调用生成**

找到 `initView` 函数体的构建逻辑末尾，在生成最终 ts 代码的 `return` 语句之前，插入：

```typescript
  // 口才反馈动画：生成 GameUtile.initConfirmCH / initChoiceBoxCH 调用
  for (const { event, el, targetEl } of chConfirmActions) {
    const btnVar = getVar(el);
    const isLock = event === 'onClickInitConfirmCHWithLock';
    const lockArg = isLock ? ', null, this._lockBox' : ', null, null';
    
    if (targetEl.type === 'KlInputBox') {
      const inputBoxVar = getVar(targetEl);
      initCode += `        GameUtile.initConfirmCH(this, this.${btnVar}, this.${inputBoxVar}${lockArg}, this.playRightAni, this.playWrongAni);\n`;
    } else if (targetEl.layaType === 'ChoiceBox') {
      const choiceBoxVar = getVar(targetEl);
      initCode += `        GameUtile.initChoiceBoxCH(this, this.${btnVar}, this.${choiceBoxVar}${lockArg}, this.playRightAni, this.playWrongAni);\n`;
    }
  }
```

- [ ] **Step 4: 在类方法区末尾生成 3 个回调函数**

找到生成类定义的位置（通常在 `return` 语句构建最终字符串时），在类的末尾、闭合花括号之前插入：

```typescript
  // 口才反馈动画回调函数
  let chFeedbackMethods = '';
  if (hasCHConfirm) {
    chFeedbackMethods = `
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
`;
  }
```

然后在最终 return 的模板字符串中，在类的闭合花括号前插入 `${chFeedbackMethods}`。

- [ ] **Step 5: 验证语法正确**

```bash
pnpm run lint src/utils/exportProject.ts
```

预期：无错误

- [ ] **Step 6: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: generateSceneTs 生成口才反馈 GameUtile 调用 + 回调函数"
```

---

## Task 7: 重新打包 game.zip

**Files:**
- Modify: `public/builtin/runtime/game.zip`

- [ ] **Step 1: 压缩 game 目录为 game.zip**

```bash
cd public/builtin/runtime
zip -r game.zip game/
```

注意：Windows 上如果没有 zip 命令，可以用 7z 或 PowerShell 的 Compress-Archive：

```powershell
Compress-Archive -Path "public/builtin/runtime/game/*" -DestinationPath "public/builtin/runtime/game.zip" -Force
```

- [ ] **Step 2: 验证 zip 包含新资源**

```bash
unzip -l public/builtin/runtime/game.zip | grep "zx_yes\|zx_no"
```

预期：应看到 4 个文件：
```
game/animation/zx_yes/zx_yes.sk
game/animation/zx_yes/zx_yes.png
game/animation/zx_no/zx_no.sk
game/animation/zx_no/zx_no.png
```

- [ ] **Step 3: Commit**

```bash
git add public/builtin/runtime/game.zip
git commit -m "chore: 重新打包 game.zip（包含口才反馈动画）"
```

---

## Task 8: 手动测试 - 正常路径（ChoiceBox + 锁屏）

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 启动 forge 开发服务器**

```bash
pnpm dev
```

- [ ] **Step 2: 新建正课，添加组件**

1. 打开 forge，新建课程（默认正课）
2. 在画布上添加：ChoiceBox + 4 个 SpeechSelectableObj + ConfirmButton
3. 选中 ConfirmButton，打开属性面板

- [ ] **Step 3: 设置口才判断事件**

1. 在 Action Editor 区域，Event 下拉框选择"点击+口才文字动画通用判断(不经SDK)+锁屏"
2. Target 选择 ChoiceBox
3. 保存

- [ ] **Step 4: 导出工程**

点击 Toolbar 的"发布工程"按钮，等待导出完成。

- [ ] **Step 5: 检查 .scene 文件**

打开 `<课件包>/laya/pages/game_lt/Game1.scene`，搜索 `Spine_kcFeedbackYes`：

预期：child 数组末尾有 2 个 SkeletonPlayer 节点，var 分别为 `Spine_kcFeedbackYes` / `Spine_kcFeedbackNo`，visible 都是 false

- [ ] **Step 6: 检查 .ts 文件**

打开 `<课件包>/src/view/game_lt/Game1.ts`：

预期：
1. `initView` 内有 `GameUtile.initChoiceBoxCH(this, this.ConfirmButton_*, this.ChoiceBox_*, null, this._lockBox, this.playRightAni, this.playWrongAni);`
2. 类末尾有 `playRightAni()` / `playWrongAni()` / `playEnd()` 三个方法

- [ ] **Step 7: 检查资源目录**

检查 `<课件包>/laya/assets/game_lt/animation/`：

预期：有 `feedback_CH_yes/` 和 `feedback_CH_no/` 两个目录，每个下面有 .sk 和 .png

---

## Task 9: 手动测试 - KlInputBox 路径（不锁屏）

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 新建正课，添加组件**

1. 新建课程（默认正课）
2. 在画布上添加：KlInputBox + 1 个 KlInputImage + ConfirmButton

- [ ] **Step 2: 设置口才判断事件（不锁屏）**

1. 选中 ConfirmButton
2. Event 选择"点击+口才文字动画通用判断(不经SDK)"（不带锁屏）
3. Target 选择 KlInputBox
4. 保存

- [ ] **Step 3: 导出并检查 .ts**

导出后打开 `<课件包>/src/view/game_lt/Game1.ts`：

预期：`initView` 内是 `GameUtile.initConfirmCH(this, this.ConfirmButton_*, this.KlInputBox_*, null, null, this.playRightAni, this.playWrongAni);`

注意第 5 参数是 `null` 而非 `this._lockBox`

---

## Task 10: 手动测试 - 作业模式隐藏判断事件

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 新建作业课件**

1. 新建课程，类型选择"作业"
2. 添加 ChoiceBox + ConfirmButton

- [ ] **Step 2: 检查事件下拉框**

1. 选中 ConfirmButton
2. 打开属性面板，查看 Event 下拉框

预期：4 个判断事件全部不可见（onClickInitConfirm、onClickInitConfirmWithLock、onClickInitConfirmCH、onClickInitConfirmCHWithLock）

---

## Task 11: 手动测试 - 专题测评模式隐藏判断事件

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 新建专题测评课件**

1. 新建课程，类型选择"专题测评"
2. 添加 ChoiceBox + ConfirmButton

- [ ] **Step 2: 检查事件下拉框**

选中 ConfirmButton，查看 Event 下拉框：

预期：4 个判断事件全部不可见

---

## Task 12: 手动测试 - 不用此事件不携带资源

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 新建正课，不使用新事件**

1. 新建正课
2. 添加任意组件（Image、Text 等），不添加 ConfirmButton 或不使用口才判断事件
3. 导出

- [ ] **Step 2: 检查 .scene 不含 Spine 节点**

打开 `<课件包>/laya/pages/game_lt/Game1.scene`：

预期：child 数组中不应有 `Spine_kcFeedbackYes` / `Spine_kcFeedbackNo` 节点

- [ ] **Step 3: 检查 .ts 不含回调函数**

打开 `<课件包>/src/view/game_lt/Game1.ts`：

预期：不应有 `playRightAni` / `playWrongAni` / `playEnd` 方法

- [ ] **Step 4: 检查资源目录不含反馈动画**

检查 `<课件包>/laya/assets/game_lt/animation/`：

预期：不应有 `feedback_CH_yes/` 和 `feedback_CH_no/` 目录

---

## Task 13: 手动测试 - 一个 .scene 多个事件（去重）

**Files:**
- 无（手动操作测试）

- [ ] **Step 1: 在同一个 SubPage 添加 2 套组件**

1. 新建正课
2. 添加 ChoiceBox_1 + ConfirmButton_1，设置口才判断事件，target 指向 ChoiceBox_1
3. 添加 ChoiceBox_2 + ConfirmButton_2，设置口才判断事件，target 指向 ChoiceBox_2

- [ ] **Step 2: 导出并检查 .scene**

打开 `<课件包>/laya/pages/game_lt/Game1.scene`：

预期：child 数组末尾只有 1 套 Spine_kcFeedbackYes / Spine_kcFeedbackNo（不要重复注入）

- [ ] **Step 3: 检查 .ts 的 initView**

打开 `<课件包>/src/view/game_lt/Game1.ts`：

预期：
1. `initView` 内有 2 行 GameUtile 调用（分别对应 2 个 ConfirmButton）
2. 类末尾只有 1 份 `playRightAni` / `playWrongAni` / `playEnd`（不要重复生成）

---

## 自查清单

**Spec 覆盖检查：**
- [x] Part 1 内置资源管理 → Task 1 + Task 2 + Task 7
- [x] Part 2 ActionEditor 事件选项 → Task 3
- [x] Part 3 导出 .scene 注入 Spine → Task 5
- [x] Part 4 导出 .ts 生成调用 → Task 6
- [x] Part 5 作业模式隐藏 → Task 3（同步实现）
- [x] collectResources 按需收集 → Task 4
- [x] 测试场景 5.1 → Task 8
- [x] 测试场景 5.2 → Task 9
- [x] 测试场景 5.3 → Task 10
- [x] 测试场景 5.4 → Task 11
- [x] 测试场景 5.5 → Task 12
- [x] 测试场景 5.6 → Task 13

**占位符扫描：**
- [x] 无 TBD / TODO / "implement later"
- [x] 所有代码块包含实际代码

**类型一致性：**
- [x] var 名 `Spine_kcFeedbackYes` / `Spine_kcFeedbackNo` 在 Task 5 和 Task 6 一致
- [x] 事件名 `onClickInitConfirmCH` / `onClickInitConfirmCHWithLock` 在 Task 3/4/5/6 一致
- [x] 资源路径 `feedback_CH_yes` / `feedback_CH_no` 在 Task 2/4/5 一致

---

## 实施完成后

所有 Task 和测试通过后，最终 commit：

```bash
git add -A
git commit -m "feat: 完成口才文字反馈动画事件功能

新增 onClickInitConfirmCH / onClickInitConfirmCHWithLock 两个事件，
配合内置 Spine 反馈动画（zx_yes / zx_no），实现口才课程自定义判定反馈。

关键改动：
- 内置资源：注册 4 个 Spine 资源到 builtinAssets.ts
- ActionEditor：新增 2 个事件选项，作业 + 专题测评隐藏判断事件
- 导出流程：collectResources 按需收集，buildScene 注入 Spine 节点，
  generateSceneTs 生成 GameUtile 调用 + 回调函数
- 重新打包 game.zip 包含新资源

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

