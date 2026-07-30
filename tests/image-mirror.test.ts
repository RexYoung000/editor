import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element } from '../src/types';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  getImageMirrorTransform,
  toggleImageMirrorProps,
} from '../src/utils/imageMirror';

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  window: { electronAPI: {} },
});

interface SceneNode {
  type?: string;
  props?: Record<string, unknown>;
  child?: SceneNode[];
}

function image(overrides: Partial<Element> = {}): Element {
  return {
    id: 'mirror-image',
    type: 'NewImage',
    layaType: 'Image',
    x: 100,
    y: 200,
    width: 300,
    height: 120,
    rotation: 0,
    opacity: 1,
    name: 'mirror_image',
    props: { skin: 'images/mirror.png' },
    ...overrides,
  };
}

function courseWith(element: Element): Course {
  return {
    id: 'mirror-course',
    stages: [{
      id: 'stage',
      name: '关卡 1',
      subPages: [{ id: 'page', name: '小关卡 1-1', elements: [element] }],
    }],
  };
}

function findImageNode(scene: Record<string, unknown>): SceneNode {
  const pending: SceneNode[] = [scene as SceneNode];
  while (pending.length > 0) {
    const node = pending.shift()!;
    if (node.type === 'Image' && node.props?.name === 'mirror_image') return node;
    pending.push(...(node.child ?? []));
  }
  assert.fail('导出场景中缺少镜像图片节点');
}

function assertClose(actual: unknown, expected: number, message: string): void {
  assert.ok(
    Math.abs(Number(actual) - expected) < 0.000001,
    `${message}：期望 ${expected}，实际 ${String(actual)}`,
  );
}

test('左右与上下镜像独立切换，同方向执行两次恢复原状态', () => {
  const original = image();
  const horizontal = toggleImageMirrorProps(original.props, 'horizontal');
  assert.equal(horizontal.mirrorX, true);
  assert.equal(horizontal.mirrorY, undefined);

  const both = toggleImageMirrorProps(horizontal, 'vertical');
  assert.equal(both.mirrorX, true);
  assert.equal(both.mirrorY, true);

  const restoredHorizontal = toggleImageMirrorProps(both, 'horizontal');
  assert.equal(restoredHorizontal.mirrorX, false);
  assert.equal(restoredHorizontal.mirrorY, true);
});

test('镜像按图片自身方向补偿旋转和非居中锚点，逻辑外框位置不变', () => {
  const element = image({
    rotation: 90,
    props: {
      skin: 'images/mirror.png',
      anchorX: 0.25,
      anchorY: 0.75,
      mirrorX: true,
      mirrorY: true,
    },
  });
  const transform = getImageMirrorTransform(element);

  assertClose(transform.x, 160, '旋转后的 X 补偿');
  assertClose(transform.y, 350, '旋转后的 Y 补偿');
  assert.equal(transform.scaleX, -1);
  assert.equal(transform.scaleY, -1);
  assert.equal(element.x, 100, '课程中的逻辑 X 不应被镜像改写');
  assert.equal(element.y, 200, '课程中的逻辑 Y 不应被镜像改写');
  assert.equal(element.rotation, 90, '镜像不应改写旋转角度');
});

test('镜像操作写入单条历史，支持撤销重做，并拒绝锁定或非图片元素', async () => {
  const { useEditorStore } = await import('../src/store/editorStore');
  useEditorStore.getState().setCurrentCourse(courseWith(image()));

  useEditorStore.getState().mirrorElement('mirror-image', 'horizontal');
  let state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements[0].props.mirrorX, true);
  assert.equal(state.history.length, 2);

  useEditorStore.getState().undo();
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements[0].props.mirrorX, undefined);

  useEditorStore.getState().redo();
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements[0].props.mirrorX, true);

  useEditorStore.getState().setElementLocked('mirror-image', true);
  const lockedHistoryLength = useEditorStore.getState().history.length;
  useEditorStore.getState().mirrorElement('mirror-image', 'vertical');
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements[0].props.mirrorY, undefined);
  assert.equal(state.history.length, lockedHistoryLength);

  useEditorStore.getState().setCurrentCourse(courseWith(image({ type: 'ScaleButton' })));
  const nonImageHistoryLength = useEditorStore.getState().history.length;
  useEditorStore.getState().mirrorElement('mirror-image', 'horizontal');
  state = useEditorStore.getState();
  assert.equal(state.currentCourse!.stages[0].subPages[0].elements[0].props.mirrorX, undefined);
  assert.equal(state.history.length, nonImageHistoryLength);
});

test('正课与预习导出统一转换镜像状态，不泄漏编辑字段', () => {
  const mirrored = image({
    rotation: 90,
    props: {
      skin: 'images/mirror.png',
      anchorX: 0.25,
      anchorY: 0.75,
      mirrorX: true,
      mirrorY: true,
    },
  });
  const course = courseWith(mirrored);
  course.previewStages = [structuredClone(course.stages[0])];

  const normalNode = findImageNode(buildExportRegressionArtifacts(course).scenes[0].scene);
  const previewNode = findImageNode(buildPreviewExportRegressionArtifacts(course).scenes[0].scene);

  for (const [scenario, node] of [['正课', normalNode], ['预习', previewNode]] as const) {
    assertClose(node.props?.x, 160, `${scenario} X 补偿`);
    assertClose(node.props?.y, 350, `${scenario} Y 补偿`);
    assert.equal(node.props?.scaleX, -1, `${scenario} 左右镜像`);
    assert.equal(node.props?.scaleY, -1, `${scenario} 上下镜像`);
    assert.equal(node.props?.rotation, 90, `${scenario} 旋转角度`);
    assert.equal('mirrorX' in (node.props ?? {}), false, `${scenario} 不导出 mirrorX`);
    assert.equal('mirrorY' in (node.props ?? {}), false, `${scenario} 不导出 mirrorY`);
  }
});
