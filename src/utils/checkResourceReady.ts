import type { Course, Stage } from '../types';

export type ResourceKind = 'video' | 'audio' | 'animation';

export interface ResourceMissingItem {
  kind: ResourceKind;
  stageKind: 'normal' | 'preview' | 'homework' | 'sEvaluation' | 'review';
  stageId: string;
  stageIndex: number;
  stageName: string;
  pageId: string;
  pageIndex: number;
  pageName: string;
  elementId: string;
  elementName: string;
}

/**
 * 收集所有"未上传资源"的组件:
 * - Video: props.videoUrl 为空
 * - SoundButton: props.soundPath 为空
 * - Spine: props.url 为空（spine 动画文件夹未选）
 */
export function findMissingResourceElements(course: Course): ResourceMissingItem[] {
  const items: ResourceMissingItem[] = [];
  const collectFrom = (stages: Stage[], kindFallback: 'normal' | 'preview' | 'homework' | 'sEvaluation' | 'review') => {
    stages.forEach((stage, si) => {
      stage.subPages.forEach((page, pi) => {
        page.elements.forEach((el) => {
          const props = el.props as Record<string, unknown> | undefined;
          let kind: ResourceKind | null = null;
          if (el.type === 'Video' && !String(props?.videoUrl ?? '').trim()) {
            kind = 'video';
          } else if (el.type === 'SoundButton' && !String(props?.soundPath ?? '').trim()) {
            kind = 'audio';
          } else if (el.type === 'Spine' && !String(props?.url ?? '').trim()) {
            kind = 'animation';
          }
          if (!kind) return;
          items.push({
            kind,
            stageKind: course.kind === 'homework' ? 'homework' : course.kind === 'sEvaluation' ? 'sEvaluation' : course.kind === 'review' ? 'review' : kindFallback,
            stageId: stage.id,
            stageIndex: si + 1,
            stageName: stage.name ?? '',
            pageId: page.id,
            pageIndex: pi + 1,
            pageName: page.name ?? '',
            elementId: el.id,
            elementName: el.name ?? el.id,
          });
        });
      });
    });
  };
  collectFrom(course.stages, 'normal');
  collectFrom(course.previewStages ?? [], 'preview');
  return items;
}

export const RESOURCE_STAGE_KIND_LABEL: Record<ResourceMissingItem['stageKind'], string> = {
  normal: '正课',
  preview: '预习',
  homework: '作业',
  sEvaluation: '专题测评',
  review: '复习课',
};

export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  video: '视频',
  audio: '音频',
  animation: '动画',
};
