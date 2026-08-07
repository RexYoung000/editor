import type { Course } from '../types';

export const PUBLISH_MANIFEST_SCHEMA = 1;

export type PublishScope = 'preview' | 'lesson' | 'homework' | 'evaluation' | 'review';
export type PublishProjectName = 'Game1_PREVIEW' | 'Game1_LT' | 'Game1_HW' | 'Game1_REVIEW';
export type PublishStep = 'preview' | 'target' | 'generate' | 'notify' | 'result';
export type PublishStepState = 'pending' | 'active' | 'complete' | 'failed';
export type PublishKnownResult = 'submitted' | 'success' | 'packaging-failed' | 'notification-pending';

export interface PreviewRecord {
  scope: PublishScope;
  projectName: PublishProjectName;
  directoryDigest: string;
  courseDigest: string;
  previewedAt: string;
  editorVersion: string;
  environmentVersion: string;
}

export interface PreviewConfirmation extends PreviewRecord {
  confirmedAt: string;
}

export interface PublishTargetRecord {
  baseUrl: string;
  parentPath: string;
  finalUrl: string;
  courseFolderName: string;
  workspacePath?: string;
  workspaceKind?: 'managed' | 'existing';
  svnRevision?: number;
}

export interface PublishResultRecord {
  status: PublishKnownResult;
  publishedAt: string;
  finalUrl: string;
  revision: number;
  projectNames: PublishProjectName[];
  projectUrls: string[];
  contentDigest: string;
  message?: string;
}

export interface PendingPackagingNotification {
  courseId: string;
  finalUrl: string;
  revision: number;
  projectUrls: string[];
  contentDigest: string;
  committedAt: string;
}

export interface CoursePublishState {
  confirmations: Partial<Record<PublishScope, PreviewConfirmation>>;
  latestPreviews?: Partial<Record<PublishScope, PreviewRecord>>;
  lastLocalSvnFolderPath?: string;
  target?: PublishTargetRecord;
  lastPublish?: PublishResultRecord;
  pendingNotification?: PendingPackagingNotification;
}

export interface ForgePublishManifest {
  schemaVersion: typeof PUBLISH_MANIFEST_SCHEMA;
  courseId: string;
  courseKind: NonNullable<Course['kind']>;
  courseFolderName: string;
  editorVersion: string;
  environmentVersion: string;
  generatedAt: string;
  contentDigest: string;
  projectTreeDigest: string;
  projects: Array<{
    name: PublishProjectName;
    digest: string;
  }>;
}

export interface PublishProgressStep {
  id: PublishStep;
  state: PublishStepState;
  detail?: string;
}

export const PUBLISH_STEPS: ReadonlyArray<{ id: PublishStep; label: string }> = [
  { id: 'preview', label: '确认预览' },
  { id: 'target', label: '确认目标' },
  { id: 'generate', label: '生成并提交' },
  { id: 'notify', label: '通知打包机' },
  { id: 'result', label: '发布结果' },
];

export function normalizeCourseKind(kind: Course['kind']): NonNullable<Course['kind']> {
  return kind ?? 'normal';
}

export function requiredPublishScopes(course: Course): PublishScope[] {
  if (course.kind === 'homework') return ['homework'];
  if (course.kind === 'sEvaluation') return ['evaluation'];
  if (course.kind === 'review') return ['review'];
  return (course.previewStages?.length ?? 0) > 0 ? ['preview', 'lesson'] : ['lesson'];
}

export function projectNameForScope(scope: PublishScope): PublishProjectName {
  if (scope === 'preview') return 'Game1_PREVIEW';
  if (scope === 'lesson') return 'Game1_LT';
  if (scope === 'review') return 'Game1_REVIEW';
  return 'Game1_HW';
}

export function scopeLabel(scope: PublishScope): string {
  if (scope === 'preview') return '预习';
  if (scope === 'lesson') return '正课';
  if (scope === 'homework') return '作业';
  if (scope === 'evaluation') return '专题测评';
  return '复习课';
}

export function projectNamesForCourse(course: Course): PublishProjectName[] {
  return requiredPublishScopes(course).map(projectNameForScope);
}

export type PublishPathResult =
  | { ok: true; normalizedParentPath: string; finalUrl: string }
  | { ok: false; error: string };

export function normalizePublishParentPath(
  rawPath: string,
  baseUrl: string,
  courseFolderName: string,
): PublishPathResult {
  const trimmed = rawPath.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
  if (!trimmed) return { ok: false, error: '请填写至少一级业务父目录' };
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(rawPath) || /^[a-z]:/i.test(rawPath) || rawPath.startsWith('/') || rawPath.startsWith('\\')) {
    return { ok: false, error: '这里只填写基础地址之后的业务父目录' };
  }
  const segments = trimmed.split('/').map((segment) => segment.trim());
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\0'))) {
    return { ok: false, error: '业务父目录包含无效路径段' };
  }
  if (segments.at(-1)?.toLocaleLowerCase() === courseFolderName.trim().toLocaleLowerCase()) {
    return { ok: false, error: '父目录末尾不能重复填写当前课件名称' };
  }
  const normalizedParentPath = segments.join('/');
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/g, '');
  if (!/^svn:\/\//i.test(normalizedBaseUrl)) {
    return { ok: false, error: '当前课型没有有效的 SVN 基础地址' };
  }
  return {
    ok: true,
    normalizedParentPath,
    finalUrl: `${normalizedBaseUrl}/${normalizedParentPath}/${encodeURIComponent(courseFolderName).replace(/%2F/gi, '/')}`,
  };
}

export function getConfirmedScopes(
  course: Course,
  state: CoursePublishState | null | undefined,
  currentDigests: Partial<Record<PublishProjectName, string>>,
  currentCourseDigests: Partial<Record<PublishScope, string>>,
  editorVersion: string,
  environmentVersion: string,
): { valid: PublishScope[]; invalid: PublishScope[] } {
  const valid: PublishScope[] = [];
  const invalid: PublishScope[] = [];
  for (const scope of requiredPublishScopes(course)) {
    const projectName = projectNameForScope(scope);
    const record = state?.confirmations[scope];
    if (
      record
      && record.projectName === projectName
      && record.directoryDigest === currentDigests[projectName]
      && record.courseDigest === currentCourseDigests[scope]
      && record.editorVersion === editorVersion
      && record.environmentVersion === environmentVersion
    ) {
      valid.push(scope);
    } else {
      invalid.push(scope);
    }
  }
  return { valid, invalid };
}

export function previewRecordInvalidReason(
  record: PreviewRecord | undefined,
  scope: PublishScope,
  courseDigest: string | undefined,
  editorVersion: string,
  environmentVersion: string | undefined,
): string | null {
  if (!record) return '需要先完成预览';
  if (record.projectName !== projectNameForScope(scope)) return '课件类型已变化，需要重新预览';
  if (record.courseDigest !== courseDigest) return '课件内容已变化，需要重新预览';
  if (record.editorVersion !== editorVersion) return '编辑器导出版本已变化，需要重新预览';
  if (record.environmentVersion !== environmentVersion) return '模板或运行资源已更新，需要重新预览';
  return null;
}

export function orderProjectUrls(
  projectNames: PublishProjectName[],
  projectUrls: Partial<Record<PublishProjectName, string>>,
): string[] {
  return [...projectNames]
    .sort((left, right) => Number(right === 'Game1_PREVIEW') - Number(left === 'Game1_PREVIEW'))
    .map((name) => projectUrls[name])
    .filter((value): value is string => Boolean(value));
}

export function createPublishManifest(params: {
  course: Course;
  courseFolderName: string;
  editorVersion: string;
  environmentVersion: string;
  contentDigest: string;
  projectTreeDigest: string;
  projectDigests: Record<PublishProjectName, string>;
  generatedAt?: string;
}): ForgePublishManifest {
  return {
    schemaVersion: PUBLISH_MANIFEST_SCHEMA,
    courseId: params.course.id,
    courseKind: normalizeCourseKind(params.course.kind),
    courseFolderName: params.courseFolderName,
    editorVersion: params.editorVersion,
    environmentVersion: params.environmentVersion,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    contentDigest: params.contentDigest,
    projectTreeDigest: params.projectTreeDigest,
    projects: projectNamesForCourse(params.course).map((name) => ({
      name,
      digest: params.projectDigests[name],
    })),
  };
}

export function initialPublishProgress(): PublishProgressStep[] {
  return PUBLISH_STEPS.map((step, index) => ({
    id: step.id,
    state: index === 0 ? 'active' : 'pending',
  }));
}

export function movePublishProgress(
  progress: PublishProgressStep[],
  nextStep: PublishStep,
  detail?: string,
): PublishProgressStep[] {
  const nextIndex = PUBLISH_STEPS.findIndex((step) => step.id === nextStep);
  return progress.map((step) => {
    const index = PUBLISH_STEPS.findIndex((definition) => definition.id === step.id);
    if (index < nextIndex) return { ...step, state: 'complete' };
    if (index === nextIndex) return { ...step, state: 'active', detail };
    return { ...step, state: 'pending', detail: undefined };
  });
}

export function failPublishProgress(
  progress: PublishProgressStep[],
  stepId: PublishStep,
  detail: string,
): PublishProgressStep[] {
  return progress.map((step) => step.id === stepId ? { ...step, state: 'failed', detail } : step);
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}

export async function sha256Text(value: string): Promise<string> {
  const hashText = window.electronAPI?.publishHashText;
  if (typeof hashText !== 'function') {
    throw new Error('当前客户端版本不支持课件发布，请安装最新版后重试');
  }
  const result = await hashText(value);
  if (!result.ok) throw new Error(result.error);
  return result.digest;
}

export async function contentDigestForCourse(course: Course): Promise<string> {
  return sha256Text(stableStringify(course));
}

function sharedCourseForFingerprint(course: Course): Omit<Course, 'stages' | 'previewStages'> {
  const { stages: _stages, previewStages: _previewStages, previewShrinked: _previewShrinked, normalShrinked: _normalShrinked, presetThumbnails: _presetThumbnails, ...shared } = course;
  return shared;
}

export async function contentDigestForScope(course: Course, scope: PublishScope): Promise<string> {
  const shared = sharedCourseForFingerprint(course);
  if (scope === 'preview') return sha256Text(stableStringify({ ...shared, previewStages: course.previewStages ?? [] }));
  return sha256Text(stableStringify({ ...shared, stages: course.stages }));
}

export async function contentDigestsForCourse(course: Course): Promise<Partial<Record<PublishScope, string>>> {
  const entries = await Promise.all(requiredPublishScopes(course).map(async (scope) => [scope, await contentDigestForScope(course, scope)] as const));
  return Object.fromEntries(entries);
}
