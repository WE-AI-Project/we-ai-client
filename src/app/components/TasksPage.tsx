import { useState } from "react";
import { CheckSquare, Circle, Clock, Search, ChevronDown, Plus, Tag, User } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  UI_RED_DARK, UI_AMBER_DARK, UI_GRAY, UI_GRAY_LIGHT, UI_AMBER, UI_GREEN, UI_RED, UI_INDIGO,
  UI_INDIGO_BG, GRADIENT_HEADER, BTN_DARK,
} from "../colors";

type Task = {
  id: string;
  title: string;
  project: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "review" | "done";
  due: string;
  tag: string;
};

// 더미 태스크 데이터
const TASKS: Task[] = [
  { id: "T-001", title: "Fix JDK 17 compatibility in settings.gradle",       project: "WE&AI Backend",      assignee: "병권",  priority: "high",   status: "in-progress", due: "Today",   tag: "Backend"   },
  { id: "T-002", title: "Code review: MultiAgentController refactor",         project: "WE&AI Backend",      assignee: "병권",  priority: "high",   status: "todo",        due: "Today",   tag: "Review"    },
  { id: "T-003", title: "Write REST API documentation",                       project: "WE&AI Backend",      assignee: "병권",  priority: "medium", status: "todo",        due: "Tomorrow","tag": "Docs"    },
  { id: "T-004", title: "Set up CI/CD pipeline with GitHub Actions",          project: "WE&AI Backend",      assignee: "병권",  priority: "medium", status: "todo",        due: "Jun 3",   tag: "DevOps"    },
  { id: "T-005", title: "Test Agent Alpha–Beta inter-agent communication",    project: "WE&AI Backend",      assignee: "병권",  priority: "medium", status: "in-progress", due: "Today",   tag: "Testing"   },
  { id: "T-006", title: "Review Multi-Agent Simulator PR #14",                project: "Multi-Agent Sim",    assignee: "병권",  priority: "high",   status: "review",      due: "Today",   tag: "Review"    },
  { id: "T-007", title: "Deploy WE&AI Backend to staging environment",        project: "WE&AI Backend",      assignee: "Admin", priority: "high",   status: "done",        due: "Mar 30",  tag: "Deploy"    },
  { id: "T-008", title: "Update application-dev.yml profile configs",         project: "WE&AI Backend",      assignee: "병권",  priority: "low",    status: "done",        due: "Mar 29",  tag: "Config"    },
  { id: "T-009", title: "Implement agent error recovery mechanism",           project: "WE&AI Backend",      assignee: "병권",  priority: "high",   status: "todo",        due: "Jun 5",   tag: "Backend"   },
  { id: "T-010", title: "Document simulation parameter configs",              project: "Multi-Agent Sim",    assignee: "병권",  priority: "low",    status: "todo",        due: "Jun 7",   tag: "Docs"      },
];

const STATUS_TABS = ["All", "To Do", "In Progress", "Review", "Done"] as const;
const STATUS_KEY: Record<string, Task["status"] | "all"> = {
  "All": "all", "To Do": "todo", "In Progress": "in-progress", "Review": "review", "Done": "done",
};

const PRIORITY_STYLE: Record<Task["priority"], { color: string; bg: string }> = {
  high:   { color: UI_RED_DARK, bg: "rgba(239,68,68,0.08)"   },
  medium: { color: UI_AMBER_DARK, bg: "rgba(251,191,36,0.10)"  },
  low:    { color: UI_GRAY, bg: "rgba(107,114,128,0.08)" },
};

const STATUS_STYLE: Record<Task["status"], { color: string; dot: string }> = {
  "todo":        { color: UI_GRAY, dot: UI_GRAY_LIGHT },
  "in-progress": { color: UI_INDIGO,    dot: UI_INDIGO    },
  "review":      { color: UI_AMBER, dot: UI_AMBER },
  "done":        { color: UI_GREEN, dot: UI_GREEN },
};

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = TASKS.filter(t => {
    const matchStatus = STATUS_KEY[activeTab] === "all" || t.status === STATUS_KEY[activeTab];
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.project.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { "All": TASKS.length };
  TASKS.forEach(t => {
    const label = STATUS_TABS.find(s => STATUS_KEY[s] === t.status) ?? "";
    counts[label] = (counts[label] ?? 0) + 1;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_HEADER }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>My Tasks</h1>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{TASKS.length}개 작업 · {TASKS.filter(t => t.status !== "done").length}개 미완료</p>
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: BTN_DARK, color: "rgba(255,255,255,0.92)" }}
            >
              <Plus className="w-3 h-3" /> New Task
            </button>
          </div>

          {/* 필터 & 검색 */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {/* 상태 탭 */}
            <div className="flex items-center gap-1.5 flex-wrap">
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
                  placeholder="Search tasks..."
                  className="pl-7 pr-3 py-1.5 text-[10px] rounded-lg outline-none w-44"
                  style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                />
              </div>
            </div>
          </div>

          {/* 태스크 목록 */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <CheckSquare className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
                <p className="text-xs" style={{ color: TEXT_TERTIARY }}>No tasks found</p>
              </div>
            ) : (
              filtered.map((task, i) => {
                const ps = PRIORITY_STYLE[task.priority];
                const ss = STATUS_STYLE[task.status];
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                  >
                    {/* 상태 원 */}
                    <div
                      className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
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
                    <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}>
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