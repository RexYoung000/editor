import React from 'react';
import { useEditorStore } from '../store/editorStore';
import type { ResourceMissingItem } from '../utils/checkResourceReady';
import { RESOURCE_STAGE_KIND_LABEL, RESOURCE_KIND_LABEL } from '../utils/checkResourceReady';

interface Props {
  items: ResourceMissingItem[];
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export const ResourceMissingDialog: React.FC<Props> = ({ items, onClose, onContinue, continueLabel }) => {
  if (items.length === 0) return null;

  const handleJump = (item: ResourceMissingItem) => {
    const store = useEditorStore.getState();
    store.setCurrentSubPage(item.stageId, item.pageId);
    store.selectElement(item.elementId);
    onClose();
  };

  const handleContinue = () => {
    onContinue?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-[560px] max-h-[70vh] flex flex-col border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">资源未就绪</h2>
        </div>
        <div className="px-6 py-4 overflow-auto flex-1">
          <p className="mb-3 text-sm text-slate-300">
            以下 {items.length} 个组件未上传资源:
          </p>
          <ul className="space-y-2">
            {items.map(item => (
              <li
                key={item.elementId}
                className="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded border border-slate-700"
              >
                <span className="text-sm text-slate-300">
                  <span className="text-amber-400">[{RESOURCE_KIND_LABEL[item.kind]}]</span> {RESOURCE_STAGE_KIND_LABEL[item.stageKind]} {item.stageIndex}
                  {item.stageName ? `:${item.stageName}` : ''} —
                  第 {item.pageIndex} 页 — {item.elementName}
                </span>
                <button
                  onClick={() => handleJump(item)}
                  className="px-3 py-1 text-sm bg-indigo-700 hover:bg-indigo-600 text-white rounded"
                >
                  跳转
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">请上传资源后继续发布。</p>
        </div>
        <div className="px-6 py-3 border-t border-slate-700 flex justify-end gap-2">
          {onContinue && continueLabel && (
            <button
              onClick={handleContinue}
              className="px-4 py-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 text-white rounded"
            >
              {continueLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
