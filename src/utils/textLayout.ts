import type { RenderTextProps } from './textToImage';

export type TextSizingMode = 'auto' | 'fixed-width' | 'fixed';

export interface TextLayoutResult {
  lines: string[];
  width: number;
  height: number;
  lineHeight: number;
  contentWidth: number;
  overflow: boolean;
}

function fontSpec(props: RenderTextProps, fontFamily = 'sans-serif'): string {
  const style = props.italic ? 'italic ' : '';
  const weight = props.bold ? '700 ' : '400 ';
  return `${style}${weight}${props.fontSize ?? 20}px "${fontFamily}"`;
}

function fallbackWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) width += char.charCodeAt(0) <= 0xff ? fontSize * 0.56 : fontSize;
  return width;
}

function measureWidth(text: string, props: RenderTextProps, fontFamily: string): number {
  if (!text) return 0;
  if (typeof document === 'undefined') return fallbackWidth(text, props.fontSize ?? 20);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return fallbackWidth(text, props.fontSize ?? 20);
  ctx.font = fontSpec(props, fontFamily);
  return ctx.measureText(text).width;
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
  const fontSize = Math.max(1, props.fontSize ?? 20);
  const lineHeight = Math.max(1, fontSize + (props.leading ?? 0));
  const wordWrap = props.wordWrap !== false;
  const mode = normalizeTextSizingMode(props.textSizingMode);
  const availableWidth = Math.max(1, width || 1);
  const lines: string[] = [];

  for (const rawLine of text.split('\n')) {
    if (!wordWrap || rawLine.length === 0) {
      lines.push(rawLine);
      continue;
    }
    let current = '';
    for (const char of rawLine) {
      const next = current + char;
      if (current && measureWidth(next, props, fontFamily) > availableWidth) {
        lines.push(current);
        current = char;
      } else current = next;
    }
    lines.push(current);
  }
  if (lines.length === 0) lines.push('');

  const contentWidth = Math.max(0, ...lines.map((line) => measureWidth(line, props, fontFamily)));
  const autoWidth = Math.max(40, Math.ceil(contentWidth + 2));
  const autoHeight = Math.max(lineHeight, Math.ceil(lines.length * lineHeight));
  const nextWidth = mode === 'auto' ? autoWidth : Math.max(1, Math.ceil(width || autoWidth));
  const nextHeight = mode === 'fixed' ? Math.max(1, Math.ceil(height || autoHeight)) : autoHeight;
  const overflow = mode === 'fixed' && (contentWidth > nextWidth || autoHeight > nextHeight);
  return { lines, width: nextWidth, height: nextHeight, lineHeight, contentWidth, overflow };
}

export function caretOffsetAtPoint(
  text: string,
  width: number,
  props: RenderTextProps,
  localX: number,
  localY: number,
  fontFamily = 'sans-serif',
): number {
  const layout = layoutText(text, width, 0, props, fontFamily);
  const lineIndex = Math.max(0, Math.min(layout.lines.length - 1, Math.floor(Math.max(0, localY) / layout.lineHeight)));
  const line = layout.lines[lineIndex] ?? '';
  let offset = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= line.length; i++) {
    const before = line.slice(0, i);
    const distance = Math.abs(measureWidth(before, props, fontFamily) - Math.max(0, localX));
    if (distance < best) { best = distance; offset = i; }
  }
  return layout.lines.slice(0, lineIndex).reduce((sum, item) => sum + item.length + 1, 0) + offset;
}
