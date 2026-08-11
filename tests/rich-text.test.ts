import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRichTextHtml, richTextToPlainText, sanitizeRichTextHtml } from '../src/utils/richText';
import type { RichTextToken } from '../src/utils/richText';

test('rich text sanitizer keeps only allowed formatting and drops unsafe content', () => {
  const html = [
    '<b onclick="bad()">B</b>',
    '<script>alert(1)</script>',
    '<span style="font-weight: 700; color: red; font-style: italic; text-decoration: underline" onmouseover="bad()">S</span>',
    '<img src="x" />',
    ' &amp; ',
    '<a href="javascript:bad()">A</a>',
  ].join('');

  assert.equal(
    sanitizeRichTextHtml(html),
    '<b>B</b><span style="font-weight: 700; font-style: italic; text-decoration: underline">S</span> &amp; A',
  );
});

test('rich text parser preserves local bold italic and underline runs', () => {
  const tokens = parseRichTextHtml(
    'A<b>B</b><i>I</i><u>U</u><span style="font-weight: 700; font-style: italic; text-decoration: underline">X</span>',
    '',
  );
  const textTokens = tokens.filter((token): token is RichTextToken => 'text' in token);

  assert.deepEqual(
    textTokens.map((token) => ({ text: token.text, style: token.style })),
    [
      { text: 'A', style: {} },
      { text: 'B', style: { bold: true } },
      { text: 'I', style: { italic: true } },
      { text: 'U', style: { underline: true } },
      { text: 'X', style: { bold: true, italic: true, underline: true } },
    ],
  );
});

test('rich text plain text conversion drops markup but keeps text content', () => {
  assert.equal(
    richTextToPlainText('<b>B</b><script>bad()</script><u>U</u><br />next', ''),
    'BU\nnext',
  );
});
