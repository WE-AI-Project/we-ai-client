import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Folder,
  Layers,
  ListTodo,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
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
  ProjectDepartment,
  ProjectDetail,
  ProjectMember,
  ProjectMemberRole,
  ProjectSchedule,
  ProjectScheduleStatus,
  ProjectTechStack,
  fetchProjectDetail,
  fetchProjectMembers,
  fetchProjectSchedules,
  fetchProjectTechStacks,
  formatApiError,
} from "../lib/api";
import { loadSettings, saveSettings } from "../data/projectSettingsStore";

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

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  LEADER: "Leader",
  MEMBER: "Member",
  GUEST: "Guest",
};

const SCHEDULE_STATUS_COLORS: Record<ProjectScheduleStatus, { color: string; bg: string }> = {
  TODO: { color: "#C09840", bg: "rgba(192,152,64,0.12)" },
  IN_PROGRESS: { color: ACCENT, bg: ACCENT_BG },
  DONE: { color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  COMPLETED: { color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  HOLD: { color: "#888A62", bg: "rgba(136,138,98,0.12)" },
};

type TabId = "overview" | "team" | "tech" | "schedules";

type Props = {
  projectId: number | null;
};

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
      style={{
        background: active ? ACCENT : "transparent",
        color: active ? "white" : TEXT_SECONDARY,
        border: `1px solid ${active ? ACCENT : ACCENT_BORDER}`,
      }}
    >
      {label}
    </button>
  );
}

export function ProjectSettingsPage({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [techStacks, setTechStacks] = useState<ProjectTechStack[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scheduleSummary = useMemo(
    () => ({
      total: schedules.length,
      completed: schedules.filter((item) => item.status === "DONE" || item.status === "COMPLETED").length,
      inProgress: schedules.filter((item) => item.status === "IN_PROGRESS").length,
      pending: schedules.filter((item) => item.status === "TODO").length,
    }),
    [schedules]
  );

  const loadProjectSettings = async () => {
    if (!projectId) {
      setLoading(false);
      setDetail(null);
      setMembers([]);
      setTechStacks([]);
      setSchedules([]);
      return;
    }

    setLoading(true);

    try {
      const [nextDetail, memberList, techList, scheduleList] = await Promise.all([
        fetchProjectDetail(projectId),
        fetchProjectMembers(projectId),
        fetchProjectTechStacks(projectId),
        fetchProjectSchedules(projectId),
      ]);

      setDetail(nextDetail);
      setMembers(memberList.members);
      setTechStacks(techList.techStacks);
      setSchedules(scheduleList.schedules);
      setError(null);

      const cachedSettings = loadSettings();
      saveSettings({
        ...cachedSettings,
        projectName: nextDetail.projectName,
        description: nextDetail.description || cachedSettings.description,
        startDate: nextDetail.startDate || cachedSettings.startDate,
        targetDate: nextDetail.targetDate || cachedSettings.targetDate,
        repository: nextDetail.repositoryUrl || cachedSettings.repository,
      });
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjectSettings();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GRADIENT_PAGE }}>
        <div
          className="rounded-3xl border px-6 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.94)", borderColor: BORDER }}
        >
          <p className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
            설정을 표시할 프로젝트가 없습니다.
          </p>
          <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
            프로젝트를 연 뒤 다시 확인해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GRADIENT_PAGE }}>
        <div
          className="rounded-3xl border px-6 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.94)", borderColor: BORDER }}
        >
          <p className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
            프로젝트 설정을 불러오는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  if (!detail || error) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GRADIENT_PAGE }}>
        <div
          className="max-w-lg rounded-3xl border px-6 py-6 text-center"
          style={{ background: "rgba(255,255,255,0.94)", borderColor: BORDER }}
        >
          <p className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
            프로젝트 설정을 불러오지 못했습니다.
          </p>
          <p className="mt-2 text-sm" style={{ color: error ? STATUS_ERROR : TEXT_SECONDARY }}>
            {error ?? "응답 데이터가 비어 있습니다."}
          </p>
          <button
            onClick={() => void loadProjectSettings()}
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

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: GRADIENT_PAGE }}>
      <div className="mx-auto max-w-6xl space-y-5">
        <section
          className="rounded-[28px] border px-6 py-6"
          style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" style={{ color: ACCENT }} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEXT_LABEL }}>
                  Project Settings
                </p>
              </div>
              <h1 className="mt-2 text-3xl font-bold" style={{ color: TEXT_PRIMARY }}>
                {detail.projectName}
              </h1>
              <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                읽기 전용으로 프로젝트 상세, 멤버, 기술 스택, 일정을 서버 응답에서 표시합니다.
              </p>
            </div>

            <button
              onClick={() => void loadProjectSettings()}
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <TabButton active={activeTab === "overview"} label="개요" onClick={() => setActiveTab("overview")} />
            <TabButton active={activeTab === "team"} label="멤버" onClick={() => setActiveTab("team")} />
            <TabButton active={activeTab === "tech"} label="기술 스택" onClick={() => setActiveTab("tech")} />
            <TabButton active={activeTab === "schedules"} label="일정" onClick={() => setActiveTab("schedules")} />
          </div>
        </section>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <section className="grid gap-4 md:grid-cols-4">
              <StatTile label="Status" value={detail.status} />
              <StatTile label="Members" value={`${members.length}`} />
              <StatTile label="Tech Stack" value={`${techStacks.length}`} />
              <StatTile label="Schedules" value={`${scheduleSummary.total}`} />
            </section>

            <section
              className="grid gap-4 rounded-[28px] border px-5 py-5 md:grid-cols-2"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" style={{ color: ACCENT }} />
                  <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                    기본 정보
                  </h2>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border px-4 py-3" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Join Code
                    </p>
                    <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                      {detail.projectCode}
                    </p>
                  </div>
                  <div className="rounded-2xl border px-4 py-3" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Repository URL
                    </p>
                    <p className="mt-2 break-all text-sm" style={{ color: TEXT_PRIMARY }}>
                      {detail.repositoryUrl || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border px-4 py-3" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Local Path
                    </p>
                    <p className="mt-2 break-all text-sm" style={{ color: TEXT_PRIMARY }}>
                      {detail.localPath || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: ACCENT }} />
                  <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                    일정 요약
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile label="Start Date" value={detail.startDate || "-"} />
                  <StatTile label="Target Date" value={detail.targetDate || "-"} />
                  <StatTile label="In Progress" value={`${scheduleSummary.inProgress}`} />
                  <StatTile label="Completed" value={`${scheduleSummary.completed}`} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "team" && (
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                프로젝트 멤버
              </h2>
            </div>

            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                  표시할 멤버가 없습니다.
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.projectMemberId}
                    className="rounded-2xl border px-4 py-4"
                    style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                          {member.name}
                        </p>
                        <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                          {member.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full px-2.5 py-1" style={{ background: ACCENT_BG, color: ACCENT }}>
                          {ROLE_LABELS[member.role]}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1"
                          style={{ background: "rgba(90,138,74,0.12)", color: "#5A8A4A" }}
                        >
                          {DEPARTMENT_LABELS[member.department]}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1"
                          style={{ background: "rgba(136,138,98,0.12)", color: TEXT_SECONDARY }}
                        >
                          {member.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                      joinedAt: {member.joinedAt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "tech" && (
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                기술 스택
              </h2>
            </div>

            <div className="space-y-3">
              {techStacks.length === 0 ? (
                <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                  등록된 기술 스택이 없습니다.
                </p>
              ) : (
                techStacks.map((stack) => (
                  <div
                    key={stack.techStackId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4"
                    style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                        {stack.name}
                      </p>
                      <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                        {stack.category}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full px-2.5 py-1" style={{ background: ACCENT_BG, color: ACCENT }}>
                        {stack.version || "-"}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-1"
                        style={{
                          background: stack.isRequired ? "rgba(90,138,74,0.12)" : "rgba(136,138,98,0.12)",
                          color: stack.isRequired ? "#5A8A4A" : TEXT_SECONDARY,
                        }}
                      >
                        {stack.isRequired ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "schedules" && (
          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <ListTodo className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                일정 목록
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <StatTile label="Total" value={`${scheduleSummary.total}`} />
              <StatTile label="Completed" value={`${scheduleSummary.completed}`} />
              <StatTile label="In Progress" value={`${scheduleSummary.inProgress}`} />
              <StatTile label="Pending" value={`${scheduleSummary.pending}`} />
            </div>

            <div className="mt-4 space-y-3">
              {schedules.length === 0 ? (
                <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                  등록된 일정이 없습니다.
                </p>
              ) : (
                schedules.map((schedule) => {
                  const statusTone = SCHEDULE_STATUS_COLORS[schedule.status];

                  return (
                    <div
                      key={schedule.scheduleId}
                      className="rounded-2xl border px-4 py-4"
                      style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                            {schedule.title}
                          </p>
                          <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                            {DEPARTMENT_LABELS[schedule.department]} · {schedule.assigneeName}
                          </p>
                          {schedule.description && (
                            <p className="mt-2 text-[12px]" style={{ color: TEXT_SECONDARY }}>
                              {schedule.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full px-2.5 py-1" style={{ color: statusTone.color, background: statusTone.bg }}>
                            {schedule.status}
                          </span>
                          <span className="rounded-full px-2.5 py-1" style={{ background: ACCENT_BG, color: ACCENT }}>
                            {schedule.priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                        {schedule.startDate || "-"} → {schedule.endDate || "-"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
