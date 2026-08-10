import type { RenderTextProps } from './textToImage';
import { parseRichTextHtml, type RichTextStyle } from './richText';

export type TextSizingMode = 'auto' | 'fixed-width' | 'fixed';

export interface TextLayoutResult {
  lines: string[];
  lineStartOffsets: number[];
  width: number;
  height: number;
  lineHeight: number;
  contentWidth: number;
  overflow: boolean;
}

function richFontSpec(props: RenderTextProps, style: RichTextStyle, fontFamily = 'sans-serif'): string {
  const italic = style.italic || props.italic;
  const bold = style.bold || props.bold;
  const fontStyle = italic ? 'italic ' : '';
  const fontWeight = bold ? '700 ' : '400 ';
  return `${fontStyle}${fontWeight}${props.fontSize ?? 20}px "${fontFamily}"`;
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const Segmenter = (Intl as typeof Intl & {
      Segmenter: new (locale?: string, options?: { granularity?: 'grapheme' }) => Intl.Segmenter;
    }).Segmenter;
    const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (item) => item.segment);
  }
  return Array.from(text);
}

function fallbackWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) width += char.charCodeAt(0) <= 0xff ? fontSize * 0.56 : fontSize;
  return width;
}

function createRichTextMeasurer(props: RenderTextProps, fontFamily: string): (text: string, style: RichTextStyle) => number {
  const fontSize = props.fontSize ?? 20;
  if (typeof document === 'undefined') return (text) => fallbackWidth(text, fontSize);
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return (text) => fallbackWidth(text, fontSize);
  return (text, style) => {
    ctx.font = richFontSpec(props, style, fontFamily);
    return text ? ctx.measureText(text).width : 0;
  };
}

export interface RichTextLine {
  text: string;
  width: number;
  glyphs: Array<{ char: string; style: RichTextStyle }>;
}

export interface RichTextLayoutResult extends TextLayoutResult {
  richLines: RichTextLine[];
}

export function normalizeTextSizingMode(value: unknown): TextSizingMode {
  return value === 'auto' || value === 'fixed-width' ? value : 'fixed';
}

export function layoutText(
  text: string,
  width: number,
  height: number,
  props: RenderTextProps = {},
  fontFamily = 'sans-serif',
): TextLayoutResult {
  return layoutRichText(text, width, height, props, fontFamily);
}

export function layoutRichText(
  text: string,
  width: number,
  height: number,
  props: RenderTextProps = {},
  fontFamily = 'sans-serif',
): RichTextLayoutResult {
  const fontSize = Math.max(1, props.fontSize ?? 20);
  const lineHeight = Math.max(1, fontSize + (props.leading ?? 0));
  const wordWrap = props.wordWrap !== false;
  const mode = normalizeTextSizingMode(props.textSizingMode);
  const availableWidth = Math.max(1, width || 1);
  const measureWidth = createRichTextMeasurer(props, fontFamily);
  const legacyStyle: RichTextStyle = {
    bold: props.bold,
    italic: props.italic,
    underline: props.underline,
  };
  const items = parseRichTextHtml((props as { textHtml?: string }).textHtml, text, legacyStyle);

  const richLines: RichTextLine[] = [];
  const lineStartOffsets: number[] = [];
  let currentGlyphs: Array<{ char: string; style: RichTextStyle }> = [];
  let currentWidth = 0;
  let currentStartOffset = 0;
  let textOffset = 0;

  const pushLine = () => {
    const textLine = currentGlyphs.map((item) => item.char).join('');
    richLines.push({ text: textLine, width: currentWidth, glyphs: currentGlyphs });
    lineStartOffsets.push(currentStartOffset);
    currentGlyphs = [];
    currentWidth = 0;
    currentStartOffset = textOffset;
  };

  for (const item of items) {
    if ('break' in item) {
      pushLine();
      textOffset += 1;
      currentStartOffset = textOffset;
      continue;
    }
    for (const char of splitGraphemes(item.text)) {
      const glyph = { char, style: item.style };
      const charWidth = measureWidth(glyph.char, glyph.style);
      if (wordWrap && currentGlyphs.length > 0 && currentWidth + charWidth > availableWidth) {
        pushLine();
        currentStartOffset = textOffset;
      }
      currentGlyphs.push(glyph);
      currentWidth += charWidth;
      textOffset += glyph.char.length;
    }
  }
  pushLine();
  if (richLines.length === 0) {
    richLines.push({ text: '', width: 0, glyphs: [] });
    lineStartOffsets.push(0);
  }

  const lines = richLines.map((line) => line.text);
  const contentWidth = Math.max(0, ...richLines.map((line) => line.width));
  const autoWidth = Math.max(40, Math.ceil(contentWidth + 2));
  const autoHeight = Math.max(lineHeight, Math.ceil(richLines.length * lineHeight));
  const nextWidth = mode === 'auto' ? autoWidth : Math.max(1, Math.ceil(width || autoWidth));
  const nextHeight = mode === 'fixed' ? Math.max(1, Math.ceil(height || autoHeight)) : autoHeight;
  const overflow = mode === 'fixed' && (contentWidth > nextWidth || autoHeight > nextHeight);
  return { lines, lineStartOffsets, width: nextWidth, height: nextHeight, lineHeight, contentWidth, overflow, richLines };
}

export function caretOffsetAtPoint(
  text: string,
  width: number,
  props: RenderTextProps,
  localX: number,
  localY: number,
  fontFamily = 'sans-serif',
): number {
  const safeX = Number.isFinite(localX) ? localX : 0;
  const safeY = Number.isFinite(localY) ? localY : 0;
  const layout = layoutRichText(text, width, 0, props, fontFamily);
  const lineIndex = Math.max(0, Math.min(layout.lines.length - 1, Math.floor(Math.max(0, safeY) / layout.lineHeight)));
  const line = layout.richLines[lineIndex] ?? { text: '', width: 0, glyphs: [] };
  const measureGlyph = createRichTextMeasurer(props, fontFamily);
  let offset = 0;
  let best = Number.POSITIVE_INFINITY;
  let cursorX = 0;
  for (let i = 0; i <= line.glyphs.length; i++) {
    const distance = Math.abs(cursorX - Math.max(0, safeX));
    if (distance < best) { best = distance; offset = i; }
    if (i < line.glyphs.length) {
      const glyph = line.glyphs[i];
      cursorX += measureGlyph(glyph.char, glyph.style);
    }
  }
  return (layout.lineStartOffsets[lineIndex] ?? 0) + offset;
}
