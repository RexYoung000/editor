import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_TEMPLATES, filterPresetTemplates } from '../src/presets';

test('preset templates are filtered by course kind', () => {
  assert.deepEqual(
    filterPresetTemplates(PRESET_TEMPLATES, { courseKind: 'normal', mode: 'stage', supportsInternalPages: true }).map((item) => item.id),
    ['internal-pages-v1'],
  );

  assert.deepEqual(
    filterPresetTemplates(PRESET_TEMPLATES, { courseKind: 'review', mode: 'stage', supportsInternalPages: true }).map((item) => item.id),
    ['video'],
  );

  assert.deepEqual(
    filterPresetTemplates(PRESET_TEMPLATES, { courseKind: 'homework', mode: 'stage', supportsInternalPages: true }).map((item) => item.id),
    ['internal-pages-v1', 'homework-stage-1', 'homework-stage-2'],
  );

  assert.deepEqual(
    filterPresetTemplates(PRESET_TEMPLATES, { courseKind: 'sEvaluation', mode: 'stage', supportsInternalPages: true }).map((item) => item.id),
    ['internal-pages-v1', 'sevaluation-stage-1'],
  );

  assert.deepEqual(
    filterPresetTemplates(PRESET_TEMPLATES, { courseKind: 'normal', mode: 'stage', supportsInternalPages: false }).map((item) => item.id),
    [],
  );
});
