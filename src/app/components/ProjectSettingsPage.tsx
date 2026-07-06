import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Folder,
  Layers,
  ListTodo,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
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
  ProjectStatus,
  ProjectTechStack,
  ProjectTechStackCategory,
  ProjectTechStackInput,
  createProjectTechStack,
  deleteProjectTechStack,
  fetchProjectDetail,
  fetchProjectMemberDetail,
  fetchProjectMembers,
  fetchProjectSchedules,
  fetchProjectTechStacks,
  formatApiError,
  updateProject,
  updateProjectMemberDepartment,
  updateProjectMemberRole,
  updateProjectTechStack,
} from "../lib/api";
import { loadSettings, saveSettings } from "../data/projectSettingsStore";

const MEMBER_DEPARTMENTS: ProjectDepartment[] = [
  "BACKEND",
  "FRONTEND",
  "QA",
  "DEVOPS",
  "AI",
  "DESIGN",
  "PM",
];

const TECH_STACK_CATEGORIES: ProjectTechStackCategory[] = [
  "BACKEND",
  "FRONTEND",
  "DATABASE",
  "DEVOPS",
  "AI",
  "BUILD_TOOL",
  "LANGUAGE",
  "ETC",
];

const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ARCHIVED", "DELETED"];

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

type ProjectFormState = {
  projectName: string;
  description: string;
  repositoryUrl: string;
  localPath: string;
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
};

type MemberDraftMap = Record<number, { role: ProjectMemberRole; department: ProjectDepartment }>;

type TechFormState = {
  name: string;
  version: string;
  category: ProjectTechStackCategory;
  isRequired: boolean;
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
  projectName: "",
  description: "",
  repositoryUrl: "",
  localPath: "",
  startDate: "",
  targetDate: "",
  status: "ACTIVE",
};

const EMPTY_TECH_FORM: TechFormState = {
  name: "",
  version: "",
  category: "BACKEND",
  isRequired: false,
};

function StatTile({ label, value }: { label: string; value: string }) {
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

function InputLabel({ children }: { children: string }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
      {children}
    </label>
  );
}

function buildMemberDrafts(members: ProjectMember[]): MemberDraftMap {
  return members.reduce<MemberDraftMap>((drafts, member) => {
    drafts[member.projectMemberId] = {
      role: member.role,
      department: member.department,
    };
    return drafts;
  }, {});
}

function buildProjectForm(detail: ProjectDetail): ProjectFormState {
  return {
    projectName: detail.projectName,
    description: detail.description ?? "",
    repositoryUrl: detail.repositoryUrl ?? "",
    localPath: detail.localPath ?? "",
    startDate: detail.startDate ?? "",
    targetDate: detail.targetDate ?? "",
    status: detail.status,
  };
}

function buildTechForm(stack?: ProjectTechStack): TechFormState {
  if (!stack) {
    return EMPTY_TECH_FORM;
  }

  return {
    name: stack.name,
    version: stack.version ?? "",
    category: stack.category,
    isRequired: stack.isRequired,
  };
}

export function ProjectSettingsPage({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [techStacks, setTechStacks] = useState<ProjectTechStack[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<ProjectMember | null>(null);
  const [memberDrafts, setMemberDrafts] = useState<MemberDraftMap>({});
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [techForm, setTechForm] = useState<TechFormState>(EMPTY_TECH_FORM);
  const [editingTechStackId, setEditingTechStackId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);
  const [savingTech, setSavingTech] = useState(false);
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
      setSelectedMemberDetail(null);
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
      setProjectForm(buildProjectForm(nextDetail));
      setMembers(memberList.members);
      setMemberDrafts(buildMemberDrafts(memberList.members));
      setTechStacks(techList.techStacks);
      setSchedules(scheduleList.schedules);
      setError(null);

      if (memberList.members.length > 0) {
        const initialMemberDetail = await fetchProjectMemberDetail(projectId, memberList.members[0].projectMemberId);
        setSelectedMemberDetail(initialMemberDetail);
      } else {
        setSelectedMemberDetail(null);
      }

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

  const handleSelectMember = async (memberId: number) => {
    if (!projectId) {
      return;
    }

    try {
      const memberDetail = await fetchProjectMemberDetail(projectId, memberId);
      setSelectedMemberDetail(memberDetail);
    } catch (memberError) {
      toast.error(formatApiError(memberError));
    }
  };

  const handleProjectSave = async () => {
    if (!projectId || !detail) {
      return;
    }

    setSavingProject(true);

    try {
      const updated = await updateProject(projectId, {
        projectName: projectForm.projectName.trim(),
        description: projectForm.description.trim() || undefined,
        repositoryUrl: projectForm.repositoryUrl.trim() || undefined,
        localPath: projectForm.localPath.trim() || undefined,
        startDate: projectForm.startDate || null,
        targetDate: projectForm.targetDate || null,
        status: projectForm.status,
      });

      const nextDetail: ProjectDetail = {
        ...detail,
        ...updated,
      };

      setDetail(nextDetail);
      setProjectForm(buildProjectForm(nextDetail));
      toast.success("프로젝트 정보를 수정했습니다.");
    } catch (projectError) {
      toast.error(formatApiError(projectError));
    } finally {
      setSavingProject(false);
    }
  };

  const handleMemberRoleSave = async (member: ProjectMember) => {
    if (!projectId) {
      return;
    }

    const draft = memberDrafts[member.projectMemberId];
    if (!draft || draft.role === member.role) {
      toast("변경된 역할이 없습니다.");
      return;
    }

    setSavingMemberId(member.projectMemberId);

    try {
      const updated = await updateProjectMemberRole(projectId, member.projectMemberId, {
        role: draft.role,
      });

      setMembers((current) =>
        current.map((item) =>
          item.projectMemberId === member.projectMemberId ? { ...item, ...updated, role: draft.role } : item
        )
      );

      setSelectedMemberDetail((current) =>
        current?.projectMemberId === member.projectMemberId ? { ...current, role: draft.role } : current
      );

      toast.success("멤버 역할을 변경했습니다.");
    } catch (memberError) {
      toast.error(formatApiError(memberError));
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleMemberDepartmentSave = async (member: ProjectMember) => {
    if (!projectId) {
      return;
    }

    const draft = memberDrafts[member.projectMemberId];
    if (!draft || draft.department === member.department) {
      toast("변경된 부서가 없습니다.");
      return;
    }

    setSavingMemberId(member.projectMemberId);

    try {
      const updated = await updateProjectMemberDepartment(projectId, member.projectMemberId, {
        department: draft.department,
      });

      setMembers((current) =>
        current.map((item) =>
          item.projectMemberId === member.projectMemberId
            ? { ...item, ...updated, department: draft.department }
            : item
        )
      );

      setSelectedMemberDetail((current) =>
        current?.projectMemberId === member.projectMemberId ? { ...current, department: draft.department } : current
      );

      toast.success("멤버 부서를 변경했습니다.");
    } catch (memberError) {
      toast.error(formatApiError(memberError));
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleTechSubmit = async () => {
    if (!projectId) {
      return;
    }

    const payload: ProjectTechStackInput = {
      name: techForm.name.trim(),
      version: techForm.version.trim() || undefined,
      category: techForm.category,
      isRequired: techForm.isRequired,
    };

    if (!payload.name) {
      toast.error("기술 스택 이름을 입력해주세요.");
      return;
    }

    setSavingTech(true);

    try {
      if (editingTechStackId) {
        const updated = await updateProjectTechStack(projectId, editingTechStackId, payload);
        setTechStacks((current) =>
          current.map((stack) => (stack.techStackId === editingTechStackId ? { ...stack, ...updated } : stack))
        );
        toast.success("기술 스택을 수정했습니다.");
      } else {
        const created = await createProjectTechStack(projectId, payload);
        setTechStacks((current) => [created, ...current]);
        toast.success("기술 스택을 추가했습니다.");
      }

      setEditingTechStackId(null);
      setTechForm(EMPTY_TECH_FORM);
    } catch (techError) {
      toast.error(formatApiError(techError));
    } finally {
      setSavingTech(false);
    }
  };

  const handleTechEdit = (stack: ProjectTechStack) => {
    setEditingTechStackId(stack.techStackId);
    setTechForm(buildTechForm(stack));
  };

  const handleTechDelete = async (stack: ProjectTechStack) => {
    if (!projectId) {
      return;
    }

    const shouldDelete = window.confirm(`"${stack.name}" 기술 스택을 삭제할까요?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteProjectTechStack(projectId, stack.techStackId);
      setTechStacks((current) => current.filter((item) => item.techStackId !== stack.techStackId));

      if (editingTechStackId === stack.techStackId) {
        setEditingTechStackId(null);
        setTechForm(EMPTY_TECH_FORM);
      }

      toast.success("기술 스택을 삭제했습니다.");
    } catch (techError) {
      toast.error(formatApiError(techError));
    }
  };

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
            프로젝트를 먼저 선택한 뒤 설정 화면을 열어주세요.
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
      <div className="mx-auto max-w-7xl space-y-5">
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
                프로젝트 정보 수정, 멤버 관리, 기술 스택 관리, 일정 현황을 한 화면에서 확인할 수 있습니다.
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
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Folder className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  프로젝트 정보 수정
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <InputLabel>Project Name</InputLabel>
                  <input
                    value={projectForm.projectName}
                    onChange={(event) => setProjectForm((current) => ({ ...current, projectName: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Status</InputLabel>
                  <select
                    value={projectForm.status}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <InputLabel>Description</InputLabel>
                  <textarea
                    value={projectForm.description}
                    onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Repository URL</InputLabel>
                  <input
                    value={projectForm.repositoryUrl}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, repositoryUrl: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Local Path</InputLabel>
                  <input
                    value={projectForm.localPath}
                    onChange={(event) => setProjectForm((current) => ({ ...current, localPath: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Start Date</InputLabel>
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(event) => setProjectForm((current) => ({ ...current, startDate: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Target Date</InputLabel>
                  <input
                    type="date"
                    value={projectForm.targetDate}
                    onChange={(event) => setProjectForm((current) => ({ ...current, targetDate: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleProjectSave()}
                  disabled={savingProject}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  <Save className="h-4 w-4" />
                  {savingProject ? "저장 중..." : "프로젝트 정보 저장"}
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "team" && (
          <section className="grid gap-5 xl:grid-cols-[1.3fr,0.9fr]">
            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  프로젝트 멤버 관리
                </h2>
              </div>

              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                    표시할 멤버가 없습니다.
                  </p>
                ) : (
                  members.map((member) => {
                    const draft = memberDrafts[member.projectMemberId] ?? {
                      role: member.role,
                      department: member.department,
                    };

                    return (
                      <div
                        key={member.projectMemberId}
                        className="rounded-2xl border px-4 py-4"
                        style={{ background: "rgba(248,243,225,0.55)", borderColor: BORDER_SUBTLE }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => void handleSelectMember(member.projectMemberId)}
                            className="text-left"
                          >
                            <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                              {member.name}
                            </p>
                            <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                              {member.email}
                            </p>
                          </button>

                          <span
                            className="rounded-full px-2.5 py-1 text-[11px]"
                            style={{ background: "rgba(136,138,98,0.12)", color: TEXT_SECONDARY }}
                          >
                            {member.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto,1fr,auto]">
                          <select
                            value={draft.role}
                            onChange={(event) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.projectMemberId]: {
                                  ...draft,
                                  role: event.target.value as ProjectMemberRole,
                                },
                              }))
                            }
                            className="rounded-2xl border px-3 py-2 text-sm outline-none"
                            style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "white" }}
                          >
                            {Object.entries(ROLE_LABELS).map(([role, label]) => (
                              <option key={role} value={role}>
                                {label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={savingMemberId === member.projectMemberId}
                            onClick={() => void handleMemberRoleSave(member)}
                            className="rounded-full border px-3 py-2 text-[11px] font-semibold"
                            style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                          >
                            역할 저장
                          </button>

                          <select
                            value={draft.department}
                            onChange={(event) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.projectMemberId]: {
                                  ...draft,
                                  department: event.target.value as ProjectDepartment,
                                },
                              }))
                            }
                            className="rounded-2xl border px-3 py-2 text-sm outline-none"
                            style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "white" }}
                          >
                            {MEMBER_DEPARTMENTS.map((department) => (
                              <option key={department} value={department}>
                                {DEPARTMENT_LABELS[department]}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={savingMemberId === member.projectMemberId}
                            onClick={() => void handleMemberDepartmentSave(member)}
                            className="rounded-full border px-3 py-2 text-[11px] font-semibold"
                            style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                          >
                            부서 저장
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  멤버 상세
                </h2>
              </div>

              {!selectedMemberDetail ? (
                <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                  멤버를 선택하면 상세 정보를 볼 수 있습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Name
                    </p>
                    <p className="mt-2 text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                      {selectedMemberDetail.name}
                    </p>
                  </div>

                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Email
                    </p>
                    <p className="mt-2 text-sm" style={{ color: TEXT_PRIMARY }}>
                      {selectedMemberDetail.email}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <StatTile label="Role" value={ROLE_LABELS[selectedMemberDetail.role]} />
                    <StatTile label="Department" value={DEPARTMENT_LABELS[selectedMemberDetail.department]} />
                  </div>

                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: BORDER_SUBTLE, background: ACCENT_BG }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
                      Joined At
                    </p>
                    <p className="mt-2 text-sm" style={{ color: TEXT_PRIMARY }}>
                      {selectedMemberDetail.joinedAt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "tech" && (
          <section className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  기술 스택 {editingTechStackId ? "수정" : "추가"}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <InputLabel>Name</InputLabel>
                  <input
                    value={techForm.name}
                    onChange={(event) => setTechForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Version</InputLabel>
                  <input
                    value={techForm.version}
                    onChange={(event) => setTechForm((current) => ({ ...current, version: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  />
                </div>

                <div>
                  <InputLabel>Category</InputLabel>
                  <select
                    value={techForm.category}
                    onChange={(event) =>
                      setTechForm((current) => ({
                        ...current,
                        category: event.target.value as ProjectTechStackCategory,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: ACCENT_BG }}
                  >
                    {TECH_STACK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: BORDER, background: ACCENT_BG }}>
                  <input
                    type="checkbox"
                    checked={techForm.isRequired}
                    onChange={(event) => setTechForm((current) => ({ ...current, isRequired: event.target.checked }))}
                  />
                  <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    필수 기술 스택으로 지정
                  </span>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {editingTechStackId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTechStackId(null);
                      setTechForm(EMPTY_TECH_FORM);
                    }}
                    className="rounded-full border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                  >
                    편집 취소
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleTechSubmit()}
                  disabled={savingTech}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  <Save className="h-4 w-4" />
                  {savingTech ? "저장 중..." : editingTechStackId ? "기술 스택 수정" : "기술 스택 추가"}
                </button>
              </div>
            </div>

            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  기술 스택 목록
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
                          {stack.category} · {stack.version || "버전 미지정"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px]"
                          style={{
                            background: stack.isRequired ? "rgba(90,138,74,0.12)" : "rgba(136,138,98,0.12)",
                            color: stack.isRequired ? "#5A8A4A" : TEXT_SECONDARY,
                          }}
                        >
                          {stack.isRequired ? "Required" : "Optional"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleTechEdit(stack)}
                          className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
                          style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                        >
                          수정
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleTechDelete(stack)}
                          className="rounded-full border p-2"
                          style={{ borderColor: BORDER_SUBTLE, color: STATUS_ERROR }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                일정 현황
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <StatTile label="Total" value={`${scheduleSummary.total}`} />
              <StatTile label="Completed" value={`${scheduleSummary.completed}`} />
              <StatTile label="In Progress" value={`${scheduleSummary.inProgress}`} />
              <StatTile label="Pending" value={`${scheduleSummary.pending}`} />
            </div>

            <div className="mt-5 space-y-3">
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
                          <span
                            className="rounded-full px-2.5 py-1"
                            style={{ color: statusTone.color, background: statusTone.bg }}
                          >
                            {schedule.status}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-1"
                            style={{ background: ACCENT_BG, color: ACCENT }}
                          >
                            {schedule.priority}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          {schedule.startDate || "-"} ~ {schedule.endDate || "-"}
                        </span>
                      </div>
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