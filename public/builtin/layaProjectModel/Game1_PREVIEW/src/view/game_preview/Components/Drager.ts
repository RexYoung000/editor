import { Utils } from "./Utils";

export default class Drager extends com.klzz.ui.KlBox {
    private drag: Laya.Box;
    private drop: Laya.Box;
    private KlTween: com.klzz.ui.KlTweenBox;
    public createChildren() {
        super.createChildren();
        this.on(Laya.Event.DISPLAY, this, this.onDisPlay);
    }
    private onDisPlay() {
        this.drag = this.getChildByName("drag") as Laya.Box;
        this.drop = this.getChildByName("drop") as Laya.Box;
        this.KlTween = this.addChild(new com.klzz.ui.KlTweenBox()) as com.klzz.ui.KlTweenBox;
        this.KlTween.isNewMode = true;
        this.mouseThrough = true;
        this.drag.mouseThrough = true;
        this.drop.mouseThrough = true;
        this.mouseThrough = true;
        for (let i = 0; i < this.drop.numChildren; i++) {
            const img = this.drop.getChildAt(i) as Laya.Image;
            img.name = `${i}`;
        }
        for (let i = 0; i < this.drag.numChildren; i++) {
            const img = this.drag.getChildAt(i) as Laya.Image;
            img.name = `${i}`;
            img.on(Laya.Event.MOUSE_DOWN, this, this.onMouseDown, [img])
            img.on(Laya.Event.DRAG_START, this, this.onStartDrag, [img]);
            img.on(Laya.Event.DRAG_END, this, this.onDragEnd, [img, img.x, img.y]);
            img.on(Laya.Event.DRAG_MOVE, this, this.onDragMove, [img]);
        }
    }
    public onDragEndHandler: Laya.Handler;

    private onDragEnd(img: Laya.Image, x: number, y: number) {
        let target = this.getTarget();
        if (target) {
            if (this.onDragEndHandler) {
                let re = this.onDragEndHandler.runWith([img, target]);
                switch (re) {
                    case 1:
                        img.pos(x, y);
                        return;
                    case 2:
                        this.KlTween.toNew(img, { x: x, y: y }, 200, Laya.Ease.sineIn);
                        return;
                    default:
                        break;
                }

            }
            img.pos(target.x, target.y);
        } else {
            this.KlTween.toNew(img, { x: x, y: y }, 200, Laya.Ease.sineIn);
        }
    }
    private onDragMove(img: Laya.Image) {
        let x = Laya.stage.mouseX, y = Laya.stage.mouseY;
        if (x > 1920 || y > 1080 || x < 0 || y < 0) {
            img.stopDrag();
        }
    }
    private onStartDrag() {

    }
    private onMouseDown(img: Laya.Image) {
        img.startDrag();
    }

    public getTarget() {
        for (let i = 0; i < this.drop.numChildren; i++) {
            const img = this.drop.getChildAt(i) as Laya.Image;
            if (img.hitTestPoint(Laya.stage.mouseX, Laya.stage.mouseY)) {
                return img;
            }
        }
    }
}
Laya.View.regComponent("Components.Drager", Drager);