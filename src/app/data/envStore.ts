// ── SynAIpse 환경 변수 저장소 ──
// localStorage 기반으로 .env 파일을 읽고 수정할 수 있도록 지원

export type EnvVar = {
  key: string;
  value: string;
  secret: boolean;
  editable: boolean;
  desc: string;
};

const STORAGE_KEY = "weai_env_vars_v2";

// 이 페이지는 순전히 로컬(localStorage) 전용 메모장이며, 여기 적힌 값이 실제 앱 동작에
// 반영되지는 않는다(실제 API 엔드포인트는 빌드 시점의 VITE_API_BASE_URL을 그대로 사용).
// 그래서 DEFAULT_ENV_VARS는 "예시로 보여줄 값"일 뿐이지만, 과거에는 여기에 실제처럼 보이는
// DB 비밀번호/JWT 시크릿/특정 개발자의 로컬 경로가 그대로 박혀 있어 클라이언트 번들에
// 실제 시크릿처럼 노출됐었다. 전부 일반적인 플레이스홀더로 교체한다.
const DEFAULT_API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.trim()) ||
  "https://your-api-domain.example.com";

// ── 기본 .env 파일 변수 목록 (로컬 전용 예시 값 — 실제 시크릿을 적지 마세요) ──
export const DEFAULT_ENV_VARS: EnvVar[] = [
  { key: "VITE_API_BASE_URL",        value: DEFAULT_API_BASE_URL,                            secret: false, editable: true, desc: "백엔드 API 엔드포인트" },
  { key: "SPRING_PROFILES_ACTIVE",   value: "dev",                                            secret: false, editable: true, desc: "활성 Spring Boot 프로파일" },
  { key: "SERVER_PORT",              value: "8080",                                           secret: false, editable: true, desc: "Spring Boot 서버 포트" },
  { key: "SPRING_DATASOURCE_URL",    value: "jdbc:mysql://localhost:3306/weaidb",             secret: false, editable: true, desc: "MySQL 메인 DB 접속 URL (예시)" },
  { key: "SPRING_DATASOURCE_USERNAME", value: "changeme",                                     secret: false, editable: true, desc: "데이터베이스 접속 계정 (예시)" },
  { key: "SPRING_DATASOURCE_PASSWORD", value: "changeme",                                     secret: true,  editable: true, desc: "데이터베이스 비밀번호 (실제 값으로 교체하세요)" },
  { key: "JWT_SECRET",               value: "changeme-generate-a-real-32-byte-secret",        secret: true,  editable: true, desc: "JWT 인증 토큰 서명 키 (실제 값으로 교체하세요)" },
  { key: "JWT_EXPIRATION_SECONDS",   value: "1800",                                           secret: false, editable: true, desc: "Access Token 유효 시간 (초)" },
  { key: "WORKSPACE_LOCAL_PATH",     value: "",                                               secret: false, editable: true, desc: "로컬 프론트엔드 작업 디렉토리 (직접 입력)" },
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
  } catch (error) {
    console.warn("로컬 환경 변수 메모를 불러오지 못했습니다:", error);
  }
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
    "# SynAIpse Project — Environment Configuration",
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
