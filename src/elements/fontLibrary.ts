// 字体库元数据。新增字体只改这一份配置,UI 下拉、loader、烘焙都从这里读取。
// fontFace 字段用 ASCII,与 TTF 文件名严格一致;同 family 重名时按 <name>-2.TTF 命名。

export type FontCategory = '派培优' | '豌豆口才' | '豌豆益智';

export interface FontEntry {
  id: string;          // 全局唯一 id,如 'paipeiyou.lantinghei'
  category: FontCategory;
  label: string;       // 下拉里显示给用户的中文名,如 '方正兰亭黑简体'
  url: string;         // 编辑器加载 TTF 的 public 相对路径
  fontFace: string;    // FontFace family name(注册到 document.fonts),必须 ASCII
}

export const FONT_LIBRARY: FontEntry[] = [
  // ─── 派培优 ───
  {
    id: 'paipeiyou.lantinghei',
    category: '派培优',
    label: '方正兰亭黑简体',
    url: '/builtin/runtime/fonts/方正兰亭黑简体.TTF',
    fontFace: 'FZLanTingHei',
  },
  {
    id: 'paipeiyou.lantingzhonghei',
    category: '派培优',
    label: '方正兰亭中黑简体',
    url: '/builtin/runtime/fonts/方正兰亭中黑简体.TTF',
    fontFace: 'FZLanTingZhongHei',
  },
  {
    id: 'paipeiyou.lantingtehei',
    category: '派培优',
    label: '方正兰亭特黑简体',
    url: '/builtin/runtime/fonts/方正兰亭特黑简体.TTF',
    fontFace: 'FZLanTingTeHei',
  },
  {
    id: 'paipeiyou.lantingcuhei',
    category: '派培优',
    label: '方正兰亭粗黑简体',
    url: '/builtin/runtime/fonts/方正兰亭粗黑简体.TTF',
    fontFace: 'FZLanTingCuHei',
  },
  {
    id: 'paipeiyou.lantingxianhei',
    category: '派培优',
    label: '方正兰亭纤黑简体',
    url: '/builtin/runtime/fonts/方正兰亭纤黑简体.TTF',
    fontFace: 'FZLanTingXianHei',
  },
  {
    id: 'paipeiyou.luomacu',
    category: '派培优',
    label: '罗马粗',
    url: '/builtin/runtime/fonts/罗马粗.ttf',
    fontFace: 'RomaBold',
  },
  {
    id: 'paipeiyou.luomacuxie',
    category: '派培优',
    label: '罗马粗斜',
    url: '/builtin/runtime/fonts/罗马粗斜.ttf',
    fontFace: 'RomaBoldItalic',
  },
  {
    id: 'paipeiyou.luomaxi',
    category: '派培优',
    label: '罗马细',
    url: '/builtin/runtime/fonts/罗马细.ttf',
    fontFace: 'RomaLight',
  },
  {
    id: 'paipeiyou.luomaxixie',
    category: '派培优',
    label: '罗马细斜',
    url: '/builtin/runtime/fonts/罗马细斜.ttf',
    fontFace: 'RomaLightItalic',
  },

  // ─── 豌豆口才 ───
  {
    id: 'koucai.lantingyuan',
    category: '豌豆口才',
    label: '方正兰亭圆简体',
    url: '/builtin/runtime/fonts/方正兰亭圆简体.TTF',
    fontFace: 'FZLanTingYuan',
  },
  {
    id: 'koucai.lantingyuanzhongcu',
    category: '豌豆口才',
    label: '方正兰亭圆简体中粗',
    url: '/builtin/runtime/fonts/方正兰亭圆简体中粗.TTF',
    fontFace: 'FZLanTingYuanZhongCu',
  },
  {
    id: 'koucai.lantingyuante',
    category: '豌豆口才',
    label: '方正兰亭圆简体特',
    url: '/builtin/runtime/fonts/方正兰亭圆简体特.TTF',
    fontFace: 'FZLanTingYuanTe',
  },
  {
    id: 'koucai.hupo',
    category: '豌豆口才',
    label: '方正琥珀简体',
    url: '/builtin/runtime/fonts/方正琥珀简体.TTF',
    fontFace: 'FZHuPo',
  },

  // ─── 豌豆益智 ───
  {
    id: 'yizhi.lantingyuan',
    category: '豌豆益智',
    label: '方正兰亭圆简体',
    url: '/builtin/runtime/fonts/方正兰亭圆简体.TTF',
    fontFace: 'FZLanTingYuan',
  },
  {
    id: 'yizhi.lantingyuanzhongcu',
    category: '豌豆益智',
    label: '方正兰亭圆简体中粗',
    url: '/builtin/runtime/fonts/方正兰亭圆简体中粗.TTF',
    fontFace: 'FZLanTingYuanZhongCu',
  },
  {
    id: 'yizhi.lantingyuante',
    category: '豌豆益智',
    label: '方正兰亭圆简体特',
    url: '/builtin/runtime/fonts/方正兰亭圆简体特.TTF',
    fontFace: 'FZLanTingYuanTe',
  },
  {
    id: 'yizhi.hupo',
    category: '豌豆益智',
    label: '方正琥珀简体',
    url: '/builtin/runtime/fonts/方正琥珀简体.TTF',
    fontFace: 'FZHuPo',
  },
];

// 类别顺序(下拉 optgroup 显示顺序)
export const FONT_CATEGORIES: FontCategory[] = ['派培优', '豌豆口才', '豌豆益智'];

export function lookupFont(id: string): FontEntry | undefined {
  return FONT_LIBRARY.find((f) => f.id === id);
}

/** 默认兜底字体 id(派培优兰亭黑) */
export const DEFAULT_FONT_ID = 'paipeiyou.lantinghei';
