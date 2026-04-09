import { useState, useEffect, useRef } from "react";
import { Terminal, Play, Square, Trash2, Download, Filter, Search, Circle } from "lucide-react";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1,
} from "../colors";

// ── 로그 엔트리 타입 ──
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "STARTED";
type LogEntry = {
  id: number;
  time: string;
  level: LogLevel;
  thread: string;
  logger: string;
  message: string;
};

// ── 초기 더미 로그 (Spring Boot 부팅 시퀀스 시뮬레이션) ──
const BOOT_LOGS: Omit<LogEntry, "id">[] = [
  { time: "09:40:00.001", level: "INFO",    thread: "main",                logger: "o.s.boot.SpringApplication",          message: "Starting WeAiApplication using Java 17.0.18 with PID 12440" },
  { time: "09:40:00.015", level: "INFO",    thread: "main",                logger: "o.s.boot.SpringApplication",          message: "The following 1 profile is active: \"dev\"" },
  { time: "09:40:01.123", level: "INFO",    thread: "main",                logger: "o.s.c.a.ConfigurationClassParser",    message: "Cannot enhance @Configuration bean definitions" },
  { time: "09:40:01.456", level: "DEBUG",   thread: "main",                logger: "o.s.b.w.embedded.tomcat.TomcatWeb",  message: "Tomcat initialized with port 8080 (http)" },
  { time: "09:40:01.789", level: "INFO",    thread: "main",                logger: "o.a.coyote.http11.Http11NioProtocol", message: "Initializing ProtocolHandler [\"http-nio-8080\"]" },
  { time: "09:40:02.001", level: "INFO",    thread: "main",                logger: "o.s.b.w.embedded.tomcat.TomcatWeb",  message: "Tomcat started on port 8080 (http) with context path ''" },
  { time: "09:40:02.123", level: "INFO",    thread: "main",                logger: "c.weai.agent.MultiAgentController",   message: "Registering 6 agents: [DataSync, Classifier, Logger, Parser, Scheduler, Analyzer]" },
  { time: "09:40:02.234", level: "INFO",    thread: "agent-pool-1",        logger: "c.weai.agent.DataSyncAgent",          message: "DataSync Alpha — AGT-01 started on port 8081" },
  { time: "09:40:02.345", level: "INFO",    thread: "agent-pool-2",        logger: "c.weai.agent.ClassifierAgent",        message: "Classifier Beta — AGT-02 started on port 8082" },
  { time: "09:40:02.456", level: "INFO",    thread: "agent-pool-3",        logger: "c.weai.agent.LoggerAgent",            message: "Logger Gamma — AGT-03 started on port 8083" },
  { time: "09:40:02.567", level: "WARN",    thread: "agent-pool-4",        logger: "c.weai.agent.ParserAgent",            message: "Parser Delta — AGT-04 failed to initialize. Retry in 5s." },
  { time: "09:40:02.678", level: "INFO",    thread: "agent-pool-5",        logger: "c.weai.agent.SchedulerAgent",         message: "Scheduler Epsilon — AGT-05 started on port 8085" },
  { time: "09:40:02.789", level: "INFO",    thread: "agent-pool-6",        logger: "c.weai.agent.AnalyzerAgent",          message: "Analyzer Zeta — AGT-06 started on port 8086" },
  { time: "09:40:03.001", level: "STARTED", thread: "main",                logger: "o.s.boot.SpringApplication",          message: "Started WeAiApplication in 3.001 seconds (process running for 3.512)" },
  { time: "09:40:07.001", level: "ERROR",   thread: "agent-pool-4",        logger: "c.weai.agent.ParserAgent",            message: "ParserDelta: Unexpected token '<' at position 0. IOException." },
  { time: "09:41:00.000", level: "INFO",    thread: "scheduler-1",         logger: "c.weai.agent.SchedulerAgent",         message: "Task queue flush: 8 tasks dispatched in 340ms." },
  { time: "09:50:00.000", level: "DEBUG",   thread: "agent-pool-1",        logger: "c.weai.agent.DataSyncAgent",          message: "DataSync: Auth token refreshed. TTL=3600s." },
  { time: "09:51:30.000", level: "INFO",    thread: "agent-pool-2",        logger: "c.weai.agent.ClassifierAgent",        message: "Classifier: Batch #47 processing (12/48 records)." },
  { time: "09:52:00.000", level: "WARN",    thread: "agent-pool-2",        logger: "c.weai.agent.ClassifierAgent",        message: "ClassifierBeta: Memory usage at 83%. Consider increasing heap." },
  { time: "09:52:01.000", level: "INFO",    thread: "agent-pool-1",        logger: "c.weai.agent.DataSyncAgent",          message: "DataSync: Batch fetch complete. 48 records synced to database." },
];

// 실시간 스트리밍 더미 로그 (주기적으로 추가)
const STREAMING_LOGS: Omit<LogEntry, "id">[] = [
  { time: "", level: "INFO",  thread: "scheduler-1",  logger: "c.weai.agent.SchedulerAgent",  message: "Task queue flush: 12 tasks dispatched in 285ms."             },
  { time: "", level: "DEBUG", thread: "agent-pool-1",  logger: "c.weai.agent.DataSyncAgent",   message: "DataSync: Heartbeat OK. Latency: 12ms."                      },
  { time: "", level: "INFO",  thread: "agent-pool-5",  logger: "c.weai.agent.SchedulerAgent",  message: "Next scheduled flush in 30s. Queue depth: 5."                },
  { time: "", level: "INFO",  thread: "agent-pool-2",  logger: "c.weai.agent.ClassifierAgent", message: "Batch #48 started. 48 records loaded."                       },
  { time: "", level: "WARN",  thread: "agent-pool-4",  logger: "c.weai.agent.ParserAgent",     message: "ParserDelta: Retry #4 scheduled in 10s."                     },
  { time: "", level: "INFO",  thread: "agent-pool-6",  logger: "c.weai.agent.AnalyzerAgent",   message: "AnalyzerZeta: New dataset received. Processing…"             },
  { time: "", level: "DEBUG", thread: "http-nio-8080-exec-3", logger: "c.weai.controller.AgentApi", message: "GET /api/agents/status — 200 OK (4ms)"               },
  { time: "", level: "INFO",  thread: "agent-pool-1",  logger: "c.weai.agent.DataSyncAgent",   message: "DataSync: Delta sync complete. 8 new records."               },
];

const LOG_COLORS: Record<LogLevel, { fg: string; tag: string }> = {
  INFO:    { fg: "#c9d1d9",  tag: "#58a6ff" },
  WARN:    { fg: "#e3b341",  tag: "#e3b341" },
  ERROR:   { fg: "#f97583",  tag: "#f97583" },
  DEBUG:   { fg: "#8b949e",  tag: "#8b949e" },
  STARTED: { fg: "#7ee787",  tag: "#7ee787" },
};

function getTime() {
  return new Date().toTimeString().split(" ")[0] + "." + String(Date.now() % 1000).padStart(3, "0");
}

export function ServerLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(BOOT_LOGS.map((l, i) => ({ ...l, id: i })));
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState<LogLevel | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef  = useRef(BOOT_LOGS.length);
  const streamIdx = useRef(0);

  // 실시간 로그 스트리밍 시뮬레이션
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const template = STREAMING_LOGS[streamIdx.current % STREAMING_LOGS.length];
      streamIdx.current++;
      setLogs(prev => [
        ...prev,
        { ...template, id: idRef.current++, time: getTime() },
      ]);
    }, 2500);
    return () => clearInterval(interval);
  }, [running]);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
    idRef.current = 0;
  };

  const filteredLogs = logs.filter(l => {
    const matchLevel  = filter === "ALL" || l.level === filter;
    const matchSearch = search === "" ||
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.logger.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const errorCount = logs.filter(l => l.level === "ERROR").length;
  const warnCount  = logs.filter(l => l.level === "WARN").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,152,64,0.14) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden p-5 gap-4">
        <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 gap-3 overflow-hidden">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Server Logs</h1>
                {running && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                <span style={{ color: "#f97583" }}>{errorCount} errors</span> · <span style={{ color: "#e3b341" }}>{warnCount} warnings</span> · {logs.length} total
              </p>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRunning(r => !r)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: running ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)",
                  color: running ? "#ef4444" : "#10b981",
                  border: `1px solid ${running ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"}`,
                }}
              >
                {running ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {running ? "Pause" : "Resume"}
              </button>
              <button
                onClick={clearLogs}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* ── 필터 + 검색 바 ── */}
          <div
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl shrink-0 flex-wrap"
            style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
          >
            {/* 레벨 필터 */}
            <div className="flex items-center gap-1">
              {(["ALL", "INFO", "WARN", "ERROR", "DEBUG"] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase transition-all"
                  style={{
                    background: filter === lvl ? "#1c1c1e" : "rgba(0,0,0,0.05)",
                    color: filter === lvl ? "rgba(255,255,255,0.9)"
                      : lvl === "ERROR" ? "#ef4444"
                      : lvl === "WARN"  ? "#e3b341"
                      : lvl === "DEBUG" ? "#8b949e"
                      : TEXT_SECONDARY,
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
            {/* 구분선 */}
            <div className="w-px h-4" style={{ background: BORDER }} />
            {/* 검색 */}
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter logs..."
                className="w-full pl-7 pr-3 py-1 text-[10px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </div>
            {/* 자동 스크롤 */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px]" style={{ color: TEXT_SECONDARY }}>
              <div
                onClick={() => setAutoScroll(v => !v)}
                className="w-7 h-4 rounded-full transition-colors relative cursor-pointer"
                style={{ background: autoScroll ? "#635bff" : "rgba(0,0,0,0.12)" }}
              >
                <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all" style={{ left: autoScroll ? "calc(100% - 0.875rem)" : "0.125rem" }} />
              </div>
              Auto-scroll
            </label>
          </div>

          {/* ── 로그 패널 ── */}
          <div
            className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#0d1117", border: `1px solid rgba(255,255,255,0.06)`, minHeight: 0 }}
          >
            {/* 터미널 타이틀바 */}
            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#161b22" }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28ca41" }} />
              <span className="ml-2 text-[10px] font-mono" style={{ color: "#8b949e" }}>
                ./gradlew.bat bootRun --args='--spring.profiles.active=dev'
              </span>
              <span className="ml-auto text-[9px]" style={{ color: "#8b949e" }}>
                {filteredLogs.length}/{logs.length} lines
              </span>
            </div>

            {/* 로그 본문 */}
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed"
              style={{ color: "#c9d1d9" }}
            >
              {filteredLogs.length === 0 ? (
                <p style={{ color: "#8b949e" }}>No log entries match the current filter.</p>
              ) : (
                filteredLogs.map(log => {
                  const col = LOG_COLORS[log.level];
                  return (
                    <div key={log.id} className="flex gap-2 mb-0.5 hover:bg-white/[0.03] px-1 rounded">
                      {/* 시간 */}
                      <span className="shrink-0 w-28" style={{ color: "#8b949e" }}>{log.time}</span>
                      {/* 레벨 */}
                      <span className="shrink-0 w-14 font-bold" style={{ color: col.tag }}>{log.level.padEnd(7)}</span>
                      {/* 스레드 */}
                      <span className="shrink-0 w-24 truncate" style={{ color: "#6e7681" }}>[{log.thread}]</span>
                      {/* 로거 (축약) */}
                      <span className="shrink-0 w-32 truncate" style={{ color: "#6e7681" }}>
                        {log.logger.length > 25 ? "..." + log.logger.slice(-22) : log.logger}
                      </span>
                      {/* 메시지 */}
                      <span style={{ color: col.fg }}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}