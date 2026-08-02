import { useState, useMemo, useEffect } from "react";
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight,
  User, Flag, CheckCircle2, Clock, Circle, Tag,
  Edit2, Trash2, Save, AlertCircle,
} from "lucide-react";
import {
  Schedule, Dept, SchedulePriority, ScheduleStatus,
  DEPT_COLOR, STATUS_META, PRIORITY_META,
  loadSchedules, saveSchedules, genId,
  getDaysInMonth, getFirstDayOfMonth, dateStr,
  isInRange, formatDateKR, today as getTodayStr,
} from "../data/scheduleStore";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  BRIGHT_BEIGE, CREAM, PANEL_BG, CONTENT_BG, BEIGE,
  GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
} from "../colors";

const DEPTS: Dept[] = ["전체", "Frontend", "Backend", "Agent", "DevOps", "QA", "Design"];
const PRIORITIES: SchedulePriority[] = ["high", "medium", "low"];
const STATUSES: ScheduleStatus[] = ["todo", "in-progress", "done"];
const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ── 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

interface ScheduleModalProps {
  initial?: Partial<Schedule> | null;
  onSave: (s: Schedule) => void;
  onClose: () => void;
  onColorChange: (dept: string, color: { bg: string; color: string }) => void;
  onDeptDelete: (dept: string) => void; 
  deptColors: Record<string, { bg: string; color: string; light: string }>;
}

function ScheduleModal({ initial, onSave, onClose, onColorChange, onDeptDelete, deptColors }: ScheduleModalProps) {
  const [form, setForm] = useState<Partial<Schedule>>({
    title: "",
    assignee: "",
    department: "Backend",
    startDate: getTodayStr(),
    endDate: getTodayStr(),
    priority: "medium",
    status: "todo",
    desc: "",
    ...initial,
  });

  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDept, setCustomDept] = useState("");
  const addedDepts = Object.keys(deptColors).filter(
    d => d !== "전체" && !["Frontend", "Backend", "Agent", "DevOps", "QA", "Design"].includes(d)
  );

  const [customColor, setCustomColor] = useState({ bg: "#2B6CB0", color: "#ffffff" });
  const COLOR_PALETTE = [
    { bg: "#322c8b", color: "#ffffff" },
    { bg: "#283930", color: "#ffffff" },
    { bg: "#c02020", color: "#ffffff" },
    { bg: "#793a1b", color: "#ffffff" },
  ];

  const set = (k: keyof Schedule, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleAddCustomDept = () => {
    const trimmed = customDept.trim();
    if (!trimmed) return;

    onColorChange(trimmed, {
      bg: customColor.bg,
      color: customColor.color
    });

    set("department", trimmed as Dept);
    setIsCustomDept(false);
    setCustomDept("");
  };

  const handleSave = () => {
    if (!form.title?.trim() || !form.startDate || !form.endDate) return;

    const finalDept = isCustomDept ? customDept.trim() : form.department;
    if (!finalDept) {
      alert("추가하실 부서명을 입력해주세요.");
      return;
    }

    onColorChange(finalDept, {
      bg: customColor.bg,
      color: customColor.bg
    });

    onSave({
      id: form.id ?? genId(),
      department: finalDept as Dept,
      title: form.title.trim(),
      assignee: form.assignee?.trim() ?? "",
      startDate: form.startDate!,
      endDate: form.endDate!,
      priority: form.priority as SchedulePriority ?? "medium",
      status: form.status as ScheduleStatus ?? "todo",
      desc: form.desc?.trim() ?? "",
    });
  };

  const dc = deptColors[form.department as Dept] || { bg: "#f3f4f6", color: "#4b5563" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: BRIGHT_BEIGE,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          maxHeight: "90vh",
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{
            background: dc.bg,
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: dc.bg }}>
            <Calendar className="w-4 h-4" style={{ color: dc.color }} />
          </div>
          <p className="text-sm font-bold flex-1" style={{ color: TEXT_PRIMARY }}>
            {form.id ? "일정 편집" : "새 일정 추가"}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>
              기능명 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.title ?? ""}
              onChange={e => set("title", e.target.value)}
              placeholder="예: JWT 인증 미들웨어 구현"
              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${form.title ? ACCENT + "50" : BORDER}`, color: TEXT_PRIMARY }}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>
              담당자 <span style={{ color: TEXT_TERTIARY }}>(선택)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
              <input
                value={form.assignee ?? ""}
                onChange={e => set("assignee", e.target.value)}
                placeholder="담당자 이름 입력"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>부서</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[...DEPTS.filter(d => d !== "전체"), ...addedDepts].map(d => {
                const c = deptColors[d as Dept] || { bg: "#f3f4f6", color: "#4b5563" };
                const sel = !isCustomDept && form.department === d;
                const isSystemDept = ["Frontend", "Backend", "Agent", "DevOps", "QA", "Design"].includes(d);

                return (
                  <div key={d} className="relative group flex h-full">
                    <button
                      type="button"
                      onClick={() => { setIsCustomDept(false); set("department", d); }}
                      className="w-full py-1.5 rounded-lg text-[10px] font-semibold transition-all overflow-hidden"
                      style={{
                        background: sel ? c.bg : "rgba(0,0,0,0.04)",
                        color: sel ? c.color : TEXT_TERTIARY,
                        border: `1px solid ${sel ? c.color + "40" : "transparent"}`,
                      }}
                    >
                      <span className="block truncate px-1">{d}</span>
                    </button>

                    {!isSystemDept && (
                      <div
                        className="absolute inset-y-0 right-0 flex items-center px-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        style={{ background: "transparent" }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeptDelete(d);
                        }}
                      >
                        <X className="w-3 h-3 text-red-500 hover:text-red-700" />
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => { setIsCustomDept(true); set("department", "" as Dept); }}
                className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: isCustomDept ? ACCENT_BG : "rgba(0,0,0,0.04)",
                  color: isCustomDept ? ACCENT : TEXT_TERTIARY,
                  border: `1px solid ${isCustomDept ? ACCENT + "40" : "transparent"}`,
                }}
              >
                기타
              </button>
            </div>

            {isCustomDept && (
              <div className="mt-2 p-3 rounded-xl border" style={{ background: "#FFFFFF", borderColor: BORDER_SUBTLE }}>
                <div className="relative flex items-center">
                  <input
                    value={customDept}
                    onChange={e => setCustomDept(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDept(); } }}
                    placeholder="새 부서명 입력"
                    className="w-full px-3 pr-10 py-2 rounded-xl text-xs outline-none"
                    style={{
                      background: "rgba(0,0,0,0.02)",
                      border: `1px solid ${customDept ? customColor.bg : BORDER}`,
                      color: TEXT_PRIMARY
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDept}
                    className="absolute right-1 p-1.5 rounded-lg transition-all"
                    style={{
                      background: customDept.trim() ? customColor.bg : "transparent",
                      color: customDept.trim() ? "#fff" : TEXT_TERTIARY,
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">색상 선택</span>
                  <div className="flex gap-2">
                    {COLOR_PALETTE.map((cp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomColor(cp)}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: cp.bg,
                          borderColor: customColor.bg === cp.bg ? "#00000030" : "transparent"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>시작일 *</label>
              <input
                type="date"
                value={form.startDate ?? ""}
                onChange={e => set("startDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>종료일 *</label>
              <input
                type="date"
                value={form.endDate ?? ""}
                min={form.startDate}
                onChange={e => set("endDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>우선순위</label>
              <div className="flex flex-col gap-1">
                {PRIORITIES.map(p => {
                  const pm = PRIORITY_META[p];
                  const sel = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("priority", p)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: sel ? `${pm.color}15` : "rgba(0,0,0,0.03)",
                        color: sel ? pm.color : TEXT_TERTIARY,
                        border: `1px solid ${sel ? pm.color + "40" : "transparent"}`,
                      }}
                    >
                      <Flag className="w-2.5 h-2.5" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>상태</label>
              <div className="flex flex-col gap-1">
                {STATUSES.map(s => {
                  const sm = STATUS_META[s];
                  const sel = form.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: sel ? `${sm.color}15` : "rgba(0,0,0,0.03)",
                        color: sel ? sm.color : TEXT_TERTIARY,
                        border: `1px solid ${sel ? sm.color + "40" : "transparent"}`,
                      }}
                    >
                      <Circle className="w-2.5 h-2.5" />
                      {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>설명</label>
            <textarea
              value={form.desc ?? ""}
              onChange={e => set("desc", e.target.value)}
              placeholder="기능 설명, 참고 사항..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
              style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY, lineHeight: "1.6" }}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: BEIGE, color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.title?.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
            style={{
              background: form.title?.trim() ? "linear-gradient(135deg, #41431B, #6B7040)" : BEIGE,
              color: form.title?.trim() ? "rgba(254,252,245,0.95)" : TEXT_TERTIARY,
              boxShadow: form.title?.trim() ? "0 4px 14px rgba(65,67,27,0.22)" : "none",
            }}
          >
            <Save className="w-3.5 h-3.5" />
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 일정 카드 (사이드 리스트) ──
function ScheduleCard({
  schedule, onEdit, onDelete, deptColors,
}: {
  schedule: Schedule;
  onEdit: (s: Schedule) => void;
  onDelete: (s: Schedule) => void;
  deptColors: Record<string, { bg: string; color: string; light: string }>;
}) {
  const dc = deptColors[schedule.department as Dept] || {
    bg: "#f3f4f6",
    color: "#4b5563",
    light: "#f3f4f6"
  };
  const sm = STATUS_META[schedule.status];
  const pm = PRIORITY_META[schedule.priority];

  const dayCount = Math.max(1,
    Math.round((new Date(schedule.endDate).getTime() - new Date(schedule.startDate).getTime()) / 86400000) + 1
  );

  return (
    <div
      className="rounded-xl p-3 transition-all group"
      style={{
        background: "rgba(255,255,255,0.88)",
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${dc.color}`,
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>
            {schedule.title}
          </p>
          {schedule.assignee ? (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="w-2.5 h-2.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
              <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{schedule.assignee}</span>
            </div>
          ) : (
            <p className="text-[9px] mt-0.5" style={{ color: TEXT_TERTIARY }}>담당자 미지정</p>
          )}
          <p className="text-[9px] mt-1" style={{ color: TEXT_TERTIARY }}>
            {formatDateKR(schedule.startDate)} → {formatDateKR(schedule.endDate)}
            <span className="ml-1">({dayCount}일)</span>
          </p>
          {schedule.desc && (
            <p className="text-[9px] mt-1 line-clamp-1" style={{ color: TEXT_TERTIARY }}>{schedule.desc}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={() => onEdit(schedule)} className="p-1 rounded hover:bg-black/[0.06]">
            <Edit2 className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          </button>
          <button onClick={() => onDelete(schedule)} className="p-1 rounded hover:bg-red-50">
            <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: dc.bg, color: dc.color }}>
          {schedule.department}
        </span>
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${sm.color}15`, color: sm.color }}>
          {sm.label}
        </span>
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${pm.color}12`, color: pm.color }}>
          <Flag className="w-2 h-2 inline mr-0.5" />
          {pm.label}
        </span>
      </div>
    </div>
  );
}

// ══ 메인 CalendarPage ══
export function CalendarPage() {
  const [schedules, setSchedules] = useState<Schedule[]>(() => loadSchedules());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [deptFilter, setDeptFilter] = useState<Dept>("전체");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "전체">("전체");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<Partial<Schedule> | null | "new">(null);
  const [view, setView] = useState<"month" | "list">("month");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  type DeptColorType = Record<string, {
    bg: string;
    color: string;
    light: string;
  }>;

  const [deptColors, setDeptColors] = useState<DeptColorType>(() => {
    try {
      const storedColors = localStorage.getItem("weai_custom_dept_colors_v1");
      if (storedColors) {
        return JSON.parse(storedColors);
      }
    } catch (e) {
      console.error("부서 색상을 불러오는 중 오류가 발생했습니다:", e);
    }
    return DEPT_COLOR;
  });

  useEffect(() => {
    try {
      localStorage.setItem("weai_custom_dept_colors_v1", JSON.stringify(deptColors));
    } catch (e) {
      console.error("부서 색상을 저장하는 중 오류가 발생했습니다:", e);
    }
  }, [deptColors]);

  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  const confirmDeleteDept = () => {
    if (!deptToDelete) return;
    setSchedules(prev => {
      const next = prev.filter(s => s.department !== deptToDelete);
      saveSchedules(next);
      return next;
    });

    setDeptColors(prev => {
      const next = { ...prev };
      delete next[deptToDelete];
      return next;
    });

    if (deptFilter === deptToDelete) setDeptFilter("전체");
    setDeptToDelete(null);
  };

  const todayStr = getTodayStr();
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

  // 1차 필터링: 선택된 부서 기준
  const deptFiltered = useMemo(() =>
    deptFilter === "전체"
      ? schedules
      : schedules.filter(s => s.department === deptFilter),
    [schedules, deptFilter]
  );

  // 2차 필터링: 선택된 부서 데이터 위해 상태 필터링 추가
  const filtered = useMemo(() =>
    statusFilter === "전체"
      ? deptFiltered
      : deptFiltered.filter(s => s.status === statusFilter),
    [deptFiltered, statusFilter]
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

  const daySchedules = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = dateStr(year, month, day);
      map[ds] = filtered.filter(s => isInRange(ds, s.startDate, s.endDate));
    }
    return map;
  }, [filtered, year, month, daysInMonth]);

  const selectedDaySchedules = selectedDay ? (daySchedules[selectedDay] ?? []) : [];

  const handleSave = (s: Schedule) => {
    setSchedules(prev => {
      const next = prev.some(x => x.id === s.id)
        ? prev.map(x => x.id === s.id ? s : x)
        : [...prev, s];
      saveSchedules(next);
      return next;
    });
    setEditSchedule(null);
  };

  const handleDelete = (id: string) => {
    setSchedules(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSchedules(next);
      return next;
    });
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
    setSelectedDay(null);
  };

  // 통계 집계는 부서 필터링 본체(deptFiltered)를 기준으로 두어 상태 토글 시에도 수치가 고정되도록 개선
  const stats = useMemo(() => ({
    total: deptFiltered.length,
    done: deptFiltered.filter(s => s.status === "done").length,
    inProgress: deptFiltered.filter(s => s.status === "in-progress").length,
    todo: deptFiltered.filter(s => s.status === "todo").length,
  }), [deptFiltered]);

  function EventBar({ schedule, compact = false }: { schedule: Schedule; compact?: boolean }) {
    const dc = deptColors[schedule.department as Dept] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <div
        className="truncate rounded px-1 py-0.5 text-[8px] font-semibold cursor-pointer hover:opacity-80 transition-all"
        style={{ background: dc.bg, color: dc.color, fontSize: compact ? 7 : 8 }}
        title={`${schedule.title}${schedule.assignee ? ` — ${schedule.assignee}` : ""}`}
      >
        {schedule.assignee && <span className="opacity-70 mr-1">{schedule.assignee[0]}.</span>}
        {schedule.title}
      </div>
    );
  }

  const dynamicDepts = useMemo(() => {
    const fromSchedules = schedules.map(s => s.department);
    const customDepts = Object.keys(deptColors).filter(
      d => d !== "전체" && !["Frontend", "Backend", "Agent", "DevOps", "QA", "Design"].includes(d)
    );
    const combined = ["전체", ...DEPTS.filter(d => d !== "전체"), ...customDepts, ...fromSchedules];
    return Array.from(new Set(combined)) as Dept[];
  }, [schedules, deptColors]);

  const getDeptColor = (dept: string) => {
    return deptColors[dept as Dept] || { bg: "#F1F2E9", color: "#6B7040", light: "#F1F2E9" };
  };

  const handleDeptColorChange = (dept: string, color: { bg: string; color: string }) => {
    const mainColor = color.bg;
    const lightBg = mainColor.startsWith("#") ? `${mainColor}26` : mainColor;

    setDeptColors(prev => ({
      ...prev,
      [dept]: {
        color: mainColor,
        bg: lightBg,
        light: lightBg
      }
    }));
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: GRADIENT_ORB_2, filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden h-full">

        {/* ══ 왼쪽: 사이드 패널 ══ */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{ width: 260, borderRight: `1px solid ${BORDER}`, background: `rgba(254,252,245,0.92)` }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: BRIGHT_BEIGE }}
          >
            <Calendar className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <p className="text-xs font-semibold flex-1" style={{ color: TEXT_PRIMARY }}>개발 일정</p>
          </div>

          <div
            className="flex flex-col gap-1 p-2.5 overflow-y-auto shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}
          >
            {isLoading ? (
              /* [스켈레톤] 좌측 부서 목록 */
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                  <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (
              dynamicDepts.map(d => {
                const dc = getDeptColor(d);
                const cnt = d === "전체" ? schedules.length : schedules.filter(s => s.department === d).length;
                const sel = deptFilter === d;
                const isSystemDept = ["전체", "Frontend", "Backend", "Agent", "DevOps", "QA", "Design"].includes(d);

                return (
                  <div key={d} className="relative group flex h-full">
                    <button
                      type="button"
                      onClick={() => setDeptFilter(d)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all w-full"
                      style={{
                        background: sel ? dc.bg : "transparent",
                        border: `1px solid ${sel ? dc.color + "40" : "transparent"}`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dc.bg }} />
                      <span className="text-[11px] font-semibold flex-1 min-w-0 truncate text-left" style={{ color: sel ? dc.color : TEXT_SECONDARY }}>{d}</span>
                      <div className={`flex items-center shrink-0 min-w-[16px] justify-end transition-all duration-200 ${!isSystemDept ? "group-hover:pr-5" : ""}`}>
                        <span className="text-[9px] font-mono" style={{ color: sel ? dc.color : TEXT_TERTIARY }}>
                          {cnt}
                        </span>
                      </div>
                    </button>
                    {!isSystemDept && (
                      <div
                        className="absolute inset-y-0 right-0 px-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        style={{ background: "transparent" }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeptToDelete(d);
                        }}
                      >
                        <X className="w-3 h-3 text-red-500 hover:text-red-700" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── 상단 정보 집계 영역: 클릭 인터랙션 및 필터 바인딩 적용 ── */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
            {isLoading ? (
              /* [스켈레톤] 좌측 통계 블록 */
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[46px] w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "todo" as const, label: "예정", value: stats.todo, color: "#898989" },
                  { id: "in-progress" as const, label: "진행", value: stats.inProgress, color: "#f1cc9c" },
                  { id: "done" as const, label: "완료", value: stats.done, color: "#809678" },
                ].map(s => {
                  const isSelected = statusFilter === s.id;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === s.id ? "전체" : s.id)}
                      className="rounded-lg p-2 text-center transition-all cursor-pointer hover:opacity-90"
                      style={{
                        background: isSelected ? s.color : `${s.color}12`,
                        border: `1px solid ${isSelected ? "transparent" : `${s.color}30`}`,
                      }}
                    >
                      <p className="text-sm font-bold" style={{ color: isSelected ? "#ffffff" : s.color }}>{s.value}</p>
                      <p className="text-[8px]" style={{ color: isSelected ? "rgba(255,255,255,0.9)" : s.color }}>{s.label}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {isLoading ? (
              /* [스켈레톤] 좌측 하단 일정 카드 리스트 */
              <div className="space-y-3 pt-1">
                <Skeleton className="h-3 w-24 mb-2 ml-1" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 border" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.5)" }}>
                    <Skeleton className="h-3 w-3/4 mb-2.5" />
                    <Skeleton className="h-2 w-1/2 mb-2" />
                    <Skeleton className="h-2 w-2/3 mb-3" />
                    <div className="flex gap-1.5 mt-2.5">
                      <Skeleton className="h-[18px] w-12 rounded-full" />
                      <Skeleton className="h-[18px] w-10 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDay ? (
              <>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                    {formatDateKR(selectedDay)} 일정
                  </p>
                  <button onClick={() => setSelectedDay(null)} className="ml-auto">
                    <X className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                  </button>
                </div>
                {selectedDaySchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Calendar className="w-6 h-6" style={{ color: ACCENT_BG.replace("0.08", "0.20") }} />
                    <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>일정 없음</p>
                    <button
                      onClick={() => setEditSchedule({ startDate: selectedDay, endDate: selectedDay })}
                      className="text-[9px] px-2 py-1 rounded-lg"
                      style={{ background: ACCENT_BG, color: ACCENT }}
                    >
                      + 이 날 일정 추가
                    </button>
                  </div>
                ) : (
                  selectedDaySchedules.map(s => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      deptColors={deptColors}
                      onEdit={s => setEditSchedule(s)}
                      onDelete={(s) => setScheduleToDelete(s)}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <p className="text-[9px] font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: TEXT_LABEL }}>
                  {deptFilter === "전체" ? "전체" : deptFilter} {statusFilter !== "전체" ? STATUS_META[statusFilter].label : ""} 일정 ({filtered.length})
                </p>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>일정 없음</p>
                  </div>
                ) : (
                  filtered
                    .slice()
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map(s => (
                      <ScheduleCard
                        key={s.id}
                        schedule={s}
                        deptColors={deptColors}
                        onEdit={s => setEditSchedule(s)}
                        onDelete={(s) => setScheduleToDelete(s)}
                      />
                    ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ 오른쪽: 캘린더 본체 ══ */}
        <div className="flex-1 flex flex-col overflow-hidden h-full">

          {/* 캘린더 헤더 */}
          <div
            className="flex items-center gap-3 px-5 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER}`, background: BRIGHT_BEIGE }}
          >
            <button onClick={prevMonth} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-all disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </button>
            
            {isLoading ? (
               /* [스켈레톤] 헤더 년/월 텍스트 */
               <Skeleton className="h-4 w-20" />
            ) : (
              <h2 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                {year}년 {month}월
              </h2>
            )}

            <button onClick={nextMonth} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-all disabled:opacity-30">
              <ChevronRight className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </button>

            <button
              onClick={() => {
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setSelectedDay(getTodayStr());
              }}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-30"
              style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
            >
              오늘
            </button>

            <div className="ml-auto flex items-center gap-3 flex-wrap">
              {isLoading ? (
                /* [스켈레톤] 우측 상단 부서 표시 점들 */
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="w-8 h-2.5" />
                  </div>
                ))
              ) : (
                dynamicDepts.filter(d => d !== "전체").map(d => {
                  const dc = deptColors[d] || { bg: "#f3f4f6", color: "#4b5563", light: "#f3f4f6" };
                  const cnt = filtered.filter(
                    s => s.department === d && s.startDate.startsWith(`${year}-${String(month).padStart(2, "0")}`)
                  ).length;
                  if (cnt === 0 && deptFilter !== "전체" && deptFilter !== d) return null;

                  return (
                    <div key={d} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: dc.bg }} />
                      <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{d}</span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setEditSchedule("new")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all ml-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #41431B, #6B7040)", color: "rgba(254,252,245,0.95)", boxShadow: "0 4px 12px rgba(65,67,27,0.22)" }}
            >
              <Plus className="w-3.5 h-3.5" /> 일정 추가
            </button>
          </div>

          {/* ── 달력 그리드 영역 및 하단 간트 뷰 통합 배치 ── */}
          <div className="flex-1 flex flex-col overflow-hidden p-3 min-h-0">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1 shrink-0">
              {WEEK_DAYS.map((d, i) => (
                <div
                  key={d}
                  className="text-center py-1.5 text-[10px] font-semibold"
                  style={{ color: i === 0 ? "#B85450" : i === 6 ? "#6B7A50" : TEXT_LABEL }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 셀 그리드 */}
            <div
              className="grid grid-cols-7 flex-1 gap-px"
              style={{
                background: BORDER,
                gridTemplateRows: `repeat(${totalCells / 7}, 115px)`,
                height: "100%",
                minHeight: 0,
                overflowY: "auto"
              }}
            >
              {isLoading ? (
                /* [스켈레톤] 달력 그리드 내부 칸들 */
                Array.from({ length: totalCells }).map((_, idx) => (
                  <div
                    key={`skel-${idx}`}
                    className="relative p-2 transition-all flex flex-col gap-2"
                    style={{ background: BRIGHT_BEIGE, height: "100%" }}
                  >
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <div className="space-y-1.5 w-full mt-1">
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-4/5 rounded" />
                    </div>
                  </div>
                ))
              ) : (
                /* 실제 달력 데이터 */
                Array.from({ length: totalCells }).map((_, idx) => {
                  const dayNum = idx - firstWeekDay + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const ds = isValid ? dateStr(year, month, dayNum) : "";
                  const dayEvts = isValid ? (daySchedules[ds] ?? []) : [];
                  const isToday = ds === todayStr;
                  const isSel = ds === selectedDay;
                  const isSun = idx % 7 === 0;
                  const isSat = idx % 7 === 6;

                  const startsToday = dayEvts.filter(s => s.startDate === ds);
                  const continues = dayEvts.filter(s => s.startDate !== ds);

                  return (
                    <div
                      key={idx}
                      onClick={() => isValid && setSelectedDay(isSel ? null : ds)}
                      className="relative p-1 transition-all overflow-hidden flex flex-col"
                      style={{
                        background: !isValid ? `rgba(254,252,245,0.45)`
                          : isSel ? ACCENT_BG
                            : BRIGHT_BEIGE,
                        cursor: isValid ? "pointer" : "default",
                        height: "100%",
                        minHeight: 0
                      }}
                    >
                      {isValid && (
                        <>
                          <div className="flex items-center justify-between mb-1 shrink-0">
                            <span
                              className="text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                              style={{
                                color: isToday ? "rgba(254,252,245,0.98)" : isSun ? "#B85450" : isSat ? "#6B7A50" : TEXT_PRIMARY,
                                background: isToday ? ACCENT : "transparent",
                              }}
                            >
                              {dayNum}
                            </span>
                            {dayEvts.length > 3 && (
                              <span className="text-[8px]" style={{ color: TEXT_TERTIARY }}>{dayEvts.length}</span>
                            )}
                          </div>

                          <div className="space-y-0.5 flex-1 overflow-hidden">
                            {startsToday.slice(0, 3).map(s => (
                              <EventBar key={s.id} schedule={s} compact />
                            ))}
                            {continues.slice(0, Math.max(0, 3 - startsToday.length)).map(s => (
                              <div
                                key={s.id}
                                className="h-1.5 rounded-full opacity-40"
                                style={{ background: deptColors[s.department]?.color || DEPT_COLOR[s.department]?.color }}
                              />
                            ))}
                            {dayEvts.length > 3 && (
                              <span className="text-[7px] block" style={{ color: TEXT_TERTIARY }}>
                                +{dayEvts.length - 3}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── 하단 간트 뷰 ── */}
            <div
              className="shrink-0 overflow-y-auto mt-2"
              style={{
                height: "110px",
                borderTop: `1px solid ${BORDER}`,
                background: CREAM
              }}
            >
              {isLoading ? (
                /* [스켈레톤] 하단 간트 뷰 */
                <div className="p-4 space-y-3">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ) : (
                <>
                  <div className="px-4 pt-2 pb-1 sticky top-0 z-10" style={{ background: CREAM }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: TEXT_LABEL }}>
                      {month}월 간트 뷰
                    </p>
                  </div>
                  <div className="overflow-x-auto px-4 pb-2">
                    <div style={{ minWidth: daysInMonth * 20 }}>
                      <div className="flex mb-1 sticky top-[22px] z-10" style={{ background: CREAM }}>
                        {Array.from({ length: daysInMonth }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-none text-center text-[7px]"
                            style={{
                              width: 20,
                              color: dateStr(year, month, i + 1) === todayStr ? ACCENT : TEXT_TERTIARY,
                              fontWeight: dateStr(year, month, i + 1) === todayStr ? "bold" : "normal",
                            }}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {DEPTS.filter(d => d !== "전체").map(d => {
                        const dc = deptColors[d];
                        const dScheds = filtered.filter(s => s.department === d);
                        if (dScheds.length === 0) return null;
                        return (
                          <div key={d} className="flex items-center gap-2 mb-1" style={{ height: 14 }}>
                            <span
                              className="text-[8px] font-semibold shrink-0"
                              style={{ color: dc?.color, width: 0, overflow: "visible", whiteSpace: "nowrap", marginLeft: -60 }}
                            />
                            <div className="relative flex-1" style={{ height: 12 }}>
                              <div className="absolute inset-0 flex" style={{ opacity: 0.2 }}>
                                {Array.from({ length: daysInMonth }).map((_, i) => (
                                  <div key={i} className="flex-none border-r" style={{ width: 20, borderColor: BORDER }} />
                                ))}
                              </div>
                              {dScheds.map(s => {
                                const sDay = new Date(s.startDate).getDate();
                                const eDay = Math.min(daysInMonth, new Date(s.endDate).getDate());
                                const left = (sDay - 1) * 20;
                                const width = Math.max(20, (eDay - sDay + 1) * 20);
                                return (
                                  <div
                                    key={s.id}
                                    className="absolute rounded-full flex items-center px-1"
                                    style={{
                                      left, width, height: 12, top: 0,
                                      background: dc?.bg,
                                      border: `1px solid ${dc?.color}40`,
                                    }}
                                    title={`${s.title}${s.assignee ? ` — ${s.assignee}` : ""}`}
                                  >
                                    <span className="text-[6px] truncate font-semibold" style={{ color: dc?.color }}>
                                      {s.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* 일정 추가/편집 모달 */}
      {
        editSchedule !== null && (
          <ScheduleModal
            initial={editSchedule === "new" ? undefined : editSchedule}
            onSave={handleSave}
            onClose={() => setEditSchedule(null)}
            onColorChange={handleDeptColorChange}
            onDeptDelete={(dept) => setDeptToDelete(dept)} // 부서 삭제 팝업 요청 연결
            deptColors={deptColors}
          />
        )
      }

      {/* 일정 삭제 모달 */}
      {
        scheduleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setScheduleToDelete(null)}
            />
            <div className="relative bg-white w-[320px] min-h-[180px] px-5 py-6 rounded-2xl shadow-lg flex flex-col justify-center">
              <div className="text-sm font-semibold mb-4 text-center">
                "{scheduleToDelete.title}" 삭제하시겠습니까?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleToDelete(null)}
                  className="flex-1 px-2 py-3 rounded-2xl text-[13px] font-bold"
                  style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    handleDelete(scheduleToDelete.id);
                    setScheduleToDelete(null);
                  }}
                  className="flex-1 px-2 py-3 rounded-2xl text-[13px] font-bold text-white bg-red-500"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 부서 삭제 확인 모달 */}
      {deptToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setDeptToDelete(null)}
          />
          <div className="relative bg-white w-[320px] min-h-[180px] px-5 py-6 rounded-2xl shadow-lg flex flex-col justify-center z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-sm font-semibold mb-4 text-center leading-relaxed text-gray-800">
              "{deptToDelete}" 부서를 삭제하시겠습니까?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeptToDelete(null)}
                className="flex-1 px-2 py-3 rounded-2xl text-[13px] font-bold"
                style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
              >
                취소
              </button>
              <button
                onClick={confirmDeleteDept}
                className="flex-1 px-2 py-3 rounded-2xl text-[13px] font-bold text-white bg-red-500"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}