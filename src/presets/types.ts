import type { Element } from '../types';

export type CourseType = 'normal' | 'homework' | 'sEvaluation' | 'review';

export type TemplateCourseCategory = 'classroom' | 'homework' | 'sEvaluation' | 'review';

export interface PresetTemplate {
  id: string;
  /** i18n translation key for the label */
  labelKey: string;
  /** Thumbnail image URL (from builtinAssets or direct path) */
  thumbnail: string;
  /** Element list for this preset (cloned on instantiation) */
  elements: Element[];
  /** noSubPages = this preset creates a whole stage and cannot be inserted as a sub-page. */
  noSubPages?: boolean;
  /** frozen = the generated page is locked from adding new editor components. */
  frozen?: boolean;
  /** Default names used when this preset is instantiated. */
  defaultStageName?: string;
  defaultSubPageName?: string;
  editorModel?: 'internal-pages';
  /** Business templates are hidden unless this category matches the course type. */
  category?: TemplateCourseCategory;
  /** Permanent presets ignore course type filtering and stay visible for legacy courses. */
  alwaysVisible?: boolean;
}

/** Single source of truth for mapping persisted course type to template category. */
export const COURSE_TYPE_TO_TEMPLATE_CATEGORY: Record<CourseType, TemplateCourseCategory> = {
  normal: 'classroom',
  homework: 'homework',
  sEvaluation: 'sEvaluation',
  review: 'review',
};

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  normal: '预习 / 正课',
  homework: '作业',
  sEvaluation: '专题测评',
  review: '复习课',
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCourseCategory, string> = {
  classroom: '课堂授课模板',
  homework: '线上作业模板',
  sEvaluation: '专题测评模板',
  review: '复习课模板',
};

export function templateCategoryForCourseType(type?: CourseType): TemplateCourseCategory | null {
  return type ? COURSE_TYPE_TO_TEMPLATE_CATEGORY[type] : null;
}
