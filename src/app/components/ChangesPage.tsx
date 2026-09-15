import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  GitCommit,
  GitBranch,
  Upload,
  CheckCircle2,
  X,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Server,
  Monitor,
} from "lucide-react";
import type { CommitFile } from "./commitData";
import { isSecurityRiskFile } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";
import { BranchVisualization } from "./BranchVisualization";
import { setPendingQA } from "../data/qaStore";
import { AICommitGenerator } from "./AICommitGenerator";
import { ConventionGuardModal } from "./ConventionGuardModal";

import {
  fetchProjectChangedFiles,
  fetchProjectChangedFileDiff,
  stageProjectFiles,
  unstageProjectFiles,
  stageAllProjectFiles,
  unstageAllProjectFiles,
  createProjectCommit,
  loadSession,
  ProjectRepositoryType,
} from "../lib/api";

import {
  BORDER,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_LABEL,
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
  TERM_BG,
  TERM_MUTED,
  TERM_GREEN,
  TERM_DIM,
  UI_RED,
  UI_RED_DARK,
} from "../colors";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

const EXT_COLOR: Record<string, { bg: string; color: string }> = {
  java: { bg: "rgba(192,152,64,0.10)", color: "#C09840" },
  gradle: { bg: "rgba(65,67,27,0.08)", color: ACCENT },
  yml: { bg: "rgba(90,138,74,0.08)", color: "#5A8A4A" },
  yaml: { bg: "rgba(90,138,74,0.08)", color: "#5A8A4A" },
  ts: { bg: "rgba(107,122,80,0.10)", color: "#6B7A50" },
  tsx: { bg: "rgba(174,183,132,0.12)", color: "#7A8B5A" },
  css: { bg: "rgba(184,120,80,0.08)", color: "#B87850" },
  json: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6" },
  env: { bg: "rgba(136,138,98,0.08)", color: "#888A62" },
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  modified: { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" },
  MODIFIED: { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" },
  added: { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" },
  ADDED: { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" },
  deleted: { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" },
  DELETED: { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" },
};


// ── QA 확인 모달 ──
function QAModal({
  show,
  commitMsg,
  onQAYes,
  onQANo,
  onClose,
}: {
  show: boolean;
  commitMsg: string;
  onQAYes: () => void;
  onQANo: () => void;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          width: 360,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/[0.06] transition-colors"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
        </button>
        <div className="p-7 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: ACCENT_BG,
            }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            커밋 전 AI QA를 실행할까요?
          </h3>
          <p className="text-[11px] mb-3" style={{ color: TEXT_SECONDARY }}>
            코드 품질 및 잠재적 버그를 자동으로 검사합니다.
          </p>
          <div
            className="px-3 py-2 rounded-xl text-left font-mono text-[10px] mb-6"
            style={{ background: "rgba(0,0,0,0.04)", color: TEXT_SECONDARY }}
          >
            {commitMsg}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onQANo}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
            >
              아니오, 바로 커밋
            </button>
            <button
              onClick={onQAYes}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{
                background: ACCENT,
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(37,99,235,0.24)",
              }}
            >
              예, AI QA 실행
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 커밋 완료 모달 ──
function CommittedModal({
  show,
  msg,
  onClose,
}: {
  show: boolean;
  msg: string;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.24)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: 340,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <div className="p-7 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/[0.06]"
          >
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.10)" }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: "#10b981" }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            커밋 &amp; 푸시 완료!
          </h3>
          <p className="text-[11px] mb-4" style={{ color: TEXT_SECONDARY }}>
            변경사항이 원격 저장소에 반영되었습니다.
          </p>
          <div
            className="text-left px-3 py-2.5 rounded-xl font-mono text-[10px] mb-5"
            style={{ background: TERM_BG, color: TERM_GREEN }}
          >
            [main a3f9d21] {msg}
            <br />
            <span style={{ color: TERM_MUTED }}>→ remote: origin/main ✓</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 파일 항목 ──
function FileRow({
  file,
  staged,
  selected,
  onToggle,
  onSelect,
}: {
  file: CommitFile;
  staged: boolean;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: () => void;
}) {
  const sec = isSecurityRiskFile(file);
  const ec = sec.isRisk
    ? { bg: "rgba(239,68,68,0.15)", color: UI_RED_DARK }
    : (EXT_COLOR[file.ext] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY });
  const sm = STATUS_META[file.status] ?? {
    color: "#C09840",
    label: "M",
    bg: "rgba(192,152,64,0.10)",
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all ${sec.isRisk ? "group" : ""}`}
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected
          ? (sec.isRisk ? "rgba(239,68,68,0.14)" : "rgba(65,67,27,0.08)")
          : (sec.isRisk ? "rgba(239,68,68,0.05)" : "transparent"),
        borderLeft: selected
          ? (sec.isRisk ? "2.5px solid #EF4444" : "2.5px solid #41431B")
          : (sec.isRisk ? "2.5px solid rgba(239,68,68,0.5)" : "2.5px solid transparent"),
        borderImage: selected && !sec.isRisk ? "linear-gradient(180deg, #41431B, #AEB784) 1" : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = sec.isRisk ? "rgba(239,68,68,0.09)" : "rgba(0,0,0,0.025)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = sec.isRisk ? "rgba(239,68,68,0.05)" : "transparent";
      }}
    >
      {/* 체크박스 */}
      <div
        onClick={onToggle}
        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-all"
        style={{
          background: staged ? (sec.isRisk ? UI_RED_DARK : ACCENT) : "transparent",
          border: `1.5px solid ${staged ? (sec.isRisk ? UI_RED_DARK : ACCENT) : (sec.isRisk ? "rgba(239,68,68,0.6)" : "rgba(0,0,0,0.22)")}`,
        }}
      >
        {staged && (
          <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />
        )}
      </div>

      {/* 확장자 또는 보안 위험 뱃지 */}
      {sec.isRisk ? (
        <span
          className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 animate-pulse"
          style={{ background: "rgba(239,68,68,0.18)", color: UI_RED_DARK, border: "1px solid rgba(239,68,68,0.35)" }}
          title={sec.reason}
        >
          <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
          보안위험
        </span>
      ) : (
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={ec}>
          .{file.ext}
        </span>
      )}

      {/* 파일명 */}
      <span
        className={`flex-1 text-[11px] truncate ${sec.isRisk ? "font-semibold text-red-600 dark:text-red-400" : ""}`}
        style={{ color: sec.isRisk ? UI_RED_DARK : (staged ? TEXT_PRIMARY : TEXT_TERTIARY) }}
        title={`${file.path}${sec.isRisk ? ` [보안위험: ${sec.reason}]` : ""}`}
      >
        {file.name}
      </span>

      {/* +/- */}
      <div className="flex items-center gap-1 shrink-0 text-[9px]">
        {file.additions > 0 && <span style={{ color: "#10b981" }}>+{file.additions}</span>}
        {file.deletions > 0 && <span style={{ color: UI_RED }}>−{file.deletions}</span>}
      </div>

      {/* 상태 */}
      <span
        className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: sm.bg, color: sm.color, opacity: staged ? 1 : 0.45 }}
      >
        {sm.label}
      </span>
    </div>
  );
}

function parseUnifiedDiff(rawDiff: string) {
  if (!rawDiff) return [];
  const lines = rawDiff.split("\n");
  let oldLine = 1;
  let newLine = 1;

  return lines.map((line) => {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      return { type: "hunk" as const, content: line };
    }
    if (line.startsWith("+")) {
      return { type: "added" as const, newNum: newLine++, content: line.slice(1) };
    }
    if (line.startsWith("-")) {
      return { type: "removed" as const, oldNum: oldLine++, content: line.slice(1) };
    }
    return {
      type: "context" as const,
      oldNum: oldLine++,
      newNum: newLine++,
      content: line.startsWith(" ") ? line.slice(1) : line,
    };
  });
}

export function ChangesPage({
  projectId = 0,
  onNavigateQA,
}: {
  projectId?: number | null;
  onNavigateQA?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [repoType, setRepoType] = useState<ProjectRepositoryType>("BACKEND");
  const [currentBranch, setCurrentBranch] = useState<string>("main");

  // 변경된 파일 목록 & 캐시
  const [changedFiles, setChangedFiles] = useState<CommitFile[]>([]);
  const [staged, setStaged] = useState<Set<string>>(() => new Set());
  const [selectedFile, setSelectedFile] = useState<CommitFile | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [message, setMessage] = useState("");
  const [showQA, setShowQA] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);

  // 브랜치 시각화 모드
  const [showBranch, setShowBranch] = useState(false);
  // 컨벤션 가드
  const [showConvention, setShowConvention] = useState(false);

  // 🌟 실제 Git 변경 파일 목록 조회
  const loadCommitData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);

    if (!projectId) {
      setChangedFiles([]);
      setStaged(new Set());
      setSelectedFile(null);
      setIsLoading(false);
      return;
    }

    try {
      // 1. 실제 백엔드 Git 변경 파일 목록 조회 (/changes/files)
      const changeRes = await fetchProjectChangedFiles(projectId);

      if (!changeRes || !Array.isArray(changeRes.files)) {
        throw new Error("변경된 파일 목록 응답이 비정상입니다.");
      }

      setCurrentBranch(changeRes.branchName || "main");

      if (changeRes.files.length === 0) {
        // Working tree가 깨끗한 경우
        setChangedFiles([]);
        setStaged(new Set());
        setSelectedFile(null);
        setIsLoading(false);
        return;
      }

      const mappedFiles: CommitFile[] = changeRes.files.map((f) => ({
        id: f.filePath,
        name: f.fileName,
        path: f.filePath,
        ext: f.extension || (f.fileName.includes(".") ? f.fileName.split(".").pop() ?? "" : ""),
        status: (f.changeType || "MODIFIED").toLowerCase() as any,
        additions: 0,
        deletions: 0,
        diff: [],
      }));

      const stagedSet = new Set(changeRes.files.filter((f) => f.staged).map((f) => f.filePath));
      setChangedFiles(mappedFiles);
      setStaged(stagedSet);

      // 첫 번째 파일의 diff 비동기 조회 (부가 정보라 실패해도 파일 목록 자체는 유지한다)
      if (mappedFiles[0]) {
        const isFirstStaged = stagedSet.has(mappedFiles[0].id);
        try {
          const diffRes = await fetchProjectChangedFileDiff(projectId, mappedFiles[0].path, isFirstStaged);
          if (diffRes && diffRes.diffContent) {
            mappedFiles[0].diff = parseUnifiedDiff(diffRes.diffContent);
            mappedFiles[0].additions = Number(diffRes.additions) || 0;
            mappedFiles[0].deletions = Number(diffRes.deletions) || 0;
          }
        } catch (diffError) {
          console.error("첫 파일의 diff 조회에 실패했습니다:", diffError);
        }
        setSelectedFile(mappedFiles[0]);
      }
      setIsLoading(false);
    } catch (e) {
      console.error("실제 Git 변경 파일 조회에 실패했습니다:", e);
      toast.error("변경된 파일 목록을 불러오지 못했습니다.");
      setChangedFiles([]);
      setStaged(new Set());
      setSelectedFile(null);
      setLoadError(true);
      setIsLoading(false);
    }
  }, [projectId, repoType]);

  useEffect(() => {
    void loadCommitData();
  }, [loadCommitData]);

  // 파일 선택 시 diff 로드
  const handleSelectFile = async (file: CommitFile) => {
    setSelectedFile(file);
    if (!projectId || (file.diff && file.diff.length > 0)) {
      return;
    }
    try {
      const isFileStaged = staged.has(file.id);
      const diffRes = await fetchProjectChangedFileDiff(projectId, file.path, isFileStaged);
      if (diffRes && diffRes.diffContent) {
        const parsed = parseUnifiedDiff(diffRes.diffContent);
        const updated = {
          ...file,
          diff: parsed,
          additions: Number(diffRes.additions) || 0,
          deletions: Number(diffRes.deletions) || 0,
        };
        setSelectedFile(updated);
        setChangedFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      }
    } catch (err) {
      console.error("파일 Diff 조회에 실패했습니다:", err);
      toast.error("파일 변경 내용을 불러오지 못했습니다.");
    }
  };

  const stagedFiles = changedFiles.filter((f) => staged.has(f.id));
  const unstagedFiles = changedFiles.filter((f) => !staged.has(f.id));
  const stagedCount = staged.size;

  const toggleStage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isCurrentlyStaged = staged.has(id);

    if (projectId) {
      try {
        if (isCurrentlyStaged) {
          await unstageProjectFiles(projectId, [id]);
        } else {
          await stageProjectFiles(projectId, [id]);
        }
      } catch (err: any) {
        toast.error(err?.message || "스테이징 상태 변경에 실패했습니다.");
        return;
      }
    }

    setStaged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stageAll = async () => {
    if (projectId) {
      try {
        await stageAllProjectFiles(projectId);
      } catch (err: any) {
        toast.error(err?.message || "전체 스테이징에 실패했습니다.");
        return;
      }
    }
    setStaged(new Set(changedFiles.map((f) => f.id)));
  };

  const unstageAll = async () => {
    if (projectId) {
      try {
        await unstageAllProjectFiles(projectId);
      } catch (err: any) {
        toast.error(err?.message || "전체 언스테이징에 실패했습니다.");
        return;
      }
    }
    setStaged(new Set());
  };

  const handleCommitClick = () => {
    if (!stagedCount || !message.trim()) return;
    setShowConvention(true);
  };

  const handleConventionIgnore = () => {
    setShowConvention(false);
    setShowQA(true);
  };

  const handleConventionFix = () => {
    setShowConvention(false);
  };

  const handleQAYes = () => {
    setShowQA(false);
    const session = loadSession();
    const currentUserName = session?.username || "Developer";

    setPendingQA({
      message: message.trim(),
      author: currentUserName,
      branch: currentBranch,
      files: stagedFiles.map((f) => f.name),
      hash: "PENDING",
      time: new Date().toISOString(),
      diffFiles: stagedFiles,
    });
    onNavigateQA?.();
  };

  const doCommit = async () => {
    const msg = message.trim();
    if (!msg) return;

    if (projectId) {
      setIsCommitting(true);
      try {
        const commitRes = await createProjectCommit(projectId, msg);
        const shortHash = commitRes.shortCommitHash || commitRes.commitHash.slice(0, 7);
        setHistory((prev) => [`[${new Date().toLocaleTimeString()}] ${shortHash} - ${msg}`, ...prev.slice(0, 4)]);
        setDoneMsg(`[${shortHash}] ${msg}`);
        setMessage("");
        setStaged(new Set());
        setSelectedFile(null);
        setShowQA(false);
        setShowDone(true);
        toast.success(`커밋이 성공적으로 생성되었습니다 (${shortHash})`);
        void loadCommitData();
        return;
      } catch (err: any) {
        toast.error(err?.message || "커밋 생성에 실패했습니다.");
      } finally {
        setIsCommitting(false);
      }
    } else {
      // 로컬 Mock 모드
      setHistory((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
      setDoneMsg(msg);
      setMessage("");
      setStaged(new Set());
      setSelectedFile(null);
      setShowQA(false);
      setShowDone(true);
    }
  };

  const totalAdd = changedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDel = changedFiles.reduce((s, f) => s + f.deletions, 0);

  return (
    <>
      <QAModal
        show={showQA}
        commitMsg={message.trim()}
        onQAYes={handleQAYes}
        onQANo={doCommit}
        onClose={() => setShowQA(false)}
      />
      <CommittedModal show={showDone} msg={doneMsg} onClose={() => setShowDone(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── 타이틀바 ── */}
        <div
          className="flex items-center gap-3 px-5 h-11 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(251,252,250,0.98)" }}
        >
          <GitCommit className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
            Changes
          </p>

          {/* 레포지토리 선택 (WE-AI-Project Server / Client) */}
          <div className="ml-2 flex items-center bg-black/5 rounded-lg p-0.5 border border-black/5">
            <button
              onClick={() => setRepoType("BACKEND")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all"
              style={{
                background: repoType === "BACKEND" ? "#ffffff" : "transparent",
                color: repoType === "BACKEND" ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: repoType === "BACKEND" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Server className="w-3 h-3" style={{ color: "#62683A" }} />
              Backend (we-ai-server)
            </button>
            <button
              onClick={() => setRepoType("FRONTEND")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all"
              style={{
                background: repoType === "FRONTEND" ? "#ffffff" : "transparent",
                color: repoType === "FRONTEND" ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: repoType === "FRONTEND" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Monitor className="w-3 h-3" style={{ color: "#0284c7" }} />
              Frontend (we-ai-client)
            </button>
          </div>

          <span className="text-[10px] ml-1" style={{ color: TEXT_TERTIARY }}>
            {changedFiles.length} files changed
          </span>
          <span className="text-[10px]" style={{ color: "#10b981" }}>
            +{totalAdd}
          </span>
          <span className="text-[10px]" style={{ color: UI_RED }}>
            −{totalDel}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowBranch((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: showBranch ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.05)",
                color: showBranch ? ACCENT : TEXT_SECONDARY,
                border: `1px solid ${showBranch ? ACCENT : BORDER}`,
              }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              {showBranch ? "변경 파일 목록" : "브랜치 시각화"}
            </button>
          </div>
        </div>

        {/* ── 본문 영역 ── */}
        {showBranch ? (
          <div className="flex-1 flex overflow-hidden">
            <BranchVisualization />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* ── 왼쪽: 파일 트리 + 커밋 패널 ── */}
            <div
              className="w-72 shrink-0 flex flex-col overflow-hidden"
              style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(250,250,248,0.95)" }}
            >
              <div className="flex-1 overflow-y-auto">
                {/* Staged 섹션 */}
                <div className="pt-2">
                  <button
                    onClick={() => setStagedOpen((o) => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-black/[0.03]"
                  >
                    {stagedOpen ? (
                      <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    ) : (
                      <ChevronRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                      Staged Changes
                    </span>
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                      style={{ background: "rgba(65,67,27,0.12)", color: ACCENT }}
                    >
                      {stagedFiles.length}
                    </span>
                    {stagedFiles.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          unstageAll();
                        }}
                        className="text-[9px] hover:underline cursor-pointer ml-1"
                        style={{ color: TEXT_TERTIARY }}
                      >
                        Unstage All
                      </span>
                    )}
                  </button>

                  {stagedOpen && isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="w-6 h-3 rounded" />
                        <Skeleton className="flex-1 h-3" />
                      </div>
                    ))
                  ) : stagedOpen && stagedFiles.length > 0 ? (
                    stagedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged={true}
                        selected={selectedFile?.id === file.id}
                        onToggle={(e) => toggleStage(e, file.id)}
                        onSelect={() => void handleSelectFile(file)}
                      />
                    ))
                  ) : stagedOpen && stagedFiles.length === 0 ? (
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px]" style={{ color: loadError ? "#B85450" : TEXT_TERTIARY }}>
                        {loadError ? "변경된 파일을 불러오지 못했습니다" : "스테이징된 파일 없음"}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Changes (Unstaged) 섹션 */}
                <div className="pt-2">
                  <button
                    onClick={() => setUnstagedOpen((o) => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-black/[0.03]"
                  >
                    {unstagedOpen ? (
                      <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    ) : (
                      <ChevronRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
                      Changes (Unstaged)
                    </span>
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                      style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                    >
                      {unstagedFiles.length}
                    </span>
                    {unstagedFiles.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          stageAll();
                        }}
                        className="text-[9px] hover:underline cursor-pointer ml-1"
                        style={{ color: TEXT_TERTIARY }}
                      >
                        Stage All
                      </span>
                    )}
                  </button>

                  {unstagedOpen && isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="w-6 h-3 rounded" />
                        <Skeleton className="flex-1 h-3" />
                      </div>
                    ))
                  ) : unstagedOpen && unstagedFiles.length > 0 ? (
                    unstagedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged={false}
                        selected={selectedFile?.id === file.id}
                        onToggle={(e) => toggleStage(e, file.id)}
                        onSelect={() => void handleSelectFile(file)}
                      />
                    ))
                  ) : unstagedOpen && unstagedFiles.length === 0 ? (
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px]" style={{ color: loadError ? "#B85450" : TEXT_TERTIARY }}>
                        {loadError ? "변경된 파일을 불러오지 못했습니다" : "모든 파일이 스테이징됨"}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* 커밋 히스토리 (최근 5개) */}
                {history.length > 0 && (
                  <div className="p-3 border-t border-black/5">
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_TERTIARY }}>
                      Recent Local Commits
                    </p>
                    <div className="space-y-1.5">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                          <p className="text-[9px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                            {h}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 커밋 작성 & 푸시 패널 ── */}
              <div className="shrink-0 p-3 space-y-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                {isLoading ? (
                  <div className="space-y-2.5">
                    <Skeleton className="h-6 w-1/2 rounded-full" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: ACCENT_BG }}
                      >
                        <span className="text-[8px] font-bold" style={{ color: ACCENT }}>
                          {(loadSession()?.username || "D").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                        {loadSession()?.username || "Developer"}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <GitBranch className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>
                          {currentBranch}
                        </span>
                      </div>
                    </div>

                    {/* ── AI 커밋 메시지 자동 생성기 ── */}
                    <AICommitGenerator
                      projectId={projectId ?? 0}
                      stagedFiles={stagedFiles}
                      onApply={(msg) => setMessage(msg)}
                    />

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="커밋 메시지를 입력하세요 (필수)"
                      rows={3}
                      className="w-full px-3 py-2 text-[11px] rounded-xl outline-none resize-none transition-all"
                      style={{
                        background: "#FFFFFF",
                        border: `1px solid ${message.trim() ? ACCENT_BORDER : BORDER}`,
                        color: TEXT_PRIMARY,
                        lineHeight: "1.5",
                      }}
                    />

                    <div className="flex items-center gap-1 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <FileCode2 className="w-3 h-3 shrink-0" />
                      <span>
                        {stagedCount} file{stagedCount !== 1 ? "s" : ""} staged
                      </span>
                      <span className="ml-auto" style={{ color: "#10b981" }}>
                        +{stagedFiles.reduce((s, f) => s + f.additions, 0)}
                      </span>
                      <span style={{ color: UI_RED }}>
                        −{stagedFiles.reduce((s, f) => s + f.deletions, 0)}
                      </span>
                    </div>

                    {/* ── 보안 경고 알림 ── */}
                    {stagedFiles.some((f) => isSecurityRiskFile(f).isRisk) && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-[10px] text-red-600 dark:text-red-400">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500 animate-pulse" />
                        <span className="leading-tight">
                          <strong>보안 주의:</strong> 환경 변수(.env) 또는 비밀 키가 스테이징에 포함되어 있습니다. 커밋 전 제외(.synaipseignore)를 권장합니다.
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleCommitClick}
                      disabled={!stagedCount || !message.trim() || isCommitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                      style={{
                        background:
                          stagedCount > 0 && message.trim() && !isCommitting
                            ? ACCENT
                            : "rgba(0,0,0,0.07)",
                        color: stagedCount > 0 && message.trim() && !isCommitting ? "#FFFFFF" : TEXT_TERTIARY,
                        boxShadow:
                          stagedCount > 0 && message.trim() && !isCommitting ? "0 4px 16px rgba(37,99,235,0.24)" : "none",
                        cursor: stagedCount > 0 && message.trim() && !isCommitting ? "pointer" : "not-allowed",
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isCommitting ? "커밋 생성 중..." : `Commit & Push to ${currentBranch}`}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── 오른쪽: Diff Viewer ── */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: TERM_BG }}>
              {isLoading ? (
                <div className="flex-1 p-6 space-y-4">
                  <Skeleton className="h-6 w-1/3 bg-white/10" />
                  <Skeleton className="h-4 w-1/4 bg-white/5" />
                  <div className="mt-8 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                    <Skeleton className="h-4 w-5/6 bg-white/5" />
                  </div>
                </div>
              ) : selectedFile ? (
                <FileDiffViewer file={selectedFile} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <GitCommit className="w-8 h-8" style={{ color: "#30363d" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold mb-1" style={{ color: TERM_DIM }}>
                      파일을 선택하세요
                    </p>
                    <p className="text-[11px]" style={{ color: "#484f58" }}>
                      왼쪽 목록에서 파일을 클릭하면 변경 내용이 표시됩니다
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 컨벤션 가드 모달 ── */}
      {showConvention && (
        <ConventionGuardModal
          projectId={projectId ?? 0}
          stagedFiles={stagedFiles.map((f) => ({ name: f.name, path: f.path }))}
          userName={loadSession()?.username}
          onIgnore={handleConventionIgnore}
          onFix={handleConventionFix}
          onClose={() => setShowConvention(false)}
        />
      )}
    </>
  );
}