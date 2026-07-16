// VC++ Redistributable 检测、下载、安装逻辑

export async function checkVCRuntimeInstalled(): Promise<boolean> {
  if (!window.electronAPI?.checkVCRuntime) return true; // Web 模式或非 Windows
  const result = await window.electronAPI.checkVCRuntime();
  return result.installed;
}

export async function downloadVCRedist(
  serverUrl: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const progressHandler = (_event: unknown, { downloaded, total }: { downloaded: number; total: number }) => {
      onProgress(downloaded, total);
    };

    window.electronAPI.on?.('download-vcredist-progress', progressHandler);

    window.electronAPI.downloadVCRedist!(serverUrl)
      .then((result) => {
        window.electronAPI.off?.('download-vcredist-progress', progressHandler);
        resolve(result.path);
      })
      .catch((err) => {
        window.electronAPI.off?.('download-vcredist-progress', progressHandler);
        reject(err);
      });
  });
}
