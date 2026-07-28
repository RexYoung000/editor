import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { elementMeta, NEW_TEXT_DEFAULT_CONTENT } from '../src/elements/elementMeta';

const canvasSource = readFileSync(join(process.cwd(), 'src/components/Canvas.tsx'), 'utf8');
const overlaySource = readFileSync(join(process.cwd(), 'src/components/CanvasOverlay.tsx'), 'utf8');

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `未找到起始源码：${start}`);
  assert.notEqual(endIndex, -1, `未找到结束源码：${end}`);
  return source.slice(startIndex, endIndex);
}

test('新建文本使用真实默认内容并保持普通选中态', () => {
  assert.equal(NEW_TEXT_DEFAULT_CONTENT, '双击编辑文本');
  assert.equal(elementMeta.NewTextArea.defaultProps?.text, NEW_TEXT_DEFAULT_CONTENT);
  assert.equal(elementMeta.NewTextArea.defaultProps?.color, '#ffffff');

  const createTextSource = sourceBetween(
    canvasSource,
    "const element = createDefaultElement('NewTextArea'",
    '}, [addElement, currentPage',
  );
  assert.match(createTextSource, /layoutText\(String\(element\.props\.text \?\? ''\)/);
  assert.match(createTextSource, /addElement\(element\);/);
  assert.match(createTextSource, /selectElement\(element\.id, false\);/);
  assert.doesNotMatch(createTextSource, /setEditingId|setTextCaretPoint|queueMicrotask/);
});

test('双击默认文本全选，其他文本仍按点击位置放置光标', () => {
  const doubleClickSource = sourceBetween(
    overlaySource,
    'const handleDoubleClick = useCallback',
    'const elements = currentPage?.elements',
  );
  assert.match(
    doubleClickSource,
    /String\(hit\.props\.text \?\? ''\) === NEW_TEXT_DEFAULT_CONTENT/,
  );
  assert.match(doubleClickSource, /setSelectAllTextOnEdit\(selectDefaultContent\)/);
  assert.match(
    overlaySource,
    /if \(selectAllTextOnEdit\) \{\s*textarea\.setSelectionRange\(0, textDraft\.length\);/,
  );
  assert.match(overlaySource, /caretOffsetAtPoint\(textDraft/);
});

test('文本清空后退出仍保留组件', () => {
  const finishSource = sourceBetween(
    overlaySource,
    'const finishTextEditing = useCallback',
    'useLayoutEffect(() =>',
  );
  assert.match(finishSource, /const nextProps = \{ \.\.\.props, text: textDraft \};/);
  assert.match(finishSource, /updateElement\(editingElement\.id/);
  assert.doesNotMatch(
    finishSource,
    /removeElementsWithoutHistory|removeObject|decrementSubPageCounter|isNewEmpty/,
  );
  assert.doesNotMatch(overlaySource, /data-new-text-placeholder|showNewTextPlaceholder|输入文字/);
});

test('文本编辑态提供独立光标和稳定缩放的高对比反馈', () => {
  assert.match(overlaySource, /data-text-editor-state="editing"/);
  assert.match(overlaySource, /const decorationScale = 1 \/ Math\.max\(zoom, 0\.05\);/);
  assert.match(overlaySource, /outline: `\$\{2 \* decorationScale\}px solid #06b6d4`/);
  assert.match(overlaySource, /cursor: 'text'/);
  assert.match(overlaySource, /caretColor: '#ff2d55'/);
});
