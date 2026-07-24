import { useMemo, useState } from 'react';
import { X, Trash2, FolderOpen, Pencil, Upload, Loader2, Pin } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { SubPage } from '../types';
import type { CustomTemplate } from '../utils/customTemplateFs';
import type { PresetTemplate } from '../presets';
import { filterPresetTemplates } from '../presets';
import type { CourseKind } from '../utils/courseKind';

type Mode = 'stage' | 'subPage';
type Tab = 'preset' | 'custom' | 'copyable';

type ImportOutcome =
  | { kind: 'cancelled' }
  | { kind: 'invalid' }
  | { kind: 'empty' }
  | { kind: 'result'; added: number; failures: Array<{ name: string; error: string }> }
  | { kind: 'error'; error: string };

interface Props {
  mode: Mode;
  /** stageId — only meaningful when mode === 'subPage' */
  targetStageId?: string;
  allSubPages: SubPage[];
  customTemplates: CustomTemplate[];
  pageThumbnails: Record<string, string>;
  /** stageIndex map: subPage.id → stage display index (0-based) */
  stageIndexOf: (subPageId: string) => number;
  subPageIndexOf: (subPageId: string) => number;
  /** 预设模板：独立于课件的静态模板 */
  presetTemplates?: PresetTemplate[];
  courseKind?: CourseKind;
  /** 复习课等不支持内部页面的课件隐藏内部页面预设、模板和复制来源。 */
  supportsInternalPages?: boolean;
  /** 自定义模板根目录，未设置时显示引导 */
  customTemplateDir: string | null;
  onConfirmBlank: () => void;
  onConfirmCopy: (sourceSubPageId: string) => void;
  onConfirmPreset: (presetId: string) => void;
  onConfirmTemplate: (templateId: string) => void;
  onRemoveTemplate: (templateId: string) => void;
  /** 选择/更换自定义模板根目录；返回是否成功设置（用户取消则 false） */
  onPickTemplateDir: () => Promise<boolean>;
  /** 改名；返回 ok=false 时用 error 文案提示用户 */
  onRenameTemplate: (templateId: string, newName: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** 从另一个目录批量导入模板 */
  onImportTemplates: () => Promise<ImportOutcome>;
  /** 置顶模板（移到列表第一位） */
  onPinTemplate: (templateId: string) => Promise<void>;
  onCancel: () => void;
}

export default function NewStageDialog({
  mode,
  allSubPages,
  customTemplates,
  pageThumbnails,
  stageIndexOf,
  subPageIndexOf,
  presetTemplates,
  courseKind,
  supportsInternalPages = true,
  customTemplateDir,
  onConfirmBlank,
  onConfirmCopy,
  onConfirmPreset,
  onConfirmTemplate,
  onRemoveTemplate,
  onPickTemplateDir,
  onRenameTemplate,
  onImportTemplates,
  onPinTemplate,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('preset');
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmChangeDir, setConfirmChangeDir] = useState(false);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<{ id: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importInfoDialog, setImportInfoDialog] = useState<
    | { kind: 'invalid' }
    | { kind: 'empty' }
    | { kind: 'result'; added: number; failures: Array<{ name: string; error: string }> }
    | { kind: 'error'; error: string }
    | null
  >(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'preset', label: t('presetTemplate') },
    { key: 'custom', label: t('customTemplate') },
    { key: 'copyable', label: t('copyableTemplate') },
  ];
  const visiblePresetTemplates = useMemo(() => filterPresetTemplates(presetTemplates, {
    courseKind: courseKind ?? 'normal',
    mode,
    supportsInternalPages,
  }), [presetTemplates, courseKind, mode, supportsInternalPages]);
  const copyableSubPages = allSubPages.filter((subPage) => supportsInternalPages || subPage.editorModel !== 'internal-pages');

  const canConfirm = activeTab === 'copyable' && selectedCopyId || activeTab === 'custom' && selectedTemplateId;

  const handleConfirm = () => {
    if (activeTab === 'copyable' && selectedCopyId) {
      onConfirmCopy(selectedCopyId);
    } else if (activeTab === 'custom' && selectedTemplateId) {
      onConfirmTemplate(selectedTemplateId);
    }
  };

  const startRename = (tmpl: CustomTemplate) => {
    setRenamingId(tmpl.id);
    setRenameDraft(tmpl.name);
    setRenameError(null);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const name = renameDraft.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    const cur = customTemplates.find((t) => t.id === renamingId);
    if (cur && cur.name === name) {
      setRenamingId(null);
      return;
    }
    const r = await onRenameTemplate(renamingId, name);
    if (r.ok) {
      setRenamingId(null);
      setRenameError(null);
    } else if (r.error === 'NAME_TAKEN') {
      setRenameError('当前名字已被占用，请重新输入');
    } else {
      setRenameError(`重命名失败: ${r.error}`);
    }
  };

  const handleImportClick = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const r = await onImportTemplates();
      if (r.kind === 'cancelled') return;
      if (r.kind === 'invalid') setImportInfoDialog({ kind: 'invalid' });
      else if (r.kind === 'empty') setImportInfoDialog({ kind: 'empty' });
      else if (r.kind === 'error') setImportInfoDialog({ kind: 'error', error: r.error });
      else setImportInfoDialog({ kind: 'result', added: r.added, failures: r.failures });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-[840px]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative flex items-center justify-center px-8 py-5 border-b border-slate-700">
          <span className="text-2xl font-medium text-white">模板</span>
          <button onClick={onCancel} className="absolute right-8 text-slate-400 hover:text-white"><X size={28} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedCopyId(null); setSelectedTemplateId(null); setRenamingId(null); }}
              className={`flex-1 py-3 text-base text-center transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 自定义模板 tab 顶部的路径条 */}
        {activeTab === 'custom' && customTemplateDir && (
          <div className="flex items-center gap-3 px-8 py-2 border-b border-slate-700 bg-slate-900/40 text-xs">
            <span className="text-slate-400">模板目录：</span>
            <span className="flex-1 truncate text-slate-300" title={customTemplateDir}>{customTemplateDir}</span>
            <button
              onClick={() => setConfirmChangeDir(true)}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center gap-1"
              title="更换目录"
            >
              <FolderOpen size={12} /> 更换
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-300 flex items-center gap-1"
              title="从其他模板目录导入"
            >
              <Upload size={12} /> {t('importTemplate')}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-8 py-6 min-h-[360px] max-h-[560px] overflow-y-auto">
          {activeTab === 'preset' && (
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={onConfirmBlank}
                className="aspect-[4/3] bg-slate-700 hover:bg-slate-600 border border-transparent hover:border-blue-400 rounded-lg text-base text-white flex flex-col items-center justify-center gap-2"
              >
                <span className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-2xl">+</span>
                <div className="text-base font-medium">{t('blankLevel')}</div>
                <div className="text-xs text-slate-400 px-2 text-center">{t('blankLevelDesc')}</div>
              </button>
              {visiblePresetTemplates.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onConfirmPreset(preset.id)}
                  className="aspect-[4/3] bg-slate-700 hover:bg-slate-600 border border-transparent hover:border-blue-400 rounded-lg text-base text-white flex flex-col overflow-hidden"
                >
                  <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
                    {preset.thumbnail
                      ? <img src={preset.thumbnail} className="w-full h-full object-cover" alt="" />
                      : <span className="text-2xl text-slate-500 font-medium">{t(preset.labelKey)}</span>
                    }
                  </div>
                  <div className="w-full text-center px-2 py-1.5 text-xs bg-slate-700 text-slate-300 font-medium" style={{ textAlign: 'center' }}>{t(preset.labelKey)}</div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <>
              {!customTemplateDir ? (
                <div className="flex flex-col items-center justify-center h-[280px] gap-4 text-center">
                  <div className="text-base text-slate-400">尚未设置自定义模板的本地保存目录</div>
                  <button
                    onClick={onPickTemplateDir}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded text-white flex items-center gap-2"
                  >
                    <FolderOpen size={16} /> 选择目录
                  </button>
                </div>
              ) : customTemplates.filter((template) => supportsInternalPages || template.model !== 'internal-pages-v1').length === 0 ? (
                <div className="flex items-center justify-center h-[280px] text-base text-slate-500">
                  {t('customTemplateEmpty')}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {customTemplates.filter((template) => supportsInternalPages || template.model !== 'internal-pages-v1').map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    const isRenaming = renamingId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => { if (!isRenaming) setSelectedTemplateId(tmpl.id); }}
                        className={`group relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer flex flex-col border-2 ${
                          isSelected
                            ? 'border-blue-400 ring-2 ring-blue-400/40'
                            : 'border-transparent hover:border-slate-500'
                        }`}
                      >
                        <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
                          {tmpl.thumbnail
                            ? <img src={tmpl.thumbnail} className="w-full h-full object-cover" alt="" />
                            : <span className="text-2xl text-slate-500 font-medium">T</span>
                          }
                        </div>
                        <div
                          className={`px-2 py-1.5 text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                          onDoubleClick={(e) => { e.stopPropagation(); startRename(tmpl); }}
                          title="双击重命名"
                        >
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => { setRenameDraft(e.target.value); setRenameError(null); }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={commitRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                                else if (e.key === 'Escape') { setRenamingId(null); setRenameError(null); }
                              }}
                              className="w-full bg-slate-900 text-white text-xs px-1 py-0.5 rounded border border-blue-400 outline-none"
                            />
                          ) : (
                            <div className="truncate font-medium">{tmpl.name}</div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {tmpl.model === 'internal-pages-v1' ? `${tmpl.pageCount ?? 1} 页 · ` : ''}
                            {tmpl.subPage ? [tmpl.subPage.elements, ...(tmpl.subPage.internalPages?.map((page) => page.elements) ?? [])].flat().length : tmpl.elements.length} 元素
                          </div>
                        </div>
                        {!isRenaming && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onPinTemplate(tmpl.id); }}
                              className="absolute top-1.5 right-[66px] p-1 bg-slate-700/80 hover:bg-slate-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t('pinTemplate')}
                            >
                              <Pin size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(tmpl); }}
                              className="absolute top-1.5 right-9 p-1 bg-slate-700/80 hover:bg-slate-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="重命名"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteTemplate({ id: tmpl.id, name: tmpl.name }); }}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t('deleteTemplate')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {renameError && (
                <div className="mt-3 text-xs text-red-400 text-center">{renameError}</div>
              )}
            </>
          )}

          {activeTab === 'copyable' && (
            <>
              {copyableSubPages.length === 0 ? (
                <div className="flex items-center justify-center h-[280px] text-base text-slate-500">
                  {t('noCopyableLevels')}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {copyableSubPages.map((sp) => {
                    const si = stageIndexOf(sp.id);
                    const sj = subPageIndexOf(sp.id);
                    const isSelected = selectedCopyId === sp.id;
                    const thumb = pageThumbnails[sp.id];
                    return (
                      <div
                        key={sp.id}
                        onClick={() => setSelectedCopyId(sp.id)}
                        className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer flex flex-col border-2 ${
                          isSelected
                            ? 'border-blue-400 ring-2 ring-blue-400/40'
                            : 'border-transparent hover:border-slate-500'
                        }`}
                      >
                        <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
                          {thumb
                            ? <img src={thumb} className="w-full h-full object-cover" alt="" />
                            : <span className="text-2xl text-slate-500 font-medium">{si + 1}-{sj + 1}</span>
                          }
                        </div>
                        <div className={`px-2 py-1.5 text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          <div className="truncate font-medium">{si + 1}-{sj + 1} {sp.name}</div>
                          <div className="text-[10px] text-slate-400">{sp.elements.length} 元素</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-4 px-8 py-5 border-t border-slate-700">
          <button onClick={onCancel} className="flex-1 py-3 text-base bg-slate-700 hover:bg-slate-600 rounded text-slate-300">
            {t('cancel')}
          </button>
          {canConfirm && (
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 text-base bg-blue-600 hover:bg-blue-500 rounded text-white"
            >
              {t('confirm')}
            </button>
          )}
        </div>
      </div>

      {/* 删除模板确认弹窗 */}
      {confirmDeleteTemplate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setConfirmDeleteTemplate(null)}
        >
          <div className="bg-slate-800 rounded-lg shadow-xl w-[460px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-medium text-white mb-3">{t('deleteTemplate')}</div>
            <div className="text-sm text-slate-300 leading-relaxed mb-5">
              确定删除模板 <span className="text-amber-400">"{confirmDeleteTemplate.name}"</span> 吗？删除后不可恢复。
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteTemplate(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  const id = confirmDeleteTemplate.id;
                  setConfirmDeleteTemplate(null);
                  onRemoveTemplate(id);
                  if (selectedTemplateId === id) setSelectedTemplateId(null);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded text-white"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 更换目录确认弹窗 */}
      {confirmChangeDir && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setConfirmChangeDir(false)}
        >
          <div className="bg-slate-800 rounded-lg shadow-xl w-[460px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-medium text-white mb-3">更换模板目录</div>
            <div className="text-sm text-slate-300 leading-relaxed mb-5">
              更换后将切到新目录读取模板，原目录的模板文件不会被删除，但<span className="text-amber-400">在编辑器中将不可见</span>。
              建议保留原目录用作备份。
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmChangeDir(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setConfirmChangeDir(false);
                  await onPickTemplateDir();
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
              >
                继续选择新目录
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入进度遮罩 */}
      {importing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg shadow-xl px-8 py-6 flex items-center gap-3">
            <Loader2 size={20} className="text-blue-400 animate-spin" />
            <span className="text-base text-white">{t('importing')}</span>
          </div>
        </div>
      )}

      {/* 导入结果 / 错误 弹窗 */}
      {importInfoDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
          onClick={() => setImportInfoDialog(null)}
        >
          <div className="bg-slate-800 rounded-lg shadow-xl w-[460px] p-6" onClick={(e) => e.stopPropagation()}>
            {importInfoDialog.kind === 'invalid' && (
              <>
                <div className="text-base font-medium text-white mb-3">{t('importDirInvalidTitle')}</div>
                <div className="text-sm text-slate-300 leading-relaxed mb-5">
                  {t('importDirInvalidBody')}
                </div>
              </>
            )}
            {importInfoDialog.kind === 'empty' && (
              <>
                <div className="text-base font-medium text-white mb-3">{t('importEmptyTitle')}</div>
                <div className="text-sm text-slate-300 leading-relaxed mb-5">
                  {t('importEmptyBody')}
                </div>
              </>
            )}
            {importInfoDialog.kind === 'error' && (
              <>
                <div className="text-base font-medium text-white mb-3">{t('importAllFailedTitle')}</div>
                <div className="text-sm text-slate-300 leading-relaxed mb-5 break-all">
                  {importInfoDialog.error}
                </div>
              </>
            )}
            {importInfoDialog.kind === 'result' && (
              <>
                <div className="text-base font-medium text-white mb-3">
                  {importInfoDialog.failures.length === 0
                    ? t('importSuccessTitle')
                    : importInfoDialog.added > 0
                      ? t('importPartialTitle')
                      : t('importAllFailedTitle')}
                </div>
                <div className="text-sm text-slate-300 leading-relaxed mb-3">
                  {t('importedCount').replace('{n}', String(importInfoDialog.added))}
                  {importInfoDialog.failures.length > 0 && (
                    <span className="ml-2 text-amber-400">
                      {t('importedFailedCount').replace('{n}', String(importInfoDialog.failures.length))}
                    </span>
                  )}
                </div>
                {importInfoDialog.failures.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto bg-slate-900/60 rounded p-3 mb-5 space-y-1.5">
                    {importInfoDialog.failures.map((f, i) => (
                      <div key={i} className="text-xs text-slate-300">
                        <span className="text-slate-100 font-medium">{f.name}</span>
                        <span className="text-slate-500"> — </span>
                        <span className="text-red-400 break-all">{f.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex">
              <button
                onClick={() => setImportInfoDialog(null)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
              >
                {t('gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
