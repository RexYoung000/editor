import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { translations } from '../src/i18n/translations';
import {
  isPresetVisibleForCourseType,
  type PresetTemplate,
} from '../src/presets/types';
import type { Course } from '../src/types';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  },
  configurable: true,
});

function courseWithContent(): Course {
  return {
    id: 'demo',
    kind: 'normal',
    type: 'normal',
    stages: [{
      id: 'stage',
      name: 'stage',
      subPages: [{ id: 'sub', name: 'sub', elements: [] }],
    }],
  };
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

test('课件类型切换需要确认且不会修改运行 kind', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse(courseWithContent());

  assert.equal(useEditorStore.getState().setCourseType('homework'), false);
  assert.equal(useEditorStore.getState().currentCourse?.type, 'normal');
  assert.equal(useEditorStore.getState().currentCourse?.kind, 'normal');

  assert.equal(useEditorStore.getState().setCourseType('homework', { confirmed: true }), true);
  assert.equal(useEditorStore.getState().currentCourse?.type, 'homework');
  assert.equal(useEditorStore.getState().currentCourse?.kind, 'normal');
});

test('永久模板只跳过课型过滤但不跳过形态和运行能力约束', () => {
  const videoPreset: PresetTemplate = {
    id: 'video',
    labelKey: 'presetVideo',
    thumbnail: '',
    elements: [],
    noSubPages: true,
    alwaysVisible: true,
  };
  const internalPreset: PresetTemplate = {
    id: 'internal',
    labelKey: 'presetInternalPages',
    thumbnail: '',
    elements: [],
    editorModel: 'internal-pages',
  };
  const homeworkPreset: PresetTemplate = {
    id: 'homework',
    labelKey: 'presetHomeworkLevel2',
    thumbnail: '',
    elements: [],
    category: 'homework',
  };

  assert.equal(isPresetVisibleForCourseType(videoPreset, 'homework', { mode: 'stage', supportsInternalPages: true }), true);
  assert.equal(isPresetVisibleForCourseType(videoPreset, 'homework', { mode: 'subPage', supportsInternalPages: true }), false);
  assert.equal(isPresetVisibleForCourseType(internalPreset, 'review', { mode: 'stage', supportsInternalPages: false }), false);
  assert.equal(isPresetVisibleForCourseType(internalPreset, 'homework', { mode: 'stage', supportsInternalPages: true }), false);
  assert.equal(isPresetVisibleForCourseType(homeworkPreset, 'normal', { mode: 'stage', supportsInternalPages: true }), false);
  assert.equal(isPresetVisibleForCourseType(homeworkPreset, 'homework', { mode: 'stage', supportsInternalPages: true }), true);
});

test('课件设置和模板弹窗新增文案走 i18n 翻译键', () => {
  const settingsSource = stripComments(readFileSync('src/components/CourseSettingsDialog.tsx', 'utf8'));
  const dialogSource = stripComments(readFileSync('src/components/NewStageDialog.tsx', 'utf8'));

  assert.doesNotMatch(settingsSource, /[\p{Script=Han}]/u);
  assert.doesNotMatch(dialogSource, /[\p{Script=Han}]/u);
  assert.equal(translations.en.courseSettingsTitle, 'Course Settings');
  assert.equal(translations.en.templateDialogTitle, 'Templates');
  assert.match(translations.en.presetNoBusinessTemplate, /No matching templates/);
});
