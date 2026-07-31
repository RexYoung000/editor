/**
 * 从视频文件中提取第一帧画面，返回 data URL。
 * 用于编辑器中 Video 组件的缩略图显示。
 */

import { getCourseResourceUrl } from './electronFs';

// 缓存已提取的缩略图：带活动目录版本的资源 URL → dataUrl，避免跨副本复用旧画面。
const thumbnailCache = new Map<string, string | null>();

export function getCachedVideoThumbnail(videoUrl: string, courseId: string): string | null | undefined {
  return thumbnailCache.get(resolveVideoSrc(videoUrl, courseId));
}

export async function extractVideoFirstFrame(
  videoUrl: string,
  courseId: string,
): Promise<string | null> {
  const src = resolveVideoSrc(videoUrl, courseId);
  if (thumbnailCache.has(src)) return thumbnailCache.get(src) ?? null;

  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = src;

    // 等待 canplay：至少有一帧画面可渲染（loadeddata 可能 metadata-only 不触发）
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('video load timeout'));
      }, 10000);

      video.oncanplay = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('video load error'));
      };

      video.load();
    });

    // seek 到 4 秒截取画面
    video.currentTime = 4;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(() => resolve(), 1000);
    });

    // 画到 canvas 取 data URL
    const w = video.videoWidth || 480;
    const h = video.videoHeight || 270;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    video.src = ''; // 释放资源

    thumbnailCache.set(src, dataUrl);
    return dataUrl;
  } catch {
    thumbnailCache.set(src, null);
    return null;
  }
}

function resolveVideoSrc(videoUrl: string, courseId: string): string {
  return getCourseResourceUrl(courseId, videoUrl);
}
