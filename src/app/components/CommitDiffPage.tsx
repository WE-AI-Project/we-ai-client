import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  Columns2,
  Database,
  FolderCode,
  GitBranch,
  GitCommit,
  Layers,
  Monitor,
  Palette,
  Server,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { CommitFile, DiffLine } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";
import {
  fetchFilteredProjectCommits,
  fetchProjectCommitDetail,
  fetchProjectCommitFileDiff,
  fetchProjectCommitFiles,
  fetchProjectDepartmentStatus,
  formatApiError,
  type ProjectCommitChangedFile,
  type ProjectCommitDetail,
  type ProjectCommitFileDiff,
  type ProjectCommitSummary,
  type ProjectDepartment,
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

export type PartConfig = {
  key: string;
  department?: ProjectDepartment;
  repositoryType: ProjectRepositoryType;
  label: string;
  shortLabel: string;
  accent: string;
  bgAccent: string;
  icon: typeof Server;
};

const PANEL_BG = CREAM;

const KNOWN_PART_CONFIGS: Record<string, PartConfig> = {
  BACKEND: {
    key: "BACKEND",
    department: "BACKEND",
    repositoryType: "BACKEND",
    label: "Backend (Java/Spring)",
    shortLabel: "Backend",
    accent: "#62683A",
    bgAccent: "rgba(98,104,58,0.12)",
    icon: Server,
  },
  FRONTEND: {
    key: "FRONTEND",
    department: "FRONTEND",
    repositoryType: "FRONTEND",
    label: "Frontend (React/TS)",
    shortLabel: "Frontend",
    accent: "#0284c7",
    bgAccent: "rgba(2,132,199,0.12)",
    icon: Monitor,
  },
  AI: {
    key: "AI",
    department: "AI",
    repositoryType: "BACKEND",
    label: "AI (Python/Agents)",
    shortLabel: "AI & Agents",
    accent: "#8b5cf6",
    bgAccent: "rgba(139,92,246,0.12)",
    icon: Bot,
  },
  DEVOPS: {
    key: "DEVOPS",
    department: "DEVOPS",
    repositoryType: "BACKEND",
    label: "DevOps & Infra (Docker/CI)",
    shortLabel: "DevOps",
    accent: "#f59e0b",
    bgAccent: "rgba(245,158,11,0.12)",
    icon: Layers,
  },
  DATABASE: {
    key: "DATABASE",
    department: "DATABASE",
    repositoryType: "BACKEND",
    label: "Database (MySQL/Redis)",
    shortLabel: "Database",
    accent: "#10b981",
    bgAccent: "rgba(16,185,129,0.12)",
    icon: Database,
  },
  QA: {
    key: "QA",
    department: "QA",
    repositoryType: "FRONTEND",
    label: "QA & Testing",
    shortLabel: "QA",
    accent: "#ec4899",
    bgAccent: "rgba(236,72,153,0.12)",
    icon: ShieldCheck,
  },
  DESIGN: {
    key: "DESIGN",
    department: "DESIGN",
    repositoryType: "FRONTEND",
    label: "Design (UI/UX)",
    shortLabel: "Design",
    accent: "#a855f7",
    bgAccent: "rgba(168,85,247,0.12)",
    icon: Palette,
  },
  PM: {
    key: "PM",
    department: "PM",
    repositoryType: "BACKEND",
    label: "PM & Planning",
    shortLabel: "PM",
    accent: "#6366f1",
    bgAccent: "rgba(99,102,241,0.12)",
    icon: Users,
  },
};

function getPartConfig(partKey: string): PartConfig {
  const upperKey = partKey.toUpperCase();
  if (KNOWN_PART_CONFIGS[upperKey]) {
    return KNOWN_PART_CONFIGS[upperKey];
  }

  const isFront = upperKey.includes("FRONT") || upperKey.includes("DESIGN") || upperKey.includes("QA") || upperKey.includes("CLIENT");
  return {
    key: partKey,
    repositoryType: isFront ? "FRONTEND" : "BACKEND",
    label: partKey,
    shortLabel: partKey,
    accent: "#62683A",
    bgAccent: "rgba(98,104,58,0.12)",
    icon: isFront ? Monitor : Server,
  };
}

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

function getSelectedFile(state?: RepoState | null): CommitFile | null {
  if (!state || !state.selectedCommitHash || !state.selectedFilePath) {
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
  shortLabel,
  icon: Icon,
  state,
  selectedDetail,
  onSelectCommit,
  onSelectFile,
  isSplit,
}: {
  accent: string;
  label: string;
  shortLabel?: string;
  icon: typeof Server;
  state: RepoState;
  selectedDetail: ProjectCommitDetail | null;
  onSelectCommit: (commitHash: string) => void;
  onSelectFile: (filePath: string) => void;
  isSplit?: boolean;
}) {
  const files = state.selectedCommitHash ? state.commitFiles[state.selectedCommitHash] ?? [] : [];

  return (
    <div
      className="flex min-w-0 shrink-0 overflow-hidden"
      style={{
        width: isSplit ? "100%" : 420,
        minWidth: isSplit ? 340 : 420,
        flex: isSplit ? "1 1 0" : "none",
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      {/* 1. 커밋 목록 컬럼 */}
      <div className="flex w-1/2 shrink-0 flex-col overflow-hidden" style={{ borderRight: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          <p className="truncate text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }} title={label}>
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

      {/* 2. 변경 파일 목록 컬럼 */}
      <div className="flex w-1/2 shrink-0 flex-col overflow-hidden">
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
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0d1117] text-center p-4">
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
      <div className="flex h-9 items-center gap-2 border-b border-white/10 px-4 shrink-0">
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
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [activeParts, setActiveParts] = useState<string[]>(["BACKEND", "FRONTEND"]);
  const [selectedPart, setSelectedPart] = useState<string>("BACKEND");
  const [repoStates, setRepoStates] = useState<Record<string, RepoState>>({
    BACKEND: createInitialRepoState(),
    FRONTEND: createInitialRepoState(),
  });

  const setRepoState = useCallback((partKey: string, updater: (state: RepoState) => RepoState) => {
    setRepoStates((current) => ({
      ...current,
      [partKey]: updater(current[partKey] ?? createInitialRepoState()),
    }));
  }, []);

  const loadCommitDiff = useCallback(async (
    partKey: string,
    commitHash: string,
    filePath: string
  ) => {
    if (!projectId) {
      return;
    }

    const config = getPartConfig(partKey);
    const repositoryType = config.repositoryType;
    const loadingDiffKey = `${commitHash}:${filePath}`;

    setRepoState(partKey, (state) => ({
      ...state,
      selectedFilePath: filePath,
      loadingDiffKey,
    }));

    try {
      const diffResponse = await fetchProjectCommitFileDiff(projectId, repositoryType, commitHash, filePath);

      setRepoState(partKey, (state) => {
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
      setRepoState(partKey, (state) => ({
        ...state,
        loadingDiffKey: null,
      }));
      toast.error(formatApiError(error));
    }
  }, [projectId, setRepoState]);

  const loadCommitSelection = useCallback(async (
    partKey: string,
    commitHash: string,
    preferredFilePath?: string | null
  ) => {
    if (!projectId) {
      return;
    }

    const config = getPartConfig(partKey);
    const repositoryType = config.repositoryType;

    setRepoState(partKey, (state) => ({
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

      setRepoState(partKey, (state) => ({
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
      setRepoState(partKey, (state) => ({
        ...state,
        loadingCommitHash: null,
        loadingDiffKey: null,
        error: formatApiError(error),
      }));
      toast.error(formatApiError(error));
    }
  }, [projectId, setRepoState]);

  const loadRepository = useCallback(async (partKey: string) => {
    if (!projectId) {
      setRepoState(partKey, () => createInitialRepoState());
      return;
    }

    const config = getPartConfig(partKey);
    const repositoryType = config.repositoryType;
    setRepoState(partKey, () => ({
      ...createInitialRepoState(),
      loading: true,
    }));

    try {
      const response = await fetchFilteredProjectCommits(projectId, repositoryType, 15);
      const firstCommitHash = response.commits[0]?.commitHash ?? null;

      setRepoState(partKey, (state) => ({
        ...state,
        loading: false,
        error: null,
        commits: response.commits,
        selectedCommitHash: firstCommitHash,
        selectedFilePath: null,
      }));

      if (firstCommitHash) {
        await loadCommitSelection(partKey, firstCommitHash);
      }
    } catch (error) {
      setRepoState(partKey, () => ({
        ...createInitialRepoState(),
        loading: false,
        error: formatApiError(error),
      }));
    }
  }, [loadCommitSelection, projectId, setRepoState]);

  // 프로젝트 부서(파트) 목록 자동 감지 및 로딩
  useEffect(() => {
    if (!projectId) {
      setActiveParts(["BACKEND", "FRONTEND"]);
      return;
    }

    let isSubscribed = true;

    async function detectProjectParts() {
      try {
        const deptRes = await fetchProjectDepartmentStatus(projectId!);
        if (!isSubscribed) return;

        if (deptRes && deptRes.departments && deptRes.departments.length > 0) {
          const depts = deptRes.departments.map((d) => d.department);
          const distinctDepts = Array.from(new Set(depts));
          if (distinctDepts.length > 0) {
            setActiveParts(distinctDepts);
            setSelectedPart(distinctDepts[0]);
            return;
          }
        }
      } catch (err) {
        // Fallback default parts
      }

      if (isSubscribed) {
        setActiveParts(["BACKEND", "FRONTEND"]);
        setSelectedPart("BACKEND");
      }
    }

    void detectProjectParts();

    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  // 활성 파트들의 커밋 데이터 로드
  useEffect(() => {
    activeParts.forEach((partKey) => {
      void loadRepository(partKey);
    });
  }, [activeParts, loadRepository]);

  // 전체 커밋 통계 계산
  const totalStats = useMemo(() => {
    let commitCount = 0;
    let additions = 0;
    let deletions = 0;

    Object.values(repoStates).forEach((state) => {
      if (state && state.commits) {
        commitCount += state.commits.length;
        state.commits.forEach((c) => {
          additions += c.additions;
          deletions += c.deletions;
        });
      }
    });

    return { commitCount, additions, deletions };
  }, [repoStates]);

  const canShowContent = Boolean(projectId);

  // 단일 모드일 때 선택된 파트의 상태
  const currentSingleState = repoStates[selectedPart] ?? createInitialRepoState();
  const currentSingleConfig = getPartConfig(selectedPart);
  const currentSingleDetail = currentSingleState.selectedCommitHash
    ? currentSingleState.commitDetails[currentSingleState.selectedCommitHash] ?? null
    : null;
  const currentSingleFile = getSelectedFile(currentSingleState);
  const currentSingleLoading = Boolean(
    currentSingleState.loading ||
    currentSingleState.loadingCommitHash ||
    currentSingleState.loadingDiffKey
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "#ffffff" }} />

      {/* 상단 툴바 */}
      <div
        className="relative z-10 flex h-10 shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,250,250,0.98)" }}
      >
        <GitCommit className="h-3.5 w-3.5" style={{ color: ACCENT }} />
        <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
          Commit History
        </p>

        {/* 파트 수 표시 뱃지 */}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
        >
          {activeParts.length} Parts
        </span>

        {/* 1. 단일 모드일 때: 파트 선택 탭들 */}
        {!isSplit && (
          <div
            className="ml-2 flex items-center gap-1 rounded-lg p-0.5 overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.06)", border: `1px solid ${BORDER}` }}
          >
            {activeParts.map((partKey) => {
              const cfg = getPartConfig(partKey);
              const Icon = cfg.icon;
              const isSelected = selectedPart === partKey;
              return (
                <button
                  key={partKey}
                  type="button"
                  onClick={() => setSelectedPart(partKey)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: isSelected ? "#ffffff" : "transparent",
                    color: isSelected ? TEXT_PRIMARY : TEXT_TERTIARY,
                    boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Icon className="w-3 h-3" style={{ color: isSelected ? cfg.accent : TEXT_TERTIARY }} />
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. 스플릿 모드일 때: 활성화된 파트 목록 태그들 */}
        {isSplit && (
          <div className="ml-2 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_TERTIARY }}>
              전체 분배:
            </span>
            {activeParts.map((partKey) => {
              const cfg = getPartConfig(partKey);
              const Icon = cfg.icon;
              return (
                <span
                  key={partKey}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
                  style={{
                    background: cfg.bgAccent,
                    color: cfg.accent,
                    border: `1px solid ${cfg.accent}30`,
                  }}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {cfg.shortLabel}
                </span>
              );
            })}
          </div>
        )}

        {/* 스플릿 뷰 켜기/끄기 토글 버튼 */}
        <button
          type="button"
          onClick={() => setIsSplit((prev) => !prev)}
          className="ml-auto flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
          style={{
            background: isSplit ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isSplit ? ACCENT : BORDER}`,
            color: isSplit ? ACCENT : TEXT_SECONDARY,
          }}
          title={isSplit ? "스플릿 뷰 끄기 (단일 파트 선택 보기)" : "스플릿 뷰 켜기 (프로젝트 파트 수 분배 보기)"}
        >
          <Columns2 className="w-3.5 h-3.5" style={{ color: isSplit ? ACCENT : TEXT_SECONDARY }} />
          <span>Split View</span>
          <div
            className="w-6 h-3.5 rounded-full transition-colors relative flex items-center px-0.5"
            style={{ background: isSplit ? ACCENT : "rgba(0,0,0,0.18)" }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full bg-white transition-transform shadow-xs"
              style={{ transform: isSplit ? "translateX(10px)" : "translateX(0px)" }}
            />
          </div>
        </button>

        {/* 커밋 통계 */}
        <div className="flex items-center gap-2.5 text-[10px] border-l pl-3" style={{ borderColor: BORDER, color: TEXT_TERTIARY }}>
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
          {/* ─────────────────────────────────────────────
              커밋 & 파일 목록 컬럼 영역 (좌측/중앙)
              - 단일 뷰: 선택된 1개 파트 컬럼 (420px)
              - 스플릿 뷰: 프로젝트의 모든 활성 파트들이 균등하게 분배됨 (flex: 1)
             ───────────────────────────────────────────── */}
          <div
            className="flex shrink-0 overflow-x-auto overflow-y-hidden"
            style={{
              width: isSplit ? `${Math.min(100, activeParts.length * 420)}px` : "420px",
              maxWidth: isSplit ? "75%" : "420px",
              borderRight: `1px solid ${BORDER}`,
            }}
          >
            {isSplit ? (
              // 스플릿 모드: 모든 활성 파트를 나란히 분배하여 렌더링
              activeParts.map((partKey) => {
                const cfg = getPartConfig(partKey);
                const state = repoStates[partKey] ?? createInitialRepoState();
                const detail = state.selectedCommitHash
                  ? state.commitDetails[state.selectedCommitHash] ?? null
                  : null;

                return (
                  <RepoColumn
                    key={partKey}
                    accent={cfg.accent}
                    label={cfg.label}
                    shortLabel={cfg.shortLabel}
                    icon={cfg.icon}
                    state={state}
                    selectedDetail={detail}
                    onSelectCommit={(commitHash) => void loadCommitSelection(partKey, commitHash)}
                    onSelectFile={(filePath) => {
                      if (!state.selectedCommitHash) return;
                      void loadCommitDiff(partKey, state.selectedCommitHash, filePath);
                    }}
                    isSplit={true}
                  />
                );
              })
            ) : (
              // 단일 모드: 현재 선택된 파트 1개만 렌더링
              <RepoColumn
                accent={currentSingleConfig.accent}
                label={currentSingleConfig.label}
                shortLabel={currentSingleConfig.shortLabel}
                icon={currentSingleConfig.icon}
                state={currentSingleState}
                selectedDetail={currentSingleDetail}
                onSelectCommit={(commitHash) => void loadCommitSelection(selectedPart, commitHash)}
                onSelectFile={(filePath) => {
                  if (!currentSingleState.selectedCommitHash) return;
                  void loadCommitDiff(selectedPart, currentSingleState.selectedCommitHash, filePath);
                }}
                isSplit={false}
              />
            )}
          </div>

          {/* ─────────────────────────────────────────────
              Diff 뷰어 영역 (우측)
              - 단일 뷰: 선택된 파트의 전체 Diff 패널
              - 스플릿 뷰: 각 파트별 Diff 패널들이 세로/가로로 분배 분할됨
             ───────────────────────────────────────────── */}
          <div className="min-w-0 flex-1 overflow-hidden bg-[#0d1117]">
            {isSplit ? (
              <div className="flex h-full flex-col overflow-y-auto">
                {activeParts.map((partKey, index) => {
                  const cfg = getPartConfig(partKey);
                  const state = repoStates[partKey] ?? createInitialRepoState();
                  const file = getSelectedFile(state);
                  const loading = Boolean(state.loading || state.loadingCommitHash || state.loadingDiffKey);

                  return (
                    <div
                      key={partKey}
                      className="min-h-[220px] flex-1 overflow-hidden"
                      style={{
                        borderBottom: index < activeParts.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      <DiffPanel
                        title={`${cfg.shortLabel} Diff`}
                        accent={cfg.accent}
                        file={file}
                        loading={loading}
                        emptyMessage={`${cfg.shortLabel} 파일을 선택하면 Diff가 표시됩니다.`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <DiffPanel
                title={`${currentSingleConfig.shortLabel} Diff`}
                accent={currentSingleConfig.accent}
                file={currentSingleFile}
                loading={currentSingleLoading}
                emptyMessage="파일을 선택하면 Diff가 표시됩니다."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
