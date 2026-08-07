export interface FractionToken {
  kind: 'fraction';
  numerator: string;
  denominator: string;
}

export interface DigitsToken {
  kind: 'digits';
  value: string;
}

export type FractionInputToken = FractionToken | DigitsToken;
export type FractionFocus = { tokenIndex: number; part: 'numerator' | 'denominator' } | null;

export const FRACTION_LOGICAL_LENGTH = 3;
export const FRACTION_PART_MAX_DIGITS = 4;

const FRACTION_PATTERN = /<([0-9]*)_([0-9]*)>/g;

function appendDigits(tokens: FractionInputToken[], value: string): void {
  if (!value) return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === 'digits') last.value += value;
  else tokens.push({ kind: 'digits', value });
}

export function parseFractionInput(value: string): FractionInputToken[] {
  const tokens: FractionInputToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(FRACTION_PATTERN)) {
    const index = match.index ?? 0;
    appendDigits(tokens, value.slice(cursor, index).replace(/\D/g, ''));
    tokens.push({
      kind: 'fraction',
      numerator: match[1].slice(0, FRACTION_PART_MAX_DIGITS),
      denominator: match[2].slice(0, FRACTION_PART_MAX_DIGITS),
    });
    cursor = index + match[0].length;
  }
  appendDigits(tokens, value.slice(cursor).replace(/\D/g, ''));
  return tokens;
}

export function serializeFractionInput(tokens: FractionInputToken[]): string {
  return tokens.map((token) => token.kind === 'digits'
    ? token.value.replace(/\D/g, '')
    : `<${token.numerator.replace(/\D/g, '').slice(0, FRACTION_PART_MAX_DIGITS)}_${token.denominator.replace(/\D/g, '').slice(0, FRACTION_PART_MAX_DIGITS)}>`
  ).join('');
}

export function fractionInputLogicalLength(tokens: FractionInputToken[]): number {
  return tokens.reduce((total, token) => total + (token.kind === 'fraction'
    ? FRACTION_LOGICAL_LENGTH
    : token.value.length), 0);
}

export function appendFractionDigit(
  tokens: FractionInputToken[],
  digit: string,
  maxLength: number,
  focus: FractionFocus,
): FractionInputToken[] {
  if (!/^\d$/.test(digit)) return tokens;
  const next = structuredClone(tokens);
  if (focus) {
    const token = next[focus.tokenIndex];
    if (token?.kind !== 'fraction') return tokens;
    const current = token[focus.part];
    if (current.length >= FRACTION_PART_MAX_DIGITS) return tokens;
    token[focus.part] = current + digit;
    return next;
  }
  if (fractionInputLogicalLength(next) >= maxLength) return tokens;
  appendDigits(next, digit);
  return next;
}

export function appendFractionToken(
  tokens: FractionInputToken[],
  maxLength: number,
): { tokens: FractionInputToken[]; focus: FractionFocus } {
  if (fractionInputLogicalLength(tokens) + FRACTION_LOGICAL_LENGTH > maxLength) {
    return { tokens, focus: null };
  }
  const next = structuredClone(tokens);
  next.push({ kind: 'fraction', numerator: '', denominator: '' });
  return { tokens: next, focus: { tokenIndex: next.length - 1, part: 'numerator' } };
}

export function deleteFractionInput(
  tokens: FractionInputToken[],
  focus: FractionFocus,
): { tokens: FractionInputToken[]; focus: FractionFocus } {
  if (tokens.length === 0) return { tokens, focus: null };
  const next = structuredClone(tokens);
  if (focus) {
    const token = next[focus.tokenIndex];
    if (token?.kind !== 'fraction') return { tokens, focus: null };
    if (token[focus.part]) {
      token[focus.part] = token[focus.part].slice(0, -1);
      return { tokens: next, focus };
    }
    if (!token.numerator && !token.denominator) {
      next.splice(focus.tokenIndex, 1);
      return { tokens: next, focus: null };
    }
    return { tokens, focus };
  }
  const last = next[next.length - 1];
  if (last.kind === 'fraction') {
    next.pop();
  } else if (last.value.length <= 1) {
    next.pop();
  } else {
    last.value = last.value.slice(0, -1);
  }
  return { tokens: next, focus: null };
}

export function applyDecimalKey(value: string, key: string, maxLength: number): string {
  if (key === 'del') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.') || value.length >= maxLength) return value;
    if (value === '') return maxLength >= 2 ? '0.' : value;
    return `${value}.`;
  }
  if (!/^\d$/.test(key) || value.length >= maxLength) return value;
  return value + key;
}

export function fractionInputSummary(tokens: FractionInputToken[]): string {
  if (tokens.length === 0) return '未设置';
  return tokens.map((token) => token.kind === 'digits'
    ? token.value
    : `${token.numerator || '□'}/${token.denominator || '□'}`
  ).join(' ');
}
