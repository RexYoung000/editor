import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FolderOpen, LoaderCircle, X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { CourseSaveAsErrorCode, CourseSaveTargetResult, CourseSaveTargetState } from '../types/electron';
import {
  getProjectSaveAsErrorCode,
  inspectProjectSaveAs,
  selectDirectory,
} from '../utils/electronFs';
import { joinCoursePathForDisplay } from '../utils/coursePathDisplay';
import ConfirmDialog from './ConfirmDialog';

type CourseKind = 'normal' | 'homework' | 'sEvaluation' | 'review';

interface Props {
  currentCourseId: string;
  kind: CourseKind;
  onConfirm: (courseId: string, dirPath: string, overwrite: boolean) => Promise<void>;
  onCancel: () => void;
}

const ERROR_KEY_BY_CODE: Record<CourseSaveAsErrorCode, string> = {
  INVALID_COURSE_ID: 'courseIdInvalid',
  INVALID_PATH: 'saveAsInvalidPath',
  SOURCE_NOT_FOUND: 'saveAsSourceNotFound',
  SOURCE_INVALID: 'saveAsSourceInvalid',
  CURRENT_PATH: 'saveAsCurrentPath',
  TARGET_INSIDE_SOURCE: 'saveAsTargetInsideSource',
  SOURCE_INSIDE_TARGET: 'saveAsSourceInsideTarget',
  TARGET_INVALID: 'saveAsTargetInvalid',
  TARGET_REQUIRES_CONFIRMATION: 'saveAsRequiresConfirmation',
  DISK_FULL: 'saveAsDiskFull',
  PERMISSION_DENIED: 'saveAsPermissionDenied',
  FILE_BUSY: 'saveAsFileBusy',
  RECOVERY_FAILED: 'saveAsRecoveryFailed',
  SAVE_AS_FAILED: 'saveAsUnknownError',
};

const STATE_ERROR_KEY: Partial<Record<CourseSaveTargetState, string>> = {
  current: 'saveAsCurrentPath',
  'target-inside-source': 'saveAsTargetInsideSource',
  'source-inside-target': 'saveAsSourceInsideTarget',
  invalid: 'saveAsTargetInvalid',
};

function getCourseIdValidationKey(courseId: string, kind: CourseKind): string | null {
  if (!courseId) return 'courseIdRequired';
  if (!/^[a-zA-Z0-9_-]+$/.test(courseId)) return 'courseIdInvalid';
  if (kind === 'homework' && !courseId.endsWith('_hw')) return 'courseIdMustEndWithHw';
  if (kind === 'sEvaluation' && !courseId.includes('_sse_')) return 'courseIdMustContainSse';
  if (kind === 'review' && !courseId.includes('_review_')) return 'courseIdMustContainReview';
  return null;
}

export default function SaveAsDialog({ currentCourseId, kind, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const [courseId, setCourseId] = useState(currentCourseId);
  const [dirPath, setDirPath] = useState<string | null>(null);
  const [inspection, setInspection] = useState<CourseSaveTargetResult | null>(null);
  const [operationError, setOperationError] = useState<CourseSaveAsErrorCode | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const inspectionSequence = useRef(0);

  const trimmedCourseId = courseId.trim();
  const validationKey = getCourseIdValidationKey(trimmedCourseId, kind);
  const inspectedTargetPath = inspection?.ok ? inspection.targetDir : null;
  const targetPath = inspectedTargetPath
    ?? (dirPath && trimmedCourseId ? joinCoursePathForDisplay(dirPath, trimmedCourseId) : '');
  const targetState = inspection?.ok ? inspection.state : null;
  const stateErrorKey = targetState ? STATE_ERROR_KEY[targetState] : null;
  const inspectionError = inspection && !inspection.ok ? inspection.code : null;
  const errorKey = validationKey
    ?? (operationError ? ERROR_KEY_BY_CODE[operationError] : null)
    ?? (inspectionError ? ERROR_KEY_BY_CODE[inspectionError] : null)
    ?? stateErrorKey
    ?? null;
  const canSubmit = Boolean(
    dirPath
    && !validationKey
    && inspection?.ok
    && (inspection.state === 'available' || inspection.state === 'replaceable')
    && !inspecting
    && !processing,
  );

  const resetTargetState = () => {
    inspectionSequence.current += 1;
    setInspection(null);
    setOperationError(null);
    setShowReplaceConfirm(false);
    setInspecting(false);
  };

  useEffect(() => {
    const sequence = ++inspectionSequence.current;
    if (!dirPath || getCourseIdValidationKey(trimmedCourseId, kind)) return;

    const timer = window.setTimeout(() => {
      setInspecting(true);
      void inspectProjectSaveAs(currentCourseId, trimmedCourseId, dirPath)
        .then((result) => {
          if (inspectionSequence.current === sequence) setInspection(result);
        })
        .catch(() => {
          if (inspectionSequence.current === sequence) setOperationError('SAVE_AS_FAILED');
        })
        .finally(() => {
          if (inspectionSequence.current === sequence) setInspecting(false);
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [currentCourseId, dirPath, kind, trimmedCourseId]);

  const handleSelectDir = async () => {
    if (processing) return;
    const result = await selectDirectory();
    if (result) {
      resetTargetState();
      setDirPath(result);
    }
  };

  const executeSave = async (overwrite: boolean) => {
    if (!dirPath || processing) return;
    setShowReplaceConfirm(false);
    setOperationError(null);
    setProcessing(true);
    try {
      await onConfirm(trimmedCourseId, dirPath, overwrite);
      onCancel();
    } catch (error) {
      const errorCode = getProjectSaveAsErrorCode(error);
      if (errorCode === 'TARGET_REQUIRES_CONFIRMATION' || errorCode === 'TARGET_INVALID' || errorCode === 'CURRENT_PATH') {
        try {
          const refreshedInspection = await inspectProjectSaveAs(currentCourseId, trimmedCourseId, dirPath);
          setInspection(refreshedInspection);
          setOperationError(refreshedInspection.ok ? null : refreshedInspection.code);
        } catch {
          setOperationError(errorCode);
        }
      } else {
        setOperationError(errorCode);
      }
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!dirPath || validationKey || processing) return;
    setOperationError(null);
    if (!inspection?.ok) {
      setOperationError(inspection?.code ?? 'SAVE_AS_FAILED');
      return;
    }
    if (inspection.state === 'replaceable') {
      setShowReplaceConfirm(true);
      return;
    }
    if (inspection.state === 'available') void executeSave(false);
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
        <div className="bg-slate-800 rounded-lg shadow-xl w-[520px] max-w-[calc(100vw-32px)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-medium text-white">{t('saveAsTitle')}</span>
            <button
              onClick={onCancel}
              disabled={processing}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('courseIdLabel')}</label>
              <input
                className={inputCls}
                value={courseId}
                onChange={(event) => {
                  resetTargetState();
                  setCourseId(event.target.value);
                }}
                disabled={processing}
                autoFocus
              />
              <p className="mt-1.5 text-xs leading-5 text-slate-400">{t('saveAsIdentityHint')}</p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('savePath')}</label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-white truncate" title={dirPath ?? ''}>
                  {dirPath || t('noPathSelected')}
                </div>
                <button
                  onClick={handleSelectDir}
                  disabled={processing}
                  className="shrink-0 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderOpen size={15} />
                  {t('selectDir')}
                </button>
              </div>
            </div>

            {targetPath && (
              <div className="rounded border border-slate-700 bg-slate-900/60 px-3 py-2.5">
                <div className="text-[11px] text-slate-500 mb-1">{t('saveAsFinalPath')}</div>
                <div className="text-xs text-slate-200 break-all" title={targetPath}>{targetPath}</div>
              </div>
            )}

            {inspecting && !processing && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LoaderCircle size={14} className="animate-spin" />
                {t('saveAsInspecting')}
              </div>
            )}
            {!inspecting && !operationError && targetState === 'available' && (
              <div className="text-xs text-emerald-400">{t('saveAsTargetAvailable')}</div>
            )}
            {!inspecting && !operationError && targetState === 'replaceable' && (
              <div className="flex items-start gap-2 text-xs leading-5 text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {t('saveAsReplaceWarning')}
              </div>
            )}
            {!inspecting && errorKey && (
              <div className="text-xs leading-5 text-red-400">{t(errorKey)}</div>
            )}
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className={`flex-1 py-2 text-sm rounded text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${targetState === 'replaceable' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {(processing || inspecting) && <LoaderCircle size={15} className="animate-spin" />}
              {processing
                ? t('saveAsProcessing')
                : targetState === 'replaceable'
                  ? t('saveAsReplaceAction')
                  : t('saveAsAction')}
            </button>
          </div>
        </div>
      </div>

      {showReplaceConfirm && targetPath && (
        <ConfirmDialog
          title={t('saveAsReplaceTitle')}
          message={`${t('saveAsReplaceMessage')}\n\n${targetPath}`}
          confirmText={t('saveAsReplaceAction')}
          danger
          onConfirm={() => void executeSave(true)}
          onCancel={() => setShowReplaceConfirm(false)}
        />
      )}
    </>
  );
}
