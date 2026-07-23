import { useState } from 'react';
import { X } from 'lucide-react';
import type { CourseType } from '../presets/types';

interface Props {
  initialType?: CourseType;
  /** 已废弃兼容：旧调用方可能仍传入确认态参数，这里保留类型兼容但不参与当前逻辑。 */
  requiresConfirmation?: boolean;
  onConfirm: (type: CourseType, confirmed?: boolean) => void;
  onCancel: () => void;
}

const COURSE_TYPE_OPTIONS: CourseType[] = ['normal', 'homework', 'sEvaluation', 'review'];

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  normal: '预习 / 正课',
  homework: '作业',
  sEvaluation: '专题测评',
  review: '复习课',
};

/**
 * 已废弃保留：评审修复版曾将 CourseSettingsDialog 文案迁入 i18n，
 * 并通过 requiresConfirmation/onConfirm(type, confirmed) 做非空课件二次确认。
 * 本次按要求恢复修复前行为：组件内保留硬编码中文，confirmed 参数仅用于兼容 store 兜底。
 */

export default function CourseSettingsDialog({ initialType, onConfirm, onCancel }: Props) {
  const [draftType, setDraftType] = useState<CourseType | null>(initialType ?? null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!draftType) {
      setError('请选择课件类型');
      return;
    }
    onConfirm(draftType, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-[420px] rounded-lg bg-slate-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <span className="text-base font-medium text-white">课件设置</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white" title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-xs text-slate-400">全局课件类型</div>
            <div className="grid grid-cols-2 gap-2">
              {COURSE_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setDraftType(type); setError(''); }}
                  className={`rounded border px-3 py-2 text-sm transition-colors ${
                    draftType === type
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {COURSE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-400">
            修改后会更新课件全局类型；已打开的模板弹窗不会即时刷新，需要关闭后重新打开。
          </p>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
          <button onClick={onCancel} className="flex-1 rounded bg-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-600">
            取消
          </button>
          <button onClick={submit} className="flex-1 rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-500">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
