import { X } from 'lucide-react';
import type { Element } from '../types';

interface KeyboardItem {
  element: Element;
  camp: string;
  thumbnail?: string;
  label: string;
  legacy: boolean;
}

interface Props {
  keyboards: KeyboardItem[];
  currentCamp: string;
  onSelect: (keyboard: KeyboardItem) => void;
  onClose: () => void;
}

export default function BindKeyboardModal({ keyboards, currentCamp, onSelect, onClose }: Props) {
  return (
    <div
      data-keep-selection
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="w-[640px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-10 border-b border-slate-700">
          <span className="text-sm text-white">绑定键盘</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {keyboards.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-500">
              当前页面没有可绑定的键盘组件
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {keyboards.map((keyboard) => {
                const { element, camp, thumbnail, label, legacy } = keyboard;
                const isBound = !!currentCamp && camp === currentCamp;
                return (
                  <button
                    key={element.id}
                    onClick={() => onSelect(keyboard)}
                    className={`flex items-start gap-2 p-2 rounded border text-left transition-colors ${
                      isBound
                        ? 'bg-blue-600/30 border-blue-500'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt=""
                        className="w-16 h-16 object-contain flex-shrink-0 bg-slate-900/50 rounded"
                        draggable={false}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{element.name || element.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        类型: <span className="text-slate-200">{legacy ? '旧版/自定义' : label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        阵营: <span className="text-slate-200">{camp || '(绑定时自动生成)'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        位置: ({Math.round(element.x)}, {Math.round(element.y)})
                      </div>
                    </div>
                    {isBound && (
                      <span className="text-[10px] text-blue-300 px-1.5 py-0.5 bg-blue-500/20 rounded">已绑定</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
