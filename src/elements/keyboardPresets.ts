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
import { DEFAULT_FONT_FACE } from './fontLibrary';

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
  math?: MathKeyboardDefinition;
}

export type CustomAnswerKeyboardTheme = 'yellow' | 'blue' | 'green';
export type MathKeyboardTheme = CustomAnswerKeyboardTheme;

export interface MathKeyboardKeyDefinition {
  output: string;
  span?: number;
}

export interface MathKeyboardDefinition {
  columns: 3 | 5;
  keys: MathKeyboardKeyDefinition[];
}

export interface MathKeyboardLayout {
  columns: 3 | 5;
  rows: number;
  boardWidth: number;
  boardHeight: number;
  elementWidth: number;
  elementHeight: number;
  keys: Array<{
    output: string;
    span: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

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
  rowCount: number;
  boardWidth: number;
  boardHeight: number;
  answerPositions: Array<{ x: number; y: number; width: number }>;
  clearPosition: { x: number; y: number; width: number };
}

export const CUSTOM_ANSWER_KEYBOARD_FONT = DEFAULT_FONT_FACE;
export const DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG: CustomAnswerKeyboardConfig = {
  answers: ['东', '南', '西', '北'],
  theme: 'yellow',
};

const CUSTOM_ANSWER_THEMES: CustomAnswerKeyboardTheme[] = ['yellow', 'blue', 'green'];
const MATH_KEYBOARD_THEMES: MathKeyboardTheme[] = ['yellow', 'blue', 'green'];
export const DEFAULT_MATH_KEYBOARD_THEME: MathKeyboardTheme = 'yellow';
const CUSTOM_ANSWER_KEY_SIZE = { width: 84, height: 88 };
const CUSTOM_ANSWER_BOARD_MIN_WIDTH = 330;
const CUSTOM_ANSWER_KEY_GAP = 12;
const CUSTOM_ANSWER_ROW_GAP = 12;
const CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING = 27;
const CUSTOM_ANSWER_BOARD_TOP_PADDING = 16;
const CUSTOM_ANSWER_BOARD_BOTTOM_PADDING = 32;
const CUSTOM_ANSWER_KEY_WIDTH_STEP = 42;
const CUSTOM_ANSWER_CLEAR_KEY_WIDTH = 182;
const CUSTOM_ANSWER_MAX_CONTENT_WIDTH = 460 - CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING * 2;

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
    .map((answer) => String(answer).trim());
}

function customAnswerKeyTargetWidth(answer: string): number {
  const length = Math.max(1, Math.min(4, Array.from(answer).length));
  return CUSTOM_ANSWER_KEY_SIZE.width + (length - 1) * CUSTOM_ANSWER_KEY_WIDTH_STEP;
}

function customAnswerRowWidth(widths: number[]): number {
  return widths.reduce((sum, width) => sum + width, 0)
    + Math.max(0, widths.length - 1) * CUSTOM_ANSWER_KEY_GAP;
}

interface CustomAnswerRowCandidate {
  end: number;
  widths: number[];
  width: number;
}

interface CustomAnswerRowPlan {
  row: number[] | null;
  rowWidth: number;
  raggedness: number;
  next: CustomAnswerRowPlan | null;
}

function customAnswerRowCandidates(keyWidths: number[], start: number): CustomAnswerRowCandidate[] {
  const candidates: CustomAnswerRowCandidate[] = [];
  for (let end = start + 1; end <= keyWidths.length; end += 1) {
    const widths = keyWidths.slice(start, end);
    const width = customAnswerRowWidth(widths);
    if (width > CUSTOM_ANSWER_MAX_CONTENT_WIDTH) break;
    candidates.push({ end, widths, width });
  }
  return candidates;
}

function getMinimumCustomAnswerRowCounts(
  candidatesByStart: CustomAnswerRowCandidate[][],
  maxRowWidth: number,
): number[] {
  const keyCount = candidatesByStart.length;
  const minimumRows = Array.from({ length: keyCount + 1 }, () => Number.POSITIVE_INFINITY);
  minimumRows[keyCount] = 0;
  for (let start = keyCount - 1; start >= 0; start -= 1) {
    for (const candidate of candidatesByStart[start]) {
      if (candidate.width > maxRowWidth) continue;
      minimumRows[start] = Math.min(minimumRows[start], minimumRows[candidate.end] + 1);
    }
  }
  return minimumRows;
}

function isBetterCustomAnswerRowPlan(
  candidate: CustomAnswerRowPlan,
  current: CustomAnswerRowPlan | null,
): boolean {
  if (!current) return true;
  let candidateRow: CustomAnswerRowPlan | null = candidate;
  let currentRow: CustomAnswerRowPlan | null = current;
  while (candidateRow?.row && currentRow?.row) {
    if (candidateRow.rowWidth !== currentRow.rowWidth) {
      return candidateRow.rowWidth > currentRow.rowWidth;
    }
    candidateRow = candidateRow.next;
    currentRow = currentRow.next;
  }
  if (candidate.raggedness !== current.raggedness) {
    return candidate.raggedness < current.raggedness;
  }
  return false;
}

function getBestCustomAnswerRowPlan(
  candidatesByStart: CustomAnswerRowCandidate[][],
  minimumRows: number[],
  maxRowWidth: number,
): CustomAnswerRowPlan | null {
  const keyCount = candidatesByStart.length;
  const plans = Array<CustomAnswerRowPlan | null>(keyCount + 1).fill(null);
  plans[keyCount] = { row: null, rowWidth: 0, raggedness: 0, next: null };

  for (let start = keyCount - 1; start >= 0; start -= 1) {
    let best: CustomAnswerRowPlan | null = null;
    for (const candidate of candidatesByStart[start]) {
      if (candidate.width > maxRowWidth) continue;
      if (minimumRows[candidate.end] + 1 !== minimumRows[start]) continue;
      const suffix = plans[candidate.end];
      if (!suffix) continue;
      const plan: CustomAnswerRowPlan = {
        row: candidate.widths,
        rowWidth: candidate.width,
        raggedness: (maxRowWidth - candidate.width) ** 2 + suffix.raggedness,
        next: suffix,
      };
      if (isBetterCustomAnswerRowPlan(plan, best)) best = plan;
    }
    plans[start] = best;
  }
  return plans[0];
}

function getCustomAnswerKeyboardRows(keyWidths: number[]): number[][] {
  const candidatesByStart = keyWidths.map((_, start) => customAnswerRowCandidates(keyWidths, start));
  const minimumRowCount = getMinimumCustomAnswerRowCounts(
    candidatesByStart,
    CUSTOM_ANSWER_MAX_CONTENT_WIDTH,
  )[0];
  const possibleMaxRowWidths = Array.from(new Set(
    candidatesByStart.flatMap((candidates) => candidates.map((candidate) => candidate.width)),
  )).sort((left, right) => left - right);

  // 依次锁定最少行数、最窄底板和靠前行优先排满，清空键可单独铺满末行。
  for (const maxRowWidth of possibleMaxRowWidths) {
    const minimumRows = getMinimumCustomAnswerRowCounts(
      candidatesByStart,
      maxRowWidth,
    );
    if (minimumRows[0] !== minimumRowCount) continue;
    const plan = getBestCustomAnswerRowPlan(
      candidatesByStart,
      minimumRows,
      maxRowWidth,
    );
    if (plan) {
      const rows: number[][] = [];
      for (let row = plan; row.row; row = row.next!) rows.push(row.row);
      return rows;
    }
  }
  return keyWidths.map((width) => [width]);
}

export function getCustomAnswerKeyboardLayout(answersOrCount: string[] | number): CustomAnswerKeyboardLayout {
  const requestedCount = typeof answersOrCount === 'number' && Number.isFinite(answersOrCount)
    ? Math.max(0, Math.round(answersOrCount))
    : 0;
  const answers = Array.isArray(answersOrCount)
    ? normalizeCustomAnswerOptions(answersOrCount)
    : Array.from({ length: requestedCount }, () => '字');
  const count = Math.max(2, answers.length);
  const layoutAnswers = answers.length >= 2
    ? answers
    : DEFAULT_CUSTOM_ANSWER_KEYBOARD_CONFIG.answers.slice(0, count);
  const keyWidths = [
    ...layoutAnswers.map(customAnswerKeyTargetWidth),
    CUSTOM_ANSWER_CLEAR_KEY_WIDTH,
  ];
  const rows = getCustomAnswerKeyboardRows(keyWidths);
  const rowWidths = rows.map(customAnswerRowWidth);
  const boardWidth = Math.max(
    CUSTOM_ANSWER_BOARD_MIN_WIDTH,
    Math.max(...rowWidths) + CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING * 2,
  );
  const boardHeight = rows.length * CUSTOM_ANSWER_KEY_SIZE.height
    + (rows.length - 1) * CUSTOM_ANSWER_ROW_GAP
    + CUSTOM_ANSWER_BOARD_TOP_PADDING
    + CUSTOM_ANSWER_BOARD_BOTTOM_PADDING;
  const firstY = CUSTOM_ANSWER_BOARD_TOP_PADDING + CUSTOM_ANSWER_KEY_SIZE.height / 2;
  const rowStep = CUSTOM_ANSWER_KEY_SIZE.height + CUSTOM_ANSWER_ROW_GAP;
  const keyPositions: Array<{ x: number; y: number; width: number }> = [];
  rows.forEach((widths, row) => {
    let cursorX = CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING;
    widths.forEach((width) => {
      keyPositions.push({
        x: cursorX + width / 2,
        y: firstY + row * rowStep,
        width,
      });
      cursorX += width + CUSTOM_ANSWER_KEY_GAP;
    });
  });
  const clearBasePosition = keyPositions.at(-1) ?? {
    x: CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING + CUSTOM_ANSWER_CLEAR_KEY_WIDTH / 2,
    y: firstY,
    width: CUSTOM_ANSWER_CLEAR_KEY_WIDTH,
  };
  const clearLeft = clearBasePosition.x - clearBasePosition.width / 2;
  const clearWidth = boardWidth - CUSTOM_ANSWER_BOARD_HORIZONTAL_PADDING - clearLeft;
  return {
    rowCount: rows.length,
    boardWidth,
    boardHeight,
    answerPositions: keyPositions.slice(0, -1),
    clearPosition: {
      x: clearLeft + clearWidth / 2,
      y: clearBasePosition.y,
      width: clearWidth,
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

export function getCustomAnswerTextStyle(theme: CustomAnswerKeyboardTheme, _text: string) {
  const palette = {
    yellow: { color: '#6b4300', strokeColor: '#fff3a8' },
    blue: { color: '#174f87', strokeColor: '#dff6ff' },
    green: { color: '#25643f', strokeColor: '#e5ffe9' },
  }[theme];
  return { fontSize: 42, ...palette };
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
  position: { x: number; y: number; width: number },
  theme: CustomAnswerKeyboardTheme,
): ExportChild {
  const assets = getCustomAnswerThemeAssets(theme);
  const width = position.width;
  const state = (pressed: boolean): ExportChild => ({
    type: 'Image',
    props: {
      width,
      height: CUSTOM_ANSWER_KEY_SIZE.height,
      skin: pressed ? assets.wideActive : assets.wideNormal,
      sizeGrid: '0,28,0,28',
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
      width,
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
  const boardX = (460 - layout.boardWidth) / 2;
  return [
    {
      type: 'Image',
      props: {
        x: boardX,
        y: 65,
        width: layout.boardWidth,
        height: layout.boardHeight,
        skin: assets.bg,
        sizeGrid: '53,52,57,52',
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
        x: boardX,
        y: 65,
        width: layout.boardWidth,
        height: layout.boardHeight,
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

export const MATH_KEY_SHEET = '0123456789+-*/=<>()p%';
const MATH_KEY_WIDTH = 84;
const MATH_KEY_HEIGHT = 88;
const MATH_KEY_GAP = 12;
const MATH_BOARD_HORIZONTAL_PADDING = 27;
const MATH_BOARD_TOP_PADDING = 26;
const MATH_BOARD_BOTTOM_PADDING = 32;
const MATH_BOARD_OFFSET_X = 65;
const MATH_BOARD_OFFSET_Y = 65;
const MATH_ELEMENT_BOTTOM_SPACE = 39;

const DECIMAL_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  { output: '.' },
  { output: 'del' },
];

const FRACTION_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  { output: '<_>' },
  { output: 'del' },
];

const DECIMAL_FRACTION_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  { output: '.' },
  { output: '<_>' },
  { output: 'del', span: 3 },
];

const OPERATOR_KEYS: MathKeyboardKeyDefinition[] = [
  { output: '+' },
  { output: '-' },
  { output: '*' },
  { output: '/' },
  { output: '=' },
  { output: '(' },
  { output: ')' },
];

const FRACTION_OPERATOR_KEYS: MathKeyboardKeyDefinition[] = OPERATOR_KEYS.map((key) => ({
  ...key,
  output: key.output === '*' ? '×' : key.output === '/' ? '÷' : key.output,
}));

const EXPRESSION_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  ...FRACTION_OPERATOR_KEYS,
  { output: '.' },
  { output: '<_>' },
  { output: 'del' },
];

const PERCENT_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  { output: '%' },
  { output: 'del' },
];

const PERCENT_DECIMAL_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  { output: '%' },
  { output: '.' },
  { output: 'del', span: 3 },
];

const PERCENT_OPERATOR_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  ...OPERATOR_KEYS,
  { output: '%' },
  { output: 'del', span: 2 },
];

const PERCENT_EXPRESSION_KEYS: MathKeyboardKeyDefinition[] = [
  ...'1234567890'.split('').map((output) => ({ output })),
  ...OPERATOR_KEYS,
  { output: '%' },
  { output: '.' },
  { output: 'del' },
];

const mathDefinition = (
  columns: MathKeyboardDefinition['columns'],
  keys: MathKeyboardKeyDefinition[],
): MathKeyboardDefinition => ({ columns, keys });

const MATH_DEFINITIONS = {
  decimal: mathDefinition(3, DECIMAL_KEYS),
  percent: mathDefinition(3, PERCENT_KEYS),
  percentDecimal: mathDefinition(3, PERCENT_DECIMAL_KEYS),
  percentOperators: mathDefinition(5, PERCENT_OPERATOR_KEYS),
  percentExpression: mathDefinition(5, PERCENT_EXPRESSION_KEYS),
  fraction: mathDefinition(3, FRACTION_KEYS),
  decimalFraction: mathDefinition(3, DECIMAL_FRACTION_KEYS),
  mathExpression: mathDefinition(5, EXPRESSION_KEYS),
} as const;

export type MathKeyboardPresetId = keyof typeof MATH_DEFINITIONS;

export function isMathKeyboardPresetId(value: unknown): value is MathKeyboardPresetId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MATH_DEFINITIONS, value);
}

export function isMathKeyboardTheme(value: unknown): value is MathKeyboardTheme {
  return typeof value === 'string' && MATH_KEYBOARD_THEMES.includes(value as MathKeyboardTheme);
}

export function readMathKeyboardTheme(
  source: Pick<Element, 'props'> | Record<string, unknown> | null | undefined,
): MathKeyboardTheme {
  const props = source && 'props' in source
    ? (source.props as Record<string, unknown> | undefined)
    : source;
  return isMathKeyboardTheme(props?._mathKeyboardTheme)
    ? props._mathKeyboardTheme
    : DEFAULT_MATH_KEYBOARD_THEME;
}

export function getMathKeyboardThemeAssets(theme: MathKeyboardTheme, editor = false) {
  const resolve = editor ? assetSrc : assetExport;
  const prefix = `keyboard.math.${theme}`;
  return {
    bg: resolve(`${prefix}.bg`),
    keyNormal: resolve(`${prefix}.keyNormal`),
    keyActive: resolve(`${prefix}.keyActive`),
    wideNormal: resolve(`${prefix}.wideNormal`),
    wideActive: resolve(`${prefix}.wideActive`),
    glyphNormal: resolve(`${prefix}.glyphNormal`),
    glyphActive: resolve(`${prefix}.glyphActive`),
    delNormal: resolve(`${prefix}.delNormal`),
    delActive: resolve(`${prefix}.delActive`),
    fractionNormal: resolve(`${prefix}.fractionNormal`),
    fractionActive: resolve(`${prefix}.fractionActive`),
    arrow: resolve(`${prefix}.arrow`),
  };
}

export function getMathKeyboardLayout(definition: MathKeyboardDefinition): MathKeyboardLayout {
  let column = 0;
  let row = 0;
  const keys = definition.keys.map((key) => {
    const span = Math.max(1, Math.min(definition.columns, key.span ?? 1));
    if (column + span > definition.columns) {
      row += 1;
      column = 0;
    }
    const width = span * MATH_KEY_WIDTH + (span - 1) * MATH_KEY_GAP;
    const layoutKey = {
      ...key,
      span,
      x: MATH_BOARD_HORIZONTAL_PADDING + column * (MATH_KEY_WIDTH + MATH_KEY_GAP) + width / 2,
      y: MATH_BOARD_TOP_PADDING + row * (MATH_KEY_HEIGHT + MATH_KEY_GAP) + MATH_KEY_HEIGHT / 2,
      width,
      height: MATH_KEY_HEIGHT,
    };
    column += span;
    if (column === definition.columns) {
      row += 1;
      column = 0;
    }
    return layoutKey;
  });
  const rows = row + (column > 0 ? 1 : 0);
  const boardWidth = definition.columns * MATH_KEY_WIDTH
    + (definition.columns - 1) * MATH_KEY_GAP
    + MATH_BOARD_HORIZONTAL_PADDING * 2;
  const boardHeight = rows * MATH_KEY_HEIGHT
    + (rows - 1) * MATH_KEY_GAP
    + MATH_BOARD_TOP_PADDING
    + MATH_BOARD_BOTTOM_PADDING;
  return {
    columns: definition.columns,
    rows,
    boardWidth,
    boardHeight,
    elementWidth: boardWidth + MATH_BOARD_OFFSET_X * 2,
    elementHeight: MATH_BOARD_OFFSET_Y + boardHeight + MATH_ELEMENT_BOTTOM_SPACE,
    keys,
  };
}

const mathKey = (
  key: MathKeyboardLayout['keys'][number],
  theme: MathKeyboardTheme,
  editor = false,
): ExportChild => {
  const assets = getMathKeyboardThemeAssets(theme, editor);
  const isFraction = key.output === '<_>';
  const isDelete = key.output === 'del';
  const childForState = (active: boolean): ExportChild[] => {
    if (isDelete || isFraction) {
      return [{
        type: 'Image',
        props: {
          skin: isDelete
            ? (active ? assets.delActive : assets.delNormal)
            : (active ? assets.fractionActive : assets.fractionNormal),
          centerX: 0,
          centerY: active ? 2 : 0,
        },
      }];
    }
    return [{
      type: 'FontClip',
      props: {
        x: key.width / 2,
        y: MATH_KEY_HEIGHT / 2 + (active ? 2 : 0),
        anchorX: 0.5,
        anchorY: 0.5,
        value: key.output === '.'
          ? 'p'
          : key.output === '×'
            ? '*'
            : key.output === '÷'
              ? '/'
              : key.output,
        skin: active ? assets.glyphActive : assets.glyphNormal,
        sheet: MATH_KEY_SHEET,
      },
    }];
  };
  const state = (active: boolean): ExportChild => ({
    type: 'Image',
    props: {
      width: key.width,
      height: MATH_KEY_HEIGHT,
      skin: key.span > 1
        ? (active ? assets.wideActive : assets.wideNormal)
        : (active ? assets.keyActive : assets.keyNormal),
      sizeGrid: '0,28,0,28',
      name: active ? 'active' : 'normal',
    },
    child: childForState(active),
  });
  return {
    type: 'KlKey',
    props: {
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      anchorX: 0.5,
      anchorY: 0.5,
      output: key.output,
      runtime: 'com.klzz.ui.custom.KeyBoard.KlKey',
    },
    child: [state(false), state(true)],
  };
};

function mathKeyboardChildren(
  definition: MathKeyboardDefinition,
  theme: MathKeyboardTheme,
  editor = false,
): ExportChild[] {
  const layout = getMathKeyboardLayout(definition);
  const assets = getMathKeyboardThemeAssets(theme, editor);
  return [
    {
      type: 'Image',
      props: {
        x: MATH_BOARD_OFFSET_X,
        y: MATH_BOARD_OFFSET_Y,
        width: layout.boardWidth,
        height: layout.boardHeight,
        skin: assets.bg,
        sizeGrid: '53,52,57,52',
      },
    },
    {
      type: 'Image',
      props: {
        x: layout.elementWidth / 2,
        y: 0,
        skin: assets.arrow,
        name: 'arrow',
        anchorX: 0.5,
      },
    },
    {
      type: 'Box',
      props: {
        x: MATH_BOARD_OFFSET_X,
        y: MATH_BOARD_OFFSET_Y,
        width: layout.boardWidth,
        height: layout.boardHeight,
        name: 'keysBox',
      },
      child: layout.keys.map((key) => mathKey(key, theme, editor)),
    },
  ];
}

export function getMathKeyboardChildren(
  element: Pick<Element, 'props'>,
  editor = false,
): ExportChild[] | undefined {
  const presetId = (element.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
  if (!isMathKeyboardPresetId(presetId)) return undefined;
  return mathKeyboardChildren(MATH_DEFINITIONS[presetId], readMathKeyboardTheme(element), editor);
}

function mathPresetDefaultProps(sheet: string): Record<string, unknown> {
  return {
    anchorX: 0,
    anchorY: 0,
    sheet,
    pattern: 13,
    visible: false,
    isHide: true,
    fixed: true,
    disabled: false,
    _mathKeyboardTheme: DEFAULT_MATH_KEYBOARD_THEME,
  };
}

function mathPresetSize(definition: MathKeyboardDefinition) {
  const layout = getMathKeyboardLayout(definition);
  return { width: layout.elementWidth, height: layout.elementHeight };
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
    defaultSize: mathPresetSize(MATH_DEFINITIONS.decimal),
    defaultProps: mathPresetDefaultProps('0123456789.'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.decimal, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.decimal,
  },
  {
    id: 'percent',
    label: '数字百分比',
    thumbnail: assetSrc('keyboard.percent.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L12_PERCENT',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.percent),
    defaultProps: mathPresetDefaultProps('0123456789%'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.percent, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.percent,
  },
  {
    id: 'percentDecimal',
    label: '数字百分比与小数点',
    thumbnail: assetSrc('keyboard.percentDecimal.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L12_PERCENT_DECIMAL',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.percentDecimal),
    defaultProps: mathPresetDefaultProps('0123456789%.'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.percentDecimal, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.percentDecimal,
  },
  {
    id: 'percentOperators',
    label: '数字百分比与运算符',
    thumbnail: assetSrc('keyboard.percentOperators.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L12_PERCENT_OPERATORS',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.percentOperators),
    defaultProps: mathPresetDefaultProps('0123456789%+-*/=()'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.percentOperators, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.percentOperators,
  },
  {
    id: 'percentExpression',
    label: '数字百分比、运算符与小数点',
    thumbnail: assetSrc('keyboard.percentExpression.thumbnail'),
    compatibleInputTypes: ['KlInputImage'],
    campPrefix: 'L12_PERCENT_EXPRESSION',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.percentExpression),
    defaultProps: mathPresetDefaultProps('0123456789%+-*/=().'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.percentExpression, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.percentExpression,
  },
  {
    id: 'fraction',
    label: '分数输入',
    thumbnail: assetSrc('keyboard.fraction.thumbnail'),
    compatibleInputTypes: ['FractionInput'],
    campPrefix: 'L12_FRACTION',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.fraction),
    defaultProps: mathPresetDefaultProps('0123456789'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.fraction, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.fraction,
  },
  {
    id: 'decimalFraction',
    label: '小数与分数组合',
    thumbnail: assetSrc('keyboard.decimalFraction.thumbnail'),
    compatibleInputTypes: ['FractionInput'],
    campPrefix: 'L12_DECIMAL_FRACTION',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.decimalFraction),
    defaultProps: mathPresetDefaultProps('0123456789.'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.decimalFraction, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.decimalFraction,
  },
  {
    id: 'mathExpression',
    label: '数学表达式',
    thumbnail: assetSrc('keyboard.mathExpression.thumbnail'),
    compatibleInputTypes: ['FractionInput'],
    campPrefix: 'L12_MATH_EXPRESSION',
    defaultSize: mathPresetSize(MATH_DEFINITIONS.mathExpression),
    defaultProps: mathPresetDefaultProps('0123456789.+-×÷=()'),
    children: mathKeyboardChildren(MATH_DEFINITIONS.mathExpression, DEFAULT_MATH_KEYBOARD_THEME),
    math: MATH_DEFINITIONS.mathExpression,
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
  if (presetId === 'customAnswer') {
    return customAnswerKeyboardChildren(readCustomAnswerKeyboardConfig(element));
  }
  return preset.math
    ? mathKeyboardChildren(preset.math, readMathKeyboardTheme(element))
    : preset.children;
}
