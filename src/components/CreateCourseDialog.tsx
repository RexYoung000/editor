import { useState } from 'react';
import { X } from 'lucide-react';
import { getAllCourses } from '../utils/storage';
import { useI18n } from '../i18n/context';

interface Props {
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

export default function CreateCourseDialog({ onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const id = courseId.trim();
    if (!id) { setError(t('courseIdRequired')); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(id)) { setError(t('courseIdInvalid')); return; }
    if (getAllCourses().some(c => c.id === id)) { setError(t('courseIdExists')); return; }
    onConfirm(id);
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">{t('newCourseDialog')}</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('courseIdLabel')}</label>
            <input className={inputCls} value={courseId} onChange={(e) => { setCourseId(e.target.value); setError(''); }} placeholder="s8_v8_01" />
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          <button onClick={onCancel} className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{t('cancel')}</button>
          <button onClick={handleConfirm} className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white">{t('create')}</button>
        </div>
      </div>
    </div>
  );
}
