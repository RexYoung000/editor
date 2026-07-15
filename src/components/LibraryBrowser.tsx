import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, FolderOpen, LoaderCircle, Music, Search, Video, X } from 'lucide-react';
import { displayLibraryDirectoryName, displayLibraryPath } from '../utils/librarySearch';

// ─── 类型 ───

export type LibraryEntry =
  | { name: string; isDir: true; isSpineProject: boolean }
  | { name: string; isDir: false; size: number; mtime: number };

export type LibraryListResponse = {
  ok: boolean;
  path: string;
  entries: LibraryEntry[];
};

type LibraryResourceType = 'image' | 'audio' | 'video' | 'spine';

type LibrarySearchResult = {
  name: string;
  libraryPath: string;
  directory: string;
  type: LibraryResourceType;
  size: number;
  mtime: number;
  series: string;
  color: string;
  language: string;
};

type LibraryQuickTagOption = {
  id: string;
  label: string;
  group: string;
  primary: boolean;
  count: number;
};

type LibrarySearchResponse = {
  ok: boolean;
  total: number;
  truncated: boolean;
  results: LibrarySearchResult[];
  facets: {
    series: string[];
    color: string[];
    language: string[];
  };
  quickTags: LibraryQuickTagOption[];
  error?: string;
};

type LibrarySelection = {
  name: string;
  isDir: boolean;
  libraryPath?: string;
};

export type SelectResult =
  | { type: 'file'; libraryPath: string }
  | { type: 'spine'; libraryPath: string };

export type LibraryBrowserProps = {
  mode: 'file' | 'spineFolder';
  /** mode='file' 时按扩展名过滤；undefined 时按 'image' 处理 */
  fileFilter?: 'image' | 'audio' | 'video';
  onSelect: (result: SelectResult) => void | Promise<void>;
  onClose: () => void;
};

// ─── 扩展名过滤 ───

const EXT_BY_FILTER: Record<NonNullable<LibraryBrowserProps['fileFilter']>, RegExp> = {
  image: /\.(png|jpg|jpeg|gif|webp)$/i,
  audio: /\.(mp3|wav|ogg)$/i,
  video: /\.(mp4|webm|mov)$/i,
};

function fileMatchesFilter(name: string, filter: LibraryBrowserProps['fileFilter']): boolean {
  return EXT_BY_FILTER[filter ?? 'image'].test(name);
}

// ─── localStorage 记忆（按一级目录 + fileFilter 组合）───

/** 生成某个一级目录 + fileFilter 的存储 key */
function makePathKey(topLevelDir: string, mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter']): string {
  const filterKey = mode === 'spineFolder' ? 'spine' : (filter ?? 'image');
  return `forge.libraryBrowser.lastPath.${topLevelDir}.${filterKey}`;
}

/** 生成 lastUsed 标记的 key */
function makeLastUsedKey(mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter']): string {
  const filterKey = mode === 'spineFolder' ? 'spine' : (filter ?? 'image');
  return `forge.libraryBrowser.lastUsed.${filterKey}`;
}

/** 读取某个一级目录的路径记录 */
function readPathRecord(topLevelDir: string, mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter']): string[] {
  try {
    const key = makePathKey(topLevelDir, mode, filter);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.every((s: unknown) => typeof s === 'string') ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** 写入某个一级目录的路径记录 */
function writePathRecord(topLevelDir: string, mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter'], path: string[]): void {
  try {
    const key = makePathKey(topLevelDir, mode, filter);
    localStorage.setItem(key, JSON.stringify(path));
  } catch {
    // ignore
  }
}

/** 读取最近使用的一级目录名 */
function readLastUsed(mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter']): string | null {
  try {
    const key = makeLastUsedKey(mode, filter);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 写入最近使用的一级目录名 */
function writeLastUsed(topLevelDir: string, mode: LibraryBrowserProps['mode'], filter: LibraryBrowserProps['fileFilter']): void {
  try {
    const key = makeLastUsedKey(mode, filter);
    localStorage.setItem(key, topLevelDir);
  } catch {
    // ignore
  }
}

function QuickTagButton(props: {
  tag: LibraryQuickTagOption;
  active: boolean;
  onClick: () => void;
}) {
  const { tag, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${tag.label}：${tag.count} 个资源`}
      className={`flex h-7 shrink-0 items-center gap-1 rounded border px-2.5 text-xs transition-colors ${
        active
          ? 'border-blue-500 bg-blue-600 text-white'
          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <span>{tag.label}</span>
      <span className={active ? 'text-blue-100' : 'text-slate-500'}>{tag.count}</span>
    </button>
  );
}

// ─── 主组件 ───

const TAB_LEVELS_MAX = 3;
const LIBRARY_SEARCH_LIMIT = 500;

export default function LibraryBrowser(props: LibraryBrowserProps) {
  const { mode, fileFilter, onSelect, onClose } = props;

  const [pathStack, setPathStack] = useState<string[]>([]);
  const [cache, setCache] = useState<Record<string, LibraryEntry[]>>({});
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [series, setSeries] = useState('');
  const [color, setColor] = useState('');
  const [language, setLanguage] = useState('');
  const [quickTag, setQuickTag] = useState('');
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [quickTags, setQuickTags] = useState<LibraryQuickTagOption[]>([]);
  const [searchResults, setSearchResults] = useState<LibrarySearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [resolvedSearchKey, setResolvedSearchKey] = useState('');
  const [searchFailure, setSearchFailure] = useState({ key: '', message: '' });
  const [facets, setFacets] = useState<LibrarySearchResponse['facets']>({
    series: [],
    color: [],
    language: [],
  });

  const currentPath = pathStack.join('/');
  const searchType: LibraryResourceType = mode === 'spineFolder' ? 'spine' : (fileFilter ?? 'image');
  const searchActive = Boolean(query.trim() || series || color || language || quickTag);
  const searchPending = searchActive && query.trim() !== debouncedQuery.trim();
  const searchRequestKey = [searchType, debouncedQuery.trim(), series, color, language, quickTag].join('\n');
  const searchError = searchFailure.key === searchRequestKey ? searchFailure.message : '';
  const searchLoading = searchActive && !searchPending && !searchError && resolvedSearchKey !== searchRequestKey;
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const loadingRef = useRef<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** localStorage 里恢复的初始路径（用于在加载失败时自动回退并清理记忆） */
  const restoredPathRef = useRef<string[] | null>(null);

  // 加载单个路径（幂等、简单）
  const loadPath = useCallback((relPath: string) => {
    // 已缓存或正在加载 → 跳过
    if (cacheRef.current[relPath] || loadingRef.current.has(relPath)) return;

    loadingRef.current.add(relPath);

    fetch(`/api/library/list?path=${encodeURIComponent(relPath)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<LibraryListResponse>;
      })
      .then((data) => {
        setCache((prev) => ({ ...prev, [relPath]: data.entries }));
        setErrors((prev) => {
          if (!(relPath in prev)) return prev;
          const next = { ...prev };
          delete next[relPath];
          return next;
        });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setErrors((prev) => ({ ...prev, [relPath]: msg }));
        // 失效路径来自 localStorage 恢复 → 自动回退 pathStack 到最近有效的祖先目录，并清理记忆
        const restored = restoredPathRef.current;
        if (restored && restored.join('/') === relPath && relPath !== '') {
          const segs = relPath.split('/');
          const newSegs = segs.slice(0, -1);
          // 清掉 localStorage 里这个失效一级目录的路径记录
          if (segs.length > 0) {
            try { writePathRecord(segs[0], mode, fileFilter, newSegs); } catch { /* ignore */ }
          }
          restoredPathRef.current = newSegs.length > 0 ? newSegs : null;
          setPathStack(newSegs);
        }
      })
      .finally(() => {
        loadingRef.current.delete(relPath);
      });
  }, [mode, fileFilter]);

  // 监听 pathStack，加载所有需要的前缀路径
  useEffect(() => {
    const prefixes = ['', ...pathStack.map((_, i) => pathStack.slice(0, i + 1).join('/'))];
    for (const p of prefixes) {
      loadPath(p);
    }
  }, [pathStack, loadPath]);

  // 初始恢复路径：等根目录加载完成后触发一次
  const initialRestoreRef = useRef(false);
  useEffect(() => {
    if (initialRestoreRef.current) return;
    if (!cache['']) return;

    initialRestoreRef.current = true;

    const topLevelDirs = cache[''].filter((e) => e.isDir).map((e) => e.name);
    if (topLevelDirs.length === 0) return;

    // 读取最近使用的一级目录
    const lastUsed = readLastUsed(mode, fileFilter);
    let targetTopLevel: string | null = null;

    if (lastUsed && topLevelDirs.includes(lastUsed)) {
      targetTopLevel = lastUsed;
    } else {
      // 找第一个有记录的一级目录
      for (const dir of topLevelDirs) {
        const record = readPathRecord(dir, mode, fileFilter);
        if (record.length > 0 && record[0] === dir) {
          targetTopLevel = dir;
          break;
        }
      }
    }

    // 恢复路径
    if (targetTopLevel) {
      const savedPath = readPathRecord(targetTopLevel, mode, fileFilter);
      if (savedPath.length > 0) {
        restoredPathRef.current = savedPath;
        queueMicrotask(() => setPathStack(savedPath));
      }
    }
  }, [cache, mode, fileFilter]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const requestActive = Boolean(debouncedQuery.trim() || series || color || language || quickTag);
    const params = new URLSearchParams({
      type: searchType,
      q: debouncedQuery.trim(),
      series,
      color,
      language,
      quickTag,
      limit: requestActive ? String(LIBRARY_SEARCH_LIMIT) : '0',
    });
    const controller = new AbortController();

    fetch(`/api/library/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null) as LibrarySearchResponse | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        setFacets(data.facets);
        setQuickTags(data.quickTags ?? []);
        setSearchResults(requestActive ? data.results : []);
        setSearchTotal(requestActive ? data.total : 0);
        setSearchTruncated(requestActive && data.truncated);
        setResolvedSearchKey(searchRequestKey);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSearchFailure({
          key: searchRequestKey,
          message: reason instanceof Error ? reason.message : String(reason),
        });
      });

    return () => controller.abort();
  }, [searchType, debouncedQuery, series, color, language, quickTag, searchRequestKey]);

  const availableQuickTags = useMemo(() => quickTags.filter((tag) => tag.count > 0), [quickTags]);
  const primaryQuickTags = useMemo(() => availableQuickTags.filter((tag) => tag.primary), [availableQuickTags]);
  const quickTagGroups = useMemo(() => {
    const groups = new Map<string, LibraryQuickTagOption[]>();
    for (const tag of availableQuickTags) {
      const items = groups.get(tag.group) ?? [];
      items.push(tag);
      groups.set(tag.group, items);
    }
    return [...groups.entries()];
  }, [availableQuickTags]);

  const toggleQuickTag = (id: string) => {
    setQuickTag((current) => current === id ? '' : id);
    setSelected(null);
  };

  // 派生：每级 Tab 的子目录列表
  const tabsAtLevel = useMemo(() => {
    const result: Array<LibraryEntry[] | null> = [];
    for (let level = 0; level < TAB_LEVELS_MAX; level++) {
      const parentPath = pathStack.slice(0, level).join('/');
      const parentEntries = cache[parentPath];
      if (!parentEntries) {
        result.push(null);
        continue;
      }
      const dirs = parentEntries.filter((e) => e.isDir);
      result.push(dirs);
    }
    return result;
  }, [cache, pathStack]);

  const currentEntries = cache[currentPath] ?? null;
  const currentError = errors[currentPath];
  const inDeepMode = pathStack.length > TAB_LEVELS_MAX;
  const directoryShortcutLevel = tabsAtLevel[1]?.length ? 1 : 0;
  const directoryShortcuts = tabsAtLevel[directoryShortcutLevel] ?? [];
  const currentDirectoryLabel = pathStack.length > 0
    ? displayLibraryPath(pathStack)
    : '资源库首页';

  // 切换某一级 Tab
  const selectTab = (level: number, name: string) => {
    if (busy) return;

    // 如果切换的是一级 Tab，尝试恢复该一级目录的记录路径
    if (level === 0) {
      const savedPath = readPathRecord(name, mode, fileFilter);
      if (savedPath.length > 0 && savedPath[0] === name) {
        // 有记录且第一段匹配，直接恢复完整路径
        setPathStack(savedPath);
        setSelected(null);
        return;
      }
    }

    // 否则正常切换
    setPathStack([...pathStack.slice(0, level), name]);
    setSelected(null);
  };

  // 进入更深层目录（4+ 级）
  const enterFolder = (name: string) => {
    if (busy) return;
    setPathStack((prev) => [...prev, name]);
    setSelected(null);
  };

  // 面包屑跳转
  const jumpToBreadcrumb = (index: number) => {
    if (busy) return;
    setPathStack((prev) => prev.slice(0, index + 1));
    setSelected(null);
  };

  const clearSearchFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSeries('');
    setColor('');
    setLanguage('');
    setQuickTag('');
    setSelected(null);
  };

  const browseDirectoryShortcut = (name: string) => {
    clearSearchFilters();
    selectTab(directoryShortcutLevel, name);
  };

  const triggerConfirm = async (nextSelected: LibrarySelection | null = selected) => {
    if (!nextSelected || busy) return;
    setBusy(true);
    try {
      // 先保存路径记录（handleConfirm 会触发 onClose 卸载组件）
      if (pathStack.length > 0) {
        const topLevelDir = pathStack[0];
        writePathRecord(topLevelDir, mode, fileFilter, pathStack);
        writeLastUsed(topLevelDir, mode, fileFilter);
      }
      await handleConfirm(nextSelected, currentPath, mode, onSelect, onClose);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl flex flex-col relative"
        style={{ width: '90vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
          <div className="text-lg font-semibold">资源库</div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
          >
            <X size={17} />
          </button>
        </div>

        {/* 全库搜索与筛选 */}
        <div className="grid shrink-0 grid-cols-1 gap-2 border-b border-slate-700 px-6 py-3 sm:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(120px,180px))]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              placeholder="搜索文件名、目录或用途"
              className="h-9 w-full rounded border border-slate-700 bg-slate-800 pl-8 pr-8 text-xs text-white outline-none focus:border-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelected(null);
                }}
                className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-700 hover:text-white"
                aria-label="清空搜索"
                title="清空搜索"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <select value={series} onChange={(event) => { setSeries(event.target.value); setSelected(null); }} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="系列">
            <option value="">全部系列</option>
            {facets.series.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={color} onChange={(event) => { setColor(event.target.value); setSelected(null); }} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="颜色">
            <option value="">全部颜色</option>
            {facets.color.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={language} onChange={(event) => { setLanguage(event.target.value); setSelected(null); }} className="h-9 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none focus:border-blue-500" aria-label="语言">
            <option value="">全部语言</option>
            {facets.language.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        {/* 用途快捷检索 */}
        {availableQuickTags.length > 0 && (
          <div className="shrink-0 border-b border-slate-700 px-6 py-2">
            <div className="flex min-h-7 items-start gap-2">
              <span className="flex h-7 shrink-0 items-center text-xs text-slate-500">快捷检索</span>
              {!showMoreTags && (
                <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
                  {primaryQuickTags.map((tag) => (
                    <QuickTagButton
                      key={tag.id}
                      tag={tag}
                      active={quickTag === tag.id}
                      onClick={() => toggleQuickTag(tag.id)}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowMoreTags((current) => !current)}
                className="flex h-7 shrink-0 items-center gap-1 rounded px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-expanded={showMoreTags}
              >
                {showMoreTags ? '收起' : '更多'}
                {showMoreTags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showMoreTags && (
              <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                {quickTagGroups.map(([group, tags]) => (
                  <div key={group} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-2">
                    <span className="flex h-7 items-center text-[11px] text-slate-500">{group}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <QuickTagButton
                          key={tag.id}
                          tag={tag}
                          active={quickTag === tag.id}
                          onClick={() => toggleQuickTag(tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 搜索期间保留目录入口，允许返回原目录或直接切换分类。 */}
        {searchActive && (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-900/70 px-6 py-2">
            <span className="shrink-0 text-xs text-slate-500">目录浏览</span>
            <button
              type="button"
              onClick={clearSearchFilters}
              className="max-w-[320px] shrink-0 truncate rounded border border-blue-500/50 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-900/50"
              title={`返回：${currentDirectoryLabel}`}
            >
              ← 返回：{currentDirectoryLabel}
            </button>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
              {directoryShortcuts.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => browseDirectoryShortcut(item.name)}
                  className="shrink-0 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                  title={`浏览目录：${displayLibraryDirectoryName(item.name)}`}
                >
                  {displayLibraryDirectoryName(item.name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 三级 Tab 栏 */}
        {!searchActive && tabsAtLevel.map((tabs, level) => {
          if (!tabs || tabs.length === 0) return null;
          if (level > pathStack.length) return null;
          const selectedName = pathStack[level];
          return (
            <ScrollableTabRow
              key={level}
              level={level}
              items={tabs}
              selectedName={selectedName}
              onSelect={(name) => selectTab(level, name)}
            />
          );
        })}

        {/* 深层模式面包屑 */}
        {!searchActive && inDeepMode && (
          <div className="px-6 py-2 border-b border-slate-700 flex items-center text-sm flex-wrap">
            <button
              className="text-blue-400 hover:underline"
              onClick={() => setPathStack(pathStack.slice(0, TAB_LEVELS_MAX))}
            >
              ...
            </button>
            {pathStack.slice(TAB_LEVELS_MAX).map((seg, i) => (
              <span key={i} className="flex items-center">
                <span className="mx-2 text-slate-500">/</span>
                <button
                  className={
                    i === pathStack.length - TAB_LEVELS_MAX - 1
                      ? 'text-slate-300'
                      : 'text-blue-400 hover:underline'
                  }
                  onClick={() => jumpToBreadcrumb(TAB_LEVELS_MAX + i)}
                  disabled={i === pathStack.length - TAB_LEVELS_MAX - 1}
                >
                    {displayLibraryDirectoryName(seg)}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 内容区域（滚动） */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {searchActive && (searchLoading || searchPending) && (
            <div className="flex h-full items-center justify-center text-slate-400">
              <LoaderCircle className="animate-spin" size={22} />
            </div>
          )}
          {searchActive && !searchLoading && !searchPending && searchError && (
            <div className="flex h-full items-center justify-center text-sm text-red-400">搜索失败：{searchError}</div>
          )}
          {searchActive && !searchLoading && !searchPending && !searchError && searchResults.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">没有匹配的资源</div>
          )}
          {searchActive && !searchLoading && !searchPending && !searchError && searchResults.length > 0 && (
            <LibrarySearchGrid
              results={searchResults}
              selected={selected}
              setSelected={setSelected}
              onConfirm={(selection) => void triggerConfirm(selection)}
              busy={busy}
            />
          )}
          {!searchActive && !currentEntries && !currentError && <div className="text-slate-400">加载中...</div>}
          {!searchActive && currentError && !currentEntries && <div className="text-red-400">加载失败: {currentError}</div>}
          {!searchActive && currentEntries && (
            <FolderAndFileGrid
              entries={currentEntries}
              mode={mode}
              fileFilter={fileFilter}
              currentPath={currentPath}
              selected={selected}
              setSelected={setSelected}
              onEnterFolder={enterFolder}
              onConfirm={(selection) => void triggerConfirm(selection)}
              busy={busy}
              showFolders={inDeepMode || pathStack.length >= TAB_LEVELS_MAX}
            />
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 text-sm">
          <div className="text-slate-400">
            {selected
              ? `已选: ${selected.name}`
              : searchActive
                ? searchTruncated ? `显示前 ${LIBRARY_SEARCH_LIMIT} 个，共 ${searchTotal} 个结果` : `${searchTotal} 个结果`
                : '未选'}
          </div>
          <div className="space-x-3">
            <button
              className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
              onClick={onClose}
              disabled={busy}
            >
              取消
            </button>
            <button
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              disabled={!selected || busy}
              onClick={() => void triggerConfirm()}
            >
              {busy ? '处理中...' : '确定'}
            </button>
          </div>
        </div>

        {/* busy 全局遮罩 */}
        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
            <div className="text-white text-sm">下载中...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 全库搜索结果 ───

type LibrarySearchGridProps = {
  results: LibrarySearchResult[];
  selected: LibrarySelection | null;
  setSelected: (selection: LibrarySelection | null) => void;
  onConfirm: (selection: LibrarySelection) => void;
  busy: boolean;
};

function LibrarySearchGrid({ results, selected, setSelected, onConfirm, busy }: LibrarySearchGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {results.map((result) => {
        const selection: LibrarySelection = {
          name: result.name,
          isDir: result.type === 'spine',
          libraryPath: result.libraryPath,
        };
        const active = selected?.libraryPath === result.libraryPath;
        const thumbnailUrl = `/builtin/library/${result.libraryPath.split('/').map(encodeURIComponent).join('/')}`;

        return (
          <button
            key={result.libraryPath}
            type="button"
            onClick={() => setSelected(selection)}
            onDoubleClick={() => onConfirm(selection)}
            disabled={busy}
            className={`relative min-w-0 overflow-hidden rounded border bg-slate-900 p-2 text-left transition-colors ${
              active ? 'border-blue-500 bg-blue-950/50' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
            }`}
            title={result.libraryPath}
          >
            <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded bg-slate-950/70">
              {result.type === 'image' && (
                <img src={thumbnailUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
              )}
              {result.type === 'audio' && <Music size={32} className="text-slate-400" />}
              {result.type === 'video' && <Video size={32} className="text-slate-400" />}
              {result.type === 'spine' && <FolderOpen size={34} className="text-slate-400" />}
            </div>
            <div className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-slate-100">{result.name}</div>
            <div className="mt-1 truncate text-[10px] text-slate-500">
              {displayLibraryPath(result.directory.split('/').filter(Boolean))}
            </div>
            <div className="mt-1 truncate text-[10px] text-slate-500">
              {[result.series, result.color, result.language].filter(Boolean).join(' / ')}
            </div>
            {active && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check size={14} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 文件夹/文件网格 ───

type FolderAndFileGridProps = {
  entries: LibraryEntry[];
  mode: LibraryBrowserProps['mode'];
  fileFilter: LibraryBrowserProps['fileFilter'];
  currentPath: string;
  selected: LibrarySelection | null;
  setSelected: (s: LibrarySelection | null) => void;
  onEnterFolder: (name: string) => void;
  onConfirm: (selection: LibrarySelection) => void;
  busy: boolean;
  showFolders: boolean;
};

function FolderAndFileGrid(props: FolderAndFileGridProps) {
  const { entries, mode, fileFilter, currentPath, selected, setSelected, onEnterFolder, onConfirm, busy, showFolders } = props;

  const visibleEntries = entries.filter((e) => {
    if (e.isDir) {
      // 文件夹：spine模式全显示；file模式看showFolders
      if (mode === 'spineFolder') return true;
      return showFolders;
    }
    // 文件：spine模式不显示文件；file模式全显示（不匹配的会标记为禁用）
    if (mode === 'spineFolder') return false;
    return true;
  });

  const folders = visibleEntries.filter((e): e is Extract<LibraryEntry, { isDir: true }> => e.isDir);
  const files = visibleEntries.filter((e): e is Extract<LibraryEntry, { isDir: false }> => !e.isDir);

  if (visibleEntries.length === 0) {
    return <div className="text-slate-500">该目录下没有可选项</div>;
  }

  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">▍文件夹</div>
          <div className="flex flex-wrap gap-3">
            {folders.map((f) => {
              const isSpineProj = f.isSpineProject;
              const disabledForFile = mode === 'file' && isSpineProj;
              const isSelected =
                mode === 'spineFolder' && isSpineProj &&
                selected?.isDir === true && selected.name === f.name;

              const baseCls =
                'px-4 py-3 rounded border min-w-[140px] text-center text-sm transition-colors';
              const selectedCls = isSelected ? 'border-blue-500 bg-blue-900/40' : 'border-slate-600';
              const interactCls = disabledForFile
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-slate-800 cursor-pointer';

              const handleClick = () => {
                if (busy || disabledForFile) return;
                if (mode === 'spineFolder' && isSpineProj) {
                  setSelected({ name: f.name, isDir: true });
                } else {
                  onEnterFolder(f.name);
                }
              };

              const handleDoubleClick = () => {
                if (busy || disabledForFile) return;
                if (mode === 'spineFolder' && isSpineProj) {
                  const selection = { name: f.name, isDir: true };
                  setSelected(selection);
                  onConfirm(selection);
                }
              };

              return (
                <button
                  key={f.name}
                  type="button"
                  className={`${baseCls} ${selectedCls} ${interactCls}`}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  title={isSpineProj ? `${displayLibraryDirectoryName(f.name)} (Spine 工程)` : displayLibraryDirectoryName(f.name)}
                  disabled={busy}
                >
                  <div>{isSpineProj ? '🦴' : '📁'} {displayLibraryDirectoryName(f.name)}</div>
                  {isSpineProj && <div className="text-xs text-slate-400 mt-1">(Spine)</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">▍文件</div>
          <div className="grid grid-cols-8 gap-2">
            {files.map((f) => {
              const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name);
              const fileLibraryPath = currentPath ? `${currentPath}/${f.name}` : f.name;
              const thumbUrl = `/builtin/library/${fileLibraryPath.split('/').map(encodeURIComponent).join('/')}`;

              const matchesFilter = fileMatchesFilter(f.name, fileFilter);
              const isSelected = selected?.isDir === false && selected.name === f.name;

              const baseCls = 'border rounded p-1 text-center transition-colors';
              const disabledCls = !matchesFilter
                ? 'border-slate-800 bg-slate-900/20 opacity-40 cursor-not-allowed'
                : 'cursor-pointer';
              const selectedCls = matchesFilter && isSelected
                ? 'border-blue-500 bg-blue-900/40'
                : matchesFilter
                ? 'border-slate-700 hover:border-slate-500'
                : '';

              return (
                <div
                  key={f.name}
                  className={`${baseCls} ${disabledCls} ${selectedCls}`}
                  onClick={() => {
                    if (busy || !matchesFilter) return;
                    setSelected({ name: f.name, isDir: false });
                  }}
                  onDoubleClick={() => {
                    if (busy || !matchesFilter) return;
                    const selection = { name: f.name, isDir: false };
                    setSelected(selection);
                    onConfirm(selection);
                  }}
                  title={matchesFilter ? f.name : `${f.name} (不匹配)`}
                >
                  {isImage ? (
                    <img
                      src={thumbUrl}
                      alt={f.name}
                      className="w-full h-20 object-contain bg-slate-800"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center text-2xl bg-slate-800">
                      🎵
                    </div>
                  )}
                  <div className="text-xs mt-1 truncate">{f.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 确认逻辑 ───

async function handleConfirm(
  selected: LibrarySelection | null,
  currentPath: string,
  mode: LibraryBrowserProps['mode'],
  onSelect: LibraryBrowserProps['onSelect'],
  onClose: LibraryBrowserProps['onClose'],
) {
  if (!selected) return;
  const libraryPath = selected.libraryPath ?? (currentPath ? `${currentPath}/${selected.name}` : selected.name);
  if (mode === 'spineFolder') {
    if (!selected.isDir) return;
    await onSelect({ type: 'spine', libraryPath });
  } else {
    if (selected.isDir) return;
    await onSelect({ type: 'file', libraryPath });
  }
  onClose();
}

// ─── 错误弹窗（导出供 FieldRenderer 用） ───

export function LibraryErrorDialog(props: { title?: string; detail: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      onClick={props.onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-700 text-base font-semibold">
          ⚠️ {props.title ?? '操作失败'}
        </div>
        <div className="px-5 py-4 text-sm whitespace-pre-wrap break-all">{props.detail}</div>
        <div className="px-5 py-3 border-t border-slate-700 flex justify-end">
          <button
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500"
            onClick={props.onClose}
            autoFocus
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 横向滚动 Tab 行 ───

type ScrollableTabRowProps = {
  level: number;
  items: LibraryEntry[];
  selectedName: string | undefined;
  onSelect: (name: string) => void;
};

function ScrollableTabRow(props: ScrollableTabRowProps) {
  const { level, items, selectedName, onSelect } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [items, updateScrollState]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedName) return;
    const target = el.querySelector(`[data-tab-name="${CSS.escape(selectedName)}"]`) as HTMLElement | null;
    if (!target) return;
    const elRect = el.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    if (tRect.left < elRect.left || tRect.right > elRect.right) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedName]);

  const scrollByDelta = (dx: number) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dx, behavior: 'smooth' });
  };

  const containerCls = level === 0
    ? 'border-b border-slate-700 bg-slate-900'
    : level === 1
    ? 'border-b border-slate-800 bg-slate-900/60'
    : 'border-b border-slate-800 bg-slate-900/30';

  const padY = level === 0 ? 'py-2' : level === 1 ? 'py-1.5' : 'py-1';

  return (
    <div className={`relative flex items-center ${containerCls} ${padY}`}>
      {canLeft && (
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-r from-slate-900 to-transparent text-slate-300 hover:text-white z-10"
          onClick={() => scrollByDelta(-200)}
          aria-label="向左滚动"
        >
          ◀
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto flex gap-2 px-6 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((it) => {
          const isSelected = it.name === selectedName;
          return (
            <button
              key={it.name}
              data-tab-name={it.name}
              type="button"
              className={makeTabClass(level, isSelected)}
              onClick={() => onSelect(it.name)}
            >
              {displayLibraryDirectoryName(it.name)}
            </button>
          );
        })}
      </div>
      {canRight && (
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-l from-slate-900 to-transparent text-slate-300 hover:text-white z-10"
          onClick={() => scrollByDelta(200)}
          aria-label="向右滚动"
        >
          ▶
        </button>
      )}
    </div>
  );
}

function makeTabClass(level: number, isSelected: boolean): string {
  if (level === 0) {
    const base = 'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors shrink-0';
    return isSelected
      ? `${base} bg-blue-600 text-white`
      : `${base} bg-slate-800 text-slate-300 hover:bg-slate-700`;
  }
  if (level === 1) {
    const base = 'px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 border';
    return isSelected
      ? `${base} border-blue-400 bg-blue-900/50 text-blue-200`
      : `${base} border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700`;
  }
  const base = 'px-2 py-0.5 text-xs whitespace-nowrap transition-colors shrink-0 border-b-2';
  return isSelected
    ? `${base} border-blue-400 text-blue-300`
    : `${base} border-transparent text-slate-400 hover:text-slate-200`;
}
