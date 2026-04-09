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

const SCHEDULE_KEY = "weai_schedules_v1";

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

// ── 초기 샘플 일정 ──
const _now = new Date();
const y = _now.getFullYear();
const m = _now.getMonth() + 1; // 1-based

function d(month: number, day: number, yearOffset = 0): string {
  return `${y + yearOffset}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const INITIAL_SCHEDULES: Schedule[] = [
  // ── Backend ──
  {
    id: "s1", title: "Spring Boot 프로젝트 초기 세팅", assignee: "", department: "Backend",
    startDate: d(m, 20, m > 3 ? 0 : -1), endDate: d(m, 22, m > 3 ? 0 : -1),
    priority: "high", status: "done", desc: "Spring Boot 3.2.5 + Gradle 8.7 기본 구조 구성",
  },
  {
    id: "s2", title: "MultiAgentController 구현", assignee: "", department: "Backend",
    startDate: d(m, 23, m > 3 ? 0 : -1), endDate: d(m, 28, m > 3 ? 0 : -1),
    priority: "high", status: "done", desc: "에이전트 디스패치 및 상태 API",
  },
  {
    id: "s3", title: "DataSyncAgent 재시도 로직", assignee: "", department: "Backend",
    startDate: d(m, 29, m > 3 ? 0 : -1), endDate: d(m, 2, m > 2 ? 0 : 1),
    priority: "high", status: "in-progress", desc: "exponential backoff retry 구현",
  },
  {
    id: "s4", title: "JWT 인증 미들웨어", assignee: "", department: "Backend",
    startDate: d(m, 3), endDate: d(m, 10),
    priority: "medium", status: "todo", desc: "Spring Security + JWT 토큰 검증",
  },
  {
    id: "s5", title: "PostgreSQL 스키마 설계", assignee: "", department: "Backend",
    startDate: d(m, 5), endDate: d(m, 9),
    priority: "medium", status: "todo",
  },
  {
    id: "s6", title: "API 문서화 (Swagger)", assignee: "", department: "Backend",
    startDate: d(m, 12), endDate: d(m, 14),
    priority: "low", status: "todo",
  },

  // ── Frontend ──
  {
    id: "s7", title: "WE&AI 대시보드 UI 설계", assignee: "", department: "Frontend",
    startDate: d(m, 20, m > 3 ? 0 : -1), endDate: d(m, 25, m > 3 ? 0 : -1),
    priority: "high", status: "done", desc: "Figma 디자인 → React 컴포넌트",
  },
  {
    id: "s8", title: "글로벌 사이드바 + 라우팅", assignee: "", department: "Frontend",
    startDate: d(m, 26, m > 3 ? 0 : -1), endDate: d(m, 1),
    priority: "high", status: "done",
  },
  {
    id: "s9", title: "Agent 제어 페이지", assignee: "", department: "Frontend",
    startDate: d(m, 2), endDate: d(m, 7),
    priority: "high", status: "in-progress", desc: "에이전트 상태 모니터링 + 토글",
  },
  {
    id: "s10", title: "채팅 / 회의 모드 UI", assignee: "", department: "Frontend",
    startDate: d(m, 5), endDate: d(m, 11),
    priority: "medium", status: "in-progress",
  },
  {
    id: "s11", title: "캘린더 & 일정 관리", assignee: "", department: "Frontend",
    startDate: d(m, 8), endDate: d(m, 14),
    priority: "medium", status: "todo",
  },
  {
    id: "s12", title: "Branch 시각화", assignee: "", department: "Frontend",
    startDate: d(m, 10), endDate: d(m, 16),
    priority: "low", status: "todo",
  },

  // ── Agent ──
  {
    id: "s13", title: "멀티에이전트 핸드셰이크 프로토콜", assignee: "", department: "Agent",
    startDate: d(m, 22, m > 3 ? 0 : -1), endDate: d(m, 29, m > 3 ? 0 : -1),
    priority: "high", status: "done",
  },
  {
    id: "s14", title: "ParserAgent JSON 오류 수정", assignee: "", department: "Agent",
    startDate: d(m, 2), endDate: d(m, 5),
    priority: "high", status: "in-progress",
  },
  {
    id: "s15", title: "AI QA 자동화 통합", assignee: "", department: "Agent",
    startDate: d(m, 6), endDate: d(m, 18),
    priority: "high", status: "todo", desc: "Phase 1 + Phase 2 UI 에이전트 연동",
  },

  // ── DevOps ──
  {
    id: "s16", title: "Docker 컨테이너화", assignee: "", department: "DevOps",
    startDate: d(m, 1), endDate: d(m, 8),
    priority: "medium", status: "todo",
  },
  {
    id: "s17", title: "GitHub Actions CI/CD", assignee: "", department: "DevOps",
    startDate: d(m, 10), endDate: d(m, 20),
    priority: "medium", status: "todo",
  },

  // ── QA ──
  {
    id: "s18", title: "백엔드 단위 테스트 작성", assignee: "", department: "QA",
    startDate: d(m, 3), endDate: d(m, 12),
    priority: "high", status: "todo",
  },
  {
    id: "s19", title: "E2E 시나리오 설계", assignee: "", department: "QA",
    startDate: d(m, 13), endDate: d(m, 22),
    priority: "medium", status: "todo",
  },
];

// ── CRUD ──
export function loadSchedules(): Schedule[] {
  try {
    const s = localStorage.getItem(SCHEDULE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return INITIAL_SCHEDULES.map(s => ({ ...s }));
}

export function saveSchedules(schedules: Schedule[]): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
}

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
  const [y, m, d] = date.split("-");
  return `${m}월 ${d}일`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}