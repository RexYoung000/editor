import type { Course, Element } from '../types';
import { getLayerDisplayName } from './layerPresentation';

export const CHOICE_CORRECT_OPTION_IDS_KEY = '_correctOptionIds';

export type ChoiceAnswerMode = 'unconfigured' | 'single' | 'multiple';

export interface ChoiceAnswerIssue {
  code: 'too-few-options' | 'missing-answer' | 'invalid-answer';
  choiceBoxId: string;
  message: string;
}

export function getChoiceOptions(choiceBox: Element, elements: Element[]): Element[] {
  return elements.filter((element) => (
    element.parentId === choiceBox.id && element.type === 'SpeechSelectableObj'
  ));
}

export function getChoiceCorrectOptionIds(choiceBox: Element): string[] {
  const value = choiceBox.props?.[CHOICE_CORRECT_OPTION_IDS_KEY];
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

export function setChoiceCorrectOptionIds(choiceBox: Element, optionIds: string[]): void {
  const nextProps = { ...choiceBox.props };
  nextProps[CHOICE_CORRECT_OPTION_IDS_KEY] = [...new Set(optionIds)];
  delete nextProps.rightItemNames;
  delete nextProps.upperLimit;
  choiceBox.props = nextProps;
}

export function getChoiceAnswerMode(choiceBox: Element): ChoiceAnswerMode {
  const answerCount = getChoiceCorrectOptionIds(choiceBox).length;
  if (answerCount === 0) return 'unconfigured';
  return answerCount === 1 ? 'single' : 'multiple';
}

export function getChoiceRuntimeProps(
  choiceBox: Element,
  elements: Element[],
): { rightItemNames: string; upperLimit: number } {
  const optionsById = new Map(getChoiceOptions(choiceBox, elements).map((option) => [option.id, option]));
  const names = getChoiceCorrectOptionIds(choiceBox)
    .map((id) => optionsById.get(id)?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  return {
    rightItemNames: names.join(','),
    upperLimit: names.length === 1 ? 1 : 0,
  };
}

export function remapChoiceAnswerRefs(element: Element, idMap: Map<string, string>): void {
  if (element.type !== 'ChoiceBox') return;
  const optionIds = getChoiceCorrectOptionIds(element);
  if (optionIds.length === 0) return;
  setChoiceCorrectOptionIds(element, optionIds.map((id) => idMap.get(id) ?? id));
}

export function removeChoiceAnswerRefs(elements: Element[], removedIds: Set<string>): number {
  let removedCount = 0;
  for (const choiceBox of elements) {
    if (choiceBox.type !== 'ChoiceBox') continue;
    const current = getChoiceCorrectOptionIds(choiceBox);
    const next = current.filter((id) => !removedIds.has(id));
    removedCount += current.length - next.length;
    if (next.length !== current.length) setChoiceCorrectOptionIds(choiceBox, next);
  }
  return removedCount;
}

export function removeInvalidChoiceAnswerRefs(elements: Element[]): number {
  let removedCount = 0;
  for (const choiceBox of elements) {
    if (choiceBox.type !== 'ChoiceBox') continue;
    const validIds = new Set(getChoiceOptions(choiceBox, elements).map((option) => option.id));
    const current = getChoiceCorrectOptionIds(choiceBox);
    const next = current.filter((id) => validIds.has(id));
    removedCount += current.length - next.length;
    if (next.length !== current.length) setChoiceCorrectOptionIds(choiceBox, next);
  }
  return removedCount;
}

export function collectChoiceAnswerIssues(
  choiceBox: Element,
  elements: Element[],
): ChoiceAnswerIssue[] {
  const issues: ChoiceAnswerIssue[] = [];
  const label = getLayerDisplayName(choiceBox);
  const options = getChoiceOptions(choiceBox, elements);
  const optionIds = new Set(options.map((option) => option.id));
  const answerIds = getChoiceCorrectOptionIds(choiceBox);
  const invalidCount = answerIds.filter((id) => !optionIds.has(id)).length;

  if (options.length < 2) {
    issues.push({
      code: 'too-few-options',
      choiceBoxId: choiceBox.id,
      message: `选择题“${label}”至少需要两个直属选项`,
    });
  }
  if (answerIds.length === 0) {
    issues.push({
      code: 'missing-answer',
      choiceBoxId: choiceBox.id,
      message: `选择题“${label}”尚未配置正确答案`,
    });
  }
  if (invalidCount > 0) {
    issues.push({
      code: 'invalid-answer',
      choiceBoxId: choiceBox.id,
      message: `选择题“${label}”有 ${invalidCount} 个正确答案已不属于当前容器，请重新选择`,
    });
  }
  return issues;
}

export function collectCourseChoiceAnswerIssues(course: Course): ChoiceAnswerIssue[] {
  const issues: ChoiceAnswerIssue[] = [];
  for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
    for (const subPage of stage.subPages) {
      for (const page of [subPage, ...(subPage.internalPages ?? [])]) {
        for (const element of page.elements) {
          if (element.type === 'ChoiceBox') {
            issues.push(...collectChoiceAnswerIssues(element, page.elements));
          }
        }
      }
    }
  }
  return issues;
}

export function isChoiceOption(element: Element, elements: Element[]): boolean {
  if (element.type !== 'SpeechSelectableObj' || !element.parentId) return false;
  return elements.some((candidate) => candidate.id === element.parentId && candidate.type === 'ChoiceBox');
}

export function isChoiceOptionText(element: Element, elements: Element[]): boolean {
  if (element.type !== 'Label') return false;
  const elementMap = new Map(elements.map((candidate) => [candidate.id, candidate]));
  let parent = element.parentId ? elementMap.get(element.parentId) : undefined;
  while (parent) {
    if (isChoiceOption(parent, elements)) return true;
    parent = parent.parentId ? elementMap.get(parent.parentId) : undefined;
  }
  return false;
}
