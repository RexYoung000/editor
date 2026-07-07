# Spine Animate Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a button's `animate` action targets a Spine component, the UI automatically switches to show a Spine animation name dropdown (from `_animationList`) and a loop toggle; the export generates `t.play(aniName, loop)` instead of `t.play('shan')`.

**Architecture:** Adaptive behavior based on target element type — the existing `animate` action type detects whether the target is a Spine element and switches UI/export accordingly. No new action type added.

**Tech Stack:** React/TSX (ActionEditor), TypeScript types (Action interface), TypeScript (exportProject.ts)

---

### Task 1: Add `spineLoop` field to Action interface

**Files:**
- Modify: `src/types/index.ts:1-8`

- [ ] **Step 1: Add the `spineLoop` optional field**

Current `Action` interface:
```ts
export interface Action {
  id: string;
  event: string;        // 'onClick' | 'onLoad'
  targetId?: string;    // undefined = self
  actionType: string;   // 'setProperty' | 'toggleVisible' | 'changePage' | 'showOverlay' | 'hideOverlay'
  property?: string;    // for setProperty
  value?: unknown;
}
```

Add `spineLoop` after `value`:
```ts
export interface Action {
  id: string;
  event: string;        // 'onClick' | 'onLoad'
  targetId?: string;    // undefined = self
  actionType: string;   // 'setProperty' | 'toggleVisible' | 'changePage' | 'showOverlay' | 'hideOverlay'
  property?: string;    // for setProperty
  value?: unknown;
  spineLoop?: 'true' | 'false';  // animate target=Spine: loop playback control
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add spineLoop field to Action interface"
```

---

### Task 2: Add i18n keys for loop toggle

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: Add keys to zh section**

After the `animRotate: '旋转',` line (~line 190), add:

```ts
    animSpineName: '动画名',
    loopPlay: '循环播放',
```

- [ ] **Step 2: Add keys to en section**

After the `animRotate: 'Rotate',` line (~line 982), add:

```ts
    animSpineName: 'Animation Name',
    loopPlay: 'Loop Play',
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat: add i18n keys for Spine animate action"
```

---

### Task 3: Modify ActionEditor — adaptive animate UI

**Files:**
- Modify: `src/components/ActionEditor.tsx:209-221`

- [ ] **Step 1: Replace the animate UI block**

Current animate block (lines 209-221):
```tsx
          {/* animate */}
          {action.actionType === 'animate' && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 w-7 shrink-0">{t('animation')}</span>
              <select value={String(action.value ?? 'shan')}
                onChange={(e) => update(i, { value: e.target.value })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                <option value="shan">{t('animFlash')}</option>
                <option value="suo">{t('animScale')}</option>
                <option value="zhuan">{t('animRotate')}</option>
              </select>
            </div>
          )}
```

Replace with adaptive version that detects Spine target:
```tsx
          {/* animate — adaptive UI based on target type */}
          {action.actionType === 'animate' && (() => {
            const targetEl = action.targetId ? allElements.find((el) => el.id === action.targetId) : element;
            const isSpineTarget = targetEl?.type === 'Spine';
            if (isSpineTarget) {
              const animList = Array.isArray(targetEl?.props?._animationList) ? (targetEl.props._animationList as string[]) : [];
              return (
                <>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-slate-500 w-7 shrink-0">{t('animSpineName')}</span>
                    <select value={String(action.value ?? '')}
                      onChange={(e) => update(i, { value: e.target.value })}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                      <option value="">{t('selectProperty')}</option>
                      {animList.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 w-7 shrink-0">{t('loopPlay')}</span>
                    <select value={String(action.spineLoop ?? 'true')}
                      onChange={(e) => update(i, { spineLoop: e.target.value as 'true' | 'false' })}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                      <option value="true">{t('yes')}</option>
                      <option value="false">{t('no')}</option>
                    </select>
                  </div>
                </>
              );
            }
            return (
              <div className="flex items-center gap-1">
                <span className="text-slate-500 w-7 shrink-0">{t('animation')}</span>
                <select value={String(action.value ?? 'shan')}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                  <option value="shan">{t('animFlash')}</option>
                  <option value="suo">{t('animScale')}</option>
                  <option value="zhuan">{t('animRotate')}</option>
                </select>
              </div>
            );
          })()}
```

- [ ] **Step 2: Verify ActionEditor compiles**

Run: `pnpm build 2>&1 | head -30`
Expected: No TypeScript errors related to ActionEditor or Action type.

- [ ] **Step 3: Commit**

```bash
git add src/components/ActionEditor.tsx
git commit -m "feat: adaptive animate UI for Spine target in ActionEditor"
```

---

### Task 4: Modify exportProject.ts — animate case with Spine detection

**Files:**
- Modify: `src/utils/exportProject.ts:600-602`

- [ ] **Step 1: Replace the animate case**

Current animate case (lines 600-602):
```ts
        case 'animate':
          initCode += `        ${elRef}.on('${event}', this, function() { ${t} if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')}); });\n`;
          break;
```

Replace with Spine-aware version:
```ts
        case 'animate': {
          const animateTargetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          if (animateTargetEl?.type === 'Spine') {
            const aniName = action.value ?? '';
            const loop = action.spineLoop === 'true';
            initCode += `        ${elRef}.on('${event}', this, function() { ${t} if (t && t.play) t.play(${JSON.stringify(aniName)}, ${loop}); });\n`;
          } else {
            initCode += `        ${elRef}.on('${event}', this, function() { ${t} if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')}); });\n`;
          }
          break;
        }
```

Note: The `targetEl` variable already exists at line 578 but is used for all action cases. We can reuse it here instead of re-scanning. The variable `targetEl` at line 578 is `action.targetId ? page.elements.find(e => e.id === action.targetId) : null`. So we can just reference `targetEl` directly:

```ts
        case 'animate': {
          if (targetEl?.type === 'Spine') {
            const aniName = action.value ?? '';
            const loop = action.spineLoop === 'true';
            initCode += `        ${elRef}.on('${event}', this, function() { ${t} if (t && t.play) t.play(${JSON.stringify(aniName)}, ${loop}); });\n`;
          } else {
            initCode += `        ${elRef}.on('${event}', this, function() { ${t} if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')}); });\n`;
          }
          break;
        }
```

- [ ] **Step 2: Verify exportProject compiles**

Run: `pnpm build 2>&1 | head -30`
Expected: No TypeScript errors related to exportProject.

- [ ] **Step 3: Commit**

```bash
git add src/utils/exportProject.ts
git commit -m "feat: generate Spine-specific play(aniName, loop) in animate action export"
```

---

### Task 5: Verify full build and manual test

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Start dev server and test in Electron**

1. Start vite: `pnpm dev`
2. Start Electron: `pnpm electron:dev`
3. Open a course with a Spine element and a button
4. Add an `animate` action on the button, select the Spine element as target
5. Verify: animation name dropdown appears (populated from `_animationList`), loop toggle appears
6. Change target to a non-Spine element
7. Verify: UI switches back to flash/scale/rotate dropdown, no loop toggle
8. Publish the course and check the generated ts file
9. Verify: animate action targeting Spine generates `t.play("idle", true)` style code
10. Verify: animate action targeting non-Spine generates `t.play("shan")` style code as before

- [ ] **Step 3: Final commit if any fixes needed**

If any issues found during testing, fix them and commit.