import { useState, useRef, useEffect } from "react";
import { Bot, Cpu, MemoryStick, Play, Square, RotateCw, ChevronDown, Terminal, Circle, Filter } from "lucide-react";
import { PageLoader, TableSkeleton } from "./SkeletonLoader";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
} from "../colors";

// ── 에이전트 더미 데이터 ──
type AgentStatus = "running" | "idle" | "error" | "stopped";
type Agent = {
  id: string;
  name: string;
  shortName: string;
  status: AgentStatus;
  currentTask: string;
  cpu: number;
  mem: number;
  uptime: string;
  port: number;
  tasksCompleted: number;
  lastLog: string;
};

const INITIAL_AGENTS: Agent[] = [
  {
    id: "alpha",  name: "DataSync Alpha",    shortName: "AGT-01",
    status: "running", currentTask: "Fetching API endpoints from /api/v1/data",
    cpu: 38, mem: 412, uptime: "2h 14m", port: 8081, tasksCompleted: 142,
    lastLog: "[INFO] DataSync: Batch fetch complete. 48 records synced.",
  },
  {
    id: "beta",   name: "Classifier Beta",   shortName: "AGT-02",
    status: "running", currentTask: "Classifying user intent batch #47",
    cpu: 72, mem: 680, uptime: "2h 14m", port: 8082, tasksCompleted: 89,
    lastLog: "[WARN] ClassifierBeta: Memory usage at 83%. Consider scaling.",
  },
  {
    id: "gamma",  name: "Logger Gamma",      shortName: "AGT-03",
    status: "idle",    currentTask: "Waiting for task assignment",
    cpu: 2,  mem: 120, uptime: "2h 14m", port: 8083, tasksCompleted: 201,
    lastLog: "[INFO] LoggerGamma: Idle. Last flush at 09:41:02.",
  },
  {
    id: "delta",  name: "Parser Delta",      shortName: "AGT-04",
    status: "error",   currentTask: "JSON parse failed — retry #3",
    cpu: 0,  mem: 0,   uptime: "—",      port: 8084, tasksCompleted: 54,
    lastLog: "[ERROR] ParserDelta: Unexpected token '<' at pos 0. Aborting.",
  },
  {
    id: "epsilon",name: "Scheduler Epsilon", shortName: "AGT-05",
    status: "running", currentTask: "Scheduling task queue flush (T+30s)",
    cpu: 18, mem: 230, uptime: "2h 14m", port: 8085, tasksCompleted: 118,
    lastLog: "[INFO] SchedulerEps: Next flush in 28s. Queue depth: 12.",
  },
  {
    id: "zeta",   name: "Analyzer Zeta",     shortName: "AGT-06",
    status: "idle",    currentTask: "Analysis complete — standing by",
    cpu: 4,  mem: 98,  uptime: "2h 14m", port: 8086, tasksCompleted: 77,
    lastLog: "[INFO] AnalyzerZeta: Report generated. Awaiting next dataset.",
  },
];

// ── 에이전트별 로그 더미 ──
const AGENT_LOGS: Record<string, string[]> = {
  alpha:   ["[09:52:01] [INFO] DataSync: Batch fetch started (48 items)", "[09:51:58] [INFO] DataSync: Connected to /api/v1/data", "[09:50:00] [DEBUG] DataSync: Auth token refreshed"],
  beta:    ["[09:52:00] [WARN] ClassifierBeta: Memory at 83%", "[09:51:30] [INFO] ClassifierBeta: Batch #47 processing (12/48)", "[09:50:00] [INFO] ClassifierBeta: Model loaded OK"],
  gamma:   ["[09:41:02] [INFO] LoggerGamma: Flush complete. 0 pending.", "[09:30:00] [INFO] LoggerGamma: Idle mode entered", "[09:00:00] [INFO] LoggerGamma: Service started"],
  delta:   ["[09:52:05] [ERROR] ParserDelta: Unexpected token '<' at pos 0", "[09:52:03] [ERROR] ParserDelta: Retry #3 failed", "[09:52:01] [ERROR] ParserDelta: Retry #2 failed", "[09:52:00] [WARN] ParserDelta: Retry #1 started"],
  epsilon: ["[09:52:00] [INFO] SchedulerEps: Next flush T-28s. Queue: 12", "[09:51:30] [INFO] SchedulerEps: Flushed 8 tasks", "[09:50:00] [DEBUG] SchedulerEps: Heartbeat OK"],
  zeta:    ["[09:45:00] [INFO] AnalyzerZeta: Report saved to /reports/09.pdf", "[09:44:00] [INFO] AnalyzerZeta: Analysis complete", "[09:30:00] [INFO] AnalyzerZeta: Dataset loaded"],
};

const STATUS_META: Record<AgentStatus, { color: string; bg: string; label: string }> = {
  running: { color: "#5A8A4A", bg: "rgba(90,138,74,0.10)",   label: "Running" },
  idle:    { color: "#9A9B72", bg: "rgba(154,155,114,0.10)", label: "Idle"    },
  error:   { color: "#B85450", bg: "rgba(184,84,80,0.10)",   label: "Error"   },
  stopped: { color: "#888A62", bg: "rgba(136,138,98,0.10)",  label: "Stopped" },
};

// On/Off 토글 컴포넌트
function AgentToggle({ agent, onToggle }: { agent: Agent; onToggle: () => void }) {
  const isOn = agent.status === "running" || agent.status === "idle";
  return (
    <button
      onClick={onToggle}
      className="relative w-10 h-5 rounded-full transition-all shrink-0"
      style={{ background: isOn ? "#10b981" : "rgba(0,0,0,0.14)" }}
      title={isOn ? "Stop agent" : "Start agent"}
    >
      <div
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
        style={{ left: isOn ? "calc(100% - 1.125rem)" : "0.125rem" }}
      />
    </button>
  );
}

export function AgentControlPage() {
  const [agents, setAgents]           = useState(INITIAL_AGENTS);
  const [selectedAgent, setSelected]  = useState<string | null>(null);
  const [filterStatus, setFilter]     = useState<AgentStatus | "all">("all");
  const logRef = useRef<HTMLDivElement>(null);

  // 에이전트 토글 (running/idle ↔ stopped)
  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (a.status === "running" || a.status === "idle") {
        return { ...a, status: "stopped" as const, currentTask: "Stopped by user", cpu: 0, mem: 0, uptime: "—" };
      } else {
        return { ...a, status: "idle" as const, currentTask: "Starting up…", cpu: 2, mem: 80, uptime: "0m" };
      }
    }));
  };

  // 에이전트 재시작
  const restartAgent = (id: string) => {
    setAgents(prev => prev.map(a =>
      a.id === id ? { ...a, status: "idle" as const, currentTask: "Restarting…", cpu: 1, mem: 60, uptime: "0m" } : a
    ));
  };

  const filtered = filterStatus === "all"
    ? agents
    : agents.filter(a => a.status === filterStatus);

  const selectedAgentData = agents.find(a => a.id === selectedAgent);
  const logs = selectedAgent ? (AGENT_LOGS[selectedAgent] ?? []) : [];

  // 로그 패널 스크롤 최하단
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [selectedAgent]);

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: GRADIENT_ORB_2, filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden p-5 gap-4">
        <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 gap-4 overflow-hidden">

          {/* ── 헤더 + 필터 ── */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Agent Control</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                {agents.filter(a => a.status === "running").length}개 실행 중 ·{" "}
                {agents.filter(a => a.status === "error").length}개 오류
              </p>
            </div>
            {/* 상태 필터 */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
              {(["all", "running", "idle", "error", "stopped"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                  style={{
                    background: filterStatus === f ? "#1c1c1e" : "transparent",
                    color: filterStatus === f ? "rgba(255,255,255,0.9)" : TEXT_SECONDARY,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ── 에이전트 카드 목록 ── */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {filtered.map(agent => {
              const sm = STATUS_META[agent.status];
              const isSelected = selectedAgent === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelected(isSelected ? null : agent.id)}
                  className="rounded-2xl p-4 cursor-pointer transition-all"
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.78)",
                    border: isSelected ? "1.5px solid rgba(99,91,255,0.25)" : `1px solid ${BORDER}`,
                    backdropFilter: "blur(12px)",
                    boxShadow: isSelected ? "0 4px 16px rgba(99,91,255,0.08)" : "none",
                  }}
                >
                  {/* 헤더 행 */}
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
                        <Bot className="w-4 h-4" style={{ color: sm.color }} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{agent.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>{agent.shortName}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>
                            {sm.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* On/Off 토글 — 클릭 버블링 막기 */}
                    <div onClick={e => e.stopPropagation()}>
                      <AgentToggle agent={agent} onToggle={() => toggleAgent(agent.id)} />
                    </div>
                  </div>

                  {/* 현재 태스크 */}
                  <p className="text-[10px] mb-3 line-clamp-1 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                    {agent.currentTask}
                  </p>

                  {/* CPU / Memory 게이지 */}
                  <div className="space-y-1.5 mb-3">
                    {[
                      { label: "CPU",  value: agent.cpu, max: 100, color: agent.cpu > 70 ? "#ef4444" : ACCENT, unit: "%" },
                      { label: "Mem",  value: agent.mem, max: 1024, color: "#8b5cf6", unit: "MB" },
                    ].map(g => (
                      <div key={g.label} className="flex items-center gap-2">
                        <span className="text-[9px] w-6 shrink-0" style={{ color: TEXT_LABEL }}>{g.label}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (g.value / g.max) * 100)}%`, background: g.color }}
                          />
                        </div>
                        <span className="text-[9px] w-12 text-right font-mono shrink-0" style={{ color: g.color }}>
                          {g.value}{g.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 하단 메타 + 재시작 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <span>Port :{agent.port}</span>
                      <span>·</span>
                      <span>Up {agent.uptime}</span>
                      <span>·</span>
                      <span>{agent.tasksCompleted} tasks</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); restartAgent(agent.id); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all hover:bg-black/[0.06]"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      <RotateCw className="w-2.5 h-2.5" /> Restart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 개별 에이전트 로그 패널 (선택 시 표시) ── */}
          {selectedAgent && selectedAgentData && (
            <div
              className="rounded-2xl overflow-hidden flex flex-col shrink-0"
              style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
            >
              {/* 로그 헤더 */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 shrink-0"
                style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.85)" }}
              >
                <Terminal className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {selectedAgentData.name} — Agent Log
                </p>
                <span
                  className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: STATUS_META[selectedAgentData.status].bg, color: STATUS_META[selectedAgentData.status].color }}
                >
                  {STATUS_META[selectedAgentData.status].label}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[9px] ml-2 px-2 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                >
                  Close
                </button>
              </div>
              {/* 로그 내용 */}
              <div
                ref={logRef}
                className="p-4 overflow-y-auto font-mono text-[10px] leading-relaxed"
                style={{ maxHeight: 140, background: "#0d1117", color: "#c9d1d9" }}
              >
                {logs.map((line, i) => {
                  const isError = line.includes("[ERROR]");
                  const isWarn  = line.includes("[WARN]");
                  const isDebug = line.includes("[DEBUG]");
                  const color = isError ? "#f97583" : isWarn ? "#e3b341" : isDebug ? "#8b949e" : "#c9d1d9";
                  return (
                    <p key={i} style={{ color }}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return (
    <PageLoader 
      skeleton={<TableSkeleton rows={6} />}
      delay={600}
    >
      {content}
    </PageLoader>
  );
}