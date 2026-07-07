/**
 * 位图字体生成器。
 * 根据输入字符串和 TTF 字体，生成 Laya 兼容的 AngelCode BMFont 格式（.fnt + .png）。
 */

import { loadLibraryFont } from './fontLoader';
import { lookupFont, DEFAULT_FONT_ID } from '../elements/fontLibrary';

export interface BitmapFontResult {
  fntXml: string;   // AngelCode BMFont XML 格式的 .fnt 文件内容
  pngBase64: string; // 位图字体纹理的 base64 编码（data:image/png;base64,...）
}

interface CharEntry {
  id: number;       // Unicode 编码
  x: number;        // 在纹理图中的 x 位置
  y: number;        // 在纹理图中的 y 位置
  width: number;    // 字形宽度
  height: number;   // 字形高度
  xoffset: number;  // 水平偏移
  yoffset: number;  // 垂直偏移
  xadvance: number; // 水平步进距离
}

/**
 * 使用方正兰亭黑简体字体，根据传入字符串生成 BMFont (.fnt + .png)。
 *
 * @param chars  需要包含的字符字符串，如 "0123456789+-=()"
 * @param options 可选参数（字号、字体路径等）
 * @returns      { fntXml, pngBase64 } — AngelCode 格式的 fnt XML 和纹理 PNG
 */
export async function generateBitmapFont(
  chars: string,
  options?: {
    fontSize?: number;
    fontId?: string;
    lineHeight?: number;
    padding?: number;
    textureWidth?: number;
  },
): Promise<BitmapFontResult> {
  const fontSize = options?.fontSize ?? 50;
  const fontId = options?.fontId ?? DEFAULT_FONT_ID;
  const lineHeight = options?.lineHeight ?? fontSize;
  const padding = options?.padding ?? 2;
  const textureWidth = options?.textureWidth ?? 256;

  const entry = lookupFont(fontId);
  if (!entry) throw new Error(`generateBitmapFont: 字体 id 不存在 ${fontId}`);

  // 去重，保持顺序
  const uniqueChars = [...new Set(chars)];
  if (uniqueChars.length === 0) {
    throw new Error('generateBitmapFont: 字符串为空');
  }

  // 通过 fontLoader 统一加载,避免重复注册同名 FontFace
  const fontFace = await loadLibraryFont(fontId);
  if (!fontFace) throw new Error(`generateBitmapFont: 字体加载失败 ${fontId}`);

  // 用 Canvas 测量并渲染每个字符
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 1;
  measureCanvas.height = 1;
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = `${fontSize}px "${fontFace}"`;

  // 先测量所有字符的宽度和步进
  const charMetrics: Map<string, { width: number; xadvance: number }> = new Map();
  for (const ch of uniqueChars) {
    const m = measureCtx.measureText(ch);
    charMetrics.set(ch, {
      width: Math.ceil(m.width),
      xadvance: Math.ceil(m.width) + padding,
    });
  }

  // Shelf packing：将字形排列到纹理图上
  let shelfX = 0;
  let shelfY = 0;
  let shelfH = 0;
  let canvasW = textureWidth;
  let canvasH = 0;

  const entries: CharEntry[] = [];

  for (const ch of uniqueChars) {
    const metrics = charMetrics.get(ch)!;
    const glyphW = metrics.width + padding;
    const glyphH = fontSize + padding;

    // 当前行放不下，换行
    if (shelfX + glyphW > canvasW) {
      shelfY += shelfH;
      shelfX = 0;
      shelfH = 0;
    }

    entries.push({
      id: ch.charCodeAt(0),
      x: shelfX,
      y: shelfY,
      width: metrics.width,
      height: fontSize,
      xoffset: 0,
      yoffset: Math.floor(fontSize * 0.2), // 大致模拟 baseline 偏移
      xadvance: metrics.xadvance,
    });

    shelfX += glyphW;
    shelfH = Math.max(shelfH, glyphH);
    canvasH = Math.max(canvasH, shelfY + shelfH);
  }

  // canvasW 向上取整到最近的 2^n（Laya 纹理要求），canvasH 同理
  canvasW = nextPow2(canvasW);
  canvasH = nextPow2(Math.max(canvasH, fontSize));

  // 绘制到纹理 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize}px "${fontFace}"`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';

  for (const entry of entries) {
    const ch = String.fromCharCode(entry.id);
    ctx.fillText(ch, entry.x, entry.y);
  }

  // 生成 .fnt XML
  const fntXml = buildFntXml({
    fontFace: entry.fontFace,
    fontSize,
    lineHeight,
    canvasW,
    canvasH,
    entries,
  });

  // 导出 PNG base64
  const pngBase64 = canvas.toDataURL('image/png');

  return { fntXml, pngBase64 };
}

/** 生成位图字体并下载为 .fnt 和 .png 文件 */
export async function generateAndDownloadBitmapFont(
  chars: string,
  options?: {
    fontSize?: number;
    fontId?: string;
    lineHeight?: number;
    padding?: number;
    textureWidth?: number;
    outputName?: string; // 输出文件名前缀，默认 'font_hw'
  },
): Promise<BitmapFontResult> {
  const result = await generateBitmapFont(chars, options);
  const name = options?.outputName ?? 'font_hw';

  // 下载 .fnt
  const fntBlob = new Blob([result.fntXml], { type: 'text/xml' });
  downloadBlob(fntBlob, `${name}.fnt`);

  // 下载 .png
  const pngData = result.pngBase64.split(',')[1];
  const pngBlob = new Blob([Uint8Array.from(atob(pngData), c => c.charCodeAt(0))], { type: 'image/png' });
  downloadBlob(pngBlob, `${name}.png`);

  return result;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function nextPow2(v: number): number {
  let p = 1;
  while (p < v) p <<= 1;
  return Math.max(p, 4);
}

function buildFntXml(params: {
  fontFace: string;
  fontSize: number;
  lineHeight: number;
  canvasW: number;
  canvasH: number;
  entries: CharEntry[];
}): string {
  const { fontFace, fontSize, lineHeight, canvasW, canvasH, entries } = params;
  const pngFile = 'font_hw.png';

  const lines: string[] = [];
  lines.push(`<?xml version='1.0'?>`);
  lines.push(`   <font>`);
  lines.push(`       <info aa='1' size='${fontSize}' smooth='1' stretchH='100' bold='0' padding='0,0,0,0' spacing='0,0' charset='' italic='0' unicode='0' face='${fontFace}'/>`);
  lines.push(`       <common scaleW='${canvasW}' packed='0' pages='1' lineHeight='${lineHeight}' scaleH='${canvasH}' base='${Math.floor(fontSize * 0.7)}'/>`);
  lines.push(`       <pages>`);
  lines.push(`            <page id='0' file='${pngFile}'/>`);
  lines.push(`       </pages>`);
  lines.push(`        <chars count='${entries.length}'>`);

  for (const e of entries) {
    lines.push(`            <char xadvance='${e.xadvance}' x='${e.x}' chnl='0' yoffset='${e.yoffset}' y='${e.y}' xoffset='${e.xoffset}' id='${e.id}' page='0' height='${e.height}' width='${e.width}'/>`);
  }

  lines.push(`       </chars>`);
  lines.push(`   </font>`);
  return lines.join('\n');
}