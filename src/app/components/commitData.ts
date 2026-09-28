// ── SynAIpse 공유 Diff / Commit 타입 ──

export type DiffLineType = "added" | "removed" | "context" | "hunk";
export type FileStatus   = "modified" | "added" | "deleted";

export type DiffLine = {
  type:    DiffLineType;
  oldNum?: number;
  newNum?: number;
  content: string;
};

export type CommitFile = {
  id:        string;
  name:      string;
  path:      string;
  ext:       string;
  status:    FileStatus;
  additions: number;
  deletions: number;
  diff:      DiffLine[];
};

// ──────────────────────────────────────────────
// 🚨 보안 위험 파일 (Security Risk) 감지 함수
// ──────────────────────────────────────────────
export type SecurityRiskInfo = {
  isRisk: boolean;
  riskType?: "ENV" | "SECRET_KEY" | "CREDENTIAL" | "CERTIFICATE";
  reason?: string;
};

export function isSecurityRiskFile(file: { name: string; path?: string; ext?: string }): SecurityRiskInfo {
  const lowerName = (file.name || "").toLowerCase();
  const lowerPath = (file.path || "").toLowerCase();
  const ext = (file.ext || "").toLowerCase();

  // 1. .env 환경 변수 파일 (API 키, DB 접속 정보, 시크릿 유출 위험)
  if (
    lowerName === ".env" ||
    lowerName.startsWith(".env.") ||
    lowerPath.includes("/.env") ||
    lowerPath.includes("\\.env") ||
    ext === "env"
  ) {
    return {
      isRisk: true,
      riskType: "ENV",
      reason: "환경 변수(.env) 파일은 API 키, DB 비밀번호 등 민감 정보 유출 위험이 높습니다.",
    };
  }

  // 2. 비공개 암호화 키 및 인증서 파일
  if (
    lowerName.endsWith(".pem") ||
    lowerName.endsWith(".key") ||
    lowerName.endsWith(".keystore") ||
    lowerName.endsWith(".jks") ||
    lowerName.endsWith(".pkcs12") ||
    lowerName === "id_rsa" ||
    lowerName === "id_ed25519" ||
    lowerName === "id_ecdsa"
  ) {
    return {
      isRisk: true,
      riskType: "SECRET_KEY",
      reason: "비공개 암호화 키(Private Key) 및 인증서 파일입니다. 절대 저장소에 커밋하면 안 됩니다.",
    };
  }

  // 3. 서비스 인증 토큰 및 비밀 파일
  if (
    lowerName.includes("secret") ||
    lowerName.includes("credential") ||
    lowerName === "service-account.json" ||
    lowerName === "google-services.json" ||
    lowerName === "jwt.key"
  ) {
    return {
      isRisk: true,
      riskType: "CREDENTIAL",
      reason: "서비스 계정 인증 및 토큰 비밀 키 정보가 포함되어 있습니다.",
    };
  }

  return { isRisk: false };
}
