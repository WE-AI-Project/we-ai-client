// ── 커스텀 AI 엔드포인트 ──
// 사용자가 기본 백엔드 대신 자신이 신뢰하는 다른 서버(예: 팀원의 로컬 Ollama,
// ngrok으로 열어둔 주소)를 직접 지정해 AI 요청을 보낼 수 있게 하는 설정.
//
// Electron(설치 프로그램) 환경에서는 electron/main.cjs가 소유한 IPC를 통해
// 저장·헬스체크·실제 호출이 전부 메인 프로세스에서 일어난다 — API 키는
// safeStorage로 암호화되어 디스크에 남고 렌더러로 평문이 다시 나오지 않으며,
// 임의의 원격 서버로의 요청도 렌더러의 CORS 제약 없이 안정적으로 동작한다.
//
// 브라우저(웹 프리뷰) 환경에는 Electron IPC가 없으므로 성능 저하 없는 선에서만
// 대체 동작을 제공한다 — API 키는 새로고침하면 사라지는 메모리 변수에만 두고
// localStorage에는 쓰지 않는다(평문 시크릿을 브라우저에 영구 저장하지 않기 위함).

export type CustomEndpointDialect = "ollama-native" | "openai-compatible";

export type CustomEndpointConfig = {
  enabled: boolean;
  baseUrl: string;
  dialect: CustomEndpointDialect;
  healthPath: string;
  model: string;
  hasApiKey: boolean;
  /** true면 방금 입력한 API 키가 이 기기에서 암호화 저장소를 쓸 수 없어 저장되지 못했다는 뜻 */
  keySaveFailed?: boolean;
};

export type CustomEndpointSaveDraft = {
  enabled: boolean;
  baseUrl: string;
  dialect: CustomEndpointDialect;
  healthPath: string;
  model: string;
  /** undefined = 기존 키 유지, string = 새 값으로 교체, null = 키 삭제 */
  apiKey?: string | null;
};

export type CustomEndpointTestDraft = {
  baseUrl: string;
  healthPath?: string;
  apiKey?: string;
};

export type CustomEndpointTestResult =
  | { ok: true; latencyMs: number; modelsFound?: number }
  | { ok: false; reason: string };

const DEFAULT_CONFIG: CustomEndpointConfig = {
  enabled: false,
  baseUrl: "",
  dialect: "ollama-native",
  healthPath: "/api/tags",
  model: "llama3.1",
  hasApiKey: false,
};

// ── 웹(비-Electron) 폴백 상태 — 새로고침하면 초기화됨 ──
let webConfig: CustomEndpointConfig = { ...DEFAULT_CONFIG };
let webApiKey = "";
const WEB_CONFIG_KEY = "weai_custom_endpoint_v1"; // apiKey 제외한 나머지만 저장

function loadWebConfigFromStorage(): CustomEndpointConfig {
  try {
    const raw = localStorage.getItem(WEB_CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw), hasApiKey: webApiKey.length > 0 };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveWebConfigToStorage(config: CustomEndpointConfig) {
  const { hasApiKey: _omit, ...persisted } = config;
  localStorage.setItem(WEB_CONFIG_KEY, JSON.stringify(persisted));
}

function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
}

export async function loadCustomEndpointConfig(): Promise<CustomEndpointConfig> {
  if (isElectron()) return window.electronAPI!.loadCustomEndpoint();
  webConfig = loadWebConfigFromStorage();
  return webConfig;
}

export async function saveCustomEndpointConfig(draft: CustomEndpointSaveDraft): Promise<CustomEndpointConfig> {
  if (isElectron()) return window.electronAPI!.saveCustomEndpoint(draft);

  if (draft.apiKey === null) webApiKey = "";
  else if (typeof draft.apiKey === "string" && draft.apiKey.length > 0) webApiKey = draft.apiKey;

  webConfig = {
    enabled: draft.enabled,
    baseUrl: draft.baseUrl.trim(),
    dialect: draft.dialect,
    healthPath: draft.healthPath.trim() || DEFAULT_CONFIG.healthPath,
    model: draft.model.trim() || DEFAULT_CONFIG.model,
    hasApiKey: webApiKey.length > 0,
  };
  saveWebConfigToStorage(webConfig);
  return webConfig;
}

export async function testCustomEndpointConnection(draft: CustomEndpointTestDraft): Promise<CustomEndpointTestResult> {
  if (isElectron()) return window.electronAPI!.testCustomEndpoint(draft);

  const url = `${draft.baseUrl.replace(/\/+$/, "")}${draft.healthPath || DEFAULT_CONFIG.healthPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: draft.apiKey ? { Authorization: `Bearer ${draft.apiKey}` } : undefined,
    });
    if (!res.ok) return { ok: false, reason: `서버가 ${res.status} ${res.statusText}로 응답했습니다.` };
    const data = await res.json().catch(() => null);
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      modelsFound: Array.isArray(data?.models) ? data.models.length : undefined,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { ok: false, reason: "3초 내 응답이 없습니다. 주소나 포트, 터널 상태를 확인해 주세요." };
    }
    return { ok: false, reason: "연결할 수 없습니다. 주소, 포트, 또는 브라우저의 mixed-content 차단 여부를 확인하세요." };
  } finally {
    clearTimeout(timer);
  }
}

/** 커스텀 엔드포인트가 켜져 있으면 그쪽으로, 아니면 null을 반환해 기본 백엔드 경로를 쓰게 한다. */
export async function callCustomEndpointIfEnabled(prompt: string): Promise<{ answer: string } | null> {
  if (isElectron()) {
    const cfg = await window.electronAPI!.loadCustomEndpoint();
    if (!cfg.enabled || !cfg.baseUrl) return null;
    return window.electronAPI!.callCustomEndpoint(prompt);
  }

  if (!webConfig.enabled || !webConfig.baseUrl) return null;
  const baseUrl = webConfig.baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(webApiKey ? { Authorization: `Bearer ${webApiKey}` } : {}),
  };

  if (webConfig.dialect === "openai-compatible") {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: webConfig.model, messages: [{ role: "user", content: prompt }], stream: false }),
    });
    if (!res.ok) throw new Error(`커스텀 엔드포인트 응답 실패 (${res.status})`);
    const data = await res.json();
    return { answer: data?.choices?.[0]?.message?.content ?? "" };
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: webConfig.model, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`커스텀 엔드포인트 응답 실패 (${res.status})`);
  const data = await res.json();
  return { answer: data?.response ?? "" };
}
