declare global {
  interface Window {
    Laya: {
      stage: {
        size(w: number, h: number): void;
        addChild(child: unknown): void;
        width: number;
        height: number;
        scaleMode: string;
      };
      init(w: number, h: number): void;
    };
    ClassUtils: {
      getInstance(className: string): unknown;
      createByJson(json: object): unknown;
    };
    Sprite: new () => {
      graphics: {
        drawRect(x: number, y: number, w: number, h: number, fill: string | null, stroke?: string): void;
        drawCircle(x: number, y: number, r: number, fill: string): void;
      };
      pos(x: number, y: number): void;
      size(w: number, h: number): void;
      addChild(child: unknown): void;
    };
    Text: new () => {
      text: string;
      color: string;
      fontSize: number;
      pos(x: number, y: number): void;
    };
  }
}

export {};
