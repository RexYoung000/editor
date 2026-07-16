import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANVAS_ASSIST_PREFERENCES_KEY,
  DEFAULT_CANVAS_ASSIST_PREFERENCES,
  loadCanvasAssistPreferences,
  parseCanvasAssistPreferences,
  resetCanvasAssistPreferences,
  saveCanvasAssistPreferences,
} from '../src/utils/canvasAssistPreferences';

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(CANVAS_ASSIST_PREFERENCES_KEY, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('画布辅助设置首次使用时返回五项默认值', () => {
  assert.deepEqual(loadCanvasAssistPreferences(createStorage()), DEFAULT_CANVAS_ASSIST_PREFERENCES);
});

test('画布辅助设置只接收有效布尔值并兼容旧数据', () => {
  const preferences = parseCanvasAssistPreferences(JSON.stringify({
    showGrid: true,
    snapToGrid: 'yes',
    smartSnap: false,
  }));
  assert.deepEqual(preferences, {
    showGrid: true,
    snapToGrid: false,
    smartSnap: false,
    showSnapGuides: true,
    showSpacingHints: true,
  });
});

test('画布辅助设置损坏时恢复默认且各项可以独立保存', () => {
  assert.deepEqual(parseCanvasAssistPreferences('{broken'), DEFAULT_CANVAS_ASSIST_PREFERENCES);
  const storage = createStorage();
  const preferences = {
    showGrid: true,
    snapToGrid: false,
    smartSnap: false,
    showSnapGuides: true,
    showSpacingHints: false,
  };
  saveCanvasAssistPreferences(preferences, storage);
  assert.deepEqual(loadCanvasAssistPreferences(storage), preferences);
  assert.deepEqual(resetCanvasAssistPreferences(storage), DEFAULT_CANVAS_ASSIST_PREFERENCES);
  assert.deepEqual(loadCanvasAssistPreferences(storage), DEFAULT_CANVAS_ASSIST_PREFERENCES);
});
