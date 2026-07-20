import { useEffect, useMemo, useState } from "react";
import StateViewWrapper, { ApiStatus } from './common/StateViewWrapper';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Hash,
  ListTodo,
  RefreshCw,
  Users,
  TrendingUp,
  Milestone,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ACCENT,
  ACCENT_BG,
  BORDER,
  BORDER_SUBTLE,
  GRADIENT_PAGE,
  STATUS_ERROR,
  TEXT_LABEL,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from "../colors";
import {
  ProjectDashboard,
  ProjectDepartment,
  ProjectScheduleStatus,
  fetchProjectDashboard,
  fetchProjectActivities,
  fetchProjectProgress,
  fetchProjectMilestones,
  fetchProjectDepartmentStatus,
  ProjectActivity,
  ProjectProgressStats,
  ProjectMilestone,
  DepartmentStatusDetail,
  formatApiError,
  fetchMyActivitySummary,
  MyActivitySummary,
  fetchMyActivities,
  MyActivity,
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

const DEPARTMENT_LABELS: Record<ProjectDepartment, string> = {
  BACKEND: "Backend",
  FRONTEND: "Frontend",
  QA: "QA",
  DEVOPS: "DevOps",
  AI: "AI",
  DATABASE: "Database",
  DESIGN: "Design",
  PM: "PM",
};

const STATUS_COLORS: Record<ProjectScheduleStatus, { color: string; bg: string }> = {
  TODO: { color: "#C09840", bg: "rgba(192,152,64,0.12)" },
  IN_PROGRESS: { color: ACCENT, bg: ACCENT_BG },
  DONE: { color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  COMPLETED: { color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  HOLD: { color: "#888A62", bg: "rgba(136,138,98,0.12)" },
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ background: "rgba(255,255,255,0.88)", borderColor: BORDER }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

type Props = {
  projectId: number | null;
  projectName: string;
};

export function DashboardPage({ projectId, projectName }: Props) {
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [progressStats, setProgressStats] = useState<ProjectProgressStats | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [deptStatus, setDeptStatus] = useState<DepartmentStatusDetail[]>([]);

  //통신 상태 관리 - 직접 입력하여 상태 확인 중, 수정 예정
  const [status, setStatus] = useState<ApiStatus>('empty');

  // 내 활동 요약 상태 관리 추가
  const [mySummary, setMySummary] = useState<MyActivitySummary | null>(null);
  // 내 최근 활동
  const [myActivities, setMyActivities] = useState<MyActivity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSimulating = false;

  const progressLabel = useMemo(() => `${dashboard?.progressRate ?? 0}%`, [dashboard]);

  const loadDashboard = async () => {
    if (!projectId) {
      setDashboard(null);
      setActivities([]);
      setProgressStats(null);
      setMilestones([]);
      setDeptStatus([]);
      setMySummary(null);
      setMyActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. 기존 오리지널 데이터 Fetch
      const [nextDashboard, activityList, nextProgress, milestoneList, deptStatusList] = await Promise.all([
        fetchProjectDashboard(projectId),
        fetchProjectActivities(projectId),
        fetchProjectProgress(projectId),
        fetchProjectMilestones(projectId),
        fetchProjectDepartmentStatus(projectId),
      ]);

      setDashboard(nextDashboard);
      setActivities(activityList.activities || []);
      setProgressStats(nextProgress);
      setMilestones(milestoneList.milestones || []);
      setDeptStatus(deptStatusList.departments || []);
      setError(null);

      try {
        const mySummaryData = await fetchMyActivitySummary();
        setMySummary(mySummaryData);
      } catch (summaryError) {
        console.warn("내 활동 요약 정보를 불러오지 못했습니다.", summaryError);
      }

      try {
        const myActivitiesData = await fetchMyActivities();

        let checkedActivities: any[] = [];
        if (myActivitiesData) {
          if (Array.isArray(myActivitiesData)) {
            // 백엔드가 배열로 주는 경우
            checkedActivities = myActivitiesData;
          } else if ((myActivitiesData as any).activities && Array.isArray((myActivitiesData as any).activities)) {
            // 백엔드가 객체 내부 { activities: [...] } 로 주는 경우
            checkedActivities = (myActivitiesData as any).activities;
          }
        }

        setMyActivities(checkedActivities);
      } catch (activitiesError) {
        console.warn("내 최근 활동 내역을 불러오지 못했습니다.", activitiesError);
      }

    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [projectId]);

  // 에러 발생 시 처리
  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GRADIENT_PAGE }}>
        <div
          className="rounded-3xl border px-6 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.94)", borderColor: BORDER }}
        >
          <p className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
            아직 선택된 프로젝트가 없습니다.
          </p>
          <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
            프로젝트 목록에서 하나를 열면 실시간 대시보드가 여기 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (error && !loading && !isSimulating) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GRADIENT_PAGE }}>
        <div
          className="max-w-lg rounded-3xl border px-6 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.94)", borderColor: BORDER }}
        >
          <p className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
            대시보드를 불러오지 못했습니다.
          </p>
          <p className="mt-2 text-sm" style={{ color: error ? STATUS_ERROR : TEXT_SECONDARY }}>
            {error ?? "응답 데이터가 비어 있습니다."}
          </p>
          <button
            onClick={() => void loadDashboard()}
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const showSkeleton = loading || isSimulating || !dashboard || !progressStats;

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: GRADIENT_PAGE }}>
      <StateViewWrapper
        status={status}
        emptyMessage="진행 중인 프로젝트나 대시보드 데이터가 없습니다."
        errorMessage="대시보드 정보를 불러오는 중 오류가 발생했습니다."
        onRetry={loadDashboard}
      >
        {/* 실제 대시보드 콘텐츠 알맹이만 Wrapper로 감싸줍니다 */}
        <div className="mx-auto max-w-6xl space-y-5">
          {/* ── 상단 대시보드 헤더 ── */}
          <section
            className="rounded-[28px] border px-6 py-6"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEXT_LABEL }}>
                  Project Dashboard
                </p>
                {showSkeleton ? (
                  <div className="mt-3">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                ) : dashboard && (
                  <>
                    <h1 className="mt-2 text-3xl font-bold" style={{ color: TEXT_PRIMARY }}>
                      {dashboard.projectName || projectName}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-2 text-[12px]" style={{ color: TEXT_SECONDARY }}>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: ACCENT_BG }}>
                        <Hash className="h-3.5 w-3.5" />
                        {dashboard.projectCode}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(90,138,74,0.12)" }}>
                        <Activity className="h-3.5 w-3.5" />
                        {dashboard.status}
                      </span>
                      {dashboard.targetDate && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(192,152,64,0.12)" }}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          {dashboard.targetDate}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  if (!showSkeleton) void loadDashboard();
                }}
                disabled={showSkeleton}
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 text-white"
                style={{ background: ACCENT }}
              >
                <RefreshCw className={`h-4 w-4 ${showSkeleton ? "animate-spin" : ""}`} />
                새로고침
              </button>
            </div>
          </section>

          {/* ── 통계 요약 카드 ── */}
          <section className="grid gap-4 md:grid-cols-4">
            {showSkeleton ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border px-4 py-4" style={{ background: "rgba(255,255,255,0.88)", borderColor: BORDER }}>
                  <Skeleton className="w-16 h-3 mb-4" />
                  <Skeleton className="w-12 h-8" />
                </div>
              ))
            ) : dashboard && (
              <>
                <StatCard label="Members" value={`${dashboard.memberCount}`} tone={ACCENT} />
                <StatCard label="Schedules" value={`${dashboard.scheduleCount}`} tone="#C09840" />
                <StatCard label="Completed" value={`${dashboard.completedScheduleCount}`} tone="#5A8A4A" />
                <StatCard label="Progress" value={progressLabel} tone={ACCENT} />
              </>
            )}
          </section>

          {/* ── 내 활동 요약 정보 섹션 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                나의 활동 요약
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {showSkeleton ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border px-4 py-4" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <Skeleton className="w-20 h-3 mb-4" />
                    <Skeleton className="w-16 h-7" />
                  </div>
                ))
              ) : mySummary ? (
                <>
                  <div className="rounded-2xl border px-4 py-4" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      My Total Tasks
                    </p>
                    <p className="mt-3 text-2xl font-bold" style={{ color: ACCENT }}>
                      {mySummary.totalTasks ?? 0} 개
                    </p>
                  </div>
                  <div className="rounded-2xl border px-4 py-4" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      My Completed Tasks
                    </p>
                    <p className="mt-3 text-2xl font-bold" style={{ color: "#5A8A4A" }}>
                      {mySummary.completedTasks ?? 0} 개
                    </p>
                  </div>
                  <div className="rounded-2xl border px-4 py-4" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      My Recent Commits
                    </p>
                    <p className="mt-3 text-2xl font-bold" style={{ color: "#C09840" }}>
                      {mySummary.recentCommitsCount ?? 0} 회
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm py-2 col-span-full" style={{ color: TEXT_TERTIARY }}>
                  불러온 내 활동 요약 정보가 존재하지 않습니다.
                </p>
              )}
            </div>
          </section>

          {/* ── 진행률 통계 트렌드 차트 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                주차별 진행률 통계 트렌드
              </h2>
            </div>

            <div className="h-[180px] w-full">
              {showSkeleton ? (
                <Skeleton className="w-full h-full rounded-2xl" />
              ) : progressStats?.weeklyTrends && progressStats.weeklyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressStats.weeklyTrends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.96)",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="progressRate"
                      name="진행률 (%)"
                      stroke={ACCENT}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: ACCENT }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm py-4" style={{ color: TEXT_TERTIARY }}>
                  아직 누적된 주차별 진행률 통계 트렌드 데이터가 없습니다.
                </p>
              )}
            </div>
          </section>

          {/* ── 2단 컬럼 (부서별 진행률 & 최근 일정) ── */}
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">

            {/* 1. 부서별 진행률 */}
            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  부서별 진행률
                </h2>
              </div>

              <div className="space-y-4">
                {showSkeleton ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 w-full">
                          <Skeleton className="w-20 h-4" />
                          <Skeleton className="w-28 h-3" />
                        </div>
                        <Skeleton className="w-8 h-4 shrink-0" />
                      </div>
                      <Skeleton className="w-full h-2.5 rounded-full" />
                    </div>
                  ))
                ) : dashboard?.departmentProgress.length === 0 ? (
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                    아직 집계된 부서별 일정이 없습니다.
                  </p>
                ) : dashboard && (
                  dashboard.departmentProgress.map((item) => (
                    <div key={item.department} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                            {DEPARTMENT_LABELS[item.department]}
                          </p>
                          <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>
                            완료 {item.completedCount} / 전체 {item.totalCount}
                          </p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: ACCENT }}>
                          {item.progressRate}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: ACCENT_BG }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.progressRate}%`, background: ACCENT }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 최근 일정 */}
            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <ListTodo className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  최근 일정
                </h2>
              </div>

              <div className="space-y-3">
                {showSkeleton ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border px-4 py-3" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 pt-1">
                          <Skeleton className="w-3/4 h-3.5" />
                          <Skeleton className="w-1/2 h-3" />
                        </div>
                        <Skeleton className="w-16 h-5 rounded-full shrink-0" />
                      </div>
                    </div>
                  ))
                ) : dashboard?.recentSchedules.length === 0 ? (
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                    아직 표시할 일정이 없습니다.
                  </p>
                ) : dashboard && (
                  dashboard.recentSchedules.map((schedule) => {
                    const statusColor = STATUS_COLORS[schedule.status];

                    return (
                      <div
                        key={schedule.scheduleId}
                        className="rounded-2xl border px-4 py-3"
                        style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                              {schedule.title}
                            </p>
                            <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                              {DEPARTMENT_LABELS[schedule.department]}
                              {schedule.endDate ? ` · ${schedule.endDate}` : ""}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ color: statusColor.color, background: statusColor.bg }}
                          >
                            {schedule.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* ── 파트별 상세 현황 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                파트별 상세 현황
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {showSkeleton ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border px-4 py-4 space-y-3" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <div className="flex justify-between">
                      <Skeleton className="w-16 h-4" />
                      <Skeleton className="w-10 h-4 rounded-full" />
                    </div>
                    <Skeleton className="w-12 h-6" />
                    <Skeleton className="w-full h-2 rounded-full" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                ))
              ) : deptStatus.length === 0 ? (
                <p className="text-sm col-span-full" style={{ color: TEXT_TERTIARY }}>
                  아직 집계된 파트별 현황 정보가 없습니다.
                </p>
              ) : (
                deptStatus.map((item) => (
                  <div
                    key={item.department}
                    className="rounded-2xl border p-4 flex flex-col justify-between animate-in fade-in duration-200"
                    style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                          {DEPARTMENT_LABELS[item.department]}
                        </p>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            color: item.status === "COMPLETED" ? "#5A8A4A" : item.status === "DELAYED" ? "#B85450" : ACCENT,
                            background: item.status === "COMPLETED" ? "rgba(90,138,74,0.12)" : item.status === "DELAYED" ? "rgba(184,84,80,0.12)" : ACCENT_BG,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-2 mb-4">
                        <span className="text-2xl font-bold font-mono" style={{ color: ACCENT }}>{item.progressRate}%</span>
                        <span className="text-[11px] ml-1.5" style={{ color: TEXT_TERTIARY }}>완료율</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.progressRate}%`, background: item.status === "DELAYED" ? "#B85450" : ACCENT }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: TEXT_TERTIARY }}>
                        <span>멤버 {item.memberCount}명</span>
                        <span>일정 {item.completedScheduleCount}/{item.totalScheduleCount}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 프로젝트 마일스톤 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Milestone className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                프로젝트 마일스톤
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {showSkeleton ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border px-4 py-3.5 space-y-3" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <div className="flex justify-between">
                      <Skeleton className="w-1/2 h-4" />
                      <Skeleton className="w-12 h-4 rounded-full" />
                    </div>
                    <Skeleton className="w-full h-2 rounded-full" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                ))
              ) : milestones.length === 0 ? (
                <p className="text-sm col-span-full" style={{ color: TEXT_TERTIARY }}>
                  아직 등록된 프로젝트 마일스톤 목적지가 없습니다.
                </p>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={milestone.milestoneId}
                    className="rounded-2xl border p-4 flex flex-col justify-between"
                    style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                          {milestone.title}
                        </p>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            color: milestone.status === "COMPLETED" ? "#5A8A4A" : milestone.status === "IN_PROGRESS" ? ACCENT : "#C09840",
                            background: milestone.status === "COMPLETED" ? "rgba(90,138,74,0.12)" : milestone.status === "IN_PROGRESS" ? ACCENT_BG : "rgba(192,152,64,0.12)",
                          }}
                        >
                          {milestone.status}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-xs mb-4 line-clamp-2" style={{ color: TEXT_SECONDARY }}>
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 mt-auto">
                      <div className="flex items-center justify-between text-[11px]">
                        <span style={{ color: TEXT_TERTIARY }}>진행도</span>
                        <span className="font-bold font-mono" style={{ color: ACCENT }}>{milestone.progressRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${milestone.progressRate}%`, background: milestone.status === "COMPLETED" ? "#5A8A4A" : ACCENT }}
                        />
                      </div>
                      {milestone.dueDate && (
                        <p className="text-[10px] text-right pt-1 font-mono" style={{ color: TEXT_TERTIARY }}>
                          목표일: {milestone.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 최근 활동 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                나의 최근 활동
              </h2>
            </div>

            <div className="space-y-3">
              {showSkeleton ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border px-4 py-3" style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 pt-1">
                        <Skeleton className="w-2/3 h-3.5" />
                        <Skeleton className="w-1/2 h-3" />
                      </div>
                      <Skeleton className="w-14 h-5 rounded-full shrink-0" />
                    </div>
                  </div>
                ))
              ) : myActivities.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: TEXT_TERTIARY }}>
                  아직 기록된 나의 최근 활동이 없습니다.
                </p>
              ) : (
                myActivities.map((activity) => (
                  <div
                    key={activity.activityId}
                    className="rounded-2xl border px-4 py-3"
                    style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="mt-1 text-xs" style={{ color: TEXT_SECONDARY }}>
                            {activity.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px]" style={{ color: TEXT_TERTIARY }}>
                          일시: {activity.createdAt}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ color: ACCENT, background: ACCENT_BG }}
                      >
                        {activity.activityType}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 하단 요약 ── */}
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                요약
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {showSkeleton ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
                    <Skeleton className="w-24 h-3 mb-3" />
                    <Skeleton className="w-20 h-6" />
                  </div>
                ))
              ) : dashboard && (
                <>
                  <div className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Start Date
                    </p>
                    <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                      {dashboard.startDate ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Target Date
                    </p>
                    <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                      {dashboard.targetDate ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Completion Ratio
                    </p>
                    <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                      {dashboard.completedScheduleCount}/{dashboard.scheduleCount}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </StateViewWrapper>
    </div>
  );
}