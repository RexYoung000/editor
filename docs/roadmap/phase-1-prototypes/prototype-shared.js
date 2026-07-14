(function () {
  const Core = window.PhaseOneCore;
  let scheme;
  let state;
  let root;
  let menu = null;
  let modal = null;
  let toastTimer = null;
  let pressState = null;
  let dragState = null;
  let suppressClickUntil = 0;
  let autoScrollRaf = 0;
  let autoScrollPoint = null;
  let autoScrollEl = null; // 拖拽期间锁定的滚动容器，避免 pointer 越界后丢滚动
  let pendingScrollTarget = null;
  let layoutState = null;
  let panelResize = null;

  const LAYOUT_DEFAULTS = {
    inline: { left: 300, inspector: 280 },
    drawer: { stage: 238, drawer: 280, inspector: 270 },
    focus: { left: 290, inspector: 286 },
  };

  const LAYOUT_LIMITS = {
    left: { min: 200, max: 460 },
    stage: { min: 180, max: 360 },
    drawer: { min: 200, max: 420 },
    inspector: { min: 220, max: 420 },
  };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function activeSubPage() {
    return Core.getActiveSubPage(state);
  }

  function activeStage() {
    return Core.getStageForSubPage(state, state.activeSubPageId);
  }

  function currentView() {
    return Core.getView(state, state.currentViewId);
  }

  function persist() {
    Core.save(scheme, state);
  }

  function update() {
    persist();
    render();
  }

  function schemeDescription() {
    return {
      inline: '内部页面直接展开，适合像 PPT 一样快速拖放。',
      drawer: '内部页面集中在抽屉，拖动时左侧关卡成为放置目标。',
      focus: '专注编辑当前小关卡，拖动时在左侧底部显示跨关卡目标。',
    }[scheme];
  }

  function showToast(message, tone = 'info', undoable = false) {
    window.clearTimeout(toastTimer);
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.className = `toast ${tone}`;
    toast.innerHTML = `${esc(message)}${undoable ? '<button data-action="undo-last" type="button">撤销</button>' : ''}`;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { if (toast) toast.hidden = true; }, undoable ? 6500 : 3600);
  }

  function subPageTypeLabel(subPage) {
    if (subPage.kind === 'managed') return '内部界面';
    if (subPage.kind === 'video') return '视频';
    return '普通';
  }

  function requestScrollTo(target) {
    pendingScrollTarget = target;
  }

  function applyPendingScroll() {
    if (!pendingScrollTarget || !root) return;
    const el = root.querySelector(`[data-scroll-target="${pendingScrollTarget}"]`);
    pendingScrollTarget = null;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function layoutStorageKey() {
    return `forge-phase1-layout-${scheme}`;
  }

  function loadLayoutState() {
    const defaults = { ...LAYOUT_DEFAULTS[scheme] };
    try {
      const saved = JSON.parse(localStorage.getItem(layoutStorageKey()) || 'null');
      if (!saved || typeof saved !== 'object') return defaults;
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  }

  function saveLayoutState() {
    if (!layoutState || !scheme) return;
    localStorage.setItem(layoutStorageKey(), JSON.stringify(layoutState));
  }

  function clampLayoutValue(key, value) {
    const limit = LAYOUT_LIMITS[key] || { min: 180, max: 480 };
    return Math.round(Math.max(limit.min, Math.min(limit.max, value)));
  }

  function workspaceStyleAttr() {
    if (!layoutState) return '';
    if (scheme === 'drawer') {
      return `style="--stage-width:${layoutState.stage}px;--drawer-width:${layoutState.drawer}px;--inspector-width:${layoutState.inspector}px"`;
    }
    return `style="--left-width:${layoutState.left}px;--inspector-width:${layoutState.inspector}px"`;
  }

  function resizeHandle(target) {
    const labels = {
      left: '拖拽调节左侧栏宽度，双击恢复默认',
      stage: '拖拽调节关卡栏宽度，双击恢复默认',
      drawer: '拖拽调节抽屉宽度，双击恢复默认',
      inspector: '拖拽调节属性栏宽度，双击恢复默认',
    };
    return `<div class="resize-handle" data-resize-target="${target}" role="separator" aria-orientation="vertical" aria-label="${labels[target] || '调节面板宽度'}" title="${labels[target] || '拖拽调节宽度'}" tabindex="0"></div>`;
  }

  // 落点粘滞：相邻 1 格抖动直接忽略，需越过中性区后由调用方给出新 index
  function stabilizeTargetIndex(rawIndex, subPageId, forceSwitch = false) {
    if (!dragState || dragState.targetSubPageId !== subPageId || dragState.targetIndex == null) return rawIndex;
    const prev = dragState.targetIndex;
    if (rawIndex === prev) return prev;
    if (!forceSwitch && Math.abs(rawIndex - prev) === 1) return prev;
    return rawIndex;
  }

  function isScrollableY(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (!(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')) return false;
    return el.scrollHeight > el.clientHeight + 2;
  }

  function targetDropScrollElement() {
    if (!root || !dragState || dragState.type !== 'view' || !dragState.targetSubPageId) return null;
    const currentSubPageId = activeSubPage()?.id;
    let key = null;
    // 方案一的内部页树与放置目标都在关卡列表；命中目标后即使指针落到下方元素面板，也应继续滚它。
    if (scheme === 'inline') key = 'stage-list';
    // 方案二仅在跨小关卡后切到左侧关卡列表，本关排序仍由抽屉页面列表负责。
    if (scheme === 'drawer') key = dragState.targetSubPageId === currentSubPageId ? 'drawer-views' : 'stage-list';
    // 方案三跨关卡目标在下方独立区域，本关排序保留在上方页面列表。
    if (scheme === 'focus') key = dragState.targetSubPageId === currentSubPageId ? 'focus-views' : 'focus-cross';
    return key ? root.querySelector(`[data-scroll-key="${key}"]`) : null;
  }

  function targetDropScrollContainer() {
    const target = targetDropScrollElement();
    return isScrollableY(target) ? target : null;
  }

  function staysInTargetScrollColumn(x) {
    const target = targetDropScrollElement();
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    return x >= rect.left - 72 && x <= rect.right + 72;
  }

  function pickScrollContainer(x, y) {
    const ghost = document.getElementById('dragGhost');
    if (ghost) ghost.style.pointerEvents = 'none';

    // 已命中放置目标时，目标区域优先于指针下方的相邻面板，保证能一直拖到列表最底部。
    const targetScroll = targetDropScrollContainer();
    if (targetScroll) {
      autoScrollEl = targetScroll;
      return targetScroll;
    }

    // 指针命中的滚动区优先。跨关卡时必须能从源页面列表切到目标关卡列表。
    const hovered = document.elementFromPoint(x, y);
    const direct = hovered?.closest?.('.scroll');
    if (direct && isScrollableY(direct)) {
      autoScrollEl = direct;
      return direct;
    }

    if (!root) return null;
    const scrolls = [...root.querySelectorAll('.scroll')].filter(isScrollableY);
    if (!scrolls.length) return null;

    // 指针在滚动区边缘附近时，选择视觉上最近的区域；这样拖到列表边界就能立即滚动。
    const nearby = scrolls.filter((el) => {
      const rect = el.getBoundingClientRect();
      return x >= rect.left - 48 && x <= rect.right + 48 && y >= rect.top - 48 && y <= rect.bottom + 48;
    });
    if (nearby.length) {
      let best = null;
      let bestScore = Infinity;
      for (const el of nearby) {
        const rect = el.getBoundingClientRect();
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        const score = dy + dx * 0.25;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      autoScrollEl = best;
      return best;
    }

    // 指针短暂越过已选列表的上下边缘时继续滚它；横向移到另一个栏位会在上方逻辑中切换。
    if (autoScrollEl && document.contains(autoScrollEl) && isScrollableY(autoScrollEl)) {
      const rect = autoScrollEl.getBoundingClientRect();
      if (x >= rect.left - 64 && x <= rect.right + 64) return autoScrollEl;
    }

    // 最后才按距离兜底，避免进入空白缝隙时自动滚动突然中断。
    let best = null;
    let bestScore = Infinity;
    for (const el of scrolls) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const inX = x >= rect.left - 40 && x <= rect.right + 40;
      const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
      const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      const score = (inX ? 0 : 800) + dy + dx * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) autoScrollEl = best;
    return best;
  }

  function resolveViewDropAtPoint(x, y) {
    const ghost = document.getElementById('dragGhost');
    if (ghost) ghost.style.pointerEvents = 'none';
    // 采样多个点，降低「刚好落在细缝/占位条」时的抖动
    const samples = [
      [x, y],
      [x, y - 10],
      [x, y + 10],
      [x - 8, y],
      [x + 8, y],
    ];
    for (const [sx, sy] of samples) {
      const el = document.elementFromPoint(sx, sy);
      if (!el) continue;
      const row = el.closest?.('[data-page-drop-view]');
      if (row) {
        const rect = row.getBoundingClientRect();
        // 中性区：中间 40% 保持原 index；上下 30% 才切换，减少边界闪烁
        const rel = (sy - rect.top) / Math.max(rect.height, 1);
        const baseIndex = Number(row.dataset.index);
        let targetIndex;
        let forceSwitch = false;
        if (rel < 0.30) { targetIndex = baseIndex; forceSwitch = true; }
        else if (rel > 0.70) { targetIndex = baseIndex + 1; forceSwitch = true; }
        else {
          targetIndex = dragState?.targetSubPageId === row.dataset.subpage && dragState.targetIndex != null
            ? dragState.targetIndex
            : (rel < 0.5 ? baseIndex : baseIndex + 1);
        }
        targetIndex = stabilizeTargetIndex(targetIndex, row.dataset.subpage, forceSwitch);
        const check = Core.canInsertViewAt(state, dragState.id, row.dataset.subpage, targetIndex);
        return {
          valid: check.ok,
          reason: check.reason,
          targetSubPageId: row.dataset.subpage,
          targetStageId: null,
          targetIndex,
        };
      }
      const zone = el.closest?.('[data-page-drop-zone]');
      if (zone) {
        const subPageId = zone.dataset.pageDropZone;
        const appendIndex = Core.defaultAppendIndex(state, dragState.id, subPageId);
        const check = Core.canInsertViewAt(state, dragState.id, subPageId, appendIndex);
        return {
          valid: check.ok,
          reason: check.reason || Core.getMoveBlockReason(state, dragState.id, subPageId),
          targetSubPageId: subPageId || null,
          targetStageId: null,
          targetIndex: appendIndex,
        };
      }
      const subBlock = el.closest?.('[data-subpage-drop-row]');
      if (subBlock) {
        const subPageId = subBlock.dataset.subpageDropRow;
        const appendIndex = Core.defaultAppendIndex(state, dragState.id, subPageId);
        const check = Core.canInsertViewAt(state, dragState.id, subPageId, appendIndex);
        return {
          valid: check.ok,
          reason: check.reason || Core.getMoveBlockReason(state, dragState.id, subPageId),
          targetSubPageId: subPageId,
          targetStageId: null,
          targetIndex: appendIndex,
        };
      }
    }
    return { valid: false, reason: null, targetSubPageId: null, targetStageId: null, targetIndex: null };
  }

  function stabilizeSubPageTargetIndex(rawIndex, stageId, forceSwitch = false) {
    if (!dragState || dragState.targetStageId !== stageId || dragState.targetIndex == null) return rawIndex;
    const prev = dragState.targetIndex;
    if (rawIndex === prev) return prev;
    if (!forceSwitch && Math.abs(rawIndex - prev) === 1) return prev;
    return rawIndex;
  }

  function resolveSubPageDropAtPoint(x, y) {
    const ghost = document.getElementById('dragGhost');
    if (ghost) ghost.style.pointerEvents = 'none';
    const samples = [[x, y], [x, y - 14], [x, y + 14], [x, y - 28], [x, y + 28]];
    for (const [sx, sy] of samples) {
      const el = document.elementFromPoint(sx, sy);
      if (!el) continue;
      const row = el.closest?.('[data-subpage-drop-row]');
      if (row) {
        const rect = row.getBoundingClientRect();
        const rel = (sy - rect.top) / Math.max(rect.height, 1);
        const baseIndex = Number(row.dataset.index);
        let targetIndex;
        let forceSwitch = false;
        if (rel < 0.28) { targetIndex = baseIndex; forceSwitch = true; }
        else if (rel > 0.72) { targetIndex = baseIndex + 1; forceSwitch = true; }
        else {
          targetIndex = dragState?.targetStageId === row.dataset.stage && dragState.targetIndex != null
            ? dragState.targetIndex
            : (rel < 0.5 ? baseIndex : baseIndex + 1);
        }
        targetIndex = stabilizeSubPageTargetIndex(targetIndex, row.dataset.stage, forceSwitch);
        return {
          valid: true,
          reason: null,
          targetStageId: row.dataset.stage,
          targetIndex,
          targetSubPageId: null,
        };
      }
      const stageZone = el.closest?.('[data-subpage-drop-stage]');
      if (stageZone) {
        const stage = Core.getStage(state, stageZone.dataset.subpageDropStage);
        return {
          valid: Boolean(stage && !stage.placeholder),
          reason: null,
          targetStageId: stage?.id || null,
          targetIndex: stage?.subPageIds.length || 0,
          targetSubPageId: null,
        };
      }
    }
    return { valid: false, reason: null, targetSubPageId: null, targetStageId: null, targetIndex: null };
  }

  function undoButton() {
    return `<button class="top-button ghost" data-action="undo-last" type="button" ${state.undoSnapshot ? '' : 'disabled'}>撤销</button>`;
  }

  function schemeSwitcher() {
    const items = [
      { id: 'inline', short: '方案一', title: '内嵌精简', href: './inline.html' },
      { id: 'drawer', short: '方案二', title: '侧边抽屉', href: './drawer.html' },
      { id: 'focus', short: '方案三', title: '专注工作区', href: './focus.html' },
    ];
    return `
      <nav class="scheme-switcher" aria-label="三套方案快速切换">
        ${items.map((item) => `
          <a class="scheme-switch ${item.id === scheme ? 'active' : ''}" href="${item.href}" title="${esc(item.title)}" ${item.id === scheme ? 'aria-current="page"' : ''}>
            <strong>${item.short}</strong><span>${esc(item.title)}</span>
          </a>`).join('')}
        <a class="scheme-switch compare-link" href="../phase-1-interaction-prototype.html#${scheme}" title="打开对比总览页">总览</a>
      </nav>`;
  }

  function topbar() {
    const subPage = activeSubPage();
    const stage = activeStage();
    if (scheme === 'focus' && state.focusActive && subPage) {
      return `
        <header class="editor-topbar focus-topbar">
          <button class="top-button" data-action="exit-focus" type="button">← 返回工作台</button>
          <div class="breadcrumb"><span>图形变化课程</span><b>›</b><span>${esc(stage?.title || '关卡')}</span><b>›</b><span>${esc(Core.subPageLabel(state, subPage.id))}</span><b>›</b><span>${esc(currentView()?.title || '主界面')}</span></div>
          ${schemeSwitcher()}
          <div class="top-spacer"></div>
          ${pendingBadge()}
          ${undoButton()}
          <button class="top-button ${state.mode === 'run' ? 'active' : 'primary'}" data-action="toggle-run" type="button">${state.mode === 'run' ? '退出试运行' : '试运行当前界面'}</button>
          <button class="top-button" data-action="reset-scheme" type="button">重新开始</button>
        </header>`;
    }
    return `
      <header class="editor-topbar">
        <div class="brand"><span class="brand-mark"></span><span>豌豆课件编辑器</span></div>
        <span class="course-name">图形变化课程</span>
        ${schemeSwitcher()}
        <div class="top-spacer"></div>
        ${pendingBadge()}
        ${undoButton()}
        <button class="top-button" data-action="open-template" data-purpose="stage" type="button">新增大关卡</button>
        <button class="top-button ${state.mode === 'run' ? 'active' : 'primary'}" data-action="toggle-run" type="button" ${subPage ? '' : 'disabled'}>${state.mode === 'run' ? '退出试运行' : '试运行当前界面'}</button>
        <button class="top-button" data-action="reset-scheme" type="button">重新开始</button>
      </header>`;
  }

  function pendingBadge() {
    const count = Core.pendingIssues(state).length;
    return count ? `<button class="mode-badge issue-badge" data-action="open-issues" type="button">${count} 项待处理</button>` : '';
  }

  function stagePanel() {
    return `
      <section class="panel panel-column stage-panel">
        <div class="panel-head"><div><h2>关卡</h2><p>页面可跨大关卡移动到兼容的小关卡</p></div></div>
        <div class="scroll stage-list" data-scroll-key="stage-list">${state.stages.map((stage, index) => stageCard(stage, index)).join('')}</div>
      </section>`;
  }

  function stageCard(stage, stageIndex) {
    if (stage.placeholder) {
      return `
        <div class="stage-card placeholder-stage" data-subpage-drop-stage="${esc(stage.id)}">
          <div class="stage-title"><span>关卡 ${stageIndex + 1} · 尚未创建</span><span>0 关</span></div>
          <button class="empty-stage-action" data-action="open-template" data-purpose="initial" type="button"><strong>＋ 添加内部界面小关卡</strong><small>从模板创建后开始体验</small></button>
        </div>`;
    }
    // 拖拽中的占位统一由 patchDragPreview 注入，避免 render 时插入/删除导致闪烁
    return `
      <div class="stage-card ${dragStageClass(stage)}" data-subpage-drop-stage="${esc(stage.id)}">
        <div class="stage-title">
          <span>关卡 ${stageIndex + 1} · ${esc(stage.title)}</span>
          <span>${stage.subPageIds.length} 关</span>
          <button class="stage-add" data-action="add-subpage" data-stage="${esc(stage.id)}" type="button" aria-label="新增小关卡">＋小关卡</button>
        </div>
        <div class="subpage-list">${stage.subPageIds.map((subPageId, index) => subPageRow(stage, subPageId, index)).join('')}</div>
      </div>`;
  }

  function dragStageClass(stage) {
    if (!dragState || dragState.type !== 'subpage') return '';
    return dragState.targetStageId === stage.id ? 'drag-target-stage' : '';
  }

  function subPageDropPlaceholder(stageId, index) {
    if (!dragState || dragState.type !== 'subpage' || dragState.targetStageId !== stageId || dragState.targetIndex !== index) return '';
    return '<div class="drop-placeholder subpage-placeholder"><span>放置小关卡到这里</span></div>';
  }

  function subPageRow(stage, subPageId, index) {
    const subPage = Core.getSubPage(state, subPageId);
    if (!subPage) return '';
    const active = state.activeSubPageId === subPageId;
    const expanded = state.expandedSubPageIds.includes(subPageId);
    const pending = Core.pendingIssues(state, subPageId).length;
    const isDragging = dragState?.type === 'subpage' && dragState.id === subPageId;
    const blockReason = dragState?.type === 'view' ? Core.getMoveBlockReason(state, dragState.id, subPageId) : null;
    const compatibleTarget = dragState?.type === 'view' && !blockReason;
    const incompatibleTarget = Boolean(dragState?.type === 'view' && blockReason);
    const isDropTarget = Boolean(dragState?.type === 'view' && dragState.targetSubPageId === subPageId);
    // 只有方案一用树形展开；拖拽时只展开当前瞄准的目标，避免所有关卡同时摊开
    const internalVisible = subPage.kind === 'managed' && scheme === 'inline' && (
      (!dragState && expanded)
      || (dragState?.type === 'view' && compatibleTarget && isDropTarget)
      || (dragState?.type !== 'view' && expanded)
    );
    // 方案二/三的关卡列表不提供内嵌展开箭头，避免串方案控件
    const leadingControl = subPage.kind !== 'managed'
      ? '<span class="icon-quiet">•</span>'
      : scheme === 'inline'
        ? `<button class="icon-quiet" data-action="toggle-subpage" data-subpage="${esc(subPageId)}" type="button" aria-label="${expanded ? '收起' : '展开'}内部页面">${expanded || internalVisible ? '⌄' : '›'}</button>`
        : '<span class="icon-quiet spacer"></span>';
    let hint = '';
    if (pending) hint = ` · ${pending} 项待处理`;
    else if (incompatibleTarget) hint = ` · ${blockReason}`;
    else if (compatibleTarget && isDropTarget) hint = ' · 可放入这里';
    else if (compatibleTarget) hint = ' · 可放入';
    const trailing = scheme === 'drawer' && subPage.kind === 'managed'
      ? `<button class="drawer-open" data-action="open-drawer" data-subpage="${esc(subPageId)}" type="button">内部页面</button><span class="count-pill ${pending ? 'warn' : ''}">${subPage.viewOrder.length}</span>`
      : scheme === 'focus' && subPage.kind === 'managed'
        ? `<button class="drawer-open" data-action="enter-focus" data-subpage="${esc(subPageId)}" type="button">专注编辑</button>`
        : `<span class="count-pill ${pending ? 'warn' : ''}">${subPage.viewOrder.length} 页</span>`;
    return `
      <div class="subpage-block ${active ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${compatibleTarget ? 'compatible-target' : ''} ${isDropTarget && compatibleTarget ? 'drop-target' : ''} ${incompatibleTarget ? 'incompatible-target' : ''}"
        data-subpage-drop-row="${esc(subPageId)}" data-stage="${esc(stage.id)}" data-index="${index}" data-scroll-target="subpage:${esc(subPageId)}">
        <div class="subpage-row">
          <button class="drag-handle" data-subpage-drag="${esc(subPageId)}" type="button" aria-label="拖拽小关卡">⠿</button>
          ${leadingControl}
          <button class="view-select subpage-main" data-action="select-subpage" data-subpage="${esc(subPageId)}" type="button">
            <strong>${esc(Core.subPageLabel(state, subPageId))}</strong>
            <small>${esc(subPageTypeLabel(subPage))}${hint}</small>
          </button>
          ${trailing}
        </div>
        ${internalVisible ? internalPageSection(subPage, dragState?.type === 'view' ? 'inline-drag' : 'inline') : ''}
        ${dragState?.type === 'view' && scheme !== 'inline' ? pageDropZone(subPage) : ''}
      </div>`;
  }

  function pageDropZone(subPage) {
    const reason = Core.getMoveBlockReason(state, dragState.id, subPage.id);
    if (reason) {
      return `<div class="compact-drop-zone invalid">${esc(reason)}</div>`;
    }
    const active = dragState.targetSubPageId === subPage.id;
    // 方案二/三左侧只做轻量投放点；精确定位在当前抽屉/专注列表完成
    const label = active
      ? (dragState.valid ? '松开放入此小关卡' : (dragState.reason || '不能放在这里'))
      : '拖到这里放入';
    return `<div class="compact-drop-zone ${active ? (dragState.valid ? 'active' : 'invalid') : ''}" data-page-drop-zone="${esc(subPage.id)}">${esc(label)}</div>`;
  }

  function internalPageSection(subPage, context) {
    const contentIds = subPage.viewOrder.filter((id) => state.views[id]?.kind !== 'dialog');
    const dialogIds = subPage.viewOrder.filter((id) => state.views[id]?.kind === 'dialog');
    const dragView = dragState?.type === 'view' ? Core.getView(state, dragState.id) : null;
    const dragGroup = dragView ? Core.viewGroupOf(dragView) : null;
    const draggingHere = Boolean(dragState?.type === 'view' && dragState.targetSubPageId === subPage.id);
    const contentEndIndex = contentIds.length ? subPage.viewOrder.indexOf(contentIds[contentIds.length - 1]) + 1 : 1;
    const dialogEndIndex = subPage.viewOrder.length;
    // 拖拽预览态：收敛信息，隐藏新增按钮；本关列表仍显示完整结构方便排序
    const dragPreview = Boolean(dragState?.type === 'view');
    const compactGroups = dragPreview && (context === 'inline-drag' || context === 'focus-cross');
    const showContent = !compactGroups || dragGroup === 'content';
    const showDialog = !compactGroups || dragGroup === 'dialog';
    const showAdd = !dragPreview;
    const showContentEnd = dragPreview && dragGroup === 'content' && (draggingHere || context === 'focus-cross' || context === 'inline-drag');
    const showDialogEnd = dragPreview && dragGroup === 'dialog' && (draggingHere || context === 'focus-cross' || context === 'inline-drag');
    return `
      <div class="internal-section ${dragPreview ? 'drag-preview' : ''}" data-page-drop-zone="${esc(subPage.id)}" data-page-drop-group="${esc(dragGroup || '')}">
        ${showContent ? viewGroup('内容页面', contentIds, subPage, context) : ''}
        ${showContentEnd ? pageDropPlaceholder(subPage.id, contentEndIndex, '放到这里') : ''}
        ${showDialog ? viewGroup('弹窗', dialogIds, subPage, context) : ''}
        ${showDialogEnd ? pageDropPlaceholder(subPage.id, dialogEndIndex, '放到这里') : ''}
        ${showAdd ? `<button class="add-view" data-action="open-add-view" data-subpage="${esc(subPage.id)}" type="button">＋ 新增内部页面</button>` : ''}
      </div>`;
  }

  function viewGroup(label, ids, subPage, context) {
    if (!ids.length) return '';
    return `<div class="section-label"><span>${label}</span><span>${ids.length}</span></div><div class="view-list">${ids.map((id) => viewRow(id, subPage, context)).join('')}</div>`;
  }

  function viewRow(viewId, subPage, context) {
    const view = Core.getView(state, viewId);
    if (!view) return '';
    const index = subPage.viewOrder.indexOf(viewId);
    const active = state.currentViewId === viewId && state.activeSubPageId === subPage.id;
    const pending = view.kind === 'dialog' && Core.inboundButtons(state, viewId).length === 0;
    const dragging = dragState?.type === 'view' && dragState.id === viewId;
    const baseLabel = view.kind === 'dialog' ? `<small>底板：${esc(Core.subPageLabel(state, subPage.id))} 主界面</small>` : '';
    return `
      ${pageDropPlaceholder(subPage.id, index)}
      <div class="view-row ${active ? 'active' : ''} ${dragging ? 'dragging' : ''}" data-page-drop-view="${esc(viewId)}" data-subpage="${esc(subPage.id)}" data-index="${index}" data-view-group="${esc(Core.viewGroupOf(view))}" data-scroll-target="view:${esc(viewId)}">
        ${view.kind === 'main' ? '<span class="view-lock" title="主界面固定">◆</span>' : `<button class="page-drag-handle" data-page-drag="${esc(viewId)}" type="button" aria-label="拖拽页面">⠿</button>`}
        <button class="view-select" data-action="select-view" data-view="${esc(viewId)}" type="button">
          <span class="view-title"><span class="type-dot ${view.kind}"></span><span><strong>${esc(view.title)}</strong>${baseLabel}</span></span>
        </button>
        <div class="view-actions">${pending ? '<span class="status-dot warn" title="待处理"></span>' : ''}${view.kind !== 'main' ? `<button class="more-button" data-action="view-more" data-view="${esc(viewId)}" type="button" aria-label="${esc(view.title)}更多操作">⋯</button>` : ''}</div>
      </div>`;
  }

  function pageDropPlaceholder(subPageId, index, label = '页面将放置在这里') {
    if (!dragState || dragState.type !== 'view' || !dragState.valid || dragState.targetSubPageId !== subPageId || dragState.targetIndex !== index) return '';
    return `<div class="drop-placeholder page-placeholder"><span>${esc(label)}</span></div>`;
  }

  function elementsPanel() {
    const subPage = activeSubPage();
    const view = currentView();
    const elements = view ? Core.viewElements(state, view.id) : [];
    return `
      <section class="panel panel-column elements-panel">
        <div class="panel-head"><div><h2>元素</h2><p>${subPage ? `${esc(Core.subPageLabel(state, subPage.id))} · ${esc(view?.title || '')}` : '未选择小关卡'}</p></div></div>
        <div class="scroll" data-scroll-key="elements-list"><div class="elements-list">${elements.map((element) => elementRow(element)).join('') || '<div class="empty-mini">当前页面没有组件</div>'}</div></div>
      </section>`;
  }

  function elementRow(element) {
    const selected = state.selectedElementId === element.id;
    return `
      <button class="element-row ${selected ? 'active' : ''}" data-action="select-element" data-element="${esc(element.id)}" type="button">
        <span class="eye">◉</span><span class="element-name">${esc(element.label)}</span><span class="element-type">${esc(element.type)}</span>
      </button>`;
  }

  function drawerPanel() {
    const subPage = activeSubPage();
    if (!subPage) return '<section class="panel drawer-panel"></section>';
    if (subPage.kind !== 'managed') {
      return `
        <section class="panel drawer-panel simple">
          <div class="panel-head"><div><h2>${esc(Core.subPageLabel(state, subPage.id))}</h2><p>${esc(subPageTypeLabel(subPage))}小关卡组件</p></div><button class="drawer-close" data-action="close-drawer" type="button">收起</button></div>
          <div class="scroll" data-scroll-key="drawer-main"><div class="elements-list">${Core.viewElements(state, subPage.mainViewId).map(elementRow).join('')}</div></div>
        </section>`;
    }
    const tabs = [['views', '页面'], ['elements', '元素'], ['issues', `待处理 ${Core.pendingIssues(state, subPage.id).length}`]];
    let content;
    if (state.drawerTab === 'elements') content = `<div class="scroll" data-scroll-key="drawer-elements">${drawerElementsContent(subPage)}</div>`;
    else if (state.drawerTab === 'issues') content = `<div class="scroll issues-list" data-scroll-key="drawer-issues">${issuesContent(subPage.id)}</div>`;
    else content = `<div class="scroll drawer-view-content" data-scroll-key="drawer-views">${internalPageSection(subPage, 'drawer')}</div>`;
    return `
      <section class="panel drawer-panel">
        <div class="panel-head"><div><h2>${esc(Core.subPageLabel(state, subPage.id))}</h2><p>内部页面管理 · ${subPage.viewOrder.length} 页</p></div><button class="drawer-close" data-action="close-drawer" type="button">收起</button></div>
        <div class="drawer-tabs">${tabs.map(([id, label]) => `<button class="drawer-tab ${state.drawerTab === id ? 'active' : ''}" data-action="drawer-tab" data-tab="${id}" type="button">${label}</button>`).join('')}</div>
        ${content}
      </section>`;
  }

  function drawerElementsContent(subPage) {
    const view = currentView();
    const elements = view && view.subPageId === subPage.id ? Core.viewElements(state, view.id) : [];
    return `<div class="filter-line"><span>当前：${esc(view?.title || '主界面')}</span><button data-action="drawer-tab" data-tab="views" type="button">切换页面</button></div><div class="elements-list">${elements.map(elementRow).join('')}</div>`;
  }

  function focusCrossTargetsHtml() {
    if (!(scheme === 'focus' && state.focusActive && dragState?.type === 'view')) return '';
    const currentId = state.activeSubPageId;
    const cards = state.stages.flatMap((stage, stageIndex) => stage.subPageIds.map((subPageId) => {
      if (subPageId === currentId) return '';
      const subPage = Core.getSubPage(state, subPageId);
      if (!subPage) return '';
      const blockReason = Core.getMoveBlockReason(state, dragState.id, subPageId);
      const compatible = !blockReason;
      const active = dragState.targetSubPageId === subPageId;
      if (!compatible) {
        return `<div class="focus-drop-target invalid"><span>${esc(Core.subPageLabel(state, subPageId))}</span><small>${esc(blockReason)}</small></div>`;
      }
      // 预先保留所有兼容目标的结构，拖拽在目标间移动时只切换高亮与占位，不重绘整块面板。
      return `
        <div class="focus-drop-card ${active ? 'active' : ''}">
          <div class="focus-drop-target ${active ? 'active' : ''}" data-page-drop-zone="${esc(subPageId)}">
            <span>关卡 ${stageIndex + 1} / ${esc(Core.subPageLabel(state, subPageId))}</span>
            <small>${active ? '指定落点中' : '移入此处'}</small>
          </div>
          <div class="focus-drop-pages">${internalPageSection(subPage, 'focus-cross')}</div>
        </div>`;
    })).join('');
    return `
      <div class="focus-cross-targets scroll" data-scroll-key="focus-cross">
        <strong>移动到其他小关卡</strong>
        <p>先点选/拖到目标关卡，再落到具体位置。本关排序请用上方列表。</p>
        ${cards || '<div class="empty-mini">暂无其他可放置小关卡</div>'}
      </div>`;
  }

  function focusNavigator() {
    const subPage = activeSubPage();
    if (!subPage) return '';
    const tabs = [['views', '页面'], ['elements', '元素']];
    const content = state.focusTab === 'elements'
      ? `<div class="scroll" data-scroll-key="focus-elements">${drawerElementsContent(subPage)}</div>`
      : `<div class="scroll drawer-view-content" data-scroll-key="focus-views">${internalPageSection(subPage, 'focus')}</div>`;
    return `
      <section class="panel drawer-panel focus-navigator">
        <div class="panel-head"><div><h2>${esc(Core.subPageLabel(state, subPage.id))}</h2><p>只显示当前小关卡内容</p></div></div>
        <div class="focus-tabs">${tabs.map(([id, label]) => `<button class="focus-tab ${state.focusTab === id ? 'active' : ''}" data-action="focus-tab" data-tab="${id}" type="button">${label}</button>`).join('')}<button class="focus-tab" data-action="open-issues" type="button">待处理 ${Core.pendingIssues(state, subPage.id).length}</button></div>
        ${content}
        ${focusCrossTargetsHtml()}
      </section>`;
  }

  function issuesContent(subPageId = null) {
    const issues = Core.pendingIssues(state, subPageId);
    if (!issues.length) return '<div class="empty-state"><div><h2>没有待处理问题</h2><p>当前事件关系完整。</p></div></div>';
    return issues.map((issue) => {
      if (issue.type === 'unbound-dialog') {
        return `<div class="issue-card"><strong>${esc(issue.title)}还没有打开入口</strong><p>页面移动或复制后，需要在所属小关卡中重新选择打开按钮。</p><button data-action="start-binding" data-view="${esc(issue.viewId)}" type="button">选择打开按钮</button></div>`;
      }
      if (issue.type === 'unbound-navigation') {
        return `<div class="issue-card"><strong>${esc(issue.elementLabel)}还没有跳转目标</strong><p>它仍然是普通按钮，通过右侧事件链接选择目标页面。</p><button data-action="select-element" data-element="${esc(issue.elementId)}" type="button">配置事件</button></div>`;
      }
      return `<div class="issue-card"><strong>${esc(issue.elementLabel)}的原目标不再兼容</strong><p>原来指向“${esc(issue.title)}”，页面移动后需要重新选择。</p><button data-action="select-element" data-element="${esc(issue.elementId)}" type="button">重新配置</button></div>`;
    }).join('');
  }

  function canvasPanel() {
    const subPage = activeSubPage();
    if (!subPage) return emptyCanvas();
    const activeViewId = state.mode === 'run' ? state.runViewId : state.currentViewId;
    const view = Core.getView(state, activeViewId) || Core.getView(state, subPage.mainViewId);
    const dialogId = state.mode === 'run' ? state.runDialogId : view?.kind === 'dialog' ? view.id : null;
    const contentView = dialogId ? Core.getView(state, subPage.mainViewId) : view;
    return `
      <section class="panel canvas-panel">
        <div class="canvas-head"><div><strong>${state.mode === 'run' ? '试运行' : '编辑'}：${esc((dialogId ? Core.getView(state, dialogId) : view)?.title || '主界面')}</strong><br><span>${state.mode === 'run' ? '按钮会执行已配置的事件' : '点击画布按钮只会选中，事件跳转在右侧配置'}</span></div><div class="canvas-spacer"></div>${state.bindingDialogId ? '<span class="binding-text">正在选择弹窗入口</span>' : ''}${state.mode === 'edit' ? '<button class="run-button" data-action="open-component" type="button">＋ 添加组件</button>' : ''}</div>
        <div class="canvas-wrap">
          <div class="canvas">
            ${state.bindingDialogId ? `<div class="binding-banner"><span>请选择打开【${esc(Core.getView(state, state.bindingDialogId)?.title)}】的按钮</span><button data-action="cancel-binding" type="button">取消</button></div>` : ''}
            <div class="lesson-bg">
              <div class="canvas-context-label">${esc(Core.subPageLabel(state, subPage.id))} · ${esc(contentView?.title || '主界面')}</div>
              <div class="question-card">${contentCard(contentView, subPage)}</div>
              <div class="lesson-actions">${canvasElements(contentView?.id)}</div>
            </div>
            ${dialogId ? dialogLayer(dialogId, subPage) : ''}
          </div>
        </div>
        <div class="canvas-footer"><span>1920 × 1080</span><span>${esc(subPageTypeLabel(subPage))}小关卡</span><span>${esc(schemeDescription())}</span></div>
      </section>`;
  }

  function contentCard(view, subPage) {
    if (!view) return '';
    if (subPage.kind === 'video') return '<h3>视频展示画面</h3><p>视频关卡保留自己的组件和事件属性。</p>';
    if (subPage.kind === 'normal') return '<h3>选择正确的图形</h3><p>普通关卡的画布组件同样可以直接选中并查看右侧属性。</p>';
    if (view.kind === 'main') return '<h3>观察图形如何发生变化</h3><p>“第 2 题”仍是普通按钮，不是分页组件；选中后在右侧配置页面跳转。</p>';
    return `<h3>${esc(view.title)}：继续观察图形</h3><p>这是同级内容页面，移动到兼容小关卡后内容保持不变。</p>`;
  }

  function canvasElements(viewId) {
    if (!viewId) return '';
    return Core.viewElements(state, viewId).map((element, index) => {
      const selected = state.selectedElementId === element.id;
      if (element.type !== '按钮') {
        return `<button class="canvas-object ${selected ? 'selected' : ''}" data-action="canvas-element" data-element="${esc(element.id)}" type="button"><span>${esc(element.label)}</span><small>${esc(element.type)}</small></button>`;
      }
      const navigation = element.role === 'navigation';
      return `<button class="lesson-button ${navigation ? 'navigation' : index % 2 ? 'b' : 'a'} ${selected ? 'selected' : ''} ${state.bindingDialogId ? 'selectable' : ''}" data-action="canvas-element" data-element="${esc(element.id)}" type="button">${esc(element.label)}</button>`;
    }).join('');
  }

  function dialogLayer(viewId, subPage) {
    const view = Core.getView(state, viewId);
    const base = Core.getView(state, view?.baseMainViewId);
    if (!view) return '';
    const close = Core.viewElements(state, viewId).find((element) => element.role === 'close');
    return `<div class="dialog-mask"><div class="dialog-base-note">底板：${esc(Core.subPageLabel(state, subPage.id))} · ${esc(base?.title || '主界面')}</div><div class="dialog-card"><h3>${esc(view.title)}</h3><p>弹窗自身内容保持不变；移动后底板自动改为目标小关卡主界面。</p>${close ? `<button data-action="canvas-element" data-element="${esc(close.id)}" type="button">关闭弹窗</button>` : ''}</div></div>`;
  }

  function emptyCanvas() {
    return `<section class="panel canvas-panel"><div class="canvas-head"><strong>尚未选择可编辑小关卡</strong></div><div class="empty-state"><div><h2>从模板开始</h2><p>创建后，每个小关卡都会拥有独立的页面和组件。</p><button data-action="open-template" data-purpose="initial" type="button">选择模板并创建</button></div></div><div class="canvas-footer">等待创建</div></section>`;
  }

  function inspectorPanel() {
    const subPage = activeSubPage();
    const view = currentView();
    const found = state.selectedElementId ? Core.findElement(state, state.selectedElementId) : null;
    const element = found?.element || null;
    const title = element?.label || view?.title || '未选择对象';
    const subtitle = element ? `${element.type} · ${view?.title}` : `${subPageTypeLabel(subPage || { kind: 'normal' })}页面`;
    const hasTabs = scheme === 'inline';
    return `
      <section class="panel inspector-panel">
        <div class="panel-head"><div><h2>组件属性</h2><p>${subPage ? esc(Core.subPageLabel(state, subPage.id)) : '未选择小关卡'}</p></div></div>
        ${hasTabs ? `<div class="inspector-tabs"><button class="inspector-tab ${state.inspectorTab === 'properties' ? 'active' : ''}" data-action="inspector-tab" data-tab="properties" type="button">属性</button><button class="inspector-tab ${state.inspectorTab === 'relations' ? 'active' : ''}" data-action="inspector-tab" data-tab="relations" type="button">交互</button></div>` : '<div></div>'}
        <div class="inspector-body">${hasTabs && state.inspectorTab === 'relations' ? relationInspector(view, element) : propertyInspector(title, subtitle, view, element)}</div>
        <div class="inspector-footer">事件属于具体按钮，不再创建“分页按钮组”组件。</div>
      </section>`;
  }

  function propertyInspector(title, subtitle, view, element) {
    const relation = element ? Core.relationForElement(state, element.id) : null;
    const relationClass = relation?.status === 'pending' ? 'warn' : '';
    const dialogBase = view?.kind === 'dialog'
      ? `<div class="property-group"><h4>弹窗底板</h4><div class="property-row"><span>背景来源</span><span class="property-value">${esc(Core.subPageLabel(state, view.subPageId))} 主界面</span></div></div>`
      : '';
    const eventBlock = element?.type === '按钮'
      ? `<div class="property-group"><h4>事件链接</h4><div class="relation-summary ${relationClass}"><span>${esc(relation?.text || '当前按钮还没有配置点击事件。')}</span>${element.role === 'close' ? '' : `<button data-action="configure-event" data-element="${esc(element.id)}" type="button">${element.targetView ? '修改目标' : '配置目标'}</button>`}</div></div>`
      : '';
    return `
      <div class="object-title"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div>
      <div class="property-group"><h4>位置与大小</h4><div class="property-row"><span>X / Y</span><span class="property-value">320 / 180</span></div><div class="property-row"><span>宽 / 高</span><span class="property-value">260 / 72</span></div></div>
      <div class="property-group"><h4>外观</h4><div class="property-row"><span>显示状态</span><span class="property-value">当前页面可见</span></div><div class="property-row"><span>透明度</span><span class="property-value">100%</span></div></div>
      ${dialogBase}${eventBlock}`;
  }

  function relationInspector(view, element) {
    if (element?.type === '按钮' && element.role !== 'close') {
      const relation = Core.relationForElement(state, element.id);
      return `<div class="relation-detail ${relation?.status === 'pending' ? 'warn' : ''}"><strong>${relation?.status === 'ok' ? '已配置' : '待处理'}</strong><span>${esc(relation?.text || '当前按钮还没有配置点击事件。')}</span><button data-action="configure-event" data-element="${esc(element.id)}" type="button" style="margin-top:8px;justify-self:start;padding:4px 7px;border:1px solid currentColor;border-radius:5px;background:#fff;color:inherit;font-size:8px;font-weight:900;">${element.targetView ? '修改目标' : '配置目标'}</button></div>`;
    }
    const relations = element ? [Core.relationForElement(state, element.id)].filter(Boolean) : Core.relationsForView(state, view?.id);
    if (!relations.length) return '<div class="empty-state"><div><h2>没有交互关系</h2><p>选中具体按钮后，可以配置页面跳转或打开弹窗。</p></div></div>';
    return relations.map((relation) => `<div class="relation-detail ${relation.status === 'pending' ? 'warn' : ''}"><strong>${relation.status === 'ok' ? '已配置' : '待处理'}</strong><span>${esc(relation.text)}</span></div>`).join('');
  }

  function inlineWorkspace() {
    return `<main class="workspace inline-layout" ${workspaceStyleAttr()}><div class="left-stack">${stagePanel()}${elementsPanel()}</div>${resizeHandle('left')}${canvasPanel()}${resizeHandle('inspector')}${inspectorPanel()}</main>`;
  }

  function drawerWorkspace() {
    const closed = !state.drawerOpen;
    if (closed) {
      return `<main class="workspace drawer-layout drawer-closed" ${workspaceStyleAttr()}>${stagePanel()}${resizeHandle('stage')}${canvasPanel()}${resizeHandle('inspector')}${inspectorPanel()}</main>`;
    }
    return `<main class="workspace drawer-layout" ${workspaceStyleAttr()}>${stagePanel()}${resizeHandle('stage')}${drawerPanel()}${resizeHandle('drawer')}${canvasPanel()}${resizeHandle('inspector')}${inspectorPanel()}</main>`;
  }

  function focusWorkspace() {
    if (state.focusActive && activeSubPage()?.kind === 'managed') {
      return `<main class="workspace focus-layout" ${workspaceStyleAttr()}>${focusNavigator()}${resizeHandle('left')}${canvasPanel()}${resizeHandle('inspector')}${inspectorPanel()}</main>`;
    }
    return `<main class="workspace focus-entry-layout" ${workspaceStyleAttr()}>${stagePanel()}${resizeHandle('left')}${canvasPanel()}${resizeHandle('inspector')}${inspectorPanel()}</main>`;
  }

  function captureScrollPositions() {
    const map = {};
    if (!root) return map;
    root.querySelectorAll('[data-scroll-key]').forEach((element) => {
      map[element.dataset.scrollKey] = element.scrollTop;
    });
    return map;
  }

  function restoreScrollPositions(map) {
    if (!root) return;
    root.querySelectorAll('[data-scroll-key]').forEach((element) => {
      const key = element.dataset.scrollKey;
      if (map[key] != null) element.scrollTop = map[key];
    });
  }

  function render() {
    const scrollMap = captureScrollPositions();
    const workspace = scheme === 'inline' ? inlineWorkspace() : scheme === 'drawer' ? drawerWorkspace() : focusWorkspace();
    root.innerHTML = `<div class="prototype-app">${topbar()}${workspace}</div>${menuHtml()}${modalHtml()}${dragOverlayHtml()}<div id="toast" class="toast" hidden></div>`;
    restoreScrollPositions(scrollMap);
    if (dragState) {
      // DOM 重建后恢复滚动锁与预览补丁
      autoScrollEl = null;
      if (autoScrollPoint) autoScrollEl = pickScrollContainer(autoScrollPoint.x, autoScrollPoint.y);
      else autoScrollEl = pickScrollContainer(dragState.x, dragState.y);
      patchDragPreview();
    }
    updateDragGhost();
    applyPendingScroll();
  }

  function menuHtml() {
    if (!menu) return '<div class="context-menu" hidden></div>';
    const view = Core.getView(state, menu.viewId);
    if (!view) return '<div class="context-menu" hidden></div>';
    return `<div class="context-menu" style="left:${menu.x}px;top:${menu.y}px"><button data-action="duplicate-view" data-view="${esc(view.id)}" type="button">复制到下方</button><button data-action="rename-view" data-view="${esc(view.id)}" type="button">重命名</button><button class="danger" data-action="confirm-delete" data-view="${esc(view.id)}" type="button">删除页面</button></div>`;
  }

  function modalHtml() {
    if (!modal) return '<div class="modal-backdrop" hidden></div>';
    if (modal.type === 'template') {
      const selected = modal.selected || '';
      return modalShell('选择大关卡模板', `<div class="template-grid">
        <button class="template-card ${selected === 'internal' ? 'selected' : ''}" data-action="select-template" data-template="internal" type="button"><strong>内部界面管理模板</strong><span>适合内部页面、弹窗管理。同类型小关卡之间可互相移动页面。</span></button>
        <button class="template-card ${selected === 'blank' ? 'selected' : ''}" data-action="select-template" data-template="blank" type="button"><strong>空白关卡</strong><span>普通小关卡，可以选择和编辑自己的组件。</span></button>
        <button class="template-card ${selected === 'video' ? 'selected' : ''}" data-action="select-template" data-template="video" type="button"><strong>视频关卡</strong><span>视频小关卡拥有独立组件，不接收内部页面。</span></button>
      </div>`, `<button class="modal-button" data-action="close-modal" type="button">取消</button><button class="modal-button primary" data-action="confirm-template" type="button" ${selected ? '' : 'disabled'}>确认创建</button>`);
    }
    if (modal.type === 'add-view') {
      return modalShell('新增内部页面', `<div class="choice-grid"><button class="choice-card" data-action="add-view" data-kind="peer" type="button"><strong>同级页面</strong><span>内容移动到其他兼容小关卡后保持不变。</span></button><button class="choice-card" data-action="add-view" data-kind="dialog" type="button"><strong>弹窗</strong><span>移动后自动使用目标小关卡主界面作为底板。</span></button></div>`, '<button class="modal-button" data-action="close-modal" type="button">取消</button>');
    }
    if (modal.type === 'component') {
      return modalShell('添加组件', `<div class="choice-grid"><button class="choice-card" data-action="add-component" data-kind="jump-button" type="button"><strong>页面跳转按钮</strong><span>仍然是普通按钮，添加后在右侧配置跳转目标。</span></button><button class="choice-card" data-action="add-component" data-kind="button" type="button"><strong>普通按钮</strong><span>可以配置打开弹窗或跳转页面。</span></button><button class="choice-card" data-action="add-component" data-kind="text" type="button"><strong>文本</strong><span>添加一段当前页面独立拥有的文字。</span></button><button class="choice-card" data-action="add-component" data-kind="image" type="button"><strong>图片</strong><span>添加当前页面独立拥有的图片。</span></button></div>`, '<button class="modal-button" data-action="close-modal" type="button">取消</button>');
    }
    if (modal.type === 'rename') {
      return modalShell('重命名页面', `<input id="renameInput" class="rename-input" value="${esc(modal.value)}" maxlength="28" />`, `<button class="modal-button" data-action="close-modal" type="button">取消</button><button class="modal-button primary" data-action="confirm-rename" data-view="${esc(modal.viewId)}" type="button">保存</button>`);
    }
    if (modal.type === 'event') {
      const found = Core.findElement(state, modal.elementId);
      const subPage = found ? Core.getSubPage(state, found.view.subPageId) : null;
      const targets = subPage ? subPage.viewOrder.filter((id) => id !== found.viewId) : [];
      const cards = targets.map((viewId) => {
        const view = Core.getView(state, viewId);
        return `<button class="choice-card ${found?.element.targetView === viewId ? 'selected' : ''}" data-action="save-event-target" data-element="${esc(modal.elementId)}" data-view="${esc(viewId)}" type="button"><strong>${esc(view.title)}</strong><span>${view.kind === 'dialog' ? '点击后打开弹窗' : '点击后跳转到这个页面'}</span></button>`;
      }).join('');
      return modalShell('配置按钮事件链接', `${targets.length ? `<div class="choice-grid">${cards}</div>` : '<div class="empty-state"><div><h2>还没有可跳转页面</h2><p>请先新增同级页面或弹窗。</p></div></div>'}`, `<button class="modal-button" data-action="clear-event" data-element="${esc(modal.elementId)}" type="button">清除事件</button><button class="modal-button" data-action="close-modal" type="button">取消</button>`);
    }
    if (modal.type === 'delete') {
      const view = Core.getView(state, modal.viewId);
      return modalShell('删除内部页面', `<div class="issue-card"><strong>确认删除“${esc(view?.title)}”吗？</strong><p>指向它的按钮会进入待处理状态，可以通过撤销恢复。</p></div>`, `<button class="modal-button" data-action="close-modal" type="button">取消</button><button class="modal-button danger" data-action="delete-view" data-view="${esc(modal.viewId)}" type="button">删除</button>`);
    }
    if (modal.type === 'issues') {
      return modalShell('待处理关系', `<div class="issues-list">${issuesContent(modal.subPageId || null)}</div>`, '<button class="modal-button primary" data-action="close-modal" type="button">完成</button>');
    }
    return '<div class="modal-backdrop" hidden></div>';
  }

  function modalShell(title, body, footer) {
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal"><div class="modal-head"><strong>${title}</strong><button data-action="close-modal" type="button" aria-label="关闭">×</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></div></div>`;
  }

  function dragOverlayHtml() {
    if (!dragState) return '';
    const sourceLabel = dragState.type === 'view' ? Core.getView(state, dragState.id)?.title : Core.subPageLabel(state, dragState.id);
    const targetLabel = dragState.type === 'view' && dragState.targetSubPageId
      ? Core.subPageLabel(state, dragState.targetSubPageId)
      : dragState.type === 'subpage' && dragState.targetStageId
        ? Core.getStage(state, dragState.targetStageId)?.title
        : '寻找放置位置';
    return `<div id="dragGhost" class="drag-ghost ${dragState.valid ? 'valid' : ''}" style="left:${dragState.x + 16}px;top:${dragState.y + 14}px"><strong>${esc(sourceLabel)}</strong><span>${esc(targetLabel || '寻找放置位置')}</span></div>`;
  }

  function openMenu(button, viewId) {
    const rect = button.getBoundingClientRect();
    menu = { viewId, x: Math.min(window.innerWidth - 164, rect.right - 154), y: Math.min(window.innerHeight - 150, rect.bottom + 4) };
    render();
  }

  function activateSubPageWithUi(subPageId) {
    Core.activateSubPage(state, subPageId);
    const subPage = Core.getSubPage(state, subPageId);
    if (scheme === 'drawer') {
      state.drawerOpen = true;
      state.drawerTab = subPage?.kind === 'managed' ? 'views' : state.drawerTab;
    }
    if (scheme === 'inline' && subPage?.kind === 'managed') {
      // 展开当前，折叠其他托管小关卡，控制密度
      state.expandedSubPageIds = [subPageId];
    }
    requestScrollTo(`subpage:${subPageId}`);
  }

  function handleAction(action, target) {
    if (Date.now() < suppressClickUntil) return;
    if (action === 'open-template') { modal = { type: 'template', selected: null, purpose: target.dataset.purpose || 'stage' }; render(); return; }
    if (action === 'select-template') { modal.selected = target.dataset.template; render(); return; }
    if (action === 'confirm-template') {
      const selected = modal.selected;
      const purpose = modal.purpose;
      let result;
      if (purpose === 'initial' && selected === 'internal' && Core.getStage(state, 'stage-managed')?.placeholder) result = Core.createInitialManaged(state);
      else result = Core.createLargeStage(state, selected);
      modal = null;
      if (result?.id && result.subPageIds) requestScrollTo(`subpage:${result.subPageIds[0]}`);
      update();
      showToast(result ? '已创建独立小关卡。可以新增页面并拖动到其他兼容小关卡。' : '未能创建关卡。', result ? 'info' : 'error');
      return;
    }
    if (action === 'close-modal') { modal = null; render(); return; }
    if (action === 'backdrop' && target.classList.contains('modal-backdrop')) { modal = null; render(); return; }
    if (action === 'reset-scheme') {
      localStorage.removeItem(`forge-phase1-${scheme}`);
      state = Core.baseState();
      menu = null;
      modal = null;
      dragState = null;
      stopAutoScroll();
      render();
      showToast('当前方案已重新开始。');
      return;
    }
    if (action === 'add-subpage') {
      const subPage = Core.addSubPage(state, target.dataset.stage);
      if (subPage) {
        activateSubPageWithUi(subPage.id);
        update();
        showToast(`已新增${Core.subPageLabel(state, subPage.id)}。`);
      }
      return;
    }
    if (action === 'toggle-subpage') {
      const id = target.dataset.subpage;
      if (state.expandedSubPageIds.includes(id)) {
        state.expandedSubPageIds = state.expandedSubPageIds.filter((item) => item !== id);
      } else if (scheme === 'inline') {
        state.expandedSubPageIds = [id];
      } else {
        state.expandedSubPageIds = [...state.expandedSubPageIds, id];
      }
      requestScrollTo(`subpage:${id}`);
      update();
      return;
    }
    if (action === 'select-subpage') {
      activateSubPageWithUi(target.dataset.subpage);
      update();
      return;
    }
    if (action === 'select-view') {
      Core.activateView(state, target.dataset.view);
      requestScrollTo(`view:${target.dataset.view}`);
      update();
      return;
    }
    if (action === 'select-element') {
      Core.selectElement(state, target.dataset.element);
      state.inspectorTab = 'properties';
      if (modal?.type === 'issues') modal = null;
      update();
      return;
    }
    if (action === 'open-drawer') {
      activateSubPageWithUi(target.dataset.subpage);
      state.drawerOpen = true;
      update();
      return;
    }
    if (action === 'close-drawer') { state.drawerOpen = false; update(); return; }
    if (action === 'drawer-tab') { state.drawerTab = target.dataset.tab; update(); return; }
    if (action === 'focus-tab') { state.focusTab = target.dataset.tab; update(); return; }
    if (action === 'enter-focus') {
      Core.activateSubPage(state, target.dataset.subpage);
      state.focusActive = true;
      state.focusTab = 'views';
      update();
      return;
    }
    if (action === 'exit-focus') { state.focusActive = false; update(); showToast('已返回工作台，当前位置已保留。'); return; }
    if (action === 'open-add-view') {
      activateSubPageWithUi(target.dataset.subpage || state.activeSubPageId);
      modal = { type: 'add-view' };
      render();
      return;
    }
    if (action === 'add-view') {
      const id = Core.addView(state, target.dataset.kind);
      requestScrollTo(`view:${id}`);
      modal = { type: 'rename', viewId: id, value: Core.getView(state, id)?.title || '' };
      update();
      return;
    }
    if (action === 'confirm-rename') {
      const input = document.getElementById('renameInput');
      Core.renameView(state, target.dataset.view, input?.value || '');
      modal = null;
      update();
      showToast('页面名称已更新。');
      return;
    }
    if (action === 'view-more') { openMenu(target, target.dataset.view); return; }
    if (action === 'duplicate-view') {
      const id = Core.duplicateView(state, target.dataset.view);
      menu = null;
      if (id) requestScrollTo(`view:${id}`);
      update();
      if (id) showToast(`已在下方生成“${Core.getView(state, id).title}”。`, 'info', true);
      return;
    }
    if (action === 'rename-view') {
      const view = Core.getView(state, target.dataset.view);
      menu = null;
      modal = { type: 'rename', viewId: view.id, value: view.title };
      render();
      return;
    }
    if (action === 'confirm-delete') { menu = null; modal = { type: 'delete', viewId: target.dataset.view }; render(); return; }
    if (action === 'delete-view') {
      const view = Core.deleteView(state, target.dataset.view);
      modal = null;
      update();
      if (view) showToast(`已删除“${view.title}”。`, 'warn', true);
      return;
    }
    if (action === 'undo-last') {
      const restored = Core.undo(state);
      if (restored) {
        state = restored;
        update();
        showToast('已撤销上一步操作。');
      }
      return;
    }
    if (action === 'open-component') { modal = { type: 'component' }; render(); return; }
    if (action === 'add-component') {
      const id = Core.addComponent(state, target.dataset.kind);
      modal = null;
      update();
      if (id) showToast('组件已添加，可在右侧配置属性和事件。');
      return;
    }
    if (action === 'canvas-element') {
      const elementId = target.dataset.element;
      if (state.mode === 'run') {
        const result = Core.runClickElement(state, elementId);
        update();
        if (!result.ok) showToast('这个按钮还没有配置点击事件。', 'warn');
        else if (result.action === 'jump') showToast(`已跳转到“${result.target.title}”。`);
        return;
      }
      if (state.bindingDialogId) {
        const dialog = Core.getView(state, state.bindingDialogId);
        if (Core.bindDialogTrigger(state, state.bindingDialogId, elementId)) {
          update();
          showToast(`已建立关系：点击这个按钮打开“${dialog.title}”。`);
        } else showToast('请选择同一小关卡中的普通按钮。', 'warn');
        return;
      }
      Core.selectElement(state, elementId);
      state.inspectorTab = 'properties';
      update();
      return;
    }
    if (action === 'configure-event') { modal = { type: 'event', elementId: target.dataset.element }; render(); return; }
    if (action === 'save-event-target') {
      Core.configureButtonEvent(state, target.dataset.element, target.dataset.view);
      modal = null;
      update();
      showToast('按钮事件链接已保存。');
      return;
    }
    if (action === 'clear-event') {
      Core.clearButtonEvent(state, target.dataset.element);
      modal = null;
      update();
      showToast('按钮事件已清除。');
      return;
    }
    if (action === 'start-binding') {
      const view = Core.getView(state, target.dataset.view);
      Core.activateSubPage(state, view.subPageId);
      state.currentViewId = Core.getSubPage(state, view.subPageId).mainViewId;
      state.bindingDialogId = view.id;
      modal = null;
      if (scheme === 'drawer') state.drawerTab = 'elements';
      if (scheme === 'focus') state.focusTab = 'elements';
      update();
      showToast('请在画布中选择一个按钮。');
      return;
    }
    if (action === 'cancel-binding') { state.bindingDialogId = null; update(); showToast('已取消选择。'); return; }
    if (action === 'open-issues') { modal = { type: 'issues', subPageId: state.focusActive ? state.activeSubPageId : null }; render(); return; }
    if (action === 'toggle-run') {
      if (state.mode === 'run') Core.stopRun(state);
      else Core.startRun(state);
      update();
      return;
    }
    if (action === 'inspector-tab') { state.inspectorTab = target.dataset.tab; update(); return; }
  }

  function clickHandler(event) {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) { if (menu) { menu = null; render(); } return; }
    event.preventDefault();
    event.stopPropagation();
    handleAction(actionTarget.dataset.action, actionTarget);
  }

  function pointerDownHandler(event) {
    if (event.button !== 0) return;
    const pageHandle = event.target.closest('[data-page-drag]');
    const subPageHandle = event.target.closest('[data-subpage-drag]');
    const handle = pageHandle || subPageHandle;
    if (!handle) return;
    event.preventDefault();
    const type = pageHandle ? 'view' : 'subpage';
    const id = pageHandle ? pageHandle.dataset.pageDrag : subPageHandle.dataset.subpageDrag;
    // 捕获后即使经过其他面板，后续 pointermove 也稳定回到当前拖拽链路。
    try { handle.setPointerCapture(event.pointerId); } catch {}
    pressState = {
      type,
      id,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      handle,
      pointerId: event.pointerId,
      timer: null,
    };
    handle.classList.add('pressing');
    // 仍保留短延迟作为兜底：按住不动也能进入拖拽
    pressState.timer = window.setTimeout(() => beginDrag(), 160);
  }

  function beginDrag() {
    if (!pressState || dragState) return;
    const handle = pressState.handle;
    dragState = {
      type: pressState.type,
      id: pressState.id,
      x: pressState.x,
      y: pressState.y,
      valid: false,
      reason: null,
      targetSubPageId: null,
      targetStageId: null,
      targetIndex: null,
      handle: pressState.handle,
      pointerId: pressState.pointerId,
    };
    if (handle) handle.classList.remove('pressing');
    window.clearTimeout(pressState.timer);
    pressState = null;
    if (dragState.type === 'view') {
      const view = Core.getView(state, dragState.id);
      if (view && scheme === 'inline' && !state.expandedSubPageIds.includes(view.subPageId)) {
        state.expandedSubPageIds = [view.subPageId];
      }
    }
    suppressClickUntil = Date.now() + 500;
    // 即使拖拽由第一段移动触发，也立刻具备可滚动的指针位置。
    autoScrollPoint = { x: dragState.x, y: dragState.y };
    autoScrollEl = null;
    // 先锁定可能的滚动容器，再渲染，避免首帧找不到
    autoScrollEl = pickScrollContainer(dragState.x, dragState.y);
    render();
    // render 后 DOM 重建，重新锁定
    autoScrollEl = pickScrollContainer(dragState.x, dragState.y);
    updateDragTarget(dragState.x, dragState.y, { force: true });
    startAutoScrollLoop();
  }

  function pointerMoveHandler(event) {
    if (!pressState && !dragState) return;
    if (pressState && !dragState) {
      pressState.x = event.clientX;
      pressState.y = event.clientY;
      const distance = Math.hypot(event.clientX - pressState.startX, event.clientY - pressState.startY);
      // 移动超过阈值即开始拖，不再取消
      if (distance > 4) beginDrag();
      return;
    }
    event.preventDefault();
    dragState.x = event.clientX;
    dragState.y = event.clientY;
    autoScrollPoint = { x: event.clientX, y: event.clientY };
    updateDragTarget(event.clientX, event.clientY);
    // 指针移动当帧就执行一次，避免仅依赖动画帧导致拖到边缘时没有任何反馈。
    advanceAutoScroll(event.clientX, event.clientY);
    updateDragGhost();
  }

  function updateDragTarget(x, y, options = {}) {
    if (!dragState) return;
    const { force = false } = options;
    const next = dragState.type === 'view'
      ? resolveViewDropAtPoint(x, y)
      : resolveSubPageDropAtPoint(x, y);
    // 自动滚动时指针会越过列表底边。仍在同一列就保留上一个有效目标，
    // 否则强制刷新会清空目标，使下一帧失去应继续滚动的列表。
    if (!next.targetSubPageId && !next.targetStageId && (dragState.targetSubPageId || dragState.targetStageId)) {
      if (!force || staysInTargetScrollColumn(x)) return;
    }
    const changed = next.valid !== dragState.valid
      || next.reason !== dragState.reason
      || next.targetSubPageId !== dragState.targetSubPageId
      || next.targetStageId !== dragState.targetStageId
      || next.targetIndex !== dragState.targetIndex;
    if (!changed && !force) return;
    Object.assign(dragState, next);
    // 小关卡拖拽：始终局部补丁，杜绝整页闪烁
    if (dragState.type === 'subpage') {
      if (!patchDragPreview()) {
        // 极少情况下 DOM 未就绪才全量
        render();
        patchDragPreview();
      } else {
        updateDragGhost();
      }
      return;
    }
    // 页面拖拽：方案二、三的目标结构已在拖拽开始时就绪，目标切换只局部更新。
    // 方案一仅在目标小关卡尚未展开时，才需要补一次重绘。
    if (!patchDragPreview()) {
      render();
      patchDragPreview();
    } else {
      updateDragGhost();
    }
  }

  function clearDragPreviewMarks(scope) {
    scope.querySelectorAll('.drop-placeholder').forEach((el) => el.remove());
    scope.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
    scope.querySelectorAll('.compatible-target').forEach((el) => el.classList.remove('compatible-target'));
    scope.querySelectorAll('.incompatible-target').forEach((el) => el.classList.remove('incompatible-target'));
    scope.querySelectorAll('.compact-drop-zone.active, .compact-drop-zone.invalid').forEach((el) => {
      el.classList.remove('active', 'invalid');
    });
    scope.querySelectorAll('.focus-drop-card.active, .focus-drop-target.active').forEach((el) => el.classList.remove('active'));
    scope.querySelectorAll('.view-row.dragging, .subpage-block.dragging').forEach((el) => el.classList.remove('dragging'));
  }

  function insertPlaceholderBefore(node, label) {
    if (!node || !node.parentElement) return;
    const ph = document.createElement('div');
    ph.className = 'drop-placeholder page-placeholder';
    ph.innerHTML = `<span>${esc(label)}</span>`;
    node.parentElement.insertBefore(ph, node);
  }

  function patchDragPreview() {
    if (!root || !dragState) return false;
    // 方案一：目标小关卡内部列表未展开时，交给 render
    if (dragState.type === 'view' && scheme === 'inline' && dragState.targetSubPageId) {
      const block = root.querySelector(`[data-subpage-drop-row="${dragState.targetSubPageId}"]`);
      if (!block?.querySelector('.internal-section')) return false;
    }
    // 方案三：跨关目标卡片在拖拽开始时已预先生成；缺失时才回退重绘。
    if (dragState.type === 'view' && scheme === 'focus' && state.focusActive) {
      const targetId = dragState.targetSubPageId;
      if (targetId && targetId !== state.activeSubPageId) {
        const card = root.querySelector(`.focus-drop-target[data-page-drop-zone="${targetId}"]`)?.closest('.focus-drop-card');
        if (!card || !card.querySelector('.internal-section')) return false;
      }
    }

    clearDragPreviewMarks(root);
    if (dragState.type === 'view') {
      const source = root.querySelector(`[data-page-drop-view="${dragState.id}"]`);
      if (source) source.classList.add('dragging');
      root.querySelectorAll('[data-subpage-drop-row]').forEach((block) => {
        const id = block.dataset.subpageDropRow;
        const reason = Core.getMoveBlockReason(state, dragState.id, id);
        if (!reason) block.classList.add('compatible-target');
        else block.classList.add('incompatible-target');
        if (id === dragState.targetSubPageId && !reason) block.classList.add('drop-target');
      });
      root.querySelectorAll('[data-page-drop-zone]').forEach((zone) => {
        const id = zone.dataset.pageDropZone;
        if (!id) return;
        if (zone.classList.contains('compact-drop-zone') || zone.classList.contains('focus-drop-target')) {
          const reason = Core.getMoveBlockReason(state, dragState.id, id);
          if (id === dragState.targetSubPageId) {
            zone.classList.add(reason || !dragState.valid ? 'invalid' : 'active');
            zone.closest('.focus-drop-card')?.classList.add('active');
          }
        }
      });
      if (dragState.valid && dragState.targetSubPageId != null && dragState.targetIndex != null) {
        const rows = [...root.querySelectorAll(`[data-page-drop-view][data-subpage="${dragState.targetSubPageId}"]`)];
        const label = '放到这里';
        if (!rows.length) {
          const zone = root.querySelector(`[data-page-drop-zone="${dragState.targetSubPageId}"]`);
          if (zone && !zone.querySelector('.drop-placeholder')) {
            const ph = document.createElement('div');
            ph.className = 'drop-placeholder page-placeholder';
            ph.innerHTML = `<span>${esc(label)}</span>`;
            zone.appendChild(ph);
          }
        } else {
          // targetIndex 是插入点：插在第 n 个 row 前；若 n>=len 插到最后
          const ordered = rows.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
          const idx = Number(dragState.targetIndex);
          const before = ordered.find((row) => Number(row.dataset.index) >= idx);
          if (before) insertPlaceholderBefore(before, label);
          else {
            const last = ordered[ordered.length - 1];
            if (last?.parentElement) {
              const ph = document.createElement('div');
              ph.className = 'drop-placeholder page-placeholder';
              ph.innerHTML = `<span>${esc(label)}</span>`;
              last.parentElement.appendChild(ph);
            }
          }
        }
      }
    } else {
      const sourceBlock = root.querySelector(`[data-subpage-drop-row="${dragState.id}"]`);
      if (sourceBlock) sourceBlock.classList.add('dragging');
      if (dragState.valid && dragState.targetStageId != null && dragState.targetIndex != null) {
        const rows = [...root.querySelectorAll(`[data-subpage-drop-row][data-stage="${dragState.targetStageId}"]`)];
        const ordered = rows.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
        const idx = Number(dragState.targetIndex);
        const before = ordered.find((row) => Number(row.dataset.index) >= idx);
        const ph = document.createElement('div');
        ph.className = 'drop-placeholder subpage-placeholder';
        ph.innerHTML = '<span>放置小关卡到这里</span>';
        if (before?.parentElement) before.parentElement.insertBefore(ph, before);
        else {
          const list = root.querySelector(`[data-subpage-drop-stage="${dragState.targetStageId}"] .subpage-list`);
          if (list) list.appendChild(ph);
        }
      }
    }
    updateDragGhost();
    return true;
  }

  function updateDragGhost() {
    if (!dragState) return;
    const ghost = document.getElementById('dragGhost');
    if (!ghost) return;
    ghost.style.left = `${dragState.x + 16}px`;
    ghost.style.top = `${dragState.y + 14}px`;
    ghost.classList.toggle('valid', Boolean(dragState.valid));
    const sourceLabel = dragState.type === 'view' ? Core.getView(state, dragState.id)?.title : Core.subPageLabel(state, dragState.id);
    let targetLabel = '寻找放置位置';
    if (dragState.type === 'view') {
      if (dragState.valid && dragState.targetSubPageId) {
        targetLabel = `${Core.subPageLabel(state, dragState.targetSubPageId)} · 指定位置`;
      } else if (dragState.reason) {
        targetLabel = dragState.reason;
      } else if (dragState.targetSubPageId) {
        targetLabel = Core.getMoveBlockReason(state, dragState.id, dragState.targetSubPageId) || '不能放在这里';
      }
    } else if (dragState.type === 'subpage' && dragState.targetStageId) {
      targetLabel = Core.getStage(state, dragState.targetStageId)?.title || targetLabel;
    }
    ghost.innerHTML = `<strong>${esc(sourceLabel)}</strong><span>${esc(targetLabel || '寻找放置位置')}</span>`;
  }

  function advanceAutoScroll(x, y) {
    const scroll = pickScrollContainer(x, y);
    if (!scroll) return false;
    const rect = scroll.getBoundingClientRect();
    const edge = 72;
    let delta = 0;
    // 即使指针完全在列表外，只要 y 在列表上方/下方，就持续滚。
    if (y <= rect.top + edge) {
      const dist = Math.max(8, rect.top + edge - y);
      // 常规边缘悬停保持低速，只有明显越界才逐步加速，方便瞄准指定小关卡。
      delta = -Math.min(7, 1.5 + dist * 0.09);
    } else if (y >= rect.bottom - edge) {
      const dist = Math.max(8, y - (rect.bottom - edge));
      delta = Math.min(7, 1.5 + dist * 0.09);
    }
    if (!delta) return false;
    const prev = scroll.scrollTop;
    scroll.scrollTop = Math.max(0, Math.min(scroll.scrollHeight - scroll.clientHeight, scroll.scrollTop + delta));
    if (scroll.scrollTop === prev) return false;
    updateDragTarget(x, y, { force: true });
    return true;
  }

  function startAutoScrollLoop() {
    // 不调用 stopAutoScroll，避免清掉已锁定容器；只停旧帧。
    if (autoScrollRaf) window.cancelAnimationFrame(autoScrollRaf);
    const tick = () => {
      if (!dragState || !autoScrollPoint) {
        autoScrollRaf = 0;
        return;
      }
      advanceAutoScroll(autoScrollPoint.x, autoScrollPoint.y);
      autoScrollRaf = window.requestAnimationFrame(tick);
    };
    autoScrollRaf = window.requestAnimationFrame(tick);
  }

  function stopAutoScroll() {
    if (autoScrollRaf) window.cancelAnimationFrame(autoScrollRaf);
    autoScrollRaf = 0;
    autoScrollPoint = null;
    autoScrollEl = null;
  }

  function pointerUpHandler() {
    if (pressState && !dragState) {
      cancelPress();
      return;
    }
    if (!dragState) return;
    const completed = dragState.valid;
    if (completed && dragState.type === 'view') {
      const result = Core.moveView(state, dragState.id, dragState.targetSubPageId, dragState.targetIndex);
      if (result) {
        const details = [
          result.backgroundChanged ? '弹窗底板已改为目标主界面' : '',
          result.changedRelations ? `${result.changedRelations} 条关系进入待处理` : '',
        ].filter(Boolean).join('，');
        requestScrollTo(`view:${result.view.id}`);
        persist();
        clearDrag();
        render();
        showToast(`页面已移动到${Core.subPageLabel(state, result.view.subPageId)}（位置 ${result.insertIndex + 1}）${details ? `；${details}` : ''}。`, details ? 'warn' : 'info', true);
        return;
      }
    }
    if (completed && dragState.type === 'subpage') {
      const movedId = dragState.id;
      if (Core.moveSubPage(state, movedId, dragState.targetStageId, dragState.targetIndex)) {
        requestScrollTo(`subpage:${movedId}`);
        persist();
        clearDrag();
        render();
        showToast(`${Core.subPageLabel(state, movedId)}已移动到新的位置。`, 'info', true);
        return;
      }
    }
    const failReason = dragState.reason || '未放置到有效位置，内容保持不变。';
    clearDrag();
    render();
    showToast(failReason, 'warn');
  }

  function cancelPress() {
    if (!pressState) return;
    window.clearTimeout(pressState.timer);
    try {
      if (pressState.handle?.hasPointerCapture?.(pressState.pointerId)) pressState.handle.releasePointerCapture(pressState.pointerId);
    } catch {}
    root?.querySelectorAll('.pressing').forEach((element) => element.classList.remove('pressing'));
    pressState = null;
  }

  function clearDrag() {
    cancelPress();
    try {
      if (dragState?.handle?.hasPointerCapture?.(dragState.pointerId)) dragState.handle.releasePointerCapture(dragState.pointerId);
    } catch {}
    stopAutoScroll();
    dragState = null;
    suppressClickUntil = Date.now() + 250;
  }

  function keyHandler(event) {
    if (event.key !== 'Escape') return;
    if (panelResize) {
      endPanelResize(false);
      return;
    }
    if (dragState || pressState) {
      clearDrag();
      render();
      showToast('已取消拖拽。');
      return;
    }
    if (modal) { modal = null; render(); return; }
    if (menu) { menu = null; render(); return; }
    if (state.bindingDialogId) {
      state.bindingDialogId = null;
      update();
      showToast('已取消选择。');
    }
  }

  function beginPanelResize(target, handle, clientX, pointerId) {
    if (!layoutState || !LAYOUT_LIMITS[target] || layoutState[target] == null) return;
    panelResize = {
      target,
      startX: clientX,
      startWidth: layoutState[target],
      handle,
    };
    if (panelResize.handle) panelResize.handle.classList.add('active');
    document.body.classList.add('is-panel-resizing');
    if (pointerId != null && handle?.setPointerCapture) {
      try { handle.setPointerCapture(pointerId); } catch {}
    }
  }

  function applyPanelResize(clientX) {
    if (!panelResize || !layoutState) return;
    const delta = clientX - panelResize.startX;
    // 左侧栏向右拖变宽；属性栏向右拖变窄（以右边缘为锚）
    const next = panelResize.target === 'inspector'
      ? panelResize.startWidth - delta
      : panelResize.startWidth + delta;
    layoutState[panelResize.target] = clampLayoutValue(panelResize.target, next);
    const workspace = root?.querySelector('.workspace');
    if (!workspace) return;
    if (panelResize.target === 'left') workspace.style.setProperty('--left-width', `${layoutState.left}px`);
    if (panelResize.target === 'stage') workspace.style.setProperty('--stage-width', `${layoutState.stage}px`);
    if (panelResize.target === 'drawer') workspace.style.setProperty('--drawer-width', `${layoutState.drawer}px`);
    if (panelResize.target === 'inspector') workspace.style.setProperty('--inspector-width', `${layoutState.inspector}px`);
  }

  function endPanelResize(persist = true) {
    if (!panelResize) return;
    if (panelResize.handle) panelResize.handle.classList.remove('active');
    document.body.classList.remove('is-panel-resizing');
    panelResize = null;
    if (persist) {
      saveLayoutState();
    }
  }

  function resetPanelWidth(target) {
    const defaults = LAYOUT_DEFAULTS[scheme];
    if (!defaults || defaults[target] == null || !layoutState) return;
    layoutState[target] = defaults[target];
    saveLayoutState();
    render();
    const names = { left: '左侧栏', stage: '关卡栏', drawer: '抽屉', inspector: '属性栏' };
    showToast(`${names[target] || '面板'}宽度已恢复默认。`);
  }

  function resizePointerDownHandler(event) {
    if (event.button !== 0) return;
    const handle = event.target.closest('[data-resize-target]');
    if (!handle || !root.contains(handle)) return;
    // 避免与页面拖拽冲突
    if (dragState || pressState) return;
    event.preventDefault();
    event.stopPropagation();
    beginPanelResize(handle.dataset.resizeTarget, handle, event.clientX, event.pointerId);
  }

  function resizePointerMoveHandler(event) {
    if (!panelResize) return;
    event.preventDefault();
    applyPanelResize(event.clientX);
  }

  function resizePointerUpHandler() {
    if (!panelResize) return;
    endPanelResize(true);
  }

  function resizeDblClickHandler(event) {
    const handle = event.target.closest('[data-resize-target]');
    if (!handle || !root.contains(handle)) return;
    event.preventDefault();
    event.stopPropagation();
    resetPanelWidth(handle.dataset.resizeTarget);
  }

  function mount(nextScheme) {
    scheme = nextScheme;
    root = document.getElementById('prototypeRoot');
    state = Core.load(scheme);
    layoutState = loadLayoutState();
    root.addEventListener('click', clickHandler);
    root.addEventListener('pointerdown', pointerDownHandler);
    root.addEventListener('pointerdown', resizePointerDownHandler, true);
    root.addEventListener('dblclick', resizeDblClickHandler, true);
    document.addEventListener('pointermove', pointerMoveHandler, { passive: false });
    document.addEventListener('pointermove', resizePointerMoveHandler, { passive: false });
    document.addEventListener('pointerup', pointerUpHandler);
    document.addEventListener('pointerup', resizePointerUpHandler);
    document.addEventListener('pointercancel', pointerUpHandler);
    document.addEventListener('pointercancel', resizePointerUpHandler);
    document.addEventListener('keydown', keyHandler);
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'forge-phase1-reset') {
        state = Core.baseState();
        menu = null;
        modal = null;
        clearDrag();
        render();
        showToast('三个方案已全部重置。');
      }
    });
    render();
  }

  window.PhaseOnePrototype = { mount };
})();
