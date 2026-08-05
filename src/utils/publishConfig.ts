import type { Course } from '../types';
import { normalizeCourseKind } from './coursePublishing';

export type PublishSvnConfig = Record<NonNullable<Course['kind']>, string>;

export interface PublishConfig {
  svn: PublishSvnConfig;
  environmentVersion: string;
}

let cachedConfig: PublishConfig | null = null;

export async function loadPublishConfig(): Promise<PublishConfig> {
  if (cachedConfig) return cachedConfig;
  const baseUrl = await window.electronAPI.getServerUrl() || import.meta.env.VITE_API_BASE || '';
  const url = `${baseUrl.replace(/\/+$/, '')}/api/publish-config`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('无法读取 SVN 发布配置，请检查编辑器服务器连接');
  const value = await response.json() as Partial<PublishConfig>;
  const keys: Array<NonNullable<Course['kind']>> = ['normal', 'homework', 'sEvaluation', 'review'];
  for (const key of keys) {
    if (!value.svn?.[key] || !String(value.svn[key]).startsWith('svn://')) {
      throw new Error(`课件类型 ${key} 缺少有效的 SVN 基础地址`);
    }
  }
  if (!value.environmentVersion) throw new Error('发布服务器缺少模板与运行资源版本');
  cachedConfig = value as PublishConfig;
  return cachedConfig;
}

export async function baseSvnUrlForCourse(course: Course): Promise<string> {
  const config = await loadPublishConfig();
  return config.svn[normalizeCourseKind(course.kind)];
}

export function resetPublishSvnConfigForTests(): void {
  cachedConfig = null;
}
