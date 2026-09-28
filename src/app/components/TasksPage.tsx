import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Clock, Search, Plus, User, X } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  UI_RED_DARK, UI_AMBER_DARK, UI_GRAY, UI_GRAY_LIGHT, UI_AMBER, UI_GREEN, UI_RED, UI_INDIGO,
  UI_INDIGO_BG, ACCENT, ACCENT_BG, ACCENT_BORDER, CONTENT_BG, CARD_BG,
} from "../colors";
import {
  fetchProjectSchedules,
  createProjectSchedule,
  updateProjectScheduleStatus,
  type ProjectSchedule,
  type ProjectSchedulePriority,
  type ProjectScheduleStatus,
  type ProjectDepartment,
} from "../lib/api";
import { DEPARTMENT_META } from "./DashboardPage";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

const STATUS_TABS = ["All", "To Do", "In Progress", "Hold", "Done"] as const;
const STATUS_KEY: Record<string, ProjectScheduleStatus | "all"> = {
  "All": "all", "To Do": "TODO", "In Progress": "IN_PROGRESS", "Hold": "HOLD", "Done": "DONE",
};

// 완료 상태는 서버에서 DONE / COMPLETED 두 값 중 하나로 내려올 수 있어 같은 그룹으로 취급
const isDone = (status: ProjectScheduleStatus) => status === "DONE" || status === "COMPLETED";
const bucketOf = (status: ProjectScheduleStatus) => (isDone(status) ? "DONE" : status);

const PRIORITY_STYLE: Record<ProjectSchedulePriority, { color: string; bg: string }> = {
  HIGH:   { color: UI_RED_DARK, bg: "rgba(239,68,68,0.08)"   },
  MEDIUM: { color: UI_AMBER_DARK, bg: "rgba(251,191,36,0.10)"  },
  LOW:    { color: UI_GRAY, bg: "rgba(107,114,128,0.08)" },
};

const STATUS_STYLE: Record<string, { color: string; dot: string }> = {
  "TODO":        { color: UI_GRAY, dot: UI_GRAY_LIGHT },
  "IN_PROGRESS": { color: UI_INDIGO, dot: UI_INDIGO },
  "HOLD":        { color: UI_AMBER, dot: UI_AMBER },
  "DONE":        { color: UI_GREEN, dot: UI_GREEN },
};

// 상태 원을 클릭하면 다음 상태로 순환한다
const NEXT_STATUS: Record<string, ProjectScheduleStatus> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  HOLD: "TODO",
  DONE: "TODO",
};

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDue(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

const DEPARTMENTS: ProjectDepartment[] = ["BACKEND", "FRONTEND", "AI", "DEVOPS", "DATABASE", "QA", "DESIGN", "PM"];
const PRIORITIES: ProjectSchedulePriority[] = ["HIGH", "MEDIUM", "LOW"];

export function TasksPage({ projectId }: { projectId: number | null }) {
  const [tasks, setTasks] = useState<ProjectSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState<ProjectDepartment>("BACKEND");
  const [newPriority, setNewPriority] = useState<ProjectSchedulePriority>("MEDIUM");
  const [newDue, setNewDue] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!projectId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchProjectSchedules(projectId)
      .then((res) => setTasks(res.schedules || []))
      .catch((error) => {
        console.error("작업 목록을 불러오지 못했습니다:", error);
        toast.error("작업 목록을 불러오지 못했습니다.");
        setTasks([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [projectId]);

  const filtered = tasks.filter((t) => {
    const key = STATUS_KEY[activeTab];
    const matchStatus = key === "all" || bucketOf(t.status) === key;
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assigneeName ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { "All": tasks.length };
  tasks.forEach((t) => {
    const label = STATUS_TABS.find((s) => STATUS_KEY[s] === bucketOf(t.status)) ?? "";
    counts[label] = (counts[label] ?? 0) + 1;
  });

  const toggleStatus = async (task: ProjectSchedule) => {
    if (!projectId) return;
    const nextStatus = NEXT_STATUS[bucketOf(task.status)] ?? "TODO";
    setTasks((prev) => prev.map((t) => (t.scheduleId === task.scheduleId ? { ...t, status: nextStatus } : t)));
    try {
      await updateProjectScheduleStatus(projectId, task.scheduleId, { status: nextStatus });
    } catch (error) {
      console.error("작업 상태 변경에 실패했습니다:", error);
      toast.error("작업 상태 변경에 실패했습니다.");
      setTasks((prev) => prev.map((t) => (t.scheduleId === task.scheduleId ? { ...t, status: task.status } : t)));
    }
  };

  const handleCreate = async () => {
    if (!projectId || !newTitle.trim()) return;
    setCreating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const created = await createProjectSchedule(projectId, {
        title: newTitle.trim(),
        department: newDept,
        priority: newPriority,
        status: "TODO",
        startDate: today,
        endDate: newDue || today,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDue("");
      setShowCreate(false);
      toast.success("작업이 등록되었습니다.");
    } catch (error) {
      console.error("작업 등록에 실패했습니다:", error);
      toast.error("작업 등록에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CONTENT_BG }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>My Tasks</h1>
              {isLoading ? (
                <Skeleton className="h-3 w-32 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  {tasks.length}개 작업 · {tasks.filter((t) => !isDone(t.status)).length}개 미완료
                </p>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <button
                onClick={() => setShowCreate((v) => !v)}
                disabled={!projectId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: ACCENT, color: "#FFFFFF" }}
              >
                <Plus className="w-3 h-3" /> 새 작업 등록하기
              </button>
            )}
          </div>

          {/* ── 작업 등록 폼 ── */}
          {showCreate && (
            <div className="rounded-xl p-3.5 flex flex-wrap items-center gap-2" style={{ background: CARD_BG, border: `1px solid ${ACCENT_BORDER}` }}>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="작업 제목 입력"
                className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as ProjectDepartment)}
                className="px-2 py-1.5 text-[10px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_META[d].name}</option>)}
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as ProjectSchedulePriority)}
                className="px-2 py-1.5 text-[10px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="px-2 py-1.5 text-[10px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
              <button
                onClick={() => void handleCreate()}
                disabled={!newTitle.trim() || creating}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold disabled:opacity-40"
                style={{ background: ACCENT, color: "#FFFFFF" }}
              >
                {creating ? "등록 중..." : "등록"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-black/[0.06]"
              >
                <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
              </button>
            </div>
          )}

          {/* ── 필터 바 ── */}
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 w-full">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-lg" />
                ))}
                <div className="ml-auto">
                  <Skeleton className="h-7 w-44 rounded-lg" />
                </div>
              </div>
            ) : (
              <>
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: activeTab === tab
                        ? ACCENT_BG
                        : "rgba(0,0,0,0.04)",
                      color: activeTab === tab ? ACCENT : TEXT_SECONDARY,
                      border: activeTab === tab ? `1px solid ${ACCENT_BORDER}` : "1px solid transparent",
                    }}
                  >
                    {tab}
                    <span
                      className="px-1 py-0.5 rounded text-[9px]"
                      style={{ background: activeTab === tab ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.06)", color: activeTab === tab ? ACCENT : TEXT_TERTIARY }}
                    >
                      {counts[tab] ?? 0}
                    </span>
                  </button>
                ))}
                  <div className="relative ml-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search tasks..."
                      className="pl-7 pr-3 py-1.5 text-[10px] rounded-lg outline-none w-44 transition-colors"
                      style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                      onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "50")}
                      onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                    />
                  </div>
                </>
              )}
            </div>

          {/* ── 태스크 목록 ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 5 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                  <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-2.5 w-10" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="w-12 h-4 rounded shrink-0" />
                  <Skeleton className="w-12 h-5 rounded-full shrink-0" />
                  <Skeleton className="w-10 h-4 rounded shrink-0" />
                  <Skeleton className="w-14 h-3 shrink-0" />
                </div>
              ))
            ) : !projectId ? (
              <div className="py-12 text-center">
                <CheckSquare className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
                <p className="text-xs" style={{ color: TEXT_TERTIARY }}>프로젝트를 먼저 선택해 주세요.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <CheckSquare className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
                <p className="text-xs" style={{ color: TEXT_TERTIARY }}>No tasks found</p>
              </div>
            ) : (
              filtered.map((task, i) => {
                const ps = PRIORITY_STYLE[task.priority];
                const bucket = bucketOf(task.status);
                const ss = STATUS_STYLE[bucket];
                const deptMeta = DEPARTMENT_META[task.department];
                const overdue = isOverdue(task.endDate) && !isDone(task.status);
                return (
                  <div
                    key={task.scheduleId}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02]"
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                  >
                    {/* 상태 원 */}
                    <button
                      onClick={() => void toggleStatus(task)}
                      title="상태 변경"
                      className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center cursor-pointer"
                      style={{ borderColor: ss.dot, background: isDone(task.status) ? ss.dot : "transparent" }}
                    >
                      {isDone(task.status) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </button>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: isDone(task.status) ? TEXT_TERTIARY : TEXT_PRIMARY, textDecoration: isDone(task.status) ? "line-through" : "none" }}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>#{task.scheduleId}</span>
                        {task.description && (
                          <span className="text-[10px] truncate" style={{ color: TEXT_SECONDARY }}>{task.description}</span>
                        )}
                      </div>
                    </div>

                    {/* 부서 태그 */}
                    <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: deptMeta.bg, color: deptMeta.color }}>
                      {deptMeta.name}
                    </span>

                    {/* 담당자 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: UI_INDIGO_BG }}>
                        <User className="w-3 h-3" style={{ color: UI_INDIGO }} />
                      </div>
                      <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{task.assigneeName || "미배정"}</span>
                    </div>

                    {/* 우선순위 */}
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: ps.bg, color: ps.color }}>
                      {task.priority}
                    </span>

                    {/* 마감일 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" style={{ color: overdue ? UI_RED : TEXT_TERTIARY }} />
                      <span className="text-[10px]" style={{ color: overdue ? UI_RED : TEXT_TERTIARY }}>
                        {formatDue(task.endDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
