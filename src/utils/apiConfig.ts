export function getApiBaseUrl(): string {
  const raw = localStorage.getItem('forge_server_url') || window.location.origin;
  return raw.replace(/\/+$/, '');
}

export function isLocalServer(): boolean {
  const url = getApiBaseUrl();
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch { return true; }
}