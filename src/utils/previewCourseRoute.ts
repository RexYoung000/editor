const LESSON_PROJECT_PATTERN = /([^/]+_Lesson(?:ZK|HW|SSEVALUATION|FXK))/;
const LESSON_SUFFIX_PATTERN = /_Lesson(?:ZK|HW|SSEVALUATION|FXK)$/;
const PREVIEW_COURSE_SUFFIX = '_preview';

export interface CourseRouteCandidates {
  projectName: string;
  registryKeys: string[];
  fallbackProjectNames: string[];
  relativePath: string;
}

export function getCourseRouteCandidates(urlPath: string): CourseRouteCandidates | null {
  const cleanUrlPath = urlPath.replace(/[?#].*$/, '');
  const lessonMatch = cleanUrlPath.match(LESSON_PROJECT_PATTERN);
  if (!lessonMatch) return null;

  const projectName = lessonMatch[1];
  const lessonSuffix = projectName.match(LESSON_SUFFIX_PATTERN)?.[0];
  if (!lessonSuffix) return null;

  const courseId = projectName.slice(0, -lessonSuffix.length);
  const baseCourseId = courseId.endsWith(PREVIEW_COURSE_SUFFIX)
    ? courseId.slice(0, -PREVIEW_COURSE_SUFFIX.length)
    : courseId;
  const registryKeys = baseCourseId === courseId ? [courseId] : [courseId, baseCourseId];
  const afterProject = cleanUrlPath.slice(cleanUrlPath.indexOf(projectName) + projectName.length);

  return {
    projectName,
    registryKeys,
    fallbackProjectNames: registryKeys.map((key) => `${key}${lessonSuffix}`),
    relativePath: afterProject.startsWith('/') ? afterProject.slice(1) : afterProject,
  };
}
