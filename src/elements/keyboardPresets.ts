// 键盘预设：每个预设包含完整的 KlBaseKeyboard 子节点结构
// 用户在编辑器添加键盘时弹出选择对话框，挑选预设后只把 `id` 写入 element.props._keyboardPreset
// 导出时（exportProject / exportPreviewProject / collectResourceRefs）通过 getKeyboardPreset(id)
// 反查到预设的 children 作为 fixedChildren，children 不进入课件 JSON 体积
//
// 资源路径走 builtinAssets 体系（src/elements/builtinAssets.ts）：
//   - 编辑器加载用 assetSrc(id)
//   - 发布到课件包用 assetExport(id)

import type { Element } from '../types';
import { assetExport, assetSrc } from './builtinAssets';

export interface ExportChild {
  type: string;
  props: Record<string, unknown>;
  child?: ExportChild[];
  resources?: string[];
}

export interface KeyboardPreset {
  id: string;
  label: string;
  thumbnail: string;
  compatibleInputTypes: string[];
  /** 自动 camp 编号前缀：拖入第 N 个该预设时，camp = `${campPrefix}-${N}`（如 'L11_1' → L11_1-1, L11_1-2…）*/
  campPrefix: string;
  defaultProps: Record<string, unknown>;
  defaultSize: { width: number; height: number };
  children: ExportChild[];
}

export type CustomAnswerKeyboardTheme = 'yellow' | 'blue' | 'green';

export interface CustomAnswerKeyboardConfig {
  answers: string[];
  theme: CustomAnswerKeyboardTheme;
  /** 仅用于预览/发布过程，按 answers 顺序保存键帽文字透明图。 */
  textSkins?: string[];
  /** 仅用于预览/发布过程，供绑定输入框使用的 FontClip 字库图。 */
  inputFontSkin?: string;
  /** inputFontSkin 中的字符排列。 */
  inputSheet?: string;
}

export interface CustomAnswerKeyboardLayout {
  columns: 2 | 3;
  answerRows: number;
  answerPositions: Array<{ x: number; y: number; width: number }>;
  clearPosition: { x: number; y: number };
}

export const CUSTOM_ANSWER_KEYBOARD_FONT = 'FZLanTingYuanZhongCu';
export const DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG: CustomAnswerKeyboardConfig = {
  answers: ['东', '南', '西', '北'],
  theme: 'yellow',
};

const CUSTOM_ANSWER_THEMES: CustomAnswerKeyboardTheme[] = ['yellow', 'blue', 'green'];
const CUSTOM_ANSWER_KEY_SIZE = { width: 84, height: 88 };
const CUSTOM_ANSWER_BOARD_SIZE = { width: 330, height: 420 };
const CUSTOM_ANSWER_KEY_GAP = 12;
const CUSTOM_ANSWER_ROW_MAX_WIDTH = 306;
const CUSTOM_ANSWER_KEY_WIDTH_STEP = 36;

export function isCustomAnswerKeyboardTheme(value: unknown): value is CustomAnswerKeyboardTheme {
  return typeof value === 'string' && CUSTOM_ANSWER_THEMES.includes(value as CustomAnswerKeyboardTheme);
}

export function readCustomAnswerKeyboardConfig(
  source: Pick<Element, 'props'> | Record<string, unknown> | null | undefined,
): CustomAnswerKeyboardConfig {
  const props = source && 'props' in source
    ? (source.props as Record<string, unknown> | undefined)
    : source;
  const raw = props?._customAnswerKeyboard as Partial<CustomAnswerKeyboardConfig> | undefined;
  return {
    answers: Array.isArray(raw?.answers)
      ? raw.answers.map((answer) => String(answer))
      : [...DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers],
    theme: isCustomAnswerKeyboardTheme(raw?.theme)
      ? raw.theme
      : DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.theme,
    textSkins: Array.isArray(raw?.textSkins)
      ? raw.textSkins.map((skin) => String(skin))
      : undefined,
    inputFontSkin: typeof raw?.inputFontSkin === 'string' ? raw.inputFontSkin : undefined,
    inputSheet: typeof raw?.inputSheet === 'string' ? raw.inputSheet : undefined,
  };
}

export function normalizeCustomAnswerOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers];
  return value
    .map((answer) => String(answer).trim())
    .slice(0, 9);
}

function customAnswerKeyTargetWidth(answer: string): number {
  const length = Math.max(1, Math.min(4, Array.from(answer).length));
  return CUSTOM_ANSWER_KEY_SIZE.width + (length - 1) * CUSTOM_ANSWER_KEY_WIDTH_STEP;
}

export function getCustomAnswerKeyboardLayout(answersOrCount: string[] | number): CustomAnswerKeyboardLayout {
  const answers = Array.isArray(answersOrCount)
    ? normalizeCustomAnswerOptions(answersOrCount)
    : Array.from({ length: Math.round(answersOrCount) }, () => '字');
  const count = Math.max(2, Math.min(9, answers.length));
  const layoutAnswers = answers.length >= 2
    ? answers.slice(0, count)
    : DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers.slice(0, count);
  const columns: 2 | 3 = count === 2 || count === 4 ? 2 : 3;
  const answerRows = Math.ceil(count / columns);
  const totalRows = answerRows + 1;
  const rowGap = 4;
  const totalHeight = totalRows * CUSTOM_ANSWER_KEY_SIZE.height + (totalRows - 1) * rowGap;
  const firstY = (CUSTOM_ANSWER_BOARD_SIZE.height - totalHeight) / 2 + CUSTOM_ANSWER_KEY_SIZE.height / 2;
  const rowStep = CUSTOM_ANSWER_KEY_SIZE.height + rowGap;
  const answerPositions: CustomAnswerKeyboardLayout['answerPositions'] = [];
  for (let row = 0; row < answerRows; row += 1) {
    const rowAnswers = layoutAnswers.slice(row * columns, Math.min(count, (row + 1) * columns));
    const targetWidths = rowAnswers.map(customAnswerKeyTargetWidth);
    const totalGap = Math.max(0, rowAnswers.length - 1) * CUSTOM_ANSWER_KEY_GAP;
    const targetWidth = targetWidths.reduce((sum, width) => sum + width, 0);
    const scale = targetWidth + totalGap > CUSTOM_ANSWER_ROW_MAX_WIDTH
      ? (CUSTOM_ANSWER_ROW_MAX_WIDTH - totalGap) / targetWidth
      : 1;
    const widths = targetWidths.map((width) => Math.floor(width * scale));
    const rowWidth = widths.reduce((sum, width) => sum + width, 0) + totalGap;
    let cursorX = (CUSTOM_ANSWER_BOARD_SIZE.width - rowWidth) / 2;
    widths.forEach((width) => {
      answerPositions.push({
        x: cursorX + width / 2,
        y: firstY + row * rowStep,
        width,
      });
      cursorX += width + CUSTOM_ANSWER_KEY_GAP;
    });
  }
  return {
    columns,
    answerRows,
    answerPositions,
    clearPosition: {
      x: CUSTOM_ANSWER_BOARD_SIZE.width / 2,
      y: firstY + answerRows * rowStep,
    },
  };
}

export function getCustomAnswerThemeAssets(theme: CustomAnswerKeyboardTheme, editor = false) {
  const resolve = editor ? assetSrc : assetExport;
  const prefix = `keyboard.customAnswer.${theme}`;
  return {
    bg: resolve(`${prefix}.bg`),
    keyNormal: resolve(`${prefix}.keyNormal`),
    keyActive: resolve(`${prefix}.keyActive`),
    wideNormal: resolve(`${prefix}.wideNormal`),
    wideActive: resolve(`${prefix}.wideActive`),
    clearNormal: resolve(`${prefix}.clearNormal`),
    clearActive: resolve(`${prefix}.clearActive`),
    arrow: resolve(`${prefix}.arrow`),
  };
}

export function getCustomAnswerTextStyle(theme: CustomAnswerKeyboardTheme, text: string) {
  const length = Array.from(text).length;
  const fontSize = length <= 1 ? 42 : length === 2 ? 34 : length === 3 ? 25 : 19;
  const palette = {
    yellow: { color: '#6b4300', strokeColor: '#fff3a8' },
    blue: { color: '#174f87', strokeColor: '#dff6ff' },
    green: { color: '#25643f', strokeColor: '#e5ffe9' },
  }[theme];
  return { fontSize, ...palette };
}

function customAnswerTextNode(
  answer: string,
  theme: CustomAnswerKeyboardTheme,
  pressed = false,
  textSkin?: string,
  width = CUSTOM_ANSWER_KEY_SIZE.width,
): ExportChild {
  if (textSkin) {
    return {
      type: 'Image',
      props: {
        x: 0,
        y: pressed ? 2 : 0,
        width,
        height: CUSTOM_ANSWER_KEY_SIZE.height,
        skin: textSkin,
        mouseEnabled: false,
      },
    };
  }
  const style = getCustomAnswerTextStyle(theme, answer);
  return {
    type: 'Label',
    props: {
      x: 0,
      y: pressed ? 2 : 0,
      width,
      height: CUSTOM_ANSWER_KEY_SIZE.height,
      text: answer,
      font: CUSTOM_ANSWER_KEYBOARD_FONT,
      fontSize: style.fontSize,
      color: style.color,
      stroke: 4,
      strokeColor: style.strokeColor,
      align: 'center',
      valign: 'middle',
    },
  };
}

function customAnswerKey(
  answer: string,
  position: { x: number; y: number; width: number },
  theme: CustomAnswerKeyboardTheme,
  textSkin?: string,
): ExportChild {
  const assets = getCustomAnswerThemeAssets(theme);
  const width = position.width;
  return {
    type: 'KlKey',
    props: {
      ...position,
      width,
      height: CUSTOM_ANSWER_KEY_SIZE.height,
      anchorX: 0.5,
      anchorY: 0.5,
      output: answer,
      runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
    },
    child: [
      {
        type: 'Image',
        props: {
          width,
          height: CUSTOM_ANSWER_KEY_SIZE.height,
          skin: assets.keyNormal,
          sizeGrid: '0,28,0,28',
          name: 'normal',
        },
        child: [customAnswerTextNode(answer, theme, false, textSkin, width)],
      },
      {
        type: 'Image',
        props: {
          width,
          height: CUSTOM_ANSWER_KEY_SIZE.height,
          skin: assets.keyActive,
          sizeGrid: '0,28,0,28',
          name: 'active',
        },
        child: [customAnswerTextNode(answer, theme, true, textSkin, width)],
      },
    ],
  };
}

function customAnswerClearKey(
  position: { x: number; y: number },
  theme: CustomAnswerKeyboardTheme,
): ExportChild {
  const assets = getCustomAnswerThemeAssets(theme);
  const state = (pressed: boolean): ExportChild => ({
    type: 'Image',
    props: {
      width: 182,
      height: CUSTOM_ANSWER_KEY_SIZE.height,
      skin: pressed ? assets.wideActive : assets.wideNormal,
      name: pressed ? 'active' : 'normal',
    },
    child: [{
      type: 'Image',
      props: {
        skin: pressed ? assets.clearActive : assets.clearNormal,
        centerX: 0,
        centerY: pressed ? 2 : 0,
      },
    }],
  });
  return {
    type: 'KlKey',
    props: {
      ...position,
      width: 182,
      height: CUSTOM_ANSWER_KEY_SIZE.height,
      anchorX: 0.5,
      anchorY: 0.5,
      output: ' ',
      runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
    },
    child: [state(false), state(true)],
  };
}

export function customAnswerKeyboardChildren(config: CustomAnswerKeyboardConfig): ExportChild[] {
  const answers = normalizeCustomAnswerOptions(config.answers);
  const renderAnswers = answers.length >= 2
    ? answers
    : [...DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers];
  const theme = isCustomAnswerKeyboardTheme(config.theme)
    ? config.theme
    : DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.theme;
  const assets = getCustomAnswerThemeAssets(theme);
  const layout = getCustomAnswerKeyboardLayout(renderAnswers);
  return [
    {
      type: 'Image',
      props: {
        x: 65,
        y: 65,
        width: CUSTOM_ANSWER_BOARD_SIZE.width,
        height: CUSTOM_ANSWER_BOARD_SIZE.height,
        skin: assets.bg,
        sizeGrid: '53,0,57,0',
      },
    },
    {
      type: 'Image',
      props: {
        x: 230,
        y: 0,
        skin: assets.arrow,
        name: 'arrow',
        anchorX: 0.5,
      },
    },
    {
      type: 'Box',
      props: {
        x: 65,
        y: 65,
        width: CUSTOM_ANSWER_BOARD_SIZE.width,
        height: CUSTOM_ANSWER_BOARD_SIZE.height,
        name: 'keysBox',
      },
      child: [
        ...renderAnswers.map((answer, index) => customAnswerKey(
          answer,
          layout.answerPositions[index],
          theme,
          config.textSkins?.[index],
        )),
        customAnswerClearKey(layout.clearPosition, theme),
      ],
    },
  ];
}

// ─── 数字键工厂 ─────────────────────────────────────
// 数字键(1-9, 0)：normal(jp_4.png) + active(jp_5.png)，每个 Image 内嵌 FontClip
const NUM_SHEET = '0123456789°%+-*/().p^=';
const numKey = (x: number, y: number, output: string | number): ExportChild => ({
  type: 'KlKey',
  props: {
    x, y, width: 124, height: 92,
    output,
    runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
  },
  child: [
    {
      type: 'Image',
      props: {
        y: 0, x: 0, width: 124, height: 92,
        skin: assetExport('keyboard.preset1.keyNormal'),
        sizeGrid: '10,10,10,10',
        name: 'normal',
      },
      child: [
        {
          type: 'FontClip',
          props: {
            y: 23, x: 16,
            value: String(output),
            skin: assetExport('keyboard.preset1.numFont'),
            sheet: NUM_SHEET,
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
    {
      type: 'Image',
      props: {
        width: 124, height: 92,
        skin: assetExport('keyboard.preset1.keyActive'),
        sizeGrid: '10,10,10,10',
        name: 'active',
      },
      child: [
        {
          type: 'FontClip',
          props: {
            y: 23, x: 16,
            value: String(output),
            skin: assetExport('keyboard.preset1.numFont'),
            sheet: NUM_SHEET,
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
  ],
});

// 删除键：normal/active Image (jp_4/jp_5, sizeGrid 不同) 各含一个 Image (img_delete.png)
const delKey = (): ExportChild => ({
  type: 'KlKey',
  props: {
    y: 363, x: 289, width: 251, height: 92,
    output: 'del',
    runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
  },
  child: [
    {
      type: 'Image',
      props: {
        y: 0, x: 0, width: 251, height: 92,
        skin: assetExport('keyboard.preset1.keyNormal'),
        sizeGrid: '20,50,50,23',
        name: 'normal',
      },
      child: [
        {
          type: 'Image',
          props: {
            skin: assetExport('keyboard.preset1.delIcon'),
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
    {
      type: 'Image',
      props: {
        y: 0, x: 0, width: 251, height: 92,
        skin: assetExport('keyboard.preset1.keyActive'),
        sizeGrid: '20,50,50,23',
        name: 'active',
      },
      child: [
        {
          type: 'Image',
          props: {
            skin: assetExport('keyboard.preset1.delIcon'),
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
  ],
});

// ─── 预设1：数字键盘（参考 LessonZK6f504135.js）────────
const preset1Children: ExportChild[] = [
  // 键盘背景
  {
    type: 'Image',
    props: {
      y: -7, x: -4, width: 453, height: 448,
      skin: assetExport('keyboard.preset1.bg'),
      sizeGrid: '53,119,88,123',
    },
  },
  // arrow 占位
  {
    type: 'Image',
    props: { name: 'arrow' },
  },
  // 按键容器
  {
    type: 'Box',
    props: { y: 0, x: 0, width: 462, height: 458, name: 'keysBox' },
    child: [
      numKey(92, 70, 1),       // 数字 1（参考文件这里是数字 1 而非字符串）
      numKey(225, 70, '2'),
      numKey(356, 70, '3'),
      numKey(92, 167, '4'),
      numKey(224, 167, '5'),
      numKey(356, 167, '6'),
      numKey(92, 264, '7'),
      numKey(224, 264, '8'),
      numKey(356, 264, '9'),
      numKey(92, 361, '0'),
      delKey(),
    ],
  },
];

// ─── 预设2：数字+运算符键盘（参考 LessonZKbcaf3977.js，使用 jpL8 皮肤）────────
// 整体 681×419，sheet='1234567890()+-*/=.'，4行19键
// 行1 y=70:  1(92), 2(221), 3(351), 4(482), 5(612)
// 行2 y=166: 6(92), 7(221), 8(351), 9(481), 0(612)
// 行3 y=264: +(92), -(221), *(351), /(481), =(612)
// 行4 y=364: ((92), )(221), del(481, 宽375)
const PRESET2_SHEET = '1234567890()+-*/=.';

// preset2 普通键（124×92，内嵌 FontClip）
const preset2Key = (x: number, y: number, output: string | number): ExportChild => ({
  type: 'KlKey',
  props: {
    x, y, width: 124, height: 92,
    output,
    runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
  },
  child: [
    {
      type: 'Image',
      props: {
        y: 0, x: 0, width: 124, height: 92,
        skin: assetExport('keyboard.preset2.keyNormal'),
        sizeGrid: '10,10,10,10',
        name: 'normal',
      },
      child: [
        {
          type: 'FontClip',
          props: {
            y: 23, x: 16,
            value: String(output),
            skin: assetExport('keyboard.preset2.numFont'),
            sheet: PRESET2_SHEET,
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
    {
      type: 'Image',
      props: {
        width: 124, height: 92,
        skin: assetExport('keyboard.preset2.keyActive'),
        sizeGrid: '10,10,10,10',
        name: 'active',
      },
      child: [
        {
          type: 'FontClip',
          props: {
            y: 23, x: 16,
            value: String(output),
            skin: assetExport('keyboard.preset2.numFont'),
            sheet: PRESET2_SHEET,
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
  ],
});

// preset2 del 键（宽375，内嵌 img_delete Image，无 FontClip）
const preset2DelKey = (): ExportChild => ({
  type: 'KlKey',
  props: {
    y: 364, x: 481, width: 375, height: 92,
    output: 'del',
    runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
  },
  child: [
    {
      type: 'Image',
      props: {
        y: 2, x: 2, width: 375, height: 88,
        skin: assetExport('keyboard.preset2.keyNormal'),
        sizeGrid: '20,50,50,23',
        name: 'normal',
      },
      child: [
        {
          type: 'Image',
          props: {
            skin: assetExport('keyboard.preset2.delIcon'),
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
    {
      type: 'Image',
      props: {
        y: 2, x: 2, width: 375, height: 88,
        skin: assetExport('keyboard.preset2.keyActive'),
        sizeGrid: '20,50,50,23',
        name: 'active',
      },
      child: [
        {
          type: 'Image',
          props: {
            skin: assetExport('keyboard.preset2.delIcon'),
            centerY: 0, centerX: 0,
          },
        },
      ],
    },
  ],
});

const preset2Children: ExportChild[] = [
  // 键盘背景（jpL8/jp_bg.png）
  {
    type: 'Image',
    props: {
      y: -7, x: -6, width: 713, height: 453,
      skin: assetExport('keyboard.preset2.bg'),
      sizeGrid: '53,128,88,123',
    },
  },
  // arrow 占位
  {
    type: 'Image',
    props: { y: 0, x: 0, name: 'arrow' },
  },
  // 按键容器
  {
    type: 'Box',
    props: { y: 0, x: 0, width: 693, height: 427, name: 'keysBox' },
    child: [
      // 行1
      preset2Key(92, 70, 1),
      preset2Key(221, 70, '2'),
      preset2Key(351, 70, '3'),
      preset2Key(482, 70, '4'),
      preset2Key(612, 70, '5'),
      // 行2
      preset2Key(92, 166, '6'),
      preset2Key(221, 166, '7'),
      preset2Key(351, 166, '8'),
      preset2Key(481, 166, '9'),
      preset2Key(612, 166, '0'),
      // 行3
      preset2Key(92, 264, '+'),
      preset2Key(221, 264, '-'),
      preset2Key(351, 264, '*'),
      preset2Key(481, 264, '/'),
      preset2Key(612, 264, '='),
      // 行4
      preset2Key(92, 364, '('),
      preset2Key(221, 364, ')'),
      preset2DelKey(),
    ],
  },
];

const MATH_KEY_SHEET = '0123456789+-*/=<>()p';
const MATH_KEY_X = [69, 165, 261];
const MATH_KEY_Y = [67, 159, 252, 344];

const mathKey = (x: number, y: number, output: string | number): ExportChild => {
  const isFraction = output === '<_>';
  const isDelete = output === 'del';
  const icon = isFraction
    ? {
        normal: assetExport('keyboard.math.fractionNormal'),
        active: assetExport('keyboard.math.fractionActive'),
      }
    : null;
  const childForState = (active: boolean): ExportChild[] => {
    if (isDelete) {
      return [{
        type: 'Image',
        props: {
          skin: assetExport(active ? 'keyboard.math.delActive' : 'keyboard.math.delIcon'),
          centerX: 0,
          centerY: 0,
        },
      }];
    }
    if (icon) {
      return [{
        type: 'Image',
        props: {
          skin: active ? icon.active : icon.normal,
          centerX: 0,
          centerY: 0,
        },
      }];
    }
    return [{
      type: 'FontClip',
      props: {
        x: 42,
        y: 39,
        anchorX: 0.5,
        anchorY: 0.5,
        value: output === '.' ? 'p' : String(output),
        skin: assetExport(active ? 'keyboard.math.numActive' : 'keyboard.math.numNormal'),
        sheet: MATH_KEY_SHEET,
      },
    }];
  };
  return {
    type: 'KlKey',
    props: {
      x,
      y,
      width: 84,
      height: 88,
      anchorX: 0.5,
      anchorY: 0.5,
      output,
      runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
    },
    child: [
      {
        type: 'Image',
        props: {
          skin: assetExport('keyboard.math.keyNormal'),
          sizeGrid: '0,28,0,28',
          name: 'normal',
        },
        child: childForState(false),
      },
      {
        type: 'Image',
        props: {
          skin: assetExport('keyboard.math.keyActive'),
          name: 'active',
        },
        child: childForState(true),
      },
    ],
  };
};

function mathKeyboardChildren(specialOutput: '.' | '<_>'): ExportChild[] {
  const outputs: Array<string | number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, specialOutput, 'del'];
  return [
    {
      type: 'Image',
      props: {
        x: 65,
        y: 65,
        width: 330,
        height: 420,
        skin: assetExport('keyboard.math.bg'),
        sizeGrid: '53,0,57,0',
      },
    },
    { type: 'Image', props: { x: 230, y: 0, skin: assetExport('keyboard.math.arrow'), name: 'arrow', anchorX: 0.5 } },
    {
      type: 'Box',
      props: { x: 65, y: 65, width: 330, height: 420, name: 'keysBox' },
      child: outputs.map((output, index) => mathKey(
        MATH_KEY_X[index % 3],
        MATH_KEY_Y[Math.floor(index / 3)],
        output,
      )),
    },
  ];
}

export const KEYBOARD_PRESETS: KeyboardPreset[] = [
  {
    id: 'preset1',
    label: '键盘1',
    thumbnail: assetSrc('keyboard.preset1.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L11_1',
    defaultSize: { width: 446, height: 436 },
    defaultProps: {
      anchorX: 0, anchorY: 0,
      sheet: '0123456789°+-*/=().',
      pattern: 13,
      visible: false,
      isHide: true,
      fixed: true,
    },
    children: preset1Children,
  },
  {
    id: 'preset2',
    label: '键盘2',
    thumbnail: assetSrc('keyboard.preset2.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L8_2',
    defaultSize: { width: 681, height: 419 },
    defaultProps: {
      anchorX: 0, anchorY: 0,
      sheet: PRESET2_SHEET,
      pattern: 13,
      visible: false,
      isHide: true,
      fixed: true,
    },
    children: preset2Children,
  },
  {
    id: 'decimal',
    label: '数字与小数点',
    thumbnail: assetSrc('keyboard.decimal.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L12_DECIMAL',
    defaultSize: { width: 460, height: 550 },
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      sheet: '0123456789.',
      pattern: 13,
      visible: false,
      isHide: true,
      fixed: true,
      disabled: false,
    },
    children: mathKeyboardChildren('.'),
  },
  {
    id: 'fraction',
    label: '分数输入',
    thumbnail: assetSrc('keyboard.fraction.thumbnail'),
    compatibleInputTypes: ['FractionInput'],
    campPrefix: 'L12_FRACTION',
    defaultSize: { width: 460, height: 550 },
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      sheet: '0123456789',
      pattern: 13,
      visible: false,
      isHide: true,
      fixed: true,
      disabled: false,
    },
    children: mathKeyboardChildren('<_>'),
  },
  {
    id: 'customAnswer',
    label: '自定义答案',
    thumbnail: assetSrc('keyboard.customAnswer.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'TEXT_ANSWER',
    defaultSize: { width: 460, height: 550 },
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      sheet: '',
      pattern: 13,
      visible: false,
      isHide: true,
      fixed: true,
      disabled: false,
      _customAnswerKeyboard: {
        answers: [...DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers],
        theme: DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.theme,
      },
    },
    children: customAnswerKeyboardChildren(DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG),
  },
];

export function getKeyboardPreset(id: string): KeyboardPreset | undefined {
  const preset = KEYBOARD_PRESETS.find((p) => p.id === id);
  if (!preset) {
    console.error(`[keyboardPresets] 未知键盘预设 id: "${id}"，相关键盘元素将无按键、无资源`);
  }
  return preset;
}

export function getKeyboardChildren(element: Pick<Element, 'props'>): ExportChild[] | undefined {
  const presetId = (element.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
  if (typeof presetId !== 'string') return undefined;
  const preset = getKeyboardPreset(presetId);
  if (!preset) return undefined;
  return presetId === 'customAnswer'
    ? customAnswerKeyboardChildren(readCustomAnswerKeyboardConfig(element))
    : preset.children;
}
