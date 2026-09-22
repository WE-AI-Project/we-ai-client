import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Monitor, Play, RotateCw,
  FileCode, GitCommit, Clock, ChevronDown,
  ChevronUp, Calendar, Code2, ClipboardCheck,
} from "lucide-react";
import { getPendingQA, clearPendingQA } from "../data/qaStore";
import { QAReportsPage } from "./QAReportsPage";
import type { CommitFile } from "./commitData";
import {
  buildDiffFromCommitFiles,
  runAiQa,
  type QaResponse,
} from "../../api/aiApi";
import {
  fetchQaReports,
  fetchQaReportDetail,
  executeBuildTask,
  type QaReportSummary,
  type QaReportDetail,
  type QaReportStatus,
  type BuildTaskExecutionResponse,
} from "../lib/api";
import {
  loadConnectionConfig,
  connectionKeyForProject,
  sshExec,
  buildSshTaskCommand,
  DEFAULT_CONNECTION_CONFIG,
  type ConnectionConfig,
} from "../lib/serverConnection";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  BRIGHT_BEIGE,
  TERM_BG, TERM_HEADER, TERM_TEXT, TERM_MUTED, UI_RED, UI_AMBER, UI_BLUE,
  TERM_RED2, TERM_GREEN, TRAFFIC_RED, TRAFFIC_YELLOW, TRAFFIC_GREEN,
} from "../colors";

// ── 🚨 [추가] 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

// ── 타입 ──
type Severity   = "critical" | "warning" | "passed";
type QAPhase    = "idle" | "phase1" | "phase2" | "done";

type StaticError = {
  id:       string;
  file:     string;
  line:     number;
  col:      number;
  type:     string;
  message:  string;
  severity: Severity;
  fix?:     string;
};

// ── 커밋 QA 상태 (실제 백엔드 QaReportStatus 기반) ──
const QA_STATUS_META: Record<QaReportStatus, { color: string; bg: string; label: string; icon: any }> = {
  SUCCESS:  { color:"#10b981", bg:"rgba(16,185,129,0.10)",  label:"Success",  icon:CheckCircle2  },
  FAILED:   { color:UI_RED, bg:"rgba(239,68,68,0.10)",   label:"Failed",   icon:XCircle       },
  RUNNING:  { color:UI_BLUE, bg:"rgba(59,130,246,0.10)",  label:"Running",  icon:Loader2       },
  PENDING:  { color:"#9b9b9b", bg:"rgba(0,0,0,0.06)",       label:"Pending",  icon:Clock         },
  CANCELED: { color:"#7d7f5b", bg:"rgba(125,127,91,0.10)",  label:"Canceled", icon:XCircle       },
};

// ── Phase 1: AI QA 응답 → 정적 분석 오류 목록으로 변환 ──
// scanTargets(실제 스캔된 파일 경로 목록)을 함께 넘기면 bugReport 본문에
// 등장하는 파일명을 찾아 file 필드를 실제 경로로 보강한다.
function mapQaResponseToErrors(response: QaResponse, scanTargets: string[] = []): StaticError[] {
  const bugReport = response.bugReport ?? response.bug_report ?? "";
  const optimization = response.optimization ?? "";
  const commitMsg = response.commitMsg ?? response.commit_msg ?? "";

  const guessFile = (text: string) =>
    scanTargets.find((path) => text.includes(path.split("/").pop() ?? path)) ?? "전체 변경 diff";

  return [
    bugReport && {
      id: "ai-bug-report",
      file: guessFile(bugReport),
      line: 1,
      col: 1,
      type: "AI Bug Risk",
      severity: "critical" as Severity,
      message: bugReport,
      fix: optimization || undefined,
    },
    commitMsg && {
      id: "ai-commit-message",
      file: "AI 추천 커밋",
      line: 1,
      col: 1,
      type: "Recommended Commit",
      severity: "warning" as Severity,
      message: commitMsg,
    },
  ].filter((item): item is StaticError => Boolean(item));
}

// ── CommitQARow ──
function CommitQARow({
  projectId,
  report,
}: {
  projectId: number;
  report: QaReportSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<QaReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const sm  = QA_STATUS_META[report.status];
  const Icon  = sm.icon;
  const totalTests = report.testPassCount + report.testFailCount;
  const createdLabel = (() => {
    const d = new Date(report.createdAt);
    return Number.isNaN(d.getTime()) ? report.createdAt : d.toLocaleString("ko-KR");
  })();

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail && !detailLoading) {
      setDetailLoading(true);
      setDetailError(null);
      fetchQaReportDetail(projectId, report.qaReportId)
        .then(setDetail)
        .catch((err: any) => setDetailError(err?.message || "QA 리포트 상세 조회에 실패했습니다."))
        .finally(() => setDetailLoading(false));
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={toggle}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: sm.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ background:"rgba(0,0,0,0.05)", color:ACCENT }}>
              #{report.commitId}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate font-medium" style={{ color:TEXT_PRIMARY }}>{report.commitMessage}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[9px]" style={{ color:TEXT_TERTIARY }}>
            <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{createdLabel}</span>
            {totalTests > 0 && <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" />{report.testPassCount}/{totalTests}</span>}
            {report.totalIssueCount > 0 && <span>이슈 {report.totalIssueCount}건{report.criticalCount > 0 ? ` (심각 ${report.criticalCount})` : ""}</span>}
          </div>
        </div>

        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background:sm.bg, color:sm.color }}>
          {sm.label}
        </span>
        <div className="shrink-0" style={{ color:TEXT_TERTIARY }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3" style={{ borderTop:`1px solid ${BORDER_SUBTLE}`, background:"rgba(0,0,0,0.015)" }}>
          {detailLoading ? (
            <div className="pt-3 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : detailError ? (
            <p className="pt-3 text-[10px]" style={{ color:UI_RED }}>{detailError}</p>
          ) : detail && (detail.issues.length > 0 || detail.testResults.length > 0) ? (
            <div className="pt-3 space-y-2">
              {detail.summary && <p className="text-[10px]" style={{ color:TEXT_SECONDARY }}>{detail.summary}</p>}
              {detail.issues.map(issue => (
                <div key={issue.issueId} className="rounded-xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.60)", border:`1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: issue.severity === "CRITICAL" ? "rgba(239,68,68,0.10)" : issue.severity === "MAJOR" ? "rgba(245,158,11,0.10)" : "rgba(0,0,0,0.06)",
                        color: issue.severity === "CRITICAL" ? UI_RED : issue.severity === "MAJOR" ? UI_AMBER : TEXT_TERTIARY,
                      }}
                    >{issue.severity}</span>
                    <p className="text-[10px] font-semibold flex-1 min-w-0 truncate" style={{ color:TEXT_PRIMARY }}>{issue.title}</p>
                  </div>
                  {issue.filePath && (
                    <p className="text-[9px] mt-1 font-mono" style={{ color:TEXT_TERTIARY }}>
                      {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ""}
                    </p>
                  )}
                  {issue.description && <p className="text-[9px] mt-1" style={{ color:TEXT_SECONDARY }}>{issue.description}</p>}
                </div>
              ))}
              {detail.testResults.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background:"rgba(255,255,255,0.60)", border:`1px solid ${BORDER}` }}>
                  <span className="text-[10px]" style={{ color:TEXT_PRIMARY }}>{t.testName}</span>
                  <span className="text-[9px] font-semibold" style={{ color: t.status === "PASSED" ? "#10b981" : t.status === "FAILED" ? UI_RED : TEXT_TERTIARY }}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="pt-3 text-[10px]" style={{ color:TEXT_TERTIARY }}>세부 이슈/테스트 결과가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// 메인 AIQAPage
// ════════════════════════════════════════
export function AIQAPage({
  projectId = 0,
  autoStart = false,
}: {
  projectId?: number | null;
  autoStart?: boolean;
}) {
  // ── 최상단 탭: AI QA / QA Reports ── (Agent Control은 Project Settings로 이동)
  const [mainTab,      setMainTab]      = useState<"qa" | "reports">("qa");
  const [activeTab,    setActiveTab]    = useState<"run" | "commit">("run");
  const [phase,        setPhase]        = useState<QAPhase>("idle");
  const [elapsed,      setElapsed]      = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoading = false;

  // ── 커밋 정보 (Changes 페이지에서 스테이징된 실제 변경 파일을 넘겨받음 - 없으면 QA를 돌릴 대상이 없다) ──
  const pendingQA  = getPendingQA();
  const [commitInfo] = useState(pendingQA);
  useEffect(() => { clearPendingQA(); }, []);
  const hasQaTarget = Boolean(commitInfo?.diffFiles?.length);

  // ── Phase 1: 정적 분석 (실제 AI QA 백엔드 호출) ──
  const [scanFiles,    setScanFiles]    = useState<string[]>([]);
  const [scanCurrent,  setScanCurrent]  = useState<string>("");
  const [staticErrors, setStaticErrors] = useState<StaticError[]>([]);
  const [phase1Done,   setPhase1Done]   = useState(false);

  // ── Phase 2: 실제 자동화 테스트 실행 (Server & Build와 동일한 local/link/ssh 연결) ──
  const [connection,   setConnection]   = useState<ConnectionConfig>(DEFAULT_CONNECTION_CONFIG);
  const [testRun,       setTestRun]       = useState<BuildTaskExecutionResponse | null>(null);
  const [testRunning,   setTestRunning]   = useState(false);
  const [testError,     setTestError]     = useState<string | null>(null);
  const [logsExpanded,  setLogsExpanded]  = useState(true);

  const connectionKey = connectionKeyForProject(projectId);
  useEffect(() => {
    let cancelled = false;
    loadConnectionConfig(connectionKey).then(cfg => { if (!cancelled) setConnection(cfg); });
    return () => { cancelled = true; };
  }, [connectionKey]);

  // ── 커밋 탭: 실제 QA 리포트 이력 ──
  const [commitFilter, setCommitFilter] = useState<QaReportStatus | "all">("all");
  const [commitReports, setCommitReports] = useState<QaReportSummary[]>([]);
  const [commitReportsLoading, setCommitReportsLoading] = useState(false);
  const [commitReportsError, setCommitReportsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "commit" || !projectId) return;
    let cancelled = false;
    setCommitReportsLoading(true);
    setCommitReportsError(null);
    fetchQaReports(projectId, { size: 50 })
      .then((res) => { if (!cancelled) setCommitReports(res.reports); })
      .catch((err: any) => { if (!cancelled) setCommitReportsError(err?.message || "QA 리포트를 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setCommitReportsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, projectId]);

  // ── 타이머 ──
  useEffect(() => {
    if (phase !== "idle" && phase !== "done") {
      timerRef.current = setInterval(() => setElapsed(e => e + 100), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    // isLoading 끝난 후 autoStart 처리 (분석할 실제 변경사항이 있을 때만)
    if (!isLoading && autoStart && hasQaTarget) setTimeout(() => startQA(), 400);
  }, [isLoading, autoStart, hasQaTarget]);

  // ── QA 시작 ──
  const startQA = () => {
    if (!hasQaTarget) {
      toast.error("먼저 Changes 페이지에서 변경된 파일을 스테이징하고 QA를 요청해 주세요.");
      return;
    }
    if (phase !== "idle" && phase !== "done") return;
    setPhase("phase1");
    setElapsed(0);
    setScanFiles([]);
    setScanCurrent("");
    setStaticErrors([]);
    setPhase1Done(false);
    setTestRun(null);
    setTestRunning(false);
    setTestError(null);
    void runPhase1FromApi();
  };

  const reset = () => {
    setPhase("idle");
    setElapsed(0);
    setScanFiles([]);
    setScanCurrent("");
    setStaticErrors([]);
    setPhase1Done(false);
    setTestRun(null);
    setTestRunning(false);
    setTestError(null);
  };

  // ── Phase 1: 정적 코드 분석 ──
  // Changes 페이지에서 실제로 스테이징된 변경 파일(commitInfo.diffFiles)의 diff를 그대로
  // 백엔드 AI QA(/api/v1/ai/qa)에 보낸다. 분석 대상이 없으면 QA를 시작조차 하지 않는다
  // (예전에는 데모용 목업 커밋으로 조용히 대체했었다).
  const runPhase1FromApi = async () => {
    const filesForQa: CommitFile[] = commitInfo?.diffFiles ?? [];
    const scanTargets = filesForQa.map((file) => file.path);

    setScanFiles([]);
    setScanCurrent(scanTargets[0] || "");

    let cancelled = false;
    const revealTimers: ReturnType<typeof setTimeout>[] = [];
    scanTargets.forEach((path, i) => {
      revealTimers.push(setTimeout(() => {
        if (cancelled) return;
        setScanCurrent(path);
        setScanFiles(prev => [...prev, path]);
      }, i * 260));
    });
    const revealMs = scanTargets.length * 260;

    const finishPhase1 = (errors: StaticError[]) => {
      cancelled = true;
      revealTimers.forEach(clearTimeout);
      setScanFiles(scanTargets);
      setScanCurrent("");
      setStaticErrors(errors);
      setPhase1Done(true);
      setPhase("phase2");
      setTimeout(() => void runRealTestPhase(), 400);
    };

    try {
      const diff = buildDiffFromCommitFiles(filesForQa);
      const response = await runAiQa({ projectId, diff });

      const errors = mapQaResponseToErrors(response, scanTargets);
      if (errors.length > 0) {
        toast.warning("AI QA 분석에서 확인할 항목이 발견되었습니다.");
      }
      // 파일 스캔 애니메이션이 너무 짧게 끝나지 않도록 최소 재생 시간을 보장한다.
      await new Promise(resolve => setTimeout(resolve, Math.max(0, revealMs - 260)));
      finishPhase1(errors);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI QA 분석에 실패했습니다.");
      finishPhase1([]);
    }
  };

  // ── Phase 2: 실제 자동화 테스트 실행 ──
  // "Server & Build" 탭과 동일한 연결(로컬/링크/SSH)로 실제 test 태스크를 실행한다.
  // 화면을 대신 조작해주는 AI는 없다 - 실제 존재하는 자동화 테스트 스위트를 그대로 돌리고
  // 진짜 종료 코드/로그를 보여준다.
  const runRealTestPhase = async () => {
    setTestRunning(true);
    setTestError(null);
    try {
      let result: BuildTaskExecutionResponse;
      if (connection.mode === "ssh") {
        const command = buildSshTaskCommand(connection.ssh.buildTool, "test");
        const started = Date.now();
        const sshResult = await sshExec(connectionKey, command);
        const combined = `${sshResult.stdout}${sshResult.stderr}`.split(/\r?\n/).filter(l => l.length > 0);
        result = {
          taskName: "test",
          command,
          status: sshResult.exitCode === 0 ? "SUCCESS" : "FAILED",
          exitCode: sshResult.exitCode,
          duration: `${((Date.now() - started) / 1000).toFixed(2)}s`,
          logs: combined.length > 0 ? combined : ["(No output produced)"],
          executedAt: new Date().toLocaleTimeString("en-GB"),
        };
      } else {
        const baseUrlOverride = connection.mode === "link" ? connection.linkBaseUrl : undefined;
        result = await executeBuildTask("test", projectId, baseUrlOverride);
      }
      setTestRun(result);
      if (result.status !== "SUCCESS") {
        toast.warning("자동화 테스트가 실패했습니다.");
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "테스트 실행에 실패했습니다.");
    } finally {
      setTestRunning(false);
      setPhase("done");
    }
  };

  // 계산값
  const elapsedSec    = (elapsed / 1000).toFixed(1);
  const criticalCount = staticErrors.filter(e => e.severity === "critical").length;
  const warningCount  = staticErrors.filter(e => e.severity === "warning").length;
  const testPassed    = testRun?.status === "SUCCESS";
  const filteredCommits = commitFilter === "all" ? commitReports : commitReports.filter(r => r.status === commitFilter);

  const SEV_COLOR: Record<Severity, { color: string; bg: string }> = {
    critical: { color: UI_RED, bg: "rgba(239,68,68,0.10)"  },
    warning:  { color: UI_AMBER, bg: "rgba(245,158,11,0.10)" },
    passed:   { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── 최상단 탭 바 (AI QA / QA Reports) ── */}
      <div
        className="flex items-center shrink-0 px-3 gap-1"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: BRIGHT_BEIGE,
          minHeight: 36,
        }}
      >
        <button
          onClick={() => setMainTab("qa")}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all"
          style={{
            color:        mainTab === "qa" ? ACCENT : TEXT_SECONDARY,
            background:   mainTab === "qa" ? "rgba(88,101,242,0.08)" : "transparent",
            borderBottom: mainTab === "qa" ? `2px solid ${ACCENT}` : "2px solid transparent",
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          AI QA
        </button>
        <button
          onClick={() => setMainTab("reports")}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all"
          style={{
            color:        mainTab === "reports" ? ACCENT : TEXT_SECONDARY,
            background:   mainTab === "reports" ? "rgba(88,101,242,0.08)" : "transparent",
            borderBottom: mainTab === "reports" ? `2px solid ${ACCENT}` : "2px solid transparent",
          }}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          QA Reports
        </button>
      </div>

      {/* ── QA Reports 탭 ── */}
      {mainTab === "reports" && <QAReportsPage projectId={projectId ?? 0} />}

      {/* ── AI QA 탭 ── */}
      {mainTab === "qa" && (
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: BRIGHT_BEIGE }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>AI QA Monitor</h1>
                
                {isLoading ? (
                  /* [스켈레톤] 헤더 상태 뱃지 영역 */
                  <Skeleton className="h-5 w-24 rounded-full" />
                ) : (
                  <>
                    {/* 실행 상태 뱃지 */}
                    {phase === "phase1" && (
                      <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:ACCENT_BG, color:ACCENT }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: ACCENT }} /> PHASE 1 · 코드 분석
                      </span>
                    )}
                    {phase === "phase2" && (
                      <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,0.10)", color:UI_AMBER }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /> PHASE 2 · 자동화 테스트
                      </span>
                    )}
                    {phase === "done" && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: (criticalCount > 0 || testRun?.status === "FAILED" || testError) ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)", color: (criticalCount > 0 || testRun?.status === "FAILED" || testError) ? UI_RED : "#10b981" }}>
                        {(criticalCount > 0 || testRun?.status === "FAILED" || testError) ? "FAILED" : "PASSED"}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* 커밋 작성자 정보 */}
              {isLoading ? (
                /* [스켈레톤] 커밋 작성자 정보 */
                <div className="flex items-center gap-2 mt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-48 rounded" />
                </div>
              ) : commitInfo ? (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:ACCENT_BG, border:`1px solid ${ACCENT_BORDER}` }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background:"rgba(112,130,56,0.10)" }}>
                      <span className="text-[7px] font-bold" style={{ color:ACCENT }}>{commitInfo.author[0]}</span>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color:ACCENT }}>{commitInfo.author}</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background:"rgba(0,0,0,0.05)", color:TEXT_SECONDARY }}>
                    {commitInfo.branch}
                  </span>
                  <span className="text-[10px] truncate" style={{ color:TEXT_SECONDARY, maxWidth:280 }}>{commitInfo.message}</span>
                </div>
              ) : null}

              {isLoading ? (
                <Skeleton className="h-3 w-40 mt-2" />
              ) : (
                <p className="text-[11px] mt-1" style={{ color:TEXT_TERTIARY }}>
                  {phase === "phase1" ? `파일 스캔 중… ${scanFiles.length}개 완료 · ${elapsedSec}s`
                  : phase === "phase2" ? `자동화 테스트 실행 중… ${elapsedSec}s`
                  : phase === "done"   ? `완료 — 코드 분석 오류 ${criticalCount + warningCount}건 · 테스트 ${testError ? "실행 실패" : testPassed ? "통과" : "실패"} · ${elapsedSec}s`
                  : hasQaTarget ? "QA를 시작하거나 커밋별 현황을 확인하세요"
                  : "Changes 페이지에서 변경사항을 스테이징하고 QA를 요청하면 여기서 실행됩니다"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isLoading ? (
                /* [스켈레톤] 우측 알림/액션 버튼 */
                <>
                  <Skeleton className="w-8 h-8 rounded-xl" />
                  <Skeleton className="w-20 h-8 rounded-lg" />
                </>
              ) : (
                <>
                  {phase === "done" && (
                    <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all" style={{ background:"rgba(255,255,255,0.80)", border:`1px solid ${BORDER}`, color:TEXT_SECONDARY }}>
                      <RotateCw className="w-3 h-3" /> 검사 초기화
                    </button>
                  )}
                  {activeTab === "run" && (
                    <button
                      onClick={startQA}
                      disabled={(phase !== "idle" && phase !== "done") || !hasQaTarget}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: (phase !== "idle" && phase !== "done") || !hasQaTarget ? "rgba(0,0,0,0.07)" : ACCENT,
                        color:      (phase !== "idle" && phase !== "done") || !hasQaTarget ? TEXT_TERTIARY : "rgba(255,255,255,0.95)",
                        boxShadow:  (phase !== "idle" && phase !== "done") || !hasQaTarget ? "none" : "0 4px 14px rgba(112,130,56,0.25)",
                        cursor:     (phase !== "idle" && phase !== "done") || !hasQaTarget ? "not-allowed" : "pointer",
                      }}
                    >
                      {phase !== "idle" && phase !== "done" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {phase !== "idle" && phase !== "done" ? "검사 진행 중…" : "AI QA 전체 검사 실행"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── 탭 ── */}
          <div className="flex rounded-xl overflow-hidden p-0.5 gap-0.5" style={{ background:"rgba(255,255,255,0.60)", border:`1px solid ${BORDER}` }}>
            {isLoading ? (
              /* [스켈레톤] 중앙 탭 메뉴 */
              <>
                <Skeleton className="flex-1 h-8 rounded-lg" />
                <Skeleton className="flex-1 h-8 rounded-lg" />
              </>
            ) : (
              [
                { id:"run",    label:"QA 실행",      icon:ShieldCheck },
                { id:"commit", label:"커밋별 QA",    icon:GitCommit   },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id ? "rgba(112,130,56,0.08)" : "transparent",
                    color:      activeTab === tab.id ? ACCENT : TEXT_SECONDARY,
                    boxShadow:  activeTab === tab.id ? "0 2px 8px rgba(112,130,56,0.12)" : "none",
                  }}
                >
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              ))
            )}
          </div>

          {/* ════ QA 실행 탭 ════ */}
          {activeTab === "run" && (
            <div className="space-y-4">

              {/* ── Phase 1: 코드 분석 ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)" }}>
                {isLoading ? (
                  /* [스켈레톤] Phase 1 패널 */
                  <>
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/5">
                      <Skeleton className="w-6 h-6 rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center py-8 gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center gap-2.5 px-4 py-3"
                      style={{ borderBottom:`1px solid ${BORDER_SUBTLE}`, background:"rgba(247,247,245,0.8)" }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: phase1Done ? "rgba(16,185,129,0.10)" : phase === "phase1" ? ACCENT_BG : "rgba(0,0,0,0.05)" }}
                      >
                        {phase === "phase1" ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color:ACCENT }} /> : phase1Done ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color:"#10b981" }} /> : <Code2 className="w-3.5 h-3.5" style={{ color:TEXT_TERTIARY }} />}
                      </div>
                      <p className="text-xs font-semibold" style={{ color:TEXT_PRIMARY }}>Phase 1 — 정적 코드 분석</p>
                      {phase === "phase1" && <span className="ml-auto text-[9px]" style={{ color:TEXT_TERTIARY }}>스캔 중… {scanFiles.length}개 파일</span>}
                      {phase1Done && (
                        <div className="ml-auto flex items-center gap-2">
                          {criticalCount > 0 && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(239,68,68,0.10)", color:UI_RED }}>{criticalCount} critical</span>}
                          {warningCount > 0  && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,0.10)", color:UI_AMBER }}>{warningCount} warning</span>}
                        </div>
                      )}
                    </div>

                    {/* 스캔 중: 파일 목록 */}
                    {(phase === "phase1" || phase1Done) && (
                      <div className="p-4 space-y-2">
                        {scanFiles.length === 0 && phase === "phase1" && (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color:ACCENT }} />
                            <p className="text-[11px]" style={{ color:TEXT_SECONDARY }}>파일 목록 수집 중…</p>
                          </div>
                        )}
                        {scanFiles.map((file) => {
                          const err = staticErrors.find(e => file.includes(e.file));
                          return (
                            <div key={file} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background:"rgba(0,0,0,0.025)", border:`1px solid ${BORDER_SUBTLE}` }}>
                              <FileCode className="w-3 h-3 shrink-0" style={{ color: err ? (err.severity === "critical" ? UI_RED : UI_AMBER) : "#10b981" }} />
                              <span className="flex-1 text-[10px] font-mono truncate" style={{ color:TEXT_PRIMARY }}>{file}</span>
                              {err ? (
                                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ background: SEV_COLOR[err.severity].bg, color: SEV_COLOR[err.severity].color }}>
                                  {err.severity}
                                </span>
                              ) : (
                                <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color:"#10b981" }} />
                              )}
                            </div>
                          );
                        })}
                        {phase === "phase1" && scanCurrent && (
                          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background:`${ACCENT}08`, border:`1px solid ${ACCENT}20` }}>
                            <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color:ACCENT }} />
                            <span className="text-[10px] font-mono" style={{ color:ACCENT }}>{scanCurrent}</span>
                          </div>
                        )}

                        {/* 오류 목록 */}
                        {staticErrors.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color:TEXT_LABEL }}>발견된 오류</p>
                            {staticErrors.map(err => {
                              const sc = SEV_COLOR[err.severity];
                              const EI = err.severity === "critical" ? XCircle : AlertTriangle;
                              return (
                                <div key={err.id} className="rounded-xl p-3" style={{ background:sc.bg, border:`1px solid ${sc.color}30` }}>
                                  <div className="flex items-start gap-2">
                                    <EI className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color:sc.color }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                        <span className="text-[10px] font-semibold" style={{ color:TEXT_PRIMARY }}>{err.type}</span>
                                        <span className="text-[9px] font-mono" style={{ color:TEXT_TERTIARY }}>{err.file}:{err.line}</span>
                                      </div>
                                      <p className="text-[10px]" style={{ color:TEXT_SECONDARY }}>{err.message}</p>
                                      {err.fix && (
                                        <div className="mt-1.5 px-2 py-1 rounded-lg" style={{ background:"rgba(0,0,0,0.05)" }}>
                                          <p className="text-[9px] font-mono" style={{ color:TEXT_TERTIARY }}>수정 제안: {err.fix}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {phase === "idle" && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Code2 className="w-8 h-8" style={{ color:"rgba(112,130,56,0.25)" }} />
                        <p className="text-[11px]" style={{ color:TEXT_TERTIARY }}>QA 시작 시 파일을 읽고 문법 오류, 런타임 오류를 분석합니다</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Phase 2: 실제 자동화 테스트 실행 ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)" }}>
                {isLoading ? (
                  /* [스켈레톤] Phase 2 패널 */
                  <>
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/5">
                      <Skeleton className="w-6 h-6 rounded-lg" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center py-8 gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center gap-2.5 px-4 py-3"
                      style={{ borderBottom:`1px solid ${BORDER_SUBTLE}`, background:"rgba(247,247,245,0.8)" }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: testRun?.status === "SUCCESS" ? "rgba(16,185,129,0.10)" : (testRun?.status === "FAILED" || testError) ? "rgba(239,68,68,0.10)" : (phase === "phase2" || testRunning) ? "rgba(245,158,11,0.10)" : "rgba(0,0,0,0.05)" }}
                      >
                        {(phase === "phase2" || testRunning) ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color:UI_AMBER }} />
                          : testRun?.status === "SUCCESS" ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color:"#10b981" }} />
                          : (testRun?.status === "FAILED" || testError) ? <XCircle className="w-3.5 h-3.5" style={{ color:UI_RED }} />
                          : <Monitor className="w-3.5 h-3.5" style={{ color:TEXT_TERTIARY }} />}
                      </div>
                      <p className="text-xs font-semibold" style={{ color:TEXT_PRIMARY }}>Phase 2 — 자동화 테스트 실행</p>
                      <p className="text-[9px] ml-1" style={{ color:TEXT_TERTIARY }}>
                        {connection.mode === "ssh" ? `SSH · ${connection.ssh.host || "미설정"}`
                          : connection.mode === "link" ? `원격 링크 · ${connection.linkBaseUrl || "미설정"}`
                          : "로컬 실행"}
                      </p>
                      {testRun && (
                        <div className="ml-auto flex items-center gap-2 text-[9px]">
                          <span style={{ color: testRun.status === "SUCCESS" ? "#10b981" : UI_RED }}>
                            {testRun.status === "SUCCESS" ? "PASS" : "FAIL"} · {testRun.duration}
                          </span>
                        </div>
                      )}
                    </div>

                    {(phase === "phase2" || testRunning || testRun || testError) ? (
                      <div className="p-4">
                        {testError ? (
                          <div className="rounded-xl p-4" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
                            <div className="flex items-center gap-2">
                              <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color:UI_RED }} />
                              <p className="text-[11px] font-semibold" style={{ color:UI_RED }}>테스트 실행 실패</p>
                            </div>
                            <p className="text-[10px] mt-1.5" style={{ color:TEXT_SECONDARY }}>{testError}</p>
                          </div>
                        ) : (phase === "phase2" || testRunning) ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color:UI_AMBER }} />
                            <p className="text-[11px]" style={{ color:TEXT_SECONDARY }}>
                              {connection.mode === "ssh" ? buildSshTaskCommand(connection.ssh.buildTool, "test") : "test 태스크"} 실행 중… {elapsedSec}s
                            </p>
                          </div>
                        ) : testRun && (
                          <div className="rounded-2xl overflow-hidden" style={{ background: TERM_BG, border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div
                              className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                              style={{ borderBottom: logsExpanded ? "1px solid rgba(255,255,255,0.06)" : "none", background: TERM_HEADER }}
                              onClick={() => setLogsExpanded(v => !v)}
                            >
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: TRAFFIC_RED }} />
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: TRAFFIC_YELLOW }} />
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: TRAFFIC_GREEN }} />
                              <span className="ml-2 text-[10px] font-mono" style={{ color: TERM_MUTED }}>{testRun.command}</span>
                              <span
                                className="ml-auto text-[9px] font-semibold"
                                style={{ color: testRun.status === "SUCCESS" ? TERM_GREEN : TERM_RED2 }}
                              >
                                exit {testRun.exitCode} · {testRun.executedAt}
                              </span>
                              {logsExpanded ? <ChevronUp className="w-3 h-3" style={{ color: TERM_MUTED }} /> : <ChevronDown className="w-3 h-3" style={{ color: TERM_MUTED }} />}
                            </div>
                            {logsExpanded && (
                              <div className="p-4 font-mono text-[10px] leading-relaxed overflow-y-auto select-text" style={{ maxHeight: 260, color: TERM_TEXT }}>
                                {testRun.logs.map((line, i) => {
                                  const isFail = line.includes("FAILED") || line.includes("FAILURE") || line.includes("ERROR") || line.startsWith("[ERROR]");
                                  const isSuccess = line.includes("SUCCESSFUL") || line.includes("PASSED") || line.includes("BUILD SUCCESS");
                                  const color = isFail ? TERM_RED2 : isSuccess ? TERM_GREEN : TERM_TEXT;
                                  return (
                                    <p key={i} style={{ color }} className="whitespace-pre-wrap break-all">
                                      {line || " "}
                                    </p>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Monitor className="w-8 h-8" style={{ color:"rgba(245,158,11,0.30)" }} />
                        <p className="text-[11px]" style={{ color:TEXT_TERTIARY }}>
                          {hasQaTarget ? "Phase 1 완료 후 실제 test 태스크가 여기서 실행됩니다" : "Changes 페이지에서 변경사항을 스테이징하고 QA를 요청하면 여기서 실행됩니다"}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════ 커밋별 QA 탭 ════ */}
          {activeTab === "commit" && (
            <div className="space-y-3">
              {commitReportsLoading ? (
                /* [스켈레톤] 커밋 통계 및 목록 */
                <>
                  <div className="grid grid-cols-4 gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/50 p-4 space-y-4">
                    <Skeleton className="h-6 w-32 mb-2" />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : commitReportsError ? (
                <div className="rounded-2xl p-6 text-center" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}` }}>
                  <p className="text-[11px]" style={{ color:UI_RED }}>{commitReportsError}</p>
                </div>
              ) : (
                <>
                  {/* 통계 */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {([["SUCCESS","성공",commitReports.filter(r=>r.status==="SUCCESS").length,"#10b981"],["FAILED","실패",commitReports.filter(r=>r.status==="FAILED").length,UI_RED],["RUNNING","진행중",commitReports.filter(r=>r.status==="RUNNING").length,UI_BLUE],["PENDING","대기",commitReports.filter(r=>r.status==="PENDING").length,"#9b9b9b"]] as const).map(([status,label,count,color]) => (
                      <button
                        key={status}
                        onClick={() => setCommitFilter(commitFilter === status ? "all" : status)}
                        className="rounded-xl p-3 text-left transition-all"
                        style={{
                          background: commitFilter === status ? `${color}12` : "rgba(255,255,255,0.80)",
                          border:     `1px solid ${commitFilter === status ? color + "40" : BORDER}`,
                        }}
                      >
                        <p className="text-xl font-bold" style={{ color }}>{count}</p>
                        <p className="text-[9px]" style={{ color:TEXT_LABEL }}>{label}</p>
                      </button>
                    ))}
                  </div>

                  {/* 커밋 목록 */}
                  <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)" }}>
                    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:`1px solid ${BORDER_SUBTLE}`, background:"rgba(247,247,245,0.8)" }}>
                      <GitCommit className="w-3.5 h-3.5" style={{ color:ACCENT }} />
                      <p className="text-xs font-semibold" style={{ color:TEXT_PRIMARY }}>커밋별 QA 현황</p>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:ACCENT_BG, color:ACCENT }}>{filteredCommits.length}</span>
                    </div>
                    {filteredCommits.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[10px]" style={{ color:TEXT_TERTIARY }}>표시할 QA 리포트가 없습니다.</p>
                    ) : (
                      filteredCommits.map(r => (
                        <CommitQARow
                          key={r.qaReportId}
                          projectId={projectId ?? 0}
                          report={r}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
      </div>
      )}
    </div>
  );
}
