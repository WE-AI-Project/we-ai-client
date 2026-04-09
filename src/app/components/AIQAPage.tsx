import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Bot, Server, Monitor, Cpu, Play, RotateCw,
  FileCode, AlertCircle, GitCommit, Clock, ChevronDown,
  ChevronUp, Hash, User, Calendar, MousePointer, Video,
  Bell, Eye, Code2, Zap, Film, X, Volume2,
} from "lucide-react";
import { getPendingQA, clearPendingQA } from "../data/qaStore";
import { getLeader, getAllLeaders } from "../data/projectSettingsStore";
import { AgentControlPage } from "./AgentControlPage";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, GRADIENT_PAGE, GRADIENT_ORB_1,
  GRADIENT_SIDEBAR, SIDEBAR_BORDER,
} from "../colors";

// ── 타입 ──
type Severity   = "critical" | "warning" | "passed";
type TestStatus = "waiting" | "running" | "passed" | "failed";
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

type UIAction = {
  id:        string;
  step:      number;
  label:     string;
  element:   string;
  status:    "pending" | "running" | "passed" | "failed";
  error?:    string;
  clip?:     UIClip;
};

type UIClip = {
  id:         string;
  thumbnail:  string;   // data URL or placeholder
  duration:   string;
  errorLabel: string;
  ts:         string;
};

type Notification = {
  id:        string;
  to:        string;    // 파트장 이름
  dept:      string;
  message:   string;
  time:      string;
  read:      boolean;
  severity:  Severity;
};

// ── 커밋 QA 상태 ──
type CommitQAStatus = "passed" | "failed" | "partial" | "pending" | "skipped";
type CommitQAResult = {
  id: string; hash: string; message: string; author: string;
  date: string; branch: string; qaStatus: CommitQAStatus;
  parts: { name: string; status: CommitQAStatus; tests: number; passed: number; failed: number; note?: string }[];
};

const COMMIT_QA_DATA: CommitQAResult[] = [
  {
    id:"c1", hash:"a3f9d21", message:"Refactored Multi-Agent communication logic",
    author:"병권", date:"2025-03-31 14:22", branch:"feat/multi-agent",
    qaStatus:"failed",
    parts:[
      { name:"Backend (Java/Spring)", status:"failed",  tests:8,  passed:6,  failed:2, note:"ParserAgent NullPointerException" },
      { name:"Frontend (React/TS)",   status:"passed",  tests:5,  passed:5,  failed:0 },
      { name:"Agent Integration",     status:"partial", tests:4,  passed:3,  failed:1, note:"DataSync ↔ Classifier handshake 타임아웃" },
    ],
  },
  {
    id:"c2", hash:"b7c3e18", message:"Fixed JDK 17 toolchain issue in settings.gradle",
    author:"병권", date:"2025-03-31 11:05", branch:"fix/toolchain",
    qaStatus:"passed",
    parts:[
      { name:"Backend (Java/Spring)", status:"passed", tests:8, passed:8, failed:0 },
      { name:"Frontend (React/TS)",   status:"passed", tests:5, passed:5, failed:0 },
      { name:"Agent Integration",     status:"passed", tests:4, passed:4, failed:0 },
    ],
  },
  {
    id:"c3", hash:"d2a1f45", message:"Added DataSyncAgent retry mechanism",
    author:"병권", date:"2025-03-30 19:47", branch:"feat/agent-retry",
    qaStatus:"passed",
    parts:[
      { name:"Backend (Java/Spring)", status:"passed",  tests:12, passed:12, failed:0 },
      { name:"Frontend (React/TS)",   status:"skipped", tests:0,  passed:0,  failed:0, note:"해당 없음" },
      { name:"Agent Integration",     status:"passed",  tests:6,  passed:6,  failed:0 },
    ],
  },
  {
    id:"c4", hash:"e5b8c72", message:"Updated AgentScheduler queue flush logic",
    author:"병권", date:"2025-03-30 15:30", branch:"fix/scheduler",
    qaStatus:"partial",
    parts:[
      { name:"Backend (Java/Spring)", status:"partial", tests:6, passed:4, failed:2, note:"ConcurrentModificationException (risk)" },
      { name:"Frontend (React/TS)",   status:"passed",  tests:3, passed:3, failed:0 },
      { name:"Agent Integration",     status:"skipped", tests:0, passed:0, failed:0, note:"스케줄러 격리 테스트 미완성" },
    ],
  },
  {
    id:"c5", hash:"f1d7a09", message:"Initial project setup — Spring Boot 3.2.5",
    author:"병권", date:"2025-03-29 10:00", branch:"main",
    qaStatus:"passed",
    parts:[
      { name:"Backend (Java/Spring)", status:"passed", tests:4, passed:4, failed:0 },
      { name:"Frontend (React/TS)",   status:"passed", tests:4, passed:4, failed:0 },
      { name:"Agent Integration",     status:"passed", tests:2, passed:2, failed:0 },
    ],
  },
];

const QA_STATUS_META: Record<CommitQAStatus, { color: string; bg: string; label: string; icon: any }> = {
  passed:  { color:"#10b981", bg:"rgba(16,185,129,0.10)",  label:"Passed",  icon:CheckCircle2  },
  failed:  { color:"#ef4444", bg:"rgba(239,68,68,0.10)",   label:"Failed",  icon:XCircle       },
  partial: { color:"#f59e0b", bg:"rgba(245,158,11,0.10)",  label:"Partial", icon:AlertTriangle },
  pending: { color:"#9b9b9b", bg:"rgba(0,0,0,0.06)",       label:"Pending", icon:Clock         },
  skipped: { color:"#7d7f5b", bg:"rgba(125,127,91,0.10)",  label:"Skipped", icon:ChevronDown   },
};

// ── Phase 1 더미 정적 분석 결과 ──
const STATIC_ERRORS: StaticError[] = [
  { id:"se1", file:"ParserAgent.java",           line:87,  col:12, type:"NullPointerException",          severity:"critical", message:"response 객체가 null일 수 있습니다. null 체크 추가 필요",              fix:"if (response != null) { ... }" },
  { id:"se2", file:"MultiAgentController.java",  line:42,  col:5,  type:"ConcurrentModificationException",severity:"warning",  message:"agentRegistry에 동기화 없이 접근 — synchronized 블록 필요",            fix:"synchronized(agentRegistry) { ... }" },
  { id:"se3", file:"apiClient.ts",               line:13,  col:3,  type:"UnhandledRejection",             severity:"warning",  message:"fetch() 오류가 catch되지 않음 — .catch() 또는 try/catch 블록 필요",  fix:"try { await fetch(...) } catch(e) { ... }" },
  { id:"se4", file:"DataSyncAgent.java",         line:204, col:8,  type:"PotentialMemoryLeak",            severity:"warning",  message:"ExecutorService가 종료되지 않을 수 있음 — shutdown() 호출 누락",       fix:"executor.shutdown();" },
  { id:"se5", file:"AgentScheduler.java",        line:118, col:22, type:"DeadlockRisk",                   severity:"critical", message:"중첩 synchronized 블록에서 데드락 위험 감지됨",                          fix:"Lock ordering 패턴 적용 필요" },
];

// ── Phase 2 UI 액션 시나리오 ──
const UI_ACTIONS: UIAction[] = [
  { id:"a1", step:1,  label:"앱 초기 로딩 확인",          element:"<App />",                   status:"pending" },
  { id:"a2", step:2,  label:"대시보드 렌더링 검사",         element:"<DashboardPage />",         status:"pending" },
  { id:"a3", step:3,  label:"사이드바 네비게이션 클릭",     element:"<NavBtn id='Changes' />",   status:"pending" },
  { id:"a4", step:4,  label:"Changes 페이지 파일 목록",     element:"<FileRow />",              status:"pending" },
  { id:"a5", step:5,  label:"파일 클릭 → Diff 뷰어",       element:"<FileDiffViewer />",        status:"pending" },
  { id:"a6", step:6,  label:"커밋 메시지 입력 필드",        element:"<textarea#commitMsg />",    status:"pending" },
  { id:"a7", step:7,  label:"Agent Control 페이지 이동",    element:"<AgentControlPage />",      status:"pending" },
  { id:"a8", step:8,  label:"에이전트 토글 버튼 동작",      element:"<AgentToggle />",           status:"pending", error:"Toggle state not updated after click — state mutation issue detected", clip: { id:"clip1", thumbnail:"", duration:"0:03", errorLabel:"에이전트 토글 오작동", ts:"14:22:07" } },
  { id:"a9", step:9,  label:"환경 변수 설정 페이지",        element:"<EnvironmentSettingsPage />",status:"pending" },
  { id:"a10",step:10, label:"Build 관리 페이지 이동",       element:"<BuildManagementPage />",   status:"pending" },
  { id:"a11",step:11, label:"채팅 페이지 메시지 전송",      element:"<ChatPage send />",         status:"pending" },
  { id:"a12",step:12, label:"QA 결과 페이지 로딩 완료",     element:"<AIQAPage />",              status:"pending" },
];

// ── UI 클립 Canvas 썸네일 ──
function ClipThumbnail({ clip, onClick }: { clip: UIClip; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    if (!ctx)    return;

    // 시뮬레이션 화면 그리기
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, 180, 100);

    // UI 요소 모의
    ctx.fillStyle = "#161b22";
    ctx.roundRect(8, 8, 164, 12, 3); ctx.fill();
    ctx.fillStyle = "#21262d";
    ctx.roundRect(8, 26, 80, 60, 4); ctx.fill();
    ctx.fillStyle = "#21262d";
    ctx.roundRect(96, 26, 76, 28, 4); ctx.fill();
    ctx.fillStyle = "#21262d";
    ctx.roundRect(96, 58, 76, 28, 4); ctx.fill();

    // 빨간 오류 하이라이트
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth   = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(96, 58, 76, 28);

    // 오류 느낌표
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(160, 44, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font      = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("!", 160, 48);

    // 커서
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(110, 70); ctx.lineTo(110, 82); ctx.lineTo(113, 79);
    ctx.lineTo(115, 84); ctx.lineTo(117, 83); ctx.lineTo(115, 78);
    ctx.lineTo(119, 78); ctx.closePath(); ctx.fill();

    // REC 도트
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(15, 15, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.font      = "7px monospace";
    ctx.textAlign = "left";
    ctx.fillText("REC", 22, 18);
    ctx.fillStyle = "#8b949e";
    ctx.fillText(clip.duration, 150, 18);
  }, [clip]);

  return (
    <button
      onClick={onClick}
      className="relative rounded-xl overflow-hidden group transition-all"
      style={{ width: 180, height: 100, boxShadow: "0 4px 16px rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.30)" }}
    >
      <canvas ref={canvasRef} width={180} height={100} />
      {/* 플레이 버튼 오버레이 */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: "rgba(0,0,0,0.45)" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.80)" }}>
          <Film className="w-5 h-5 text-white" />
        </div>
      </div>
    </button>
  );
}

// ── 클립 재생 모달 ──
function ClipModal({ clip, action, onClose }: { clip: UIClip; action: UIAction; onClose: () => void }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef(0);
  const animRef     = useRef<number>(0);
  const [playing,   setPlaying]   = useState(true);
  const [progress,  setProgress]  = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    if (!ctx)    return;

    let frame = 0;
    const totalFrames = 90; // ~3초 at 30fps

    const draw = () => {
      frame = (frame + 1) % totalFrames;
      frameRef.current = frame;
      setProgress(frame / totalFrames);

      const t = frame / totalFrames;

      // 배경
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, 520, 300);

      // 네비게이션 바
      ctx.fillStyle = "#161b22";
      ctx.fillRect(0, 0, 520, 36);
      ctx.fillStyle = "#30363d";
      ctx.fillRect(16, 12, 120, 12); // 로고
      ctx.fillRect(160, 12, 80, 12);
      ctx.fillRect(260, 12, 60, 12);

      // 사이드바
      ctx.fillStyle = "#161b22";
      ctx.fillRect(0, 36, 52, 264);

      // 메인 컨텐츠
      ctx.fillStyle = "#21262d";
      ctx.roundRect(68, 52, 200, 110, 6); ctx.fill();
      ctx.fillStyle = "#21262d";
      ctx.roundRect(68, 172, 200, 90, 6); ctx.fill();
      ctx.fillStyle = "#21262d";
      ctx.roundRect(280, 52, 220, 210, 6); ctx.fill();

      // 에이전트 토글 버튼 (오류 요소)
      const toggleX = 288;
      const toggleY = 140;
      const pulse   = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;

      ctx.fillStyle = frame < 30 ? "#10b981" : "#ef4444";
      ctx.roundRect(toggleX, toggleY, 44, 20, 10); ctx.fill();

      // 오류 하이라이트
      if (frame >= 28) {
        ctx.strokeStyle = `rgba(239,68,68,${0.4 + pulse * 0.6})`;
        ctx.lineWidth   = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(toggleX - 6, toggleY - 6, 56, 32);
        ctx.setLineDash([]);

        // 오류 말풍선
        if (frame >= 35) {
          ctx.fillStyle = "rgba(239,68,68,0.90)";
          ctx.roundRect(toggleX - 40, toggleY - 44, 180, 32, 6); ctx.fill();
          ctx.fillStyle = "white";
          ctx.font      = "9px -apple-system, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Toggle state not updated!", toggleX - 34, toggleY - 24);
          ctx.fillText("State mutation issue detected", toggleX - 34, toggleY - 13);
        }
      }

      // 커서 이동 애니메이션
      const cursorX = 68 + t * 260;
      const cursorY = frame < 40 ? 100 + t * 40 : toggleY + 10;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorY);
      ctx.lineTo(cursorX, cursorY + 14); ctx.lineTo(cursorX + 4, cursorY + 11);
      ctx.lineTo(cursorX + 6, cursorY + 15); ctx.lineTo(cursorX + 8, cursorY + 14);
      ctx.lineTo(cursorX + 6, cursorY + 10); ctx.lineTo(cursorX + 10, cursorY + 10);
      ctx.closePath(); ctx.fill();

      // REC 표시
      const recAlpha = Math.sin(t * Math.PI * 4) > 0 ? 1 : 0.4;
      ctx.fillStyle  = `rgba(239,68,68,${recAlpha})`;
      ctx.beginPath(); ctx.arc(16, 16, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle  = "#ef4444";
      ctx.font       = "bold 8px monospace";
      ctx.textAlign  = "left";
      ctx.fillText("REC", 26, 20);

      // 타임코드
      ctx.fillStyle  = "rgba(255,255,255,0.5)";
      ctx.font       = "8px monospace";
      ctx.textAlign  = "right";
      ctx.fillText(`00:0${Math.floor(frame / 30)}.${(frame % 30).toString().padStart(2,"0")}`, 508, 20);

      if (playing) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ maxWidth: 580, width: "100%", background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}
        >
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[11px] font-semibold" style={{ color: "#c9d1d9" }}>
            오류 영상 — {clip.errorLabel}
          </span>
          <span className="text-[9px] ml-1" style={{ color: "#484f58" }}>{clip.ts}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            {action.element}
          </span>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06]">
            <X className="w-4 h-4" style={{ color: "#8b949e" }} />
          </button>
        </div>

        {/* 캔버스 */}
        <div className="relative">
          <canvas ref={canvasRef} width={520} height={300} className="w-full" />

          {/* 컨트롤 바 */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-2"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}
          >
            <button
              onClick={() => setPlaying(p => !p)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {playing
                ? <span className="flex gap-0.5"><span className="w-1 h-3.5 bg-white rounded-full" /><span className="w-1 h-3.5 bg-white rounded-full" /></span>
                : <Film className="w-3.5 h-3.5 text-white" />
              }
            </button>
            {/* 진행 바 */}
            <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full rounded-full bg-red-400" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.60)" }}>{clip.duration}</span>
          </div>
        </div>

        {/* 에러 상세 */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
            <p className="text-[11px] leading-snug" style={{ color: "#c9d1d9" }}>{action.error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CommitQARow ──
function CommitQARow({ commit }: { commit: CommitQAResult }) {
  const [expanded, setExpanded] = useState(false);
  const sm    = QA_STATUS_META[commit.qaStatus];
  const Icon  = sm.icon;
  const total = commit.parts.reduce((a,p) => a + p.tests,  0);
  const pass  = commit.parts.reduce((a,p) => a + p.passed, 0);

  return (
    <div style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: sm.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background:"rgba(0,0,0,0.05)", color:ACCENT }}>
              #{commit.hash}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:ACCENT_BG, color:TEXT_SECONDARY }}>
              {commit.branch}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color:TEXT_PRIMARY }}>{commit.message}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[9px]" style={{ color:TEXT_TERTIARY }}>
            <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{commit.author}</span>
            <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{commit.date}</span>
            {total > 0 && <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" />{pass}/{total}</span>}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {commit.parts.map(p => {
            const psm = QA_STATUS_META[p.status]; const PI = psm.icon;
            return (
              <div key={p.name} className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background:psm.bg }} title={p.name}>
                <PI className="w-2.5 h-2.5" style={{ color:psm.color }} />
              </div>
            );
          })}
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
          <div className="pt-3 space-y-2">
            {commit.parts.map(part => {
              const psm = QA_STATUS_META[part.status]; const pct = part.tests > 0 ? Math.round((part.passed / part.tests)*100) : 0; const PI = psm.icon;
              return (
                <div key={part.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.60)", border:`1px solid ${BORDER}` }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background:psm.bg }}>
                    <PI className="w-3 h-3" style={{ color:psm.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color:TEXT_PRIMARY }}>{part.name}</p>
                    {part.note && <p className="text-[9px] mt-0.5" style={{ color:TEXT_TERTIARY }}>{part.note}</p>}
                    {part.tests > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:"rgba(0,0,0,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:part.failed>0?"linear-gradient(90deg,#10b981,#ef4444)":"#10b981" }} />
                        </div>
                        <span className="text-[9px] shrink-0 font-mono" style={{ color:TEXT_TERTIARY }}>{part.passed}/{part.tests}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] shrink-0">
                    {part.tests > 0 && <><span style={{ color:"#10b981" }}>✓{part.passed}</span>{part.failed>0&&<span style={{ color:"#ef4444" }}>✗{part.failed}</span>}</>}
                    <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ background:psm.bg, color:psm.color }}>{psm.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// 메인 AIQAPage
// ════════════════════════════════════════
export function AIQAPage({ autoStart = false }: { autoStart?: boolean }) {
  // ── 최상단 탭: AI QA / Agent Control ──
  const [mainTab,      setMainTab]      = useState<"qa" | "agents">("qa");
  const [activeTab,    setActiveTab]    = useState<"run" | "commit">("run");
  const [phase,        setPhase]        = useState<QAPhase>("idle");
  const [elapsed,      setElapsed]      = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 커밋 정보 ──
  const pendingQA  = getPendingQA();
  const [commitInfo] = useState(pendingQA);
  useEffect(() => { clearPendingQA(); }, []);

  // ── Phase 1: 정적 분석 ──
  const [scanFiles,    setScanFiles]    = useState<string[]>([]);
  const [scanCurrent,  setScanCurrent]  = useState<string>("");
  const [staticErrors, setStaticErrors] = useState<StaticError[]>([]);
  const [phase1Done,   setPhase1Done]   = useState(false);

  // ── Phase 2: UI 테스트 ──
  const [actions,      setActions]      = useState<UIAction[]>(UI_ACTIONS.map(a => ({ ...a })));
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [clips,        setClips]        = useState<UIClip[]>([]);
  const [phase2Done,   setPhase2Done]   = useState(false);
  const [openClip,     setOpenClip]     = useState<{ clip: UIClip; action: UIAction } | null>(null);

  // ── 알림 ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif,     setShowNotif]      = useState(false);

  // ── 커밋 탭 필터 ──
  const [commitFilter, setCommitFilter] = useState<CommitQAStatus | "all">("all");

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
    if (autoStart) setTimeout(() => startQA(), 400);
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications(prev => [{
      ...n, id: Math.random().toString(36).slice(2), time: new Date().toLocaleTimeString("ko-KR"), read: false,
    }, ...prev]);
  }, []);

  // ── QA 시작 ──
  const startQA = () => {
    if (phase !== "idle" && phase !== "done") return;
    setPhase("phase1");
    setElapsed(0);
    setScanFiles([]);
    setScanCurrent("");
    setStaticErrors([]);
    setPhase1Done(false);
    setActions(UI_ACTIONS.map(a => ({ ...a, status: "pending" })));
    setClips([]);
    setPhase2Done(false);
    setNotifications([]);
    runPhase1();
  };

  const reset = () => {
    setPhase("idle");
    setElapsed(0);
    setScanFiles([]);
    setScanCurrent("");
    setStaticErrors([]);
    setPhase1Done(false);
    setActions(UI_ACTIONS.map(a => ({ ...a, status: "pending" })));
    setClips([]);
    setPhase2Done(false);
    setNotifications([]);
  };

  // ── Phase 1: 정적 분석 시뮬레이션 ──
  const runPhase1 = () => {
    const FILES = [
      "src/main/java/com/weai/agent/ParserAgent.java",
      "src/main/java/com/weai/controller/MultiAgentController.java",
      "src/main/java/com/weai/agent/DataSyncAgent.java",
      "src/main/java/com/weai/scheduler/AgentScheduler.java",
      "src/main/resources/application-dev.yml",
      "src/api/apiClient.ts",
      "src/app/components/AgentControlPage.tsx",
      "build.gradle",
      "settings.gradle",
    ];

    let delay = 0;
    FILES.forEach((file, i) => {
      setTimeout(() => {
        setScanCurrent(file);
        setScanFiles(prev => [...prev, file]);
        // 오류 발견 시뮬레이션
        const err = STATIC_ERRORS.find(e => file.includes(e.file));
        if (err) {
          setTimeout(() => {
            setStaticErrors(prev => prev.some(e => e.id === err.id) ? prev : [...prev, err]);
          }, 400);
        }
      }, delay);
      delay += 320 + Math.random() * 200;
    });

    // Phase 1 완료 → Phase 2 시작
    setTimeout(() => {
      setScanCurrent("");
      setPhase1Done(true);
      setPhase("phase2");
      // Backend 파트장에게 알림
      const leader = getLeader("Backend");
      if (leader) {
        addNotification({
          to: leader.name, dept: "Backend",
          message: "Phase 1 코드 분석 완료 — Critical 오류 2건, Warning 3건 발견",
          severity: "critical",
        });
      }
      setTimeout(() => runPhase2(), 600);
    }, delay + 800);
  };

  // ── Phase 2: UI 에이전트 테스트 시뮬레이션 ──
  const runPhase2 = () => {
    let delay = 0;
    UI_ACTIONS.forEach((action, i) => {
      setTimeout(() => {
        setActiveAction(action.id);
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: "running" } : a));
      }, delay);

      const duration = 700 + Math.random() * 400;
      setTimeout(() => {
        const hasFail = !!action.error;
        setActions(prev => prev.map(a =>
          a.id === action.id ? { ...a, status: hasFail ? "failed" : "passed" } : a
        ));
        setActiveAction(null);

        if (hasFail && action.clip) {
          const clip: UIClip = { ...action.clip };
          setClips(prev => [...prev, clip]);
          // 관련 파트장에게 알림
          const leader = getLeader("Frontend");
          if (leader) {
            addNotification({
              to: leader.name, dept: "Frontend",
              message: `UI 테스트 오류 발생 — "${action.label}" 단계에서 오류 감지. 영상 클립 저장됨.`,
              severity: "critical",
            });
          }
        }
      }, delay + duration);

      delay += duration + 200;
    });

    // Phase 2 완료
    setTimeout(() => {
      setPhase2Done(true);
      setPhase("done");
    }, delay + 600);
  };

  // 계산값
  const elapsedSec    = (elapsed / 1000).toFixed(1);
  const criticalCount = staticErrors.filter(e => e.severity === "critical").length;
  const warningCount  = staticErrors.filter(e => e.severity === "warning").length;
  const passedActions = actions.filter(a => a.status === "passed").length;
  const failedActions = actions.filter(a => a.status === "failed").length;
  const unreadNotif   = notifications.filter(n => !n.read).length;
  const filteredCommits = commitFilter === "all" ? COMMIT_QA_DATA : COMMIT_QA_DATA.filter(c => c.qaStatus === commitFilter);

  const SEV_COLOR: Record<Severity, { color: string; bg: string }> = {
    critical: { color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
    warning:  { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
    passed:   { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── 최상단 탭 바 (AI QA / Agent Control) ── */}
      <div
        className="flex items-center shrink-0 px-3 gap-1"
        style={{
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
          background: GRADIENT_SIDEBAR,
          minHeight: 36,
        }}
      >
        <button
          onClick={() => setMainTab("qa")}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all"
          style={{
            color:        mainTab === "qa" ? "rgba(254,252,245,0.95)" : "rgba(154,155,114,0.85)",
            background:   mainTab === "qa" ? "rgba(174,183,132,0.18)" : "transparent",
            borderBottom: mainTab === "qa" ? "2px solid #AEB784"      : "2px solid transparent",
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          AI QA
        </button>
        <button
          onClick={() => setMainTab("agents")}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all"
          style={{
            color:        mainTab === "agents" ? "rgba(254,252,245,0.95)" : "rgba(154,155,114,0.85)",
            background:   mainTab === "agents" ? "rgba(174,183,132,0.18)" : "transparent",
            borderBottom: mainTab === "agents" ? "2px solid #AEB784"      : "2px solid transparent",
          }}
        >
          <Bot className="w-3.5 h-3.5" />
          Agent Control
        </button>
      </div>

      {/* ── Agent Control 탭 ── */}
      {mainTab === "agents" && <AgentControlPage />}

      {/* ── AI QA 탭 ── */}
      {mainTab === "qa" && (
      <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:"45%", height:"45%", borderRadius:"50%", background: GRADIENT_ORB_1, filter:"blur(50px)" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:"50%", height:"50%", borderRadius:"50%", background:"radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter:"blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>AI QA Monitor</h1>
                {/* 실행 상태 뱃지 */}
                {phase === "phase1" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:ACCENT_BG, color:ACCENT }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: ACCENT }} /> PHASE 1 · 코드 분석
                  </span>
                )}
                {phase === "phase2" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,0.10)", color:"#f59e0b" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /> PHASE 2 · UI 에이전트
                  </span>
                )}
                {phase === "done" && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: criticalCount > 0 ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)", color: criticalCount > 0 ? "#ef4444" : "#10b981" }}>
                    {criticalCount > 0 ? "FAILED" : "PASSED"}
                  </span>
                )}
              </div>

              {/* 커밋 작성자 정보 */}
              {commitInfo && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:ACCENT_BG, border:`1px solid ${ACCENT_BORDER}` }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background:"rgba(65,67,27,0.10)" }}>
                      <span className="text-[7px] font-bold" style={{ color:ACCENT }}>{commitInfo.author[0]}</span>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color:ACCENT }}>{commitInfo.author}</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background:"rgba(0,0,0,0.05)", color:TEXT_SECONDARY }}>
                    {commitInfo.branch}
                  </span>
                  <span className="text-[10px] truncate" style={{ color:TEXT_SECONDARY, maxWidth:280 }}>{commitInfo.message}</span>
                </div>
              )}

              <p className="text-[11px] mt-1" style={{ color:TEXT_TERTIARY }}>
                {phase === "phase1" ? `파일 스캔 중… ${scanFiles.length}개 완료 · ${elapsedSec}s`
                : phase === "phase2" ? `UI 에이전트 테스트 ${passedActions + failedActions}/${actions.length} · ${elapsedSec}s`
                : phase === "done"   ? `완료 — 오류 ${criticalCount + warningCount}건 · UI 오류 ${failedActions}건 · ${elapsedSec}s`
                : "QA를 시작하거나 커밋별 현황을 확인하세요"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 알림 버튼 */}
              <div className="relative">
                <button
                  onClick={() => setShowNotif(s => !s)}
                  className="p-2 rounded-xl transition-all"
                  style={{ background: unreadNotif > 0 ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.80)", border:`1px solid ${BORDER}` }}
                >
                  <Bell className="w-4 h-4" style={{ color: unreadNotif > 0 ? "#ef4444" : TEXT_SECONDARY }} />
                </button>
                {unreadNotif > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                    style={{ background:"#ef4444", color:"white" }}
                  >
                    {unreadNotif}
                  </span>
                )}
              </div>

              {phase === "done" && (
                <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all" style={{ background:"rgba(255,255,255,0.80)", border:`1px solid ${BORDER}`, color:TEXT_SECONDARY }}>
                  <RotateCw className="w-3 h-3" /> Reset
                </button>
              )}
              {activeTab === "run" && (
                <button
                  onClick={startQA}
                  disabled={phase !== "idle" && phase !== "done"}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: phase !== "idle" && phase !== "done" ? "rgba(0,0,0,0.07)" : ACCENT,
                    color:      phase !== "idle" && phase !== "done" ? TEXT_TERTIARY : "rgba(255,255,255,0.95)",
                    boxShadow:  phase !== "idle" && phase !== "done" ? "none" : "0 4px 14px rgba(65,67,27,0.25)",
                    cursor:     phase !== "idle" && phase !== "done" ? "not-allowed" : "pointer",
                  }}
                >
                  {phase !== "idle" && phase !== "done" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {phase !== "idle" && phase !== "done" ? "Running…" : "Run QA"}
                </button>
              )}
            </div>
          </div>

          {/* ── 알림 드롭다운 ── */}
          {showNotif && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background:"rgba(255,255,255,0.95)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)", boxShadow:"0 12px 36px rgba(0,0,0,0.12)" }}
            >
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom:`1px solid ${BORDER_SUBTLE}` }}>
                <Bell className="w-3.5 h-3.5" style={{ color:ACCENT }} />
                <p className="text-xs font-semibold" style={{ color:TEXT_PRIMARY }}>파트장 알림</p>
                <button
                  onClick={() => { setNotifications(n => n.map(x => ({ ...x, read:true }))); setShowNotif(false); }}
                  className="ml-auto text-[9px] px-2 py-0.5 rounded-full" style={{ background:"rgba(0,0,0,0.05)", color:TEXT_TERTIARY }}
                >
                  모두 읽음
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="py-8 text-center"><p className="text-[11px]" style={{ color:TEXT_TERTIARY }}>알림 없음</p></div>
              ) : (
                <div>
                  {notifications.map(n => {
                    const sc = SEV_COLOR[n.severity];
                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3"
                        style={{
                          borderBottom:`1px solid ${BORDER_SUBTLE}`,
                          background: n.read ? "transparent" : ACCENT_BG,
                        }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background:"rgba(65,67,27,0.10)" }}>
                          <span className="text-[10px] font-bold" style={{ color:ACCENT }}>{n.to[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold" style={{ color:TEXT_PRIMARY }}>{n.to}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background:sc.bg, color:sc.color }}>{n.dept} 파트장</span>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />}
                          </div>
                          <p className="text-[10px] mt-0.5 leading-snug" style={{ color:TEXT_SECONDARY }}>{n.message}</p>
                          <p className="text-[8px] mt-0.5" style={{ color:TEXT_TERTIARY }}>{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 탭 ── */}
          <div className="flex rounded-xl overflow-hidden p-0.5 gap-0.5" style={{ background:"rgba(255,255,255,0.60)", border:`1px solid ${BORDER}` }}>
            {[
              { id:"run",    label:"QA 실행",      icon:ShieldCheck },
              { id:"commit", label:"커밋별 QA",    icon:GitCommit   },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? "rgba(65,67,27,0.08)" : "transparent",
                  color:      activeTab === tab.id ? ACCENT : TEXT_SECONDARY,
                  boxShadow:  activeTab === tab.id ? "0 2px 8px rgba(65,67,27,0.12)" : "none",
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* ════ QA 실행 탭 ════ */}
          {activeTab === "run" && (
            <div className="space-y-4">

              {/* ── Phase 1: 코드 분석 ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)" }}>
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
                      {criticalCount > 0 && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(239,68,68,0.10)", color:"#ef4444" }}>{criticalCount} critical</span>}
                      {warningCount > 0  && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,0.10)", color:"#f59e0b" }}>{warningCount} warning</span>}
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
                    {scanFiles.map((file, i) => {
                      const err = staticErrors.find(e => file.includes(e.file));
                      return (
                        <div key={file} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background:"rgba(0,0,0,0.025)", border:`1px solid ${BORDER_SUBTLE}` }}>
                          <FileCode className="w-3 h-3 shrink-0" style={{ color: err ? (err.severity === "critical" ? "#ef4444" : "#f59e0b") : "#10b981" }} />
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
                                      <p className="text-[9px] font-mono" style={{ color:TEXT_TERTIARY }}>💡 수정 제안: {err.fix}</p>
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
                    <Code2 className="w-8 h-8" style={{ color:"rgba(65,67,27,0.25)" }} />
                    <p className="text-[11px]" style={{ color:TEXT_TERTIARY }}>QA 시작 시 파일을 읽고 문법 오류, 런타임 오류를 분석합니다</p>
                  </div>
                )}
              </div>

              {/* ── Phase 2: UI 에이전트 ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.82)", border:`1px solid ${BORDER}`, backdropFilter:"blur(12px)" }}>
                <div
                  className="flex items-center gap-2.5 px-4 py-3"
                  style={{ borderBottom:`1px solid ${BORDER_SUBTLE}`, background:"rgba(247,247,245,0.8)" }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: phase2Done ? "rgba(16,185,129,0.10)" : phase === "phase2" ? "rgba(245,158,11,0.10)" : "rgba(0,0,0,0.05)" }}
                  >
                    {phase === "phase2" ? <MousePointer className="w-3.5 h-3.5 animate-bounce" style={{ color:"#f59e0b" }} /> : phase2Done ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color:"#10b981" }} /> : <Monitor className="w-3.5 h-3.5" style={{ color:TEXT_TERTIARY }} />}
                  </div>
                  <p className="text-xs font-semibold" style={{ color:TEXT_PRIMARY }}>Phase 2 — AI 화면 조작 테스트</p>
                  <p className="text-[9px] ml-1" style={{ color:TEXT_TERTIARY }}>사람처럼 화면을 직접 조작하며 오류 탐색</p>
                  {(phase === "phase2" || phase2Done) && (
                    <div className="ml-auto flex items-center gap-2 text-[9px]">
                      <span style={{ color:"#10b981" }}>✓{passedActions}</span>
                      {failedActions > 0 && <span style={{ color:"#ef4444" }}>✗{failedActions}</span>}
                    </div>
                  )}
                </div>

                {(phase === "phase2" || phase2Done || (phase === "done")) && (
                  <div className="p-4">
                    {/* 액션 스텝 목록 */}
                    <div className="space-y-1.5">
                      {actions.map((action, i) => (
                        <div
                          key={action.id}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                          style={{
                            background: activeAction === action.id
                              ? "rgba(245,158,11,0.08)"
                              : action.status === "failed" ? "rgba(239,68,68,0.06)"
                              : action.status === "passed" ? "rgba(16,185,129,0.04)"
                              : "rgba(0,0,0,0.025)",
                            border: `1px solid ${
                              activeAction === action.id ? "rgba(245,158,11,0.25)"
                              : action.status === "failed" ? "rgba(239,68,68,0.15)"
                              : action.status === "passed" ? "rgba(16,185,129,0.10)"
                              : BORDER_SUBTLE
                            }`,
                          }}
                        >
                          {/* 단계 번호 */}
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                            style={{
                              background: action.status === "failed" ? "rgba(239,68,68,0.12)"
                                : action.status === "passed" ? "rgba(16,185,129,0.10)"
                                : activeAction === action.id ? "rgba(245,158,11,0.12)"
                                : "rgba(0,0,0,0.07)",
                              color: action.status === "failed" ? "#ef4444"
                                : action.status === "passed" ? "#10b981"
                                : activeAction === action.id ? "#f59e0b"
                                : TEXT_TERTIARY,
                            }}
                          >
                            {action.step}
                          </span>

                          {/* 상태 아이콘 */}
                          {action.status === "running"  && <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color:"#f59e0b" }} />}
                          {action.status === "passed"   && <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color:"#10b981" }} />}
                          {action.status === "failed"   && <XCircle className="w-3 h-3 shrink-0" style={{ color:"#ef4444" }} />}
                          {action.status === "pending"  && <div className="w-3 h-3 rounded-full shrink-0" style={{ border:"1.5px solid rgba(0,0,0,0.15)" }} />}

                          {/* 레이블 + 요소 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium" style={{ color: action.status === "failed" ? "#ef4444" : TEXT_PRIMARY }}>
                              {action.label}
                            </p>
                            <p className="text-[9px] font-mono" style={{ color:TEXT_TERTIARY }}>{action.element}</p>
                            {action.status === "failed" && action.error && (
                              <p className="text-[9px] mt-0.5 line-clamp-1" style={{ color:"#ef4444" }}>{action.error}</p>
                            )}
                          </div>

                          {/* 영상 클립 썸네일 */}
                          {action.status === "failed" && action.clip && (
                            <ClipThumbnail
                              clip={action.clip}
                              onClick={() => setOpenClip({ clip: action.clip!, action })}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 저장된 오류 클립 목록 */}
                    {clips.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-3.5 h-3.5" style={{ color:"#ef4444" }} />
                          <p className="text-[10px] font-semibold" style={{ color:TEXT_PRIMARY }}>오류 영상 클립 ({clips.length}개)</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {clips.map(clip => {
                            const relAction = actions.find(a => a.clip?.id === clip.id);
                            return (
                              <div key={clip.id} className="space-y-1.5">
                                <ClipThumbnail
                                  clip={clip}
                                  onClick={() => relAction && setOpenClip({ clip, action: relAction })}
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background:"rgba(239,68,68,0.10)", color:"#ef4444" }}>
                                    {clip.errorLabel}
                                  </span>
                                  <span className="text-[8px]" style={{ color:TEXT_TERTIARY }}>{clip.ts}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {phase === "idle" && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <MousePointer className="w-8 h-8" style={{ color:"rgba(245,158,11,0.30)" }} />
                    <p className="text-[11px]" style={{ color:TEXT_TERTIARY }}>AI가 직접 화면을 조작하며 사람처럼 QA를 진행합니다</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ 커밋별 QA 탭 ════ */}
          {activeTab === "commit" && (
            <div className="space-y-3">
              {/* 통계 */}
              <div className="grid grid-cols-4 gap-2.5">
                {([["passed","통과",COMMIT_QA_DATA.filter(c=>c.qaStatus==="passed").length,"#10b981"],["failed","실패",COMMIT_QA_DATA.filter(c=>c.qaStatus==="failed").length,"#ef4444"],["partial","부분",COMMIT_QA_DATA.filter(c=>c.qaStatus==="partial").length,"#f59e0b"],["pending","대기",COMMIT_QA_DATA.filter(c=>c.qaStatus==="pending").length,"#9b9b9b"]] as const).map(([status,label,count,color]) => (
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
                {filteredCommits.map(c => <CommitQARow key={c.id} commit={c} />)}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 클립 재생 모달 */}
      {openClip && (
        <ClipModal
          clip={openClip.clip}
          action={openClip.action}
          onClose={() => setOpenClip(null)}
        />
      )}
      </div>
      )}
    </div>
  );
}
