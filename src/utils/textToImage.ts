/**
 * 文字 → PNG 图像渲染。
 * 用 Canvas 2D API 把一段文字按 NewTextArea 的视觉属性烘焙成位图。
 * 字体由 fontLoader 统一管理,优先级:本地字体 → 库字体 → 思源黑体 Regular。
 */

import { resolveElementFont } from './fontLoader';
import { DEFAULT_FONT_FACE, DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { loadLibraryFont } from './fontLoader';
import { layoutText } from './textLayout';

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
  /** 已完成加载和注册的字体名；传入时不再执行字体解析或兜底。 */
  fontFace?: string;
  bold?: boolean;
  italic?: boolean;
  textSizingMode?: 'auto' | 'fixed-width' | 'fixed';
}

async function resolveRenderFontFace(props: RenderTextProps, courseId?: string): Promise<string> {
  if (props.fontFace) return props.fontFace;
  if (courseId) {
    return resolveElementFont(courseId, props.fontLocalPath ?? '', props.fontLibraryId ?? '');
  }
  return (await loadLibraryFont(DEFAULT_FONT_ID)) ?? DEFAULT_FONT_FACE;
}

/**
 * 把文本渲染成 PNG data URL。
 * @param text       文本内容(可含 \n)
 * @param width      元素宽(1× 设计稿尺寸)
 * @param height     元素高
 * @param props      视觉属性 + 字体设置
 * @param scale      渲染倍率,默认 2
 * @param courseId   解析本地字体需要;为空则走库字体或兜底
 */
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
  const lineHeight = fontSize + leading;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.font = `${props.italic ? 'italic ' : ''}${props.bold ? '700 ' : '400 '}${fontSize}px "${fontFace}"`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  ctx.strokeStyle = strokeColor;

  const lines = layoutText(text, width, height, props, fontFace).lines;

  const totalHeight = lines.length * lineHeight;
  let startY: number;
  if (valign === 'middle') startY = (height - totalHeight) / 2;
  else if (valign === 'bottom') startY = height - totalHeight;
  else startY = 0;

  let drawX: number;
  if (align === 'center') { ctx.textAlign = 'center'; drawX = width / 2; }
  else if (align === 'right') { ctx.textAlign = 'right'; drawX = width; }
  else { ctx.textAlign = 'left'; drawX = 0; }

  for (let i = 0; i < lines.length; i++) {
    const drawY = startY + i * lineHeight;
    if (stroke > 0) ctx.strokeText(lines[i], drawX, drawY);
    ctx.fillText(lines[i], drawX, drawY);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 把字符集合烘焙为横向等宽 FontClip 字库图。
 * 返回图片按 `characters` 顺序切分，每个字符占一个固定单元格。
 */
export async function renderGlyphSheetToImage(
  characters: string,
  cellWidth: number,
  cellHeight: number,
  props: RenderTextProps = {},
  scale = 2,
  courseId?: string,
): Promise<string> {
  const glyphs = Array.from(characters);
  if (glyphs.length === 0) throw new Error('位图字库至少需要一个字符');

  const fontFace = await resolveRenderFontFace(props, courseId);
  const fontSize = props.fontSize ?? 20;
  const color = props.color ?? '#333333';
  const stroke = Math.max(0, props.stroke ?? 0);
  const strokeColor = props.strokeColor ?? '#000000';
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(cellWidth * glyphs.length * scale));
  canvas.height = Math.max(1, Math.ceil(cellHeight * scale));
  const ctx = canvas.getContext('2d')!;
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
