// 加载并执行 LayaAirIDE 的 laya.LayaAnimationTool.js
// 通过 vm.Script 注入自定义 Laya / window / document 上下文，
// 导出转换所需的全部类（SpineFactory、SpineFileAdpter、TestLayaAnimation、Atlas 等）。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const shim = require('./layaShim.cjs');

// 优先使用本地 vendor 目录（开发+打包都适用），回退到 IDE 安装路径
const VENDOR_PATH = path.join(__dirname, 'vendor', 'laya.LayaAnimationTool.js');
const DEFAULT_TOOL_PATH = fs.existsSync(VENDOR_PATH)
  ? VENDOR_PATH
  : 'D:/LayaAirIDE_2.1.1.1/resources/app/out/vs/layaEditor/h5/js/laya.LayaAnimationTool.js';

function loadLayaAnimationTool(toolPath = DEFAULT_TOOL_PATH) {
  const src = fs.readFileSync(toolPath, 'utf8');

  // 构造一个 sandbox 全局
  // 关键：不注入 Array/Object 等内置构造函数。让 vm context 用自己的内置 Array，
  // 否则 vendor 里 `arr instanceof Array` 会失败 — sandbox 注入的是外部 Array，
  // 但 vendor 内部 `var x=[]` 字面量产生的是 vm 内置 Array，两边不是同一个引用，
  // 导致曲线扩展数据被错误归类为 wrong type，.sk 文件少写曲线参数。
  const sandbox = {
    console,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
    Float32Array, Float64Array, ArrayBuffer, DataView, Buffer,
    setTimeout, clearTimeout, setInterval, clearInterval,
  };

  // window/document 占位：LayaAnimationTool.js 通过 (window, document, Laya) IIFE 接收
  sandbox.window = sandbox;
  sandbox.document = { createElement: () => ({ getContext: () => ({}) }) };

  // 注入 Laya 元类系统及全部 laya.* 命名空间到 sandbox 全局
  sandbox.Laya = shim.Laya;
  sandbox.laya = shim.laya;
  // IDE 代码里以 var X=laya.foo.X 顶部解构，所以 laya 必须可访问

  // 暴露 IIFE 内部声明的全局类（写到 sandbox 上，供后续读取）
  sandbox.dragonBones = {};
  sandbox.Spine = {};
  sandbox.LayaAnimation = {};

  // 执行 IDE 源码
  const ctx = vm.createContext(sandbox);
  // 把命名空间挂载根切到 sandbox 自身（这样 `Spine.X` 之类裸名引用能命中）
  shim.Laya.setRoot(sandbox);

  // 把 LAYAANIMATION 文件路径作为 filename 方便栈追踪
  vm.runInContext(src, ctx, { filename: 'laya.LayaAnimationTool.js', timeout: 30000 });

  // 通过 Laya.__classmap 取出全部命名空间下的类
  const cm = sandbox.Laya.__classmap;
  const out = {
    // Spine 解析器
    SpineFileAdpter: cm['Spine.SpineFileAdpter'],
    SpineFactory:    cm['Spine.SpineFactory'],
    SpineTools:      cm['Spine.SpineTools'],
    Atlas:           cm['Spine.Atlas'],

    // Laya 输出端
    TestLayaAnimation: cm['LayaAnimation.TestLayaAnimation'],

    // Tools 基类（getObjectBuffer 在它原型上）
    Tools: cm['Tools'] || cm['dragonBones.Tools'],

    // 中间类（调试用）
    SkeletonData:    cm['Spine.SkeletonData'],
    BoneData:        cm['Spine.BoneData'],
    SlotData:        cm['Spine.SlotData'],

    sandbox,

    // 把外部数据迁移到 sandbox 上下文 —— 关键：vendor 里的 `arr instanceof Array`
    // 在沙箱中解析的是「外部注入的 Array」；但 vendor 内部 `var x=[]` 字面量产生的
    // 是 vm context 内置 Array。两个 Array 不是同一个引用，instanceof 会失败，
    // 进而把曲线扩展数据当成 wrong type 丢掉，导致 .sk 文件少写曲线参数。
    // JSON.parse 走 sandbox 内的 JSON 让所有数组共用同一个 Array 构造函数。
    parseJsonInSandbox(text) {
      sandbox.__jsonText = text;
      const obj = vm.runInContext('JSON.parse(__jsonText)', ctx);
      delete sandbox.__jsonText;
      return obj;
    },
  };

  // 校验关键类都加载到了
  const required = ['SpineFileAdpter', 'SpineFactory', 'Atlas', 'TestLayaAnimation'];
  for (const k of required) {
    if (!out[k]) throw new Error(`[spineToSk] 关键类未加载: ${k}（请确认 IDE 路径正确）`);
  }
  return out;
}

module.exports = { loadLayaAnimationTool, DEFAULT_TOOL_PATH };
