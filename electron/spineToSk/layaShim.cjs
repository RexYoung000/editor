// Laya 运行时兼容层（仅供 Spine→.sk 转换使用）
// 提供 LayaAnimationTool.js 所需的所有 Laya.* 全局函数和类，
// 用纯 JS / Node Buffer 实现，避免任何 DOM / 渲染依赖。

const Byte = require('./Byte.cjs');

// ─── Laya 元类系统 polyfill ───
// __package 把 fullName 路径下的命名空间挂到 _root 上（默认 globalThis，
// 通过 setRoot() 在 vm sandbox 启动时切到 sandbox 自身）
let _root = globalThis;
const Laya = {
  __classmap: {},
  __packages: {},
  __propun: { value: null, writable: true, enumerable: false, configurable: true },
  setRoot(r) { _root = r; },
  un(obj, name, value) {
    value || (value = obj[name]);
    Laya.__propun.value = value;
    Object.defineProperty(obj, name, Laya.__propun);
    return value;
  },
  uns(obj, names) { names.forEach((o) => Laya.un(obj, o)); },
  __extend(o, _super) {
    function ___() { this.constructor = o; }
    ___.prototype = _super.prototype;
    o.prototype = new ___();
    o.__super = _super;
  },
  __package(name, c) {
    const words = name.split('.');
    let o = _root;
    for (let i = 0; i < words.length - 1; i++) {
      o[words[i]] = o[words[i]] || {};
      o = o[words[i]];
    }
    o[words[words.length - 1]] = c;
  },
  class(o, fullName, _super) {
    if (_super) Laya.__extend(o, _super);
    if (fullName) {
      Laya.__package(fullName, o);
      Laya.__classmap[fullName] = o;
    }
    const un = Laya.un, p = o.prototype;
    un(p, '__class', o);
    un(p, '__super', _super);
    un(p, '__className', fullName);
    un(o, '__super', _super);
    un(o, '__className', fullName);
    un(o, '__isclass', true);
  },
  static(_class, def) {
    for (let i = 0, sz = def.length; i < sz; i += 2) {
      const name = def[i], getfn = def[i + 1];
      Object.defineProperty(_class, name, {
        get() { delete this[name]; return (this[name] = getfn.call(this)); },
        set(v) { delete this[name]; this[name] = v; },
        enumerable: true, configurable: true,
      });
    }
  },
  getset(isStatic, o, name, getfn, setfn) {
    if (getfn && setfn) Object.defineProperty(o, name, { get: getfn, set: setfn, enumerable: false, configurable: true });
    else {
      if (getfn) Object.defineProperty(o, name, { get: getfn, enumerable: false, configurable: true });
      if (setfn) Object.defineProperty(o, name, { set: setfn, enumerable: false, configurable: true });
    }
  },
  __newvec(size, def) {
    const arr = new Array(size);
    for (let i = 0; i < size; i++) arr[i] = def;
    return arr;
  },
  interface() {},
  imps() {},
  __init(classes) {
    if (!Array.isArray(classes)) return;
    classes.forEach((c) => { if (c && c.__init$) c.__init$(); });
  },
  __isClass(o) { return o && (o.__isclass || o === Object || o === String || o === Array); },
  __copy(dec, src) {
    if (!src) return null;
    dec = dec || {};
    for (const i in src) dec[i] = src[i];
    return dec;
  },
  __typeof(o, value) {
    if (!o || !value) return false;
    if (value === String) return typeof o === 'string';
    if (value === Number) return typeof o === 'number';
    if (value.__interface__) value = value.__interface__;
    else if (typeof value !== 'string') return o instanceof value;
    return (o.__imps && o.__imps[value]) || (o.__class === value);
  },
  __as(value, type) { return Laya.__typeof(value, type) ? value : null; },
};

// ─── 数学：Matrix（仅 SpineFactory 用到的方法） ───
class Matrix {
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a; this.b = b; this.c = c; this.d = d; this.tx = tx; this.ty = ty;
  }
  identity() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.tx = 0; this.ty = 0; return this; }
  rotate(angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const a1 = this.a, c1 = this.c, tx1 = this.tx;
    this.a = a1 * cos - this.b * sin;
    this.b = a1 * sin + this.b * cos;
    this.c = c1 * cos - this.d * sin;
    this.d = c1 * sin + this.d * cos;
    this.tx = tx1 * cos - this.ty * sin;
    this.ty = tx1 * sin + this.ty * cos;
    return this;
  }
  scale(x, y) {
    this.a *= x; this.b *= y; this.c *= x; this.d *= y; this.tx *= x; this.ty *= y;
    return this;
  }
  translate(x, y) { this.tx += x; this.ty += y; return this; }
  setTranslate(x, y) { this.tx = x; this.ty = y; return this; }
  clone() { return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty); }
  static mul(left, right, out) {
    const la = left.a, lb = left.b, lc = left.c, ld = left.d, ltx = left.tx, lty = left.ty;
    const ra = right.a, rb = right.b, rc = right.c, rd = right.d, rtx = right.tx, rty = right.ty;
    out.a = la * ra + lb * rc;
    out.b = la * rb + lb * rd;
    out.c = lc * ra + ld * rc;
    out.d = lc * rb + ld * rd;
    out.tx = ltx * ra + lty * rc + rtx;
    out.ty = ltx * rb + lty * rd + rty;
    return out;
  }
}

class Point { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }

// ─── 事件：EventDispatcher（IDE 代码里 SpineFactory 通过 on/event 传 complete） ───
function EventDispatcher() { this._listeners = {}; }
EventDispatcher.prototype.on = function (type, caller, fn) {
  (this._listeners[type] = this._listeners[type] || []).push({ caller, fn });
  return this;
};
EventDispatcher.prototype.once = function (type, caller, fn) { return this.on(type, caller, fn); };
EventDispatcher.prototype.off = function () { return this; };
EventDispatcher.prototype.event = function (type, data) {
  const arr = this._listeners[type];
  if (!arr) return false;
  for (const { caller, fn } of arr) fn.call(caller, data);
  return true;
};

const Event = { COMPLETE: 'complete' };

// ─── 显示：Sprite（仅作为 SpineFactory 内部容器，所有方法 no-op） ───
function Sprite() {
  EventDispatcher.call(this);
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1; this.rotation = 0;
  this.transform = null;
  this.graphics = {
    drawCircle() {}, drawRect() {}, drawLine() {}, drawLines() {}, drawPoly() {},
    drawTexture() {}, clear() {}, fillText() {},
  };
  this._children = [];
}
Sprite.prototype = Object.create(EventDispatcher.prototype);
Sprite.prototype.constructor = Sprite;
Sprite.prototype.addChild = function (c) { this._children.push(c); return c; };
Sprite.prototype.scale = function (sx, sy) { this.scaleX = sx; this.scaleY = sy; return this; };

// ─── 资源：Texture（只用 width/height 属性） ───
class Texture {
  constructor(width = 0, height = 0) { this.width = width; this.height = height; }
  static create(/* tex, x, y, w, h, ox, oy, fw, fh */) { return new Texture(); }
}

// ─── 全局占位：Loader / Handler / Browser / WebGL ───
const Loader = { IMAGE: 'image', JSON: 'json', getRes() { return null; } };
class Handler { constructor() {} static create() { return new Handler(); } }
const Browser = { clientWidth: 1920, clientHeight: 1080, window: {} };
const WebGL = {};

// ─── stage / loader 占位 ───
const stage = new Sprite();
stage.addChild = () => {};
Laya.stage = stage;
Laya.loader = { load() {} };
Laya.init = () => {};

// ─── Templet / AnimationTemplet 版本常量 ───
const AnimationTemplet = { LAYA_ANIMATION_VISION: 'LAYAANIMATION:1.7.0' };
const Templet = { LAYA_ANIMATION_VISION: 'LAYAANIMATION:1.7.0' };

// ─── 导出 Laya 兼容入口（供 LayaAnimationTool 加载时使用） ───
module.exports = {
  Laya,
  laya: {
    ani: { AnimationTemplet, bone: { Templet } },
    utils: { Browser, Byte, Handler },
    events: { Event, EventDispatcher },
    net: { Loader },
    maths: { Matrix, Point },
    display: { Sprite },
    resource: { Texture },
    webgl: { WebGL },
  },
  AnimationTemplet, Browser, Byte, Event, EventDispatcher, Handler, Loader,
  Matrix, Point, Sprite, Templet, Texture, WebGL,
};
