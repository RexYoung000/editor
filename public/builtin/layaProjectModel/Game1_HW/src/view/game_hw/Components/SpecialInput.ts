import KlImage = com.klzz.ui.KlImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import KlFontClip = com.klzz.ui.KlFontClip;
import KlView = com.klzz.ui.KlView;
import VipThink = com.biz.VipThink;
import ViewEvent = com.biz.ui.ViewEvent;
import KlBox = com.klzz.ui.KlBox;
import ExponentInput from "./ExponentInput";
/**
 * 仅用于底数跟指数，分数，平方根，立方根的输入框，平方根立方根里面不能再有分数以及平方根与立方根
 */
export default class SpecialInput extends KlInputImage {
    private bg: KlImage;
    private nor: KlImage;
    private content: KlBox;
    public _currXpath: string;
    public canSelected = "true";
    constructor() {
        super();
    }
    public get currXpath() {
        if (!this._currXpath) {
            var xp: string = this.name;
            var p: any = this.parent;
            while (p && !(p instanceof KlView)) {
                xp = p.name + "." + xp;
                p = p.parent;
            }
            this._currXpath = xp;
        }
        return this._currXpath;
    }
    public fontWidth = 42;
    public _exponentFontScale = 0.5;
    public _exponentPosY = -20
    private _camp: string;
    private _camp1: string;
    public get camp1(): string {
        return this._camp1;
    }
    public set camp1(v: string) {
        this._camp1 = v;
    }
    public get camp(): string {
        return this._camp;
    }
    public set camp(v: string) {
        this._camp = v;
    }
    private _camp2: string;
    public get camp2(): string {
        return this._camp2;
    }
    public set camp2(v: string) {
        this._camp2 = v;
    }
    private _camp3: string;
    public get camp3(): string {
        return this._camp3;
    }
    public set camp3(v: string) {
        this._camp3 = v;
    }
    private _camp4: string;
    public get camp4(): string {
        return this._camp4;
    }
    public set camp4(v: string) {
        this._camp4 = v;
    }
    public get exponentFontScale(): number {
        return this._exponentFontScale;
    }
    public set exponentFontScale(v: number) {
        this.sync("exponentFontScale", this.exponentFontScale, v, undefined);
        this._exponentFontScale = v;
    }
    public get exponentPosY(): number {
        return this._exponentPosY;
    }
    public set exponentPosY(v: number) {
        this.sync("exponentPosY", this.exponentPosY, v, undefined);
        this._exponentPosY = v;
    }
    public fractionPlace = 3;
    public fractionPlace2 = 6;
    public squareRootPlace = 3;
    
    private _lineSkin: string;
    public get lineSkin(): string {
        return this._lineSkin;
    }
    public set lineSkin(v: string) {
        this._lineSkin = v;
    }
    private _squareRootSkin: string;
    public get squareRootSkin(): string {
        return this._squareRootSkin;
    }
    public set squareRootSkin(v: string) {
        this._squareRootSkin = v;
    }

    
    private _sheet: string;
    public get sheet(): string {
        return this._sheet;
    }
    public set sheet(v: string) {
        this.sync("sheet", this.sheet, v, undefined);
        this._sheet = v;
    }
    private _contentScale: number;
    public get contentScale(): number {
        return this._contentScale;
    }
    public set contentScale(v: number) {
        this.sync("contentScale", this.contentScale, v, undefined);
        this._contentScale = v;
    }

    private _spaceX: number;
    public get spaceX(): number {
        return this._spaceX;
    }
    public set spaceX(v: number) {
        this.sync("spaceX", this.spaceX, v, undefined);
        this._spaceX = v;
    }

    private _align: string;
    public get align(): string {
        return this._align;
    }
    public set align(v: string) {
        this.sync("align", this.align, v, undefined);
        this._align = v;
        this.updateAlign();
    }

    private _isSelected: boolean;
    public get isSelected(): boolean {
        return this._isSelected;
    }
    public set isSelected(v: boolean) {
        this.sync("isSelected", this.isSelected, v, undefined);
        this.showBg(v);
        this._isSelected = v;
    }
    private _lastOutPut: string;
    public get lastOutPut(): string {
        return this._lastOutPut;
    }
    public set lastOutPut(v: string) {
        this.sync("lastOutPut", this._lastOutPut, v, undefined);
        this._lastOutPut = v;
    }
    private _fontClipSkin: string;
    public get fontClipSkin(): string {
        return this._fontClipSkin;
    }
    public set fontClipSkin(v: string) {
        this.sync("fontClipSkin", this._camp, v, undefined);
        this._fontClipSkin = v;
    }
    private _fontClipValue: string;
    public get fontClipValue(): string {
        return this._fontClipValue;
    }
    public set fontClipValue(v: string) {
        this.sync("fontClipValue", this.fontClipValue, v, undefined);
        this._fontClipValue = v;
        this.updateValue();
    }
    private _place: number;
    public get place(): number {
        return this._place;
    }
    public set place(v: number) {
        this.sync("place", this._place, v, undefined);
        this._place = v;
    }

    public maxFractionNum = 5;
    public maxDiscontinuous = 8;

    createChildren() {
        super.createChildren();
        this.on(Laya.Event.DISPLAY, this, this.onDisPlay);
        VipThink.viewMgr.once(ViewEvent.MAINVIEW_PREPARED, this, this.onPrepared);
        this.inputs = [];
        this.squareRootInputs = [];
        this.clips = [];
        this.exponentClips = [];
        this.fontClipValue = "";
        this.align = "center";
    }
    private onPrepared() {
        this.frameOnce(1, this, function (): void {
            KlKeyboardEvent.instance.on(KlKeyboardEvent.INPUT, this, this.onInput);
        })
    }

    public addInputToKeyBorad(input: KlInputImage) {
        this.eachAllKeyBorad((keyBoard) => {
            if (keyBoard.camp == input.camp) {
                let _campInputs = keyBoard["_campInputs"] as KlInputImage[];
                if (_campInputs.indexOf(input) == -1) _campInputs.push(input);
            }
            let _allInputs = keyBoard["_allInputs"] as KlInputImage[];
            if (_allInputs.indexOf(input) == -1) _allInputs.push(input);
        })
    }
    public removeInputFormKeyBorad(input: KlInputImage) {
        this.eachAllKeyBorad((keyBoard) => {
            if (keyBoard.camp == input.camp) {
                let _campInputs = keyBoard["_campInputs"] as KlInputImage[];
                keyBoard["_campInputs"] = _campInputs.filter(v => v != input)
            }
            let _allInputs = keyBoard["_allInputs"] as KlInputImage[];
            keyBoard["_allInputs"] = _allInputs.filter(v => v != input)
        })
        let events = KlKeyboardEvent.instance && KlKeyboardEvent.instance["events"] || KlKeyboardEvent.instance["_events"];
        let inputs = events && events[KlKeyboardEvent.INPUT] as KlInputImage[];
        if (inputs && events) {
            events[KlKeyboardEvent.INPUT] = inputs.filter((v: any) => v && v.caller != input);
        }

        let squareRootInputs = events && events[KlKeyboardEvent.INPUT] as KlInputImage[];
        if (squareRootInputs && events) {
            events[KlKeyboardEvent.INPUT] = squareRootInputs.filter((v: any) => v && v.caller != input);
        }
    }
    public eachAllKeyBorad(func: (keyBoard: KlBaseKeyboard) => void) {
        let events = KlKeyboardEvent.instance && KlKeyboardEvent.instance["events"] || KlKeyboardEvent.instance["_events"];
        let handels = events && events[KlKeyboardEvent.UNSELECT_ALLINPUTIMAGE];
        if (handels) {
            for (const data of handels) {
                func(data.caller);
            }
        }
    }
    get parentsIsHide() {
        let p = this.parent as Laya.Box;
        while (p) {
            if (p.visible && p.alpha) {
                p = p.parent as Laya.Box;
            }
            else {
                return true;
            }
        }
        return false;
    }

    private _onClick(evt: Laya.Event) {
        let view = (VipThink.viewMgr["currPage"] && VipThink.viewMgr["currPage"].currView) as KlView;
        if (this.parentsIsHide)
            return;
        if (view) {
            view.playSound("share/sound/btn_click.wav");
        }
        KlKeyboardEvent.instance.event(KlKeyboardEvent.UNSELECT_ALLINPUTIMAGE, [this]);
        evt.target = this;
        KlKeyboardEvent.instance.event(KlKeyboardEvent.ACTIVE, [evt]);
        this.isSelected = true;
    }
    private onInput(key: KlKey) {
        if (!key) {
            return;
        }
        if (!key.fathKeyboard) {
            return;
        }
        if (key.camp != this.camp || this != key.fathKeyboard.currIpt) {
            return;
        }

        if(key.output == "^"){
            
            KlKeyboardEvent.instance.event(KlKeyboardEvent.HIDE_KEYBOARDS);
            this.callLater(() => {
                this.camp = this.camp3;
                this.nor.event(Laya.Event.CLICK, { target: this.nor });
            })
         
            
        }else if(key.output == "~"){
            KlKeyboardEvent.instance.event(KlKeyboardEvent.HIDE_KEYBOARDS);
            this.callLater(() => {
                this.camp = this.camp1;
                this.nor.event(Laya.Event.CLICK, { target: this.nor });
            })
        
            if(this.fontClipValue.slice(-2) == "^~"){
                this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 2);
            }
        }else if(key.output == "exponentdel"){
            if(this.fontClipValue.slice(-2) != "^~" && this.fontClipValue.slice(-1) == "~"){
                this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 2);
                this.fontClipValue += "~";
            }

        }else if (key.output == "del") {
            let last = this.fontClipValue.charAt(this.fontClipValue.length - 1);
            if(last == "~"){
                let arr = this.fontClipValue.match(/\^.*?\~/g);
                let index = this.fontClipValue.lastIndexOf(arr[arr.length - 1]);
               
                if(index != -1){
                    this.fontClipValue = this.fontClipValue.substr(0, index);
                    if(this.fontClipValue.length>=1){
                        let last2 = this.fontClipValue.charAt(this.fontClipValue.length - 1);
                        if(last2 != ">" && last2 != "#"){
                            this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 1);
                        }
                    }
                } 
             
            }else if (last == ">") {
                let arr = this.fontClipValue.match(/<.*?>/g);
                let index = this.fontClipValue.lastIndexOf(arr[arr.length - 1]);
                if(index != -1){
                    this.fontClipValue = this.fontClipValue.substr(0, index);
                }
            }else if(last == "#"){
                let arr = this.fontClipValue.match(/@.*?#/g);
                let index = this.fontClipValue.lastIndexOf(arr[arr.length - 1]);
                if(index != -1){
                    this.fontClipValue = this.fontClipValue.substr(0, index);
                }
            }else {
                this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 1);
            }
        } else if (key.output == undefined) {
            this.fontClipValue = "";
            this.lastOutPut = null;
        } else {
            if (key.output == "<_>" && this.getLength() + this.fractionPlace > this.place) return;
            if (this.getLength() + (key.output + "").length > this.place && key.output != "<_>") return;
            if (key.output == "<_>" && !this.getInput()) return;
            if (key.output != "<_>" && !this.getKlFontClip() && this.lastOutPut == "<_>") return;
            if(key.output == "@#" && !this.getSquareInput())return;
            if (key.output == "@#" && this.getLength() + this.squareRootPlace > this.place) return;
            if(this.camp == this.camp3){
                if(this.fontClipValue.slice(-1) == "~"){
                    this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 1);
                    this.fontClipValue += key.output;
                    this.fontClipValue += "~";
                    this.lastOutPut = key.output;
                }else{
                    this.fontClipValue += "^";
                    this.fontClipValue += key.output;
                    this.fontClipValue += "~";
                    this.lastOutPut = key.output;
                }
            }else{
                this.fontClipValue += key.output;
                this.lastOutPut = key.output;
            }
        }
        this.event(KlKeyboardEvent.INPUT_LATER, [this]);
    }
    private removeAllInput() {
        if (this.content) {
            this.clearAll();
        }
    }
    public analysisFormula(_str: string): string[] {
        let lst = [];
        let index = 0;
        let isParentheses = false;
        let temp1 = [];
        for (let i = 0; i < _str.length; i++) {
            const str = _str[i];
            if (str == "<") {
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
                temp1.push(str);
            } else if (str == ">") {
                temp1.push(str);
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
            }else if(str == "@"){
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
                temp1.push(str);
            }else if(str == "#"){
                temp1.push(str);
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
            }else if (str == "^") {
                if(temp1.length && temp1[0] == "@"){
                    temp1.push(str);
                }else{
                    temp1.length && lst.push(temp1.join(""));
                    temp1 = [];
                    temp1.push(str);
                }
            } else if (str == "~") {
                if(temp1.length && temp1[0] == "@"){
                    temp1.push(str);
                }else{
                    temp1.push(str);
                    temp1.length && lst.push(temp1.join(""));
                    temp1 = [];
                }
            } else {
                temp1.push(str);
            }
        }
        temp1.length && lst.push(temp1.join(""));
        console.log("specialInput:",_str, lst);
        return lst;
    }


    private updateValue() {
        this.removeAllInput();
        if (this.fontClipValue) {
            let x = 0;
            let count = 0;
            let values = this.analysisFormula(this.fontClipValue) //this.fontClipValue.match(this.matchReg).filter(v => !!v);
            for (let str of values) {
                if (str.charAt(0) == "<") {//分子分母 2个框
                    str = str.replace(/[\<|\>]/g, "");
                    let index = str.indexOf("_")
                    let i1 = str.substr(0, index);
                    let i2 = str.substr(index + 1, str.length);
                    // let [i1, i2] = str.split("/")//str.match(this.matchReg2)[0].split("/") || [" ", " "];
                    let box = this.getInput();
                    if (!box) continue;
                    let font1 = box.getChildAt(0) as KlInputImage;
                    let font2 = box.getChildAt(1) as KlInputImage;
                    font1.offAll(KlKeyboardEvent.INPUT_LATER);
                    font2.offAll(KlKeyboardEvent.INPUT_LATER);
                    font1.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child, [count, font1, font2]);
                    font2.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child, [count, font1, font2]);
                    font1.fontClipValue = i1;
                    font2.fontClipValue = i2;
                    box.x = x;
                    x += box.width + this.spaceX;
                    box.visible = true;
                }else if(str.charAt(0) == "@"){
                    str = str.replace(/[\@|\#]/g, "");
                    let squareBox = this.getSquareInput();
                    if (!squareBox) continue;
                    let exponentInput = squareBox.getChildAt(0) as KlInputImage;
                    exponentInput.offAll(KlKeyboardEvent.INPUT_LATER);
                    exponentInput.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child2, [count, exponentInput]);
                    exponentInput.fontClipValue = str;
                    squareBox.x = x;
                    x += squareBox.width + this.spaceX;
                    squareBox.visible = true;
                }else if (str.charAt(0) == "^") { //指数
                    str = str.replace(/[\^|\~]/g, "");
                    if(str.length == 0){
                        continue;
                    }
                    let font = this.getExponentKlFontClip();
                    if (!font) continue;
                    font.value = str;
                    font.x = x;
                    x += this.fontWidth * (str.length + this.spaceX) * this.exponentFontScale + this.spaceX;
                    font.visible = true;
                    
                } else {
                    let font = this.getKlFontClip();
                    if (!font) continue;
                    font.value = str;
                    font.x = x;
                    x += this.fontWidth * (str.length + this.spaceX) + this.spaceX;
                    font.visible = true;
                }
                count++;
            }
            this.content.width = x;
        }
    }
    private nFontClipCount = 0;
    public creatKlFontClip() {
        let font = new KlFontClip(this.fontClipSkin, this.sheet);
        font.spaceX = this.spaceX;
        font.centerY = 0;
        font.name = "font_" + this.nFontClipCount;
        font.mouseEnabled = false;
        this.content.addChild(font);
        this.nFontClipCount++;
        return font;
    }
    private nExponentFontClipCount = 0;
    public createExponentKlFontClip(){
        let font = new KlFontClip(this.fontClipSkin, this.sheet);
        font.spaceX = this.spaceX;
        font.centerY = this.exponentPosY;
        font.name = "exponentFont_" + this.nFontClipCount;
        font.mouseEnabled = false;
        
        font.scale(this.exponentFontScale,this.exponentFontScale);
        this.content.addChild(font);
     
        this.nFontClipCount++;
 
        return font;
    }
    
    
    public showBg(v: boolean) {
        if (this.bg) this.bg.visible = v;
    }
    private inputList: KlInputImage[] = [];
    public creatKlinputImage(count: number, flag: number, input1Value) {
        let input1 = new KlInputImage;
        input1["onPrepared"]();
        input1.name = "input_" + flag + "_" + count;
        input1.camp = this.camp2;
        input1.canSelected = "true";
        input1.fontClipSkin = this.fontClipSkin;
        input1["sheet"] = this.sheet;

        input1.place = this.fractionPlace;
        input1["contentScale"] = 0.8;
        input1.frameOnce(1, this, () => {
            input1.fontClipValue = input1Value;
        })
        input1.on(Laya.Event.CLICK, this, this.addInputToKeyBorad, [input1]);
        input1.anchorX = input1.anchorY = 0;
        let input1_img = new KlImage;
        input1_img.skin = this.nor.skin;
        input1_img.sizeGrid = this.nor.sizeGrid;
        input1_img.left = input1_img.right = input1_img.top = input1_img.bottom = 0
        input1_img.name = "input1_img_" + count;

        let input1_bg = new KlImage;
        input1_bg.skin = this.bg.skin;
        input1_bg.sizeGrid = this.bg.sizeGrid;
        input1_bg.left = input1_bg.right = input1_bg.top = input1_bg.bottom = 0
        input1_bg.name = "bg";

        input1.addChild(input1_img);
        input1.addChild(input1_bg);
        return input1;
    }

    /**获取实际的输入的文字数量 */
    public getLength() {
        let values = this.analysisFormula(this.fontClipValue);
        // let values = this.fontClipValue.match(this.matchReg).filter(v => !!v);
        let count = 0;
        for (const str of values) {
            if (str.charAt(0) == "<") {
                count += this.fractionPlace
            } else if (str.charAt(0) == "[") {
                count += this.fractionPlace2
            } else if(str.charAt(0) == "^"){
                count+=str.length-2>0?str.length-2:0;
            }else if(str.charAt(0)=="@"){
                count+=this.squareRootPlace;
            }else {
                count += str.length;
            }
        }
        return count;
    }
    
    public createExponentInput(count: number, exponentInputValue){
        let input = new ExponentInput;
        input["onPrepared"]();
        input.name = "exponentInput_" + count;
        input.camp = this.camp4;
        input.camp2 = this.camp3;
        input.fontWidth = this.fontWidth;
        input.canSelected = "true";
        input.fontClipSkin = this.fontClipSkin;
        input["sheet"] = this.sheet;

        input.place = this.squareRootPlace;
        input["contentScale"] = 0.8;
        input.frameOnce(1, this, () => {
            input.fontClipValue = exponentInputValue;
        })
        input.on(Laya.Event.CLICK, this, this.addInputToKeyBorad, [input]);
        input.anchorX = input.anchorY = 0;
        let input_img = new KlImage;
        input_img.skin = this.nor.skin;
        input_img.sizeGrid = this.nor.sizeGrid;
        input_img.left = input_img.right = input_img.top = input_img.bottom = 0
        input_img.name = "exponentInput_img_" + count;

        let input_bg = new KlImage;
        input_bg.skin = this.bg.skin;
        input_bg.sizeGrid = this.bg.sizeGrid;
        input_bg.left = input_bg.right = input_bg.top = input_bg.bottom = 0
        input_bg.name = "bg";

        input.addChild(input_img);
        input.addChild(input_bg);
        return input;
    }
    public createSquareRootInput(count: number, inputValue: string){
        let box = new KlBox;
        box.centerY = 0;
        box.mouseThrough = true;
        box.name = "squareRootBox_" + count;
        box.width = this.squareRootPlace * this.fontWidth + 35;
        let input = this.createExponentInput(count, inputValue);
        input.x = 25;
        input.y = 5;
        input.place = this.squareRootPlace;
        input.width = this.squareRootPlace * this.fontWidth;
        input.height = 60;
        box.addChild(input);
        this.inputList.push(input);

        let img = new KlImage;
        img.name = "squareRootImg" + count;
        img.skin = this.squareRootSkin;
        img.y = 0;
        img.sizeGrid= "0,0,0,34";
        img.width = this.squareRootPlace * this.fontWidth + 30;
        box.addChild(img);

        this.content.addChild(box);
        return box;
    }

    public createInput(count: number, input1Value: string, input2Value: string) {
        let box = new KlBox;
        box.centerY = 0;
        box.mouseThrough = true;
        box.name = "box_" + count;
        box.width = this.fractionPlace * this.fontWidth + 20;
        let input1 = this.creatKlinputImage(count, 0, input1Value);
        input1.x = 10;
        input1.y = 0;
        input1.width = this.fractionPlace * this.fontWidth;
        input1.height = 60;
        box.addChild(input1);
        this.inputList.push(input1);

        let input2 = this.creatKlinputImage(count, 1, input2Value);
        input2.x = 10;
        input2.y = 75;
        input2.width = this.fractionPlace * this.fontWidth;
        input2.height = 60;
        box.addChild(input2);
        this.inputList.push(input2);

        let img = new KlImage;
        img.name = "img" + count;
        img.skin = this.lineSkin;
        img.y = 65;
        img.width = this.fractionPlace * this.fontWidth + 20;
        box.addChild(img);

        this.content.addChild(box);
        return box;
    }
    private onInput1Child(count: number, input1: KlInputImage, input2: KlInputImage) {
        let values = this.analysisFormula(this.fontClipValue);
        let str = values[count] = `<${input1.fontClipValue}_${input2.fontClipValue}>`;
        let v = values.join("");
        this.sync("fontClipValue", this.fontClipValue, v, undefined);
        this._fontClipValue = v;
        this.event(KlKeyboardEvent.INPUT_LATER, [this]);
    }
    private onInput1Child2(count: number, input: KlInputImage) {
        let values = this.analysisFormula(this.fontClipValue);
        console.log("values:",values, count);
        let str = values[count] = `@${input.fontClipValue}#`;
        let v = values.join("");
        this.sync("fontClipValue", this.fontClipValue, v, undefined);
        this._fontClipValue = v;
        this.event(KlKeyboardEvent.INPUT_LATER, [this]);
        console.log("SpecialInput:onInput1Child2", this._fontClipValue);
    }
    // private onInput1Child2(count: number, input0: KlInputImage, input1: KlInputImage, input2: KlInputImage) {
    //     let values = this.analysisFormula(this.fontClipValue);
    //     let str = values[count] = `[${input0.fontClipValue}<${input1.fontClipValue}_${input2.fontClipValue}>]`;
    //     let v = values.join("");
    //     this.sync("fontClipValue", this.fontClipValue, v, undefined);
    //     this._fontClipValue = v;
    //     this.event(KlKeyboardEvent.INPUT_LATER, [this]);
    // }
    private inputs: KlBox[] = [];
    private squareRootInputs:KlBox[] = [];
    // private inputs2: KlBox[] = [];
    private clips: KlFontClip[] = [];
    private exponentClips:KlFontClip[] = [];
    private updateAlign() {
        if (!this.content) return;
        this.content.centerX = undefined;
        this.content.left = undefined;
        this.content.right = undefined;
        this.content.centerY = 0;
        switch (this.align) {
            case "left":
                this.content.left = 0;
                break;
            case "center":
                this.content.centerX = 0;
                break;
            case "right":
                this.content.right = 0;
                break;
            default:
                break;
        }
    }
    private onDisPlay() {
        this.nor = this.getChildAt(0) as KlImage;
        this.bg = this.getChildByName("bg") as KlImage;
        let box = new KlBox;
        box.mouseThrough = true;
        box.scale(this.contentScale, this.contentScale);
        box.name = "content";
        box.height = this.height;
        this.content = this.addChild(box) as KlBox;
        this.updateAlign();
        this.showBg(false);
        this.off(Laya.Event.CLICK, this, this["onClick"]);
        this.nor.on(Laya.Event.CLICK, this, this._onClick);
        for (let i = 0; i < this.maxFractionNum; i++) {
            let inputs = this.createInput(i, "", "");
            inputs.visible = false;
            this.inputs.push(inputs);
        }
        for (let i = 0; i < this.maxDiscontinuous; i++) {
            let clip = this.creatKlFontClip();
            clip.visible = false;
            this.clips.push(clip);
        }
        for (let i = 0; i < this.maxDiscontinuous; i++) {
            let exponentClip = this.createExponentKlFontClip();
            exponentClip.visible = false;
            this.exponentClips.push(exponentClip);
        }
        for (let i = 0; i < this.maxFractionNum; i++) {
            let squareRootInput = this.createSquareRootInput(i, "");
            squareRootInput.visible = false;
            this.squareRootInputs.push(squareRootInput);
        }
        this.camp1 = this.camp;
    }
    private getInput() {
        for (const input of this.inputs) {
            if (!input.visible) {
                return input;
            }
        }
        return null;
    }
    private getSquareInput(){
        for (const input of this.squareRootInputs) {
            if (!input.visible) {
                return input;
            }
        }
        return null;
    }
    // private getInput2() {
    //     for (const input of this.inputs2) {
    //         if (!input.visible) {
    //             return input;
    //         }
    //     }
    // }
    private getKlFontClip() {
        for (const clip of this.clips) {
            if (!clip.visible) {
                return clip;
            }
        }
    }
    private getExponentKlFontClip(){
        for (const clip of this.exponentClips) {
            if (!clip.visible) {
                return clip;
            }
        }
    }
    private clearAll() {
        for (const input of this.inputs) {
            input.visible = false;
        }

        for (const input of this.inputList) {
            input.fontClipValue = " ";
        }
        for (const input of this.squareRootInputs) {
            input.visible = false;
        }
        for (const clip of this.clips) {
            clip.visible = false;
        }
        for (const clip of this.exponentClips) {
            clip.visible = false;
        }
    }
}

Laya.View.regComponent("Components.SpecialInput", SpecialInput);


