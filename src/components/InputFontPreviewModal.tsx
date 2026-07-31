import { Check, Delete, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Element } from '../types';
import { assetSrc } from '../elements/builtinAssets';
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
import {
  DEFAULT_INPUT_TEXT_THEME,
  INPUT_FRACTION_FONT_PERCENT_MAX,
  INPUT_FRACTION_FONT_PERCENT_MIN,
  INPUT_FRACTION_FONT_PERCENT_STEP,
  INPUT_FONT_SIZE_MAX,
  INPUT_FONT_SIZE_MIN,
  INPUT_FONT_SIZE_STEP,
  clampInputFontSize,
  effectiveInputFontSize,
  getInputFractionLayoutMetrics,
  getInputFontGlyphMetrics,
  inputFontPercentage,
  normalizeInputPreviewSample,
  readInputFractionFontScale,
  readInputTextTheme,
  renderInputFontSkin,
  uniqueInputCharacters,
  type InputTextTheme,
} from '../utils/inputFont';
import { customAnswerInputSheet } from '../utils/customAnswerKeyboardText';
import ThemeSwatches from './ThemeSwatches';

interface Props {
  element: Element;
  customAnswerOptions?: string[];
  onApply: (props: Record<string, unknown>) => void;
  onClose: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const inputClass = 'h-9 w-full rounded border border-slate-600 bg-slate-800 px-2 text-sm text-white outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50';

function GlyphRun({
  text,
  sheet,
  skin,
  cellWidth,
  cellHeight,
  scale = 1,
}: {
  text: string;
  sheet: string;
  skin: string;
  cellWidth: number;
  cellHeight: number;
  scale?: number;
}) {
  const characters = Array.from(sheet);
  return (
    <span className="inline-flex shrink-0" style={{ height: cellHeight * scale }}>
      {Array.from(text).map((character, index) => {
        const glyphIndex = characters.indexOf(character);
        return (
          <span
            key={`${character}-${index}`}
            aria-hidden="true"
            className="block shrink-0"
            style={{
              width: cellWidth * scale,
              height: cellHeight * scale,
              backgroundImage: glyphIndex >= 0 ? `url(${skin})` : undefined,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${cellWidth * characters.length * scale}px ${cellHeight * scale}px`,
              backgroundPosition: glyphIndex >= 0 ? `${-glyphIndex * cellWidth * scale}px 0` : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

function FractionPreview({
  tokens,
  sheet,
  skin,
  cellWidth,
  cellHeight,
  fontSize,
  partScale,
}: {
  tokens: FractionInputToken[];
  sheet: string;
  skin: string;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
  partScale: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center"
      style={{ gap: getInputFractionLayoutMetrics(
        { cellWidth, cellHeight, fontSize, stroke: fontSize >= 18 ? 2 : 1 },
        partScale,
      ).tokenGap }}
    >
      {tokens.map((token, tokenIndex) => {
        if (token.kind === 'digits') {
          return (
            <GlyphRun
              key={`digits-${tokenIndex}`}
              text={token.value}
              sheet={sheet}
              skin={skin}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
            />
          );
        }
        const layout = getInputFractionLayoutMetrics(
          { cellWidth, cellHeight, fontSize, stroke: fontSize >= 18 ? 2 : 1 },
          partScale,
          token.numerator.length,
          token.denominator.length,
        );
        return (
          <span
            key={`fraction-${tokenIndex}`}
            className="relative block shrink-0"
            style={{ width: layout.width, height: layout.height }}
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2">
              <GlyphRun
                text={token.numerator}
                sheet={sheet}
                skin={skin}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                scale={partScale}
              />
            </span>
            <span
              className="absolute left-0 right-0 h-[2px] -translate-y-1/2 bg-slate-700"
              style={{ top: layout.partHeight + layout.verticalGap / 2 }}
            />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <GlyphRun
                text={token.denominator}
                sheet={sheet}
                skin={skin}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                scale={partScale}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function InputFontPreviewModal({ element, customAnswerOptions, onApply, onClose }: Props) {
  const isFraction = element.type === 'FractionInput';
  const customAnswerCharacters = customAnswerOptions?.length
    ? customAnswerInputSheet(customAnswerOptions)
    : '';
  const [theme, setTheme] = useState<InputTextTheme>(() => (
    readInputTextTheme(element) ?? DEFAULT_INPUT_TEXT_THEME
  ));
  const [fontSize, setFontSize] = useState(() => effectiveInputFontSize(element));
  const [fontSizeDraft, setFontSizeDraft] = useState(() => String(effectiveInputFontSize(element)));
  const [fractionFontPercentage, setFractionFontPercentage] = useState(() => (
    Math.round(readInputFractionFontScale(element) * 100)
  ));
  const [fractionFontPercentageDraft, setFractionFontPercentageDraft] = useState(() => (
    String(Math.round(readInputFractionFontScale(element) * 100))
  ));
  const [maxLength, setMaxLength] = useState(() => {
    const parsed = Number(element.props?.place);
    return Number.isFinite(parsed) ? Math.max(isFraction ? 3 : 1, Math.round(parsed)) : (isFraction ? 11 : 4);
  });
  const [allowedCharacters, setAllowedCharacters] = useState(() => uniqueInputCharacters(
    customAnswerCharacters || element.props?.sheet || (isFraction ? '0123456789' : '0123456789.+-*/=()%'),
  ));
  const savedSample = String(element.props?._inputFontPreview ?? '');
  const normalSampleLimit = customAnswerOptions?.length
    ? Math.max(...customAnswerOptions.map((answer) => Array.from(answer).length))
    : maxLength;
  const [normalSample, setNormalSample] = useState(() => (
    normalizeInputPreviewSample(
      savedSample || customAnswerOptions?.[0] || '1234',
      allowedCharacters,
      normalSampleLimit,
    )
  ));
  const [fractionTokens, setFractionTokens] = useState<FractionInputToken[]>(() => (
    parseFractionInput(savedSample || '12<3_4>')
  ));
  const [fractionFocus, setFractionFocus] = useState<FractionFocus>(null);
  const metrics = useMemo(
    () => getInputFontGlyphMetrics(fontSize, allowedCharacters),
    [allowedCharacters, fontSize],
  );
  const sheet = useMemo(() => uniqueInputCharacters(allowedCharacters), [allowedCharacters]);
  const renderKey = `${sheet}\u0000${theme}\u0000${metrics.fontSize}`;
  const [fontRender, setFontRender] = useState({ key: '', skin: '', error: '' });
  const fontSkin = fontRender.key === renderKey ? fontRender.skin : '';
  const renderError = fontRender.key === renderKey ? fontRender.error : '';
  const logicalLength = fractionInputLogicalLength(fractionTokens);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    renderInputFontSkin(sheet || '0', theme, metrics)
      .then((skin) => {
        if (!cancelled) setFontRender({ key: renderKey, skin, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setFontRender({
          key: renderKey,
          skin: '',
          error: error instanceof Error ? error.message : '字体图生成失败',
        });
      });
    return () => { cancelled = true; };
  }, [metrics, renderKey, sheet, theme]);

  const updateFontSize = (value: unknown) => {
    const next = clampInputFontSize(value, fontSize);
    setFontSize(next);
    setFontSizeDraft(String(next));
  };
  const updateFontSizeDraft = (value: string) => {
    setFontSizeDraft(value);
    if (!/^\d+$/.test(value)) return;
    const parsed = Number(value);
    if (parsed < INPUT_FONT_SIZE_MIN || parsed > INPUT_FONT_SIZE_MAX) return;
    setFontSize(parsed);
  };
  const commitFontSizeDraft = () => updateFontSize(fontSizeDraft);
  const updateFractionFontPercentage = (value: unknown) => {
    const parsed = Number(value);
    const next = Number.isFinite(parsed)
      ? Math.min(INPUT_FRACTION_FONT_PERCENT_MAX, Math.max(INPUT_FRACTION_FONT_PERCENT_MIN, Math.round(parsed)))
      : fractionFontPercentage;
    setFractionFontPercentage(next);
    setFractionFontPercentageDraft(String(next));
  };
  const updateFractionFontPercentageDraft = (value: string) => {
    setFractionFontPercentageDraft(value);
    if (!/^\d+$/.test(value)) return;
    const parsed = Number(value);
    if (parsed < INPUT_FRACTION_FONT_PERCENT_MIN || parsed > INPUT_FRACTION_FONT_PERCENT_MAX) return;
    setFractionFontPercentage(parsed);
  };
  const commitFractionFontPercentageDraft = () => (
    updateFractionFontPercentage(fractionFontPercentageDraft)
  );
  const filterNormalSample = (value: string) => {
    setNormalSample(normalizeInputPreviewSample(value, sheet, normalSampleLimit));
  };
  const updateMaxLength = (value: string) => {
    const next = Math.min(60, Math.max(isFraction ? 3 : 1, Number(value) || 1));
    setMaxLength(next);
    if (!isFraction && !customAnswerOptions?.length) {
      setNormalSample((current) => normalizeInputPreviewSample(current, allowedCharacters, next));
    }
  };
  const updateAllowedCharacters = (value: string) => {
    const next = uniqueInputCharacters(value);
    setAllowedCharacters(next);
    if (!isFraction && !customAnswerOptions?.length) {
      setNormalSample((current) => normalizeInputPreviewSample(current, next, maxLength));
    }
  };
  const fractionDigitDisabled = fractionFocus
    ? (() => {
        const token = fractionTokens[fractionFocus.tokenIndex];
        return token?.kind !== 'fraction' || token[fractionFocus.part].length >= 4;
      })()
    : logicalLength >= maxLength;

  const addFractionDigit = (digit: string) => {
    setFractionTokens((current) => appendFractionDigit(current, digit, maxLength, fractionFocus));
  };
  const addFraction = () => {
    const next = appendFractionToken(fractionTokens, maxLength);
    setFractionTokens(next.tokens);
    setFractionFocus(next.focus);
  };
  const removeFractionValue = () => {
    const next = deleteFractionInput(fractionTokens, fractionFocus);
    setFractionTokens(next.tokens);
    setFractionFocus(next.focus);
  };

  const canApply = Boolean(sheet && fontSkin && !renderError);
  const apply = () => {
    if (!canApply) return;
    onApply({
      _inputTextTheme: theme,
      _inputFontSize: fontSize,
      _inputFontReferenceWidth: element.width,
      _inputFontReferenceHeight: element.height,
      _inputFontPreview: isFraction ? serializeFractionInput(fractionTokens) : normalSample,
      ...(isFraction ? { _inputFractionFontScale: fractionFontPercentage / 100 } : {}),
      place: customAnswerOptions?.length ? 1 : maxLength,
      sheet,
    });
  };

  return (
    <div
      data-keep-selection
      role="dialog"
      aria-modal="true"
      aria-label="调整输入框字体大小"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex max-h-[92vh] w-[1120px] max-w-[96vw] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 px-4">
          <div>
            <h2 className="text-sm font-medium text-white">调整字体大小</h2>
            <div className="text-[11px] text-slate-500">{isFraction ? '分数输入框' : '普通输入框'}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <section className="flex min-h-[360px] min-w-0 flex-col border-b border-slate-700 bg-slate-950/55 lg:border-b-0 lg:border-r">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 px-4 text-xs">
              <span className="text-slate-400">{Math.round(element.width)} × {Math.round(element.height)} px</span>
              <span className="font-medium text-slate-200">{fontSize}px · {inputFontPercentage(element.type, fontSize)}%</span>
            </div>
            <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto p-8">
              <div
                className="relative shrink-0 overflow-hidden"
                style={{
                  width: Math.max(1, element.width),
                  height: Math.max(1, element.height),
                  borderStyle: 'solid',
                  borderWidth: 10,
                  borderImageSource: `url(${assetSrc('klInput.bg')})`,
                  borderImageSlice: '10 fill',
                  borderImageWidth: '10px',
                  borderImageRepeat: 'stretch',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  {!fontSkin ? (
                    <span className="text-xs text-slate-500">{renderError || '正在生成字体图'}</span>
                  ) : isFraction ? (
                    <FractionPreview
                      tokens={fractionTokens}
                      sheet={sheet}
                      skin={fontSkin}
                      cellWidth={metrics.cellWidth}
                      cellHeight={metrics.cellHeight}
                      fontSize={fontSize}
                      partScale={fractionFontPercentage / 100}
                    />
                  ) : (
                    <GlyphRun
                      text={normalSample}
                      sheet={sheet}
                      skin={fontSkin}
                      cellWidth={metrics.cellWidth}
                      cellHeight={metrics.cellHeight}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 space-y-5 p-4">
            <div>
              <div className="mb-2 text-xs font-medium text-slate-300">字体颜色</div>
              <ThemeSwatches value={theme} onChange={setTheme} labelSuffix="文字" />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-slate-300">预览内容</div>
              {isFraction ? (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="分数预览内容"
                    onClick={() => setFractionFocus(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setFractionFocus(null);
                    }}
                    className="mb-2 flex min-h-20 items-center gap-2 overflow-x-auto rounded border border-slate-600 bg-slate-800 p-2"
                  >
                    {fractionTokens.map((token, tokenIndex) => token.kind === 'digits'
                      ? <span key={`edit-digits-${tokenIndex}`} className="text-xl tabular-nums text-white">{token.value}</span>
                      : (
                        <span key={`edit-fraction-${tokenIndex}`} className="flex flex-col items-center">
                          {(['numerator', 'denominator'] as const).map((part, partIndex) => (
                            <button
                              key={part}
                              type="button"
                              aria-label={part === 'numerator' ? '分子' : '分母'}
                              onClick={(event) => {
                                event.stopPropagation();
                                setFractionFocus({ tokenIndex, part });
                              }}
                              className={`min-w-9 px-1 text-sm tabular-nums ${
                                fractionFocus?.tokenIndex === tokenIndex && fractionFocus.part === part
                                  ? 'bg-blue-500 text-white'
                                  : 'text-slate-100'
                              } ${partIndex === 0 ? 'border-b border-slate-300' : ''}`}
                            >
                              {token[part] || '\u00a0'}
                            </button>
                          ))}
                        </span>
                      ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DIGITS.map((digit) => (
                      <button key={digit} type="button" disabled={fractionDigitDisabled} onClick={() => addFractionDigit(digit)} className="h-9 rounded bg-slate-700 text-sm text-white hover:bg-blue-600 disabled:opacity-35">
                        {digit}
                      </button>
                    ))}
                    <button type="button" disabled={logicalLength + 3 > maxLength} onClick={addFraction} className="flex h-9 flex-col items-center justify-center rounded bg-slate-700 text-white hover:bg-blue-600 disabled:opacity-35" title="插入分数">
                      <span className="text-[9px] leading-[9px]">□</span><span className="h-px w-4 bg-current" /><span className="text-[9px] leading-[9px]">□</span>
                    </button>
                    <button type="button" disabled={fractionDigitDisabled} onClick={() => addFractionDigit('0')} className="h-9 rounded bg-slate-700 text-sm text-white hover:bg-blue-600 disabled:opacity-35">0</button>
                    <button type="button" onClick={removeFractionValue} className="flex h-9 items-center justify-center rounded bg-slate-700 text-slate-100 hover:bg-red-700" title="删除"><Delete size={17} /></button>
                  </div>
                </>
              ) : (
                <input className={inputClass} value={normalSample} onChange={(event) => filterNormalSample(event.target.value)} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0 text-xs text-slate-400">
                <span className="mb-1 block">{isFraction ? '最大字符数' : '输入位数'}</span>
                <input
                  type="number"
                  min={isFraction ? 3 : 1}
                  max={60}
                  disabled={Boolean(customAnswerOptions?.length)}
                  className={inputClass}
                  value={customAnswerOptions?.length ? 1 : maxLength}
                  onChange={(event) => updateMaxLength(event.target.value)}
                />
              </label>
              <label className="block min-w-0 text-xs text-slate-400">
                <span className="mb-1 block">可输入字符</span>
                <input
                  className={inputClass}
                  disabled={Boolean(customAnswerOptions?.length)}
                  value={allowedCharacters}
                  onChange={(event) => updateAllowedCharacters(event.target.value)}
                />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <label htmlFor="input-font-size" className="font-medium text-slate-300">字体大小</label>
                <span className="text-slate-400">{fontSize}px · {inputFontPercentage(element.type, fontSize)}%</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3">
                <input
                  id="input-font-size"
                  type="range"
                  min={INPUT_FONT_SIZE_MIN}
                  max={INPUT_FONT_SIZE_MAX}
                  step={INPUT_FONT_SIZE_STEP}
                  value={fontSize}
                  onChange={(event) => updateFontSize(event.target.value)}
                  className="w-full accent-blue-500"
                />
                <input
                  type="number"
                  min={INPUT_FONT_SIZE_MIN}
                  max={INPUT_FONT_SIZE_MAX}
                  step={INPUT_FONT_SIZE_STEP}
                  value={fontSizeDraft}
                  onChange={(event) => updateFontSizeDraft(event.target.value)}
                  onBlur={commitFontSizeDraft}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  className={inputClass}
                  aria-label="字体大小数值"
                />
              </div>
            </div>

            {isFraction && (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <label htmlFor="input-fraction-font-size" className="font-medium text-slate-300">分数字号比例</label>
                  <span className="text-slate-400">{fractionFontPercentage}%</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3">
                  <input
                    id="input-fraction-font-size"
                    type="range"
                    min={INPUT_FRACTION_FONT_PERCENT_MIN}
                    max={INPUT_FRACTION_FONT_PERCENT_MAX}
                    step={INPUT_FRACTION_FONT_PERCENT_STEP}
                    value={fractionFontPercentage}
                    onChange={(event) => updateFractionFontPercentage(event.target.value)}
                    className="w-full accent-blue-500"
                  />
                  <input
                    type="number"
                    min={INPUT_FRACTION_FONT_PERCENT_MIN}
                    max={INPUT_FRACTION_FONT_PERCENT_MAX}
                    step={INPUT_FRACTION_FONT_PERCENT_STEP}
                    value={fractionFontPercentageDraft}
                    onChange={(event) => updateFractionFontPercentageDraft(event.target.value)}
                    onBlur={commitFractionFontPercentageDraft}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    className={inputClass}
                    aria-label="分数字号比例数值"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">取消</button>
          <button type="button" disabled={!canApply} onClick={apply} className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
            <Check size={14} /> 应用
          </button>
        </footer>
      </div>
    </div>
  );
}
