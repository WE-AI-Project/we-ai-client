const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

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
