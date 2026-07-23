import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { CourseType } from '../presets/types';
import { COURSE_TYPE_LABEL_KEYS } from '../presets/types';

interface Props {
  initialType?: CourseType;
  requiresConfirmation?: boolean;
  onConfirm: (type: CourseType, confirmed: boolean) => void;
  onCancel: () => void;
}

const COURSE_TYPE_OPTIONS: CourseType[] = ['normal', 'homework', 'sEvaluation', 'review'];

export default function CourseSettingsDialog({ initialType, requiresConfirmation = false, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const [draftType, setDraftType] = useState<CourseType | null>(initialType ?? null);
  const [error, setError] = useState('');
  const [confirmingChange, setConfirmingChange] = useState(false);

  const submit = () => {
    if (!draftType) {
      setError(t('courseTypeRequired'));
      return;
    }
    const changed = draftType !== initialType;
    if (requiresConfirmation && changed && !confirmingChange) {
      setConfirmingChange(true);
      return;
    }
    onConfirm(draftType, confirmingChange || !changed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-[420px] rounded-lg bg-slate-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <span className="text-base font-medium text-white">{t('courseSettingsTitle')}</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white" title={t('close')}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-xs text-slate-400">{t('courseSettingsGlobalType')}</div>
            <div className="grid grid-cols-2 gap-2">
              {COURSE_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setDraftType(type); setError(''); setConfirmingChange(false); }}
                  className={`rounded border px-3 py-2 text-sm transition-colors ${
                    draftType === type
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {t(COURSE_TYPE_LABEL_KEYS[type])}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-400">
            {t('courseSettingsTypeHelp')}
          </p>
          {confirmingChange && (
            <div className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2">
              <div className="text-xs font-medium text-amber-200">{t('courseTypeChangeConfirmTitle')}</div>
              <div className="mt-1 text-xs leading-5 text-amber-100">{t('courseTypeChangeConfirmBody')}</div>
            </div>
          )}
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
          <button
            onClick={() => {
              if (confirmingChange) {
                setConfirmingChange(false);
                return;
              }
              onCancel();
            }}
            className="flex-1 rounded bg-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-600"
          >
            {t('cancel')}
          </button>
          <button onClick={submit} className="flex-1 rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-500">
            {confirmingChange ? t('confirmCourseTypeChange') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
