/**
 * 浏览器端 atlas 打包器。
 * 用 Canvas API 将多张图片合并为 sprite sheet，生成 Laya 兼容的 atlas JSON。
 */

const MAX_SIZE = 4096;

interface FrameData {
  frame: { x: number; y: number; w: number; h: number; idx: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number };
}

export interface PackedAtlas {
  atlasJson: string;
  pngBase64: string;
  prefix: string;
  filenames: string[];
  atlasPath: string;
  pngPath: string;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

export async function packAtlas(
  images: { name: string; url: string }[],
  prefix: string,
  atlasName: string,
): Promise<PackedAtlas | null> {
  if (images.length === 0) return null;

  // 加载所有图片
  const loaded: { name: string; img: HTMLImageElement }[] = [];
  for (const { name, url } of images) {
    try {
      const img = await loadImage(url);
      loaded.push({ name, img });
    } catch {
      console.warn(`[atlasPacker] Skip: ${name}`);
    }
  }
  if (loaded.length === 0) return null;

  // 按高度降序排列（shelf packing 效率更高）
  loaded.sort((a, b) => b.img.height - a.img.height);

  // Shelf packing
  let shelfX = 0;
  let shelfY = 0;
  let shelfH = 0;
  let canvasW = 0;
  let canvasH = 0;
  const positions: { name: string; img: HTMLImageElement; x: number; y: number }[] = [];

  for (const { name, img } of loaded) {
    if (shelfX + img.width > MAX_SIZE) {
      shelfY += shelfH + 1;
      shelfX = 0;
      shelfH = 0;
    }
    if (shelfY + img.height > MAX_SIZE) {
      console.warn(`[atlasPacker] Atlas overflow, skipping: ${name}`);
      continue;
    }
    positions.push({ name, img, x: shelfX, y: shelfY });
    shelfH = Math.max(shelfH, img.height);
    shelfX += img.width + 1;
    canvasW = Math.max(canvasW, shelfX);
    canvasH = Math.max(canvasH, shelfY + shelfH);
  }

  // 绘制到 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  const frames: Record<string, FrameData> = {};
  const filenames: string[] = [];

  for (const { name, img, x, y } of positions) {
    ctx.drawImage(img, x, y);
    frames[name] = {
      frame: { x, y, w: img.width, h: img.height, idx: 0 },
      sourceSize: { w: img.width, h: img.height },
      spriteSourceSize: { x: 0, y: 0 },
    };
    filenames.push(name);
  }

  const pngName = `${atlasName}.png`;
  const atlas = {
    frames,
    meta: { image: pngName, prefix },
  };

  const pngBase64 = canvas.toDataURL('image/png');

  return {
    atlasJson: JSON.stringify(atlas),
    pngBase64,
    prefix,
    filenames,
    atlasPath: `res/atlas/${prefix.replace(/\/$/, '')}.atlas`,
    pngPath: `res/atlas/${prefix.replace(/\/$/, '')}.png`,
  };
}

// Hash 计算（SHA-256 前 8 位）
export async function computeHash(data: ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer;
  } else {
    buffer = data;
  }
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
}

export function addHashToFilename(filename: string, hash: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(0, dot) + hash + filename.slice(dot) : filename + hash;
}

// 将 data:image URL 转为 ArrayBuffer
export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return res.arrayBuffer();
}
