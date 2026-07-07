import type { Course } from '../types';

export type CourseKind = NonNullable<Course['kind']>;

/** 单关卡课件类型（无预习、无小关卡）—— 作业 + 专题测评 + 复习课 */
export function isFlatLesson(kind?: CourseKind): boolean {
  return kind === 'homework' || kind === 'sEvaluation' || kind === 'review';
}

/** 纯视频课件类型 —— 复习课 */
export function isVideoOnlyCourse(kind?: CourseKind): boolean {
  return kind === 'review';
}

/** 项目目录后缀，决定 esBuild / preview-server lessons/ 下的目录名 */
export function lessonSuffix(kind?: CourseKind): string {
  if (kind === 'homework') return '_LessonHW';
  if (kind === 'sEvaluation') return '_LessonSSEVALUATION';
  if (kind === 'review') return '_LessonFXK';
  return '_LessonZK';
}

/** 主入口 JS 文件名（不含 .js）/ Main 类名 */
export function mainClassName(kind?: CourseKind): string {
  if (kind === 'homework') return 'LessonHW';
  if (kind === 'sEvaluation') return 'LessonSSEVALUATION';
  if (kind === 'review') return 'LessonFXK';
  return 'LessonZK';
}

/** 命名空间（资源路径前缀） */
export function namespace(kind?: CourseKind): string {
  if (kind === 'homework' || kind === 'sEvaluation') return 'game_hw';
  if (kind === 'review') return 'game_review';
  return 'game_lt';
}
