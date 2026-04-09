// ── WE&AI 프로필 저장소 ──
// localStorage 기반 프로필 데이터 관리

export type TechEntry = {
  name:    string; // 표시 이름 (e.g. "Spring Boot 3")
  slug:    string; // devicon slug (e.g. "spring")
  variant: string; // devicon variant (e.g. "original")
};

export type ProfileData = {
  displayName: string;
  role:        string;
  email:       string;
  location:    string;
  bio:         string;
  techStack:   TechEntry[];
  avatarColor: string; // 그라데이션 키
};

const STORAGE_KEY = "weai_profile_v2";

export const AVATAR_GRADIENTS: Record<string, { from: string; via: string; to: string }> = {
  olive:  { from: "#D4CC9E", via: "#AEB784", to: "#6B7040" },
  sage:   { from: "#E8EDD4", via: "#C4CC9A", to: "#AEB784" },
  warm:   { from: "#F8E8C8", via: "#E3DBBB", to: "#C4A860" },
  forest: { from: "#C8D8A8", via: "#8CAE6A", to: "#5A8A4A" },
  amber:  { from: "#FCE8C0", via: "#E8C46A", to: "#C09840" },
};

export const DEFAULT_PROFILE: ProfileData = {
  displayName: "병권",
  role:        "Student Developer",
  email:       "user@example.com",
  location:    "Seoul, Korea",
  bio:         "Java/Spring Boot 백엔드 개발자. WE&AI 멀티에이전트 시스템 구축 중.",
  techStack: [
    { name: "Java",        slug: "java",        variant: "original" },
    { name: "Spring",      slug: "spring",      variant: "original" },
    { name: "Gradle",      slug: "gradle",      variant: "original" },
    { name: "Git",         slug: "git",         variant: "original" },
    { name: "Python",      slug: "python",      variant: "original" },
    { name: "FastAPI",     slug: "fastapi",     variant: "original" },
    { name: "Docker",      slug: "docker",      variant: "original" },
    { name: "PostgreSQL",  slug: "postgresql",  variant: "original" },
  ],
  avatarColor: "olive",
};

export function loadProfile(): ProfileData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 마이그레이션: techStack이 string[] 형태면 TechEntry[]로 변환
      if (Array.isArray(parsed.techStack) && typeof parsed.techStack[0] === "string") {
        parsed.techStack = (parsed.techStack as string[]).map(name => ({
          name, slug: "", variant: "original",
        }));
      }
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: ProfileData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
