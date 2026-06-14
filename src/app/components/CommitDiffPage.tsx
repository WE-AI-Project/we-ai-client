import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FolderCode,
  GitBranch,
  GitCommit,
  Monitor,
  Server,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { CommitFile, DiffLine } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";
import {
  fetchFilteredProjectCommits,
  fetchProjectCommitDetail,
  fetchProjectCommitFileDiff,
  fetchProjectCommitFiles,
  formatApiError,
  type ProjectCommitChangedFile,
  type ProjectCommitDetail,
  type ProjectCommitFileDiff,
  type ProjectCommitSummary,
  type ProjectRepositoryType,
} from "../lib/api";
import {
  ACCENT,
  BORDER,
  BORDER_SUBTLE,
  CREAM,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from "../colors";

type RepoMode = "backend" | "split" | "frontend";
type RepoKey = "backend" | "frontend";

type RepoState = {
  loading: boolean;
  error: string | null;
  commits: ProjectCommitSummary[];
  selectedCommitHash: string | null;
  selectedFilePath: string | null;
  loadingCommitHash: string | null;
  loadingDiffKey: string | null;
  commitDetails: Record<string, ProjectCommitDetail>;
  commitFiles: Record<string, CommitFile[]>;
};

type RepoConfig = {
  repositoryType: ProjectRepositoryType;
  label: string;
  accent: string;
  icon: typeof Server;
};

const PANEL_BG = CREAM;

const REPO_CONFIG: Record<RepoKey, RepoConfig> = {
  backend: {
    repositoryType: "BACKEND",
    label: "Backend (Java/Spring)",
    accent: ACCENT,
    icon: Server,
  },
  frontend: {
    repositoryType: "FRONTEND",
    label: "Frontend (React/TS)",
    accent: "#06b6d4",
    icon: Monitor,
  },
};

function createInitialRepoState(): RepoState {
  return {
    loading: false,
    error: null,
    commits: [],
    selectedCommitHash: null,
    selectedFilePath: null,
    loadingCommitHash: null,
    loadingDiffKey: null,
    commitDetails: {},
    commitFiles: {},
  };
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-black/10 ${className}`} />;
}

function DarkSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

function toCommitFileStatus(status: string): CommitFile["status"] {
  const normalized = status.trim().toUpperCase();
  if (normalized === "ADDED") {
    return "added";
  }
  if (normalized === "DELETED") {
    return "deleted";
  }
  return "modified";
}

function parseUnifiedDiff(diffText: string): DiffLine[] {
  if (!diffText.trim()) {
    return [];
  }

  const diffLines: DiffLine[] = [];
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNumber = Number(match[1]);
        newLineNumber = Number(match[2]);
      }
      diffLines.push({ type: "hunk", content: line });
      continue;
    }

    if (
      line.startsWith("diff --git ") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("new file mode ") ||
      line.startsWith("deleted file mode ") ||
      line.startsWith("similarity index ") ||
      line.startsWith("rename from ") ||
      line.startsWith("rename to ") ||
      line.startsWith("Binary files ") ||
      line.startsWith("\\ No newline at end of file")
    ) {
      continue;
    }

    if (line.startsWith("+")) {
      diffLines.push({
        type: "added",
        newNum: newLineNumber || undefined,
        content: line.slice(1),
      });
      newLineNumber += 1;
      continue;
    }

    if (line.startsWith("-")) {
      diffLines.push({
        type: "removed",
        oldNum: oldLineNumber || undefined,
        content: line.slice(1),
      });
      oldLineNumber += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      diffLines.push({
        type: "context",
        oldNum: oldLineNumber || undefined,
        newNum: newLineNumber || undefined,
        content: line.slice(1),
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  return diffLines;
}

function mapCommitFile(file: ProjectCommitChangedFile): CommitFile {
  return {
    id: file.path,
    name: file.fileName,
    path: file.path,
    ext: file.extension || (file.fileName.includes(".") ? file.fileName.split(".").pop() ?? "" : ""),
    status: toCommitFileStatus(file.status),
    additions: file.additions,
    deletions: file.deletions,
    diff: [],
  };
}

function mergeCommitDiff(file: CommitFile, response: ProjectCommitFileDiff): CommitFile {
  return {
    ...file,
    ext: response.extension || file.ext,
    status: toCommitFileStatus(response.status),
    additions: response.additions,
    deletions: response.deletions,
    diff: parseUnifiedDiff(response.diff),
  };
}

function formatCommittedAt(rawValue?: string | null): string {
  if (!rawValue) {
    return "-";
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCommitHeader(detail?: ProjectCommitDetail | null): string {
  if (!detail) {
    return "커밋을 선택하면 상세 정보가 표시됩니다.";
  }

  return `${detail.shortCommitHash} · ${detail.authorName} · ${formatCommittedAt(detail.committedAt)}`;
}

function getSelectedFile(state: RepoState): CommitFile | null {
  if (!state.selectedCommitHash || !state.selectedFilePath) {
    return null;
  }

  const files = state.commitFiles[state.selectedCommitHash] ?? [];
  return files.find((file) => file.path === state.selectedFilePath) ?? null;
}

function CommitRow({
  accent,
  commit,
  selected,
  onClick,
}: {
  accent: string;
  commit: ProjectCommitSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(99,91,255,0.05)" : "transparent",
        borderLeft: selected ? `2px solid ${accent}` : "2px solid transparent",
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[9px]"
          style={{ background: "rgba(0,0,0,0.05)", color: selected ? ACCENT : TEXT_TERTIARY }}
        >
          {commit.shortCommitHash}
        </span>
        <span className="ml-auto text-[9px]" style={{ color: TEXT_TERTIARY }}>
          {formatCommittedAt(commit.committedAt)}
        </span>
      </div>

      <p className="mb-1 line-clamp-2 text-[11px] font-medium" style={{ color: TEXT_PRIMARY }}>
        {commit.message}
      </p>

      <div className="flex items-center gap-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>
        <span className="inline-flex items-center gap-1">
          <User className="h-2.5 w-2.5" />
          {commit.authorName}
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <span style={{ color: "#10b981" }}>+{commit.additions}</span>
          <span style={{ color: "#ef4444" }}>-{commit.deletions}</span>
          <span>{commit.changedFileCount} files</span>
        </span>
      </div>
    </button>
  );
}

function FileRow({
  accent,
  file,
  selected,
  onClick,
}: {
  accent: string;
  file: CommitFile;
  selected: boolean;
  onClick: () => void;
}) {
  const statusColor =
    file.status === "added" ? "#10b981" : file.status === "deleted" ? "#ef4444" : "#f59e0b";
  const statusLabel = file.status === "added" ? "A" : file.status === "deleted" ? "D" : "M";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(99,91,255,0.05)" : "transparent",
        borderLeft: selected ? `2px solid ${accent}` : "2px solid transparent",
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <FolderCode className="h-3.5 w-3.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
        <span className="flex-1 truncate text-[11px] font-medium" style={{ color: TEXT_PRIMARY }}>
          {file.name}
        </span>
        <span className="text-[9px] font-bold" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>
      <p className="mb-1 truncate text-[9px]" style={{ color: TEXT_TERTIARY }}>
        {file.path}
      </p>
      <div className="flex items-center gap-2 text-[9px]">
        <span style={{ color: "#10b981" }}>+{file.additions}</span>
        <span style={{ color: "#ef4444" }}>-{file.deletions}</span>
      </div>
    </button>
  );
}

function RepoColumn({
  accent,
  label,
  icon: Icon,
  state,
  selectedDetail,
  onSelectCommit,
  onSelectFile,
}: {
  accent: string;
  label: string;
  icon: typeof Server;
  state: RepoState;
  selectedDetail: ProjectCommitDetail | null;
  onSelectCommit: (commitHash: string) => void;
  onSelectFile: (filePath: string) => void;
}) {
  const files = state.selectedCommitHash ? state.commitFiles[state.selectedCommitHash] ?? [] : [];

  return (
    <div className="flex min-w-0 shrink-0 overflow-hidden" style={{ width: 420, borderRight: `1px solid ${BORDER}` }}>
      <div className="flex w-[210px] shrink-0 flex-col overflow-hidden" style={{ borderRight: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          <p className="truncate text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            {label}
          </p>
          <GitBranch className="ml-auto h-3 w-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {state.loading ? (
            <div className="space-y-3 px-3 py-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : state.error ? (
            <div className="px-3 py-4 text-[11px]" style={{ color: "#b91c1c" }}>
              {state.error}
            </div>
          ) : state.commits.length === 0 ? (
            <div className="px-3 py-4 text-[11px]" style={{ color: TEXT_TERTIARY }}>
              조회된 커밋이 없습니다.
            </div>
          ) : (
            state.commits.map((commit) => (
              <CommitRow
                key={commit.commitHash}
                accent={accent}
                commit={commit}
                selected={state.selectedCommitHash === commit.commitHash}
                onClick={() => onSelectCommit(commit.commitHash)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex w-[210px] shrink-0 flex-col overflow-hidden">
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <p className="truncate text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            {selectedDetail?.message ?? "Changed Files"}
          </p>
          <p className="mt-1 truncate text-[9px]" style={{ color: TEXT_TERTIARY }}>
            {formatCommitHeader(selectedDetail)}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {state.loadingCommitHash ? (
            <div className="space-y-3 px-3 py-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="px-3 py-4 text-[11px]" style={{ color: TEXT_TERTIARY }}>
              변경 파일이 없습니다.
            </div>
          ) : (
            files.map((file) => (
              <FileRow
                key={file.path}
                accent={accent}
                file={file}
                selected={state.selectedFilePath === file.path}
                onClick={() => onSelectFile(file.path)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DiffPanel({
  title,
  accent,
  file,
  loading,
  emptyMessage,
}: {
  title: string;
  accent: string;
  file: CommitFile | null;
  loading: boolean;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="flex h-full flex-col bg-[#0d1117]">
        <div className="flex h-9 items-center gap-2 border-b border-white/10 px-4">
          <DarkSkeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3 p-5">
          <DarkSkeleton className="h-4 w-1/3" />
          <DarkSkeleton className="h-4 w-2/3" />
          <DarkSkeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0d1117] text-center">
        <GitCommit className="h-8 w-8" style={{ color: "#30363d" }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: "#c9d1d9" }}>
            {title}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "#8b949e" }}>
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex h-9 items-center gap-2 border-b border-white/10 px-4">
        <span className="text-[10px] font-semibold" style={{ color: accent }}>
          {title}
        </span>
        <ChevronRight className="h-3 w-3" style={{ color: "#8b949e" }} />
        <span className="truncate text-[10px]" style={{ color: "#c9d1d9" }}>
          {file.name}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <FileDiffViewer file={file} />
      </div>
    </div>
  );
}

export function CommitDiffPage({ projectId }: { projectId: number | null }) {
  const [mode, setMode] = useState<RepoMode>("split");
  const [repoStates, setRepoStates] = useState<Record<RepoKey, RepoState>>({
    backend: createInitialRepoState(),
    frontend: createInitialRepoState(),
  });

  const setRepoState = useCallback((repoKey: RepoKey, updater: (state: RepoState) => RepoState) => {
    setRepoStates((current) => ({
      ...current,
      [repoKey]: updater(current[repoKey]),
    }));
  }, []);

  const loadCommitDiff = useCallback(async (
    repoKey: RepoKey,
    commitHash: string,
    filePath: string
  ) => {
    if (!projectId) {
      return;
    }

    const repositoryType = REPO_CONFIG[repoKey].repositoryType;
    const loadingDiffKey = `${commitHash}:${filePath}`;

    setRepoState(repoKey, (state) => ({
      ...state,
      selectedFilePath: filePath,
      loadingDiffKey,
    }));

    try {
      const diffResponse = await fetchProjectCommitFileDiff(projectId, repositoryType, commitHash, filePath);

      setRepoState(repoKey, (state) => {
        const files = state.commitFiles[commitHash] ?? [];
        return {
          ...state,
          selectedFilePath: filePath,
          loadingDiffKey: null,
          commitFiles: {
            ...state.commitFiles,
            [commitHash]: files.map((file) =>
              file.path === filePath ? mergeCommitDiff(file, diffResponse) : file
            ),
          },
        };
      });
    } catch (error) {
      setRepoState(repoKey, (state) => ({
        ...state,
        loadingDiffKey: null,
      }));
      toast.error(formatApiError(error));
    }
  }, [projectId, setRepoState]);

  const loadCommitSelection = useCallback(async (
    repoKey: RepoKey,
    commitHash: string,
    preferredFilePath?: string | null
  ) => {
    if (!projectId) {
      return;
    }

    const repositoryType = REPO_CONFIG[repoKey].repositoryType;

    setRepoState(repoKey, (state) => ({
      ...state,
      selectedCommitHash: commitHash,
      selectedFilePath: null,
      loadingCommitHash: commitHash,
      error: null,
    }));

    try {
      const [detailResponse, filesResponse] = await Promise.all([
        fetchProjectCommitDetail(projectId, repositoryType, commitHash),
        fetchProjectCommitFiles(projectId, repositoryType, commitHash),
      ]);

      const mappedFiles = filesResponse.files.map(mapCommitFile);
      const selectedFilePath =
        preferredFilePath && mappedFiles.some((file) => file.path === preferredFilePath)
          ? preferredFilePath
          : mappedFiles[0]?.path ?? null;

      let nextFiles = mappedFiles;
      if (selectedFilePath) {
        const diffResponse = await fetchProjectCommitFileDiff(projectId, repositoryType, commitHash, selectedFilePath);
        nextFiles = mappedFiles.map((file) =>
          file.path === selectedFilePath ? mergeCommitDiff(file, diffResponse) : file
        );
      }

      setRepoState(repoKey, (state) => ({
        ...state,
        selectedCommitHash: commitHash,
        selectedFilePath,
        loadingCommitHash: null,
        loadingDiffKey: null,
        commitDetails: {
          ...state.commitDetails,
          [commitHash]: detailResponse,
        },
        commitFiles: {
          ...state.commitFiles,
          [commitHash]: nextFiles,
        },
      }));
    } catch (error) {
      setRepoState(repoKey, (state) => ({
        ...state,
        loadingCommitHash: null,
        loadingDiffKey: null,
        error: formatApiError(error),
      }));
      toast.error(formatApiError(error));
    }
  }, [projectId, setRepoState]);

  const loadRepository = useCallback(async (repoKey: RepoKey) => {
    if (!projectId) {
      setRepoState(repoKey, () => createInitialRepoState());
      return;
    }

    const repositoryType = REPO_CONFIG[repoKey].repositoryType;
    setRepoState(repoKey, () => ({
      ...createInitialRepoState(),
      loading: true,
    }));

    try {
      const response = await fetchFilteredProjectCommits(projectId, repositoryType, 15);
      const firstCommitHash = response.commits[0]?.commitHash ?? null;

      setRepoState(repoKey, (state) => ({
        ...state,
        loading: false,
        error: null,
        commits: response.commits,
        selectedCommitHash: firstCommitHash,
        selectedFilePath: null,
      }));

      if (firstCommitHash) {
        await loadCommitSelection(repoKey, firstCommitHash);
      }
    } catch (error) {
      setRepoState(repoKey, () => ({
        ...createInitialRepoState(),
        loading: false,
        error: formatApiError(error),
      }));
    }
  }, [loadCommitSelection, projectId, setRepoState]);

  useEffect(() => {
    void loadRepository("backend");
    void loadRepository("frontend");
  }, [loadRepository]);

  const backendState = repoStates.backend;
  const frontendState = repoStates.frontend;
  const backendDetail = backendState.selectedCommitHash
    ? backendState.commitDetails[backendState.selectedCommitHash] ?? null
    : null;
  const frontendDetail = frontendState.selectedCommitHash
    ? frontendState.commitDetails[frontendState.selectedCommitHash] ?? null
    : null;
  const backendFile = getSelectedFile(backendState);
  const frontendFile = getSelectedFile(frontendState);

  const totalStats = useMemo(() => {
    const allCommits = [...backendState.commits, ...frontendState.commits];
    return {
      commitCount: allCommits.length,
      additions: allCommits.reduce((sum, commit) => sum + commit.additions, 0),
      deletions: allCommits.reduce((sum, commit) => sum + commit.deletions, 0),
    };
  }, [backendState.commits, frontendState.commits]);

  const singleModeFile = mode === "frontend" ? frontendFile : backendFile;
  const singleModeLoading = mode === "frontend"
    ? Boolean(frontendState.loading || frontendState.loadingCommitHash || frontendState.loadingDiffKey)
    : Boolean(backendState.loading || backendState.loadingCommitHash || backendState.loadingDiffKey);
  const canShowContent = Boolean(projectId);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "#ffffff" }} />

      <div
        className="relative z-10 flex h-10 shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,250,250,0.98)" }}
      >
        <GitCommit className="h-3.5 w-3.5" style={{ color: ACCENT }} />
        <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
          Commit History
        </p>

        <div
          className="ml-2 flex items-center gap-1 rounded-lg p-0.5"
          style={{ background: "rgba(0,0,0,0.06)", border: `1px solid ${BORDER}` }}
        >
          {(["backend", "split", "frontend"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className="rounded-md px-2.5 py-1 text-[10px] font-semibold capitalize transition-all"
              style={{
                background: mode === value ? "#ffffff" : "transparent",
                color: mode === value ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: mode === value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {value === "backend" ? "Backend" : value === "frontend" ? "Frontend" : "Split"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: TEXT_TERTIARY }}>
          <span>{totalStats.commitCount} commits</span>
          <span style={{ color: "#10b981" }}>+{totalStats.additions}</span>
          <span style={{ color: "#ef4444" }}>-{totalStats.deletions}</span>
        </div>
      </div>

      {!canShowContent ? (
        <div className="relative z-10 flex flex-1 items-center justify-center" style={{ background: PANEL_BG }}>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
              프로젝트를 먼저 선택해주세요.
            </p>
            <p className="mt-2 text-xs" style={{ color: TEXT_TERTIARY }}>
              커밋 히스토리는 활성 프로젝트를 기준으로 조회됩니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
          <div className="flex shrink-0 overflow-hidden" style={{ borderRight: `1px solid ${BORDER}` }}>
            {(mode === "backend" || mode === "split") && (
              <RepoColumn
                accent={REPO_CONFIG.backend.accent}
                label={REPO_CONFIG.backend.label}
                icon={REPO_CONFIG.backend.icon}
                state={backendState}
                selectedDetail={backendDetail}
                onSelectCommit={(commitHash) => void loadCommitSelection("backend", commitHash)}
                onSelectFile={(filePath) => {
                  if (!backendState.selectedCommitHash) {
                    return;
                  }
                  void loadCommitDiff("backend", backendState.selectedCommitHash, filePath);
                }}
              />
            )}

            {(mode === "frontend" || mode === "split") && (
              <RepoColumn
                accent={REPO_CONFIG.frontend.accent}
                label={REPO_CONFIG.frontend.label}
                icon={REPO_CONFIG.frontend.icon}
                state={frontendState}
                selectedDetail={frontendDetail}
                onSelectCommit={(commitHash) => void loadCommitSelection("frontend", commitHash)}
                onSelectFile={(filePath) => {
                  if (!frontendState.selectedCommitHash) {
                    return;
                  }
                  void loadCommitDiff("frontend", frontendState.selectedCommitHash, filePath);
                }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden bg-[#0d1117]">
            {mode === "split" ? (
              <div className="flex h-full flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <DiffPanel
                    title="Backend Diff"
                    accent={REPO_CONFIG.backend.accent}
                    file={backendFile}
                    loading={Boolean(backendState.loading || backendState.loadingCommitHash || backendState.loadingDiffKey)}
                    emptyMessage="백엔드 파일을 선택하면 Diff가 표시됩니다."
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <DiffPanel
                    title="Frontend Diff"
                    accent={REPO_CONFIG.frontend.accent}
                    file={frontendFile}
                    loading={Boolean(frontendState.loading || frontendState.loadingCommitHash || frontendState.loadingDiffKey)}
                    emptyMessage="프론트엔드 파일을 선택하면 Diff가 표시됩니다."
                  />
                </div>
              </div>
            ) : (
              <DiffPanel
                title={mode === "frontend" ? "Frontend Diff" : "Backend Diff"}
                accent={mode === "frontend" ? REPO_CONFIG.frontend.accent : REPO_CONFIG.backend.accent}
                file={singleModeFile}
                loading={singleModeLoading}
                emptyMessage="파일을 선택하면 Diff가 표시됩니다."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
