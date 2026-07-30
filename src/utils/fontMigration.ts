import type { Course } from '../types';
import { normalizeFontLibraryId } from '../elements/fontLibrary';
import { visitCourseElementPages } from './internalPages';

/** 打开课件时迁移所有文本字体，确保下一次保存写入当前有效 ID。 */
export function migrateCourseFontLibraryIds(course: Course): number {
  let migratedCount = 0;

  visitCourseElementPages(course, (page) => {
    for (const element of page.elements) {
      if (element.type !== 'NewTextArea') continue;
      const currentId = element.props?.fontLibraryId;
      const normalizedId = normalizeFontLibraryId(currentId);
      if (currentId === normalizedId) continue;
      element.props = { ...(element.props ?? {}), fontLibraryId: normalizedId };
      migratedCount += 1;
    }
  });

  return migratedCount;
}
