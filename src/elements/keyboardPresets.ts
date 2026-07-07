// 键盘预设：每个预设包含完整的 KlBaseKeyboard 子节点结构
// 用户在编辑器添加键盘时弹出选择对话框，挑选预设后只把 `id` 写入 element.props._keyboardPreset
// 导出时（exportProject / exportPreviewProject / collectResourceRefs）通过 getKeyboardPreset(id)
// 反查到预设的 children 作为 fixedChildren，children 不进入课件 JSON 体积
//
// 资源路径走 builtinAssets 体系（src/elements/builtinAssets.ts）：
//   - 编辑器加载用 assetSrc(id)
//   - 发布到课件包用 assetExport(id)

import { assetExport, assetSrc } from './builtinAssets';

export interface ExportChild {
  type: string;
  props: Record<string, unknown>;
  child?: ExportChild[];
}

export interface KeyboardPreset {
  id: string;
  label: string;
  thumbnail: string;
  /** 自动 camp 编号前缀：拖入第 N 个该预设时，camp = `${campPrefix}-${N}`（如 'L11_1' → L11_1-1, L11_1-2…）*/
  campPrefix: string;
  defaultProps: Record<string, unknown>;
  defaultSize: { width: number; height: number };
  children: ExportChild[];
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

export const KEYBOARD_PRESETS: KeyboardPreset[] = [
  {
    id: 'preset1',
    label: '键盘1',
    thumbnail: assetSrc('keyboard.preset1.thumbnail'),
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
];

export function getKeyboardPreset(id: string): KeyboardPreset | undefined {
  const preset = KEYBOARD_PRESETS.find((p) => p.id === id);
  if (!preset) {
    console.error(`[keyboardPresets] 未知键盘预设 id: "${id}"，相关键盘元素将无按键、无资源`);
  }
  return preset;
}
