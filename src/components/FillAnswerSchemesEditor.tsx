import { useState } from 'react';
import { Copy, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import type { Element } from '../types';
import {
  collectFillAnswerSchemeIssues,
  copyFillAnswerScheme,
  createFillAnswerScheme,
  FILL_ANSWER_SCHEMES_KEY,
  getFillAnswerInputs,
  readFillAnswerSchemes,
  reconcileFillAnswerScheme,
  type FillAnswerScheme,
} from '../utils/fillAnswerSchemes';
import FractionAnswerEditorModal from './FractionAnswerEditorModal';

interface Props {
  target: Element;
  elements: Element[];
  onChange: (key: string, value: unknown) => void;
  onCommit: () => void;
}

export default function FillAnswerSchemesEditor({ target, elements, onChange, onCommit }: Props) {
  const inputs = getFillAnswerInputs(target, elements);
  const schemes = readFillAnswerSchemes(target);
  const issues = collectFillAnswerSchemeIssues(target, elements);
  const [fractionEditor, setFractionEditor] = useState<{ schemeId: string; inputId: string } | null>(null);

  const updateSchemes = (next: FillAnswerScheme[], commit = false) => {
    onChange(FILL_ANSWER_SCHEMES_KEY, next.length > 0 ? next : undefined);
    if (commit) onCommit();
  };
  const seedAnswers = String(target.props?.answer ?? '').split(',');
  const startSchemes = () => updateSchemes([createFillAnswerScheme(inputs, seedAnswers)], true);
  const replaceScheme = (schemeId: string, nextScheme: FillAnswerScheme, commit = false) => {
    updateSchemes(schemes.map((scheme) => scheme.id === schemeId ? nextScheme : scheme), commit);
  };

  return (
    <div className="mb-2 border-b border-slate-700 pb-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-500">答案方案</span>
        {schemes.length > 0 && (
          <button
            type="button"
            onClick={() => updateSchemes([...schemes, createFillAnswerScheme(inputs)], true)}
            className="flex items-center gap-1 text-[10px] text-blue-300 hover:text-blue-200"
          >
            <Plus size={11} /> 新增方案
          </button>
        )}
      </div>

      {schemes.length === 0 ? (
        <div className="rounded border border-slate-700 bg-slate-800/70 p-2">
          <div className="text-[10px] leading-relaxed text-slate-400">
            {inputs.length === 0
              ? '请先在填空容器内添加普通输入框或分数输入框。'
              : '创建后可为全部空位配置多套完整答案；旧正确答案会自动带入第一套方案。'}
          </div>
          <button
            type="button"
            disabled={inputs.length === 0}
            onClick={startSchemes}
            className="mt-2 w-full rounded border border-blue-500/50 bg-blue-600/30 py-1.5 text-xs text-blue-200 hover:bg-blue-600/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            创建答案方案
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {schemes.map((scheme, schemeIndex) => {
            const slots = new Map(scheme.slots.map((slot) => [slot.inputId, slot]));
            const needsRepair = scheme.slots.length !== inputs.length
              || scheme.slots.some((slot) => !inputs.some((input) => input.id === slot.inputId))
              || inputs.some((input) => !slots.has(input.id));
            return (
              <div key={scheme.id} className="rounded border border-slate-700 bg-slate-900/60 p-2">
                <div className="mb-2 flex items-center gap-1">
                  <span className="flex-1 text-xs font-medium text-slate-300">方案 {schemeIndex + 1}</span>
                  <button
                    type="button"
                    title="复制方案"
                    onClick={() => updateSchemes([...schemes.slice(0, schemeIndex + 1), copyFillAnswerScheme(scheme), ...schemes.slice(schemeIndex + 1)], true)}
                    className="p-1 text-slate-400 hover:text-blue-300"
                  ><Copy size={12} /></button>
                  <button
                    type="button"
                    title="删除方案"
                    onClick={() => updateSchemes(schemes.filter((item) => item.id !== scheme.id), true)}
                    className="p-1 text-slate-400 hover:text-red-400"
                  ><Trash2 size={12} /></button>
                </div>
                <label className="mb-2 flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="w-14 shrink-0">空位顺序</span>
                  <select
                    value={scheme.orderMode}
                    onChange={(event) => replaceScheme(scheme.id, { ...scheme, orderMode: event.target.value === 'interchangeable' ? 'interchangeable' : 'fixed' }, true)}
                    className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-700 px-1 py-1 text-slate-200"
                  >
                    <option value="fixed">固定顺序</option>
                    <option value="interchangeable">全部空位可互换</option>
                  </select>
                </label>
                {needsRepair && (
                  <button
                    type="button"
                    onClick={() => replaceScheme(scheme.id, reconcileFillAnswerScheme(scheme, inputs), true)}
                    className="mb-2 flex w-full items-center justify-center gap-1 rounded border border-amber-600/60 bg-amber-950/30 py-1 text-[10px] text-amber-300 hover:bg-amber-900/40"
                  >
                    <RefreshCw size={11} /> 同步当前空位并修复引用
                  </button>
                )}
                <div className="space-y-1.5">
                  {inputs.map((input, inputIndex) => {
                    const slot = slots.get(input.id) ?? { inputId: input.id, inputNameSnapshot: input.name, answer: '' };
                    const label = input.name ?? `${input.type === 'FractionInput' ? '分数空位' : '空位'} ${inputIndex + 1}`;
                    const updateAnswer = (answer: string, commit = false) => replaceScheme(scheme.id, {
                      ...scheme,
                      slots: scheme.slots.some((item) => item.inputId === input.id)
                        ? scheme.slots.map((item) => item.inputId === input.id ? { ...item, inputNameSnapshot: input.name, answer } : item)
                        : [...scheme.slots, { inputId: input.id, inputNameSnapshot: input.name, answer }],
                    }, commit);
                    return (
                      <label key={input.id} className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="w-20 shrink-0 truncate" title={label}>{label}</span>
                        {input.type === 'FractionInput' ? (
                          <button
                            type="button"
                            onClick={() => setFractionEditor({ schemeId: scheme.id, inputId: input.id })}
                            className={`min-w-0 flex-1 truncate rounded border px-1.5 py-1 text-left ${slot.answer ? 'border-blue-500/50 bg-blue-950/30 text-blue-200' : 'border-amber-600/60 bg-amber-950/30 text-amber-300'}`}
                          >
                            {slot.answer || '设置分数答案'}
                          </button>
                        ) : (
                          <input
                            type="text"
                            value={slot.answer}
                            placeholder="正确答案"
                            onChange={(event) => updateAnswer(event.target.value)}
                            onBlur={() => onCommit()}
                            className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-700 px-1.5 py-1 text-slate-200"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {issues.length > 0 && schemes.length > 0 && (
        <div className="mt-2 rounded border border-amber-600/50 bg-amber-950/30 p-2 text-[10px] text-amber-300">
          <div className="mb-1 flex items-center gap-1 font-medium"><TriangleAlert size={12} /> 配置未完成，预览和发布会被阻止</div>
          <div>{issues[0].message}</div>
          {issues.length > 1 && <div className="mt-0.5 text-amber-400/80">另有 {issues.length - 1} 项需要修复</div>}
        </div>
      )}

      {fractionEditor && (() => {
        const scheme = schemes.find((item) => item.id === fractionEditor.schemeId);
        const slot = scheme?.slots.find((item) => item.inputId === fractionEditor.inputId);
        if (!scheme) return null;
        return (
          <FractionAnswerEditorModal
            value={slot?.answer ?? ''}
            maxLength={Number(inputs.find((item) => item.id === fractionEditor.inputId)?.props?.place ?? 11)}
            onSave={(answer) => {
              const input = inputs.find((item) => item.id === fractionEditor.inputId);
              replaceScheme(scheme.id, {
                ...scheme,
                slots: scheme.slots.some((item) => item.inputId === fractionEditor.inputId)
                  ? scheme.slots.map((item) => item.inputId === fractionEditor.inputId ? { ...item, inputNameSnapshot: input?.name, answer } : item)
                  : [...scheme.slots, { inputId: fractionEditor.inputId, inputNameSnapshot: input?.name, answer }],
              }, true);
              setFractionEditor(null);
            }}
            onClose={() => setFractionEditor(null)}
          />
        );
      })()}
    </div>
  );
}
