const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { Client: SshClient } = require("ssh2");

const isDev = !app.isPackaged;
// Set via the `electron:dev` script once the Vite dev server is up (see package.json).
const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5183";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    // OS 기본 타이틀바를 완전히 제거 — 대신 렌더러가 그리는 커스텀 타이틀바(로고+메뉴+윈도우 컨트롤)를 쓴다.
    // frame:false는 Windows/Linux/macOS 모두에서 타이틀바 자체를 없애므로, 최소화/최대화/닫기
    // 버튼도 우리가 직접 그려서 IPC로 실제 창 제어를 호출해야 한다 (아래 window:* 핸들러 참고).
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 최대화/복원 상태가 바뀔 때마다 렌더러에 알려서, 커스텀 타이틀바의 최대화 버튼 아이콘을
  // (사각형 ↔ 겹친 사각형) 토글할 수 있게 한다.
  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximize-change", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximize-change", false);
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.warn(`[Electron] Failed to load ${devServerUrl} (${errorCode}: ${errorDescription}). Retrying in 1s...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(devServerUrl);
        }
      }, 1000);
    });
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

// ── 커스텀 타이틀바 윈도우 컨트롤 (최소화/최대화·복원/닫기) ──
// frame:false로 OS 타이틀바를 없앴기 때문에, 렌더러의 커스텀 타이틀바 버튼이 실제 창 조작을
// 하려면 반드시 메인 프로세스를 거쳐야 한다(렌더러는 샌드박스라 창을 직접 제어할 수 없음).
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:toggle-maximize", () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:is-maximized", () => Boolean(mainWindow?.isMaximized()));

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

// ── Changes 탭: 로컬 git 작업 (SyncHub) ──
// working tree 작업은 서버가 아니라 사용자 PC의 git CLI로 한다 (electron/localGit.cjs 참고).
// Electron IPC는 Error의 커스텀 필드(code)를 렌더러로 전달하지 않으므로, 모든 git:* 핸들러는
// { ok: true, data } | { ok: false, error: { code, message } } 형태로 응답하고 렌더러(api.ts)가 풀어서 던진다.
const localGit = require("./localGit.cjs");

function handleGit(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: error?.code && typeof error.code === "string" ? error.code : "LOCAL_GIT_ERROR",
          message: error?.message || "로컬 git 작업에 실패했습니다.",
        },
      };
    }
  });
}

handleGit("git:probe", (localPath) => localGit.probe(localPath));
handleGit("git:init", (localPath, options) => localGit.init(localPath, options || {}));
handleGit("git:status", (projectId, localPath) => localGit.status(projectId, localPath));
handleGit("git:diff", (projectId, localPath, filePath, staged) => localGit.diff(projectId, localPath, filePath, Boolean(staged)));
handleGit("git:stage", (projectId, localPath, filePaths) => localGit.stage(projectId, localPath, filePaths));
handleGit("git:unstage", (projectId, localPath, filePaths) => localGit.unstage(projectId, localPath, filePaths));
handleGit("git:stage-all", (projectId, localPath) => localGit.stageAll(projectId, localPath));
handleGit("git:unstage-all", (projectId, localPath) => localGit.unstageAll(projectId, localPath));
handleGit("git:commit", (projectId, localPath, message, options) => localGit.commit(projectId, localPath, message, options || {}));
handleGit("git:ensure-remote", (localPath, remoteUrl) => localGit.ensureRemote(localPath, remoteUrl));
handleGit("git:push", (localPath, options) => localGit.push(localPath, options || {}));

// ── AI QA: 화면 자동화 테스트 (electron/screenTest.cjs) ──
// 숨겨진 BrowserWindow(격리된 세션 파티션)로 사용자의 실행 중인 앱을 크롤링하며 콘솔/예외/요청 실패/
// UI 휴리스틱/스크린샷을 수집한다. 한 번에 하나의 실행만 허용하고, 진행 상황은 screen-test:progress로 보낸다.
const screenTest = require("./screenTest.cjs");
let activeScreenTest = null; // { token, runId? }

function screenTestRoot() {
  return path.join(app.getPath("userData"), "screen-tests");
}

ipcMain.handle("screen-test:check", async (_event, url) => {
  try {
    return { ok: true, data: await screenTest.checkReachable(url) };
  } catch (error) {
    return { ok: false, error: { code: error?.code || "SCREEN_TEST_ERROR", message: error?.message || "URL을 확인할 수 없습니다." } };
  }
});

ipcMain.handle("screen-test:run", async (event, options) => {
  if (activeScreenTest) {
    return { ok: false, error: { code: "SCREEN_TEST_BUSY", message: "이미 화면 자동화 테스트가 실행 중입니다." } };
  }
  const token = screenTest.createCancelToken();
  activeScreenTest = { token };
  const sender = event.sender;
  try {
    const data = await screenTest.runScreenTest(options || {}, {
      token,
      onProgress: (progress) => {
        if (!sender.isDestroyed()) sender.send("screen-test:progress", progress);
      },
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: { code: error?.code || "SCREEN_TEST_ERROR", message: error?.message || "화면 자동화 테스트에 실패했습니다." } };
  } finally {
    activeScreenTest = null;
  }
});

ipcMain.handle("screen-test:cancel", async () => {
  if (!activeScreenTest) return { ok: true, data: { cancelled: false } };
  activeScreenTest.token.cancel();
  return { ok: true, data: { cancelled: true } };
});

// 결과 폴더 열기 - screen-tests 루트 아래 경로만 허용 (runId 또는 그 안의 절대 경로)
ipcMain.handle("screen-test:open-folder", async (_event, target) => {
  const root = path.resolve(screenTestRoot());
  let candidate = root;
  if (typeof target === "string" && target.trim()) {
    candidate = path.isAbsolute(target) ? path.resolve(target) : path.resolve(root, target);
  }
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, error: { code: "INVALID_PATH", message: "화면 테스트 결과 폴더만 열 수 있습니다." } };
  }
  try {
    const stat = await fs.stat(candidate);
    const folder = stat.isDirectory() ? candidate : path.dirname(candidate);
    const message = await shell.openPath(folder);
    if (message) return { ok: false, error: { code: "OPEN_FAILED", message } };
    return { ok: true, data: { path: folder } };
  } catch {
    return { ok: false, error: { code: "NOT_FOUND", message: "결과 폴더를 찾을 수 없습니다." } };
  }
});

// ── Environment Settings 탭: 실제 로컬 프로젝트의 .env 파일 읽기/쓰기 ──
// 예전에는 이 화면 전체가 localStorage에만 저장되는 가짜 메모장이라, 값이 프로젝트의
// 실제 .env와 전혀 무관했다. 여기서는 실제로 프로젝트 로컬 경로의 .env(없으면 .env.example)
// 파일을 직접 읽고 쓴다 - 개발자 본인의 파일이라 안전 저장소 암호화는 불필요하다.
ipcMain.handle("env:read", async (_event, localPath) => {
  if (typeof localPath !== "string" || !localPath.trim()) {
    throw new Error("localPath is required.");
  }
  const root = localPath.trim();
  const envPath = path.join(root, ".env");
  try {
    const content = await fs.readFile(envPath, "utf-8");
    return { exists: true, usedExample: false, path: envPath, content };
  } catch (envError) {
    if (envError.code !== "ENOENT") {
      throw new Error(`.env 파일을 읽을 수 없습니다: ${envError.message}`);
    }
    const examplePath = path.join(root, ".env.example");
    try {
      const exampleContent = await fs.readFile(examplePath, "utf-8");
      return { exists: false, usedExample: true, path: envPath, content: exampleContent };
    } catch (exampleError) {
      if (exampleError.code === "ENOENT") {
        return { exists: false, usedExample: false, path: envPath, content: "" };
      }
      throw new Error(`.env.example 파일을 읽을 수 없습니다: ${exampleError.message}`);
    }
  }
});

ipcMain.handle("env:write", async (_event, localPath, content) => {
  if (typeof localPath !== "string" || !localPath.trim()) {
    throw new Error("localPath is required.");
  }
  if (typeof content !== "string") {
    throw new Error("content is required.");
  }
  const envPath = path.join(localPath.trim(), ".env");
  await fs.writeFile(envPath, content, "utf-8");
  return { path: envPath };
});

// ── Environment Settings 탭의 "Runtime Environment" 카드용 실제 프로세스 정보 ──
// 이전에는 JDK/Gradle/Spring Boot 버전, OS 등이 전부 하드코딩된 문자열이었다.
// OS/Node/Electron/Chromium 버전은 이 프로세스에서 실제로 가져오고, Java/Gradle/Spring Boot
// 버전은 stack:detect가 이미 실제 build.gradle/gradle-wrapper.properties를 읽어 알아내므로
// 렌더러 쪽에서 그 결과를 그대로 재사용한다.
ipcMain.handle("runtime:info", async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
  };
});

ipcMain.handle("dialog:pick-file", async () => {
  const target = mainWindow ?? BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(target, {
    properties: ["openFile"],
    title: "개인 키 파일 선택",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── Server & Build 탭 연결 설정 (Local / Link / SSH) ──
// "Server & Build" 탭이 로그를 읽고 빌드를 실행하는 대상이 항상 이 앱과 같은 머신에서
// 도는 백엔드였기 때문에 "지금 뭘 대상으로 돌아가는지" 알 방법이 없었다. 이제 프로젝트별로
// (1) 기본 백엔드(local), (2) 다른 백엔드 인스턴스의 주소(link), (3) SSH로 원격 머신에 직접
// 접속해 로그를 tail하고 빌드 커맨드를 실행(ssh) 중 하나를 선택해 저장할 수 있다.
// 비밀번호/키 패스프레이즈는 safeStorage로 암호화해 저장하고
// 렌더러로는 평문을 절대 돌려주지 않는다.
const CONNECTIONS_FILE = path.join(app.getPath("userData"), "server-build-connections.json");
const CONNECTION_DEFAULTS = {
  mode: "local", // "local" | "link" | "ssh"
  linkBaseUrl: "",
  ssh: {
    host: "",
    port: 22,
    username: "",
    authType: "password", // "password" | "key"
    remoteWorkingDir: "",
    buildTool: "GRADLE", // "GRADLE" | "MAVEN"
    logCommand: "tail -n 200 -f app.log",
    privateKeyPath: "",
    passwordEncrypted: undefined,
    passphraseEncrypted: undefined,
  },
};

async function readConnectionsFile() {
  try {
    const raw = await fs.readFile(CONNECTIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function getConnectionEntry(key) {
  const all = await readConnectionsFile();
  const entry = all[key];
  return {
    ...structuredClone(CONNECTION_DEFAULTS),
    ...(entry || {}),
    ssh: { ...structuredClone(CONNECTION_DEFAULTS.ssh), ...(entry?.ssh || {}) },
  };
}

function toSafeConnectionEntry(entry, secretSaveFailed) {
  const { passwordEncrypted, passphraseEncrypted, ...restSsh } = entry.ssh;
  return {
    mode: entry.mode,
    linkBaseUrl: entry.linkBaseUrl,
    ssh: {
      ...restSsh,
      hasPassword: Boolean(passwordEncrypted),
      hasPassphrase: Boolean(passphraseEncrypted),
    },
    ...(secretSaveFailed !== undefined ? { secretSaveFailed } : {}),
  };
}

function decryptSecret(encryptedBase64) {
  if (!encryptedBase64) return "";
  try {
    return safeStorage.decryptString(Buffer.from(encryptedBase64, "base64"));
  } catch {
    return "";
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

// 저장된(암호화된) 설정으로부터 실제 접속에 쓸 비밀 값을 복원한다.
async function resolveSshSecrets(sshCfg) {
  if (sshCfg.authType === "key") {
    const privateKeyContent = await fs.readFile(sshCfg.privateKeyPath, "utf-8");
    return { privateKeyContent, passphrase: decryptSecret(sshCfg.passphraseEncrypted) || undefined };
  }
  return { password: decryptSecret(sshCfg.passwordEncrypted) };
}

// 저장 "전" 폼에 입력된 평문 값으로부터 접속용 비밀 값을 구성한다 (연결 테스트용).
async function resolveSshSecretsFromDraft(sshCfg) {
  if (sshCfg.authType === "key") {
    const privateKeyContent = await fs.readFile(sshCfg.privateKeyPath, "utf-8");
    return { privateKeyContent, passphrase: sshCfg.passphrase || undefined };
  }
  return { password: sshCfg.password || "" };
}

function createSshConnection(sshCfg, secrets) {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    const connectOptions = {
      host: sshCfg.host,
      port: Number(sshCfg.port) || 22,
      username: sshCfg.username,
      readyTimeout: 10000,
    };
    if (sshCfg.authType === "key") {
      connectOptions.privateKey = secrets.privateKeyContent;
      if (secrets.passphrase) connectOptions.passphrase = secrets.passphrase;
    } else {
      connectOptions.password = secrets.password;
    }
    conn.once("ready", () => resolve(conn));
    conn.once("error", (err) => reject(err));
    conn.connect(connectOptions);
  });
}

ipcMain.handle("connection:load", async (_event, key) => {
  if (typeof key !== "string" || !key) throw new Error("key is required.");
  return toSafeConnectionEntry(await getConnectionEntry(key));
});

ipcMain.handle("connection:save", async (_event, key, draft) => {
  if (typeof key !== "string" || !key) throw new Error("key is required.");
  const previous = await getConnectionEntry(key);
  const sshDraft = draft?.ssh || {};
  const authType = sshDraft.authType === "key" ? "key" : "password";

  const nextSsh = {
    host: (sshDraft.host || "").trim(),
    port: Number(sshDraft.port) || 22,
    username: (sshDraft.username || "").trim(),
    authType,
    remoteWorkingDir: (sshDraft.remoteWorkingDir || "").trim(),
    buildTool: sshDraft.buildTool === "MAVEN" ? "MAVEN" : "GRADLE",
    logCommand: (sshDraft.logCommand || CONNECTION_DEFAULTS.ssh.logCommand).trim(),
    privateKeyPath: (sshDraft.privateKeyPath || "").trim(),
    passwordEncrypted: previous.ssh.passwordEncrypted,
    passphraseEncrypted: previous.ssh.passphraseEncrypted,
  };

  let secretSaveFailed = false;
  const secretField = authType === "key" ? "passphrase" : "password";
  const targetField = authType === "key" ? "passphraseEncrypted" : "passwordEncrypted";
  const rawSecret = sshDraft[secretField];
  if (rawSecret === null) {
    nextSsh[targetField] = undefined;
  } else if (typeof rawSecret === "string" && rawSecret.length > 0) {
    if (safeStorage.isEncryptionAvailable()) {
      nextSsh[targetField] = safeStorage.encryptString(rawSecret).toString("base64");
    } else {
      nextSsh[targetField] = undefined;
      secretSaveFailed = true;
    }
  }

  const nextEntry = {
    mode: ["local", "link", "ssh"].includes(draft?.mode) ? draft.mode : "local",
    linkBaseUrl: (draft?.linkBaseUrl || "").trim(),
    ssh: nextSsh,
  };

  const all = await readConnectionsFile();
  all[key] = nextEntry;
  await fs.mkdir(path.dirname(CONNECTIONS_FILE), { recursive: true });
  await fs.writeFile(CONNECTIONS_FILE, JSON.stringify(all, null, 2), "utf-8");

  return toSafeConnectionEntry(nextEntry, secretSaveFailed);
});

ipcMain.handle("connection:test", async (_event, draft) => {
  if (draft?.mode === "link") {
    if (!draft.linkBaseUrl?.trim()) return { ok: false, reason: "주소를 입력해 주세요." };
    const url = `${draft.linkBaseUrl.replace(/\/+$/, "")}/api/v1/server/logs`;
    const started = Date.now();
    try {
      const res = await fetchWithTimeout(url, { method: "GET" }, 4000);
      return { ok: true, latencyMs: Date.now() - started, statusCode: res.status };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, reason: "4초 내 응답이 없습니다." };
      return { ok: false, reason: `연결할 수 없습니다: ${err?.message || "알 수 없는 오류"}` };
    }
  }

  if (draft?.mode === "ssh") {
    const sshCfg = draft.ssh || {};
    if (!sshCfg.host?.trim() || !sshCfg.username?.trim()) {
      return { ok: false, reason: "호스트와 사용자명을 입력해 주세요." };
    }
    const started = Date.now();
    let conn;
    try {
      const secrets = await resolveSshSecretsFromDraft(sshCfg);
      conn = await createSshConnection(sshCfg, secrets);
      const output = await new Promise((resolve, reject) => {
        conn.exec("echo ok && uname -a", (err, stream) => {
          if (err) { reject(err); return; }
          let out = "";
          stream.on("data", (d) => { out += d.toString("utf-8"); });
          stream.on("close", () => resolve(out.trim()));
          stream.stderr.on("data", () => {});
        });
      });
      return { ok: true, latencyMs: Date.now() - started, info: output.split("\n").slice(1).join(" ") || "연결 성공" };
    } catch (err) {
      return { ok: false, reason: `SSH 연결 실패: ${err?.message || "알 수 없는 오류"}` };
    } finally {
      if (conn) conn.end();
    }
  }

  return { ok: false, reason: "지원하지 않는 연결 모드입니다." };
});

ipcMain.handle("ssh:exec", async (_event, key, command) => {
  if (typeof command !== "string" || !command.trim()) throw new Error("command is required.");
  const entry = await getConnectionEntry(key);
  if (entry.mode !== "ssh") throw new Error("이 프로젝트는 SSH 연결 모드가 아닙니다.");

  const secrets = await resolveSshSecrets(entry.ssh);
  const conn = await createSshConnection(entry.ssh, secrets);
  const wrappedCommand = entry.ssh.remoteWorkingDir
    ? `cd ${shellQuote(entry.ssh.remoteWorkingDir)} && ${command}`
    : command;

  try {
    return await new Promise((resolve, reject) => {
      conn.exec(wrappedCommand, (err, stream) => {
        if (err) { reject(err); return; }
        let stdout = "";
        let stderr = "";
        stream.on("data", (d) => { stdout += d.toString("utf-8"); });
        stream.stderr.on("data", (d) => { stderr += d.toString("utf-8"); });
        stream.on("close", (code) => {
          resolve({ stdout, stderr, exitCode: typeof code === "number" ? code : -1 });
        });
        stream.on("error", (streamErr) => reject(streamErr));
      });
    });
  } finally {
    conn.end();
  }
});

// SSH 로그 스트림은 프로젝트(key)당 하나의 지속 연결을 유지한다.
const activeLogStreams = new Map();

ipcMain.handle("ssh:logStream:start", async (event, key) => {
  if (activeLogStreams.has(key)) return { ok: true, alreadyRunning: true };

  const entry = await getConnectionEntry(key);
  if (entry.mode !== "ssh") throw new Error("이 프로젝트는 SSH 연결 모드가 아닙니다.");

  const win = BrowserWindow.fromWebContents(event.sender);
  const secrets = await resolveSshSecrets(entry.ssh);
  const conn = await createSshConnection(entry.ssh, secrets);
  const command = entry.ssh.remoteWorkingDir
    ? `cd ${shellQuote(entry.ssh.remoteWorkingDir)} && ${entry.ssh.logCommand}`
    : entry.ssh.logCommand;

  activeLogStreams.set(key, { conn });

  conn.exec(command, (err, stream) => {
    if (err) {
      win?.webContents.send("ssh:log-status", { key, status: "error", message: err.message });
      activeLogStreams.delete(key);
      conn.end();
      return;
    }

    let buffer = "";
    const emitLines = (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        win?.webContents.send("ssh:log-line", { key, line });
      }
    };

    stream.on("data", (d) => emitLines(d.toString("utf-8")));
    stream.stderr.on("data", (d) => emitLines(d.toString("utf-8")));
    stream.on("close", () => {
      win?.webContents.send("ssh:log-status", { key, status: "closed" });
      activeLogStreams.delete(key);
      conn.end();
    });

    win?.webContents.send("ssh:log-status", { key, status: "connected" });
  });

  conn.on("error", (err) => {
    win?.webContents.send("ssh:log-status", { key, status: "error", message: err.message });
    activeLogStreams.delete(key);
  });

  return { ok: true };
});

ipcMain.handle("ssh:logStream:stop", async (_event, key) => {
  const active = activeLogStreams.get(key);
  if (active) {
    active.conn.end();
    activeLogStreams.delete(key);
  }
  return { ok: true };
});

app.on("before-quit", () => {
  for (const { conn } of activeLogStreams.values()) {
    conn.end();
  }
  activeLogStreams.clear();
});

// 커스텀 AI 백엔드(개인/프로젝트 공용) 설정은 서버 DB에 저장되고 /api/v1/ai/backend/*
// REST API로 다뤄진다(we-ai-server의 AiBackendSettingController) - 이전에는 여기 Electron
// 메인 프로세스가 로컬 파일에 저장하고 렌더러의 CORS 없이 직접 호출까지 대신해줬지만,
// 그 방식은 서버의 프로젝트 문서 RAG 검색을 건너뛰었다. 지금은 서버가 RAG 검색은 항상
// 수행한 뒤 답변 생성 단계만 사용자가 고른 백엔드로 보내므로, 이 IPC들은 더 이상 필요 없다.

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
