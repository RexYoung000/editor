import type { Element } from '../types';

export type CourseType = 'normal' | 'homework' | 'sEvaluation' | 'review';

export type TemplateCourseCategory = 'classroom' | 'homework' | 'sEvaluation' | 'review';

export interface PresetTemplate {
  id: string;
  /** i18n translation key for the label. */
  labelKey: string;
  /** Thumbnail image URL from builtinAssets or a direct path. */
  thumbnail: string;
  /** Element list for this preset, cloned on instantiation. */
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
  /** Permanent presets ignore course type filtering, but still obey dialog/runtime capability checks. */
  alwaysVisible?: boolean;
}

/** Single source of truth for mapping persisted course type to template category. */
export const COURSE_TYPE_TO_TEMPLATE_CATEGORY: Record<CourseType, TemplateCourseCategory> = {
  normal: 'classroom',
  homework: 'homework',
  sEvaluation: 'sEvaluation',
  review: 'review',
};

export const COURSE_TYPE_LABEL_KEYS: Record<CourseType, string> = {
  normal: 'courseTypeNormal',
  homework: 'courseTypeHomework',
  sEvaluation: 'courseTypeSEvaluation',
  review: 'courseTypeReview',
};

export const TEMPLATE_CATEGORY_LABEL_KEYS: Record<TemplateCourseCategory, string> = {
  classroom: 'templateCategoryClassroom',
  homework: 'templateCategoryHomework',
  sEvaluation: 'templateCategorySEvaluation',
  review: 'templateCategoryReview',
};

export function templateCategoryForCourseType(type?: CourseType): TemplateCourseCategory | null {
  return type ? COURSE_TYPE_TO_TEMPLATE_CATEGORY[type] : null;
}

export function isPermanentPreset(preset: PresetTemplate): boolean {
  return Boolean(preset.alwaysVisible || preset.editorModel === 'internal-pages');
}

export function isPresetEligibleForDialog(
  preset: PresetTemplate,
  options: { mode: 'stage' | 'subPage'; supportsInternalPages: boolean },
): boolean {
  // Structural and runtime constraints always win; permanent presets only bypass course type filtering.
  if (options.mode === 'subPage' && preset.noSubPages) return false;
  if (!options.supportsInternalPages && preset.editorModel === 'internal-pages') return false;
  return true;
}

export function isPresetVisibleForCourseType(
  preset: PresetTemplate,
  courseType: CourseType | undefined,
  options: { mode: 'stage' | 'subPage'; supportsInternalPages: boolean },
): boolean {
  if (!isPresetEligibleForDialog(preset, options)) return false;
  if (isPermanentPreset(preset)) return true;
  const category = templateCategoryForCourseType(courseType);
  return Boolean(category && preset.category === category);
}
