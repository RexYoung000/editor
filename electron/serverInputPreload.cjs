const { contextBridge, ipcRenderer } = require('electron');

// 服务器输入窗口专用 preload：暴露提交接口
contextBridge.exposeInMainWorld('electronServerInput', {
  submit: (url) => {
    // 提交后通知主进程
    ipcRenderer.send('server-url-result', url);
    return ipcRenderer.invoke('submit-server-url', url);
  },
});