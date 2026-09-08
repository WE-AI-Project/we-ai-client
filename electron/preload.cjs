const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke("dialog:pick-folder"),
  detectStack: (localPath) => ipcRenderer.invoke("stack:detect", localPath),
});
