import type { Action, Course, SubPage, Element } from '../types';
import { elementMeta, FRACTION_INPUT_SHEET, type ExportChild } from '../elements/elementMeta';
import { getKeyboardChildren } from '../elements/keyboardPresets';
import { lookupBuiltinByExportPath, lookupBuiltinBySrcPath, assetSrc, assetExport } from '../elements/builtinAssets';
import { renderTextToImage, type RenderTextProps } from './textToImage';
import { getCourseDirPath } from './electronFs';
import JSZip from 'jszip';
import { getApiBaseUrl } from './apiConfig';
import { collectImageSizes, isLargeImage } from './imageSize';
import { isFlatLesson, isVideoOnlyCourse, namespace, type CourseKind } from './courseKind';
import { collectInternalPageIssues, getElementPages, isPageAction } from './internalPages';
import {
  buildInternalPageActionBindings,
  buildInternalPageRuntime,
  compileInternalPagesCourse,
  internalPageActionBody,
} from './internalPageCompiler';
import { buildOrdinaryActionBindings, isSharedOrdinaryAction } from './ordinaryActionCompiler';
import {
  collectCourseConfirmTargetIssues,
  getSdkJudgeCapability,
  INPUT_SDK_JUDGE_EVENT,
  isInputSdkJudgeTarget,
  SDK_JUDGE_EVENT,
} from './sdkJudge';
import {
  buildInputRuleConfirmInitCode,
  buildInputRuleInitCode,
  collectCourseInputRuleIssues,
  findInputRuleHostAncestor,
  getFillAnswerInputs,
  getInputAnswerCandidates,
  hasStructuredInputRules,
  isInputRuleHost,
} from './inputAnswerRules';
import {
  collectCourseChoiceAnswerIssues,
  getChoiceRuntimeProps,
  isChoiceOptionText,
} from './choiceAnswerRules';
import { collectCourseCustomAnswerKeyboardIssues } from './customAnswerKeyboardRules';
import { bakeCustomAnswerKeyboardTextAssets } from './customAnswerKeyboardText';
import { getImageMirrorTransform } from './imageMirror';

// ─── Text 烘焙 ───

/**
 * publish 前烘焙：把 NewTextArea 和自定义答案键盘文字转换为 PNG 资源。
 * 后续 collectResources/elementToLayaNode/atlas 全流程对它一无所知，data URL 走现有的
 * `data:image` → `game/image/skin_<n>.png` 通道，零特殊处理。
 *
 * 副作用：返回的 Course 是深拷贝；调用方拿到的是新对象。
 */
async function bakeCourseAssets(course: Course): Promise<Course> {
  const cloned = structuredClone(course) as Course;
  const allStages = [...cloned.stages, ...(cloned.previewStages ?? [])];
  for (const stage of allStages) {
    for (const page of stage.subPages) {
      for (const elementPage of getElementPages(page)) for (const el of elementPage.elements) {
        if (el.type !== 'NewTextArea') continue;
        const text = String((el.props as Record<string, unknown> | undefined)?.text ?? '');
        const dataUrl = await renderTextToImage(
          text,
          el.width,
          el.height,
          (el.props ?? {}) as RenderTextProps,
          2,
          course.id,
        );
        el.type = 'Image';
        el.layaType = 'Image';
        el.props = { skin: dataUrl };
      }
    }
  }
  await bakeCustomAnswerKeyboardTextAssets(cloned);
  return cloned;
}

// ─── 资源路径映射 ───

// 内置资源 exportPath 格式: game/inputImg/img_1.png, game/jpL11/jp_3.png, game/image/btn_qd2.png
// 映射到工程路径: <viewDir>/image/inputImg/img_1.png, <viewDir>/image/jpL11/jp_3.png, <viewDir>/image/img/btn_qd2.png
// 规则: game/<dir>/file → <viewDir>/image/<dir>/file，game/image/file → <viewDir>/image/img/file
// viewDir = 'game_lt'（正课）或 'game_hw'（作业）

function getExt(url: string): string {
  const idx = url.lastIndexOf('.');
  return idx >= 0 ? url.slice(idx).toLowerCase() : '';
}

export function isUploadPath(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('/uploads/') || (v.startsWith('images/') && !v.startsWith('images/animation/') && !v.startsWith('images/sound/')));
}

export function isLocalVideoPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.(mp4|webm|mov)$/i.test(v);
}

export function isLocalSkPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.sk$/i.test(v);
}

export function isLocalSoundPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/sound/') && /\.(wav|mp3)$/i.test(v);
}

export function isLocalAnimAudioPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.(mp3|wav|ogg)$/i.test(v);
}

export function isBuiltinResourcePath(v: unknown): v is string {
  return typeof v === 'string' && lookupBuiltinByExportPath(v) !== undefined;
}

/** 返回图片所属的 atlas 目录，保留图片前缀后的全部目录层级。 */
export function getImageAtlasDirectory(mapped: string, imagePrefix: string): string | undefined {
  if (!mapped.startsWith(imagePrefix)) return undefined;
  const relative = mapped.slice(imagePrefix.length);
  const lastSlash = relative.lastIndexOf('/');
  return lastSlash > 0 ? relative.slice(0, lastSlash) : undefined;
}

/** game/xxx/file.png → <viewDir>/image/xxx/file.png，game/image/file.png → <viewDir>/image/img/file.png */
export function builtinExportToProjectPath(exportPath: string, viewDir = 'game_lt'): string {
  const parts = exportPath.split('/');
  // parts: ["game", "inputImg", "img_1.png"] 或 ["game", "image", "btn_qd2.png"] 或 ["game", "animation", "feedback_CH_yes", "zx_yes.sk"]
  if (parts.length >= 3 && parts[0] === 'game') {
    const dir = parts[1]; // "inputImg", "jpL11", "image", "animation", "sound", ...
    const rest = parts.slice(2).join('/');
    // game/sound/xxx → <viewDir>/sound/xxx
    if (dir === 'sound') {
      return `${viewDir}/sound/${rest}`;
    }
    // game/animation/xxx → <viewDir>/animation/xxx
    if (dir === 'animation') {
      return `${viewDir}/animation/${rest}`;
    }
    // 旧画笔资源已经带 game/image/img/ 前缀，规范化时不能再次补一层 img。
    if (dir === 'image' && rest.startsWith('img/')) {
      return `${viewDir}/image/${rest}`;
    }
    // game/image/xxx → <viewDir>/image/img/xxx（用户上传的按钮图等放 img 目录）
    // game/<其他>/xxx → <viewDir>/image/<其他>/xxx（内置皮肤目录按原目录名拷贝）
    const targetDir = dir === 'image' ? 'img' : dir;
    return `${viewDir}/image/${targetDir}/${rest}`;
  }
  // 其他格式原样返回
  return exportPath;
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];

export function collectResources(
  course: Course,
  viewDir = 'game_lt',
  stages: Course['stages'] = course.stages,
  options: { collectAllEditorProps?: boolean; includeCHFeedback?: boolean } = {},
): Map<string, string> {
  const map = new Map<string, string>();
  let skinCounter = 0;

  // 替换 RESOURCE_EXTS 中的 'game_lt' 为当前 viewDir
  const resourceExts: Record<string, string> = {
    '.png': `${viewDir}/image`, '.jpg': `${viewDir}/image`, '.jpeg': `${viewDir}/image`, '.gif': `${viewDir}/image`,
    '.wav': `${viewDir}/sound`, '.mp3': `${viewDir}/sound`,
    '.mp4': `${viewDir}/animation`, '.sk': `${viewDir}/animation`,
  };

  const collectValue = (value: unknown) => {
    if (isUploadPath(value)) {
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      const ext = getExt(filename);
      const dir = resourceExts[ext] ?? `${viewDir}/image`;
      // 视频文件直接放 animation 目录，不加 img 子目录
      const isVideo = VIDEO_EXTS.includes(ext);
      const targetPath = isVideo ? `${dir}/${filename}` : `${dir}/img/${filename}`;
      map.set(value, targetPath);
    } else if (isLocalVideoPath(value)) {
      // images/animation/ 下的视频文件：映射到 <viewDir>/animation/
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      map.set(value, `${viewDir}/animation/${filename}`);
    } else if (isLocalSkPath(value)) {
      // images/animation/ani1/game.sk → <viewDir>/animation/ani1/game.sk（保留子目录结构）
      if (map.has(value)) return;
      const relPath = (value as string).slice('images/animation/'.length); // 'ani1/game.sk'
      map.set(value, `${viewDir}/animation/${relPath}`);
      // 同目录下的 .png 纹理也需要收集
      const pngPath = (value as string).replace(/\.sk$/i, '.png');
      if (!map.has(pngPath)) {
        const pngRelPath = relPath.replace(/\.sk$/i, '.png');
        map.set(pngPath, `${viewDir}/animation/${pngRelPath}`);
      }
    } else if (isLocalSoundPath(value)) {
      // images/sound/ 下的音频文件：映射到 <viewDir>/sound/
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      map.set(value, `${viewDir}/sound/${filename}`);
    } else if (typeof value === 'string' && value.startsWith('data:image')) {
      if (map.has(value)) return;
      const ext = value.includes('image/png') ? '.png' : '.jpg';
      // base64 图片都放 img 目录
      map.set(value, `${viewDir}/image/img/skin_${skinCounter++}${ext}`);
    } else if (isBuiltinResourcePath(value)) {
      if (!map.has(value)) map.set(value, builtinExportToProjectPath(value as string, viewDir));
      if (/\.sk$/i.test(value as string)) {
        const pngPath = (value as string).replace(/\.sk$/i, '.png');
        if (lookupBuiltinByExportPath(pngPath) && !map.has(pngPath)) {
          map.set(pngPath, builtinExportToProjectPath(pngPath, viewDir));
        }
      }
    } else if (typeof value === 'string' && value.startsWith('/builtin/')) {
      if (map.has(value)) return;
      const asset = lookupBuiltinBySrcPath(value);
      if (asset?.exportPath) {
        map.set(value, builtinExportToProjectPath(asset.exportPath, viewDir));
        if (/\.sk$/i.test(asset.exportPath)) {
          const pngExportPath = asset.exportPath.replace(/\.sk$/i, '.png');
          if (lookupBuiltinByExportPath(pngExportPath) && !map.has(pngExportPath)) {
            map.set(pngExportPath, builtinExportToProjectPath(pngExportPath, viewDir));
          }
        }
      }
    }
  };

  const scanFixed = (children: ExportChild[] | undefined) => {
    if (!children) return;
    for (const c of children) {
      if (c.props) for (const v of Object.values(c.props)) collectValue(v);
      if (c.resources) for (const resource of c.resources) collectValue(resource);
      if (c.child) scanFixed(c.child);
    }
  };

  for (const stage of stages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        const meta = elementMeta[el.type];
        const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) };
        for (const [k, v] of Object.entries(merged)) {
          // _ 前缀的编辑器专用属性默认不收集；以下例外字段需要参与资源收集和路径重写：
          // - SpeechSelectableObj: _foregroundSkin / _bgSkin / _wrongSkin（前后景皮肤）
          // - MatchingItem: _itemImage（导出时转为子 Image 节点的 skin）
          if (!options.collectAllEditorProps && k.startsWith('_') && !['_foregroundSkin', '_pressedSkin', '_bgSkin', '_correctSkin', '_wrongSkin', '_itemImage'].includes(k)) continue;
          collectValue(v);
        }
        // playSound / stopSound 动作中的音频路径也需要收集
        if (el.actions) {
          for (const action of el.actions) {
            if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
              collectValue(action.value);
            }
          }
        }
        scanFixed(meta?.exportChildren);
        scanFixed(getKeyboardChildren(el));
        // PageTurnBox 不携带额外资源，同 group ContainerBox 的资源由主循环收集
      }
    }
  }

  // 口才反馈动画：扫描 actions，发现 onClickInitConfirmCH / *WithLock 或 playKcRightAni / playKcWrongAni 时主动收集 4 个内置资源
  let needsCHFeedback = false;
  for (const stage of stages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        if ((el.actions ?? []).some(a => a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock' || a.event === 'onClickInitGameConfirmCH' || a.event === 'onClickInitGameConfirmCHWithLock' || a.actionType === 'playKcRightAni' || a.actionType === 'playKcRightAniLock' || a.actionType === 'playKcWrongAni')) {
          needsCHFeedback = true;
          break;
        }
      }
      if (needsCHFeedback) break;
    }
    if (needsCHFeedback) break;
  }

  if (options.includeCHFeedback !== false && needsCHFeedback) {
    const yesSkSrc = assetSrc('feedback.CH.yes.sk');
    const yesPngSrc = assetSrc('feedback.CH.yes.png');
    const noSkSrc = assetSrc('feedback.CH.no.sk');
    const noPngSrc = assetSrc('feedback.CH.no.png');

    if (!map.has(yesSkSrc)) map.set(yesSkSrc, builtinExportToProjectPath(assetExport('feedback.CH.yes.sk'), viewDir));
    if (!map.has(yesPngSrc)) map.set(yesPngSrc, builtinExportToProjectPath(assetExport('feedback.CH.yes.png'), viewDir));
    if (!map.has(noSkSrc)) map.set(noSkSrc, builtinExportToProjectPath(assetExport('feedback.CH.no.sk'), viewDir));
    if (!map.has(noPngSrc)) map.set(noPngSrc, builtinExportToProjectPath(assetExport('feedback.CH.no.png'), viewDir));
  }

  return map;
}

async function enrichAnimAudioResources(
  resourceMap: Map<string, string>,
  courseDir: string,
  viewDir: string,
): Promise<void> {
  const AUDIO_EXTS = /\.(mp3|wav|ogg)$/i;
  const eApi = window.electronAPI;
  const scannedDirs = new Set<string>();
  const skEntries = [...resourceMap.keys()].filter(k => isLocalSkPath(k));
  for (const skPath of skEntries) {
    const parts = skPath.split('/');
    const aniDir = parts.slice(0, 3).join('/'); // 'images/animation/ani1'
    if (scannedDirs.has(aniDir)) continue;
    scannedDirs.add(aniDir);
    const absDirPath = `${courseDir}/${aniDir}`;
    try {
      const entries = await eApi.listDirectory(absDirPath);
      for (const entry of entries) {
        if (!entry.isDir && AUDIO_EXTS.test(entry.name)) {
          const audioRelPath = `${aniDir}/${entry.name}`;
          if (!resourceMap.has(audioRelPath)) {
            resourceMap.set(audioRelPath, `${viewDir}/animation/${parts[2]}/${entry.name}`);
          }
        }
      }
    } catch { /* directory may not exist */ }
  }
}

// ─── 路径重写 ───

export function rewriteProps(props: Record<string, unknown>, resourceMap: Map<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'runtime') continue; // scene 里只有根节点有 runtime
    if (isUploadPath(value) || isLocalVideoPath(value) || isLocalSkPath(value) || isLocalSoundPath(value) || (typeof value === 'string' && value.startsWith('data:image')) || (typeof value === 'string' && value.startsWith('/builtin/'))) {
      result[key] = resourceMap.get(value) ?? value;
    } else if (isBuiltinResourcePath(value)) {
      result[key] = resourceMap.get(value) ?? builtinExportToProjectPath(value as string);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── .scene 节点构建 ───

// MatchingGame 可选文件字段：用户没上传时不应写入 .scene
const MATCHING_GAME_OPTIONAL_FILE_KEYS = ['lineSkin', 'wrongLineskin'];
function filterOptionalFileFields(props: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    const v = props[key];
    if (v === '' || v === undefined || v === null) {
      delete props[key];
    }
  }
}

let _compId = 0;
function nextId() { return ++_compId; }

/** 收集所有需要在 .ts 中通过 this.xxx 引用的元素 ID。
 *  规则：
 *  - 有 actions 的元素（作为事件源）
 *  - 被 action.targetId 引用的元素（作为动作目标）
 *  - 被 action.judgeTargetId 引用的元素（作为 SDK 判定目标）
 *  - 特殊硬编码组件：DragViewBox
 *  - 翻页组件：PageTurnBox 关联的 ContainerBox / PageTurnLeftBtn / PageTurnRightBtn
 *  - onAutoClick 所在 SelectableObj 的父 ChoiceBox */
export function collectElementsNeedingVar(page: SubPage): Set<string> {
  const needsVar = new Set<string>();
  const elements = page.elements;

  // 1. 有 actions 的元素 + 它们的 action 目标
  for (const el of elements) {
    if (typeof el.props?.__internalPageRootVar === 'string') needsVar.add(el.id);
    if (el.actions && el.actions.length > 0) {
      needsVar.add(el.id);
      for (const action of el.actions) {
        if (action.targetId) needsVar.add(action.targetId);
        if (action.judgeTargetId) needsVar.add(action.judgeTargetId);
      }
    }
  }

  // 2. 特殊硬编码组件（generateSceneTs 里直接 this.xxx 引用）
  for (const el of elements) {
    const meta = elementMeta[el.type];
    const wrapperVar = (meta?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    if (wrapperVar === '_klInputBox') needsVar.add(el.id);
    // DragViewBox：generateSceneTs 监听 EVENT_SUCCESS / EVENT_FAILD
    if (el.type === 'DragViewBox') needsVar.add(el.id);
    // MatchingGame：onClickInitGameConfirm* 时需要 var 引用（this.<var>.allRight）
    if (el.type === 'MatchingGame') needsVar.add(el.id);
    // ChoiceBox：五态视觉初始化与作业提交判定会直接引用容器。
    if (el.type === 'ChoiceBox') needsVar.add(el.id);
    // 画笔组合：NewBrushSprite Box（var 借调给注入的画板子节点）+ 画笔开关 + 清空按钮
    if (el.type === 'NewBrushSprite' || el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn') {
      needsVar.add(el.id);
    }
  }

  // 作业预设“完成”会直接读取配置了答案的独立输入控件。
  for (const el of collectHomeworkStandaloneInputJudgeTargets(page)) {
    needsVar.add(el.id);
  }

  // 结构化填空题判定会直接读取容器内每一个输入格。
  for (const el of elements) {
    if (!isInputRuleHost(el) || !hasStructuredInputRules(el, elements)) continue;
    needsVar.add(el.id);
    for (const input of getFillAnswerInputs(el, elements)) needsVar.add(input.id);
  }

  // 输入后立即 SDK 判断会直接引用判定目标或容器内输入格，需要把对应 var 写入 scene。
  for (const el of elements) {
    for (const action of el.actions ?? []) {
      if (action.event !== INPUT_SDK_JUDGE_EVENT || !action.judgeTargetId) continue;
      const target = elements.find((item) => item.id === action.judgeTargetId);
      if (!target || !isInputSdkJudgeTarget(target)) continue;
      if (target.type === 'KlInputImage' || target.type === 'FractionInput') {
        needsVar.add(target.id);
      } else {
        for (const input of getFillAnswerInputs(target, elements)) needsVar.add(input.id);
      }
    }
  }

  const decimalCamps = new Set(elements.flatMap((el) => {
    const props = el.props as { _keyboardPreset?: { id?: string }; camp?: unknown } | undefined;
    return el.type === 'KlBaseKeyboard'
      && props?._keyboardPreset?.id === 'decimal'
      && typeof props.camp === 'string'
      ? [props.camp]
      : [];
  }));
  for (const el of elements) {
    const props = el.props as Record<string, unknown> | undefined;
    const presetId = (props?._keyboardPreset as { id?: string } | undefined)?.id;
    if (el.type === 'KlInputImage' && decimalCamps.has(String(props?.camp ?? ''))) {
      needsVar.add(el.id);
    }
    if (el.type === 'KlBaseKeyboard' && (presetId === 'decimal' || presetId === 'fraction') && props?.disabled === true) {
      needsVar.add(el.id);
    }
    if (el.type === 'FractionInput' && (props?.canSelected === false || props?.canSelected === 'false')) {
      needsVar.add(el.id);
    }
  }

  // 3. 翻页组件:左/右按钮 + 标签按钮 + 分页 ContainerBox(被 actionType 内部 inline 引用)
  const ptBoxes = elements.filter(e => e.type === 'PageTurnBox');
  for (const ptBox of ptBoxes) {
    needsVar.add(ptBox.id);
    for (const e of elements) {
      if (e.parentId !== ptBox.id) continue;
      if (e.type === 'PageTurnLeftBtn' ||
          e.type === 'PageTurnRightBtn' ||
          e.type === 'SpeechSelectableObj' ||
          e.type === 'ContainerBox') {
        needsVar.add(e.id);
      }
    }
  }

  // 4. onAutoClick 的父 ChoiceBox（generateSceneTs 里 this.${parentVar}.getChildByName）
  for (const el of elements) {
    if (!el.actions?.some(a => a.event === 'onAutoClick')) continue;
    if (!el.parentId) continue;
    const parent = elements.find(e => e.id === el.parentId);
    if (parent && parent.layaType === 'ChoiceBox') needsVar.add(parent.id);
  }

  return needsVar;
}

/** 为页面所有需要 var 的元素分配唯一 var 值，返回 elementId → finalVar 的 map。
 *  - 优先使用 element.props.var（用户手填值，如 _btnConfirm / btn_ok 等硬编码值）
 *  - 否则用 element.name
 *  - 冲突时追加数字后缀确保唯一 */
export function buildVarAssignment(page: SubPage, needsVarSet: Set<string>): Map<string, string> {
  const assignment = new Map<string, string>();
  const used = new Set<string>();
  // 已知会被注入的固定 var（保留位）
  used.add('_lockBox');
  for (const el of page.elements) {
    if (!needsVarSet.has(el.id)) continue;
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    let base = (merged.var as string) || el.name || el.id;
    base = String(base).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
    if (!base) base = `el_${el.id}`;
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${i}`;
      i += 1;
    }
    used.add(candidate);
    assignment.set(el.id, candidate);
  }
  return assignment;
}

function buildSceneNode(
  element: Element,
  allElements: Element[],
  resourceMap: Map<string, string>,
  parentId: number,
  varAssignment?: Map<string, string>,
): Record<string, unknown> {
  const id = nextId();
  const meta = elementMeta[element.type];
  const rawProps = { ...(element.props ?? {}) };
  // 旧数据兼容：_hidden → hidden
  if ('_hidden' in rawProps && !('hidden' in rawProps)) rawProps.hidden = rawProps._hidden;
  // 旧版分数输入框只保存了 0-9，导出时补回与 img_w2Input.png 对应的完整字符表。
  if (element.type === 'FractionInput' && rawProps.sheet === '0123456789') {
    rawProps.sheet = FRACTION_INPUT_SHEET;
  }
  const merged = { ...(meta?.defaultProps ?? {}), ...rawProps };
  if (element.type === 'ChoiceBox') {
    Object.assign(merged, getChoiceRuntimeProps(element, allElements));
    delete merged._correctOptionIds;
  }
  const rewritten = rewriteProps(merged, resourceMap);

  const props: Record<string, unknown> = { x: element.x, y: element.y, width: element.width, height: element.height };
  // DragObj/DropObj：sdk_baiya 运行时构造函数强制 anchorX=0.5, anchorY=0.5（中心锚点）
  // 编辑器 element.x/y 是左上角；Laya runtime sprite.x/y 是中心点。
  // 补偿：exported.x = element.x + width/2，让 Laya 可见左上角 = element.x，与编辑器一致。
  if (element.type === 'DragObj' || element.type === 'DropObj') {
    props.x = element.x + element.width / 2;
    props.y = element.y + element.height / 2;
  }
  if (meta?.mirrorable) {
    const mirror = getImageMirrorTransform(element);
    props.x = mirror.x;
    props.y = mirror.y;
    if (mirror.scaleX === -1) props.scaleX = -1;
    if (mirror.scaleY === -1) props.scaleY = -1;
  }
  if (element.name) props.name = element.name;
  if (element.opacity !== 1) props.alpha = element.opacity;
  if (element.rotation !== 0) props.rotation = element.rotation;
  for (const [k, v] of Object.entries(rewritten)) {
    if (k.startsWith('_') || k === 'mirrorX' || k === 'mirrorY') continue;
    // scene 里只有根节点有 runtime，子节点不注入
    if (k === 'runtime') continue;
    if (k === 'hidden') continue;
    if (k === 'blockThrough') continue;
    // ChoiceBox 的 mouseEnabled 由 runtime 内部控制，scene 不导出
    if (element.layaType === 'ChoiceBox' && k === 'mouseEnabled') continue;
    if (v !== undefined && v !== null && v !== '') props[k] = v;
  }
  // var 按需导出：只有在 .ts 中需要 this.xxx 引用的元素才写 var；
  // 其它组件导出的 .scene 不会带 var 字段
  const assignedVar = varAssignment?.get(element.id);
  // 当 exportChildren 里有 inheritVar 项时，var 借调给注入的子节点，外层节点自身不写 var、name
  const hasInheritVarChild = !!meta?.exportChildren?.some(c => c.inheritVar);
  if (assignedVar && !hasInheritVarChild) {
    props.var = assignedVar;
  } else {
    delete props.var;
  }
  if (hasInheritVarChild) {
    delete props.name;
  }
  // BrushClearBtn 只用 x/y/skin 定位，不需要 width/height
  if (element.type === 'BrushClearBtn') {
    delete props.width;
    delete props.height;
  }
  // 拖拽组件导出 var/name 控制：
  // DragViewBox 只导出 var（用于 this.xxx 引用），不导出 name
  // DragDropBox/DragDragBox/DragObj/DropObj 只导出 name，不导出 var
  if (element.type === 'DragViewBox') {
    delete props.name;
  } else if (['DragDropBox', 'DragDragBox', 'DragObj', 'DropObj'].includes(element.type)) {
    delete props.var;
  }
  // hidden=true → visible=false（勾选隐藏时导出不可见）
  if (rewritten.hidden === true) props.visible = false;
  // blockThrough=true → mouseEnabled=true, mouseThrough=false（勾选阻止穿透时导出拦截点击）
  if (rewritten.blockThrough === true) {
    props.mouseEnabled = true;
    props.mouseThrough = false;
  }
  if (isChoiceOptionText(element, allElements)) {
    props.mouseEnabled = false;
    props.mouseThrough = true;
  }
  // SoundButton 的 isNeedAni/showInStu 导出为字符串（sdk_baiya 要求字符串格式）
  if (element.layaType === 'SoundButton') {
    if ('isNeedAni' in props) props.isNeedAni = String(props.isNeedAni);
    if ('showInStu' in props) props.showInStu = String(props.showInStu);
  }
  // MatchingGame：lineSkin / wrongLineskin 为空值时不导出（用户没上传则 .scene 不含此字段）
  if (element.layaType === 'MatchingGame') {
    filterOptionalFileFields(props, MATCHING_GAME_OPTIONAL_FILE_KEYS);
  }
  // MatchingItem：_itemImage 是编辑器专用字段，导出时转换为子 Image 节点
  const matchingItemImageChild: Record<string, unknown>[] = [];
  if (element.type === 'MatchingItem') {
    const itemImage = rewritten._itemImage as string | undefined;
    if (typeof itemImage === 'string' && itemImage !== '') {
      matchingItemImageChild.push({
        x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: {
          skin: itemImage,
          x: 0, y: 0,
          width: element.width ?? 80,
          height: element.height ?? 80,
        },
        child: [],
      });
    }
  }
  // Spine：.scene 中 isLoop/stopAt 始终写死，循环行为由 onAutoPlay/animate 动作的 spineLoop 控制
  if (element.type === 'Spine') {
    props.isLoop = 'false';
    props.stopAt = 0;
  }
  // PageTurnBox 子节点的 SpeechSelectableObj：强制 isSelected=false，由 initView 运行时根据当前页设置
  if (element.type === 'SpeechSelectableObj' && element.parentId) {
    const parent = allElements.find(e => e.id === element.parentId);
    if (parent?.type === 'PageTurnBox') {
      props.isSelected = false;
    }
  }
  // SelectableObj：将编辑器专用皮肤属性转换为互斥状态图层。
  let selectableObjChildren: Record<string, unknown>[] = []; // eslint-disable-line prefer-const
  if (element.layaType === 'SelectableObj') {
    const fgSkin = rewritten._foregroundSkin;
    if (typeof fgSkin === 'string' && fgSkin !== '') {
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: { skin: fgSkin, left: 0, top: 0, right: 0, bottom: 0, sizeGrid: '10,38,10,38', mouseEnabled: false },
        child: [],
      });
    }
    const pressedSkin = rewritten._pressedSkin;
    if (typeof pressedSkin === 'string' && pressedSkin !== '') {
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,down', label: 'down',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: { name: 'down', skin: pressedSkin, visible: false, left: 0, top: 0, right: 0, bottom: 0, sizeGrid: '10,38,10,38', mouseEnabled: false },
        child: [],
      });
    }
    const bgSkin = rewritten._bgSkin;
    if (typeof bgSkin === 'string' && bgSkin !== '') {
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,bg', label: 'bg',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: {
          name: 'bg', skin: bgSkin,
          anchorX: 0.5, anchorY: 0.5,
          x: element.width / 2, y: element.height / 2,
          width: element.width + 22, height: 99,
          sizeGrid: '12,49,12,49', mouseEnabled: false,
        },
        child: [],
      });
    }
    const correctSkin = rewritten._correctSkin;
    if (typeof correctSkin === 'string' && correctSkin !== '') {
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,right', label: 'right',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: {
          name: 'right', skin: correctSkin, visible: false,
          anchorX: 0.5, anchorY: 0.5,
          x: element.width / 2, y: element.height / 2,
          width: element.width + 14, height: 91,
          sizeGrid: '12,45,12,45', mouseEnabled: false,
        },
        child: [],
      });
    }
    const wrongSkin = rewritten._wrongSkin;
    if (typeof wrongSkin === 'string' && wrongSkin !== '') {
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,wrong', label: 'wrong',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: nextId(), nodeParent: id,
        props: {
          name: 'wrong', skin: wrongSkin, visible: false,
          anchorX: 0.5, anchorY: 0.5,
          x: element.width / 2, y: element.height / 2,
          width: element.width + 14, height: 91,
          sizeGrid: '12,45,12,45', mouseEnabled: false,
        },
        child: [],
      });
    }
  }

  // DragObj/DropObj：若有 skin，生成 Image 子节点（编辑器不创建子元素，发布时才生成）
  // 子 Image 用 anchor 0.5 + 父中心位置实现居中（与编辑器视觉一致）
  const dragSkinChildren: Record<string, unknown>[] = [];
  if ((element.type === 'DragObj' || element.type === 'DropObj') && props.skin) {
    const skinVal = props.skin as string;
    delete props.skin;
    const imgId = nextId();
    dragSkinChildren.push({
      x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: imgId, nodeParent: id,
      props: {
        skin: skinVal,
        anchorX: 0.5, anchorY: 0.5,
        x: element.width / 2, y: element.height / 2,
        width: element.width ?? 258,
        height: element.height ?? 187,
      },
      child: [],
    });
  }
  // DragObj：若有 dropSkin，生成第二个 Image 子节点（visible=false，放置成功时切换显示）
  if (element.type === 'DragObj' && props.dropSkin) {
    const dropSkinVal = props.dropSkin as string;
    delete props.dropSkin;
    const dropImgId = nextId();
    dragSkinChildren.push({
      x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: dropImgId, nodeParent: id,
      props: { skin: dropSkinVal, anchorX: 0.5, anchorY: 0.5, x: element.width / 2, y: element.height / 2, visible: false },
      child: [],
    });
  }
  // DropObj：若有 tipSkin，生成 name=tip 的 Image 子节点（排在 skin Image 后面，居中）
  if (element.type === 'DropObj' && props.tipSkin) {
    const tipVal = props.tipSkin as string;
    delete props.tipSkin;
    props.isNeedTip = true;
    const tipId = nextId();
    dragSkinChildren.push({
      x: 15, type: 'Image', searchKey: 'Image,tip', label: 'tip',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: tipId, nodeParent: id,
      props: { name: 'tip', skin: tipVal, anchorX: 0.5, anchorY: 0.5, x: element.width / 2, y: element.height / 2 },
      child: [],
    });
  } else if (element.type === 'DropObj') {
    delete props.tipSkin;
    props.isNeedTip = false;
  }

  const directChildren = allElements.filter(e => e.parentId === element.id);
  const presetChildren = getKeyboardChildren(element);
  const fixedSource: ExportChild[] = presetChildren ?? meta?.exportChildren ?? [];

  // 汇总被 inheritProps 声明要从外层 props 搬走的字段，最后统一从外层 props 剥掉
  const propsToStrip = new Set<string>();
  for (const c of fixedSource) {
    if (c.inheritProps) for (const k of c.inheritProps) propsToStrip.add(k);
  }

  const cloneFixed = (c: ExportChild, pid: number): Record<string, unknown> => {
    const cid = nextId();
    const baseProps: Record<string, unknown> = { ...c.props };
    if (c.inheritSize) {
      baseProps.width = element.width;
      baseProps.height = element.height;
    }
    if (c.inheritProps) {
      for (const k of c.inheritProps) {
        const v = (element.props as Record<string, unknown> | undefined)?.[k];
        if (v !== undefined && v !== null && v !== '') baseProps[k] = v;
      }
    }
    if (c.inheritVar) {
      const v = varAssignment?.get(element.id);
      if (v) baseProps.var = v;
    }
    const cProps = rewriteProps(baseProps, resourceMap);
    const childTags: string[] = [c.type];
    if (cProps.name) childTags.push(String(cProps.name));
    if (cProps.var && cProps.var !== cProps.name) childTags.push(String(cProps.var));
    const childLabel = (cProps.name as string | undefined) ?? (cProps.var as string | undefined) ?? c.type;
    const node: Record<string, unknown> = {
      x: 15, type: c.type, searchKey: childTags.join(','), label: childLabel,
      isDirectory: !!(c.child?.length), isAniNode: true, hasChild: !!(c.child?.length),
      compId: cid, nodeParent: pid, props: cProps, child: [],
    };
    if (c.child?.length) node.child = c.child.map(cc => cloneFixed(cc, cid));
    return node;
  };

  const fixedChildren = fixedSource.map(c => cloneFixed(c, id));

  // 剥掉被 inheritProps 搬走的字段（外层 Box 不识别 brushMode 等画笔属性）
  for (const k of propsToStrip) {
    delete props[k];
  }
  const userChildren: Record<string, unknown>[] = [];
  for (const c of directChildren) {
    const node = buildSceneNode(c, allElements, resourceMap, id, varAssignment);
    userChildren.push(node);
  }
  const child = [...selectableObjChildren, ...dragSkinChildren, ...matchingItemImageChild, ...fixedChildren, ...userChildren];

  const layaType = element.layaType ?? 'Box';
  const tags: string[] = [];
  const nodeName = props.name as string | undefined;
  const nodeVar = props.var as string | undefined;
  if (nodeName) tags.push(nodeName);
  if (nodeVar && nodeVar !== nodeName) tags.push(nodeVar);
  const searchKey = tags.length > 0 ? `${layaType},${tags.join(',')}` : layaType;
  const label = nodeName ?? nodeVar ?? layaType;
  return {
    x: 15, type: layaType, searchKey, label,
    isOpen: child.length > 0, isDirectory: child.length > 0, isAniNode: true, hasChild: child.length > 0,
    compId: id, nodeParent: parentId, props, child,
  };
}

// ─── exportWrapper 包裹逻辑（与 export.ts 的 buildTopLevelChildren 同理） ───

function getWrapper(el: Element) {
  return elementMeta[el.type]?.exportWrapper;
}

function shouldWrap(_el: Element, _w: NonNullable<ReturnType<typeof getWrapper>>) {
  // exportWrapper 一律包裹，promoteProps 为空时保留默认值
  return true;
}


function buildTopLevelSceneChildren(
  page: SubPage,
  resourceMap: Map<string, string>,
  parentId: number,
): { children: Record<string, unknown>[]; varAssignment: Map<string, string> } {
  // 先收集需要 var 的元素，并分配唯一 var 名
  const needsVarSet = collectElementsNeedingVar(page);
  const varAssignment = buildVarAssignment(page, needsVarSet);
  const topLevel = page.elements.filter(e => !e.parentId);
  type Group = { wrapper: NonNullable<ReturnType<typeof getWrapper>> | null; elements: Element[] };
  const groups: Group[] = [];
  const wrapperIndex = new Map<string, number>();

  for (let ti = 0; ti < topLevel.length; ti++) {
    const el = topLevel[ti];
    const wrapper = getWrapper(el);
    if (!wrapper || !shouldWrap(el, wrapper)) {
      groups.push({ wrapper: null, elements: [el] });
      continue;
    }
    const pageScope = typeof el.props.__internalPageId === 'string' ? el.props.__internalPageId : '';
    const wrapperKey = `${pageScope}:${wrapper.type}`;
    const idx = wrapperIndex.get(wrapperKey);
    if (idx !== undefined) {
      groups[idx].elements.push(el);
    } else {
      wrapperIndex.set(wrapperKey, groups.length);
      groups.push({ wrapper, elements: [el] });
    }
  }

  const out: Record<string, unknown>[] = [];
  for (const g of groups) {
    if (!g.wrapper) {
      out.push(buildSceneNode(g.elements[0], page.elements, resourceMap, parentId, varAssignment));
      continue;
    }
    const wrapperId = nextId();
    const innerNodes = g.elements.map(el => buildSceneNode(el, page.elements, resourceMap, wrapperId, varAssignment));

    const rawWrapperProps: Record<string, unknown> = { ...g.wrapper.props };
    const rewrittenWrapper = rewriteProps(rawWrapperProps, resourceMap);
    const wrapperProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rewrittenWrapper)) {
      if (k === 'runtime') continue;
      if (v !== undefined && v !== null && v !== '') wrapperProps[k] = v;
    }
    // wrapper 的 var 也由 varAssignment 控制（如 KlInputBox wrapper 的 _klInputBox）
    const firstElId = g.elements[0]?.id;
    const wrapperAssignedVar = firstElId ? varAssignment.get(firstElId) : undefined;
    if (wrapperAssignedVar) {
      wrapperProps.var = wrapperAssignedVar;
    } else {
      delete wrapperProps.var;
    }

    for (const key of g.wrapper.promoteProps ?? []) {
      const values: string[] = [];
      for (const node of innerNodes) {
        const ip = node.props as Record<string, unknown>;
        const v = ip[key];
        if (v !== undefined && v !== null && v !== '') values.push(String(v));
        delete ip[key];
      }
      if (values.length > 0) wrapperProps[key] = values.join(',');
    }

    const tags: string[] = [];
    const nodeVar = wrapperProps.var as string | undefined;
    const nodeName = wrapperProps.name as string | undefined;
    if (nodeName) tags.push(nodeName);
    if (nodeVar && nodeVar !== nodeName) tags.push(nodeVar);
    const searchKey = tags.length > 0 ? `${g.wrapper.type},${tags.join(',')}` : g.wrapper.type;
    const label = nodeName ?? nodeVar ?? g.wrapper.type;

    out.push({
      x: 15, type: g.wrapper.type, searchKey, label,
      isOpen: true, isDirectory: innerNodes.length > 0, isAniNode: true, hasChild: innerNodes.length > 0,
      compId: wrapperId, nodeParent: parentId, props: wrapperProps, child: innerNodes,
    });
  }

  // 始终注入 _lockBox（与老 Designer 一致）
  const lockId = nextId();
  const lockInputId = nextId();
  out.push({
    x: 15, type: 'Box',
    searchKey: 'Box,_lockBox',
    label: '_lockBox',
    isOpen: false, isDirectory: true, isAniNode: true, hasChild: true,
    compId: lockId, nodeParent: parentId,
    props: { x: 0, y: 0, width: 1920, height: 1080, visible: false, var: '_lockBox' },
    child: [{
      x: 30, type: 'KlInputImage',
      searchKey: 'KlInputImage',
      label: 'KlInputImage',
      isDirectory: false, isAniNode: true, hasChild: false,
      compId: lockInputId, nodeParent: lockId,
      props: { spaceX: 0, place: 1, fontClipSkin: 'share/ui/0-9-fuhao_0.png', filterColor: 'ffff00', filterBlur: 5, contentType: 1, canSelected: 'false' },
      child: [],
    }],
  });

  return { children: out, varAssignment };
}

export function buildScene(
  page: SubPage,
  sceneName: string,
  resourceMap: Map<string, string>,
  viewDir = 'game_lt',
  options: { includeCHFeedback?: boolean } = {},
): { json: Record<string, unknown>; varAssignment: Map<string, string> } {
  _compId = 1;
  const rootId = nextId();
  const { children: child, varAssignment } = buildTopLevelSceneChildren(page, resourceMap, rootId);

  // 口才反馈动画：检测到 onClickInitConfirmCH / *WithLock 事件或 playKcRightAni / playKcWrongAni 动作时，在 child 末尾注入 2 个 Spine 节点（visible=false）
  const needsCHFeedback = options.includeCHFeedback !== false && page.elements.some(el =>
    (el.actions ?? []).some(a =>
      a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock'
      || a.event === 'onClickInitGameConfirmCH' || a.event === 'onClickInitGameConfirmCHWithLock'
      || a.actionType === 'playKcRightAni' || a.actionType === 'playKcRightAniLock' || a.actionType === 'playKcWrongAni'
    )
  );

  if (needsCHFeedback) {
    const yesId = nextId();
    child.push({
      x: 15,
      type: 'SkeletonPlayer',
      searchKey: 'SkeletonPlayer,Spine_kcFeedbackYes',
      label: 'Spine_kcFeedbackYes',
      isOpen: false, isDirectory: false, isAniNode: true, hasChild: false,
      compId: yesId,
      nodeParent: rootId,
      props: {
        x: -5,
        y: 1076,
        width: 400,
        height: 400,
        name: 'Spine_kcFeedbackYes',
        var: 'Spine_kcFeedbackYes',
        url: builtinExportToProjectPath(assetExport('feedback.CH.yes.sk'), viewDir),
        currAniName: 'animation',
        isLoop: 'false',
        stopAt: 0,
        visible: false,
      },
      child: [],
    });
    varAssignment.set('__feedback_yes', 'Spine_kcFeedbackYes');

    const noId = nextId();
    child.push({
      x: 15,
      type: 'SkeletonPlayer',
      searchKey: 'SkeletonPlayer,Spine_kcFeedbackNo',
      label: 'Spine_kcFeedbackNo',
      isOpen: false, isDirectory: false, isAniNode: true, hasChild: false,
      compId: noId,
      nodeParent: rootId,
      props: {
        x: 1,
        y: 1080,
        width: 400,
        height: 400,
        name: 'Spine_kcFeedbackNo',
        var: 'Spine_kcFeedbackNo',
        url: builtinExportToProjectPath(assetExport('feedback.CH.no.sk'), viewDir),
        currAniName: 'animation',
        isLoop: 'false',
        stopAt: 0,
        visible: false,
      },
      child: [],
    });
    varAssignment.set('__feedback_no', 'Spine_kcFeedbackNo');
  }

  return {
    json: {
      x: 0, type: 'KlView', selectedBox: rootId, selecteID: rootId,
      searchKey: 'KlView',
      props: { width: 1920, height: 1080, sceneColor: '#000000', runtime: `view/${viewDir}/${sceneName}.ts` },
      nodeParent: -1, maxID: _compId, label: 'KlView',
      isOpen: true, isDirectory: true, isAniNode: true, hasChild: child.length > 0,
      compId: rootId, child,
      animations: [{ nodes: [], name: 'ani1', id: 1, frameRate: 24, action: 0 }],
    },
    varAssignment,
  };
}

// ─── 动作 → 代码片段（模块级工厂，正课/作业共用） ───

export function makeActionBuilder(
  varAssignment: Map<string, string>,
  resourceMap: Map<string, string>,
  uiNamespace: string,
) {
  const getVar = (el: Element): string => {
    return varAssignment.get(el.id) || (el.name || el.id).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function buildActionBody(action: any, elRef: string, pg: SubPage, sourceEl?: Element): string {
    const targetEl = action.targetId ? pg.elements.find((e: Element) => e.id === action.targetId) : (sourceEl ?? null);
    const targetVar = targetEl && action.targetId ? getVar(targetEl) : null;
    const target = targetVar ? `this.${targetVar}` : elRef;
    const t = `var t = ${target};`;
    switch (action.actionType) {
      case 'none':
        return '';
      case 'navigateInternalPage':
      case 'openInternalDialog':
      case 'closeInternalDialog':
        return internalPageActionBody(action);
      case 'toggleVisible':
        return `${t} if (t) t.visible = !t.visible;`;
      case 'setVisible':
        return `${t} if (t) t.visible = ${action.value === false ? false : true};`;
      case 'setProperty':
        return action.property ? `${t} if (t) t.${action.property} = ${JSON.stringify(action.value)};` : '';
      case 'playSound': {
        const soundPath = typeof action.value === 'string' && resourceMap.has(action.value)
          ? resourceMap.get(action.value) : action.value;
        return `this.playSound(${JSON.stringify(soundPath)});`;
      }
      case 'playRightSound':
        return `this.playSound("${uiNamespace}/sound/right.mp3");`;
      case 'playWrongSound':
        return `this.playSound("${uiNamespace}/sound/wrong.mp3");`;
      case 'showAnswerRight':
        return `this.showAnswerFace(1);`;
      case 'showAnswerRightLock':
        return `this.showAnswerFace(1);this._lockBox.visible = true;`;
      case 'showAnswerWrong':
        return `this.showAnswerFace(2);`;
      case 'playKcRightAni':
        return `this.playRightAni();`;
      case 'playKcRightAniLock':
        return `this.playRightAni();this._lockBox.visible = true;`;
      case 'playKcWrongAni':
        return `this.playWrongAni();`;
      case 'animate': {
        if (targetEl?.type === 'Spine') {
          const aniName = action.value ?? '';
          // UI 默认显示「是」，未显式选择时按循环处理；只有显式选「否」才不循环
          const loop = action.spineLoop !== 'false';
          return `${t} if (t && t.play) { t.visible = true; t.play(${JSON.stringify(aniName)}, ${loop}); }`;
        }
        return `${t} if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')});`;
      }
      case 'pageTurnGoTo': {
        if (!targetEl || targetEl.type !== 'PageTurnBox') return '';
        const ptChildren = pg.elements.filter((e: Element) => e.parentId === targetEl.id);
        const pageBoxes = ptChildren.filter((e: Element) => e.type === 'ContainerBox');
        const tabBtns = ptChildren.filter((e: Element) => e.type === 'SpeechSelectableObj');
        const leftBtn = ptChildren.find((e: Element) => e.type === 'PageTurnLeftBtn');
        const rightBtn = ptChildren.find((e: Element) => e.type === 'PageTurnRightBtn');
        const leftHasOnce = leftBtn?.actions?.some(a => a.actionType === 'pageTurnPrevOnce');
        const rightHasOnce = rightBtn?.actions?.some(a => a.actionType === 'pageTurnNextOnce');
        const pagesArr = pageBoxes.map((p: Element) => `this.${getVar(p)}`).join(', ');
        const tabsArr = tabBtns.map((tb: Element) => `this.${getVar(tb)}`).join(', ');
        const leftRef = leftBtn ? `this.${getVar(leftBtn)}` : 'null';
        const rightRef = rightBtn ? `this.${getVar(rightBtn)}` : 'null';
        const v = Number(action.value) || 0;
        const lines = [
          '(function(){',
          `    var box = ${target};`,
          '    if (!box) return;',
          `    var pages = [${pagesArr}];`,
          `    var tabs = [${tabsArr}];`,
          `    var prevBtn = ${leftRef};`,
          `    var nextBtn = ${rightRef};`,
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
        return lines.join('\n            ');
      }
      case 'pageTurnPrevOnce':
      case 'pageTurnNextOnce':
      case 'pageTurnPrevLoop':
      case 'pageTurnNextLoop': {
        if (!targetEl || targetEl.type !== 'PageTurnBox') return '';
        const ptChildren = pg.elements.filter((e: Element) => e.parentId === targetEl.id);
        const pageBoxes = ptChildren.filter((e: Element) => e.type === 'ContainerBox');
        const leftBtn = ptChildren.find((e: Element) => e.type === 'PageTurnLeftBtn');
        const rightBtn = ptChildren.find((e: Element) => e.type === 'PageTurnRightBtn');
        const tabBtns = ptChildren.filter((e: Element) => e.type === 'SpeechSelectableObj');
        const pagesArr = pageBoxes.map((p: Element) => `this.${getVar(p)}`).join(', ');
        const prevRef = leftBtn ? `this.${getVar(leftBtn)}` : 'null';
        const nextRef = rightBtn ? `this.${getVar(rightBtn)}` : 'null';
        const tabsArr = tabBtns.map((tb: Element) => `this.${getVar(tb)}`).join(', ');
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
          `    var box = ${target};`,
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
        return lines.join('\n            ');
      }
      default:
        return '';
    }
  };
}

// ─── 生成 scene 对应的 ts 文件 ───

/**
 * DragViewBox 统一初始化代码（正课/作业共用）：
 * 每个 DragViewBox 收集 4 段内容，最终各自合并成一对 EVENT_SUCCESS / EVENT_FAILD：
 *   - dropSkinSuccess: DragObj.dropSkin 自动图片切换（仅 EVENT_SUCCESS）
 *   - dropSkinFaild:   还原图片（仅 EVENT_FAILD）
 *   - rightBody:       onDragJudge condition='right' 子事件动作
 *   - wrongBody:       onDragJudge condition='wrong' 子事件动作
 * 判定块（if dragsOnRightDrops {right} else {wrong}）在两个 .on 里各写一份。
 * uiNamespace='game_hw' 时（作业模式），监听末尾追加 this.checkResult() 立即刷新 result。
 */
function buildDvbInitCode(
  page: SubPage,
  getVar: (el: Element) => string,
  buildActionBody: (action: unknown, elRef: string, pg: SubPage, sourceEl?: Element) => string,
  uiNamespace: string,
): string {
  type DvbBucket = { dropSkinSuccess: string; dropSkinFaild: string; rightBody: string; wrongBody: string; el: Element };
  const dvbBuckets = new Map<string, DvbBucket>();
  const elMap = new Map(page.elements.map(e => [e.id, e]));
  const findAncestor = (el: Element, type: string): Element | undefined => {
    let cur = el.parentId ? elMap.get(el.parentId) : undefined;
    while (cur) {
      if (cur.type === type) return cur;
      cur = cur.parentId ? elMap.get(cur.parentId) : undefined;
    }
    return undefined;
  };
  const getBucket = (dvb: Element): DvbBucket => {
    let bk = dvbBuckets.get(dvb.id);
    if (!bk) { bk = { dropSkinSuccess: '', dropSkinFaild: '', rightBody: '', wrongBody: '', el: dvb }; dvbBuckets.set(dvb.id, bk); }
    return bk;
  };

  // 1. DragObj.dropSkin → bucket.dropSkinSuccess / dropSkinFaild
  const dragObjsWithDropSkin = page.elements.filter(e => e.type === 'DragObj' && (e.props as Record<string, unknown>)?.dropSkin);
  const dropSkinDoneDvb = new Set<string>();
  for (const dObj of dragObjsWithDropSkin) {
    const dvb = findAncestor(dObj, 'DragViewBox');
    if (!dvb || dropSkinDoneDvb.has(dvb.id)) continue;
    dropSkinDoneDvb.add(dvb.id);
    const bk = getBucket(dvb);
    bk.dropSkinSuccess += `            if (slcDragObj) { var _img1 = slcDragObj.getChildAt(0); var _img2 = slcDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = false; _img2.visible = true; } slcDragObj.mouseEnabled = false; }\n`;
    bk.dropSkinSuccess += `            if (hitDragObj) { var _img1 = hitDragObj.getChildAt(0); var _img2 = hitDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = true; _img2.visible = false; } hitDragObj.mouseEnabled = true; }\n`;
    bk.dropSkinFaild   += `            if (slcDragObj) { var _img1 = slcDragObj.getChildAt(0); var _img2 = slcDragObj.getChildAt(1); if (_img1 && _img2) { _img1.visible = true; _img2.visible = false; } }\n`;
  }

  // 2. onDragJudge 子事件 → bucket.rightBody / wrongBody（按 branchCondition 分流）
  for (const el of page.elements) {
    if (el.type !== 'DragViewBox') continue;
    const judgeActions = (el.actions ?? []).filter(a => a.event === 'onDragJudge');
    if (judgeActions.length === 0) continue;
    const elRef = `this.${getVar(el)}`;
    const bk = getBucket(el);
    const byBranch = new Map<string, typeof judgeActions>();
    for (const a of judgeActions) {
      const bid = a.branchId ?? '_default';
      if (!byBranch.has(bid)) byBranch.set(bid, []);
      byBranch.get(bid)!.push(a);
    }
    for (const [, branchActions] of byBranch) {
      const cond = branchActions[0].branchCondition ?? 'right';
      let body = '';
      for (const a of branchActions) {
        const b = buildActionBody(a, elRef, page, el);
        if (b) body += `${b} `;
      }
      const trimmed = body.trim();
      if (!trimmed) continue;
      if (cond === 'right') bk.rightBody += `                ${trimmed}\n`;
      else bk.wrongBody += `                ${trimmed}\n`;
    }
  }

  // 3. 输出每个 DragViewBox 的一对 .on EVENT_SUCCESS / EVENT_FAILD
  let out = '';
  for (const [, bk] of dvbBuckets) {
    const dvbVar = getVar(bk.el);
    const dvbRef = `this.${dvbVar}`;
    // 判定：只要 DragViewBox 配了 onDragJudge 事件（即使 actionType='none' 导致 body 为空），就生成判定块
    const hasJudgeEvent = (bk.el.actions ?? []).some(a => a.event === 'onDragJudge');
    const judgeBlock = hasJudgeEvent
      ? `            if (${dvbRef}.dragsOnRightDrops()) {\n                console.log("isAllRight");\n${bk.rightBody}            } else {\n${bk.wrongBody}            }\n`
      : '';
    // 仅在作业模式（uiNamespace='game_hw'）下追加 this.checkResult() 立即刷新
    const checkResultCall = (uiNamespace === 'game_hw' && hasJudgeEvent) ? `            this.checkResult();\n` : '';

    if (bk.dropSkinSuccess || judgeBlock) {
      out += `        ${dvbRef}.on("EVENT_SUCCESS", this, function(slcDragObj, hitDragObj, hitDropObj) {\n`;
      out += bk.dropSkinSuccess;
      out += judgeBlock;
      out += checkResultCall;
      out += `        });\n`;
    }
    if (bk.dropSkinFaild || judgeBlock) {
      out += `        ${dvbRef}.on("EVENT_FAILD", this, function(slcDragObj, hitDragObj, hitDropObj) {\n`;
      out += bk.dropSkinFaild;
      out += judgeBlock;
      out += checkResultCall;
      out += `        });\n`;
    }
  }
  return out;
}

type ActionBodyBuilder = (
  action: Action,
  elementRef: string,
  page: SubPage,
  sourceElement?: Element,
) => string;

function buildSdkJudgeChecks(
  target: Element,
  targetRef: string,
): { rightCheck: string; nullCheck: string | null } | null {
  const capability = getSdkJudgeCapability(target);
  if (!capability) return null;
  const rightCheck = capability.kind === 'inputImage'
    ? `!${targetRef}.valueOrSkinIsNull && (${JSON.stringify(getInputAnswerCandidates(target))}).indexOf(String(${targetRef}.fontClipValue || "")) >= 0`
    : capability.kind === 'input'
    ? `${targetRef}.isRight()`
    : capability.kind === 'drag'
      ? `${targetRef}.dragsOnRightDrops()`
      : `${targetRef}.${capability.kind === 'matching' ? 'allRight' : 'isRight'}`;
  const nullCheck = capability.kind === 'inputImage'
    ? `${targetRef}.valueOrSkinIsNull`
    : capability.kind === 'input' || capability.kind === 'matching'
    ? `${targetRef}.isNull()`
    : capability.kind === 'choice'
      ? `${targetRef}.isNull`
      : null;
  return { rightCheck, nullCheck };
}

function buildInputWrongStateCode(inputRefs: string[], visible: boolean): string {
  return inputRefs.map((inputRef) =>
    `(function(__input) { var __wrong = __input && __input.getChildByName ? __input.getChildByName("wrong") : null; var __bg = __input && __input.getChildByName ? __input.getChildByName("bg") : null; if (__wrong) { __wrong.visible = ${visible}; if (${visible}) { if (typeof Laya !== "undefined" && Laya.GlowFilter) { __wrong.__forgeWrongGlowFilter = __wrong.__forgeWrongGlowFilter || new Laya.GlowFilter("#ef4444", 14, 0, 0); __wrong.filters = [__wrong.__forgeWrongGlowFilter]; } } else { __wrong.filters = []; } } if (${visible} && __bg) { __bg.visible = false; __bg.filters = []; } })(${inputRef});`,
  ).join(' ');
}

/**
 * 把触发元素上的通用 SDK 判定关系转换为点击监听。
 * 判定只读取目标组件已有 SDK 状态，结果动作仍使用 action.targetId。
 */
export function buildSdkJudgeClickInitCode(
  page: SubPage,
  getVar: (element: Element) => string,
  buildActionBody: ActionBodyBuilder,
  writeHomeworkResult = false,
): string {
  let code = '';

  for (const source of page.elements) {
    const judgeActions = (source.actions ?? []).filter((action) => action.event === SDK_JUDGE_EVENT);
    if (judgeActions.length === 0) continue;

    const groups = new Map<string, Action[]>();
    for (const action of judgeActions) {
      const key = action.groupId ?? `__legacy:${action.judgeTargetId ?? ''}`;
      const group = groups.get(key) ?? [];
      group.push(action);
      groups.set(key, group);
    }

    for (const actions of groups.values()) {
      const judgeTargetId = actions[0]?.judgeTargetId;
      const target = judgeTargetId
        ? page.elements.find((element) => element.id === judgeTargetId)
        : undefined;
      const capability = getSdkJudgeCapability(target);
      if (!target || !capability) continue;

      const sourceRef = `this.${getVar(source)}`;
      const targetRef = `this.${getVar(target)}`;
      const branchBodies: Record<'right' | 'wrong' | 'null', string[]> = {
        right: [],
        wrong: [],
        null: [],
      };
      for (const action of actions) {
        const condition = action.branchCondition ?? 'right';
        if (!capability.conditions.includes(condition)) continue;
        const body = buildActionBody(action, sourceRef, page, source);
        if (body) branchBodies[condition].push(body);
      }

      const resultBody = (condition: 'right' | 'wrong' | 'null') => {
        const parts = [...branchBodies[condition]];
        if (writeHomeworkResult) {
          const value = condition === 'right' ? 'true' : condition === 'wrong' ? 'false' : 'null';
          parts.unshift(`this.result = ${value};`);
        }
        return parts.join(' ');
      };

      const checks = buildSdkJudgeChecks(target, targetRef);
      if (!checks) continue;

      code += `        if (${sourceRef}) ${sourceRef}.on(Laya.Event.CLICK, this, function() {\n`;
      code += `            if (${checks.rightCheck}) { ${resultBody('right')} }\n`;
      if (checks.nullCheck) code += `            else if (${checks.nullCheck}) { ${resultBody('null')} }\n`;
      code += `            else { ${resultBody('wrong')} }\n`;
      code += `        });\n`;
    }
  }

  return code;
}

export function buildSdkJudgeInputInitCode(
  page: SubPage,
  getVar: (element: Element) => string,
  buildActionBody: ActionBodyBuilder,
  writeHomeworkResult = false,
): string {
  let code = '';

  for (const source of page.elements) {
    const judgeActions = (source.actions ?? []).filter((action) => action.event === INPUT_SDK_JUDGE_EVENT);
    if (judgeActions.length === 0) continue;

    const groups = new Map<string, Action[]>();
    for (const action of judgeActions) {
      const key = action.groupId ?? `__legacy:${action.judgeTargetId ?? ''}`;
      const group = groups.get(key) ?? [];
      group.push(action);
      groups.set(key, group);
    }

    for (const actions of groups.values()) {
      const judgeTargetId = actions[0]?.judgeTargetId;
      const target = judgeTargetId
        ? page.elements.find((element) => element.id === judgeTargetId)
        : undefined;
      if (!target || !isInputSdkJudgeTarget(target)) continue;

      const sourceRef = `this.${getVar(source)}`;
      const targetRef = `this.${getVar(target)}`;
      const checks = buildSdkJudgeChecks(target, targetRef);
      const capability = getSdkJudgeCapability(target);
      if (!checks || !capability) continue;

      const branchBodies: Record<'right' | 'wrong' | 'null', string[]> = {
        right: [],
        wrong: [],
        null: [],
      };
      for (const action of actions) {
        const condition = action.branchCondition ?? 'right';
        if (!capability.conditions.includes(condition)) continue;
        const body = buildActionBody(action, sourceRef, page, source);
        if (body) branchBodies[condition].push(body);
      }

      const resultBody = (condition: 'right' | 'wrong' | 'null') => {
        const parts = [...branchBodies[condition]];
        if (writeHomeworkResult) {
          const value = condition === 'right' ? 'true' : condition === 'wrong' ? 'false' : 'null';
          parts.unshift(`this.result = ${value};`);
        }
        return parts.join(' ');
      };

      const inputRefs = target.type === 'KlInputImage' || target.type === 'FractionInput'
        ? [targetRef]
        : getFillAnswerInputs(target, page.elements).map((input) => `this.${getVar(input)}`);
      if (inputRefs.length === 0) continue;

      const clearWrongState = buildInputWrongStateCode(inputRefs, false);
      const showWrongState = buildInputWrongStateCode(inputRefs, true);
      const handlerBody = [
        clearWrongState,
        `if (${checks.rightCheck}) { ${resultBody('right')} }`,
        checks.nullCheck ? `else if (${checks.nullCheck}) { ${resultBody('null')} }` : '',
        `else { ${showWrongState} ${resultBody('wrong')} }`,
      ].filter(Boolean).join('\n            ');

      for (const inputRef of inputRefs) {
        code += `        if (${inputRef}) ${inputRef}.on(KlKeyboardEvent.INPUT_LATER, this, function() {\n`;
        code += `            ${handlerBody}\n`;
        code += `        });\n`;
        code += `        if (${inputRef}) ${inputRef}.on(Laya.Event.CLICK, this, function() { ${clearWrongState} });\n`;
      }
    }
  }

  return code;
}

/**
 * 作业预设“完成”自动判定的独立输入控件。
 * 属于答题判定容器的输入格继续由最近的父容器负责，避免重复判定。
 */
export function collectHomeworkStandaloneInputJudgeTargets(page: SubPage): Element[] {
  return page.elements.filter((element) => {
    if (element.type !== 'KlInputImage' && element.type !== 'FractionInput') return false;
    return getInputAnswerCandidates(element).length > 0
      && !findInputRuleHostAncestor(element, page.elements);
  });
}

/** 生成独立输入控件的三态结果，并写入作业页统一结果集合。 */
export function buildHomeworkStandaloneInputJudgeCode(
  page: SubPage,
  getVar: (element: Element) => string,
  resultCollection = '__forgeJudgeResults',
): string {
  let code = '';
  for (const element of collectHomeworkStandaloneInputJudgeTargets(page)) {
    const elementRef = `this.${getVar(element)}`;
    const answers = JSON.stringify(getInputAnswerCandidates(element));
    code += `        if (!${elementRef} || ${elementRef}.valueOrSkinIsNull) { ${resultCollection}.push(null); }\n`;
    code += `        else if ((${answers}).indexOf(String(${elementRef}.fontClipValue || "")) >= 0) { ${resultCollection}.push(true); }\n`;
    code += `        else { ${resultCollection}.push(false); }\n`;
  }
  return code;
}

export function buildMathKeyboardInitCode(page: SubPage, getVar: (element: Element) => string): string {
  const decimalCamps = new Set(page.elements.flatMap((element) => {
    const props = element.props as { _keyboardPreset?: { id?: string }; camp?: unknown } | undefined;
    return element.type === 'KlBaseKeyboard'
      && props?._keyboardPreset?.id === 'decimal'
      && typeof props.camp === 'string'
      ? [props.camp]
      : [];
  }));
  let code = '';

  for (const element of page.elements) {
    const props = element.props as Record<string, unknown> | undefined;
    const elementRef = `this.${getVar(element)}`;
    if (element.type === 'KlInputImage' && decimalCamps.has(String(props?.camp ?? ''))) {
      code += `        ${elementRef}.on(KlKeyboardEvent.INPUT_LATER, this, function(input: KlInputImage) {\n`;
      code += `            var target: KlInputImage = input || ${elementRef};\n`;
      code += `            var value = String(target.fontClipValue || "");\n`;
      code += `            var firstDot = value.indexOf(".");\n`;
      code += `            if (firstDot >= 0) value = value.substring(0, firstDot + 1) + value.substring(firstDot + 1).replace(/\\./g, "");\n`;
      code += `            if (value.charAt(0) === ".") value = target.place >= 2 ? "0." : "";\n`;
      code += `            if (value !== target.fontClipValue) target.fontClipValue = value;\n`;
      code += `        });\n`;
    }

    const presetId = (props?._keyboardPreset as { id?: string } | undefined)?.id;
    const isDisabledMathKeyboard = element.type === 'KlBaseKeyboard'
      && (presetId === 'decimal' || presetId === 'fraction')
      && props?.disabled === true;
    const isDisabledFractionInput = element.type === 'FractionInput'
      && (props?.canSelected === false || props?.canSelected === 'false');
    if (isDisabledMathKeyboard || isDisabledFractionInput) {
      code += `        ${elementRef}.alpha = 0.45;\n`;
      code += `        ${elementRef}.gray = true;\n`;
      code += `        ${elementRef}.mouseEnabled = false;\n`;
    }
  }

  return code;
}

export function buildChoiceVisualInitCode(
  page: SubPage,
  getVar: (element: Element) => string,
  bindConfirmResults = true,
): string {
  let code = '';
  const confirmEvents = new Set([
    'onClickInitConfirm',
    'onClickInitConfirmWithLock',
    'onClickInitConfirmCH',
    'onClickInitConfirmCHWithLock',
  ]);

  for (const choiceBox of page.elements.filter((element) => element.type === 'ChoiceBox')) {
    const choiceRef = `this.${getVar(choiceBox)}`;
    const optionNames = page.elements
      .filter((element) => element.parentId === choiceBox.id && element.type === 'SpeechSelectableObj')
      .map((element) => JSON.stringify(element.name ?? element.id));
    code += `        (function() {\n`;
    code += `            var __choice: any = ${choiceRef};\n`;
    code += `            if (!__choice) return;\n`;
    code += `            var __items: any[] = [${optionNames.map((name) => `__choice.getChildByName(${name})`).join(', ')}].filter(function(item) { return !!item; });\n`;
    code += `            if (__choice.__forgeChoiceVisualReady) { if (byReset && __choice.cancelAllSel) __choice.cancelAllSel(); __choice.__forgeApplyResult(null); return; }\n`;
    code += `            var __setLayer = function(item: any, name: string, visible: boolean) { var layer = item.getChildByName(name); if (layer) layer.visible = visible; };\n`;
    code += `            __choice.__forgeApplyResult = function(result: any) {\n`;
    code += `                __choice.__forgeResult = result;\n`;
    code += `                __choice.mouseChildren = result !== true;\n`;
    code += `                for (var i = 0; i < __items.length; i++) {\n`;
    code += `                    var item = __items[i]; var selected = !!item.isSelected;\n`;
    code += `                    __setLayer(item, 'down', false);\n`;
    code += `                    __setLayer(item, 'bg', result == null && selected);\n`;
    code += `                    __setLayer(item, 'right', result === true && selected);\n`;
    code += `                    __setLayer(item, 'wrong', result === false && selected);\n`;
    code += `                    item.mouseEnabled = result !== true;\n`;
    code += `                }\n`;
    code += `            };\n`;
    code += `            __choice.__forgeChoiceVisualReady = true;\n`;
    code += `            __choice.__forgeResult = null;\n`;
    code += `            for (let i = 0; i < __items.length; i++) {\n`;
    code += `                let item: any = __items[i];\n`;
    code += `                item.on(Laya.Event.MOUSE_DOWN, this, function() { item.__forgeWasSelected = !!item.isSelected; if (__choice.__forgeResult == null) __setLayer(item, 'down', true); });\n`;
    code += `                item.on(Laya.Event.MOUSE_UP, this, function() { __setLayer(item, 'down', false); });\n`;
    code += `                item.on(Laya.Event.MOUSE_OUT, this, function() { __setLayer(item, 'down', false); });\n`;
    code += `                item.on(Laya.Event.CLICK, this, function() {\n`;
    code += `                    if (__choice.upperLimit === 1 && item.__forgeWasSelected && item.isSelected && __choice.cancelAllSel) __choice.cancelAllSel();\n`;
    code += `                    __choice.__forgeApplyResult(null);\n`;
    code += `                });\n`;
    code += `            }\n`;
    code += `            __choice.__forgeApplyResult(null);\n`;
    code += `        }).call(this);\n`;

    if (!bindConfirmResults) continue;
    for (const source of page.elements) {
      const judgesChoice = (source.actions ?? []).some((action) => (
        (confirmEvents.has(action.event) && action.targetId === choiceBox.id)
        || (action.event === SDK_JUDGE_EVENT && action.judgeTargetId === choiceBox.id)
      ));
      if (!judgesChoice) continue;
      code += `        (function() {\n`;
      code += `            var source: any = this.${getVar(source)};\n`;
      code += `            var choice: any = ${choiceRef};\n`;
      code += `            if (!source || !choice || source.__forgeChoiceVisualTarget === choice) return;\n`;
      code += `            source.__forgeChoiceVisualTarget = choice;\n`;
      code += `            source.on(Laya.Event.CLICK, this, function() { Laya.timer.callLater(this, function() { if (choice.__forgeApplyResult) choice.__forgeApplyResult(choice.isNull ? null : choice.isRight === true); }); });\n`;
      code += `        }).call(this);\n`;
    }
  }
  return code;
}

function buildHomeworkChoiceResultCode(page: SubPage, getVar: (element: Element) => string): string {
  let code = '';
  for (const choiceBox of page.elements) {
    if (choiceBox.type !== 'ChoiceBox') continue;
    const choiceRef = `this.${getVar(choiceBox)}`;
    code += `        if ((${choiceRef} as any).__forgeApplyResult) (${choiceRef} as any).__forgeApplyResult(${choiceRef}.isNull ? null : ${choiceRef}.isRight === true);\n`;
  }
  return code;
}

function generateSceneTs(sceneName: string, page: SubPage, resourceMap: Map<string, string>, varAssignment: Map<string, string>, uiNamespace = 'game_lt'): string {
  /** 根据元素 ID 获取分配的 var 名（用于 this.xxx 引用） */
  const getVar = (el: Element): string => {
    return varAssignment.get(el.id) || (el.name || el.id).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  };
  const buildActionBody = makeActionBuilder(varAssignment, resourceMap, uiNamespace);
  let initCode = '';
  const internalRuntime = buildInternalPageRuntime(page, getVar, buildActionBody);
  initCode += buildMathKeyboardInitCode(page, getVar);
  initCode += buildInputRuleInitCode(page, getVar);

  // 口才反馈动画：如果有 onClickInitConfirmCH / *WithLock / onClickInitGameConfirmCH / *WithLock 或 playKcRightAni / playKcWrongAni，需要在类末尾追加 playRightAni/playWrongAni
  const hasCHConfirm = page.elements.some(el =>
    (el.actions ?? []).some(a => a.event === 'onClickInitConfirmCH' || a.event === 'onClickInitConfirmCHWithLock' || a.event === 'onClickInitGameConfirmCH' || a.event === 'onClickInitGameConfirmCHWithLock' || a.actionType === 'playKcRightAni' || a.actionType === 'playKcRightAniLock' || a.actionType === 'playKcWrongAni')
  );
  const chFeedbackMethods = hasCHConfirm
    ? `
    playRightAni(): void {
        let t: any = this.Spine_kcFeedbackYes;
        if (t && t.play) {
            t.visible = true;
            t.play("animation", false);
            this.mouseEnabled = false;
            t.once(Laya.Event.END, this, () => {
                this.mouseEnabled = true;
                t.visible = false;
            });
        }
    }

    playWrongAni(): void {
        let t: any = this.Spine_kcFeedbackNo;
        if (t && t.play) {
            t.visible = true;
            t.play("animation", false);
            this.mouseEnabled = false;
            t.once(Laya.Event.END, this, () => {
                this.mouseEnabled = true;
                t.visible = false;
            });
        }
    }
`
    : '';

  // ─── DragViewBox 统一处理（每个 DVB 一对 EVENT_SUCCESS/EVENT_FAILD，合并 dropSkin + onDragJudge）───
  initCode += buildDvbInitCode(page, getVar, buildActionBody as never, uiNamespace);
  initCode += buildSdkJudgeClickInitCode(page, getVar, buildActionBody);
  initCode += buildSdkJudgeInputInitCode(page, getVar, buildActionBody);
  initCode += buildInternalPageActionBindings(page, getVar, buildActionBody, uiNamespace);
  initCode += buildOrdinaryActionBindings(page, getVar, buildActionBody, uiNamespace);

  // 用户绑定的动作（切换显隐、播放音效等）
  const eventMap: Record<string, string> = { onClick: 'click', onClickSound: 'click', onLoad: 'display', onChange: 'change' };
  for (const el of page.elements) {
    if (!el.actions?.length) continue;
    const elVar = getVar(el);
    const elRef = `this.${elVar}`;

    // 按原始事件名分组
    const groupedByEvent = new Map<string, typeof el.actions>();
    for (const action of el.actions) {
      const key = action.event;
      if (!groupedByEvent.has(key)) groupedByEvent.set(key, []);
      groupedByEvent.get(key)!.push(action);
    }

    for (const [rawEvent, actions] of groupedByEvent) {
      const event = eventMap[rawEvent] ?? rawEvent;

      if (page.editorModel === 'internal-pages' && rawEvent === 'onLoad') continue;

      // onAutoPlay：Spine 直接播放，不绑定事件；循环行为来自 action.spineLoop（默认 true）
      if (rawEvent === 'onAutoPlay') {
        const loop = actions[0]?.spineLoop !== 'false';
        initCode += `        if (${elRef}) ${elRef}.play(${elRef}.currAniName, ${loop});\n`;
        continue;
      }

      // onPlayEnd：Spine 播放结束（Event.END）一次性回调；可选先隐藏自身
      if (rawEvent === 'onPlayEnd') {
        const hideSelf = actions.some(a => a.hideSelf);
        let innerCode = '';
        if (hideSelf) innerCode += `${elRef}.visible = false; `;
        for (const action of actions) {
          const body = buildActionBody(action, elRef, page, el);
          if (body) innerCode += `${body} `;
        }
        if (innerCode.trim()) {
          initCode += `        if (${elRef}) ${elRef}.once('end', this, function() { ${innerCode.trim()} });\n`;
        }
        continue;
      }

      // onAutoClick：ChoiceBox 内 SelectableObj，Stage init 时设为选中并跑该选项所有 onClick 组动作
      if (rawEvent === 'onAutoClick') {
        const parent = el.parentId ? page.elements.find(e => e.id === el.parentId) : undefined;
        if (parent && parent.layaType === 'ChoiceBox') {
          const parentVar = getVar(parent);
          const selName = (el.name || el.id).replace(/'/g, "\\'");
          let body = `var __sel = this.${parentVar}.getChildByName('${selName}');`
            + ` if (__sel) { __sel.isSelected = true; this.${parentVar}.pushSel('${selName}');`;
          for (const action of el.actions) {
            if (action.event !== 'onClick' && action.event !== 'onClickSound') continue;
            const actionBody = buildActionBody(action, elRef, page, el);
            if (actionBody) body += ` ${actionBody}`;
          }
          body += ' }';
          initCode += `        ${body}\n`;
        }
        continue;
      }

      // 通用 SDK 判定已由 buildSdkJudgeClickInitCode 按 groupId 和结果分支统一生成。
      if (rawEvent === SDK_JUDGE_EVENT || rawEvent === INPUT_SDK_JUDGE_EVENT) continue;

      // onClickInitConfirm / onClickInitConfirmWithLock：直接在 initView 注入 GameUtils.initConfirm / initChoiceBoxConfirm，不绑定事件
      if (rawEvent === 'onClickInitConfirm' || rawEvent === 'onClickInitConfirmWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          const btnVar = getVar(el);
          const lockArg = rawEvent === 'onClickInitConfirmWithLock' ? ', null, this._lockBox' : '';
          if (targetEl?.type === 'ContainerBox' && isInputRuleHost(targetEl)) {
            initCode += buildInputRuleConfirmInitCode(
              el,
              targetEl,
              getVar,
              rawEvent === 'onClickInitConfirmWithLock',
            );
          } else if (targetEl?.type === 'KlInputBox') {
            const inputBoxVar = getVar(targetEl);
            initCode += `        GameUtils.initConfirm(this, this.${btnVar}, this.${inputBoxVar}${lockArg});\n`;
          } else if (targetEl && targetEl.layaType === 'ChoiceBox') {
            const choiceBoxVar = getVar(targetEl);
            initCode += `        GameUtils.initChoiceBoxConfirm(this, this.${btnVar}, this.${choiceBoxVar}${lockArg});\n`;
          }
        }
        continue;
      }

      // onClickInitConfirmCH / onClickInitConfirmCHWithLock：注入 GameUtils.initConfirmCH / initChoiceBoxConfirmCH，并标记需要追加 playRightAni/playWrongAni/playEnd
      if (rawEvent === 'onClickInitConfirmCH' || rawEvent === 'onClickInitConfirmCHWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          const btnVar = getVar(el);
          const isLock = rawEvent === 'onClickInitConfirmCHWithLock';
          const lockArg = isLock ? 'this._lockBox' : 'null';
          if (isInputRuleHost(targetEl)) {
            const inputBoxVar = getVar(targetEl);
            initCode += `        GameUtils.initConfirmCH(this, this.${btnVar}, this.${inputBoxVar}, null, ${lockArg}, this.playRightAni, this.playWrongAni);\n`;
          } else if (targetEl && targetEl.layaType === 'ChoiceBox') {
            const choiceBoxVar = getVar(targetEl);
            initCode += `        GameUtils.initChoiceBoxConfirmCH(this, this.${btnVar}, this.${choiceBoxVar}, null, ${lockArg}, this.playRightAni, this.playWrongAni);\n`;
          }
        }
        continue;
      }

      // onClickInitGameConfirm / onClickInitGameConfirmWithLock：在 initView 注入 click 监听 + inline 判定函数
      // - target=DragViewBox：判定用 dragsOnRightDrops()
      //   模板：this.btn.on(Laya.Event.CLICK, this, function() {
      //           if (this.dvb.dragsOnRightDrops()) { this.showAnswerFace(1); [this._lockBox.visible = true;] }
      //           else { this.showAnswerFace(2); }
      //         });
      // - target=MatchingGame：判定用 allRight，错误时调用 wrongLineTips()
      //   模板：this.btn.on(Laya.Event.CLICK, this, function() {
      //           if (this.mg.allRight) { this.showAnswerFace(1); [this._lockBox.visible = true;] }
      //           else { this.mg.wrongLineTips(); this.showAnswerFace(2); }
      //         });
      if (rawEvent === 'onClickInitGameConfirm' || rawEvent === 'onClickInitGameConfirmWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          if (!targetEl) continue;
          const btnVar = getVar(el);
          const targetVar = getVar(targetEl);
          const lockLine = rawEvent === 'onClickInitGameConfirmWithLock' ? ' this._lockBox.visible = true;' : '';
          if (targetEl.type === 'DragViewBox') {
            initCode += `        this.${btnVar}.on(Laya.Event.CLICK, this, function() {\n`;
            initCode += `            if (this.${targetVar}.dragsOnRightDrops()) { this.showAnswerFace(1);${lockLine} }\n`;
            initCode += `            else { this.showAnswerFace(2); }\n`;
            initCode += `        });\n`;
          } else if (targetEl.type === 'MatchingGame') {
            initCode += `        this.${btnVar}.on(Laya.Event.CLICK, this, function() {\n`;
            initCode += `            if (this.${targetVar}.allRight) { this.showAnswerFace(1);${lockLine} }\n`;
            initCode += `            else { this.${targetVar}.wrongLineTips(); this.showAnswerFace(2); }\n`;
            initCode += `        });\n`;
          }
        }
        continue;
      }

      // onClickInitGameConfirmCH / onClickInitGameConfirmCHWithLock：拖拽题/连线题判断 + 口才文字动画反馈
      // 与 onClickInitGameConfirm* 区别：成功调用 playRightAni()（口才 Spine），失败调用 playWrongAni()，不走 SDK 的 showAnswerFace
      if (rawEvent === 'onClickInitGameConfirmCH' || rawEvent === 'onClickInitGameConfirmCHWithLock') {
        for (const action of actions) {
          const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
          if (!targetEl) continue;
          const btnVar = getVar(el);
          const targetVar = getVar(targetEl);
          const lockLine = rawEvent === 'onClickInitGameConfirmCHWithLock' ? ' this._lockBox.visible = true;' : '';
          if (targetEl.type === 'DragViewBox') {
            initCode += `        this.${btnVar}.on(Laya.Event.CLICK, this, function() {\n`;
            initCode += `            if (this.${targetVar}.dragsOnRightDrops()) { this.playRightAni();${lockLine} }\n`;
            initCode += `            else { this.playWrongAni(); }\n`;
            initCode += `        });\n`;
          } else if (targetEl.type === 'MatchingGame') {
            initCode += `        this.${btnVar}.on(Laya.Event.CLICK, this, function() {\n`;
            initCode += `            if (this.${targetVar}.allRight) { this.playRightAni();${lockLine} }\n`;
            initCode += `            else { this.${targetVar}.wrongLineTips(); this.playWrongAni(); }\n`;
            initCode += `        });\n`;
          }
        }
        continue;
      }

      // onInputJudge / onChoiceJudge / onMatchingJudge：延迟到事件循环结束后统一生成
      if (rawEvent === 'onInputJudge' || rawEvent === 'onChoiceJudge' || rawEvent === 'onMatchingJudge') {
        continue;
      }

      // onDragJudge：已在前置 DragViewBox 统一处理中合并到 EVENT_SUCCESS/EVENT_FAILD，跳过
      if (rawEvent === 'onDragJudge') {
        continue;
      }

      const remainingActions = actions.filter((action) => (
        !isSharedOrdinaryAction(action)
        && !(page.editorModel === 'internal-pages' && isPageAction(action))
      ));
      const sortedRemainingActions = [...remainingActions].sort((a, b) => Number(isPageAction(a)) - Number(isPageAction(b)));
      const sharedBindingHasClickSound = actions.some(isSharedOrdinaryAction);
      for (const [index, action] of sortedRemainingActions.entries()) {
        const clickSoundPrefix = rawEvent === 'onClickSound' && !sharedBindingHasClickSound && index === 0
          ? `this.playSound("${uiNamespace}/sound/btn_click.wav"); `
          : '';
        const body = buildActionBody(action, elRef, page, el);
        if (body) initCode += `        ${elRef}.on('${event}', this, function() { ${clickSoundPrefix}${body} });\n`;
      }
    }

    // ChoiceBox 自动判定：合并到一个 clickHanler
    if (el.layaType === 'ChoiceBox') {
      const hasJudge = el.actions?.some(a => a.event === 'onChoiceJudge');
      if (hasJudge) {
        // 按 branchCondition 分流构建 right/wrong/null 三个分支的动作 body
        let rightBody = '', wrongBody = '', nullBody = '';
        const judgeActions = (el.actions ?? []).filter(a => a.event === 'onChoiceJudge');
        const byBranch = new Map<string, typeof judgeActions>();
        for (const a of judgeActions) {
          const bid = a.branchId ?? '_default';
          if (!byBranch.has(bid)) byBranch.set(bid, []);
          byBranch.get(bid)!.push(a);
        }
        for (const [, branchActions] of byBranch) {
          const cond = branchActions[0].branchCondition ?? 'right';
          let body = '';
          for (const a of branchActions) {
            const b = buildActionBody(a, elRef, page, el);
            if (b) body += `${b} `;
          }
          const trimmed = body.trim();
          if (cond === 'right') rightBody = trimmed;
          else if (cond === 'wrong') wrongBody = trimmed;
          else if (cond === 'null') nullBody = trimmed;
        }
        initCode += `        ${elRef}.clickHanler = Laya.Handler.create(this, function() {\n`;
        initCode += `            if (${elRef}.isRight) { console.log('${getVar(el)} result:right'); ${rightBody} }\n`;
        initCode += `            else if (${elRef}.isNull) { console.log('${getVar(el)} result:isnull'); ${nullBody} }\n`;
        initCode += `            else { console.log('${getVar(el)} result:false'); ${wrongBody} }\n`;
        initCode += `        }, null, false);\n`;
      }
    }

    // 答题判定容器自动判定：合并到一个 afterJudgeHandler
    if (isInputRuleHost(el)) {
      const hasJudge = el.actions?.some(a => a.event === 'onInputJudge');
      if (hasJudge) {
        // 按 branchCondition 分流构建 right/wrong/null 三个分支的动作 body
        let rightBody = '', wrongBody = '', nullBody = '';
        const judgeActions = (el.actions ?? []).filter(a => a.event === 'onInputJudge');
        const byBranch = new Map<string, typeof judgeActions>();
        for (const a of judgeActions) {
          const bid = a.branchId ?? '_default';
          if (!byBranch.has(bid)) byBranch.set(bid, []);
          byBranch.get(bid)!.push(a);
        }
        for (const [, branchActions] of byBranch) {
          const cond = branchActions[0].branchCondition ?? 'right';
          let body = '';
          for (const a of branchActions) {
            const b = buildActionBody(a, elRef, page, el);
            if (b) body += `${b} `;
          }
          const trimmed = body.trim();
          if (cond === 'right') rightBody = trimmed;
          else if (cond === 'wrong') wrongBody = trimmed;
          else if (cond === 'null') nullBody = trimmed;
        }
        initCode += `        ${elRef}.afterJudgeHandler = Laya.Handler.create(this, function() {\n`;
        initCode += `            if (${elRef}.isRight()) { console.log('${getVar(el)} result:right'); ${rightBody} }\n`;
        initCode += `            else if (${elRef}.isNull()) { console.log('${getVar(el)} result:isnull'); ${nullBody} }\n`;
        initCode += `            else { console.log('${getVar(el)} result:false'); ${wrongBody} }\n`;
        initCode += `        }, null, false);\n`;
      }
    }

    // MatchingGame 自动判定：监听 EVENT_CLICKLINE，内嵌 allRight/isNull() 三态判定
    if (el.layaType === 'MatchingGame') {
      const hasJudge = el.actions?.some(a => a.event === 'onMatchingJudge');
      if (hasJudge) {
        let rightBody = '', wrongBody = '', nullBody = '';
        const judgeActions = (el.actions ?? []).filter(a => a.event === 'onMatchingJudge');
        const byBranch = new Map<string, typeof judgeActions>();
        for (const a of judgeActions) {
          const bid = a.branchId ?? '_default';
          if (!byBranch.has(bid)) byBranch.set(bid, []);
          byBranch.get(bid)!.push(a);
        }
        for (const [, branchActions] of byBranch) {
          const cond = branchActions[0].branchCondition ?? 'right';
          let body = '';
          for (const a of branchActions) {
            const b = buildActionBody(a, elRef, page, el);
            if (b) body += `${b} `;
          }
          const trimmed = body.trim();
          if (cond === 'right') rightBody = trimmed;
          else if (cond === 'wrong') wrongBody = trimmed;
          else if (cond === 'null') nullBody = trimmed;
        }
        initCode += `        ${elRef}.on("EVENT_CLICKLINE", this, function(lastItem, currItem, line) {\n`;
        initCode += `            if (${elRef}.allRight) { console.log('${getVar(el)} result:right'); ${rightBody} }\n`;
        initCode += `            else if (${elRef}.isNull()) { console.log('${getVar(el)} result:isnull'); ${nullBody} }\n`;
        initCode += `            else { console.log('${getVar(el)} result:false'); ${wrongBody} }\n`;
        initCode += `        });\n`;
      }
    }
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

  // 翻页按钮初始化：不循环模式下，根据当前页设置左右按钮的初始 visible；同步标签按钮的 isSelected
  const ptBoxes = page.elements.filter(e => e.type === 'PageTurnBox');
  for (const ptBox of ptBoxes) {
    const ptChildren = page.elements.filter(e => e.parentId === ptBox.id);
    const pageBoxes = ptChildren.filter(e => e.type === 'ContainerBox');
    const leftBtn = ptChildren.find(e => e.type === 'PageTurnLeftBtn');
    const rightBtn = ptChildren.find(e => e.type === 'PageTurnRightBtn');
    const tabBtns = ptChildren.filter(e => e.type === 'SpeechSelectableObj');
    // 检查左右按钮是否有 Once 类型的 action
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

  // 检测是否需要 import MatchingGame 相关类型
  const needMatchingImport = page.elements.some(el =>
    el.layaType === 'MatchingGame' && el.actions?.some(a => a.event === 'onMatchingJudge')
  );
  const matchingImports = needMatchingImport
    ? `import MatchingGame = com.klzz.ui.custom.MatchingGame.MatchingGame;
import MatchingItem = com.klzz.ui.custom.MatchingGame.MatchingItem;
`
    : '';
  const needFractionInput = page.elements.some((element) => element.type === 'FractionInput');
  const fractionImport = needFractionInput ? 'import FractionInput from "./Components/FractionInput";\n' : '';
  const fractionReference = needFractionInput ? '    _ref = [FractionInput];\n\n' : '';

  initCode += buildChoiceVisualInitCode(page, getVar);
  initCode += internalRuntime.initCode;

  return `import { ui } from "../../ui/layaMaxUI";

import Event = Laya.Event;
import Image = Laya.Image;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
${matchingImports}${fractionImport}import { GameUtils } from "./GameUtils";

export default class ${sceneName} extends ui.${uiNamespace}.${sceneName}UI {

${fractionReference}    public initView(byReset: boolean) {
        super.initView(byReset);

${initCode}        //add script
    }
${chFeedbackMethods}${internalRuntime.methodsCode}    //add function
}`;
}

function generateHomeworkSceneTs(
  sceneName: string,
  page: SubPage,
  resourceMap: Map<string, string>,
  varAssignment: Map<string, string>,
): string {
  const getVar = (el: Element): string => {
    return varAssignment.get(el.id) || (el.name || el.id).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  };
  const buildActionBody = makeActionBuilder(varAssignment, resourceMap, 'game_hw');

  let initCode = '';
  let checkResultCode = '        var __forgeJudgeResults: any[] = [];\n';
  const internalRuntime = buildInternalPageRuntime(page, getVar, buildActionBody);
  initCode += buildMathKeyboardInitCode(page, getVar);
  initCode += buildInputRuleInitCode(page, getVar);
  initCode += buildInternalPageActionBindings(page, getVar, buildActionBody, 'game_hw');
  initCode += buildSdkJudgeClickInitCode(page, getVar, buildActionBody, true);
  initCode += buildSdkJudgeInputInitCode(page, getVar, buildActionBody, true);
  initCode += buildChoiceVisualInitCode(page, getVar, false);
  initCode += buildOrdinaryActionBindings(page, getVar, buildActionBody, 'game_hw');

  // 作业与测评由右上角通用提交读取 result；所有 ChoiceBox 都参与聚合判定。
  for (const el of page.elements) {
    if (el.layaType !== 'ChoiceBox') continue;

    const elVar = getVar(el);
    const elRef = `this.${elVar}`;

    // 按 branchCondition 分流构建 right/wrong/null 三个分支的动作 body
    let rightBody = '', wrongBody = '', nullBody = '';
    const judgeActions = (el.actions ?? []).filter(a => a.event === 'onChoiceJudge');
    const byBranch = new Map<string, typeof judgeActions>();
    for (const a of judgeActions) {
      const bid = a.branchId ?? '_default';
      if (!byBranch.has(bid)) byBranch.set(bid, []);
      byBranch.get(bid)!.push(a);
    }
    for (const [, branchActions] of byBranch) {
      const cond = branchActions[0].branchCondition ?? 'right';
      let body = '';
      for (const a of branchActions) {
        const b = buildActionBody(a, elRef, page, el);
        if (b) body += `${b} `;
      }
      const trimmed = body.trim();
      if (cond === 'right') rightBody = trimmed;
      else if (cond === 'wrong') wrongBody = trimmed;
      else if (cond === 'null') nullBody = trimmed;
    }

    checkResultCode +=
      `        if (${elRef}.isRight) { ${rightBody ? rightBody + ' ' : ''}__forgeJudgeResults.push(true); }\n` +
      `        else if (${elRef}.isNull) { ${nullBody ? nullBody + ' ' : ''}__forgeJudgeResults.push(null); }\n` +
      `        else { ${wrongBody ? wrongBody + ' ' : ''}__forgeJudgeResults.push(false); }\n`;
  }

  // 答题判定容器自动判定：afterJudgeHandler 绑到 checkResult；result 在 checkResult 内根据 isRight()/isNull() 写值
  for (const el of page.elements) {
    if (!isInputRuleHost(el)) continue;
    const hasJudge = el.actions?.some(a => a.event === 'onInputJudge');
    if (!hasJudge) continue;

    const elVar = getVar(el);
    const elRef = `this.${elVar}`;

    initCode += `        ${elRef}.afterJudgeHandler = Laya.Handler.create(this, this.checkResult, null, false);\n`;

    // 按 branchCondition 分流构建 right/wrong/null 三个分支的动作 body
    let rightBody = '', wrongBody = '', nullBody = '';
    const judgeActions = (el.actions ?? []).filter(a => a.event === 'onInputJudge');
    const byBranch = new Map<string, typeof judgeActions>();
    for (const a of judgeActions) {
      const bid = a.branchId ?? '_default';
      if (!byBranch.has(bid)) byBranch.set(bid, []);
      byBranch.get(bid)!.push(a);
    }
    for (const [, branchActions] of byBranch) {
      const cond = branchActions[0].branchCondition ?? 'right';
      let body = '';
      for (const a of branchActions) {
        const b = buildActionBody(a, elRef, page, el);
        if (b) body += `${b} `;
      }
      const trimmed = body.trim();
      if (cond === 'right') rightBody = trimmed;
      else if (cond === 'wrong') wrongBody = trimmed;
      else if (cond === 'null') nullBody = trimmed;
    }

    checkResultCode +=
      `        if (${elRef}.isRight()) { ${rightBody ? rightBody + ' ' : ''}__forgeJudgeResults.push(true); }\n` +
      `        else if (${elRef}.isNull()) { ${nullBody ? nullBody + ' ' : ''}__forgeJudgeResults.push(null); }\n` +
      `        else { ${wrongBody ? wrongBody + ' ' : ''}__forgeJudgeResults.push(false); }\n`;
  }

  // DragViewBox 自动判定：EVENT_SUCCESS/EVENT_FAILD 监听 + checkResult 内根据 dragsOnRightDrops() 写 result
  initCode += buildDvbInitCode(page, getVar, buildActionBody as never, 'game_hw');
  for (const el of page.elements) {
    if (el.type !== 'DragViewBox') continue;
    // 只在配了 onDragJudge 时写 result（否则不参与判定）
    const hasJudge = el.actions?.some(a => a.event === 'onDragJudge');
    if (!hasJudge) continue;
    const elRef = `this.${getVar(el)}`;
    checkResultCode +=
      `        if (${elRef}.dragsOnRightDrops()) { __forgeJudgeResults.push(true); }\n` +
      `        else { __forgeJudgeResults.push(false); }\n`;
  }

  // MatchingGame 自动判定：监听 EVENT_CLICKLINE 触发 checkResult + checkResult 内根据 allRight/isNull() 写 result
  for (const el of page.elements) {
    if (el.layaType !== 'MatchingGame') continue;
    const hasJudge = el.actions?.some(a => a.event === 'onMatchingJudge');
    if (!hasJudge) continue;

    const elVar = getVar(el);
    const elRef = `this.${elVar}`;

    // initCode: 监听 EVENT_CLICKLINE，每次连线后触发 checkResult
    initCode += `        ${elRef}.on("EVENT_CLICKLINE", this, function(lastItem, currItem, line) {\n`;
    initCode += `            this.checkResult();\n`;
    initCode += `        });\n`;

    // checkResultCode: 根据 allRight/isNull() 判定并写 result
    let rightBody = '', wrongBody = '', nullBody = '';
    const judgeActions = (el.actions ?? []).filter(a => a.event === 'onMatchingJudge');
    const byBranch = new Map<string, typeof judgeActions>();
    for (const a of judgeActions) {
      const bid = a.branchId ?? '_default';
      if (!byBranch.has(bid)) byBranch.set(bid, []);
      byBranch.get(bid)!.push(a);
    }
    for (const [, branchActions] of byBranch) {
      const cond = branchActions[0].branchCondition ?? 'right';
      let body = '';
      for (const a of branchActions) {
        const b = buildActionBody(a, elRef, page, el);
        if (b) body += `${b} `;
      }
      const trimmed = body.trim();
      if (cond === 'right') rightBody = trimmed;
      else if (cond === 'wrong') wrongBody = trimmed;
      else if (cond === 'null') nullBody = trimmed;
    }

    checkResultCode +=
      `        if (${elRef}.allRight) { ${rightBody ? rightBody + ' ' : ''}__forgeJudgeResults.push(true); }\n` +
      `        else if (${elRef}.isNull()) { ${nullBody ? nullBody + ' ' : ''}__forgeJudgeResults.push(null); }\n` +
      `        else { ${wrongBody ? wrongBody + ' ' : ''}__forgeJudgeResults.push(false); }\n`;
  }

  checkResultCode += buildHomeworkStandaloneInputJudgeCode(page, getVar);
  checkResultCode +=
    `        if (__forgeJudgeResults.length > 0) {\n` +
    `            this.result = __forgeJudgeResults.indexOf(null) >= 0\n` +
    `                ? null\n` +
    `                : __forgeJudgeResults.every(function(value) { return value === true; });\n` +
    `            console.log("==========result:", this.result);\n` +
    `        }\n`;

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

  // 检测是否需要 import MatchingGame 相关类型
  const needMatchingImport = page.elements.some(el =>
    el.layaType === 'MatchingGame' && el.actions?.some(a => a.event === 'onMatchingJudge')
  );
  const matchingImports = needMatchingImport
    ? `import MatchingGame = com.klzz.ui.custom.MatchingGame.MatchingGame;
import MatchingItem = com.klzz.ui.custom.MatchingGame.MatchingItem;
`
    : '';
  const needFractionInput = page.elements.some((element) => element.type === 'FractionInput');
  const fractionImport = needFractionInput ? 'import FractionInput from "./Components/FractionInput";\n' : '';
  const fractionReference = needFractionInput ? '    _ref = [FractionInput];\n' : '';

  initCode += internalRuntime.initCode;

  return `import { ui } from "../../ui/layaMaxUI";
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
${matchingImports}${fractionImport}import { GameUtils } from "./GameUtils";

export default class ${sceneName} extends ui.game_hw.${sceneName}UI {
${fractionReference}    public initView(byReset: boolean) {
        super.initView(byReset);
${initCode}        //add script
    }
    private _result: Boolean = null;
    public get result(): any {
        this.checkResult();
${buildHomeworkChoiceResultCode(page, getVar)}
        return this._result;
    }
    public set result(v: any) {
        this._result = v;
    }
    public get sound(): string {
        return this.config.param.soundpath;
    }
    public get desc(): string {
        return "";
    }
    public labDesc(lab: Laya.Label): void {
        //add labDesc
    }
    public get hideTitle(): boolean {
        return true;
    }
    public get hideTitleBg(): boolean {
        return true;
    }
    private currFrame: number = 0;
    public checkResult() {
        if (this.currFrame == Laya.timer.currFrame) {
            return;
        }
        this.currFrame = Laya.timer.currFrame;
${checkResultCode}        //add checkResult
    }
${internalRuntime.methodsCode}
}`;
}

// ─── config.json ───

/**
 * 递归扫描 ExportChild 树（如 _keyboardPreset.children），把图片/声音资源按 atlas 收集。
 * 键盘预设的所有子图都按 atlas 处理（不区分大小图），收集对应的子目录名到 imageDirs。
 */
function collectExportChildrenRes(
  children: ExportChild[] | undefined,
  resourceMap: Map<string, string>,
  imagePrefix: string, // 'game_lt/image/' 或 'game_hw/image/' 或 'game_preview/image/'
  soundPrefix: string,
  imageDirs: Set<string>,
  resEntries: { url: string; type?: string }[],
  addedSingleFiles: Set<string>,
) {
  if (!children) return;
  for (const c of children) {
    if (c.resources) {
      for (const resource of c.resources) {
        const mapped = resourceMap.get(resource);
        if (!mapped || addedSingleFiles.has(mapped)) continue;
        if (/\.ttf$/i.test(mapped)) {
          resEntries.push({ url: mapped, type: 'ttf' });
          addedSingleFiles.add(mapped);
        }
      }
    }
    if (c.props) {
      for (const v of Object.values(c.props)) {
        const mapped = resourceMap.get(String(v));
        if (!mapped) continue;
        if (/\.ttf$/i.test(mapped) && !addedSingleFiles.has(mapped)) {
          resEntries.push({ url: mapped, type: 'ttf' });
          addedSingleFiles.add(mapped);
        } else if (mapped.startsWith(imagePrefix)) {
          const dir = getImageAtlasDirectory(mapped, imagePrefix);
          if (dir) imageDirs.add(dir);
        } else if (mapped.startsWith(soundPrefix) && !addedSingleFiles.has(mapped)) {
          resEntries.push({ url: mapped, type: 'sound' });
          addedSingleFiles.add(mapped);
        }
      }
    }
    if (c.child) {
      collectExportChildrenRes(c.child, resourceMap, imagePrefix, soundPrefix, imageDirs, resEntries, addedSingleFiles);
    }
  }
}

function buildConfigJson(course: Course, resourceMap: Map<string, string>, imageSizes: Map<string, { w: number; h: number }>): Record<string, unknown> {
  return {
    release: 'dev', feedback: course.feedback ?? 'spirit', noVideoMystery: 1,
    pages: course.stages.map((stage, si) => {
      const videoPage = stage.subPages.find(p => p.frozen);
      const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
      if (videoEl) {
        const videoUrl = String((videoEl.props as Record<string, unknown>)?.videoUrl ?? '');
        const mappedVideoUrl = videoUrl ? resourceMap.get(videoUrl) ?? videoUrl : '';
        return { type: 'video', videoUrl: mappedVideoUrl, classType: 'gc' };
      }

      const resEntries: { url: string; type?: string }[] = [];
      const imageDirs = new Set<string>();
      const addedSingleFiles = new Set<string>();

      // classType 规则：
      //   subPage 对应的 ts 中调用了以下任一函数 → 视为教学关：sj === 0 用 'lt'，其余用 'lx'
      //     · GameUtils.initConfirm           ← onClickInitConfirm[WithLock] + 答题判定容器
      //     · GameUtils.initChoiceBoxConfirm  ← onClickInitConfirm[WithLock] + targetEl.layaType === 'ChoiceBox'
      //     · this.showAnswerFace(1)          ← showAnswerRight / showAnswerRightLock
      //                                       ← onClickInitGameConfirm[WithLock] + targetEl.type === 'DragViewBox' / 'MatchingGame'
      //   都没有则视为封面/纯展示页 → 'fm'
      const isTeachingPage = (page: SubPage): boolean => {
        for (const el of page.elements) {
          if (!el.actions?.length) continue;
          for (const action of el.actions) {
            if (action.actionType === 'showAnswerRight' || action.actionType === 'showAnswerRightLock') {
              return true;
            }
            if (action.event === 'onClickInitConfirm' || action.event === 'onClickInitConfirmWithLock') {
              const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
              if (targetEl && (isInputRuleHost(targetEl) || targetEl.layaType === 'ChoiceBox')) {
                return true;
              }
            }
            if (action.event === 'onClickInitGameConfirm' || action.event === 'onClickInitGameConfirmWithLock') {
              const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
              if (targetEl && (targetEl.type === 'DragViewBox' || targetEl.type === 'MatchingGame')) {
                return true;
              }
            }
          }
        }
        return false;
      };

      const subviews = stage.subPages.map((page, sj) => {
        const sceneName = `GameLT${si + 1}_${sj + 1}`;
        const param = sj === 0 ? String(si + 1) : `${si + 1}_${sj + 1}`;
        const classType = isTeachingPage(page) ? (sj === 0 ? 'lt' : 'lx') : 'fm';
        return {
          view: `view/game_lt/${sceneName}.ts`,
          param,
          classType,
        };
      });

      // 收集该 stage 所有资源
      for (const page of stage.subPages) {
        for (const el of page.elements) {
          const meta = elementMeta[el.type];
          const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) };
          for (const [key, value] of Object.entries(merged)) {
            if (key.startsWith('_')) continue;
            const mapped = resourceMap.get(String(value));
            if (!mapped) continue;

            // 图片资源：按真实像素尺寸判断大小图
            // 大图（≥512）写散图条目，小图只收 imageDirs 用于 atlas 引用
            if (mapped.startsWith('game_lt/image/')) {
              const isLarge = isLargeImage(mapped, imageSizes);
              if (isLarge && !addedSingleFiles.has(mapped)) {
                resEntries.push({ url: mapped, type: 'image' });
                addedSingleFiles.add(mapped);
              }
              // 小图收集子目录用于 atlas
              if (!isLarge) {
                const dir = getImageAtlasDirectory(mapped, 'game_lt/image/');
                if (dir) imageDirs.add(dir);
              }
            }

            // 声音资源：生成单文件条目
            if (mapped.startsWith('game_lt/sound/') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped, type: 'sound' });
              addedSingleFiles.add(mapped);
            }

            // 骨骼动画资源：.sk 文件生成单文件条目，同目录 .png 纹理也加入预加载
            if (mapped.startsWith('game_lt/animation/') && mapped.endsWith('.sk') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped });
              addedSingleFiles.add(mapped);
              const pngMapped = mapped.replace(/\.sk$/, '.png');
              if (!addedSingleFiles.has(pngMapped)) {
                resEntries.push({ url: pngMapped, type: 'image' });
                addedSingleFiles.add(pngMapped);
              }
            }
          }
          // 选项卡片状态皮肤被主循环跳过，需显式收集
          if (el.type === 'SpeechSelectableObj') {
            const sMerged = merged as { _foregroundSkin?: string; _pressedSkin?: string; _bgSkin?: string; _correctSkin?: string; _wrongSkin?: string };
            for (const skinVal of [sMerged._foregroundSkin, sMerged._pressedSkin, sMerged._bgSkin, sMerged._correctSkin, sMerged._wrongSkin]) {
              if (!skinVal) continue;
              const mapped = resourceMap.get(skinVal);
              if (!mapped) continue;
              if (mapped.startsWith('game_lt/image/')) {
                const isLarge = isLargeImage(mapped, imageSizes);
                if (isLarge && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'image' });
                  addedSingleFiles.add(mapped);
                }
                if (!isLarge) {
                  const dir = getImageAtlasDirectory(mapped, 'game_lt/image/');
                  if (dir) imageDirs.add(dir);
                }
              }
            }
          }
          // 连线项：_itemImage 被主循环跳过，需显式收集
          if (el.type === 'MatchingItem') {
            const skinVal = (merged as { _itemImage?: string })._itemImage;
            if (skinVal) {
              const mapped = resourceMap.get(skinVal);
              if (mapped && mapped.startsWith('game_lt/image/')) {
                const isLarge = isLargeImage(mapped, imageSizes);
                if (isLarge && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'image' });
                  addedSingleFiles.add(mapped);
                }
                if (!isLarge) {
                  const dir = getImageAtlasDirectory(mapped, 'game_lt/image/');
                  if (dir) imageDirs.add(dir);
                }
              }
            }
          }
          // PageTurnBox 不携带 pages 数组，ContainerBox 子元素资源由主循环收集
          // 键盘预设：通过 _keyboardPreset.id 查表得到 children，递归收集（皮肤都进 atlas）
          collectExportChildrenRes(meta?.exportChildren, resourceMap, 'game_lt/image/', 'game_lt/sound/', imageDirs, resEntries, addedSingleFiles);
          collectExportChildrenRes(getKeyboardChildren(el), resourceMap, 'game_lt/image/', 'game_lt/sound/', imageDirs, resEntries, addedSingleFiles);
          // playSound / stopSound 动作中的音频资源也需要注册到 config.json
          if (el.actions) {
            for (const action of el.actions) {
              if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
                const mapped = resourceMap.get(String(action.value));
                if (mapped && mapped.startsWith('game_lt/sound/') && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'sound' });
                  addedSingleFiles.add(mapped);
                }
              }
            }
          }
        }
      }

      // 内置音效：检测 onClickSound / playRightSound / playWrongSound / onClickInitConfirmWithLock+ChoiceBox
      let needBtnClick = false, needRight = false, needWrong = false;
      for (const page of stage.subPages) {
        for (const el of page.elements) {
          if (!el.actions?.length) continue;
          for (const action of el.actions) {
            if (action.event === 'onClickSound') needBtnClick = true;
            if (action.actionType === 'playRightSound') needRight = true;
            if (action.actionType === 'playWrongSound') needWrong = true;
            // onClickInitConfirm / onClickInitConfirmWithLock 目标是 ChoiceBox 时也需要 right/wrong 音效
            if (action.event === 'onClickInitConfirm' || action.event === 'onClickInitConfirmWithLock') {
              const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
              if (targetEl && targetEl.layaType === 'ChoiceBox') { needRight = true; needWrong = true; }
            }
          }
        }
      }
      if (needBtnClick && !addedSingleFiles.has('game_lt/sound/btn_click.wav')) {
        resEntries.push({ url: 'game_lt/sound/btn_click.wav', type: 'sound' });
        addedSingleFiles.add('game_lt/sound/btn_click.wav');
      }
      if (needRight && !addedSingleFiles.has('game_lt/sound/right.mp3')) {
        resEntries.push({ url: 'game_lt/sound/right.mp3', type: 'sound' });
        addedSingleFiles.add('game_lt/sound/right.mp3');
      }
      if (needWrong && !addedSingleFiles.has('game_lt/sound/wrong.mp3')) {
        resEntries.push({ url: 'game_lt/sound/wrong.mp3', type: 'sound' });
        addedSingleFiles.add('game_lt/sound/wrong.mp3');
      }

      // atlas 条目（图片子目录）
      for (const dir of imageDirs) {
        resEntries.push({ url: `res/atlas/game_lt/image/${dir}.atlas` });
      }

      return {
        name: si === 0 ? 'game' : `game${si + 1}`,
        subviews,
        res: resEntries,
      };
    }),
  };
}

function buildHomeworkConfigJson(course: Course, resourceMap: Map<string, string>, imageSizes: Map<string, { w: number; h: number }>, kind?: CourseKind): Record<string, unknown> {
  return {
    pages: course.stages.map((stage, si) => {
      const videoPage = stage.subPages.find(p => p.frozen);
      const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
      if (videoEl) {
        const videoUrl = String((videoEl.props as Record<string, unknown>)?.videoUrl ?? '');
        const mappedVideoUrl = videoUrl ? resourceMap.get(videoUrl) ?? videoUrl : '';
        return { type: 'video', videoUrl: mappedVideoUrl, classType: '' };
      }

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
            if (mapped.startsWith('game_hw/image/')) {
              // 按真实像素尺寸判断大小图
              const isLarge = isLargeImage(mapped, imageSizes);
              if (isLarge && !addedSingleFiles.has(mapped)) {
                resEntries.push({ url: mapped, type: 'image' });
                addedSingleFiles.add(mapped);
              }
              if (!isLarge) {
                const dir = getImageAtlasDirectory(mapped, 'game_hw/image/');
                if (dir) imageDirs.add(dir);
              }
            }
            if (mapped.startsWith('game_hw/sound/') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped, type: 'sound' });
              addedSingleFiles.add(mapped);
            }

            // 骨骼动画资源：.sk 文件生成单文件条目，同目录 .png 纹理也加入预加载
            if (mapped.startsWith('game_hw/animation/') && mapped.endsWith('.sk') && !addedSingleFiles.has(mapped)) {
              resEntries.push({ url: mapped });
              addedSingleFiles.add(mapped);
              const pngMapped = mapped.replace(/\.sk$/, '.png');
              if (!addedSingleFiles.has(pngMapped)) {
                resEntries.push({ url: pngMapped, type: 'image' });
                addedSingleFiles.add(pngMapped);
              }
            }
          }
          // 选项卡片状态皮肤被主循环跳过，需显式收集
          if (el.type === 'SpeechSelectableObj') {
            const sMerged = merged as { _foregroundSkin?: string; _pressedSkin?: string; _bgSkin?: string; _correctSkin?: string; _wrongSkin?: string };
            for (const skinVal of [sMerged._foregroundSkin, sMerged._pressedSkin, sMerged._bgSkin, sMerged._correctSkin, sMerged._wrongSkin]) {
              if (!skinVal) continue;
              const mapped = resourceMap.get(skinVal);
              if (!mapped) continue;
              if (mapped.startsWith('game_hw/image/')) {
                const isLarge = isLargeImage(mapped, imageSizes);
                if (isLarge && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'image' });
                  addedSingleFiles.add(mapped);
                }
                if (!isLarge) {
                  const dir = getImageAtlasDirectory(mapped, 'game_hw/image/');
                  if (dir) imageDirs.add(dir);
                }
              }
            }
          }
          // 连线项：_itemImage 被主循环跳过，需显式收集
          if (el.type === 'MatchingItem') {
            const skinVal = (merged as { _itemImage?: string })._itemImage;
            if (skinVal) {
              const mapped = resourceMap.get(skinVal);
              if (mapped && mapped.startsWith('game_hw/image/')) {
                const isLarge = isLargeImage(mapped, imageSizes);
                if (isLarge && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'image' });
                  addedSingleFiles.add(mapped);
                }
                if (!isLarge) {
                  const dir = getImageAtlasDirectory(mapped, 'game_hw/image/');
                  if (dir) imageDirs.add(dir);
                }
              }
            }
          }
          // 键盘预设：通过 _keyboardPreset.id 查表得到 children，递归收集（皮肤都进 atlas）
          collectExportChildrenRes(meta?.exportChildren, resourceMap, 'game_hw/image/', 'game_hw/sound/', imageDirs, resEntries, addedSingleFiles);
          collectExportChildrenRes(getKeyboardChildren(el), resourceMap, 'game_hw/image/', 'game_hw/sound/', imageDirs, resEntries, addedSingleFiles);
          // playSound / stopSound 动作中的音频资源也需要注册到 config.json
          if (el.actions) {
            for (const action of el.actions) {
              if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
                const mapped = resourceMap.get(String(action.value));
                if (mapped && mapped.startsWith('game_hw/sound/') && !addedSingleFiles.has(mapped)) {
                  resEntries.push({ url: mapped, type: 'sound' });
                  addedSingleFiles.add(mapped);
                }
              }
            }
          }
        }
      }

      // 内置音效：检测 onClickSound / playRightSound / playWrongSound / ChoiceBox 自动判定
      let needBtnClick = false, needRight = false, needWrong = false;
      for (const page of stage.subPages) {
        for (const el of page.elements) {
          if (!el.actions?.length) continue;
          for (const action of el.actions) {
            if (action.event === 'onClickSound') needBtnClick = true;
            if (action.actionType === 'playRightSound') needRight = true;
            if (action.actionType === 'playWrongSound') needWrong = true;
            // onClickInitConfirm / onClickInitConfirmWithLock 目标是 ChoiceBox 时也需要 right/wrong 音效
            if (action.event === 'onClickInitConfirm' || action.event === 'onClickInitConfirmWithLock') {
              const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
              if (targetEl && targetEl.layaType === 'ChoiceBox') { needRight = true; needWrong = true; }
            }
          }
        }
      }
      if (needBtnClick && !addedSingleFiles.has('game_hw/sound/btn_click.wav')) {
        resEntries.push({ url: 'game_hw/sound/btn_click.wav', type: 'sound' });
        addedSingleFiles.add('game_hw/sound/btn_click.wav');
      }
      if (needRight && !addedSingleFiles.has('game_hw/sound/right.mp3')) {
        resEntries.push({ url: 'game_hw/sound/right.mp3', type: 'sound' });
        addedSingleFiles.add('game_hw/sound/right.mp3');
      }
      if (needWrong && !addedSingleFiles.has('game_hw/sound/wrong.mp3')) {
        resEntries.push({ url: 'game_hw/sound/wrong.mp3', type: 'sound' });
        addedSingleFiles.add('game_hw/sound/wrong.mp3');
      }

      for (const dir of imageDirs) {
        resEntries.push({ url: `res/atlas/game_hw/image/${dir}.atlas` });
      }

      return {
        name: `game${si + 1}`,
        view: `view/game_hw/Game${si + 1}.ts`,
        param: { soundpath: '', question: '' },
        res: resEntries,
        classType: '',
      };
    }),
    release: 'dev',
    ...(kind === 'sEvaluation' ? {} : { newEva: 1 }),
    classify: kind === 'sEvaluation' ? 'sEvaluation' : 'homeworkOnline',
    isSound: false,
    feedback: course.feedback ?? 'spirit',
  };
}

// ─── 复习课 config.json ───

function buildReviewConfigJson(course: Course): Record<string, unknown> {
  const pages = course.stages.map((stage, si) => {
    const videoPage = stage.subPages.find(p => p.frozen);
    const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
    const videoUrl = String((videoEl?.props as Record<string, unknown>)?.videoUrl ?? '');

    if (!videoUrl) {
      throw new Error(`关卡 ${si + 1} 缺少视频文件`);
    }

    // 视频路径映射到 game_review/animation/video{N}.mp4
    return {
      type: 'video',
      videoUrl: `game_review/animation/video${si + 1}.mp4`,
    };
  });

  // JLReviewSecondLevel: "[[0],[1],[2],...]" 表示每个关卡独立
  const levels = pages.map((_, i) => [i]);

  return {
    release: 'dev',
    classify: 'JLReviewSecond',
    JLReviewSecondLevel: JSON.stringify(levels),
    pages,
  };
}

export interface ExportStructureScene {
  name: string;
  scene: Record<string, unknown>;
  source: string;
}

export interface ExportRegressionArtifacts {
  viewDir: string;
  resources: Record<string, string>;
  scenes: ExportStructureScene[];
  config: Record<string, unknown>;
}

type ImageSizeMap = Map<string, { w: number; h: number }>;

function buildPreparedExportArtifacts(
  course: Course,
  resourceMap: Map<string, string>,
  imageSizes: ImageSizeMap,
): Omit<ExportRegressionArtifacts, 'resources'> {
  const viewDir = namespace(course.kind);

  if (isVideoOnlyCourse(course.kind)) {
    return {
      viewDir,
      scenes: [],
      config: buildReviewConfigJson(course),
    };
  }

  if (isFlatLesson(course.kind)) {
    const scenes: ExportStructureScene[] = [];
    for (let si = 0; si < course.stages.length; si++) {
      const page = course.stages[si].subPages[0];
      if (!page || page.frozen) continue;
      const name = `Game${si + 1}`;
      const { json, varAssignment } = buildScene(page, name, resourceMap, viewDir);
      scenes.push({
        name,
        scene: json,
        source: generateHomeworkSceneTs(name, page, resourceMap, varAssignment),
      });
    }
    return {
      viewDir,
      scenes,
      config: buildHomeworkConfigJson(course, resourceMap, imageSizes, course.kind),
    };
  }

  const scenes: ExportStructureScene[] = [];
  for (let si = 0; si < course.stages.length; si++) {
    const stage = course.stages[si];
    for (let sj = 0; sj < stage.subPages.length; sj++) {
      const page = stage.subPages[sj];
      if (page.frozen) continue;
      const name = `GameLT${si + 1}_${sj + 1}`;
      const { json, varAssignment } = buildScene(page, name, resourceMap, viewDir);
      scenes.push({
        name,
        scene: json,
        source: generateSceneTs(name, page, resourceMap, varAssignment, viewDir),
      });
    }
  }
  return {
    viewDir,
    scenes,
    config: buildConfigJson(course, resourceMap, imageSizes),
  };
}

/**
 * 生成可在 Node/CI 中直接断言的导出核心结构，不触发文本烘焙、Electron 写盘、网络或 SVN。
 * 真实写盘流程复用同一个 buildPreparedExportArtifacts，避免测试维护平行导出规则。
 */
export function buildExportRegressionArtifacts(
  course: Course,
  imageSizes: ImageSizeMap = new Map(),
): ExportRegressionArtifacts {
  const compiled = compileInternalPagesCourse(course);
  const resourceMap = collectResources(compiled, namespace(compiled.kind));
  return {
    resources: Object.fromEntries(resourceMap),
    ...buildPreparedExportArtifacts(compiled, resourceMap, imageSizes),
  };
}

// ─── 收集需要整目录拷贝的内置 game 文件夹 ───

/** 从 resourceMap 中提取 game.zip 内被实际引用的精确文件路径集合（去掉 game/ 前缀） */
export function collectGameZipFiles(resourceMap: Map<string, string>): Set<string> {
  const files = new Set<string>();
  for (const [from] of resourceMap) {
    let exportPath: string | undefined;
    if (lookupBuiltinByExportPath(from) !== undefined) {
      exportPath = from;
    } else if (from.startsWith('/builtin/')) {
      exportPath = lookupBuiltinBySrcPath(from)?.exportPath;
    }
    if (exportPath?.startsWith('game/')) {
      files.add(exportPath.slice('game/'.length));
    }
  }
  return files;
}

export function mapGameZipEntryToProjectPath(entryPath: string, viewDir: string): string {
  return builtinExportToProjectPath(`game/${entryPath}`, viewDir);
}

// ─── Zip 下载解压工具 ───

/** 从 vite 服务器下载 zip 并通过 IPC 写入本地磁盘 */
export async function extractZipFromServer(
  zipUrl: string,
  destRoot: string,
  eApi: typeof window.electronAPI,
  filter?: (entryPath: string) => boolean,
  pathMapper?: (entryPath: string) => string,
): Promise<void> {
  const response = await fetch(zipUrl);
  if (!response.ok) throw new Error(`下载资源包失败: ${zipUrl} (${response.status})`);
  const data = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(data);

  const entries: [string, JSZip.JSZipObject][] = [];
  const dirPaths: string[] = [];
  zip.forEach((rawPath, file) => {
    const entryPath = rawPath.replace(/\\/g, '/');
    if (file.dir || entryPath.endsWith('/') || entryPath.endsWith('\\')) {
      if (!filter || filter(entryPath)) dirPaths.push(entryPath);
      return;
    }
    if (!filter || filter(entryPath)) {
      entries.push([entryPath, file]);
    }
  });

  // 先创建所有目录（包括空目录），确保无文件的空目录也存在
  for (const dirPath of dirPaths) {
    const destRelPath = pathMapper ? pathMapper(dirPath) : dirPath;
    await eApi.ensureDir(`${destRoot}/${destRelPath}`);
  }

  for (const [entryPath, file] of entries) {
    const destRelPath = pathMapper ? pathMapper(entryPath) : entryPath;
    const destPath = `${destRoot}/${destRelPath}`;
    const b64 = await file.async('base64');
    await eApi.writeBinaryFile(destPath, b64);
  }
}

// ─── 主入口 ───

export async function exportProject(course: Course, options: { cleanBuildOutput?: boolean } = {}): Promise<void> {
  const dirPath = getCourseDirPath(course.id);
  if (!dirPath) throw new Error('未找到课件目录，请先保存课件');

  const confirmTargetIssues = collectCourseConfirmTargetIssues(course);
  if (confirmTargetIssues.length > 0) {
    const details = confirmTargetIssues.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
    const more = confirmTargetIssues.length > 8 ? `\n另有 ${confirmTargetIssues.length - 8} 项未显示` : '';
    throw new Error(`确定按钮判定目标尚未完成，不能预览或发布：\n\n${details}${more}`);
  }

  const inputRuleIssues = collectCourseInputRuleIssues(course);
  if (inputRuleIssues.length > 0) {
    const details = inputRuleIssues.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
    const more = inputRuleIssues.length > 8 ? `\n另有 ${inputRuleIssues.length - 8} 项未显示` : '';
    throw new Error(`填空题判定规则尚未完成，不能预览或发布：\n\n${details}${more}`);
  }

  const choiceAnswerIssues = collectCourseChoiceAnswerIssues(course);
  if (choiceAnswerIssues.length > 0) {
    const details = choiceAnswerIssues.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
    const more = choiceAnswerIssues.length > 8 ? `\n另有 ${choiceAnswerIssues.length - 8} 项未显示` : '';
    throw new Error(`选择题配置尚未完成，不能预览或发布：\n\n${details}${more}`);
  }

  const customAnswerKeyboardIssues = collectCourseCustomAnswerKeyboardIssues(course);
  if (customAnswerKeyboardIssues.length > 0) {
    const details = customAnswerKeyboardIssues.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
    const more = customAnswerKeyboardIssues.length > 8
      ? `\n另有 ${customAnswerKeyboardIssues.length - 8} 项未显示`
      : '';
    throw new Error(`自定义答案键盘配置尚未完成，不能预览或发布：\n\n${details}${more}`);
  }

  if (options.cleanBuildOutput) {
    const blockingIssues = collectInternalPageIssues(course).filter((issue) => issue.severity === 'blocking');
    if (blockingIssues.length > 0) {
      const details = blockingIssues.slice(0, 8).map((issue) => `• ${issue.message}`).join('\n');
      throw new Error(`内部页面关系尚未完成，不能发布：\n\n${details}`);
    }
  }

  const eApi = window.electronAPI;

  // 写入编辑器版本信息到课件根目录（所有 kind 共用一份，每次发布覆盖）
  // 详见 docs/versioning.md
  const versionTxt = [
    `编辑器版本: ${__APP_VERSION__}`,
    `发布时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    `课件ID: ${course.id}`,
    `课件类型: ${course.kind ?? 'normal'}`,
  ].join('\n');
  await eApi.writeTextFile(`${dirPath}/editor-version.txt`, versionTxt);

  const isFlat = isFlatLesson(course.kind);
  const isReview = isVideoOnlyCourse(course.kind);

  // 清理整个 project/{courseId}/ 目录，避免残留过期的子工程（如删除预习后 Game1_PREVIEW 还在）
  const projectParent = `${dirPath}/project/${course.id}`;
  await eApi.removeDir(projectParent);

  // 发布工程时同步清理 esBuild/ 目录（编译产物），避免与新工程不一致
  if (options.cleanBuildOutput) {
    await eApi.removeDir(`${dirPath}/esBuild`);
  }

  const baked = compileInternalPagesCourse(await bakeCourseAssets(course));
  const resourceMap = collectResources(baked, namespace(course.kind));

  // 补充 Spine 动画目录中的音频文件到 resourceMap
  await enrichAnimAudioResources(resourceMap, dirPath, namespace(course.kind));

  // 读取所有图片的真实像素尺寸，用于判断大小图
  const imageSizes = await collectImageSizes(resourceMap, baked.id);
  const artifacts = buildPreparedExportArtifacts(baked, resourceMap, imageSizes);

  if (isReview) {
    // ─── 复习课编辑器工程 ───
    const configJson = artifacts.config;
    const projectRoot = `${dirPath}/project/${course.id}/Game1_REVIEW`;

    const serverUrl = getApiBaseUrl();
    await eApi.removeDir(projectRoot);
    await extractZipFromServer(
      `${serverUrl}/builtin/layaProjectModel/Game1_REVIEW.zip`,
      projectRoot,
      eApi,
    );

    // 写入 config.json
    await eApi.writeTextFile(
      `${projectRoot}/laya/assets/config.json`,
      JSON.stringify(configJson, null, 2),
    );

    // 拷贝视频文件到 game_review/animation/
    for (let si = 0; si < baked.stages.length; si++) {
      const stage = baked.stages[si];
      const videoPage = stage.subPages.find(p => p.frozen);
      const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
      const videoUrl = String((videoEl?.props as Record<string, unknown>)?.videoUrl ?? '');

      if (videoUrl) {
        const srcPath = videoUrl.startsWith('/') ? videoUrl : `${dirPath}/${videoUrl}`;
        const destPath = `${projectRoot}/laya/assets/game_review/animation/video${si + 1}.mp4`;
        try {
          await eApi.copyLocalFile(srcPath, destPath);
        } catch (e) {
          console.warn(`复制视频文件失败: ${srcPath} -> ${destPath}`, e);
        }
      }
    }

    return;
  } else if (isFlat) {
    // ─── 作业/专题测评编辑器工程 ───
    const scenes = artifacts.scenes;
    const configJson = artifacts.config;
    const projectRoot = `${dirPath}/project/${course.id}/Game1_HW`;

    const serverUrl = getApiBaseUrl();
    await eApi.removeDir(projectRoot);
    await extractZipFromServer(
      `${serverUrl}/builtin/layaProjectModel/Game1_HW.zip`,
      projectRoot,
      eApi,
    );

    for (const { name, scene, source } of scenes) {
      await eApi.writeTextFile(
        `${projectRoot}/laya/pages/game_hw/${name}.scene`,
        JSON.stringify(scene, null, 2),
      );
      await eApi.writeTextFile(
        `${projectRoot}/src/view/game_hw/${name}.ts`,
        source,
      );
    }

    await eApi.writeTextFile(`${projectRoot}/laya/assets/config.json`, JSON.stringify(configJson, null, 2));
    await eApi.writeTextFile(`${projectRoot}/laya/assets/version.json`, '{}');

    const hwGameZipFiles = collectGameZipFiles(resourceMap);
    // 按需追加内置音效
    for (const stage of baked.stages) {
      for (const sp of stage.subPages) {
        for (const el of sp.elements) {
          if (!el.actions?.length) continue;
          for (const action of el.actions) {
            if (action.event === 'onClickSound') hwGameZipFiles.add('sound/btn_click.wav');
            if (action.actionType === 'playRightSound') hwGameZipFiles.add('sound/right.mp3');
            if (action.actionType === 'playWrongSound') hwGameZipFiles.add('sound/wrong.mp3');
            if (action.event === 'onClickInitConfirm' || action.event === 'onClickInitConfirmWithLock') {
              const targetEl = action.targetId ? sp.elements.find(e => e.id === action.targetId) : null;
              if (targetEl && targetEl.layaType === 'ChoiceBox') {
                hwGameZipFiles.add('sound/right.mp3');
                hwGameZipFiles.add('sound/wrong.mp3');
              }
            }
          }
        }
      }
    }
    await extractZipFromServer(
      `${serverUrl}/builtin/runtime/game.zip`,
      `${projectRoot}/laya/assets`,
      eApi,
      (entryPath) => hwGameZipFiles.has(entryPath),
      (entryPath) => {
        const topDir = entryPath.split('/')[0];
        if (topDir === 'sound') {
          return `game_hw/sound/${entryPath.slice(topDir.length + 1)}`;
        }
        const destDirName = topDir === 'image' ? 'img' : topDir;
        return `game_hw/image/${destDirName}/${entryPath.slice(topDir.length + 1)}`;
      },
    );

    for (const [from, to] of resourceMap) {
      const src = String(from);
      const dest = String(to);
      if (lookupBuiltinByExportPath(src) !== undefined || src.startsWith('/builtin/')) continue;
      const destPath = `${projectRoot}/laya/assets/${dest}`;
      if (src.startsWith('data:image')) {
        const base64 = src.split(',')[1];
        if (base64) await eApi.writeBinaryFile(destPath, base64);
      } else if (src.startsWith('images/')) {
        if (isLocalVideoPath(src) || isLocalSkPath(src) || isLocalSoundPath(src) || isLocalAnimAudioPath(src)) {
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
  } else {

  // 每个 stage 的每个 subPage 生成一个 scene + 一个 ts（视频关卡跳过）
  const scenes = artifacts.scenes;
  const configJson = artifacts.config;

  // 问题1：路径改为 project/<courseId>/Game1_LT（去掉重复 courseId）
  const projectRoot = `${dirPath}/project/${course.id}/Game1_LT`;

  // 清空旧目录，从 vite 服务器下载模板 zip 并解压
  const serverUrl = getApiBaseUrl();
  await eApi.removeDir(projectRoot);
  await extractZipFromServer(
    `${serverUrl}/builtin/layaProjectModel/Game1_LT.zip`,
    projectRoot,
    eApi,
  );

  // 写 .scene 文件 + 对应的 ts 文件
  for (const { name, scene, source } of scenes) {
    await eApi.writeTextFile(
      `${projectRoot}/laya/pages/game_lt/${name}.scene`,
      JSON.stringify(scene, null, 2),
    );
    await eApi.writeTextFile(
      `${projectRoot}/src/view/game_lt/${name}.ts`,
      source,
    );
  }

  // 写 config.json + version.json
  await eApi.writeTextFile(`${projectRoot}/laya/assets/config.json`, JSON.stringify(configJson, null, 2));
  await eApi.writeTextFile(`${projectRoot}/laya/assets/version.json`, '{}');

  // 内置 game 资源：从 vite 服务器下载 game.zip，按文件精确匹配解压（只解压被 resourceMap 引用的文件）
  // game/inputImg → game_lt/image/inputImg
  // game/jpL11 → game_lt/image/jpL11
  // game/image → game_lt/image/img（image 目录下的散图放 img）
  // game/sound → game_lt/sound（内置音效按需解压）
  const gameZipFiles = collectGameZipFiles(resourceMap);
  // 按需追加内置音效
  for (const stage of baked.stages) {
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
  await extractZipFromServer(
    `${serverUrl}/builtin/runtime/game.zip`,
    `${projectRoot}/laya/assets`,
    eApi,
    (entryPath) => gameZipFiles.has(entryPath),
    (entryPath) => mapGameZipEntryToProjectPath(entryPath, 'game_lt'),
  );

  // 复制用户上传资源（images/xxx → game_lt/image/img/xxx）和 base64 图片
  for (const [from, to] of resourceMap) {
    const src = String(from);
    const dest = String(to);
    // 内置资源已通过整目录拷贝处理，跳过
    if (lookupBuiltinByExportPath(src) !== undefined || src.startsWith('/builtin/')) continue;

    const destPath = `${projectRoot}/laya/assets/${dest}`;
    if (src.startsWith('data:image')) {
      const base64 = src.split(',')[1];
      if (base64) await eApi.writeBinaryFile(destPath, base64);
    } else if (src.startsWith('images/')) {
      // 视频/音频文件走磁盘拷贝（太大不适合 base64）
      if (isLocalVideoPath(src) || isLocalSkPath(src) || isLocalSoundPath(src)) {
        await eApi.copyLocalFile(`${dirPath}/${src}`, destPath);
      } else {
        // 图片文件读成 dataUrl 写入
        const dataUrl = await eApi.readFileAsDataUrl(dirPath, src);
        if (dataUrl) {
          const b64 = dataUrl.split(',')[1];
          if (b64) await eApi.writeBinaryFile(destPath, b64);
        }
      }
    }
  }

  // ─── 生成预习编辑器工程（如果 previewStages > 0）───
  if (!isFlat && (course.previewStages?.length ?? 0) > 0) {
    const { exportPreviewProject } = await import('./exportPreviewProject');
    await exportPreviewProject(baked);
  }
  } // end of else (normal mode)

}
