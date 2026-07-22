import type { Course, Element, SubPage } from '../types';

export const FILL_ANSWER_SCHEMES_KEY = '_answerSchemes';

export type FillAnswerOrderMode = 'fixed' | 'interchangeable';

export interface FillAnswerSlot {
  inputId: string;
  inputNameSnapshot?: string;
  answer: string;
}

export interface FillAnswerScheme {
  id: string;
  orderMode: FillAnswerOrderMode;
  slots: FillAnswerSlot[];
}

export interface FillAnswerSchemeIssue {
  code: 'invalid-data' | 'no-input' | 'no-scheme' | 'missing-input' | 'missing-slot' | 'duplicate-slot' | 'empty-answer';
  targetId: string;
  message: string;
}

function makeSchemeId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `answer-scheme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readFillAnswerSchemes(element: Element): FillAnswerScheme[] {
  const raw = element.props?.[FILL_ANSWER_SCHEMES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): FillAnswerScheme[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || !Array.isArray(record.slots)) return [];
    const slots = record.slots.flatMap((slot): FillAnswerSlot[] => {
      if (!slot || typeof slot !== 'object') return [];
      const value = slot as Record<string, unknown>;
      if (typeof value.inputId !== 'string') return [];
      return [{
        inputId: value.inputId,
        inputNameSnapshot: typeof value.inputNameSnapshot === 'string' ? value.inputNameSnapshot : undefined,
        answer: typeof value.answer === 'string' ? value.answer : String(value.answer ?? ''),
      }];
    });
    return [{
      id: record.id,
      orderMode: record.orderMode === 'interchangeable' ? 'interchangeable' : 'fixed',
      slots,
    }];
  });
}

export function hasFillAnswerSchemes(element: Element): boolean {
  return element.props?.[FILL_ANSWER_SCHEMES_KEY] !== undefined;
}

export function getFillAnswerInputs(target: Element, elements: Element[]): Element[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return elements.filter((element) => {
    if (element.type !== 'KlInputImage' && element.type !== 'FractionInput') return false;
    let parent = element.parentId ? byId.get(element.parentId) : undefined;
    while (parent) {
      if (parent.id === target.id) return true;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return false;
  });
}

export function createFillAnswerScheme(
  inputs: Element[],
  answers: string[] = [],
  orderMode: FillAnswerOrderMode = 'fixed',
): FillAnswerScheme {
  return {
    id: makeSchemeId(),
    orderMode,
    slots: inputs.map((input, index) => ({
      inputId: input.id,
      inputNameSnapshot: input.name,
      answer: answers[index] ?? '',
    })),
  };
}

export function copyFillAnswerScheme(scheme: FillAnswerScheme): FillAnswerScheme {
  return {
    ...structuredClone(scheme),
    id: makeSchemeId(),
  };
}

export function reconcileFillAnswerScheme(scheme: FillAnswerScheme, inputs: Element[]): FillAnswerScheme {
  const existing = new Map(scheme.slots.map((slot) => [slot.inputId, slot]));
  return {
    ...scheme,
    slots: inputs.map((input) => ({
      inputId: input.id,
      inputNameSnapshot: input.name,
      answer: existing.get(input.id)?.answer ?? '',
    })),
  };
}

export function collectFillAnswerSchemeIssues(target: Element, elements: Element[]): FillAnswerSchemeIssue[] {
  if (!hasFillAnswerSchemes(target)) return [];
  const raw = target.props?.[FILL_ANSWER_SCHEMES_KEY];
  const schemes = readFillAnswerSchemes(target);
  const targetLabel = target.name ?? target.id;
  if (!Array.isArray(raw) || schemes.length !== raw.length) {
    return [{ code: 'invalid-data', targetId: target.id, message: `填空题“${targetLabel}”的答案方案数据无效，请重新配置` }];
  }
  const inputs = getFillAnswerInputs(target, elements);
  if (inputs.length === 0) {
    return [{ code: 'no-input', targetId: target.id, message: `填空题“${targetLabel}”没有可判定的输入格` }];
  }
  if (schemes.length === 0) {
    return [{ code: 'no-scheme', targetId: target.id, message: `填空题“${targetLabel}”至少需要一套答案方案` }];
  }

  const inputIds = new Set(inputs.map((input) => input.id));
  const issues: FillAnswerSchemeIssue[] = [];
  schemes.forEach((scheme, schemeIndex) => {
    const slotIds = new Set<string>();
    scheme.slots.forEach((slot) => {
      if (slotIds.has(slot.inputId)) {
        issues.push({ code: 'duplicate-slot', targetId: target.id, message: `填空题“${targetLabel}”的方案 ${schemeIndex + 1} 重复引用了同一空位` });
      }
      slotIds.add(slot.inputId);
      if (!inputIds.has(slot.inputId)) {
        issues.push({ code: 'missing-input', targetId: target.id, message: `填空题“${targetLabel}”的方案 ${schemeIndex + 1} 包含已删除的空位“${slot.inputNameSnapshot ?? slot.inputId}”` });
      }
      if (slot.answer.trim() === '') {
        issues.push({ code: 'empty-answer', targetId: target.id, message: `填空题“${targetLabel}”的方案 ${schemeIndex + 1} 存在未填写的正确答案` });
      }
    });
    inputs.forEach((input) => {
      if (!slotIds.has(input.id)) {
        issues.push({ code: 'missing-slot', targetId: target.id, message: `填空题“${targetLabel}”的方案 ${schemeIndex + 1} 尚未配置空位“${input.name ?? input.id}”` });
      }
    });
  });
  return issues;
}

export function collectCourseFillAnswerSchemeIssues(course: Course): FillAnswerSchemeIssue[] {
  const issues: FillAnswerSchemeIssue[] = [];
  const stages = [...course.stages, ...(course.previewStages ?? [])];
  for (const stage of stages) {
    for (const subPage of stage.subPages) {
      const pages: Array<SubPage | NonNullable<SubPage['internalPages']>[number]> = [
        subPage,
        ...(subPage.internalPages ?? []),
      ];
      for (const page of pages) {
        for (const target of page.elements) {
          if (target.type === 'KlInputBox') issues.push(...collectFillAnswerSchemeIssues(target, page.elements));
        }
      }
    }
  }
  return issues;
}

export function remapFillAnswerSchemeRefs(
  element: Element,
  idMap: Map<string, string>,
  makeId: (prefix: string) => string = () => makeSchemeId(),
): void {
  if (!hasFillAnswerSchemes(element)) return;
  const schemes = readFillAnswerSchemes(element).map((scheme) => ({
    ...scheme,
    id: makeId('answer-scheme'),
    slots: scheme.slots.map((slot) => ({
      ...slot,
      inputId: idMap.get(slot.inputId) ?? slot.inputId,
    })),
  }));
  element.props[FILL_ANSWER_SCHEMES_KEY] = schemes;
}

export function buildFillAnswerSchemeInitCode(
  page: SubPage,
  getVar: (element: Element) => string,
): string {
  let code = '';
  for (const target of page.elements) {
    if (target.type !== 'KlInputBox' || !hasFillAnswerSchemes(target)) continue;
    if (collectFillAnswerSchemeIssues(target, page.elements).length > 0) continue;
    const inputs = getFillAnswerInputs(target, page.elements);
    const inputIndexById = new Map(inputs.map((input, index) => [input.id, index]));
    const schemes = readFillAnswerSchemes(target);
    const targetRef = `this.${getVar(target)}`;
    const inputRefs = inputs.map((input) => `this.${getVar(input)}`);
    const rightChecks = schemes.map((scheme) => {
      const slots = scheme.slots.map((slot) => ({
        slot,
        inputIndex: inputIndexById.get(slot.inputId)!,
      }));
      if (scheme.orderMode === 'interchangeable') {
        const actual = slots.map(({ inputIndex }) => `String(__inputs[${inputIndex}].fontClipValue || "")`).join(', ');
        const expected = slots.map(({ slot }) => JSON.stringify(slot.answer)).join(', ');
        return `JSON.stringify([${actual}].sort()) === JSON.stringify([${expected}].sort())`;
      }
      return slots
        .map(({ slot, inputIndex }) => `String(__inputs[${inputIndex}].fontClipValue || "") === ${JSON.stringify(slot.answer)}`)
        .join(' && ');
    });
    code += `        (function(__target, __inputs) {\n`;
    code += `            if (!__target) return;\n`;
    code += `            __target.isNull = function() { return __inputs.some(function(input) { return !input || input.valueOrSkinIsNull; }); };\n`;
    code += `            __target.isRight = function() { return !__target.isNull() && (${rightChecks.map((check) => `(${check})`).join(' || ')}); };\n`;
    code += `        }).call(this, ${targetRef}, [${inputRefs.join(', ')}]);\n`;
  }
  return code;
}
