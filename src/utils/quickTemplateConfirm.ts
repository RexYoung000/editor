import { assetExport } from '../elements/builtinAssets';
import type { Element } from '../types';

export const QUICK_TEMPLATE_CONFIRM_ASSET_ID = 'okBtn.quickTemplateYellowTraditional';
export const QUICK_TEMPLATE_CONFIRM_MARKER = '_quickTemplateConfirm';
export const QUICK_TEMPLATE_CONFIRM_SIZE = { width: 299, height: 144 } as const;

export function applyQuickTemplateConfirmDefaults(element: Element): void {
  element.width = QUICK_TEMPLATE_CONFIRM_SIZE.width;
  element.height = QUICK_TEMPLATE_CONFIRM_SIZE.height;
  element.props = {
    ...element.props,
    skin: assetExport(QUICK_TEMPLATE_CONFIRM_ASSET_ID),
    _naturalWidth: QUICK_TEMPLATE_CONFIRM_SIZE.width,
    _naturalHeight: QUICK_TEMPLATE_CONFIRM_SIZE.height,
    _fileFormat: 'PNG',
    [QUICK_TEMPLATE_CONFIRM_MARKER]: true,
  };
}

export function isQuickTemplateConfirm(element: Element): boolean {
  return element.type === 'ConfirmButton'
    && element.props?.[QUICK_TEMPLATE_CONFIRM_MARKER] === true;
}
