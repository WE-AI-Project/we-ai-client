import { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Play, Square, Trash2, Search, RefreshCw, Wifi, WifiOff } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1,
} from "../colors";
import {
  LogLevel,
  ServerLogEntry,
  fetchRecentServerLogs,
  getServerLogStreamUrl,
} from "../lib/api";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

function DarkSkeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/10 ${className || ""}`}
      style={style}
    />
  );
}

const LOG_COLORS: Record<string, { fg: string; tag: string }> = {
  INFO:    { fg: "#c9d1d9", tag: "#58a6ff" },
  WARN:    { fg: "#e3b341", tag: "#e3b341" },
  ERROR:   { fg: "#f97583", tag: "#f97583" },
  DEBUG:   { fg: "#8b949e", tag: "#8b949e" },
  TRACE:   { fg: "#6e7681", tag: "#6e7681" },
  STARTED: { fg: "#7ee787", tag: "#7ee787" },
};

type ConnectionState = "connecting" | "live" | "paused" | "offline";

interface ServerLogsPageProps {
  projectId?: number | null;
}

export function ServerLogsPage({ projectId }: ServerLogsPageProps) {
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [running, setRunning] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [filter, setFilter] = useState<LogLevel | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. 초기 로그 REST API 로딩 (빠른 초기 화면 렌더링)
  const loadInitialLogs = useCallback(async () => {
    try {
      const recent = await fetchRecentServerLogs(projectId);
      if (Array.isArray(recent) && recent.length > 0) {
        setLogs(recent);
      }
    } catch {
      // REST API 실패 시 SSE init 이벤트로 fallback
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadInitialLogs();
  }, [loadInitialLogs]);

  // 2. 실시간 SSE (Server-Sent Events) 스트림 연결
  useEffect(() => {
    if (!running) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionState("paused");
      return;
    }

    setConnectionState("connecting");

    const connectSse = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = getServerLogStreamUrl(projectId);
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionState("live");
        setIsLoading(false);
      };

      // init 이벤트: 서버 버퍼에 쌓여있던 최근 로그 일괄 수신
      es.addEventListener("init", (event: MessageEvent) => {
        try {
          const initialLogs: ServerLogEntry[] = JSON.parse(event.data);
          if (Array.isArray(initialLogs)) {
            setLogs(initialLogs);
          }
        } catch (e) {
          console.error("Failed to parse initial logs", e);
        } finally {
          setIsLoading(false);
        }
      });

      // log 이벤트: 실시간 신규 발생 로그 수신
      es.addEventListener("log", (event: MessageEvent) => {
        try {
          const newLog: ServerLogEntry = JSON.parse(event.data);
          setLogs((prev) => {
            // 중복 방지 (id 기준)
            if (prev.some((l) => l.id === newLog.id)) {
              return prev;
            }
            return [...prev.slice(-999), newLog];
          });
        } catch (e) {
          console.error("Failed to parse server log event", e);
        }
      });

      // fallback 일반 메시지 핸들러
      es.onmessage = (event: MessageEvent) => {
        try {
          const parsed: ServerLogEntry = JSON.parse(event.data);
          if (parsed && typeof parsed === "object" && "level" in parsed) {
            setLogs((prev) => [...prev.slice(-999), parsed]);
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        setConnectionState("offline");
        es.close();
        eventSourceRef.current = null;

        // 실행 중인 경우 5초 후 자동 재연결 시도
        if (running) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSse();
          }, 5000);
        }
      };
    };

    connectSse();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [running, projectId]);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && logRef.current && !isLoading) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isLoading]);

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((l) => {
    const matchLevel = filter === "ALL" || l.level === filter;
    const matchSearch =
      search === "" ||
      (l.message && l.message.toLowerCase().includes(search.toLowerCase())) ||
      (l.logger && l.logger.toLowerCase().includes(search.toLowerCase())) ||
      (l.thread && l.thread.toLowerCase().includes(search.toLowerCase()));
    return matchLevel && matchSearch;
  });

  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount = logs.filter((l) => l.level === "WARN").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "45%",
            height: "45%",
            borderRadius: "50%",
            background: GRADIENT_ORB_1,
            filter: "blur(50px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-5%",
            width: "50%",
            height: "50%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(192,152,64,0.14) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden p-5 gap-4">
        <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 gap-3 overflow-hidden">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Server Logs</h1>
                
                {/* 실시간 연결 상태 배지 */}
                {connectionState === "live" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    LIVE STREAM
                  </span>
                )}
                {connectionState === "connecting" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    CONNECTING
                  </span>
                )}
                {connectionState === "paused" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400">
                    PAUSED
                  </span>
                )}
                {connectionState === "offline" && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                    <WifiOff className="w-2.5 h-2.5" />
                    OFFLINE
                  </span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-48 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  <span style={{ color: "#f97583" }}>{errorCount} errors</span> · <span style={{ color: "#e3b341" }}>{warnCount} warnings</span> · {logs.length} total captured
                </p>
              )}
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </>
              ) : (
                <>
                  <button
                    onClick={() => setRunning((r) => !r)}
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:bg-black/[0.05]"
                    style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── 필터 + 검색 바 ── */}
          <div
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl shrink-0 flex-wrap"
            style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
          >
            {isLoading ? (
              <div className="flex items-center gap-3 w-full">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-10 rounded" />
                  ))}
                </div>
                <div className="w-px h-4" style={{ background: BORDER }} />
                <Skeleton className="flex-1 h-6 rounded-lg" />
                <Skeleton className="w-20 h-5" />
              </div>
            ) : (
              <>
                {/* 레벨 필터 */}
                <div className="flex items-center gap-1">
                  {(["ALL", "INFO", "WARN", "ERROR", "DEBUG"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilter(lvl)}
                      className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase transition-all"
                      style={{
                        background: filter === lvl ? "#1c1c1e" : "rgba(0,0,0,0.05)",
                        color:
                          filter === lvl
                            ? "rgba(255,255,255,0.9)"
                            : lvl === "ERROR"
                            ? "#ef4444"
                            : lvl === "WARN"
                            ? "#e3b341"
                            : lvl === "DEBUG"
                            ? "#8b949e"
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
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3"
                    style={{ color: TEXT_TERTIARY }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter logs by message, logger, thread..."
                    className="w-full pl-7 pr-3 py-1 text-[10px] rounded-lg outline-none transition-colors"
                    style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT + "50")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
                  />
                </div>
                {/* 자동 스크롤 */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px]" style={{ color: TEXT_SECONDARY }}>
                  <div
                    onClick={() => setAutoScroll((v) => !v)}
                    className="w-7 h-4 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: autoScroll ? "#635bff" : "rgba(0,0,0,0.12)" }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all"
                      style={{ left: autoScroll ? "calc(100% - 0.875rem)" : "0.125rem" }}
                    />
                  </div>
                  Auto-scroll
                </label>
              </>
            )}
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
              {isLoading ? (
                <DarkSkeleton className="ml-2 h-2.5 w-64" />
              ) : (
                <span className="ml-2 text-[10px] font-mono" style={{ color: "#8b949e" }}>
                  Spring Boot Logback Stream (SSE)
                </span>
              )}
              {!isLoading && (
                <span className="ml-auto text-[9px]" style={{ color: "#8b949e" }}>
                  {filteredLogs.length}/{logs.length} lines
                </span>
              )}
            </div>

            {/* 로그 본문 */}
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed select-text"
              style={{ color: "#c9d1d9" }}
            >
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <DarkSkeleton className="w-20 h-2.5" />
                      <DarkSkeleton className="w-10 h-2.5" />
                      <DarkSkeleton className="w-24 h-2.5" />
                      <DarkSkeleton className="flex-1 h-2.5" />
                    </div>
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-8 text-center" style={{ color: "#8b949e" }}>
                  {connectionState === "offline" ? (
                    <p>백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.</p>
                  ) : (
                    <p>수신된 로그가 없거나 필터 조건에 일치하는 로그가 없습니다.</p>
                  )}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const col = LOG_COLORS[log.level] || LOG_COLORS.INFO;
                  return (
                    <div
                      key={log.id}
                      className="flex gap-2 mb-0.5 hover:bg-white/[0.03] px-1 rounded transition-colors"
                    >
                      {/* 시간 */}
                      <span className="shrink-0 w-28 text-left" style={{ color: "#8b949e" }}>
                        {log.time}
                      </span>
                      {/* 레벨 */}
                      <span className="shrink-0 w-14 font-bold" style={{ color: col.tag }}>
                        {(log.level || "INFO").padEnd(7)}
                      </span>
                      {/* 스레드 */}
                      <span className="shrink-0 w-28 truncate" style={{ color: "#6e7681" }}>
                        [{log.thread || "main"}]
                      </span>
                      {/* 로거 (축약) */}
                      <span
                        className="shrink-0 w-36 truncate"
                        style={{ color: "#6e7681" }}
                        title={log.logger}
                      >
                        {log.logger && log.logger.length > 28
                          ? "..." + log.logger.slice(-25)
                          : log.logger || "system"}
                      </span>
                      {/* 메시지 */}
                      <span className="break-all whitespace-pre-wrap" style={{ color: col.fg }}>
                        {log.message}
                      </span>
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
