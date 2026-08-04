let wsServer = 'ws://10.200.15.62:8187';
let wsHost = '10.200.15.41:7800';
let configLoaded = false;
let configPromise: Promise<void> | null = null;

export async function loadWsConfig(): Promise<void> {
  if (configLoaded) return;
  if (configPromise) return configPromise;
  configPromise = (async () => {
    try {
      const baseUrl = await window.electronAPI.getServerUrl() || import.meta.env.VITE_API_BASE || '';
      const url = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/api/ws-config` : '/api/ws-config';
      const response = await fetch(url);
      if (!response.ok) throw new Error('打包机配置读取失败');
      const data = await response.json() as { wsServer?: string; wsHost?: string };
      if (data.wsServer) wsServer = data.wsServer;
      if (data.wsHost) wsHost = data.wsHost;
      configLoaded = true;
    } catch {
      configPromise = null;
    }
  })();
  return configPromise;
}

export function createCoursePackagingPayload(courseId: string, svnPaths: string[], host = wsHost): object {
  return {
    SIGN: 'integrationRequest',
    DATA: JSON.stringify({
      user: '设计器',
      host,
      time: 0,
      data: {
        courseSID: courseId,
        courseName: 'ZK',
        author: '设计器',
        isRoot: false,
        devSVNPaths: svnPaths,
        customUrl: '',
        isUpdate: false,
      },
    }),
  };
}

export interface PackagingCallbacks {
  onMessage?: (message: string) => void;
  onComplete?: (message: string) => void;
  onFailure?: (message: string) => void;
  onDisconnect?: () => void;
}

export interface PackagingSession {
  close: () => void;
}

export function startCoursePackaging(
  courseId: string,
  svnPaths: string[],
  callbacks: PackagingCallbacks = {},
): Promise<PackagingSession> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsServer);
    let requestSent = false;
    let finished = false;
    let lastMessage = '';
    const connectionTimeout = window.setTimeout(() => {
      if (requestSent || finished) return;
      finished = true;
      ws.close();
      reject(new Error('连接打包机超时'));
    }, 15000);

    ws.onopen = () => {
      window.clearTimeout(connectionTimeout);
      try {
        ws.send(JSON.stringify(createCoursePackagingPayload(courseId, svnPaths)));
        requestSent = true;
        resolve({ close: () => ws.close() });
      } catch (error) {
        finished = true;
        reject(error);
      }
    };

    ws.onmessage = (event) => {
      let data: { DATA?: unknown };
      try {
        data = JSON.parse(String(event.data)) as { DATA?: unknown };
      } catch {
        return;
      }
      const raw = data.DATA;
      const message = String(raw ?? '');
      callbacks.onMessage?.(message);

      if (typeof raw === 'number') {
        finished = true;
        callbacks.onFailure?.(lastMessage || message);
        ws.close();
        return;
      }
      lastMessage = message;
      if (
        message.includes('directory not empty')
        || message.includes('Error parsing arguments')
        || message.includes('ENOENT: no such file')
      ) {
        finished = true;
        callbacks.onFailure?.(message);
        ws.close();
      } else if (message.includes('全部完成')) {
        finished = true;
        callbacks.onComplete?.(message);
        ws.close();
      }
    };

    ws.onerror = () => {
      if (!requestSent && !finished) {
        finished = true;
        window.clearTimeout(connectionTimeout);
        reject(new Error('WebSocket 连接失败'));
      }
    };

    ws.onclose = () => {
      window.clearTimeout(connectionTimeout);
      if (requestSent && !finished) callbacks.onDisconnect?.();
    };
  });
}

export async function sendCourseToServer(
  courseId: string,
  svnPaths: string[],
  onMessage?: (message: string) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    startCoursePackaging(courseId, svnPaths, {
        onMessage,
        onComplete: () => resolve(),
        onFailure: (message) => reject(new Error(message)),
        onDisconnect: () => reject(new Error('打包机连接已断开')),
      }).catch(reject);
  });
}
