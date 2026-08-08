import type { Action, Element, Page } from '../../types';
import { laya, clearAllObjects, setPreviewMode } from './core';
import { createLayaComponent, applyKlProps } from './components';
import { registerObject } from './core';
import { objects } from './core';
import { evaluateStructuredInputRuleState, getFillAnswerInputs, getInputAnswerCandidates } from '../inputAnswerRules';
import { KL_KEYBOARD_INPUT_LATER_EVENT } from '../keyboardEvents';
import {
  getInputSdkJudgeTargets,
  getSdkJudgeCapability,
  INPUT_SDK_JUDGE_EVENT,
  isInputSdkJudgeTarget,
  PLAY_RIGHT_SOUND_LOCK_JUDGE_INPUT_ACTION,
  SDK_JUDGE_EVENT,
  type JudgeCondition,
} from '../sdkJudge';

let _previewPages: Page[] = [];
let _previewPageIdx = 0;
let _previewOnPage: ((idx: number) => void) | null = null;

export function resizeStageToContainer(container: HTMLElement): void {
  const L = laya();
  if (!L?.stage) return;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  L.stage.setScreenSize(rect.width * dpr, rect.height * dpr);
  if (L.stage._canvasTransform) {
    L.stage._canvasTransform.tx = rect.left;
    L.stage._canvasTransform.ty = rect.top;
  }
}

function _executePreviewAction(action: Action, selfId: string): void {
  const targetId = action.targetId ?? selfId;
  const _objs = objects();
  const L = laya();
  const page = _previewPages[_previewPageIdx];
  switch (action.actionType) {
    case 'toggleVisible': {
      const obj = _objs.get(targetId);
      if (obj) obj.visible = !obj.visible;
      break;
    }
    case 'setVisible': {
      const obj = _objs.get(targetId);
      if (obj) obj.visible = !!action.value;
      break;
    }
    case 'setProperty': {
      if (!action.property) break;
      const page = _previewPages[_previewPageIdx];
      const el = page?.elements.find((e) => e.id === targetId);
      if (!el) break;
      (el as unknown as Record<string, unknown>)[action.property] = action.value;
      const obj = _objs.get(targetId);
      if (obj) {
        applyKlProps(obj, el);
      }
      break;
    }
    case 'changePage': {
      const idx = _previewPages.findIndex(p => p.id === action.value);
      if (idx >= 0) previewGoToPage(idx);
      break;
    }
    case 'playSound':
      if (action.value && L?.SoundManager) L.SoundManager.playSound(String(action.value));
      break;
    case PLAY_RIGHT_SOUND_LOCK_JUDGE_INPUT_ACTION:
      if (L?.SoundManager) L.SoundManager.playSound('/builtin/runtime/game/sound/right.mp3');
      if (page) _lockJudgeInputInPreview(page, action, selfId);
      break;
    case 'stopSound':
      if (L?.SoundManager) L.SoundManager.stopAll();
      break;
    case 'resetPage':
      _renderPreviewPage(_previewPageIdx);
      break;
    case 'animate': {
      const obj = _objs.get(targetId);
      if (obj?.play) obj.play(String(action.value ?? 'shan'));
      break;
    }
  }
}

function _setPreviewInputWrongState(inputObject: unknown, visible: boolean): void {
  const input = inputObject as { getChildByName?: (name: string) => { visible?: boolean } | null };
  const wrong = input?.getChildByName?.('wrong');
  const bg = input?.getChildByName?.('bg');
  if (wrong) wrong.visible = visible;
  if (visible && bg) bg.visible = false;
}

function _setPreviewInputSdkJudgeWrongState(page: Page, action: Action, visible: boolean): void {
  _getInputSdkJudgeObjects(page, action).forEach((inputObject) => {
    _setPreviewInputWrongState(inputObject, visible);
  });
}

function _lockJudgeInputInPreview(page: Page, action: Action, sourceId: string): void {
  const inputElements = getInputSdkJudgeTargets(action, page, page.elements.find((element) => element.id === sourceId));
  const inputObjects = inputElements
    .map((element) => objects().get(element.id))
    .filter(Boolean) as Array<Record<string, unknown> & {
      getChildByName?: (name: string) => { visible?: boolean; filters?: unknown[] } | null;
    }>;
  if (inputObjects.length === 0) return;

  const camps = new Set<string>();
  for (const inputObject of inputObjects) {
    inputObject.isSelected = false;
    inputObject._isSelected = false;
    inputObject.canSelected = false;
    inputObject.mouseEnabled = false;
    const cursor = inputObject.guangbiaoI as { visible?: boolean } | undefined;
    if (cursor) cursor.visible = false;
    const bg = (inputObject._bg as { visible?: boolean; filters?: unknown[] } | undefined)
      ?? inputObject.getChildByName?.('bg');
    if (bg) {
      bg.visible = false;
      bg.filters = [];
    }
    const wrong = inputObject.getChildByName?.('wrong');
    if (wrong) {
      wrong.visible = false;
      wrong.filters = [];
    }
    if (!inputObject.filters || Array.isArray(inputObject.filters)) {
      inputObject.filters = [];
    }
    const camp = String(inputObject.camp ?? '').trim();
    if (camp) camps.add(camp);
  }

  if (camps.size === 0) return;
  for (const keyboard of page.elements.filter((element) => element.type === 'KlBaseKeyboard')) {
    const keyboardObject = objects().get(keyboard.id) as (Record<string, unknown> & {
      setVisible?: (visible: boolean) => void;
    }) | undefined;
    if (!keyboardObject || !camps.has(String(keyboardObject.camp ?? '').trim())) continue;
    if (typeof keyboardObject.setVisible === 'function') keyboardObject.setVisible(false);
    else keyboardObject.visible = false;
    keyboardObject.currIptXpath = null;
    keyboardObject._currIpt = null;
  }
}

function _getSdkJudgeCondition(page: Page, action: Action): JudgeCondition | null {
  const target = action.judgeTargetId
    ? page.elements.find((element) => element.id === action.judgeTargetId)
    : undefined;
  const capability = getSdkJudgeCapability(target);
  const targetObject = target ? objects().get(target.id) : undefined;
  if (!target || !capability || !targetObject) return null;

  const structuredInputState = capability.kind === 'input'
    ? evaluateStructuredInputRuleState(target, page.elements, (input) => {
        const inputObject = objects().get(input.id);
        if (!inputObject) return undefined;
        return {
          value: String(inputObject.fontClipValue ?? ''),
          isEmpty: Boolean(inputObject.valueOrSkinIsNull),
        };
      })
    : undefined;

  const isRight = capability.kind === 'inputImage'
    ? !targetObject.valueOrSkinIsNull
      && getInputAnswerCandidates(target).includes(String(targetObject.fontClipValue ?? ''))
    : capability.kind === 'input'
    ? structuredInputState === undefined
      ? Boolean(targetObject.isRight?.())
      : structuredInputState === true
    : capability.kind === 'drag'
      ? Boolean(targetObject.dragsOnRightDrops?.())
      : capability.kind === 'matching'
        ? Boolean(targetObject.allRight)
        : Boolean(targetObject.isRight);
  if (isRight) return 'right';
  if (!capability.conditions.includes('null')) return 'wrong';

  const isNull = capability.kind === 'inputImage'
    ? Boolean(targetObject.valueOrSkinIsNull)
    : capability.kind === 'input' && structuredInputState !== undefined
    ? structuredInputState === null
    : capability.kind === 'choice'
    ? Boolean(targetObject.isNull)
    : Boolean(targetObject.isNull?.());
  return isNull ? 'null' : 'wrong';
}

function _runPreviewSdkJudgeGroup(page: Page, source: Element, group: Action[]): void {
  const condition = _getSdkJudgeCondition(page, group[0]);
  if (!condition) return;
  if (group[0]?.event === INPUT_SDK_JUDGE_EVENT) {
    _setPreviewInputSdkJudgeWrongState(page, group[0], condition === 'wrong');
  }
  group
    .filter((action) => (action.branchCondition ?? 'right') === condition)
    .forEach((action) => _executePreviewAction(action, source.id));
}

function _groupJudgeActions(actions: Action[]): Map<string, Action[]> {
  const groups = new Map<string, Action[]>();
  actions.forEach((action) => {
    const key = action.groupId ?? `__legacy:${action.judgeTargetId ?? ''}`;
    const group = groups.get(key) ?? [];
    group.push(action);
    groups.set(key, group);
  });
  return groups;
}

function _getInputSdkJudgeObjects(page: Page, action: Action): unknown[] {
  const target = action.judgeTargetId
    ? page.elements.find((element) => element.id === action.judgeTargetId)
    : undefined;
  if (!target || !isInputSdkJudgeTarget(target)) return [];
  if (target.type === 'KlInputImage' || target.type === 'FractionInput') {
    const targetObject = objects().get(target.id);
    return targetObject ? [targetObject] : [];
  }
  return getFillAnswerInputs(target, page.elements)
    .map((input) => objects().get(input.id))
    .filter(Boolean);
}

function _renderPreviewPage(idx: number): void {
  clearAllObjects();
  const page = _previewPages[idx];
  if (!page) return;
  page.elements.forEach((el) => {
    const obj = createLayaComponent(el);
    if (!obj) return;
    registerObject(el.id, obj);
  });
  page.elements.forEach((el) => {
    const obj = objects().get(el.id);
    if (!obj) return;
    // 绑定所有事件
    const eventMap: Record<string, string> = {
      onClick: 'click',
      onChange: 'change',
      onDrop: 'drop',
      [SDK_JUDGE_EVENT]: 'click',
    };
    if (el.actions) {
      const events = new Set(el.actions.map(a => a.event));
      events.forEach(evt => {
        const layaEvt = eventMap[evt] ?? evt;
        if (layaEvt === 'click' || layaEvt === 'change' || layaEvt === 'drop') {
          obj.on(layaEvt, null, () => {
            const eventActions = el.actions?.filter((action) => action.event === evt) ?? [];
            if (evt !== SDK_JUDGE_EVENT) {
              eventActions.forEach((action) => _executePreviewAction(action, el.id));
              return;
            }
            _groupJudgeActions(eventActions).forEach((group) => _runPreviewSdkJudgeGroup(page, el, group));
          });
        }
        if (evt === INPUT_SDK_JUDGE_EVENT) {
          const eventActions = el.actions?.filter((action) => action.event === INPUT_SDK_JUDGE_EVENT) ?? [];
          _groupJudgeActions(eventActions).forEach((group) => {
            for (const inputObject of _getInputSdkJudgeObjects(page, group[0])) {
              if (inputObject && typeof (inputObject as { on?: unknown }).on === 'function') {
                (inputObject as { on: (event: string, caller: unknown, listener: () => void) => void })
                  .on(KL_KEYBOARD_INPUT_LATER_EVENT, null, () => _runPreviewSdkJudgeGroup(page, el, group));
                (inputObject as { on: (event: string, caller: unknown, listener: () => void) => void })
                  .on('click', null, () => _setPreviewInputSdkJudgeWrongState(page, group[0], false));
              }
            }
          });
        }
      });
    }
  });
}

export function previewGoToPage(idx: number): void {
  if (idx < 0 || idx >= _previewPages.length) return;
  _previewPageIdx = idx;
  _renderPreviewPage(idx);
  _previewOnPage?.(idx);
  setTimeout(() => {
    const page = _previewPages[idx];
    page?.elements.forEach((el) => {
      el.actions?.filter((a) => a.event === 'onLoad').forEach((a) => _executePreviewAction(a, el.id));
    });
  }, 80);
}

export function enterPreviewMode(pages: Page[], onPage: (idx: number) => void): void {
  setPreviewMode(true);
  _previewPages = JSON.parse(JSON.stringify(pages));
  _previewPageIdx = 0;
  _previewOnPage = onPage;
  previewGoToPage(0);
}

export function exitPreviewMode(): void {
  setPreviewMode(false);
  _previewPages = [];
  _previewOnPage = null;
  clearAllObjects();
}
