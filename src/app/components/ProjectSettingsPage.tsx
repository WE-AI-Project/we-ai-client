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
  Pencil,
  X,
  Save,
  Plus,
  Trash2,
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
  ProjectTechStackCategory,
  fetchProjectDetail,
  fetchProjectMembers,
  fetchProjectSchedules,
  fetchProjectTechStacks,
  updateProject,
  addProjectTechStack,
  updateProjectTechStack,
  deleteProjectTechStack,
  fetchProjectMemberDetail,       // 추가
  updateProjectMemberRole,         // 추가
  updateProjectMemberDepartment,   // 추가
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

function ProjectEditModal({
  detail,
  onClose,
  onSave,
}: {
  detail: ProjectDetail;
  onClose: () => void;
  onSave: (updated: ProjectDetail) => void;
}) {
  const [name, setName] = useState(detail.projectName);
  const [desc, setDesc] = useState(detail.description || "");
  const [repoUrl, setRepoUrl] = useState(detail.repositoryUrl || "");
  const [locPath, setLocPath] = useState(detail.localPath || "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError("프로젝트 이름은 필수 입력 항목입니다.");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updated = await updateProject(detail.projectId, {
        projectName: name.trim(),
        description: desc.trim() || undefined,
        repositoryUrl: repoUrl.trim() || undefined,
        localPath: locPath.trim() || undefined,
      });
      onSave(updated);
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col bg-white border shadow-2xl"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b" style={{ borderColor: BORDER_SUBTLE }}>
          <p className="text-sm font-bold flex-1" style={{ color: TEXT_PRIMARY }}>프로젝트 정보 수정</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">프로젝트 이름 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">프로젝트 설명</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Repository URL</label>
            <input
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Local Path</label>
            <input
              value={locPath}
              onChange={e => setLocPath(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: BORDER_SUBTLE }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100" style={{ color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            onClick={() => void handleUpdate()}
            disabled={updating || !name.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {updating ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function TechStackModal({
  projectId,
  initial,
  onClose,
  onSave,
}: {
  projectId: number;
  initial?: ProjectTechStack | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [version, setVersion] = useState(initial?.version || "");
  const [category, setCategory] = useState<ProjectTechStackCategory>(initial?.category || "BACKEND");
  const [isRequired, setIsRequired] = useState(initial ? initial.isRequired : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("기술 명칭은 필수 항목입니다.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (initial) {
        await updateProjectTechStack(projectId, initial.techStackId, {
          name: name.trim(),
          version: version.trim() || undefined,
          category,
          isRequired,
        });
      } else {
        await addProjectTechStack(projectId, {
          name: name.trim(),
          version: version.trim() || undefined,
          category,
          isRequired,
        });
      }
      onSave();
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const categories: ProjectTechStackCategory[] = [
    "BACKEND", "FRONTEND", "DEVOPS", "AI", "DATABASE", "BUILD_TOOL", "LANGUAGE", "ETC"
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col bg-white border shadow-2xl"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b" style={{ borderColor: BORDER_SUBTLE }}>
          <p className="text-sm font-bold flex-1" style={{ color: TEXT_PRIMARY }}>
            {initial ? "기술 스택 수정" : "기술 스택 추가"}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">기술 명칭 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: Java, React, Docker"
              className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">버전</label>
            <input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="예: 17, 18.3.1, LATEST"
              className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-gray-50 border"
              style={{ color: TEXT_PRIMARY, borderColor: BORDER }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">카테고리</label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                    category === cat ? "bg-gray-100 border-gray-400 font-bold" : "bg-gray-50 border-transparent text-gray-500"
                  }`}
                  style={{ color: category === cat ? TEXT_PRIMARY : TEXT_TERTIARY }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>필수 여부</label>
              <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>프로젝트 진행에 핵심이 되는 필수 기술인지 지정합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRequired(!isRequired)}
              className="relative w-9 h-5 rounded-full transition-colors shrink-0"
              style={{ background: isRequired ? ACCENT : "rgba(0,0,0,0.12)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                style={{ left: isRequired ? "calc(100% - 1.125rem)" : "0.125rem" }}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: BORDER_SUBTLE }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100" style={{ color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || !name.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {submitting ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// 추가
function MemberEditModal({
  projectId,
  member,
  onClose,
  onSave,
}: {
  projectId: number;
  member: ProjectMember;
  onClose: () => void;
  onSave: () => void;
}) {
  const [role, setRole] = useState<ProjectMemberRole>(member.role);
  const [dept, setDept] = useState<ProjectDepartment>(member.department);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setUpdating(true);
    setError(null);
    try {
      if (role !== member.role) {
        await updateProjectMemberRole(projectId, member.projectMemberId, role);
      }
      if (dept !== member.department) {
        await updateProjectMemberDepartment(projectId, member.projectMemberId, dept);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  const roles: ProjectMemberRole[] = ["LEADER", "MEMBER", "GUEST"];
  const depts: ProjectDepartment[] = ["BACKEND", "FRONTEND", "QA", "DEVOPS", "AI", "DATABASE", "DESIGN", "PM"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col bg-white border shadow-2xl" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b" style={{ borderColor: BORDER_SUBTLE }}>
          <p className="text-sm font-bold flex-1" style={{ color: TEXT_PRIMARY }}>멤버 상세 편집 및 변경</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">멤버 정보</label>
            <p className="text-xs font-bold px-1" style={{ color: TEXT_PRIMARY }}>{member.name} ({member.email})</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">역할 (Role)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                    role === r ? "bg-gray-100 border-gray-400 font-bold" : "bg-gray-50 border-transparent text-gray-500"
                  }`}
                  style={{ color: role === r ? TEXT_PRIMARY : TEXT_TERTIARY }}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">소속 파트 (Department)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {depts.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d)}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                    dept === d ? "bg-gray-100 border-gray-400 font-bold" : "bg-gray-50 border-transparent text-gray-500"
                  }`}
                  style={{ color: dept === d ? TEXT_PRIMARY : TEXT_TERTIARY }}
                >
                  {DEPARTMENT_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: BORDER_SUBTLE }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100" style={{ color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {updating ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            변경 저장
          </button>
        </div>
      </div>
    </div>
  );
}

type TabId = "overview" | "team" | "tech" | "schedules";

type Props = {
  projectId: number | null;
};

export function ProjectSettingsPage({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [techStacks, setTechStacks] = useState<ProjectTechStack[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditOpen] = useState(false);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<ProjectTechStack | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false); // 추가
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null); // 추가

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

  const handleTechDelete = async (techStackId: number) => {
    if (!window.confirm("정말 이 기술 스택을 삭제하시겠습니까?")) return;
    try {
      await deleteProjectTechStack(projectId!, techStackId);
      const techList = await fetchProjectTechStacks(projectId!);
      setTechStacks(techList.techStacks);
    } catch (err) {
      alert(formatApiError(err));
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
                프로젝트 상세 정보 변경 및 파트별 현황을 유연하게 제어할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-800 border"
                style={{ borderColor: ACCENT_BORDER }}
              >
                <Pencil className="h-3.5 w-3.5" />
                정보 수정
              </button>

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
                      <div className="flex flex-wrap gap-2 text-[11px] items-center">
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
                        <button
                          onClick={async () => {
                            try {
                              const data = await fetchProjectMemberDetail(projectId!, member.projectMemberId);
                              setSelectedMember(data);
                              setIsMemberModalOpen(true);
                            } catch (err) {
                              alert(formatApiError(err));
                            }
                          }}
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-black/[0.06] ml-1"
                          title="멤버 상세 편집"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                        </button>
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
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: ACCENT }} />
                <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                  기술 스택
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedTech(null);
                  setIsTechModalOpen(true);
                }}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-800 border"
                style={{ borderColor: ACCENT_BORDER }}
              >
                <Plus className="w-3.5 h-3.5" />
                기술 추가
              </button>
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                        {stack.name}
                      </p>
                      <p className="mt-1 text-[12px]" style={{ color: TEXT_TERTIARY }}>
                        {stack.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTech(stack);
                            setIsTechModalOpen(true);
                          }}
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-black/[0.06]"
                          title="수정"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                        </button>
                        <button
                          onClick={() => void handleTechDelete(stack.techStackId)}
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {isEditModalOpen && detail && (
        <ProjectEditModal
          detail={detail}
          onClose={() => setIsEditOpen(false)}
          onSave={(updated) => {
            setDetail(updated);
            const cached = loadSettings();
            saveSettings({
              ...cached,
              projectName: updated.projectName,
              description: updated.description || cached.description,
            });
          }}
        />
      )}

      {isTechModalOpen && projectId && (
        <TechStackModal
          projectId={projectId}
          initial={selectedTech}
          onClose={() => setIsTechModalOpen(false)}
          onSave={async () => {
            const techList = await fetchProjectTechStacks(projectId);
            setTechStacks(techList.techStacks);
          }}
        />
      )}

      {isMemberModalOpen && projectId && selectedMember && (
        <MemberEditModal
          projectId={projectId}
          member={selectedMember}
          onClose={() => setIsMemberModalOpen(false)}
          onSave={async () => {
            const memberList = await fetchProjectMembers(projectId);
            setMembers(memberList.members);
          }}
        />
      )}
    </div>
  );
}