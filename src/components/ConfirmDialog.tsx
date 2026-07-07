import { X } from 'lucide-react';
import { useI18n } from '../i18n';

interface Props {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmText, cancelText, danger = false, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">{title}</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-slate-300 whitespace-pre-line break-all">{message}</p>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          {cancelText !== '' && (
            <button onClick={onCancel} className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{cancelText ?? t('cancel')}</button>
          )}
          <button onClick={onConfirm} className={`flex-1 py-2 text-sm rounded text-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>{confirmText ?? t('confirm')}</button>
        </div>
      </div>
    </div>
  );
}
