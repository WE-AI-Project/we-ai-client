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
// 비밀번호/키 패스프레이즈는 custom-endpoint와 동일하게 safeStorage로 암호화해 저장하고
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

// ── 커스텀 AI 엔드포인트 (사용자가 지정한 타 Ollama/OpenAI 호환 서버) ──
// 설정 파일은 앱 설치 위치가 아니라 사용자별 userData 디렉토리에 저장되므로
// 설치 프로그램을 업데이트/재설치해도 유지된다. API 키는 파일에 절대 평문으로
// 남기지 않고, OS 자격 증명 저장소(safeStorage: Windows DPAPI / macOS Keychain /
// libsecret)로 암호화한 뒤 base64로 인코딩해 저장한다.
const CUSTOM_ENDPOINT_FILE = path.join(app.getPath("userData"), "custom-endpoint.json");
const CUSTOM_ENDPOINT_DEFAULTS = {
  enabled: false,
  baseUrl: "",
  dialect: "ollama-native", // "ollama-native" | "openai-compatible"
  healthPath: "/api/tags",
  model: "llama3.1",
};

async function readCustomEndpointFile() {
  try {
    const raw = await fs.readFile(CUSTOM_ENDPOINT_FILE, "utf-8");
    return { ...CUSTOM_ENDPOINT_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...CUSTOM_ENDPOINT_DEFAULTS };
  }
}

function decryptApiKey(stored) {
  if (!stored?.apiKeyEncrypted) return "";
  try {
    return safeStorage.decryptString(Buffer.from(stored.apiKeyEncrypted, "base64"));
  } catch {
    // 다른 사용자 계정/머신에서 암호화된 값이라 복호화 불가한 경우 등 — 키 없는 것으로 취급
    return "";
  }
}

function buildHealthUrl(baseUrl, healthPath) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = (healthPath || "/api/tags").startsWith("/") ? healthPath : `/${healthPath}`;
  return `${trimmedBase}${trimmedPath}`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 렌더러(설정 화면)에는 평문 API 키를 절대 돌려주지 않는다 — hasApiKey만 알려준다.
ipcMain.handle("custom-endpoint:load", async () => {
  const stored = await readCustomEndpointFile();
  const { apiKeyEncrypted, ...safe } = stored;
  return { ...safe, hasApiKey: Boolean(apiKeyEncrypted) };
});

ipcMain.handle("custom-endpoint:save", async (_event, draft) => {
  if (typeof draft?.baseUrl !== "string") {
    throw new Error("baseUrl is required.");
  }
  const previous = await readCustomEndpointFile();
  const next = {
    enabled: Boolean(draft.enabled),
    baseUrl: draft.baseUrl.trim(),
    dialect: draft.dialect === "openai-compatible" ? "openai-compatible" : "ollama-native",
    healthPath: (draft.healthPath || CUSTOM_ENDPOINT_DEFAULTS.healthPath).trim(),
    model: (draft.model || CUSTOM_ENDPOINT_DEFAULTS.model).trim(),
    apiKeyEncrypted: previous.apiKeyEncrypted, // 기본은 기존 키 유지
  };

  // apiKey는 저장 폼에서 값이 입력됐을 때만 전달됨 (빈 문자열=변경 안 함, null=삭제)
  let keySaveFailed = false;
  if (draft.apiKey === null) {
    next.apiKeyEncrypted = undefined;
  } else if (typeof draft.apiKey === "string" && draft.apiKey.length > 0) {
    if (safeStorage.isEncryptionAvailable()) {
      next.apiKeyEncrypted = safeStorage.encryptString(draft.apiKey).toString("base64");
    } else {
      // 이 머신에서 OS 자격 증명 저장소를 못 쓰는 경우 — 평문 저장 대신 아예 저장하지 않고,
      // 렌더러가 사용자에게 알릴 수 있도록 실패 사실을 응답에 명시한다.
      next.apiKeyEncrypted = undefined;
      keySaveFailed = true;
    }
  }

  await fs.mkdir(path.dirname(CUSTOM_ENDPOINT_FILE), { recursive: true });
  await fs.writeFile(CUSTOM_ENDPOINT_FILE, JSON.stringify(next, null, 2), "utf-8");

  const { apiKeyEncrypted, ...safe } = next;
  return { ...safe, hasApiKey: Boolean(apiKeyEncrypted), keySaveFailed };
});

// 저장 "전" 테스트 — 폼에 입력된(아직 저장 안 된) 값을 그대로 검증한다.
ipcMain.handle("custom-endpoint:test", async (_event, draft) => {
  if (typeof draft?.baseUrl !== "string" || !draft.baseUrl.trim()) {
    return { ok: false, reason: "주소를 입력해 주세요." };
  }
  const url = buildHealthUrl(draft.baseUrl, draft.healthPath);
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(
      url,
      { method: "GET", headers: draft.apiKey ? { Authorization: `Bearer ${draft.apiKey}` } : undefined },
      3000
    );
    if (!res.ok) {
      return { ok: false, reason: `서버가 ${res.status} ${res.statusText}로 응답했습니다.` };
    }
    const data = await res.json().catch(() => null);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      modelsFound: Array.isArray(data?.models) ? data.models.length : undefined,
    };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { ok: false, reason: "3초 내 응답이 없습니다. 주소나 포트, 터널 상태를 확인해 주세요." };
    }
    return { ok: false, reason: `연결할 수 없습니다: ${err?.message || "알 수 없는 오류"}` };
  }
});

// 실제 채팅 호출 — main 프로세스에서 수행하므로 렌더러 쪽 CORS 제약이 없고,
// 복호화된 API 키도 렌더러로 나가지 않는다.
ipcMain.handle("custom-endpoint:call", async (_event, prompt) => {
  const cfg = await readCustomEndpointFile();
  if (!cfg.enabled || !cfg.baseUrl) {
    throw new Error("커스텀 엔드포인트가 설정되어 있지 않습니다.");
  }
  const apiKey = decryptApiKey(cfg);
  const headers = { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
  const baseUrl = cfg.baseUrl.replace(/\/+$/, "");

  try {
    if (cfg.dialect === "openai-compatible") {
      const res = await fetchWithTimeout(
        `${baseUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], stream: false }),
        },
        60000
      );
      if (!res.ok) throw new Error(`커스텀 엔드포인트 응답 실패 (${res.status})`);
      const data = await res.json().catch(() => {
        throw new Error("커스텀 엔드포인트가 JSON이 아닌 응답을 반환했습니다.");
      });
      return { answer: data?.choices?.[0]?.message?.content ?? "" };
    }

    const res = await fetchWithTimeout(
      `${baseUrl}/api/generate`,
      { method: "POST", headers, body: JSON.stringify({ model: cfg.model, prompt, stream: false }) },
      60000
    );
    if (!res.ok) throw new Error(`커스텀 엔드포인트 응답 실패 (${res.status})`);
    const data = await res.json().catch(() => {
      throw new Error("커스텀 엔드포인트가 JSON이 아닌 응답을 반환했습니다.");
    });
    return { answer: data?.response ?? "" };
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("커스텀 엔드포인트가 60초 내 응답하지 않았습니다. 서버 상태나 모델 크기를 확인해 주세요.");
    }
    if (err instanceof Error) throw err;
    throw new Error("커스텀 엔드포인트 호출 중 알 수 없는 오류가 발생했습니다.");
  }
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
