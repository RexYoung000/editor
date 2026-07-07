/**
 * 文字 → PNG 图像渲染。
 * 用 Canvas 2D API 把一段文字按 NewTextArea 的视觉属性烘焙成位图。
 * 字体由 fontLoader 统一管理,优先级:本地字体 → 库字体 → DEFAULT(派培优兰亭黑)。
 */

import { resolveElementFont } from './fontLoader';
import { DEFAULT_FONT_ID } from '../elements/fontLibrary';
import { loadLibraryFont } from './fontLoader';

export interface RenderTextProps {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wordWrap?: boolean;
  leading?: number;
  fontLibraryId?: string;
  fontLocalPath?: string;
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
  let fontFace: string;
  if (courseId) {
    fontFace = await resolveElementFont(courseId, props.fontLocalPath ?? '', props.fontLibraryId ?? '');
  } else {
    fontFace = (await loadLibraryFont(DEFAULT_FONT_ID)) ?? 'FZLanTingHei';
  }

  const fontSize = props.fontSize ?? 20;
  const color = props.color ?? '#333333';
  const align = props.align ?? 'left';
  const valign = props.valign ?? 'top';
  const wordWrap = props.wordWrap !== false;
  const leading = props.leading ?? 0;
  const lineHeight = fontSize + leading;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px "${fontFace}"`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    if (!wordWrap || raw.length === 0) { lines.push(raw); continue; }
    let cur = '';
    for (const ch of raw) {
      const w = ctx.measureText(cur + ch).width;
      if (w > width && cur.length > 0) { lines.push(cur); cur = ch; }
      else { cur = cur + ch; }
    }
    lines.push(cur);
  }

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
    ctx.fillText(lines[i], drawX, startY + i * lineHeight);
  }

  return canvas.toDataURL('image/png');
}
