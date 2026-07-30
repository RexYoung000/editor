import type { Element } from '../types';
import { assetExport, assetSrc } from '../elements/builtinAssets';
import { DEFAULT_FONT_ID } from '../elements/fontLibrary';
import type { CourseKind } from '../utils/courseKind';

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

const textProps = (text: string, label: string): Record<string, unknown> => ({
  text,
  fontSize: 38,
  color: '#0d0d0d',
  leading: 24,
  wordWrap: true,
  align: 'left',
  valign: 'top',
  bold: false,
  italic: false,
  textSizingMode: 'fixed-width',
  mouseEnabled: false,
  fontLibraryId: DEFAULT_FONT_ID,
  fontLocalPath: '',
  _editorLabel: label,
});

const aquaQuestionLayoutElements: Element[] = [
  {
    id: 'aqua-background',
    type: 'NewImage',
    layaType: 'Image',
    name: 'QuestionLayoutAquaBackground',
    x: 2,
    y: 1,
    width: 1920,
    height: 1080,
    opacity: 1,
    rotation: 0,
    locked: true,
    actions: [],
    props: {
      skin: assetExport('preset.questionLayoutAqua.background'),
      mouseEnabled: false,
      _editorLabel: '青色背景',
    },
  },
  {
    id: 'aqua-question-number',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionNumber',
    x: 133,
    y: 75,
    width: 88,
    height: 62,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('Q1:', '题号'),
  },
  {
    id: 'aqua-question-title',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionTitle',
    x: 216,
    y: 76,
    width: 1136,
    height: 65,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('文本编辑', '题目'),
  },
  {
    id: 'aqua-question-body',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionBody',
    x: 150,
    y: 276,
    width: 1458,
    height: 295,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('文本编辑', '正文'),
  },
];

const blueQuestionLayoutElements: Element[] = [
  {
    id: 'blue-background',
    type: 'NewImage',
    layaType: 'Image',
    name: 'QuestionLayoutBlueBackground',
    x: 2,
    y: -1,
    width: 1920,
    height: 1080,
    opacity: 1,
    rotation: 0,
    locked: true,
    actions: [],
    props: {
      skin: assetExport('preset.questionLayoutBlue.background'),
      mouseEnabled: false,
      _editorLabel: '蓝色背景',
    },
  },
  {
    id: 'blue-title-paper',
    type: 'NewImage',
    layaType: 'Image',
    name: 'QuestionLayoutBlueTitlePaper',
    x: 193,
    y: 28,
    width: 1259,
    height: 180,
    opacity: 1,
    rotation: 0,
    locked: true,
    actions: [],
    props: {
      skin: assetExport('preset.questionLayoutBlue.titlePaper'),
      mouseEnabled: false,
      _editorLabel: '标题纸',
    },
  },
  {
    id: 'blue-question-number',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionNumber',
    x: 262,
    y: 66,
    width: 96,
    height: 108,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('Q1:', '题号'),
  },
  {
    id: 'blue-question-title',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionTitle',
    x: 365,
    y: 66,
    width: 1026,
    height: 137,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('文本编辑', '题目'),
  },
  {
    id: 'blue-question-body',
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: 'QuestionBody',
    x: 231,
    y: 346,
    width: 1458,
    height: 137,
    opacity: 1,
    rotation: 0,
    actions: [],
    props: textProps('文本编辑', '正文'),
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
  /** 未配置时保持历史行为，在所有课件类型中可见。 */
  courseKinds?: CourseKind[];
}

export interface PresetAvailability {
  courseKind: CourseKind;
  mode: 'stage' | 'subPage';
  supportsInternalPages: boolean;
}

export function isPresetTemplateAvailable(
  preset: PresetTemplate,
  availability: PresetAvailability,
): boolean {
  if (availability.mode === 'subPage' && preset.noSubPages) return false;
  if (!availability.supportsInternalPages && preset.editorModel === 'internal-pages') return false;
  return !preset.courseKinds || preset.courseKinds.includes(availability.courseKind);
}

export function filterPresetTemplates(
  presets: PresetTemplate[],
  availability: PresetAvailability,
): PresetTemplate[] {
  return presets.filter((preset) => isPresetTemplateAvailable(preset, availability));
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'internal-pages-v1',
    labelKey: 'presetInternalPages',
    thumbnail: '',
    elements: [],
    editorModel: 'internal-pages',
    defaultStageName: '内部页面关卡',
    defaultSubPageName: '内部页面关卡',
  },
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
  {
    id: 'question-layout-aqua-01',
    labelKey: 'presetQuestionLayoutAqua',
    thumbnail: assetSrc('preset.questionLayoutAqua.background'),
    elements: aquaQuestionLayoutElements,
    noSubPages: true,
    courseKinds: ['homework', 'sEvaluation'],
  },
  {
    id: 'question-layout-blue-01',
    labelKey: 'presetQuestionLayoutBlue',
    thumbnail: assetSrc('preset.questionLayoutBlue.background'),
    elements: blueQuestionLayoutElements,
    noSubPages: true,
    courseKinds: ['homework'],
  },
];
