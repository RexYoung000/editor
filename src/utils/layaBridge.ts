/**
 * Bridge between React editor store and Laya stage objects.
 * Re-exports from modular files under ./laya/
 */

export { preloadAtlas, registerObject, getObject, removeObject, clearAllObjects, syncTransform, syncProps, initWorldRoot, worldRoot, canvasRoot, setWorldTransform, getWorldTransform, boundaryFrame } from './laya/core';
export { createLayaComponent } from './laya/components';
export { clientToWorld, worldRectToScreen } from './laya/selection';
export { enterPreviewMode, exitPreviewMode, previewGoToPage, resizeStageToContainer } from './laya/preview';
