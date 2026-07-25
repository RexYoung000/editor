import type { Element } from '../types';
import type { CourseKind } from '../utils/courseKind';
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

const homeworkStage1Elements: Element[] = [
  {
    id: 'el-homework-stage1-bg',
    type: 'NewImage',
    layaType: 'Image',
    name: 'NewImage_1',
    x: 2, y: 1,
    width: 1920, height: 1080,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      skin: assetSrc('preset.s8Demo01Hw.bg'),
      _naturalWidth: 1920,
      _naturalHeight: 1080,
    },
  },
  {
    id: 'el-homework-stage1-q',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_1',
    x: 133, y: 75,
    width: 88, height: 62,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: 'Q1:',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-homework-stage1-title',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_2',
    x: 216, y: 76,
    width: 1136, height: 65,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-homework-stage1-body',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_3',
    x: 150, y: 276,
    width: 1458, height: 295,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
];

const homeworkStage2Elements: Element[] = [
  {
    id: 'el-homework-stage2-bg',
    type: 'NewImage',
    layaType: 'Image',
    name: 'NewImage_2',
    x: 2, y: -1,
    width: 1920, height: 1080,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      skin: assetSrc('preset.s4Demo01Hw.bg'),
      _naturalWidth: 1920,
      _naturalHeight: 1080,
    },
  },
  {
    id: 'el-homework-stage2-banner',
    type: 'NewImage',
    layaType: 'Image',
    name: 'NewImage_3',
    x: 193, y: 28,
    width: 1259, height: 180,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      skin: assetSrc('preset.s4Demo01Hw.banner'),
      _naturalWidth: 1841,
      _naturalHeight: 520,
    },
  },
  {
    id: 'el-homework-stage2-q',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_1',
    x: 262, y: 66,
    width: 96, height: 108,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: 'Q3：',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-homework-stage2-title',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_2',
    x: 365, y: 66,
    width: 1026, height: 137,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑2',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-homework-stage2-body',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_3',
    x: 231, y: 346,
    width: 1458, height: 137,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
];

const sEvaluationStage1Elements: Element[] = [
  {
    id: 'el-sevaluation-stage1-bg',
    type: 'NewImage',
    layaType: 'Image',
    name: 'NewImage_1',
    x: -2, y: 0,
    width: 1920, height: 1080,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      skin: assetSrc('preset.s8SseTest01.bg'),
      _naturalWidth: 1920,
      _naturalHeight: 1080,
    },
  },
  {
    id: 'el-sevaluation-stage1-q',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_1',
    x: 125, y: 72,
    width: 96, height: 60,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: 'Q1：',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-sevaluation-stage1-title',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_2',
    x: 206, y: 72,
    width: 1163, height: 67,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
  },
  {
    id: 'el-sevaluation-stage1-body',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'NewTextArea_3',
    x: 125, y: 268,
    width: 1458, height: 285,
    opacity: 1, rotation: 0,
    actions: [],
    props: {
      text: '文本编辑',
      fontSize: 38,
      color: '#0d0d0d',
      leading: 24,
      wordWrap: true,
      align: 'left',
      valign: 'top',
      mouseEnabled: false,
      fontLibraryId: 'paipeiyou.lantinghei',
      fontLocalPath: '',
    },
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
  editorModel?: 'internal-pages';
  /** 可用于哪些课件类型；为空表示全部可用 */
  courseKinds?: CourseKind[];
}

export function filterPresetTemplates(
  presets: PresetTemplate[] | undefined,
  options: {
    courseKind?: CourseKind;
    mode: 'stage' | 'subPage';
    supportsInternalPages?: boolean;
  },
): PresetTemplate[] {
  const courseKind = options.courseKind ?? 'normal';
  return (presets ?? []).filter((preset) => {
    if (options.mode !== 'stage' && preset.noSubPages) return false;
    if (!options.supportsInternalPages && preset.editorModel === 'internal-pages') return false;
    if (preset.courseKinds && preset.courseKinds.length > 0 && !preset.courseKinds.includes(courseKind)) return false;
    return true;
  });
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'internal-pages-v1',
    labelKey: 'presetInternalPages',
    thumbnail: '',
    elements: [],
    editorModel: 'internal-pages',
    courseKinds: ['normal', 'homework', 'sEvaluation'],
    defaultStageName: '关卡 0',
    defaultSubPageName: '小关卡 0-0',
  },
  {
    id: 'video',
    labelKey: 'presetVideo',
    thumbnail: assetSrc('preset.video'),
    elements: videoElements,
    noSubPages: true,
    frozen: true,
    courseKinds: ['review'],
    defaultStageName: '视频关卡',
    defaultSubPageName: '视频关卡',
  },
  {
    id: 'homework-stage-1',
    labelKey: 'presetHomeworkStage1',
    thumbnail: assetSrc('preset.s8Demo01Hw.bg'),
    elements: homeworkStage1Elements,
    defaultStageName: '作业关卡 1',
    defaultSubPageName: '作业关卡 1',
    courseKinds: ['homework'],
  },
  {
    id: 'homework-stage-2',
    labelKey: 'presetHomeworkStage2',
    thumbnail: assetSrc('preset.s4Demo01Hw.bg'),
    elements: homeworkStage2Elements,
    defaultStageName: '作业关卡 2',
    defaultSubPageName: '作业关卡 2',
    courseKinds: ['homework'],
  },
  {
    id: 'sevaluation-stage-1',
    labelKey: 'presetSEvaluationStage1',
    thumbnail: assetSrc('preset.s8SseTest01.bg'),
    elements: sEvaluationStage1Elements,
    defaultStageName: '随堂测评关卡 1',
    defaultSubPageName: '随堂测评关卡 1',
    courseKinds: ['sEvaluation'],
  },
];
