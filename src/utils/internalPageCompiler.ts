import type { Action, Course, Element, SubPage } from '../types';
import { isInternalPagesSubPage, isPageAction } from './internalPages';

const BLACK_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function colorPixel(color: string | undefined): string {
  if (!color || color.toLowerCase() === '#000000' || typeof document === 'undefined') return BLACK_PIXEL;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return BLACK_PIXEL;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return canvas.toDataURL('image/png');
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function clonePageElements(pageId: string, elements: Element[], initialVisible: boolean): Element[] {
  const cloned: Element[] = JSON.parse(JSON.stringify(elements));
  const rootId = `__iprootnode_${safeId(pageId)}`;
  const rootVar = `__iproot_${safeId(pageId)}`;
  const root: Element = {
    id: rootId,
    type: 'Box',
    layaType: 'Box',
    name: rootVar,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    rotation: 0,
    opacity: 1,
    actions: [],
    props: {
      visible: initialVisible,
      var: rootVar,
      mouseThrough: true,
      __internalPageId: pageId,
      __internalPageRootVar: rootVar,
    },
  };
  for (const element of cloned) {
    if (!element.parentId) element.parentId = rootId;
    element.props = { ...element.props, __internalPageId: pageId };
  }
  return [root, ...cloned];
}

/** 把内部页面变为同一场景中的持久根节点集合；编辑器数据本身不改变。 */
export function compileInternalSubPage(subPage: SubPage): SubPage {
  if (!isInternalPagesSubPage(subPage)) return subPage;
  const flattened: Element[] = [];
  flattened.push(...clonePageElements(subPage.id, subPage.elements, true));
  for (const page of subPage.internalPages) {
    const pageElements: Element[] = [];
    if (page.kind === 'dialog') {
      const maskId = `__ipmask_${safeId(page.id)}`;
      const maskAction: Action[] = page.dialogSettings?.closeOnMask
        ? [{ id: `${maskId}_close`, event: 'onClick', actionType: 'closeInternalDialog' }]
        : [];
      pageElements.push({
        id: maskId,
        type: 'NewImage',
        layaType: 'Image',
        name: `__ipmask_${safeId(page.id)}`,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        opacity: page.dialogSettings?.maskOpacity ?? 0.55,
        actions: maskAction,
        props: {
          skin: colorPixel(page.dialogSettings?.maskColor),
          sizeGrid: '1,1,1,1',
          // 无论是否允许点击遮罩关闭，都要拦截底板点击，避免弹窗期间触发主界面动作。
          mouseEnabled: true,
          mouseThrough: false,
        },
      });
    }
    pageElements.push(...page.elements);
    flattened.push(...clonePageElements(page.id, pageElements, false));
  }
  return {
    ...subPage,
    elements: flattened,
    // 编译后只保留页面清单，避免资源重复扫描，同时让空白页面也能参与运行时切换。
    internalPages: subPage.internalPages.map((page) => ({ ...page, elements: [] })),
  };
}

export function compileInternalPagesCourse(course: Course): Course {
  const cloned = structuredClone(course) as Course;
  cloned.stages = cloned.stages.map((stage) => ({ ...stage, subPages: stage.subPages.map(compileInternalSubPage) }));
  cloned.previewStages = cloned.previewStages?.map((stage) => ({ ...stage, subPages: stage.subPages.map(compileInternalSubPage) }));
  return cloned;
}

function pageIdOf(element: Element): string | undefined {
  return typeof element.props.__internalPageId === 'string' ? element.props.__internalPageId : undefined;
}

function rootVars(page: SubPage): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const element of page.elements) {
    const pageId = pageIdOf(element);
    const rootVar = element.props.__internalPageRootVar;
    if (!pageId || typeof rootVar !== 'string') continue;
    if (!map.has(pageId)) map.set(pageId, []);
    map.get(pageId)!.push(rootVar);
  }
  return map;
}

export type ExportActionBuilder = (action: Action, elementRef: string, page: SubPage, source?: Element) => string;

export function internalPageActionBody(action: Action): string {
  if (action.actionType === 'navigateInternalPage' && action.pageTargetId) {
    return `this.__forgeShowContent(${JSON.stringify(action.pageTargetId)});`;
  }
  if (action.actionType === 'openInternalDialog' && action.pageTargetId) {
    return `this.__forgeOpenDialog(${JSON.stringify(action.pageTargetId)});`;
  }
  if (action.actionType === 'closeInternalDialog') {
    if (action.afterClose) {
      return `this.__forgeCloseDialog(${JSON.stringify(action.afterClose.type)}, ${JSON.stringify(action.afterClose.pageTargetId)});`;
    }
    return 'this.__forgeCloseDialog();';
  }
  return '';
}

/** 生成持久页面切换、首次加载动作和初始主界面进入逻辑。 */
export function buildInternalPageRuntime(
  page: SubPage,
  getVar: (element: Element) => string,
  buildActionBody: ExportActionBuilder,
): { initCode: string; methodsCode: string } {
  if (page.editorModel !== 'internal-pages') return { initCode: '', methodsCode: '' };
  const roots = rootVars(page);
  const pageIds = [page.id, ...(page.internalPages ?? []).map((item) => item.id)];
  for (const pageId of roots.keys()) if (!pageIds.includes(pageId)) pageIds.push(pageId);
  const rootRecord = Object.fromEntries(pageIds.map((id) => [id, roots.get(id) ?? []]));
  const loadCases: string[] = [];
  for (const pageId of pageIds) {
    const normalBodies: string[] = [];
    const pageBodies: string[] = [];
    for (const element of page.elements.filter((item) => pageIdOf(item) === pageId)) {
      const ref = `this.${getVar(element)}`;
      const actions = (element.actions ?? []).filter((action) => action.event === 'onLoad');
      for (const action of actions) {
        const actionBody = buildActionBody(action, ref, page, element);
        if (!actionBody) continue;
        (isPageAction(action) ? pageBodies : normalBodies).push(actionBody);
      }
    }
    loadCases.push(`            case ${JSON.stringify(pageId)}: ${[...normalBodies, ...pageBodies].join(' ')} break;`);
  }
  const initCode = `        this.__forgePageRoots = ${JSON.stringify(rootRecord)};\n        this.__forgeUnderlyingPage = ${JSON.stringify(page.id)};\n        this.__forgeApplyPageVisibility(${JSON.stringify(page.id)}, null);\n        this.__forgeRunFirstLoad(${JSON.stringify(page.id)});\n`;
  const methodsCode = `
    private __forgePageRoots: any = {};
    private __forgeLoadedPages: any = {};
    private __forgeUnderlyingPage: string = ${JSON.stringify(page.id)};

    private __forgeApplyPageVisibility(contentPageId: string, dialogPageId: string | null): void {
        for (let pageId in this.__forgePageRoots) {
            let visible = dialogPageId ? (pageId === ${JSON.stringify(page.id)} || pageId === dialogPageId) : pageId === contentPageId;
            let vars = this.__forgePageRoots[pageId] || [];
            for (let i = 0; i < vars.length; i++) {
                let node: any = (this as any)[vars[i]];
                if (node) node.visible = visible;
            }
        }
    }

    private __forgeRunFirstLoad(pageId: string): void {
        if (this.__forgeLoadedPages[pageId]) return;
        this.__forgeLoadedPages[pageId] = true;
        switch (pageId) {
${loadCases.join('\n')}
        }
    }

    private __forgeShowContent(pageId: string): void {
        this.__forgeUnderlyingPage = pageId;
        this.__forgeApplyPageVisibility(pageId, null);
        this.__forgeRunFirstLoad(pageId);
    }

    private __forgeOpenDialog(pageId: string): void {
        this.__forgeApplyPageVisibility(${JSON.stringify(page.id)}, pageId);
        this.__forgeRunFirstLoad(pageId);
    }

    private __forgeCloseDialog(afterType?: string, targetPageId?: string): void {
        if (afterType === 'navigate' && targetPageId) { this.__forgeShowContent(targetPageId); return; }
        if (afterType === 'openDialog' && targetPageId) { this.__forgeOpenDialog(targetPageId); return; }
        this.__forgeShowContent(this.__forgeUnderlyingPage || ${JSON.stringify(page.id)});
    }
`;
  return { initCode, methodsCode };
}

/** 作业和真实预习为内部页面补齐普通点击动作，并保证页面动作最后执行。 */
export function buildInternalPageActionBindings(
  page: SubPage,
  getVar: (element: Element) => string,
  buildActionBody: ExportActionBuilder,
  uiNamespace: string,
): string {
  if (page.editorModel !== 'internal-pages') return '';
  let code = '';
  for (const element of page.elements) {
    const ref = `this.${getVar(element)}`;
    for (const event of ['onClick', 'onClickSound']) {
      const actions = (element.actions ?? [])
        .filter((action) => action.event === event)
        .sort((left, right) => Number(isPageAction(left)) - Number(isPageAction(right)));
      const bodies = actions.map((action) => buildActionBody(action, ref, page, element)).filter(Boolean);
      if (bodies.length === 0) continue;
      const sound = event === 'onClickSound' ? `this.playSound("${uiNamespace}/sound/btn_click.wav"); ` : '';
      code += `        if (${ref}) ${ref}.on('click', this, function() { ${sound}${bodies.join(' ')} });\n`;
    }
  }
  return code;
}
