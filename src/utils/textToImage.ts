import { resolveElementFont } from './fontLoader';
import { DEFAULT_FONT_FACE, DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { loadLibraryFont } from './fontLoader';
import { layoutRichText } from './textLayout';
import type { RichTextStyle } from './richText';

export interface RenderTextProps {
  fontSize?: number;
  color?: string;
  stroke?: number;
  strokeColor?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wordWrap?: boolean;
  leading?: number;
  fontLibraryId?: string;
  fontLocalPath?: string;
  fontFace?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textHtml?: string;
  textSizingMode?: 'auto' | 'fixed-width' | 'fixed';
}

async function resolveRenderFontFace(props: RenderTextProps, courseId?: string): Promise<string> {
  if (props.fontFace) return props.fontFace;
  if (courseId) {
    return resolveElementFont(courseId, props.fontLocalPath ?? '', props.fontLibraryId ?? '');
  }
  return (await loadLibraryFont(DEFAULT_FONT_ID)) ?? DEFAULT_FONT_FACE;
}

function fontForStyle(props: RenderTextProps, style: RichTextStyle, fontFace: string): string {
  const italic = style.italic || props.italic ? 'italic ' : '';
  const bold = style.bold || props.bold ? '700 ' : '400 ';
  const fontSize = props.fontSize ?? 20;
  return `${italic}${bold}${fontSize}px "${fontFace}"`;
}

function drawUnderline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
  thickness: number,
): void {
  if (x2 <= x1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export async function renderTextToImage(
  text: string,
  width: number,
  height: number,
  props: RenderTextProps = {},
  scale = 2,
  courseId?: string,
): Promise<string> {
  const fontFace = await resolveRenderFontFace(props, courseId);
  const fontSize = props.fontSize ?? 20;
  const color = props.color ?? '#333333';
  const stroke = Math.max(0, props.stroke ?? 0);
  const strokeColor = props.strokeColor ?? '#000000';
  const align = props.align ?? 'left';
  const valign = props.valign ?? 'top';
  const leading = props.leading ?? 0;
  const lineHeight = Math.max(1, fontSize + leading);
  const layout = layoutRichText(text, width, height, props, fontFace);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'square';
  ctx.lineWidth = stroke;
  ctx.strokeStyle = strokeColor;

  const totalHeight = layout.lines.length * lineHeight;
  let startY = 0;
  if (valign === 'middle') startY = (height - totalHeight) / 2;
  else if (valign === 'bottom') startY = height - totalHeight;

  ctx.textAlign = 'left';

  const underlineThickness = Math.max(1, Math.round(fontSize / 16));
  const underlineYDelta = fontSize + 2;

  layout.richLines.forEach((line, lineIndex) => {
    const drawY = startY + lineIndex * lineHeight;
    let cursorX = 0;
    if (align === 'center') cursorX = (width - line.width) / 2;
    else if (align === 'right') cursorX = width - line.width;
    let underlineStart: number | null = null;
    const flushUnderline = (endX: number) => {
      if (underlineStart === null) return;
      drawUnderline(ctx, underlineStart, endX, drawY + underlineYDelta, color, underlineThickness);
      underlineStart = null;
    };

    for (const glyph of line.glyphs) {
      const glyphFont = fontForStyle(props, glyph.style, fontFace);
      ctx.font = glyphFont;
      const glyphWidth = ctx.measureText(glyph.char).width;
      if (stroke > 0) ctx.strokeText(glyph.char, cursorX, drawY);
      ctx.fillText(glyph.char, cursorX, drawY);
      if (glyph.style.underline) {
        if (underlineStart === null) underlineStart = cursorX;
      } else {
        flushUnderline(cursorX);
      }
      cursorX += glyphWidth;
    }
    flushUnderline(cursorX);
  });

  return canvas.toDataURL('image/png');
}

export async function renderGlyphSheetToImage(
  characters: string,
  cellWidth: number,
  cellHeight: number,
  props: RenderTextProps = {},
  scale = 2,
  courseId?: string,
): Promise<string> {
  const glyphs = Array.from(characters);
  if (glyphs.length === 0) throw new Error('Glyph sheet requires at least one character.');

  const fontFace = await resolveRenderFontFace(props, courseId);
  const fontSize = props.fontSize ?? 20;
  const color = props.color ?? '#333333';
  const stroke = Math.max(0, props.stroke ?? 0);
  const strokeColor = props.strokeColor ?? '#000000';
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(cellWidth * glyphs.length * scale));
  canvas.height = Math.max(1, Math.ceil(cellHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');
  ctx.scale(scale, scale);
  ctx.font = `${props.italic ? 'italic ' : ''}${props.bold ? '700 ' : '400 '}${fontSize}px "${fontFace}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  ctx.strokeStyle = strokeColor;

  glyphs.forEach((glyph, index) => {
    const x = index * cellWidth + cellWidth / 2;
    const y = cellHeight / 2;
    if (stroke > 0) ctx.strokeText(glyph, x, y);
    ctx.fillText(glyph, x, y);
  });

  return canvas.toDataURL('image/png');
}
