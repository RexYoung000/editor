export function joinCoursePathForDisplay(parentPath: string, courseId: string): string {
  const trimmedParent = parentPath.replace(/[\\/]+$/, '');
  const separator = parentPath.includes('\\') && !parentPath.includes('/') ? '\\' : '/';
  return `${trimmedParent}${separator}${courseId}`;
}

export function formatCoursePathTail(coursePath: string, levelCount = 2): string {
  const parts = coursePath.split(/[\\/]+/).filter(Boolean);
  return parts.slice(-Math.max(1, levelCount)).join(' / ');
}
