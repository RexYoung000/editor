import type { Element } from '../types';
import { assetSrc } from '../elements/builtinAssets';

const videoElements: Element[] = [
  {
    id: 'el-video-bg',
    type: 'Video',
    layaType: 'Box',
    name: 'VideoBg',
    x: 0, y: 0,
    width: 1920, height: 1080,
    opacity: 1, rotation: 0,
    locked: true,
    actions: [],
    props: { videoUrl: '' },
  },
];

export interface PresetTemplate {
  id: string;
  /** i18n translation key for the label */
  labelKey: string;
  /** Thumbnail image URL (from builtinAssets or direct path) */
  thumbnail: string;
  /** Element list for this preset (cloned on instantiation) */
  elements: Element[];
  /** noSubPages = 该关卡不允许添加小关卡 */
  noSubPages?: boolean;
  /** frozen = 该关卡的画布不允许添加新组件 */
  frozen?: boolean;
  /** 创建关卡时的默认名字（不匹配 renumberAll 正则则不会被重编号覆盖） */
  defaultStageName?: string;
  defaultSubPageName?: string;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'video',
    labelKey: 'presetVideo',
    thumbnail: assetSrc('preset.video'),
    elements: videoElements,
    noSubPages: true,
    frozen: true,
    defaultStageName: '视频关卡',
    defaultSubPageName: '视频关卡',
  },
];