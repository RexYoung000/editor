import { Crosshair, Link2, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Action, Element, Page } from '../types';
import { elementMeta } from '../elements/elementMeta';
import { useI18n } from '../i18n/context';
import { getCourseDirPath } from '../utils/electronFs';
import { useEditorStore } from '../store/editorStore';
import { getElementPages, isInternalPagesSubPage, isPageAction } from '../utils/internalPages';
import { findSubPage } from '../utils/findSubPage';
import { createElementMap, isElementLocked } from '../utils/layerState';
import {
  getSdkJudgeCapability,
  getSdkJudgeConditionLabel,
  isSdkJudgeTarget,
  SDK_JUDGE_EVENT,
  type JudgeCondition,
} from '../utils/sdkJudge';
import { isInputRuleHost } from '../utils/inputAnswerRules';

function generateId(): string {
  return crypto.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const ELEMENT_TARGET_ACTIONS = new Set([
  'toggleVisible',
  'setVisible',
  'setProperty',
  'animate',
  'pageTurnPrevOnce',
  'pageTurnNextOnce',
  'pageTurnPrevLoop',
  'pageTurnNextLoop',
  'pageTurnGoTo',
]);

interface Props {
  element: Element;
  pages: Page[];
  allElements: Element[];
  onChange: (actions: Action[]) => void;
  onTargetPropsChange?: (targetId: string, key: string, value: unknown) => void;
  onTargetPropsCommit?: () => void;
}

export default function ActionEditor({
  element,
  pages,
  allElements,
  onChange,
  onTargetPropsChange,
  onTargetPropsCommit,
}: Props) {
  const { t } = useI18n();
  const actions = element.actions ?? [];

  const course = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);
  const currentInternalPageId = useEditorStore((s) => s.currentInternalPageId);
  const selectElement = useEditorStore((s) => s.selectElement);
  const internalSubPage = findSubPage(course, currentSubPageId);
  const internalPageRefs = isInternalPagesSubPage(internalSubPage) ? getElementPages(internalSubPage) : [];
  const editingDialog = internalPageRefs.find((page) => page.id === currentInternalPageId)?.kind === 'dialog';
  const isHwOrEval = course?.kind === 'homework' || course?.kind === 'sEvaluation';

  const isDragViewBox = element.type === 'DragViewBox';
  const isSpine = element.type === 'Spine';
  const isImage = element.type === 'NewImage';
  const isConfirmButton = element.type === 'ConfirmButton';
  const isChoiceBox = element.layaType === 'ChoiceBox';
  const isInputRuleTarget = isInputRuleHost(element);
  const isMatchingGame = element.layaType === 'MatchingGame';
  const isNewBrushSprite = element.type === 'NewBrushSprite';
  const hideAddButton = element.type === 'DropObj' || element.type === 'DragObj';
  const elementMap = createElementMap(allElements);
  const sdkJudgeTargets = allElements.filter(isSdkJudgeTarget);
  const hasSdkJudgeEvent = actions.some((action) => action.event === SDK_JUDGE_EVENT);
  const inboundJudgeSources = allElements.filter((source) =>
    source.id !== element.id
    && (source.actions ?? []).some((action) =>
      action.event === SDK_JUDGE_EVENT && action.judgeTargetId === element.id,
    ),
  );

  // 当前元素是否为 ChoiceBox 内的 SelectableObj（layaType=SelectableObj 且父级 layaType=ChoiceBox）
  const parentEl = element.parentId ? allElements.find((e) => e.id === element.parentId) : undefined;
  const isSelInChoice = element.layaType === 'SelectableObj' && parentEl?.layaType === 'ChoiceBox';
  // 同一 ChoiceBox 下是否已有兄弟配置了 onAutoClick（用于过滤选项，保证唯一性）
  const siblingHasAutoClick = isSelInChoice && allElements.some((e) =>
    e.id !== element.id
    && e.parentId === element.parentId
    && e.layaType === 'SelectableObj'
    && (e.actions ?? []).some((a) => a.event === 'onAutoClick'),
  );
  const selfHasAutoClick = (element.actions ?? []).some((a) => a.event === 'onAutoClick');
  const showAutoClickOption = isSelInChoice && (!siblingHasAutoClick || selfHasAutoClick);

  // 画布上是否存在 DragViewBox / MatchingGame（决定 ConfirmButton 的"点击+游戏判断"事件是否可见）
  const hasGameTarget = allElements.some((e) => e.type === 'DragViewBox' || e.type === 'MatchingGame');
  // 画布上是否存在选择题或答题判定容器（决定 ConfirmButton 的“点击+SDK通用判断”事件是否可见）
  const hasChoiceOrInput = allElements.some((e) => isInputRuleHost(e) || e.layaType === 'ChoiceBox');

  const EVENT_OPTS = [
    ...(isImage ? [
      { value: 'onClickSound', label: '点击(有点击音效)' },
      { value: 'onClick', label: '点击(无点击音效)' },
    ] : [
      { value: 'onClick', label: t('eventClick') },
    ]),
    ...(isDragViewBox ? [
      { value: 'onDragJudge', label: '自动判定是否全对' },
    ] : []),
    ...(isSpine ? [
      { value: 'onAutoPlay', label: '直接播放' },
      { value: 'onPlayEnd', label: t('eventPlayEnd') },
    ] : []),
    ...(showAutoClickOption ? [
      { value: 'onAutoClick', label: '自动执行一次点击' },
    ] : []),
    ...((sdkJudgeTargets.length > 0 || hasSdkJudgeEvent) ? [
      { value: SDK_JUDGE_EVENT, label: '点击 + SDK 判断（可配置结果）' },
    ] : []),
    ...(isConfirmButton && hasChoiceOrInput && !isHwOrEval ? [
      { value: 'onClickInitConfirm', label: '点击 + SDK 默认反馈（兼容）' },
      { value: 'onClickInitConfirmWithLock', label: '点击 + SDK 默认反馈 + 锁屏（兼容）' },
      { value: 'onClickInitConfirmCH', label: '点击+口才文字动画通用判断(不经SDK)' },
      { value: 'onClickInitConfirmCHWithLock', label: '点击+口才文字动画通用判断(不经SDK)+锁屏' },
    ] : []),
    ...(isConfirmButton && hasGameTarget ? [
      { value: 'onClickInitGameConfirm', label: '点击 + 游戏默认反馈（兼容）' },
      { value: 'onClickInitGameConfirmWithLock', label: '点击 + 游戏默认反馈 + 锁屏（兼容）' },
      ...(!isHwOrEval ? [
        { value: 'onClickInitGameConfirmCH', label: '点击+口才文字动画通用判断(不经SDK)' },
        { value: 'onClickInitGameConfirmCHWithLock', label: '点击+口才文字动画通用判断(不经SDK)+锁屏' },
      ] : []),
    ] : []),
    ...(isChoiceBox ? [
      { value: 'onChoiceJudge', label: '自动判定是否全对' },
    ] : []),
    ...(isInputRuleTarget ? [
      { value: 'onInputJudge', label: '自动判定是否全对' },
    ] : []),
    ...(isMatchingGame ? [
      { value: 'onMatchingJudge', label: '自动判定是否全对' },
    ] : []),
    ...(isNewBrushSprite ? [
      { value: 'onInitBrush', label: '初始化画笔功能' },
    ] : []),
  ];

  const BASE_ACTION_OPTS = [
    { value: 'none',          label: '无' },
    { value: 'toggleVisible', label: t('actionToggleVisible') },
    { value: 'setVisible',    label: t('actionSetVisible') },
    { value: 'playSound',     label: t('actionPlaySound') },
    { value: 'playRightSound', label: '播放正确音效' },
    { value: 'playWrongSound', label: '播放错误音效' },
    { value: 'showAnswerRight', label: '播放SDK通用胜利动画' },
    { value: 'showAnswerRightLock', label: '播放SDK通用胜利动画+锁屏' },
    { value: 'showAnswerWrong', label: '播放SDK通用失败动画' },
    { value: 'animate',       label: t('actionAnimate') },
    ...(isInternalPagesSubPage(internalSubPage)
      ? editingDialog
        ? [{ value: 'closeInternalDialog', label: '关闭当前弹窗' }]
        : [
            { value: 'navigateInternalPage', label: '跳转内容页' },
            { value: 'openInternalDialog', label: '打开弹窗' },
          ]
      : []),
  ];
  const PAGE_TURN_ACTION_OPTS = [
    { value: 'pageTurnPrevOnce', label: '向左翻页(不循环)' },
    { value: 'pageTurnNextOnce', label: '向右翻页(不循环)' },
    { value: 'pageTurnPrevLoop', label: '向左翻页(循环)' },
    { value: 'pageTurnNextLoop', label: '向右翻页(循环)' },
    { value: 'pageTurnGoTo',     label: '跳转到指定页' },
  ];
  const getActionOpts = (action: Action) => {
    const targetEl = action.targetId ? allElements.find(e => e.id === action.targetId) : undefined;
    let opts = BASE_ACTION_OPTS;
    if (targetEl?.type === 'PageTurnBox') opts = [...opts, ...PAGE_TURN_ACTION_OPTS];
    const isClickEvent = action.event === 'onClick' || action.event === 'onClickSound';
    const isJudgeEvent = action.event === 'onChoiceJudge' || action.event === 'onInputJudge'
      || action.event === 'onMatchingJudge' || action.event === 'onDragJudge';
    if (!isHwOrEval && (isClickEvent || isJudgeEvent)) {
      opts = [...opts,
        { value: 'playKcRightAni', label: '播放口才文字胜利动画' },
        { value: 'playKcRightAniLock', label: '播放口才文字胜利动画+锁屏' },
        { value: 'playKcWrongAni', label: '播放口才文字失败动画' },
      ];
    }
    return opts;
  };

  const update = (i: number, patch: Partial<Action>) =>
    onChange(actions.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  const remove = (i: number) => onChange(actions.filter((_, idx) => idx !== i));

  function newAction(
    event: string = 'onClick',
    targetId?: string,
    groupId?: string,
    judgeTarget?: Element,
  ): Action {
    return {
      id: generateId(),
      event,
      targetId,
      targetNameSnapshot: targetId ? allElements.find((item) => item.id === targetId)?.name : undefined,
      actionType: 'toggleVisible',
      groupId: groupId ?? generateId(),
      judgeTargetId: judgeTarget?.id,
      judgeTargetNameSnapshot: judgeTarget?.name,
    };
  }

  // 优先按 groupId 分组；老数据没 groupId 时按 (event, targetId) 兜底
  type Group = {
    event: string;
    targetId: string | undefined;
    targetNameSnapshot: string | undefined;
    judgeTargetId: string | undefined;
    judgeTargetNameSnapshot: string | undefined;
    indices: number[];
    key: string;
  };
  const groups: Group[] = [];
  {
    const seen = new Map<string, number>();
    actions.forEach((a, i) => {
      const key = a.groupId ?? `__legacy:${a.event}|${a.targetId ?? ''}|${a.judgeTargetId ?? ''}`;
      let g = seen.get(key);
      if (g === undefined) {
        g = groups.length;
        seen.set(key, g);
        groups.push({
          event: a.event,
          targetId: a.targetId,
          targetNameSnapshot: a.targetNameSnapshot,
          judgeTargetId: a.judgeTargetId,
          judgeTargetNameSnapshot: a.judgeTargetNameSnapshot,
          indices: [],
          key,
        });
      }
      groups[g].indices.push(i);
    });
  }

  const updateGroup = (group: Group, patch: Partial<Action>) =>
    onChange(actions.map((a, idx) => group.indices.includes(idx) ? { ...a, ...patch } : a));

  const removeGroup = (group: Group) =>
    onChange(actions.filter((_, idx) => !group.indices.includes(idx)));

  const addInGroup = (group: Group) => {
    const lastIdx = group.indices[group.indices.length - 1];
    const groupId = actions[lastIdx]?.groupId ?? group.key;
    const next = [...actions];
    const judgeTarget = group.judgeTargetId
      ? allElements.find((item) => item.id === group.judgeTargetId)
      : undefined;
    next.splice(lastIdx + 1, 0, newAction(group.event, group.targetId, groupId, judgeTarget));
    onChange(next);
  };

  // ─── onDragJudge 子事件相关 ───

  /** 按 branchId 二次分组：返回 [{branchId, condition, indices}] */
  function getBranches(group: Group): Array<{ branchId: string; condition: JudgeCondition; indices: number[] }> {
    const map = new Map<string, { branchId: string; condition: JudgeCondition; indices: number[] }>();
    for (const i of group.indices) {
      const a = actions[i];
      const bid = a.branchId ?? '_default';
      let entry = map.get(bid);
      if (!entry) {
        entry = { branchId: bid, condition: a.branchCondition ?? 'right', indices: [] };
        map.set(bid, entry);
      }
      entry.indices.push(i);
    }
    return Array.from(map.values());
  }

  /** 创建一条子事件 action（actionType='none'） */
  function newJudgeAction(
    event: string,
    groupId: string,
    branchId: string,
    condition: JudgeCondition,
    judgeTarget?: Element,
    actionType = 'none',
  ): Action {
    return {
      id: generateId(),
      event,
      targetId: undefined,
      actionType,
      groupId,
      branchId,
      branchCondition: condition,
      judgeTargetId: judgeTarget?.id,
      judgeTargetNameSnapshot: judgeTarget?.name,
    };
  }

  function newSdkJudgeActions(groupId: string, judgeTarget?: Element): Action[] {
    const capability = getSdkJudgeCapability(judgeTarget);
    if (!capability) return [];
    return capability.conditions.map((condition) => newJudgeAction(
      SDK_JUDGE_EVENT,
      groupId,
      generateId(),
      condition,
      judgeTarget,
      condition === 'right' ? 'showAnswerRight' : condition === 'wrong' ? 'showAnswerWrong' : 'none',
    ));
  }

  /** 切换某子事件的 condition（同 branchId 的所有 actions 都更新） */
  const updateBranchCondition = (group: Group, branchId: string, cond: JudgeCondition) =>
    onChange(actions.map((a, idx) =>
      group.indices.includes(idx) && (a.branchId ?? '_default') === branchId
        ? { ...a, branchCondition: cond }
        : a,
    ));

  /** 在某 group 末尾追加一个新子事件（默认 condition='right'，含一条 actionType='none'） */
  const addBranch = (group: Group) => {
    const lastIdx = group.indices[group.indices.length - 1];
    const groupId = actions[lastIdx]?.groupId ?? group.key;
    const newBranchId = generateId();
    const next = [...actions];
    const judgeTarget = group.judgeTargetId
      ? allElements.find((item) => item.id === group.judgeTargetId)
      : undefined;
    next.splice(lastIdx + 1, 0, newJudgeAction(group.event, groupId, newBranchId, 'right', judgeTarget));
    onChange(next);
  };

  /** 删除某子事件（同 branchId 的所有 actions 一起删） */
  const removeBranch = (group: Group, branchId: string) =>
    onChange(actions.filter((a, idx) =>
      !(group.indices.includes(idx) && (a.branchId ?? '_default') === branchId),
    ));

  /** 在某子事件的最后一条动作之后追加一条新动作（共用同 branchId） */
  const addInBranch = (group: Group, branchId: string) => {
    const branchIndices = group.indices.filter(i => (actions[i].branchId ?? '_default') === branchId);
    const lastIdx = branchIndices[branchIndices.length - 1];
    const groupId = actions[lastIdx]?.groupId ?? group.key;
    const cond = actions[lastIdx]?.branchCondition ?? 'right';
    const judgeTarget = group.judgeTargetId
      ? allElements.find((item) => item.id === group.judgeTargetId)
      : undefined;
    const next = [...actions];
    next.splice(lastIdx + 1, 0, newJudgeAction(group.event, groupId, branchId, cond, judgeTarget));
    onChange(next);
  };

  const updateSdkJudgeTarget = (group: Group, judgeTarget?: Element) => {
    const next = actions.map((action, index) => group.indices.includes(index)
      ? {
          ...action,
          judgeTargetId: judgeTarget?.id,
          judgeTargetNameSnapshot: judgeTarget?.name,
        }
      : action,
    );
    const capability = getSdkJudgeCapability(judgeTarget);
    const hasNullBranch = group.indices.some((index) => actions[index].branchCondition === 'null');
    if (capability?.conditions.includes('null') && !hasNullBranch) {
      const lastIdx = group.indices[group.indices.length - 1];
      const groupId = actions[lastIdx]?.groupId ?? group.key;
      next.splice(lastIdx + 1, 0, newJudgeAction(
        SDK_JUDGE_EVENT,
        groupId,
        generateId(),
        'null',
        judgeTarget,
      ));
    }
    onChange(next);
  };

  return (
    <div className="mt-3 border-t border-slate-700 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-300">{t('eventActions')}</span>
        {!hideAddButton && (
          <button
            onClick={() => onChange([...actions, newAction()])}
            className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {inboundJudgeSources.length > 0 && (
        <div className="mb-2 border border-blue-800/50 bg-blue-950/30 p-1.5 text-[10px] text-slate-300">
          <div className="mb-1 flex items-center gap-1 text-blue-300">
            <Link2 size={11} />
            <span>被 {inboundJudgeSources.length} 个触发元素判定</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {inboundJudgeSources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => selectElement(source.id, false)}
                className="border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:bg-slate-700"
              >
                {source.name ?? source.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {actions.length === 0 && (
        <div className="text-xs text-slate-600 text-center py-1.5">{t('noActions')}</div>
      )}

      {groups.map((group) => (
        <div key={group.key} className="mb-2 p-2 bg-slate-900/60 rounded border border-slate-700/60 text-xs">
          {/* Row 1: event + delete group */}
          <div className="flex items-center gap-1 mb-1">
            <select
              value={group.event}
              onChange={(e) => {
                const nextEvent = e.target.value;
                // 点击 SDK 判定：事件属于当前触发元素，判定目标独立于结果动作目标。
                if (nextEvent === SDK_JUDGE_EVENT && group.event !== SDK_JUDGE_EVENT) {
                  const groupId = actions[group.indices[0]]?.groupId ?? group.key;
                  const currentTarget = group.judgeTargetId
                    ? allElements.find((item) => item.id === group.judgeTargetId)
                    : undefined;
                  const judgeTarget = isSdkJudgeTarget(currentTarget) ? currentTarget : sdkJudgeTargets[0];
                  const newActions = newSdkJudgeActions(groupId, judgeTarget);
                  if (newActions.length === 0) return;
                  const minIdx = Math.min(...group.indices);
                  const next = actions.filter((_, idx) => !group.indices.includes(idx));
                  next.splice(minIdx, 0, ...newActions);
                  onChange(next);
                  return;
                }
                // 切到 onDragJudge：清空旧动作，自动填充 right + wrong 两个默认子事件
                if (nextEvent === 'onDragJudge' && group.event !== 'onDragJudge') {
                  const groupId = actions[group.indices[0]]?.groupId ?? group.key;
                  const newActions: Action[] = [
                    newJudgeAction('onDragJudge', groupId, generateId(), 'right'),
                    newJudgeAction('onDragJudge', groupId, generateId(), 'wrong'),
                  ];
                  const minIdx = Math.min(...group.indices);
                  const next = actions.filter((_, idx) => !group.indices.includes(idx));
                  next.splice(minIdx, 0, ...newActions);
                  onChange(next);
                  return;
                }
                // 切到 onChoiceJudge / onInputJudge / onMatchingJudge：自动填充 right + wrong + null 三个默认子事件
                if ((nextEvent === 'onChoiceJudge' || nextEvent === 'onInputJudge' || nextEvent === 'onMatchingJudge')
                    && group.event !== nextEvent) {
                  const groupId = actions[group.indices[0]]?.groupId ?? group.key;
                  const newActions: Action[] = [
                    newJudgeAction(nextEvent, groupId, generateId(), 'right'),
                    newJudgeAction(nextEvent, groupId, generateId(), 'wrong'),
                    newJudgeAction(nextEvent, groupId, generateId(), 'null'),
                  ];
                  const minIdx = Math.min(...group.indices);
                  const next = actions.filter((_, idx) => !group.indices.includes(idx));
                  next.splice(minIdx, 0, ...newActions);
                  onChange(next);
                  return;
                }
                const patch: Partial<Action> = { event: nextEvent };
                // 切到 onClickInitConfirm*：如果当前 target 不是答题判定容器 / ChoiceBox，默认选择第一个有效目标
                if (nextEvent === 'onClickInitConfirm' || nextEvent === 'onClickInitConfirmWithLock') {
                  const currentTarget = group.targetId ? allElements.find((el) => el.id === group.targetId) : null;
                  const isValid = currentTarget && (isInputRuleHost(currentTarget) || currentTarget.layaType === 'ChoiceBox');
                  if (!isValid) {
                    const firstValid = allElements.find((el) => isInputRuleHost(el) || el.layaType === 'ChoiceBox');
                    patch.targetId = firstValid?.id;
                    patch.targetNameSnapshot = firstValid?.name;
                  }
                }
                // 切到 onClickInitGameConfirm*：如果当前 target 不是 DragViewBox 或 MatchingGame，默认选画布上第一个
                if (nextEvent === 'onClickInitGameConfirm' || nextEvent === 'onClickInitGameConfirmWithLock'
                    || nextEvent === 'onClickInitGameConfirmCH' || nextEvent === 'onClickInitGameConfirmCHWithLock') {
                  const currentTarget = group.targetId ? allElements.find((el) => el.id === group.targetId) : null;
                  const isValid = currentTarget && (currentTarget.type === 'DragViewBox' || currentTarget.type === 'MatchingGame');
                  if (!isValid) {
                    const firstValid = allElements.find((el) => el.type === 'DragViewBox' || el.type === 'MatchingGame');
                    patch.targetId = firstValid?.id;
                  }
                }
                updateGroup(group, patch);
              }}
              className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
            >
              {EVENT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => removeGroup(group)} className="p-0.5 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400">
              <Trash2 size={11} />
            </button>
          </div>

          {/* onPlayEnd 专属：是否隐藏自己（组级别共享） */}
          {group.event === 'onPlayEnd' && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-slate-500 w-7 shrink-0">{t('hideSelf')}</span>
              <select value={actions[group.indices[0]].hideSelf ? 'true' : 'false'}
                onChange={(e) => updateGroup(group, { hideSelf: e.target.value === 'true' })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                <option value="true">{t('yes')}</option>
                <option value="false">{t('no')}</option>
              </select>
            </div>
          )}

          {/* Row 2: target（onAutoPlay / onAutoClick / onDragJudge / onChoiceJudge / onInputJudge / onMatchingJudge / onInitBrush 不显示标准下拉） */}
          {(group.event === 'onDragJudge' || group.event === 'onChoiceJudge' || group.event === 'onInputJudge' || group.event === 'onMatchingJudge' || group.event === 'onInitBrush') && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-slate-500 w-7 shrink-0">{t('target')}</span>
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-500 cursor-not-allowed">
                自己
              </div>
            </div>
          )}
          {group.event === SDK_JUDGE_EVENT && (() => {
            const judgeTarget = group.judgeTargetId
              ? allElements.find((item) => item.id === group.judgeTargetId)
              : undefined;
            const capability = getSdkJudgeCapability(judgeTarget);
            const targetMissing = Boolean(group.judgeTargetId && !capability);
            const targetLocked = judgeTarget ? isElementLocked(judgeTarget, elementMap) : false;
            return (
              <div className="mb-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 w-12 shrink-0">判定目标</span>
                  <select
                    value={group.judgeTargetId ?? ''}
                    onChange={(event) => updateSdkJudgeTarget(
                      group,
                      allElements.find((item) => item.id === event.target.value),
                    )}
                    className={`flex-1 min-w-0 border rounded px-1 py-0.5 ${
                      targetMissing
                        ? 'bg-red-950/50 border-red-700 text-red-200'
                        : 'bg-slate-700 border-slate-600 text-slate-200'
                    }`}
                  >
                    {!group.judgeTargetId && <option value="">请选择可判定组件</option>}
                    {targetMissing && (
                      <option value={group.judgeTargetId}>
                        目标已失效：{group.judgeTargetNameSnapshot ?? group.judgeTargetId}
                      </option>
                    )}
                    {sdkJudgeTargets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name ?? item.id} ({elementMeta[item.type]?.label ?? item.type})
                      </option>
                    ))}
                  </select>
                </div>
                {targetMissing && (
                  <div className="pl-12 text-[10px] text-red-300">
                    判定目标已删除或不再支持 SDK 判定，请重新选择。
                  </div>
                )}
                {judgeTarget && capability && (
                  <div className="border border-slate-700 bg-slate-800/70 p-1.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">判定配置保存在目标组件</span>
                      <button
                        type="button"
                        onClick={() => selectElement(judgeTarget.id, false)}
                        className="flex items-center gap-1 text-[10px] text-blue-300 hover:text-blue-200"
                      >
                        <Crosshair size={11} /> 编辑目标
                      </button>
                    </div>
                    {capability.kind === 'input' || capability.kind === 'inputImage' ? (
                      <div className="text-[10px] text-slate-500">
                        {capability.kind === 'input'
                          ? '请进入目标组件配置空位候选答案或两框算式关系。'
                          : '请进入目标组件配置候选正确答案。'}
                      </div>
                    ) : capability.answerKey ? (
                      <label className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="w-14 shrink-0">{capability.answerLabel}</span>
                        <input
                          type="text"
                          value={String(judgeTarget.props[capability.answerKey] ?? '')}
                          disabled={targetLocked || !onTargetPropsChange}
                          onChange={(event) => onTargetPropsChange?.(
                            judgeTarget.id,
                            capability.answerKey!,
                            event.target.value,
                          )}
                          onBlur={onTargetPropsCommit}
                          className="min-w-0 flex-1 border border-slate-600 bg-slate-700 px-1 py-0.5 text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>
                    ) : (
                      <div className="text-[10px] text-slate-500">
                        {capability.kind === 'drag'
                          ? '正确关系由拖拽对象与放置区域配置。'
                          : '正确关系由连线项配置。'}
                      </div>
                    )}
                    {targetLocked && <div className="mt-1 text-[10px] text-amber-400">目标已锁定，答案只能查看。</div>}
                  </div>
                )}
              </div>
            );
          })()}
          {group.event === 'onClickInitBrush' && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-slate-500 w-7 shrink-0">{t('target')}</span>
              <select
                value={group.targetId ?? ''}
                onChange={(e) => updateGroup(group, { targetId: e.target.value || undefined })}
                className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
              >
                {!group.targetId && <option value="">请选择画笔</option>}
                {allElements.filter((el) => el.type === 'NewBrushSprite').map((el) => (
                  <option key={el.id} value={el.id}>{el.name ?? el.id} (画笔)</option>
                ))}
              </select>
            </div>
          )}
          {group.event !== SDK_JUDGE_EVENT && group.event !== 'onAutoPlay' && group.event !== 'onAutoClick' && group.event !== 'onDragJudge' && group.event !== 'onChoiceJudge' && group.event !== 'onInputJudge' && group.event !== 'onMatchingJudge' && group.event !== 'onClickInitBrush' && group.event !== 'onInitBrush' && (() => {
            const isInitConfirm = group.event === 'onClickInitConfirm' || group.event === 'onClickInitConfirmWithLock';
            const isInitGameConfirm = group.event === 'onClickInitGameConfirm' || group.event === 'onClickInitGameConfirmWithLock'
              || group.event === 'onClickInitGameConfirmCH' || group.event === 'onClickInitGameConfirmCHWithLock';
            const currentTarget = group.targetId ? allElements.find((item) => item.id === group.targetId) : undefined;
            const targetMissing = Boolean(group.targetId && (
              (isInitConfirm && (!currentTarget || (!isInputRuleHost(currentTarget) && currentTarget.layaType !== 'ChoiceBox')))
              || (isInitGameConfirm && (!currentTarget || (currentTarget.type !== 'DragViewBox' && currentTarget.type !== 'MatchingGame')))
            ));
            return (
              <div className="mb-1 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 w-7 shrink-0">{t('target')}</span>
                  <select
                    value={group.targetId ?? ''}
                    onChange={(e) => {
                      const nextTarget = allElements.find((item) => item.id === e.target.value);
                      updateGroup(group, {
                        targetId: nextTarget?.id,
                        targetNameSnapshot: nextTarget?.name,
                      });
                    }}
                    className={`flex-1 min-w-0 border rounded px-1 py-0.5 ${targetMissing ? 'bg-red-950/50 border-red-700 text-red-200' : 'bg-slate-700 border-slate-600 text-slate-200'}`}
                  >
                    {/* onClickInitConfirm* / onClickInitGameConfirm* 事件不允许指向自身 */}
                    {!isInitConfirm && !isInitGameConfirm && <option value="">{t('self')}</option>}
                    {isInitConfirm && !group.targetId && <option value="">请选择输入框容器或选择题容器</option>}
                    {isInitGameConfirm && !group.targetId && <option value="">请选择拖拽容器或连线游戏</option>}
                    {targetMissing && (
                      <option value={group.targetId}>目标已失效：{group.targetNameSnapshot ?? group.targetId}</option>
                    )}
                    {allElements.filter((el) => {
                      if (el.id === element.id) return false;
                      if (isInitConfirm) return isInputRuleHost(el) || el.layaType === 'ChoiceBox';
                      if (isInitGameConfirm) return el.type === 'DragViewBox' || el.type === 'MatchingGame';
                      return true;
                    }).map((el) => (
                      <option key={el.id} value={el.id}>{el.name ?? el.id} ({elementMeta[el.type]?.label ?? el.type})</option>
                    ))}
                  </select>
                </div>
                {targetMissing && <div className="pl-8 text-[10px] text-red-300">判定目标已删除或不再兼容，请重新选择。</div>}
              </div>
            );
          })()}

          {/* onAutoPlay：仅显示循环开关，复用 spineLoop 字段 */}
          {group.event === 'onAutoPlay' && isSpine && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-slate-500 w-7 shrink-0">{t('loopPlay')}</span>
              <select value={String(actions[group.indices[0]].spineLoop ?? 'true')}
                onChange={(e) => updateGroup(group, { spineLoop: e.target.value as 'true' | 'false' })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                <option value="true">{t('yes')}</option>
                <option value="false">{t('no')}</option>
              </select>
            </div>
          )}

          {/* 动作行渲染（onDragJudge 走子事件嵌套；其他事件走扁平列表） */}
          {(() => {
            // 不显示动作行的事件
            if (group.event === 'onAutoPlay' || group.event === 'onAutoClick'
                || group.event === 'onClickInitConfirm' || group.event === 'onClickInitConfirmWithLock'
                || group.event === 'onClickInitConfirmCH' || group.event === 'onClickInitConfirmCHWithLock'
                || group.event === 'onClickInitGameConfirm' || group.event === 'onClickInitGameConfirmWithLock'
                || group.event === 'onClickInitGameConfirmCH' || group.event === 'onClickInitGameConfirmCHWithLock'
                || group.event === 'onInitBrush') {
              return null;
            }

            /** 单条动作的渲染（提取出来给两种容器复用） */
            const renderActionRow = (
              i: number,
              opts: { showRemove: boolean; showAdd: boolean; onAdd: () => void; onRemove: () => void },
            ) => {
              const action = actions[i];
              return (
                <div key={action.id ?? i} className="mt-1.5 pl-2 border-l-2 border-slate-700/60">
                  {/* 动作类型 + 末尾的 + / 当前行的 - */}
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-slate-500 w-7 shrink-0">{t('action')}</span>
                    <select
                      value={action.actionType}
                      onChange={(e) => {
                        const actionType = e.target.value;
                        const patch: Partial<Action> = { actionType, property: undefined, value: undefined, pageTargetId: undefined, pageTargetNameSnapshot: undefined, afterClose: undefined };
                        if (actionType === 'navigateInternalPage') {
                          const target = internalPageRefs.find((page) => page.kind !== 'dialog');
                          patch.pageTargetId = target?.id;
                          patch.pageTargetNameSnapshot = target?.name;
                        } else if (actionType === 'openInternalDialog') {
                          const target = internalPageRefs.find((page) => page.kind === 'dialog');
                          patch.pageTargetId = target?.id;
                          patch.pageTargetNameSnapshot = target?.name;
                        }
                        let next = actions.map((item, index) => index === i ? { ...item, ...patch } : item);
                        if (isPageAction({ ...action, ...patch }) && (action.event === 'onClick' || action.event === 'onClickSound')) {
                          next = next.filter((item, index) => index === i || !((item.event === 'onClick' || item.event === 'onClickSound') && isPageAction(item)));
                        }
                        onChange(next);
                      }}
                      className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                    >
                      {getActionOpts(action).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {opts.showRemove && (
                      <button onClick={opts.onRemove} className="p-0.5 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400" title={t('delete')}>
                        <X size={11} />
                      </button>
                    )}
                    {opts.showAdd && (
                      <button onClick={opts.onAdd} className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white" title={t('addAction')}>
                        <Plus size={11} />
                      </button>
                    )}
                  </div>

                  {group.event === SDK_JUDGE_EVENT && ELEMENT_TARGET_ACTIONS.has(action.actionType) && (
                    <div className="mb-1 flex items-center gap-1">
                      <span className="w-12 shrink-0 text-slate-500">动作目标</span>
                      <select
                        value={action.targetId ?? ''}
                        onChange={(event) => update(i, { targetId: event.target.value || undefined })}
                        className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-700 px-1 py-0.5 text-slate-200"
                      >
                        <option value="">当前触发元素（{element.name ?? element.id}）</option>
                        {allElements.filter((item) => item.id !== element.id).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name ?? item.id} ({elementMeta[item.type]?.label ?? item.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* setProperty: 属性从目标组件的 properties 列表选择 */}
                  {action.actionType === 'setProperty' && (() => {
                    const targetEl = action.targetId ? allElements.find((el) => el.id === action.targetId) : element;
                    const targetMeta = targetEl ? elementMeta[targetEl.type] : null;
                    const propOptions = targetMeta?.properties ?? [];
                    return (
                      <>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-slate-500 w-7 shrink-0">{t('property')}</span>
                          <select
                            value={action.property ?? ''}
                            onChange={(e) => update(i, { property: e.target.value })}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                          >
                            <option value="">{t('selectProperty')}</option>
                            {propOptions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                            <option value="visible">visible</option>
                            <option value="alpha">alpha</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 w-7 shrink-0">{t('value')}</span>
                          <input type="text" value={String(action.value ?? '')}
                            onChange={(e) => update(i, { value: e.target.value })}
                            placeholder={t('newValue')}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200 placeholder-slate-600" />
                        </div>
                      </>
                    );
                  })()}

                  {/* setVisible */}
                  {action.actionType === 'setVisible' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 w-7 shrink-0">{t('visible')}</span>
                      <select value={String(action.value ?? 'true')}
                        onChange={(e) => update(i, { value: e.target.value === 'true' })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                        <option value="true">{t('show')}</option>
                        <option value="false">{t('hide')}</option>
                      </select>
                    </div>
                  )}

                  {/* changePage */}
                  {action.actionType === 'changePage' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 w-7 shrink-0">{t('page')}</span>
                      <select value={String(action.value ?? '')}
                        onChange={(e) => update(i, { value: e.target.value })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                        <option value="">{t('selectPage')}</option>
                        {pages.map((p, idx) => <option key={p.id} value={p.id}>{idx + 1}. {p.name}</option>)}
                      </select>
                    </div>
                  )}

                  {(action.actionType === 'navigateInternalPage' || action.actionType === 'openInternalDialog') && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 w-7 shrink-0">页面</span>
                      <select
                        value={action.pageTargetId ?? ''}
                        onChange={(e) => {
                          const target = internalPageRefs.find((page) => page.id === e.target.value);
                          update(i, { pageTargetId: target?.id, pageTargetNameSnapshot: target?.name });
                        }}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                      >
                        <option value="">请选择页面</option>
                        {internalPageRefs
                          .filter((page) => action.actionType === 'openInternalDialog' ? page.kind === 'dialog' : page.kind !== 'dialog')
                          .map((page) => <option key={page.id} value={page.id}>{page.kind === 'main' ? '内容页 / ' : page.kind === 'dialog' ? '弹窗 / ' : '内容页 / '}{page.name}</option>)}
                      </select>
                    </div>
                  )}

                  {action.actionType === 'closeInternalDialog' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 w-7 shrink-0">之后</span>
                        <select
                          value={action.afterClose ? `${action.afterClose.type}:${action.afterClose.pageTargetId}` : ''}
                          onChange={(e) => {
                            if (!e.target.value) { update(i, { afterClose: undefined }); return; }
                            const [type, pageTargetId] = e.target.value.split(':') as ['navigate' | 'openDialog', string];
                            const target = internalPageRefs.find((page) => page.id === pageTargetId);
                            update(i, { afterClose: { type, pageTargetId, pageTargetNameSnapshot: target?.name } });
                          }}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                        >
                          <option value="">返回打开前页面</option>
                          <optgroup label="关闭后跳转">
                            {internalPageRefs.filter((page) => page.kind !== 'dialog').map((page) => <option key={`navigate:${page.id}`} value={`navigate:${page.id}`}>{page.name}</option>)}
                          </optgroup>
                          <optgroup label="替换为弹窗">
                            {internalPageRefs.filter((page) => page.kind === 'dialog' && page.id !== currentInternalPageId).map((page) => <option key={`openDialog:${page.id}`} value={`openDialog:${page.id}`}>{page.name}</option>)}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* pageTurnGoTo: 选择目标 ContainerBox */}
                  {action.actionType === 'pageTurnGoTo' && (() => {
                    const targetEl = action.targetId ? allElements.find(e => e.id === action.targetId) : undefined;
                    const containerBoxes = targetEl?.type === 'PageTurnBox'
                      ? allElements.filter(e => e.parentId === targetEl.id && e.type === 'ContainerBox')
                      : [];
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 w-7 shrink-0">页面</span>
                        <select value={String(action.value ?? 0)}
                          onChange={(e) => update(i, { value: Number(e.target.value) })}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                          {containerBoxes.length === 0 ? (
                            <option value="0">无可用页面</option>
                          ) : (
                            containerBoxes.map((box, idx) => (
                              <option key={box.id} value={idx}>{box.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                    );
                  })()}

                  {/* playSound */}
                  {action.actionType === 'playSound' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 w-7 shrink-0">{t('audio')}</span>
                      <input type="text" value={String(action.value ?? '')}
                        onChange={(e) => update(i, { value: e.target.value })}
                        placeholder={t('audioPath')}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200 placeholder-slate-600" />
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          try {
                            const courseId = useEditorStore.getState().currentCourse?.id ?? 'default';
                            const courseDir = getCourseDirPath(courseId);
                            if (!courseDir) return;
                            const arrayBuffer = await file.arrayBuffer();
                            const bytes = new Uint8Array(arrayBuffer);
                            let binary = '';
                            for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
                            const base64 = btoa(binary);
                            const ext = file.name.split('.').pop() ?? 'wav';
                            const relPath = await window.electronAPI.saveImageToCourse(courseDir, file.name, base64, ext);
                            update(i, { value: relPath });
                          } catch { /* ignore */ }
                        }} id={`audio-upload-${action.id ?? i}`} />
                      <button
                        onClick={() => document.getElementById(`audio-upload-${action.id ?? i}`)?.click()}
                        className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                        title={t('upload')}>
                        <Upload size={12} />
                      </button>
                      {Boolean(action.value) && (
                        <button
                          onClick={() => update(i, { value: undefined })}
                          className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400"
                          title={t('clear')}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* animate — adaptive UI based on target type */}
                  {action.actionType === 'animate' && (() => {
                    const targetEl = action.targetId ? allElements.find((el) => el.id === action.targetId) : element;
                    const isSpineTarget = targetEl?.type === 'Spine';
                    if (isSpineTarget) {
                      const animList = Array.isArray(targetEl?.props?._animationList) ? (targetEl.props._animationList as string[]) : [];
                      return (
                        <>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-slate-500 w-7 shrink-0">{t('animSpineName')}</span>
                            <select value={String(action.value ?? '')}
                              onChange={(e) => update(i, { value: e.target.value })}
                              className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                              <option value="">{t('selectProperty')}</option>
                              {animList.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 w-7 shrink-0">{t('loopPlay')}</span>
                            <select value={String(action.spineLoop ?? 'true')}
                              onChange={(e) => update(i, { spineLoop: e.target.value as 'true' | 'false' })}
                              className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                              <option value="true">{t('yes')}</option>
                              <option value="false">{t('no')}</option>
                            </select>
                          </div>
                        </>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 w-7 shrink-0">{t('animation')}</span>
                        <select value={String(action.value ?? 'shan')}
                          onChange={(e) => update(i, { value: e.target.value })}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200">
                          <option value="shan">{t('animFlash')}</option>
                          <option value="suo">{t('animScale')}</option>
                          <option value="zhuan">{t('animRotate')}</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
              );
            };

            // 判定事件：按 branchId 二次分组渲染结果分支。
            if (group.event === SDK_JUDGE_EVENT || group.event === 'onDragJudge' || group.event === 'onChoiceJudge' || group.event === 'onInputJudge' || group.event === 'onMatchingJudge') {
              const isSdkJudge = group.event === SDK_JUDGE_EVENT;
              let branches = getBranches(group);
              // 根据事件类型决定 condition 选项
              let conditionOpts = group.event === 'onDragJudge'
                ? [{ value: 'right', label: '全对' }, { value: 'wrong', label: '不全对' }]
                : group.event === 'onChoiceJudge'
                ? [{ value: 'right', label: '全对' }, { value: 'wrong', label: '没有全对' }, { value: 'null', label: '还没有选择' }]
                : group.event === 'onMatchingJudge'
                ? [{ value: 'right', label: '全对' }, { value: 'wrong', label: '没有全对' }, { value: 'null', label: '还没有连线' }]
                : [{ value: 'right', label: '全对' }, { value: 'wrong', label: '没有全对' }, { value: 'null', label: '还没有填写' }];

              if (group.event === SDK_JUDGE_EVENT) {
                const judgeTarget = group.judgeTargetId
                  ? allElements.find((item) => item.id === group.judgeTargetId)
                  : undefined;
                const capability = getSdkJudgeCapability(judgeTarget);
                const supportedConditions = capability?.conditions
                  ?? [...new Set(branches.map((branch) => branch.condition))];
                branches = branches.filter((branch) => supportedConditions.includes(branch.condition));
                conditionOpts = supportedConditions.map((condition) => ({
                  value: condition,
                  label: capability
                    ? getSdkJudgeConditionLabel(capability, condition)
                    : condition === 'right' ? '全对' : condition === 'wrong' ? '没有全对' : '还没有操作',
                }));
              }

              return branches.map((branch, bi) => (
                <div key={branch.branchId} className="mt-2 p-2 bg-slate-800/40 rounded border border-slate-700/40">
                  <div className="flex items-center gap-1 mb-1">
                    {isSdkJudge ? (
                      <>
                        <span className={`w-12 shrink-0 font-medium ${
                          branch.condition === 'right'
                            ? 'text-emerald-400'
                            : branch.condition === 'wrong'
                              ? 'text-red-400'
                              : 'text-amber-300'
                        }`}>
                          {branch.condition === 'right' ? '正确' : branch.condition === 'wrong' ? '错误' : '未完成'}
                        </span>
                        <div className="min-w-0 flex-1 rounded bg-slate-800 px-1 py-0.5 text-slate-400">
                          {conditionOpts.find((option) => option.value === branch.condition)?.label}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 shrink-0">子事件{bi + 1}</span>
                        <select
                          value={branch.condition}
                          onChange={(e) => updateBranchCondition(group, branch.branchId, e.target.value as JudgeCondition)}
                          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                        >
                          {conditionOpts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <button
                          onClick={() => addBranch(group)}
                          className="p-0.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                          title="添加子事件"
                        >
                          <Plus size={11} />
                        </button>
                        {bi > 0 && (
                          <button
                            onClick={() => removeBranch(group, branch.branchId)}
                            className="p-0.5 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400"
                            title="删除子事件"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {branch.indices.map((i, ai) => renderActionRow(i, {
                    showRemove: branch.indices.length > 1,
                    showAdd: ai === branch.indices.length - 1,
                    onAdd: () => addInBranch(group, branch.branchId),
                    onRemove: () => remove(i),
                  }))}
                </div>
              ));
            }

            // 普通事件：扁平动作行列表
            return group.indices.map((i, ai) => renderActionRow(i, {
              showRemove: group.indices.length > 1,
              showAdd: ai === group.indices.length - 1,
              onAdd: () => addInGroup(group),
              onRemove: () => remove(i),
            }));
          })()}
        </div>
      ))}
    </div>
  );
}
