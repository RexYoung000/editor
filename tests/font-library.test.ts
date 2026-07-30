import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Course, Element } from '../src/types';
import {
  DEFAULT_FONT_FACE,
  DEFAULT_FONT_ID,
  FONT_LIBRARY,
  lookupFont,
  normalizeFontLibraryId,
} from '../src/elements/fontLibrary';
import { migrateCourseFontLibraryIds } from '../src/utils/fontMigration';
import { createInternalPagesSubPage } from '../src/utils/internalPages';

const EXPECTED_FONT_FILES = [
  'Arial-Black.ttf',
  'Arial-Bold.ttf',
  'Arial-BoldItalic.ttf',
  'Arial-Italic.ttf',
  'Arial-Regular.ttf',
  'SimHei.ttf',
  'SourceHanSansCN-Bold.otf',
  'SourceHanSansCN-ExtraLight.otf',
  'SourceHanSansCN-Heavy.otf',
  'SourceHanSansCN-Light.otf',
  'SourceHanSansCN-Medium.otf',
  'SourceHanSansCN-Normal.otf',
  'SourceHanSansCN-Regular.otf',
  '罗马粗.ttf',
  '罗马粗斜.ttf',
  '罗马细.ttf',
  '罗马细斜.ttf',
].sort();

function textElement(id: string, fontLibraryId?: string): Element {
  return {
    id,
    type: 'NewTextArea',
    layaType: 'TextArea',
    name: id,
    x: 0,
    y: 0,
    width: 400,
    height: 100,
    rotation: 0,
    opacity: 1,
    actions: [],
    props: {
      text: id,
      ...(fontLibraryId === undefined ? {} : { fontLibraryId }),
    },
  };
}

test('字体库使用单层唯一配置，并以思源黑体 Regular 为默认字体', () => {
  assert.equal(FONT_LIBRARY.length, 17);
  assert.equal(DEFAULT_FONT_ID, 'source-han-sans-cn.regular');
  assert.equal(DEFAULT_FONT_FACE, 'ForgeSourceHanSansCNRegular');
  assert.equal(lookupFont(DEFAULT_FONT_ID)?.label, '思源黑体 Regular');

  assert.equal(new Set(FONT_LIBRARY.map((font) => font.id)).size, FONT_LIBRARY.length);
  assert.equal(new Set(FONT_LIBRARY.map((font) => font.fontFace)).size, FONT_LIBRARY.length);
  assert.equal(new Set(FONT_LIBRARY.map((font) => font.url)).size, FONT_LIBRARY.length);
  assert.ok(FONT_LIBRARY.every((font) => !('category' in font)));
});

test('字体配置与受版本管理的资源文件一一对应', () => {
  const fontsDir = join(process.cwd(), 'public/builtin/runtime/fonts');
  assert.deepEqual(readdirSync(fontsDir).sort(), EXPECTED_FONT_FILES);

  for (const font of FONT_LIBRARY) {
    const fontPath = join(process.cwd(), 'public', font.url.replace(/^\//, ''));
    assert.equal(existsSync(fontPath), true, `${font.label} 缺少资源 ${font.url}`);
    assert.ok(statSync(fontPath).size > 0, `${font.label} 字体文件为空`);
  }
});

test('旧罗马体保留原字形映射，旧方正和未知字体迁移到默认字体', () => {
  assert.equal(normalizeFontLibraryId('paipeiyou.luomacu'), 'times-new-roman.bold');
  assert.equal(normalizeFontLibraryId('paipeiyou.luomacuxie'), 'times-new-roman.bold-italic');
  assert.equal(normalizeFontLibraryId('paipeiyou.luomaxi'), 'times-new-roman.regular');
  assert.equal(normalizeFontLibraryId('paipeiyou.luomaxixie'), 'times-new-roman.italic');
  assert.equal(normalizeFontLibraryId('paipeiyou.lantinghei'), DEFAULT_FONT_ID);
  assert.equal(normalizeFontLibraryId('koucai.lantingyuan'), DEFAULT_FONT_ID);
  assert.equal(normalizeFontLibraryId('yizhi.lantingyuanzhongcu'), DEFAULT_FONT_ID);
  assert.equal(normalizeFontLibraryId('future.missing-font'), DEFAULT_FONT_ID);
  assert.equal(normalizeFontLibraryId(undefined), DEFAULT_FONT_ID);
  assert.equal(normalizeFontLibraryId('arial.black'), 'arial.black');
});

test('打开历史课件会迁移普通页、内部页面和预习页字体并写入当前数据', () => {
  const internalSubPage = createInternalPagesSubPage('internal-sub', '内部关卡');
  internalSubPage.elements.push(textElement('main-text', 'paipeiyou.lantinghei'));
  internalSubPage.internalPages?.push({
    id: 'content-page',
    name: '内容页',
    kind: 'content',
    elements: [textElement('content-text', 'paipeiyou.luomacu')],
  });

  const course: Course = {
    id: 'legacy-font-course',
    stages: [{ id: 'stage', name: '关卡 1', subPages: [internalSubPage] }],
    previewStages: [{
      id: 'preview-stage',
      name: '预习 1',
      subPages: [{
        id: 'preview-sub',
        name: '预习 1',
        elements: [
          textElement('missing-text'),
          textElement('current-text', 'arial.regular'),
        ],
      }],
    }],
  };

  assert.equal(migrateCourseFontLibraryIds(course), 3);
  assert.equal(internalSubPage.elements[0].props.fontLibraryId, DEFAULT_FONT_ID);
  assert.equal(
    internalSubPage.internalPages?.[0].elements[0].props.fontLibraryId,
    'times-new-roman.bold',
  );
  assert.equal(
    course.previewStages?.[0].subPages[0].elements[0].props.fontLibraryId,
    DEFAULT_FONT_ID,
  );
  assert.equal(
    course.previewStages?.[0].subPages[0].elements[1].props.fontLibraryId,
    'arial.regular',
  );
});
