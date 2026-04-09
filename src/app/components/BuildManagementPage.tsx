import { useState, useEffect, useRef } from "react";
import { Hammer, Play, Square, CheckCircle2, XCircle, Clock, RotateCw, Circle } from "lucide-react";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
} from "../colors";

// ── Gradle 태스크 목록 ──
type TaskStatus = "idle" | "running" | "success" | "failed";
type GradleTask = {
  id: string;
  name: string;
  command: string;
  desc: string;
  group: string;
  lastRun: string;
  lastStatus: TaskStatus;
  duration: string;
};

const GRADLE_TASKS: GradleTask[] = [
  { id: "bootrun", name: "bootRun",         command: "./gradlew.bat bootRun",                         desc: "Spring Boot 앱 실행 (dev profile)",          group: "application", lastRun: "Today 09:40", lastStatus: "success", duration: "3.5s" },
  { id: "build",   name: "build",           command: "./gradlew.bat build",                           desc: "프로젝트 전체 빌드 (컴파일 + 테스트 + jar)",   group: "build",       lastRun: "Today 09:35", lastStatus: "success", duration: "18.2s"},
  { id: "test",    name: "test",            command: "./gradlew.bat test",                            desc: "단위/통합 테스트 실행",                         group: "verification",lastRun: "Today 09:30", lastStatus: "failed",  duration: "12.4s"},
  { id: "clean",   name: "clean",           command: "./gradlew.bat clean",                           desc: "build/ 디렉토리 삭제",                         group: "build",       lastRun: "Today 09:35", lastStatus: "success", duration: "0.8s" },
  { id: "deps",    name: "dependencies",    command: "./gradlew.bat dependencies",                    desc: "의존성 트리 출력",                             group: "help",        lastRun: "Yesterday",   lastStatus: "success", duration: "2.1s" },
  { id: "brun-dev",name: "bootRun (dev)",   command: "$env:SPRING_PROFILES_ACTIVE='dev'; ./gradlew.bat bootRun", desc: "dev 프로파일 강제 지정 후 실행",  group: "application", lastRun: "Today 09:38", lastStatus: "success", duration: "3.7s" },
  { id: "jar",     name: "bootJar",         command: "./gradlew.bat bootJar",                         desc: "실행 가능한 Spring Boot JAR 생성",             group: "build",       lastRun: "Yesterday",   lastStatus: "success", duration: "11.8s"},
  { id: "lint",    name: "checkstyle",      command: "./gradlew.bat checkstyleMain",                  desc: "Java 코드 스타일 검사",                        group: "verification",lastRun: "2d ago",      lastStatus: "failed",  duration: "4.3s" },
];

// ── 빌드 로그 더미 데이터 ──
const BUILD_LOGS: Record<string, string[]> = {
  bootrun: [
    "> Task :compileJava UP-TO-DATE",
    "> Task :processResources UP-TO-DATE",
    "> Task :classes UP-TO-DATE",
    "> Task :bootRun",
    "  .   ____          _            __ _ _",
    " /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\",
    "( ( )\\___ | '_ | '_| | '_ \\/ _` | \\ \\ \\ \\",
    " \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )",
    "  '  |____| .__|_| |_|_| |_\\__, | / / / /",
    " =========|_|==============|___/=/_/_/_/",
    " :: Spring Boot ::                (v3.2.5)",
    "",
    "Started WeAiApplication in 3.001 seconds",
  ],
  test: [
    "> Task :compileJava UP-TO-DATE",
    "> Task :compileTestJava",
    "> Task :test",
    "  MultiAgentControllerTest > testAgentHandshake() PASSED",
    "  MultiAgentControllerTest > testAgentDispatch() PASSED",
    "  ParserAgentTest > testJsonParse() FAILED",
    "    com.weai.agent.ParserDelta$JsonParseException",
    "    Expected no exception to be thrown, but got JsonParseException",
    "  DataSyncAgentTest > testBatchFetch() PASSED",
    "",
    "3 tests completed, 1 failed",
    "> BUILD FAILED",
  ],
  build: [
    "> Task :compileJava",
    "> Task :processResources",
    "> Task :classes",
    "> Task :bootJar",
    "> Task :jar",
    "> Task :assemble",
    "> Task :compileTestJava",
    "> Task :test SKIPPED",
    "> Task :check SKIPPED",
    "> Task :build",
    "",
    "BUILD SUCCESSFUL in 18s",
    "5 actionable tasks: 5 executed",
  ],
};

const STATUS_META: Record<TaskStatus, { color: string; bg: string; icon: any; label: string }> = {
  idle:    { color: "#9A9B72", bg: "rgba(154,155,114,0.10)", icon: Circle,       label: "Idle"    },
  running: { color: ACCENT,   bg: "rgba(65,67,27,0.10)",    icon: RotateCw,     label: "Running" },
  success: { color: "#5A8A4A", bg: "rgba(90,138,74,0.10)",  icon: CheckCircle2, label: "Success" },
  failed:  { color: "#B85450", bg: "rgba(184,84,80,0.10)",  icon: XCircle,      label: "Failed"  },
};

const GROUP_COLOR: Record<string, { color: string; bg: string }> = {
  application:  { color: ACCENT,    bg: "rgba(65,67,27,0.08)"    },
  build:        { color: "#5A8A4A", bg: "rgba(90,138,74,0.08)"   },
  verification: { color: "#C09840", bg: "rgba(192,152,64,0.08)"  },
  help:         { color: "#888A62", bg: "rgba(136,138,98,0.08)"  },
};

export function BuildManagementPage() {
  const [tasks, setTasks]       = useState(GRADLE_TASKS);
  const [runningTask, setRunning] = useState<string | null>(null);
  const [logTask, setLogTask]   = useState<string | null>("bootrun");
  const [progress, setProgress] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  // 태스크 실행 시뮬레이션
  const runTask = (id: string) => {
    if (runningTask) return; // 이미 실행 중이면 무시
    setRunning(id);
    setLogTask(id);
    setProgress(0);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, lastStatus: "running" as const } : t));

    const duration = GRADLE_TASKS.find(t => t.id === id)?.duration ?? "5s";
    const ms = parseFloat(duration) * 1000;

    // 진행 바 애니메이션
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min(100, (elapsed / ms) * 100));
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const nextStatus: TaskStatus = id === "test" || id === "lint" ? "failed" : "success";
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, lastStatus: nextStatus, lastRun: "Just now" } : t
      ));
      setRunning(null);
      setProgress(0);
    }, ms);
  };

  // 로그 자동 스크롤
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logTask]);

  const logs = logTask ? (BUILD_LOGS[logTask] ?? []) : [];
  const logTaskData = tasks.find(t => t.id === logTask);
  const isRunningCurrent = runningTask === logTask;

  const successCount = tasks.filter(t => t.lastStatus === "success").length;
  const failedCount  = tasks.filter(t => t.lastStatus === "failed").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#FFFFFF" }}>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4" style={{ color: "#f59e0b" }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Build Management</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                Gradle 태스크 실행 · 빌드 상태 · 출력 로그
              </p>
            </div>
            {/* 요약 배지 */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-lg font-semibold" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981" }}>
                {successCount} passed
              </span>
              <span className="px-2 py-1 rounded-lg font-semibold" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
                {failedCount} failed
              </span>
            </div>
          </div>

          {/* ── 진행 바 (태스크 실행 중) ── */}
          {runningTask && (
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
              <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: "rgba(65,67,27,0.20)", borderTopColor: ACCENT }} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold mb-1" style={{ color: ACCENT }}>
                  Running: {tasks.find(t => t.id === runningTask)?.name}
                </p>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(65,67,27,0.10)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: ACCENT }} />
                </div>
              </div>
              <span className="text-[10px] font-mono shrink-0" style={{ color: ACCENT }}>{Math.round(progress)}%</span>
            </div>
          )}

          {/* ── 태스크 목록 ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAF8", border: `1px solid ${BORDER}` }}>
            {/* 헤더 */}
            <div
              className="grid px-4 py-2.5 text-[10px] font-semibold"
              style={{ gridTemplateColumns: "1fr 80px 90px 90px 80px", borderBottom: `1px solid ${BORDER}`, background: "#F2F1EE", color: TEXT_LABEL }}
            >
              <span>Task</span>
              <span>Group</span>
              <span>Last Run</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {tasks.map((task, i) => {
              const sm  = STATUS_META[task.lastStatus];
              const StatusIcon = sm.icon;
              const gc  = GROUP_COLOR[task.group] ?? { color: TEXT_SECONDARY, bg: "rgba(0,0,0,0.05)" };
              const isActive = logTask === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setLogTask(isActive ? null : task.id)}
                  className="grid px-4 py-3 items-center cursor-pointer transition-colors hover:bg-black/[0.02]"
                  style={{
                    gridTemplateColumns: "1fr 80px 90px 90px 80px",
                    borderBottom: i < tasks.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                    background: isActive ? ACCENT_BG : "transparent",
                  }}
                >
                  {/* 태스크명 + 설명 */}
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{task.name}</p>
                    <p className="text-[9px] truncate" style={{ color: TEXT_TERTIARY }}>{task.desc}</p>
                  </div>

                  {/* 그룹 */}
                  <span className="text-[9px] font-semibold capitalize px-1.5 py-0.5 rounded" style={{ background: gc.bg, color: gc.color }}>
                    {task.group}
                  </span>

                  {/* 마지막 실행 시간 */}
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
                    <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{task.lastRun}</span>
                  </div>

                  {/* 상태 */}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-3 h-3 ${task.lastStatus === "running" ? "animate-spin" : ""}`} style={{ color: sm.color }} />
                    <span className="text-[9px] font-semibold" style={{ color: sm.color }}>{sm.label}</span>
                    {task.lastStatus !== "idle" && task.lastStatus !== "running" && (
                      <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>({task.duration})</span>
                    )}
                  </div>

                  {/* 실행 버튼 */}
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => runTask(task.id)}
                      disabled={!!runningTask}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all"
                      style={{
                        background: runningTask
                          ? "rgba(65,67,27,0.04)"
                          : ACCENT_BG,
                        color: runningTask ? TEXT_TERTIARY : ACCENT,
                        cursor: runningTask ? "not-allowed" : "pointer",
                        border: runningTask ? `1px solid ${BORDER}` : `1px solid ${ACCENT_BORDER}`,
                      }}
                    >
                      <Play className="w-2.5 h-2.5" /> Run
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 빌드 로그 패널 ── */}
          {logTask && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#1E1F0A", border: `1px solid rgba(255,255,255,0.06)` }}>
              {/* 헤더 */}
              <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#2A2C10" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28ca41" }} />
                <span className="ml-2 text-[10px] font-mono" style={{ color: "#8b949e" }}>
                  {logTaskData?.command}
                </span>
                {isRunningCurrent && (
                  <span className="ml-auto text-[9px] animate-pulse" style={{ color: ACCENT }}>● Running</span>
                )}
                {logTaskData && !isRunningCurrent && (
                  <span
                    className="ml-auto text-[9px] font-semibold"
                    style={{ color: STATUS_META[logTaskData.lastStatus].color }}
                  >
                    {STATUS_META[logTaskData.lastStatus].label}
                  </span>
                )}
              </div>
              {/* 로그 내용 */}
              <div ref={logRef} className="p-4 font-mono text-[10px] leading-relaxed overflow-y-auto" style={{ maxHeight: 200, color: "#c9d1d9" }}>
                {isRunningCurrent ? (
                  <p className="animate-pulse" style={{ color: ACCENT }}>Running {logTaskData?.name}… please wait.</p>
                ) : (
                  logs.map((line, i) => {
                    const isFail    = line.includes("FAILED") || line.includes("FAILED");
                    const isSuccess = line.includes("SUCCESSFUL") || line.includes("PASSED");
                    const isTask    = line.startsWith("> Task");
                    const color     = isFail ? "#f97583" : isSuccess ? "#7ee787" : isTask ? "#79c0ff" : "#c9d1d9";
                    return <p key={i} style={{ color }}>{line || "\u00a0"}</p>;
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}