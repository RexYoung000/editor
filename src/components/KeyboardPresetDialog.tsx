import { useState } from 'react';
import { X } from 'lucide-react';
import { KEYBOARD_PRESETS, type KeyboardPreset } from '../elements/keyboardPresets';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: KeyboardPreset) => void;
  presets?: KeyboardPreset[];
}

export default function KeyboardPresetDialog({ open, onClose, onSelect, presets = KEYBOARD_PRESETS }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-[640px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">选择键盘预设</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onClick={() => onSelect(preset)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetCard({ preset, onClick }: { preset: KeyboardPreset; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-blue-600 rounded transition-colors group"
    >
      <div className="w-full aspect-square bg-slate-900 rounded flex items-center justify-center overflow-hidden">
        {!imgFailed ? (
          <img
            src={preset.thumbnail}
            alt={preset.label}
            className="w-full h-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="text-slate-500 text-xs text-center px-2">
            <div className="text-3xl mb-1">⌨</div>
            <div>{preset.label}</div>
          </div>
        )}
      </div>
      <span className="text-xs text-slate-300 group-hover:text-white">{preset.label}</span>
    </button>
  );
}
