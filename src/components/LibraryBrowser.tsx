import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

// ─── 类型 ───

export type LibraryEntry =
  | { name: string; isDir: true; isSpineProject: boolean }
  | { name: string; isDir: false; size: number; mtime: number };

export type LibraryListResponse = {
  ok: boolean;
  path: string;
  entries: LibraryEntry[];
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

// ─── 主组件 ───

const TAB_LEVELS_MAX = 3;

export default function LibraryBrowser(props: LibraryBrowserProps) {
  const { mode, fileFilter, onSelect, onClose } = props;

  const [pathStack, setPathStack] = useState<string[]>([]);
  const [cache, setCache] = useState<Record<string, LibraryEntry[]>>({});
  const [selected, setSelected] = useState<{ name: string; isDir: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const currentPath = pathStack.join('/');
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const loadingRef = useRef<Set<string>>(new Set());
  const errorRef = useRef<Record<string, string>>({});
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
        delete errorRef.current[relPath];
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        errorRef.current[relPath] = msg;
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
        setPathStack(savedPath);
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
  const currentError = errorRef.current[currentPath];
  const inDeepMode = pathStack.length > TAB_LEVELS_MAX;

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

  const triggerConfirm = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      // 先保存路径记录（handleConfirm 会触发 onClose 卸载组件）
      if (pathStack.length > 0) {
        const topLevelDir = pathStack[0];
        writePathRecord(topLevelDir, mode, fileFilter, pathStack);
        writeLastUsed(topLevelDir, mode, fileFilter);
      }
      await handleConfirm(selected, currentPath, mode, onSelect, onClose);
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
          <div className="text-lg font-semibold">📁 资源库</div>
          <button
            className="text-slate-400 hover:text-white text-xl px-2"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 三级 Tab 栏 */}
        {tabsAtLevel.map((tabs, level) => {
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
        {inDeepMode && (
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
                  {seg}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 内容区域（滚动） */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {!currentEntries && !currentError && <div className="text-slate-400">加载中...</div>}
          {currentError && !currentEntries && <div className="text-red-400">加载失败: {currentError}</div>}
          {currentEntries && (
            <FolderAndFileGrid
              entries={currentEntries}
              mode={mode}
              fileFilter={fileFilter}
              currentPath={currentPath}
              selected={selected}
              setSelected={setSelected}
              onEnterFolder={enterFolder}
              onConfirm={triggerConfirm}
              busy={busy}
              showFolders={inDeepMode || pathStack.length >= TAB_LEVELS_MAX}
            />
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 text-sm">
          <div className="text-slate-400">
            {selected ? `已选: ${selected.name}` : '未选'}
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

// ─── 文件夹/文件网格 ───

type FolderAndFileGridProps = {
  entries: LibraryEntry[];
  mode: LibraryBrowserProps['mode'];
  fileFilter: LibraryBrowserProps['fileFilter'];
  currentPath: string;
  selected: { name: string; isDir: boolean } | null;
  setSelected: (s: { name: string; isDir: boolean } | null) => void;
  onEnterFolder: (name: string) => void;
  onConfirm: () => void;
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
                  setSelected({ name: f.name, isDir: true });
                  setTimeout(() => onConfirm(), 0);
                }
              };

              return (
                <button
                  key={f.name}
                  type="button"
                  className={`${baseCls} ${selectedCls} ${interactCls}`}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  title={isSpineProj ? `${f.name} (Spine 工程)` : f.name}
                  disabled={busy}
                >
                  <div>{isSpineProj ? '🦴' : '📁'} {f.name}</div>
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
                    setSelected({ name: f.name, isDir: false });
                    setTimeout(() => onConfirm(), 0);
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
  selected: { name: string; isDir: boolean } | null,
  currentPath: string,
  mode: LibraryBrowserProps['mode'],
  onSelect: LibraryBrowserProps['onSelect'],
  onClose: LibraryBrowserProps['onClose'],
) {
  if (!selected) return;
  const libraryPath = currentPath ? `${currentPath}/${selected.name}` : selected.name;
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
              {it.name}
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
