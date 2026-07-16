import { useEditorStore, findSubPage } from '../store/editorStore';
import { useI18n } from '../i18n/context';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Element } from '../types';

interface PageTurnPageListProps {
  element: Element;
}

export default function PageTurnPageList({ element }: PageTurnPageListProps) {
  const { t } = useI18n();
  const switchPage = useEditorStore((s) => s.switchPageTurnPage);
  const addPage = useEditorStore((s) => s.addPageTurnPage);
  const removePage = useEditorStore((s) => s.removePageTurnPage);
  const moveButtons = useEditorStore((s) => s.movePageTurnButtons);

  const currentCourse = useEditorStore((s) => s.currentCourse);
  const currentSubPageId = useEditorStore((s) => s.currentSubPageId);

  const currentPageIndex = (element.props as Record<string, unknown>).currentPageIndex as number;

  const page = findSubPage(currentCourse, currentSubPageId);

  const elements = page?.elements ?? [];
  const pageBoxes = elements.filter(e => e.parentId === element.id && e.type === 'ContainerBox');

  return (
    <div className="mb-2 pb-2 border-b border-slate-700">
      <div className="text-xs text-slate-500 mb-1.5">{t('pageManagement') || '页面管理'}</div>

      <div className="flex gap-1 overflow-x-auto mb-1.5 pb-1">
        {pageBoxes.map((box, i) => {
          const isVisible = (box.props as Record<string, unknown>).visible === true;
          return (
            <button
              key={box.id}
              onClick={() => switchPage(element.id, i)}
              className={`shrink-0 w-16 h-16 rounded border-2 transition-colors overflow-hidden ${
                i === currentPageIndex
                  ? 'border-blue-500 bg-blue-600/20'
                  : isVisible
                    ? 'border-green-500 bg-green-600/20'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              }`}
              title={`第${i + 1}页 - ${box.name || '容器Box'}`}
            >
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold">{i + 1}</span>
                  <span className="text-[8px] text-slate-500 truncate max-w-[50px]">{box.name || 'Box'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => addPage(element.id)}
          className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-blue-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
        >
          <Plus size={12} /> {t('addPageTurnPage') || '添加页面'}
        </button>
        {pageBoxes.length > 1 && (
          <button
            onClick={() => removePage(element.id, currentPageIndex)}
            className="flex items-center gap-1 py-1.5 px-2 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 rounded text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="text-[10px] text-slate-500 mt-1">
        {t('pageTurnCurrentPage') || '当前页'}: 第{currentPageIndex + 1}页 / 共{pageBoxes.length}页
      </div>

      <div className="flex gap-1 mt-1.5">
        <button
          onClick={() => moveButtons(element.id, 'top')}
          className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
          title="把翻页按钮移到元素列表 ContainerBox 的上方"
        >
          <ArrowUp size={12} /> 按钮放于最上方
        </button>
        <button
          onClick={() => moveButtons(element.id, 'bottom')}
          className="flex items-center gap-1 flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors"
          title="把翻页按钮移到元素列表 ContainerBox 的下方"
        >
          <ArrowDown size={12} /> 按钮放于最下方
        </button>
      </div>
    </div>
  );
}
