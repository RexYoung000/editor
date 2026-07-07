
(function(window,document,Laya){
	var __un=Laya.un,__uns=Laya.uns,__static=Laya.static,__class=Laya.class,__getset=Laya.getset,__newvec=Laya.__newvec;

	var Box=laya.ui.Box,Browser=laya.utils.Browser,CourseDataUtil=com.klzz.utils.CourseDataUtil,CourseType=com.klzz.game.CourseType;
	var EvaModel=com.biz.model.EvaModel,Event=laya.events.Event,EventDispatcher=laya.events.EventDispatcher,ExtendCMDNames=com.biz.extend.ExtendCMDNames;
	var ExtendConst=com.biz.extend.ExtendConst,ExtendEventNames=com.biz.extend.ExtendEventNames,ExtendModuleNames=com.biz.extend.ExtendModuleNames;
	var FontClip=laya.ui.FontClip,Handler=laya.utils.Handler,Image=laya.ui.Image,KlEventCenter=com.klzz.game.KlEventCenter;
	var KlSkeleton=com.klzz.ui.KlSkeleton,KlSkeleton1=com.klzz.ui.KlSkeleton1,KlView=com.klzz.ui.KlView,Label=laya.ui.Label;
	var Loader=laya.net.Loader,MyViewManager=com.biz.ui.MyViewManager,NativeCommandType=com.biz.native.NativeCommandType;
	var Point=laya.maths.Point,Reporter=com.biz.common.Reporter,Skeleton=laya.ani.bone.Skeleton,Sprite=laya.display.Sprite;
	var StringUtil=com.klzz.utils.StringUtil,Tween=laya.utils.Tween,UIConst=com.biz.ui.UIConst,View=laya.ui.View;
	var ViewEvent=com.biz.ui.ViewEvent,VipThink=com.biz.VipThink;
//class com.extend.core.ui.ViewStatus
var ViewStatus=(function(){
	function ViewStatus(){}
	__class(ViewStatus,'com.extend.core.ui.ViewStatus');
	ViewStatus.NONE=0;
	ViewStatus.INIT=1;
	ViewStatus.LOADING=2;
	ViewStatus.STRUCTURE=3;
	ViewStatus.COMPLETE=4;
	return ViewStatus;
})()


/**
*互动课堂模块内部事件定义
*@author admin
*
*/
//class com.extend.module.interactionClass.InteractionClassInnerEvents
var InteractionClassInnerEvents=(function(){
	function InteractionClassInnerEvents(){}
	__class(InteractionClassInnerEvents,'com.extend.module.interactionClass.InteractionClassInnerEvents');
	InteractionClassInnerEvents.XiaoFeiXiaFeedbackSkMovieClipEnd="XiaoFeiXiaFeedbackSkMovieClipEnd";
	return InteractionClassInnerEvents;
})()


//class com.extend.module.interactionClass.InteractionClassNoticeNames
var InteractionClassNoticeNames=(function(){
	function InteractionClassNoticeNames(){}
	__class(InteractionClassNoticeNames,'com.extend.module.interactionClass.InteractionClassNoticeNames');
	InteractionClassNoticeNames.LN_NOTICE_INTERACTIVE_CLASS="interactiveClass";
	InteractionClassNoticeNames.ACT_ADD_STAR="addStar";
	InteractionClassNoticeNames.ACT_NEXT_PAGE="nextPage";
	InteractionClassNoticeNames.ACT_COURSE_CFG="courseCfg";
	InteractionClassNoticeNames.ACT_COMPLETE="complete";
	return InteractionClassNoticeNames;
})()


//class com.extend.module.littlePeaPK.data.AnswerOneQuestionData
var AnswerOneQuestionData=(function(){
	function AnswerOneQuestionData(){
		this.result=0;
		//对还是错（取值查看ExtendConst）
		this.time=0;
	}

	__class(AnswerOneQuestionData,'com.extend.module.littlePeaPK.data.AnswerOneQuestionData');
	return AnswerOneQuestionData;
})()


//class com.extend.module.littlePeaPK.data.LittlePeaPKDataMgr
var LittlePeaPKDataMgr=(function(){
	function LittlePeaPKDataMgr(){
		this.readTitleTime=0;
		//读题时间（也就是题目语音时长，目前是6秒）
		this.curQuestionIdx=0;
		// private var haveSelfSubmittedQuestionIdx:int;
		this._haveAISubmittedCurQuestionAnswer=false;
		//AI是否已经提交当前题目答案
		this._haveSelfSubmittedCurQuestionAnswer=false;
		//自己是否已经提交当前题目答案
		this.bAIAnswerAniComplete=false;
		//AI答题反馈动画播放完成
		this.bSelfAnswerAniComplete=false;
		//自己答题反馈动画播放完成
		this.aiQuestionsDatas=null;
		//AI所有题目答题数据（每题对错和答题时间）
		this.selfQuestionDatas=null;
		this.readTitleTime=6;
		this.curQuestionIdx=-1;
		this.haveAISubmittedCurQuestionAnswer=false;
		this.haveSelfSubmittedCurQuestionAnswer=false;
		this.selfQuestionDatas=[];
	}

	__class(LittlePeaPKDataMgr,'com.extend.module.littlePeaPK.data.LittlePeaPKDataMgr');
	var __proto=LittlePeaPKDataMgr.prototype;
	__proto.getReadTitleTime=function(){
		return this.readTitleTime;
	}

	__proto.nextQuestion=function(){
		this.curQuestionIdx++;
	}

	__proto.getCurQuestionIdx=function(){
		return this.curQuestionIdx;
	}

	__proto.createAIData=function(){
		this.aiQuestionsDatas=[];
		var minCorrectRate=0.3;
		var maxCorrectRate=0.4;
		var correctRate=minCorrectRate+Math.random()*(maxCorrectRate-minCorrectRate);
		var correctQuestionNum=Math.round(12 *correctRate);
		console.log("初步计算correctQuestionNum=%d",correctQuestionNum);
		if(correctQuestionNum < minCorrectRate *12){
			correctQuestionNum=Math.ceil(minCorrectRate *12);
			}else if(correctQuestionNum > maxCorrectRate *12){
			correctQuestionNum=Math.floor(maxCorrectRate *12);
		}
		console.log("最终计算correctQuestionNum=%d",correctQuestionNum);
		var overTimeRate=0.2;
		var overTimeQuestionNum=Math.floor(overTimeRate *12);
		var readTimeOneQuestion=this.readTitleTime;
		var answerTimeOneQuestion=0;
		var minPercent=0.1;
		var maxPercent=0.9;
		var answerOneQuestionData;
		var arrAllQuestionsData=[];
		for(var i=0;i < correctQuestionNum;i++){
			answerOneQuestionData=new AnswerOneQuestionData();
			answerTimeOneQuestion=Math.round(readTimeOneQuestion+(Math.random()*(0.9-0.1)+0.1)*(30-readTimeOneQuestion));
			answerOneQuestionData.result=1;
			answerOneQuestionData.time=answerTimeOneQuestion;
			arrAllQuestionsData.push(answerOneQuestionData);
		};
		var arrWrongQuestionsData=[];
		for(;i < 12;i++){
			answerOneQuestionData=new AnswerOneQuestionData();
			answerOneQuestionData.result=2;
			answerTimeOneQuestion=readTimeOneQuestion+(Math.random()*(0.9-0.1)+0.1)*(30-readTimeOneQuestion);
			answerOneQuestionData.time=answerTimeOneQuestion;
			arrWrongQuestionsData.push(answerOneQuestionData);
		};
		var overTimeQuestionIdx=0;
		for(i=0;i < overTimeQuestionNum;i++){
			overTimeQuestionIdx=Math.floor(Math.random()*arrWrongQuestionsData.length);
			answerOneQuestionData=arrWrongQuestionsData [overTimeQuestionIdx];
			if(answerOneQuestionData){
				answerOneQuestionData.time=30+1;
			}
			arrWrongQuestionsData.splice(overTimeQuestionIdx,1);
			arrAllQuestionsData.push(answerOneQuestionData);
		}
		arrAllQuestionsData=arrAllQuestionsData.concat(arrWrongQuestionsData);
		while(arrAllQuestionsData.length > 0){
			var randIdx=Math.floor(Math.random()*arrAllQuestionsData.length);
			this.aiQuestionsDatas.push(arrAllQuestionsData[randIdx]);
			arrAllQuestionsData.splice(randIdx,1);
		}
	}

	__proto.getAIAllQuestionData=function(){
		if(!this.aiQuestionsDatas){
			this.createAIData();
		}
		return this.aiQuestionsDatas;
	}

	__proto.getAIOneAnswerQuestionData=function(index){
		if(index >=0 && index < this.aiQuestionsDatas.length){
			var data=this.aiQuestionsDatas[index];
			return data;
			}else{
			console.error("获取AI答题数据: 下标%d 错误",index);
			return null;
		}
	}

	/**
	*
	*@param data 答题数据
	*@param index 答题序号
	*@return
	*
	*/
	__proto.pushSelfQuestionData=function(data,index){
		(index===void 0)&& (index=undefined);
		if(index >=0){
			if(this.selfQuestionDatas[index]){
				console.error("已经有答题数据: 下标",index);
			}
			this.selfQuestionDatas[index]=data;
			}else{
			this.selfQuestionDatas.push(data);
		}
		return data;
	}

	__proto.getSelfOneAnswerQuestionData=function(index){
		if(index >=0 && index < this.selfQuestionDatas.length){
			var data=this.selfQuestionDatas[index];
			return data;
			}else{
			console.error("获取self答题数据: 下标%d 错误",index);
			return null;
		}
	}

	__proto.getSelfQuestionDatas=function(){
		return this.selfQuestionDatas;
	}

	__proto.resetHaveSubmitCurQuestionAnswer=function(){
		this.haveAISubmittedCurQuestionAnswer=false;
		this.haveSelfSubmittedCurQuestionAnswer=false;
	}

	__proto.isAllHaveSubmitCurQuestion=function(){
		return this.haveAISubmittedCurQuestionAnswer && this.haveSelfSubmittedCurQuestionAnswer;
	}

	__proto.getAICurCorrectQuestionNum=function(){
		return this.getOnePersonCurCorrectQuestionNum(this.aiQuestionsDatas);
	}

	__proto.getSelfCurCorrectQuestionNum=function(){
		return this.getOnePersonCurCorrectQuestionNum(this.selfQuestionDatas);
	}

	__proto.getOnePersonCurCorrectQuestionNum=function(datas){
		var correctNum=0;
		var data=null;
		for(var i=0;i < datas.length && i <=this.curQuestionIdx;i++){
			data=datas[i];
			if(data && 1==data.result){
				correctNum++;
			}
		}
		return correctNum;
	}

	__proto.isLastQuestion=function(){
		return this.curQuestionIdx==12-1;
	}

	// return this.curQuestionIdx==1;//todo for test
	__proto.getQuestionNum=function(){
		var num=VipThink.config.courseCfg.pages.length;
		num=VipThink.viewMgr.viewCfgList.length;
		return num;
	}

	__proto.resetAnswerAniComplete=function(){
		this.bAIAnswerAniComplete=false;
		this.bSelfAnswerAniComplete=false;
	}

	__proto.aiAnswerAniComplete=function(){
		this.bAIAnswerAniComplete=true;
	}

	__proto.selfAnswerAniComplete=function(){
		this.bSelfAnswerAniComplete=true;
	}

	__proto.isAllAnswerAniComplete=function(){
		return this.bAIAnswerAniComplete && this.bSelfAnswerAniComplete;
	}

	__getset(0,__proto,'haveAISubmittedCurQuestionAnswer',function(){
		return this._haveAISubmittedCurQuestionAnswer;
		},function(value){
		this._haveAISubmittedCurQuestionAnswer=value;
	});

	__getset(0,__proto,'haveSelfSubmittedCurQuestionAnswer',function(){
		return this._haveSelfSubmittedCurQuestionAnswer;
		},function(value){
		this._haveSelfSubmittedCurQuestionAnswer=value;
	});

	LittlePeaPKDataMgr.ANSWER_ONE_QUESTION_MAX_TIME=30;
	LittlePeaPKDataMgr.QUESTION_NUM=12;
	return LittlePeaPKDataMgr;
})()


//class com.extend.module.littlePeaPK.LittlePeaPKNoticeNames
var LittlePeaPKNoticeNames=(function(){
	function LittlePeaPKNoticeNames(){}
	__class(LittlePeaPKNoticeNames,'com.extend.module.littlePeaPK.LittlePeaPKNoticeNames');
	LittlePeaPKNoticeNames.LN_LITTLE_PEA_PK="LittlePeaPK";
	LittlePeaPKNoticeNames.ACT_SUBMIT_ANSWER_DATA="submitAnswerData";
	LittlePeaPKNoticeNames.ACT_COURSE_CFG="courseCfg";
	LittlePeaPKNoticeNames.ACT_COMPLETE="complete";
	return LittlePeaPKNoticeNames;
})()


/**
*
*@author snow
*SDK扩展 模块启动类
*/
//class com.extend.VipThinkExtend
var VipThinkExtend=(function(){
	function VipThinkExtend(){}
	__class(VipThinkExtend,'com.extend.VipThinkExtend');
	VipThinkExtend.initModule=function(moduleName,args){
		var cla=VipThinkExtend.mModuleClassMap[moduleName];
		if(cla){
			var instance=new cla();
			instance.init(moduleName,args);
			VipThinkExtend.mInstanceVector.push(instance);
			}else{
			console.error("未注册的模块:"+moduleName+"模块文件需要加强制编译");
			console.debug("未注册的模块:"+moduleName+"模块文件需要加强制编译");
		}
		return true;
	}

	VipThinkExtend.regModule=function(moduleName,moduleCla){
		VipThinkExtend.mModuleClassMap[moduleName]=moduleCla;
	}

	VipThinkExtend.onNativeCallLaya=function(type,data){
		for (var i=0;i < VipThinkExtend.mInstanceVector.length;i++){
			VipThinkExtend.mInstanceVector[i].onNativeCallLaya(type,data);
		}
	}

	VipThinkExtend.onCallSDKExtend=function(cmd,__args){
		var args=[];for(var i=1,sz=arguments.length;i<sz;i++)args.push(arguments[i]);
		for (var i=0;i < VipThinkExtend.mInstanceVector.length;i++){
			VipThinkExtend.mInstanceVector[i].onCallSDKExtend(cmd,...args);
		}
	}

	VipThinkExtend.mModuleClassMap={};
	VipThinkExtend.mInstanceVector=[];
	VipThinkExtend.__init$=function(){{
			Browser.window.VipThinkExtend=VipThinkExtend;
		};
	}

	return VipThinkExtend;
})()


/**
*纯逻辑模块，模块自身没有添加ui或者view，但是可以操作相关的ui或者view
*@author benson
*
*/
//class com.extend.module.BasePureModule extends laya.events.EventDispatcher
var BasePureModule=(function(_super){
	function BasePureModule(){
		this.mModuleName=null;
		// ActionScript file
		this.cmdMap={};
		BasePureModule.__super.call(this);
	}

	__class(BasePureModule,'com.extend.module.BasePureModule',_super);
	var __proto=BasePureModule.prototype;
	__proto.init=function(moduleName,args){
		this.mModuleName=moduleName;
	}

	/**
	*发送信息到原生
	*@param data 消息包
	*@param handler
	*
	*/
	__proto.noticeNative=function(data,handler){
		VipThink.nativeAPI.noticeNative(data,handler);
	}

	/**
	*原生通知laya
	*@param type
	*@param data
	*
	*/
	__proto.onNativeCallLaya=function(type,data){}
	/**
	*内部调用命令
	*@param cmd
	*@param data
	*@param complete
	*
	*/
	__proto.onCallSDKExtend=function(cmd,__args){
		var args=[];for(var i=1,sz=arguments.length;i<sz;i++)args.push(arguments[i]);
		var info=this.cmdMap[cmd];
		if(info){
			var thisObj=info.thisObj;
			var fun=info.fun;
			var once=info.once
			fun.apply(thisObj,args);
			if(once){
				delete this.cmdMap[cmd];
			}
		}
	}

	__proto.onCmd=function(cmd,thisObj,fun){
		var info=this.cmdMap[cmd];
		if(!info){
			info={};
		}
		info.thisObj=thisObj;
		info.fun=fun;
		this.cmdMap[cmd]=info;
	}

	__proto.onceCmd=function(cmd,thisObj,fun){
		var info=this.cmdMap[cmd];
		if(!info){
			info={};
		}
		info.thisObj=thisObj;
		info.fun=fun;
		info.once=true;
		this.cmdMap[cmd]=info;
	}

	__proto.offCmd=function(cmd){
		delete this.cmdMap[cmd];
	}

	/**
	*添加内部事件监听，内部是指当前这个modual包含的viewContainer，逻辑类（如modual的成员变量viewContainer）
	*@param type
	*@param caller
	*@param listener
	*@param args
	*
	*/
	__proto.addEvent=function(type,caller,listener,args){
		this.on(type,caller,listener,args);
	}

	/**
	*派发事件
	*@param type
	*@param data
	*
	*/
	__proto.dispatchEvent=function(type,data){
		this.event(type,data);
	}

	/**
	*添加内部一次性事件监听
	*@param type
	*@param caller
	*@param listener
	*@param args
	*
	*/
	__proto.addOnceEvent=function(type,caller,listener,args){
		this.once(type,caller,listener,args);
	}

	/**
	*移除内部事件监听
	*@param type
	*@param caller
	*@param listener
	*@param onceOnly
	*
	*/
	__proto.removeEvent=function(type,caller,listener,onceOnly){
		(onceOnly===void 0)&& (onceOnly=false);
		this.off(type,caller,listener,onceOnly);
	}

	__getset(0,__proto,'moduleName',function(){
		return this.mModuleName;
	});

	return BasePureModule;
})(EventDispatcher)


/**
*试听课前体验模块
*@author benson(王彬)
*
*/
//class com.extend.module.activityBeforeClass.ActivityBeforeClassModule extends com.extend.module.BasePureModule
var ActivityBeforeClassModule=(function(_super){
	function ActivityBeforeClassModule(){
		this.DURATION_OF_SINGLE_PREVIEW="durationOfSinglePreview";
		this.EVENT_ANSWER_FACE="showAnswerFace";
		ActivityBeforeClassModule.__super.call(this);
	}

	__class(ActivityBeforeClassModule,'com.extend.module.activityBeforeClass.ActivityBeforeClassModule',_super);
	var __proto=ActivityBeforeClassModule.prototype;
	__proto.init=function(moduleName,args){
		_super.prototype.init.call(this,moduleName,args);
		this.onCmd("feedback",this,this.onFeedBackHandle);
		KlEventCenter.on("NextViewActivityBeforeClass",this,this.onNextView);
		KlEventCenter.on("videoEnd",this,this.onNextView);
		VipThink.viewMgr.on("changed",this,this.onPageChaged);
	}

	// VipThink.viewMgr.feedBackView.on(EVENT_ANSWER_FACE,this,onNextView);
	__proto.onFeedBackHandle=function(action){
		if("ActionFinish"==action){
			this.onNextView();
		}
	}

	__proto.onPageChaged=function(oIdxp,oIdxv,idxp,idxv,force){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var curPageIdx=VipThink.viewMgr.currPageIdx;
		var curSubViewIdx=VipThink.viewMgr.currSubviewIdx;
		console.log("onPageChaged curPageIdx:%d, curSubViewIdx:%d",curPageIdx,curSubViewIdx);
		var o=null;
		if(0==curPageIdx){
			this.submitBuryPointBeforeClass();
		}
		if(curPageIdx==pageNum-1){
			this.submitBuryPointFinishClass();
			o={args:{origin:"laya",mainType:2,minorType:"beforeClassFinish"}};
			VipThink.nativeAPI.mate(o);
		}
		o={args:{origin:"laya",mainType:2,minorType:"beforeClassPages",data:curPageIdx+1}};
		VipThink.nativeAPI.mate(o);
	}

	__proto.onNextView=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(subjNum > 1 && currSubjIndex < subjNum-1){
			VipThink.viewMgr.currSubviewIdx++;
			console.debug("BeforeClassModule自动跳到下一题 SubviewIdx:%d",VipThink.viewMgr.currSubviewIdx);
			}else{
			VipThink.viewMgr.currPageIdx++;
			console.debug("BeforeClassModule自动跳到下一关 PageIndex:%d",VipThink.viewMgr.currPageIdx);
		}
	}

	// 提交埋点
	__proto.submitBuryPointBeforeClass=function(){
		var data={
			eventName:"Start_Process_BeforeClass",
			param:{
				course_type:this.courseType,
				courseCategory:this.courseCategory+"",
				courseName:this.chapterName+"",
				courseStep:this.courseStep+"",
				courseID:this.liveId+""
			}
		}
		Reporter.reportData(3,data);
		console.debug("BeforeClassModule submitBuryPoint 埋点名称:Start_Process_BeforeClass"+" 提交埋点数据："+JSON.stringify(data));
	}

	// 提交埋点
	__proto.submitBuryPointFinishClass=function(){
		var data={
			eventName:"Finish_Process_BeforeClass",
			param:{
				course_type:this.courseType,
				courseCategory:this.courseCategory+"",
				courseName:this.chapterName+"",
				courseStep:this.courseStep+"",
				courseID:this.liveId+"",
				PageNumber_Total:VipThink.config.courseCfg.pages.length+""
			}
		}
		Reporter.reportData(3,data);
		console.debug("BeforeClassModule submitBuryPoint 埋点名称:Finish_Process_BeforeClass"+" 提交埋点数据："+JSON.stringify(data));
	}

	/**
	*
	*
	*课程课类（启动参数获取）
	*/
	__getset(0,__proto,'courseCategory',function(){
		return CourseDataUtil.goClassData.courseCategory ? CourseDataUtil.goClassData.courseCategory :"";
	});

	/**
	*
	*
	*课程类型（启动参数获取）
	*/
	__getset(0,__proto,'courseType',function(){
		console.debug("courseType:"+CourseDataUtil.goClassData.courseType);
		return !isNaN(CourseDataUtil.goClassData.courseType)? CourseDataUtil.goClassData.courseType :-1;
	});

	/**
	*课件名称
	*/
	__getset(0,__proto,'chapterName',function(){
		return CourseDataUtil.goClassData.courseName ? CourseDataUtil.goClassData.courseName :"";
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

	ActivityBeforeClassModule.__init$=function(){{
			VipThinkExtend.regModule("activity_before_class",ActivityBeforeClassModule);
		};
	}

	return ActivityBeforeClassModule;
})(BasePureModule)


//class com.extend.module.BaseModule extends com.extend.module.BasePureModule
var BaseModule=(function(_super){
	function BaseModule(){
		this.mArgs=null;
		this._$2_cmdMap={};
		this.toLoadArray=[];
		this.resLoadingDic={};
		this.resLoadedDic={};
		///基础资源列表
		this.baseResArray=[];
		BaseModule.__super.call(this);
	}

	__class(BaseModule,'com.extend.module.BaseModule',_super);
	var __proto=BaseModule.prototype;
	__proto.init=function(moduleName,args){
		this.mModuleName=moduleName;
		this.mArgs=args;
		this.loadBaseRes();
	}

	__proto.clear=function(){}
	/////////////////////////////////加载code start//////////////////////////////////////
	__proto.load=function(url,complete,errorHandler){
		Laya.loader.load(url,complete);
	}

	// }
	__proto.loadAsset=function(url,complete){}
	__proto.loadAssets=function(list,complete){}
	/**
	*清理资源
	*@param res
	*
	*/
	__proto.clearRes=function(res){}
	///////////////////////////////////////UI相关/////////////////////////////////////
	__proto.loadBaseRes=function(){
		if(this.baseResArray && this.baseResArray.length){
			Laya.loader.load(this.baseResArray,Handler.create(this,this.onLoadBaseResComplete));
			}else{
			this.onLoadBaseResComplete();
		}
	}

	__proto.onLoadBaseResComplete=function(){
		this.initContenters();
	}

	/**
	*初始化所有的容器
	*重写这个方法实现UI的布局
	*
	*/
	__proto.initContenters=function(){}
	__getset(0,__proto,'args',function(){
		return this.mArgs;
	});

	return BaseModule;
})(BasePureModule)


/**
*入门课课堂学习模块，负责切页和所有页做完后的提示
*@author benson
*
*/
//class com.extend.module.ruMenKe.RuMenKeAIRecordModule extends com.extend.module.BasePureModule
var RuMenKeAIRecordModule=(function(_super){
	function RuMenKeAIRecordModule(){
		RuMenKeAIRecordModule.__super.call(this);
	}

	__class(RuMenKeAIRecordModule,'com.extend.module.ruMenKe.RuMenKeAIRecordModule',_super);
	var __proto=RuMenKeAIRecordModule.prototype;
	__proto.init=function(moduleName,args){
		_super.prototype.init.call(this,moduleName,args);
		this.onCmd("finish_this_page",this,this.onFinshThisPage);
	}

	__proto.onFinshThisPage=function(){
		this.nextPage();
	}

	__proto.nextPage=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(subjNum > 1 && currSubjIndex < subjNum-1){
			VipThink.viewMgr.currSubviewIdx++;
			console.debug("RuMenKeModule自动跳到下一题 SubviewIdx:%d",VipThink.viewMgr.currSubviewIdx);
			}else if(currPageIndex < pageNum-1){
			VipThink.viewMgr.currPageIdx++;
			console.debug("RuMenKeModule自动跳到下一关 PageIndex:%d",VipThink.viewMgr.currPageIdx);
		}else{}
	}

	RuMenKeAIRecordModule.__init$=function(){{
			VipThinkExtend.regModule("ru_men_ke_ai_record",RuMenKeAIRecordModule);
		}
	}

	return RuMenKeAIRecordModule;
})(BasePureModule)


/**
*入门课课后作业模块，负责切页和所有页做完后的提示
*@author benson
*
*/
//class com.extend.module.ruMenKe.RuMenKeHomeworkModule extends com.extend.module.BasePureModule
var RuMenKeHomeworkModule=(function(_super){
	function RuMenKeHomeworkModule(){
		this.mStartTime=0;
		//每道题开始时间（粗略计算）
		this.name="homeworkOnline";
		this.TAG="HomeWorkOnlineView";
		RuMenKeHomeworkModule.__super.call(this);
	}

	__class(RuMenKeHomeworkModule,'com.extend.module.ruMenKe.RuMenKeHomeworkModule',_super);
	var __proto=RuMenKeHomeworkModule.prototype;
	Laya.imps(__proto,{"com.biz.native.INativeCommandTarget":true})
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
				console.debug("command","param.args.state is "+state);
				if (!EvaModel.data.submitAnswerAPI){
					console.debug("command","EvaModel.data.submitAnswerAPI is undifine, 没有submitAnwserAPI");
					return;
				}
			}
			else{
				console.debug("command","收到应用截图成功事件");
				if (state==1){
					page.showAnswerFace(1);
					Laya.timer.once(2000,this,function(){
						this.nextPage();
					});
				}
				else if (state==2){
					VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
				}
			}
		}
	}

	__proto.init=function(moduleName,args){
		_super.prototype.init.call(this,moduleName,args);
		VipThink.nativeCommandMgr.regist(this);
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.onNativeCall);
		this.onCmd("finish_this_page",this,this.onFinshThisPage);
		VipThink.viewMgr.on("changed",this,this.onPageChanged);
	}

	__proto.onNativeCall=function(args){
		switch (args.minorType){
			case "evaRedo":{
					VipThink.viewMgr.setMainModalStyle(false);
					VipThink.viewMgr.reset(true);
					break ;
				}
			default :
				break ;
			}
	}

	__proto.onPageChanged=function(oIdxp,oIdxv,idxp,idxv,force){
		console.debug("onPageChanged");
		this.mStartTime=new Date().getTime();
	}

	__proto.onFinshThisPage=function(){
		VipThink.viewMgr.setMainModalStyle(true);
		Laya.timer.once(1000,this,this.report);
	}

	__proto.nextPage=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(subjNum > 1 && currSubjIndex < subjNum-1){
			VipThink.viewMgr.currSubviewIdx++;
			console.debug("RuMenKeModule自动跳到下一题 SubviewIdx:%d",VipThink.viewMgr.currSubviewIdx);
			}else if(currPageIndex < pageNum-1){
			VipThink.viewMgr.currPageIdx++;
			console.debug("RuMenKeModule自动跳到下一关 PageIndex:%d",VipThink.viewMgr.currPageIdx);
			}else{
			if(12==VipThink.courseType){
				VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"complete",desc:"测评完成"}}});
			}
		}
	}

	__proto.report=function(){
		var v=VipThink.viewMgr.currPage.currView;
		if (!v)
			return;
		var reportData;
		var status=1;
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0)
			truePageIdx=EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx];
		var _costTime=Math.ceil((new Date().getTime()-this.mStartTime)/ 1000);
		var data={onlineWorkId:EvaModel.data.id,userId:VipThink.user.id,liveId:EvaModel.data.liveId ? EvaModel.data.liveId :VipThink.config.liveId,type:EvaModel.data.onlineHomeworkType ? EvaModel.data.onlineHomeworkType :1,level:truePageIdx+1,status:status,time:_costTime};
		reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6},{7},{8}]",this.TAG,VipThink.courseID,data.onlineWorkId,data.userId,data.liveId,data.type,data.level,data.status,data.time);
		Reporter.reportData(1,reportData);
		var currPageIdx=VipThink.viewMgr.currPageIdx+1;
		truePageIdx=currPageIdx;
		VipThink.nativeAPI.captureScreen("evaluation/"+truePageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data}});
	}

	__getset(0,__proto,'nativeCommandType',function(){
		return 1;
	});

	RuMenKeHomeworkModule.__init$=function(){{
			VipThinkExtend.regModule("ru_men_ke_homework",RuMenKeHomeworkModule);
		};
	}

	return RuMenKeHomeworkModule;
})(BasePureModule)


/**
*入门课模块，负责切页和所有页做完后的提示
*@author benson
*
*/
//class com.extend.module.ruMenKe.RuMenKeModule extends com.extend.module.BasePureModule
var RuMenKeModule=(function(_super){
	function RuMenKeModule(){
		this.mStartTime=0;
		//每道题开始时间（粗略计算）
		this.name="homeworkOnline";
		this.TAG="HomeWorkOnlineView";
		RuMenKeModule.__super.call(this);
	}

	__class(RuMenKeModule,'com.extend.module.ruMenKe.RuMenKeModule',_super);
	var __proto=RuMenKeModule.prototype;
	Laya.imps(__proto,{"com.biz.native.INativeCommandTarget":true})
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
				console.debug("command","param.args.state is "+state);
				if (!EvaModel.data.submitAnswerAPI){
					console.debug("command","EvaModel.data.submitAnswerAPI is undifine, 没有submitAnwserAPI");
					return;
				}
			}
			else{
				console.debug("command","收到应用截图成功事件");
				if (state==1){
					page.showAnswerFace(1);
					Laya.timer.once(2000,this,function(){
						this.nextPage();
					});
				}
				else if (state==2){
					VipThink.viewMgr.toast("SUBMIT_FAILED",this.TAG,"info",4000);
				}
			}
		}
	}

	__proto.init=function(moduleName,args){
		_super.prototype.init.call(this,moduleName,args);
		VipThink.nativeCommandMgr.regist(this);
		VipThink.nativeAPI.eventDispatch.on("nativeToLaya",this,this.onNativeCall);
		this.onCmd("finish_this_page",this,this.onFinshThisPage);
		VipThink.viewMgr.on("changed",this,this.onPageChanged);
	}

	__proto.onNativeCall=function(args){
		switch (args.minorType){
			case "evaRedo":{
					VipThink.viewMgr.reset(true);
					break ;
				}
			default :
				break ;
			}
	}

	__proto.onPageChanged=function(oIdxp,oIdxv,idxp,idxv,force){
		console.debug("onPageChanged");
		this.mStartTime=new Date().getTime();
	}

	__proto.onFinshThisPage=function(){
		if(12==VipThink.courseType){
			this.report();
		}
	}

	// }
	__proto.nextPage=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(subjNum > 1 && currSubjIndex < subjNum-1){
			VipThink.viewMgr.currSubviewIdx++;
			console.debug("RuMenKeModule自动跳到下一题 SubviewIdx:%d",VipThink.viewMgr.currSubviewIdx);
			}else if(currPageIndex < pageNum-1){
			VipThink.viewMgr.currPageIdx++;
			console.debug("RuMenKeModule自动跳到下一关 PageIndex:%d",VipThink.viewMgr.currPageIdx);
			}else{
			if(12==VipThink.courseType){
				VipThink.nativeAPI.noticeNative({args:{type:this.name,data:{act:"complete",desc:"测评完成"}}});
			}
		}
	}

	__proto.report=function(){
		var v=VipThink.viewMgr.currPage.currView;
		if (!v)
			return;
		var reportData;
		var status=1;
		var truePageIdx=VipThink.viewMgr.currPageIdx;
		if (EvaModel.data.courseIndices && EvaModel.data.courseIndices.length > 0)
			truePageIdx=EvaModel.data.courseIndices[VipThink.viewMgr.currPageIdx];
		var _costTime=Math.ceil((new Date().getTime()-this.mStartTime)/ 1000);
		var data={onlineWorkId:EvaModel.data.id,userId:VipThink.user.id,liveId:EvaModel.data.liveId ? EvaModel.data.liveId :VipThink.config.liveId,type:EvaModel.data.onlineHomeworkType ? EvaModel.data.onlineHomeworkType :1,level:truePageIdx+1,status:status,time:_costTime};
		reportData=StringUtil.format("[{0},{1},{2},{3},{4},{5},{6},{7},{8}]",this.TAG,VipThink.courseID,data.onlineWorkId,data.userId,data.liveId,data.type,data.level,data.status,data.time);
		Reporter.reportData(1,reportData);
		var currPageIdx=VipThink.viewMgr.currPageIdx+1;
		truePageIdx=currPageIdx;
		VipThink.nativeAPI.captureScreen("evaluation/"+truePageIdx+".jpg",null,{type:this.name,data:{page:currPageIdx,submitData:data}});
	}

	__getset(0,__proto,'nativeCommandType',function(){
		return 1;
	});

	RuMenKeModule.__init$=function(){{
			VipThinkExtend.regModule(ExtendModuleNames.RU_MEN_KE,RuMenKeModule);
		};
	}

	return RuMenKeModule;
})(BasePureModule)


/**
*
*@author snow
*互动课堂模块
*
*/
//class com.extend.module.interactionClass.InteractionClassModuleBase extends com.extend.module.BaseModule
var InteractionClassModuleBase=(function(_super){
	function InteractionClassModuleBase(){
		/////数据
		this.mWrongTimes=0;
		InteractionClassModuleBase.__super.call(this);
	}

	__class(InteractionClassModuleBase,'com.extend.module.interactionClass.InteractionClassModuleBase',_super);
	var __proto=InteractionClassModuleBase.prototype;
	__proto.initOthers=function(){
		var courseCfg=VipThink.config.courseCfg || {};
		var data={args:{
				type:"interactiveClass",
				data:{
					act:"courseCfg",
					cfg:courseCfg
				}
		}}
		this.noticeNative(data);
		this.addEvents();
	}

	__proto.clear=function(){
		_super.prototype.clear.call(this);
		this.removeEvents();
	}

	__proto.addEvents=function(){
		VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChange);
		VipThink.viewMgr.on("videoViewCommand",this,this.onVideoCommand);
		this.onCmd("report_interaction_class",this,this.onLessonsReport);
		this.addEvent("XiaoFeiXiaFeedbackSkMovieClipEnd",this,this.onXiaoFeiXiaFeedbackAniEnd);
	}

	__proto.onXiaoFeiXiaFeedbackAniEnd=function(){
		console.debug("onXiaoFeiXiaFeedbackAniEnd");
	}

	__proto.removeEvents=function(){
		VipThink.viewMgr.mainView.off("changed",this,this.onPageStatusChange);
		VipThink.viewMgr.off("videoViewCommand",this,this.onVideoCommand);
		this.offCmd("report_interaction_class");
	}

	__proto.onLessonsReport=function(type,complete){
		console.log("onLessonsReport",type,complete);
		this.anserReport(type,complete);
	}

	__proto.anserReport=function(type,complete){}
	/**
	*重置错误次数
	*
	*/
	__proto.resetWrongTimes=function(){
		this.wrongTimes=0;
	}

	__proto.onPageStatusChange=function(evt){
		if(evt.status=="prepared"){
			this.resetWrongTimes();
		}
	}

	__proto.onVideoCommand=function(param){
		var act=param.args.act;
		var isEnd=param.args.isEnd ? true :false;
		var time=param.args.time;
		var currView=VipThink.viewMgr.currPage.currView;
		console.log("onVideoCommand:",param);
		if (currView && currView.isVideoView){
			if (act=="stop" && isEnd){
				if(this.isLastLesson()){
					var data={
						args:{
							type:"interactiveClass",
							data:{
								act:"complete"
							}
					}};
					this.noticeNative(data);
					return;
				}
				console.log("video play end: nextPage");
				var data={args:{
						type:"interactiveClass",
						data:{
							act:"nextPage"
						}
				}}
				this.noticeNative(data);
			}
			return;
		}
	}

	/**
	*最后一堂课
	*@return
	*
	*/
	__proto.isLastLesson=function(){
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var subjNum=VipThink.viewMgr.currPage.subViewsLength;
		var currPageIndex=VipThink.viewMgr.currPageIdx;
		var currSubjIndex=VipThink.viewMgr.currSubviewIdx;
		if(currPageIndex==pageNum-1 && currSubjIndex==subjNum-1){
			return true;
		}
		return false;
	}

	__getset(0,__proto,'wrongTimes',function(){
		return this.mWrongTimes;
		},function(v){
		this.mWrongTimes=v;
	});

	return InteractionClassModuleBase;
})(BaseModule)


//class com.extend.module.littlePeaPK.LittlePeaPKModule extends com.extend.module.BaseModule
var LittlePeaPKModule=(function(_super){
	function LittlePeaPKModule(){
		this.bgImage=null;
		this.bgUrl="share_extend/ui/littlePeaPK/img_bj.jpg";
		this.bg2Url="share_extend/ui/littlePeaPK/img_bj_2.jpg";
		this.matchPKViewContainer=null;
		this.topTitlePKViewContainer=null;
		this.countDownPKViewContainer=null;
		// private var answerWrongAniPKViewContainer:AnswerWrongAniPKViewContainer;
		this.timeOverNoAnswerTipsPKViewContainer=null;
		this.aiThinkingAniPKViewContainer=null;
		this.resultViewContainer=null;
		this.dataMgr=null;
		LittlePeaPKModule.__super.call(this);
		this.baseResArray=[
		{url:"res/atlas/share_extend/ui/littlePeaPK.png",type:"image"},
		{url:"res/atlas/share_extend/ui/littlePeaPK.atlas",type:"atlas"},
		{url:"share_extend/ui/littlePeaPK/img_bj.jpg",type:"image"},
		{url:"share_extend/ui/littlePeaPK/img_bj_2.jpg",type:"image"},
		{url:"share_extend/animation/littlePeaPK/ui/ui.sk",type:"arraybuffer"},
		{url:"share_extend/animation/littlePeaPK/ui/ui.png",type:"image"},
		{url:"share_extend/animation/littlePeaPK/qkld/qkld.sk",type:"arraybuffer"},
		{url:"share_extend/animation/littlePeaPK/qkld/qkld.png",type:"image"},
		{url:"share_extend/animation/littlePeaPK/ldsk/ldsikao.sk",type:"arraybuffer"},
		{url:"share_extend/animation/littlePeaPK/ldsk/ldsikao.png",type:"image"},];
		KlEventCenter.on("LittlePeaPKViewInitComplete",this,this.onQuestionViewInitComplete);
		KlEventCenter.on("AnswerResultAniCompleteLittlePeaPK",this,this.onSelfAnswerResultAniComplete);
		KlEventCenter.on("CountdownIsOverLittlePeaPK",this,this.onCountDownOverHandle);
		this.onCmd("submit_answer",this,this.onSelfSubmitAnswer);
		this.onCmd("feedback",this,this.onFeedBackHandle);
	}

	__class(LittlePeaPKModule,'com.extend.module.littlePeaPK.LittlePeaPKModule',_super);
	var __proto=LittlePeaPKModule.prototype;
	__proto.onFeedBackHandle=function(action){
		switch(action){
			case "ActionAnswerRightAniComplete":
				this.onSelfAnswerResultAniComplete();
				break ;
			case "ActionAnswerWrongAniComplete":
				this.onSelfAnswerResultAniComplete();
				break ;
			default :
				break ;
			}
	}

	__proto.onCountDownOverHandle=function(){
		var curQuestionIdx=this.dataMgr.getCurQuestionIdx();
		var data=this.dataMgr.getSelfOneAnswerQuestionData(curQuestionIdx);
		if((data==null)|| (data && 0==data.result)){
			this.timeOverNoAnswerTipsPKViewContainer.visible=true;
			this.timeOverNoAnswerTipsPKViewContainer.showAni();
		}
	}

	/**
	*初始化自定义UI
	**/
	__proto.initContenters=function(){
		var zOrder=MyViewManager.VIEW_ZORDER["extendView"];
		this.initBgView(this.bgUrl);
		this.matchPKViewContainer=new MatchPKViewContainer(this);
		this.matchPKViewContainer.addToParent(zOrder);
		this.timeOverNoAnswerTipsPKViewContainer=new TimeOverNoAnswerTipsPKViewContainer(this);
		this.timeOverNoAnswerTipsPKViewContainer.addToParent(zOrder);
		this.timeOverNoAnswerTipsPKViewContainer.visible=false;
		this.aiThinkingAniPKViewContainer=new AIThinkingAniPKViewContainer(this);
		this.aiThinkingAniPKViewContainer.addToParent(zOrder);
		this.aiThinkingAniPKViewContainer.visible=false;
		this.topTitlePKViewContainer=new TopTitlePKViewContainer(this);
		this.topTitlePKViewContainer.addToParent(zOrder);
		this.topTitlePKViewContainer.visible=false;
		this.countDownPKViewContainer=new CountDownPKViewContainer(this);
		this.countDownPKViewContainer.addToParent(zOrder);
		this.countDownPKViewContainer.visible=false;
		this.dataMgr=new LittlePeaPKDataMgr();
		this.dataMgr.createAIData();
		var courseCfg=VipThink.config.courseCfg || {};
		var num=this.dataMgr.getQuestionNum();
		console.log("littlePeaPK notice ACT_COURSE_CFG");
		var data={args:{
				type:"LittlePeaPK",
				data:{
					act:"courseCfg",
					cfg:courseCfg,
					questionNum:num
				}
		}}
		this.noticeNative(data);
	}

	__proto.initBgView=function(imgUrl){
		if(this.bgImage){
			this.bgImage.removeSelf();
		}
		this.load(this.bgUrl,Handler.create(this,function(){
			this.bgImage=new Image(imgUrl);
			this.bgImage.width=1920;
			this.bgImage.height=1080;
			this.bgImage.centerX=0;
			this.bgImage.centerY=0;
			var sdkRoot=VipThink.viewMgr.root;
			this.bgImage.zOrder=MyViewManager.VIEW_ZORDER["bgView"];
			sdkRoot.addChildAt(this.bgImage,0);
		}));
	}

	/**
	*
	*匹配完成
	*/
	__proto.matchComplete=function(){
		console.log("matchComplete");
		this.matchPKViewContainer.removeSelf();
		this.matchPKViewContainer.clear();
		this.initBgView(this.bg2Url);
		this.openPKClassContainers();
	}

	/**
	*
	*打开PK课件内容
	*/
	__proto.openPKClassContainers=function(){
		KlEventCenter.event("StartShowMainViewContent");
		this.topTitlePKViewContainer.visible=true;
		this.countDownPKViewContainer.visible=true;
	}

	/**
	*
	*打开结算界面
	*/
	__proto.openResultContainer=function(){
		console.log("openResultContainer");
		if(!this.resultViewContainer){
			this.resultViewContainer=new ResultPKViewContainer(this);
			var zOrder=MyViewManager.VIEW_ZORDER["extendView"];
			this.resultViewContainer.addToParent(zOrder);
			}else{
			this.resultViewContainer.updateView();
		}
	}

	__proto.closeResultContainer=function(){
		this.resultViewContainer.removeSelf();
	}

	__proto.onSelfSubmitAnswer=function(answer){
		console.log("onSelfSubmitAnswer answer:%d",answer);
		var data=new AnswerOneQuestionData();
		data.result=answer;
		data.time=Math.floor(this.countDownPKViewContainer.getPassTime()/ 1000);
		var curQuestionIdx=this.dataMgr.getCurQuestionIdx();
		this.dataMgr.pushSelfQuestionData(data,curQuestionIdx);
		this.dataMgr.haveSelfSubmittedCurQuestionAnswer=true;
		this.checkIfNeedStopCountDown();
		this.submitData(curQuestionIdx,data.result,data.time);
		this.topTitlePKViewContainer.showSelfOneQuestionAnswerResult(curQuestionIdx,answer);
		this.topTitlePKViewContainer.setSelfRightNum(this.dataMgr.getSelfCurCorrectQuestionNum());
	}

	__proto.onQuestionViewInitComplete=function(){
		Laya.timer.clear(this,this.onAISubmitAnswer);
		this.dataMgr.resetHaveSubmitCurQuestionAnswer();
		this.dataMgr.resetAnswerAniComplete();
		this.dataMgr.nextQuestion();
		this.countDownPKViewContainer.startCountDown();
		this.topTitlePKViewContainer.playAIIdleAni();
		var dataAI=this.dataMgr.getAIOneAnswerQuestionData(this.dataMgr.getCurQuestionIdx());
		if(dataAI.time > 30){
			dataAI.time=30
		}
		Laya.timer.once(this.dataMgr.getReadTitleTime()*1000,this,this.onReadTitleComplete);
		Laya.timer.once(dataAI.time *1000,this,this.onAISubmitAnswer,[dataAI.result]);
	}

	__proto.onReadTitleComplete=function(){
		this.topTitlePKViewContainer.playAIThinkAni();
	}

	__proto.onAISubmitAnswer=function(result){
		console.log("onAISubmitAnswer result:%d",result);
		this.dataMgr.haveAISubmittedCurQuestionAnswer=true;
		this.checkIfNeedStopCountDown();
		this.aiThinkingAniPKViewContainer.visible=false;
		this.aiThinkingAniPKViewContainer.stopAni();
		switch(result){
			case 1:
				this.topTitlePKViewContainer.playAIRightAni();
				break ;
			case 2:
				this.topTitlePKViewContainer.playAIWrongAni();
				break ;
			default :
				this.topTitlePKViewContainer.playAIWrongAni();
				break ;
			};
		var curQuestionIdx=this.dataMgr.getCurQuestionIdx();
		this.topTitlePKViewContainer.showAIOneQuestionAnswerResult(curQuestionIdx,result);
		this.topTitlePKViewContainer.setAIRightNum(this.dataMgr.getAICurCorrectQuestionNum());
		Laya.timer.once(2000,this,this.onAIAnswerAniComplete);
	}

	__proto.onAIAnswerAniComplete=function(){
		this.dataMgr.aiAnswerAniComplete();
		this.checkAllAnswerAniComplete();
	}

	__proto.checkAllAnswerAniComplete=function(){
		console.log("checkAllAnswerAniComplete isAllAnswerAniComplete:%s",this.dataMgr.isAllAnswerAniComplete()? "true" :"false");
		if(this.dataMgr.isAllAnswerAniComplete()){
			if(this.dataMgr.isLastQuestion()){
				this.openResultContainer();
				}else{
				VipThink.nativeAPI.nextPage();
			}
		}
	}

	__proto.onSelfAnswerResultAniComplete=function(){
		this.dataMgr.selfAnswerAniComplete();
		if(this.dataMgr.haveAISubmittedCurQuestionAnswer){
			console.log("AI have submitted curQuestion Answer");
			}else{
			this.aiThinkingAniPKViewContainer.visible=true;
			this.aiThinkingAniPKViewContainer.showAni();
		}
		this.checkAllAnswerAniComplete();
	}

	__proto.checkIfNeedStopCountDown=function(){
		console.log("checkIfNeedStopCountDown");
		if(this.dataMgr.isAllHaveSubmitCurQuestion()){
			this.countDownPKViewContainer.stopCountDown();
		}
	}

	__proto.submitData=function(questionIdx,result,time){
		console.log("submitData questionIdx:%d, result:%d ,time:%d",questionIdx,result ,time);
		var data={args:{
				type:"LittlePeaPK",
				data:{
					act:"submitAnswerData",
					questionIndex:questionIdx,
					answerResult:result,
					costTime:time
				}
		}}
		this.noticeNative(data);
	}

	LittlePeaPKModule.__init$=function(){{
			VipThinkExtend.regModule("little_pea_pk",LittlePeaPKModule);
		};
	}

	return LittlePeaPKModule;
})(BaseModule)


//class com.extend.module.newSpecialEvaluation.NewSpecialEvaluationModule extends com.extend.module.BaseModule
var NewSpecialEvaluationModule=(function(_super){
	function NewSpecialEvaluationModule(){
		this.mBgContainer=null;
		this.mLediAniContainer=null;
		this.mArrAnswerResult=null;
		NewSpecialEvaluationModule.__super.call(this);
		var pageNum=this.getPageNum();
		this.mArrAnswerResult=new Array(pageNum);
	}

	__class(NewSpecialEvaluationModule,'com.extend.module.newSpecialEvaluation.NewSpecialEvaluationModule',_super);
	var __proto=NewSpecialEvaluationModule.prototype;
	__proto.getPageNum=function(){
		var pageNum=VipThink.config.courseCfg.pages.length;
		console.debug("getPageNum:"+pageNum);
		return pageNum;
	}

	/**
	*初始化自定义UI
	**/
	__proto.initContenters=function(){
		var zOrder=0;
		this.mLediAniContainer=new SpecialEvaluationLediAniContainer(this);
		zOrder=MyViewManager.VIEW_ZORDER["extendView"];
		this.mLediAniContainer.addToParent(zOrder);
		this.mBgContainer=new SpecialEvaluationBgContainer(this);
		zOrder=MyViewManager.VIEW_ZORDER["bgView"];
		this.mBgContainer.addToParent(zOrder);
		this.addEvents();
		VipThink.viewMgr.setLoadingView(false);
		VipThink.nativeAPI.mate({args:{origin:"laya",mainType:2,minorType:"closeTaskReward"}});
	}

	__proto.addEvents=function(){
		KlEventCenter.on("SubmitAnswerNewSpecialEvaluation",this,this.onSubmitAnswer);
		KlEventCenter.on("SubmittedAnswerNewSpecialEvaluation",this,this.onSubmittedAnswer);
		KlEventCenter.on("FinishedNewSpecialEvaluation",this,this.onFinished);
	}

	__proto.getLediAniContainer=function(){
		return this.mLediAniContainer;
	}

	__proto.onSubmitAnswer=function(){
		console.debug("onSubmitAnswer");
		var curPageIdx=VipThink.viewMgr.currPageIdx;
		this.mBgContainer.playSkChongdianchi(curPageIdx+1);
		var page=VipThink.currView;
		if (page){
			var r=page.result;
			console.debug("onSubmitAnswer curPageIdx:%d, r:%s, mArrAnswerResult.length:%d",curPageIdx,r ? "true" :"false",this.mArrAnswerResult.length);
			if(curPageIdx < this.mArrAnswerResult.length){
				this.mArrAnswerResult[curPageIdx]=r;
			}
		}
	}

	__proto.onSubmittedAnswer=function(){
		console.debug("onSubmittedAnswer");
		if(this.mBgContainer){
			var pageNum=this.getPageNum();
			var curPageIdx=VipThink.viewMgr.currPageIdx;
			if(curPageIdx+1==pageNum / 2){
				this.mBgContainer.playSkInMiddlePeriod();
				}else{
				VipThink.nativeAPI.nextPage();
			}
		}
	}

	//所有题目答完提交后
	__proto.onFinished=function(){
		console.debug("onFinished");
		var rightNum=0;
		this.mArrAnswerResult.forEach(function(result){
			if(result){
				rightNum++;
			}
		});
		var curView=VipThink.currView;
		if(curView){
			curView.mouseEnabled=false;
		}
		if(this.mBgContainer){
			this.mBgContainer.playSkInTheEnd(rightNum);
		}
	}

	NewSpecialEvaluationModule.__init$=function(){
		VipThinkExtend.regModule("new_special_evaluation",NewSpecialEvaluationModule);
	}

	return NewSpecialEvaluationModule;
})(BaseModule)


/**
*
*@author snow
*互动课堂模块
*
*/
//class com.extend.module.interactionClass.InteractionClassModule extends com.extend.module.interactionClass.InteractionClassModuleBase
var InteractionClassModule=(function(_super){
	function InteractionClassModule(){
		/// contenters
		this.mainContaner=null;
		/////数据
		this.mStar=0;
		this.mCurrentStar=0;
		InteractionClassModule.__super.call(this);
	}

	__class(InteractionClassModule,'com.extend.module.interactionClass.InteractionClassModule',_super);
	var __proto=InteractionClassModule.prototype;
	/**
	*初始化自定义UI
	**/
	__proto.initContenters=function(){
		this.mainContaner=new InteractionClassMainContainer(this);
		this.mainContaner.addToParent(MyViewManager.VIEW_ZORDER["extendView"]);
		this.mStar=VipThink.config.star;
		this.mCurrentStar=VipThink.config.currentStar;
		this.initOthers();
	}

	__proto.clear=function(){
		_super.prototype.clear.call(this);
		this._$4_removeEvents();
	}

	__proto._$4_addEvents=function(){
		VipThink.viewMgr.mainView.on("changed",this,this.onPageStatusChange);
		VipThink.viewMgr.on("videoViewCommand",this,this.onVideoCommand);
		this.onCmd("report_interaction_class",this,this.onLessonsReport);
		this.addEvent("XiaoFeiXiaFeedbackSkMovieClipEnd",this,this._$4_onXiaoFeiXiaFeedbackAniEnd);
	}

	__proto._$4_onXiaoFeiXiaFeedbackAniEnd=function(){
		console.debug("onXiaoFeiXiaFeedbackAniEnd");
	}

	__proto._$4_removeEvents=function(){
		VipThink.viewMgr.mainView.off("changed",this,this.onPageStatusChange);
		VipThink.viewMgr.off("videoViewCommand",this,this.onVideoCommand);
		this.offCmd("report_interaction_class");
	}

	// }
	__proto.isCurrentStarMax=function(){
		return this.currentStar >=50;
	}

	__proto.anserReport=function(type,complete){
		if(type==2){
			this.wrongTimes++;
			console.log("NewQuickClassStarView 错误计数 + 1：",this.wrongTimes);
			return;
		}
		if(type==0){
			if(this.isLastLesson()){
				var data={
					args:{
						type:"interactiveClass",
						data:{
							act:"complete"
						}
				}};
				this.noticeNative(data);
				return;
				}else{
				console.log("未答题 直接跳关: nextPage");
				var data={args:{
						type:"interactiveClass",
						data:{
							act:"nextPage"
						}
				}}
				this.noticeNative(data);
			}
			return;
		}
		if(type==1){
			var addStar=0;
			if(this.wrongTimes==0){
				addStar=3;
				}else if(this.wrongTimes < 3){
				addStar=2;
				}else{
				addStar=1;
			};
			var realAddStar=0;
			if(this.currentStar+addStar <=50){
				realAddStar=addStar;
				}else{
				realAddStar=50-this.currentStar;
			}
			if(realAddStar < 0){
				realAddStar=0;
			}
			this.mStar=realAddStar+this.mStar;
			this.mCurrentStar=realAddStar+this.mCurrentStar;
			this.mainContaner.playSkMovieClip(addStar,realAddStar,complete);
		}
	}

	// }
	__getset(0,__proto,'star',function(){
		return this.mStar;
		},function(v){
		this.mStar=v;
		this.mainContaner.updateStar();
	});

	__getset(0,__proto,'currentStar',function(){
		return this.mCurrentStar;
		},function(v){
		this.mCurrentStar=v;
	});

	InteractionClassModule.MAX_ADD_STAR=50;
	InteractionClassModule.__init$=function(){{
			VipThinkExtend.regModule("interaction_class",InteractionClassModule);
		};
	}

	return InteractionClassModule;
})(InteractionClassModuleBase)


//class com.extend.module.interactionClass.XiaoFeiXiaInteractionClassModule extends com.extend.module.interactionClass.InteractionClassModuleBase
var XiaoFeiXiaInteractionClassModule=(function(_super){
	function XiaoFeiXiaInteractionClassModule(){
		this.container=null;
		XiaoFeiXiaInteractionClassModule.__super.call(this);
	}

	__class(XiaoFeiXiaInteractionClassModule,'com.extend.module.interactionClass.XiaoFeiXiaInteractionClassModule',_super);
	var __proto=XiaoFeiXiaInteractionClassModule.prototype;
	/**
	*初始化自定义UI
	**/
	__proto.initContenters=function(){
		this.container=new XiaofeixiaFeedbackContainer(this);
		this.container.addToParent(MyViewManager.VIEW_ZORDER["extendView"]);
		this.initOthers();
	}

	__proto.anserReport=function(type,complete){
		if(type==2){
			this.wrongTimes++;
			console.log("NewQuickClassStarView 错误计数 + 1：",this.wrongTimes);
			return;
		}
		if(type==0){
			if(this.isLastLesson()){
				var data={
					args:{
						type:"interactiveClass",
						data:{
							act:"complete"
						}
				}};
				this.noticeNative(data);
				return;
				}else{
				console.log("未答题 直接跳关: nextPage");
				var data={args:{
						type:"interactiveClass",
						data:{
							act:"nextPage"
						}
				}}
				this.noticeNative(data);
			}
			return;
		}
		if(type==1){
			this.container.playSkMovieClip(complete);
		}
	}

	XiaoFeiXiaInteractionClassModule.__init$=function(){{
			VipThinkExtend.regModule("xiaofeixia_interaction_class",XiaoFeiXiaInteractionClassModule);
		};
	}

	return XiaoFeiXiaInteractionClassModule;
})(InteractionClassModuleBase)


//class com.extend.core.ui.BaseViewContainer extends laya.ui.Box
var BaseViewContainer=(function(_super){
	function BaseViewContainer(module,contentUIClass,preLoadRes){
		this.mContent=null;
		this.mContentUIClass=null;
		this.preLoadRes=null;
		this.mStatus=0;
		this.module
		BaseViewContainer.__super.call(this);
		this.module=module;
		this.mContentUIClass=contentUIClass;
		this.preLoadRes=preLoadRes;
		this.init();
	}

	__class(BaseViewContainer,'com.extend.core.ui.BaseViewContainer',_super);
	var __proto=BaseViewContainer.prototype;
	__proto.addToParent=function(zOrder){
		var sdkRoot=VipThink.viewMgr.root;
		sdkRoot.addChild(this);
		this.zOrder=zOrder;
	}

	__proto.clear=function(){
		this.status=0;
		this.clearRes();
	}

	__proto.isComplete=function(){
		return this.status==4;
	}

	__proto.clearRes=function(){
		if(this.preLoadRes && this.preLoadRes.length > 0){
			for (var i=0;i < this.preLoadRes.length;i++){
				var res=this.preLoadRes[i];
				Laya.loader.cancelLoadByUrl(res);
				Laya.loader.clearRes(res);
			}
		}
	}

	/**
	*初始化
	*
	*/
	__proto.init=function(){
		console.log("开始初始化");
		this.status=1;
		this.loadRes();
	}

	__proto.loadRes=function(){
		this.status=2;
		if(this.preLoadRes && this.preLoadRes.length > 0){
			this.module.load(this.preLoadRes,Handler.create(this,this.onResLoadComplete));
			}else{
			this.onResLoadComplete();
		}
	}

	__proto.onResLoadComplete=function(){
		console.log("onResLoadComplete  资源加载成功");
		this.initView();
	}

	__proto.initView=function(){
		console.log("initView 开始初始化界面");
		this.status=3;
		if(this.mContentUIClass){
			this.mContent=new this.mContentUIClass();
			this.addChild(this.mContent);
			this.status=4;
			var self=this;
			this.onComplete();
			this.callLater(function(){
				self.event("complete");
			});
			}else{
			throw new Error("BaseViewContaner ContentUIClass is null");
		}
	}

	/**
	*初始化结束回调 重写这个类开始逻辑的处理
	*
	*/
	__proto.onComplete=function(){}
	/**
	*
	*@param value
	*容器状态
	*
	*/
	__getset(0,__proto,'status',function(){
		return this.mStatus;
		},function(value){
		if(this.mStatus !=value){
			this.mStatus=value;
			this.event("change",this.mStatus);
		}
	});

	/**
	*UI内容
	*@return
	*
	*/
	__getset(0,__proto,'content',function(){
		return this.mContent;
	});

	return BaseViewContainer;
})(Box)


//class com.extend.module.interactionClass.ui.InteractionClassUI extends laya.ui.View
var InteractionClassUI=(function(_super){
	function InteractionClassUI(){
		this.boxBg=null;
		this.imgStar=null;
		this.labStar=null;
		this.labAddStar=null;
		this.sk=null;
		this.lab=null;
		InteractionClassUI.__super.call(this);
	}

	__class(InteractionClassUI,'com.extend.module.interactionClass.ui.InteractionClassUI',_super);
	var __proto=InteractionClassUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(InteractionClassUI.uiView);
	}

	InteractionClassUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"x":0,"width":1920,"var":"boxBg","height":1080},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":50,"x":1678,"skin":"share_extend/ui/img_corner.png"}},{"type":"Image","props":{"y":61,"x":1693,"var":"imgStar","skin":"share_extend/ui/img_star.png"}},{"type":"Label","props":{"y":65,"x":1763,"var":"labStar","text":"888","fontSize":46,"color":"#333333","align":"center"}},{"type":"Label","props":{"y":171,"x":1741,"var":"labAddStar","text":"+3","fontSize":46,"color":"#FFCF43","align":"center"}},{"type":"SkeletonPlayer","props":{"y":1080,"x":0,"var":"sk","url":"share_extend/animation/interactionClass/feedback/fankui.sk","stopAt":0,"isLoop":"false","currAniName":"3x"}},{"type":"Label","props":{"y":670,"x":558,"var":"lab","text":"星星已经装满了，快去学习其他课程吧！","fontSize":50,"color":"#fff000"}}]};
	return InteractionClassUI;
})(View)


//class com.extend.module.interactionClass.ui.XiaofeixiaFeedbackUI extends laya.ui.View
var XiaofeixiaFeedbackUI=(function(_super){
	function XiaofeixiaFeedbackUI(){
		this.sk=null;
		XiaofeixiaFeedbackUI.__super.call(this);
	}

	__class(XiaofeixiaFeedbackUI,'com.extend.module.interactionClass.ui.XiaofeixiaFeedbackUI',_super);
	var __proto=XiaofeixiaFeedbackUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(XiaofeixiaFeedbackUI.uiView);
	}

	XiaofeixiaFeedbackUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"var":"bg","height":1080,"alpha":0.5},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":540,"x":980,"visible":true,"var":"sk","url":"share_extend/animation/interactionClass/feedback/xiaofeixia/dd_fkdh.sk","stopAt":0,"preview":false,"name":"sk","isLoop":"false","currAniName":"dd_fkdh"}}]};
	return XiaofeixiaFeedbackUI;
})(View)


//class com.extend.module.littlePeaPK.ui.AIThinkingAniPKViewUI extends laya.ui.View
var AIThinkingAniPKViewUI=(function(_super){
	function AIThinkingAniPKViewUI(){
		this.sk=null;
		AIThinkingAniPKViewUI.__super.call(this);
	}

	__class(AIThinkingAniPKViewUI,'com.extend.module.littlePeaPK.ui.AIThinkingAniPKViewUI',_super);
	var __proto=AIThinkingAniPKViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(AIThinkingAniPKViewUI.uiView);
	}

	AIThinkingAniPKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"name":"bg","height":1080,"alpha":0.75},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":717,"x":941,"var":"sk","url":"share_extend/animation/littlePeaPK/ldsk/ldsikao.sk","stopAt":1,"preview":false,"isLoop":"false","currAniName":"idle2"}}]};
	return AIThinkingAniPKViewUI;
})(View)


//class com.extend.module.littlePeaPK.ui.CountDownPKViewUI extends laya.ui.View
var CountDownPKViewUI=(function(_super){
	function CountDownPKViewUI(){
		this.imgProgress=null;
		this.imgProgressMask=null;
		this.imgClock=null;
		this.leftTime=null;
		CountDownPKViewUI.__super.call(this);
	}

	__class(CountDownPKViewUI,'com.extend.module.littlePeaPK.ui.CountDownPKViewUI',_super);
	var __proto=CountDownPKViewUI.prototype;
	__proto.createChildren=function(){
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(CountDownPKViewUI.uiView);
	}

	CountDownPKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":973,"x":707,"skin":"share_extend/ui/littlePeaPK/img_jd_di.png","name":"imgProgressBg"}},{"type":"Image","props":{"y":977,"x":716,"var":"imgProgress","skin":"share_extend/ui/littlePeaPK/img_duqutiao(chang).png"},"child":[{"type":"Image","props":{"var":"imgProgressMask","skin":"share_extend/ui/littlePeaPK/img_duqutiao(chang).png","renderType":"mask"}}]},{"type":"Image","props":{"y":953,"x":1199,"var":"imgClock","skin":"share_extend/ui/littlePeaPK/img_zhong.png"},"child":[{"type":"FontClip","props":{"y":25,"x":0,"width":107,"var":"leftTime","value":"99","skin":"share_extend/ui/littlePeaPK/img_sz5.png","sheet":"1234567890","scaleY":0.7,"scaleX":0.7,"align":"center"}}]}]};
	return CountDownPKViewUI;
})(View)


//class com.extend.module.littlePeaPK.ui.MatchPKViewUI extends laya.ui.View
var MatchPKViewUI=(function(_super){
	function MatchPKViewUI(){
		this.imgBg=null;
		this.boxPage1=null;
		this.sk=null;
		this.boxPage2=null;
		this.imgLd=null;
		this.imgLu=null;
		this.fontClip=null;
		MatchPKViewUI.__super.call(this);
	}

	__class(MatchPKViewUI,'com.extend.module.littlePeaPK.ui.MatchPKViewUI',_super);
	var __proto=MatchPKViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(MatchPKViewUI.uiView);
	}

	MatchPKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"width":1920,"var":"imgBg","skin":"share_extend/ui/littlePeaPK/img_bj.jpg","height":1080}},{"type":"Box","props":{"width":1920,"var":"boxPage1","height":1080},"child":[{"type":"Image","props":{"y":183,"skin":"share_extend/ui/littlePeaPK/img_yuan2.png","centerX":0}},{"type":"SkeletonPlayer","props":{"y":1094,"x":3,"var":"sk","url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"isLoop":true,"currAniName":"txpipei"}}]},{"type":"Box","props":{"width":1920,"var":"boxPage2","height":1080},"child":[{"type":"Image","props":{"y":104,"skin":"share_extend/ui/littlePeaPK/img_bb.png","scaleY":3,"scaleX":3,"centerX":0}},{"type":"Image","props":{"y":169,"skin":"share_extend/ui/littlePeaPK/img_yuan3.png","centerX":0}},{"type":"Image","props":{"y":274,"var":"imgLd","skin":"share_extend/ui/littlePeaPK/img_ld.png","centerX":0}},{"type":"Image","props":{"y":251,"var":"imgLu","skin":"share_extend/ui/littlePeaPK/img_tou_cml.png","centerX":0}},{"type":"Image","props":{"y":687,"skin":"share_extend/ui/littlePeaPK/img_dian.png","centerX":0}},{"type":"FontClip","props":{"y":631,"x":888,"var":"fontClip","value":"1","skin":"share_extend/ui/littlePeaPK/img_sz2.png","sheet":"1234567890"}}]}]};
	return MatchPKViewUI;
})(View)


//class com.extend.module.littlePeaPK.ui.ResultPKViewUI extends laya.ui.View
var ResultPKViewUI=(function(_super){
	function ResultPKViewUI(){
		this.sk=null;
		this.boxContainer=null;
		this.fontAnserMax=null;
		ResultPKViewUI.__super.call(this);
	}

	__class(ResultPKViewUI,'com.extend.module.littlePeaPK.ui.ResultPKViewUI',_super);
	var __proto=ResultPKViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(ResultPKViewUI.uiView);
	}

	ResultPKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"y":0,"x":0,"top":0,"right":0,"left":0,"bottom":0,"alpha":0.75},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"Image","props":{"y":131,"x":463,"width":817,"skin":"share_extend/ui/littlePeaPK/img_mb.png","height":838}},{"type":"SkeletonPlayer","props":{"y":1082,"x":1,"var":"sk","url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":0,"preview":false,"isLoop":false,"currAniName":"pingju"}},{"type":"Box","props":{"y":606,"x":558,"width":631,"var":"boxContainer","height":230},"child":[{"type":"Box","props":{"y":15,"x":9},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1.","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":14,"x":167},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":15,"x":327},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":15,"x":484},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":79,"x":9},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":79,"x":167},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":79,"x":326},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":79,"x":484},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":144,"x":9},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":144,"x":167},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"1","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":144,"x":330},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"11","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]},{"type":"Box","props":{"y":144,"x":484},"child":[{"type":"Image","props":{"skin":"share_extend/ui/littlePeaPK/img_di.png"}},{"type":"FontClip","props":{"y":13,"x":19,"value":"12","skin":"share_extend/ui/littlePeaPK/img_sz_6.png","sheet":"1234567890.","name":"fontClip"}},{"type":"Image","props":{"y":3,"x":73,"skin":"share_extend/ui/littlePeaPK/img_wandou.png","scaleY":0.8,"scaleX":0.8,"name":"imgZQ"}},{"type":"Image","props":{"y":11,"x":83,"skin":"share_extend/ui/littlePeaPK/img_cuowu.png","scaleY":0.8,"scaleX":0.8,"name":"imgCW"}}]}]},{"type":"Image","props":{"y":866,"x":614,"skin":"share_extend/ui/littlePeaPK/img_wz.png"}},{"type":"FontClip","props":{"y":878,"x":902,"var":"fontAnserMax","value":"5","skin":"share_extend/ui/littlePeaPK/img_sz4.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5}}]};
	return ResultPKViewUI;
})(View)


//class com.extend.module.littlePeaPK.ui.TimeOverNoAnswerTipsPKViewUI extends laya.ui.View
var TimeOverNoAnswerTipsPKViewUI=(function(_super){
	function TimeOverNoAnswerTipsPKViewUI(){
		this.sk=null;
		TimeOverNoAnswerTipsPKViewUI.__super.call(this);
	}

	__class(TimeOverNoAnswerTipsPKViewUI,'com.extend.module.littlePeaPK.ui.TimeOverNoAnswerTipsPKViewUI',_super);
	var __proto=TimeOverNoAnswerTipsPKViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(TimeOverNoAnswerTipsPKViewUI.uiView);
	}

	TimeOverNoAnswerTipsPKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Box","props":{"width":1920,"name":"bg","height":1080,"alpha":0.75},"child":[{"type":"Rect","props":{"width":1920,"lineWidth":1,"height":1080,"fillColor":"#000000"}}]},{"type":"SkeletonPlayer","props":{"y":717,"x":966,"var":"sk","url":"share_extend/animation/littlePeaPK/qkld/qkld.sk","stopAt":1,"preview":true,"isLoop":"false","currAniName":"wrong2"}}]};
	return TimeOverNoAnswerTipsPKViewUI;
})(View)


//class com.extend.module.littlePeaPK.ui.TopTitlePKViewUI extends laya.ui.View
var TopTitlePKViewUI=(function(_super){
	function TopTitlePKViewUI(){
		this.rightNumSelf=null;
		this.rightNumAI=null;
		this.boxResultsSelf=null;
		this.boxResultsAI=null;
		this.skAI=null;
		TopTitlePKViewUI.__super.call(this);
	}

	__class(TopTitlePKViewUI,'com.extend.module.littlePeaPK.ui.TopTitlePKViewUI',_super);
	var __proto=TopTitlePKViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(TopTitlePKViewUI.uiView);
	}

	TopTitlePKViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":36,"x":204,"width":1499,"skin":"share_extend/ui/littlePeaPK/img_dj.png","height":202}},{"type":"Image","props":{"y":37,"x":1658,"skin":"share_extend/ui/littlePeaPK/img_bgck.png","name":"imgAIBg"}},{"type":"FontClip","props":{"y":135,"x":815,"var":"rightNumSelf","value":"12","skin":"share_extend/ui/littlePeaPK/img_sz4.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5}},{"type":"FontClip","props":{"y":134,"x":1088,"var":"rightNumAI","value":"11","skin":"share_extend/ui/littlePeaPK/img_sz3.png","sheet":"1234567890","anchorY":0.5,"anchorX":0.5}},{"type":"Image","props":{"y":108,"x":921,"skin":"share_extend/ui/littlePeaPK/img_jiangbei_x.png"}},{"type":"Image","props":{"y":120,"x":273,"skin":"share_extend/ui/littlePeaPK/img_xx.png","name":"imgLinesSelf"}},{"type":"Box","props":{"var":"boxResultsSelf"},"child":[{"type":"SkeletonPlayer","props":{"y":98,"x":298,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult0","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":98,"x":373,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult1","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":98,"x":453,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult2","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":98,"x":528,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult3","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":98,"x":607,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult4","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":98,"x":683,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult5","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":298,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult6","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":373,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult7","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":453,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult8","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":528,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult9","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":607,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult10","isLoop":"false","currAniName":"right"}},{"type":"SkeletonPlayer","props":{"y":168,"x":683,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult11","isLoop":"false","currAniName":"right"}}]},{"type":"Image","props":{"y":120,"x":1190,"skin":"share_extend/ui/littlePeaPK/img_xx.png","name":"imgLinesAI"}},{"type":"Box","props":{"y":0,"x":917,"var":"boxResultsAI"},"child":[{"type":"SkeletonPlayer","props":{"y":98,"x":298,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult0","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":98,"x":373,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult1","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":98,"x":453,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult2","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":98,"x":528,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult3","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":98,"x":607,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult4","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":98,"x":683,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult5","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":298,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult6","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":373,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult7","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":453,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult8","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":528,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult9","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":607,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult10","isLoop":"false","currAniName":"right2"}},{"type":"SkeletonPlayer","props":{"y":168,"x":683,"url":"share_extend/animation/littlePeaPK/ui/ui.sk","stopAt":1,"preview":true,"name":"skResult11","isLoop":"false","currAniName":"right2"}}]},{"type":"SkeletonPlayer","props":{"y":202,"x":1775,"var":"skAI","url":"share_extend/animation/littlePeaPK/qkld/qkld.sk","stopAt":1,"scaleY":0.35,"scaleX":0.35,"preview":true,"isLoop":"false","currAniName":"idle"}}]};
	return TopTitlePKViewUI;
})(View)


//class com.extend.module.newSpecialEvaluation.ui.SpecialEvaBgViewUI extends laya.ui.View
var SpecialEvaBgViewUI=(function(_super){
	function SpecialEvaBgViewUI(){
		this.imgBg=null;
		this.imgDianchidi=null;
		this.skShouzhi=null;
		this.skChongdianxian=null;
		this.skChongdianchi=null;
		SpecialEvaBgViewUI.__super.call(this);
	}

	__class(SpecialEvaBgViewUI,'com.extend.module.newSpecialEvaluation.ui.SpecialEvaBgViewUI',_super);
	var __proto=SpecialEvaBgViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(SpecialEvaBgViewUI.uiView);
	}

	SpecialEvaBgViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"Image","props":{"y":0,"x":0,"var":"imgBg","skin":"share_extend/ui/specialEvaluation/beijing.jpg","scaleY":4,"scaleX":4,"name":"imgBg"}},{"type":"Image","props":{"y":904,"x":441,"width":1270,"var":"imgDianchidi","skin":"share_extend/ui/specialEvaluation/chidao.png","scaleY":2,"name":"imgDianchidi","height":73}},{"type":"SkeletonPlayer","props":{"y":453,"x":996,"var":"skShouzhi","url":"share_extend/animation/specialEvaluation/guide/sz.sk","stopAt":0,"preview":false,"mouseEnabled":false,"isLoop":"false","currAniName":"dianji"}},{"type":"SkeletonPlayer","props":{"y":1077,"x":0,"var":"skChongdianxian","url":"share_extend/animation/specialEvaluation/chongdianxian/cdx.sk","stopAt":1,"preview":"false","isLoop":"false","currAniName":"chongdian"}},{"type":"SkeletonPlayer","props":{"y":1081,"x":1,"var":"skChongdianchi","url":"share_extend/animation/specialEvaluation/chongdianchi/cdc.sk","stopAt":0,"preview":false,"isLoop":"false","currAniName":"jin1"}}]};
	return SpecialEvaBgViewUI;
})(View)


//class com.extend.module.newSpecialEvaluation.ui.SpecialEvaLediAniViewUI extends laya.ui.View
var SpecialEvaLediAniViewUI=(function(_super){
	function SpecialEvaLediAniViewUI(){
		this.skLedi=null;
		SpecialEvaLediAniViewUI.__super.call(this);
	}

	__class(SpecialEvaLediAniViewUI,'com.extend.module.newSpecialEvaluation.ui.SpecialEvaLediAniViewUI',_super);
	var __proto=SpecialEvaLediAniViewUI.prototype;
	__proto.createChildren=function(){
		View.regComponent("SkeletonPlayer",KlSkeleton1);
		laya.ui.Component.prototype.createChildren.call(this);
		this.createView(SpecialEvaLediAniViewUI.uiView);
	}

	SpecialEvaLediAniViewUI.uiView={"type":"View","props":{"width":1920,"height":1080},"child":[{"type":"SkeletonPlayer","props":{"y":1079,"x":-3,"var":"skLedi","url":"share_extend/animation/specialEvaluation/ledi/ledizm.sk","stopAt":1,"preview":"false","isLoop":"false","currAniName":"idle_12"}}]};
	return SpecialEvaLediAniViewUI;
})(View)


//class com.extend.module.interactionClass.container.InteractionClassMainContainer extends com.extend.core.ui.BaseViewContainer
var InteractionClassMainContainer=(function(_super){
	function InteractionClassMainContainer(module){
		// private var xiaofeixiaFeedbackContainer:XiaofeixiaFeedbackContainer;
		this.labStarPt=null;
		this.callBackHandler=null;
		this.needPlayMC=false;
		this.testSk=null;
		var preLoadArray=[
		{url:"res/atlas/share_extend/ui.png",type:"image"},
		{url:"res/atlas/share_extend/ui.atlas",type:"atlas"},
		{url:"share_extend/animation/interactionClass/feedback/fankui.png",type:"image"},
		{url:"share_extend/animation/interactionClass/feedback/fankui.sk",type:"arraybuffer"},
		{url:"share_extend/animation/interactionClass/feedback/hua.wav",type:"sound"},
		{url:"share_extend/animation/interactionClass/feedback/jg_01.wav",type:"sound"},
		{url:"share_extend/animation/interactionClass/feedback/ld01.wav",type:"sound"},
		{url:"share_extend/animation/interactionClass/feedback/ld02.wav",type:"sound"},
		{url:"share_extend/animation/interactionClass/feedback/ld03.wav",type:"sound"},
		{url:"share_extend/animation/interactionClass/feedback/sl.wav",type:"sound"},];
		var cla=InteractionClassUI;
		this.mouseThrough=false;
		this.mouseEnabled=true;
		InteractionClassMainContainer.__super.call(this,module,cla,preLoadArray);
	}

	__class(InteractionClassMainContainer,'com.extend.module.interactionClass.container.InteractionClassMainContainer',_super);
	var __proto=InteractionClassMainContainer.prototype;
	__proto.getModule=function(){
		return this.module;
	}

	__proto.getContent=function(){
		return this.content;
	}

	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.initComp();
	}

	__proto.initComp=function(){
		var content=this.getContent();
		content.labStar.text=this.getModule().star+"";
		content.labAddStar.visible=false;
		content.sk.visible=false;
		content.boxBg.alpha=0.5;
		content.boxBg.visible=false;
		content.lab.visible=false;
		this.labStarPt=new Point(content.labAddStar.x,content.labAddStar.y);
		this.mouseEnabled=false;
		this.mouseThrough=true;
	}

	/////////////////////////////////////数据更新////////////////////////////////
	__proto.updateStar=function(){
		var content=this.getContent();
		content.labStar.text=this.getModule().star+"";
	}

	// }
	__proto.playSkMovieClip=function(addStar,realAddStar,callBack){
		if(!this.isComplete()){
			Laya.timer.clear(this,this.playSkMovieClip);
			Laya.timer.once(1000,this,this.playSkMovieClip,[addStar,realAddStar]);
			return;
		}
		this.callBackHandler=callBack;
		var content=this.getContent();
		VipThink.viewMgr.showObstacleView=true;
		content.boxBg.visible=true;
		content.sk.visible=true;
		console.log("playSkMovieClip:",addStar,realAddStar);
		content.sk.once("end",this,function(addStar,realAddStar){
			this.onSkPlayComplete(addStar,realAddStar);
		},[addStar,realAddStar]);
		var aniName=addStar+"x";
		content.sk.play(aniName,false);
		var starMax=this.getModule().isCurrentStarMax();
		if(starMax && realAddStar==0){
			Laya.timer.once(2000,this,function(){
				this.getContent().lab.visible=true;
			});
			}else{
			this.getContent().lab.visible=false;
		}
	}

	// }
	__proto.onSkPlayComplete=function(addStar,realAddStar){
		var content=this.getContent();
		content.labAddStar.visible=true;
		content.labAddStar.x=this.labStarPt.x;
		content.labAddStar.y=this.labStarPt.y;
		content.labAddStar.text="+"+realAddStar;
		content.lab.visible=false;
		Tween.to(content.labAddStar,{y:this.labStarPt.y-100},500,null,Handler.create(this,function(){
			this.effectEndHandler(addStar,realAddStar);
		}));
	}

	__proto.effectEndHandler=function(addStar,realAddStar){
		var content=this.getContent();
		VipThink.viewMgr.showObstacleView=false;
		content.sk.visible=false;
		content.boxBg.visible=false;
		content.labAddStar.visible=false;
		content.labStar.text=this.getModule().star+"";
		var currentStar=this.getModule().currentStar;
		var star=this.getModule().star;
		var wrongTimes=this.getModule().wrongTimes;
		var data={
			args:{
				type:"interactiveClass",
				data:{
					act:"addStar",
					data:{addStar:addStar,currentStar:currentStar,star:star,wrongTimes:wrongTimes}
				}
			}
		};
		this.getModule().noticeNative(data);
		console.log("发送加星星消息给原生:",data);
		if(this.getModule().isLastLesson()){
			var data={
				args:{
					type:"interactiveClass",
					data:{
						act:"complete"
					}
			}};
			this.getModule().noticeNative(data);
		}
		if(this.callBackHandler && (this.callBackHandler instanceof laya.utils.Handler )){
			this.callBackHandler.runWith(this);
			this.callBackHandler=null;
		}
	}

	return InteractionClassMainContainer;
})(BaseViewContainer)


//class com.extend.module.interactionClass.container.XiaofeixiaFeedbackContainer extends com.extend.core.ui.BaseViewContainer
var XiaofeixiaFeedbackContainer=(function(_super){
	function XiaofeixiaFeedbackContainer(module){
		var contentUIClass=XiaofeixiaFeedbackUI;
		var preLoadRes=[
		{url:"share_extend/animation/interactionClass/feedback/xiaofeixia/dd_fkdh.png",type:"image"},
		{url:"share_extend/animation/interactionClass/feedback/xiaofeixia/dd_fkdh.sk",type:"arraybuffer"},];
		XiaofeixiaFeedbackContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(XiaofeixiaFeedbackContainer,'com.extend.module.interactionClass.container.XiaofeixiaFeedbackContainer',_super);
	var __proto=XiaofeixiaFeedbackContainer.prototype;
	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		var content=this.getContent();
		if(content){
			content.visible=false;
		}
	}

	__proto.getContent=function(){
		return this.content;
	}

	__proto.playSkMovieClip=function(callBack){
		if(!this.isComplete()){
			Laya.timer.clear(this,this.playSkMovieClip);
			Laya.timer.once(1000,this,this.playSkMovieClip,[callBack]);
			return;
		};
		var content=this.getContent();
		if(content){
			content.visible=true;
			content.sk.visible=true;
			content.sk.play("dd_fkdh",false);
			content.sk.once("end",this,function(callBack){
				this.onSkMovieClipEnd(callBack);
			},[callBack]);
		}
	}

	__proto.onSkMovieClipEnd=function(callBack){
		console.debug("onSkMovieClipEnd");
		var content=this.getContent();
		if(content){
			content.visible=false;
			content.sk.visible=false;
		}
		if(this.getModule().isLastLesson()){
			var data={
				args:{
					type:"interactiveClass",
					data:{
						act:"complete"
					}
			}};
			this.getModule().noticeNative(data);
			}else{
			console.log("答题正确反馈动画结束跳关: nextPage");
			var data={args:{
					type:"interactiveClass",
					data:{
						act:"nextPage"
					}
			}}
			this.getModule().noticeNative(data);
		}
		if(callBack && (callBack instanceof laya.utils.Handler )){
			callBack.runWith(this);
		}
	}

	__proto.getModule=function(){
		return this.module;
	}

	return XiaofeixiaFeedbackContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.AIThinkingAniPKViewContainer extends com.extend.core.ui.BaseViewContainer
var AIThinkingAniPKViewContainer=(function(_super){
	function AIThinkingAniPKViewContainer(module){
		var contentUIClass=AIThinkingAniPKViewUI;
		var preLoadRes=[];
		AIThinkingAniPKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(AIThinkingAniPKViewContainer,'com.extend.module.littlePeaPK.container.AIThinkingAniPKViewContainer',_super);
	var __proto=AIThinkingAniPKViewContainer.prototype;
	// this.graphics.drawRect(0,0,1920,1080,0x000000);
	__proto.showAni=function(){
		var content=this.content;
		content.sk.play("idle2",true);
	}

	// }));
	__proto.stopAni=function(){
		var content=this.content;
		content.sk.stopAtStart();
	}

	return AIThinkingAniPKViewContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.CountDownPKViewContainer extends com.extend.core.ui.BaseViewContainer
var CountDownPKViewContainer=(function(_super){
	function CountDownPKViewContainer(module){
		this.concreteContent=null;
		this.startTime=NaN;
		this.endTime=NaN;
		this.totalProgressLen=0;
		var contentUIClass=CountDownPKViewUI;
		var preLoadRes=[];
		CountDownPKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(CountDownPKViewContainer,'com.extend.module.littlePeaPK.container.CountDownPKViewContainer',_super);
	var __proto=CountDownPKViewContainer.prototype;
	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.initData();
		this.registerEvent();
	}

	__proto.initData=function(){
		this.concreteContent=this.content;
		this.totalProgressLen=this.concreteContent.imgClock.x-this.concreteContent.imgProgress.x;
		this.resetCountDown();
	}

	__proto.registerEvent=function(){}
	/**
	*重置倒计时界面为初始状态（未开始倒计时）
	*
	*/
	__proto.resetCountDown=function(){
		this.concreteContent.imgProgressMask.x=0;
		this.concreteContent.leftTime.value=LittlePeaPKDataMgr.ANSWER_ONE_QUESTION_MAX_TIME.toString();
	}

	__proto.stopCountDown=function(){
		console.log("stopCountDown");
		this.timer.clear(this,this.onTimer);
	}

	/**
	*
	*
	*/
	__proto.startCountDown=function(){
		this.resetCountDown();
		this.startTime=Browser.now();
		this.endTime=this.startTime+30 *1000;
		this.timerLoop(1000,this,this.onTimer);
	}

	__proto.onTimer=function(){
		var nowTime=Browser.now();
		if (nowTime < this.endTime){
			var passTime=nowTime-this.startTime;
			this.concreteContent.imgProgressMask.x=passTime / (30 *1000)*this.totalProgressLen;
			this.concreteContent.leftTime.value=Math.ceil((this.endTime-nowTime)/ 1000).toString();
			}else{
			this.timer.clear(this,this.onTimer);
			this.concreteContent.imgProgressMask.x=this.totalProgressLen;
			this.concreteContent.leftTime.value="0";
			KlEventCenter.event("CountdownIsOverLittlePeaPK");
		}
	}

	/**
	*获取从开始倒计时到现在过去了多久（单位毫秒）
	*@return
	*
	*/
	__proto.getPassTime=function(){
		var passTime=Browser.now()-this.startTime;
		return passTime;
	}

	return CountDownPKViewContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.MatchPKViewContainer extends com.extend.core.ui.BaseViewContainer
var MatchPKViewContainer=(function(_super){
	function MatchPKViewContainer(module){
		var contentUIClass=MatchPKViewUI;
		var preLoadRes=[];
		MatchPKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(MatchPKViewContainer,'com.extend.module.littlePeaPK.container.MatchPKViewContainer',_super);
	var __proto=MatchPKViewContainer.prototype;
	__proto.getModule=function(){
		return this.module;
	}

	__proto.getContent=function(){
		return this.content;
	}

	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.initComp();
	}

	__proto.initComp=function(){
		this.switchToPage1();
	}

	__proto.switchToPage1=function(){
		var content=this.getContent();
		content.boxPage1.visible=true;
		content.boxPage2.visible=false;
		var sk=content.sk;
		sk.play(sk.currAniName,true);
		Laya.timer.once(2000,this,this.switchToPage2);
	}

	__proto.switchToPage2=function(){
		var content=this.getContent();
		content.boxPage1.visible=false;
		content.boxPage2.visible=true;
		content.fontClip.value="3";
		var sk=content.sk;
		sk.stop();
		content.imgLu.visible=false;
		Laya.timer.loop(1000,this,this.onTimerStep);
	}

	__proto.onTimerStep=function(){
		var content=this.getContent();
		var count=parseInt(content.fontClip.value);
		if(count > 0){
			var str=content.fontClip.value=(--count)+"";
			}else{
			Laya.timer.clear(this,this.onTimerStep);
			this.getModule().matchComplete();
		}
	}

	return MatchPKViewContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.ResultPKViewContainer extends com.extend.core.ui.BaseViewContainer
var ResultPKViewContainer=(function(_super){
	function ResultPKViewContainer(module){
		this.itemArray=[];
		var contentUIClass=ResultPKViewUI;
		var preLoadRes=[];
		ResultPKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
		this.mouseThrough=false;
	}

	__class(ResultPKViewContainer,'com.extend.module.littlePeaPK.container.ResultPKViewContainer',_super);
	var __proto=ResultPKViewContainer.prototype;
	__proto.getModule=function(){
		return this.module;
	}

	__proto.getContent=function(){
		return this.content;
	}

	/**
	*更新页面
	*/
	__proto.updateView=function(){
		if(!this.isComplete()){
			return;
		};
		var littlePeaPKData=this.getModule().dataMgr;
		var aiAnswerDatas=littlePeaPKData.getAIAllQuestionData();
		var selfAnswerDatas=littlePeaPKData.getSelfQuestionDatas();
		var aiRightCount=0;
		var selfRightCount=0;
		for (var i=0;i < aiAnswerDatas.length;i++){
			if(aiAnswerDatas[i].result==1){
				aiRightCount++;
			}
		}
		for (var j=0;j < selfAnswerDatas.length;j++){
			if(selfAnswerDatas[j].result==1){
				selfRightCount++;
			}
		};
		var aniName;
		if(selfRightCount==aiRightCount){
			aniName="pingju";
			}else if(selfRightCount > aiRightCount){
			aniName="shengli";
			}else{
			aniName="shibai";
		}
		this.getContent().sk.play(aniName,false);
		this.getContent().sk.once("end",this,function(){
			console.log("noticeNative complete");
			var data={args:{
					type:"LittlePeaPK",
					data:{
						act:"complete"
					}
			}}
			this.getModule().noticeNative(data);
		});
		var maxRight=0;
		var tempRight=0;
		for (var k=0;k < 12;k++){
			var dt=selfAnswerDatas[k];
			var box=this.itemArray[k];
			var fontClip=box.getChildByName("fontClip");
			var imgZQ=box.getChildByName("imgZQ");
			var imgCW=box.getChildByName("imgCW");
			fontClip.value=(k+1)+"";
			if(dt){
				if(dt.result==1){
					tempRight++;
					imgZQ.visible=true;
					imgCW.visible=false;
					}else{
					imgZQ.visible=false;
					imgCW.visible=true;
					tempRight=0;
				}
				}else{
				imgZQ.visible=false;
				imgCW.visible=true;
				tempRight=0;
			}
			if(tempRight > maxRight){
				maxRight=tempRight;
			}
		}
		this.getContent().fontAnserMax.value=maxRight+"";
		if(maxRight >=10){
			this.getContent().fontAnserMax.scale(0.7,0.7);
			}else{
			this.getContent().fontAnserMax.scale(1,1);
		}
	}

	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.initComp();
		this.updateView();
	}

	__proto.initComp=function(){
		this.getContent().sk.stop();
		var boxContainer=this.getContent().boxContainer;
		for (var i=0;i < 12;i++){
			var item=boxContainer.getChildAt(i);
			this.itemArray.push(item);
		}
	}

	ResultPKViewContainer.MAX_ITEM_NUM=12;
	return ResultPKViewContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.TimeOverNoAnswerTipsPKViewContainer extends com.extend.core.ui.BaseViewContainer
var TimeOverNoAnswerTipsPKViewContainer=(function(_super){
	function TimeOverNoAnswerTipsPKViewContainer(module){
		var contentUIClass=TimeOverNoAnswerTipsPKViewUI;
		var preLoadRes=[];
		TimeOverNoAnswerTipsPKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(TimeOverNoAnswerTipsPKViewContainer,'com.extend.module.littlePeaPK.container.TimeOverNoAnswerTipsPKViewContainer',_super);
	var __proto=TimeOverNoAnswerTipsPKViewContainer.prototype;
	__proto.showAni=function(){
		var content=this.content;
		if(content){
			content.sk.visible=true;
			content.sk.play("wrong2",false);
			content.sk.on("end",this,function(){
				this.timerOnce(1000,this,function(){
					console.log("wrong2 onAniEnd");
					this.visible=false;
					KlEventCenter.event("AnswerResultAniCompleteLittlePeaPK");
				});
			});
		}
	}

	return TimeOverNoAnswerTipsPKViewContainer;
})(BaseViewContainer)


//class com.extend.module.littlePeaPK.container.TopTitlePKViewContainer extends com.extend.core.ui.BaseViewContainer
var TopTitlePKViewContainer=(function(_super){
	function TopTitlePKViewContainer(module){
		this.concreteContent=null;
		var contentUIClass=TopTitlePKViewUI;
		var preLoadRes=[];
		TopTitlePKViewContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(TopTitlePKViewContainer,'com.extend.module.littlePeaPK.container.TopTitlePKViewContainer',_super);
	var __proto=TopTitlePKViewContainer.prototype;
	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.concreteContent=this.content;
		this.updateView();
	}

	__proto.updateView=function(){
		this.setSelfRightNum(0);
		this.setAIRightNum(0);
		this.hideOnePersonQuestionAnswerResults(this.concreteContent.boxResultsSelf);
		this.hideOnePersonQuestionAnswerResults(this.concreteContent.boxResultsAI);
		this.playAIIdleAni();
	}

	__proto.setSelfRightNum=function(num){
		this.concreteContent.rightNumSelf.value=num.toString();
	}

	__proto.setAIRightNum=function(num){
		this.concreteContent.rightNumAI.value=num.toString();
	}

	__proto.hideOnePersonQuestionAnswerResults=function(boxOnePersonResults){
		if(boxOnePersonResults){
			boxOnePersonResults._childs.forEach(function(child){
				if(child){
					child.visible=false;
				}
			});
		}
	}

	__proto.showAIOneQuestionAnswerResult=function(index,answerResult){
		var boxResults=this.concreteContent.boxResultsAI;
		this.showOneQuestionAnswerResult(boxResults,index,answerResult,false);
	}

	__proto.showSelfOneQuestionAnswerResult=function(index,answerResult){
		var boxResults=this.concreteContent.boxResultsSelf;
		this.showOneQuestionAnswerResult(boxResults,index,answerResult,true);
	}

	__proto.showOneQuestionAnswerResult=function(boxResultsOnePerson,index,answerResult,isSelf){
		if(boxResultsOnePerson){
			var skResult=boxResultsOnePerson.getChildByName("skResult"+index);
			if(skResult){
				var strAniName="";
				var strRightAniName=isSelf ? "right" :"right2";
				var strWrongAniName=isSelf ? "wrong" :"wrong2";
				switch(answerResult){
					case 1:{
							strAniName=strRightAniName;
							break ;
						}
					case 2:{
							strAniName=strWrongAniName;
							break ;
						}
					default :{
							strAniName=strWrongAniName;
							break ;
						}
					}
				skResult.visible=true;
				skResult.play(strAniName,false);
			}
		}
	}

	__proto.playAIIdleAni=function(){
		this.playAIAni("idle",true);
	}

	__proto.playAIThinkAni=function(){
		this.playAIAni("sikao",true);
	}

	__proto.playAIRightAni=function(){
		this.playAIAni("right",false);
	}

	__proto.playAIWrongAni=function(){
		this.playAIAni("wrong",false);
	}

	__proto.playAIAni=function(strAniName,bLoop){
		this.concreteContent.skAI.play(strAniName,bLoop);
	}

	return TopTitlePKViewContainer;
})(BaseViewContainer)


//class com.extend.module.newSpecialEvaluation.container.SpecialEvaluationBgContainer extends com.extend.core.ui.BaseViewContainer
var SpecialEvaluationBgContainer=(function(_super){
	function SpecialEvaluationBgContainer(module){
		var preLoadArray=[
		{url:"res/atlas/share_extend/ui/specialEvaluation.png",type:"image"},
		{url:"res/atlas/share_extend/ui/specialEvaluation.atlas",type:"atlas"},
		{url:"share_extend/animation/specialEvaluation/chongdianchi/cdc.png",type:"image"},
		{url:"share_extend/animation/specialEvaluation/chongdianchi/cdc.sk",type:"arraybuffer"},
		{url:"share_extend/animation/specialEvaluation/chongdianxian/cdx.png",type:"image"},
		{url:"share_extend/animation/specialEvaluation/chongdianxian/cdx.sk",type:"arraybuffer"},
		{url:"share_extend/animation/specialEvaluation/guide/sz.png",type:"image"},
		{url:"share_extend/animation/specialEvaluation/guide/sz.sk",type:"arraybuffer"},];
		var cla=SpecialEvaBgViewUI;
		this.mouseThrough=false;
		this.mouseEnabled=true;
		SpecialEvaluationBgContainer.__super.call(this,module,cla,preLoadArray);
		VipThink.viewMgr.setMainViewVisible(false);
	}

	__class(SpecialEvaluationBgContainer,'com.extend.module.newSpecialEvaluation.container.SpecialEvaluationBgContainer',_super);
	var __proto=SpecialEvaluationBgContainer.prototype;
	/*
	protected function saveSoundFile():void{
		if(!GameLoader.NATIVE_RES_PATH){
			return;
		}
		//将音频存至本地
		for each (var res:Object in this.preLoadRes){
			// _native.sendToNative("logggggg5",res.url+"|"+res.type+"|"+res.isSound);
			if (res["type"]=="sound"){
				var pathInfo:Array=getPathInfo(res["url"]);
				VipThink.nativeAPI.createFolder(pathInfo[0],res.url,function(fullPath:String):void {
					var data:*=Laya.loader.getRes(fullPath);
					// _native.sendToNative("logggggg4","path:"+fullPath+"| vpath: "+URL.formatURL(fullPath)+"| data: "+Boolean(data));
					fullPath=GameLoader.NATIVE_RES_PATH+"/"+fullPath;
					__JS__("fs_writeFileSync(fullPath, data)");
				});
			}
		}
	}

	protected function getPathInfo(url:String):Array {
		var idx:int=url.lastIndexOf("/");
		var inUrl:String=url.substring(0,idx);
		var fileName:String=url.substring(idx+1);
		return [inUrl,fileName];
	}

	override protected function onResLoadComplete():void{
		this.saveSoundFile();
		super.onResLoadComplete();
	}

	*/
	__proto.getContent=function(){
		return this.content;
	}

	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		this.playSkAppear();
	}

	__proto.onClickBg=function(){
		this.setSkShouzhiVisible(false);
		this.stopSkShouzhi();
		this.stopSkLedi();
		this.stopSkChongdianxian();
		var pageNum=VipThink.viewMgr.mainView.pageNum;
		var curPageIdx=VipThink.viewMgr.currPageIdx;
		if(curPageIdx > 0){
			this.playSkLediNormalIdle();
			VipThink.nativeAPI.nextPage();
			this.timerOnce(1000,this,function(){
				VipThink.viewMgr.setMainViewVisible(true);
				VipThink.viewMgr.functionShell.visible=true;
			});
			}else{
			this.playSkLediTiredIdle();
			KlEventCenter.event("StartShowMainViewContent");
			VipThink.viewMgr.setMainViewVisible(true);
			VipThink.viewMgr.functionShell.visible=true;
		}
	}

	/**
	*@param bVisible
	*
	*/
	__proto.setSkShouzhiVisible=function(bVisible){
		console.debug("setSkShouzhiVisible bVisible:"+bVisible ? "true" :"false");
		var content=this.getContent();
		if(content){
			content.skShouzhi.visible=bVisible;
		}
	}

	__proto.stopSkShouzhi=function(){
		console.debug("stopSkShouzhi");
		var content=this.getContent();
		if(content){
			content.skShouzhi.stop();
		}
	}

	__proto.playSkAppear=function(){
		this.playSkChongdianxian("lianjiedianxian");
		this.playSkLeidiStep1();
	}

	__proto.stopSkLedi=function(){
		if(this.getModule()&& this.getModule().getLediAniContainer()){
			this.getModule().getLediAniContainer().stopSkLedi();
		}
	}

	__proto.playSkLeidiStep1=function(){
		this.playSkLedi("zouru",false,this.playSkLeidiStep2,this);
	}

	__proto.playSkLeidiStep2=function(){
		this.playSkLedi("talk_meidian9",false,this.playSkLeidiStep3,this);
	}

	__proto.playSkLeidiStep3=function(){
		this.playSkLedi("talk_chongdian10",false,this.playSkLeidiStep4,this);
	}

	__proto.playSkLeidiStep4=function(){
		this.playSkLedi("talk_chansheng11",false,this.playSkLediTiredIdleAndGuide,this);
	}

	//乐迪疲惫待机动画和手指指引
	__proto.playSkLediTiredIdleAndGuide=function(){
		this.playSkLedi("idle_91011",true);
		this.setSkShouzhiVisible(true);
		this.playSkShouzhi();
		this.addClickHandle();
	}

	__proto.playSkLediNormalIdle=function(){
		if(this.getModule()&& this.getModule().getLediAniContainer()){
			this.getModule().getLediAniContainer().playSkLediNormalIdle();
		}
	}

	__proto.playSkLediTiredIdle=function(){
		if(this.getModule()&& this.getModule().getLediAniContainer()){
			this.getModule().getLediAniContainer().playSkLediTiredIdle();
		}
	}

	__proto.playSkLedi=function(strAniName,bLoop,complete,caller){
		(bLoop===void 0)&& (bLoop=false);
		if(this.getModule()&& this.getModule().getLediAniContainer()){
			this.getModule().getLediAniContainer().playSkLedi(strAniName,bLoop,complete,this);
		}
	}

	__proto.playSkShouzhi=function(){
		var content=this.getContent();
		if(content){
			content.skShouzhi.play("dianji",true);
		}
	}

	__proto.addClickHandle=function(){
		var content=this.getContent();
		if(content){
			content.imgBg.once("click",this,this.onClickBg);
		}
	}

	/**
	*播放充电池电量格前进到第几格动画（从目标上一个格充满到目标格）
	*@step：目标格数（第几格）
	*/
	__proto.playSkChongdianchi=function(step){
		var content=this.getContent();
		if(content){
			var strAniName="jin"+step;
			content.skChongdianchi.play(strAniName,false);
		}
	}

	__proto.stopSkChongdianxian=function(){
		var content=this.getContent();
		if(content){
			content.skChongdianxian.stop();
			content.skChongdianxian.offAll("end");
		}
	}

	__proto.playSkChongdianxian=function(strAniName,bLoop,complete){
		(bLoop===void 0)&& (bLoop=false);
		var content=this.getContent();
		if(content){
			content.skChongdianxian.play(strAniName,bLoop,complete);
			if(complete){
				content.skChongdianxian.once("end",this,function(){
					complete.call(this);
				});
			}
		}
	}

	/**
	*播放答完一半数量题目后播放中间阶段动画
	*/
	__proto.playSkInMiddlePeriod=function(){
		VipThink.viewMgr.setMainViewVisible(false);
		VipThink.viewMgr.functionShell.visible=false;
		this.playSkChongdianxian("chongdian",false,function(){
			if(this.getModule()&& this.getModule().getLediAniContainer()){
				this.playSkLedi("talk_xiexie12",false,this.playSkLediNormalIdle,this);
			}
			this.playSkLedi("talk_xiexie12",false,this.playSkLediNormalIdle,this);
		});
		this.timerOnce(3000,this,function(){
			this.setSkShouzhiVisible(true);
			this.playSkShouzhi();
			this.addClickHandle();
		});
	}

	__proto.playSkInTheEnd=function(rightNum){
		console.debug("playSkInTheEnd rightNum:"+rightNum);
		var strAniName;
		if(rightNum >=7){
			strAniName="";
			this.playSkChongdianxian("chongdian",false,function(){
				this.playSkLedi("jiangluo",false,function(){
					this.playSkLedi("talk_dianlimange13",false,function(){
						this.playSkLedi("talk_kankan16",false,this.onBalanceAniComplete,this);
					},this);
				},this);
			});
			}else if(rightNum >=4){
			this.playSkChongdianxian("chongdian",false,function(){
				this.playSkLedi("talk_dianlijiangjing14",false,function(){
					this.playSkLedi("talk_kankan16",false,this.onBalanceAniComplete,this);
				},this);
			});
			}else{
			this.playSkChongdianxian("chongdian",false,function(){
				this.playSkLedi("talk_xiexie15",false,function(){
					this.playSkLedi("talk_kankan16",false,this.onBalanceAniComplete,this);
				},this);
			});
		}
	}

	//乐迪说话动画并播
	__proto.onBalanceAniComplete=function(){
		KlEventCenter.event("BalanceAniCompleteNewSpecialEvaluation");
	}

	__proto.getModule=function(){
		return this.module;
	}

	return SpecialEvaluationBgContainer;
})(BaseViewContainer)


//class com.extend.module.newSpecialEvaluation.container.SpecialEvaluationLediAniContainer extends com.extend.core.ui.BaseViewContainer
var SpecialEvaluationLediAniContainer=(function(_super){
	function SpecialEvaluationLediAniContainer(module){
		var contentUIClass=SpecialEvaLediAniViewUI;
		var preLoadRes=[
		{url:"share_extend/animation/specialEvaluation/ledi/ledizm.png",type:"image"},
		{url:"share_extend/animation/specialEvaluation/ledi/ledizm.sk",type:"arraybuffer"},];
		SpecialEvaluationLediAniContainer.__super.call(this,module,contentUIClass,preLoadRes);
	}

	__class(SpecialEvaluationLediAniContainer,'com.extend.module.newSpecialEvaluation.container.SpecialEvaluationLediAniContainer',_super);
	var __proto=SpecialEvaluationLediAniContainer.prototype;
	__proto.getContent=function(){
		return this.content;
	}

	/**
	*初始化结束
	***/
	__proto.onComplete=function(){
		console.debug("SpecialEvaluationLediAniContainer onComplete");
		var content=this.getContent();
		if(content){
			content.skLedi.visible=false;
		}
	}

	__proto.stopSkLedi=function(){
		var content=this.getContent();
		if(content){
			content.skLedi.stop();
			content.skLedi.offAll("end");
		}
	}

	__proto.playSkLedi=function(strAniName,bLoop,complete,caller){
		(bLoop===void 0)&& (bLoop=false);
		if(!this.isComplete()){
			Laya.timer.clear(this,this.playSkLedi);
			Laya.timer.once(1000,this,this.playSkLedi,[strAniName,bLoop,complete,caller]);
			return;
		};
		var content=this.getContent();
		if(content){
			content.skLedi.visible=true;
			content.skLedi.play(strAniName,bLoop,complete);
			if(complete){
				content.skLedi.once("end",this,function(){
					complete.call(caller);
				});
			}
		}
	}

	//乐迪疲惫待机动画
	__proto.playSkLediTiredIdle=function(){
		this.playSkLedi("idle_91011",true);
	}

	//乐迪正常待机动画
	__proto.playSkLediNormalIdle=function(){
		this.playSkLedi("idle_12",true);
	}

	__proto.getModule=function(){
		return this.module;
	}

	return SpecialEvaluationLediAniContainer;
})(BaseViewContainer)


	Laya.__init([ActivityBeforeClassModule,VipThinkExtend,RuMenKeModule,NewSpecialEvaluationModule,XiaoFeiXiaInteractionClassModule,RuMenKeHomeworkModule,LittlePeaPKModule,InteractionClassModule,RuMenKeAIRecordModule]);
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