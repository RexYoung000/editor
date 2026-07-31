import type { Element } from '../types';
import {
  getCustomAnswerTextStyle,
  isCustomAnswerKeyboardTheme,
  type CustomAnswerKeyboardTheme,
} from '../elements/keyboardPresets';
import { DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { loadLibraryFont } from './fontLoader';
import { renderGlyphSheetToImage } from './textToImage';

export type InputTextTheme = CustomAnswerKeyboardTheme;

export const DEFAULT_INPUT_TEXT_THEME: InputTextTheme = 'blue';
export const INPUT_FONT_SIZE_MIN = 12;
export const INPUT_FONT_SIZE_MAX = 120;
export const INPUT_FONT_SIZE_STEP = 1;
export const DEFAULT_INPUT_FONT_SIZE = 36;
export const DEFAULT_FRACTION_INPUT_FONT_SIZE = 42;
export const INPUT_LETTER_SPACING_MIN = -20;
export const INPUT_LETTER_SPACING_MAX = 60;
export const INPUT_LETTER_SPACING_STEP = 1;
export const DEFAULT_INPUT_LETTER_SPACING = 0;
export const DEFAULT_FRACTION_INPUT_LETTER_SPACING = 6;
export const DEFAULT_INPUT_FRACTION_FONT_SCALE = 0.64;
export const INPUT_FRACTION_FONT_PERCENT_MIN = 40;
export const INPUT_FRACTION_FONT_PERCENT_MAX = 100;
export const INPUT_FRACTION_FONT_PERCENT_STEP = 1;

export interface InputFontGlyphMetrics {
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  stroke: number;
}

export interface InputFractionLayoutMetrics {
  width: number;
  height: number;
  partHeight: number;
  horizontalPadding: number;
  verticalGap: number;
  tokenGap: number;
}

const inputFontSkinCache = new Map<string, Promise<string>>();

function inputProps(
  source: Pick<Element, 'props'> | Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  return source && 'props' in source
    ? (source.props as Record<string, unknown> | undefined)
    : source ?? undefined;
}

export function readInputTextTheme(
  source: Pick<Element, 'props'> | Record<string, unknown> | null | undefined,
): InputTextTheme | undefined {
  const value = inputProps(source)?._inputTextTheme;
  return isCustomAnswerKeyboardTheme(value) ? value : undefined;
}

export function defaultInputFontSize(type: string): number {
  return type === 'FractionInput' ? DEFAULT_FRACTION_INPUT_FONT_SIZE : DEFAULT_INPUT_FONT_SIZE;
}

export function clampInputFontSize(value: unknown, fallback = DEFAULT_INPUT_FONT_SIZE): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(INPUT_FONT_SIZE_MAX, Math.max(INPUT_FONT_SIZE_MIN, Math.round(parsed)));
}

export function inputFontScale(element: Pick<Element, 'width' | 'height' | 'props'>): number {
  const props = element.props ?? {};
  const referenceWidth = Number(props._inputFontReferenceWidth);
  const referenceHeight = Number(props._inputFontReferenceHeight);
  if (!(referenceWidth > 0) || !(referenceHeight > 0)) return 1;
  return Math.min(element.width / referenceWidth, element.height / referenceHeight);
}

export function effectiveInputFontSize(element: Pick<Element, 'type' | 'width' | 'height' | 'props'>): number {
  const fallback = defaultInputFontSize(element.type);
  const configured = clampInputFontSize(element.props?._inputFontSize, fallback);
  return clampInputFontSize(configured * inputFontScale(element), fallback);
}

export function inputFontPercentage(type: string, fontSize: number): number {
  return Math.round((fontSize / defaultInputFontSize(type)) * 100);
}

export function defaultInputLetterSpacing(type: string): number {
  return type === 'FractionInput'
    ? DEFAULT_FRACTION_INPUT_LETTER_SPACING
    : DEFAULT_INPUT_LETTER_SPACING;
}

export function clampInputLetterSpacing(
  value: unknown,
  fallback = DEFAULT_INPUT_LETTER_SPACING,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(INPUT_LETTER_SPACING_MAX, Math.max(INPUT_LETTER_SPACING_MIN, Math.round(parsed)));
}

export function effectiveInputLetterSpacing(
  element: Pick<Element, 'type' | 'width' | 'height' | 'props'>,
): number {
  const fallback = defaultInputLetterSpacing(element.type);
  const configured = clampInputLetterSpacing(element.props?._inputLetterSpacing, fallback);
  return clampInputLetterSpacing(configured * inputFontScale(element), fallback);
}

export function clampInputFractionFontScale(
  value: unknown,
  fallback = DEFAULT_INPUT_FRACTION_FONT_SCALE,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    INPUT_FRACTION_FONT_PERCENT_MAX / 100,
    Math.max(INPUT_FRACTION_FONT_PERCENT_MIN / 100, parsed),
  );
}

export function readInputFractionFontScale(
  source: Pick<Element, 'props'> | Record<string, unknown> | null | undefined,
): number {
  return clampInputFractionFontScale(inputProps(source)?._inputFractionFontScale);
}

export function uniqueInputCharacters(value: unknown): string {
  const seen = new Set<string>();
  const characters: string[] = [];
  for (const character of Array.from(String(value ?? ''))) {
    if (seen.has(character)) continue;
    seen.add(character);
    characters.push(character);
  }
  return characters.join('');
}

export function normalizeInputPreviewSample(
  value: unknown,
  allowedCharacters: unknown,
  maxLength: number,
): string {
  const allowed = new Set(Array.from(uniqueInputCharacters(allowedCharacters)));
  const limit = Math.max(0, Math.round(Number(maxLength) || 0));
  return Array.from(String(value ?? ''))
    .filter((character) => allowed.has(character))
    .slice(0, limit)
    .join('');
}

function isNarrowInputCharacterSet(characters: unknown): boolean {
  const values = Array.from(uniqueInputCharacters(characters));
  return values.length > 0 && values.every((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x024f || '×÷π²°'.includes(character);
  });
}

export function getInputFontGlyphMetrics(
  fontSize: number,
  characters?: unknown,
): InputFontGlyphMetrics {
  const normalized = clampInputFontSize(fontSize);
  const stroke = normalized >= 18 ? 2 : 1;
  const widthRatio = isNarrowInputCharacterSet(characters) ? 0.82 : 1.08;
  return {
    cellWidth: Math.max(1, Math.ceil(normalized * widthRatio + stroke * 2)),
    cellHeight: Math.max(1, Math.ceil(normalized * 1.3 + stroke * 2)),
    fontSize: normalized,
    stroke,
  };
}

export function getInputFractionLayoutMetrics(
  metrics: InputFontGlyphMetrics,
  fractionPartScale: number,
  numeratorLength = 1,
  denominatorLength = 1,
  letterSpacing?: number,
): InputFractionLayoutMetrics {
  const scale = clampInputFractionFontScale(fractionPartScale);
  const digitCount = Math.max(1, Math.round(Math.max(numeratorLength, denominatorLength)));
  const horizontalPadding = Math.max(8, Math.round(metrics.fontSize * 0.24));
  const verticalGap = Math.max(4, Math.round(metrics.fontSize * 0.14));
  const tokenGap = clampInputLetterSpacing(
    letterSpacing,
    Math.max(4, Math.round(metrics.fontSize * 0.14)),
  );
  const partHeight = metrics.cellHeight * scale;
  const glyphAdvance = Math.max(1, metrics.cellWidth + tokenGap);
  const textWidth = metrics.cellWidth + (digitCount - 1) * glyphAdvance;
  return {
    width: Math.ceil(textWidth * scale + horizontalPadding * 2),
    height: Math.ceil(partHeight * 2 + verticalGap),
    partHeight,
    horizontalPadding,
    verticalGap,
    tokenGap,
  };
}

export function renderInputFontSkin(
  characters: string,
  theme: InputTextTheme,
  metrics: InputFontGlyphMetrics,
): Promise<string> {
  const normalizedCharacters = uniqueInputCharacters(characters);
  if (!normalizedCharacters) return Promise.reject(new Error('可输入字符不能为空'));
  const style = getCustomAnswerTextStyle(theme, '字');
  const cacheKey = JSON.stringify([normalizedCharacters, theme, metrics]);
  const cached = inputFontSkinCache.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    const fontFace = await loadLibraryFont(DEFAULT_FONT_ID);
    if (!fontFace) throw new Error('输入框字体加载失败，无法生成位图字库');
    return renderGlyphSheetToImage(
      normalizedCharacters,
      metrics.cellWidth,
      metrics.cellHeight,
      {
        fontFace,
        fontSize: metrics.fontSize,
        color: style.color,
        stroke: metrics.stroke,
        strokeColor: style.strokeColor,
      },
      1,
    );
  })().catch((error) => {
    inputFontSkinCache.delete(cacheKey);
    throw error;
  });

  inputFontSkinCache.set(cacheKey, pending);
  return pending;
}

export function inputFontRuntimeProps(
  element: Pick<Element, 'type' | 'width' | 'height' | 'props'>,
  metrics: InputFontGlyphMetrics,
): Record<string, unknown> {
  const letterSpacing = effectiveInputLetterSpacing(element);
  const common: Record<string, unknown> = {
    contentScale: 1,
    spaceX: letterSpacing,
  };
  if (element.type !== 'FractionInput') return common;
  const fractionPartScale = readInputFractionFontScale(element);
  const layout = getInputFractionLayoutMetrics(metrics, fractionPartScale, 1, 1, letterSpacing);
  return {
    ...common,
    fontWidth: metrics.cellWidth,
    fontHeight: metrics.cellHeight,
    fontScale: 1,
    fractionPartScale,
    dynamicFractionLayout: true,
    fractionHorizontalPadding: layout.horizontalPadding,
    fractionVerticalGap: layout.verticalGap,
    tokenGap: layout.tokenGap,
  };
}
