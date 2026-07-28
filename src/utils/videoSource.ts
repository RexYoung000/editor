import type { PresetVideo } from '../elements/presetVideos';
import { getCourseDirPath } from './electronFs';

export const VIDEO_FILE_LIMIT = 50 * 1024 * 1024;

export type VideoSourceSelection =
  | { kind: 'preset'; video: PresetVideo }
  | { kind: 'local'; absolutePath: string; name: string; size: number }
  | { kind: 'library'; libraryPath: string; name: string; size: number; hash: string };

function assertMp4(name: string): void {
  if (!/\.mp4$/i.test(name)) throw new Error('视频关卡只支持 MP4');
}

function assertSize(size: number): void {
  if (!Number.isFinite(size) || size < 0) throw new Error('无法读取视频大小');
  if (size > VIDEO_FILE_LIMIT) throw new Error('视频不能超过 50MB');
}

export async function selectLocalVideo(): Promise<VideoSourceSelection | null> {
  const absolutePath = await window.electronAPI.selectFile?.({
    filters: [{ name: 'MP4 视频', extensions: ['mp4'] }],
  });
  if (!absolutePath) return null;
  const name = absolutePath.split(/[\\/]/).pop() ?? absolutePath;
  assertMp4(name);
  const stat = await window.electronAPI.statFile(absolutePath);
  if (!stat.ok) throw new Error(stat.error);
  assertSize(stat.size);
  return { kind: 'local', absolutePath, name, size: stat.size };
}

export async function selectLibraryVideo(libraryPath: string): Promise<VideoSourceSelection> {
  assertMp4(libraryPath);
  const response = await fetch(`/api/library/file-info?path=${encodeURIComponent(libraryPath)}`);
  const body = await response.json().catch(() => null) as
    | { ok?: boolean; hash?: string; size?: number; error?: string }
    | null;
  if (!response.ok || !body?.hash || typeof body.size !== 'number') {
    throw new Error(body?.error ?? `读取资源信息失败: HTTP ${response.status}`);
  }
  assertSize(body.size);
  return {
    kind: 'library',
    libraryPath,
    name: libraryPath.split('/').pop() ?? libraryPath,
    size: body.size,
    hash: body.hash,
  };
}

function encodedLibraryPath(libraryPath: string): string {
  return `/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function materializeVideoSelection(
  courseId: string,
  selection: VideoSourceSelection,
): Promise<string> {
  const courseDir = getCourseDirPath(courseId);
  if (!courseDir) throw new Error('尚未设置课件目录');

  const source = selection.kind === 'local'
    ? { kind: 'local' as const, path: selection.absolutePath }
    : selection.kind === 'preset'
      ? {
          kind: 'remote' as const,
          path: `/builtin/${selection.video.assetPath}`,
          expectedHash: selection.video.md5,
          expectedSize: selection.video.size,
        }
      : {
          kind: 'remote' as const,
          path: encodedLibraryPath(selection.libraryPath),
          expectedHash: selection.hash,
          expectedSize: selection.size,
        };

  const result = await window.electronAPI.materializeVideoToCourse({ courseDir, source });
  if (!result.ok) throw new Error(result.error);
  return result.relativePath;
}
