// ── AI QA "화면 자동화 테스트" (Electron 메인 프로세스 전용) ──
// 사용자가 실행 중인 앱(예: http://localhost:5173)을 숨겨진 BrowserWindow로 직접 열어 같은 출처의
// 페이지들을 BFS로 돌아다니며, 페이지마다
//   - 콘솔 에러/경고, 잡히지 않은 예외·unhandled rejection
//   - 실패한 요청 / HTTP 400 이상 응답, did-fail-load, render-process-gone
//   - 로드 시간
//   - 휴리스틱 UI 검사(빈 화면, 가로 넘침, 깨진 이미지, 화면 밖으로 넘친 요소, 크기 0인 클릭 요소)
//   - 스크린샷(PNG 저장 + 썸네일)
// 을 모아 PASS / WARN / FAIL 리포트를 만든다. Playwright 같은 별도 브라우저를 내려받지 않고
// Electron에 내장된 Chromium을 그대로 쓴다. AI/비전 모델은 호출하지 않는다.
//
// 격리/보안
// - 실행마다 별도 세션 파티션(screen-test-<runId>, 메모리 전용)이라 메인 앱의 쿠키/스토리지와 섞이지 않는다.
// - 테스트 창은 nodeIntegration:false, contextIsolation:true, sandbox:true. 새 창/다운로드/권한 요청은 모두 거부.
// - http/https URL만 허용, 크롤링은 기준 URL과 같은 출처(origin)로 제한.

const { app, BrowserWindow, session, net } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DOWNLOAD_EXTENSIONS = /\.(zip|rar|7z|tar|gz|tgz|pdf|docx?|xlsx?|pptx?|csv|exe|msi|dmg|apk|iso|mp3|mp4|mov|avi|png|jpe?g|gif|webp|svg|ico)$/i;
const LOGOUT_LIKE = /(log[-_]?out|sign[-_]?out|로그아웃)/i;
const MAX_MESSAGES_PER_KIND = 30;

class ScreenTestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ScreenTestError";
    this.code = code;
  }
}

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseHttpUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    throw new ScreenTestError("INVALID_URL", "대상 URL 형식이 올바르지 않습니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScreenTestError("INVALID_URL", "http 또는 https URL만 테스트할 수 있습니다.");
  }
  if (url.username || url.password) {
    throw new ScreenTestError("INVALID_URL", "URL에 자격 증명을 포함할 수 없습니다.");
  }
  return url;
}

/** 페이지 식별 키: origin + path + query (+ 해시 라우터(#/, #!)인 경우에만 해시). */
function pageKey(url) {
  const u = new URL(url);
  let pathname = u.pathname.replace(/\/+$/, "") || "/";
  const hashRoute = /^#[!/]/.test(u.hash) ? u.hash : "";
  return `${u.origin}${pathname}${u.search}${hashRoute}`;
}

function normalizeViewports(input) {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_VIEWPORTS;
  const out = [];
  for (const raw of input) {
    if (typeof raw === "string") {
      const preset = DEFAULT_VIEWPORTS.find((v) => v.name === raw);
      if (preset) out.push(preset);
      continue;
    }
    if (raw && typeof raw === "object") {
      out.push({
        name: String(raw.name || `${raw.width}x${raw.height}`).slice(0, 32),
        width: clampInt(raw.width, 1440, 320, 3840),
        height: clampInt(raw.height, 900, 320, 2400),
        mobile: Boolean(raw.mobile),
      });
    }
  }
  return out.length > 0 ? out : DEFAULT_VIEWPORTS;
}

function slugify(text) {
  return String(text || "page").replace(/[^a-zA-Z0-9가-힣_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "root";
}

function pushLimited(list, item) {
  if (list.length < MAX_MESSAGES_PER_KIND) list.push(item);
}

// 페이지 안에서 실행되는 스크립트 (메인 월드). 결과는 직렬화 가능한 객체만 돌려준다.
const INSTALL_ERROR_HOOK = `(() => {
  if (window.__synaipseScreenTest) return true;
  const store = { errors: [] };
  window.__synaipseScreenTest = store;
  window.addEventListener("error", (e) => {
    if (e && e.target && e.target !== window) return; // 리소스 로드 실패는 webRequest가 잡는다
    store.errors.push({ kind: "exception", message: String((e && (e.message || (e.error && e.error.message))) || "Script error"), source: e && e.filename ? e.filename + ":" + e.lineno : "" });
  }, true);
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    store.errors.push({ kind: "unhandledrejection", message: String((r && (r.message || r)) || "Unhandled promise rejection"), source: "" });
  });
  return true;
})()`;

const COLLECT_SCRIPT = `(() => {
  const describe = (el) => {
    if (!el || !el.tagName) return "";
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const cls = (typeof el.className === "string" ? el.className : "").trim().split(/\\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += "." + cls.join(".");
    return s.slice(0, 80);
  };
  const isVisible = (el) => {
    const st = getComputedStyle(el);
    return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) !== 0;
  };
  const isClipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "hidden" || ox === "auto" || ox === "scroll" || ox === "clip") return true;
    }
    return false;
  };
  const de = document.documentElement;
  const body = document.body;
  const vw = de.clientWidth || window.innerWidth;
  const text = ((body && body.innerText) || "").replace(/\\s+/g, " ").trim();
  const mediaCount = document.querySelectorAll("img,svg,canvas,video,iframe,picture").length;

  const brokenImages = Array.from(document.images)
    .filter((img) => img.getAttribute("src") && img.complete && img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src)
    .slice(0, 10);

  const overflowing = [];
  const zeroSizeClickables = [];
  const all = body ? body.querySelectorAll("*") : [];
  const limit = Math.min(all.length, 4000);
  for (let i = 0; i < limit; i++) {
    const el = all[i];
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.right > vw + 2 || rect.left < -2)) {
      if (overflowing.length < 8 && isVisible(el) && getComputedStyle(el).position !== "fixed" && !isClipped(el)) {
        overflowing.push(describe(el) + " (left " + Math.round(rect.left) + ", right " + Math.round(rect.right) + ")");
      }
    }
  }
  const clickables = document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"], [onclick]');
  for (const el of clickables) {
    if (zeroSizeClickables.length >= 8) break;
    const rect = el.getBoundingClientRect();
    if ((rect.width === 0 || rect.height === 0) && isVisible(el) && (el.offsetParent !== null || getComputedStyle(el).position === "fixed")) {
      zeroSizeClickables.push(describe(el) + (el.textContent ? ' "' + el.textContent.trim().slice(0, 30) + '"' : ""));
    }
  }

  const links = Array.from(document.querySelectorAll("a[href]"))
    .filter((a) => !a.hasAttribute("download"))
    .map((a) => ({ href: a.href, raw: a.getAttribute("href") || "", text: (a.textContent || "").trim().slice(0, 40) }))
    .slice(0, 500);

  return {
    title: document.title || "",
    finalUrl: location.href,
    textLength: text.length,
    mediaCount,
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    brokenImages,
    overflowing,
    zeroSizeClickables,
    links,
    hookErrors: (window.__synaipseScreenTest && window.__synaipseScreenTest.errors.slice(0, 30)) || [],
  };
})()`;

function shouldFollowLink(link, origin) {
  const raw = (link.raw || "").trim();
  if (!raw || raw.startsWith("#") && !/^#[!/]/.test(raw)) return false; // 같은 페이지 앵커
  if (/^(mailto|tel|sms|javascript|data|blob|file):/i.test(raw)) return false;
  let url;
  try {
    url = new URL(link.href);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.origin !== origin) return false;
  if (DOWNLOAD_EXTENSIONS.test(url.pathname)) return false;
  if (LOGOUT_LIKE.test(url.pathname) || LOGOUT_LIKE.test(url.hash) || LOGOUT_LIKE.test(link.text || "")) return false;
  return true;
}

function evaluateStatus(page) {
  const fail = [];
  const warn = [];
  if (page.timedOut) fail.push(`페이지 로드 시간 초과 (${page.timeoutMs}ms)`);
  if (page.loadError) fail.push(`페이지 로드 실패: ${page.loadError}`);
  if (page.crashed) fail.push(`렌더러 프로세스 종료: ${page.crashed}`);
  if (page.httpStatus && page.httpStatus >= 400) fail.push(`문서 응답 HTTP ${page.httpStatus}`);
  if (page.exceptions.length > 0) fail.push(`잡히지 않은 예외 ${page.exceptions.length}건`);
  const blank = page.uiIssues.find((i) => i.type === "blank-page");
  if (blank) fail.push(blank.message);

  if (page.consoleErrors.length > 0) warn.push(`콘솔 에러 ${page.consoleErrors.length}건`);
  const badRequests = page.failedRequests.length;
  if (badRequests > 0) warn.push(`실패한 요청/HTTP 오류 ${badRequests}건`);
  for (const issue of page.uiIssues) {
    if (issue.type !== "blank-page") warn.push(issue.message);
  }
  const status = fail.length > 0 ? "FAIL" : warn.length > 0 ? "WARN" : "PASS";
  return { status, reasons: [...fail, ...warn] };
}

function waitForLoad(webContents, url, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      try { webContents.stop(); } catch { /* ignore */ }
      finish({ timedOut: true });
    }, timeoutMs);
    webContents.loadURL(url).then(
      () => finish({ ok: true }),
      (error) => finish({ error })
    );
  });
}

function sleep(ms, token) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (token) token.onCancel(() => { clearTimeout(t); resolve(); });
  });
}

function createCancelToken() {
  const listeners = [];
  const token = {
    cancelled: false,
    cancel() {
      if (token.cancelled) return;
      token.cancelled = true;
      for (const fn of listeners.splice(0)) {
        try { fn(); } catch { /* ignore */ }
      }
    },
    onCancel(fn) {
      if (token.cancelled) fn();
      else listeners.push(fn);
    },
  };
  return token;
}

/** 대상 URL이 응답하는지 확인 (HTTP 상태와 상관없이 응답이 오면 reachable). */
async function checkReachable(rawUrl, timeoutMs = 5000) {
  const url = parseHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await net.fetch(url.toString(), { method: "GET", signal: controller.signal, redirect: "follow", bypassCustomProtocolHandlers: true });
    try { await res.arrayBuffer(); } catch { /* ignore */ }
    return { reachable: true, status: res.status, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      latencyMs: Date.now() - started,
      error: error?.name === "AbortError" ? `${timeoutMs}ms 안에 응답이 없습니다.` : String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 화면 자동화 테스트 실행.
 * @param {object} options { baseUrl, maxPages=10, viewports, pageTimeoutMs=15000, settleMs=800, paths=[], outputRoot? }
 * @param {object} hooks { onProgress(event), token (createCancelToken()) }
 */
async function runScreenTest(options = {}, hooks = {}) {
  const base = parseHttpUrl(options.baseUrl);
  const origin = base.origin;
  const maxPages = clampInt(options.maxPages, 10, 1, 50);
  const pageTimeoutMs = clampInt(options.pageTimeoutMs, 15000, 2000, 120000);
  const settleMs = clampInt(options.settleMs, 800, 0, 10000);
  const viewports = normalizeViewports(options.viewports);
  const token = hooks.token || createCancelToken();
  const emit = (event) => {
    try { hooks.onProgress?.(event); } catch { /* ignore */ }
  };

  const runId = options.runId || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${crypto.randomBytes(3).toString("hex")}`;
  const outputRoot = options.outputRoot || path.join(app.getPath("userData"), "screen-tests");
  const outputDir = path.join(outputRoot, runId);

  const reach = await checkReachable(base.toString(), Math.min(pageTimeoutMs, 8000));
  if (!reach.reachable) {
    throw new ScreenTestError("TARGET_UNREACHABLE", `대상 앱이 실행 중인지 확인하세요 (${base.toString()}: ${reach.error})`);
  }
  await fs.mkdir(outputDir, { recursive: true });

  // 시드 URL: 기준 URL + 사용자가 지정한 같은 출처 경로들
  const seeds = [base.toString()];
  for (const p of Array.isArray(options.paths) ? options.paths : []) {
    if (typeof p !== "string" || !p.trim()) continue;
    try {
      const u = new URL(p.trim(), base);
      if (u.origin === origin && (u.protocol === "http:" || u.protocol === "https:")) seeds.push(u.toString());
    } catch { /* ignore */ }
  }

  const partition = `screen-test-${runId}`;
  const ses = session.fromPartition(partition, { cache: false });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.on("will-download", (event) => event.preventDefault());

  let currentCollector = null;
  const requestFilter = { urls: ["http://*/*", "https://*/*"] };
  ses.webRequest.onBeforeRequest(requestFilter, (details, callback) => {
    // 문서 이동은 같은 출처만 허용 (외부 사이트로 튀는 것 방지). 서브리소스(CDN 등)는 허용.
    if (details.resourceType === "mainFrame") {
      try {
        if (new URL(details.url).origin !== origin) {
          currentCollector?.failedRequests && pushLimited(currentCollector.failedRequests, { url: details.url, resourceType: "mainFrame", error: "외부 출처로의 이동 차단" });
          callback({ cancel: true });
          return;
        }
      } catch { /* ignore */ }
    }
    callback({});
  });
  ses.webRequest.onCompleted(requestFilter, (details) => {
    const c = currentCollector;
    if (!c) return;
    if (details.resourceType === "mainFrame") {
      c.httpStatus = details.statusCode;
      return;
    }
    if (details.statusCode >= 400) {
      pushLimited(c.failedRequests, { url: details.url, resourceType: details.resourceType, status: details.statusCode });
    }
  });
  ses.webRequest.onErrorOccurred(requestFilter, (details) => {
    const c = currentCollector;
    if (!c) return;
    if (details.error === "net::ERR_ABORTED" || details.error === "net::ERR_BLOCKED_BY_CLIENT") return;
    pushLimited(c.failedRequests, { url: details.url, resourceType: details.resourceType, error: details.error });
  });

  const startedAt = new Date();
  const pages = [];
  const visitList = []; // 첫 번째 뷰포트에서 BFS로 발견한 URL 목록 (나머지 뷰포트는 같은 목록 재사용)
  let totalPlanned = Math.min(maxPages, seeds.length) * viewports.length;
  emit({ type: "start", runId, outputDir, baseUrl: base.toString(), viewports, maxPages });

  let win = null;
  const destroyWindow = () => {
    if (win && !win.isDestroyed()) {
      try { win.destroy(); } catch { /* ignore */ }
    }
    win = null;
  };
  token.onCancel(() => {
    try { win?.webContents.stop(); } catch { /* ignore */ }
  });

  try {
    for (let v = 0; v < viewports.length && !token.cancelled; v += 1) {
      const viewport = viewports[v];
      let wc = null;
      // 창 생성 + 이벤트 연결. 렌더러가 죽으면 같은 뷰포트로 새 창을 다시 만든다.
      const openWindow = () => {
      destroyWindow();
      win = new BrowserWindow({
        show: false,
        width: viewport.width,
        height: viewport.height,
        useContentSize: true,
        frame: false,
        resizable: true,
        paintWhenInitiallyHidden: true,
        webPreferences: {
          partition,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          backgroundThrottling: false,
          spellcheck: false,
        },
      });
      win.setContentSize(viewport.width, viewport.height);
      wc = win.webContents;
      wc.setAudioMuted(true);
      wc.setWindowOpenHandler(() => ({ action: "deny" }));
      if (viewport.mobile) wc.setUserAgent(MOBILE_USER_AGENT);

      wc.on("console-message", (...args) => {
        const c = currentCollector;
        if (!c) return;
        // Electron 33: (event, level, message, line, sourceId) / 신버전: (details{level,message,lineNumber,sourceId})
        let level; let message; let line; let source;
        if (args[0] && typeof args[0] === "object" && "message" in args[0] && typeof args[0].message === "string") {
          const d = args[0];
          level = typeof d.level === "number" ? d.level : { verbose: 0, info: 1, warning: 2, error: 3 }[d.level] ?? 1;
          message = d.message; line = d.lineNumber; source = d.sourceId;
        } else {
          [, level, message, line, source] = args;
        }
        const entry = { message: String(message).slice(0, 1000), source: source ? `${source}:${line}` : "" };
        // Electron이 개발 모드에서 테스트 대상 페이지마다 찍는 보안 경고는 대상 앱의 문제가 아니므로 제외한다.
        if (/Electron Security Warning/.test(entry.message)) return;
        if (level >= 3) {
          if (/^Uncaught\b/.test(entry.message)) pushLimited(c.exceptions, { kind: /in promise/.test(entry.message) ? "unhandledrejection" : "exception", ...entry });
          else pushLimited(c.consoleErrors, entry);
        } else if (level === 2) {
          pushLimited(c.consoleWarnings, entry);
        }
      });
      wc.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
        const c = currentCollector;
        if (!c || errorCode === -3) return; // -3 = ERR_ABORTED (네비게이션 교체 등)
        if (isMainFrame) c.loadError = `${errorDescription} (${errorCode})`;
        else pushLimited(c.failedRequests, { url: validatedURL, resourceType: "subFrame", error: `${errorDescription} (${errorCode})` });
      });
      wc.on("render-process-gone", (_e, details) => {
        const c = currentCollector;
        if (c) c.crashed = details?.reason || "unknown";
      });
      wc.on("dom-ready", () => {
        wc.executeJavaScript(INSTALL_ERROR_HOOK, true).catch(() => {});
      });
      };
      openWindow();

      const isFirstViewport = v === 0;
      const queue = isFirstViewport ? [...seeds] : [...visitList];
      const seen = new Set(isFirstViewport ? [] : visitList.map(pageKey));
      if (isFirstViewport) seeds.forEach((s) => seen.add(pageKey(s)));
      let visited = 0;

      while (queue.length > 0 && visited < maxPages && !token.cancelled) {
        const url = queue.shift();
        if (isFirstViewport) visitList.push(url);
        visited += 1;
        const index = pages.length + 1;
        emit({ type: "page-start", runId, index, total: totalPlanned, url, viewport: viewport.name });

        const collector = {
          url,
          path: (() => { const u = new URL(url); return `${u.pathname}${u.search}${/^#[!/]/.test(u.hash) ? u.hash : ""}`; })(),
          viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
          title: "",
          finalUrl: url,
          httpStatus: null,
          loadTimeMs: null,
          timedOut: false,
          timeoutMs: pageTimeoutMs,
          loadError: null,
          crashed: null,
          consoleErrors: [],
          consoleWarnings: [],
          exceptions: [],
          failedRequests: [],
          uiIssues: [],
          screenshotPath: null,
          thumbnailDataUrl: null,
          previewDataUrl: null,
        };
        currentCollector = collector;

        // 크래시 후에는 창을 새로 만들어야 하므로 확인
        if (!win || win.isDestroyed() || wc.isCrashed()) openWindow();

        const started = Date.now();
        const load = await waitForLoad(wc, url, pageTimeoutMs);
        collector.loadTimeMs = Date.now() - started;
        if (load.timedOut) collector.timedOut = true;
        if (load.error && !collector.loadError) {
          const code = load.error?.errno ?? load.error?.code;
          if (code !== -3 && !/ERR_ABORTED/.test(String(load.error?.message))) {
            collector.loadError = String(load.error?.message || load.error).slice(0, 300);
          }
        }

        if (!token.cancelled && settleMs > 0) await sleep(settleMs, token);

        let snapshot = null;
        if (!collector.crashed && !token.cancelled) {
          try {
            snapshot = await Promise.race([
              wc.executeJavaScript(COLLECT_SCRIPT, true),
              new Promise((_r, reject) => setTimeout(() => reject(new Error("UI 검사 스크립트 시간 초과")), 5000)),
            ]);
          } catch (error) {
            pushLimited(collector.consoleErrors, { message: `UI 검사 실패: ${error?.message || error}`, source: "screen-test" });
          }
        }

        if (snapshot) {
          collector.title = snapshot.title;
          collector.finalUrl = snapshot.finalUrl;
          for (const err of snapshot.hookErrors || []) {
            const dup = collector.exceptions.some((e) => e.message.includes(err.message));
            if (!dup) pushLimited(collector.exceptions, { kind: err.kind, message: String(err.message).slice(0, 1000), source: err.source || "" });
          }
          if (!collector.loadError && !collector.timedOut && snapshot.textLength < 20 && snapshot.mediaCount === 0) {
            collector.uiIssues.push({ type: "blank-page", message: `빈 화면으로 보입니다 (표시 텍스트 ${snapshot.textLength}자, 이미지/미디어 없음)`, samples: [] });
          }
          if (snapshot.scrollWidth > snapshot.clientWidth + 1) {
            collector.uiIssues.push({ type: "horizontal-overflow", message: `가로 스크롤 발생 (문서 너비 ${snapshot.scrollWidth}px > 화면 ${snapshot.clientWidth}px)`, samples: [] });
          }
          if (snapshot.brokenImages.length > 0) {
            collector.uiIssues.push({ type: "broken-image", message: `깨진 이미지 ${snapshot.brokenImages.length}개`, samples: snapshot.brokenImages });
          }
          if (snapshot.overflowing.length > 0) {
            collector.uiIssues.push({ type: "element-overflow", message: `화면 밖으로 넘친 요소 ${snapshot.overflowing.length}개`, samples: snapshot.overflowing });
          }
          if (snapshot.zeroSizeClickables.length > 0) {
            collector.uiIssues.push({ type: "zero-size-clickable", message: `크기가 0인 클릭 요소 ${snapshot.zeroSizeClickables.length}개`, samples: snapshot.zeroSizeClickables });
          }

          if (isFirstViewport) {
            for (const link of snapshot.links || []) {
              if (!shouldFollowLink(link, origin)) continue;
              let key;
              try { key = pageKey(link.href); } catch { continue; }
              if (seen.has(key)) continue;
              seen.add(key);
              const u = new URL(link.href);
              if (!/^#[!/]/.test(u.hash)) u.hash = "";
              queue.push(u.toString());
            }
            totalPlanned = Math.min(maxPages, visitList.length + queue.length) * viewports.length;
          }
        }

        // 스크린샷
        if (!collector.crashed && win && !win.isDestroyed()) {
          try {
            const image = await wc.capturePage();
            if (!image.isEmpty()) {
              const fileName = `${String(index).padStart(2, "0")}-${viewport.name}-${slugify(collector.path)}.png`;
              const filePath = path.join(outputDir, fileName);
              await fs.writeFile(filePath, image.toPNG());
              collector.screenshotPath = filePath;
              const size = image.getSize();
              const thumb = image.resize({ width: Math.min(320, size.width), quality: "good" });
              collector.thumbnailDataUrl = `data:image/jpeg;base64,${thumb.toJPEG(70).toString("base64")}`;
              const preview = size.width > 1280 ? image.resize({ width: 1280, quality: "good" }) : image;
              collector.previewDataUrl = `data:image/jpeg;base64,${preview.toJPEG(80).toString("base64")}`;
            }
          } catch (error) {
            pushLimited(collector.consoleWarnings, { message: `스크린샷 실패: ${error?.message || error}`, source: "screen-test" });
          }
        }

        currentCollector = null;
        const { status, reasons } = evaluateStatus(collector);
        const pageResult = { index, ...collector, status, reasons };
        delete pageResult.timeoutMs;
        pages.push(pageResult);
        emit({ type: "page-done", runId, index, total: totalPlanned, page: pageResult });

        if (collector.crashed) {
          // 렌더러가 죽은 창은 버리고, 남은 페이지는 새 창으로 이어간다.
          destroyWindow();
        }
      }
    }
  } finally {
    currentCollector = null;
    destroyWindow();
    try {
      ses.webRequest.onBeforeRequest(null);
      ses.webRequest.onCompleted(null);
      ses.webRequest.onErrorOccurred(null);
      await ses.clearStorageData();
      await ses.clearCache();
    } catch { /* ignore */ }
  }

  const finishedAt = new Date();
  const totals = {
    pages: pages.length,
    pass: pages.filter((p) => p.status === "PASS").length,
    warn: pages.filter((p) => p.status === "WARN").length,
    fail: pages.filter((p) => p.status === "FAIL").length,
  };
  const result = {
    runId,
    baseUrl: base.toString(),
    outputDir,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    cancelled: token.cancelled,
    viewports,
    totals,
    pages,
  };
  try {
    const slim = { ...result, pages: pages.map(({ thumbnailDataUrl: _t, previewDataUrl: _p, ...rest }) => rest) };
    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(slim, null, 2), "utf-8");
  } catch { /* ignore */ }
  emit({ type: "done", runId, totals, cancelled: token.cancelled });
  return result;
}

module.exports = {
  ScreenTestError,
  DEFAULT_VIEWPORTS,
  createCancelToken,
  checkReachable,
  runScreenTest,
  // 테스트용
  pageKey,
  shouldFollowLink,
  evaluateStatus,
};
