// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LayaObj = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LayaAny = any;

import type { Element } from '../../types';
import { loadLibraryFont } from '../fontLoader';
import { DEFAULT_FONT_ID } from '../../elements/fontLibrary';

const _objects = new Map<string, LayaObj>();

let _previewMode = false;

export function laya(): LayaAny { return (window as LayaAny).Laya; }
export function classUtils(): LayaAny { return (window as LayaAny)?.Laya?.ClassUtils ?? null; }

export function isPreviewMode(): boolean { return _previewMode; }
export function setPreviewMode(v: boolean): void { _previewMode = v; }

export function objects(): Map<string, LayaObj> { return _objects; }

// ─── worldRoot：编辑态的 pan/zoom 容器 ───

let _worldRoot: LayaObj = null;
let _boundaryFrame: LayaObj = null;

export function worldRoot(): LayaObj { return _worldRoot; }
// canvasRoot 别名：让 components.ts、Canvas.tsx 等旧代码无需立即改名
export function canvasRoot(): LayaObj { return _worldRoot; }
export function boundaryFrame(): LayaObj { return _boundaryFrame; }

export function initWorldRoot(): void {
  const L = laya();
  if (!L?.stage) return;
  if (_worldRoot) return;

  _worldRoot = new (window as LayaAny).laya.display.Sprite();
  _worldRoot.name = '_worldRoot';
  _worldRoot.mouseEnabled = true;
  _worldRoot.mouseThrough = true;
  L.stage.addChild(_worldRoot);

  _boundaryFrame = new (window as LayaAny).laya.display.Sprite();
  _boundaryFrame.name = '_boundaryFrame';
  _boundaryFrame.graphics.drawRect(0, 0, 1920, 1080, '#000000', '#444444', 2);
  _boundaryFrame.size(1920, 1080);
  _boundaryFrame.mouseEnabled = false;
  _boundaryFrame.mouseThrough = true;
  _worldRoot.addChildAt(_boundaryFrame, 0);
}

export function setWorldTransform(panX: number, panY: number, zoom: number): void {
  if (!_worldRoot) return;
  _worldRoot.x = panX;
  _worldRoot.y = panY;
  _worldRoot.scaleX = zoom;
  _worldRoot.scaleY = zoom;
}

export function getWorldTransform(): { panX: number; panY: number; zoom: number } {
  if (!_worldRoot) return { panX: 0, panY: 0, zoom: 1 };
  return { panX: _worldRoot.x, panY: _worldRoot.y, zoom: _worldRoot.scaleX };
}

export function registerObject(id: string, obj: LayaObj) {
  _objects.set(id, obj);
}

export function getObject(id: string): LayaObj | undefined {
  return _objects.get(id);
}

// hideSelectionBox 通过 setter 注入，避免 core → selection → core 循环依赖
let _hideSelectionBox: (() => void) | null = null;
export function setHideSelectionBox(fn: (() => void) | null): void { _hideSelectionBox = fn; }

export function removeObject(id: string) {
  const obj = _objects.get(id);
  if (obj) {
    try { obj.stop?.(); } catch { /* ignore */ }
    try { obj.parent?.removeChild(obj); } catch { /* ignore */ }
  }
  _objects.delete(id);
  _hideSelectionBox?.();
}

export function clearAllObjects(): void {
  for (const [, obj] of _objects) {
    try { obj?.stop?.(); } catch { /* ignore */ }
    try { obj?.parent?.removeChild(obj); } catch { /* ignore */ }
  }
  _objects.clear();
  // KlSoundManager.playSound 不返回 SoundChannel，导致 Skeleton._soundChannelArr 为空，
  // stop() 无法停止已播放的音频。需要直接通过 SoundManager 停止所有音效，
  // 并清空 KlSoundManager 的 3 帧延迟队列防止待播放音频继续触发。
  try {
    const L = laya();
    if (L?.SoundManager) L.SoundManager.stopAllSound();
    const w = window as LayaAny;
    const KlSM = w.Laya?.__classmap?.['com.klzz.media.KlSoundManager'];
    if (KlSM?._soundList) KlSM._soundList = [];
  } catch { /* ignore */ }
}

export function syncTransform(id: string, x: number, y: number, w: number, h: number) {
  const obj = _objects.get(id);
  if (!obj) return;
  obj.x = x;
  obj.y = y;
  obj.width = w;
  obj.height = h;
}

export function syncProps(id: string, element: Element, propsChanged = false) {
  const obj = _objects.get(id);
  if (!obj) return;
  syncTransform(id, element.x, element.y, element.width, element.height);
  if (propsChanged) {
    import('./components').then(({ applyKlProps }) => {
      applyKlProps(obj, element);
    }).catch(() => {
      // 组件加载失败，跳过属性应用
    });
  }
}

export function preloadAtlas(): Promise<void> {
  const w = window as LayaAny;
  const cu = classUtils();
  const Klzz = w.Klzz ?? w.Laya?.Klzz ?? w.com?.klzz?.Klzz;

  const alreadyRegistered = cu && typeof cu.getClass === 'function'
    && cu.getClass('ScaleButton') && typeof cu.getClass('ScaleButton') === 'function';

  if (alreadyRegistered) {
    console.log('[laya-bridge] sdk_baiya components already registered');
  } else {
    if (Klzz?.__init__) {
      const Noop = function(this: LayaAny) { this.__init__ = () => {}; this.reset = () => {}; } as LayaAny;
      const NoopView = function() {} as LayaAny;
      NoopView.prototype.addChild = () => {};
      NoopView.prototype.__init__ = () => {};

      try {
        Klzz.__init__(1920, 1080, Noop, Noop, Noop, NoopView);
        console.log('[laya-bridge] Klzz.__init__ completed, components registered');
      } catch (e) {
        console.warn('[laya-bridge] Klzz.__init__ failed:', e);
      }
    }
  }

  // 补注册 Klzz.__init__ 遗漏的组件
  if (cu) {
    const View = w.Laya?.View ?? w.laya?.ui?.Component?.View;
    const classmap = w.Laya?.__classmap;
    if (View?.regComponent && classmap) {
      const extras: Record<string, string> = {
        'ImageScaleTime': 'com.klzz.ui.custom.BiaoDaSiKu.ImageScaleTime',
      };
      for (const [name, path] of Object.entries(extras)) {
        const cls = classmap[path];
        if (cls && !cu.getClass(name)) View.regComponent(name, cls);
      }
    }
  }

  // mock sdk_baiya 运行环境
  const classmap = w.Laya?.__classmap;
  if (classmap) {
    const GlobalModel = classmap['com.biz.model.GlobalModel'];
    if (GlobalModel && !GlobalModel.user) {
      GlobalModel.user = { id: 'editor', userType: 1, currentRoomId: '', getLessonData: () => ({}), setWatchMap: () => {}, watchingUser: null };
    }

    const ViewManager = classmap['com.klzz.ui.ViewManager'];
    if (ViewManager && !ViewManager._instance) {
      ViewManager._instance = {
        handleSync: () => {},
        getXpathByComp: () => '',
        getCursorBox: () => null,
        toast: () => {},
        currPage: { currView: { playSound: () => {} }, status: 'prepared' },
        currPageIdx: 0, currSubviewIdx: 0,
        root: { getChildByName: () => null },
        on: () => {}, once: () => {}, off: () => {}, event: () => {},
      };
    }

    const VT = classmap['com.biz.VipThink'];
    if (VT) {
      VT._config = VT._config || { release: 'dev', onRunner: false, course: '' };
      if (!VT.debugLog) VT.debugLog = () => {};
    }
  }

  return new Promise<void>((resolve) => {
    const L = laya();
    if (!L?.loader) { resolve(); return; }

    loadLibraryFont(DEFAULT_FONT_ID).then((name) => {
      if (name) console.log('[laya-bridge] default font loaded:', name);
    }).catch((e) => {
      console.warn('[laya-bridge] default font load failed:', e);
    });

    L.loader.load(
      [{ url: 'res/atlas/share/comp.atlas', type: 'atlas' }],
      L.Handler.create(null, () => {
        console.log('[laya-bridge] comp.atlas loaded');
        resolve();
      })
    );
  });
}