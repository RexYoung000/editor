# Spine Animation Playback in Button Actions

## Problem

When a button's `animate` action targets a Spine component, the current export generates `t.play('shan')` (a generic feedback animation name like flash/scale/rotate). This doesn't make sense for Spine/SkeletonPlayer components — users need to choose a specific animation name from the Spine file and control whether it loops.

## Design Decision

**Approach: animate action adapts UI and export code based on target type.**

No new action type is added. The existing `animate` action automatically switches its UI and export behavior when the target is a Spine element.

- **Why not a new `playSpineAni` type?** Users don't need to understand two action types for what is conceptually the same thing ("play animation on target"). Adaptive switching is the natural interaction.

## Changes

### 1. Action interface — new optional field

```ts
// src/types/index.ts
export interface Action {
  id: string;
  event: string;
  targetId?: string;
  actionType: string;
  property?: string;
  value?: unknown;
  spineLoop?: 'true' | 'false';  // NEW — animate target=Spine loop control
}
```

- `spineLoop` only applies when `actionType === 'animate'` and target is Spine.
- `action.value` stores the animation name string (e.g. `'idle'`) when target is Spine; stores `'shan'/'suo'/'zhuan'` for non-Spine targets.

### 2. ActionEditor UI — adaptive animate section

**When `animate` target is a Spine element** (`targetEl.type === 'Spine'`):

- Animation name dropdown reads from `targetEl.props._animationList` (string array).
- Loop playback toggle: yes/no (`spineLoop` field).
- If `_animationList` is empty (Spine hasn't loaded resource yet), dropdown is empty — user can set target first and come back.

**When target is not Spine or is self:**

- Keep the existing 3-option dropdown (闪烁/缩放/旋转) with no loop toggle.

### 3. Export code — both paths must be updated

**exportProject.ts — animate case:**

```ts
case 'animate': {
  const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
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

**exportPreviewProject.ts — same logic, dual-path synchronization required.**

Uses `KlSkeleton1.play(nameOrIndex, loop)` method — the standard playback API that handles deferred loading internally.

### 4. Files to modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `spineLoop` field to `Action` interface |
| `src/components/ActionEditor.tsx` | Adaptive animate UI: Spine target shows animation name dropdown + loop toggle |
| `src/utils/exportProject.ts` | Animate case: detect Spine target, generate `t.play(aniName, loop)` |
| `src/utils/exportPreviewProject.ts` | Same animate case change, dual-path sync |
| `src/i18n/translations.ts` | Add i18n keys for loop toggle labels |
| `src/elements/elementMetaI18n.ts` | Add i18n keys if needed |

### 5. Not included

- No new actionType.
- No "stop animation" feature.
- No changes to Spine element metadata.
- animate targeting non-Spine components remains unchanged.