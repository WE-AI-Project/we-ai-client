// ── AI QA 화면 자동화 테스트 (Electron 전용) ──
// 실제 실행은 Electron 메인 프로세스(electron/screenTest.cjs)가 숨겨진 창으로 대상 앱을 크롤링하며 한다.
// 여기서는 IPC 응답({ ok, data } | { ok:false, error })을 풀고 타입을 제공한다.

export const SCREEN_TEST_DESKTOP_ONLY_MESSAGE = "데스크톱 앱에서만 사용할 수 있습니다";
export const SCREEN_TEST_UNREACHABLE_MESSAGE = "대상 앱이 실행 중인지 확인하세요";

export type ScreenTestViewport = {
  name: string;
  width: number;
  height: number;
  mobile?: boolean;
};

export type ScreenTestOptions = {
  baseUrl: string;
  maxPages?: number;
  viewports?: Array<ScreenTestViewport | "desktop" | "mobile">;
  pageTimeoutMs?: number;
  settleMs?: number;
  paths?: string[];
};

export type ScreenTestStatus = "PASS" | "WARN" | "FAIL";

export type ScreenTestMessage = { message: string; source: string };
export type ScreenTestException = ScreenTestMessage & { kind: "exception" | "unhandledrejection" };
export type ScreenTestFailedRequest = {
  url: string;
  resourceType: string;
  status?: number;
  error?: string;
};
export type ScreenTestUiIssue = {
  type: "blank-page" | "horizontal-overflow" | "broken-image" | "element-overflow" | "zero-size-clickable";
  message: string;
  samples: string[];
};

export type ScreenTestPageResult = {
  index: number;
  url: string;
  path: string;
  finalUrl: string;
  viewport: { name: string; width: number; height: number };
  status: ScreenTestStatus;
  reasons: string[];
  title: string;
  httpStatus: number | null;
  loadTimeMs: number | null;
  timedOut: boolean;
  loadError: string | null;
  crashed: string | null;
  consoleErrors: ScreenTestMessage[];
  consoleWarnings: ScreenTestMessage[];
  exceptions: ScreenTestException[];
  failedRequests: ScreenTestFailedRequest[];
  uiIssues: ScreenTestUiIssue[];
  screenshotPath: string | null;
  thumbnailDataUrl: string | null;
  previewDataUrl: string | null;
};

export type ScreenTestResult = {
  runId: string;
  baseUrl: string;
  outputDir: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cancelled: boolean;
  viewports: ScreenTestViewport[];
  totals: { pages: number; pass: number; warn: number; fail: number };
  pages: ScreenTestPageResult[];
};

export type ScreenTestProgress =
  | { type: "start"; runId: string; outputDir: string; baseUrl: string; viewports: ScreenTestViewport[]; maxPages: number }
  | { type: "page-start"; runId: string; index: number; total: number; url: string; viewport: string }
  | { type: "page-done"; runId: string; index: number; total: number; page: ScreenTestPageResult }
  | { type: "done"; runId: string; totals: ScreenTestResult["totals"]; cancelled: boolean };

export type ScreenTestReachability = {
  reachable: boolean;
  status: number | null;
  latencyMs: number;
  error?: string;
};

export type ScreenTestIpcResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export class ScreenTestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ScreenTestError";
    this.code = code;
  }
}

export function isScreenTestAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.screenTest);
}

function bridge() {
  const api = typeof window !== "undefined" ? window.electronAPI?.screenTest : undefined;
  if (!api) throw new ScreenTestError(SCREEN_TEST_DESKTOP_ONLY_MESSAGE, "DESKTOP_ONLY");
  return api;
}

async function unwrap<T>(pending: Promise<ScreenTestIpcResponse<T>>): Promise<T> {
  const response = await pending;
  if (!response || typeof response !== "object") {
    throw new ScreenTestError("화면 테스트 응답이 올바르지 않습니다.", "SCREEN_TEST_ERROR");
  }
  if (!response.ok) throw new ScreenTestError(response.error.message, response.error.code);
  return response.data;
}

export function checkScreenTestTarget(url: string): Promise<ScreenTestReachability> {
  return unwrap(bridge().check(url));
}

export function runScreenTest(options: ScreenTestOptions): Promise<ScreenTestResult> {
  return unwrap(bridge().run(options));
}

export function cancelScreenTest(): Promise<{ cancelled: boolean }> {
  return unwrap(bridge().cancel());
}

export function openScreenTestFolder(target?: string): Promise<{ path: string }> {
  return unwrap(bridge().openFolder(target));
}

export function onScreenTestProgress(callback: (progress: ScreenTestProgress) => void): () => void {
  const api = typeof window !== "undefined" ? window.electronAPI?.screenTest : undefined;
  if (!api) return () => {};
  return api.onProgress(callback);
}

// 대상 URL은 프로젝트별로 기억한다 (브라우저 저장소가 막혀 있어도 동작해야 하므로 try/catch).
const URL_STORAGE_PREFIX = "synaipse.screenTest.url.";

export function loadScreenTestUrl(projectId: number | string): string {
  try {
    return window.localStorage.getItem(`${URL_STORAGE_PREFIX}${projectId}`) || "";
  } catch {
    return "";
  }
}

export function saveScreenTestUrl(projectId: number | string, url: string) {
  try {
    window.localStorage.setItem(`${URL_STORAGE_PREFIX}${projectId}`, url);
  } catch {
    /* ignore */
  }
}

/** 최종 리포트에 붙일 짧은 요약 텍스트. */
export function summarizeScreenTest(result: ScreenTestResult): string {
  const { totals } = result;
  const lines = [
    `화면 자동화 테스트 (${result.baseUrl}) — ${totals.pages}개 화면: PASS ${totals.pass} · WARN ${totals.warn} · FAIL ${totals.fail}${result.cancelled ? " (중단됨)" : ""}`,
  ];
  for (const page of result.pages) {
    if (page.status === "PASS") continue;
    lines.push(`- [${page.status}] ${page.viewport.name} ${page.path}: ${page.reasons.join(", ")}`);
  }
  return lines.join("\n");
}
