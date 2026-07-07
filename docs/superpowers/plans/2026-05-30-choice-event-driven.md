# 选择题事件驱动改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让选择题判分逻辑跟填空题对称，全部走「事件驱动」，删除 generateSceneTs 中的硬编码选择题代码。

**Architecture:** 删除 `ChoiceBoxOkBtn` 组件统一为 `ConfirmButton`；让 `onClickInitConfirm` / `onClickInitConfirmWithLock` 事件按 target 类型路由到 `GameUtils.initConfirm`（KlInputBox）或 `GameUtils.initChoiceBoxConfirm`（ChoiceBox）；删 SceneFlags 全套；选项管理 name 升级双字母、布局横向追加、删除最少 2 个限制。

**Tech Stack:** TypeScript / React 18 / Zustand 4（immer）/ Vite 5 / pnpm 10。无测试框架——通过 `pnpm build` 校验类型，再手动跑 `pnpm dev` 验证编辑器交互和导出产物。

**Spec:** [docs/superpowers/specs/2026-05-30-choice-event-driven-design.md](../specs/2026-05-30-choice-event-driven-design.md)

---

## 文件结构

按职责拆解为 5 类改动，对应 5 个文件：

- **`src/elements/elementMeta.ts`**：删 `ChoiceBoxOkBtn`、`ChoiceBox` 解硬编码 var
- **`src/components/ElementToolbar.tsx`**：一键创建「选择题」附带 ConfirmButton + 预设 action
- **`src/components/ActionEditor.tsx`**：`onClickInitConfirm*` 事件 target 候选扩展为 KlInputBox + ChoiceBox
- **`src/store/editorStore.ts`**：选项管理 name 双字母 + 横向追加 + 移除最少 2 个限制
- **`src/utils/exportProject.ts`**：删 SceneFlags、删硬编码判分代码、initConfirm/initChoiceBoxConfirm 路由

每个 Task 独立可提交、可回归验证，建议按顺序实施（后续 Task 依赖前序的接口/数据结构）。

---

## Task 1: 删除 ChoiceBoxOkBtn 组件

**Files:**
- Modify: `src/elements/elementMeta.ts:257-278`

ChoiceBoxOkBtn 与 ConfirmButton 视觉/功能重叠，统一保留 ConfirmButton；m_qddk_on 皮肤已注册在 `okBtn` 资源组，ConfirmButton 换皮肤面板可选到。

- [ ] **Step 1: 删除 ChoiceBoxOkBtn meta 条目**

打开 [src/elements/elementMeta.ts](../../../src/elements/elementMeta.ts)，删除从 `ChoiceBoxOkBtn: {` 开始到 `},` 结束的整段（约 22 行，第 257-278 行附近）：

```ts
  ChoiceBoxOkBtn: {
    layaType: 'ScaleButton',
    label: '确定按钮',
    category: 'speechCourse',
    defaultSize: { width: 238, height: 126 },
    placeholderImage: assetSrc('okBtn.m_qddk_on'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    defaultProps: {
      anchorX: 0.5,
      anchorY: 0.5,
      skin: assetExport('okBtn.m_qddk_on'),
      stateNum: 1,
      label: '',
      var: 'btn_ok',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'var', label: '变量名', type: 'text', group: '交互' },
      { key: 'skin', label: '图片', type: 'file', group: '外观' },
      { key: 'stateNum', label: '状态数', type: 'select', group: '外观', options: [{ label: '1态(无变化)', value: 1 }, { label: '2态(正常/按下)', value: 2 }, { label: '3态(正常/悬停/按下)', value: 3 }] },
    ],
  },
```

只删这一段，**不要动**前后的 `ConfirmButton`（第 256 行）和 `NormalBtn`（第 279 行）。

- [ ] **Step 2: 类型检查**

Run: `pnpm build`
Expected: 输出无 `ChoiceBoxOkBtn` 相关引用错误。如果报错说 `Cannot find name 'ChoiceBoxOkBtn'`，按报错位置补 grep（应该没有，前置研究确认了仅 elementMeta.ts 自身定义）。

- [ ] **Step 3: 提交**

```bash
git add src/elements/elementMeta.ts
git commit -m "删除 ChoiceBoxOkBtn 组件，统一确定按钮为 ConfirmButton"
```

---

## Task 2: ChoiceBox 解硬编码 var

**Files:**
- Modify: `src/elements/elementMeta.ts:173`

去掉 `defaultProps.var: 'choiceBox'`，改走 `varFromName: true`，让创建出来的 ChoiceBox 自动 `var === name`。

- [ ] **Step 1: 修改 ChoiceBox meta**

打开 [src/elements/elementMeta.ts](../../../src/elements/elementMeta.ts)，定位 `ChoiceBox:` 那一行（第 173 行附近）。把：

```ts
  ChoiceBox:    { layaType: 'ChoiceBox',    label: '选择容器', category: 'choice', defaultSize: { width: 200, height: 200 }, defaultPosition: { x: 0, y: 0 }, placeholderImage: assetSrc('choiceBox.placeholder'), runtime: 'com.klzz.ui.custom.ChoiceBox', defaultProps: { var: 'choiceBox', filterColor: '#ffff00', filterBlur: 6 }, properties: [...COMMON_STATE_PROPS, { key: 'rightItemNames', label: '正确选项', type: 'text', group: '交互' }, { key: 'upperLimit', label: '最多选几个', type: 'number', min: 0, group: '交互' }, { key: 'requireSel', label: '必须选择', type: 'boolean', group: '交互' }, ...P_FILTER] },
```

改成：

```ts
  ChoiceBox:    { layaType: 'ChoiceBox',    label: '选择容器', category: 'choice', defaultSize: { width: 200, height: 200 }, defaultPosition: { x: 0, y: 0 }, placeholderImage: assetSrc('choiceBox.placeholder'), runtime: 'com.klzz.ui.custom.ChoiceBox', varFromName: true, defaultProps: { filterColor: '#ffff00', filterBlur: 6 }, properties: [...COMMON_STATE_PROPS, { key: 'rightItemNames', label: '正确选项', type: 'text', group: '交互' }, { key: 'upperLimit', label: '最多选几个', type: 'number', min: 0, group: '交互' }, { key: 'requireSel', label: '必须选择', type: 'boolean', group: '交互' }, ...P_FILTER] },
```

变化：
- `defaultProps` 中删掉 `var: 'choiceBox',`
- 在 `defaultProps:` 之前插入 `varFromName: true,`

- [ ] **Step 2: 类型检查**

Run: `pnpm build`
Expected: 通过。

- [ ] **Step 3: 提交**

```bash
git add src/elements/elementMeta.ts
git commit -m "ChoiceBox 去掉硬编码 var，改用 varFromName"
```

---

## Task 3: ActionEditor target 候选扩展为 KlInputBox + ChoiceBox

**Files:**
- Modify: `src/components/ActionEditor.tsx:156-162`
- Modify: `src/components/ActionEditor.tsx:200-204`

`onClickInitConfirm` / `onClickInitConfirmWithLock` 事件下 target 下拉之前只列 KlInputBox，现在也允许选 ChoiceBox。

- [ ] **Step 1: 修改切换事件时的默认 target 选择**

打开 [src/components/ActionEditor.tsx](../../../src/components/ActionEditor.tsx)，定位 `// 切到 onClickInitConfirm*：如果当前 target 不是 KlInputBox` 注释（约第 155 行）。把：

```tsx
                // 切到 onClickInitConfirm*：如果当前 target 不是 KlInputBox，默认选画布上第一个 KlInputBox
                if (nextEvent === 'onClickInitConfirm' || nextEvent === 'onClickInitConfirmWithLock') {
                  const currentTarget = group.targetId ? allElements.find((el) => el.id === group.targetId) : null;
                  if (!currentTarget || currentTarget.type !== 'KlInputBox') {
                    const firstKlInputBox = allElements.find((el) => el.type === 'KlInputBox');
                    patch.targetId = firstKlInputBox?.id;
                  }
                }
```

改成：

```tsx
                // 切到 onClickInitConfirm*：如果当前 target 不是 KlInputBox / ChoiceBox，默认选画布上第一个 ChoiceBox 或 KlInputBox
                if (nextEvent === 'onClickInitConfirm' || nextEvent === 'onClickInitConfirmWithLock') {
                  const currentTarget = group.targetId ? allElements.find((el) => el.id === group.targetId) : null;
                  const isValid = currentTarget && (currentTarget.type === 'KlInputBox' || currentTarget.layaType === 'ChoiceBox');
                  if (!isValid) {
                    const firstValid = allElements.find((el) => el.type === 'KlInputBox' || el.layaType === 'ChoiceBox');
                    patch.targetId = firstValid?.id;
                  }
                }
```

- [ ] **Step 2: 修改 target 下拉候选过滤**

定位约第 200-204 行的 target 下拉过滤逻辑：

```tsx
                  {iniInitConfirm && !group.targetId && <option value="">请选择输入框容器</option>}
                  {allElements.filter((el) => {
                    if (el.id === element.id) return false;
                    if (isInitConfirm) return el.type === 'KlInputBox';
                    return true;
                  }).map((el) => (
```

注意上面"请选择输入框容器"那行实际是 `isInitConfirm`（不是 iniInitConfirm，我抄的时候保留原文）；正确原文是：

```tsx
                  {isInitConfirm && !group.targetId && <option value="">请选择输入框容器</option>}
                  {allElements.filter((el) => {
                    if (el.id === element.id) return false;
                    if (isInitConfirm) return el.type === 'KlInputBox';
                    return true;
                  }).map((el) => (
```

改成：

```tsx
                  {isInitConfirm && !group.targetId && <option value="">请选择输入框容器或选择题容器</option>}
                  {allElements.filter((el) => {
                    if (el.id === element.id) return false;
                    if (isInitConfirm) return el.type === 'KlInputBox' || el.layaType === 'ChoiceBox';
                    return true;
                  }).map((el) => (
```

变化：
- 提示文案 `请选择输入框容器` → `请选择输入框容器或选择题容器`
- 过滤条件 `el.type === 'KlInputBox'` → `el.type === 'KlInputBox' || el.layaType === 'ChoiceBox'`

- [ ] **Step 3: 类型检查**

Run: `pnpm build`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add src/components/ActionEditor.tsx
git commit -m "ConfirmButton 判分事件 target 候选扩展为 KlInputBox + ChoiceBox"
```

---

## Task 4: 一键创建「选择题」附带 ConfirmButton + 预设 action

**Files:**
- Modify: `src/components/ElementToolbar.tsx:213-246`

工具栏「选择题」按钮当前只创建 ChoiceBox + 4 个 SpeechSelectableObj。改为同时创建 ConfirmButton 并预设 `onClickInitConfirmWithLock` action 指向新 ChoiceBox。

- [ ] **Step 1: 重写 handleAddChoice 函数**

打开 [src/components/ElementToolbar.tsx](../../../src/components/ElementToolbar.tsx)，定位 `/** 口才课选择题：创建 ChoiceBox + 4个选项卡片 */`（约第 213 行），把整个函数：

```tsx
  /** 口才课选择题：创建 ChoiceBox + 4个选项卡片 */
  const handleAddChoice = () => {
    if (frozen) return;
    const choiceBox = createDefaultElement('ChoiceBox');
    choiceBox.props = { ...choiceBox.props, upperLimit: 1, rightItemNames: '' };

    const optionNames = ['a', 'b', 'c', 'd'];
    const optionFgSkins = ['selectableObj.btn1', 'selectableObj.btn2', 'selectableObj.btn3', 'selectableObj.btn4'];
    const positions = [
      { x: 343, y: 938 }, { x: 714, y: 938 },
      { x: 1085, y: 938 }, { x: 1456, y: 938 },
    ];
    const options = optionNames.map((name, i) => {
      const opt = createDefaultElement('SpeechSelectableObj');
      opt.name = name;
      opt.x = positions[i].x;
      opt.y = positions[i].y;
      opt.parentId = choiceBox.id;
      opt.props = { ...opt.props, _foregroundSkin: assetExport(optionFgSkins[i]) };
      return opt;
    });

    const choiceObj = createLayaComponent(choiceBox);
    if (choiceObj) registerObject(choiceBox.id, choiceObj);
    addElement(choiceBox);

    options.forEach(opt => {
      const obj = createLayaComponent(opt, choiceObj);
      if (obj) registerObject(opt.id, obj);
      addElement(opt);
    });

    selectElement(choiceBox.id, false);
  };
```

替换为：

```tsx
  /** 口才课选择题：创建 ChoiceBox + 4个选项卡片 + ConfirmButton（预设 onClickInitConfirmWithLock） */
  const handleAddChoice = () => {
    if (frozen) return;
    const choiceBox = createDefaultElement('ChoiceBox');

    const optionNames = ['a', 'b', 'c', 'd'];
    const optionFgSkins = ['selectableObj.btn1', 'selectableObj.btn2', 'selectableObj.btn3', 'selectableObj.btn4'];
    const positions = [
      { x: 343, y: 938 }, { x: 714, y: 938 },
      { x: 1085, y: 938 }, { x: 1456, y: 938 },
    ];
    const options = optionNames.map((name, i) => {
      const opt = createDefaultElement('SpeechSelectableObj');
      opt.name = name;
      opt.x = positions[i].x;
      opt.y = positions[i].y;
      opt.parentId = choiceBox.id;
      opt.props = { ...opt.props, _foregroundSkin: assetExport(optionFgSkins[i]) };
      return opt;
    });

    const confirmBtn = createDefaultElement('ConfirmButton');
    confirmBtn.x = 1666;
    confirmBtn.y = 960;
    confirmBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event: 'onClickInitConfirmWithLock',
      targetId: choiceBox.id,
      actionType: 'toggleVisible',
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }];

    const choiceObj = createLayaComponent(choiceBox);
    if (choiceObj) registerObject(choiceBox.id, choiceObj);
    addElement(choiceBox);

    options.forEach(opt => {
      const obj = createLayaComponent(opt, choiceObj);
      if (obj) registerObject(opt.id, obj);
      addElement(opt);
    });

    const confirmObj = createLayaComponent(confirmBtn);
    if (confirmObj) registerObject(confirmBtn.id, confirmObj);
    addElement(confirmBtn);

    selectElement(choiceBox.id, false);
  };
```

变化：
- 删除 `choiceBox.props = { ...choiceBox.props, upperLimit: 1, rightItemNames: '' };` 那行（不再覆盖默认 props）
- 新增 ConfirmButton 创建（位置 `(1666, 960)` 与填空题一致）
- ConfirmButton 预设 `onClickInitConfirmWithLock` action，target 指向新建的 ChoiceBox
- 在原有 addElement 序列后面追加 ConfirmButton 的注册和 addElement

- [ ] **Step 2: 类型检查**

Run: `pnpm build`
Expected: 通过。注意确认 `Action` 类型字段是否要求 `groupId` —— 参考填空题 [ElementToolbar.tsx:328-334](../../../src/components/ElementToolbar.tsx#L328-L334) 的现成模板，本步骤代码已经沿用相同格式。

- [ ] **Step 3: 提交**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "一键创建选择题附带 ConfirmButton 与预设判分事件"
```

---

## Task 5: 选项管理优化（addChoiceOption 双字母 + 横向追加，removeChoiceOption 取消 2 个下限）

**Files:**
- Modify: `src/store/editorStore.ts:1721-1769`

选项 name 算法升级到 a-z + aa-zz；新增位置改为「上一个选项右侧 +10」；删除最少 2 个限制。

- [ ] **Step 1: 修改 addChoiceOption**

打开 [src/store/editorStore.ts](../../../src/store/editorStore.ts)，定位 `/** 口才课选择题：添加选项 */`（约第 1721 行）。把整个函数：

```ts
      /** 口才课选择题：添加选项 */
      addChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const existingNames = page.elements
              .filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj')
              .map(e => e.name);
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            const nextName = letters.split('').find(l => !existingNames.includes(l)) || 'x';
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            const lastOpt = existingOptions[existingOptions.length - 1];
            const newOpt = createDefaultElement('SpeechSelectableObj');
            newOpt.name = nextName;
            newOpt.parentId = choiceBoxId;
            newOpt.x = lastOpt ? lastOpt.x : 50;
            newOpt.y = lastOpt ? lastOpt.y + lastOpt.height + 10 : 50;
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(newOpt);
              return state;
            });
            const obj = createLayaComponent(newOpt, getObject(choiceBoxId));
            if (obj) registerObject(newOpt.id, obj);
            return;
          }
        }
      },
```

替换为：

```ts
      /** 口才课选择题：添加选项 */
      addChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            const existingNames = new Set(existingOptions.map(e => e.name));
            // a-z 用完后继续 aa-zz；预期足够支撑任何合理课件
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            let nextName: string | undefined;
            for (const c of letters) {
              if (!existingNames.has(c)) { nextName = c; break; }
            }
            if (!nextName) {
              outer: for (const a of letters) {
                for (const b of letters) {
                  const candidate = a + b;
                  if (!existingNames.has(candidate)) { nextName = candidate; break outer; }
                }
              }
            }
            if (!nextName) nextName = `opt_${existingOptions.length + 1}`;

            const lastOpt = existingOptions[existingOptions.length - 1];
            const newOpt = createDefaultElement('SpeechSelectableObj');
            newOpt.name = nextName;
            newOpt.parentId = choiceBoxId;
            // 横向追加：上一个选项右侧 +10；与一键创建的横向布局一致
            newOpt.x = lastOpt ? lastOpt.x + lastOpt.width + 10 : 50;
            newOpt.y = lastOpt ? lastOpt.y : 50;
            set((state) => {
              const sp = state.currentCourse?.stages.flatMap(s => s.subPages).find(p => p.id === state.currentSubPageId);
              if (!sp) return state;
              sp.elements.push(newOpt);
              return state;
            });
            const obj = createLayaComponent(newOpt, getObject(choiceBoxId));
            if (obj) registerObject(newOpt.id, obj);
            return;
          }
        }
      },
```

变化：
- name 生成：先单字母 a-z，再双字母 aa-ab-...-zz；都用完时回退 `opt_N`
- 位置：`x = lastOpt.x + lastOpt.width + 10`（横向）；`y = lastOpt.y`（保持同行）
- existingNames 改为 Set 提高查找速度
- existingOptions 复用一次，删除原代码里的二次 filter

- [ ] **Step 2: 修改 removeChoiceOption**

定位 `/** 口才课选择题：删除最后一个选项 */`（约第 1754 行）。把：

```ts
      /** 口才课选择题：删除最后一个选项 */
      removeChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            if (existingOptions.length <= 2) return;
            const lastOpt = existingOptions[existingOptions.length - 1];
            get().deleteElement(lastOpt.id);
            return;
          }
        }
      },
```

替换为：

```ts
      /** 口才课选择题：删除最后一个选项 */
      removeChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        for (const stage of course.stages) {
          for (const page of stage.subPages) {
            if (page.id !== subPageId) continue;
            const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
            if (existingOptions.length === 0) return;
            const lastOpt = existingOptions[existingOptions.length - 1];
            get().deleteElement(lastOpt.id);
            return;
          }
        }
      },
```

变化：
- `if (existingOptions.length <= 2) return;` → `if (existingOptions.length === 0) return;`

- [ ] **Step 3: 类型检查**

Run: `pnpm build`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add src/store/editorStore.ts
git commit -m "选项管理：name 支持双字母、新增位置改为横向追加、移除最少 2 个限制"
```

---

## Task 6: exportProject 删除 SceneFlags + 选择题硬编码代码 + initConfirm/initChoiceBoxConfirm 路由

**Files:**
- Modify: `src/utils/exportProject.ts:264-272`（删硬编码 var 收集）
- Modify: `src/utils/exportProject.ts:527-544`（删 SceneFlags 接口和 detectSceneFlags 函数）
- Modify: `src/utils/exportProject.ts:550, 647, 650, 653, 664`（buildTopLevelSceneChildren / buildScene 返回类型不再含 flags）
- Modify: `src/utils/exportProject.ts:671-686`（删 generateSceneTs 中 flags 参数和硬编码判分）
- Modify: `src/utils/exportProject.ts:777-789`（onClickInitConfirm 按 target 类型路由）
- Modify: `src/utils/exportProject.ts:1181-1182`（删基于 hasBtnOk+hasChoiceBox 的资源推断）
- Modify: `src/utils/exportProject.ts:1398, 1404-1405, 1470, 1477-1478, 1497, 1503`（调用处去 flags）

这是核心改动，按子步骤拆开。

- [ ] **Step 1: 删除 collectElementsNeedingVar 中的硬编码 var 收集**

定位 `// 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）`（约第 264 行）。把：

```ts
  // 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）
  for (const el of elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === 'btn_ok') needsVar.add(el.id);
    if (meta?.layaType === 'ChoiceBox') needsVar.add(el.id);
    // DragViewBox：generateSceneTs 监听 EVENT_SUCCESS / EVENT_FAILD
    if (el.type === 'DragViewBox') needsVar.add(el.id);
  }
```

替换为：

```ts
  // 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）
  for (const el of elements) {
    // DragViewBox：generateSceneTs 监听 EVENT_SUCCESS / EVENT_FAILD
    if (el.type === 'DragViewBox') needsVar.add(el.id);
  }
```

ConfirmButton 是 actions 源（自然进 Step 1 通用规则）；ChoiceBox/KlInputBox 是 action target（自然进 Step 1 通用规则）；不再单独硬编码。

同时把上方第 247 行注释也修：

```ts
 *  - 特殊硬编码组件：_btnConfirm / btn_ok、ChoiceBox（layaType）、DragViewBox
```

→

```ts
 *  - 特殊硬编码组件：DragViewBox
```

并把第 301 行的注释：

```ts
 *  - 优先使用 element.props.var（用户手填值，如 _btnConfirm / btn_ok 等硬编码值）
```

→

```ts
 *  - 优先使用 element.props.var（用户手填值）
```

- [ ] **Step 2: 删除 SceneFlags 接口与 detectSceneFlags 函数**

定位 `interface SceneFlags {`（约第 527 行）。把这一段：

```ts
interface SceneFlags {
  hasBtnConfirm: boolean;
  hasBtnOk: boolean;
  hasChoiceBox: boolean;
}

function detectSceneFlags(page: SubPage): SceneFlags {
  let hasBtnConfirm = false;
  let hasBtnOk = false;
  let hasChoiceBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === 'btn_ok') hasBtnOk = true;
    if (meta?.layaType === 'ChoiceBox') hasChoiceBox = true;
  }
  return { hasBtnConfirm, hasBtnOk, hasChoiceBox };
}
```

整段删除（包括前后空行调整）。

- [ ] **Step 3: 修改 buildTopLevelSceneChildren 返回类型与返回值**

定位约第 546-550 行：

```ts
function buildTopLevelSceneChildren(
  page: SubPage,
  resourceMap: Map<string, string>,
  parentId: number,
): { children: Record<string, unknown>[]; flags: SceneFlags; varAssignment: Map<string, string> } {
```

改为：

```ts
function buildTopLevelSceneChildren(
  page: SubPage,
  resourceMap: Map<string, string>,
  parentId: number,
): { children: Record<string, unknown>[]; varAssignment: Map<string, string> } {
```

定位约第 647 行的 return：

```ts
  return { children: out, flags: detectSceneFlags(page), varAssignment };
```

改为：

```ts
  return { children: out, varAssignment };
```

- [ ] **Step 4: 修改 buildScene 返回类型与返回值**

定位约第 650 行：

```ts
function buildScene(page: SubPage, sceneName: string, resourceMap: Map<string, string>, viewDir = 'game_lt'): { json: Record<string, unknown>; flags: SceneFlags; varAssignment: Map<string, string> } {
  _compId = 1;
  const rootId = nextId();
  const { children: child, flags, varAssignment } = buildTopLevelSceneChildren(page, resourceMap, rootId);
```

改为：

```ts
function buildScene(page: SubPage, sceneName: string, resourceMap: Map<string, string>, viewDir = 'game_lt'): { json: Record<string, unknown>; varAssignment: Map<string, string> } {
  _compId = 1;
  const rootId = nextId();
  const { children: child, varAssignment } = buildTopLevelSceneChildren(page, resourceMap, rootId);
```

定位 buildScene 内部最末的 return（约第 660-666 行附近，含 `flags,`）：

```ts
  return {
    json: { ... },
    flags,
    varAssignment,
  };
```

完整看一下并删除 `flags,` 那一行。先打开 [src/utils/exportProject.ts](../../../src/utils/exportProject.ts) 第 655-668 行确认实际内容；确认后删 `flags,` 一行即可。

注意：buildScene 函数返回结构需要保留 json + varAssignment，仅删 flags。

- [ ] **Step 5: 修改 generateSceneTs 签名 + 删除选择题硬编码判分**

定位约第 671 行：

```ts
function generateSceneTs(sceneName: string, flags: SceneFlags, page: SubPage, resourceMap: Map<string, string>, varAssignment: Map<string, string>, uiNamespace = 'game_lt'): string {
```

改为：

```ts
function generateSceneTs(sceneName: string, page: SubPage, resourceMap: Map<string, string>, varAssignment: Map<string, string>, uiNamespace = 'game_lt'): string {
```

紧接着定位约第 676-686 行：

```ts
  let initCode = '';
  if (flags.hasBtnOk && flags.hasChoiceBox) {
    initCode += '        this.btn_ok.on(Event.CLICK, this, function() {\n';
    initCode += `            if (this.choiceBox.isRight) {\n`;
    initCode += `                this.playSound("${uiNamespace}/sound/right.mp3");\n`;
    initCode += '            } else {\n';
    initCode += `                this.playSound("${uiNamespace}/sound/wrong.mp3");\n`;
    initCode += '                this.choiceBox.cancelAllSel();\n';
    initCode += '            }\n';
    initCode += '        });\n';
  }
```

改为：

```ts
  let initCode = '';
```

同时由于 `uiNamespace` 在该函数其它位置可能不再被使用，但函数仍接受这个参数（默认 `'game_lt'`），不要动它的签名其它部分。

- [ ] **Step 6: 修改 onClickInitConfirm 路由**

定位约第 777-789 行：

```ts
      // onClickInitConfirm / onClickInitConfirmWithLock：直接在 initView 注入 GameUtils.initConfirm，不绑定事件
      if (rawEvent === 'onClickInitConfirm' || rawEvent === 'onClickInitConfirmWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          if (targetEl && targetEl.type === 'KlInputBox') {
            const btnVar = getVar(el);
            const inputBoxVar = getVar(targetEl);
            const lockArg = rawEvent === 'onClickInitConfirmWithLock' ? ', null, this._lockBox' : '';
            initCode += `        GameUtils.initConfirm(this, this.${btnVar}, this.${inputBoxVar}${lockArg});\n`;
          }
        }
        continue;
      }
```

改为：

```ts
      // onClickInitConfirm / onClickInitConfirmWithLock：直接在 initView 注入判分调用，不绑定事件
      // - target 是 KlInputBox  → GameUtils.initConfirm（填空题）
      // - target 是 ChoiceBox   → GameUtils.initChoiceBoxConfirm（选择题）
      if (rawEvent === 'onClickInitConfirm' || rawEvent === 'onClickInitConfirmWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          if (!targetEl) continue;
          const btnVar = getVar(el);
          const targetVar = getVar(targetEl);
          const withLock = rawEvent === 'onClickInitConfirmWithLock';
          if (targetEl.type === 'KlInputBox') {
            // GameUtils.initConfirm(_view, _btnConfirm, _klInputBox, _hook?, _lockBox?)
            const lockArg = withLock ? ', null, this._lockBox' : '';
            initCode += `        GameUtils.initConfirm(this, this.${btnVar}, this.${targetVar}${lockArg});\n`;
          } else if (targetEl.layaType === 'ChoiceBox') {
            // GameUtils.initChoiceBoxConfirm(_view, _btnConfirm, _choiceBox, _hook, _lockBox?)
            // 注意 _lockBox 在 _hook 之后，第 4 参 _hook 必须显式传 null 占位
            const lockArg = withLock ? ', this._lockBox' : '';
            initCode += `        GameUtils.initChoiceBoxConfirm(this, this.${btnVar}, this.${targetVar}, null${lockArg});\n`;
          }
        }
        continue;
      }
```

- [ ] **Step 7: 删除资源清单基于 SceneFlags 的推断**

定位约第 1180-1183 行：

```ts
      let needBtnClick = false, needRight = false, needWrong = false;
      for (const page of stage.subPages) {
        const flags = detectSceneFlags(page);
        if (flags.hasBtnOk && flags.hasChoiceBox) { needRight = true; needWrong = true; }
        for (const el of page.elements) {
```

改为：

```ts
      let needBtnClick = false, needRight = false, needWrong = false;
      for (const page of stage.subPages) {
        for (const el of page.elements) {
```

注意：删除 `const flags = detectSceneFlags(page);` 那一行 + 紧随的 `if (flags.hasBtnOk && flags.hasChoiceBox) { ... }` 那一行。下方 `playRightSound` / `playWrongSound` action 累加逻辑保留不动。

- [ ] **Step 8: 修改 isHomework 分支调用处去 flags**

定位约第 1398-1405 行：

```ts
    const scenes: { name: string; json: Record<string, unknown>; flags: SceneFlags; page: SubPage }[] = [];
    for (let si = 0; si < baked.stages.length; si++) {
      const stage = baked.stages[si];
      const page = stage.subPages[0];
      if (!page || page.frozen) continue;
      const sceneName = `Game${si + 1}`;
      const { json, flags } = buildScene(page, sceneName, resourceMap, 'game_hw');
      scenes.push({ name: sceneName, json, flags, page });
    }
```

改为：

```ts
    const scenes: { name: string; json: Record<string, unknown>; page: SubPage }[] = [];
    for (let si = 0; si < baked.stages.length; si++) {
      const stage = baked.stages[si];
      const page = stage.subPages[0];
      if (!page || page.frozen) continue;
      const sceneName = `Game${si + 1}`;
      const { json } = buildScene(page, sceneName, resourceMap, 'game_hw');
      scenes.push({ name: sceneName, json, page });
    }
```

- [ ] **Step 9: 修改 lt（else）分支调用处去 flags**

定位约第 1470-1478 行：

```ts
  const scenes: { name: string; json: Record<string, unknown>; flags: SceneFlags; page: SubPage; varAssignment: Map<string, string> }[] = [];
  for (let si = 0; si < baked.stages.length; si++) {
    const stage = baked.stages[si];
    for (let sj = 0; sj < stage.subPages.length; sj++) {
      const page = stage.subPages[sj];
      if (page.frozen) continue; // 视频关卡不生成 .scene
      const sceneName = `GameLT${si + 1}_${sj + 1}`;
      const { json, flags, varAssignment } = buildScene(page, sceneName, resourceMap);
      scenes.push({ name: sceneName, json, flags, page, varAssignment });
    }
  }
```

改为：

```ts
  const scenes: { name: string; json: Record<string, unknown>; page: SubPage; varAssignment: Map<string, string> }[] = [];
  for (let si = 0; si < baked.stages.length; si++) {
    const stage = baked.stages[si];
    for (let sj = 0; sj < stage.subPages.length; sj++) {
      const page = stage.subPages[sj];
      if (page.frozen) continue; // 视频关卡不生成 .scene
      const sceneName = `GameLT${si + 1}_${sj + 1}`;
      const { json, varAssignment } = buildScene(page, sceneName, resourceMap);
      scenes.push({ name: sceneName, json, page, varAssignment });
    }
  }
```

定位约第 1497-1503 行：

```ts
  for (const { name, json, flags, page: scenePage, varAssignment } of scenes) {
    await eApi.writeTextFile(
      `${projectRoot}/laya/pages/game_lt/${name}.scene`,
      JSON.stringify(json, null, 2),
    );
    // 每个 scene 对应一个 ts 文件（基于 lessonModel.ts 模板）
    const tsContent = generateSceneTs(name, flags, scenePage, resourceMap, varAssignment);
```

改为：

```ts
  for (const { name, json, page: scenePage, varAssignment } of scenes) {
    await eApi.writeTextFile(
      `${projectRoot}/laya/pages/game_lt/${name}.scene`,
      JSON.stringify(json, null, 2),
    );
    // 每个 scene 对应一个 ts 文件（基于 lessonModel.ts 模板）
    const tsContent = generateSceneTs(name, scenePage, resourceMap, varAssignment);
```

- [ ] **Step 10: 类型检查**

Run: `pnpm build`
Expected: 通过。如果报 `SceneFlags` 未定义错误，按报错位置回头补漏；如果报 `flags` 未定义错误，同样回头补漏。

- [ ] **Step 11: 提交**

```bash
git add src/utils/exportProject.ts
git commit -m "选择题判分改为事件驱动 + 删 SceneFlags 和硬编码判分代码"
```

---

## Task 7: 端到端验证（手动）

**Files:**（不改代码，仅校验）

把前面 6 个 Task 加起来后跑一遍编辑器和导出，确保改造前后行为达到预期。

- [ ] **Step 1: 启动 dev 服务器**

Run: `pnpm dev`
Expected: 输出 `Local: http://localhost:6688`，无错误。

- [ ] **Step 2: 浏览器验证编辑器交互**

打开 `http://localhost:6688`，新建一个课件，进入编辑器，做下列操作并确认：

1. 工具栏 tab `豌豆口才` → 点击 `选择题`
2. 画布上出现：1 个 ChoiceBox（透明）+ 4 个 SpeechSelectableObj（btn1-4 横排，y=938）+ 1 个 ConfirmButton（位置 1666, 960）
3. 选中 ConfirmButton → 右侧属性面板 Action Editor 区域已显示一条 `点击+判断+错误效果+动画+锁屏` 事件，target 是新建的 ChoiceBox
4. 选中 ChoiceBox → 属性面板出现「选项管理」区，可点 `添加选项` → 第 5 个选项出现在第 4 个右侧（横向追加）
5. 一直加到 27 个选项 → name 顺序应该为 a, b, ..., z, aa；第 28 个 → ab
6. 删除选项一直到 0 个 → 不报错（不再被「最少 2 个」拦住）
7. 选中 ChoiceBox → 元素列表/属性面板上看 var 字段（如有暴露）应等于 name；导出前 var 不再硬编码 choiceBox

- [ ] **Step 3: 导出 + 预览**

在 Toolbar 点 `预览`，等编译完成后查看 `preview-server/lessons/<courseId>_LessonZK/src/view/game_lt/GameLT1_1.ts`：

1. 文件中应有 `GameUtils.initChoiceBoxConfirm(this, this.<btnVar>, this.<choiceBoxVar>, null, this._lockBox);` 一行
2. 文件中**不应该再出现** `this.btn_ok.on(Event.CLICK,` / `this.choiceBox.isRight` / `this.choiceBox.cancelAllSel()` / `this.playSound("game_lt/sound/right.mp3")` 这些硬编码片段
3. `<btnVar>` 应该是 ConfirmButton 的实际 name（如 `ConfirmButton_1`），`<choiceBoxVar>` 应该是 ChoiceBox 的实际 name（如 `ChoiceBox_1`）

打开浏览器预览页面：

1. 4 个选项可点击；选错后选中项有红框，笑/哭脸反馈出现，**没有**额外 right.mp3 / wrong.mp3 音频
2. 选对后锁屏，showAnswerFace(1) 笑脸出现
3. 不锁屏变体：把 ConfirmButton 的 action 改为 `点击+判断+错误效果+动画`（不带锁屏），再预览，选对后界面不锁

- [ ] **Step 4: 兼容性回归**

新建一关，工具栏 `豌豆口才` → 点 `填空题`：

1. 检查导出 ts：应有 `GameUtils.initConfirm(this, this.<btnVar>, this.<inputBoxVar>, null, this._lockBox);`（注意签名格式：本计划的填空题路由保持与原版一致——3 参或 5 参，依锁屏变体而定）
2. **重要**：原代码 `GameUtils.initConfirm(this, this.${btnVar}, this.${inputBoxVar}${lockArg});` 中 `lockArg` 是 `, null, this._lockBox`（即 5 参带 null hook）。本计划 Step 6 中填空题路由用 `const lockArg = withLock ? ', null, this._lockBox' : '';` 与原代码一致；不带锁屏时 3 参。
3. 跑预览，填空题判分应仍正常工作。

- [ ] **Step 5: 同页两组判分独立**

在同一关里：通过工具栏多次点 `选择题`，让画布上同时有两组 ChoiceBox+ConfirmButton。

1. 两个 ConfirmButton 自动 var 不同（ConfirmButton_1, ConfirmButton_2）
2. 两个 ChoiceBox 自动 var 不同（ChoiceBox_1, ChoiceBox_2）
3. 导出 ts 中应有两行 `GameUtils.initChoiceBoxConfirm(...)`，分别引用各自的 var
4. 浏览器预览：点 ConfirmButton_1 只判 ChoiceBox_1，反之亦然

- [ ] **Step 6: ConfirmButton 换皮肤**

选中任一 ConfirmButton → 属性面板「替换资源」按钮 → 弹窗里应能看到 `m_qddk_on`（粉色卡通），点选后画布按钮换肤。

- [ ] **Step 7: 删 ConfirmButton 后导出**

删除画布上选择题的 ConfirmButton 元素。再次导出预览，ts 文件**不应出现** `GameUtils.initChoiceBoxConfirm` 调用，也不应有孤立 `this.choiceBox`、`this.btn_ok` 引用。

- [ ] **Step 8: 校验完成**

如全部通过，删除任何调试用残留物（无）。

如发现问题，回到对应 Task 修复后再走一次此 Task。

---

## Self-Review

### Spec coverage

逐条核对 spec 章节：

| Spec 章节 | 实现位置 |
|---|---|
| 1. 删除 ChoiceBoxOkBtn | Task 1 |
| 2. ChoiceBox 解硬编码 var | Task 2 |
| 3. ConfirmButton 事件支持 ChoiceBox target | Task 3（ActionEditor）+ Task 6 Step 6（exportProject 路由） |
| 4. 删除硬编码判分代码与 SceneFlags | Task 6 Step 2/3/4/5/7/8/9 |
| 5. 收集 var 简化 | Task 6 Step 1 |
| 6. 一键创建「选择题」改造 | Task 4 |
| 7. 选项管理 | Task 5 |
| 验证清单（spec 第 7 章 1-8） | Task 7 Step 2-7 |
| 行为差异（spec 第 6 章） | Task 7 Step 3 ②③ 显式核对「不应再播 right/wrong」 |

全部覆盖。

### Placeholder scan

无 TBD/TODO；每个步骤都给出完整代码块；无 "类似 Task N，重复"；无未定义符号引用。

### Type consistency

- `generateSceneTs` 签名修改后调用处 1 处（Task 6 Step 9）也同步去掉 `flags` 实参 ✓
- `buildScene` / `buildTopLevelSceneChildren` 返回类型同步，所有解构调用点（Task 6 Step 8/9）都更新 ✓
- `GameUtils.initChoiceBoxConfirm` 第 4 参 `_hook` 显式传 `null`、`_lockBox` 在第 5 参 ✓
- `varFromName: true` 与 `defaultProps` 字段顺序遵守 elementMeta.ts 现有约定（Task 2 把 `varFromName: true` 放在 `runtime` 之后、`defaultProps` 之前；其它项也都这么放——参考 [elementMeta.ts:175 DragObj](../../../src/elements/elementMeta.ts#L175)）✓

---

## 执行说明

无独立测试套件，验证全部走 `pnpm build`（类型/编译）+ Task 7 手动验证。如运行 Task 6 步骤 5 后类型报某个 .scene 字段缺失，常见是漏改 buildScene return 块的 `flags,` —— 把那行删掉即可。

每个 Task 结束都做一次 `pnpm build` + 单独 commit，方便事后 bisect。
