import { useState } from 'react';
import { Link2, LocateFixed, Plus, Trash2, TriangleAlert, Unlink } from 'lucide-react';
import type { Element } from '../types';
import {
  collectInputRuleIssues,
  createInputRelation,
  findInputBoxAncestor,
  getFillAnswerInputs,
  getInputAnswerCandidates,
  hasStructuredInputRules,
  INPUT_ANSWER_CANDIDATES_KEY,
  INPUT_RELATIONS_KEY,
  parseRuleNumber,
  readInputRelations,
  splitAnswerCandidates,
  type InputRelation,
  type InputRelationOperator,
} from '../utils/inputAnswerRules';
import { fractionInputSummary, parseFractionInput } from '../utils/mathInput';
import FractionAnswerEditorModal from './FractionAnswerEditorModal';

const OPERATOR_OPTIONS: Array<{ value: InputRelationOperator; label: string }> = [
  { value: 'add', label: '+' },
  { value: 'subtract', label: '−' },
  { value: 'multiply', label: '×' },
  { value: 'divide', label: '÷' },
  { value: 'equal', label: '=' },
];

const operatorLabel = (operator: InputRelationOperator) => OPERATOR_OPTIONS.find((item) => item.value === operator)?.label ?? '?';
const inputLabel = (input: Element | undefined) => input?.name ?? input?.id ?? '失效输入框';

interface SharedProps {
  elements: Element[];
  disabled?: boolean;
  onUpdateProps: (elementId: string, props: Record<string, unknown>) => void;
  onCommit: () => void;
  onSelectElement: (elementId: string) => void;
}

function RelationBuilder({
  source,
  target,
  elements,
  disabled,
  onUpdateProps,
  onCommit,
  onCancel,
}: SharedProps & { source: Element; target: Element; onCancel: () => void }) {
  const inputs = getFillAnswerInputs(target, elements);
  const relations = readInputRelations(target);
  const usedIds = new Set(relations.flatMap((relation) => [relation.leftInputId, relation.rightInputId]));
  const available = inputs.filter((input) => input.id !== source.id && !usedIds.has(input.id));
  const [otherId, setOtherId] = useState(available[0]?.id ?? '');
  const [operator, setOperator] = useState<InputRelationOperator>('multiply');
  const [result, setResult] = useState('');
  const resultValid = operator === 'equal' || parseRuleNumber(result) !== null;

  const save = () => {
    if (!otherId || !resultValid) return;
    const next = [...relations, createInputRelation(source.id, otherId, operator, result)];
    onUpdateProps(target.id, { ...target.props, [INPUT_RELATIONS_KEY]: next });
    onCommit();
    onCancel();
  };

  return (
    <div className="mt-2 rounded border border-blue-600/50 bg-blue-950/20 p-2">
      <div className="mb-2 text-[10px] text-blue-200">建立两框算式关系</div>
      {available.length === 0 ? (
        <div className="text-[10px] text-amber-300">当前填空题没有其他可连接的输入框。</div>
      ) : (
        <div className="space-y-2">
          <select
            value={otherId}
            disabled={disabled}
            onChange={(event) => setOtherId(event.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100"
          >
            {available.map((input) => <option key={input.id} value={input.id}>{inputLabel(input)}</option>)}
          </select>
          <div className="grid grid-cols-[64px_1fr] gap-2">
            <select
              value={operator}
              disabled={disabled}
              onChange={(event) => setOperator(event.target.value as InputRelationOperator)}
              className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-center text-sm text-slate-100"
            >
              {OPERATOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {operator === 'equal' ? (
              <div className="flex items-center text-[10px] text-slate-400">直接判断两个输入值相等</div>
            ) : (
              <input
                value={result}
                disabled={disabled}
                onChange={(event) => setResult(event.target.value)}
                placeholder="目标结果，例如 4 或 1/2"
                className={`min-w-0 rounded border bg-slate-700 px-2 py-1 text-xs text-slate-100 ${result && !resultValid ? 'border-red-600' : 'border-slate-600'}`}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700">取消</button>
            <button
              type="button"
              disabled={disabled || !otherId || !resultValid}
              onClick={save}
              className="rounded bg-blue-600 px-2 py-1 text-[10px] text-white disabled:opacity-40"
            >
              建立关系
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RelationCard({
  input,
  target,
  relation,
  elements,
  disabled,
  onUpdateProps,
  onCommit,
  onSelectElement,
}: SharedProps & { input: Element; target: Element; relation: InputRelation }) {
  const relations = readInputRelations(target);
  const left = elements.find((item) => item.id === relation.leftInputId);
  const right = elements.find((item) => item.id === relation.rightInputId);
  const otherId = input.id === relation.leftInputId ? relation.rightInputId : relation.leftInputId;
  const update = (patch: Partial<InputRelation>, commit = false) => {
    const next = relations.map((item) => item.id === relation.id ? { ...item, ...patch } : item);
    onUpdateProps(target.id, { ...target.props, [INPUT_RELATIONS_KEY]: next });
    if (commit) onCommit();
  };
  const remove = () => {
    const next = relations.filter((item) => item.id !== relation.id);
    onUpdateProps(target.id, { ...target.props, [INPUT_RELATIONS_KEY]: next.length > 0 ? next : undefined });
    onCommit();
  };

  return (
    <div className="rounded border border-blue-600/50 bg-blue-950/20 p-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-blue-200"><Link2 size={12} /> 由算式关系判定</div>
      <div className="mb-2 truncate text-xs text-slate-200" title={`${inputLabel(left)} ${operatorLabel(relation.operator)} ${inputLabel(right)}`}>
        {inputLabel(left)} {operatorLabel(relation.operator)} {inputLabel(right)}{relation.operator === 'equal' ? '' : ` = ${relation.target || '未设置'}`}
      </div>
      <div className="grid grid-cols-[64px_1fr] gap-2">
        <select
          value={relation.operator}
          disabled={disabled}
          onChange={(event) => update({ operator: event.target.value as InputRelationOperator }, true)}
          className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-center text-sm text-slate-100"
        >
          {OPERATOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {relation.operator === 'equal' ? (
          <div className="flex items-center text-[10px] text-slate-400">两个输入值必须相等</div>
        ) : (
          <input
            value={relation.target ?? ''}
            disabled={disabled}
            onChange={(event) => update({ target: event.target.value })}
            onBlur={onCommit}
            placeholder="目标结果"
            className="min-w-0 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100"
          />
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button type="button" onClick={() => onSelectElement(otherId)} className="flex items-center justify-center gap-1 rounded bg-slate-700 py-1 text-[10px] text-slate-300 hover:bg-slate-600">
          <LocateFixed size={11} /> 定位关联框
        </button>
        <button type="button" disabled={disabled} onClick={remove} className="flex items-center justify-center gap-1 rounded bg-red-950/40 py-1 text-[10px] text-red-300 hover:bg-red-900/60 disabled:opacity-40">
          <Unlink size={11} /> 解除关系
        </button>
      </div>
    </div>
  );
}

function CandidateAnswerEditor({
  input,
  disabled,
  onUpdateProps,
  onCommit,
}: Pick<SharedProps, 'disabled' | 'onUpdateProps' | 'onCommit'> & { input: Element }) {
  const candidates = getInputAnswerCandidates(input);
  const [draft, setDraft] = useState(candidates.join('；'));
  const [fractionIndex, setFractionIndex] = useState<number | 'new' | null>(null);

  const saveAnswers = (next: string[]) => {
    const normalized = [...new Set(next.map((item) => item.trim()).filter(Boolean))];
    const nextProps: Record<string, unknown> = {
      ...input.props,
      [INPUT_ANSWER_CANDIDATES_KEY]: normalized,
      _judgeAnswer: normalized[0] ?? '',
    };
    if (input.type === 'KlInputImage') {
      nextProps.place = Math.max(1, ...normalized.map((answer) => answer.length + 1));
    }
    onUpdateProps(input.id, nextProps);
    onCommit();
  };

  if (input.type !== 'FractionInput') {
    return (
      <div className="rounded border border-slate-700 bg-slate-800/60 p-2">
        <div className="mb-1 text-[10px] text-slate-500">候选正确答案</div>
        <textarea
          value={draft}
          disabled={disabled}
          rows={2}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => saveAnswers(splitAnswerCandidates(draft))}
          placeholder="多个答案用逗号、分号或回车分隔"
          className="w-full resize-none rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
        />
        {candidates.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {candidates.map((answer) => <span key={answer} className="max-w-full truncate rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] text-blue-200">{answer}</span>)}
          </div>
        )}
      </div>
    );
  }

  const editingValue = fractionIndex === 'new' ? '' : fractionIndex === null ? '' : candidates[fractionIndex] ?? '';
  return (
    <div className="rounded border border-slate-700 bg-slate-800/60 p-2">
      <div className="mb-1 text-[10px] text-slate-500">候选正确答案</div>
      <div className="space-y-1">
        {candidates.map((answer, index) => (
          <div key={`${answer}-${index}`} className="flex items-center gap-1 rounded bg-slate-900/60 p-1">
            <button type="button" onClick={() => setFractionIndex(index)} className="min-w-0 flex-1 truncate text-left text-xs text-blue-200">
              {fractionInputSummary(parseFractionInput(answer))}
            </button>
            <button type="button" disabled={disabled} onClick={() => saveAnswers(candidates.filter((_, itemIndex) => itemIndex !== index))} className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-40"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <button type="button" disabled={disabled} onClick={() => setFractionIndex('new')} className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-blue-500/50 bg-blue-600/20 py-1.5 text-[10px] text-blue-200 disabled:opacity-40">
        <Plus size={11} /> 添加分数答案
      </button>
      {fractionIndex !== null && (
        <FractionAnswerEditorModal
          value={editingValue}
          maxLength={Number(input.props?.place ?? 11)}
          onSave={(value) => {
            const next = fractionIndex === 'new'
              ? [...candidates, value]
              : candidates.map((item, index) => index === fractionIndex ? value : item);
            saveAnswers(next);
            setFractionIndex(null);
          }}
          onClose={() => setFractionIndex(null)}
        />
      )}
    </div>
  );
}

export function InputRuleEditor({ input, ...shared }: SharedProps & { input: Element }) {
  const target = findInputBoxAncestor(input, shared.elements);
  const relation = target
    ? readInputRelations(target).find((item) => item.leftInputId === input.id || item.rightInputId === input.id)
    : undefined;
  const [building, setBuilding] = useState(false);

  return (
    <div className="mb-2 space-y-2">
      {relation && target ? (
        <RelationCard input={input} target={target} relation={relation} {...shared} />
      ) : (
        <>
          <CandidateAnswerEditor
            key={`${input.id}:${getInputAnswerCandidates(input).join('\u0001')}`}
            input={input}
            disabled={shared.disabled}
            onUpdateProps={shared.onUpdateProps}
            onCommit={shared.onCommit}
          />
          {target && (
            <>
              <button
                type="button"
                disabled={shared.disabled}
                onClick={() => setBuilding((current) => !current)}
                className="flex w-full items-center justify-center gap-1 rounded border border-blue-500/50 bg-blue-600/20 py-1.5 text-xs text-blue-200 disabled:opacity-40"
              >
                <Link2 size={13} /> 建立算式关系
              </button>
              {building && <RelationBuilder source={input} target={target} onCancel={() => setBuilding(false)} {...shared} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function InputRulesOverview({ target, ...shared }: SharedProps & { target: Element }) {
  const inputs = getFillAnswerInputs(target, shared.elements);
  const relations = readInputRelations(target);
  const usedIds = new Set(relations.flatMap((relation) => [relation.leftInputId, relation.rightInputId]));
  const issues = collectInputRuleIssues(target, shared.elements);
  const [sourceId, setSourceId] = useState('');
  const freeInputs = inputs.filter((input) => !usedIds.has(input.id));
  const legacyAnswers = String(target.props?.answer ?? '')
    .split(',')
    .map((answer) => answer.trim());
  const canImportLegacyAnswers = !hasStructuredInputRules(target, shared.elements)
    && legacyAnswers.some(Boolean);

  const importLegacyAnswers = () => {
    inputs.forEach((input, index) => {
      const answer = legacyAnswers[index];
      if (!answer) return;
      const nextProps: Record<string, unknown> = {
        ...input.props,
        [INPUT_ANSWER_CANDIDATES_KEY]: [answer],
        _judgeAnswer: answer,
      };
      if (input.type === 'KlInputImage') nextProps.place = Math.max(1, answer.length + 1);
      shared.onUpdateProps(input.id, nextProps);
    });
    shared.onCommit();
  };

  return (
    <div className="mb-2 border-b border-slate-700 pb-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-500">判定规则</span>
        {freeInputs.length >= 2 && !sourceId && (
          <button type="button" onClick={() => setSourceId(freeInputs[0].id)} className="flex items-center gap-1 text-[10px] text-blue-300"><Plus size={11} /> 新增关系</button>
        )}
      </div>
      <div className="space-y-1.5">
        {relations.map((relation) => {
          const left = inputs.find((input) => input.id === relation.leftInputId);
          if (!left) return null;
          return <RelationCard key={relation.id} input={left} target={target} relation={relation} {...shared} />;
        })}
        {relations.length === 0 && <div className="rounded border border-slate-700 bg-slate-800/60 p-2 text-[10px] text-slate-400">未建立算式关系；各空位按自己的候选答案判定。</div>}
      </div>
      {canImportLegacyAnswers && (
        <button
          type="button"
          disabled={shared.disabled}
          onClick={importLegacyAnswers}
          className="mt-2 w-full rounded border border-amber-600/50 bg-amber-950/30 px-2 py-1.5 text-[10px] text-amber-200 disabled:opacity-40"
        >
          导入旧正确答案到各空位
        </button>
      )}
      {sourceId && (() => {
        const source = inputs.find((input) => input.id === sourceId);
        return source ? (
          <div className="mt-2">
            <label className="mb-1 flex items-center gap-2 text-[10px] text-slate-400">
              <span className="shrink-0">左侧输入框</span>
              <select
                value={sourceId}
                disabled={shared.disabled}
                onChange={(event) => setSourceId(event.target.value)}
                className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100"
              >
                {freeInputs.map((input) => <option key={input.id} value={input.id}>{inputLabel(input)}</option>)}
              </select>
            </label>
            <RelationBuilder key={source.id} source={source} target={target} onCancel={() => setSourceId('')} {...shared} />
          </div>
        ) : null;
      })()}
      <div className="mt-2 space-y-1">
        {inputs.filter((input) => !usedIds.has(input.id)).map((input) => {
          const answers = getInputAnswerCandidates(input);
          return (
            <button key={input.id} type="button" onClick={() => shared.onSelectElement(input.id)} className="flex w-full items-center justify-between rounded bg-slate-800/50 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700">
              <span className="truncate">{inputLabel(input)}</span>
              <span className={answers.length > 0 ? 'text-blue-300' : 'text-amber-300'}>{answers.length > 0 ? `${answers.length} 个候选答案` : '未配置答案'}</span>
            </button>
          );
        })}
      </div>
      {issues.length > 0 && (
        <div className="mt-2 rounded border border-amber-600/50 bg-amber-950/30 p-2 text-[10px] text-amber-300">
          <div className="mb-1 flex items-center gap-1 font-medium"><TriangleAlert size={12} /> 配置未完成，预览和发布会被阻止</div>
          <div>{issues[0].message}</div>
          {issues.length > 1 && <div className="mt-0.5 text-amber-400/80">另有 {issues.length - 1} 项需要修复</div>}
        </div>
      )}
    </div>
  );
}
