import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendFractionDigit,
  appendFractionToken,
  applyDecimalKey,
  deleteFractionInput,
  fractionInputLogicalLength,
  parseFractionInput,
  serializeFractionInput,
  type FractionFocus,
} from '../src/utils/mathInput';

test('小数输入只允许一个小数点并在首位自动补零', () => {
  assert.equal(applyDecimalKey('', '.', 4), '0.');
  assert.equal(applyDecimalKey('12', '.', 4), '12.');
  assert.equal(applyDecimalKey('12.', '.', 4), '12.');
  assert.equal(applyDecimalKey('12.', '3', 4), '12.3');
  assert.equal(applyDecimalKey('12.3', '4', 4), '12.3');
  assert.equal(applyDecimalKey('12.', 'del', 4), '12');
});

test('分数编码支持普通数字与多个分数混排', () => {
  const value = '12<3_4>5<67_89>';
  const tokens = parseFractionInput(value);
  assert.deepEqual(tokens, [
    { kind: 'digits', value: '12' },
    { kind: 'fraction', numerator: '3', denominator: '4' },
    { kind: 'digits', value: '5' },
    { kind: 'fraction', numerator: '67', denominator: '89' },
  ]);
  assert.equal(serializeFractionInput(tokens), value);
  assert.equal(fractionInputLogicalLength(tokens), 9);
});

test('分数占三个逻辑字符位且分子分母各自最多四位', () => {
  const added = appendFractionToken([{ kind: 'digits', value: '12' }], 5);
  assert.deepEqual(added.focus, { tokenIndex: 1, part: 'numerator' });
  assert.equal(fractionInputLogicalLength(added.tokens), 5);
  assert.equal(appendFractionToken(added.tokens, 7).tokens, added.tokens);

  let tokens = added.tokens;
  const focus: FractionFocus = { tokenIndex: 1, part: 'numerator' };
  for (const digit of ['1', '2', '3', '4', '5']) {
    tokens = appendFractionDigit(tokens, digit, 5, focus);
  }
  assert.equal(serializeFractionInput(tokens), '12<1234_>');
});

test('分数内删除当前部分，空分数再次删除移除完整结构', () => {
  const numeratorFocus: FractionFocus = { tokenIndex: 0, part: 'numerator' };
  let result = deleteFractionInput(parseFractionInput('<12_3>'), numeratorFocus);
  assert.equal(serializeFractionInput(result.tokens), '<1_3>');
  result = deleteFractionInput(parseFractionInput('<_>'), numeratorFocus);
  assert.equal(serializeFractionInput(result.tokens), '');
  assert.equal(result.focus, null);
});

test('分数外删除普通数字或最后一个完整分数', () => {
  let result = deleteFractionInput(parseFractionInput('12<3_4>'), null);
  assert.equal(serializeFractionInput(result.tokens), '12');
  result = deleteFractionInput(parseFractionInput('12'), null);
  assert.equal(serializeFractionInput(result.tokens), '1');
});
