import type { Course, Element, SubPage } from '../types';
import { getLayerDisplayName } from './layerPresentation';

export const INPUT_ANSWER_CANDIDATES_KEY = '_judgeAnswers';
export const INPUT_RELATIONS_KEY = '_inputRelations';

export type InputRelationOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'equal';

export interface InputRelation {
  id: string;
  leftInputId: string;
  rightInputId: string;
  operator: InputRelationOperator;
  target?: string;
}

export interface InputRuleIssue {
  code: 'invalid-data' | 'no-input' | 'missing-input' | 'same-input' | 'duplicate-input' | 'missing-target' | 'invalid-target' | 'missing-answer';
  targetId: string;
  message: string;
}

const OPERATORS = new Set<InputRelationOperator>(['add', 'subtract', 'multiply', 'divide', 'equal']);

function makeRuleId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `input-relation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isAnswerInput(element: Element | undefined): element is Element {
  return element?.type === 'KlInputImage' || element?.type === 'FractionInput';
}

export function getInputRuleDisplayName(element: Element | undefined): string {
  return element ? getLayerDisplayName(element) : '失效输入框';
}

export function splitAnswerCandidates(value: string): string[] {
  return [...new Set(value
    .split(/[,，;；\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function getInputAnswerCandidates(element: Element): string[] {
  const raw = element.props?.[INPUT_ANSWER_CANDIDATES_KEY];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((item) => String(item ?? '').trim()).filter(Boolean))];
  }
  return splitAnswerCandidates(String(element.props?._judgeAnswer ?? ''));
}

export function hasStructuredInputAnswers(element: Element): boolean {
  return Array.isArray(element.props?.[INPUT_ANSWER_CANDIDATES_KEY]);
}

export function getFillAnswerInputs(target: Element, elements: Element[]): Element[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return elements.filter((element) => {
    if (!isAnswerInput(element)) return false;
    let parent = element.parentId ? byId.get(element.parentId) : undefined;
    while (parent) {
      if (parent.id === target.id) return true;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return false;
  });
}

export function findInputBoxAncestor(input: Element, elements: Element[]): Element | undefined {
  const byId = new Map(elements.map((element) => [element.id, element]));
  let parent = input.parentId ? byId.get(input.parentId) : undefined;
  while (parent) {
    if (parent.type === 'KlInputBox') return parent;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return undefined;
}

export function readInputRelations(target: Element): InputRelation[] {
  const raw = target.props?.[INPUT_RELATIONS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): InputRelation[] => {
    if (!item || typeof item !== 'object') return [];
    const relation = item as Record<string, unknown>;
    const operator = relation.operator as InputRelationOperator;
    if (
      typeof relation.id !== 'string'
      || typeof relation.leftInputId !== 'string'
      || typeof relation.rightInputId !== 'string'
      || !OPERATORS.has(operator)
    ) return [];
    return [{
      id: relation.id,
      leftInputId: relation.leftInputId,
      rightInputId: relation.rightInputId,
      operator,
      target: typeof relation.target === 'string' ? relation.target : undefined,
    }];
  });
}

export function createInputRelation(
  leftInputId: string,
  rightInputId: string,
  operator: InputRelationOperator = 'multiply',
  target = '',
): InputRelation {
  return { id: makeRuleId(), leftInputId, rightInputId, operator, target };
}

export function hasStructuredInputRules(target: Element, elements: Element[]): boolean {
  return Array.isArray(target.props?.[INPUT_RELATIONS_KEY])
    || getFillAnswerInputs(target, elements).some(hasStructuredInputAnswers);
}

export function parseRuleNumber(value: string): number | null {
  const normalized = String(value ?? '').trim();
  if (/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    const result = Number(normalized);
    return Number.isFinite(result) ? result : null;
  }
  const slash = normalized.match(/^([+-]?\d+)\/(\d+)$/);
  if (slash) {
    const denominator = Number(slash[2]);
    if (denominator === 0) return null;
    return Number(slash[1]) / denominator;
  }
  const fraction = normalized.match(/^([+-]?\d*)<(\d+)_(\d+)>$/);
  if (fraction) {
    const denominator = Number(fraction[3]);
    if (denominator === 0) return null;
    const wholeText = fraction[1];
    const fractionValue = Number(fraction[2]) / denominator;
    if (!wholeText || wholeText === '+') return fractionValue;
    if (wholeText === '-') return -fractionValue;
    const whole = Number(wholeText);
    return whole < 0 ? whole - fractionValue : whole + fractionValue;
  }
  return null;
}

export function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

export function evaluateInputRelation(relation: InputRelation, leftRaw: string, rightRaw: string): boolean {
  const left = parseRuleNumber(leftRaw);
  const right = parseRuleNumber(rightRaw);
  if (left === null || right === null) return false;
  if (relation.operator === 'equal') return nearlyEqual(left, right);
  const target = parseRuleNumber(relation.target ?? '');
  if (target === null) return false;
  if (relation.operator === 'divide' && nearlyEqual(right, 0)) return false;
  const result = relation.operator === 'add'
    ? left + right
    : relation.operator === 'subtract'
      ? left - right
      : relation.operator === 'multiply'
        ? left * right
        : left / right;
  return Number.isFinite(result) && nearlyEqual(result, target);
}

export interface InputRuleRuntimeValue {
  value: string;
  isEmpty: boolean;
}

export function evaluateStructuredInputRuleState(
  target: Element,
  elements: Element[],
  getValue: (input: Element) => InputRuleRuntimeValue | undefined,
): boolean | null | undefined {
  if (!hasStructuredInputRules(target, elements)) return undefined;
  if (collectInputRuleIssues(target, elements).length > 0) return false;
  const inputs = getFillAnswerInputs(target, elements);
  const values = new Map(inputs.map((input) => [input.id, getValue(input)]));
  if (inputs.some((input) => !values.get(input.id) || values.get(input.id)?.isEmpty)) return null;

  const relations = readInputRelations(target);
  const relatedIds = new Set(relations.flatMap((relation) => [relation.leftInputId, relation.rightInputId]));
  const independentRight = inputs
    .filter((input) => !relatedIds.has(input.id))
    .every((input) => getInputAnswerCandidates(input).includes(values.get(input.id)?.value ?? ''));
  if (!independentRight) return false;
  return relations.every((relation) => evaluateInputRelation(
    relation,
    values.get(relation.leftInputId)?.value ?? '',
    values.get(relation.rightInputId)?.value ?? '',
  ));
}

export function collectInputRuleIssues(target: Element, elements: Element[]): InputRuleIssue[] {
  if (!hasStructuredInputRules(target, elements)) return [];
  const targetLabel = getInputRuleDisplayName(target);
  const raw = target.props?.[INPUT_RELATIONS_KEY];
  const relations = readInputRelations(target);
  if (raw !== undefined && (!Array.isArray(raw) || relations.length !== raw.length)) {
    return [{ code: 'invalid-data', targetId: target.id, message: `填空题“${targetLabel}”的算式关系数据无效，请重新配置` }];
  }
  const inputs = getFillAnswerInputs(target, elements);
  if (inputs.length === 0) {
    return [{ code: 'no-input', targetId: target.id, message: `填空题“${targetLabel}”没有可判定的输入框` }];
  }
  const inputIds = new Set(inputs.map((input) => input.id));
  const usedInputIds = new Set<string>();
  const issues: InputRuleIssue[] = [];
  relations.forEach((relation, index) => {
    const relationLabel = `填空题“${targetLabel}”的关系 ${index + 1}`;
    if (relation.leftInputId === relation.rightInputId) {
      issues.push({ code: 'same-input', targetId: target.id, message: `${relationLabel}不能连接同一个输入框` });
    }
    for (const inputId of [relation.leftInputId, relation.rightInputId]) {
      if (!inputIds.has(inputId)) {
        issues.push({ code: 'missing-input', targetId: target.id, message: `${relationLabel}包含已删除或已移出当前填空题的输入框` });
      }
      if (usedInputIds.has(inputId)) {
        issues.push({ code: 'duplicate-input', targetId: target.id, message: `${relationLabel}重复使用了已参加其他关系的输入框` });
      }
      usedInputIds.add(inputId);
    }
    if (relation.operator !== 'equal') {
      if (!relation.target?.trim()) {
        issues.push({ code: 'missing-target', targetId: target.id, message: `${relationLabel}尚未填写目标结果` });
      } else if (parseRuleNumber(relation.target) === null) {
        issues.push({ code: 'invalid-target', targetId: target.id, message: `${relationLabel}的目标结果不是有效数字或简单分数` });
      }
    }
  });
  inputs.forEach((input) => {
    if (!usedInputIds.has(input.id) && getInputAnswerCandidates(input).length === 0) {
      issues.push({ code: 'missing-answer', targetId: target.id, message: `填空题“${targetLabel}”的空位“${getInputRuleDisplayName(input)}”尚未配置候选答案或算式关系` });
    }
  });
  return issues;
}

export function collectCourseInputRuleIssues(course: Course): InputRuleIssue[] {
  const issues: InputRuleIssue[] = [];
  for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
    for (const subPage of stage.subPages) {
      const pages: Array<SubPage | NonNullable<SubPage['internalPages']>[number]> = [subPage, ...(subPage.internalPages ?? [])];
      for (const page of pages) {
        for (const target of page.elements) {
          if (target.type === 'KlInputBox') issues.push(...collectInputRuleIssues(target, page.elements));
        }
      }
    }
  }
  return issues;
}

export function remapInputRelationRefs(
  element: Element,
  idMap: Map<string, string>,
  makeId: (prefix: string) => string = () => makeRuleId(),
): void {
  if (!Array.isArray(element.props?.[INPUT_RELATIONS_KEY])) return;
  element.props[INPUT_RELATIONS_KEY] = readInputRelations(element).map((relation) => ({
    ...relation,
    id: makeId('input-relation'),
    leftInputId: idMap.get(relation.leftInputId) ?? relation.leftInputId,
    rightInputId: idMap.get(relation.rightInputId) ?? relation.rightInputId,
  }));
}

function runtimeNumberParserCode(): string {
  return `function(__raw) {
                var __value = String(__raw || "").replace(/^\\s+|\\s+$/g, "");
                if (/^[+-]?\\d+(?:\\.\\d+)?$/.test(__value)) { var __plain = Number(__value); return isFinite(__plain) ? __plain : NaN; }
                var __slash = __value.match(/^([+-]?\\d+)\\/(\\d+)$/);
                if (__slash) { var __slashDen = Number(__slash[2]); return __slashDen === 0 ? NaN : Number(__slash[1]) / __slashDen; }
                var __fraction = __value.match(/^([+-]?\\d*)<(\\d+)_(\\d+)>$/);
                if (__fraction) {
                    var __den = Number(__fraction[3]); if (__den === 0) return NaN;
                    var __part = Number(__fraction[2]) / __den; var __wholeText = __fraction[1];
                    if (!__wholeText || __wholeText === "+") return __part; if (__wholeText === "-") return -__part;
                    var __whole = Number(__wholeText); return __whole < 0 ? __whole - __part : __whole + __part;
                }
                return NaN;
            }`;
}

export function buildInputRuleInitCode(page: SubPage, getVar: (element: Element) => string): string {
  let code = '';
  for (const target of page.elements) {
    if (target.type !== 'KlInputBox' || !hasStructuredInputRules(target, page.elements)) continue;
    if (collectInputRuleIssues(target, page.elements).length > 0) continue;
    const inputs = getFillAnswerInputs(target, page.elements);
    const inputIndexById = new Map(inputs.map((input, index) => [input.id, index]));
    const relations = readInputRelations(target);
    const relatedIds = new Set(relations.flatMap((relation) => [relation.leftInputId, relation.rightInputId]));
    const checks = inputs.flatMap((input, inputIndex) => relatedIds.has(input.id) ? [] : [
      `(${JSON.stringify(getInputAnswerCandidates(input))}).indexOf(String(__inputs[${inputIndex}].fontClipValue || "")) >= 0`,
    ]);
    relations.forEach((relation) => {
      const leftIndex = inputIndexById.get(relation.leftInputId)!;
      const rightIndex = inputIndexById.get(relation.rightInputId)!;
      const left = `__number(__inputs[${leftIndex}].fontClipValue)`;
      const right = `__number(__inputs[${rightIndex}].fontClipValue)`;
      if (relation.operator === 'equal') {
        checks.push(`__close(${left}, ${right})`);
        return;
      }
      const operation = relation.operator === 'add'
        ? `${left} + ${right}`
        : relation.operator === 'subtract'
          ? `${left} - ${right}`
          : relation.operator === 'multiply'
            ? `${left} * ${right}`
            : `${left} / ${right}`;
      const divideGuard = relation.operator === 'divide' ? `!__close(${right}, 0) && ` : '';
      checks.push(`${divideGuard}__close(${operation}, __number(${JSON.stringify(relation.target ?? '')}))`);
    });
    const targetRef = `this.${getVar(target)}`;
    const inputRefs = inputs.map((input) => `this.${getVar(input)}`);
    code += `        (function(__target, __inputs) {\n`;
    code += `            if (!__target) return;\n`;
    code += `            var __number = ${runtimeNumberParserCode()};\n`;
    code += `            var __close = function(a, b) { return isFinite(a) && isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); };\n`;
    code += `            __target.isNull = function() { return __inputs.some(function(input) { return !input || input.valueOrSkinIsNull; }); };\n`;
    code += `            __target.isRight = function() { return !__target.isNull() && ${checks.map((check) => `(${check})`).join(' && ')}; };\n`;
    code += `        }).call(this, ${targetRef}, [${inputRefs.join(', ')}]);\n`;
  }
  return code;
}
