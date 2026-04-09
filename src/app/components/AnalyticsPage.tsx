import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { BarChart2, TrendingUp, GitCommit, CheckSquare, Bot, Calendar } from "lucide-react";
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_GREEN, UI_GREEN_BG7, UI_RED, UI_AMBER, UI_AMBER_BG7, UI_VIOLET, UI_VIOLET_BG7,
  UI_GRAY_LIGHT, UI_GRAY_BORDER,
  GRADIENT_HEADER, BTN_DARK,
} from "../colors";

// 지난 14일 커밋 + 작업완료 라인 데이터
const DAILY_ACTIVITY = [
  { date: "Mar 17", commits: 1, tasks: 2 }, { date: "Mar 18", commits: 0, tasks: 1 },
  { date: "Mar 19", commits: 2, tasks: 3 }, { date: "Mar 20", commits: 3, tasks: 2 },
  { date: "Mar 21", commits: 1, tasks: 0 }, { date: "Mar 22", commits: 0, tasks: 0 },
  { date: "Mar 23", commits: 0, tasks: 0 }, { date: "Mar 24", commits: 4, tasks: 5 },
  { date: "Mar 25", commits: 2, tasks: 3 }, { date: "Mar 26", commits: 1, tasks: 2 },
  { date: "Mar 27", commits: 3, tasks: 4 }, { date: "Mar 28", commits: 2, tasks: 3 },
  { date: "Mar 29", commits: 1, tasks: 2 }, { date: "Mar 30", commits: 3, tasks: 3 },
];

// 주별 작업 완료 막대 데이터
const WEEKLY_TASKS = [
  { week: "W1 (Mar 3)",  todo: 8, done: 5, backlog: 3 },
  { week: "W2 (Mar 10)", todo: 10, done: 7, backlog: 3 },
  { week: "W3 (Mar 17)", todo: 9,  done: 6, backlog: 2 },
  { week: "W4 (Mar 24)", todo: 11, done: 8, backlog: 4 },
];

// 에이전트 성능 요약
const AGENT_PERF = [
  { name: "DataSync Alpha",  uptime: "99.1%", tasksCompleted: 142, avgCpu: 38, status: "running" },
  { name: "Classifier Beta", uptime: "97.3%", tasksCompleted: 89,  avgCpu: 72, status: "running" },
  { name: "Logger Gamma",    uptime: "99.8%", tasksCompleted: 201, avgCpu: 4,  status: "idle"    },
  { name: "Parser Delta",    uptime: "81.2%", tasksCompleted: 54,  avgCpu: 0,  status: "error"   },
  { name: "Scheduler Eps",   uptime: "98.6%", tasksCompleted: 118, avgCpu: 18, status: "running" },
  { name: "Analyzer Zeta",   uptime: "96.4%", tasksCompleted: 77,  avgCpu: 5,  status: "idle"    },
];

const STATUS_COLOR: Record<string, string> = {
  running: "#10b981", idle: "#9ca3af", error: "#ef4444",
};

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

export function AnalyticsPage() {
  const [range, setRange] = useState<string>("14 Days");
  const sliceCount = range === "7 Days" ? 7 : range === "14 Days" ? 14 : 14;
  const chartData = DAILY_ACTIVITY.slice(-sliceCount);

  const totalCommits = chartData.reduce((s, d) => s + d.commits, 0);
  const totalTasks   = chartData.reduce((s, d) => s + d.tasks, 0);
  const activeAgents = AGENT_PERF.filter(a => a.status === "running").length;
  const avgUptime    = (AGENT_PERF.reduce((s, a) => s + parseFloat(a.uptime), 0) / AGENT_PERF.length).toFixed(1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 20%, #e8d5f5 40%, #fce7f3 60%, #fde6d5 80%, #fef3c7 100%)" }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 헤더 + 기간 선택 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Analytics</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>프로젝트 활동 · 작업 트렌드 · 에이전트 성능</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
              {RANGES.map(r => (
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
              ))}
            </div>
          </div>

          {/* 요약 통계 */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Commits",       value: totalCommits, color: ACCENT,    bg: "rgba(99,91,255,0.07)",  icon: GitCommit    },
              { label: "Tasks Done",    value: totalTasks,   color: "#10b981", bg: "rgba(16,185,129,0.07)", icon: CheckSquare  },
              { label: "Active Agents", value: activeAgents, color: "#8b5cf6", bg: "rgba(139,92,246,0.07)", icon: Bot          },
              { label: "Avg Uptime",    value: `${avgUptime}%`, color: "#f59e0b", bg: "rgba(245,158,11,0.07)", icon: TrendingUp },
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
            })}
          </div>

          {/* 일별 활동 라인 차트 */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
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
          </div>

          {/* 주별 태스크 막대 차트 */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Weekly Task Progress</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart id="analytics-weekly-bar" data={WEEKLY_TASKS} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={12}>
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
          </div>

          {/* 에이전트 성능 테이블 */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(247,247,245,0.8)" }}>
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Agent Performance Summary</p>
            </div>
            <div className="grid text-[10px] font-semibold px-4 py-2" style={{ gridTemplateColumns: "1fr 80px 100px 80px 60px", color: TEXT_LABEL, borderBottom: `1px solid ${BORDER}` }}>
              <span>Agent</span>
              <span>Status</span>
              <span>Tasks Done</span>
              <span>Avg CPU</span>
              <span>Uptime</span>
            </div>
            {AGENT_PERF.map((a, i) => (
              <div
                key={a.name}
                className="grid px-4 py-2.5 items-center text-xs hover:bg-black/[0.02] transition-colors"
                style={{ gridTemplateColumns: "1fr 80px 100px 80px 60px", borderBottom: i < AGENT_PERF.length - 1 ? `1px solid rgba(0,0,0,0.04)` : "none" }}
              >
                <span className="font-medium" style={{ color: TEXT_PRIMARY }}>{a.name}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[a.status] }} />
                  <span className="capitalize text-[10px]" style={{ color: TEXT_SECONDARY }}>{a.status}</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: TEXT_PRIMARY }}>{a.tasksCompleted}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                    <div className="h-full rounded-full" style={{ width: `${a.avgCpu}%`, background: a.avgCpu > 70 ? "#ef4444" : ACCENT }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: TEXT_TERTIARY }}>{a.avgCpu}%</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: TEXT_SECONDARY }}>{a.uptime}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}