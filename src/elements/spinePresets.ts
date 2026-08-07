import type { Element } from '../types';
import { assetExport, assetSrc } from './builtinAssets';

export interface SpinePreset {
  id: 'blank' | 'hand-click' | 'hand-move';
  label: string;
  description: string;
  thumbnail: string;
  size: { width: number; height: number };
  position?: { x: number; y: number };
  props: Record<string, unknown>;
}

const handClickUrl = assetExport('spine.handClick.sk');
const handAnimations = ['game_an1', 'game_an2'];

function handPreset(
  id: 'hand-click' | 'hand-move',
  label: string,
  description: string,
  thumbnailId: 'spine.handClick.thumbnail' | 'spine.handMove.thumbnail',
  animation: 'game_an1' | 'game_an2',
): SpinePreset {
  return {
    id,
    label,
    description,
    thumbnail: assetSrc(thumbnailId),
    size: { width: 225, height: 428 },
    position: { x: 100, y: 100 },
    props: {
      url: handClickUrl,
      currAniName: animation,
      stopAt: 0,
      isLoop: 'false',
      _animationList: [animation],
      _skFiles: [{ url: handClickUrl, animations: handAnimations }],
      _spinePreset: { id },
    },
  };
}

export const SPINE_PRESETS: SpinePreset[] = [
  {
    id: 'blank',
    label: '空白 Spine',
    description: '从本地文件夹或资源库导入',
    thumbnail: assetSrc('spinePlaceholder'),
    size: { width: 400, height: 400 },
    props: {},
  },
  handPreset(
    'hand-click',
    '手指点击',
    '点击波纹引导动画',
    'spine.handClick.thumbnail',
    'game_an1',
  ),
  handPreset(
    'hand-move',
    '手指移动',
    '方向移动引导动画',
    'spine.handMove.thumbnail',
    'game_an2',
  ),
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
