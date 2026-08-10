import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element } from '../src/types';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  evaluationCourseFixture,
  exportPaths,
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
  reviewCourseFixture,
} from './fixtures/export-courses';

interface SceneNode {
  type?: string;
  props?: Record<string, unknown>;
  child?: SceneNode[];
}

function count(source: string, value: string): number {
  return source.split(value).length - 1;
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

function findSceneNode(scene: Record<string, unknown>, name: string): SceneNode {
  const node = sceneNodes(scene).find((item) => item.props?.name === name || item.props?.var === name);
  assert.ok(node, `应导出场景节点 ${name}`);
  return node;
}

function assertClickHotZone(label: string, node: SceneNode): void {
  assert.equal(node.props?.mouseEnabled, true, `[${label}] 点击触发源应启用鼠标热区`);
  assert.equal(node.props?.mouseThrough, false, `[${label}] 点击触发源不应穿透点击`);
}

function configureOrdinaryActions(course: Course, preview = false): void {
  const stages = preview ? course.previewStages ?? [] : course.stages;
  const page = stages[0]?.subPages[0];
  assert.ok(page);
  const trigger = page.elements.find((element) => element.layaType === 'ScaleButton');
  const target = page.elements.find((element) => element !== trigger);
  assert.ok(trigger);
  assert.ok(target);

  trigger.actions = [
    {
      id: `${course.id}-click-sound`,
      event: 'onClickSound',
      actionType: 'playRightSound',
    },
    {
      id: `${course.id}-toggle`,
      event: 'onClickSound',
      actionType: 'toggleVisible',
      targetId: target.id,
    },
  ];
  target.actions = [
    {
      id: `${course.id}-load`,
      event: 'onLoad',
      actionType: 'setVisible',
      value: true,
    },
    {
      id: `${course.id}-change`,
      event: 'onChange',
      actionType: 'setProperty',
      targetId: target.id,
      property: 'alpha',
      value: 0.5,
    },
  ];
}

function assertOrdinaryBindings(label: string, source: string): void {
  assert.equal(count(source, ".on('click'"), 1, `[${label}] 同一点击事件只应绑定一次`);
  assert.equal(count(source, '/sound/btn_click.wav'), 1, `[${label}] 每次点击只应注入一次点击音效`);
  assert.equal(count(source, '/sound/right.mp3'), 1, `[${label}] 正确音效动作应生成一次`);
  assert.equal(count(source, '.visible = !t.visible'), 1, `[${label}] 显隐动作应生成一次`);
  assert.equal(count(source, ".on('display'"), 1, `[${label}] onLoad 应生成监听`);
  assert.equal(count(source, ".on('change'"), 1, `[${label}] onChange 应生成监听`);
}

test('正课、预习、作业和专题测评共享普通事件绑定且不重复注入点击音效', () => {
  const normal = normalCourseFixture();
  configureOrdinaryActions(normal);
  assertOrdinaryBindings('正课', buildExportRegressionArtifacts(normal).scenes[0].source);

  const preview = previewCourseFixture();
  configureOrdinaryActions(preview, true);
  assertOrdinaryBindings('预习', buildPreviewExportRegressionArtifacts(preview).scenes[0].source);

  const homework = homeworkCourseFixture();
  configureOrdinaryActions(homework);
  assertOrdinaryBindings('作业', buildExportRegressionArtifacts(homework).scenes[0].source);

  const evaluation = evaluationCourseFixture();
  configureOrdinaryActions(evaluation);
  assertOrdinaryBindings('专题测评', buildExportRegressionArtifacts(evaluation).scenes[0].source);
});

test('复习课继续保持纯视频结构且不生成普通事件场景', () => {
  const review = reviewCourseFixture();
  const firstVideo = review.stages[0].subPages[0].elements[0] as Element;
  firstVideo.actions = [{
    id: 'review-click',
    event: 'onClickSound',
    actionType: 'playRightSound',
  }];

  assert.equal(buildExportRegressionArtifacts(review).scenes.length, 0);
});

test('普通图片和文本作为点击触发源时自动导出运行时点击热区', () => {
  const scenarios = [
    { label: '正课', course: normalCourseFixture(), preview: false, previewExport: false },
    { label: '预习', course: previewCourseFixture(), preview: true, previewExport: true },
    { label: '作业', course: homeworkCourseFixture(), preview: false, previewExport: false },
    { label: '专题测评', course: evaluationCourseFixture(), preview: false, previewExport: false },
  ];

  for (const scenario of scenarios) {
    const stages = scenario.preview ? scenario.course.previewStages ?? [] : scenario.course.stages;
    const page = stages[0]?.subPages[0];
    assert.ok(page, `[${scenario.label}] 应存在测试页面`);
    const target = page.elements.find((element) => element.type === 'Image') ?? page.elements[0];
    assert.ok(target, `[${scenario.label}] 应存在显隐目标`);

    page.elements.push(
      {
        id: `${scenario.course.id}-image-trigger`,
        type: 'Image',
        layaType: 'Image',
        name: 'ordinary_image_trigger',
        x: 40,
        y: 40,
        width: 120,
        height: 80,
        rotation: 0,
        opacity: 1,
        props: { skin: exportPaths.smallImage },
        actions: [{
          id: `${scenario.course.id}-image-toggle`,
          event: 'onClick',
          actionType: 'toggleVisible',
          targetId: target.id,
        }],
      },
      {
        id: `${scenario.course.id}-text-trigger`,
        type: 'NewTextArea',
        layaType: 'TextArea',
        name: 'ordinary_text_trigger',
        x: 200,
        y: 40,
        width: 220,
        height: 80,
        rotation: 0,
        opacity: 1,
        props: {
          text: '点击文本',
          fontSize: 32,
          color: '#ffffff',
          mouseEnabled: false,
        },
        actions: [{
          id: `${scenario.course.id}-text-show`,
          event: 'onClick',
          actionType: 'setVisible',
          targetId: target.id,
          value: true,
        }],
      },
    );

    const artifact = scenario.previewExport
      ? buildPreviewExportRegressionArtifacts(scenario.course).scenes[0]
      : buildExportRegressionArtifacts(scenario.course).scenes[0];
    assertClickHotZone(`${scenario.label} 图片`, findSceneNode(artifact.scene, 'ordinary_image_trigger'));
    assertClickHotZone(`${scenario.label} 文本`, findSceneNode(artifact.scene, 'ordinary_text_trigger'));
    assert.match(artifact.source, /this\.ordinary_image_trigger\.on\('click'/);
    assert.match(artifact.source, /this\.ordinary_text_trigger\.on\('click'/);
    assert.match(artifact.source, /\.visible = !t\.visible/);
    assert.match(artifact.source, /\.visible = true/);
  }
});
