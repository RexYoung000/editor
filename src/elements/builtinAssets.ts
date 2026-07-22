/**
 * 内置资源清单。
 *
 * 目录约定：
 *   forge/public/builtin/
 *   ├── editor/            ← 仅编辑器使用，不参与发布（占位图、图标等）
 *   └── runtime/            ← 既给编辑器看，也复制到发布包；子目录结构 = 发布后在 lesson 内的相对路径
 *       └── game/inputImg/...
 *
 * 添加一个新内置资源 = 把文件放进对应目录 + 在 BUILTIN_ASSETS 加一行。
 * elementMeta / 其它代码不要直接写资源路径字符串，而要用 assetExport(id) / assetSrc(id)。
 */

export interface BuiltinAsset {
  /** 唯一 ID，引用时用（如 'klInput.bg'） */
  id: string;
  /** 相对 forge/public/builtin/ 的路径（决定编辑器从哪个 URL 加载，也决定发布时去哪复制源） */
  src: string;
  /** 发布到课件包后的相对路径（写进 LessonZK.js 的 skin/fontClipSkin 等字段）；
   *  undefined 表示该资源仅编辑器使用，不打进发布包 */
  exportPath?: string;
}

export const BUILTIN_ASSETS: BuiltinAsset[] = [
  // KlInputImage 三态背景 + 字体图（编辑器和运行时都需要）
  { id: 'klInput.bg',          src: 'runtime/game/inputImg/img_1.png',     exportPath: 'game/inputImg/img_1.png' },
  { id: 'klInput.active',      src: 'runtime/game/inputImg/img_2.png',     exportPath: 'game/inputImg/img_2.png' },
  { id: 'klInput.wrong',       src: 'runtime/game/inputImg/img_3.png',     exportPath: 'game/inputImg/img_3.png' },
  { id: 'klInput.font',        src: 'runtime/game/inputImg/jp_num40.png',  exportPath: 'game/inputImg/jp_num40.png' },
  // 新组件：确定按钮（旧路径保留兼容）
  { id: 'btn.confirm',         src: 'runtime/game/image/btn_qd2.png',      exportPath: 'game/image/btn_qd2.png' },
  // 封面底图（编辑器和运行时都需要）
  { id: 'cover.bg',           src: 'runtime/game/image/img_fm.png',    exportPath: 'game/image/img_fm.png' },
  { id: 'klInput.placeholder', src: 'editor/kl-input-placeholder.png' },
  // 视频占位图（编辑器专用，灰色矩形 + 播放图标）
  { id: 'videoPlaceholder',     src: 'editor/video-placeholder.png' },
  // Spine 骨骼动画占位图（编辑器专用，先复用 video 占位，后续可替换为专用图）
  { id: 'spinePlaceholder',     src: 'editor/video-placeholder.png' },
  { id: 'dragObjPlaceholder',    src: 'editor/container-box-placeholder.png' },
  { id: 'dropObjPlaceholder',    src: 'editor/container-box-placeholder.png' },
  // 音频组件占位图/默认外观
  { id: 'soundPlaceholder',     src: 'editor/img_lb.png', exportPath: 'game/image/img_lb.png' },

  // 连线题：默认连线皮肤 + 默认错误提示皮肤
  { id: 'matching.line',        src: 'runtime/game/matching/line.png',      exportPath: 'game/matching/line.png' },
  { id: 'matching.wrongLine',   src: 'runtime/game/matching/wrongLine.png', exportPath: 'game/matching/wrongLine.png' },

  // 预设关卡模板缩略图（仅编辑器使用，不发布）
  { id: 'preset.noInteraction',  src: 'editor/preset-no-interaction.png' },
  { id: 'preset.interactive',   src: 'editor/preset-interactive.png' },
  { id: 'preset.cover',         src: 'editor/preset-cover.png' },
  { id: 'preset.levelFour',     src: 'editor/preset-level-1-4.png' },
  { id: 'preset.fm',            src: 'editor/img_fm.png' },
  { id: 'preset.img1',          src: 'editor/img_1.png' },
  { id: 'preset.img2',          src: 'editor/img_2.png' },
  { id: 'preset.video',         src: 'editor/video-placeholder.png' },

  // 键盘预设1：数字键盘（参考 LessonZK 模板）
  { id: 'keyboard.preset1.bg',          src: 'runtime/game/jpL11/jp_3.png',       exportPath: 'game/jpL11/jp_3.png' },
  { id: 'keyboard.preset1.keyNormal',   src: 'runtime/game/jpL11/jp_4.png',       exportPath: 'game/jpL11/jp_4.png' },
  { id: 'keyboard.preset1.keyActive',   src: 'runtime/game/jpL11/jp_5.png',       exportPath: 'game/jpL11/jp_5.png' },
  { id: 'keyboard.preset1.numFont',     src: 'runtime/game/jpL11/num.png',        exportPath: 'game/jpL11/num.png' },
  { id: 'keyboard.preset1.delIcon',     src: 'runtime/game/jpL11/img_delete.png', exportPath: 'game/jpL11/img_delete.png' },
  // 仅编辑器用的预设缩略图（用户后续替换；目前借用 klInput 占位图避免 404）
  { id: 'keyboard.preset1.thumbnail',   src: 'editor/keyboard-preset1-thumb.png' },
  // 键盘预设2：数字+运算符键盘（使用 jpL8 皮肤资源）
  { id: 'keyboard.preset2.bg',          src: 'runtime/game/jpL8/jp_bg.png',       exportPath: 'game/jpL8/jp_bg.png' },
  { id: 'keyboard.preset2.keyNormal',   src: 'runtime/game/jpL8/jp_normal.png',   exportPath: 'game/jpL8/jp_normal.png' },
  { id: 'keyboard.preset2.keyActive',   src: 'runtime/game/jpL8/jp_active.png',   exportPath: 'game/jpL8/jp_active.png' },
  { id: 'keyboard.preset2.numFont',     src: 'runtime/game/jpL8/jp_szt.png',      exportPath: 'game/jpL8/jp_szt.png' },
  { id: 'keyboard.preset2.delIcon',     src: 'runtime/game/jpL8/img_delete.png',  exportPath: 'game/jpL8/img_delete.png' },
  { id: 'keyboard.preset2.thumbnail',   src: 'editor/keyboard-preset2-thumb.png' },

  // v1.2 数学输入键盘：沿用 SDK KeyBoard41UI 的黄色主题资源
  { id: 'keyboard.math.bg',             src: 'runtime/game/mathKeyboard/yellow/img_jpk.png',     exportPath: 'game/mathKeyboard/yellow/img_jpk.png' },
  { id: 'keyboard.math.keyNormal',      src: 'runtime/game/mathKeyboard/yellow/img_anniu1a.png', exportPath: 'game/mathKeyboard/yellow/img_anniu1a.png' },
  { id: 'keyboard.math.keyActive',      src: 'runtime/game/mathKeyboard/yellow/img_anniu1b.png', exportPath: 'game/mathKeyboard/yellow/img_anniu1b.png' },
  { id: 'keyboard.math.wideNormal',     src: 'runtime/game/mathKeyboard/yellow/img_anniu2a.png', exportPath: 'game/mathKeyboard/yellow/img_anniu2a.png' },
  { id: 'keyboard.math.wideActive',     src: 'runtime/game/mathKeyboard/yellow/img_anniu2b.png', exportPath: 'game/mathKeyboard/yellow/img_anniu2b.png' },
  { id: 'keyboard.math.numNormal',      src: 'runtime/game/mathKeyboard/yellow/img_shuzi1.png',  exportPath: 'game/mathKeyboard/yellow/img_shuzi1.png' },
  { id: 'keyboard.math.numActive',      src: 'runtime/game/mathKeyboard/yellow/img_shuzi2.png',  exportPath: 'game/mathKeyboard/yellow/img_shuzi2.png' },
  { id: 'keyboard.math.delIcon',        src: 'runtime/game/mathKeyboard/yellow/img_delete1.png',  exportPath: 'game/mathKeyboard/yellow/img_delete1.png' },
  { id: 'keyboard.math.delActive',      src: 'runtime/game/mathKeyboard/yellow/img_delete2.png',  exportPath: 'game/mathKeyboard/yellow/img_delete2.png' },
  { id: 'keyboard.math.arrow',          src: 'runtime/game/mathKeyboard/yellow/img_ydjt.png',    exportPath: 'game/mathKeyboard/yellow/img_ydjt.png' },
  { id: 'keyboard.math.fractionNormal', src: 'runtime/game/mathKeyboard/img_fraction1.png', exportPath: 'game/mathKeyboard/img_fraction1.png' },
  { id: 'keyboard.math.fractionActive', src: 'runtime/game/mathKeyboard/img_fraction2.png', exportPath: 'game/mathKeyboard/img_fraction2.png' },
  { id: 'keyboard.math.fractionLine',   src: 'runtime/game/mathKeyboard/img_line.png',      exportPath: 'game/mathKeyboard/img_line.png' },
  { id: 'keyboard.math.inputFont',      src: 'runtime/game/mathKeyboard/img_w2Input.png',   exportPath: 'game/mathKeyboard/img_w2Input.png' },
  { id: 'keyboard.decimal.thumbnail',   src: 'editor/keyboard-decimal-thumb.png' },
  { id: 'keyboard.fraction.thumbnail',  src: 'editor/keyboard-fraction-thumb.png' },

  // ─── 标签图资源（标签图组件 NewTabImg 的内置皮肤库）───
  { id: 'tabImg.img_bc',      src: 'runtime/game/tabImg/img_bc.png',      exportPath: 'game/tabImg/img_bc.png' },
  { id: 'tabImg.img_gg_1',    src: 'runtime/game/tabImg/img_gg_1.png',    exportPath: 'game/tabImg/img_gg_1.png' },
  { id: 'tabImg.img_gg_2',    src: 'runtime/game/tabImg/img_gg_2.png',    exportPath: 'game/tabImg/img_gg_2.png' },
  { id: 'tabImg.img_gg_3',    src: 'runtime/game/tabImg/img_gg_3.png',    exportPath: 'game/tabImg/img_gg_3.png' },
  { id: 'tabImg.img_gg_4',    src: 'runtime/game/tabImg/img_gg_4.png',    exportPath: 'game/tabImg/img_gg_4.png' },
  { id: 'tabImg.img_gg_5',    src: 'runtime/game/tabImg/img_gg_5.png',    exportPath: 'game/tabImg/img_gg_5.png' },
  { id: 'tabImg.img_gg_6',    src: 'runtime/game/tabImg/img_gg_6.png',    exportPath: 'game/tabImg/img_gg_6.png' },
  { id: 'tabImg.img_kqrs',    src: 'runtime/game/tabImg/img_kqrs.png',    exportPath: 'game/tabImg/img_kqrs.png' },
  { id: 'tabImg.img_lt_1',    src: 'runtime/game/tabImg/img_lt_1.png',    exportPath: 'game/tabImg/img_lt_1.png' },
  { id: 'tabImg.img_lt_10',   src: 'runtime/game/tabImg/img_lt_10.png',   exportPath: 'game/tabImg/img_lt_10.png' },
  { id: 'tabImg.img_lt_10_1', src: 'runtime/game/tabImg/img_lt_10_1.png', exportPath: 'game/tabImg/img_lt_10_1.png' },
  { id: 'tabImg.img_lt_10_2', src: 'runtime/game/tabImg/img_lt_10_2.png', exportPath: 'game/tabImg/img_lt_10_2.png' },
  { id: 'tabImg.img_lt_10_3', src: 'runtime/game/tabImg/img_lt_10_3.png', exportPath: 'game/tabImg/img_lt_10_3.png' },
  { id: 'tabImg.img_lt_1_1',  src: 'runtime/game/tabImg/img_lt_1_1.png',  exportPath: 'game/tabImg/img_lt_1_1.png' },
  { id: 'tabImg.img_lt_1_2',  src: 'runtime/game/tabImg/img_lt_1_2.png',  exportPath: 'game/tabImg/img_lt_1_2.png' },
  { id: 'tabImg.img_lt_1_3',  src: 'runtime/game/tabImg/img_lt_1_3.png',  exportPath: 'game/tabImg/img_lt_1_3.png' },
  { id: 'tabImg.img_lt_1_4',  src: 'runtime/game/tabImg/img_lt_1_4.png',  exportPath: 'game/tabImg/img_lt_1_4.png' },
  { id: 'tabImg.img_lt_2',    src: 'runtime/game/tabImg/img_lt_2.png',    exportPath: 'game/tabImg/img_lt_2.png' },
  { id: 'tabImg.img_lt_2_1',  src: 'runtime/game/tabImg/img_lt_2_1.png',  exportPath: 'game/tabImg/img_lt_2_1.png' },
  { id: 'tabImg.img_lt_2_2',  src: 'runtime/game/tabImg/img_lt_2_2.png',  exportPath: 'game/tabImg/img_lt_2_2.png' },
  { id: 'tabImg.img_lt_2_3',  src: 'runtime/game/tabImg/img_lt_2_3.png',  exportPath: 'game/tabImg/img_lt_2_3.png' },
  { id: 'tabImg.img_lt_2_4',  src: 'runtime/game/tabImg/img_lt_2_4.png',  exportPath: 'game/tabImg/img_lt_2_4.png' },
  { id: 'tabImg.img_lt_3',    src: 'runtime/game/tabImg/img_lt_3.png',    exportPath: 'game/tabImg/img_lt_3.png' },
  { id: 'tabImg.img_lt_3_1',  src: 'runtime/game/tabImg/img_lt_3_1.png',  exportPath: 'game/tabImg/img_lt_3_1.png' },
  { id: 'tabImg.img_lt_3_2',  src: 'runtime/game/tabImg/img_lt_3_2.png',  exportPath: 'game/tabImg/img_lt_3_2.png' },
  { id: 'tabImg.img_lt_3_3',  src: 'runtime/game/tabImg/img_lt_3_3.png',  exportPath: 'game/tabImg/img_lt_3_3.png' },
  { id: 'tabImg.img_lt_3_4',  src: 'runtime/game/tabImg/img_lt_3_4.png',  exportPath: 'game/tabImg/img_lt_3_4.png' },
  { id: 'tabImg.img_lt_4',    src: 'runtime/game/tabImg/img_lt_4.png',    exportPath: 'game/tabImg/img_lt_4.png' },
  { id: 'tabImg.img_lt_4_1',  src: 'runtime/game/tabImg/img_lt_4_1.png',  exportPath: 'game/tabImg/img_lt_4_1.png' },
  { id: 'tabImg.img_lt_4_2',  src: 'runtime/game/tabImg/img_lt_4_2.png',  exportPath: 'game/tabImg/img_lt_4_2.png' },
  { id: 'tabImg.img_lt_4_3',  src: 'runtime/game/tabImg/img_lt_4_3.png',  exportPath: 'game/tabImg/img_lt_4_3.png' },
  { id: 'tabImg.img_lt_4_4',  src: 'runtime/game/tabImg/img_lt_4_4.png',  exportPath: 'game/tabImg/img_lt_4_4.png' },
  { id: 'tabImg.img_lt_5',    src: 'runtime/game/tabImg/img_lt_5.png',    exportPath: 'game/tabImg/img_lt_5.png' },
  { id: 'tabImg.img_lt_5_1',  src: 'runtime/game/tabImg/img_lt_5_1.png',  exportPath: 'game/tabImg/img_lt_5_1.png' },
  { id: 'tabImg.img_lt_5_2',  src: 'runtime/game/tabImg/img_lt_5_2.png',  exportPath: 'game/tabImg/img_lt_5_2.png' },
  { id: 'tabImg.img_lt_5_3',  src: 'runtime/game/tabImg/img_lt_5_3.png',  exportPath: 'game/tabImg/img_lt_5_3.png' },
  { id: 'tabImg.img_lt_5_4',  src: 'runtime/game/tabImg/img_lt_5_4.png',  exportPath: 'game/tabImg/img_lt_5_4.png' },
  { id: 'tabImg.img_lt_6',    src: 'runtime/game/tabImg/img_lt_6.png',    exportPath: 'game/tabImg/img_lt_6.png' },
  { id: 'tabImg.img_lt_6_1',  src: 'runtime/game/tabImg/img_lt_6_1.png',  exportPath: 'game/tabImg/img_lt_6_1.png' },
  { id: 'tabImg.img_lt_6_2',  src: 'runtime/game/tabImg/img_lt_6_2.png',  exportPath: 'game/tabImg/img_lt_6_2.png' },
  { id: 'tabImg.img_lt_6_3',  src: 'runtime/game/tabImg/img_lt_6_3.png',  exportPath: 'game/tabImg/img_lt_6_3.png' },
  { id: 'tabImg.img_lt_6_4',  src: 'runtime/game/tabImg/img_lt_6_4.png',  exportPath: 'game/tabImg/img_lt_6_4.png' },
  { id: 'tabImg.img_lt_7',    src: 'runtime/game/tabImg/img_lt_7.png',    exportPath: 'game/tabImg/img_lt_7.png' },
  { id: 'tabImg.img_lt_8',    src: 'runtime/game/tabImg/img_lt_8.png',    exportPath: 'game/tabImg/img_lt_8.png' },
  { id: 'tabImg.img_lt_9',    src: 'runtime/game/tabImg/img_lt_9.png',    exportPath: 'game/tabImg/img_lt_9.png' },
  { id: 'tabImg.img_lt_9_1',  src: 'runtime/game/tabImg/img_lt_9_1.png',  exportPath: 'game/tabImg/img_lt_9_1.png' },
  { id: 'tabImg.img_lt_9_2',  src: 'runtime/game/tabImg/img_lt_9_2.png',  exportPath: 'game/tabImg/img_lt_9_2.png' },
  { id: 'tabImg.img_lt_9_3',  src: 'runtime/game/tabImg/img_lt_9_3.png',  exportPath: 'game/tabImg/img_lt_9_3.png' },
  { id: 'tabImg.img_lx_1',    src: 'runtime/game/tabImg/img_lx_1.png',    exportPath: 'game/tabImg/img_lx_1.png' },
  { id: 'tabImg.img_lx_1_1',  src: 'runtime/game/tabImg/img_lx_1_1.png',  exportPath: 'game/tabImg/img_lx_1_1.png' },
  { id: 'tabImg.img_lx_1_2',  src: 'runtime/game/tabImg/img_lx_1_2.png',  exportPath: 'game/tabImg/img_lx_1_2.png' },
  { id: 'tabImg.img_lx_1_3',  src: 'runtime/game/tabImg/img_lx_1_3.png',  exportPath: 'game/tabImg/img_lx_1_3.png' },
  { id: 'tabImg.img_lx_1_4',  src: 'runtime/game/tabImg/img_lx_1_4.png',  exportPath: 'game/tabImg/img_lx_1_4.png' },
  { id: 'tabImg.img_lx_2',    src: 'runtime/game/tabImg/img_lx_2.png',    exportPath: 'game/tabImg/img_lx_2.png' },
  { id: 'tabImg.img_lx_2_1',  src: 'runtime/game/tabImg/img_lx_2_1.png',  exportPath: 'game/tabImg/img_lx_2_1.png' },
  { id: 'tabImg.img_lx_2_2',  src: 'runtime/game/tabImg/img_lx_2_2.png',  exportPath: 'game/tabImg/img_lx_2_2.png' },
  { id: 'tabImg.img_lx_2_3',  src: 'runtime/game/tabImg/img_lx_2_3.png',  exportPath: 'game/tabImg/img_lx_2_3.png' },
  { id: 'tabImg.img_lx_2_4',  src: 'runtime/game/tabImg/img_lx_2_4.png',  exportPath: 'game/tabImg/img_lx_2_4.png' },
  { id: 'tabImg.img_lx_3',    src: 'runtime/game/tabImg/img_lx_3.png',    exportPath: 'game/tabImg/img_lx_3.png' },
  { id: 'tabImg.img_lx_3_1',  src: 'runtime/game/tabImg/img_lx_3_1.png',  exportPath: 'game/tabImg/img_lx_3_1.png' },
  { id: 'tabImg.img_lx_3_2',  src: 'runtime/game/tabImg/img_lx_3_2.png',  exportPath: 'game/tabImg/img_lx_3_2.png' },
  { id: 'tabImg.img_lx_3_3',  src: 'runtime/game/tabImg/img_lx_3_3.png',  exportPath: 'game/tabImg/img_lx_3_3.png' },
  { id: 'tabImg.img_lx_3_4',  src: 'runtime/game/tabImg/img_lx_3_4.png',  exportPath: 'game/tabImg/img_lx_3_4.png' },
  { id: 'tabImg.img_lx_4',    src: 'runtime/game/tabImg/img_lx_4.png',    exportPath: 'game/tabImg/img_lx_4.png' },
  { id: 'tabImg.img_lx_4_1',  src: 'runtime/game/tabImg/img_lx_4_1.png',  exportPath: 'game/tabImg/img_lx_4_1.png' },
  { id: 'tabImg.img_lx_4_2',  src: 'runtime/game/tabImg/img_lx_4_2.png',  exportPath: 'game/tabImg/img_lx_4_2.png' },
  { id: 'tabImg.img_lx_4_3',  src: 'runtime/game/tabImg/img_lx_4_3.png',  exportPath: 'game/tabImg/img_lx_4_3.png' },
  { id: 'tabImg.img_lx_4_4',  src: 'runtime/game/tabImg/img_lx_4_4.png',  exportPath: 'game/tabImg/img_lx_4_4.png' },
  { id: 'tabImg.img_lx_5',    src: 'runtime/game/tabImg/img_lx_5.png',    exportPath: 'game/tabImg/img_lx_5.png' },
  { id: 'tabImg.img_lx_5_1',  src: 'runtime/game/tabImg/img_lx_5_1.png',  exportPath: 'game/tabImg/img_lx_5_1.png' },
  { id: 'tabImg.img_lx_5_2',  src: 'runtime/game/tabImg/img_lx_5_2.png',  exportPath: 'game/tabImg/img_lx_5_2.png' },
  { id: 'tabImg.img_lx_5_3',  src: 'runtime/game/tabImg/img_lx_5_3.png',  exportPath: 'game/tabImg/img_lx_5_3.png' },
  { id: 'tabImg.img_lx_5_4',  src: 'runtime/game/tabImg/img_lx_5_4.png',  exportPath: 'game/tabImg/img_lx_5_4.png' },
  { id: 'tabImg.img_lx_6',    src: 'runtime/game/tabImg/img_lx_6.png',    exportPath: 'game/tabImg/img_lx_6.png' },
  { id: 'tabImg.img_lx_6_1',  src: 'runtime/game/tabImg/img_lx_6_1.png',  exportPath: 'game/tabImg/img_lx_6_1.png' },
  { id: 'tabImg.img_lx_6_2',  src: 'runtime/game/tabImg/img_lx_6_2.png',  exportPath: 'game/tabImg/img_lx_6_2.png' },
  { id: 'tabImg.img_lx_6_3',  src: 'runtime/game/tabImg/img_lx_6_3.png',  exportPath: 'game/tabImg/img_lx_6_3.png' },
  { id: 'tabImg.img_lx_6_4',  src: 'runtime/game/tabImg/img_lx_6_4.png',  exportPath: 'game/tabImg/img_lx_6_4.png' },
  { id: 'tabImg.img_lx_8',    src: 'runtime/game/tabImg/img_lx_8.png',    exportPath: 'game/tabImg/img_lx_8.png' },
  { id: 'tabImg.img_pd',      src: 'runtime/game/tabImg/img_pd.png',      exportPath: 'game/tabImg/img_pd.png' },
  { id: 'tabImg.img_qh_1',    src: 'runtime/game/tabImg/img_qh_1.png',    exportPath: 'game/tabImg/img_qh_1.png' },
  { id: 'tabImg.img_qh_2',    src: 'runtime/game/tabImg/img_qh_2.png',    exportPath: 'game/tabImg/img_qh_2.png' },
  { id: 'tabImg.img_qh_3',    src: 'runtime/game/tabImg/img_qh_3.png',    exportPath: 'game/tabImg/img_qh_3.png' },
  { id: 'tabImg.img_qh_4',    src: 'runtime/game/tabImg/img_qh_4.png',    exportPath: 'game/tabImg/img_qh_4.png' },
  { id: 'tabImg.img_qh_5',    src: 'runtime/game/tabImg/img_qh_5.png',    exportPath: 'game/tabImg/img_qh_5.png' },
  { id: 'tabImg.img_qh_6',    src: 'runtime/game/tabImg/img_qh_6.png',    exportPath: 'game/tabImg/img_qh_6.png' },
  { id: 'tabImg.img_tz_1',    src: 'runtime/game/tabImg/img_tz_1.png',    exportPath: 'game/tabImg/img_tz_1.png' },
  { id: 'tabImg.img_tz_2',    src: 'runtime/game/tabImg/img_tz_2.png',    exportPath: 'game/tabImg/img_tz_2.png' },
  { id: 'tabImg.img_tz_3',    src: 'runtime/game/tabImg/img_tz_3.png',    exportPath: 'game/tabImg/img_tz_3.png' },
  { id: 'tabImg.img_tz_4',    src: 'runtime/game/tabImg/img_tz_4.png',    exportPath: 'game/tabImg/img_tz_4.png' },
  { id: 'tabImg.img_tz_5',    src: 'runtime/game/tabImg/img_tz_5.png',    exportPath: 'game/tabImg/img_tz_5.png' },
  { id: 'tabImg.img_tz_6',    src: 'runtime/game/tabImg/img_tz_6.png',    exportPath: 'game/tabImg/img_tz_6.png' },
  { id: 'tabImg.img_xsnd',    src: 'runtime/game/tabImg/img_xsnd.png',    exportPath: 'game/tabImg/img_xsnd.png' },
  { id: 'tabImg.img_xsnd_1',  src: 'runtime/game/tabImg/img_xsnd_1.png',  exportPath: 'game/tabImg/img_xsnd_1.png' },
  { id: 'tabImg.img_xsnd_2',  src: 'runtime/game/tabImg/img_xsnd_2.png',  exportPath: 'game/tabImg/img_xsnd_2.png' },
  { id: 'tabImg.img_zsdh',    src: 'runtime/game/tabImg/img_zsdh.png',    exportPath: 'game/tabImg/img_zsdh.png' },
  { id: 'tabImg.img_zshg',    src: 'runtime/game/tabImg/img_zshg.png',    exportPath: 'game/tabImg/img_zshg.png' },
  { id: 'tabImg.img_zsjj',    src: 'runtime/game/tabImg/img_zsjj.png',    exportPath: 'game/tabImg/img_zsjj.png' },
  { id: 'tabImg.img_zssl',    src: 'runtime/game/tabImg/img_zssl.png',    exportPath: 'game/tabImg/img_zssl.png' },
  { id: 'tabImg.img_zt_1',    src: 'runtime/game/tabImg/img_zt_1.png',    exportPath: 'game/tabImg/img_zt_1.png' },
  { id: 'tabImg.img_zt_2',    src: 'runtime/game/tabImg/img_zt_2.png',    exportPath: 'game/tabImg/img_zt_2.png' },
  { id: 'tabImg.img_zt_3',    src: 'runtime/game/tabImg/img_zt_3.png',    exportPath: 'game/tabImg/img_zt_3.png' },
  { id: 'tabImg.img_zt_4',    src: 'runtime/game/tabImg/img_zt_4.png',    exportPath: 'game/tabImg/img_zt_4.png' },

  // ─── 确定按钮资源（确定按钮组件 ConfirmButton 的内置皮肤库）───
  { id: 'okBtn.btn_qd',   src: 'runtime/game/okBtn/btn_qd.png',   exportPath: 'game/okBtn/btn_qd.png' },
  { id: 'okBtn.btn_qd2',  src: 'runtime/game/okBtn/btn_qd2.png',  exportPath: 'game/okBtn/btn_qd2.png' },
  { id: 'okBtn.btn_qd3',  src: 'runtime/game/okBtn/btn_qd3.png',  exportPath: 'game/okBtn/btn_qd3.png' },
  { id: 'okBtn.btn_qd4',  src: 'runtime/game/okBtn/btn_qd4.png',  exportPath: 'game/okBtn/btn_qd4.png' },
  { id: 'okBtn.btn_qd5',  src: 'runtime/game/okBtn/btn_qd5.png',  exportPath: 'game/okBtn/btn_qd5.png' },
  { id: 'okBtn.m_qddk_on', src: 'runtime/game/okBtn/m_qddk_on.png', exportPath: 'game/okBtn/m_qddk_on.png' },
  { id: 'okBtn.btn_dpon',  src: 'runtime/game/okBtn/btn_dpon.png',  exportPath: 'game/okBtn/btn_dpon.png' },
  { id: 'okBtn.btn_1',     src: 'runtime/game/okBtn/btn_1.png',     exportPath: 'game/okBtn/btn_1.png' },

  // ─── 翻页组件资源 ───
  { id: 'pageTurn.btnLeft',       src: 'runtime/game/image/btn_return_new.png', exportPath: 'game/image/btn_return_new.png' },
  { id: 'pageTurn.btnRight',      src: 'runtime/game/image/btn_you.png',         exportPath: 'game/image/btn_you.png' },
  { id: 'pageTurn.placeholder',   src: 'editor/page-turn-placeholder.png' },

  // ─── 口才课选择题：选项卡片占位图 ───
  { id: 'selectableObj.placeholder', src: 'editor/selectable-obj-placeholder.png' },
  { id: 'selectableObj.fg', src: 'runtime/game/selectableObj/m_1.png', exportPath: 'game/selectableObj/m_1.png' },
  { id: 'selectableObj.bg', src: 'runtime/game/selectableObj/m_2.png', exportPath: 'game/selectableObj/m_2.png' },
  { id: 'selectableObj.m_wrong', src: 'runtime/game/selectableObj/m_wrong.png', exportPath: 'game/selectableObj/m_wrong.png' },
  { id: 'selectableObj.btn1', src: 'runtime/game/selectableObj/btn_1.png', exportPath: 'game/selectableObj/btn_1.png' },
  { id: 'selectableObj.btn2', src: 'runtime/game/selectableObj/btn_2.png', exportPath: 'game/selectableObj/btn_2.png' },
  { id: 'selectableObj.btn3', src: 'runtime/game/selectableObj/btn_3.png', exportPath: 'game/selectableObj/btn_3.png' },
  { id: 'selectableObj.btn4', src: 'runtime/game/selectableObj/btn_4.png', exportPath: 'game/selectableObj/btn_4.png' },
  { id: 'choiceOption.normal', src: 'runtime/game/choiceOption/normal.png', exportPath: 'game/choiceOption/normal.png' },
  { id: 'choiceOption.pressed', src: 'runtime/game/choiceOption/pressed.png', exportPath: 'game/choiceOption/pressed.png' },
  { id: 'choiceOption.selected', src: 'runtime/game/choiceOption/selected.png', exportPath: 'game/choiceOption/selected.png' },
  { id: 'choiceOption.correct', src: 'runtime/game/choiceOption/correct.png', exportPath: 'game/choiceOption/correct.png' },
  { id: 'choiceOption.wrong', src: 'runtime/game/choiceOption/wrong.png', exportPath: 'game/choiceOption/wrong.png' },
  // ─── 口才课选择题：选择题容器透明占位图 ───
  { id: 'choiceBox.placeholder', src: 'editor/choicebox-placeholder.png' },
  // ─── 容器Box透明占位图 ───
  { id: 'containerBox.placeholder', src: 'editor/container-box-placeholder.png' },

  // ─── 答题反馈音效 ───
  { id: 'sound.right', src: 'runtime/game/sound/right.mp3', exportPath: 'game/sound/right.mp3' },
  { id: 'sound.wrong', src: 'runtime/game/sound/wrong.mp3', exportPath: 'game/sound/wrong.mp3' },
  { id: 'sound.btnClick', src: 'runtime/game/sound/btn_click.wav', exportPath: 'game/sound/btn_click.wav' },

  // ─── 口才反馈动画资源 ───
  { id: 'feedback.CH.yes.sk', src: 'runtime/game/animation/zx_yes/zx_yes.sk', exportPath: 'game/animation/zx_yes/zx_yes.sk' },
  { id: 'feedback.CH.yes.png', src: 'runtime/game/animation/zx_yes/zx_yes.png', exportPath: 'game/animation/zx_yes/zx_yes.png' },
  { id: 'feedback.CH.no.sk', src: 'runtime/game/animation/zx_no/zx_no.sk', exportPath: 'game/animation/zx_no/zx_no.sk' },
  { id: 'feedback.CH.no.png', src: 'runtime/game/animation/zx_no/zx_no.png', exportPath: 'game/animation/zx_no/zx_no.png' },

  // ─── 画笔组件资源 ───
  { id: 'newBrushSprite.drawBtn',   src: 'runtime/game/image/img/img_draw.png',     exportPath: 'game/image/img/img_draw.png' },
  { id: 'newBrushSprite.drawBtnBg', src: 'runtime/game/image/img/img_anniu-xz.png', exportPath: 'game/image/img/img_anniu-xz.png' },
  { id: 'newBrushSprite.clearBtn',  src: 'runtime/game/image/img/img_cel.png',      exportPath: 'game/image/img/img_cel.png' },
  { id: 'newBrushSprite.placeholder', src: 'editor/new-brush-sprite-placeholder.png' },
];

const byId = new Map(BUILTIN_ASSETS.map(a => [a.id, a]));
const byExport = new Map(
  BUILTIN_ASSETS.filter(a => a.exportPath).map(a => [a.exportPath!, a]),
);

/** 编辑器加载该资源时使用的 URL（dev server 可访问） */
export function assetSrc(id: string): string {
  const a = byId.get(id);
  if (!a) throw new Error(`[builtinAssets] Unknown asset id: ${id}`);
  return `/builtin/${a.src}`;
}

/** 发布后该资源在课件包内的引用路径（写进 LessonZK.js 的 skin / fontClipSkin 等字段） */
export function assetExport(id: string): string {
  const a = byId.get(id);
  if (!a) throw new Error(`[builtinAssets] Unknown asset id: ${id}`);
  if (!a.exportPath) throw new Error(`[builtinAssets] Asset '${id}' has no exportPath (editor-only)`);
  return a.exportPath;
}

/** 给定一个发布路径，反查它是不是内置资源（替代旧的硬编码前缀判断） */
export function lookupBuiltinByExportPath(p: string): BuiltinAsset | undefined {
  return byExport.get(p);
}

/** 给定 /builtin/... 编辑器 URL，反查对应的 builtin asset */
export function lookupBuiltinBySrcPath(srcPath: string): BuiltinAsset | undefined {
  // srcPath 可能是 "/builtin/runtime/game/image/img_fm.png" 或 "runtime/game/image/img_fm.png"
  const relative = srcPath.startsWith('/builtin/') ? srcPath.slice('/builtin/'.length) : srcPath;
  return BUILTIN_ASSETS.find(a => a.src === relative);
}

/** 发布请求中带给后端的 export-path → src 映射（让 vite 中间件据此找源文件） */
export function getBuiltinExportToSrcMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of BUILTIN_ASSETS) {
    if (a.exportPath) map[a.exportPath] = a.src;
  }
  return map;
}

/** 获取指定资源组内所有条目的 id（如 'tabImg' → ['tabImg.img_lt_1', 'tabImg.img_lt_2', ...]） */
export function getResourceGroupIds(groupPrefix: string): string[] {
  return BUILTIN_ASSETS.filter(a => a.id.startsWith(groupPrefix + '.') && a.exportPath).map(a => a.id);
}
