interface ElectronEventPayloads {
  'download-vcredist-progress': { downloaded: number; total: number };
}

type ElectronEventChannel = keyof ElectronEventPayloads;
type ElectronEventListener<K extends ElectronEventChannel> = (
  event: unknown,
  payload: ElectronEventPayloads[K],
) => void;

import type {
  CoursePublishState,
  PublishProjectName,
} from '../utils/coursePublishing';

export interface PublishTargetInspection {
  baseUrl: string;
  parentPath: string;
  parentUrl: string;
  finalUrl: string;
  courseFolderName: string;
  targetExists: boolean;
  parentExists: boolean;
  nearestExistingUrl: string;
  missingParentSegments: string[];
  identity: 'new' | 'matching' | 'historical' | 'conflict';
  existingProjects: PublishProjectName[];
  revision: number;
  localFolder: {
    localPath: string;
    localUrl: string;
    repositoryRootUrl: string;
    remainingSegments: string[];
    localTargetPath: string;
  };
}

export type PublishIpcError = {
  ok: false;
  code: string;
  error: string;
  details?: unknown;
};

export type CourseSaveAsErrorCode =
  | 'INVALID_COURSE_ID'
  | 'INVALID_PATH'
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_INVALID'
  | 'CURRENT_PATH'
  | 'TARGET_INSIDE_SOURCE'
  | 'SOURCE_INSIDE_TARGET'
  | 'TARGET_INVALID'
  | 'TARGET_REQUIRES_CONFIRMATION'
  | 'DISK_FULL'
  | 'PERMISSION_DENIED'
  | 'FILE_BUSY'
  | 'RECOVERY_FAILED'
  | 'ACTIVATION_FAILED'
  | 'SAVE_AS_FAILED';

export type CourseSaveTargetState =
  | 'available'
  | 'current'
  | 'target-inside-source'
  | 'source-inside-target'
  | 'replaceable'
  | 'invalid';

export type CourseSaveTargetResult =
  | {
    ok: true;
    state: CourseSaveTargetState;
    sourceDir: string;
    parentDir: string;
    targetDir: string;
    targetExists?: boolean;
    hasVersionControlMetadata?: boolean;
  }
  | { ok: false; code: CourseSaveAsErrorCode };

export type CourseSaveAsResult =
  | { ok: true; targetDir: string; filePath: string; replaced: boolean }
  | { ok: false; code: CourseSaveAsErrorCode };

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  listDirectory: (dirPath: string) => Promise<Array<{ name: string; isDir: boolean }>>;
  createDirectory: (parentPath: string, dirName: string) => Promise<string>;
  readCourseFile: (filePath: string) => Promise<import('./index').Course>;
  writeCourseFile: (filePath: string, courseJson: string) => Promise<boolean>;
  pathExists: (filePath: string) => Promise<boolean>;
  inspectCourseSaveTarget: (params: {
    sourceDir: string;
    parentPath: string;
    targetCourseId: string;
  }) => Promise<CourseSaveTargetResult>;
  saveCourseAs: (params: {
    sourceDir: string;
    sourceCourseId: string;
    targetCourseId: string;
    parentPath: string;
    courseJson: string;
    overwrite: boolean;
  }) => Promise<CourseSaveAsResult>;
  ensureDir: (dirPath: string) => Promise<string>;
  openFolder: (folderPath: string) => Promise<boolean>;
  getPlatform: () => Promise<{ isElectron: boolean; platform: string }>;
  copyImageToCourse: (courseDir: string, srcPath: string) => Promise<string>;
  saveImageToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
  saveFontToCourse: (courseDir: string, fileName: string, base64Data: string, ext: string) => Promise<string>;
  readFileAsDataUrl: (courseDir: string, relativePath: string) => Promise<string | null>;
  cleanupUnreferencedImages: (courseDir: string, referencedPaths: string[]) => Promise<void>;
  writeTextFile: (filePath: string, content: string) => Promise<boolean>;
  writeBinaryFile: (filePath: string, base64Data: string) => Promise<boolean>;
  copyDir: (srcPath: string, destPath: string) => Promise<boolean>;
  removeDir: (dirPath: string) => Promise<boolean>;
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
  isSvnDirectory: (dirPath: string) => Promise<boolean>;
  getSubdirs: (dirPath: string) => Promise<string[]>;
  publishHashDirectory: (dirPath: string) => Promise<{ ok: true; digest: string } | PublishIpcError>;
  publishGetState: (courseId: string) => Promise<CoursePublishState>;
  publishSetState: (courseId: string, state: CoursePublishState) => Promise<{ ok: true; state: CoursePublishState } | PublishIpcError>;
  publishCheckSvn: () => Promise<{
    ok: true;
    capability: { binaryPath: string; bundled: boolean; version: string; tortoisePath: string | null };
  } | PublishIpcError>;
  publishInspectTarget: (params: {
    courseId: string;
    courseKind: 'normal' | 'homework' | 'sEvaluation' | 'review';
    baseUrl: string;
    parentPath: string;
    projectNames: PublishProjectName[];
    workspacePath: string;
  }) => Promise<{ ok: true; inspection: PublishTargetInspection } | PublishIpcError>;
  publishPrepareSvn: (params: {
    courseId: string;
    courseKind: 'normal' | 'homework' | 'sEvaluation' | 'review';
    baseUrl: string;
    parentPath: string;
    projectNames: PublishProjectName[];
    editorVersion: string;
    environmentVersion: string;
    contentDigest: string;
    adoptHistorical: boolean;
    workspacePath?: string;
    workspaceKind?: 'managed' | 'existing';
  }) => Promise<{
    ok: true;
    token: string;
    summary: {
      finalUrl: string;
      identity: PublishTargetInspection['identity'];
      targetExists: boolean;
      missingParentSegments: string[];
      workspacePath: string;
      projectDigests: Partial<Record<PublishProjectName, string>>;
      projectTreeDigest: string;
      changes: Array<{ code: string; path: string }>;
    };
  } | PublishIpcError>;
  publishCommitSvn: (token: string, message: string) => Promise<{
    ok: true;
    result: {
      revision: number;
      finalUrl: string;
      projectUrls: Partial<Record<PublishProjectName, string>>;
      workspacePath: string;
      contentDigest: string;
      committedAt: string;
    };
  } | PublishIpcError>;
  publishCancelPrepared: (token: string) => Promise<{ ok: true } | PublishIpcError>;
  getServerUrl: () => Promise<string>;
  registerCourseDir: (courseId: string, dirPath: string) => Promise<boolean>;
  copyLocalFile: (srcAbsPath: string, destAbsPath: string) => Promise<boolean>;
  materializeVideoToCourse: (params: {
    courseDir: string;
    source:
      | { kind: 'local'; path: string }
      | {
          kind: 'remote';
          path: string;
          expectedHash?: string;
          expectedHashAlgorithm?: 'md5' | 'sha256-8';
          expectedSize?: number;
        };
  }) => Promise<
    | { ok: true; relativePath: string; hash: string; size: number }
    | { ok: false; error: string }
  >;
  hashFile: (absPath: string) => Promise<{ ok: true; hash: string } | { ok: false; error: string }>;
  statFile: (absPath: string) => Promise<{ ok: true; mtime: number; size: number } | { ok: false; error: string }>;
  readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer | null>;
  compileBuild: (params: { courseDir: string; courseId: string; kind: 'normal' | 'homework' | 'sEvaluation' | 'review'; teacherId?: string }) => Promise<{ ok: boolean; outputDir?: string; error?: string }>;
  zipDirectory: (dirPath: string) => Promise<{ ok: boolean; data?: ArrayBuffer; error?: string }>;
  convertSpine: (inputDir: string, outputDir?: string) => Promise<{ ok: boolean; skPath?: string; pngPath?: string; error?: string }>;
  convertSpineAll: (inputDir: string, outputDir?: string) => Promise<{ ok: boolean; results?: Array<{ skPath: string; pngPath: string }>; error?: string }>;
  // PPT 导入相关
  detectPowerPointEngine: () => Promise<{ engine: 'office' | 'wps' | null; progId?: string; error?: string }>;
  checkVCRuntime: () => Promise<{ installed: boolean }>;
  downloadVCRedist: (serverUrl: string) => Promise<{ ok: boolean; path: string }>;
  on?: <K extends ElectronEventChannel>(channel: K, callback: ElectronEventListener<K>) => void;
  off?: <K extends ElectronEventChannel>(channel: K, callback: ElectronEventListener<K>) => void;
  openInstaller: (installerPath: string) => Promise<{ ok: boolean }>;
  selectFile?: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  convertPptToImages: (params: { pptPath: string; progId: string; conversionId?: string }) => Promise<{
    ok: boolean;
    images?: string[];
    tempDir?: string;
    error?: string;
    cancelled?: boolean;
  }>;
  cancelPptConversion: (conversionId: string) => Promise<{ ok: boolean; error?: string }>;
  cleanupTempDir: (dirPath: string) => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
