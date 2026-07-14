import { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Search, X } from 'lucide-react';

export type QuickPresetKind = 'confirm' | 'previous' | 'next' | 'audio' | 'brush' | 'clear';

export type QuickPreset = {
  libraryPath: string;
  name: string;
  series: string;
  color: string;
  language: string;
  theme: string;
  directory: string;
};

type QuickPresetResponse = {
  ok: boolean;
  kind: QuickPresetKind;
  presets: QuickPreset[];
  error?: string;
};

type Props = {
  initialKind: QuickPresetKind;
  busy: boolean;
  onClose: () => void;
  onSelect: (kind: QuickPresetKind, preset: QuickPreset) => void | Promise<void>;
};

const KIND_OPTIONS: Array<{ id: QuickPresetKind; label: string }> = [
  { id: 'confirm', label: '确定' },
  { id: 'previous', label: '上一页' },
  { id: 'next', label: '下一页' },
  { id: 'audio', label: '播放/音频' },
  { id: 'brush', label: '画笔' },
  { id: 'clear', label: '清空' },
];

function thumbnailUrl(libraryPath: string): string {
  return `/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}`;
}

function uniqueValues(items: QuickPreset[], key: 'series' | 'color' | 'language'): string[] {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
}

export default function QuickPresetDialog({ initialKind, busy, onClose, onSelect }: Props) {
  const [kind, setKind] = useState<QuickPresetKind>(initialKind);
  const [cache, setCache] = useState<Partial<Record<QuickPresetKind, QuickPreset[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState('');
  const [color, setColor] = useState('');
  const [language, setLanguage] = useState('');
  const [selected, setSelected] = useState<QuickPreset | null>(null);

  useEffect(() => {
    if (cache[kind]) return;
    let cancelled = false;
    fetch(`/api/library/quick-presets?kind=${encodeURIComponent(kind)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null) as QuickPresetResponse | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data.presets;
      })
      .then((presets) => {
        if (!cancelled) setCache((prev) => ({ ...prev, [kind]: presets }));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [kind, cache]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  const presets = useMemo(() => cache[kind] ?? [], [cache, kind]);
  const seriesOptions = useMemo(() => uniqueValues(presets, 'series'), [presets]);
  const colorOptions = useMemo(() => uniqueValues(presets, 'color'), [presets]);
  const languageOptions = useMemo(() => uniqueValues(presets, 'language'), [presets]);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN');
    return presets.filter((preset) => {
      if (series && preset.series !== series) return false;
      if (color && preset.color !== color) return false;
      if (language && preset.language !== language) return false;
      if (!keyword) return true;
      return `${preset.name} ${preset.directory} ${preset.theme}`.toLocaleLowerCase('zh-CN').includes(keyword);
    });
  }, [presets, query, series, color, language]);

  const changeKind = (nextKind: QuickPresetKind) => {
    setKind(nextKind);
    setLoading(!cache[nextKind]);
    setError('');
    setQuery('');
    setSeries('');
    setColor('');
    setLanguage('');
    setSelected(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={busy ? undefined : onClose}>
      <section
        className="flex h-[min(820px,92vh)] w-[min(1180px,96vw)] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="快捷组件预设"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 px-4">
          <h2 className="text-sm font-semibold">快捷组件</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            title="关闭"
            aria-label="关闭"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-700 px-4 py-2">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeKind(option.id)}
              disabled={busy}
              className={`h-8 shrink-0 rounded px-3 text-xs transition-colors ${
                kind === option.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-2 border-b border-slate-700 px-4 py-3 sm:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(120px,180px))]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称或目录"
              className="h-9 w-full rounded border border-slate-700 bg-slate-800 pl-8 pr-3 text-xs text-white outline-none focus:border-blue-500"
            />
          </label>
          <select value={series} onChange={(event) => setSeries(event.target.value)} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="系列">
            <option value="">全部系列</option>
            {seriesOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={color} onChange={(event) => setColor(event.target.value)} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="颜色">
            <option value="">全部颜色</option>
            {colorOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="语言">
            <option value="">全部语言</option>
            {languageOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-full items-center justify-center text-slate-400">
              <LoaderCircle className="animate-spin" size={22} />
            </div>
          )}
          {!loading && error && <div className="flex h-full items-center justify-center text-sm text-red-400">加载失败：{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">没有匹配的预设</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((preset) => {
                const active = selected?.libraryPath === preset.libraryPath;
                return (
                  <button
                    key={preset.libraryPath}
                    type="button"
                    onClick={() => setSelected(preset)}
                    disabled={busy}
                    className={`relative min-w-0 overflow-hidden rounded border bg-slate-900 p-2 text-left transition-colors ${
                      active ? 'border-blue-500 bg-blue-950/50' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                    title={preset.libraryPath}
                  >
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded bg-slate-950/70">
                      <img src={thumbnailUrl(preset.libraryPath)} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-slate-100">{preset.name}</div>
                    <div className="mt-1 truncate text-[10px] text-slate-500">{[preset.series, preset.theme, preset.color, preset.language].filter(Boolean).join(' / ')}</div>
                    {active && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-700 px-4">
          <span className="min-w-0 truncate text-xs text-slate-400">{selected ? selected.name : `${filtered.length} 个预设`}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="h-8 rounded bg-slate-800 px-4 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40">取消</button>
            <button
              type="button"
              onClick={() => selected && void onSelect(kind, selected)}
              disabled={!selected || busy}
              className="flex h-8 min-w-24 items-center justify-center rounded bg-blue-600 px-4 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="animate-spin" size={15} /> : '添加组件'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
