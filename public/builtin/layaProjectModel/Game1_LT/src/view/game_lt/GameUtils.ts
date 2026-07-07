

import KlInputBox = com.klzz.ui.custom.KlInputBox;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import ChoiceBox = com.klzz.ui.custom.ChoiceBox;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
import ScaleButton = com.klzz.ui.custom.ScaleButton;
import DragViewBox = com.klzz.ui.custom.DragViewBox;
import KlView = com.klzz.ui.KlView;
import TwinkleBox = com.klzz.ui.custom.TwinkleBox;
import Event = Laya.Event;
import Image = Laya.Image;
import DragObj = com.klzz.ui.custom.DragView.DragObj;
import DropObj = com.klzz.ui.custom.DragView.DropObj;
import VipThink = com.biz.VipThink;
import ViewEvent = com.biz.ui.ViewEvent;
import KlBox = com.klzz.ui.KlBox;
export class GameUtils {
    static sound_ding = "share/sound/rush_flag.wav";
    static sound_click = "share/sound/btn_click.wav";
    static sound_wrong = "share/sound/anwser_wrong.wav";
    
    //--------------------------------------check  answer-------------------------------------///////////////////
    //用于可以互换答案位置的情况,并且有多组答案(组内的答案才能回换）
    static checkGroupAnswer(_klInputBox:KlInputBox,_answer:string){
        let _anGroupArr = _answer.split("|");
        let wId = this.checkSingleGroup(_klInputBox, _anGroupArr[0]);
        for(let i = 1;i<_anGroupArr.length;++i){
            let w2 = this.checkSingleGroup(_klInputBox, _anGroupArr[i]);
            if(wId.length>w2.length){
                wId = w2;
            }

        }
        return wId;
    }
    //用于可以互换答案位置的情况,并且只有一组答案
    static checkSingleAnswer(_klInputBox:KlInputBox,_answer:string):number[]{
        let wIdArr = this.checkSingleGroup(_klInputBox, _answer);
        return wIdArr;
    }
    static checkSingleGroup(_klInputBox:KlInputBox, _an:string){
        
        let _anArr = _an.split(",");
        if(_klInputBox.numChildren != _anArr.length){
            console.error("_klBox.numChildren != answer num, please check!");
            return null;
        }
        let wIdArr = [];
        let sameNum = 0;
        for(let i=0;i<_klInputBox.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                let hasSame = false;
                for(let j=sameNum;j<_anArr.length;j++){
                    if(_anArr[j] === _kImg.fontClipValue){
                        this.swapValue(_anArr,sameNum, j);
                        sameNum = sameNum + 1;
                        hasSame = true;
                        break;
                    }
                }
                if(!hasSame){
                    wIdArr.push(i);
                }
            }else{
                console.error("_kImg is not exit,please check!");
                return null;
            }
        }
        return wIdArr;
    }

    static swapValue(_swapArr, _swapA:number, _swapB:number){
        let tmp = _swapArr[_swapA];
        _swapArr[_swapA]= _swapArr[_swapB];
        _swapArr[_swapB] = tmp;
    }

    //用于一组答案的判断，并且答案内满足交换律
    static checkAnswerInKlInputImg(_klInputImg:KlInputImage, _anStr:string, _separator:string){
        let _an = _klInputImg.fontClipValue;
        if(_klInputImg.valueOrSkinIsNull){
            return false;
        }
        let _anArr1 = _an.split(_separator);
        let _anArr2 = _anStr.split(_separator);
        if(_anArr1.length != _anArr2.length){
            return false;
        }
        for(let i=0;i<_anArr1.length;++i){
            let hasSame = false;
            for(let j=i;j<_anArr1.length;++j){
                if(_anArr1[i] == _anArr2[j]){
                    this.swapValue(_anArr2, i, j);
                    hasSame = true;
                    break;
                }
            }
            if(!hasSame){
                return false;
            }
        }
        return true;

    }


    /**
     * 分割符|
     */
    static checkWArr(_klInputBox:KlInputBox,_answer:string){
        let tmpStrArr = _answer.split(",");
        let _wArr = []
        for(let i=0;i<tmpStrArr.length;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(!_kImg){
                console.error("_kImg is not exit,please check!");
            }else{
                let tmpStrArr2 = tmpStrArr[i].split("&");
                let hasSame = false;
                for(let j = 0;j<tmpStrArr2.length;j++){
                    if(_kImg.fontClipValue == tmpStrArr2[j]){
                       hasSame = true;
                       break;
                    }
                }
                if(!hasSame){
                    _wArr.push(i);
                }
            }
        }
        return _wArr;
    }
    static checkFirst(_newArr,_oldArr){
        if(_newArr.length != _oldArr.length){
            console.error("_newArr's length != _oldArr's length");
            return false;
        }
        for(let i=0;i<_newArr.length;++i){
            if(_newArr[i] > _oldArr[i]){
                return true;
            }
        }
    }
    //入口
    static checkSpecialAn(_klInputBox:KlInputBox,_answer:string){
        let _anGroup = _answer.split("|");
        let _wArr = this.checkWArr(_klInputBox,_anGroup[0]);
        if(_wArr.length == 0){
            return _wArr;
        }
        for(let i=1;i<_anGroup.length;++i){
            let _wArr1 = this.checkWArr(_klInputBox, _anGroup[i]);
            if(_wArr1.length<_wArr.length){
                _wArr = _wArr1;
            }else if(_wArr1.length == _wArr.length){
                if(this.checkFirst(_wArr1,_wArr)){
                    _wArr = _wArr1;
                }
            }
        }
        return _wArr;

    }
     /**
     * 分割符|
     */

    /**
     * 用与输入框有多组可替换答案
     */
    static checkSingleAn(_klInputImage:KlInputImage, _answer:string, _separator:string):boolean{
        let _anGroup = _answer.split(_separator);
        for(let i=0;i<_anGroup.length;++i){
            if(_klInputImage.fontClipValue == _anGroup[i]){
               return true;
            }
        }
        return false;

    }
    /**
     * 
     */


    /**
     * 用于判断KlInputBox答案2*3*3,2*2*2*3,2*3*3*3，其中*左右两边的数可互换位置
     */
    //入口3  用于判断KlInputBox答案18=2*3*3,24=2*2*2*3,54=2*3*3*3，其中*左右两边的数可互换位置
    static checkSpecialAn3(_klInputBox:KlInputBox,_answer:string,norCheckNum:number, _separator:string){
        let _anGroup = _answer.split(",");
        let _wArr = [];
        for(let i=0;i<_anGroup.length;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(!this.checkKImg3(_kImg, _anGroup[i],norCheckNum, _separator)){
                _wArr.push(i);
            }
        }
        return _wArr;

    }
    static checkKImg3(_klInputImage:KlInputImage, _answer:string,norCheckNum:number, _separator:string):boolean{
        if(norCheckNum>_answer.length){
            return false;
        }
        if(norCheckNum>_klInputImage.fontClipValue.length){
            return false;
        }
        let _inputAn = _klInputImage.fontClipValue.substr(0, norCheckNum);
        let _an1 = _answer.substr(0, norCheckNum);
        if(_inputAn != _an1){
            return false;
        }
        let _inputAn2 = _klInputImage.fontClipValue.substr(norCheckNum);
        let _an2 = _answer.substr(norCheckNum);

        let _anArr = _an2.split(_separator);
        let _inputArr = _inputAn2.split(_separator);
        if(_anArr.length != _inputArr.length){
            return false;
        }
        let right = false;
        for(let i = 0;i<_anArr.length;++i){
            let hasSame = false;
            for(let j = i;j<_anArr.length;++j){
                if(_anArr[i] == _inputArr[j]){
                    //最后一个元素不需要再次交换位置了
                    if(i != _anArr.length-1){
                        let tmp = _inputArr[i];
                        _inputArr[i] = _inputArr[j];
                        _inputArr[j] = tmp;
                    }
                    hasSame = true;
                }
            }
            if(!hasSame){
                return false;
            }
        }
        return true;
    } 
    //入口2  用于判断KlInputBox答案2*3*3,2*2*2*3,2*3*3*3，其中*左右两边的数可互换位置
    static checkSpecialAn2(_klInputBox:KlInputBox,_answer:string, _separator:string){
        let _anGroup = _answer.split(",");
        let _wArr = [];
        for(let i=0;i<_anGroup.length;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            
            if(!this.checkKImg(_kImg, _anGroup[i], _separator)){
                _wArr.push(i);
            }
        }
        return _wArr;

    }
    static checkKImg(_klInputImage:KlInputImage, _answer:string, _separator:string):boolean{
        let _anArr = _answer.split(_separator);
        let _inputArr = _klInputImage.fontClipValue.split(_separator);
        if(_anArr.length != _inputArr.length){
            return false;
        }
        let right = false;
        for(let i = 0;i<_anArr.length;++i){
            let hasSame = false;
            for(let j = i;j<_anArr.length;++j){
                if(_anArr[i] == _inputArr[j]){
                    //最后一个元素不需要再次交换位置了
                    if(i != _anArr.length-1){
                        let tmp = _inputArr[i];
                        _inputArr[i] = _inputArr[j];
                        _inputArr[j] = tmp;
                    }
                    hasSame = true;
                }
            }
            if(!hasSame){
                return false;
            }
        }
        return true;
    }
    /**
     * 
     */
    /////////-----------------------------------check  answer----------------------------------------///////////////////


    /////////-----------------------------------tips or dis box---------------------------------------------///////////////////
    static addTipsOrDisBox(_btnTipsOrDis:SelectableObj, _btnCloseTipsOrDis:ScaleButton, _tipsOrDisBox:Laya.Box,isTips:boolean,_btnConfirm:ScaleButton = null){
        let showTipsOrDisBox = (isShow:boolean)=>{
            _tipsOrDisBox.visible = isShow;
        }
        let onBtnTipsOrDis = ()=>{
            if(isTips){
                com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
            }
            showTipsOrDisBox(_btnTipsOrDis.isSelected);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnTipsOrDis.isSelected;
            }
        }
        let onBtnCloseTipsOrDis = ()=>{
            _btnTipsOrDis.isSelected = false;
            showTipsOrDisBox(_btnTipsOrDis.isSelected);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnTipsOrDis.isSelected;
            }
        }
        _btnTipsOrDis.on(Event.CLICK, this, onBtnTipsOrDis);
        _btnCloseTipsOrDis.on(Event.CLICK, this, onBtnCloseTipsOrDis);
        showTipsOrDisBox(false);
    }

    static addTipsAndDisBox( _btnTips:SelectableObj, _btnCloseTips:ScaleButton, _tipsBox:Laya.Box, _btnDis:SelectableObj, _btnCloseDis:ScaleButton, _disBox:Laya.Box,_btnConfirm:ScaleButton = null){
        
        let showDisBox = (isShow:boolean)=>{
            _disBox.visible = isShow;
        }
        let showTipsBox = (isShow:boolean)=>{
            _tipsBox.visible = isShow;
        }

        let onBtnDis = ()=>{
            showDisBox(_btnDis.isSelected);
            _btnTips.isSelected = false;
            showTipsBox(false);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnDis.isSelected;
            }
        }
        let onBtnCloseDis = ()=>{
            _btnDis.isSelected = false;
            showDisBox(_btnDis.isSelected);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnDis.isSelected;
            }
        }

        let onBtnTips = ()=>{
            com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
            showTipsBox(_btnTips.isSelected);
            _btnDis.isSelected = false;
            showDisBox(false);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnTips.isSelected;
            }
        }
        let onBtnCloseTips = ()=>{
            _btnTips.isSelected = false;
            showTipsBox(_btnTips.isSelected);
            if(_btnConfirm){
                _btnConfirm.visible = !_btnTips.isSelected;
            }
        }
        _btnTips.on(Event.CLICK, this, onBtnTips);
        _btnCloseTips.on(Event.CLICK, this, onBtnCloseTips);

        _btnDis.on(Event.CLICK, this, onBtnDis);
        _btnCloseDis.on(Event.CLICK, this, onBtnCloseDis);
        showTipsBox(false);
        showDisBox(false);
    }

    static addBtnShow(_btn:SelectableObj, _btnClose:ScaleButton = null,_sceneBox:Laya.Box,isTips:boolean = false, syncDone:Function = null, syncClose:Function = null, _view:KlView = null){
       
        let showBtnBox = (isShow:boolean)=>{
            _sceneBox.visible = isShow;
            if(isShow){
                syncDone && syncDone.call(_view);
            }else{
                syncClose && syncClose.call(_view);
            }
        }
        let onBtn = ()=>{
            if(isTips){
                com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
            }
            showBtnBox(_btn.isSelected);
        }
        let onBtnClose = ()=>{
            _btn.isSelected = false;
            showBtnBox(_btn.isSelected);
        }
        
        _btn.on(Event.CLICK, this, onBtn);
        if(_btnClose){
            _btnClose.on(Event.CLICK, this, onBtnClose);
        }
        showBtnBox(false);
    }
    static addBtnShow2(_btn:ScaleButton, _btnClose:ScaleButton = null,_sceneBox:Laya.Box,isTips:boolean = false, _btnConfirm:ScaleButton = null, syncDone:Function = null, _view:KlView = null){
       
        let showBtnBox = ()=>{
            let _light:Laya.Image = _btn.getChildAt(0) as Laya.Image;
            if(_light){
                if(_light.visible){
                    _light.visible = false;
                }else{
                    _light.visible = true;
                }
                _sceneBox.visible = _light.visible;
                if(_btnConfirm){
                    _btnConfirm.visible = !_sceneBox.visible;
                }
            }
            
        }
        let onBtn = ()=>{
            if(isTips){
                com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
            }
            showBtnBox();
            if(syncDone && _view){
                syncDone.call(_view);
            }
        }
        let onBtnClose = ()=>{
            let _light:Laya.Image = _btn.getChildAt(0) as Laya.Image;
            if(_light){
                _light.visible = false;
            }
            _sceneBox.visible = false;
            if(_btnConfirm){
                _btnConfirm.visible = true;
            }
        }
        
        _btn.on(Event.CLICK, this, onBtn);
        if(_btnClose){
            _btnClose.on(Event.CLICK, this, onBtnClose);
        }
        _sceneBox.visible = false;
    }
    /////////-----------------------------------tips or dis box----------------------------------------------///////////////////

    /////////-----------------------------------Draw function----------------------------------------------///////////////////
    static initDraw(_view:KlView, _btnDraw:SelectableObj, _btnReFresh:ScaleButton, _newBrushSp:any){
        let onBtnDraw = ()=>{
            _newBrushSp.visible = _btnDraw.isSelected;
            _btnReFresh.visible = _btnDraw.isSelected;
        }
        let onBtnReFresh = ()=>{
            _newBrushSp.undoDraw();
        }
        _btnDraw.on(Event.CLICK, _view, onBtnDraw);
        _btnReFresh.on(Event.CLICK, _view, onBtnReFresh);
    }
    /////////-----------------------------------Draw function-----------------------//////////////////////////////////

    /////////-----------------------------------confirm btn-----------------------//////////////////////////////////
    /**只用于初始话确定按钮*/
    static addConfirm(_view:KlView, _btnConfirm:ScaleButton,  _klInputBox:KlInputBox, _lockBox:Laya.Box = null){
        let onBtnConfirm = ()=>{
            if(_klInputBox.isRight()){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    _view.mouseEnabled = false;
                }
                _view.showAnswerFace(1);
            }else{
                _view.showAnswerFace(2);
                this.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
    }
    /**用于口才初始化确定按钮以及判定框 */
    static initConfirmCH(_view:KlView, _btnConfirm:ScaleButton,  _klInputBox:KlInputBox, _hook:Image=null,_lockBox:Laya.Box = null,playRightAni?:Function,playWrong?:Function,otherCb?:Function){
        let onBtnConfirm = ()=>{
            if(_klInputBox.isRight()){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    // _view.mouseEnabled = false;
                }
                if(_hook){
                    _hook.visible = true;
                }
                this.showHook(_klInputBox);
                if(playRightAni){
                    playRightAni.call(_view);
                }
              
            }else{
                if(playWrong){
                    playWrong.call(_view);
                }
                this.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips(_klInputBox);
        this.registerInputHit(_klInputBox,otherCb,_view);
    }
    /**用于初始化确定按钮以及判定框 */
    static initConfirm(_view:KlView, _btnConfirm:ScaleButton,  _klInputBox:KlInputBox, _hook:Image=null,_lockBox:Laya.Box = null,otherCb?:Function,doBeforeAFace?:Function, doAfterAFace?:Function){
        let onBtnConfirm = ()=>{
            if(_klInputBox.isRight()){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    // _view.mouseEnabled = false;
                }
                if(_hook){
                    _hook.visible = true;
                }
                this.showHook(_klInputBox);
                if(doBeforeAFace){
                    doBeforeAFace.call(_view);
                }
                _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
            }else{
                _view.showAnswerFace(2);
                this.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips(_klInputBox);
        this.registerInputHit(_klInputBox,otherCb,_view);
    }
     /**用于初始化确定按钮以及判定框 */
     static initConfirm2(_view:KlView, _btnConfirm:ScaleButton,  _klInputBox:KlInputBox, _hook:Image=null,_lockBox:Laya.Box = null,otherCb?:Function,doAfterAFace?:Function){
        let onBtnConfirm = ()=>{
            if(_klInputBox.isRight()){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    _view.mouseEnabled = false;
                }
                if(_hook){
                    _hook.visible = true;
                }
                this.showHook(_klInputBox);
                _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
            }else{
                _view.showAnswerFace(2);
                this.showWrongTips2(_klInputBox, _klInputBox.getWrongIdx());
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        // this.resetWrongTips(_klInputBox);
        // this.registerInputHit(_klInputBox,otherCb,_view);
    }
    /**用于初始化确定按钮以及判定框 */
    static initConfirm3(_view:KlView, _btnConfirm:ScaleButton,  _choiceBox:ChoiceBox, _showWrongTips:boolean = true,_lockBox:Laya.Box = null,otherCb?:Function,doAfterAFace?:Function){
        let onBtnConfirm = ()=>{
            if(_choiceBox.isRight){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    _view.mouseEnabled = false;
                }
                _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
            }else{
                _view.showAnswerFace(2);
                if(_showWrongTips){
                    for(let i = 0;i<_choiceBox.numChildren;++i){
                        let _sele:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
                        if(_sele && _sele.isSelected){
                            let wImg:Laya.Image = _sele.getChildByName("wrong") as Laya.Image;
                            if(wImg){
                                wImg.visible = true;
                            }
                        }
                    }
                }
            }
        }
        let onHitSele = ()=>{
            for(let i = 0;i<_choiceBox.numChildren;++i){
                let _sele:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
                if(_sele){
                    let wImg:Laya.Image = _sele.getChildByName("wrong") as Laya.Image;
                    if(wImg){
                        wImg.visible = false;
                    }
                }
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        for(let i = 0;i<_choiceBox.numChildren;++i){
            let _sele:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
            if(_sele){
                _sele.on(Laya.Event.CLICK, this, onHitSele);
            }
        }
       
    }
    /**
     * 用于初始化有分数判定框的确定按钮以及判定框
     * 
     * 
     */
    static initFractionConfirm(_view:KlView, _btnConfirm:ScaleButton, _klInputBox:KlInputBox, _klInputBox1:KlInputBox,specialStr:string, _lockBox:Laya.Box = null){
        this.initFractionBox(_klInputBox, _klInputBox1, specialStr);
        this.resetWrongTips(_klInputBox)
        
        let onBtnConfirm = ()=>{
            let isRight = true;
            if(_klInputBox.answer !=null && _klInputBox1.answer != null){
                isRight = _klInputBox.isRight() || _klInputBox1.isRight();
            }else{
                let _checkInputBox:KlInputBox = _klInputBox.answer == null? _klInputBox1:_klInputBox;
                isRight = _checkInputBox.isRight();
            }
            if(isRight){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    _view.mouseEnabled = false;
                }
                _view.showAnswerFace(1);
            }else{
                _view.showAnswerFace(2);
                this.showWrongTips(_klInputBox, [0]);
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
    }
    /**
     * 
     * 用于初始化FractionInput组件的确定按钮以及判定框
     * 
     */
    static initFractionConfirm2(_view:KlView, _btnConfirm:ScaleButton, _klInputBox:KlInputBox, cb?:Function, _lockBox?:Laya.Box,_rightTips?:Laya.Box){
        this.resetWrongTips(_klInputBox);
        this.registerInputHit(_klInputBox);
    
        let onBtnConfirm = ()=>{
            if(_klInputBox.isRight()){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    _view.mouseEnabled = false;
                }
                if(_rightTips){
                    _rightTips.visible = true;
                    _btnConfirm.visible = false;
                }
                if(cb) cb.call(_view);
                _view.showAnswerFace(1);
            }else{
                _view.showAnswerFace(2);
                this.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
    }
     /**
     * 
     * 用于口才初始化ChoiceBox组件的确定按钮以及判定
     * 
     */
    static initChoiceBoxConfirmCH(_view:KlView, _btnConfirm:ScaleButton,  _choiceBox:ChoiceBox, _hook:Image=null,_lockBox:Laya.Box = null,playRightAni?:Function, playWrongAni?:Function,otherCb?:Function){
       
    
        let onBtnConfirm = ()=>{
            if(_choiceBox.isRight){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    // _view.mouseEnabled = false;
                }
                if(_hook){
                    _hook.visible = true;
                }
               
                if(playRightAni){
                    playRightAni.call(_view);
                }
                
            }else{
                 if(playWrongAni){
                    playWrongAni.call(_view);
                }
                for(let i = 0;i<_choiceBox.numChildren;++i){
                    let _sele:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
                    if(_sele.isSelected){
                        this.showWrongTipsBySeleObj(_sele, true);
                    }
                }
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips2(_choiceBox);
        this.registerSeleObjHit(_choiceBox);
    }
    /**
     * 
     * 用于初始化ChoiceBox组件的确定按钮以及判定
     * 
     */
    static initChoiceBoxConfirm(_view:KlView, _btnConfirm:ScaleButton,  _choiceBox:ChoiceBox, _hook:Image=null,_lockBox:Laya.Box = null,otherCb?:Function,doBeforeAFace?:Function, doAfterAFace?:Function){
       
    
        let onBtnConfirm = ()=>{
            if(_choiceBox.isRight){
                if(_lockBox){
                    _lockBox.visible = true;
                }else{
                    // _view.mouseEnabled = false;
                }
                if(_hook){
                    _hook.visible = true;
                }
               
                if(doBeforeAFace){
                    doBeforeAFace.call(_view);
                }
                _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
            }else{
                _view.showAnswerFace(2);
                for(let i = 0;i<_choiceBox.numChildren;++i){
                    let _sele:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
                    if(_sele.isSelected){
                        this.showWrongTipsBySeleObj(_sele, true);
                    }
                }
            }
        }
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips2(_choiceBox);
        this.registerSeleObjHit(_choiceBox);
    }
    /////////-----------------------------------confirm btn-----------------------//////////////////////////////////

    /////////-----------------------------------klInputBox reset input size---------------------------------------///////////////////
    static resetKlInputSize(_klInputBox:KlInputBox,_scaleN:number){
        for(let i=0;i<_klInputBox.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.fontClip.scale(_scaleN,_scaleN);
            }
        }
    }
    static resetInputBoxSize(_inputBox:Laya.Box,_scaleN:number){
        for(let i=0;i<_inputBox.numChildren;++i){
            let _kImg:KlInputImage = _inputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.fontClip.scale(_scaleN,_scaleN);
            }
        }
    }
    static resetInputImgSize(_parent, _scaleN:number){
        for(let i=0;i<_parent.numChildren;++i){
            let _item = _parent.getChildAt(i);
            if(_item && _item instanceof KlInputImage){
                _item.fontClip.scale(_scaleN,_scaleN);
            }
        }
    }
    static resetSingleInputImgSize(_klImg:KlInputImage, _scaleN:number){
        _klImg.fontClip.scale(_scaleN,_scaleN);
    }
    /////////-----------------------------------klInputBox reset input size---------------------------------------///////////////////


    /////////-----------------------------------klInputBox wrong Tips---------------------------------------///////////////////
    static resetWrongTips2(_choiceBox:ChoiceBox){
        for(let i=0;i<_choiceBox.numChildren;++i){
            let _item:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
            if(_item){
                this.showWrongTipsBySeleObj(_item, false);
            }
        }
    }
    static resetWrongTips(_klInputBox:KlInputBox){
        for(let i=0;i<_klInputBox.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                this.showWrongTipsByKImg(_kImg, false);
            }
        }
    }
    static resetWrongTipsInBox(_inputBox:Laya.Box){
        for(let i=0;i<_inputBox.numChildren;++i){
            let _kImg:KlInputImage = _inputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                this.showWrongTipsByKImg(_kImg, false);
            }
        }
    }
    static showWrongTipsByKImg(_kImg:KlInputImage, isShow:boolean){
        let _wImg:Image = _kImg.getChildByName("wrong") as Image;
        if(_wImg){
            _wImg.visible = isShow;
        }
    }
    static showWrongTipsBySeleObj(_seleObj:SelectableObj, isShow:boolean){
        let _wImg:Image = _seleObj.getChildByName("wrong") as Image;
        if(_wImg){
            _wImg.visible = isShow;
        }
    }
    static registerSeleObjHit(_choiceBox:ChoiceBox,otherCb?:Function,_view?:KlView){
        let doFunc = (_seleObj:SelectableObj, isShow:boolean)=>{
            for(let i=0;i<_choiceBox.numChildren;++i){
                let _seleObj:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
                if(_seleObj){
                    this.showWrongTipsBySeleObj(_seleObj, isShow);
                }
            }
            if(otherCb && _view){
                otherCb.call(_view);
            }
        }
        for(let i=0;i<_choiceBox.numChildren;++i){
            let _seleObj:SelectableObj = _choiceBox.getChildAt(i) as SelectableObj;
            if(_seleObj){
                _seleObj.on(Event.CLICK, this, doFunc,[_seleObj, false]);
            }
        }
    }
    static registerInputHit(_klInputBox:KlInputBox,otherCb?:Function,_view?:KlView){
        let doFunc = (_klImg:KlInputImage, isShow:boolean)=>{
            this.showWrongTipsByKImg(_klImg, isShow);
            if(otherCb && _view){
                otherCb.call(_view);
            }
        }
        for(let i=0;i<_klInputBox.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.on(Event.CLICK, this, doFunc,[_kImg, false]);
            }
        }
    }
    static registerInputBoxHit(_box:Laya.Box,otherCb?:Function,_view?:KlView){
        let doFunc = (_klImg:KlInputImage, isShow:boolean)=>{
            this.showWrongTipsByKImg(_klImg, isShow);
            if(otherCb && _view){
                otherCb.call(_view);
            }
        }
        for(let i=0;i<_box.numChildren;++i){
            let _kImg:KlInputImage = _box.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.on(Event.CLICK, this, doFunc,[_kImg, false]);
            }
        }
    }
    static registerKImgHit(_kImg:KlInputImage,otherCb?:Function,_view?:KlView){
        let doFunc = (_klImg:KlInputImage, isShow:boolean)=>{
            this.showWrongTipsByKImg(_klImg, isShow);
            if(otherCb && _view){
                otherCb.call(_view);
            }
        }
        if(_kImg){
            _kImg.on(Event.CLICK, this, doFunc,[_kImg, false]);
        }
    }
    static showWrongTips(_klInputBox:KlInputBox, wArr:Array<number>){
        for(let i = 0;i<wArr.length;++i){
            let _klImg:KlInputImage = _klInputBox.getChildAt(wArr[i]) as KlInputImage;
            if(_klImg){
                this.showWrongTipsByKImg(_klImg, true);
            }
        }
    }
     static showWrongTips2(_klInputBox:KlInputBox, wArr:Array<number>){
        for(let i = 0;i<wArr.length;++i){
            let _klImg:KlInputImage = _klInputBox.getChildAt(wArr[i]) as KlInputImage;
            if(_klImg){
                this.showBlinkTipsByKImg(_klImg);
            }
        }
    }
    static showBlinkTipsByKImg(_kImg:KlInputImage){
        if(_kImg){
            let _tw:TwinkleBox = _kImg.getChildByName("tw") as TwinkleBox;
            if(_tw){
                _tw.play("shan", true, 0, 1, 3000);
            }
        }
    }
    static showHook(_klInputBox:KlInputBox){
        for(let i = 0;i<_klInputBox.numChildren;++i){
            let _klImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_klImg){
                let _hook:Laya.Image = _klImg.getChildByName("_hook") as Laya.Image;
                if(_hook){
                    _hook.visible = true;
                }
            }
        }
    }
    /////////-----------------------------------klInputBox wrong Tips---------------------------------------///////////////////

    /////////-----------------------------------klInputBox fraction Tips---------------------------------------///////////////////
    /*
    f为键盘上使用分数的按钮的输出字符串
    */
    static initFractionBox(_klInputBox:KlInputBox, _klInputBox1:KlInputBox,specialStr:string){
        for(let i=0;i<_klInputBox.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.on(Event.CLICK, this, this.showWrongTipsByKImg,[_kImg, false]);
                _kImg.on(KlKeyboardEvent.INPUT_LATER, this, this.onFractionBoxChange,[_kImg,_klInputBox1,specialStr]);
            }
        }
        for(let i=0;i<_klInputBox1.numChildren;++i){
            let _kImg:KlInputImage = _klInputBox1.getChildAt(i) as KlInputImage;
            if(_kImg){
                _kImg.on(Event.CLICK, this, this.resetWrongTips,[_klInputBox]);
            }
        }
        _klInputBox1.visible = false;
    }
    static onFractionBoxChange(_kImg:KlInputImage,_klInputBox1:KlInputBox,specialStr:string){
        let idx = _kImg.fontClipValue.indexOf(specialStr);
        if( idx != -1){
            if(idx == 0){
                _klInputBox1.visible = true;
                for(let i=0;i<_klInputBox1.numChildren;++i){
                    let _kImg:KlInputImage = _klInputBox1.getChildAt(i) as KlInputImage;
                    if(_kImg){
                        _kImg.fontClipValue = " ";
                    }
                }
                _kImg.fontClipValue = specialStr;
            }else{
                _klInputBox1.visible = false;
                _kImg.fontClipValue = _kImg.fontClipValue.substring(0, idx);
            }
        }else{
            _klInputBox1.visible = false;
        }
    }
    static clean
    /////////-----------------------------------klInputBox fraction Tips---------------------------------------///////////////////


    /////////-----------------------------------sync input----------------------------------------///////////////////
    static registerInputSync(_mainInputImg:KlInputImage, _kImg:KlInputImage, cb?:Function, _view?:KlView){
        if(_kImg){
            _kImg.on(KlKeyboardEvent.INPUT_LATER, this, this.syncInput,[_mainInputImg, _kImg, cb, _view]);
        }
    }
    static syncInput(_mainInputImg:KlInputImage, _kImg:KlInputImage, cb?:Function,_view?:KlView){
        if(_mainInputImg && _kImg){
            this.showWrongTipsByKImg(_mainInputImg, false);
            _mainInputImg.fontClipValue = _kImg.fontClipValue;
            if(cb && _view) cb.call(_view);
        }
    }
    /////////-----------------------------------sync input----------------------------------------///////////////////

    
    /////////-----------------------------------zj----------------------------------------///////////////////
    static addSummary(_btnSummary:SelectableObj, _btnBack:ScaleButton, _summary:Laya.Box, _lockBox:Laya.Box){
        let showSummary = (isShow:boolean)=>{
            _summary.visible = isShow;
        }
        let showLockBox = (isShow:boolean)=>{
            _lockBox.visible = isShow;
        }
        let onBtnSummary = ()=>{
            showSummary(true);
        }
        let onBtnBack = ()=>{
            showSummary(false);
        }
        showSummary(false);
        showLockBox(false);
        _btnSummary.on(Event.CLICK,this,onBtnSummary);
        _btnBack.on(Event.CLICK,this,onBtnBack); 

    }
    static addMoveSummary(_view:KlView, _btnSummary:ScaleButton, _btnBack:ScaleButton, _summaryBox:Laya.Box, _lockBox:Laya.Box){
        let showSummary = (isShow:boolean)=>{
            _summaryBox.visible = isShow;
        }
        let showLockBox = (isShow:boolean)=>{
            _lockBox.visible = isShow;
        }
        let onBtnSummary = ()=>{
            let _box:Laya.Box = _summaryBox.getChildAt(1) as Laya.Box;
            let _mask:Laya.Box = _summaryBox.getChildAt(0) as Laya.Box;
            if(_box && _mask){
                showSummary( true);
                _box.x = 1920;
                _mask.visible = true;
                _summaryBox.mouseThrough = false;
                _view.KlTween.toNew(_box, {x:0},500,Laya.Ease.sineInOut);
            }
        }
        let onBtnBack = function():void{
            let _box:Laya.Box = _summaryBox.getChildAt(1) as Laya.Box;
            let _mask:Laya.Box = _summaryBox.getChildAt(0) as Laya.Box;
            if(_box&&_mask){
                _box.x = 0;
                _mask.visible = false;
                _summaryBox.mouseThrough = true;
                _view.KlTween.toNew(_box, {x:1920},500,Laya.Ease.sineInOut);
            }
        }
        _summaryBox.mouseThrough = true;//用于解决授权之后可能不同步造成的无法点击的BUG
        _view.KlTween.isNewMode = true;
        _btnSummary.on(Event.CLICK, _view, onBtnSummary);
        _btnBack.on(Event.CLICK, _view, onBtnBack);
        showSummary(false);
        showLockBox(false);
    }
   
    /////////-----------------------------------zj----------------------------------------///////////////////


    /////////------------------------------------analysis answer-----------------------------/////////////////
    static analysisAnswer(_anStr:string, _separator:string, preStr?:string,lastStr?:string):string{
        let _anArr = _anStr.split(_separator);
        let outArr = [];
        this.analysisCal(_anArr, 0, _anArr.length-1, _separator, outArr);
        let outStr = "";
        for(let i=0;i<outArr.length;++i){
            let tmpStr = outArr[i];
            if(preStr){
                tmpStr = preStr + tmpStr;
            }
            if(lastStr){
                tmpStr = tmpStr + lastStr;
            }
            outStr = outStr + tmpStr;

            if(i!=outArr.length-1){
                outStr = outStr + "&";
            }
        }
        return outStr;
    }
    static analysisCal(_anArr, _start:number, _len:number,_separator:string, outArr){
        if(_start == _len){
            let _str = "";
            for(let i=0;i<=_len;++i){
                _str = _str + _anArr[i];
                if(i != _len){
                    _str = _str + _separator;
                }
            }
            outArr.push(_str);
        }else{
            for(let i=_start;i<=_len;++i){
                this.swapValue(_anArr, _start, i);
                this.analysisCal(_anArr, _start+1, _len,_separator, outArr);
                this.swapValue(_anArr, _start, i);
            }
        }
    }
  
    /////////------------------------------------get all answer-----------------------------/////////////////


    /////////------------------------------------check answer sound-----------------------------/////////////////
    static playRightSound(_view:KlView){
        _view.playSound(this.sound_ding);
    }

    static playWrongSound(_view:KlView){
        _view.playSound(this.sound_wrong);
    }
    /////////-----------------------------------check answer sound-----------------------------/////////////////

    //////////-------------------------btn事件的注册------------------------------------------///////////////
    static addClickEvent(_view: KlView, buttons: any[], func: Function) {
        for (const btn of buttons) btn.on(Laya.Event.CLICK, _view, func, [btn]);
    }
    //////////-------------------------btn事件的注册------------------------------------------///////////////
    
    /////////-----------------------------------next btn-----------------------------/////////////////
    static checkStep(_view:KlView, _check1:KlInputImage, _check2:KlInputImage = null, _show1:KlInputImage=null, _show2:KlInputImage=null, _show3:KlInputImage = null, _closeMask:Laya.Image=null, doFunc:Function = null){
        let _anRight = true;
        if(_check1 && _check1.fontClipValue != _check1.cus1){
            this.showWrongTipsByKImg(_check1, true);
            _anRight = false;
        }
        if(_check2 && _check2.fontClipValue != _check2.cus1){
            this.showWrongTipsByKImg(_check2, true);
            _anRight = false;
        }
        if(_anRight){
            this.playRightSound(_view);
            _check1.mouseEnabled = false;
            if(_check2){
                _check2.mouseEnabled = false;
            }
            if(_show1){
                _show1.visible = true;
            }
            if(_show2){
                _show2.visible = true;
            }
            if(_show3){
                _show3.visible = true;
            }
            if(_closeMask){
                _closeMask.visible = false;
            }
            if(doFunc){
                doFunc.call(_view);
            }

        }else{
            this.playWrongSound(_view);
        }
    }
    /////////-----------------------------------next btn-----------------------------/////////////////


    //////--------------------------------------------输入框自动跳转下一个输入框--------------////////////
    /**
    * 激活输入框
    * @param input 填入null 否则键盘隐藏
    */
    static activeInput(input?: KlInputImage) {
        if (input == null) {
            KlKeyboardEvent.instance.event(KlKeyboardEvent.HIDE_KEYBOARDS);
            return;
        }
        input.callLater(() => {
            input.event(Laya.Event.CLICK, { target: input });
        })
    }
    static addInputBoxAutoNext(thisView: KlView, inputBox: KlInputBox) {
        this.addInputBoxInputEvent(inputBox, thisView, (input, index) => {
            if (index >= inputBox.numChildren - 1) return;
            let ipx = inputBox.getChildAt(index + 1);
            this.activeInput(ipx as KlInputImage)
        })
    }
    static addInputBoxInputEvent(inputBox: KlInputBox | KlBox, thisCall, func: (input: KlInputImage, idx: number) => void) {
        for (let i = 0; i < inputBox.numChildren; i++) {
            const input = inputBox.getChildAt(i) as KlInputImage;
            input.on(KlKeyboardEvent.INPUT_LATER, thisCall, func, [input, i]);
        }
    }
    //////--------------------------------------------输入框自动跳转下一个输入框--------------////////////
    ///////////------用于在输入字符之前处理特殊情况，比如在字符结尾自动添加顿号-----------------/////////////////////////
    //参考： this._kImg1["inputValidator"] = (v: string, inputImage: KlInputImage) => {
    //     let value = inputImage.fontClipValue.trim();
    //     let lst = value ? value.split("-") : [];
    //     if (v === "del") {
    //         lst.pop();
    //     } else if (v.trim() == "") {
    //         return true;
    //     } else {
    //         lst.push(v);
    //         if (inputImage.fontClipValue.length + 2 > inputImage.place) {
    //             return false;
    //         }
    //     }
    //     inputImage.fontClipValue = lst.join("-") || " ";
    //     return false;
    // }
    static autoAddFont(_kImg:KlInputImage, _view:KlView, func:(v: string, inputImage: KlInputImage)=>boolean){
        _kImg["inputValidator"] = func.bind(_view);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}




/////////////////////////////////////////--------------仅用于复制的模板--------------------/////////////////////////
// onBtnTips(){
//     com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
//     this.showTipsBox(this._btnTips.isSelected);
// }
// onBtnCloseTips(){
//     this._btnTips.isSelected = false;
//     this.showTipsBox(false);
// }
// showTipsBox(isShow:boolean){
//     this._tipsBox.visible = isShow;
// }

// onBtnDis(){
//     com.klzz.game.KlEventCenter.event('btnClick',['tipsBtnClick']);
//     this.showTipsBox(this._btnDis.isSelected);
// }
// onBtnCloseTips(){
//     this._btnDis.isSelected = false;
//     this.showTipsBox(false);
// }
// showDisBox(isShow:boolean){
//     this._disBox.visible = isShow;
// }



///////////------DragViewBox的初始化处理-----------------///////////////////////////////////////////////////
// this._dVBox1.on("EVENT_SUCCESS", this, (slcDragObj: DragObj = null, hitDragObj: DragObj = null, hitDropObj: DropObj = null) => {
//     if (slcDragObj) {
//         let img = hitDropObj;
//         let bg = img.getChildByName("bg") as klImage;
//         if (img.name == "color4") {
//             bg.skin = this.szColor2[parseInt(slcDragObj.name)];
//         } else {
//             bg.skin = this.szColor[parseInt(slcDragObj.name)];
//         }
//         slcDragObj.visible = false;;
//         slcDragObj.cusAttribute = hitDropObj.name;
//         if (hitDragObj) {
//             hitDragObj.visible = true;
//             hitDragObj.cusAttribute = null;
//         }
//     }
// });
// this._dVBox1.on("EVENT_FAILD", this, (slcDragObj: DragObj = null, hitDragObj: DragObj = null, hitDropObj: DropObj = null) => {
//     if (slcDragObj) {
//         if (slcDragObj.cusAttribute) {
//             let img = this._dVBox1.getChildByName("dropbox").getChildByName(slcDragObj.cusAttribute);
//             let bg = img.getChildByName("bg") as klImage;
//             if (img.name == "color4") {
//                 bg.skin = this.grayColor2;
//             } else {
//                 bg.skin = this.grayColor;
//             }
//             slcDragObj.cusAttribute = null;
//         }
//         slcDragObj.visible = true;
//     }
// });
//this._dragViewBox.on(this._dragViewBox.EVENT_SUCCESS, this, this.onSuccess);
// this._dragViewBox.on(this.dragview.EVENT_FAILD, this, this.onFail);
// this._dragViewBox.onMouseDownHandler = new Handler(this, this.onDragDown);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////



///////////////////播放MP4///////////////////
// private _playVideo: number;
// public get playVideo(): number {
//     return this._playVideo;
// }
// public set playVideo(v: number) {
//     this.sync("playVideo", this.playVideo, v);
//     if (this._playVideo >= 1) {
//         v = 0;
//     }
//     this._playVideo = v;
//     if (v >= 1) {
//         VipThink.viewMgr.playVideo("game_lt1/animation/lt1.mp4", 1, 1, 1, 1);
//         VipThink.viewMgr.on(ViewEvent.VIDEO_END, this, this.onVideoEnd);
//     } else {
//         VipThink.viewMgr.playVideo("", 0, 0);
//     }
// }
// private onVideoEnd() {
//     this.playVideo = 0;
// }
///////////////////////////////////////