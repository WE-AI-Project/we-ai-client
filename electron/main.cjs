const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = !app.isPackaged;
// Set via the `electron:dev` script once the Vite dev server is up (see package.json).
const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5183";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Open external links in the OS browser instead of a new Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("dialog:pick-folder", async () => {
  const target = mainWindow ?? BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(target, {
    properties: ["openDirectory", "createDirectory"],
    title: "프로젝트 폴더 선택",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("stack:detect", async (_event, localPath) => {
  if (typeof localPath !== "string" || !localPath.trim()) {
    throw new Error("localPath is required.");
  }
  const { detectLocalStack } = await import("./detectStack.mjs");
  return detectLocalStack(localPath);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
