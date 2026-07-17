import type { Element } from '../types';

export const EDITOR_CANVAS_FILL_COLOR_PROP = '__editorCanvasFillColor';
export const EDITOR_CANVAS_HIT_THROUGH_PROP = '__editorCanvasHitThrough';

export function getEditorCanvasFillColor(element: Element): string | null {
  const color = element.props[EDITOR_CANVAS_FILL_COLOR_PROP];
  return typeof color === 'string' && color.trim() ? color : null;
}

export function isEditorCanvasHitThrough(element: Element): boolean {
  return element.props[EDITOR_CANVAS_HIT_THROUGH_PROP] === true;
}
