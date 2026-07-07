import type { Course } from '../types';

const STORAGE_KEY = 'forge_courses';

export const saveCourse = (course: Course) => {
  const courses = getAllCourses();
  const index = courses.findIndex((c) => c.id === course.id);

  if (index !== -1) {
    courses[index] = course;
  } else {
    courses.push(course);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
};

export const getAllCourses = (): Course[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const getCourse = (id: string): Course | null => {
  const courses = getAllCourses();
  return courses.find((c) => c.id === id) || null;
};

export const deleteCourse = (id: string) => {
  const courses = getAllCourses();
  const filtered = courses.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// 导入导出功能已移至 coursePackage.ts
export { exportCourseAsJSON, importCourseFromJSON, exportCourseAsZip, importCourseFromZip } from './coursePackage';
