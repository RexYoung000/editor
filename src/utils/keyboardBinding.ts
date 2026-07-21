import type { Element } from '../types';
import { KEYBOARD_PRESETS, type KeyboardPreset } from '../elements/keyboardPresets';

type KeyboardProps = {
  _keyboardPreset?: { id?: unknown };
  camp?: unknown;
  sheet?: unknown;
  output?: unknown;
};

export interface KeyboardBindingInfo {
  preset?: KeyboardPreset;
  /** 旧课件没有预设 id 时，用于向老师解释来源。 */
  legacy: boolean;
  label: string;
}

function propsOf(element: Element): KeyboardProps {
  return element.props as KeyboardProps;
}

function explicitPreset(element: Element): KeyboardPreset | undefined {
  const id = propsOf(element)._keyboardPreset?.id;
  return typeof id === 'string' ? KEYBOARD_PRESETS.find((preset) => preset.id === id) : undefined;
}

function descendantElements(element: Element, elements: Element[]): Element[] {
  const descendants: Element[] = [];
  const pending = [element.id];
  while (pending.length > 0) {
    const parentId = pending.shift()!;
    for (const child of elements) {
      if (child.parentId !== parentId) continue;
      descendants.push(child);
      pending.push(child.id);
    }
  }
  return descendants;
}

/**
 * 历史课件的键盘没有 `_keyboardPreset`，但通常仍保留 sheet 或按键 output。
 * 这里只在证据足够明确时映射到内置预设，避免把自定义键盘误改成另一套键盘。
 */
export function inferKeyboardPreset(element: Element, elements: Element[] = []): KeyboardPreset | undefined {
  const direct = explicitPreset(element);
  if (direct) return direct;

  const props = propsOf(element);
  const descendants = descendantElements(element, elements);
  const sheets = [props.sheet, ...descendants.map((child) => propsOf(child).sheet)]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.replace(/\s/g, ''));
  const outputs = descendants
    .map((child) => propsOf(child).output)
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(String);
  const hasFractionKey = outputs.some((output) => output.includes('<_>') || output.includes('分数'));
  if (hasFractionKey || sheets.some((sheet) => sheet.includes('<_>'))) {
    return KEYBOARD_PRESETS.find((preset) => preset.id === 'fraction');
  }
  if (sheets.some((sheet) => sheet === '0123456789.')) {
    return KEYBOARD_PRESETS.find((preset) => preset.id === 'decimal');
  }
  if (sheets.some((sheet) => sheet === '1234567890()+-*/=.')) {
    return KEYBOARD_PRESETS.find((preset) => preset.id === 'preset2');
  }
  if (sheets.some((sheet) => sheet === '0123456789°+-*/=().')) {
    return KEYBOARD_PRESETS.find((preset) => preset.id === 'preset1');
  }
  return undefined;
}

export function keyboardBindingInfo(element: Element, elements: Element[] = []): KeyboardBindingInfo {
  const preset = inferKeyboardPreset(element, elements);
  if (preset) return { preset, legacy: !explicitPreset(element), label: preset.label };
  return { legacy: true, label: '旧版/自定义键盘' };
}

export function keyboardCamp(element: Element): string {
  const camp = propsOf(element).camp;
  return typeof camp === 'string' ? camp.trim() : '';
}

/** 未设置阵营的旧键盘使用稳定、页面内唯一的通用阵营。 */
export function nextKeyboardCamp(elements: Element[], prefix = 'KB'): string {
  const used = new Set(elements.map(keyboardCamp).filter(Boolean));
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export function keyboardSupportsInput(element: Element, inputType: string, elements: Element[] = []): boolean {
  const preset = inferKeyboardPreset(element, elements);
  return !preset || preset.compatibleInputTypes.includes(inputType);
}

export function keyboardPresetId(element: Element, elements: Element[] = []): string | undefined {
  return inferKeyboardPreset(element, elements)?.id;
}
