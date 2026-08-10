import type { Action, Course, Element, SubPage } from '../types';
import { isInputRuleHost } from './inputAnswerRules';
import { getLayerDisplayName } from './layerPresentation';

export const SDK_JUDGE_EVENT = 'onClickSdkJudge';
export const INPUT_SDK_JUDGE_EVENT = 'onInputSdkJudge';

export type JudgeCondition = NonNullable<Action['branchCondition']>;
export type SdkJudgeTargetKind = 'inputImage' | 'input' | 'choice' | 'drag' | 'matching';

export interface SdkJudgeCapability {
  kind: SdkJudgeTargetKind;
  conditions: JudgeCondition[];
  answerKey?: '_judgeAnswer' | 'answer';
  answerLabel?: string;
  emptyLabel?: string;
}

export interface ConfirmTargetIssue {
  code: 'missing-target' | 'invalid-target';
  sourceId: string;
  message: string;
}

const THREE_STATE: JudgeCondition[] = ['right', 'wrong', 'null'];
const TWO_STATE: JudgeCondition[] = ['right', 'wrong'];

export function getSdkJudgeCapability(element: Element | undefined): SdkJudgeCapability | null {
  if (!element) return null;
  if (element.type === 'KlInputImage' || element.type === 'FractionInput') {
    return {
      kind: 'inputImage',
      conditions: THREE_STATE,
      answerKey: '_judgeAnswer',
      answerLabel: '正确答案',
      emptyLabel: '还没有填写',
    };
  }
  if (isInputRuleHost(element)) {
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

export function isInputSdkJudgeTarget(element: Element | undefined): element is Element {
  const capability = getSdkJudgeCapability(element);
  return capability?.kind === 'inputImage' || capability?.kind === 'input';
}

const INPUT_CONFIRM_EVENTS = new Set(['onClickInitConfirm', 'onClickInitConfirmWithLock']);

export function collectConfirmTargetIssues(page: Pick<SubPage, 'elements'>): ConfirmTargetIssue[] {
  const issues: ConfirmTargetIssue[] = [];
  const elementsById = new Map(page.elements.map((element) => [element.id, element]));
  for (const source of page.elements) {
    for (const action of source.actions ?? []) {
      if (!INPUT_CONFIRM_EVENTS.has(action.event)) continue;
      const sourceLabel = getLayerDisplayName(source);
      if (!action.targetId) {
        issues.push({
          code: 'missing-target',
          sourceId: source.id,
          message: `确定按钮“${sourceLabel}”尚未选择判定目标`,
        });
        continue;
      }
      const target = elementsById.get(action.targetId);
      if (!target) {
        issues.push({
          code: 'missing-target',
          sourceId: source.id,
          message: `确定按钮“${sourceLabel}”引用的判定目标“${action.targetNameSnapshot ?? action.targetId}”已失效，请重新选择`,
        });
        continue;
      }
      if (!isInputRuleHost(target) && target.layaType !== 'ChoiceBox') {
        issues.push({
          code: 'invalid-target',
          sourceId: source.id,
          message: `确定按钮“${sourceLabel}”的目标“${getLayerDisplayName(target)}”不支持当前判定，请重新选择`,
        });
      }
    }
  }
  return issues;
}

export function collectCourseConfirmTargetIssues(course: Course): ConfirmTargetIssue[] {
  const issues: ConfirmTargetIssue[] = [];
  for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
    for (const subPage of stage.subPages) {
      for (const page of [subPage, ...(subPage.internalPages ?? [])]) {
        issues.push(...collectConfirmTargetIssues(page));
      }
    }
  }
  return issues;
}

export function getSdkJudgeConditionLabel(
  capability: SdkJudgeCapability,
  condition: JudgeCondition,
): string {
  if (capability.kind === 'inputImage') {
    if (condition === 'right') return '答案正确';
    if (condition === 'wrong') return '答案错误';
  }
  if (condition === 'right') return '全对';
  if (condition === 'wrong') return '没有全对';
  return capability.emptyLabel ?? '还没有操作';
}
