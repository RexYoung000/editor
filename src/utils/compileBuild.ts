import { getCourseDirPath } from './electronFs';
import type { Course } from '../types';

export async function compileBuild(course: Course): Promise<{ ok: boolean; outputDir?: string; error?: string }> {
  if (!window.electronAPI) {
    return { ok: false, error: '编译发布仅支持 Electron 模式' };
  }

  const courseDir = getCourseDirPath(course.id);
  if (!courseDir) {
    return { ok: false, error: '未找到课件目录，请先保存课件' };
  }

  const teacherId = localStorage.getItem('forge_teacher_id') || '';

  return window.electronAPI.compileBuild({
    courseDir,
    courseId: course.id,
    kind: course.kind || 'normal',
    teacherId,
  });
}
