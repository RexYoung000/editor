import { Check, Delete, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  appendFractionDigit,
  appendFractionToken,
  deleteFractionInput,
  fractionInputLogicalLength,
  parseFractionInput,
  serializeFractionInput,
  type FractionFocus,
  type FractionInputToken,
} from '../utils/mathInput';

interface Props {
  value: string;
  maxLength: number;
  onSave: (value: string) => void;
  onClose: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function FractionAnswerEditorModal({ value, maxLength, onSave, onClose }: Props) {
  const [tokens, setTokens] = useState<FractionInputToken[]>(() => parseFractionInput(value));
  const [focus, setFocus] = useState<FractionFocus>(null);
  const logicalLength = fractionInputLogicalLength(tokens);
  const incomplete = useMemo(
    () => tokens.some((token) => token.kind === 'fraction' && (!token.numerator || !token.denominator)),
    [tokens],
  );

  const addDigit = (digit: string) => {
    setTokens((current) => appendFractionDigit(current, digit, maxLength, focus));
  };

  const addFraction = () => {
    const next = appendFractionToken(tokens, maxLength);
    setTokens(next.tokens);
    setFocus(next.focus);
  };

  const removeLast = () => {
    const next = deleteFractionInput(tokens, focus);
    setTokens(next.tokens);
    setFocus(next.focus);
  };

  const renderFraction = (token: Extract<FractionInputToken, { kind: 'fraction' }>, tokenIndex: number) => {
    const part = (name: 'numerator' | 'denominator') => {
      const active = focus?.tokenIndex === tokenIndex && focus.part === name;
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setFocus({ tokenIndex, part: name });
          }}
          className={`min-w-10 h-8 px-2 text-lg tabular-nums border transition-colors ${
            active
              ? 'bg-amber-100 border-amber-500 text-slate-900'
              : 'bg-white border-slate-300 text-slate-800 hover:border-blue-400'
          }`}
          aria-label={name === 'numerator' ? '分子' : '分母'}
        >
          {token[name] || '\u00a0'}
        </button>
      );
    };
    return (
      <div key={`fraction-${tokenIndex}`} className="flex w-fit flex-col items-center gap-0.5">
        {part('numerator')}
        <div className="h-0.5 w-full bg-slate-700" />
        {part('denominator')}
      </div>
    );
  };

  const digitDisabled = focus
    ? (() => {
        const token = tokens[focus.tokenIndex];
        return token?.kind !== 'fraction' || token[focus.part].length >= 4;
      })()
    : logicalLength >= maxLength;

  return (
    <div
      data-keep-selection
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="w-[560px] max-w-[92vw] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 items-center justify-between border-b border-slate-700 px-4">
          <div className="text-sm font-medium text-white">设置正确答案</div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" title="关闭">
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1fr_190px]">
          <div className="min-w-0">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFocus(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setFocus(null);
              }}
              className="flex min-h-28 w-full items-center gap-2 overflow-x-auto rounded border-2 border-slate-500 bg-[#fffef1] px-4 py-3 text-left"
              aria-label="分数答案内容"
            >
              {tokens.length === 0 ? (
                <span className="text-sm text-slate-400">未设置</span>
              ) : tokens.map((token, tokenIndex) => token.kind === 'digits'
                ? <span key={`digits-${tokenIndex}`} className="text-3xl text-slate-900 tabular-nums">{token.value}</span>
                : renderFraction(token, tokenIndex))}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={incomplete ? 'text-amber-400' : 'text-slate-500'}>
                {incomplete ? '分数未填写完整' : '答案结构完整'}
              </span>
              <span className="text-slate-400">{logicalLength}/{maxLength}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={digitDisabled}
                onClick={() => addDigit(digit)}
                className="h-11 rounded bg-slate-700 text-base text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={logicalLength + 3 > maxLength}
              onClick={addFraction}
              className="flex h-11 flex-col items-center justify-center rounded bg-slate-700 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="插入分数"
            >
              <span className="h-3 text-xs leading-3">□</span>
              <span className="h-px w-5 bg-current" />
              <span className="h-3 text-xs leading-3">□</span>
            </button>
            <button
              type="button"
              disabled={digitDisabled}
              onClick={() => addDigit('0')}
              className="h-11 rounded bg-slate-700 text-base text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              0
            </button>
            <button
              type="button"
              onClick={removeLast}
              className="flex h-11 items-center justify-center rounded bg-slate-700 text-slate-100 hover:bg-red-700"
              title="删除"
            >
              <Delete size={19} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
            取消
          </button>
          <button
            type="button"
            disabled={incomplete || tokens.length === 0}
            onClick={() => onSave(serializeFractionInput(tokens))}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} /> 保存答案
          </button>
        </div>
      </div>
    </div>
  );
}
