# Element List Drag-and-Drop Design

Date: 2026-05-16

## Summary

Replace the ElementList's button-based layer ordering with drag-and-drop. Drag an element to reorder within the same level, drag onto a container to make it a child, drag out of a container to the top level.

## Approach

**HTML5 native Drag & Drop API** — zero new dependencies. The element tree is simple (max 2 levels), so the native API is sufficient.

## New Store Actions

### `reorderElement(id, newIndex)`

Move element to a new position within the `elements[]` array. Only affects sibling order under the same `parentId`. Children of the moved element stay attached.

### `setElementParent(id, newParentId)`

Change `parentId`. When setting a new parent:
- Compute world position of the element (accumulate all ancestor offsets)
- Subtract the new parent's offset to keep world position stable
- Verify the new parent is a valid container type (Box, ContainerBox, PageTurnBox, etc.)
- Prevent circular references (can't set parent to self or any descendant)

When clearing parent (drag to top level):
- Compute world position
- No offset subtraction needed (top-level uses world coords directly)
- Remove `parentId`

Both actions call `saveHistory()`.

## Drag Behavior

| Drag target | Drop target | Action |
|---|---|---|
| Any element | Between sibling elements | `reorderElement` — reorder in same level |
| Any element | On a container row | `setElementParent(id, containerId)` — become child, fix x/y |
| Child element | Top-level empty space | `setElementParent(id, null)` — detach, fix x/y |
| Child element | Between top-level elements | `setElementParent(id, null)` + `reorderElement` — detach and place |

## Visual Indicators During Drag

- **Reorder**: Blue horizontal line between elements at insertion point
- **Drop into container**: Container row gets blue border highlight
- **Drag out of container**: Dragging child to top-level area shows insertion line at top level

## Constraints

- Cannot drag a locked element
- Cannot drop an element onto itself
- Cannot drop an element onto any of its descendants (prevents circular parentId)
- Cannot drop onto a non-container type (only types listed in PropertyPanel's parent dropdown: Box, ContainerBox, PageTurnBox, HBox, VBox, Panel, DragView, DragViewBox, ChoiceBox, MatchingGame, OneStrokeGame, MazeView, KlInputBox)
- When dragging, the dragged element row becomes semi-transparent (opacity 0.4)

## Implementation Sketch

### ElementList.tsx changes

- Each element row: `draggable`, `onDragStart` (store `draggedId` in dataTransfer + local ref)
- `onDragOver`: compute drop position (above/below/into-container), show indicator via state
- `onDrop`: call `reorderElement` or `setElementParent` based on indicator type
- Render drop indicator lines/highlights based on drag state
- Remove the 4 layer-ordering buttons (ArrowUp/Down/ChevronsUp/Down) — replaced by drag

### editorStore.ts changes

- Add `reorderElement(id, newIndex)` action
- Add `setElementParent(id, newParentId)` action with coordinate correction (reuse the `getAncestorOffset` pattern from PropertyPanel)
- Keep `moveElementLayer` for keyboard shortcuts if needed, or remove if drag fully replaces it

### Coordinate Correction Logic

```
function getAncestorOffset(elements, parentId) {
  let ax = 0, ay = 0;
  let pid = parentId;
  while (pid) {
    const parent = elements.find(e => e.id === pid);
    if (!parent) break;
    ax += parent.x; ay += parent.y;
    pid = parent.parentId;
  }
  return { ax, ay };
}

// Setting new parent:
const oldOffset = getAncestorOffset(elements, element.parentId);
const newOffset = getAncestorOffset(elements, newParentId);
element.x = element.x + oldOffset.ax - newOffset.ax;
element.y = element.y + oldOffset.ay - newOffset.ay;
element.parentId = newParentId;
```