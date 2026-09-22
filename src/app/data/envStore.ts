// ── SynAIpse 환경 변수 (.env) 유틸 ──
// 예전에는 이 파일 전체가 localStorage에만 저장되는 가짜 값(placeholder)이었고, 실제
// 프로젝트의 .env와는 아무 관계가 없었다. 이제는 Electron 메인 프로세스(env:read/env:write
// IPC, electron/main.cjs)가 실제 로컬 프로젝트 경로의 .env 파일을 직접 읽고 쓰며, 여기 있는
// 함수들은 그 실제 파일 텍스트를 파싱/편집하는 순수 유틸이다 - localStorage나 가짜 기본값은
// 더 이상 없다.

export type EnvVar = {
  key: string;
  value: string;
  secret: boolean;
};

// 값 자체는 지어내지 않지만, 잘 알려진 키의 용도를 설명해주는 건 정직한 문서화다.
const KNOWN_DESCRIPTIONS: Record<string, string> = {
  SPRING_PROFILES_ACTIVE: "활성 Spring Boot 프로파일",
  SERVER_PORT: "Spring Boot 서버 포트",
  DB_URL: "데이터베이스 접속 URL",
  DB_HOST: "데이터베이스 호스트",
  DB_PORT: "데이터베이스 포트",
  DB_NAME: "데이터베이스 이름",
  DB_USERNAME: "데이터베이스 접속 계정",
  DB_PASSWORD: "데이터베이스 비밀번호",
  JWT_SECRET: "JWT 인증 토큰 서명 키",
  JWT_ACCESS_TOKEN_EXPIRATION: "Access Token 유효 시간",
  JWT_REFRESH_TOKEN_EXPIRATION: "Refresh Token 유효 시간",
  OLLAMA_BASE_URL: "Ollama LLM 서버 주소",
  CHROMA_BASE_URL: "ChromaDB(RAG 벡터 저장소) 주소",
  MINIO_ENDPOINT: "MinIO 오브젝트 스토리지 주소",
  MINIO_ROOT_USER: "MinIO 관리자 계정",
  MINIO_ROOT_PASSWORD: "MinIO 관리자 비밀번호",
  VITE_API_BASE_URL: "프론트엔드가 호출할 백엔드 API 주소",
  VITE_DEV_PROXY_TARGET: "개발 서버(Vite)가 /api, /ws를 프록시할 대상 주소",
};

const SECRET_KEY_PATTERN = /(PASSWORD|SECRET|TOKEN|_KEY$|API_KEY)/i;

export function describeEnvKey(key: string): string {
  return KNOWN_DESCRIPTIONS[key] ?? "";
}

export function isLikelySecret(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

// ── 실제 .env 파일 텍스트 → 테이블에 보여줄 EnvVar[] ──
export function parseEnvFile(content: string): EnvVar[] {
  const result: EnvVar[] = [];
  const seen = new Set<string>();

  (content ?? "").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const value = trimmed.slice(eqIdx + 1).trim();
    result.push({ key, value, secret: isLikelySecret(key) });
  });

  return result;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLineIndexForKey(lines: string[], key: string): number {
  const pattern = new RegExp(`^\\s*${escapeForRegExp(key)}\\s*=`);
  return lines.findIndex(line => pattern.test(line));
}

// ── 특정 키의 값만 실제 파일 텍스트 안에서 그대로 바꿔치기 (주석/순서 보존) ──
export function applyEnvValueEdit(content: string, key: string, newValue: string): string {
  const lines = (content ?? "").split(/\r?\n/);
  const idx = findLineIndexForKey(lines, key);
  if (idx === -1) {
    const withoutTrailingBlank = lines.length > 0 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
    return [...withoutTrailingBlank, `${key}=${newValue}`, ""].join("\n");
  }
  lines[idx] = `${key}=${newValue}`;
  return lines.join("\n");
}

export function renameEnvKeyInContent(content: string, oldKey: string, newKey: string): string {
  if (oldKey === newKey || !newKey.trim()) return content;
  const lines = (content ?? "").split(/\r?\n/);
  const idx = findLineIndexForKey(lines, oldKey);
  if (idx === -1) return content;
  const eqIdx = lines[idx].indexOf("=");
  lines[idx] = `${newKey}${lines[idx].slice(eqIdx)}`;
  return lines.join("\n");
}

export function removeEnvKeyFromContent(content: string, key: string): string {
  const lines = (content ?? "").split(/\r?\n/);
  const idx = findLineIndexForKey(lines, key);
  if (idx === -1) return content;
  lines.splice(idx, 1);
  return lines.join("\n");
}

export function appendEnvKeyToContent(content: string, key: string, value: string): string {
  const trimmed = (content ?? "").replace(/\n+$/, "");
  return trimmed ? `${trimmed}\n${key}=${value}\n` : `${key}=${value}\n`;
}
