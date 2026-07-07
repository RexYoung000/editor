# ChoiceBoxOkBtn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "确定按钮" (ChoiceBoxOkBtn) component to the speechCourse category that auto-binds to ChoiceBox for answer validation on export.

**Architecture:** New elementMeta entry (layaType ScaleButton, var btn_ok) + builtin asset registration + page-level detection + auto-injected click handler in both export.ts (LessonZK.js) and exportProject.ts (scene .ts files).

**Tech Stack:** TypeScript, LayaAir/sdk_baiya, Zustand store, Vite

---

### Task 1: Copy button image and register as builtin asset

**Files:**
- Create: `public/builtin/runtime/game/okBtn/m_qddk_on.png`
- Modify: `src/elements/builtinAssets.ts:174` (add after existing okBtn entries)

- [ ] **Step 1: Copy image file**

Copy `m_qddk_on.png` from the desktop to the builtin runtime directory:

```bash
cp "C:/Users/wwjie/Desktop/3D通用按钮切图/按钮切图/m_qddk_on.png" "D:/hltn/课件资源/工具/forge/public/builtin/runtime/game/okBtn/m_qddk_on.png"
```

- [ ] **Step 2: Add builtin asset entry**

In `src/elements/builtinAssets.ts`, add a new line after line 176 (after the existing `okBtn.btn_qd4` entry):

```typescript
  { id: 'okBtn.m_qddk_on', src: 'runtime/game/okBtn/m_qddk_on.png', exportPath: 'game/okBtn/m_qddk_on.png' },
```

This should go inside the `BUILTIN_ASSETS` array, in the okBtn section after line 176:

```typescript
  // ─── 确定按钮资源（确定按钮组件 ConfirmButton 的内置皮肤库）───
  { id: 'okBtn.btn_qd',   src: 'runtime/game/okBtn/btn_qd.png',   exportPath: 'game/okBtn/btn_qd.png' },
  { id: 'okBtn.btn_qd2',  src: 'runtime/game/okBtn/btn_qd2.png',  exportPath: 'game/okBtn/btn_qd2.png' },
  { id: 'okBtn.btn_qd3',  src: 'runtime/game/okBtn/btn_qd3.png',  exportPath: 'game/okBtn/btn_qd3.png' },
  { id: 'okBtn.btn_qd4',  src: 'runtime/game/okBtn/btn_qd4.png',  exportPath: 'game/okBtn/btn_qd4.png' },
  { id: 'okBtn.m_qddk_on', src: 'runtime/game/okBtn/m_qddk_on.png', exportPath: 'game/okBtn/m_qddk_on.png' },
```

- [ ] **Step 3: Verify file exists and asset is accessible**

```bash
ls "D:/hltn/课件资源/工具/forge/public/builtin/runtime/game/okBtn/m_qddk_on.png"
```

Expected: file listed. In browser, `http://localhost:6688/builtin/runtime/game/okBtn/m_qddk_on.png` should load the image.

- [ ] **Step 4: Commit**

```bash
git add public/builtin/runtime/game/okBtn/m_qddk_on.png src/elements/builtinAssets.ts
git commit -m "feat: add m_qddk_on.png builtin asset for ChoiceBoxOkBtn component"
```

---

### Task 2: Add ChoiceBoxOkBtn elementMeta entry

**Files:**
- Modify: `src/elements/elementMeta.ts:231` (add after ConfirmButton entry)

- [ ] **Step 1: Add the meta entry**

In `src/elements/elementMeta.ts`, add a new entry after the `ConfirmButton` entry at line 231. The image dimensions are 238x126, so use those as defaultSize:

```typescript
  ChoiceBoxOkBtn: {
    layaType: 'ScaleButton',
    label: '确定按钮',
    category: 'speechCourse',
    defaultSize: { width: 238, height: 126 },
    placeholderImage: assetSrc('okBtn.m_qddk_on'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    defaultProps: {
      skin: assetExport('okBtn.m_qddk_on'),
      stateNum: 1,
      label: '',
      var: 'btn_ok',
    },
    properties: [
      { key: 'var', label: '变量名', type: 'text', group: '交互' },
    ],
  },
```

This goes right after the ConfirmButton line, so the section looks like:

```typescript
  ConfirmButton: { layaType: 'ScaleButton', label: '确定按钮', category: 'newComponents', defaultSize: { width: 272, height: 92 }, placeholderImage: assetSrc('okBtn.btn_qd'), defaultProps: { skin: assetExport('okBtn.btn_qd'), stateNum: 1, label: '', var: '_btnConfirm' }, properties: [{ key: 'var', label: '变量名', type: 'text', group: '交互' }] },
  ChoiceBoxOkBtn: {
    layaType: 'ScaleButton',
    label: '确定按钮',
    category: 'speechCourse',
    defaultSize: { width: 238, height: 126 },
    placeholderImage: assetSrc('okBtn.m_qddk_on'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    defaultProps: {
      skin: assetExport('okBtn.m_qddk_on'),
      stateNum: 1,
      label: '',
      var: 'btn_ok',
    },
    properties: [
      { key: 'var', label: '变量名', type: 'text', group: '交互' },
    ],
  },
```

- [ ] **Step 2: Verify the app compiles without errors**

Run: `pnpm build`
Expected: no TypeScript errors related to elementMeta.

- [ ] **Step 3: Commit**

```bash
git add src/elements/elementMeta.ts
git commit -m "feat: add ChoiceBoxOkBtn elementMeta entry in speechCourse category"
```

---

### Task 3: Add pageNeedsChoiceBoxOkLogic and export code in export.ts

**Files:**
- Modify: `src/utils/export.ts:378` (add function after pageNeedsConfirmLogic)
- Modify: `src/utils/export.ts:638` (add export code after first pageNeedsConfirmLogic block)
- Modify: `src/utils/export.ts:725` (add export code after second pageNeedsConfirmLogic block in previewStages)

- [ ] **Step 1: Add the detection function**

In `src/utils/export.ts`, add a new function right after `pageNeedsConfirmLogic` (after line 378):

```typescript

/** 页面是否需要绑定 ChoiceBox 判断对错逻辑（同时存在 btn_ok + ChoiceBox） */
function pageNeedsChoiceBoxOkLogic(page: Page): boolean {
  let hasBtnOk = false;
  let hasChoiceBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === 'btn_ok') hasBtnOk = true;
    if (meta?.layaType === 'ChoiceBox') hasChoiceBox = true;
    if (hasBtnOk && hasChoiceBox) return true;
  }
  return false;
}
```

- [ ] **Step 2: Add export code in the 正课 pages section (after line 638)**

In `src/utils/export.ts`, right after the `pageNeedsConfirmLogic` block at line 634-638, add:

```typescript

      // 口才课选择页面：自动绑定确定按钮 → ChoiceBox 判断对错
      if (pageNeedsChoiceBoxOkLogic(page)) {
        lines.push(`            if (this.btn_ok && this.choiceBox) {`);
        lines.push(`                this.btn_ok.on(Laya.Event.CLICK, this, function() {`);
        lines.push(`                    this.mouseEnabled = false;`);
        lines.push(`                    if (this.choiceBox.isRight) {`);
        lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/rush_flag.wav");`);
        lines.push(`                        Laya.timer.once(4000, this, function() {`);
        lines.push(`                            com.biz.VipThink.viewMgr.feedBackView.event("showAnswerFace", [1]);`);
        lines.push(`                        });`);
        lines.push(`                    } else {`);
        lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/anwser_wrong.wav");`);
        lines.push(`                        this.choiceBox.cancelAllSel();`);
        lines.push(`                        this.mouseEnabled = true;`);
        lines.push(`                    }`);
        lines.push(`                });`);
        lines.push(`            }`);
      }
```

- [ ] **Step 3: Add identical export code in the 预习 pages section (after line 725)**

The previewStages section (line 721-725) also has a `pageNeedsConfirmLogic` block. Add the same `pageNeedsChoiceBoxOkLogic` block right after it:

```typescript

      // 口才课选择页面：自动绑定确定按钮 → ChoiceBox 判断对错
      if (pageNeedsChoiceBoxOkLogic(page)) {
        lines.push(`            if (this.btn_ok && this.choiceBox) {`);
        lines.push(`                this.btn_ok.on(Laya.Event.CLICK, this, function() {`);
        lines.push(`                    this.mouseEnabled = false;`);
        lines.push(`                    if (this.choiceBox.isRight) {`);
        lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/rush_flag.wav");`);
        lines.push(`                        Laya.timer.once(4000, this, function() {`);
        lines.push(`                            com.biz.VipThink.viewMgr.feedBackView.event("showAnswerFace", [1]);`);
        lines.push(`                        });`);
        lines.push(`                    } else {`);
        lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/anwser_wrong.wav");`);
        lines.push(`                        this.choiceBox.cancelAllSel();`);
        lines.push(`                        this.mouseEnabled = true;`);
        lines.push(`                    }`);
        lines.push(`                });`);
        lines.push(`            }`);
      }
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/export.ts
git commit -m "feat: add pageNeedsChoiceBoxOkLogic detection and auto-bind in export.ts"
```

---

### Task 4: Extend SceneFlags and generateSceneTs in exportProject.ts

**Files:**
- Modify: `src/utils/exportProject.ts:248-264` (SceneFlags interface + detectSceneFlags)
- Modify: `src/utils/exportProject.ts:427-452` (generateSceneTs)

- [ ] **Step 1: Extend SceneFlags interface**

In `src/utils/exportProject.ts`, replace the SceneFlags interface and detectSceneFlags function (lines 248-264) with:

```typescript
interface SceneFlags {
  hasBtnConfirm: boolean;
  hasKlInputBox: boolean;
  hasBtnOk: boolean;
  hasChoiceBox: boolean;
}

function detectSceneFlags(page: SubPage): SceneFlags {
  let hasBtnConfirm = false;
  let hasKlInputBox = false;
  let hasBtnOk = false;
  let hasChoiceBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === '_btnConfirm') hasBtnConfirm = true;
    const wrapperVar = (meta?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    if (wrapperVar === '_klInputBox') hasKlInputBox = true;
    if (merged.var === 'btn_ok') hasBtnOk = true;
    if (meta?.layaType === 'ChoiceBox') hasChoiceBox = true;
  }
  return { hasBtnConfirm, hasKlInputBox, hasBtnOk, hasChoiceBox };
}
```

- [ ] **Step 2: Extend generateSceneTs function**

In `src/utils/exportProject.ts`, replace the generateSceneTs function (lines 427-452) with:

```typescript
function generateSceneTs(sceneName: string, flags: SceneFlags): string {
  let initCode = '';
  if (flags.hasBtnConfirm && flags.hasKlInputBox) {
    initCode += '        GameUtils.initConfirm(this, this._btnConfirm, this._klInputBox, null, this._lockBox);\n';
  }
  if (flags.hasBtnOk && flags.hasChoiceBox) {
    initCode += '        this.btn_ok.on(Event.CLICK, this, function() {\n';
    initCode += '            this.mouseEnabled = false;\n';
    initCode += '            if (this.choiceBox.isRight) {\n';
    initCode += '                com.klzz.media.KlSoundManager.playSound("share/sound/rush_flag.wav");\n';
    initCode += '                Laya.timer.once(4000, this, function() {\n';
    initCode += '                    com.biz.VipThink.viewMgr.feedBackView.event("showAnswerFace", [1]);\n';
    initCode += '                });\n';
    initCode += '            } else {\n';
    initCode += '                com.klzz.media.KlSoundManager.playSound("share/sound/anwser_wrong.wav");\n';
    initCode += '                this.choiceBox.cancelAllSel();\n';
    initCode += '                this.mouseEnabled = true;\n';
    initCode += '            }\n';
    initCode += '        });\n';
  }
  return `import { ui } from "../../ui/layaMaxUI";

import Event = Laya.Event;
import Image = Laya.Image;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
import { GameUtils } from "./GameUtils";

export default class ${sceneName} extends ui.game_lt.${sceneName}UI {

    public initView(byReset: boolean) {
        super.initView(byReset);

${initCode}        //add script
    }
    //add function
}`;
}
```

Note the key change: `initCode =` → `initCode +=` for the first block (line 430), so both conditions can coexist in the same initView.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: extend SceneFlags with ChoiceBox detection and auto-bind in exportProject.ts"
```

---

### Task 5: Verify end-to-end in the editor

**Files:** No new changes — verification only.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Wait for vite to start on port 6688.

- [ ] **Step 2: Open editor and check component appears**

Open the editor in Electron (or browser). Check that:
1. The "口才课组件" tab shows a "确定按钮" entry
2. Dragging it onto the canvas shows the m_qddk_on.png placeholder image
3. The property panel shows a "变量名" field under the "交互" group, defaulting to `btn_ok`

- [ ] **Step 3: Verify export with ChoiceBox**

Create a page with both a ChoiceBox and a ChoiceBoxOkBtn, then click the publish/export button. Check the generated code:
1. In LessonZK.js — verify the btn_ok click handler with choiceBox.isRight logic appears
2. In the .ts project file — verify the Event.CLICK handler with choiceBox.isRight logic appears

- [ ] **Step 4: Final commit (if any tweaks needed)**

If any adjustments were needed during verification, commit them.