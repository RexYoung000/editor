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
  /** 内部页面动作目标。与元素 targetId 分开，避免页面和元素 ID 混用。 */
  pageTargetId?: string;
  /** 删除或移动目标后保留原名称，用于断链提示。 */
  pageTargetNameSnapshot?: string;
  /** 关闭弹窗后的单一后续页面动作，不额外占用动作序列位置。 */
  afterClose?: {
    type: 'navigate' | 'openDialog';
    pageTargetId: string;
    pageTargetNameSnapshot?: string;
  };
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
  /** 仅新“内部页面关卡”模板写入；缺省表示历史单页小关卡。 */
  editorModel?: 'internal-pages';
  templateId?: 'internal-pages-v1';
  schemaVersion?: 1;
  /** 主界面继续使用 elements；这里只保存内容页与弹窗。 */
  internalPages?: InternalPage[];
}

export type InternalPageKind = 'content' | 'dialog';

export interface DialogSettings {
  maskColor: string;
  maskOpacity: number;
  closeOnMask: boolean;
}

export interface InternalPage {
  id: string;
  name: string;
  kind: InternalPageKind;
  elements: Element[];
  dialogSettings?: DialogSettings;
  /** 内容页允许把“无入口”降级为暂不配置。 */
  noEntryDeferred?: boolean;
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
  requiredFeatures?: string[];
  minimumEditorVersion?: string;
}
