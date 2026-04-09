// ── WE&AI 프로젝트 설정 스토어 ──
// 팀 구성 + 기술 스택 버전 관리 (localStorage 기반)

export type MemberRole = "파트장" | "파트원" | "게스트";
export type Department = "Backend" | "Frontend" | "Agent" | "DevOps" | "Design" | "QA";

export type TeamMember = {
  id:         string;
  name:       string;
  email:      string;
  avatar:     string;         // 이니셜
  role:       MemberRole;
  department: Department;
  joinedAt:   string;
  isOnline:   boolean;
};

export type TechItem = {
  id:       string;
  category: string;
  name:     string;
  version:  string;
  icon:     string;          // 이모지 아이콘
  required: boolean;
};

export type ProjectSettings = {
  projectName:  string;
  description:  string;
  startDate:    string;
  targetDate:   string;
  repository:   string;
  members:      TeamMember[];
  techStack:    TechItem[];
};

const SETTINGS_KEY = "weai_project_settings_v1";

// ── 초기 더미 팀 멤버 ──
const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "m1", name: "병권", email: "byungkwon@weai.dev",
    avatar: "병", role: "파트장", department: "Backend",
    joinedAt: "2025-03-20", isOnline: true,
  },
  {
    id: "m2", name: "Admin", email: "admin@weai.dev",
    avatar: "A", role: "파트장", department: "Frontend",
    joinedAt: "2025-03-20", isOnline: true,
  },
  {
    id: "m3", name: "지현", email: "jihyun@weai.dev",
    avatar: "지", role: "파트원", department: "Backend",
    joinedAt: "2025-03-22", isOnline: false,
  },
  {
    id: "m4", name: "민준", email: "minjun@weai.dev",
    avatar: "민", role: "파트원", department: "Frontend",
    joinedAt: "2025-03-22", isOnline: true,
  },
  {
    id: "m5", name: "QA Bot", email: "qabot@weai.dev",
    avatar: "Q", role: "파트원", department: "QA",
    joinedAt: "2025-03-25", isOnline: true,
  },
  {
    id: "m6", name: "서준", email: "seojun@weai.dev",
    avatar: "서", role: "파트원", department: "Agent",
    joinedAt: "2025-03-26", isOnline: false,
  },
];

// ── 초기 기술 스택 ──
const INITIAL_TECH: TechItem[] = [
  // Backend
  { id: "t1",  category: "Backend",     name: "Java",          version: "17.0.9",  icon: "☕", required: true  },
  { id: "t2",  category: "Backend",     name: "Spring Boot",   version: "3.2.5",   icon: "🍃", required: true  },
  { id: "t3",  category: "Backend",     name: "Gradle",        version: "8.7",     icon: "🐘", required: true  },
  { id: "t4",  category: "Backend",     name: "PostgreSQL",    version: "16.2",    icon: "🐘", required: true  },
  { id: "t5",  category: "Backend",     name: "Redis",         version: "7.2.4",   icon: "🔴", required: false },
  // Frontend
  { id: "t6",  category: "Frontend",    name: "Node.js",       version: "20.11.0", icon: "🟢", required: true  },
  { id: "t7",  category: "Frontend",    name: "React",         version: "18.3.1",  icon: "⚛️", required: true  },
  { id: "t8",  category: "Frontend",    name: "TypeScript",    version: "5.4.5",   icon: "📘", required: true  },
  { id: "t9",  category: "Frontend",    name: "Vite",          version: "5.2.10",  icon: "⚡", required: true  },
  { id: "t10", category: "Frontend",    name: "Tailwind CSS",  version: "4.0.0",   icon: "💨", required: false },
  // DevOps
  { id: "t11", category: "DevOps",      name: "Docker",        version: "26.0.0",  icon: "🐳", required: true  },
  { id: "t12", category: "DevOps",      name: "Git",           version: "2.44.0",  icon: "📦", required: true  },
  { id: "t13", category: "DevOps",      name: "GitHub Actions",version: "—",       icon: "🤖", required: false },
  // Agent
  { id: "t14", category: "Agent",       name: "WE&AI SDK",     version: "0.3.2",   icon: "🧠", required: true  },
  { id: "t15", category: "Agent",       name: "OpenAI API",    version: "gpt-4o",  icon: "✨", required: true  },
];

const INITIAL_SETTINGS: ProjectSettings = {
  projectName:  "WE&AI Enterprise",
  description:  "Java/Spring Boot 기반 엔터프라이즈 멀티에이전트 관리 플랫폼",
  startDate:    "2025-03-20",
  targetDate:   "2025-06-30",
  repository:   "https://github.com/weai-org/enterprise",
  members:      INITIAL_MEMBERS,
  techStack:    INITIAL_TECH,
};

// ── CRUD ──
export function loadSettings(): ProjectSettings {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_SETTINGS));
}

export function saveSettings(settings: ProjectSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── 파트장 조회 ──
export function getLeader(dept: Department): TeamMember | undefined {
  const s = loadSettings();
  return s.members.find(m => m.department === dept && m.role === "파트장");
}

// ── 부서별 파트장 목록 ──
export function getAllLeaders(): TeamMember[] {
  const s = loadSettings();
  return s.members.filter(m => m.role === "파트장");
}

// ── ID 생성 ──
export function genMemberId(): string {
  return "m" + Math.random().toString(36).slice(2, 8);
}

// ── 부서 색상 ──
export const DEPT_COLORS: Record<Department, { color: string; bg: string }> = {
  Backend:  { color: "#635bff", bg: "rgba(99,91,255,0.10)"  },
  Frontend: { color: "#06b6d4", bg: "rgba(6,182,212,0.10)"  },
  Agent:    { color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  DevOps:   { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  Design:   { color: "#ec4899", bg: "rgba(236,72,153,0.10)" },
  QA:       { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
};

export const ROLE_COLORS: Record<MemberRole, { color: string; bg: string }> = {
  "파트장": { color: "#635bff", bg: "rgba(99,91,255,0.10)"  },
  "파트원": { color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  "게스트": { color: "#9b9b9b", bg: "rgba(0,0,0,0.05)"       },
};

// ── 기술 카테고리 색상 ──
export const TECH_CATEGORY_COLOR: Record<string, string> = {
  Backend:  "#635bff",
  Frontend: "#06b6d4",
  DevOps:   "#f59e0b",
  Agent:    "#8b5cf6",
};
