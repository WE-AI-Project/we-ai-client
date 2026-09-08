// ── WE&AI 환경 변수 저장소 ──
// localStorage 기반으로 .env 파일을 읽고 수정할 수 있도록 지원

export type EnvVar = {
  key: string;
  value: string;
  secret: boolean;
  editable: boolean;
  desc: string;
};

const STORAGE_KEY = "weai_env_vars_v2";

// ── 기본 .env 파일 변수 목록 (로컬 보안 전용) ──
export const DEFAULT_ENV_VARS: EnvVar[] = [
  { key: "VITE_API_BASE_URL",        value: "https://api.yhy-server.com",                     secret: false, editable: true, desc: "시나입스 백엔드 API 엔드포인트" },
  { key: "SPRING_PROFILES_ACTIVE",   value: "dev",                                            secret: false, editable: true, desc: "활성 Spring Boot 프로파일" },
  { key: "SERVER_PORT",              value: "8080",                                           secret: false, editable: true, desc: "Spring Boot 서버 포트" },
  { key: "SPRING_DATASOURCE_URL",    value: "jdbc:mysql://api.yhy-server.com:3306/weaidb",    secret: false, editable: true, desc: "MySQL 메인 DB 접속 URL" },
  { key: "SPRING_DATASOURCE_USERNAME", value: "root",                                         secret: false, editable: true, desc: "데이터베이스 접속 계정" },
  { key: "SPRING_DATASOURCE_PASSWORD", value: "weai-prod-db-pw!@#",                           secret: true,  editable: true, desc: "데이터베이스 비밀번호" },
  { key: "JWT_SECRET",               value: "synaipse-master-security-jwt-secret-key-256bit", secret: true,  editable: true, desc: "JWT 인증 토큰 서명 키" },
  { key: "JWT_EXPIRATION_SECONDS",   value: "1800",                                           secret: false, editable: true, desc: "Access Token 유효 시간 (초)" },
  { key: "WORKSPACE_LOCAL_PATH",     value: "C:\\Users\\USER\\orca\\workspaces\\we-ai-client\\pteropod", secret: false, editable: true, desc: "로컬 프론트엔드 작업 디렉토리" },
  { key: "MARS_EXPO_PROJECT_PATH",   value: "D:\\Mars_expo_project",                          secret: false, editable: true, desc: "동양미래대 MARS Expo 로컬 경로" },
  { key: "MARS_EXPO_REPO_URL",       value: "https://github.com/DongyangMARS/web",            secret: false, editable: true, desc: "MARS Expo 깃허브 원격 저장소" },
  { key: "AI_QA_ENABLED",            value: "true",                                           secret: false, editable: true, desc: "AI QA 및 자동화 검증 활성화 여부" },
  { key: "MULTI_AGENT_CONCURRENCY",  value: "8",                                              secret: false, editable: true, desc: "동시 멀티 에이전트 스레드 풀 크기" },
];

// ── localStorage에서 읽기 ──
export function loadEnvVars(): EnvVar[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: EnvVar[] = JSON.parse(stored);
      // 저장된 데이터가 유효한지 확인
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ENV_VARS.map(v => ({ ...v }));
}

// ── localStorage에 저장 ──
export function saveEnvVars(vars: EnvVar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
}

// ── .env 파일 텍스트 생성 ──
export function generateEnvContent(vars: EnvVar[]): string {
  const now = new Date().toISOString().replace("T", " ").split(".")[0];

  const sections: Array<{ comment: string; keys: string[] }> = [
    { comment: "# ── Spring Profiles ──",           keys: ["SPRING_PROFILES_ACTIVE"] },
    { comment: "# ── Server ──",                    keys: ["SERVER_PORT"] },
    { comment: "# ── JDK / Build (자동 감지) ──",   keys: ["JAVA_HOME", "GRADLE_HOME"] },
    { comment: "# ── Database ──",                  keys: ["DB_URL", "DB_USERNAME", "DB_PASSWORD"] },
    { comment: "# ── Agent Configuration ──",       keys: ["AGENT_MAX_THREADS", "AGENT_RETRY_DELAY_MS"] },
    { comment: "# ── Security ──",                  keys: ["JWT_SECRET"] },
    { comment: "# ── Logging ──",                   keys: ["LOG_LEVEL"] },
  ];

  const covered = new Set<string>();
  const lines: string[] = [
    "# WE&AI Project — Environment Configuration",
    `# Updated: ${now}`,
    "",
  ];

  sections.forEach(({ comment, keys }) => {
    lines.push(comment);
    keys.forEach(k => {
      const v = vars.find(e => e.key === k);
      if (v) {
        lines.push(`${v.key}=${v.value}`);
        covered.add(k);
      }
    });
    lines.push("");
  });

  // 커스텀(사용자가 추가한) 변수
  const custom = vars.filter(v => !covered.has(v.key));
  if (custom.length > 0) {
    lines.push("# ── Custom ──");
    custom.forEach(v => lines.push(`${v.key}=${v.value}`));
  }

  return lines.join("\n");
}

// ── .env 파일 텍스트 파싱 → EnvVar[] ──
export function parseEnvContent(content: string, existing: EnvVar[]): EnvVar[] {
  const result: EnvVar[] = [];
  const existingMap = new Map(existing.map(v => [v.key, v]));

  content.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    const existing = existingMap.get(key);
    result.push({
      key,
      value,
      secret:   existing?.secret   ?? false,
      editable: existing?.editable ?? true,
      desc:     existing?.desc     ?? "",
    });
  });

  return result.length > 0 ? result : existing;
}
