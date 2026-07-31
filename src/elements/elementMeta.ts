import { assetExport, assetSrc } from './builtinAssets';
import { DEFAULT_FONT_ID, normalizeFontLibraryId } from './fontLibrary';
import type { Element, SubPage } from '../types';

export const NEW_TEXT_DEFAULT_CONTENT = '双击编辑文本';

export interface PropertyDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder' | 'fontLibrary' | 'fontLocal' | 'matchingItemRef' | 'answerKeyboard' | 'mathKeyboardTheme' | 'inputTextTheme';
  /** 仅 type:'file' 时生效；undefined 时按 'image' 处理 */
  fileType?: 'image' | 'audio' | 'video';
  group?: string;
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  min?: number; max?: number; step?: number;
  elementFilter?: string[]; // elementRef 类型：只显示这些 layaType 的元素
  /** elementRef 类型：限定候选范围为指定类型祖先的子树（如 'DragViewBox' 限定为同一 DragViewBox 内的元素） */
  scopedToAncestorType?: string;
  /** 标记为高级字段：默认折叠在「高级设置」区，不在主属性面板显示 */
  advanced?: boolean;
  /** 鼠标悬停时显示的提示文案 */
  tooltip?: string;
}

/** 导出时的固定子节点描述（支持递归嵌套） */
export interface ExportChild {
  type: string;
  props: Record<string, unknown>;
  child?: ExportChild[];
  /** 该节点依赖但不直接出现在 props 中的运行时资源（如 Label 使用的 TTF）。 */
  resources?: string[];
  /** 注入子节点导出时把外层 element 的 width/height 写到 props（用于画板节点宽高跟随 Box） */
  inheritSize?: boolean;
  /** 注入子节点导出时从外层 element.props 搬运的字段名列表（搬过来后外层 props 会剥掉这些字段） */
  inheritProps?: string[];
  /** 注入子节点导出时接收外层 element 在 varAssignment 里分配到的 var 名；外层节点自身不写 var */
  inheritVar?: boolean;
}

export interface Meta {
  layaType: string;
  label: string;
  category: string;
  defaultSize: { width: number; height: number };
  defaultPosition?: { x: number; y: number };
  defaultProps: Record<string, unknown>;
  properties: PropertyDef[];
  /** 普通图片可在属性面板执行左右/上下镜像；状态保存在 Element.props。 */
  mirrorable?: boolean;
  /** 编辑模式下用 Laya Image 替代真实组件渲染时使用的占位图 URL（仅编辑模式生效，不影响导出） */
  placeholderImage?: string;
  /** 导出时强制注入的 runtime 属性（Laya UI 解析器据此实例化对应运行时类） */
  runtime?: string;
  /** 导出时强制注入的固定子节点（用户不可见、不可改），用于补齐 sdk_baiya 组件运行所需的皮肤结构。
   *  支持嵌套 child（如 KlBaseKeyboard 内含 KlKey，KlKey 内含 normal/active Image，Image 内含 FontClip） */
  exportChildren?: ExportChild[];
  /** 导出时在外层自动套一层包裹节点（如 KlInputImage 自动包进 KlInputBox）；只对顶层元素生效。
   *  若指定了 promoteProps，导出时会把这些 key 从内层 props 搬到包裹节点上 */
  exportWrapper?: {
    type: string;
    props: Record<string, unknown>;
    promoteProps?: string[];
  };
  /** 工具栏中隐藏此条目（用于组合创建的子元素，单独添加无意义） */
  toolbarHidden?: boolean;
  /** 创建后自动将 element.name 同步到 props.var（普通按钮等组件需要 var 与 name 一致） */
  varFromName?: boolean;
  /** 子元素属性代理：把父元素属性面板上的某字段路由到子元素的某属性。
   *  例如 DragObj 的「图片」字段写入第一个子 Image 的 skin。
   *  - childType: 子元素的 type
   *  - childProp: 子元素的 prop key
   *  - autoResizeParent: 加载图片后调整父元素尺寸到图片实际宽高 */
  proxyChildProps?: Record<string, { childType: string; childProp: string; autoResizeParent?: boolean }>;
}

export const CATEGORIES = [
  { id: 'commonComponents', label: '常用组件' },
  { id: 'speechCourse', label: '豌豆口才' },
];

// ─── 通用状态属性（所有元素类型自动合入，导出时转换为 Laya 运行时属性）───
const COMMON_STATE_PROPS: PropertyDef[] = [
  { key: 'hidden', label: '隐藏', type: 'boolean', group: '状态' },
  { key: 'blockThrough', label: '阻止穿透', type: 'boolean', group: '状态' },
];

/** FractionInput 的位图字体切片表，顺序必须与 img_w2Input.png 的 29 个格子一致。 */
export const FRACTION_INPUT_SHEET = '0123456789+-×÷=()><.tabcdxyπ²';

// ─── 常用属性模板 ───
const P_TEXT: PropertyDef[] = [
  { key: 'text', label: '文本', type: 'text', group: '文本' },
  { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
  { key: 'color', label: '颜色', type: 'color', group: '文本' },
  { key: 'bold', label: '粗体', type: 'boolean', group: '文本' },
  { key: 'italic', label: '斜体', type: 'boolean', group: '文本' },
  { key: 'align', label: '水平对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }], group: '文本' },
  { key: 'valign', label: '垂直对齐', type: 'select', options: [{ label: '顶部', value: 'top' }, { label: '居中', value: 'middle' }, { label: '底部', value: 'bottom' }], group: '文本' },
  { key: 'wordWrap', label: '自动换行', type: 'boolean', group: '文本' },
  { key: 'leading', label: '行间距', type: 'number', min: 0, group: '文本' },
  { key: 'stroke', label: '描边宽度', type: 'number', min: 0, group: '文本' },
  { key: 'strokeColor', label: '描边颜色', type: 'color', group: '文本' },
  { key: 'overflow', label: '溢出', type: 'select', options: [{ label: '隐藏', value: 'hidden' }, { label: '显示', value: 'visible' }], group: '文本' },
];
const P_LABEL: PropertyDef[] = [
  { key: 'label', label: '标签文本', type: 'text', group: '文本' },
  { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
  { key: 'color', label: '文字颜色', type: 'color', group: '文本' },
];
const P_SKIN: PropertyDef[] = [
  { key: 'skin', label: '皮肤', type: 'file', group: '外观' },
  { key: 'sizeGrid', label: '九宫格', type: 'text', group: '外观' },
];
const P_DISABLED: PropertyDef[] = [
  { key: 'disabled', label: '禁用', type: 'boolean', group: '状态' },
  { key: 'gray', label: '灰显', type: 'boolean', group: '状态' },
];
const P_FILTER: PropertyDef[] = [
  { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观' },
  { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观' },
];

// 皮肤自定义字段（下划线前缀，编辑器专用，不导出到 Laya）
const P_SKIN_EDIT_BTN: PropertyDef[] = [
  { key: '_bgColor', label: '背景色', type: 'color', group: '自定义皮肤' },
  { key: '_hoverColor', label: '悬停色', type: 'color', group: '自定义皮肤' },
  { key: '_pressColor', label: '按下色', type: 'color', group: '自定义皮肤' },
  { key: '_borderColor', label: '边框颜色', type: 'color', group: '自定义皮肤' },
  { key: '_borderWidth', label: '边框宽度', type: 'number', min: 0, max: 10, group: '自定义皮肤' },
  { key: '_borderRadius', label: '圆角', type: 'number', min: 0, max: 50, group: '自定义皮肤' },
];
const P_SKIN_EDIT_INPUT: PropertyDef[] = [
  { key: '_bgColor', label: '背景色', type: 'color', group: '自定义皮肤' },
  { key: '_borderColor', label: '边框颜色', type: 'color', group: '自定义皮肤' },
  { key: '_borderWidth', label: '边框宽度', type: 'number', min: 0, max: 10, group: '自定义皮肤' },
  { key: '_borderRadius', label: '圆角', type: 'number', min: 0, max: 50, group: '自定义皮肤' },
];
const P_SKIN_EDIT_CHECK: PropertyDef[] = [
  { key: '_bgColor', label: '选中色', type: 'color', group: '自定义皮肤' },
  { key: '_borderColor', label: '边框颜色', type: 'color', group: '自定义皮肤' },
];

// ─── 公共配置：KlInputImage ───
// 编辑模式仅占位渲染，导出时按 sdk_baiya 真实运行时结构展开（runtime + 3 张皮肤子节点）
// 资源路径走 builtinAssets 体系，所有内置资源集中在 src/elements/builtinAssets.ts 管理
const KL_INPUT_IMAGE_CONFIG = {
  runtime: 'com.klzz.ui.custom.KeyBoard.KlInputImage',
  defaultProps: {
    anchorX: 0, anchorY: 0,
    _judgeAnswer: '',
    _inputTextTheme: 'blue',
    _inputFontSize: 36,
    _inputFontReferenceWidth: 120,
    _inputFontReferenceHeight: 60,
    _inputFontPreview: '1234',
    place: 4,
    sheet: '0123456789°+-*/=().',
    fontClipSkin: assetExport('klInput.font'),
    canSelected: true,
    sizeGrid: '10,10,10,10',
  },
  exportChildren: [
    { type: 'Image', props: { skin: assetExport('klInput.bg'),     sizeGrid: '10,10,10,10',                  top:  0, right:  0, left:  0, bottom:  0 } },
    { type: 'Image', props: { skin: assetExport('klInput.active'), sizeGrid: '10,10,10,10', name: 'bg',      top: -2, right: -2, left: -2, bottom: -2 } },
    { type: 'Image', props: { skin: assetExport('klInput.wrong'),  sizeGrid: '10,10,10,10', name: 'wrong',   top: -2, right: -2, left: -2, bottom: -2, visible: false } },
  ],
  properties: [
    { key: '_judgeAnswer',  label: '正确答案',  type: 'text', group: '交互' },
    { key: 'place',         label: '输入位数',  type: 'number', min: 1 },
    { key: 'sheet',         label: '可输入字符', type: 'text' },
    { key: '_inputTextTheme', label: '文本颜色', type: 'inputTextTheme', group: '外观' },
    { key: 'fontClipSkin',  label: '字体图皮肤', type: 'file', group: '外观', advanced: true },
    { key: 'camp',          label: '阵营',     type: 'text', group: '交互' },
    { key: 'canSelected',   label: '可选中',    type: 'boolean', group: '交互' },
    { key: 'keyBoradID',    label: '键盘ID',   type: 'number', group: '交互' },
    { key: 'pattern',       label: '键盘样式',  type: 'number' },
  ] as PropertyDef[],
};

export const elementMeta: Record<string, Meta> = {
  Label:        { layaType: 'Label',       label: '文本',     category: 'basic', defaultSize: { width: 200, height: 40 },  defaultProps: { text: '新文本', fontSize: 16, color: '#333333', bold: false, wordWrap: true }, properties: [...COMMON_STATE_PROPS, ...P_TEXT] },
  ScaleButton:  { layaType: 'ScaleButton', label: '按钮',     category: 'basic', defaultSize: { width: 120, height: 40 },  runtime: 'com.klzz.ui.custom.ScaleButton', defaultProps: { anchorX: 0.5, anchorY: 0.5, label: '按钮', fontSize: 14, skin: 'share/comp/button.png', stateNum: 3, sizeGrid: '5,5,5,5', _bgColor: '#4A90D9', _hoverColor: '#5BA0E9', _pressColor: '#3A7BC8', _borderRadius: 8 }, properties: [...COMMON_STATE_PROPS, ...P_LABEL, ...P_SKIN, { key: 'stateNum', label: '状态数', type: 'select', group: '外观', options: [{ label: '1态(无变化)', value: 1 }, { label: '2态(正常/按下)', value: 2 }, { label: '3态(正常/悬停/按下)', value: 3 }] }, { key: 'labelColors', label: '文字颜色(4态)', type: 'text', group: '文本' }, ...P_DISABLED, ...P_SKIN_EDIT_BTN] },
  SoundButton:  { layaType: 'SoundButton', label: '音频', category: 'commonComponents', defaultSize: { width: 105, height: 106 }, placeholderImage: assetSrc('soundPlaceholder'), runtime: 'com.klzz.ui.custom.SoundButton', defaultProps: { anchorX: 0.5, anchorY: 0.5, skin: assetExport('soundPlaceholder'), soundPath: '', stateNum: 1, isNeedAni: false, showInStu: true }, properties: [...COMMON_STATE_PROPS, { key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'soundPath', label: '音频路径', type: 'file', fileType: 'audio', group: '交互' }, { key: 'stateNum', label: '状态数', type: 'select', group: '外观', options: [{ label: '1态(无变化)', value: 1 }, { label: '2态(正常/按下)', value: 2 }, { label: '3态(正常/悬停/按下)', value: 3 }] }, { key: 'isNeedAni', label: '播放动画', type: 'boolean', group: '交互' }, { key: 'showInStu', label: '学生端显示', type: 'boolean', group: '交互' }] },
  Image:        { layaType: 'Image',       label: '图片',     category: 'basic', mirrorable: true, defaultSize: { width: 200, height: 200 }, defaultProps: { skin: '' }, properties: [...COMMON_STATE_PROPS, { key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'sizeGrid', label: '九宫格', type: 'text', group: '外观' }, { key: 'anchorX', label: '锚点X', type: 'slider', min: 0, max: 1, step: 0.1, group: '外观' }, { key: 'anchorY', label: '锚点Y', type: 'slider', min: 0, max: 1, step: 0.1, group: '外观' }, ...P_DISABLED] },
  TextInput:    { layaType: 'TextInput',   label: '输入框',   category: 'basic', defaultSize: { width: 200, height: 40 },  defaultProps: { prompt: '请输入...', fontSize: 14, skin: 'share/comp/textinput.png', sizeGrid: '4,4,4,4', _bgColor: '#ffffff', _borderColor: '#d9d9d9', _borderRadius: 4 }, properties: [...COMMON_STATE_PROPS, { key: 'prompt', label: '占位文字', type: 'text', group: '文本' }, { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' }, { key: 'color', label: '文字颜色', type: 'color', group: '文本' }, { key: 'maxChars', label: '最大字数', type: 'number', min: 0, group: '交互' }, { key: 'restrict', label: '输入限制', type: 'text', group: '交互' }, { key: 'editable', label: '可编辑', type: 'boolean', group: '交互' }, { key: 'multiline', label: '多行', type: 'boolean', group: '交互' }, ...P_SKIN, ...P_SKIN_EDIT_INPUT] },
  CheckBox:     { layaType: 'CheckBox',    label: '复选框',   category: 'basic', defaultSize: { width: 100, height: 40 },  defaultProps: { label: '选项', skin: 'share/comp/checkbox.png', _bgColor: '#4A90D9', _borderColor: '#999999' }, properties: [...COMMON_STATE_PROPS, { key: 'label', label: '标签', type: 'text', group: '文本' }, { key: 'labelSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' }, { key: 'labelColors', label: '文字颜色', type: 'color', group: '文本' }, { key: 'selected', label: '选中', type: 'boolean' }, ...P_SKIN, ...P_SKIN_EDIT_CHECK] },
  Radio:        { layaType: 'Radio',       label: '单选框',   category: 'basic', defaultSize: { width: 100, height: 40 },  defaultProps: { label: '选项', skin: 'share/comp/radio.png', _bgColor: '#4A90D9', _borderColor: '#999999' }, properties: [...COMMON_STATE_PROPS, { key: 'label', label: '标签', type: 'text', group: '文本' }, { key: 'labelSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' }, { key: 'labelColors', label: '文字颜色', type: 'color', group: '文本' }, { key: 'value', label: '值', type: 'text' }, ...P_SKIN, ...P_SKIN_EDIT_CHECK] },
  RadioGroup:   { layaType: 'RadioGroup',  label: '单选组',   category: 'basic', defaultSize: { width: 300, height: 40 },  defaultProps: { skin: 'share/comp/radiogroup.png', labels: '选项1,选项2,选项3', space: 10, _bgColor: '#4A90D9', _borderColor: '#999999' }, properties: [...COMMON_STATE_PROPS, { key: 'labels', label: '标签列表', type: 'text', group: '文本' }, { key: 'labelSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' }, { key: 'labelColors', label: '文字颜色', type: 'color', group: '文本' }, { key: 'space', label: '间距', type: 'number' }, ...P_SKIN, ...P_SKIN_EDIT_CHECK] },
  ProgressBar:  { layaType: 'ProgressBar', label: '进度条',   category: 'basic', defaultSize: { width: 200, height: 20 },  defaultProps: { skin: 'share/comp/progress.png', value: 0.5, sizeGrid: '4,4,4,4', _bgColor: '#e0e0e0', _borderColor: '#4A90D9' }, properties: [...COMMON_STATE_PROPS, { key: 'value', label: '进度', type: 'slider', min: 0, max: 1, step: 0.01 }, ...P_SKIN, { key: '_bgColor', label: '背景色', type: 'color', group: '自定义皮肤' }, { key: '_borderColor', label: '进度条色', type: 'color', group: '自定义皮肤' }] },
  VSlider:      { layaType: 'VSlider',     label: '滑块',     category: 'basic', defaultSize: { width: 20, height: 100 },  defaultProps: { skin: 'share/comp/vslider.png' }, properties: [...COMMON_STATE_PROPS, { key: 'value', label: '值', type: 'number' }, ...P_SKIN] },
  Tab:          { layaType: 'Tab',         label: '标签页',   category: 'basic', defaultSize: { width: 300, height: 40 },  defaultProps: { skin: 'share/comp/tab.png', labels: '标签1,标签2,标签3', _bgColor: '#4A90D9', _borderColor: '#f0f0f0' }, properties: [...COMMON_STATE_PROPS, { key: 'labels', label: '标签列表', type: 'text', group: '文本' }, { key: 'labelSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' }, { key: 'labelColors', label: '文字颜色', type: 'color', group: '文本' }, ...P_SKIN, { key: '_bgColor', label: '选中色', type: 'color', group: '自定义皮肤' }, { key: '_borderColor', label: '未选中色', type: 'color', group: '自定义皮肤' }] },
  FontClip:     { layaType: 'FontClip',    label: '字体剪切', category: 'basic', defaultSize: { width: 100, height: 40 },  defaultProps: { value: '0123' }, properties: [...COMMON_STATE_PROPS, { key: 'value', label: '显示值', type: 'text' }, { key: 'skin', label: '字体图片', type: 'file' }, { key: 'sheet', label: '字符映射', type: 'text' }] },
  Box:          { layaType: 'Box',         label: '容器',     category: 'container', defaultSize: { width: 200, height: 150 }, defaultProps: {}, properties: [...COMMON_STATE_PROPS] },
  HBox:         { layaType: 'HBox',        label: '水平布局', category: 'container', defaultSize: { width: 300, height: 100 }, defaultProps: { space: 10 }, properties: [...COMMON_STATE_PROPS, { key: 'space', label: '间距', type: 'number' }] },
  VBox:         { layaType: 'VBox',        label: '垂直布局', category: 'container', defaultSize: { width: 100, height: 300 }, defaultProps: { space: 10 }, properties: [...COMMON_STATE_PROPS, { key: 'space', label: '间距', type: 'number' }] },
  Panel:        { layaType: 'Panel',       label: '面板',     category: 'container', defaultSize: { width: 300, height: 200 }, defaultProps: {}, properties: [...COMMON_STATE_PROPS] },
  List:         { layaType: 'List',        label: '列表',     category: 'container', defaultSize: { width: 300, height: 200 }, defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'repeatX', label: '水平重复', type: 'number', min: 0 }, { key: 'repeatY', label: '垂直重复', type: 'number', min: 0 }] },
  ViewStack:    { layaType: 'ViewStack',   label: '视图堆栈', category: 'container', defaultSize: { width: 300, height: 200 }, defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'selectedIndex', label: '当前索引', type: 'number', min: 0 }] },
  ChoiceBox:    { layaType: 'ChoiceBox',    label: '选择容器', category: 'choice', defaultSize: { width: 200, height: 200 }, defaultPosition: { x: 0, y: 0 }, placeholderImage: assetSrc('choiceBox.placeholder'), runtime: 'com.klzz.ui.custom.ChoiceBox', varFromName: true, defaultProps: { _correctOptionIds: [], filterColor: '#ffff00', filterBlur: 6 }, properties: [...COMMON_STATE_PROPS, ...P_FILTER] },
  KlInputBox:   { layaType: 'KlInputBox',  label: '输入框容器', category: 'choice', defaultSize: { width: 1920, height: 1080 }, defaultPosition: { x: 0, y: 0 }, defaultProps: {}, properties: [...COMMON_STATE_PROPS] },
  DragObj:      { layaType: 'DragObj',     label: '拖拽对象', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, placeholderImage: assetSrc('dragObjPlaceholder'), varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', filterColor: '#ffff00', filterBlur: 6, canSelect: 'false' }, properties: [{ key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'dropSkin', label: '放置位皮肤', type: 'file', group: '外观' }, { key: 'rightDropObjName', label: '正确目标', type: 'elementRef', group: '交互', elementFilter: ['DropObj'], scopedToAncestorType: 'DragViewBox' }, { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互', advanced: true }, { key: 'group', label: '分组', type: 'text', group: '交互', advanced: true }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canSelect', label: '可选中', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canOverlayDrop', label: '可重叠', type: 'boolean', group: '交互', advanced: true }, { key: 'isMoveEvent', label: '可移动', type: 'boolean', group: '交互', advanced: true }, { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观', advanced: true }, { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观', advanced: true }, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观', advanced: true }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观', advanced: true }] },
  DropObj:      { layaType: 'DropObj',     label: '放置区域', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, placeholderImage: assetSrc('dropObjPlaceholder'), varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', isNeedTip: false, noticeColor: '#ff0000', noticeBlur: 4 }, properties: [{ key: 'skin', label: '放置区皮肤', type: 'file', group: '外观' }, { key: 'tipSkin', label: '放置区提示图', type: 'file', group: '外观' }, { key: '_placedPreview', label: '放置后预览图（仅编辑器）', type: 'file', group: '外观' }, { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互', advanced: true }, { key: 'group', label: '分组', type: 'text', group: '交互', advanced: true }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'isNeedTip', label: '显示提示', type: 'boolean', group: '交互', advanced: true }, { key: 'showNotice', label: '提示边框', type: 'boolean', group: '外观', advanced: true }, { key: 'noticeColor', label: '提示颜色', type: 'color', group: '外观', advanced: true }, { key: 'noticeBlur', label: '提示模糊', type: 'number', min: 0, max: 20, group: '外观', advanced: true }, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观', advanced: true }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观', advanced: true }] },
  DragViewBox:  { layaType: 'DragViewBox', label: '拖拽容器', category: 'speechCourse', toolbarHidden: true, varFromName: true, defaultSize: { width: 1920, height: 1080 }, defaultPosition: { x: 0, y: 0 }, defaultProps: { mode: 1, successPosMode: 0, comDropNotice: true, dropNotice: 'true', clickPlace: 'false', changePos: 'true', backToInitPos: 'true', backAni: 'true', autoSorting: 'true' }, properties: [{ key: 'mode', label: '放置模式', type: 'select', group: '交互', options: [{ label: '鼠标位', value: 0 }, { label: '放置位', value: 1 }, { label: '自定义', value: 2 }, { label: '自动排列', value: 3 }] }, { key: 'dropNotice', label: '放置提示', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'clickPlace', label: '点击放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'changePos', label: '改变位置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backToInitPos', label: '失败返回', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backAni', label: '返回动画', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'autoSorting', label: '自动排序', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }] },
  DragDropBox:  { layaType: 'Box', label: '放置', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultProps: { mouseThrough: true, name: 'dropbox' }, properties: [] },
  DragDragBox:  { layaType: 'Box', label: '拖动', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultProps: { mouseThrough: true, name: 'dragbox' }, properties: [] },
  MatchingGame: {
    layaType: 'MatchingGame',
    label: '连线游戏',
    category: 'speechCourse',
    toolbarHidden: true,
    varFromName: true,
    defaultSize: { width: 1920, height: 1080 },
    defaultPosition: { x: 0, y: 0 },
    runtime: 'com.klzz.ui.custom.MatchingGame.MatchingGame',
    defaultProps: {
      mode: 3,
      direction: 0,
      single: 0,
      lineSkin: assetExport('matching.line'),
      wrongLineskin: assetExport('matching.wrongLine'),
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'direction', label: '连线方向', type: 'select', group: '交互', options: [
        { label: '左右', value: 0 },
        { label: '上下', value: 1 },
        { label: '中心点', value: 2 },
      ] },
      { key: 'mode', label: '连线模式', type: 'select', group: '交互',
        tooltip: '1为点击连线，2为鼠标滑动连线，3为可点可滑',
        options: [
          { label: '点击', value: 1 },
          { label: '滑动', value: 2 },
          { label: '可点可滑', value: 3 },
        ] },
      { key: 'single', label: '单线模式', type: 'select', group: '交互', options: [
        { label: '是', value: 0 },
        { label: '否', value: 1 },
      ] },
      { key: 'lineSkin', label: '连线皮肤', type: 'file', group: '外观' },
      { key: 'wrongLineskin', label: '连线错误提示皮肤', type: 'file', group: '外观' },
    ],
  },
  MatchingItem: {
    layaType: 'MatchingItem',
    label: '连线项',
    category: 'speechCourse',
    toolbarHidden: true,
    defaultSize: { width: 80, height: 80 },
    runtime: 'com.klzz.ui.custom.MatchingGame.MatchingItem',
    defaultProps: { filterColor: '#ffff00' },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'camp', label: '阵营', type: 'text', group: '交互' },
      { key: 'connectableCamps', label: '可连阵营', type: 'text', group: '交互' },
      { key: 'rightItemNames', label: '正确连接', type: 'matchingItemRef', group: '交互', tooltip: '选择正确配对的对方连线项' },
      { key: '_itemImage', label: '图片', type: 'file', group: '外观' },
      ...P_FILTER,
    ],
  },
  OneStrokeGame: { layaType: 'OneStrokeGame', label: '一笔画',   category: 'line', defaultSize: { width: 400, height: 300 }, runtime: 'com.klzz.ui.custom.OneStrokeGame', defaultProps: { mode: 1 }, properties: [...COMMON_STATE_PROPS, { key: 'mode', label: '模式', type: 'select', options: [{ label: '拖拽', value: 1 }, { label: '点击', value: 2 }] }] },
  OneStrokeItem: { layaType: 'OneStrokeItem', label: '一笔画项', category: 'line', defaultSize: { width: 60, height: 60 },   runtime: 'com.klzz.ui.custom.OneStrokeItem',   defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'connectItems', label: '可连接项', type: 'text' }] },
  MazeView:    { layaType: 'MazeView',    label: '迷宫',     category: 'maze', defaultSize: { width: 500, height: 400 }, runtime: 'com.klzz.ui.custom.MazeView.MazeView', defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'clickDragMode', label: '点击拖拽', type: 'boolean' }] },
  MazeMoveObj: { layaType: 'MazeMoveObj', label: '迷宫对象', category: 'maze', defaultSize: { width: 60, height: 60 },   runtime: 'com.klzz.ui.custom.MazeView.MazeMoveObj',   defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'camp', label: '阵营', type: 'text' }, { key: 'lineColor', label: '轨迹颜色', type: 'color' }] },
  MazeGoalObj: { layaType: 'MazeGoalObj', label: '迷宫目标', category: 'maze', defaultSize: { width: 60, height: 60 },   runtime: 'com.klzz.ui.custom.MazeView.MazeGoalObj',   defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'camp', label: '阵营', type: 'text' }] },
  BrushSprite:        { layaType: 'BrushSprite',        label: '画板',     category: 'effect', defaultSize: { width: 400, height: 300 }, runtime: 'com.klzz.ui.custom.BrushSprite', defaultProps: { brushMode: 1, brushColor: '#ec0626', thickness: 10 }, properties: [...COMMON_STATE_PROPS, { key: 'brushMode', label: '画笔模式', type: 'select', group: '交互', options: [{ label: '随意', value: 1 }, { label: '线段', value: 2 }, { label: '矩形', value: 3 }, { label: '圆形', value: 4 }, { label: '点', value: 5 }] }, { key: 'brushColor', label: '画笔颜色', type: 'color', group: '外观' }, { key: 'thickness', label: '画笔粗细', type: 'number', min: 1, max: 50, group: '外观' }, { key: 'brushFillColor', label: '填充颜色', type: 'color', group: '外观' }] },
  CountDown:          { layaType: 'CountDown',          label: '倒计时',   category: 'effect', defaultSize: { width: 200, height: 30 },  runtime: 'com.klzz.ui.custom.CountDown',  defaultProps: { allTime: 60 }, properties: [...COMMON_STATE_PROPS, { key: 'allTime', label: '总时间(秒)', type: 'number', min: 1, group: '交互' }, { key: 'type', label: '方向', type: 'select', group: '外观', options: [{ label: '竖向', value: 0 }, { label: '横向', value: 1 }] }, { key: 'mode', label: '模式', type: 'select', group: '外观', options: [{ label: '空白', value: 0 }, { label: '铺满', value: 1 }] }, { key: 'frames', label: '同步间隔(ms)', type: 'number', min: 10, group: '交互' }] },
  PriviewGuideFinger: { layaType: 'PriviewGuideFinger', label: '引导手指', category: 'effect', defaultSize: { width: 80, height: 80 },   runtime: 'com.klzz.ui.custom.PriviewGuideFinger',   defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'mode', label: '模式', type: 'select', group: '交互', options: [{ label: '点击', value: 1 }, { label: '拖拽', value: 2 }, { label: '滑动', value: 3 }] }, { key: 'tx', label: '目标X', type: 'number', group: '交互' }, { key: 'ty', label: '目标Y', type: 'number', group: '交互' }, { key: 'aniTime', label: '动画时长(ms)', type: 'number', group: '交互' }, { key: 'fingerDownSkin', label: '按下图片', type: 'file', group: '外观' }, { key: 'fingerUpSkin', label: '抬起图片', type: 'file', group: '外观' }] },
  ImageScaleTime:     { layaType: 'ImageScaleTime',     label: '图片缩放', category: 'effect', defaultSize: { width: 300, height: 300 }, runtime: 'com.klzz.ui.custom.BiaoDaSiKu.ImageScaleTime', defaultProps: {}, properties: [...COMMON_STATE_PROPS] },
  KlChangeColorBox:   { layaType: 'KlChangeColorBox',   label: '颜色滤镜', category: 'effect', defaultSize: { width: 200, height: 200 }, runtime: 'com.klzz.ui.custom.KlChangeColorBox', defaultProps: {}, properties: [...COMMON_STATE_PROPS, { key: 'fcolor', label: '滤镜颜色', type: 'color' }] },
  Video:    { layaType: 'Box',      label: '视频',     category: 'commonComponents', defaultSize: { width: 1920, height: 1080 }, defaultPosition: { x: 0, y: 0 }, placeholderImage: assetSrc('videoPlaceholder'), defaultProps: { videoUrl: '' }, properties: [...COMMON_STATE_PROPS, { key: 'videoUrl', label: '视频地址', type: 'file', fileType: 'video' }] },
  // Spine 骨骼动画（编辑模式下创建真实 Skeleton 实例，通过 Templet 加载 .sk 并播放动画）
  // - skin:           运行时加载的 .sk 路径（images/animation/<name>/<name>.sk），由 spineFolder 字段自动填写
  // - animationName:  默认播放的动画名（同一个 spineFolder 字段也会渲染动画名下拉框）
  // - _animationList: 动画名列表（编辑器 dropdown 用，下划线开头表示编辑器专用，导出剥掉）
  // Spine 骨骼动画（编辑模式下创建真实 Skeleton 实例，通过 Templet 加载 .sk 并播放动画）
  // 属性名对齐 LayaAir IDE .scene 格式：url / currAniName / stopAt / isLoop
  Spine:    { layaType: 'SkeletonPlayer', label: 'Spine 动画', category: 'commonComponents', defaultSize: { width: 400, height: 400 }, defaultProps: { url: '', currAniName: '', stopAt: 0, isLoop: 'false' }, properties: [...COMMON_STATE_PROPS, { key: 'url', label: '动画文件夹', type: 'spineFolder', group: '外观' }] },

  // ─── 新组件分类 ───
  // 编辑模式下不会创建真实 sdk_baiya 实例，统一用 Laya Image + 占位图渲染；导出时按 layaType 输出真实组件
  NewImage: { layaType: 'Image',       label: '图片',   category: 'commonComponents', mirrorable: true, defaultSize: { width: 200, height: 200 }, defaultPosition: { x: 0, y: 0 }, defaultProps: { skin: '' }, properties: [...COMMON_STATE_PROPS, { key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'sizeGrid', label: '九宫格', type: 'text', group: '外观' }] },
  // 双击进入行内编辑（HTML textarea 浮层），编辑模式下用 Laya Label 实时显示文字；
  // 此条目刻意未配置 placeholderImage —— 是 commonComponents「必须用 Image 占位」约定的破例（需要画布上 live 显示用户输入）。
  // 导出阶段由 exportProject.ts 的 bakeCourseAssets() 用 Canvas 2D 把文字烘焙成 PNG data URL，
  // 把元素就地替换成 type/layaType='Image'，下游流程对 NewTextArea 完全无感。
  NewTextArea: {
    layaType: 'TextArea',
    label: '文本',
    category: 'commonComponents',
    defaultSize: { width: 800, height: 62 },
    defaultPosition: { x: 560, y: 509 },
    defaultProps: {
      text: NEW_TEXT_DEFAULT_CONTENT,
      fontSize: 38,
      color: '#ffffff',
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
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'text', label: '文本', type: 'textarea', group: '文本' },
      { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200, group: '文本' },
      { key: 'color', label: '颜色', type: 'color', group: '文本' },
      { key: 'bold', label: '粗体', type: 'boolean', group: '文本' },
      { key: 'italic', label: '斜体', type: 'boolean', group: '文本' },
      { key: 'fontLibraryId', label: '字体', type: 'fontLibrary', group: '文本' },
      { key: 'fontLocalPath', label: '本地字体', type: 'fontLocal', group: '文本' },
      { key: 'align', label: '水平对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }], group: '文本' },
      { key: 'valign', label: '垂直对齐', type: 'select', options: [{ label: '顶部', value: 'top' }, { label: '居中', value: 'middle' }, { label: '底部', value: 'bottom' }], group: '文本' },
      { key: 'wordWrap', label: '自动换行', type: 'boolean', group: '文本' },
      { key: 'leading', label: '行间距', type: 'number', min: 0, group: '文本' },
      { key: 'textSizingMode', label: '尺寸模式', type: 'select', options: [
        { label: '自动宽高', value: 'auto' },
        { label: '固定宽度、自动高度', value: 'fixed-width' },
        { label: '固定宽高', value: 'fixed' },
      ], group: '布局' },
    ],
  },
  KlInputImage: { layaType: 'KlInputImage', label: '输入框', category: 'commonComponents', defaultSize: { width: 120, height: 60 }, placeholderImage: assetSrc('klInput.placeholder'), defaultProps: { ...KL_INPUT_IMAGE_CONFIG.defaultProps }, runtime: KL_INPUT_IMAGE_CONFIG.runtime, exportChildren: KL_INPUT_IMAGE_CONFIG.exportChildren, properties: [...COMMON_STATE_PROPS, ...KL_INPUT_IMAGE_CONFIG.properties.filter(p => p.key !== 'keyBoradID' && p.key !== 'pattern')] },
  FractionInput: {
    layaType: 'FractionInput',
    label: '分数输入框',
    category: 'commonComponents',
    defaultSize: { width: 360, height: 120 },
    // 编辑器直接使用普通输入框底图；配合 sizeGrid 避免宽分数框拉伸圆角。
    placeholderImage: assetSrc('klInput.bg'),
    runtime: 'Components.FractionInput',
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      _judgeAnswer: '',
      _inputTextTheme: 'blue',
      _inputFontSize: 42,
      _inputFontReferenceWidth: 360,
      _inputFontReferenceHeight: 120,
      _inputFontPreview: '12<3_4>',
      _inputFractionFontScale: 0.64,
      place: 11,
      sheet: FRACTION_INPUT_SHEET,
      lineSkin: assetExport('keyboard.math.fractionLine'),
      fontClipSkin: assetExport('keyboard.math.inputFont'),
      fontWidth: 42,
      fractionPlace: 3,
      fractionDigits: 4,
      contentScale: 0,
      spaceX: 0,
      align: 'center',
      canSelected: true,
      sizeGrid: '10,10,10,10',
    },
    exportChildren: KL_INPUT_IMAGE_CONFIG.exportChildren,
    properties: [
      ...COMMON_STATE_PROPS,
      { key: '_judgeAnswer', label: '正确答案', type: 'text', group: '交互' },
      { key: 'place', label: '最大字符数', type: 'number', min: 3, max: 60, group: '交互' },
      { key: 'camp', label: '阵营', type: 'text', group: '交互' },
      { key: 'canSelected', label: '可输入', type: 'boolean', group: '交互' },
      { key: '_inputTextTheme', label: '文本颜色', type: 'inputTextTheme', group: '外观' },
      { key: 'align', label: '内容对齐', type: 'select', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }], group: '外观' },
      { key: 'lineSkin', label: '分数线皮肤', type: 'file', group: '外观', advanced: true },
      { key: 'fontClipSkin', label: '数字字体图', type: 'file', group: '外观', advanced: true },
    ],
  },
  KlBaseKeyboard: {
    layaType: 'KlBaseKeyboard',
    label: '键盘',
    category: 'commonComponents',
    defaultSize: { width: 446, height: 436 },
    placeholderImage: assetSrc('keyboard.preset1.thumbnail'),
    runtime: 'com.klzz.ui.custom.KeyBoard.KlBaseKeyboard',
    defaultProps: {},
    properties: [
      ...COMMON_STATE_PROPS,
      { key: '_mathKeyboardTheme', label: '键盘皮肤', type: 'mathKeyboardTheme', group: '外观' },
      { key: '_customAnswerKeyboard', label: '答案配置', type: 'answerKeyboard', group: '交互' },
      { key: 'camp',    label: '阵营',     type: 'text',    group: '交互' },
      { key: 'sheet',   label: '可输入字符', type: 'text',  group: '交互' },
      { key: 'pattern', label: '键盘样式',  type: 'number', group: '交互' },
      { key: 'visible', label: '初始可见',  type: 'boolean', group: '外观' },
      { key: 'isHide',  label: '可隐藏',    type: 'boolean', group: '交互' },
      { key: 'fixed',   label: '固定位置',  type: 'boolean', group: '交互' },
      { key: 'disabled', label: '禁用', type: 'boolean', group: '状态' },
    ],
  },
  ConfirmButton: { layaType: 'ScaleButton', label: '确定按钮', category: 'commonComponents', defaultSize: { width: 238, height: 126 }, defaultPosition: { x: 160, y: 160 }, placeholderImage: assetSrc('okBtn.m_qddk_on'), varFromName: true, defaultProps: { anchorX: 0.5, anchorY: 0.5, skin: assetExport('okBtn.m_qddk_on'), stateNum: 1, label: '' }, properties: [...COMMON_STATE_PROPS] },
  NormalBtn: {
    layaType: 'ScaleButton',
    label: '普通按钮',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    defaultPosition: { x: 160, y: 160 },
    placeholderImage: assetSrc('okBtn.btn_dpon'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    varFromName: true,
    defaultProps: {
      anchorX: 0.5,
      anchorY: 0.5,
      skin: assetExport('okBtn.btn_dpon'),
      stateNum: 1,
      label: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'var', label: '变量名', type: 'text', group: '交互' },
      { key: 'skin', label: '图片', type: 'file', group: '外观' },
      { key: 'stateNum', label: '状态数', type: 'select', group: '外观', options: [{ label: '1态(无变化)', value: 1 }, { label: '2态(正常/按下)', value: 2 }, { label: '3态(正常/悬停/按下)', value: 3 }] },
    ],
  },
  NewTabImg: {
    layaType: 'Image',
    label: '标签图',
    category: 'commonComponents',
    defaultSize: { width: 210, height: 78 },
    placeholderImage: assetSrc('tabImg.img_lt_1'),
    defaultProps: { skin: assetExport('tabImg.img_lt_1'), mouseEnabled: false },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'skin', label: '皮肤', type: 'file', group: '外观' },
      { key: 'sizeGrid', label: '九宫格', type: 'text', group: '外观' },
    ],
  },
  ContainerBox: {
    layaType: 'Box',
    label: '容器Box',
    category: 'commonComponents',
    defaultSize: { width: 300, height: 300 },
    defaultPosition: { x: 200, y: 200 },
    placeholderImage: assetSrc('containerBox.placeholder'),
    defaultProps: { _inputRuleEnabled: false },
    properties: [
      ...COMMON_STATE_PROPS,
      {
        key: '_inputRuleEnabled',
        label: '启用答题判定',
        type: 'boolean',
        group: '交互',
        tooltip: '开启后，容器内输入框可建立算式关系并作为一组统一判定；关闭时保留配置，输入框恢复独立判定。',
      },
    ],
  },
  // ─── 画笔组件（commonComponents 分类，组合创建：Box + SelectableObj + ScaleButton；导出时注入 SDK 已注册的 BrushSprite 子节点）───
  NewBrushSprite: {
    layaType: 'Box',
    label: '画笔',
    category: 'commonComponents',
    defaultSize: { width: 1920, height: 1080 },
    defaultPosition: { x: 0, y: 0 },
    defaultProps: {
      brushMode: 1,
      brushColor: '#ec0626',
      thickness: 10,
      brushFillColor: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'brushMode', label: '画笔模式', type: 'select', group: '交互',
        options: [
          { label: '随意', value: 1 },
          { label: '线段', value: 2 },
          { label: '矩形', value: 3 },
          { label: '圆形', value: 4 },
          { label: '点',   value: 5 },
        ] },
      { key: 'brushColor',     label: '画笔颜色', type: 'color',  group: '外观' },
      { key: 'thickness',      label: '画笔粗细', type: 'number', min: 1, max: 50, group: '外观' },
      { key: 'brushFillColor', label: '填充颜色', type: 'color',  group: '外观' },
    ],
    exportChildren: [
      {
        type: 'BrushSprite',
        inheritSize: true,
        inheritProps: ['brushMode', 'brushColor', 'thickness', 'brushFillColor'],
        inheritVar: true,
        props: {
          x: 0,
          y: 0,
          visible: false,
          group: -1,
        },
      },
    ],
  },
  BrushDrawBtn: {
    layaType: 'SelectableObj',
    label: '画笔开关',
    category: 'commonComponents',
    toolbarHidden: true,
    defaultSize: { width: 107, height: 109 },
    defaultPosition: { x: 1781, y: 566 },
    placeholderImage: assetSrc('newBrushSprite.drawBtn'),
    runtime: 'com.klzz.ui.custom.SelectableObj',
    defaultProps: {
      isSelected: false,
      anchorX: 0,
      anchorY: 0,
      filterColor: '#ffff00',
      filterBlur: 6,
      _foregroundSkin: assetExport('newBrushSprite.drawBtn'),
      _bgSkin:         assetExport('newBrushSprite.drawBtnBg'),
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: '_foregroundSkin', label: '前景图（笔图标）', type: 'file', group: '外观' },
      { key: '_bgSkin',         label: '选中态背景图',     type: 'file', group: '外观' },
    ],
  },
  BrushClearBtn: {
    layaType: 'ScaleButton',
    label: '画笔清空',
    category: 'commonComponents',
    toolbarHidden: true,
    defaultSize: { width: 100, height: 100 },
    defaultPosition: { x: 1781, y: 705 },
    placeholderImage: assetSrc('newBrushSprite.clearBtn'),
    runtime: 'com.klzz.ui.custom.ScaleButton',
    defaultProps: {
      anchorX: 0,
      anchorY: 0,
      skin: assetExport('newBrushSprite.clearBtn'),
      stateNum: 1,
      label: '',
      visible: true,
      hidden: true,
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
    ],
  },
  // ─── 口才课组件：翻页组件（组合创建，工具栏只显示"翻页组件"入口按钮）───
  PageTurnLeftBtn: {
    layaType: 'ScaleButton',
    label: '翻页左按钮',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    defaultPosition: { x: 181, y: 540 },
    placeholderImage: assetSrc('pageTurn.btnLeft'),
    toolbarHidden: true,
    defaultProps: {
      anchorX: 0.5,
      anchorY: 0.5,
      skin: assetExport('pageTurn.btnLeft'),
      stateNum: 1,
      label: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
    ],
  },
  PageTurnRightBtn: {
    layaType: 'ScaleButton',
    label: '翻页右按钮',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    defaultPosition: { x: 1739, y: 540 },
    placeholderImage: assetSrc('pageTurn.btnRight'),
    toolbarHidden: true,
    defaultProps: {
      anchorX: 0.5,
      anchorY: 0.5,
      skin: assetExport('pageTurn.btnRight'),
      stateNum: 1,
      label: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'skin', label: '按钮图片', type: 'file', group: '外观' },
    ],
  },
  PageTurnBox: {
    layaType: 'Box',
    label: '翻页管理',
    category: 'speechCourse',
    defaultSize: { width: 100, height: 100 },
    defaultPosition: { x: 0, y: 0 },
    placeholderImage: assetSrc('containerBox.placeholder'),
    toolbarHidden: true,
    defaultProps: {
      currentPageIndex: 0,
      sizeGrid: '10,10,10,10',
      buttonType: 'both',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'buttonType', label: '按钮类型', type: 'select', group: '交互', options: [
        { label: '左右箭头', value: 'arrows' },
        { label: '标签按钮', value: 'tabs' },
        { label: '两种都有', value: 'both' },
      ] },
    ],
  },
  // ─── 口才课选择题：选项卡片（组合创建，toolbarHidden）───
  SpeechSelectableObj: {
    layaType: 'SelectableObj',
    label: '选项卡片',
    category: 'speechCourse',
    defaultSize: { width: 121, height: 122 },
    placeholderImage: assetSrc('selectableObj.placeholder'),
    toolbarHidden: true,
    runtime: 'com.klzz.ui.custom.SelectableObj',
    defaultProps: {
      isSelected: false,
      anchorX: 0.5,
      anchorY: 0.5,
      filterColor: '#ffff00',
      filterBlur: 6,
      cus1: '',
      cus2: '',
      _foregroundSkin: assetExport('selectableObj.btn1'),
      _pressedSkin: '',
      _bgSkin: '',
      _correctSkin: '',
      _wrongSkin: '',
    },
    properties: [
      ...COMMON_STATE_PROPS,
      { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观' },
      { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观' },
      { key: '_foregroundSkin', label: '未选中时的图片', type: 'file', group: '外观' },
      { key: '_pressedSkin', label: '按下时的图片', type: 'file', group: '外观' },
      { key: '_bgSkin', label: '选中时的图片', type: 'file', group: '外观' },
      { key: '_correctSkin', label: '正确时的描边', type: 'file', group: '外观' },
      { key: '_wrongSkin', label: '错误时显示的图片', type: 'file', group: '外观' },
    ],
  },
};

const _typeCounters: Record<string, number> = {};
let _elIdSeq = 0;

/**
 * 每个 SubPage 的局部类型计数器，按 subPageId 索引。
 * 模块级 Map，不进入 store，规避 immer autoFreeze 导致的写入失败。
 * 每次打开课件时由 rebuildSubPageCounters 重建，旧课件无字段也能正确推断。
 */
const _subPageCounters = new Map<string, Record<string, number>>();

/**
 * 扫描课件所有 SubPage 的元素，按 subPageId 重建 _subPageCounters。
 * 调用时机：setCurrentCourse / loadCourse 时一次性调用。
 * 旧课件没有持久化字段，全靠扫描元素 name 的 "Type_数字" 后缀推断最大序号。
 */
export function rebuildSubPageCounters(allSubPages: Iterable<SubPage>): void {
  _subPageCounters.clear();
  for (const sp of allSubPages) {
    const counters: Record<string, number> = {};
    for (const el of sp.elements) {
      // 匹配 "Type_数字" 格式，如 "MatchingGame_2"
      const match = el.name?.match(/^(.+?)_(\d+)$/);
      if (match) {
        const [, type, numStr] = match;
        const num = parseInt(numStr, 10);
        if (!isNaN(num)) {
          counters[type] = Math.max(counters[type] ?? 0, num);
        }
      }
    }
    _subPageCounters.set(sp.id, counters);
  }
}

/**
 * 回退指定 SubPage 的某类型计数器（减 1，最低保持为 0）。
 * 用于固定名字（如 `_matchBox`）不占用 `${类型}_${序号}` 序号位的场景。
 * 调用时机：紧跟一次 createDefaultElement 之后，才能把刚刚预占的序号还回去。
 */
export function decrementSubPageCounter(subPageId: string | undefined, type: string): void {
  if (!subPageId) return;
  const counters = _subPageCounters.get(subPageId);
  if (!counters) return;
  counters[type] = Math.max(0, (counters[type] ?? 0) - 1);
}

export function createDefaultElement(type: string, subPageId?: string): Element {
  const meta = elementMeta[type];
  if (!meta) console.warn('[elementMeta] Unknown type:', type);

  // 有 subPageId：用 SubPage 局部计数器；否则 fallback 到全局计数器（兼容过渡期）
  let counters: Record<string, number>;
  if (subPageId) {
    counters = _subPageCounters.get(subPageId) ?? {};
    if (!_subPageCounters.has(subPageId)) _subPageCounters.set(subPageId, counters);
  } else {
    counters = _typeCounters;
  }
  counters[type] = (counters[type] ?? 0) + 1;

  const extraProps: Record<string, unknown> = {};
  if (type === 'NewTextArea') {
    try {
      const last = localStorage.getItem('forge_lastFontLibraryId');
      if (last) {
        const normalized = normalizeFontLibraryId(last);
        extraProps.fontLibraryId = normalized;
        if (normalized !== last) localStorage.setItem('forge_lastFontLibraryId', normalized);
      }
    } catch { /* localStorage 失败时不干预 */ }
  }
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${(_elIdSeq++).toString(36)}`,
    type,
    layaType: meta?.layaType ?? 'Box',
    name: `${type}_${counters[type]}`,
    x: meta?.defaultPosition?.x ?? 100, y: meta?.defaultPosition?.y ?? 100,
    ...(meta?.defaultSize ?? { width: 100, height: 100 }),
    opacity: 1, rotation: 0, actions: [],
    props: {
      ...(meta?.defaultProps ?? {}),
      ...extraProps,
      ...(meta?.varFromName ? { var: `${type}_${counters[type]}` } : {}),
    },
  } as Element;
}

export function getUniqueElementName(baseName: string, existingNames: Iterable<string>): string {
  const used = new Set(Array.from(existingNames).filter(Boolean));
  if (!used.has(baseName)) return baseName;
  let index = 2;
  while (used.has(`${baseName}_${index}`)) {
    index += 1;
  }
  return `${baseName}_${index}`;
}

/**
 * 为固定格式的编号命名生成下一个序号（如 dj1, l2, aj3）。
 * 扫描同父节点下匹配 `^prefix(\d+)$` 的 element.name，提取数字，返回 "最大序号 + 1"。
 *
 * 用于 DropObj / DragObj / 普通方向连线项的添加和粘贴，避免删除中间项后再添加产生重复 name。
 *
 * @param prefix - 前缀（如 'dj', 'aj', 'l', 'r', 't', 'b'）
 * @param elements - 当前页面所有元素
 * @param parentId - 父节点 ID（局部去重，undefined 表示页面根级）
 */
export function getNextNumberedName(prefix: string, elements: Element[], parentId: string | undefined): string {
  const siblings = elements.filter(e => e.parentId === parentId);
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}(\\d+)$`);
  let maxNum = 0;
  for (const el of siblings) {
    const match = el.name?.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${maxNum + 1}`;
}

/**
 * 中心点连线（direction=2）专用：camp1 用奇数序号、camp2 用偶数序号，序号差总是 2。
 *
 * 扫描同父节点下匹配 `^item(\d+)$` 的 element.name，按 camp 分流：
 * - camp1（左/奇数）：找最大奇数，下一个 = 该奇数 + 2（空时返回 item1）
 * - camp2（右/偶数）：找最大偶数，下一个 = 该偶数 + 2（空时返回 item2）
 *
 * @param elements - 当前页面所有元素
 * @param parentId - 父节点 ID（通常是 _matchBox 的 id）
 * @param camp - 'camp1'（奇数）或 'camp2'（偶数）
 */
export function getNextItemNameForCenterMatch(elements: Element[], parentId: string | undefined, camp: 'camp1' | 'camp2'): string {
  const siblings = elements.filter(e => e.parentId === parentId);
  const wantOdd = camp === 'camp1';
  let maxNum = 0;
  for (const el of siblings) {
    const match = el.name?.match(/^item(\d+)$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (isNaN(num)) continue;
    const isOdd = num % 2 === 1;
    if (isOdd === wantOdd && num > maxNum) maxNum = num;
  }
  if (maxNum === 0) return wantOdd ? 'item1' : 'item2';
  return `item${maxNum + 2}`;
}

export function normalizeElementNames(elements: Element[]): Element[] {
  const usedVars = new Set<string>();
  return elements.map((element) => {
    if (!elementMeta[element.type]?.varFromName) return element;
    const baseVar = (element.props?.var as string | undefined)?.trim() || element.name?.trim() || `${element.layaType || element.type}_1`;
    const uniqueVar = getUniqueElementName(baseVar, usedVars);
    usedVars.add(uniqueVar);
    if (uniqueVar === element.props?.var) return element;
    return { ...element, props: { ...element.props, var: uniqueVar } };
  });
}
