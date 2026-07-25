import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Element, SubPage, Stage, Course, InternalPage, InternalPageKind, DialogSettings, EditorLayerGroup } from '../types';
import {
  type CustomTemplate,
  type ImportResult,
  listTemplates,
  saveTemplate,
  removeTemplate,
  renameTemplate,
  applyTemplate,
  getTemplateDir,
  setTemplateDir,
  importTemplatesFromDir,
  pinTemplate,
} from '../utils/customTemplateFs';
import { getCourseDirPath } from '../utils/electronFs';
import type { CourseKind } from '../utils/courseKind';
import { PRESET_TEMPLATES } from '../presets';
import { getUniqueElementName, normalizeElementNames, createDefaultElement, elementMeta, rebuildSubPageCounters, getNextNumberedName, getNextItemNameForCenterMatch } from '../elements/elementMeta';
import { getObject, removeObject, createLayaComponent, registerObject } from '../utils/layaBridge';
import { getElementParentContainment, getFitContainerToChildrenUpdates } from '../utils/canvasGeometry';
import { isContainerElementType } from '../utils/elementContainers';
import { getLayerDisplayName, getNextLayerCopyName, withLayerLabel } from '../utils/layerPresentation';
import { isElementLocked } from '../utils/layerState';
import { canAssignElementsToGroup, canNestGroup, getEditorLayerGroups, resolveEditorLayerGroups } from '../utils/layerGroups';
import {
  cloneInternalPageWithinSubPage,
  cloneSubPageWithNewIds,
  createInternalPagesSubPage,
  findActiveElementPage,
  getElementPage,
  getInternalPageGroups,
  isInternalPagesSubPage,
  INTERNAL_PAGES_MIN_VERSION,
  INTERNAL_PAGES_TEMPLATE_ID,
  resolveMovedPageName,
  validInternalPageGroupId,
} from '../utils/internalPages';
import { remapInputRelationRefs } from '../utils/inputAnswerRules';
import {
  isChoiceOption,
  remapChoiceAnswerRefs,
  removeChoiceAnswerRefs,
  setChoiceCorrectOptionIds as applyChoiceCorrectOptionIds,
} from '../utils/choiceAnswerRules';
import { assetExport } from '../elements/builtinAssets';

type InternalPagePlacement = { pageGroupId?: string; afterPageId?: string };

export type { Element, SubPage, Stage, Course };
// Backwards alias: many call sites still import `Page`
export type { SubPage as Page } from '../types';

export interface ElementPasteResult {
  allIds: string[];
  selectedIds: string[];
  idMap: Record<string, string>;
  elements: Element[];
}

export interface ContainerGeometryActionResult {
  ok: boolean;
  error?: string;
}

async function loadImageSize(skin: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (!skin) { resolve(null); return; }
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = skin;
  });
}

interface EditorState {
  currentCourse: Course | null;
  currentStageId: string | null;
  currentSubPageId: string | null;
  currentInternalPageId: string | null;
  focusSubPageId: string | null;
  selectedElementIds: string[];
  selectedEditorLayerGroupId: string | null;
  selectedStageTarget?: 'preview' | 'normal';
  clipboard: Element[];
  clipboardEditorLayerGroups: EditorLayerGroup[];
  history: Course[];
  historyIndex: number;
  pageThumbnails: Record<string, string>;
  customTemplates: CustomTemplate[];
  /** 鑷畾涔夋ā鏉挎牴鐩綍锛坙ocalStorage 鎸佷箙鍖栵級锛屾湭璁剧疆鏃剁偣閫夎嚜瀹氫箟妯℃澘 tab 浼氬紩瀵奸€夋嫨 */
  customTemplateDir: string | null;

  // Actions
  setCurrentCourse: (course: Course) => void;
  setCurrentSubPage: (stageId: string, subPageId: string) => void;
  enterFocusWorkspace: (stageId: string, subPageId: string) => void;
  exitFocusWorkspace: () => void;
  setCurrentInternalPage: (pageId: string) => void;
  addInternalPage: (kind: InternalPageKind, name: string, placement?: InternalPagePlacement) => string | null;
  renameInternalPage: (pageId: string, name: string) => boolean;
  duplicateInternalPage: (pageId: string) => void;
  deleteInternalPage: (pageId: string) => void;
  addInternalPageGroup: (name: string) => string | null;
  renameInternalPageGroup: (groupId: string, name: string) => boolean;
  deleteInternalPageGroup: (groupId: string, deletePages?: boolean) => void;
  reorderInternalPageGroups: (fromIndex: number, toIndex: number) => void;
  moveInternalPageInList: (pageId: string, pageGroupId: string | undefined, targetIndex: number) => boolean;
  moveInternalPage: (pageId: string, targetSubPageId: string, targetIndex: number) => { ok: boolean; error?: string };
  updateDialogSettings: (pageId: string, updates: Partial<DialogSettings>) => void;
  setNoEntryDeferred: (pageId: string, deferred: boolean) => void;
  toggleStageShrink: (stageId: string) => void;
  setPageThumbnail: (subPageId: string, dataUrl: string) => void;

  addStage: () => void;
  addVideoStage: () => void;  // 复习课专用：添加视频关卡
  addStageFromSubPage: (sourceSubPageId: string) => void;
  addStageFromTemplate: (templateId: string) => Promise<void>;
  addStageFromPreset: (presetId: string) => void;
  deleteStage: (stageId: string) => void;
  clearAllStages: () => void;
  reorderStages: (fromIndex: number, toIndex: number) => void;

  addPreviewStage: () => void;
  addPreviewStageFromPreset: (presetId: string) => void;
  addPreviewStageFromSubPage: (sourceSubPageId: string) => void;
  addPreviewStageFromTemplate: (templateId: string) => Promise<void>;
  deletePreviewStage: (stageId: string) => void;
  reorderPreviewStages: (fromIndex: number, toIndex: number) => void;
  renamePreviewStage: (stageId: string, name: string) => void;
  togglePreviewShrinked: () => void;
  toggleNormalShrinked: () => void;
  setFeedback: (value: 'spirit' | 'newLD') => void;

  addSubPage: (stageId: string) => void;
  addSubPageFromSubPage: (stageId: string, sourceSubPageId: string) => void;
  addSubPageFromTemplate: (stageId: string, templateId: string) => Promise<void>;
  addSubPageFromPreset: (stageId: string, presetId: string) => void;
  deleteSubPage: (stageId: string, subPageId: string) => void;
  duplicateSubPage: (stageId: string, subPageId: string) => void;
  reorderSubPages: (stageId: string, fromIndex: number, toIndex: number) => void;
  renameSubPage: (subPageId: string, name: string) => void;
  renameStage: (stageId: string, name: string) => void;

  addElement: (element: Element, saveToHistory?: boolean) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  setElementEditorHidden: (id: string, hidden: boolean) => void;
  setElementsEditorHidden: (ids: string[], hidden: boolean) => void;
  setElementLocked: (id: string, locked: boolean) => void;
  setElementsLocked: (ids: string[], locked: boolean) => void;
  addEditorLayerGroup: (name: string, elementIds?: string[]) => string | null;
  renameEditorLayerGroup: (groupId: string, name: string) => boolean;
  deleteEditorLayerGroup: (groupId: string, deleteContents?: boolean) => void;
  setEditorLayerGroupMembers: (groupId: string | undefined, elementIds: string[], saveToHistory?: boolean) => boolean;
  setEditorLayerGroupParent: (groupId: string, parentGroupId: string | undefined) => boolean;
  reorderEditorLayerGroup: (fromIndex: number, toIndex: number) => void;
  moveElementIntoParent: (id: string) => ContainerGeometryActionResult;
  fitContainerToChildren: (id: string) => ContainerGeometryActionResult;
  deleteElement: (id: string) => void;
  reorderElement: (id: string, newIndex: number, saveToHistory?: boolean) => void;
  moveElementLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  setElementParent: (id: string, newParentId: string | undefined, saveToHistory?: boolean) => void;
  selectElement: (id: string, multi?: boolean) => void;
  selectElements: (ids: string[]) => void;
  selectEditorLayerGroup: (groupId: string | null) => void;
  selectAll: () => void;
  clearSelection: () => void;
  copyElements: () => void;
  pasteElements: (saveToHistory?: boolean) => ElementPasteResult | null;
  duplicateElements: () => ElementPasteResult | null;
  duplicateElementsForDrag: (sourceIds: string[]) => ElementPasteResult | null;
  updateElementsWithoutHistory: (updates: Array<Pick<Element, 'id' | 'x' | 'y' | 'width' | 'height' | 'rotation'>>) => void;
  removeElementsWithoutHistory: (ids: string[]) => void;
  alignElements: (direction: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distributeH' | 'distributeV') => void;
  groupElements: () => void;
  ungroupElements: () => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  saveAsCustomTemplate: (subPageId: string) => Promise<{ ok: true; template: CustomTemplate } | { ok: false; error: string }>;
  removeCustomTemplateAction: (templateId: string) => Promise<void>;
  renameCustomTemplate: (templateId: string, newName: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loadCustomTemplates: () => Promise<void>;
  setCustomTemplateDir: (dir: string | null) => Promise<void>;
  importCustomTemplates: (sourceDir: string) => Promise<ImportResult>;
  pinCustomTemplate: (templateId: string) => Promise<void>;

  switchPageTurnPage: (elementId: string, newIndex: number) => void;
  addPageTurnPage: (elementId: string) => void;
  removePageTurnPage: (elementId: string, pageIndex: number) => void;
  changePageTurnButtonType: (elementId: string, newType: 'arrows' | 'tabs' | 'both') => void;
  movePageTurnButtons: (elementId: string, position: 'top' | 'bottom') => void;

  addChoiceOption: (choiceBoxId: string) => void;
  removeChoiceOption: (choiceBoxId: string) => void;
  setChoiceCorrectOptionIds: (choiceBoxId: string, optionIds: string[]) => void;

  addFillBlankInput: (klInputBoxId: string) => void;
  removeFillBlankInput: (klInputBoxId: string) => void;

  /** 杩炵嚎棰橈細娣诲姞涓€瀵硅繛绾块」锛堝乏 camp1 + 鍙?camp2锛?*/
  addMatchingPair: (matchingGameId: string) => void;
  /** 杩炵嚎棰橈細鍒犻櫎鏈€鍚庝竴瀵硅繛绾块」 */
  removeMatchingPair: (matchingGameId: string) => void;

  addDropObj: (dragViewBoxId: string) => void;
  removeDropObj: (dragViewBoxId: string) => void;
  addDragObj: (dragViewBoxId: string) => void;
  removeDragObj: (dragViewBoxId: string) => void;
  setProxySkin: (parentId: string, skinValue: string) => void;
  alignDragChildren: (containerId: string, childType: string, action: 'alignH' | 'alignV' | 'spaceH' | 'spaceV', spacing?: number) => void;
  alignMatchingItems: (matchingGameId: string, camp: 'camp1' | 'camp2', action: 'alignH' | 'alignV' | 'spaceH' | 'spaceV', spacing?: number) => void;
  alignDropObjToSkin: (elementId: string, propKey: 'skin' | 'tipSkin') => void;
}

/** 鍦?course 涓婃牴鎹?subPageId 鎵惧埌 SubPage锛堝悓鏃堕亶鍘?stages 鍜?previewStages锛夛紝鎵句笉鍒拌繑鍥?null銆?
 *  瀹炵幇浣嶄簬 utils/findSubPage.ts锛堥伩鍏?selection.ts 鈫?editorStore.ts 寰幆 import锛夈€?
 *  re-export 璁?store 鍐呴儴鍜岀粍浠堕兘鑳戒粠鍚屼竴澶勭敤銆?*/
import { findSubPage } from '../utils/findSubPage';
export { findSubPage };

/** 鍦?state 涓婃牴鎹綋鍓?currentSubPageId 鎵惧埌 SubPage锛坢utable 寮曠敤锛夛紝鎵句笉鍒拌繑鍥?null */
function findCurrentSubPage(state: EditorState): SubPage | InternalPage | null {
  const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
  if (!subPage) return null;
  return getElementPage(subPage, state.currentInternalPageId).internalPage ?? subPage;
}

function releaseEmptyEditorLayerGroup(page: SubPage | InternalPage, groupId: string | undefined): void {
  if (!groupId || page.elements.some((element) => element.groupId === groupId)) return;
  const group = page.editorLayerGroups?.find((item) => item.id === groupId);
  if (group) delete group.runtimeParentId;
}

function findStageOfSubPage(course: Course | null, subPageId: string | null): Stage | null {
  if (!course || !subPageId) return null;
  const fromStages = course.stages.find((s) => s.subPages.some((sp) => sp.id === subPageId));
  if (fromStages) return fromStages;
  return (course.previewStages ?? []).find((s) => s.subPages.some((sp) => sp.id === subPageId)) ?? null;
}

let _idSeq = 0;
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${(_idSeq++).toString(36)}`;
}

function isPresetAllowedForCourse(preset: { courseKinds?: CourseKind[] }, kind?: CourseKind): boolean {
  return !preset.courseKinds?.length || !kind || preset.courseKinds.includes(kind);
}

/** 娣辨嫹璐濆厓绱犳暟缁勫苟涓烘瘡涓厓绱犻噸鏂板垎閰?ID锛屽悓鏃舵敼鍐欏厓绱犻棿寮曠敤銆? *  鐢ㄤ簬 duplicateSubPage / addSubPageFromTemplate 绛夐渶瑕佸厠闅嗘暣椤靛厓绱犵殑鍦烘櫙锛岄伩鍏嶅嚭鐜伴噸澶?React key銆?*/
function cloneElementsWithNewIds(elements: Element[], idPrefix = 'el'): Element[] {
  const cloned: Element[] = JSON.parse(JSON.stringify(elements));
  const idMap = new Map<string, string>();
  for (const el of cloned) {
    idMap.set(el.id, genId(idPrefix));
  }
  for (const el of cloned) {
    el.id = idMap.get(el.id)!;
    if (el.parentId && idMap.has(el.parentId)) {
      el.parentId = idMap.get(el.parentId);
    }
    if (Array.isArray(el.actions)) {
      for (const a of el.actions as Array<{ targetId?: string; judgeTargetId?: string }>) {
        if (a.targetId && idMap.has(a.targetId)) a.targetId = idMap.get(a.targetId);
        if (a.judgeTargetId && idMap.has(a.judgeTargetId)) a.judgeTargetId = idMap.get(a.judgeTargetId);
      }
    }
    remapInputRelationRefs(el, idMap, genId);
    remapChoiceAnswerRefs(el, idMap);
  }
  return cloned;
}

/** 纭繚 course 鑷冲皯鏈?1 涓?stage銆佹瘡涓?stage 鑷冲皯鏈?1 涓?subPage銆?
 *  对老数据（旧 `pages` 字段）做最小迁移：把每个旧 page 包装成一个独立大关卡，避免直接崩溃。 */
function ensureCourseShape(course: Course): Course {
  const legacy = (course as unknown as { pages?: SubPage[] }).pages;
  if ((!course.stages || course.stages.length === 0) && Array.isArray(legacy) && legacy.length > 0) {
    course.stages = legacy.map((page, i) => ({
      id: genId('stage'),
      name: `关卡 ${i + 1}`,
      subPages: [{ ...page, name: `小关卡 ${i + 1}-1` }],
    }));
    delete (course as unknown as { pages?: SubPage[] }).pages;
  }
  if (!course.stages) {
    course.stages = [];
  }
  if (!course.previewStages) {
    course.previewStages = [];
  }
  if (course.previewShrinked === undefined) course.previewShrinked = false;
  if (course.normalShrinked === undefined) course.normalShrinked = false;
  return course;
}

/** Default naming patterns; only generated names are renumbered. */
const STAGE_DEFAULT_RE = /^\u5173\u5361\s+\d+$/;
const SUBPAGE_DEFAULT_RE = /^\u5c0f\u5173\u5361\s+\d+-\d+$/;
const PREVIEW_STAGE_DEFAULT_RE = /^\u9884\u4e60\s+\d+$/;

/** 鎸変綅缃噸鎺掑叧鍗″簭鍙凤紝浠呰鐩栭粯璁ゅ懡鍚嶆牸寮?*/
function renumberAll(course: Course): void {
  course.stages.forEach((stage, si) => {
    if (STAGE_DEFAULT_RE.test(stage.name)) {
      stage.name = `关卡 ${si + 1}`;
    }
    stage.subPages.forEach((sp, sj) => {
      if (SUBPAGE_DEFAULT_RE.test(sp.name)) {
        sp.name = `小关卡 ${si + 1}-${sj + 1}`;
      }
    });
  });
}

function renumberPreviewAll(course: Course): void {
  course.previewStages?.forEach((stage, si) => {
    if (PREVIEW_STAGE_DEFAULT_RE.test(stage.name)) {
      stage.name = `\u9884\u4e60 ${si + 1}`;
    }
  });
}

function subPageFromPreset(preset: (typeof PRESET_TEMPLATES)[number], name: string): SubPage {
  if (preset.editorModel === 'internal-pages') {
    const subPage = createInternalPagesSubPage(genId('subpage'), name);
    subPage.elements = cloneElementsWithNewIds(preset.elements, 'el');
    return subPage;
  }
  return {
    id: genId('subpage'),
    name,
    elements: cloneElementsWithNewIds(preset.elements, 'el'),
    frozen: preset.frozen ?? false,
  };
}

function markInternalPagesFeature(course: Course, subPage: SubPage): void {
  if (!isInternalPagesSubPage(subPage)) return;
  const features = new Set(course.requiredFeatures ?? []);
  features.add(INTERNAL_PAGES_TEMPLATE_ID);
  course.requiredFeatures = [...features];
  course.minimumEditorVersion = INTERNAL_PAGES_MIN_VERSION;
}

function pageBelongsToEditorGroup(subPage: SubPage, page: InternalPage, pageGroupId: string | undefined): boolean {
  const validIds = new Set(getInternalPageGroups(subPage).map((group) => group.id));
  if (pageGroupId) return page.pageGroupId === pageGroupId;
  return !page.pageGroupId || !validIds.has(page.pageGroupId);
}

function insertInternalPageAtGroupIndex(
  subPage: SubPage & { internalPages: InternalPage[] },
  page: InternalPage,
  requestedGroupId: string | undefined,
  requestedIndex: number,
): void {
  const pageGroupId = validInternalPageGroupId(subPage, requestedGroupId);
  if (pageGroupId) page.pageGroupId = pageGroupId;
  else delete page.pageGroupId;
  const candidates = subPage.internalPages
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => pageBelongsToEditorGroup(subPage, item, pageGroupId));
  const targetIndex = Math.max(0, Math.min(requestedIndex, candidates.length));
  const storageIndex = targetIndex < candidates.length
    ? candidates[targetIndex].index
    : candidates.length > 0
      ? candidates[candidates.length - 1].index + 1
      : subPage.internalPages.length;
  subPage.internalPages.splice(storageIndex, 0, page);
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    currentCourse: null,
    currentStageId: null,
    currentSubPageId: null,
    currentInternalPageId: null,
    focusSubPageId: null,
    selectedElementIds: [],
    selectedEditorLayerGroupId: null,
    selectedStageTarget: undefined,
    clipboard: [],
    clipboardEditorLayerGroups: [],
    history: [],
    historyIndex: -1,
    pageThumbnails: {},
    customTemplates: [],
    customTemplateDir: getTemplateDir(),

    loadCustomTemplates: async () => {
      const list = await listTemplates();
      set((state) => { state.customTemplates = list; });
    },

    setCustomTemplateDir: async (dir) => {
      setTemplateDir(dir);
      set((state) => { state.customTemplateDir = dir; });
      const list = await listTemplates();
      set((state) => { state.customTemplates = list; });
    },

    setPageThumbnail: (subPageId, dataUrl) =>
      set((state) => { state.pageThumbnails[subPageId] = dataUrl; }),

    saveHistory: () =>
      set((state) => {
        if (!state.currentCourse) return;
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.currentCourse)));
        state.history = newHistory.slice(-50);
        state.historyIndex = state.history.length - 1;
        }),

    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.currentCourse = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.currentCourse = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        }
      }),

    setCurrentCourse: (course) =>
      set((state) => {
        ensureCourseShape(course);
        const normalizeSubPage = (sp: SubPage): SubPage => ({
          ...sp,
          elements: normalizeElementNames(sp.elements),
          internalPages: sp.internalPages?.map((page) => ({ ...page, elements: normalizeElementNames(page.elements) })),
        });
        course.stages = course.stages.map((stage) => ({
          ...stage,
          subPages: stage.subPages.map(normalizeSubPage),
        }));
        course.previewStages = course.previewStages?.map((stage) => ({ ...stage, subPages: stage.subPages.map(normalizeSubPage) }));
        state.currentCourse = course;
        const firstStage = course.stages[0];
        const firstSub = firstStage?.subPages[0];
        state.currentStageId = firstStage?.id ?? null;
        state.currentSubPageId = firstSub?.id ?? null;
        state.currentInternalPageId = isInternalPagesSubPage(firstSub) ? firstSub.id : null;
        state.focusSubPageId = null;
        state.selectedEditorLayerGroupId = null;
        state.history = [JSON.parse(JSON.stringify(course))];
        state.historyIndex = 0;
        // 閲嶅缓鎵€鏈?SubPage 鐨勫眬閮ㄧ被鍨嬭鏁板櫒锛岃鏂板缓缁勪欢鎸夊眬閮ㄥ簭鍙峰懡鍚?
        const allSubPages = [
          ...course.stages.flatMap(s => s.subPages),
          ...(course.previewStages?.flatMap(s => s.subPages) ?? []),
        ];
        allSubPages.forEach((subPage) => markInternalPagesFeature(course, subPage));
        rebuildSubPageCounters(allSubPages);
      }),

    setCurrentSubPage: (stageId, subPageId) =>
      set((state) => {
        state.currentStageId = stageId;
        state.currentSubPageId = subPageId;
        // frozen 椤甸潰鍒囨崲杩涘叆鏃惰嚜鍔ㄩ€変腑閿佸畾鍏冪礌
        const stage = state.currentCourse?.stages.find(s => s.id === stageId)
          ?? (state.currentCourse?.previewStages ?? []).find(s => s.id === stageId);
        const page = stage?.subPages.find(sp => sp.id === subPageId);
        state.currentInternalPageId = isInternalPagesSubPage(page) ? page.id : null;
        if (state.focusSubPageId && state.focusSubPageId !== subPageId) state.focusSubPageId = null;
        if (page?.frozen) {
          state.selectedElementIds = page.elements.filter(e => e.locked).map(e => e.id);
        } else {
          state.selectedElementIds = [];
        }
        state.selectedEditorLayerGroupId = null;
        state.selectedStageTarget = state.currentCourse?.previewStages?.some(s => s.id === stageId) ? 'preview' : 'normal';
      }),

    enterFocusWorkspace: (stageId, subPageId) =>
      set((state) => {
        const subPage = findSubPage(state.currentCourse, subPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        state.currentStageId = stageId;
        state.currentSubPageId = subPageId;
        state.currentInternalPageId = subPage.id;
        state.focusSubPageId = subPage.id;
        state.selectedElementIds = [];
        state.selectedEditorLayerGroupId = null;
        state.selectedStageTarget = state.currentCourse?.previewStages?.some((stage) => stage.id === stageId) ? 'preview' : 'normal';
      }),

    exitFocusWorkspace: () =>
      set((state) => {
        state.focusSubPageId = null;
        state.currentInternalPageId = null;
        state.selectedElementIds = [];
        state.selectedEditorLayerGroupId = null;
      }),

    setCurrentInternalPage: (pageId) =>
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const page = getElementPage(subPage, pageId);
        state.currentInternalPageId = page.id;
        state.selectedElementIds = [];
        state.selectedEditorLayerGroupId = null;
      }),

    addInternalPage: (kind, name, placement) => {
      let changed = false;
      let createdPageId: string | null = null;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const trimmed = name.trim();
        if (!trimmed || subPage.internalPages.some((page) => page.name === trimmed)) return;
        const page: InternalPage = {
          id: genId('internal-page'),
          name: trimmed,
          kind,
          elements: [],
          ...(kind === 'dialog'
            ? { dialogSettings: { maskColor: '#000000', maskOpacity: 0.55, closeOnMask: false } }
            : {}),
        };
        if (kind === 'dialog') {
          const closeButton = createDefaultElement('ScaleButton', subPage.id);
          closeButton.id = genId('el');
          closeButton.name = 'btn_close';
          closeButton.x = 1540;
          closeButton.y = 180;
          closeButton.props = { ...closeButton.props, label: '鍏抽棴' };
          closeButton.actions = [{ id: genId('action'), event: 'onClick', actionType: 'closeInternalDialog' }];
          page.elements.push(closeButton);
        }
        const afterIndex = placement?.afterPageId
          ? subPage.internalPages.findIndex((item) => item.id === placement.afterPageId)
          : -1;
        if (afterIndex >= 0) {
          const afterPage = subPage.internalPages[afterIndex];
          const inheritedGroupId = validInternalPageGroupId(subPage, afterPage.pageGroupId);
          if (inheritedGroupId) page.pageGroupId = inheritedGroupId;
          subPage.internalPages.splice(afterIndex + 1, 0, page);
        } else {
          const pageGroupId = validInternalPageGroupId(subPage, placement?.pageGroupId);
          const groupLength = subPage.internalPages.filter((item) => pageBelongsToEditorGroup(subPage, item, pageGroupId)).length;
          insertInternalPageAtGroupIndex(subPage, page, pageGroupId, groupLength);
        }
        state.currentInternalPageId = page.id;
        state.selectedElementIds = [];
        createdPageId = page.id;
        changed = true;
      });
      if (changed) get().saveHistory();
      return createdPageId;
    },

    renameInternalPage: (pageId, name) => {
      let renamed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const trimmed = name.trim();
        const page = subPage.internalPages.find((item) => item.id === pageId);
        if (!page || !trimmed || subPage.internalPages.some((item) => item.id !== pageId && item.name === trimmed)) return;
        page.name = trimmed;
        for (const source of [subPage.elements, ...subPage.internalPages.map((item) => item.elements)]) {
          for (const element of source) {
            for (const action of element.actions ?? []) {
              if (action.pageTargetId === pageId) action.pageTargetNameSnapshot = trimmed;
              if (action.afterClose?.pageTargetId === pageId) action.afterClose.pageTargetNameSnapshot = trimmed;
            }
          }
        }
        renamed = true;
      });
      if (renamed) get().saveHistory();
      return renamed;
    },

    duplicateInternalPage: (pageId) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const index = subPage.internalPages.findIndex((item) => item.id === pageId);
        if (index < 0) return;
        const source = subPage.internalPages[index];
        const copy = cloneInternalPageWithinSubPage(source, genId);
        let suffix = 2;
        let name = `${source.name} 鍓湰`;
        while (subPage.internalPages.some((item) => item.name === name)) name = `${source.name} 鍓湰 ${suffix++}`;
        copy.name = name;
        copy.noEntryDeferred = false;
        subPage.internalPages.splice(index + 1, 0, copy);
        state.currentInternalPageId = copy.id;
        state.selectedElementIds = [];
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    deleteInternalPage: (pageId) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const index = subPage.internalPages.findIndex((item) => item.id === pageId);
        if (index < 0) return;
        subPage.internalPages.splice(index, 1);
        state.currentInternalPageId = subPage.id;
        state.selectedElementIds = [];
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    addInternalPageGroup: (name) => {
      let groupId: string | null = null;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const trimmed = name.trim();
        const groups = subPage.internalPageGroups ?? (subPage.internalPageGroups = []);
        if (!trimmed || groups.some((group) => group.name === trimmed)) return;
        groupId = genId('page-group');
        groups.push({ id: groupId, name: trimmed });
      });
      if (groupId) get().saveHistory();
      return groupId;
    },

    renameInternalPageGroup: (groupId, name) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const trimmed = name.trim();
        const groups = getInternalPageGroups(subPage);
        const group = groups.find((item) => item.id === groupId);
        if (!group || !trimmed || groups.some((item) => item.id !== groupId && item.name === trimmed)) return;
        if (group.name === trimmed) return;
        group.name = trimmed;
        changed = true;
      });
      if (changed) get().saveHistory();
      return changed;
    },

    deleteInternalPageGroup: (groupId, deletePages = false) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const groups = subPage.internalPageGroups ?? [];
        const groupIndex = groups.findIndex((group) => group.id === groupId);
        if (groupIndex < 0) return;
        const groupedPages = subPage.internalPages.filter((page) => page.pageGroupId === groupId);
        subPage.internalPages = subPage.internalPages.filter((page) => page.pageGroupId !== groupId);
        if (deletePages) {
          if (groupedPages.some((page) => page.id === state.currentInternalPageId)) {
            state.currentInternalPageId = subPage.id;
            state.selectedElementIds = [];
          }
        } else {
          for (const page of groupedPages) {
            delete page.pageGroupId;
            subPage.internalPages.push(page);
          }
        }
        groups.splice(groupIndex, 1);
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    reorderInternalPageGroups: (fromIndex, toIndex) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const groups = subPage.internalPageGroups ?? [];
        if (!groups[fromIndex] || fromIndex === toIndex) return;
        const nextIndex = Math.max(0, Math.min(toIndex, groups.length - 1));
        const [removed] = groups.splice(fromIndex, 1);
        groups.splice(nextIndex, 0, removed);
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    moveInternalPageInList: (pageId, requestedGroupId, targetIndex) => {
      let changed = false;
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const sourceStorageIndex = subPage.internalPages.findIndex((page) => page.id === pageId);
        if (sourceStorageIndex < 0) return;
        const source = subPage.internalPages[sourceStorageIndex];
        const sourceGroupId = validInternalPageGroupId(subPage, source.pageGroupId);
        const targetGroupId = validInternalPageGroupId(subPage, requestedGroupId);
        const sourceVisualIndex = subPage.internalPages
          .filter((page) => pageBelongsToEditorGroup(subPage, page, sourceGroupId))
          .findIndex((page) => page.id === pageId);
        const targetLengthAfterRemoval = subPage.internalPages
          .filter((page) => page.id !== pageId && pageBelongsToEditorGroup(subPage, page, targetGroupId)).length;
        const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, targetLengthAfterRemoval));
        if (sourceGroupId === targetGroupId && sourceVisualIndex === normalizedTargetIndex) return;
        subPage.internalPages.splice(sourceStorageIndex, 1);
        insertInternalPageAtGroupIndex(subPage, source, targetGroupId, normalizedTargetIndex);
        changed = true;
      });
      if (changed) get().saveHistory();
      return changed;
    },

    moveInternalPage: (pageId, targetSubPageId, targetIndex) => {
      let result: { ok: boolean; error?: string } = { ok: false, error: 'PAGE_NOT_FOUND' };
      set((state) => {
        if (!state.currentCourse || !state.currentSubPageId) return;
        const sourceSubPage = findSubPage(state.currentCourse, state.currentSubPageId);
        const targetSubPage = findSubPage(state.currentCourse, targetSubPageId);
        if (!isInternalPagesSubPage(sourceSubPage) || !isInternalPagesSubPage(targetSubPage)) return;
        if (sourceSubPage.templateId !== targetSubPage.templateId) { result = { ok: false, error: 'TEMPLATE_STRUCTURE_MISMATCH' }; return; }
        const sourceArea = state.currentCourse.previewStages?.some((stage) => stage.subPages.some((sub) => sub.id === sourceSubPage.id));
        const targetArea = state.currentCourse.previewStages?.some((stage) => stage.subPages.some((sub) => sub.id === targetSubPage.id));
        if (sourceArea !== targetArea) { result = { ok: false, error: 'CROSS_AREA_MOVE_BLOCKED' }; return; }
        const sourceIndex = sourceSubPage.internalPages.findIndex((page) => page.id === pageId);
        if (sourceIndex < 0) return;
        const page = sourceSubPage.internalPages[sourceIndex];
        page.name = resolveMovedPageName(targetSubPage, page.name);
        sourceSubPage.internalPages.splice(sourceIndex, 1);
        delete page.pageGroupId;
        const ungroupedLength = targetSubPage.internalPages.filter((item) => pageBelongsToEditorGroup(targetSubPage, item, undefined)).length;
        insertInternalPageAtGroupIndex(targetSubPage, page, undefined, Math.min(targetIndex, ungroupedLength));
        const targetStage = findStageOfSubPage(state.currentCourse, targetSubPage.id);
        state.currentStageId = targetStage?.id ?? state.currentStageId;
        state.currentSubPageId = targetSubPage.id;
        state.currentInternalPageId = page.id;
        state.focusSubPageId = targetSubPage.id;
        state.selectedElementIds = [];
        state.selectedStageTarget = targetArea ? 'preview' : 'normal';
        result = { ok: true };
      });
      if (result.ok) get().saveHistory();
      return result;
    },

    updateDialogSettings: (pageId, updates) =>
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const page = subPage.internalPages.find((item) => item.id === pageId && item.kind === 'dialog');
        if (!page) return;
        page.dialogSettings = { maskColor: '#000000', maskOpacity: 0.55, closeOnMask: false, ...page.dialogSettings, ...updates };
      }),

    setNoEntryDeferred: (pageId, deferred) =>
      set((state) => {
        const subPage = findSubPage(state.currentCourse, state.currentSubPageId);
        if (!isInternalPagesSubPage(subPage)) return;
        const page = subPage.internalPages.find((item) => item.id === pageId && item.kind === 'content');
        if (!page) return;
        page.noEntryDeferred = deferred;
      }),

    toggleStageShrink: (stageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        // 鍏堜粠棰勪範鍏冲崱鏌ユ壘
        const previewStage = state.currentCourse.previewStages?.find((s) => s.id === stageId);
        if (previewStage) {
          previewStage.shrinked = !previewStage.shrinked;
          return;
        }
        // 鍐嶄粠姝ｈ鍏冲崱鏌ユ壘
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (stage) stage.shrinked = !stage.shrinked;
      }),

    addStage: () =>
      set((state) => {
        if (!state.currentCourse) return;
        const stageNum = state.currentCourse.stages.length + 1;
        const newSub: SubPage = {
          id: genId('subpage'),
          name: `小关卡 ${stageNum}-1`,
          elements: [],
        };
        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 ${stageNum}`,
          subPages: [newSub],
        };
        state.currentCourse.stages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'normal';
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addVideoStage: () =>
      set((state) => {
        if (!state.currentCourse) return;
        const stageNum = state.currentCourse.stages.length + 1;
        const videoEl: Element = {
          id: genId('el'),
          type: 'Video',
          layaType: 'Box',
          name: 'VideoBg',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          rotation: 0,
          opacity: 1,
          locked: true,
          actions: [],
          props: { videoUrl: '' },
        };
        const newSub: SubPage = {
          id: genId('subpage'),
          name: '视频关卡',
          frozen: true,
          elements: [videoEl],
        };
        const newStage: Stage = {
          id: genId('stage'),
          name: `视频${stageNum}`,
          noSubPages: true,
          subPages: [newSub],
        };
        state.currentCourse.stages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.selectedElementIds = [videoEl.id];
        state.selectedStageTarget = 'normal';
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addStageFromSubPage: (sourceSubPageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        // Find source sub-page across all stages
        let sourceSub: SubPage | null = null;
        for (const stage of state.currentCourse.stages) {
          const found = stage.subPages.find((sp) => sp.id === sourceSubPageId);
          if (found) { sourceSub = found; break; }
        }
        if (!sourceSub) return;
        if (state.currentCourse.kind === 'review' && isInternalPagesSubPage(sourceSub)) return;
        const newSub = cloneSubPageWithNewIds(sourceSub, genId);
        newSub.name = `小关卡 0-0`;
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 0`,
          subPages: [newSub],
        };
        state.currentCourse.stages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'normal';
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addStageFromTemplate: async (templateId) => {
      const state0 = get();
      if (!state0.currentCourse) return;
      const template = state0.customTemplates.find((t) => t.id === templateId);
      if (!template) return;
      if (state0.currentCourse.kind === 'review' && template.model === 'internal-pages-v1') throw new Error('INTERNAL_PAGES_UNSUPPORTED_FOR_REVIEW');
      const courseDir = getCourseDirPath(state0.currentCourse.id);
      if (!courseDir) throw new Error('NO_DIR_PATH');
      const applied = await applyTemplate({
        courseId: state0.currentCourse.id,
        courseDir,
        template,
      });
      set((state) => {
        if (!state.currentCourse) return;
        const newSub = cloneSubPageWithNewIds(applied.subPage, genId);
        newSub.name = `小关卡 0-0`;
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: `关卡 0`,
          subPages: [newSub],
        };
        state.currentCourse.stages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'normal';
        renumberAll(state.currentCourse);
      });
      get().saveHistory();
    },

    deleteStage: (stageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        const idx = state.currentCourse.stages.findIndex((s) => s.id === stageId);
        if (idx === -1) return;
        state.currentCourse.stages.splice(idx, 1);
        if (state.currentCourse.stages.length > 0) {
          const first = state.currentCourse.stages[0];
          state.currentStageId = first.id;
          state.currentSubPageId = first.subPages[0]?.id ?? null;
          state.selectedStageTarget = 'normal';
        } else {
          state.currentStageId = null;
          state.currentSubPageId = null;
          state.selectedStageTarget = undefined;
        }
        state.selectedElementIds = [];
        if (state.currentCourse.stages.length > 0) renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    clearAllStages: () =>
      set((state) => {
        if (!state.currentCourse) return;
        if (state.currentCourse.stages.length === 0) return;
        state.currentCourse.stages = [];
        state.currentStageId = null;
        state.currentSubPageId = null;
        state.selectedStageTarget = undefined;
        state.selectedElementIds = [];
        get().saveHistory();
      }),

    reorderStages: (fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentCourse) return;
        const [removed] = state.currentCourse.stages.splice(fromIndex, 1);
        state.currentCourse.stages.splice(toIndex, 0, removed);
        state.selectedStageTarget = 'normal';
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addPreviewStage: () =>
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) state.currentCourse.previewStages = [];
        const previewNum = state.currentCourse.previewStages.length + 1;
        const newSub: SubPage = {
          id: genId('subpage'),
          name: `\u9884\u4e60 ${previewNum}`,
          elements: [],
        };
        const newStage: Stage = {
          id: genId('stage'),
          name: `\u9884\u4e60 ${previewNum}`,
          noSubPages: true,
          subPages: [newSub],
        };
        state.currentCourse.previewStages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'preview';
        renumberPreviewAll(state.currentCourse);
        get().saveHistory();
      }),

    addPreviewStageFromPreset: (presetId) => {
      const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
      if (!preset) return;
      set((state) => {
        if (!state.currentCourse) return;
        if (!isPresetAllowedForCourse(preset, state.currentCourse.kind)) return;
        if (state.currentCourse.kind === 'review' && preset.editorModel === 'internal-pages') return;
        if (!state.currentCourse.previewStages) state.currentCourse.previewStages = [];
        const previewNum = state.currentCourse.previewStages.length + 1;
        const newSub = subPageFromPreset(preset, preset.defaultSubPageName ?? `\u9884\u4e60 ${previewNum}`);
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: preset.defaultStageName ?? `\u9884\u4e60 ${previewNum}`,
          noSubPages: true,
          subPages: [newSub],
        };
        state.currentCourse.previewStages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedStageTarget = 'preview';
        // frozen 椤甸潰鑷姩閫変腑閿佸畾鍏冪礌
        if (preset.frozen) {
          state.selectedElementIds = newSub.elements.filter(e => e.locked).map(e => e.id);
        } else {
          state.selectedElementIds = [];
        }
        renumberPreviewAll(state.currentCourse);
      });
      get().saveHistory();
    },

    addPreviewStageFromSubPage: (sourceSubPageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) state.currentCourse.previewStages = [];
        // Find source sub-page across all arrays (stages + previewStages)
        let sourceSub: SubPage | null = null;
        for (const stage of state.currentCourse.stages) {
          const found = stage.subPages.find((sp) => sp.id === sourceSubPageId);
          if (found) { sourceSub = found; break; }
        }
        if (!sourceSub) {
          for (const stage of state.currentCourse.previewStages) {
            const found = stage.subPages.find((sp) => sp.id === sourceSubPageId);
            if (found) { sourceSub = found; break; }
          }
        }
        if (!sourceSub) return;
        if (state.currentCourse.kind === 'review' && isInternalPagesSubPage(sourceSub)) return;
        const previewNum = state.currentCourse.previewStages.length + 1;
        const newSub = cloneSubPageWithNewIds(sourceSub, genId);
        newSub.name = `\u9884\u4e60 ${previewNum}`;
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: `\u9884\u4e60 ${previewNum}`,
          noSubPages: true,
          subPages: [newSub],
        };
        state.currentCourse.previewStages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'preview';
        renumberPreviewAll(state.currentCourse);
        get().saveHistory();
      }),

    addPreviewStageFromTemplate: async (templateId) => {
      const state0 = get();
      if (!state0.currentCourse) return;
      const template = state0.customTemplates.find((t) => t.id === templateId);
      if (!template) return;
      if (state0.currentCourse.kind === 'review' && template.model === 'internal-pages-v1') throw new Error('INTERNAL_PAGES_UNSUPPORTED_FOR_REVIEW');
      const courseDir = getCourseDirPath(state0.currentCourse.id);
      if (!courseDir) throw new Error('NO_DIR_PATH');
      const applied = await applyTemplate({
        courseId: state0.currentCourse.id,
        courseDir,
        template,
      });
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) state.currentCourse.previewStages = [];
        const previewNum = state.currentCourse.previewStages.length + 1;
        const newSub = cloneSubPageWithNewIds(applied.subPage, genId);
        newSub.name = `\u9884\u4e60 ${previewNum}`;
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: `\u9884\u4e60 ${previewNum}`,
          noSubPages: true,
          subPages: [newSub],
        };
        state.currentCourse.previewStages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        state.selectedStageTarget = 'preview';
        renumberPreviewAll(state.currentCourse);
      });
      get().saveHistory();
    },

    deletePreviewStage: (stageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) return;
        const idx = state.currentCourse.previewStages.findIndex((s) => s.id === stageId);
        if (idx === -1) return;
        state.currentCourse.previewStages.splice(idx, 1);
        if (state.currentCourse.previewStages.length > 0) {
          const first = state.currentCourse.previewStages[0];
          state.currentStageId = first.id;
          state.currentSubPageId = first.subPages[0]?.id ?? null;
          state.selectedStageTarget = 'preview';
        } else if (state.currentCourse.stages.length > 0) {
          // Fallback to normal stages if previewStages is empty
          const first = state.currentCourse.stages[0];
          state.currentStageId = first.id;
          state.currentSubPageId = first.subPages[0]?.id ?? null;
          state.selectedStageTarget = 'normal';
        } else {
          state.currentStageId = null;
          state.currentSubPageId = null;
          state.selectedStageTarget = undefined;
        }
        state.selectedElementIds = [];
        if (state.currentCourse.previewStages.length > 0) renumberPreviewAll(state.currentCourse);
        get().saveHistory();
      }),

    reorderPreviewStages: (fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) return;
        const [removed] = state.currentCourse.previewStages.splice(fromIndex, 1);
        state.currentCourse.previewStages.splice(toIndex, 0, removed);
        state.selectedStageTarget = 'preview';
        renumberPreviewAll(state.currentCourse);
        get().saveHistory();
      }),

    renamePreviewStage: (stageId, name) =>
      set((state) => {
        if (!state.currentCourse) return;
        if (!state.currentCourse.previewStages) return;
        const stage = state.currentCourse.previewStages.find((s) => s.id === stageId);
        if (stage && name.trim()) {
          stage.name = name.trim();
          get().saveHistory();
        }
      }),

    togglePreviewShrinked: () =>
      set((state) => {
        if (!state.currentCourse) return;
        state.currentCourse.previewShrinked = !state.currentCourse.previewShrinked;
      }),

    toggleNormalShrinked: () =>
      set((state) => {
        if (!state.currentCourse) return;
        state.currentCourse.normalShrinked = !state.currentCourse.normalShrinked;
      }),

    setFeedback: (value) =>
      set((state) => {
        if (!state.currentCourse) return;
        state.currentCourse.feedback = value;
      }),

    addSubPage: (stageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (!stage) return;
        const stageIdx = state.currentCourse.stages.indexOf(stage);
        const newSub: SubPage = {
          id: genId('subpage'),
          name: `小关卡 ${stageIdx + 1}-${stage.subPages.length + 1}`,
          elements: [],
        };
        stage.subPages.push(newSub);
        state.currentStageId = stage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addSubPageFromSubPage: (stageId, sourceSubPageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (!stage) return;
        // Find source sub-page across all stages
        let sourceSub: SubPage | null = null;
        for (const s of state.currentCourse.stages) {
          const found = s.subPages.find((sp) => sp.id === sourceSubPageId);
          if (found) { sourceSub = found; break; }
        }
        if (!sourceSub && state.currentCourse.previewStages) {
          for (const s of state.currentCourse.previewStages) {
            const found = s.subPages.find((sp) => sp.id === sourceSubPageId);
            if (found) { sourceSub = found; break; }
          }
        }
        if (!sourceSub) return;
        if (state.currentCourse.kind === 'review' && isInternalPagesSubPage(sourceSub)) return;
        const newSub = cloneSubPageWithNewIds(sourceSub, genId);
        newSub.name = `小关卡 0-0`;
        markInternalPagesFeature(state.currentCourse, newSub);
        stage.subPages.push(newSub);
        state.currentStageId = stage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    addSubPageFromTemplate: async (stageId, templateId) => {
      const state0 = get();
      if (!state0.currentCourse) return;
      const template = state0.customTemplates.find((t) => t.id === templateId);
      if (!template) return;
      if (state0.currentCourse.kind === 'review' && template.model === 'internal-pages-v1') throw new Error('INTERNAL_PAGES_UNSUPPORTED_FOR_REVIEW');
      const courseDir = getCourseDirPath(state0.currentCourse.id);
      if (!courseDir) throw new Error('NO_DIR_PATH');
      const applied = await applyTemplate({
        courseId: state0.currentCourse.id,
        courseDir,
        template,
      });
      set((state) => {
        if (!state.currentCourse) return;
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (!stage) return;
        const newSub = cloneSubPageWithNewIds(applied.subPage, genId);
        newSub.name = `小关卡 0-0`;
        markInternalPagesFeature(state.currentCourse, newSub);
        stage.subPages.push(newSub);
        state.currentStageId = stage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        renumberAll(state.currentCourse);
      });
      get().saveHistory();
    },

    addStageFromPreset: (presetId) => {
      const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
      if (!preset) return;
      set((state) => {
        if (!state.currentCourse) return;
        if (!isPresetAllowedForCourse(preset, state.currentCourse.kind)) return;
        if (state.currentCourse.kind === 'review' && preset.editorModel === 'internal-pages') return;
        const newSub = subPageFromPreset(preset, preset.defaultSubPageName ?? `小关卡 0-0`);
        markInternalPagesFeature(state.currentCourse, newSub);
        const newStage: Stage = {
          id: genId('stage'),
          name: preset.defaultStageName ?? `关卡 0`,
          noSubPages: preset.noSubPages ?? false,
          subPages: [newSub],
        };
        state.currentCourse.stages.push(newStage);
        state.currentStageId = newStage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedStageTarget = 'normal';
        // frozen 椤甸潰鑷姩閫変腑閿佸畾鍏冪礌
        if (preset.frozen) {
          state.selectedElementIds = newSub.elements.filter(e => e.locked).map(e => e.id);
        } else {
          state.selectedElementIds = [];
        }
        renumberAll(state.currentCourse);
      });
      get().saveHistory();
    },

    addSubPageFromPreset: (stageId, presetId) => {
      const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
      if (!preset) return;
      set((state) => {
        if (!state.currentCourse) return;
        if (!isPresetAllowedForCourse(preset, state.currentCourse.kind)) return;
        if (state.currentCourse.kind === 'review' && preset.editorModel === 'internal-pages') return;
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (!stage) return;
        const newSub = subPageFromPreset(preset, preset.defaultSubPageName ?? `小关卡 0-0`);
        markInternalPagesFeature(state.currentCourse, newSub);
        stage.subPages.push(newSub);
        state.currentStageId = stage.id;
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        // frozen 椤甸潰鑷姩閫変腑閿佸畾鍏冪礌
        if (preset.frozen) {
          state.selectedElementIds = newSub.elements.filter(e => e.locked).map(e => e.id);
        } else {
          state.selectedElementIds = [];
        }
        renumberAll(state.currentCourse);
      });
      get().saveHistory();
    },

    deleteSubPage: (stageId, subPageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        let stage: Stage | null = state.currentCourse.stages.find((s) => s.id === stageId) ?? null;
        let target: 'preview' | 'normal' = 'normal';
        if (!stage && state.currentCourse.previewStages) {
          stage = state.currentCourse.previewStages.find((s) => s.id === stageId) ?? null;
          if (stage) target = 'preview';
        }
        if (!stage) return;
        const idx = stage.subPages.findIndex((sp) => sp.id === subPageId);
        if (idx === -1) return;
        stage.subPages.splice(idx, 1);

        // 鑻ュ垹瀹屾渶鍚庝竴涓?sub-page锛岃繛澶у叧鍗′竴璧峰垹
        if (stage.subPages.length === 0) {
          if (target === 'preview') {
            const stageIdx = state.currentCourse.previewStages!.indexOf(stage);
            state.currentCourse.previewStages!.splice(stageIdx, 1);
          } else {
            const stageIdx = state.currentCourse.stages.indexOf(stage);
            state.currentCourse.stages.splice(stageIdx, 1);
          }
        }

        // 褰撳墠閫変腑鐨?subPage 鑻ヨ鍒狅紝閲嶆柊閫変腑
        if (state.currentSubPageId === subPageId) {
          if (target === 'preview' && state.currentCourse.previewStages && state.currentCourse.previewStages.length > 0) {
            const first = state.currentCourse.previewStages[0];
            state.currentStageId = first.id;
            state.currentSubPageId = first.subPages[0]?.id ?? null;
            state.selectedStageTarget = 'preview';
          } else if (state.currentCourse.stages.length > 0) {
            const first = state.currentCourse.stages[0];
            state.currentStageId = first.id;
            state.currentSubPageId = first.subPages[0]?.id ?? null;
            state.selectedStageTarget = 'normal';
          } else if (state.currentCourse.previewStages && state.currentCourse.previewStages.length > 0) {
            const first = state.currentCourse.previewStages[0];
            state.currentStageId = first.id;
            state.currentSubPageId = first.subPages[0]?.id ?? null;
            state.selectedStageTarget = 'preview';
          } else {
            state.currentStageId = null;
            state.currentSubPageId = null;
            state.selectedStageTarget = undefined;
          }
          state.selectedElementIds = [];
        }
        if (target === 'preview' && state.currentCourse.previewStages && state.currentCourse.previewStages.length > 0) {
          renumberPreviewAll(state.currentCourse);
        }
        if (state.currentCourse.stages.length > 0) renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    duplicateSubPage: (stageId, subPageId) =>
      set((state) => {
        if (!state.currentCourse) return;
        let stage: Stage | null = state.currentCourse.stages.find((s) => s.id === stageId) ?? null;
        if (!stage && state.currentCourse.previewStages) {
          stage = state.currentCourse.previewStages.find((s) => s.id === stageId) ?? null;
        }
        if (!stage) return;
        const sp = stage.subPages.find((s) => s.id === subPageId);
        if (!sp) return;
        const newSub = cloneSubPageWithNewIds(sp, genId);
        // 鐢ㄥ悎娉曢粯璁ゆ牸寮忓崰浣嶏紝涓嬮潰 renumberAll 浼氭寜浣嶇疆姝ｇ‘缂栧彿锛?        // 鑻ュ師 sub 鏄敤鎴疯嚜瀹氫箟鍚嶏紝鍒欎繚鐣欌€滃壇鏈€濇牸寮忎笉琚嚜鍔ㄩ噸鍛藉悕瑕嗙洊
        newSub.name = SUBPAGE_DEFAULT_RE.test(sp.name) ? `小关卡 0-0` : `${sp.name} 副本`;
        markInternalPagesFeature(state.currentCourse, newSub);
        const subIdx = stage.subPages.indexOf(sp);
        stage.subPages.splice(subIdx + 1, 0, newSub);
        state.currentSubPageId = newSub.id;
        state.currentInternalPageId = isInternalPagesSubPage(newSub) ? newSub.id : null;
        state.selectedElementIds = [];
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    reorderSubPages: (stageId, fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentCourse) return;
        let stage: Stage | null = state.currentCourse.stages.find((s) => s.id === stageId) ?? null;
        if (!stage && state.currentCourse.previewStages) {
          stage = state.currentCourse.previewStages.find((s) => s.id === stageId) ?? null;
        }
        if (!stage) return;
        const [removed] = stage.subPages.splice(fromIndex, 1);
        stage.subPages.splice(toIndex, 0, removed);
        if (state.currentCourse.previewStages && state.currentCourse.previewStages.find((s) => s.id === stageId)) {
          renumberPreviewAll(state.currentCourse);
        }
        renumberAll(state.currentCourse);
        get().saveHistory();
      }),

    renameStage: (stageId, name) =>
      set((state) => {
        if (!state.currentCourse) return;
        const stage = state.currentCourse.stages.find((s) => s.id === stageId);
        if (stage && name.trim()) {
          stage.name = name.trim();
          get().saveHistory();
          return;
        }
        if (state.currentCourse.previewStages) {
          const ps = state.currentCourse.previewStages.find((s) => s.id === stageId);
          if (ps && name.trim()) {
            ps.name = name.trim();
            renumberPreviewAll(state.currentCourse);
            get().saveHistory();
          }
        }
      }),

    renameSubPage: (subPageId, name) =>
      set((state) => {
        if (!state.currentCourse) return;
        for (const stage of state.currentCourse.stages) {
          const sp = stage.subPages.find((s) => s.id === subPageId);
          if (sp && name.trim()) {
            sp.name = name.trim();
            get().saveHistory();
            return;
          }
        }
        for (const stage of (state.currentCourse.previewStages ?? [])) {
          const sp = stage.subPages.find((s) => s.id === subPageId);
          if (sp && name.trim()) {
            sp.name = name.trim();
            renumberPreviewAll(state.currentCourse);
            get().saveHistory();
            return;
          }
        }
      }),

    addElement: (element, saveToHistory = true) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        if ('frozen' in page && page.frozen) return;
        if (!element.name?.trim()) element.name = `${element.layaType || element.type}_1`;
        // 纭繚 name 鍦ㄥ悓涓€鐖惰妭鐐逛笅鍞竴锛堝眬閮ㄤ綔鐢ㄥ煙锛?
        const siblings = page.elements.filter(e => e.parentId === element.parentId);
        const existingNames = siblings.map(e => e.name ?? '');
        element.name = getUniqueElementName(element.name, existingNames);
        // 纭繚 var 鍞竴锛堝鏋滈渶瑕侊級鈥?var 浠嶇劧鏄叏灞€鍞竴鏍囪瘑绗?
        if (elementMeta[element.type]?.varFromName) {
          const baseVar = element.name;
          element.props.var = getUniqueElementName(baseVar, page.elements.map((e) => (e.props?.var as string) || ''));
        }
        page.elements.push(element);
        if (saveToHistory) get().saveHistory();
      }),

    updateElement: (id, updates) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element) return;
        // 锁定元素仍允许内部流程更新资源 props，但不允许改动内容结构或几何。
        const elementMap = new Map(page.elements.map((item) => [item.id, item]));
        if (isElementLocked(element, elementMap)) {
          if (updates.props) {
            element.props = { ...element.props, ...updates.props };
          }
          return;
        }
        if (updates.props) {
          element.props = { ...element.props, ...updates.props };
        }
        const { props: _p, ...rest } = updates;
        const previousGroupId = element.groupId;
        Object.assign(element, rest);
        if (isChoiceOption(element, page.elements)) element.height = 77;
        if ('parentId' in rest && element.groupId) {
          const editorGroup = page.editorLayerGroups?.find((group) => group.id === element.groupId);
          if (editorGroup && editorGroup.runtimeParentId !== element.parentId) delete element.groupId;
        }
        releaseEmptyEditorLayerGroup(page, previousGroupId);
        if (updates.name && elementMeta[element.type]?.varFromName) {
          const otherVars = page.elements.filter(e => e.id !== id).map(e => (e.props?.var as string) || '');
          element.props.var = getUniqueElementName(updates.name, otherVars);
        }
      }),

    setElementEditorHidden: (id, hidden) => {
      get().setElementsEditorHidden([id], hidden);
    },

    setElementsEditorHidden: (ids, hidden) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const selected = new Set(ids);
        page.elements.forEach((element) => {
          if (!selected.has(element.id)) return;
          const current = (element.props as Record<string, unknown>)._editorHidden === true;
          if (current === hidden) return;
          const nextProps = { ...element.props };
          if (hidden) nextProps._editorHidden = true;
          else delete nextProps._editorHidden;
          element.props = nextProps;
          changed = true;
        });
      });
      if (changed) get().saveHistory();
    },

    setElementLocked: (id, locked) => {
      get().setElementsLocked([id], locked);
    },

    setElementsLocked: (ids, locked) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const selected = new Set(ids);
        page.elements.forEach((element) => {
          if (!selected.has(element.id) || element.locked === locked) return;
          element.locked = locked;
          changed = true;
        });
      });
      if (changed) get().saveHistory();
    },

    addEditorLayerGroup: (name, elementIds = []) => {
      let groupId: string | null = null;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const normalized = name.trim();
        if (!normalized) return;
        const groups = getEditorLayerGroups(page);
        if (groups.some((group) => group.name.trim() === normalized)) return;
        const selected = page.elements.filter((element) => elementIds.includes(element.id));
        const runtimeParentId = selected[0]?.parentId;
        if (selected.length > 0 && !canAssignElementsToGroup(page.elements, elementIds, { runtimeParentId })) return;
        groupId = genId('layer-group');
        groups.push({ id: groupId, name: normalized, runtimeParentId });
        page.editorLayerGroups = groups;
        const selectedIds = new Set(elementIds);
        page.elements.forEach((element) => {
          if (selectedIds.has(element.id)) element.groupId = groupId!;
        });
      });
      if (groupId) get().saveHistory();
      return groupId;
    },

    renameEditorLayerGroup: (groupId, name) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const normalized = name.trim();
        if (!normalized) return;
        const groups = getEditorLayerGroups(page);
        let group = groups.find((item) => item.id === groupId);
        if (!group) {
          const legacy = resolveEditorLayerGroups(page).find((item) => item.id === groupId);
          if (!legacy || !legacy.legacy) return;
          group = { id: groupId, name: legacy.name, runtimeParentId: legacy.runtimeParentId };
          groups.push(group);
          page.editorLayerGroups = groups;
        }
        if (groups.some((item) => item.id !== groupId && item.name.trim() === normalized)) return;
        if (group.name === normalized) return;
        group.name = normalized;
        changed = true;
      });
      if (changed) get().saveHistory();
      return changed;
    },

    deleteEditorLayerGroup: (groupId, deleteContents = false) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const groups = getEditorLayerGroups(page);
        const group = resolveEditorLayerGroups(page).find((item) => item.id === groupId);
        if (!group) return;
        const resolvedGroups = resolveEditorLayerGroups(page);
        const childGroupIds = new Set<string>([groupId]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const item of resolvedGroups) {
            if (item.parentGroupId && childGroupIds.has(item.parentGroupId) && !childGroupIds.has(item.id)) {
              childGroupIds.add(item.id);
              grew = true;
            }
          }
        }
        if (deleteContents) {
          const removing = new Set(resolvedGroups
            .filter((item) => childGroupIds.has(item.id))
            .flatMap((item) => item.memberIds));
          let grew = true;
          while (grew) {
            grew = false;
            for (const element of page.elements) {
              if (element.parentId && removing.has(element.parentId) && !removing.has(element.id)) {
                removing.add(element.id);
                grew = true;
              }
            }
          }
          page.elements = page.elements.filter((element) => !removing.has(element.id));
          state.selectedElementIds = state.selectedElementIds.filter((id) => !removing.has(id));
        } else {
          page.elements.forEach((element) => {
            if (childGroupIds.has(element.groupId ?? '')) delete element.groupId;
          });
        }
        page.editorLayerGroups = groups.filter((item) => !childGroupIds.has(item.id));
        if (childGroupIds.has(state.selectedEditorLayerGroupId ?? '')) {
          state.selectedEditorLayerGroupId = null;
        }
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    setEditorLayerGroupMembers: (groupId, elementIds, saveToHistory = true) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const groups = resolveEditorLayerGroups(page);
        if (groupId) {
          const group = groups.find((item) => item.id === groupId);
          if (!group || group.crossRuntimeParent || !canAssignElementsToGroup(page.elements, elementIds, group)) return;
          if (group.memberIds.length === 0 && group.runtimeParentId === undefined) {
            const persistedGroup = getEditorLayerGroups(page).find((item) => item.id === groupId);
            if (persistedGroup) persistedGroup.runtimeParentId = page.elements.find((element) => element.id === elementIds[0])?.parentId;
          }
        }
        const selected = new Set(elementIds);
        const previousGroupIds = new Set(page.elements
          .filter((element) => selected.has(element.id))
          .map((element) => element.groupId)
          .filter((id): id is string => Boolean(id)));
        page.elements.forEach((element) => {
          if (!selected.has(element.id)) return;
          if (element.groupId !== groupId) {
            if (groupId) element.groupId = groupId;
            else delete element.groupId;
            changed = true;
          }
        });
        previousGroupIds.forEach((previousGroupId) => releaseEmptyEditorLayerGroup(page, previousGroupId));
      });
      if (changed && saveToHistory) get().saveHistory();
      return changed;
    },

    setEditorLayerGroupParent: (groupId, parentGroupId) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const groups = getEditorLayerGroups(page);
        const group = groups.find((item) => item.id === groupId);
        if (!group || !canNestGroup(groups, groupId, parentGroupId)) return;
        const parent = parentGroupId ? groups.find((item) => item.id === parentGroupId) : undefined;
        if (parent && parent.runtimeParentId !== group.runtimeParentId) return;
        if (group.parentGroupId === parentGroupId) return;
        group.parentGroupId = parentGroupId;
        changed = true;
      });
      if (changed) get().saveHistory();
      return changed;
    },

    reorderEditorLayerGroup: (fromIndex, toIndex) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page || ('frozen' in page && page.frozen)) return;
        const groups = getEditorLayerGroups(page);
        if (!groups[fromIndex] || fromIndex === toIndex) return;
        const nextIndex = Math.max(0, Math.min(toIndex, groups.length - 1));
        const [group] = groups.splice(fromIndex, 1);
        groups.splice(nextIndex, 0, group);
        page.editorLayerGroups = groups;
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    moveElementIntoParent: (id) => {
      let result: ContainerGeometryActionResult = { ok: false, error: '鏈壘鍒板瓙鍏冪礌' };
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((item) => item.id === id);
        if (!element?.parentId) {
          result = { ok: false, error: 'ELEMENT_NOT_IN_CONTAINER' };
          return;
        }
        if (isElementLocked(element, new Map(page.elements.map((item) => [item.id, item])))) {
          result = { ok: false, error: '鍏冪礌鎴栫埗瀹瑰櫒宸查攣瀹氾紝鏃犳硶绉诲姩' };
          return;
        }
        const containment = getElementParentContainment(element, page.elements);
        if (!containment) {
          result = { ok: false, error: 'CANNOT_READ_PARENT_CONTAINER' };
          return;
        }
        if (!containment.isOverflowing) {
          result = { ok: false, error: 'CHILD_ALREADY_IN_PARENT_SCOPE' };
          return;
        }
        if (!containment.canFit) {
          result = { ok: false, error: 'CHILD_EXCEEDS_PARENT_BOUNDS' };
          return;
        }
        element.x += containment.correction.x;
        element.y += containment.correction.y;
        changed = true;
        result = { ok: true };
      });
      if (changed) get().saveHistory();
      return result;
    },

    fitContainerToChildren: (id) => {
      let result: ContainerGeometryActionResult = { ok: false, error: '鏈壘鍒扮埗瀹瑰櫒' };
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const container = page.elements.find((item) => item.id === id);
        if (!container || !isContainerElementType(container.type)) {
          result = { ok: false, error: 'TARGET_NOT_EXPANDABLE_CONTAINER' };
          return;
        }
        if (isElementLocked(container, new Map(page.elements.map((item) => [item.id, item])))) {
          result = { ok: false, error: 'PARENT_CONTAINER_LOCKED' };
          return;
        }
        const updates = getFitContainerToChildrenUpdates(container, page.elements);
        if (!updates) {
          result = { ok: false, error: 'NO_ADAPTABLE_CONTENT_IN_PARENT' };
          return;
        }
        if (updates.length === 0) {
          result = { ok: false, error: '鍏ㄩ儴鍐呭宸插湪鐖跺鍣ㄨ寖鍥村唴' };
          return;
        }
        for (const update of updates) {
          const element = page.elements.find((item) => item.id === update.id);
          if (!element) continue;
          element.x = update.x;
          element.y = update.y;
          element.width = update.width;
          element.height = update.height;
        }
        changed = true;
        result = { ok: true };
      });
      if (changed) get().saveHistory();
      return result;
    },

    deleteElement: (id) => {
      let changed = false;
      let removedChoiceAnswers = 0;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const el = page.elements.find((e) => e.id === id);
        if (el && isElementLocked(el, new Map(page.elements.map((item) => [item.id, item])))) return;
        if (el && (el.type === 'BrushDrawBtn' || el.type === 'BrushClearBtn')) {
          const parent = el.parentId ? page.elements.find((e) => e.id === el.parentId) : null;
          if (parent && parent.type === 'NewBrushSprite') return;
        }
        const toDelete = new Set([id]);
        const explicitGroupIds = new Set(page.editorLayerGroups?.map((group) => group.id) ?? []);
        if (el?.groupId && !explicitGroupIds.has(el.groupId)) {
          page.elements.forEach((e) => { if (e.groupId === el.groupId) toDelete.add(e.id); });
        }
        let expanded = true;
        while (expanded) {
          expanded = false;
          page.elements.forEach((e) => {
            if (e.parentId && toDelete.has(e.parentId) && !toDelete.has(e.id)) {
              toDelete.add(e.id);
              expanded = true;
            }
          });
        }
        removedChoiceAnswers = removeChoiceAnswerRefs(page.elements, toDelete);
        page.elements = page.elements.filter((e) => !toDelete.has(e.id));
        releaseEmptyEditorLayerGroup(page, el?.groupId);
        state.selectedElementIds = state.selectedElementIds.filter((eid) => !toDelete.has(eid));
        changed = true;
      });
      if (!changed) return;
      get().saveHistory();
      if (removedChoiceAnswers > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('forge:toast', {
          detail: {
            message: '宸插垹闄ゆ纭€夐」锛岀瓟妗堥厤缃凡鍚屾鏇存柊锛屽彲鎾ら攢鎭㈠',
            type: 'warning',
          },
        }));
      }
    },

    reorderElement: (id, newIndex, saveToHistory = true) => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || isElementLocked(element, new Map(page.elements.map((item) => [item.id, item])))) return;
        const parentId = element.parentId;
        // Collect siblings in their current flat-array order
        const siblings = page.elements.filter((e) => e.parentId === parentId);
        const currentSiblingPos = siblings.findIndex((e) => e.id === id);
        if (currentSiblingPos === -1 || currentSiblingPos === newIndex) return;
        // Reorder the siblings array
        const [removed] = siblings.splice(currentSiblingPos, 1);
        siblings.splice(newIndex, 0, removed);
        // Rebuild flat array: replace all sibling entries with reordered ones, keep others in place
        const siblingIdSet = new Set(siblings.map((e) => e.id));
        const newElements: Element[] = [];
        let siblingIdx = 0;
        for (const el of page.elements) {
          if (siblingIdSet.has(el.id)) {
            newElements.push(siblings[siblingIdx++]);
          } else {
            newElements.push(el);
          }
        }
        page.elements = newElements;
        changed = true;
      });
      if (changed && saveToHistory) get().saveHistory();
    },

    moveElementLayer: (id, direction) => {
      const page = findCurrentSubPage(get());
      const element = page?.elements.find((item) => item.id === id);
      if (!page || !element || isElementLocked(element, new Map(page.elements.map((item) => [item.id, item])))) return;
      const siblings = page.elements.filter((item) => item.parentId === element.parentId);
      const currentIndex = siblings.findIndex((item) => item.id === id);
      if (currentIndex < 0) return;
      const targetIndex = direction === 'top'
        ? siblings.length - 1
        : direction === 'bottom'
          ? 0
          : direction === 'up'
            ? Math.min(siblings.length - 1, currentIndex + 1)
            : Math.max(0, currentIndex - 1);
      get().reorderElement(id, targetIndex);
    },

    setElementParent: (id, newParentId, saveToHistory = true) => {
      let changed = false;
      let removedChoiceAnswers = 0;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element || isElementLocked(element, new Map(page.elements.map((item) => [item.id, item])))) return;
        if (newParentId) {
          if (newParentId === id) return;
          let pid: string | undefined = newParentId;
          while (pid) {
            if (pid === id) return;
            const p = page.elements.find((e) => e.id === pid);
            pid = p?.parentId;
          }
          const parentEl = page.elements.find((e) => e.id === newParentId);
          if (!parentEl) return;
          const containerTypes = ['Box', 'ContainerBox', 'PageTurnBox', 'HBox', 'VBox', 'Panel', 'DragView', 'DragViewBox', 'DragDropBox', 'DragDragBox', 'ChoiceBox', 'MatchingGame', 'OneStrokeGame', 'MazeView', 'KlInputBox'];
          if (!containerTypes.includes(parentEl.type)) return;
        }
        const getAncestorOffset = (pid: string | undefined): { ax: number; ay: number } => {
          let ax = 0, ay = 0, cur = pid;
          while (cur) {
            const p = page.elements.find((e) => e.id === cur);
            if (!p) break;
            ax += p.x; ay += p.y; cur = p.parentId;
          }
          return { ax, ay };
        };
        const previousParentId = element.parentId;
        const oldOff = getAncestorOffset(previousParentId);
        const newOff = getAncestorOffset(newParentId);
        element.x += oldOff.ax - newOff.ax;
        element.y += oldOff.ay - newOff.ay;
        const previousGroupId = element.groupId;
        element.parentId = newParentId || undefined;
        if (element.groupId) {
          const editorGroup = page.editorLayerGroups?.find((group) => group.id === element.groupId);
          if (editorGroup && editorGroup.runtimeParentId !== element.parentId) delete element.groupId;
        }
        releaseEmptyEditorLayerGroup(page, previousGroupId);
        const previousParent = previousParentId
          ? page.elements.find((candidate) => candidate.id === previousParentId)
          : undefined;
        if (element.type === 'SpeechSelectableObj' && previousParent?.type === 'ChoiceBox' && previousParentId !== newParentId) {
          removedChoiceAnswers = removeChoiceAnswerRefs(page.elements, new Set([element.id]));
        }

        // [鏂板] 璋冩暣鏁扮粍浣嶇疆锛氬瓙鍏冪礌鎺掑湪鐖跺鍣ㄦ墍鏈夌幇鏈夊瓙鍏冪礌涔嬪悗
        if (newParentId) {
          // 1. 鎵惧埌鐖跺鍣ㄥ湪鏁扮粍涓殑绱㈠紩
          const parentIdx = page.elements.findIndex(e => e.id === newParentId);

          // 2. 鎵惧埌璇ュ鍣ㄧ殑鎵€鏈夌幇鏈夊瓙鍏冪礌锛堜笉鍖呮嫭褰撳墠鍏冪礌锛?
          const siblings = page.elements.filter(e =>
            e.parentId === newParentId && e.id !== id
          );

          // 3. 纭畾鎻掑叆浣嶇疆
          let insertIdx;
          if (siblings.length > 0) {
            // 鏈夊瓙鍏冪礌锛氭彃鍦ㄦ渶鍚庝竴涓瓙鍏冪礌涔嬪悗
            const lastSibling = siblings[siblings.length - 1];
            insertIdx = page.elements.findIndex(e => e.id === lastSibling.id) + 1;
          } else {
            // 鏃犲瓙鍏冪礌锛氭彃鍦ㄧ埗瀹瑰櫒绱ч偦鐨勪笅涓€涓綅缃?
            insertIdx = parentIdx + 1;
          }

          // 4. 璋冩暣鏁扮粍锛氬厛绉婚櫎锛屽啀鎻掑叆
          const currentIdx = page.elements.findIndex(e => e.id === id);
          const [removed] = page.elements.splice(currentIdx, 1);
          // 濡傛灉鎻掑叆浣嶇疆鍦ㄧЩ闄や綅缃箣鍚庯紝绉婚櫎鎿嶄綔浼氳鎻掑叆绱㈠紩鍚戝墠鍋忕Щ 1
          if (insertIdx > currentIdx) insertIdx--;
          page.elements.splice(insertIdx, 0, removed);
        }

        changed = true;
      });
      if (changed && saveToHistory) get().saveHistory();
      if (removedChoiceAnswers > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('forge:toast', {
          detail: {
            message: '閫夐」宸茬Щ鍑哄師閫夋嫨棰橈紝姝ｇ‘绛旀閰嶇疆宸插悓姝ユ洿鏂帮紝鍙挙閿€鎭㈠',
            type: 'warning',
          },
        }));
      }
    },

    selectElement: (id, multi = false) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        const el = page?.elements.find((e) => e.id === id);
        state.selectedEditorLayerGroupId = null;

        const explicitGroupIds = new Set(page?.editorLayerGroups?.map((group) => group.id) ?? []);
        const targetIds = el?.groupId && page && !explicitGroupIds.has(el.groupId)
          ? page.elements.filter((element) => element.groupId === el.groupId).map((element) => element.id)
          : [id];

        if (multi) {
          // frozen 椤甸潰涓嶅厑璁稿彇娑堥攣瀹氬厓绱犵殑閫変腑
          if (page && 'frozen' in page && page.frozen && page.elements.some(e => e.locked && state.selectedElementIds.includes(e.id))) {
            if (targetIds.some((targetId) => state.selectedElementIds.includes(targetId) && page.elements.find((item) => item.id === targetId)?.locked)) return;
          }
          const targetSet = new Set(targetIds);
          if (targetIds.every((targetId) => state.selectedElementIds.includes(targetId))) {
            state.selectedElementIds = state.selectedElementIds.filter((eid) => !targetSet.has(eid));
          } else {
            state.selectedElementIds = [...new Set([...state.selectedElementIds, ...targetIds])];
          }
        } else {
          state.selectedElementIds = targetIds;
        }
      }),

    selectElements: (ids) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (page && 'frozen' in page && page.frozen) return;
        state.selectedEditorLayerGroupId = null;
        state.selectedElementIds = ids;
      }),

    selectEditorLayerGroup: (groupId) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (page && 'frozen' in page && page.frozen) return;
        if (!groupId) {
          state.selectedEditorLayerGroupId = null;
          state.selectedElementIds = [];
          return;
        }
        const group = page
          ? resolveEditorLayerGroups(page).find((item) => item.id === groupId)
          : undefined;
        if (!group) return;
        state.selectedEditorLayerGroupId = groupId;
        state.selectedElementIds = group.memberIds;
      }),

    clearSelection: () =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (page && 'frozen' in page && page.frozen) return;
        state.selectedEditorLayerGroupId = null;
        state.selectedElementIds = [];
      }),

    selectAll: () =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (page) {
          state.selectedEditorLayerGroupId = null;
          state.selectedElementIds = page.elements.map((e) => e.id);
        }
      }),

    copyElements: () =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const selected = new Set(state.selectedElementIds);
        // 閫掑綊鏀堕泦閫変腑鍏冪礌鐨勬墍鏈夊悗浠ｅ厓绱狅紙瀛愩€佸瓩銆佹浘瀛?..锛?
        const toCopy = new Set<string>(selected);
        const addDescendants = (parentId: string) => {
          for (const el of page.elements) {
            if (el.parentId === parentId && !toCopy.has(el.id)) {
              toCopy.add(el.id);
              addDescendants(el.id); // 閫掑綊鏀堕泦瀛愬厓绱犵殑瀛愬厓绱?
            }
          }
        };
        for (const id of selected) {
          addDescendants(id);
        }
        state.clipboard = JSON.parse(JSON.stringify(page.elements.filter((e) => toCopy.has(e.id))));
        const groupIds = new Set(state.clipboard.map((element) => element.groupId).filter((id): id is string => Boolean(id)));
        state.clipboardEditorLayerGroups = JSON.parse(JSON.stringify(
          getEditorLayerGroups(page).filter((group) => groupIds.has(group.id)),
        ));
      }),

    pasteElements: (saveToHistory = true) => {
      let result: ElementPasteResult | null = null;
      set((state) => {
        if (state.clipboard.length === 0) return;
        const page = findCurrentSubPage(state);
        if (!page) return;
        const idMap = new Map<string, string>();
        const groupIdMap = new Map<string, string>();
        const actionGroupIdMap = new Map<string, string>();
        const branchIdMap = new Map<string, string>();
        const now = Date.now();
        state.clipboard.forEach((el, i) => {
          idMap.set(el.id, `el-${now + i}-${Math.random().toString(36).slice(2, 6)}`);
          if (el.groupId && !groupIdMap.has(el.groupId)) groupIdMap.set(el.groupId, genId('group'));
          for (const action of el.actions ?? []) {
            if (action.groupId && !actionGroupIdMap.has(action.groupId)) actionGroupIdMap.set(action.groupId, genId('action-group'));
            if (action.branchId && !branchIdMap.has(action.branchId)) branchIdMap.set(action.branchId, genId('branch'));
          }
        });
        const existingGroupNames = new Set(getEditorLayerGroups(page).map((group) => group.name));
        state.clipboardEditorLayerGroups.forEach((group) => {
          if (!groupIdMap.has(group.id)) groupIdMap.set(group.id, genId('layer-group'));
        });
        const pastedLayerGroups = state.clipboardEditorLayerGroups.map((group) => {
          const id = groupIdMap.get(group.id)!;
          const name = getNextLayerCopyName(group.name, existingGroupNames);
          existingGroupNames.add(name);
          return {
            ...JSON.parse(JSON.stringify(group)),
            id,
            name,
            runtimeParentId: group.runtimeParentId ? (idMap.get(group.runtimeParentId) ?? group.runtimeParentId) : undefined,
            parentGroupId: group.parentGroupId ? (groupIdMap.get(group.parentGroupId) ?? undefined) : undefined,
          } as EditorLayerGroup;
        });
        const newIds: string[] = [];
        const reservedLayerNames = new Set(
          page.elements.map((element) => getLayerDisplayName(element, elementMeta[element.type]?.label)),
        );

        // MatchingItem / DragObj / DropObj 璧?鎵弿宸茬敤搴忓彿 + 鏈€澶?1"瑙勫垯锛?
        // 鍏朵粬绫诲瀷娌跨敤 getUniqueElementName锛堟寜鐖惰妭鐐瑰眬閮ㄥ幓閲嶏紝鍚?_2/_3 鍚庣紑锛夈€?
        const FIXED_NAME_TYPES = new Set(['MatchingItem', 'DragObj', 'DropObj']);

        state.clipboard.forEach((el) => {
          const newEl = JSON.parse(JSON.stringify(el));
          newEl.id = idMap.get(el.id)!;
          if (newEl.groupId && groupIdMap.has(newEl.groupId)) newEl.groupId = groupIdMap.get(newEl.groupId);
          // 鍏堥噸鏄犲皠鐖剁骇鍜屽姩浣滃紩鐢紝璁╁悗缁?name 鐢熸垚鑳芥壂鍒版纭埗鑺傜偣涓嬬殑鍏勫紵
          if (newEl.parentId && idMap.has(newEl.parentId)) newEl.parentId = idMap.get(newEl.parentId);
          if (newEl.actions) {
            newEl.actions.forEach((a: { id: string; targetId?: string; judgeTargetId?: string; groupId?: string; branchId?: string }) => {
              a.id = genId('action');
              if (a.targetId && idMap.has(a.targetId)) a.targetId = idMap.get(a.targetId);
              if (a.judgeTargetId && idMap.has(a.judgeTargetId)) a.judgeTargetId = idMap.get(a.judgeTargetId);
              if (a.groupId && actionGroupIdMap.has(a.groupId)) a.groupId = actionGroupIdMap.get(a.groupId);
              if (a.branchId && branchIdMap.has(a.branchId)) a.branchId = branchIdMap.get(a.branchId);
            });
          }
          remapInputRelationRefs(newEl, idMap, genId);
          remapChoiceAnswerRefs(newEl, idMap);

          // 鐢熸垚鍞竴鐨?name
          if (FIXED_NAME_TYPES.has(newEl.type)) {
            // 鍥哄畾鏍煎紡鍛藉悕锛氫繚鐣欏墠缂€锛岄噸鏂扮敓鎴愬簭鍙?
            if (newEl.type === 'DropObj') {
              newEl.name = getNextNumberedName('dj', page.elements, newEl.parentId);
            } else if (newEl.type === 'DragObj') {
              newEl.name = getNextNumberedName('aj', page.elements, newEl.parentId);
            } else if (newEl.type === 'MatchingItem') {
              const originalPrefix = (newEl.name || '').match(/^([a-zA-Z]+)\d+$/)?.[1];
              const camp = (newEl.props as Record<string, unknown>)?.camp;
              if (originalPrefix === 'item' && (camp === 'camp1' || camp === 'camp2')) {
                newEl.name = getNextItemNameForCenterMatch(page.elements, newEl.parentId, camp);
              } else if (originalPrefix && ['l', 'r', 't', 'b'].includes(originalPrefix)) {
                newEl.name = getNextNumberedName(originalPrefix, page.elements, newEl.parentId);
              } else {
                // 鍓嶇紑寮傚父 鈫?璧伴€氱敤鍏滃簳
                const siblings = page.elements.filter(e => e.parentId === newEl.parentId);
                const reservedNames = new Set(siblings.map(e => e.name ?? '').filter(Boolean));
                const baseName = (newEl.name?.trim() || '').replace(/_\d+$/, '') || 'item';
                newEl.name = getUniqueElementName(baseName, reservedNames);
              }
            }
          } else if (newEl.name?.trim()) {
            // 閫氱敤锛氭寜鐖惰妭鐐瑰垎缁勫幓閲嶏紙淇濈暀鏃ц涓猴級
            const siblings = page.elements.filter(e => e.parentId === newEl.parentId);
            const reservedNames = new Set(siblings.map(e => e.name ?? '').filter(Boolean));
            const baseName = newEl.name.trim();
            const baseNameWithoutNumber = baseName.replace(/_\d+$/, '');
            newEl.name = getUniqueElementName(baseNameWithoutNumber, reservedNames);
          }

          // 鐢熸垚鍞竴鐨?var锛堝鏋滃厓绱犻渶瑕?var锛夆€?var 浠嶇劧鏄叏灞€鍞竴
          if (elementMeta[newEl.type]?.varFromName) {
            const reservedVars = page.elements.map((e) => (e.props?.var as string) || '').filter(Boolean);
            const baseVar = newEl.name?.trim() || newEl.layaType || newEl.type;
            const baseVarWithoutNumber = baseVar.replace(/_\d+$/, '');
            newEl.props.var = getUniqueElementName(baseVarWithoutNumber, reservedVars);
          }

          const sourceLayerName = getLayerDisplayName(el, elementMeta[el.type]?.label);
          const copiedLayerName = getNextLayerCopyName(sourceLayerName, reservedLayerNames);
          newEl.props = withLayerLabel(newEl.props ?? {}, copiedLayerName);
          reservedLayerNames.add(copiedLayerName);

          // 鍘熶綅澶嶅埗锛氫笉鍋忕Щ浣嶇疆
          page.elements.push(newEl);
          newIds.push(newEl.id);
        });
        const newIdSet = new Set(newIds);
        const selectedIds = newIds.filter((id) => {
          let element = page.elements.find((item) => item.id === id);
          const visited = new Set<string>();
          while (element?.parentId && !visited.has(element.id)) {
            visited.add(element.id);
            if (newIdSet.has(element.parentId)) return false;
            element = page.elements.find((item) => item.id === element?.parentId);
          }
          return true;
        });
        state.selectedElementIds = selectedIds;
        if (pastedLayerGroups.length > 0) {
          const groups = getEditorLayerGroups(page);
          page.editorLayerGroups = [...groups, ...pastedLayerGroups];
        }
        result = {
          allIds: newIds,
          selectedIds,
          idMap: Object.fromEntries(idMap),
          elements: JSON.parse(JSON.stringify(page.elements)),
        };
      });
      if (result && saveToHistory) get().saveHistory();
      return result;
    },

    duplicateElements: () => {
      get().copyElements();
      return get().pasteElements();
    },

    duplicateElementsForDrag: (sourceIds) => {
      const previousClipboard = JSON.parse(JSON.stringify(get().clipboard));
      const previousClipboardGroups = JSON.parse(JSON.stringify(get().clipboardEditorLayerGroups));
      const previousSelection = [...get().selectedElementIds];
      set((state) => { state.selectedElementIds = sourceIds; });
      get().copyElements();
      const result = get().pasteElements(false);
      set((state) => {
        state.clipboard = previousClipboard;
        state.clipboardEditorLayerGroups = previousClipboardGroups;
        if (!result) state.selectedElementIds = previousSelection;
      });
      return result;
    },

    updateElementsWithoutHistory: (updates) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const updateMap = new Map(updates.map((update) => [update.id, update]));
        const elementMap = new Map(page.elements.map((item) => [item.id, item]));
        for (const element of page.elements) {
          const update = updateMap.get(element.id);
          if (!update || isElementLocked(element, elementMap)) continue;
          element.x = update.x;
          element.y = update.y;
          element.width = update.width;
          element.height = isChoiceOption(element, page.elements) ? 77 : update.height;
          element.rotation = update.rotation;
        }
      }),

    removeElementsWithoutHistory: (ids) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const removing = new Set(ids);
        const removingGroupIds = new Set(page.elements
          .filter((element) => removing.has(element.id))
          .map((element) => element.groupId)
          .filter((id): id is string => Boolean(id)));
        page.elements = page.elements.filter((element) => !removing.has(element.id));
        page.editorLayerGroups = getEditorLayerGroups(page).filter((group) => (
          !removingGroupIds.has(group.id) || page.elements.some((element) => element.groupId === group.id)
        ));
        state.selectedElementIds = state.selectedElementIds.filter((id) => !removing.has(id));
      }),

    alignElements: (direction) =>
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const elementMap = new Map(page.elements.map((item) => [item.id, item]));
        const els = page.elements.filter((e) => state.selectedElementIds.includes(e.id) && !isElementLocked(e, elementMap));
        if (els.length < 2) return;

        switch (direction) {
          case 'left': {
            const minX = Math.min(...els.map((e) => e.x));
            els.forEach((e) => { e.x = minX; });
            break;
          }
          case 'right': {
            const maxR = Math.max(...els.map((e) => e.x + e.width));
            els.forEach((e) => { e.x = maxR - e.width; });
            break;
          }
          case 'centerH': {
            const minX = Math.min(...els.map((e) => e.x));
            const maxR = Math.max(...els.map((e) => e.x + e.width));
            const cx = (minX + maxR) / 2;
            els.forEach((e) => { e.x = cx - e.width / 2; });
            break;
          }
          case 'top': {
            const minY = Math.min(...els.map((e) => e.y));
            els.forEach((e) => { e.y = minY; });
            break;
          }
          case 'bottom': {
            const maxB = Math.max(...els.map((e) => e.y + e.height));
            els.forEach((e) => { e.y = maxB - e.height; });
            break;
          }
          case 'centerV': {
            const minY = Math.min(...els.map((e) => e.y));
            const maxB = Math.max(...els.map((e) => e.y + e.height));
            const cy = (minY + maxB) / 2;
            els.forEach((e) => { e.y = cy - e.height / 2; });
            break;
          }
          case 'distributeH': {
            if (els.length < 3) return;
            const sorted = [...els].sort((a, b) => a.x - b.x);
            const minX = sorted[0].x;
            const maxR = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
            const totalW = sorted.reduce((s, e) => s + e.width, 0);
            const gap = (maxR - minX - totalW) / (sorted.length - 1);
            let cx = minX;
            sorted.forEach((e) => { e.x = Math.round(cx); cx += e.width + gap; });
            break;
          }
          case 'distributeV': {
            if (els.length < 3) return;
            const sorted = [...els].sort((a, b) => a.y - b.y);
            const minY = sorted[0].y;
            const maxB = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
            const totalH = sorted.reduce((s, e) => s + e.height, 0);
            const gap = (maxB - minY - totalH) / (sorted.length - 1);
            let cy = minY;
            sorted.forEach((e) => { e.y = Math.round(cy); cy += e.height + gap; });
            break;
          }
        }
        get().saveHistory();
      }),

    groupElements: () => {
      let changed = false;
      set((state) => {
        if (state.selectedElementIds.length < 2) return;
        const page = findCurrentSubPage(state);
        if (!page) return;
        const elementMap = new Map(page.elements.map((item) => [item.id, item]));
        const selectedIds = new Set(state.selectedElementIds.filter((id) => {
          const element = elementMap.get(id);
          return element && !isElementLocked(element, elementMap);
        }));
        if (selectedIds.size < 2) return;
        const runtimeParents = new Set([...selectedIds].map((id) => elementMap.get(id)?.parentId));
        if (runtimeParents.size > 1) return;
        const gid = genId('layer-group');
        const runtimeParentId = [...selectedIds].map((id) => elementMap.get(id)?.parentId)[0];
        const groups = getEditorLayerGroups(page);
        groups.push({ id: gid, name: 'layer-group', runtimeParentId });
        page.editorLayerGroups = groups;
        page.elements.forEach((e) => {
          if (selectedIds.has(e.id)) e.groupId = gid;
        });
        changed = true;
      });
      if (changed) get().saveHistory();
    },

    ungroupElements: () => {
      let changed = false;
      set((state) => {
        const page = findCurrentSubPage(state);
        if (!page) return;
        const elementMap = new Map(page.elements.map((item) => [item.id, item]));
        const groupIds = new Set<string>();
        const lockedGroupIds = new Set<string>();
        page.elements.forEach((element) => {
          if (element.groupId && isElementLocked(element, elementMap)) lockedGroupIds.add(element.groupId);
        });
        const explicitGroupIds = new Set(getEditorLayerGroups(page).map((group) => group.id));
        page.elements.forEach((e) => {
          const selectedExplicitGroup = state.selectedEditorLayerGroupId === e.groupId && explicitGroupIds.has(e.groupId ?? '');
          const selectedLegacyMember = state.selectedElementIds.includes(e.id) && !explicitGroupIds.has(e.groupId ?? '');
          if ((selectedExplicitGroup || selectedLegacyMember) && e.groupId && !isElementLocked(e, elementMap) && !lockedGroupIds.has(e.groupId)) {
            groupIds.add(e.groupId);
          }
        });
        page.elements.forEach((e) => {
          if (e.groupId && groupIds.has(e.groupId) && !isElementLocked(e, elementMap)) {
            delete e.groupId;
            changed = true;
          }
        });
        if (groupIds.size > 0) {
          page.editorLayerGroups = getEditorLayerGroups(page).filter((group) => !groupIds.has(group.id));
          changed = true;
        }
      });
      if (changed) get().saveHistory();
    },

    saveAsCustomTemplate: async (subPageId) => {
      const state0 = get();
      if (!state0.currentCourse) return { ok: false, error: 'NO_COURSE' };
      if (!state0.customTemplateDir) return { ok: false, error: 'NO_TEMPLATE_DIR' };
      // 璺?stages 鎵惧皬鍏冲崱
      let sourceSub: SubPage | null = null;
      for (const stage of state0.currentCourse.stages) {
        const found = stage.subPages.find((sp) => sp.id === subPageId);
        if (found) { sourceSub = found; break; }
      }
      if (!sourceSub && state0.currentCourse.previewStages) {
        for (const stage of state0.currentCourse.previewStages) {
          const found = stage.subPages.find((sp) => sp.id === subPageId);
          if (found) { sourceSub = found; break; }
        }
      }
      if (!sourceSub) return { ok: false, error: 'SUBPAGE_NOT_FOUND' };
      const courseDir = getCourseDirPath(state0.currentCourse.id);
      if (!courseDir) return { ok: false, error: 'NO_DIR_PATH' };
      try {
        const template = await saveTemplate({
          courseId: state0.currentCourse.id,
          courseDir,
          sourceSubPage: sourceSub,
          thumbnailDataUrl: state0.pageThumbnails[subPageId] || undefined,
        });
        const list = await listTemplates();
        set((state) => { state.customTemplates = list; });
        return { ok: true, template };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    removeCustomTemplateAction: async (templateId) => {
      await removeTemplate(templateId);
      const list = await listTemplates();
      set((state) => { state.customTemplates = list; });
    },

    renameCustomTemplate: async (templateId, newName) => {
      try {
        await renameTemplate(templateId, newName);
        const list = await listTemplates();
        set((state) => { state.customTemplates = list; });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    importCustomTemplates: async (sourceDir) => {
      const result = await importTemplatesFromDir(sourceDir);
      const list = await listTemplates();
      set((state) => { state.customTemplates = list; });
      return result;
    },

    pinCustomTemplate: async (templateId) => {
      await pinTemplate(templateId);
      const list = await listTemplates();
      set((state) => { state.customTemplates = list; });
    },

      /** 缈婚〉锛氬垏鎹㈤〉闈㈢储寮曪紝鍒囨崲 ContainerBox visible */
      switchPageTurnPage: (elementId: string, newIndex: number) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const ptBox = page.elements.find(e => e.id === elementId);
        if (!ptBox || ptBox.type !== 'PageTurnBox') return;
        const pageBoxes = page.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox');
        const tabBtns = page.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj');
        if (newIndex < 0 || newIndex >= pageBoxes.length) return;

        set((state) => {
          const p = findCurrentSubPage(state);
          if (!p) return state;
          // 閬嶅巻鎵€鏈夐〉闈紝閫変腑鐨勮鎴?true锛屽叾浠栬鎴?false
          pageBoxes.forEach((box, i) => {
            const el = p.elements.find(e => e.id === box.id);
            if (el) el.props = { ...el.props, visible: i === newIndex };
          });
          tabBtns.forEach((tab, i) => {
            const el = p.elements.find(e => e.id === tab.id);
            if (el) el.props = { ...el.props, isSelected: i === newIndex };
          });
          const ptEl = p.elements.find(e => e.id === elementId);
          if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: newIndex };
          return state;
        });
        // 鍚屾 Laya 瀹炰緥渚х殑 visible
        pageBoxes.forEach((box, i) => {
          const obj = getObject(box.id);
          if (obj) obj.visible = (i === newIndex);
        });
        tabBtns.forEach((tab, i) => {
          const obj = getObject(tab.id);
          if (obj) obj.isSelected = (i === newIndex);
        });
      },

      /** 缈婚〉:娣诲姞鏂伴〉闈?ContainerBox + 鍚屾鍒涘缓鏍囩鎸夐挳濡傛灉 buttonType 鍖呭惈 tabs) */
      addPageTurnPage: (elementId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const ptBox = page.elements.find(e => e.id === elementId);
        if (!ptBox || ptBox.type !== 'PageTurnBox') return;
        const buttonType = ((ptBox.props as Record<string, unknown>).buttonType as string) || 'arrows';
        const needTab = buttonType === 'tabs' || buttonType === 'both';
        const pageBoxes = page.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox');
        const tabBtns = page.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj');
        const newIdx = pageBoxes.length;

        const newBox = createDefaultElement('ContainerBox', subPageId ?? undefined);
        newBox.props = { ...newBox.props, visible: true };
        newBox.parentId = elementId;

        const lastPageBox = pageBoxes[pageBoxes.length - 1];
        const lastTab = tabBtns[tabBtns.length - 1];

        let newTab: Element | null = null;
        if (needTab) {
          newTab = createDefaultElement('SpeechSelectableObj', subPageId ?? undefined);
          newTab.parentId = elementId;
          // 绱ц创鏈€鍚庝竴涓爣绛炬寜閽彸渚?娌℃湁灏辨斁榛樿浣嶇疆
          if (lastTab) {
            newTab.x = lastTab.x + lastTab.width + 10;
            newTab.y = lastTab.y;
          } else {
            newTab.x = 466;
            newTab.y = 366;
          }
          // 榛樿 1 瀵?1锛氱 newIdx 涓?SelectableObj 璺冲埌绗?newIdx 涓?ContainerBox
          newTab.actions = [{
            id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            event: 'onClick',
            actionType: 'pageTurnGoTo',
            targetId: elementId,
            value: newIdx,
            groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          }];
        }

        set((state) => {
          const p = findCurrentSubPage(state);
          if (!p) return state;
          // 鎶婃墍鏈夋棫椤甸潰閮借鎴?false
          pageBoxes.forEach(box => {
            const el = p.elements.find(e2 => e2.id === box.id);
            if (el) el.props = { ...el.props, visible: false };
          });
          // 鏂?ContainerBox 鎻掑叆鍒版渶鍚庝竴涓垎椤?ContainerBox 鍚庨潰
          if (lastPageBox) {
            const insertAt = p.elements.findIndex(e2 => e2.id === lastPageBox.id) + 1;
            p.elements.splice(insertAt, 0, newBox);
          } else {
            p.elements.push(newBox);
          }
          // 鏍囩鎸夐挳鎻掑叆鍒版渶鍚庝竴涓?SelectableObj 鍚庨潰;娌℃湁灏辨斁鍦?elements 鏈熬
          if (newTab) {
            if (lastTab) {
              const insertAt = p.elements.findIndex(e2 => e2.id === lastTab.id) + 1;
              p.elements.splice(insertAt, 0, newTab);
            } else {
              p.elements.push(newTab);
            }
          }
          // 鍚屾鎵€鏈夋爣绛炬寜閽?isSelected
          const allTabs = p.elements.filter(e2 => e2.parentId === elementId && e2.type === 'SpeechSelectableObj');
          allTabs.forEach((tab, i) => {
            const el = p.elements.find(e2 => e2.id === tab.id);
            if (el) el.props = { ...el.props, isSelected: i === newIdx };
          });
          const ptEl = p.elements.find(e2 => e2.id === elementId);
          if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: newIdx };
          return state;
        });
        const ptObj = getObject(elementId);
        const newObj = createLayaComponent(newBox, ptObj);
        if (newObj) registerObject(newBox.id, newObj);
        if (newTab) {
          const tabObj = createLayaComponent(newTab, ptObj);
          if (tabObj) registerObject(newTab.id, tabObj);
        }
        // 鍚屾 Laya 瀹炰緥渚х殑 visible锛氭墍鏈夋棫椤甸潰 false锛屾柊椤甸潰 true
        const finalSp = findActiveElementPage(get().currentCourse, subPageId, get().currentInternalPageId);
        const finalPageBoxes = finalSp?.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox') ?? [];
        finalPageBoxes.forEach((box, i) => {
          const obj = getObject(box.id);
          if (obj) obj.visible = (i === newIdx);
        });
        const finalTabs = finalSp?.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj') ?? [];
        finalTabs.forEach((tab, i) => {
          const obj = getObject(tab.id);
          if (obj) obj.isSelected = (i === newIdx);
        });
      },

      /** 缈婚〉:鍒犻櫎椤甸潰(ContainerBox + 瀛愬厓绱?+ 瀵瑰簲鏍囩鎸夐挳) */
      removePageTurnPage: (elementId: string, pageIndex: number) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const ptBox = page.elements.find(e => e.id === elementId);
        if (!ptBox || ptBox.type !== 'PageTurnBox') return;
        const pageBoxes = page.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox');
        const tabBtns = page.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj');
        if (pageIndex < 0 || pageIndex >= pageBoxes.length || pageBoxes.length <= 1) return;

        const boxToRemove = pageBoxes[pageIndex];
        const tabToRemove = tabBtns[pageIndex]; // 绗?i 涓爣绛炬寜閽搴旂 i 涓垎椤?鍙兘 undefined
        const idsToDelete = new Set<string>();
        idsToDelete.add(boxToRemove.id);
        if (tabToRemove) idsToDelete.add(tabToRemove.id);
        for (const el of page.elements) {
          if (el.parentId === boxToRemove.id) idsToDelete.add(el.id);
        }

        set((state) => {
          const p = findCurrentSubPage(state);
          if (!p) return state;
          p.elements = p.elements.filter(e => !idsToDelete.has(e.id));
          const currentIndex = (ptBox.props as Record<string, unknown>).currentPageIndex as number;
          let newIdx = currentIndex;
          if (pageIndex < currentIndex) newIdx = currentIndex - 1;
          else if (pageIndex === currentIndex) newIdx = Math.min(currentIndex, pageBoxes.length - 2);
          const ptEl = p.elements.find(e => e.id === elementId);
          if (ptEl) ptEl.props = { ...ptEl.props, currentPageIndex: newIdx };
          const remainingBoxes = p.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox');
          if (remainingBoxes.length > 0) {
            remainingBoxes.forEach((box, i) => {
              const el = p.elements.find(e2 => e2.id === box.id);
              if (el) el.props = { ...el.props, visible: i === newIdx };
            });
          }
          // 鍚屾鍓╀綑鏍囩鎸夐挳鐨?isSelected
          const remainingTabs = p.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj');
          remainingTabs.forEach((tab, i) => {
            const el = p.elements.find(e2 => e2.id === tab.id);
            if (!el) return;
            el.props = { ...el.props, isSelected: i === newIdx };
          });
          return state;
        });
        for (const id of idsToDelete) removeObject(id);
        // 鍚屾 Laya 瀹炰緥渚х殑 visible
        const finalSp = findActiveElementPage(get().currentCourse, subPageId, get().currentInternalPageId);
        const finalPageBoxes = finalSp?.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox') ?? [];
        const finalNewIdx = (finalSp?.elements.find(e => e.id === elementId)?.props as Record<string, unknown> | undefined)?.currentPageIndex as number ?? 0;
        finalPageBoxes.forEach((box, i) => {
          const obj = getObject(box.id);
          if (obj) obj.visible = (i === finalNewIdx);
        });
      },

      /** 缈婚〉:鍒囨崲鎸夐挳绫诲瀷(arrows / tabs / both) */
      changePageTurnButtonType: (elementId: string, newType: 'arrows' | 'tabs' | 'both') => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const ptBox = page.elements.find(e => e.id === elementId);
        if (!ptBox || ptBox.type !== 'PageTurnBox') return;
        const oldType = ((ptBox.props as Record<string, unknown>).buttonType as string) || 'arrows';
        if (oldType === newType) return;

        const pageBoxes = page.elements.filter(e => e.parentId === elementId && e.type === 'ContainerBox');
        const arrows = page.elements.filter(e =>
          e.parentId === elementId && (e.type === 'PageTurnLeftBtn' || e.type === 'PageTurnRightBtn')
        );
        const tabs = page.elements.filter(e => e.parentId === elementId && e.type === 'SpeechSelectableObj');
        const currentIndex = (ptBox.props as Record<string, unknown>).currentPageIndex as number;

        const wantArrows = newType === 'arrows' || newType === 'both';
        const wantTabs = newType === 'tabs' || newType === 'both';

        const idsToDelete = new Set<string>();
        const elementsToAdd: Element[] = [];

        // 鍒犲浣欑殑绠ご
        if (!wantArrows) {
          for (const a of arrows) idsToDelete.add(a.id);
        } else if (arrows.length === 0) {
          // 琛ラ綈绠ご锛氭敞鍏ラ粯璁?actions锛堜笉璁剧疆鍒濆 visible锛岀敱杩愯鏃?initView 鏍规嵁褰撳墠椤靛喅瀹氾級
          const leftBtn = createDefaultElement('PageTurnLeftBtn', subPageId ?? undefined);
          leftBtn.parentId = elementId;
          leftBtn.actions = [{
            id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            event: 'onClick',
            actionType: 'pageTurnPrevOnce',
            targetId: elementId,
            groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          }];
          const rightBtn = createDefaultElement('PageTurnRightBtn', subPageId ?? undefined);
          rightBtn.parentId = elementId;
          rightBtn.actions = [{
            id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            event: 'onClick',
            actionType: 'pageTurnNextOnce',
            targetId: elementId,
            groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          }];
          elementsToAdd.push(leftBtn, rightBtn);
        }

        // 鍒犲浣欑殑鏍囩 / 琛ラ綈缂哄け鐨勬爣绛?
        if (!wantTabs) {
          for (const t of tabs) idsToDelete.add(t.id);
        } else {
          // 姣忛〉閮借鏈夋爣绛?
          const need = pageBoxes.length;
          if (tabs.length < need) {
            for (let i = tabs.length; i < need; i++) {
              const tab = createDefaultElement('SpeechSelectableObj', subPageId ?? undefined);
              tab.parentId = elementId;
              const last = tabs[tabs.length - 1] ?? elementsToAdd.find(e => e.type === 'SpeechSelectableObj');
              if (last) {
                tab.x = last.x + last.width + 10;
                tab.y = last.y;
              } else {
                tab.x = 466 + i * 130;
                tab.y = 366;
              }
              tab.props = { ...tab.props, isSelected: i === currentIndex };
              // 榛樿 1 瀵?1锛氱 i 涓?SelectableObj 璺冲埌绗?i 涓?ContainerBox
              tab.actions = [{
                id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                event: 'onClick',
                actionType: 'pageTurnGoTo',
                targetId: elementId,
                value: i,
                groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              }];
              elementsToAdd.push(tab);
            }
          } else if (tabs.length > need) {
            // 澶氫綑鐨勫垹鎺?浠庡熬閮ㄥ紑濮?
            for (let i = need; i < tabs.length; i++) idsToDelete.add(tabs[i].id);
          }
        }

        set((state) => {
          const p = findCurrentSubPage(state);
          if (!p) return state;
          p.elements = p.elements.filter(e => !idsToDelete.has(e.id));
          for (const el of elementsToAdd) p.elements.push(el);
          const ptEl = p.elements.find(e => e.id === elementId);
          if (ptEl) ptEl.props = { ...ptEl.props, buttonType: newType };
          return state;
        });
        for (const id of idsToDelete) removeObject(id);
        const ptObj = getObject(elementId);
        for (const el of elementsToAdd) {
          const obj = createLayaComponent(el, ptObj);
          if (obj) registerObject(el.id, obj);
        }
      },

      /** 缈婚〉:鎶婃墍鏈夌炕椤垫寜閽?宸?鍙崇澶?+ 鏍囩鎸夐挳)鍦?elements 鏁扮粍閲岀Щ鍒?ContainerBox 鐨勬渶鍓嶆垨鏈€鍚?*/
      movePageTurnButtons: (elementId: string, position: 'top' | 'bottom') => {
        set((state) => {
          const p = findCurrentSubPage(state);
          if (!p) return state;
          const ptBox = p.elements.find(e => e.id === elementId);
          if (!ptBox || ptBox.type !== 'PageTurnBox') return state;
          const isBtn = (e: Element) =>
            e.parentId === elementId &&
            (e.type === 'PageTurnLeftBtn' || e.type === 'PageTurnRightBtn' || e.type === 'SpeechSelectableObj');
          const isPage = (e: Element) =>
            e.parentId === elementId && e.type === 'ContainerBox';
          // 鏀堕泦瀛愬厓绱犵殑浣嶇疆绱㈠紩(瀛愬厓绱?= buttons + pages)
          const childIndices: number[] = [];
          for (let i = 0; i < p.elements.length; i++) {
            const e = p.elements[i];
            if (isBtn(e) || isPage(e)) childIndices.push(i);
          }
          if (childIndices.length === 0) return state;
          const buttons = p.elements.filter(isBtn);
          const pages = p.elements.filter(isPage);
          const ordered = position === 'top' ? [...buttons, ...pages] : [...pages, ...buttons];
          // 鎶?ordered 鍐欏洖鍒板師 childIndices 浣嶇疆(淇濇寔鍏朵粬鍏冪礌浣嶇疆涓嶅彉)
          for (let k = 0; k < childIndices.length; k++) {
            p.elements[childIndices[k]] = ordered[k];
          }
          return state;
        });
      },

      /** 鍙ｆ墠璇鹃€夋嫨棰橈細娣诲姞閫夐」 */
      addChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
        const existingNames = new Set(existingOptions.map(e => e.name));
        // a-z 鐢ㄥ畬鍚庣户缁?aa-zz锛涢鏈熻冻澶熸敮鎾戜换浣曞悎鐞嗚浠?
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        let nextName: string | undefined;
        for (const c of letters) {
          if (!existingNames.has(c)) { nextName = c; break; }
        }
        if (!nextName) {
          outer: for (const a of letters) {
            for (const b of letters) {
              const candidate = a + b;
              if (!existingNames.has(candidate)) { nextName = candidate; break outer; }
            }
          }
        }
        if (!nextName) nextName = `opt_${existingOptions.length + 1}`;

        const lastOpt = existingOptions[existingOptions.length - 1];
        const newOpt = createDefaultElement('SpeechSelectableObj', subPageId ?? undefined);
        newOpt.name = nextName;
        newOpt.parentId = choiceBoxId;
        newOpt.width = 237;
        newOpt.height = 77;
        newOpt.props = {
          ...newOpt.props,
          _foregroundSkin: assetExport('choiceOption.normal'),
          _pressedSkin: assetExport('choiceOption.pressed'),
          _bgSkin: assetExport('choiceOption.selected'),
          _correctSkin: assetExport('choiceOption.correct'),
          _wrongSkin: assetExport('choiceOption.wrong'),
        };
        // 妯悜杩藉姞锛氫笂涓€涓€夐」鍙充晶 +10锛涗笌涓€閿垱寤虹殑妯悜甯冨眬涓€鑷?
        newOpt.x = lastOpt ? lastOpt.x + lastOpt.width + 10 : 50;
        newOpt.y = lastOpt ? lastOpt.y : 50;
        set((state) => {
          const sp = findCurrentSubPage(state);
          if (!sp) return state;
          sp.elements.push(newOpt);
          return state;
        });
        const obj = createLayaComponent(newOpt, getObject(choiceBoxId));
        if (obj) registerObject(newOpt.id, obj);
        get().saveHistory();
      },

      /** 鍙ｆ墠璇鹃€夋嫨棰橈細鍒犻櫎鏈€鍚庝竴涓€夐」 */
      removeChoiceOption: (choiceBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const existingOptions = page.elements.filter(e => e.parentId === choiceBoxId && e.type === 'SpeechSelectableObj');
        if (existingOptions.length === 0) return;
        const lastOpt = existingOptions[existingOptions.length - 1];
        get().deleteElement(lastOpt.id);
      },

      setChoiceCorrectOptionIds: (choiceBoxId: string, optionIds: string[]) => {
        let changed = false;
        set((state) => {
          const page = findCurrentSubPage(state);
          const choiceBox = page?.elements.find((element) => element.id === choiceBoxId && element.type === 'ChoiceBox');
          if (!choiceBox) return;
          applyChoiceCorrectOptionIds(choiceBox, optionIds);
          changed = true;
        });
        if (changed) get().saveHistory();
      },

      /** 濉┖棰橈細娣诲姞杈撳叆鏍?*/
      addFillBlankInput: (klInputBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const existing = page.elements.filter(e => e.parentId === klInputBoxId && e.type === 'KlInputImage');
        const lastOpt = existing[existing.length - 1];
        const newInput = createDefaultElement('KlInputImage', subPageId ?? undefined);
        newInput.parentId = klInputBoxId;
        newInput.x = lastOpt ? lastOpt.x + lastOpt.width + 10 : 0;
        newInput.y = lastOpt ? lastOpt.y : 0;
        // 缁ф壙鍚岀粍閿洏 camp
        if (lastOpt) {
          const lastProps = lastOpt.props as Record<string, unknown>;
          if (lastProps.camp) newInput.props = { ...newInput.props, camp: lastProps.camp };
        }
        set((state) => {
          const sp = findCurrentSubPage(state);
          if (!sp) return state;
          sp.elements.push(newInput);
          return state;
        });
        const obj = createLayaComponent(newInput, getObject(klInputBoxId));
        if (obj) registerObject(newInput.id, obj);
      },

      /** 濉┖棰橈細鍒犻櫎鏈€鍚庝竴涓緭鍏ユ牸 */
      removeFillBlankInput: (klInputBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const existing = page.elements.filter(e => e.parentId === klInputBoxId && e.type === 'KlInputImage');
        if (existing.length <= 1) return;
        const lastOpt = existing[existing.length - 1];
        get().deleteElement(lastOpt.id);
      },

      /** 杩炵嚎棰橈細娣诲姞涓€瀵硅繛绾块」锛堝乏 camp1 + 鍙?camp2锛夛紝浣嶇疆绱ц窡鍚勯樀钀ユ渶鍚庝竴涓?item 涔嬪悗 */
      addMatchingPair: (matchingGameId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const matchingGame = page.elements.find(e => e.id === matchingGameId);
        if (!matchingGame) return;
        const matchBox = page.elements.find(e => e.parentId === matchingGameId && e.type === 'Box');
        if (!matchBox) return;
        const items = page.elements.filter(e => e.parentId === matchBox.id && e.type === 'MatchingItem');
        const camp1Items = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp1');
        const camp2Items = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp2');
        const direction = (matchingGame.props as Record<string, unknown>).direction ?? 0;

        // 鍚勯樀钀ヨ捣濮嬩綅缃紙闃佃惀涓虹┖鏃剁敤榛樿鍊硷級
        // 榛樿鍊间笌 getMatchingLayout(direction=0/1/2) 绗竴涓?item 鐨勪綅缃竴鑷?
        let leftDefaultX: number, leftDefaultY: number, rightDefaultX: number, rightDefaultY: number;
        // 娌跨潃鍝釜鏂瑰悜杩藉姞
        let appendDir: 'down' | 'right';
        if (direction === 1) {
          // 涓婁笅杩炵嚎锛氫笂鏂归樀钀?(860,300) 璧峰锛屾í鍚戣拷鍔狅紙x+100锛?
          leftDefaultX = 860; leftDefaultY = 300;
          rightDefaultX = 860; rightDefaultY = 780;
          appendDir = 'right';
        } else {
          // 宸﹀彸 / 涓績鐐硅繛绾匡細宸︿晶闃佃惀 (750,450) 璧峰锛岀旱鍚戣拷鍔狅紙y+90锛?
          leftDefaultX = 750; leftDefaultY = 450;
          rightDefaultX = 1130; rightDefaultY = 450;
          appendDir = 'down';
        }

        // 鍛藉悕瑙勫垯锛氭壂鎻?matchBox 涓嬪凡鐢ㄥ簭鍙凤紝鍙栨渶澶?1锛堜腑蹇冪偣妯″紡涓嬪鍋跺垎娴侊紝姣忚竟姝ヨ繘 2锛?
        let leftName: string, rightName: string;
        if (direction === 1) {
          leftName = getNextNumberedName('t', page.elements, matchBox.id);
          rightName = getNextNumberedName('b', page.elements, matchBox.id);
        } else if (direction === 2) {
          leftName = getNextItemNameForCenterMatch(page.elements, matchBox.id, 'camp1');
          rightName = getNextItemNameForCenterMatch(page.elements, matchBox.id, 'camp2');
        } else {
          leftName = getNextNumberedName('l', page.elements, matchBox.id);
          rightName = getNextNumberedName('r', page.elements, matchBox.id);
        }

        // 绱ц窡鍚勯樀钀ユ渶鍚庝竴涓?item锛氱旱鍚?+90锛屾í鍚?+100
        const lastLeft = camp1Items[camp1Items.length - 1];
        const lastRight = camp2Items[camp2Items.length - 1];
        const leftX = lastLeft ? (appendDir === 'down' ? lastLeft.x : lastLeft.x + 100) : leftDefaultX;
        const leftY = lastLeft ? (appendDir === 'down' ? lastLeft.y + 90 : lastLeft.y) : leftDefaultY;
        const rightX = lastRight ? (appendDir === 'down' ? lastRight.x : lastRight.x + 100) : rightDefaultX;
        const rightY = lastRight ? (appendDir === 'down' ? lastRight.y + 90 : lastRight.y) : rightDefaultY;

        const leftItem = createDefaultElement('MatchingItem', subPageId ?? undefined);
        leftItem.parentId = matchBox.id;
        leftItem.name = leftName;
        leftItem.x = leftX;
        leftItem.y = leftY;
        leftItem.props = { ...leftItem.props, camp: 'camp1', connectableCamps: 'camp2', rightItemNames: '' };

        const rightItem = createDefaultElement('MatchingItem', subPageId ?? undefined);
        rightItem.parentId = matchBox.id;
        rightItem.name = rightName;
        rightItem.x = rightX;
        rightItem.y = rightY;
        rightItem.props = { ...rightItem.props, camp: 'camp2', connectableCamps: 'camp1', rightItemNames: '' };

        set((state) => {
          const sp = findCurrentSubPage(state);
          if (!sp) return state;
          // 鍏冪礌鍒楄〃椤哄簭锛氬乏 item 鎻掑叆鍒?camp1 鏈€鍚庝竴涓箣鍚庯紱鍙?item 鎻掑叆鍒?camp2 鏈€鍚庝竴涓箣鍚?
          // camp1 涓虹┖鏃舵彃鍏ュ埌 matchBox 涔嬪悗锛沜amp2 涓虹┖鏃舵彃鍏ュ埌 leftItem 涔嬪悗
          const arr = sp.elements;
          const matchBoxIdx = arr.findIndex(e => e.id === matchBox.id);
          // 璁＄畻 leftItem 鎻掑叆浣嶇疆
          let leftInsertIdx: number;
          if (camp1Items.length > 0) {
            const lastCamp1Id = camp1Items[camp1Items.length - 1].id;
            leftInsertIdx = arr.findIndex(e => e.id === lastCamp1Id) + 1;
          } else {
            leftInsertIdx = matchBoxIdx + 1;
          }
          arr.splice(leftInsertIdx, 0, leftItem);
          // 璁＄畻 rightItem 鎻掑叆浣嶇疆锛坙eftItem 宸叉彃鍏ワ紝绱㈠紩鍙兘鍚庣Щ锛?
          let rightInsertIdx: number;
          if (camp2Items.length > 0) {
            const lastCamp2Id = camp2Items[camp2Items.length - 1].id;
            rightInsertIdx = arr.findIndex(e => e.id === lastCamp2Id) + 1;
          } else {
            // camp2 涓虹┖锛氭斁鍦?leftItem 涔嬪悗
            rightInsertIdx = arr.findIndex(e => e.id === leftItem.id) + 1;
          }
          arr.splice(rightInsertIdx, 0, rightItem);
          return state;
        });
        const boxObj = getObject(matchBox.id);
        const leftObj = createLayaComponent(leftItem, boxObj);
        if (leftObj) registerObject(leftItem.id, leftObj);
        const rightObj = createLayaComponent(rightItem, boxObj);
        if (rightObj) registerObject(rightItem.id, rightObj);
      },

      /** 杩炵嚎棰橈細鍒犻櫎鏈€鍚庝竴瀵硅繛绾块」锛坈amp1 鏈€鍚庝竴涓?+ camp2 鏈€鍚庝竴涓級 */
      removeMatchingPair: (matchingGameId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        if (!page) return;
        const matchBox = page.elements.find(e => e.parentId === matchingGameId && e.type === 'Box');
        if (!matchBox) return;
        const items = page.elements.filter(e => e.parentId === matchBox.id && e.type === 'MatchingItem');
        const camp1Items = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp1');
        const camp2Items = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp2');
        // 涓よ竟閮戒负绌烘椂鏃犲彲鍒犻」
        if (camp1Items.length === 0 && camp2Items.length === 0) return;
        // 鍚勮嚜鍒犻櫎鏈€鍚庝竴涓紙鍏佽鍏ㄥ垹锛?
        if (camp1Items.length > 0) {
          get().deleteElement(camp1Items[camp1Items.length - 1].id);
        }
        if (camp2Items.length > 0) {
          get().deleteElement(camp2Items[camp2Items.length - 1].id);
        }
      },

      addDropObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        const dropbox = page?.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDropBox');
        if (!page || !dropbox) return;
        const existing = page.elements.filter(e => e.parentId === dropbox.id && e.type === 'DropObj');
        const last = existing[existing.length - 1];
        const newEl = createDefaultElement('DropObj', subPageId);
        newEl.name = getNextNumberedName('dj', page.elements, dropbox.id);
        newEl.parentId = dropbox.id;
        newEl.x = last ? last.x + 280 : 606;
        newEl.y = last ? last.y : 445;
        if (newEl.x > 1700) { newEl.x = 606; newEl.y = (last?.y ?? 445) + 220; }
        newEl.props = { ...newEl.props, var: newEl.name };
        set((state) => { findCurrentSubPage(state)?.elements.push(newEl); });
        const obj = createLayaComponent(newEl, getObject(dropbox.id));
        if (obj) registerObject(newEl.id, obj);
      },

      removeDropObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        const dropbox = page?.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDropBox');
        if (!page || !dropbox) return;
        const existing = page.elements.filter(e => e.parentId === dropbox.id && e.type === 'DropObj');
        if (existing.length > 0) get().deleteElement(existing[existing.length - 1].id);
      },

      addDragObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        const dragbox = page?.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDragBox');
        if (!page || !dragbox) return;
        const existing = page.elements.filter(e => e.parentId === dragbox.id && e.type === 'DragObj');
        const last = existing[existing.length - 1];
        const newEl = createDefaultElement('DragObj', subPageId);
        newEl.name = getNextNumberedName('aj', page.elements, dragbox.id);
        newEl.parentId = dragbox.id;
        newEl.x = last ? last.x + 280 : 606;
        newEl.y = last ? last.y : 734;
        if (newEl.x > 1700) { newEl.x = 606; newEl.y = (last?.y ?? 734) + 220; }
        newEl.props = { ...newEl.props, var: newEl.name };
        set((state) => { findCurrentSubPage(state)?.elements.push(newEl); });
        const obj = createLayaComponent(newEl, getObject(dragbox.id));
        if (obj) registerObject(newEl.id, obj);
      },

      removeDragObj: (dragViewBoxId: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;
        const page = findActiveElementPage(course, subPageId, get().currentInternalPageId);
        const dragbox = page?.elements.find(e => e.parentId === dragViewBoxId && e.type === 'DragDragBox');
        if (!page || !dragbox) return;
        const existing = page.elements.filter(e => e.parentId === dragbox.id && e.type === 'DragObj');
        if (existing.length === 0) return;
        const last = existing[existing.length - 1];
        const children = page.elements.filter(e => e.parentId === last.id);
        for (const child of children) get().deleteElement(child.id);
        get().deleteElement(last.id);
      },

      setProxySkin: (parentId: string, skinValue: string) => {
        const subPageId = get().currentSubPageId;
        const internalPageId = get().currentInternalPageId;
        if (!subPageId) return;
        const trimmed = (skinValue ?? '').trim();

        // 鏇存柊 props.skin
        set((state) => {
          const sp = findSubPage(state.currentCourse, subPageId);
          const p = sp ? getElementPage(sp, internalPageId).elements.find(e => e.id === parentId) : undefined;
          if (!p) return state;
          (p.props as Record<string, unknown>).skin = trimmed;
          (p.props as Record<string, unknown>)._skinLoadToken = (((p.props as Record<string, unknown>)._skinLoadToken as number) ?? 0) + 1;
          return state;
        });

        if (!trimmed) return;

        // 璇诲彇褰撳墠 token
        const getToken = () => {
          const cur = get().currentCourse;
          if (!cur) return -1;
          const el = findActiveElementPage(cur, subPageId, internalPageId)?.elements.find(e => e.id === parentId);
          if (el) return ((el.props as Record<string, unknown>)._skinLoadToken as number) ?? 0;
          return -1;
        };
        const token = getToken();

        loadImageSize(trimmed).then(size => {
          if (!size) return;
          if (getToken() !== token) return;
          set((state) => {
            const sp = findSubPage(state.currentCourse, subPageId);
            const p = sp ? getElementPage(sp, internalPageId).elements.find(e => e.id === parentId) : undefined;
            if (!p) return state;
            p.width = size.w; p.height = size.h;
            (p.props as Record<string, unknown>).pivotX = size.w / 2;
            (p.props as Record<string, unknown>).pivotY = size.h / 2;
            return state;
          });
        });
      },

      alignDragChildren: (containerId: string, childType: string, action: 'alignH' | 'alignV' | 'spaceH' | 'spaceV', spacing?: number) => {
        set((state) => {
          const page = findCurrentSubPage(state);
          if (!page) return;
          const container = page.elements.find(e => e.id === containerId);
          if (!container) return;
          const slot = page.elements.find(e => e.parentId === containerId && e.type === childType);
          if (!slot) return;
          const children = page.elements.filter(e => e.parentId === slot.id);
          if (children.length < 2) return;
          const sorted = [...children];
          switch (action) {
            case 'alignH': {
              const sorted = [...children].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
              const cy = sorted[0].y + sorted[0].height / 2;
              children.forEach(e => { e.y = Math.round(cy - e.height / 2); });
              break;
            }
            case 'alignV': {
              const sorted = [...children].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
              const cx = sorted[0].x + sorted[0].width / 2;
              children.forEach(e => { e.x = Math.round(cx - e.width / 2); });
              break;
            }
            case 'spaceH': {
              const gap = spacing ?? 0;
              sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
              let x = sorted[0].x;
              sorted.forEach(e => { e.x = Math.round(x); x += e.width + gap; });
              break;
            }
            case 'spaceV': {
              const gap = spacing ?? 0;
              sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
              let y = sorted[0].y;
              sorted.forEach(e => { e.y = Math.round(y); y += e.height + gap; });
              break;
            }
          }
        });
      },

      alignMatchingItems: (matchingGameId: string, camp: 'camp1' | 'camp2', action: 'alignH' | 'alignV' | 'spaceH' | 'spaceV', spacing?: number) => {
        set((state) => {
          const page = findCurrentSubPage(state);
          if (!page) return;
          const matchBox = page.elements.find(e => e.parentId === matchingGameId && e.type === 'Box');
          if (!matchBox) return;
          const items = page.elements.filter(e =>
            e.parentId === matchBox.id
            && e.type === 'MatchingItem'
            && (e.props as Record<string, unknown>)?.camp === camp
          );
          if (items.length < 2) return;
          const sorted = [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }));
          switch (action) {
            case 'alignH': {
              const cy = sorted[0].y + sorted[0].height / 2;
              items.forEach(e => { e.y = Math.round(cy - e.height / 2); });
              break;
            }
            case 'alignV': {
              const cx = sorted[0].x + sorted[0].width / 2;
              items.forEach(e => { e.x = Math.round(cx - e.width / 2); });
              break;
            }
            case 'spaceH': {
              const gap = spacing ?? 0;
              let x = sorted[0].x;
              sorted.forEach(e => { e.x = Math.round(x); x += e.width + gap; });
              break;
            }
            case 'spaceV': {
              const gap = spacing ?? 0;
              let y = sorted[0].y;
              sorted.forEach(e => { e.y = Math.round(y); y += e.height + gap; });
              break;
            }
          }
        });
      },

      alignDropObjToSkin: (elementId: string, propKey: 'skin' | 'tipSkin') => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        const internalPageId = get().currentInternalPageId;
        if (!course || !subPageId) return;
        const el = findActiveElementPage(course, subPageId, internalPageId)?.elements.find(e => e.id === elementId);
        if (!el) return;
        const skinPath = (el.props as Record<string, unknown>)?.[propKey] as string | undefined;
        if (!skinPath) return;

        const applySize = (w: number, h: number) => {
          set((state) => {
            const sp = findSubPage(state.currentCourse, subPageId);
            const target = sp ? getElementPage(sp, internalPageId).elements.find(e => e.id === elementId) : undefined;
            if (!target) return state;
            target.width = w;
            target.height = h;
            return state;
          });
        };

        if (skinPath.startsWith('images/')) {
          import('../utils/electronFs').then(({ readFileAsDataUrl: readFile }) => {
            const courseId = course.id;
            readFile(courseId, skinPath).then(dataUrl => {
              if (!dataUrl) return;
              const img = new window.Image();
              img.onload = () => applySize(img.naturalWidth, img.naturalHeight);
              img.src = dataUrl;
            });
          });
        } else {
          const img = new window.Image();
          img.onload = () => applySize(img.naturalWidth, img.naturalHeight);
          img.src = skinPath;
        }
      },
  }))
);

/** 宸ュ叿鍑芥暟锛氫粠褰撳墠 store 鐘舵€佹壘鍒板綋鍓?SubPage锛堝閮ㄨ鍙栫敤锛岃鍕夸慨鏀硅繑鍥炲€硷級 */
export function getCurrentSubPage(state: { currentCourse: Course | null; currentSubPageId: string | null }): SubPage | null {
  if (!state.currentCourse || !state.currentSubPageId) return null;
  for (const stage of state.currentCourse.stages) {
    const sp = stage.subPages.find((s) => s.id === state.currentSubPageId);
    if (sp) return sp;
  }
  for (const stage of (state.currentCourse.previewStages ?? [])) {
    const sp = stage.subPages.find((s) => s.id === state.currentSubPageId);
    if (sp) return sp;
  }
  return null;
}

/** 宸ュ叿鍑芥暟锛氫粠璇句欢涓壘鍒板寘鍚寚瀹?subPage 鐨?stage */
export function getStageOfSubPage(course: Course | null, subPageId: string | null): Stage | null {
  return findStageOfSubPage(course, subPageId);
}
