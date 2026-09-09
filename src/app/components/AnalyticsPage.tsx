import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { BarChart2, TrendingUp, GitCommit, CheckSquare, ListTodo } from "lucide-react";
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  CONTENT_BG,
} from "../colors";
import {
  fetchProjectBranchGraph,
  fetchProjectSchedules,
  type ProjectSchedule,
} from "../lib/api";

// ── 🚨 [추가] 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

const RANGES = ["7 Days", "14 Days", "30 Days"] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p className="font-semibold mb-1" style={{ color: TEXT_PRIMARY }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke ?? p.fill }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDoneStatus(status: ProjectSchedule["status"]): boolean {
  return status === "DONE" || status === "COMPLETED";
}

function isoWeekLabel(d: Date): string {
  const monday = new Date(d);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function AnalyticsPage({ projectId }: { projectId: number }) {
  const [range, setRange] = useState<string>("14 Days");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitDates, setCommitDates] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchProjectBranchGraph(projectId, { maxCount: 300 }),
      fetchProjectSchedules(projectId),
    ])
      .then(([graph, scheduleList]) => {
        if (cancelled) return;
        setCommitDates(graph.nodes.map(n => n.committedAt));
        setSchedules(scheduleList.schedules);
      })
      .catch((err: any) => { if (!cancelled) setError(err?.message || "분석 데이터를 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const sliceCount = range === "7 Days" ? 7 : range === "14 Days" ? 14 : 30;

  // 실제 커밋(branch graph)과 실제 완료 일정(schedule endDate)을 날짜별로 집계한다.
  const chartData = useMemo(() => {
    const days: { date: string; key: string; commits: number; tasks: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = sliceCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      days.push({ date: dateLabel(key), key, commits: 0, tasks: 0 });
    }
    const byKey = new Map(days.map(d => [d.key, d]));

    commitDates.forEach(iso => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const row = byKey.get(dateKey(d));
      if (row) row.commits += 1;
    });

    schedules.forEach(s => {
      if (!isDoneStatus(s.status) || !s.endDate) return;
      const d = new Date(s.endDate);
      if (Number.isNaN(d.getTime())) return;
      const row = byKey.get(dateKey(d));
      if (row) row.tasks += 1;
    });

    return days;
  }, [commitDates, schedules, sliceCount]);

  // 최근 4주간 일정 상태(todo/done/backlog)를 실제 데이터로 집계한다.
  const weeklyTasks = useMemo(() => {
    const weeks: { week: string; weekStart: Date; todo: number; done: number; backlog: number }[] = [];
    const today = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weeks.push({ week: `W${4 - i} (${isoWeekLabel(weekStart)})`, weekStart, todo: 0, done: 0, backlog: 0 });
    }

    schedules.forEach(s => {
      const reference = s.endDate || s.createdAt;
      const d = new Date(reference);
      if (Number.isNaN(d.getTime())) return;
      // 각 일정을 가장 가까운(이전) 주 버킷에 배정한다.
      let bucket = weeks[0];
      for (const w of weeks) {
        if (d >= w.weekStart) bucket = w;
      }
      if (isDoneStatus(s.status)) bucket.done += 1;
      else if (s.status === "HOLD") bucket.backlog += 1;
      else bucket.todo += 1;
    });

    return weeks;
  }, [schedules]);

  const totalCommits = chartData.reduce((s, d) => s + d.commits, 0);
  const totalTasksDone = chartData.reduce((s, d) => s + d.tasks, 0);
  const openTasks = schedules.filter(s => s.status === "TODO" || s.status === "IN_PROGRESS").length;
  const doneCount = schedules.filter(s => isDoneStatus(s.status)).length;
  const completionRate = schedules.length > 0 ? Math.round((doneCount / schedules.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CONTENT_BG }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-400 mx-auto space-y-4">

          {/* ── 헤더 + 기간 선택 ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Analytics</h1>
              </div>
              {isLoading ? (
                <Skeleton className="w-48 h-3 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>프로젝트 활동 · 작업 트렌드 (실제 커밋/일정 데이터)</p>
              )}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="w-13 h-6 rounded-lg mx-0.5" />
                ))
              ) : (
                RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: range === r ? "#1c1c1e" : "transparent",
                      color: range === r ? "rgba(255,255,255,0.9)" : TEXT_SECONDARY,
                    }}
                  >
                    {r}
                  </button>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-[11px]" style={{ background: "rgba(184,84,80,0.08)", color: "#B85450", border: `1px solid ${BORDER}` }}>
              {error}
            </div>
          )}

          {/* ── 요약 통계 ── */}
          <div className="grid grid-cols-4 gap-2.5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <Skeleton className="w-6 h-6 rounded-lg mb-2" />
                  <Skeleton className="w-12 h-5 mb-1" />
                  <Skeleton className="w-20 h-2.5" />
                </div>
              ))
            ) : (
              [
                { label: "Commits",         value: totalCommits,        color: ACCENT,    bg: "rgba(88,101,242,0.07)",  icon: GitCommit   },
                { label: "Tasks Done",      value: totalTasksDone,      color: "#10b981", bg: "rgba(16,185,129,0.07)", icon: CheckSquare },
                { label: "Open Tasks",      value: openTasks,           color: "#f59e0b", bg: "rgba(245,158,11,0.07)", icon: ListTodo    },
                { label: "Completion Rate", value: `${completionRate}%`, color: "#8b5cf6", bg: "rgba(139,92,246,0.07)", icon: TrendingUp },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg }}>
                      <Icon className="w-3 h-3" style={{ color: s.color }} />
                    </div>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{s.label}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* ── 일별 활동 라인 차트 ── */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {isLoading ? (
              <>
                <Skeleton className="w-64 h-3.5 mb-4" />
                <Skeleton className="w-full h-45 rounded-xl" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Daily Activity — Commits & Task Completions</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart id="analytics-daily-line" data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: TEXT_TERTIARY }} iconType="circle" iconSize={6} />
                    <Line key="line-commits" type="monotone" dataKey="commits" name="Commits" stroke={ACCENT}    strokeWidth={2} dot={{ r: 2, fill: ACCENT }}    activeDot={{ r: 4 }} />
                    <Line key="line-tasks"   type="monotone" dataKey="tasks"   name="Tasks"   stroke="#10b981"   strokeWidth={2} dot={{ r: 2, fill: "#10b981" }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* ── 주별 태스크 막대 차트 ── */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {isLoading ? (
              <>
                <Skeleton className="w-40 h-3.5 mb-4" />
                <Skeleton className="w-full h-37.5 rounded-xl" />
              </>
            ) : (
              <>
                <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Weekly Task Progress</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart id="analytics-weekly-bar" data={weeklyTasks} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={12}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: TEXT_TERTIARY }} iconType="circle" iconSize={6} />
                    <Bar key="bar-done"    dataKey="done"    name="Done"    fill="#10b981" radius={[3,3,0,0]} />
                    <Bar key="bar-todo"    dataKey="todo"    name="To Do"   fill={ACCENT}  radius={[3,3,0,0]} />
                    <Bar key="bar-backlog" dataKey="backlog" name="Backlog" fill="#d1d5db" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
