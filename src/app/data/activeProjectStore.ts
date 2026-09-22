// ── 마지막으로 열었던 프로젝트 기억 (localStorage 기반) ──
// 앱이 재시작되거나(Vite HMR 풀 리로드 등) 창이 다시 로드될 때, 로그인 세션은
// 유효한데도 부트스트랩 로직이 무조건 "프로젝트 시작하기" 화면으로 보내는 바람에
// 사용자가 열어둔 프로젝트를 계속 잃어버리는 문제가 있었다. 여기 저장해두면
// App의 세션 부트스트랩이 이 값을 읽어 프로젝트 접근 권한을 다시 확인한 뒤
// 바로 workspace로 복귀시킬 수 있다.
import type { ProjectLaunchTarget } from "../lib/api";

const ACTIVE_PROJECT_KEY = "weai_last_active_project_v1";

export function saveLastActiveProject(project: ProjectLaunchTarget): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
  } catch (error) {
    console.warn("마지막 프로젝트 정보를 저장하지 못했습니다:", error);
  }
}

export function loadLastActiveProject(): ProjectLaunchTarget | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.projectId !== "number") return null;
    return parsed as ProjectLaunchTarget;
  } catch (error) {
    console.warn("마지막 프로젝트 정보를 불러오지 못했습니다:", error);
    return null;
  }
}

export function clearLastActiveProject(): void {
  try {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  } catch (error) {
    console.warn("마지막 프로젝트 정보를 지우지 못했습니다:", error);
  }
}
