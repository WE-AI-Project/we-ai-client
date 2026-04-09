import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Play, Square, RotateCcw, Search,
  Cpu, MemoryStick, Terminal, ListTodo, BarChart2, Bot, Circle,
  ChevronDown, ChevronUp, Zap, LayoutDashboard,
  ArrowLeft, Users, Target, GitCommit, FileText,
  Server, Plus, Hammer, Activity, CheckCircle2,
  AlertCircle, RefreshCw, Code2, Package,
} from "lucide-react";

// ── 디자인 토큰 ──
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_LOGO,
  CTA_BG, UI_GREEN, UI_GREEN_DARK, UI_GREEN_BG, UI_GREEN_BG7,
  UI_RED, UI_RED_DARK, UI_RED_BG,
  UI_AMBER, UI_AMBER_DARK, UI_AMBER_BG,
  UI_VIOLET, UI_VIOLET_BG, UI_VIOLET_BG7,
  UI_INDIGO, UI_INDIGO_BG,
  UI_GRAY, UI_GRAY_LIGHT, UI_GRAY_BG, UI_GRAY_BG8,
  TERM_BG, TERM_TEXT, TERM_MUTED, TERM_DIMMER, TERM_GREEN,
  GRADIENT_HEADER, GRADIENT_HEADER_SM2, GRADIENT_HEADER_SM3,
  GRADIENT_INDIGO, BTN_DARK, PANEL_BG, CONTENT_BG,
  LANG_GRADLE, LANG_JAVA, LANG_YML,
} from "../colors";
const CTA_TEXT = "rgba(248,243,225,0.92)";

// ── 워크스페이스 탭 정의 (홈 + 기존 4개 + Build Tools) ──
const WORKSPACE_TABS = [
  { id: "home",     icon: LayoutDashboard, label: "Dashboard"      },
  { id: "agents",   icon: Bot,             label: "Agents Control" },
  { id: "terminal", icon: Terminal,        label: "Server Logs"    },
  { id: "queue",    icon: ListTodo,        label: "Task Queue"     },
  { id: "overview", icon: BarChart2,       label: "System Overview"},
  { id: "build",    icon: Hammer,          label: "Build Tools"    },
];

// ── 프로젝트 목록 데이터 (Screen A) ──
const PROJECTS = [
  {
    id: "p1",
    name: "WE&AI Backend Server",
    role: "Backend Dev",
    status: "Active",
    members: 4,
    lang: "Java / Spring Boot",
    sprint: "Agent Deployment v1.0",
    lastActivity: "5 mins ago",
    desc: "지능형 다중 에이전트 서버 관리 시스템 백엔드",
  },
  {
    id: "p2",
    name: "Multi-Agent Simulator",
    role: "AI Researcher",
    status: "Active",
    members: 3,
    lang: "Python / FastAPI",
    sprint: "Simulation Core v2.3",
    lastActivity: "1 hr ago",
    desc: "멀티 에이전트 시뮬레이션 및 실험 환경",
  },
];

// ── Git 커밋 목록 (Screen B) ──
const COMMITS = [
  { hash: "7f2b1a", msg: "Fixed JDK 17 toolchain issue in settings.gradle",    author: "병권",  time: "2 hrs ago",  branch: "main"         },
  { hash: "9c4d1e", msg: "Refactored Multi-Agent communication logic",          author: "Admin", time: "4 hrs ago",  branch: "feature/agent" },
  { hash: "a3b8f2", msg: "Initial project setup",                               author: "System",time: "2 days ago", branch: "main"         },
];

// ── 최근 변경 파일 목록 (Screen B) ──
const RECENT_FILES = [
  { path: "build.gradle",               fullPath: "D:\\WE_AI\\build.gradle",                                    change: "Modified", time: "5 mins ago", ext: "gradle" },
  { path: "MultiAgentController.java",  fullPath: "D:\\WE_AI\\src\\main\\java\\MultiAgentController.java",      change: "Added",    time: "1 hr ago",   ext: "java"   },
  { path: "application-dev.yml",        fullPath: "D:\\WE_AI\\src\\main\\resources\\application-dev.yml",       change: "Modified", time: "3 hrs ago",  ext: "yml"    },
];

// ── 에이전트 목록 (기존 유지) ──
const INITIAL_AGENTS = [
  { id: "AGT-01", name: "DataSync Alpha",  status: "running", cpu: 42, mem: 61, task: "Fetching API endpoints",         uptime: "03:21:44" },
  { id: "AGT-02", name: "Classifier Beta", status: "running", cpu: 78, mem: 83, task: "Image classification batch #12", uptime: "01:05:09" },
  { id: "AGT-03", name: "Logger Gamma",    status: "idle",    cpu: 3,  mem: 22, task: "—",                              uptime: "06:47:02" },
  { id: "AGT-04", name: "Parser Delta",    status: "error",   cpu: 0,  mem: 0,  task: "JSON parse error – retrying",    uptime: "00:00:00" },
  { id: "AGT-05", name: "Scheduler Eps",   status: "running", cpu: 19, mem: 38, task: "Queuing next task batch",         uptime: "02:13:55" },
  { id: "AGT-06", name: "Analyzer Zeta",   status: "idle",    cpu: 5,  mem: 28, task: "—",                              uptime: "04:30:18" },
];

// ── 로그 라인 (기존 유지) ──
const INITIAL_LOGS = [
  { ts: "09:41:02", level: "INFO",  agent: "AGT-01", msg: "Connected to upstream API. Fetching /v2/data..." },
  { ts: "09:41:03", level: "INFO",  agent: "AGT-02", msg: "Batch #12 loaded — 4,096 images queued." },
  { ts: "09:41:05", level: "WARN",  agent: "AGT-04", msg: "Unexpected token '<' at position 0. Retrying in 5s." },
  { ts: "09:41:07", level: "INFO",  agent: "AGT-05", msg: "Next task window scheduled: 09:45:00." },
  { ts: "09:41:10", level: "ERROR", agent: "AGT-04", msg: "Retry #3 failed. Escalating to supervisor." },
  { ts: "09:41:12", level: "INFO",  agent: "AGT-01", msg: "Received 1,240 records. Transforming schema." },
  { ts: "09:41:15", level: "INFO",  agent: "AGT-03", msg: "Log rotation complete. Archive: logs/20260330.gz" },
  { ts: "09:41:18", level: "INFO",  agent: "AGT-02", msg: "Processed 512/4096 images (12.5%). ETA: 3m 20s." },
];

// ── 작업 대기열 (기존 유지) ──
const TASKS = [
  { id: "T-001", name: "Schema Migration v3",      agent: "AGT-01", status: "done",       priority: "high",   created: "09:30", eta: "09:38" },
  { id: "T-002", name: "Image Classification #12", agent: "AGT-02", status: "running",    priority: "high",   created: "09:35", eta: "09:45" },
  { id: "T-003", name: "JSON Parse & Validate",    agent: "AGT-04", status: "error",      priority: "normal", created: "09:38", eta: "—"     },
  { id: "T-004", name: "Batch Scheduler Refresh",  agent: "AGT-05", status: "running",    priority: "normal", created: "09:40", eta: "09:42" },
  { id: "T-005", name: "Log Compression",          agent: "AGT-03", status: "done",       priority: "low",    created: "09:20", eta: "09:25" },
  { id: "T-006", name: "Model Fine-tune Prep",     agent: "—",       status: "scheduled", priority: "high",   created: "—",     eta: "10:00" },
  { id: "T-007", name: "Report Generation",        agent: "—",       status: "scheduled", priority: "low",    created: "—",     eta: "10:30" },
];

// ── 차트 데이터 생성 (기존 유지) ──
const generateTrafficData = () =>
  Array.from({ length: 12 }, (_, i) => ({
    time: `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
    rps: Math.floor(Math.random() * 400 + 100),
    latency: Math.floor(Math.random() * 60 + 20),
  }));

const generateEfficiencyData = () =>
  INITIAL_AGENTS.map(a => ({
    name: a.id,
    efficiency: a.status === "error" ? 0 : Math.floor(Math.random() * 40 + 60),
  }));

// ── 빌드 콘솔 로그 ──
const BUILD_BOOT_LOGS = [
  "  .   ____          _            __ _ _",
  " /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\",
  "( ( )\\___ | '_ | '_| | '_ \\/ _` | \\ \\ \\ \\",
  " \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )",
  "  '  |____| .__|_| |_|_| |_\\__, | / / / /",
  " =========|_|==============|___/=/_/_/_/",
  " :: Spring Boot ::               (v3.2.4)",
  "",
  "2026-03-30 09:41:00.021  INFO --- Starting WEAIApplication",
  "2026-03-30 09:41:00.340  INFO --- The following 1 profile is active: \"dev\"",
  "2026-03-30 09:41:01.874  INFO --- Tomcat initialized with port(s): 8080 (http)",
  "2026-03-30 09:41:02.012  INFO --- Starting service [Tomcat]",
  "2026-03-30 09:41:02.013  INFO --- Starting Servlet engine: [Apache Tomcat/10.1.19]",
  "2026-03-30 09:41:02.891  INFO --- Initializing Spring embedded WebApplicationContext",
  "2026-03-30 09:41:03.441  INFO --- MultiAgentController initialized — 6 agents registered",
  "2026-03-30 09:41:03.812  INFO --- Tomcat started on port(s): 8080 (http) with context path ''",
  "2026-03-30 09:41:03.901  INFO --- Started WEAIApplication in 3.882 seconds (JVM running for 4.201)",
];

// ════════════════════════════════════════════
// 공통 헬퍼 컴포넌트
// ════════════════════════════════════════════

// 상태 배지
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    running:   { bg: UI_GREEN_BG,  color: UI_GREEN_DARK, dot: UI_GREEN, label: "Running"   },
    idle:      { bg: UI_GRAY_BG,   color: UI_GRAY,       dot: UI_GRAY_LIGHT, label: "Idle"      },
    error:     { bg: UI_RED_BG,    color: UI_RED_DARK,    dot: UI_RED,   label: "Error"     },
    done:      { bg: UI_GREEN_BG,  color: UI_GREEN_DARK,  dot: UI_GREEN, label: "Done"      },
    scheduled: { bg: UI_INDIGO_BG, color: UI_INDIGO,      dot: UI_INDIGO, label: "Scheduled" },
    active:    { bg: UI_GREEN_BG,  color: UI_GREEN_DARK,  dot: UI_GREEN, label: "Active"    },
  };
  const s = map[status.toLowerCase()] ?? map.idle;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <Circle className="w-1.5 h-1.5 fill-current" style={{ color: s.dot }} />
      {s.label}
    </span>
  );
}

// 우선순위 배지
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    high:   { bg: "rgba(239,68,68,0.08)",   color: UI_RED_DARK },
    normal: { bg: "rgba(251,191,36,0.10)",  color: UI_AMBER_DARK },
    low:    { bg: UI_GRAY_BG8, color: UI_GRAY },
  };
  const s = map[priority] ?? map.normal;
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {priority}
    </span>
  );
}

// CPU/메모리 미니 바
function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color: TEXT_TERTIARY }}>{value}%</span>
    </div>
  );
}

// 탭 버튼 (워크스페이스 내부)
function TabBtn({
  tab, active, onClick,
}: { tab: typeof WORKSPACE_TABS[number]; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(224,231,255,0.7), rgba(232,213,245,0.6), rgba(252,231,243,0.5))"
          : "transparent",
        color: active ? ACCENT : TEXT_SECONDARY,
        border: active ? "1px solid rgba(99,91,255,0.15)" : "1px solid transparent",
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">{tab.label}</span>
    </button>
  );
}

// 섹션 헤더
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</h2>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{sub}</p>}
    </div>
  );
}

// ════════════════════════════════════════════
// Screen A — 프로젝트 진입 (Welcome & Join)
// ════════════════════════════════════════════
function ProjectEntry({ onJoin }: { onJoin: (project: typeof PROJECTS[number]) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = PROJECTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  );
  const selectedProject = PROJECTS.find(p => p.id === selected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 그라데이션 배경 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: GRADIENT_PAGE }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,152,64,0.14) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-lg rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.07)",
          }}
        >
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3.5"
              style={{ background: GRADIENT_HEADER_SM2 }}
            >
              <Bot className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <h1 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>Welcome to WE&amp;AI Office</h1>
            <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>프로젝트를 선택하여 워크스페이스에 참여하세요</p>
          </div>

          {/* 검색 + Create 버튼 */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-7 pr-3 py-2 text-xs rounded-lg outline-none"
                style={{ background: PANEL_BG, border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: CTA_BG, color: CTA_TEXT }}
            >
              <Plus className="w-3 h-3" />
              Create New
            </button>
          </div>

          {/* 프로젝트 목록 */}
          <div className="space-y-2 mb-5">
            {filtered.map(project => {
              const isSelected = selected === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => setSelected(isSelected ? null : project.id)}
                  className="rounded-xl p-4 cursor-pointer transition-all"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(224,231,255,0.5), rgba(232,213,245,0.4))"
                      : "rgba(247,247,245,0.8)",
                    border: isSelected ? "1px solid rgba(99,91,255,0.25)" : `1px solid ${BORDER}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* 프로젝트 아이콘 */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isSelected ? "rgba(99,91,255,0.12)" : "rgba(0,0,0,0.05)" }}
                      >
                        <Code2 className="w-4 h-4" style={{ color: isSelected ? ACCENT : TEXT_SECONDARY }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>{project.name}</span>
                          <StatusBadge status={project.status} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{project.desc}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                            <span style={{ color: TEXT_LABEL }}>Role:</span> {project.role}
                          </span>
                          <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                            <span style={{ color: TEXT_LABEL }}>Stack:</span> {project.lang}
                          </span>
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                            <Users className="w-2.5 h-2.5" /> {project.members}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 라디오 인디케이터 */}
                    <div
                      className="w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-all"
                      style={{
                        border: isSelected ? "none" : `1.5px solid ${BORDER}`,
                        background: isSelected ? ACCENT : "transparent",
                      }}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* 선택 시 스프린트 정보 노출 */}
                  {isSelected && (
                    <div
                      className="mt-3 pt-3 flex items-center gap-3"
                      style={{ borderTop: "1px solid rgba(99,91,255,0.12)" }}
                    >
                      <Target className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                      <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                        Current Sprint: <strong style={{ color: TEXT_PRIMARY }}>{project.sprint}</strong>
                      </span>
                      <span className="ml-auto text-[10px]" style={{ color: TEXT_TERTIARY }}>
                        Last activity {project.lastActivity}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Join 버튼 */}
          <button
            onClick={() => selectedProject && onJoin(selectedProject)}
            disabled={!selected}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: selected ? CTA_BG : "rgba(0,0,0,0.05)",
              color: selected ? CTA_TEXT : TEXT_TERTIARY,
              cursor: selected ? "pointer" : "not-allowed",
            }}
          >
            {selected ? `Join "${selectedProject?.name}"` : "Select a project to join"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Screen B (Home Tab) — 프로젝트 워크스페이스 홈
// ════════════════════════════════════════════
function WorkspaceHome({ project }: { project: typeof PROJECTS[number] }) {
  // 빠른 통계 카드
  const quickStats = [
    { label: "Commits Today",   value: "3",    color: ACCENT,    bg: "rgba(99,91,255,0.07)"  },
    { label: "Files Changed",   value: "3",    color: UI_VIOLET, bg: UI_VIOLET_BG7 },
    { label: "Agents Running",  value: "3/6",  color: UI_GREEN, bg: UI_GREEN_BG7 },
    { label: "Build Status",    value: "PASS", color: UI_GREEN_DARK, bg: UI_GREEN_BG7 },
  ];

  const fileExtColor: Record<string, string> = {
    gradle: LANG_GRADLE, java: LANG_JAVA, yml: LANG_YML,
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={`${project.name}`}
        sub={`Sprint: ${project.sprint}  ·  ${project.members} members  ·  Role: ${project.role}`}
      />

      {/* 빠른 통계 */}
      <div className="grid grid-cols-4 gap-2.5">
        {quickStats.map(s => (
          <div key={s.label} className="rounded-xl p-3.5" style={{ background: s.bg, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 2-컬럼 그리드: 커밋 + 변경 파일 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Recent Commits */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <GitCommit className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Recent Commits</p>
          </div>
          <div className="space-y-2.5">
            {COMMITS.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ background: "rgba(99,91,255,0.08)", color: ACCENT }}
                >
                  {c.hash}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] truncate" style={{ color: TEXT_PRIMARY }}>{c.msg}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{c.author}</span>
                    <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>·</span>
                    <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{c.time}</span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}
                    >
                      {c.branch}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Changed Files */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5" style={{ color: UI_VIOLET }} />
            <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Recently Changed Files</p>
          </div>
          <div className="space-y-2.5">
            {RECENT_FILES.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-semibold"
                  style={{ background: `${fileExtColor[f.ext]}18`, color: fileExtColor[f.ext] }}
                >
                  .{f.ext}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{f.path}</p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: TEXT_TERTIARY }}>{f.fullPath}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] font-semibold"
                      style={{ color: f.change === "Added" ? UI_GREEN : UI_AMBER }}
                    >
                      {f.change}
                    </span>
                    <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{f.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-컬럼 그리드: 에이전트 상태(미니) + 서버 상태 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Multi-Agent Status (미니) */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5" style={{ color: UI_GREEN }} />
            <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Multi-Agent Status</p>
          </div>
          <div className="space-y-1.5">
            {INITIAL_AGENTS.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Circle
                    className="w-1.5 h-1.5 shrink-0 fill-current"
                    style={{ color: a.status === "running" ? UI_GREEN : a.status === "error" ? UI_RED : UI_GRAY_LIGHT }}
                  />
                  <span className="text-[11px] truncate" style={{ color: TEXT_PRIMARY }}>{a.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{a.task.slice(0, 18)}{a.task.length > 18 ? "…" : ""}</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Server Status */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-3.5 h-3.5" style={{ color: UI_GREEN_DARK }} />
            <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Server Status</p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Server",         value: "UP",           ok: true  },
              { label: "Active Profile", value: "'dev'",        ok: true  },
              { label: "JDK",            value: "17.0.18+8",   ok: true  },
              { label: "Port",           value: "8080",         ok: true  },
              { label: "Context Path",   value: "/",            ok: true  },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: TEXT_LABEL }}>{row.label}</span>
                <div className="flex items-center gap-1.5">
                  {row.ok
                    ? <CheckCircle2 className="w-3 h-3" style={{ color: UI_GREEN }} />
                    : <AlertCircle className="w-3 h-3" style={{ color: UI_RED }} />
                  }
                  <span className="text-[11px] font-mono font-medium" style={{ color: TEXT_PRIMARY }}>{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Agents Control 탭 (기존 AgentMonitor 유지)
// ════════════════════════════════════════════
function AgentMonitor() {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const handleAction = (id: string, action: "start" | "stop" | "restart") => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        if (action === "stop")    return { ...a, status: "idle",    cpu: 0, mem: 0 };
        if (action === "start")   return { ...a, status: "running", cpu: Math.floor(Math.random() * 50 + 10), mem: Math.floor(Math.random() * 40 + 20) };
        if (action === "restart") return { ...a, status: "running", cpu: Math.floor(Math.random() * 30 + 10), mem: Math.floor(Math.random() * 30 + 20), uptime: "00:00:01" };
        return a;
      })
    );
  };

  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || a.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <SectionHeader title="Agents Control" sub="에이전트 상태 · CPU/메모리 · 현재 작업 실시간 모니터링" />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agent..."
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
            style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
          />
        </div>
        {["all", "running", "idle", "error"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all capitalize"
            style={{
              background: filter === f ? CTA_BG : "rgba(255,255,255,0.7)",
              color: filter === f ? CTA_TEXT : TEXT_SECONDARY,
              border: `1px solid ${BORDER}`,
            }}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {filtered.map(agent => (
          <div key={agent.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}`, backdropFilter: "blur(8px)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #e0e7ff, #e8d5f5, #fce7f3)" }}>
                  <Bot className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>{agent.name}</span>
                    <span className="text-[10px] font-mono" style={{ color: TEXT_TERTIARY }}>{agent.id}</span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_SECONDARY }}>{agent.task}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" style={{ color: TEXT_TERTIARY }} />
                      <MiniBar value={agent.cpu} color={agent.cpu > 70 ? "#ef4444" : ACCENT} />
                    </div>
                    <div className="flex items-center gap-1">
                      <MemoryStick className="w-2.5 h-2.5" style={{ color: TEXT_TERTIARY }} />
                      <MiniBar value={agent.mem} color={agent.mem > 75 ? "#f59e0b" : "#8b5cf6"} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: TEXT_TERTIARY }}>⏱ {agent.uptime}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleAction(agent.id, "start")} title="Start" className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(16,185,129,0.10)", color: "#059669" }}>
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <button onClick={() => handleAction(agent.id, "stop")} title="Stop" className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(239,68,68,0.10)", color: "#dc2626" }}>
                  <Square className="w-3 h-3 fill-current" />
                </button>
                <button onClick={() => handleAction(agent.id, "restart")} title="Restart" className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(99,91,255,0.10)", color: ACCENT }}>
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Server Logs 탭 (기존 TerminalLogs 유지)
// ════════════════════════════════════════════
function TerminalLogs() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const msgs = [
      { level: "INFO",  agent: "AGT-02", msg: "Processed 1024/4096 images (25%)." },
      { level: "INFO",  agent: "AGT-01", msg: "Schema transform complete. Writing to DB." },
      { level: "WARN",  agent: "AGT-05", msg: "Task queue backlog > 20. Scaling up." },
      { level: "INFO",  agent: "AGT-06", msg: "Analyzer idle. Waiting for assignment." },
    ];
    let idx = 0;
    const id = setInterval(() => {
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setLogs(prev => [...prev.slice(-80), { ts, ...msgs[idx % msgs.length] }]);
      idx++;
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const levelColor: Record<string, string> = { INFO: "#10b981", WARN: "#f59e0b", ERROR: "#ef4444" };

  const handleCmd = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !input.trim()) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setLogs(prev => [...prev, { ts, level: "CMD", agent: "USER", msg: `> ${input.trim()}` }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <SectionHeader title="Server Logs" sub="에이전트 통신 및 서버 활동 실시간 로그" />
      <div
        className="flex-1 rounded-xl overflow-y-auto font-mono text-[11px] p-4 space-y-0.5"
        style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)", minHeight: 320, maxHeight: 420 }}
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2.5 leading-5 hover:bg-white/5 px-1 rounded transition-colors">
            <span style={{ color: "#4b5563" }}>{log.ts}</span>
            <span className="font-semibold w-10 shrink-0" style={{ color: log.level === "CMD" ? "#635bff" : levelColor[log.level] ?? "#9ca3af" }}>
              {log.level}
            </span>
            <span style={{ color: "#6366f1" }}>[{log.agent}]</span>
            <span style={{ color: "#d1d5db" }}>{log.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xs font-mono" style={{ color: "#635bff" }}>$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleCmd}
          placeholder="Enter command and press Enter..."
          className="flex-1 bg-transparent outline-none text-xs font-mono"
          style={{ color: "#d1d5db" }}
        />
        <Zap className="w-3 h-3" style={{ color: "#4b5563" }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Task Queue 탭 (기존 유지)
// ════════════════════════════════════════════
function TaskQueue() {
  const [tasks] = useState(TASKS);
  const [sortField, setSortField] = useState<"status" | "priority">("status");
  const [sortAsc, setSortAsc] = useState(true);

  const statusOrder: Record<string, number> = { running: 0, scheduled: 1, done: 2, error: 3 };
  const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };

  const sorted = [...tasks].sort((a, b) => {
    const va = sortField === "status" ? statusOrder[a.status] : priorityOrder[a.priority];
    const vb = sortField === "status" ? statusOrder[b.status] : priorityOrder[b.priority];
    return sortAsc ? va - vb : vb - va;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(x => !x);
    else { setSortField(field); setSortAsc(true); }
  };

  const counts = { running: 0, scheduled: 0, done: 0, error: 0 };
  tasks.forEach(t => { counts[t.status as keyof typeof counts] = (counts[t.status as keyof typeof counts] ?? 0) + 1; });

  return (
    <div>
      <SectionHeader title="Task Queue" sub="예약 · 진행 · 완료 작업 현황" />
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Running",   count: counts.running,   color: "#10b981", bg: "rgba(16,185,129,0.08)"  },
          { label: "Scheduled", count: counts.scheduled, color: ACCENT,    bg: "rgba(99,91,255,0.08)"   },
          { label: "Done",      count: counts.done,      color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
          { label: "Error",     count: counts.error,     color: "#ef4444", bg: "rgba(239,68,68,0.08)"   },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: c.bg, border: `1px solid ${BORDER}` }}>
            <p className="text-xl font-bold" style={{ color: c.color }}>{c.count}</p>
            <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{c.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.75)" }}>
        <div className="grid text-[10px] font-semibold px-4 py-2.5" style={{ gridTemplateColumns: "80px 1fr 90px 80px 70px 70px 70px", color: TEXT_LABEL, borderBottom: `1px solid ${BORDER}`, background: "rgba(247,247,245,0.8)" }}>
          <span>ID</span>
          <span>Task Name</span>
          <span>Agent</span>
          <button className="flex items-center gap-1 text-left" onClick={() => toggleSort("status")}>
            Status {sortField === "status" ? (sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />) : null}
          </button>
          <button className="flex items-center gap-1 text-left" onClick={() => toggleSort("priority")}>
            Priority {sortField === "priority" ? (sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />) : null}
          </button>
          <span>Created</span>
          <span>ETA</span>
        </div>
        {sorted.map((task, i) => (
          <div key={task.id} className="grid px-4 py-2.5 items-center text-xs transition-colors hover:bg-black/[0.02]" style={{ gridTemplateColumns: "80px 1fr 90px 80px 70px 70px 70px", borderBottom: i < sorted.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
            <span className="font-mono text-[10px]" style={{ color: TEXT_TERTIARY }}>{task.id}</span>
            <span className="font-medium truncate pr-3" style={{ color: TEXT_PRIMARY }}>{task.name}</span>
            <span className="font-mono text-[10px]" style={{ color: TEXT_SECONDARY }}>{task.agent}</span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="text-[10px] font-mono" style={{ color: TEXT_TERTIARY }}>{task.created}</span>
            <span className="text-[10px] font-mono" style={{ color: TEXT_TERTIARY }}>{task.eta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// System Overview 탭 (기존 유지)
// ════════════════════════════════════════════
function SystemOverview() {
  const [trafficData] = useState(generateTrafficData);
  const [efficiencyData] = useState(generateEfficiencyData);

  const statCards = [
    { label: "Total Uptime",   value: "18d 06h 22m", color: ACCENT,    bg: "rgba(99,91,255,0.07)"  },
    { label: "Active Agents",  value: "4 / 6",       color: "#10b981", bg: "rgba(16,185,129,0.07)" },
    { label: "Avg Efficiency", value: "73.4%",        color: "#8b5cf6", bg: "rgba(139,92,246,0.07)" },
    { label: "Req/s (peak)",   value: "487 rps",      color: "#f59e0b", bg: "rgba(245,158,11,0.07)" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <p className="font-semibold mb-1" style={{ color: TEXT_PRIMARY }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="System Overview" sub="서버 트래픽 · 에이전트 효율 · 시스템 가동 현황" />
      <div className="grid grid-cols-4 gap-2.5">
        {statCards.map(c => (
          <div key={c.label} className="rounded-xl p-3.5" style={{ background: c.bg, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-bold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{c.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Server Traffic (RPS & Latency)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart id="weai-traffic-line" data={trafficData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="rps" name="RPS" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT }} />
            <Line type="monotone" dataKey="latency" name="Latency(ms)" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#f59e0b" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Agent Efficiency (%)</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart id="weai-efficiency-bar" data={efficiencyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="efficiency" name="Efficiency" radius={[4, 4, 0, 0]} fill="url(#barGrad2)" />
            <defs>
              <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#635bff" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Build Tools 탭 (NEW — Gradle / Spring Boot)
// ════════════════════════════════════════════
function BuildTools() {
  const [serverUp, setServerUp] = useState(true);
  const [buildRunning, setBuildRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState(BUILD_BOOT_LOGS);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "auto" }); }, [consoleLogs]);

  const gradleCmd = (cmd: string) => {
    setBuildRunning(true);
    const runLogs = [
      `> Task :${cmd}`,
      cmd === "bootRun"
        ? "> Executing gradlew.bat bootRun with profile 'dev'..."
        : cmd === "build"
        ? "> Compiling 24 source files..."
        : cmd === "test"
        ? "> Running 38 unit tests..."
        : "> Cleaning build directory...",
      "BUILD SUCCESSFUL in 3s",
    ];
    let i = 0;
    const id = setInterval(() => {
      if (i < runLogs.length) {
        setConsoleLogs(prev => [...prev, runLogs[i]]);
        i++;
      } else {
        clearInterval(id);
        setBuildRunning(false);
        if (cmd === "bootRun") setServerUp(true);
        if (cmd === "stop") setServerUp(false);
      }
    }, 600);
  };

  const gradleCommands = [
    { cmd: "bootRun", label: "bootRun",  icon: Play,       color: "#10b981", bg: "rgba(16,185,129,0.10)",  desc: "Start Spring Boot server" },
    { cmd: "build",   label: "build",    icon: Package,    color: ACCENT,    bg: "rgba(99,91,255,0.10)",   desc: "Compile & package" },
    { cmd: "test",    label: "test",     icon: CheckCircle2,color:"#8b5cf6", bg: "rgba(139,92,246,0.10)",  desc: "Run unit tests" },
    { cmd: "clean",   label: "clean",    icon: RefreshCw,  color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  desc: "Clean build output" },
    { cmd: "stop",    label: "stop",     icon: Square,     color: "#ef4444", bg: "rgba(239,68,68,0.10)",   desc: "Stop server" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Build Tools (Gradle)" sub="Spring Boot 서버 관리 · gradlew 명령어 · 빌드 콘솔" />

      {/* 서버 상태 + 환경 정보 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 서버 상태 카드 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color: serverUp ? "#10b981" : "#ef4444" }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Server Status</p>
            </div>
            <StatusBadge status={serverUp ? "running" : "error"} />
          </div>
          <div className="space-y-1.5">
            {[
              { k: "Process",    v: serverUp ? "gradlew.bat bootRun" : "—"     },
              { k: "Profile",    v: "$env:SPRING_PROFILES_ACTIVE = 'dev'"       },
              { k: "Port",       v: "http://localhost:8080"                     },
              { k: "Uptime",     v: serverUp ? "18d 06h 22m" : "—"             },
            ].map(r => (
              <div key={r.k} className="flex items-center gap-2">
                <span className="text-[10px] w-16 shrink-0" style={{ color: TEXT_LABEL }}>{r.k}</span>
                <span className="text-[10px] font-mono truncate" style={{ color: TEXT_PRIMARY }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 환경 정보 카드 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
            <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Environment</p>
          </div>
          <div className="space-y-1.5">
            {[
              { k: "OS",      v: "Windows 11 Pro"          },
              { k: "JDK",     v: "17.0.18+8 (LTS)"         },
              { k: "Gradle",  v: "8.7"                     },
              { k: "Profile", v: "dev"                     },
              { k: "Spring",  v: "Boot 3.2.4 / Java 17"   },
            ].map(r => (
              <div key={r.k} className="flex items-center gap-2">
                <span className="text-[10px] w-14 shrink-0" style={{ color: TEXT_LABEL }}>{r.k}</span>
                <span className="text-[10px] font-mono" style={{ color: TEXT_PRIMARY }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradle 명령어 버튼들 */}
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Gradle Commands</p>
        <div className="flex flex-wrap gap-2">
          {gradleCommands.map(({ cmd, label, icon: Icon, color, bg, desc }) => (
            <button
              key={cmd}
              onClick={() => gradleCmd(cmd)}
              disabled={buildRunning}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
              style={{
                background: bg,
                border: `1px solid ${color}30`,
                opacity: buildRunning ? 0.5 : 1,
                cursor: buildRunning ? "not-allowed" : "pointer",
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <div className="text-left">
                <p className="text-[11px] font-semibold" style={{ color }}>./gradlew {label}</p>
                <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{desc}</p>
              </div>
            </button>
          ))}
          {buildRunning && (
            <div className="flex items-center gap-1.5 px-3 py-2">
              <RefreshCw className="w-3 h-3 animate-spin" style={{ color: TEXT_TERTIARY }} />
              <span className="text-[11px]" style={{ color: TEXT_TERTIARY }}>Running...</span>
            </div>
          )}
        </div>
      </div>

      {/* 빌드 콘솔 */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: TEXT_PRIMARY }}>Build Console</p>
        <div
          className="rounded-xl overflow-y-auto font-mono text-[10px] p-4 space-y-0.5"
          style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)", maxHeight: 220 }}
        >
          {consoleLogs.map((line, i) => (
            <div key={i} className="leading-4" style={{ color: line.includes("BUILD SUCCESSFUL") ? "#10b981" : line.includes("ERROR") ? "#ef4444" : line.startsWith(" .") || line.startsWith(" /") || line.startsWith("(") || line.startsWith("=") || line.startsWith("'") ? "#635bff" : "#9ca3af" }}>
              {line || " "}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// WE&AI 대시보드 루트
// 뷰 상태: "entry" (Screen A) → "workspace" (Screen B with tabs)
// ════════════════════════════════════════════
export function WeAIDashboard() {
  // entry: 프로젝트 선택 화면 / workspace: 프로젝트 워크스페이스
  const [view, setView] = useState<"entry" | "workspace">("entry");
  const [activeProject, setActiveProject] = useState<typeof PROJECTS[number] | null>(null);
  const [activeTab, setActiveTab] = useState("home");

  // 프로젝트 선택 후 워크스페이스 진입
  const handleJoin = (project: typeof PROJECTS[number]) => {
    setActiveProject(project);
    setView("workspace");
    setActiveTab("home");
  };

  // Screen A — 프로젝트 진입 화면
  if (view === "entry") {
    return <ProjectEntry onJoin={handleJoin} />;
  }

  // Screen B — 프로젝트 워크스페이스
  const renderTab = () => {
    switch (activeTab) {
      case "home":     return <WorkspaceHome project={activeProject!} />;
      case "agents":   return <AgentMonitor />;
      case "terminal": return <TerminalLogs />;
      case "queue":    return <TaskQueue />;
      case "overview": return <SystemOverview />;
      case "build":    return <BuildTools />;
      default:         return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경: 하늘 물드는 그라데이션 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 20%, #e8d5f5 40%, #fce7f3 60%, #fde6d5 80%, #fef3c7 100%)" }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      {/* 워크스페이스 탭 헤더 */}
      <div
        className="relative z-10 flex items-center gap-1 px-4 pt-3 pb-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        {/* 프로젝트 선택 화면으로 돌아가기 */}
        <button
          onClick={() => setView("entry")}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all mr-2 shrink-0"
          style={{ color: TEXT_SECONDARY, background: "rgba(0,0,0,0.04)" }}
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Projects</span>
        </button>

        {/* 프로젝트명 표시 */}
        <div className="flex items-center gap-2 mr-3 shrink-0">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #e0e7ff, #ddd6fe, #fce7f3)" }}
          >
            <Bot className="w-3 h-3" style={{ color: ACCENT }} />
          </div>
          <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>{activeProject?.name}</span>
          <div
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold"
            style={{ background: "rgba(16,185,129,0.10)", color: "#059669" }}
          >
            <Circle className="w-1.5 h-1.5 fill-current" />
            Active
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 mr-1 shrink-0" style={{ background: BORDER }} />

        {/* 탭 버튼들 */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {WORKSPACE_TABS.map(tab => (
            <TabBtn
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* 오른쪽: 멤버 수 */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <Users className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>{activeProject?.members} members</span>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-5">
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.70)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.05)",
            minHeight: "100%",
          }}
        >
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
