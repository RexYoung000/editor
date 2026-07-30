// 编辑器侧字体加载,所有 OTF/TTF 入口统一从这里走。
// - 库字体: 按 fontEntry.url 加载,fontFace 名直接用 entry.fontFace
// - 本地字体: 通过 Electron IPC 读 <courseDir>/<relPath> 转 dataUrl,fontFace 名 = 'LocalFont_' + md5前8位
// - resolveElementFont: 元素侧统一入口,优先本地→库→DEFAULT

import {
  lookupFont,
  DEFAULT_FONT_FACE,
  DEFAULT_FONT_ID,
  normalizeFontLibraryId,
} from '../elements/fontLibrary';
import { readFileAsDataUrl } from './electronFs';

const _libCache = new Map<string, Promise<string | null>>();   // libraryId → fontFace name(或 null)
const _localCache = new Map<string, Promise<string | null>>(); // 'courseId|relPath' → fontFace name

/** 加载库字体;成功返回注册后的 fontFace name,失败返回 null。重复调用零成本(Promise 缓存)。 */
export function loadLibraryFont(id: string): Promise<string | null> {
  const normalizedId = normalizeFontLibraryId(id);
  const cached = _libCache.get(normalizedId);
  if (cached) return cached;
  const p = (async () => {
    const entry = lookupFont(normalizedId);
    if (!entry) return null;
    try {
      const ff = new FontFace(entry.fontFace, `url(${entry.url})`);
      await ff.load();
      document.fonts.add(ff);
      return entry.fontFace;
    } catch (e) {
      console.warn('[fontLoader] loadLibraryFont failed:', normalizedId, e);
      return null;
    }
  })();
  _libCache.set(normalizedId, p);
  return p;
}

/** 加载本地字体(<courseDir>/<relPath>);成功返回 'LocalFont_<md5前8位>',失败返回 null。 */
export function loadLocalFont(courseId: string, relPath: string): Promise<string | null> {
  if (!courseId || !relPath) return Promise.resolve(null);
  const key = `${courseId}|${relPath}`;
  const cached = _localCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    try {
      const dataUrl = await readFileAsDataUrl(courseId, relPath);
      if (!dataUrl) return null;
      // relPath 形如 'images/fonts/<md5>.ttf',md5 即文件 stem
      const md5 = relPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
      if (!md5) return null;
      const fontFace = `LocalFont_${md5.slice(0, 8)}`;
      const ff = new FontFace(fontFace, `url(${dataUrl})`);
      await ff.load();
      document.fonts.add(ff);
      return fontFace;
    } catch (e) {
      console.warn('[fontLoader] loadLocalFont failed:', courseId, relPath, e);
      return null;
    }
  })();
  _localCache.set(key, p);
  return p;
}

/** 解析元素应使用的 fontFace name;优先本地,其次库,失败兜底 DEFAULT_FONT_ID 的 fontFace。 */
export async function resolveElementFont(
  courseId: string,
  fontLocalPath: string,
  fontLibraryId: string,
): Promise<string> {
  if (fontLocalPath) {
    const f = await loadLocalFont(courseId, fontLocalPath);
    if (f) return f;
  }
  const libraryFont = await loadLibraryFont(normalizeFontLibraryId(fontLibraryId));
  if (libraryFont) return libraryFont;
  const fallback = await loadLibraryFont(DEFAULT_FONT_ID);
  return fallback ?? DEFAULT_FONT_FACE;
}
