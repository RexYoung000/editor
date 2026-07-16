interface ElectronEventPayloads {
  'download-vcredist-progress': { downloaded: number; total: number };
}

type ElectronEventChannel = keyof ElectronEventPayloads;
type ElectronEventListener<K extends ElectronEventChannel> = (
  event: unknown,
  payload: ElectronEventPayloads[K],
) => void;

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  listDirectory: (dirPath: string) => Promise<Array<{ name: string; isDir: boolean }>>;
  createDirectory: (parentPath: string, dirName: string) => Promise<string>;
  readCourseFile: (filePath: string) => Promise<import('./index').Course>;
  writeCourseFile: (filePath: string, courseJson: string) => Promise<boolean>;
  pathExists: (filePath: string) => Promise<boolean>;
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
  svnCommit: (dirPath: string) => Promise<{ ok: boolean }>;
  svnGetUrl: (dirPath: string) => Promise<string | null>;
  svnHasUnversioned: (dirPath: string) => Promise<boolean>;
  getSubdirs: (dirPath: string) => Promise<string[]>;
  getServerUrl: () => Promise<string>;
  registerCourseDir: (courseId: string, dirPath: string) => Promise<boolean>;
  copyLocalFile: (srcAbsPath: string, destAbsPath: string) => Promise<boolean>;
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
