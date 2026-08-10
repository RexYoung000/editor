import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const propertyPanelSource = readFileSync(join(process.cwd(), 'src/components/PropertyPanel.tsx'), 'utf8');

test('rich text style buttons explain disabled editing state', () => {
  assert.match(propertyPanelSource, /title=\{enabled \? option\.label : '进入文本编辑并选中文字后可用'\}/);
});
