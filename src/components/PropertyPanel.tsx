import { useState, useEffect } from 'react';
import { useEditorStore, findSubPage } from '../store/editorStore';
import { showToast } from '../utils/toast';
import { elementMeta } from '../elements/elementMeta';
import type { PropertyDef } from '../elements/elementMeta';
import FieldRenderer from './FieldRenderer';
import SkinEditor from './SkinEditor';
import ActionEditor from './ActionEditor';
import BindKeyboardModal from './BindKeyboardModal';
import TabImgPicker from './TabImgPicker';
import OkBtnPicker from './OkBtnPicker';
import PageTurnPageList from './PageTurnPageList';
import { KEYBOARD_PRESETS } from '../elements/keyboardPresets';
import { ArrowDown, ArrowUp, CornerDownLeft, Eye, EyeOff, FolderMinus, FolderOpen, Lock, Maximize2, Plus, Trash2, TriangleAlert, Unlock } from 'lucide-react';
import type { Action, Element } from '../types';
import { useI18n } from '../i18n/context';
import { getObject, syncProps } from '../utils/layaBridge';
import { readFileAsDataUrl } from '../utils/electronFs';
import { translateLabel } from '../elements/elementMetaI18n';
import { lookupBuiltinByExportPath } from '../elements/builtinAssets';
import { collectInternalPageIssues, findActiveElementPage, isInternalPagesSubPage, isInternalPagesWorkbenchReadonly } from '../utils/internalPages';
import { isContainerElementType } from '../utils/elementContainers';
import { getElementParentContainment } from '../utils/canvasGeometry';
import { getExplicitLayerLabel, getLayerDisplayName, withLayerLabel } from '../utils/layerPresentation';
import { createElementMap, getElementLayerState } from '../utils/layerState';
import { resolveEditorLayerGroups, type ResolvedEditorLayerGroup } from '../utils/layerGroups';

const DRAG_GAME_TYPES = ['DragViewBox', 'DragDropBox', 'DragDragBox', 'DragObj', 'DropObj'];
const DRAG_GAME_NAME_HIDDEN = ['DragObj', 'DropObj', 'DragDropBox', 'DragDragBox'];

interface EditorLayerGroupPropertiesProps {
  group: ResolvedEditorLayerGroup;
  groupIndex: number;
  groupCount: number;
  disabled: boolean;
  runtimeParentLabel: string;
  onRename: (groupId: string, name: string) => boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDissolve: (groupId: string) => void;
  onDelete: (groupId: string) => void;
  memberIds: string[];
  allMembersHidden: boolean;
  allMembersLocked: boolean;
  onSetMembersHidden: (hidden: boolean) => void;
  onSetMembersLocked: (locked: boolean) => void;
}

function EditorLayerGroupProperties({
  group,
  groupIndex,
  groupCount,
  disabled,
  runtimeParentLabel,
  onRename,
  onReorder,
  onDissolve,
  onDelete,
  memberIds,
  allMembersHidden,
  allMembersLocked,
  onSetMembersHidden,
  onSetMembersLocked,
}: EditorLayerGroupPropertiesProps) {
  const [draft, setDraft] = useState(group.name);

  const commitName = () => {
    const normalized = draft.trim();
    if (!normalized || normalized === group.name) {
      setDraft(group.name);
      return;
    }
    if (!onRename(group.id, normalized)) {
      setDraft(group.name);
      showToast('图层组名称不能为空或重复', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
        <FolderOpen size={16} className="text-blue-300" />
        <span>图层组</span>
      </div>
      <label className="block text-xs text-slate-400">
        <span className="block mb-1">组名称</span>
        <input
          value={draft}
          disabled={disabled || group.crossRuntimeParent}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setDraft(group.name);
          }}
          className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white disabled:opacity-50"
        />
      </label>
      <div className="space-y-1 border-t border-slate-700 pt-2 text-[11px] text-slate-400">
        <div className="flex justify-between gap-2"><span>成员</span><span className="text-slate-200">{group.memberIds.length} 个</span></div>
        <div className="flex justify-between gap-2"><span>运行父级</span><span className="text-slate-200 truncate">{runtimeParentLabel}</span></div>
        {group.memberIds.length === 0 && <div className="text-[10px] text-slate-500">可直接从图层面板拖入元素进行整理。</div>}
      </div>
      <div className="border-t border-slate-700 pt-2">
        <div className="text-xs text-slate-500 mb-1.5">组状态</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={disabled || memberIds.length === 0}
            onClick={() => onSetMembersHidden(!allMembersHidden)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40"
            title={allMembersHidden ? '显示组内成员' : '隐藏组内成员'}
          >
            {allMembersHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            {allMembersHidden ? '显示成员' : '隐藏成员'}
          </button>
          <button
            type="button"
            disabled={disabled || memberIds.length === 0}
            onClick={() => onSetMembersLocked(!allMembersLocked)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40"
            title={allMembersLocked ? '解锁组内成员' : '锁定组内成员'}
          >
            {allMembersLocked ? <Unlock size={12} /> : <Lock size={12} />}
            {allMembersLocked ? '解锁成员' : '锁定成员'}
          </button>
        </div>
      </div>
      <div className="border-t border-slate-700 pt-2">
        <div className="text-xs text-slate-500 mb-1.5">图层组操作</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={disabled || groupIndex <= 0}
            onClick={() => onReorder(groupIndex, groupIndex - 1)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40"
          >
            <ArrowUp size={12} /> 上移
          </button>
          <button
            type="button"
            disabled={disabled || groupIndex >= groupCount - 1}
            onClick={() => onReorder(groupIndex, groupIndex + 1)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40"
          >
            <ArrowDown size={12} /> 下移
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDissolve(group.id)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-40"
          >
            <FolderMinus size={12} /> 解散组
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDelete(group.id)}
            className="flex items-center justify-center gap-1 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded disabled:opacity-40"
          >
            <Trash2 size={12} /> 删除组
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PropertyPanel() {
  const { t, language } = useI18n();
  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const currentInternalPageId = useEditorStore((s) => s.currentInternalPageId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectedEditorLayerGroupId = useEditorStore((s) => s.selectedEditorLayerGroupId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const moveElementIntoParent = useEditorStore((s) => s.moveElementIntoParent);
  const fitContainerToChildren = useEditorStore((s) => s.fitContainerToChildren);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setElementsEditorHidden = useEditorStore((s) => s.setElementsEditorHidden);
  const setElementsLocked = useEditorStore((s) => s.setElementsLocked);
  const selectEditorLayerGroup = useEditorStore((s) => s.selectEditorLayerGroup);
  const renameEditorLayerGroup = useEditorStore((s) => s.renameEditorLayerGroup);
  const deleteEditorLayerGroup = useEditorStore((s) => s.deleteEditorLayerGroup);
  const reorderEditorLayerGroup = useEditorStore((s) => s.reorderEditorLayerGroup);
  const addChoiceOption = useEditorStore((s) => s.addChoiceOption);
  const removeChoiceOption = useEditorStore((s) => s.removeChoiceOption);
  const addFillBlankInput = useEditorStore((s) => s.addFillBlankInput);
  const removeFillBlankInput = useEditorStore((s) => s.removeFillBlankInput);
  const addMatchingPair = useEditorStore((s) => s.addMatchingPair);
  const removeMatchingPair = useEditorStore((s) => s.removeMatchingPair);
  const addDropObj = useEditorStore((s) => s.addDropObj);
  const removeDropObj = useEditorStore((s) => s.removeDropObj);
  const addDragObj = useEditorStore((s) => s.addDragObj);
  const removeDragObj = useEditorStore((s) => s.removeDragObj);
  const setProxySkin = useEditorStore((s) => s.setProxySkin);
  const changePageTurnButtonType = useEditorStore((s) => s.changePageTurnButtonType);
  const renameInternalPage = useEditorStore((s) => s.renameInternalPage);
  const updateDialogSettings = useEditorStore((s) => s.updateDialogSettings);
  const setNoEntryDeferred = useEditorStore((s) => s.setNoEntryDeferred);
  const saveHistory = useEditorStore((s) => s.saveHistory);
  const workbenchReadonly = useEditorStore((s) => isInternalPagesWorkbenchReadonly(
    s.currentCourse,
    s.currentSubPageId,
    s.focusSubPageId,
  ));

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [skinEditorOpen, setSkinEditorOpen] = useState(false);
  const [bindKeyboardOpen, setBindKeyboardOpen] = useState(false);
  const [tabImgPickerOpen, setTabImgPickerOpen] = useState(false);
  const [okBtnPickerOpen, setOkBtnPickerOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setEditingValues({});
      setSkinEditorOpen(false);
      setBindKeyboardOpen(false);
      setTabImgPickerOpen(false);
      setOkBtnPickerOpen(false);
    });
  }, [selectedElementIds, selectedEditorLayerGroupId]);

  const currentPage = findActiveElementPage(currentCourse, currentSubPageId, currentInternalPageId);
  const currentSubPage = findSubPage(currentCourse, currentSubPageId);
  const activeInternalPage = isInternalPagesSubPage(currentSubPage)
    ? currentSubPage.internalPages.find((page) => page.id === currentInternalPageId) ?? null
    : null;
  const activePageIssues = currentCourse
    ? collectInternalPageIssues(currentCourse).filter((issue) => issue.subPageId === currentSubPageId && issue.pageId === (currentInternalPageId ?? currentSubPageId))
    : [];
  const currentStage = (() => {
    if (!currentCourse || !currentSubPageId) return undefined;
    const found = currentCourse.stages.find((stage) => stage.subPages.some((sp) => sp.id === currentSubPageId));
    if (found) return found;
    return (currentCourse.previewStages ?? []).find((stage) => stage.subPages.some((sp) => sp.id === currentSubPageId));
  })();
  const elements = currentPage?.elements ?? [];
  const elementMap = createElementMap(elements);
  const resolvedLayerGroups = currentPage ? resolveEditorLayerGroups(currentPage) : [];
  const selectedEditorLayerGroup = selectedEditorLayerGroupId
    ? resolvedLayerGroups.find((group) => group.id === selectedEditorLayerGroupId) ?? null
    : null;
  const selectedEditorLayerGroupIndex = selectedEditorLayerGroup
    ? resolvedLayerGroups.findIndex((group) => group.id === selectedEditorLayerGroup.id)
    : -1;
  const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));
  const selectedEditorLayerGroupMemberIds = (() => {
    if (!selectedEditorLayerGroup) return [];
    const ids = new Set<string>();
    const pending = [selectedEditorLayerGroup.id];
    while (pending.length > 0) {
      const groupId = pending.shift()!;
      const group = resolvedLayerGroups.find((candidate) => candidate.id === groupId);
      if (!group) continue;
      group.memberIds.forEach((id) => ids.add(id));
      resolvedLayerGroups
        .filter((candidate) => candidate.parentGroupId === groupId)
        .forEach((child) => pending.push(child.id));
    }
    return [...ids];
  })();
  const selectedEditorLayerGroupMembers = elements.filter((element) => selectedEditorLayerGroupMemberIds.includes(element.id));
  const allGroupMembersHidden = selectedEditorLayerGroupMembers.length > 0
    && selectedEditorLayerGroupMembers.every((element) => getElementLayerState(element, elementMap).effectiveHidden);
  const allGroupMembersLocked = selectedEditorLayerGroupMembers.length > 0
    && selectedEditorLayerGroupMembers.every((element) => getElementLayerState(element, elementMap).effectiveLocked);
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const singleLayerState = single ? getElementLayerState(single, elementMap) : null;
  const lockedSource = singleLayerState?.lockedById ? elementMap.get(singleLayerState.lockedById) : single;
  const parentContainment = single ? getElementParentContainment(single, elements) : null;
  const parentOverflow = parentContainment?.isOverflowing
    && isContainerElementType(parentContainment.parent.type)
    ? parentContainment
    : null;

  const handleChange = (key: string, value: unknown) => {
    if (selectedElements.some((element) => getElementLayerState(element, elementMap).effectiveLocked)) return;
    // MatchingItem rightItemNames 双向同步：支持单线/多线模式
    if (single && single.type === 'MatchingItem' && key === 'rightItemNames') {
      const newTargetNames = String(value ?? '').split(',').map(n => n.trim()).filter(n => n !== '');
      const oldTargetNames = String((single.props as Record<string, unknown>).rightItemNames ?? '')
        .split(',').map(n => n.trim()).filter(n => n !== '');
      const matchBox = single.parentId ? elements.find(e => e.id === single.parentId) : null;
      const matchingGame = matchBox?.parentId ? elements.find(e => e.id === matchBox.parentId) : null;
      const singleMode = matchingGame ? (matchingGame.props as Record<string, unknown>).single === 0 : false;
      const currentName = single.name ?? single.id;

      // 累积所有更新（避免对同一个 item 多次 updateElement 导致的状态错乱）
      // updates: itemId -> 最新的 rightItemNames 字符串
      const updates = new Map<string, string>();
      const getCurrentRights = (itemId: string): string[] => {
        if (updates.has(itemId)) {
          return updates.get(itemId)!.split(',').map(n => n.trim()).filter(n => n !== '');
        }
        const item = elements.find(e => e.id === itemId);
        if (!item) return [];
        return String((item.props as Record<string, unknown>).rightItemNames ?? '')
          .split(',').map(n => n.trim()).filter(n => n !== '');
      };
      const setRights = (itemId: string, names: string[]) => {
        updates.set(itemId, names.join(','));
      };
      const findItemByName = (name: string) => {
        if (!matchBox) return null;
        return elements.find(e =>
          e.type === 'MatchingItem' &&
          e.parentId === matchBox.id &&
          (e.name === name || e.id === name)
        ) ?? null;
      };

      if (matchBox) {
        // 1) 新增的目标：把 currentName 加到它们的 rightItemNames
        const addedNames = newTargetNames.filter(n => !oldTargetNames.includes(n));
        addedNames.forEach(addedName => {
          const targetItem = findItemByName(addedName);
          if (!targetItem) return;
          const targetName = targetItem.name ?? targetItem.id;

          if (singleMode) {
            // 单线模式：清理目标 item 之前的连接（链式：那些被目标连接的 item，要移除目标）
            const targetOldRights = getCurrentRights(targetItem.id);
            targetOldRights.forEach(oldName => {
              if (oldName === currentName) return; // 当前 item 不需要清理
              const oldItem = findItemByName(oldName);
              if (!oldItem) return;
              const cleaned = getCurrentRights(oldItem.id).filter(n => n !== targetName);
              setRights(oldItem.id, cleaned);
            });
            // 目标的 rightItemNames 直接替换为 [currentName]
            setRights(targetItem.id, [currentName]);
          } else {
            // 多线模式：追加 currentName 到目标
            const targetRights = getCurrentRights(targetItem.id);
            if (!targetRights.includes(currentName)) {
              targetRights.push(currentName);
              setRights(targetItem.id, targetRights);
            }
          }
        });

        // 2) 移除的目标：从它们的 rightItemNames 中移除 currentName
        const removedNames = oldTargetNames.filter(n => !newTargetNames.includes(n));
        removedNames.forEach(removedName => {
          const targetItem = findItemByName(removedName);
          if (!targetItem) return;
          const cleaned = getCurrentRights(targetItem.id).filter(n => n !== currentName);
          setRights(targetItem.id, cleaned);
        });
      }

      // 3) 应用所有累积的更新
      updates.forEach((rightItemNames, itemId) => {
        const item = elements.find(e => e.id === itemId);
        if (!item) return;
        updateElement(itemId, {
          props: { ...item.props, rightItemNames }
        } as Partial<Element>);
      });

      // 4) 更新当前 item 自己
      updateElement(single.id, {
        props: { ...single.props, rightItemNames: newTargetNames.join(',') }
      } as Partial<Element>);
      return;
    }
    // PageTurnBox 的 buttonType 切换:走 store 的 changePageTurnButtonType,处理按钮元素的增删
    if (single && single.type === 'PageTurnBox' && key === 'buttonType') {
      changePageTurnButtonType(single.id, value as 'arrows' | 'tabs' | 'both');
      return;
    }
    // DragObj/DropObj 的 skin 字段：调用 setProxySkin 以触发异步尺寸调整
    if (single && (single.type === 'DragObj' || single.type === 'DropObj') && key === 'skin') {
      setProxySkin(single.id, String(value ?? ''));
      return;
    }
    // MatchingGame direction 切换：按 camp 分组重命名/重定位所有 MatchingItem 子项（支持任意数量）
    if (single && single.type === 'MatchingGame' && key === 'direction') {
      const newDirection = Number(value) as 0 | 1 | 2;
      const matchBox = elements.find(e => e.parentId === single.id && e.type === 'Box');
      if (matchBox) {
        const items = elements.filter(e => e.parentId === matchBox.id && e.type === 'MatchingItem');
        const camp1 = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp1');
        const camp2 = items.filter(e => (e.props as Record<string, unknown>).camp === 'camp2');

        // 起始位置和追加方向（与 store.addMatchingPair 保持一致）
        let camp1X: number, camp1Y: number, camp2X: number, camp2Y: number;
        let stepX: number, stepY: number;
        if (newDirection === 1) {
          // 上下连线：上方阵营从 (860,300) 起，横向追加（间距 100）
          camp1X = 860; camp1Y = 300; camp2X = 860; camp2Y = 780;
          stepX = 100; stepY = 0;
        } else {
          // 左右 / 中心点：左侧阵营从 (750,450) 起，纵向追加（间距 90）
          camp1X = 750; camp1Y = 450; camp2X = 1130; camp2Y = 450;
          stepX = 0; stepY = 90;
        }

        // camp1 重命名 + 重定位
        camp1.forEach((item, i) => {
          let name: string;
          if (newDirection === 0) name = `l${i + 1}`;
          else if (newDirection === 1) name = `t${i + 1}`;
          else name = `item${2 * (i + 1) - 1}`; // 中心点：奇数
          updateElement(item.id, {
            name,
            x: camp1X + i * stepX,
            y: camp1Y + i * stepY,
          });
        });
        // camp2 重命名 + 重定位
        camp2.forEach((item, i) => {
          let name: string;
          if (newDirection === 0) name = `r${i + 1}`;
          else if (newDirection === 1) name = `b${i + 1}`;
          else name = `item${2 * (i + 1)}`; // 中心点：偶数
          updateElement(item.id, {
            name,
            x: camp2X + i * stepX,
            y: camp2Y + i * stepY,
          });
        });
      }
      // 更新 MatchingGame 自身的 direction 属性
      updateElement(single.id, { props: { ...single.props, direction: newDirection } } as Partial<Element>);
      return;
    }
    // MatchingItem _itemImage 上传：读取图片实际宽高，更新 MatchingItem 尺寸
    if (single && single.type === 'MatchingItem' && key === '_itemImage') {
      const url = String(value ?? '');
      // 1) 更新 props._itemImage，并通过 syncProps 触发 applyKlProps 重绘画布（替换占位图为图片）
      selectedElements.forEach((el) => {
        if (el.type !== 'MatchingItem') return;
        const newProps: Record<string, unknown> = { ...el.props, _itemImage: url };
        // 清除图片时，设置 _naturalWidth 和 _naturalHeight 为 undefined，恢复默认 80x80
        if (!url) {
          newProps._naturalWidth = undefined;
          newProps._naturalHeight = undefined;
          // 同时重置宽高为默认值 80x80
          updateElement(el.id, { width: 80, height: 80, props: newProps } as Partial<Element>);
          const obj = getObject(el.id);
          if (obj) {
            obj.width = 80;
            obj.height = 80;
          }
        } else {
          updateElement(el.id, { props: newProps } as Partial<Element>);
        }
        // 从 store 读取最新状态后触发 syncProps
        const allElements = useEditorStore.getState().currentCourse?.stages
          ?.flatMap(s => s.subPages)
          ?.flatMap(p => p.elements) ?? [];
        const latestEl = allElements.find(e => e.id === el.id);
        if (latestEl) {
          syncProps(el.id, latestEl, true);
        }
      });
      // 2) 异步读取图片尺寸，更新所有选中 MatchingItem 的 width/height 并同步 Laya 节点
      if (url) {
        const courseId = useEditorStore.getState().currentCourse?.id;
        // 读取尺寸前先把路径转换成浏览器可加载的 url
        const resolveSrc = async (): Promise<string> => {
          if (url.startsWith('data:') || url.startsWith('/uploads/') || url.startsWith('/builtin/') || url.startsWith('http')) {
            return url;
          }
          if (url.startsWith('images/') && courseId) {
            // Electron IPC：转 base64 dataURL
            const dataUrl = await readFileAsDataUrl(courseId, url);
            return dataUrl ?? '';
          }
          // 兜底：当作 builtin 路径处理
          return `/builtin/${url}`;
        };
        resolveSrc().then((src) => {
          if (!src) return;
          const img = new window.Image();
          img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            if (w > 0 && h > 0) {
              // 批量更新所有选中的 MatchingItem 尺寸
              selectedElements.forEach((el) => {
                if (el.type !== 'MatchingItem') return;
                // 同时更新 _naturalWidth/_naturalHeight，用于"重置尺寸"按钮
                const newProps = { ...el.props, _itemImage: url, _naturalWidth: w, _naturalHeight: h };
                updateElement(el.id, { width: w, height: h, props: newProps } as Partial<Element>);
                const obj = getObject(el.id);
                if (obj) {
                  obj.width = w;
                  obj.height = h;
                  // 触发 applyKlProps 重新渲染图片子节点，同步图片尺寸
                  // 使用完整的 el 对象，更新 width/height 和 props
                  const updatedEl = { ...el, width: w, height: h, props: newProps };
                  syncProps(el.id, updatedEl, true);
                }
              });
            }
          };
          img.onerror = () => { /* 加载失败不改 size */ };
          img.src = src;
        });
      }
      return;
    }
    selectedElements.forEach((el) => {
      if (el.type === 'SpeechSelectableObj' && (key === '_foregroundSkin' || key === '_bgSkin')) {
        // 选项卡片：更新皮肤时同步画布 Laya 节点（通过 syncProps 触发 applyKlProps 含皮肤预加载）
        const newProps: Record<string, unknown> = { ...el.props, [key]: value };
        updateElement(el.id, { props: newProps } as Partial<Element>);
        const updatedEl = { ...el, props: newProps } as Element;
        syncProps(el.id, updatedEl, true);
        return;
      }
      const newProps: Record<string, unknown> = { ...el.props, [key]: value };
      // 输入框：可输入位数 = 正确答案位数 + 1
      if (el.type === 'KlInputImage' && key === 'answer') {
        newProps.place = String(value ?? '').length + 1;
      }
      updateElement(el.id, { props: newProps } as Partial<Element>);
    });
  };

  const handleTransformChange = (key: string, value: unknown) => {
    selectedElements.forEach((el) => {
      if (getElementLayerState(el, elementMap).effectiveLocked) return;
      updateElement(el.id, { [key]: value } as Partial<Element>);
    });
    // MatchingItem 宽高变化时，需要从 store 读取最新状态后同步图片子节点尺寸
    if ((key === 'width' || key === 'height')) {
      // 从 store 读取最新的 elements（包含刚更新的 width/height）
      const allElements = useEditorStore.getState().currentCourse?.stages
        ?.flatMap(s => s.subPages)
        ?.flatMap(p => p.elements) ?? [];
      selectedElements.forEach((el) => {
        if (el.type !== 'MatchingItem') return;
        const latestEl = allElements.find(e => e.id === el.id);
        if (latestEl) {
          syncProps(el.id, latestEl, true);
        }
      });
    }
  };

  /** 计算 parentId 对应的祖先链 x/y 总偏移（不含元素自身） */
  const getAncestorOffset = (parentId: string | undefined): { ax: number; ay: number } => {
    let ax = 0, ay = 0;
    let pid = parentId;
    while (pid) {
      const parent = elements.find(e => e.id === pid);
      if (!parent) break;
      ax += parent.x;
      ay += parent.y;
      pid = parent.parentId;
    }
    return { ax, ay };
  };

  /** 切换父容器时修正 x/y，保持世界坐标不变 */
  const handleParentChange = (newParentId: string | undefined) => {
    selectedElements.forEach((el) => {
      if (getElementLayerState(el, elementMap).effectiveLocked) return;
      const oldOffset = getAncestorOffset(el.parentId);
      const newOffset = getAncestorOffset(newParentId);
      // 世界坐标 = el.x + oldOffset，新局部坐标 = 世界坐标 - newOffset
      const newX = el.x + oldOffset.ax - newOffset.ax;
      const newY = el.y + oldOffset.ay - newOffset.ay;
      updateElement(el.id, { parentId: newParentId || undefined, x: newX, y: newY } as Partial<Element>);
    });
  };

  const handleActionsChange = (actions: Action[]) => {
    if (single && !singleLayerState?.effectiveLocked) updateElement(single.id, { actions });
  };

  const handleDelete = () => {
    if (!window.confirm(t('deleteElementConfirm'))) return;
    selectedElements.forEach((el) => deleteElement(el.id));
    clearSelection();
  };

  const handleMoveIntoParent = () => {
    if (!single) return;
    const result = moveElementIntoParent(single.id);
    showToast(result.ok ? '已将子元素移回容器范围' : (result.error ?? '无法移回容器'), result.ok ? 'success' : 'warning');
  };

  const handleFitParentToChildren = () => {
    if (!single?.parentId) return;
    const result = fitContainerToChildren(single.parentId);
    showToast(result.ok ? '已扩展父容器以适应全部内容' : (result.error ?? '无法扩展容器'), result.ok ? 'success' : 'warning');
  };

  const meta = single ? elementMeta[single.type] : null;
  const properties: PropertyDef[] = meta?.properties ?? [];

  // 通用变换属性（locked 元素不显示）
  const isDragSlotBox = single && (single.type === 'DragDropBox' || single.type === 'DragDragBox');
  const transformFields: PropertyDef[] = singleLayerState?.effectiveLocked
    ? (isDragSlotBox ? [] : [{ key: 'opacity', label: t('opacity'), type: 'slider' as const, min: 0, max: 100, step: 1 }])
    : [
      { key: 'x', label: 'X', type: 'number' },
      { key: 'y', label: 'Y', type: 'number' },
      { key: 'width', label: t('width'), type: 'number', min: 1 },
      { key: 'height', label: t('height'), type: 'number', min: 1 },
      { key: 'rotation', label: t('rotation'), type: 'number' },
      ...(isDragSlotBox ? [] : [{ key: 'opacity', label: t('opacity'), type: 'slider' as const, min: 0, max: 100, step: 1 }]),
    ];

  const hasSelection = selectedElements.length > 0;

  const clearEditingValue = (key: string) => {
    setEditingValues((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const commitLayerLabel = () => {
    if (!single || singleLayerState?.effectiveLocked) return;
    const draft = editingValues.layerLabel;
    if (draft === undefined) return;
    const normalized = draft.trim();
    clearEditingValue('layerLabel');
    if (normalized === getExplicitLayerLabel(single)) return;
    updateElement(single.id, { props: withLayerLabel(single.props, normalized) });
    saveHistory();
  };

  const commitElementIdentifier = () => {
    if (!single || singleLayerState?.effectiveLocked) return;
    const newName = editingValues.name?.trim();
    if (!newName || newName === single.name) {
      clearEditingValue('name');
      return;
    }
    if (/^\d/.test(newName)) {
      showToast(t('nameStartDigit'), 'error');
      clearEditingValue('name');
      return;
    }
    if (elements.some((element) => element.id !== single.id && element.name === newName)) {
      showToast(t('duplicateName'), 'error');
      clearEditingValue('name');
      return;
    }
    updateElement(single.id, { name: newName } as Partial<Element>);
    saveHistory();
    clearEditingValue('name');
  };

  const handleDissolveLayerGroup = (groupId: string) => {
    deleteEditorLayerGroup(groupId, false);
    selectEditorLayerGroup(null);
  };

  const handleDeleteLayerGroup = (groupId: string) => {
    deleteEditorLayerGroup(groupId, true);
    selectEditorLayerGroup(null);
  };

  const runtimeParent = selectedEditorLayerGroup?.runtimeParentId
    ? elementMap.get(selectedEditorLayerGroup.runtimeParentId)
    : undefined;
  const runtimeParentLabel = runtimeParent
    ? getLayerDisplayName(runtimeParent, '运行容器')
    : selectedEditorLayerGroup?.memberIds.length
      ? '页面顶层'
      : '首次拖入成员后确定';

  return (
    <>
    <div data-property-panel className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {selectedEditorLayerGroup ? (
          <EditorLayerGroupProperties
            key={`${selectedEditorLayerGroup.id}:${selectedEditorLayerGroup.name}`}
            group={selectedEditorLayerGroup}
            groupIndex={selectedEditorLayerGroupIndex}
            groupCount={resolvedLayerGroups.length}
            disabled={Boolean(currentPage && 'frozen' in currentPage && currentPage.frozen) || workbenchReadonly}
            runtimeParentLabel={runtimeParentLabel}
            onRename={renameEditorLayerGroup}
            onReorder={reorderEditorLayerGroup}
            onDissolve={handleDissolveLayerGroup}
            onDelete={handleDeleteLayerGroup}
            memberIds={selectedEditorLayerGroupMemberIds}
            allMembersHidden={allGroupMembersHidden}
            allMembersLocked={allGroupMembersLocked}
            onSetMembersHidden={(hidden) => setElementsEditorHidden(selectedEditorLayerGroupMemberIds, hidden)}
            onSetMembersLocked={(locked) => setElementsLocked(selectedEditorLayerGroupMemberIds, locked)}
          />
        ) : !hasSelection ? (
          isInternalPagesSubPage(currentSubPage) ? (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 mb-1">页面类型</div>
                <div className="text-sm font-medium text-slate-100">{activeInternalPage?.kind === 'dialog' ? '弹窗' : activeInternalPage?.kind === 'content' ? '内容页' : '主界面'}</div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">页面名称</label>
                <input
                  key={activeInternalPage?.id ?? 'main'}
                  defaultValue={activeInternalPage?.name ?? '主界面'}
                  disabled={!activeInternalPage}
                  onBlur={(event) => { if (activeInternalPage && !renameInternalPage(activeInternalPage.id, event.target.value)) event.target.value = activeInternalPage.name; }}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  className="w-full px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded disabled:opacity-60"
                />
              </div>
              {activeInternalPage?.kind === 'dialog' && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                  <div className="text-xs font-medium text-slate-300">遮罩设置</div>
                  <label className="flex items-center justify-between text-xs text-slate-400">
                    <span>遮罩颜色</span>
                    <input type="color" value={activeInternalPage.dialogSettings?.maskColor ?? '#000000'} onChange={(event) => updateDialogSettings(activeInternalPage.id, { maskColor: event.target.value })} onBlur={saveHistory} />
                  </label>
                  <label className="block text-xs text-slate-400">
                    <div className="flex justify-between mb-1"><span>遮罩透明度</span><span>{Math.round((activeInternalPage.dialogSettings?.maskOpacity ?? 0.55) * 100)}%</span></div>
                    <input className="w-full" type="range" min="0" max="1" step="0.05" value={activeInternalPage.dialogSettings?.maskOpacity ?? 0.55} onChange={(event) => updateDialogSettings(activeInternalPage.id, { maskOpacity: Number(event.target.value) })} onMouseUp={saveHistory} onTouchEnd={saveHistory} />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={activeInternalPage.dialogSettings?.closeOnMask ?? false} onChange={(event) => { updateDialogSettings(activeInternalPage.id, { closeOnMask: event.target.checked }); saveHistory(); }} /> 点击遮罩关闭
                  </label>
                  <div className="text-[10px] text-slate-500">底板来源：当前小关卡主界面（实时同步）</div>
                </div>
              )}
              {activeInternalPage?.kind === 'content' && activePageIssues.some((issue) => issue.code === 'no-entry') && (
                <label className="flex items-center gap-2 text-xs text-slate-300 border-t border-slate-700 pt-3">
                  <input type="checkbox" checked={activeInternalPage.noEntryDeferred ?? false} onChange={(event) => { setNoEntryDeferred(activeInternalPage.id, event.target.checked); saveHistory(); }} /> 暂不配置进入按钮
                </label>
              )}
              {activePageIssues.length > 0 && (
                <div className="border-t border-slate-700 pt-3 space-y-2">
                  <div className="text-xs font-medium text-slate-300">页面提醒</div>
                  {activePageIssues.map((issue, index) => (
                    <div key={`${issue.code}-${index}`} className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${issue.severity === 'blocking' ? 'text-red-300' : 'text-amber-300'}`}>
                      <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full"><span className="text-xs text-slate-500">{t('noSelection')}</span></div>
          )
        ) : (
            <>
              {single && (
                <div className="mb-3 text-xs text-slate-500">
                  {t('type')}: <span className="text-slate-300">{translateLabel(elementMeta[single.type]?.label || single.type, language)}</span>
                  <span className="ml-2 text-slate-600">{single.layaType}</span>
                </div>
              )}

              {singleLayerState?.effectiveLocked && (
                <div className="mb-3 border border-amber-500/40 bg-amber-950/30 p-2 text-[10px] leading-relaxed text-amber-200" role="status">
                  {singleLayerState.lockedById && lockedSource
                    ? `受父级锁定：${getLayerDisplayName(lockedSource, elementMeta[lockedSource.type]?.label)}。请先解锁“${getLayerDisplayName(lockedSource, elementMeta[lockedSource.type]?.label)}”。`
                    : '当前图层已锁定，仅可查看属性。'}
                </div>
              )}

              <fieldset
                disabled={Boolean(singleLayerState?.effectiveLocked)}
                aria-disabled={singleLayerState?.effectiveLocked || undefined}
                className={`min-w-0 border-0 p-0 m-0 ${singleLayerState?.effectiveLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >

              {single && (() => {
                const metaLabel = translateLabel(elementMeta[single.type]?.label || single.type, language);
                const layerLabel = editingValues.layerLabel !== undefined
                  ? editingValues.layerLabel
                  : (getExplicitLayerLabel(single) || getLayerDisplayName(single, metaLabel));
                return (
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-16 shrink-0">{t('layerName')}</span>
                      <input
                        className="flex-1 px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                        value={layerLabel}
                        placeholder={getLayerDisplayName(single, metaLabel)}
                        onChange={(event) => setEditingValues((previous) => ({ ...previous, layerLabel: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                          if (event.key === 'Escape') clearEditingValue('layerLabel');
                        }}
                        onBlur={commitLayerLabel}
                      />
                    </div>
                  </div>
                );
              })()}

              {single && !DRAG_GAME_NAME_HIDDEN.includes(single.type) && (
                <details className="mb-2 pb-2 border-b border-slate-700">
                  <summary className="text-xs text-slate-500 mb-1.5 cursor-pointer hover:text-slate-300 select-none">
                    {t('advancedInfo')}
                  </summary>
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-16 shrink-0">{t('componentIdentifier')}</span>
                      <input
                        className="flex-1 min-w-0 px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        value={editingValues.name ?? single.name ?? ''}
                        disabled={singleLayerState?.effectiveLocked}
                        onChange={(event) => {
                          const filtered = event.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                          setEditingValues((previous) => ({ ...previous, name: filtered }));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                          if (event.key === 'Escape') clearEditingValue('name');
                        }}
                        onBlur={commitElementIdentifier}
                      />
                    </div>
                    <div className="text-[10px] leading-relaxed text-slate-500">
                      {t('componentIdentifierHint')}
                    </div>
                  </div>
                </details>
              )}

              {/* 外观样式按钮 */}
              {single && ['ScaleButton', 'TextInput', 'CheckBox', 'Radio', 'ProgressBar', 'Tab', 'RadioGroup', 'VSlider'].includes(single.type) && (
                <button
                  onClick={() => setSkinEditorOpen(true)}
                  className="w-full mb-2 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
                >
                  {t('editSkin')}
                </button>
              )}

              {/* 标签图：替换资源按钮 */}
              {single && single.type === 'NewTabImg' && (
                <button
                  onClick={() => setTabImgPickerOpen(true)}
                  className="w-full mb-2 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
                >
                  {t('replaceResource')}
                </button>
              )}

              {/* 确定按钮：替换资源按钮 */}
              {single && single.type === 'ConfirmButton' && (
                <button
                  onClick={() => setOkBtnPickerOpen(true)}
                  className="w-full mb-2 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
                >
                  {t('replaceResource')}
                </button>
              )}

              {/* 翻页组件：页面管理 */}
              {single && single.type === 'PageTurnBox' && (
                <PageTurnPageList element={single} />
              )}

              {/* 口才课选择题：选项管理 */}
              {single && single.type === 'ChoiceBox' && (() => {
                const hasOptionChildren = currentPage?.elements.some(e => e.parentId === single.id && e.type === 'SpeechSelectableObj');
                return (
                  <div className="mb-2 pb-2 border-b border-slate-700">
                    <div className="text-xs text-slate-500 mb-1.5">{t('optionManagement') || '选项管理'}</div>
                    <div className="flex gap-1">
                      <button onClick={() => addChoiceOption(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                        <Plus size={12} /> {t('addOption') || '添加选项'}
                      </button>
                      <button
                        disabled={!hasOptionChildren}
                        onClick={() => removeChoiceOption(single.id)}
                        className={`flex items-center gap-1 py-1.5 px-2 text-xs border rounded transition-colors ${
                          hasOptionChildren
                            ? 'bg-red-900/40 hover:bg-red-900/70 border-red-800/50 text-red-400 cursor-pointer'
                            : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                        }`}
                        title={hasOptionChildren ? '删除最后一个选项' : '没有可删除的选项'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 填空题：输入格管理 */}
              {single && single.type === 'KlInputBox' && (() => {
                const hasInputChildren = currentPage?.elements.some(e => e.parentId === single.id && e.type === 'KlInputImage');
                return (
                  <div className="mb-2 pb-2 border-b border-slate-700">
                    <div className="text-xs text-slate-500 mb-1.5">填空管理</div>
                    <div className="flex gap-1">
                      <button onClick={() => addFillBlankInput(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                        <Plus size={12} /> 添加选项
                      </button>
                      <button
                        disabled={!hasInputChildren}
                        onClick={() => removeFillBlankInput(single.id)}
                        className={`flex items-center gap-1 py-1.5 px-2 text-xs border rounded transition-colors ${
                          hasInputChildren
                            ? 'bg-red-900/40 hover:bg-red-900/70 border-red-800/50 text-red-400 cursor-pointer'
                            : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                        }`}
                        title={hasInputChildren ? '删除最后一个输入框' : '没有可删除的输入框'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 连线题：连线项管理（一次添加/删除一对：左 camp1 + 右 camp2） */}
              {single && single.type === 'MatchingGame' && (() => {
                const alignMatchingItems = useEditorStore.getState().alignMatchingItems;
                return (
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-slate-500 mb-1.5">连线项管理</div>
                  <div className="flex gap-1 mb-1">
                    <button onClick={() => addMatchingPair(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> 添加选项
                    </button>
                    <button onClick={() => removeMatchingPair(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1 mb-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">阵营1：</span>
                    <button onClick={() => alignMatchingItems(single.id, 'camp1', 'alignH')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="以阵营1第一个连线项的 Y 中心为准">水平对齐</button>
                    <button onClick={() => alignMatchingItems(single.id, 'camp1', 'alignV')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="以阵营1第一个连线项的 X 中心为准">垂直对齐</button>
                    <input type="number" placeholder="水平间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignMatchingItems(single.id, 'camp1', 'spaceH', Number((e.target as HTMLInputElement).value) || 0); }} />
                    <input type="number" placeholder="垂直间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignMatchingItems(single.id, 'camp1', 'spaceV', Number((e.target as HTMLInputElement).value) || 0); }} />
                  </div>
                  <div className="flex gap-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">阵营2：</span>
                    <button onClick={() => alignMatchingItems(single.id, 'camp2', 'alignH')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="以阵营2第一个连线项的 Y 中心为准">水平对齐</button>
                    <button onClick={() => alignMatchingItems(single.id, 'camp2', 'alignV')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="以阵营2第一个连线项的 X 中心为准">垂直对齐</button>
                    <input type="number" placeholder="水平间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignMatchingItems(single.id, 'camp2', 'spaceH', Number((e.target as HTMLInputElement).value) || 0); }} />
                    <input type="number" placeholder="垂直间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignMatchingItems(single.id, 'camp2', 'spaceV', Number((e.target as HTMLInputElement).value) || 0); }} />
                  </div>
                </div>
                );
              })()}

              {/* 拖拽题：组件管理 */}
              {single && single.type === 'DragViewBox' && (() => {
                const alignDragChildren = useEditorStore.getState().alignDragChildren;
                return (
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-slate-500 mb-1.5">拖拽组件管理</div>
                  <div className="flex gap-1 mb-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">放置：</span>
                    <button onClick={() => addDropObj(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> 添加
                    </button>
                    <button onClick={() => removeDropObj(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1 mb-1 ml-12">
                    <button onClick={() => alignDragChildren(single.id, 'DragDropBox', 'alignH')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="水平对齐">水平对齐</button>
                    <button onClick={() => alignDragChildren(single.id, 'DragDropBox', 'alignV')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="垂直对齐">垂直对齐</button>
                    <input type="number" placeholder="水平间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignDragChildren(single.id, 'DragDropBox', 'spaceH', Number((e.target as HTMLInputElement).value) || 0); }} />
                    <input type="number" placeholder="垂直间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignDragChildren(single.id, 'DragDropBox', 'spaceV', Number((e.target as HTMLInputElement).value) || 0); }} />
                  </div>
                  <div className="flex gap-1 mb-1">
                    <span className="text-xs text-slate-400 w-12 leading-7">拖动：</span>
                    <button onClick={() => addDragObj(single.id)} className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      <Plus size={12} /> 添加
                    </button>
                    <button onClick={() => removeDragObj(single.id)} className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1 mb-1 ml-12">
                    <button onClick={() => alignDragChildren(single.id, 'DragDragBox', 'alignH')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="水平对齐">水平对齐</button>
                    <button onClick={() => alignDragChildren(single.id, 'DragDragBox', 'alignV')} className="py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300" title="垂直对齐">垂直对齐</button>
                    <input type="number" placeholder="水平间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignDragChildren(single.id, 'DragDragBox', 'spaceH', Number((e.target as HTMLInputElement).value) || 0); }} />
                    <input type="number" placeholder="垂直间隔" className="w-16 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-white" onKeyDown={(e) => { if (e.key === 'Enter') alignDragChildren(single.id, 'DragDragBox', 'spaceV', Number((e.target as HTMLInputElement).value) || 0); }} />
                  </div>
                </div>
                );
              })()}

              {/* 父容器 */}
              {single && !DRAG_GAME_TYPES.includes(single.type) && (
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-16 shrink-0">{t('parentContainer')}</span>
                    <select
                      className="flex-1 px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                      value={single.parentId ?? ''}
                      onChange={(e) => handleParentChange(e.target.value || undefined)}
                    >
                    <option value="">{t('noneTopLevel')}</option>
                    {elements.filter(el => {
                      if (el.id === single.id) return false;
                      if (!isContainerElementType(el.type)) return false;
                      // 排除自身的子孙（防止循环引用）
                      let pid: string | undefined = el.parentId;
                      while (pid) {
                        if (pid === single.id) return false;
                        const parent = elements.find(e => e.id === pid);
                        pid = parent?.parentId;
                      }
                      return true;
                    }).map(el => (
                      <option key={el.id} value={el.id}>{el.name || translateLabel(elementMeta[el.type]?.label || el.type, language)}</option>
                    ))}
                  </select>
                  </div>
                  {single.parentId && <div className="text-[10px] text-amber-400/70 mt-1">{t('parentContainerHint')}</div>}
                  {parentOverflow && (
                    <div className="mt-2 border border-amber-500/40 bg-amber-950/30 p-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                        <TriangleAlert size={13} aria-hidden="true" />
                        <span>子元素超出父容器范围</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={handleMoveIntoParent}
                          disabled={!parentOverflow.canFit}
                          title={parentOverflow.canFit ? '将当前子元素完整移回父容器' : '子元素尺寸超过父容器，请先扩展容器'}
                          className="flex min-w-0 items-center justify-center gap-1 border border-slate-600 bg-slate-700 px-1.5 py-1 text-[10px] text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CornerDownLeft size={12} aria-hidden="true" />
                          <span>移回容器</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleFitParentToChildren}
                          title="扩大父容器以包含全部后代内容"
                          className="flex min-w-0 items-center justify-center gap-1 border border-amber-500/50 bg-amber-900/40 px-1.5 py-1 text-[10px] text-amber-100 hover:bg-amber-900/60"
                        >
                          <Maximize2 size={12} aria-hidden="true" />
                          <span>扩展容器</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 变换属性 */}
              <div className="mb-2 pb-2 border-b border-slate-700">
                <div className="text-xs text-slate-500 mb-1.5">{t('transform')}</div>
                <div className="grid grid-cols-2 gap-1">
                  {transformFields.slice(0, 4).map((f) => {
                    const val = single ? (single as unknown as Record<string, unknown>)[f.key] : undefined;
                    const isSize = f.key === 'width' || f.key === 'height';
                    const defaultSizeVal = single && isSize ? elementMeta[single.type]?.defaultSize?.[f.key as 'width' | 'height'] : undefined;
                    // 默认值优先用皮肤原始尺寸，其次 meta defaultSize（手动改宽高后 placeholder 仍显示图片原始大小）
                    const naturalSize = single && isSize
                      ? (single.props as Record<string, unknown>)?.[f.key === 'width' ? '_naturalWidth' : '_naturalHeight']
                      : undefined;
                    const effectiveDefault = naturalSize !== undefined && naturalSize !== null ? Number(naturalSize) : (defaultSizeVal ?? 0);
                    const displayVal = editingValues[f.key] ?? (val !== undefined && val !== null ? String(val) : '');
                    return (
                      <div key={f.key} className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 w-4">{f.label}</span>
                        <input type="number" className={`flex-1 min-w-0 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500`}
                          value={displayVal}
                          placeholder={String(effectiveDefault)}
                          onChange={(e) => {
                            setEditingValues(prev => ({ ...prev, [f.key]: e.target.value }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const raw = editingValues[f.key];
                              if (raw === '' || raw === '-' || raw === undefined) {
                                handleTransformChange(f.key, effectiveDefault);
                              } else {
                                const n = Number(raw);
                                if (!isNaN(n)) handleTransformChange(f.key, n);
                              }
                            }
                          }}
                          onBlur={() => {
                            const raw = editingValues[f.key];
                            if (raw !== undefined) {
                              if (raw === '' || raw === '-') {
                                handleTransformChange(f.key, effectiveDefault);
                              } else {
                                const n = Number(raw);
                                if (!isNaN(n)) handleTransformChange(f.key, n);
                              }
                            }
                            setEditingValues(prev => {
                              const next = { ...prev };
                              delete next[f.key];
                              return next;
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                {single && single.type === 'NewImage' && (
                  <button onClick={() => { handleTransformChange('x', 0); handleTransformChange('y', 0); handleTransformChange('width', 1920); handleTransformChange('height', 1080); }}
                    className="w-full mt-1 py-1 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                    {t('optionFill')} 1920×1080
                  </button>
                )}
                {single && !singleLayerState?.effectiveLocked && (
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => { handleTransformChange('x', 0); handleTransformChange('y', 0); }}
                      className="flex-1 py-1 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      {t('resetPosition')}
                    </button>
                    <button onClick={() => {
                      const props = single?.props as Record<string, unknown> | undefined;
                      const dw = Number(props?._naturalWidth ?? elementMeta[single!.type]?.defaultSize?.width ?? 0);
                      const dh = Number(props?._naturalHeight ?? elementMeta[single!.type]?.defaultSize?.height ?? 0);
                      if (dw > 0) handleTransformChange('width', dw);
                      if (dh > 0) handleTransformChange('height', dh);
                    }}
                      className="flex-1 py-1 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors">
                      {t('resetSize')}
                    </button>
                  </div>
                )}
                {transformFields.slice(4).map((f) => {
                  const raw = single ? (single as unknown as Record<string, unknown>)[f.key] : undefined;
                  if (f.type === 'slider') {
                    const display = Math.round(((raw as number) ?? 1) * 100);
                    return (
                      <div key={f.key} className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400 w-16">{f.label}</span>
                        <input type="range" className="flex-1 accent-blue-500" min={f.min} max={f.max} step={f.step}
                          value={display}
                          onChange={(e) => handleTransformChange(f.key, Number(e.target.value) / 100)} />
                        <span className="text-xs text-slate-400 w-8 text-right">{display}%</span>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400 w-16">{f.label}</span>
                      <input type="number" className="flex-1 px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                        value={editingValues[f.key] ?? (raw !== undefined && raw !== null ? String(raw) : '')}
                        placeholder="0"
                        onChange={(e) => { setEditingValues(prev => ({ ...prev, [f.key]: e.target.value })); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const r = editingValues[f.key];
                            if (r === '' || r === '-' || r === undefined) {
                              handleTransformChange(f.key, 0);
                            } else {
                              const n = Number(r);
                              if (!isNaN(n)) handleTransformChange(f.key, n);
                            }
                            setEditingValues(prev => { const next = { ...prev }; delete next[f.key]; return next; });
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onBlur={() => {
                          const r = editingValues[f.key];
                          if (r !== undefined && r !== '' && r !== '-') {
                            const n = Number(r);
                            if (!isNaN(n)) handleTransformChange(f.key, n);
                          }
                          setEditingValues(prev => { const next = { ...prev }; delete next[f.key]; return next; });
                        }} />
                    </div>
                  );
                })}
              </div>

              {/* 组件属性（按 group 分组，advanced 字段单独折叠） */}
              {properties.length > 0 && (() => {
                const normalProps = properties.filter(p => !p.advanced);
                const advancedProps = properties.filter(p => p.advanced);
                const groups = new Map<string, typeof properties>();
                normalProps.forEach((f) => {
                  const g = f.group || t('properties');
                  if (!groups.has(g)) groups.set(g, []);
                  groups.get(g)!.push(f);
                });
                const isInputImage = meta?.layaType === 'KlInputImage';
                if (isInputImage && !groups.has('交互')) groups.set('交互', []);
                const renderField = (field: PropertyDef) => {
                  const propDefault = single ? (elementMeta[single.type]?.defaultProps as Record<string, unknown> | undefined)?.[field.key] : undefined;
                  const numDefault = typeof propDefault === 'number' ? propDefault : undefined;
                  const fieldEl = <FieldRenderer key={field.key} field={field} elements={selectedElements} onChange={handleChange} propDefault={numDefault} />;
                  // DropObj 的 skin/tipSkin 字段：追加「对齐」按钮
                  if (single && single.type === 'DropObj' && (field.key === 'skin' || field.key === 'tipSkin')) {
                    const alignDropObjToSkin = useEditorStore.getState().alignDropObjToSkin;
                    const btnText = field.key === 'skin' ? '对齐放置区皮肤尺寸' : '对齐放置区提示图尺寸';
                    return (
                      <div key={field.key}>
                        {fieldEl}
                        <button onClick={() => alignDropObjToSkin(single.id, field.key as 'skin' | 'tipSkin')} className="mt-0.5 mb-1 py-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 w-full">
                          {btnText}
                        </button>
                      </div>
                    );
                  }
                  return fieldEl;
                };
                return (
                  <>
                    {Array.from(groups.entries()).map(([groupName, fields]) => (
                      <div key={groupName} className="mb-2 pb-2 border-b border-slate-700">
                        <div className="text-xs text-slate-500 mb-1.5">{groupName}</div>
                        {fields.map(renderField)}
                        {isInputImage && groupName === '交互' && (
                          <button
                            onClick={() => setBindKeyboardOpen(true)}
                            className="w-full mt-1.5 py-1.5 text-xs bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded text-blue-200"
                          >
                            绑定键盘
                          </button>
                        )}
                      </div>
                    ))}
                    {advancedProps.length > 0 && (
                      <details className="mb-2 pb-2 border-b border-slate-700">
                        <summary className="text-xs text-slate-500 mb-1.5 cursor-pointer hover:text-slate-300 select-none">高级设置</summary>
                        <div className="mt-1.5">
                          {advancedProps.map(renderField)}
                        </div>
                      </details>
                    )}
                  </>
                );
              })()}

              {single && single.type !== 'DragDropBox' && single.type !== 'DragDragBox' && single.type !== 'DropObj' && single.type !== 'DragObj' && (
                <ActionEditor
                  element={single}
                  pages={currentStage?.subPages ?? []}
                  allElements={currentPage?.elements ?? []}
                  onChange={handleActionsChange}
                  onTargetPropsChange={(targetId, key, value) => {
                    const target = elements.find((item) => item.id === targetId);
                    if (!target || getElementLayerState(target, elementMap).effectiveLocked) return;
                    updateElement(targetId, { props: { ...target.props, [key]: value } });
                  }}
                  onTargetPropsCommit={saveHistory}
                />
              )}

              {!singleLayerState?.effectiveLocked && (
                <button
                  onClick={handleDelete}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400"
                >
                  <Trash2 size={12} /> {t('deleteElement')}
                </button>
              )}
              </fieldset>
            </>
          )}
        </div>
    </div>

    {/* 皮肤编辑器弹窗 */}
    {skinEditorOpen && single && (
      <SkinEditor
        layaType={single.layaType ?? single.type}
        currentProps={single.props ?? {}}
        onApply={(skin, params) => {
          const allChanges = { skin, ...params };
          selectedElements.forEach((el) => {
            updateElement(el.id, { props: { ...el.props, ...allChanges } } as Partial<Element>);
          });
          setSkinEditorOpen(false);
        }}
        onClose={() => setSkinEditorOpen(false)}
      />
    )}

    {/* 绑定键盘弹窗 */}
    {bindKeyboardOpen && single && (
      <BindKeyboardModal
        keyboards={(currentPage?.elements ?? [])
          .filter((el) => el.type === 'KlBaseKeyboard')
          .map((el) => {
            const props = el.props as { _keyboardPreset?: { id?: string }; camp?: unknown } | undefined;
            const presetId = props?._keyboardPreset?.id;
            const preset = KEYBOARD_PRESETS.find((p) => p.id === presetId);
            const thumbnail = preset?.thumbnail ?? elementMeta[el.type]?.placeholderImage;
            return {
              element: el,
              camp: String(props?.camp ?? ''),
              thumbnail,
            };
          })}
        currentCamp={String((single.props as Record<string, unknown> | undefined)?.camp ?? '')}
        onSelect={(camp) => {
          handleChange('camp', camp);
          setBindKeyboardOpen(false);
        }}
        onClose={() => setBindKeyboardOpen(false)}
      />
    )}

    {/* 标签图替换资源弹窗 */}
    {tabImgPickerOpen && single && (
      <TabImgPicker
        currentSkin={String((single.props as Record<string, unknown>)?.skin ?? '')}
        onSelect={(skinExportPath) => {
          handleChange('skin', skinExportPath);
          // 替换资源后按原图尺寸自动调整宽高
          const asset = lookupBuiltinByExportPath(skinExportPath);
          if (asset) {
            const img = new Image();
            img.onload = () => {
              const w = img.naturalWidth, h = img.naturalHeight;
              if (w > 0 && h > 0) {
                selectedElements.forEach((el) => updateElement(el.id, { width: w, height: h, props: { _naturalWidth: w, _naturalHeight: h } }));
              }
            };
            img.src = `/builtin/${asset.src}`;
          }
        }}
        onClose={() => setTabImgPickerOpen(false)}
      />
    )}

    {/* 确定按钮替换资源弹窗 */}
    {okBtnPickerOpen && single && (
      <OkBtnPicker
        currentSkin={String((single.props as Record<string, unknown>)?.skin ?? '')}
        onSelect={(skinExportPath) => {
          handleChange('skin', skinExportPath);
          const asset = lookupBuiltinByExportPath(skinExportPath);
          if (asset) {
            const img = new Image();
            img.onload = () => {
              const w = img.naturalWidth, h = img.naturalHeight;
              if (w > 0 && h > 0) {
                selectedElements.forEach((el) => updateElement(el.id, { width: w, height: h, props: { _naturalWidth: w, _naturalHeight: h } }));
              }
            };
            img.src = `/builtin/${asset.src}`;
          }
        }}
        onClose={() => setOkBtnPickerOpen(false)}
      />
    )}
    </>
  );
}
