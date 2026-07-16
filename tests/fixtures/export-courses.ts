import type { Action, Course, Element, InternalPage, Stage, SubPage } from '../../src/types';
import { assetSrc } from '../../src/elements/builtinAssets';

type ElementInput = Partial<Element> & Pick<Element, 'id' | 'type'>;

function element(input: ElementInput): Element {
  return {
    layaType: input.type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    props: {},
    ...input,
  };
}

function action(input: Partial<Action> & Pick<Action, 'id' | 'event' | 'actionType'>): Action {
  return input;
}

function page(id: string, elements: Element[], extra: Partial<SubPage> = {}): SubPage {
  return { id, name: id, elements, ...extra };
}

function stage(id: string, subPages: SubPage[]): Stage {
  return { id, name: id, subPages };
}

function videoPage(id: string, videoUrl: string): SubPage {
  return page(id, [
    element({
      id: `${id}-video`,
      type: 'Video',
      layaType: 'Video',
      locked: true,
      width: 1920,
      height: 1080,
      props: { videoUrl },
    }),
  ], { frozen: true });
}

export const exportPaths = {
  smallImage: 'images/regression/small.png',
  largeImage: 'images/regression/large.png',
  dragImage: 'images/regression/drag.png',
  dragDoneImage: 'images/regression/drag-done.png',
  actionSound: 'images/sound/action.mp3',
  voiceSound: 'images/sound/voice.mp3',
  spine: 'images/animation/hero/hero.sk',
  normalVideo: 'images/animation/intro.mp4',
  previewVideo: 'images/animation/preview.mp4',
  reviewVideo1: 'images/animation/review-1.mp4',
  reviewVideo2: 'images/animation/review-2.mp4',
  builtinConfirm: assetSrc('btn.confirm'),
  builtinSoundIcon: assetSrc('soundPlaceholder'),
} as const;

export function normalCourseFixture(): Course {
  const target = element({
    id: 'normal-target',
    type: 'Image',
    layaType: 'Image',
    name: '1 target',
    x: 640,
    y: 160,
    width: 700,
    height: 600,
    props: { skin: exportPaths.largeImage },
  });
  const trigger = element({
    id: 'normal-trigger',
    type: 'ScaleButton',
    layaType: 'ScaleButton',
    name: 'submit btn',
    x: 100,
    y: 80,
    width: 160,
    height: 60,
    props: { skin: exportPaths.builtinConfirm, label: '提交' },
    actions: [
      action({
        id: 'normal-visible',
        event: 'onClick',
        actionType: 'setVisible',
        targetId: target.id,
        value: false,
      }),
      action({
        id: 'normal-sound',
        event: 'onClick',
        actionType: 'playSound',
        value: exportPaths.actionSound,
      }),
      action({
        id: 'normal-feedback',
        event: 'onClick',
        actionType: 'showAnswerRight',
      }),
    ],
  });
  return {
    id: 'normal-regression',
    kind: 'normal',
    feedback: 'newLD',
    stages: [
      stage('normal-stage', [
        page('normal-page', [
          trigger,
          target,
          element({
            id: 'normal-small',
            type: 'Image',
            layaType: 'Image',
            x: 320,
            y: 120,
            width: 120,
            height: 80,
            props: { skin: exportPaths.smallImage },
          }),
          element({
            id: 'normal-sound-button',
            type: 'SoundButton',
            layaType: 'SoundButton',
            x: 460,
            y: 120,
            props: {
              skin: exportPaths.builtinSoundIcon,
              soundPath: exportPaths.voiceSound,
              isNeedAni: false,
              showInStu: true,
            },
          }),
          element({
            id: 'normal-spine',
            type: 'Spine',
            layaType: 'SkeletonPlayer',
            x: 900,
            y: 120,
            width: 240,
            height: 240,
            props: { url: exportPaths.spine, currAniName: 'idle' },
          }),
          element({
            id: 'normal-drag',
            type: 'DragObj',
            layaType: 'DragObj',
            name: 'drag1',
            x: 100,
            y: 220,
            width: 80,
            height: 40,
            props: {
              skin: exportPaths.dragImage,
              dropSkin: exportPaths.dragDoneImage,
              hasDrop: 'false',
            },
          }),
          element({
            id: 'normal-input',
            type: 'KlInputImage',
            layaType: 'KlInputImage',
            x: 260,
            y: 260,
            width: 120,
            height: 60,
            props: { answer: '8' },
          }),
        ]),
      ]),
      stage('normal-video-stage', [videoPage('normal-video-page', exportPaths.normalVideo)]),
    ],
  };
}

function flatCourse(kind: 'homework' | 'sEvaluation'): Course {
  return {
    id: `${kind}-regression`,
    kind,
    stages: [
      stage(`${kind}-stage`, [
        page(`${kind}-page`, [
          element({
            id: `${kind}-image`,
            type: 'Image',
            layaType: 'Image',
            name: 'question image',
            x: 80,
            y: 90,
            width: 600,
            height: 500,
            props: { skin: exportPaths.largeImage },
          }),
          element({
            id: `${kind}-button`,
            type: 'ScaleButton',
            layaType: 'ScaleButton',
            name: 'check answer',
            x: 760,
            y: 640,
            width: 180,
            height: 70,
            props: { skin: exportPaths.builtinConfirm },
            actions: [
              action({
                id: `${kind}-sound`,
                event: 'onClickSound',
                actionType: 'playWrongSound',
              }),
            ],
          }),
        ]),
      ]),
    ],
  };
}

export function homeworkCourseFixture(): Course {
  return flatCourse('homework');
}

export function evaluationCourseFixture(): Course {
  return flatCourse('sEvaluation');
}

export function previewCourseFixture(): Course {
  return {
    id: 'preview-regression',
    kind: 'normal',
    stages: [],
    previewStages: [
      stage('preview-stage', [
        page('preview-page', [
          element({
            id: 'preview-image',
            type: 'Image',
            layaType: 'Image',
            name: 'preview image',
            x: 100,
            y: 100,
            width: 700,
            height: 600,
            props: { skin: exportPaths.largeImage },
          }),
          element({
            id: 'preview-button',
            type: 'ScaleButton',
            layaType: 'ScaleButton',
            name: 'preview action',
            x: 860,
            y: 600,
            props: { skin: exportPaths.builtinConfirm },
            actions: [
              action({
                id: 'preview-sound',
                event: 'onClick',
                actionType: 'playWrongSound',
              }),
            ],
          }),
        ]),
      ]),
      stage('preview-video-stage', [videoPage('preview-video-page', exportPaths.previewVideo)]),
    ],
  };
}

export function reviewCourseFixture(): Course {
  return {
    id: 'review-regression',
    kind: 'review',
    stages: [
      stage('review-stage-1', [videoPage('review-page-1', exportPaths.reviewVideo1)]),
      stage('review-stage-2', [videoPage('review-page-2', exportPaths.reviewVideo2)]),
    ],
  };
}

export function internalPagesCourseFixture(): Course {
  const contentPage: InternalPage = {
    id: 'content-page',
    name: '讲解页',
    kind: 'content',
    elements: [
      element({
        id: 'content-label',
        type: 'Label',
        layaType: 'Label',
        name: 'content label',
        x: 300,
        y: 200,
        width: 400,
        height: 80,
        props: { text: '内容页' },
        actions: [
          action({
            id: 'content-load',
            event: 'onLoad',
            actionType: 'setVisible',
            value: true,
          }),
        ],
      }),
    ],
  };
  const dialogPage: InternalPage = {
    id: 'dialog-page',
    name: '提示弹窗',
    kind: 'dialog',
    dialogSettings: {
      maskColor: '#000000',
      maskOpacity: 0.5,
      closeOnMask: true,
    },
    elements: [
      element({
        id: 'dialog-panel',
        type: 'Box',
        layaType: 'Box',
        name: 'dialog panel',
        x: 560,
        y: 260,
        width: 800,
        height: 500,
        props: {},
      }),
    ],
  };
  return {
    id: 'internal-pages-regression',
    kind: 'normal',
    stages: [
      stage('internal-stage', [
        page('main-page', [
          element({
            id: 'open-content',
            type: 'ScaleButton',
            layaType: 'ScaleButton',
            name: 'open content',
            x: 120,
            y: 120,
            props: { skin: exportPaths.builtinConfirm },
            actions: [
              action({
                id: 'navigate-content',
                event: 'onClick',
                actionType: 'navigateInternalPage',
                pageTargetId: contentPage.id,
              }),
              action({
                id: 'open-dialog',
                event: 'onClick',
                actionType: 'openInternalDialog',
                pageTargetId: dialogPage.id,
              }),
            ],
          }),
        ], {
          editorModel: 'internal-pages',
          templateId: 'internal-pages-v1',
          schemaVersion: 1,
          internalPages: [contentPage, dialogPage],
        }),
      ]),
    ],
  };
}

export function regressionImageSizes(viewDir: 'game_lt' | 'game_hw' | 'game_preview'): Map<string, { w: number; h: number }> {
  return new Map([
    [`${viewDir}/image/img/small.png`, { w: 120, h: 80 }],
    [`${viewDir}/image/img/large.png`, { w: 1024, h: 768 }],
    [`${viewDir}/image/img/drag.png`, { w: 80, h: 40 }],
    [`${viewDir}/image/img/drag-done.png`, { w: 80, h: 40 }],
    [`${viewDir}/image/img/btn_qd2.png`, { w: 180, h: 70 }],
    [`${viewDir}/image/img/img_lb.png`, { w: 105, h: 106 }],
  ]);
}
