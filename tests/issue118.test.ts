import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const fieldRendererSource = readFileSync(
  join(process.cwd(), 'src/components/FieldRenderer.tsx'),
  'utf8',
);
const answerKeyboardFieldSource = fieldRendererSource.slice(
  fieldRendererSource.indexOf('function AnswerKeyboardField'),
  fieldRendererSource.indexOf('export default function FieldRenderer'),
);

test('自定义答案配置将输入框与操作按钮分成独立热区', () => {
  assert.match(
    answerKeyboardFieldSource,
    /className="grid grid-cols-\[1rem_minmax\(0,1fr\)_1\.75rem_1\.75rem_1\.75rem\] items-center gap-1"/,
  );
  assert.match(
    answerKeyboardFieldSource,
    /className=\{`\$\{inputCls\} min-w-0 cursor-text/,
  );
  assert.match(
    answerKeyboardFieldSource,
    /className="h-7 w-7 flex shrink-0 items-center justify-center/,
  );
});
