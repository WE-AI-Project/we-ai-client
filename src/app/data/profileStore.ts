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

// 아바타 배경색 — 그라디언트 대신 플랫 컬러
export const AVATAR_GRADIENTS: Record<string, string> = {
  olive:  "#6B7040",
  sage:   "#8C9A5E",
  warm:   "#C4A860",
  forest: "#5A8A4A",
  amber:  "#C09840",
};

// 실제 사용자 프로필이 아직 한 번도 로드되지 않았을 때(최초 실행, 또는 API 실패 시)
// 화면이 깨지지 않도록 채우는 빈 틀일 뿐, 특정 인물을 흉내내는 값이 아니어야 한다.
export const DEFAULT_PROFILE: ProfileData = {
  displayName: "",
  role:        "",
  email:       "",
  location:    "",
  bio:         "",
  techStack:   [],
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
  } catch (error) {
    console.warn("로컬 프로필 캐시를 불러오지 못했습니다:", error);
  }
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: ProfileData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
