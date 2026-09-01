import { useState, useEffect, useRef, useCallback } from "react";
import { Hammer, Play, CheckCircle2, XCircle, Clock, RotateCw, Circle, RefreshCw, Terminal } from "lucide-react";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
} from "../colors";
import {
  BuildTaskItem,
  fetchBuildTasks,
  executeBuildTask,
} from "../lib/api";

type TaskStatus = "idle" | "running" | "success" | "failed";

type GradleTaskView = {
  id: string;
  name: string;
  command: string;
  desc: string;
  group: string;
  lastRun: string;
  lastStatus: TaskStatus;
  duration: string;
};

const DEFAULT_GRADLE_TASKS: GradleTaskView[] = [
  { id: "bootRun", name: "bootRun", command: "./gradlew.bat bootRun", desc: "Spring Boot 앱 실행", group: "application", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "build", name: "build", command: "./gradlew.bat build", desc: "프로젝트 전체 빌드 (컴파일 + 테스트 + jar)", group: "build", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "test", name: "test", command: "./gradlew.bat test", desc: "단위/통합 테스트 실행", group: "verification", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "clean", name: "clean", command: "./gradlew.bat clean", desc: "build/ 디렉토리 삭제", group: "build", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "dependencies", name: "dependencies", command: "./gradlew.bat dependencies", desc: "의존성 트리 출력", group: "help", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "bootJar", name: "bootJar", command: "./gradlew.bat bootJar", desc: "실행 가능한 Spring Boot JAR 생성", group: "build", lastRun: "—", lastStatus: "idle", duration: "—" },
  { id: "check", name: "check", command: "./gradlew.bat check", desc: "코드 검증 태스크 실행", group: "verification", lastRun: "—", lastStatus: "idle", duration: "—" },
];

const STATUS_META: Record<TaskStatus, { color: string; bg: string; icon: any; label: string }> = {
  idle:    { color: "#9A9B72", bg: "rgba(154,155,114,0.10)", icon: Circle,       label: "Idle"    },
  running: { color: ACCENT,   bg: "rgba(65,67,27,0.10)",    icon: RotateCw,     label: "Running" },
  success: { color: "#5A8A4A", bg: "rgba(90,138,74,0.10)",  icon: CheckCircle2, label: "Success" },
  failed:  { color: "#B85450", bg: "rgba(184,84,80,0.10)",  icon: XCircle,      label: "Failed"  },
};

const GROUP_COLOR: Record<string, { color: string; bg: string }> = {
  application:  { color: ACCENT,    bg: "rgba(65,67,27,0.08)"    },
  run:          { color: ACCENT,    bg: "rgba(65,67,27,0.08)"    },
  build:        { color: "#5A8A4A", bg: "rgba(90,138,74,0.08)"   },
  verification: { color: "#C09840", bg: "rgba(192,152,64,0.08)"  },
  test:         { color: "#C09840", bg: "rgba(192,152,64,0.08)"  },
  help:         { color: "#888A62", bg: "rgba(136,138,98,0.08)"  },
  info:         { color: "#888A62", bg: "rgba(136,138,98,0.08)"  },
};

interface BuildManagementPageProps {
  projectId?: number | null;
}

export function BuildManagementPage({ projectId }: BuildManagementPageProps) {
  const [tasks, setTasks] = useState<GradleTaskView[]>(DEFAULT_GRADLE_TASKS);
  const [buildTool, setBuildTool] = useState<string>("GRADLE");
  const [runningTask, setRunning] = useState<string | null>(null);
  const [logTask, setLogTask] = useState<string | null>("build");
  const [buildLogs, setBuildLogs] = useState<Record<string, string[]>>({});
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. 실제 지원되는 빌드 태스크 목록 로드
  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetchBuildTasks(projectId);
      if (response && response.tasks && response.tasks.length > 0) {
        setBuildTool(response.buildTool || "GRADLE");
        setTasks((prev) =>
          response.tasks.map((apiTask: BuildTaskItem) => {
            const existing = prev.find((t) => t.id === apiTask.taskName || t.name === apiTask.taskName);
            return {
              id: apiTask.taskName,
              name: apiTask.taskName,
              command: apiTask.command,
              desc: apiTask.description || apiTask.displayName,
              group: (apiTask.category || "build").toLowerCase(),
              lastRun: existing?.lastRun || "—",
              lastStatus: existing?.lastStatus || "idle",
              duration: existing?.duration || "—",
            };
          })
        );
      }
    } catch {
      // 실패 시 기본 태스크 목록 유지
    } finally {
      setIsLoadingTasks(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 2. 실제 백엔드 빌드 태스크 프로세스 실행
  const runTask = async (taskName: string) => {
    if (runningTask) return; // 이미 실행 중이면 무시

    setRunning(taskName);
    setLogTask(taskName);
    setElapsedSec(0);

    // 실행 상태로 갱신
    setTasks((prev) =>
      prev.map((t) => (t.id === taskName ? { ...t, lastStatus: "running" as const } : t))
    );

    // 실행 시작 시각 기록 및 타이머 가동
    const startMs = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 500);

    try {
      const result = await executeBuildTask(taskName, projectId);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const nextStatus: TaskStatus = result.status === "SUCCESS" ? "success" : "failed";
      const duration = result.duration || `${((Date.now() - startMs) / 1000).toFixed(2)}s`;
      const executedAt = result.executedAt ? `Today ${result.executedAt}` : "Just now";

      // 로그 저장
      setBuildLogs((prev) => ({
        ...prev,
        [taskName]: result.logs && result.logs.length > 0 ? result.logs : ["(No output produced)"],
      }));

      // 상태 업데이트
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskName
            ? {
                ...t,
                command: result.command || t.command,
                lastStatus: nextStatus,
                lastRun: executedAt,
                duration,
              }
            : t
        )
      );
    } catch (error: any) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const errorMsg = error?.message || "빌드 태스크 실행 중 오류가 발생했습니다.";
      setBuildLogs((prev) => ({
        ...prev,
        [taskName]: [
          `[ERROR] Build execution failed: ${errorMsg}`,
          `Please ensure the server or local workspace is accessible.`,
        ],
      }));

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskName
            ? {
                ...t,
                lastStatus: "failed" as const,
                lastRun: "Just now",
                duration: `${((Date.now() - startMs) / 1000).toFixed(2)}s`,
              }
            : t
        )
      );
    } finally {
      setRunning(null);
    }
  };

  // 로그 자동 스크롤
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logTask, buildLogs, runningTask]);

  const currentLogs = logTask ? buildLogs[logTask] ?? [] : [];
  const logTaskData = tasks.find((t) => t.id === logTask);
  const isRunningCurrent = runningTask === logTask;

  const successCount = tasks.filter((t) => t.lastStatus === "success").length;
  const failedCount = tasks.filter((t) => t.lastStatus === "failed").length;

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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                  {buildTool}
                </span>
                {isLoadingTasks && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                실제 프로젝트 작업 디렉터리에서 Gradle/Maven 태스크를 실행하고 출력 로그를 확인합니다.
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
                <p className="text-[11px] font-semibold" style={{ color: ACCENT }}>
                  실제 프로세스 실행 중: <span className="font-mono">{tasks.find((t) => t.id === runningTask)?.command}</span>
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  서버에서 백그라운드 Gradle 프로세스가 실행되고 있습니다.
                </p>
              </div>
              <span className="text-[10px] font-mono shrink-0 font-bold" style={{ color: ACCENT }}>
                {elapsedSec}s elapsed
              </span>
            </div>
          )}

          {/* ── 태스크 목록 ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAF8", border: `1px solid ${BORDER}` }}>
            {/* 헤더 */}
            <div
              className="grid px-4 py-2.5 text-[10px] font-semibold"
              style={{ gridTemplateColumns: "1fr 80px 100px 90px 80px", borderBottom: `1px solid ${BORDER}`, background: "#F2F1EE", color: TEXT_LABEL }}
            >
              <span>Task</span>
              <span>Group</span>
              <span>Last Run</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {tasks.map((task, i) => {
              const sm = STATUS_META[task.lastStatus];
              const StatusIcon = sm.icon;
              const gc = GROUP_COLOR[task.group] ?? { color: TEXT_SECONDARY, bg: "rgba(0,0,0,0.05)" };
              const isActive = logTask === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setLogTask(isActive ? null : task.id)}
                  className="grid px-4 py-3 items-center cursor-pointer transition-colors hover:bg-black/[0.02]"
                  style={{
                    gridTemplateColumns: "1fr 80px 100px 90px 80px",
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
                  <div onClick={(e) => e.stopPropagation()}>
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
                  {logTaskData?.command || `./gradlew.bat ${logTask}`}
                </span>
                {isRunningCurrent && (
                  <span className="ml-auto text-[9px] animate-pulse flex items-center gap-1" style={{ color: ACCENT }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                    Executing... ({elapsedSec}s)
                  </span>
                )}
                {logTaskData && !isRunningCurrent && logTaskData.lastStatus !== "idle" && (
                  <span
                    className="ml-auto text-[9px] font-semibold"
                    style={{ color: STATUS_META[logTaskData.lastStatus].color }}
                  >
                    {STATUS_META[logTaskData.lastStatus].label} ({logTaskData.duration})
                  </span>
                )}
              </div>

              {/* 로그 내용 */}
              <div
                ref={logRef}
                className="p-4 font-mono text-[10px] leading-relaxed overflow-y-auto select-text"
                style={{ maxHeight: 260, color: "#c9d1d9" }}
              >
                {isRunningCurrent ? (
                  <div className="space-y-1">
                    <p className="animate-pulse" style={{ color: ACCENT }}>
                      Executing task: {logTaskData?.name}... Please wait while Gradle compiles and executes.
                    </p>
                    <p style={{ color: "#8b949e" }}>
                      Elapsed: {elapsedSec} seconds
                    </p>
                  </div>
                ) : currentLogs.length === 0 ? (
                  <p style={{ color: "#8b949e" }}>
                    아직 실행된 로그가 없습니다. [Run] 버튼을 눌러 실제 빌드 태스크를 실행하세요.
                  </p>
                ) : (
                  currentLogs.map((line, i) => {
                    const isFail = line.includes("FAILED") || line.includes("FAILURE") || line.includes("ERROR") || line.startsWith("[ERROR]");
                    const isSuccess = line.includes("SUCCESSFUL") || line.includes("PASSED") || line.includes("BUILD SUCCESS");
                    const isTask = line.startsWith("> Task");
                    const color = isFail ? "#f97583" : isSuccess ? "#7ee787" : isTask ? "#79c0ff" : "#c9d1d9";
                    return (
                      <p key={i} style={{ color }} className="whitespace-pre-wrap break-all">
                        {line || "\u00a0"}
                      </p>
                    );
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