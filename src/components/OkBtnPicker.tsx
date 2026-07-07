import { getResourceGroupIds, assetSrc, assetExport } from '../elements/builtinAssets';
import { useI18n } from '../i18n';

interface Props {
  currentSkin: string;
  onSelect: (skinExportPath: string) => void;
  onClose: () => void;
}

export default function OkBtnPicker({ currentSkin, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const ids = getResourceGroupIds('okBtn');

  return (
    <div data-keep-selection className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-[320px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm text-white font-medium">{t('replaceResource')}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {ids.map((id) => {
              const exportPath = assetExport(id);
              const isSelected = currentSkin === exportPath;
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(exportPath); onClose(); }}
                  className={`relative rounded border-2 overflow-hidden transition-colors ${
                    isSelected ? 'border-blue-500' : 'border-slate-600 hover:border-slate-400'
                  }`}
                >
                  <img src={assetSrc(id)} className="w-full h-24 object-contain bg-slate-900" />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}