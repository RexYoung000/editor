export async function detectPowerPoint(): Promise<{engine: 'office'|'wps'|null, progId?: string}> {
  if (!window.electronAPI?.detectPowerPointEngine) return {engine: null};
  return await window.electronAPI.detectPowerPointEngine();
}
