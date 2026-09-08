import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Circle, Clock, Search, ChevronDown, Plus, Tag, User, Trash2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  UI_RED_DARK, UI_AMBER_DARK, UI_GRAY, UI_GRAY_LIGHT, UI_AMBER, UI_GREEN, UI_RED, UI_INDIGO,
  UI_INDIGO_BG, GRADIENT_HEADER, BTN_DARK, ACCENT, ACCENT_BG, ACCENT_BORDER,
} from "../colors";
import {
  fetchProjectSchedules,
  createProjectSchedule,
  updateProjectScheduleStatus,
  deleteProjectSchedule,
  type ProjectSchedule,
  type ProjectScheduleStatus,
  type ProjectDepartment,
} from "../lib/api";

// ── 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

type Task = {
  id: string;
  scheduleId?: number;
  title: string;
  project: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "review" | "done";
  due: string;
  tag: string;
};

// 더미/기본 태스크 데이터 (SynAIpse 프로젝트 실제 기능)
const DEFAULT_TASKS: Task[] = [
  { id: "T-001", title: "AI 커밋 메시지 생성 엔드포인트 연동", project: "SynAIpse Backend", assignee: "김민혁", priority: "high", status: "in-progress", due: "Today", tag: "AI/Commit" },
  { id: "T-002", title: "캘린더 및 태스크 일정 CRUD 백엔드 연동", project: "SynAIpse Frontend", assignee: "이지현", priority: "high", status: "in-progress", due: "Today", tag: "Calendar" },
  { id: "T-003", title: "채팅방 생성 및 부서별 회의 모드 API 검증", project: "SynAIpse Server", assignee: "김민혁", priority: "medium", status: "done", due: "Yesterday", tag: "Chat" },
  { id: "T-004", title: "Ollama LLM (Qwen2.5 / Llama3.1) 헬스체크", project: "SynAIpse AI Engine", assignee: "김민혁", priority: "high", status: "done", due: "Today", tag: "Ollama" },
  { id: "T-005", title: "Git Commit Unified Diff 파서 고도화", project: "SynAIpse Frontend", assignee: "신민준", priority: "medium", status: "todo", due: "Tomorrow", tag: "Git/Diff" },
  { id: "T-006", title: "프로젝트 멤버 권한 및 부서 배정 관리", project: "SynAIpse Client", assignee: "신민준", priority: "low", status: "done", due: "Aug 20", tag: "Settings" },
];

const STATUS_TABS = ["All", "To Do", "In Progress", "Done"] as const;
const STATUS_KEY: Record<string, Task["status"] | "all"> = {
  "All": "all", "To Do": "todo", "In Progress": "in-progress", "Done": "done",
};

const PRIORITY_STYLE: Record<Task["priority"], { color: string; bg: string }> = {
  high:   { color: UI_RED_DARK, bg: "rgba(239,68,68,0.08)"   },
  medium: { color: UI_AMBER_DARK, bg: "rgba(251,191,36,0.10)"  },
  low:    { color: UI_GRAY, bg: "rgba(107,114,128,0.08)" },
};

const STATUS_STYLE: Record<Task["status"], { color: string; dot: string }> = {
  "todo":        { color: UI_GRAY, dot: UI_GRAY_LIGHT },
  "in-progress": { color: UI_INDIGO, dot: UI_INDIGO },
  "review":      { color: UI_AMBER, dot: UI_AMBER },
  "done":        { color: UI_GREEN, dot: UI_GREEN },
};

function mapBackendToTask(s: ProjectSchedule): Task {
  const normStatus = (s.status || "TODO").toUpperCase();
  let status: Task["status"] = "todo";
  if (normStatus === "DONE" || normStatus === "COMPLETED") status = "done";
  else if (normStatus === "IN_PROGRESS") status = "in-progress";

  const normPri = (s.priority || "MEDIUM").toUpperCase();
  let priority: Task["priority"] = "medium";
  if (normPri === "HIGH") priority = "high";
  else if (normPri === "LOW") priority = "low";

  return {
    id: `SCH-${s.scheduleId}`,
    scheduleId: s.scheduleId,
    title: s.title,
    project: s.department ? `SynAIpse ${s.department}` : "SynAIpse",
    assignee: s.assigneeName || "미지정",
    priority,
    status,
    due: s.endDate ? s.endDate.slice(5) : "진행중",
    tag: s.department || "General",
  };
}

export function TasksPage({ projectId = 1 }: { projectId?: number | null }) {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");

  // 새 태스크 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState<ProjectDepartment>("BACKEND");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");

  const loadTasks = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetchProjectSchedules(projectId);
      if (res && res.schedules && res.schedules.length > 0) {
        setTasks(res.schedules.map(mapBackendToTask));
      } else {
        setTasks(DEFAULT_TASKS);
      }
    } catch (err) {
      console.warn("태스크 목록 조회 실패, 기본 목록 사용:", err);
      setTasks(DEFAULT_TASKS);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: Task["status"] = task.status === "done" ? "todo" : task.status === "todo" ? "in-progress" : "done";
    const nextBackendStatus: ProjectScheduleStatus = nextStatus === "done" ? "DONE" : nextStatus === "in-progress" ? "IN_PROGRESS" : "TODO";

    // 낙관적 UI 업데이트
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));

    if (projectId && task.scheduleId) {
      try {
        await updateProjectScheduleStatus(projectId, task.scheduleId, { status: nextBackendStatus });
        toast.success(`태스크 상태가 [${nextStatus.toUpperCase()}] (으)로 변경되었습니다.`);
      } catch (err) {
        console.warn("태스크 상태 변경 API 실패:", err);
      }
    }
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      toast.error("태스크 제목을 입력해주세요.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const tempId = `T-${Date.now().toString().slice(-4)}`;

    const newTaskItem: Task = {
      id: tempId,
      title: newTitle.trim(),
      project: `SynAIpse ${newDept}`,
      assignee: "나",
      priority: newPriority,
      status: "todo",
      due: todayStr.slice(5),
      tag: newDept,
    };

    setTasks(prev => [newTaskItem, ...prev]);
    setShowAddModal(false);
    setNewTitle("");

    if (projectId) {
      try {
        const created = await createProjectSchedule(projectId, {
          title: newTitle.trim(),
          department: newDept,
          startDate: todayStr,
          endDate: todayStr,
          priority: newPriority === "high" ? "HIGH" : newPriority === "low" ? "LOW" : "MEDIUM",
          status: "TODO",
        });
        if (created && created.scheduleId) {
          setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: `SCH-${created.scheduleId}`, scheduleId: created.scheduleId } : t));
        }
        toast.success("새 태스크가 생성되었습니다.");
      } catch (err) {
        console.warn("태스크 생성 API 실패:", err);
      }
    }
  };

  const handleDeleteTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== task.id));

    if (projectId && task.scheduleId) {
      try {
        await deleteProjectSchedule(projectId, task.scheduleId);
        toast.success("태스크가 삭제되었습니다.");
      } catch (err) {
        console.warn("태스크 삭제 API 실패:", err);
      }
    }
  };

  const filtered = tasks.filter(t => {
    const matchStatus = STATUS_KEY[activeTab] === "all" || t.status === STATUS_KEY[activeTab];
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.project.toLowerCase().includes(search.toLowerCase()) ||
                        t.tag.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { "All": tasks.length };
  tasks.forEach(t => {
    const label = STATUS_TABS.find(s => STATUS_KEY[s] === t.status) ?? "";
    if (label) counts[label] = (counts[label] ?? 0) + 1;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_HEADER }} />

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>My Tasks & Schedules</h1>
              {isLoading ? (
                <Skeleton className="h-3 w-32 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  총 {tasks.length}개 작업 · {tasks.filter(t => t.status !== "done").length}개 진행 중 / 미완료
                </p>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ background: BTN_DARK, color: "rgba(255,255,255,0.92)" }}
              >
                <Plus className="w-3 h-3" /> New Task
              </button>
            )}
          </div>

          {/* ── 필터 & 검색 ── */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isLoading ? (
                <div className="flex gap-1.5 w-full">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-16 rounded-lg" />
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
                          ? "linear-gradient(135deg, rgba(224,231,255,0.8), rgba(232,213,245,0.7))"
                          : "rgba(0,0,0,0.04)",
                        color: activeTab === tab ? ACCENT : TEXT_SECONDARY,
                        border: activeTab === tab ? "1px solid rgba(99,91,255,0.2)" : "1px solid transparent",
                      }}
                    >
                      {tab}
                      <span
                        className="px-1 py-0.5 rounded text-[9px]"
                        style={{ background: activeTab === tab ? "rgba(99,91,255,0.12)" : "rgba(0,0,0,0.06)", color: activeTab === tab ? UI_INDIGO : TEXT_TERTIARY }}
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
                      placeholder="태스크 검색..."
                      className="pl-7 pr-3 py-1.5 text-[10px] rounded-lg outline-none w-44 transition-colors"
                      style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                      onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "50")}
                      onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── 태스크 목록 ── */}
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "rgba(255,255,255,0.88)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 4 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
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
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <CheckSquare className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
                <p className="text-xs" style={{ color: TEXT_TERTIARY }}>일치하는 태스크가 없습니다.</p>
              </div>
            ) : (
              filtered.map((task, i) => {
                const ps = PRIORITY_STYLE[task.priority];
                const ss = STATUS_STYLE[task.status];
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleStatus(task)}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.025] cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                  >
                    {/* 상태 토글 원 */}
                    <div
                      title="클릭하여 상태 변경"
                      className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all group-hover:scale-110"
                      style={{ borderColor: ss.dot, background: task.status === "done" ? ss.dot : "transparent" }}
                    >
                      {task.status === "done" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: task.status === "done" ? TEXT_TERTIARY : TEXT_PRIMARY, textDecoration: task.status === "done" ? "line-through" : "none" }}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>{task.id}</span>
                        <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{task.project}</span>
                      </div>
                    </div>

                    {/* 태그 */}
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: ACCENT_BG, color: ACCENT }}>
                      {task.tag}
                    </span>

                    {/* 담당자 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: UI_INDIGO_BG }}>
                        <User className="w-3 h-3" style={{ color: UI_INDIGO }} />
                      </div>
                      <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{task.assignee}</span>
                    </div>

                    {/* 우선순위 */}
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: ps.bg, color: ps.color }}>
                      {task.priority}
                    </span>

                    {/* 마감일 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" style={{ color: task.due === "Today" && task.status !== "done" ? UI_RED : TEXT_TERTIARY }} />
                      <span className="text-[10px]" style={{ color: task.due === "Today" && task.status !== "done" ? UI_RED : TEXT_TERTIARY }}>
                        {task.due}
                      </span>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => handleDeleteTask(task, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      title="태스크 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* ── 새 태스크 생성 모달 ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl"
            style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <h3 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>새 태스크 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-black/5">
                <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500">태스크 제목 *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="예: AI 토론 스트리밍 에러 처리"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500">부서</label>
                <select
                  value={newDept}
                  onChange={e => setNewDept(e.target.value as ProjectDepartment)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-black/5"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                >
                  <option value="BACKEND">Backend</option>
                  <option value="FRONTEND">Frontend</option>
                  <option value="AI">AI / Agent</option>
                  <option value="DEVOPS">DevOps</option>
                  <option value="QA">QA</option>
                  <option value="DESIGN">Design</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500">우선순위</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as Task["priority"])}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-black/5"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                >
                  <option value="high">높음 (High)</option>
                  <option value="medium">중간 (Medium)</option>
                  <option value="low">낮음 (Low)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}
              >
                취소
              </button>
              <button
                onClick={handleCreateTask}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #41431B, #62683A)" }}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
