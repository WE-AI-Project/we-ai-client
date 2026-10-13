import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera, Play, Square, Loader2, FolderOpen, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Monitor, Smartphone, X, Copy,
} from "lucide-react";
import {
  isScreenTestAvailable,
  checkScreenTestTarget,
  runScreenTest,
  cancelScreenTest,
  openScreenTestFolder,
  onScreenTestProgress,
  loadScreenTestUrl,
  saveScreenTestUrl,
  summarizeScreenTest,
  SCREEN_TEST_DESKTOP_ONLY_MESSAGE,
  SCREEN_TEST_UNREACHABLE_MESSAGE,
  type ScreenTestPageResult,
  type ScreenTestResult,
  type ScreenTestStatus,
} from "../lib/screenTest";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, UI_RED, UI_AMBER,
} from "../colors";

const STATUS_META: Record<ScreenTestStatus, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  PASS: { color: "#10b981", bg: "rgba(16,185,129,0.10)", icon: CheckCircle2 },
  WARN: { color: UI_AMBER, bg: "rgba(245,158,11,0.10)", icon: AlertTriangle },
  FAIL: { color: UI_RED, bg: "rgba(239,68,68,0.10)", icon: XCircle },
};

const VIEWPORT_PRESETS = [
  { id: "desktop" as const, label: "Desktop 1440×900", icon: Monitor },
  { id: "mobile" as const, label: "Mobile 390×844", icon: Smartphone },
];

function PageCard({ page, onPreview }: { page: ScreenTestPageResult; onPreview: (page: ScreenTestPageResult) => void }) {
  const [open, setOpen] = useState(page.status === "FAIL");
  const meta = STATUS_META[page.status];
  const StatusIcon = meta.icon;
  const hasDetails =
    page.exceptions.length + page.consoleErrors.length + page.consoleWarnings.length + page.failedRequests.length > 0 ||
    page.uiIssues.some((issue) => issue.samples.length > 0);

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "rgba(255,255,255,0.90)", border: `1px solid ${page.status === "PASS" ? BORDER : meta.color + "40"}` }}>
      <button
        type="button"
        onClick={() => page.previewDataUrl && onPreview(page)}
        className="block w-full overflow-hidden"
        style={{ background: "rgba(0,0,0,0.04)", height: 150, cursor: page.previewDataUrl ? "zoom-in" : "default" }}
        title={page.previewDataUrl ? "클릭해서 크게 보기" : "스크린샷 없음"}
      >
        {page.thumbnailDataUrl ? (
          <img src={page.thumbnailDataUrl} alt={`${page.path} ${page.viewport.name}`} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: TEXT_TERTIARY }}>스크린샷 없음</div>
        )}
      </button>
      <div className="p-3 space-y-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>
            <StatusIcon className="w-2.5 h-2.5" />{page.status}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}>
            {page.viewport.name}
          </span>
          {page.loadTimeMs != null && (
            <span className="ml-auto text-[9px]" style={{ color: TEXT_TERTIARY }}>{page.loadTimeMs}ms</span>
          )}
        </div>
        <p className="text-[10px] font-mono truncate" style={{ color: TEXT_PRIMARY }} title={page.url}>{page.path || "/"}</p>
        {page.title && <p className="text-[9px] truncate" style={{ color: TEXT_TERTIARY }}>{page.title}</p>}
        {page.reasons.length > 0 && (
          <ul className="space-y-0.5">
            {page.reasons.map((reason, i) => (
              <li key={i} className="text-[10px] leading-snug" style={{ color: i === 0 && page.status === "FAIL" ? UI_RED : TEXT_SECONDARY }}>• {reason}</li>
            ))}
          </ul>
        )}
        {hasDetails && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: ACCENT }}>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} 상세 로그
          </button>
        )}
        {open && hasDetails && (
          <div className="rounded-lg p-2 space-y-1 font-mono text-[9px] leading-relaxed max-h-48 overflow-y-auto select-text" style={{ background: "rgba(0,0,0,0.04)", color: TEXT_SECONDARY }}>
            {page.exceptions.map((e, i) => <p key={`x${i}`} style={{ color: UI_RED }} className="break-all">[{e.kind}] {e.message}{e.source ? ` (${e.source})` : ""}</p>)}
            {page.consoleErrors.map((e, i) => <p key={`e${i}`} style={{ color: UI_RED }} className="break-all">[console.error] {e.message}</p>)}
            {page.consoleWarnings.map((e, i) => <p key={`w${i}`} style={{ color: UI_AMBER }} className="break-all">[console.warn] {e.message}</p>)}
            {page.failedRequests.map((r, i) => <p key={`r${i}`} className="break-all">[{r.status ?? r.error}] {r.resourceType} {r.url}</p>)}
            {page.uiIssues.filter((issue) => issue.samples.length > 0).map((issue, i) => (
              <p key={`u${i}`} className="break-all">[{issue.type}] {issue.samples.join(" · ")}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScreenTestPanel({
  projectId,
  onResult,
}: {
  projectId: number;
  onResult?: (result: ScreenTestResult | null) => void;
}) {
  const available = isScreenTestAvailable();
  const [url, setUrl] = useState(() => loadScreenTestUrl(projectId) || "http://localhost:5173");
  const [maxPages, setMaxPages] = useState(10);
  const [viewports, setViewports] = useState<Array<"desktop" | "mobile">>(["desktop", "mobile"]);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; url: string; viewport: string } | null>(null);
  const [livePages, setLivePages] = useState<ScreenTestPageResult[]>([]);
  const [result, setResult] = useState<ScreenTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScreenTestPageResult | null>(null);
  const [filter, setFilter] = useState<ScreenTestStatus | "ALL">("ALL");
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    setUrl(loadScreenTestUrl(projectId) || "http://localhost:5173");
  }, [projectId]);

  useEffect(() => {
    if (!available) return;
    return onScreenTestProgress((event) => {
      if (event.type === "start") {
        runIdRef.current = event.runId;
        return;
      }
      if (runIdRef.current && event.runId !== runIdRef.current) return;
      if (event.type === "page-start") setProgress({ index: event.index, total: event.total, url: event.url, viewport: event.viewport });
      if (event.type === "page-done") setLivePages((prev) => [...prev, event.page]);
    });
  }, [available]);

  const toggleViewport = (id: "desktop" | "mobile") => {
    setViewports((prev) => (prev.includes(id) ? (prev.length > 1 ? prev.filter((v) => v !== id) : prev) : [...prev, id]));
  };

  const start = async () => {
    const target = url.trim();
    if (!target) {
      toast.error("테스트할 앱의 URL을 입력해 주세요.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(target);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
    } catch {
      setError("http:// 또는 https:// 로 시작하는 올바른 URL을 입력해 주세요.");
      return;
    }
    saveScreenTestUrl(projectId, target);
    setError(null);
    setResult(null);
    onResult?.(null);
    setLivePages([]);
    setProgress(null);
    runIdRef.current = null;

    setChecking(true);
    try {
      const reach = await checkScreenTestTarget(target);
      if (!reach.reachable) {
        setError(`${SCREEN_TEST_UNREACHABLE_MESSAGE} (${target}${reach.error ? ` · ${reach.error}` : ""})`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : SCREEN_TEST_UNREACHABLE_MESSAGE);
      return;
    } finally {
      setChecking(false);
    }

    setRunning(true);
    try {
      const res = await runScreenTest({ baseUrl: target, maxPages, viewports });
      setResult(res);
      setLivePages(res.pages);
      onResult?.(res);
      if (res.cancelled) toast.info("화면 자동화 테스트를 중단했습니다.");
      else if (res.totals.fail > 0) toast.warning(`화면 자동화 테스트: FAIL ${res.totals.fail}개 화면`);
      else toast.success(`화면 자동화 테스트 완료 (${res.totals.pages}개 화면)`);
    } catch (err: any) {
      const message = err?.code === "TARGET_UNREACHABLE" ? `${SCREEN_TEST_UNREACHABLE_MESSAGE} (${target})` : err?.message || "화면 자동화 테스트에 실패했습니다.";
      setError(message);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const stop = async () => {
    try {
      await cancelScreenTest();
    } catch (err: any) {
      toast.error(err?.message || "중단하지 못했습니다.");
    }
  };

  const openFolder = async () => {
    try {
      await openScreenTestFolder(result?.outputDir);
    } catch (err: any) {
      toast.error(err?.message || "결과 폴더를 열지 못했습니다.");
    }
  };

  const copySummary = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(summarizeScreenTest(result));
      toast.success("요약을 복사했습니다.");
    } catch {
      toast.error("클립보드에 복사하지 못했습니다.");
    }
  };

  const pages = result ? result.pages : livePages;
  const counts = {
    PASS: pages.filter((p) => p.status === "PASS").length,
    WARN: pages.filter((p) => p.status === "WARN").length,
    FAIL: pages.filter((p) => p.status === "FAIL").length,
  };
  const visiblePages = filter === "ALL" ? pages : pages.filter((p) => p.status === filter);
  const busy = running || checking;

  return (
    <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "rgba(247,248,255,0.85)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: running ? ACCENT_BG : result ? (result.totals.fail > 0 ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)") : "rgba(0,0,0,0.05)" }}>
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} /> : <Camera className="w-3.5 h-3.5" style={{ color: result ? (result.totals.fail > 0 ? UI_RED : "#10b981") : TEXT_TERTIARY }} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>화면 자동화 테스트</p>
          <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>실행 중인 앱을 숨겨진 브라우저로 돌며 런타임 오류·깨진 화면을 캡처합니다</p>
        </div>
        {pages.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            {(["PASS", "WARN", "FAIL"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(filter === status ? "ALL" : status)}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: STATUS_META[status].bg,
                  color: STATUS_META[status].color,
                  outline: filter === status ? `1px solid ${STATUS_META[status].color}` : "none",
                }}
              >
                {status} {counts[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      {!available ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Monitor className="w-8 h-8" style={{ color: "rgba(88,101,242,0.30)" }} />
          <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>{SCREEN_TEST_DESKTOP_ONLY_MESSAGE}</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* 설정 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-semibold uppercase tracking-wider shrink-0" style={{ color: TEXT_LABEL }}>대상 URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              placeholder="http://localhost:5173"
              className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg text-[11px] font-mono outline-none"
              style={{ background: "rgba(255,255,255,0.90)", border: `1px solid ${url.trim() ? ACCENT_BORDER : BORDER}`, color: TEXT_PRIMARY }}
              onKeyDown={(e) => { if (e.key === "Enter" && !busy) void start(); }}
            />
            <label className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_SECONDARY }}>
              최대 페이지
              <input
                type="number"
                min={1}
                max={50}
                value={maxPages}
                disabled={busy}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className="w-14 px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "rgba(255,255,255,0.90)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
            <div className="flex rounded-xl overflow-hidden p-0.5 gap-0.5" style={{ background: "rgba(255,255,255,0.60)", border: `1px solid ${BORDER}` }}>
              {VIEWPORT_PRESETS.map((preset) => {
                const active = viewports.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleViewport(preset.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: active ? ACCENT_BG : "transparent", color: active ? ACCENT : TEXT_TERTIARY }}
                  >
                    <preset.icon className="w-3 h-3" />{preset.label}
                  </button>
                );
              })}
            </div>
            {running ? (
              <button type="button" onClick={() => void stop()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(239,68,68,0.10)", color: UI_RED, border: "1px solid rgba(239,68,68,0.25)" }}>
                <Square className="w-3 h-3" /> 중단
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void start()}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold"
                style={{ background: busy ? "rgba(0,0,0,0.07)" : ACCENT, color: busy ? TEXT_TERTIARY : "rgba(255,255,255,0.95)", boxShadow: busy ? "none" : "0 4px 14px rgba(88,101,242,0.25)" }}
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {checking ? "연결 확인 중…" : "화면 테스트 실행"}
              </button>
            )}
            {result && (
              <button type="button" onClick={() => void openFolder()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>
                <FolderOpen className="w-3 h-3" /> 스크린샷 폴더
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: UI_RED }} />
              <p className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{error}</p>
            </div>
          )}

          {/* 진행 상황 */}
          {running && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px]" style={{ color: TEXT_SECONDARY }}>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: ACCENT }} />
                {progress ? (
                  <span className="truncate">
                    {progress.index}/{Math.max(progress.total, progress.index)} · {progress.viewport} · <span className="font-mono">{progress.url}</span>
                  </span>
                ) : (
                  <span>테스트 창 준비 중…</span>
                )}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: ACCENT, width: `${progress ? Math.min(100, (livePages.length / Math.max(progress.total, 1)) * 100) : 3}%` }}
                />
              </div>
            </div>
          )}

          {/* 결과 요약 */}
          {result && (
            <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: result.totals.fail > 0 ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.06)", border: `1px solid ${BORDER_SUBTLE}` }}>
              <pre className="flex-1 text-[10px] whitespace-pre-wrap break-all font-sans leading-relaxed select-text" style={{ color: TEXT_SECONDARY }}>
                {summarizeScreenTest(result)}
              </pre>
              <button type="button" onClick={() => void copySummary()} title="요약 복사" className="p-1 rounded-md hover:bg-black/[0.06]">
                <Copy className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
              </button>
            </div>
          )}

          {/* 페이지별 결과 */}
          {visiblePages.length > 0 ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {visiblePages.map((page) => (
                <PageCard key={`${page.index}-${page.viewport.name}`} page={page} onPreview={setPreview} />
              ))}
            </div>
          ) : !running && !result && !error ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Camera className="w-8 h-8" style={{ color: "rgba(88,101,242,0.25)" }} />
              <p className="text-[11px] text-center" style={{ color: TEXT_TERTIARY }}>
                대상 앱을 실행한 뒤 URL을 입력하고 실행하면, 같은 사이트의 화면들을 데스크톱/모바일 크기로 열어<br />
                콘솔 오류·예외·실패한 요청·깨진 레이아웃을 찾아 스크린샷과 함께 보여줍니다
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 스크린샷 크게 보기 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-[92vw] max-h-[90vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: "#fff", border: `1px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: STATUS_META[preview.status].bg, color: STATUS_META[preview.status].color }}>{preview.status}</span>
              <span className="text-[11px] font-mono truncate" style={{ color: TEXT_PRIMARY }}>{preview.url}</span>
              <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{preview.viewport.name} {preview.viewport.width}×{preview.viewport.height}</span>
              <button type="button" onClick={() => setPreview(null)} className="ml-auto p-1 rounded-md hover:bg-black/[0.06]" aria-label="닫기">
                <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
              </button>
            </div>
            <div className="overflow-auto">
              {preview.previewDataUrl && <img src={preview.previewDataUrl} alt={preview.path} className="block max-w-full" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
