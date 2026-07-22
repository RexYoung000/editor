import { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { createDefaultElement, decrementSubPageCounter, elementMeta, CATEGORIES } from '../elements/elementMeta';
import { createLayaComponent, registerObject, getObject } from '../utils/layaBridge';
import { assetExport } from '../elements/builtinAssets';
import { useI18n } from '../i18n/context';
import { translateLabel } from '../elements/elementMetaI18n';
import KeyboardPresetDialog from './KeyboardPresetDialog';
import type { KeyboardPreset } from '../elements/keyboardPresets';
import { KEYBOARD_PRESETS } from '../elements/keyboardPresets';
import { isFlatLesson } from '../utils/courseKind';
import { downloadLibraryFile, readFileAsDataUrl } from '../utils/electronFs';
import { showToast } from '../utils/toast';
import QuickPresetDialog, { type QuickPreset, type QuickPresetKind } from './QuickPresetDialog';
import type { Action, Element } from '../types';
import { findActiveElementPage, getElementPages, isInternalPagesWorkbenchReadonly, type ElementPageRef } from '../utils/internalPages';
import { keyboardCamp, keyboardPresetId, keyboardSupportsInput, nextKeyboardCamp } from '../utils/keyboardBinding';
import { isInputRuleHost } from '../utils/inputAnswerRules';

const QUICK_PRESET_BUTTONS: Array<{ kind: QuickPresetKind; label: string }> = [
  { kind: 'confirm', label: '确定' },
  { kind: 'previous', label: '上一页' },
  { kind: 'next', label: '下一页' },
  { kind: 'audio', label: '播放/音频' },
  { kind: 'brush', label: '画笔' },
  { kind: 'clear', label: '清空' },
];

const QUICK_PRESET_REPLACED_TYPES = new Set(['SoundButton', 'ConfirmButton', 'NewBrushSprite']);

function makeId(prefix: string): string {
  return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function readNaturalSize(courseId: string, relativePath: string): Promise<{ width: number; height: number } | null> {
  const dataUrl = await readFileAsDataUrl(courseId, relativePath);
  if (!dataUrl) return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0
      ? { width: image.naturalWidth, height: image.naturalHeight }
      : null);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function currentElementPage(): ElementPageRef | null {
  const state = useEditorStore.getState();
  return findActiveElementPage(
    state.currentCourse,
    state.currentSubPageId,
    state.currentInternalPageId,
  );
}

async function findRelatedPreset(kind: 'brush' | 'clear', source: QuickPreset): Promise<QuickPreset | null> {
  const response = await fetch(`/api/library/quick-presets?kind=${kind}`);
  if (!response.ok) return null;
  const data = await response.json() as { presets?: QuickPreset[] };
  const candidates = data.presets ?? [];
  const exactDirectory = candidates.find((item) => item.directory === source.directory);
  if (exactDirectory) return exactDirectory;
  return candidates.find((item) =>
    item.series === source.series
    && item.color === source.color
    && item.language === source.language
    && item.theme === source.theme,
  ) ?? null;
}

/** 连线题：根据 direction 给前3个、后3个 MatchingItem 分配位置和 name */
type MatchingLayoutItem = { x: number; y: number; name: string };
type MatchingLayout = { items: MatchingLayoutItem[] };

function getMatchingLayout(direction: 0 | 1 | 2): MatchingLayout {
  if (direction === 0) {
    return { items: [
      { x: 750,  y: 450, name: 'l1' },
      { x: 750,  y: 540, name: 'l2' },
      { x: 750,  y: 630, name: 'l3' },
      { x: 1130, y: 450, name: 'r1' },
      { x: 1130, y: 540, name: 'r2' },
      { x: 1130, y: 630, name: 'r3' },
    ] };
  }
  if (direction === 1) {
    return { items: [
      { x: 860,  y: 300, name: 't1' },
      { x: 960,  y: 300, name: 't2' },
      { x: 1060, y: 300, name: 't3' },
      { x: 860,  y: 780, name: 'b1' },
      { x: 960,  y: 780, name: 'b2' },
      { x: 1060, y: 780, name: 'b3' },
    ] };
  }
  // direction === 2 中心点：位置同左右，命名 item1/3/5（左）和 item2/4/6（右）
  return { items: [
    { x: 750,  y: 450, name: 'item1' },
    { x: 750,  y: 540, name: 'item3' },
    { x: 750,  y: 630, name: 'item5' },
    { x: 1130, y: 450, name: 'item2' },
    { x: 1130, y: 540, name: 'item4' },
    { x: 1130, y: 630, name: 'item6' },
  ] };
}

export default function ElementToolbar() {
  const { language } = useI18n();
  const addElement = useEditorStore((s) => s.addElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const selectElement = useEditorStore((s) => s.selectElement);
  const frozen = useEditorStore((s) => {
    const course = s.currentCourse;
    if (!course) return true;
    if (!s.currentSubPageId) return true;
    if (isInternalPagesWorkbenchReadonly(course, s.currentSubPageId, s.focusSubPageId)) return true;
    for (const stage of course.stages) {
      for (const page of stage.subPages) {
        if (page.id === s.currentSubPageId) return !!page.frozen;
      }
    }
    for (const stage of (course.previewStages ?? [])) {
      for (const page of stage.subPages) {
        if (page.id === s.currentSubPageId) return !!page.frozen;
      }
    }
    return true;
  });
    const [activeTab, setActiveTab] = useState('commonComponents');
  const [keyboardDialogOpen, setKeyboardDialogOpen] = useState(false);
  const [pendingKeyboardInputId, setPendingKeyboardInputId] = useState<string | null>(null);
  const [pendingKeyboardInputType, setPendingKeyboardInputType] = useState<string | null>(null);
  const [quickPresetOpen, setQuickPresetOpen] = useState(false);
  const [quickPresetKind, setQuickPresetKind] = useState<QuickPresetKind>('confirm');
  const [quickPresetBusy, setQuickPresetBusy] = useState(false);

  const findExistingKeyboardCamp = (presetId: string, inputType: string): string | undefined => {
    const state = useEditorStore.getState();
    const page = findActiveElementPage(state.currentCourse, state.currentSubPageId, state.currentInternalPageId);
    const keyboards = (page?.elements ?? []).filter((element) =>
      element.type === 'KlBaseKeyboard' && keyboardSupportsInput(element, inputType, page?.elements ?? []));
    const keyboard = keyboards.find((element) => keyboardPresetId(element, page?.elements ?? []) === presetId)
      ?? keyboards.find((element) => !keyboardPresetId(element, page?.elements ?? []));
    if (!keyboard || !page) return undefined;
    const existingCamp = keyboardCamp(keyboard);
    if (existingCamp) return existingCamp;
    const camp = nextKeyboardCamp(page.elements);
    updateElement(keyboard.id, { props: { ...keyboard.props, camp } });
    return camp;
  };

  const addKeyboardFromPreset = (preset: KeyboardPreset, shouldSelect: boolean): string => {
    const state = useEditorStore.getState();
    const currentSubPageId = state.currentSubPageId;
    let maxIdx = 0;
    if (state.currentCourse && currentSubPageId) {
      const re = new RegExp(`^${preset.campPrefix}-(\\d+)$`);
      const page = findActiveElementPage(state.currentCourse, currentSubPageId, state.currentInternalPageId);
      for (const element of page?.elements ?? []) {
        const props = element.props as { _keyboardPreset?: { id?: string }; camp?: unknown } | undefined;
        if (props?._keyboardPreset?.id !== preset.id) continue;
        const match = String(props.camp ?? '').match(re);
        if (match) {
          const index = Number(match[1]);
          if (index > maxIdx) maxIdx = index;
        }
      }
    }
    const camp = `${preset.campPrefix}-${maxIdx + 1}`;
    const subPageId = currentSubPageId ?? undefined;
    const element = createDefaultElement('KlBaseKeyboard', subPageId);
    element.width = preset.defaultSize.width;
    element.height = preset.defaultSize.height;
    element.props = {
      ...preset.defaultProps,
      camp,
      _keyboardPreset: { id: preset.id },
    };
    const obj = createLayaComponent(element);
    if (obj) registerObject(element.id, obj);
    addElement(element);
    if (shouldSelect) selectElement(element.id, false);
    return camp;
  };

  const handleAdd = (type: string) => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    if (type === 'KlBaseKeyboard') {
      setPendingKeyboardInputId(null);
      setPendingKeyboardInputType(null);
      setKeyboardDialogOpen(true);
      return;
    }
    if (type === 'NewBrushSprite') {
      handleAddBrush();
      return;
    }
    const element = createDefaultElement(type, subPageId);
    let needsKeyboardChoice = false;

    if (type === 'KlInputImage') {
      const preset = KEYBOARD_PRESETS.find((item) => item.id === 'preset2');
      if (preset) {
        const camp = findExistingKeyboardCamp(preset.id, type);
        if (camp) element.props = { ...element.props, camp };
        else needsKeyboardChoice = true;
      }
    }

    if (type === 'FractionInput') {
      const preset = KEYBOARD_PRESETS.find((item) => item.id === 'fraction');
      const camp = preset ? findExistingKeyboardCamp(preset.id, type) : undefined;
      if (camp) element.props = { ...element.props, camp };
      else needsKeyboardChoice = true;
    }

    const obj = createLayaComponent(element);
    if (obj) registerObject(element.id, obj);
    addElement(element);
    selectElement(element.id, false);
    if (needsKeyboardChoice) {
      setPendingKeyboardInputId(element.id);
      setPendingKeyboardInputType(type);
      setKeyboardDialogOpen(true);
    }
  };

  const handlePresetSelected = (preset: KeyboardPreset) => {
    if (pendingKeyboardInputId) {
      const camp = addKeyboardFromPreset(preset, false);
      const page = currentElementPage();
      const input = page?.elements.find((element) => element.id === pendingKeyboardInputId);
      if (input) updateElement(input.id, { props: { ...input.props, camp } });
      selectElement(pendingKeyboardInputId, false);
      setPendingKeyboardInputId(null);
      setPendingKeyboardInputType(null);
      setKeyboardDialogOpen(false);
      return;
    }

    addKeyboardFromPreset(preset, true);
    setKeyboardDialogOpen(false);
  };

  const handleKeyboardDialogClose = () => {
    if (pendingKeyboardInputId) {
      showToast('输入框已保留，请在属性面板中绑定键盘', 'warning');
      setPendingKeyboardInputId(null);
      setPendingKeyboardInputType(null);
    }
    setKeyboardDialogOpen(false);
  };

  /** 翻页组件:一次创建 PageTurnBox + 第一页 ContainerBox + 左/右箭头 + 第一页标签按钮 */
  const handleAddPageTurn = () => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;

    const ptBox = createDefaultElement('PageTurnBox', subPageId);

    const pageBox = createDefaultElement('ContainerBox', subPageId);
    pageBox.parentId = ptBox.id;
    pageBox.props = { ...pageBox.props, visible: true };

    const leftBtn = createDefaultElement('PageTurnLeftBtn', subPageId);
    leftBtn.parentId = ptBox.id;
    leftBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event: 'onClick',
      actionType: 'pageTurnPrevOnce',
      targetId: ptBox.id,
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }];

    const rightBtn = createDefaultElement('PageTurnRightBtn', subPageId);
    rightBtn.parentId = ptBox.id;
    rightBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      event: 'onClick',
      actionType: 'pageTurnNextOnce',
      targetId: ptBox.id,
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }];

    const tabBtn = createDefaultElement('SpeechSelectableObj', subPageId);
    tabBtn.parentId = ptBox.id;
    tabBtn.x = 466;
    tabBtn.y = 366;
    tabBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event: 'onClick',
      actionType: 'pageTurnGoTo',
      targetId: ptBox.id,
      value: 0,
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }];

    const ptObj = createLayaComponent(ptBox);
    if (ptObj) registerObject(ptBox.id, ptObj);
    const pageObj = createLayaComponent(pageBox, ptObj);
    if (pageObj) registerObject(pageBox.id, pageObj);
    const leftObj = createLayaComponent(leftBtn, ptObj);
    if (leftObj) registerObject(leftBtn.id, leftObj);
    const rightObj = createLayaComponent(rightBtn, ptObj);
    if (rightObj) registerObject(rightBtn.id, rightObj);
    const tabObj = createLayaComponent(tabBtn, ptObj);
    if (tabObj) registerObject(tabBtn.id, tabObj);

    addElement(ptBox);
    addElement(pageBox);
    addElement(leftBtn);
    addElement(rightBtn);
    addElement(tabBtn);
    selectElement(ptBox.id, false);
  };

  /** 画笔组件：一次创建 NewBrushSprite Box + 画笔开关 + 清空按钮 */
  const handleAddBrush = () => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;

    const brushBox = createDefaultElement('NewBrushSprite', subPageId);
    const drawBtn  = createDefaultElement('BrushDrawBtn', subPageId);
    const clearBtn = createDefaultElement('BrushClearBtn', subPageId);
    drawBtn.parentId  = brushBox.id;
    clearBtn.parentId = brushBox.id;

    // 默认给 NewBrushSprite 加上"初始化画笔功能"事件
    brushBox.actions = [{
      id: makeId('action'),
      event: 'onInitBrush',
      actionType: 'none',
      groupId: makeId('group'),
    }];

    const boxObj = createLayaComponent(brushBox);
    if (boxObj) registerObject(brushBox.id, boxObj);
    const drawObj = createLayaComponent(drawBtn, boxObj);
    if (drawObj) registerObject(drawBtn.id, drawObj);
    const clearObj = createLayaComponent(clearBtn, boxObj);
    if (clearObj) registerObject(clearBtn.id, clearObj);

    addElement(brushBox);
    addElement(drawBtn);
    addElement(clearBtn);
    selectElement(brushBox.id, false);
  };

  /** 选择题：
   *  - 正课：ChoiceBox + 4个选项卡片 + ConfirmButton（预设 onClickInitConfirmWithLock）
   *  - 作业：ChoiceBox + 4个选项卡片，不要 ConfirmButton；
   *          为 ChoiceBox 预置 3 条空动作组（自动判定-全对/没有全对/还没有选择，actionType='none'） */
  const handleAddChoice = () => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    const isFlat = isFlatLesson(useEditorStore.getState().currentCourse?.kind);
    const choiceBox = createDefaultElement('ChoiceBox', subPageId);

    const optionNames = ['a', 'b', 'c', 'd'];
    const positions = [
      { x: 343, y: 938 }, { x: 714, y: 938 },
      { x: 1085, y: 938 }, { x: 1456, y: 938 },
    ];
    const options = optionNames.map((name, i) => {
      const opt = createDefaultElement('SpeechSelectableObj', subPageId);
      opt.name = name;
      opt.x = positions[i].x;
      opt.y = positions[i].y;
      opt.width = 237;
      opt.height = 77;
      opt.parentId = choiceBox.id;
      opt.props = {
        ...opt.props,
        _foregroundSkin: assetExport('choiceOption.normal'),
        _pressedSkin: assetExport('choiceOption.pressed'),
        _bgSkin: assetExport('choiceOption.selected'),
        _correctSkin: assetExport('choiceOption.correct'),
        _wrongSkin: assetExport('choiceOption.wrong'),
      };
      return opt;
    });

    if (isFlat) {
      // 作业：给 ChoiceBox 预置 onChoiceJudge 事件（含 right + wrong + null 三个子事件，actionType='none'）
      const mkId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const groupId = mkId();
      choiceBox.actions = [
        { id: mkId(), event: 'onChoiceJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'right' },
        { id: mkId(), event: 'onChoiceJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'wrong' },
        { id: mkId(), event: 'onChoiceJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'null' },
      ];

      const choiceObj = createLayaComponent(choiceBox);
      if (choiceObj) registerObject(choiceBox.id, choiceObj);
      addElement(choiceBox);

      options.forEach(opt => {
        const obj = createLayaComponent(opt, choiceObj);
        if (obj) registerObject(opt.id, obj);
        addElement(opt);
      });

      selectElement(choiceBox.id, false);
      return;
    }

    // 正课：保留 ConfirmButton 原逻辑
    const confirmBtn = createDefaultElement('ConfirmButton', subPageId);
    confirmBtn.x = 1666;
    confirmBtn.y = 960;
    confirmBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event: 'onClickInitConfirmWithLock',
      targetId: choiceBox.id,
      targetNameSnapshot: choiceBox.name,
      actionType: 'toggleVisible',
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }];

    const choiceObj = createLayaComponent(choiceBox);
    if (choiceObj) registerObject(choiceBox.id, choiceObj);
    addElement(choiceBox);

    options.forEach(opt => {
      const obj = createLayaComponent(opt, choiceObj);
      if (obj) registerObject(opt.id, obj);
      addElement(opt);
    });

    const confirmObj = createLayaComponent(confirmBtn);
    if (confirmObj) registerObject(confirmBtn.id, confirmObj);
    addElement(confirmBtn);

    selectElement(choiceBox.id, false);
  };

  /** 填空题：
   *  - 正课：KlInputBox + 1个 KlInputImage + 自动绑定键盘2 + ConfirmButton（预设 onClickInitConfirmWithLock）
   *  - 作业：KlInputBox + 1个 KlInputImage + 自动绑定键盘2，不要 ConfirmButton；
   *          为 KlInputBox 预置 3 条空动作组（自动判定-全对/没有全对/还没有填写，actionType='none'） */
  const handleAddFillBlank = () => {
    if (frozen) return;
    const course = useEditorStore.getState().currentCourse;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    const isFlat = isFlatLesson(course?.kind);

    // 优先复用当前页面已有的兼容键盘（包括没有 _keyboardPreset 的旧键盘）。
    const preset2 = KEYBOARD_PRESETS.find(p => p.id === 'preset2');
    let kbCamp: string | undefined = preset2 ? findExistingKeyboardCamp(preset2.id, 'KlInputImage') : undefined;
    if (!kbCamp) {
      if (preset2) {
        let maxIdx = 0;
        if (course) {
          const re = new RegExp(`^${preset2.campPrefix}-(\\d+)$`);
          for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
            for (const page of stage.subPages) {
              for (const elementPage of getElementPages(page)) for (const el of elementPage.elements) {
                const p = el.props as { _keyboardPreset?: { id?: string }; camp?: unknown } | undefined;
                if (p?._keyboardPreset?.id !== preset2.id) continue;
                const camp = typeof p.camp === 'string' ? p.camp : '';
                const m = camp.match(re);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxIdx) maxIdx = n;
                }
              }
            }
          }
        }
        kbCamp = `${preset2.campPrefix}-${maxIdx + 1}`;
        const kbElement = createDefaultElement('KlBaseKeyboard', subPageId);
        kbElement.width = preset2.defaultSize.width;
        kbElement.height = preset2.defaultSize.height;
        kbElement.x = Math.round((1920 - preset2.defaultSize.width) / 2);
        kbElement.y = 1080 - preset2.defaultSize.height;
        kbElement.props = {
          ...preset2.defaultProps,
          camp: kbCamp,
          _keyboardPreset: { id: preset2.id },
        };
        const kbObj = createLayaComponent(kbElement);
        if (kbObj) registerObject(kbElement.id, kbObj);
        addElement(kbElement);
      }
    }

    // 创建 KlInputBox 容器
    const inputBox = createDefaultElement('KlInputBox', subPageId);

    if (isFlat) {
      // 作业：给 KlInputBox 预置 onInputJudge 事件（含 right + wrong + null 三个子事件，actionType='none'）
      const mkId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const groupId = mkId();
      inputBox.actions = [
        { id: mkId(), event: 'onInputJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'right' },
        { id: mkId(), event: 'onInputJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'wrong' },
        { id: mkId(), event: 'onInputJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'null' },
      ];
    }

    const inputBoxObj = createLayaComponent(inputBox);
    if (inputBoxObj) registerObject(inputBox.id, inputBoxObj);
    addElement(inputBox);

    // 创建第一个 KlInputImage 子节点
    const firstInput = createDefaultElement('KlInputImage', subPageId);
    firstInput.parentId = inputBox.id;
    firstInput.x = 366;
    firstInput.y = 366;
    if (kbCamp) firstInput.props = { ...firstInput.props, camp: kbCamp };
    const inputObj = createLayaComponent(firstInput, inputBoxObj);
    if (inputObj) registerObject(firstInput.id, inputObj);
    addElement(firstInput);

    if (isFlat) {
      // 作业：不创建 ConfirmButton
      selectElement(inputBox.id, false);
      return;
    }

    // 正课：创建确定按钮（顶级元素，与 KlInputBox 同级）
    const confirmBtn = createDefaultElement('ConfirmButton', subPageId);
    confirmBtn.x = 1666;
    confirmBtn.y = 960;
    confirmBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event: 'onClickInitConfirmWithLock',
      targetId: inputBox.id,
      targetNameSnapshot: inputBox.name,
      actionType: 'toggleVisible',
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }];
    const confirmObj = createLayaComponent(confirmBtn);
    if (confirmObj) registerObject(confirmBtn.id, confirmObj);
    addElement(confirmBtn);

    selectElement(inputBox.id, false);
  };

  /** 连线题：MatchingGame + MatchBox + 6 个 MatchingItem
   *  - 正课/预习：额外创建 ConfirmButton（绑 onClickInitGameConfirmWithLock，target 指向 MatchingGame）
   *  - 作业：不创建 ConfirmButton */
  const handleAddMatching = () => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    const isFlat = isFlatLesson(useEditorStore.getState().currentCourse?.kind);

    // 1. 创建 MatchingGame 容器
    const matchingGame = createDefaultElement('MatchingGame', subPageId);

    // 作业模式：预置 onMatchingJudge 事件
    if (isFlat) {
      const mkId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const groupId = mkId();
      matchingGame.actions = [
        { id: mkId(), event: 'onMatchingJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'right' },
        { id: mkId(), event: 'onMatchingJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'wrong' },
        { id: mkId(), event: 'onMatchingJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'null' },
      ];
    }

    // 2. 创建 MatchBox 中间层
    const matchBox = createDefaultElement('Box', subPageId);
    matchBox.parentId = matchingGame.id;
    matchBox.x = 0;
    matchBox.y = 0;
    matchBox.width = 1920;
    matchBox.height = 1080;
    matchBox.name = '_matchBox';

    // _matchBox 是固定名字，不占用 Box 计数器序号，回退计数器
    decrementSubPageCounter(subPageId, 'Box');

    // 3. MatchingGame 的 boxItemsName 同步为 MatchBox.name
    matchingGame.props = { ...matchingGame.props, boxItemsName: matchBox.name };

    // 4. 创建 6 个 MatchingItem（默认 direction=0 布局）
    const layout = getMatchingLayout(0);
    const items = layout.items.map((cfg, i) => {
      const item = createDefaultElement('MatchingItem', subPageId);
      item.parentId = matchBox.id;
      item.name = cfg.name;
      item.x = cfg.x;
      item.y = cfg.y;
      const isLeft = i < 3;
      item.props = {
        ...item.props,
        camp: isLeft ? 'camp1' : 'camp2',
        connectableCamps: isLeft ? 'camp2' : 'camp1',
        rightItemNames: '',
      };
      return item;
    });

    // 5. 创建 Laya 对象并注册（父 → 子顺序）
    // 编辑模式下 MatchingGame/MatchingItem 都用 Box 替代，不会触发真实 runtime 的 init
    const gameObj = createLayaComponent(matchingGame);
    if (gameObj) registerObject(matchingGame.id, gameObj);

    const boxObj = createLayaComponent(matchBox, gameObj);
    if (boxObj) registerObject(matchBox.id, boxObj);

    items.forEach(item => {
      const obj = createLayaComponent(item, boxObj);
      if (obj) registerObject(item.id, obj);
    });

    // 6. 添加到 store
    addElement(matchingGame);
    addElement(matchBox);
    items.forEach(item => addElement(item));

    // 7. 正课/预习：创建 ConfirmButton 并绑定 onClickInitGameConfirmWithLock
    if (!isFlat) {
      const confirmBtn = createDefaultElement('ConfirmButton', subPageId);
      confirmBtn.x = 1666;
      confirmBtn.y = 960;
      confirmBtn.actions = [{
        id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        event: 'onClickInitGameConfirmWithLock',
        targetId: matchingGame.id,
        actionType: 'toggleVisible',
        groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }];
      const confirmObj = createLayaComponent(confirmBtn);
      if (confirmObj) registerObject(confirmBtn.id, confirmObj);
      addElement(confirmBtn);
    }

    // 8. 默认选中 MatchingGame
    selectElement(matchingGame.id, false);
  };

  /** 拖拽题：
   *  - 正课：DragViewBox + dropbox + dragbox + 默认 DropObj + DragObj + Image
   *  - 作业：同上 + 给 DragViewBox 预置 onDragJudge（含 right + wrong 两个子事件，actionType='none'） */
  const handleAddDragGame = () => {
    if (frozen) return;
    const subPageId = useEditorStore.getState().currentSubPageId ?? undefined;
    const isFlat = isFlatLesson(useEditorStore.getState().currentCourse?.kind);
    const dvb = createDefaultElement('DragViewBox', subPageId);

    const dropbox = createDefaultElement('DragDropBox', subPageId);
    dropbox.name = 'dropbox';
    dropbox.parentId = dvb.id;
    dropbox.x = 0; dropbox.y = 0;
    dropbox.locked = true;

    const dragbox = createDefaultElement('DragDragBox', subPageId);
    dragbox.name = 'dragbox';
    dragbox.parentId = dvb.id;
    dragbox.x = 0; dragbox.y = 0;
    dragbox.locked = true;

    const dropObj = createDefaultElement('DropObj', subPageId);
    dropObj.name = 'dj1';
    dropObj.parentId = dropbox.id;
    dropObj.x = 606; dropObj.y = 445;
    dropObj.props = { ...dropObj.props, var: 'dj1' };

    const dragObj = createDefaultElement('DragObj', subPageId);
    dragObj.name = 'aj1';
    dragObj.parentId = dragbox.id;
    dragObj.x = 606; dragObj.y = 734;
    dragObj.props = { ...dragObj.props, var: 'aj1' };

    if (isFlat) {
      // 作业：DragViewBox 预置 onDragJudge，含 right + wrong 两个子事件，每个一条 actionType='none'
      const mkId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const groupId = mkId();
      dvb.actions = [
        { id: mkId(), event: 'onDragJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'right' },
        { id: mkId(), event: 'onDragJudge', actionType: 'none', groupId, branchId: mkId(), branchCondition: 'wrong' },
      ];

      // 作业模式不创建 ConfirmButton
      const allEls = [dvb, dropbox, dragbox, dropObj, dragObj];
      allEls.forEach(el => {
        const parentObj = el.parentId ? getObject(el.parentId) : undefined;
        const obj = createLayaComponent(el, parentObj);
        if (obj) registerObject(el.id, obj);
        addElement(el);
      });

      selectElement(dvb.id, false);
      return;
    }

    // 正课/预习：创建 ConfirmButton，绑 onClickInitGameConfirmWithLock，target 指向 DragViewBox
    const confirmBtn = createDefaultElement('ConfirmButton', subPageId);
    confirmBtn.x = 1666;
    confirmBtn.y = 960;
    confirmBtn.actions = [{
      id: crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event: 'onClickInitGameConfirmWithLock',
      targetId: dvb.id,
      actionType: 'toggleVisible',
      groupId: crypto.randomUUID?.() ?? `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }];

    const allEls = [dvb, dropbox, dragbox, dropObj, dragObj, confirmBtn];
    allEls.forEach(el => {
      const parentObj = el.parentId ? getObject(el.parentId) : undefined;
      const obj = createLayaComponent(el, parentObj);
      if (obj) registerObject(el.id, obj);
      addElement(el);
    });

    selectElement(dvb.id, false);
  };

  const openQuickPreset = (kind: QuickPresetKind) => {
    if (frozen) return;
    setQuickPresetKind(kind);
    setQuickPresetOpen(true);
  };

  const registerAndAdd = (element: Element, parent?: Parameters<typeof createLayaComponent>[1]) => {
    const obj = createLayaComponent(element, parent);
    if (obj) registerObject(element.id, obj);
    addElement(element);
    return obj;
  };

  const applyPresetImage = async (element: Element, courseId: string, preset: QuickPreset, prop: 'skin' | '_foregroundSkin') => {
    const { localRelPath } = await downloadLibraryFile(courseId, preset.libraryPath);
    const size = await readNaturalSize(courseId, localRelPath);
    if (size) {
      element.width = size.width;
      element.height = size.height;
    }
    const extension = localRelPath.split('.').pop()?.toUpperCase() ?? '';
    element.props = {
      ...element.props,
      [prop]: localRelPath,
      ...(size ? { _naturalWidth: size.width, _naturalHeight: size.height } : {}),
      ...(extension ? { _fileFormat: extension } : {}),
    };
    return localRelPath;
  };

  const handleQuickPresetSelected = async (kind: QuickPresetKind, preset: QuickPreset) => {
    const state = useEditorStore.getState();
    const courseId = state.currentCourse?.id;
    const pageContext = currentElementPage();
    if (!courseId || !pageContext) {
      showToast('请先打开一个可编辑课件', 'warning');
      return;
    }

    setQuickPresetBusy(true);
    try {
      const subPageId = pageContext.id;
      if (kind === 'confirm') {
        const element = createDefaultElement('ConfirmButton', subPageId);
        await applyPresetImage(element, courseId, preset, 'skin');
        const target = pageContext.elements.find((item) => isInputRuleHost(item) || item.layaType === 'ChoiceBox')
          ?? pageContext.elements.find((item) => item.type === 'DragViewBox' || item.type === 'MatchingGame');
        if (target) {
          const isGame = target.type === 'DragViewBox' || target.type === 'MatchingGame';
          element.actions = [{
            id: makeId('action'),
            event: isGame ? 'onClickInitGameConfirmWithLock' : 'onClickInitConfirmWithLock',
            targetId: target.id,
            targetNameSnapshot: target.name,
            actionType: 'toggleVisible',
            groupId: makeId('group'),
          }];
        }
        registerAndAdd(element);
        selectElement(element.id, false);
        if (!target) showToast('确定按钮已创建；当前页没有可自动绑定的题型，请在事件面板补充目标', 'warning');
      } else if (kind === 'previous' || kind === 'next') {
        const element = createDefaultElement(kind === 'previous' ? 'PageTurnLeftBtn' : 'PageTurnRightBtn', subPageId);
        await applyPresetImage(element, courseId, preset, 'skin');
        const pageTurnTarget = pageContext.elements.find((item) => item.type === 'PageTurnBox');
        if (pageTurnTarget) {
          const action: Action = {
            id: makeId('action'),
            event: 'onClick',
            targetId: pageTurnTarget.id,
            actionType: kind === 'previous' ? 'pageTurnPrevOnce' : 'pageTurnNextOnce',
            groupId: makeId('group'),
          };
          element.actions = [action];
        }
        registerAndAdd(element);
        selectElement(element.id, false);
        if (!pageTurnTarget) showToast(`${kind === 'previous' ? '上一页' : '下一页'}按钮已创建；当前页没有翻页管理组件，请在事件面板补充目标`, 'warning');
      } else if (kind === 'audio') {
        const element = createDefaultElement('SoundButton', subPageId);
        await applyPresetImage(element, courseId, preset, 'skin');
        registerAndAdd(element);
        selectElement(element.id, false);
        showToast('音频按钮已创建，请在属性面板选择需要播放的音频', 'info');
      } else {
        const drawPreset = kind === 'brush' ? preset : await findRelatedPreset('brush', preset);
        const clearPreset = kind === 'clear' ? preset : await findRelatedPreset('clear', preset);
        const brushBox = createDefaultElement('NewBrushSprite', subPageId);
        const drawBtn = createDefaultElement('BrushDrawBtn', subPageId);
        const clearBtn = createDefaultElement('BrushClearBtn', subPageId);
        drawBtn.parentId = brushBox.id;
        clearBtn.parentId = brushBox.id;
        if (drawPreset) await applyPresetImage(drawBtn, courseId, drawPreset, '_foregroundSkin');
        if (clearPreset) await applyPresetImage(clearBtn, courseId, clearPreset, 'skin');
        brushBox.actions = [{
          id: makeId('action'),
          event: 'onInitBrush',
          actionType: 'none',
          groupId: makeId('group'),
        }];
        const brushObj = registerAndAdd(brushBox);
        registerAndAdd(drawBtn, brushObj);
        registerAndAdd(clearBtn, brushObj);
        selectElement(brushBox.id, false);
        if (!drawPreset || !clearPreset) {
          showToast(`已创建画笔组合；未找到同目录的${drawPreset ? '清空' : '画笔'}皮肤，已保留默认外观`, 'warning');
        }
      }
      setQuickPresetOpen(false);
    } catch (reason) {
      showToast(`添加快捷组件失败：${reason instanceof Error ? reason.message : String(reason)}`, 'error');
    } finally {
      setQuickPresetBusy(false);
    }
  };

  const items = Object.entries(elementMeta).filter(([type, m]) =>
    m.category === activeTab
    && m.label !== '视频'
    && !m.toolbarHidden
    && !QUICK_PRESET_REPLACED_TYPES.has(type),
  );

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-3 py-1.5">
      <div className="flex items-center gap-1 mb-1.5 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
              activeTab === cat.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {translateLabel(cat.label, language)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {activeTab === 'commonComponents' && QUICK_PRESET_BUTTONS.map((item) => (
          <button
            key={item.kind}
            onClick={() => openQuickPreset(item.kind)}
            disabled={frozen}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
              frozen
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-emerald-700 text-slate-300 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
        {activeTab === 'speechCourse' && (
          <>
            <button
              onClick={handleAddPageTurn}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('翻页组件', language)}
            </button>
            <button
              onClick={handleAddChoice}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('选择题', language)}
            </button>
            <button
              onClick={handleAddDragGame}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('拖拽题', language)}
            </button>
            <button
              onClick={handleAddFillBlank}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('填空题', language)}
            </button>
            <button
              onClick={handleAddMatching}
              disabled={frozen}
              className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
                frozen
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
              }`}
            >
              {translateLabel('连线题', language)}
            </button>
          </>
        )}
        {items.map(([type, meta]) => (
          <button
            key={type}
            onClick={() => handleAdd(type)}
            disabled={frozen}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors shrink-0 ${
              frozen
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white'
            }`}
            title={meta.layaType}
          >
            {translateLabel(meta.label, language)}
          </button>
        ))}
      </div>

      <KeyboardPresetDialog
        open={keyboardDialogOpen}
        onClose={handleKeyboardDialogClose}
        onSelect={handlePresetSelected}
        presets={pendingKeyboardInputType
          ? KEYBOARD_PRESETS.filter((preset) => preset.compatibleInputTypes.includes(pendingKeyboardInputType))
          : KEYBOARD_PRESETS}
      />
      {quickPresetOpen && (
        <QuickPresetDialog
          initialKind={quickPresetKind}
          busy={quickPresetBusy}
          onClose={() => setQuickPresetOpen(false)}
          onSelect={handleQuickPresetSelected}
        />
      )}
    </div>
  );
}
