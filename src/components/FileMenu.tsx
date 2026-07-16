import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText, FolderOpen, Save, FilePlus2, FileInput, Images } from 'lucide-react';
import { useI18n } from '../i18n/context';
import ImportPPTDialog from './ImportPPTDialog';
import ImportImagesDialog from './ImportImagesDialog';

interface FileMenuProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export default function FileMenu({ onNew, onOpen, onSave, onSaveAs }: FileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showImportPPT, setShowImportPPT] = useState(false);
  const [showImportImages, setShowImportImages] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    { label: t('newCourse'), icon: FileText, onClick: onNew, shortcut: 'Ctrl+N' },
    { label: t('openCourse'), icon: FolderOpen, onClick: onOpen, shortcut: 'Ctrl+O' },
    { label: t('saveCourse'), icon: Save, onClick: onSave, shortcut: 'Ctrl+S' },
    { label: t('saveAs'), icon: FilePlus2, onClick: onSaveAs, shortcut: '' },
    { label: '导入 PPT', icon: FileInput, onClick: () => { setShowImportPPT(true); }, shortcut: '' },
    { label: '导入图片', icon: Images, onClick: () => { setShowImportImages(true); }, shortcut: '' },
  ];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 hover:bg-slate-700 rounded flex items-center gap-1 text-sm"
        >
          {t('file')}
          <ChevronDown size={14} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded shadow-lg py-1 z-50">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 hover:bg-slate-700 flex items-center gap-3 text-sm text-left"
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-slate-500">{item.shortcut}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showImportPPT && (
        <ImportPPTDialog onClose={() => setShowImportPPT(false)} />
      )}
      {showImportImages && (
        <ImportImagesDialog onClose={() => setShowImportImages(false)} />
      )}
    </>
  );
}
