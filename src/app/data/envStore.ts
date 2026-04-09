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

// ── 기본 .env 파일 변수 목록 ──
export const DEFAULT_ENV_VARS: EnvVar[] = [
  { key: "SPRING_PROFILES_ACTIVE", value: "dev",                              secret: false, editable: true,  desc: "활성 Spring Boot 프로파일" },
  { key: "SERVER_PORT",            value: "8080",                             secret: false, editable: true,  desc: "Spring Boot 서버 포트" },
  { key: "JAVA_HOME",              value: "C:\\Program Files\\Java\\jdk-17.0.18", secret: false, editable: false, desc: "JDK 설치 경로 (자동 감지)" },
  { key: "GRADLE_HOME",            value: "C:\\Users\\user\\.gradle",         secret: false, editable: false, desc: "Gradle 홈 디렉토리" },
  { key: "DB_URL",                 value: "jdbc:h2:mem:weaidb",               secret: false, editable: true,  desc: "데이터베이스 연결 URL (dev)" },
  { key: "DB_USERNAME",            value: "sa",                               secret: false, editable: true,  desc: "DB 사용자명" },
  { key: "DB_PASSWORD",            value: "weai-dev-secret",                  secret: true,  editable: true,  desc: "DB 비밀번호" },
  { key: "AGENT_MAX_THREADS",      value: "6",                                secret: false, editable: true,  desc: "에이전트 최대 스레드 수" },
  { key: "AGENT_RETRY_DELAY_MS",   value: "5000",                             secret: false, editable: true,  desc: "에이전트 재시도 간격 (ms)" },
  { key: "JWT_SECRET",             value: "weai-jwt-secret-key-256bit",       secret: true,  editable: true,  desc: "JWT 서명 키" },
  { key: "LOG_LEVEL",              value: "DEBUG",                            secret: false, editable: true,  desc: "Spring 로그 레벨 (dev)" },
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
