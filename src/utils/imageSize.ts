/**
 * 发布工程时按图片真实像素尺寸判断大小图（决定写散图条目还是只走 atlas）。
 * 共享给 exportProject.ts 与 exportPreviewProject.ts 使用。
 */

import { readFileAsDataUrl } from './electronFs';
import { lookupBuiltinByExportPath } from '../elements/builtinAssets';

// 大图阈值：任一边 ≥ 此值则走散图，小图进 atlas
export const LARGE_IMAGE_THRESHOLD = 512;

const imageSizeCache = new Map<string, { w: number; h: number }>();

/** 给定原始资源 value（uploads / data:image / builtin / images/ 课件本地图），返回可加载的浏览器 URL；不可加载返回 null */
async function resolveImageUrl(rawValue: string, courseId: string): Promise<string | null> {
  if (rawValue.startsWith('data:image')) return rawValue;
  if (rawValue.startsWith('/uploads/') || rawValue.startsWith('/builtin/')) return rawValue;
  if (rawValue.startsWith('images/')) {
    return await readFileAsDataUrl(courseId, rawValue);
  }
  // 内置资源 exportPath 格式：game/image/xxx.png, game/okBtn/xxx.png 等
  if (lookupBuiltinByExportPath(rawValue)) {
    const asset = lookupBuiltinByExportPath(rawValue)!;
    return `/builtin/${asset.src}`;
  }
  return null;
}

/** 异步加载图片读取 naturalWidth/Height；超时或加载失败 reject */
function loadImageSize(url: string, timeout = 10000): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('timeout'));
    }, timeout);
    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      reject(new Error('load error'));
    };
    img.src = url;
  });
}

/**
 * 收集 resourceMap 里所有图片资源的真实像素尺寸。失败时抛错（包含失败的资源路径），调用方应中止发布。
 * 返回 Map<mapped 路径, {w, h}>。
 */
export async function collectImageSizes(
  resourceMap: Map<string, string>,
  courseId: string,
): Promise<Map<string, { w: number; h: number }>> {
  const result = new Map<string, { w: number; h: number }>();
  // 只处理目标在 image/ 下且不在 animation/ 下的图（animation/ 不进 atlas，无需判断）
  const candidates: { rawValue: string; mapped: string }[] = [];
  for (const [rawValue, mapped] of resourceMap) {
    if (typeof mapped !== 'string') continue;
    if (!/^game_(lt|hw|preview)\/image\//.test(mapped)) continue;
    if (mapped.includes('/animation/')) continue;
    candidates.push({ rawValue, mapped });
  }

  // 并发读取（限制并发数避免一次几百张图同时加载）
  const CONCURRENCY = 16;
  const errors: string[] = [];
  let idx = 0;
  async function worker() {
    while (idx < candidates.length) {
      const i = idx++;
      const { rawValue, mapped } = candidates[i];
      const cacheKey = `${courseId}|${rawValue}`;
      const cached = imageSizeCache.get(cacheKey);
      if (cached) { result.set(mapped, cached); continue; }
      try {
        const url = await resolveImageUrl(rawValue, courseId);
        if (!url) {
          errors.push(`无法解析图片来源：${mapped}（原始路径 ${rawValue}）`);
          continue;
        }
        const size = await loadImageSize(url);
        imageSizeCache.set(cacheKey, size);
        result.set(mapped, size);
      } catch (e) {
        errors.push(`无法读取图片尺寸：${mapped}（原始路径 ${rawValue}，原因：${(e as Error).message}）`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => worker()));

  if (errors.length > 0) {
    throw new Error(`发布中止：以下图片读取失败，请检查后重试\n\n${errors.join('\n')}`);
  }
  return result;
}

/** 判断 mapped 路径对应的图是否大图（用于 buildConfigJson 类似场景） */
export function isLargeImage(mapped: string, imageSizes: Map<string, { w: number; h: number }>): boolean {
  const size = imageSizes.get(mapped);
  if (!size) return false; // 没有尺寸信息按小图处理（一般不会出现，因为 collectImageSizes 失败已抛错）
  return size.w >= LARGE_IMAGE_THRESHOLD || size.h >= LARGE_IMAGE_THRESHOLD;
}
