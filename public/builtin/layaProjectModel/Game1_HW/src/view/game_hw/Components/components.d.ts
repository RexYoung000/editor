declare module Components {
    class FractionInput extends com.klzz.ui.custom.KeyBoard.KlInputImage {
        public camp: string;
        public camp2: string;
        public fontClipValue: string;
        public lineSkin: string;
        public sheet: string;
        public spaceX: number;
        public contentScale: number;
        public fontClipSkin: string
        public place: number;

    }
    class ExponentInput extends com.klzz.ui.custom.KeyBoard.KlInputImage {
        public camp: string;
        public camp2: string;
        public fontClipValue: string;
        public lineSkin: string;
        public sheet: string;
        public spaceX: number;
        public contentScale: number;
        public fontClipSkin: string
        public place: number;

    }
    class SpecialInput extends com.klzz.ui.custom.KeyBoard.KlInputImage {
        public camp: string;
        public camp2: string;
        public camp3: string;
        public fontClipValue: string;
        public sheet: string;
        public spaceX: number;
        public contentScale: number;
        public fontClipSkin: string
        public place: number;

    }
    class Drager extends com.klzz.ui.custom.KeyBoard.KlInputImage {
        onDragEndHandler: Laya.Handler;
    }
    class FrameAnimation extends Laya.Box {
        /**动画唯一名称 */
        public aniName: string;
        /**资源路径  例如 /res/fileName{count}.png 则会读取 /res/fileName1.png /res/fileName2.png .... */
        public resPaths: string;
        /**名称中count起始值 */
        public start: number;
        /**名字中count的结束值 */
        public end: number;
        /**间隔毫秒时间 */
        public interval: number;
        /**是否自动播放 */
        public autoPlay: boolean;
        /**循环 */
        public loop: boolean;
        /**
         * 播放
         * @param loop 是否循环
         */
        play(loop?: boolean);
        stop()
        /**停止到某个位置 0开始 -1结尾 其他 任意帧 */
        stopAt(v: number)
    }
}