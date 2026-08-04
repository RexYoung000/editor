import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clipboard,
  Eye,
  FolderGit2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Course } from '../types';
import type { PublishTargetInspection } from '../types/electron';
import { getCourseDirPath, selectDirectory } from '../utils/electronFs';
import { exportProject } from '../utils/exportProject';
import {
  contentDigestForCourse,
  contentDigestsForCourse,
  initialPublishProgress,
  movePublishProgress,
  normalizeCourseKind,
  normalizePublishParentPath,
  orderProjectUrls,
  PUBLISH_STEPS,
  previewRecordInvalidReason,
  projectNameForScope,
  projectNamesForCourse,
  requiredPublishScopes,
  scopeLabel,
  type CoursePublishState,
  type PreviewRecord,
  type PublishProgressStep,
  type PublishProjectName,
  type PublishResultRecord,
  type PublishScope,
} from '../utils/coursePublishing';
import { loadPublishConfig, type PublishConfig } from '../utils/publishConfig';
import { loadWsConfig, startCoursePackaging } from '../utils/websocket';
import { showToast } from '../utils/toast';

interface Props {
  course: Course;
  onPreview: (scope: PublishScope) => Promise<PreviewRecord>;
  onClose: () => void;
  onStatusChange: (result: PublishResultRecord) => void;
}

type PreparedSummary = Extract<Awaited<ReturnType<typeof window.electronAPI.publishPrepareSvn>>, { ok: true }>['summary'];
type SvnCapabilityResult = Awaited<ReturnType<typeof window.electronAPI.publishCheckSvn>>;

function courseFolderName(courseId: string): string {
  const courseDir = getCourseDirPath(courseId) ?? '';
  return courseDir.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) || courseId;
}

function statusLabel(result?: PublishResultRecord): string {
  if (!result) return '尚未发布';
  if (result.status === 'success') return '发布成功';
  if (result.status === 'submitted') return '发布已提交';
  if (result.status === 'notification-pending') return '等待通知打包机';
  return '打包处理失败';
}

function formatTime(value?: string): string {
  if (!value) return '未记录';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function publishErrorMessage(result: { ok: false; error: string }): string {
  return result.error || '发布操作失败';
}

export default function PublishDialog({ course, onPreview, onClose, onStatusChange }: Props) {
  const scopes = requiredPublishScopes(course);
  const projectNames = projectNamesForCourse(course);
  const folderName = courseFolderName(course.id);
  const [config, setConfig] = useState<PublishConfig | null>(null);
  const [publishState, setPublishState] = useState<CoursePublishState>({ confirmations: {} });
  const stateRef = useRef(publishState);
  const [courseDigests, setCourseDigests] = useState<Partial<Record<PublishScope, string>>>({});
  const [activeStep, setActiveStep] = useState<'preview' | 'target' | 'generate' | 'notify' | 'result'>('preview');
  const [progress, setProgress] = useState<PublishProgressStep[]>(initialPublishProgress());
  const [parentPath, setParentPath] = useState('');
  const [inspection, setInspection] = useState<PublishTargetInspection | null>(null);
  const [adoptHistorical, setAdoptHistorical] = useState(false);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [workspaceSelection, setWorkspaceSelection] = useState<{ path: string; kind: 'managed' | 'existing' } | null>(null);
  const [svnCapability, setSvnCapability] = useState<SvnCapabilityResult | null>(null);
  const [preparedToken, setPreparedToken] = useState<string | null>(null);
  const [preparedSummary, setPreparedSummary] = useState<PreparedSummary | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [commitInFlight, setCommitInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    let cancelled = false;
    Promise.all([
      loadPublishConfig(),
      window.electronAPI.publishGetState(course.id),
      contentDigestsForCourse(course),
    ]).then(([loadedConfig, loadedState, digests]) => {
      if (cancelled) return;
      setConfig(loadedConfig);
      setPublishState(loadedState);
      stateRef.current = loadedState;
      setCourseDigests(digests);
      if (loadedState.target?.baseUrl === loadedConfig.svn[normalizeCourseKind(course.kind)]) {
        setParentPath(loadedState.target.parentPath);
        if (loadedState.target.workspacePath && loadedState.target.workspaceKind === 'existing') {
          setWorkspaceSelection({ path: loadedState.target.workspacePath, kind: 'existing' });
        } else if (loadedState.lastLocalSvnFolderPath) {
          setWorkspaceSelection({ path: loadedState.lastLocalSvnFolderPath, kind: 'existing' });
        }
      } else if (loadedState.lastLocalSvnFolderPath) {
        setWorkspaceSelection({ path: loadedState.lastLocalSvnFolderPath, kind: 'existing' });
      }
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
    return () => {
      cancelled = true;
      closedRef.current = true;
    };
  }, [course]);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.publishCheckSvn().then((result) => {
      if (!cancelled) setSvnCapability(result);
    });
    return () => { cancelled = true; };
  }, []);

  const persistState = async (next: CoursePublishState) => {
    stateRef.current = next;
    if (!closedRef.current) setPublishState(next);
    const result = await window.electronAPI.publishSetState(course.id, next);
    if (!result.ok) throw new Error(result.error);
  };

  const isConfirmationValid = (scope: PublishScope): boolean => {
    const record = publishState.confirmations[scope];
    return Boolean(
      record
      && record.projectName === projectNameForScope(scope)
      && record.courseDigest === courseDigests[scope]
      && record.editorVersion === __APP_VERSION__
      && record.environmentVersion === config?.environmentVersion,
    );
  };

  const latestPreview = (scope: PublishScope): PreviewRecord | undefined => (
    publishState.latestPreviews?.[scope] ?? publishState.confirmations[scope]
  );

  const previewInvalidReason = (scope: PublishScope): string | null => previewRecordInvalidReason(
    latestPreview(scope),
    scope,
    courseDigests[scope],
    __APP_VERSION__,
    config?.environmentVersion,
  );

  const allConfirmed = scopes.every(isConfirmationValid);
  const baseUrl = config?.svn[normalizeCourseKind(course.kind)] ?? '';
  const normalizedTarget = normalizePublishParentPath(parentPath, baseUrl, folderName);

  const notifyUser = (title: string, message: string) => {
    if (closedRef.current || document.visibilityState !== 'visible') {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body: message });
    } else {
      showToast(message, title.includes('成功') ? 'success' : 'info');
    }
  };

  const updateResult = async (result: PublishResultRecord, pending: CoursePublishState['pendingNotification']) => {
    const next = { ...stateRef.current, lastPublish: result, pendingNotification: pending };
    await persistState(next);
    onStatusChange(result);
  };

  const handlePreview = async (scope: PublishScope) => {
    setError(null);
    setBusyLabel(`正在生成${scopeLabel(scope)}预览`);
    try {
      const result = await onPreview(scope);
      const next = {
        ...stateRef.current,
        latestPreviews: { ...stateRef.current.latestPreviews, [scope]: result },
      };
      stateRef.current = next;
      setPublishState(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyLabel(null);
    }
  };

  const toggleConfirmation = async (scope: PublishScope, checked: boolean) => {
    const confirmations = { ...publishState.confirmations };
    if (!checked) {
      delete confirmations[scope];
    } else {
      const record = latestPreview(scope);
      if (!record || previewInvalidReason(scope)) return;
      confirmations[scope] = { ...record, confirmedAt: new Date().toISOString() };
    }
    await persistState({ ...publishState, confirmations });
  };

  const handleInspectTarget = async () => {
    if (!normalizedTarget.ok) {
      setError(normalizedTarget.error);
      return;
    }
    if (!workspaceSelection?.path) {
      setError('请先选择一个已经通过公司 SVN 客户端拉取的本地 SVN 文件夹');
      return;
    }
    const capability = svnCapability ?? await window.electronAPI.publishCheckSvn();
    setSvnCapability(capability);
    if (!capability.ok) {
      setError(capability.error);
      return;
    }
    setBusyLabel('正在检查 SVN 目标');
    setError(null);
    setInspection(null);
    try {
      const result = await window.electronAPI.publishInspectTarget({
        courseId: course.id,
        courseKind: normalizeCourseKind(course.kind),
        baseUrl,
        parentPath: normalizedTarget.normalizedParentPath,
        projectNames,
        workspacePath: workspaceSelection.path,
      });
      if (!result.ok) throw new Error(publishErrorMessage(result));
      await persistState({ ...stateRef.current, lastLocalSvnFolderPath: workspaceSelection.path });
      setInspection(result.inspection);
      setTargetConfirmed(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyLabel(null);
    }
  };

  const handlePrepare = async () => {
    if (!inspection || !targetConfirmed) return;
    setActiveStep('generate');
    setProgress(movePublishProgress(progress, 'generate', '正在重新生成并比对确认内容'));
    setBusyLabel('正在生成完整发布工程');
    setError(null);
    try {
      const latestDigests = await contentDigestsForCourse(course);
      for (const scope of scopes) {
        const confirmation = publishState.confirmations[scope];
        if (!confirmation || confirmation.courseDigest !== latestDigests[scope]) {
          throw new Error(`${scopeLabel(scope)}内容已变化，需要重新预览并确认`);
        }
      }
      await exportProject(course, { cleanBuildOutput: true });
      if (closedRef.current) return;
      const projectDigests: Partial<Record<PublishProjectName, string>> = {};
      const root = `${getCourseDirPath(course.id)}/project/${course.id}`;
      for (const scope of scopes) {
        const projectName = projectNameForScope(scope);
        const hashResult = await window.electronAPI.publishHashDirectory(`${root}/${projectName}`);
        if (!hashResult.ok) throw new Error(hashResult.error);
        projectDigests[projectName] = hashResult.digest;
        if (publishState.confirmations[scope]?.directoryDigest !== hashResult.digest) {
          throw new Error(`${scopeLabel(scope)}生成结果与已确认预览不一致，需要重新预览`);
        }
      }
      const contentDigest = await contentDigestForCourse(course);
      setBusyLabel('正在同步到本地 SVN 文件夹');
      const savedTarget = publishState.target;
      const reusableWorkspace = workspaceSelection
        ?? (savedTarget?.finalUrl === inspection.finalUrl && savedTarget.workspacePath
          ? { path: savedTarget.workspacePath, kind: savedTarget.workspaceKind ?? 'managed' as const }
          : null);
      const result = await window.electronAPI.publishPrepareSvn({
        courseId: course.id,
        courseKind: normalizeCourseKind(course.kind),
        baseUrl,
        parentPath: inspection.parentPath,
        projectNames,
        editorVersion: __APP_VERSION__,
        environmentVersion: config?.environmentVersion ?? '',
        contentDigest,
        adoptHistorical,
        workspacePath: reusableWorkspace?.path,
        workspaceKind: 'existing',
      });
      if (!result.ok) throw new Error(publishErrorMessage(result));
      if (closedRef.current) {
        await window.electronAPI.publishCancelPrepared(result.token);
        return;
      }
      setPreparedToken(result.token);
      setPreparedSummary(result.summary);
      setProgress(movePublishProgress(progress, 'generate', '工程已准备，等待确认提交'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyLabel(null);
    }
  };

  const handleCancelPrepared = async () => {
    if (!preparedToken) return;
    setBusyLabel('正在取消本地准备');
    const result = await window.electronAPI.publishCancelPrepared(preparedToken);
    setBusyLabel(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreparedToken(null);
    setPreparedSummary(null);
    setActiveStep('target');
  };

  const startPackaging = async (pending: NonNullable<CoursePublishState['pendingNotification']>) => {
    await loadWsConfig();
    await startCoursePackaging(course.id, pending.projectUrls, {
      onMessage: (message) => setMessages((current) => [...current.slice(-39), message]),
      onComplete: (message) => {
        const result: PublishResultRecord = {
          status: 'success', publishedAt: pending.committedAt, finalUrl: pending.finalUrl,
          revision: pending.revision, projectNames, projectUrls: pending.projectUrls,
          contentDigest: pending.contentDigest, message,
        };
        void updateResult(result, undefined);
        notifyUser('课件发布成功', `课件 ${course.id} 已完成打包`);
      },
      onFailure: (message) => {
        const result: PublishResultRecord = {
          status: 'packaging-failed', publishedAt: pending.committedAt, finalUrl: pending.finalUrl,
          revision: pending.revision, projectNames, projectUrls: pending.projectUrls,
          contentDigest: pending.contentDigest, message,
        };
        void updateResult(result, pending);
        notifyUser('打包处理失败', message);
      },
      onDisconnect: () => {
        notifyUser('课件发布已提交', '连接已断开，最终结果请查看打包机反馈群');
      },
    });
    const submitted: PublishResultRecord = {
      status: 'submitted', publishedAt: pending.committedAt, finalUrl: pending.finalUrl,
      revision: pending.revision, projectNames, projectUrls: pending.projectUrls,
      contentDigest: pending.contentDigest,
    };
    await updateResult(submitted, undefined);
    setActiveStep('result');
    setProgress(movePublishProgress(progress, 'result', '发布已提交'));
  };

  const handleCommit = async () => {
    if (!preparedToken || !preparedSummary) return;
    setCommitInFlight(true);
    setBusyLabel('正在提交 SVN，暂时不能取消');
    setError(null);
    try {
      const scopeNames = scopes.map(scopeLabel).join('、');
      const commitResult = await window.electronAPI.publishCommitSvn(
        preparedToken,
        `${preparedSummary.targetExists ? '更新' : '发布'}课件 ${course.id}（${scopeNames}）`,
      );
      if (!commitResult.ok) throw new Error(publishErrorMessage(commitResult));
      const projectUrls = orderProjectUrls(projectNames, commitResult.result.projectUrls);
      const pending = {
        courseId: course.id,
        finalUrl: commitResult.result.finalUrl,
        revision: commitResult.result.revision,
        projectUrls,
        contentDigest: commitResult.result.contentDigest,
        committedAt: commitResult.result.committedAt,
      };
      const target = {
        baseUrl,
        parentPath: inspection?.parentPath ?? parentPath,
        finalUrl: commitResult.result.finalUrl,
        courseFolderName: folderName,
        workspacePath: commitResult.result.workspacePath,
        workspaceKind: 'existing' as const,
        svnRevision: commitResult.result.revision,
      };
      const waiting: PublishResultRecord = {
        status: 'notification-pending', publishedAt: pending.committedAt, finalUrl: pending.finalUrl,
        revision: pending.revision, projectNames, projectUrls, contentDigest: pending.contentDigest,
      };
      await persistState({ ...stateRef.current, target, pendingNotification: pending, lastPublish: waiting });
      onStatusChange(waiting);
      setPreparedToken(null);
      setActiveStep('notify');
      setProgress(movePublishProgress(progress, 'notify', '正在通知现有打包机'));
      setBusyLabel('正在通知现有打包机');
      try {
        await startPackaging(pending);
      } catch (reason) {
        setActiveStep('result');
        const message = reason instanceof Error ? reason.message : String(reason);
        await updateResult({ ...waiting, message }, pending);
        setError(`SVN 已提交到 r${pending.revision}，但通知打包机失败：${message}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setCommitInFlight(false);
      setBusyLabel(null);
    }
  };

  const handleDialogClose = () => {
    if (commitInFlight) return;
    if (preparedToken) {
      void handleCancelPrepared();
      return;
    }
    onClose();
  };

  const handleRetryNotification = async () => {
    const pending = publishState.pendingNotification;
    if (!pending) return;
    setBusyLabel('正在重新通知打包机');
    setError(null);
    try {
      const digest = await contentDigestForCourse(course);
      if (digest !== pending.contentDigest) throw new Error('课件内容已经变化，不能复用上次提交；请重新预览并发布');
      await startPackaging(pending);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyLabel(null);
    }
  };

  const currentStepIndex = PUBLISH_STEPS.findIndex((step) => step.id === activeStep);
  const result = publishState.lastPublish;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-6" role="dialog" aria-modal="true" aria-label="发布课件">
      <div className="relative flex h-[min(760px,92vh)] w-[min(980px,96vw)] overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-2xl">
        <aside className="w-32 shrink-0 border-r border-slate-700 bg-slate-950/70 px-3 py-5 sm:w-56 sm:px-5 sm:py-6">
          <div className="mb-7">
            <div className="text-xs text-slate-500">发布课件</div>
            <div className="mt-1 truncate text-sm font-semibold text-white" title={course.id}>{course.id}</div>
          </div>
          <ol className="space-y-1">
            {PUBLISH_STEPS.map((step, index) => {
              const state = progress.find((item) => item.id === step.id)?.state;
              const active = step.id === activeStep;
              return (
                <li key={step.id} className="relative flex min-h-12 gap-2 sm:gap-3">
                  {index < PUBLISH_STEPS.length - 1 && <span className={`absolute left-[9px] top-6 h-8 w-px ${index < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                  <span className={`relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    index < currentStepIndex || state === 'complete' ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                      : active ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                        : 'border-slate-600 bg-slate-900 text-slate-500'
                  }`}>
                    {index < currentStepIndex || state === 'complete' ? <Check size={12} /> : active && busyLabel ? <LoaderCircle size={12} className="animate-spin" /> : <Circle size={8} fill="currentColor" />}
                  </span>
                  <div>
                    <div className={`text-xs sm:text-sm ${active ? 'font-medium text-white' : index < currentStepIndex ? 'text-slate-300' : 'text-slate-500'}`}>{step.label}</div>
                    {active && progress[index]?.detail && <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{progress[index].detail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
          {publishState.pendingNotification && (
            <button onClick={handleRetryNotification} className="mt-6 flex w-full items-center gap-2 border-t border-amber-500/30 pt-4 text-left text-xs text-amber-300 hover:text-amber-200">
              <RotateCcw size={14} />
              仅重试通知打包机
            </button>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-700 px-4 sm:px-7">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">{PUBLISH_STEPS[currentStepIndex]?.label}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500" title={folderName}>{folderName}</p>
            </div>
            <button onClick={handleDialogClose} disabled={commitInFlight} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30" title={commitInFlight ? 'SVN 提交完成后才能关闭' : '关闭'}>
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            {error && (
              <div className="mb-5 flex gap-3 border-l-2 border-red-500 bg-red-950/25 px-4 py-3 text-sm text-red-200">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {activeStep === 'preview' && (
              <div>
                <div className="mb-5 flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-300">发布范围</span>
                  <span className={`text-xs ${allConfirmed ? 'text-emerald-400' : 'text-amber-400'}`}>{allConfirmed ? '全部已确认' : `${scopes.filter(isConfirmationValid).length}/${scopes.length} 已确认`}</span>
                </div>
                <div className="divide-y divide-slate-700">
                  {scopes.map((scope) => {
                    const record = publishState.confirmations[scope];
                    const candidate = latestPreview(scope);
                    const valid = isConfirmationValid(scope);
                    const invalidReason = previewInvalidReason(scope);
                    const canConfirm = !invalidReason;
                    return (
                      <section key={scope} className="grid grid-cols-1 items-center gap-3 py-5 sm:grid-cols-[1fr_auto] sm:gap-5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{scopeLabel(scope)}</span>
                            <code className="text-[11px] text-slate-500">{projectNameForScope(scope)}</code>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {valid ? `确认于 ${formatTime(record?.confirmedAt)}` : invalidReason ?? `预览已生成于 ${formatTime(candidate?.previewedAt)}`}
                          </div>
                          <label className={`mt-3 flex w-fit items-center gap-2 text-sm ${canConfirm ? 'cursor-pointer text-slate-300' : 'cursor-not-allowed text-slate-600'}`}>
                            <input type="checkbox" checked={valid} disabled={!canConfirm} onChange={(event) => void toggleConfirmation(scope, event.target.checked)} className="h-4 w-4 accent-emerald-500" />
                            我已确认内容无误
                          </label>
                        </div>
                        <button onClick={() => void handlePreview(scope)} disabled={Boolean(busyLabel)} className="flex items-center gap-2 rounded bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600 disabled:opacity-40">
                          <Eye size={15} />
                          {valid ? '重新预览' : '打开预览'}
                        </button>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {activeStep === 'target' && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-400">SVN 基础地址</label>
                  <div className="mt-1.5 flex min-w-0 items-start gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400"><FolderGit2 size={15} className="mt-0.5 shrink-0" /><span className="min-w-0 break-all">{baseUrl || '正在读取配置'}</span></div>
                </div>
                <div>
                  <label htmlFor="publish-parent" className="text-xs text-slate-400">业务父目录</label>
                  <input id="publish-parent" value={parentPath} onChange={(event) => { setParentPath(event.target.value); setInspection(null); setTargetConfirmed(false); }} placeholder="V9/S6" className="mt-1.5 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                </div>
                <div className="border-y border-slate-700 py-4">
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-y-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
                    <span className="text-slate-500">课件文件夹</span><span className="break-all text-slate-200">{folderName}</span>
                    <span className="text-slate-500">最终地址</span><span className="break-all text-sky-300">{normalizedTarget.ok ? normalizedTarget.finalUrl : normalizedTarget.error}</span>
                    <span className="text-slate-500">发布工程</span><span className="break-words text-slate-200">{projectNames.join('、')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-3 border-b border-slate-700 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400">本地 SVN 文件夹</div>
                    <div className="mt-1 truncate text-sm text-slate-300" title={workspaceSelection?.path}>{workspaceSelection?.path ?? '请选择公司 SVN 已拉取到电脑上的目录'}</div>
                    <div className="mt-1 text-xs text-slate-500">课件源文件可以保留在原位置，不需要移动到这个目录。</div>
                  </div>
                  <button onClick={async () => { const selected = await selectDirectory(); if (selected) { setWorkspaceSelection({ path: selected, kind: 'existing' }); setInspection(null); setTargetConfirmed(false); setError(null); } }} className="shrink-0 self-end rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">选择本地 SVN 文件夹</button>
                </div>
                <div className={`flex items-center justify-between gap-3 border-l-2 px-4 py-3 text-xs ${svnCapability?.ok ? 'border-emerald-500 bg-emerald-950/15 text-emerald-200' : svnCapability && !svnCapability.ok ? 'border-red-500 bg-red-950/20 text-red-200' : 'border-slate-600 bg-slate-950 text-slate-400'}`}>
                  <span>{svnCapability?.ok ? `SVN 发布组件已就绪（${svnCapability.capability.version}）` : svnCapability && !svnCapability.ok ? svnCapability.error : '正在检查 SVN 发布组件'}</span>
                  {svnCapability && !svnCapability.ok && <button onClick={async () => { setSvnCapability(null); setSvnCapability(await window.electronAPI.publishCheckSvn()); }} className="shrink-0 rounded border border-current/30 px-2 py-1 hover:bg-white/5">重新检测</button>}
                </div>
                {inspection && (
                  <div className={`border-l-2 px-4 py-3 ${inspection.identity === 'conflict' ? 'border-red-500 bg-red-950/20' : 'border-emerald-500 bg-emerald-950/15'}`}>
                    <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck size={16} />{inspection.targetExists ? '更新已有课件' : '首次发布'}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-400">
                      {inspection.identity === 'matching' && <p>发布身份与当前课件一致，远端 revision 为 r{inspection.revision}。</p>}
                      {inspection.identity === 'historical' && <p>该目录没有 forge 身份记录，现有工程：{inspection.existingProjects.join('、')}。</p>}
                      {inspection.identity === 'conflict' && <p className="text-red-300">同名目录身份或工程结构不一致，不能覆盖。</p>}
                      {inspection.missingParentSegments.length > 0 && <p className="text-amber-300">将创建目录：{inspection.missingParentSegments.join(' / ')}</p>}
                      <p>所选目录对应：<span className="break-all text-slate-300">{inspection.localFolder.localUrl}</span></p>
                      <p>本地发布位置：<span className="break-all text-slate-300">{inspection.localFolder.localTargetPath}</span></p>
                    </div>
                    {inspection.identity === 'historical' && (
                      <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={adoptHistorical} onChange={(event) => setAdoptHistorical(event.target.checked)} className="h-4 w-4 accent-amber-500" />我确认这是同一课件</label>
                    )}
                    {inspection.identity !== 'conflict' && (
                      <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={targetConfirmed} onChange={(event) => setTargetConfirmed(event.target.checked)} className="h-4 w-4 accent-emerald-500" />确认以上地址和发布影响</label>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeStep === 'generate' && (
              <div>
                {!preparedSummary ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center"><LoaderCircle size={28} className="animate-spin text-sky-400" /><p className="mt-4 text-sm text-slate-300">正在生成完整工程并同步到本地 SVN 文件夹</p></div>
                ) : (
                  <div>
                    <div className="flex items-start gap-3 border-l-2 border-emerald-500 bg-emerald-950/15 px-4 py-3"><CheckCircle2 size={18} className="mt-0.5 text-emerald-400" /><div><div className="text-sm font-medium text-white">待提交内容已准备</div><div className="mt-1 text-xs text-slate-400">远端尚未修改，确认后才会 commit。</div></div></div>
                    <div className="mt-6 grid grid-cols-[96px_minmax(0,1fr)] gap-y-3 border-y border-slate-700 py-5 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                      <span className="text-slate-500">发布方式</span><span>{preparedSummary.targetExists ? '更新发布' : '首次发布'}</span>
                      <span className="text-slate-500">最终地址</span><span className="break-all text-sky-300">{preparedSummary.finalUrl}</span>
                      <span className="text-slate-500">本地 SVN 位置</span><span className="break-all text-slate-300">{preparedSummary.workspacePath}</span>
                      <span className="text-slate-500">变更数量</span><span>{preparedSummary.changes.length} 项</span>
                    </div>
                    <div className="mt-5 max-h-48 overflow-y-auto font-mono text-xs text-slate-400">
                      {preparedSummary.changes.slice(0, 40).map((change, index) => <div key={`${change.path}-${index}`} className="flex gap-3 border-b border-slate-800 py-1.5"><span className="w-4 text-amber-400">{change.code}</span><span className="break-all">{change.path}</span></div>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeStep === 'notify' || activeStep === 'result') && (
              <div>
                <div className={`flex items-start gap-3 border-l-2 px-4 py-4 ${result?.status === 'success' ? 'border-emerald-500 bg-emerald-950/15' : result?.status === 'packaging-failed' ? 'border-red-500 bg-red-950/20' : 'border-sky-500 bg-sky-950/20'}`}>
                  {activeStep === 'notify' ? <LoaderCircle size={20} className="animate-spin text-sky-400" /> : result?.status === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <UploadCloud size={20} className="text-sky-400" />}
                  <div><div className="font-medium text-white">{activeStep === 'notify' ? '正在通知现有打包机' : statusLabel(result)}</div><div className="mt-1 text-sm text-slate-400">{result?.status === 'submitted' ? '最终结果请查看窗口反馈或打包机反馈群。' : result?.message}</div></div>
                </div>
                {result && (
                  <div className="mt-6 grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-y-3 border-y border-slate-700 py-5 text-sm sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                    <span className="text-slate-500">SVN revision</span><span>r{result.revision}</span><button onClick={() => void navigator.clipboard.writeText(String(result.revision))} className="text-slate-500 hover:text-white" title="复制 revision"><Clipboard size={14} /></button>
                    <span className="text-slate-500">最终地址</span><span className="break-all text-sky-300">{result.finalUrl}</span><button onClick={() => void navigator.clipboard.writeText(result.finalUrl)} className="text-slate-500 hover:text-white" title="复制地址"><Clipboard size={14} /></button>
                    <span className="text-slate-500">提交时间</span><span>{formatTime(result.publishedAt)}</span><span />
                  </div>
                )}
                {messages.length > 0 && <div className="mt-5 max-h-52 overflow-y-auto rounded bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-400">{messages.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}</div>}
              </div>
            )}
          </div>

          <footer className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-t border-slate-700 px-4 py-3 sm:px-7">
            <span className="min-w-0 truncate text-xs text-slate-500">{busyLabel ?? statusLabel(publishState.lastPublish)}</span>
            <div className="flex shrink-0 items-center gap-2">
              {activeStep === 'preview' && <button onClick={onClose} className="rounded bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">取消</button>}
              {activeStep === 'preview' && <button disabled={!allConfirmed} onClick={() => { setActiveStep('target'); setProgress(movePublishProgress(progress, 'target')); }} className="flex items-center gap-1 rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-35">下一步<ChevronRight size={15} /></button>}
              {activeStep === 'target' && <button onClick={() => { setActiveStep('preview'); setProgress(movePublishProgress(progress, 'preview')); }} className="rounded bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">上一步</button>}
              {activeStep === 'target' && !inspection && <button onClick={handleInspectTarget} disabled={!normalizedTarget.ok || !workspaceSelection?.path || svnCapability?.ok !== true || Boolean(busyLabel)} className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-35">检查地址匹配</button>}
              {activeStep === 'target' && inspection && <button onClick={handlePrepare} disabled={!targetConfirmed || inspection.identity === 'conflict' || (inspection.identity === 'historical' && !adoptHistorical) || Boolean(busyLabel)} className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-35">准备发布</button>}
              {activeStep === 'generate' && preparedSummary && <button onClick={handleCancelPrepared} disabled={Boolean(busyLabel)} className="rounded bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-35">取消准备</button>}
              {activeStep === 'generate' && preparedSummary && <button onClick={handleCommit} disabled={Boolean(busyLabel)} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-35">确认提交 SVN</button>}
              {activeStep === 'result' && publishState.pendingNotification && <button onClick={handleRetryNotification} disabled={Boolean(busyLabel)} className="flex items-center gap-2 rounded bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-35"><RotateCcw size={15} />仅重试通知</button>}
              {activeStep === 'result' && <button onClick={onClose} className="rounded bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">关闭</button>}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
