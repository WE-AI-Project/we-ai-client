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
  // AI QA 화면 자동화 테스트. 응답은 { ok, data } | { ok: false, error: { code, message } }.
  screenTest: {
    check: (url) => ipcRenderer.invoke("screen-test:check", url),
    run: (options) => ipcRenderer.invoke("screen-test:run", options),
    cancel: () => ipcRenderer.invoke("screen-test:cancel"),
    openFolder: (target) => ipcRenderer.invoke("screen-test:open-folder", target),
    onProgress: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on("screen-test:progress", handler);
      return () => ipcRenderer.removeListener("screen-test:progress", handler);
    },
  },
  // 로컬 git (Changes 탭 / SyncHub push). 응답은 { ok, data } | { ok: false, error: { code, message } }.
  git: {
    probe: (localPath) => ipcRenderer.invoke("git:probe", localPath),
    init: (localPath, options) => ipcRenderer.invoke("git:init", localPath, options),
    status: (projectId, localPath) => ipcRenderer.invoke("git:status", projectId, localPath),
    diff: (projectId, localPath, filePath, staged) => ipcRenderer.invoke("git:diff", projectId, localPath, filePath, staged),
    stage: (projectId, localPath, filePaths) => ipcRenderer.invoke("git:stage", projectId, localPath, filePaths),
    unstage: (projectId, localPath, filePaths) => ipcRenderer.invoke("git:unstage", projectId, localPath, filePaths),
    stageAll: (projectId, localPath) => ipcRenderer.invoke("git:stage-all", projectId, localPath),
    unstageAll: (projectId, localPath) => ipcRenderer.invoke("git:unstage-all", projectId, localPath),
    commit: (projectId, localPath, message, options) => ipcRenderer.invoke("git:commit", projectId, localPath, message, options),
    ensureRemote: (localPath, remoteUrl) => ipcRenderer.invoke("git:ensure-remote", localPath, remoteUrl),
    push: (localPath, options) => ipcRenderer.invoke("git:push", localPath, options),
  },
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
