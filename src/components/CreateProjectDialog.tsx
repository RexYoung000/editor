import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { selectDirectory, pathExists } from '../utils/electronFs';
import type { CourseType } from '../presets/types';

interface Props {
  onConfirm: (courseId: string, dirPath: string, type: CourseType) => void;
  onCancel: () => void;
}

export default function CreateProjectDialog({ onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const [courseId, setCourseId] = useState('');
  const [dirPath, setDirPath] = useState<string | null>(null);
  const [dirDisplay, setDirDisplay] = useState('');
  const [error, setError] = useState('');
  const [courseType, setCourseType] = useState<CourseType | null>(null);

  const handleSelectDir = async () => {
    const result = await selectDirectory();
    if (!result) return;
    setDirPath(result);
    setDirDisplay(result);
    setError('');
  };

  const handleConfirm = async () => {
    const id = courseId.trim();
    if (!id) { setError(t('courseIdRequired')); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) { setError(t('courseIdInvalid')); return; }
    if (!courseType) { setError(t('courseTypeRequired')); return; }
    if (courseType === 'homework' && !id.endsWith('_hw')) { setError(t('courseIdMustEndWithHw')); return; }
    if (courseType === 'sEvaluation' && !id.includes('_sse_')) { setError(t('courseIdMustContainSse')); return; }
    if (courseType === 'review' && !id.includes('_review_')) { setError(t('courseIdMustContainReview')); return; }
    if (!dirPath) { setError(t('selectSavePathFirst')); return; }
    const exists = await pathExists(`${dirPath}/${id}`);
    if (exists) { setError(t('courseDirAlreadyExists')); return; }
    onConfirm(id, dirPath, courseType);
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">{t('createProject')}</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('courseType')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-white cursor-pointer">
                <input type="radio" checked={courseType === 'normal'} onChange={() => { setCourseType('normal'); setError(''); }} className="accent-blue-500" />
                {t('courseTypeNormal')}
              </label>
              <label className="flex items-center gap-1.5 text-sm text-white cursor-pointer">
                <input type="radio" checked={courseType === 'homework'} onChange={() => { setCourseType('homework'); setError(''); }} className="accent-blue-500" />
                {t('courseTypeHomework')}
              </label>
              <label className="flex items-center gap-1.5 text-sm text-white cursor-pointer">
                <input type="radio" checked={courseType === 'sEvaluation'} onChange={() => { setCourseType('sEvaluation'); setError(''); }} className="accent-blue-500" />
                {t('courseTypeSEvaluation')}
              </label>
              <label className="flex items-center gap-1.5 text-sm text-white cursor-pointer">
                <input type="radio" checked={courseType === 'review'} onChange={() => { setCourseType('review'); setError(''); }} className="accent-blue-500" />
                {t('courseTypeReview')}
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('courseIdLabel')}</label>
            <input className={inputCls} value={courseId} onChange={(e) => { setCourseId(e.target.value); setError(''); }} placeholder={courseType === 'homework' ? 's8_v8_01_hw' : courseType === 'sEvaluation' ? 's8_sse_v8_1-4' : courseType === 'review' ? 's8_review_v8_01' : 's8_v8_01'} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('savePath')}</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-white truncate">
                {dirDisplay || t('noPathSelected')}
              </div>
              <button onClick={handleSelectDir} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300">
                {t('selectDir')}
              </button>
            </div>
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          <button onClick={onCancel} className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{t('cancel')}</button>
          <button onClick={handleConfirm} disabled={!dirPath} className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed">{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
}
