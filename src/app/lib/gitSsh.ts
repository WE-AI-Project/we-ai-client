// ── SSH 모드 전용 Git 변경사항/스테이징/커밋 실행 ──
// "local"/"link" 모드는 서버가 실제 프로젝트 파일이 있는 머신에서 git을 실행한다고
// 가정한다 (we-ai-server ProjectGitService). 배포된 공유 백엔드(라즈베리파이)는 개발자의
// 프로젝트와 같은 머신이 아니므로 이 가정이 항상 깨진다 - "ssh" 모드에서는 서버를 거치지
// 않고 Electron 메인 프로세스가 개발자가 지정한 원격 머신에 SSH로 직접 접속해 git 커맨드를
// 실행한다(BuildManagementPage의 buildSshTaskCommand/sshExec와 동일한 방식).
//
// 여기 있는 각 함수는 REST API(api.ts)와 동일한 응답 타입을 반환해서, ChangesPage 등
// 호출부가 local/link/ssh 어느 모드든 같은 코드로 다룰 수 있게 한다.
import { sshExec } from "./serverConnection";
import type {
  ChangedFileItem,
  ProjectChangedFileList,
  ProjectGitChangeResult,
  ProjectGitCommitCreated,
  ProjectGitFileDiff,
} from "./api";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function shellQuoteAll(values: string[]): string {
  return values.map(shellQuote).join(" ");
}

class RemoteGitError extends Error {}

async function runGit(connectionKey: string, args: string): Promise<string> {
  const result = await sshExec(connectionKey, `git ${args}`);
  if (result.exitCode !== 0) {
    const output = `${result.stdout}${result.stderr}`.trim();
    throw new RemoteGitError(output || `git 명령 실행에 실패했습니다 (exit code ${result.exitCode}).`);
  }
  return result.stdout;
}

/** 실패해도 무시하고 대체 커맨드로 재시도한다 (server-side runChangeGitCommandWithFallback과 동일). */
async function runGitWithFallback(connectionKey: string, primaryArgs: string, fallbackArgs: string): Promise<void> {
  try {
    await runGit(connectionKey, primaryArgs);
  } catch {
    await runGit(connectionKey, fallbackArgs);
  }
}

function validateFilePath(rawFilePath: string): string {
  const filePath = rawFilePath?.trim();
  if (!filePath) {
    throw new RemoteGitError("파일 경로가 필요합니다.");
  }
  const slashNormalized = filePath.replace(/\\/g, "/");
  if (slashNormalized.startsWith("/") || /^[A-Za-z]:\//.test(slashNormalized) || slashNormalized.includes("..")) {
    throw new RemoteGitError("잘못된 파일 경로입니다.");
  }
  return slashNormalized;
}

function extractStatusFilePath(rawPath: string): string {
  let filePath = rawPath.trim();
  const renameSeparatorIndex = filePath.indexOf(" -> ");
  if (renameSeparatorIndex >= 0) {
    filePath = filePath.substring(renameSeparatorIndex + " -> ".length);
  }
  return filePath.replace(/\\/g, "/");
}

function extractFileName(filePath: string): string {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.substring(normalized.lastIndexOf("/") + 1);
}

function extractExtension(filePath: string): string {
  const fileName = extractFileName(filePath);
  if (!fileName.includes(".") || fileName.endsWith(".")) return "";
  return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
}

function resolveChangeStatus(indexStatus: string, workingTreeStatus: string): string {
  if (indexStatus === "?") return "UNTRACKED";
  const status = indexStatus !== " " ? indexStatus : workingTreeStatus;
  switch (status) {
    case "A": return "ADDED";
    case "D": return "DELETED";
    case "R": return "RENAMED";
    case "C": return "COPIED";
    case "M": return "MODIFIED";
    case "U": return "UNMERGED";
    default: return "UNKNOWN";
  }
}

function toStatusValue(status: string): string | null {
  return status === " " ? null : status;
}

function resolveDisplayStatus(changeType: string, staged: boolean, unstaged: boolean): string {
  if (changeType === "UNTRACKED") return "UNTRACKED";
  if (staged && unstaged) return `STAGED_AND_UNSTAGED_${changeType}`;
  if (staged) return `STAGED_${changeType}`;
  if (unstaged) return `UNSTAGED_${changeType}`;
  return changeType;
}

async function readChangedFiles(connectionKey: string): Promise<ChangedFileItem[]> {
  const output = await runGit(connectionKey, "status --porcelain=v1");
  if (!output.trim()) return [];

  const files: ChangedFileItem[] = [];
  for (const rawLine of output.split(/\r?\n/)) {
    if (!rawLine || rawLine.length < 3) continue;
    const indexStatus = rawLine.charAt(0);
    const workingTreeStatus = rawLine.charAt(1);
    const filePath = extractStatusFilePath(rawLine.substring(3));
    const changeType = resolveChangeStatus(indexStatus, workingTreeStatus);
    const staged = indexStatus !== " " && indexStatus !== "?";
    const unstaged = workingTreeStatus !== " " || indexStatus === "?";
    const stagedStatus = toStatusValue(indexStatus) ?? "";
    const unstagedStatus = indexStatus === "?" ? "?" : (toStatusValue(workingTreeStatus) ?? "");

    files.push({
      filePath,
      fileName: extractFileName(filePath),
      extension: extractExtension(filePath),
      changeType,
      staged,
      unstaged,
      stagedStatus,
      unstagedStatus,
      displayStatus: resolveDisplayStatus(changeType, staged, unstaged),
    });
  }
  return files;
}

async function getCurrentBranch(connectionKey: string): Promise<string> {
  try {
    const output = (await runGit(connectionKey, "branch --show-current")).trim();
    if (output) return output;
  } catch {
    // fall through to the abbrev-ref fallback below
  }
  return (await runGit(connectionKey, "rev-parse --abbrev-ref HEAD")).trim();
}

function countDiffStats(diffContent: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  if (!diffContent) return { additions, deletions };
  for (const line of diffContent.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) additions += 1;
    else if (line.startsWith("-")) deletions += 1;
  }
  return { additions, deletions };
}

export async function remoteGitChangedFiles(
  connectionKey: string,
  projectId: number | string
): Promise<ProjectChangedFileList> {
  const files = await readChangedFiles(connectionKey);
  const branchName = await getCurrentBranch(connectionKey);
  return {
    projectId: Number(projectId),
    branchName,
    totalChangedCount: files.length,
    stagedCount: files.filter((f) => f.staged).length,
    unstagedCount: files.filter((f) => f.unstaged).length,
    untrackedCount: files.filter((f) => f.changeType === "UNTRACKED").length,
    files,
  };
}

export async function remoteGitFileDiff(
  connectionKey: string,
  projectId: number | string,
  filePath: string,
  staged: boolean
): Promise<ProjectGitFileDiff> {
  const normalizedPath = validateFilePath(filePath);
  const files = await readChangedFiles(connectionKey);
  const file = files.find((f) => f.filePath === normalizedPath);
  if (!file) {
    throw new RemoteGitError("변경된 파일을 찾을 수 없습니다.");
  }

  const args = staged
    ? `diff --cached -- ${shellQuote(normalizedPath)}`
    : `diff -- ${shellQuote(normalizedPath)}`;
  const diffContent = await runGit(connectionKey, args);
  const { additions, deletions } = countDiffStats(diffContent);

  return {
    projectId: Number(projectId),
    filePath: file.filePath,
    fileName: file.fileName,
    extension: file.extension,
    staged,
    changeType: file.changeType,
    additions,
    deletions,
    diffContent,
  };
}

async function buildChangeResult(
  connectionKey: string,
  projectId: number | string,
  filePaths: string[] | undefined,
  extra: Partial<ProjectGitChangeResult>
): Promise<ProjectGitChangeResult> {
  const files = await readChangedFiles(connectionKey);
  const stagedFiles = files.filter((f) => f.staged).map((f) => ({
    path: f.filePath, status: f.stagedStatus, staged: true, unstaged: f.unstaged,
  }));
  const unstagedFiles = files.filter((f) => f.unstaged).map((f) => ({
    path: f.filePath, status: f.unstagedStatus, staged: f.staged, unstaged: true,
  }));

  return {
    projectId: Number(projectId),
    stagedFileCount: stagedFiles.length,
    unstagedFileCount: unstagedFiles.length,
    filePaths,
    stagedFiles,
    unstagedFiles,
    ...extra,
  };
}

export async function remoteGitStage(
  connectionKey: string,
  projectId: number | string,
  filePaths: string[]
): Promise<ProjectGitChangeResult> {
  const normalizedPaths = filePaths.map(validateFilePath);
  await runGit(connectionKey, `add -- ${shellQuoteAll(normalizedPaths)}`);
  return buildChangeResult(connectionKey, projectId, normalizedPaths, {});
}

export async function remoteGitUnstage(
  connectionKey: string,
  projectId: number | string,
  filePaths: string[]
): Promise<ProjectGitChangeResult> {
  const normalizedPaths = filePaths.map(validateFilePath);
  await runGitWithFallback(
    connectionKey,
    `restore --staged -- ${shellQuoteAll(normalizedPaths)}`,
    `reset HEAD -- ${shellQuoteAll(normalizedPaths)}`
  );
  return buildChangeResult(connectionKey, projectId, normalizedPaths, {});
}

export async function remoteGitStageAll(
  connectionKey: string,
  projectId: number | string
): Promise<ProjectGitChangeResult> {
  await runGit(connectionKey, "add -A");
  return buildChangeResult(connectionKey, projectId, undefined, { stagedAll: true });
}

export async function remoteGitUnstageAll(
  connectionKey: string,
  projectId: number | string
): Promise<ProjectGitChangeResult> {
  const currentlyStaged = (await readChangedFiles(connectionKey)).filter((f) => f.staged);
  if (currentlyStaged.length === 0) {
    return buildChangeResult(connectionKey, projectId, undefined, { unstagedAll: true });
  }
  await runGitWithFallback(connectionKey, "restore --staged .", "reset HEAD");
  return buildChangeResult(connectionKey, projectId, undefined, { unstagedAll: true });
}

function validateCommitMessage(rawMessage: string): string {
  const message = rawMessage?.trim();
  if (!message) throw new RemoteGitError("커밋 메시지를 입력해 주세요.");
  if (message.length > 200) throw new RemoteGitError("커밋 메시지는 200자를 초과할 수 없습니다.");
  return message;
}

function validateCommitDescription(rawDescription?: string): string | undefined {
  const description = rawDescription?.trim();
  if (!description) return undefined;
  if (description.length > 1000) throw new RemoteGitError("커밋 설명은 1000자를 초과할 수 없습니다.");
  return description;
}

export async function remoteGitCommit(
  connectionKey: string,
  projectId: number | string,
  rawMessage: string,
  rawDescription?: string
): Promise<ProjectGitCommitCreated> {
  const message = validateCommitMessage(rawMessage);
  const description = validateCommitDescription(rawDescription);
  const stagedPathsOutput = await runGit(connectionKey, "diff --cached --name-only");
  const stagedFilePaths = stagedPathsOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/\\/g, "/"));

  if (stagedFilePaths.length === 0) {
    throw new RemoteGitError("스테이징된 파일이 없습니다.");
  }

  let commitArgs = `commit -m ${shellQuote(message)}`;
  if (description) {
    commitArgs += ` -m ${shellQuote(description)}`;
  }
  await runGit(connectionKey, commitArgs);

  const commitHash = (await runGit(connectionKey, "rev-parse HEAD")).trim();
  const branchName = await getCurrentBranch(connectionKey);

  return {
    projectId: Number(projectId),
    commitHash,
    shortCommitHash: commitHash.length <= 7 ? commitHash : commitHash.substring(0, 7),
    branchName,
    message,
    committedFileCount: stagedFilePaths.length,
    committedFiles: stagedFilePaths,
    createdAt: new Date().toISOString(),
  };
}
