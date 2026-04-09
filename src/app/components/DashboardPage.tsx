import { GitCommit, FileText, Activity, Bot, Server, Cpu, ArrowRight } from "lucide-react";
import { PageLoader, DashboardSkeleton } from "./SkeletonLoader";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
  STATUS_RUNNING, STATUS_ERROR,
} from "../colors";

// ── 프로젝트 진행률 데이터 ──
const PROGRESS_DATA = {
  overall:  { label: "Overall",  pct: 42, color: ACCENT,         bg: "rgba(65,67,27,0.10)"    },
  backend:  { label: "Backend",  pct: 58, color: "#5A8A4A",      bg: "rgba(90,138,74,0.10)"  },
  frontend: { label: "Frontend", pct: 27, color: "#C09840",      bg: "rgba(192,152,64,0.10)" },
  agents:   { label: "Agents",   pct: 50, color: "#AEB784",      bg: "rgba(174,183,132,0.10)" },
};

// ── 마일스톤 ──
const MILESTONES = [
  { label: "Spring Boot 기본 설정",        done: true  },
  { label: "멀티에이전트 통신 프로토콜",   done: true  },
  { label: "DataSyncAgent 구현",           done: true  },
  { label: "ParserAgent 안정화",           done: false },
  { label: "JWT 인증 미들웨어",            done: false },
  { label: "프론트 Agent 대시보드",        done: false },
  { label: "AI QA 자동화 통합",            done: false },
];

// ── 최근 커밋 ──
const RECENT_COMMITS = [
  { hash: "7f2b1a3", message: "Fixed JDK 17 toolchain issue in settings.gradle",    author: "병권", time: "5m ago",  branch: "main"          },
  { hash: "a9c4d02", message: "Refactored MultiAgentController dispatch logic",      author: "병권", time: "1h ago",  branch: "main"          },
  { hash: "3e8f51b", message: "Added application-dev.yml default agent configs",     author: "Admin",time: "3h ago",  branch: "feature/agent" },
  { hash: "b2d7890", message: "Resolved DataSync Alpha null pointer exception",      author: "병권", time: "5h ago",  branch: "main"          },
  { hash: "f1a6c34", message: "Updated Gradle wrapper to 8.7",                       author: "Admin",time: "1d ago",  branch: "main"          },
  { hash: "9e3b2f7", message: "Initial multi-agent handshake protocol impl",         author: "Admin",time: "2d ago",  branch: "feature/agent" },
];

// ── 최근 변경 파일 ──
const RECENT_FILES = [
  { path: "D:\\WE_AI\\build.gradle",                                  type: "gradle", changed: "5m ago",  status: "modified" },
  { path: "D:\\WE_AI\\src\\main\\resources\\application-dev.yml",    type: "yml",    changed: "1h ago",  status: "modified" },
  { path: "D:\\WE_AI\\src\\main\\java\\...\\MultiAgentController.java",type:"java",  changed: "3h ago",  status: "modified" },
  { path: "D:\\WE_AI\\src\\main\\java\\...\\DataSyncAgent.java",     type: "java",   changed: "3h ago",  status: "added"    },
  { path: "D:\\WE_AI\\settings.gradle",                               type: "gradle", changed: "5h ago",  status: "modified" },
  { path: "D:\\WE_AI\\src\\main\\java\\...\\AgentScheduler.java",    type: "java",   changed: "1d ago",  status: "modified" },
  { path: "D:\\WE_AI\\.env.dev",                                      type: "env",    changed: "2d ago",  status: "deleted"  },
];

// ── 에이전트 ──
const AGENT_SUMMARY = [
  { name: "DataSync Alpha",  status: "running", cpu: 38, mem: 412 },
  { name: "Classifier Beta", status: "running", cpu: 72, mem: 680 },
  { name: "Logger Gamma",    status: "idle",    cpu: 2,  mem: 120 },
  { name: "Parser Delta",    status: "error",   cpu: 0,  mem: 0   },
  { name: "Scheduler Eps",   status: "running", cpu: 18, mem: 230 },
  { name: "Analyzer Zeta",   status: "idle",    cpu: 4,  mem: 98  },
];

const STATUS_COLOR: Record<string, string> = {
  running: STATUS_RUNNING, idle: "#9ca3af", error: STATUS_ERROR,
};

const FILE_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  gradle: { bg: "rgba(65,67,27,0.08)",    color: ACCENT     },
  yml:    { bg: "rgba(90,138,74,0.08)",   color: "#5A8A4A"  },
  java:   { bg: "rgba(192,152,64,0.08)",  color: "#C09840"  },
  env:    { bg: "rgba(136,138,98,0.08)",  color: "#888A62"  },
};

const STATUS_FILE: Record<string, { color: string; label: string }> = {
  modified: { color: "#C09840", label: "M" },
  added:    { color: "#5A8A4A", label: "A" },
  deleted:  { color: "#B85450", label: "D" },
};

// ── 원형 진행률 ──
function CircleProgress({
  pct, color, size = 72, strokeW = 5,
}: { pct: number; color: string; size?: number; strokeW?: number }) {
  const r   = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size}>
      {/* 배경 트랙 */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeW}
      />
      {/* 진행 */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

// ── 선형 진행률 바 ──
function LinearBar({ pct, color, bg }: { pct: number; color: string; bg: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

type Props = { projectName: string };

export function DashboardPage({ projectName }: Props) {
  const runningCount = AGENT_SUMMARY.filter(a => a.status === "running").length;
  const errorCount   = AGENT_SUMMARY.filter(a => a.status === "error").length;
  const doneMile     = MILESTONES.filter(m => m.done).length;

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,152,64,0.14) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#10b981" }}>Active</p>
              </div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>{projectName}</h1>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>Java 17 · Spring Boot 3 · Gradle 8.7</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: TEXT_TERTIARY }}>
              <span>마일스톤 {doneMile}/{MILESTONES.length}</span>
            </div>
          </div>

          {/* ══════════════════════════════════════
              프로젝트 진행률 섹션
          ══════════════════════════════════════ */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(248,243,225,0.82)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <Activity className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Project Progress</p>
              <span
                className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: ACCENT_BG, color: ACCENT }}
              >
                Sprint 1 / 3
              </span>
            </div>

            <div className="p-5">
              {/* 원형 진행률 3개 + 전체 */}
              <div className="flex items-center gap-6">
                {/* Overall 큰 원 */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <CircleProgress pct={PROGRESS_DATA.overall.pct} color={PROGRESS_DATA.overall.color} size={84} strokeW={6} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
                        {PROGRESS_DATA.overall.pct}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>Overall</p>
                </div>

                {/* 구분선 */}
                <div className="w-px h-16 shrink-0" style={{ background: BORDER }} />

                {/* Backend / Frontend / Agents 작은 원 */}
                <div className="flex items-center gap-6 flex-1">
                  {[PROGRESS_DATA.backend, PROGRESS_DATA.frontend, PROGRESS_DATA.agents].map(p => (
                    <div key={p.label} className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <CircleProgress pct={p.pct} color={p.color} size={60} strokeW={5} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                            {p.pct}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>{p.label}</p>
                    </div>
                  ))}
                </div>

                {/* 마일스톤 미니 뷰 */}
                <div className="w-px h-16 shrink-0" style={{ background: BORDER }} />
                <div className="flex flex-col gap-1.5" style={{ minWidth: 140 }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>Milestones</p>
                  {MILESTONES.slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: m.done ? "#10b981" : "rgba(0,0,0,0.10)" }}
                      />
                      <p
                        className="text-[9px] truncate"
                        style={{ color: m.done ? TEXT_SECONDARY : TEXT_TERTIARY }}
                      >
                        {m.label}
                      </p>
                    </div>
                  ))}
                  {MILESTONES.length > 5 && (
                    <p className="text-[8px]" style={{ color: TEXT_TERTIARY }}>
                      +{MILESTONES.length - 5} more…
                    </p>
                  )}
                </div>
              </div>

              {/* 파트별 선형 바 */}
              <div className="mt-5 grid grid-cols-3 gap-4">
                {[PROGRESS_DATA.backend, PROGRESS_DATA.frontend, PROGRESS_DATA.agents].map(p => (
                  <div key={p.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>{p.label}</span>
                      <span className="text-[10px] font-mono font-semibold" style={{ color: p.color }}>{p.pct}%</span>
                    </div>
                    <LinearBar pct={p.pct} color={p.color} bg={p.bg} />
                    <div className="flex items-center justify-between text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <span>진행 중</span>
                      <span>목표 100%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 상태 요약 카드 4개 ── */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Total Agents",   value: String(AGENT_SUMMARY.length), color: ACCENT,     bg: ACCENT_BG,                        icon: Bot     },
              { label: "Running",        value: String(runningCount),          color: "#5A8A4A",  bg: "rgba(90,138,74,0.07)",            icon: Server  },
              { label: "Error",          value: String(errorCount),            color: "#B85450",  bg: "rgba(184,84,80,0.07)",            icon: Server  },
              { label: "Recent Commits", value: String(RECENT_COMMITS.length), color: "#AEB784",  bg: "rgba(174,183,132,0.10)",          icon: GitCommit },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl p-3.5" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}` }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg }}>
                    <Icon className="w-3 h-3" style={{ color: s.color }} />
                  </div>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── 2-컬럼 ── */}
          <div className="grid grid-cols-2 gap-3">

            {/* 최근 커밋 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(237,232,210,0.8)" }}>
                <GitCommit className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Recent Commits</p>
                <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                  {RECENT_COMMITS.length}
                </span>
              </div>
              <div>
                {RECENT_COMMITS.map((c, i) => (
                  <div
                    key={c.hash}
                    className="px-4 py-2.5 transition-colors hover:bg-black/[0.02] cursor-pointer"
                    style={{ borderBottom: i < RECENT_COMMITS.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: ACCENT_BG, color: ACCENT }}>
                        [{c.hash.slice(0, 7)}]
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(65,67,27,0.05)", color: TEXT_TERTIARY }}>
                        {c.branch}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium leading-snug mb-0.5 line-clamp-1" style={{ color: TEXT_PRIMARY }}>
                      {c.message}
                    </p>
                    <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{c.author} · {c.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 변경 파일 + 에이전트 */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(237,232,210,0.8)" }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: "#C09840" }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Recently Changed Files</p>
                </div>
                <div>
                  {RECENT_FILES.map((f, i) => {
                    const tc = FILE_TYPE_COLOR[f.type] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY };
                    const sc = STATUS_FILE[f.status] ?? { color: TEXT_TERTIARY, label: "?" };
                    const filename = f.path.split("\\").pop() ?? f.path;
                    return (
                      <div
                        key={f.path}
                        className="px-4 py-2 flex items-center gap-2.5 transition-colors hover:bg-black/[0.02] cursor-pointer"
                        style={{ borderBottom: i < RECENT_FILES.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                      >
                        <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: tc.bg, color: tc.color }}>
                          .{f.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate" style={{ color: TEXT_PRIMARY }}>{filename}</p>
                          <p className="text-[9px] truncate" style={{ color: TEXT_TERTIARY }}>{f.changed}</p>
                        </div>
                        <span className="text-[9px] font-bold shrink-0" style={{ color: sc.color }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent 요약 */}
              <div className="rounded-2xl p-3.5" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Agent Status</p>
                </div>
                <div className="space-y-2">
                  {AGENT_SUMMARY.map(a => (
                    <div key={a.name} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[a.status] }} />
                      <p className="text-[10px] flex-1 truncate" style={{ color: TEXT_PRIMARY }}>{a.name}</p>
                      {a.status === "running" ? (
                        <div className="flex items-center gap-1.5 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                          <Cpu className="w-2.5 h-2.5" />
                          <span style={{ color: a.cpu > 70 ? "#ef4444" : TEXT_SECONDARY }}>{a.cpu}%</span>
                          <span>{a.mem}MB</span>
                        </div>
                      ) : (
                        <span className="text-[9px] capitalize" style={{ color: STATUS_COLOR[a.status] }}>{a.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageLoader skeleton={<DashboardSkeleton />} delay={700}>
      {content}
    </PageLoader>
  );
}