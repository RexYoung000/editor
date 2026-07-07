export interface Action {
  id: string;
  event: string;        // 'onClick' | 'onLoad'
  targetId?: string;    // undefined = self
  actionType: string;   // 'setProperty' | 'toggleVisible' | 'changePage' | 'showOverlay' | 'hideOverlay'
  property?: string;    // for setProperty
  value?: unknown;
  spineLoop?: 'true' | 'false';  // animate target=Spine: loop playback control
  hideSelf?: boolean;            // onPlayEnd (Spine): 播放结束后先隐藏自身再执行动作
  groupId?: string;              // ActionEditor: 同一 event+target 共享多个动作时分组用
  branchId?: string;             // 子事件分组：同 branchId 的 actions 同属一个子事件块
  branchCondition?: 'right' | 'wrong' | 'null'; // 子事件的判定条件（全对/不全对/还没操作）
}

export interface Element {
  id: string;
  type: string;
  layaType?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  name?: string;
  locked?: boolean;
  parentId?: string;
  actions?: Action[];
  /** 编辑器可见性：true 时在画布上隐藏（不影响导出），存储在 props._editorHidden */
  props: Record<string, unknown>;
  // legacy — 旧数据兼容，新组件不使用
  content?: string; fontSize?: number; fontWeight?: string; color?: string;
  label?: string; backgroundImage?: string; placeholder?: string; showNumberPad?: boolean;
  videoUrl?: string; src?: string; loop?: boolean; objectFit?: string;
  borderRadius?: number; borderWidth?: number; borderColor?: string; backgroundColor?: string;
  selected?: boolean; selectedBgColor?: string; selectedBorderColor?: string; selectedColor?: string;
  choiceGroupId?: string; choiceGroupName?: string; imageUrl?: string; imageMode?: string;
  dragX?: number; dragY?: number; groupId?: string; boxShadow?: string; transition?: string;
}

export interface SubPage {
  id: string;
  name: string;
  elements: Element[];
  /** frozen = 不允许添加新组件 */
  frozen?: boolean;
}

export type Page = SubPage;

export interface Stage {
  id: string;
  name: string;
  shrinked?: boolean;
  /** noSubPages = 不允许添加小关卡 */
  noSubPages?: boolean;
  subPages: SubPage[];
}

export interface Course {
  id: string;
  kind?: 'normal' | 'homework' | 'sEvaluation' | 'review';  // 缺省 = 'normal'，旧数据兼容
  stages: Stage[];
  previewStages?: Stage[];     // 预习关卡，独立数组（可选以兼容旧数据）
  previewShrinked?: boolean;   // 预习区域折叠状态
  normalShrinked?: boolean;    // 正课区域折叠状态
  presetThumbnails?: Record<string, string>;
  feedback?: 'spirit' | 'newLD';  // 通用反馈动画，缺省 'spirit'（豌豆精灵）
}
