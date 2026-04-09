import { useState } from "react";
import { GitCommit, Plus, Minus, GitBranch, Server, Monitor, Users, Clock, ChevronRight } from "lucide-react";
import { BACKEND_COMMITS, FRONTEND_COMMITS } from "./commitData";
import type { Commit, CommitFile } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, GRADIENT_PAGE, GRADIENT_ORB_1, CREAM,
} from "../colors";

const PANEL_BG = CREAM;

const EXT_COLOR: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(245,158,11,0.10)",  color: "#f59e0b" },
  gradle: { bg: "rgba(99,91,255,0.08)",   color: ACCENT    },
  yml:    { bg: "rgba(16,185,129,0.08)",  color: "#10b981" },
  ts:     { bg: "rgba(59,130,246,0.08)",  color: "#3b82f6" },
  tsx:    { bg: "rgba(6,182,212,0.08)",   color: "#06b6d4" },
  css:    { bg: "rgba(236,72,153,0.08)",  color: "#ec4899" },
  env:    { bg: "rgba(107,114,128,0.08)", color: "#6b7280" },
};

type RepoMode = "backend" | "frontend" | "split";

// ── 커밋 아이템 ──
function CommitItem({
  commit, selected, onClick,
}: {
  commit: Commit; selected: boolean; onClick: () => void;
}) {
  const totalAdded   = commit.files.reduce((s, f) => s + f.additions, 0);
  const totalDeleted = commit.files.reduce((s, f) => s + f.deletions, 0);
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(99,91,255,0.05)" : "transparent",
        borderLeft: selected ? "2.5px solid" : "2.5px solid transparent",
        borderImage: selected
          ? "linear-gradient(180deg, #635bff 0%, #8b5cf6 40%, #ec4899 80%, #fbbf24 100%) 1"
          : "none",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(0,0,0,0.025)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      {/* 해시 + 시간 */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: selected ? "rgba(99,91,255,0.10)" : "rgba(0,0,0,0.05)", color: selected ? ACCENT : TEXT_TERTIARY }}
        >
          [{commit.hash.slice(0, 7)}]
        </span>
        <span className="text-[9px] ml-auto" style={{ color: TEXT_TERTIARY }}>{commit.time}</span>
      </div>
      {/* 메시지 */}
      <p className="text-[11px] font-medium leading-snug mb-1 line-clamp-2" style={{ color: selected ? TEXT_PRIMARY : TEXT_SECONDARY }}>
        {commit.message}
      </p>
      {/* 작성자 + 통계 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e0e7ff, #fce7f3)" }}>
            <span className="text-[7px] font-bold" style={{ color: ACCENT }}>{commit.author[0]}</span>
          </div>
          <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{commit.author}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-[9px]">
          {totalAdded   > 0 && <span style={{ color: "#10b981" }}>+{totalAdded}</span>}
          {totalDeleted > 0 && <span style={{ color: "#ef4444" }}>−{totalDeleted}</span>}
          <span style={{ color: TEXT_TERTIARY }}>{commit.files.length} file{commit.files.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </button>
  );
}

// ── 파일 아이템 (Changed Files) ──
function FileItem({
  file, selected, onClick,
}: {
  file: CommitFile; selected: boolean; onClick: () => void;
}) {
  const ec = EXT_COLOR[file.ext] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY };
  const statusColor = file.status === "added" ? "#10b981" : file.status === "deleted" ? "#ef4444" : "#f59e0b";
  const statusLabel = file.status === "added" ? "A" : file.status === "deleted" ? "D" : "M";
  const total = file.additions + file.deletions;

  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(99,91,255,0.05)" : "transparent",
        borderLeft: selected ? "2.5px solid" : "2.5px solid transparent",
        borderImage: selected
          ? "linear-gradient(180deg, #635bff 0%, #8b5cf6 40%, #ec4899 80%, #fbbf24 100%) 1"
          : "none",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(0,0,0,0.025)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      {/* 파일명 + 상태 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={ec}>.{file.ext}</span>
        <span className="text-[11px] font-medium flex-1 truncate" style={{ color: selected ? TEXT_PRIMARY : TEXT_SECONDARY }}>{file.name}</span>
        <span className="text-[9px] font-bold shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      {/* 경로 */}
      <p className="text-[9px] truncate mb-2" style={{ color: TEXT_TERTIARY }}>{file.path}</p>

      {/* +/- 바 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
          {total > 0 && (
            <div
              className="h-full rounded-full"
              style={{
                width: `${(file.additions / total) * 100}%`,
                background: "linear-gradient(90deg, #238636, #2ea043)",
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px]">
          <span style={{ color: "#10b981" }}>+{file.additions}</span>
          <span style={{ color: "#ef4444" }}>−{file.deletions}</span>
        </div>
      </div>
    </button>
  );
}

// ── 커밋 컬럼 + 파일 컬럼 묶음 ──
function RepoPane({
  label, icon: Icon, iconColor, commits, selectedCommitId, selectedFileId,
  onSelectCommit, onSelectFile,
}: {
  label: string; icon: any; iconColor: string;
  commits: Commit[];
  selectedCommitId: string | null;
  selectedFileId:   string | null;
  onSelectCommit: (c: Commit) => void;
  onSelectFile:   (f: CommitFile) => void;
}) {
  const selectedCommit = commits.find(c => c.id === selectedCommitId) ?? null;

  return (
    <div className="flex shrink-0 overflow-hidden" style={{ width: 420 }}>
      {/* 커밋 리스트 */}
      <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 210, borderRight: `1px solid ${BORDER}` }}>
        {/* 헤더 */}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,250,250,1)" }}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{label}</p>
          <GitBranch className="w-3 h-3 ml-auto" style={{ color: TEXT_TERTIARY }} />
          <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>main</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ background: "#ffffff" }}>
          {commits.map(c => (
            <CommitItem
              key={c.id}
              commit={c}
              selected={selectedCommitId === c.id}
              onClick={() => onSelectCommit(c)}
            />
          ))}
        </div>
      </div>

      {/* 변경 파일 리스트 */}
      <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 210, borderRight: `1px solid ${BORDER}` }}>
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,250,250,1)" }}
        >
          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            Changed Files
          </p>
          {selectedCommit && (
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,91,255,0.10)", color: ACCENT }}>
              {selectedCommit.files.length}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ background: "#ffffff" }}>
          {selectedCommit ? (
            selectedCommit.files.map(f => (
              <FileItem
                key={f.id}
                file={f}
                selected={selectedFileId === f.id}
                onClick={() => onSelectFile(f)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>커밋을 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──
export function CommitDiffPage() {
  const [mode, setMode] = useState<RepoMode>("split");

  // Backend 상태
  const [selBECommit, setSelBECommit] = useState<string | null>(BACKEND_COMMITS[0].id);
  const [selBEFile,   setSelBEFile]   = useState<CommitFile | null>(BACKEND_COMMITS[0].files[0]);

  // Frontend 상태
  const [selFECommit, setSelFECommit] = useState<string | null>(FRONTEND_COMMITS[0].id);
  const [selFEFile,   setSelFEFile]   = useState<CommitFile | null>(FRONTEND_COMMITS[0].files[0]);

  // 현재 표시할 diff
  const activeDiff = mode === "frontend" ? selFEFile : selBEFile;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경: 흰색 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "#ffffff" }} />

      {/* ── 타이틀바 ── */}
      <div
        className="flex items-center gap-3 px-4 h-10 shrink-0 relative z-10"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,250,250,0.98)" }}
      >
        <GitCommit className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Commit History</p>

        {/* 레포 모드 토글 */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg ml-4"
          style={{ background: "rgba(0,0,0,0.06)", border: `1px solid ${BORDER}` }}
        >
          {(["backend", "split", "frontend"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize transition-all"
              style={{
                background: mode === m ? "white" : "transparent",
                color: mode === m ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m === "backend"  && <Server  className="w-3 h-3" />}
              {m === "split"    && <><Server className="w-2.5 h-2.5" /><span>/</span><Monitor className="w-2.5 h-2.5" /></>}
              {m === "frontend" && <Monitor className="w-3 h-3" />}
              {m === "backend" ? "Backend" : m === "frontend" ? "Frontend" : "Split"}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: TEXT_TERTIARY }}>
          <span>{BACKEND_COMMITS.length + FRONTEND_COMMITS.length} commits total</span>
          <span>·</span>
          <span style={{ color: "#10b981" }}>+{BACKEND_COMMITS.concat(FRONTEND_COMMITS).flatMap(c => c.files).reduce((s, f) => s + f.additions, 0)} lines</span>
          <span style={{ color: "#ef4444" }}>−{BACKEND_COMMITS.concat(FRONTEND_COMMITS).flatMap(c => c.files).reduce((s, f) => s + f.deletions, 0)} lines</span>
        </div>
      </div>

      {/* ── 3-col 바디 ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* ── 왼쪽: 레포 패널 ── */}
        <div className="flex overflow-hidden shrink-0" style={{ borderRight: `1px solid ${BORDER}` }}>
          {/* Backend 패널 */}
          {(mode === "backend" || mode === "split") && (
            <RepoPane
              label="Backend (Java/Spring)"
              icon={Server}
              iconColor={ACCENT}
              commits={BACKEND_COMMITS}
              selectedCommitId={selBECommit}
              selectedFileId={selBEFile?.id ?? null}
              onSelectCommit={c => { setSelBECommit(c.id); setSelBEFile(c.files[0] ?? null); }}
              onSelectFile={f => setSelBEFile(f)}
            />
          )}
          {/* Frontend 패널 */}
          {(mode === "frontend" || mode === "split") && (
            <RepoPane
              label="Frontend (React/TS)"
              icon={Monitor}
              iconColor="#06b6d4"
              commits={FRONTEND_COMMITS}
              selectedCommitId={selFECommit}
              selectedFileId={selFEFile?.id ?? null}
              onSelectCommit={c => { setSelFECommit(c.id); setSelFEFile(c.files[0] ?? null); }}
              onSelectFile={f => setSelFEFile(f)}
            />
          )}
        </div>

        {/* ── 오른쪽: Diff Viewer ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0, background: "#0d1117" }}>
          {/* split 모드에서 어느 쪽 파일인지 탭 표시 */}
          {mode === "split" && (selBEFile || selFEFile) && (
            <div
              className="flex items-center gap-0 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}
            >
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold transition-all"
                style={{
                  color: selBEFile ? "#c9d1d9" : "#8b949e",
                  borderBottom: selBEFile ? "2px solid #635bff" : "2px solid transparent",
                  background: selBEFile ? "rgba(99,91,255,0.08)" : "transparent",
                }}
              >
                <Server className="w-3 h-3" style={{ color: ACCENT }} />
                {selBEFile?.name ?? "Backend"}
              </button>
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold transition-all"
                style={{
                  color: selFEFile ? "#c9d1d9" : "#8b949e",
                  borderBottom: selFEFile ? "2px solid #06b6d4" : "2px solid transparent",
                  background: selFEFile ? "rgba(6,182,212,0.08)" : "transparent",
                }}
              >
                <Monitor className="w-3 h-3" style={{ color: "#06b6d4" }} />
                {selFEFile?.name ?? "Frontend"}
              </button>
            </div>
          )}

          {/* split 모드: 위아래로 두 diff */}
          {mode === "split" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {selBEFile
                  ? <FileDiffViewer file={selBEFile} />
                  : <div className="flex items-center justify-center h-full"><p className="text-[11px]" style={{ color: "#8b949e" }}>백엔드 파일을 선택하세요</p></div>
                }
              </div>
              <div className="flex-1 overflow-hidden">
                {selFEFile
                  ? <FileDiffViewer file={selFEFile} />
                  : <div className="flex items-center justify-center h-full"><p className="text-[11px]" style={{ color: "#8b949e" }}>프론트엔드 파일을 선택하세요</p></div>
                }
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              {activeDiff
                ? <FileDiffViewer file={activeDiff} />
                : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <GitCommit className="w-8 h-8" style={{ color: "#30363d" }} />
                    <p className="text-[12px]" style={{ color: "#8b949e" }}>파일을 선택하면 변경 내용이 표시됩니다</p>
                  </div>
                )
              }
            </div>
          )}
        </div>

      </div>
    </div>
  );
}