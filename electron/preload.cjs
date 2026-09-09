const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke("dialog:pick-folder"),
  detectStack: (localPath) => ipcRenderer.invoke("stack:detect", localPath),
  loadCustomEndpoint: () => ipcRenderer.invoke("custom-endpoint:load"),
  saveCustomEndpoint: (draft) => ipcRenderer.invoke("custom-endpoint:save", draft),
  testCustomEndpoint: (draft) => ipcRenderer.invoke("custom-endpoint:test", draft),
  callCustomEndpoint: (prompt) => ipcRenderer.invoke("custom-endpoint:call", prompt),
});
