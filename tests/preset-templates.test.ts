import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import JSZip from 'jszip';
import type { Course, Element } from '../src/types';
import { translations } from '../src/i18n/translations';
import {
  filterPresetTemplates,
  PRESET_TEMPLATES,
} from '../src/presets';
import {
  buildExportRegressionArtifacts,
  collectGameZipFiles,
} from '../src/utils/exportProject';
import type { CourseKind } from '../src/utils/courseKind';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

const newPresetIds = ['question-layout-aqua-01', 'question-layout-blue-01'];

const presetExportCases: Array<{
  presetId: string;
  kind: Extract<CourseKind, 'homework' | 'sEvaluation'>;
  assets: Array<{ source: string; width: number; height: number }>;
}> = [
  {
    presetId: 'question-layout-aqua-01',
    kind: 'homework',
    assets: [
      {
        source: 'game/preset/question-layout-aqua-01/background.jpg',
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    presetId: 'question-layout-aqua-01',
    kind: 'sEvaluation',
    assets: [
      {
        source: 'game/preset/question-layout-aqua-01/background.jpg',
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    presetId: 'question-layout-blue-01',
    kind: 'homework',
    assets: [
      {
        source: 'game/preset/question-layout-blue-01/background.jpg',
        width: 1920,
        height: 1080,
      },
      {
        source: 'game/preset/question-layout-blue-01/title-paper.png',
        width: 1841,
        height: 520,
      },
    ],
  },
];

function visiblePresetIds(
  courseKind: 'normal' | 'homework' | 'sEvaluation' | 'review',
  mode: 'stage' | 'subPage' = 'stage',
): string[] {
  return filterPresetTemplates(PRESET_TEMPLATES, {
    courseKind,
    mode,
    supportsInternalPages: courseKind !== 'review',
  }).map((preset) => preset.id);
}

function textElement(elements: Element[], label: string): Element {
  const element = elements.find((candidate) => candidate.props._editorLabel === label);
  assert.ok(element, `缺少“${label}”文本元素`);
  return element;
}

test('预设模板按课件类型显示，同时保持既有模板入口', () => {
  assert.deepEqual(
    visiblePresetIds('normal').filter((id) => newPresetIds.includes(id)),
    [],
  );
  assert.deepEqual(
    visiblePresetIds('homework').filter((id) => newPresetIds.includes(id)),
    newPresetIds,
  );
  assert.deepEqual(
    visiblePresetIds('sEvaluation').filter((id) => newPresetIds.includes(id)),
    ['question-layout-aqua-01'],
  );
  assert.deepEqual(
    visiblePresetIds('review').filter((id) => newPresetIds.includes(id)),
    [],
  );

  assert.ok(visiblePresetIds('normal').includes('internal-pages-v1'));
  assert.ok(visiblePresetIds('normal').includes('video'));
  assert.ok(!visiblePresetIds('review').includes('internal-pages-v1'));
  assert.ok(visiblePresetIds('review').includes('video'));
  assert.ok(!visiblePresetIds('homework', 'subPage').includes('question-layout-aqua-01'));
});

test('两套题目版式拥有稳定 ID、正确归属和可编辑边界', () => {
  const ids = PRESET_TEMPLATES.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length);

  const aqua = PRESET_TEMPLATES.find((preset) => preset.id === 'question-layout-aqua-01');
  const blue = PRESET_TEMPLATES.find((preset) => preset.id === 'question-layout-blue-01');
  assert.ok(aqua);
  assert.ok(blue);
  assert.deepEqual(aqua.courseKinds, ['homework', 'sEvaluation']);
  assert.deepEqual(blue.courseKinds, ['homework']);

  for (const preset of [aqua, blue]) {
    const textElements = preset.elements.filter((element) => element.type === 'NewTextArea');
    const decorationElements = preset.elements.filter((element) => element.type === 'NewImage');
    assert.equal(textElements.length, 3);
    assert.ok(textElements.every((element) => !element.locked));
    assert.ok(decorationElements.length >= 1);
    assert.ok(decorationElements.every((element) => element.locked));
    assert.equal(textElement(preset.elements, '题号').props.text, 'Q1:');
    assert.equal(textElement(preset.elements, '题目').props.text, '文本编辑');
    assert.equal(textElement(preset.elements, '正文').props.text, '文本编辑');
    assert.ok(preset.elements.every((element) => (element.actions ?? []).length === 0));
  }
});

test('两套题目版式使用老师可见的中文模板名称', () => {
  const expectedNames: Record<string, string> = {
    'question-layout-aqua-01': '青色题目版式',
    'question-layout-blue-01': '蓝色题目版式',
  };

  for (const [presetId, expectedName] of Object.entries(expectedNames)) {
    const preset = PRESET_TEMPLATES.find((candidate) => candidate.id === presetId);
    assert.ok(preset);
    assert.equal(translations.zh[preset.labelKey], expectedName);
  }
});

test('套用模板生成独立元素 ID，修改实例不会污染母版或后续实例', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const course: Course = {
    id: 'preset-homework',
    kind: 'homework',
    stages: [],
  };
  useEditorStore.getState().setCurrentCourse(course);

  useEditorStore.getState().addStageFromPreset('question-layout-aqua-01');
  useEditorStore.getState().addStageFromPreset('question-layout-aqua-01');

  let stages = useEditorStore.getState().currentCourse!.stages;
  assert.equal(stages.length, 2);
  const firstIds = stages[0].subPages[0].elements.map((element) => element.id);
  const secondIds = stages[1].subPages[0].elements.map((element) => element.id);
  assert.equal(new Set([...firstIds, ...secondIds]).size, firstIds.length + secondIds.length);

  const firstPage = stages[0].subPages[0];
  useEditorStore.getState().setCurrentSubPage(stages[0].id, firstPage.id);
  const firstTitle = textElement(firstPage.elements, '题目');
  useEditorStore.getState().updateElement(firstTitle.id, {
    props: { text: '老师修改后的题目' },
  });

  useEditorStore.getState().addStageFromPreset('question-layout-aqua-01');
  stages = useEditorStore.getState().currentCourse!.stages;
  assert.equal(stages.length, 3);
  assert.equal(textElement(stages[0].subPages[0].elements, '题目').props.text, '老师修改后的题目');
  assert.equal(textElement(stages[1].subPages[0].elements, '题目').props.text, '文本编辑');
  assert.equal(textElement(stages[2].subPages[0].elements, '题目').props.text, '文本编辑');

  const mother = PRESET_TEMPLATES.find((preset) => preset.id === 'question-layout-aqua-01')!;
  assert.equal(textElement(mother.elements, '题目').props.text, '文本编辑');
});

test('不属于当前课件类型的模板即使绕过界面也不能套用', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  const course: Course = {
    id: 'preset-normal',
    kind: 'normal',
    stages: [],
  };
  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().addStageFromPreset('question-layout-aqua-01');
  assert.equal(useEditorStore.getState().currentCourse!.stages.length, 0);
});

test('保存重开后两套版式保持布局，并进入作业与专题测评导出资源', () => {
  for (const { presetId, kind, assets } of presetExportCases) {
    const preset = PRESET_TEMPLATES.find((candidate) => candidate.id === presetId);
    assert.ok(preset);

    const course: Course = {
      id: `preset-export-${kind}-${presetId}`,
      kind,
      stages: [
        {
          id: 'stage-1',
          name: '关卡 1',
          noSubPages: preset.noSubPages ?? false,
          subPages: [
            {
              id: 'subpage-1',
              name: '小关卡 1-1',
              elements: structuredClone(preset.elements),
            },
          ],
        },
      ],
    };
    const reopened = JSON.parse(JSON.stringify(course)) as Course;
    assert.deepEqual(reopened, course, `${presetId}/${kind} 保存重开后数据应保持一致`);

    const imageSizes = new Map(
      assets.map(({ source, width, height }) => [
        source.replace(/^game\//, 'game_hw/image/'),
        { w: width, h: height },
      ]),
    );
    const artifacts = buildExportRegressionArtifacts(reopened, imageSizes);
    assert.equal(artifacts.viewDir, 'game_hw');
    assert.equal(artifacts.scenes.length, 1);

    const sceneText = JSON.stringify(artifacts.scenes[0].scene);
    const pageResources = (artifacts.config.pages as Array<{
      res?: Array<{ url: string; type?: string }>;
    }>)[0]?.res ?? [];
    for (const { source } of assets) {
      const target = source.replace(/^game\//, 'game_hw/image/');
      assert.equal(artifacts.resources[source], target);
      assert.ok(sceneText.includes(target), `${presetId}/${kind} scene 缺少 ${target}`);
      assert.ok(
        pageResources.some((entry) => entry.url === target && entry.type === 'image'),
        `${presetId}/${kind} config 缺少 ${target}`,
      );
    }

    const packedFiles = collectGameZipFiles(
      new Map(Object.entries(artifacts.resources)),
    );
    assert.deepEqual(
      [...packedFiles].sort(),
      assets.map(({ source }) => source.slice('game/'.length)).sort(),
    );
  }
});

test('game.zip 包含两套模板使用的原始资源', async () => {
  const zip = await JSZip.loadAsync(
    readFileSync(join(process.cwd(), 'public/builtin/runtime/game.zip')),
  );
  const resources = [
    'preset/question-layout-aqua-01/background.jpg',
    'preset/question-layout-blue-01/background.jpg',
    'preset/question-layout-blue-01/title-paper.png',
  ];

  for (const relativePath of resources) {
    const entry = zip.file(relativePath);
    assert.ok(entry, `game.zip 缺少 ${relativePath}`);
    const packed = await entry.async('nodebuffer');
    const source = readFileSync(join(process.cwd(), 'public/builtin/runtime/game', relativePath));
    assert.deepEqual(packed, source);
  }
});
