import ViewEvent = com.biz.ui.ViewEvent;
import VipThink = com.biz.VipThink;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlImage = com.klzz.ui.KlImage;
import KlBox = com.klzz.ui.KlBox;
import KlInputBox = com.klzz.ui.custom.KlInputBox;
import ChoiceBox = com.klzz.ui.custom.ChoiceBox;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import ScaleButton = com.klzz.ui.custom.ScaleButton;
import KlView = com.klzz.ui.KlView;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
export class Utils {
    static sound_ding = "share/sound/rush_flag.wav";
    static sound_click = "share/sound/btn_click.wav";
    static sound_wrong = "share/sound/anwser_wrong.wav";
    static addClickEvent(view: KlView, buttons: any[], func: Function) {
        for (const btn of buttons) btn.on(Laya.Event.CLICK, view, func, [btn]);
    }
    static OnKeyBoradShow(keyBoard: KlBaseKeyboard, thiscall, func, arg?) {
        keyBoard.on(KlKeyboardEvent.KEYBOARD_SHOW, thiscall, func, arg);
    }
    static OnKeyBoradHide(keyBoard: KlBaseKeyboard, thiscall, func, arg?) {
        keyBoard.on(KlKeyboardEvent.KEYBOARD_HIDE, thiscall, func, arg);
    }
    static inputMapping(target: KlInputImage, src: KlInputImage) {
        target.on(KlKeyboardEvent.INPUT_LATER, this, () => {
            src.fontClipValue = target.fontClipValue;
            this.showErr(target, false);
            this.showErr(src, false);
        })
    }
    static lockCtrls(node) {
        for (const iterator of node) {
            iterator.mouseEnabled = false;
        }
    }
    static showErr(target: Laya.Node, b: boolean) {
        if (target) {
            let err = target.getChildByName("err") as Laya.Image;
            if (err && err.visible != b) err.visible = b;
        }
    }
    static showRight(target: Laya.Node, b: boolean) {
        if (target) {
            let err = target.getChildByName("right") as Laya.Image;
            if (err && err.visible != b) err.visible = b;
        }
    }
    static showBg(target: Laya.Node, b: boolean) {
        if (target) {
            let err = target.getChildByName("bg") as Laya.Image;
            if (err && err.visible != b) err.visible = b;
        }
    }
    static showInputBoxErr(target: KlInputBox) {
        let wrongIdx = target.getWrongIdx()
        for (let i = 0; i < target.numChildren; i++) {
            const input = target.getChildAt(i) as KlInputImage
            this.showErr(input, wrongIdx.indexOf(i) >= 0);
        }
    }
    static showInputBoxRight(target: KlInputBox) {
        let wrongIdx = target.getWrongIdx()
        for (let i = 0; i < target.numChildren; i++) {
            const input = target.getChildAt(i) as KlInputImage
            this.showRight(input, wrongIdx.indexOf(i) <= -1);
        }
    }
    static onFeedBack(thisObj, func) {
        VipThink.viewMgr.feedBackView.once("showAnswerFace", thisObj, func);
    }
    static showChoiceBoxErr(target: ChoiceBox) {
        for (const opt of target.getSelRetArray()) {
            this.showErr(opt, true);
        }
    }
    static addInputBoxCancelErr(target: KlInputBox) {
        for (let i = 0; i < target.numChildren; i++) {
            let input = target.getChildAt(i) as KlInputImage;
            this.addInputCanceErr(input);
        }
    }
    static addInputCanceErr(input: KlInputImage) {
        input.on(Laya.Event.CLICK, this, this.showErr, [input, false]);
    }
    static playErr(target: Laya.Node) {
        if (target) {
            let err = target.getChildByName("err") as com.klzz.ui.custom.TwinkleBox;
            if (err) err.play("shan", false, 0, 1);
        }
    }
    static addSyncProperty(thisobj, view, property: string, type: eValueType, setFunc?: (Function), thisCall?: any, defaults?) {
        let value = {
            [eValueType.number]: 0,
            [eValueType.string]: "",
            [eValueType.array]: [],
            [eValueType.object]: {},
            [eValueType.boolean]: false
        }[type];
        Object.defineProperty(view, property, {
            configurable: true,
            set: (v: any) => {
                if (type == eValueType.array || type == eValueType.object) {
                    if (typeof (v) == "string") {
                        try {
                            v = JSON.parse(v)
                        } catch (error) {
                            v = { array: [], object: {} }[type];
                        }
                    }
                    view.sync(property, value, JSON.stringify(v))
                } else {
                    view.sync(property, value, v)
                }
                let old = value;
                value = v;
                if (setFunc) setFunc.call(thisCall, v, () => {
                    value = old;
                });
            },
            get: () => value,
        })
        if (view != thisobj) {
            Object.defineProperty(thisobj, property, {
                configurable: true,
                set: (v: any) => {
                    view[property] = v;
                },
                get: () => {
                    return view[property];
                }
            })
        }
        defaults = defaults || value;
        if (defaults !== undefined) thisobj[property] = defaults;
    }

    static addZjViewEvent(view: KlView, show_zj: ScaleButton, hide_zj: ScaleButton, zjBox: Laya.Box) {
        view.KlTween.isNewMode = true;
        let bg = zjBox.getChildAt(0) as Laya.Image;
        let viewBox = zjBox.getChildAt(1) as Laya.Image;
        bg.visible = false;
        zjBox.mouseThrough = true;
        viewBox.x = 1920;
        show_zj.on(Laya.Event.CLICK, view, () => {
            viewBox.x = 1920;
            view.KlTween.toNew(viewBox, { x: 0 }, 500, Laya.Ease.sineInOut);
            bg.visible = true;

            zjBox.mouseThrough = false;
        });
        hide_zj.on(Laya.Event.CLICK, view, () => {
            viewBox.x = 0;
            view.KlTween.toNew(viewBox, { x: 1920 }, 500, Laya.Ease.sineInOut);
            bg.visible = false;
            zjBox.mouseThrough = true;
        });
    }
    static addLightEvent(view: KlView, btn_switch: SelectableObj, btn_close?: ScaleButton, lightBox?: Laya.Box) {
        var func = () => {
            if (lightBox) lightBox.visible = btn_switch.isSelected;
        }
        btn_switch.on(Laya.Event.CLICK, view, func);
        if (btn_close) btn_close.on(Laya.Event.CLICK, view, () => {
            btn_switch.isSelected = false;
            func();
        });
    }
    static swdt(view: com.klzz.ui.KlView, pageBox: Laya.Box, btn_left?: ScaleButton, btn_right?: ScaleButton, btn_switch?: Laya.Box) {
        this.addSyncProperty(view, pageBox, "___page", eValueType.number, (v: number, cancel: () => void) => {
            if (v < 0 || v >= pageBox.numChildren) {
                return cancel();
            }
            for (let i = 0; i < pageBox.numChildren; i++) {
                const box = pageBox.getChildAt(i) as Laya.Box;
                box.visible = i == view["___page"];
            }
            if (btn_left) btn_left.visible = v > 0;
            if (btn_right) btn_right.visible = v < pageBox.numChildren - 1;
        }, this);
        if (btn_left) {
            btn_left.on(Laya.Event.CLICK, this, () => {
                view["___page"]--;
            })
        }
        if (btn_right) {
            btn_right.on(Laya.Event.CLICK, this, () => {
                view["___page"]++;
            })
        }
        view["___page"] = 0;
        if (btn_switch) {
            for (let i = 0; i < btn_switch.numChildren; i++) {
                const btn = btn_switch.getChildAt(i) as Laya.Button;
                btn.on(Laya.Event.CLICK, this, () => {
                    view["___page"] = i;
                })
            }
        }
    }
    static *itaterChild(node: Laya.Node) {
        for (let i = 0; i < node.numChildren; i++) {
            yield node.getChildAt(i);
        }
    }
    static addInputBoxInputEvent(inputBox: KlInputBox, thisCall, func: (input: KlInputImage, idx: number) => void) {
        for (let i = 0; i < inputBox.numChildren; i++) {
            const input = inputBox.getChildAt(i) as KlInputImage;
            input.on(KlKeyboardEvent.INPUT_LATER, thisCall, func, [input, i]);
        }
    }
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

    static checkInputValue(input: KlInputImage, value: string, thiscall, func: Function, arg?) {
        this.addInputEvent(input, thiscall, () => {
            if (input.fontClipValue == value) {
                func.call(thiscall, arg);
            }
        })
    }
    static addInputEvent(input: KlInputImage, thisCall, func: Function) {
        input.on(KlKeyboardEvent.INPUT_LATER, thisCall, func, [input]);
    }
    static removeInputEvent(input: KlInputImage, thisCall, func: Function) {
        input.off(KlKeyboardEvent.INPUT_LATER, thisCall, func);
    }

    static checkInputBox(inputBox: KlInputBox) {
        this.showInputBoxErr(inputBox);
        if (inputBox.isRight()) {
            this.showInputBoxRight(inputBox);
            return true;
        } else {
            this.getCurView().showAnswerFace(2);
            return false;
        }
    }
    static checkChoiceBox(view: KlView, choiceBox: ChoiceBox) {
        if (choiceBox.isRight) {
            return true;
        } else {
            view.showAnswerFace(2);
            this.showChoiceBoxErr(choiceBox);
            return false;
        }
    }
    static tweenShow(target: Laya.Node, func?: Laya.Handler) {
        let view = this.getCurView();
        view.KlTween.isNewMode = true;
        view.KlTween.toNew(target, { alpha: 1 }, 200, null, func);
    }
    static addEventLog(target: any, type: eLogType) {
        let logType = ["resetBtnClick", "questionBtnClick", "secondaryPageBtnClick", "tipsBtnClick"][type];
        target.on(Laya.Event.CLICK, this, () => {
            com.klzz.game.KlEventCenter.event("btnClick", [logType]);
            console.log("触发埋点", logType);
        })
    }
    /**多种答案 */
    static getWrongLst(inputs: any[], asw: string[][]) {
        let lst: number[][] = [];
        for (const _asw of asw) {
            let _lst = [];
            for (let i = 0; i < _asw.length; i++) {
                if (_asw[i] != inputs[i]) {
                    _lst.push(i);
                }
            }
            lst.push(_lst);
        }
        let wrongList = lst.sort((a, b) => a.length - b.length)[0];
        return wrongList;
    }


    static scaleKlInputImg(input: KlInputImage, scale: number) {
        input.fontClip.scale(scale, scale);
    }
    static scaleKlInputBox(inputBox: any, scale: number) {
        for (let i = 0; i < inputBox.numChildren; i++) {
            const input = inputBox.getChildAt(i) as KlInputImage;
            input.fontClip.scale(scale, scale);
        }
    }
    static addChoiceBoxTouchCancelErr(target: ChoiceBox) {
        for (let i = 0; i < target.numChildren; i++) {
            let opt = target.getChildAt(i) as KlInputImage;
            opt.on(Laya.Event.CLICK, this, () => {
                for (let j = 0; j < target.numChildren; j++) {
                    let _opt = target.getChildAt(j) as KlInputImage;
                    this.showErr(_opt, false);
                }
            });
        }
    }
    static getCurView(): KlView {
        return VipThink.viewMgr["currPage"] && VipThink.viewMgr["currPage"].currView;
    }
    static addSwitchBox(switchBtnBox: Laya.Box, siwtchBox: Laya.Box, onSwitchFunc?: Function, thisCall?: any) {
        switchBtnBox.mouseThrough = true;
        siwtchBox.mouseThrough = true;
        let canBtnSwitch = true;
        let switchView = (nIdx: number) => {
            nIdx = Math.min(nIdx, siwtchBox.numChildren - 1);
            for (let i = 0; i < siwtchBox.numChildren; i++) {
                const box = siwtchBox.getChildAt(i) as Laya.Box;
                box.visible = nIdx == i;
                box.mouseThrough = true;
            }
            for (let i = 0; i < switchBtnBox.numChildren; i++) {
                const btn = switchBtnBox.getChildAt(i) as Laya.Box;
                let complete = btn.getChildByName("complete") as Laya.Image;
                let bg = btn.getChildByName("bg") as Laya.Image;
                if (bg) {
                    bg.visible = nIdx == i;
                    if (complete) complete.visible = false;
                } else if (complete) {
                    complete.visible = nIdx > i;
                    btn.disabled = nIdx < i;
                    canBtnSwitch = false;
                } else {
                    btn.gray = nIdx != i;
                }
            }
            if (onSwitchFunc) onSwitchFunc.call(thisCall, nIdx);
        }
        switchView(0);
        if (canBtnSwitch) {
            for (let index = 0; index < switchBtnBox.numChildren; index++) {
                const btn = switchBtnBox.getChildAt(index);
                btn.on(Laya.Event.CLICK, this, switchView, [index]);
            }
        }
        return {
            switchView: switchView
        };
    }
    static addHideNext(targetBox: Laya.Box, nextBtn?: ScaleButton, resetBtn?: ScaleButton, thiscall?, func?: (targt: Laya.Box, last: Laya.Box) => boolean, endHideNext = true) {
        let curView = this.getCurView();
        curView.KlTween.isNewMode = true;
        targetBox.mouseThrough = true;
        let reset = () => {
            for (let i = 0; i < targetBox.numChildren; i++) {
                const element = targetBox.getChildAt(i) as Laya.Box;
                if (element.name != "_s") element.alpha = 0;
                if (element instanceof KlBox) {
                    element.mouseThrough = true;
                    let inputBox = element.getChildByName("inputBox") as KlInputBox;
                    if (inputBox) {
                        inputBox.mouseThrough = true;
                        this.addInputBoxCancelErr(inputBox);
                        for (let i = 0; i < inputBox.numChildren; i++) {
                            const ele = inputBox.getChildAt(i);
                            if (ele instanceof KlInputImage) {
                                if (ele["text"]) {
                                    ele.fontClipValue = ele["text"];
                                }
                            }
                        }
                    }

                }
                nextBtn.visible = true;
            }
        }
        if (nextBtn) {
            nextBtn.on(Laya.Event.CLICK, this, () => {
                for (let i = 0; i < targetBox.numChildren; i++) {
                    const element = targetBox.getChildAt(i) as Laya.Box;
                    if (element && element.alpha == 0) {
                        let target = element;
                        let last = (i - 1) >= 0 && targetBox.getChildAt(i - 1);
                        if (func) {
                            let re = func.call(thiscall, target, last);
                            if (re === false) {
                                return false;
                            }
                        } else if (last) {
                            let inputBox = last.getChildByName("inputBox") as KlInputBox;
                            let isRight = inputBox && this.checkInputBox(inputBox)
                            if (inputBox && !isRight) {
                                return;
                            }
                            if (isRight) {
                                this.lockCtrls([inputBox])
                            }
                        }
                        curView.KlTween.toNew(element, { alpha: 1 }, 200);
                        curView.playSound(this.sound_ding);
                        if (i >= targetBox.numChildren - 1) {
                            if (endHideNext) nextBtn.visible = false;
                        }
                        return;
                    }
                }
                func && func.call(thiscall, null, null);
            })
        }
        if (resetBtn) {
            resetBtn.on(Laya.Event.CLICK, this, reset);
        }
        reset();
    }
    /**获取算式结果 */
    static getTextCalculateRs(txt: string) {
        let rs: number;
        try {
            rs = eval(txt);
        } catch (error) { }
        if (rs) {
            rs = rs.toString().indexOf(".") ? parseFloat(rs.toFixed(1)) : rs;
        }
        return rs;
    }
    static addKlinputImageDelBlock(inputBox: KlInputImage, block: string[]) {
        // -------- 例子 --------
        // 只能输入'A'，其他都不能输入
        inputBox["inputValidator"] = (v: string, inputImage: KlInputImage) => {
            if (v === 'del') {
                for (const str of block) {
                    let pattern = new RegExp(`${str}$`, "g");
                    console.log(pattern);
                    if (inputImage.fontClipValue.match(pattern)) {
                        inputImage.fontClipValue = inputImage.fontClipValue.replace(pattern, "");
                        return false;
                    }
                }
            }
            return true
        }
    }

}
interface iGenKeyboardOpt {
    col?: number;
    row?: number;
    width?: number;
    heigth?: number;
    camp?: number;
    fontClipBitmap?: string;
    fontClipSheet?: string;
    fontClipBitmap2?: string;
    fontClipSheet2?: string;
    words: ikeyBoardWordsOpt[];
}
interface ikeyBoardWordsOpt {
    word: string,
    out?: string
}
export enum eValueType {
    number,
    string,
    array,
    object,
    boolean
}
export enum eLogType {
    /**重置*/
    resetBtnClick,
    /** 声音按钮*/
    questionBtnClick,
    /** 二级页面*/
    secondaryPageBtnClick,
    /** 提示*/
    tipsBtnClick
}
//为了使esbuild编译出来的es，在kltween中的支持。
com.klzz.ui.KlTweenBox.prototype["getHandlerMethodName"] = (handlerCaller, handlerMethod) => {
    if (!handlerCaller) {
        return null;
    }
    for (var key in handlerCaller) {
        if (handlerCaller[key] == handlerMethod) {
            return key;
        }
    }
    if (handlerMethod.name) {
        handlerCaller[handlerMethod.name] = handlerMethod;
        return handlerMethod.name;
    }
    return null;
}
