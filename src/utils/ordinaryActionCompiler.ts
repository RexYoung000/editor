import type { Action, Element, SubPage } from '../types';
import { isPageAction } from './internalPages';
import type { ExportActionBuilder } from './internalPageCompiler';

const ORDINARY_EVENT_MAP: Record<string, string> = {
  onClick: 'click',
  onClickSound: 'click',
  onLoad: 'display',
  onChange: 'change',
};

const PAGE_TURN_ACTIONS = new Set([
  'pageTurnGoTo',
  'pageTurnPrevOnce',
  'pageTurnNextOnce',
  'pageTurnPrevLoop',
  'pageTurnNextLoop',
]);

export function isSharedOrdinaryAction(action: Action): boolean {
  return Boolean(ORDINARY_EVENT_MAP[action.event])
    && !isPageAction(action)
    && !PAGE_TURN_ACTIONS.has(action.actionType);
}

export function buildOrdinaryActionBindings(
  page: SubPage,
  getVar: (element: Element) => string,
  buildActionBody: ExportActionBuilder,
  uiNamespace: string,
): string {
  let code = '';

  for (const element of page.elements) {
    const elementRef = `this.${getVar(element)}`;
    for (const [rawEvent, runtimeEvent] of Object.entries(ORDINARY_EVENT_MAP)) {
      if (page.editorModel === 'internal-pages' && (
        rawEvent === 'onClick'
        || rawEvent === 'onClickSound'
        || rawEvent === 'onLoad'
      )) {
        continue;
      }

      const bodies = (element.actions ?? [])
        .filter((action) => action.event === rawEvent && isSharedOrdinaryAction(action))
        .map((action) => buildActionBody(action, elementRef, page, element))
        .filter(Boolean);
      if (bodies.length === 0) continue;

      const clickSound = rawEvent === 'onClickSound'
        ? `this.playSound("${uiNamespace}/sound/btn_click.wav"); `
        : '';
      code += `        if (${elementRef}) ${elementRef}.on('${runtimeEvent}', this, function() { ${clickSound}${bodies.join(' ')} });\n`;
    }
  }

  return code;
}
