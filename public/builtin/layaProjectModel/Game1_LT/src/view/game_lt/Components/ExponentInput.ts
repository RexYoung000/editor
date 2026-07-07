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
/**
 * 仅用于底数跟指数的输入框，没有分数，没有平方根立方根的输入框
 */
export default class ExponentInput extends KlInputImage {
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
    private _camp: string;
    private _camp1: string;
    public get camp1(): string {
        return this._camp1;
    }
    public set camp1(v: string) {
        this._camp1 = v;
    }
    public fractionPlace = 3;
    public fractionPlace2 = 6;

    

    private _camp2: string;
    public get camp2(): string {
        return this._camp2;
    }
    public set camp2(v: string) {
        this._camp2 = v;
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
        this.myUpdateValue();
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
    /**最大3分式输入框 */
    public maxTreeFractionNum = 1;
    public maxDiscontinuous = 8;

    createChildren() {
        super.createChildren();
        this.on(Laya.Event.DISPLAY, this, this.onDisPlay);
        VipThink.viewMgr.once(ViewEvent.MAINVIEW_PREPARED, this, this.onPrepared);
        // this.inputs = [];
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
                this.camp = this.camp2;
                this.nor.event(Laya.Event.CLICK, { target: this.nor });
            })
            // this.fontClipValue += "^~";
            // this.lastOutPut = key.output;
            
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
                        this.fontClipValue = this.fontClipValue.substr(0, this.fontClipValue.length - 1); 
                    }
                } 
            }else if (last == ">") {
                let arr = this.fontClipValue.match(/<.*?>/g);
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
            if (this.getLength() + (key.output + "").length > this.place && key.output != "<_>") return;
            if(this.camp == this.camp2){
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
    public analysisFormula2(_str: string): string[] {
        let lst = [];
        let index = 0;
       
        let temp1 = [];
        for (let i = 0; i < _str.length; i++) {
            const str = _str[i];
            if (str == "^") {
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
                temp1.push(str);
              
            } else if (str == "~") {
                temp1.push(str);
                temp1.length && lst.push(temp1.join(""));
                temp1 = [];
              
            } else {
                temp1.push(str);
            }
        }
       
        temp1.length && lst.push(temp1.join(""));
        // console.log("analysisFormula2:",_str, lst);
        return lst;
    }
   

    public myUpdateValue(){
        this.removeAllInput();
        if(this.fontClipValue){
            let x = 0;
            let count = 0;
            let values = this.analysisFormula2(this.fontClipValue);
            for (let str of values) {
                if (str.charAt(0) == "^") {
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
                    
                }
                else {
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
    private nExponentFontClipCount = 0;
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
        let values = this.analysisFormula2(this.fontClipValue);
       
        let count = 0;
        for (const str of values) {
            if (str.charAt(0) == "^") {
                count+=str.length-2>0?str.length-2:0;
            }else {
                count += str.length;
            }
        }
        return count;
    }
   
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

        this.camp1 = this.camp;
        
    }

    public get camp(){
        return this._camp;
    }
    public set camp(value){
        this.sync("camp", this._camp, value,undefined);
        this._camp = value;
    }

   
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
       
        for (const clip of this.clips) {
            clip.visible = false;
        }
        for (const clip of this.exponentClips) {
            clip.visible = false;
        }
    }
}

Laya.View.regComponent("Components.ExponentInput", ExponentInput);


