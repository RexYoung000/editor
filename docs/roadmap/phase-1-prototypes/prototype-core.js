(function () {
  const SCHEMA_VERSION = 3;
  const INTERNAL_TEMPLATE_ID = 'internal-interface-v1';

  const SCHEME_LABELS = {
    inline: '方案一 · 内嵌精简管理',
    drawer: '方案二 · 侧边管理抽屉',
    focus: '方案三 · 专注工作区',
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextId(state, prefix) {
    const value = `${prefix}-${state.nextId}`;
    state.nextId += 1;
    return value;
  }

  function makeMainElements(state, kind) {
    if (kind === 'normal') {
      return [
        { id: nextId(state, 'element'), label: '普通题干', type: '文本' },
        { id: nextId(state, 'element'), label: '练习图片', type: '图片' },
        { id: nextId(state, 'element'), label: '下一步按钮', type: '按钮', role: 'normal', eventType: 'none', targetView: null },
      ];
    }
    if (kind === 'video') {
      return [
        { id: nextId(state, 'element'), label: '视频画面', type: '视频' },
        { id: nextId(state, 'element'), label: '播放按钮', type: '按钮', role: 'normal', eventType: 'none', targetView: null },
      ];
    }
    return [
      { id: nextId(state, 'element'), label: '题干标题', type: '文本' },
      { id: nextId(state, 'element'), label: '第 2 题', type: '按钮', role: 'navigation', eventType: 'none', targetView: null },
      { id: nextId(state, 'element'), label: '提示按钮', type: '按钮', role: 'normal', eventType: 'none', targetView: null },
      { id: nextId(state, 'element'), label: '解析按钮', type: '按钮', role: 'normal', eventType: 'none', targetView: null },
      { id: nextId(state, 'element'), label: '辅助说明', type: '文本' },
    ];
  }

  function addSubPageRecord(state, stage, kind, templateId) {
    const subPageId = nextId(state, 'subpage');
    const mainViewId = nextId(state, 'view');
    const subPage = {
      id: subPageId,
      kind,
      templateId,
      mainViewId,
      viewOrder: [mainViewId],
    };
    state.subPages[subPageId] = subPage;
    state.views[mainViewId] = {
      id: mainViewId,
      subPageId,
      kind: 'main',
      title: '主界面',
      description: kind === 'managed'
        ? '当前小关卡的默认入口，承载题干、主要内容和事件按钮。'
        : kind === 'video'
          ? '当前视频小关卡的默认画面。'
          : '当前普通小关卡的默认内容。',
      baseMainViewId: mainViewId,
    };
    state.elements[mainViewId] = makeMainElements(state, kind);
    stage.subPageIds.push(subPageId);
    return subPage;
  }

  function seedManagedDemo(state, subPage) {
    const peerId = nextId(state, 'view');
    const dialogId = nextId(state, 'view');
    state.views[peerId] = {
      id: peerId,
      subPageId: subPage.id,
      kind: 'peer',
      title: '第 2 题',
      description: '当前小关卡内的同级内容页面。',
      baseMainViewId: subPage.mainViewId,
    };
    state.elements[peerId] = [
      { id: nextId(state, 'element'), label: '第 2 题题干', type: '文本' },
      { id: nextId(state, 'element'), label: '返回主界面', type: '按钮', role: 'navigation', eventType: 'jump', targetView: subPage.mainViewId },
      { id: nextId(state, 'element'), label: '第 2 题内容', type: '图片' },
    ];
    state.views[dialogId] = {
      id: dialogId,
      subPageId: subPage.id,
      kind: 'dialog',
      title: '提示弹窗',
      description: '弹窗内容保持独立，底板来自所属小关卡的主界面。',
      baseMainViewId: subPage.mainViewId,
    };
    state.elements[dialogId] = [
      { id: nextId(state, 'element'), label: '弹窗标题', type: '文本' },
      { id: nextId(state, 'element'), label: '弹窗内容', type: '文本' },
      { id: nextId(state, 'element'), label: '关闭弹窗', type: '按钮', role: 'close', eventType: 'closeDialog', targetView: null },
    ];
    subPage.viewOrder.push(peerId, dialogId);

    // 预配“第 2 题”跳转；保留“提示按钮”未配置，用于演示待处理引导
    const mainElements = state.elements[subPage.mainViewId] || [];
    const jumpButton = mainElements.find((element) => element.label === '第 2 题');
    if (jumpButton) {
      jumpButton.eventType = 'jump';
      jumpButton.targetView = peerId;
    }
    return { peerId, dialogId };
  }

  function baseState() {
    const state = {
      schemaVersion: SCHEMA_VERSION,
      nextId: 100,
      created: true,
      stages: [],
      subPages: {},
      views: {},
      elements: {},
      activeSubPageId: null,
      currentViewId: null,
      selectedElementId: null,
      expandedSubPageIds: [],
      drawerOpen: true,
      drawerTab: 'views',
      focusTab: 'views',
      focusActive: false,
      inspectorTab: 'properties',
      mode: 'edit',
      runViewId: null,
      runDialogId: null,
      bindingDialogId: null,
      deletedRecord: null,
      undoSnapshot: null,
      lastOperation: null,
    };

    const normalStage = {
      id: 'stage-normal',
      title: '普通练习',
      kind: 'normal',
      templateId: 'normal-template-v1',
      placeholder: false,
      subPageIds: [],
    };
    const managedStage = {
      id: 'stage-managed',
      title: '图形变化',
      kind: 'managed',
      templateId: INTERNAL_TEMPLATE_ID,
      placeholder: false,
      subPageIds: [],
    };
    state.stages.push(normalStage, managedStage);
    addSubPageRecord(state, normalStage, 'normal', normalStage.templateId);
    const managedSubPage = addSubPageRecord(state, managedStage, 'managed', managedStage.templateId);
    seedManagedDemo(state, managedSubPage);

    // 再给一个空的兼容小关卡，方便直接体验跨关卡拖入
    const extraManaged = addSubPageRecord(state, managedStage, 'managed', managedStage.templateId);

    state.activeSubPageId = managedSubPage.id;
    state.currentViewId = managedSubPage.mainViewId;
    state.expandedSubPageIds = [managedSubPage.id];
    state.drawerOpen = true;
    state.drawerTab = 'views';
    // 避免未使用变量被压缩工具误伤；extraManaged 用于样例数据本身
    void extraManaged;
    return state;
  }

  function load(scheme) {
    try {
      const saved = JSON.parse(localStorage.getItem(`forge-phase1-${scheme}`) || 'null');
      if (!saved || saved.schemaVersion !== SCHEMA_VERSION) return baseState();
      return saved;
    } catch {
      return baseState();
    }
  }

  function save(scheme, state) {
    const serializable = clone(state);
    serializable.mode = 'edit';
    serializable.runDialogId = null;
    serializable.bindingDialogId = null;
    serializable.undoSnapshot = null;
    localStorage.setItem(`forge-phase1-${scheme}`, JSON.stringify(serializable));
  }

  function rememberUndo(state, label) {
    const snapshot = clone(state);
    snapshot.undoSnapshot = null;
    state.undoSnapshot = snapshot;
    state.lastOperation = label;
  }

  function undo(state) {
    if (!state.undoSnapshot) return null;
    const restored = clone(state.undoSnapshot);
    restored.undoSnapshot = null;
    restored.lastOperation = null;
    return restored;
  }

  function getStage(state, stageId) {
    return state.stages.find((stage) => stage.id === stageId) || null;
  }

  function getSubPage(state, subPageId) {
    return state.subPages[subPageId] || null;
  }

  function getView(state, viewId) {
    return state.views[viewId] || null;
  }

  function getActiveSubPage(state) {
    return getSubPage(state, state.activeSubPageId);
  }

  function getStageForSubPage(state, subPageId) {
    return state.stages.find((stage) => stage.subPageIds.includes(subPageId)) || null;
  }

  function subPageNumber(state, subPageId) {
    const stageIndex = state.stages.findIndex((stage) => stage.subPageIds.includes(subPageId));
    if (stageIndex < 0) return '';
    const subIndex = state.stages[stageIndex].subPageIds.indexOf(subPageId);
    return `${stageIndex + 1}-${subIndex + 1}`;
  }

  function subPageLabel(state, subPageId) {
    const number = subPageNumber(state, subPageId);
    return number ? `小关卡 ${number}` : '小关卡';
  }

  function activateSubPage(state, subPageId) {
    const subPage = getSubPage(state, subPageId);
    if (!subPage) return false;
    state.activeSubPageId = subPageId;
    if (!subPage.viewOrder.includes(state.currentViewId)) state.currentViewId = subPage.mainViewId;
    state.selectedElementId = null;
    state.bindingDialogId = null;
    if (!state.expandedSubPageIds.includes(subPageId)) state.expandedSubPageIds.push(subPageId);
    return true;
  }

  function activateView(state, viewId) {
    const view = getView(state, viewId);
    if (!view) return false;
    activateSubPage(state, view.subPageId);
    state.currentViewId = viewId;
    state.selectedElementId = null;
    return true;
  }

  function createInitialManaged(state) {
    const stage = getStage(state, 'stage-managed');
    if (!stage || !stage.placeholder) return null;
    stage.placeholder = false;
    const subPage = addSubPageRecord(state, stage, 'managed', INTERNAL_TEMPLATE_ID);
    state.created = true;
    activateSubPage(state, subPage.id);
    return subPage;
  }

  function templateInfo(templateId) {
    if (templateId === 'internal') return { kind: 'managed', templateId: INTERNAL_TEMPLATE_ID, title: '内部界面管理' };
    if (templateId === 'video') return { kind: 'video', templateId: 'video-template-v1', title: '视频展示' };
    return { kind: 'normal', templateId: 'normal-template-v1', title: '空白练习' };
  }

  function createLargeStage(state, templateId) {
    const info = templateInfo(templateId);
    const stage = {
      id: nextId(state, 'stage'),
      title: info.title,
      kind: info.kind,
      templateId: info.templateId,
      placeholder: false,
      subPageIds: [],
    };
    state.stages.push(stage);
    const subPage = addSubPageRecord(state, stage, info.kind, info.templateId);
    if (info.kind === 'managed') state.created = true;
    activateSubPage(state, subPage.id);
    return stage;
  }

  function addSubPage(state, stageId) {
    const stage = getStage(state, stageId);
    if (!stage || stage.placeholder) return null;
    const subPage = addSubPageRecord(state, stage, stage.kind, stage.templateId);
    activateSubPage(state, subPage.id);
    return subPage;
  }

  function moveSubPage(state, subPageId, targetStageId, targetIndex) {
    const sourceStage = getStageForSubPage(state, subPageId);
    const targetStage = getStage(state, targetStageId);
    if (!sourceStage || !targetStage || targetStage.placeholder) return false;
    rememberUndo(state, '移动子关卡');
    const sourceIndex = sourceStage.subPageIds.indexOf(subPageId);
    sourceStage.subPageIds.splice(sourceIndex, 1);
    let insertIndex = Math.max(0, Math.min(Number(targetIndex), targetStage.subPageIds.length));
    if (sourceStage.id === targetStage.id && sourceIndex < insertIndex) insertIndex -= 1;
    targetStage.subPageIds.splice(insertIndex, 0, subPageId);
    activateSubPage(state, subPageId);
    return true;
  }

  function viewElements(state, viewId) {
    return state.elements[viewId] || [];
  }

  function subPageElements(state, subPageId) {
    const subPage = getSubPage(state, subPageId);
    if (!subPage) return [];
    return subPage.viewOrder.flatMap((viewId) => viewElements(state, viewId).map((element) => ({ ...element, viewId })));
  }

  function allElements(state) {
    return Object.keys(state.views).flatMap((viewId) => viewElements(state, viewId).map((element) => ({ ...element, viewId })));
  }

  function findElement(state, elementId) {
    for (const [viewId, list] of Object.entries(state.elements)) {
      const element = list.find((item) => item.id === elementId);
      if (element) return { element, viewId, view: state.views[viewId] };
    }
    return null;
  }

  function inboundButtons(state, viewId) {
    return allElements(state).filter((element) => element.type === '按钮' && element.targetView === viewId);
  }

  function pendingIssues(state, subPageId = null) {
    const issues = [];
    const subPages = subPageId ? [getSubPage(state, subPageId)].filter(Boolean) : Object.values(state.subPages);
    for (const subPage of subPages) {
      for (const viewId of subPage.viewOrder) {
        const view = getView(state, viewId);
        if (!view) continue;
        if (view.kind === 'dialog' && inboundButtons(state, viewId).length === 0) {
          issues.push({ type: 'unbound-dialog', subPageId: subPage.id, viewId, title: view.title });
        }
        for (const element of viewElements(state, viewId)) {
          if (element.brokenTargetTitle) {
            issues.push({ type: 'broken-target', subPageId: subPage.id, viewId, elementId: element.id, elementLabel: element.label, title: element.brokenTargetTitle });
          }
          if (element.role === 'navigation' && !element.targetView) {
            issues.push({ type: 'unbound-navigation', subPageId: subPage.id, viewId, elementId: element.id, elementLabel: element.label });
          }
        }
      }
    }
    return issues;
  }

  function addView(state, kind) {
    const subPage = getActiveSubPage(state);
    if (!subPage || subPage.kind !== 'managed') return null;
    const id = nextId(state, 'view');
    const sameKindCount = subPage.viewOrder.filter((viewId) => state.views[viewId]?.kind === kind).length;
    const title = kind === 'dialog' ? `弹窗 ${sameKindCount + 1}` : `第 ${sameKindCount + 2} 题`;
    const view = {
      id,
      subPageId: subPage.id,
      kind,
      title,
      description: kind === 'dialog'
        ? '弹窗内容保持独立，底板来自所属小关卡的主界面。'
        : '当前小关卡内的同级内容页面。',
      baseMainViewId: subPage.mainViewId,
    };
    state.views[id] = view;
    if (kind === 'dialog') {
      state.elements[id] = [
        { id: nextId(state, 'element'), label: '弹窗标题', type: '文本' },
        { id: nextId(state, 'element'), label: '弹窗内容', type: '文本' },
        { id: nextId(state, 'element'), label: '关闭弹窗', type: '按钮', role: 'close', eventType: 'closeDialog', targetView: null },
      ];
      subPage.viewOrder.push(id);
    } else {
      state.elements[id] = [
        { id: nextId(state, 'element'), label: `${title}题干`, type: '文本' },
        { id: nextId(state, 'element'), label: '返回主界面', type: '按钮', role: 'navigation', eventType: 'jump', targetView: subPage.mainViewId },
        { id: nextId(state, 'element'), label: `${title}内容`, type: '图片' },
      ];
      const firstDialog = subPage.viewOrder.findIndex((viewId) => state.views[viewId]?.kind === 'dialog');
      if (firstDialog < 0) subPage.viewOrder.push(id);
      else subPage.viewOrder.splice(firstDialog, 0, id);
    }
    activateView(state, id);
    return id;
  }

  function renameView(state, viewId, title) {
    const view = getView(state, viewId);
    if (!view || !title.trim()) return false;
    view.title = title.trim();
    return true;
  }

  function duplicateView(state, viewId) {
    const source = getView(state, viewId);
    if (!source || source.kind === 'main') return null;
    const subPage = getSubPage(state, source.subPageId);
    if (!subPage) return null;
    rememberUndo(state, '复制页面');
    const id = nextId(state, 'view');
    const copied = clone(source);
    copied.id = id;
    copied.title = `${source.title} 副本`;
    copied.subPageId = subPage.id;
    copied.baseMainViewId = subPage.mainViewId;
    state.views[id] = copied;
    state.elements[id] = viewElements(state, viewId).map((sourceElement) => {
      const element = clone(sourceElement);
      element.id = nextId(state, 'element');
      return element;
    });
    const index = subPage.viewOrder.indexOf(viewId);
    subPage.viewOrder.splice(index + 1, 0, id);
    activateView(state, id);
    return id;
  }

  function clearCrossSubPageRelations(state, movedViewId, sourceSubPageId, targetSubPageId) {
    if (sourceSubPageId === targetSubPageId) return 0;
    let changed = 0;
    for (const item of allElements(state)) {
      if (!item.targetView) continue;
      const sourceView = getView(state, item.viewId);
      const targetView = getView(state, item.targetView);
      if (!sourceView || !targetView) continue;
      const relationTouchesMove = item.viewId === movedViewId || item.targetView === movedViewId;
      if (!relationTouchesMove || sourceView.subPageId === targetView.subPageId) continue;
      const found = findElement(state, item.id);
      if (!found) continue;
      found.element.brokenTargetTitle = targetView.title;
      found.element.targetView = null;
      found.element.eventType = 'none';
      changed += 1;
    }
    return changed;
  }

  function canMoveViewToSubPage(state, viewId, targetSubPageId) {
    const view = getView(state, viewId);
    const source = view ? getSubPage(state, view.subPageId) : null;
    const target = getSubPage(state, targetSubPageId);
    if (!view || view.kind === 'main' || !source || !target) return false;
    return source.kind === 'managed' && target.kind === 'managed' && source.templateId === target.templateId;
  }

  function moveView(state, viewId, targetSubPageId, targetIndex) {
    if (!canMoveViewToSubPage(state, viewId, targetSubPageId)) return null;
    const view = getView(state, viewId);
    const sourceSubPage = getSubPage(state, view.subPageId);
    const targetSubPage = getSubPage(state, targetSubPageId);
    const sourceIndex = sourceSubPage.viewOrder.indexOf(viewId);
    rememberUndo(state, '移动页面');
    sourceSubPage.viewOrder.splice(sourceIndex, 1);
    let insertIndex = Math.max(1, Math.min(Number(targetIndex), targetSubPage.viewOrder.length));
    if (sourceSubPage.id === targetSubPage.id && sourceIndex < insertIndex) insertIndex -= 1;
    targetSubPage.viewOrder.splice(insertIndex, 0, viewId);
    const sourceSubPageId = view.subPageId;
    view.subPageId = targetSubPageId;
    if (view.kind === 'dialog') view.baseMainViewId = targetSubPage.mainViewId;
    const changedRelations = clearCrossSubPageRelations(state, viewId, sourceSubPageId, targetSubPageId);
    activateView(state, viewId);
    return { view, changedRelations, backgroundChanged: view.kind === 'dialog' && sourceSubPageId !== targetSubPageId };
  }

  function deleteView(state, viewId) {
    const view = getView(state, viewId);
    if (!view || view.kind === 'main') return null;
    const subPage = getSubPage(state, view.subPageId);
    if (!subPage) return null;
    rememberUndo(state, '删除页面');
    const index = subPage.viewOrder.indexOf(viewId);
    for (const item of allElements(state)) {
      if (item.targetView !== viewId) continue;
      const found = findElement(state, item.id);
      if (!found) continue;
      found.element.brokenTargetTitle = view.title;
      found.element.targetView = null;
      found.element.eventType = 'none';
    }
    state.deletedRecord = { title: view.title };
    delete state.views[viewId];
    delete state.elements[viewId];
    subPage.viewOrder.splice(index, 1);
    activateView(state, subPage.mainViewId);
    return view;
  }

  function addComponent(state, kind) {
    const view = getView(state, state.currentViewId);
    const subPage = view ? getSubPage(state, view.subPageId) : null;
    if (!view || !subPage) return null;
    const id = nextId(state, 'element');
    let element;
    if (kind === 'jump-button') {
      element = { id, label: '页面跳转按钮', type: '按钮', role: 'navigation', eventType: 'none', targetView: null };
    } else if (kind === 'button') {
      element = { id, label: '新按钮', type: '按钮', role: 'normal', eventType: 'none', targetView: null };
    } else if (kind === 'image') {
      element = { id, label: '新图片', type: '图片' };
    } else {
      element = { id, label: '新文本', type: '文本' };
    }
    state.elements[view.id].push(element);
    state.selectedElementId = id;
    return id;
  }

  function selectElement(state, elementId) {
    const found = findElement(state, elementId);
    if (!found) return false;
    activateView(state, found.viewId);
    state.selectedElementId = elementId;
    return true;
  }

  function configureButtonEvent(state, elementId, targetViewId) {
    const found = findElement(state, elementId);
    const target = getView(state, targetViewId);
    if (!found || found.element.type !== '按钮' || !target) return false;
    const sourceSubPage = getSubPage(state, found.view.subPageId);
    if (!sourceSubPage || target.subPageId !== sourceSubPage.id) return false;
    found.element.targetView = targetViewId;
    found.element.eventType = target.kind === 'dialog' ? 'openDialog' : 'jump';
    delete found.element.brokenTargetTitle;
    return true;
  }

  function clearButtonEvent(state, elementId) {
    const found = findElement(state, elementId);
    if (!found || found.element.type !== '按钮' || found.element.role === 'close') return false;
    found.element.targetView = null;
    found.element.eventType = 'none';
    delete found.element.brokenTargetTitle;
    return true;
  }

  function relationForElement(state, elementId) {
    const found = findElement(state, elementId);
    if (!found || found.element.type !== '按钮') return null;
    const element = found.element;
    if (element.role === 'close') return { status: 'ok', text: '点击后关闭当前弹窗。' };
    if (element.brokenTargetTitle) return { status: 'pending', text: `原来指向“${element.brokenTargetTitle}”，页面移动后需要重新配置。` };
    if (!element.targetView) return { status: element.role === 'navigation' ? 'pending' : 'empty', text: '当前按钮还没有配置点击事件。' };
    const target = getView(state, element.targetView);
    if (!target) return { status: 'pending', text: '原目标已经不存在，请重新选择。' };
    return {
      status: 'ok',
      text: target.kind === 'dialog' ? `点击后打开弹窗：${target.title}` : `点击后跳转页面：${target.title}`,
    };
  }

  function relationsForView(state, viewId) {
    const relations = viewElements(state, viewId)
      .filter((element) => element.type === '按钮')
      .map((element) => relationForElement(state, element.id))
      .filter((relation) => relation && relation.status !== 'empty');
    const view = getView(state, viewId);
    if (view?.kind === 'dialog' && inboundButtons(state, viewId).length === 0) {
      relations.unshift({ status: 'pending', text: `${view.title}还没有配置打开入口。` });
    }
    return relations;
  }

  function bindDialogTrigger(state, dialogViewId, elementId) {
    const dialog = getView(state, dialogViewId);
    const found = findElement(state, elementId);
    if (!dialog || dialog.kind !== 'dialog' || !found || found.element.type !== '按钮') return false;
    if (found.view.subPageId !== dialog.subPageId || found.element.role === 'close') return false;
    found.element.eventType = 'openDialog';
    found.element.targetView = dialogViewId;
    delete found.element.brokenTargetTitle;
    state.bindingDialogId = null;
    return true;
  }

  function startRun(state) {
    const subPage = getActiveSubPage(state);
    if (!subPage) return false;
    state.mode = 'run';
    state.runViewId = state.currentViewId || subPage.mainViewId;
    state.runDialogId = null;
    state.bindingDialogId = null;
    state.selectedElementId = null;
    return true;
  }

  function stopRun(state) {
    state.mode = 'edit';
    state.runDialogId = null;
    state.bindingDialogId = null;
    return true;
  }

  function runClickElement(state, elementId) {
    const found = findElement(state, elementId);
    if (!found || found.element.type !== '按钮') return { ok: false, reason: 'not-button' };
    const element = found.element;
    if (element.eventType === 'closeDialog') {
      state.runDialogId = null;
      return { ok: true, action: 'close' };
    }
    const target = getView(state, element.targetView);
    if (!target) return { ok: false, reason: 'unbound' };
    if (element.eventType === 'openDialog' || target.kind === 'dialog') {
      state.runDialogId = target.id;
      return { ok: true, action: 'open-dialog', target };
    }
    state.runViewId = target.id;
    state.runDialogId = null;
    return { ok: true, action: 'jump', target };
  }

  window.PhaseOneCore = {
    SCHEMA_VERSION,
    INTERNAL_TEMPLATE_ID,
    SCHEME_LABELS,
    clone,
    baseState,
    load,
    save,
    undo,
    rememberUndo,
    getStage,
    getSubPage,
    getView,
    getActiveSubPage,
    getStageForSubPage,
    subPageNumber,
    subPageLabel,
    activateSubPage,
    activateView,
    createInitialManaged,
    createLargeStage,
    addSubPage,
    moveSubPage,
    viewElements,
    subPageElements,
    allElements,
    findElement,
    inboundButtons,
    pendingIssues,
    addView,
    renameView,
    duplicateView,
    canMoveViewToSubPage,
    moveView,
    deleteView,
    addComponent,
    selectElement,
    configureButtonEvent,
    clearButtonEvent,
    relationForElement,
    relationsForView,
    bindDialogTrigger,
    startRun,
    stopRun,
    runClickElement,
  };
})();
