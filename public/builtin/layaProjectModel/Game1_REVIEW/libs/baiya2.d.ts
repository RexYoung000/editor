declare module com.klzz.pattern {

	/**
	 * Author: Evans<br/>
	 * Desc: 主题
	 */
	interface ISubject {

		/**
		* 注册观察者
		*/
		regObserver(obs: IObserver): void;
		/**
		* 移除观察者
		*/
		rmObserver(obs: IObserver): void;
		/**
		* 通知观察者
		*/
		notifyObservers(): void;

		/** 改变的数据  */
		changed(): any;

		changed(v: any): void;
	}

	interface IObserver {
		update(subj: ISubject): void;
	}

}
declare module com.biz.ui {

	class FeedbackView extends Laya.Sprite {
             showAnswerFace(type: number);
	}
	class FunctionShell extends Laya.View {
		functionView: any;
	}
}
declare module com.biz.ui {
	class MyViewManager extends com.klzz.ui.ViewManager implements com.klzz.pattern.IObserver {
		update(subj: com.klzz.pattern.ISubject): void;
		feedBackView: FeedbackView;
		playVideo(videoUrl, type, autoPlay, hide?, fill?, videoX?, videoY?, videoWidth?, videoHeight?): void;
		clearLocalVideo(): void;
		onVideoViewCommand(param): void;
		functionShell: FunctionShell;
		currPageIdx: number;
	}
}

declare module com.biz.common {

  class Reporter {
    static reportSLS(event: String, data?: any, context?: any);
  }
}

declare module com.biz {
	class VipThink {
		static __init__(): void;
		static viewMgr: com.biz.ui.MyViewManager;
		static user: any;
		static callSdkExtend(cmd: string, ...args): void;
		static isAI: boolean;
		static nativeAPI: com.biz.native.INative;
		static userStatus: any;
	}
}

declare module com.klzz.game {
	class KlEventCenter {
		static event(type: String, data: any): Boolean
		static on(type: String, caller: any, listener: Function, args: any): Laya.EventDispatcher;
		static off(type: string,caller: any,listener: Function,onceOnly?: any);
		static offAll(type: string);
	}
}

declare module com.biz.native {
	interface INative {
		nextSubj(): void;
		prevSubj(): void;
	}
}
declare module com.biz.extend {
	class ExtendCMDNames {

		/**
		 * 互动课堂上报数据
		 *  
		 */
		static REPORT_INTERACTION_CLASS: string;

		/**
		 * 提交答案
		 *  
		 */
		static SUBMIT_ANSWER: string;

		/**
		 * 反馈
		 *  
		 */
		static FEEDBACK: string;

	}
	class ExtendConst {
		static ANSWER_NONE;//没有作答
		static ANSWER_RIGHT;//答案正确
		static ANSWER_WRONG;//答案错误

		static ACTION_FINISH: string;//当前关卡结束（预留）

		static ACTION_ANSWER_RIGHT_ANI_COMPLETE: string;//答案对动画结束
		static ACTION_ANSWER_WRONG_ANI_COMPLETE: string;//答案错动画结束

	}
}


declare module com.biz.ui {
	class IEva {
		result(): any;
		result(v: any): void;
		checkResult():void;
		sound: string;
		desc: string;
		sync(prop: string, oriVal: any, toVal: any, cls?: string): void;
	}


}
declare module com.biz.ui {
	class IHomeWorkOnline extends IEva {

	}
	class IStageEvaluation extends IEva {

	}
	class IAfterClassPractice extends IEva {

	}

	class IGdEvaluation extends IEva {

	}
}
interface ISevaluation extends com.biz.ui.ISevaluation {

}

declare module com.biz.ui {
	interface ISevaluation extends IEva {
	}
}

declare module com.klzz.ui.custom.KeyBoard.ui {
	class KeyBoard13UI { }
}

declare module com.klzz.ui.custom.MazeView {
	class MazeView extends KlView {
		//属性
		moveObjIndex: number;
		clickDragMode: boolean;
		SpDrawLineBox: Laya.Box;
		MoveObjBox: Laya.Box;
		BoxMazePoly: Laya.Box;
		BoxGoal: Laya.Box;
		checkFreqScal: number;
		onArriveGoalHandler: Laya.Handler;
	}
}

declare module com.klzz.ui.custom.MazeView {
	class MazeMoveObj extends KlBox {
		//属性
		needDrawLine: boolean;
		lineColor: string;
		lineWidth: string;

	}
}

declare module com.klzz.ui.custom.MazeView {
	class MazeGoalObj extends KlBox {


	}
}

declare module com.klzz.ui.custom.DragView {
	class DragView extends KlView {
		successHandler: Laya.Handler;
		faildHandler: Laya.Handler;
		dragsOnRightDrops(): boolean;
		dragsOnDropsIsNull(): boolean;
		dragObjBackCondition(evt, slcDragObj: DragObj, hitDragObj: DragObj, dropObj: DropObj);
		getDragByDrop(drop: DropObj): any;
		onMouseDownHandler: Laya.Handler;
		onMouseMoveHandler: Laya.Handler;
		onMouseUpHandler: Laya.Handler;
		onSelectHandler: Laya.Handler;
		resetSingleDragObj(drag: DragObj): void;
		resetAllDragObj(): void;
		successPosMode: number;
		BoxDrag: Laya.Box;
		BoxDrop: Laya.Box;
		slcDragObj: DragObj;
		reInit();
		clear();
		mode: number;
		dragsAllDrop();
		initBoxDragData: object;
		initBoxDropData: object;
		recordSlcDragObj(drag: DragObj);
		getDragByMode3DropPos(arr:Array<any>):DragObj;
		lastX: number;
		lastY: number;
	}
}

declare module com.klzz.ui.custom.DragView {
	class DragObj extends KlBox implements IDragAndDrop {
		type(): string;
		cusAttribute: string;
		cusAttribute1: string;
		group: string;
		hasDrop: boolean;
		rightDropObjName: string;
		canSelect: boolean;
		isSelect: boolean;
	}
}
declare module com.klzz.ui.custom.DragView {
	class DropObj extends KlBox implements IDragAndDrop {
		type(): string;
		group: string;
		cusAttribute: string;
		cusAttribute1: string;
		clearTween();
		hasDrop: boolean;
		isNeedTip: boolean;
		arrangePos: any; // 自动排列坐标数组
		getHitDrop: boolean; // 是否可以吸附 默认是true
		_showTipHanler: Laya.Handler;//提示框功能回调
		showNotice: boolean;//dropObj提示图片是否显示
	}
}

declare module com.klzz.ui.custom.DragView {
	interface IDragAndDrop {
		type(): string;
	}
}

declare module com.klzz.ui.custom {
	class DragViewBox extends KlBox {
		EVENT_DRAGOBJBACK: string;
		EVENT_SUCCESS: string;
		EVENT_FAILD: string;
		mode: number;
		successPosMode: number;
		backAni: boolean;
		changePos: boolean;
		backToInitPos: boolean;
		slcDragObj: com.klzz.ui.custom.DragView.DragObj;
		getDragByDrop(drop: com.klzz.ui.custom.DragView.DropObj):any;
		onUNDISPLAY();
		onDisPlay();
		init();
		reInit();
		onSelectHandler: Laya.Handler;
		onMouseDownHandler: Laya.Handler;
		onMouseMoveHandler: Laya.Handler;
		onMouseUpHandler: Laya.Handler;
		resetAllDragObj(): void;
		resetSingleDragObj(drag: com.klzz.ui.custom.DragView.DragObj): void;
		dragsOnRightDrops(): boolean;
		dragsOnDropsIsNull(): boolean;
		successHandler: Laya.Handler;
		faildHandler: Laya.Handler;
		BoxDrag(): Laya.Box;
		BoxDrop(): Laya.Box;
		dragsAllDrop();
		initBoxDragData: object;
		initBoxDropData: object;
		dragObjBackCondition(evt, slcDragObj: com.klzz.ui.custom.DragView.DragObj, hitDragObj: com.klzz.ui.custom.DragView.DragObj, dropObj: com.klzz.ui.custom.DragView.DropObj);
		dragObjBack: Object;
		lastX: number;
		lastY: number;
	}
}

declare module com.klzz.ui {
	class KlSprite extends Laya.Sprite implements ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls?: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}
}

declare module com.klzz.ui.custom {
	class BrushSprite extends KlSprite implements ISyncComp {
		brushFillColor: string;
		thickness: number;
		thickTime: number;
		brushColor: string;
		brushMode: number;
		clearDraw();
	}
}

declare module com.klzz.ui.custom.MatchingGame {
	class MatchingGame extends KlBox {
		delLine(itemName1, itemName2);
		onLineClick(evt);
		onDisPlay();
		onReady();
		getAllRIghtLinesNames();
		gainLianLinesNames();
		isNull();
		wrongLineTips();
		wrongLineRest();
		reset();
		onClick(): Laya.Handler;
		onItemMouseDown: Laya.Handler;
		onMouseMove: Laya.Handler;
		onMouseUp: Laya.Handler;
		checkIsAllRight();
		allRight: boolean;
		allNull: boolean;
		allLine: boolean;
		currItemName: string;
		lastItemName: string;
		static EVENT_ALLRIGHT;
		static Event_RIGHT;
		static EVENT_LINE;
		static EVENT_WRONG;
		static EVENT_CLICKLINE;
		static EVENT_MATCHITEM_READY;
	}
}

declare module com.klzz.ui.custom.MatchingGame {
	class MatchingItem extends KlBox {
		isSelected: boolean;
		camp: any;
		isRight: boolean;
		onDisplay();
		reset();
		compareTwoArr();
		compareTwoArr_Or();
		delDuiyingName(lineName);
		duiyingNameArr: Array<string>;
		connectableCamps: string;
	}
}

/**
 *  spine 动画 声明文件
 */
declare module com.klzz.ui {

	import EventDispatcher = laya.events.EventDispatcher;

	class KlSkeleton1 extends Laya.Skeleton implements ISyncComp {

		showSelf(): void;

		isLoop(value: boolean): void;

		isLoop(): boolean;

		mIndex(): number;

		mIndex(value: number): void;

		handlerOnData(): any;

		handlerOnceData(): any;

		skeSkin: string;

		currAniName: string;

		stopAtStart();
		stopAtEnd();

		stopAtEnd();

		on(type: string, caller: any, listener: Function, args?): EventDispatcher;

		once(type: string, caller: any, listener: Function, args?): EventDispatcher;
		sync(prop: string, oriVal: any, toVal: any, cls: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}

	class ViewManager extends EventDispatcher {

	}

	interface ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}

}

declare module com.klzz.ui {
	import Box = laya.ui.Box;
	class KlBox extends Box implements ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls?: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}
}
declare module com.biz.ui {
	interface IAfterClassEva {
		knowledge(): number;
		difficulty(): number;
	}
}

declare module com.klzz.ui {
	import View = laya.ui.View;
	class KlView extends View implements ISyncComp, com.biz.ui.IAfterClassEva {
		initView(byReset: boolean): void;
		config: ViewCfgVO;
		sync(prop: string, oriVal: any, toVal: any, cls?: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
		knowledge(): number;
		difficulty(): number;
		showAnswerFace(type: number, complete?: Laya.Handler): void;
		playSound(url: string,loops?:number): void;
		KlTween: KlTweenBox;
		resetInGame(): void;
		stopAllSound(): void;
		_isClearView: boolean;
		clearView(): void;
		protected onClear(): void;
		resultStatistics(classType: string, resultType: number);
		roomDataForAll: object;
		reset();
		playMusic(url: string, loops: number, complete?: Laya.Handler, startTime?: number): void;
		playMusicUnSync(url: string, loops: number, complete?: Laya.Handler, startTime?: number): void;
		stopMusic();
		stopMusicUnSync();
	}

}

declare module com.klzz.ui {

	class ViewCfgVO {

		param: any;
		name: string;

	}
}



declare module com.klzz.ui.custom.KeyBoard {

	import Image = laya.ui.Image;

	class KlBaseKeyboard extends KlBox {

		onActive(evt: any): void;

		getIptOffset(): any[];

		getKeyboardOffset(): any[];

		camp: any;

		pattern: any;

		keyCondi: any;
		/**
		 * desc
		 */
		colorType: any;
		/**
		 * desc
		 */
		kbBtnSide: any;
		/**
		 * desc
		 */
		needKbBtn: any;
		/**
		 * desc
		 */
		fixed: any;
		/**
		 * desc
		 */
		isHide: any;
		/**
		 * desc
		 */
		currIptXpath: any;



		/**
		 * desc 获取主类引用
		 */
		root(): KlView;

		/**
		 * desc
		 */
		destroy(destroyChild: boolean): void;

		/**
		 * desc 设置箭嘴显示状态
		 */
		arrowVisible: boolean;

		/**
		 * desc 获取箭头 
		 */
		getArrow(): Image;

		// /**
		//  * 可重写返回自定义的键盘坐标位置【x,y】
		//  */
		keyboardPos(): any[];
		/**
		 * desc
		 */
		keyboardPos(value: any[]): void;

		/**
		 * 获取当前的输入框
		 */
		currIpt: KlInputImage;

		/**
		 * 通过xpath获取组件
		 */
		getCompByXpath(xpath: string): any;
	}
}

declare module com.klzz.ui {
	class KlImage extends Laya.Image implements ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}

}

declare module com.klzz.ui {
	import FontClip = laya.ui.FontClip;
	class KlFontClip extends FontClip implements ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}
}

declare module com.klzz.ui.custom.KeyBoard {
	class KlInputImage extends KlImage {
		//属性
		isSelected: boolean;
		fontClipValue: string;
		location: number;
		align: string;
		contentColor: string;
		guangbiaoSkin: string;
		contentType: number;
		fontClipSkin: string;
		cus1: any;
		valueOrSkinIsNull: boolean;
		currXpath: string;
		_currXpath: string;
		canSelected: string;
		filterColor: string;
		fontClip: KlFontClip;
		image: KlImage;
		guangbiaoI: KlImage;
		camp: any;
		place: number;
		//方法




	}
}
declare module com.klzz.ui {
	import Button = laya.ui.Button;
	class KlButton extends Button implements ISyncComp {
		sync(prop: string, oriVal: any, toVal: any, cls: string): void;
		unSyncProps(props: string): void;
		unSyncProps(): string;
	}

}

declare module com.klzz.ui.custom {

	class ScaleButton extends KlButton {

	}
}

declare module com.klzz.ui.custom {
	class SoundButton extends ScaleButton {

		soundPath: string;
	}
}

declare module com.klzz.media {
	class KlSoundMngImdt {
		static instance: KlSoundMngImdt;
		playSound(url: string, loops?: number, complete?: Laya.Handler, soundClass?: any, startTime?: number): void;
	}

}

declare module com.klzz.ui.custom.KeyBoard {
	class KlKey extends ScaleButton {

		//属性
		condition: number;
		fathKeyboard: KlBaseKeyboard;
		output: string;
		type: number;
		camp: any;
		onClick(evt: any): void;
		image: KlImage;

	}
}

declare module com.klzz.ui.custom.KeyBoard {
	import EventDispatcher = laya.events.EventDispatcher;
	class KlKeyboardEvent extends EventDispatcher {
		public KlKeyboardEvent(): void;
		/**
		 * getset方法
		 */
		static instance: KlKeyboardEvent;
		/**
		 * 输入框收到输入数据
		 */
		static INPUT: string;
		/**
		 * 键盘激活
		 */
		static ACTIVE: string;
		/**
		 * 键盘显示
		 */
		static KEYBOARD_SHOW: string;
		/**
		 * 键盘隐藏
		 */
		static KEYBOARD_HIDE: string;
		/**
		 * 键盘按钮点击
		 */
		static KEY_CLICK: string;
		/**
		 * 隐藏所有键盘
		 */
		static HIDE_KEYBOARDS: string;
		/**
		 * 反选所有输入框
		 */
		static UNSELECT_ALLINPUTIMAGE: string;
		/**
		 * 输入框成功输入数据
		 */
		public static KLINPUTIMAGE_INPUT: string;
		/** 
		 * 输入框输入成功之后 
		 */
		static INPUT_LATER: string;
		/**输入成功后计算完当前的宽度后抛这个事件 */
		static INPUT_END_NUM: string;
	}
}

declare module com.klzz.ui.script {

	class Numpad extends KlBox {

	}
}

declare module com.klzz.media {

	class KlSoundManager {

		static config(): object;
		static playDialog(url: string): void;
		static playSound(url: string, loops?: number, complete?: Laya.Handler): void;
		static playMusic(url: string, loops?: number, complete?: Laya.Handler, startTime?: number): void;
		static bgMusicUrl(): string;
		static stopMusic(): void;
		static playSoundUnSync(url: string, loops?: number, complete?: Laya.Handler): void;
		static stopSound(url: string): void;
		static stopAll(): void;
		static stopAllSound(): void;

	}

}

declare module com.klzz {
	class Klzz {

		static aniMode: number;//动画模式

	}
}

declare module com.biz.record {
	class AIControler {

	}
}



declare module LayaTS {
	class KlSkeleton1 extends com.klzz.ui.KlSkeleton1 {

	}
}

declare module com.klzz.ui.custom {
	class ChoiceBox extends KlBox {
		ChoiceBox();
		isRight: boolean;
		isNull: boolean;
		rightItemNames: string;
		onClickSel(mysel: SelectableObj): void;
		rightItemNamesArr: Array<string>;
		cancelSel: string;
		cancelAllSel(): void;
		compareTwoArr(): boolean;
		getSelRetArray(): Array<any>;
		SelectableGameIsSel(): Boolean;
		pushSel(selName: string): void;
		index_arr: Array<any>;
		init(): void;
		upperLimit: number;
		clickHanler: Laya.Handler;
		_rightItemNamesArr: Array<any>;
		_index_arr: Array<any>;

	}
}

declare module com.klzz.ui.custom {
	class KlInputBox extends KlBox {
		KlInputBox();
		//属性
		curIsNull: boolean;
		curIsRight: boolean;
		answer: string;
		mode: number;
		//方法
		updateCondition(): void;
		isRight(): boolean;
		isNull(): boolean;
		checkSingleIsNull(): boolean;
		getWrongIdx(): Array<number>;
		afterJudgeHandler: Laya.Handler;
		rightCondition: Laya.Handler;
	}
}

declare module com.klzz.ui.custom {
	class SelectableObj extends KlBox {
		isSelected: boolean
		clickHanler: Laya.Handler
		cus1: string
		cus2: string
	}

	class CountDown extends KlBox {
		frames: number;//设置多少毫秒同步一次 默认30
		type: number;//1是铺满,0是空白
		mode: number;// 0是竖向进度条 1是横向进度条
		allTime: number;//总时间
		play: boolean;//定时器开关
		endHandler: Laya.Handler;
		everyHandler: Laya.Handler;
	}

	class BezierCurveBox extends KlBox {
		pointsAmount: number;//生成数组点的个数(公式为X2+2)，越多性能越差，但是效果越好
		timeSpan: number;//时间间隔，即多少时间移到下个点
		curIndex: number;// 当前移动下标
		moveName: string;//移动物体的名字
		posArrStr: string;//贝塞尔曲线的数组点
		playMove: boolean;//定时器开关
	}

	class BgMusicBox extends KlBox {
		hsliderSkin: string;//hslider的皮肤
		closeBtnSkin: string;//closeBtnSkin的皮肤
		musicVolume: number;//背景音量大小
		musicBoxVisible: boolean;//是否显示UI
	}
	class BgMusicBtn extends ScaleButton {

	}

	class KlSkePlayer extends KlBox {

	}
}
declare module com.klzz.ui {
	class KlTweenBox extends KlBox {
		isNewMode: boolean;
		to(target: any, props: object, duration: number, ease?: Function, complete?: Laya.Handler, delay?: number, coverBefore?: boolean): void;
		toNew(target: any, props: object, duration: number, ease?: Function, complete?: Laya.Handler, delay?: number, coverBefore?: boolean): void;
		clearTween(target: object): void;
		clear(target: any, fromBroadCast: boolean): void;
	}
}
declare module com.klzz.ui.custom {
	class TwinkleBox extends KlBox {
		play(currAniName: string, loop: boolean, alpha1: number, alpha2: number, timer?: number, rate?: number): void;
		stop(): void;
		isTrue: boolean;
	}
}
declare module com.klzz.ui.custom {
	class KlChangeColorBox extends KlBox {
		fcolor: string;
	}
}
declare module com.klzz.ui.custom {
	class PriviewGuideFinger extends KlBox implements ISyncComp {
		isShow: boolean;
	}

}
declare module com.klzz.ui.custom.SwdtView {
	class SwdtView extends KlView {
		clickHandler: Laya.Handler
	}
}
declare module com.biz.ui {
	class VideoView extends com.klzz.ui.KlView {
		clearView(): void;

	}
}

declare module com.biz.ui {
	class ViewEvent {
		static FEEDBACK: string;
		static ANSWER_FACE: string;
		static ADD_SCORE: string;
		static SET_AUTHOR: string;
		static APPLAUSE: string;
		static MAINVIEW_PREPARED: string;
		static TOAST: string;
		static BTN_CLICK: string;
		static SET_MAIN_MODAL_STYLE: string;
		static SWITCH_MUTE: string;
		static BAN_SOUND_STUDENT: string;
		static UP_SCREEN_PLAY_FUN: string;
		static DOWN_SCREEN_PLAY_FUN: string;
		static REJECT_USER_FUN: string;
		static UP_CLASS_FUN: string;
		static DOWN_CLASS_FUN: string;
		static MUTE_CHANGE: string;
		static PAGE_CHANGE: string;
		static NEXT_PAGE: string;
		static PREV_PAGE: string;
		static PLAY: string;
		static PAUSE: string;
		static BACK: string;
		static BEEN_LOGGED_ON: string;
		static SWITCH_CTRL_STATE: string;
		static NEXT_UNIT: string;
		static PREV_UNIT: string;
		static RESET: string;
		static SHOW_ASSIST: string;
		static SHOW_SELECT: string;
		static SHOW_TROPHY: string;
		static CONTROLLER_MSG: string;
		static CONTROLLER_MSG_RETURN: string;
		static WILL_JUMP_PAGE: string;
		static VIDEO_END: string;
		static UNLOCK_STATE_CHANGED: string;
		static TP_STATE_CHANGED: string;
		static AUTHOR_STATE_CHANGED: string;
		static WATCH_STATE_CHANGED: string;
	}

	class PlayLevelType {
		/**
		*视频类型
		*/
		static videoType: string;

		/**
		 *预习类型
		 */
		static YuXi: string;


		/**
		 * 例题类型
		 */
		static liTi: string;

		/**
		 *封面类型 
		 */
		static fengMian: string;

		/**
		 *开场类型 
		 */
		static kaiChang: string;

		/**
		 *小游戏类型 
		 */
		static xiaoYouXi: string;

		/**
		 *练习题 
		 */
		static lianXi: string;

		/**
		 *过场类型 
		 */
		static guoChang: string;

		/**
		 * 神秘任务 类型
		 */
		static shenMiRenWu: string;

		/**
		 *挑战题 类型 
		 */
		static tiaoZhanTi: string;

		/**
		 *结尾 类型
		 */
		static jieWei: string;

		/**
		 *总结 类型
		 */
		static zongJie: string;

		/**
		 *思维导图类型 
		 */
		static siWeiDaoTu: string;

		/**
		 *小老师类型
		 */
		static littleTeacherType: string;

	}
}

declare module com.klzz.ui {
	class VideoView {
		static dealVideoUrl(videoUrl, type): void;
		static clearView(): void;
		static command(param): void;
		static sendUrl(url, type);
	}
}

/**获取用户数据 
 * apptype
 * currentRoomId
 * id
 * ip
 * name
 * status
 * userType 1 老师 2 学生 3 旁观
*/
declare module com.biz.model {
	class GlobalModel extends Laya.EventDispatcher {
		static user: any;
		static isLisChannelEditor: boolean;
	}
}

declare module com.biz.utils {
	/**
	 * 新轻课公用功能类
	 * @author benson
	 * 
	 */
	class NlcUtil {
		/**
		 * 新轻课在线作业答错截图 
		 * @param wrongTime:当前题目已经答错几次
		 * 
		 */
		static captureScreenDoWrongHw(wrongTime): void;

		/**
		 * 是否隐藏标题喇叭按钮
		 * @return 
		 * 
		 */
		static isHideTitleSoundBtn(): boolean;
	}
}

declare module com.biz.DataCapture {
	/**
	 * 数据采集相关-数据提供者 com.biz.DataCapture.DataCaptureDataProvider.ins.studyStage
	 */
	class DataCaptureDataProvider {
		static ins;
	}
}

declare module com.klzz.ui.custom.littlePeaPK {
	interface ILittlePeaPKComp {
		answer: number;
		setMouseEnabled(mouseEnabled: Boolean): void;
		feedbackAnswerRightAniComplete(): void;
		feedbackAnswerWrongAniComplete(): void;
	}

	class LittlePeaPKKlView extends KlView implements ILittlePeaPKComp {
		answer: number;
		setMouseEnabled(mouseEnabled: Boolean): void;
		feedbackAnswerRightAniComplete(): void;
		feedbackAnswerWrongAniComplete(): void;

		initialize(): void;
		initView(byReset: Boolean): void
		submitAnswer(): void;
		setMouseEnabled(mouseEnabled: Boolean): void;
		feedbackAnswerRightAniComplete();
		feedbackAnswerWrongAniComplete();
	}

	import DragView = com.klzz.ui.custom.DragView.DragView;
	class LittlePeaPKDragView extends DragView implements ILittlePeaPKComp {
		answer: number;
		setMouseEnabled(mouseEnabled: Boolean): void;
		feedbackAnswerRightAniComplete(): void;
		feedbackAnswerWrongAniComplete(): void;

		initialize(): void;
		initView(byReset: Boolean): void
		submitAnswer(): void;
		setMouseEnabled(mouseEnabled: Boolean): void;
		feedbackAnswerRightAniComplete();
		feedbackAnswerWrongAniComplete();
	}
}