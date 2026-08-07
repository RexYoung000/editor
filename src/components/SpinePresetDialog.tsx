import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { SPINE_PRESETS, type SpinePreset } from '../elements/spinePresets';

interface Props {
  onClose: () => void;
  onSelect: (preset: SpinePreset) => void;
}

export default function SpinePresetDialog({ onClose, onSelect }: Props) {
  const [selected, setSelected] = useState<SpinePreset | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="spine-preset-title"
        className="flex max-h-[90vh] w-[640px] max-w-[92vw] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 px-4">
          <h2 id="spine-preset-title" className="text-sm font-medium text-white">选择 Spine 预设</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white" title="关闭">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SPINE_PRESETS.map((preset) => {
              const active = selected?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelected(preset)}
                  className={`relative min-w-0 overflow-hidden rounded-lg border p-2 text-left transition-colors ${
                    active
                      ? 'border-blue-500 bg-blue-950/50'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded bg-slate-950/70">
                    <img src={preset.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-100">{preset.label}</div>
                  <div className="mt-1 min-h-8 text-[10px] leading-4 text-slate-400">{preset.description}</div>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-700 px-4">
          <span className="min-w-0 truncate text-xs text-slate-400">
            {selected ? selected.label : `${SPINE_PRESETS.length} 个预设`}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded bg-slate-800 px-4 text-xs text-slate-300 hover:bg-slate-700">取消</button>
            <button
              type="button"
              onClick={() => selected && onSelect(selected)}
              disabled={!selected}
              className="flex h-8 min-w-24 items-center justify-center gap-1 rounded bg-blue-600 px-4 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
              添加组件
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
