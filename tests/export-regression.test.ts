import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExportRegressionArtifacts,
  mapGameZipEntryToProjectPath,
} from '../src/utils/exportProject';
import { buildPreviewExportRegressionArtifacts } from '../src/utils/exportPreviewProject';
import {
  evaluationCourseFixture,
  exportPaths,
  homeworkCourseFixture,
  internalPagesCourseFixture,
  normalCourseFixture,
  previewCourseFixture,
  regressionImageSizes,
  reviewCourseFixture,
} from './fixtures/export-courses';

interface SceneNode {
  type?: string;
  props?: Record<string, unknown>;
  child?: SceneNode[];
}

interface ResourceEntry {
  url: string;
  type?: string;
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

function findNode(
  scenario: string,
  scene: Record<string, unknown>,
  predicate: (node: SceneNode) => boolean,
  description: string,
): SceneNode {
  const found = sceneNodes(scene).find(predicate);
  assert.ok(found, `[${scenario}] 缺少场景节点：${description}`);
  return found;
}

function configPages(config: Record<string, unknown>): Record<string, unknown>[] {
  assert.ok(Array.isArray(config.pages), 'config.pages 应为数组');
  return config.pages as Record<string, unknown>[];
}

function resourceEntries(page: Record<string, unknown>): ResourceEntry[] {
  assert.ok(Array.isArray(page.res), '页面 res 应为数组');
  return page.res as ResourceEntry[];
}

function assertResource(
  scenario: string,
  entries: ResourceEntry[],
  expected: ResourceEntry,
): void {
  assert.ok(
    entries.some((entry) => entry.url === expected.url && entry.type === expected.type),
    `[${scenario}] 缺少资源 ${JSON.stringify(expected)}，实际为 ${JSON.stringify(entries)}`,
  );
}

test('正常课导出保护场景节点、变量动作与图片音频 Spine 内置资源', () => {
  const course = normalCourseFixture();
  course.stages[0].subPages[0].elements[0].props._editorLabel = '老师可读图层名称';
  const artifacts = buildExportRegressionArtifacts(
    course,
    regressionImageSizes('game_lt'),
  );

  assert.equal(artifacts.viewDir, 'game_lt', '[正常课] 资源命名空间');
  assert.deepEqual(
    {
      small: artifacts.resources[exportPaths.smallImage],
      large: artifacts.resources[exportPaths.largeImage],
      actionSound: artifacts.resources[exportPaths.actionSound],
      voiceSound: artifacts.resources[exportPaths.voiceSound],
      spine: artifacts.resources[exportPaths.spine],
      spineTexture: artifacts.resources[exportPaths.spine.replace(/\.sk$/, '.png')],
      video: artifacts.resources[exportPaths.normalVideo],
      builtin: artifacts.resources[exportPaths.builtinConfirm],
    },
    {
      small: 'game_lt/image/img/small.png',
      large: 'game_lt/image/img/large.png',
      actionSound: 'game_lt/sound/action.mp3',
      voiceSound: 'game_lt/sound/voice.mp3',
      spine: 'game_lt/animation/hero/hero.sk',
      spineTexture: 'game_lt/animation/hero/hero.png',
      video: 'game_lt/animation/intro.mp4',
      builtin: 'game_lt/image/img/btn_qd2.png',
    },
    '[正常课] 资源路径转换',
  );

  assert.equal(artifacts.scenes.length, 1, '[正常课] 视频关卡不生成 scene');
  const [scene] = artifacts.scenes;
  assert.equal(
    sceneNodes(scene.scene).some((node) => '_editorLabel' in (node.props ?? {})),
    false,
    '[正常课] 编辑器图层名称不得进入运行场景',
  );
  assert.equal(scene.name, 'GameLT1_1');
  assert.deepEqual(
    (scene.scene.props as Record<string, unknown>),
    {
      width: 1920,
      height: 1080,
      sceneColor: '#000000',
      runtime: 'view/game_lt/GameLT1_1.ts',
    },
    '[正常课] 场景根属性',
  );

  const lockBox = findNode(
    '正常课',
    scene.scene,
    (node) => node.props?.var === '_lockBox',
    '_lockBox 运行包装节点',
  );
  assert.equal(lockBox.type, 'Box');
  assert.equal(lockBox.child?.[0]?.type, 'KlInputImage');

  const drag = findNode(
    '正常课',
    scene.scene,
    (node) => node.type === 'DragObj' && node.props?.name === 'drag1',
    'DragObj',
  );
  assert.deepEqual(
    { x: drag.props?.x, y: drag.props?.y, childCount: drag.child?.length },
    { x: 140, y: 240, childCount: 2 },
    '[正常课] DragObj 中心锚点补偿与双皮肤子节点',
  );
  assert.deepEqual(
    drag.child?.map((child) => ({
      skin: child.props?.skin,
      visible: child.props?.visible ?? true,
    })),
    [
      { skin: 'game_lt/image/img/drag.png', visible: true },
      { skin: 'game_lt/image/img/drag-done.png', visible: false },
    ],
    '[正常课] DragObj 皮肤路径和放置态',
  );

  const input = findNode(
    '正常课',
    scene.scene,
    (node) => node.type === 'KlInputImage',
    'KlInputImage 固定运行子节点',
  );
  assert.equal(input.child?.length, 3, '[正常课] KlInputImage 应注入三态皮肤');

  assert.match(scene.source, /this\.submit_btn\.on\('click'/);
  assert.match(scene.source, /var t = this\._1_target; if \(t\) t\.visible = false;/);
  assert.match(scene.source, /this\.playSound\("game_lt\/sound\/action\.mp3"\);/);
  assert.match(scene.source, /this\.showAnswerFace\(1\);/);

  const pages = configPages(artifacts.config);
  assert.equal(pages.length, 2);
  const normalPage = pages[0];
  const subviews = normalPage.subviews as Record<string, unknown>[];
  assert.deepEqual(
    subviews[0],
    {
      view: 'view/game_lt/GameLT1_1.ts',
      param: '1',
      classType: 'lt',
    },
    '[正常课] 教学页配置',
  );
  const resources = resourceEntries(normalPage);
  assertResource('正常课', resources, { url: 'game_lt/image/img/large.png', type: 'image' });
  assertResource('正常课', resources, { url: 'game_lt/sound/action.mp3', type: 'sound' });
  assertResource('正常课', resources, { url: 'game_lt/sound/voice.mp3', type: 'sound' });
  assertResource('正常课', resources, { url: 'game_lt/animation/hero/hero.sk' });
  assertResource('正常课', resources, { url: 'game_lt/animation/hero/hero.png', type: 'image' });
  assertResource('正常课', resources, { url: 'res/atlas/game_lt/image/img.atlas' });
  assert.deepEqual(
    pages[1],
    {
      type: 'video',
      videoUrl: 'game_lt/animation/intro.mp4',
      classType: 'gc',
    },
    '[正常课] 视频关卡配置',
  );
});

test('作业课导出保持 game_hw 工程、作业配置与场景代码', () => {
  const artifacts = buildExportRegressionArtifacts(
    homeworkCourseFixture(),
    regressionImageSizes('game_hw'),
  );

  assert.equal(artifacts.viewDir, 'game_hw');
  assert.equal(artifacts.scenes.length, 1);
  assert.equal(artifacts.scenes[0].name, 'Game1');
  assert.match(artifacts.scenes[0].source, /extends ui\.game_hw\.Game1UI/);
  assert.match(artifacts.scenes[0].source, /get result\(\)/);
  assert.deepEqual(
    {
      classify: artifacts.config.classify,
      newEva: artifacts.config.newEva,
      isSound: artifacts.config.isSound,
      feedback: artifacts.config.feedback,
    },
    {
      classify: 'homeworkOnline',
      newEva: 1,
      isSound: false,
      feedback: 'spirit',
    },
    '[作业课] 顶层配置',
  );
  const [page] = configPages(artifacts.config);
  assert.equal(page.view, 'view/game_hw/Game1.ts');
  assertResource('作业课', resourceEntries(page), {
    url: 'game_hw/image/img/large.png',
    type: 'image',
  });
  assertResource('作业课', resourceEntries(page), {
    url: 'game_hw/sound/btn_click.wav',
    type: 'sound',
  });
  assertResource('作业课', resourceEntries(page), {
    url: 'game_hw/sound/wrong.mp3',
    type: 'sound',
  });
});

test('专题测评复用 game_hw 结构但保持独立 classify 且不写 newEva', () => {
  const artifacts = buildExportRegressionArtifacts(
    evaluationCourseFixture(),
    regressionImageSizes('game_hw'),
  );

  assert.equal(artifacts.viewDir, 'game_hw');
  assert.equal(artifacts.config.classify, 'sEvaluation');
  assert.equal('newEva' in artifacts.config, false, '[专题测评] 不应写作业 newEva 字段');
  assert.equal(configPages(artifacts.config)[0].view, 'view/game_hw/Game1.ts');
  assert.match(artifacts.scenes[0].source, /extends ui\.game_hw\.Game1UI/);
});

test('预习导出保持独立资源前缀、预习页面类型和视频差异', () => {
  const artifacts = buildPreviewExportRegressionArtifacts(
    previewCourseFixture(),
    regressionImageSizes('game_preview'),
  );

  assert.equal(artifacts.viewDir, 'game_preview');
  assert.deepEqual(
    {
      image: artifacts.resources[exportPaths.largeImage],
      video: artifacts.resources[exportPaths.previewVideo],
      builtin: artifacts.resources[exportPaths.builtinConfirm],
    },
    {
      image: 'game_preview/image/img/large.png',
      video: 'game_preview/animation/preview.mp4',
      builtin: 'game_preview/image/img/btn_qd2.png',
    },
    '[预习] 资源路径转换',
  );
  assert.equal(artifacts.scenes.length, 1, '[预习] 视频关卡不生成 scene');
  assert.match(artifacts.scenes[0].source, /extends ui\.game_preview\.Game1UI/);
  assert.match(
    artifacts.scenes[0].source,
    /game_preview\/sound\/wrong\.mp3/,
    '[预习] 普通用户 Action 生成场景绑定代码',
  );

  assert.equal(artifacts.config.mode, 'preview');
  const pages = configPages(artifacts.config);
  assert.deepEqual(
    {
      name: pages[0].name,
      subviews: pages[0].subviews,
    },
    {
      name: '预习1',
      subviews: [{
        view: 'view/game_preview/Game1.ts',
        param: '1',
        classType: 'yx',
      }],
    },
    '[预习] 普通大关卡通过 subviews 承载小关卡',
  );
  assertResource('预习', resourceEntries(pages[0]), {
    url: 'game_preview/image/img/large.png',
    type: 'image',
  });
  assertResource('预习', resourceEntries(pages[0]), {
    url: 'game_preview/sound/wrong.mp3',
    type: 'sound',
  });
  assert.deepEqual(
    pages[1],
    {
      type: 'video',
      videoUrl: 'game_preview/animation/preview.mp4',
      classType: 'yxdh',
    },
    '[预习] 视频页面配置',
  );
});

test('正式与预习导出复用同一套场景节点和特殊组件规则', () => {
  const course = normalCourseFixture();
  course.previewStages = [structuredClone(course.stages[0])];

  const normal = buildExportRegressionArtifacts(course);
  const preview = buildPreviewExportRegressionArtifacts(course);
  const normalScene = normal.scenes[0].scene;
  const previewScene = preview.scenes[0].scene;
  const normalizeNamespace = (scene: Record<string, unknown>) => JSON.parse(
    JSON.stringify(scene)
      .replaceAll('game_lt', 'game_preview')
      .replaceAll('GameLT1_1', 'Game1'),
  ) as Record<string, unknown>;

  assert.deepEqual(
    previewScene,
    normalizeNamespace(normalScene),
    '[共享场景] 除工程命名空间和场景名外，节点、变量、包装和特殊组件结构应一致',
  );
});

test('预习场景不会注入未收集的正课口才反馈资源', () => {
  const course = previewCourseFixture();
  const page = course.previewStages?.[0]?.subPages[0];
  assert.ok(page);
  page.elements[0].actions = [{
    id: 'preview-ch-feedback',
    event: 'onClickInitConfirmCH',
    actionType: 'none',
  }];

  const artifacts = buildPreviewExportRegressionArtifacts(course);
  const feedbackNodes = sceneNodes(artifacts.scenes[0].scene).filter((node) =>
    node.props?.var === 'Spine_kcFeedbackYes' || node.props?.var === 'Spine_kcFeedbackNo'
  );

  assert.equal(feedbackNodes.length, 0, '[预习] 不应生成正课专用口才反馈节点');
  assert.equal(
    Object.values(artifacts.resources).some((resource) => resource.includes('/animation/zx_')),
    false,
    '[预习] 不应收集正课专用口才反馈资源',
  );
});

test('共享 game.zip 映射保持内置资源引用路径与解压落点一致', () => {
  assert.deepEqual(
    {
      animation: mapGameZipEntryToProjectPath('animation/zx_yes/zx_yes.sk', 'game_preview'),
      sound: mapGameZipEntryToProjectPath('sound/right.mp3', 'game_preview'),
      image: mapGameZipEntryToProjectPath('image/btn_qd2.png', 'game_preview'),
      groupedImage: mapGameZipEntryToProjectPath('jpL11/jp_3.png', 'game_preview'),
    },
    {
      animation: 'game_preview/animation/zx_yes/zx_yes.sk',
      sound: 'game_preview/sound/right.mp3',
      image: 'game_preview/image/img/btn_qd2.png',
      groupedImage: 'game_preview/image/jpL11/jp_3.png',
    },
  );
});

test('复习课只生成视频配置并保持固定重命名与分级关系', () => {
  const artifacts = buildExportRegressionArtifacts(reviewCourseFixture());

  assert.equal(artifacts.viewDir, 'game_review');
  assert.equal(artifacts.scenes.length, 0);
  assert.deepEqual(
    {
      first: artifacts.resources[exportPaths.reviewVideo1],
      second: artifacts.resources[exportPaths.reviewVideo2],
    },
    {
      first: 'game_review/animation/review-1.mp4',
      second: 'game_review/animation/review-2.mp4',
    },
    '[复习课] 原始视频资源映射',
  );
  assert.deepEqual(
    artifacts.config,
    {
      release: 'dev',
      classify: 'JLReviewSecond',
      JLReviewSecondLevel: '[[0],[1]]',
      pages: [
        { type: 'video', videoUrl: 'game_review/animation/video1.mp4' },
        { type: 'video', videoUrl: 'game_review/animation/video2.mp4' },
      ],
    },
    '[复习课] config.json 结构',
  );
});

test('内部页面导出生成持久根节点、弹窗遮罩和页面动作运行代码', () => {
  const artifacts = buildExportRegressionArtifacts(
    internalPagesCourseFixture(),
    regressionImageSizes('game_lt'),
  );

  assert.equal(artifacts.scenes.length, 1);
  const [scene] = artifacts.scenes;
  const mainRoot = findNode(
    '内部页面',
    scene.scene,
    (node) => node.props?.var === '__iproot_main_page',
    '主界面持久根节点',
  );
  const contentRoot = findNode(
    '内部页面',
    scene.scene,
    (node) => node.props?.var === '__iproot_content_page',
    '内容页持久根节点',
  );
  const dialogRoot = findNode(
    '内部页面',
    scene.scene,
    (node) => node.props?.var === '__iproot_dialog_page',
    '弹窗持久根节点',
  );
  assert.deepEqual(
    {
      main: mainRoot.props?.visible,
      content: contentRoot.props?.visible,
      dialog: dialogRoot.props?.visible,
    },
    {
      main: true,
      content: false,
      dialog: false,
    },
    '[内部页面] 初始显隐',
  );
  const mask = findNode(
    '内部页面',
    scene.scene,
    (node) => node.props?.name === '__ipmask_dialog_page',
    '弹窗遮罩',
  );
  assert.deepEqual(
    {
      alpha: mask.props?.alpha,
      mouseEnabled: mask.props?.mouseEnabled,
      mouseThrough: mask.props?.mouseThrough,
    },
    {
      alpha: 0.5,
      mouseEnabled: true,
      mouseThrough: false,
    },
    '[内部页面] 弹窗遮罩属性',
  );

  assert.match(scene.source, /private __forgePageRoots/);
  assert.match(scene.source, /this\.__forgeShowContent\("content-page"\);/);
  assert.match(scene.source, /this\.__forgeOpenDialog\("dialog-page"\);/);
  assert.match(scene.source, /this\.__forgeCloseDialog\(\);/);
  assert.match(scene.source, /case "content-page": var t = this\.content_label;/);
  assert.equal(configPages(artifacts.config)[0].subviews instanceof Array, true);
});
