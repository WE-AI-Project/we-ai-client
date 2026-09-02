import { useState, useEffect, useMemo, useCallback } from "react";
import {
  GitCommit, GitBranch, Upload, CheckCircle2, X,
  ShieldCheck, Plus, RotateCcw,
  ChevronDown, ChevronRight, FileCode2, GitMerge, Loader2
} from "lucide-react";
import { CHANGE_FILES, type CommitFile } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";
import { BranchVisualization } from "./BranchVisualization";
import { setPendingQA } from "../data/qaStore";
import { AICommitGenerator } from "./AICommitGenerator";

// 🌟 API 연동을 위한 함수 및 타입 임포트
import { 
  fetchProjectCommits, 
  fetchProjectCommitFiles, 
  fetchProjectCommitFileDiff,
  fetchCurrentUser,
  loadSession,
  ProjectCommitSummary,
  ProjectCommitChangedFile,
  ProjectRepositoryType
} from "../lib/api";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, GRADIENT_PAGE, GRADIENT_ORB_1,
} from "../colors";
import { ConventionGuardModal } from "./ConventionGuardModal";

// ── 🚨 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

// ── 디자인 토큰 ──
const EXT_COLOR: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(192,152,64,0.10)",  color: "#C09840" },
  gradle: { bg: "rgba(65,67,27,0.08)",    color: ACCENT    },
  yml:    { bg: "rgba(90,138,74,0.08)",   color: "#5A8A4A" },
  ts:     { bg: "rgba(107,122,80,0.10)",  color: "#6B7A50" },
  tsx:    { bg: "rgba(174,183,132,0.12)", color: "#7A8B5A" },
  css:    { bg: "rgba(184,120,80,0.08)",  color: "#B87850" },
  env:    { bg: "rgba(136,138,98,0.08)",  color: "#888A62" },
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  MODIFIED: { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)"  },
  ADDED:    { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)"   },
  DELETED:  { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)"   },
};

// API의 ProjectCommitChangedFile 타입을 UI에 맞게 래핑하기 위한 내부 타입
type UICommitFile = ProjectCommitChangedFile & {
  id: string; // UI 키용 임시 ID (경로를 암호화하거나 그대로 사용)
};

// ── QA 확인 모달 ──
function QAModal({
  show, commitMsg, onQAYes, onQANo, onClose,
}: {
  show: boolean; commitMsg: string;
  onQAYes: () => void; onQANo: () => void; onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 360, background: "rgba(255,255,255,0.97)", border: `1px solid ${BORDER}`, boxShadow: "0 12px 48px rgba(0,0,0,0.16)" }}>
        <div className="p-7 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(224,231,255,0.7), rgba(221,214,254,0.6))" }}>
            <ShieldCheck className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>커밋 전 AI QA를 실행할까요?</h3>
          <p className="text-[11px] mb-3" style={{ color: TEXT_SECONDARY }}>코드 품질 및 잠재적 버그를 자동으로 검사합니다.</p>
          <div className="px-3 py-2 rounded-xl text-left font-mono text-[10px] mb-6" style={{ background: "rgba(0,0,0,0.04)", color: TEXT_SECONDARY }}>{commitMsg}</div>
          <div className="flex gap-2.5">
            <button onClick={onQANo}  className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>아니오, 바로 커밋</button>
            <button onClick={onQAYes} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "linear-gradient(135deg, #41431B, #62683A)", color: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(65,67,27,0.24)" }}>예, AI QA 실행</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 커밋 완료 모달 ──
function CommittedModal({ show, msg, onClose }: { show: boolean; msg: string; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.24)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 340, background: "rgba(255,255,255,0.97)", border: `1px solid ${BORDER}`, boxShadow: "0 12px 48px rgba(0,0,0,0.16)" }}>
        <div className="p-7 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/[0.06]"><X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} /></button>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.10)" }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: "#10b981" }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>커밋 & 푸시 완료!</h3>
          <p className="text-[11px] mb-4" style={{ color: TEXT_SECONDARY }}>변경사항이 원격 저장소에 반영되었습니다.</p>
          <div className="text-left px-3 py-2.5 rounded-xl font-mono text-[10px] mb-5" style={{ background: "#0d1117", color: "#7ee787" }}>
            [main a3f9d21] {msg}<br/>
            <span style={{ color: "#8b949e" }}>→ remote: origin/main ✓</span>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// ── 파일 항목 ──
function FileRow({
  file, staged, selected, onToggle, onSelect,
}: {
  file: UICommitFile;
  staged: boolean;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: () => void;
}) {
  const ec = EXT_COLOR[file.extension] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY };
  const sm = STATUS_META[file.status] ?? { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" }; // 기본값 방어

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(65,67,27,0.08)" : "transparent",
        // 선택 시 왼쪽 그라데이션 border
        borderLeft: selected ? "2.5px solid" : "2.5px solid transparent",
        borderImage: selected ? "linear-gradient(180deg, #41431B, #AEB784) 1" : "none",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(0,0,0,0.025)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      {/* 체크박스 */}
      <div
        onClick={onToggle}
        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-all"
        style={{
          background: staged ? ACCENT : "transparent",
          border: `1.5px solid ${staged ? ACCENT : "rgba(0,0,0,0.22)"}`,
        }}
      >
        {staged && <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />}
      </div>

      {/* 확장자 뱃지 */}
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={ec}>.{file.extension}</span>

      {/* 파일명 */}
      <span className="flex-1 text-[11px] truncate" style={{ color: staged ? TEXT_PRIMARY : TEXT_TERTIARY }} title={file.path}>
        {file.fileName}
      </span>

      {/* +/- */}
      <div className="flex items-center gap-1 shrink-0 text-[9px]">
        {file.additions > 0 && <span style={{ color: "#10b981" }}>+{file.additions}</span>}
        {file.deletions > 0 && <span style={{ color: "#ef4444" }}>−{file.deletions}</span>}
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

export function ChangesPage({
  projectId = 1,
  onNavigateQA,
}: {
  projectId?: number | null;
  onNavigateQA?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [repoType, setRepoType] = useState<ProjectRepositoryType>("BACKEND");
  const [userName, setUserName] = useState<string>("SynAIpse");
  
  // 🌟 API로 받아온 데이터 상태
  const [latestCommitHash, setLatestCommitHash] = useState<string | null>(null);
  const [changedFiles, setChangedFiles] = useState<UICommitFile[]>([]);
  const [fileDiffs, setFileDiffs] = useState<Record<string, any>>({}); // 받아온 diff 캐싱

  const [staged,       setStaged]     = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<UICommitFile | null>(null);
  const [message,      setMessage]    = useState("");
  const [showQA,       setShowQA]     = useState(false);
  const [showDone,     setShowDone]   = useState(false);
  const [doneMsg,      setDoneMsg]    = useState("");
  const [history,      setHistory]    = useState<string[]>([]);
  const [stagedOpen,   setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  
  // 브랜치 시각화 모드
  const [showBranch,   setShowBranch] = useState(false);
  // 컨벤션 가드
  const [showConvention, setShowConvention] = useState(false);

  // 사용자 정보 조회
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await fetchCurrentUser();
        if (user && user.name) {
          setUserName(user.name);
          return;
        }
      } catch {}
      const session = loadSession();
      if (session?.username) {
        setUserName(session.username);
      }
    }
    loadUser();
  }, []);

  // 🌟 파일 선택 시 Diff 데이터 불러오기
  const handleFileSelect = async (file: UICommitFile, hash: string | null = latestCommitHash) => {
    setSelectedFile(file);
    if (!projectId || !hash || fileDiffs[file.id]) return;

    try {
      const diffData = await fetchProjectCommitFileDiff(projectId, repoType, hash, file.path);
      setFileDiffs(prev => ({ ...prev, [file.id]: diffData }));
    } catch (error) {
      console.warn("파일 Diff 조회 실패:", error);
    }
  };

  // 🌟 API 데이터 호출 로직 (실제 백엔드 + Fallback SynAIpse 커밋 데이터)
  useEffect(() => {
    async function loadCommitData() {
      setIsLoading(true);
      try {
        if (projectId) {
          const commitData = await fetchProjectCommits(projectId, repoType, 1);
          if (commitData && commitData.commits && commitData.commits.length > 0) {
            const hash = commitData.commits[0].commitHash;
            setLatestCommitHash(hash);

            const filesData = await fetchProjectCommitFiles(projectId, repoType, hash);
            if (filesData && filesData.files && filesData.files.length > 0) {
              const mappedFiles = filesData.files.map(f => ({
                ...f,
                id: f.path
              }));
              setChangedFiles(mappedFiles);
              setStaged(new Set(mappedFiles.map(f => f.id)));
              handleFileSelect(mappedFiles[0], hash);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.warn("백엔드 커밋 파일 목록 조회 실패, SynAIpse 로컬 변경사항으로 대체:", error);
      }

      // Fallback: CHANGE_FILES (SynAIpse 실제 GitHub 코드 Diff)
      const fallbackFiles: UICommitFile[] = CHANGE_FILES.map(cf => ({
        id: cf.id,
        path: cf.path,
        fileName: cf.name,
        extension: cf.ext,
        status: (cf.status === "added" ? "ADDED" : cf.status === "deleted" ? "DELETED" : "MODIFIED") as any,
        additions: cf.additions,
        deletions: cf.deletions,
      }));

      const initialDiffs: Record<string, any> = {};
      CHANGE_FILES.forEach(cf => {
        initialDiffs[cf.id] = { diff: cf.diff };
      });
      setFileDiffs(initialDiffs);
      setChangedFiles(fallbackFiles);
      setStaged(new Set(fallbackFiles.map(f => f.id)));
      if (fallbackFiles.length > 0) {
        setSelectedFile(fallbackFiles[0]);
      }
      setIsLoading(false);
    }

    loadCommitData();
  }, [projectId, repoType]);

  const stagedFiles   = changedFiles.filter(f => staged.has(f.id));
  const unstagedFiles = changedFiles.filter(f => !staged.has(f.id));
  const stagedCount   = staged.size;

  const stagedFilesWithDiff = useMemo(() => {
    return stagedFiles.map(file => {
      const cached = fileDiffs[file.id];
      return {
        id: file.id,
        name: file.fileName,
        path: file.path,
        ext: file.extension,
        status: (file.status || "MODIFIED").toLowerCase() as any,
        additions: file.additions,
        deletions: file.deletions,
        diff: cached?.diff || [],
      };
    });
  }, [stagedFiles, fileDiffs]);

  const toggleStage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStaged(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stageAll   = () => setStaged(new Set(changedFiles.map(f => f.id)));
  const unstageAll = () => setStaged(new Set());

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

  // QA 페이지로 이동할 때 커밋 정보 전달
  const handleQAYes = () => {
    setShowQA(false);
    setPendingQA({
      message: message.trim(),
      author:  userName,
      branch:  "main",
      files:   stagedFiles.map(f => f.fileName),
      hash:    Math.random().toString(36).slice(2, 9).toUpperCase(),
      time:    new Date().toISOString(),
    });
    onNavigateQA?.();
  };

  const doCommit = () => {
    const msg = message.trim();
    setHistory(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
    setDoneMsg(msg);
    setMessage("");
    setStaged(new Set());
    setSelectedFile(null);
    setShowQA(false);
    setShowDone(true);
  };

  const totalAdd = changedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDel = changedFiles.reduce((s, f) => s + f.deletions, 0);

  const currentDiffData = selectedFile ? fileDiffs[selectedFile.id] : null;

  return (
    <>
      <QAModal show={showQA} commitMsg={message.trim()} onQAYes={handleQAYes} onQANo={doCommit} onClose={() => setShowQA(false)} />
      <CommittedModal show={showDone} msg={doneMsg} onClose={() => setShowDone(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── 타이틀바 ── */}
        <div
          className="flex items-center gap-3 px-5 h-11 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(251,252,250,0.98)" }}
        >
          <GitCommit className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Changes</p>

          {/* 레포지토리 선택 (새로 추가됨) */}
          <div className="ml-2 flex items-center bg-black/5 rounded-lg p-0.5 border border-black/5">
            <button 
              onClick={() => setRepoType("FRONTEND")}
              disabled={isLoading}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-50 ${repoType === "FRONTEND" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              Frontend
            </button>
            <button 
              onClick={() => setRepoType("BACKEND")}
              disabled={isLoading}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-50 ${repoType === "BACKEND" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              Backend
            </button>
          </div>

          {/* 브랜치 버튼 — 클릭하면 시각화 토글 */}
          <button
            onClick={() => {
              if (isLoading) return;
              setShowBranch(b => !b);
              setSelectedFile(null);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all disabled:opacity-50"
            style={{
              background: showBranch ? "rgba(65,67,27,0.10)" : "rgba(32,35,27,0.05)",
              color:      showBranch ? ACCENT : TEXT_PRIMARY,
              border:     `1px solid ${showBranch ? ACCENT_BORDER : BORDER}`,
            }}
          >
            <GitBranch className="w-3.5 h-3.5" />
            main
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>

          {showBranch && (
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
              Branch Graph 활성화됨
            </span>
          )}

          <div className="ml-auto flex items-center gap-3 text-[10px]">
            {isLoading ? (
              <Skeleton className="h-3 w-40" />
            ) : (
              <>
                <span style={{ color: TEXT_TERTIARY }}>{changedFiles.length} files changed</span>
                <span style={{ color: "#10b981" }}>+{totalAdd}</span>
                <span style={{ color: "#ef4444" }}>−{totalDel}</span>

                {!showBranch && (
                  <>
                    <button
                      onClick={stageAll}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                    >
                      Stage All
                    </button>
                    <button
                      onClick={unstageAll}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}
                    >
                      Unstage All
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 브랜치 시각화 모드 ── */}
        {showBranch ? (
          <BranchVisualization onClose={() => setShowBranch(false)} />
        ) : (
          /* ── 2-column body ── */
          <div className="flex-1 flex overflow-hidden">

            {/* ── 왼쪽: 파일 목록 + 커밋 입력 ── */}
            <div
              className="flex flex-col shrink-0 overflow-hidden"
              style={{ width: 280, borderRight: `1px solid ${BORDER}`, background: "#F7F8F5" }}
            >
              <div className="flex-1 overflow-y-auto">

                {/* Staged 섹션 */}
                <div>
                  <button
                    onClick={() => { if (!isLoading) setStagedOpen(o => !o); }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] transition-all disabled:opacity-50"
                    style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "#ECEEE9" }}
                  >
                    {stagedOpen
                      ? <ChevronDown  className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                      : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                    }
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>Staged</span>
                    {!isLoading && (
                      <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                        {stagedFiles.length}
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
                    stagedFiles.map(file => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged
                        selected={selectedFile?.id === file.id}
                        onToggle={e => toggleStage(e, file.id)}
                        onSelect={() => handleFileSelect(file)}
                      />
                    ))
                  ) : stagedOpen && stagedFiles.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>스테이징된 파일 없음</p>
                    </div>
                  ) : null}
                </div>

                {/* Unstaged 섹션 */}
                <div>
                  <button
                    onClick={() => { if (!isLoading) setUnstagedOpen(o => !o); }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] transition-all disabled:opacity-50"
                    style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "#ECEEE9", borderTop: `1px solid ${BORDER_SUBTLE}` }}
                  >
                    {unstagedOpen
                      ? <ChevronDown  className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                      : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                    }
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>Unstaged</span>
                    {!isLoading && (
                      <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_TERTIARY }}>
                        {unstagedFiles.length}
                      </span>
                    )}
                  </button>

                  {unstagedOpen && isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="w-6 h-3 rounded" />
                        <Skeleton className="flex-1 h-3" />
                      </div>
                    ))
                  ) : unstagedOpen && unstagedFiles.length > 0 ? (
                    unstagedFiles.map(file => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged={false}
                        selected={selectedFile?.id === file.id}
                        onToggle={e => toggleStage(e, file.id)}
                        onSelect={() => handleFileSelect(file)}
                      />
                    ))
                  ) : unstagedOpen && unstagedFiles.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>모든 파일이 스테이징됨</p>
                    </div>
                  ) : null}
                </div>

                {/* 커밋 히스토리 (로딩 끝나고 데이터 있을 때만) */}
                {!isLoading && history.length > 0 && (
                  <div className="px-3 pt-3 pb-2" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: TEXT_LABEL }}>Recent Commits</p>
                    <div className="space-y-1.5">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                          <p className="text-[9px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 커밋 메시지 + 버튼 ── */}
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
                        style={{ background: "linear-gradient(135deg, #DDE2D3, #F0F1EE)" }}
                      >
                        <span className="text-[8px] font-bold" style={{ color: ACCENT }}>
                          {userName.charAt(0) || "U"}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: TEXT_SECONDARY }}>{userName}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <GitBranch className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>main</span>
                      </div>
                    </div>

                    {/* ── AI 커밋 메시지 생성기 ── */}
                    <AICommitGenerator
                      projectId={projectId ?? 1}
                      stagedFiles={stagedFilesWithDiff as any} 
                      onApply={msg => setMessage(msg)}
                    />

                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
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
                      <span>{stagedCount} file{stagedCount !== 1 ? "s" : ""} staged</span>
                      <span className="ml-auto" style={{ color: "#10b981" }}>+{stagedFiles.reduce((s, f) => s + f.additions, 0)}</span>
                      <span style={{ color: "#ef4444" }}>−{stagedFiles.reduce((s, f) => s + f.deletions, 0)}</span>
                    </div>

                    <button
                      onClick={handleCommitClick}
                      disabled={!stagedCount || !message.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                      style={{
                        background: stagedCount > 0 && message.trim()
                          ? "linear-gradient(135deg, #41431B 0%, #62683A 100%)"
                          : "rgba(0,0,0,0.07)",
                        color: stagedCount > 0 && message.trim()
                          ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
                        boxShadow: stagedCount > 0 && message.trim()
                          ? "0 4px 16px rgba(65,67,27,0.24)" : "none",
                        cursor: stagedCount > 0 && message.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Commit &amp; Push to main
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── 오른쪽: Diff Viewer ── */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
              {isLoading ? (
                /* [스켈레톤] 우측 Diff 영역 전체 */
                <div className="flex-1 p-6 space-y-4">
                  <Skeleton className="h-6 w-1/3 bg-white/10" />
                  <Skeleton className="h-4 w-1/4 bg-white/5" />
                  <div className="mt-8 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                    <Skeleton className="h-4 w-5/6 bg-white/5" />
                    <Skeleton className="h-4 w-2/3 bg-white/5" />
                  </div>
                </div>
              ) : (
                <>
                  {selectedFile && (
                    <div
                      className="flex items-center gap-3 px-4 py-2 shrink-0"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}
                    >
                      <span className="text-[10px] font-semibold" style={{ color: "#c9d1d9" }}>{selectedFile.fileName}</span>
                      <span className="text-[9px] font-mono truncate" style={{ color: "#8b949e" }}>{selectedFile.path}</span>
                      <div className="ml-auto flex items-center gap-2 text-[9px]">
                        <span style={{ color: "#3fb950" }}>+{selectedFile.additions}</span>
                        <span style={{ color: "#f85149" }}>−{selectedFile.deletions}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                          style={{
                            background: STATUS_META[selectedFile.status]?.bg ?? "#333",
                            color:      STATUS_META[selectedFile.status]?.color ?? "#fff",
                          }}
                        >
                          {selectedFile.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedFile ? (
                    // 기존 FileDiffViewer 컴포넌트가 새로운 currentDiffData 형태를 처리할 수 있도록 
                    // FileDiffViewer.tsx 내부도 props 구조 수정이 필요할 수 있습니다.
                    // 현재는 기존처럼 file(또는 diff 포함 객체)를 넘겨줍니다.
                    currentDiffData ? (
                       <FileDiffViewer file={{ ...selectedFile, diff: currentDiffData.diff } as any} />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <GitCommit className="w-8 h-8" style={{ color: "#30363d" }} />
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-semibold mb-1" style={{ color: "#6e7681" }}>파일을 선택하세요</p>
                        <p className="text-[11px]" style={{ color: "#484f58" }}>왼쪽 목록에서 파일을 클릭하면 변경 내용이 표시됩니다</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 컨벤션 가드 모달 ── */}
      {showConvention && (
        <ConventionGuardModal
          stagedFiles={stagedFiles.map(f => f.fileName)}
          userName={userName}
          onIgnore={handleConventionIgnore}
          onFix={handleConventionFix}
          onClose={() => setShowConvention(false)}
        />
      )}
    </>
  );
}