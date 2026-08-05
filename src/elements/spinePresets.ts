import type { Element } from '../types';
import { assetExport, assetSrc } from './builtinAssets';

export interface SpinePreset {
  id: 'blank' | 'hand-click';
  label: string;
  description: string;
  thumbnail: string;
  size: { width: number; height: number };
  position?: { x: number; y: number };
  props: Record<string, unknown>;
}

const handClickUrl = assetExport('spine.handClick.sk');
const handClickAnimations = ['game_an1', 'game_an2'];

export const SPINE_PRESETS: SpinePreset[] = [
  {
    id: 'blank',
    label: '空白 Spine',
    description: '从本地文件夹或资源库导入',
    thumbnail: assetSrc('spinePlaceholder'),
    size: { width: 400, height: 400 },
    props: {},
  },
  {
    id: 'hand-click',
    label: '手指点击',
    description: '包含点击与移动引导动画',
    thumbnail: assetSrc('spine.handClick.thumbnail'),
    size: { width: 225, height: 428 },
    position: { x: 100, y: 100 },
    props: {
      url: handClickUrl,
      currAniName: handClickAnimations[0],
      stopAt: 0,
      isLoop: 'false',
      _animationList: handClickAnimations,
      _skFiles: [{ url: handClickUrl, animations: handClickAnimations }],
      _spinePreset: { id: 'hand-click' },
    },
  },
];

export function applySpinePreset(element: Element, preset: SpinePreset): Element {
  return {
    ...element,
    ...(preset.position ?? {}),
    ...preset.size,
    props: {
      ...element.props,
      ...preset.props,
    },
  };
}
