import test from 'node:test';
import assert from 'node:assert/strict';
import type { Action, Course, Element, InternalPage, SubPage } from '../src/types/index';
import {
  analyzeInternalPageMove,
  cloneSubPageWithNewIds,
  collectInternalPageIssues,
  createInternalPagesSubPage,
  findCanvasElementPage,
  getElementPages,
  isInternalPagesSubPage,
  visitCourseElementPages,
} from '../src/utils/internalPages';
import {
  buildInternalPageActionBindings,
  buildInternalPageRuntime,
  compileInternalSubPage,
  internalPageActionBody,
} from '../src/utils/internalPageCompiler';
import { collectSubPageResourceRefs, customTemplateModel, rewriteSubPageResources } from '../src/utils/customTemplateFs';

let sequence = 0;
const makeId = (prefix: string) => `${prefix}-new-${++sequence}`;

function element(id: string, actions: Action[] = [], props: Record<string, unknown> = {}): Element {
  return {
    id,
    type: 'ScaleButton',
    layaType: 'Button',
    name: id,
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    opacity: 1,
    actions,
    props,
  };
}

function internalCourse(subPage: SubPage): Course {
  return { id: 'course', kind: 'normal', stages: [{ id: 'stage', name: '关卡 1', subPages: [subPage] }] };
}

test('创建内部页面模板时只给新模板写入能力字段', () => {
  const page = createInternalPagesSubPage('sub', '小关卡 1-1');
  assert.equal(page.editorModel, 'internal-pages');
  assert.equal(page.templateId, 'internal-pages-v1');
  assert.equal(page.schemaVersion, 1);
  assert.deepEqual(page.internalPages, []);
  assert.deepEqual(page.internalPageGroups, []);
  assert.equal(isInternalPagesSubPage(page), true);
  assert.equal(isInternalPagesSubPage({ id: 'legacy', name: '旧页面', elements: [] }), false);
});

test('弹窗编辑画布按底板、遮罩、弹窗内容合成，并保持合成层不可交互', () => {
  const subPage = createInternalPagesSubPage('sub-canvas', '小关卡');
  subPage.elements = [element('main-background', [{ id: 'main-action', event: 'onClick', actionType: 'toggleVisible' }])];
  subPage.internalPages = [{
    id: 'dialog-canvas',
    name: '提示弹窗',
    kind: 'dialog',
    elements: [element('dialog-content')],
    dialogSettings: { maskColor: '#123456', maskOpacity: 0.4, closeOnMask: false },
  }];

  const canvasPage = findCanvasElementPage(internalCourse(subPage), subPage.id, 'dialog-canvas');
  assert.deepEqual(canvasPage?.elements.map((item) => item.id), [
    '__dialog-base__main-background',
    '__dialog-mask__dialog-canvas',
    'dialog-content',
  ]);
  const base = canvasPage?.elements[0];
  const mask = canvasPage?.elements[1];
  assert.equal(base?.locked, true);
  assert.deepEqual(base?.actions, []);
  assert.equal(base?.props.__editorCanvasHitThrough, true);
  assert.equal(mask?.type, 'DialogEditorMask');
  assert.equal(mask?.width, 1920);
  assert.equal(mask?.height, 1080);
  assert.equal(mask?.opacity, 0.4);
  assert.equal(mask?.props.__editorCanvasFillColor, '#123456');
  assert.equal(mask?.props.__editorCanvasHitThrough, true);
  assert.deepEqual(getElementPages(subPage)[1].elements.map((item) => item.id), ['dialog-content']);
});

test('弹窗编辑画布在旧数据缺少遮罩设置时使用黑色 55% 默认值', () => {
  const subPage = createInternalPagesSubPage('sub-default-mask', '小关卡');
  subPage.internalPages = [{ id: 'dialog-default', name: '默认弹窗', kind: 'dialog', elements: [] }];
  const canvasPage = findCanvasElementPage(internalCourse(subPage), subPage.id, 'dialog-default');
  const mask = canvasPage?.elements.find((item) => item.id === '__dialog-mask__dialog-default');
  assert.equal(mask?.opacity, 0.55);
  assert.equal(mask?.props.__editorCanvasFillColor, '#000000');
});

test('复制完整小关卡会重建页面、元素、动作及分组 ID，并维持内部关系', () => {
  const source = createInternalPagesSubPage('sub-old', '小关卡');
  source.internalPageGroups = [{ id: 'page-group-old', name: '第一题' }];
  const content: InternalPage = {
    id: 'content-old',
    name: '内容页',
    kind: 'content',
    pageGroupId: 'page-group-old',
    elements: [element('content-el', [{ id: 'action-content', event: 'onClick', actionType: 'toggleVisible', targetId: 'main-el', groupId: 'group-old', branchId: 'branch-old' }])],
  };
  source.elements = [element('main-el', [{ id: 'action-main', event: 'onClick', actionType: 'navigateInternalPage', pageTargetId: content.id, pageTargetNameSnapshot: content.name, groupId: 'group-old' }])];
  source.internalPages = [content];

  const cloned = cloneSubPageWithNewIds(source, makeId);
  assert.notEqual(cloned.id, source.id);
  assert.notEqual(cloned.internalPages?.[0].id, content.id);
  assert.notEqual(cloned.internalPageGroups?.[0].id, source.internalPageGroups[0].id);
  assert.equal(cloned.internalPages?.[0].pageGroupId, cloned.internalPageGroups?.[0].id);
  assert.notEqual(cloned.elements[0].id, source.elements[0].id);
  assert.notEqual(cloned.elements[0].actions?.[0].id, source.elements[0].actions?.[0].id);
  assert.equal(cloned.elements[0].actions?.[0].pageTargetId, cloned.internalPages?.[0].id);
  assert.equal(cloned.internalPages?.[0].elements[0].actions?.[0].targetId, cloned.elements[0].id);
  assert.notEqual(cloned.elements[0].actions?.[0].groupId, 'group-old');
  assert.equal(cloned.elements[0].actions?.[0].groupId, cloned.internalPages?.[0].elements[0].actions?.[0].groupId);
  assert.notEqual(cloned.internalPages?.[0].elements[0].actions?.[0].branchId, 'branch-old');
});

test('编译内部页面时剥离编辑器页面分组但保持页面类型与顺序', () => {
  const source = createInternalPagesSubPage('sub-grouped', '小关卡');
  source.internalPageGroups = [{ id: 'page-group', name: '第一题' }];
  source.internalPages = [
    { id: 'content', name: '讲解', kind: 'content', pageGroupId: 'page-group', elements: [] },
    { id: 'dialog', name: '提示', kind: 'dialog', pageGroupId: 'page-group', elements: [], dialogSettings: { maskColor: '#000000', maskOpacity: 0.5, closeOnMask: true } },
  ];

  const compiled = compileInternalSubPage(source);
  assert.equal(compiled.internalPageGroups, undefined);
  assert.deepEqual(compiled.internalPages?.map((page) => page.id), ['content', 'dialog']);
  assert.equal(compiled.internalPages?.some((page) => page.pageGroupId !== undefined), false);
  assert.equal(compiled.internalPages?.[1].kind, 'dialog');
});

test('删除目标后保留断链，发布校验会阻断而不会静默清除', () => {
  const subPage = createInternalPagesSubPage('sub', '小关卡');
  const target: InternalPage = { id: 'content', name: '讲解页', kind: 'content', elements: [] };
  subPage.internalPages = [target];
  subPage.elements = [element('button', [{ id: 'action', event: 'onClick', actionType: 'navigateInternalPage', pageTargetId: target.id, pageTargetNameSnapshot: target.name }])];
  assert.equal(collectInternalPageIssues(internalCourse(subPage)).some((issue) => issue.code === 'missing-target'), false);
  subPage.internalPages.splice(0, 1);
  const issue = collectInternalPageIssues(internalCourse(subPage)).find((item) => item.code === 'missing-target');
  assert.equal(issue?.severity, 'blocking');
  assert.match(issue?.message ?? '', /讲解页/);
  assert.equal(subPage.elements[0].actions?.[0].pageTargetId, 'content');
});

test('弹窗关闭出口、无入口提醒、目标类型与单击页面动作数量按分级规则校验', () => {
  const subPage = createInternalPagesSubPage('sub', '小关卡');
  const content: InternalPage = { id: 'content', name: '内容页', kind: 'content', elements: [] };
  const dialog: InternalPage = { id: 'dialog', name: '提示弹窗', kind: 'dialog', elements: [], dialogSettings: { maskColor: '#000000', maskOpacity: 0.5, closeOnMask: false } };
  subPage.internalPages = [content, dialog];
  subPage.elements = [element('button', [
    { id: 'a1', event: 'onClick', actionType: 'navigateInternalPage', pageTargetId: content.id },
    { id: 'a2', event: 'onClickSound', actionType: 'openInternalDialog', pageTargetId: dialog.id },
  ])];
  let issues = collectInternalPageIssues(internalCourse(subPage));
  assert.ok(issues.some((issue) => issue.code === 'multiple-page-actions' && issue.severity === 'blocking'));
  assert.ok(issues.some((issue) => issue.code === 'no-close-entry' && issue.severity === 'blocking'));
  subPage.elements[0].actions = [{ id: 'open', event: 'onClick', actionType: 'openInternalDialog', pageTargetId: dialog.id }];
  dialog.elements.push(element('close', [{ id: 'close-action', event: 'onClick', actionType: 'closeInternalDialog' }]));
  issues = collectInternalPageIssues(internalCourse(subPage));
  assert.ok(issues.some((issue) => issue.code === 'no-entry' && issue.severity === 'warning'));
  assert.equal(issues.some((issue) => issue.code === 'no-close-entry'), false);
});

test('跨小关卡移动预检会统计双向断链、弹窗底板和同名处理', () => {
  const source = createInternalPagesSubPage('source', '来源');
  const moving: InternalPage = {
    id: 'dialog',
    name: '提示',
    kind: 'dialog',
    elements: [element('inside', [{ id: 'to-source-main', event: 'onClick', actionType: 'closeInternalDialog', afterClose: { type: 'navigate', pageTargetId: source.id } }])],
  };
  source.internalPages = [moving];
  source.elements = [element('open', [{ id: 'to-dialog', event: 'onClick', actionType: 'openInternalDialog', pageTargetId: moving.id }])];
  const target = createInternalPagesSubPage('target', '目标');
  target.internalPages = [{ id: 'same-name', name: '提示', kind: 'dialog', elements: [] }];
  const impact = analyzeInternalPageMove(source, target, moving.id);
  assert.equal(impact?.invalidRelationCount, 2);
  assert.equal(impact?.changesDialogBase, true);
  assert.equal(impact?.nameCollision, true);
  assert.match(impact?.resolvedName ?? '', /移入/);
});

test('共享编译器把内部页编译为持久根节点，并保留空白页面清单', () => {
  const subPage = createInternalPagesSubPage('sub', '小关卡');
  subPage.elements = [element('main')];
  subPage.internalPages = [
    { id: 'empty-content', name: '空白内容页', kind: 'content', elements: [] },
    { id: 'dialog', name: '弹窗', kind: 'dialog', elements: [element('dialog-button')], dialogSettings: { maskColor: '#123456', maskOpacity: 0.45, closeOnMask: true } },
  ];
  const compiled = compileInternalSubPage(subPage);
  assert.equal(compiled.internalPages?.length, 2);
  assert.equal(compiled.internalPages?.every((page) => page.elements.length === 0), true);
  const mask = compiled.elements.find((item) => item.id.startsWith('__ipmask_'));
  assert.equal(mask?.width, 1920);
  assert.equal(mask?.height, 1080);
  assert.equal(typeof mask?.props.skin, 'string');
  assert.equal(mask?.props.sizeGrid, undefined);
  assert.equal(mask?.props.mouseEnabled, true);
  assert.equal(mask?.props.mouseThrough, false);
  assert.equal(compiled.elements.find((item) => item.props.__internalPageId === subPage.id && item.props.__internalPageRootVar)?.props.visible, true);
  assert.equal(compiled.elements.find((item) => item.props.__internalPageId === 'dialog' && item.props.__internalPageRootVar)?.props.visible, false);
  assert.equal(compiled.elements.find((item) => item.id === 'main')?.props.visible, undefined);
  assert.equal(compiled.elements.find((item) => item.id === 'dialog-button')?.props.visible, undefined);

  const getVar = (item: Element) => String(item.props.__internalPageRootVar ?? item.name);
  const runtime = buildInternalPageRuntime(compiled, getVar, (action) => internalPageActionBody(action));
  assert.match(runtime.initCode, /__forgeApplyPageVisibility/);
  assert.match(runtime.methodsCode, /empty-content/);
  assert.match(runtime.methodsCode, /__forgeOpenDialog/);
});

test('页面切换只控制持久容器，不覆盖元素自身的显隐状态', () => {
  const subPage = createInternalPagesSubPage('visibility-sub', '显隐状态');
  subPage.elements.push(element('main-hidden', [], { visible: false }));
  subPage.internalPages!.push({
    id: 'content-hidden',
    name: '隐藏内容',
    kind: 'content',
    elements: [element('content-hidden-element', [], { visible: false })],
  });

  const compiled = compileInternalSubPage(subPage);
  const mainRoot = compiled.elements.find((element) => element.props.__internalPageRootVar && element.props.__internalPageId === subPage.id);
  const contentRoot = compiled.elements.find((element) => element.props.__internalPageRootVar && element.props.__internalPageId === 'content-hidden');
  const mainHidden = compiled.elements.find((element) => element.id === 'main-hidden');
  const contentHidden = compiled.elements.find((element) => element.id === 'content-hidden-element');

  assert.equal(mainRoot?.props.visible, true);
  assert.equal(contentRoot?.props.visible, false);
  assert.equal(mainHidden?.props.visible, false);
  assert.equal(contentHidden?.props.visible, false);
  assert.equal(mainHidden?.parentId, mainRoot?.id);
  assert.equal(contentHidden?.parentId, contentRoot?.id);
});

test('作业和预习的点击绑定先执行普通动作，再执行唯一页面动作', () => {
  const subPage = createInternalPagesSubPage('sub', '小关卡');
  subPage.internalPages = [{ id: 'content', name: '内容页', kind: 'content', elements: [] }];
  const button = element('button', [
    { id: 'normal', event: 'onClick', actionType: 'setVisible', value: false },
    { id: 'page', event: 'onClick', actionType: 'navigateInternalPage', pageTargetId: 'content' },
  ]);
  subPage.elements = [button];
  const compiled = compileInternalSubPage(subPage);
  const code = buildInternalPageActionBindings(
    compiled,
    (item) => String(item.props.__internalPageRootVar ?? item.name),
    (action) => action.actionType === 'setVisible' ? '普通动作();' : internalPageActionBody(action),
    'game_hw',
  );
  assert.ok(code.indexOf('普通动作') < code.indexOf('__forgeShowContent'));
});

test('统一页面遍历同时覆盖正课、预习、主界面和内部页面', () => {
  const normal = createInternalPagesSubPage('normal', '正课');
  normal.internalPages = [{ id: 'normal-content', name: '内容页', kind: 'content', elements: [] }];
  const preview = createInternalPagesSubPage('preview', '预习');
  preview.internalPages = [{ id: 'preview-dialog', name: '弹窗', kind: 'dialog', elements: [] }];
  const course: Course = {
    id: 'course',
    stages: [{ id: 'normal-stage', name: '正课', subPages: [normal] }],
    previewStages: [{ id: 'preview-stage', name: '预习', subPages: [preview] }],
  };
  const visited: string[] = [];
  visitCourseElementPages(course, (page, _subPage, _stage, area) => visited.push(`${area}:${page.id}`));
  assert.deepEqual(visited, ['normal:normal', 'normal:normal-content', 'preview:preview', 'preview:preview-dialog']);
  assert.equal(getElementPages(normal).length, 2);
});

test('自定义模板双格式和资源扫描覆盖全部内部页面', () => {
  const subPage = createInternalPagesSubPage('sub', '小关卡');
  subPage.elements = [element('main-image', [], { skin: 'images/main.png' })];
  subPage.internalPages = [{
    id: 'content',
    name: '内容页',
    kind: 'content',
    elements: [element('media', [{ id: 'sound', event: 'onClick', actionType: 'playSound', value: 'images/sound/tip.mp3' }], { videoUrl: 'images/animation/demo.mp4', url: 'images/animation/ani1/demo.sk' })],
  }];
  const refs = collectSubPageResourceRefs(subPage);
  assert.deepEqual([...refs.images], ['images/main.png']);
  assert.deepEqual([...refs.videos], ['images/animation/demo.mp4']);
  assert.deepEqual([...refs.sounds], ['images/sound/tip.mp3']);
  assert.deepEqual([...refs.spineSkPaths], ['images/animation/ani1/demo.sk']);
  assert.equal(customTemplateModel(subPage), 'internal-pages-v1');
  assert.equal(customTemplateModel({ id: 'legacy', name: '旧模板', elements: [] }), 'legacy-elements');

  const rewritten = rewriteSubPageResources(subPage, new Map([
    ['images/main.png', 'images/main-new.png'],
    ['images/animation/demo.mp4', 'images/animation/demo-new.mp4'],
    ['images/sound/tip.mp3', 'images/sound/tip-new.mp3'],
  ]));
  assert.equal(rewritten.elements[0].props.skin, 'images/main-new.png');
  assert.equal(rewritten.internalPages?.[0].elements[0].props.videoUrl, 'images/animation/demo-new.mp4');
  assert.equal(rewritten.internalPages?.[0].elements[0].actions?.[0].value, 'images/sound/tip-new.mp3');
});
