import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Hash,
  ListTodo,
  RefreshCw,
  Users,
} from "lucide-react";
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
  formatApiError,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚨 [추가] 3초 스켈레톤 UI 유지를 위한 시뮬레이션 타이머
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSimulating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const progressLabel = useMemo(() => `${dashboard?.progressRate ?? 0}%`, [dashboard]);

  const loadDashboard = async () => {
    if (!projectId) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextDashboard = await fetchProjectDashboard(projectId);
      setDashboard(nextDashboard);
      setError(null);
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
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: ACCENT, color: "white" }}
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 🚨 데이터 페칭 로딩이거나, 3초 타이머가 덜 끝났거나, 대시보드 데이터가 아직 없을 때 스켈레톤 표시
  const showSkeleton = loading || isSimulating || !dashboard;

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: GRADIENT_PAGE }}>
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
                /* [스켈레톤] 프로젝트 타이틀 & 뱃지 */
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
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: ACCENT, color: "white" }}
            >
              <RefreshCw className={`h-4 w-4 ${showSkeleton ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </section>

        {/* ── 통계 요약 카드 (StatCards) ── */}
        <section className="grid gap-4 md:grid-cols-4">
          {showSkeleton ? (
            /* [스켈레톤] 요약 카드 4개 */
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
                /* [스켈레톤] 부서별 진행률 막대 */
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

          {/* 2. 최근 일정 */}
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
                /* [스켈레톤] 최근 일정 리스트 카드 */
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

        {/* ── 하단 요약 (Summary) ── */}
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
              /* [스켈레톤] 하단 요약 카드 3개 */
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
    </div>
  );
}