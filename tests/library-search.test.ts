import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLibrarySeries,
  displayLibraryDirectoryName,
  displayLibraryPath,
  matchesLibrarySearchQuery,
  normalizeLibrarySearchText,
} from '../src/utils/librarySearch';

test('模糊搜索同时匹配目录和业务别名', () => {
  const entry = {
    name: 'dlx1.png',
    libraryPath: '通用素材/icon纸片人/dlx1.png',
  };

  assert.equal(matchesLibrarySearchQuery(entry, 'IP人物'), true);
  assert.equal(matchesLibrarySearchQuery(entry, '大力熊'), true);
  assert.equal(matchesLibrarySearchQuery(entry, 'IP 大力熊'), true);
  assert.equal(matchesLibrarySearchQuery(entry, '皮皮虎'), false);
});

test('目录名可以直接搜索到其全部后代资源', () => {
  const entry = {
    name: '公交车正.png',
    libraryPath: '通用素材/道具素材/交通工具/公交车正.png',
  };

  assert.equal(matchesLibrarySearchQuery(entry, '道具'), true);
  assert.equal(matchesLibrarySearchQuery(entry, '交通 工具'), true);
  assert.equal(matchesLibrarySearchQuery(entry, '动物'), false);
});

test('搜索会忽略常见分隔符、英文大小写和全半角差异', () => {
  assert.equal(normalizeLibrarySearchText('ＩＰ-人物 / S7'), 'ip人物s7');
});

test('资源目录使用老师可理解的展示名称，底层路径无需改名', () => {
  assert.equal(displayLibraryDirectoryName('icon纸片人'), 'IP人物');
  assert.equal(displayLibraryDirectoryName('道具素材'), '道具');
  assert.equal(displayLibraryPath(['通用素材', 'icon纸片人']), '通用素材 / IP人物');
});

test('系列识别只接受独立的 S 编号，不把角色缩写末尾数字误判成系列', () => {
  assert.equal(detectLibrarySeries('通用素材/icon纸片人/syls1.png'), '');
  assert.equal(detectLibrarySeries('通用素材/icon纸片人/S7大力熊.png'), 'S7');
  assert.equal(detectLibrarySeries('通用素材/二级窗口/S4-S7二级窗口/点亮一下.png'), 'S4-S7');
});
