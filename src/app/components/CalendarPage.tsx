import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListTodo,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
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
  ProjectMember,
  ProjectSchedule,
  ProjectScheduleCreatePayload,
  ProjectSchedulePriority,
  ProjectScheduleStatus,
  createProjectSchedule,
  deleteProjectSchedule,
  fetchFilteredProjectSchedules,
  fetchProjectMembers,
  formatApiError,
  updateProjectSchedule,
  fetchProjectScheduleDetail,
  updateProjectScheduleStatus,
} from "../lib/api";

const SCHEDULE_DEPARTMENTS: ProjectDepartment[] = [
  "BACKEND",
  "FRONTEND",
  "QA",
  "DEVOPS",
  "AI",
  "DESIGN",
  "PM",
];

const STATUS_OPTIONS: ProjectScheduleStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "COMPLETED",
  "HOLD",
];

const PRIORITY_OPTIONS: ProjectSchedulePriority[] = ["HIGH", "MEDIUM", "LOW"];

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

const STATUS_META: Record<ProjectScheduleStatus, { label: string; color: string; bg: string }> = {
  TODO: { label: "Todo", color: "#C09840", bg: "rgba(192,152,64,0.12)" },
  IN_PROGRESS: { label: "In Progress", color: ACCENT, bg: ACCENT_BG },
  DONE: { label: "Done", color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  COMPLETED: { label: "Completed", color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
  HOLD: { label: "Hold", color: "#888A62", bg: "rgba(136,138,98,0.12)" },
};

const PRIORITY_META: Record<ProjectSchedulePriority, { label: string; color: string; bg: string }> = {
  HIGH: { label: "High", color: "#B85450", bg: "rgba(184,84,80,0.12)" },
  MEDIUM: { label: "Medium", color: "#C09840", bg: "rgba(192,152,64,0.12)" },
  LOW: { label: "Low", color: "#5A8A4A", bg: "rgba(90,138,74,0.12)" },
};

type Props = {
  projectId: number | null;
};

type ScheduleFormState = {
  title: string;
  description: string;
  assigneeId: string;
  department: ProjectDepartment;
  startDate: string;
  endDate: string;
  priority: ProjectSchedulePriority;
  status: ProjectScheduleStatus;
};

type ScheduleModalState =
  | { mode: "create" }
  | { mode: "edit"; schedule: ProjectSchedule }
  | null;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateValue(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return value;
}

function createEmptyForm(): ScheduleFormState {
  const today = new Date().toISOString().slice(0, 10);

  return {
    title: "",
    description: "",
    assigneeId: "",
    department: "BACKEND",
    startDate: today,
    endDate: today,
    priority: "MEDIUM",
    status: "TODO",
  };
}

function createFormFromSchedule(schedule: ProjectSchedule): ScheduleFormState {
  return {
    title: schedule.title,
    description: schedule.description ?? "",
    assigneeId: String(schedule.assigneeId),
    department: schedule.department,
    startDate: schedule.startDate ?? "",
    endDate: schedule.endDate ?? "",
    priority: schedule.priority,
    status: schedule.status,
  };
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isScheduleVisibleOnDate(schedule: ProjectSchedule, date: string): boolean {
  if (!schedule.startDate || !schedule.endDate) {
    return false;
  }

  return schedule.startDate <= date && schedule.endDate >= date;
}

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

function ScheduleFormModal({
  members,
  state,
  onClose,
  onSubmit,
  submitting,
}: {
  members: ProjectMember[];
  state: ScheduleModalState;
  onClose: () => void;
  onSubmit: (form: ScheduleFormState) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ScheduleFormState>(() =>
    state?.mode === "edit" ? createFormFromSchedule(state.schedule) : createEmptyForm()
  );

  useEffect(() => {
    setForm(state?.mode === "edit" ? createFormFromSchedule(state.schedule) : createEmptyForm());
  }, [state]);

  if (!state) {
    return null;
  }

  const updateField = <K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("일정 제목을 입력해주세요.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error("시작일과 종료일을 입력해주세요.");
      return;
    }

    if (form.startDate > form.endDate) {
      toast.error("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    await onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] border bg-white p-6"
        style={{ borderColor: BORDER, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEXT_LABEL }}>
              Project Schedule
            </p>
            <h2 className="mt-2 text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
              {state.mode === "edit" ? "일정 수정" : "일정 생성"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border p-2 transition-all"
            style={{ borderColor: BORDER_SUBTLE, color: TEXT_TERTIARY }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Title
            </label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              placeholder="프로젝트 일정 제목"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              placeholder="일정 설명"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Assignee
            </label>
            <select
              value={form.assigneeId}
              onChange={(event) => updateField("assigneeId", event.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            >
              <option value="">내 계정 기본값 사용</option>
              {members.map((member) => (
                <option key={member.projectMemberId} value={member.userId}>
                  {member.name} · {DEPARTMENT_LABELS[member.department]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Department
            </label>
            <select
              value={form.department}
              onChange={(event) => updateField("department", event.target.value as ProjectDepartment)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            >
              {SCHEDULE_DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {DEPARTMENT_LABELS[department]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              End Date
            </label>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(event) => updateField("endDate", event.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value as ProjectSchedulePriority)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: TEXT_LABEL }}>
              Status
            </label>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value as ProjectScheduleStatus)}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {submitting ? "저장 중..." : state.mode === "edit" ? "수정 저장" : "일정 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: ProjectSchedule;
  onEdit: (schedule: ProjectSchedule) => void;
  onDelete: (schedule: ProjectSchedule) => void;
}) {
  const statusMeta = STATUS_META[schedule.status];
  const priorityMeta = PRIORITY_META[schedule.priority];

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER_SUBTLE }}
    >
      <div className="flex items-start justify-between gap-3">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(schedule)}
            className="rounded-full border p-2 transition-all"
            style={{ borderColor: BORDER_SUBTLE, color: TEXT_TERTIARY }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(schedule)}
            className="rounded-full border p-2 transition-all"
            style={{ borderColor: BORDER_SUBTLE, color: STATUS_ERROR }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full px-2.5 py-1" style={{ background: statusMeta.bg, color: statusMeta.color }}>
          {statusMeta.label}
        </span>
        <span className="rounded-full px-2.5 py-1" style={{ background: priorityMeta.bg, color: priorityMeta.color }}>
          {priorityMeta.label}
        </span>
      </div>

      <p className="mt-3 text-[12px]" style={{ color: TEXT_TERTIARY }}>
        {formatDateValue(schedule.startDate)} ~ {formatDateValue(schedule.endDate)}
      </p>
    </div>
  );
}

export function CalendarPage({ projectId }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().slice(0, 10));
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ScheduleModalState>(null);
  const [departmentFilter, setDepartmentFilter] = useState<"ALL" | ProjectDepartment>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProjectScheduleStatus>("ALL");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [month, year]);
  const firstWeekDay = useMemo(() => new Date(year, month - 1, 1).getDay(), [month, year]);
  const calendarCells = useMemo(() => {
    const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const day = index - firstWeekDay + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [daysInMonth, firstWeekDay]);

  const loadMembers = async () => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    try {
      const memberList = await fetchProjectMembers(projectId);
      setMembers(memberList.members.filter((member) => member.status === "ACTIVE"));
    } catch (memberError) {
      toast.error(formatApiError(memberError));
    }
  };

  const loadSchedules = async () => {
    if (!projectId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetchFilteredProjectSchedules(projectId, {
        department: departmentFilter === "ALL" ? null : departmentFilter,
        status: statusFilter === "ALL" ? null : statusFilter,
        startDate: rangeStart || null,
        endDate: rangeEnd || null,
      });

      setSchedules(response.schedules);
      setError(null);
    } catch (scheduleError) {
      setError(formatApiError(scheduleError));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [projectId]);

  useEffect(() => {
    void loadSchedules();
  }, [projectId, departmentFilter, statusFilter, rangeStart, rangeEnd]);

  useEffect(() => {
    const nextSelectedDate = selectedDate ? new Date(selectedDate) : null;
    if (
      !nextSelectedDate ||
      nextSelectedDate.getFullYear() !== year ||
      nextSelectedDate.getMonth() + 1 !== month
    ) {
      setSelectedDate(toDateString(year, month, 1));
    }
  }, [month, selectedDate, year]);

  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return schedules.filter((schedule) => isScheduleVisibleOnDate(schedule, selectedDate));
  }, [schedules, selectedDate]);

  const stats = useMemo(
    () => ({
      total: schedules.length,
      completed: schedules.filter((schedule) => schedule.status === "DONE" || schedule.status === "COMPLETED").length,
      inProgress: schedules.filter((schedule) => schedule.status === "IN_PROGRESS").length,
      hold: schedules.filter((schedule) => schedule.status === "HOLD").length,
    }),
    [schedules]
  );

  const monthTitle = `${year}.${String(month).padStart(2, "0")}`;

  const handleRefresh = async () => {
    await Promise.all([loadMembers(), loadSchedules()]);
    toast.success("캘린더 데이터를 새로고침했습니다.");
  };

  const handleOpenEditModal = async (scheduleId: number) => {  //프로젝트 일정 상세 조회
    if (!projectId) return;

    try {
      const scheduleDetail = await fetchProjectScheduleDetail(projectId, scheduleId);
      setModalState({ mode: "edit", schedule: scheduleDetail });
    } catch (error) {
      toast.error(formatApiError(error));
    }
  };

  const handleStatusUpdate = async (scheduleId: number | string, newStatus: ProjectScheduleStatus) => {  //프로젝트 일정 상태 변경
    try {
      const currentProjectId = 1;

      await updateProjectScheduleStatus(currentProjectId, scheduleId, {
        status: newStatus 
      });

      // 성공 시 화면 데이터를 새로고침
      if (typeof handleRefresh === 'function') {
        handleRefresh();
      }
    } catch (error) {
      console.error("일정 상태 변경 실패:", error);
    }
  };

  const handleSaveSchedule = async (form: ScheduleFormState) => {
    if (!projectId) {
      return;
    }

    const payload: ProjectScheduleCreatePayload = {
      title: form.title,
      description: form.description || undefined,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : undefined,
      department: form.department,
      startDate: form.startDate,
      endDate: form.endDate,
      priority: form.priority,
      status: form.status,
    };

    setSubmitting(true);

    try {
      if (modalState?.mode === "edit") {
        await updateProjectSchedule(projectId, modalState.schedule.scheduleId, payload);
        toast.success("일정을 수정했습니다.");
      } else {
        await createProjectSchedule(projectId, payload);
        toast.success("일정을 생성했습니다.");
      }

      setModalState(null);
      await loadSchedules();
    } catch (saveError) {
      toast.error(formatApiError(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule: ProjectSchedule) => {
    if (!projectId) {
      return;
    }

    const shouldDelete = window.confirm(`"${schedule.title}" 일정을 삭제할까요?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteProjectSchedule(projectId, schedule.scheduleId);
      toast.success("일정을 삭제했습니다.");
      await loadSchedules();
    } catch (deleteError) {
      toast.error(formatApiError(deleteError));
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
            선택된 프로젝트가 없습니다.
          </p>
          <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
            프로젝트를 먼저 선택한 뒤 일정 캘린더를 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScheduleFormModal
        members={members}
        state={modalState}
        onClose={() => setModalState(null)}
        onSubmit={handleSaveSchedule}
        submitting={submitting}
      />

      <div className="flex-1 overflow-y-auto p-5" style={{ background: GRADIENT_PAGE }}>
        <div className="mx-auto max-w-7xl space-y-5">
          <section
            className="rounded-[28px] border px-6 py-6"
            style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: ACCENT }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEXT_LABEL }}>
                    Project Calendar
                  </p>
                </div>
                <h1 className="mt-2 text-3xl font-bold" style={{ color: TEXT_PRIMARY }}>
                  프로젝트 일정 캘린더
                </h1>
                <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                  일정 생성, 수정, 삭제와 부서·상태·기간 필터를 바로 사용할 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                >
                  <RefreshCw className="h-4 w-4" />
                  새로고침
                </button>
                <button
                  type="button"
                  onClick={() => setModalState({ mode: "create" })}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  <Plus className="h-4 w-4" />
                  일정 추가
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <StatTile label="Total Schedules" value={`${stats.total}`} />
              <StatTile label="Completed" value={`${stats.completed}`} />
              <StatTile label="In Progress" value={`${stats.inProgress}`} />
              <StatTile label="Hold" value={`${stats.hold}`} />
            </div>
          </section>

          <section
            className="rounded-[28px] border px-5 py-5"
            style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                일정 필터
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value === "ALL" ? "ALL" : (event.target.value as ProjectDepartment))
                }
                className="rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              >
                <option value="ALL">전체 부서</option>
                {SCHEDULE_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {DEPARTMENT_LABELS[department]}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value === "ALL" ? "ALL" : (event.target.value as ProjectScheduleStatus))
                }
                className="rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              >
                <option value="ALL">전체 상태</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              />

              <input
                type="date"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: "rgba(248,243,225,0.5)" }}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDepartmentFilter("ALL");
                  setStatusFilter("ALL");
                  setRangeStart("");
                  setRangeEnd("");
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
              >
                필터 초기화
              </button>
            </div>
          </section>

          {error && (
            <section
              className="rounded-[24px] border px-5 py-4"
              style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
            >
              <p className="text-sm font-semibold" style={{ color: STATUS_ERROR }}>
                {error}
              </p>
            </section>
          )}

          <section className="grid gap-5 xl:grid-cols-[1.6fr,1fr]">
            <div
              className="rounded-[28px] border px-5 py-5"
              style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (month === 1) {
                        setMonth(12);
                        setYear((current) => current - 1);
                      } else {
                        setMonth((current) => current - 1);
                      }
                    }}
                    className="rounded-full border p-2"
                    style={{ borderColor: BORDER_SUBTLE, color: TEXT_SECONDARY }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
                    {monthTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (month === 12) {
                        setMonth(1);
                        setYear((current) => current + 1);
                      } else {
                        setMonth((current) => current + 1);
                      }
                    }}
                    className="rounded-full border p-2"
                    style={{ borderColor: BORDER_SUBTLE, color: TEXT_SECONDARY }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setYear(today.getFullYear());
                    setMonth(today.getMonth() + 1);
                    setSelectedDate(today.toISOString().slice(0, 10));
                  }}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
                  style={{ borderColor: ACCENT_BORDER, color: TEXT_SECONDARY }}
                >
                  오늘로 이동
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAYS.map((weekDay) => (
                  <div
                    key={weekDay}
                    className="rounded-2xl px-3 py-2 text-center text-[11px] font-semibold"
                    style={{ color: TEXT_LABEL, background: "rgba(248,243,225,0.4)" }}
                  >
                    {weekDay}
                  </div>
                ))}

                {calendarCells.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[120px] rounded-2xl border"
                        style={{ borderColor: BORDER_SUBTLE, background: "rgba(248,243,225,0.18)" }}
                      />
                    );
                  }

                  const dateValue = toDateString(year, month, day);
                  const dateSchedules = schedules.filter((schedule) => isScheduleVisibleOnDate(schedule, dateValue));
                  const isSelected = selectedDate === dateValue;
                  const isToday = dateValue === today.toISOString().slice(0, 10);

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      onClick={() => setSelectedDate(dateValue)}
                      className="min-h-[120px] rounded-2xl border p-3 text-left transition-all"
                      style={{
                        borderColor: isSelected ? ACCENT : BORDER_SUBTLE,
                        background: isSelected ? "rgba(65,67,27,0.06)" : "rgba(255,255,255,0.88)",
                        boxShadow: isSelected ? "0 8px 24px rgba(65,67,27,0.10)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: isToday ? ACCENT : TEXT_PRIMARY }}
                        >
                          {day}
                        </span>
                        {dateSchedules.length > 0 && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: ACCENT_BG, color: ACCENT }}
                          >
                            {dateSchedules.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        {dateSchedules.slice(0, 3).map((schedule) => {
                          const meta = STATUS_META[schedule.status];
                          return (
                            <div
                              key={`${dateValue}-${schedule.scheduleId}`}
                              className="truncate rounded-full px-2 py-1 text-[10px] font-semibold"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {schedule.title}
                            </div>
                          );
                        })}
                        {dateSchedules.length > 3 && (
                          <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
                            +{dateSchedules.length - 3} more
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <section
                className="rounded-[28px] border px-5 py-5"
                style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <ListTodo className="h-4 w-4" style={{ color: ACCENT }} />
                  <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                    {selectedDate ? `${selectedDate} 일정` : "선택된 날짜 일정"}
                  </h2>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-24 animate-pulse rounded-2xl"
                        style={{ background: "rgba(65,67,27,0.08)" }}
                      />
                    ))}
                  </div>
                ) : selectedDateSchedules.length === 0 ? (
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                    선택한 날짜에 일정이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.scheduleId}
                        schedule={schedule}
                        onEdit={(nextSchedule) => setModalState({ mode: "edit", schedule: nextSchedule })}
                        onDelete={(nextSchedule) => void handleDeleteSchedule(nextSchedule)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                className="rounded-[28px] border px-5 py-5"
                style={{ background: "rgba(255,255,255,0.92)", borderColor: BORDER }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>
                    필터 결과 전체 일정
                  </h2>
                  <span className="text-[11px] font-semibold" style={{ color: TEXT_TERTIARY }}>
                    {schedules.length} items
                  </span>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-24 animate-pulse rounded-2xl"
                        style={{ background: "rgba(65,67,27,0.08)" }}
                      />
                    ))
                  ) : schedules.length === 0 ? (
                    <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                      조건에 맞는 일정이 없습니다.
                    </p>
                  ) : (
                    schedules.map((schedule) => (
                      <ScheduleCard
                        key={`all-${schedule.scheduleId}`}
                        schedule={schedule}
                        onEdit={(nextSchedule) => setModalState({ mode: "edit", schedule: nextSchedule })}
                        onDelete={(nextSchedule) => void handleDeleteSchedule(nextSchedule)}
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
