import type { Action, Page } from '../../types';
import { laya, clearAllObjects, setPreviewMode } from './core';
import { createLayaComponent, applyKlProps } from './components';
import { registerObject } from './core';
import { objects } from './core';
import { getSdkJudgeCapability, SDK_JUDGE_EVENT, type JudgeCondition } from '../sdkJudge';

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

function _getSdkJudgeCondition(page: Page, action: Action): JudgeCondition | null {
  const target = action.judgeTargetId
    ? page.elements.find((element) => element.id === action.judgeTargetId)
    : undefined;
  const capability = getSdkJudgeCapability(target);
  const targetObject = target ? objects().get(target.id) : undefined;
  if (!capability || !targetObject) return null;

  const isRight = capability.kind === 'input'
    ? Boolean(targetObject.isRight?.())
    : capability.kind === 'drag'
      ? Boolean(targetObject.dragsOnRightDrops?.())
      : capability.kind === 'matching'
        ? Boolean(targetObject.allRight)
        : Boolean(targetObject.isRight);
  if (isRight) return 'right';
  if (!capability.conditions.includes('null')) return 'wrong';

  const isNull = capability.kind === 'choice'
    ? Boolean(targetObject.isNull)
    : Boolean(targetObject.isNull?.());
  return isNull ? 'null' : 'wrong';
}

function _renderPreviewPage(idx: number): void {
  clearAllObjects();
  const page = _previewPages[idx];
  if (!page) return;
  page.elements.forEach((el) => {
    const obj = createLayaComponent(el);
    if (!obj) return;
    registerObject(el.id, obj);
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
            const groups = new Map<string, Action[]>();
            eventActions.forEach((action) => {
              const key = action.groupId ?? `__legacy:${action.judgeTargetId ?? ''}`;
              const group = groups.get(key) ?? [];
              group.push(action);
              groups.set(key, group);
            });
            groups.forEach((group) => {
              const condition = _getSdkJudgeCondition(page, group[0]);
              if (!condition) return;
              group
                .filter((action) => (action.branchCondition ?? 'right') === condition)
                .forEach((action) => _executePreviewAction(action, el.id));
            });
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
