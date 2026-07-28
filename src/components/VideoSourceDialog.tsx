import { useEffect, useMemo, useState } from 'react';
import { Check, FolderOpen, Library, Loader2, Search, Upload, Video, X } from 'lucide-react';
import type { CourseKind } from '../utils/courseKind';
import {
  filterPresetVideos,
  PRESET_VIDEO_LANGUAGES,
  presetVideoTabVisible,
  type PresetVideoLanguage,
} from '../elements/presetVideos';
import { assetSrc } from '../elements/builtinAssets';
import {
  materializeVideoSelection,
  selectLibraryVideo,
  selectLocalVideo,
  type VideoSourceSelection,
} from '../utils/videoSource';
import LibraryBrowser, { type SelectResult } from './LibraryBrowser';

type VideoTab = 'preset' | 'local' | 'library';

interface Props {
  courseId: string;
  courseKind: CourseKind;
  mode: 'create' | 'replace';
  onConfirm: (relativePath: string) => void | Promise<void>;
  onCancel: () => void;
}

function formatSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(size / 1024))}KB`;
}

function libraryPreviewUrl(libraryPath: string): string {
  return `/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}`;
}

export default function VideoSourceDialog({
  courseId,
  courseKind,
  mode,
  onConfirm,
  onCancel,
}: Props) {
  const hasPresets = presetVideoTabVisible(courseKind);
  const [activeTab, setActiveTab] = useState<VideoTab>(hasPresets ? 'preset' : 'local');
  const [language, setLanguage] = useState<PresetVideoLanguage | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<VideoSourceSelection | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const tabs: Array<{ id: VideoTab; label: string; icon: typeof Video }> = [
    ...(hasPresets ? [{ id: 'preset' as const, label: '预设视频', icon: Video }] : []),
    { id: 'local', label: '本地上传', icon: Upload },
    { id: 'library', label: '资源库选择', icon: Library },
  ];
  const presetVideos = useMemo(
    () => filterPresetVideos(courseKind, language, query),
    [courseKind, language, query],
  );
  const selectedPreset = selection?.kind === 'preset' ? selection.video : null;
  const selectedLocal = selection?.kind === 'local' ? selection : null;
  const selectedLibrary = selection?.kind === 'library' ? selection : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !libraryOpen) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, libraryOpen, onCancel]);

  const changeTab = (tab: VideoTab) => {
    if (busy) return;
    setActiveTab(tab);
    setSelection(null);
    setError('');
  };

  const chooseLocal = async () => {
    setError('');
    try {
      const result = await selectLocalVideo();
      if (result) setSelection(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const confirm = async () => {
    if (!selection || busy) return;
    setBusy(true);
    setError('');
    try {
      const relativePath = await materializeVideoSelection(courseId, selection);
      await onConfirm(relativePath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4"
        onClick={() => { if (!busy) onCancel(); }}
      >
        <div
          className="flex max-h-[calc(100vh-32px)] w-[min(1000px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-700 px-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold">{mode === 'create' ? '选择视频并创建关卡' : '更换视频'}</h2>
              <p className="mt-0.5 text-xs text-slate-400">仅支持 MP4，单个文件不超过 50MB</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
              aria-label="关闭"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex shrink-0 border-b border-slate-700 px-2 sm:px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id)}
                  className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-sm transition-colors sm:min-w-36 sm:flex-none sm:px-4 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            {activeTab === 'preset' && (
              <div className="flex min-h-[430px] flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex overflow-hidden rounded border border-slate-700 bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setLanguage('all')}
                      className={`h-9 px-3 text-xs ${language === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                    >
                      全部
                    </button>
                    {PRESET_VIDEO_LANGUAGES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setLanguage(option.id)}
                        className={`h-9 border-l border-slate-700 px-3 text-xs ${language === option.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className="relative ml-auto block w-full max-w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索视频名称"
                      className="h-9 w-full rounded border border-slate-700 bg-slate-800 pl-9 pr-9 text-xs text-white outline-none focus:border-blue-500"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-700 hover:text-white"
                        aria-label="清空搜索"
                        title="清空搜索"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                </div>

                <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="grid content-start grid-cols-1 gap-2 sm:grid-cols-2">
                    {presetVideos.map((video) => {
                      const selected = selectedPreset?.id === video.id;
                      const languageLabel = PRESET_VIDEO_LANGUAGES.find((item) => item.id === video.language)?.label;
                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => setSelection({ kind: 'preset', video })}
                          className={`grid min-h-16 grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 rounded border px-3 py-2 text-left ${
                            selected
                              ? 'border-blue-500 bg-blue-950/40'
                              : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-700'
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-900 text-slate-400">
                            <Video size={19} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-100">{video.displayName}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">{languageLabel} · {formatSize(video.size)}</span>
                          </span>
                          {selected && <Check size={17} className="text-blue-400" />}
                        </button>
                      );
                    })}
                    {presetVideos.length === 0 && (
                      <div className="col-span-full flex min-h-48 items-center justify-center text-sm text-slate-500">
                        没有符合当前筛选的视频
                      </div>
                    )}
                  </div>

                  <div className="aspect-video self-start overflow-hidden rounded border border-slate-700 bg-black">
                    {selectedPreset ? (
                      <video
                        key={selectedPreset.id}
                        src={assetSrc(selectedPreset.assetId)}
                        controls
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
                        <Video size={32} />
                        <span className="text-xs">选择视频后可在此预览</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'local' && (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="w-full max-w-lg text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded bg-slate-800 text-slate-400">
                    <FolderOpen size={28} />
                  </span>
                  <h3 className="mt-4 text-base font-medium">从电脑选择 MP4</h3>
                  <p className="mt-1 text-xs text-slate-500">确认后才会复制到当前课件目录</p>
                  <button
                    type="button"
                    onClick={chooseLocal}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500"
                  >
                    <FolderOpen size={16} />
                    选择本地视频
                  </button>
                  {selectedLocal && (
                    <div className="mt-5 flex items-center gap-3 rounded border border-blue-500/50 bg-blue-950/30 p-3 text-left">
                      <Video size={20} className="shrink-0 text-blue-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-slate-100">{selectedLocal.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{formatSize(selectedLocal.size)}</div>
                      </div>
                      <Check size={18} className="text-blue-400" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="w-full max-w-xl text-center">
                  {selectedLibrary ? (
                    <>
                      <video
                        key={selectedLibrary.libraryPath}
                        src={libraryPreviewUrl(selectedLibrary.libraryPath)}
                        controls
                        preload="metadata"
                        className="mx-auto aspect-video w-full overflow-hidden rounded border border-slate-700 bg-black object-contain"
                      />
                      <div className="mt-3 flex items-center gap-3 rounded border border-blue-500/50 bg-blue-950/30 p-3 text-left">
                        <Video size={20} className="shrink-0 text-blue-400" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-slate-100">{selectedLibrary.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{formatSize(selectedLibrary.size)}</div>
                        </div>
                        <Check size={18} className="text-blue-400" />
                      </div>
                    </>
                  ) : (
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded bg-slate-800 text-slate-400">
                      <Library size={28} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setLibraryOpen(true)}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500"
                  >
                    <Library size={16} />
                    {selectedLibrary ? '重新选择' : '打开资源库'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-700 px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-3 rounded border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300" role="alert">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-9 rounded border border-slate-600 px-4 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!selection || busy}
                className="inline-flex h-9 min-w-32 items-center justify-center gap-2 rounded bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                {busy ? '正在处理...' : mode === 'create' ? '创建视频关卡' : '确认更换'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {libraryOpen && (
        <LibraryBrowser
          mode="file"
          fileFilter="video"
          allowedExtensions={['mp4']}
          onClose={() => setLibraryOpen(false)}
          onSelect={async (result: SelectResult) => {
            if (result.type !== 'file') return;
            try {
              const nextSelection = await selectLibraryVideo(result.libraryPath);
              setSelection(nextSelection);
              setError('');
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : String(reason));
            }
          }}
        />
      )}
    </>
  );
}
