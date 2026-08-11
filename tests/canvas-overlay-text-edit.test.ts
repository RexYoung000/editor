import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const canvasOverlaySource = readFileSync(join(process.cwd(), 'src/components/CanvasOverlay.tsx'), 'utf8');

test('NewTextArea exits editing on property panel clicks except rich text style controller', () => {
  assert.match(canvasOverlaySource, /target\.closest\('\[data-text-style-controller\]'\)/);
  assert.doesNotMatch(canvasOverlaySource, /event\.defaultPrevented/);
});
