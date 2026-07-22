import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Course, Element, SubPage } from '../src/types';
import { assetExport } from '../src/elements/builtinAssets';
import { elementMeta } from '../src/elements/elementMeta';
import {
  CHOICE_CORRECT_OPTION_IDS_KEY,
  collectChoiceAnswerIssues,
  getChoiceAnswerMode,
  getChoiceCorrectOptionIds,
  getChoiceRuntimeProps,
  remapChoiceAnswerRefs,
  removeChoiceAnswerRefs,
  removeInvalidChoiceAnswerRefs,
  setChoiceCorrectOptionIds,
} from '../src/utils/choiceAnswerRules';
import {
  buildExportRegressionArtifacts,
  collectElementsNeedingVar,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
} from './fixtures/export-courses';
import {
  applyQuickTemplateConfirmDefaults,
  isQuickTemplateConfirm,
  QUICK_TEMPLATE_CONFIRM_ASSET_ID,
  QUICK_TEMPLATE_CONFIRM_MARKER,
  QUICK_TEMPLATE_CONFIRM_SIZE,
} from '../src/utils/quickTemplateConfirm';

interface SceneNode {
  type?: string;
  props?: Record<string, unknown>;
  child?: SceneNode[];
}

function element(id: string, type: string, extra: Partial<Element> = {}): Element {
  return {
    id,
    type,
    layaType: type,
    name: id.replace(/-/g, '_'),
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
    ...extra,
  };
}

function activePage(course: Course, preview = false): SubPage {
  return (preview ? course.previewStages! : course.stages)[0].subPages[0];
}

function addChoice(page: SubPage, withConfirm: boolean): {
  choice: Element;
  options: Element[];
  label: Element;
} {
  const choice = element('choice-box', 'ChoiceBox', {
    props: { [CHOICE_CORRECT_OPTION_IDS_KEY]: ['option-a', 'option-c'] },
  });
  const skinProps = {
    _foregroundSkin: assetExport('choiceOption.normal'),
    _pressedSkin: assetExport('choiceOption.pressed'),
    _bgSkin: assetExport('choiceOption.selected'),
    _correctSkin: assetExport('choiceOption.correct'),
    _wrongSkin: assetExport('choiceOption.wrong'),
  };
  const options = [
    element('option-a', 'SpeechSelectableObj', {
      layaType: 'SelectableObj',
      name: 'Alpha',
      parentId: choice.id,
      width: 300,
      height: 77,
      props: { ...skinProps },
    }),
    element('option-b', 'SpeechSelectableObj', {
      layaType: 'SelectableObj',
      name: 'Beta',
      parentId: choice.id,
      width: 237,
      height: 77,
      props: { ...skinProps },
    }),
    element('option-c', 'SpeechSelectableObj', {
      layaType: 'SelectableObj',
      name: 'Gamma',
      parentId: choice.id,
      width: 237,
      height: 77,
      props: { ...skinProps },
    }),
  ];
  const label = element('option-label', 'Label', {
    layaType: 'Label',
    parentId: options[0].id,
    width: 120,
    height: 40,
    props: { text: '选项文字' },
  });
  page.elements.push(choice, ...options, label);

  if (withConfirm) {
    const action: Action = {
      id: 'confirm-choice-action',
      event: 'onClickInitConfirmWithLock',
      actionType: 'none',
      targetId: choice.id,
    };
    page.elements.push(element('confirm-choice', 'ConfirmButton', {
      layaType: 'ScaleButton',
      actions: [action],
    }));
  }
  return { choice, options, label };
}

function sceneNodes(scene: Record<string, unknown>): SceneNode[] {
  const nodes: SceneNode[] = [];
  const visit = (node: SceneNode) => {
    nodes.push(node);
    for (const child of node.child ?? []) visit(child);
  };
  visit(scene as SceneNode);
  return nodes;
}

test('正确答案使用稳定选项 ID，并自动推导单选和多选', () => {
  const choice = element('choice', 'ChoiceBox');
  const optionA = element('option-a', 'SpeechSelectableObj', { name: 'A', parentId: choice.id });
  const optionB = element('option-b', 'SpeechSelectableObj', { name: 'B', parentId: choice.id });
  const elements = [choice, optionA, optionB];

  setChoiceCorrectOptionIds(choice, [optionA.id, optionA.id]);
  assert.deepEqual(getChoiceCorrectOptionIds(choice), [optionA.id]);
  assert.equal(getChoiceAnswerMode(choice), 'single');
  assert.deepEqual(getChoiceRuntimeProps(choice, elements), { rightItemNames: 'A', upperLimit: 1 });

  setChoiceCorrectOptionIds(choice, [optionA.id, optionB.id]);
  optionB.name = '重命名后的B';
  assert.equal(getChoiceAnswerMode(choice), 'multiple');
  assert.deepEqual(getChoiceRuntimeProps(choice, elements), {
    rightItemNames: 'A,重命名后的B',
    upperLimit: 0,
  });
  assert.equal('rightItemNames' in choice.props, false);
  assert.equal('upperLimit' in choice.props, false);
});

test('快捷题型确定按钮使用黄色繁体资源且不改变独立组件默认值', () => {
  const confirm = element('quick-confirm', 'ConfirmButton', {
    layaType: 'ScaleButton',
    props: { ...elementMeta.ConfirmButton.defaultProps },
  });

  applyQuickTemplateConfirmDefaults(confirm);

  assert.equal(confirm.props.skin, assetExport(QUICK_TEMPLATE_CONFIRM_ASSET_ID));
  assert.deepEqual(
    { width: confirm.width, height: confirm.height },
    QUICK_TEMPLATE_CONFIRM_SIZE,
  );
  assert.equal(confirm.props[QUICK_TEMPLATE_CONFIRM_MARKER], true);
  assert.equal(isQuickTemplateConfirm(confirm), true);
  assert.equal(elementMeta.ConfirmButton.defaultProps.skin, assetExport('okBtn.m_qddk_on'));
});

test('删除、移出和复制选项时同步维护答案引用', () => {
  const choice = element('choice', 'ChoiceBox', {
    props: { [CHOICE_CORRECT_OPTION_IDS_KEY]: ['option-a', 'option-b'] },
  });
  const optionA = element('option-a', 'SpeechSelectableObj', { parentId: choice.id });
  const optionB = element('option-b', 'SpeechSelectableObj', { parentId: choice.id });

  const copy = structuredClone(choice);
  remapChoiceAnswerRefs(copy, new Map([
    [choice.id, 'choice-copy'],
    [optionA.id, 'option-a-copy'],
    [optionB.id, 'option-b-copy'],
  ]));
  assert.deepEqual(getChoiceCorrectOptionIds(copy), ['option-a-copy', 'option-b-copy']);

  assert.equal(removeChoiceAnswerRefs([choice, optionA, optionB], new Set([optionA.id])), 1);
  assert.deepEqual(getChoiceCorrectOptionIds(choice), [optionB.id]);

  optionB.parentId = undefined;
  assert.equal(removeInvalidChoiceAnswerRefs([choice, optionA, optionB]), 1);
  assert.deepEqual(getChoiceCorrectOptionIds(choice), []);
});

test('编辑器复制、删除、移出和缩放操作保持选择题答案一致', async () => {
  const storage = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    window: { electronAPI: {}, dispatchEvent: () => true },
    CustomEvent: class CustomEvent<T> {
      detail: T;
      constructor(_type: string, init: { detail: T }) { this.detail = init.detail; }
    },
  });
  const { useEditorStore } = await import('../src/store/editorStore');
  const course = normalCourseFixture();
  const page = activePage(course);
  const { choice, options } = addChoice(page, false);
  useEditorStore.getState().setCurrentCourse(course);
  useEditorStore.getState().selectElements([choice.id]);

  const duplicate = useEditorStore.getState().duplicateElements();
  assert.ok(duplicate);
  const copiedChoice = duplicate.elements.find((item) => item.id === duplicate.idMap[choice.id]);
  assert.deepEqual(
    copiedChoice ? getChoiceCorrectOptionIds(copiedChoice) : [],
    [duplicate.idMap[options[0].id], duplicate.idMap[options[2].id]],
  );

  useEditorStore.getState().deleteElement(options[0].id);
  const currentPage = activePage(useEditorStore.getState().currentCourse!);
  const currentChoice = currentPage.elements.find((item) => item.id === choice.id)!;
  assert.deepEqual(getChoiceCorrectOptionIds(currentChoice), [options[2].id]);
  useEditorStore.getState().undo();
  assert.deepEqual(
    getChoiceCorrectOptionIds(activePage(useEditorStore.getState().currentCourse!).elements.find((item) => item.id === choice.id)!),
    [options[0].id, options[2].id],
  );

  useEditorStore.getState().setElementParent(options[2].id, undefined);
  assert.deepEqual(
    getChoiceCorrectOptionIds(activePage(useEditorStore.getState().currentCourse!).elements.find((item) => item.id === choice.id)!),
    [options[0].id],
  );

  useEditorStore.getState().updateElementsWithoutHistory([{
    id: options[1].id,
    x: 0,
    y: 0,
    width: 420,
    height: 160,
    rotation: 0,
  }]);
  const resizedOption = activePage(useEditorStore.getState().currentCourse!).elements.find((item) => item.id === options[1].id);
  assert.deepEqual({ width: resizedOption?.width, height: resizedOption?.height }, { width: 420, height: 77 });
});

test('发布校验要求至少两个直属选项和一个有效答案', () => {
  const choice = element('choice', 'ChoiceBox', {
    props: { [CHOICE_CORRECT_OPTION_IDS_KEY]: ['missing-option'] },
  });
  const option = element('option', 'SpeechSelectableObj', { parentId: choice.id });
  const issues = collectChoiceAnswerIssues(choice, [choice, option]);
  assert.deepEqual(issues.map((issue) => issue.code), ['too-few-options', 'invalid-answer']);

  setChoiceCorrectOptionIds(choice, []);
  assert.deepEqual(
    collectChoiceAnswerIssues(choice, [choice, option]).map((issue) => issue.code),
    ['too-few-options', 'missing-answer'],
  );
});

test('scene 将答案 ID 转为名称并生成五态图层和文字点击穿透', () => {
  const course = normalCourseFixture();
  const page = activePage(course);
  const { choice } = addChoice(page, true);
  const artifacts = buildExportRegressionArtifacts(course);
  const scene = artifacts.scenes[0];
  const nodes = sceneNodes(scene.scene);
  const choiceNode = nodes.find((node) => node.type === 'ChoiceBox');
  assert.equal(choiceNode?.props?.rightItemNames, 'Alpha,Gamma');
  assert.equal(choiceNode?.props?.upperLimit, 0);
  assert.equal(choiceNode?.props?.var, 'choice_box');
  assert.equal(CHOICE_CORRECT_OPTION_IDS_KEY in (choiceNode?.props ?? {}), false);

  const optionNode = nodes.find((node) => node.props?.name === 'Alpha');
  const stateByName = new Map((optionNode?.child ?? []).map((node) => [node.props?.name ?? 'normal', node]));
  assert.equal(stateByName.get('normal')?.props?.skin, 'game_lt/image/choiceOption/normal.png');
  assert.equal(stateByName.get('down')?.props?.skin, 'game_lt/image/choiceOption/pressed.png');
  assert.deepEqual(
    {
      selectedWidth: stateByName.get('bg')?.props?.width,
      selectedHeight: stateByName.get('bg')?.props?.height,
      correctWidth: stateByName.get('right')?.props?.width,
      correctHeight: stateByName.get('right')?.props?.height,
      wrongWidth: stateByName.get('wrong')?.props?.width,
      wrongHeight: stateByName.get('wrong')?.props?.height,
    },
    {
      selectedWidth: 322,
      selectedHeight: 99,
      correctWidth: 314,
      correctHeight: 91,
      wrongWidth: 314,
      wrongHeight: 91,
    },
  );

  const labelNode = nodes.find((node) => node.props?.text === '选项文字');
  assert.equal(labelNode?.props?.mouseEnabled, false);
  assert.equal(labelNode?.props?.mouseThrough, true);
  assert.equal(collectElementsNeedingVar(page).has(choice.id), true);
});

test('正课和预习由画布确认按钮应用选择题结果', () => {
  const normal = normalCourseFixture();
  addChoice(activePage(normal), true);
  const normalSource = buildExportRegressionArtifacts(normal).scenes[0].source;
  assert.match(normalSource, /GameUtils\.initChoiceBoxConfirm\(this, this\.confirm_choice, this\.choice_box, null, this\._lockBox\)/);
  assert.match(normalSource, /__forgeApplyResult = function\(result: any\)/);
  assert.match(normalSource, /__setLayer\(item, 'right', result === true && selected\)/);
  assert.match(normalSource, /__setLayer\(item, 'wrong', result === false && selected\)/);
  assert.match(normalSource, /__choice\.mouseChildren = result !== true/);

  const preview = previewCourseFixture();
  addChoice(activePage(preview, true), true);
  const previewSource = buildPreviewExportRegressionArtifacts(preview).scenes[0].source;
  assert.match(previewSource, /GameUtils\.initChoiceBoxConfirm\(this, this\.confirm_choice, this\.choice_box, null, this\._lockBox\)/);
  assert.match(previewSource, /__forgeApplyResult = function\(result: any\)/);
});

test('作业选择题只在通用提交读取 result 时应用判定反馈', () => {
  const homework = homeworkCourseFixture();
  addChoice(activePage(homework), false);
  const source = buildExportRegressionArtifacts(homework).scenes[0].source;

  assert.match(source, /if \(this\.choice_box\.isRight\).*__forgeJudgeResults\.push\(true\)/);
  assert.doesNotMatch(source, /this\.choice_box\.clickHanler/);
  assert.match(
    source,
    /public get result\(\): any \{[\s\S]*this\.checkResult\(\);[\s\S]*__forgeApplyResult[\s\S]*return this\._result;/,
  );
  assert.match(source, /__forgeApplyResult\(this\.choice_box\.isNull \? null : this\.choice_box\.isRight === true\)/);
});
