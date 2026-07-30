import assert from 'node:assert/strict';
import test from 'node:test';
import type { Course, Element } from '../src/types';
import { buildExportRegressionArtifacts } from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  evaluationCourseFixture,
  homeworkCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
  reviewCourseFixture,
} from './fixtures/export-courses';

function count(source: string, value: string): number {
  return source.split(value).length - 1;
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
