import type { Action, Element } from '../types';

export const SDK_JUDGE_EVENT = 'onClickSdkJudge';

export type JudgeCondition = NonNullable<Action['branchCondition']>;
export type SdkJudgeTargetKind = 'input' | 'choice' | 'drag' | 'matching';

export interface SdkJudgeCapability {
  kind: SdkJudgeTargetKind;
  conditions: JudgeCondition[];
  answerKey?: 'answer' | 'rightItemNames';
  answerLabel?: string;
  emptyLabel?: string;
}

const THREE_STATE: JudgeCondition[] = ['right', 'wrong', 'null'];
const TWO_STATE: JudgeCondition[] = ['right', 'wrong'];

export function getSdkJudgeCapability(element: Element | undefined): SdkJudgeCapability | null {
  if (!element) return null;
  if (element.type === 'KlInputBox') {
    return {
      kind: 'input',
      conditions: THREE_STATE,
      answerKey: 'answer',
      answerLabel: '正确答案',
      emptyLabel: '还没有填写',
    };
  }
  if (element.layaType === 'ChoiceBox') {
    return {
      kind: 'choice',
      conditions: THREE_STATE,
      answerKey: 'rightItemNames',
      answerLabel: '正确选项',
      emptyLabel: '还没有选择',
    };
  }
  if (element.type === 'DragViewBox') {
    return { kind: 'drag', conditions: TWO_STATE };
  }
  if (element.layaType === 'MatchingGame') {
    return {
      kind: 'matching',
      conditions: THREE_STATE,
      emptyLabel: '还没有连线',
    };
  }
  return null;
}

export function isSdkJudgeTarget(element: Element | undefined): element is Element {
  return getSdkJudgeCapability(element) !== null;
}

export function getSdkJudgeConditionLabel(
  capability: SdkJudgeCapability,
  condition: JudgeCondition,
): string {
  if (condition === 'right') return '全对';
  if (condition === 'wrong') return '没有全对';
  return capability.emptyLabel ?? '还没有操作';
}
