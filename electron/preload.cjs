const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke("dialog:pick-folder"),
  pickFile: () => ipcRenderer.invoke("dialog:pick-file"),
  detectStack: (localPath) => ipcRenderer.invoke("stack:detect", localPath),
  env: {
    read: (localPath) => ipcRenderer.invoke("env:read", localPath),
    write: (localPath, content) => ipcRenderer.invoke("env:write", localPath, content),
  },
  runtimeInfo: () => ipcRenderer.invoke("runtime:info"),
  loadCustomEndpoint: () => ipcRenderer.invoke("custom-endpoint:load"),
  saveCustomEndpoint: (draft) => ipcRenderer.invoke("custom-endpoint:save", draft),
  testCustomEndpoint: (draft) => ipcRenderer.invoke("custom-endpoint:test", draft),
  callCustomEndpoint: (prompt) => ipcRenderer.invoke("custom-endpoint:call", prompt),
  connection: {
    load: (key) => ipcRenderer.invoke("connection:load", key),
    save: (key, draft) => ipcRenderer.invoke("connection:save", key, draft),
    test: (draft) => ipcRenderer.invoke("connection:test", draft),
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
    onMaximizeChange: (callback) => {
      const handler = (_event, isMaximized) => callback(isMaximized);
      ipcRenderer.on("window:maximize-change", handler);
      return () => ipcRenderer.removeListener("window:maximize-change", handler);
    },
  },
  ssh: {
    exec: (key, command) => ipcRenderer.invoke("ssh:exec", key, command),
    startLogStream: (key) => ipcRenderer.invoke("ssh:logStream:start", key),
    stopLogStream: (key) => ipcRenderer.invoke("ssh:logStream:stop", key),
    onLogLine: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on("ssh:log-line", handler);
      return () => ipcRenderer.removeListener("ssh:log-line", handler);
    },
    onLogStatus: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on("ssh:log-status", handler);
      return () => ipcRenderer.removeListener("ssh:log-status", handler);
    },
  },
});
