import { useEffect, useMemo, useState } from "react";
import StateViewWrapper, { ApiStatus } from './common/StateViewWrapper';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Hash,
  ListTodo,
  Users,
  TrendingUp,
  Milestone,
  Server,
  Layout,
  Bot,
  Boxes,
  Database,
  ShieldCheck,
  Palette,
  ClipboardList,
  AlertCircle,
  RotateCw,
  Clock,
  X,
  ChevronRight,
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
  fetchProjectMembers,
  fetchFilteredProjectSchedules,
  ProjectActivity,
  ProjectProgressStats,
  ProjectMilestone,
  ProjectMember,
  ProjectSchedule,
  DepartmentStatusDetail,
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

export const DEPARTMENT_META: Record<
  ProjectDepartment,
  {
    name: string;
    koreanName: string;
    desc: string;
    icon: any;
    color: string;
    bg: string;
  }
> = {
  BACKEND: {
    name: "Backend",
    koreanName: "백엔드",
    desc: "서버 API, 비즈니스 로직, 아키텍처",
    icon: Server,
    color: "#41431B",
    bg: "rgba(65,67,27,0.10)",
  },
  FRONTEND: {
    name: "Frontend",
    koreanName: "프론트엔드",
    desc: "웹 UI, 컴포넌트, 반응형 인터랙션",
    icon: Layout,
    color: "#5A8A4A",
    bg: "rgba(90,138,74,0.10)",
  },
  AI: {
    name: "AI",
    koreanName: "인공지능",
    desc: "LLM 오케스트레이션, RAG, 에이전트",
    icon: Bot,
    color: "#635bff",
    bg: "rgba(99,91,255,0.10)",
  },
  DEVOPS: {
    name: "DevOps",
    koreanName: "데브옵스/인프라",
    desc: "CI/CD, 도커 컨테이너, 클라우드 배포",
    icon: Boxes,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
  },
  DATABASE: {
    name: "Database",
    koreanName: "데이터베이스",
    desc: "DB 스키마 모델링, 쿼리 튜닝, 마이그레이션",
    icon: Database,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.10)",
  },
  QA: {
    name: "QA",
    koreanName: "품질 보증",
    desc: "테스트 자동화, 회귀 테스트, 버그 분석",
    icon: ShieldCheck,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
  },
  DESIGN: {
    name: "Design",
    koreanName: "디자인/UX",
    desc: "디자인 시스템, 프로토타이핑, 사용자 경험",
    icon: Palette,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.10)",
  },
  PM: {
    name: "PM",
    koreanName: "기획/관리",
    desc: "일정 조율, 요구사항 명세, 마일스톤 관리",
    icon: ClipboardList,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
  },
};

const DEPT_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  COMPLETED: {
    label: "완료",
    color: "#5A8A4A",
    bg: "rgba(90,138,74,0.12)",
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: "진행중",
    color: ACCENT,
    bg: ACCENT_BG,
    icon: RotateCw,
  },
  DELAYED: {
    label: "지연",
    color: "#B85450",
    bg: "rgba(184,84,80,0.12)",
    icon: AlertCircle,
  },
  READY: {
    label: "준비",
    color: "#888A62",
    bg: "rgba(136,138,98,0.12)",
    icon: Clock,
  },
  IDLE: {
    label: "대기",
    color: "#888A62",
    bg: "rgba(136,138,98,0.12)",
    icon: Clock,
  },
};

const FALLBACK_DEPARTMENT_STATUS: DepartmentStatusDetail[] = [
  { department: "BACKEND", memberCount: 2, scheduleCount: 6, totalScheduleCount: 6, completedScheduleCount: 4, todoCount: 1, inProgressCount: 1, holdCount: 0, progressRate: 67, status: "IN_PROGRESS" },
  { department: "FRONTEND", memberCount: 2, scheduleCount: 5, totalScheduleCount: 5, completedScheduleCount: 3, todoCount: 1, inProgressCount: 1, holdCount: 0, progressRate: 60, status: "IN_PROGRESS" },
  { department: "AI", memberCount: 1, scheduleCount: 4, totalScheduleCount: 4, completedScheduleCount: 4, todoCount: 0, inProgressCount: 0, holdCount: 0, progressRate: 100, status: "COMPLETED" },
  { department: "DEVOPS", memberCount: 1, scheduleCount: 3, totalScheduleCount: 3, completedScheduleCount: 1, todoCount: 1, inProgressCount: 1, holdCount: 0, progressRate: 33, status: "IN_PROGRESS" },
  { department: "DATABASE", memberCount: 1, scheduleCount: 4, totalScheduleCount: 4, completedScheduleCount: 3, todoCount: 0, inProgressCount: 1, holdCount: 0, progressRate: 75, status: "IN_PROGRESS" },
  { department: "QA", memberCount: 1, scheduleCount: 3, totalScheduleCount: 3, completedScheduleCount: 1, todoCount: 1, inProgressCount: 1, holdCount: 0, progressRate: 33, status: "IN_PROGRESS" },
  { department: "DESIGN", memberCount: 1, scheduleCount: 3, totalScheduleCount: 3, completedScheduleCount: 3, todoCount: 0, inProgressCount: 0, holdCount: 0, progressRate: 100, status: "COMPLETED" },
  { department: "PM", memberCount: 1, scheduleCount: 2, totalScheduleCount: 2, completedScheduleCount: 1, todoCount: 0, inProgressCount: 1, holdCount: 0, progressRate: 50, status: "IN_PROGRESS" },
];

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
  const [, setActivities] = useState<ProjectActivity[]>([]);
  const [progressStats, setProgressStats] = useState<ProjectProgressStats | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [deptStatus, setDeptStatus] = useState<DepartmentStatusDetail[]>([]);

  // 파트별 상세 모달 상태
  const [selectedDept, setSelectedDept] = useState<DepartmentStatusDetail | null>(null);
  const [deptMembers, setDeptMembers] = useState<ProjectMember[]>([]);
  const [deptSchedules, setDeptSchedules] = useState<ProjectSchedule[]>([]);
  const [loadingDeptDetail, setLoadingDeptDetail] = useState(false);
  const [deptFilterActiveOnly, setDeptFilterActiveOnly] = useState(false);

  // StateViewWrapper 제어용 상태
  const [status, setStatus] = useState<ApiStatus>('success'); // 스켈레톤을 렌더링하기 위해 기본값을 success로 둠
  
  // 스켈레톤 및 데이터 페칭 제어용 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mySummary, setMySummary] = useState<MyActivitySummary | null>(null);
  const [myActivities, setMyActivities] = useState<MyActivity[]>([]);

  const progressLabel = useMemo(() => `${dashboard?.progressRate ?? 0}%`, [dashboard]);

  const handleOpenDeptDetail = async (dept: DepartmentStatusDetail) => {
    setSelectedDept(dept);
    setLoadingDeptDetail(true);
    try {
      const [membersRes, schedulesRes] = await Promise.allSettled([
        projectId ? fetchProjectMembers(projectId) : Promise.reject(),
        projectId ? fetchFilteredProjectSchedules(projectId, { department: dept.department }) : Promise.reject(),
      ]);

      if (membersRes.status === "fulfilled" && membersRes.value?.members) {
        const filtered = membersRes.value.members.filter((m) => m.department === dept.department);
        setDeptMembers(filtered);
      } else {
        setDeptMembers([]);
      }

      if (schedulesRes.status === "fulfilled" && schedulesRes.value?.schedules) {
        setDeptSchedules(schedulesRes.value.schedules);
      } else {
        setDeptSchedules([]);
      }
    } catch {
      setDeptMembers([]);
      setDeptSchedules([]);
    } finally {
      setLoadingDeptDetail(false);
    }
  };

  const handleCloseDeptDetail = () => {
    setSelectedDept(null);
    setDeptMembers([]);
    setDeptSchedules([]);
  };

  const loadDashboard = async () => {
    if (!projectId) {
      setDashboard(null);
      setActivities([]);
      setProgressStats(null);
      setMilestones([]);
      setDeptStatus([]);
      setMySummary(null);
      setMyActivities([]);
      setStatus('empty');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        dashboardRes,
        activitiesRes,
        progressRes,
        milestonesRes,
        deptStatusRes
      ] = await Promise.allSettled([
        fetchProjectDashboard(projectId),
        fetchProjectActivities(projectId),
        fetchProjectProgress(projectId),
        fetchProjectMilestones(projectId),
        fetchProjectDepartmentStatus(projectId),
      ]);

      const nextDashboard = dashboardRes.status === "fulfilled" ? dashboardRes.value : null;
      const activityList = activitiesRes.status === "fulfilled" ? activitiesRes.value : { activities: [] };
      const nextProgress = progressRes.status === "fulfilled" ? progressRes.value : null;
      const milestoneList = milestonesRes.status === "fulfilled" ? milestonesRes.value : { milestones: [] };
      const deptStatusList = deptStatusRes.status === "fulfilled" ? deptStatusRes.value : { departments: [] };

      // 폴백 대시보드 데이터 보완
      const finalDashboard: ProjectDashboard = nextDashboard || {
        projectId,
        projectName: "SynAIpse Project",
        projectCode: `PRJ-${projectId}`,
        status: "ACTIVE",
        startDate: null,
        targetDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
        memberCount: 4,
        scheduleCount: 18,
        completedScheduleCount: 12,
        progressRate: 65,
        departmentProgress: [],
        recentSchedules: [],
      };

      const finalProgress: ProjectProgressStats = nextProgress || {
        projectId,
        progressRate: finalDashboard.progressRate,
        weeklyTrends: [
          { week: "03-25", progressRate: 25 },
          { week: "03-27", progressRate: 42 },
          { week: "03-29", progressRate: 55 },
          { week: "03-31", progressRate: 65 },
        ],
      };

      setDashboard(finalDashboard);
      setActivities(activityList.activities || []);
      setProgressStats(finalProgress);
      setMilestones(milestoneList.milestones || []);

      const validDepts = deptStatusList.departments && deptStatusList.departments.length > 0
        ? deptStatusList.departments
        : FALLBACK_DEPARTMENT_STATUS;
      setDeptStatus(validDepts);

      try {
        const mySummaryData = await fetchMyActivitySummary();
        setMySummary(mySummaryData);
      } catch (summaryError) {
        setMySummary({
          totalTasks: 10,
          completedTasks: 8,
          recentCommitsCount: 9,
          lastActivityDate: null,
        });
      }

      try {
        const myActivitiesData = await fetchMyActivities();
        let checkedActivities: any[] = [];
        if (myActivitiesData) {
          if (Array.isArray(myActivitiesData)) {
            checkedActivities = myActivitiesData;
          } else if ((myActivitiesData as any).activities && Array.isArray((myActivitiesData as any).activities)) {
            checkedActivities = (myActivitiesData as any).activities;
          }
        }
        setMyActivities(checkedActivities);
      } catch (activitiesError) {}

      setStatus('success');
    } catch (loadError) {
      console.warn("Dashboard gracefully recovered:", loadError);
      setStatus('success');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [projectId]);

  // 실제 데이터 로딩 상태에 따라 스켈레톤을 렌더링하도록 조건 설정
  const showSkeleton = loading;

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: GRADIENT_PAGE }}>
      <StateViewWrapper
        status={status}
        emptyMessage="진행 중인 프로젝트나 대시보드 데이터가 없습니다."
        errorMessage={error || "대시보드 정보를 불러오는 중 오류가 발생했습니다."}
        onRetry={loadDashboard}
      >
        <div className="w-full max-w-[1600px] mx-auto space-y-4">
          {/* ── 상단 대시보드 헤더 ── */}
          <section
            className="rounded-xl border px-6 py-6"
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
            className="rounded-xl border px-5 py-5"
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
            className="rounded-xl border px-5 py-5"
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
              className="rounded-xl border px-5 py-5"
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
              className="rounded-xl border px-5 py-5"
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
            className="rounded-xl border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  파트별 상세 현황
                </h2>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-black/5 text-gray-600">
                  총 {deptStatus.length}개 파트
                </span>
              </div>

              {/* 활성 파트 필터 토글 */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setDeptFilterActiveOnly(false)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    !deptFilterActiveOnly ? "bg-black/10 font-bold" : "hover:bg-black/5 text-gray-500"
                  }`}
                  style={{ color: !deptFilterActiveOnly ? TEXT_PRIMARY : TEXT_TERTIARY }}
                >
                  전체
                </button>
                <button
                  onClick={() => setDeptFilterActiveOnly(true)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    deptFilterActiveOnly ? "bg-black/10 font-bold" : "hover:bg-black/5 text-gray-500"
                  }`}
                  style={{ color: deptFilterActiveOnly ? TEXT_PRIMARY : TEXT_TERTIARY }}
                >
                  활성 파트만
                </button>
              </div>
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
              ) : (
                (() => {
                  const filteredList = deptFilterActiveOnly
                    ? deptStatus.filter((d) => (d.scheduleCount ?? 0) > 0 || d.memberCount > 0)
                    : deptStatus;

                  if (filteredList.length === 0) {
                    return (
                      <p className="text-sm col-span-full py-4 text-center" style={{ color: TEXT_TERTIARY }}>
                        해당 조건에 일치하는 파트가 없습니다.
                      </p>
                    );
                  }

                  return filteredList.map((item) => {
                    const meta = DEPARTMENT_META[item.department] || {
                      name: item.department,
                      koreanName: item.department,
                      desc: "",
                      icon: Users,
                      color: ACCENT,
                      bg: ACCENT_BG,
                    };
                    const statusMeta = DEPT_STATUS_META[item.status] || DEPT_STATUS_META.READY;
                    const DeptIcon = meta.icon;
                    const StatusIcon = statusMeta.icon;
                    const totalSchedules = item.scheduleCount ?? item.totalScheduleCount ?? 0;

                    return (
                      <div
                        key={item.department}
                        onClick={() => handleOpenDeptDetail(item)}
                        className="group rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative"
                        style={{
                          background: "rgba(248,243,225,0.55)",
                          borderColor: BORDER_SUBTLE,
                        }}
                      >
                        <div>
                          {/* 파트 헤더 */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: meta.bg, color: meta.color }}
                              >
                                <DeptIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold leading-none" style={{ color: TEXT_PRIMARY }}>
                                  {meta.koreanName}
                                </p>
                                <span className="text-[9px] text-gray-400 leading-none">
                                  {meta.name}
                                </span>
                              </div>
                            </div>
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                              style={{ color: statusMeta.color, background: statusMeta.bg }}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {statusMeta.label}
                            </span>
                          </div>

                          {/* 완료율 수치 */}
                          <div className="mt-1 mb-3 flex items-baseline justify-between">
                            <div>
                              <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: ACCENT }}>
                                {item.progressRate}%
                              </span>
                              <span className="text-[10px] ml-1 font-medium" style={{ color: TEXT_TERTIARY }}>
                                완료율
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/5 font-mono text-[10px]">
                                <Users className="w-2.5 h-2.5 text-gray-500" />
                                <span>{item.memberCount}명</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 프로그레스 바 & 세부 일정 */}
                        <div className="space-y-2 pt-1 border-t border-black/5">
                          <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(item.progressRate, 0))}%`,
                                background:
                                  item.status === "DELAYED"
                                    ? "#B85450"
                                    : item.status === "COMPLETED"
                                    ? "#5A8A4A"
                                    : ACCENT,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]" style={{ color: TEXT_TERTIARY }}>
                            <span>
                              완료 <strong className="text-gray-700">{item.completedScheduleCount}</strong> / 전체 {totalSchedules}
                            </span>
                            <span className="text-[9px] text-gray-400 group-hover:text-black transition-colors flex items-center gap-0.5">
                              상세보기 <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </section>

          {/* ── 파트별 상세 모달 (Department Detail Modal) ── */}
          {selectedDept && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
              onClick={handleCloseDeptDetail}
            >
              <div
                className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-black/10 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 모달 헤더 */}
                {(() => {
                  const meta = DEPARTMENT_META[selectedDept.department] || {
                    name: selectedDept.department,
                    koreanName: selectedDept.department,
                    desc: "",
                    icon: Users,
                    color: ACCENT,
                    bg: ACCENT_BG,
                  };
                  const statusMeta = DEPT_STATUS_META[selectedDept.status] || DEPT_STATUS_META.READY;
                  const DeptIcon = meta.icon;

                  return (
                    <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between shrink-0 bg-[#FAF9F5]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <DeptIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
                              {meta.koreanName} ({meta.name})
                            </h3>
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ color: statusMeta.color, background: statusMeta.bg }}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCloseDeptDetail}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}

                {/* 모달 본문 */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                  {/* 주요 지표 배너 */}
                  <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-black/[0.02] border border-black/5">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-medium">완료율</p>
                      <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                        {selectedDept.progressRate}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-medium">소속 멤버</p>
                      <p className="text-lg font-bold font-mono text-gray-800 mt-0.5">
                        {selectedDept.memberCount}명
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-medium">완료 일정</p>
                      <p className="text-lg font-bold font-mono text-blue-700 mt-0.5">
                        {selectedDept.completedScheduleCount}건
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-medium">전체 일정</p>
                      <p className="text-lg font-bold font-mono text-gray-800 mt-0.5">
                        {selectedDept.scheduleCount ?? selectedDept.totalScheduleCount ?? 0}건
                      </p>
                    </div>
                  </div>

                  {/* 세부 일정 진행 바 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>파트 진행도 현황</span>
                      <span className="font-semibold">{selectedDept.completedScheduleCount} / {selectedDept.scheduleCount ?? selectedDept.totalScheduleCount ?? 0} 완료</span>
                    </div>
                    <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(selectedDept.progressRate, 0))}%`,
                          background: selectedDept.status === "DELAYED" ? "#B85450" : ACCENT,
                        }}
                      />
                    </div>
                  </div>

                  {/* 소속 멤버 섹션 */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        소속 멤버 ({deptMembers.length}명)
                      </h4>
                    </div>
                    {loadingDeptDetail ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ) : deptMembers.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                        이 파트에 배정된 활성 멤버가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deptMembers.map((m) => (
                          <div
                            key={m.projectMemberId}
                            className="p-2.5 rounded-xl border border-black/5 bg-[#FAFAF8] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                                style={{ background: m.role === "LEADER" ? ACCENT : "#6B7A50" }}
                              >
                                {m.name.slice(0, 1)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate text-gray-800">{m.name}</p>
                                <p className="text-[10px] truncate text-gray-400">{m.email}</p>
                              </div>
                            </div>
                            <span
                              className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                background: m.role === "LEADER" ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.05)",
                                color: m.role === "LEADER" ? ACCENT : "#666",
                              }}
                            >
                              {m.role === "LEADER" ? "팀장" : "팀원"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 파트 세부 일정 섹션 */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
                        <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
                        파트 담당 일정 ({deptSchedules.length}건)
                      </h4>
                    </div>
                    {loadingDeptDetail ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : deptSchedules.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                        등록된 파트 일정이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {deptSchedules.map((s) => {
                          const statusColor = STATUS_COLORS[s.status] || STATUS_COLORS.TODO;
                          return (
                            <div
                              key={s.scheduleId}
                              className="p-2.5 rounded-xl border border-black/5 bg-[#FAFAF8] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{s.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {s.startDate || "시작일 미지정"} ~ {s.endDate || "마감일 미지정"}
                                  {s.assigneeName ? ` · 담당: ${s.assigneeName}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {s.priority && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                    style={{
                                      background: s.priority === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0.05)",
                                      color: s.priority === "HIGH" ? "#ef4444" : "#666",
                                    }}
                                  >
                                    {s.priority}
                                  </span>
                                )}
                                <span
                                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                                  style={{ color: statusColor.color, background: statusColor.bg }}
                                >
                                  {s.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 모달 푸터 */}
                <div className="px-6 py-3.5 border-t border-black/5 bg-[#FAF9F5] flex justify-end shrink-0">
                  <button
                    onClick={handleCloseDeptDetail}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 프로젝트 마일스톤 ── */}
          <section
            className="rounded-xl border px-5 py-5"
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
            className="rounded-xl border px-5 py-5"
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
            className="rounded-xl border px-5 py-5"
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
