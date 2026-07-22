import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const fullSdkPath = 'preview-server/share/sdk/sdk_baiya.js';
const gameLoaderPath = 'preview-server/libs/GameLoader.max.js';
const toolbarPath = 'src/components/Toolbar.tsx';
const feedbackSounds = [
  'share/animation/yee_WAV.wav',
  'share/animation/zaixiangxiang.wav',
  'share/animation/taikexi.wav',
];

test('完整 SDK 为豌豆精灵正确、错误和未完成反馈绑定原有音效', () => {
  const source = readFileSync(fullSdkPath, 'utf8');

  for (const sound of feedbackSounds) {
    assert.match(source, new RegExp(sound.replace('.', '\\.')));
  }
  assert.match(
    source,
    /fdata\["sound"\]=this\.WAN_DOU_ANSWER_FACE_ARR\[idx\];/,
  );
  assert.match(source, /if \(skName !="wandou"\)/);
  assert.match(
    source,
    /if \(skName !="wandou"\)[\s\S]*?LEDI_RIGHT_SOUND[\s\S]*?LEDI_WRONG_SOUND/,
  );
  assert.match(source, /KlSoundManager\.playSoundUnSync\(s\);/);
});

test('豌豆精灵反馈音效资源完整存在', () => {
  for (const sound of feedbackSounds) {
    assert.equal(existsSync(`preview-server/${sound}`), true, sound);
  }
});

test('forge 预览继续使用完整 SDK 以保留鼠标同步链路', () => {
  const toolbarSource = readFileSync(toolbarPath, 'utf8');
  const gameLoaderSource = readFileSync(gameLoaderPath, 'utf8');

  assert.match(toolbarSource, /&sdk=full/);
  assert.match(gameLoaderSource, /var forceFullSdk=urlParam\.sdk=="full";/);
  assert.match(gameLoaderSource, /this\.sdkUrl="share\/sdk\/sdk_baiya\.js";/);
  assert.match(gameLoaderSource, /this\.subSdkUrl=null;/);
});
