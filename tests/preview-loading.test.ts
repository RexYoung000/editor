import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeFiles = [
  'preview-server/share/sdk/sdk_baiya.js',
  'public/libs/sdk_baiya_base.js',
];

test('预览首屏准备完成后会关闭 GameLoader 启动层', () => {
  for (const file of runtimeFiles) {
    const source = readFileSync(file, 'utf8');
    assert.match(
      source,
      /setLoadingView\(false\);\s*\/\/ 首屏已准备好时关闭 GameLoader 启动层，避免同步恢复事件缺失导致卡在 100%。\s*var gli=com\.biz\.VipThink\.getGameLoader\(true\);\s*if \(gli && !gli\.hasCleard\)\s*VipThink\.destroyGameLoaderProgess\(\);/,
      file,
    );
  }
});
