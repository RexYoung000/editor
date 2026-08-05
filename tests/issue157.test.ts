import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import JSZip from 'jszip';
import { BUILTIN_ASSETS } from '../src/elements/builtinAssets';
import { createDefaultElement } from '../src/elements/elementMeta';
import {
  getKeyboardChildren,
  KEYBOARD_PRESETS,
  type ExportChild,
  type MathKeyboardPresetId,
} from '../src/elements/keyboardPresets';
import { applySpinePreset, SPINE_PRESETS } from '../src/elements/spinePresets';
import type { Element } from '../src/types';
import { buildExportRegressionArtifacts, collectGameZipFiles, collectResources } from '../src/utils/exportProject';
import { playSpineOnce } from '../src/utils/spinePreview';
import { normalCourseFixture } from './fixtures/export-courses';

const percentPresetIds: MathKeyboardPresetId[] = [
  'percent',
  'percentDecimal',
  'percentOperators',
  'percentExpression',
];

function keyboardElement(id: MathKeyboardPresetId, theme: 'yellow' | 'blue' | 'green'): Element {
  const preset = KEYBOARD_PRESETS.find((candidate) => candidate.id === id);
  assert.ok(preset);
  return {
    id: `keyboard-${id}-${theme}`,
    type: 'KlBaseKeyboard',
    layaType: 'KlBaseKeyboard',
    x: 0,
    y: 0,
    width: preset.defaultSize.width,
    height: preset.defaultSize.height,
    rotation: 0,
    opacity: 1,
    props: {
      _keyboardPreset: { id },
      _mathKeyboardTheme: theme,
      camp: `${id}-${theme}`,
    },
  };
}

function keyNodes(children: ExportChild[]): ExportChild[] {
  return children.find((child) => child.props.name === 'keysBox')?.child ?? [];
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('四种百分比键盘使用对应主题的独立图片且保持输出字符不变', () => {
  for (const theme of ['yellow', 'blue', 'green'] as const) {
    for (const presetId of percentPresetIds) {
      const children = getKeyboardChildren(keyboardElement(presetId, theme));
      assert.ok(children);
      const percentKey = keyNodes(children).find((key) => key.props.output === '%');
      assert.ok(percentKey);
      assert.equal(percentKey.child?.length, 2);
      for (const [index, state] of (percentKey.child ?? []).entries()) {
        assert.equal(state.type, 'Image');
        assert.equal(state.child?.length, 1);
        assert.equal(state.child?.[0].type, 'Image');
        assert.equal(state.child?.[0].props.skin, `game/mathKeyboard/${theme}/percent.png`);
        assert.equal(state.child?.[0].props.centerX, 0);
        assert.equal(state.child?.[0].props.centerY, index === 0 ? 0 : 2);
      }
    }
  }
});

test('三色百分号与手指 Spine 使用已确认源文件并完成内置注册', () => {
  const expected = new Map([
    ['keyboard.math.yellow.percent', 'd48a8d16a58b647f73b24a7df941ffac4e160a661cab1d45f9afe4da60104b71'],
    ['keyboard.math.blue.percent', '61b59c41cacb8bfaf055412b80d6caedf9a4e4320ee419a464ed51acb3d9f29d'],
    ['keyboard.math.green.percent', '33d00eac8ac26573d668e300963f40b36dd1d3e2dcbe898ffc5856b86cf67002'],
    ['spine.handClick.sk', '1b66b6287df0fb0aa09b3a91f6c37a143df33f975ec83f73423d1cd3b056e514'],
    ['spine.handClick.png', '43fd6233d8d62c2ddc896d1f0bd7b784247c8afdd9f27517b6f197b7f5401cce'],
  ]);

  for (const [id, hash] of expected) {
    const asset = BUILTIN_ASSETS.find((candidate) => candidate.id === id);
    assert.ok(asset, id);
    const path = join(process.cwd(), 'public/builtin', asset.src);
    assert.ok(existsSync(path), path);
    assert.equal(sha256(path), hash, id);
  }
  const thumbnail = BUILTIN_ASSETS.find((asset) => asset.id === 'spine.handClick.thumbnail');
  assert.ok(thumbnail && existsSync(join(process.cwd(), 'public/builtin', thumbnail.src)));
  assert.equal(thumbnail.exportPath, undefined);
});

test('Spine 预设保留空白入口并按已确认默认值创建手指组件', () => {
  assert.deepEqual(SPINE_PRESETS.map((preset) => preset.id), ['blank', 'hand-click']);

  const blank = applySpinePreset(createDefaultElement('Spine', 'page-157'), SPINE_PRESETS[0]);
  assert.deepEqual([blank.x, blank.y, blank.width, blank.height], [100, 100, 400, 400]);
  assert.equal(blank.props.url, '');

  const hand = applySpinePreset(createDefaultElement('Spine', 'page-157'), SPINE_PRESETS[1]);
  assert.deepEqual([hand.x, hand.y, hand.width, hand.height], [100, 100, 225, 428]);
  assert.equal(hand.props.url, 'game/animation/hand-click/game.sk');
  assert.equal(hand.props.currAniName, 'game_an1');
  assert.equal(hand.props.isLoop, 'false');
  assert.deepEqual(hand.props._animationList, ['game_an1', 'game_an2']);
  assert.deepEqual(hand.props._skFiles, [{
    url: 'game/animation/hand-click/game.sk',
    animations: ['game_an1', 'game_an2'],
  }]);
  assert.deepEqual(hand.props._spinePreset, { id: 'hand-click' });
});

test('右侧 Spine 试听只播放一次并在结束后回到第一帧', () => {
  const calls: Array<unknown[]> = [];
  let onStopped: (() => void) | undefined;
  const obj = {
    play: (...args: [number, boolean, boolean?]) => calls.push(['play', ...args]),
    paused: () => calls.push(['paused']),
    once: (event: string, caller: unknown, listener: () => void) => {
      calls.push(['once', event, caller === obj]);
      onStopped = listener;
    },
    _spinePaused: true,
  };

  playSpineOnce(obj, 1);
  assert.equal(obj._spinePaused, false);
  assert.deepEqual(calls, [
    ['once', 'stopped', true],
    ['play', 1, false, true],
  ]);

  onStopped?.();
  assert.equal(obj._spinePaused, true);
  assert.deepEqual(calls.slice(-2), [
    ['play', 1, true, true],
    ['paused'],
  ]);
});

test('手指内置 Spine 在正式与预览共用资源映射中成对收集', () => {
  const course = normalCourseFixture();
  const page = course.stages[0].subPages[0];
  page.elements.push(applySpinePreset(createDefaultElement('Spine', page.id), SPINE_PRESETS[1]));

  const resourceMap = collectResources(course);
  assert.equal(
    resourceMap.get('game/animation/hand-click/game.sk'),
    'game_lt/animation/hand-click/game.sk',
  );
  assert.equal(
    resourceMap.get('game/animation/hand-click/game.png'),
    'game_lt/animation/hand-click/game.png',
  );
  assert.deepEqual(
    [...collectGameZipFiles(resourceMap)].filter((path) => path.includes('hand-click')).sort(),
    ['animation/hand-click/game.png', 'animation/hand-click/game.sk'],
  );

  const artifacts = buildExportRegressionArtifacts(course);
  const sceneText = JSON.stringify(artifacts.scenes);
  assert.ok(sceneText.includes('game_lt/animation/hand-click/game.sk'));
  assert.ok(!sceneText.includes('_spinePreset'));
  assert.ok(!sceneText.includes('_animationList'));
});

test('game.zip 包含三色百分号和手指 Spine 运行资源', async () => {
  const zip = await JSZip.loadAsync(readFileSync(join(process.cwd(), 'public/builtin/runtime/game.zip')));
  for (const path of [
    'mathKeyboard/yellow/percent.png',
    'mathKeyboard/blue/percent.png',
    'mathKeyboard/green/percent.png',
    'animation/hand-click/game.sk',
    'animation/hand-click/game.png',
  ]) {
    assert.ok(zip.file(path), `game.zip 缺少 ${path}`);
  }
});
