import type { Action, Course, SubPage, Element } from '../types';
import { elementMeta, type ExportChild } from '../elements/elementMeta';
import { getKeyboardPreset } from '../elements/keyboardPresets';
import { lookupBuiltinByExportPath } from '../elements/builtinAssets';
import { getCourseDirPath } from './electronFs';
import { getApiBaseUrl } from './apiConfig';
import { collectImageSizes, isLargeImage } from './imageSize';
import {
  buildScene,
  buildSdkJudgeClickInitCode,
  buildMathKeyboardInitCode,
  collectGameZipFiles,
  collectResources,
  extractZipFromServer,
  getImageAtlasDirectory,
  isLocalSkPath,
  isLocalSoundPath,
  isLocalVideoPath,
  mapGameZipEntryToProjectPath,
} from './exportProject';
import {
  buildInternalPageActionBindings,
  buildInternalPageRuntime,
  compileInternalPagesCourse,
  internalPageActionBody,
} from './internalPageCompiler';
import { buildInputRuleConfirmInitCode, buildInputRuleInitCode, isInputRuleHost } from './inputAnswerRules';

// ─── 预习场景差异 ───

interface SceneFlags {
  hasBtnConfirm: boolean;
  hasKlInputBox: boolean;
}

function detectSceneFlags(page: SubPage): SceneFlags {
  const hasBtnConfirm = false;
  const hasKlInputBox = page.elements.some((element) => {
    const wrapperVar = (elementMeta[element.type]?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    return wrapperVar === '_klInputBox';
  });
  return { hasBtnConfirm, hasKlInputBox };
}

// ─── 生成 scene 对应的 ts 文件 ───

function generatePreviewSceneTs(sceneName: string, _flags: SceneFlags, page: SubPage, varAssignment: Map<string, string>, resourceMap: Map<string, string>): string {
  const getVar = (el: Element): string => {
    return varAssignment.get(el.id) || (el.name || el.id).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  };
  let initCode = '';
  const buildActionBody = (action: Action, elementRef: string, currentPage: SubPage, source?: Element): string => {
    const pageBody = internalPageActionBody(action);
    if (pageBody) return pageBody;
    const targetElement = action.targetId ? currentPage.elements.find((item) => item.id === action.targetId) : source;
    const targetRef = targetElement && action.targetId ? `this.${getVar(targetElement)}` : elementRef;
    if (action.actionType === 'toggleVisible') return `var t = ${targetRef}; if (t) t.visible = !t.visible;`;
    if (action.actionType === 'setVisible') return `var t = ${targetRef}; if (t) t.visible = ${action.value === false ? 'false' : 'true'};`;
    if (action.actionType === 'setProperty' && action.property) return `var t = ${targetRef}; if (t) t.${action.property} = ${JSON.stringify(action.value)};`;
    if (action.actionType === 'playSound') return `this.playSound(${JSON.stringify(resourceMap.get(String(action.value)) ?? action.value)});`;
    if (action.actionType === 'playRightSound') return 'this.playSound("game_preview/sound/right.mp3");';
    if (action.actionType === 'playWrongSound') return 'this.playSound("game_preview/sound/wrong.mp3");';
    if (action.actionType === 'showAnswerRight') return 'this.showAnswerFace(1);';
    if (action.actionType === 'showAnswerRightLock') return 'this.showAnswerFace(1); this._lockBox.visible = true;';
    if (action.actionType === 'showAnswerWrong') return 'this.showAnswerFace(2);';
    if (action.actionType === 'animate') return `var t = ${targetRef}; if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')});`;
    return '';
  };
  const internalRuntime = buildInternalPageRuntime(page, getVar, buildActionBody);
  initCode += buildMathKeyboardInitCode(page, getVar);
  initCode += buildInputRuleInitCode(page, getVar);
  initCode += buildInternalPageActionBindings(page, getVar, buildActionBody, 'game_preview');
  initCode += buildSdkJudgeClickInitCode(page, getVar, buildActionBody);
  // onClickInitConfirm / onClickInitConfirmWithLock 事件：在 initView 注入 GameUtils.initConfirm
  for (const el of page.elements) {
    if (!el.actions?.length) continue;
    for (const action of el.actions) {
      if (action.event !== 'onClickInitConfirm' && action.event !== 'onClickInitConfirmWithLock') continue;
      const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
      if (!isInputRuleHost(targetEl)) continue;
      const btnVar = getVar(el);
      const inputBoxVar = getVar(targetEl);
      const lockArg = action.event === 'onClickInitConfirmWithLock' ? ', null, this._lockBox' : '';
      if (targetEl.type === 'ContainerBox') {
        initCode += buildInputRuleConfirmInitCode(
          el,
          targetEl,
          getVar,
          action.event === 'onClickInitConfirmWithLock',
        );
      } else {
        initCode += `        GameUtils.initConfirm(this, this.${btnVar}, this.${inputBoxVar}${lockArg});\n`;
      }
    }
  }

  // DragObj dropSkin：有放置位皮肤时，生成 DragViewBox 的 EVENT_SUCCESS/EVENT_FAILD 监听
  const dragObjsWithDropSkin = page.elements.filter(e => e.type === 'DragObj' && (e.props as Record<string, unknown>)?.dropSkin);
  if (dragObjsWithDropSkin.length > 0) {
    const elMap = new Map(page.elements.map(e => [e.id, e]));
    const findAncestor = (el: Element, type: string): Element | undefined => {
      let cur = el.parentId ? elMap.get(el.parentId) : undefined;
      while (cur) {
        if (cur.type === type) return cur;
        cur = cur.parentId ? elMap.get(cur.parentId) : undefined;
      }
      return undefined;
    };
    const dvbSet = new Set<string>();
    for (const dObj of dragObjsWithDropSkin) {
      const dvb = findAncestor(dObj, 'DragViewBox');
      if (!dvb) continue;
      if (dvbSet.has(dvb.id)) continue;
      dvbSet.add(dvb.id);
      const dvbVar = getVar(dvb);
      initCode += `        this.${dvbVar}.on("EVENT_SUCCESS", this, function(slcDragObj, hitDragObj, hitDropObj) {\n`;
      initCode += `            if (slcDragObj) { var _img1 = slcDragObj.getChildAt(0); var _img2 = slcDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = false; _img2.visible = true; } slcDragObj.mouseEnabled = false; }\n`;
      initCode += `            if (hitDragObj) { var _img1 = hitDragObj.getChildAt(0); var _img2 = hitDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = true; _img2.visible = false; } hitDragObj.mouseEnabled = true; }\n`;
      initCode += `        });\n`;
      initCode += `        this.${dvbVar}.on("EVENT_FAILD", this, function(slcDragObj, hitDragObj, hitDropObj) {\n`;
      initCode += `            if (slcDragObj) { var _img1 = slcDragObj.getChildAt(0); var _img2 = slcDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = true; _img2.visible = false; } }\n`;
      initCode += `        });\n`;
    }
  }
  // 翻页:为带 pageTurnGoTo / pageTurnPrev / pageTurnNext action 的元素绑定相应事件
  const pageTurnActionTypes = new Set(['pageTurnGoTo', 'pageTurnPrevOnce', 'pageTurnNextOnce', 'pageTurnPrevLoop', 'pageTurnNextLoop']);
  for (const el of page.elements) {
    if (!el.actions?.length) continue;
    const elVar = getVar(el);
    for (const action of el.actions) {
      if (!pageTurnActionTypes.has(action.actionType)) continue;
      const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : el;
      if (!targetEl || targetEl.type !== 'PageTurnBox') continue;
      const targetVar = getVar(targetEl);
      const ptChildren = page.elements.filter(e => e.parentId === targetEl.id);
      const pageBoxes = ptChildren.filter(e => e.type === 'ContainerBox');
      const leftBtn = ptChildren.find(e => e.type === 'PageTurnLeftBtn');
      const rightBtn = ptChildren.find(e => e.type === 'PageTurnRightBtn');
      const tabBtns = ptChildren.filter(e => e.type === 'SpeechSelectableObj');
      const pagesArr = pageBoxes.map(p => `this.${getVar(p)}`).join(', ');
      const prevRef = leftBtn ? `this.${getVar(leftBtn)}` : 'null';
      const nextRef = rightBtn ? `this.${getVar(rightBtn)}` : 'null';
      const tabsArr = tabBtns.map(tb => `this.${getVar(tb)}`).join(', ');
      let body: string;
      if (action.actionType === 'pageTurnGoTo') {
        const v = Number(action.value) || 0;
        const leftHasOnce = leftBtn?.actions?.some(a => a.actionType === 'pageTurnPrevOnce');
        const rightHasOnce = rightBtn?.actions?.some(a => a.actionType === 'pageTurnNextOnce');
        const lines = [
          '(function(){',
          `    var box = this.${targetVar};`,
          '    if (!box) return;',
          `    var pages = [${pagesArr}];`,
          `    var tabs = [${tabsArr}];`,
          `    var prevBtn = ${prevRef};`,
          `    var nextBtn = ${nextRef};`,
          '    var n = pages.length;',
          '    if (n === 0) return;',
          `    var cur = ${v};`,
          '    if (cur < 0) cur = 0; if (cur >= n) cur = n - 1;',
          '    for (var i = 0; i < n; i++) if (pages[i]) pages[i].visible = (i === cur);',
          '    for (var i = 0; i < tabs.length; i++) if (tabs[i]) tabs[i].isSelected = (i === cur);',
        ];
        if (leftHasOnce) lines.push('    if (prevBtn) prevBtn.visible = (cur > 0);');
        if (rightHasOnce) lines.push('    if (nextBtn) nextBtn.visible = (cur < n - 1);');
        lines.push('}).call(this);');
        body = lines.join('\n            ');
      } else {
        const isLoop = action.actionType.endsWith('Loop');
        const isPrev = action.actionType.includes('Prev');
        let calc: string;
        if (isPrev) {
          calc = isLoop
            ? 'cur = (cur - 1 + n) % n;'
            : 'if (cur <= 0) return; cur--;';
        } else {
          calc = isLoop
            ? 'cur = (cur + 1) % n;'
            : 'if (cur >= n - 1) return; cur++;';
        }
        const lines = [
          '(function(){',
          `    var box = this.${targetVar};`,
          '    if (!box) return;',
          `    var pages = [${pagesArr}];`,
          `    var prevBtn = ${prevRef};`,
          `    var nextBtn = ${nextRef};`,
          `    var tabs = [${tabsArr}];`,
          '    var n = pages.length;',
          '    if (n === 0) return;',
          '    var cur = 0;',
          '    for (var i = 0; i < n; i++) if (pages[i] && pages[i].visible) { cur = i; break; }',
          `    ${calc}`,
          '    for (var i = 0; i < n; i++) if (pages[i]) pages[i].visible = (i === cur);',
          '    for (var i = 0; i < tabs.length; i++) if (tabs[i]) tabs[i].isSelected = (i === cur);',
        ];
        if (!isLoop) {
          lines.push('    if (prevBtn) prevBtn.visible = (cur > 0);');
          lines.push('    if (nextBtn) nextBtn.visible = (cur < n - 1);');
        }
        lines.push('}).call(this);');
        body = lines.join('\n            ');
      }
      if (action.event === 'onLoad') {
        initCode += `        if (this.${elVar}) {\n            ${body}\n        }\n`;
      } else if (action.event === 'onClick' || action.event === 'onClickSound') {
        initCode += `        if (this.${elVar}) this.${elVar}.on(Event.CLICK, this, function() {\n            ${body}\n        });\n`;
      }
    }
  }
  // 翻页按钮初始化：不循环模式下，根据当前页设置左右按钮的初始 visible；同步标签按钮的 isSelected
  const ptBoxes = page.elements.filter(e => e.type === 'PageTurnBox');
  for (const ptBox of ptBoxes) {
    const ptChildren = page.elements.filter(e => e.parentId === ptBox.id);
    const pageBoxes = ptChildren.filter(e => e.type === 'ContainerBox');
    const leftBtn = ptChildren.find(e => e.type === 'PageTurnLeftBtn');
    const rightBtn = ptChildren.find(e => e.type === 'PageTurnRightBtn');
    const tabBtns = ptChildren.filter(e => e.type === 'SpeechSelectableObj');
    const leftHasOnce = leftBtn?.actions?.some(a => a.actionType === 'pageTurnPrevOnce');
    const rightHasOnce = rightBtn?.actions?.some(a => a.actionType === 'pageTurnNextOnce');
    const needInit = leftHasOnce || rightHasOnce || tabBtns.length > 0;
    if (!needInit) continue;
    const pagesArr = pageBoxes.map(p => `this.${getVar(p)}`).join(', ');
    const leftRef = leftBtn ? `this.${getVar(leftBtn)}` : 'null';
    const rightRef = rightBtn ? `this.${getVar(rightBtn)}` : 'null';
    const tabsArr = tabBtns.map(tb => `this.${getVar(tb)}`).join(', ');
    initCode += `        (function() {\n`;
    initCode += `            var pages = [${pagesArr}];\n`;
    initCode += `            var tabs = [${tabsArr}];\n`;
    initCode += `            var n = pages.length;\n`;
    initCode += `            if (n === 0) return;\n`;
    initCode += `            var cur = 0;\n`;
    initCode += `            for (var i = 0; i < n; i++) if (pages[i] && pages[i].visible) { cur = i; break; }\n`;
    if (tabBtns.length > 0) {
      initCode += `            for (var i = 0; i < tabs.length; i++) if (tabs[i]) tabs[i].isSelected = (i === cur);\n`;
    }
    if (leftHasOnce) {
      initCode += `            if (${leftRef}) ${leftRef}.visible = (cur > 0);\n`;
    }
    if (rightHasOnce) {
      initCode += `            if (${rightRef}) ${rightRef}.visible = (cur < n - 1);\n`;
    }
    initCode += `        }).call(this);\n`;
  }

  // 画笔组合：只有 NewBrushSprite 自己配置了 onInitBrush 事件，才生成 GameUtils.initDraw 调用
  for (const el of page.elements) {
    if (el.type !== 'NewBrushSprite') continue;
    // 检查该画笔自己是否配置了 onInitBrush 事件
    const hasInitBrushEvent = (el.actions ?? []).some(a => a.event === 'onInitBrush');
    if (!hasInitBrushEvent) continue;

    const brushVar = getVar(el);
    const drawBtn  = page.elements.find(e => e.parentId === el.id && e.type === 'BrushDrawBtn');
    const clearBtn = page.elements.find(e => e.parentId === el.id && e.type === 'BrushClearBtn');
    if (!drawBtn || !clearBtn) continue;
    const drawVar  = getVar(drawBtn);
    const clearVar = getVar(clearBtn);
    initCode += `        GameUtils.initDraw(this, this.${drawVar}, this.${clearVar}, this.${brushVar});\n`;
  }

  // 页面首次显示动作最后执行，确保输入、拖拽、翻页等组件已完成初始化。
  initCode += internalRuntime.initCode;
  const needFractionInput = page.elements.some((element) => element.type === 'FractionInput');
  const fractionImport = needFractionInput ? 'import FractionInput from "./Components/FractionInput";\n' : '';
  const fractionReference = needFractionInput ? '    _ref = [FractionInput];\n\n' : '';

  return `import { ui } from "../../ui/layaMaxUI";

import Event = Laya.Event;
import Image = Laya.Image;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
${fractionImport}import { GameUtils } from "./GameUtils";

export default class ${sceneName} extends ui.game_preview.${sceneName}UI {

${fractionReference}    public initView(byReset: boolean) {
        super.initView(byReset);

${initCode}        //add script
    }
${internalRuntime.methodsCode}    //add function
}`;
}

// ─── config.json ───

/**
 * 递归扫描 ExportChild 树（如 _keyboardPreset.children），把图片/声音资源按 atlas 收集。
 * 键盘预设的所有子图都按 atlas 处理（不区分大小图），收集对应的子目录名到 imageDirs。
 */
function collectPreviewExportChildrenRes(
  children: ExportChild[] | undefined,
  resourceMap: Map<string, string>,
  imageDirs: Set<string>,
  resEntries: { url: string; type?: string }[],
  addedSingleFiles: Set<string>,
) {
  if (!children) return;
  for (const c of children) {
    if (c.props) {
      for (const v of Object.values(c.props)) {
        const mapped = resourceMap.get(String(v));
        if (!mapped) continue;
        if (mapped.startsWith('game_preview/image/')) {
          const dir = getImageAtlasDirectory(mapped, 'game_preview/image/');
          if (dir) imageDirs.add(dir);
        } else if (mapped.startsWith('game_preview/sound/') && !addedSingleFiles.has(mapped)) {
          resEntries.push({ url: mapped, type: 'sound' });
          addedSingleFiles.add(mapped);
        }
      }
    }
    if (c.child) {
      collectPreviewExportChildrenRes(c.child, resourceMap, imageDirs, resEntries, addedSingleFiles);
    }
  }
}

function buildPreviewConfigJson(course: Course, resourceMap: Map<string, string>, imageSizes: Map<string, { w: number; h: number }>): Record<string, unknown> {
  const previewStages = course.previewStages ?? [];
  return {
    release: 'dev',
    mode: 'preview',
    feedback: course.feedback ?? 'spirit',
    pages: previewStages.map((stage, si) => {
      const videoPage = stage.subPages.find(p => p.frozen);
      const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
      if (videoEl) {
        const videoUrl = String((videoEl.props as Record<string, unknown>)?.videoUrl ?? '');
        const mappedVideoUrl = videoUrl ? resourceMap.get(videoUrl) ?? videoUrl : '';
        return { type: 'video', videoUrl: mappedVideoUrl, classType: 'yxdh' };
      }

      const sceneName = `Game${si + 1}`;
      const resEntries: { url: string; type?: string }[] = [];
      const imageDirs = new Set<string>();
      const addedSingleFiles = new Set<string>();

      for (const page of stage.subPages) {
        for (const el of page.elements) {
          const meta = elementMeta[el.type];
          const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) };
          for (const [key, value] of Object.entries(merged)) {
            if (key.startsWith('_')) continue;
            const mapped = resourceMap.get(String(value));
            if (!mapped) continue;

            // 图片资源：按真实像素尺寸判断大小图
            if (mapped.startsWith('game_preview/image/')) {
              const isLarge = isLargeImage(mapped, imageSizes);
              if (isLarge && !addedSingleFiles.has(mapped)) {
                resEntries.push({ url: mapped, type: 'image' });
                addedSingleFiles.add(mapped);
              }
              if (!isLarge) {
                const dir = getImageAtlasDirectory(mapped, 'game_preview/image/');
                if (dir) imageDirs.add(dir);
              }
            }

            if (mapped.startsWith('game_preview/sound/') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped, type: 'sound' });
              addedSingleFiles.add(mapped);
            }

            // 骨骼动画资源：.sk 文件生成单文件条目，同目录 .png 纹理也加入预加载
            if (mapped.startsWith('game_preview/animation/') && mapped.endsWith('.sk') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped });
              addedSingleFiles.add(mapped);
              const pngMapped = mapped.replace(/\.sk$/, '.png');
              if (!addedSingleFiles.has(pngMapped)) {
                resEntries.push({ url: pngMapped, type: 'image' });
                addedSingleFiles.add(pngMapped);
              }
            }
          }
          // 选项卡片：_foregroundSkin/_bgSkin/_wrongSkin 被主循环跳过，需显式收集
          if (el.type === 'SpeechSelectableObj') {
            const sMerged = merged as { _foregroundSkin?: string; _bgSkin?: string; _wrongSkin?: string };
            for (const skinVal of [sMerged._foregroundSkin, sMerged._bgSkin, sMerged._wrongSkin]) {
              if (!skinVal) continue;
              const mapped = resourceMap.get(skinVal);
              if (!mapped) continue;
              if (mapped.startsWith('game_preview/image/')) {
                const isLarge = isLargeImage(mapped, imageSizes);
                if (isLarge && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'image' });
                  addedSingleFiles.add(mapped);
                }
                if (!isLarge) {
                  const dir = getImageAtlasDirectory(mapped, 'game_preview/image/');
                  if (dir) imageDirs.add(dir);
                }
              }
            }
          }
          // PageTurnBox 不携带 pages 数组，ContainerBox 子元素资源由主循环收集
          // 键盘预设：通过 _keyboardPreset.id 查表得到 children，递归收集（皮肤都进 atlas）
          const presetId = (el.props as { _keyboardPreset?: { id?: string } } | undefined)?._keyboardPreset?.id;
          const presetChildren = presetId ? getKeyboardPreset(presetId)?.children : undefined;
          collectPreviewExportChildrenRes(presetChildren, resourceMap, imageDirs, resEntries, addedSingleFiles);
        }
      }

      // 内置音效：检测 onClickSound / playRightSound / playWrongSound
      let needBtnClick = false, needRight = false, needWrong = false;
      for (const page of stage.subPages) {
        for (const el of page.elements) {
          if (!el.actions?.length) continue;
          for (const action of el.actions) {
            if (action.event === 'onClickSound') needBtnClick = true;
            if (action.actionType === 'playRightSound') needRight = true;
            if (action.actionType === 'playWrongSound') needWrong = true;
          }
        }
      }
      if (needBtnClick && !addedSingleFiles.has('game_preview/sound/btn_click.wav')) {
        resEntries.push({ url: 'game_preview/sound/btn_click.wav', type: 'sound' });
        addedSingleFiles.add('game_preview/sound/btn_click.wav');
      }
      if (needRight && !addedSingleFiles.has('game_preview/sound/right.mp3')) {
        resEntries.push({ url: 'game_preview/sound/right.mp3', type: 'sound' });
        addedSingleFiles.add('game_preview/sound/right.mp3');
      }
      if (needWrong && !addedSingleFiles.has('game_preview/sound/wrong.mp3')) {
        resEntries.push({ url: 'game_preview/sound/wrong.mp3', type: 'sound' });
        addedSingleFiles.add('game_preview/sound/wrong.mp3');
      }

      for (const dir of imageDirs) {
        resEntries.push({ url: `res/atlas/game_preview/image/${dir}.atlas` });
      }

      return {
        name: `预习${si + 1}`,
        view: `view/game_preview/${sceneName}.ts`,
        res: resEntries,
        classType: 'yx',
      };
    }),
  };
}

export interface PreviewExportStructureScene {
  name: string;
  scene: Record<string, unknown>;
  source: string;
}

export interface PreviewExportRegressionArtifacts {
  viewDir: 'game_preview';
  resources: Record<string, string>;
  scenes: PreviewExportStructureScene[];
  config: Record<string, unknown>;
}

type ImageSizeMap = Map<string, { w: number; h: number }>;

function buildPreparedPreviewExportArtifacts(
  course: Course,
  resourceMap: Map<string, string>,
  imageSizes: ImageSizeMap,
): Omit<PreviewExportRegressionArtifacts, 'resources'> {
  const scenes: PreviewExportStructureScene[] = [];
  const previewStages = course.previewStages ?? [];
  for (let si = 0; si < previewStages.length; si++) {
    const stage = previewStages[si];
    const videoPage = stage.subPages.find((page) => page.frozen);
    const videoElement = videoPage?.elements.find((element) => element.locked && element.type === 'Video');
    if (videoElement) continue;
    const page = stage.subPages[0];
    if (!page || page.frozen) continue;
    const name = `Game${si + 1}`;
    const { json, varAssignment } = buildScene(
      page,
      name,
      resourceMap,
      'game_preview',
      { includeCHFeedback: false },
    );
    const flags = detectSceneFlags(page);
    scenes.push({
      name,
      scene: json,
      source: generatePreviewSceneTs(name, flags, page, varAssignment, resourceMap),
    });
  }
  return {
    viewDir: 'game_preview',
    scenes,
    config: buildPreviewConfigJson(course, resourceMap, imageSizes),
  };
}

/**
 * 生成可在 Node/CI 中直接断言的预习导出核心结构，不触发 Electron 写盘、网络或 SVN。
 * 真实预习写盘流程复用同一个 buildPreparedPreviewExportArtifacts。
 */
export function buildPreviewExportRegressionArtifacts(
  course: Course,
  imageSizes: ImageSizeMap = new Map(),
): PreviewExportRegressionArtifacts {
  const compiled = compileInternalPagesCourse(course);
  const resourceMap = collectResources(
    compiled,
    'game_preview',
    compiled.previewStages ?? [],
    { collectAllEditorProps: true, includeCHFeedback: false },
  );
  return {
    resources: Object.fromEntries(resourceMap),
    ...buildPreparedPreviewExportArtifacts(compiled, resourceMap, imageSizes),
  };
}

// ─── 主入口（预习工程）───

/**
 * 导出预习编辑器工程（Game1_PREVIEW）。
 * 入参 course 应已通过 bakeTextElements 处理过（由 exportProject 调用）。
 * 仅基于 course.previewStages 生成。SVN 提交统一由 exportProject 处理。
 */
export async function exportPreviewProject(course: Course): Promise<void> {
  const dirPath = getCourseDirPath(course.id);
  if (!dirPath) throw new Error('未找到课件目录，请先保存课件');

  const eApi = window.electronAPI;
  if (!eApi) throw new Error('仅支持 Electron 客户端');

  const previewStages = course.previewStages ?? [];
  if (previewStages.length === 0) return;

  const resourceMap = collectResources(
    course,
    'game_preview',
    course.previewStages ?? [],
    { collectAllEditorProps: true, includeCHFeedback: false },
  );

  // 读取所有图片的真实像素尺寸，用于判断大小图
  const imageSizes = await collectImageSizes(resourceMap, course.id);
  const artifacts = buildPreparedPreviewExportArtifacts(course, resourceMap, imageSizes);
  const scenes = artifacts.scenes;
  const configJson = artifacts.config;
  const gameZipFiles = collectGameZipFiles(resourceMap);
  // 按需追加内置音效
  for (const stage of previewStages) {
    for (const sp of stage.subPages) {
      for (const el of sp.elements) {
        if (!el.actions?.length) continue;
        for (const action of el.actions) {
          if (action.event === 'onClickSound') gameZipFiles.add('sound/btn_click.wav');
          if (action.actionType === 'playRightSound') gameZipFiles.add('sound/right.mp3');
          if (action.actionType === 'playWrongSound') gameZipFiles.add('sound/wrong.mp3');
          if (action.event === 'onClickInitConfirm' || action.event === 'onClickInitConfirmWithLock') {
            const targetEl = action.targetId ? sp.elements.find(e => e.id === action.targetId) : null;
            if (targetEl && targetEl.layaType === 'ChoiceBox') {
              gameZipFiles.add('sound/right.mp3');
              gameZipFiles.add('sound/wrong.mp3');
            }
          }
        }
      }
    }
  }

  const projectRoot = `${dirPath}/project/${course.id}/Game1_PREVIEW`;

  const serverUrl = getApiBaseUrl();
  await eApi.removeDir(projectRoot);
  await extractZipFromServer(
    `${serverUrl}/builtin/layaProjectModel/Game1_PREVIEW.zip`,
    projectRoot,
    eApi,
  );

  for (const { name, scene, source } of scenes) {
    await eApi.writeTextFile(
      `${projectRoot}/laya/pages/game_preview/${name}.scene`,
      JSON.stringify(scene, null, 2),
    );
    await eApi.writeTextFile(
      `${projectRoot}/src/view/game_preview/${name}.ts`,
      source,
    );
  }

  await eApi.writeTextFile(`${projectRoot}/laya/assets/config.json`, JSON.stringify(configJson, null, 2));
  await eApi.writeTextFile(`${projectRoot}/laya/assets/version.json`, '{}');

  // 内置 game 资源：从 vite 服务器下载 game.zip，按文件精确匹配解压到 game_preview/image/
  await extractZipFromServer(
    `${serverUrl}/builtin/runtime/game.zip`,
    `${projectRoot}/laya/assets`,
    eApi,
    (entryPath) => gameZipFiles.has(entryPath),
    (entryPath) => mapGameZipEntryToProjectPath(entryPath, 'game_preview'),
  );

  // 复制用户上传资源与 base64 图片
  for (const [from, to] of resourceMap) {
    const src = String(from);
    const dest = String(to);
    if (lookupBuiltinByExportPath(src) !== undefined || src.startsWith('/builtin/')) continue;

    const destPath = `${projectRoot}/laya/assets/${dest}`;
    if (src.startsWith('data:image')) {
      const base64 = src.split(',')[1];
      if (base64) await eApi.writeBinaryFile(destPath, base64);
    } else if (src.startsWith('images/')) {
      if (isLocalVideoPath(src) || isLocalSkPath(src) || isLocalSoundPath(src)) {
        await eApi.copyLocalFile(`${dirPath}/${src}`, destPath);
      } else {
        const dataUrl = await eApi.readFileAsDataUrl(dirPath, src);
        if (dataUrl) {
          const b64 = dataUrl.split(',')[1];
          if (b64) await eApi.writeBinaryFile(destPath, b64);
        }
      }
    }
  }
}
