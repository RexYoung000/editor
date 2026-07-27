import type { Course, Element } from '../types';
import {
  isCustomAnswerKeyboardTheme,
  normalizeCustomAnswerOptions,
} from '../elements/keyboardPresets';
import { getElementPages } from './internalPages';
import { getInputAnswerCandidates } from './inputAnswerRules';

export interface CustomAnswerKeyboardIssue {
  stageId: string;
  pageId: string;
  elementId: string;
  message: string;
}

function customAnswerPresetId(element: Element): unknown {
  return (element.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
}

function keyboardCamp(element: Element): string {
  return String(element.props?.camp ?? '').trim();
}

export function collectCourseCustomAnswerKeyboardIssues(course: Course): CustomAnswerKeyboardIssue[] {
  const issues: CustomAnswerKeyboardIssue[] = [];
  const stageGroups = [
    { label: '正课', stages: course.stages },
    { label: '预习', stages: course.previewStages ?? [] },
  ];

  for (const stageGroup of stageGroups) {
    for (const stage of stageGroup.stages) {
      for (const subPage of stage.subPages) {
        for (const page of getElementPages(subPage)) {
          const keyboards = page.elements.filter((element) => (
            element.type === 'KlBaseKeyboard' && customAnswerPresetId(element) === 'customAnswer'
          ));
          for (const keyboard of keyboards) {
            const location = `${stageGroup.label}“${stage.name}” / “${page.name}”`;
            const raw = keyboard.props?._customAnswerKeyboard as {
              answers?: unknown;
              theme?: unknown;
            } | undefined;
            const rawAnswers = Array.isArray(raw?.answers) ? raw.answers : [];
            const answers = normalizeCustomAnswerOptions(rawAnswers);
            const add = (message: string) => issues.push({
              stageId: stage.id,
              pageId: page.id,
              elementId: keyboard.id,
              message: `${location}：${message}`,
            });

            if (rawAnswers.length < 2 || rawAnswers.length > 9) {
              add('自定义答案键盘需要配置 2～9 个答案');
            }
            if (answers.some((answer) => answer === '')) {
              add('自定义答案键盘存在空答案');
            }
            if (answers.some((answer) => Array.from(answer).length > 4)) {
              add('自定义答案键盘每项答案最多 4 个字符');
            }
            if (new Set(answers).size !== answers.length) {
              add('自定义答案键盘存在重复答案');
            }
            if (!isCustomAnswerKeyboardTheme(raw?.theme)) {
              add('自定义答案键盘皮肤配置无效');
            }

            const camp = keyboardCamp(keyboard);
            if (!camp) {
              add('自定义答案键盘尚未设置绑定阵营');
              continue;
            }
            const boundInputs = page.elements.filter((element) => (
              element.type === 'KlInputImage' && keyboardCamp(element) === camp
            ));
            for (const input of boundInputs) {
              const candidates = getInputAnswerCandidates(input).map((answer) => answer.trim());
              if (candidates.length === 0) {
                add(`输入框“${input.name || input.id}”尚未设置正确答案`);
                continue;
              }
              const missing = candidates.filter((answer) => !answers.includes(answer));
              if (missing.length > 0) {
                add(`输入框“${input.name || input.id}”的正确答案“${missing.join('、')}”不在键盘选项中`);
              }
            }
          }
        }
      }
    }
  }

  return issues;
}
