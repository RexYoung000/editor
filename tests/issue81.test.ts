import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BUILTIN_ASSETS } from '../src/elements/builtinAssets';
import { KEYBOARD_PRESETS } from '../src/elements/keyboardPresets';

function readBuiltin(relativePath: string): Buffer {
  return readFileSync(join(process.cwd(), 'public/builtin', relativePath));
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function pngSize(buffer: Buffer): { width: number; height: number } {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test('黄色分数按钮使用已确认的普通态和按下态资源', () => {
  const normal = BUILTIN_ASSETS.find((asset) => asset.id === 'keyboard.math.fractionNormal');
  const active = BUILTIN_ASSETS.find((asset) => asset.id === 'keyboard.math.fractionActive');
  assert.ok(normal);
  assert.ok(active);
  assert.deepEqual(normal, {
    id: 'keyboard.math.fractionNormal',
    src: 'runtime/game/mathKeyboard/img_fraction1.png',
    exportPath: 'game/mathKeyboard/img_fraction1.png',
  });
  assert.deepEqual(active, {
    id: 'keyboard.math.fractionActive',
    src: 'runtime/game/mathKeyboard/img_fraction2.png',
    exportPath: 'game/mathKeyboard/img_fraction2.png',
  });

  const normalPng = readBuiltin(normal.src);
  const activePng = readBuiltin(active.src);
  assert.deepEqual(pngSize(normalPng), { width: 47, height: 42 });
  assert.deepEqual(pngSize(activePng), { width: 47, height: 42 });
  assert.equal(sha256(normalPng), 'ca77864c5537ee7c529bab3db6aacc98a8c6e5621459e4e70be856edebc436da');
  assert.equal(sha256(activePng), '7adb5a98e973706753cdd4a65940bc66bfa0d7640f67a20dab515daaf275cac4');
});

test('分数键盘选择器缩略图同步黄色分数图标', () => {
  const preset = KEYBOARD_PRESETS.find((item) => item.id === 'fraction');
  assert.equal(preset?.thumbnail, '/builtin/editor/keyboard-fraction-thumb.png');

  const thumbnail = readBuiltin('editor/keyboard-fraction-thumb.png');
  assert.deepEqual(pngSize(thumbnail), { width: 460, height: 550 });
  assert.equal(sha256(thumbnail), '66a7cd3f82826e2024d51c5aebedfa0854d13244805e9034b2050a729cc1289a');
});
