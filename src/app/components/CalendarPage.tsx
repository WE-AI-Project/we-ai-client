import { useState, useMemo } from "react";
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

// ── 디자인 토큰 (colors.ts 팔레트 기준) ──
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  BRIGHT_BEIGE, CREAM, PANEL_BG, CONTENT_BG, BEIGE,
  GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
} from "../colors";

const DEPTS: Dept[] = ["전체", "Frontend", "Backend", "Agent", "DevOps", "QA", "Design"];
const PRIORITIES: SchedulePriority[] = ["high", "medium", "low"];
const STATUSES: ScheduleStatus[]     = ["todo", "in-progress", "done"];
const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ── 일정 추가/편집 모달 ──
function ScheduleModal({
  initial, onSave, onClose,
}: {
  initial?: Partial<Schedule> | null;
  onSave:   (s: Schedule) => void;
  onClose:  () => void;
}) {
  const [form, setForm] = useState<Partial<Schedule>>({
    title:      "",
    assignee:   "",             // 기본값 공란
    department: "Backend",
    startDate:  getTodayStr(),
    endDate:    getTodayStr(),
    priority:   "medium",
    status:     "todo",
    desc:       "",
    ...initial,
  });
  const set = (k: keyof Schedule, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title?.trim() || !form.startDate || !form.endDate) return;
    onSave({
      id:         form.id ?? genId(),
      title:      form.title.trim(),
      assignee:   form.assignee?.trim() ?? "",
      department: form.department as Dept ?? "Backend",
      startDate:  form.startDate!,
      endDate:    form.endDate!,
      priority:   form.priority as SchedulePriority ?? "medium",
      status:     form.status as ScheduleStatus ?? "todo",
      desc:       form.desc?.trim() ?? "",
    });
  };

  const dc = DEPT_COLOR[form.department as Dept ?? "Backend"];

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
        {/* 헤더 */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${dc.light}60, rgba(174,183,132,0.18))`,
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
          {/* 기능명 */}
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

          {/* 담당자 (기본값 공란) */}
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

          {/* 부서 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>부서</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DEPTS.filter(d => d !== "전체").map(d => {
                const c = DEPT_COLOR[d];
                const sel = form.department === d;
                return (
                  <button
                    key={d}
                    onClick={() => set("department", d)}
                    className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: sel ? c.bg  : "rgba(0,0,0,0.04)",
                      color:      sel ? c.color: TEXT_TERTIARY,
                      border:     `1px solid ${sel ? c.color + "40" : "transparent"}`,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 날짜 */}
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

          {/* 우선순위 + 상태 */}
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
                      onClick={() => set("priority", p)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: sel ? `${pm.color}15` : "rgba(0,0,0,0.03)",
                        color:      sel ? pm.color : TEXT_TERTIARY,
                        border:     `1px solid ${sel ? pm.color + "40" : "transparent"}`,
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
                  const sm  = STATUS_META[s];
                  const sel = form.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => set("status", s)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: sel ? `${sm.color}15` : "rgba(0,0,0,0.03)",
                        color:      sel ? sm.color : TEXT_TERTIARY,
                        border:     `1px solid ${sel ? sm.color + "40" : "transparent"}`,
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

          {/* 설명 */}
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

        {/* 푸터 */}
        <div className="flex gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: BEIGE, color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title?.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
            style={{
              background: form.title?.trim() ? "linear-gradient(135deg, #41431B, #6B7040)" : BEIGE,
              color:      form.title?.trim() ? "rgba(254,252,245,0.95)" : TEXT_TERTIARY,
              boxShadow:  form.title?.trim() ? "0 4px 14px rgba(65,67,27,0.22)" : "none",
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

// ── 일정 바 (캘린더 셀 내) ──
function EventBar({ schedule, compact = false }: { schedule: Schedule; compact?: boolean }) {
  const dc = DEPT_COLOR[schedule.department];
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

// ── 일정 카드 (사이드 리스트) ──
function ScheduleCard({
  schedule, onEdit, onDelete,
}: {
  schedule: Schedule;
  onEdit:   (s: Schedule) => void;
  onDelete: (id: string) => void;
}) {
  const dc = DEPT_COLOR[schedule.department];
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
          {/* 제목 */}
          <p className="text-[11px] font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>
            {schedule.title}
          </p>
          {/* 담당자 */}
          {schedule.assignee ? (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="w-2.5 h-2.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
              <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{schedule.assignee}</span>
            </div>
          ) : (
            <p className="text-[9px] mt-0.5" style={{ color: TEXT_TERTIARY }}>담당자 미지정</p>
          )}
          {/* 날짜 */}
          <p className="text-[9px] mt-1" style={{ color: TEXT_TERTIARY }}>
            {formatDateKR(schedule.startDate)} → {formatDateKR(schedule.endDate)}
            <span className="ml-1">({dayCount}일)</span>
          </p>
          {/* 설명 */}
          {schedule.desc && (
            <p className="text-[9px] mt-1 line-clamp-1" style={{ color: TEXT_TERTIARY }}>{schedule.desc}</p>
          )}
        </div>
        {/* 액션 */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={() => onEdit(schedule)} className="p-1 rounded hover:bg-black/[0.06]">
            <Edit2 className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          </button>
          <button onClick={() => onDelete(schedule.id)} className="p-1 rounded hover:bg-red-50">
            <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
          </button>
        </div>
      </div>

      {/* 뱃지 */}
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

// ══════════════════════════════════════════
// 메인 CalendarPage
// ══════════════════════════════════════════
export function CalendarPage() {
  const [schedules,    setSchedules]    = useState<Schedule[]>(() => loadSchedules());
  const [year,         setYear]         = useState(() => new Date().getFullYear());
  const [month,        setMonth]        = useState(() => new Date().getMonth() + 1);
  const [deptFilter,   setDeptFilter]   = useState<Dept>("전체");
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<Partial<Schedule> | null | "new">(null);
  const [view,         setView]         = useState<"month" | "list">("month");

  const todayStr = getTodayStr();

  // ── 일정 필터 ──
  const filtered = useMemo(() =>
    deptFilter === "전체"
      ? schedules
      : schedules.filter(s => s.department === deptFilter),
    [schedules, deptFilter]
  );

  // ── 이번 달 날짜 계산 ──
  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekDay = getFirstDayOfMonth(year, month);
  const totalCells   = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

  // ── 날짜별 일정 맵 ──
  const daySchedules = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = dateStr(year, month, day);
      map[ds]  = filtered.filter(s => isInRange(ds, s.startDate, s.endDate));
    }
    return map;
  }, [filtered, year, month, daysInMonth]);

  // ── 선택 날짜의 일정 ──
  const selectedDaySchedules = selectedDay ? (daySchedules[selectedDay] ?? []) : [];

  // ── CRUD ──
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

  // ── 월 이동 ──
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else             { setMonth(m => m - 1); }
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else              { setMonth(m => m + 1); }
    setSelectedDay(null);
  };

  // ── 통계 ──
  const stats = {
    total:      filtered.length,
    done:       filtered.filter(s => s.status === "done").length,
    inProgress: filtered.filter(s => s.status === "in-progress").length,
    todo:       filtered.filter(s => s.status === "todo").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 — 팔레트 그라데이션 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: GRADIENT_ORB_2, filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* ══ 왼쪽: 사이드 패널 ══ */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{ width: 260, borderRight: `1px solid ${BORDER}`, background: `rgba(254,252,245,0.92)` }}
        >
          {/* 헤더 */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: BRIGHT_BEIGE }}
          >
            <Calendar className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <p className="text-xs font-semibold flex-1" style={{ color: TEXT_PRIMARY }}>개발 일정</p>
            <button
              onClick={() => setEditSchedule("new")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all"
              style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
            >
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>

          {/* 부서 필터 */}
          <div
            className="flex flex-col gap-1 p-2.5 overflow-y-auto shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}
          >
            {DEPTS.map(d => {
              const dc  = DEPT_COLOR[d];
              const cnt = d === "전체" ? schedules.length : schedules.filter(s => s.department === d).length;
              const sel = deptFilter === d;
              return (
                <button
                  key={d}
                  onClick={() => setDeptFilter(d)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all"
                  style={{
                    background: sel ? dc.bg : "transparent",
                    border:     `1px solid ${sel ? dc.color + "40" : "transparent"}`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dc.color }} />
                  <span className="text-[11px] font-semibold flex-1" style={{ color: sel ? dc.color : TEXT_SECONDARY }}>{d}</span>
                  <span className="text-[9px] font-mono" style={{ color: sel ? dc.color : TEXT_TERTIARY }}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* 통계 요약 */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "완료",    value: stats.done,       color: "#5A8A4A" },
                { label: "진행",    value: stats.inProgress, color: "#C09840" },
                { label: "예정",    value: stats.todo,       color: "#9A9B72" },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: `${s.color}12` }}>
                  <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[8px]" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 선택된 날짜 일정 / 전체 일정 목록 */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {selectedDay ? (
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
                    <ScheduleCard key={s.id} schedule={s} onEdit={s => setEditSchedule(s)} onDelete={handleDelete} />
                  ))
                )}
              </>
            ) : (
              <>
                <p className="text-[9px] font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: TEXT_LABEL }}>
                  {deptFilter === "전체" ? "전체" : deptFilter} 일정 ({filtered.length})
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
                      <ScheduleCard key={s.id} schedule={s} onEdit={s => setEditSchedule(s)} onDelete={handleDelete} />
                    ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ 오른쪽: 캘린더 본체 ══ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* 캘린더 헤더 */}
          <div
            className="flex items-center gap-3 px-5 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER}`, background: BRIGHT_BEIGE }}
          >
            {/* 월 이동 */}
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-all">
              <ChevronLeft className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </button>
            <h2 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
              {year}년 {month}월
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-all">
              <ChevronRight className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </button>

            {/* 오늘 버튼 */}
            <button
              onClick={() => {
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setSelectedDay(getTodayStr());
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
            >
              오늘
            </button>

            {/* 범례 */}
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              {DEPTS.filter(d => d !== "전체").map(d => {
                const dc = DEPT_COLOR[d];
                const cnt = filtered.filter(s => s.department === d && s.startDate.startsWith(`${year}-${String(month).padStart(2,"0")}`)).length;
                if (cnt === 0 && deptFilter !== "전체" && deptFilter !== d) return null;
                return (
                  <div key={d} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: dc.color }} />
                    <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{d}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEditSchedule("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all ml-2"
              style={{ background: "linear-gradient(135deg, #41431B, #6B7040)", color: "rgba(254,252,245,0.95)", boxShadow: "0 4px 12px rgba(65,67,27,0.22)" }}
            >
              <Plus className="w-3.5 h-3.5" /> 일정 추가
            </button>
          </div>

          {/* ── 달력 그리드 ── */}
          <div className="flex-1 overflow-auto p-3">
            <div className="h-full flex flex-col" style={{ minHeight: 480 }}>
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-1">
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
              <div className="grid grid-cols-7 flex-1 gap-px" style={{ background: BORDER }}>
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const dayNum  = idx - firstWeekDay + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const ds      = isValid ? dateStr(year, month, dayNum) : "";
                  const dayEvts = isValid ? (daySchedules[ds] ?? []) : [];
                  const isToday = ds === todayStr;
                  const isSel   = ds === selectedDay;
                  const isSun   = idx % 7 === 0;
                  const isSat   = idx % 7 === 6;

                  const startsToday = dayEvts.filter(s => s.startDate === ds);
                  const continues   = dayEvts.filter(s => s.startDate !== ds);

                  return (
                    <div
                      key={idx}
                      onClick={() => isValid && setSelectedDay(isSel ? null : ds)}
                      className="relative p-1 transition-all overflow-hidden"
                      style={{
                        background: !isValid ? `rgba(254,252,245,0.45)`
                          : isSel   ? ACCENT_BG
                          : BRIGHT_BEIGE,
                        cursor: isValid ? "pointer" : "default",
                        minHeight: 80,
                      }}
                      onMouseEnter={e => { if (isValid && !isSel) e.currentTarget.style.background = CREAM; }}
                      onMouseLeave={e => { if (isValid && !isSel) e.currentTarget.style.background = BRIGHT_BEIGE; }}
                    >
                      {isValid && (
                        <>
                          {/* 날짜 숫자 */}
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                              style={{
                                color:      isToday ? "rgba(254,252,245,0.98)" : isSun ? "#B85450" : isSat ? "#6B7A50" : TEXT_PRIMARY,
                                background: isToday ? ACCENT : "transparent",
                              }}
                            >
                              {dayNum}
                            </span>
                            {dayEvts.length > 0 && (
                              <span className="text-[8px]" style={{ color: TEXT_TERTIARY }}>{dayEvts.length}</span>
                            )}
                          </div>

                          {/* 이벤트 바 */}
                          <div className="space-y-0.5">
                            {startsToday.slice(0, 3).map(s => (
                              <EventBar key={s.id} schedule={s} compact />
                            ))}
                            {continues.slice(0, Math.max(0, 3 - startsToday.length)).map(s => (
                              <div
                                key={s.id}
                                className="h-1.5 rounded-full opacity-40"
                                style={{ background: DEPT_COLOR[s.department].color }}
                              />
                            ))}
                            {dayEvts.length > 3 && (
                              <span className="text-[7px]" style={{ color: TEXT_TERTIARY }}>
                                +{dayEvts.length - 3}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 하단 간트 뷰 ── */}
          <div
            className="shrink-0 overflow-hidden"
            style={{ height: 110, borderTop: `1px solid ${BORDER}`, background: CREAM }}
          >
            <div className="px-4 pt-2 pb-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: TEXT_LABEL }}>
                {month}월 간트 뷰
              </p>
            </div>
            <div className="overflow-x-auto px-4 pb-2">
              <div style={{ minWidth: daysInMonth * 20 }}>
                {/* 날짜 눈금 */}
                <div className="flex mb-1">
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
                {/* 부서별 바 */}
                {DEPTS.filter(d => d !== "전체").map(d => {
                  const dc       = DEPT_COLOR[d];
                  const dScheds  = filtered.filter(s => s.department === d);
                  if (dScheds.length === 0) return null;
                  return (
                    <div key={d} className="flex items-center gap-2 mb-1" style={{ height: 14 }}>
                      <span
                        className="text-[8px] font-semibold shrink-0"
                        style={{ color: dc.color, width: 0, overflow: "visible", whiteSpace: "nowrap", marginLeft: -60 }}
                      />
                      <div className="relative flex-1" style={{ height: 12 }}>
                        {/* 배경 격자 */}
                        <div className="absolute inset-0 flex" style={{ opacity: 0.2 }}>
                          {Array.from({ length: daysInMonth }).map((_, i) => (
                            <div key={i} className="flex-none border-r" style={{ width: 20, borderColor: BORDER }} />
                          ))}
                        </div>
                        {/* 일정 바 */}
                        {dScheds.map(s => {
                          const sDay = new Date(s.startDate).getDate();
                          const eDay = Math.min(daysInMonth, new Date(s.endDate).getDate());
                          const left = (sDay - 1) * 20;
                          const width= Math.max(20, (eDay - sDay + 1) * 20);
                          const sm   = STATUS_META[s.status];
                          return (
                            <div
                              key={s.id}
                              className="absolute rounded-full flex items-center px-1"
                              style={{
                                left, width, height: 12, top: 0,
                                background: dc.bg,
                                border:     `1px solid ${dc.color}40`,
                              }}
                              title={`${s.title}${s.assignee ? ` — ${s.assignee}` : ""}`}
                            >
                              <span className="text-[6px] truncate font-semibold" style={{ color: dc.color }}>
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
          </div>
        </div>
      </div>

      {/* 일정 추가/편집 모달 */}
      {editSchedule !== null && (
        <ScheduleModal
          initial={editSchedule === "new" ? undefined : editSchedule}
          onSave={handleSave}
          onClose={() => setEditSchedule(null)}
        />
      )}
    </div>
  );
}