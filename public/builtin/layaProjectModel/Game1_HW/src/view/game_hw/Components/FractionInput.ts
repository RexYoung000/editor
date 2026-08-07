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
export default class FractionInput extends KlInputImage {
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
    /** 普通位图字体的实际渲染缩放，布局必须与 creatKlFontClip 保持一致。 */
    public fontScale = 1.3;
    /** 新字体图的单元格高度，用于按真实字号计算分数上下结构。 */
    public fontHeight = 59;
    /** 新字体图使用的分子/分母字号比例；旧场景缺少该字段时保持原值。 */
    public fractionPartScale = 0.8;
    /** 新字体图按分数字号比例同步调整横向占位；旧场景默认 1。 */
    public fractionWidthScale = 1;
    /** 新字体图按字号同步调整分数结构的纵向尺寸；旧场景默认 1。 */
    public fractionLayoutScale = 1;
    /** 只有新字体图启用按实际位数收紧的分数结构。 */
    public dynamicFractionLayout = false;
    public fractionHorizontalPadding = 10;
    public fractionVerticalGap = 6;
    public tokenGap = NaN;
    private _camp: string;
    public get camp(): string {
        return this._camp;
    }
    public set camp(v: string) {
        this._camp = v;
    }
    public fractionPlace = 3;
    public fractionPlace2 = 6;
    public fractionDigits = 4;

    private _lineSkin: string;
    public get lineSkin(): string {
        return this._lineSkin;
    }
    public set lineSkin(v: string) {
        this._lineSkin = v;
    }

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
    private isUpdatingValue = false;
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
        this.setFontClipValueForJudge(v);
        this.updateValue();
    }
    public get inputValue(): string {
        return this._fontClipValue || "";
    }
    public set inputValue(v: string) {
        this.fontClipValue = v || "";
    }
    private setFontClipValueForJudge(v: string) {
        const value = v || "";
        this._fontClipValue = value;
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
        this.inputs = [];
        this.clips = [];
        this.setFontClipValueForJudge("");
        this.updateValue();
        this.align = "center";
    }
    private onPrepared() {
        this.frameOnce(1, this, function (): void {
            KlKeyboardEvent.instance.on(KlKeyboardEvent.INPUT, this, this.onInput);
            KlKeyboardEvent.instance.on(KlKeyboardEvent.ACTIVE, this, this.onActiveInput);
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
        KlKeyboardEvent.instance.offAllCaller(input);
    }
    public eachAllKeyBorad(func: (keyBoard: KlBaseKeyboard) => void) {
        let view = VipThink.viewMgr["currPage"] && VipThink.viewMgr["currPage"].currView;
        if (!view) return;

        let visit = (node: any) => {
            if (!node || node.destroyed) return;
            if (node instanceof KlBaseKeyboard) {
                func(node);
            }
            for (let i = 0; i < (node.numChildren || 0); i++) {
                visit(node.getChildAt(i));
            }
        }
        visit(view);
    }
    private onActiveInput(evt: any) {
        let input = evt && evt.target;
        this.setFractionKeysDisabled(!!(input && input["isFractionLeafInput"]));
    }
    private setFractionKeysDisabled(disabled: boolean) {
        this.eachAllKeyBorad((keyBoard) => {
            let visit = (node: any) => {
                if (!node || node.destroyed) return;
                if (node instanceof KlKey && (node.output == "<_>" || node.output == "[<_>]")) {
                    if (disabled) {
                        if (!node.hasOwnProperty("__fractionOriginalDisabled")) {
                            node["__fractionOriginalDisabled"] = !!node.disabled;
                            node["__fractionOriginalGray"] = !!node.gray;
                            node["__fractionOriginalMouseEnabled"] = node.mouseEnabled !== false;
                        }
                        node.disabled = true;
                        node.gray = true;
                        node.mouseEnabled = false;
                    } else if (node.hasOwnProperty("__fractionOriginalDisabled")) {
                        node.disabled = node["__fractionOriginalDisabled"];
                        node.gray = node["__fractionOriginalGray"];
                        node.mouseEnabled = node["__fractionOriginalMouseEnabled"];
                        delete node["__fractionOriginalDisabled"];
                        delete node["__fractionOriginalGray"];
                        delete node["__fractionOriginalMouseEnabled"];
                    }
                }
                for (let i = 0; i < (node.numChildren || 0); i++) {
                    visit(node.getChildAt(i));
                }
            }
            visit(keyBoard);
        })
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
        if ((this.canSelected as any) === false || this.canSelected === "false") return;
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
        if ((this.canSelected as any) === false || this.canSelected === "false") return;
        if (!key) {
            return;
        }
        if (!key.fathKeyboard) {
            return;
        }
        if (key.camp != this.camp || this != key.fathKeyboard.currIpt) {
            return;
        }
        if (key.output == "del") {
            let values = this.analysisFormula(this.fontClipValue);
            let last = values[values.length - 1] || "";
            if (last.charAt(0) == "<" || last.charAt(0) == "[") {
                values.pop();
            } else if (last) {
                values[values.length - 1] = last.substr(0, last.length - 1);
            }
            this.fontClipValue = values.join("");
        } else if (key.output == undefined) {
            this.fontClipValue = "";
            this.lastOutPut = null;
        } else {
            if (key.output == "<_>" && this.getLength() + this.fractionPlace > this.place) return;
            if (key.output == "[<_>]" && this.getLength() + this.fractionPlace2 > this.place) return;
            if (this.getLength() + (key.output + "").length > this.place) return;
            if (key.output == "<_>" && !this.getInput()) return;
            if (key.output == "[<_>]" && !this.getInput2()) return;
            if (key.output != "<_>" && !this.getKlFontClip() && this.lastOutPut == "<_>") return;
            this.fontClipValue += key.output;
            this.lastOutPut = key.output;
            if (key.output == "<_>") {
                this.frameOnce(1, this, this.focusLatestFractionNumerator);
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
        let temp = "";
        let opener = "";
        for (let i = 0; i < _str.length; i++) {
            const str = _str[i];
            if (!opener && (str == "<" || str == "[")) {
                if (temp) lst.push(temp);
                temp = str;
                opener = str;
            } else if (opener && ((opener == "<" && str == ">") || (opener == "[" && str == "]"))) {
                temp += str;
                lst.push(temp);
                temp = "";
                opener = "";
            } else {
                temp += str;
            }
        }
        if (temp) lst.push(temp);
        return lst;
    }


    private updateValue() {
        if (this.isUpdatingValue) return;
        this.isUpdatingValue = true;
        try {
        this.removeAllInput();
        if (this.content) this.content.width = 0;
        if (this.fontClipValue) {
            let x = 0;
            let count = 0;
            let values = this.analysisFormula(this.fontClipValue) //this.fontClipValue.match(this.matchReg).filter(v => !!v);
            for (let str of values) {
                if (this.dynamicFractionLayout && count > 0) x += this.getLayoutGap();
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
                    this.layoutFractionBox(box, font1, font2, i1, i2);
                    font1.fontClipValue = i1;
                    font2.fontClipValue = i2;
                    box.x = x;
                    x += box.width + (this.dynamicFractionLayout ? 0 : this.getLayoutGap());
                    box.visible = true;
                } else if (str.charAt(0) == "[") {//分子分母 3个框
                    let [i1, i2, i3] = str.match(/\d+/g) || [" ", " ", " "];
                    let box = this.getInput2();
                    if (!box) continue;
                    let font0 = box.getChildAt(0) as KlInputImage;
                    let font1 = box.getChildAt(1) as KlInputImage;
                    let font2 = box.getChildAt(2) as KlInputImage;
                    font0.offAll(KlKeyboardEvent.INPUT_LATER);
                    font1.offAll(KlKeyboardEvent.INPUT_LATER);
                    font2.offAll(KlKeyboardEvent.INPUT_LATER);
                    font0.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child2, [count, font0, font1, font2]);
                    font1.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child2, [count, font0, font1, font2]);
                    font2.on(KlKeyboardEvent.INPUT_LATER, this, this.onInput1Child2, [count, font0, font1, font2]);
                    this.layoutMixedFractionBox(box, font0, font1, font2, i1, i2, i3);
                    font0.fontClipValue = i1;
                    font1.fontClipValue = i2;
                    font2.fontClipValue = i3;
                    box.x = x;
                    x += box.width + (this.dynamicFractionLayout ? 0 : this.getLayoutGap());
                    box.visible = true;
                } else {
                    let font = this.getKlFontClip();
                    if (!font) continue;
                    font.value = str;
                    font.x = x;
                    x += this.getFontClipAdvance(str.length) + (this.dynamicFractionLayout ? 0 : this.getLayoutGap());
                    font.visible = true;
                }
                count++;
            }
            this.content.width = x;
        }
        this.updateContentScale();
        } finally {
            this.isUpdatingValue = false;
        }
    }
    private nFontClipCount = 0;
    public creatKlFontClip() {
        let font = new KlFontClip(this.fontClipSkin, this.sheet);
        
        font.scale(this.fontScale, this.fontScale);

        font.spaceX = this.getLayoutGap();
        font.centerY = 0;
        font.name = "font_" + this.nFontClipCount;
        font.mouseEnabled = false;
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
        input1.camp = this.camp;
        input1.canSelected = "true";
        input1.fontClipSkin = this.fontClipSkin;
        input1["sheet"] = this.sheet;
        // 分子和分母是叶子输入格，不允许在其中再次插入分数结构。
        input1["isFractionLeafInput"] = true;
        input1["inputValidator"] = (value: string) => value !== "<_>" && value !== "[<_>]";

        input1.place = this.fractionDigits;
        input1["contentScale"] = this.fractionPartScale;
        if (this.dynamicFractionLayout) input1["spaceX"] = this.getLayoutGap();
        input1.frameOnce(1, this, () => {
            input1.fontClipValue = input1Value;
        })
        input1.on(Laya.Event.CLICK, this, this.addInputToKeyBorad, [input1]);
        input1.anchorX = input1.anchorY = 0;
        let input1_img = new KlImage;
        input1_img.skin = this.dynamicFractionLayout ? "" : this.nor.skin;
        input1_img.sizeGrid = this.nor.sizeGrid;
        input1_img.left = input1_img.right = input1_img.top = input1_img.bottom = 0
        input1_img.name = "input1_img_" + count;

        let input1_bg = new KlImage;
        input1_bg.skin = this.dynamicFractionLayout ? "" : this.bg.skin;
        input1_bg.sizeGrid = this.bg.sizeGrid;
        input1_bg.left = input1_bg.right = input1_bg.top = input1_bg.bottom = 0
        input1_bg.name = "bg";
        if (this.dynamicFractionLayout) input1_bg.visible = false;

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
            } else {
                count += str.length;
            }
        }
        return count;
    }
    public createInput2(count: number) {
        let box = new KlBox;
        box.centerY = 0;
        box.mouseThrough = true;
        box.name = "f2box_" + count;
        box.width = (this.fractionPlace2 * this.fontWidth + 20) * this.fractionWidthScale;

        let input0 = this.creatKlinputImage(count, 0, "");
        input0.x = 0
        input0.centerY = 0;
        input0.width = this.fractionPlace * this.fontWidth * this.fractionWidthScale;
        input0.height = 60 * this.fractionLayoutScale;
        let x = box.width - input0.width - 10 * this.fractionWidthScale;


        box.addChild(input0);
        this.inputList.push(input0);

        let input1 = this.creatKlinputImage(count, 1, "");
        input1.x = x;
        input1.y = 0;
        input1.width = this.fractionPlace * this.fontWidth * this.fractionWidthScale;
        input1.height = 60 * this.fractionLayoutScale;
        box.addChild(input1);
        this.inputList.push(input1);

        let input2 = this.creatKlinputImage(count, 2, "");
        input2.x = x;
        input2.y = 75 * this.fractionLayoutScale;
        input2.width = this.fractionPlace * this.fontWidth * this.fractionWidthScale;
        input2.height = 60 * this.fractionLayoutScale;
        box.addChild(input2);
        this.inputList.push(input2);

        let img = new KlImage;
        img.name = "img" + count;
        img.skin = this.lineSkin;
        img.y = 65 * this.fractionLayoutScale;
        img.x = x - 10 * this.fractionWidthScale;
        img.width = box.width - img.x;
        box.addChild(img);

        this.layoutMixedFractionBox(box, input0, input1, input2, "", "", "");

        this.content.addChild(box);
        return box;
    }
    public createInput(count: number, input1Value: string, input2Value: string) {
        let box = new KlBox;
        box.centerY = 0;
        box.mouseThrough = true;
        box.name = "box_" + count;
        box.width = (this.fractionDigits * this.fontWidth + 20) * this.fractionWidthScale;
        let input1 = this.creatKlinputImage(count, 0, input1Value);
        input1.x = 10 * this.fractionWidthScale;
        input1.y = 0;
        input1.width = this.fractionDigits * this.fontWidth * this.fractionWidthScale;
        input1.height = 60 * this.fractionLayoutScale;
        box.addChild(input1);
        this.inputList.push(input1);

        let input2 = this.creatKlinputImage(count, 1, input2Value);
        input2.x = 10 * this.fractionWidthScale;
        input2.y = 75 * this.fractionLayoutScale;
        input2.width = this.fractionDigits * this.fontWidth * this.fractionWidthScale;
        input2.height = 60 * this.fractionLayoutScale;
        box.addChild(input2);
        this.inputList.push(input2);

        let img = new KlImage;
        img.name = "img" + count;
        img.skin = this.lineSkin;
        img.y = 65 * this.fractionLayoutScale;
        img.width = box.width;
        box.addChild(img);

        this.layoutFractionBox(box, input1, input2, input1Value, input2Value);

        this.content.addChild(box);
        return box;
    }
    private onInput1Child(count: number, input1: KlInputImage, input2: KlInputImage) {
        if (this.isUpdatingValue) return;
        let values = this.analysisFormula(this.fontClipValue);
        let numerator = this.normalizeChildValue(input1.fontClipValue);
        let denominator = this.normalizeChildValue(input2.fontClipValue);
        if (!numerator && !denominator) {
            values.splice(count, 1);
            this.fontClipValue = values.join("");
            this.focusParentInput();
            this.event(KlKeyboardEvent.INPUT_LATER, [this]);
            return;
        }
        let str = values[count] = `<${numerator}_${denominator}>`;
        let v = values.join("");
        this.sync("fontClipValue", this.fontClipValue, v, undefined);
        this.setFontClipValueForJudge(v);
        this.layoutFractionBox(input1.parent as KlBox, input1, input2, numerator, denominator);
        this.reflowDynamicContent();
        this.event(KlKeyboardEvent.INPUT_LATER, [this]);
    }
    private onInput1Child2(count: number, input0: KlInputImage, input1: KlInputImage, input2: KlInputImage) {
        if (this.isUpdatingValue) return;
        let values = this.analysisFormula(this.fontClipValue);
        let integer = this.normalizeChildValue(input0.fontClipValue);
        let numerator = this.normalizeChildValue(input1.fontClipValue);
        let denominator = this.normalizeChildValue(input2.fontClipValue);
        if (!integer && !numerator && !denominator) {
            values.splice(count, 1);
            this.fontClipValue = values.join("");
            this.focusParentInput();
            this.event(KlKeyboardEvent.INPUT_LATER, [this]);
            return;
        }
        let str = values[count] = `[${integer}<${numerator}_${denominator}>]`;
        let v = values.join("");
        this.sync("fontClipValue", this.fontClipValue, v, undefined);
        this.setFontClipValueForJudge(v);
        this.layoutMixedFractionBox(
            input0.parent as KlBox,
            input0,
            input1,
            input2,
            integer,
            numerator,
            denominator,
        );
        this.reflowDynamicContent();
        this.event(KlKeyboardEvent.INPUT_LATER, [this]);
    }
    private normalizeChildValue(value: string): string {
        return value && value.trim() ? value.trim() : "";
    }
    private dynamicPartWidth(...values: string[]) {
        const digits = Math.max(1, ...values.map(value => Array.from(value || "").length));
        const glyphAdvance = Math.max(1, this.fontWidth + this.getLayoutGap());
        return Math.ceil(
            (this.fontWidth + (digits - 1) * glyphAdvance) * this.fractionPartScale
            + this.fractionHorizontalPadding * 2,
        );
    }
    private dynamicPartHeight() {
        return Math.ceil(this.fontHeight * this.fractionPartScale);
    }
    private redrawFractionFocus(input: KlInputImage) {
        if (!this.dynamicFractionLayout) return;
        const bg = input.getChildByName("bg") as KlImage;
        if (!bg) return;
        bg.graphics.clear();
        bg.graphics.drawRect(
            1,
            1,
            Math.max(1, input.width - 2),
            Math.max(1, input.height - 2),
            null as any,
            "#e4ad22",
            2,
        );
    }
    private layoutFractionBox(
        box: KlBox,
        input1: KlInputImage,
        input2: KlInputImage,
        numerator: string,
        denominator: string,
    ) {
        if (!this.dynamicFractionLayout) return;
        const width = this.dynamicPartWidth(numerator, denominator);
        const partHeight = this.dynamicPartHeight();
        const gap = this.fractionVerticalGap;
        box.width = width;
        box.height = partHeight * 2 + gap;
        input1.x = 0;
        input1.y = 0;
        input1.width = width;
        input1.height = partHeight;
        input2.x = 0;
        input2.y = partHeight + gap;
        input2.width = width;
        input2.height = partHeight;
        const line = box.getChildAt(2) as KlImage;
        if (line) {
            line.x = 0;
            line.y = partHeight + gap / 2;
            line.width = width;
        }
        this.redrawFractionFocus(input1);
        this.redrawFractionFocus(input2);
    }
    private layoutMixedFractionBox(
        box: KlBox,
        input0: KlInputImage,
        input1: KlInputImage,
        input2: KlInputImage,
        integer: string,
        numerator: string,
        denominator: string,
    ) {
        if (!this.dynamicFractionLayout) return;
        const partWidth = this.dynamicPartWidth(numerator, denominator);
        const partHeight = this.dynamicPartHeight();
        const gap = this.fractionVerticalGap;
        const structureHeight = partHeight * 2 + gap;
        const integerDigits = Math.max(1, Array.from(integer || "").length);
        const integerAdvance = Math.max(1, this.fontWidth + this.getLayoutGap());
        const integerWidth = Math.ceil(
            this.fontWidth + (integerDigits - 1) * integerAdvance + this.fractionHorizontalPadding,
        );
        const integerHeight = Math.ceil(this.fontHeight);
        const fractionX = integerWidth + this.getLayoutGap();
        box.width = fractionX + partWidth;
        box.height = Math.max(integerHeight, structureHeight);
        input0["contentScale"] = 1;
        input0.x = 0;
        input0.y = (box.height - integerHeight) / 2;
        input0.width = integerWidth;
        input0.height = integerHeight;
        input1.x = fractionX;
        input1.y = (box.height - structureHeight) / 2;
        input1.width = partWidth;
        input1.height = partHeight;
        input2.x = fractionX;
        input2.y = input1.y + partHeight + gap;
        input2.width = partWidth;
        input2.height = partHeight;
        const line = box.getChildAt(3) as KlImage;
        if (line) {
            line.x = fractionX;
            line.y = input1.y + partHeight + gap / 2;
            line.width = partWidth;
        }
        this.redrawFractionFocus(input0);
        this.redrawFractionFocus(input1);
        this.redrawFractionFocus(input2);
    }
    private reflowDynamicContent() {
        if (!this.dynamicFractionLayout || !this.content) return;
        let fractionIndex = 0;
        let mixedFractionIndex = 0;
        let clipIndex = 0;
        let renderedCount = 0;
        let x = 0;
        for (const value of this.analysisFormula(this.fontClipValue)) {
            if (value.charAt(0) == "<") {
                const box = this.inputs[fractionIndex++];
                if (box && box.visible) {
                    if (renderedCount > 0) x += this.getLayoutGap();
                    box.x = x;
                    x += box.width;
                    renderedCount++;
                }
            } else if (value.charAt(0) == "[") {
                const box = this.inputs2[mixedFractionIndex++];
                if (box && box.visible) {
                    if (renderedCount > 0) x += this.getLayoutGap();
                    box.x = x;
                    x += box.width;
                    renderedCount++;
                }
            } else {
                const clip = this.clips[clipIndex++];
                if (clip && clip.visible) {
                    if (renderedCount > 0) x += this.getLayoutGap();
                    clip.x = x;
                    x += this.getFontClipAdvance(value.length);
                    renderedCount++;
                }
            }
        }
        this.content.width = x;
        this.updateContentScale();
    }
    private inputs: KlBox[] = [];
    private inputs2: KlBox[] = [];
    private clips: KlFontClip[] = [];
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
    private getLayoutGap(): number {
        const tokenGap = Number(this.tokenGap);
        if (this.dynamicFractionLayout && Number.isFinite(tokenGap)) return tokenGap;
        const gap = Number(this.spaceX);
        return Number.isFinite(gap) ? gap : 0;
    }
    private getFontClipAdvance(charCount: number): number {
        const width = Number(this.fontWidth);
        const fontWidth = Number.isFinite(width) ? width : 0;
        if (this.dynamicFractionLayout) {
            const count = Math.max(0, charCount);
            if (count === 0) return 0;
            const advance = Math.max(1, fontWidth + this.getLayoutGap());
            return (fontWidth + (count - 1) * advance) * this.fontScale;
        }
        return charCount * (fontWidth + this.getLayoutGap()) * this.fontScale;
    }
    private updateContentScale() {
        if (!this.content) return;
        let scale = Number(this.contentScale);
        if (!scale || scale <= 0) {
            let widthScale = this.content.width > 0 ? (this.width - 16) / this.content.width : 1;
            let heightScale = (this.height - 12) / (135 * this.fractionLayoutScale);
            scale = Math.max(0.35, Math.min(1, widthScale, heightScale));
        }
        this.content.scale(scale, scale);
    }
    private focusInput(input: KlInputImage) {
        if (!input) return;
        this.addInputToKeyBorad(input);
        KlKeyboardEvent.instance.event(KlKeyboardEvent.UNSELECT_ALLINPUTIMAGE, [input]);
        let evt: any = { target: input };
        KlKeyboardEvent.instance.event(KlKeyboardEvent.ACTIVE, [evt]);
        input.isSelected = true;
    }
    private focusLatestFractionNumerator() {
        let latest: KlBox;
        for (const input of this.inputs) {
            if (input.visible) latest = input;
        }
        if (latest) this.focusInput(latest.getChildAt(0) as KlInputImage);
    }
    private focusParentInput() {
        KlKeyboardEvent.instance.event(KlKeyboardEvent.UNSELECT_ALLINPUTIMAGE, [this]);
        let evt: any = { target: this };
        KlKeyboardEvent.instance.event(KlKeyboardEvent.ACTIVE, [evt]);
        this.isSelected = true;
    }
    private onDisPlay() {
        this.nor = this.getChildAt(0) as KlImage;
        this.bg = this.getChildByName("bg") as KlImage;
        let box = new KlBox;
        box.mouseThrough = true;
        box.scale(1, 1);
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
        for (let i = 0; i < this.maxTreeFractionNum; i++) {
            let inputs = this.createInput2(i);
            inputs.visible = false;
            this.inputs2.push(inputs);
        }
        for (let i = 0; i < this.maxDiscontinuous; i++) {
            let clip = this.creatKlFontClip();
            clip.visible = false;
            this.clips.push(clip);
        }
    }
    private getInput() {
        for (const input of this.inputs) {
            if (!input.visible) {
                return input;
            }
        }
        let input = this.createInput(this.inputs.length, "", "");
        input.visible = false;
        this.inputs.push(input);
        return input;
    }
    private getInput2() {
        for (const input of this.inputs2) {
            if (!input.visible) {
                return input;
            }
        }
    }
    private getKlFontClip() {
        for (const clip of this.clips) {
            if (!clip.visible) {
                return clip;
            }
        }
        let clip = this.creatKlFontClip();
        clip.visible = false;
        this.clips.push(clip);
        return clip;
    }
    private clearAll() {
        for (const input of this.inputs) {
            input.visible = false;
        }
        for (const input of this.inputs2) {
            input.visible = false;
        }
        for (const input of this.inputList) {
            input.fontClipValue = " ";
        }
        for (const clip of this.clips) {
            clip.visible = false;
        }
    }
}

Laya.View.regComponent("Components.FractionInput", FractionInput);
// 兼容旧版场景 JSON 使用的短组件名。
Laya.View.regComponent("FractionInput", FractionInput);


