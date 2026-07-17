import type { Action, Course, Element, InternalPage, InternalPageGroup, InternalPageKind, Stage, SubPage } from '../types';
import { findSubPage } from './findSubPage';
import { EDITOR_CANVAS_FILL_COLOR_PROP, EDITOR_CANVAS_HIT_THROUGH_PROP } from './canvasComposite';

export const INTERNAL_PAGES_TEMPLATE_ID = 'internal-pages-v1' as const;
export const INTERNAL_PAGES_MIN_VERSION = '1.1.0';
export const INTERNAL_PAGE_LIMIT = 12;
export const INTERNAL_ELEMENT_LIMIT = 300;

export type ElementPageRef = {
  id: string;
  name: string;
  kind: 'main' | InternalPageKind;
  elements: Element[];
  internalPage?: InternalPage;
};

export function isInternalPagesSubPage(subPage: SubPage | null | undefined): subPage is SubPage & {
  editorModel: 'internal-pages';
  templateId: 'internal-pages-v1';
  schemaVersion: 1;
  internalPages: InternalPage[];
} {
  return !!subPage
    && subPage.editorModel === 'internal-pages'
    && subPage.templateId === INTERNAL_PAGES_TEMPLATE_ID
    && subPage.schemaVersion === 1
    && Array.isArray(subPage.internalPages);
}

export function isInternalPagesWorkbenchReadonly(
  course: Course | null | undefined,
  subPageId: string | null | undefined,
  focusSubPageId: string | null | undefined,
): boolean {
  if (focusSubPageId) return false;
  return isInternalPagesSubPage(findSubPage(course ?? null, subPageId ?? null));
}

export function createInternalPagesSubPage(id: string, name: string): SubPage {
  return {
    id,
    name,
    elements: [],
    editorModel: 'internal-pages',
    templateId: INTERNAL_PAGES_TEMPLATE_ID,
    schemaVersion: 1,
    internalPages: [],
    internalPageGroups: [],
  };
}

export function getInternalPageGroups(subPage: SubPage): InternalPageGroup[] {
  return isInternalPagesSubPage(subPage) && Array.isArray(subPage.internalPageGroups)
    ? subPage.internalPageGroups
    : [];
}

export function validInternalPageGroupId(subPage: SubPage, requested: string | null | undefined): string | undefined {
  if (!requested) return undefined;
  return getInternalPageGroups(subPage).some((group) => group.id === requested) ? requested : undefined;
}

export function getElementPages(subPage: SubPage): ElementPageRef[] {
  const pages: ElementPageRef[] = [{ id: subPage.id, name: '主界面', kind: 'main', elements: subPage.elements }];
  if (isInternalPagesSubPage(subPage)) {
    for (const page of subPage.internalPages) {
      pages.push({ id: page.id, name: page.name, kind: page.kind, elements: page.elements, internalPage: page });
    }
  }
  return pages;
}

export function getElementPage(subPage: SubPage, pageId: string | null | undefined): ElementPageRef {
  if (!pageId || pageId === subPage.id || !isInternalPagesSubPage(subPage)) return getElementPages(subPage)[0];
  return getElementPages(subPage).find((page) => page.id === pageId) ?? getElementPages(subPage)[0];
}

export function findActiveElementPage(
  course: Course | null | undefined,
  subPageId: string | null | undefined,
  internalPageId: string | null | undefined,
): (ElementPageRef & { frozen?: boolean }) | null {
  const subPage = findSubPage(course ?? null, subPageId ?? null);
  if (!subPage) return null;
  const page = getElementPage(subPage, internalPageId);
  return { ...page, frozen: subPage.frozen };
}

/** 弹窗编辑态把主界面以只读、低亮副本放在弹窗元素下方，不写回课程数据。 */
export function findCanvasElementPage(
  course: Course | null | undefined,
  subPageId: string | null | undefined,
  internalPageId: string | null | undefined,
): (ElementPageRef & { frozen?: boolean }) | null {
  const active = findActiveElementPage(course, subPageId, internalPageId);
  const subPage = findSubPage(course ?? null, subPageId ?? null);
  if (!active || !subPage || active.kind !== 'dialog') return active;
  const idMap = new Map(subPage.elements.map((element) => [element.id, `__dialog-base__${element.id}`]));
  const base = subPage.elements.map((element) => ({
    ...JSON.parse(JSON.stringify(element)),
    id: idMap.get(element.id)!,
    parentId: element.parentId ? idMap.get(element.parentId) : undefined,
    locked: true,
    actions: [],
    opacity: element.opacity,
    props: {
      ...element.props,
      mouseEnabled: false,
      mouseThrough: true,
      [EDITOR_CANVAS_HIT_THROUGH_PROP]: true,
    },
  } as Element));
  const settings = active.internalPage?.dialogSettings;
  const mask: Element = {
    id: `__dialog-mask__${active.id}`,
    type: 'DialogEditorMask',
    layaType: 'Sprite',
    name: '__dialog_mask',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    rotation: 0,
    opacity: settings?.maskOpacity ?? 0.55,
    locked: true,
    actions: [],
    props: {
      [EDITOR_CANVAS_FILL_COLOR_PROP]: settings?.maskColor ?? '#000000',
      [EDITOR_CANVAS_HIT_THROUGH_PROP]: true,
      mouseEnabled: false,
      mouseThrough: true,
    },
  };
  return { ...active, elements: [...base, mask, ...active.elements] };
}

export function getAllElements(subPage: SubPage): Element[] {
  return getElementPages(subPage).flatMap((page) => page.elements);
}

export function visitCourseElementPages(
  course: Course,
  visitor: (page: ElementPageRef, subPage: SubPage, stage: Stage, area: 'normal' | 'preview') => void,
): void {
  const visit = (stages: Stage[], area: 'normal' | 'preview') => {
    for (const stage of stages) {
      for (const subPage of stage.subPages) {
        for (const page of getElementPages(subPage)) visitor(page, subPage, stage, area);
      }
    }
  };
  visit(course.stages, 'normal');
  visit(course.previewStages ?? [], 'preview');
}

function remapElements(
  elements: Element[],
  idMap: Map<string, string>,
  makeId: (prefix: string) => string,
  groupIdMap = new Map<string, string>(),
  branchIdMap = new Map<string, string>(),
): Element[] {
  const cloned: Element[] = JSON.parse(JSON.stringify(elements));
  for (const el of cloned) if (!idMap.has(el.id)) idMap.set(el.id, makeId('el'));
  for (const el of cloned) {
    el.id = idMap.get(el.id)!;
    if (el.parentId && idMap.has(el.parentId)) el.parentId = idMap.get(el.parentId);
    for (const action of el.actions ?? []) {
      action.id = makeId('action');
      if (action.groupId) {
        if (!groupIdMap.has(action.groupId)) groupIdMap.set(action.groupId, makeId('action-group'));
        action.groupId = groupIdMap.get(action.groupId);
      }
      if (action.branchId) {
        if (!branchIdMap.has(action.branchId)) branchIdMap.set(action.branchId, makeId('action-branch'));
        action.branchId = branchIdMap.get(action.branchId);
      }
      if (action.targetId && idMap.has(action.targetId)) action.targetId = idMap.get(action.targetId);
    }
  }
  return cloned;
}

function remapPageActions(elements: Element[], pageIdMap: Map<string, string>): void {
  for (const el of elements) {
    for (const action of el.actions ?? []) {
      if (action.pageTargetId && pageIdMap.has(action.pageTargetId)) {
        action.pageTargetId = pageIdMap.get(action.pageTargetId);
      }
      if (action.afterClose?.pageTargetId && pageIdMap.has(action.afterClose.pageTargetId)) {
        action.afterClose.pageTargetId = pageIdMap.get(action.afterClose.pageTargetId)!;
      }
    }
  }
}

/** 完整克隆小关卡，重建小关卡、内部页、元素与动作 ID，并保持模板内关系。 */
export function cloneSubPageWithNewIds(source: SubPage, makeId: (prefix: string) => string): SubPage {
  const newSubId = makeId('subpage');
  const elementIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  const branchIdMap = new Map<string, string>();
  const pageGroupIdMap = new Map<string, string>();
  const pageIdMap = new Map<string, string>([[source.id, newSubId]]);
  const internalPageGroups = isInternalPagesSubPage(source)
    ? getInternalPageGroups(source).map((group) => {
        const id = makeId('page-group');
        pageGroupIdMap.set(group.id, id);
        return { ...JSON.parse(JSON.stringify(group)), id } as InternalPageGroup;
      })
    : undefined;
  for (const page of getElementPages(source)) {
    for (const element of page.elements) elementIdMap.set(element.id, makeId('el'));
  }
  const internalPages = isInternalPagesSubPage(source)
    ? source.internalPages.map((page) => {
        const id = makeId('internal-page');
        pageIdMap.set(page.id, id);
        return {
          ...JSON.parse(JSON.stringify(page)),
          id,
          pageGroupId: page.pageGroupId ? pageGroupIdMap.get(page.pageGroupId) : undefined,
          elements: remapElements(page.elements, elementIdMap, makeId, groupIdMap, branchIdMap),
        } as InternalPage;
      })
    : undefined;
  const elements = remapElements(source.elements, elementIdMap, makeId, groupIdMap, branchIdMap);
  remapPageActions(elements, pageIdMap);
  for (const page of internalPages ?? []) remapPageActions(page.elements, pageIdMap);
  return {
    ...JSON.parse(JSON.stringify(source)),
    id: newSubId,
    elements,
    ...(internalPages ? { internalPages } : {}),
    ...(internalPageGroups ? { internalPageGroups } : {}),
  };
}

export function cloneInternalPageWithinSubPage(
  source: InternalPage,
  makeId: (prefix: string) => string,
): InternalPage {
  const newId = makeId('internal-page');
  const elements = remapElements(source.elements, new Map(), makeId);
  for (const el of elements) {
    for (const action of el.actions ?? []) {
      if (action.pageTargetId === source.id) action.pageTargetId = newId;
      if (action.afterClose?.pageTargetId === source.id) action.afterClose.pageTargetId = newId;
    }
  }
  return { ...JSON.parse(JSON.stringify(source)), id: newId, elements };
}

export type InternalPageIssue = {
  code: 'missing-target' | 'incompatible-target' | 'multiple-page-actions' | 'unsupported-course' | 'no-entry' | 'no-open-entry' | 'no-close-entry' | 'capacity';
  severity: 'blocking' | 'warning';
  subPageId: string;
  pageId?: string;
  elementId?: string;
  message: string;
};

const PAGE_ACTIONS = new Set(['navigateInternalPage', 'openInternalDialog', 'closeInternalDialog']);

function expectedKind(action: Action): 'content' | 'dialog' | null {
  if (action.actionType === 'navigateInternalPage') return 'content';
  if (action.actionType === 'openInternalDialog') return 'dialog';
  return null;
}

export function collectInternalPageIssues(course: Course): InternalPageIssue[] {
  const issues: InternalPageIssue[] = [];
  const allStages = [...course.stages, ...(course.previewStages ?? [])];
  for (const stage of allStages) {
    for (const subPage of stage.subPages) {
      if (!isInternalPagesSubPage(subPage)) continue;
      if (course.kind === 'review' || subPage.frozen) {
        issues.push({
          code: 'unsupported-course',
          severity: 'blocking',
          subPageId: subPage.id,
          message: `${subPage.name}属于复习课或视频关卡，不能使用内部页面`,
        });
      }
      const pages = getElementPages(subPage);
      const pageMap = new Map(pages.map((page) => [page.id, page]));
      const inbound = new Map<string, number>();
      const hasCloseByDialog = new Map<string, boolean>();
      for (const source of pages) {
        for (const element of source.elements) {
          const clickPageActions = (element.actions ?? []).filter((action) => (
            (action.event === 'onClick' || action.event === 'onClickSound') && isPageAction(action)
          ));
          if (clickPageActions.length > 1) {
            issues.push({
              code: 'multiple-page-actions',
              severity: 'blocking',
              subPageId: subPage.id,
              pageId: source.id,
              elementId: element.id,
              message: `${element.name ?? '未命名元素'}的一次点击中配置了多个页面动作`,
            });
          }
          for (const action of element.actions ?? []) {
            if (!PAGE_ACTIONS.has(action.actionType)) continue;
            if (action.actionType === 'closeInternalDialog' && source.kind === 'dialog') {
              hasCloseByDialog.set(source.id, true);
            } else if (action.actionType === 'closeInternalDialog') {
              issues.push({ code: 'incompatible-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: '关闭弹窗动作只能配置在弹窗页面中' });
            }
            const targetId = action.pageTargetId;
            const expected = expectedKind(action);
            if (expected && source.kind === 'dialog') {
              issues.push({ code: 'incompatible-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: '弹窗中的页面跳转必须配置为“关闭弹窗后”的组合动作' });
            } else if (expected && !targetId) {
              issues.push({ code: 'missing-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: `“${action.pageTargetNameSnapshot ?? '页面动作'}”尚未选择目标页面` });
            } else if (expected && targetId) {
              const target = pageMap.get(targetId);
              if (!target) {
                issues.push({ code: 'missing-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: `“${action.pageTargetNameSnapshot ?? '页面'}”已不存在` });
              } else if ((expected === 'content' && target.kind === 'dialog') || (expected === 'dialog' && target.kind !== 'dialog')) {
                issues.push({ code: 'incompatible-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: `页面动作目标类型不兼容：${target.name}` });
              } else if (source.id !== targetId) {
                inbound.set(targetId, (inbound.get(targetId) ?? 0) + 1);
              }
            }
            if (action.afterClose && !action.afterClose.pageTargetId) {
              issues.push({ code: 'missing-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: '关闭弹窗后的页面动作尚未选择目标页面' });
            } else if (action.afterClose?.pageTargetId) {
              const target = pageMap.get(action.afterClose.pageTargetId);
              const compatible = target && (action.afterClose.type === 'navigate' ? target.kind !== 'dialog' : target.kind === 'dialog');
              if (!target) {
                issues.push({ code: 'missing-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: `“${action.afterClose.pageTargetNameSnapshot ?? '关闭后的页面'}”已不存在` });
              } else if (!compatible) {
                issues.push({ code: 'incompatible-target', severity: 'blocking', subPageId: subPage.id, pageId: source.id, elementId: element.id, message: `关闭后的页面类型不兼容：${target.name}` });
              } else if (source.id !== target.id) {
                inbound.set(target.id, (inbound.get(target.id) ?? 0) + 1);
              }
            }
          }
        }
      }
      for (const page of pages.slice(1)) {
        if (page.kind === 'content' && !inbound.get(page.id) && !page.internalPage?.noEntryDeferred) {
          issues.push({ code: 'no-entry', severity: 'warning', subPageId: subPage.id, pageId: page.id, message: `${page.name}没有进入按钮` });
        }
        if (page.kind === 'dialog') {
          if (!inbound.get(page.id)) issues.push({ code: 'no-open-entry', severity: 'warning', subPageId: subPage.id, pageId: page.id, message: `${page.name}没有打开入口` });
          if (!page.internalPage?.dialogSettings?.closeOnMask && !hasCloseByDialog.get(page.id)) {
            issues.push({ code: 'no-close-entry', severity: 'blocking', subPageId: subPage.id, pageId: page.id, message: `${page.name}没有关闭出口` });
          }
        }
      }
      const totalElements = pages.reduce((sum, page) => sum + page.elements.length, 0);
      if (pages.length > INTERNAL_PAGE_LIMIT || totalElements > INTERNAL_ELEMENT_LIMIT) {
        issues.push({ code: 'capacity', severity: 'warning', subPageId: subPage.id, message: `当前小关卡包含 ${pages.length} 个页面、${totalElements} 个元素，建议检查预览加载性能` });
      }
    }
  }
  return issues;
}

export function isPageAction(action: Action): boolean {
  return PAGE_ACTIONS.has(action.actionType);
}

export type InternalPageMoveImpact = {
  invalidRelationCount: number;
  changesDialogBase: boolean;
  nameCollision: boolean;
  resolvedName: string;
};

export function resolveMovedPageName(targetSubPage: SubPage, requestedName: string): string {
  if (!isInternalPagesSubPage(targetSubPage)) return requestedName;
  const names = new Set(targetSubPage.internalPages.map((page) => page.name));
  if (!names.has(requestedName)) return requestedName;
  let index = 2;
  let candidate = `${requestedName}（移入）`;
  while (names.has(candidate)) candidate = `${requestedName}（移入 ${index++}）`;
  return candidate;
}

/** 跨小关卡移动前的纯分析：关系不静默清除，预先告诉用户会形成多少条断链。 */
export function analyzeInternalPageMove(
  sourceSubPage: SubPage,
  targetSubPage: SubPage,
  pageId: string,
): InternalPageMoveImpact | null {
  if (!isInternalPagesSubPage(sourceSubPage) || !isInternalPagesSubPage(targetSubPage)) return null;
  const movingPage = sourceSubPage.internalPages.find((page) => page.id === pageId);
  if (!movingPage) return null;
  const targetIds = new Set(getElementPages(targetSubPage).map((page) => page.id));
  targetIds.add(movingPage.id);
  let invalidRelationCount = 0;

  for (const source of getElementPages(sourceSubPage)) {
    for (const element of source.elements) {
      for (const action of element.actions ?? []) {
        if (source.id !== movingPage.id) {
          if (action.pageTargetId === movingPage.id) invalidRelationCount++;
          if (action.afterClose?.pageTargetId === movingPage.id) invalidRelationCount++;
          continue;
        }
        if (action.pageTargetId && !targetIds.has(action.pageTargetId)) invalidRelationCount++;
        if (action.afterClose?.pageTargetId && !targetIds.has(action.afterClose.pageTargetId)) invalidRelationCount++;
      }
    }
  }

  const resolvedName = resolveMovedPageName(targetSubPage, movingPage.name);
  return {
    invalidRelationCount,
    changesDialogBase: movingPage.kind === 'dialog',
    nameCollision: resolvedName !== movingPage.name,
    resolvedName,
  };
}
