let wsServer = 'ws://10.200.15.62:8187'; // 打包机 WebSocket 接口地址（默认值，运行时从服务器获取）
let wsHost = '10.200.15.41:7800';        // 打包机拉取课件的目标服务器地址（默认值，运行时从服务器获取）
let configLoaded = false;
let configPromise: Promise<void> | null = null;

/** 从 vite 服务器获取 WebSocket 配置 */
export async function loadWsConfig(): Promise<void> {
  if (configLoaded) return;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      // 优先从 Electron 保存的服务器地址获取，否则从 vite 环境变量获取
      const baseUrl = await window.electronAPI.getServerUrl() || import.meta.env.VITE_API_BASE || '';
      const url = baseUrl ? `${baseUrl}/api/ws-config` : '/api/ws-config';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.wsServer) wsServer = data.wsServer;
        if (data.wsHost) wsHost = data.wsHost;
        configLoaded = true;
      }
    } catch {
      // fetch 失败（网络不通等），使用默认值
    }
  })();

  return configPromise;
}

export function sendCourseToServer(
  courseId: string,
  svnPaths: string[],
  onMessage?: (msg: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsServer);
    let settled = false;
    let lastMsg = '';
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; ws.close(); reject(new Error('打包超时（60秒无响应）')); }
    }, 60000);

    ws.onopen = () => {
      clearTimeout(timeout);
      const payload = {
        SIGN: 'integrationRequest',
        DATA: JSON.stringify({
          user: '设计器',
          host: wsHost,
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
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      let msgData: { DATA?: unknown };
      try {
        msgData = JSON.parse(event.data);
      } catch {
        return;
      }
      const raw = msgData.DATA;
      const msg = String(raw ?? '');
      onMessage?.(msg);

      // DATA 为数字表示打包机报错，用上一条消息作为错误信息
      if (typeof raw === 'number') {
        ws.close();
        if (!settled) { settled = true; reject(new Error(lastMsg || msg)); }
        return;
      }

      lastMsg = msg;

      if (
        msg.includes('directory not empty') ||
        msg.includes('Error parsing arguments') ||
        msg.includes('ENOENT: no such file')
      ) {
        ws.close();
        if (!settled) { settled = true; reject(new Error(msg)); }
      } else if (msg.includes('全部完成')) {
        ws.close();
        if (!settled) { settled = true; resolve(); }
      }
    };

    ws.onerror = () => { if (!settled) { settled = true; reject(new Error('WebSocket 连接失败')); } };
  });
}