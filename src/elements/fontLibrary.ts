// 字体库元数据。字体下拉、loader、烘焙和导出都从这里读取。

export interface FontEntry {
  id: string;
  label: string;
  url: string;
  fontFace: string;
}

export const DEFAULT_FONT_ID = 'source-han-sans-cn.regular';
export const DEFAULT_FONT_FACE = 'ForgeSourceHanSansCNRegular';

export const FONT_LIBRARY: FontEntry[] = [
  {
    id: DEFAULT_FONT_ID,
    label: '思源黑体 Regular',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Regular.otf',
    fontFace: DEFAULT_FONT_FACE,
  },
  {
    id: 'source-han-sans-cn.extralight',
    label: '思源黑体 ExtraLight',
    url: '/builtin/runtime/fonts/SourceHanSansCN-ExtraLight.otf',
    fontFace: 'ForgeSourceHanSansCNExtraLight',
  },
  {
    id: 'source-han-sans-cn.light',
    label: '思源黑体 Light',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Light.otf',
    fontFace: 'ForgeSourceHanSansCNLight',
  },
  {
    id: 'source-han-sans-cn.normal',
    label: '思源黑体 Normal',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Normal.otf',
    fontFace: 'ForgeSourceHanSansCNNormal',
  },
  {
    id: 'source-han-sans-cn.medium',
    label: '思源黑体 Medium',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Medium.otf',
    fontFace: 'ForgeSourceHanSansCNMedium',
  },
  {
    id: 'source-han-sans-cn.bold',
    label: '思源黑体 Bold',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Bold.otf',
    fontFace: 'ForgeSourceHanSansCNBold',
  },
  {
    id: 'source-han-sans-cn.heavy',
    label: '思源黑体 Heavy',
    url: '/builtin/runtime/fonts/SourceHanSansCN-Heavy.otf',
    fontFace: 'ForgeSourceHanSansCNHeavy',
  },
  {
    id: 'arial.regular',
    label: 'Arial Regular',
    url: '/builtin/runtime/fonts/Arial-Regular.ttf',
    fontFace: 'ForgeArialRegular',
  },
  {
    id: 'arial.bold',
    label: 'Arial Bold',
    url: '/builtin/runtime/fonts/Arial-Bold.ttf',
    fontFace: 'ForgeArialBold',
  },
  {
    id: 'arial.italic',
    label: 'Arial Italic',
    url: '/builtin/runtime/fonts/Arial-Italic.ttf',
    fontFace: 'ForgeArialItalic',
  },
  {
    id: 'arial.bold-italic',
    label: 'Arial Bold Italic',
    url: '/builtin/runtime/fonts/Arial-BoldItalic.ttf',
    fontFace: 'ForgeArialBoldItalic',
  },
  {
    id: 'arial.black',
    label: 'Arial Black',
    url: '/builtin/runtime/fonts/Arial-Black.ttf',
    fontFace: 'ForgeArialBlack',
  },
  {
    id: 'simhei.regular',
    label: '黑体',
    url: '/builtin/runtime/fonts/SimHei.ttf',
    fontFace: 'ForgeSimHei',
  },
  {
    id: 'times-new-roman.bold',
    label: '罗马粗',
    url: '/builtin/runtime/fonts/罗马粗.ttf',
    fontFace: 'ForgeTimesNewRomanBold',
  },
  {
    id: 'times-new-roman.bold-italic',
    label: '罗马粗斜',
    url: '/builtin/runtime/fonts/罗马粗斜.ttf',
    fontFace: 'ForgeTimesNewRomanBoldItalic',
  },
  {
    id: 'times-new-roman.regular',
    label: '罗马细',
    url: '/builtin/runtime/fonts/罗马细.ttf',
    fontFace: 'ForgeTimesNewRomanRegular',
  },
  {
    id: 'times-new-roman.italic',
    label: '罗马细斜',
    url: '/builtin/runtime/fonts/罗马细斜.ttf',
    fontFace: 'ForgeTimesNewRomanItalic',
  },
];

const FONT_IDS = new Set(FONT_LIBRARY.map((font) => font.id));

const LEGACY_FONT_ID_MAP: Readonly<Record<string, string>> = {
  'paipeiyou.luomacu': 'times-new-roman.bold',
  'paipeiyou.luomacuxie': 'times-new-roman.bold-italic',
  'paipeiyou.luomaxi': 'times-new-roman.regular',
  'paipeiyou.luomaxixie': 'times-new-roman.italic',
};

export function lookupFont(id: string): FontEntry | undefined {
  return FONT_LIBRARY.find((font) => font.id === id);
}

/** 将旧业务字体 ID、缺失值和未知值统一归一化为当前有效字体 ID。 */
export function normalizeFontLibraryId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) return DEFAULT_FONT_ID;
  const migratedId = LEGACY_FONT_ID_MAP[id] ?? id;
  return FONT_IDS.has(migratedId) ? migratedId : DEFAULT_FONT_ID;
}
