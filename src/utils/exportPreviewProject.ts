import type { Action, Course, SubPage, Element } from '../types';
import { elementMeta, type ExportChild } from '../elements/elementMeta';
import { getKeyboardPreset } from '../elements/keyboardPresets';
import { lookupBuiltinByExportPath, lookupBuiltinBySrcPath } from '../elements/builtinAssets';
import { getCourseDirPath } from './electronFs';
import JSZip from 'jszip';
import { getApiBaseUrl } from './apiConfig';
import { collectImageSizes, isLargeImage } from './imageSize';
import { buildInternalPageActionBindings, buildInternalPageRuntime, internalPageActionBody } from './internalPageCompiler';

// ─── 资源路径映射（预习工程，使用 game_preview 前缀）───

const RESOURCE_EXTS: Record<string, string> = {
  '.png': 'game_preview/image', '.jpg': 'game_preview/image', '.jpeg': 'game_preview/image', '.gif': 'game_preview/image',
  '.wav': 'game_preview/sound', '.mp3': 'game_preview/sound',
  '.mp4': 'game_preview/animation', '.sk': 'game_preview/animation',
};

function getExt(url: string): string {
  const idx = url.lastIndexOf('.');
  return idx >= 0 ? url.slice(idx).toLowerCase() : '';
}

function isUploadPath(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('/uploads/') || (v.startsWith('images/') && !v.startsWith('images/animation/') && !v.startsWith('images/sound/')));
}

function isLocalVideoPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.(mp4|webm|mov)$/i.test(v);
}

function isLocalSkPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.sk$/i.test(v);
}

function isLocalSoundPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/sound/') && /\.(wav|mp3)$/i.test(v);
}

function isBuiltinResourcePath(v: unknown): v is string {
  return typeof v === 'string' && lookupBuiltinByExportPath(v) !== undefined;
}

/** game/xxx/file.png → game_preview/image/xxx/file.png，game/image/file.png → game_preview/image/img/file.png，game/sound/file → game_preview/sound/file */
function builtinExportToPreviewPath(exportPath: string): string {
  const parts = exportPath.split('/');
  if (parts.length >= 3 && parts[0] === 'game') {
    const dir = parts[1];
    const rest = parts.slice(2).join('/');
    if (dir === 'sound') {
      return `game_preview/sound/${rest}`;
    }
    const targetDir = dir === 'image' ? 'img' : dir;
    return `game_preview/image/${targetDir}/${rest}`;
  }
  return exportPath;
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mov'];

function collectPreviewResources(course: Course): Map<string, string> {
  const map = new Map<string, string>();
  let skinCounter = 0;

  const collectValue = (value: unknown) => {
    if (isUploadPath(value)) {
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      const ext = getExt(filename);
      const dir = RESOURCE_EXTS[ext] ?? 'game_preview/image';
      const isVideo = VIDEO_EXTS.includes(ext);
      const targetPath = isVideo ? `${dir}/${filename}` : `${dir}/img/${filename}`;
      map.set(value, targetPath);
    } else if (isLocalVideoPath(value)) {
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      map.set(value, `game_preview/animation/${filename}`);
    } else if (isLocalSkPath(value)) {
      // images/animation/ani1/game.sk → game_preview/animation/ani1/game.sk（保留子目录）
      if (map.has(value)) return;
      const relPath = (value as string).slice('images/animation/'.length);
      map.set(value, `game_preview/animation/${relPath}`);
      // 同目录 .png 纹理
      const pngPath = (value as string).replace(/\.sk$/i, '.png');
      if (!map.has(pngPath)) {
        const pngRelPath = relPath.replace(/\.sk$/i, '.png');
        map.set(pngPath, `game_preview/animation/${pngRelPath}`);
      }
    } else if (isLocalSoundPath(value)) {
      if (map.has(value)) return;
      const filename = (value as string).split('/').pop() ?? 'unknown';
      map.set(value, `game_preview/sound/${filename}`);
    } else if (typeof value === 'string' && value.startsWith('data:image')) {
      if (map.has(value)) return;
      const ext = value.includes('image/png') ? '.png' : '.jpg';
      map.set(value, `game_preview/image/img/skin_${skinCounter++}${ext}`);
    } else if (isBuiltinResourcePath(value)) {
      if (!map.has(value)) map.set(value, builtinExportToPreviewPath(value as string));
    } else if (typeof value === 'string' && value.startsWith('/builtin/')) {
      if (map.has(value)) return;
      const asset = lookupBuiltinBySrcPath(value);
      if (asset?.exportPath) map.set(value, builtinExportToPreviewPath(asset.exportPath));
    }
  };

  const scanFixed = (children: ExportChild[] | undefined) => {
    if (!children) return;
    for (const c of children) {
      if (c.props) for (const v of Object.values(c.props)) collectValue(v);
      if (c.child) scanFixed(c.child);
    }
  };

  const previewStages = course.previewStages ?? [];
  for (const stage of previewStages) {
    for (const page of stage.subPages) {
      for (const el of page.elements) {
        const meta = elementMeta[el.type];
        const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) };
        for (const v of Object.values(merged)) collectValue(v);
        // playSound / stopSound 动作中的音频路径也需要收集
        if (el.actions) {
          for (const action of el.actions) {
            if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
              collectValue(action.value);
            }
          }
        }
        scanFixed(meta?.exportChildren);
        const presetId = (el.props as { _keyboardPreset?: { id?: string } } | undefined)?._keyboardPreset?.id;
        const presetChildren = presetId ? getKeyboardPreset(presetId)?.children : undefined;
        scanFixed(presetChildren);
        // PageTurnBox 不携带额外资源，同 group ContainerBox 的资源由主循环收集
      }
    }
  }
  return map;
}

// ─── 路径重写 ───

function rewriteProps(props: Record<string, unknown>, resourceMap: Map<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'runtime') continue;
    if (isUploadPath(value) || isLocalVideoPath(value) || isLocalSkPath(value) || isLocalSoundPath(value) || (typeof value === 'string' && value.startsWith('data:image')) || (typeof value === 'string' && value.startsWith('/builtin/'))) {
      result[key] = resourceMap.get(value) ?? value;
    } else if (isBuiltinResourcePath(value)) {
      result[key] = resourceMap.get(value) ?? builtinExportToPreviewPath(value as string);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── .scene 节点构建 ───

let _compId = 0;
function nextId() { return ++_compId; }

/** 收集需要在 .ts 中通过 this.xxx 引用的元素 ID（预览导出版） */
function collectElementsNeedingVar(page: SubPage): Set<string> {
  const needsVar = new Set<string>();
  const elements = page.elements;

  for (const el of elements) {
    if (typeof el.props?.__internalPageRootVar === 'string') needsVar.add(el.id);
    if (el.actions && el.actions.length > 0) {
      needsVar.add(el.id);
      for (const action of el.actions) {
        if (action.targetId) needsVar.add(action.targetId);
      }
    }
  }

  for (const el of elements) {
    const meta = elementMeta[el.type];
    const wrapperVar = (meta?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    if (wrapperVar === '_klInputBox') needsVar.add(el.id);
    if (el.type === 'DragViewBox') needsVar.add(el.id);
    if (el.type === 'NewBrushSprite' || el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn') {
      needsVar.add(el.id);
    }
  }

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

  for (const el of elements) {
    if (!el.actions?.some(a => a.event === 'onAutoClick')) continue;
    if (!el.parentId) continue;
    const parent = elements.find(e => e.id === el.parentId);
    if (parent && parent.layaType === 'ChoiceBox') needsVar.add(parent.id);
  }

  return needsVar;
}

function buildVarAssignment(page: SubPage, needsVarSet: Set<string>): Map<string, string> {
  const assignment = new Map<string, string>();
  const used = new Set<string>();
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
  const merged = { ...(meta?.defaultProps ?? {}), ...rawProps };
  const rewritten = rewriteProps(merged, resourceMap);

  const props: Record<string, unknown> = { x: element.x, y: element.y, width: element.width, height: element.height };
  // DragObj/DropObj：sdk_baiya 运行时构造函数强制 anchorX=0.5, anchorY=0.5（中心锚点）
  // 编辑器 element.x/y 是左上角；Laya runtime sprite.x/y 是中心点。
  // 补偿：exported.x = element.x + width/2，让 Laya 可见左上角 = element.x，与编辑器一致。
  if (element.type === 'DragObj' || element.type === 'DropObj') {
    props.x = element.x + element.width / 2;
    props.y = element.y + element.height / 2;
  }
  if (element.name) props.name = element.name;
  if (element.opacity !== 1) props.alpha = element.opacity;
  if (element.rotation !== 0) props.rotation = element.rotation;
  for (const [k, v] of Object.entries(rewritten)) {
    if (k.startsWith('_')) continue;
    if (k === 'runtime') continue;
    if (k === 'hidden') continue;
    if (k === 'blockThrough') continue;
    if (v !== undefined && v !== null && v !== '') props[k] = v;
  }
  // var 按需导出：只有在 .ts 中需要 this.xxx 引用的元素才写 var
  const assignedVar = varAssignment?.get(element.id);
  const hasInheritVarChild = !!meta?.exportChildren?.some(c => c.inheritVar);
  if (assignedVar && !hasInheritVarChild) {
    props.var = assignedVar;
  } else {
    delete props.var;
  }
  if (hasInheritVarChild) {
    delete props.name;
  }
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
  // hidden=true → visible=false
  if (rewritten.hidden === true) props.visible = false;
  // blockThrough=true → mouseEnabled=true, mouseThrough=false
  if (rewritten.blockThrough === true) {
    props.mouseEnabled = true;
    props.mouseThrough = false;
  }
  if (element.layaType === 'SoundButton') {
    if ('isNeedAni' in props) props.isNeedAni = String(props.isNeedAni);
    if ('showInStu' in props) props.showInStu = String(props.showInStu);
  }
  // Spine：.scene 中 isLoop/stopAt 始终写死，循环行为由动作控制
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
  // SelectableObj：将编辑器专用皮肤属性转换为子 Image 节点
  const selectableObjChildren: Record<string, unknown>[] = [];
  if (element.layaType === 'SelectableObj') {
    const fgSkin = rewritten._foregroundSkin;
    if (typeof fgSkin === 'string' && fgSkin !== '') {
      const fgId = nextId();
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image', label: 'Image',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: fgId, nodeParent: id,
        props: { skin: fgSkin, left: 0, top: 0, right: 0, bottom: 0 },
        child: [],
      });
    }
    // 选中态 / 错误态：图片原始尺寸居中显示（anchor 0.5 + 父中心坐标，不指定 width/height）
    const bgSkin = rewritten._bgSkin;
    if (typeof bgSkin === 'string' && bgSkin !== '') {
      const bgId = nextId();
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,bg', label: 'bg',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: bgId, nodeParent: id,
        props: {
          name: 'bg', skin: bgSkin,
          anchorX: 0.5, anchorY: 0.5,
          x: element.width / 2, y: element.height / 2,
        },
        child: [],
      });
    }
    const wrongSkin = rewritten._wrongSkin;
    if (typeof wrongSkin === 'string' && wrongSkin !== '') {
      const wrongId = nextId();
      selectableObjChildren.push({
        x: 15, type: 'Image', searchKey: 'Image,wrong', label: 'wrong',
        isDirectory: false, isAniNode: true, hasChild: false,
        compId: wrongId, nodeParent: id,
        props: {
          name: 'wrong', skin: wrongSkin, visible: false,
          anchorX: 0.5, anchorY: 0.5,
          x: element.width / 2, y: element.height / 2,
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
      props: { skin: skinVal, anchorX: 0.5, anchorY: 0.5, x: element.width / 2, y: element.height / 2 },
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
  const presetId = (element.props as { _keyboardPreset?: { id?: string } } | undefined)?._keyboardPreset?.id;
  const presetChildren = presetId ? getKeyboardPreset(presetId)?.children : undefined;
  const fixedSource: ExportChild[] = presetChildren ?? meta?.exportChildren ?? [];

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

  for (const k of propsToStrip) {
    delete props[k];
  }
  const userChildren = directChildren.map(c => buildSceneNode(c, allElements, resourceMap, id, varAssignment));
  const child = [...selectableObjChildren, ...dragSkinChildren, ...fixedChildren, ...userChildren];

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

function getWrapper(el: Element) {
  return elementMeta[el.type]?.exportWrapper;
}

function shouldWrap(_el: Element, _w: NonNullable<ReturnType<typeof getWrapper>>) {
  return true;
}

interface SceneFlags {
  hasBtnConfirm: boolean;
  hasKlInputBox: boolean;
}

function detectSceneFlags(page: SubPage): SceneFlags {
  const hasBtnConfirm = false;
  let hasKlInputBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const wrapperVar = (meta?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    if (wrapperVar === '_klInputBox') hasKlInputBox = true;
  }
  return { hasBtnConfirm, hasKlInputBox };
}

function buildTopLevelSceneChildren(
  page: SubPage,
  resourceMap: Map<string, string>,
  parentId: number,
): { children: Record<string, unknown>[]; flags: SceneFlags; varAssignment: Map<string, string> } {
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

  return { children: out, flags: detectSceneFlags(page), varAssignment };
}

function buildPreviewScene(page: SubPage, sceneName: string, resourceMap: Map<string, string>): { json: Record<string, unknown>; flags: SceneFlags; varAssignment: Map<string, string> } {
  _compId = 1;
  const rootId = nextId();
  const { children: child, flags, varAssignment } = buildTopLevelSceneChildren(page, resourceMap, rootId);
  return {
    json: {
      x: 0, type: 'KlView', selectedBox: rootId, selecteID: rootId,
      searchKey: 'KlView',
      props: { width: 1920, height: 1080, sceneColor: '#000000', runtime: `view/game_preview/${sceneName}.ts` },
      nodeParent: -1, maxID: _compId, label: 'KlView',
      isOpen: true, isDirectory: true, isAniNode: true, hasChild: child.length > 0,
      compId: rootId, child,
      animations: [{ nodes: [], name: 'ani1', id: 1, frameRate: 24, action: 0 }],
    },
    flags,
    varAssignment,
  };
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
    if (action.actionType === 'animate') return `var t = ${targetRef}; if (t && t.play) t.play(${JSON.stringify(action.value ?? 'shan')});`;
    return '';
  };
  const internalRuntime = buildInternalPageRuntime(page, getVar, buildActionBody);
  initCode += buildInternalPageActionBindings(page, getVar, buildActionBody, 'game_preview');
  // onClickInitConfirm / onClickInitConfirmWithLock 事件：在 initView 注入 GameUtils.initConfirm
  for (const el of page.elements) {
    if (!el.actions?.length) continue;
    for (const action of el.actions) {
      if (action.event !== 'onClickInitConfirm' && action.event !== 'onClickInitConfirmWithLock') continue;
      const targetEl = action.targetId ? page.elements.find(e => e.id === action.targetId) : null;
      if (!targetEl || targetEl.type !== 'KlInputBox') continue;
      const btnVar = getVar(el);
      const inputBoxVar = getVar(targetEl);
      const lockArg = action.event === 'onClickInitConfirmWithLock' ? ', null, this._lockBox' : '';
      initCode += `        GameUtils.initConfirm(this, this.${btnVar}, this.${inputBoxVar}${lockArg});\n`;
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

  return `import { ui } from "../../ui/layaMaxUI";

import Event = Laya.Event;
import Image = Laya.Image;
import KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
import KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
import KlKey = com.klzz.ui.custom.KeyBoard.KlKey;
import KlBaseKeyboard = com.klzz.ui.custom.KeyBoard.KlBaseKeyboard;
import SelectableObj = com.klzz.ui.custom.SelectableObj;
import { GameUtils } from "./GameUtils";

export default class ${sceneName} extends ui.game_preview.${sceneName}UI {

    public initView(byReset: boolean) {
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
          const parts = mapped.split('/');
          if (parts.length >= 3) imageDirs.add(parts[2]);
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
                const parts = mapped.split('/');
                if (parts.length >= 3) imageDirs.add(parts[2]);
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
                  const parts = mapped.split('/');
                  if (parts.length >= 3) imageDirs.add(parts[2]);
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

// ─── 收集需要从 game.zip 解压的精确文件路径（去掉 game/ 前缀） ───

function collectGameZipFiles(resourceMap: Map<string, string>): Set<string> {
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

// ─── Zip 下载解压工具 ───

async function extractZipFromServer(
  zipUrl: string,
  destRoot: string,
  eApi: NonNullable<typeof window.electronAPI>,
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

  const resourceMap = collectPreviewResources(course);

  // 读取所有图片的真实像素尺寸，用于判断大小图
  const imageSizes = await collectImageSizes(resourceMap, course.id);

  // 每个 previewStage 生成一个 scene + 一个 ts（视频关卡跳过）
  // 预习关卡每个 stage 只有一个 subPage，因此场景命名为 Game{i}
  const scenes: { name: string; json: Record<string, unknown>; flags: SceneFlags; page: SubPage; varAssignment: Map<string, string> }[] = [];
  for (let si = 0; si < previewStages.length; si++) {
    const stage = previewStages[si];
    const videoPage = stage.subPages.find(p => p.frozen);
    const videoEl = videoPage?.elements.find(e => e.locked && e.type === 'Video');
    if (videoEl) continue; // 视频关卡不生成 .scene
    const page = stage.subPages[0];
    if (!page || page.frozen) continue;
    const sceneName = `Game${si + 1}`;
    const { json, flags, varAssignment } = buildPreviewScene(page, sceneName, resourceMap);
    scenes.push({ name: sceneName, json, flags, page, varAssignment });
  }

  const configJson = buildPreviewConfigJson(course, resourceMap, imageSizes);
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

  for (const { name, json, flags, page, varAssignment } of scenes) {
    await eApi.writeTextFile(
      `${projectRoot}/laya/pages/game_preview/${name}.scene`,
      JSON.stringify(json, null, 2),
    );
    const tsContent = generatePreviewSceneTs(name, flags, page, varAssignment, resourceMap);
    await eApi.writeTextFile(
      `${projectRoot}/src/view/game_preview/${name}.ts`,
      tsContent,
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
    (entryPath) => {
      const topDir = entryPath.split('/')[0];
      if (topDir === 'sound') {
        return `game_preview/sound/${entryPath.slice(topDir.length + 1)}`;
      }
      const destDirName = topDir === 'image' ? 'img' : topDir;
      return `game_preview/image/${destDirName}/${entryPath.slice(topDir.length + 1)}`;
    },
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
