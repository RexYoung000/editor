import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Page } from '../types';
import {
  enterPreviewMode, exitPreviewMode,
  previewGoToPage, resizeStageToContainer,
} from '../utils/layaBridge';
import { useI18n } from '../i18n/context';

interface Props {
  pages: Page[];
  onClose: () => void;
}

export default function EditorPreview({ pages, onClose }: Props) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const originalParentRef = useRef<HTMLElement | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  useEffect(() => {
    const layaContainer = document.getElementById('layaContainer');
    const canvasArea = canvasAreaRef.current;
    if (!layaContainer || !canvasArea) return;

    // Move layaContainer into preview canvas area
    originalParentRef.current = layaContainer.parentElement;
    canvasArea.appendChild(layaContainer);
    layaContainer.style.position = 'absolute';
    layaContainer.style.top = '0';
    layaContainer.style.left = '0';

    resizeStageToContainer(canvasArea);
    enterPreviewMode(pages, setPageIdx);

    const ro = new ResizeObserver(() => resizeStageToContainer(canvasArea));
    ro.observe(canvasArea);

    return () => {
      ro.disconnect();
      exitPreviewMode();
      // Move layaContainer back to original parent
      if (originalParentRef.current && layaContainer) {
        originalParentRef.current.appendChild(layaContainer);
        resizeStageToContainer(originalParentRef.current);
      }
      // Signal Canvas to re-render the current editor page
      window.dispatchEvent(new CustomEvent('forge:preview-closed'));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = pages.length;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col animate-[fadein_120ms_ease-out]"
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      {/* Nav bar */}
      <div className="h-12 flex items-center justify-between px-4 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm text-white"
        >
          <X size={14} /> {t('exitPreview')}
        </button>

        {/* Page dots */}
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => previewGoToPage(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === pageIdx ? 'bg-white' : 'bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>

        <span className="text-sm text-white/60">{pageIdx + 1} / {total}</span>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          ref={canvasAreaRef}
          className="relative bg-white"
          style={{
            aspectRatio: '16/9',
            width: '100%',
            maxWidth: 'calc((100vh - 48px) * 16 / 9)',
            maxHeight: 'calc(100vh - 48px)',
          }}
        />
      </div>

      {/* Prev / Next arrows */}
      {pageIdx > 0 && (
        <button
          onClick={() => previewGoToPage(pageIdx - 1)}
          className="fixed left-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {pageIdx < total - 1 && (
        <button
          onClick={() => previewGoToPage(pageIdx + 1)}
          className="fixed right-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
