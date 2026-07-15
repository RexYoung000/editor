import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIBRARY_QUICK_TAGS,
  matchesLibraryQuickTag,
} from '../src/utils/libraryQuickTags';

function findTag(id: string) {
  const tag = LIBRARY_QUICK_TAGS.find((item) => item.id === id);
  assert.ok(tag, `缺少快捷标签：${id}`);
  return tag;
}

test('用途快捷检索会读取归类目录，不要求文件名重复用途名称', () => {
  const entry = {
    name: '黄-英语1.png',
    libraryPath: '通用素材/二级窗口/S4-S7二级窗口/点亮一下/切图/黄-英语1.png',
  };

  assert.equal(matchesLibraryQuickTag(entry, findTag('highlight')), true);
  assert.equal(matchesLibraryQuickTag(entry, findTag('discussion')), false);
});

test('二级弹窗覆盖二级窗口全部后代目录，但不混入普通通用框', () => {
  const tag = findTag('secondary-dialog');
  assert.equal(tag.label, '二级弹窗');
  assert.equal(tag.group, '基础框体');
  assert.equal(matchesLibraryQuickTag({
    name: '讨论一下-繁体-横.png',
    libraryPath: '通用素材/二级窗口/S8-S10二级窗/S10/切图/讨论一下/讨论一下-繁体-横.png',
  }, tag), true);
  assert.equal(matchesLibraryQuickTag({
    name: '蓝-三排字.png',
    libraryPath: '通用素材/通用框/S4-S7通用框/标题框/切图/标准版/蓝-三排字.png',
  }, tag), false);
});
