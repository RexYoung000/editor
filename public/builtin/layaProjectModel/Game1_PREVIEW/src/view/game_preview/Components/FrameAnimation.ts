import { Utils, eValueType } from "./Utils";

export default class FrameAnimation extends com.klzz.ui.KlBox {
    private animation = new Laya.Animation;
    /**资源路径
     * 例如 /res/fileName{count}.png 则会读取 /res/fileName1.png /res/fileName2.png ....
     */
    public resPaths: string;
    public start: number = 0;
    public end: number = 0;
    public interval: number;
    public autoPlay: boolean = true;
    public loop: boolean = true;

    private files: string[];
    private _state: number;
    public get state(): number {
        return this._state;
    }
    public set state(v: number) {
        this.sync("state", this.state, v, undefined);
        if (v >= 0) {
            if (this.animation) this.animation.play(0, this.loop);
        } else {
            if (this.animation) {
                this.animation.stop();
            }
        }
        this._state = v;
    }

    private isLoaded = false;
    public createChildren() {
        super.createChildren();
        this.on(Laya.Event.DISPLAY, this, this.onDisPlay);
        this.on(Laya.Event.REMOVED, this, this.onRemove);
        this.state = 0;
    }
    private onRemove() {
        this.animation.clear();
        for (const file of this.files) {
            Laya.loader.clearRes(file)
        }
    }
    private onDisPlay() {
        this.files = [];
        for (let i = this.start; i <= this.end; i++) {
            let fileName = this.resPaths.replace("{count}", `${i}`);
            this.files.push(fileName);
        }
        this.isLoaded = true;
        this.animation.loadImages(this.files);
        this.animation.interval = this.interval;
        if (this.autoPlay) {
            this.animation.play();
        } else {
            this.animation.gotoAndStop(0);
        }

        this.animation.on(Laya.Event.COMPLETE, this, (evt) => {
            this.event(Laya.Event.END, evt);
        })
        this.addChild(this.animation);
    }
    public play(loop?: boolean) {
        this.loop = loop || this.loop;
        this.state++;

    }
    public stop() {
        this.state = 0;
    }
    /**停止到某个位置 0开始 -1结尾 其他 任意帧 */
    public stopAt(v: number) {
        this.__stopAt = v;
    }

    private ___stopAt: number;
    public get __stopAt(): number {
        return this.___stopAt;
    }
    public set __stopAt(v: number) {
        this.sync("__stopAt", 0, v, undefined);
        if (v > -2) {
            switch (v) {
                case -1:
                    this.animation.gotoAndStop(this.end - this.start);
                    break;
                case 0:
                    this.animation.gotoAndStop(v);
                    break;
                default:
                    this.animation.gotoAndStop(v);
                    break;
            }
        }

    }
}

Laya.View.regComponent("Components.FrameAnimation", FrameAnimation);