// ── WE&AI 개발 일정 스토어 ──
// 부서별 기능 일정 관리 (localStorage 기반)

export type Dept = "전체" | "Frontend" | "Backend" | "Agent" | "DevOps" | "QA" | "Design";

export type SchedulePriority = "high" | "medium" | "low";
export type ScheduleStatus   = "todo" | "in-progress" | "done";

export type Schedule = {
  id:         string;
  title:      string;       // 기능명
  assignee:   string;       // 담당자 (기본값 공란)
  department: Dept;
  startDate:  string;       // YYYY-MM-DD
  endDate:    string;       // YYYY-MM-DD
  priority:   SchedulePriority;
  status:     ScheduleStatus;
  desc?:      string;       // 설명
};

// ── 부서 색상 ──
export const DEPT_COLOR: Record<Dept, { color: string; bg: string; light: string }> = {
  전체:     { color: "#635bff", bg: "rgba(99,91,255,0.12)",   light: "rgba(99,91,255,0.06)"  },
  Frontend: { color: "#06b6d4", bg: "rgba(6,182,212,0.15)",   light: "rgba(6,182,212,0.07)"  },
  Backend:  { color: "#635bff", bg: "rgba(99,91,255,0.15)",   light: "rgba(99,91,255,0.07)"  },
  Agent:    { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",  light: "rgba(139,92,246,0.07)" },
  DevOps:   { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  light: "rgba(245,158,11,0.07)" },
  QA:       { color: "#10b981", bg: "rgba(16,185,129,0.15)",  light: "rgba(16,185,129,0.07)" },
  Design:   { color: "#ec4899", bg: "rgba(236,72,153,0.15)",  light: "rgba(236,72,153,0.07)" },
};

export const STATUS_META: Record<ScheduleStatus, { label: string; color: string }> = {
  "todo":        { label: "예정",     color: "#9b9b9b" },
  "in-progress": { label: "진행 중",  color: "#f59e0b" },
  "done":        { label: "완료",     color: "#10b981" },
};

export const PRIORITY_META: Record<SchedulePriority, { label: string; color: string }> = {
  high:   { label: "높음", color: "#ef4444" },
  medium: { label: "중간", color: "#f59e0b" },
  low:    { label: "낮음", color: "#10b981" },
};

export function genId(): string {
  return "sch-" + Math.random().toString(36).slice(2, 9);
}

// ── 날짜 유틸 ──
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0=일, 6=토
}

export function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function formatDateKR(date: string): string {
  if (!date) return "";
  const [, m, d] = date.split("-");
  return `${m}월 ${d}일`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}