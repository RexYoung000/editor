import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Action, Course, Element, Page } from '../src/types';
import { SDK_JUDGE_EVENT } from '../src/utils/sdkJudge';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

function element(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: 'NewImage',
    layaType: 'Image',
    name: `${id}RuntimeName`,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
    actions: [],
    ...overrides,
  };
}

function courseWith(page: Page): Course {
  return {
    id: 'action-label-course',
    stages: [{ id: 'stage', name: '关卡', subPages: [page] }],
  };
}

async function renderActionEditor(selected: Element, allElements: Element[]): Promise<string> {
  const [{ default: ActionEditor }, { I18nContext }, { useEditorStore }] = await Promise.all([
    import('../src/components/ActionEditor'),
    import('../src/i18n/context'),
    import('../src/store/editorStore'),
  ]);
  const page: Page = { id: 'page', name: '页面', elements: allElements };
  useEditorStore.setState({
    currentCourse: courseWith(page),
    currentSubPageId: page.id,
    currentInternalPageId: null,
  });
  return renderToStaticMarkup(createElement(
    I18nContext.Provider,
    {
      value: {
        language: 'zh',
        setLanguage: () => undefined,
        t: (key: string) => key,
      },
    },
    createElement(ActionEditor, {
      element: selected,
      pages: [page],
      allElements,
      onChange: () => undefined,
    }),
  ));
}

test('事件目标显示最新图层名称，改名不改变稳定目标 ID', async () => {
  const targetId = 'stable-target-id';
  const action: Action = {
    id: 'action',
    event: 'onClick',
    actionType: 'toggleVisible',
    targetId,
    targetNameSnapshot: '旧名称快照',
    groupId: 'group',
  };
  const trigger = element('trigger', {
    props: { _editorLabel: '触发按钮' },
    actions: [action],
  });
  const target = element(targetId, { props: { _editorLabel: '改名前目标' } });

  const before = await renderActionEditor(trigger, [trigger, target]);
  assert.match(before, /改名前目标 \(图片\)/);
  assert.doesNotMatch(before, /旧名称快照/);

  const renamedTarget = { ...target, props: { ...target.props, _editorLabel: '改名后目标' } };
  const after = await renderActionEditor(trigger, [trigger, renamedTarget]);
  assert.match(after, /改名后目标 \(图片\)/);
  assert.doesNotMatch(after, /改名前目标/);
  assert.equal(action.targetId, targetId);
});

test('SDK 判定目标和入站引用显示当前图层名称', async () => {
  const judgeTarget = element('judge-target', {
    type: 'KlInputImage',
    layaType: 'KlInputImage',
    props: { _editorLabel: '答案输入格' },
  });
  const trigger = element('judge-trigger', {
    props: { _editorLabel: '提交判断' },
    actions: [{
      id: 'judge-action',
      event: SDK_JUDGE_EVENT,
      actionType: 'showAnswerRight',
      groupId: 'judge-group',
      branchId: 'right-branch',
      branchCondition: 'right',
      judgeTargetId: judgeTarget.id,
      judgeTargetNameSnapshot: '旧判定快照',
    }],
  });

  const triggerMarkup = await renderActionEditor(trigger, [trigger, judgeTarget]);
  assert.match(triggerMarkup, /答案输入格/);
  assert.doesNotMatch(triggerMarkup, /旧判定快照/);

  const targetMarkup = await renderActionEditor(judgeTarget, [trigger, judgeTarget]);
  assert.match(targetMarkup, /提交判断/);
  assert.doesNotMatch(targetMarkup, /judge-triggerRuntimeName/);
});
