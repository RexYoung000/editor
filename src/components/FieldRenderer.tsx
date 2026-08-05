import { useRef, useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Play, Plus, Trash2 } from 'lucide-react';
import type { Element } from '../types';
import type { PropertyDef } from '../elements/elementMeta';
import {
  isMathKeyboardPresetId,
  readCustomAnswerKeyboardConfig,
  readMathKeyboardTheme,
  type CustomAnswerKeyboardConfig,
} from '../elements/keyboardPresets';
import { readInputTextTheme } from '../utils/inputFont';
import { useEditorStore, findSubPage } from '../store/editorStore';
import { showToast } from '../utils/toast';
import { lookupBuiltinByExportPath } from '../elements/builtinAssets';
import { getCourseDirPath, readFileAsDataUrl, selectDirectory, importSpineFolder, downloadLibraryFile, downloadLibrarySpine, type SpineImportResult } from '../utils/electronFs';
import { getObject } from '../utils/laya/core';
import { ColorPicker } from './ColorPicker';
import { useI18n } from '../i18n/context';
import { translateLabel } from '../elements/elementMetaI18n';
import { FONT_LIBRARY, lookupFont, normalizeFontLibraryId } from '../elements/fontLibrary';
import { loadLocalFont } from '../utils/fontLoader';
import LibraryBrowser, { LibraryErrorDialog, type SelectResult } from './LibraryBrowser';
import { parseFiniteNumberDraft } from '../utils/propertyEditSession';
import ThemeSwatches from './ThemeSwatches';
import { pauseSpineAtFirstFrame, playSpineOnce, resolveSpineAnimationIndex } from '../utils/spinePreview';

function getVal(elements: Element[], key: string): unknown {
  if (elements.length === 0) return '';
  const first = elements[0].props?.[key];
  return elements.every((el) => el.props?.[key] === first) ? first : '__MULTI__';
}

const inputCls = 'w-full px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-blue-500';

function Row({ label, tooltip, children, stacked }: { label: string; tooltip?: string; children: React.ReactNode; stacked?: boolean }) {
  const { language } = useI18n();
  const translatedLabel = translateLabel(label, language);
  if (stacked) return <div className="mb-2"><div className="text-xs text-slate-400 mb-1" title={tooltip}>{translatedLabel}</div>{children}</div>;
  return <div className="flex items-center gap-2 mb-1.5"><span className="text-xs text-slate-400 shrink-0 w-16 truncate" title={tooltip}>{translatedLabel}</span><div className="flex-1 min-w-0">{children}</div></div>;
}

interface FileFieldProps {
  field: PropertyDef;
  elements: Element[];
  val: unknown;
  isMulti: boolean;
  onChange: (key: string, value: unknown) => void;
}

function FileField({ field, elements, val, isMulti, onChange }: FileFieldProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentVal = isMulti ? '' : ((val as string) ?? '');
  const isImage = typeof currentVal === 'string'
    && !currentVal.startsWith('share/')
    && (currentVal.endsWith('.png') || currentVal.endsWith('.jpg') || currentVal.endsWith('.jpeg') || currentVal.startsWith('data:image') || currentVal.startsWith('/uploads/') || currentVal.startsWith('images/'));
  const [localPreview, setLocalPreview] = useState<string>('');
  const [libBrowserOpen, setLibBrowserOpen] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);
  const [libBusy, setLibBusy] = useState(false);
  useEffect(() => {
    if (typeof currentVal === 'string' && currentVal.startsWith('images/')) {
      const courseId = (window as unknown as { __forgeCourseId?: string }).__forgeCourseId;
      if (courseId) {
        import('../utils/electronFs').then(({ readFileAsDataUrl: readUrl }) => {
          readUrl(courseId, currentVal).then(url => setLocalPreview(url ?? ''));
        });
      }
    } else {
      setLocalPreview(''); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [currentVal]);
  const previewSrc = (() => {
    if (!isImage || !currentVal) return '';
    if (currentVal.startsWith('data:image') || currentVal.startsWith('/') || currentVal.startsWith('http')) return currentVal;
    if (currentVal.startsWith('images/') && localPreview) return localPreview;
    const b = lookupBuiltinByExportPath(currentVal);
    if (b) return `/builtin/${b.src}`;
    return currentVal;
  })();
  return (
    <>
    <Row label={field.label} tooltip={field.tooltip} stacked>
      {isImage && previewSrc && (
        <img src={previewSrc} className="w-full h-16 object-contain bg-slate-900 rounded mb-1" />
      )}
      {isImage && elements.length === 1 && (() => {
        const props = elements[0].props as Record<string, unknown> | undefined;
        const w = props?._naturalWidth as number | undefined;
        const h = props?._naturalHeight as number | undefined;
        const size = props?._fileSize as number | undefined;
        const fmt = props?._fileFormat as string | undefined;
        if (!w && !h && !size && !fmt) return null;
        const sizeStr = size ? (size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.round(size / 1024)}KB`) : '';
        return (
          <div className="text-[10px] text-slate-500 mb-1 flex gap-2">
            {w && h ? <span>{w}×{h}</span> : null}
            {fmt ? <span>{fmt}</span> : null}
            {sizeStr ? <span>{sizeStr}</span> : null}
          </div>
        );
      })()}
      <input className={`${inputCls} mb-1`}
        value={currentVal}
        placeholder={isMulti ? t('multipleValues') : t('resourcePath')}
        onChange={(e) => onChange(field.key, e.target.value)} />
      <input ref={inputRef} type="file" accept="image/*,audio/*,video/*" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
          const isSound = file.type.startsWith('audio/') || /\.(wav|mp3)$/i.test(file.name);
          const maxSize = isVideo ? 50 * 1024 * 1024 : isSound ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
          if (file.size > maxSize) { showToast(t('fileTooLarge'), 'error'); return; }
          const courseId = useEditorStore.getState().currentCourse?.id ?? 'default';
          try {
            const courseDir = getCourseDirPath(courseId);
            if (!courseDir) { showToast(t('uploadFailed'), 'error'); return; }
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            const ext = file.name.split('.').pop() ?? 'png';
            const relPath = await window.electronAPI.saveImageToCourse(courseDir, file.name, base64, ext);
            onChange(field.key, relPath);
            if (field.key === 'skin' || field.key === '_foregroundSkin') {
              const img = new Image();
              img.onload = () => {
                const w = img.naturalWidth, h = img.naturalHeight;
                if (w > 0 && h > 0) {
                  const updateElement = useEditorStore.getState().updateElement;
                  elements.forEach((el) => updateElement(el.id, { width: w, height: h, props: { ...el.props, [field.key]: relPath, _naturalWidth: w, _naturalHeight: h, _fileSize: file.size, _fileFormat: ext.toUpperCase() } }));
                }
              };
              const dataUrl = await readFileAsDataUrl(courseId, relPath);
              img.src = dataUrl ?? relPath;
            }
          } catch {
            showToast(t('uploadFailed'), 'error');
          }
        }} />
      <div className="flex gap-1">
        <button onClick={() => inputRef.current?.click()}
          className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer">
          本地文件
        </button>
        <button onClick={() => setLibBrowserOpen(true)} disabled={libBusy}
          className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer disabled:opacity-50">
          {libBusy ? '下载中...' : '资源库文件'}
        </button>
        {currentVal && (
          <button onClick={() => onChange(field.key, '')}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-red-900 border border-slate-600 rounded text-slate-400 cursor-pointer">
            {t('clear')}
          </button>
        )}
      </div>
    </Row>
    {libBrowserOpen && (
      <LibraryBrowser
        mode="file"
        fileFilter={field.fileType}
        onClose={() => setLibBrowserOpen(false)}
        onSelect={async (result: SelectResult) => {
          if (result.type !== 'file') return;
          const courseId = useEditorStore.getState().currentCourse?.id ?? 'default';
          setLibBusy(true);
          try {
            const { localRelPath } = await downloadLibraryFile(courseId, result.libraryPath);
            onChange(field.key, localRelPath);
            // 如果是 skin / _foregroundSkin 字段且是图片，自动取宽高（与本地文件上传逻辑一致）
            if ((field.key === 'skin' || field.key === '_foregroundSkin') && /\.(png|jpe?g|gif|webp)$/i.test(localRelPath)) {
              const img = new Image();
              img.onload = () => {
                const w = img.naturalWidth, h = img.naturalHeight;
                if (w > 0 && h > 0) {
                  const updateElement = useEditorStore.getState().updateElement;
                  const ext = (localRelPath.split('.').pop() ?? '').toUpperCase();
                  elements.forEach((el) => updateElement(el.id, { width: w, height: h, props: { ...el.props, [field.key]: localRelPath, _naturalWidth: w, _naturalHeight: h, _fileFormat: ext } }));
                }
              };
              try {
                const dataUrl = await readFileAsDataUrl(courseId, localRelPath);
                img.src = dataUrl ?? localRelPath;
              } catch { /* ignore */ }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setLibError(msg);
          } finally {
            setLibBusy(false);
          }
        }}
      />
    )}
    {libError && (
      <LibraryErrorDialog title="资源库下载失败" detail={libError} onClose={() => setLibError(null)} />
    )}
    </>
  );
}

// ─── Spine 动画文件夹上传字段 ───
// 选 Spine 项目文件夹 → 调用 IPC 转换成 .sk + .png 写到 <courseDir>/images/animation/<name>/
// 同时解析 .json 取出动画名列表，更新 element.props 的 skin / animationName / _animationList
// 注意：直接通过 store.updateElement 一次性写多个 props，所以不走 props.onChange
interface SpineFolderFieldProps {
  field: PropertyDef;
  elements: Element[];
  val: unknown;
  isMulti: boolean;
}

function SpineFolderField({ field, elements, val, isMulti }: SpineFolderFieldProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [libBrowserOpen, setLibBrowserOpen] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);
  const currentVal = isMulti ? '' : ((val as string) ?? '');

  const props = (elements[0]?.props ?? {}) as Record<string, unknown>;
  const skFiles = Array.isArray(props._skFiles) ? (props._skFiles as Array<{ url: string; animations: string[] }>) : [];
  const animationList = Array.isArray(props._animationList) ? (props._animationList as string[]) : [];
  const animationName = (props.currAniName as string) ?? '';

  // 把 importSpineFolder / downloadLibrarySpine 返回的结果应用到 element.props，
  // 本地选择文件夹和资源库下载共用这一步
  const applySpineImportResults = (results: SpineImportResult[]) => {
    const newSkFiles = results.map(r => ({ url: r.skinRelPath, animations: r.animationNames }));
    const first = results[0];
    const defaultName = first.animationNames[0] ?? '';
    const updateElement = useEditorStore.getState().updateElement;
    elements.forEach((el) => updateElement(el.id, {
      props: {
        url: first.skinRelPath,
        _animationList: first.animationNames,
        currAniName: defaultName,
        _skFiles: newSkFiles,
      },
    }));
    const totalAnims = results.reduce((s, r) => s + r.animationNames.length, 0);
    showToast(`已导入 ${results.length} 个骨骼, ${totalAnims} 个动画`, 'success');
  };

  const onPickFolder = async () => {
    if (busy) return;
    const folder = await selectDirectory();
    if (!folder) return;

    const courseId = useEditorStore.getState().currentCourse?.id;
    if (!courseId) { showToast(t('uploadFailed'), 'error'); return; }

    setBusy(true);
    try {
      const results = await importSpineFolder(courseId, folder);
      applySpineImportResults(results);
    } catch (e) {
      showToast(`Spine 导入失败：${(e as Error).message ?? e}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const onChangeSk = (url: string) => {
    const target = skFiles.find(f => f.url === url);
    if (!target) return;
    const defaultName = target.animations[0] ?? '';
    const updateElement = useEditorStore.getState().updateElement;
    elements.forEach((el) => updateElement(el.id, {
      props: { url, _animationList: target.animations, currAniName: defaultName },
    }));
  };

  const onChangeAnim = (name: string) => {
    const updateElement = useEditorStore.getState().updateElement;
    elements.forEach((el) => updateElement(el.id, { props: { currAniName: name } }));
    const el = elements[0];
    if (el) {
      const obj = getObject(el.id);
      if (obj) {
        try {
          pauseSpineAtFirstFrame(obj, resolveSpineAnimationIndex(props, name));
        } catch { /* ignore */ }
      }
    }
  };

  const onPreviewPlay = () => {
    const el = elements[0];
    if (!el) return;
    const obj = getObject(el.id);
    if (!obj) return;
    try { playSpineOnce(obj, resolveSpineAnimationIndex(props, animationName)); } catch { /* ignore */ }
  };

  const skLabel = (url: string) => url.split('/').pop()?.replace(/\.sk$/i, '') ?? url;

  return (
    <>
    <Row label={field.label} tooltip={field.tooltip} stacked>
      <input className={`${inputCls} mb-1`}
        value={currentVal}
        placeholder={isMulti ? t('multipleValues') : '尚未导入动画'}
        readOnly />
      <div className="flex gap-1 mb-2">
        <button onClick={onPickFolder} disabled={busy}
          className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer disabled:opacity-50">
          {busy ? '转换中...' : '本地 Spine 文件夹'}
        </button>
        <button onClick={() => setLibBrowserOpen(true)} disabled={busy}
          className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer disabled:opacity-50">
          {busy ? '转换中...' : '资源库 Spine 文件夹'}
        </button>
        {currentVal && (
          <button onClick={() => {
            const updateElement = useEditorStore.getState().updateElement;
            elements.forEach((el) => updateElement(el.id, {
              props: { url: '', currAniName: '', _animationList: [], _skFiles: [] },
            }));
          }}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-red-900 border border-slate-600 rounded text-slate-400 cursor-pointer">
            {t('clear')}
          </button>
        )}
      </div>
      {skFiles.length > 1 && !isMulti && (
        <div className="mt-1">
          <div className="text-xs text-slate-400 mb-1">骨骼文件</div>
          <select className={`${inputCls} w-full`} value={currentVal}
            onChange={(e) => onChangeSk(e.target.value)}>
            {skFiles.map((f) => (
              <option key={f.url} value={f.url}>{skLabel(f.url)}</option>
            ))}
          </select>
        </div>
      )}
      {animationList.length > 0 && !isMulti && (
        <div className="mt-1">
          <div className="text-xs text-slate-400 mb-1">动画</div>
          <div className="flex gap-1">
            <select className={`${inputCls} flex-1`} value={animationName}
              onChange={(e) => onChangeAnim(e.target.value)}>
              {animationList.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button onClick={onPreviewPlay} title="播放一次" aria-label="播放当前 Spine 动画一次"
              className="flex h-7 w-8 items-center justify-center rounded border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white cursor-pointer shrink-0">
              <Play size={14} />
            </button>
          </div>
        </div>
      )}
    </Row>
    {libBrowserOpen && (
      <LibraryBrowser
        mode="spineFolder"
        onClose={() => setLibBrowserOpen(false)}
        onSelect={async (result: SelectResult) => {
          if (result.type !== 'spine') return;
          const courseId = useEditorStore.getState().currentCourse?.id;
          if (!courseId) { setLibError('当前未选择课程'); return; }
          setBusy(true);
          try {
            const results = await downloadLibrarySpine(courseId, result.libraryPath);
            applySpineImportResults(results);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setLibError(msg);
          } finally {
            setBusy(false);
          }
        }}
      />
    )}
    {libError && (
      <LibraryErrorDialog title="资源库 Spine 导入失败" detail={libError} onClose={() => setLibError(null)} />
    )}
    </>
  );
}

interface Props {
  field: PropertyDef;
  elements: Element[];
  onChange: (key: string, value: unknown) => void;
  propDefault?: number;
  onEditStart?: () => void;
  onEditChange?: (applyChange: () => void) => void;
  onEditCommit?: () => void;
}

function MathKeyboardThemeField({
  field,
  elements,
  onChange,
}: {
  field: PropertyDef;
  elements: Element[];
  onChange: (key: string, value: unknown) => void;
}) {
  const element = elements.length === 1 ? elements[0] : null;
  const presetId = (element?.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
  if (!element || !isMathKeyboardPresetId(presetId)) return null;
  return (
    <Row label={field.label} tooltip={field.tooltip} stacked>
      <ThemeSwatches
        value={readMathKeyboardTheme(element)}
        onChange={(theme) => onChange(field.key, theme)}
      />
    </Row>
  );
}

function InputTextThemeField({
  field,
  elements,
  onChange,
}: {
  field: PropertyDef;
  elements: Element[];
  onChange: (key: string, value: unknown) => void;
}) {
  const element = elements.length === 1 ? elements[0] : null;
  if (!element || (element.type !== 'KlInputImage' && element.type !== 'FractionInput')) return null;
  const theme = readInputTextTheme(element);
  return (
    <Row label={field.label} tooltip={field.tooltip} stacked>
      <ThemeSwatches
        value={theme}
        labelSuffix="文字"
        onChange={(nextTheme) => onChange(field.key, nextTheme)}
      />
      {!theme && <div className="mt-1 text-[10px] text-slate-500">沿用历史字体图</div>}
    </Row>
  );
}

function AnswerKeyboardField({
  field,
  elements,
  onChange,
}: {
  field: PropertyDef;
  elements: Element[];
  onChange: (key: string, value: unknown) => void;
}) {
  const element = elements.length === 1 ? elements[0] : null;
  const presetId = (element?.props as { _keyboardPreset?: { id?: unknown } } | undefined)?._keyboardPreset?.id;
  if (!element || presetId !== 'customAnswer') return null;

  const config = readCustomAnswerKeyboardConfig(element);
  const update = (next: CustomAnswerKeyboardConfig) => onChange(field.key, next);
  const trimmed = config.answers.map((answer) => answer.trim());
  const duplicateValues = new Set(trimmed.filter((answer, index) => (
    answer !== '' && trimmed.indexOf(answer) !== index
  )));
  const hasEmpty = trimmed.some((answer) => answer === '');
  const hasLong = config.answers.some((answer) => Array.from(answer).length > 4);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.answers.length) return;
    const answers = [...config.answers];
    [answers[index], answers[target]] = [answers[target], answers[index]];
    update({ ...config, answers });
  };

  return (
    <Row label={field.label} tooltip={field.tooltip} stacked>
      <div className="mb-2">
        <div className="text-[10px] text-slate-500 mb-1">键盘皮肤</div>
        <ThemeSwatches
          value={config.theme}
          onChange={(theme) => update({ ...config, theme })}
        />
      </div>

      <div className="space-y-1">
        {config.answers.map((answer, index) => {
          const normalized = answer.trim();
          const invalid = normalized === '' || duplicateValues.has(normalized) || Array.from(answer).length > 4;
          return (
            <div
              key={index}
              className="grid grid-cols-[1rem_minmax(0,1fr)_1.75rem_1.75rem_1.75rem] items-center gap-1"
            >
              <label
                data-answer-focus-area={index + 1}
                className="col-span-2 grid min-h-7 grid-cols-[1rem_minmax(0,1fr)] items-center gap-1 cursor-text"
              >
                <span className="w-4 text-right text-[10px] text-slate-500">{index + 1}</span>
                <input
                  data-answer-input={index + 1}
                  value={answer}
                  maxLength={4}
                  aria-label={`答案 ${index + 1}`}
                  onChange={(event) => {
                    const answers = [...config.answers];
                    answers[index] = event.target.value;
                    update({ ...config, answers });
                  }}
                  className={`${inputCls} h-7 min-w-0 cursor-text ${invalid ? 'border-red-500 focus:border-red-400' : ''}`}
                />
              </label>
              <button
                type="button"
                title="上移"
                aria-label={`上移答案 ${index + 1}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="h-7 w-7 flex shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white disabled:cursor-default disabled:opacity-25"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                title="下移"
                aria-label={`下移答案 ${index + 1}`}
                disabled={index === config.answers.length - 1}
                onClick={() => move(index, 1)}
                className="h-7 w-7 flex shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white disabled:cursor-default disabled:opacity-25"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                title="删除答案"
                aria-label={`删除答案 ${index + 1}`}
                disabled={config.answers.length <= 2}
                onClick={() => update({
                  ...config,
                  answers: config.answers.filter((_, answerIndex) => answerIndex !== index),
                })}
                className="h-7 w-7 flex shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-red-900/60 hover:text-red-300 disabled:cursor-default disabled:opacity-25"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => update({ ...config, answers: [...config.answers, ''] })}
        className="mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 rounded border border-slate-600 bg-slate-700 text-xs text-slate-200 hover:bg-slate-600"
      >
        <Plus size={13} />
        新增答案
      </button>

      {(hasEmpty || duplicateValues.size > 0 || hasLong) && (
        <div className="mt-1.5 text-[10px] leading-4 text-red-300">
          {hasEmpty && <div>答案不能为空。</div>}
          {duplicateValues.size > 0 && <div>答案不能重复。</div>}
          {hasLong && <div>每项答案最多 4 个字符。</div>}
        </div>
      )}
      <div className="mt-1 text-[10px] text-slate-500">{config.answers.length} 项</div>
    </Row>
  );
}

export default function FieldRenderer({
  field,
  elements,
  onChange,
  propDefault,
  onEditStart,
  onEditChange,
  onEditCommit,
}: Props) {
  const { t, language } = useI18n();
  const val = getVal(elements, field.key);
  const isMulti = val === '__MULTI__';
  const [editingNum, setEditingNum] = useState<string | undefined>(undefined);
  const applyDirectChange = (value: unknown) => {
    const applyChange = () => onChange(field.key, value);
    if (onEditChange) onEditChange(applyChange);
    else applyChange();
  };

  switch (field.type) {
    case 'mathKeyboardTheme':
      return <MathKeyboardThemeField field={field} elements={elements} onChange={onChange} />;

    case 'inputTextTheme':
      return <InputTextThemeField field={field} elements={elements} onChange={onChange} />;

    case 'answerKeyboard':
      return <AnswerKeyboardField field={field} elements={elements} onChange={onChange} />;

    case 'number': {
      const storedVal = isMulti ? '' : (val !== undefined && val !== null ? String(val) : '');
      const displayVal = editingNum ?? storedVal;
      const numDefault = propDefault ?? 0;
      return (
        <Row label={field.label} tooltip={field.tooltip}>
          <input type="number" className={inputCls} min={field.min} max={field.max} step={field.step}
            value={displayVal}
            placeholder={isMulti ? t('multipleValues') : String(numDefault)}
            onFocus={onEditStart}
            onChange={(e) => {
              const draft = e.target.value;
              setEditingNum(draft);
              const parsed = parseFiniteNumberDraft(draft);
              if (parsed !== null) applyDirectChange(parsed);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              setEditingNum(undefined);
              onEditCommit?.();
            }}
          />
        </Row>
      );
    }

    case 'text': return (
      <Row label={field.label} tooltip={field.tooltip}>
        <input className={inputCls}
          value={isMulti ? '' : ((val as string) ?? '')}
          placeholder={isMulti ? t('multipleValues') : ''}
          onFocus={onEditStart}
          onChange={(e) => applyDirectChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onBlur={onEditCommit}
        />
      </Row>
    );

    case 'textarea': return (
      <Row label={field.label} tooltip={field.tooltip} stacked>
        <textarea className={`${inputCls} resize-y`} rows={3}
          value={isMulti ? '' : ((val as string) ?? '')}
          placeholder={isMulti ? t('multipleValues') : ''}
          onFocus={onEditStart}
          onChange={(e) => applyDirectChange(e.target.value)}
          onBlur={onEditCommit}
        />
      </Row>
    );

    case 'color': {
      const color = isMulti ? '#000000' : ((val as string) || '#000000');
      return (
        <Row label={field.label} tooltip={field.tooltip}>
          <ColorPicker value={color} onChange={(c) => onChange(field.key, c)} />
        </Row>
      );
    }

    case 'select': return (
      <Row label={field.label} tooltip={field.tooltip}>
        <select className={inputCls} value={String(isMulti ? '' : (val ?? ''))}
          onChange={(e) => {
            const opt = field.options?.find((o) => String(o.value) === e.target.value);
            onChange(field.key, opt ? opt.value : e.target.value);
          }}>
          {field.options?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{translateLabel(opt.label, language)}</option>
          ))}
        </select>
      </Row>
    );

    case 'slider': return (
      <Row label={field.label} tooltip={field.tooltip}>
        <div className="flex items-center gap-1.5">
          <input type="range" className="flex-1 accent-blue-500"
            min={field.min ?? 0} max={field.max ?? 1} step={field.step ?? 0.01}
            value={isMulti ? (field.min ?? 0) : ((val as number) ?? 0)}
            onChange={(e) => onChange(field.key, Number(e.target.value))} />
          <span className="text-xs text-slate-400 w-10 text-right shrink-0">
            {isMulti ? '—' : (typeof val === 'number' ? val.toFixed(2) : String(val))}
          </span>
        </div>
      </Row>
    );

    case 'boolean': return (
      <Row label={field.label} tooltip={field.tooltip}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="accent-blue-500"
            checked={isMulti ? false : (!!val)}
            onChange={(e) => onChange(field.key, e.target.checked)} />
          <span className="text-xs text-slate-300">{val ? t('optionYes') : t('optionNo')}</span>
        </label>
      </Row>
    );

    case 'elementRef': {
      const store = useEditorStore.getState();
      const page = findSubPage(store.currentCourse, store.currentSubPageId);
      const allElements: Element[] = page?.elements ?? [];
      const currentEl = elements.length === 1 ? elements[0] : null;
      const findAncestorId = (startEl: Element | null, ancestorType: string): string | null => {
        let cur: Element | undefined = startEl ?? undefined;
        while (cur?.parentId) {
          const parent = allElements.find(e => e.id === cur!.parentId);
          if (!parent) return null;
          if (parent.type === ancestorType) return parent.id;
          cur = parent;
        }
        return null;
      };
      const collectDescendantIds = (rootId: string): Set<string> => {
        const ids = new Set<string>([rootId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const el of allElements) {
            if (el.parentId && ids.has(el.parentId) && !ids.has(el.id)) {
              ids.add(el.id);
              changed = true;
            }
          }
        }
        return ids;
      };
      const ancestorId = field.scopedToAncestorType && currentEl ? findAncestorId(currentEl, field.scopedToAncestorType) : null;
      const scopedIds = ancestorId ? collectDescendantIds(ancestorId) : null;
      const candidates = allElements.filter(el => {
        if (field.elementFilter && !field.elementFilter.includes(el.type)) return false;
        if (scopedIds && !scopedIds.has(el.id)) return false;
        return true;
      });
      return (
        <Row label={field.label} tooltip={field.tooltip}>
          <select className={inputCls} value={isMulti ? '' : ((val as string) ?? '')}
            onChange={(e) => onChange(field.key, e.target.value)}>
            <option value="">{t('none')}</option>
            {candidates.map(el => (
              <option key={el.id} value={el.name ?? el.id}>{el.name ?? el.id} ({el.type})</option>
            ))}
          </select>
        </Row>
      );
    }

    case 'matchingItemRef': {
      // 连线题正确连接：复选框列表，根据 MatchingGame.single 限制勾选数量
      const store = useEditorStore.getState();
      const page = findSubPage(store.currentCourse, store.currentSubPageId);
      const allElements: Element[] = page?.elements ?? [];
      const currentEl = elements.length === 1 ? elements[0] : null;
      // 找到当前 item 的 MatchBox 父节点 → MatchingGame 祖先节点
      const matchBox = currentEl?.parentId ? allElements.find(e => e.id === currentEl.parentId) : null;
      const matchingGame = matchBox?.parentId ? allElements.find(e => e.id === matchBox.parentId) : null;
      const singleMode = matchingGame ? (matchingGame.props as Record<string, unknown>).single === 0 : false;

      // 筛选同一个 MatchBox 下的对方阵营 MatchingItem
      const currentCamp = (currentEl?.props as Record<string, unknown>)?.camp as string | undefined;
      const connectableCamps = (currentEl?.props as Record<string, unknown>)?.connectableCamps as string | undefined;
      const candidates = allElements.filter(el => {
        if (el.type !== 'MatchingItem') return false;
        if (el.parentId !== matchBox?.id) return false;
        const elCamp = (el.props as Record<string, unknown>).camp as string | undefined;
        if (connectableCamps && elCamp) {
          return connectableCamps.split(',').map(c => c.trim()).includes(elCamp);
        }
        return elCamp && elCamp !== currentCamp;
      });

      // 当前选中的 name 列表
      const currentValue = isMulti ? [] : (String(val ?? '').split(',').filter(v => v.trim() !== ''));
      const selectedSet = new Set(currentValue);

      const handleCheck = (itemName: string, checked: boolean) => {
        let newSelected: string[];
        if (singleMode) {
          // 单线模式：只能勾选1个（radio 行为）
          newSelected = checked ? [itemName] : [];
        } else {
          // 多线模式：toggle
          if (checked) {
            newSelected = [...currentValue, itemName];
          } else {
            newSelected = currentValue.filter(n => n !== itemName);
          }
        }
        onChange(field.key, newSelected.join(','));
      };

      return (
        <Row label={field.label} tooltip={field.tooltip}>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
            {candidates.map(el => {
              const itemName = el.name ?? el.id;
              const isChecked = selectedSet.has(itemName);
              return (
                <label key={el.id} className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheck(itemName, e.target.checked)}
                    className="w-3 h-3 accent-blue-500"
                  />
                  <span className="truncate" title={itemName}>{itemName}</span>
                </label>
              );
            })}
          </div>
          {candidates.length === 0 && (
            <div className="text-xs text-slate-500">无可选项</div>
          )}
        </Row>
      );
    }

    case 'file':
      return <FileField field={field} elements={elements} val={val} isMulti={isMulti} onChange={onChange} />;

    case 'spineFolder':
      return <SpineFolderField field={field} elements={elements} val={val} isMulti={isMulti} />;

    case 'fontLibrary': {
      const currentId = isMulti ? '' : normalizeFontLibraryId(val);
      const entry = currentId ? lookupFont(currentId) : undefined;
      const displayLabel = entry?.label ?? '';
      return (
        <Row label={field.label} tooltip={field.tooltip}>
          <select
            className={inputCls}
            value={currentId}
            title={displayLabel}
            onChange={(e) => {
              const newId = e.target.value;
              onChange(field.key, newId);
              if (newId) {
                try { localStorage.setItem('forge_lastFontLibraryId', newId); } catch { /* ignore */ }
              }
            }}
          >
            {isMulti && <option value="" disabled>{t('multipleValues')}</option>}
            {FONT_LIBRARY.map((font) => (
              <option key={font.id} value={font.id}>{font.label}</option>
            ))}
          </select>
        </Row>
      );
    }

    case 'fontLocal': {
      const currentPath = isMulti ? '' : ((val as string) ?? '');
      const baseName = currentPath ? (currentPath.split('/').pop() ?? currentPath) : '';
      const inputId = `font-upload-${elements[0]?.id ?? 'multi'}`;
      return (
        <Row label={field.label} tooltip={field.tooltip} stacked>
          <div className="flex items-center gap-1 mb-1">
            <input
              className={`${inputCls} flex-1`}
              value={baseName}
              placeholder={isMulti ? t('multipleValues') : '(未使用)'}
              readOnly
            />
            <input
              type="file"
              accept=".ttf,.TTF"
              className="hidden"
              id={inputId}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  const courseId = useEditorStore.getState().currentCourse?.id;
                  if (!courseId) { showToast(t('uploadFailed'), 'error'); return; }
                  const courseDir = getCourseDirPath(courseId);
                  if (!courseDir) { showToast(t('uploadFailed'), 'error'); return; }
                  const arrayBuffer = await file.arrayBuffer();
                  const bytes = new Uint8Array(arrayBuffer);
                  let binary = '';
                  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                  const base64 = btoa(binary);
                  const ext = file.name.split('.').pop() ?? 'ttf';
                  const relPath = await window.electronAPI.saveFontToCourse(courseDir, file.name, base64, ext);
                  onChange(field.key, relPath);
                  await loadLocalFont(courseId, relPath);
                } catch {
                  showToast(t('uploadFailed'), 'error');
                }
              }}
            />
            <button
              onClick={() => document.getElementById(inputId)?.click()}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-300 cursor-pointer">
              上传
            </button>
            {currentPath && (
              <button
                onClick={() => onChange(field.key, '')}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-red-900 border border-slate-600 rounded text-slate-400 cursor-pointer">
                {t('clear')}
              </button>
            )}
          </div>
          {currentPath && (
            <div className="text-[10px] text-amber-400">⚠ 优先级高于库字体</div>
          )}
        </Row>
      );
    }

    default: return null;
  }
}
