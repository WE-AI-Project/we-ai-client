// ── Changes 탭용 로컬 Git 작업 (Electron 메인 프로세스 전용) ──
// SyncHub(서버가 호스팅하는 프로젝트별 Git 저장소)가 도입되면서 working tree 관련 작업
// (status / diff / stage / unstage / commit)은 더 이상 서버가 하지 않는다 - 서버는 클라이언트의
// 로컬 경로를 절대 건드리지 않는다. 대신 이 모듈이 사용자 PC의 `git` CLI를 프로젝트 로컬
// 폴더에서 직접 실행하고, 결과를 기존 서버 응답과 동일한 모양(api.ts의 ProjectChangedFileList,
// ProjectGitFileDiff, ProjectGitChangeResult, ProjectGitCommitCreated)으로 돌려준다.
//
// 보안 원칙
// - 항상 execFile + 인자 배열 (셸을 거치지 않음)
// - 파일 인자는 저장소 루트 밖으로 나갈 수 없는 상대 경로만 허용 + `--` 뒤에 literal pathspec으로 전달
// - push 인증 토큰은 GIT_CONFIG_COUNT/KEY/VALUE 환경변수로 `http.extraHeader`를 넘긴다
//   (`git -c http.extraHeader=...`와 동일한 효과지만 프로세스 인자 목록에 노출되지 않고,
//   git config 파일에도 절대 기록되지 않는다). 에러 메시지에서도 토큰은 마스킹한다.
// - GIT_TERMINAL_PROMPT=0 / GCM_INTERACTIVE=never 로 자격 증명 프롬프트가 뜨지 않게 한다.

const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const SYNCHUB_REMOTE = "synchub";
const DEFAULT_TIMEOUT_MS = 30_000;
const NETWORK_TIMEOUT_MS = 120_000;
const MAX_BUFFER = 64 * 1024 * 1024;

class LocalGitError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LocalGitError";
    this.code = code;
  }
}

function redact(text, secrets) {
  let out = String(text ?? "");
  for (const secret of secrets || []) {
    if (secret) out = out.split(secret).join("***");
  }
  return out.replace(/(Authorization:\s*Bearer\s+)\S+/gi, "$1***");
}

/**
 * git CLI 실행. 성공(허용된 exit code)이면 { stdout, stderr, code } 를, 아니면 LocalGitError 를 던진다.
 * Node의 기본 에러 메시지에는 실행한 명령줄 전체가 들어가므로 그대로 쓰지 않고 stderr만 사용한다.
 */
function runGit(cwd, args, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    allowedExitCodes = [0],
    extraConfig = [],
    secrets = [],
    errorCode = "GIT_COMMAND_FAILED",
  } = options;

  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GCM_INTERACTIVE: "never",
    GIT_LITERAL_PATHSPECS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C",
    LANG: "C",
  };
  // 사용자가 이미 GIT_CONFIG_COUNT를 쓰고 있을 수 있으므로 이어 붙인다.
  if (extraConfig.length > 0) {
    let count = Number.parseInt(env.GIT_CONFIG_COUNT || "0", 10) || 0;
    for (const [key, value] of extraConfig) {
      env[`GIT_CONFIG_KEY_${count}`] = key;
      env[`GIT_CONFIG_VALUE_${count}`] = value;
      count += 1;
    }
    env.GIT_CONFIG_COUNT = String(count);
  }

  const fullArgs = ["-c", "core.quotepath=false", "-c", "color.ui=false", ...args];

  return new Promise((resolve, reject) => {
    execFile(
      "git",
      fullArgs,
      { cwd, env, timeout, maxBuffer: MAX_BUFFER, windowsHide: true, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr, code: 0 });
          return;
        }
        if (error.code === "ENOENT") {
          reject(new LocalGitError("GIT_NOT_INSTALLED", "git 실행 파일을 찾을 수 없습니다. Git을 설치한 뒤 앱을 다시 시작해 주세요."));
          return;
        }
        if (error.killed || error.signal === "SIGTERM") {
          reject(new LocalGitError("GIT_TIMEOUT", `git ${args[0]} 명령이 시간 내에 끝나지 않았습니다.`));
          return;
        }
        if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
          reject(new LocalGitError("GIT_OUTPUT_TOO_LARGE", `git ${args[0]} 출력이 너무 큽니다.`));
          return;
        }
        if (typeof error.code === "number" && allowedExitCodes.includes(error.code)) {
          resolve({ stdout, stderr, code: error.code });
          return;
        }
        const detail = redact((stderr || stdout || "").trim(), secrets) || `exit code ${error.code}`;
        const failure = new LocalGitError(errorCode, `git ${args[0]} 실패: ${detail}`);
        failure.exitCode = typeof error.code === "number" ? error.code : null;
        failure.stderr = redact(stderr || "", secrets);
        failure.stdout = redact(stdout || "", secrets);
        reject(failure);
      }
    );
  });
}

// ── 경로 검증 ──

async function assertDirectory(localPath) {
  if (typeof localPath !== "string" || !localPath.trim()) {
    throw new LocalGitError("LOCAL_PATH_REQUIRED", "프로젝트 로컬 경로가 설정되어 있지 않습니다.");
  }
  const root = path.resolve(localPath.trim());
  if (!path.isAbsolute(localPath.trim())) {
    throw new LocalGitError("LOCAL_PATH_INVALID", "프로젝트 로컬 경로는 절대 경로여야 합니다.");
  }
  let stat;
  try {
    stat = await fs.stat(root);
  } catch {
    throw new LocalGitError("LOCAL_PATH_NOT_FOUND", `프로젝트 로컬 폴더를 찾을 수 없습니다: ${root}`);
  }
  if (!stat.isDirectory()) {
    throw new LocalGitError("LOCAL_PATH_NOT_DIRECTORY", `프로젝트 로컬 경로가 폴더가 아닙니다: ${root}`);
  }
  return root;
}

/** 폴더가 git work tree인지 확인하고 저장소 루트(toplevel)를 돌려준다. */
async function resolveRepo(localPath) {
  const root = await assertDirectory(localPath);
  let topLevel;
  try {
    const inside = await runGit(root, ["rev-parse", "--is-inside-work-tree"]);
    if (inside.stdout.trim() !== "true") throw new Error("not a work tree");
    topLevel = (await runGit(root, ["rev-parse", "--show-toplevel"])).stdout.trim();
  } catch (error) {
    if (error instanceof LocalGitError && error.code === "GIT_NOT_INSTALLED") throw error;
    throw new LocalGitError("NOT_A_GIT_REPO", `Git 저장소가 아닙니다: ${root}`);
  }
  return path.resolve(topLevel);
}

/** 렌더러가 넘긴 파일 경로를 저장소 루트 기준의 안전한 상대 경로(슬래시 구분)로 정규화한다. */
function normalizeRepoFilePath(topLevel, rawFilePath) {
  if (typeof rawFilePath !== "string" || !rawFilePath.trim() || rawFilePath.includes("\0")) {
    throw new LocalGitError("INVALID_FILE_PATH", "올바르지 않은 파일 경로입니다.");
  }
  const candidate = rawFilePath.replace(/\\/g, "/");
  if (path.isAbsolute(candidate) || /^[a-zA-Z]:/.test(candidate) || candidate.startsWith("/")) {
    throw new LocalGitError("INVALID_FILE_PATH", `상대 경로만 허용됩니다: ${rawFilePath}`);
  }
  const segments = candidate.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new LocalGitError("INVALID_FILE_PATH", `상위 폴더(..)를 가리키는 경로는 허용되지 않습니다: ${rawFilePath}`);
  }
  const resolved = path.resolve(topLevel, candidate);
  const relative = path.relative(topLevel, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new LocalGitError("INVALID_FILE_PATH", `저장소 밖의 경로입니다: ${rawFilePath}`);
  }
  return relative.split(path.sep).join("/");
}

function normalizeFilePaths(topLevel, filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new LocalGitError("FILE_PATHS_REQUIRED", "파일 경로를 하나 이상 지정해야 합니다.");
  }
  return [...new Set(filePaths.map((filePath) => normalizeRepoFilePath(topLevel, filePath)))];
}

// ── status 파싱 ──

function extractFileName(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}

function extractExtension(filePath) {
  const fileName = extractFileName(filePath);
  if (!fileName.includes(".") || fileName.endsWith(".")) return "";
  return fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
}

function resolveChangeType(indexStatus, workTreeStatus) {
  if (indexStatus === "?") return "UNTRACKED";
  if (indexStatus === "U" || workTreeStatus === "U" || (indexStatus === "A" && workTreeStatus === "A") || (indexStatus === "D" && workTreeStatus === "D")) {
    return "UNMERGED";
  }
  const status = indexStatus !== " " ? indexStatus : workTreeStatus;
  switch (status) {
    case "A": return "ADDED";
    case "D": return "DELETED";
    case "R": return "RENAMED";
    case "C": return "COPIED";
    case "M": return "MODIFIED";
    case "T": return "TYPE_CHANGED";
    default: return "UNKNOWN";
  }
}

function resolveDisplayStatus(changeType, staged, unstaged) {
  if (changeType === "UNTRACKED") return "UNTRACKED";
  if (staged && unstaged) return `STAGED_AND_UNSTAGED_${changeType}`;
  if (staged) return `STAGED_${changeType}`;
  if (unstaged) return `UNSTAGED_${changeType}`;
  return changeType;
}

/**
 * `git status --porcelain=v1 -z` 출력 파싱.
 * 항목: "XY PATH\0", rename/copy는 "XY NEW\0ORIG\0" (원래 경로가 다음 NUL 필드).
 */
function parsePorcelainZ(output) {
  const fields = output.split("\0");
  const files = [];
  for (let i = 0; i < fields.length; i += 1) {
    const entry = fields[i];
    if (!entry || entry.length < 4) continue;
    const indexStatus = entry[0];
    const workTreeStatus = entry[1];
    const filePath = entry.slice(3);
    let originalPath = null;
    if (indexStatus === "R" || indexStatus === "C" || workTreeStatus === "R" || workTreeStatus === "C") {
      originalPath = fields[i + 1] || null;
      i += 1;
    }
    if (indexStatus === "!") continue; // ignored

    const changeType = resolveChangeType(indexStatus, workTreeStatus);
    const untracked = indexStatus === "?";
    const staged = !untracked && indexStatus !== " ";
    const unstaged = untracked || workTreeStatus !== " ";

    files.push({
      filePath,
      fileName: extractFileName(filePath),
      extension: extractExtension(filePath),
      changeType,
      staged,
      unstaged,
      stagedStatus: indexStatus === " " || untracked ? null : indexStatus,
      unstagedStatus: untracked ? "?" : workTreeStatus === " " ? null : workTreeStatus,
      displayStatus: resolveDisplayStatus(changeType, staged, unstaged),
      originalPath,
      untracked,
    });
  }
  return files;
}

async function readChangedFiles(topLevel) {
  const { stdout } = await runGit(topLevel, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return parsePorcelainZ(stdout);
}

async function getCurrentBranch(topLevel) {
  const symbolic = await runGit(topLevel, ["symbolic-ref", "--short", "-q", "HEAD"], { allowedExitCodes: [0, 1] });
  const branch = symbolic.stdout.trim();
  if (branch) return { branchName: branch, detached: false };
  const head = await runGit(topLevel, ["rev-parse", "--short", "HEAD"], { allowedExitCodes: [0, 128] });
  return { branchName: head.stdout.trim() || "HEAD", detached: true };
}

async function hasHeadCommit(topLevel) {
  const result = await runGit(topLevel, ["rev-parse", "--verify", "-q", "HEAD^{commit}"], { allowedExitCodes: [0, 1, 128] });
  return result.code === 0 && Boolean(result.stdout.trim());
}

function toChangeFile(file) {
  return { path: file.filePath, status: file.changeType, staged: file.staged, unstaged: file.unstaged };
}

async function buildChangeResult(projectId, topLevel, extra) {
  const files = await readChangedFiles(topLevel);
  const stagedFiles = files.filter((f) => f.staged).map(toChangeFile);
  const unstagedFiles = files.filter((f) => f.unstaged).map(toChangeFile);
  return {
    projectId,
    stagedFileCount: stagedFiles.length,
    unstagedFileCount: unstagedFiles.length,
    ...extra,
    stagedFiles,
    unstagedFiles,
  };
}

function countDiffStats(diffContent) {
  let additions = 0;
  let deletions = 0;
  let inHunk = false;
  for (const line of String(diffContent || "").split(/\r?\n/)) {
    if (line.startsWith("diff --git") || line.startsWith("diff --cc")) { inHunk = false; continue; }
    if (line.startsWith("@@")) { inHunk = true; continue; }
    if (!inHunk) continue;
    if (line.startsWith("+")) additions += 1;
    else if (line.startsWith("-")) deletions += 1;
  }
  return { additions, deletions };
}

function localIsoNow() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
}

// ── 공개 API ──

async function probe(localPath) {
  const result = {
    localPath: typeof localPath === "string" ? localPath.trim() : "",
    exists: false,
    isRepo: false,
    topLevel: null,
    branchName: null,
    detached: false,
    hasCommits: false,
    remoteName: SYNCHUB_REMOTE,
    remoteUrl: null,
    remoteTrackingRef: null,
    aheadCount: 0,
    changedCount: 0,
  };
  try {
    await assertDirectory(localPath);
    result.exists = true;
  } catch {
    // 경로 미설정/잘못된 경로/폴더 없음은 에러가 아니라 "아직 연결 안 됨" 상태로 돌려준다.
    return result;
  }
  let topLevel;
  try {
    topLevel = await resolveRepo(localPath);
  } catch (error) {
    if (error.code === "NOT_A_GIT_REPO") return result;
    throw error;
  }
  result.isRepo = true;
  result.topLevel = topLevel;
  const { branchName, detached } = await getCurrentBranch(topLevel);
  result.branchName = branchName;
  result.detached = detached;
  result.hasCommits = await hasHeadCommit(topLevel);
  const remote = await runGit(topLevel, ["remote", "get-url", SYNCHUB_REMOTE], { allowedExitCodes: [0, 2, 128] });
  result.remoteUrl = remote.code === 0 ? remote.stdout.trim() || null : null;
  result.changedCount = (await readChangedFiles(topLevel)).length;

  if (result.hasCommits && !detached) {
    const trackingRef = `refs/remotes/${SYNCHUB_REMOTE}/${branchName}`;
    const verify = await runGit(topLevel, ["rev-parse", "--verify", "-q", trackingRef], { allowedExitCodes: [0, 1, 128] });
    const range = verify.code === 0 ? `${trackingRef}..HEAD` : "HEAD";
    if (verify.code === 0) result.remoteTrackingRef = `${SYNCHUB_REMOTE}/${branchName}`;
    const ahead = await runGit(topLevel, ["rev-list", "--count", range]);
    result.aheadCount = Number.parseInt(ahead.stdout.trim(), 10) || 0;
  }
  return result;
}

async function status(projectId, localPath) {
  const topLevel = await resolveRepo(localPath);
  const files = await readChangedFiles(topLevel);
  const { branchName } = await getCurrentBranch(topLevel);
  return {
    projectId,
    branchName,
    totalChangedCount: files.length,
    stagedCount: files.filter((f) => f.staged).length,
    unstagedCount: files.filter((f) => f.unstaged).length,
    untrackedCount: files.filter((f) => f.untracked).length,
    files: files.map(({ untracked: _untracked, ...file }) => file),
  };
}

async function diff(projectId, localPath, rawFilePath, staged) {
  const topLevel = await resolveRepo(localPath);
  const filePath = normalizeRepoFilePath(topLevel, rawFilePath);
  const files = await readChangedFiles(topLevel);
  const file = files.find((candidate) => candidate.filePath === filePath);
  if (!file) {
    throw new LocalGitError("GIT_CHANGED_FILE_NOT_FOUND", `변경된 파일 목록에 없는 파일입니다: ${filePath}`);
  }

  let diffContent;
  if (staged) {
    const pathspecs = file.originalPath ? [filePath, file.originalPath] : [filePath];
    diffContent = (await runGit(topLevel, ["diff", "--cached", "--no-ext-diff", "-M", "--", ...pathspecs], { errorCode: "GIT_DIFF_FAILED" })).stdout;
  } else if (file.untracked) {
    // untracked 파일은 전체가 추가된 것으로 보여준다. --no-index는 차이가 있으면 exit 1.
    diffContent = (await runGit(topLevel, ["diff", "--no-index", "--no-ext-diff", "--", "/dev/null", filePath], {
      allowedExitCodes: [0, 1],
      errorCode: "GIT_DIFF_FAILED",
    })).stdout;
  } else {
    diffContent = (await runGit(topLevel, ["diff", "--no-ext-diff", "--", filePath], { errorCode: "GIT_DIFF_FAILED" })).stdout;
  }

  const stats = countDiffStats(diffContent);
  return {
    projectId,
    filePath: file.filePath,
    fileName: file.fileName,
    extension: file.extension,
    staged: Boolean(staged),
    changeType: file.changeType,
    additions: stats.additions,
    deletions: stats.deletions,
    diffContent,
  };
}

async function stage(projectId, localPath, filePaths) {
  const topLevel = await resolveRepo(localPath);
  const normalized = normalizeFilePaths(topLevel, filePaths);
  // -A: 삭제된 파일도 스테이징 가능하게
  await runGit(topLevel, ["add", "-A", "--", ...normalized], { errorCode: "GIT_STAGE_FAILED" });
  return buildChangeResult(projectId, topLevel, { filePaths: normalized });
}

async function unstage(projectId, localPath, filePaths) {
  const topLevel = await resolveRepo(localPath);
  const normalized = normalizeFilePaths(topLevel, filePaths);
  if (await hasHeadCommit(topLevel)) {
    await runGit(topLevel, ["reset", "-q", "HEAD", "--", ...normalized], { errorCode: "GIT_UNSTAGE_FAILED" });
  } else {
    // 첫 커밋 전에는 HEAD가 없으므로 인덱스에서만 제거한다.
    await runGit(topLevel, ["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--", ...normalized], { errorCode: "GIT_UNSTAGE_FAILED" });
  }
  return buildChangeResult(projectId, topLevel, { filePaths: normalized });
}

async function stageAll(projectId, localPath) {
  const topLevel = await resolveRepo(localPath);
  await runGit(topLevel, ["add", "-A"], { errorCode: "GIT_STAGE_ALL_FAILED" });
  return buildChangeResult(projectId, topLevel, { stagedAll: true });
}

async function unstageAll(projectId, localPath) {
  const topLevel = await resolveRepo(localPath);
  if (await hasHeadCommit(topLevel)) {
    await runGit(topLevel, ["reset", "-q", "HEAD"], { errorCode: "GIT_UNSTAGE_ALL_FAILED" });
  } else {
    await runGit(topLevel, ["rm", "--cached", "-r", "-q", "--ignore-unmatch", "."], { errorCode: "GIT_UNSTAGE_ALL_FAILED" });
  }
  return buildChangeResult(projectId, topLevel, { unstagedAll: true });
}

/**
 * 스테이징된 변경을 커밋한다. 저장소에 user.name/user.email이 설정되어 있지 않으면
 * 렌더러가 넘긴 author(로그인한 SynAIpse 계정)로 이번 커밋에만 신원을 지정한다(config에 쓰지 않음).
 */
async function commit(projectId, localPath, message, options = {}) {
  const topLevel = await resolveRepo(localPath);
  const subject = typeof message === "string" ? message.trim() : "";
  if (!subject) throw new LocalGitError("GIT_COMMIT_MESSAGE_REQUIRED", "커밋 메시지를 입력해 주세요.");
  const description = typeof options.description === "string" ? options.description.trim() : "";

  const stagedOut = await runGit(topLevel, ["diff", "--cached", "--name-only", "-z"]);
  const committedFiles = stagedOut.stdout.split("\0").filter(Boolean);
  if (committedFiles.length === 0) {
    throw new LocalGitError("GIT_NO_STAGED_FILES", "스테이징된 파일이 없습니다.");
  }

  const extraConfig = [];
  const author = options.author || {};
  const configuredName = (await runGit(topLevel, ["config", "user.name"], { allowedExitCodes: [0, 1] })).stdout.trim();
  const configuredEmail = (await runGit(topLevel, ["config", "user.email"], { allowedExitCodes: [0, 1] })).stdout.trim();
  if (!configuredName && typeof author.name === "string" && author.name.trim()) extraConfig.push(["user.name", author.name.trim()]);
  if (!configuredEmail && typeof author.email === "string" && author.email.trim()) extraConfig.push(["user.email", author.email.trim()]);

  const args = ["commit", "-q", "-m", subject];
  if (description) args.push("-m", description);
  try {
    await runGit(topLevel, args, { extraConfig, errorCode: "GIT_COMMIT_FAILED", timeout: NETWORK_TIMEOUT_MS });
  } catch (error) {
    if (/Please tell me who you are|unable to auto-detect email/i.test(error.stderr || error.message)) {
      throw new LocalGitError("GIT_IDENTITY_MISSING", "Git 사용자 정보(user.name / user.email)가 설정되어 있지 않아 커밋할 수 없습니다.");
    }
    throw error;
  }

  const commitHash = (await runGit(topLevel, ["rev-parse", "HEAD"])).stdout.trim();
  const { branchName } = await getCurrentBranch(topLevel);
  return {
    projectId,
    commitHash,
    shortCommitHash: commitHash.slice(0, 7),
    branchName,
    message: subject,
    committedFileCount: committedFiles.length,
    committedFiles,
    createdAt: localIsoNow(),
  };
}

function validateRemoteUrl(remoteUrl) {
  if (typeof remoteUrl !== "string" || !remoteUrl.trim()) {
    throw new LocalGitError("REMOTE_URL_REQUIRED", "SyncHub 저장소 주소가 없습니다.");
  }
  let parsed;
  try {
    parsed = new URL(remoteUrl.trim());
  } catch {
    throw new LocalGitError("REMOTE_URL_INVALID", "SyncHub 저장소 주소 형식이 올바르지 않습니다.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new LocalGitError("REMOTE_URL_INVALID", "SyncHub 저장소 주소는 http(s)여야 합니다.");
  }
  if (parsed.username || parsed.password) {
    throw new LocalGitError("REMOTE_URL_INVALID", "SyncHub 저장소 주소에 자격 증명을 포함할 수 없습니다.");
  }
  return parsed.toString();
}

/** remote `synchub`를 추가하거나 주소가 다르면 갱신한다. */
async function ensureRemote(localPath, remoteUrl) {
  const topLevel = await resolveRepo(localPath);
  const url = validateRemoteUrl(remoteUrl);
  const current = await runGit(topLevel, ["remote", "get-url", SYNCHUB_REMOTE], { allowedExitCodes: [0, 2, 128] });
  const currentUrl = current.code === 0 ? current.stdout.trim() : "";
  let action = "unchanged";
  if (!currentUrl) {
    await runGit(topLevel, ["remote", "add", SYNCHUB_REMOTE, url], { errorCode: "GIT_REMOTE_FAILED" });
    action = "added";
  } else if (currentUrl !== url) {
    await runGit(topLevel, ["remote", "set-url", SYNCHUB_REMOTE, url], { errorCode: "GIT_REMOTE_FAILED" });
    action = "updated";
  }
  return { remoteName: SYNCHUB_REMOTE, remoteUrl: url, action };
}

/** 현재 브랜치를 remote `synchub`의 같은 이름 브랜치로 push 한다. */
async function push(localPath, options = {}) {
  const topLevel = await resolveRepo(localPath);
  const accessToken = typeof options.accessToken === "string" ? options.accessToken.trim() : "";
  const { branchName, detached } = await getCurrentBranch(topLevel);
  if (detached) {
    throw new LocalGitError("GIT_DETACHED_HEAD", "브랜치가 체크아웃되어 있지 않아(detached HEAD) push할 수 없습니다.");
  }
  if (!(await hasHeadCommit(topLevel))) {
    throw new LocalGitError("GIT_NO_COMMITS", "아직 커밋이 없어 push할 내용이 없습니다.");
  }
  const remote = await runGit(topLevel, ["remote", "get-url", SYNCHUB_REMOTE], { allowedExitCodes: [0, 2, 128] });
  if (remote.code !== 0) {
    throw new LocalGitError("GIT_REMOTE_MISSING", "SyncHub 원격 저장소(synchub)가 설정되어 있지 않습니다.");
  }

  const extraConfig = [];
  if (accessToken) {
    extraConfig.push(["http.extraHeader", `Authorization: Bearer ${accessToken}`]);
    // 토큰으로 인증할 때는 OS 자격 증명 관리자(GCM 등)가 끼어들어 창을 띄우거나 엉뚱한 계정을 쓰지 않게 한다.
    extraConfig.push(["credential.helper", ""]);
  }

  try {
    const result = await runGit(
      topLevel,
      ["push", "--porcelain", SYNCHUB_REMOTE, `HEAD:refs/heads/${branchName}`],
      { extraConfig, secrets: [accessToken], timeout: NETWORK_TIMEOUT_MS, errorCode: "GIT_PUSH_FAILED" }
    );
    const headHash = (await runGit(topLevel, ["rev-parse", "HEAD"])).stdout.trim();
    // push 성공 시 git이 refs/remotes/synchub/<branch>를 갱신하지만, 혹시 fetch refspec이 없는 remote면 직접 맞춘다.
    await runGit(topLevel, ["update-ref", `refs/remotes/${SYNCHUB_REMOTE}/${branchName}`, headHash], { allowedExitCodes: [0, 1, 128] });
    return {
      remoteName: SYNCHUB_REMOTE,
      branchName,
      headCommitHash: headHash,
      upToDate: /\[up to date\]/.test(result.stdout),
      output: redact(result.stdout.trim(), [accessToken]),
    };
  } catch (error) {
    const text = `${error.stdout || ""}\n${error.stderr || ""}\n${error.message || ""}`;
    if (/\[rejected\]|non-fast-forward|fetch first|Updates were rejected/i.test(text)) {
      throw new LocalGitError("GIT_PUSH_REJECTED", "SyncHub에 더 최신 커밋이 있어 push가 거부되었습니다. 먼저 SyncHub의 변경을 pull/merge한 뒤 다시 push해 주세요.");
    }
    if (/\b401\b|Authentication failed|could not read Username|terminal prompts disabled|unable to get password|Cannot prompt/i.test(text)) {
      throw new LocalGitError("GIT_PUSH_UNAUTHORIZED", "SyncHub 인증에 실패했습니다. 다시 로그인한 뒤 시도해 주세요.");
    }
    if (/\b403\b/.test(text)) {
      throw new LocalGitError("GIT_PUSH_FORBIDDEN", "이 프로젝트의 SyncHub 저장소에 push할 권한이 없습니다. (GUEST는 읽기 전용)");
    }
    if (/unable to access|Could not resolve host|Failed to connect|Connection refused|timed out/i.test(text)) {
      throw new LocalGitError("GIT_PUSH_UNREACHABLE", `SyncHub 서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요. (${error.message})`);
    }
    throw error;
  }
}

/** 명시적으로 요청된 경우에만: 폴더를 git 저장소로 초기화(기본 브랜치 main)하고 remote를 설정한다. */
async function init(localPath, options = {}) {
  if (typeof localPath !== "string" || !localPath.trim() || !path.isAbsolute(localPath.trim())) {
    throw new LocalGitError("LOCAL_PATH_INVALID", "프로젝트 로컬 경로는 절대 경로여야 합니다.");
  }
  const root = path.resolve(localPath.trim());
  // remote 주소가 잘못됐으면 저장소를 만들기 전에 거부한다.
  if (options.remoteUrl) validateRemoteUrl(options.remoteUrl);
  await fs.mkdir(root, { recursive: true });
  let created = false;
  let isRepo = true;
  try {
    await resolveRepo(root);
  } catch (error) {
    if (error.code !== "NOT_A_GIT_REPO") throw error;
    isRepo = false;
  }
  if (!isRepo) {
    const defaultBranch = typeof options.defaultBranch === "string" && /^[\w./-]+$/.test(options.defaultBranch)
      ? options.defaultBranch
      : "main";
    await runGit(root, ["init", "-q", "-b", defaultBranch], { errorCode: "GIT_INIT_FAILED" });
    created = true;
  }
  let remote = null;
  if (options.remoteUrl) remote = await ensureRemote(root, options.remoteUrl);
  return { localPath: root, created, remote };
}

module.exports = {
  SYNCHUB_REMOTE,
  LocalGitError,
  parsePorcelainZ,
  countDiffStats,
  normalizeRepoFilePath,
  probe,
  status,
  diff,
  stage,
  unstage,
  stageAll,
  unstageAll,
  commit,
  ensureRemote,
  push,
  init,
};
