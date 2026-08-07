import {
  getCustomAnswerKeyboardLayout,
  getCustomAnswerTextStyle,
  normalizeCustomAnswerOptions,
  readCustomAnswerKeyboardConfig,
  type CustomAnswerKeyboardTheme,
} from '../elements/keyboardPresets';
import type { Course, Element } from '../types';
import { DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { getElementPages } from './internalPages';
import { loadLibraryFont } from './fontLoader';
import { renderTextToImage } from './textToImage';
import {
  effectiveInputFontSize,
  getInputFontGlyphMetrics,
  inputFontRuntimeProps,
  readInputTextTheme,
  renderInputFontSkin,
  uniqueInputCharacters,
  type InputFontGlyphMetrics,
} from './inputFont';

export const CUSTOM_ANSWER_KEYBOARD_FONT_LIBRARY_ID = DEFAULT_FONT_ID;
export const CUSTOM_ANSWER_KEYBOARD_TEXT_SIZE = { width: 84, height: 88 };

export type CustomAnswerInputGlyphMetrics = InputFontGlyphMetrics;

const DEFAULT_CUSTOM_ANSWER_INPUT_GLYPH_METRICS: CustomAnswerInputGlyphMetrics = {
  cellWidth: 28,
  cellHeight: 44,
  fontSize: 25,
  stroke: 2,
};

const textSkinCache = new Map<string, Promise<string>>();

export function renderCustomAnswerTextSkin(
  answer: string,
  theme: CustomAnswerKeyboardTheme,
  width = CUSTOM_ANSWER_KEYBOARD_TEXT_SIZE.width,
): Promise<string> {
  const style = getCustomAnswerTextStyle(theme, answer);
  const cacheKey = JSON.stringify([answer, theme, width, style]);
  const cached = textSkinCache.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    const fontFace = await loadLibraryFont(CUSTOM_ANSWER_KEYBOARD_FONT_LIBRARY_ID);
    if (!fontFace) {
      throw new Error('自定义答案键盘字体加载失败，无法生成键帽文字图片');
    }
    return renderTextToImage(
      answer,
      width,
      CUSTOM_ANSWER_KEYBOARD_TEXT_SIZE.height,
      {
        fontFace,
        fontSize: style.fontSize,
        color: style.color,
        stroke: 4,
        strokeColor: style.strokeColor,
        align: 'center',
        valign: 'middle',
        wordWrap: false,
        textSizingMode: 'fixed',
      },
      2,
    );
  })().catch((error) => {
    textSkinCache.delete(cacheKey);
    throw error;
  });

  textSkinCache.set(cacheKey, pending);
  return pending;
}

export function customAnswerInputSheet(answers: string[]): string {
  const seen = new Set<string>();
  const characters: string[] = [];
  for (const answer of answers) {
    for (const character of Array.from(answer)) {
      if (seen.has(character)) continue;
      seen.add(character);
      characters.push(character);
    }
  }
  return characters.join('');
}

export function getCustomAnswerInputGlyphMetrics(
  width: number,
  height: number,
  maxAnswerLength: number,
): CustomAnswerInputGlyphMetrics {
  const length = Math.max(1, maxAnswerLength);
  const availableWidth = Math.max(1, Math.floor(width) - 16);
  const availableHeight = Math.max(1, Math.floor(height) - 10);
  const cellWidth = Math.max(1, Math.min(42, Math.floor(availableWidth / length)));
  const cellHeight = Math.max(1, Math.min(52, availableHeight));
  const fontSize = Math.max(4, Math.min(34, Math.floor(Math.min(
    cellWidth * 0.78,
    cellHeight * 0.72,
  ))));
  return {
    cellWidth,
    cellHeight,
    fontSize,
    stroke: fontSize >= 18 ? 2 : 1,
  };
}

export function renderCustomAnswerInputFontSkin(
  characters: string,
  theme: CustomAnswerKeyboardTheme,
  metrics: CustomAnswerInputGlyphMetrics = DEFAULT_CUSTOM_ANSWER_INPUT_GLYPH_METRICS,
): Promise<string> {
  return renderInputFontSkin(characters, theme, metrics);
}

export interface CustomAnswerKeyboardTextRenderer {
  answerText(answer: string, theme: CustomAnswerKeyboardTheme, width: number): Promise<string>;
  inputFont(
    characters: string,
    theme: CustomAnswerKeyboardTheme,
    metrics: CustomAnswerInputGlyphMetrics,
  ): Promise<string>;
}

const defaultRenderer: CustomAnswerKeyboardTextRenderer = {
  answerText: renderCustomAnswerTextSkin,
  inputFont: renderCustomAnswerInputFontSkin,
};

function keyboardPresetId(element: Element): unknown {
  return (element.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
}

function camp(element: Element): string {
  return String(element.props?.camp ?? '').trim();
}

export async function bakeCustomAnswerKeyboardTextAssets(
  course: Course,
  renderer: CustomAnswerKeyboardTextRenderer = defaultRenderer,
): Promise<void> {
  const allStages = [...course.stages, ...(course.previewStages ?? [])];
  for (const stage of allStages) {
    for (const subPage of stage.subPages) {
      for (const page of getElementPages(subPage)) {
        const inputBindings = new Map<Element, {
          inputSheet: string;
          keyboardTheme: CustomAnswerKeyboardTheme;
          maxAnswerLength: number;
        }>();
        const keyboards = page.elements.filter((element) => (
          element.type === 'KlBaseKeyboard' && keyboardPresetId(element) === 'customAnswer'
        ));
        for (const keyboard of keyboards) {
          const config = readCustomAnswerKeyboardConfig(keyboard);
          const answers = normalizeCustomAnswerOptions(config.answers);
          const layout = getCustomAnswerKeyboardLayout(answers);
          const inputSheet = customAnswerInputSheet(answers);
          const textSkins = await Promise.all(
            answers.map((answer, index) => renderer.answerText(
              answer,
              config.theme,
              layout.answerPositions[index]?.width ?? CUSTOM_ANSWER_KEYBOARD_TEXT_SIZE.width,
            )),
          );

          const keyboardCamp = camp(keyboard);
          const maxAnswerLength = Math.max(...answers.map((answer) => Array.from(answer).length));
          const boundInputs = page.elements.filter((input) => (
            input.type === 'KlInputImage' && camp(input) === keyboardCamp
          ));
          boundInputs.forEach((input) => inputBindings.set(input, {
            inputSheet,
            keyboardTheme: config.theme,
            maxAnswerLength,
          }));

          keyboard.props = {
            ...keyboard.props,
            _customAnswerKeyboard: {
              answers,
              theme: config.theme,
              textSkins,
              inputSheet,
            },
          };
        }

        const inputs = page.elements.filter((element) => (
          element.type === 'KlInputImage' || element.type === 'FractionInput'
        ));
        const renderedInputSkins = new Map<Element, string>();
        for (const input of inputs) {
          const binding = inputBindings.get(input);
          const inputTheme = readInputTextTheme(input);
          if (!inputTheme && !binding) continue;

          const inputSheet = uniqueInputCharacters(binding?.inputSheet ?? input.props?.sheet);
          if (!inputSheet) continue;
          const metrics = inputTheme
            ? getInputFontGlyphMetrics(effectiveInputFontSize(input), inputSheet)
            : getCustomAnswerInputGlyphMetrics(
                input.width,
                input.height,
                binding?.maxAnswerLength ?? 1,
              );
          const inputFontSkin = await renderer.inputFont(
            inputSheet,
            inputTheme ?? binding!.keyboardTheme,
            metrics,
          );
          const nextProps = { ...(input.props ?? {}) };
          delete nextProps.font;
          nextProps.sheet = inputSheet;
          nextProps.fontClipSkin = inputFontSkin;
          if (binding) {
            nextProps.contentType = 1;
            nextProps.place = 1;
            nextProps.contentScale = 1;
          }
          if (inputTheme) Object.assign(nextProps, inputFontRuntimeProps(input, metrics));
          input.props = nextProps;
          renderedInputSkins.set(input, inputFontSkin);
        }

        for (const keyboard of keyboards) {
          const keyboardCamp = camp(keyboard);
          const inputFontSkin = page.elements
            .filter((input) => input.type === 'KlInputImage' && camp(input) === keyboardCamp)
            .map((input) => renderedInputSkins.get(input))
            .find((skin): skin is string => Boolean(skin));
          if (!inputFontSkin) continue;
          keyboard.props = {
            ...keyboard.props,
            _customAnswerKeyboard: {
              ...(keyboard.props._customAnswerKeyboard as Record<string, unknown>),
              inputFontSkin,
            },
          };
        }
      }
    }
  }
}
