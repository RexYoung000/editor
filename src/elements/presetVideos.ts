import type { CourseKind } from '../utils/courseKind';

export type PresetVideoLanguage = 'cantonese' | 'english' | 'traditional-zh';

export interface PresetVideo {
  id: string;
  courseKind: Extract<CourseKind, 'normal' | 'homework' | 'sEvaluation' | 'review'>;
  language: PresetVideoLanguage;
  displayName: string;
  originalFileName: string;
  assetId: string;
  assetPath: string;
  md5: string;
  size: number;
}

export const PRESET_VIDEO_LANGUAGES: Array<{ id: PresetVideoLanguage; label: string }> = [
  { id: 'cantonese', label: '粤语' },
  { id: 'english', label: '英语' },
  { id: 'traditional-zh', label: '繁体中文（台湾）' },
];

const TRANSITION_NAMES = [
  '问题探索',
  '实践分析',
  '应用拓展',
  '策略分析',
  '方法进阶',
  '思维点拨',
  '迁移应用',
  '实践拓展',
  '工具应用',
  '提炼总结',
  '我是小老师',
] as const;

function normalVideo(
  language: PresetVideoLanguage,
  index: number,
  originalFileName: string,
  md5: string,
  size: number,
): PresetVideo {
  const serial = String(index).padStart(2, '0');
  return {
    id: `normal-${language}-transition-${serial}`,
    courseKind: 'normal',
    language,
    displayName: `通用转场 ${index}｜${TRANSITION_NAMES[index - 1]}`,
    originalFileName,
    assetId: `videoStage.normal.${language}.${serial}`,
    assetPath: `runtime/video-stage/normal/${language}/transition-${serial}.mp4`,
    md5,
    size,
  };
}

function reviewVideo(
  language: PresetVideoLanguage,
  kind: 'opening' | 'closing',
  originalFileName: string,
  md5: string,
  size: number,
): PresetVideo {
  return {
    id: `review-${language}-${kind}`,
    courseKind: 'review',
    language,
    displayName: kind === 'opening' ? '复习课片头' : '复习课片尾',
    originalFileName,
    assetId: `videoStage.review.${language}.${kind}`,
    assetPath: `runtime/video-stage/review/${language}/${kind}.mp4`,
    md5,
    size,
  };
}

export const PRESET_VIDEOS: PresetVideo[] = [
  normalVideo('cantonese', 1, '通用转场1-问题探索（YY）_batch.mp4', '1f411d499dcada0ebfdbf80d90388e54', 525024),
  normalVideo('cantonese', 2, '通用转场2-实践分析（YY）_batch.mp4', 'b26fe9662e55d50facb9e9a81ea55fd6', 518213),
  normalVideo('cantonese', 3, '通用转场3-应用拓展（YY）_batch.mp4', '4f92250d16e3d16a853a521549655c88', 532541),
  normalVideo('cantonese', 4, '通用转场4-策略分析（YY）_batch.mp4', '31d5ad1869b951f973bb6c4177e5d056', 524853),
  normalVideo('cantonese', 5, '通用转场5-方法进阶（YY）_batch.mp4', '98f0f80f1f10308c9ab5ba20eda35e8e', 513234),
  normalVideo('cantonese', 6, '通用转场6-思维点拨（YY）_batch.mp4', '4f8eeac17daf330f914fbc7e2175de8e', 516707),
  normalVideo('cantonese', 7, '通用转场7-迁移应用（YY）_batch.mp4', 'ef3decfa89b52c2245c3c84f9d066c4a', 525732),
  normalVideo('cantonese', 8, '通用转场8-实践拓展（YY）_batch.mp4', 'd251cfaa52cbc424a47de7bb6e6f07fb', 528442),
  normalVideo('cantonese', 9, '通用转场9-工具应用（YY）_batch.mp4', '59dabd41f6e5d2b39fa5c65335351351', 526261),
  normalVideo('cantonese', 10, '通用转场10-提炼总结（YY）_batch.mp4', '539774d852c5a8df6bb70d82d77c3fcc', 926134),
  normalVideo('cantonese', 11, '通用转场11-我是小老师（YY）_batch.mp4', '639a9d3d24939bf07b24ed8cd7eab1ef', 287231),
  normalVideo('english', 1, '通用转场1-问题探索（EN）_batch.mp4', 'cc4bff49188e374c7f8e9e224466a1ea', 520336),
  normalVideo('english', 2, '通用转场2-实践分析（EN）_batch.mp4', '8e09e75364d2d9798dc474dfe63cca76', 514990),
  normalVideo('english', 3, '通用转场3-应用拓展（EN）_batch.mp4', 'f90e2687632a259ea3563a9a611e4808', 576688),
  normalVideo('english', 4, '通用转场4-策略分析（EN）_batch.mp4', '80381baf62b8c57e636dc5d308f520d0', 550636),
  normalVideo('english', 5, '通用转场5-方法进阶（EN）_batch.mp4', 'af1363a44d512fe8868514fcc5329637', 506154),
  normalVideo('english', 6, '通用转场6-思维点拨（EN）_batch.mp4', '5d0888592ecd8312c9d50a5c4bdce9db', 506567),
  normalVideo('english', 7, '通用转场7-迁移应用（EN）_batch.mp4', '1e9e95f23367c5f05379203bc186665b', 573594),
  normalVideo('english', 8, '通用转场8-实践拓展（EN）_batch.mp4', '701ee8b3436de9350df529851b988a2a', 519389),
  normalVideo('english', 9, '通用转场9-工具应用（EN）_batch.mp4', '39cd548b904654301185df6d1b769e03', 523985),
  normalVideo('english', 10, '通用转场10-提炼总结（EN）_batch.mp4', 'fb5c76b3fe4a04b9e2ddca1395d74a0d', 998741),
  normalVideo('english', 11, '通用转场11-我是小老师（EN）_batch.mp4', '1d130b6f019275160bae472ec239fdd2', 289041),
  normalVideo('traditional-zh', 1, '通用转场1-问题探索_batch.mp4', '8632d33a6019dea91696c340d19e0ab8', 532083),
  normalVideo('traditional-zh', 2, '通用转场2-实践分析_batch.mp4', 'c55c0b3833cba3ac96b151fb08ce6fce', 523278),
  normalVideo('traditional-zh', 3, '通用转场3-应用拓展_batch.mp4', '4a64db278d95a76a25f37a53dedbb19c', 532744),
  normalVideo('traditional-zh', 4, '通用转场4-策略分析_batch.mp4', 'c56e219cb87fcc8b449a63b58959122a', 528275),
  normalVideo('traditional-zh', 5, '通用转场5-方法進階_batch.mp4', '13d679f7c67118c655dcb4e134fe70cd', 518829),
  normalVideo('traditional-zh', 6, '通用转场6-思維啟發_batch.mp4', '291f51a465726daa84e6127d46881926', 520463),
  normalVideo('traditional-zh', 7, '通用转场7-遷移應用_batch.mp4', '637c1fe16c3bca62ed516465923a9e80', 531613),
  normalVideo('traditional-zh', 8, '通用转场8-延伸實踐_batch.mp4', '5c947daa3c20c69e124de5950f123c51', 526359),
  normalVideo('traditional-zh', 9, '通用转场9-工具應用_batch.mp4', 'a4d5cfd91bf02544e1299ad6c939291e', 533037),
  normalVideo('traditional-zh', 10, '10-提炼总结_batch.mp4', 'f8dfc878051756aae59a80cb8a321f4d', 936357),
  normalVideo('traditional-zh', 11, '11我是小老师-新_batch.mp4', 'fc807cc1a0c65bae84c10d8937b72750', 292853),
  reviewVideo('cantonese', 'opening', '粤语复习课片头-2024_batch.mp4', '2e497466a067a248e88ed2bdf6271246', 4020098),
  reviewVideo('cantonese', 'closing', '粤语复习课片尾-2024_1_batch.mp4', 'a5e3372f01e5daadfd0eeba0b3ec7caa', 2398421),
  reviewVideo('english', 'opening', 'EN复习课片头-2024_batch.mp4', 'cbf7c7111713613a089205a021f1f1c3', 3030640),
  reviewVideo('english', 'closing', 'EN复习课片尾-2024_batch.mp4', '7f09c53a196249477a51e6ce69acc8f3', 2278229),
  reviewVideo('traditional-zh', 'opening', 'TW复习课片头-2026_batch.mp4', 'aabab9b8e1f9f19b038af9561d96b737', 3248247),
  reviewVideo('traditional-zh', 'closing', 'TW复习课片尾-2026_batch.mp4', '62d190669ac46d358a3c5463d190b169', 1908415),
];

export function presetVideoTabVisible(courseKind: CourseKind): boolean {
  // 作业和专题测评保留预设能力；当前没有注册资源时只隐藏 Tab。
  return PRESET_VIDEOS.some((video) => video.courseKind === courseKind);
}

export function filterPresetVideos(
  courseKind: CourseKind,
  language: PresetVideoLanguage | 'all',
  query: string,
): PresetVideo[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  return PRESET_VIDEOS.filter((video) => {
    if (video.courseKind !== courseKind) return false;
    if (language !== 'all' && video.language !== language) return false;
    if (!normalizedQuery) return true;
    return `${video.displayName}\n${video.originalFileName}`
      .toLocaleLowerCase('zh-CN')
      .includes(normalizedQuery);
  });
}
