
(function(window,document,Laya){
	var __un=Laya.un,__uns=Laya.uns,__static=Laya.static,__class=Laya.class,__getset=Laya.getset,__newvec=Laya.__newvec;

	var AndroidNative=com.biz.native.AndroidNative,BaseViewManagerImpl=com.biz.ui.BaseViewManagerImpl;
	var BiaoDaSiKuBox=com.klzz.ui.custom.BiaoDaSiKu.BiaoDaSiKuBox,Box=laya.ui.Box,Browser=laya.utils.Browser;
	var BrushBoxNewView=com.klzz.ui.custom.brush.BrushBoxNewView,BrushSetVO=com.klzz.model.BrushSetVO,BrushTools=com.klzz.ui.custom.brush.BrushTools;
	var Button=laya.ui.Button,ChannelStatus=com.biz.model.ChannelStatus,ClassNotesBox=com.klzz.ui.custom.ClassNotes.ClassNotesBox;
	var Classify=com.klzz.game.Classify,ColorFilter=laya.filters.ColorFilter,CourseDataUtil=com.klzz.utils.CourseDataUtil;
	var CourseType=com.klzz.game.CourseType,CursorBox=com.biz.ui.CursorBox,CustomRoomDataUtil=com.biz.utils.CustomRoomDataUtil;
	var DataCaptureManager=com.biz.DataCapture.DataCaptureManager,DataStatistics=com.biz.ui.DataStatistics,DateUtil=com.klzz.utils.DateUtil;
	var DragObj=com.klzz.ui.custom.DragView.DragObj,DragView=com.klzz.ui.custom.DragView.DragView,DropObj=com.klzz.ui.custom.DragView.DropObj;
	var Ease=laya.utils.Ease,EvaModel=com.biz.model.EvaModel,Event=laya.events.Event,EventData=laya.ani.bone.EventData;
	var EventDispatcher=laya.events.EventDispatcher,ExamModel=com.biz.model.ExamModel,ExtendEventNames=com.biz.extend.ExtendEventNames;
	var ExtendModuleNames=com.biz.extend.ExtendModuleNames,FontClip=laya.ui.FontClip,FunctionShellViewFactory=com.biz.ui.functionshell.FunctionShellViewFactory;
	var GameMgr=com.biz.common.GameMgr,GlobalDataStatusVO=com.biz.model.GlobalDataStatusVO,GlobalModel=com.biz.model.GlobalModel;
	var Handler=laya.utils.Handler,HitArea=laya.utils.HitArea,Https=com.klzz.net.Https,Image=laya.ui.Image,Key=com.biz.net.Key;
	var KlBox=com.klzz.ui.KlBox,KlEventCenter=com.klzz.game.KlEventCenter,KlEventName=com.klzz.game.KlEventName;
	var KlFontClip=com.klzz.ui.KlFontClip,KlImage=com.klzz.ui.KlImage,KlKey=com.klzz.ui.custom.KeyBoard.KlKey;
	var KlLabel=com.klzz.ui.KlLabel,KlSkePlayer=com.klzz.ui.custom.KlSkePlayer,KlSkeleton=com.klzz.ui.KlSkeleton;
	var KlSkeleton1=com.klzz.ui.KlSkeleton1,KlSoundManager=com.klzz.media.KlSoundManager,KlView=com.klzz.ui.KlView;
	var Klzz=com.klzz.Klzz,KnowledgePocketBox=com.klzz.ui.custom.KnowledgePocket.KnowledgePocketBox,Label=laya.ui.Label;
	var LaunchParam=com.biz.model.LaunchParam,LessonRestService=com.biz.services.lessonrest.LessonRestService;
	var List=laya.ui.List,Loader=laya.net.Loader,LocViewBase=com.biz.ui.LocViewBase,LocationUtil=com.biz.utils.LocationUtil;
	var LogPanelBox=com.klzz.ui.custom.LogPanel.LogPanelBox,Logs=com.klzz.ui.custom.LogPanel.Logs,MainModal=com.biz.ui.MainModal;
	var MainView=com.klzz.ui.MainView,MateManager=com.biz.native.MateManager,MessageView=com.biz.ui.MessageView;
	var MirrorBrushBox=com.klzz.ui.custom.mirrorBrush.MirrorBrushBox,Mouse=laya.utils.Mouse,MySocketHandler=com.biz.net.MySocketHandler;
	var MyViewManager=com.biz.ui.MyViewManager,NativeAPI=com.biz.native.NativeAPI,NativeCommandType=com.biz.native.NativeCommandType;
	var NativeMsg=com.biz.native.NativeMsg,Node=laya.display.Node,ObjUtil=com.klzz.utils.ObjUtil,ObjectTools=laya.debug.tools.ObjectTools;
	var OriginCourseType=com.biz.common.enum.OriginCourseType,PhotoWallDefine=com.biz.services.photowall.PhotoWallDefine;
	var Point=laya.maths.Point,Pool=laya.utils.Pool,PreviewModel=com.biz.model.PreviewModel,PriviewGuideFinger=com.klzz.ui.custom.PriviewGuideFinger;
	var Protocol=com.biz.net.Protocol,Rectangle=laya.maths.Rectangle,Render=laya.renders.Render,Reporter=com.biz.common.Reporter;
	var ResManager=com.klzz.res.ResManager,ScaleButton=com.klzz.ui.custom.ScaleButton,ServiceBase=com.biz.services.ServiceBase;
	var ServiceCenter=com.biz.services.ServiceCenter,ServiceConfig=com.biz.services.ServiceConfig,Skeleton=laya.ani.bone.Skeleton;
	var SocketDataDictionary=com.klzz.net.SocketDataDictionary,Sound=laya.media.Sound,SoundManager=laya.media.SoundManager;
	var SpecialKlViewFactory=com.biz.ui.specialklview.SpecialKlViewFactory,Sprite=laya.display.Sprite,Stage=laya.display.Stage;
	var StageEvaEnum=com.biz.model.room.enum.StageEvaEnum,StringUtil=com.klzz.utils.StringUtil,StudentVO=com.biz.model.StudentVO;
	var SubjectEnum=com.biz.model.room.enum.SubjectEnum,SwitchQuestionCtr=com.biz.model.room.control.SwitchQuestionCtr;
	var SwitchQuestionResultView=com.klzz.ui.custom.SwitchQuestion.SwitchQuestionResultView,Templet=laya.ani.bone.Templet;
	var Text=laya.display.Text,TextNotesBox=com.klzz.ui.custom.TextNotes.TextNotesBox,Texture=laya.resource.Texture;
	var Thinker=com.biz.model.Thinker,TimeLine=laya.utils.TimeLine,TransManager=com.klzz.transaction.TransManager;
	var TransType=com.biz.trans.TransType,Transition=com.klzz.utils.Transition,Tween=laya.utils.Tween,UIConst=com.biz.ui.UIConst;
	var UIEnum=com.klzz.model.UIEnum,UIManager=com.klzz.ui.UIManager,URL=laya.net.URL,UserStatus=com.biz.model.UserStatus;
	var Utils=laya.utils.Utils,VScrollBar=laya.ui.VScrollBar,View=laya.ui.View,ViewCfgVO=com.klzz.ui.ViewCfgVO;
	var ViewEvent=com.biz.ui.ViewEvent,ViewManager=com.klzz.ui.ViewManager,ViewNames=com.biz.module.ViewNames;
	var ViewStack=laya.ui.ViewStack,ViewUtil=com.biz.utils.ViewUtil,VipThink=com.biz.VipThink,WhiteBoardBox=com.klzz.ui.custom.whiteBoard.WhiteBoardBox;
	var WhiteBoardNewBox=com.klzz.ui.custom.WhiteBoardNew.WhiteBoardNewBox;
Laya.interface('com.subject.module.toolbox.ICustomModal');
//class com.subject.define.SubjectCourseType
var SubjectCourseType=(function(){
	function SubjectCourseType(){}
	__class(SubjectCourseType,'com.subject.define.SubjectCourseType');
	SubjectCourseType.NOMAL=1;
	SubjectCourseType.REVIEW=2;
	SubjectCourseType.LESSON_ACTIVITY=3;
	SubjectCourseType.PREVIEW=4;
	SubjectCourseType.SPECIAL_EVALUATION=5;
	SubjectCourseType.YULAN=6;
	SubjectCourseType.EXAM=7;
	SubjectCourseType.RECORD=8;
	SubjectCourseType.PLAYRECORD=9;
	SubjectCourseType.GRADUATION=10;
	SubjectCourseType.GDEVALUATION=11;
	SubjectCourseType.HOMEWORK_ONLINE=12;
	SubjectCourseType.CLOCK_TRAIN=13;
	SubjectCourseType.STAGE_EVALUATION=14;
	SubjectCourseType.AFTER_CLASS_PRACTICE=15;
	SubjectCourseType.INTERACTION_CLASS=31;
	SubjectCourseType.LITTLE_PEA_PK=32;
	SubjectCourseType.KP_UPGRADE=80;
	SubjectCourseType.JL_REVIEW_CHILD=81;
	SubjectCourseType.JL_REVIEW_PRIMARY=82;
	SubjectCourseType.COUSE_TYPE_HOMEWORK_ZHIYINGDIAN=100;
	SubjectCourseType.TEST_ONLINE=101;
	SubjectCourseType.COUSE_TYPE_SPIRIT=99;
	SubjectCourseType.TEST=98;
	SubjectCourseType.SUMMARY=97;
	SubjectCourseType.TESTLESSON=96;
	SubjectCourseType.LESSON_PREPARATION=95;
	SubjectCourseType.REVISE=94;
	SubjectCourseType.ACTIVITY_CLASS=102;
	return SubjectCourseType;
})()


//class com.subject.module.chinese.ChineseHomeWorkViewManager
var ChineseHomeWorkViewManager=(function(){
	function ChineseHomeWorkViewManager(){
		this.error_imgdesc=null;
		this.ch_lab_desc=null;
		this.error_eff_box=null;
		this.error_sk=null;
		this.error_imgKuang=null;
		this.error_lab_desc=null;
		this.sull_eff_box=null;
		this.sull_sk=null;
		this.sull_sk1=null;
		this._bt_ip=null;
		this.end_eff_box=null;
		this.end_eff_sk=null;
		this._yc_bt_next=null;
		this._bt_next=null;
		//错误动画播放完 后 按钮可操作 呼吸状态
		this.resList=null;
		//结算
		this._baseEvaluationView=null;
		this.curr_v=null;
		this.currtag=null;
		this._config=null;
	}

	__class(ChineseHomeWorkViewManager,'com.subject.module.chinese.ChineseHomeWorkViewManager');
	var __proto=ChineseHomeWorkViewManager.prototype;
	__proto._initShow=function(mainview,error_eff_box1,error_sk1,error_imgKuang1,error_lab_desc1,sull_eff_box1,_sull_sk,_sull_sk1,_bt_ip1,end_eff_box1,end_eff_sk1,_yc_bt_next1,_bt_next1,_ch_lab_desc,_error_imgdesc){
		this._baseEvaluationView=mainview;
		this.error_imgdesc=_error_imgdesc;
		this.ch_lab_desc=_ch_lab_desc;
		this.error_eff_box=error_eff_box1;
		this.error_sk=error_sk1;
		this.error_imgKuang=error_imgKuang1;
		this.error_lab_desc=error_lab_desc1;
		this.sull_eff_box=sull_eff_box1;
		this.sull_sk=_sull_sk;
		this.sull_sk1=_sull_sk1;
		this._bt_ip=_bt_ip1;
		this.end_eff_box=end_eff_box1;
		this.end_eff_sk=end_eff_sk1;
		this._yc_bt_next=_yc_bt_next1;
		this._bt_next=_bt_next1;
		this.error_sk.visible=this.sull_sk.visible=this.sull_sk1.visible=this.end_eff_sk.visible=true;
		this.ch_Init();
	}

	__proto.ch_NextLevel=function(v,tag){
		this.curr_v=v;
		this.currtag=tag;
		var str='错误';
		if (v){
			if (v.result==true || v.result==1){
				str='正确';
			}
			else if (v.result==false || v.result==0){
				str='错误';
			}
			else if (v.result==null){
				str='跳过';
			}
		}
		if(this._config&&this._config.param.textdes){
			if(str=='正确'){
				this.resList[tag]=true;
				this.setTlement(true);
				VipThink.viewMgr.event("ch_homework",[true,this._config.name]);
				}else{
				this.resList[tag]=false;
				this.setTlement(false);
				VipThink.viewMgr.event("ch_homework",[false,this._config.name]);
			}
			}else{
			this._baseEvaluationView.nextLevel(this.curr_v);
		}
	}

	/**新加 获取几连对*/
	__proto.getResListNum=function(){
		var num=0;
		for(var i=VipThink.config.courseCfg.pages.length;i > 0;i--){
			if(this.resList[i]!=undefined && this.resList[i]==true){
				num++;
				}else if(this.resList[i]!=undefined && this.resList[i]==false){
				break ;
			}
		}
		return num;
	}

	/**新加 点击完成后先结算对错动画后 再执行跳转下一页*/
	__proto.setTlement=function(v){
		var _$this=this;
		if(v==true){
			if(this.getResListNum()==1){
				this.sull_sk.visible=this.sull_eff_box.visible=true;
				this.sull_sk.once("end",this,function(){
					_$this.sull_sk.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk.play("yeah_1",false);
				}else if(this.getResListNum()==2){
				this.sull_sk.visible=this.sull_eff_box.visible=true;
				this.sull_sk.once("end",this,function(){
					_$this.sull_sk.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk.play("yeah_2",false);
				}else if(this.getResListNum()==3){
				this.sull_sk.visible=this.sull_eff_box.visible=true;
				this.sull_sk.once("end",this,function(){
					_$this.sull_sk.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk.play("yeah_3",false);
				}else if(this.getResListNum()==4){
				this.sull_sk.visible=this.sull_eff_box.visible=true;
				this.sull_sk.once("end",this,function(){
					_$this.sull_sk.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk.play("yeah_4",false);
				}else if(this.getResListNum()==5){
				this.sull_sk.visible=this.sull_eff_box.visible=true;
				this.sull_sk.once("end",this,function(){
					_$this.sull_sk.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk.play("yeah_5",false);
				}else{
				this.sull_sk1.visible=this.sull_eff_box.visible=true;
				this.sull_sk1.once("end",this,function(){
					_$this.sull_sk1.visible=_$this.sull_eff_box.visible=false;
					_$this.sull_sk1.stop();
					if(_$this.currtag >=VipThink.config.courseCfg.pages.length){
						_$this.end_eff_sk.visible=_$this.end_eff_box.visible=true;
						_$this.end_eff_sk.once("end",this,function(){
							_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
							_$this.end_eff_sk.stop();
							_$this.showMouseEnabled(true);
							_$this._baseEvaluationView.nextLevel(_$this.curr_v);
						});
						_$this.end_eff_sk.play("begin",false);
						}else{
						_$this.showMouseEnabled(true);
						_$this._baseEvaluationView.nextLevel(_$this.curr_v);
					}
				});
				this.showMouseEnabled(false);
				this.sull_sk1.play("begin",false);
			}
			}else{
			Laya.timer.once(1000,this,function(){
				_$this.error_eff_box.visible=true;
				_$this.playCh_Sound();
			});
			Laya.timer.once(3000,this,function(){
				_$this._yc_bt_next.visible=false;
				_$this._bt_next.visible=true;
			});
		}
	}

	/**新加 播放错题解析 3秒解冻时间*/
	__proto.playCh_Sound=function(){
		var _$this=this;
		this._baseEvaluationView.mouseEnabled=false;
		Laya.timer.once(3000,this,function(){
			_$this._baseEvaluationView.mouseEnabled=true;
		});
		this.error_sk.play("loop",true);
		if(this._config&&this._config.param.textdes_soundurl){
			KlSoundManager.playSound(this._config.param.textdes_soundurl);
			Laya.timer.clear(this,this.showStand);
			Laya.timer.once(Number(this._config.param.textdes_soundurl_cd),this,this.showStand);
		}
	}

	/**移除计算器*/
	__proto.showStand=function(){
		this.error_sk.play("stand",true);
	}

	/**新加 屏幕是否可以操作*/
	__proto.showMouseEnabled=function(v){
		this._baseEvaluationView.mouseEnabled=v;
	}

	/**
	*答错 也播放环节反馈
	*/
	__proto.nextLevel=function(){
		var _$this=this;
		this.error_eff_box.visible=false;
		this.error_sk.stop();
		if(this.currtag >=VipThink.config.courseCfg.pages.length){
			this.end_eff_sk.visible=this.end_eff_box.visible=true;
			this.end_eff_sk.once("end",this,function(){
				_$this.end_eff_sk.visible=_$this.end_eff_box.visible=false;
				_$this.end_eff_sk.stop();
				_$this._baseEvaluationView.nextLevel(_$this.curr_v);
				_$this.showMouseEnabled(true);
			});
			this.showMouseEnabled(false);
			this.end_eff_sk.play("begin",false);
			}else{
			this._baseEvaluationView.nextLevel(this.curr_v);
		}
	}

	/***語文邏輯 初始化 */
	__proto.ch_Init=function(){
		if(VipThink.config.courseCfg.subject=="chinese"){
			this.resList=[];
			VipThink.viewMgr.on("ch_homework_mouseEnabled",this,this.showMouseEnabled);
		}
	}

	/**
	*
	*@param ch_lab_desc
	*@param str
	*/
	__proto.showCh_TextDes=function(page){
		this._config=page.config;
		this.error_eff_box.visible=this.sull_eff_box.visible=this.end_eff_box.visible=false;
		if(this._yc_bt_next)this._yc_bt_next.visible=true;
		if(this._bt_next)this._bt_next.visible=false;
		if(this.error_lab_desc){
			this.error_lab_desc.text="";
			this.error_imgdesc.skin="";
			if(this._config&&this._config.param.desurl){
				if(this.error_imgdesc){
					this.error_imgdesc.skin=this._config.param.desurl;
				}
				}else{
				if(this._config.param.textdes){
					this.error_lab_desc.text=this._config.param.textdes;
				}
			}
		}
	}

	__getset(1,ChineseHomeWorkViewManager,'instance',function(){
		if (!ChineseHomeWorkViewManager._instance)
			ChineseHomeWorkViewManager._instance=new ChineseHomeWorkViewManager();
		return ChineseHomeWorkViewManager._instance;
	});

	ChineseHomeWorkViewManager._instance=null;
	return ChineseHomeWorkViewManager;
})()


//class com.subject.module.specialklview.SpecialKlViewNames
var SpecialKlViewNames=(function(){
	function SpecialKlViewNames(){}
	__class(SpecialKlViewNames,'com.subject.module.specialklview.SpecialKlViewNames');
	SpecialKlViewNames.VTYPE_GAME="game";
	SpecialKlViewNames.VTYPE_IMG="img";
	SpecialKlViewNames.VTYPE_ANIMATINO="animation";
	SpecialKlViewNames.VTYPE_DIALOGANI="DialogAni";
	SpecialKlViewNames.VTYPE_SUBJS_VIEW="subjsView";
	SpecialKlViewNames.VTYPE_RECORD_LAST_VIEW="recordLastView";
	SpecialKlViewNames.VTYPE_VIDEO_VIEW="video";
	SpecialKlViewNames.VTYPE_PARK_RESULT="parkResult";
	SpecialKlViewNames.TYPE_RUSH="rush";
	SpecialKlViewNames.VTYPE_RUSH_RESULT="rushResult";
	SpecialKlViewNames.VTYPE_LIGHT_OPEN_GAME="lightOpenGame";
	SpecialKlViewNames.EXPAND_PLOT_TO_GAME="plotToGame";
	SpecialKlViewNames.LIGHT_CLASS_BEFORE_LESSON="beforeLesson";
	SpecialKlViewNames.LIGHT_CLASS_AFTER_LESSON="afterLesson";
	SpecialKlViewNames.VTYPE_LITTLE_TEACHER="littleTeacher";
	SpecialKlViewNames.EVA_GUIDE="evaGuide";
	SpecialKlViewNames.ASCEND_CEREMONY_V3="ascendCeremonyV3";
	SpecialKlViewNames.EVA_GUIDEV4="evaGuide_v4";
	return SpecialKlViewNames;
})()


//class com.subject.module.SubjectViewNames
var SubjectViewNames=(function(){
	function SubjectViewNames(){}
	__class(SubjectViewNames,'com.subject.module.SubjectViewNames');
	return SubjectViewNames;
})()


/**
*Author:Evans<br/>
*空白
*/
//class com.subject.module.toolbox.BlankCustomModal
var BlankCustomModal=(function(){
	function BlankCustomModal(){}
	__class(BlankCustomModal,'com.subject.module.toolbox.BlankCustomModal');
	var __proto=BlankCustomModal.prototype;
	Laya.imps(__proto,{"com.subject.module.toolbox.ICustomModal":true})
	//implements start
	__proto.init=function(modal,cursorBox){}
	__getset(0,__proto,'visible',null,function(v){
	});

	return BlankCustomModal;
})()


//class com.subject.services.afterclasseva.AfterClassEvaManager
var AfterClassEvaManager=(function(){
	function AfterClassEvaManager(){
		/**点击次数 */
		this._clickCount=0;
		this.TAG="AfterClassEvaManager";
		/**开始时间 */
		this._startTs=0;
		/**关卡时间 */
		this._time=0;
		this._canAct=false;
	}

	__class(AfterClassEvaManager,'com.subject.services.afterclasseva.AfterClassEvaManager');
	var __proto=AfterClassEvaManager.prototype;
	__proto.init=function(){
		if(!GlobalModel.isRoomOwner){
			VipThink.viewMgr.on("change",this,this.onLevelChange);
			VipThink.viewMgr.on("changed",this,this.onLevelChanged);
			GlobalModel.instance.on("changed",this,this.onGlobalChanged);
		}
	}

	__proto.onLevelChange=function(){
		this.submit();
	}

	__proto.onLevelChanged=function(){
		this._startTs=0;
		this._time=0;
		this._clickCount=0;
	}

	__proto.onGlobalChanged=function(data){
		if(this.canNotPass)
			return;
		var bChannelStatus=data.bChannelStatus;
		if(bChannelStatus){
			if(bChannelStatus.id==0 && bChannelStatus.editorID==0){
				this._startTs=Browser.now();
				this._canAct=true;
				if(this.currView)
					this.currView.on("cusEvent",this,this.onClickCount);
				}else{
				this._time=this.time;
				this._canAct=false;
			}
		}
	}

	__proto.onClickCount=function(){
		if(this._canAct)
			this._clickCount++;
	}

	__proto.submit=function(){
		if(this.canNotPass)
			return;
		if(!this.submitApi)
			return;
		var subj=VipThink.viewMgr.totalSubViewNum > 1 ? VipThink.viewMgr.mainView.currSubviewIdx+1 :0;
		var obj={
			liveId:VipThink.config.liveId ||-1,
			no:VipThink.viewMgr.currPageIdx+1,
			item:subj,
			studentId:VipThink.user.id,
			num:this._clickCount
		};
		obj.point=this.knowledge;
		obj.level=this.difficulty;
		if(this.ability){
			obj.ability=this.ability;
		}
		if(VipThink.release=="dev" || (VipThink.config.liveId==-1 && !Browser.onIOS)){
			console.log("【submit AfterClassEva data】======================>> ：",obj);
			}else{
			TransManager.doTrans("sendAfterClassEvaResult",[this.onSubmitResult,this,[obj,0]],[obj]);
			console.log("【",this.TAG,":submit data】 ======================>>","ip:",this.submitApi,"data:",obj);
		}
	}

	/**提交结果 */
	__proto.onSubmitResult=function(obj,count,data){
		if(!data)
			return;
		if (data.result=="complete"){
			VipThink.viewMgr.hideToast(this.TAG);
			}else if (data.result=="error"){
			VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",3000);
			count++;
			Laya.timer.once(3000,this,this.submitLastLevelData,[obj,count],false);
		}
	}

	__proto.submitLastLevelData=function(obj,count){
		if(count >=5)
			return;
		if(obj){
			console.log(this.TAG,":reSubmit data:",obj);
			TransManager.doTrans("sendAfterClassEvaResult",[this.onSubmitResult,this,[obj,count]],[obj]);
		}
	}

	__proto.subj=function(){
		return VipThink.viewMgr.mainView.currSubviewIdx;
	}

	__getset(0,__proto,'knowledge',function(){
		if(this.isIAfterClassEva)
			return this.currIAfterClassEva.knowledge;
		return null;
	});

	__getset(0,__proto,'canNotPass',function(){
		return GlobalModel.isRoomOwner || !this.currView || !this.isIAfterClassEva;
	});

	__getset(0,__proto,'isIAfterClassEva',function(){
		return Laya.__typeof(this.currView,'com.biz.ui.IAfterClassEva');
	});

	__getset(0,__proto,'time',function(){
		var t=0;
		if(this._startTs !=0){
			t=this._time+Browser.now()-this._startTs;
		}
		return t;
	});

	__getset(0,__proto,'submitApi',function(){
		return VipThink.config.afterClassEvaAPI;
	});

	__getset(0,__proto,'level',function(){
		return VipThink.viewMgr.mainView.currViewIdx;
	});

	__getset(0,__proto,'ability',function(){
		var a;
		if(this.isIAfterClassEva){
			if(this.currView.config.ability){
				a=this.currView.config.ability;
			}
		}
		return a;
	});

	__getset(0,__proto,'currView',function(){
		return VipThink.viewMgr.currPage.currView;
	});

	__getset(0,__proto,'difficulty',function(){
		if(this.isIAfterClassEva)
			return this.currIAfterClassEva.difficulty;
		return null;
	});

	__getset(0,__proto,'currIAfterClassEva',function(){
		return this.currView;
	});

	__getset(1,AfterClassEvaManager,'instance',function(){
		if(!AfterClassEvaManager._instance)
			AfterClassEvaManager._instance=new AfterClassEvaManager();
		return AfterClassEvaManager._instance;
	});

	AfterClassEvaManager._instance=null;
	return AfterClassEvaManager;
})()


//class com.subject.services.ParkManager
var ParkManager$1=(function(){
	var innerClass;
	function ParkManager(ic){
		this._answers={};
		this._box=null;
	}

	__class(ParkManager,'com.subject.services.ParkManager',null,'ParkManager$1');
	var __proto=ParkManager.prototype;
	// VipThink.viewMgr.on(ViewEvent.MAINVIEW_PREPARED,this,onPrepared);
	__proto.onPrepared=function(){
		console.log(VipThink.viewMgr.currPage.config);
		if(VipThink.viewMgr.currPage.config.expand !="park")
			return;
	}

	// }
	__proto.clear=function(){
		VipThink.viewMgr.off("mainViewPrepared",this,this.onPrepared);
	}

	/**
	*显示反馈
	*@param answer:答案，布尔值
	*@param wrongSound:答错时候的音效，默认播放公共答错音效
	*@return void
	*/
	__proto.feedBack=function(answer,wrongSound){
		var _$this=this;
		(wrongSound===void 0)&& (wrongSound="share/sound/park_wrong.wav");
		if(!this.currView)
			return;
		this._answers=VipThink.viewMgr.mainView.expandData;
		if(!this._answers)
			this._answers={};
		var subjIdx=VipThink.viewMgr.mainView.currSubviewIdx;
		this._answers["subj"+subjIdx]=answer;
		VipThink.viewMgr.mainView.expandData=this._answers;
		var obj={"parkResult":this._answers};
		var jsonStr=JSON.stringify(obj);
		VipThink.userStatus.setUserProp(VipThink.user.id,"parkResult",jsonStr,'setParkResult');
		if(answer){
			this.currView.showAnswerFace(1,Handler.create(this,function(){
				_$this.next();
			}));
			if(Browser.onIOS){
				Laya.timer.once(2000,this,this.next);
			}
			}else{
			this.currViewForSoundAct.stopAllSound();
			if(Browser.onIOS){
				var s=new Sound();
				s.load(wrongSound);
				Laya.timer.once(s.duration,this,this.next);
			}
			this.currViewForSoundAct.playSound(wrongSound,1,Handler.create(this,function(){
				_$this.next();
			}));
		}
	}

	/**
	*下一关
	*@return void
	*/
	__proto.next=function(){
		console.log(VipThink.viewMgr.currPage.config.subViewNum);
		if(VipThink.viewMgr.mainView.currSubviewIdx >=this.subViewNum-1){
			if(this._box){
				this._box.visible=true;
			}
		}else {}
	}

	/**
	*获取题数
	*@return int
	*/
	__getset(0,__proto,'subViewNum',function(){
		return VipThink.viewMgr.currPage.config.subViewNum;
	});

	__getset(0,__proto,'currView',function(){
		return VipThink.viewMgr.mainView.currView;
	});

	__getset(0,__proto,'currViewForSoundAct',function(){
		return VipThink.viewMgr.currPage.currView;
	});

	__getset(1,ParkManager,'instance',function(){
		if(!ParkManager._instance)
			ParkManager._instance=new ParkManager(new innerClass());
		return ParkManager._instance;
	});

	ParkManager._instance=null;
	ParkManager.__init$=function(){
		//class innerClass
		innerClass=(function(){
			function innerClass(){}
			__class(innerClass,'');
			return innerClass;
		})()
	}

	return ParkManager;
})()


//class com.subject.services.preparelessonschain.MinorType
var MinorType=(function(){
	function MinorType(){}
	__class(MinorType,'com.subject.services.preparelessonschain.MinorType');
	MinorType.prepareLessonsReport="prepareLessonsReport";
	return MinorType;
})()


//class com.subject.services.preview.PreviewManager
var PreviewManager=(function(){
	function PreviewManager(){
		this.PREVIEW_AND_ANSWER="previewAndAnswer";
		this.DURATION_OF_SINGLE_PREVIEW="durationOfSinglePreview";
		this.EVENT_ANSWER_FACE="showAnswerFace";
		// private var SOUND_WRONG:String="share/sound/preview_wrong.wav";
		this._wrongTime=0;
		this._lastViewIdx=-1;
		this._lastSubviewIdx=-1;
		this.pageData={};
		this.curPIdx=0;
		this.curSIdx=0;
		this.startTs=NaN;
	}

	__class(PreviewManager,'com.subject.services.preview.PreviewManager');
	var __proto=PreviewManager.prototype;
	__proto.init=function(){
		VipThink.viewMgr.on("changed",this,this.onLevelChanged);
		VipThink.viewMgr.feedBackView.on(this.EVENT_ANSWER_FACE,this,this.afterHandleFeedbackEvt);
		VipThink.viewMgr.on("feedback",this,this.beforeHandleFeedbackEvt);
		this.initCurPageData();
		KlEventCenter.on("videoEnd",this,this.onVideoEnd);
		KlEventCenter.on("callPreviewManager",this,this.onCallPreviewManager);
		this.startTs=(new Date()).getTime();
	}

	__proto.onCallPreviewManager=function(evt){
		var action=evt.action;
		if(action=="jump")
			this.jump();
	}

	__proto.onVideoEnd=function(){
		this.jump();
	}

	// }
	__proto.initCurPageData=function(){
		this.curPIdx=VipThink.viewMgr.mainView.currViewIdx;
		this.curSIdx=VipThink.viewMgr.mainView.currSubviewIdx;
		if (!VipThink.viewMgr.currSubview)
			return;
		if(VipThink.viewMgr.currSubview.config.type=="video")
			return;
		if(this.pageData[this.curPIdx+"_"+this.curSIdx] && this.pageData[this.curPIdx+"_"+this.curSIdx].answer)
			return;
		this.pageData[this.curPIdx+"_"+this.curSIdx]={startTime:Math.floor((new Date().getTime()/ 1000))};
	}

	__proto.onLevelChanged=function(){
		this._wrongTime=0;
		Laya.timer.clear(this,this.jump);
		KlSoundManager.stopAllSound();
		this.delayInitCurPageData();
	}

	__proto.delayInitCurPageData=function(){
		if(!VipThink.viewMgr.currSubview){
			Laya.timer.frameOnce(1,this,this.delayInitCurPageData);
			return;
		}
		this.initCurPageData();
	}

	__proto.beforeHandleFeedbackEvt=function(data){
		var type=data.type;
		if (type=="answerFace" && data.ftype==1){
			this._lastViewIdx=VipThink.viewMgr.mainView.currViewIdx;
			this._lastSubviewIdx=VipThink.viewMgr.mainView.currSubviewIdx;
		}
	}

	__proto.afterHandleFeedbackEvt=function(type,complete){
		var hdr=complete
		if (this.pageData && this.pageData[this.curPIdx+"_"+this.curSIdx]){
			if(!this.pageData[this.curPIdx+"_"+this.curSIdx].answer){
				this.pageData[this.curPIdx+"_"+this.curSIdx].answer=type;
				this.pageData[this.curPIdx+"_"+this.curSIdx].endTime=Math.floor(new Date().getTime()/ 1000);
			}
		}
		this.submitBuryPoint(this.PREVIEW_AND_ANSWER,type==1 ? "true" :"false");
		if(type==1){
			if((this._lastSubviewIdx==-1 && this._lastViewIdx==-1)|| (VipThink.viewMgr.mainView.currViewIdx==this._lastViewIdx && VipThink.viewMgr.mainView.currSubviewIdx==this._lastSubviewIdx)){
				this._lastSubviewIdx=this._lastViewIdx=-1
				console.debug("PreviewManager - afterHandleFeedbackEvt - 1");
				this.jump();
			}
			}else {
			hdr && hdr.run();
			KlEventCenter.event("callPreviewUI",[{action:"showNotice",isEnd:this.isLastLevel}]);
		}
	}

	__proto.jump=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(currPageIndex==pageNum-1 && currSubjIndex==subjNum-1){
			VipThink.nativeAPI.noticeNative({
				args:{
					type:"preview",
					data:{
						act:"complete",
						pageData:this.pageData
					}
				}
			});
			KlEventCenter.event("lessonEnd");
			this.submitBuryPoint(this.DURATION_OF_SINGLE_PREVIEW);
			return;
		}
		if(subjNum > 1 && currSubjIndex < subjNum-1){
			VipThink.viewMgr.currSubviewIdx++;
			console.debug("PreviewManager - jump - 自动跳到下一题");
			}else{
			VipThink.viewMgr.currPageIdx++;
			console.debug("PreviewManager - jump - 自动跳到下一关");
		}
	}

	// 提交预习埋点
	__proto.submitBuryPoint=function(eventName,result){
		var previewData=PreviewModel.data;
		var data={
			eventName:eventName,
			param:{
				courseCategory:this.courseCategory+"",
				courseName:this.chapterName+"",
				courseStep:this.courseStep+"",
				courseID:this.liveId+""
			}
		}
		if(eventName==this.PREVIEW_AND_ANSWER){
			data.param.answers_situation=result;
			}else if(eventName==this.DURATION_OF_SINGLE_PREVIEW){
			data.param.timelong=Math.floor(((new Date()).getTime()-this.startTs)/ 1000);
		}
		Reporter.reportData(3,data,null,{msg:["PreviewMananger.submitBuryPoint 埋点名称:",eventName,"提交埋点数据："] });
	}

	/**
	*
	*
	*课程课类（启动参数获取）
	*/
	__getset(0,__proto,'courseCategory',function(){
		return CourseDataUtil.goClassData.courseCategory ? CourseDataUtil.goClassData.courseCategory :"";
	});

	__getset(0,__proto,'isLastLevel',function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		return currPageIndex==pageNum-1 && currSubjIndex==subjNum-1;
	});

	/**
	*课件名称
	*/
	__getset(0,__proto,'chapterName',function(){
		return CourseDataUtil.goClassData.chapterName ? CourseDataUtil.goClassData.chapterName :"";
	});

	/**
	*课程id liveid
	*/
	__getset(0,__proto,'liveId',function(){
		return CourseDataUtil.goClassData.liveId ? (CourseDataUtil.goClassData.liveId+""):"";
	});

	/**
	*讲次名称（启动参数获取）
	*/
	__getset(0,__proto,'courseStep',function(){
		return CourseDataUtil.goClassData.courseStep ? CourseDataUtil.goClassData.courseStep :"";
	});

	__getset(1,PreviewManager,'instance',function(){
		if(!PreviewManager._instance)
			PreviewManager._instance=new PreviewManager();
		return PreviewManager._instance;
	});

	PreviewManager._instance=null;
	return PreviewManager;
})()


/**
*@author Jonny
*复习课管理器
*/
//class com.subject.services.revise.ReviseManager
var ReviseManager=(function(){
	function ReviseManager(){}
	__class(ReviseManager,'com.subject.services.revise.ReviseManager');
	var __proto=ReviseManager.prototype;
	__proto.init=function(){
		VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChanged);
	}

	__proto.onPageStatusChanged=function(data){
		if (data.status=="ctoring"){
			var currView=VipThink.viewMgr.currPage.currView;
			if (currView){
				if (currView.isVideoView){
					var b=VipThink.config.courseType==94 && (VipThink.viewMgr.currPageIdx==0 || VipThink.viewMgr.currPageIdx==VipThink.viewMgr.totalPageNum-1);
					b=b ? 1 :0;
					currView.fill=currView.autoPlay=currView.hide=b;
				}
			}
		}
	}

	__getset(1,ReviseManager,'instance',function(){
		if (!ReviseManager._instance)
			ReviseManager._instance=new ReviseManager();
		return ReviseManager._instance;
	});

	ReviseManager._instance=null;
	return ReviseManager;
})()


/**
*Author:Jiajun<br/>
*Desc:路线控制器
*Usage:幼升小正课路线控制
*/
//class com.subject.services.RouteController
var RouteController=(function(){
	function RouteController(){
		this.isChallengeToOtherRoute=false;
		if (RouteController._instance){
			console.error("__RouteController","The instance must be only one.");
			return;
		}
		RouteController._instance=this;
		VipThink.viewMgr.on("wiilJumpPage",this,this.onJumpOrNot);
		VipThink.viewMgr.on("skipChallenge",this,this.onSkipChallenge);
	}

	__class(RouteController,'com.subject.services.RouteController');
	var __proto=RouteController.prototype;
	// 跳过挑战题，直接翻到非挑战题路线的第一页
	__proto.onSkipChallenge=function(){
		var _$this=this;
		Laya.timer.frameOnce(5,this,function(){
			var toPageIdx=_$this.getRouteWithoutChallengePageIdx();
			if(toPageIdx !=-1){
				console.debug("RouteController - onSkipChallenge - 跳到第"+toPageIdx+"关");
				_$this.isChallengeToOtherRoute=true;
				VipThink.viewMgr.currPageIdx=toPageIdx;
			}
		});
	}

	__proto.onJumpOrNot=function(oIdxp,oIdxs,nIdxp,nIdxs,force,handler){
		var jump=true;
		var mv=VipThink.viewMgr.mainView;
		if((VipThink.config.course.indexOf("ysx_")!=-1)){
			if (oIdxp !=-1 && oIdxs !=-1){
				if(this.isToDIffRoute(oIdxp,nIdxp))
					jump=false;
			}
			if (mv && oIdxp !=-1 && oIdxs !=-1 && mv.pageCfgList[oIdxp] && mv.pageCfgList[oIdxp-1] && mv.pageCfgList[oIdxp-2]){
				var curRouteIs0=mv.pageCfgList[oIdxp].route==0 || mv.pageCfgList[oIdxp-1].route==0 || mv.pageCfgList[oIdxp-2].route==0;
				if(curRouteIs0 && nIdxp < oIdxp)
					VipThink.viewMgr.event("jumpToPage",[this.getPageIdxBeforeChallenge()]);
			}
		}
		else if(VipThink.config.courseCfg.routeSelect){
			if(oIdxp !=-1 && oIdxs !=-1){
				var curRoute=mv.pageCfgList[oIdxp].route;
				var nextRoute=mv.pageCfgList[nIdxp].route;
				if(nIdxp < oIdxp){
					if(curRoute !=nextRoute){
						nIdxp=this.getPageIdxBeforeChallenge();
						nIdxs=0;
					}
				}
				else if(nIdxp > oIdxp && curRoute !=nextRoute){
					var nextViewConfig=mv.pageCfgList[oIdxp+1].subViews ? mv.pageCfgList[oIdxp+1].subViews[0].configObj :mv.pageCfgList[oIdxp+1].configObj;
					if(!nextViewConfig.challenge||(nextViewConfig.challenge!=2&&!nextViewConfig.isJump))
						jump=false;
				}
			}
		}
		this.isChallengeToOtherRoute=false;
		handler.runWith([nIdxp,nIdxs,force,jump]);
	}

	// 这个页面变换是否有路线切换的行为
	__proto.isToDIffRoute=function(oIdxp,nIdxp){
		var mv=VipThink.viewMgr.mainView;
		if (mv){
			var curRoute=mv.pageCfgList[oIdxp].route;
			var nextRoute=mv.pageCfgList[nIdxp].route;
			if(curRoute==1 && nextRoute==0 && (nIdxp-oIdxp)==1){
				return true;
			}
		}
		return false;
	}

	/**
	*获取非挑战题路线的第一个关卡的页码
	*/
	__proto.getRouteWithoutChallengePageIdx=function(){
		var mv=VipThink.viewMgr.mainView;
		if(mv){
			var configs=mv.pageCfgList;
			for (var i=0;i < configs.length;i++){
				var config=configs[i];
				if(config.route==0)
					return i;
			}
		}
		return-1;
	}

	/**
	*获取挑战题的前一页页码
	*/
	__proto.getPageIdxBeforeChallenge=function(){
		var mv=VipThink.viewMgr.mainView;
		if(mv){
			var configs=mv.pageCfgList;
			for (var i=0;i < configs.length;i++){
				var config=configs[i];
				config.subViews && (config=config.subViews[0].configObj)
				if(config.challenge==1||config.challenge==2)
					return i-1;
			}
		}
		return-1;
	}

	__getset(1,RouteController,'instance',function(){
		if (!RouteController._instance)
			RouteController._instance=new RouteController();
		return RouteController._instance;
	});

	RouteController._instance=null;
	return RouteController;
})()


//class com.subject.services.SubjectServiceCenter
var SubjectServiceCenter=(function(){
	function SubjectServiceCenter(){}
	__class(SubjectServiceCenter,'com.subject.services.SubjectServiceCenter');
	/**
	*@Author:Snow
	*@description:预习服务
	*@param {*}
	*@return {*}
	*/
	__getset(1,SubjectServiceCenter,'previewService',function(){
		return ServiceCenter.getService("SubjectServiceNames.previewService");
	});

	/**
	*@Author:Snow
	*@description:课后作业
	*@param {*}
	*@return {*}
	*/
	__getset(1,SubjectServiceCenter,'afterClassEvaService',function(){
		return ServiceCenter.getService("SubjectServiceNames.afterClassEvaService");
	});

	/**
	*@Author:Snow
	*@description:复习课服务
	*@param {*}
	*@return {*}
	*/
	__getset(1,SubjectServiceCenter,'reviseService',function(){
		return ServiceCenter.getService("SubjectServiceNames.reviseService");
	});

	/**
	*@Author:Snow
	*@description:备课链服务
	*@param {*}
	*@return {*}
	*/
	__getset(1,SubjectServiceCenter,'prepareLessonsService',function(){
		return ServiceCenter.getService("SubjectServiceNames.prepareLessonsService");
	});

	SubjectServiceCenter.addSubjectServices=function(){
		ServiceConfig.getInstance().addBusinessConfig("SubjectServiceNames.previewService",PreviewService,1);
		ServiceConfig.getInstance().addBusinessConfig("SubjectServiceNames.afterClassEvaService",AfterClassEvaService,1);
		ServiceConfig.getInstance().addBusinessConfig("SubjectServiceNames.prepareLessonsService",PrepareLessonsService,1);
		ServiceConfig.getInstance().addBusinessConfig("SubjectServiceNames.reviseService",ReviseService,1);
	}

	SubjectServiceCenter.__init$=function(){{
			ServiceConfig.addSubjectServices=com.subject.services.SubjectServiceCenter.addSubjectServices;
		}
	}

	return SubjectServiceCenter;
})()


//class com.subject.services.SubjectServiceNames
var SubjectServiceNames=(function(){
	function SubjectServiceNames(){}
	__class(SubjectServiceNames,'com.subject.services.SubjectServiceNames');
	SubjectServiceNames.PREVIEW_SERVICE="SubjectServiceNames.previewService";
	SubjectServiceNames.AFTER_CLASS_EVA_SERVICE="SubjectServiceNames.afterClassEvaService";
	SubjectServiceNames.PREPARE_LESSONS_SERVICE="SubjectServiceNames.prepareLessonsService";
	SubjectServiceNames.REVISE_SERVICE="SubjectServiceNames.reviseService";
	return SubjectServiceNames;
})()


//class com.subject.SubjectVipThink
var SubjectVipThink=(function(){
	function SubjectVipThink(){}
	__class(SubjectVipThink,'com.subject.SubjectVipThink');
	var __proto=SubjectVipThink.prototype;
	Laya.imps(__proto,{"com.biz.IVipThinkImpl":true})
	__proto.subject=function(){
		return "math";
	}

	/**
	*@Author:Snow
	*@description:初始化Native
	*@param {*}
	*@return {*}
	*/
	__proto.initNative=function(){
		var _$this=this;
		console.log("------------------------->启动数学分包业务逻辑！<--------------------");
		var self=this;
		NativeAPI.__init__(Handler.create(null,function(_native,data){
			VipThink.nativeAPI=_native;
			Reporter.init(_native);
			VipThink.debugLog("VipThink","initNative","LaunchParam(origin):原始启动参数"+JSON.stringify(data));
			if (data.courseType==6 && data.host){
				data.courseType=1;
			};
			var courseCode=data.coursewareCode || data.course;
			if(data.courseType==1 && courseCode && courseCode.indexOf("_preview")>-1 && (courseCode.indexOf("lc_")>-1 || courseCode.indexOf("_light_")>-1)){
				data.courseType=4;
			}
			if (data.course=='spirit_1'){
				var resolutionWidth=data.resolutionWidth;
				var resolutionHeight=data.resolutionHeight;
				if (resolutionHeight && resolutionWidth){
					var dsWidth=1920,dsHeight=1080;
					if (Browser.window.GameLoader){
						dsWidth=Browser.window.GameLoader.DESIGN_WIDTH || dsWidth;
						dsHeight=Browser.window.GameLoader.DESIGN_HEIGHT || dsHeight;
					};
					var scale=1;
					if (resolutionWidth / resolutionHeight < dsWidth / dsHeight){
						scale=resolutionWidth / dsWidth;
						Laya.stage.size(resolutionWidth,resolutionHeight);
						if (VipThink.viewMgr.mainView){
							var s=VipThink.viewMgr.mainView.parent;
							if (s){
								VipThink.viewMgr.mainView.y=(resolutionHeight-dsHeight *scale)/ 2;
								s.size(Laya.stage.width,Laya.stage.height);
								VipThink.viewMgr.mainView.scale(scale,scale);
							}
						}
					}else {}
				}
			};
			var cacheLS=ObjUtil.getLocalData("isLessonStart");
			if (cacheLS)
				data.isLessonStart=cacheLS;
			VipThink.appid=data.appid;
			VipThink.courseID=data.course;
			VipThink.onRunner=data.onRunner;
			GlobalModel.isLessonStart=Boolean(data.isLessonStart);
			if (data.teacher)
				GlobalModel.roomOwner=data.teacher;
			data.nativeType=data.type;
			delete data.type;
			if (!data.hasOwnProperty("showRoomInfo")){
				data.showRoomInfo=Boolean(data.socketInfo.ip);
			}
			VipThink.config=ObjUtil.mergeObj(VipThink.config,data,false,true);
			VipThink.config.version=data.version ? data.version :VipThink.config.version;
			VipThink.viewMgr.once("initComplete",null,_$this.courseInitComplete);
			GameMgr.instance.init(VipThink.config,true);
			ResManager.__init__();
			DataCaptureManager.instance;
			_native.onInited({config:VipThink.config});
			CourseDataUtil.setData(CourseDataUtil.TYPE_LAUNCH_PARAM,data);
			VipThink.OPEN_PLAY_BACK_RECORD=data.openPlaybackRecord;
			VipThink.OPEN_PLAY_BACK=data.openPlayback;
			var socketInfo;
			if (CourseDataUtil.goClassData.server && CourseDataUtil.goClassData.server.length){
				console.debug("VipThink - initNative - launchParam goClassData.server is exist");
				CourseDataUtil.goClassData.roomID=data.socketInfo ? data.socketInfo.roomID :"";
				socketInfo=CourseDataUtil.goClassData;
				}else {
				console.debug("VipThink - initNative - launchParam goClassData.server is not exist");
				socketInfo=data.socketInfo;
			}
			VipThink.launchParam=new LaunchParam(socketInfo,VipThink.release);
			VipThink.launchParam.rawData=data;
			GlobalModel.userData=data.userVO;
			VipThink.servletConfig=data.servletConfig;
			VipThink.debugLog("VipThink","initNative","个性化开关状态-personality_question_config:"+data.personality_question_config);
			if (VipThink.config.release=='dev'){
				VipThink.OPEN_PLAY_BACK_RECORD=true;
				VipThink.CODE_PLAYBACK_RECORD_DATA=false;
			}
			if (!VipThink.config.hasOwnProperty("courseType")){
				if (data.userVO.controlType)
					VipThink.opMode=2;
				if (data.evaData)
					EvaModel.data=data.evaData;
			}
			if (data.page)
				GlobalModel.currProg=[parseInt(data.page),0];
			VipThink.debugLog("VipThink","initNative","LaunchParam(origin):处理后的启动参数:"+JSON.stringify(data));
			VipThink.viewMgr.getDrawView().setCanelNum();
			data.extend && SubjectVipThink.dealExtendParam(data.extend);
			KlEventCenter.once("baseResLoaded",SubjectVipThink,com.subject.SubjectVipThink.onBaseResLoaded);
			console.debug("请求语言接口：/api/aic-live/v1/chapter/query");
			var param={chapterId:VipThink.courseID};
			if(VipThink.config.evaData){
				param["evaId"]=VipThink.config.evaData.id;
			}
			Https.request("/api/aic-live/v1/chapter/query",param,this,function(_data){
				console.debug("语言接口返回："+JSON.stringify(_data));
				if(_data["isSuccess"]){
					VipThink.languageType=_data["data"]["chapterLanguageType"] || 1;
				}
				ServiceConfig.getInstance().startUpSystemServices(new Handler(self,function(){
					Laya.timer.callLater(SubjectVipThink,function(){
						ServiceConfig.getInstance().startUpBusinessServices(new Handler(SubjectVipThink,function(){
							console.debug("------->服务初始化完毕<--------");
							TransManager.doTrans("prepare");
						}));
					});
				}));
				KlEventCenter.event("afterNativeInit");
			});
		}));
	}

	/**
	*@Author:Snow
	*@description:课件初始化完毕
	*@param {*}
	*@return {*}
	*/
	__proto.courseInitComplete=function(){
		VipThink.destroyGameLoaderProgess();
		if (VipThink.release=="dev" && (!VipThink.config.hasOwnProperty("showBtn")|| VipThink.config.showBtn)&& VipThink.config.courseType!==101)
			VipThink.showFuncView();
		if (SubjectVipThink.config.courseCfg.classify)
			VipThink.viewMgr.functionShell.createFunctionView(SubjectVipThink.config.courseCfg.classify);
		else{
			var pages=SubjectVipThink.config.courseCfg.pages;
			if (pages){
				for (var i=0;i < pages.length;i++){
					var expand=pages[i].expand;
					if (expand){
						VipThink.viewMgr.functionShell.createFunctionView(expand);
						break ;
					}
				}
			}
		}
		CourseDataUtil.setData(CourseDataUtil.TYPE_COURSE_CONFIG,SubjectVipThink.config);
		TransManager.doTrans("broadCastSdlVersion",null,[{action:"doTrans",data:{userType:VipThink.user.userType,transType:"broadCastSdlVersion"}}])
		VipThink.courseInitComplete=true;
		KlEventCenter.event("courseInitComplete");
	}

	__getset(1,SubjectVipThink,'config',function(){
		return VipThink.config;
	});

	__getset(1,SubjectVipThink,'courseID',function(){
		return VipThink.courseID;
	});

	__getset(1,SubjectVipThink,'isTeacherLesson',function(){
		return true;
	});

	SubjectVipThink.dealExtendParam=function(ext){
		ext.startPageIdx && (GlobalModel.currProg=[ext.startPageIdx[0]-1,ext.startPageIdx[1]-1]);
		if (ext.toLastPage)
			SubjectVipThink.toLastPage=true;
	}

	SubjectVipThink.onBaseResLoaded=function(){
		if (VipThink.isAI)
			SocketDataDictionary.mySwitch=0;
		if (VipThink.cfgCourse && VipThink.cfgCourse.isEvaluation){
			VipThink.config.evaData && (EvaModel.data=VipThink.config.evaData);
			}else {
			switch (VipThink.config.courseType){
				case 7:
					VipThink.config.stageEvaData && (ExamModel.data=VipThink.config.stageEvaData);
					break ;
				case 2:
					VipThink.opMode=2;
					break ;
				case 102:
					VipThink.user.controlType=1;
					break ;
				default :
					break ;
				}
		}
		DataStatistics.instance().init();
		var ccfg=ServiceCenter.preloadService.getCourseCfg();
		if (VipThink.config.courseCfg)
			ObjUtil.mergeObj(VipThink.config.courseCfg,ccfg);
		else
		VipThink.config.courseCfg=ccfg;
		if (VipThink.courseType==97){
			VipThink.config.courseCfg.pages.pop()
			VipThink.config.courseCfg.pages=[VipThink.config.courseCfg.pages.pop()];
		}
		if (VipThink.cfgCourse.isAIrecord){
			VipThink.aiControler.recordMgr;
		}
		if (VipThink.config.courseIndices && VipThink.config.courseIndices.length > 0){
			var pages=VipThink.config.courseCfg.pages;
			if (pages && pages.length > 0){
				var _pageCfg=null;
				var realCfg=[];
				var _tmpStr=StringUtil.jsonStringify(SubjectVipThink.config.courseIndices);
				_tmpStr=String(_tmpStr).replace('\"','');
				var pageNums=StringUtil.jsonParse(_tmpStr);
				var _index=0;
				for (var i=0;i<pageNums.length;i++){
					_index=parseInt(pageNums[i]);
					if (_index < pages.length){
						_pageCfg=pages[_index];
						_pageCfg.currentIdx=_index;
						_pageCfg.totalLen=pages.length;
						realCfg.push(_pageCfg);
					}
				}
				VipThink.config.courseCfg.pages=realCfg;
			}
			else{
				console.error("错题重练配置错误,_config=",VipThink.config);
			}
			EvaModel.data.isRedoWrong=true;
			EvaModel.data.courseIndices=SubjectVipThink.config.courseIndices.concat();
		}
		if (EvaModel.data){
			if (!ccfg){
				Reporter.reportSLS("ccfg_error",{type:"course_error",param:{ccfg:ccfg,config_ccfg:VipThink.config.courseCfg }},console.warn);
			}
			if (ccfg.pages && ccfg.pages[0] && ccfg.pages[0].type=="evaGuide" && GlobalModel.currProg[0] !=0)
				GlobalModel.currProg=[GlobalModel.currProg[0]+1,GlobalModel.currProg[1]];
		};
		var pcfg=GameMgr.instance.gameSet.getCfgHandler().getPageCfg(VipThink.config.courseCfg);
		ResManager.pageConfig=VipThink.viewMgr.viewCfgList=pcfg;
		if (SubjectVipThink.isUseExtendSdk()){
			VipThink.importSdkExtend();
		}
		GlobalModel.instance.event("baseResLoaded");
		VipThink.playbackControler.initPlayback();
		SubjectVipThink.toLastPage && (GlobalModel.currProg=[ccfg.pages.length-1,0]);
		MateManager.instence.init(VipThink.nativeAPI);
		VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"sdkReady"}});
	}

	SubjectVipThink.isUseExtendSdk=function(){
		var isNewSSEV="newSpecialEvaluation"==SubjectVipThink.config.courseCfg.classify;
		var isUse=SubjectVipThink.isUseExtendSdkByCourseType(SubjectVipThink.config.courseType)|| isNewSSEV;
		return isUse;
	}

	SubjectVipThink.isUseExtendSdkByCourseType=function(courseType){
		if (courseType==102 || courseType==31 || courseType==32 || courseType==33 || courseType==35 || courseType==83 || courseType==12){
			return true;
		}
		return false;
	}

	SubjectVipThink.handlerExtendSdkRes=function(data){
		var loadInfo={url:"share/sdk/sdk_baiya_extend.js",type:"text"};
		SubjectVipThink._preloadRes.push(loadInfo);
	}

	SubjectVipThink.SUBJECT="math";
	SubjectVipThink.toLastPage=false;
	SubjectVipThink.cfgUrl=null;
	__static(SubjectVipThink,
	['_preloadRes',function(){return this._preloadRes=[{url:"res/atlas/share/comp.atlas",type:"atlas"},{url:"res/atlas/share/ui.atlas",type:"atlas"}];}
	]);
	SubjectVipThink.__init$=function(){{
			Browser.window.VipThinkMath=SubjectVipThink;
			VipThink.VipThinkImpl=new SubjectVipThink();
			Browser.window.__subject="math";
		};
	}

	return SubjectVipThink;
})()


/**
*备课链条 && 学习详情 关卡数据统计
*@author yangcy
*
*/
//class com.subject.services.preparelessonschain.PrepareLessonsChain extends laya.events.EventDispatcher
var PrepareLessonsChain=(function(_super){
	function PrepareLessonsChain(){
		/**
		*普通关卡完成总数
		*/
		this.nomalComplete=0;
		/**
		*视频关卡看完总数
		*/
		this.videoComplete=0;
		/**
		*记录当前关卡是否已经统计过了
		*/
		this.objKey={};
		/**
		*记录 题目做的是否正确 和更新题目是否正确
		*/
		this.objTiResult={};
		/**
		*记录 视频是否播放完成 的当前关卡
		*/
		this.objVideoResult={};
		PrepareLessonsChain.__super.call(this);
		this.init();
	}

	__class(PrepareLessonsChain,'com.subject.services.preparelessonschain.PrepareLessonsChain',_super);
	var __proto=PrepareLessonsChain.prototype;
	__proto.init=function(){
		KlEventCenter.on("videoEnd",this,this.onVideoEnd);
		KlEventCenter.on("result_Statistics_info",this,this.onResultStatisticsInfo);
		KlEventCenter.on("online_work_result",this,this.onReusult);
		console.log(PrepareLessonsChain.TAG+"备课链初始化");
	}

	/**
	*
	*@param objA 第一个参数：这一关的类型 string 第二个参数时做题对错数据
	*
	*/
	__proto.onResultStatisticsInfo=function(obj){
		if (obj){
			this.onFeedBacked(Number(obj.rt));
		}
	}

	/**
	*
	*@param key
	*
	*/
	__proto.onFeedBacked=function(key){
		var keyStr=VipThink.viewMgr.currPageIdx+"_"+VipThink.viewMgr.currSubviewIdx;
		if (this.objTiResult && this.objTiResult[keyStr] && key==this.objTiResult[keyStr]){
			console.log(PrepareLessonsChain.TAG,"已经统计过的数据=",this.objTiResult[keyStr]);
			return;
		}
		this.objTiResult[keyStr]=key;
		if (this.objKey[keyStr] !=1){
			this.objKey[keyStr]=1;
			this.nomalComplete++;
		}
		console.log(PrepareLessonsChain.TAG+"备课链收到了做题反馈对错状态："+key);
		this.onStatisticalReport(1);
	}

	__proto.onReusult=function(result){
		if (result==true || result==1){
			this.onFeedBacked(1);
		}
		else if (result==false || result==0){
			this.onFeedBacked(2);
		}
		else{
			this.onFeedBacked(2);
		}
	}

	__proto.onVideoEnd=function(){
		var keyStr=VipThink.viewMgr.currPageIdx+"_"+VipThink.viewMgr.currSubviewIdx;
		if (this.objVideoResult && this.objVideoResult[keyStr] && 1==this.objVideoResult[keyStr]){
			console.log(PrepareLessonsChain.TAG,"已经统计过的数据=",this.objVideoResult[keyStr]);
			return;
		}
		this.objVideoResult[keyStr]=1;
		if (this.objKey[keyStr]==1){
			return;
		}
		else{
			this.objKey[keyStr]=1;
			this.videoComplete++;
			this.onStatisticalReport();
		}
	}

	/**
	*
	*@param obj 数据
	*@param key 类型 1：普通题目 2：视频关卡
	*
	*/
	__proto.onStatisticalReport=function(key){
		(key===void 0)&& (key=0);
		console.log(PrepareLessonsChain.TAG,"课件类型：",CourseDataUtil.courseType,"用户类型：",VipThink.user.userType);
		if ((CourseDataUtil.courseType==95 || CourseDataUtil.courseType==6 || CourseDataUtil.courseType==4)&& VipThink.user.userType==1){
			var arrConfig=[];
			if (VipThink.config.courseCfg && VipThink.config.courseCfg.pages){
				arrConfig=VipThink.config.courseCfg.pages;
			};
			var len=arrConfig.length;
			var videoTotal=0;
			var nomalTotal=0;
			var teShuTotal=0;
			for (var i=0;i < len;i++){
				var oco=arrConfig[i];
				if (oco && oco.type){
					if (oco.type=="video"){
						videoTotal++;
					}
					else if (oco.type=="littleTeacher"){
						teShuTotal++;
					}
					else{
					}
				}
			}
			len=len-teShuTotal;
			nomalTotal=len-videoTotal;
			var obj={};
			obj.nomalTotal=nomalTotal;
			obj.videoTotal=videoTotal;
			obj.nomalComplete=this.nomalComplete;
			obj.videoComplete=this.videoComplete;
			obj.problemResult=this.objTiResult;
			obj.videoResult=this.objVideoResult;
			if (obj){
				var o={args:{origin:"laya",mainType:2,minorType:MinorType.prepareLessonsReport,data:obj}};
				VipThink.nativeAPI.mate(o);
				VipThink.nativeAPI.sendToNative("msgHtml",{action:MinorType.prepareLessonsReport,data:obj});
			}
		}
	}

	PrepareLessonsChain.instance=function(){
		if (PrepareLessonsChain._instance==null){
			PrepareLessonsChain._instance=new PrepareLessonsChain();
		}
		return PrepareLessonsChain._instance;
	}

	PrepareLessonsChain._instance=null;
	PrepareLessonsChain.TAG="PrepareLessonsChain";
	return PrepareLessonsChain;
})(EventDispatcher)


/**
*数学ViewManager实现器
*/
//class com.subject.SubjectViewManagerImpl extends com.biz.ui.BaseViewManagerImpl
var SubjectViewManagerImpl=(function(_super){
	function SubjectViewManagerImpl(){
		/**反馈层 */
		this._feedbackView=null;
		this._whiteBoard=null;
		this._mirroBrushView=null;
		this._bigWhiteBrushBoxTab=null;
		this._taskRewardView=null;
		this._personalizedView=null;
		this._challengeAlertView=null;
		this._routeController=null;
		this._previewView=null;
		this._messageView=null;
		this._stateView=null;
		this._randomInviteView=null;
		this._answerRaceView=null;
		this._cursorBox=null;
		this._knowledgePocketBox=null;
		this._classNotes=null;
		SubjectViewManagerImpl.__super.call(this);
	}

	__class(SubjectViewManagerImpl,'com.subject.SubjectViewManagerImpl',_super);
	var __proto=SubjectViewManagerImpl.prototype;
	__proto.__init__=function(){
		_super.prototype.__init__.call(this);
		this._feedbackView=new FeedbackView();
		this._feedbackView.name="feedbackView";
		this._feedbackView.size(this.root.width,this.root.height);
		this.root.addChild(this._feedbackView);
		this.setView(this._feedbackView);
		this._feedbackView.on("showAnswerFace",this,function(type){
			console.info("==========================");
			console.info("有"+(type==1 ? "正确" :"错误")+"反馈，录播课会跳老师视频");
			console.info("==========================");
		});
	}

	__proto.initViews=function(){
		_super.prototype.initViews.call(this);
		if (VipThink.isTeacherLesson){
			this._whiteBoard=new WhiteBoardBox();
			this._whiteBoard.name="whiteBoard";
			this._whiteBoard.size(this.root.width,this.root.height);
			this.root.addChild(this._whiteBoard);
			this.setView(this._whiteBoard);
		}
		if (VipThink.isTeacherLesson){
			this._mirroBrushView=new MirrorBrushBox();
			this._mirroBrushView.name="mirroBrushView";
			this._mirroBrushView.size(this.root.width,this.root.height);
			this.root.addChild(this._mirroBrushView);
			this.setView(this._mirroBrushView);
		}
		if (VipThink.isTeacherLesson){
			this._bigWhiteBrushBoxTab=new BrushBoxNewView();
			this._bigWhiteBrushBoxTab.name="bigWhiteBrushBoxTab";
			this._bigWhiteBrushBoxTab.size(this.root.width,this.root.height);
			this.root.addChild(this._bigWhiteBrushBoxTab);
			this.setView(this._bigWhiteBrushBoxTab);
		}
		if (VipThink.isTeacherLesson){
			this._taskRewardView=new TaskRewardView();
			this._taskRewardView.name="taskRewardView";
			this.root.addChild(this._taskRewardView);
			this._taskRewardView.size(this.root.width,this.root.height);
			this.setView(this._taskRewardView);
		}
		if (VipThink.cfgCourse.isOfficalLesson || CourseDataUtil.goClassData.courseTrueType==2 || VipThink.originCourseType==11){
			if (VipThink.user.isTech || VipThink.user.isStu){
				this._personalizedView=new PersonalizedView();
				this._personalizedView.name="personalizedView";
				this.root.addChild(this._personalizedView);
				this.setOrders();
				this.setView(this._personalizedView);
			}
		}
		if (this.isShowChallengeView){
			this._challengeAlertView=new ChallengeAlertView();
			this._challengeAlertView.name="challengeAlertView";
			this.root.addChild(this._challengeAlertView);
			this.setView(this._challengeAlertView);
			VipThink.debugLog("MyViewManager","onBaseResLoaded","isOfficalLesson:"+VipThink.cfgCourse.isOfficalLesson);
			this.setOrders();
			if ((VipThink.config.course && (VipThink.config.course.indexOf("ysx_")!=-1))|| VipThink.config.courseCfg.routeSelect){
				this._routeController=new RouteController();
			}
		}
		if (VipThink.config.course && (VipThink.config.course.indexOf("_preview")!=-1)){
			this._previewView=new PreviewView();
			this._previewView.name="previewView";
			this._previewView.zOrder=MyViewManager.VIEW_ZORDER["previewView"];
			this.root.addChild(this._previewView);
			this.setView(this._previewView);
		}
		if (VipThink.config.showRoomInfo){
			this._messageView=new MessageView();
			this._messageView.name="messageView";
			this._messageView.zOrder=MyViewManager.VIEW_ZORDER["messageView"];
			this.root.addChild(this._messageView);
			this.setView(this._messageView);
		};
		var type=VipThink.originCourseType;
		var appType=VipThink.appType;
		if ((appType !=1 && appType !=2)&& ((type===11 &&!VipThink.user.isTech)|| VipThink.OPEN_PLAY_BACK|| VipThink.OPEN_RECORD_COURSE|| VipThink.OPEN_PLAY_BACK_COURSE)){
			this._knowledgePocketBox=new KnowledgePocketBox();
			this._knowledgePocketBox.name="knowledgePocketBox";
			this._knowledgePocketBox.size(this.root.width,this.root.height);
			this.root.addChild(this._knowledgePocketBox);
			this.setView(this._knowledgePocketBox);
		}
		if ((appType !=1 && appType !=2)){
			var _biaoDaSiKuBox=new BiaoDaSiKuBox();
			_biaoDaSiKuBox.name="biaoDaSiKuBox";
			_biaoDaSiKuBox.size(this.root.width,this.root.height);
			this.root.addChild(_biaoDaSiKuBox);
			this.setView(_biaoDaSiKuBox);
		}
		this._classNotes=new ClassNotesBox();
		this._classNotes.name="classNotes";
		this._classNotes.size(this.root.width,this.root.height);
		this.root.addChild(this._classNotes);
		this.setView(this._classNotes);
		var _textNotes=new TextNotesBox();
		_textNotes.name="textNotesBox";
		_textNotes.size(this.root.width,this.root.height);
		this.root.addChild(_textNotes);
		this.setView(_textNotes);
		var _whiteBoardNew=new WhiteBoardNewBox();
		_whiteBoardNew.name="whiteBoardNewBox";
		_whiteBoardNew.size(this.root.width,this.root.height);
		this.root.addChild(_whiteBoardNew);
		this.setView(_whiteBoardNew);
		var switchQuestionResultView=new SwitchQuestionResultView();
		switchQuestionResultView.name="SwitchQuestionResultView";
		switchQuestionResultView.size(this.root.width,this.root.height);
		this.setView(switchQuestionResultView);
		this.initExtendModule();
		this._stateView=new StateView();
		this._stateView.name="stateView";
		this._stateView.zOrder=MyViewManager.VIEW_ZORDER["stateView"];
		this.root.addChild(this._stateView);
		this.setView(this._stateView);
		if (VipThink.isTeacherLesson){
			this._randomInviteView=new RandomInviteView();
			this._randomInviteView.name="randomInviteView";
			this._randomInviteView.zOrder=MyViewManager.VIEW_ZORDER["randomInviteView"];
			this.root.addChild(this._randomInviteView);
			this.setView(this._randomInviteView);
		}
		if (VipThink.isTeacherLesson){
			this._answerRaceView=new AnswerRaceView();
			this._answerRaceView.name="answerRaceView";
			this._answerRaceView.zOrder=MyViewManager.VIEW_ZORDER["answerRaceView"];
			this.root.addChild(this._answerRaceView);
			this.setView(this._answerRaceView);
		}
		if (this.initCursorBox){
			this._cursorBox=new CursorBox();
			this._cursorBox.name="cursorBox";
			this._cursorBox.zOrder=MyViewManager.VIEW_ZORDER["cursorBox"];
			this.root.addChild(this._cursorBox);
			this.setView(this._cursorBox);
		}
		if (VipThink.DEBUG){
			var _logPanelBox=Logs.show(this.root);
			this.setView(_logPanelBox);
		};
		var lParam=VipThink.nativeAPI.launchParam;
		if (lParam.showToolBox)
			this.initToolBox();
		this.initCustomModal(lParam.customModal);
		this.setOrders();
		if(VipThink.OPEN_LIVE_COURSE && VipThink.user.isStu && !this.root.hasListener("click")){
			this.root.on("click",this,this.onStageClick);
		}
	}

	__proto.onStageClick=function(e){
		console.warn("stage click：",e.stageX,e.stageY);
	}

	/**
	*设置层级
	*/
	__proto.setOrders=function(){
		for(var i in this.viewDic){
			var view=this.viewDic[i];
			var name=view.name;
			if(MyViewManager.VIEW_ZORDER[name]){
				view.zOrder=MyViewManager.VIEW_ZORDER[name];
			}
		}
	}

	/**初始化工具盒 */
	__proto.initToolBox=function(){
		var _$this=this;
		var self=this;
		Laya.loader.load([{url:"res/atlas/share/pithink_ui.atlas",type:"atlas"},{url:"res/atlas/share/pithink_ui.png",type:"image"}],Handler.create(this,function(){
			var mainView=VipThink.viewMgr.mainView;
			var drawView=VipThink.viewMgr.getDrawView();
			var tb=new ToolBox(VipThink.viewMgr.mainView);
			tb.name="toolBox";
			_$this.root.addChild(tb);
			tb.zOrder=MyViewManager.VIEW_ZORDER["toolBox"];
			self.setView(tb);
			tb.on("resize",null,function(){
				drawView.pos(mainView.x,mainView.y);
				drawView.scale(mainView.scaleX,mainView.scaleY);
			});
		}));
	}

	/**初始化自定义模态 */
	__proto.initCustomModal=function(type){
		var customModal;
		if (type=="student")
			customModal=new StudentCustomModal()
		else
		customModal=new BlankCustomModal();
		customModal.init(VipThink.viewMgr.mainModal,VipThink.viewMgr.getCursorBox());
	}

	__proto.initExtendModule=function(){
		if (SubjectVipThink.isUseExtendSdk()){
			if (!VipThink.sdkExtend){
				console.warn("为啥SDK扩展没有装载！！！");
			};
			var args=null;
			if (VipThink.config.courseType==31){
				VipThink.sdkExtend.initModule("interaction_class",args);
			}
			if (VipThink.config.courseType==32){
				VipThink.sdkExtend.initModule("little_pea_pk",args);
			}
			if (VipThink.config.courseType==35){
				VipThink.sdkExtend.initModule("xiaofeixia_interaction_class",args);
			}
			if (VipThink.config.courseType==102){
				VipThink.sdkExtend.initModule("activity_before_class",args);
			}
			if(VipThink.config.courseCfg && "newSpecialEvaluation"==VipThink.config.courseCfg.classify){
				VipThink.sdkExtend.initModule("new_special_evaluation",args);
			}
			if (83==VipThink.courseType && VipThink.config.courseCfg && true==VipThink.config.courseCfg.isRecordRuMenKe){
				VipThink.sdkExtend.initModule("ru_men_ke_ai_record",args);
			}
			if (12==VipThink.courseType && VipThink.config.courseCfg && true==VipThink.config.courseCfg.isRecordRuMenKe){
				VipThink.sdkExtend.initModule("ru_men_ke_homework",args);
			}
		}
	}

	__getset(0,__proto,'answerRaceView',function(){
		return this._answerRaceView;
	});

	__getset(0,__proto,'feedBackView',function(){
		return this._feedbackView;
	});

	__getset(0,__proto,'personalizedView',function(){
		return this._personalizedView;
	});

	__getset(0,__proto,'randomInviteView',function(){
		return this._randomInviteView;
	});

	/**是否初始化自定义光标 */
	__getset(0,__proto,'initCursorBox',function(){
		if (VipThink.nativeAPI.launchParam.showCursor)
			return true;
		if (!VipThink.launchParam.ip && VipThink.release !="official")
			return false;
		if (VipThink.nativeAPI.launchParam.showCursor===false)
			return false;
		return true;
	});

	__getset(0,__proto,'routeController',function(){
		return this._routeController;
	});

	__getset(0,__proto,'messageView',function(){
		return this._messageView;
	});

	__getset(0,__proto,'challengeAlertView',function(){
		return this._challengeAlertView;
	});

	__getset(0,__proto,'previewView',function(){
		return this._previewView;
	});

	__getset(0,__proto,'stateView',function(){
		return this._stateView;
	});

	/**
	*是否显示挑战题弹窗
	*(VipThink.config.course && VipThink.config.course.indexOf("sku_logic_")!=-1)修改学生端适应索引 sku——logic SKU 逻辑狗课件单独弹窗
	*/
	__getset(0,__proto,'isShowChallengeView',function(){
		return VipThink.cfgCourse.showChallenge || (VipThink.config.courseCfg.showChallenge && VipThink.config.courseCfg.showChallenge=="yes")
	});

	__getset(0,__proto,'cursorBox',function(){
		return this._cursorBox;
	});

	__getset(0,__proto,'root',function(){
		return ViewManager.instance.root;
	});

	SubjectViewManagerImpl.__init$=function(){{
			ViewManager.ViewImplClass=SubjectViewManagerImpl;
		};
	}

	return SubjectViewManagerImpl;
})(BaseViewManagerImpl)


//class com.subject.services.afterclasseva.AfterClassEvaService extends com.biz.services.ServiceBase
var AfterClassEvaService=(function(_super){
	function AfterClassEvaService(){
		AfterClassEvaService.__super.call(this);;
	}

	__class(AfterClassEvaService,'com.subject.services.afterclasseva.AfterClassEvaService',_super);
	var __proto=AfterClassEvaService.prototype;
	__proto.initService=function(){
		KlEventCenter.on("courseInitComplete",this,this.onCourseComplete);
		this.invokeInited();
	}

	__proto.onCourseComplete=function(){
		AfterClassEvaManager.instance.init();
	}

	__getset(0,__proto,'enabled',function(){
		return VipThink.cfgCourse.afterClassSev;
	});

	return AfterClassEvaService;
})(ServiceBase)


//class com.subject.services.preparelessonschain.PrepareLessonsService extends com.biz.services.ServiceBase
var PrepareLessonsService=(function(_super){
	function PrepareLessonsService(){
		PrepareLessonsService.__super.call(this);;
	}

	__class(PrepareLessonsService,'com.subject.services.preparelessonschain.PrepareLessonsService',_super);
	var __proto=PrepareLessonsService.prototype;
	__proto.initService=function(){
		PrepareLessonsChain.instance();
		this.invokeInited();
	}

	__getset(0,__proto,'enabled',function(){
		var b=(CourseDataUtil.courseType==95 || CourseDataUtil.courseType==6)&& VipThink.user.userType==1;
		return b;
	});

	return PrepareLessonsService;
})(ServiceBase)


//class com.subject.services.preview.PreviewService extends com.biz.services.ServiceBase
var PreviewService=(function(_super){
	function PreviewService(){
		PreviewService.__super.call(this);;
	}

	__class(PreviewService,'com.subject.services.preview.PreviewService',_super);
	var __proto=PreviewService.prototype;
	__proto.initService=function(){
		KlEventCenter.on("courseInitComplete",this,this.onCourseComplete);
		if (VipThink.courseID && VipThink.courseID.indexOf("_preview")!=-1){
			PreviewModel.setData(VipThink.config);
		}
		this.invokeInited();
	}

	__proto.onCourseComplete=function(){
		PreviewManager.instance.init();
	}

	__proto.clear=function(){
		_super.prototype.clear.call(this);
		KlEventCenter.off("courseInitComplete",this,this.onCourseComplete);
	}

	__getset(0,__proto,'enabled',function(){
		if (VipThink.courseID && VipThink.courseID.indexOf("_preview")!=-1){
			return true;
		}
		if (VipThink.courseType==4){
			return true;
		}
		return false;
	});

	return PreviewService;
})(ServiceBase)


//class com.subject.services.revise.ReviseService extends com.biz.services.ServiceBase
var ReviseService=(function(_super){
	function ReviseService(){
		ReviseService.__super.call(this);;
	}

	__class(ReviseService,'com.subject.services.revise.ReviseService',_super);
	var __proto=ReviseService.prototype;
	__proto.initService=function(){
		ReviseManager.instance.init();
		this.invokeInited();
	}

	__getset(0,__proto,'enabled',function(){
		if (VipThink.courseType==94){
			return true
			}else{
			return false;
		}
	});

	return ReviseService;
})(ServiceBase)


/**
*Author:Evans<br/>
*反馈层
*/
//class com.subject.module.feedback.FeedbackView extends laya.display.Sprite
var FeedbackView=(function(_super){
	function FeedbackView(){
		/**笑脸动画 */
		this._skeAnswerFace=null;
		/**得分视图 */
		this._scoreBox=null;
		this._myViewManager=null;
		this._receiveStarsView=null;
		this.PLAYING=false;
		this.EVENT_ANSWER_FACE="showAnswerFace";
		/**即将播放反馈动画的事件 */
		this.EVENT_WILL_SHOW_ANSWER_FACE="willShowAnswerFace";
		/**笑脸对应数据 */
		this._ANSWER_FACE_DATA=[ {name:"ok",sound:"share/sound/anwser_right.wav"},{name:"no",sound:"share/sound/anwser_wrong.wav"},{name:"impotence",sound:"share/sound/anwser_wrong.wav"},{name:"bear_happy1",sound:"share/sound/woxdmx.wav"},{name:"bear_happy1",sound:"share/sound/woxdmx.wav"},{name:"bear_baye",sound:"share/sound/slyx.wav"},{name:"xx",sound:"share/sound/nzstbl.wav"},{name:"xxx",sound:"share/sound/oywcl.wav"},{name:"lediAuthor"},];
		this.WAN_DOU_ANSWER_FACE_ARR=["share/animation/yee_WAV.wav","share/animation/zaixiangxiang.wav","share/animation/taikexi.wav"];
		this.MINORTYPE_TO_ANINAME={enqueue:[ {ske:"mimimao",name:"speak"},{ske:"pph",name:"speak"},{ske:"cml",name:"speak"},{ske:"dlxf",name:"speak"},{ske:"syls45",name:"speak"},{ske:"hmf",name:"speak"}],showTrophyAni:{ske:"jiangbei",name:"chuxian"}};
		this._ascendV3Init=null;
		// 记录ReceiveStarsView 的发放奖杯的数据。
		this.skSound={
			ldok:{tbl:"share/animation/ld_tbl.wav"},
			ld:{"ld_no(yx)":"share/animation/anwser_wrong.wav"}
		};
		/**笑脸结束 的回调 */
		this._hdrAnswerFace=null;
		/**
		*Desc:播放授权动画
		*/
		this._currSound=null;
		FeedbackView.__super.call(this);
		var _$this=this;
		this._myViewManager=VipThink.viewMgr;
		this.size(Klzz.designWidth,Klzz.designHeight);
		this.mouseThrough=true;
		var self=this;
		KlEventCenter.on("afterNativeInit",this,function(){
			VipThink.nativeAPI.eventDispatch.on("nativeToLaya",self,_$this.onNativeToLaya);
		});
		KlEventCenter.on("showFeedBack",this,this.onNativeToLaya);
		this.customLoadRes();
		CustomRoomDataUtil.addMsgListener(Protocol.EFFECT,this,this.onEffect);
	}

	__class(FeedbackView,'com.subject.module.feedback.FeedbackView',_super);
	var __proto=FeedbackView.prototype;
	__proto.customLoadRes=function(){
		var resArr=[];
		if (this.isUseNewLdRight){
			resArr.push({url:"share/animation/ldok.png",type:"image"});
			resArr.push({url:"share/animation/ldok.sk",type:"arraybuffer"});
			resArr.push({url:"share/animation/ld_tbl.wav",type:"sound"});
			resArr.push({url:"share/animation/ld_tbl_language_2.wav",type:"sound"});
			resArr.push({url:"share/animation/ld_tbl_language_3.wav",type:"sound"});
		}
		if (this.isUseNewLdWrong){
			resArr.push({url:"share/animation/ld.png",type:"image"});
			resArr.push({url:"share/animation/ld.sk",type:"arraybuffer"});
			resArr.push({url:"share/animation/anwser_wrong.wav",type:"sound"});
			resArr.push({url:"share/animation/anwser_wrong_language_2.wav",type:"sound"});
			resArr.push({url:"share/animation/anwser_wrong_language_3.wav",type:"sound"});
		}
		Laya.loader.load(resArr);
	}

	// 根据不同的数据播放不同的动画
	__proto.onNativeToLaya=function(args){
		if (this.PLAYING){
			console.debug("FeedbackView --------------onNativeToLaya------------- 有动画正在播放，返回");
			return;
		};
		var minorType=args.minorType;
		if (this.MINORTYPE_TO_ANINAME[minorType]){
			console.debug("FeedbackView--------------onNativeToLaya------------- 准备播放动画类型："+minorType);
			var detail;
			if (minorType=="enqueue" && args.data && args.data.ip){
				detail=this.MINORTYPE_TO_ANINAME[minorType][args.data.ip-1];
				if (!detail)
					return;
				this._skeAnswerFace=this.getSkeletonBySkeName(detail.ske);
				this._skeAnswerFace.name=minorType;
				this._skeAnswerFace.scale(1.2,1.2);
				this._skeAnswerFace.pos(this.width / 2,this.height *0.85);
			}
			else if (minorType=="showTrophyAni"){
				detail=this.MINORTYPE_TO_ANINAME[minorType];
				this._skeAnswerFace=this.getSkeletonBySkeName(detail.ske);
				this._skeAnswerFace.name=minorType;
				this._skeAnswerFace.scale(1,1);
				this._skeAnswerFace.pos(this.width / 2,this.height *0.69);
				console.debug("FeedbackView--------------onNativeToLaya------------- 准备播放奖杯动画，sk名"+detail.ske);
			}
			if (!this.contains(this._skeAnswerFace)){
				console.debug("FeedbackView--------------onNativeToLaya------------- 动画不存在，添加");
				this.addChild(this._skeAnswerFace);
			}
			this._skeAnswerFace.visible=true;
			this._skeAnswerFace.play(detail.name,false);
			console.debug("FeedbackView--------------onNativeToLaya------------- 播放动画，动画名"+detail.name);
			this._skeAnswerFace.once("stopped",this,this.afterNativeCallPlay,[minorType]);
			if (detail.sound)
				KlSoundManager.playSound(detail.sound);
			VipThink.viewMgr.showObstacleView=true;
			this.PLAYING=true;
			this.delayCheckObstacleViewStatus();
		}
		if (minorType=="trophyPopUpPrize"){
			TransManager.doTrans("ascendV3",null,[ {action:"doTrans",data:{studentId:args.data.studentId,isUpgrade:args.data.isUpgrade,rewardId:args.data.rewardId,transType:"ascendV3"}}]);
		}
	}

	__proto.afterNativeCallPlay=function(minorType){
		var _$this=this;
		if (minorType=="showTrophyAni"){
			this._skeAnswerFace.play("daiji",false);
			return this.timerOnce(2000,this,function(){
				VipThink.viewMgr.showObstacleView=false;
				_$this.PLAYING=false;
				if (minorType==_$this._skeAnswerFace.name){
					_$this._skeAnswerFace.removeSelf();
				}
			});
		}
		VipThink.viewMgr.showObstacleView=false;
		this.PLAYING=false;
		if (minorType==this._skeAnswerFace.name){
			this._skeAnswerFace.removeSelf();
		}
	}

	/**处理反馈请求 */
	__proto.handleFeedbackEvt=function(data){
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		var type=data.type;
		if (type=="answerFace"){
			this.showAnswerFace(data.ftype,data.complete,data.ischinese);
		}
		else if (type=="addScore"){
			this.showScoreBox();
		}
		else if (type=="setAuthor"){
			this.setAuthor(data);
		}
		else if (type=="applause"){
			var ids=[];
			var obj={name:data["action"]};
			if(data["studentId"]){
				ids.push(data["studentId"]);
				obj["count"]=1;
			}
			CustomRoomDataUtil.sendMsg(Protocol.EFFECT,obj,ids);
		}
	}

	/**
	*显示 笑脸动画
	*@param type 表情类型（1：笑 2：哭 3：遗憾）
	*@param complete 动画结束 的回调，会传入的参数：[skeleton:该笑脸动画,type:是否答对]
	*@return
	*/
	__proto.showAnswerFace=function(type,complete,ischinese){
		var _$this=this;
		(type===void 0)&& (type=1);
		(ischinese===void 0)&& (ischinese=0);
		if (this.PLAYING)
			return;
		if(SwitchQuestionCtr.isQuestionPage()){
			this.event(this.EVENT_ANSWER_FACE,[type]);
			return;
		}
		if (VipThink.config.courseCfg.subject=="chinese"){
			ischinese=1;
		};
		var idx=type-1;
		if (idx==-2 && this._skeAnswerFace){
			this._skeAnswerFace.off("stopped",this,this.skePlayStop,[this._skeAnswerFace,type]);
			this._skeAnswerFace.removeSelf();
			return;
		}
		if (!this._ANSWER_FACE_DATA[idx]){
			if (idx >=0)
				console.warn("FeedbackView","没这个类型的表情..");
			return;
		}
		this.event(this.EVENT_WILL_SHOW_ANSWER_FACE,[type]);
		var courseId=VipThink.config.course;
		var courseClassify=VipThink.config.courseCfg.classify;
		var isStepFourToSix=false;
		var isEditorStepFourToEight=false;
		var isUpgrade=false;
		var isEn=this.isEnLd;
		var isWdEn=isEn && this.isWdEn();
		if (courseClassify)
			isUpgrade=courseClassify.indexOf("Upgrade")!=-1;
		if (courseId){
			isStepFourToSix=courseId.indexOf("s4_")!=-1 || courseId.indexOf("s5_")!=-1 || courseId.indexOf("s6_")!=-1 || VipThink.config.courseCfg.feedback=="spirit";
			isEditorStepFourToEight=courseId.indexOf("edt_s4")!=-1 || courseId.indexOf("edt_s5")!=-1 || courseId.indexOf("edt_s6")!=-1 || courseId.indexOf("edt_s7")!=-1 || courseId.indexOf("edt_s8")!=-1;
		};
		var dotSK=(isStepFourToSix || isEditorStepFourToEight || isUpgrade)? "wandou" :"ok_no_face";
		if (this.isUseNewLdRight && dotSK !="wandou")
			dotSK=type==1 ? "ldok" :(this.isUseNewLdWrong && dotSK !="wandou")? "ld" :"ok_no_face";
		if (ischinese==1){
			dotSK=type==1 ? "zb_dd_yes" :"zb_dd_no";
		}
		if (isEn && !isWdEn){
			dotSK="ok_no_face";
		}
		this._skeAnswerFace=this.getSkeletonBySkeName(dotSK,type);
		this._skeAnswerFace.name=dotSK;
		var skeName;
		var fdata={};
		if (!isWdEn){
			if (isStepFourToSix || isEditorStepFourToEight || isUpgrade){
				skeName=type==1 ? "right" :(isUpgrade ? "wrong2" :"wrong");
				if (dotSK=="wandou"){
					fdata["sound"]=idx==2 ? this.WAN_DOU_ANSWER_FACE_ARR[idx] :VipThink.getLanguageSound(this.WAN_DOU_ANSWER_FACE_ARR[idx]);
				}
			}
			else if (this.isUseNewLdRight && type==1){
				skeName="tbl";
			}
			else if (this.isUseNewLdWrong && type==2)
			skeName="ld_no(yx)";
			else{
				var data=this._ANSWER_FACE_DATA[idx];
				fdata["name"]=data["name"];
				fdata["sound"]=data["sound"];
				if (type==2){
					fdata["sound"]=VipThink.getLanguageSound(fdata["sound"]);
				}
				if (ischinese==1){
					this._skeAnswerFace.scale(1,1);
				}
				else{
					this._skeAnswerFace.scale(2,2);
				};
				var ran=type==1 ? (Math.floor(Math.random()*2+1))+"" :"";
				skeName=fdata.name+ran;
			}
		}
		if (isEn){
			var answerData=[ {name:"ok",sound:"share/sound/anwser_right.wav"},{name:"no",sound:"share/sound/anwser_wrong_en.wav"},{name:"impotence",sound:"share/sound/anwser_wrong_en.wav"}];
			fdata=answerData[idx];
			if (isWdEn){
				this._skeAnswerFace.scale(1,1);
				skeName=type==1 ? "right" :(isUpgrade ? "wrong2" :"wrong");
			}
			else{
				var scale=ischinese==1 ? 1 :2;
				this._skeAnswerFace.scale(scale,scale);
				var ran1=type==1 ? (Math.floor(Math.random()*2+1))+"" :"";
				skeName=fdata.name+ran1;
			}
		}
		if (ischinese==1){
			skeName="animation";
		}
		VipThink.viewMgr.showObstacleView=true;
		this.PLAYING=true;
		this.delayCheckObstacleViewStatus();
		if (fdata.sound){
			this.frameOnce(3,this,function(s,skName){
				if (VipThink.OPEN_PLAY_BACK)
					return;
				if (skName !="wandou"){
					var v=VipThink.viewMgr.currPage.currView;
					if (v){
						if (type==1){
							var rightSound=v.LEDI_RIGHT_SOUND;
							if (rightSound)
								s=rightSound;
						}
						else if (type==2){
							var wrongSound=v.LEDI_WRONG_SOUND;
							if (wrongSound)
								s=wrongSound;
						}
					}
				}
				if (ischinese !=1){
					KlSoundManager.playSoundUnSync(s);
				}
			},[fdata.sound,dotSK]);
		}
		else{
			var soundUrl=this.getSound(dotSK,skeName);
			if (soundUrl){
				this.frameOnce(3,this,function(_soundUrl){
					KlSoundManager.playSoundUnSync(_soundUrl);
				},[soundUrl]);
			}
		}
		if (this._hdrAnswerFace)
			this._hdrAnswerFace.recover();
		this._hdrAnswerFace=complete;
		this._skeAnswerFace.once("stopped",this,this.skePlayStop,[this._skeAnswerFace,type,"showAnswerFace"]);
		var delay=dotSK=="wandou" ? 3 :0;
		this.frameOnce(delay,this,function(){
			_$this._skeAnswerFace.play(skeName,false);
			if (!_$this.contains(_$this._skeAnswerFace)){
				if (ischinese==1){
					_$this._skeAnswerFace.pos(0,1080);
				}
				else{
					_$this._skeAnswerFace.pos(_$this.width / 2,_$this.height / 2);
				}
				_$this.addChild(_$this._skeAnswerFace);
			}
		});
	}

	/**
	*Desc:播放解锁动画
	*/
	__proto.playUnlockAni=function(onComplete){
		this.showBear(4,onComplete);
	}

	/**
	*Desc:播放画笔动画
	*/
	__proto.playBrushAni=function(onComplete){
		this.showBear(5,onComplete);
	}

	/**
	*显示 笑脸动画
	*@param type 表情类型（1：笑 2：哭 3：遗憾）
	*@param complete 动画结束 的回调，会传入的参数：[skeleton:该笑脸动画,type:是否答对]
	*@return
	*/
	__proto.showBear=function(type,complete){
		(type===void 0)&& (type=1);
	}

	/**
	*Desc:播放下课动画
	*/
	__proto.playDownClassFunAni=function(onComplete){
		this.showGainBear(6,onComplete);
	}

	/**
	*显示 获得 天气熊动画
	*@param type 表情类型（1：笑 2：哭 3：遗憾）
	*@param complete 动画结束 的回调，会传入的参数：[skeleton:该笑脸动画,type:是否答对]
	*@return
	*/
	__proto.showGainBear=function(type,complete){
		(type===void 0)&& (type=1);
	}

	/**
	*动画播放结束回调
	*@param ske [description]
	*@param ftype [description]
	*@return [description]
	*/
	__proto.skePlayStop=function(ske,ftype,feedBackType){
		if (this.PLAYING)
			this._hdrAnswerFace && this._hdrAnswerFace.runWith([ske,ftype]);
		this._hdrAnswerFace=null;
		this._currSound=null;
		this._skeAnswerFace.removeSelf();
		this.mouseThrough=true;
		this.PLAYING=false;
		VipThink.viewMgr.showObstacleView=false;
		this.timer.clearAll(this);
		if (feedBackType=="showAnswerFace"){
			this.event(this.EVENT_ANSWER_FACE,[ftype]);
		}
	}

	// VipThink.viewMgr.showObstacleView=false;
	__proto.onPrepared=function(){
		this.PLAYING=false;
		this._currSound=null;
		if (this._skeAnswerFace){
			this._skeAnswerFace.stop();
		}
	}

	/**
	*通过动画名获取动画
	*@param _name [description]
	*@param type [description]
	*@return [description]
	*/
	__proto.getSkeletonBySkeName=function(_name,type){
		(_name===void 0)&& (_name="ok_no_face");
		(type===void 0)&& (type=1);
		if (this._skeAnswerFace && this._skeAnswerFace.name==_name){
			return this._skeAnswerFace;
		}
		else{
			if (this._skeAnswerFace){
				this._skeAnswerFace.off("stopped",this,this.skePlayStop,[this._skeAnswerFace,type]);
				this._skeAnswerFace.removeSelf();
			}
			return new KlSkeleton("share/animation/"+_name+".sk");
		}
	}

	/**显示加分界面 */
	__proto.showScoreBox=function(){
		this.mouseThrough=true;
		if (!this._scoreBox){
			this._scoreBox=new ScoreBox();
			this._scoreBox.zOrder=10;
		}
		if (!this.contains(this._scoreBox)){
			this.addChild(this._scoreBox);
			this.parent.event("setMainModalStyle",[true,.5]);
			this._scoreBox.once("removed",this.parent,this.parent.event,["setMainModalStyle",[false]]);
		}
		this._scoreBox.playAnimation();
	}

	__proto.setAuthor=function(data,type,complete){
		var _$this=this;
		(type===void 0)&& (type=9);
		var isBrush=false;
		var isMouseThrough=true;
		var isbrushType=NaN;
		if (data){
			isBrush=data.isBrush;
			isMouseThrough=data.isMouseThrough;
			isbrushType=data.brushType;
		}
		if (this._skeAnswerFace && this.contains(this._skeAnswerFace)&& this._skeAnswerFace.name=="ledi_author"){
			return;
		}
		if (!VipThink.viewMgr.currPage || !VipThink.viewMgr.currPage.currView || (VipThink.viewMgr.currPage.currView.status !="prepared")){
			this.frameOnce(1,this,this.setAuthor,[data,type,complete]);
			return;
		};
		var idx=type-1;
		var fdata=this._ANSWER_FACE_DATA[idx];
		if (!fdata){
			console.error("FeedbackView","没这个类型的表情.");
			return;
		};
		var strSoundName=this.isCourse()? "you_wd_" :"you_";
		if (isBrush && !isMouseThrough && isbrushType && isbrushType > 0){
			if (isbrushType==6 || isbrushType==8){
				strSoundName+="caca";
			}
			else if (isbrushType==7){
				strSoundName+="write";
			}
			else if (isbrushType==11){
				strSoundName+="act";
			}
			else{
				strSoundName+="draw";
			}
		}
		else{
			strSoundName+="act";
		};
		var soundName=VipThink.getLanguageSound("share/sound/"+strSoundName+".wav");
		if (this._currSound==soundName && this.getChildByName(this._skeAnswerFace.name)){
			console.error("FeedbackView","有一个同类型的表情正在播放.");
			return;
		}
		VipThink.viewMgr.showObstacleView=true;
		this.mouseThrough=true;
		this.delayCheckObstacleViewStatus();
		GlobalModel.instance.on("changed",this,this.onGlobalModelChange);
		if (this.isCourse()){
			this._skeAnswerFace=this.getSkeletonBySkeName("wd_in",type);
			this._skeAnswerFace.name="wandou_author";
			this._skeAnswerFace.play("in_2s",false);
		}
		else{
			this._skeAnswerFace=this.getSkeletonBySkeName("ledi_author",type);
			this._skeAnswerFace.name="ledi_author";
			this._skeAnswerFace.play(fdata.name,false);
			this._skeAnswerFace.scale(1.25,1.25);
		}
		if (!this.contains(this._skeAnswerFace)){
			this._skeAnswerFace.pos(this.width / 2,this.height / 2);
			this.addChild(this._skeAnswerFace);
		}
		this._skeAnswerFace.once("stopped",this,this.skePlayStop,[this._skeAnswerFace,type]);
		if (this._currSound !=soundName){
			this._currSound=soundName;
			KlSoundManager.playSound(soundName,1,Handler.create(this,function(){
				_$this._currSound=null;
			}),null,0,null,false,true);
			if (Browser.onIOS || Browser.onAndroid){
				this.timer.once(1000,this,function(){
					_$this._currSound=null;
				});
			}
		}
		if (this._hdrAnswerFace)
			this._hdrAnswerFace.recover();
		this._hdrAnswerFace=complete;
	}

	// end of function showLediAuthor
	__proto.isCourse=function(){
		var _course=VipThink.config.course;
		if (!_course)
			return true;
		return _course.indexOf("s5")!=-1 || _course.indexOf("s6")!=-1 || _course.indexOf("s7")!=-1 || _course.indexOf("s8")!=-1 || _course.indexOf("s9")!=-1 || _course.indexOf("s4")!=-1;
	}

	__proto.onGlobalModelChange=function(data){
		if (!GlobalModel.isLisChannelEditor){
			this._currSound=null;
		}
	}

	/**
	*Desc:显示领取星星界面
	*/
	__proto.showReceiveStarsView=function(onComplete){
		var _$this=this;
		this.mouseThrough=true;
		this.event("showReceiveStarsView");
		var myType=GlobalModel.user.userType;
		if (myType==2){
			if (VipThink.viewMgr.getCursorBox()){
				VipThink.viewMgr.getCursorBox().sysMouseVisible=true;
				console.debug('FeedbackView - showReceiveStarsView 领取星星界面，显示光标');
			}
			else{
				console.warn('FeedbackView - showReceiveStarsView VipThink.viewMgr.getCursorBox() is undefined');
			};
			var score=NaN;
			if (GlobalModel.user.userType==3){
				var watchingObj=VipThink.userStatus.getStudentByID(GlobalModel.user.watchingUser);
				if ((watchingObj instanceof com.biz.model.StudentVO ))
					score=watchingObj.totalScore;
				else
				return;
			}
			else{
				score=(GlobalModel.user).totalScore;
			}
			this._receiveStarsView=new ReceiveStarsView();
			this._receiveStarsView.name="receiveStarsView";
			ViewManager.instance.root.addChild(this._receiveStarsView);
			this._receiveStarsView.visible=true;
			if (GlobalModel.user.userType==2 && VipThink.originCourseType==11){
				this._receiveStarsView.setScore(0,false);
				Https.request("/api/aic-live/v1/live/getLiveStudentInfo",{liveId:VipThink.config.liveId,liveType:3,studentId:GlobalModel.user.id},this,function(data){
					if (data["isSuccess"]){
						_$this._receiveStarsView.setScore(data["data"]["score"],true);
					}
				});
			}
			else{
				this._receiveStarsView.setScore(isNaN(score)? 0 :score);
			}
		}
		VipThink.nativeAPI.noticeNative({args:{type:"nomal",data:{}}});
		if (myType==3 || myType==2){
			VipThink.nativeAPI.noticeNative({args:{type:"receiveStars",act:"show",data:{act:"show"}}});
		}
	}

	// end of function function_name
	__proto.onEffect=function(data){
		if(VipThink.user.isTech)return;
		this.mouseThrough=true;
		var name=data["name"];
		this._skeAnswerFace=this.getSkeletonBySkeName(name);
		this._skeAnswerFace.name=name;
		var type=name=="sahua" ? "sprinkling" :"handclap";
		VipThink.nativeAPI.noticeNative({args:{type:type}});
		this._skeAnswerFace.play(name+"1",false);
		if (this._hdrAnswerFace)
			this._hdrAnswerFace.recover();
		this._skeAnswerFace.once("stopped",this,this.skePlayStop,[this._skeAnswerFace,name]);
		if (!this.contains(this._skeAnswerFace)){
			this._skeAnswerFace.pos(this.width / 2,this.height / 2);
			this.addChild(this._skeAnswerFace);
		}
		if(data["count"]){
			var stuData=VipThink.userStatus.getStudentByID(VipThink.user.id);
			if (stuData){
				stuData.setApplauseCount(type=='sprinkling');
			}
		}
	}

	/**
	*为了避免小概率的解锁/授权后蒙层导致不能操作，在设置蒙层2s后检查一次状态是否一致（蒙层是否被正确设置）
	*/
	__proto.delayCheckObstacleViewStatus=function(){
		var self=this;
		this.timerOnce(4000,this,function(){
			if (GlobalModel.user.userType !=3 && GlobalModel.isLisChannelEditor){
				self.mouseEnabled=false;
				VipThink.viewMgr.showObstacleView=false;
			}
		});
	}

	__proto.isWdEn=function(){
		if (VipThink.isMath()){
			var arr=["s4_","s5_","s6_","s7_","s8_","s9_"];
			var str=VipThink.config.course.substr(0,3);
			return arr.indexOf(str)!=-1;
		}
		return false;
	}

	__proto.getSound=function(skName,actionName){
		var url;
		var obj=this.skSound[skName];
		if (obj){
			url=VipThink.getLanguageSound(obj[actionName]);
		}
		return url;
	}

	// 英文版
	__getset(0,__proto,'isEnLd',function(){
		var courseObj=VipThink.config.courseCfg;
		if (courseObj && courseObj.lang==="en")
			return true;
		else
		return false;
	});

	__getset(0,__proto,'isUseNewLdRight',function(){
		var courseId=VipThink.config.course;
		if (courseId)
			return courseId.indexOf("dt_")!=-1 || courseId.indexOf("_v3_")!=-1 || courseId.indexOf("_v4_")!=-1 || courseId.indexOf("lc_")!=-1 || courseId.indexOf("_light_")!=-1 || courseId=="ltg" || courseId.indexOf("s2a_")!=-1 || courseId.indexOf("s3a_")!=-1 || VipThink.config.courseCfg.feedback=="newLD";
		else
		return false;
	});

	__getset(0,__proto,'isUseNewLdWrong',function(){
		var courseId=VipThink.config.course;
		if (courseId)
			return courseId.indexOf("dt_")!=-1 || courseId.indexOf("_v3_")!=-1 || courseId.indexOf("_v4_")!=-1 || VipThink.config.courseCfg.feedback=="newLD";
		else
		return false;
	});

	return FeedbackView;
})(Sprite)


/**
*Author:Evans<br/>
*学生自定义模态层
*/
//class com.subject.module.toolbox.StudentCustomModal extends laya.display.Sprite
var StudentCustomModal=(function(_super){
	function StudentCustomModal(){
		this._cursorBox=null;
		StudentCustomModal.__super.call(this);
	}

	__class(StudentCustomModal,'com.subject.module.toolbox.StudentCustomModal',_super);
	var __proto=StudentCustomModal.prototype;
	Laya.imps(__proto,{"com.subject.module.toolbox.ICustomModal":true})
	//implements start
	__proto.init=function(modal,cursorBox){
		this._cursorBox=cursorBox;
		modal.customModal=this;
		modal.addChild(this);
		this.size(modal.width,modal.height);
		this.graphics.drawRect(0,0,this.width,this.height,"#666666");
		var lbl=new Label();
		lbl.font="SimHei";
		lbl.bold=true;
		lbl.color="#ffffff";
		lbl.text="请看大屏幕";
		lbl.fontSize=50;
		lbl.pos(this.width-lbl.width >> 1,this.height-lbl.height >> 1);
		this.addChild(lbl);
	}

	//override start
	__getset(0,__proto,'visible',_super.prototype._$get_visible,function(v){
		this._cursorBox && (this._cursorBox.cursorVisible=!v);
	});

	return StudentCustomModal;
})(Sprite)


//class com.subject.tools.LayaSkeleton extends laya.ani.bone.Skeleton
var LayaSkeleton=(function(_super){
	function LayaSkeleton(url){
		this._url=null;
		this.playParams=null;
		this.caller=null;
		this.callback=null;
		this.isRelease=false;
		LayaSkeleton.__super.call(this);
		(url===void 0)&& (url="");
		this.loadTemplet(url);
	}

	__class(LayaSkeleton,'com.subject.tools.LayaSkeleton',_super);
	var __proto=LayaSkeleton.prototype;
	__proto.loadTemplet=function(url){
		(url===void 0)&& (url="");
		if(url && !this._url){
			var templet=new Templet();
			templet.once("complete",this,function(){
				this._url=url;
				this.init(templet,Klzz.aniMode);
				var params=this.playParams;
				if(params){
					this.play(params["nameOrIndex"],params["loop"],params["force"],params["start"],params["end"],params["freshSkin"],params["playAudio"]);
					this.playParams=null;
				}
			});
			templet.loadAni(url);
		}
	}

	__proto.play=function(nameOrIndex,loop,force,start,end,freshSkin,playAudio){
		(force===void 0)&& (force=true);
		(start===void 0)&& (start=0);
		(end===void 0)&& (end=0);
		(freshSkin===void 0)&& (freshSkin=true);
		(playAudio===void 0)&& (playAudio=true);
		if(this._url){
			_super.prototype.play.call(this,nameOrIndex,loop,force,start,end,freshSkin,playAudio);
		}
		else{
			this.playParams={
				nameOrIndex:nameOrIndex,
				loop:loop,
				force:force,
				start:start,
				end:end,
				freshSkin:freshSkin,
				playAudio:playAudio
			}
		}
	}

	__proto.playOnce=function(nameOrIndex,caller,callback,isRelease){
		(isRelease===void 0)&& (isRelease=true);
		this.once("stopped",this,this.onStopped);
		this.play(nameOrIndex,false);
		this.caller=caller;
		this.callback=callback;
		this.isRelease=isRelease;
	}

	__proto.onStopped=function(){
		if(this.callback){
			this.callback.call(this.caller);
		}
		if(this.isRelease){
			com.subject.tools.LayaSkeleton.release(this);
		}
	}

	__proto.clear=function(){
		this.stop();
		this.templet.destroy();
		this._templet=null;
		this.offAll();
		this.removeSelf();
		this._url="";
		this.playParams=null;
		this.caller=null;
		this.callback=null;
		this.isRelease=true;
	}

	LayaSkeleton.create=function(url){
		(url===void 0)&& (url="");
		var ls=com.subject.tools.LayaSkeleton.arr.pop()|| new LayaSkeleton(url);
		return ls;
	}

	LayaSkeleton.release=function(ls){
		ls.clear();
		com.subject.tools.LayaSkeleton.arr.push(ls);
	}

	LayaSkeleton.arr=[];
	return LayaSkeleton;
})(Skeleton)


/**
*Author:Evans<br/>
*得分界面
*/
//class com.subject.module.feedback.ScoreBox extends laya.ui.Box
var ScoreBox=(function(_super){
	function ScoreBox(){
		this._URL_SKE="share/animation/Huo_de_feng_shu.sk";
		this._SCALE_SKE=.5;
		this._RADIUS_PHOTO=94;
		this._POS_INFO_START=[887,706];
		this._Y_END=[430,450];
		this._SCALE_END=1.4;
		/**底层动画 */
		this._skBg=null;
		/**表层动画 */
		this._skCover=null;
		/**用户信息 */
		this._userInfo=null;
		/**头像 */
		this._imgUser=null;
		/**名字 */
		this._txtName=null;
		/**是否准备好关闭 */
		this._readyToClose=false;
		/**是否准备好播放 */
		this._readyToPlay=false;
		/**是否播放 */
		this._playAnimation=false;
		ScoreBox.__super.call(this);
		this.on("added",this,this._$5_onAdded);
	}

	__class(ScoreBox,'com.subject.module.feedback.ScoreBox',_super);
	var __proto=ScoreBox.prototype;
	/**播放得分动画 */
	__proto.playAnimation=function(){
		this._playAnimation=true;
		if (!this._readyToPlay)
			return;
		this.doPlayAnimation();
	}

	/**当被爷节点移除 */
	__proto._$5_onRemoved=function(){
		this._skCover && this._skCover.destroy();
		this._skBg && this._skBg.destroy();
		this._skCover=this._skBg=null;
		Laya.timer.clearAll(this);
		Tween.clearAll(this._userInfo);
		this._playAnimation=this._readyToClose=this._readyToPlay=false;
	}

	/**当添加到父节点 */
	__proto._$5_onAdded=function(){
		this.once("removed",this,this._$5_onRemoved);
		this.size((this.parent).width,(this.parent).height);
		this._skBg=new Skeleton(null,Klzz.aniMode);
		this._skBg.load(this._URL_SKE,Handler.create(this,this.onSkeParsed,[this._skBg]),1);
		this._skBg.scale(1/this._SCALE_SKE,1/this._SCALE_SKE);
		this._skBg.visible=false;
		this._skBg.pos(this.width/2,this.height/2);
		this.addChild(this._skBg);
		this.createUserInfo().visible=false;
		this._skCover=new Skeleton(null,Klzz.aniMode);
		this._skCover.load(this._URL_SKE,Handler.create(this,this.onSkeParsed,[this._skCover]),1);
		this._skCover.scale(1/this._SCALE_SKE,1/this._SCALE_SKE);
		this._skCover.visible=false;
		this._skCover.pos(this.width/2,this.height/2);
		this.addChild(this._skCover);
	}

	/**当动画转换完毕 */
	__proto.onSkeParsed=function(ske){
		ske.paused();
		if (this._skCover.isParseComplete && this._skBg.isParseComplete){
			this.readyToPlay=true;
		}
	}

	/**
	*创建学生信息
	*/
	__proto.createUserInfo=function(){
		if (this._userInfo)
			return this._userInfo;
		this._userInfo=new Sprite();
		var bg=Sprite.fromImage("share/pithink_ui/bg_white_1.png");
		bg.pivot(80,78);
		bg.scale(1.2,1.2);
		this._userInfo.addChild(bg);
		this._imgUser=new Image("share/pithink_ui/img_kid_1.png");
		this._imgUser.size(190,190);
		var pos=100 *.95;
		this._imgUser.pos(-pos,-pos);
		this._userInfo.addChild(this._imgUser);
		var mask=new Sprite();
		mask.graphics.drawCircle(98,98,this._RADIUS_PHOTO,"0xff0000");
		this._imgUser.mask=mask;
		var border=Sprite.fromImage("share/pithink_ui/bg_score_user_1.png");
		border.pos(-98,-98);
		this._userInfo.addChild(border);
		var bgn=Sprite.fromImage("share/pithink_ui/bg_score_user_2.png");
		bgn.pos(-84,49);
		this._userInfo.addChild(bgn);
		this._txtName=new Text();
		this._txtName.font="SimHei";
		this._txtName.fontSize=27;
		this._txtName.stroke=5;
		this._txtName.strokeColor="#0f5485";
		this._txtName.text="小乐乐";
		this._txtName.align="center";
		this._txtName.color="#ffffff";
		this._txtName.width=150;
		this._txtName.pos(-75,52);
		this._userInfo.addChild(this._txtName);
		this._userInfo.zOrder=10;
		this.addChild(this._userInfo);
		this._userInfo.cacheAsBitmap=true;
		return this._userInfo;
	}

	/**执行播放动画 */
	__proto.doPlayAnimation=function(){
		Laya.timer.clearAll(this);
		Tween.clearAll(this._userInfo);
		this._readyToClose=false;
		this._userInfo.visible=false;
		var svo=GlobalModel.user;
		this._imgUser.skin=svo.headerImg;
		this._txtName.text=svo.name;
		this._skBg.play("1",false);
		this._skBg.visible=true;
		this._skCover.play("3",false);
		this._skCover.visible=true;
		this._skCover.once("stopped",this,this.readyToClose);
		this.timerOnce(2100,this,this.floatUser);
	}

	/**
	*Desc:飘起用户信息
	*/
	__proto.floatUser=function(){
		this._userInfo.visible=true;
		this._userInfo.pos(this._POS_INFO_START[0],this._POS_INFO_START[1]);
		this._userInfo.scale(1,1);
		Transition.queue([
		{target:this._userInfo,prop:{y:this._Y_END[0],scaleX:this._SCALE_END,scaleY:this._SCALE_END},duration:267},
		{target:this._userInfo,prop:{y:this._Y_END[1]},duration:300}]).play();
	}

	/**
	*Desc:准备好关闭
	*/
	__proto.readyToClose=function(){
		this._readyToClose=true;
		var stage=Laya.stage;
		if (!stage.hasListener("click"))
			stage.once("click",this,this.onStuffComplete);
		Laya.timer.once(3000,this,this.onStuffComplete);
	}

	/**
	*Desc:结算结束
	*/
	__proto.onStuffComplete=function(force){
		(force===void 0)&& (force=false);
		if (!this._readyToClose && !force)
			return;
		this.stage.off("click",this,this.onStuffComplete);
		this.removeSelf();
	}

	/**是否可播放 */
	__getset(0,__proto,'readyToPlay',null,function(v){
		if (this._readyToPlay==v)
			return;
		this._readyToPlay=v;
		if (v && this._playAnimation)
			this.doPlayAnimation();
	});

	return ScoreBox;
})(Box)


/**
*Author:Evans<br/>
*默认的toast提示
*/
//class com.subject.module.toast.DefaultToast extends laya.ui.Box
var DefaultToast$1=(function(_super){
	var OwnHandler;
	function DefaultToast(){
		/**显示/隐藏缓动时间 */
		this.TWEEN_DURATION=500;
		/**底图 */
		this._bg=null;
		/**消息文本 */
		this._txtMsg=null;
		/**图标 */
		this._icon=null;
		/**父容器 */
		this._toParent=null;
		/**维持时间 */
		this._holdTime=NaN;
		/**是否模态 */
		this._modal=false;
		/**缓动/时间线对象 */
		this._tween=null;
		/**隐藏结束 的回调 */
		this._hdrHidden=null;
		/**缓动标签事件回调 */
		this._hdrLabelEvt=null;
		/**类型 */
		this._type="none";
		/**状态变更处理 */
		this._stateChangedHandler=null;
		DefaultToast.__super.call(this);
		this._showPos="showPosTop";
		this._ease=Ease.expoOut;
		this._currState="hidden";
		this._bg=new Sprite();
		this._bg.alpha=.6;
		this.addChild(this._bg);
		this.test();
	}

	__class(DefaultToast,'com.subject.module.toast.DefaultToast',_super,'DefaultToast$1');
	var __proto=DefaultToast.prototype;
	Laya.imps(__proto,{"com.subject.module.toast.IToast":true})
	__proto.test=function(){
		if (!com.subject.module.toast.DefaultToast.DEBUG)return;
		Laya.stage.on("keydown",this,this.onKeyDown);
	}

	__proto.onKeyDown=function(evt){
		var keyCode=evt.keyCode;
		this.log(keyCode);
		if (keyCode===74){
			VipThink.viewMgr.toast("维持3秒","type1","info",3000,true);
		}
		if (keyCode===75){
			VipThink.viewMgr.toast("一直保持","type2","question",0,false);
		}
		if (keyCode===76){
			VipThink.viewMgr.hideToast("type1");
		}
		if (keyCode===186){
			VipThink.viewMgr.hideToast();
		}
	}

	//implements start
	__proto.show=function(parent,msg,type,icon,time,modal){
		(time===void 0)&& (time=3000);
		(modal===void 0)&& (modal=false);
		DefaultToast.instance && DefaultToast.instance.hide(false);
		DefaultToast.instance=this;
		this._modal=modal;
		this._holdTime=time;
		this._toParent=parent;
		this._type=type;
		this.msg=msg;
		this.icon=icon;
		this.currState="showing";
		this.callLater(this.showAtPos);
	}

	__proto.hide=function(tween){
		(tween===void 0)&& (tween=true);
		if (this._currState==="hidden")return;
		this.log("toast hide",tween,this.msg,this._holdTime);
		Laya.timer.clearAll(this);
		if(this._icon){
			this._icon.rotation=0;
			this.timer.clear(this,this.rotate);
		}
		this.stopTween();
		if (!tween){
			this.onHidden();
			}else {
			var toy=this._showPos=="showPosTop" ?-86 :this._toParent.height;
			this._tween=Transition.moveTo(this,this.TWEEN_DURATION,{
				y:toy,
				ease:this._ease,
				complete:this.hdrHidden
			});
			this.currState="hiding";
		}
	}

	//implements end
	__proto.log=function(__params){
		var params=arguments;
		if (!com.subject.module.toast.DefaultToast.DEBUG)return;
		console.log.apply(console,params);
	}

	/**在指定的位置显示 */
	__proto.showAtPos=function(){
		if (DefaultToast.instance !=this || !this._toParent || this._currState!=="showing")
			return;
		this.log("toast show",this.msg,this._holdTime);
		var orix=this._toParent.width-this.width >> 1;
		var oriy=0,toy=0;
		if (this._showPos=="showPosTop"){
			oriy=-86;
			toy=0;
			}else {
			oriy=this._toParent.height;
			toy=this._toParent.height-86;
		}
		if (!this._toParent.contains(this))
			this._toParent.addChild(this);
		if(this.msg=="NET_CONNECTING"){
			if(this._icon){
				this.timerLoop(100,this,this.rotate);
			}
		}
		this.pos(orix,oriy);
		if (this._holdTime > 0){
			this._tween=Transition.queue([
			{to:{y:toy},target:this,duration:this.TWEEN_DURATION,param:{ease:this._ease}},
			{label:"waitStart"},
			{label:"waitEnd",duration:this._holdTime},
			{to:{y:oriy},target:this,duration:this.TWEEN_DURATION,param:{ease:this._ease,delay:this._holdTime}}],this.hdrHidden);
			this._tween.on("label",this,this.onLabelEvt);
			this._tween.play();
			}else {
			this._tween=Transition.moveTo(this,this.TWEEN_DURATION,{
				y:toy,
				ease:this._ease,
				complete:this.getLabelEvtHandler("waitStart")
			});
		}
	}

	/**当隐藏后 */
	__proto.onHidden=function(){
		this.log("toast hidden",this.msg,this._holdTime);
		this.removeSelf();
		this.clear();
		this.currState="hidden";
	}

	__proto.clear=function(){
		this.log("toast clear",this.msg,this._holdTime);
		this.stopTween();
		this._modal=false;
		this._holdTime=0;
		this._type=null;
		this.msg="";
	}

	/**中止缓动 */
	__proto.stopTween=function(){
		if (!this._tween)return;
		this.log("toast stop tween",this.msg,this._holdTime);
		if ((this._tween instanceof laya.utils.TimeLine )){
			var tl=this._tween;
			tl.offAll();
			tl.destroy();
			}else if ((this._tween instanceof laya.utils.Tween )){
			var tw=this._tween;
			tw.clear();
			tw.recover();
		}
		this._tween=null;
		this._hdrHidden && this._hdrHidden.recover();
		this._hdrHidden=null;
		this._hdrLabelEvt && this._hdrLabelEvt.recover();
		this._hdrLabelEvt=null;
	}

	__proto.rotate=function(){
		this._icon.rotation+=30;
	}

	/**根据内容更新布局 */
	__proto.updateLayout=function(){
		this.updateBgSize();
		this.updateElementsLayout();
	}

	/**算出内容宽度并更新底图尺寸 */
	__proto.updateBgSize=function(){
		var wholeWidth=this._icon.width+this._txtMsg.width+14+2*35;
		this.size(wholeWidth,86);
		this._bg.graphics.clear();
		this._bg.graphics.drawRect(0,0,this.width,this.height,"#fdeae3");
	}

	/**更新内部元素布局 */
	__proto.updateElementsLayout=function(){
		this._icon.x=35;
		this._txtMsg.x=this._icon.x+this._icon.width+14;
	}

	/**创建label */
	__proto.createLabel=function(){
		var lbl=new Label();
		lbl.fontSize=32;
		lbl.color="#3c3c3a";
		lbl.anchorY=0.5;
		lbl.centerY=0;
		return lbl;
	}

	/**缓动标签事件回调 */
	__proto.getLabelEvtHandler=function(label){
		if (this._hdrLabelEvt)debugger;
		this._hdrLabelEvt && this._hdrLabelEvt.recover();
		this._hdrLabelEvt=OwnHandler.kreate("toast",this,this.onLabelEvt,label ? [label] :null);
		return this._hdrLabelEvt;
	}

	/**
	*处理时间线的事件
	*@param evt
	*/
	__proto.onLabelEvt=function(evt){
		if ((typeof evt=='string')){
			if (evt==="waitStart")this.currState="showed";
			if (evt==="waitEnd")this.currState="hiding";
		}
	}

	/**隐藏结束的回调 */
	__getset(0,__proto,'hdrHidden',function(){
		if (this._hdrHidden)debugger;
		this._hdrHidden && this._hdrHidden.recover();
		this._hdrHidden=OwnHandler.kreate("toast",this,this.onHidden);
		return this._hdrHidden;
	});

	__getset(0,__proto,'type',function(){
		return this._type;
	});

	/**当前状态 */
	__getset(0,__proto,'currState',null,function(v){
		if (v===this._currState)return;
		this.log("toast state",v,this.msg,this._holdTime);
		this._currState=v;
		this._stateChangedHandler && this._stateChangedHandler.runWith({target:this,state:v });
	});

	__getset(0,__proto,'modal',function(){
		return this._modal;
	});

	// _txtMsg.y=_HEIGHT_BG-_txtMsg.height >> 1;
	__getset(0,__proto,'onStateChanged',null,function(v){
		this._stateChangedHandler=v;
	});

	/**提示消息 */
	__getset(0,__proto,'msg',function(){
		return this._txtMsg ? this._txtMsg.text :null;
		},function(v){
		if (!this._txtMsg){
			this._txtMsg=this.createLabel();
			this.addChild(this._txtMsg);
		}
		this._txtMsg.text=v;
		this.callLater(this.updateLayout);
	});

	/**图标 */
	__getset(0,__proto,'icon',null,function(v){
		if (!this._icon){
			this._icon=new Image();
			this.addChild(this._icon);
			this._icon.width=this._icon.height=32;
			this._icon.anchorX=0.5;
			this._icon.anchorY=0.5;
			this._icon.centerY=0;
		};
		var iconUrl=DefaultToast.ICON_MAP[v] || DefaultToast.ICON_MAP["info"];
		this._icon.skin=iconUrl;
		this.callLater(this.updateLayout);
	});

	DefaultToast.genHandler=function(caller,method,args,once){
		(once===void 0)&& (once=true);
		if (!DefaultToast._handlerPool.length)return DefaultToast._handlerPool.pop().setTo(caller,method,args,once);
		return new Handler(caller,method,args,once);
	}

	DefaultToast.STATE_SHOWING="showing";
	DefaultToast.STATE_SHOWED="showed";
	DefaultToast.STATE_HIDING="hiding";
	DefaultToast.STATE_HIDDED="hidden";
	DefaultToast.SHOW_POS_TOP="showPosTop";
	DefaultToast.SHOW_POS_BOTTOM="showPosBottom";
	DefaultToast._PADDING_BG_HORI=35;
	DefaultToast._MARGIN_INNTER=14;
	DefaultToast._HEIGHT_BG=86;
	DefaultToast._handlerPool=[];
	DefaultToast.instance=null;
	DefaultToast.DEBUG=false;
	__static(DefaultToast,
	['ICON_MAP',function(){return this.ICON_MAP={
			"info":"share/ui/icon_warning_2.png",
			"ok":"share/ui/icon_ok_1.png",
			"netNotGood":"share/ui/icon_wifi_1.png",
			"netBad":"share/ui/icon_wifi_2.png",
			"loading":"share/ui/icon_loading_1.png",
			"question":"share/ui/icon_question_1.png"
	};}

	]);
	DefaultToast.__init$=function(){
		//class OwnHandler extends laya.utils.Handler
		OwnHandler=(function(_super){
			function OwnHandler(flag,caller,method,args,once){
				/**对象池标识 */
				this._poolFlag=null;
				OwnHandler.__super.call(this);
				(once===void 0)&& (once=false);
				this._poolFlag=flag;
				this.setTo(caller,method,args,once);
			}
			__class(OwnHandler,'',_super);
			var __proto=OwnHandler.prototype;
			__proto.recover=function(){
				if (this._id > 0){
					var pool=OwnHandler._pools[this._poolFlag];
					if (!pool){
						pool=[];
						OwnHandler._pools[this._poolFlag]=pool;
					}
					pool.push(this.clear());
				}
			}
			__proto.clear=function(){
				this._id=0;
				this._poolFlag=null;
				return _super.prototype.clear.call(this);
			}
			OwnHandler.kreate=function(flag,caller,method,args,once){
				(once===void 0)&& (once=true);
				var pool=OwnHandler._pools[flag];
				if (!pool){
					pool=[];
					OwnHandler._pools[flag]=pool;
				};
				var result;
				if (pool.length){
					result=pool.pop().setTo(caller,method,args,once);
					result._poolFlag=flag;
					}else {
					result=new OwnHandler(flag,caller,method,args,once);
				}
				return result;
			}
			OwnHandler._pools={};
			return OwnHandler;
		})(Handler)
	}

	return DefaultToast;
})(Box)


/**
*Author:Evans<br/>
*功能盒
*/
//class com.subject.module.toolbox.BoxFunc extends laya.ui.Box
var BoxFunc=(function(_super){
	function BoxFunc(){
		this.btnEndLesson=null;
		this.btnReset=null;
		this.btnLock=null;
		this.btnPrev=null;
		this.btnNext=null;
		this.btnPrevSubj=null;
		this.btnNextSubj=null;
		this.btnMusic=null;
		this.bgSubj=null;
		this.bgBursh=null;
		this.btnBrush=null;
		this.btnFree=null;
		this.btnLine=null;
		this.btnRect=null;
		this.btnUndo=null;
		this.btnClear=null;
		this._BTN_ARR=[
		"btnEndLesson",
		"btnReset",
		"btnLock",
		"btnPrev",
		"btnNext",
		"btnPrevSubj",
		"btnNextSubj",
		"btnMusic"];
		this._BRUSH_BTN_ARR=[
		"btnBrush",
		"btnFree",
		"btnLine",
		"btnRect",
		"btnUndo",
		"btnClear"];
		this._musicMuted=false;
		this._currBrushType=0;
		this._BRUSH_TYPE=["Free","Line","Rect"];
		BoxFunc.__super.call(this);
		this.once("added",this,this._$5_onAdded);
	}

	__class(BoxFunc,'com.subject.module.toolbox.BoxFunc',_super);
	var __proto=BoxFunc.prototype;
	//override start
	__proto.addChild=function(node){
		if (this._BTN_ARR.indexOf(node.name)>=0 || this._BRUSH_BTN_ARR.indexOf(node.name)>=0)
			this[node.name]=node;
		else if (node.name=="bgSubj")
		this.bgSubj=node;
		else if (node.name=="bgBursh")
		this.bgBursh=node;
		return laya.display.Node.prototype.addChild.call(this,node);
	}

	/**当被添加到父节点 */
	__proto._$5_onAdded=function(){
		for(var i=0,len=this._BTN_ARR.length;i < len;i++){
			var btnName=this._BTN_ARR[i];
			if (this[btnName])
				this[btnName].on("click",this,this.onBtnClick);
			else
			console.warn("BoxFunc","怎么会没这按钮？",btnName);
		}
		for(i=0,len=this._BRUSH_BTN_ARR.length;i < len;i++){
			btnName=this._BRUSH_BTN_ARR[i];
			if (this[btnName])
				this[btnName].on("click",this,this.onBrushBtnClick);
			else
			console.warn("BoxFunc","怎么会没这按钮？",btnName);
		}
		this.brushSetting={isOpenBrush:false,brushType:0};
		GlobalModel.instance.on("changed",this,this.onGlobalModelChange);
		VipThink.viewMgr.on("changed",this,this.onCurrPageStatus);
		VipThink.channelStatus.on("bChannelChanged",this,this.updateLockBtnState);
	}

	/**当全局数据改变 */
	__proto.onGlobalModelChange=function(v){
		if (v.brushStatus)
			this.brushSetting=GlobalModel.brushSetVO;
		if (v.otherSetting)
			this.musicMuted=!GlobalModel.otherSetVO.musicVolume;
	}

	/**点击画笔相关按钮 */
	__proto.onBrushBtnClick=function(evt){
		var btn=evt.target;
		var currBrushSet=GlobalModel.brushSetVO.getMyObject();
		switch(btn){
			case this.btnBrush:
				currBrushSet.isOpenBrush=!currBrushSet.isOpenBrush;
				break ;
			case this.btnRect:
				currBrushSet.brushType=3;
				break ;
			case this.btnLine:
				currBrushSet.brushType=2;
				break ;
			case this.btnFree:
				currBrushSet.brushType=1;
				break ;
			case this.btnUndo:
				this.nativeAPI.undoDraw();
				break ;
			case this.btnClear:
				this.nativeAPI.clearDraw();
				break ;
			default :
				break ;
			}
		GlobalModel.globalData={brushSetting:currBrushSet};
	}

	/**点击按钮 */
	__proto.onBtnClick=function(evt){
		var btn=evt.target;
		switch(btn){
			case this.btnReset:
				this.nativeAPI.reset();
				break ;
			case this.btnLock:
				this.nativeAPI.switchCtrlState();
				break ;
			case this.btnEndLesson:
				this.nativeAPI.showDialog("","确定下课？",["确定","取消"],Handler.create(this,this.onLsEndDialogClick));
				break ;
			case this.btnPrev:
				this.nativeAPI.prevPage();
				break ;
			case this.btnNext:
				this.nativeAPI.nextPage();
				break ;
			case this.btnPrevSubj:
				this.nativeAPI.prevSubj();
				break ;
			case this.btnNextSubj:
				this.nativeAPI.nextSubj();
				break ;
			case this.btnMusic:
				this.musicMuted=!this._musicMuted;
				break ;
			default :
				break ;
			}
	}

	/**点击下课确认对话窗 */
	__proto.onLsEndDialogClick=function(idx){
		if (idx==-3)
			this.nativeAPI.lessonEnd(true);
	}

	/**当页/题状态改变 */
	__proto.onCurrPageStatus=function(){
		var ld=GlobalModel.lessonStatusData;
		var page=ld.page;
		var subj=ld.subject;
		this.btnPrev.disabled=page[0] <=1;
		this.btnNext.disabled=page[0] >=page[1];
		if (this.hasSubjs(subj)){
			this.btnPrevSubj.disabled=subj[0] <=1;
			this.btnNextSubj.disabled=subj[0] >=subj[1];
		}
	}

	/**本关有否题目 */
	__proto.hasSubjs=function(subjArr){
		var r=subjArr[1] > 1;
		this.bgSubj.visible=this.btnPrevSubj.visible=this.btnNextSubj.visible=r;
		return r;
	}

	/**更新 锁定 按钮 的状态 */
	__proto.updateLockBtnState=function(){
		if (GlobalModel.isLocking){
			this.btnLock.label="解锁";
			(this.btnLock.getChildByName("icon")).skin="share/pithink_ui/annniu-jiesuo.png";
			}else {
			this.btnLock.label="锁定";
			(this.btnLock.getChildByName("icon")).skin="share/pithink_ui/annniu-suoding.png";
		}
	}

	/**画笔类型 */
	__getset(0,__proto,'brushType',null,function(v){
		if (v==this._currBrushType)
			return;
		if (this._currBrushType)
			this["btn"+this._BRUSH_TYPE[this._currBrushType-1]].selected=false;
		this._currBrushType=v;
		this["btn"+this._BRUSH_TYPE[this._currBrushType-1]].selected=true;
	});

	/**音乐是否静音 */
	__getset(0,__proto,'musicMuted',null,function(v){
		if (this._musicMuted==v)
			return;
		this._musicMuted=v;
		var vol=v ? 0 :1;
		this.nativeAPI.setMusicVolume(true,v ? 0 :1);
		var skinArr=[
		"share/pithink_ui/icon_sound_mute.png",
		"share/pithink_ui/icon_sound_normal.png"];
		(this.btnMusic.getChildByName("icon")).skin=skinArr[vol];
	});

	/**native */
	__getset(0,__proto,'nativeAPI',function(){
		return VipThink.nativeAPI;
	});

	/**画笔设置 */
	__getset(0,__proto,'brushSetting',null,function(v){
		this.btnBrush.selected=this.bgBursh.visible=this.btnFree.visible=this.btnLine.visible=this.btnRect.visible=this.btnUndo.visible=this.btnClear.visible=v.isOpenBrush;
		this.brushType=v.brushType;
	});

	return BoxFunc;
})(Box)


/**
*Author:Evans<br/>
*学生列表
*/
//class com.subject.module.toolbox.StudentList extends laya.ui.Box
var StudentList=(function(_super){
	function StudentList(){
		this.listStu=null;
		this.boxMenu=null;
		this.btnCloseMenu=null;
		this.btnAddScore=null;
		this.btnMinusScore=null;
		/**当前选中学生*/
		this._selStuVO=null;
		this._POS_MENU_ELEMENT=[
		{bg:"bg",lblName:47,btnPlus:96,btnMinus:96,lblScore:104,btnClose:0},
		{bg:"bg2",lblName:87,btnPlus:16,btnMinus:16,lblScore:24,btnClose:107}];
		StudentList.__super.call(this);
		this.once("added",this,this._$5_onAdded);
	}

	__class(StudentList,'com.subject.module.toolbox.StudentList',_super);
	var __proto=StudentList.prototype;
	Laya.imps(__proto,{"com.klzz.pattern.IObserver":true})
	//implements start
	__proto.update=function(subj){
		if (subj==this.userStatus){
			this.updateStuList();
		}
	}

	/**当添加到父节点 */
	__proto._$5_onAdded=function(){
		this.userStatus.regObserver(this);
		this.listStu=this.getChildByName("listStu");
		this.listStu.vScrollBarSkin="";
		this.listStu.scrollBar.elasticDistance=80;
		this.listStu.renderHandler=Handler.create(this,this.onListRender,null,false);
		this.listStu.selectEnable=true;
		this.listStu.on("change",this,this.onListSel);
		this.boxMenu=this.getChildByName("boxMenu");
		this.btnAddScore=this.boxMenu.getChildByName("btnPlus");
		this.btnMinusScore=this.boxMenu.getChildByName("btnMinus");
		this.btnCloseMenu=this.boxMenu.getChildByName("btnClose");
		this.btnCloseMenu.on("click",this,this.onMenuBtnClick);
		this.btnMinusScore.on("click",this,this.onMenuBtnClick);
		this.btnAddScore.on("click",this,this.onMenuBtnClick);
	}

	/**点击学生菜单按钮 */
	__proto.onMenuBtnClick=function(evt){
		var btn=evt.target;
		if (btn==this.btnCloseMenu)
			this.menuVisible=false;
		else if (btn==this.btnAddScore)
		this.userStatus.addStudentSpeScore(this._selStuVO.id);
		else if (btn==this.btnMinusScore)
		this.userStatus.addStudentSpeScore(this._selStuVO.id,-1);
	}

	/**
	*选中学生
	*/
	__proto.onListSel=function(idx){
		(idx===void 0)&& (idx=-1);
		if (idx < 0)
			idx=this.listStu.selectedIndex;
		var svo=this.listStu.getItem(idx);
		this.updateMenu(svo,true);
	}

	/**渲染列表单元 */
	__proto.onListRender=function(item,idx,isSel){
		var data=item.dataSource;
		item.dataSource={
			imgHead:data.headerImg,
			lblName:data.name || "(Unknown)",
			lblScore:data.totalScore,
			imgLState:GlobalModel.isLocking ? "share/pithink_ui/icon-suoding-x.png" :"share/pithink_ui/icon-jiesuo-x.png"
		};
		(item.getChildByName("imgLine")).visible=idx < this.listStu.length-1;
		item.disabled=data.status !=1;
	}

	/**更新学生列表 */
	__proto.updateStuList=function(){
		if (!this.visible)
			return;
		this.listStu.array=this.userStatus.studentList;
		this.updateMenu();
	}

	/**
	*鼠标事件处理
	*/
	__proto.onMouseEvt=function(evt){
		if (evt.type=="mousedown"){
			if (this.boxMenu.visible && !this.boxMenu.hitTestPoint(evt.stageX,evt.stageY)){
				this.menuVisible=false;
			}
		}
	}

	/**
	*Desc:更新 菜单
	*/
	__proto.updateMenu=function(svo,setvo){
		(setvo===void 0)&& (setvo=false);
		if (setvo || svo)
			this._selStuVO=svo;
		if (!this._selStuVO || !this._selStuVO.name)
			return;
		this.boxMenu.dataSource={
			lblName:this._selStuVO.name,
			lblScore:this._selStuVO.totalScore
		};
		if (setvo)
			this.menuVisible=true;
	}

	//override start
	__getset(0,__proto,'visible',_super.prototype._$get_visible,function(v){
		Laya.superSet(Box,this,'visible',v);
		if (v)
			this.updateStuList();
		else
		this.menuVisible=v;
	});

	/**用户数据中心 */
	__getset(0,__proto,'userStatus',function(){
		return VipThink.userStatus;
	});

	/**菜单可见性 */
	__getset(0,__proto,'menuVisible',null,function(v){
		if (v !=this.boxMenu.visible){
			this.boxMenu.visible=v;
			if (v)
				Laya.stage.on("mousedown",this,this.onMouseEvt);
			else
			Laya.stage.off("mousedown",this,this.onMouseEvt);
		}
		if (!v){
			this.listStu.selectedIndex=-1;
			return;
		}
		this.boxMenu.x=-270;
		if (this.mouseY < this.height-this.boxMenu.height){
			this.menuStyle=1;
			this.boxMenu.y=this.mouseY;
			}else {
			this.menuStyle=2;
			this.boxMenu.y=this.mouseY-this.boxMenu.height;
		}
	});

	/**
	*菜单风格 1正 2反
	*/
	__getset(0,__proto,'menuStyle',null,function(v){
		var objPos=this._POS_MENU_ELEMENT[v-1];
		(this.boxMenu.getChildByName("bg")).visible=false;
		(this.boxMenu.getChildByName("bg2")).visible=false;
		for (var i in objPos){
			var val=objPos[i]
			if (i=="bg")
				(this.boxMenu.getChildByName(val)).visible=true;
			else
			(this.boxMenu.getChildByName(i)).y=val;
		}
	});

	return StudentList;
})(Box)


//class com.subject.module.redpacketrain.RedPack extends laya.ui.Image
var RedPack=(function(_super){
	function RedPack(){
		this.speedX=NaN;
		this.speedY=NaN;
		this.status=0;
		this.type=1;
		// /1 大拇指 2 红心 3 星星
		this._id=-1;
		this.skUrl="share/animation/redPacketRain/hongbao.sk";
		this.sk=null;
		RedPack.__super.call(this);
		this._id=++com.subject.module.redpacketrain.RedPack.instanceId;
		this.anchorX=this.anchorY=0.5;
		this.on("added",this,this.onAddHandler);
		this.on("removed",this,this.onRemoveHandler);
		this.on("click",this,this.onClick);
	}

	__class(RedPack,'com.subject.module.redpacketrain.RedPack',_super);
	var __proto=RedPack.prototype;
	// this.mouseEnabled=false;
	__proto.onAddHandler=function(){
		this.timer.loop(1,this,this.onFrameLoopHandler);
	}

	__proto.onRemoveHandler=function(){
		this.timer.clearAll(this);
	}

	__proto.onClick=function(){
		this.mouseEnabled=false;
		this.status=1;
		this.tryShowAnimation();
		RedPacketRainView.clickNum++;
		if (VipThink.user.isStu && this.type==3){
			var count=1;
			var data={sid:VipThink.user.id,act:"addScore",num:count};
			LocationUtil.getLocationView(1002).sync(data,false);
			if (VipThink.originCourseType==11){
				var obj={
					liveId:VipThink.config.liveId,
					liveType:3,
					list:[ {studentId:VipThink.user.id,number:count}]
				};
				Https.request("/api/aic-live/v1/live/sendStarInfo",obj,this,function(data){
					if(data.isSuccess){
						VipThink.nativeAPI.sendToNative("addStar",{count:count});
					}
				});
			}
		}
	}

	__proto.onAddStar=function(data){
		VipThink.nativeAPI.sendToNative("addStar",{count:1});
	}

	/**显示动画 */
	__proto.tryShowAnimation=function(){
		this.skin=null;
		if (!RedPack.animTemplet){
			RedPack.animTemplet=new Templet();
			RedPack.animTemplet.once("complete",this,this.onAniLoadComplete);
			RedPack.animTemplet.loadAni(this.skUrl);
		}
		if (RedPack.animLoaded){
			this.showAnimation();
		}
	}

	__proto.onAniLoadComplete=function(){
		RedPack.animLoaded=true;
		this.showAnimation();
	}

	__proto.showAnimation=function(){
		if (!this.parent){
			return;
		}
		if (!this.sk){
			this.sk=new Skeleton(RedPack.animTemplet,Klzz.aniMode);
			this.addChild(this.sk);
			var keys=["damuzhi","xinxing","xingxing"];
			var key=keys[this.type-1];
			this.sk.once("stopped",this,this.onSkComplete);
			this.sk.play(key,false);
		}
	}

	__proto.onSkComplete=function(){
		this.sk.removeSelf();
		com.subject.module.redpacketrain.RedPack.recover(this);
	}

	__proto.onFrameLoopHandler=function(){
		if (this.status==1){
			return;
		}
		this.y=this.y+this.speedY;
		if (this.y > (this.parent).height){
			com.subject.module.redpacketrain.RedPack.recover(this);
		}
	}

	RedPack.create=function(tp){
		var instance=Pool.getItemByClass("RedPack",RedPack);
		instance.type=tp;
		RedPack.awakeDic[instance._id]=instance;
		instance.speedX=7+Math.random()*0;
		instance.speedY=7+Math.random()*3;
		instance.y=0;
		var randomIndex=function (){
			if (RedPack.LIST_POINT_X.length <=1){
				return RedPack.LIST_POINT_X.length-1;
			};
			var ret=Math.floor(Math.random()*RedPack.LIST_POINT_X.length);
			if (ret==RedPack.preIndex){
				return randomIndex();
			}
			else{
				RedPack.preIndex=ret;
				return ret;
			}
		};
		var index=randomIndex();
		instance.x=RedPack.LIST_POINT_X[index];
		instance.skin="share/ui/redPacketRain/img_git.png";
		return instance;
	}

	RedPack.recover=function(v){
		v.removeSelf();
		v.scaleX=1;
		v.scaleY=1;
		v.rotation=0;
		v.x=0;
		v.y=0;
		v.speedX=0;
		v.speedY=0;
		v.status=0;
		v.mouseEnabled=true;
		v.skin=null;
		v.type=0;
		if (v.sk){
			v.sk.offAll("complete");
			v.sk.destroy();
			v.sk=null;
		}
		delete com.subject.module.redpacketrain.RedPack.awakeDic[v._id];
		Pool.recover("RedPack",v);
	}

	RedPack.recoverAll=function(){
		for (var key in com.subject.module.redpacketrain.RedPack.awakeDic){
			var element=com.subject.module.redpacketrain.RedPack.awakeDic[key];
			RedPack.recover(element);
		}
		if (RedPack.animTemplet){
			RedPack.animTemplet.destroy();
			RedPack.animTemplet=null;
		}
		RedPack.animLoaded=false;
	}

	RedPack.TAG="RedPack";
	RedPack.SPEED_X=0;
	RedPack.SPEED_Y=3;
	RedPack.preIndex=-1;
	RedPack.instanceId=0;
	RedPack.awakeDic={};
	RedPack.animTemplet=null;
	RedPack.animLoaded=false;
	__static(RedPack,
	['LIST_POINT_X',function(){return this.LIST_POINT_X=[150,350,600,800,1000,1200,1400,1600,1800];}
	]);
	return RedPack;
})(Image)


//class com.subject.module.redpacketrain.Star extends laya.ui.Image
var Star=(function(_super){
	function Star(){
		this.speedX=NaN;
		this.speedY=NaN;
		this.speedR=2;
		this._id=-1;
		Star.__super.call(this);
		this._id=++com.subject.module.redpacketrain.Star.instanceId;
		this.anchorX=this.anchorY=0.5;
		this.on("added",this,this.onAddHandler);
		this.on("removed",this,this.onRemoveHandler);
		this.mouseEnabled=false;
	}

	__class(Star,'com.subject.module.redpacketrain.Star',_super);
	var __proto=Star.prototype;
	__proto.onAddHandler=function(){
		this.timer.loop(1,this,this.onFrameLoopHandler);
	}

	__proto.onRemoveHandler=function(){
		this.timer.clearAll(this);
	}

	__proto.onFrameLoopHandler=function(){
		this.y=this.y+this.speedY;
		this.rotation+=this.speedR;
		if(this.rotation > 30){
			this.speedR=-2;
		}
		if(this.rotation <-30){
			this.speedR=2;
		}
		if(this.y > (this.parent).height){
			com.subject.module.redpacketrain.Star.recover(this);
		}
	}

	Star.create=function(){
		var instance=Pool.getItemByClass("Star",Star);
		Star.awakeDic[instance._id]=instance;
		instance.speedX=5+Math.random()*0;
		instance.speedY=5+Math.random()*5;
		instance.y=0;
		var index=Math.floor(Math.random()*Star.LIST_POINT_X.length);
		instance.x=Star.LIST_POINT_X[index];
		var resIndex=1+Math.floor(Math.random()*9);
		instance.skin="share/ui/redPacketRain/img_"+resIndex+".png";
		return instance;
	}

	Star.recover=function(v){
		v.removeSelf();
		v.scaleX=1;
		v.scaleY=1;
		v.rotation=0;
		v.x=0;
		v.y=0;
		v.speedX=0;
		v.speedY=0;
		v.speedR=2;
		v.skin=null;
		delete com.subject.module.redpacketrain.Star.awakeDic[v._id];
		Pool.recover("Star",v);
	}

	Star.recoverAll=function(){
		for(var key in com.subject.module.redpacketrain.Star.awakeDic){
			var element=com.subject.module.redpacketrain.Star.awakeDic[key];
			Star.recover(element);
		}
	}

	Star.TAG="Star";
	Star.SPEED_X=0;
	Star.SPEED_Y=5;
	Star.instanceId=0;
	Star.awakeDic={};
	__static(Star,
	['LIST_POINT_X',function(){return this.LIST_POINT_X=[200,400,600,800,1000,1200,1400,1600,1800];}
	]);
	return Star;
})(Image)


//class com.subject.module.answerrace.AnswerRaceView extends laya.ui.View
var AnswerRaceView=(function(_super){
	function AnswerRaceView(){
		this._isTech=false;
		this._box_tech=null;
		this._bt_start=null;
		this._bt_close=null;
		this._bt_close2=null;
		this._bt_close3=null;
		this._sp_pie=null;
		this._bt_restart=null;
		this._img_user_tech=null;
		this._lab_user_tech=null;
		this._box_student=null;
		this._ske_321=null;
		this._img_user_stu=null;
		this._lab_user_stu=null;
		this.PRETIME=4;
		this._ske=null;
		this._currSoundName=null;
		this._timeLen=7;
		this.raceSuccess=null;
		this.onStageBtn=null;
		this.answerBtn=null;
		this.closeBtn=null;
		this.currOtherSetting=null;
		this.curID=0;
		this.endTime=0;
		AnswerRaceView.__super.call(this);
	}

	__class(AnswerRaceView,'com.subject.module.answerrace.AnswerRaceView',_super);
	var __proto=AnswerRaceView.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		var preloadList=[
		{url:"share/sound/answerRace_boom.wav",type:"sound"},
		{url:"share/sound/go.wav",type:"sound"},
		{url:"share/sound/go_language_2.wav",type:"sound"},
		{url:"share/sound/go_language_3.wav",type:"sound"},
		{url:"share/sound/1.wav",type:"sound"},
		{url:"share/sound/1_language_2.wav",type:"sound"},
		{url:"share/sound/1_language_3.wav",type:"sound"},
		{url:"share/sound/2.wav",type:"sound"},
		{url:"share/sound/2_language_2.wav",type:"sound"},
		{url:"share/sound/2_language_3.wav",type:"sound"},
		{url:"share/sound/3.wav",type:"sound"},
		{url:"share/sound/3_language_2.wav",type:"sound"},
		{url:"share/sound/3_language_3.wav",type:"sound"},
		{url:"share/animation/answerRace.png",type:"image"},
		{url:"share/animation/answerRace.sk",type:"arraybuffer"}];
		Laya.loader.load(preloadList,new Handler(this,this.onResLoad));
	}

	__proto.initViewUI=function(){
		this.createView(AnswerRaceView.uiView);
		this.visible=false;
		this.mouseThrough=true;
		KlEventCenter.on("add_answer",this,this.onAddAnswer);
		GlobalModel.instance.on("complete",this,this.onComplete);
		this.name="rootView";
		var sp=new Sprite();
		sp.graphics.drawCircle(this._img_user_stu.width / 2,this._img_user_stu.height / 2,this._img_user_stu.width / 2,"#ffffff");
		this._img_user_stu.mask=sp;
		this._img_user_tech.mask=sp;
		this.raceSuccess.skin=VipThink.getLanguageImg(this.raceSuccess.skin);
		if(VipThink.user.isTech){
			this.doTrans({answerRaceState:5});
		}
		KlEventCenter.on("socketConnect",this,this.onSocketConnect);
		CustomRoomDataUtil.addMsgListener("ANSWER_RACE",this,this.onChange);
	}

	__proto.onResLoad=function(){
		this.initViewUI();
	}

	__proto.onSocketConnect=function(){
		this.handleClose();
	}

	__proto.onSkeClick=function(evt){
		var _$this=this;
		if (this.currOtherSetting.answerRaceState==2){
			KlSoundManager.playSound("share/sound/answerRace_boom.wav",1,null,null,0,null,false,true);
			this.playSke("animation2",false,Handler.create(this,function(){
				_$this._ske.visible=false;
			}));
			var thinker=VipThink.user;
			var userInfo;
			this.doTrans({answerRaceState:4,raceWinnerId:thinker.id,userInfo:{headerImg:thinker.headerImg,name:thinker.remarkName || thinker.name}});
			this.sendReport();
		}
	}

	__proto.onComplete=function(){
		this._isTech=GlobalModel.isRoomOwner;
		this._box_tech.visible=this._isTech;
		this._box_student.visible=!this._isTech;
		if (this._isTech){
			this._bt_restart.on("click",this,this.onBtnClick);
			this._bt_start.on("click",this,this.onBtnClick);
			this._bt_close.on("click",this,this.onCLose);
			this._bt_close2.on("click",this,this.onCLose);
			this._bt_close3.on("click",this,this.onCLose);
			if (VipThink.OPEN_LIVE_COURSE && VipThink.originCourseType==11){
				this.onStageBtn.on("click",this,this.onStage);
				this.answerBtn.on("click",this,this.onAnswer);
				this.closeBtn.on("click",this,this.onCLose);
			}
			else{
				this.closeBtn.visible=this.onStageBtn.visible=this.answerBtn.visible=false;
			}
		}
		else{
			var temp=new Templet();
			temp.once("complete",this,this.onCompleted,[temp]);
			temp.loadAni("share/animation/answerRace.sk");
		}
	}

	__proto.onCompleted=function(temp){
		if (this._ske && this.contains(this._ske))
			this.removeChild(this._ske);
		this._ske=new Skeleton(temp,Klzz.aniMode);
		this._ske.on("click",this,this.onSkeClick);
		this.addChild(this._ske);
		var sp=new Sprite();
		sp.graphics.drawRect(-50,-120,100,120,"#ffffff");
		var ha=new HitArea();
		ha.hit=sp.graphics;
		this._ske.scale(2,2);
		this._ske.hitArea=ha;
		this._ske.visible=false;
	}

	/**
	*Desc:
	*/
	__proto.onBtnClick=function(evt){
		this.doTrans({answerRaceState:2,raceStartTs:VipThink.getTime()});
	}

	__proto.onCLose=function(){
		this.doTrans({answerRaceState:5});
	}

	__proto.onChange=function(data){
		var _$this=this;
		this._isTech=GlobalModel.isRoomOwner;
		KlEventCenter.event("hide_brushbox_notice");
		this.currOtherSetting=data;
		if (this.currOtherSetting.answerRaceState==5 && !this.visible)
			return;
		var state=this.currOtherSetting.answerRaceState;
		Mouse.hide();
		switch (state){
			case 1:
				this.visible=this._isTech;
				if (this._isTech)
					this.setBoxsVisible(state);
				break ;
			case 2:
				this.curID=0;
				this._lab_user_tech.text=this._lab_user_stu.text="";
				if (this._ske){
					this._ske.stop();
					this._ske.visible=false;
				}
				if (this._isTech){
					this.timer.clearAll(this);
					this.timer.loop(100,this,this.onLoop);
				}
				else{
					this._currSoundName=null;
					var t=VipThink.getTime();
					var totalTime=(this.PRETIME-1)*1000;
					var fullPassTime=(this.currOtherSetting.raceStartTs+totalTime-t)/ 1000;
					if (fullPassTime > 0){
						this._ske_321.play("3",false);
						this._ske_321.stopAtStart();
						this._ske_321.visible=false;
						this.hideSke();
						this.timer.clearAll(this);
						this.timer.loop(100,this,this.onLoop);
					}
					else{
						this.timer.clear(this,this.onLoop);
						this.playSke("animation1",true);
						this._ske_321.visible=false;
					}
				}
				this._img_user_tech.skin=this._img_user_stu.skin="";
				this.visible=true;
				this.setBoxsVisible(state);
				break ;
			case 3:
				this.playSke("animation3",false);
				this.visible=true;
				this.setBoxsVisible(state);
				break ;
			case 4:
				if (this.curID){
					return;
				}
				this.curID=this.currOtherSetting.raceWinnerId;
				if (this._isTech && (this._box_tech.getChildByName("box3")).visible)
					return;
				if (!this._isTech && (this._box_student.getChildByName("box3")).visible)
					return;
				if (this._lab_user_tech.text || this._lab_user_stu.text)
					return;
				var userInfo=data["userInfo"];
				if (userInfo){
					this._img_user_tech.skin=this._img_user_stu.skin=userInfo.headerImg;
					if (this._isTech){
						this._lab_user_tech.text=userInfo.remarkName || userInfo.name;
					}
					else{
						this._lab_user_stu.text=userInfo.remarkName || userInfo.name;
					}
				}
				if (this._isTech){
					this.sendReport(this.curID);
				}
				this.hideSke();
				this.setBoxsVisible(state);
				this.visible=true;
				this.timer.clear(this,this.onLoop);
				if (this._isTech){
					VipThink.nativeAPI.sendToNative("answerUser",{uid:this.curID});
					var time=VipThink.OPEN_LIVE_COURSE && VipThink.originCourseType==11 ? 30000 :4000;
					this.timer.once(time,this,function(){
						_$this.doTrans({answerRaceState:5});
					});
				}
				break ;
			case 5:
				this.handleClose();
				break ;
			}
	}

	__proto.handleClose=function(){
		this.visible=false;
		this._currSoundName=null;
		this.timer.clearAll(this);
	}

	__proto.onLoop=function(){
		var _$this=this;
		var t=VipThink.getTime();
		var passTime=Math.max(t-this.currOtherSetting.raceStartTs,0)/ 1000;
		if (this._isTech){
			this._sp_pie.graphics.clear();
			var end=passTime / this._timeLen *360-90;
			this._sp_pie.graphics.drawPie(0,0,152,-90,end,"#ffffff");
			if (passTime > this._timeLen){
				this.timer.clear(this,this.onLoop);
				if (VipThink.TEACHER_PREPARE_LESSONS){
					this.doTrans({answerRaceState:11});
				}
				else{
					this.doTrans({answerRaceState:3});
				}
			}
		}
		else{
			passTime=Math.floor(passTime);
			if (passTime <=this.PRETIME-1){
				this.hideSke();
				var name=passTime==this.PRETIME-1 ? "go" :(this.PRETIME-passTime-1)+"";
				var soundName=VipThink.getLanguageSound("share/sound/"+name+".wav");
				if (soundName !=this._currSoundName){
					this._ske_321.play(name,false);
					this._currSoundName=soundName;
					KlSoundManager.playSound(this._currSoundName,1,null,null,0,null,false,true);
					if (passTime==this.PRETIME-1){
						this._ske_321.once("end",this,function(){
							_$this._ske_321.visible=false;
						});
					}
				}
				this._ske_321.visible=true;
			}
			else{
				if (passTime==this.PRETIME){
					this.playSke("animation1",true);
				}
				this.timer.clear(this,this.onLoop);
				Mouse.show();
			}
		}
	}

	__proto.playSke=function(n,loop,handler){
		if (this._isTech)
			return;
		if (!this._ske){
			this.frameOnce(1,this,this.playSke,[n,loop,handler]);
		}
		else{
			if (handler){
				this._ske.once("stopped",this,function(){
					handler.run();
				});
			}
			if (n.indexOf("1")!=-1){
				var ranX=Math.random()*1620+150;
				var ranY=Math.random()*740+170;
				this._ske.pos(ranX,ranY);
			}
			else if (n.indexOf("2")!=-1){
			}
			else{
				this._ske.pos(this.width / 2,this.height / 2+100);
			}
			this._ske.play(n,loop);
			this._ske.visible=true;
		}
	}

	__proto.hideSke=function(){
		if (this._isTech)
			return;
		if (!this._ske){
			this.frameOnce(1,this,this.hideSke);
		}
		else{
			this._ske.stop();
			this._ske.visible=false;
		}
	}

	/**
	*Desc:
	*/
	__proto.setBoxsVisible=function(state){
		var box=this._isTech ? this._box_tech :this._box_student;
		for (var i=0,len=box.numChildren;i < len;i++){
			var item=box.getChildAt(i);
			item.visible=item.name.indexOf(state+"")!=-1;
		}
	}

	// end of function setBoxsVisible
	__proto.command=function(act){
		if (this.visible && act==1)
			return;
		this.visible=this._isTech;
		this.setBoxsVisible(act);
	}

	__proto.doTrans=function(data){
		CustomRoomDataUtil.sendMsg("ANSWER_RACE",data);
	}

	__proto.sendReport=function(uid){
		var obj={liveId:VipThink.config["liveId"],studentId:uid || VipThink.user.id};
		if (uid){
			obj["responderSuccess"]=1;
		}
		else{
			obj["responder"]=1;
		}
		Https.request("/api/aic-queue/buried/doResponder",obj);
	}

	__proto.onStage=function(){
		VipThink.nativeAPI.sendToNative("onStage",{uid:this.curID});
		this.onCLose();
	}

	__proto.onAnswer=function(){
		VipThink.nativeAPI.sendToNative("addAnswer",{uid:this.curID});
		this.onCLose();
	}

	__proto.onAddAnswer=function(data){
		if (this.curID==data["uid"]){
			this.onCLose();
		}
	}

	AnswerRaceView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[ {"type":"Sprite","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[ {"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_tech","name":"boxTech","height":1080},"child":[ {"type":"Box","props":{"width":1920,"visible":false,"name":"box1","height":1080},"child":[ {"type":"Image","props":{"y":540,"x":960,"width":508,"skin":"share/ui/bg_white.png","sizeGrid":"27,24,25,25","height":425,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":356,"x":746,"skin":"share/ui/race_ledi.png"}},{"type":"ScaleButton","props":{"y":672,"x":969,"width":253,"var":"_bt_start","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"16,19,16,17","name":"bt_start","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","label":"开始抢答","height":54,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":343,"x":1199,"width":83,"var":"_bt_close","stateNum":1,"skin":"share/ui/answerRace_close.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":83,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"name":"box2","height":1080},"child":[ {"type":"Image","props":{"y":540,"x":960,"width":508,"skin":"share/ui/bg_white.png","sizeGrid":"27,24,25,25","height":425,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Sprite","props":{"y":213,"x":254},"child":[ {"type":"Circle","props":{"y":0,"x":0,"radius":150,"lineWidth":1,"fillColor":"#ffa300"}},{"type":"Circle","props":{"y":0,"x":0,"radius":130,"lineWidth":1,"fillColor":"#ffffff"}}]}]},{"type":"Sprite","props":{"y":540,"x":960,"var":"_sp_pie"}},{"type":"Text","props":{"y":502,"x":909,"wordWrap":true,"width":102,"valign":"middle","text":"正 在抢 答","height":76,"fontSize":35,"color":"#646464","align":"center"}},{"type":"ScaleButton","props":{"y":343,"x":1199,"width":83,"var":"_bt_close2","stateNum":1,"skin":"share/ui/answerRace_close.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":83,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"name":"box3","height":1080},"child":[ {"type":"Image","props":{"y":540,"x":960,"width":508,"skin":"share/ui/bg_white.png","sizeGrid":"27,24,25,25","height":425,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Sprite","props":{"y":183,"x":254},"child":[ {"type":"Circle","props":{"y":0,"x":0,"radius":120,"lineWidth":1,"fillColor":"#ffa300"}},{"type":"Circle","props":{"y":0,"x":0,"radius":100,"lineWidth":1,"fillColor":"#ffffff"}}]},{"type":"Text","props":{"y":145,"x":203,"wordWrap":true,"width":102,"valign":"middle","text":"无 人抢 答","height":76,"fontSize":35,"color":"#646464","align":"center"}}]},{"type":"ScaleButton","props":{"y":682,"width":253,"var":"_bt_restart","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"16,19,16,17","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","label":"重新开始","height":54,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":343,"x":1199,"width":83,"var":"_bt_close3","stateNum":1,"skin":"share/ui/answerRace_close.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":83,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"x":0,"width":1920,"visible":false,"name":"box4","height":1080},"child":[ {"type":"Image","props":{"width":148,"var":"_img_user_tech","height":148,"centerY":-98,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"x":961,"skin":"share/ui/race_success.png","centerY":-100,"centerX":0.5,"anchorY":0.5,"anchorX":0.5}},{"type":"Text","props":{"y":485,"x":782,"wordWrap":false,"width":360,"var":"_lab_user_tech","valign":"middle","text":"text","strokeColor":"#dd4516","stroke":2,"overflow":"hidden","height":20,"fontSize":20,"font":"SimHei","color":"#fdfdfd","align":"center"}},{"type":"ScaleButton","props":{"y":680,"width":270,"var":"onStageBtn","stateNum":1,"skin":"share/ui/on_stage_btn.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":100,"centerX":-163,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":680,"width":270,"var":"answerBtn","stateNum":1,"skin":"share/ui/answer_btn.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":100,"centerX":163,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":383,"x":1037,"width":52,"var":"closeBtn","stateNum":1,"skin":"share/ui/icon_close.png","labelSize":30,"labelFont":"Arial","labelColors":"#ffffff","height":52,"anchorY":0.5,"anchorX":0.5}}]}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"_box_student","name":"boxStu","height":1080},"child":[ {"type":"Box","props":{"width":1920,"visible":false,"name":"box2","height":1080},"child":[ {"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"_ske_321","url":"share/animation/answerRace.sk","stopAt":1,"scaleY":3,"scaleX":3,"preview":true,"isLoop":"false","currAniName":"3"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"name":"box3","height":1080}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"name":"box4","height":1080},"child":[ {"type":"Image","props":{"width":148,"var":"_img_user_stu","height":148,"centerY":2.5,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":541,"x":961,"var":"raceSuccess","skin":"share/ui/race_success.png","centerY":0.5,"centerX":0.5,"anchorY":0.5,"anchorX":0.5}},{"type":"Text","props":{"y":585,"x":782,"width":360,"var":"_lab_user_stu","valign":"middle","text":"text","strokeColor":"#dd4516","stroke":2,"overflow":"hidden","height":20,"fontSize":20,"font":"SimHei","color":"#fdfdfd","align":"center"}}]}]}]};
	return AnswerRaceView;
})(View)


/**
*进入挑战题前的弹框界面
*/
//class com.subject.module.challenge.ChallengeAlertView extends laya.ui.View
var ChallengeAlertView=(function(_super){
	function ChallengeAlertView(){
		this.challengeBox=null;
		this.kuang1=null;
		this.kuang2=null;
		this.kuang_word=null;
		this.word=null;
		this.star=null;
		this.btn_ok=null;
		this.btn_no=null;
		this.mysteryBox=null;
		this.btn_ok2=null;
		this.btn_no2=null;
		this._indices=null;
		this.strType="";
		ChallengeAlertView.__super.call(this);
		this.visible=false;
	}

	__class(ChallengeAlertView,'com.subject.module.challenge.ChallengeAlertView',_super);
	var __proto=ChallengeAlertView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[
		{url:"res/atlas/share/ui/mystery.atlas",type:"atlas"}]
		Laya.loader.load(res_arr,new Handler(this,this.createView,[ChallengeAlertView.uiView]));
		VipThink.viewMgr.on("wiilJumpPage",this,this.onJumpOrNot);
	}

	/**
	*viewmanager的jumpOrNot事件回调
	*/
	__proto.onJumpOrNot=function(oIdxp,oIdxs,nIdxp,nIdxs,force,handler){
		if (VipThink.viewMgr.currPageIdx==nIdxp && VipThink.viewMgr.currSubviewIdx==nIdxs)
			return;
		var mv=VipThink.viewMgr.mainView;
		var jump=true;
		if (oIdxp !=-1 && nIdxp !=-1){
			if(oIdxp<nIdxp||oIdxs<nIdxs){
				if (mv){
					var nextConfig;
					if(mv.pageCfgList[nIdxp].configObj){
						nextConfig=mv.pageCfgList[nIdxp].configObj;
						}else{
						nextConfig=mv.pageCfgList[nIdxp].subViews ? mv.pageCfgList[nIdxp].subViews[nIdxs].configObj :null;
					};
					var strNextConfig=this.getNextConfig(nextConfig);
					if (nextConfig && strNextConfig !="" && (VipThink.user.isTech||(VipThink.config.courseCfg.showChallenge && VipThink.config.courseCfg.showChallenge=="yes"))){
						if (VipThink.viewMgr.getView("challengeAlertView")){
							this.indices=[nIdxp,nIdxs];
							if (VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
								if(strNextConfig=="challenge"){
									VipThink.viewMgr.currPage.currView.challengeViewParam=[nIdxp,nIdxs,strNextConfig,nextConfig.challenge];
									}else{
									VipThink.viewMgr.currPage.currView.challengeViewParam=[nIdxp,nIdxs,strNextConfig];
								}
								jump=false;
							}
						}
					}
				}
			}
		}
		handler.runWith([nIdxp,nIdxs,force,jump]);
	}

	__proto.getNextConfig=function(nextConfig){
		var str="";
		if(nextConfig&&nextConfig.challenge){
			str="challenge";
			}else if(nextConfig&&nextConfig.interest){
			str="interest";
		}else if(nextConfig && nextConfig.mystery)
		str="mystery";
		else if(nextConfig && nextConfig.challengePath)
		str="challengePath";
		return str;
	}

	__proto.onBtnClick=function(evt){
		var _$this=this;
		if (VipThink.user.userType !=1 && !(VipThink.config.courseCfg.showChallenge && VipThink.config.courseCfg.showChallenge=="yes"))
			return;
		var currView=VipThink.viewMgr.currPage.currView;
		if (!currView)
			return;
		if (evt.target==this.btn_ok || evt.target==this.btn_ok2){
			if (this._indices){
				Laya.timer.frameOnce(5,this,function(){
					VipThink.viewMgr.jumpToPage(_$this._indices[0],_$this._indices[1],true);
					VipThink.nativeAPI.mate({
						args :{
							origin:"laya",
							mainType:2,
							minorType:"enterChallenge",
							data:{
								page:[_$this._indices[0],_$this._indices[1]]
							}
						}
					});
				});
			}
		}
		else if (evt.target==this.btn_no || evt.target==this.btn_no2){
			var _isChallengeType=true;
			if(currView.challengeViewParam.length>=4){
				if(parseInt(currView.challengeViewParam[3])!=1)
					_isChallengeType=false;
			}
			if((VipThink.config.course && VipThink.config.course.indexOf("ysx_")!=-1)|| VipThink.config.courseCfg.routeSelect&&!_isChallengeType){
				VipThink.viewMgr.event("skipChallenge");
				currView.challengeViewParam=null;
				return;
			};
			var courseId=VipThink.config.course;
			if (this._indices){
				if(this.strType=="interest"||courseId.indexOf("sv_sudoku")!=-1||this.strType=="challenge"){
					if(this._indices[0]>0){
						Laya.timer.frameOnce(5,this,function(){
							VipThink.viewMgr.jumpToPage(_$this._indices[0]+1,_$this._indices[1],true);
						});
					}
				}
				else if(this.strType=="mystery"){
					if(this._indices[0]>0){
						Laya.timer.frameOnce(5,this,function(){
							if(courseId.indexOf("v4")!=-1||VipThink.config.courseCfg.noVideoMystery){
								VipThink.viewMgr.jumpToPage(_$this._indices[0]+1,_$this._indices[1],true);
							}else
							VipThink.viewMgr.jumpToPage(_$this._indices[0]+3,_$this._indices[1],true);
						});
					}
				}
			}
		}
		currView.challengeViewParam=null;
	}

	__getset(0,__proto,'showOrHide',null,function(value){
		var _$this=this;
		var show=false;
		if (!value){
			show=false;
			}else {
			show=true;
			this._indices=[value[0],value[1]];
		}
		if (show){
			this.strType=value[2];
			if(this.strType=="mystery"){
				this.challengeBox.visible=false;
				this.mysteryBox.visible=true;
				this.btn_ok2.on("click",this,this.onBtnClick);
				this.btn_no2.on("click",this,this.onBtnClick);
			}
			else{
				this.challengeBox.visible=true;
				this.mysteryBox.visible=false;
				this.kuang1.skin=this.kuang2.skin="share/ui/challenge_kuang.png";
				if(value[2]=="challenge"){
					if(value[3]==1){
						this.word.scale(1,1)
						this.word.skin=VipThink.getLanguageImg("share/ui/"+value[2]+"_word.png");
						this.btn_ok.skin=VipThink.getLanguageImg("share/ui/challenge_ok.png");
						this.btn_no.skin=VipThink.getLanguageImg("share/ui/challenge_no.png");
						}else{
						this.word.scale(1,1)
						this.word.skin="share/ui/qzxjrlt3.png";
						this.btn_ok.skin="share/ui/path1.png";
						this.btn_no.skin="share/ui/path2.png";
					}
					}else{
					this.word.scale(2,2)
					this.word.skin="share/ui/"+value[2]+"_word.png";
					this.btn_ok.skin="share/ui/challenge_ok.png";
					this.btn_no.skin="share/ui/challenge_no.png";
				}
				this.star.skin="share/ui/challenge_star.png";
				this.kuang_word.skin="share/ui/challenge_kuang_word.png";
				this.btn_ok.on("click",this,this.onBtnClick);
				this.btn_no.on("click",this,this.onBtnClick);
			}
			VipThink.viewMgr.once("change",this,function(){
				_$this.showOrHide=false;
			});
			}else {
			this.btn_ok.off("click",this,this.onBtnClick);
			this.btn_no.off("click",this,this.onBtnClick);
			this.btn_ok2.on("click",this,this.onBtnClick);
			this.btn_no2.on("click",this,this.onBtnClick);
		}
		this.visible=show;
	});

	__getset(0,__proto,'indices',null,function(value){
		this._indices=value;
	});

	ChallengeAlertView.uiView={"type":"View","props":{"width":1920,"mouseThrough":false,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"challengeBox","height":1080},"child":[{"type":"Image","props":{"y":267,"x":632,"width":229,"var":"kuang1","skin":"share/ui/challenge_kuang.png","sizeGrid":"0,0,0,52","scaleY":2,"scaleX":2,"height":280}},{"type":"Image","props":{"y":267,"x":1294,"width":174,"var":"kuang2","skin":"share/ui/challenge_kuang.png","sizeGrid":"0,0,0,52","scaleY":2,"scaleX":-2,"height":280}},{"type":"Image","props":{"y":474,"x":965,"width":219,"var":"kuang_word","sizeGrid":"0,28,0,32","scaleY":2,"scaleX":2,"height":53,"anchorX":0.5}},{"type":"Box","props":{"y":557,"x":965,"width":1,"height":1},"child":[{"type":"Image","props":{"var":"word","centerX":0,"bottom":0}}]},{"type":"Image","props":{"y":161,"x":955,"var":"star","scaleY":2,"scaleX":2,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":710,"x":848,"var":"btn_ok","label":""}},{"type":"ScaleButton","props":{"y":710,"x":1098,"var":"btn_no","label":""}}]},{"type":"Box","props":{"y":232,"x":492,"width":914,"visible":false,"var":"mysteryBox","height":648},"child":[{"type":"Image","props":{"y":-6,"x":5,"width":918,"skin":"share/ui/mystery/img_dk.png","height":659}},{"type":"Image","props":{"y":218,"x":142,"skin":"share/ui/mystery/zi1.png"}},{"type":"Image","props":{"y":217,"x":447,"skin":"share/ui/mystery/zi2.png"}},{"type":"ScaleButton","props":{"y":435,"var":"btn_ok2","skin":"share/ui/mystery/img_shi.png","label":"","centerX":-115}},{"type":"ScaleButton","props":{"y":435,"var":"btn_no2","skin":"share/ui/mystery/img_fou.png","label":"","centerX":126}}]}]};
	return ChallengeAlertView;
})(View)


//class com.subject.module.feedback.ReceiveStarsView extends laya.ui.View
var ReceiveStarsView=(function(_super){
	function ReceiveStarsView(){
		this._bt=null;
		this._lab=null;
		this._box_ske=null;
		this._box=null;
		this._ske=null;
		this._handler=null;
		this._v3AscendUi=null;
		this._baseImg=null;
		this._soundBtn=null;
		this.userBox=null;
		this.non_userBox=null;
		this._sumbitBt=null;
		this._starLabel=null;
		this._starNum=0;
		// 记录发送星星数量
		this._baseImg_User_height=870;
		// 升阶界面 user的底框 高度
		this._sumbitBt_User_y=929;
		// 升阶界面 提交按钮的y坐标
		this._ascendV3Init=null;
		ReceiveStarsView.__super.call(this);
	}

	__class(ReceiveStarsView,'com.subject.module.feedback.ReceiveStarsView',_super);
	var __proto=ReceiveStarsView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		if (this.getUiType=="starsUi"){
			this.onResLoad();
		}
		else{
			var res_arr=[
			{url:"res/atlas/share/ui/ascendV3.atlas",type:"atlas"},
			{url:"share/sound/ascend_user.mp3",type:"sound"},
			{url:"share/sound/ascend_non_user.mp3",type:"sound"}];
			Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
		}
	}

	__proto.onResLoad=function(){
		if (this.getUiType=="starsUi"){
			this.createView(ReceiveStarsView.uiView);
			this._bt.getChildAt(0).text=VipThink.getLanguageText(7);
		}
		else{
			this.createView(ReceiveStarsView.ascendV3uiView);
		}
		this.name="receiveStarsView";
		this.displayUI();
	}

	/*根据不同情况显示不同的UI界面
	1：非升阶用户身份、且未发放升阶礼品——星星领取弹窗 starsUi
	2：升阶用户身份、未发放升阶礼品——星星领取弹窗 starsUi
	3：升阶用户身份、首次发放升阶礼品——V3升阶礼包弹窗1 v3AscendUi_user
	4：非升阶用户身份、首次发放升阶礼品——V3升阶礼包弹窗2 v3AscendUi_nonUser
	5：所有用户第二次获取礼品，则不显示升阶礼品领取弹窗。
	*/
	__proto.displayUI=function(){
		var _$this=this;
		var _uiStyle=this.getUiType;
		switch (_uiStyle){
			case "v3AscendUi_user":{
					this.userBox.visible=true;
					KlSoundManager.playSound("share/sound/ascend_user.mp3");
					this._baseImg.height=this._baseImg_User_height;
					this._sumbitBt.y=this._sumbitBt_User_y;
					this.openV3AscendUi();
					this.submitStudySituation(1);
					break ;
				}
			case "v3AscendUi_nonUser":{
					this.non_userBox.visible=true;
					KlSoundManager.playSound("share/sound/ascend_non_user.mp3");
					this.openV3AscendUi();
					this.submitStudySituation(0);
					break ;
				}
			default :{
					this._bt.on("click",this,this.onClick);
					KlSoundManager.playSound(VipThink.getLanguageSound("share/sound/receiveStars.wav"),1,null,null,0,null,false,true);
					this._box_ske.visible=true;
					this._ske.unSyncProps="visible,param";
					this._ske.play(VipThink.getLanguageStr("receive_star"),false);
					this._box.unSyncProps="scaleX,scaleY";
					this.timer.once(700,this,function(){
						_$this._box.visible=true;
						_$this._box.scale(0.2,0.2);
						TimeLine.to(_$this._box,{scaleX:1.1,scaleY:1.1},130).to(_$this._box,{scaleX:0.95,scaleY:0.95},100).to(_$this._box,{scaleX:1,scaleY:1},200).play();
					});
					break ;
				}
			}
	}

	// 1为礼品弹出 0为奖杯弹弹窗
	__proto.submitStudySituation=function(_num){
		var _uiTypeStr=_num==1 ? "升阶礼包弹窗" :"仅奖杯弹窗";
		var data={
			eventName:"upgrade_giftPopUpClass",
			param:{
				type:_uiTypeStr
			}
		};
		Reporter.reportData(3,data,null,{msg:"ReceiveStarsView提交V3升阶埋点数据："});
		if (this._ascendV3Init && this._ascendV3Init !=null){
			VipThink.nativeAPI.mate({args:{origin:"laya",
					mainType:2,
					minorType:"ascendReward",
					data:{
						rewardId:this._ascendV3Init.rewardId,
						isUpgrade:this._ascendV3Init.isUpgrade
			}}});
			console.debug("ReceiveStarsView--onClick, 发送收下奖励的事件");
		}
	}

	// 打开升阶界面
	__proto.openV3AscendUi=function(){
		this._soundBtn.on("click",this,this.onClick);
		this._sumbitBt.on("click",this,this.onClick);
		this._starLabel.text="星星 × "+this._starNum;
		Tween.to(this._v3AscendUi,{scaleX:1,scaleY:1},300);
	}

	__proto.onClick=function(evt){
		var _btn=evt.target;
		switch (_btn){
			case this._soundBtn:{
					var _str=this.non_userBox.visible ? "share/sound/ascend_non_user.mp3" :"share/sound/ascend_user.mp3";
					KlSoundManager.playSound(_str);
					break ;
				}
			default :{
					this._handler && this._handler.run();
					console.debug("ReceiveStarsView--onClick, lessonEnd");
					KlEventCenter.event("lessonEnd");
					VipThink.nativeAPI.lessonEnd(false,{lessonEnd:true});
					this.removeSelf();
					break ;
				}
			}
	}

	// KlSoundManager.playSound("share/sound/receiveStars.wav");
	__proto.setScore=function(value,visible){
		(visible===void 0)&& (visible=true);
		this.score=value;
		this._lab.visible=visible;
	}

	__getset(0,__proto,'score',null,function(value){
		if (this._lab)
			this._lab.text="+"+value;
		this._starNum=value;
	});

	/*根据不同情况显示不同的UI界面
	1：非升阶用户身份、且未发放升阶礼品——星星领取弹窗 starsUi
	2：升阶用户身份、未发放升阶礼品——星星领取弹窗 starsUi
	3：升阶用户身份、首次发放升阶礼品——V3升阶礼包弹窗1 v3AscendUi_user
	4：非升阶用户身份、首次发放升阶礼品——V3升阶礼包弹窗2 v3AscendUi_nonUser
	5：所有用户第二次获取礼品，则不显示升阶礼品领取弹窗。
	*/
	__getset(0,__proto,'getUiType',function(){
		if (VipThink.viewMgr.feedBackView){
			this._ascendV3Init=VipThink.viewMgr.feedBackView._ascendV3Init;
		};
		var _str="starsUi";
		if (this._ascendV3Init && this._ascendV3Init !=null){
			var ascendUser=this._ascendV3Init.isUpgrade;
			_str=parseInt(ascendUser)==1 ? "v3AscendUi_user" :"v3AscendUi_nonUser";
		}
		return _str;
	});

	__getset(0,__proto,'visible',_super.prototype._$get_visible,function(value){
		console.debug("ReceiveStarsView--set visible, value:"+value);
		VipThink.logCallee(arguments.callee,"ReceiveStarsView.set visible");
		Laya.superSet(View,this,'visible',value);
	});

	__getset(0,__proto,'clickHandler',null,function(handler){
		this._handler=handler;
	});

	ReceiveStarsView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Sprite","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.6},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_ske","name":"boxSke","height":1080},"child":[{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"_ske","url":"share/animation/pea_z_happy.sk","stopAt":1,"preview":false,"name":"ske","isLoop":"false"}}]},{"type":"Box","props":{"y":700,"x":951,"width":513,"visible":false,"var":"_box","name":"box","height":236,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":49,"width":172,"var":"_lab","height":98,"fontSize":70,"font":"Microsoft YaHei","color":"#242424","centerX":0,"anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"ScaleButton","props":{"y":155,"width":393,"var":"_bt","skin":"share/ui/lqxx_13.png","sizeGrid":"0,99,0,113","label":"","height":91,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"width":179,"valign":"middle","text":"领取星星","height":68,"fontSize":31,"font":"Microsoft YaHei","color":"#ffffff","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5,"align":"center"}}]}]}]};
	ReceiveStarsView.ascendV3uiView={"type":"View","props":{"width":1920,"height":1080},"child":[ {"type":"Sprite","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.6},"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":540,"x":960,"width":1920,"var":"_v3AscendUi","scaleY":0,"scaleX":0,"height":1080,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Image","props":{"y":169,"x":959,"width":1109,"var":"_baseImg","skin":"share/ui/ascendV3/img_3.png","sizeGrid":"72,72,70,70","scaleY":1,"scaleX":1,"height":770,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":275,"x":542,"var":"_soundBtn","skin":"share/ui/ascendV3/img_1.png","scaleY":1.6,"scaleX":1.6}},{"type":"Image","props":{"y":18,"x":646,"skin":"share/ui/ascendV3/img_7.png","scaleY":1.6,"scaleX":1.6}},{"type":"Image","props":{"y":317,"x":604,"skin":"share/ui/ascendV3/img_5.png","scaleY":1.6,"scaleX":1.6}},{"type":"Image","props":{"y":317,"x":1062,"skin":"share/ui/ascendV3/img_11.png","scaleY":1.6,"scaleX":1.6}},{"type":"Box","props":{"y":648,"x":528,"width":890,"visible":false,"var":"userBox","height":208},"child":[ {"type":"Image","props":{"y":39,"skin":"share/ui/ascendV3/img_4.png","scaleY":1,"scaleX":1}},{"type":"Label","props":{"y":34,"x":429,"width":719,"valign":"middle","text":"完成课后学习，查看结课礼包信息","height":68,"fontSize":30,"font":"Microsoft YaHei","color":"#333333","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":39,"x":676,"skin":"share/ui/ascendV3/img_4.png","scaleY":1,"scaleX":1}},{"type":"Image","props":{"y":124,"x":432,"skin":"share/ui/ascendV3/img_9.png","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":183,"x":432,"width":96,"valign":"middle","text":"结课礼包","height":68,"fontSize":23,"font":"Microsoft YaHei","color":"#654713","bold":true,"anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":124,"x":770,"skin":"share/ui/ascendV3/img_6.png","scaleY":1.7,"scaleX":1.7}}]},{"type":"Box","props":{"y":648,"x":605.5,"visible":false,"var":"non_userBox"},"child":[ {"type":"Label","props":{"y":34,"x":359.5,"width":719,"valign":"middle","text":"奖杯可前往“豌豆游乐园”-“成就广场”查看哦！","height":68,"fontSize":30,"font":"Microsoft YaHei","color":"#333333","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":47,"x":694.5,"skin":"share/ui/ascendV3/img_6.png","scaleY":1.7,"scaleX":1.7}}]},{"type":"ScaleButton","props":{"y":809,"width":357,"var":"_sumbitBt","skin":"share/ui/bt.png","sizeGrid":"44,46,44,48","scaleY":1.2,"scaleX":1.2,"label":"","height":91,"centerX":2,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Label","props":{"width":179,"valign":"middle","text":"收下奖励","height":68,"fontSize":35,"font":"Microsoft YaHei","color":"#ffffff","centerY":-6,"centerX":-1,"bold":true,"anchorY":0.5,"anchorX":0.5,"align":"center"}}]},{"type":"Label","props":{"y":595,"x":747,"width":144,"var":"_starLabel","valign":"middle","text":"星星 × 3","height":68,"fontSize":35,"font":"Microsoft YaHei","color":"#654713","bold":true,"anchorY":0.5,"anchorX":0.5,"align":"left"}},{"type":"Label","props":{"y":595,"x":1210,"width":144,"valign":"middle","text":"结课奖杯","height":68,"fontSize":35,"font":"Microsoft YaHei","color":"#654713","bold":true,"anchorY":0.5,"anchorX":0.5,"align":"left"}}]}]};
	return ReceiveStarsView;
})(View)


//class com.subject.module.functionshell.BaseEvaluationView extends laya.ui.View
var BaseEvaluationView=(function(_super){
	function BaseEvaluationView(){
		this._box_up=null;
		this._bt_sound=null;
		this._bt_redo=null;
		this._bt_ok=null;
		this._img_kuang=null;
		this._lab_subject=null;
		this._lab_desc=null;
		this._label_yinying=null;
		this._lable=null;
		this._box_notice=null;
		this._bt_notjump=null;
		this._bt_jump=null;
		this._box_done=null;
		this._lab_title_done=null;
		this._lab_desc_done=null;
		this._box_msg=null;
		this._label_point=null;
		this._initLabDescData=null;
		this.TAG=null;
		this.SOUND_JUMP="share/sound/evaluation_jump.wav";
		this.SOUND_COMPLETE="share/sound/evaluation_complete.wav";
		/**
		*作答超时结束
		**/
		this.SOUND_COMPLETE_TIMEOUT="share/sound/evaluation_complete_timeout.wav";
		/**
		*同步练习结束后提示音（豌豆精灵）
		**/
		this.SOUND_COMPLETE_FORTONGBU="share/sound/evaluation2_complete.wav";
		/**
		*同步练习结束后提示音（乐迪）
		**/
		this.SOUND_COMPLETE_FORTONGBU_ledi="share/sound/evaluation_complete_ledi.wav";
		/**
		*表达阶段测评完成后提示音
		**/
		this.SOUND_COMPLETE_STAGEEVA="share/sound/evaluation_complete_stageEva.mp3";
		this.SOUND_TIME_OUT="share/sound/timeout_next.wav";
		/**是否自动播放音效 */
		this.AUTO_PLAY_SOUND=false;
		/**播放语音的时候是否可以操作界面 */
		this.CAN_ACT_WHEN_SOUND_PLAY=true;
		/**是否倒计时 */
		this.COUNT_DOWN=false;
		this._isRedo=false;
		this._costTime=0;
		this._mode=1;
		this.notSubPageNum=0;
		this.isShowMsgEd=false;
		this.jumpTimes=0;
		this.redoTimes=0;
		this.commitTimes=0;
		/**
		*记录标题的字符
		*/
		this.strLableQ="";
		/**
		*记录页码的字符
		*/
		this.strLabelM="";
		/**记录题号的显示与隐藏状态 */
		this.open_the_title_number=-1;
		// 新加---------start--------
		this.error_eff_box=null;
		this.error_sk=null;
		this.error_imgKuang=null;
		this.error_lab_desc=null;
		this.sull_eff_box=null;
		this.sull_sk=null;
		this.sull_sk1=null;
		this._bt_ip=null;
		this.end_eff_box=null;
		this.end_eff_sk=null;
		this._yc_bt_next=null;
		this._bt_next=null;
		// 错误动画播放完 后 按钮可操作 呼吸状态
		this.resList=null;
		// 结算
		this.error_imgdesc=null;
		this.ch_lab_desc=null;
		this.ch_strLableQ="";
		// 语文 课题
		this.ch_lab_subject=null;
		this._lblExtInfo=null;
		this.tipsLabel=null;
		this.recordFileId="";
		// 新加---------end--------
		this.isRemainingTimeEnd=false;
		// 是否剩余时间结束
		this.isRemainingCountDown=false;
		// 是否剩余时间计时中
		this.answerDataObj={};
		this.msgNameMap={"op1":"1_1","ed1":"4_1","op2":"5_1","ed2":"6_1","op3":"7_1","ed3":"8_1"};
		/**
		*标点符号合集
		**/
		this.punctuationArr=[",",".","?","，","！","。",":","+","-","*","/","!",";","；","'","？","`","、","%","<",">",'"',"'","(",")","<",">","（","）","《","》","@","°","~","—","^","#","="];
		// todo:提交成功后，将当前题目的result设为null
		BaseEvaluationView.__super.call(this);
		this._startTs=new Date().getTime();
	}

	__class(BaseEvaluationView,'com.subject.module.functionshell.BaseEvaluationView',_super);
	var __proto=BaseEvaluationView.prototype;
	Laya.imps(__proto,{"com.biz.native.INativeCommandTarget":true})
	__proto.createChildren=function(){
		var _$this=this;
		console.log('VipThink.config.evaData: ',VipThink.config)
		console.log('EvaModel.data: ',EvaModel.data)
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		if ((typeof EvaModel.data.courseIndices=='string')){
			var str=EvaModel.data.courseIndices;
			EvaModel.data.courseIndices=JSON.parse(str);
		}
		if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			var ch_res_arr=[
			{url:"share/animation/ch_res/begin_yeah.sk",type:"arraybuffer"},
			{url:"share/animation/ch_res/begin_yeah.png",type:"image"},
			{url:"share/animation/ch_res/hm_bt.sk",type:"arraybuffer"},
			{url:"share/animation/ch_res/hm_bt.png",type:"image"},
			{url:"share/animation/ch_res/end_yeah.sk",type:"arraybuffer"},
			{url:"share/animation/ch_res/end_yeah.png",type:"image"},
			{url:"share/animation/ch_res/begin_yeah_6.sk",type:"arraybuffer"},
			{url:"share/animation/ch_res/begin_yeah_6.png",type:"image"},
			{url:"share/animation/ch_res/sound_end_yeah.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah1.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah2.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah3.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah4.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah5.mp3",type:"sound"},
			{url:"share/animation/ch_res/sound_yeah6.mp3",type:"sound"}];
			Laya.loader.load(ch_res_arr);
		}
		if (this.isNewUI()){
			if (this.isEn()){
				this.createView(BaseEvaluationView.uiView_new_en);
			}
			else{
				this.createView(BaseEvaluationView.uiView_new);
				this.initLanguage();
			}
		}
		else{
			if (this.isEn()){
				this.createView(BaseEvaluationView.uiView_en);
			}
			else{
				this.createView(BaseEvaluationView.uiView);
				this.initLanguage();
			}
		};
		var lblExtInfo=new Label();
		lblExtInfo.strokeColor=this._label_point.strokeColor;
		lblExtInfo.stroke=this._label_point.stroke+2;
		lblExtInfo.fontSize=this._label_point.fontSize-4;
		lblExtInfo.font=this._label_point.font;
		lblExtInfo.color=this._label_point.color;
		lblExtInfo.alpha=this._label_point.alpha;
		lblExtInfo.visible=false;
		lblExtInfo.x=10;
		lblExtInfo.y=this._label_point.y;
		this._label_point.parent.addChild(lblExtInfo);
		this._lblExtInfo=lblExtInfo;
		if (VipThink.config.courseCfg.isSound==false){
			this._bt_sound.visible=false;
		}
		if (this._lab_desc)
			this._lab_desc.wordWrap=false;
		this.mouseThrough=true;
		this._initLabDescData=this.getCompData(this._lab_desc);
		this._bt_ok.on("click",this,this.onClick);
		this._bt_redo.on("click",this,this.onClick);
		this._bt_sound.on("click",this,this.onClick);
		this._bt_notjump.on("click",this,this.onClick);
		this._bt_jump.on("click",this,this.onClick);
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		VipThink.viewMgr.on("change",this,this.onLevelChange);
		this._label_yinying.visible=false;
		if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			this._bt_next.on("click",this,this.onClick);
			this._bt_ip.on("click",this,this.onClick);
			this.ch_lab_desc.stroke=6;
			this.ch_lab_subject.stroke=6;
			ChineseHomeWorkViewManager.instance._initShow(this,this.error_eff_box,this.error_sk,this.error_imgKuang,this.error_lab_desc,this.sull_eff_box,this.sull_sk,this.sull_sk1,this._bt_ip,this.end_eff_box,this.end_eff_sk,this._yc_bt_next,this._bt_next,this.ch_lab_desc,this.error_imgdesc);
		}
		if (!this.isNewUI()){
			(this._lab_desc.getChildAt(0)).autoSize=true;
			(this._lab_subject.getChildAt(0)).autoSize=true;
		}
		else
		this._bt_sound.isChangeSmall=this._bt_ok.isChangeSmall=this._bt_redo.isChangeSmall=true;
		this.firstSetLabel();
		this._lab_title_done.text=this.donePageTitle;
		this._lab_desc_done.text=this.donePageDesc;
		this._mode=(VipThink.config.courseType==100 || (VipThink.nativeAPI instanceof com.biz.native.AndroidNative ))? 2 :1;
		if (this._mode==2){
			this._lab_desc_done.text="";
		};
		var mView=VipThink.viewMgr.mainView;
		this.x=mView.x;
		this.scaleX=mView.scaleX;
		this.scaleY=mView.scaleY;
		VipThink.nativeCommandMgr.regist(this);
		this.addHitArea();
		KlEventCenter.on("evaGuideNextPage",this,this.onEvaGuideNextPage);
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.onNativeCall);
		VipThink.viewMgr.on("open_the_title_number",this,function(num){
			_$this.open_the_title_number=num;
			_$this.onControlQid();
		});
		VipThink.viewMgr.on("send_coice_record_up_end",this,this.onSendCoiceRecordUpEnd);
		VipThink.viewMgr.on("STAGEEVALUATION_SCORE",this,this.onStageEvaluationScore);
	}

	__proto.initLanguage=function(){
		if(this.tipsLabel){
			this._bt_jump.label=VipThink.getLanguageText(22);
			this._bt_notjump.label=VipThink.getLanguageText(23);
			this.tipsLabel.text=VipThink.getLanguageText(24);
		}
	}

	/**
	*调用本地接口方法 语音题修改兼容2023/12/13
	*@param param 方法名 上传成功后再截图
	*/
	__proto.onSendCoiceRecordUpEnd=function(v){
		if (v==1){
			this.recordFileId="";
		}
		else{
			if (v){
				this.recordFileId=v;
			}
			else{
				this.recordFileId="";
			}
			this.cutScreen();
		}
	}

	__proto.setOpenTitleNumVisible=function(num){
		this.open_the_title_number=num;
	}

	__proto.onControlQid=function(){
		this._lab_subject.text=this.strLableQ;
		if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			this.ch_lab_subject.text=this.ch_strLableQ;
			if (this.open_the_title_number==1){
				this.ch_lab_subject.visible=false;
			}
			else if (this.open_the_title_number==0){
				var page=VipThink.currView;
				this.ch_lab_subject.visible=!(page.hideTitle);
			}
		}
		this._lable.text=this._label_yinying.text=this.strLabelM;
		if (this.open_the_title_number==1){
			this._lab_subject.visible=false;
			this._lable.visible=false;
		}
		else if (this.open_the_title_number==0){
			this._lab_subject.visible=true;
			this._lable.visible=true;
		}
		else{
		}
	}

	__proto.onNativeCall=function(args){
		switch (args.minorType){
			case "evaRedo":{
					this.onClick({target:this._bt_redo});
					break ;
				}
			}
	}

	__proto.setNotSubPageNum=function(){
		var mv=VipThink.viewMgr.mainView;
		if (!mv){
			this.frameOnce(1,this,this.setNotSubPageNum);
			return;
		}
		this.notSubPageNum=0;
		if (mv.pageCfgList[0].type=="evaGuide"){
			this.notSubPageNum++;
		}
		if (mv.pageCfgList[0].type=="evaGuide_v4"){
			this.notSubPageNum++;
		}
	}

	__proto.onEvaGuideNextPage=function(){
		this.clearCountDown("onClick","点击确定按钮");
		this.nextPage();
	}

	__proto.isEn=function(){
		var courseObj=VipThink.config.courseCfg;
		if (courseObj && courseObj.lang==="en")
			return true;
		else
		return false;
	}

	__proto.isNewUI=function(){
		return (VipThink.courseID && VipThink.courseID.indexOf("_v3_")!=-1)|| VipThink.config.courseCfg.newEva;
	}

	__proto.addHitArea=function(){
		var s_sp=new Rectangle(-this._bt_sound.width / 2,-this._bt_sound.height / 2,this._bt_sound.width *2,this._bt_sound.height *2);
		this._bt_sound.hitArea=s_sp;
		var r_sp=new Rectangle(-this._bt_redo.width *0.25,-this._bt_redo.height *0.5,this._bt_redo.width *1.25,this._bt_redo.height *2);
		this._bt_redo.hitArea=r_sp;
		var o_sp=new Rectangle(0,-this._bt_redo.height *0.5,this._bt_redo.width *1.25,this._bt_redo.height *2);
		this._bt_ok.hitArea=o_sp;
	}

	__proto.getCompData=function(comp){
		return {x:comp.x,y:comp.y,width:comp.width,height:comp.height,fontSize:comp.fontSize,fontColor:comp.color,font:comp.font};
	}

	__proto.setCompData=function(comp,data,unSetKeys){
		for (var key in data){
			if (!this.valueIsInArray(key,unSetKeys))
				comp[key]=data[key];
		}
		this._lab_subject.fontSize=this._lab_desc.fontSize;
	}

	__proto.valueIsInArray=function(v,arr){
		if (!arr){
			return false;
		}
		var k;
		for(var $each_k in arr){
			k=arr[$each_k];
			if (k==v){
				return true;
			}
		}
		return false;
	}

	__proto.firstSetLabel=function(){
		var _$this=this;
		if (["ctored","prepared"].indexOf(VipThink.currView.status)==-1){
			this.frameOnce(1,this,this.firstSetLabel);
		}
		else{
			this.setNotSubPageNum();
			this.showMsgBox("op",new Handler(this,function(){
				_$this.setLabel();
				console.debug("BaseEvaluationView -------- firstSetLabel ------------- 开始计时");
				_$this._startTs=new Date().getTime();
				_$this.autoPlaySound();
				_$this.checkRemainingTime()
			}));
		}
	}

	__proto.checkRemainingTime=function(){
		if (this.remainingTime===-1 || this.isRemainingCountDown){
			console.debug('checkRemainingTime','不需要启动剩余时间计时',this.remainingTime,this.isRemainingCountDown);
			return;
		}
		console.debug('checkRemainingTime','启动剩余时间计时（秒）',this.remainingTime);
		this.isRemainingCountDown=true;
		this.timer.once(this.remainingTime *1000,this,this.onRemainingTimeEnd);
	}

	__proto.onRemainingTimeEnd=function(){
		console.debug("BaseEvaluationView -------- onRemainingTimeEnd ------------- 剩余时间结束");
		this.isRemainingTimeEnd=true;
		this.isRemainingCountDown=false;
		if (VipThink.currView){
			VipThink.currView.mouseEnabled=false;
		}
		this.mouseEnabled=false;
		this.cutScreen();
	}

	__proto.onLevelChange=function(){
		if (VipThink.currView){
			VipThink.currView.SoundSprite.playSoundOverHander=null;
			VipThink.currView.SoundSprite.completeArgs=null;
		}
	}

	// 进出关卡时需要显示关卡提示
	__proto.showMsgBox=function(type,handle){
		var _$this=this;
		console.debug("BaseEvaluationView -------------- showMsgBox -------------- 显示提示");
		if (type=="countDown"){
			this._box_msg.visible=true;
			var ld1=this._box_msg.getChildByName("ld");
			ld1.play("2_1",false);
			ld1.visible=true;
			ld1.once("end",this,function(){
				_$this._box_msg.visible=false;
				ld1.visible=false;
				Laya.stage.off("mousedown",this,_$this.hideCountDownMsg);
			});
			Laya.stage.once("mousedown",this,this.hideCountDownMsg);
		}
		else{
			var param=VipThink.currView.config.param;
			if (param && param.msg && this.msgNameMap[param.msg]){
				if ((param.msg.indexOf("op")>-1 && type=="op")|| (param.msg.indexOf("ed")>-1 && type=="ed")){
					this.frameOnce(1,this,function(){
						_$this.canAct=false;
					});
					var ld=this._box_msg.getChildByName("ld");
					var yanhua=this._box_msg.getChildByName("yanhua");
					ld.visible=yanhua.visible=true;
					this._box_msg.visible=true;
					yanhua.play(yanhua.currAniName,false);
					ld.play(this.msgNameMap[param.msg],false);
					ld.once("end",this,function(){
						_$this.canAct=true;
						_$this._box_msg.visible=ld.visible=yanhua.visible=false;
						handle && handle.run();
					});
					if (param.msg=="ed3")
						this.isShowMsgEd=true;
				}
				else
				handle && handle.run();
			}
			else
			handle && handle.run();
		}
	}

	__proto.hideCountDownMsg=function(){
		this._box_msg.visible=false;
		this.canAct=true;
		KlSoundManager.stopAllSound();
	}

	__proto.onPrepared=function(data){
		var _$this=this;
		console.log('触发onPrepared')
		this.stopSounds();
		this.setLabel();
		if (!this._isRedo){
			console.debug("BaseEvaluationView -------- onPrepared ------------- 开始计时");
			this._startTs=new Date().getTime();
			this.showMsgBox("op",new Handler(this,function(){
				_$this.autoPlaySound();
				_$this.checkRemainingTime()
			}));
		}
		this._isRedo=false;
	}

	/**
	*自动播放音效
	*/
	__proto.autoPlaySound=function(){
		if (this._isRedo){
			return;
		}
		if (!this.AUTO_PLAY_SOUND){
			return;
		};
		var currView=VipThink.currView;
		currView && (currView.mouseEnabled=this.CAN_ACT_WHEN_SOUND_PLAY);
		this.consoleDebug("autoPlaySound","自动播放语音");
		if (currView && currView.sound){
			this.playSound(currView.sound,this.onAutoPlaySoundCompleted);
		}
	}

	/**
	*自动播放音效结束回调
	*/
	__proto.onAutoPlaySoundCompleted=function(){
		var currView=VipThink.currView;
		if (!currView)
			return;
		this.consoleDebug("onAutoPlaySoundCompleted");
		currView.mouseEnabled=true;
		var tg=this.timeGradient;
		if (this.COUNT_DOWN && this.remainingTime===-1){
			var len=((tg && tg.length > 0)? tg[tg.length-1] :180)*1000;
			this.consoleDebug("onAutoPlaySoundCompleted","startCountDown, countTime:"+len);
			if (len > 60000 && Laya.__typeof(VipThink.currView,'com.biz.ui.IGdEvaluation'))
				this.timer.once(len-60000,this,this.showMsgBox,["countDown"]);
			this.timer.once(len,this,this.onTimeOut);
		}
	}

	__proto.onTimeOut=function(){
		this.consoleDebug("onTimeOut","答题超时");
		this._box_notice.visible=false;
		if (VipThink.currView)
			VipThink.currView.mouseEnabled=false;
		this.mouseEnabled=false;
		if (this.isLastLevel){
			this.cutScreen();
		}
		else{
			this.playSound(this.SOUND_TIME_OUT,this.cutScreen);
		}
	}

	__proto.playSound=function(url,complete){
		if (Browser.onIOS || Browser.onAndroid){
			var sound=new Sound();
			sound.load(url);
			var t=sound.duration;
			if (!t || t < 0)
				t=1;
			this.timer.once(t,this,complete);
			this.myPlaySound(url);
		}
		else{
			this.myPlaySound(url,1,Handler.create(this,complete));
		}
	}

	__proto.setLabel=function(){
		var _$this=this;
		this.showExtInfo(false);
		this._label_point.visible=false;
		this._lab_desc.visible=false;
		this._box_notice.mouseEnabled=true;
		if (!this.isNewUI())
			this.setCompData(this._lab_desc,this._initLabDescData);
		else
		this.setCompData(this._lab_desc,this._initLabDescData,["height"]);
		var level=VipThink.viewMgr.currPageIdx;
		var len=VipThink.viewMgr.mainView.pageCfgList.length;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0){
			var pageConfig=VipThink.config.courseCfg.pages[level];
			level=pageConfig.currentIdx;
			len=pageConfig.totalLen;
		}
		this.strLableQ=StringUtil.format("{0}{1}{2}","Q",level+1-this.notSubPageNum,":");
		this.strLabelM=StringUtil.format("{0}{1}/{2}","题目进度：",level+1-this.notSubPageNum,len-this.notSubPageNum);
		if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			this.ch_strLableQ=StringUtil.format("{0}{1}{2}","挑战",level+1-this.notSubPageNum,":");
		}
		this._lab_desc.text="";
		var page=VipThink.currView;
		if (!this._isRedo)
			this.clearCountDown("setLabel","!_isRedo");
		if (!page){
			return;
		}
		this.visible=!page.isHideShell;
		if ((page instanceof com.subject.module.specialklview.evaguide.EvaGuide )){
			return;
		}
		if ((page instanceof com.subject.module.specialklview.evaguidev4.EvaGuideV4 )){
			return;
		}
		if (page.labDesc){
			page.labDesc.apply(page,[this._lab_desc]);
			this._lab_subject.fontSize=this._lab_desc.fontSize;
		}
		if (page.updateDesc){
			page.updateDesc.apply(page,[Handler.create(this,this.updateDesc,null,false)]);
		}
		this._box_up.y=page.boxTitleY ? page.boxTitleY :0;
		this._box_up.y=this._box_up.y *VipThink.viewMgr.mainView.scaleY+VipThink.viewMgr.mainView.y;
		this._img_kuang.visible=!(page.hideTitleBg);
		this._img_kuang.alpha=0.7;
		this._lab_desc.stroke=6;
		this._lab_subject.stroke=6;
		this._lab_subject.visible=this._lab_desc.visible=!(page.hideTitle);
		this.onControlQid();
		this._lab_desc.text=page.desc;
		if (EvaModel.data.descArr){
			this._lab_desc.text=EvaModel.data.descArr[VipThink.viewMgr.currPageIdx-this.notSubPageNum];
		}
		if (this._lab_desc.textField.textWidth > this._lab_desc.width){
			var str=this._lab_desc.text;
			var strInfoArr=[];
			var num=0;
			var shengxiaStr='';
			for (var i=0;i < str.length+1;i++){
				this._lab_desc.text=str.slice(num,i);
				if (this._lab_desc.textField.textWidth > this._lab_desc.width){
					var s="";
					shengxiaStr=str.slice(i-1,str.length);
					if (shengxiaStr && shengxiaStr !=""){
						s=str.slice(num,i-1)+" \n";
					}
					else{
						s=str.slice(num,i-1);
					}
					if (shengxiaStr && shengxiaStr !=""){
						for (var k=0;k < this.punctuationArr.length;k++){
							var sstr=shengxiaStr.substr(0,1);
							if (sstr==this.punctuationArr[k]){
								i++;
								shengxiaStr=str.slice(i-1,str.length);
								if (shengxiaStr && shengxiaStr !=""){
									s=str.slice(num,i-1)+" \n";
								}
								else{
									s=str.slice(num,i-1);
								}
								break ;
							}
						}
					}
					strInfoArr.push(s);
					num=i-1;
				}
			}
			if (shengxiaStr && shengxiaStr !=""){
				strInfoArr.push(shengxiaStr);
			}
			if (strInfoArr && strInfoArr.length > 0){
				this._lab_desc.text="";
				for (var j=0;j < strInfoArr.length;j++){
					this._lab_desc.text=this._lab_desc.text+strInfoArr[j];
				}
			}
		}
		this._box_notice.visible=false;
		this._box_notice.mouseEnabled=true;
		this._box_done.visible=false;
		this._lab_desc.visible=true;
		if (this.isNewUI())
			this.adjustLabel();
		this.canAct=true;
		this.frameOnce(1,this,function(){
			_$this.refreshLabSubject();
		});
		if (this.ch_lab_desc)
			this.ch_lab_desc.visible=false;
		if (this.ch_lab_subject)
			this.ch_lab_subject.visible=false;
		var pageConfig1=VipThink.config.courseCfg.pages[VipThink.viewMgr.currPageIdx];
		if (pageConfig1.voicetype==true){
			this._bt_redo.visible=false;
		}
		else{
			this._bt_redo.visible=true;
		}
		if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			this.ch_lab_subject.fontSize=this.ch_lab_subject.fontSize=this._lab_subject.fontSize;
			this._lab_subject.visible=this._lab_desc.visible=false;
			this.ch_lab_desc.visible=!(page.hideTitle);
			var ch_desc=page.desc;
			if (EvaModel.data.descArr){
				ch_desc=EvaModel.data.descArr[VipThink.viewMgr.currPageIdx-this.notSubPageNum];
			}
			this.ch_lab_desc.text=ch_desc;
			this.ch_lab_subject.visible=!(page.hideTitle);
			this.adjustLabel();
			ChineseHomeWorkViewManager.instance.showCh_TextDes(page);
		}
	}

	/**
	*更新标题文字，并重置标题位置
	*/
	__proto.updateDesc=function(str){
		if (this._lab_desc){
			this._lab_desc.text=str;
		}
		if (this.isNewUI()){
			this.adjustLabel();
		}
	}

	__proto.adjustLabel=function(){
		var mul=this._lab_subject.fontSize / 36;
		var a=(this._lab_desc.getChildAt(0)).textHeight / 2;
		var b=(this._lab_desc.getChildAt(0)).textHeight / 2 *mul;
		var c=(a-b)/ 2;
		this._lab_subject.y=this._lab_desc.y-(a+c);
		if (this.ch_lab_subject){
			var a1=(this.ch_lab_desc.getChildAt(0)).textHeight / 2;
			var b1=(this.ch_lab_desc.getChildAt(0)).textHeight / 2 *mul;
			var c1=(a1-b1)/ 2;
			this.ch_lab_subject.y=this.ch_lab_desc.y-(a1+c1);
		}
	}

	/**
	*刷新标题及标题框
	*/
	__proto.refreshLabSubject=function(){
		var _$this=this;
		if (this.isNewUI())
			return;
		this._lab_subject.y=this._bt_sound.y-this._lab_subject.height / 2+15;
		this._lab_desc.y=this._lab_subject.y;
		if (this.ch_lab_subject)
			this.ch_lab_subject.y=this._lab_subject.y+13;
		if (this.ch_lab_desc)
			this.ch_lab_desc.y=this._lab_subject.y;
		this.frameOnce(1,this,function(){
			_$this._img_kuang.height=(_$this._lab_desc.getChildAt(0)).textHeight+(_$this._lab_subject.y-_$this._img_kuang.y)*2-15;
		});
	}

	/**
	*清理答题倒计时
	*/
	__proto.clearCountDown=function(from,desc){
		this.timer.clear(this,this.onTimeOut);
		this.timer.clear(this,this.showMsgBox);
		this.consoleDebug(from,desc+"-清理倒计时");
	}

	/**
	*收到应用事件做的处理
	*/
	__proto.command=function(param){
		if (param.args.act=='cutScreenDone'){
			var page=VipThink.currView;
			if (!page){
				console.error("BaseEvaluationView--command,page is undefined!");
				return;
			};
			var state=param.args.state;
			if (state==0 || state==null || state==undefined){
				this.consoleDebug("command","param.args.state is "+state);
				if (!EvaModel.data.submitAnswerAPI){
					this.consoleDebug("command","EvaModel.data.submitAnswerAPI is undifine, 没有submitAnwserAPI");
					return;
				}
				this.submit(page);
			}
			else{
				this.consoleDebug("command","收到应用截图成功事件");
				this.submit(page,false);
				if (state==1){
					this.onSubmitResult(page,{result:"complete"});
				}
				else if (state==2){
					this.onSubmitResult(page,{result:"error"});
				}
			}
		}
	}

	/**
	*播放结束语音并通知本地端显示结束界面
	*/
	__proto.playDoneSoundAndShowDoneBox=function(){
		var _$this=this;
		if (this.isLastLevel || this.isRemainingTimeEnd){
			if (this._mode==2){
				this.finish();
				return;
			}
			if (this.lastLevelFinishHandler){
				this.timer.once(2000,this,function(){
					_$this.lastLevelFinishHandler.run();
					_$this.finish();
				});
			}
			else{
				this.finish();
			}
		}
		else{
			this.canAct=true;
			console.debug("BaseEvaluationView - playDoneSoundAndShowDoneBox - 自动跳到下一关");
			this.nextPage();
		}
	}

	__proto.nextPage=function(){
		VipThink.viewMgr.currPageIdx++;
	}

	/**
	*
	*@modfiy 李雪峰 修改了错题重练不弹出提示框的实现方式
	*/
	__proto.finish=function(){
		var _$this=this;
		this.canAct=false;
		if (this.showDoneViewAndPlayComplteSound && !EvaModel.data.isRedoWrong && !this.isShowMsgEd){
			if(VipThink.EVALUATION_TYPE==1){
				var currPageIdx=VipThink.viewMgr.currPageIdx+1-this.notSubPageNum;
				UIManager.instance.show("StageEvaluationResultView");
				}else{
				this._box_done.visible=true;
			}
			if (VipThink.config && VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
				if (VipThink.config.courseCfg.classify=="gdEvaluation"){
					this._box_done.visible=false;
					this.onComplete();
					return;
				}
			}
			if (this.isRemainingTimeEnd){
				this._lab_title_done.text='作答时间已结束'
				this._lab_desc_done.text='本次测评作答时间已结束，即将为你生成专属报告。'
			}
			this.myPlaySound(this.completeSound);
			this.timer.once(this.timeToExist,this,function(){
				_$this.onComplete();
			});
		}
		else{
			this.onComplete();
		}
		console.log(this.TAG,"complete");
	}

	__proto.labDesc=function(lab){
		lab.width=1500;
	}

	__proto.onClick=function(evt){
		var page=VipThink.currView;
		if (!page)
			return;
		if (evt.target==this._bt_ok){
			this.stopSounds();
			var len=VipThink.viewMgr.mainView.pageCfgList.length;
			this.consoleDebug("onClick","点击确定按钮");
			if ((typeof page.checkResult=='function')){
				(page.checkResult).apply(page);
			};
			var r=page.result;
			var flag=!(r==false || r==true)
			if(r!=null&&r>=0){
				flag=false;
			}
			if (flag&& this._mode==1){
				if (CourseDataUtil.goClassData.exercisesTipsSwitch==false){
					VipThink.exercisesTipsSwitch=false;
				}
				this._box_notice.visible=VipThink.exercisesTipsSwitch;
				this._box_notice.mouseEnabled=VipThink.exercisesTipsSwitch;
				if (VipThink.exercisesTipsSwitch){
					this.myPlaySound(VipThink.getLanguageSound(this.SOUND_JUMP));
				}
				else{
					this.stopSounds();
					this.jumpTimes++;
					this.cutScreen();
				}
				VipThink.viewMgr.event("homework_ok",[1]);
				return;
			}
			VipThink.viewMgr.event("homework_ok",[0]);
			this.commitTimes++;
			this.clearCountDown("onClick","点击确定按钮");
			var pageConfig1=VipThink.config.courseCfg.pages[VipThink.viewMgr.currPageIdx];
			if (pageConfig1.voicetype==true){
			}
			else{
				this.cutScreen();
			}
		}
		else if (evt.target==this._bt_redo){
			this.consoleDebug("onClick","点击修改按钮");
			KlEventCenter.event("btnClick",["resetBtnClick"]);
			this.stopSounds();
			page.result=null;
			this._isRedo=true;
			VipThink.viewMgr.reset(true);
			this.redoTimes++;
		}
		else if (evt.target==this._bt_sound){
			this.stopSounds();
			this.myPlaySound(page.sound);
			page.soundClickHandle && page.soundClickHandle.run();
			KlEventCenter.event("btnClick",["questionBtnClick"]);
		}
		else if (evt.target==this._bt_jump){
			this.consoleDebug("onClick","点击跳过按钮");
			this._box_notice.mouseEnabled=false;
			this.clearCountDown("onClick","点击跳过按钮");
			this._box_notice.visible=false;
			this.stopSounds();
			this.jumpTimes++;
			this.cutScreen();
			VipThink.viewMgr.event("homework_ok",[2]);
		}
		else if (evt.target==this._bt_notjump){
			this.consoleDebug("onClick","点击不跳过按钮");
			this._box_notice.visible=false;
			this.stopSounds();
			VipThink.viewMgr.event("homework_ok",[3]);
		}
		else if (evt.target==this._bt_next){
			ChineseHomeWorkViewManager.instance.nextLevel();
		}
		else if (evt.target==this._bt_ip){
			ChineseHomeWorkViewManager.instance.playCh_Sound();
		}
	}

	__proto.stopSounds=function(){
		Browser.onIOS && this.timer.clear(this,this.onAutoPlaySoundCompleted);
		KlSoundManager.stopAll();
		SoundManager.stopAll();
	}

	__proto.onComplete=function(){
		this.consoleDebug("onComplete","完成测评");
		if (this.isGdEvaluation){
			VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{
						act:"complete",
						desc:"测评完成",
						submitData:{
							evaId:this.submitData.evaId,
							userId:this.submitData.userId,
							questionIndex:this.submitData.questionIndex
						},
						status:this.isRemainingTimeEnd ? 2 :1
			}}});
			}else {
			VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"complete",desc:"测评完成"}}});
		}
		UIManager.instance.hide("StageEvaluationResultView");
	}

	/**设置额外信息可见性 */
	__proto.showExtInfo=function(v){
		this._lblExtInfo.visible=v;
		if (!v)
			return;
		this._lblExtInfo.text=StringUtil.formatTime();
		this._lblExtInfo.text+=" UID:"+VipThink.user.id;
	}

	/**
	*截屏
	*/
	__proto.cutScreen=function(rightNow,data){
		(rightNow===void 0)&& (rightNow=false);
		var page=VipThink.currView;
		if (!page){
			console.error("BaseEvaluationView - cutScreen - page is undefined");
			return;
		}
		console.debug("BaseEvaluationView - cutScreen - 计时结束，时长："+Math.ceil((new Date().getTime()-this._startTs)/ 1000));
		if (this.notNeedToCutScreen){
			this.submit(page);
		}
		else{
			this.canAct=false;
			var currPageIdx=VipThink.viewMgr.currPageIdx+1-this.notSubPageNum;
			if (!data){
				this._costTime=Math.ceil((new Date().getTime()-this._startTs)/ 1000);
				if (!this._costTime)
					this._costTime=1;
				var sd=this.submitData;
				if (!sd || ObjUtil.isEmptyObj(sd)){
					Reporter.reportData(1,this.TAG+"submiteData is null or empty; courseID:"+VipThink.courseID+"; pageIndex:"+currPageIdx,null,{logger:console.error});
					Reporter.reportSLS("hw_submit_error",{etype:"hw",msg:"submiteData is null or empty"},console.warn);
					return;
				}
				if (sd.timeLong==0){
					sd.timeLong=1;
				}
				data=this.copyObj(sd);
			}
			if (!rightNow){
				this._label_point.visible=page.result;
				this.showExtInfo(true);
				this.frameOnce(2,this,this.cutScreen,[true,data]);
				return;
			};
			var reportData;
			if (this.TAG=="HomeWorkOnlineView"){
				reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6},{7},{8}]",this.TAG,VipThink.courseID,data.onlineWorkId,data.userId,data.liveId,data.type,data.level,data.status,data.time);
			}
			else{
				reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6}]",this.TAG,VipThink.courseID,data.evaId,data.userId,data.questionIndex,data.timeLong,data.answer);
			}
			Reporter.reportData(1,reportData);
			Reporter.reportSLS("hw_submit",{etype:"hw",param:{data:data,imgInfo:this._lblExtInfo.text,result:page.result}},{msg:"cutScreen-提交给应用端的数据："});
			var truePageIdx=this.getTruePageIdx(currPageIdx);
			this.captureScreen(truePageIdx,currPageIdx,data);
		}
	}

	/**
	*currPageIdx是从1开始的，第一关为1
	*/
	__proto.getTruePageIdx=function(currPageIdx){
		var truePageIdx=currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > currPageIdx-1){
			truePageIdx=EvaModel.data.courseIndices[currPageIdx-1]+1;
		}
		return truePageIdx;
	}

	__proto.captureScreen=function(truePageIdx,currPageIdx,data){
		VipThink.nativeAPI.captureScreen("evaluation/"+truePageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data,recordFileId:this.recordFileId}});
	}

	/**
	*提交
	*/
	__proto.submit=function(v,needToSubmit){
		var _$this=this;
		(needToSubmit===void 0)&& (needToSubmit=true);
		if (!v)
			return;
		if (this._mode==2){
			if (v.result){
				v.showAnswerFace(1);
				if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
					ChineseHomeWorkViewManager.instance.showMouseEnabled(false);
				}
				Laya.timer.once(2000,this,function(){
					if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
						ChineseHomeWorkViewManager.instance.ch_NextLevel(v,VipThink.viewMgr.currPageIdx+1-_$this.notSubPageNum);
					}
					else{
						_$this.nextLevel(v);
					}
				});
			}
			else{
				v.showAnswerFace(2);
				Laya.timer.once(2000,this,function(){
					_$this._bt_ok.mouseEnabled=true;
				});
			}
			return;
		}
		if (!this.releaseDev){
			if (VipThink.cfgCourse.isEvaluation && !EvaModel.data.submitAnswerAPI && needToSubmit){
				this.canAct=false;
				var currPageIdx=VipThink.viewMgr.currPageIdx+1-this.notSubPageNum;
				this._costTime=Math.ceil((new Date().getTime()-this._startTs)/ 1000);
				if (!this._costTime)
					this._costTime=1;
				var sd=this.submitData;
				if (!sd || ObjUtil.isEmptyObj(sd)){
					Reporter.reportData(2,this.TAG+"submiteData is null or empty; courseID:"+VipThink.courseID+"; pageIndex:"+currPageIdx,null,{logger:console.error});
					return;
				}
				if (sd.timeLong==0){
					sd.timeLong=1;
				};
				var data=this.copyObj(sd);
				this.consoleDebug("cutScreen","submitData-提交给应用端的数据："+data && JSON.stringify(data));
				var reportData;
				if (this.TAG=="HomeWorkOnlineView"){
					reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6},{7},{8}]",this.TAG,VipThink.courseID,data.onlineWorkId,data.userId,data.liveId,data.type,data.level,data.status,data.time);
				}
				else{
					reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6}]",this.TAG,VipThink.courseID,data.evaId,data.userId,data.questionIndex,data.timeLong,data.answer);
				}
				Reporter.reportData(1,reportData);
				VipThink.nativeAPI.captureScreen("evaluation/"+currPageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data}});
				return;
			}
		};
		var str='错误';
		if (v){
			if (v.result==true || v.result==1){
				str='正确';
			}
			else if (v.result==false || v.result==0){
				str='错误';
			}
			else if (v.result==null){
				str='跳过';
			}
			KlEventCenter.event("online_work_result",v.result);
		}
		this.myConsole("【本题题号】："+(VipThink.viewMgr.currPageIdx+1-this.notSubPageNum)+"，【提交答案】："+str);
		if (this.releaseDev){
			this.curr_v=v;
			if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
				ChineseHomeWorkViewManager.instance.ch_NextLevel(v,VipThink.viewMgr.currPageIdx+1-this.notSubPageNum);
			}
			else{
				this.nextLevel(v);
			}
			return;
		}
		if (needToSubmit){
			this.canAct=false;
			this.doTrans(v);
		}
	}

	__proto.doTrans=function(v){
		this.consoleDebug("doTrans","课件自己提交答案");
		this._costTime=Math.ceil((new Date().getTime()-this._startTs)/ 1000);
		console.debug("BaseEvaluationView -------- doTrans ------------- 计时结束，时长："+this._costTime);
		var d=this.copyObj(this.submitData);
		TransManager.doTrans("sendEvaluationResult",[this.onSubmitResult,this,v],[d]);
		VipThink.viewMgr.toast("SUBMITING",this.TAG,"info",0,true);
	}

	/**提交结果 */
	__proto.onSubmitResult=function(evaView,data){
		if (data){
			if (data.result=="complete"){
				this.myConsole("【本题提交答案成功】");
				if (VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
					ChineseHomeWorkViewManager.instance.ch_NextLevel(evaView,VipThink.viewMgr.currPageIdx+1-this.notSubPageNum);
				}
				else{
					this.nextLevel(evaView);
				}
			}
			else if (data.result=="error"){
				this.myConsole("【本题提交答案失败】");
				this.canAct=true;
				VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
			}
		}
		else{
			this.myConsole("【本题提交答案失败】");
			this.canAct=true;
			VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
		}
	}

	__proto.myConsole=function(str){
		console.log("-------------------------");
		console.log("【本题题号】：第 "+(VipThink.viewMgr.currPageIdx+1)+" 关");
		console.log(str);
		console.log("-------------------------");
		this.consoleDebug("myConsole",str);
		if (VipThink.config.courseType==6){
			VipThink.viewMgr.toast(str,this.TAG,"info",3000);
		}
	}

	__proto.nextLevel=function(evaView){
		this.consoleDebug("nextLevel","即将切换到下一关");
		evaView.result=null;
		this.showMsgBox("ed",new Handler(this,this.playDoneSoundAndShowDoneBox));
	}

	__proto.copyObj=function(value){
		if (!value || (typeof value=='string'))
			return value;
		return JSON.parse(JSON.stringify(value));
	}

	/**
	*播放音效
	*/
	__proto.myPlaySound=function(url,loops,complete,soundClass,startTime,type){
		(loops===void 0)&& (loops=1);
		(startTime===void 0)&& (startTime=0);
		if (VipThink.currView){
			VipThink.currView.playSound(url,loops,soundClass,startTime,type,complete);
		}
		else{
			KlSoundManager.playSound(url,loops,complete,soundClass,startTime,type);
		}
	}

	/**
	*打印dubug信息 收集日志
	*/
	__proto.consoleDebug=function(funName,decs){
		(decs===void 0)&& (decs="");
		VipThink.debugLog("BaseEvaluationView",funName,decs,this.TAG);
	}

	__proto.onStageEvaluationScore=function(answerData){
		var currPageIdx=VipThink.viewMgr.currPageIdx;
		this.answerDataObj[currPageIdx]={score:answerData.score};
	}

	__getset(0,__proto,'remainingTime',function(){
		if (!this.isGdEvaluation)return-1;
		if (!VipThink.config.evaData)return-1
			if (!VipThink.config.evaData.timeLimited)return-1;
		var remainingTime=VipThink.config.evaData.remainingTime;
		return ((typeof remainingTime=='number')? remainingTime :-1);
	});

	// 是否为定级测评
	__getset(0,__proto,'isGdEvaluation',function(){
		return VipThink.config.courseCfg.classify=="gdEvaluation";
	});

	/**
	*获取时间梯度
	*/
	__getset(0,__proto,'timeGradient',function(){
		if (VipThink.currView)
			return VipThink.currView.timeGradient;
		else
		return null;
	});

	/**
	*获取是否隐藏标题栏
	*/
	__getset(0,__proto,'hideTitle',function(){
		return false;
	});

	/**
	*不需要应用端截图
	*/
	__getset(0,__proto,'notNeedToCutScreen',function(){
		var flag=(Browser.onIOS && EvaModel.data.version !=2 && VipThink.cfgCourse.isEvaluation)|| this.releaseDev || this._mode==2;
		return flag;
	});

	/**
	*是否是最后一关
	*/
	__getset(0,__proto,'isLastLevel',function(){
		return VipThink.viewMgr.currPageIdx >=VipThink.viewMgr.mainView.pageCfgList.length-1;
	});

	__getset(0,__proto,'notInterface',function(){
		return false;
	});

	__getset(0,__proto,'isSevaluation',function(){
		return VipThink.config.courseCfg.classify=="sEvaluation";
	});

	/**
	*获取最后一题完成的回调
	*/
	__getset(0,__proto,'lastLevelFinishHandler',function(){
		return null;
	});

	/**
	*获取标题栏的y坐标
	*/
	__getset(0,__proto,'boxTitleY',function(){
		return 0;
	});

	__getset(0,__proto,'timeToExist',function(){
		if (this.isRemainingTimeEnd){
			return 4500;
		}
		return 7500;
	});

	/**
	*是否隐藏辩题栏标题文字背景图
	*/
	__getset(0,__proto,'hideTitleBg',function(){
		return false;
	});

	/**
	*desc:控制界面是否可以操作
	*param:
	*/
	__getset(0,__proto,'canAct',null,function(value){
		this.mouseEnabled=value;
		if (VipThink.currView){
			VipThink.currView.mouseEnabled=value;
		}
	});

	// playDoneSoundAndShowDoneBox();
	__getset(0,__proto,'submitData',function(){
		return {};
	});

	/**
	*显示完成界面并播放完成语音
	*/
	__getset(0,__proto,'showDoneViewAndPlayComplteSound',function(){
		return true;
	});

	__getset(0,__proto,'releaseDev',function(){
		return VipThink.release=="dev" || VipThink.config.courseType==6;
	});

	/**
	*获取结束音效
	*/
	__getset(0,__proto,'completeSound',function(){
		if (this.isRemainingTimeEnd){
			return this.SOUND_COMPLETE_TIMEOUT
		}
		return VipThink.getLanguageSound(this.SOUND_COMPLETE);
	});

	/**
	*获取结束也大标题文字
	*/
	__getset(0,__proto,'donePageTitle',function(){
		return VipThink.getLanguageText(25);
	});

	/**
	*获取结束页描述文字
	*/
	__getset(0,__proto,'donePageDesc',function(){
		return VipThink.getLanguageText(26);
	});

	__getset(0,__proto,'nativeCommandType',function(){
		return 1;
	});

	BaseEvaluationView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":73,"x":93,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1572,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1763,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":25,"x":158,"width":1308,"var":"_img_kuang","skin":"share/ui/bg_white.png","sizeGrid":"25,20,21,28","name":"imgKuang","mouseThrough":true,"height":101,"anchorY":0,"alpha":0.5}},{"type":"Label","props":{"y":43,"x":259.5,"width":95,"var":"_lab_subject","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":95,"name":"_lab_subject","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false,"align":"right"}},{"type":"Label","props":{"y":43,"x":282.5,"wordWrap":true,"width":1140,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":0,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":632,"skin":"share/ui/green_bg.png","sizeGrid":"68,46,67,48","height":376,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":80,"wordWrap":true,"width":572,"var":"tipsLabel","valign":"middle","text":"还没有填写答案哦，确定跳过这一题吗？","leading":10,"height":112,"fontSize":40,"color":"#3cbea9","centerX":0,"anchorX":0.5,"align":"center"}},{"type":"ScaleButton","props":{"y":256,"x":194,"width":220,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/btn_orange_1.png","sizeGrid":"0,37,0,37","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":256,"x":438,"width":220,"var":"_bt_jump","stateNum":1,"skin":"share/ui/btn_green_1.png","sizeGrid":"0,47,0,59","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"跳过","anchorY":0.5,"anchorX":0.5}}]}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":194,"x":607,"skin":"share/ui/bg_done.png","centerY":-117,"centerX":0}},{"type":"Image","props":{"y":638,"x":845,"skin":"share/ui/ip_jingling.png","centerY":215,"centerX":0}},{"type":"Label","props":{"y":350,"x":619,"width":683,"var":"_lab_title_done","text":"祝贺你顺利完成本次测评。","height":52,"fontSize":50,"font":"Arial","color":"#50C5B2","bold":true,"align":"center"}},{"type":"Label","props":{"y":425,"wordWrap":true,"width":619,"var":"_lab_desc_done","text":"跟我一起去查看你的专属测评报告吧！","leading":8,"height":143,"fontSize":32,"color":"#718483","centerX":0,"align":"center"}}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"name":"yanhua","isLoop":"false","currAniName":"yanhua"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"}}]}]};
	BaseEvaluationView.uiView_en={"type":"View","props":{"width":1920,"height":1080},"child":[ {"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[ {"type":"ScaleButton","props":{"y":73,"x":93,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1572,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new_en.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1763,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new_en.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":25,"x":158,"width":1308,"var":"_img_kuang","skin":"share/ui/bg_white.png","sizeGrid":"25,20,21,28","name":"imgKuang","mouseThrough":true,"height":101,"anchorY":0,"alpha":0.5}},{"type":"Label","props":{"y":43,"x":259.5,"width":95,"var":"_lab_subject","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":95,"name":"_lab_subject","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false,"align":"right"}},{"type":"Label","props":{"y":43,"x":282.5,"wordWrap":true,"width":1061,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":0,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[ {"type":"Image","props":{"width":633,"skin":"share/ui/diban.png","sizeGrid":"68,46,67,48","height":437,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Label","props":{"y":99,"wordWrap":true,"width":406,"text":"还没有填写答案哦，确定跳过这一题吗？","leading":12,"height":112,"fontSize":45,"color":"#3cbea9","centerX":9,"anchorX":0.5}}]},{"type":"ScaleButton","props":{"y":618,"width":190,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/bt_yellow.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","height":70,"centerX":-130,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":621,"width":190,"var":"_bt_jump","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"跳过","height":70,"centerX":130,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[ {"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"child":[ {"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"width":727,"skin":"share/ui/evaluation_done.png","height":682,"centerY":0,"centerX":0}},{"type":"Label","props":{"y":364,"x":640,"width":673,"var":"_lab_title_done","text":"祝贺小朋友完成全部内容。","height":52,"fontSize":55,"font":"Arial","color":"#51cfca","bold":true}},{"type":"Label","props":{"y":459,"width":619,"var":"_lab_desc_done","text":"快跟我一起去看你的专属报告吧！","height":67,"fontSize":30,"color":"#718483","centerX":0,"align":"center"}}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"child":[ {"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"name":"yanhua","isLoop":"false","currAniName":"yanhua"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"}}]}]};
	BaseEvaluationView.uiView_new={"type":"View","props":{"width":1275,"height":703},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":93,"x":115,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound_new.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1560,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1784,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":96,"x":818,"width":1213,"var":"_img_kuang","skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"imgKuang","mouseThrough":true,"height":179,"anchorY":0.5,"anchorX":0.5,"alpha":0.5}},{"type":"Label","props":{"y":26,"x":325,"width":94,"var":"_lab_subject","valign":"middle","text":"Q1：","strokeColor":"#ffffff","stroke":5,"name":"_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorX":1,"align":"right"}},{"type":"Label","props":{"y":102,"x":335,"wordWrap":true,"width":1061,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"_lab_desc","mouseThrough":true,"leading":15,"height":0,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorY":0.5,"align":"left"}},{"type":"Label","props":{"y":27,"x":365,"width":150,"visible":false,"var":"ch_lab_subject","valign":"middle","text":"挑战1：","strokeColor":"#ffffff","stroke":5,"name":"ch_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorX":1,"align":"right"}},{"type":"Label","props":{"y":102,"x":375,"wordWrap":true,"width":1020,"visible":false,"var":"ch_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"ch_lab_desc","mouseThrough":true,"leading":15,"height":0,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorY":0.5,"align":"left"}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":632,"skin":"share/ui/green_bg.png","sizeGrid":"68,46,67,48","height":376,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":80,"wordWrap":true,"width":572,"var":"tipsLabel","text":"还没有填写答案哦，确定跳过这一题吗？","leading":10,"height":112,"fontSize":40,"color":"#3cbea9","centerX":0,"anchorX":0.5,"align":"center"}},{"type":"ScaleButton","props":{"y":256,"x":194,"width":220,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/btn_orange_1.png","sizeGrid":"0,47,0,39","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":256,"x":438,"width":220,"var":"_bt_jump","stateNum":1,"skin":"share/ui/btn_green_1.png","sizeGrid":"0,37,0,36","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"跳过","anchorY":0.5,"anchorX":0.5}}]}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"skin":"share/ui/bg_done.png","centerY":-117,"centerX":0}},{"type":"Image","props":{"y":638,"x":845,"skin":"share/ui/ip_jingling.png","centerY":215,"centerX":0}},{"type":"Label","props":{"y":350,"x":616,"wordWrap":true,"width":687,"var":"_lab_title_done","text":"祝贺你顺利完成本次测评。","height":52,"fontSize":50,"font":"Arial","color":"#50C5B2","bold":true,"align":"center"}},{"type":"Label","props":{"y":425,"wordWrap":true,"width":619,"var":"_lab_desc_done","text":"跟我一起去查看你的专属测评报告吧！","padding":"8","height":114,"fontSize":32,"color":"#718483","centerX":0,"align":"center"}}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"preview":false,"name":"yanhua","isLoop":"false","currAniName":"yanhua"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"}}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"error_eff_box","height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":927,"x":964,"width":1797,"skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"error_imgKuang","mouseThrough":true,"height":250,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":934,"x":472,"wordWrap":true,"width":1250,"var":"error_lab_desc","valign":"middle","text":"把带有a的苹果拖动到带有a的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；的苹果拖动到带有o的篮子里；的苹果拖动到带有o的篮子里；","strokeColor":"#ffffff","stroke":5,"name":"error_lab_desc","mouseThrough":true,"leading":15,"height":200,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorY":0.5,"align":"left"}},{"type":"Image","props":{"y":800,"x":463,"width":1250,"var":"error_imgdesc","name":"error_imgdesc","mouseThrough":true,"height":250}},{"type":"SkeletonPlayer","props":{"y":1050,"x":0,"visible":false,"var":"error_sk","url":"share/animation/ch_res/hm_bt.sk","stopAt":1,"preview":true,"name":"error_sk","isLoop":true,"currAniName":"stand"}},{"type":"ScaleButton","props":{"y":788.5,"x":214,"width":414,"var":"_bt_ip","stateNum":1,"skin":"share/ui/ch_bt_xyjoff.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"bt_ip","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":527,"anchorY":0.5,"anchorX":0.5,"alpha":0}},{"type":"ScaleButton","props":{"y":930,"x":1820,"var":"_yc_bt_next","stateNum":1,"skin":"share/ui/ch_bt_xyjoff.png","sizeGrid":"18,21,20,21","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":930,"x":1820,"var":"_bt_next","stateNum":1,"skin":"share/ui/ch_bt_xyjon.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"next","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"visible":false,"var":"sull_eff_box"},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"visible":false,"var":"sull_sk","url":"share/animation/ch_res/begin_yeah.sk","stopAt":0,"preview":false,"name":"sull_sk","isLoop":"false","currAniName":"yeah_1"}},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"visible":false,"var":"sull_sk1","url":"share/animation/ch_res/begin_yeah_6.sk","stopAt":0,"preview":false,"name":"sull_sk1","isLoop":"false","currAniName":"begin"}}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"end_eff_box","height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"var":"end_eff_sk","url":"share/animation/ch_res/end_yeah.sk","stopAt":0,"preview":false,"name":"end_eff_sk","isLoop":"false","currAniName":"begin"}}]}]};
	BaseEvaluationView.uiView_new_en={"type":"View","props":{"width":1275,"height":703},"compId":1,"child":[ {"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"compId":41,"child":[ {"type":"ScaleButton","props":{"y":93,"x":115,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound_new.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5},"compId":6},{"type":"ScaleButton","props":{"y":88,"x":1560,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new_en.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5},"compId":4},{"type":"ScaleButton","props":{"y":88,"x":1784,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new_en.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5},"compId":5},{"type":"Image","props":{"y":96,"x":818,"width":1213,"var":"_img_kuang","skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"imgKuang","mouseThrough":true,"height":179,"anchorY":0.5,"anchorX":0.5,"alpha":0.5},"compId":43},{"type":"Label","props":{"y":26,"x":325,"width":94,"var":"_lab_subject","valign":"middle","text":"Q1：","strokeColor":"#ffffff","stroke":5,"name":"_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorX":1,"align":"right"},"compId":13},{"type":"Label","props":{"y":102,"x":335,"wordWrap":true,"width":1061,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorY":0.5,"align":"left"},"compId":78},{"type":"Label","props":{"y":26,"x":365,"width":150,"visible":false,"var":"ch_lab_subject","valign":"middle","text":"挑战1：","strokeColor":"#ffffff","stroke":5,"name":"ch_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorX":1,"align":"right"},"compId":81},{"type":"Label","props":{"y":102,"x":375,"wordWrap":true,"width":1020,"visible":false,"var":"ch_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"ch_lab_desc","mouseThrough":true,"leading":15,"height":0,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorY":0.5,"align":"left"},"compId":14}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"},"compId":40},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"},"compId":8},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"},"compId":54},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"compId":17,"child":[ {"type":"Image","props":{"width":633,"skin":"share/ui/diban.png","sizeGrid":"68,46,67,48","height":437,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"compId":18,"child":[ {"type":"Label","props":{"y":99,"wordWrap":true,"width":406,"text":"还没有填写答案哦，确定跳过这一题吗？","leading":12,"height":112,"fontSize":45,"color":"#3cbea9","centerX":9,"anchorX":0.5},"compId":20}]},{"type":"ScaleButton","props":{"y":618,"width":190,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/bt_yellow.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","height":70,"centerX":-130,"anchorY":0.5,"anchorX":0.5},"compId":21},{"type":"ScaleButton","props":{"y":621,"width":190,"var":"_bt_jump","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"跳过","height":70,"centerX":130,"anchorY":0.5,"anchorX":0.5},"compId":23}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"compId":31,"child":[ {"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"compId":33,"child":[ {"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"},"compId":32}]},{"type":"Image","props":{"width":727,"skin":"share/ui/evaluation_done.png","height":682,"centerY":0,"centerX":0},"compId":30},{"type":"Label","props":{"y":364,"x":640,"width":673,"var":"_lab_title_done","text":"祝贺你顺利完成本次测评。","height":52,"fontSize":55,"font":"Arial","color":"#51cfca","bold":true},"compId":34},{"type":"Label","props":{"y":459,"width":619,"var":"_lab_desc_done","text":"跟我一起去查看你的专属测评报告吧！","height":67,"fontSize":30,"color":"#718483","centerX":0,"align":"center"},"compId":35}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"compId":44,"child":[ {"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"compId":52,"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"},"compId":53}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"preview":false,"name":"yanhua","isLoop":"false","currAniName":"yanhua"},"compId":51},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"},"compId":50}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"error_eff_box","height":1080},"compId":55,"child":[ {"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"compId":63,"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"},"compId":64}]},{"type":"Image","props":{"y":927,"x":964,"width":1797,"skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"error_imgKuang","mouseThrough":true,"height":250,"anchorY":0.5,"anchorX":0.5},"compId":76},{"type":"Label","props":{"y":934,"x":472,"wordWrap":true,"width":1250,"var":"error_lab_desc","valign":"middle","text":"把带有a的苹果拖动到带有a的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；把带有o的苹果拖动到带有o的篮子里；的苹果拖动到带有o的篮子里；的苹果拖动到带有o的篮子里；","strokeColor":"#ffffff","stroke":5,"name":"error_lab_desc","mouseThrough":true,"leading":15,"height":200,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":true,"anchorY":0.5,"align":"left"},"compId":66},{"type":"Image","props":{"y":800,"x":463,"width":1250,"var":"error_imgdesc","name":"error_imgdesc","mouseThrough":true,"height":250},"compId":80},{"type":"SkeletonPlayer","props":{"y":1050,"x":0,"visible":false,"var":"error_sk","url":"share/animation/ch_res/hm_bt.sk","stopAt":1,"preview":true,"name":"error_sk","isLoop":true,"currAniName":"stand"},"compId":57},{"type":"ScaleButton","props":{"y":788.5,"x":214,"width":414,"var":"_bt_ip","stateNum":1,"skin":"share/ui/ch_bt_xyjoff.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"bt_ip","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":527,"anchorY":0.5,"anchorX":0.5,"alpha":0},"compId":75},{"type":"ScaleButton","props":{"y":930,"x":1820,"var":"_yc_bt_next","stateNum":1,"skin":"share/ui/ch_bt_xyjoff.png","sizeGrid":"18,21,20,21","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5},"compId":71},{"type":"ScaleButton","props":{"y":930,"x":1820,"var":"_bt_next","stateNum":1,"skin":"share/ui/ch_bt_xyjon.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"next","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5},"compId":67}]},{"type":"Box","props":{"visible":false,"var":"sull_eff_box"},"compId":56,"child":[ {"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"compId":61,"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"},"compId":62}]},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"visible":false,"var":"sull_sk","url":"share/animation/ch_res/begin_yeah.sk","stopAt":0,"preview":false,"name":"sull_sk","isLoop":"false","currAniName":"yeah_1"},"compId":58},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"visible":false,"var":"sull_sk1","url":"share/animation/ch_res/begin_yeah_6.sk","stopAt":0,"preview":false,"name":"sull_sk1","isLoop":"false","currAniName":"begin"},"compId":72}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"end_eff_box","height":1080},"compId":68,"child":[ {"type":"Box","props":{"y":0,"x":0,"alpha":0.7},"compId":73,"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"},"compId":74}]},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"var":"end_eff_sk","url":"share/animation/ch_res/end_yeah.sk","stopAt":0,"preview":false,"name":"end_eff_sk","isLoop":"false","currAniName":"begin"},"compId":69}]}],"loadList":["share/ui/bt_sound_new.png","share/ui/bt_xiugai_new_en.png","share/ui/bt_wancheng_new_en.png","share/ui/bt_white_new.png","share/ui/diban.png","share/ui/bt_yellow.png","share/ui/bt1.png","share/ui/evaluation_done.png","share/animation/gdeva/yanhua.sk","share/animation/gdeva/ld.sk","share/animation/ch_res/hm_bt.sk","share/ui/ch_bt_xyjoff.png","share/ui/ch_bt_xyjon.png","share/animation/ch_res/begin_yeah.sk","share/animation/ch_res/begin_yeah_6.sk","share/animation/ch_res/end_yeah.sk"],"loadList3D":[]};
	return BaseEvaluationView;
})(View)


//class com.subject.module.functionshell.BaseExplainLessonView extends laya.ui.View
var BaseExplainLessonView=(function(_super){
	function BaseExplainLessonView(){
		this._btn=null;
		this._sp=null;
		this._reference=null;
		this._hasPrepared=false;
		BaseExplainLessonView.__super.call(this);
		this.mouseThrough=true;
		this._btn=new ScaleButton();
		this.addChild(this._btn);
		this._btn.on("click",this,this.onBtnClick);
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChanged);
		VipThink.viewMgr.on("videoViewCommand",this,this.onVideoCommand);
		VipThink.viewMgr.feedBackView.on("showAnswerFace",this,function(type){
			console.debug("BaseExplainLessonView - showAnswerFace");
			if (type==1){
				VipThink.nativeAPI.nextPage();
			}
		});
	}

	__class(BaseExplainLessonView,'com.subject.module.functionshell.BaseExplainLessonView',_super);
	var __proto=BaseExplainLessonView.prototype;
	__proto.onPageStatusChanged=function(data){
		if (data.status=="loading"){
			this._btn.visible=false;
		}
	}

	__proto.onPrepared=function(data){
		var _$this=this;
		if (this._hasPrepared)
			return;
		Laya.timer.once(200,this,function(){
			_$this._hasPrepared=false;
		});
		this._hasPrepared=true;
		this._btn.skin=this.btnSkin;
		this._btn.pos(this.btnPos[0],this.btnPos[1]);
		this._btn.visible=true;
		var currView=VipThink.viewMgr.currPage.currView;
		if (currView && !currView.isVideoView){
			this.clearVideo();
		}
	}

	/**
	*帮助按钮点击回调
	*/
	__proto.onBtnClick=function(){
		this.sendVideoUrl();
	}

	/**
	*隐藏帮助视频
	*/
	__proto.hideVideo=function(){
		VipThink.nativeAPI.noticeNative({args:{type:"nomal"}});
	}

	__proto.sendVideoUrl=function(){
		this.openVieo(this.explainVideoUrl)
	}

	/**
	*接收应用端发送的视频事件回调
	*/
	__proto.onVideoCommand=function(param){
		var act=param.args.act;
		var isEnd=param.args.isEnd ? true :false;
		var time=param.args.time;
		var currView=VipThink.viewMgr.currPage.currView;
		if (currView && currView.isVideoView){
			if (act=="stop" && isEnd){
				VipThink.nativeAPI.nextPage();
			}
			return;
		}
		if (act=="stop"){
			if (isEnd){
				this.hideVideo();
			}
			else if (time==0){
				Laya.timer.frameOnce(20,this,function(){
					VipThink.nativeAPI.noticeNative({args:{type:"video",data:{act:"start",time:0,isEnd:false}}})
				})
			}
		}
		else if (act=="start" && !isEnd){
		}
	}

	/**
	*打开帮助视频
	*/
	__proto.openVieo=function(url){
		var _$this=this;
		if (!url){
			return;
		}
		KlSoundManager.stopAll();
		if (VipThink.release=="dev" && !VipThink.isAI){
			this.clearVideo();
			this._reference=new Sprite();
			this._sp=new Sprite();
			this._sp.graphics.drawRect(0,0,1920,1080,"#000000","#000000");
			this.addChild(this._sp);
			this._sp.alpha=0.8;
			var videoElement=Browser.createElement("video");
			Browser.document.body.appendChild(videoElement);
			videoElement.style.zInddex=Render.canvas.style.zIndex+1;
			videoElement.style.position='absolute';
			videoElement.src=url;
			videoElement.controls=true;
			this._reference=new Sprite();
			this.addChild(this._reference);
			this._reference.size(1920,1080);
			Laya.stage.on("resize",this,Utils.fitDOMElementInArea,[videoElement,this._reference,0,0,this._reference.width,this._reference.height]);
			videoElement.addEventListener('ended',function(){
				_$this.clearVideo();
			});
		}
		VipThink.nativeAPI.noticeNative({args:{type:"video",data:{act:"videoUrl",url:url}}});
	}

	/**
	*开发模式下：清理video标签
	*/
	__proto.clearVideo=function(){
		if(Browser.document.body && Browser.document.body.children){
			for (var i=0;i < Browser.document.body.children.length;i++){
				if(Browser.document.body.children[i].localName=="video"){
					Browser.document.body.removeChild(Browser.document.body.children[i]);
				}
			}
		}
		Laya.stage.off("resize",this,Utils.fitDOMElementInArea);
		this.graphics.clear();
		if (this._reference){
			this.removeChild(this._reference);
			this._reference=null;
		}
		if (this._sp){
			this.removeChild(this._sp);
			this._sp=null;
		}
	}

	/**
	*获取帮助按钮位置
	*/
	__getset(0,__proto,'btnPos',function(){
		if (!this.levelConfig || !this.levelConfig.explainBtnPos){
			return [1840,80]
		}
		return this.levelConfig.explainBtnPos;
	});

	/**
	*获取本关卡config配置
	*/
	__getset(0,__proto,'levelConfig',function(){
		if (!VipThink.viewMgr.currPage || !VipThink.viewMgr.currPage.currView)
			return null;
		return VipThink.viewMgr.currPage.currView.config.configObj;
	});

	/**
	*获取帮助视频地址
	*/
	__getset(0,__proto,'explainVideoUrl',function(){
		if (!this.levelConfig)
			return null;
		var courseUrl=VipThink.config.courseCfg ? VipThink.config.courseCfg.url :null;
		var videoUrl=this.levelConfig.explainVideoUrl;
		if (!videoUrl){
			return null;
		};
		var url
		if (videoUrl.indexOf("share/animation/")!=-1){
			url=videoUrl;
		}
		else{
			url=courseUrl ? (courseUrl+'/'+videoUrl):videoUrl;
		};
		var versionUrl;
		var fullUrl=URL.formatURL(url);
		if (fullUrl.indexOf("/lessons/")==-1 && fullUrl.indexOf("share/animation")==-1){
			return url;
		}
		else{
			var idx=0;
			if (fullUrl.indexOf("share/animation")!=-1){
				idx=fullUrl.indexOf("/share/animation");
			}
			else{
				idx=fullUrl.indexOf("/lessons/");
			};
			var customUrl=URL.customFormat(url);
			if (customUrl){
				return customUrl;
			}
			else{
				console.error('videoView customUrl is undefined');
				return null;
			}
		}
	});

	/**
	*获取帮助按钮皮肤
	*/
	__getset(0,__proto,'btnSkin',function(){
		if (!this.levelConfig || !this.levelConfig.explainBtnSkin){
			return "share/ui/sbtn_light.png";
		}
		return this.levelConfig.explainBtnSkin;
	});

	return BaseExplainLessonView;
})(View)


//class com.subject.module.functionshell.BaseUpgradeView extends laya.ui.View
var BaseUpgradeView=(function(_super){
	function BaseUpgradeView(){
		this._box_up=null;
		this._bt_sound=null;
		this._bt_redo=null;
		this._bt_ok=null;
		this._img_kuang=null;
		this._lab_subject=null;
		this._lab_desc=null;
		this._label_yinying=null;
		this._lable=null;
		this._box_notice=null;
		this._bt_notjump=null;
		this._bt_jump=null;
		this._box_done=null;
		this._lab_title_done=null;
		this._lab_desc_done=null;
		this._lab_time_count=null;
		this._lab_accuracy_rate=null;
		this._box_score=null;
		this._bt_rank=null;
		this._bt_end=null;
		this._congratulationAni=null;
		this.curview=null;
		this._initLabDescData=null;
		this.TAG=null;
		this.SOUND_JUMP="share/sound/evaluation_jump.wav";
		this.SOUND_COMPLETE="share/sound/evaluation_complete.wav";
		this.SOUND_TIME_OUT="share/sound/timeout_next.wav";
		this.SOUND_TICK="share/sound/rush_tick.wav";
		this.SOUND_FLAG="share/sound/rush_flag.wav";
		this.SOUND_BTN="share/sound/rush_btn.wav";
		/**是否自动播放音效 */
		this.AUTO_PLAY_SOUND=false;
		/**播放语音的时候是否可以操作界面 */
		this.CAN_ACT_WHEN_SOUND_PLAY=true;
		/**是否倒计时 */
		this.COUNT_DOWN=false;
		this._isRedo=false;
		this._costTime=0;
		this.oriTimeColor=null;
		this._mode=1;
		this.timeMinute=0;
		this.timeSecond=0;
		this.resultObj={};
		this.tTime=300;
		this.totalScore=0;
		this.timeData=[]
		this.accuracyData=[0,0];
		this.timeBonusData=[];
		BaseUpgradeView.__super.call(this);
		this._startTs=new Date().getTime();
	}

	__class(BaseUpgradeView,'com.subject.module.functionshell.BaseUpgradeView',_super);
	var __proto=BaseUpgradeView.prototype;
	Laya.imps(__proto,{"com.biz.native.INativeCommandTarget":true})
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		if(this.isEn()){
			this.createView(BaseUpgradeView.uiView_en);
			}else{
			this.createView(BaseUpgradeView.uiView);
		}
		this.mouseThrough=true;
		this._initLabDescData=this.getCompData(this._lab_desc);
		this._bt_ok.on("click",this,this.onClick);
		this._bt_redo.on("click",this,this.onClick);
		this._bt_sound.on("click",this,this.onClick);
		this._bt_notjump.on("click",this,this.onClick);
		this._bt_jump.on("click",this,this.onClick);
		this._bt_end.on("click",this,this.onClick);
		this._bt_rank.on("click",this,this.onClick);
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		VipThink.viewMgr.on("change",this,this.onLevelChange);
		this._label_yinying.visible=false;
		(this._lab_desc.getChildAt(0)).autoSize=true;
		(this._lab_subject.getChildAt(0)).autoSize=true;
		this.firstSetLabel();
		this._mode=(VipThink.config.courseType==100 || (VipThink.nativeAPI instanceof com.biz.native.AndroidNative ))? 2 :1;
		if (this._mode==2){
			this._lab_desc_done.text="";
		};
		var mView=VipThink.viewMgr.mainView;
		this.x=mView.x;
		this.scaleX=mView.scaleX;
		this.scaleY=mView.scaleY;
		VipThink.nativeCommandMgr.regist(this);
		this.initResultBoard();
		this.oriTimeColor=this._lab_time_count.color;
		this.startTimeCount();
		this.accuracyData[1]=VipThink.viewMgr.mainView.pageCfgList.length;
		this.updateAccuracyLab();
	}

	__proto.isEn=function(){
		var courseObj=VipThink.config.courseCfg;
		if (courseObj && courseObj.lang==="en")
			return true;
		else
		return false;
	}

	// 初始化结算面板
	__proto.initResultBoard=function(){
		var resultBox=this._box_score.getChildByName("content");
		for (var i=0;i < resultBox.numChildren;i++){
			var box=resultBox.getChildAt(i);
			box.alpha=0;
			var gou=box.getChildByName("gou");
			gou.alpha=0;
			gou.scale(1.5,1.5);
		}
		this._bt_rank.alpha=this._bt_end.alpha=0;
	}

	// 开始计时
	__proto.startTimeCount=function(){
		console.debug("BaseUpgradeView - startTimeCount - 开始计时");
		this._lab_time_count.color=this.oriTimeColor;
		this.timer.clear(this,this.onTimeCount);
		var t=this.timePerQuestion;
		this.timeMinute=Math.floor(this.timePerQuestion / 60);
		this.timeSecond=this.timePerQuestion % 60;
		this.updateTimeLab();
		this.timerLoop(1000,this,this.onTimeCount);
	}

	// 循环计时
	__proto.onTimeCount=function(){
		this.timeSecond--;
		if(this.timeSecond==-1){
			if(this.timeMinute==0){
				this.timeSecond=0;
				this.timer.clear(this,this.onTimeCount);
				console.debug("BaseUpgradeView - startTimeCount - 计时结束");
				this.onTimeOut();
			}
			else{
				this.timeMinute--;
				this.timeSecond=59;
			}
		}
		this.updateTimeLab();
	}

	// 更新倒计时文字显示
	__proto.updateTimeLab=function(){
		var sStr=String(this.timeSecond);
		sStr=sStr.length !=2 ? "0"+sStr :sStr;
		this._lab_time_count.text="时间："+this.timeMinute+":"+sStr;
		if(this.timeMinute *60+this.timeSecond < 60)
			this._lab_time_count.color="#ff0000";
	}

	__proto.getCompData=function(comp){
		return {
			x:comp.x,
			y:comp.y,
			width:comp.width,
			height:comp.height,
			fontSize:comp.fontSize,
			fontColor:comp.color,
			font:comp.font
		}
	}

	__proto.setCompData=function(comp,data){
		for(var key in data){
			comp[key]=data[key];
		}
		this._lab_subject.fontSize=this._lab_desc.fontSize;
	}

	__proto.firstSetLabel=function(){
		if (VipThink.viewMgr.mainView.currView.status !="prepared"){
			this.frameOnce(1,this,this.firstSetLabel);
			}else {
			this.setLabel();
			this._startTs=new Date().getTime();
			this.autoPlaySound();
		}
	}

	__proto.onLevelChange=function(){
		if (VipThink.currView){
			VipThink.currView.SoundSprite.playSoundOverHander=null;
			VipThink.currView.SoundSprite.completeArgs=null;
		}
	}

	__proto.onPrepared=function(data){
		this.stopSounds();
		if (!this._isRedo)
			this._startTs=new Date().getTime();
		this.setLabel();
		this.autoPlaySound();
		this._isRedo=false;
		this.curview=VipThink.viewMgr.currPage.currView;
	}

	/**
	*自动播放音效
	*/
	__proto.autoPlaySound=function(){
		if (this._isRedo){
			return;
		}
		if (!this.AUTO_PLAY_SOUND){
			return;
		};
		var currView=VipThink.viewMgr.currPage.currView;
		currView.mouseEnabled=this.CAN_ACT_WHEN_SOUND_PLAY;
		this.playSound(currView.sound,this.onAutoPlaySoundCompleted)
	}

	/**
	*自动播放音效结束回调
	*/
	__proto.onAutoPlaySoundCompleted=function(){
		var currView=VipThink.viewMgr.currPage.currView;
		if (!currView)
			return;
		currView.mouseEnabled=true;
		var tg=[this.timePerQuestion];
	}

	__proto.onTimeOut=function(){
		var page=VipThink.viewMgr.currPage.currView;
		console.warn('time out');
		this._box_notice.visible=false;
		page.mouseEnabled=false;
		this.mouseEnabled=false;
		this.canAct=false;
		page.showAnswerFace(page.result==true ? 1 :2,new Handler(this,this.afterJugdeAni,[this.isLastLevel]));
		console.debug("BaseUpgradeView - onTimeOut - 播完反馈动画后截屏");
	}

	// 播放完成动画
	__proto.playCongratulationAni=function(){
		this._box_done.visible=true;
		var page=VipThink.viewMgr.currPage.currView;
		this.canAct=false;
		page.showAnswerFace(1,new Handler(this,this.finishCongratulation));
	}

	__proto.finishCongratulation=function(){
		this._box_done.visible=false;
		console.log("完成挑战赛 ");
		VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"complete",desc:"挑战赛完成"}}});
	}

	// 显示结算界面
	__proto.showResultBoard=function(data){
		this.canAct=true;
		this._bt_redo.mouseEnabled=this._bt_ok.mouseEnabled=false;
		this._box_score.visible=true;
		var resultBox=this._box_score.getChildByName("content");
		this.setResultData(resultBox,data);
		this.showBox(resultBox);
	}

	// 显示结算界面各个条目动画
	__proto.showBox=function(resultBox,idx,isGou){
		var _$this=this;
		(idx===void 0)&& (idx=0);
		if(idx==resultBox.numChildren){
			this.timerOnce(500,this,function(){
				KlSoundManager.playSound(_$this.SOUND_BTN);
				Tween.to(_$this._bt_rank,{alpha:1},_$this.tTime,null);
				Tween.to(_$this._bt_end,{alpha:1},_$this.tTime,null);
			});
			return;
		}
		else{
			var box=resultBox.getChildAt(idx);
			if(isGou){
				var _gou=box.getChildByName("gou");
				if(_gou.skin=="share/ui/yxxj_jsjm_icon_final.png")
					KlSoundManager.playSound(this.SOUND_FLAG);
				else if(_gou.skin=="share/ui/yxxj_jsjm_icon_done.png")
				KlSoundManager.playSound(this.SOUND_TICK);
				Tween.to(_gou,{alpha:1,scaleX:1,scaleY:1},this.tTime,null,new Handler(this,this.showBox,[resultBox,idx+1]));
			}
			else{
				Tween.to(box,{alpha:1},this.tTime,null,new Handler(this,this.showBox,[resultBox,idx,true]));
			}
		}
	}

	/*
	*计算最后需要显示的数据
	*/
	__proto.caluResultData=function(){
		var aBonus=this.accuracyData[0] *this.scorePerQuestion;
		var tBonus=this.getTotalTimeBonus();
		var arBonus=this.accuracyData[0]==this.accuracyData[1] ? this.allRightBonus :0;
		this.totalScore=aBonus+arBonus+tBonus;
		this.resultObj={
			"accuracy" :[this._lab_accuracy_rate.text,aBonus],
			"fullScore" :[arBonus],
			"useTime" :[this.getTotalTime(),tBonus],
			"totalScore" :[this.totalScore]
		}
	}

	__proto.getTotalTime=function(){
		var timePerQuestion=0;
		var t;
		for(var $each_t in this.timeData){
			t=this.timeData[$each_t];
			timePerQuestion+=t;
		};
		var t1=Math.floor(timePerQuestion / 60);
		var t2=String(timePerQuestion % 60);
		t2.length !=2 && (t2="0"+t2)
		return t1+":"+t2;
	}

	__proto.getTotalTimeBonus=function(){
		var timePerQuestionBonus=0;
		var num;
		for(var $each_num in this.timeBonusData){
			num=this.timeBonusData[$each_num];
			timePerQuestionBonus+=num;
		}
		return timePerQuestionBonus;
	}

	/*
	*设置最后需要显示的数据UI
	*/
	__proto.setResultData=function(resultBox,data){
		if(data){
			var answerScore=data.answerScore;
			var accuracyText=answerScore.trueCount+"/"+answerScore.totalCount;
			var rightScore=answerScore.score;
			var fullScore=data.fullScore.score;
			var fullStatus=data.fullScore.status;
			var timeScore=data.timeScore;
			var _totalScore=rightScore+fullScore *fullStatus+timeScore.score;
			this.resultObj={
				"accuracy" :[accuracyText,rightScore],
				"fullScore" :[fullScore],
				"useTime" :[timeScore.timeLong,timeScore.score],
				"totalScore" :[_totalScore]
			}
		}
		for(var k in this.resultObj){
			var box=resultBox.getChildByName(k);
			for (var i=0;i < box.numChildren;i++){
				var f=box.getChildAt(i);
				f.value=this.resultObj[k][i];
			}
			if(box.name=="fullScore"){
				var fc=box.getChildByName("score");
				var coin=box.getChildByName("coin");
				var img_get=box.getChildByName("get");
				var gou=box.getChildByName("gou");
				if(data && data.fullScore){
					fc.value=data.fullScore.score;
					img_get.skin=data.fullScore.status ? "share/ui/yxxj_jsjm_font_yihuode.png" :"share/ui/yxxj_jsjm_font_weihuode.png";
					gou.skin=data.fullScore.status ? "share/ui/yxxj_jsjm_icon_done.png" :"share/ui/yxxj_jsjm_icon_donenone.png"
					coin.skin=data.fullScore.status ? "share/ui/yxxj_jsjm_coin_icon.png" :"share/ui/yxxj_jsjm_coin_icon_none.png";
				}
				else{
					fc.value=String(this.allRightBonus);
					img_get.skin=this.resultObj[k][0] ? "share/ui/yxxj_jsjm_font_yihuode.png" :"share/ui/yxxj_jsjm_font_weihuode.png";
					gou.skin=this.resultObj[k][0] ? "share/ui/yxxj_jsjm_icon_done.png" :"share/ui/yxxj_jsjm_icon_donenone.png"
					coin.skin=this.resultObj[k][0] ? "share/ui/yxxj_jsjm_coin_icon.png" :"share/ui/yxxj_jsjm_coin_icon_none.png";
				}
			}
		}
	}

	__proto.playSound=function(url,complete){
		if (Browser.onIOS){
			var sound=new Sound();
			sound.load(url);
			var t=sound.duration;
			if (!t || t < 0)
				t=1;
			this.timer.once(t,this,complete);
			this.myPlaySound(url);
			}else {
			this.myPlaySound(url,1,Handler.create(this,complete));
		}
	}

	__proto.setLabel=function(){
		var _$this=this;
		this._lab_desc.visible=false;
		this._box_notice.mouseEnabled=true;
		this.setCompData(this._lab_desc,this._initLabDescData);
		var level=VipThink.viewMgr.currPageIdx;
		var len=VipThink.viewMgr.mainView.pageCfgList.length;
		if (VipThink.config.courseIndices && VipThink.config.courseIndices.length > 0){
			var pageConfig=VipThink.config.courseCfg.pages[level];
			level=pageConfig.currentIdx;
			len=pageConfig.totalLen;
			this._lab_accuracy_rate.visible=false;
		}
		this._lab_subject.text=StringUtil.format("{0}{1}{2}","Q",level+1,":");
		this._lable.text=this._label_yinying.text=StringUtil.format("{0}{1}/{2}","题目进度：",level+1,len);
		this._lab_desc.text="";
		var page=VipThink.viewMgr.currPage.currView;
		if (!this._isRedo)
			this.timer.clear(this,this.onTimeOut);
		if (!page){
			return;
		}
		if (this.notInterface){
			console.error(this.TAG,"page",VipThink.viewMgr.currPageIdx+1,"need to impletments the interface");
			return;
		}
		if (page.labDesc){
			page.labDesc.apply(page,[this._lab_desc]);
			this._lab_subject.fontSize=this._lab_desc.fontSize;
		}
		this._box_up.y=page.boxTitleY ? page.boxTitleY :0;
		this._box_up.y=this._box_up.y *VipThink.viewMgr.mainView.scaleY+VipThink.viewMgr.mainView.y
		this._img_kuang.visible=!(page.hideTitleBg);
		this._img_kuang.alpha=0.7;
		this._lab_desc.stroke=6;
		this._lab_subject.stroke=6;
		this._lab_subject.visible=this._lab_desc.visible=!(page.hideTitle);
		this._lab_desc.text=page.desc;
		this._box_notice.visible=false;
		this._box_notice.mouseEnabled=true;
		this._box_done.visible=false;
		this._lab_desc.visible=true;
		this._lab_desc.text=this._lab_desc.text;
		this.canAct=true;
		this.frameOnce(1,this,function(){
			_$this.refreshLabSubject();
		})
	}

	__proto.refreshLabSubject=function(){
		var _$this=this;
		this._lab_subject.y=this._bt_sound.y-this._lab_subject.height/2+15;
		this._lab_desc.y=this._lab_subject.y;
		this.frameOnce(1,this,function(){
			_$this._img_kuang.height=(_$this._lab_desc.getChildAt(0)).textHeight+(_$this._lab_subject.y-_$this._img_kuang.y)*2-15;
		})
	}

	/**
	*收到应用事件做的处理
	*/
	__proto.command=function(param){
		if (param.args.act=='cutScreenDone'){
			var page=VipThink.viewMgr.currPage.currView;
			if (!page){
				console.error("BaseEvaluationView,command,page is undefined!");
				return;
			};
			var state=param.args.state;
			if (state==0 || state==null || state==undefined){
				console.warn(this.TAG,"function command receive state is "+state);
				if (!EvaModel.data.submitAnswerAPI){
					console.warn(this.name,"submitAnswerAPI is undefined");
					console.debug(this.name,"submitAnswerAPI is undefined");
					return;
				}
				this.submit(page);
				}else {
				this.submit(page,false);
				if (state==1){
					this.onSubmitResult(page,{result:"complete"});
					}else if (state==2){
					this.onSubmitResult(page,{result:"error"});
				}
			}
		}
	}

	/**
	*播放结束语音并通知本地端显示结束界面
	*/
	__proto.playDoneSoundAndShowDoneBox=function(){
		var _$this=this;
		if (this.isLastLevel){
			if (this._mode==2){
				this.finish();
				return;
			}
			if (this.lastLevelFinishHandler){
				this.timer.once(2000,this,function(){
					_$this.lastLevelFinishHandler.run();
					_$this.finish();
				});
				}else {
				this.finish();
			}
			}else {
			VipThink.viewMgr.currPageIdx++;
			console.debug("BaseUpgradeView - playDoneSoundAndShowDoneBox - 跳到第下一关");
			this.startTimeCount();
		}
	}

	__proto.finish=function(){
		console.debug("BaseUpgradeView - finish - 课件完成");
		this.canAct=false;
		this.timer.clear(this,this.onTimeCount);
		if(VipThink.config.courseIndices && VipThink.config.courseIndices.length > 0)
			this.playCongratulationAni();
		else{
			VipThink.viewMgr.once("showUpgradeResult",this,this.showResultBoard);
			VipThink.nativeAPI.getUpgradeResultData({type:this.name,data:{}});
		}
		console.log(this.TAG,"complete");
	}

	__proto.labDesc=function(lab){
		lab.width=1500;
	}

	__proto.onClick=function(evt){
		var page=VipThink.viewMgr.currPage.currView;
		if (!page)
			return;
		switch(evt.target){
			case this._bt_ok:{
					console.debug("BaseUpgradeView - onClick - 点击完成");
					this._box_notice.visible=false;
					var len=VipThink.viewMgr.mainView.pageCfgList.length;
					if (this.notInterface){
						console.error(this.TAG,"page",VipThink.viewMgr.currPageIdx+1,"need to impletments the interface");
						return;
					};
					var r=page.result;
					if (!(r==false || r==true)&& this._mode==1){
						this._box_notice.visible=true;
						this._box_notice.mouseEnabled=true;
						this.myPlaySound(VipThink.getLanguageSound(this.SOUND_JUMP));
						return;
					}
					this.stopTimeCount();
					this.canAct=false;
					page.showAnswerFace(r==true ? 1 :2,new Handler(this,this.afterJugdeAni,[this.isLastLevel]));
					console.debug("BaseUpgradeView - onTimeOut - 播完反馈动画后截屏");
					break ;
				}
			case this._bt_redo:{
					console.debug("BaseUpgradeView - onClick - 点击修改");
					page.result=null;
					this._isRedo=true;
					VipThink.viewMgr.reset(true);
					break ;
				}
			case this._bt_sound:{
					this.stopSounds();
					this.myPlaySound(page.sound);
					break ;
				}
			case this._bt_jump:{
					console.debug("BaseUpgradeView - onClick - 点击跳过");
					this._box_notice.mouseEnabled=false;
					this._box_notice.visible=false;
					this.stopSounds();
					this.stopTimeCount();
					this.canAct=false;
					page.showAnswerFace(r==true ? 1 :2,new Handler(this,this.afterJugdeAni,[this.isLastLevel]));
					console.debug("BaseUpgradeView - onTimeOut - 播完反馈动画后截屏");
					break ;
				}
			case this._bt_notjump:{
					console.debug("BaseUpgradeView - onClick - 点击不跳过");
					this._box_notice.visible=false;
					this.stopSounds();
					break ;
				}
			case this._bt_rank:{
					console.debug("BaseUpgradeView - onClick - 点击排行榜");
					console.log("跳到排行榜");
					VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"ranking",desc:"跳转排行榜"}}});
					break ;
				}
			case this._bt_end:{
					console.debug("BaseUpgradeView - onClick - 点击完成");
					console.log("挑战赛完成 ");
					VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"complete",desc:"挑战赛完成"}}});
					break ;
				}
			}
	}

	__proto.stopTimeCount=function(){
		this.timer.clear(this,this.onTimeOut);
		this.timer.clear(this,this.onTimeCount);
	}

	__proto.afterJugdeAni=function(isLastLevel){
		this.frameOnce(3,this,this.cutScreen);
	}

	__proto.stopSounds=function(){
		Browser.onIOS && this.timer.clear(this,this.onAutoPlaySoundCompleted);
		KlSoundManager.stopAll();
		SoundManager.stopAll();
	}

	/**
	*截屏
	*/
	__proto.cutScreen=function(){
		var page=VipThink.viewMgr.currPage.currView;
		page && this.updateResultData(page.result);
		var costTime=this.timePerQuestion-(this.timeMinute *60+this.timeSecond);
		this._costTime=costTime;
		if(this.isLastLevel)
			this.caluResultData();
		if (this.notNeedToCutScreen){
			this.submit(page);
			}else {
			this.canAct=false;
			var currPageIdx=VipThink.viewMgr.currPageIdx+1;
			var sd=this.submitData;
			if (!sd || ObjUtil.isEmptyObj(sd)){
				Reporter.reportData(2,this.TAG+"submiteData is null or empty; courseID:"+VipThink.courseID+"; pageIndex:"+currPageIdx,null,{logger:console.error });
				return;
			}
			if (sd.timeLong==0){
				sd.timeLong=1;
			};
			var data=this.copyObj(sd);
			console.debug(this.TAG+" submit data to native： "+data && JSON.stringify(data));
			var reportData;
			if (this.TAG=="HomeWorkOnlineView"){
				reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6},{7},{8}]",this.TAG,VipThink.courseID,data.onlineWorkId,data.userId,data.liveId,data.type,data.level,data.status,data.time);
				}else {
				reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6}]",this.TAG,VipThink.courseID,data.evaId,data.userId,data.questionIndex,data.timeLong,data.answer);
			}
			Reporter.reportData(1,reportData);
			VipThink.nativeAPI.captureScreen("evaluation/"+currPageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data}});
		}
	}

	/*
	*更新记录 准确率、时间积分
	*/
	__proto.updateResultData=function(curPageIsTrue){
		var v=VipThink.viewMgr.currPage.currView;
		v && v.result && (this.accuracyData[0]++);
		this.updateAccuracyLab();
		if(curPageIsTrue)
			this.timeBonusData.push(this.getCurPageTimeBonus());
		else
		this.timeBonusData.push(0);
		var time=this.timePerQuestion-(this.timeMinute *60+this.timeSecond);
		this.timeData.push(time);
	}

	__proto.getCurPageTimeBonus=function(){
		var g=this.timeBonusPerQuestionGradient;
		var costTime=this.timePerQuestion-(this.timeMinute *60+this.timeSecond);
		this._costTime=costTime;
		for (var i=g.length-1;i >=0;i--){
			if(costTime >=g[i][0]){
				console.log("本题时间积分为："+g[i][1])
				return g[i][1];
			}
		}
		return 0;
	}

	__proto.updateAccuracyLab=function(){
		this._lab_accuracy_rate.text=this.accuracyData[0]+"/"+this.accuracyData[1];
	}

	/**
	*提交
	*/
	__proto.submit=function(v,needToSubmit){
		var _$this=this;
		(needToSubmit===void 0)&& (needToSubmit=true);
		if (!v)
			return;
		if (this._mode==2){
			if (v.result){
				this.canAct=false;
				v.showAnswerFace(1);
				Laya.timer.once(2000,this,function(){
					console.debug("BaseUpgradeView - submit - 正确，跳到下一关");
					_$this.nextLevel(v);
				});
				}else {
				this.canAct=false;
				v.showAnswerFace(2);
				Laya.timer.once(2000,this,function(){
					console.debug("BaseUpgradeView - submit - 错误，跳到下一关");
					_$this._bt_ok.mouseEnabled=true;
				});
			}
			return;
		}
		if (!this.releaseDev){
			if (VipThink.cfgCourse.isEvaluation && !EvaModel.data.submitAnswerAPI){
				return;
			}
		};
		var str='错误';
		if (v){
			if (v.result==true || v.result==1){
				str='正确';
				}else if (v.result==false || v.result==0){
				str='错误';
				}else if (v.result==null){
				str='跳过';
			}
			this.myConsole("【本题提交答案】："+str);
		}
		if (this.releaseDev){
			this.myConsole("【本题提交答案】："+str);
			console.debug("BaseUpgradeView - submit - 跳到下一关");
			this.nextLevel(v);
			return;
		}
		if (needToSubmit){
			this.canAct=false;
			this.doTrans(v);
		}
	}

	// todo:提交成功后，将当前题目的result设为null
	__proto.doTrans=function(v){
		var d=this.copyObj(this.submitData)
		TransManager.doTrans("sendEvaluationResult",[this.onSubmitResult,this,v],[d]);
		VipThink.viewMgr.toast("SUBMITING",this.TAG,"info",0,true);
	}

	/**提交结果 */
	__proto.onSubmitResult=function(evaView,data){
		if (data){
			if (data.result=="complete"){
				this.myConsole("【本题提交答案成功】");
				console.debug("BaseUpgradeView - onSubmitResult - 本题提交答案成功，跳到下一关");
				this.nextLevel(evaView)
				}else if (data.result=="error"){
				this.myConsole("【本题提交答案失败】");
				console.debug("BaseUpgradeView - onSubmitResult - 本题提交答案失败，有返回数据");
				this.canAct=true;
				VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
			}
			}else {
			this.myConsole("【本题提交答案失败】");
			console.debug("BaseUpgradeView - onSubmitResult - 本题提交答案失败，无返回数据");
			this.canAct=true;
			VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
		}
	}

	__proto.myConsole=function(str){
		console.debug("-------------------------");
		console.debug("【本题题号】：第 "+(VipThink.viewMgr.currPageIdx+1)+" 关");
		console.debug(str);
		console.debug("-------------------------");
		if (VipThink.config.courseType==6){
			VipThink.viewMgr.toast(str,this.TAG,"info",3000);
		}
	}

	__proto.nextLevel=function(evaView){
		VipThink.viewMgr.hideToast(this.TAG);
		evaView.result=null;
		this.playDoneSoundAndShowDoneBox();
	}

	__proto.copyObj=function(value){
		if (!value || (typeof value=='string'))
			return value;
		return JSON.parse(JSON.stringify(value));
	}

	/**
	*播放音效
	*/
	__proto.myPlaySound=function(url,loops,complete,soundClass,startTime,type){
		(loops===void 0)&& (loops=1);
		(startTime===void 0)&& (startTime=0);
		if (VipThink.currView){
			VipThink.currView.playSound(url,loops,soundClass,startTime,type,complete);
			}else {
			KlSoundManager.playSound(url,loops,complete,soundClass,startTime,type);
		}
	}

	/**
	*获取标题栏的y坐标
	*/
	__getset(0,__proto,'boxTitleY',function(){
		return 0;
	});

	/**
	*获取时间梯度
	*/
	__getset(0,__proto,'timePerQuestion',function(){
		return 180;
	});

	/**
	*获取最后一题完成的回调
	*/
	__getset(0,__proto,'lastLevelFinishHandler',function(){
		return null;
	});

	/*
	*根据所用时间（剩余时间）计算时间奖励
	*/
	__getset(0,__proto,'timeBonusPerQuestionGradient',function(){
		return [
		[0,10],[11,8],[21,5],[31,4],[41,3],[61,2],[121,1]]
	});

	__getset(0,__proto,'isSevaluation',function(){
		return VipThink.config.courseCfg.classify=="sEvaluation";
	});

	/*
	*无法预测以后每题的分值设置模式
	*/
	__getset(0,__proto,'scorePerQuestion',function(){
		return 10;
	});

	/**
	*不需要应用端截图
	*/
	__getset(0,__proto,'notNeedToCutScreen',function(){
		var flag=(Browser.onIOS && EvaModel.data.version !=2 && VipThink.cfgCourse.isEvaluation)|| this.releaseDev || this._mode==2;
		return flag;
	});

	/**
	*是否是最后一关
	*/
	__getset(0,__proto,'isLastLevel',function(){
		return VipThink.viewMgr.currPageIdx >=VipThink.viewMgr.mainView.pageCfgList.length-1;
	});

	__getset(0,__proto,'notInterface',function(){
		return false;
	});

	__getset(0,__proto,'allRightBonus',function(){
		return 20;
	});

	/**
	*获取是否隐藏标题栏
	*/
	__getset(0,__proto,'hideTitle',function(){
		return false;
	});

	__getset(0,__proto,'timeToExist',function(){
		return 4000;
	});

	/**
	*是否隐藏辩题栏标题文字背景图
	*/
	__getset(0,__proto,'hideTitleBg',function(){
		return false;
	});

	/**
	*desc:控制界面是否可以操作
	*param:
	*/
	__getset(0,__proto,'canAct',null,function(value){
		this.mouseEnabled=value;
		if (VipThink.viewMgr && VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
			VipThink.viewMgr.currPage.currView.mouseEnabled=value;
		}
	});

	__getset(0,__proto,'submitData',function(){
		return {};
	});

	/**
	*显示完成界面并播放完成语音
	*/
	__getset(0,__proto,'showDoneViewAndPlayComplteSound',function(){
		return true;
	});

	__getset(0,__proto,'releaseDev',function(){
		return VipThink.release=="dev" || VipThink.config.courseType==6;
	});

	/**
	*获取结束音效
	*/
	__getset(0,__proto,'completeSound',function(){
		return VipThink.getLanguageSound(this.SOUND_COMPLETE);
	});

	/**
	*获取结束页的标题文字
	*/
	__getset(0,__proto,'donePageTitle',function(){
		return "祝贺你顺利完成本次测评。";
	});

	/**
	*获取结束页描述文字
	*/
	__getset(0,__proto,'donePageDesc',function(){
		return "跟我一起去查看你的专属测评报告吧！";
	});

	__getset(0,__proto,'nativeCommandType',function(){
		return 1;
	});

	BaseUpgradeView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":73,"x":93,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1572,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1763,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":25,"x":158,"width":1308,"var":"_img_kuang","skin":"share/ui/bg_white.png","sizeGrid":"25,20,21,28","name":"imgKuang","mouseThrough":true,"height":101,"anchorY":0,"alpha":0.5}},{"type":"Label","props":{"y":43,"x":259.5,"width":95,"var":"_lab_subject","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":95,"name":"_lab_subject","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false,"align":"right"}},{"type":"Label","props":{"y":43,"x":282.5,"wordWrap":true,"width":1140,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":0,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":633,"skin":"share/ui/diban.png","sizeGrid":"68,46,67,48","height":437,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":87,"wordWrap":true,"width":517,"text":"还没有填写答案哦，确定跳过这一题吗？将会判断为答题错误哦！","leading":12,"height":112,"fontSize":45,"color":"#3cbea9","centerX":5,"anchorX":0.5}}]},{"type":"ScaleButton","props":{"y":642,"width":190,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/bt_yellow.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","height":70,"centerX":-129,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":645,"width":190,"var":"_bt_jump","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"跳过","height":70,"centerX":131,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"y":0,"x":-1,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":254,"x":763,"width":390,"skin":"share/ui/yxxj_jsjm_title.png","sizeGrid":"0,85,0,81","height":119},"child":[{"type":"Image","props":{"y":29,"x":147,"width":196,"skin":"share/ui/yxxj_jsjm_title_font.png","height":53}},{"type":"Image","props":{"y":30,"x":50,"width":102,"skin":"share/ui/yxxj_jsjm_font_gxwctz.png","height":53}}]}]},{"type":"Label","props":{"y":1028,"x":154,"width":217,"var":"_lab_time_count","text":"时间：","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1029,"x":934,"width":291,"text":"正确率：","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1031,"x":1146,"width":109,"var":"_lab_accuracy_rate","text":"0/0","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1599,"visible":false,"var":"_box_score","height":778},"child":[{"type":"Sprite","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0},"child":[{"type":"Image","props":{"y":196,"x":434,"width":1040,"skin":"share/ui/yxxj_phb_board_h.png","sizeGrid":"60,58,51,53","height":720}},{"type":"Image","props":{"y":182,"x":438,"width":364,"skin":"share/ui/yxxj_phb_board_jiazi.png","sizeGrid":"0,27,0,117","scaleY":2.8,"scaleX":2.8,"height":255}},{"type":"Image","props":{"y":169,"x":800,"width":309,"skin":"share/ui/yxxj_jsjm_title.png","sizeGrid":"0,85,0,81","height":119}},{"type":"Image","props":{"y":196,"x":860,"width":196,"skin":"share/ui/yxxj_jsjm_title_font.png","height":53}},{"type":"Image","props":{"y":295,"x":527,"width":843,"skin":"share/ui/yxxj_jsjm_t01.png","sizeGrid":"43,39,41,40","height":443}},{"type":"Image","props":{"y":315,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":417,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":620,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":518,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}}]},{"type":"Box","props":{"y":0,"x":0,"name":"content"},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1030,"visible":true,"name":"accuracy","height":532,"alpha":1},"child":[{"type":"FontClip","props":{"y":354,"x":740,"value":"0/0","skin":"share/ui/yxxj_phb_font_sz_l.png","sheet":"1234567890/:p"}},{"type":"FontClip","props":{"y":364,"x":1162,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":351,"x":648,"skin":"share/ui/yxxj_jsjm_font_zhengque.png"}},{"type":"Image","props":{"y":351,"x":996,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":342,"x":1083,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":364,"x":1227,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":10,"x":10,"width":1446,"visible":true,"name":"fullScore","height":612,"alpha":1},"child":[{"type":"FontClip","props":{"y":454,"x":1152,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","name":"score","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":441,"x":635,"skin":"share/ui/yxxj_jsjm_font_huodemanfen.png"}},{"type":"Image","props":{"y":441,"x":986,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":432,"x":1073,"skin":"share/ui/yxxj_jsjm_coin_icon.png","name":"coin"}},{"type":"Image","props":{"y":440,"x":785,"skin":"share/ui/yxxj_jsjm_font_yihuode.png","name":"get"}},{"type":"Image","props":{"y":454,"x":1217,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":20,"x":20,"width":1579,"visible":true,"name":"useTime","height":622,"alpha":1},"child":[{"type":"FontClip","props":{"y":537,"x":829,"value":"0:0","skin":"share/ui/yxxj_phb_font_sz_l.png","sheet":"1234567890/:p"}},{"type":"FontClip","props":{"y":546,"x":1142,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":534,"x":621,"skin":"share/ui/yxxj_jsjm_font_zqdths.png"}},{"type":"Image","props":{"y":534,"x":976,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":522,"x":1063,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":545,"x":1207,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":30,"x":30,"width":1446,"visible":true,"name":"totalScore","height":612,"alpha":1},"child":[{"type":"FontClip","props":{"y":634,"x":1131,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":624,"x":608,"skin":"share/ui/yxxj_jsjm_font_zongji.png"}},{"type":"Image","props":{"y":621,"x":966,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":612,"x":1053,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":636,"x":1196,"skin":"share/ui/yxxj_jsjm_icon_final.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]}]},{"type":"ScaleButton","props":{"y":811,"x":625,"width":255,"visible":true,"var":"_bt_rank","stateNum":1,"skin":"share/ui/yxxj_jsdr_nd2.png","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":125,"anchorY":0.5,"anchorX":0.5,"alpha":1},"child":[{"type":"Image","props":{"y":37,"x":63,"skin":"share/ui/yxxj_jsjm_font_paihangbang.png"}}]},{"type":"ScaleButton","props":{"y":810,"x":1272,"width":255,"visible":true,"var":"_bt_end","stateNum":1,"skin":"share/ui/yxxj_jsdr_nd5.png","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":125,"anchorY":0.5,"anchorX":0.5,"alpha":1},"child":[{"type":"Image","props":{"y":37,"x":84,"skin":"share/ui/yxxj_jsjm_font_queding.png"}}]}]}]};
	BaseUpgradeView.uiView_en={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":73,"x":93,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1572,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new_en.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":73,"x":1763,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new_en.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":25,"x":158,"width":1308,"var":"_img_kuang","skin":"share/ui/bg_white.png","sizeGrid":"25,20,21,28","name":"imgKuang","mouseThrough":true,"height":101,"anchorY":0,"alpha":0.5}},{"type":"Label","props":{"y":43,"x":259.5,"width":95,"var":"_lab_subject","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":95,"name":"_lab_subject","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false,"align":"right"}},{"type":"Label","props":{"y":43,"x":282.5,"wordWrap":true,"width":1140,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"pivotY":0,"pivotX":0,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":50,"font":"Microsoft YaHei","color":"#474545","bold":false}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":633,"skin":"share/ui/diban.png","sizeGrid":"68,46,67,48","height":437,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":87,"wordWrap":true,"width":517,"text":"还没有填写答案哦，确定跳过这一题吗？将会判断为答题错误哦！","leading":12,"height":112,"fontSize":45,"color":"#3cbea9","centerX":5,"anchorX":0.5}}]},{"type":"ScaleButton","props":{"y":642,"width":190,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/bt_yellow.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"不跳过","height":70,"centerX":-129,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":645,"width":190,"var":"_bt_jump","stateNum":1,"skin":"share/ui/bt1.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"跳过","height":70,"centerX":131,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"y":0,"x":-1,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":254,"x":763,"width":390,"skin":"share/ui/yxxj_jsjm_title.png","sizeGrid":"0,85,0,81","height":119},"child":[{"type":"Image","props":{"y":29,"x":147,"width":196,"skin":"share/ui/yxxj_jsjm_title_font.png","height":53}},{"type":"Image","props":{"y":30,"x":50,"width":102,"skin":"share/ui/yxxj_jsjm_font_gxwctz.png","height":53}}]}]},{"type":"Label","props":{"y":1028,"x":154,"width":217,"var":"_lab_time_count","text":"时间：","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1029,"x":934,"width":291,"text":"正确率：","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1031,"x":1146,"width":109,"var":"_lab_accuracy_rate","text":"0/0","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1599,"visible":false,"var":"_box_score","height":778},"child":[{"type":"Sprite","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0},"child":[{"type":"Image","props":{"y":196,"x":434,"width":1040,"skin":"share/ui/yxxj_phb_board_h.png","sizeGrid":"60,58,51,53","height":720}},{"type":"Image","props":{"y":182,"x":438,"width":364,"skin":"share/ui/yxxj_phb_board_jiazi.png","sizeGrid":"0,27,0,117","scaleY":2.8,"scaleX":2.8,"height":255}},{"type":"Image","props":{"y":169,"x":800,"width":309,"skin":"share/ui/yxxj_jsjm_title.png","sizeGrid":"0,85,0,81","height":119}},{"type":"Image","props":{"y":196,"x":860,"width":196,"skin":"share/ui/yxxj_jsjm_title_font.png","height":53}},{"type":"Image","props":{"y":295,"x":527,"width":843,"skin":"share/ui/yxxj_jsjm_t01.png","sizeGrid":"43,39,41,40","height":443}},{"type":"Image","props":{"y":315,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":417,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":620,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}},{"type":"Image","props":{"y":518,"x":602,"width":697,"skin":"share/ui/yxxj_jsjm_t02.png","sizeGrid":"42,41,45,49","height":96}}]},{"type":"Box","props":{"y":0,"x":0,"name":"content"},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1030,"visible":true,"name":"accuracy","height":532,"alpha":1},"child":[{"type":"FontClip","props":{"y":354,"x":740,"value":"0/0","skin":"share/ui/yxxj_phb_font_sz_l.png","sheet":"1234567890/:p"}},{"type":"FontClip","props":{"y":364,"x":1162,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":351,"x":648,"skin":"share/ui/yxxj_jsjm_font_zhengque.png"}},{"type":"Image","props":{"y":351,"x":996,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":342,"x":1083,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":364,"x":1227,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":10,"x":10,"width":1446,"visible":true,"name":"fullScore","height":612,"alpha":1},"child":[{"type":"FontClip","props":{"y":454,"x":1152,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","name":"score","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":441,"x":635,"skin":"share/ui/yxxj_jsjm_font_huodemanfen.png"}},{"type":"Image","props":{"y":441,"x":986,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":432,"x":1073,"skin":"share/ui/yxxj_jsjm_coin_icon.png","name":"coin"}},{"type":"Image","props":{"y":440,"x":785,"skin":"share/ui/yxxj_jsjm_font_yihuode.png","name":"get"}},{"type":"Image","props":{"y":454,"x":1217,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":20,"x":20,"width":1579,"visible":true,"name":"useTime","height":622,"alpha":1},"child":[{"type":"FontClip","props":{"y":537,"x":829,"value":"0:0","skin":"share/ui/yxxj_phb_font_sz_l.png","sheet":"1234567890/:p"}},{"type":"FontClip","props":{"y":546,"x":1142,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":534,"x":621,"skin":"share/ui/yxxj_jsjm_font_zqdths.png"}},{"type":"Image","props":{"y":534,"x":976,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":522,"x":1063,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":545,"x":1207,"skin":"share/ui/yxxj_jsjm_icon_done.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]},{"type":"Box","props":{"y":30,"x":30,"width":1446,"visible":true,"name":"totalScore","height":612,"alpha":1},"child":[{"type":"FontClip","props":{"y":634,"x":1131,"value":"0","skin":"share/ui/yxxj_phb_font_sz_h.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":624,"x":608,"skin":"share/ui/yxxj_jsjm_font_zongji.png"}},{"type":"Image","props":{"y":621,"x":966,"skin":"share/ui/yxxj_jsjm_font_huode.png"}},{"type":"Image","props":{"y":612,"x":1053,"skin":"share/ui/yxxj_jsjm_coin_icon.png"}},{"type":"Image","props":{"y":636,"x":1196,"skin":"share/ui/yxxj_jsjm_icon_final.png","name":"gou","anchorY":0.5,"anchorX":0.5}}]}]},{"type":"ScaleButton","props":{"y":811,"x":625,"width":255,"visible":true,"var":"_bt_rank","stateNum":1,"skin":"share/ui/yxxj_jsdr_nd2.png","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":125,"anchorY":0.5,"anchorX":0.5,"alpha":1},"child":[{"type":"Image","props":{"y":37,"x":63,"skin":"share/ui/yxxj_jsjm_font_paihangbang.png"}}]},{"type":"ScaleButton","props":{"y":810,"x":1272,"width":255,"visible":true,"var":"_bt_end","stateNum":1,"skin":"share/ui/yxxj_jsdr_nd5.png","showInStu":true,"labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"height":125,"anchorY":0.5,"anchorX":0.5,"alpha":1},"child":[{"type":"Image","props":{"y":37,"x":84,"skin":"share/ui/yxxj_jsjm_font_queding.png"}}]}]}]};
	return BaseUpgradeView;
})(View)


/**
*Author:Jonny
*阶段测评界面
*/
//class com.subject.module.functionshell.ExamView extends laya.ui.View
var ExamView=(function(_super){
	function ExamView(){
		this.TAG="ExamView";
		/**开始时间 */
		this._startTs=0;
		/**对错 */
		this._result=false;
		this._time=0;
		this._isNew=true;
		this._currView=null;
		this._btnInitData={};
		this._ske=null;
		this._heads=[];
		this._bt_submit=null;
		// }
		this._usProps=null;
		this._isPlay=false;
		this._examViewParam={};
		ExamView.__super.call(this);
		this.mouseThrough=true;
	}

	__class(ExamView,'com.subject.module.functionshell.ExamView',_super);
	var __proto=ExamView.prototype;
	Laya.imps(__proto,{"com.subject.module.functionshell.IFunctionView":true})
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(ExamView.uiView);
		VipThink.viewMgr.on("change",this,this.onLevelChange);
		VipThink.viewMgr.on("changed",this,this.onLevelChanged);
		VipThink.viewMgr.feedBackView.on("showReceiveStarsView",this,this.onLessonEnd);
		GlobalModel.instance.on("changed",this,this.onGlobalChanged);
		this._bt_submit.on("click",this,this.onClick);
		this._btnInitData={skin:this._bt_submit.skin,x:this._bt_submit.x,y:this._bt_submit.y,sizeGrid:this._bt_submit.sizeGrid,width:this._bt_submit.width,heigth:this._bt_submit.height,label:this._bt_submit.label};
		this.firstInitInterface();
		this.createSke();
	}

	//
	__proto.firstInitInterface=function(){
		if(!VipThink.viewMgr || !VipThink.viewMgr.currPage || !VipThink.viewMgr.currPage.currView){
			this.frameOnce(1,this,this.firstInitInterface);
			}else{
			if(Laya.__typeof(VipThink.viewMgr.currPage.currView,'com.biz.ui.IExam')){
				this._currView=VipThink.viewMgr.currPage.currView;
				this.initInterface();
			}
		}
	}

	__proto.onComplete=function(temp){
		this._ske=new Skeleton(temp,Klzz.aniMode);
		this._ske.visible=false;
		this._ske.on("label",this,this.onLabel);
		this._ske.pos(960,540);
		this._ske.scale(2,2);
		this.addChild(this._ske);
	}

	__proto.onLabel=function(evt){
		if(!evt || !evt.name)
			return;
		if(evt.name.indexOf("exam")==-1)
			return;
		var sound="share/sound/"+evt.name+".wav";
		KlSoundManager.playSound(sound);
	}

	__proto.actAni=function(act,r){
		(r===void 0)&& (r=-1);
		if(!this._ske){
			this.frameOnce(1,this,this.actAni,[act,r]);
			}else{
			if(act=="play"){
				var ran=r==-1 ? Math.ceil(Math.random()*4):r;
				var skeName="examA1_"+ran;
				this._ske.play(skeName,false);
				this._ske.visible=true;
				}else if(act=="hide"){
				this._ske.stop();
				this._ske.visible=false;
				KlSoundManager.stopAllSound();
			}
		}
	}

	__proto.initBtnSubmit=function(){
		for (var key in this._btnInitData){
			var value=this._btnInitData[key];
			this._bt_submit[key]=value;
		}
	}

	__proto.onClick=function(evt){
		if(!this._currView)
			return;
		(this._currView).mouseEnabled=false;
		this._bt_submit.visible=false;
		this.play=true;
		this.submit();
	}

	__proto.onSub=function(){
		if(!GlobalModel.isRoomOwner)
			this.onClick({target:this._bt_submit});
	}

	__proto.onLevelChanged=function(){
		var _$this=this;
		this._currView=VipThink.viewMgr.currPage.currView;
		if(!this._currView){
			this.frameOnce(1,this,function(){
				_$this.onLevelChanged();
			})
			}else{
			(this._currView).on("changed",this,this.onChanged);
		}
	}

	__proto.onChanged=function(data){
		if(data.status=="prepared"){
			(this._currView).off("changed",this,this.onChanged);
			if(this._isNew){
				this._isNew=false;
			}
			this.initInterface();
			if(!GlobalModel.isRoomOwner)
				(this._currView).mouseEnabled=true;
			this.actAni("hide");
		}
	}

	__proto.createSke=function(){
		var temp=new Templet();
		temp.once("complete",this,this.onComplete);
		temp.loadAni("share/animation/examFeedback.sk");
	}

	__proto.initInterface=function(){
		this.initBtnSubmit();
		this._bt_submit.visible=true;
		this._currView.btnSubmit=this._bt_submit;
		this._currView.submitHandler=new Handler(this,this.onSub);
	}

	__proto.onLevelChange=function(data){
		if(GlobalModel.isRoomOwner)
			return;
		if(this._isNew)
			return;
		var currView=VipThink.viewMgr.currPage.currView;
		if(! Laya.__typeof(currView,'com.biz.ui.IExam')){
			console.error(this.TAG,"page",VipThink.viewMgr.currPageIdx+1,"need to impletements interface IExam");
			this._currView=null;
			return;
		}
		this._currView=currView;
		if(this._isNew){
			this._isNew=false;
			return;
		}
		if(!this._time)
			this._time=Browser.now()-this._startTs;
		this._currView.scoringBeforeSubmit.apply(this._currView);
		this.submit();
	}

	__proto.onGlobalChanged=function(data){
		if(GlobalModel.isRoomOwner)
			return;
		var bChannelStatus=data.bChannelStatus;
		if(bChannelStatus){
			if(bChannelStatus.id==0 && bChannelStatus.editorID==0){
				this._startTs=Browser.now();
				}else{
				this._startTs=0;
			}
		}
	}

	__proto.submit=function(){
		if(GlobalModel.isRoomOwner)
			return;
		if(!this._currView)
			return;
		if(!ExamModel.data.submitAnswerAPI)
			return;
		if(this._startTs==0)
			return;
		this._currView.scoringBeforeSubmit.apply(this._currView);
		this._time=Browser.now()-this._startTs;
		var subj=VipThink.viewMgr.totalSubViewNum > 1 ? VipThink.viewMgr.mainView.currSubviewIdx+1 :0;
		var obj={
			liveId:ExamModel.data.liveId,
			modelId:this._currView.contentModule,
			no:VipThink.viewMgr.currPageIdx+1,
			item:subj,
			score:this._currView.score,
			maxScore:this._currView.total,
			time:this._time,
			studentId:VipThink.user.id,
			total:VipThink.viewMgr.mainView.pageCfgList.length
		}
		TransManager.doTrans("sendExamResult",[this.onSubmitResult,this,[obj,0]],[obj]);
		console.log(this.TAG,":submit ========>>","ip:",ExamModel.data.submitAnswerAPI,"data:",obj,"heads:",this._heads);
		this._startTs=0;
	}

	/**提交结果 */
	__proto.onSubmitResult=function(obj,count,data){
		if(!data)
			return;
		if (data.result=="complete"){
			VipThink.viewMgr.hideToast("Exam");
			}else if (data.result=="error"){
			VipThink.viewMgr.toast("SUBMIT_FAILED","Exam","info",4000);
			count++;
			this.timer.once(3000,this,this.submitLastLevelData,[obj,count],false);
		}
	}

	__proto.submitLastLevelData=function(obj,count){
		if(count >=5)
			return;
		if(obj){
			console.log(this.TAG,":reSubmit data:",obj,"heads:",this._heads);
			TransManager.doTrans("sendExamResult",[this.onSubmitResult,this,[obj,count]],[obj,this._heads]);
		}
	}

	__proto.onLessonEnd=function(){
		if(!GlobalModel.isRoomOwner){
			this.onClick({target:this._bt_submit});
		}
	}

	__getset(0,__proto,'functionViewParam',function(){
		return this._examViewParam;
		},function(value){
		if(!value)
			return;
		if(value.play){
			this.actAni("play",value.ran);
		}
		if(value.btVisible==false){
			this._bt_submit.visible=false;
		}
	});

	__getset(0,__proto,'unSyncProps',function(){
		return this._usProps;
		},function(props){
		this._usProps=props;
	});

	__getset(0,__proto,'btSubmit',function(){
		return this._bt_submit;
	});

	__getset(0,__proto,'play',function(){
		return this._isPlay;
		},function(value){
		var _$this=this;
		this._isPlay=value;
		if(value){
			var ran=Math.ceil(Math.random()*4);
			if(!this._currView)
				return;
			(this._currView).functionViewParam={play:true,ran:ran};
			this.frameOnce(2,this,function(){
				(_$this._currView).functionViewParam={btVisible:false};
			})
		}
	});

	ExamView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"ScaleButton","props":{"y":1011,"x":1803,"width":174,"visible":false,"var":"_bt_submit","skin":"share/ui/dipan_1.png","sizeGrid":"42,42,39,38","showInStu":true,"name":"_bt_submit","labelSize":40,"labelColors":"#ffffff","labelBold":true,"label":"确定","height":89,"anchorY":0.5,"anchorX":0.5}}]};
	ExamView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_EXAM,ExamView);
		};;;;
	}

	return ExamView;
})(View)


//class com.subject.module.functionshell.homework.CheckSkipView extends laya.ui.View
var CheckSkipView=(function(_super){
	function CheckSkipView(baseEva){
		this.btn_close=null;
		this.btn_give_up=null;
		this.btn_continue=null;
		this.box_items=null;
		// 使用题目跳过自检功能的次数
		this.useTimes=0;
		// 是否使用了题目跳过自检功能
		this.hasUse=false;
		this.useRecord=[];
		// 停留在题目自检弹窗的时长
		this.stayTime=0;
		// 显示题目自检弹窗的开始时间
		this.startTime=NaN;
		this.titleLabel=null;
		this.descLabel=null;
		this.tipsLalel=null;
		this.nextLabel=null;
		this.continueLabel=null;
		this.caller=null;
		CheckSkipView.__super.call(this);
		this.caller=baseEva;
	}

	__class(CheckSkipView,'com.subject.module.functionshell.homework.CheckSkipView',_super);
	var __proto=CheckSkipView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[
		{url:"res/atlas/share/ui/checkSkip.atlas",type:"atlas"},
		{url:"share/sound/checkSkip.wav",type:"sound"},
		{url:"share/sound/checkSkip_language_2.wav",type:"sound"},
		{url:"share/sound/checkSkip_language_3.wav",type:"sound"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
	}

	__proto.onResLoad=function(){
		this.createView(CheckSkipView.uiView);
		this.addListen();
		this.btn_close.visible=false;
		this.titleLabel.text=VipThink.getLanguageText(19);
		this.descLabel.text=VipThink.getLanguageText(20);
		this.tipsLalel.text=VipThink.getLanguageText(21);
		this.nextLabel.text=VipThink.getLanguageText(27);
		this.continueLabel.text=VipThink.getLanguageText(28);
	}

	__proto.addListen=function(){
		this.btn_close.on("click",this,this.onBtnClick);
		this.btn_continue.on("click",this,this.onBtnClick);
		this.btn_give_up.on("click",this,this.onBtnClick);
	}

	__proto.onBtnClick=function(e){
		var btnName;
		switch(e.target){
			case this.btn_close:{
					break ;
				}
			case this.btn_continue:{
					this.useRecord.push("否")
					KlEventCenter.event(HomeWorkOnlineView.HOMEWORK_ACTION,[{action:"nextPage"}]);
					VipThink.nativeAPI.noticeNative({args:{type:this.caller.name,data:{act:"redoJump",desc:"开始跳题重练"}}});
					this.useTimes++;
					this.hasUse=true;
					btnName="继续作答";
					break ;
				}
			case this.btn_give_up:{
					this.useRecord.push("是")
					KlEventCenter.event(HomeWorkOnlineView.HOMEWORK_ACTION,[{action:"finish"}]);
					btnName="放弃作答";
					break ;
				}
			}
		KlSoundManager.stopAllSound();
		this.visible=false;
		this.stayTime=new Date().getTime()-this.startTime;
		this.sendDataToNative(btnName);
	}

	// 提交埋点数据
	__proto.sendDataToNative=function(btnName){
		var stepMap={
			1:"小班",2:"中班",3:"大班",4:"一年级",5:"二年级",6:"三年级",7:"四年级"
		};
		var timeSkipHomeworkData={
			eventId:"time_skiphomework",
			eventName:"跳过检查机制停留时长",
			param:{
				timelong:Math.floor(this.stayTime / 1000),
				step:stepMap[VipThink.config.course.split("_")[0].split("s")[1]],
				courseName:VipThink.config.courseCfg.name,
				skipbuttonname:btnName
			}
		};
		console.debug("CheckSkipView---------sendDataToNative--------跳过检查机制停留时长埋点数据："+JSON.stringify(timeSkipHomeworkData));
		VipThink.nativeAPI.mate({
			args :{
				origin:"laya",
				mainType:2,
				minorType:"timeSkipHomework",
				data :timeSkipHomeworkData
			}
		})
	}

	/*显示题目跳过自检详情 */
	__proto.showCheck=function(ids){
		this.box_items.removeChildren();
		if(!ids || ids.length==0)
			return;
		this.visible=true;
		this.startTime=new Date().getTime();
		var path=VipThink.getLanguageSound("share/sound/checkSkip.wav");
		KlSoundManager.playSound(path);
		var itemsBoxWidth=this.box_items.width;
		var itemsBoxHeight=this.box_items.height;
		var item=new SkipQuestionIconUI();
		var imgItem=item.imgItem;
		var x=0;
		var y=0;
		var xStart=0;
		var yStart=0;
		var grapX=0;
		var grapY=0;
		var oneRowMaxItemNum=4;
		var rowNum=0;
		if(ids.length <=oneRowMaxItemNum){
			rowNum=1;
			grapX=(itemsBoxWidth-imgItem.width *ids.length)/ (ids.length+1);
			grapY=(itemsBoxHeight-imgItem.height)/ 2;
			xStart=grapX > 0 ? grapX :0;
			yStart=grapY > 0 ? grapY :0;
			}else {
			rowNum=Math.ceil(ids.length / oneRowMaxItemNum);
			grapX=(itemsBoxWidth-imgItem.width *oneRowMaxItemNum)/ (oneRowMaxItemNum-1);
			grapY=(itemsBoxHeight-imgItem.height *rowNum)/ (rowNum+1);
			yStart=grapY;
		}
		grapX=grapX > 0 ? grapX :0;
		grapY=grapY > 0 ? grapY :0;
		for (var i=0;i < ids.length;i++){
			item=new SkipQuestionIconUI();
			imgItem=item.imgItem;
			x=xStart+i % oneRowMaxItemNum *(grapX+imgItem.width);
			y=yStart+Math.floor(i / oneRowMaxItemNum)*(grapY+imgItem.height)-15;
			this.box_items.addChild(item);
			item.x=x;
			item.y=y;
			if (imgItem){
				var lab_num=imgItem.getChildByName("lab_num");
				if (lab_num){
					var num=(EvaModel.data.courseIndices ? EvaModel.data.courseIndices[ids[i]] :ids[i])+1;
					if (num < 10){
						lab_num.text="0"+num;
						}else {
						lab_num.text=""+num;
					}
				}
			}
		}
	}

	CheckSkipView.uiView={"type":"View","props":{"width":1920,"mouseThrough":false,"mouseEnabled":true,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"width":1190,"skin":"share/ui/checkSkip/kuang.png","sizeGrid":"214,300,220,276","height":794,"centerY":0,"centerX":0},"child":[{"type":"Image","props":{"y":465,"x":227,"width":742,"skin":"share/ui/checkSkip/bar.png","sizeGrid":"51,99,47,62","height":140},"child":[{"type":"Label","props":{"wordWrap":true,"width":660,"var":"tipsLalel","valign":"middle","text":"跳过的题目会算作错误哦，坚持完成它吧。","leading":8,"height":100,"fontSize":32,"color":"#FF9018","centerY":0,"centerX":0,"align":"center"}}]},{"type":"Label","props":{"y":134,"width":1104,"var":"descLabel","text":"好习惯检查系统发现，你跳过了以下题目：","height":39,"fontSize":40,"color":"#505E63","centerX":0,"align":"center"}},{"type":"Image","props":{"y":-20,"width":488,"skin":"share/ui/checkSkip/kuang3.png","sizeGrid":"0,47,0,59","centerX":0},"child":[{"type":"Label","props":{"y":24,"width":471,"var":"titleLabel","text":"跳题检查","height":45,"fontSize":45,"color":"#ffffff","centerX":0,"bold":true,"align":"center"}}]},{"type":"Box","props":{"y":182,"width":700,"var":"box_items","height":320,"centerX":0}},{"type":"ScaleButton","props":{"y":680,"x":813,"width":330,"var":"btn_continue","skin":"share/ui/checkSkip/btn2.png","sizeGrid":"0,51,0,66","pivotY":38,"pivotX":144.5,"name":"btn_continue","label":""},"child":[{"type":"Label","props":{"y":28,"width":287,"var":"continueLabel","text":"继续作答","height":32,"fontSize":32,"color":"#ffffff","centerX":0,"bold":true,"align":"center"}}]},{"type":"ScaleButton","props":{"y":680,"x":456,"width":330,"var":"btn_give_up","skin":"share/ui/checkSkip/btn1.png","sizeGrid":"0,49,0,64","name":"btn_give_up","label":""},"child":[{"type":"Label","props":{"y":28,"width":287,"var":"nextLabel","text":"放弃作答","height":32,"fontSize":32,"color":"#ff8414","centerX":0,"bold":true,"align":"center"}}]},{"type":"ScaleButton","props":{"y":66,"x":1106,"width":148,"var":"btn_close","skin":"share/ui/checkSkip/btn_close.png","name":"btn_close","label":"","height":148},"child":[{"type":"Circle","props":{"y":59,"x":77,"renderType":"hit","radius":66,"lineWidth":1,"fillColor":"#ff0000"}}]}]}]};
	return CheckSkipView;
})(View)


//class com.subject.module.functionshell.homework.HomeworkChallengeView extends laya.ui.View
var HomeworkChallengeView=(function(_super){
	function HomeworkChallengeView(_caller,config){
		this.isFirstBox=null;
		this.notFirstBox=null;
		this.btnBox=null;
		this.labFinishPercent=null;
		this.labStartNum=null;
		this.btnFinish=null;
		this.btnChallenge=null;
		this.isFirst=false;
		// 是否第一次做挑战题
		this.unlock=false;
		this.challengeConfig=null;
		this._caller=null;
		HomeworkChallengeView.__super.call(this);
		this.challengeConfig=config;
		this.unlock=this.challengeConfig.unlock;
		this.isFirst=this.challengeConfig.isFirst;
		this._caller=_caller;
		this.visible=false;
	}

	__class(HomeworkChallengeView,'com.subject.module.functionshell.homework.HomeworkChallengeView',_super);
	var __proto=HomeworkChallengeView.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[
		{url:"res/atlas/share/ui/homeworkChallenge.atlas",type:"atlas"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad,[this.challengeConfig]));
		VipThink.viewMgr.on("afterSetLabel",this,this.setLabelAgain);
	}

	__proto.onResLoad=function(){
		this.createView(HomeworkChallengeView.uiView);
		var box=this.isFirst ? this.isFirstBox :this.notFirstBox;
		box.visible=true;
		this.btnBox=box.getChildByName("btnBox");
		for (var i=0;i < this.btnBox.numChildren;i++){
			var btn=this.btnBox.getChildAt(i);
			this[btn.name]=btn;
			btn.on("click",this,this.onBtnClick);
		}
		if(this.isFirst){
			this.labFinishPercent.text=this.challengeConfig.finishPercent+"%";
			this.labStartNum.text=this.challengeConfig.startNum;
		}
	}

	// 因为进入了挑战题，所以题目下标要再次设置一次
	__proto.setLabelAgain=function(){
		var level=VipThink.viewMgr.currPageIdx;
		var len=VipThink.viewMgr.mainView.pageCfgList.length;
		if(VipThink.viewMgr.currPageIdx < this.challengeConfig.startIndex || !this.unlock)
			len-=this.challengeConfig.pageNum;
		if(EvaModel.data.isRedoWrong)
			len=VipThink.viewMgr.mainView.pageCfgList.length;
		this._caller._lable.text=this._caller._label_yinying.text=StringUtil.format("{0}{1}/{2}","题目进度：",level+1,len);
	}

	__proto.onBtnClick=function(evt){
		this.visible=false;
		switch(evt.target){
			case this.btnChallenge:{
					this._caller.enterChallenge();
					console.debug("HomeworkChallengeView - onBtnClick  - 进入作业挑战题")
					break ;
				}
			case this.btnFinish:{
					this._caller.finish();
					console.debug("HomeworkChallengeView - onBtnClick  - 不进入作业挑战题，结束练习")
					break ;
				}
			}
	}

	HomeworkChallengeView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"height":1080,"alpha":0.3},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0,"visible":false,"var":"isFirstBox"},"child":[{"type":"Image","props":{"y":47,"x":333,"width":624,"skin":"share/ui/homeworkChallenge/panel4.png","scaleY":2,"scaleX":2,"height":484,"sizeGrid":"113,0,62,0"}},{"type":"Image","props":{"y":273,"x":424,"width":538,"skin":"share/ui/homeworkChallenge/panel3.png","scaleY":2,"scaleX":2,"height":230,"sizeGrid":"29,112,94,31"}},{"type":"Image","props":{"y":74,"x":758,"skin":"share/ui/homeworkChallenge/lab1.png","scaleY":2,"scaleX":2}},{"type":"Label","props":{"y":770,"x":789,"text":"是否准备开始挑战？","fontSize":38,"color":"#ae3b00"}},{"type":"Label","props":{"y":315,"x":740,"text":"接下来即将开始","fontSize":36,"color":"#696968"}},{"type":"Label","props":{"y":315,"x":998,"text":"挑战题环节","fontSize":36,"color":"#ff826a"}},{"type":"Label","props":{"y":366,"x":671,"text":"目前已经有","fontSize":36,"color":"#696968"}},{"type":"Label","props":{"y":366,"x":922,"text":"的学员完成了挑战题","fontSize":36,"color":"#696968"}},{"type":"Label","props":{"y":385,"x":888,"var":"labFinishPercent","text":"60%","fontSize":36,"color":"#5dd1a5","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":461,"x":803,"skin":"share/ui/homeworkChallenge/hc_1.png","scaleY":2,"scaleX":2}},{"type":"Label","props":{"y":510,"x":840,"text":"01","fontSize":50,"color":"#ffffff"}},{"type":"Image","props":{"y":461,"x":998,"skin":"share/ui/homeworkChallenge/hc_1.png","scaleY":2,"scaleX":2}},{"type":"Label","props":{"y":511,"x":1034,"text":"02","fontSize":50,"color":"#ffffff"}},{"type":"Image","props":{"y":634,"x":991,"skin":"share/ui/homeworkChallenge/start.png","scaleY":2,"scaleX":2}},{"type":"Label","props":{"y":644,"x":829,"text":"挑战奖励","fontSize":36,"color":"#696968"}},{"type":"Label","props":{"y":643,"x":1079,"var":"labStartNum","text":"20","fontSize":36,"color":"#ff5e41"}},{"type":"Label","props":{"y":640,"x":1058,"text":"x","fontSize":36,"color":"#ff5e41"}},{"type":"Box","props":{"y":0,"x":0,"name":"btnBox"},"child":[{"type":"ScaleButton","props":{"y":903,"x":805,"width":282,"skin":"share/ui/homeworkChallenge/btn1.png","name":"btnFinish","label":"","height":122,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":35,"x":61,"text":"结束练习","fontSize":40,"color":"#feac0e"}}]},{"type":"ScaleButton","props":{"y":903,"x":1124,"width":282,"skin":"share/ui/homeworkChallenge/btn2.png","name":"btnChallenge","label":"","height":122,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":32,"x":60,"text":"前往挑战","fontSize":40,"color":"#ffffff"}}]}]}]},{"type":"Box","props":{"y":0,"x":0,"visible":false,"var":"notFirstBox"},"child":[{"type":"Image","props":{"y":407,"x":528,"width":434,"skin":"share/ui/homeworkChallenge/panel2.png","scaleY":2,"scaleX":2,"height":248,"sizeGrid":"2,0,46,0"}},{"type":"Image","props":{"y":250,"x":528,"width":434,"skin":"share/ui/homeworkChallenge/panel1.png","scaleY":2,"scaleX":2}},{"type":"Image","props":{"y":129,"x":713,"skin":"share/ui/homeworkChallenge/ledi.png","scaleY":2,"scaleX":2}},{"type":"Label","props":{"y":559,"x":786,"text":"是否开始挑战？","fontSize":50,"color":"#696968"}},{"type":"Label","props":{"y":483,"x":1013,"text":"挑战题环节","fontSize":50,"color":"#ff826a"}},{"type":"Label","props":{"y":483,"x":658,"text":"接下来即将开始","fontSize":50,"color":"#696968"}},{"type":"Box","props":{"name":"btnBox"},"child":[{"type":"ScaleButton","props":{"y":778,"x":784,"width":376,"visible":false,"skin":"share/ui/homeworkChallenge/btn3.png","name":"btnFinish","label":"","height":152,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":46,"x":106,"text":"结束练习","fontSize":40,"color":"#9c9c9c"}}]},{"type":"ScaleButton","props":{"y":777,"x":956,"width":379,"skin":"share/ui/homeworkChallenge/btn2.png","name":"btnChallenge","label":"","height":156,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Label","props":{"y":48,"x":147,"text":"挑战","fontSize":40,"color":"#ffffff"}}]}]}]}]};
	return HomeworkChallengeView;
})(View)


//class com.subject.module.functionshell.homework.NewHomeworkNoticeView extends laya.ui.View
var NewHomeworkNoticeView=(function(_super){
	function NewHomeworkNoticeView(caller){
		this.caller=null;
		this._bt_notjump=null;
		this._bt_jump=null;
		this.mc_ch_ip=null;
		this.mc_ip=null;
		this.descLabel=null;
		this.jumpLabel=null;
		this.continueLabel=null;
		NewHomeworkNoticeView.__super.call(this);
		this.caller=caller;
	}

	__class(NewHomeworkNoticeView,'com.subject.module.functionshell.homework.NewHomeworkNoticeView',_super);
	var __proto=NewHomeworkNoticeView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[
		{url:"res/atlas/share/ui/newHomeworkNotice.atlas",type:"atlas"},
		{url:"share/sound/sureSkip.wav",type:"sound"},
		{url:"share/sound/sureSkip_language_2.wav",type:"sound"},
		{url:"share/sound/sureSkip_language_3.wav",type:"sound"},]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
	}

	__proto.onResLoad=function(){
		this.createView(NewHomeworkNoticeView.uiView);
		var path="share/sound/sureSkip.wav";
		this.caller.SOUND_JUMP=path;
		this.visible=false;
		this._bt_notjump.on("click",this,this.onClick);
		this._bt_jump.on("click",this,this.onClick);
		if(VipThink.config.courseCfg && VipThink.config.courseCfg.subject=="chinese"){
			if(this.mc_ch_ip)this.mc_ch_ip.visible=true;
			if(this.mc_ip)this.mc_ip.visible=false;
			}else{
			if(this.mc_ch_ip)this.mc_ch_ip.visible=false;
			if(this.mc_ip)this.mc_ip.visible=true;
		}
		this.descLabel.text=VipThink.getLanguageText(16);
		this.jumpLabel.text=VipThink.getLanguageText(17);
		this.continueLabel.text=VipThink.getLanguageText(18);
	}

	__proto.onClick=function(e){
		this.caller.event("onCallBtnClick",[e.target.name]);
		KlSoundManager.stopAllSound();
	}

	NewHomeworkNoticeView.uiView={"type":"View","props":{"width":1920,"name":"_box_notice","height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":300,"x":344,"width":262,"visible":false,"var":"mc_ch_ip","skin":"share/ui/ch_ip.png","height":393}},{"type":"Image","props":{"y":300,"x":344,"width":262,"var":"mc_ip","skin":"share/ui/newHomeworkNotice/jingling.png","height":393}},{"type":"Image","props":{"y":329,"x":591,"width":981,"skin":"share/ui/newHomeworkNotice/kuang.png","height":376}},{"type":"Label","props":{"y":400,"x":823,"wordWrap":true,"width":580,"var":"descLabel","valign":"middle","text":"你还没有作答哦。 跳过此题算作错误，你确定要跳过吗？","leading":8,"height":136,"fontSize":34,"color":"#ff8414","align":"center"}},{"type":"Image","props":{"y":547,"x":829,"width":268,"var":"_bt_jump","skin":"share/ui/newHomeworkNotice/btn1.png","name":"_bt_jump","height":77,"sizeGrid":"0,33,0,31"},"child":[{"type":"Label","props":{"y":23,"x":1,"width":267,"var":"jumpLabel","text":"我要跳过","height":32,"fontSize":32,"color":"#ff8414","bold":true,"align":"center"}}]},{"type":"Image","props":{"y":546,"x":1130,"width":269,"var":"_bt_notjump","skin":"share/ui/newHomeworkNotice/btn2.png","sizeGrid":"0,41,0,47","name":"_bt_notjump","height":80},"child":[{"type":"Label","props":{"y":24,"x":1,"width":269,"var":"continueLabel","text":"我不跳过了","height":32,"fontSize":32,"color":"#ffffff","bold":true,"align":"center"}}]},{"type":"KlInputImage","props":{"spaceX":0,"place":1,"fontClipSkin":"share/ui/0-9-fuhao_0.png","filterColor":"#ffff00","filterBlur":5,"contentType":1,"canSelected":"false"}}]};
	return NewHomeworkNoticeView;
})(View)


//class com.subject.module.functionshell.homework.SkipQuestionIconUI extends laya.ui.View
var SkipQuestionIconUI=(function(_super){
	function SkipQuestionIconUI(){
		this.imgItem=null;
		SkipQuestionIconUI.__super.call(this);
	}

	__class(SkipQuestionIconUI,'com.subject.module.functionshell.homework.SkipQuestionIconUI',_super);
	var __proto=SkipQuestionIconUI.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(SkipQuestionIconUI.uiView);
	}

	SkipQuestionIconUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"width":84,"var":"imgItem","skin":"share/ui/checkSkip/circle1.png","height":84},"child":[{"type":"Label","props":{"text":"01","name":"lab_num","fontSize":44,"color":"#FFFFFF","centerY":0,"centerX":0}},{"type":"Image","props":{"y":55,"x":58,"width":39,"visible":false,"skin":"share/ui/checkSkip/wrong.png","height":40}}]}]};
	return SkipQuestionIconUI;
})(View)


//class com.subject.module.functionshell.jlreview.JLReviewLessonView extends laya.ui.View
var JLReviewLessonView=(function(_super){
	function JLReviewLessonView(){
		this._sp=null;
		this._reference=null;
		this.btn=null;
		this.countNum=null;
		this.helpBox=null;
		this._cfg=null;
		this._wrongTime=0;
		this.pageInfo=[];
		this.curPageTime=0;
		this.totalTime=0;
		this.hasDonePageIdxs=[];
		this.isDone=false;
		// 用于区分小学阶段是否做完当前题目
		this.jlSoundUrl="share/sound/jl_sound.wav";
		this.btnLabel="求助小精灵"
		JLReviewLessonView.__super.call(this);
		this.name="JLReview";
		this.mouseThrough=true;
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		VipThink.viewMgr.feedBackView.on("showAnswerFace",this,this.onShowAnswerFace);
		VipThink.viewMgr.on("allVideoOver",this,this.onVideoOver);
		var res_arr=[
		{url:"res/atlas/share/ui/JLReview.atlas",type:"atlas"},
		{url:this.jlSoundUrl,type:"sound"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
	}

	__class(JLReviewLessonView,'com.subject.module.functionshell.jlreview.JLReviewLessonView',_super);
	var __proto=JLReviewLessonView.prototype;
	__proto.onResLoad=function(){
		var box=new JLReviewViewUI();
		this.addChild(box);
		box.mouseThrough=true;
		this.helpBox=box.getChildByName("helpBox");
		this.helpBox.visible=false;
		this.btn=this.helpBox.getChildByName("btn");
		this.countNum=this.helpBox.getChildByName("countNum");
		this.btn.on("click",this,this.onClick);
		if ("prepared"==VipThink.viewMgr.mainView.status){
			this.onPrepared();
		}
	}

	// 当前页所有视频播放完后
	__proto.onVideoOver=function(){
		if(this.isLastLevel && this.isChild){
			console.debug("JLReviewLessonView - onVideoOver - 提交关卡数据");
			this.submitData();
			return;
		}
		this._cfg=this._cfg || this.levelConfig;
		if(this._cfg.type=="video"){
			console.debug("JLReviewLessonView - onVideoOver - 播完所有游戏、老师视频后跳到下一关");
			VipThink.nativeAPI.nextPage();
		}
		else{
			if(this.isDone){
				console.debug("JLReviewLessonView - onVideoOver - 播完正确答案动画后跳到下一关");
				this.nextPage();
				this.isDone=false;
			}
		}
	}

	__proto.sendNativeTotalPageNum=function(){
		VipThink.nativeAPI.noticeLaya({
			args :{
				data:{
					totalPage :VipThink.viewMgr.mainView.pageCfgList.length
				}
			}
		});
	}

	__proto.onClick=function(evt){
		KlSoundManager.playSound("share/sound/btn_click.wav");
		switch(evt.target){
			case this.btn:{
					this.isDone=true;
					this.timer.clear(this,this.helpCountDown);
					this.timer.clear(this,this.afterShowHelp);
					this.playVideo(this.getVideoUrl("helpVideoUrl"),"helpVideo");
					console.debug("JLReviewLessonView - onMouseUpHandler - 播完帮助动画");
					this.helpBox.visible=false;
					break ;
				}
			}
	}

	/**
	*接收应用端发送的视频事件回调
	*/
	__proto.onVideoCommand=function(param){
		var act=param.args.act;
		var isEnd=param.args.isEnd ? true :false;
		var time=param.args.time;
		var currView=VipThink.viewMgr.currPage.currView;
		if (currView && currView.isVideoView && !this._cfg.techVideoUrl){
			if (act=="stop" && isEnd){
				console.debug("JLReviewLessonView - onVideoCommand - 自动跳到下一关");
				VipThink.nativeAPI.nextPage();
			}
			return;
		}
		if (act=="stop"){
			if (isEnd){
				this.hideGameVideo();
				}else if (time==0){
				Laya.timer.frameOnce(20,this,function(){
					VipThink.nativeAPI.noticeNative({args:{
							type:"video",
							data:{
								act:"start",
								time:0,
								isEnd:false
							}
					}})
				})
			}
		}else if (act=="start" && !isEnd){}
	}

	__proto.playVideo=function(url,type){
		var _$this=this;
		if (!url){
			return;
		}
		KlSoundManager.stopAll();
		if (VipThink.release=="dev" && !VipThink.isAI){
			this.clearVideo();
			this._reference=new Sprite();
			this._sp=new Sprite();
			this._sp.graphics.drawRect(0,0,1920,1080,"#000000","#000000");
			this.addChild(this._sp);
			this._sp.alpha=0.8;
			var videoElement=Browser.createElement("video");
			Browser.document.body.appendChild(videoElement);
			videoElement.style.zInddex=Render.canvas.style.zIndex+1;
			videoElement.style.position='absolute';
			videoElement.src=url;
			videoElement.controls=true;
			this._reference=new Sprite();
			this.addChild(this._reference);
			this._reference.size(1920,1080);
			Laya.stage.on("resize",this,Utils.fitDOMElementInArea,[videoElement,this._reference,0,0,this._reference.width,this._reference.height]);
			videoElement.addEventListener('ended',function(){
				_$this.clearVideo();
			});
		};
		var obj={
			type:"video",
			data:{
				act:"videoUrl",
				url:url,
				fill:1,
				autoPlay:1,
				hide:1
			}
		}
		VipThink.nativeAPI.noticeNative({args:obj});
	}

	// 监听关卡反馈动画回调
	__proto.onShowAnswerFace=function(type){
		console.debug("JLReviewLessonView - 监听showAnswerFace回调");
		var curPageInfo=this.pageInfo[this.pageInfo.length-1];
		if(type==2){
			this._wrongTime++;
			curPageInfo.isClear=false;
			if(this._wrongTime >=3)
				this.showHelp();
		}
		else {
			this.totalTime+=this.curPageTime;
			this.hasDonePageIdxs.push([VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]);
			if(this.isLastLevel && this.isChild){
				console.debug("JLReviewLessonView - onVideoOver - 提交关卡数据");
				this.submitData();
			}
			else{
				console.debug("JLReviewLessonView - onShowAnswerFace - 自动跳到下一关");
				this.nextPage();
			}
		}
		if(!this.isChild){
			curPageInfo.time=this.curPageTime;
			curPageInfo.wrongTime=this._wrongTime;
			curPageInfo.answer=type==1;
			VipThink.nativeAPI.noticeNative({
				args:{
					type:this.name,
					act:"done",
					data:curPageInfo
				}
			});
		}
	}

	// 判断是不是做过这一页,做过的页面不会再截图和提交数据了
	__proto.isRepeatPage=function(){
		var p=VipThink.viewMgr.currPageIdx;
		var s=VipThink.viewMgr.currSubviewIdx;
		for (var i=0;i < this.hasDonePageIdxs.length;i++){
			if(p==this.hasDonePageIdxs[i][0] && s==this.hasDonePageIdxs[i][1])
				return true
		}
		return false;
	}

	__proto.nextPage=function(){
		this.frameOnce(5,this,VipThink.nativeAPI.nextPage);
	}

	// 显示精灵求助
	__proto.showHelp=function(){
		console.debug("JLReviewLessonView - showHelp - 显示帮助窗口");
		this.helpBox.visible=true;
		this.countNum.text=this.btnLabel;
		KlSoundManager.playSound(this.jlSoundUrl);
		this.timerOnce(4000,this,this.afterShowHelp);
	}

	// 精灵求助弹窗倒计时文本设置
	__proto.afterShowHelp=function(){
		this.countNum.text=this.btnLabel+"(3)";
		this.timerOnce(1000,this,this.helpCountDown);
	}

	// 精灵求助弹窗倒计时文本改变
	__proto.helpCountDown=function(time){
		(time===void 0)&& (time=3);
		time--;
		this.countNum.text=this.btnLabel+"("+String(time)+")";
		if(time==0){
			this.onClick({target:this.btn});
			return;
		}
		else
		this.timerOnce(1000,this,this.helpCountDown,[time]);
	}

	// 销毁游戏视频窗口
	__proto.hideGameVideo=function(){
		VipThink.nativeAPI.noticeNative({args:{
				type:"nomal"
		}});
	}

	// 销毁游戏视频窗口
	__proto.hideTechVideo=function(){
		VipThink.nativeAPI.noticeNative({args:{
				type:"TechNomal"
		}});
	}

	__proto.onPrepared=function(){
		console.warn("/-------------onPrepared-------------/"+VipThink.viewMgr.currPageIdx+"   "+VipThink.viewMgr.currSubviewIdx);
		this._cfg=this.levelConfig;
		this._wrongTime=0;
		if(this._cfg.type=="video")
			this.stopCount()
		else{
			this.noticeNativeNormal();
			console.debug("JLReviewLessonView - onPrepared - 当前关卡开始计时");
			this.startCount();
			this.pageInfo.push({
				pageIdx:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx],
				time:0,
				isClear:true,
				answer:false,
				wrongTime:0
			});
		}
	}

	// 通知应用这是练习页面
	__proto.noticeNativeNormal=function(){
		VipThink.nativeAPI.noticeNative({
			args:{
				data:{
					type:"nomal"
				}
			}
		})
		VipThink.nativeAPI.noticeNative({args:{
				type:"nomal",
				data:{act:"videoUrl",url:""}
		}});
	}

	__proto.stopCount=function(){
		this.timer.clear(this,this.countDown);
	}

	__proto.startCount=function(){
		this.curPageTime=0;
		this.timerLoop(1000,this,this.countDown);
	}

	__proto.countDown=function(){
		this.curPageTime++;
	}

	/**
	*获取视频地址
	*/
	__proto.getVideoUrl=function(type){
		if (!this._cfg)
			return null;
		var courseUrl=VipThink.config.courseCfg ? VipThink.config.courseCfg.url :null;
		var videoUrl=this._cfg[type];
		if(!videoUrl){
			return null;
		};
		var url;
		if(videoUrl.indexOf("share/animation/")!=-1){
			url=videoUrl;
			}else{
			url=courseUrl ? (courseUrl+'/'+videoUrl):videoUrl;
		};
		var versionUrl;
		var fullUrl=URL.formatURL(url);
		if(fullUrl.indexOf("/lessons/")==-1 && fullUrl.indexOf("share/animation")==-1){
			return url;
			}else {
			var idx=0;
			if(fullUrl.indexOf("share/animation")!=-1){
				idx=fullUrl.indexOf("/share/animation");
				}else {
				idx=fullUrl.indexOf("/lessons/");
			};
			var customUrl=URL.customFormat(url);
			if (customUrl){
				return customUrl;
				}else {
				console.error('video customUrl is undefined');
				return null;
			}
		}
	}

	/**
	*开发模式下：清理video标签
	*/
	__proto.clearVideo=function(){
		if (Browser.document.body.lastChild && Browser.document.body.lastChild.localName=='video')
			Browser.document.body.removeChild(Browser.document.body.lastChild);
		Laya.stage.off("resize",this,Utils.fitDOMElementInArea);
		this.graphics.clear();
		if (this._reference){
			this.removeChild(this._reference);
			this._reference=null;
		}
		if (this._sp){
			this.removeChild(this._sp);
			this._sp=null;
		}
	}

	__proto.submitData=function(){
		var obj={
			type :this.name,
			act :"complete",
			data :{
				totalTime:this.totalTime,
				clearPercent:100
			}
		}
		VipThink.nativeAPI.noticeNative({
			args :obj
		})
	}

	// 获取复习课总时长
	__proto.getTotalTime=function(){
		var totalTime=0;
		for (var i=0;i < this.pageInfo.length;i++){
			var info=this.pageInfo[i];
			if(info)
				totalTime+=info.time;
		}
		return totalTime;
	}

	/**
	*是否小学阶段
	*/
	__getset(0,__proto,'isPrimary',function(){
		return VipThink.config.courseType==82;
	});

	/**
	*是否是最后一关
	*/
	__getset(0,__proto,'isLastLevel',function(){
		return VipThink.viewMgr.currPageIdx >=VipThink.viewMgr.mainView.pageCfgList.length-1;
	});

	/**
	*desc:控制界面是否可以操作
	*param:
	*/
	__getset(0,__proto,'canAct',null,function(value){
		this.mouseEnabled=value;
		if (VipThink.viewMgr && VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
			VipThink.viewMgr.currPage.currView.mouseEnabled=value;
		}
	});

	/**
	*是否幼儿阶段
	*/
	__getset(0,__proto,'isChild',function(){
		return VipThink.config.courseType==81;
	});

	// 获取当前页面的关卡配置
	__getset(0,__proto,'levelConfig',function(){
		if (!VipThink.viewMgr.currPage || !VipThink.viewMgr.currPage.currView)
			return null;
		return VipThink.viewMgr.currPage.currView.config.configObj;
	});

	JLReviewLessonView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_JL_REVIEW,JLReviewLessonView);
		};
	}

	return JLReviewLessonView;
})(View)


//class com.subject.module.functionshell.jlreview.JLReviewViewUI extends laya.ui.View
var JLReviewViewUI=(function(_super){
	function JLReviewViewUI(){
		JLReviewViewUI.__super.call(this);;
	}

	__class(JLReviewViewUI,'com.subject.module.functionshell.jlreview.JLReviewViewUI',_super);
	var __proto=JLReviewViewUI.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(JLReviewViewUI.uiView);
	}

	JLReviewViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"var":"helpBox","name":"helpBox"},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":540,"x":960,"skin":"share/ui/JLReview/panel.png","scaleY":1.5,"scaleX":1.5,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":662,"x":840,"width":319,"var":"btn","skin":"share/ui/JLReview/btn2.png","sizeGrid":"0,37,0,35","name":"btn","height":86}},{"type":"Label","props":{"y":685,"x":998,"text":"求助小精灵","name":"countNum","mouseEnabled":false,"fontSize":38,"font":"Microsoft YaHei","color":"#ffffff","anchorX":0.5,"align":"center"}}]}]};
	return JLReviewViewUI;
})(View)


/**
*desc:个性化界面
*author:Jonny
*/
//class com.subject.module.other.PersonalizedView extends laya.ui.View
var PersonalizedView=(function(_super){
	function PersonalizedView(){
		// 反馈界面FeedbackView
		this._fview=null;
		this._reference=null;
		// 答错次数
		this._wrongTime=0;
		//-1 无响应， 0 初始状态， 1 响应为存在， 2响应为不存在
		this.nativeRespondState=0;
		this.TAG="PersonalizedView";
		this._box_spirit=null;
		this._bt_help=null;
		this._bt_no=null;
		this._bot_stu=null;
		this._lab_subj=null;
		this._img_drag=null;
		this._bt_preSubj=null;
		this._bt_nextSubj=null;
		this._bt_redo=null;
		this.submitData=null;
		this.curPidx=0;
		this.curSIdx=0;
		this.answerDataTemp={};
		this.starTimeCount=-100000;
		this.courseTimeCount=-100000;
		this.doesThisPageHaveAssistVideo=false;
		this.preCurrentIdx=-1;
		this.preSubIdx=-1;
		this.enterTimer=0;
		/**
		*记录开始时间
		*/
		this.sTime=0;
		/**
		*记录当前 进入直播间 收到的解锁和锁住的总次数
		*/
		this.refNum=0;
		this.nowNumberState=0;
		this.resultMap={1:"Right",2:"Wrong",3:"noResult"};
		this._skencourage=null;
		PersonalizedView.__super.call(this);
		GlobalModel.instance.on("changed",this,this.onGlobalModelChange);
		if (VipThink.user.userType==2){
			VipThink.viewMgr.on("showReceiveStarsView",this,this.onLessonEnd);
		}
		VipThink.viewMgr.on("hidePersonal",this,this.hidePersonal);
		KlEventCenter.on("tryAgain",this,this.onTapTryAgain);
		VipThink.viewMgr.on("changed",this,this.onLevelChanged);
	}

	__class(PersonalizedView,'com.subject.module.other.PersonalizedView',_super);
	var __proto=PersonalizedView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(PersonalizedView.uiView);
		this._fview=VipThink.viewMgr.feedBackView;
		this.mouseThrough=true;
		this._bot_stu.visible=false;
		this._box_spirit.visible=false;
		this.visible=true;
		this.startAISpiritTimer();
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.onNativeToLaya);
		KlEventCenter.on("pageReset",this,function(){
			this.starTimeCount=0;
		});
	}

	/**
	*做题状态的改变 思考中 做题中 切换 当学生有操作的时候为做题中，过三秒什么都没干就思考中
	*/
	__proto.onClickTiMuStageDown=function(e){
		this.timer.clear(this,this.onSiKaoTimer);
		this.updateAnwserData(3,0,0,0,false,true);
	}

	// 做题中
	__proto.onClickTiMuStageUp=function(e){
		this.timer.once(3000,this,this.onSiKaoTimer);
	}

	__proto.onSiKaoTimer=function(){
		this.updateAnwserData(4,0,0,0,false,true);
	}

	// 思考中
	__proto.onLevelChanged=function(){
		this.onAiSpiritPageStatusChange();
		this.sendStuData(true);
		this.reportHasVideoData();
		var date=new Date();
		this.enterTimer=date.getTime();
		this.doesThisPageHaveAssistVideo=false;
		this.preCurrentIdx=VipThink.viewMgr.currPageIdx;
		this.preSubIdx=VipThink.viewMgr.currSubviewIdx;
	}

	// 新东方课程点击再次挑战按钮提交埋点数据
	__proto.onTapTryAgain=function(){
		if (VipThink.user.isStu){
			var date=new Date();
			var data={eventName:"tap_tryAgain",param:{roomId:this.getNumberFromString(GlobalModel.user.currentRoomId),pageNumber:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx],coursewareID:VipThink.config.course,studentId:VipThink.user.id,teacherId:VipThink.userStatus.teacher ? VipThink.userStatus.teacher.id :null,isChallengeExercise:(VipThink.viewMgr.currSubview && VipThink.viewMgr.currSubview.config.configObj.challenge)? "yes" :"no",tapTime:DateUtil.formatWithoutMs(Math.floor(date.getTime()/ 1000))}};
			Reporter.reportData(3,data);
		}
	}

	// 课件答题数据埋点提交
	__proto.sendStuData=function(isLoadPage){
		var _$this=this;
		(isLoadPage===void 0)&& (isLoadPage=false);
		Laya.timer.frameOnce(3,this,function(){
			var pid=0;
			var sid=0;
			if (isLoadPage){
				pid=VipThink.viewMgr.currPageIdx;
				sid=VipThink.viewMgr.currSubviewIdx;
			}
			else{
				pid=_$this.curPidx;
				sid=_$this.curSIdx;
			}
			if (!VipThink.user.getLessonData())
				return;
			var userNativeData=VipThink.user.getLessonData().stuSubjsAnwserData;
			if (!userNativeData){
				console.warn(_$this.TAG+" userNativeData undefined, return");
				return;
			};
			var answerData=userNativeData.anwserData;
			if (!answerData){
				console.warn(_$this.TAG+" userNativeData.anwserData undefined, return");
				return;
			};
			var curPageData=answerData[pid+"_"+sid];
			if (!curPageData)
				return;
			var duration=0;
			var startTime="1970-01-01 00:00:00";
			var submitTime="1970-01-01 00:00:00";
			var result="noResult";
			if (curPageData.startTs==null){
				startTime=DateUtil.formatWithoutMs(Math.floor(new Date().getTime()/ 1000));
			}
			if (curPageData.endTs==null){
				submitTime=DateUtil.formatWithoutMs(Math.floor(new Date().getTime()/ 1000));
			}
			if (curPageData && !isLoadPage){
				if (curPageData.endTs !=null && curPageData.startTs !=null){
					duration=Math.abs(curPageData.endTs-curPageData.startTs);
				}
				result=_$this.resultMap[curPageData.state] ? _$this.resultMap[curPageData.state] :"noResult";
				if (curPageData.startTs){
					startTime=DateUtil.formatWithoutMs(Math.floor(curPageData.startTs / 1000));
				}
				if (curPageData.endTs){
					submitTime=DateUtil.formatWithoutMs(Math.floor(curPageData.endTs / 1000));
				}
			}
			if (!VipThink.config.courseCfg){
				return;
			};
			var pageConfig=VipThink.config.courseCfg.pages;
			if (!pageConfig)
				return;
			var curPageConfig=pageConfig[pid].subviews ? pageConfig[pid].subviews[sid] :pageConfig[pid];
			var data={eventName:"coursewareDate",param:{result:result,duration:duration,studentId:VipThink.user.id,teacherId:VipThink.userStatus.teacher ? VipThink.userStatus.teacher.id :null,roomId:_$this.getNumberFromString(GlobalModel.user.currentRoomId),isChallengeExercise:curPageConfig.challenge ? "yes" :"no",startTime:startTime,submitTime:submitTime,pageNumber:[pid+"",sid+""],allNumberOfExercises:pageConfig[pid].subviews ? pageConfig[pid].subviews.length :1,coursewareID:VipThink.config.course}};
			Reporter.reportData(3,data,null,{msg:["PersonalizedView.sendStuData",(isLoadPage ? "切关" :"锁定"),"提交答题数据埋点："]});
		});
	}

	// console.debug("PersonalizedView--------sendStuData----------"+(isLoadPage ? "切关" :"锁定")+"提交答题数据埋点："+JSON.stringify(data));
	__proto.getNumberFromString=function(str){
		var str1="";
		for (var i=0;i < str.length;i++){
			if (str[i] >="0" && str[i] <="9"){
				str1+=str[i];
			}
		}
		return parseInt(str1);
	}

	__proto.hidePersonal=function(){}
	/**
	*监听
	*/
	__proto.onLessonEnd=function(){}
	/**
	*全局数据变化回调
	*/
	__proto.onGlobalModelChange=function(data){
		var _$this=this;
		if (!VipThink.currView){
			this.frameOnce(1,this,this.onGlobalModelChange,[data]);
			return;
		};
		var bChannelStatus=data.bChannelStatus;
		if (bChannelStatus){
			if (bChannelStatus.id==0 && bChannelStatus.editorID==0){
				var pageCfgList=VipThink.viewMgr.mainView.pageCfgList;
				if (pageCfgList){
					var prop=pageCfgList[VipThink.viewMgr.currPageIdx];
					if (prop){
						if (!prop.subViews || prop.subViews.length < 2){
							if (VipThink.user.isStu){
								this._bot_stu.visible=false;
							}
						}
					}
				}
				this.lockStatusChange(false);
				this.refNum++;
				if (VipThink.user.isStu){
					this.curPidx=VipThink.viewMgr.currPageIdx;
					this.curSIdx=VipThink.viewMgr.currSubviewIdx;
					this.updateLab();
					this.updateBtns(false,false);
					this._fview.on("showAnswerFace",this,this.onFeedback);
					VipThink.viewMgr.on("changed",this,this.onLevelOrSubjChanged);
					this._wrongTime=0;
					this.starTimeCount=0;
					this.courseTimeCount=-10000000;
					console.log("学生获得解锁权限 starTimeCount",this.starTimeCount,"courseTimeCount:",this.courseTimeCount);
					this.timerOnce(1000,this,function(){
						_$this.sTime=new Date().getTime();
						_$this.updateAnwserData(4,_$this.sTime,0,0,false);
					});
					Laya.stage.on("mousedown",this,this.onClickTiMuStageDown);
					Laya.stage.on("mouseup",this,this.onClickTiMuStageUp);
				}
				else if (VipThink.user.isTech){
					VipThink.userStatus.on("changed",this,this.onLessonDataChange);
				}
			}
			else{
				this.lockStatusChange(true);
				this.refNum++;
				if (!data.lChannelStatus || (data.lChannelStatus && data.lChannelStatus.id)){
					if (VipThink.user.isStu){
						this._fview.off("showAnswerFace",this,this.onFeedback);
						this.updateCurrIndices();
						this.sendStuData();
						this.starTimeCount=-100000;
						this.courseTimeCount=-100000;
						Laya.stage.off("mousedown",this,this.onClickTiMuStageDown);
						Laya.stage.off("mouseup",this,this.onClickTiMuStageUp);
					}
					else if (VipThink.user.isTech){
						if (GlobalModel.globalData.currProg && GlobalModel.globalData.currProg.toString()!=[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx].toString())
							GlobalModel.globalData={currProg:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]};
					}
				}
				else{
				}
			}
		}
	}

	/**
	*监听应用端通过mate接口发送给laya的消息
	*/
	__proto.onNativeToLaya=function(param){
		var minorType=param.minorType;
		var data=param.data;
		if (minorType=="helpVideo"){
			if (data.act=="end"){
				console.debug(this.TAG+" 学生播完引导视频完毕");
				this.updateAnwserData(0,0,0,0);
			}
		}
		if (minorType=="respAISpiritData"){
			PersonalizedView.COURSE_TIME=data.time || PersonalizedView.COURSE_TIME;
			this.doesThisPageHaveAssistVideo=true;
		}
	}

	/**
	*更新用户数据
	*/
	__proto.updateCurrIndices=function(){
		var msg=VipThink.viewMgr.currPageIdx+"_"+VipThink.viewMgr.currSubviewIdx;
		VipThink.debugLog(this.TAG,"updateCurrIndices","currIndices",msg);
		TransManager.doTrans("updateUserCache",null,[[VipThink.user.id],["currIndices"],[[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]],false]);
	}

	__proto.updateUserDataLater=function(){
		VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChange);
	}

	__proto.onPageStatusChange=function(args){
		if (!args || args.status !="ctored")
			return;
		if (!VipThink.currView || VipThink.viewMgr.currPageIdx==-1 || !VipThink.currView || ["ctored","prepared"].indexOf(VipThink.currView.status)==-1){
			this.frameOnce(1,this,this.onPageStatusChange,[args]);
			return;
		}
		VipThink.viewMgr.mainView.off("changed",this,this.onPageStatusChange);
		this.updateCurrIndices();
		console.debug("PersonalizedView-------onPageStatusChange------学生答题数据：解锁");
		this.updateAnwserData(4,new Date().getTime(),0,0,true);
		Laya.stage.on("mousedown",this,this.onClickTiMuStageDown);
		Laya.stage.on("mouseup",this,this.onClickTiMuStageUp);
	}

	/**
	*更新学生答题数据
	*state:1 正确 2 错误 3答题中 null|0:未完成 4:思考中
	*startTs：开始答题时间
	*endTs： 结束答题时间 （答对了）
	*clear:是否先清理该关卡的信息
	*sysOrStu :是系统事件就是false 如果是学生做题改变数据true
	*/
	__proto.updateAnwserData=function(state,startTs,endTs,videoPlay,sysOrStu,sikaoing){
		(state===void 0)&& (state=0);
		(startTs===void 0)&& (startTs=0);
		(endTs===void 0)&& (endTs=0);
		(videoPlay===void 0)&& (videoPlay=0);
		(sysOrStu===void 0)&& (sysOrStu=false);
		(sikaoing===void 0)&& (sikaoing=false);
		if (!VipThink.currView){
			Laya.timer.frameOnce(1,this,this.updateAnwserData,[state,startTs,endTs,videoPlay,sysOrStu,sikaoing]);
			return;
		};
		var userNativeData=VipThink.user.getLessonData().stuSubjsAnwserData;
		var anwserData;
		if (!userNativeData){
			userNativeData={};
			anwserData={};
		}
		else{
			userNativeData=ObjectTools.copyObj(userNativeData);
			anwserData=userNativeData.anwserData || {};
		};
		var page=VipThink.viewMgr.currPageIdx;
		var subPage=VipThink.viewMgr.currSubviewIdx;
		var key=page+"_"+subPage;
		var obj;
		var curView=VipThink.viewMgr.currSubview;
		var challenge=0;
		if (curView && curView.config && curView.config.configObj){
			challenge=curView.config.configObj.challenge;
		}
		obj=anwserData[key] ? anwserData[key] :{};
		if (!sysOrStu && this.refNum==1 && sikaoing==false){
			if (obj.state > 0){
				return;
			}
		}
		if (sikaoing){
			if (obj.state==4 || obj.state==3 || obj.state==0 || !obj.state){
				obj.state=state;
			}
			else{
				Laya.stage.off("mousedown",this,this.onClickTiMuStageDown);
				Laya.stage.off("mouseup",this,this.onClickTiMuStageUp);
				return;
			}
		}
		else{
			obj.state=state;
		}
		if (startTs > 0){
			obj.startTs=startTs;
		}
		else{
			if (obj.startTs > 0){
			}
			else{
				obj.startTs=this.sTime;
			}
		}
		if (endTs > 0){
			obj.endTs=endTs;
		}
		obj.challenge=challenge;
		anwserData.pageIdx=page;
		anwserData.subjIdx=subPage;
		anwserData.videoPlay=videoPlay==null ? anwserData.videoPlay :videoPlay;
		anwserData.id=VipThink.user.id;
		anwserData.ts=new Date().getTime();
		anwserData[key]=obj;
		userNativeData.anwserData=anwserData;
		console.debug("PersonalizedView-------updateAnwserData---------学生所有答题数据："+JSON.stringify(anwserData));
		var result=obj["state"];
		if(result==1 || result==2){
			KlEventCenter.event("answer_result",{result:result,page:page,subPage:subPage,startTime:obj["startTs"],endTime:obj["endTs"]});
		}
		VipThink.userStatus.setUserProp(VipThink.user.id,"stuSubjsAnwserData",userNativeData,"setStuSubjsAnwserData");
	}

	/**
	*老师没有锁定就直接翻页的话，把翻页时间记录为上一关没有记录到的结束时间
	*/
	__proto.fillLastPageEndTs=function(anwserData,endTs){
		for (var key in anwserData){
			if (anwserData[key]){
				if (anwserData[key].startTs && !anwserData[key].endTs)
					anwserData[key].endTs=endTs;
				else if (anwserData[key].endTs && !anwserData[key].startTs && !anwserData[key].state)
				anwserData[key].endTs=null;
			}
		}
	}

	/**
	*当关卡发生变化的回调
	*/
	__proto.onLevelOrSubjChanged=function(oidxp,oidxv,idxp,idxv,force){
		if (oidxp !=idxp && oidxp !=-1){
			return;
		}
		this._wrongTime=0;
	}

	/**
	*反馈事件回调
	*/
	__proto.onFeedback=function(type){
		console.debug("PersonalizedView - onFeedback");
		this.courseTimeCount=0;
		this.starTimeCount=-100000;
		if (VipThink.user.isStu){
			if (type==1){
				this.updateAnwserData(1,0,new Date().getTime(),0,true);
				this._wrongTime=0;
				this.updateBtns(true,true,true);
			}
			else if (type==2){
				if (this._wrongTime < 3){
					this._wrongTime++;
				}
				if (this._wrongTime==3){
					this.answerErrorToNative();
					this._wrongTime=0;
				}
				this.updateAnwserData(2,0,new Date().getTime(),0,true);
				if (SwitchQuestionCtr.isCanSwitch()){
					this.updateBtns(true,true,true);
				}
			}
		}
		else{
			if (type==1){
				this.updateBtns(true,true);
			}
		}
	}

	/**
	*更新进度label
	*/
	__proto.updateLab=function(){
		if (!VipThink.currView || ["ctored","prepared"].indexOf(VipThink.currView.status)==-1){
			this.frameOnce(1,this,this.updateLab);
		}
		else{
			var currSubviewIdx=VipThink.viewMgr.currSubviewIdx;
			var len=VipThink.viewMgr.currPage.subViewsLength;
			if (len > 1){
				this._lab_subj.text=(currSubviewIdx+1)+" / "+len;
			}
			else{
				this._lab_subj.text=" 1/1 ";
			}
		}
	}

	/**
	*设置按钮的状态
	*@param value1
	*@param value2
	*@param isJump
	*
	*/
	__proto.updateBtns=function(value1,value2,isJump){
		(isJump===void 0)&& (isJump=false);
		if (!VipThink.currView || ["ctored","prepared"].indexOf(VipThink.viewMgr.mainView.status)==-1){
			this.frameOnce(1,this,this.updateBtns,[value1,value2,isJump]);
		}
		else{
			var currSubviewIdx=VipThink.viewMgr.currSubviewIdx;
			var len=VipThink.viewMgr.currPage.subViewsLength;
			var preEnabled=false;
			var nextEnabled=false;
			if (SwitchQuestionCtr.isCanSwitch()){
				preEnabled=nextEnabled=true;
			}
			else{
				if (len > 1){
					if (!value1 && !value2){
						preEnabled=nextEnabled=false;
					}
					else{
						if (!VipThink.currView.mouseEnabled){
							value1=value2=true;
						}
						preEnabled=currSubviewIdx==0 ? false :value1;
						nextEnabled=(currSubviewIdx==len-1)? false :value2;
					}
				}
				else{
					preEnabled=nextEnabled=false;
				}
			}
			this._bt_preSubj.mouseEnabled=preEnabled;
			this._bt_nextSubj.mouseEnabled=nextEnabled;
			if (nextEnabled && isJump){
				var currOtherSetting=GlobalModel.otherSetVO.getMyObject();
				if (currOtherSetting && currOtherSetting.autoOpenCutOffBoo){
					this.timer.once(2000,this,this.gotoNextPage,[1]);
				}
			}
			(this._bt_preSubj.getChildByName("arrow")).skin="share/ui/personalized_arrow_"+(preEnabled ? "white" :"gray")+".png";
			(this._bt_preSubj.getChildByName("lab")).alpha=preEnabled ? 1 :0.5;
			(this._bt_nextSubj.getChildByName("arrow")).skin="share/ui/personalized_arrow_"+(nextEnabled ? "white" :"gray")+".png";
			(this._bt_nextSubj.getChildByName("lab")).alpha=nextEnabled ? 1 :0.5;
		}
	}

	/**
	*添加或卸载监听
	*/
	__proto.addListener=function(value){
		if (value){
			if (VipThink.user.userType==2){
				this._img_drag.on("mousedown",this,this.onSpEvt,["mousedown"]);
				this._bt_nextSubj.on("click",this,this.onClick);
				this._bt_redo.on("click",this,this.onClick);
				this._bt_preSubj.on("click",this,this.onClick);
				this._bt_help.on("click",this,this.onClick);
				this._bt_no.on("click",this,this.onClick);
			}
			if (VipThink.user.userType==1){
			}
			VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChnage);
		}
		else{
			if (VipThink.user.userType==2){
				this._img_drag.off("mousedown",this,this.onSpEvt);
				this._bt_nextSubj.off("click",this,this.onClick);
				this._bt_redo.off("click",this,this.onClick);
				this._bt_preSubj.off("click",this,this.onClick);
				this._bt_help.off("click",this,this.onClick);
				this._bt_no.off("click",this,this.onClick);
				this._bot_stu.off("mousedown",this,this.onSpEvt);
				this._bot_stu.off("mousemove",this,this.onSpEvt);
				this._bot_stu.off("mouseup",this,this.onSpEvt);
			}
			if (VipThink.user.userType==1){
			}
			VipThink.viewMgr.mainView.off("changed",this,this.onPageStatusChnage);
		}
	}

	/**
	*当用户属性发生变化时回调(仅教师端监听)
	*/
	__proto.onLessonDataChange=function(data){
		if (data.action=="setStuSubjsAnwserData" && data.prop=="stuSubjsAnwserData"){
			if (data.nvalues && data.users && data.nvalues.length==data.users.length){
				for (var i=0;i < data.nvalues.length;i++){
					var v=data.nvalues[i];
					if ((typeof v=='object')){
						var anwserData=v.anwserData;
						if (anwserData){
							var subjsData={};
							for (var key in anwserData){
								if (key=="pageIdx" || key=="subjIdx" || key=="id" || key=="videoPlay"){
									subjsData[key]=anwserData[key];
								}
								else{
									if (!subjsData.subjsData){
										subjsData.subjsData={};
									}
									subjsData.subjsData[key]=anwserData[key];
								}
							};
							var o={args:{origin:"laya",mainType:2,minorType:"subjsAnwserData",data:subjsData}};
							var stuData=o.args.data;
							var curPageData=o.args.data.subjsData[stuData.pageIdx+"_"+stuData.subjIdx];
							if (curPageData){
								var date3=NaN,seconds=0;
								if (curPageData.endTs && curPageData.startTs){
									date3=curPageData.endTs-curPageData.startTs;
									seconds=Math.round(date3 / 1000);
									console.log("当前题目所化时间："+seconds);
								}
								if (curPageData.state==1 || curPageData.state==2){
									if (!curPageData.startTs){
										curPageData.state=3;
										console.log("@lianggongfa -1-- 数据error异常！"+JSON.stringify(o));
									}
									else{
										if (curPageData.endTs){
											if (curPageData.endTs < curPageData.startTs){
												console.log("@lianggongfa -2-- 数据error异常！"+JSON.stringify(o));
												curPageData.state=3;
											}
											else{
											}
										}
									}
								}
							}
							console.debug("PersonalizedView onLessonDataChange",JSON.stringify(o));
							VipThink.nativeAPI.mate(o);
						}
					}
				}
			}
		}
	}

	/**
	*学生控制组件的事件监听回调
	*/
	__proto.onSpEvt=function(act){
		if (act=="mousedown"){
			this.mouseThrough=false;
			this.on("mousemove",this,this.onSpEvt,["mousemove"]);
			this.on("mouseup",this,this.onSpEvt,["mouseup"]);
		}
		else if (act=="mousemove"){
			this._bot_stu.pos(this.mouseX,this.mouseY);
		}
		else if (act=="mouseup"){
			this.mouseThrough=true;
			this.off("mousemove",this,this.onSpEvt);
			this.off("mouseup",this,this.onSpEvt);
		}
	}

	/**
	*学生控制组件里的按钮点击回调
	*/
	__proto.onClick=function(evt){
		var subjIdx=VipThink.viewMgr.currSubviewIdx;
		switch (evt.target){
			case this._bt_preSubj:
				if (subjIdx <=0){
					return;
				}
				console.debug(this.TAG+"  学生切到上一关题"+VipThink.viewMgr.currPageIdx+"_"+(subjIdx-1));
				VipThink.viewMgr.mainView.activeResetPage=true;
				VipThink.viewMgr.setCurrPageIdx(VipThink.viewMgr.currPageIdx,subjIdx-1);
				this.updateUserDataLater();
				break ;
			case this._bt_nextSubj:
				this.gotoNextPage();
				break ;
			case this._bt_redo:
				console.debug(this.TAG+"  学生点击重做");
				VipThink.viewMgr.reset();
				break ;
			case this._bt_help:
				console.debug(this.TAG+"  学生点击请求精灵帮助");
				break ;
			case this._bt_no:
				console.debug(this.TAG+"  学生点击不需要精灵帮助");
				break ;
				break ;
			default :
				break ;
			}
	}

	__proto.gotoNextPage=function(obj){
		var currPageIdx=VipThink.viewMgr.currPageIdx;
		var currSubjIdx=VipThink.viewMgr.currSubviewIdx;
		var targetPage=0;
		var targetSubPage=0;
		if (SwitchQuestionCtr.isCanSwitch()){
			var data=SwitchQuestionCtr.getNextQuestion();
			if (data){
				targetPage=data["page"];
				targetSubPage=data["subPage"];
				if (currPageIdx==targetPage && currSubjIdx==targetSubPage){
					return;
				}
			}
			else{
				return;
			}
		}
		else{
			targetPage=currPageIdx;
			targetSubPage=currSubjIdx+1;
			if (currSubjIdx==VipThink.viewMgr.currPage.subViewsLength-1)
				return;
			var mv=VipThink.viewMgr.mainView;
			if (mv){
				var nextConfig=mv.pageCfgList[currPageIdx].subViews ? mv.pageCfgList[currPageIdx].subViews[targetSubPage].configObj :null;
				if (nextConfig && nextConfig.challenge){
					return;
				}
			}
		}
		console.debug(this.TAG+"  学生切到下一题:"+VipThink.viewMgr.currPageIdx+"_"+(targetSubPage));
		VipThink.viewMgr.mainView.activeResetPage=true;
		VipThink.viewMgr.setCurrPageIdx(targetPage,targetSubPage);
		this.updateUserDataLater();
		if (obj && Number(obj)==1){
			this.playEncourageSpine();
		}
	}

	/**
	*播放鼓励动画
	*当老师开启了自动跳关，并且学生做对了自动跳关了，到了下一关时候鼓励表扬一下动画
	*/
	__proto.playEncourageSpine=function(){
		var _$this=this;
		var aniUrl="share/animation/laba.sk";
		var sdurl="share/animation/laba.wav";
		if (this._skencourage==null){
			Laya.loader.load([ {url:"share/animation/laba.sk"},{url:"share/animation/laba.wav"},{url:"share/animation/laba.png"}],Handler.create(this,function(){
				_$this._skencourage=new KlSkeleton1(null,Klzz.aniMode);
				_$this._skencourage.load(aniUrl,Handler.create(this,function(){
					_$this._skencourage.x=-100;
					_$this._skencourage.y=Laya.stage.height;
					_$this._skencourage.width=293;
					_$this._skencourage.height=352;
					_$this._skencourage.currAniName="laba_idle";
					_$this._skencourage.play(_$this._skencourage.currAniName,true);
					this.addChild(_$this._skencourage);
					Tween.to(_$this._skencourage,{x:200,y:681},1500,Ease.linearOut,Handler.create(this,function(){
						_$this._skencourage.currAniName="laba_speak";
						_$this._skencourage.play(_$this._skencourage.currAniName,true);
						KlSoundManager.playSound(sdurl,1);
						this.timerOnce(2500,this,function(){
							_$this._skencourage.currAniName="laba_idle";
							_$this._skencourage.scaleX=-1;
							_$this._skencourage.play(_$this._skencourage.currAniName,true);
							Tween.to(_$this._skencourage,{x:-100,y:400},1000,Ease.linearOut,Handler.create(this,function(){
								_$this._skencourage.visible=false;
							}));
						});
					}));
				}));
			}));
		}
		else{
			this._skencourage.visible=true;
			this._skencourage.scaleX=1;
			this._skencourage.x=-100;
			this._skencourage.y=Laya.stage.height;
			this._skencourage.currAniName="laba_idle";
			this._skencourage.play(this._skencourage.currAniName,true);
			this.addChild(this._skencourage);
			Tween.to(this._skencourage,{x:200,y:681},1500,Ease.linearOut,Handler.create(this,function(){
				_$this._skencourage.currAniName="laba_speak";
				_$this._skencourage.play(_$this._skencourage.currAniName,true);
				KlSoundManager.playSound(sdurl,1);
				this.timerOnce(2500,this,function(){
					_$this._skencourage.currAniName="laba_idle";
					_$this._skencourage.scaleX=-1;
					_$this._skencourage.play(_$this._skencourage.currAniName,true);
					Tween.to(_$this._skencourage,{x:-100,y:400},1000,Ease.linearOut,Handler.create(this,function(){
						_$this._skencourage.visible=false;
					}));
				});
			}));
		}
	}

	/**
	*页面状态变化监听回调
	*/
	__proto.onPageStatusChnage=function(data){
		if (["ctored","prepared"].indexOf(data.status)!=-1){
			if (VipThink.user.isTech){
			}
			else if (VipThink.user.isStu){
				VipThink.viewMgr.mainView.off("changed",this,this.onPageStatusChnage);
				this.updateLab();
				this.laterUpdataBtns();
			}
		}
	}

	/**
	*延迟更新按钮状态
	*@return [description]
	*/
	__proto.laterUpdataBtns=function(){
		var _$this=this;
		if (!VipThink.currView){
			Laya.timer.frameOnce(1,this,this.laterUpdataBtns);
		}
		else{
			Laya.timer.frameOnce(5,this,function(){
				_$this.updateBtns(true,false);
			});
		}
	}

	// ////////////////////////////////////////AI精灵////////////////////////////////////////////////
	__proto.startAISpiritTimer=function(){
		this.timer.clear(this,this.onAiSpiritTimer);
		this.timer.loop(1000,this,this.onAiSpiritTimer);
	}

	__proto.stopAISpiritTimer=function(){
		this.timer.clear(this,this.onAiSpiritTimer);
	}

	__proto.onAiSpiritTimer=function(){
		if (VipThink.prohibitPersonalized){
			return;
		}
		this.starTimeCount++;
		this.courseTimeCount++;
		if (this.starTimeCount >=PersonalizedView.COURSE_TIME){
			var obj={args:{origin:"laya",mainType:2,minorType:"showAISpirit",data:{act:"startTimeOut",page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
			VipThink.nativeAPI.mate(obj);
			this.starTimeCount=-100000;
		}
		if (this.courseTimeCount >=PersonalizedView.COURSE_TIME){
			var o={args:{origin:"laya",mainType:2,minorType:"showAISpirit",data:{act:"answerTimeOut",page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
			VipThink.nativeAPI.mate(o);
			this.courseTimeCount=-100000;
			this.starTimeCount=-100000;
		}
	}

	/**
	*
	*答题错误上报
	*/
	__proto.answerErrorToNative=function(){
		if (VipThink.prohibitPersonalized){
			return;
		};
		var o={args:{origin:"laya",mainType:2,minorType:"showAISpirit",data:{act:"answerError",page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
		VipThink.nativeAPI.mate(o);
		console.log("连续答题错误3次 answerErrorToNative");
	}

	__proto.onAiSpiritPageStatusChange=function(){
		var o={args:{origin:"laya",mainType:2,minorType:"pageStatusChange",data:{act:"",page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx,VipThink.viewMgr.totalPageNum,VipThink.viewMgr.totalSubViewNum]}}};
		VipThink.nativeAPI.mate(o);
	}

	__proto.reqAISpiritDatas=function(){
		if (VipThink.prohibitPersonalized){
			return;
		};
		var o={args:{origin:"laya",mainType:2,minorType:"reqAISpiritData",data:{}}};
		VipThink.nativeAPI.mate(o);
	}

	/**
	*锁定状态修改
	*
	*/
	__proto.lockStatusChange=function(lock){
		var act="lock";
		if (!lock){
			act="unlock";
		};
		var o={args:{origin:"laya",mainType:2,minorType:"lockStatusChange",data:{act:act,page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
		VipThink.nativeAPI.mate(o);
	}

	__proto.reportHasVideoData=function(){
		if (this.enterTimer <=0){
			return;
		};
		var pid=this.preCurrentIdx;
		var sid=this.preSubIdx;
		if (!VipThink.config.courseCfg){
			return;
		};
		var pageConfig=VipThink.config.courseCfg.pages;
		if (!pageConfig)
			return;
		var curPageConfig=pageConfig[pid].subviews ? pageConfig[pid].subviews[sid] :pageConfig[pid];
		if (!curPageConfig){
			return;
		};
		var data={};
		data.eventName="visitPagesOfCourseware";
		var param={};
		param.roomId=this.getNumberFromString(GlobalModel.user.currentRoomId);
		if (!param.roomId)
			return;
		param.pageNumber=[pid+"",sid+""];
		param.allNumberOfExercises=pageConfig[pid].subviews ? pageConfig[pid].subviews.length :1;
		param.isChallengeExercise=curPageConfig.challenge ? "yes" :"no";
		param.coursewareID=VipThink.config.course;
		var haveStr="";
		if (this.doesThisPageHaveAssistVideo){
			haveStr="yes";
		}
		else{
			haveStr="no";
		}
		param.doesThisPageHaveAssistVideo=haveStr;
		param.entryTime=DateUtil.formatWithoutMs(Math.floor(this.enterTimer / 1000));
		param.leaveTime=DateUtil.formatWithoutMs(Math.floor(new Date().getTime()/ 1000));
		data.param=param;
		Reporter.reportData(3,data,null,{msg:"PersonalizedView.reportHasVideoData"});
	}

	/**
	*获取应用端版本是否支持
	*/
	__getset(0,__proto,'adaptNativeVersion',function(){
		if (VipThink.release=="dev"){
			return true;
		};
		var version=VipThink.config.version;
		VipThink.debugLog(this.TAG,"adaptNativeVersion","version:"+version+",Browser.onIOS:"+Browser.onIOS+",Browser.onAndroid"+Browser.onAndroid+",Browser.onPC"+Browser.onPC);
		if ((typeof version=='number'))
			version=String(version);
		if (version){
			version=VipThink.config.version.replace(/\./g,"");
			if (Browser.onIOS){
				version=version.split("-")[1];
				if (version){
					version=parseInt(version);
					if (version >=242)
						return true;
					else
					return false;
				}
				else{
					return false;
				}
			}
			if (Browser.onAndroid){
				version=parseInt(version);
				if (version >=224)
					return true;
				else
				return false;
			}
			if (Browser.onPC){
				version=parseInt(version);
				if (version >=210)
					return true;
				else
				return false;
			}
			return false;
		}
		else{
			return false;
		}
	});

	PersonalizedView.COURSE_TIME=35;
	PersonalizedView.uiView={"type":"View","props":{"width":1920,"visible":false,"height":1080},"child":[ {"type":"Box","props":{"y":699,"x":88,"width":162,"var":"_bot_stu","pivotY":31,"pivotX":81,"height":404},"child":[ {"type":"Image","props":{"width":162,"top":0,"skin":"share/ui/bg_white.png","sizeGrid":"23,25,23,20","right":0,"left":0,"height":401,"bottom":0,"alpha":0.7}},{"type":"Label","props":{"y":216,"width":130,"var":"_lab_subj","valign":"middle","text":"0/0","height":38,"fontSize":32,"font":"Arial","color":"#124ac3","centerX":0,"anchorY":0.5,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":53,"width":152,"var":"_img_drag","height":99,"centerX":0,"anchorY":0.5,"anchorX":0.5,"alpha":0.4},"child":[ {"type":"Line","props":{"y":38.500000000000114,"x":47,"toY":-1.1368683772161603e-13,"toX":58.15789473684215,"lineWidth":5,"lineColor":"#4e4b4b"}},{"type":"Line","props":{"y":51.500000000000114,"x":47,"toY":-1.1368683772161603e-13,"toX":58.15789473684215,"lineWidth":5,"lineColor":"#4e4b4b"}},{"type":"Line","props":{"y":64.50000000000011,"x":47,"toY":-1.1368683772161603e-13,"toX":58.15789473684215,"lineWidth":5,"lineColor":"#4e4b4b"}}]},{"type":"Button","props":{"y":149,"width":135,"var":"_bt_preSubj","stateNum":1,"skin":"share/ui/personalized_bt.png","sizeGrid":"8,8,8,8","height":85,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Image","props":{"y":25,"x":68,"skin":"share/ui/personalized_arrow_white.png","scaleY":2,"scaleX":2,"rotation":180,"name":"arrow","centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":61,"x":68,"text":"上一题","name":"lab","fontSize":30,"font":"Arial","color":"#ffffff","centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":279,"width":135,"var":"_bt_nextSubj","stateNum":1,"skin":"share/ui/personalized_bt.png","sizeGrid":"8,8,8,8","height":85,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Image","props":{"y":62,"x":68,"skin":"share/ui/personalized_arrow_white.png","scaleY":2,"scaleX":2,"name":"arrow","centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":27,"x":68,"text":"下一题","name":"lab","fontSize":30,"font":"Arial","color":"#ffffff","centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":364,"width":135,"var":"_bt_redo","stateNum":1,"skin":"share/ui/personalized_bt.png","sizeGrid":"8,8,8,8","height":68,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Image","props":{"y":15,"x":13,"skin":"share/ui/personalized_pen.png","scaleY":2.2,"scaleX":2.2}},{"type":"Label","props":{"y":33,"text":"重做","fontSize":30,"font":"Arial","color":"#ffffff","centerX":19,"bold":true,"anchorY":0.5,"anchorX":0.5}}]}]},{"type":"Box","props":{"y":540,"x":960,"width":1127,"visible":false,"var":"_box_spirit","height":696,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[ {"type":"Box","props":{"y":-192,"x":-396,"width":1920,"height":1080,"alpha":0.5},"child":[ {"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":0,"x":0,"width":1127,"skin":"share/ui/spirit_help.png","height":696}},{"type":"Button","props":{"y":443,"x":637,"width":291,"var":"_bt_help","stateNum":1,"skin":"share/ui/bt_yellow1.png","sizeGrid":"29,31,32,32","labelSize":40,"labelColors":"#ffffff","labelBold":false,"label":"求助小精灵","height":110}},{"type":"Button","props":{"y":443,"x":289,"width":291,"var":"_bt_no","stateNum":1,"skin":"share/ui/bt_gray.png","sizeGrid":"29,31,32,32","labelSize":40,"labelColors":"#999999","labelBold":false,"label":"不需要帮助","height":110}},{"type":"Label","props":{"y":143,"x":259,"width":713,"valign":"middle","text":"还不对哦\\n小朋友需要小精灵的帮助吗？","leading":10,"height":129,"fontSize":50,"font":"Microsoft YaHei","color":"#38C4C1","bold":true,"align":"center"}},{"type":"Label","props":{"y":295,"x":251,"width":737,"valign":"middle","text":"点击下面按钮，小精灵可能可以给你一些启发呢！","leading":10,"height":129,"fontSize":35,"font":"Arial","color":"#999999","bold":false,"align":"center"}}]}]};
	return PersonalizedView;
})(View)


//class com.subject.module.preview.PreviewView extends laya.ui.View
var PreviewView=(function(_super){
	function PreviewView(){
		this._box_notice=null;
		this._bt_jump=null;
		this._bt_redo=null;
		this.tipsLab=null;
		PreviewView.__super.call(this);
	}

	__class(PreviewView,'com.subject.module.preview.PreviewView',_super);
	var __proto=PreviewView.prototype;
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[
		{url:"share/sound/pra_wrong.wav",type:"sound"},
		{url:"share/sound/pra_wrong_language_2.wav",type:"sound"},
		{url:"share/sound/pra_wrong_language_3.wav",type:"sound"}]
		Laya.loader.load(res_arr);
		this.createView(PreviewView.uiView);
		this.visible=false;
		this._box_notice.visible=false;
		KlEventCenter.on("callPreviewUI",this,this.onCallPreviewUI);
		this._bt_jump.on("click",this,this.onCLick);
		this._bt_redo.on("click",this,this.onCLick);
		VipThink.viewMgr.on("changed",this,this.hideNotice);
		VipThink.viewMgr.on("mainViewPrepared",this,this.hideNotice);
		this._bt_redo.label=VipThink.getLanguageText(3);
		this.tipsLab.text=VipThink.getLanguageText(1);
	}

	//获取是不是要改变特殊的窗口文字 语音
	__proto.currPageChangeWinDow=function(){
		var mv=VipThink.viewMgr.mainView;
		var _curPage=VipThink.viewMgr.currPageIdx;
		var ViewConfig=mv.pageCfgList[_curPage].subViews ? mv.pageCfgList[_curPage].subViews[0].configObj :mv.pageCfgList[_curPage].configObj;
		if(ViewConfig.param&&ViewConfig.param.feedbackMode)
			return parseInt(ViewConfig.param.feedbackMode);
		return 0;
	}

	__proto.hideNotice=function(){
		this.visible=false;
	}

	__proto.onCLick=function(evt){
		switch(evt.target){
			case this._bt_jump:{
					KlEventCenter.event("callPreviewManager",[{action:"jump"}]);
					break ;
				}
			case this._bt_redo:{
					var curChange=this.currPageChangeWinDow();
					if(curChange==1){
						VipThink.nativeAPI.reset();
					}
					break ;
				}
			}
		this._box_notice.visible=false;
		this.visible=false;
	}

	// 显示新的预习提示页面
	__proto.onCallPreviewUI=function(evt){
		var act=evt.action;
		switch(act){
			case "showNotice":{
					this.visible=true;
					this.mouseEnabled=true;
					this.mouseThrough=false;
					this._box_notice.visible=true;
					var curFeedbackMode=this.currPageChangeWinDow();
					if(curFeedbackMode==0){
						var path=VipThink.getLanguageSound("share/sound/pra_wrong.wav");
						KlSoundManager.playSound(path);
						this._bt_jump.label=evt.isEnd ? VipThink.getLanguageText(4):VipThink.getLanguageText(2);
						}else{
						if(!this._box_notice)
							return;
						var _soundStr;
						var _titleLabel;
						var _btnLabel;
						var _notbtnLabel;
						var _bt_notJump=this._box_notice.getChildByName("jump");
						var _bgImag=this._box_notice.getChildAt(0);
						if(_bgImag)
							var _title=_bgImag.getChildAt(0);
						var _jumBtnLabel="开始下一题";
						if(curFeedbackMode==1){
							_soundStr="game_sound_yx/sound/pra_wrong01.mp3";
							_titleLabel="您的答案不正确哦，再仔细想一想吧！";
							_btnLabel="重新答题";
							}else if(curFeedbackMode==2){
							_soundStr="game_sound_yx/sound/pra_wrong02.mp3";
							_titleLabel="还有答案没有填写哦，请再仔细检查一下吧！";
							_btnLabel="继续答题";
						}
						this._bt_jump.label=evt.isEnd ? VipThink.getLanguageText(4):_jumBtnLabel;
						KlSoundManager.playSound(_soundStr);
						if(_bt_notJump)
							_bt_notJump.label=_btnLabel;
						if(_title)
							_title.text=_titleLabel;
					}
					break ;
				}
			default :{
					break ;
				}
			}
	}

	PreviewView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"y":352,"x":644,"width":632,"skin":"share/ui/green_bg.png","sizeGrid":"68,46,67,48","height":376,"centerY":0,"centerX":0},"child":[{"type":"Label","props":{"y":80,"wordWrap":true,"width":613,"var":"tipsLab","text":"您的答案不正确哦，再尝试一下别的解决办法吧!","leading":12,"height":108,"fontSize":41,"color":"#3cbea9","centerX":0,"align":"center"}},{"type":"ScaleButton","props":{"y":256,"width":232,"var":"_bt_jump","stateNum":1,"skin":"share/ui/btn_orange_1.png","sizeGrid":"0,41,0,34","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"练习下一题","centerX":-128,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":256,"width":232,"var":"_bt_redo","stateNum":1,"skin":"share/ui/btn_green_1.png","sizeGrid":"0,47,0,42","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":36,"labelColors":"#ffffff","labelBold":true,"label":"重新练习","centerX":128,"anchorY":0.5,"anchorX":0.5}}]}]}]};
	return PreviewView;
})(View)


//class com.subject.module.randominvite.RandomInviteView extends laya.ui.View
var RandomInviteView=(function(_super){
	function RandomInviteView(){
		this.stuBox=null;
		this.btnBox=null;
		this.addBtn=null;
		this.reduceBtn=null;
		this.stopBtn=null;
		this.startBtn=null;
		this.onAirBtn=null;
		this.settingBtn=null;
		this.numLab=null;
		this.closeBtn=null;
		this.settingBox=null;
		this.cmtBtn=null;
		this.board1=null;
		this.board2=null;
		this.bg1=null;
		this.bg2=null;
		this.closeSettingBtn=null;
		this.timeLab=null;
		this.tips=null;
		this.posBox=null;
		this.laohujiBox=null;
		this.tempStuNum=0;
		this.maxStuNum=4;
		this.roomStuNum=0;
		this._stuNum=1;
		this.choseStuList=null;
		this._allStuList=null;
		this._stuRandom=null;
		this.showStuType=0;
		this._outStuAry=null;
		this._viewData={};
		// 根据需要显示的学生个数设置学生位置
		this.stuPosArr=[[898],[775,1013],[605,889,1173],[495,769,1023,1283]]
		RandomInviteView.__super.call(this);
		this.maxStuNum=VipThink.originCourseType==11 ? 8 :4;
		this.visible=false;
		var res_arr=[{url:"res/atlas/share/ui/randomInvite.atlas",type:"atlas"},{url:"share/animation/laohuji.png",type:"image"},{url:"share/animation/laohuji.sk",type:"arraybuffer"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
		VipThink.viewMgr.on("nativeNotice",this,this.onNativeNotice);
		KlEventCenter.on("lessonEnd",this,this.onLessonEnd);
	}

	__class(RandomInviteView,'com.subject.module.randominvite.RandomInviteView',_super);
	var __proto=RandomInviteView.prototype;
	/**
	*@Author:Snow
	*@description:下课处理
	*@param {*}
	*@return {*}
	*/
	__proto.onLessonEnd=function(){
		this.visible=false;
	}

	__proto.onInitStuCameToNum=function(stuIdList){
		if (this._stuRandom==null && stuIdList){
			this._stuRandom=[];
			var len=stuIdList.length;
			for (var i=0;i < len;i++){
				this._stuRandom.push(0);
			}
		}
	}

	__proto.syncAction=function(actionType){
		VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView && (VipThink.viewMgr.currPage.currView.randomInviteViewAct=actionType);
	}

	__proto.doSyncAction=function(action){
		if (!VipThink.user.isStu)
			return;
		switch (action){
			case "turn":{
					this.syncAction("normal");
					this.switchTurntable(true);
					break ;
				}
			case "stop":{
					this.syncAction("normal");
					this.switchTurntable(false);
					this._viewData.stuList && (this.applyStuInfo(this._viewData.stuList));
					break ;
				}
			}
	}

	__proto.syncViewData=function(){
		var obj=JSON.parse(JSON.stringify(this._viewData));
		VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView && (VipThink.viewMgr.currPage.currView.randomInviteViewParam=obj);
	}

	__proto.onResLoad=function(){
		var UIBox=new RandomInviteViewUI();
		UIBox.name="randomInviteViewUIBox";
		this.addChild(UIBox);
		this.getComp(UIBox);
		this.init();
	}

	__proto.init=function(){
		for (var i=0;i < this.btnBox.numChildren;i++){
			var btn=this.btnBox.getChildAt(i);
			btn.on("click",this,this.onBtnClick);
		}
		this.addBtn.on("click",this,this.onBtnClick);
		this.reduceBtn.on("click",this,this.onBtnClick);
		this.cmtBtn.on("click",this,this.onBtnClick);
		this.closeBtn.on("click",this,this.onBtnClick);
		this.closeSettingBtn.on("click",this,this.onBtnClick);
		if (VipThink.userStatus.studentIDList)
			this.roomStuNum=VipThink.userStatus.studentIDList.length;
		this.stuNum=1;
		var stu1=this.stuBox.getChildAt(0);
		stu1.visible=this.board1.visible=this.bg1.visible=true;
		this.resetComp();
		if (VipThink.user.isStu)
			this.setStuUnVisible();
	}

	__proto.resetComp=function(){
		this.onAirBtn.disabled=true;
		this.resetTurnUI();
	}

	__proto.setStuUnVisible=function(){
		this.btnBox.visible=false;
	}

	__proto.switchTurntable=function(isGo){
		if(!this.stuBox)return;
		for (var i=0;i < this.stuBox.numChildren;i++){
			var stu=this.stuBox.getChildAt(i);
			if (!stu)
				continue ;
			var icon=stu.getChildAt(0);
			var stuInfoLab=stu.getChildAt(1);
			icon.visible=stuInfoLab.visible=!isGo;
			var ani=stu.getChildAt(2);
			ani.visible=isGo;
			if (isGo)
				ani.play(ani.currAniName,true);
		}
	}

	__proto.onBtnClick=function(evt){
		switch (evt.target){
			case this.addBtn:{
					this.stuNum=this.stuNum+1;
					break ;
				}
			case this.reduceBtn:{
					this.stuNum=this.stuNum-1==0 ? this.stuNum :this.stuNum-1;
					break ;
				}
			case this.cmtBtn:{
					this.showSettingBoxOrNot(false);
					this._viewData.showStuType=0;
					this.applyStuInfo(this.allStuList.slice(0,this._stuNum));
					this._viewData.stuList=this.allStuList.slice(0,this._stuNum);
					this._viewData.stuNum=this._stuNum;
					this.syncViewData();
					break ;
				}
			case this.startBtn:{
					this.settingBtn.disabled=this.onAirBtn.disabled=true;
					this.startBtn.visible=false;
					this.stopBtn.visible=true;
					this.switchTurntable(true);
					this.pickStu()
					this.startCountDown();
					this._viewData.turn=true;
					this._viewData.choseStuList=this.choseStuList;
					this.syncViewData();
					break ;
				}
			case this.stopBtn:{
					this.resetTurnUI();
					this.onAirBtn.disabled=false;
					this.switchTurntable(false);
					this._viewData.showStuType=1;
					this.applyStuInfo(this.choseStuList);
					this._viewData.stuList=this.choseStuList;
					this._viewData.turn=false;
					this._viewData.hasTurn=true;
					this.syncViewData();
					VipThink.nativeAPI.sendToNative("randomUser",{uidArr:this.choseStuList});
					break ;
				}
			case this.settingBtn:{
					this.tempStuNum=this.stuNum;
					this.stuNum=this._stuNum;
					this.showSettingBoxOrNot(true);
					this._viewData.hasTurn=false;
					break ;
				}
			case this.onAirBtn:{
					this.visible=false;
					this._viewData.visible=false;
					this.syncViewData();
					this.noticeNative({type:this.name,act:"onAir",data:{studentList:this.choseStuList}});
					break ;
				}
			case this.closeBtn:{
					this.visible=false;
					this._viewData.visible=false;
					this.syncViewData();
					this.noticeNative({type:this.name,act:"close"});
					break ;
				}
			case this.closeSettingBtn:{
					this.showSettingBoxOrNot(false)
					this.stuNum=this.tempStuNum;
					this.onBtnClick({target:this.closeBtn});
					break ;
				}
			}
	}

	__proto.resetTurnUI=function(){
		this.stopBtn.visible=false;;
		this.timeLab.text="停止";
		this.settingBtn.disabled=false;
		this.startBtn.visible=true;
		this.timer.clear(this,this.countDown);
	}

	__proto.startCountDown=function(){
		var sT=3;
		if (!this.timeLab){
			return;
		}
		this.timeLab.text="停止("+sT+")";
		this.timerOnce(1000,this,this.countDown,[sT]);
	}

	__proto.countDown=function(sT){
		sT--;
		if (!this.timeLab){
			return;
		}
		this.timeLab.text="停止("+sT+")";
		if (sT==0){
			this.onBtnClick({target:this.stopBtn});
		}
		else
		this.timerOnce(1000,this,this.countDown,[sT]);
	}

	__proto.noticeNative=function(args){
		VipThink.nativeAPI.noticeNative({args:args});
	}

	__proto.showSettingBoxOrNot=function(isShow){
		this.settingBox.visible=this.addBtn.visible=this.reduceBtn.visible=isShow;
		this.laohujiBox.visible=!isShow;
	}

	//处理应用传来的数据类型
	__proto.onSetRemarkName=function(data){
		this.updateRemarkName(String(data.id),data.remarkName);
	}

	/**
	*中途更新备注名
	*@param id
	*@param remarkName
	*
	*/
	__proto.updateRemarkName=function(id,remarkName){
		if (id && remarkName){
			for (var i=0;i < this.stuBox.numChildren;i++){
				var stu=this.stuBox.getChildAt(i);
				var stuInfoLab=stu.getChildAt(1);
				if (stuInfoLab && stuInfoLab.name==id){
					stuInfoLab.text=remarkName+"("+id.slice(id.length-3)+")";
					break ;
				}
			}
		}
	}

	__proto.pickStu=function(){
		this.shuffleArray(this.allStuList);
		this.choseStuList=this.allStuList.slice(0,this.stuNum);
		if (!this._stuRandom || this._stuRandom.length < this.stuNum){
			console.log("发生错误：学生上台记录数组小于老师选入的数量");
			return;
		}
		for (var i=0;i < this.stuNum;i++){
			this._stuRandom[i]++;
		}
		for (var j=0;j < this._stuRandom.length;j++){
			console.log("学生："+this.allStuList[j]);
			console.log("随机次数："+this._stuRandom[j]);
		}
	}

	__proto.shuffleArray=function(arr){
		if(arr&&arr.length>0){
			for (var i=0,len=arr.length;i < len;i++){
				var currentRandom=Math.floor(Math.random()*(len-1));
				var current=arr[i];
				arr[i]=arr[currentRandom];
				arr[currentRandom]=current;
				if(this._stuRandom && this._stuRandom.length > i){
					var curNum=this._stuRandom[i];
					this._stuRandom[i]=this._stuRandom[currentRandom];
					this._stuRandom[currentRandom]=curNum;
				}
			}
		};
		var temID=0;
		var temUerID=0;
		var stuLen=0;
		if(this._stuRandom && this._stuRandom.length > 0){
			stuLen=this._stuRandom.length;
		}
		for (var a=0;a < stuLen-1;a++){
			for (var b=0;b < this._stuRandom.length-1-a;b++){
				if (this._stuRandom[b] > this._stuRandom[b+1]){
					temID=this._stuRandom[b];
					this._stuRandom[b]=this._stuRandom[b+1];
					this._stuRandom[b+1]=temID;
					temUerID=arr[b];
					arr[b]=arr[b+1];
					arr[b+1]=temUerID;
				}
			}
		}
	}

	// 收到应用端通知
	__proto.onNativeNotice=function(args){
		if (args.act=="open"){
			this._viewData={};
			this.visible=true;
			KlEventCenter.event("hide_brushbox_notice");
			var data=args.data;
			if (!data || !data.studentList || !data.studentList[0]){
				console.debug("应用没有传过来学生id列表，臣妾做不到")
				return;
			}
			if (this.allStuList !=null && data.studentList){
				for (var i=0;i < this.allStuList.length;i++){
					var temID=this.allStuList[i];
					if (data.studentList.indexOf(temID)==-1){
						if (this._outStuAry==null)
							this._outStuAry=[];
						var temData={key:temID,value:this._stuRandom[i]}
						this._outStuAry.push(temData);
						this.allStuList.splice(i,1);
						this._stuRandom.splice(i,1);
					}
				}
			}
			if (this.allStuList !=null && data.studentList){
				for (var i=0;i < data.studentList.length;i++){
					var temID=data.studentList[i];
					if (this.allStuList.indexOf(temID)==-1){
						if (this._outStuAry==null || this._outStuAry.length==0){
							this.allStuList.unshift(temID);
							this._stuRandom.unshift(0);
						}
						else{
							var temI=true;
							for (var j=0;j < this._outStuAry.length;j++){
								if (this._outStuAry[j].key==temID){
									this.allStuList.push(temID);
									this._stuRandom.push(this._outStuAry[j].value);
									this._outStuAry.splice(j,1);
									temI=false;
									break ;
								}
							}
							if (temI){
								this.allStuList.unshift(temID);
								this._stuRandom.unshift(0);
							}
						}
					}
				}
			}
			if (this.allStuList==null)
				this.allStuList=data.studentList;
			this.roomStuNum=this.allStuList.length;
			this.stuNum=1;
			var tempList=this.allStuList.slice(0,this._stuNum);
			this._viewData.showStuType=0;
			this.applyStuInfo(tempList);
			this.roomStuNum=this.allStuList.length;
			this.onBtnClick({target:this.settingBtn});
			this._viewData.allStuList=this.allStuList;
			this._viewData.stuList=tempList;
			this._viewData.roomStuNum=this.roomStuNum;
			this._viewData.stuNum=this._stuNum;
			this._viewData.visible=true;
			this.syncViewData();
		}
		else if (args.act=="close"){
			this.visible=false;
			this._viewData.visible=false;
			this.syncViewData();
		}
	}

	// 显示学生信息
	__proto.applyStuInfo=function(stuIdList){
		var len=0;
		var stuBoxNum=this.stuBox.numChildren;
		if(stuIdList&&stuIdList.length>0){
			len=Math.min(stuIdList.length,stuBoxNum);
			}else{
			VipThink.debugLog("RandomInviteView","applyStuInfo","拿不到学生列表");
		}
		this.board1.visible=this.bg1.visible=len < 3;
		this.board2.visible=this.bg2.visible=len >=3;
		var curPosBox=this.posBox.getChildAt(len >=3 ? 1 :0);
		for (var j=0;j < curPosBox.numChildren;j++){
			var posBtn=curPosBox.getChildAt(j);
			var btn=this.btnBox.getChildAt(j);
			btn.width=posBtn.width;
			btn.pos(posBtn.x,posBtn.y);
		}
		for (var i=0;i < stuBoxNum;i++){
			var stu=this.stuBox.getChildAt(i);
			if(stuIdList){
				if(i <=len-1){
					stu.visible=true
					}else{
					stu.visible=false;
				}
				}else{
				stu.visible=false;
			}
			if (stu.visible){
				if(stuIdList && len>0){
					var posList=this.stuPosArr[len-1];
					if(posList){
						stu.x=posList[i];
					}
				};
				var stuInfo=VipThink.userStatus.getStudentByID(stuIdList[i]);
				if (!stuInfo)
					continue ;
				var icon=stu.getChildAt(0);
				var stuInfoLab=stu.getChildAt(1);
				var id=String(stuIdList[i]);
				var stuName=(stuInfo.remarkName && stuInfo.remarkName !="")? stuInfo.remarkName :stuInfo.name;
				stuName=this.dealName(stuName);
				if (this.showStuType==0){
					stuInfoLab.text="?????";
					icon.skin="share/ui/RandomHead.png";
				}
				else{
					if(id&&id.length>0){
						stuInfoLab.text=stuName+"("+id.slice(id.length-3)+")";
					}
					icon.skin=stuInfo.headerImg;
				}
				icon.visible=true;
				stuInfoLab.visible=true;
			}
		}
	}

	// 限制名字显示长度
	__proto.dealName=function(stuName){
		var i=0;
		var tempStr="";
		for (var j=0;j < stuName.length;j++){
			var code=stuName.charCodeAt(j);
			if (code >=19968 && code <=40869)
				i+=2;
			else
			i++;
			tempStr+=stuName[j];
			if (i >=8){
				return tempStr;
			}
		}
		return tempStr;
	}

	__proto.getComp=function(box){
		for (var i=0;i < box.numChildren;i++){
			var comp=box.getChildAt(i);
			if (comp.name){
				this[comp.name]=comp;
			}
			this.getComp(comp);
		}
	}

	__getset(0,__proto,'allStuList',function(){
		this._allStuList || (this._allStuList=VipThink.userStatus.studentIDList);
		return this._allStuList;
		},function(value){
		this._allStuList=value;
	});

	__getset(0,__proto,'viewData',function(){
		return this._viewData;
		},function(value){
		var isTurn=!this._viewData.turn && value.turn;
		if (VipThink.user.isTech)
			isTurn=this._viewData.turn;
		this._viewData=value;
		if (!this._viewData)
			return;
		this.visible=this._viewData.visible;
		if (this.allStuList==null)
			this.allStuList=this._viewData.allStuList;
		this.roomStuNum=this._viewData.roomStuNum;
		this.choseStuList=this._viewData.choseStuList;
		this.stuNum=this._viewData.stuNum;
		this.showStuType=this._viewData.showStuType;
		if (isTurn){
			this.switchTurntable(true);
		}
		else{
			this.switchTurntable(false);
			if (this._viewData.stuList){
				this.applyStuInfo(this._viewData.stuList);
			}
		}
		if(this.onAirBtn){
			this.onAirBtn.disabled=this._viewData.hasTurn ? false :true;
		}
		if (isTurn && this.onAirBtn)
			this.onAirBtn.disabled=true;
		this.onInitStuCameToNum(this.allStuList);
	});

	__getset(0,__proto,'stuNum',function(){
		return this._stuNum;
		},function(value){
		this._stuNum=value;
		if (!this.numLab){
			return;
		}
		this.numLab.text=String(this._stuNum);
		this.addBtn.disabled=(this.stuNum==this.maxStuNum || this.stuNum==this.roomStuNum);
		this.reduceBtn.disabled=this.stuNum==1;
	});

	return RandomInviteView;
})(View)


//class com.subject.module.randominvite.RandomInviteViewUI extends laya.ui.View
var RandomInviteViewUI=(function(_super){
	function RandomInviteViewUI(){
		this.titleLabel=null;
		RandomInviteViewUI.__super.call(this);
	}

	__class(RandomInviteViewUI,'com.subject.module.randominvite.RandomInviteViewUI',_super);
	var __proto=RandomInviteViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this)
		this.createView(RandomInviteViewUI.uiView);
		this.titleLabel.text=VipThink.getLanguageText(6);
	}

	RandomInviteViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.3},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"y":0,"x":0,"name":"laohujiBox"},"child":[{"type":"Box","props":{"y":0,"x":0,"name":"btnBox","mouseThrough":true},"child":[{"type":"Button","props":{"y":776,"x":387,"width":307,"stateNum":1,"skin":"share/ui/randomInvite/reset.png","name":"settingBtn","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,38"},"child":[{"type":"Label","props":{"text":"重设人数","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":730,"width":460,"stateNum":1,"skin":"share/ui/randomInvite/start.png","name":"startBtn","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,41"},"child":[{"type":"Label","props":{"text":"开始","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":1226,"width":307,"stateNum":1,"skin":"share/ui/randomInvite/onair.png","name":"onAirBtn","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,51,0,40"},"child":[{"type":"Label","props":{"text":"上台","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":730,"width":460,"stateNum":1,"skin":"share/ui/randomInvite/stop.png","name":"stopBtn","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,49,0,44"},"child":[{"type":"Label","props":{"y":47,"x":231,"text":"停止","name":"timeLab","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":164,"x":1399,"stateNum":1,"skin":"share/ui/randomInvite/close.png","name":"closeBtn"}}]},{"type":"Image","props":{"y":324,"x":660,"width":602,"visible":false,"skin":"share/ui/randomInvite/bg1.png","sizeGrid":"31,32,36,34","name":"bg1","height":360}},{"type":"Image","props":{"y":326,"x":431,"width":1054,"visible":false,"skin":"share/ui/randomInvite/bg1.png","sizeGrid":"31,32,36,34","name":"bg2","height":354}},{"type":"Box","props":{"y":0,"x":0,"name":"stuBox","mouseThrough":true},"child":[{"type":"Box","props":{"y":341,"x":605,"width":125,"visible":false,"height":396},"child":[{"type":"Image","props":{"y":138,"x":65,"width":84,"skin":"share/ui/randomInvite/close.png","height":84,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":208,"x":66,"text":"xxx(xxx)","fontSize":28,"color":"#000000","anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":388,"x":429,"visible":false,"url":"share/animation/laohuji.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"d3"}}]},{"type":"Box","props":{"y":341,"x":889,"width":125,"visible":false,"height":396},"child":[{"type":"Image","props":{"y":138,"x":65,"width":84,"skin":"share/ui/randomInvite/close.png","height":84,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":208,"x":66,"text":"xxx(xxx)","fontSize":28,"color":"#000000","anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":388,"x":161,"visible":false,"url":"share/animation/laohuji.sk","stopAt":0,"isLoop":"false","currAniName":"d4"}}]},{"type":"Box","props":{"y":341,"x":1173,"width":125,"visible":false,"height":396},"child":[{"type":"Image","props":{"y":138,"x":65,"width":84,"skin":"share/ui/randomInvite/close.png","height":84,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":208,"x":66,"text":"xxx(xxx)","fontSize":28,"color":"#000000","anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":388,"x":-96,"visible":false,"url":"share/animation/laohuji.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"d5"}}]},{"type":"Box","props":{"y":341,"x":1283,"width":125,"visible":false,"height":396},"child":[{"type":"Image","props":{"y":138,"x":65,"width":84,"skin":"share/ui/randomInvite/close.png","height":84,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":208,"x":66,"text":"xxx(xxx)","fontSize":28,"color":"#000000","anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":388,"x":-355,"visible":false,"url":"share/animation/laohuji.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"d6"}}]}]},{"type":"Image","props":{"y":450,"x":959,"width":703,"visible":false,"skin":"share/ui/randomInvite/kuang.png","name":"board1","height":572,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":157,"x":381,"width":1154,"visible":false,"skin":"share/ui/randomInvite/kuang2.png","name":"board2","height":577}},{"type":"Label","props":{"y":204,"x":766,"width":384,"var":"titleLabel","text":"随机邀请","height":45,"fontSize":45,"color":"#ffffff","align":"center"}},{"type":"Label","props":{"y":487,"x":820,"width":180,"visible":false,"text":"等学生进来再试试吧~","name":"tips","height":45,"fontSize":30,"color":"#b9a799"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"name":"settingBox","mouseThrough":false,"height":1080},"child":[{"type":"Box","props":{"width":1920,"height":1080,"alpha":0.3},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":313,"x":705,"skin":"share/ui/randomInvite/kuang3.png"}},{"type":"Image","props":{"y":395,"x":736,"width":440,"skin":"share/ui/randomInvite/kuang4.png","height":200,"sizeGrid":"25,28,22,21"}},{"type":"Image","props":{"y":490,"x":887,"width":140,"skin":"share/ui/randomInvite/kuang5.png","height":60,"sizeGrid":"7,10,12,12"}},{"type":"Button","props":{"y":490,"x":1072,"stateNum":1,"skin":"share/ui/randomInvite/add.png","name":"addBtn","labelStrokeColor":"#000000"}},{"type":"Button","props":{"y":490,"x":786,"stateNum":1,"skin":"share/ui/randomInvite/reduce.png","name":"reduceBtn","labelStrokeColor":"#000000"}},{"type":"Label","props":{"y":341,"x":893,"text":"随机邀请","fontSize":30,"color":"#000000","bold":true}},{"type":"Label","props":{"y":422,"x":869,"text":"设置邀请人数","fontSize":30,"color":"#000000","bold":false}},{"type":"Label","props":{"y":520,"x":959,"text":"1","name":"numLab","fontSize":30,"color":"#000000","bold":false,"anchorY":0.5,"anchorX":0.5}},{"type":"Button","props":{"y":623,"x":848,"width":220,"stateNum":1,"skin":"share/ui/randomInvite/cmt.png","name":"cmtBtn","labelStrokeColor":"#000000","height":54},"child":[{"type":"Label","props":{"y":28,"x":110,"text":"确定","fontSize":25,"color":"#ffffff","bold":false,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":294,"x":1171,"stateNum":1,"skin":"share/ui/randomInvite/close2.png","name":"closeSettingBtn","labelStrokeColor":"#000000"}}]},{"type":"Box","props":{"visible":false,"name":"posBox"},"child":[{"type":"Box","props":{},"child":[{"type":"Button","props":{"y":776,"x":617,"width":225,"stateNum":1,"skin":"share/ui/randomInvite/reset.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,38"},"child":[{"type":"Label","props":{"text":"重设人数","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":851,"width":225,"stateNum":1,"skin":"share/ui/randomInvite/start.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,41"},"child":[{"type":"Label","props":{"text":"开始","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":1086,"width":225,"stateNum":1,"skin":"share/ui/randomInvite/onair.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,51,0,40"},"child":[{"type":"Label","props":{"text":"上台","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":851,"width":225,"stateNum":1,"skin":"share/ui/randomInvite/stop.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,49,0,44"},"child":[{"type":"Label","props":{"y":47,"x":231,"text":"停止","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":164,"x":1220,"stateNum":1,"skin":"share/ui/randomInvite/close.png"}}]},{"type":"Box","props":{"y":0,"x":0},"child":[{"type":"Button","props":{"y":776,"x":387,"width":307,"stateNum":1,"skin":"share/ui/randomInvite/reset.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,38"},"child":[{"type":"Label","props":{"text":"重设人数","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":730,"width":460,"stateNum":1,"skin":"share/ui/randomInvite/start.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,42,0,41"},"child":[{"type":"Label","props":{"text":"开始","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":1226,"width":307,"stateNum":1,"skin":"share/ui/randomInvite/onair.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,51,0,40"},"child":[{"type":"Label","props":{"text":"上台","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5}}]},{"type":"Button","props":{"y":776,"x":730,"width":460,"stateNum":1,"skin":"share/ui/randomInvite/stop.png","labelStrokeColor":"#000000","height":93,"sizeGrid":"0,49,0,44"},"child":[{"type":"Label","props":{"y":47,"x":231,"text":"停止","fontSize":35,"color":"#ffffff","centerY":0.5,"centerX":0.5,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Button","props":{"y":164,"x":1397,"stateNum":1,"skin":"share/ui/randomInvite/close.png"}}]}]}]};
	return RandomInviteViewUI;
})(View)


/**
*进入挑战题前的弹框界面
*/
//class com.subject.module.specialklview.rush.RushView extends laya.ui.View
var RushView=(function(_super){
	function RushView(){
		this.kuang1=null;
		this.kuang2=null;
		this.kuang_word=null;
		this.word=null;
		this.star=null;
		this.btn_ok=null;
		this.btn_no=null;
		this.anime=null;
		this.fc_clock=null;
		this.box_clock=null;
		this.panel=null;
		this.mk=null;
		this.bg=null;
		this.lastPageIdx=0;
		this.jumpToPageIdx=-1;
		// 课堂回顾时由于保存本地数据
		this.localDataObj={};
		this.panelAniMap={
			"animation" :"animation2",
			"animation2" :"animation3"
		};
		this._indices=null;
		/**
		*viewmanager的jumpOrNot事件回调
		*/
		this.isBack=false;
		this.subViewNum=0;
		this.syncCount=0;
		this._sec=0;
		this._min=0;
		this.dataObj={};
		this.hasShowAni1=0;
		this.hasShowAni2=false;
		RushView.__super.call(this);
		this.visible=false;
		this.mouseThrough=true;
		this.name="rushView";
		this.onPrepared();
		VipThink.viewMgr.on("mainViewPrepared",this,this.onMainViewPrepared);
		GlobalModel.instance.on("changed",this,this.onGlobalModelChange);
		VipThink.viewMgr.on("wiilJumpPage",this,this.onJumpOrNot);
		VipThink.viewMgr.on("jumpToPage",this,this.onJumpToPage);
		if(VipThink.user.isStu || VipThink.cfgCourse.isReViewLesson)
			VipThink.viewMgr.feedBackView.on("showAnswerFace",this,this.onShowAnswerFace);
	}

	__class(RushView,'com.subject.module.specialklview.rush.RushView',_super);
	var __proto=RushView.prototype;
	__proto.onJumpToPage=function(idx){
		this.jumpToPageIdx=idx;
	}

	// 翻页成功后会执行这个
	__proto.onMainViewPrepared=function(){
		this.lastPageIdx=VipThink.viewMgr.currPageIdx;
		this.bg.visible=this.anime.visible=false;
		if(!this.checkIsCurViewRush(false)){
			this.visible=false;
			if(!this.checkCurIsResultView()){
				this.reset();
				this.dataObj={};
				this.upLoadData();
				VipThink.viewMgr.currPage.currView.rushViewAct=[];
			}
			else {
				console.debug("RushView - onMainViewPrepared - 清除做题数据");
			}
		}
		else{
			this.visible=true;
			this.mk.visible=this.panel.visible=false;
			if(!this.clockVisible && (VipThink.user.isStu || VipThink.cfgCourse.isReViewLesson))
				this.clockVisible=true;
		}
	}

	__proto.checkCurIsResultView=function(){
		var mvCfg=VipThink.viewMgr.mainView.pageCfgList;
		var curIdx=VipThink.viewMgr.currPageIdx;
		console.log("当前页数:"+curIdx);
		if(mvCfg[curIdx].type=="rushResult"){
			return true;
		}
		return false;
	}

	__proto.reset=function(){
		this.hasShowAni1=0;
		this.hasShowAni2=false;
		this.box_clock.visible=this.panel.visible=this.mk.visible=false;
		console.warn("重置了参数");
	}

	// 处理断线重连情况重新显示功能壳
	__proto.onPrepared=function(){
		this.getData();
		this.timer.clear(this,this.onCount);
		if(this.checkIsCurViewRush()){
			this.visible=true;
			this.clockVisible=true;
		}
		this.onGlobalModelChange(GlobalModel.globalData);
	}

	__proto.checkIsCurViewRush=function(needClearData){
		(needClearData===void 0)&& (needClearData=true);
		var mvCfg=VipThink.viewMgr.mainView.pageCfgList;
		var curIdx=VipThink.viewMgr.currPageIdx;
		console.log("当前页数:"+curIdx);
		if(mvCfg[curIdx].expand !="rush"){
			if(needClearData && !this.checkCurIsResultView()){
				this.dataObj={};
				this.upLoadData();
			}
			return false;
		}
		else
		return true;
	}

	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(RushView.uiView);
	}

	/**
	*全局数据变化回调
	*/
	__proto.onGlobalModelChange=function(data){
		if (!VipThink.currView){
			this.frameOnce(1,this,this.onGlobalModelChange,[data]);
			return;
		}
		this.panel.visible=this.mk.visible=false;
		this.visible && VipThink.viewMgr.event("hidePersonal");
		var bChannelStatus=data.bChannelStatus;
		if (bChannelStatus){
			if (bChannelStatus.id==0 && bChannelStatus.editorID==0){
				if(VipThink.viewMgr.getView("rushView").visible){
					if (VipThink.user.isStu){
						if(this.dataObj){
							if(this.dataObj.startTime){
								this.panel.visible=this.mk.visible=false;
								this.clockVisible=true;
							}
							if(this.dataObj.hasShowResult){
								this.mk.visible=this.panel.visible=false;
								this.timer.clear(this,this.onCount);
							}
						}
					}
				}
			}
			else{
				if (VipThink.user.isTech){
					if(VipThink.viewMgr.getView("rushView").visible){
						if(!this.panel.visible){
							this.clockVisible=false;
						}
					}
				}
			}
		}
		else if(data.otherSetting){
			this.mk.visible=this.panel.visible=false;
			if(!VipThink.user.isStu)
				if(this.visible){
				var wm=data.otherSetting.watchMap;
				var stuId=0;
				for(var k=0 in wm){
					if(k==VipThink.user.id){
						stuId=wm[k];
					}
				}
				if(!stuId){
					this.clockVisible=false;
					return;
				}
				this.getData(stuId);
				this.clockVisible=true;
				if(this.dataObj.hasShowResult){
					this.mk.visible=false;
					this.timer.clear(this,this.onCount);
				}
			}
		}
	}

	__proto.getData=function(stuId){
		var d;
		if(VipThink.user.userType==2){
			d=VipThink.userStatus.getStudentByID(VipThink.user.id);
		}
		else{
			if(stuId)
				d=VipThink.userStatus.getStudentByID(stuId);
		}
		if(d && d.parkResult){
			var data=JSON.parse(d.parkResult);
			this.dataObj=data;
		}
	}

	__proto.onShowAnswerFace=function(type){
		console.debug("RushView - 监听showAnswerFace回调");
		if(!this.checkIsCurViewRush())
			return;
		if(VipThink.user.isStu && this.visible && ((GlobalModel.globalData.bChannelEditor==VipThink.user.id && GlobalModel.globalData.bChannelEditor==GlobalModel.globalData.bChannel)|| GlobalModel.globalData.bChannelEditor==0)){
			this.dataObj.answers || (this.dataObj.answers=[]);
			this.dataObj.answers[VipThink.viewMgr.currSubviewIdx]=type==1 ? true :false;
			this.upLoadData();
			var pageCfgList=VipThink.viewMgr.mainView.pageCfgList;
			var curPageIdx=VipThink.viewMgr.currPageIdx;
			this.subViewNum=pageCfgList[curPageIdx].subViews.length;
			console.log("当前页码")
			console.log(VipThink.viewMgr.currSubviewIdx)
			console.log("关最大索引")
			console.log(this.subViewNum-1)
			if(VipThink.viewMgr.currSubviewIdx >=this.subViewNum-1){
				this.timer.clear(this,this.onCount);
				this.canAct=false;
			}
			else{
				this.dataObj.sub++;
				this.upLoadData();
				VipThink.viewMgr.mainView.activeResetPage=1;
				VipThink.viewMgr.currSubviewIdx++;
			}
		}
		if(VipThink.cfgCourse.isReViewLesson){
			var sIdx=VipThink.viewMgr.currSubviewIdx;
			if(!this.localDataObj.answer)
				this.localDataObj.answer=[];
			this.localDataObj.answer[sIdx]=(type==1 ? true :false);
		}
	}

	__proto.checkIsAllShowResult=function(){
		var idList=VipThink.userStatus.studentIDList;
		for (var i=0;i < idList.length;i++){
			var id=idList[i];
			var d;
			d=VipThink.userStatus.getStudentByID(id);
			if(d && d.parkResult){
				var data=JSON.parse(d.parkResult);
				if(!data.hasShowResult)
					return false;
			}
			else
			return false;
		}
		return true;
	}

	__proto.onJumpOrNot=function(oIdxp,oIdxs,nIdxp,nIdxs,force,handler){
		if (VipThink.viewMgr.currPageIdx==nIdxp && VipThink.viewMgr.currSubviewIdx==nIdxs)
			return;
		var mv=VipThink.viewMgr.mainView;
		var jump=true;
		var mvCfg=VipThink.viewMgr.mainView.pageCfgList;
		if(this.jumpToPageIdx !=-1){
			handler.runWith([this.jumpToPageIdx,nIdxs,force,jump]);
			console.debug("RushView - onJumpOrNot - 想跳转到选择路线的前一页");
			this.jumpToPageIdx=-1;
			return;
		}
		if(mv.pageCfgList[nIdxp].expand=="rush" && oIdxp==nIdxp+1){
			handler.runWith([oIdxp-2,nIdxs,force,jump]);
			console.debug("RushView - onJumpOrNot - 想跳转到闯关前一页");
			return;
		}
		else if(mv.pageCfgList[nIdxp].type=="rushResult" && oIdxp==nIdxp+1){
			handler.runWith([oIdxp-3,nIdxs,force,jump]);
			console.debug("RushView - onJumpOrNot - 想跳转到闯关前一页");
			return;
		}
		if(VipThink.user.isTech && oIdxp==nIdxp && ((oIdxs+1==nIdxs)|| (oIdxs-1==nIdxs))){
			handler.runWith([nIdxp,nIdxs,force,jump]);
			if(oIdxs+1==nIdxs)
				console.debug("RushView - onJumpOrNot - 想跳转到下一题");
			else if(oIdxs-1==nIdxs)
			console.debug("RushView - onJumpOrNot - 想跳转到上一题");
			return;
		}
		this.isBack=VipThink.viewMgr.currPageIdx > nIdxp;
		if (oIdxp !=-1 && oIdxs !=-1 && oIdxp !=nIdxp){
			if (mv){
				var nextConfig=mv.pageCfgList[nIdxp] || null;
				if (nextConfig && nextConfig.expand=="rush"){
					if (VipThink.viewMgr.getView("rushView")&& VipThink.user.isTech){
						nIdxs=0;
						this.indices=[nIdxp,nIdxs];
						if (VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
							if(!(VipThink.viewMgr.routeController && VipThink.viewMgr.routeController.isToDIffRoute(oIdxp,nIdxp)))
								VipThink.viewMgr.currPage.currView.rushViewParam=[nIdxp,nIdxs];
							jump=false;
							this.canAct=false;
							if(this.isBack){
								this.dataObj=null;
								this.upLoadData();
								VipThink.viewMgr.getView("rushView").visible=false;
								jump=true;
							}
						}
					}
				}
				else{
					if(this.isBack){
						VipThink.viewMgr.getView("rushView").visible=false;
					}
				}
			}
		}
		handler.runWith([nIdxp,nIdxs,force,jump]);
	}

	__proto.updateTimeUI=function(){
		var ms=String(this.min);
		var ss=String(this.sec);
		if(ms.length==1)
			ms="0"+ms;
		if(ss.length==1)
			ss="0"+ss;
		this.fc_clock.value=ms+":"+ss;
	}

	__proto.startCount=function(){
		this.timerLoop(1000,this,this.onCount);
	}

	__proto.onCount=function(){
		this.sec++;
		if(this.sec==60){
			this.min++;
			this.sec=0;
		}
	}

	__proto.onBtnClick=function(evt){
		var _$this=this;
		if (VipThink.user.userType !=1)
			return;
		var currView=VipThink.viewMgr.currPage.currView;
		if (!currView)
			return;
		if (this._indices){
			if(evt.target==this.btn_ok){
				console.debug("RushView - onBtnClick - 进入闯关");
				this.mk.visible=true;
				this.panel.play("animation3",false);
				currView.rushViewAct=["anime",this.panel.name,"animation3",false];
				this.panel.once("end",this,function(){
					_$this.panel.visible=false;
					_$this.bg.visible=_$this.anime.visible=true;
					_$this.anime.play("idle3",false);
					_$this.anime.once("end",this,function(){
						_$this.anime.play("qie3",false);
						_$this.anime.once("end",this,function(){
							VipThink.viewMgr.jumpToPage(_$this._indices[0],_$this._indices[1],true);
							console.debug("RushView - onBtnClick - 跳到第"+_$this._indices[0]+"关 第"+_$this._indices[1]+"页");
						})
					})
				});
			}
			else{
				console.debug("RushView - onBtnClick - 跳过闯关");
				this.panel.visible=false;
				currView.rushViewAct=["hidePanel"];
				this.dataObj.hasShowResult=true;
				this.upLoadData();
				Laya.timer.frameOnce(5,this,function(){
					VipThink.viewMgr.jumpToPage(_$this._indices[0]+2,_$this._indices[1],true);
					console.debug("RushView - onBtnClick - 跳到第"+(_$this._indices[0]+2)+"关");
				});
			}
		}
	}

	__proto.checkIsBack=function(idx){
		var curIdx=VipThink.viewMgr.currPageIdx;
		if(idx < curIdx)
			return true
		return false;
	}

	__proto.upLoadData=function(){
		var jsonStr=JSON.stringify(this.dataObj);
		VipThink.userStatus.setUserProp(VipThink.user.id,"parkResult",jsonStr,'setParkResult');
	}

	__proto.syncTech=function(v){
		if(!VipThink.user.isStu && v){
			this.fc_clock.visible=this.box_clock.visible=v.clock;
			this.sec=v.sec;
			this.min=v.min;
			this.fc_clock.visible && this.startCount();
		}
	}

	__proto.showAnime=function(){
		var _$this=this;
		if(VipThink.user.isStu){
			if(this.checkCurIsResultView())
				return;
			if(this.hasShowAni2){
				this.mk.visible=this.panel.visible=false;
				return;
			}
			this.hasShowAni2=true;
			this.panel.play("animation3",false);
			console.warn("播了动画");
			VipThink.viewMgr.currPage.currView.rushViewAct=[];
			this.panel.once("end",this,function(){
				_$this.panel.visible=false;
				_$this.bg.visible=_$this.anime.visible=true;
				_$this.anime.play("idle3",false);
				_$this.anime.once("end",this,function(){
					_$this.anime.play("qie3",false);
					_$this.anime.once("end",this,function(){
						_$this.mk.visible=_$this.panel.visible=false;
					})
				})
			});
		}
	}

	__proto.syncAction=function(data){
		if(!data[0]){
			return;
		}
		else if(data[0]=="observe"){
			this.syncTech(data[2]);
		}
		else if(data[0]=="anime"){
			this.showAnime();
		}
		else if(data[0]=="hidePanel"){
			this.panel.visible=false;
		}
	}

	__getset(0,__proto,'canAct',null,function(v){
		VipThink.viewMgr.currPage.currView.mouseEnabled=v;
	});

	__getset(0,__proto,'indices',null,function(value){
		this._indices=value;
	});

	__getset(0,__proto,'sec',function(){
		return this._sec;
		},function(v){
		this._sec=v;
		this.updateTimeUI();
	});

	__getset(0,__proto,'min',function(){
		return this._min;
		},function(v){
		this._min=v;
		this.updateTimeUI();
	});

	__getset(0,__proto,'clockVisible',null,function(v){
		var startDate;
		if(v){
			if(!startDate){
				this.dataObj && (startDate=this.dataObj.startTime);
				if(!startDate){
					var date=new Date();
					startDate=[date.getHours(),date.getMinutes(),date.getSeconds()];
					this.dataObj.startTime=[startDate[0],startDate[1],startDate[2]];
					this.upLoadData();
				}
			};
			var det;
			var curDate=new Date();
			if(this.dataObj.endTime){
				det=[this.dataObj.endTime[0]-startDate[0],this.dataObj.endTime[1]-startDate[1],this.dataObj.endTime[2]-startDate[2]];
			}
			else{
				det=[curDate.getHours()-startDate[0],curDate.getMinutes()-startDate[1],curDate.getSeconds()-startDate[2]];
			}
			console.log("startTime");
			console.log(this.dataObj.startTime);
			console.log("endTime");
			console.log(this.dataObj.endTime);
			console.log("curTime");
			console.log([curDate.getHours(),curDate.getMinutes(),curDate.getSeconds()]);
			this.sec=det[2] < 0 ? det[2]+60 :det[2];
			this.min=det[1] < 0 ? det[1]+60 :det[1];
			if(det[2] < 0)
				this.min--;
			this.fc_clock.visible=true;
			this.box_clock.visible=true;
			this.startCount();
		}
		else{
			this.box_clock.visible=false;
			this.fc_clock.visible=false;
			startDate=null;
			this.dataObj={};
			this.min=this.sec=0;
			this.timer.clear(this,this.onCount);
			this.upLoadData();
		}
	});

	__getset(0,__proto,'showOrHide',null,function(value){
		var _$this=this;
		if(VipThink.user.isTech && GlobalModel.globalData.otherSetting.watchMap[VipThink.user.id]){
			VipThink.viewMgr.toast("观察学生期间切关无法弹出是否闯关提示。请老师先取消观察，再尝试切换关卡。");
			return;
		};
		var show=false;
		if (!value || value[0]==this.lastPageIdx-1){
			show=false;
			}else {
			show=true;
			this._indices=[value[0],value[1]];
		}
		if(value && this.checkIsBack(value[0]))
			show=false;
		if (show){
			this.dataObj=this.dataObj || {};
			this.dataObj.sub=0;
			this.upLoadData();
			this.btn_ok.on("click",this,this.onBtnClick);
			this.btn_no.on("click",this,this.onBtnClick);
			VipThink.viewMgr.once("change",this,function(){
				_$this.mk.visible=_$this.panel.visible=false;
				if(VipThink.user.isStu){
					_$this.clockVisible=true;
				}
				_$this.canAct=true;
			});
			}else {
			this.btn_ok.off("click",this,this.onBtnClick);
			this.btn_no.off("click",this,this.onBtnClick);
			this.mk.visible=this.panel.visible=false;
			this.clockVisible=false;
		}
		this.visible=show;
		if(this.visible){
			if(this.checkIsCurViewRush())
				this.mk.visible=this.panel.visible=false;
			else
			this.mk.visible=this.panel.visible=true;
		}
		else{
			this.mk.visible=this.panel.visible=false;
		}
		if(!this.hasShowAni1){
			if(this.mk.visible){
				this.panel.play("animation",false);
				this.panel.once("end",this,function(){
					var skName=_$this.panelAniMap[_$this.panel.currAniName];
					_$this.panel.play(skName,true);
				})
			}
		}
		else if(this.hasShowAni1==2)
		this.panel.visible=this.mk.visible=false;
		this.hasShowAni1++;
		if(!this.mk.visible && !this.checkIsCurViewRush()){
			this.visible=false;
		}
	});

	RushView.uiView={"type":"View","props":{"width":1920,"mouseThrough":false,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"visible":false,"var":"mk","alpha":0.4},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"panel","url":"share/animation/csm.sk","stopAt":0,"name":"panel","isLoop":"false","currAniName":"animation"},"child":[{"type":"Sprite","props":{"y":43,"x":-259,"width":249,"var":"btn_ok","height":134}},{"type":"Sprite","props":{"y":44,"x":37,"width":249,"var":"btn_no","height":134}}]},{"type":"Box","props":{"y":0,"x":0,"visible":false,"var":"box_clock","mouseThrough":true},"child":[{"type":"Image","props":{"y":958,"x":40,"width":270,"skin":"share/ui/rush_count.png","height":96}},{"type":"FontClip","props":{"y":977,"x":66,"visible":false,"var":"fc_clock","value":"00:00","skin":"share/ui/rush_num.png","sheet":"0123456789:"}}]},{"type":"Image","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"bg","skin":"share/rush_bg.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":504,"x":960,"visible":false,"var":"anime","url":"share/animation/sgsd.sk","stopAt":0,"preview":"false","name":"anime","isLoop":"false","currAniName":"qie3"}}]};
	RushView.__init$=function(){{
			FunctionShellViewFactory.regist(SpecialKlViewNames.TYPE_RUSH,RushView);
		};;;;
	}

	return RushView;
})(View)


//class com.subject.module.state.StateView extends laya.ui.View
var StateView=(function(_super){
	function StateView(){
		/**用户信息 */
		this._label=null;
		this._btn=null;
		this._box_center=null;
		this._box_right=null;
		this._loadingTime=NaN;
		this._data=null;
		this._isPause=false;
		this._box_321=null;
		// private var _img_321:Image;
		this._ske_ledi=null;
		this.ske_ledi_url="share/animation/wd_over.sk";
		this._label_timeout=null;
		// private var _ledi:Image;
		this._ske_321=null;
		this.ske_321_url="share/animation/answerRace.sk";
		this._isTech=false;
		this.PRETIME=4;
		this._currSoundName=null;
		this.downPos=null;
		this._viewParam={
			viewName:"stateView"
		};
		this._timeOffset=Number.MAX_VALUE;
		StateView.__super.call(this);
	}

	__class(StateView,'com.subject.module.state.StateView',_super);
	var __proto=StateView.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(StateView.uiView);
		this.visible=false;
		this.mouseThrough=true;
		GlobalModel.instance.on("changed",this,this.onChanged);
		GlobalModel.instance.on("complete",this,this.onComplete);
	}

	/**
	*desc
	*/
	__proto.onComplete=function(){
		this._isTech=GlobalModel.isRoomOwner;
		if (this._isTech){
			this._btn.on("click",this,this.onClick);
			this._box_right.on("mouseover",this,this.onMouseOver);
			this._box_right.on("mouseout",this,this.onMouseOut);
			this._label_timeout.centerX=this._label_timeout.centerY=0;
			this._label_timeout.color="#e6e744";
			this._label_timeout.fontSize=100;
			this._ske_ledi.visible=false;
			this._label_timeout.visible=true;
			this.addDragListen(true);
		}
		this._ske_321.unSyncProps="param";
		this._ske_ledi.unSyncProps="param";
	}

	// end of function onComplete
	__proto.addDragListen=function(isAdd){
		if (!this._box_right){
			this.frameOnce(1,this,this.addDragListen,[isAdd]);
			return;
		}
		if (isAdd){
			this._box_right.on("mousedown",this,this.onTimeBoxDown);
			this.on("mousemove",this,this.onMouseMove);
			if (VipThink.user.isStu)
				this.on("mouseup",this,this.onTimeBoxUp);
			this.on("mouseout",this,this.onTimeBoxUp);
		}
		else{
			this._box_right.off("mousedown",this,this.onTimeBoxDown);
			this.off("mousemove",this,this.onMouseMove);
			if (VipThink.user.isStu)
				this.off("mouseup",this,this.onTimeBoxUp);
			this.off("mouseout",this,this.onTimeBoxUp);
		}
	}

	__proto.onTimeBoxUp=function(){
		if (this.downPos){
			this.downPos=null;
			this.mouseThrough=true;
		}
	}

	// mouseEnabled=false;
	__proto.onMouseMove=function(){
		if (this.downPos){
			var dx=this.mouseX-this.downPos[0];
			var dy=this.mouseY-this.downPos[1];
			this._box_right.x=this.downPos[2]+dx;
			this._box_right.y=this.downPos[3]+dy;
			this._viewParam.x=this._box_right.x;
			this._viewParam.y=this._box_right.y;
			if (VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView && VipThink.viewMgr.currPage.currView.viewParam){
				VipThink.viewMgr.currPage.currView.viewParam=JSON.parse(JSON.stringify(this._viewParam));
			}
			else{
				Reporter.reportSLS("viewparam_error",{type:"course_error",param:{
						currPage:VipThink.viewMgr.currPage ? 1 :0,
						currView:VipThink.viewMgr.currPage.currView ? 1 :0,
						viewParam:VipThink.viewMgr.currPage.currView.viewParam ? 1 :0
				}},console.warn);
			}
		}
	}

	// 鼠标点下计时器
	__proto.onTimeBoxDown=function(){
		if (!this.downPos){
			this.mouseThrough=false;
			this.mouseEnabled=true;
			this.downPos=[this.mouseX,this.mouseY,this._box_right.x,this._box_right.y];
		}
	}

	__proto.command=function(act,timeLen){
		(timeLen===void 0)&& (timeLen=0);
		var obj={};
		if (act==1){
			obj={"countDownState":1,"timeLen":timeLen,"startTs":0};
		}
		else{
			obj={"countDownState":4,"timeLen":0,"pauseTs":0,"pauseLen":0};
		}
		this.changeGlobalAttribute(obj);
	}

	/**
	*Desc:
	*/
	__proto.compareTowObj=function(obj1,obj2){
		var keys=["countDownState","startTs","timeLen","pauseTs","resumeTs","pauseLen","techTsOffset"];
		for (var i=0,len=keys.length;i < len;i++){
			var key=keys [i];
			if (obj1[key] !=obj2[key]){
				return false;
			}
		}
		return true;
	}

	// 根据不同的解锁、授权状态，对老师、学生进行相应的计时器监听添加和卸载
	__proto.dragListen=function(data){
		if (!VipThink.currView){
			this.frameOnce(1,this,this.dragListen,[data]);
			return;
		};
		var bChannelStatus=data.bChannelStatus;
		if (bChannelStatus){
			if (bChannelStatus.id==0 && bChannelStatus.editorID==0){
				if (VipThink.user.isStu){
					this.addDragListen(true);
				}
			}
			else{
				if (!data.lChannelStatus || (data.lChannelStatus && data.lChannelStatus.id)){
					if (VipThink.user.isStu){
						this.addDragListen(false);
					}
				}
				else{
					this.addDragListen(true);
				}
			}
		}
	}

	// 监听全局数据的变化，驱动计时器进行不同行为的逻辑
	__proto.onChanged=function(arg){
		var _$this=this;
		this.dragListen(arg);
		var currOtherSetting=GlobalModel.otherSetVO.getMyObject();
		if (currOtherSetting.countDownState==4 && !this.visible)
			return;
		this._isTech=GlobalModel.isRoomOwner;
		if (this._timeOffset==Number.MAX_VALUE){
			var severTs=GlobalModel.user.loginTime;
			var localTs=GlobalModel.loginTS;
			if (this._isTech){
				this._timeOffset=localTs-severTs;
				this.changeGlobalAttribute({"techTsOffset":(localTs-severTs)});
				this._timeOffset=0;
			}
			else{
				if (currOtherSetting.techTsOffset !=-1){
					this._timeOffset=localTs-severTs-currOtherSetting.techTsOffset;
				}
			}
		}
		this._currSoundName=null;
		switch (currOtherSetting.countDownState){
			case 1:
				if (currOtherSetting.startTs==0){
					if (this._isTech){
						this.timer.clearAll(this);
						this._label.text="";
						this.changeGlobalAttribute({"startTs":(new Date().getTime())});
						break ;
					}
				}
				else{
					this.changeGlobalAttribute({"countDownState":2});
				}
				break ;
			case 2:
				if (this._isTech)
					this._box_right.visible=true;
				if (this._box_center.visible)
					this._box_center.visible=false;
				this.countDown();
				if (currOtherSetting.pauseTs !=0){
					currOtherSetting.pauseTs=0;
				}
				this.visible=true;
				break ;
			case 3:
				this._box_right.visible=true;
				var t=new Date().getTime();
				var passTime=Math.floor(((t-GlobalModel.otherSetVO.startTs)-(t-GlobalModel.otherSetVO.pauseTs)-GlobalModel.otherSetVO.pauseLen)/ 1000);
				if (passTime <=this.PRETIME-1){
					if (this._isTech){
						this._label.fontSize=this.PRETIME==1 ? 50 :70;
						this._label.text=this.PRETIME==1 ? "GO" :(this.PRETIME-passTime-1)+"";
					}
					else{
						this._box_321.visible=true;
						this._box_right.visible=false;
					}
				}
				else{
					this._box_right.visible=true;
					this._box_321.visible=false;
					var time=this.PRETIME+GlobalModel.otherSetVO.timeLen-passTime;
					this._label.fontSize=30;
					this._label.text=this.formatTime(time);
					if (time <=3){
						this._label.color="#ff0000";
					}
				}
				this.timer.clearAll(this);
				this.visible=true;
				break ;
			case 4:
				if (!this.visible)
					return;
				this.timer.clearAll(this);
				this._label.color="#00cd00";
				if (!this._isTech && this._label.text=="00:01"){
					this._label.text="00:00";
				}
				if (this._ske_321.url !=this.ske_321_url){
					this._ske_321.url=this.ske_321_url;
				}
				this._ske_321.play("3",false);
				this._ske_321.stopAtStart();
				this._box_right.visible=false;
				if (this._label.text=="00:00" && this.visible){
					this._box_center.visible=true;
					if (!this._isTech){
						if(this._ske_ledi.url !=this.ske_ledi_url){
							this._ske_ledi.url=this.ske_ledi_url;
						}
						this._ske_ledi.play(VipThink.getLanguageStr("over"),false);
						this.timer.once(1200,this,function(){
							var path=VipThink.getLanguageSound("share/sound/timeout.wav");
							KlSoundManager.playSound(path,1,null,null,0,null,false,true);
						})
					}
					this.timer.once(3000,this,function(){
						_$this._label.text="";
						_$this.visible=false;
						_$this._box_center.visible=false;
					})
					this.event("end");
				}
				else{
					this._box_center.visible=false;
					this.visible=false;
				}
				break ;
			default :
				break ;
			}
	}

	/**
	*desc
	*/
	__proto.onMouseOver=function(evt){
		if (!this._label.text || this._label.text.length==0){
			return;
		}
		this._btn.skin=GlobalModel.otherSetVO.countDownState==2 ? "share/ui/btn_pause.png" :"share/ui/btn_resume.png";
		this._btn.visible=true;
	}

	/**
	*desc
	*/
	__proto.onMouseOut=function(evt){
		this._btn.visible=false;
	}

	/**
	*desc
	*/
	__proto.onClick=function(evt){
		if (this.checkIsClick()){
			var obj={};
			if (GlobalModel.otherSetVO.countDownState==2){
				obj={"pauseTs":(new Date().getTime()),"countDownState":3};
			}
			else{
				var currOtherSetting=GlobalModel.otherSetVO.getMyObject();
				obj={"pauseLen":(new Date().getTime()-currOtherSetting.pauseTs+currOtherSetting.pauseLen),"countDownState":2};
			}
			this.changeGlobalAttribute(obj);
			this._btn.skin=GlobalModel.otherSetVO.countDownState==2 ? "share/ui/btn_resume.png" :"share/ui/btn_pause.png";
		}
		this.onTimeBoxUp();
	}

	__proto.checkIsClick=function(){
		if (!this.downPos)
			return false;
		var sx=this.downPos[0];
		var sy=this.downPos[1];
		return sx==this.mouseX && sy==this.mouseY;
	}

	__proto.formatTime=function(sec){
		var m=Math.floor(sec / 60);
		var s=sec % 60;;
		return StateView.addZero(m+"")+":"+StateView.addZero(s+"");
	}

	__proto.countDown=function(){
		this.timer.clear(this,this.changeLabel);
		this.timerLoop(100,this,this.changeLabel);
	}

	__proto.changeLabel=function(){
		var t=new Date().getTime();
		if (this._timeOffset==Number.MAX_VALUE)
			this._timeOffset=0;
		var fullPassTime=(t-GlobalModel.otherSetVO.startTs-this._timeOffset-GlobalModel.otherSetVO.pauseLen)/ 1000;
		var passTime=Math.floor(fullPassTime);
		var soundName=VipThink.getLanguageSound("share/sound/"+(3-passTime)+".wav");
		if (passTime <=this.PRETIME-1){
			if (this._isTech){
				this._label.fontSize=this.PRETIME-1==passTime ? 50 :70;
				this._label.text=passTime==this.PRETIME-1 ? "GO" :(this.PRETIME-passTime-1)+"";
				if (fullPassTime-passTime > 0 && soundName !=this._currSoundName){
					this._currSoundName=soundName;
					if (passTime==this.PRETIME-1){
						KlSoundManager.playSound(VipThink.getLanguageSound("share/sound/go.wav"),1,null,null,0,null,false,true);
					}
					else{
						if (3-passTime <=3 && 3-passTime > 0){
							KlSoundManager.playSound(this._currSoundName,1,null,null,0,null,false,true);
						}
					}
				}
			}
			else{
				this._box_right.visible=false;
				this._box_321.visible=true;
				var skeName=passTime==this.PRETIME-1 ? "go" :(this.PRETIME-passTime-1)+"";
				if (fullPassTime-passTime > 0 && soundName !=this._currSoundName){
					if (this._ske_321.url !=this.ske_321_url){
						this._ske_321.url=this.ske_321_url;
					}
					this._ske_321.play(skeName,false);
					this._currSoundName=soundName;
					if (passTime==this.PRETIME-1){
						var path=VipThink.getLanguageSound("share/sound/go.wav");
						KlSoundManager.playSound(path,1,null,null,0,null,false,true);
					}
					else{
						if (3-passTime <=3 && 3-passTime > 0){
							KlSoundManager.playSound(this._currSoundName,1,null,null,0,null,false,true);
						}
					}
				}
			}
		}
		else{
			this._box_right.visible=true;
			this._box_321.visible=false;
			var time=this.PRETIME+GlobalModel.otherSetVO.timeLen-passTime;
			this._label.fontSize=30;
			this._label.text=this.formatTime(time);
			this._label.color=time <=3 ? "#ff0000" :"#00cd00";
			if (this._label.text=="00:00" || time < 0){
				this.timer.clearAll(this);
				this.changeGlobalAttribute({"countDownState":4,"startTs":0,"timeLen":0,"pauseTs":0,"pauseLen":0});
			}
		}
	}

	// 修改全局数据
	__proto.changeGlobalAttribute=function(obj){
		var currOtherSetting=GlobalModel.otherSetVO.getMyObject();
		for (var key in obj){
			currOtherSetting[key]=obj[key];
		}
		GlobalModel.globalData={otherSetting:currOtherSetting};
	}

	__getset(0,__proto,'viewParam',function(){
		return this._viewParam;
		},function(v){
		this._viewParam=v;
		this._box_right.x=this.viewParam.x;
		this._box_right.y=this.viewParam.y;
	});

	StateView.addZero=function(str){
		return str.length==1 ? "0"+str :str;
	}

	StateView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[ {"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_center","mouseThrough":true,"height":1080},"child":[ {"type":"Sprite","props":{"y":0,"x":0,"alpha":0.8},"child":[ {"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#534f4f"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"_ske_ledi","stopAt":1,"preview":true,"name":"_ske_ledi","isLoop":"false","currAniName":"animation"}},{"type":"Label","props":{"width":389,"visible":false,"var":"_label_timeout","valign":"middle","text":"时间到!","padding":"-15","height":100,"fontSize":60,"font":"Microsoft YaHei","color":"#4f4c4c","centerY":-93,"centerX":-139,"bold":true,"anchorY":0.5,"anchorX":0.5,"align":"center"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_321","height":1080},"child":[ {"type":"Sprite","props":{"y":0,"x":0,"alpha":0.8},"child":[ {"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#534f4f"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"_ske_321","stopAt":1,"scaleY":3,"scaleX":3,"preview":true,"isLoop":"false","currAniName":"3"}}]},{"type":"Box","props":{"y":22,"x":1778,"width":120,"var":"_box_right","top":22,"right":22,"height":120},"child":[ {"type":"Image","props":{"width":125,"skin":"share/ui/countdown_clock.png","height":125,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"var":"_label","text":"00:00","name":"label","fontSize":30,"color":"#00cd00","centerY":0,"centerX":0,"bold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Button","props":{"visible":false,"var":"_btn","stateNum":1,"skin":"share/ui/btn_pause.png","name":"btn"}}]}]};
	return StateView;
})(View)


//class com.subject.module.taskreward.TaskRewardView extends laya.ui.View
var TaskRewardView=(function(_super){
	function TaskRewardView(){
		this.stuArr=[];
		this.bgBox=null;
		this.closebtn=null;
		this.refreshbtn=null;
		this.leftbtn=null;
		this.rightbtn=null;
		this.leftpage=null;
		this.rightpage=null;
		this.stuList=null;
		this.titleLabel=null;
		this.nameLabel=null;
		this.practiceLabel=null;
		this.prePracticeLabel=null;
		this.attendanceLabel=null;
		this.rewardsLabel=null;
		this.nowPage=0;
		this.mClickIndex=0;
		// private var stulegth:Number;// 学生数量
		this._us=null;
		this.id=0;
		this.lastAction=null;
		this.lastIdx=0;
		// setPage();
		this.id2=0;
		this.sendStuArr=[];
		TaskRewardView.__super.call(this);
	}

	__class(TaskRewardView,'com.subject.module.taskreward.TaskRewardView',_super);
	var __proto=TaskRewardView.prototype;
	Laya.imps(__proto,{"com.klzz.pattern.IObserver":true})
	__proto.createChildren=function(){
		View.regComponent("ScaleButton",ScaleButton);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		var res_arr=[{url:"res/atlas/share/ui/taskReward.atlas",type:"atlas"},{url:"share/animation/lihe.png",type:"image"},{url:"share/animation/lihe.sk",type:"arraybuffer"},{url:"share/animation/tietiao.png",type:"image"},{url:"share/animation/tietiao.sk",type:"arraybuffer"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
		this.afterNativeInit();
		VipThink.viewMgr.on("changed",this,this.onClose);
		VipThink.viewMgr.on("mainViewPrepared",this,this.onClose);
		KlEventCenter.on("lessonEnd",this,this.onClose);
		this.visible=false;
		GlobalModel.instance.on("changed",this,this.onGlobalModelChange);
		VipThink.viewMgr.on("changed",this,this.onLevelOrSubjChanged);
	}

	__proto.onLevelOrSubjChanged=function(){
		this.visible=false;
		VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"closeTaskReward"}})
	}

	__proto.onGlobalModelChange=function(data){
		var bChannelStatus=data.bChannelStatus;
		if (bChannelStatus){
			if (bChannelStatus.id==0 && bChannelStatus.editorID==0){
				this.visible=false;
				VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"closeTaskReward"}})
			}
			else{
				if (!data.lChannelStatus || (data.lChannelStatus && data.lChannelStatus.id)){
				}
				else{
					this.visible=false;
					VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"closeTaskReward"}})
				}
			}
		}
	}

	__proto.update=function(subj){}
	__proto.onResLoad=function(){
		this.createView(TaskRewardView.uiView);
		this.hideBtn();
		this.addListen();
		this.titleLabel.text=VipThink.getLanguageText(10);
		this.nameLabel.text=VipThink.getLanguageText(11);
		this.practiceLabel.text=VipThink.getLanguageText(12);
		this.prePracticeLabel.text=VipThink.getLanguageText(13);
		this.attendanceLabel.text=VipThink.getLanguageText(14);
		this.rewardsLabel.text=VipThink.getLanguageText(15);
	}

	__proto.addListen=function(){
		if (!VipThink.user){
			this.frameOnce(1,this,this.addListen);
			return;
		}
		if (VipThink.user.isTech){
			this.closebtn.on("click",this,this.onClose);
			this.leftbtn.on("click",this,this.checkPage,[-1]);
			this.rightbtn.on("click",this,this.checkPage,[1]);
			for (var j=0;j < this.stuList.numChildren;j++){
				var _box=this.stuList.getChildAt(j);
				var _tiezhi=_box.getChildByName("tiezhi");
				var _gift=_box.getChildByName("gift");
				_gift.on("click",this,this.checkSendStarWithSync,[j]);
				_tiezhi.on("click",this,this.checkOpenWithSync,[j]);
			}
			this.refreshbtn.on("click",this,this.checkSendResetData);
		}
	}

	__proto.hideBtn=function(){
		if (!VipThink.user){
			this.frameOnce(1,this,this.hideBtn);
			return;
		}
		if (VipThink.user.isStu)
			this.leftbtn.visible=this.rightbtn.visible=this.closebtn.visible=this.refreshbtn.visible=false;
	}

	__proto.afterNativeInit=function(){
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.checkType);
	}

	//处理应用传来的数据类型
	__proto.checkType=function(args){
		if (args.minorType=="openTaskReward" && !this.visible){
			this.visible=true;
			KlEventCenter.event("hide_brushbox_notice");
			var bChannelStatus=GlobalModel.globalData.bChannelStatus;
			if (bChannelStatus){
				if (bChannelStatus.id==0 && bChannelStatus.editorID==0){
					this.visible=false;
				}
			}
			VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"openTaskReward"}})
			this.syncState();
		}
		if (args.minorType=="sendTaskReward"){
			this.sendStuArr=args.data.stuArr;
			if (args.data.newStuArr.length > 0){
				this.stuArr=args.data.newStuArr;
				this.setStuList(1);
				this.syncState(1);
				this.syncData();
				this.setPage();
			}
			if (this.stuArr.length <=0){
				this.getStuList();
				this.initStuList();
				this.syncData();
			}
		}
		else if (args.minorType=="resetTaskReward"){
			this.checkSendResetData(args);
		}
		else if (args.minorType=="updateStudentRemarkName"){
			if (VipThink.viewMgr.getView("randomInviteView")){
				VipThink.viewMgr.getView("randomInviteView").onSetRemarkName(args.data);
			}
			for (var j=0;j < VipThink.userStatus.studentList.length;j++){
				if (VipThink.userStatus.studentList[j].id==args.data.id){
					VipThink.userStatus.studentList[j].remarkName=args.data.remarkName;
					this.setStuList(this.nowPage > 0 ? this.nowPage :1);
					break ;
				}
			}
		}
	}

	/**
	*获取某个同学的备注名
	*@param id
	*@return
	*
	*/
	__proto.getReMarkNameTask=function(uid){
		var arr=VipThink.userStatus.studentList;
		var ss="";
		for (var i=0;i < arr.length;i++){
			if (String(arr[i].id)==uid && arr[i].remarkName && arr[i].remarkName !=""){
				ss=arr[i].remarkName;
				break ;
			}
		}
		return ss;
	}

	// 执行发送星星的同步逻辑
	__proto.checkSendStarWithSync=function(i){
		this.checkSendStar(i);
		this.syncAction("checkSendStar",i);
	}

	// 获取本地学生列表
	__proto.getStuList=function(){
		var _us=VipThink.userStatus;
		for (var i=0;i < _us.studentList.length;i++){
			var _id=_us.studentList[i]._id;
			for (var j=0;j < this.sendStuArr.length;j++){
				if (this.sendStuArr[j].id==_id && this.checkNoInBefore(_id)){
					this.stuArr.unshift(this.sendStuArr[j]);
				}
			}
		}
	}

	// 检查学生是否时新进房间
	__proto.checkNoInBefore=function(id){
		for (var i=0;i < this.stuArr.length;i++){
			if (this.stuArr[i].id==id){
				return false;
			}
		}
		return true;
	}

	// 执行打开礼盒的同步逻辑
	__proto.checkOpenWithSync=function(j){
		this.checkOpen(j)
		this.syncAction("checkOpen",j);
	}

	// 点击刷新按钮时接受应用从传来的学生数据
	__proto.checkSendResetData=function(args){
		if (!args.data){
			VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"resetTaskReward"}})
			return;
		}
		this.sendStuArr=args.data.stuArr;
		var preStuArrLen=this.stuArr.length;
		this.getStuList();
		var _num=this.stuArr.length;
		var _chazhi=_num-preStuArrLen;
		if (_chazhi > 0){
			for (var i=0;i < _chazhi;i++){
				this.stuArr[i].isOpen=false;
				this.stuArr[i].star=-1;
				this.stuArr[i].tiaraType=0;
				this.stuArr[i].giftName="daiji";
				this.stuArr[i].scoreAlpha=1;
			}
			for (var j=0;j < this.stuArr.length;j++){
				this.stuArr[j].idx=j;
			}
			this.setStuList(1);
			this.setPage();
			this.nowPage=1;
			this.syncData();
			VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"saveTaskRewardStuArr",data:{newStuArr:this.stuArr}}})
		}
	}

	// 根据页码设置当前页显示的内容和按钮的状态
	__proto.checkPage=function(_num,isSync){
		(isSync===void 0)&& (isSync=true);
		var _page=Number(this.leftpage.text);
		var _allPage=Number(this.rightpage.text);
		var _nowPage=_page+_num;
		if (_nowPage <=1){
			_nowPage=1;
			this.leftbtn.disabled=true;
		}
		else{
			this.leftbtn.disabled=false;
		}
		if (_nowPage >=_allPage){
			_nowPage=_allPage;
			this.rightbtn.disabled=true;
		}
		else{
			this.rightbtn.disabled=false;
		}
		this.leftpage.text=String(_nowPage);
		this.nowPage=_nowPage;
		this.setStuList(_nowPage);
		if (isSync){
			this.syncState(_nowPage);
			this.syncData();
		}
	}

	__proto.onClose=function(){
		if (!VipThink.user){
			this.frameOnce(1,this,this.onClose);
			return;
		}
		if (VipThink.user.isTech){
			this.visible=false;
			this.syncState();
			VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"closeTaskReward"}})
		}
	}

	// 设置当前页面的按钮状态和页码显示
	__proto.setPage=function(){
		var stulegth=this.stuArr.length;
		var _page=Math.ceil(stulegth / 6);
		this.leftpage.text="1";
		this.leftbtn.disabled=true;
		if (_page <=1){
			_page=1;
			this.rightbtn.disabled=true;
		}
		else{
			this.rightbtn.disabled=false;
		}
		this.rightpage.text=String(_page);
	}

	// 初始化学生列表数据
	__proto.initStuList=function(){
		for (var i=0;i < this.stuArr.length;i++){
			this.stuArr[i].idx=i;
			this.stuArr[i].isOpen=false;
			this.stuArr[i].star=-1;
			this.stuArr[i].tiaraType=0;
			this.stuArr[i].giftName="daiji";
			this.stuArr[i].scoreAlpha=1;
		}
		this.setStuList(1);
		this.syncState(1);
		this.setPage();
	}

	/**
	*设置当前页面学生题目内容的显示
	*@param _num 当前的页数
	*
	*/
	__proto.setStuList=function(_num){
		this.checkAllListNosee();
		var _first=(_num-1)*6;
		var _last=_num *6;
		var stulegth=this.stuArr.length;
		if (_last > stulegth){
			_last=stulegth;
		}
		for (var i=_first;i < _last;i++){
			var _boxnum=i-_first;
			var _box=this.stuList.getChildAt(_boxnum);
			_box.visible=true;
			var _boxhead=_box.getChildByName("boxHead").getChildByName("icon");
			if (this.stuArr[i] && this.stuArr[i].headerImg && this.stuArr[i].headerImg !=""){
				_boxhead.skin=this.stuArr[i].headerImg;
			}
			else{
				_boxhead.skin="share/ui/taskReward/img_17.png";
			};
			var _stuname=_box.getChildByName("stuName");
			if (this.stuArr[i] && this.stuArr[i].id){
				if (this.getReMarkNameTask(this.stuArr[i].id)!=""){
					this.stuArr[i].name=this.getReMarkNameTask(this.stuArr[i].id);
				}
			}
			_stuname.text=(this.stuArr[i] && this.stuArr[i].name)? this.stuArr[i].name :"";
			var _gift=_box.getChildByName("gift");
			_gift.currAniName=this.stuArr[i].giftName;
			_gift.play(_gift.currAniName,false);
			if (this.stuArr[i].giftName=="dakai" || this.stuArr[i].giftName=="dakaidaiji"){
				_gift.mouseEnabled=true;
			}
			else{
				_gift.mouseEnabled=false;
			};
			var _idx=_box.getChildByName("idx");
			_idx.text=String(this.stuArr[i].idx);
			var _tiezhi=_box.getChildByName("tiezhi");
			var _hw=_box.getChildByName("boxTask").getChildByName("hw");
			var _pre=_box.getChildByName("boxTask").getChildByName("pre");
			var _time=_box.getChildByName("boxTask").getChildByName("time");
			if (!this.stuArr[i].isOpen){
				_tiezhi.alpha=1;
				_tiezhi.visible=true;
				_tiezhi.play("daiji",false);
				this.checkGraySkin("hw",_box);
				this.checkGraySkin("pre",_box);
				this.checkGraySkin("time",_box);
				_gift.play("daiji",false);
				_gift.stopAtEnd();
			}
			else{
				_tiezhi.alpha=0;
				_tiezhi.visible=false;
				this.checkData(_box,i);
			};
			var _score=_box.getChildByName("score");
			if (this.stuArr[i].star < 0){
				_score.text=" ";
				_score.alpha=1;
			}
			else{
				_score.text="+"+this.stuArr[i].star;
				_score.alpha=this.stuArr[i].scoreAlpha;
			};
			var _tiara=_box.getChildByName("tiara");
			_tiara.skin=this.getTiaraSkin(this.stuArr[i].tiaraType)|| "";
		}
	}

	// 隐藏当前页面所有学生条目
	__proto.checkAllListNosee=function(){
		for (var i=0;i < this.stuList.numChildren;i++){
			var _box=this.stuList.getChildAt(i);
			_box.visible=false;
		}
	}

	// 获取王冠皮肤
	__proto.getTiaraSkin=function(_tiara){
		if (_tiara !=0 && _tiara <=3){
			return "share/ui/taskReward/s"+_tiara+".png";
		}
		else{
			return "";
		}
	}

	// 设置学生条目按钮图标皮肤
	__proto.checkData=function(cell,i){
		var hw=cell.getChildByName("boxTask").getChildByName("hw");
		var pre=cell.getChildByName("boxTask").getChildByName("pre");
		var time=cell.getChildByName("boxTask").getChildByName("time");
		hw.skin=this.getSkin(this.stuArr[i].practice,"hw");
		pre.skin=this.getSkin(this.stuArr[i].prepare,"pre");
		time.skin=this.getSkin(this.stuArr[i].ontime,"time");
	}

	// 设置学生条目按钮图标置灰状态
	__proto.checkGraySkin=function(_str,cell){
		var _boxTask=cell.getChildByName("boxTask");
		var _img=_boxTask.getChildByName(_str);
		_img.skin="share/ui/taskReward/"+_str+"gray.png";
	}

	// 点击礼品盒发送星星逻辑
	__proto.checkSendStar=function(_boxidx){
		var _$this=this;
		var _box=this.stuList.getChildAt(_boxidx);
		var _gift=_box.getChildByName("gift");
		if (_gift.currAniName=="dakai" || _gift.currAniName=="dakaidaiji"){
			var _cell=this.stuList.getChildAt(_boxidx);
			var _text=_cell.getChildByName("score");
			var _score=parseInt(_text.text);
			_text.alpha=0;
			var _idx=_box.getChildByName("idx");
			var _stuidx=Number(_idx.text);
			this.stuArr[_stuidx].scoreAlpha=0;
			_gift.play("xingxingfeizou",false);
			this.stuArr[_stuidx].giftName="xingxingfeizoudaji";
			_gift.mouseEnabled=false;
			this.timerOnce(1000,this,function(){
				_$this.syncAction("stop","stop")
				if (VipThink.user.isTech)
					_$this.syncData();
			})
			if (_score > 0 && VipThink.user.isTech){
				var data={};
				data.studentID=this.stuArr[_stuidx].id;
				data.star=_score || 0;
				data.from="task";
				VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"layaAddStar",data:data}})
			}
			VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"saveTaskRewardStuArr",data:{newStuArr:this.stuArr}}})
		}
	}

	// 学生条目遮盖撕开逻辑
	__proto.checkOpen=function(_boxidx){
		var _cell=this.stuList.getChildAt(_boxidx);
		this.mouseEnabled=false;
		var _tiezhi=_cell.getChildByName("tiezhi");
		_tiezhi.play("si",false);
		var _idx=_cell.getChildByName("idx");
		var _stuidx=Number(_idx.text);
		this.timerOnce(100,this,this.checkReward,[_boxidx,_stuidx]);
	}

	// 遮盖撕开后显示礼品盒逻辑
	__proto.checkReward=function(_boxidx,_stuidx){
		var _cell=this.stuList.getChildAt(_boxidx);
		if (!_cell || !this.stuArr[_stuidx]){
			return;
		};
		var _tiezhi=_cell.getChildByName("tiezhi");
		_tiezhi.visible=false;
		_tiezhi.alpha=0;
		this.stuArr[_stuidx].isOpen=true;
		var _boxTask=_cell.getChildByName("boxTask");
		this.checkSend(0,_boxidx,_stuidx);
	}

	// 点击礼品盒发送星星逻辑
	__proto.checkSend=function(_level,_boxidx,_stuidx){
		var _cell=this.stuList.getChildAt(_boxidx);
		var _gift=_cell.getChildByName("gift");
		var _text=_cell.getChildByName("score");
		if (this.stuArr[_stuidx].isOpen){
			if (this.stuArr[_stuidx].practice && _level==0){
				_level++;
				Tween.to(this.bgBox,{alpha:0.98},100,null,Handler.create(this,this.checkSkin,["hw",_level,_boxidx,_stuidx]));
			}
			else if (this.stuArr[_stuidx].prepare && _level==1){
				_level++;
				Tween.to(this.bgBox,{alpha:0.98},100,null,Handler.create(this,this.checkSkin,["pre",_level,_boxidx,_stuidx]));
			}
			else if (this.stuArr[_stuidx].ontime && _level==2){
				_level++;
				Tween.to(this.bgBox,{alpha:0.98},100,null,Handler.create(this,this.checkSkin,["time",_level,_boxidx,_stuidx]));
			}
			else if (_level==3){
				var _score=this.checkScore(_stuidx);
				this.stuArr[_stuidx].star=_score;
				if (_score > 0){
					Tween.to(this.bgBox,{alpha:0.98},100,null,Handler.create(this,this.openGift,[_score,_boxidx,_stuidx]));
				}
				else{
					_text.text="+0";
					_text.alpha=0;
					this.stuArr[_stuidx].scoreAlpha=0;
					_gift.alpha=0.98;
					this.checkIsAllSee();
					this.mouseEnabled=true;
				}
				if (VipThink.user.isTech)
					this.syncData();
			}
			else{
				_level++;
				this.checkSend(_level,_boxidx,_stuidx);
			}
		}
		this.syncAction("stop","stop");
	}

	// 礼品盒置灰逻辑
	__proto.checkSkin=function(_str,_lev,_boxidx,_stuidx){
		this.bgBox.alpha=1;
		var _cell=this.stuList.getChildAt(_boxidx);
		var _boxTask=_cell.getChildByName("boxTask");
		var _img=_boxTask.getChildByName(_str);
		if (_lev > 0){
			_img.skin="share/ui/taskReward/"+_str+".png";
			this.checkSend(_lev,_boxidx,_stuidx);
		}
		else{
			_img.skin="share/ui/taskReward/"+_str+"gray.png";
		}
	}

	// 获取礼品盒上提示的星星个数
	__proto.checkScore=function(i){
		var _score=0;
		if (this.stuArr[i].practice){
			_score+=2
		}
		if (this.stuArr[i].prepare){
			_score+=1
		}
		if (this.stuArr[i].ontime){
			_score+=2
		}
		return _score;
	}

	// 打开礼品盒动画
	__proto.openGift=function(_score,_boxidx,_stuidx){
		this.bgBox.alpha=1;
		var _cell=this.stuList.getChildAt(_boxidx);
		var _gift=_cell.getChildByName("gift");
		var _strScore="+"+_score;
		_gift.alpha=0.98;
		_gift.play("dakai",false);
		this.timerOnce(1000,this,this.setScore,[_strScore,_boxidx]);
		this.stuArr[_stuidx].giftName="dakaidaiji";
		_gift.mouseEnabled=true;
		VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"saveTaskRewardStuArr",data:{newStuArr:this.stuArr}}})
	}

	// 设置礼品盒上提示的星星个数
	__proto.setScore=function(_score,_boxidx){
		var _cell=this.stuList.getChildAt(_boxidx);
		var _text=_cell.getChildByName("score");
		_text.text=_score;
		this.checkIsAllSee();
		this.mouseEnabled=true;
	}

	// 判断是否所有学生条目都已经被撕开
	__proto.checkIsAllSee=function(){
		if (this.checkAllSee()){
			this.checkPosition();
		}
	}

	// 对所有学生条目进行位置排序
	__proto.checkPosition=function(){
		var _starArr=[];
		var newStuArr=this.stuArr.sort(this.sortNumber);
		this.stuArr=newStuArr.concat();
		for (var i=0;i < this.stuArr.length;i++){
			this.stuArr[i].idx=i;
			_starArr.push(this.stuArr[i].star);
		};
		var _tiaraArr=[_starArr[0]];
		for (var j=1;j < _starArr.length;j++){
			if (_starArr[j] !=_starArr[j-1]){
				_tiaraArr.push(_starArr[j]);
			}
		}
		console.log(_starArr,_tiaraArr);
		this.setTiara(newStuArr,_tiaraArr);
		this.syncData();
		this.setStuList(1);
		this.setPage();
		VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"saveTaskRewardStuArr",data:{newStuArr:this.stuArr}}})
	}

	// 获取按钮图标皮肤
	__proto.getSkin=function(_bool,_str){
		if (_bool){
			return "share/ui/taskReward/"+_str+".png";
		}
		else{
			return "share/ui/taskReward/"+_str+"gray.png"
		}
	}

	// 设置学生王冠
	__proto.setTiara=function(_newStuArr,_tiaraArr){
		for (var i=0;i < _newStuArr.length;i++){
			var _star=_newStuArr[i].star;
			for (var j=0;j < _tiaraArr.length;j++){
				if (_star==_tiaraArr[j]){
					_newStuArr[i].tiaraType=j+1;
				}
			}
		}
	}

	__proto.sortNumber=function(a,b){
		return b.star-a.star;
	}

	// 判断是否所有学生条目都被撕开
	__proto.checkAllSee=function(){
		for (var i=0;i < this.stuArr.length;i++){
			var _isOpen=this.stuArr[i] .isOpen;
			if (!_isOpen){
				return false;
			}
		}
		return true;
	}

	// 主动同步行为
	__proto.syncAction=function(actionName,args){
		if(VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
			VipThink.viewMgr.currPage.currView.taskRewardViewAct=[actionName,args];
		}
	}

	// 主动同步数据
	__proto.syncData=function(){
		this.id++;
		if (VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
			var obj={id:this.id,stuArr:this.stuArr,nowPage:this.nowPage,name:"stuArr"};
			VipThink.viewMgr.currPage.currView.taskRewardViewData=JSON.stringify(obj);
		}
	}

	// 主动同步状态数据
	__proto.syncState=function(_page){
		(_page===void 0)&& (_page=0);
		this.id2++;
		if (VipThink.viewMgr.currPage && VipThink.viewMgr.currPage.currView){
			var obj={page:_page,name:"state",visible:this.visible,id2:this.id2}
			VipThink.viewMgr.currPage.currView.taskRewardViewState=JSON.stringify(obj);
		}
	}

	// 执行同步过来的行为
	__proto.doSyncAction=function(data){
		if (data[0]=="stop")
			return;
		if (!data || !data[0] || data[0]=="stop")
			return;
		var s=(this.stuList.getChildAt(0)).getChildByName("tiezhi");
		if (data[0]=="checkOpen" && this.stuArr.length){
			this.checkOpen(data[1]);
		}
		else if (data[0]=="checkSendStar" && this.stuArr.length){
			this.checkSendStar(data[1]);
		}
	}

	// 设置同步过来的学生数据
	__proto.doSyncData=function(data){
		if (data==="[object Object]")
			return;
		if ((typeof data=='string'))
			data=JSON.parse(data);
		if (data.id==this.id)
			return;
		if (data.name=="stuArr"){
			this.id=data.id;
			this.stuArr=data.stuArr;
			var stulegth=this.stuArr.length;
			this.setStuList(data.nowPage || 1);
			var _page=Math.ceil(stulegth / 6);
			this.rightpage.text=String(_page);
			this.leftpage.text=String(data.nowPage || 1);
		}
	}

	// 设置同步过来的状态数据
	__proto.doSyncState=function(data){
		if (data==="[object Object]")
			return;
		if ((typeof data=='string'))
			data=JSON.parse(data);
		if (data.id2==this.id2)
			return;
		if (data.name=="state"){
			this.id2=data.id2;
			this.visible=data.visible;
			if (this.visible && this.stuArr && this.stuArr.length && data.page){
				this.setStuList(data.page);
			}
		}
	}

	TaskRewardView.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"var":"bgBox","mouseThrough":true,"height":1080},"child":[{"type":"Image","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000"}}]},{"type":"Image","props":{"y":104,"x":354,"width":1176,"skin":"share/ui/taskReward/img_7.png","height":896,"sizeGrid":"31,40,49,43"}},{"type":"Image","props":{"y":882,"x":1350,"skin":"share/ui/taskReward/img_11.png"}},{"type":"Image","props":{"y":104,"x":354,"skin":"share/ui/taskReward/img_12.png"}},{"type":"Image","props":{"y":848,"x":354,"skin":"share/ui/taskReward/img_13.png"}},{"type":"Label","props":{"var":"titleLabel","y":138,"x":871,"width":138,"text":"任务奖励","height":37,"fontSize":34,"color":"#303A52","bold":true}},{"type":"Label","props":{"var":"nameLabel","valign":"middle","align":"center","wordWrap":"true","y":180,"x":450,"width":198,"text":"学生名字","height":52,"fontSize":26,"color":"#677383"}},{"type":"Label","props":{"var":"practiceLabel","valign":"middle","align":"center","wordWrap":"true","y":180,"x":759,"width":150,"text":"课后练习","height":52,"fontSize":26,"color":"#677383"}},{"type":"Label","props":{"var":"prePracticeLabel","valign":"middle","align":"center","wordWrap":"true","y":180,"x":920,"width":150,"text":"课前预习","height":52,"fontSize":26,"color":"#677383"}},{"type":"Label","props":{"var":"attendanceLabel","valign":"middle","align":"center","wordWrap":"true","y":180,"x":1073,"width":150,"text":"准时出席","height":50,"fontSize":26,"color":"#677383"}},{"type":"Label","props":{"var":"rewardsLabel","valign":"middle","align":"center","wordWrap":"true","y":180,"x":1288,"width":166,"text":"星星奖励","height":52,"fontSize":26,"color":"#677383"}},{"type":"ScaleButton","props":{"y":112,"x":1515,"var":"closebtn","skin":"share/ui/taskReward/sbtn_close.png","label":""}},{"type":"ScaleButton","props":{"y":205,"x":653,"var":"refreshbtn","skin":"share/ui/taskReward/sbtn_reset.png","label":""}},{"type":"Image","props":{"y":923,"x":840,"width":203,"skin":"share/ui/taskReward/img_2.png","height":50,"sizeGrid":"0,23,0,20"}},{"type":"ScaleButton","props":{"y":949,"x":867,"var":"leftbtn","skin":"share/ui/taskReward/img_1.png"},"child":[{"type":"Image","props":{"y":20,"x":20,"skin":"share/ui/taskReward/arrow.png","scaleX":-1,"anchorY":0.5,"anchorX":0.5}}]},{"type":"ScaleButton","props":{"y":949,"x":1018,"var":"rightbtn","skin":"share/ui/taskReward/img_1.png"},"child":[{"type":"Image","props":{"y":20,"x":20,"skin":"share/ui/taskReward/arrow.png","anchorY":0.5,"anchorX":0.5}}]},{"type":"Label","props":{"y":937,"x":934,"width":13,"text":"/","height":26,"fontSize":24,"color":"#303A52","bold":true}},{"type":"Label","props":{"y":950,"x":934,"width":41,"var":"leftpage","text":"1","height":26,"fontSize":24,"color":"#303A52","bold":true,"anchorY":0.5,"anchorX":1,"align":"right"}},{"type":"Label","props":{"y":937,"x":947,"width":44,"var":"rightpage","text":"1","height":26,"fontSize":24,"color":"#303A52","bold":true,"align":"left"}}]},{"type":"Box","props":{"y":249,"x":408,"width":1093,"var":"stuList","vScrollBarSkin":"share/ui/taskReward/vscroll.png","spaceY":8,"height":655},"child":[{"type":"Box","props":{"y":-2,"x":-1,"width":1067,"visible":false,"renderType":"render","height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]},{"type":"Box","props":{"y":108,"x":-1,"width":1067,"visible":false,"renderType":"render","mouseThrough":true,"height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"y":0,"x":0,"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]},{"type":"Box","props":{"y":218,"x":-1,"width":1067,"visible":false,"renderType":"render","height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]},{"type":"Box","props":{"y":329,"x":-1,"width":1067,"visible":false,"renderType":"render","mouseThrough":true,"height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]},{"type":"Box","props":{"y":439,"x":-1,"width":1067,"visible":false,"renderType":"render","mouseThrough":true,"height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]},{"type":"Box","props":{"y":549,"x":-1,"width":1067,"visible":false,"renderType":"render","mouseThrough":true,"height":102},"child":[{"type":"Image","props":{"y":1,"x":1,"width":302,"skin":"share/ui/taskReward/img_4.png","height":100,"sizeGrid":"41,15,50,23"}},{"type":"Image","props":{"y":1,"x":302,"width":764,"skin":"share/ui/taskReward/img_16.png","height":100,"sizeGrid":"27,32,50,13"}},{"type":"Image","props":{"y":4,"x":302,"skin":"share/ui/taskReward/img_10.png"}},{"type":"Box","props":{"y":21,"x":26,"width":60,"name":"boxHead","height":60},"child":[{"type":"Sprite","props":{"y":31,"x":31,"renderType":"mask"},"child":[{"type":"Circle","props":{"radius":30,"lineWidth":1,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":1,"x":1,"width":60,"skin":"share/ui/taskReward/img_17.png","name":"icon","height":60}}]},{"type":"Label","props":{"y":51,"x":106,"width":156,"overflow":"hidden","name":"stuName","height":24,"fontSize":24,"color":"#000000","anchorY":0.5}},{"type":"Image","props":{"y":70,"x":933,"skin":"share/ui/taskReward/img_18.png"}},{"type":"Image","props":{"y":34,"x":860,"skin":"share/ui/taskReward/img_15.png"}},{"type":"Box","props":{"y":2,"x":304,"width":758,"name":"boxTask","mouseThrough":true,"height":96},"child":[{"type":"Image","props":{"y":51,"x":124,"skin":"share/ui/taskReward/hwgray.png","name":"hw","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":277,"skin":"share/ui/taskReward/pregray.png","name":"pre","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":51,"x":435,"skin":"share/ui/taskReward/timegray.png","name":"time","anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":75,"x":964,"url":"share/animation/lihe.sk","stopAt":0,"preview":false,"name":"gift","isLoop":"false","currAniName":"daiji"},"child":[{"type":"Rect","props":{"y":-72,"x":-97,"width":196,"renderType":"hit","lineWidth":1,"height":92,"fillColor":"#ff0000"}}]},{"type":"Label","props":{"y":10,"x":950,"width":43,"name":"score","mouseThrough":true,"height":26,"fontSize":26,"color":"#FF9900"}},{"type":"SkeletonPlayer","props":{"y":107,"x":527,"url":"share/animation/tietiao.sk","stopAt":0,"preview":false,"name":"tiezhi","mouseEnabled":true,"isLoop":"false","currAniName":"daiji","alpha":1},"child":[{"type":"Rect","props":{"y":-106,"x":-227,"width":760,"renderType":"hit","lineWidth":1,"height":100,"fillColor":"#ff0000"}}]},{"type":"Image","props":{"y":22,"x":32,"name":"tiara","anchorY":0.5,"anchorX":0.5}},{"type":"Label","props":{"width":1,"overflow":"hidden","name":"idx","height":24,"fontSize":24,"color":"#000000","anchorY":0.5,"alpha":0}}]}]}]};
	return TaskRewardView;
})(View)


/**
*Author:Evans<br/>
*工具盒
*直营店右侧的工具盒
*/
//class com.subject.module.toolbox.ToolBox extends laya.ui.View
var ToolBox=(function(_super){
	function ToolBox(mv){
		/**课展视图 */
		this._mainView=null;
		/**课展区缩放比 */
		this._mvScale=NaN;
		/**课展区的实际 尺寸 */
		this._mvSize=null;
		this._ARR_TAB=["Stu","Func"];
		/**当前选中的tab下标*/
		this._currTabIdx=-1;
		/**底部内边距 */
		this._PADDING_BOTTOM=80;
		//override start
		this.boxBg=null;
		this.boxRight=null;
		this.tbtnStu=null;
		this.tbtnFunc=null;
		this.vsRight=null;
		this.boxFunc=null;
		this.boxStu=null;
		this.boxArrow=null;
		this.arrow=null;
		ToolBox.__super.call(this);
		this._mainView=mv;
		this.mouseThrough=true;
		this.on("added",this,this._$6_onAdded);
		this.on("resize",this,this.updateLayout);
	}

	__class(ToolBox,'com.subject.module.toolbox.ToolBox',_super);
	var __proto=ToolBox.prototype;
	__proto.createChildren=function(){
		View.regComponent("com.biz.ui.toolBox.BoxFunc",BoxFunc);
		View.regComponent("com.biz.ui.toolBox.StudentList",StudentList);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(ToolBox.uiView);
		this.x=1920;
	}

	__proto.initialize=function(){
		var _$this=this;
		this.extendBtn(this.tbtnStu,"Stu");
		this.extendBtn(this.tbtnFunc,"Func");
		this.currTabIdx=1;
		this.boxArrow.on("click",this,function(){
			if (_$this.x==1920){
				_$this.x=0;
				_$this.boxArrow.x=1726;
				_$this.arrow.scaleX=-1;
				}else {
				_$this.x=1920;
				_$this.boxArrow.x=0;
				_$this.arrow.scaleX=1;
			}
		});
	}

	/**
	*Desc:扩展按钮
	*/
	__proto.extendBtn=function(btn,tag){
		btn.on("click",this,this.onTabClick,[tag]);
	}

	/**
	*Desc:当点击了Tab按钮
	*/
	__proto.onTabClick=function(tag,evt){
		this.currTabIdx=this._ARR_TAB.indexOf(tag);
	}

	/**
	*Desc:设置tab按钮是否选中
	*/
	__proto.setTabSel=function(idx,v){
		if (idx < 0)
			return;
		var btn=this["tbtn"+this._ARR_TAB[idx]];
		btn.selected=v;
	}

	/**当被添加到父节点 */
	__proto._$6_onAdded=function(){
		this.size((this.parent).width,(this.parent).height);
	}

	/**当舞台尺寸发生变化 */
	__proto.onStageResize=function(){}
	/**更新布局 */
	__proto.updateLayout=function(){
		var mvWidth=this.width;
		this._mvScale=mvWidth / this._mainView.width;
		this._mainView.scale(this._mvScale,this._mvScale);
		var mvPos=this.updateBorder();
		this._mainView.pos(mvPos[0],mvPos[1]);
	}

	/**
	*更新边框
	*@return 课展区的位置
	*/
	__proto.updateBorder=function(){
		var mvWidth=this.mvSize[0];
		var mvHeight=this.mvSize[1];
		var mvPosY=this.height-mvHeight-this._PADDING_BOTTOM;
		this.boxBg.graphics.clear();
		return [0,0];
	}

	/**课展区的尺寸 */
	__getset(0,__proto,'mvSize',function(){
		if (!this._mvSize)
			this._mvSize=[this._mainView.width *this._mvScale,this._mainView.height *this._mvScale];
		return this._mvSize;
	});

	/**
	*Desc:当前选中的Tab下标
	*/
	__getset(0,__proto,'currTabIdx',null,function(v){
		if (v==this._currTabIdx)
			return;
		this.setTabSel(this._currTabIdx,false);
		this.setTabSel(v,true);
		this._currTabIdx=v;
		this.vsRight.selectedIndex=v;
	});

	ToolBox.uiView={"type":"View","props":{},"child":[{"type":"Box","props":{"var":"boxBg","top":0,"right":0,"left":0,"cacheAsBitmap":true,"bottom":0},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":0,"height":55,"fillColor":"#000000"}},{"type":"Rect","props":{"y":50,"x":1695,"width":225,"lineWidth":1,"height":960,"fillColor":"#000000"}},{"type":"Rect","props":{"y":50,"x":0,"width":5,"height":960,"fillColor":"#000000"}},{"type":"Rect","props":{"y":1005,"x":0,"width":1920,"height":75,"fillColor":"#000000"}}]},{"type":"Box","props":{"x":1726,"width":194,"var":"boxRight","top":0,"bottom":0},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":194,"lineWidth":1,"height":1080,"fillColor":"#f6f6f6"}},{"type":"Button","props":{"width":97,"var":"tbtnStu","toggle":true,"stateNum":2,"skin":"share/pithink_ui/btn_2.jpg","right":97,"labelSize":20,"labelPadding":"15","labelFont":"SimHei","labelColors":"#454c5e,#ff9900","label":"学生","height":84,"bottom":0},"child":[{"type":"Image","props":{"y":20,"skin":"share/pithink_ui/icon-xuesheng.png","name":"icon","centerX":0}}]},{"type":"Button","props":{"y":10,"width":97,"var":"tbtnFunc","toggle":true,"stateNum":2,"skin":"share/pithink_ui/btn_2.jpg","right":0,"labelSize":20,"labelPadding":"15","labelFont":"SimHei","labelColors":"#454c5e,#ff9900","label":"操作","height":84,"bottom":0},"child":[{"type":"Image","props":{"y":20,"skin":"share/pithink_ui/icon-caozuo.png","name":"icon","centerX":0}}]}]},{"type":"ViewStack","props":{"x":1726,"width":194,"var":"vsRight","top":40,"selectedIndex":1,"bottom":85},"child":[{"type":"Box","props":{"width":194,"var":"boxFunc","top":0,"runtime":"com.biz.ui.toolBox.BoxFunc","name":"item1","bottom":0},"child":[{"type":"Image","props":{"y":0,"skin":"share/pithink_ui/logo-shaonianpai.png","centerX":0}},{"type":"Image","props":{"y":572,"width":170,"skin":"share/ui/juxing_1.png","name":"bgSubj","height":150,"centerX":0,"sizeGrid":"19,19,21,18"}},{"type":"Button","props":{"y":165,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnEndLesson","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#454c5e,#454c5e","label":"下课","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-xiake.png","centerY":0}}]},{"type":"Button","props":{"y":247,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnReset","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#454c5e,#454c5e","label":"重置","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-chongzhi.png","centerY":0}}]},{"type":"Button","props":{"y":329,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnLock","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#ff6565,#ff6565","label":"解锁","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-jiesuo.png","name":"icon","centerY":0}}]},{"type":"Button","props":{"y":411,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnPrev","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#454c5e,#454c5e","label":"上一页","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-houtui.png","centerY":0}}]},{"type":"Button","props":{"y":493,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnNext","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#ff6565,#ff6565","label":"下一页","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-qianjin.png","centerY":0}}]},{"type":"Button","props":{"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnMusic","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#454c5e,#454c5e","height":69,"cacheAsBitmap":true,"bottom":10,"stateNum":2},"child":[{"type":"Image","props":{"skin":"share/pithink_ui/icon_sound_normal.png","name":"icon","centerY":0,"centerX":0}}]},{"type":"Button","props":{"y":575,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnPrevSubj","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#454c5e,#454c5e","label":"上一题","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-houtui.png","centerY":0}}]},{"type":"Button","props":{"y":657,"x":0,"width":194,"skin":"share/pithink_ui/btn_4.png","name":"btnNextSubj","labelSize":22,"labelPadding":"0,0,0,20","labelFont":"SimHei","labelColors":"#ff6565,#ff6565","label":"下一题","height":69,"cacheAsBitmap":true,"stateNum":2},"child":[{"type":"Image","props":{"x":50,"skin":"share/pithink_ui/annniu-qianjin.png","centerY":0}}]},{"type":"Image","props":{"y":965,"x":-486,"width":456,"skin":"share/ui/juxing_1.png","name":"bgBursh","height":70,"sizeGrid":"19,19,21,18"}},{"type":"Button","props":{"y":976,"x":-191,"width":150,"toggle":true,"skin":"share/pithink_ui/btn_5.jpg","name":"btnBrush","label":"画笔","height":50,"centerX":-213,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}},{"type":"Button","props":{"y":976,"x":-357,"width":45,"toggle":true,"skin":"share/pithink_ui/btn_5.jpg","name":"btnFree","label":"任","height":50,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}},{"type":"Button","props":{"y":976,"x":-304,"width":45,"toggle":true,"skin":"share/pithink_ui/btn_5.jpg","name":"btnLine","label":"直","height":50,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}},{"type":"Button","props":{"y":976,"x":-252,"width":45,"toggle":true,"skin":"share/pithink_ui/btn_5.jpg","name":"btnRect","label":"矩","height":50,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}},{"type":"Button","props":{"y":976,"x":-471,"width":45,"skin":"share/pithink_ui/btn_5.jpg","name":"btnClear","label":"清","height":50,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}},{"type":"Button","props":{"y":976,"x":-418,"width":45,"skin":"share/pithink_ui/btn_5.jpg","name":"btnUndo","label":"撤","height":50,"stateNum":2,"sizeGrid":"5,5,5,5","labelSize":30,"labelFont":"\"SimHei\""}}]},{"type":"Box","props":{"var":"boxStu","top":0,"runtime":"com.biz.ui.toolBox.StudentList","name":"item0","bottom":0},"child":[{"type":"List","props":{"x":0,"width":194,"repeatX":1,"name":"listStu","height":956},"child":[{"type":"Box","props":{"y":0,"x":0,"width":194,"renderType":"render","height":160},"child":[{"type":"Rect","props":{"y":6,"x":42,"width":110,"lineWidth":1,"height":110,"fillColor":"#6678ea"}},{"type":"Image","props":{"y":6,"x":42,"width":110,"skin":"share/pithink_ui/img_kid_1.png","name":"imgHead","height":110}},{"type":"Image","props":{"y":0,"x":0,"skin":"share/pithink_ui/bg_user_4.png","name":"bg","height":160,"sizeGrid":"118,0,0,0"}},{"type":"Image","props":{"y":50,"skin":"share/pithink_ui/icon-jiesuo-x.png","right":10,"name":"imgLState"}},{"type":"Image","props":{"y":6,"x":121,"skin":"share/pithink_ui/fengshu-di.png"}},{"type":"Label","props":{"y":14,"x":124,"width":30,"text":"99","name":"lblScore","fontSize":20,"font":"SimHei","color":"#ffffff","bold":false,"align":"center"}},{"type":"Label","props":{"width":150,"text":"label","name":"lblName","fontSize":30,"color":"#333333","centerX":0,"bottom":10,"align":"center"}},{"type":"Sprite","props":{"name":"imgLine"},"child":[{"type":"Line","props":{"y":159,"x":30,"toY":0,"toX":134,"lineWidth":1,"lineColor":"#cccccc"}}]}]}]},{"type":"Box","props":{"y":521,"x":-270,"width":317,"name":"boxMenu","height":175},"child":[{"type":"Image","props":{"width":317,"top":0,"skin":"share/pithink_ui/tips-di2.png","sizeGrid":"102,59,24,22","right":0,"name":"bg","left":0,"height":322,"bottom":0}},{"type":"Image","props":{"width":317,"top":0,"skin":"share/pithink_ui/tips-di2-1.png","sizeGrid":"21,60,100,21","right":0,"name":"bg2","left":0,"height":222,"bottom":0}},{"type":"Label","props":{"y":47,"width":153,"text":"乐迪乐迪","name":"lblName","fontSize":28,"font":"Microsoft YaHei","color":"#ffffff","centerX":1,"align":"center"}},{"type":"Label","props":{"y":104,"width":100,"text":"100","name":"lblScore","fontSize":32,"font":"Microsoft YaHei","color":"#454c5e","centerX":1.5,"align":"center"}},{"type":"Button","props":{"y":96,"x":10,"width":113,"skin":"share/pithink_ui/btn_5.jpg","name":"btnPlus","labelSize":40,"labelFont":"SimHei","labelColors":"#9654b6,#9654b6","labelBold":true,"label":"+","height":60,"stateNum":2,"sizeGrid":"5,5,5,5"}},{"type":"Button","props":{"y":96,"width":113,"skin":"share/pithink_ui/btn_5.jpg","right":10,"name":"btnMinus","labelSize":40,"labelFont":"SimHei","labelColors":"#9654b6,#9654b6","labelBold":true,"label":"-","height":60,"stateNum":2,"sizeGrid":"5,5,5,5"}},{"type":"Sprite","props":{"x":252,"width":65,"name":"btnClose","height":65}}]}]}]},{"type":"Box","props":{"var":"boxArrow","width":50,"name":"item0","height":150,"x":0,"centerY":0,"anchorX":1,"anchorY":0.5},"child":[{"type":"Image","props":{"width":50,"skin":"share/ui/window_zhiyingdian.png","height":150}},{"type":"Image","props":{"var":"arrow","skin":"share/ui/arrow_zhiyingdian.png","anchorX":0.5,"anchorY":0.5,"centerX":0,"centerY":0}}]}]};
	return ToolBox;
})(View)


//class com.subject.module.specialklview.AfterLessonView extends com.klzz.ui.KlView
var AfterLessonView=(function(_super){
	function AfterLessonView(cfg,name){
		//滑动起点y
		this.vy=0;
		this.ledi=null;
		this.zhi=null;
		this.hei=null;
		AfterLessonView.__super.call(this,cfg,name);
	}

	__class(AfterLessonView,'com.subject.module.specialklview.AfterLessonView',_super);
	var __proto=AfterLessonView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		_super.prototype.createChildren.call(this);
		this.createView(AfterLessonView.uiView);
	}

	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		VipThink.viewMgr.playVideo("",0);
		VipThink.viewMgr.playVideo("share/animation/aiafter1.mp4",1);
		VipThink.viewMgr.once("videoEnd",this,this.onVideoEnd);
	}

	__proto.onVideoEnd=function(){
		VipThink.viewMgr.playVideo("share/animation/aiafter1.mp4",0);
		Tween.to(this.hei,{alpha:1},1000,null,Handler.create(this,this.endT));
	}

	__proto.endT=function(){
		this.zhi.visible=true;
		this.ledi.visible=true;
		Tween.to(this.hei,{alpha:0},1000,null,Handler.create(this,this.endTT));
	}

	__proto.endTT=function(){
		Tween.clearAll(this.hei);
		this.timer.once(10000,this,this.endHua);
		this.once("mousedown",this,this.onDown);
	}

	__proto.onDown=function(){
		this.once("mouseup",this,this.onUp);
		var point=this.localToGlobal(new Point(this.mouseX,this.mouseY));
		this.vy=point.y;
	}

	__proto.onUp=function(){
		var point=this.localToGlobal(new Point(this.mouseX,this.mouseY));
		if(point.y-this.vy >=100){
			this.off("mousedown",this,this.onDown);
			this.off("mouseup",this,this.onUp);
			this.endHua();
		}
	}

	__proto.endHua=function(){
		this.timer.clear(this,this.endHua);
		this.zhi.visible=false;
		this.ledi.once("end",this,this.endSke);
		this.ledi.play("biyan",false);
	}

	__proto.endSke=function(){
		this.ledi.play("papa3",true);
		this.playSound("share/sound/aimusic.wav");
		this.timerOnce(30000,this,this.endMusic);
	}

	__proto.endMusic=function(){
		Tween.to(this.hei,{alpha:1},1500,null,Handler.create(this,this.endT2));
	}

	__proto.endT2=function(){
		Tween.clearAll(this.hei);
		VipThink.viewMgr.playVideo("share/animation/aiafter2.mp4",1,1);
	}

	__proto.destroy=function(destroyChildren){
		(destroyChildren===void 0)&& (destroyChildren=true);
		_super.prototype.destroy.call(this,destroyChildren);
		VipThink.viewMgr.playVideo("",0);
		console.log("销毁");
	}

	AfterLessonView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"share/bg_beforeLesson.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":552,"x":979,"visible":false,"var":"ledi","url":"share/animation/game.sk","stopAt":0,"scaleY":1.5,"scaleX":1.5,"preview":"false","isLoop":"false","currAniName":"biyan"}},{"type":"SkeletonPlayer","props":{"y":282,"x":1389,"visible":false,"var":"zhi","url":"share/animation/game.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"down"}},{"type":"Box","props":{"y":0,"x":0,"var":"hei","alpha":0},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]}]};
	AfterLessonView.__init$=function(){{
			SpecialKlViewFactory.regist("afterLesson",AfterLessonView);
		};
	}

	return AfterLessonView;
})(KlView)


//class com.subject.module.specialklview.ascendCeremonyV3.AscendCeremonyV3 extends com.klzz.ui.KlView
var AscendCeremonyV3=(function(_super){
	function AscendCeremonyV3(){
		this.guideImg=null;
		this.peopleAni=null;
		this.bookAni=null;
		this.resetBtn=null;
		/**
		*书本打开
		*/
		this._playBook=false;
		AscendCeremonyV3.__super.call(this);
	}

	__class(AscendCeremonyV3,'com.subject.module.specialklview.ascendCeremonyV3.AscendCeremonyV3',_super);
	var __proto=AscendCeremonyV3.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		View.regComponent("ScaleButton",ScaleButton);
		_super.prototype.createChildren.call(this);
		this.playBook=false;
		var res_arr=[
		{url:"res/atlas/game_ascendV3/image.atlas",type:"atlas"},
		{url:"game_ascendV3/image/ascend_bg.jpg",type:"image"},
		{url:"game_ascendV3/animation/game.sk",type:"arraybuffer"},
		{url:"game_ascendV3/animation/game.png",type:"image"},
		{url:"game_ascendV3/animation/rw1.sk",type:"arraybuffer"},
		{url:"game_ascendV3/animation/rw1.png",type:"image"},
		{url:"game_ascendV3/animation/book.sk",type:"arraybuffer"},
		{url:"game_ascendV3/animation/book.png",type:"image"},
		{url:"game_ascendV3/sound/ascend_bg.mp3",type:"sound"}]
		Laya.loader.load(res_arr);
		this.createView(AscendCeremonyV3.uiView);
	}

	// }
	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		_super.prototype.initView.call(this,byReset)
		this.playMusicUnSync("game_ascendV3/sound/ascend_bg.mp3");
		this.resetBtn.on("click",this,this.onResetBtn);
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.onNativeToLaya);
	}

	// 根据不同的数据播放事件
	__proto.onNativeToLaya=function(args){
		var minorType=args.minorType;
		console.debug("AscendCeremonyV3--------------onNativeToLaya------------- 接收native事件"+minorType);
		var detail;
		if(minorType=="trophyStage"){
			this.studentsOnStage();
		}
		else if(minorType=="trophyPrize"){
			this.medalPresentation();
		}
		else if(minorType=="trophyReset"){
			this.onResetBtn();
		}
	}

	//点击重置按钮
	__proto.onResetBtn=function(){
		this.playBook=false;
		this.bookAni.play("game_book2",false);
		this.bookAni.stopAtStart();
		this.peopleAni.visible=false;
		this.guideImg.visible=true;
	}

	//学生上台后~~
	__proto.studentsOnStage=function(){
		if(this.peopleAni.visible)
			return;
		this.guideImg.visible=false;
		this.resetBtn.mouseEnabled=false;
		this.peopleAni.visible=true;
		this.peopleAni.play("rw1_idle0",false);
		this.peopleAni.once("end",this,this.onPeopleAniEnd);
	}

	__proto.onPeopleAniEnd=function(){
		this.peopleAni.play("rw1_idle1",true);
		this.resetBtn.mouseEnabled=true;
	}

	//颁奖后~~
	__proto.medalPresentation=function(){
		if(!this.peopleAni.visible||(this.peopleAni.currAniName=="rw1_idle2"))
			return;
		this.peopleAni.play("rw1_idle2",true);
		this.playBook=true;
		this.resetBtn.mouseEnabled=true;
	}

	__getset(0,__proto,'playBook',function(){
		return this._playBook;
		},function(value){
		this.sync("playBook",this.playBook,value)
		this._playBook=value;
		if(this._playBook){
			if(this.bookAni){
				if(this.bookAni.index<3)
					this.bookAni.play("game_book2",false);
			}
		}
	});

	AscendCeremonyV3.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"game_ascendV3/image/ascend_bg.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":562,"x":960,"url":"game_ascendV3/animation/game.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"game_qi1"}},{"type":"Image","props":{"y":325,"x":960,"width":405,"var":"guideImg","skin":"game_ascendV3/image/img1.png","height":307,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":802,"x":960,"visible":false,"var":"peopleAni","url":"game_ascendV3/animation/rw1.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"rw1_idle0"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"bookAni","url":"game_ascendV3/animation/book.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"game_book2"}},{"type":"ScaleButton","props":{"y":100,"x":1815,"var":"resetBtn","skin":"share/ui/sbtn_reset.png"}}]};
	AscendCeremonyV3.__init$=function(){{
			SpecialKlViewFactory.regist("ascendCeremonyV3",AscendCeremonyV3);
		};
	}

	return AscendCeremonyV3;
})(KlView)


//class com.subject.module.specialklview.ascendCeremonyV3.AscendCeremonyV3UI extends com.klzz.ui.KlView
var AscendCeremonyV3UI=(function(_super){
	function AscendCeremonyV3UI(){
		this.guideImg=null;
		this.peopleAni=null;
		this.bookAni=null;
		this.resetBtn=null;
		AscendCeremonyV3UI.__super.call(this);
	}

	__class(AscendCeremonyV3UI,'com.subject.module.specialklview.ascendCeremonyV3.AscendCeremonyV3UI',_super);
	var __proto=AscendCeremonyV3UI.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		View.regComponent("ScaleButton",ScaleButton);
		_super.prototype.createChildren.call(this);
		this.createView(AscendCeremonyV3UI.uiView);
	}

	AscendCeremonyV3UI.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"game_ascendV3/image/ascend_bg.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":562,"x":960,"url":"game_ascendV3/animation/game.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"game_qi1"}},{"type":"Image","props":{"y":325,"x":960,"width":405,"var":"guideImg","skin":"game_ascendV3/image/img1.png","height":307,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":802,"x":960,"visible":false,"var":"peopleAni","url":"game_ascendV3/animation/rw1.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"rw1_idle0"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"bookAni","url":"game_ascendV3/animation/book.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"game_book2"}},{"type":"ScaleButton","props":{"y":100,"x":1815,"var":"resetBtn","skin":"share/ui/sbtn_reset.png"}}]};
	return AscendCeremonyV3UI;
})(KlView)


//class com.subject.module.specialklview.BeforeLessonView extends com.klzz.ui.KlView
var BeforeLessonView=(function(_super){
	function BeforeLessonView(cfg,name){
		this.bgImg=null;
		this.ldMc=null;
		this.guideMc=null;
		this.hei=null;
		this._timerCount=0;
		this._clickCount=0;
		BeforeLessonView.__super.call(this,cfg,name);
	}

	__class(BeforeLessonView,'com.subject.module.specialklview.BeforeLessonView',_super);
	var __proto=BeforeLessonView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		_super.prototype.createChildren.call(this);
		this.createView(BeforeLessonView.uiView);
	}

	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		_super.prototype.initView.call(this,byReset)
		this._timerCount=0;
		this._clickCount=0;
		VipThink.viewMgr.playVideo("share/animation/beforeLesson01.mp4");
		VipThink.viewMgr.once("videoEnd",this,this.onVideoEnd);
		this.bgImg.on("mousedown",this,this.onMouseDown);
	}

	__proto.onVideoEnd=function(_num){
		VipThink.viewMgr.playVideo("",0);
		this.bgImg.mouseEnabled=false;
		Tween.to(this.hei,{alpha:1},1000,null,Handler.create(this,this.endT,[0]))
	}

	__proto.endT=function(_num){
		if(_num==0){
			this.ldMc.visible=this.guideMc.visible=true;
			Tween.to(this.hei,{alpha:0},1000,null,Handler.create(this,this.endT,[1]))
			}else{
			this.bgImg.mouseEnabled=true;
			this.timerOnce(10000,this,this.onLdEnd,[1]);
		}
	}

	__proto.onMouseDown=function(){
		this.timer.clearAll(this);
		this.guideMc.visible=false;
		this.bgImg.mouseEnabled=false;
		this.playSound("share/sound/beforeLesson_01.wav");
		this.ldMc.play("papa2",false)
		this.ldMc.once("end",this,this.onLdEnd);
	}

	__proto.onLdEnd=function(_num){
		(_num===void 0)&& (_num=0);
		this._clickCount++;
		if(this._clickCount==3||_num==1){
			Tween.to(this.hei,{alpha:1},1000,null,Handler.create(this,this.endT2))
			this.timer.clearAll(this);
			}else{
			this.ldMc.play("papa1",true)
			this.guideMc.visible=true;
			this.bgImg.mouseEnabled=true;
			this.timerOnce(10000,this,this.onLdEnd,[1]);
		}
	}

	__proto.endT2=function(){
		VipThink.viewMgr.playVideo("share/animation/beforeLesson02.mp4",1,1);
	}

	__proto.destroy=function(destroyChildren){
		(destroyChildren===void 0)&& (destroyChildren=true);
		_super.prototype.destroy.call(this,destroyChildren);
		VipThink.viewMgr.playVideo("",0);
		console.log("销毁");
	}

	BeforeLessonView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"width":1920,"var":"bgImg","skin":"share/bg_beforeLesson.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"ldMc","url":"share/animation/game.sk","stopAt":1,"scaleY":1.49,"scaleX":1.49,"preview":false,"isLoop":true,"currAniName":"papa1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"guideMc","url":"share/animation/game.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"malu"}},{"type":"Box","props":{"width":1920,"var":"hei","height":1080,"alpha":0},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]}]};
	BeforeLessonView.__init$=function(){{
			SpecialKlViewFactory.regist("beforeLesson",BeforeLessonView);
		};;
	}

	return BeforeLessonView;
})(KlView)


//class com.subject.module.specialklview.evaguide.EvaGuideUI extends com.klzz.ui.KlView
var EvaGuideUI=(function(_super){
	function EvaGuideUI(){
		this.bg=null;
		this.btn_ok=null;
		this.btn_rst=null;
		this.btn_sound=null;
		this.lab_subj=null;
		this.hit_place1=null;
		this.hit_place2=null;
		this.keyboard=null;
		this.key_3=null;
		this.box_xigua=null;
		this.xigua2=null;
		this.drop_place=null;
		this.ld=null;
		this.ani2=null;
		this.xing=null;
		this.zc=null;
		this.box_end=null;
		this.sp_clear=null;
		this.sp_again=null;
		this.btn_skip=null;
		this.xigua=null;
		this.outBox=null;
		EvaGuideUI.__super.call(this);
	}

	__class(EvaGuideUI,'com.subject.module.specialklview.evaguide.EvaGuideUI',_super);
	var __proto=EvaGuideUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("ScaleButton",ScaleButton);
		View.regComponent("KlKey",KlKey);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		_super.prototype.createChildren.call(this);
		if(this.isEn()){
			this.createView(EvaGuideUI.uiView_en);
			}else{
			this.createView(EvaGuideUI.uiView);
		}
	}

	__proto.isEn=function(){
		var courseObj=VipThink.config.courseCfg;
		if (courseObj && courseObj.lang==="en")
			return true;
		else
		return false;
	}

	EvaGuideUI.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"bg","skin":"game_yxhhh/image/bg1.jpg","height":1080}},{"type":"ScaleButton","props":{"y":89,"x":1785,"var":"btn_ok","skin":"share/ui/bt_wancheng_new.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":89,"x":1557,"var":"btn_rst","skin":"share/ui/bt_xiugai_new.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":91,"x":113,"var":"btn_sound","skin":"share/ui/bt_sound_new.png","mouseEnabled":false,"label":""}},{"type":"Label","props":{"y":64,"x":256,"var":"lab_subj","strokeColor":"#ffffff","stroke":5,"mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#333333","bold":false}},{"type":"Sprite","props":{"y":518,"x":1563,"width":492,"var":"hit_place1","pivotY":183,"pivotX":246,"height":367}},{"type":"Sprite","props":{"y":720,"x":787,"width":166,"var":"hit_place2","height":158}},{"type":"Box","props":{"visible":false,"var":"keyboard","mouseThrough":true},"child":[{"type":"Image","props":{"y":698,"x":902,"skin":"share/ui/newkb/v3/blue/arrow.png","scaleY":2,"scaleX":2,"rotation":180}},{"type":"Image","props":{"y":258,"x":312,"width":566,"skin":"share/ui/newkb/v3/blue/di2.png","sizeGrid":"43,50,40,42","scaleY":2,"scaleX":2,"height":193}},{"type":"KlKey","props":{"y":372,"x":418,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"1","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":577,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"2","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":732,"width":160,"var":"key_3","pivotY":77,"pivotX":80,"mouseEnabled":true,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"4","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"5","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":419,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"6","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":576,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"7","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":732,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"8","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"9","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"0","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":448,"x":1255,"width":240,"pivotY":118,"pivotX":120,"mouseEnabled":false,"height":236},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"Image","props":{"y":48,"x":46,"skin":"share/ui/newkb/v3/blue/ca.png","scaleY":2,"scaleX":2}}]}]},{"type":"Box","props":{"visible":false,"var":"box_xigua","mouseThrough":true},"child":[{"type":"Image","props":{"y":827,"x":1290,"width":380,"skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":827,"x":600,"width":380,"var":"xigua2","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Sprite","props":{"y":533,"x":954,"width":482,"var":"drop_place","pivotY":153,"pivotX":241,"height":306}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"ld","url":"game_yxhhh/animation/ld.sk","stopAt":1,"isLoop":false,"currAniName":"1_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"ani2","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":false,"currAniName":"3_5"}},{"type":"SkeletonPlayer","props":{"y":300,"x":207,"visible":false,"var":"xing","url":"game_yxhhh/animation/xxing.sk","stopAt":0,"scaleY":0.5,"scaleX":0.5,"isLoop":"false","currAniName":"xxing"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"zc","url":"game_yxhhh/animation/zc.sk","stopAt":0,"preview":"false","isLoop":"false","currAniName":"zc_2"}},{"type":"Box","props":{"visible":false,"var":"box_end","mouseThrough":true},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/pph.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/paw.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/cml.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"Sprite","props":{"y":164,"x":368,"width":548,"var":"sp_clear","height":384}},{"type":"Sprite","props":{"y":166,"x":1050,"width":548,"var":"sp_again","height":384}}]},{"type":"ScaleButton","props":{"y":956,"x":1794,"var":"btn_skip","skin":"game_yxhhh/image/skip.png","label":""}},{"type":"Image","props":{"y":827,"x":600,"width":380,"visible":false,"var":"xigua","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Box","props":{"width":1920,"var":"outBox","mouseThrough":true,"height":1080},"child":[{"type":"Rect","props":{"y":-37,"x":1,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":-55,"x":1819,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":0,"x":3,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":983,"x":24,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}}]}]};
	EvaGuideUI.uiView_en={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"bg","skin":"game_yxhhh/image/bg1.jpg","height":1080}},{"type":"ScaleButton","props":{"y":89,"x":1785,"var":"btn_ok","skin":"share/ui/bt_wancheng_new_en.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":89,"x":1557,"var":"btn_rst","skin":"share/ui/bt_xiugai_new_en.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":91,"x":113,"var":"btn_sound","skin":"share/ui/bt_sound_new.png","mouseEnabled":false,"label":""}},{"type":"Label","props":{"y":64,"x":256,"var":"lab_subj","strokeColor":"#ffffff","stroke":5,"mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#333333","bold":false}},{"type":"Sprite","props":{"y":518,"x":1563,"width":492,"var":"hit_place1","pivotY":183,"pivotX":246,"height":367}},{"type":"Sprite","props":{"y":720,"x":787,"width":166,"var":"hit_place2","height":158}},{"type":"Box","props":{"visible":false,"var":"keyboard","mouseThrough":true},"child":[{"type":"Image","props":{"y":698,"x":902,"skin":"share/ui/newkb/v3/blue/arrow.png","scaleY":2,"scaleX":2,"rotation":180}},{"type":"Image","props":{"y":258,"x":312,"width":566,"skin":"share/ui/newkb/v3/blue/di2.png","sizeGrid":"43,50,40,42","scaleY":2,"scaleX":2,"height":193}},{"type":"KlKey","props":{"y":372,"x":418,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"1","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":577,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"2","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":732,"width":160,"var":"key_3","pivotY":77,"pivotX":80,"mouseEnabled":true,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"4","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"5","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":419,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"6","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":576,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"7","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":732,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"8","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"9","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"0","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":448,"x":1255,"width":240,"pivotY":118,"pivotX":120,"mouseEnabled":false,"height":236},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"Image","props":{"y":48,"x":46,"skin":"share/ui/newkb/v3/blue/ca.png","scaleY":2,"scaleX":2}}]}]},{"type":"Box","props":{"visible":false,"var":"box_xigua","mouseThrough":true},"child":[{"type":"Image","props":{"y":827,"x":1290,"width":380,"skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":827,"x":600,"width":380,"var":"xigua2","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Sprite","props":{"y":533,"x":954,"width":482,"var":"drop_place","pivotY":153,"pivotX":241,"height":306}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"ld","url":"game_yxhhh/animation/ld.sk","stopAt":1,"isLoop":false,"currAniName":"1_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"ani2","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":false,"currAniName":"3_5"}},{"type":"SkeletonPlayer","props":{"y":300,"x":207,"visible":false,"var":"xing","url":"game_yxhhh/animation/xxing.sk","stopAt":0,"scaleY":0.5,"scaleX":0.5,"isLoop":"false","currAniName":"xxing"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"zc","url":"game_yxhhh/animation/zc.sk","stopAt":0,"preview":"false","isLoop":"false","currAniName":"zc_2"}},{"type":"Box","props":{"visible":false,"var":"box_end","mouseThrough":true},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/pph.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/paw.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/cml.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"idle_1"}},{"type":"Sprite","props":{"y":164,"x":368,"width":548,"var":"sp_clear","height":384}},{"type":"Sprite","props":{"y":166,"x":1050,"width":548,"var":"sp_again","height":384}}]},{"type":"ScaleButton","props":{"y":956,"x":1794,"var":"btn_skip","skin":"game_yxhhh/image/skip.png","label":""}},{"type":"Image","props":{"y":827,"x":600,"width":380,"visible":false,"var":"xigua","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Box","props":{"width":1920,"var":"outBox","mouseThrough":true,"height":1080},"child":[{"type":"Rect","props":{"y":-37,"x":1,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":-55,"x":1819,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":0,"x":3,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":983,"x":24,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}}]}]};
	return EvaGuideUI;
})(KlView)


//class com.subject.module.specialklview.evaguidev4.EvaGuideV4UI extends com.klzz.ui.KlView
var EvaGuideV4UI=(function(_super){
	function EvaGuideV4UI(){
		this.bg=null;
		this.btn_ok=null;
		this.btn_rst=null;
		this.btn_sound=null;
		this.lab_subj=null;
		this.hit_place1=null;
		this.hit_place2=null;
		this.keyboard=null;
		this.key_3=null;
		this.font_num=null;
		this.box_xigua=null;
		this.xigua2=null;
		this.drop_place=null;
		this.xigua1=null;
		this.ld=null;
		this.ani2=null;
		this.xigua=null;
		this.xing=null;
		this.zc=null;
		this.box_end=null;
		this.sp_clear=null;
		this.sp_again=null;
		this.btn_skip=null;
		this.outBox=null;
		EvaGuideV4UI.__super.call(this);
	}

	__class(EvaGuideV4UI,'com.subject.module.specialklview.evaguidev4.EvaGuideV4UI',_super);
	var __proto=EvaGuideV4UI.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("ScaleButton",ScaleButton);
		View.regComponent("KlKey",KlKey);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		_super.prototype.createChildren.call(this);
		if(this.isEn()){
			this.createView(EvaGuideV4UI.uiView_en);
			}else{
			this.createView(EvaGuideV4UI.uiView);
		}
	}

	__proto.isEn=function(){
		var courseObj=VipThink.config.courseCfg;
		if (courseObj && courseObj.lang==="en")
			return true;
		else
		return false;
	}

	EvaGuideV4UI.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"bg","skin":"game_yxhhh/image/bg1.jpg","height":1080}},{"type":"ScaleButton","props":{"y":85,"x":1782,"width":193,"var":"btn_ok","skin":"share/ui/bt_wancheng_new.png","pivotY":48,"pivotX":93.5,"mouseEnabled":false,"label":"","height":99}},{"type":"ScaleButton","props":{"y":90,"x":1558,"var":"btn_rst","skin":"share/ui/bt_xiugai_new.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":91,"x":113,"visible":false,"var":"btn_sound","skin":"share/ui/bt_sound_new.png","mouseEnabled":false,"label":""}},{"type":"Label","props":{"y":64,"x":256,"var":"lab_subj","strokeColor":"#ffffff","stroke":5,"mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#333333","bold":false}},{"type":"Sprite","props":{"y":518,"x":1563,"width":492,"var":"hit_place1","pivotY":183,"pivotX":246,"height":367}},{"type":"Sprite","props":{"y":720,"x":787,"width":166,"var":"hit_place2","height":158}},{"type":"Box","props":{"visible":false,"var":"keyboard","mouseThrough":true},"child":[{"type":"Image","props":{"y":698,"x":902,"skin":"share/ui/newkb/v3/blue/arrow.png","scaleY":2,"scaleX":2,"rotation":180}},{"type":"Image","props":{"y":258,"x":312,"width":566,"skin":"share/ui/newkb/v3/blue/di2.png","sizeGrid":"43,50,40,42","scaleY":2,"scaleX":2,"height":193}},{"type":"KlKey","props":{"y":372,"x":418,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"1","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":577,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"2","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":732,"width":160,"var":"key_3","pivotY":77,"pivotX":80,"mouseEnabled":true,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"4","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"5","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":419,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"6","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":576,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"7","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":732,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"8","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"9","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"0","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":448,"x":1255,"width":240,"pivotY":118,"pivotX":120,"mouseEnabled":false,"height":236},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"Image","props":{"y":48,"x":46,"skin":"share/ui/newkb/v3/blue/ca.png","scaleY":2,"scaleX":2}}]}]},{"type":"FontClip","props":{"y":766,"x":833,"visible":false,"var":"font_num","value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}},{"type":"Box","props":{"visible":false,"var":"box_xigua","mouseThrough":true},"child":[{"type":"Image","props":{"y":827,"x":1290,"width":380,"skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":827,"x":600,"width":380,"var":"xigua2","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Sprite","props":{"y":533,"x":954,"width":482,"var":"drop_place","pivotY":153,"pivotX":241,"height":306}},{"type":"Image","props":{"y":533,"x":954,"width":380,"visible":false,"var":"xigua1","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"ld","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":true,"currAniName":"1_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"ani2","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":false,"currAniName":"3_5"}},{"type":"Image","props":{"y":827,"x":600,"width":380,"visible":false,"var":"xigua","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":300,"x":207,"visible":false,"var":"xing","url":"game_yxhhh/animation/xxing.sk","stopAt":0,"scaleY":0.5,"scaleX":0.5,"isLoop":"false","currAniName":"xxing"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"zc","url":"game_yxhhh/animation/zc.sk","stopAt":0,"isLoop":"false","currAniName":"zc_2"}},{"type":"Box","props":{"visible":false,"var":"box_end","mouseThrough":true},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/pph.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"pph_idle1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/paw.sk","stopAt":1,"isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/cml.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"cml_idle1"}},{"type":"Sprite","props":{"y":164,"x":368,"width":548,"var":"sp_clear","height":384}},{"type":"Sprite","props":{"y":166,"x":1050,"width":548,"var":"sp_again","height":384}}]},{"type":"ScaleButton","props":{"y":956,"x":1794,"var":"btn_skip","skin":"game_yxhhh/image/skip.png","label":""}},{"type":"Box","props":{"width":1920,"var":"outBox","mouseThrough":true,"height":1080},"child":[{"type":"Rect","props":{"y":-37,"x":1,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":-55,"x":1819,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":0,"x":3,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":983,"x":24,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}}]}]};
	EvaGuideV4UI.uiView_en={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"bg","skin":"game_yxhhh/image/bg1.jpg","height":1080}},{"type":"ScaleButton","props":{"y":85,"x":1782,"width":193,"var":"btn_ok","skin":"share/ui/bt_wancheng_new_en.png","pivotY":48,"pivotX":93.5,"mouseEnabled":false,"label":"","height":99}},{"type":"ScaleButton","props":{"y":90,"x":1558,"var":"btn_rst","skin":"share/ui/bt_xiugai_new_en.png","mouseEnabled":false,"label":""}},{"type":"ScaleButton","props":{"y":91,"x":113,"visible":false,"var":"btn_sound","skin":"share/ui/bt_sound_new.png","mouseEnabled":false,"label":""}},{"type":"Label","props":{"y":64,"x":256,"var":"lab_subj","strokeColor":"#ffffff","stroke":5,"mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#333333","bold":false}},{"type":"Sprite","props":{"y":518,"x":1563,"width":492,"var":"hit_place1","pivotY":183,"pivotX":246,"height":367}},{"type":"Sprite","props":{"y":720,"x":787,"width":166,"var":"hit_place2","height":158}},{"type":"Box","props":{"visible":false,"var":"keyboard","mouseThrough":true},"child":[{"type":"Image","props":{"y":698,"x":902,"skin":"share/ui/newkb/v3/blue/arrow.png","scaleY":2,"scaleX":2,"rotation":180}},{"type":"Image","props":{"y":258,"x":312,"width":566,"skin":"share/ui/newkb/v3/blue/di2.png","sizeGrid":"43,50,40,42","scaleY":2,"scaleX":2,"height":193}},{"type":"KlKey","props":{"y":372,"x":418,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"1","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":577,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"2","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":732,"width":160,"var":"key_3","pivotY":77,"pivotX":80,"mouseEnabled":true,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"4","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":372,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"5","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":419,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"6","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":576,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"7","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":732,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"8","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":886,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"9","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":532,"x":1044,"width":160,"pivotY":77,"pivotX":80,"mouseEnabled":false,"height":154},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/numbtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"FontClip","props":{"y":30,"x":44,"value":"0","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}}]},{"type":"KlKey","props":{"y":448,"x":1255,"width":240,"pivotY":118,"pivotX":120,"mouseEnabled":false,"height":236},"child":[{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_down.png","scaleY":2,"scaleX":2,"name":"active"}},{"type":"Image","props":{"skin":"share/ui/newkb/v3/blue/cabtn_up.png","scaleY":2,"scaleX":2,"name":"normal"}},{"type":"Image","props":{"y":48,"x":46,"skin":"share/ui/newkb/v3/blue/ca.png","scaleY":2,"scaleX":2}}]}]},{"type":"FontClip","props":{"y":766,"x":833,"visible":false,"var":"font_num","value":"3","skin":"share/ui/newkb/v3/blue/key_num.png","sheet":"1234 5678 90+- <>=","scaleY":0.8,"scaleX":0.8}},{"type":"Box","props":{"visible":false,"var":"box_xigua","mouseThrough":true},"child":[{"type":"Image","props":{"y":827,"x":1290,"width":380,"skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":827,"x":600,"width":380,"var":"xigua2","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}}]},{"type":"Sprite","props":{"y":533,"x":954,"width":482,"var":"drop_place","pivotY":153,"pivotX":241,"height":306}},{"type":"Image","props":{"y":533,"x":954,"width":380,"visible":false,"var":"xigua1","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"ld","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":true,"currAniName":"1_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"ani2","url":"game_yxhhh/animation/ld.sk","stopAt":0,"preview":true,"isLoop":false,"currAniName":"3_5"}},{"type":"Image","props":{"y":827,"x":600,"width":380,"visible":false,"var":"xigua","skin":"game_yxhhh/image/xigua.png","height":304,"anchorY":0.5,"anchorX":0.5}},{"type":"SkeletonPlayer","props":{"y":300,"x":207,"visible":false,"var":"xing","url":"game_yxhhh/animation/xxing.sk","stopAt":0,"scaleY":0.5,"scaleX":0.5,"isLoop":"false","currAniName":"xxing"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"var":"zc","url":"game_yxhhh/animation/zc.sk","stopAt":0,"isLoop":"false","currAniName":"zc_2"}},{"type":"Box","props":{"visible":false,"var":"box_end","mouseThrough":true},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/pph.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"pph_idle1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/paw.sk","stopAt":1,"isLoop":true,"currAniName":"idle_1"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"url":"game_yxhhh/animation/cml.sk","stopAt":1,"preview":"false","isLoop":true,"currAniName":"cml_idle1"}},{"type":"Sprite","props":{"y":164,"x":368,"width":548,"var":"sp_clear","height":384}},{"type":"Sprite","props":{"y":166,"x":1050,"width":548,"var":"sp_again","height":384}}]},{"type":"ScaleButton","props":{"y":956,"x":1794,"var":"btn_skip","skin":"game_yxhhh/image/skip.png","label":""}},{"type":"Box","props":{"width":1920,"var":"outBox","mouseThrough":true,"height":1080},"child":[{"type":"Rect","props":{"y":-37,"x":1,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":-55,"x":1819,"width":107,"renderType":"hit","lineWidth":1,"height":1156,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":0,"x":3,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}},{"type":"Rect","props":{"y":983,"x":24,"width":1869,"renderType":"hit","lineWidth":1,"height":94,"fillColor":"#ff0000"}}]}]};
	return EvaGuideV4UI;
})(KlView)


//class com.subject.module.specialklview.LittleTeacherView extends com.klzz.ui.KlView
var LittleTeacherView=(function(_super){
	function LittleTeacherView(){
		this._bg=null;
		this._main=null;
		this._soundbtn=null;
		this._title=null;
		this._go=null;
		this._secondaryPage=null;
		this._closebtn=null;
		this.titleImg=null;
		this.descImg=null;
		LittleTeacherView.__super.call(this);
	}

	__class(LittleTeacherView,'com.subject.module.specialklview.LittleTeacherView',_super);
	var __proto=LittleTeacherView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		View.regComponent("ScaleButton",ScaleButton);
		_super.prototype.createChildren.call(this);
		this.createView(LittleTeacherView.uiView);
	}

	__proto.initialize=function(){}
	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		_super.prototype.initView.call(this,byReset);
		this._bg.skin=this.isHeightGrade();
		this._main.skin=this.config.param.mainskin || "share/ui/littleTeacher/img_video.png";
		this._main.width=1137;
		this._main.height=638;
		this._soundbtn.on("click",this,this.checkSound);
		this._title.text=this.config.param.datadesc || "";
		this._title.fontSize=this.config.param.datasize || 42;
		this._go.on("click",this,this.checkSecondaryPage);
		this._closebtn.on("click",this,this.checkSecondaryPage);
		this.isSound();
		this.titleImg.skin=VipThink.getLanguageImg(this.titleImg.skin);
		this.descImg.skin=VipThink.getLanguageImg(this.descImg.skin);
	}

	/**是否要小喇叭
	s6-8&v4课件不需要喇叭 **/
	__proto.isSound=function(){
		var courseId=VipThink.config.course;
		var cfg=this.config.subViews ? this.config.subViews[VipThink.viewMgr.currPageIdx] :this.config;
		if(courseId){
			if(((courseId.indexOf("s6_")!=-1 || courseId.indexOf("s7_")!=-1 || courseId.indexOf("s8_")!=-1)&& (courseId.indexOf("v4")!=-1))||cfg.param.no_horn){
				this._soundbtn.visible=false;
			}
		}
	}

	__proto.isHeightGrade=function(){
		var _str="share/ui/littleTeacher/bg_lt_low.jpg";
		var courseId=VipThink.config.course;
		if(courseId){
			if(courseId.indexOf("s4_")!=-1 || courseId.indexOf("s5_")!=-1 || courseId.indexOf("s6_")!=-1 || courseId.indexOf("s7_")!=-1|| courseId.indexOf("s8_")!=-1){
				_str="share/ui/littleTeacher/bg_lt_hight.jpg";
				}else{
				_str="share/ui/littleTeacher/bg_lt_low.jpg";
			}
		}
		return _str;
	}

	__proto.checkSecondaryPage=function(){
		this._secondaryPage.visible=!this._secondaryPage.visible;
	}

	__proto.checkSound=function(){
		this.stopAllSound();
		this.playSound(this.config.param.datasound);
	}

	LittleTeacherView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"mouseThrough":true,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"_bg","skin":"share/ui/littleTeacher/bg_lt_low.jpg","height":1080}},{"type":"Image","props":{"y":56,"x":787,"width":344,"skin":"share/ui/littleTeacher/title.png","height":83}},{"type":"Image","props":{"y":159,"x":174,"width":1571,"skin":"share/ui/littleTeacher/img_5.png","height":146,"sizeGrid":"23,21,21,24"}},{"type":"Image","props":{"y":339,"x":371,"width":1173,"skin":"share/ui/littleTeacher/video_bg.png","height":668,"sizeGrid":"30,25,30,36"}},{"type":"Image","props":{"y":673,"x":958,"width":1137,"var":"_main","height":638,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":235,"x":262,"width":105,"var":"_soundbtn","pivotY":53,"pivotX":52.5,"label":"","height":106},"child":[{"type":"Image","props":{"y":0,"x":0,"skin":"share/ui/littleTeacher/img_lb.png"}}]},{"type":"Label","props":{"y":235,"x":1022,"wordWrap":true,"width":1369,"var":"_title","valign":"middle","height":103,"fontSize":42,"color":"#487eb8","bold":true,"anchorY":0.5,"anchorX":0.5,"align":"left"}},{"type":"ScaleButton","props":{"y":93,"x":1705,"width":327,"var":"_go","pivotY":42.5,"pivotX":163.5,"label":"","height":85},"child":[{"type":"Image","props":{"y":43,"x":164,"width":327,"skin":"share/ui/littleTeacher/img_an.png","pivotY":42.5,"pivotX":163.5,"label":"","height":85,"sizeGrid":"0,41,0,77"}},{"type":"Image","props":{"y":27,"x":84,"skin":"share/ui/littleTeacher/img_4.png"}}]}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"_secondaryPage","mouseThrough":false,"mouseEnabled":true,"height":1080},"child":[{"type":"Image","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000"}}]},{"type":"Image","props":{"var":"titleImg","y":178,"x":386,"width":1146,"skin":"share/ui/littleTeacher/frameBg.png","height":731,"sizeGrid":"145,0,36,0"}},{"type":"Image","props":{"y":455,"x":1110,"skin":"share/ui/littleTeacher/qr.png"}},{"type":"Image","props":{"var":"descImg","y":380,"x":459,"skin":"share/ui/littleTeacher/desc.png"}},{"type":"ScaleButton","props":{"y":229,"x":1486,"width":72,"var":"_closebtn","pivotY":36,"pivotX":36,"label":"","height":72},"child":[{"type":"Image","props":{"skin":"share/ui/littleTeacher/img_gb.png"}}]}]}]};
	LittleTeacherView.__init$=function(){{
			SpecialKlViewFactory.regist("littleTeacher",LittleTeacherView);
		};
	}

	return LittleTeacherView;
})(KlView)


//class com.subject.module.specialklview.ParkResultView extends com.klzz.ui.KlView
var ParkResultView=(function(_super){
	function ParkResultView(cfg,name){
		this._font_all=null;
		this._font_right=null;
		this._font_wrong=null;
		this._data={};
		ParkResultView.__super.call(this,cfg,name);
	}

	__class(ParkResultView,'com.subject.module.specialklview.ParkResultView',_super);
	var __proto=ParkResultView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		_super.prototype.createChildren.call(this);
		this.createView(ParkResultView.uiView);
	}

	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		if(VipThink.user.userType==2){
			var obj=VipThink.user.getLessonData();
			if(obj && obj.parkResult){
				this.data=JSON.parse(obj.parkResult).parkResult;
			}
		}
		if((VipThink.user.userType==1 || VipThink.user.userType==3)&& VipThink.user.watchingUser){
			var d=VipThink.userStatus.getStudentByID(VipThink.user.watchingUser);
			if(d && d.parkResult)
				this.data=JSON.parse(d.parkResult).parkResult;
		}
	}

	__getset(0,__proto,'data',function(){
		return this._data;
		},function(obj){
		this.sync("data",this._data,obj);
		this._data=value;
		if(obj){
			var rightNum=0;
			for(var key in obj){
				var value=obj[key];
				if(value){
					rightNum++;
				}
			}
			this._font_all.value=this.subViewNum+"";
			this._font_right.value=rightNum+"";
			this._font_wrong.value=(this.subViewNum-rightNum)+"";
		}
	});

	/**
	*获取题数
	*@return int
	*/
	__getset(0,__proto,'subViewNum',function(){
		return VipThink.viewMgr.currPage.config.subViewNum-1;
	});

	ParkResultView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"share/bg_1.jpg","height":1080}},{"type":"Sprite","props":{"y":0,"x":2,"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"skin":"share/ui/park_result.png","scaleY":2,"scaleX":2,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":608,"x":977,"var":"_font_all","skin":"share/ui/park_num.png","sheet":"0123456789","name":"all","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":775,"x":889,"var":"_font_right","skin":"share/ui/park_num.png","sheet":"0123456789","name":"right","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":775,"x":1218,"var":"_font_wrong","skin":"share/ui/park_num.png","sheet":"0123456789","name":"wrong","anchorY":0.5,"anchorX":0.5}}]};
	ParkResultView.__init$=function(){{
			SpecialKlViewFactory.regist("parkResult",ParkResultView);
		};;
	}

	return ParkResultView;
})(KlView)


//class com.subject.module.specialklview.RecordLastLevelView extends com.klzz.ui.KlView
var RecordLastLevelView=(function(_super){
	function RecordLastLevelView(cfg,name){
		//public var _bt_playSound:ScaleButton;
		this.SOUND="share/sound/record_last_level.wav";
		RecordLastLevelView.__super.call(this,cfg,name);
	}

	__class(RecordLastLevelView,'com.subject.module.specialklview.RecordLastLevelView',_super);
	var __proto=RecordLastLevelView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		_super.prototype.createChildren.call(this);
		this.createView(RecordLastLevelView.uiView);
	}

	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		if(VipThink.user.userType==1)
			this.once("click",this,this.onClick);
	}

	__proto.onClick=function(){
		if(this.config.param && this.config.param.sound)
			this.SOUND=this.config.param.sound;
		this.SoundSprite.playSound(this.SOUND);
	}

	RecordLastLevelView.uiView={"type":"KlView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"share/record_last_bg.jpg","height":1080}}]};
	RecordLastLevelView.__init$=function(){{
			SpecialKlViewFactory.regist("recordLastView",RecordLastLevelView);
		};;
	}

	return RecordLastLevelView;
})(KlView)


//class com.subject.module.specialklview.rush.RushResultView extends com.klzz.ui.KlView
var RushResultView=(function(_super){
	function RushResultView(cfg,name){
		this.correctNum=null;
		this.wrongNum=null;
		this.beatPercent=null;
		this.costTime=null;
		this.correctPercent=null;
		this.answerBox=null;
		this.panelAni=null;
		this.guangAni=null;
		this.result=null;
		this.baifenhao=null;
		this.ballSkin=[
		"share/ui/rush_juxing1.png","share/ui/rush_juxing2.png","share/ui/rush_juxin5.png"];
		this.signSkin=[
		"share/ui/rush_zhengquefuhao3.png","share/ui/rush_zhengquefuhao2.png"];
		this.isFirst=true;
		this.oriBaifenhaoPos=null;
		this.oricorrectPercentPos=null;
		this.gradient=[0,23,28,41,56,65,74,87,96];
		this._data={};
		this.cp=[0,13,25,38,50,63,75,88,100]
		RushResultView.__super.call(this,cfg,name);
		VipThink.viewMgr.on("mainViewPrepared",this,this.onMainViewPrepared);
	}

	__class(RushResultView,'com.subject.module.specialklview.rush.RushResultView',_super);
	var __proto=RushResultView.prototype;
	__proto.createChildren=function(){
		View.regComponent("KlView",KlView);
		_super.prototype.createChildren.call(this);
		this.createView(RushResultView.uiView);
	}

	__proto.onMainViewPrepared=function(){
		if(this.isResultView()&& VipThink.user.isTech && !VipThink.cfgCourse.isReViewLesson){
			var gdata=GlobalModel.globalData;
			if(gdata.bChannel==VipThink.user.id){
				console.debug("RushResultView - onMainViewPrepared - 自动解锁");
				NativeAPI.instance.switchCtrlState();
			}
		}
	}

	__proto.isResultView=function(){
		var mvCfg=VipThink.viewMgr.mainView.pageCfgList;
		var curIdx=VipThink.viewMgr.currPageIdx;
		if(mvCfg[curIdx].type=="rushResult")
			return true;
		return false;
	}

	__proto.initView=function(byReset){
		var _$this=this;
		(byReset===void 0)&& (byReset=false);
		this.oriBaifenhaoPos=[this.baifenhao.x,this.baifenhao.y];
		this.oricorrectPercentPos=[this.correctPercent.x,this.correctPercent.y];
		this.setGradientAndCpAndUI();
		for (var i=0;i < this.answerBox.numChildren;i++){
			var kuang=this.answerBox.getChildAt(i);
			var signal=kuang.getChildAt(0);
			var fc=kuang.getChildAt(1);
			kuang.skin=this.ballSkin[2];
			signal.visible=false;
		}
		if(VipThink.cfgCourse.isReViewLesson){
			console.debug("RushResultView - initView - 是课堂回顾，用本地保存的数据来显示");
			var rv=VipThink.viewMgr.getView("rushView");
			if(rv && rv.localDataObj){
				this.setBall(rv.localDataObj.answer);
				this.setCorrectAndBeat(rv.localDataObj.answer);
				this.setCostTimeByRushView();
			}
		}
		else{
			console.debug("RushResultView - initView - 用socket的数据来显示");
			if(VipThink.user.userType==2){
				var obj=VipThink.user.getLessonData();
				if(obj && obj.parkResult){
					this.data=JSON.parse(obj.parkResult);
				}
			}
			this.frameOnce(5,this,function(){
				if((VipThink.user.userType==1 || VipThink.user.userType==3)&& VipThink.user.watchingUser){
					var d=VipThink.userStatus.getStudentByID(VipThink.user.watchingUser);
					if(d && d.parkResult)
						_$this.data=JSON.parse(d.parkResult);
				}
			})
		}
		if(this.isFirst){
			this.showAni();
			this.isFirst=false;
		}
		else{
			this.guangAni.visible=this.panelAni.visible=true;
			this.panelAni.play(this.panelAni.currAniName,false);
			this.panelAni.stopAtEnd();
			this.guangAni.play(this.guangAni.currAniName,true);
			this.result.visible=true;
		}
	}

	__proto.showAni=function(){
		var _$this=this;
		this.result.visible=false;
		this.panelAni.play(this.panelAni.currAniName,false);
		this.panelAni.once("end",this,function(){
			_$this.guangAni.visible=true;
			_$this.guangAni.play(_$this.guangAni.currAniName,true);
			_$this.result.visible=true;
		});
	}

	__proto.setGradientAndCpAndUI=function(){
		var mv=VipThink.viewMgr.mainView;
		var lastRushSubviewNum=0;
		if(mv){
			var configs=mv.pageCfgList;
			if(configs && configs[VipThink.viewMgr.currPageIdx-1])
				lastRushSubviewNum=configs[VipThink.viewMgr.currPageIdx-1].subViews.length;
		}
		if(lastRushSubviewNum==6){
			console.debug("RushResultView - setGradientAndCpAndUI - 闯关只有6关，用了另一组数据梯度显示击败率和正确率");
			this.gradient=[0,16,29,42,67,81,99];
			this.cp=[0,17,33,50,67,83,100];
			for (var i=6;i < this.answerBox.numChildren;i++){
				(this.answerBox.getChildAt(i)).visible=false;
			}
			this.answerBox.x=lastRushSubviewNum==6 ? 949 :879;
		}
	}

	__proto.setCorrectAndBeat=function(ans){
		if(!ans)return;
		var rightNum=0;
		var _wrongNum=0;
		for(var key in ans){
			var value=ans[key];
			if(value){
				rightNum++;
			}
			else if(value==false)
			_wrongNum++;
		}
		this.correctNum.value=rightNum+"";
		this.wrongNum.value=_wrongNum+"";
		this.beatPercent.value=this.gradient[rightNum];
		this.correctPercent.value=this.cp[rightNum]+"";
	}

	__proto.setCostTimeByRushView=function(){
		var fc_clock;
		VipThink.viewMgr.getView("rushView")&& (fc_clock=VipThink.viewMgr.getView("rushView").fc_clock);
		this.costTime.value=fc_clock ? "00:"+fc_clock.value :"00:00:00";
	}

	__proto.setBall=function(ans){
		if(!ans)return;
		for (var i=0;i < this.answerBox.numChildren;i++){
			var kuang=this.answerBox.getChildAt(i);
			var signal=kuang.getChildAt(0);
			var fc=kuang.getChildAt(1);
			kuang.skin=ans[i] ? this.ballSkin[0] :((ans[i]==false && ans[i] !=undefined)? this.ballSkin[1] :this.ballSkin[2]);
			signal.skin=ans[i] ? this.signSkin[0] :this.signSkin[1];
			signal.visible=true;
			if(ans[i]==undefined && ans[i] !=false)
				signal.visible=false;
		}
	}

	__proto.setCorrectPercentPos=function(){
		if(this.correctPercent.value.length==1){
			this.correctPercent.x=this.oricorrectPercentPos[0]-30;
			this.baifenhao.x=this.oriBaifenhaoPos[0]-30;
		}
		else if(this.correctPercent.value.length==2){
			this.correctPercent.x=this.oricorrectPercentPos[0]-10;
			this.baifenhao.x=this.oriBaifenhaoPos[0]-10;
		}
		else if(this.correctPercent.value.length==3){
			this.correctPercent.x=this.oricorrectPercentPos[0];
			this.baifenhao.x=this.oriBaifenhaoPos[0];
		}
	}

	__getset(0,__proto,'data',function(){
		return this._data;
		},function(obj){
		this.sync("data",this._data,obj);
		this._data=value;
		var ans=obj.answers;
		var rightNum=0;
		var _wrongNum=0;
		console.log(obj);
		if(ans){
			for(var key in ans){
				var value=ans[key];
				if(value){
					rightNum++;
				}
				else if(value==false)
				_wrongNum++;
			}
			this.setBall(ans);
		}
		this.correctNum.value=rightNum+"";
		this.wrongNum.value=_wrongNum+"";
		this.beatPercent.value=this.gradient[rightNum];
		this.correctPercent.value=this.cp[rightNum]+"";
		this.setCorrectPercentPos();
		if(VipThink.user.isStu){
			this.setCostTimeByRushView();
			obj.costTime=this.costTime.value;
			var jsonStr=JSON.stringify(obj);
			VipThink.userStatus.setUserProp(VipThink.user.id,"parkResult",jsonStr,'setParkResult');
		}
		else{
			this.costTime.value=obj.costTime;
		}
	});

	/**
	*获取题数
	*@return int
	*/
	__getset(0,__proto,'subViewNum',function(){
		return VipThink.viewMgr.currPage.config.subViewNum-1;
	});

	RushResultView.uiView={"type":"View","props":{"width":1920,"mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"share/bg_1.jpg","height":1080}},{"type":"SkeletonPlayer","props":{"y":1178,"x":-33,"visible":false,"var":"guangAni","url":"share/animation/guanglun.sk","stopAt":0,"scaleY":1.68,"scaleX":1.68,"isLoop":"false","currAniName":"guangmang"}},{"type":"SkeletonPlayer","props":{"y":1072,"x":-48,"var":"panelAni","url":"share/animation/mianban.sk","stopAt":0,"scaleY":1.68,"scaleX":1.68,"isLoop":"false","currAniName":"chuxian"}},{"type":"Box","props":{"y":0,"x":-110,"width":1296,"visible":false,"var":"result","mouseThrough":true,"height":843},"child":[{"type":"FontClip","props":{"y":591,"x":1003,"width":59,"visible":true,"var":"correctNum","skin":"share/ui/rush_shuzi1.png","sheet":"1234567890","height":61}},{"type":"FontClip","props":{"y":592,"x":1152,"width":59,"visible":true,"var":"wrongNum","skin":"share/ui/rush_shuzi1.png","sheet":"1234567890","height":61}},{"type":"FontClip","props":{"y":890,"x":1056,"width":72,"visible":true,"var":"beatPercent","skin":"share/ui/rush_num.png","sheet":"0123456789:","scaleY":0.8,"scaleX":0.8,"height":62,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":888,"x":837,"width":176,"skin":"share/ui/rush_wenzi3.png","height":47}},{"type":"FontClip","props":{"y":660,"x":1199,"width":72,"visible":true,"var":"costTime","spaceX":-5,"skin":"share/ui/rush_num.png","sheet":"0123456789:","scaleY":0.7,"scaleX":0.7,"height":62,"anchorX":0.5,"align":"center"}},{"type":"Image","props":{"y":657,"x":888,"width":198,"skin":"share/ui/rush_datishichang.png","height":43}},{"type":"Image","props":{"y":356,"x":981,"width":203,"skin":"share/ui/rush_dayuankuang.png","height":203}},{"type":"Image","props":{"y":415,"x":1031,"width":104,"skin":"share/ui/rush_wenzi1.png","height":34}},{"type":"FontClip","props":{"y":461,"x":1029,"width":90,"visible":true,"var":"correctPercent","skin":"share/ui/rush_num.png","sheet":"0123456789:","scaleY":0.9,"scaleX":0.9,"height":61,"align":"right"}},{"type":"Image","props":{"y":454,"x":1102,"width":68,"var":"baifenhao","skin":"share/ui/rush_baifenghaso.png","height":58}},{"type":"Image","props":{"y":880,"x":1084,"width":68,"skin":"share/ui/rush_baifenghaso.png","height":58}},{"type":"Image","props":{"y":595,"x":1038,"width":31,"skin":"share/ui/rush_wenzi4.png","height":29}},{"type":"Image","props":{"y":595,"x":1187,"width":31,"skin":"share/ui/rush_wenzi4.png","height":29}},{"type":"Image","props":{"y":586,"x":960,"width":46,"skin":"share/ui/rush_zhengquefuhao1.png","height":37}},{"type":"Image","props":{"y":591,"x":1120,"width":35,"skin":"share/ui/rush_zhengquefuhao4.png","height":37}},{"type":"Image","props":{"y":887,"x":1152,"width":174,"skin":"share/ui/rush_wenzi2.png","height":47}},{"type":"Box","props":{"y":785,"x":879,"var":"answerBox"},"child":[{"type":"Image","props":{"y":-62,"x":-101,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"01","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":-21,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"02","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":59,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"03","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":139,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"04","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":219,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"05","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":299,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"06","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":378,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"07","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]},{"type":"Image","props":{"y":-62,"x":458,"width":77,"skin":"share/ui/rush_juxing1.png","height":78},"child":[{"type":"Image","props":{"y":57,"x":60,"skin":"share/ui/rush_zhengquefuhao2.png","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":19,"x":12,"value":"08","spaceX":-9,"skin":"share/ui/rush_shuzi2.png","sheet":"1234567890"}}]}]}]}]};
	RushResultView.__init$=function(){{
			SpecialKlViewFactory.regist(SpecialKlViewNames.VTYPE_RUSH_RESULT,RushResultView);
		};;;
	}

	return RushResultView;
})(KlView)


//class com.subject.module.lessonrest.LessonRestViewUI extends com.biz.ui.LocViewBase
var LessonRestViewUI=(function(_super){
	function LessonRestViewUI(){
		this.imgBg=null;
		this.imgBar=null;
		this.imgMask=null;
		this.imgDian=null;
		this.labTime=null;
		LessonRestViewUI.__super.call(this);
	}

	__class(LessonRestViewUI,'com.subject.module.lessonrest.LessonRestViewUI',_super);
	var __proto=LessonRestViewUI.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(LessonRestViewUI.uiView);
	}

	LessonRestViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"width":2000,"var":"imgBg","skin":"share/lessonRest_bg.jpg","height":1100,"centerY":0,"centerX":0}},{"type":"Image","props":{"y":730,"skin":"share/ui/lessonBarBg.png","centerX":0},"child":[{"type":"Image","props":{"y":3,"x":3,"width":490,"var":"imgBar","skin":"share/ui/lessonBar.png","sizeGrid":"0,34,0,31","height":73},"child":[{"type":"Image","props":{"y":5,"x":15,"skin":"share/ui/lessonBarHua.png","height":60}},{"type":"Image","props":{"y":7,"x":320,"skin":"share/ui/lessonBarHua.png","height":60}},{"type":"Image","props":{"y":15,"x":18,"skin":"share/ui/lessonDian1.png"}},{"type":"Image","props":{"width":490,"var":"imgMask","skin":"share/ui/lessonBar.png","sizeGrid":"0,34,0,31","renderType":"mask","height":73}}]},{"type":"Image","props":{"y":52,"x":400,"width":10,"var":"imgDian","skin":"share/ui/lessonDian2.png","height":9}}]},{"type":"Label","props":{"y":675,"var":"labTime","text":"28s","fontSize":36,"color":"#5FA56F","centerX":0}}]};
	return LessonRestViewUI;
})(LocViewBase)


//class com.subject.module.photowall.PhotoWallViewUI extends com.biz.ui.LocViewBase
var PhotoWallViewUI=(function(_super){
	function PhotoWallViewUI(){
		this.boxBg=null;
		this.boxUnload=null;
		this.txtTips=null;
		this.boxContainer=null;
		this.imgPhoto=null;
		this.boxBrush=null;
		this.touchContainer=null;
		this.vScrollBar=null;
		this.imgTools=null;
		this.imgScaleBig=null;
		this.imgScaleSmall=null;
		this.imgRotate=null;
		this.boxWait=null;
		this.boxComplete=null;
		this.boxClock=null;
		this.sk=null;
		PhotoWallViewUI.__super.call(this);
	}

	__class(PhotoWallViewUI,'com.subject.module.photowall.PhotoWallViewUI',_super);
	var __proto=PhotoWallViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(PhotoWallViewUI.uiView);
	}

	PhotoWallViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"var":"boxBg","top":0,"right":0,"name":"boxBg","left":0,"bottom":0},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"var":"boxUnload","top":0,"right":0,"name":"boxUnload","left":0,"bottom":0},"child":[{"type":"Image","props":{"skin":"share/ui/photowall/img_unLoad.png","centerY":-120,"centerX":0}},{"type":"Label","props":{"y":582,"x":870,"var":"txtTips","text":"该学生未提交","fontSize":32,"color":"#999999","bold":true}}]},{"type":"Box","props":{"y":540,"x":960,"width":1920,"var":"boxContainer","name":"boxContainer","height":1080,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Image","props":{"y":540,"x":960,"var":"imgPhoto","name":"imgPhoto","centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5}},{"type":"Sprite","props":{"y":0,"x":0,"width":1920,"var":"boxBrush","name":"boxBrush","height":1080}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"touchContainer","name":"touchContainer","height":1080},"child":[{"type":"VScrollBar","props":{"y":0,"var":"vScrollBar","skin":"share/ui/photowall/vscroll.png","right":0,"name":"vScrollBar","mouseWheelEnable":false,"height":1080}}]},{"type":"Image","props":{"y":990,"x":825,"width":270,"var":"imgTools","skin":"share/ui/photowall/img_bg.png","sizeGrid":"0,33,0,33","name":"imgTools","height":60,"centerX":0,"bottom":30},"child":[{"type":"Image","props":{"x":10,"var":"imgScaleBig","skin":"share/ui/photowall/img_scaleBig.png","name":"imgScaleBig","centerY":0}},{"type":"Image","props":{"x":100,"var":"imgScaleSmall","skin":"share/ui/photowall/img_scaleSmall.png","name":"imgScaleSmall"}},{"type":"Image","props":{"x":190,"var":"imgRotate","skin":"share/ui/photowall/img_rotate.png","name":"imgRotate","centerY":0}}]},{"type":"Box","props":{"y":0,"var":"boxWait","name":"boxWait","centerX":0},"child":[{"type":"Image","props":{"y":0,"x":0,"skin":"share/ui/photowall/img_yellowBg.png"}},{"type":"Image","props":{"y":33,"x":24,"skin":"share/ui/photowall/img_wait.png"}},{"type":"Label","props":{"y":34,"x":89,"text":"等待批改","fontSize":59,"color":"#ffffff","bold":true}}]},{"type":"Box","props":{"y":0,"var":"boxComplete","name":"boxComplete","centerX":0},"child":[{"type":"Image","props":{"y":0,"x":0,"skin":"share/ui/photowall/img_greenBg.png"}},{"type":"Image","props":{"y":33,"x":24,"skin":"share/ui/photowall/img_complete.png"}},{"type":"Label","props":{"y":34,"x":89,"text":"批改完成","fontSize":59,"color":"#ffffff","bold":true}}]},{"type":"Box","props":{"y":0,"var":"boxClock","name":"boxClock","centerX":0},"child":[{"type":"Image","props":{"y":0,"x":0,"skin":"share/ui/photowall/img_yellowBg.png"}},{"type":"Image","props":{"y":33,"x":24,"skin":"share/ui/photowall/img_clock.png"}},{"type":"Label","props":{"y":34,"x":89,"text":"等待讲解","fontSize":59,"color":"#ffffff","bold":true}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"var":"sk","url":"share/animation/photowall/wd.sk","stopAt":0,"preview":false,"name":"sk","isLoop":"false","currAniName":"ok"}}]};
	return PhotoWallViewUI;
})(LocViewBase)


//class com.subject.module.redpacketrain.RedPacketRainView extends com.biz.ui.LocViewBase
var RedPacketRainView=(function(_super){
	function RedPacketRainView(){
		this.timeNumImg=null;
		this.timeNum=0;
		this.animTemplet=null;
		this.skUrl="share/animation/lihua.sk";
		this.imgBgUrl="share/bigImage/redPacketRainBg.jpg";
		this.sk=null;
		this.timeLab=null;
		/*当前红包个数 */
		this.curPacketNum=0;
		/*开始时间 */
		this.starTs=0;
		/*30个红包数据 */
		this.redPackTypes=[];
		RedPacketRainView.__super.call(this);
	}

	__class(RedPacketRainView,'com.subject.module.redpacketrain.RedPacketRainView',_super);
	var __proto=RedPacketRainView.prototype;
	__proto.initView=function(){
		this.size(Klzz.designWidth,Klzz.designHeight);
		var box=new Box();
		box.size(Klzz.designWidth,Klzz.designHeight);
		box.graphics.drawRect(0,0,box.width,box.height,"#000000");
		box.alpha=0.5;
		this.addChild(box);
		this.setMouse(true);
		this.mouseEnabled=true;
		this.mouseThrough=false;
		this.initUI();
		this.timer.loop(1000,this,this.onSecTimer);
		VipThink.debugLog("RedPacketRainView","init","打开红包界面！");
		VipThink.currView && (VipThink.currView).sleep();
		if(VipThink.user.isStu){
			ServiceCenter.redPacketService.sendMsgViewStatus("open");
		}
	}

	__proto.handlerSync=function(args){
		if(VipThink.user.isTech){
			if(args.act=="addScore"){
				var sid=args.sid;
				var num=args.num;
				ServiceCenter.redPacketService.sendMsgAddStar(sid,num);
			}
		}
	}

	__proto.initUI=function(){
		var bgImg=new Image(this.imgBgUrl);
		this.addChild(bgImg);
		var imgDi=new Image(VipThink.getLanguageImg("share/ui/redPacketRain/img_di.png"));
		imgDi.centerX=0;
		imgDi.y=0;
		this.addChild(imgDi);
		imgDi.zOrder=999;
		var lab=new Label();
		lab.fontSize=36;
		lab.autoSize=true;
		lab.color="#ffffff";
		lab.centerX=0;
		lab.top=25;
		lab.zOrder=1000;
		lab.bold=true;
		this.addChild(lab);
		this.timeLab=lab;
		this.setLabNum(10);
		if(!this.timeNumImg){
			this.timeNumImg=new Image("share/ui/redPacketRain/img_time1.png");
			this.autoSize=true;
			this.timeNumImg.width=320;
			this.timeNumImg.height=380;
			this.timeNumImg.centerX=0;
			this.timeNumImg.centerY=0;
			this.timeNumImg.pivotX=160;
			this.timeNumImg.pivotY=190;
			this.timeNumImg.visible=false;
			this.timeNum=0;
			this.addChild(this.timeNumImg);
		}
	}

	__proto.startPlayRain=function(){
		this.starTs=VipThink.getTime();
		this.timer.loop(200,this,this.onMsTimer);
		this.generPackTypes();
		KlSoundManager.playMusicUnSync("share/sound/redPacketRain/bg.mp3");
	}

	__proto.finishPlayRain=function(){
		Star.recoverAll();
		RedPack.recoverAll();
		KlSoundManager.stopMusic(true);
		this.setLabNum(0);
		this.timer.clear(this,this.onSecTimer);
		this.timer.clear(this,this.onMsTimer);
		this.timeNum=0;
		this.tryShowAnimation();
	}

	__proto.clear=function(){
		if(VipThink.user.isStu){
			ServiceCenter.redPacketService.sendMsgViewStatus("close");
		}
		this.setMouse(false);
		_super.prototype.clear.call(this);
		Star.recoverAll();
		RedPack.recoverAll();
		KlSoundManager.stopMusic(true);
		VipThink.currView && (VipThink.currView).awake();
		this.timer.clear(this,this.onSecTimer);
		this.timer.clear(this,this.onMsTimer);
		this.timeNum=0;
	}

	__proto.setMouse=function(v){
		var box=VipThink.viewMgr.getCursorBox();
		if(box){
			box.sysMouseVisible=v;
			box.trackMouse=!v;
		}
	}

	/**显示动画 */
	__proto.tryShowAnimation=function(){
		if(!this.animTemplet){
			this.animTemplet=new Templet();
			this.animTemplet.once("complete",this,this.onAniLoadComplete);
			this.animTemplet.loadAni(this.skUrl);
			}else{
			this.showAnimation();
		}
	}

	__proto.onAniLoadComplete=function(){
		this.showAnimation();
	}

	__proto.showAnimation=function(){
		if(!this.sk){
			this.sk=new Skeleton(this.animTemplet,Klzz.aniMode);
			this.addChild(this.sk);
			this.sk.x=1920 / 2;
			this.sk.y=1080 / 2;
		};
		var key=VipThink.getLanguageStr("good");
		var path=VipThink.getLanguageSound("share/sound/redPacketRain/nizhengbang.wav");
		KlSoundManager.playSoundUnSync(path);
		this.sk.once("stopped",this,this.onSkComplete);
		this.sk.play(key,false);
	}

	__proto.onSkComplete=function(){
		if(this.sk){
			this.sk.removeSelf();
			this.sk=null;
		}
		if(this.animTemplet){
			this.animTemplet.destroy();
			this.animTemplet=null;
		}
		VipThink.debugLog("RedPacketRainView","init","关闭红包界面!!!");
		this.reportData();
		RedPacketRainView.clickNum=0;
		ViewUtil.removeView(this);
	}

	/*************************************Timer Handler**********************************/
	__proto.onSecTimer=function(){
		this.timeNum++;
		if(this.timeNum < 4){
			if(this.timeNum==1){
				var path=VipThink.getLanguageSound("share/sound/redPacketRain/start321.wav");
				KlSoundManager.playSoundUnSync(path);
			}
			this.timeNumImg.skin="share/ui/redPacketRain/img_time"+(4-this.timeNum)+".png";
			Tween.clearAll(this.timeNumImg);
			this.timeNumImg.alpha=0.5;
			this.timeNumImg.scaleY=this.timeNumImg.scaleX=0.3;
			Tween.to(this.timeNumImg,{scaleY:1,scaleX:1,alpha:1},300,Ease.circIn);
			this.timeNumImg.visible=true;
			}else{
			this.timeNumImg.visible=false;
			if(!this.starTs){
				this.startPlayRain();
			}
			this.setLabNum(14-this.timeNum);
		}
		if(this.timeNum > 13 && this.curPacketNum==30){
			this.finishPlayRain();
		}
	}

	__proto.onMsTimer=function(){
		if(Math.random()> 0.1){
			var star=Star.create();
			this.addChild(star);
		};
		var curTs=VipThink.getTime();
		var num=((curTs-this.starTs)/ RedPacketRainView.INTERVAL)>> 0;
		if(num > this.curPacketNum && this.curPacketNum < 30){
			var index=(this.redPackTypes.length*Math.random())>>0;
			var retList=this.redPackTypes.splice(index,1);
			var redPack=RedPack.create(retList[0]);
			this.addChild(redPack);
			this.curPacketNum++;
		}
	}

	/*************************上报数据****************************/
	__proto.reportData=function(){
		var data={};
		data.eventName="stuTapLuckyRain";
		var param={};
		param.zbjRoomId=this.getNumberFromString(GlobalModel.user.currentRoomId);
		param.userId=GlobalModel.user.id;
		param.tapNumber=RedPacketRainView.clickNum;
		data.param=param;
		Reporter.reportData(3,data,null,{msg:"RedPacketRain.stuTapLuckyRain" });
	}

	// console.debug("RedPacketRain--------stuTapLuckyRain----------"+JSON.stringify(data));
	__proto.getNumberFromString=function(str){
		var str1="";
		for (var i=0;i < str.length;i++){
			if (str[i] >="0" && str[i] <="9"){
				str1+=str[i];
			}
		}
		return parseInt(str1);
	}

	/**
	*@Author:Snow
	*@description:设置文本名字
	*@param {*}
	*@return {*}
	*/
	__proto.setLabNum=function(num){
		this.timeLab.text=VipThink.getLanguageText(5,[num]);
	}

	/**
	*@Author:Snow
	*@description:生成红包类型
	*@param {*}
	*@return {*}
	*/
	__proto.generPackTypes=function(){
		var totalScore=0;
		totalScore=(VipThink.user).totalScore || 0;
		var lastStar=50-totalScore;
		var starNum=0;
		if(lastStar > 10){
			starNum=7+(4 *Math.random())>> 0;
			}else if(lastStar >=5){
			starNum=(lastStar-4)+(4 *Math.random())>> 0;
			}else{
			starNum=lastStar-1;
		}
		for(var index=0;index < starNum;index++){
			this.redPackTypes.push(3);
		};
		var heartNum=((30-starNum)*Math.random())>> 0;
		var muzhiNum=30-starNum-heartNum;
		for(var i=0;i < heartNum;i++){
			this.redPackTypes.push(2);
		}
		for(var j=0;j < muzhiNum;j++){
			this.redPackTypes.push(1);
		}
	}

	RedPacketRainView.TOTAL=30;
	RedPacketRainView.TIME_TOTAL=10 *1000;
	RedPacketRainView.clickNum=0;
	__static(RedPacketRainView,
	['INTERVAL',function(){return this.INTERVAL=((RedPacketRainView.TIME_TOTAL-2 *1000)/ 30)>> 0;}
	]);
	return RedPacketRainView;
})(LocViewBase)


//class com.subject.module.treasurebox.TreasureBoxViewUI extends com.biz.ui.LocViewBase
var TreasureBoxViewUI=(function(_super){
	function TreasureBoxViewUI(){
		this.boxBg=null;
		this.bg=null;
		this.boxAni=null;
		this.aniBox0=null;
		this.aniBox1=null;
		this.aniBox2=null;
		this.aniBtn0=null;
		this.aniBtn1=null;
		this.aniBtn2=null;
		this.btn0=null;
		this.btn1=null;
		this.btn2=null;
		TreasureBoxViewUI.__super.call(this);
	}

	__class(TreasureBoxViewUI,'com.subject.module.treasurebox.TreasureBoxViewUI',_super);
	var __proto=TreasureBoxViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(TreasureBoxViewUI.uiView);
	}

	TreasureBoxViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"var":"boxBg","top":0,"right":0,"left":0,"bottom":0},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}},{"type":"Image","props":{"var":"bg","skin":"share/bigImage/bg_treasure.jpg"}}]},{"type":"Box","props":{"y":540,"x":960,"width":1920,"var":"boxAni","height":1080,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"SkeletonPlayer","props":{"y":680,"x":439,"var":"aniBox0","url":"share/animation/treasureBox/treasurebox.sk","stopAt":0,"skeSkin":"12","preview":false,"isLoop":"false","currAniName":"open"}},{"type":"SkeletonPlayer","props":{"y":680,"x":977,"var":"aniBox1","url":"share/animation/treasureBox/treasurebox.sk","stopAt":0,"skeSkin":"13","preview":false,"isLoop":"false","currAniName":"open"}},{"type":"SkeletonPlayer","props":{"y":680,"x":1508,"var":"aniBox2","url":"share/animation/treasureBox/treasurebox.sk","stopAt":0,"skeSkin":"14","preview":false,"isLoop":"false","currAniName":"open"}},{"type":"SkeletonPlayer","props":{"y":840,"x":429,"var":"aniBtn0","url":"share/animation/treasureBox/treasurebox.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"anniu"}},{"type":"SkeletonPlayer","props":{"y":840,"x":969,"var":"aniBtn1","url":"share/animation/treasureBox/treasurebox.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"anniu"}},{"type":"SkeletonPlayer","props":{"y":840,"x":1500,"var":"aniBtn2","url":"share/animation/treasureBox/treasurebox.sk","stopAt":1,"preview":false,"isLoop":true,"currAniName":"anniu"}}]},{"type":"Box","props":{"y":781,"x":292,"width":273,"var":"btn0","height":112}},{"type":"Box","props":{"y":779,"x":833,"width":273,"var":"btn1","height":112}},{"type":"Box","props":{"y":782,"x":1365,"width":273,"var":"btn2","height":112}}]};
	return TreasureBoxViewUI;
})(LocViewBase)


//class com.subject.module.functionshell.AfterClassPracticeView extends com.subject.module.functionshell.BaseEvaluationView
var AfterClassPracticeView=(function(_super){
	function AfterClassPracticeView(){
		this._box_done_ledi=null;
		this._box_done_wandou=null;
		this._lab_title_done_wandou=null;
		this.PARK_ADVENTURE_QUEST_STARTED="park_adventureQuestStarted";
		this.PARK_ADVENTURE_QUEST_SUB="park_adventureQuestSub";
		this.eventMap={"park_adventureQuestStarted":"游乐园_同步练习_开始答题",
			"park_adventureQuestSub":"游乐园_同步练习_题目对错",
			"park_dailychlngQuestStarted":"游乐园_每日一练_开始答题",
			"park_dailychlngQuestSub":"游乐园_每日一练_题目对错"};
		// 每日一练
		this.PARK_DAILYCHLNG_QUEST_STARTED="park_dailychlngQuestStarted";
		this.PARK_DAILYCHLNG_QUEST_SUB="park_dailychlngQuestSub";
		this.eventName=null;
		this._imgKuangInitData=null;
		AfterClassPracticeView.__super.call(this);
	}

	__class(AfterClassPracticeView,'com.subject.module.functionshell.AfterClassPracticeView',_super);
	var __proto=AfterClassPracticeView.prototype;
	__proto.onLevelChanged=function(){
		if (VipThink.config.courseType==16){
			this.submitDailychlngBuryPoint(this.PARK_DAILYCHLNG_QUEST_STARTED);
			}else {
			this.submitBuryPoint(this.PARK_ADVENTURE_QUEST_STARTED);
		}
	}

	// 提交埋点到神策
	__proto.submitBuryPoint=function(event){
		if (!VipThink.courseID)
			return;
		if (event==this.eventName){
			return;
		}
		this.eventName=event;
		var courseInfo=VipThink.courseID.split('_');
		var grade=courseInfo[0].toUpperCase();
		var topic=courseInfo[3].split('-')[0];
		var stage=courseInfo[3].split('-')[1];
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0)
			truePageIdx=EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx];
		var data={eventName:event,
			param:{
				grade:grade,
				topic:topic,
				stage:stage,
				questId:(truePageIdx+1)+""
		}};
		if (event==this.PARK_ADVENTURE_QUEST_SUB && VipThink.currView)
			data.param.questAn=VipThink.currView.result;
		Reporter.reportData(3,data,null,{msg:"AfterClassPracticeView.submitBuryPoint 提交埋点数据：" });
	}

	// 提交每日一练埋点到神策
	__proto.submitDailychlngBuryPoint=function(event){
		if (!VipThink.courseID){
			return;
		}
		if (event==this.eventName){
			return;
		}
		this.eventName=event;
		var evaData=VipThink.config.evaData;
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0)
			truePageIdx=EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx];
		var data={
			eventName:event,
			param:{
				grade:evaData.grade,
				difficulty:evaData.difficulty,
				stage:evaData.stage,
				questId:(truePageIdx+1)+""
			}
		};
		if (event==this.PARK_DAILYCHLNG_QUEST_SUB){
			if (VipThink.currView && VipThink.currView.result !=null){
				data.param.questAn=VipThink.currView.result;
			}
		}
		Reporter.reportData(3,data,null,{msg:"AfterClassPracticeView.submitDailychlngBuryPoint 提交每日一练埋点数据：" });
	}

	// console.debug("AfterClassPracticeView-------submitDailychlngBuryPoint------提交每日一练埋点数据："+JSON.stringify(data));
	__proto.createChildren=function(){
		this.name="afterClassPractice";
		this.TAG="AfterClassPractice";
		this.AUTO_PLAY_SOUND=true;
		BaseEvaluationView.uiView_new=com.subject.module.functionshell.AfterClassPracticeView.uiView_new;
		BaseEvaluationView.uiView_new_en=com.subject.module.functionshell.AfterClassPracticeView.uiView_new_en;
		_super.prototype.createChildren.call(this);
		VipThink.viewMgr.on("changed",this,this.onLevelChanged);
		this.onLevelChanged();
	}

	/**
	*设置反馈样式
	*分为幼儿组（乐迪）和小学组（豌豆精灵）
	*@modify 李雪峰
	*
	*/
	__proto.finish=function(){
		var nStage=0;
		nStage=VipThink.courseID ? parseInt(VipThink.courseID.slice(1,2)):0;
		switch(nStage){
			case 1:
			case 2:
			case 3:
				this._box_done_ledi.visible=true;
				this._box_done_wandou.visible=false;
				this._lab_title_done.text=this.donePageTitle;
				break ;
			case 4:
			case 5:
			case 6:
			case 7:
				this._box_done_ledi.visible=false;
				this._box_done_wandou.visible=true;
				this._lab_title_done_wandou.text=this.donePageTitle;
				break ;
			default :
				this._box_done_ledi.visible=false;
				this._box_done_wandou.visible=true;
				this._lab_title_done_wandou.text=this.donePageTitle;
				break ;
			}
		_super.prototype.finish.call(this);
	}

	__proto.setLabel=function(){
		_super.prototype.setLabel.call(this);
		if(!this._imgKuangInitData){
			this._imgKuangInitData={};
			this._imgKuangInitData.skin=this._img_kuang.skin;
			this._imgKuangInitData.sizeGrid=this._img_kuang.sizeGrid;
			this._imgKuangInitData.x=this._img_kuang.x;
			this._imgKuangInitData.y=this._img_kuang.y;
			this._imgKuangInitData.visible=this._img_kuang.visible;
		}
		this._img_kuang.alpha=0.7;
		this._lab_desc.stroke=6;
		this._lab_subject.stroke=6;
		var page=VipThink.currView;
		var customDescFrame=page.descFrame;
		if(customDescFrame)
			this.applyCompData(this._img_kuang,customDescFrame);
		else
		this.applyCompData(this._img_kuang,this._imgKuangInitData);
	}

	__proto.cutScreen=function(rightNow,data){
		(rightNow===void 0)&& (rightNow=false);
		if (VipThink.config.courseType==16){
			this.submitDailychlngBuryPoint(this.PARK_DAILYCHLNG_QUEST_SUB);
			}else {
			this.submitBuryPoint(this.PARK_ADVENTURE_QUEST_SUB);
		}
		_super.prototype.cutScreen.call(this,rightNow);
	}

	__proto.applyCompData=function(comp,data){
		for(var key in data){
			comp[key]=data[key];
		}
	}

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:truePageIdx+1,
			timeLong:this._costTime,
			answer:v.result==null ? false :v.result
		};
	});

	/**
	*获取结束也大标题文字
	*/
	__getset(0,__proto,'donePageTitle',function(){
		return "              太棒啦！\n    祝贺你顺利完成关卡。";
	});

	__getset(0,__proto,'timeGradient',function(){
		return [180];
	});

	/**
	*获取结束音效
	*分为幼儿组（乐迪）和小学组（豌豆精灵）
	*@modify xuefeng li
	*
	*/
	__getset(0,__proto,'completeSound',function(){
		var snd_url=null;
		var nStage=0;
		nStage=VipThink.courseID ? parseInt(VipThink.courseID.slice(1,2)):0;
		switch(nStage){
			case 1:
			case 2:
			case 3:
				snd_url=this.SOUND_COMPLETE_FORTONGBU_ledi;
				break ;
			case 4:
			case 5:
			case 6:
			case 7:
				snd_url=this.SOUND_COMPLETE_FORTONGBU;
				break ;
			default :
				snd_url=this.SOUND_COMPLETE_FORTONGBU;
				break ;
			}
		return snd_url;
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IAfterClassPractice')
	});

	/**
	*获取结束页描述文字
	*/
	__getset(0,__proto,'donePageDesc',function(){
		return "";
	});

	AfterClassPracticeView.uiView_new={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":93,"x":115,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound_new.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1560,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1784,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":93,"x":818,"width":1213,"var":"_img_kuang","skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"imgKuang","mouseThrough":true,"height":179,"anchorY":0.5,"anchorX":0.5,"alpha":0.5}},{"type":"Label","props":{"y":27,"x":325,"width":94,"var":"_lab_subject","valign":"middle","text":"Q1：","strokeColor":"#ffffff","stroke":5,"name":"_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorX":1,"align":"right"}},{"type":"Label","props":{"y":95,"x":335,"wordWrap":true,"width":1061,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorY":0.5,"align":"left"}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":789,"skin":"share/ui/img_p9g_kuang.png","sizeGrid":"100,100,100,100","height":472,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Image","props":{"y":136,"skin":"share/ui/img_title.png","centerX":0}}]},{"type":"ScaleButton","props":{"y":660,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/img_no_skip.png","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"centerX":-156,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":663,"var":"_bt_jump","stateNum":1,"skin":"share/ui/img_skip.png","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"centerX":149,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":454,"x":447,"skin":"share/ui/img_jese.png"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"width":1920,"visible":true,"var":"_box_done_ledi","name":"_box_done_ledi","height":1080},"child":[{"type":"Image","props":{"y":199,"x":597,"width":727,"skin":"share/ui/evaluation_done.png","height":682,"centerY":0,"centerX":0}},{"type":"Label","props":{"y":364,"x":640,"width":673,"var":"_lab_title_done","text":"祝贺你顺利完成本次测评。","height":52,"fontSize":55,"font":"Arial","color":"#51cfca","bold":true}},{"type":"Label","props":{"y":459,"x":651,"width":619,"var":"_lab_desc_done","text":"跟我一起去查看你的专属测评报告吧！","height":67,"fontSize":30,"color":"#718483","centerX":0,"align":"center"}}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"_box_done_wandou","name":"_box_done_wandou","height":1080},"child":[{"type":"Image","props":{"y":411,"x":686,"width":645,"skin":"share/ui/img_p9g_kuang.png","height":246,"sizeGrid":"115,115,115,115"}},{"type":"Image","props":{"y":353,"x":600,"skin":"share/ui/img_wd_sprite_smile.png"}},{"type":"Label","props":{"y":483,"x":779,"width":458,"var":"_lab_title_done_wandou","text":"              太棒啦！\\n    祝贺你顺利完成关卡。","height":52,"fontSize":38,"font":"Arial","color":"#51cfca","bold":true}}]}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"name":"yanhua","isLoop":"false","currAniName":"yanhua"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"}}]}]};
	AfterClassPracticeView.uiView_new_en={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"_box_up","name":"boxUp","mouseThrough":true,"height":126},"child":[{"type":"ScaleButton","props":{"y":93,"x":115,"var":"_bt_sound","stateNum":1,"skin":"share/ui/bt_sound_new.png","sizeGrid":"15,17,16,19","showInStu":true,"scaleY":1,"scaleX":1,"name":"sound","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1560,"var":"_bt_redo","stateNum":1,"skin":"share/ui/bt_xiugai_new_en.png","sizeGrid":"15,17,16,19","showInStu":true,"name":"redo","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":88,"x":1784,"var":"_bt_ok","stateNum":1,"skin":"share/ui/bt_wancheng_new_en.png","sizeGrid":"18,21,20,21","showInStu":true,"name":"ok","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":93,"x":818,"width":1213,"var":"_img_kuang","skin":"share/ui/bt_white_new.png","sizeGrid":"54,66,55,74","name":"imgKuang","mouseThrough":true,"height":179,"anchorY":0.5,"anchorX":0.5,"alpha":0.5}},{"type":"Label","props":{"y":27,"x":325,"width":94,"var":"_lab_subject","valign":"middle","text":"Q1：","strokeColor":"#ffffff","stroke":5,"name":"_lab_subject","mouseThrough":true,"leading":15,"height":50,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorX":1,"align":"right"}},{"type":"Label","props":{"y":95,"x":335,"wordWrap":true,"width":1061,"var":"_lab_desc","valign":"middle","strokeColor":"#ffffff","stroke":5,"name":"_lab_desc","mouseThrough":true,"leading":15,"fontSize":36,"font":"Microsoft YaHei","color":"#474545","bold":false,"anchorY":0.5,"align":"left"}}]},{"type":"Label","props":{"y":1033,"x":1725,"width":315,"var":"_label_yinying","text":"题目进度：1/8","strokeColor":"#ffffff","pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.4,"align":"center"}},{"type":"Label","props":{"y":1029,"x":1705,"width":345,"var":"_lable","text":"题目进度：1/8","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"name":"lable","height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Label","props":{"y":1040,"x":1871,"width":345,"visible":false,"var":"_label_point","text":".","strokeColor":"#ffffff","stroke":2,"pivotY":23,"pivotX":155,"height":40,"fontSize":40,"font":"Microsoft YaHei","color":"#474545","alpha":0.85,"align":"center"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_notice","name":"_box_notice","mouseThrough":false,"height":1080},"child":[{"type":"Image","props":{"width":789,"skin":"share/ui/img_p9g_kuang.png","sizeGrid":"100,100,100,100","height":472,"centerY":0,"centerX":0,"anchorY":0.5,"anchorX":0.5},"child":[{"type":"Image","props":{"y":136,"skin":"share/ui/img_title.png","centerX":0}}]},{"type":"ScaleButton","props":{"y":660,"var":"_bt_notjump","stateNum":1,"skin":"share/ui/img_no_skip.png","showInStu":true,"name":"notJump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"centerX":-156,"anchorY":0.5,"anchorX":0.5}},{"type":"ScaleButton","props":{"y":663,"var":"_bt_jump","stateNum":1,"skin":"share/ui/img_skip.png","showInStu":true,"name":"jump","labelStrokeColor":"#ffffff","labelSize":40,"labelColors":"#ffffff","labelBold":true,"centerX":149,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":454,"x":447,"skin":"share/ui/img_jese.png"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"_box_done","name":"_box_done","height":1080},"child":[{"type":"Sprite","props":{"width":1920,"height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"y":0,"x":0,"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Box","props":{"width":1920,"visible":true,"var":"_box_done_ledi","name":"_box_done_ledi","height":1080},"child":[{"type":"Image","props":{"y":199,"x":597,"width":727,"skin":"share/ui/evaluation_done.png","height":682,"centerY":0,"centerX":0}},{"type":"Label","props":{"y":364,"x":640,"width":673,"var":"_lab_title_done","text":"祝贺你顺利完成本次测评。","height":52,"fontSize":55,"font":"Arial","color":"#51cfca","bold":true}},{"type":"Label","props":{"y":459,"x":651,"width":619,"var":"_lab_desc_done","text":"跟我一起去查看你的专属测评报告吧！","height":67,"fontSize":30,"color":"#718483","centerX":0,"align":"center"}}]},{"type":"Box","props":{"width":1920,"visible":false,"var":"_box_done_wandou","name":"_box_done_wandou","height":1080},"child":[{"type":"Image","props":{"y":411,"x":686,"width":645,"skin":"share/ui/img_p9g_kuang.png","height":246,"sizeGrid":"115,115,115,115"}},{"type":"Image","props":{"y":353,"x":600,"skin":"share/ui/img_wd_sprite_smile.png"}},{"type":"Label","props":{"y":483,"x":779,"width":458,"var":"_lab_title_done_wandou","text":"              太棒啦！\\n    祝贺你顺利完成关卡。","height":52,"fontSize":38,"font":"Arial","color":"#51cfca","bold":true}}]}]},{"type":"Box","props":{"visible":false,"var":"_box_msg","name":"_box_msg"},"child":[{"type":"Box","props":{"y":0,"x":0,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/yanhua.sk","stopAt":0,"name":"yanhua","isLoop":"false","currAniName":"yanhua"}},{"type":"SkeletonPlayer","props":{"y":540,"x":960,"visible":false,"url":"share/animation/gdeva/ld.sk","stopAt":0,"preview":true,"name":"ld","isLoop":"false","currAniName":"1_1"}}]}]};
	AfterClassPracticeView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_AFTER_CLASS_PRACTICE,AfterClassPracticeView);
		}
	}

	return AfterClassPracticeView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.AppletView extends com.subject.module.functionshell.BaseEvaluationView
var AppletView=(function(_super){
	function AppletView(){
		AppletView.__super.call(this);
	}

	__class(AppletView,'com.subject.module.functionshell.AppletView',_super);
	var __proto=AppletView.prototype;
	__getset(0,__proto,'notNeedToCutScreen',function(){
		return true;
	});

	return AppletView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.BabyEvaView extends com.subject.module.functionshell.BaseEvaluationView
var BabyEvaView=(function(_super){
	function BabyEvaView(){
		BabyEvaView.__super.call(this);
	}

	__class(BabyEvaView,'com.subject.module.functionshell.BabyEvaView',_super);
	var __proto=BabyEvaView.prototype;
	__proto.createChildren=function(){
		this.name="evaluation";
		this.TAG="BabyEvaluation";
		_super.prototype.createChildren.call(this);
	}

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:VipThink.viewMgr.currPageIdx+1,
			answer:v.result==null ? false :v.result,
			timeLong:this._costTime,
			contentModule:v.contentModule,
			abilityModule:v.abilityModule,
			knowledgeModule:v.knowledgeModule,
			trueWeight:v.rightProportion,
			falseWeight:v.wrongProportion
		};
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IEvaluation')
	});

	BabyEvaView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_BABY_EVA,BabyEvaView);
		}
	}

	return BabyEvaView;
})(BaseEvaluationView)


/**
*定级测评
*/
//class com.subject.module.functionshell.GdEvaView extends com.subject.module.functionshell.BaseEvaluationView
var GdEvaView=(function(_super){
	function GdEvaView(){
		GdEvaView.__super.call(this);
	}

	__class(GdEvaView,'com.subject.module.functionshell.GdEvaView',_super);
	var __proto=GdEvaView.prototype;
	__proto.createChildren=function(){
		this.name="gdEvaluation";
		this.TAG="GdEvaluation";
		this.COUNT_DOWN=true;
		this.AUTO_PLAY_SOUND=this.isAuto();
		_super.prototype.createChildren.call(this);
	}

	// 是否自动播放语音
	__proto.isAuto=function(){
		if(VipThink.config.courseCfg.isSound==false){
			return false;
		}
		return true;
	}

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:VipThink.viewMgr.currPageIdx+1-this.notSubPageNum,
			timeLong:this._costTime,
			answer:v.result==null ? false :v.result
		};
	});

	// }
	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IGdEvaluation')
	});

	GdEvaView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_GRADE_EVA,GdEvaView);
		}
	}

	return GdEvaView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.GraduationView extends com.subject.module.functionshell.BaseEvaluationView
var GraduationView=(function(_super){
	function GraduationView(){
		GraduationView.__super.call(this);
	}

	__class(GraduationView,'com.subject.module.functionshell.GraduationView',_super);
	var __proto=GraduationView.prototype;
	__proto.createChildren=function(){
		this.name="graduation";
		this.TAG="Graduation";
		this.AUTO_PLAY_SOUND=true;
		this.COUNT_DOWN=true;
		_super.prototype.createChildren.call(this);
		this.AUTO_PLAY_SOUND=this.isAuto();
	}

	// 是否自动播放语音
	__proto.isAuto=function(){
		if(VipThink.config.courseCfg.isSound==false){
			return false;
		}
		return true;
	}

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:VipThink.viewMgr.currPageIdx+1,
			timeLong:this._costTime,
			answer:v.result==null ? false :v.result
		};
	});

	__getset(0,__proto,'timeGradient',function(){
		return [180];
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IGraduation')
	});

	GraduationView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_GRADUATION,GraduationView);
		}
	}

	return GraduationView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.homework.HomeWorkOnlineView extends com.subject.module.functionshell.BaseEvaluationView
var HomeWorkOnlineView=(function(_super){
	function HomeWorkOnlineView(){
		this._boxCheckSkip=null;
		this.challengeView=null;
		this.challengeConfig=null;
		this.unlock=false;
		this.isRedoWrong=false;
		/*是否所有题目都做过一次了 */
		this.hasFinish=false;
		/*非挑战题本地答案记录 */
		this.subResults=[];
		/*所有题目本地答案记录 */
		this.allResults=[];
		this._xunhuanIndex=-1;
		this.curPageResult=false;
		HomeWorkOnlineView.__super.call(this);
	}

	__class(HomeWorkOnlineView,'com.subject.module.functionshell.homework.HomeWorkOnlineView',_super);
	var __proto=HomeWorkOnlineView.prototype;
	__proto.createChildren=function(){
		this.name="homeworkOnline";
		this.TAG="HomeWorkOnlineView";
		this.AUTO_PLAY_SOUND=this.isAuto();
		this.challengeConfig=EvaModel.data.homeworkChallengeConfig;
		this.isRedoWrong=EvaModel.data.isRedoWrong
		if (this.challengeConfig)
			this.unlock=this.challengeConfig.unlock;
		if (this.challengeConfig){
			this.challengeView=new HomeworkChallengeView(this,this.challengeConfig);
			this.addChild(this.challengeView);
			this.challengeView.zOrder=10;
		}
		_super.prototype.createChildren.call(this);
		this._box_notice=new NewHomeworkNoticeView(this);
		this.addChild(this._box_notice);
		this._box_notice.zOrder=10;
		this._boxCheckSkip=new CheckSkipView(this);
		this._boxCheckSkip.visible=false;
		this.addChild(this._boxCheckSkip);
		this._boxCheckSkip.zOrder=11;
		KlEventCenter.on(HomeWorkOnlineView.HOMEWORK_ACTION,this,this.onHomeworkAction);
		this.on("onCallBtnClick",this,this.onCallBtnClick);
	}

	// NewHomeworkNoticeView的按钮点击调用
	__proto.onCallBtnClick=function(btnName){
		this.onClick({target:this[btnName]});
	}

	__proto.onHomeworkAction=function(args){
		var action=args.action;
		switch (action){
			case "nextPage":{
					this.finish();
					break ;
				}
			case "finish":{
					_super.prototype.finish.call(this);
					break ;
				}
			}
	}

	// 是否自动播放语音
	__proto.isAuto=function(){
		if(VipThink.config.courseCfg.isSound==false){
			return false;
		};
		var courseId=VipThink.config.course;
		if (courseId){
			if (courseId.indexOf("s5_")!=-1 || courseId.indexOf("s6_")!=-1 || courseId.indexOf("s7_")!=-1){
				return false;
			}
		}
		return true;
	}

	__proto.cutScreen=function(rightNow,data){
		(rightNow===void 0)&& (rightNow=false);
		var page=VipThink.currView;
		if (!page){
			console.error("HomeworkOnlineView - cutScreen - page is undefined");
			return;
		}
		this.curPageResult=page.result;
		_super.prototype.cutScreen.call(this,rightNow,data);
	}

	__proto.nextPage=function(){
		this.recordSubResults();
		if (this.hasFinish)
			this.finish();
		else
		this.challengeNextPage();
	}

	/*挑战题的翻页处理 */
	__proto.challengeNextPage=function(){
		if (!this.challengeView){
			_super.prototype.nextPage.call(this);
		}
		else{
			if (!this.unlock){
				if (VipThink.viewMgr.currPageIdx+1==this.challengeConfig.startIndex)
					this.finish();
				else
				_super.prototype.nextPage.call(this);
			}
			else{
				if (VipThink.viewMgr.currPageIdx+1==this.challengeConfig.startIndex && !this.isRedoWrong){
					this.challengeView.visible=true;
				}
				else
				_super.prototype.nextPage.call(this);
			}
		}
	}

	// 本地记录每一关的答案，用于题目跳过自检
	__proto.recordSubResults=function(){
		if (!(this.challengeConfig && this.challengeConfig.unlock && VipThink.viewMgr.currPageIdx >=this.challengeConfig.startIndex))
			this.subResults[VipThink.viewMgr.currPageIdx]=this.curPageResult;
		this.allResults[VipThink.viewMgr.currPageIdx]=this.curPageResult;
	}

	/*重写结束方法，增加题目跳过检测l逻辑 */
	__proto.finish=function(){
		this.recordSubResults();
		var ids=this.wrongIds;
		if (!ids || !ids.length)
			_super.prototype.finish.call(this);
		else{
			if (!this.hasFinish){
				this.hasFinish=true;
				this.canAct=true;
				this._boxCheckSkip.showCheck(ids);
			}
			else{
				if (this.xunhuanIndex==-1){
					this.xunhuanIndex=ids[0];
					console.debug("HomeWorkOnlineView---------finish-----------重新循环跳过题目");
				}
				else{
					var isLast=true;
					for (var i=0;i < ids.length;i++){
						if (ids[i] >=this.xunhuanIndex){
							isLast=false;
							if (i==ids.length-1){
								if (ids[i]==this.xunhuanIndex){
									this.xunhuanIndex=-1;
									this.hasFinish=false;
									this.finish();
								}
								else
								this.xunhuanIndex=ids[i]
							}
							else{
								this.xunhuanIndex=ids[i]==this.xunhuanIndex ? ids[i+1] :ids[i];
								console.debug("HomeWorkOnlineView---------finish-----------循环错题中，跳到第"+this.xunhuanIndex+"页");
							}
							break ;
						}
					}
					if (isLast){
						this.xunhuanIndex=-1;
						this.hasFinish=false;
						this.finish();
					}
				}
			}
		}
	}

	__proto.onComplete=function(){
		var _$this=this;
		this.consoleDebug("onComplete","完成测评");
		var useTimes;
		var hasUse;
		if (this._boxCheckSkip){
			useTimes=this._boxCheckSkip.useTimes;
			hasUse=this._boxCheckSkip.hasUse;
		}
		else{
			return;
		};
		var args={type:this.name,data:{act:"complete",desc:"测评完成",eventId:"homework_result",eventName:"课后练习结果",param:{renovate_num:this.redoTimes,skip_num:this.jumpTimes,answers_result:formatResults(this.allResults),skipcheck_num:useTimes,skipcheckquite:!hasUse,sumbmit_num:this.commitTimes,correct_num:getRightNum(),titles_num:this.allResults.length}}}
		VipThink.nativeAPI.noticeNative({args:args});
		console.debug("HomeworkOnlineView---------onComplete--------数据："+JSON.stringify(args));
		function formatResults (results){
			var arr=[];
			for (var i=0;i < results.length;i++){
				var str="0"+(i+1);
				if (results[i]===true)
					str+="正确";
				else if (results[i]===false)
				str+="错误";
				else if (results[i]===null)
				str+="跳过";
				arr.push(str);
			}
			return arr;
		}
		function getRightNum (){
			var num=0;
			for (var i=0;i < _$this.allResults.length;i++){
				_$this.allResults[i] && num++;
			}
			return num;
		}
	}

	__proto.enterChallenge=function(){
		_super.prototype.nextPage.call(this);
	}

	// VipThink.viewMgr.event("hasEnterChallenge");
	__proto.setLabel=function(){
		_super.prototype.setLabel.call(this);
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0){
			this._lab_subject.text="Q"+(EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx]+1)+":";
		}
		VipThink.viewMgr.event("afterSetLabel");
	}

	__getset(0,__proto,'wrongIds',function(){
		var ids=[];
		for (var i=0;i < this.subResults.length;i++){
			if (this.subResults[i]===null)
				ids.push(i);
		}
		return ids;
	});

	// 跳到对应的关卡
	__getset(0,__proto,'xunhuanIndex',function(){
		return this._xunhuanIndex;
		},function(value){
		this._xunhuanIndex=value;
		if (value !=-1){
			if (VipThink.viewMgr.currPageIdx==value)
				this.onClick({target:this._bt_sound})
			else
			VipThink.viewMgr.currPageIdx=value;
		}
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IHomeWorkOnline');
	});

	// }
	__getset(0,__proto,'showDoneViewAndPlayComplteSound',function(){
		return false;
	});

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if (!v)
			return {};
		var status=0;
		if (v.result==null){
			status=2;
		}
		else if (v.result==false){
			status=0;
		}
		else{
			status=1;
		};
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0)
			truePageIdx=EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx]
		return {onlineWorkId:EvaModel.data.id,userId:VipThink.user.id,liveId:EvaModel.data.liveId ? EvaModel.data.liveId :VipThink.config.liveId,type:EvaModel.data.onlineHomeworkType ? EvaModel.data.onlineHomeworkType :1,level:truePageIdx+1,status:status,time:this._costTime};
	});

	HomeWorkOnlineView.HOMEWORK_ACTION="homeworkAction";
	HomeWorkOnlineView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_HOMEWORK_ONLINE,HomeWorkOnlineView);
		};
	}

	return HomeWorkOnlineView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.SpeciaSubjectEvaView extends com.subject.module.functionshell.BaseEvaluationView
var SpeciaSubjectEvaView=(function(_super){
	function SpeciaSubjectEvaView(){
		SpeciaSubjectEvaView.__super.call(this);
	}

	__class(SpeciaSubjectEvaView,'com.subject.module.functionshell.SpeciaSubjectEvaView',_super);
	var __proto=SpeciaSubjectEvaView.prototype;
	__proto.createChildren=function(){
		this.name="sEvaluation";
		this.TAG="SpecialSubjectEvalution";
		this.AUTO_PLAY_SOUND=this.isAuto();
		_super.prototype.createChildren.call(this);
	}

	// 是否自动播放语音
	__proto.isAuto=function(){
		if(VipThink.config.courseCfg.isSound==false||VipThink.config.courseCfg.autoPlay==false){
			return false;
		}
		return true;
	}

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:VipThink.viewMgr.currPageIdx+1,
			timeLong:this._costTime,
			answer:v.result==null ? false :v.result
		};
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.ISevaluation')
	});

	SpeciaSubjectEvaView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_SPECIAL_SUBJECT_EVA,SpeciaSubjectEvaView);
		}
	}

	return SpeciaSubjectEvaView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.KpUpgradeView extends com.subject.module.functionshell.BaseUpgradeView
var KpUpgradeView=(function(_super){
	function KpUpgradeView(){
		KpUpgradeView.__super.call(this);
	}

	__class(KpUpgradeView,'com.subject.module.functionshell.KpUpgradeView',_super);
	var __proto=KpUpgradeView.prototype;
	__proto.createChildren=function(){
		this.name="kpUpgrade";
		this.TAG="KpUpgrade";
		this.AUTO_PLAY_SOUND=true;
		this.COUNT_DOWN=true;
		_super.prototype.createChildren.call(this);
	}

	/*
	*本类课件需要在截屏后提交给应用端的数据
	*/
	__getset(0,__proto,'submitData',function(){
		var arr;
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			evaId:EvaModel.data.id,
			userId:VipThink.user.id,
			questionIndex:VipThink.viewMgr.currPageIdx+1,
			timeLong:this._costTime > this.timePerQuestion ? this.timePerQuestion :this._costTime,
			answer:v.result==null ? false :v.result,
			score :this.totalScore
		};
	});

	__getset(0,__proto,'timePerQuestion',function(){
		return 180;
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IUpgrade');
	});

	KpUpgradeView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_KP_UPGRADE,KpUpgradeView);
		}
	}

	return KpUpgradeView;
})(BaseUpgradeView)


//class com.subject.module.functionshell.LightLessonView extends com.subject.module.functionshell.BaseExplainLessonView
var LightLessonView=(function(_super){
	function LightLessonView(){
		LightLessonView.__super.call(this);
	}

	__class(LightLessonView,'com.subject.module.functionshell.LightLessonView',_super);
	LightLessonView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_LIGHT_LESSON,LightLessonView);
		}
	}

	return LightLessonView;
})(BaseExplainLessonView)


/**
*测评类型的阶段测评
*/
//class com.subject.module.functionshell.StageEvaView extends com.subject.module.functionshell.BaseEvaluationView
var StageEvaView=(function(_super){
	function StageEvaView(){
		StageEvaView.__super.call(this);
	}

	__class(StageEvaView,'com.subject.module.functionshell.StageEvaView',_super);
	var __proto=StageEvaView.prototype;
	__proto.createChildren=function(){
		this.name="stageEvaluation";
		this.TAG="StageEvaView";
		this.AUTO_PLAY_SOUND=this.isAuto();
		_super.prototype.createChildren.call(this);
	}

	// 是否自动播放语音
	__proto.isAuto=function(){
		if (VipThink.config.courseCfg.isSound==false){
			return false;
		}
		return true;
	}

	/**
	*获取结束音效
	*/
	__getset(0,__proto,'completeSound',function(){
		if (this.isRemainingTimeEnd){
			return this.SOUND_COMPLETE_TIMEOUT;
		}
		if (VipThink.EVALUATION_TYPE==1){
			return this.SOUND_COMPLETE_STAGEEVA;
		}
		return VipThink.getLanguageSound(this.SOUND_COMPLETE);
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IStageEvaluation');
	});

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if (!v)
			return {};
		var costTime=this._costTime;
		var answer=0;
		if (v.result !=null && v.result >=0){
			answer=v.result;
		}
		else{
			answer=v.result==null || v.result==false ? 0 :1;
		};
		var currPageIdx=VipThink.viewMgr.currPageIdx;
		var questionIndex=currPageIdx+1;
		var questionTotal=VipThink.viewMgr.mainView.pageCfgList.length;
		var sdata={
			userId:VipThink.config.userVO.id,
			evaId:EvaModel.data.id,
			questionIndex:questionIndex,
			questionTotal:questionTotal,
			timeLong:costTime,
			answer:answer
		};
		var answerData=this.answerDataObj[currPageIdx];
		if (VipThink.EVALUATION_TYPE==1){
			sdata["score"]=answerData && answerData.score ? answerData.score :0;
		}
		return sdata;
	});

	StageEvaView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_STAGE_EVA,StageEvaView);
		}
	}

	return StageEvaView;
})(BaseEvaluationView)


//class com.subject.module.functionshell.ReviewLessonView extends com.subject.module.functionshell.BaseExplainLessonView
var ReviewLessonView=(function(_super){
	function ReviewLessonView(){
		ReviewLessonView.__super.call(this);
	}

	__class(ReviewLessonView,'com.subject.module.functionshell.ReviewLessonView',_super);
	ReviewLessonView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_REVIEW_LESSON,ReviewLessonView);
		}
	}

	return ReviewLessonView;
})(BaseExplainLessonView)


//class com.subject.module.functionshell.homework.SwitchQuestionTipsView extends com.subject.module.functionshell.homework.NewHomeworkNoticeView
var SwitchQuestionTipsView=(function(_super){
	function SwitchQuestionTipsView(caller,callback){
		this._$7_caller=null;
		this.clickCallback=null;
		SwitchQuestionTipsView.__super.call(this,caller);
		this._$7_caller=caller;
		this.clickCallback=callback;
	}

	__class(SwitchQuestionTipsView,'com.subject.module.functionshell.homework.SwitchQuestionTipsView',_super);
	var __proto=SwitchQuestionTipsView.prototype;
	__proto.onResLoad=function(){
		console.log("SwitchQuestionTipsView-onResLoad");
		_super.prototype.onResLoad.call(this);
		this.showPopup()
	}

	__proto.showPopup=function(){
		console.log("SwitchQuestionTipsView-showPopup",this.visible,this._$7_caller.SOUND_JUMP);
		this.visible=true;
		KlSoundManager.playSound(VipThink.getLanguageSound(this._$7_caller.SOUND_JUMP));
		this.sendExposure();
	}

	__proto.onClick=function(e){
		console.log("SwitchQuestionTipsView onClick",e.target.name);
		this.clickCallback && this.clickCallback(e.target.name);
		KlSoundManager.stopAllSound();
		this.visible=false;
		this.sendClick(e.target.name);
		this.removeSelfFn();
	}

	/**
	*设置点击回调
	*/
	__proto.setClickCallback=function(callback){
		this.clickCallback=callback;
	}

	/**
	*移除自身
	*/
	__proto.removeSelfFn=function(){
		this.removeSelf();
		this.clickCallback=null;
		this._$7_caller=null;
	}

	/**
	*曝光埋点
	*/
	__proto.sendExposure=function(){
		var sensorsData={};
		sensorsData["$element_name"]="出门测跳题弹窗";
		Reporter.sendPoint("student_zbj_exposure",sensorsData);
	}

	/**
	*点击埋点
	*/
	__proto.sendClick=function(btnType){
		var btnTypeMap={
			"_bt_jump":"出门测跳题弹窗-跳过",
			"_bt_notjump":"出门测跳题弹窗-不跳过"
		};
		var sensorsData={};
		sensorsData["$element_name"]=btnTypeMap[btnType];
		Reporter.sendPoint("student_zbj_click",sensorsData);
	}

	return SwitchQuestionTipsView;
})(NewHomeworkNoticeView)


//class com.subject.module.functionshell.jlreview.JLReviewSecondView extends com.subject.module.functionshell.jlreview.JLReviewLessonView
var JLReviewSecondView=(function(_super){
	function JLReviewSecondView(){
		this.alphaBox=null;
		this.treasureAni=null;
		this.outTiming=0;
		this.totalLevel=0;
		this.currLevel=0;
		this.submitCount=0;
		this.hasSubmitPageIdxs=[];
		JLReviewSecondView.__super.call(this);
		this.mouseThrough=true;
	}

	__class(JLReviewSecondView,'com.subject.module.functionshell.jlreview.JLReviewSecondView',_super);
	var __proto=JLReviewSecondView.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.name="JLReviewSecond";
		ViewManager.instance.on("mainViewPrepared",this,this.onPrepared);
		VipThink.viewMgr.feedBackView.on("showAnswerFace",this,this.onShowAnswerFace);
		VipThink.viewMgr.on("allVideoOver",this,this.onVideoOver);
		var res_arr=[
		{url:"share/animation/JLReviewSecond/box.sk",type:"arraybuffer"},
		{url:"share/animation/JLReviewSecond/box.png",type:"image"},
		{url:"share/animation/JLReviewSecond/box2.png",type:"image"},
		{url:"share/animation/JLReviewSecond/light1.wav",type:"sound"},
		{url:"share/animation/JLReviewSecond/slm.wav",type:"sound"}]
		Laya.loader.load(res_arr,new Handler(this,this.onResLoad));
		KlEventCenter.on("canNotSetPageIdx",this,this.onIsLastLevel)
	}

	__proto.onIsLastLevel=function(_num){
		if(_num==1){
			this.openEndInterface();
		}
	}

	__proto.onShowAnswerFace=function(type){
		console.debug("JLReviewLessonView - 监听showAnswerFace回调");
		var curPageInfo=this.pageInfo[this.pageInfo.length-1];
		this.stopCount();
		this.stopTimeOutCount();
		this.totalTime+=this.curPageTime;
		if(type==2){
			curPageInfo.isClear=false;
		}
		curPageInfo.time=this.curPageTime;
		curPageInfo.answer=type==1;
		VipThink.nativeAPI.noticeNative({
			args:{
				type:this.name,
				act:"done",
				data:curPageInfo
			}
		});
	}

	__proto.onPrepared=function(){
		_super.prototype.onPrepared.call(this);
		this.currLevel=this.currLevel1;
		console.debug("页面清理JLReviewScondLessonView - 复习课总关卡"+this.totalLevel+"当前关卡"+this.currLevel);
		this.submitJLReviewSecondInfo();
		if(VipThink.currView){
			VipThink.currView.on("cusEvent",this,this.onCusEvent)
		}
		this.canAct=true;
		if(this._cfg.type=="video"){
			this.timer.clear(this,this.onTimeOut);
			}else{
			this.outTiming=this.getTiming("timing");
			if(this.outTiming){
				this.timer.once(this.outTiming*1000,this,this.onTimeOut);
			}
		}
	}

	__proto.onCusEvent=function(data){
		if(data.type !="mousedown"){
			return;
		}
		if(!this.isSubmitRepeatPage()){
			var p=VipThink.viewMgr.currPageIdx;
			this.hasDonePageIdxs.push(p);
			var _event="Click_courseware";
			this.hasSubmitPageIdxs.push([VipThink.viewMgr.currPageIdx]);
			var UnitName=CourseDataUtil.goClassData.UnitName;
			var courseCategory=CourseDataUtil.goClassData.courseCategory;
			var UnitID=CourseDataUtil.goClassData.UnitID;
			var courseware_page=VipThink.viewMgr.currPageIdx;
			var data={
				eventName:_event,
				param:{
					UnitName:UnitName,
					courseCategory:courseCategory,
					UnitID:UnitID,
					courseware_page:(courseware_page+1)+""
				}
			};
			Reporter.reportData(3,data,null,{msg:"JLReviewScondLessonView.onCusEvent 提交埋点数据：" });
		}
	}

	// 判断这个页面是不是提交过埋点，是的就不再提交了
	__proto.isSubmitRepeatPage=function(){
		var p=VipThink.viewMgr.currPageIdx;
		for (var i=0;i < this.hasDonePageIdxs.length;i++){
			if(p==this.hasDonePageIdxs[i])
				return true
		}
		return false;
	}

	__proto.stopTimeOutCount=function(){
		this.timer.clear(this,this.onTimeOut);
	}

	__proto.onTimeOut=function(){
		if(this.outTiming){
			console.debug("JLReviewScondLessonView - 关卡超时");
			VipThink.nativeAPI.noticeNative({
				action:"noticeNative",
				args:{
					type:"JLReviewSecond",
					act:"JLReviewOutTiming"
				}
			})
		}
	}

	__proto.onResLoad=function(){
		this.createView(JLReviewSecondView.uiView);
		this.totalLevel=this.maxLevel;
		this.currLevel=this.currLevel1;
		console.debug("页面初始化JLReviewScondLessonView - 发复习课关卡"+"总关卡"+this.totalLevel+"当前关卡"+this.currLevel);
		this.submitJLReviewSecondInfo();
		if ("prepared"==VipThink.viewMgr.mainView.status){
			this.onPrepared();
		}
	}

	// 当前页视频播放完后
	__proto.onVideoOver=function(){
		if(this.isLastLevel){
			this.openEndInterface()
			return;
		}
		this._cfg=this._cfg || this.levelConfig;
		if(this._cfg.type=="video"){
			console.debug("JLReviewSecondView - onVideoEnd - 播完所有游戏、老师视频后跳到下一关");
			VipThink.nativeAPI.nextPage();
		}
		else{
			if(this.isDone){
				console.debug("JLReviewSecondView - onVideoEnd - 播完正确答案动画后跳到下一关");
				this.nextPage();
				this.isDone=false;
			}
		}
	}

	__proto.openEndInterface=function(){
		var _$this=this;
		if(this.submitCount!=0)
			return;
		this.submitCount++;
		console.debug("JLReviewScondLessonView提交结束数据");
		this.submitData();
		console.debug("流程走完JLReviewScondLessonView - 进入结束页面发关卡"+this.currLevel);
		this.currLevel=this.totalLevel;
		this.submitJLReviewSecondInfo();
		if(parseInt(VipThink.config.finishCount)==0){
			VipThink.nativeAPI.noticeNative({args:{
					type:"nomal",
					data:{act:"videoUrl",url:""}
			}});
			this.alphaBox.visible=true;
			this.treasureAni.visible=true;
			this.treasureAni.play(this.treasureAni.currAniName,false);
			this.treasureAni.once("end",this,function(){
				_$this.treasureAni.visible=false;
				_$this.submitGameFinish();
			});
			}else{
			this.submitGameFinish();
		}
	}

	__proto.submitJLReviewSecondInfo=function(){
		VipThink.nativeAPI.noticeNative({
			action:"noticeNative",
			args:{
				type:"JLReviewSecond",
				act:"JLReviewSecondInfo",
				data:{
					totalLevel:this.totalLevel,
					currLevel:this.currLevel
				}
			}
		})
	}

	__proto.submitGameFinish=function(){
		console.debug("JLReviewSecondView - gameFinish - 提交游戏结束让应用出结束界面");
		VipThink.nativeAPI.noticeNative({
			action:"noticeNative",
			args:{
				type:"JLReviewSecond",
				act:"gameFinish"
			}
		})
	}

	/**
	*获取关卡时间
	*/
	__proto.getTiming=function(type){
		if (!this._cfg)
			return null;
		var _timing=this._cfg[type];
		if(!_timing)
			return null;
		return _timing;
	}

	// 获取当前关卡数
	__getset(0,__proto,'currLevel1',function(){
		var _arr=JSON.parse(VipThink.config.courseCfg.JLReviewSecondLevel);
		if(_arr){
			for (var i=0;i < _arr.length;i++){
				if(_arr[i]){
					for (var j=0;j < _arr[i].length;j++){
						if(VipThink.viewMgr.currPageIdx==parseInt(_arr[i][j]))
							return i;
					}
				}
			}
		}
		return 0;
	});

	// 获取最大关卡数
	__getset(0,__proto,'maxLevel',function(){
		var _arr=JSON.parse(VipThink.config.courseCfg.JLReviewSecondLevel);
		if(_arr){
			return _arr.length;
		}
		return 0;
	});

	JLReviewSecondView.uiView={"type":"View","props":{"width":1920,"mouseThrough":true,"height":1000},"child":[{"type":"Box","props":{"width":1920,"visible":false,"var":"alphaBox","mouseThrough":true,"mouseEnabled":false,"height":1080,"alpha":0.4},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":705,"x":922,"visible":false,"var":"treasureAni","url":"share/animation/JLReviewSecond/box.sk","stopAt":0,"preview":false,"name":"treasureAni","isLoop":"false","currAniName":"box_2"}}]};
	JLReviewSecondView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_JL_REVIEWSECOND,JLReviewSecondView);
		};
	}

	return JLReviewSecondView;
})(JLReviewLessonView)


//class com.subject.module.specialklview.LightOpenView extends com.klzz.ui.custom.DragView.DragView
var LightOpenView=(function(_super){
	function LightOpenView(){
		this.box_1=null;
		this.box_drop=null;
		this.box_drag=null;
		this.box_2=null;
		this.box_round2=null;
		this.game2_tip_ani=null;
		this.game2_ani_show=null;
		this.game2_qiu_ani=null;
		this.box_3=null;
		this.box_round3=null;
		this.box_num=null;
		this.game3_ziti_ani=null;
		this.game3_yf_ani=null;
		this.round3_count_font=null;
		this.box_cover=null;
		this.btn_play=null;
		this.finger1=null;
		this.gameType=NaN;
		this.box_temp=null;
		this.box_ani=null;
		this.finger=null;
		this.game3Time=8;
		// 下一个动画名，是否循环，是否是最后一个
		this.aniObj={
			"nengliang0":["nengliang0_1",false,false],
			"nengliang0_1":["nengliang1_2",false,false],
			"nengliang1_2":["nengliang2_3",false,true],
			"nengliang2_3":["nengliang3",true,false]
		}
		LightOpenView.__super.call(this);
	}

	__class(LightOpenView,'com.subject.module.specialklview.LightOpenView',_super);
	var __proto=LightOpenView.prototype;
	__proto.createChildren=function(){
		View.regComponent("DragView",DragView);
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		View.regComponent("DropObj",DropObj);
		View.regComponent("DragObj",DragObj);
		View.regComponent("PriviewGuideFinger",PriviewGuideFinger);
		View.regComponent("ScaleButton",ScaleButton);
		com.klzz.ui.KlView.prototype.createChildren.call(this);
		this.createView(LightOpenView.uiView);
	}

	__proto.EndGame=function(){
		this.playSound("share/sound/anwser_right.wav");
		this.finger && (this.finger.isShow=false);
		this.mouseEnabled=false;
		var ledi=this.box_ani.getChildAt(0);
		ledi.play("damuzhi",false);
		ledi.once("end",this,this.EndGame1);
		var s1=this.box_ani.getChildAt(1);
		s1.play(s1.currAniName,false);
	}

	__proto.EndGame1=function(){
		VipThink.viewMgr.feedBackView.event("showAnswerFace",[1]);
	}

	__proto.isResultView=function(){
		var mvCfg=VipThink.viewMgr.mainView.pageCfgList;
		var curIdx=VipThink.viewMgr.currPageIdx;
		if(mvCfg[curIdx].type=="lightOpenGame")
			return true;
		return false;
	}

	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		this.init(byReset);
	}

	__proto.init=function(byReset){
		var type=this.getRand()
		switch(type){
			case 1:{
					this.box_temp=this.box_1;
					break ;
				}
			case 2:{
					this.box_temp=this.box_2;
					break ;
				}
			case 3:{
					this.box_temp=this.box_3;
					break ;
				}
			}
		this.gameType=type;
		this.box_temp.visible=true;
		this.btn_play.on("click",this,this.onClickHide);
		this.box_ani=this.box_temp.getChildByName("box_ani");
		this.finger=this.box_temp.getChildByName("finger");
		this.game2_qiu_ani.on("click",this,this.onClickGame2);
		this.game3Time=8;
		this.finger1.isShow=true;
		_super.prototype.initView.call(this,byReset)
		this.onMouseDownHandler=Handler.create(this,this.onMouseDown,null,false);
	}

	__proto.onClickGame2=function(){
		var _$this=this;
		this.mouseEnabled=false;
		var arr=this.aniObj[this.game2_qiu_ani.currAniName]
		this.game2_qiu_ani.play(arr[0],arr[1]);
		if(arr[2]){
			this.game2_tip_ani.play(this.game2_tip_ani.currAniName,false);
			this.game2_tip_ani.stopAtStart();
			this.timerOnce(2000,this,this.EndGame);
			this.timerOnce(200,this,function(){
				_$this.game2_ani_show.visible=true;
				_$this.game2_ani_show.play(_$this.game2_ani_show.currAniName,true);
				var arr=_$this.aniObj[_$this.game2_qiu_ani.currAniName]
				_$this.game2_qiu_ani.play(arr[0],arr[1]);
			})
			}else{
			this.game2_qiu_ani.once("end",this,this.onClickGame2);
		}
	}

	// }
	__proto.onMouseDown=function(){
		if(this.slcDragObj){
			this.finger.isShow=false;
		}
	}

	__proto.onClickHide=function(){
		this.finger1.isShow=false;
		this.box_cover.visible=false;
		this.openShow();
		this.mouseEnabled=false;
	}

	__proto.openShow=function(){
		var s1=this.box_ani.getChildByName("s1");
		var s2=this.box_ani.getChildByName("s2");
		s1.play(s1.currAniName,false);
		s2.play(s2.currAniName,false);
		s2.once("end",this,this.onEnd,["s2","daiji",true]);
		if(this.gameType==3){
			s1.once("end",this,this.onEnd,["s1","daiji1"]);
			}else{
			s1.once("end",this,this.onEnd,["s1","daiji"]);
		}
	}

	__proto.onEnd=function(skName,daijiName,isCanMove){
		(isCanMove===void 0)&& (isCanMove=false);
		if(isCanMove){
			this.mouseEnabled=isCanMove;
			this.finger && (this.finger.isShow=true);
			if(this.gameType==2){
				this.box_round2.visible=true;
				this.game2_tip_ani.play(this.game2_tip_ani.currAniName,true);
				}else if (this.gameType==3){
				this.box_round3.visible=true;
				this.game3()
			}
		};
		var ani=this.box_ani.getChildByName(skName);
		ani && ani.play(daijiName,true);
	}

	__proto.game3=function(){
		this.timer.loop(1000,this,this.game3Loop);
		this.game3_yf_ani.play(this.game3_yf_ani.currAniName,true);
		this.game3_ziti_ani.play(this.game3_ziti_ani.currAniName,false);
	}

	__proto.game3Loop=function(){
		if(this.game3Time>0){
			this.game3Time--;
			this.round3_count_font.value=""+this.game3Time;
			for (var i=0;i < this.box_num.numChildren;i++){
				var img=this.box_num.getChildAt(i);
				if(i<this.game3Time){
					img.visible=true
					}else{
					img.visible=false;
				}
			}
			}else{
			this.game3_yf_ani.play(this.game3_yf_ani.currAniName,false);
			this.game3_ziti_ani.play(this.game3_ziti_ani.currAniName,false);
			this.game3_yf_ani.stopAtEnd();
			this.game3_ziti_ani.stopAtEnd();
			this.EndGame()
			this.timer.clearAll(this);
		}
	}

	__proto.getRand=function(){
		var num=10*Math.random()
		do{
			num=Math.ceil(10*Math.random());
		}while(num>3);
		return num
	}

	__getset(0,__proto,'BoxDrag',function(){
		return this.box_drag;
	});

	__getset(0,__proto,'successHandler',function(){
		var _$this=this;
		return Handler.create(this,function(slcDragObj,hitDragObj,hitDropObj){
			if(slcDragObj){
				if(hitDropObj){
					var ani=hitDropObj.getChildByName("ani_show");
					var ani1=slcDragObj.getChildByName("ani_star");
					if(ani){
						ani.visible=true;
						ani.play(ani.currAniName,true);
					}
					if(ani1){
						ani1.play(ani1.currAniName,false);
					}
				}
				_$this.mouseEnabled=false;
				_$this.timerOnce(1000,this,_$this.EndGame);
			}
		});
	});

	__getset(0,__proto,'faildHandler',function(){
		return Handler.create(this,function(slcDragObj,hitDragObj,hitDropObj){
			if(slcDragObj){
				if(hitDropObj){
					var ani=hitDropObj.getChildByName("ani_show");
					if(ani){
						ani.visible=false;
						ani.play(ani.currAniName,false);
					}
				}
			}
		});
	});

	__getset(0,__proto,'BoxDrop',function(){
		return this.box_drop;
	});

	LightOpenView.uiView={"type":"DragView","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"skin":"gameOpenGame/image/bg.jpg","height":1080}},{"type":"Image","props":{"y":252,"x":491,"skin":"gameOpenGame/image/feiji.png"}},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"box_1","mouseThrough":true,"height":1080},"child":[{"type":"Box","props":{"y":490,"x":910,"name":"box_ani"},"child":[{"type":"SkeletonPlayer","props":{"url":"gameOpenGame/animation/ld.sk","stopAt":0,"preview":"false","name":"s2","isLoop":"false","currAniName":"duihua1"}},{"type":"SkeletonPlayer","props":{"y":0,"x":104,"url":"gameOpenGame/animation/pphu.sk","stopAt":0,"scaleY":1,"scaleX":1,"preview":false,"name":"s1","isLoop":"false","currAniName":"duihua1"}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"box_drop","mouseThrough":true,"height":1080},"child":[{"type":"DropObj","props":{"y":420,"x":960,"width":239,"pivotY":119.5,"pivotX":119.5,"noticeColor":"#ff0000","noticeBlur":4,"height":239,"hasDrop":"false","group":"-1"},"child":[{"type":"Image","props":{"y":0,"x":0,"skin":"gameOpenGame/image/kuang.png"}},{"type":"SkeletonPlayer","props":{"y":127,"x":123,"visible":false,"url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"name":"ani_show","isLoop":"false","currAniName":"xifu"}},{"type":"Circle","props":{"y":118,"x":119,"renderType":"hit","radius":190,"lineWidth":1,"fillColor":"#ff0000"}}]}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"box_drag","mouseThrough":true,"height":1080},"child":[{"type":"DragObj","props":{"y":166,"x":179,"width":248,"scaleY":0.9,"scaleX":0.9,"pivotY":122,"pivotX":124,"height":244,"hasDrop":"false","group":"-1","filterColor":"#ffff00","filterBlur":6,"canSelect":"false"},"child":[{"type":"SkeletonPlayer","props":{"y":124,"x":125,"url":"gameOpenGame/animation/game.sk","stopAt":1,"preview":true,"isLoop":true,"currAniName":"nengliangqiu"}},{"type":"SkeletonPlayer","props":{"y":115,"x":130,"url":"gameOpenGame/animation/star.sk","stopAt":0,"scaleY":2,"scaleX":2,"preview":true,"name":"ani_star","isLoop":"false","currAniName":"right"}}]}]},{"type":"PriviewGuideFinger","props":{"y":188,"x":212,"ty":422,"tx":963,"name":"finger","mode":2,"aniTime":2000}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"box_2","mouseThrough":true,"height":1080},"child":[{"type":"Box","props":{"y":423,"x":952,"visible":false,"var":"box_round2"},"child":[{"type":"SkeletonPlayer","props":{"y":76,"visible":true,"var":"game2_tip_ani","url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"isLoop":"false","currAniName":"guang"}},{"type":"SkeletonPlayer","props":{"y":4,"x":8,"visible":false,"var":"game2_ani_show","url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"isLoop":"false","currAniName":"xifu"}},{"type":"SkeletonPlayer","props":{"x":9,"visible":true,"var":"game2_qiu_ani","url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"isLoop":"false","currAniName":"nengliang0"},"child":[{"type":"Poly","props":{"y":77,"x":-529,"renderType":"hit","points":"637.0879120879118,-111.79670329670296,740.5824175824174,-96.51098901098862,669.1538461538456,-17.390109890109557,697.8241758241755,41.66483516483544,1005.5164835164834,90.01648351648379,994.8047696983867,174.29039046060313,693.2340425531914,207.68085106382978,641.3617021276594,309.6595744680851,412.63829787234044,321.48936170212767,360.2978723404252,227.0531914893619,56.54524199205008,163.98328267477223,42.55178863689474,85.80932896890369,334.0879120879119,55.6538461538463,360.461538461538,-24.56593406593396,290.1318681318676,-91.59890109890085,413.2087912087909,-95.9945054945054,480.241758241758,-267.4230769230767,541.7802197802196,-264.9285714285713","lineWidth":1,"lineColor":"#ff0000","fillColor":"#00ffff"}}]}]},{"type":"Box","props":{"y":490,"x":910,"visible":true,"name":"box_ani"},"child":[{"type":"SkeletonPlayer","props":{"url":"gameOpenGame/animation/ld.sk","stopAt":0,"scaleY":1,"scaleX":1,"preview":false,"name":"s1","isLoop":"false","currAniName":"duihua2"}},{"type":"SkeletonPlayer","props":{"y":0,"x":104,"url":"gameOpenGame/animation/mimi.sk","stopAt":0,"preview":false,"name":"s2","isLoop":"false","currAniName":"duihua2"}}]},{"type":"PriviewGuideFinger","props":{"y":495,"x":1046,"visible":true,"name":"finger","mouseThrough":true,"aniTime":800}}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"visible":false,"var":"box_3","mouseThrough":true,"height":1080},"child":[{"type":"Box","props":{"y":490,"x":910,"visible":true,"name":"box_ani"},"child":[{"type":"SkeletonPlayer","props":{"url":"gameOpenGame/animation/ld.sk","stopAt":0,"preview":"false","name":"s1","isLoop":"false","currAniName":"duihua3"}},{"type":"SkeletonPlayer","props":{"y":0,"x":104,"url":"gameOpenGame/animation/cml.sk","stopAt":0,"scaleY":1,"scaleX":1,"preview":false,"name":"s2","isLoop":"false","currAniName":"duihua3"}}]},{"type":"Box","props":{"y":46,"x":887,"visible":false,"var":"box_round3"},"child":[{"type":"Image","props":{"y":784,"visible":true,"skin":"gameOpenGame/image/yifu.png"}},{"type":"Image","props":{"x":773,"visible":true,"skin":"gameOpenGame/image/y1.png"}},{"type":"Box","props":{"y":-8,"x":764,"visible":true,"var":"box_num"},"child":[{"type":"Image","props":{"y":36.68990821798316,"x":140.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":-46,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":77.68990821798316,"x":185.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":1,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":138.68990821798315,"x":188.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":45,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":184.68990821798315,"x":147.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":89,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":184.68990821798315,"x":78.68990782540732,"skin":"gameOpenGame/image/miao.png","scaleY":-1,"rotation":89,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":145.68990821798315,"x":40.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":179,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":84.68990821798316,"x":36.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":224,"anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":38.68990821798316,"x":78.68990782540732,"skin":"gameOpenGame/image/miao.png","rotation":269,"anchorY":0.5,"anchorX":0.5}}]},{"type":"SkeletonPlayer","props":{"y":151,"x":73,"visible":true,"var":"game3_ziti_ani","url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"isLoop":"false","currAniName":"ziti"}},{"type":"SkeletonPlayer","props":{"y":967,"x":73,"visible":true,"var":"game3_yf_ani","url":"gameOpenGame/animation/game.sk","stopAt":0,"preview":true,"isLoop":"false","currAniName":"yingui"}},{"type":"FontClip","props":{"y":60,"x":835,"visible":true,"var":"round3_count_font","value":"8","skin":"gameOpenGame/image/fontclip_num6.png","sheet":"0123456789"}}]}]},{"type":"Box","props":{"y":0,"x":0,"width":1920,"var":"box_cover","mouseThrough":false,"mouseEnabled":true,"height":1080},"child":[{"type":"Sprite","props":{"y":0,"x":0,"alpha":0.4},"child":[{"type":"Rect","props":{"y":-47,"x":-35,"width":2011,"lineWidth":1,"height":1177,"fillColor":"#000000"}}]},{"type":"ScaleButton","props":{"y":540,"x":960,"var":"btn_play","skin":"gameOpenGame/image/btn_play.png","label":""}},{"type":"PriviewGuideFinger","props":{"y":614,"x":1148,"var":"finger1","aniTime":800}}]}]};
	LightOpenView.__init$=function(){{
			SpecialKlViewFactory.regist("lightOpenGame",LightOpenView);
		};;;
	}

	return LightOpenView;
})(DragView)


//class com.subject.module.specialklview.evaguide.EvaGuide extends com.subject.module.specialklview.evaguide.EvaGuideUI
var EvaGuide=(function(_super){
	function EvaGuide(){
		this.isDown=false;
		this.xiguaInitPos=null;
		this.isSkip=false;
		EvaGuide.__super.call(this);
	}

	__class(EvaGuide,'com.subject.module.specialklview.evaguide.EvaGuide',_super);
	var __proto=EvaGuide.prototype;
	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		com.klzz.ui.KlView.prototype.initView.call(this,byReset);
		this.ld.play(this.ld.currAniName,false);
		this.ld.on("end",this,this.afterLdPlay);
		this.btn_skip.on("click",this,this.onSkip);
		this.isSkip=false;
		this.ld.y=this.ani2.y=535;
		this.xiguaInitPos=[this.xigua.x,this.xigua.y];
	}

	__proto.afterLdPlay=function(){
		var _$this=this;
		if(this.isSkip)return;
		switch(this.ld.currAniName){
			case "1_1":{
					this.ld.play("1_2",true);
					this.ani2.visible=true;
					this.ani2.play("1_3",true);
					this.btn_sound.mouseEnabled=true;
					this.btn_sound.once("click",this,function(){
						_$this.btn_sound.mouseEnabled=false;
						_$this.playSound("game_yxhhh/sound/timu.wav");
						_$this.timerOnce(3000,this,function(){
							_$this.ld.y=_$this.ani2.y=540;
							_$this.xing.visible=true;
							_$this.xing.play("xxing",false);
							_$this.xing.pos(_$this.btn_sound.x,_$this.btn_sound.y);;
							_$this.xing.once("end",this,function(){
								_$this.ld.play("2_1",false);
							})
							_$this.ani2.visible=false;
						})
					})
					break ;
				}
			case "2_1":{
					this.ani2.visible=true;
					this.ld.play("2_2",true);
					this.ani2.play("2_3",true);
					this.hit_place1.once("click",this,function(){
						_$this.xing.visible=true;
						_$this.xing.play("xxing",false);
						_$this.xing.pos(_$this.hit_place1.x,_$this.hit_place1.y);;
						_$this.xing.once("end",this,function(){
							_$this.ani2.visible=false;
							_$this.zc.visible=true;
							_$this.zc.play("zc_2",false);
							_$this.zc.once("end",this,function(){
								if(_$this.isSkip)return;
								_$this.bg.skin="game_yxhhh/image/bg2.jpg";
								_$this.zc.play("zc_1",false);
								_$this.zc.once("end",this,function(){
									if(_$this.isSkip)return;
									_$this.ld.play("3_1",false);
									_$this.zc.visible=false;
								})
							})
						})
					})
					break ;
				}
			case "3_1":{
					this.ld.play("3_2",true);
					this.ani2.visible=true;
					this.ani2.play("3_3",true);
					this.hit_place2.once("click",this,function(){
						_$this.keyboard.visible=true;
						_$this.ani2.play("3_5",true);
						_$this.key_3.once("click",this,function(){
							_$this.playSound("share/sound/btn_click.wav");
							_$this.ani2.visible=false;
							_$this.xing.visible=true;
							_$this.xing.play("xxing",false);
							_$this.xing.pos(_$this.key_3.x,_$this.key_3.y);;
							_$this.xing.once("end",this,function(){
								_$this.ani2.visible=false;
								_$this.keyboard.visible=false;
								_$this.zc.visible=true;
								_$this.zc.play("zc_2",false);
								_$this.zc.once("end",this,function(){
									if(_$this.isSkip)return;
									_$this.bg.skin="game_yxhhh/image/bg3.jpg";
									_$this.zc.play("zc_1",false);
									_$this.box_xigua.visible=true;
									_$this.zc.once("end",this,function(){
										if(_$this.isSkip)return;
										_$this.zc.visible=false;
										_$this.ld.play("4_1",false);
									})
								})
							})
						})
					})
					break ;
				}
			case "4_1":{
					this.xigua2.visible=false;
					this.xigua.visible=true;
					this.xigua.on("mousedown",this,this.xiguaMouseDown);
					this.ld.play("4_2",true);
					this.ani2.visible=true;
					this.ani2.play("4_3",true);
					break ;
				}
			case "5_1":{
					this.ld.play("6_1",false);
					break ;
				}
			case "6_1":{
					this.ld.play("6_2",true);
					this.ani2.visible=true;
					this.ani2.y=545;
					this.ani2.play("6_3",true);
					this.btn_ok.mouseEnabled=true;
					this.btn_ok.once("click",this,function(){
						_$this.ani2.visible=false;
						_$this.btn_ok.mouseEnabled=false;
						_$this.ld.play("6_4",false)
					})
					break ;
				}
			case "6_4":{
					this.ld.visible=this.ani2.visible=false;
					this.onSkip();
				}
			}
	}

	__proto.xiguaMouseDown=function(){
		this.playSound("share/sound/btn_click.wav");
		this.isDown=true;
		this.on("mouseup",this,this.xiguaMouseUp);
		this.on("mouseout",this,this.xiguaMouseUp);
		this.on("mousemove",this,this.xiguaMouseMove);
	}

	__proto.xiguaMouseMove=function(){
		if(this.isDown){
			this.xigua.pos(this.mouseX,this.mouseY);
			if(this.outBox.hitTestPoint(this.mouseX,this.mouseY))
				this.xiguaMouseUp();
		}
	}

	__proto.xiguaMouseUp=function(){
		var _$this=this;
		this.isDown=false;
		this.off("mousemove",this,this.xiguaMouseMove);
		this.off("mouseout",this,this.xiguaMouseUp);
		this.off("mouseup",this,this.xiguaMouseUp);
		if(this.drop_place.hitTestPoint(this.mouseX,this.mouseY)){
			this.xigua.pos(this.drop_place.x,this.drop_place.y);
			this.xigua.mouseEnabled=false;
			this.xing.visible=true;
			this.xing.pos(this.drop_place.x,this.drop_place.y);
			this.xing.play(this.xing.currAniName,false);
			this.xing.once("end",this,function(){
				_$this.ld.play("5_1",false);
				_$this.xigua.visible=false;
				_$this.xigua2.visible=true;
				_$this.xigua2.pos(_$this.xigua.x,_$this.xigua.y);
			});
			this.ani2.visible=false;
		}
		else{
			this.xigua.pos(this.xiguaInitPos[0],this.xiguaInitPos[1]);
		}
	}

	__proto.onSkip=function(){
		var _$this=this;
		this.timer.clearAll(this);
		this.isSkip=true;
		this.ld.stop();
		this.ani2.stop();
		this.zc.stop();
		KlSoundManager.stopAllSound();
		this.btn_skip.visible=false;
		this.box_end.visible=true;
		this.sp_clear.once("click",this,function(){
			KlEventCenter.event("evaGuideNextPage");
		})
		this.sp_again.once("click",this,function(){
			_$this.playSound("share/sound/btn_click.wav");
			_$this.isSkip=false;
			_$this.resetInGame();
		});
	}

	// ld.play("4_1",false);
	__getset(0,__proto,'isHideShell',function(){
		return true;
	});

	EvaGuide.__init$=function(){{
			SpecialKlViewFactory.regist("evaGuide",EvaGuide);
		};;
	}

	return EvaGuide;
})(EvaGuideUI)


//class com.subject.module.specialklview.evaguidev4.EvaGuideV4 extends com.subject.module.specialklview.evaguidev4.EvaGuideV4UI
var EvaGuideV4=(function(_super){
	function EvaGuideV4(){
		this.isSkip=false
		this.isDown=false;
		this.xiguaInitPos=null;
		EvaGuideV4.__super.call(this);
	}

	__class(EvaGuideV4,'com.subject.module.specialklview.evaguidev4.EvaGuideV4',_super);
	var __proto=EvaGuideV4.prototype;
	__proto.initialize=function(){}
	__proto.initView=function(byReset){
		(byReset===void 0)&& (byReset=false);
		com.klzz.ui.KlView.prototype.initView.call(this,byReset);
		this.isSkip=false;
		this.xiguaInitPos=[this.xigua.x,this.xigua.y];
		this.addListen();
		this.afterLdPlay()
		this.timerOnce(10,this,function(){
			this.playSound("game_yxhhh/animation/ld_01.mp3");
		})
		this.ld.on("end",this,this.afterLdPlay);
		this.btn_skip.on("click",this,this.onSkip);
	}

	__proto.afterLdPlay=function(){
		var _$this=this;
		if(this.isSkip)return;
		switch(this.ld.currAniName){
			case "1_1":{
					this.playSound("game_yxhhh/animation/ld_01.mp3");
					this.timerOnce(6000,this,function(){
						_$this.ld.play("2_1",false);
						_$this.playSound("game_yxhhh/animation/ld_02.wav");
					})
					break ;
				}
			case "2_1":{
					this.ani2.visible=true;
					this.ld.play("2_2",true);
					this.ani2.play("2_3",true);
					this.hit_place1.once("click",this,function(){
						_$this.xing.visible=true;
						_$this.xing.play("xxing",false);
						_$this.xing.pos(_$this.hit_place1.x,_$this.hit_place1.y);;
						_$this.xing.once("end",this,function(){
							_$this.ani2.visible=false;
							_$this.zc.visible=true;
							_$this.zc.play("zc_2",false);
							_$this.zc.once("end",this,function(){
								if(_$this.isSkip)return;
								_$this.bg.skin="game_yxhhh/image/bg2.jpg";
								_$this.zc.play("zc_1",false);
								_$this.zc.once("end",this,function(){
									if(_$this.isSkip)return;
									_$this.ld.play("3_1",false);
									_$this.playSound("game_yxhhh/animation/ld_03.wav");
									_$this.zc.visible=false;
								})
							})
						})
					})
					break ;
				}
			case "3_1":{
					this.ld.play("3_2",true);
					this.ani2.visible=true;
					this.ani2.play("3_3",true);
					this.hit_place2.once("click",this,function(){
						_$this.keyboard.visible=true;
						_$this.ani2.play("3_5",true);
						_$this.key_3.once("click",this,function(){
							_$this.font_num.visible=true
							_$this.playSound("share/sound/btn_click.wav");
							_$this.ani2.visible=false;
							_$this.xing.visible=true;
							_$this.xing.play("xxing",false);
							_$this.xing.pos(_$this.key_3.x,_$this.key_3.y);;
							_$this.xing.once("end",this,function(){
								_$this.ani2.visible=false;
								_$this.keyboard.visible=false;
								_$this.zc.visible=true;
								_$this.zc.play("zc_2",false);
								_$this.zc.once("end",this,function(){
									if(_$this.isSkip)return;
									_$this.font_num.visible=false
									_$this.bg.skin="game_yxhhh/image/bg3.jpg";
									_$this.zc.play("zc_1",false);
									_$this.box_xigua.visible=true;
									_$this.zc.once("end",this,function(){
										if(_$this.isSkip)return;
										_$this.zc.visible=false;
										_$this.ld.play("4_1",false);
										_$this.playSound("game_yxhhh/animation/ld_04.wav");
									})
								})
							})
						})
					})
					break ;
				}
			case "4_1":{
					this.xigua2.visible=false
					this.xigua.visible=true;
					this.xigua.on("mousedown",this,this.xiguaMouseDown);
					this.ld.play("4_2",true);
					this.ani2.visible=true;
					this.ani2.play("4_3",true);
					break ;
				}
			case "5_1":{
					this.ld.play("6_1",false);
					this.playSound("game_yxhhh/animation/ld_07.mp3");
					break ;
				}
			case "6_1":{
					this.ld.play("6_2",true);
					this.ani2.visible=true;
					this.ani2.play("6_3",true);
					this.btn_ok.mouseEnabled=true;
					this.btn_ok.once("click",this,function(){
						_$this.ani2.visible=false;
						_$this.btn_ok.mouseEnabled=false;
						_$this.ld.currAniName='6_4'
						_$this.afterLdPlay()
					})
					break ;
				}
			case "6_4":{
					this.ld.visible=this.ani2.visible=false;
					this.onSkip();
				}
			}
	}

	__proto.xiguaMouseDown=function(){
		this.playSound("share/sound/btn_click.wav");
		this.xiguaInitPos=[this.xigua.x,this.xigua.y];
		this.isDown=true;
		this.on("mouseup",this,this.xiguaMouseUp);
		this.on("mousemove",this,this.xiguaMouseMove);
	}

	__proto.xiguaMouseMove=function(){
		if(this.isDown)
		{this.xigua.pos(this.mouseX,this.mouseY);
			if(this.outBox.hitTestPoint(this.mouseX,this.mouseY))
				this.xiguaMouseUp();
		}
	}

	__proto.xiguaMouseUp=function(){
		var _$this=this;
		this.playSound("share/sound/btn_click.wav");
		if(this.drop_place.hitTestPoint(this.mouseX,this.mouseY)){
			this.xigua.pos(this.drop_place.x,this.drop_place.y);
			this.xigua.mouseEnabled=false;
			this.xing.visible=true;
			this.xing.pos(this.drop_place.x,this.drop_place.y);
			this.xing.play(this.xing.currAniName,false);
			this.xing.once("end",this,function(){
				_$this.ld.play("5_1",false);
				_$this.xigua.visible=false
				_$this.xigua1.visible=true
				_$this.playSound("game_yxhhh/animation/ld_06.wav");
			});
			this.ani2.visible=false;
		}
		else
		this.xigua.pos(this.xiguaInitPos[0],this.xiguaInitPos[1]);
		this.isDown=false;
		this.off("mousemove",this,this.xiguaMouseMove);
		this.off("mouseup",this,this.xiguaMouseUp);
	}

	__proto.addListen=function(){
		this.btn_skip.on("click",this,this.onSkip);
	}

	__proto.onSkip=function(){
		var _$this=this;
		this.timer.clearAll(this)
		this.isSkip=true
		this.ld.stop()
		this.ani2.stop();
		this.zc.stop();
		KlSoundManager.stopAllSound();
		this.btn_skip.visible=false;
		this.box_end.visible=true;
		this.sp_clear.once("click",this,function(){
			KlEventCenter.event("evaGuideNextPage");
		})
		this.sp_again.once("click",this,function(){
			_$this.isSkip=false;
			_$this.resetInGame();
		});
	}

	__getset(0,__proto,'isHideShell',function(){
		return true;
	});

	EvaGuideV4.__init$=function(){{
			SpecialKlViewFactory.regist("evaGuide_v4",EvaGuideV4);
		};;
	}

	return EvaGuideV4;
})(EvaGuideV4UI)


//class com.subject.module.lessonrest.LessonRestView extends com.subject.module.lessonrest.LessonRestViewUI
var LessonRestView=(function(_super){
	function LessonRestView(){
		this.imgUrl="share/lessonRest_bg.jpg";
		this.skeUrl="share/animation/lessonRest/kejian.sk";
		this.bgMusicUrl="share/sound/lessonrest/lessonRest.mp3";
		this.begin001="share/sound/lessonrest/begin001.wav";
		this.begin002="share/sound/lessonrest/begin002.wav";
		this.zhongjianxiuxi="share/sound/lessonrest/zhongjianxiuxi.wav";
		this.end003="share/sound/lessonrest/end003.wav";
		this.isPlayEndSound=false;
		this.mainSke=null;
		this.barWidth=0;
		LessonRestView.__super.call(this);
	}

	__class(LessonRestView,'com.subject.module.lessonrest.LessonRestView',_super);
	var __proto=LessonRestView.prototype;
	__proto.initView=function(){
		this.visible=true;
		this.mouseThrough=false;
		this.mouseEnabled=true;
		this.barWidth=this.imgBar.width;
		this.setBarProgress(0);
		this.setLabTime(0);
		if(this.openParam.type==2){
			this.bgMusicUrl="share/sound/lessonrest/lessonRest60.mp3";
		}
		VipThink.viewMgr.on("mainViewPrepared",this,this.onMainViewPrepared);
		this.openView();
		this.on("click",this,function(){
			console.log("点击课间休息页面");
		})
	}

	__proto.openView=function(){
		VipThink.currView && (VipThink.currView).sleep();
		VipThink.debugLog("LessonRestView","openView");
		this.timerLoop(1000,this,this.onTimer);
		this.visible=true;
		this.imgBg.skin=null;
		this.imgBg.skin=this.imgUrl;
		this.imgBg.autoSize=true;
		if(!this.mainSke){
			this.mainSke=new KlSkeleton(this.skeUrl);
			this.addChild(this.mainSke);
		}
		this.playFly();
		if(VipThink.user.isTech){
			var o={args:{origin:"laya",mainType:2,minorType:"lessonRestViewStatus",data:{act:"open",type:this.openParam.type,page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
			VipThink.nativeAPI.mate(o);
		}
	}

	__proto.playFly=function(){
		var _$this=this;
		this.mainSke.play("fly",true);
		this.mainSke.x=1920;
		this.mainSke.y=550;
		var self=this;
		Tween.to(this.mainSke,{x:1920/2+10,y:550},2000,Ease.backOut,Handler.create(this,function(){
			if(self.openParam.type==2){
				_$this.mainSke.play("001",false);
				KlSoundManager.playSoundUnSync(self.begin001);
				_$this.mainSke.once("stopped",self,function(){
					self.labTime.visible=true;
					self.playLoop();
					KlSoundManager.playMusicUnSync(self.bgMusicUrl);
				});
				}else if(self.openParam.type==1){
				self.labTime.visible=true;
				self.playLoop();
				KlSoundManager.playMusicUnSync(self.bgMusicUrl);
				}else if(self.openParam.type==3){
				_$this.mainSke.play("001",false);
				KlSoundManager.playSoundUnSync(self.begin001);
				self.timerOnce(5000,self,function(){
					self.labTime.visible=true;
					self.playLoop();
					KlSoundManager.playMusicUnSync(self.bgMusicUrl);
				});
				}else if(self.openParam.type==4){
				_$this.mainSke.play("001",false);
				KlSoundManager.playSoundUnSync(self.begin002);
				var otherSet=GlobalModel.otherSetVO.getMyObject();
				var restObj=otherSet.restObj;
				var ts=restObj && restObj.ts;
				var costTime=VipThink.getTime()-ts;
				self.timerOnce(5000,self,function(){
					self.labTime.visible=true;
					self.playLoop();
					if(costTime < 65 *1000){
						self.bgMusicUrl="share/sound/lessonrest/lessonRest60.mp3";
						KlSoundManager.playMusicUnSync(self.bgMusicUrl);
						self.timerOnce(65 *1000,self,function(){
							KlSoundManager.stopMusic(true);
							KlSoundManager.playSoundUnSync(self.zhongjianxiuxi);
						});
						self.timerOnce(70 *1000,self,function(){
							self.bgMusicUrl="share/sound/lessonrest/lessonRest.mp3";
							KlSoundManager.playMusicUnSync(self.bgMusicUrl);
						});
						}else{
						self.bgMusicUrl="share/sound/lessonrest/lessonRest.mp3";
						KlSoundManager.playMusicUnSync(self.bgMusicUrl);
					}
				});
			}
		}));
	}

	__proto.playLoop=function(){
		VipThink.debugLog("LessonRestView","playLoop");
		this.mainSke.offAll("stopped");
		this.mainSke.play("again",true);
	}

	/**
	*更新视图参数
	**/
	__proto.updateParam=function(param){
		if(param=="playClose"){}
			}
	//this.playClose();
	__proto.endHandler=function(){
		VipThink.debugLog("LessonRestView","playClose");
		this.clearTimer(this,this.onTimer);
		KlSoundManager.stopMusic(true);
		if(this.mainSke){
			this.mainSke.offAll("stopped");
			Tween.clearAll(this.mainSke);
			if(this.openParam.type==2){
				this.mainSke.play("003",false);
				var self=this;
				this.mainSke.once("stopped",this,function(){
					ViewUtil.removeView(self);
				});
				}else{
				ViewUtil.removeView(self);
			}
			}else{
			ViewUtil.removeView(self);
		}
	}

	__proto.clear=function(){
		com.biz.ui.LocViewBase.prototype.clear.call(this);
		VipThink.debugLog("LessonRestView","clear");
		var o={args:{origin:"laya",mainType:2,minorType:"lessonRestViewStatus",data:{act:"close",type:this.openParam.type,page:[VipThink.viewMgr.currPageIdx,VipThink.viewMgr.currSubviewIdx]}}};
		VipThink.nativeAPI.mate(o);
		VipThink.viewMgr.off("mainViewPrepared",this,this.onMainViewPrepared);
		if(VipThink.user.isTech){
			ServiceCenter.lessonRestService.noticeCloseLessonRestView();
		}
		if(this.mainSke){
			Tween.clearAll(this.mainSke);
			this.mainSke.offAll("stopped");
			this.mainSke.stop();
			this.mainSke.destroy();
			this.mainSke=null;
		}
		this.clearTimer(this,this.onTimer);
		KlSoundManager.stopMusic(true);
		VipThink.currView && (VipThink.currView).awake();
	}

	__proto.onTimer=function(){
		var otherSet=GlobalModel.otherSetVO.getMyObject();
		var restObj=otherSet.restObj;
		var ts=restObj && restObj.ts;
		var costTime=VipThink.getTime()-ts;
		var type=this.openParam.type;
		if(ts > 0 && !this.isPlayEndSound && (type==3 || type==4)&& (LessonRestService.REST_TIME-costTime <=5000)){
			this.isPlayEndSound=true;
			KlSoundManager.stopMusic(true);
			this.mainSke && this.mainSke.play("001",false);
			KlSoundManager.playSoundUnSync(this.end003);
		}
		if(ts > 0 && costTime > LessonRestService.REST_TIME){
			if(this.parent){
				console.log("时间到了，自己关闭窗口");
				this.setLabTime(0);
				this.setBarProgress(1);
				ViewUtil.removeView(this);
			}
		}
		if(ts > 0 && costTime <=LessonRestService.REST_TIME && costTime > 0){
			var pro=costTime / LessonRestService.REST_TIME;
			var last=((LessonRestService.REST_TIME-costTime)/ 1000)>> 0;
			this.setLabTime(last);
			this.setBarProgress(pro);
		}
	}

	__proto.setBarProgress=function(num){
		num=Math.max(0,num);
		num=Math.min(1,num);
		this.imgMask.width=this.barWidth *num;
		this.imgDian.x=this.imgMask.width-20;
	}

	__proto.setLabTime=function(sec){
		if(sec > 60){
			var min=Math.floor(sec / 60);
			var s=sec % 60;
			this.labTime.text=VipThink.getLanguageText(8,[min,s]);
			}else{
			this.labTime.text=VipThink.getLanguageText(9,[sec]);
		}
	}

	__proto.onMainViewPrepared=function(){
		this.callLater(function(){
			VipThink.currView && (VipThink.currView).sleep();
		})
	}

	LessonRestView.classTryOpen=function(args){
		return true;
	}

	return LessonRestView;
})(LessonRestViewUI)


//class com.subject.module.photowall.PhotoWallView extends com.subject.module.photowall.PhotoWallViewUI
var PhotoWallView=(function(_super){
	function PhotoWallView(){
		this.scaleRatio=1.15;
		this.imgRotation=0;
		this.imgScale=1;
		this.stuId=0;
		this.lastCursor=-1;
		this.mouseDownPoint=null;
		this.boxContainerPoint=null;
		this.mImgToolGray=false;
		/*点赞动画次数 */
		this.giveLikeTimes=0;
		this.skPlaying=false;
		PhotoWallView.__super.call(this);
	}

	__class(PhotoWallView,'com.subject.module.photowall.PhotoWallView',_super);
	var __proto=PhotoWallView.prototype;
	__proto.initView=function(){
		this.imgRotate.on("click",this,this.onRotate);
		this.imgScaleBig.on("click",this,this.onScaleBig);
		this.imgScaleSmall.on("click",this,this.onScaleSmall);
		this.boxComplete.visible=false;
		this.boxWait.visible=false;
		this.boxClock.visible=false;
		this.boxBg.visible=true;
		this.vScrollBar.visible=false;
		this.touchContainer.visible=true;
		this.boxBrush.mouseEnabled=true;
		this.vScrollBar.min=1;
		this.vScrollBar.max=100;
		this.vScrollBar.changeHandler=new Handler(this,this.onScrollChange);
		this.vScrollBar.mouseWheelEnable=false;
		this.vScrollBar.touchScrollEnable=false;
		this.vScrollBar.target=this.touchContainer;
		if (VipThink.user.isTech){
			this.imgTools.visible=true;
			}else {
			this.imgTools.visible=false;
			this.boxContainer.visible=false;
		}
		this.touchContainer.mouseEnabled=false;
		this.boxContainerPoint=new Point(this.boxContainer.x,this.boxContainer.y);
		this.touchContainer.on("mousedown",this,this.onMouseDown);
		this.touchContainer.on("mousemove",this,this.onMouseMove);
		this.touchContainer.on("mouseup",this,this.onMouseUp);
		this.touchContainer.on("mouseout",this,this.onMouseUp);
		this.touchContainer.on("mouseover",this,this.onMouseUp);
		this.sk.on("stopped",this,this.onSkComplete);
		this.updateView();
	}

	__proto.handlerSync=function(args){
		if (args.cmd=="giveLike"){
			if(VipThink.user.isTech){
				this.giveLikeTimes++;
				this.tryPlayGiveLikeAnim();
				}else{
				var photoObj=ServiceCenter.photoWallService.getPhotoObj();
				var serInfo=photoObj.serInfo;
				var selectStu=serInfo.selectStu;
				if(selectStu.stuId==VipThink.user.id){
					this.giveLikeTimes++;
					this.tryPlayGiveLikeAnim();
				}
			}
		}
	}

	__proto.tryPlayGiveLikeAnim=function(){
		if(this.skPlaying)return;
		if(this.giveLikeTimes > 0){
			if(VipThink.user.isTech){
				this.giveLikeTimes--;
				this.playGiveLikeAnim();
				}else{
				var photoObj=ServiceCenter.photoWallService.getPhotoObj();
				var serInfo=photoObj.serInfo;
				var selectStu=serInfo.selectStu;
				if(selectStu.stuId==VipThink.user.id){
					this.giveLikeTimes--;
					this.playGiveLikeAnim();
					}else{
					this.giveLikeTimes=0;
				}
			}
		}
	}

	__proto.playGiveLikeAnim=function(){
		this.sk.stopAtStart();
		this.sk.play("ok",false,true,0);
		this.skPlaying=true;
	}

	__proto.onSkComplete=function(target){
		console.log("动画播放完毕 onSkComplete");
		this.skPlaying=false;
		this.tryPlayGiveLikeAnim();
	}

	__proto.clear=function(){
		com.biz.ui.LocViewBase.prototype.clear.call(this);
		BrushTools.instance.setNodeForHomeWork(null,null,null);
		if (this.lastCursor >-1){
			var cursorBox=VipThink.viewMgr.getCursorBox();
			cursorBox.usefinalStyle=true;
			cursorBox.style=this.lastCursor;
		}
		this.touchContainer.offAll("mousedown");
		this.touchContainer.offAll("mousemove");
		this.touchContainer.offAll("mouseout");
		this.touchContainer.offAll("mouseover");
		this.touchContainer.offAll("mouseup");
	}

	__proto.updateParam=function(param){
		if (param.event=="giveLike"){
			var args={cmd:"giveLike"};
			this.sync(args,true);
			return;
		}
		if (param.event=="keyboardEvent"){
			var cursorBox=VipThink.viewMgr.getCursorBox();
			var type=param.type;
			if (type=="keydown" && this.imgTools.visible && !this.imgTools.disabled){
				cursorBox.usefinalStyle=false;
				this.lastCursor=cursorBox.style;
				cursorBox.style=6;
				console.log(" cursorBox.style =",cursorBox.style);
				this.touchContainer.mouseEnabled=true;
				return;
			}
			if (type=="keyup"){
				if (this.lastCursor >-1){
					cursorBox.usefinalStyle=true;
					cursorBox.style=this.lastCursor;
					this.lastCursor=-1;
				}
				this.touchContainer.mouseEnabled=false;
				return;
			}
		}
		this.updateView();
	}

	__proto.onRotate=function(){
		this.imgRotation+=90;
		this.boxContainer.rotation=this.imgRotation;
		ServiceCenter.photoWallService.updateImgInfo(this.stuId,this.imgScale,this.imgRotation,this.boxContainer.x,this.boxContainer.y);
	}

	__proto.onScaleBig=function(){
		this.imgScale=this.imgScale *this.scaleRatio;
		this.boxContainer.scale(this.imgScale,this.imgScale);
		ServiceCenter.photoWallService.updateImgInfo(this.stuId,this.imgScale,this.imgRotation,this.boxContainer.x,this.boxContainer.y);
	}

	__proto.onScaleSmall=function(){
		this.imgScale=this.imgScale / this.scaleRatio;
		this.boxContainer.scale(this.imgScale,this.imgScale);
		ServiceCenter.photoWallService.updateImgInfo(this.stuId,this.imgScale,this.imgRotation,this.boxContainer.x,this.boxContainer.y);
	}

	__proto.onScrollChange=function(value){}
	/**
	*@Author:Snow
	*@description:更新视图
	*@param {*}
	*@return {*}
	*/
	__proto.updateView=function(){
		var photoObj=ServiceCenter.photoWallService.getPhotoObj();
		var serInfo=photoObj.serInfo;
		var imgInfo=photoObj.imgInfo;
		var stuId=0;
		if (!serInfo){
			if (VipThink.user.isTech){
				stuId=undefined;
				}else {
				stuId=VipThink.user.id;
			}
			}else {
			var selectStu=serInfo.selectStu;
			if (VipThink.user.isTech){
				if (selectStu){
					stuId=selectStu.stuId;
					}else {
					stuId=undefined;
				}
				}else {
				if (serInfo.isInterpret){
					stuId=selectStu.stuId;
					}else if (serInfo.isPrivate){
					if (VipThink.user.id==selectStu.stuId){
						stuId=selectStu.stuId;
						}else {
						stuId=VipThink.user.id;
					}
					}else {
					stuId=VipThink.user.id;
				}
			}
		}
		BrushTools.instance.setNodeForHomeWork(this.boxBrush,selectStu && selectStu.stuId,this.techerBroadcastType());
		if (VipThink.user.isTech){
			this.updateTechView(stuId);
			}else {
			this.updateStuView(stuId);
		}
	}

	__proto.updateStuView=function(stuId){
		var self=this;
		var photoObj=ServiceCenter.photoWallService.getPhotoObj();
		var serInfo=photoObj.serInfo;
		var stuInfo=null;
		var imgInfo=null;
		stuInfo=ServiceCenter.photoWallService.getStuInfo(stuId);
		imgInfo=ServiceCenter.photoWallService.getImgInfo(stuId);
		if (!stuInfo){
			this.boxClock.visible=true;
			this.boxBg.visible=false;
			this.boxWait.visible=false;
			this.boxComplete.visible=false;
			this.boxUnload.visible=false;
			this.imgTools.visible=false;
			return;
		}
		this.imgTools.visible=false;
		this.boxUnload.visible=false;
		var status=stuInfo.status;
		var imgUrl=stuInfo.homeWorkUrl;
		var isTimeEnd=serInfo.isTimeEnd;
		if (this.techerBroadcastType()> 0){
			this.boxClock.visible=false;
			this.boxComplete.visible=false;
			this.boxWait.visible=false;
			this.boxUnload.visible=false;
			}else {
			if (isTimeEnd){
				this.boxComplete.visible=false;
				this.boxWait.visible=false;
				this.boxClock.visible=true;
				}else {
				if (status==4){
					if (stuInfo.editState==3){
						this.boxComplete.visible=true;
						this.boxWait.visible=false;
						this.boxClock.visible=false;
						}else if (stuInfo.editState==2){
						this.boxComplete.visible=false;
						this.boxWait.visible=true;
						this.boxClock.visible=false;
						}else {
						this.boxComplete.visible=false;
						this.boxWait.visible=true;
						this.boxClock.visible=false;
					}
					}else {
					this.boxClock.visible=false;
					this.boxComplete.visible=false;
					this.boxWait.visible=false;
				}
			}
		}
		if (imgUrl){
			this.boxBg.visible=true;
			this.boxContainer.visible=true;
			var tex=Loader.getRes(imgUrl);
			if (!tex){
				Laya.loader.load(imgUrl,Handler.create(this,function(){
					self.realSetSkin(imgUrl);
				}))
				}else {
				self.realSetSkin(imgUrl);
			}
			}else {
			this.boxBg.visible=false;
			this.boxContainer.visible=false;
		}
		if (this.techerBroadcastType()==1 && VipThink.user.id==stuId){
			this.showCanvas(imgInfo);
			}else if (this.techerBroadcastType()==2){
			this.showCanvas(imgInfo);
			}else {
			if (stuInfo.editState==3){
				this.showCanvas(imgInfo);
				BrushTools.instance.correctionCompleted(0);
				}else {
				this.showCanvas();
				BrushTools.instance.correctionCompleted(1);
			}
		}
	}

	__proto.updateTechView=function(stuId){
		var self=this;
		var stuInfo=null;
		var imgInfo=null;
		this.stuId=stuId;
		this.imgTools.visible=true;
		this.imgTools.alpha=1;
		if (!stuId){
			this.boxUnload.visible=true;
			this.txtTips.text="请选择学生"
			this.imgTools.disabled=true;
			this.imgTools.alpha=0.3;
			this.boxContainer.visible=false;
			return;
			}else {
			this.txtTips.text="该学生未提交"
			stuInfo=ServiceCenter.photoWallService.getStuInfo(stuId);
			imgInfo=ServiceCenter.photoWallService.getImgInfo(stuId);
		}
		this.imgTools.disabled=false;
		this.imgTools.alpha=1;
		this.boxComplete.visible=false;
		this.boxWait.visible=false;
		this.boxClock.visible=false;
		var status=stuInfo.status;
		var editState=stuInfo.editState;
		var imgUrl=stuInfo.homeWorkUrl;
		if (status==4){
			this.boxUnload.visible=false;
			this.boxContainer.visible=true;
			this.imgTools.disabled=false;
			this.imgTools.alpha=1;
			if (editState==3 && this.techerBroadcastType()==0){
				this.imgTools.disabled=true;
				this.imgTools.alpha=0.3;
			};
			var tex=Loader.getRes(imgUrl);
			if (!tex){
				Laya.loader.load(imgUrl,Handler.create(this,function(){
					self.realSetSkin(imgUrl);
				}))
				}else {
				self.realSetSkin(imgUrl);
			}
			}else {
			this.boxContainer.visible=false;
			this.boxUnload.visible=true;
			this.imgTools.disabled=true;
			this.imgTools.alpha=0.3;
		}
		this.showCanvas(imgInfo);
	}

	/**
	*@Author:Snow
	*@description:显示画布信息
	*@param {*}
	*@return {*}
	*/
	__proto.showCanvas=function(imgInfo){
		if (!imgInfo){
			this.imgScale=1;
			this.imgRotation=0;
			this.boxContainer.scale(1,1);
			this.boxContainer.rotation=0;
			this.boxContainer.x=960;
			this.boxContainer.y=540;
			}else {
			var ts=VipThink.getTime()-imgInfo.time;
			if (ts > 2000 || !VipThink.user.isTech){
				this.imgScale=imgInfo.scale;
				this.imgRotation=imgInfo.rotation;
				this.boxContainer.scale(imgInfo.scale,imgInfo.scale);
				this.boxContainer.rotation=imgInfo.rotation;
				this.boxContainer.x=imgInfo.x;
				this.boxContainer.y=imgInfo.y;
			}
		}
	}

	/**
	*@Author:Snow
	*@description:实际显示皮肤
	*@param {*}
	*@return {*}
	*/
	__proto.realSetSkin=function(url){
		var tex=Loader.getRes(url);
		if (tex && this.imgPhoto.source !=tex){
			this.imgPhoto.source=tex;
			this.imgPhoto.width=tex.width;
			this.imgPhoto.height=tex.height;
		}
	}

	/**
	*@Author:Snow
	*@description:获取老师广播类型
	*@param {*}
	*@return {*}0 不广播 1 1v1私聊 2全员广播
	*/
	__proto.techerBroadcastType=function(){
		var photoObj=ServiceCenter.photoWallService.getPhotoObj();
		var serInfo=photoObj.serInfo || {};
		if (serInfo.isInterpret){
			return 2;
		}
		if (serInfo.isPrivate){
			return 1;
		}
		return 0;
	}

	// }
	__proto.onMouseDown=function(e){
		this.mouseDownPoint=new Point(Laya.stage.mouseX,Laya.stage.mouseY);
		this.boxContainerPoint=new Point(this.boxContainer.x,this.boxContainer.y);
	}

	__proto.onMouseMove=function(e){
		if (this.mouseDownPoint){
			var offsetX=Laya.stage.mouseX-this.mouseDownPoint.x;
			var offsetY=Laya.stage.mouseY-this.mouseDownPoint.y;
			this.boxContainer.x=this.boxContainerPoint.x+offsetX;
			this.boxContainer.y=this.boxContainerPoint.y+offsetY;
			ServiceCenter.photoWallService.updateImgInfo(this.stuId,this.imgScale,this.imgRotation,this.boxContainer.x,this.boxContainer.y);
		}
	}

	__proto.onMouseUp=function(e){
		this.mouseDownPoint=null;
	}

	/**
	*@Author:Snow
	*@description:设置工具栏是否变灰 如果变灰色 就不能点击使用
	*@param {*}
	*@return {*}
	*/
	__getset(0,__proto,'imgToolGray',function(){
		return this.mImgToolGray;
		},function(v){
		this.mImgToolGray=v;
		if (v){
			this.imgTools.mouseEnabled=false;
			var grayscaleMat=[0.3086,0.6094,0.0820,0,0,0.3086,0.6094,0.0820,0,0,0.3086,0.6094,0.0820,0,0,0,0,0,1,0];
			var grayscaleFilter=new ColorFilter(grayscaleMat);
			this.imgTools.filters=[grayscaleFilter];
			}else {
			this.imgTools.mouseEnabled=true;
			this.imgTools.filters=[];
		}
	});

	return PhotoWallView;
})(PhotoWallViewUI)


//class com.subject.module.treasurebox.TreasureBoxView extends com.subject.module.treasurebox.TreasureBoxViewUI
var TreasureBoxView=(function(_super){
	function TreasureBoxView(){
		this.resGroup="treasureBox";
		this.selectIndex=-1;
		this.getStarNum=0;
		this.bgMusicUrl="share/sound/treasureBox/bg.mp3";
		this.boomSoundUrl="share/sound/treasureBox/boom.mp3";
		this.playTarget=null;
		TreasureBoxView.__super.call(this);
	}

	__class(TreasureBoxView,'com.subject.module.treasurebox.TreasureBoxView',_super);
	var __proto=TreasureBoxView.prototype;
	__proto.initView=function(){
		VipThink.debugLog("TreasureBoxView","initView","打开宝箱页面");
		this.setMouse(true);
		this.mouseThrough=false;
		this.size(Klzz.designWidth,Klzz.designHeight);
		VipThink.currView && (VipThink.currView).sleep();
		KlSoundManager.playMusicUnSync(this.bgMusicUrl);
		this.anchorX=0.5;
		this.anchorY=0.5;
		this.x=this.width / 2;
		this.y=this.height / 2;
		this.aniBox0.stop();
		this.aniBox1.stop();
		this.aniBox2.stop();
		this.btn0.on("click",this,this.onBoxClick,[0]);
		this.btn1.on("click",this,this.onBoxClick,[1]);
		this.btn2.on("click",this,this.onBoxClick,[2]);
	}

	/**清理 **/
	__proto.clear=function(){
		com.biz.ui.LocViewBase.prototype.clear.call(this);
		this.playTarget && this.playTarget.offAll("stopped");
		KlSoundManager.stopMusic(true);
		VipThink.currView && (VipThink.currView).awake();
		this.setMouse(false);
		VipThink.debugLog("TreasureBoxView","clear","关闭宝箱页面");
	}

	__proto.onBoxClick=function(index){
		KlSoundManager.stopMusic(true);
		this.selectIndex=index;
		var totalScore=0;
		totalScore=(VipThink.user).totalScore || 0;
		var lastStar=50-totalScore;
		if (lastStar > 6){
			this.getStarNum=2+(Math.random()*4)>> 0;
			}else if (lastStar > 0){
			this.getStarNum=1+(Math.random()*lastStar)>> 0;
			}else {
			this.getStarNum=0;
		}
		if (Math.random()>=0.5){
			this.getStarNum=0;
		}
		console.log("奖励星星数量",this.getStarNum);
		this.handlerSelectBox(index);
		var data={eventName:"treasureBox_student",
			param:{
				click_time:VipThink.getTime()+"",
				studentId:VipThink.user.id,
				coursewareID:CourseDataUtil.goClassData.chapterId+"",
				courseCategoryId:CourseDataUtil.goClassData.courseCategoryId,
				coursewareCode:VipThink.courseID,
				zbjRoomId:CourseDataUtil.goClassData.liveId+""
		}}
		Reporter.reportData(3,data,null,true);
	}

	__proto.handlerSelectBox=function(index){
		this.aniBtn0.visible=false;
		this.aniBtn1.visible=false;
		this.aniBtn2.visible=false;
		this.btn0.visible=false;
		this.btn1.visible=false;
		this.btn2.visible=false;
		var target=this["aniBox"+index];
		target.skeSkin=this.getStarNum+"";
		target.visible=true;
		target.alpha=1;
		target.once("stopped",this,this.onSkComplete,[target]);
		if (this.getStarNum==0){
			target.play("open2",false);
			KlSoundManager.playSoundUnSync(this.boomSoundUrl);
			}else {
			target.play("open",false);
		}
		this.playTarget=target;
		this.mouseEnabled=false;
	}

	__proto.onSkComplete=function(target){
		var _$this=this;
		this.playTarget=null;
		var self=this;
		this.noticeTeacher();
		Tween.to(target,{scaleX:1.2,scaleY:1.2},200,Ease.backInOut,Handler.create(this,function(){
			Tween.to(_$this.boxAni,{scaleX:0.1,scaleY:0.1},500,Ease.backInOut,Handler.create(self,function(){
				console.log("效果播放完毕");
				ViewUtil.removeView(self);
			}));
		}));
	}

	__proto.noticeTeacher=function(){
		var args={sid:VipThink.user.id,cmd:"addScore",num:this.getStarNum};
		this.sync(args,false);
	}

	__proto.setMouse=function(v){
		var box=VipThink.viewMgr.getCursorBox();
		if (box){
			box.sysMouseVisible=v;
			box.trackMouse=!v;
		}
	}

	TreasureBoxView.classTryOpen=function(){
		if (VipThink.user.isStu){
			return true;
		}
		return false;
	}

	TreasureBoxView.classHandlerSync=function(args){
		console.debug("TreasureBoxView classHandlerSync",args);
		var cmd=args && args.cmd;
		if (cmd=="addScore" && VipThink.user.isTech){
			var sid=args.sid;
			var num=args.num || 0;
			ServiceCenter.treasureBoxService.sendMsgAddStar(sid,num,"treasureBox",{state:1});
		}
	}

	TreasureBoxView.classTryClose=function(args){}
	return TreasureBoxView;
})(TreasureBoxViewUI)


//class com.subject.module.functionshell.ClockTrainView extends com.subject.module.functionshell.AppletView
var ClockTrainView=(function(_super){
	function ClockTrainView(){
		ClockTrainView.__super.call(this);
	}

	__class(ClockTrainView,'com.subject.module.functionshell.ClockTrainView',_super);
	var __proto=ClockTrainView.prototype;
	__proto.createChildren=function(){
		this.name="clockTrain";
		this.TAG="ClockTrainView";
		this.AUTO_PLAY_SOUND=true;
		com.subject.module.functionshell.BaseEvaluationView.prototype.createChildren.call(this);
	}

	// }
	__getset(0,__proto,'completeSound',function(){
		return "share/sound/clockTrain_complete.wav";
	});

	__getset(0,__proto,'notInterface',function(){
		var page=VipThink.viewMgr.currPage.currView;
		return ! Laya.__typeof(page,'com.biz.ui.IClockTrain');
	});

	__getset(0,__proto,'submitData',function(){
		var v=VipThink.viewMgr.currPage.currView;
		if(!v)
			return {};
		return {
			userId:EvaModel.data.userId,
			taskId:EvaModel.data.taskId,
			level:VipThink.viewMgr.currPageIdx+1,
			status:v.result==null || v.result==false ? 0 :1
		};
	});

	__getset(0,__proto,'timeToExist',function(){
		return 5000;
	});

	__getset(0,__proto,'donePageTitle',function(){
		return "恭喜你每日一练打卡成功。";
	});

	__getset(0,__proto,'donePageDesc',function(){
		return "坚持就是胜利哟！";
	});

	ClockTrainView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_CLOCK_TRAIN,ClockTrainView);
		}
	}

	return ClockTrainView;
})(AppletView)


//class com.subject.module.functionshell.NewSpeciaSubjectEvaView extends com.subject.module.functionshell.SpeciaSubjectEvaView
var NewSpeciaSubjectEvaView=(function(_super){
	function NewSpeciaSubjectEvaView(){
		NewSpeciaSubjectEvaView.__super.call(this);
		this.setOpenTitleNumVisible(1);
		this.onControlQid();
		KlEventCenter.on("BalanceAniCompleteNewSpecialEvaluation",this,this.onBalanceAniComplete);
	}

	__class(NewSpeciaSubjectEvaView,'com.subject.module.functionshell.NewSpeciaSubjectEvaView',_super);
	var __proto=NewSpeciaSubjectEvaView.prototype;
	__proto.submit=function(v,needToSubmit){
		(needToSubmit===void 0)&& (needToSubmit=true);
		KlEventCenter.event("SubmitAnswerNewSpecialEvaluation");
		com.subject.module.functionshell.BaseEvaluationView.prototype.submit.call(this,v,needToSubmit);
	}

	__proto.nextPage=function(){
		KlEventCenter.event("SubmittedAnswerNewSpecialEvaluation");
	}

	/**
	*
	*
	*/
	__proto.finish=function(){
		this.mouseEnabled=false;
		KlEventCenter.event("FinishedNewSpecialEvaluation");
	}

	/**
	*截图，pc，android，ios都采用laya截屏功能来实现截图
	*/
	__proto.captureScreen=function(truePageIdx,currPageIdx,data){
		VipThink.nativeAPI.captureScreen("evaluation/"+truePageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data,iosCaptureByNative:false}});
	}

	__proto.onBalanceAniComplete=function(){
		this.onComplete();
	}

	NewSpeciaSubjectEvaView.__init$=function(){{
			FunctionShellViewFactory.regist(FunctionShellViewFactory.TYPE_NEW_SPECIAL_SUBJECT_EVA,NewSpeciaSubjectEvaView);
		}
	}

	return NewSpeciaSubjectEvaView;
})(SpeciaSubjectEvaView)


	Laya.__init([SubjectViewManagerImpl,ClockTrainView,GdEvaView,ParkResultView,EvaGuide,ExamView,KpUpgradeView,AfterClassPracticeView,NewSpeciaSubjectEvaView,GraduationView,RushResultView,JLReviewSecondView,ReviewLessonView,LittleTeacherView,BeforeLessonView,JLReviewLessonView,RushView,SpeciaSubjectEvaView,BabyEvaView,EvaGuideV4,SubjectServiceCenter,HomeWorkOnlineView,LightLessonView,StageEvaView,AfterLessonView,AscendCeremonyV3,LightOpenView,RecordLastLevelView,DefaultToast$1,ParkManager$1,SubjectVipThink]);
})(window,document,Laya);

if (typeof define === 'function' && define.amd){
	define('laya.core', ['require', "exports"], function(require, exports) {
        'use strict';
        Object.defineProperty(exports, '__esModule', { value: true });
        for (var i in Laya) {
			var o = Laya[i];
            o && o.__isclass && (exports[i] = o);
        }
    });
}