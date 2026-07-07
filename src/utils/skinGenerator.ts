/**
 * 用 Canvas API 为 sdk_baiya 组件生成默认皮肤 PNG。
 * 每个函数返回 data:image/png;base64,... 字符串，可直接赋给组件的 skin 属性。
 */

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── ScaleButton / SoundButton（三态：up / over / down）───

export interface ButtonSkinOptions {
  width?: number;
  height?: number;
  radius?: number;
  upColor?: string;
  overColor?: string;
  downColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export function generateButtonSkin(opts: ButtonSkinOptions = {}): string {
  const w = opts.width ?? 120;
  const h = opts.height ?? 40;
  const r = opts.radius ?? 8;
  const bw = opts.borderWidth ?? 1;
  const [c, ctx] = createCanvas(w, h * 3);

  const colors = [
    opts.upColor ?? '#4A90D9',
    opts.overColor ?? '#5BA0E9',
    opts.downColor ?? '#3A7BC8',
  ];

  colors.forEach((color, i) => {
    const y = i * h;
    roundRect(ctx, bw, y + bw, w - bw * 2, h - bw * 2, r);
    ctx.fillStyle = color;
    ctx.fill();
    if (opts.borderColor) {
      ctx.strokeStyle = opts.borderColor;
      ctx.lineWidth = bw;
      ctx.stroke();
    }
  });

  return c.toDataURL('image/png');
}

// ─── CheckBox（三态：unchecked / hover / checked）───

export interface CheckboxSkinOptions {
  size?: number;
  color?: string;
  checkColor?: string;
  borderColor?: string;
}

export function generateCheckboxSkin(opts: CheckboxSkinOptions = {}): string {
  const s = opts.size ?? 20;
  const [c, ctx] = createCanvas(s, s * 3);
  const color = opts.color ?? '#4A90D9';
  const border = opts.borderColor ?? '#999999';
  const check = opts.checkColor ?? '#ffffff';
  const r = 3;

  // unchecked
  roundRect(ctx, 1, 1, s - 2, s - 2, r);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // hover
  roundRect(ctx, 1, s + 1, s - 2, s - 2, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // checked
  roundRect(ctx, 1, s * 2 + 1, s - 2, s - 2, r);
  ctx.fillStyle = color;
  ctx.fill();
  // checkmark
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 2 + s * 0.5);
  ctx.lineTo(s * 0.42, s * 2 + s * 0.68);
  ctx.lineTo(s * 0.75, s * 2 + s * 0.32);
  ctx.strokeStyle = check;
  ctx.lineWidth = 2;
  ctx.stroke();

  return c.toDataURL('image/png');
}

// ─── Radio（三态：unchecked / hover / checked）───

export interface RadioSkinOptions {
  size?: number;
  color?: string;
  dotColor?: string;
  borderColor?: string;
}

export function generateRadioSkin(opts: RadioSkinOptions = {}): string {
  const s = opts.size ?? 20;
  const [c, ctx] = createCanvas(s, s * 3);
  const color = opts.color ?? '#4A90D9';
  const border = opts.borderColor ?? '#999999';
  const dot = opts.dotColor ?? '#ffffff';
  const cx = s / 2, r = s / 2 - 2;

  // unchecked
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // hover
  ctx.beginPath();
  ctx.arc(cx, s + cx, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // checked
  ctx.beginPath();
  ctx.arc(cx, s * 2 + cx, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, s * 2 + cx, r * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = dot;
  ctx.fill();

  return c.toDataURL('image/png');
}

// ─── TextInput 背景 ───

export interface InputSkinOptions {
  width?: number;
  height?: number;
  bgColor?: string;
  borderColor?: string;
  radius?: number;
}

export function generateInputSkin(opts: InputSkinOptions = {}): string {
  const w = opts.width ?? 200;
  const h = opts.height ?? 30;
  const r = opts.radius ?? 4;
  const [c, ctx] = createCanvas(w, h);

  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, r);
  ctx.fillStyle = opts.bgColor ?? '#ffffff';
  ctx.fill();
  ctx.strokeStyle = opts.borderColor ?? '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.stroke();

  return c.toDataURL('image/png');
}

// ─── ProgressBar（背景 + $bar 进度条）───

export interface ProgressSkinOptions {
  width?: number;
  height?: number;
  bgColor?: string;
  barColor?: string;
  radius?: number;
}

export function generateProgressSkin(opts: ProgressSkinOptions = {}): { bg: string; bar: string } {
  const w = opts.width ?? 200;
  const h = opts.height ?? 14;
  const r = opts.radius ?? 7;

  // background
  const [c1, ctx1] = createCanvas(w, h);
  roundRect(ctx1, 0, 0, w, h, r);
  ctx1.fillStyle = opts.bgColor ?? '#e0e0e0';
  ctx1.fill();

  // bar
  const [c2, ctx2] = createCanvas(w, h);
  roundRect(ctx2, 0, 0, w, h, r);
  ctx2.fillStyle = opts.barColor ?? '#4A90D9';
  ctx2.fill();

  return { bg: c1.toDataURL('image/png'), bar: c2.toDataURL('image/png') };
}

// ─── Tab（两态：inactive / active）───

export interface TabSkinOptions {
  width?: number;
  height?: number;
  activeColor?: string;
  inactiveColor?: string;
  radius?: number;
}

export function generateTabSkin(opts: TabSkinOptions = {}): string {
  const w = opts.width ?? 80;
  const h = opts.height ?? 36;
  const r = opts.radius ?? 6;
  const [c, ctx] = createCanvas(w, h * 2);

  // inactive
  roundRect(ctx, 0, 0, w, h, r);
  ctx.fillStyle = opts.inactiveColor ?? '#f0f0f0';
  ctx.fill();
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.stroke();

  // active
  roundRect(ctx, 0, h, w, h, r);
  ctx.fillStyle = opts.activeColor ?? '#4A90D9';
  ctx.fill();

  return c.toDataURL('image/png');
}

// ─── VSlider（滑轨 + 滑块）───

export interface SliderSkinOptions {
  trackWidth?: number;
  trackHeight?: number;
  thumbSize?: number;
  trackColor?: string;
  thumbColor?: string;
}

export function generateVSliderSkin(opts: SliderSkinOptions = {}): { track: string; thumb: string } {
  const tw = opts.trackWidth ?? 6;
  const th = opts.trackHeight ?? 100;
  const ts = opts.thumbSize ?? 16;

  // track
  const [c1, ctx1] = createCanvas(tw, th);
  roundRect(ctx1, 0, 0, tw, th, tw / 2);
  ctx1.fillStyle = opts.trackColor ?? '#e0e0e0';
  ctx1.fill();

  // thumb
  const [c2, ctx2] = createCanvas(ts, ts);
  ctx2.beginPath();
  ctx2.arc(ts / 2, ts / 2, ts / 2 - 1, 0, Math.PI * 2);
  ctx2.fillStyle = opts.thumbColor ?? '#4A90D9';
  ctx2.fill();
  ctx2.strokeStyle = '#ffffff';
  ctx2.lineWidth = 2;
  ctx2.stroke();

  return { track: c1.toDataURL('image/png'), thumb: c2.toDataURL('image/png') };
}

// ─── 一次性生成所有默认皮肤 ───

export interface DefaultSkins {
  button: string;
  checkbox: string;
  radio: string;
  radiogroup: string;
  textinput: string;
  progress: string;
  progressBar: string;
  tab: string;
  vslider: string;
  vsliderBar: string;
}

let _cachedSkins: DefaultSkins | null = null;

export function getDefaultSkins(): DefaultSkins {
  if (_cachedSkins) return _cachedSkins;

  const progress = generateProgressSkin();
  const slider = generateVSliderSkin();

  _cachedSkins = {
    button: generateButtonSkin(),
    checkbox: generateCheckboxSkin(),
    radio: generateRadioSkin(),
    radiogroup: generateRadioSkin(),
    textinput: generateInputSkin(),
    progress: progress.bg,
    progressBar: progress.bar,
    tab: generateTabSkin(),
    vslider: slider.track,
    vsliderBar: slider.thumb,
  };

  return _cachedSkins;
}
