const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  createDirectory: (parentPath, dirName) => ipcRenderer.invoke('create-directory', parentPath, dirName),
  readCourseFile: (filePath) => ipcRenderer.invoke('read-course-file', filePath),
  writeCourseFile: (filePath, courseJson) => ipcRenderer.invoke('write-course-file', filePath, courseJson),
  pathExists: (filePath) => ipcRenderer.invoke('path-exists', filePath),
  inspectCourseSaveTarget: (params) => ipcRenderer.invoke('inspect-course-save-target', params),
  saveCourseAs: (params) => ipcRenderer.invoke('save-course-as', params),
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  copyImageToCourse: (courseDir, srcPath) => ipcRenderer.invoke('copy-image-to-course', courseDir, srcPath),
  saveImageToCourse: (courseDir, fileName, base64Data, ext) => ipcRenderer.invoke('save-image-to-course', courseDir, fileName, base64Data, ext),
  saveFontToCourse: (courseDir, fileName, base64Data, ext) => ipcRenderer.invoke('save-font-to-course', courseDir, fileName, base64Data, ext),
  readFileAsDataUrl: (courseDir, relativePath) => ipcRenderer.invoke('read-file-as-dataurl', courseDir, relativePath),
  cleanupUnreferencedImages: (courseDir, referencedPaths) => ipcRenderer.invoke('cleanup-unreferenced-images', courseDir, referencedPaths),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
  writeBinaryFile: (filePath, base64Data) => ipcRenderer.invoke('write-binary-file', filePath, base64Data),
  copyDir: (srcPath, destPath) => ipcRenderer.invoke('copy-dir', srcPath, destPath),
  removeDir: (dirPath) => ipcRenderer.invoke('remove-dir', dirPath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  isSvnDirectory: (dirPath) => ipcRenderer.invoke('is-svn-directory', dirPath),
  getSubdirs: (dirPath) => ipcRenderer.invoke('get-subdirs', dirPath),
  publishHashDirectory: (dirPath) => ipcRenderer.invoke('publish-hash-directory', dirPath),
  publishGetState: (courseId) => ipcRenderer.invoke('publish-get-state', courseId),
  publishSetState: (courseId, state) => ipcRenderer.invoke('publish-set-state', courseId, state),
  publishCheckSvn: () => ipcRenderer.invoke('publish-check-svn'),
  publishInspectTarget: (params) => ipcRenderer.invoke('publish-inspect-target', params),
  publishPrepareSvn: (params) => ipcRenderer.invoke('publish-prepare-svn', params),
  publishCommitSvn: (token, message) => ipcRenderer.invoke('publish-commit-svn', token, message),
  publishCancelPrepared: (token) => ipcRenderer.invoke('publish-cancel-prepared', token),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  registerCourseDir: (courseId, dirPath) => ipcRenderer.invoke('register-course-dir', courseId, dirPath),
  copyLocalFile: (srcAbsPath, destAbsPath) => ipcRenderer.invoke('copy-local-file', srcAbsPath, destAbsPath),
  materializeVideoToCourse: (params) => ipcRenderer.invoke('materialize-video-to-course', params),
  hashFile: (absPath) => ipcRenderer.invoke('hash-file', absPath),
  statFile: (absPath) => ipcRenderer.invoke('stat-file', absPath),
  readFileAsBuffer: (filePath) => ipcRenderer.invoke('read-file-as-buffer', filePath),
  compileBuild: (params) => ipcRenderer.invoke('compile-build', params),
  zipDirectory: (dirPath) => ipcRenderer.invoke('zip-directory', dirPath),
  convertSpine: (inputDir, outputDir) => ipcRenderer.invoke('convert-spine', { inputDir, outputDir }),
  convertSpineAll: (inputDir, outputDir) => ipcRenderer.invoke('convert-spine-all', { inputDir, outputDir }),
  // PPT 导入相关
  detectPowerPointEngine: () => ipcRenderer.invoke('detect-powerpoint-engine'),
  checkVCRuntime: () => ipcRenderer.invoke('check-vcruntime'),
  downloadVCRedist: (serverUrl) => ipcRenderer.invoke('download-vcredist', serverUrl),
  on: (channel, callback) => {
    if (channel === 'download-vcredist-progress') {
      ipcRenderer.on(channel, callback);
    }
  },
  off: (channel, callback) => {
    if (channel === 'download-vcredist-progress') {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  openInstaller: (installerPath) => ipcRenderer.invoke('open-installer', installerPath),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  convertPptToImages: (params) => ipcRenderer.invoke('convert-ppt-to-images', params),
  cancelPptConversion: (conversionId) => ipcRenderer.invoke('cancel-ppt-conversion', conversionId),
  cleanupTempDir: (dirPath) => ipcRenderer.invoke('cleanup-temp-dir', dirPath),
});
