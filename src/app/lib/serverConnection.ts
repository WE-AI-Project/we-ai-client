// ── Server & Build 탭 연결 설정 ──
// "Server & Build" 탭(로그/빌드)이 항상 이 앱과 같은 머신에서 도는 기본 백엔드만 대상으로
// 하고 있어서, 실제로 뭘 보고 있는지 화면만 봐서는 알 수 없었다. 프로젝트별로 세 가지 모드
// 중 하나를 선택해 저장한다:
//   - "local": 기본 동작 그대로 (이 앱과 같은 백엔드의 REST/SSE API)
//   - "link":  다른 곳에 떠 있는 백엔드 인스턴스의 주소로 같은 REST/SSE API를 호출
//   - "ssh":   원격 머신에 SSH로 직접 접속해 로그를 tail하고 빌드 커맨드를 실행
//
// 저장/테스트/실행은 전부 Electron 메인 프로세스(electron/main.cjs)가 소유한다 —
// 비밀번호·키 패스프레이즈가 safeStorage로 암호화되어 디스크에 남고, 렌더러로 평문이
// 다시 나오지 않으며, SSH 접속 자체가 렌더러(Chromium 샌드박스)에서는 불가능하기 때문이다.
// 브라우저(웹 프리뷰) 환경에는 Electron IPC가 없으므로 "local" 모드만 지원한다.

export type ConnectionMode = "local" | "link" | "ssh";
export type SshAuthType = "password" | "key";
export type SshBuildTool = "GRADLE" | "MAVEN";

export type SshConnectionConfig = {
  host: string;
  port: number;
  username: string;
  authType: SshAuthType;
  remoteWorkingDir: string;
  buildTool: SshBuildTool;
  logCommand: string;
  privateKeyPath: string;
  hasPassword: boolean;
  hasPassphrase: boolean;
};

export type ConnectionConfig = {
  mode: ConnectionMode;
  linkBaseUrl: string;
  ssh: SshConnectionConfig;
  secretSaveFailed?: boolean;
};

export type ConnectionSaveDraft = {
  mode: ConnectionMode;
  linkBaseUrl: string;
  ssh: {
    host: string;
    port: number;
    username: string;
    authType: SshAuthType;
    remoteWorkingDir: string;
    buildTool: SshBuildTool;
    logCommand: string;
    privateKeyPath: string;
    /** undefined = 기존 값 유지, string = 새 값으로 교체, null = 삭제 */
    password?: string | null;
    passphrase?: string | null;
  };
};

export type ConnectionTestDraft = {
  mode: ConnectionMode;
  linkBaseUrl: string;
  ssh: {
    host: string;
    port: number;
    username: string;
    authType: SshAuthType;
    privateKeyPath: string;
    password?: string;
    passphrase?: string;
  };
};

export type ConnectionTestResult =
  | { ok: true; latencyMs: number; info?: string; statusCode?: number }
  | { ok: false; reason: string };

export type SshExecResult = { stdout: string; stderr: string; exitCode: number };

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  mode: "local",
  linkBaseUrl: "",
  ssh: {
    host: "",
    port: 22,
    username: "",
    authType: "password",
    remoteWorkingDir: "",
    buildTool: "GRADLE",
    logCommand: "tail -n 200 -f app.log",
    privateKeyPath: "",
    hasPassword: false,
    hasPassphrase: false,
  },
};

/** 프로젝트별로 연결 설정을 구분해 저장하기 위한 키. 프로젝트가 없으면 "default"를 쓴다. */
export function connectionKeyForProject(projectId?: number | string | null): string {
  return projectId === undefined || projectId === null || projectId === "" ? "default" : String(projectId);
}

function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
}

export function isRemoteConnectionSupported(): boolean {
  return isElectron();
}

export async function loadConnectionConfig(key: string): Promise<ConnectionConfig> {
  if (!isElectron()) return { ...DEFAULT_CONNECTION_CONFIG };
  return window.electronAPI!.connection.load(key);
}

export async function saveConnectionConfig(key: string, draft: ConnectionSaveDraft): Promise<ConnectionConfig> {
  if (!isElectron()) throw new Error("연결 설정은 데스크톱 앱(Electron)에서만 저장할 수 있습니다.");
  return window.electronAPI!.connection.save(key, draft);
}

export async function testConnection(draft: ConnectionTestDraft): Promise<ConnectionTestResult> {
  if (!isElectron()) return { ok: false, reason: "연결 테스트는 데스크톱 앱(Electron)에서만 가능합니다." };
  return window.electronAPI!.connection.test(draft);
}

export async function sshExec(key: string, command: string): Promise<SshExecResult> {
  if (!isElectron()) throw new Error("SSH 실행은 데스크톱 앱(Electron)에서만 가능합니다.");
  return window.electronAPI!.ssh.exec(key, command);
}

export async function startSshLogStream(key: string): Promise<{ ok: boolean; alreadyRunning?: boolean }> {
  if (!isElectron()) throw new Error("SSH 로그 스트리밍은 데스크톱 앱(Electron)에서만 가능합니다.");
  return window.electronAPI!.ssh.startLogStream(key);
}

export async function stopSshLogStream(key: string): Promise<void> {
  if (!isElectron()) return;
  await window.electronAPI!.ssh.stopLogStream(key);
}

export function onSshLogLine(callback: (payload: { key: string; line: string }) => void): () => void {
  if (!isElectron()) return () => {};
  return window.electronAPI!.ssh.onLogLine(callback);
}

export function onSshLogStatus(
  callback: (payload: { key: string; status: "connected" | "closed" | "error"; message?: string }) => void
): () => void {
  if (!isElectron()) return () => {};
  return window.electronAPI!.ssh.onLogStatus(callback);
}

export async function pickPrivateKeyFile(): Promise<string | null> {
  if (!isElectron()) return null;
  return window.electronAPI!.pickFile();
}

/** SSH 원격 실행용 빌드 커맨드 — gradlew/mvnw 래퍼가 없으면 전역 gradle/mvn으로 대체한다. */
export function buildSshTaskCommand(buildTool: SshBuildTool, taskName: string): string {
  if (buildTool === "MAVEN") {
    return `test -x ./mvnw && ./mvnw ${taskName} || mvn ${taskName}`;
  }
  return `test -x ./gradlew && ./gradlew ${taskName} || gradle ${taskName}`;
}
