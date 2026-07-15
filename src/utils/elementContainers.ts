const CONTAINER_TYPES = new Set([
  'Box',
  'ContainerBox',
  'PageTurnBox',
  'HBox',
  'VBox',
  'Panel',
  'DragView',
  'DragViewBox',
  'DragDropBox',
  'DragDragBox',
  'ChoiceBox',
  'MatchingGame',
  'OneStrokeGame',
  'MazeView',
  'KlInputBox',
]);

export function isContainerElementType(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}
