import { useState } from "react";
import {
  GitCommit, CheckSquare, Upload, GitBranch,
  CheckCircle2, X, ShieldCheck,
} from "lucide-react";
import { CHANGE_FILES } from "./commitData";
import type { CommitFile } from "./commitData";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, BEIGE,
} from "../colors";

const STATUS_ICON: Record<string, { color: string; label: string }> = {
  modified: { color: "#f59e0b", label: "M" },
  added:    { color: "#10b981", label: "A" },
  deleted:  { color: "#ef4444", label: "D" },
};

// QA 확인 팝업
function QAModal({
  show, onQAYes, onQANo, onClose, commitMsg,
}: {
  show: boolean;
  onQAYes: () => void;
  onQANo: () => void;
  onClose: () => void;
  commitMsg: string;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: 340,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        }}
      >
        <div className="p-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(224,231,255,0.7), rgba(221,214,254,0.6))" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <h3 className="text-sm font-bold mb-1.5" style={{ color: TEXT_PRIMARY }}>
            커밋 전 QA를 진행할까요?
          </h3>
          <p className="text-[11px] leading-relaxed mb-1" style={{ color: TEXT_SECONDARY }}>
            AI QA 에이전트가 자동으로 코드를 검사합니다.
          </p>
          <div
            className="px-3 py-2 rounded-xl font-mono text-[10px] mb-5 text-left"
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
                background: "linear-gradient(135deg, #635bff, #8b5cf6)",
                color: "rgba(255,255,255,0.95)",
                boxShadow: "0 4px 14px rgba(99,91,255,0.3)",
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

// 커밋 완료 토스트
function CommittedToast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.20)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: 320,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        }}
      >
        <div className="p-6 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/[0.06]">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.10)" }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: "#10b981" }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>커밋 완료!</h3>
          <p className="text-[11px] mb-4" style={{ color: TEXT_SECONDARY }}>변경사항이 main 브랜치에 푸시되었습니다.</p>
          <div className="text-left px-3 py-2.5 rounded-xl font-mono text-[10px] mb-4" style={{ background: "#0d1117", color: "#7ee787" }}>
            [main a3f9d21] {msg}<br />
            <span style={{ color: "#8b949e" }}>→ remote: origin/main</span>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Props ──
type Props = {
  onFileSelect?:   (file: CommitFile | null) => void;
  onNavigateQA?:   () => void;
  selectedFileId?: string | null;
  collapsed?:      boolean; // 사이드바 collapsed 모드
};

export function CommitPanel({ onFileSelect, onNavigateQA, selectedFileId, collapsed }: Props) {
  const [staged, setStaged]         = useState<Set<string>>(new Set(["1", "2", "3", "4"]));
  const [message, setMessage]       = useState("");
  const [showQA, setShowQA]         = useState(false);
  const [showDone, setShowDone]     = useState(false);
  const [doneMsg, setDoneMsg]       = useState("");
  const [committed, setCommitted]   = useState<string[]>([]);

  const stagedCount = staged.size;

  const toggleStage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStaged(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFileClick = (file: CommitFile) => {
    onFileSelect?.(selectedFileId === file.id ? null : file);
  };

  const stageAll   = () => setStaged(new Set(CHANGE_FILES.map(f => f.id)));
  const unstageAll = () => setStaged(new Set());

  const handleCommitClick = () => {
    if (stagedCount === 0 || !message.trim()) return;
    setShowQA(true);
  };

  const handleQAYes = () => {
    setShowQA(false);
    onNavigateQA?.();
  };

  const doCommit = () => {
    const msg = message.trim();
    setCommitted(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
    setDoneMsg(msg);
    setMessage("");
    setStaged(new Set());
    onFileSelect?.(null);
    setShowQA(false);
    setShowDone(true);
  };

  // collapsed 모드: 미니 아이콘만
  if (collapsed) {
    return (
      <>
        <QAModal show={showQA} onQAYes={handleQAYes} onQANo={doCommit} onClose={() => setShowQA(false)} commitMsg={message.trim()} />
        {showDone && <CommittedToast msg={doneMsg} onClose={() => setShowDone(false)} />}
        <div className="flex justify-center items-center py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="relative">
            <GitCommit className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
            {stagedCount > 0 && (
              <div
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: ACCENT }}
              >
                <span className="text-[7px] font-bold text-white">{stagedCount}</span>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── 풀 모드 ──
  return (
    <>
      <QAModal show={showQA} onQAYes={handleQAYes} onQANo={doCommit} onClose={() => setShowQA(false)} commitMsg={message.trim()} />
      {showDone && <CommittedToast msg={doneMsg} onClose={() => setShowDone(false)} />}

      {/* Changes 섹션 헤더 */}
      <div
        className="flex items-center px-3 py-2 shrink-0"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <GitCommit className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
        <span className="text-[10px] font-semibold ml-2 flex-1" style={{ color: TEXT_PRIMARY }}>Changes</span>

        {/* 브랜치 */}
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          <span className="text-[9px] font-mono" style={{ color: TEXT_PRIMARY }}>main</span>
        </div>

        {stagedCount > 0 && (
          <span
            className="ml-2 text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(99,91,255,0.10)", color: ACCENT }}
          >
            {stagedCount}
          </span>
        )}

        {/* All / None */}
        <button onClick={stageAll}   className="ml-2 text-[9px] px-1 py-0.5 rounded hover:bg-black/[0.06]" style={{ color: ACCENT }}>All</button>
        <button onClick={unstageAll} className="text-[9px] px-1 py-0.5 rounded hover:bg-black/[0.06]" style={{ color: TEXT_TERTIARY }}>None</button>
      </div>

      {/* 파일 목록 */}
      <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
        {CHANGE_FILES.map(file => {
          const isStaged   = staged.has(file.id);
          const isSelected = selectedFileId === file.id;
          const sm = STATUS_ICON[file.status];

          return (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all"
              style={{
                borderBottom: `1px solid ${BORDER_SUBTLE}`,
                background: isSelected ? "rgba(99,91,255,0.06)" : isStaged ? "rgba(99,91,255,0.02)" : "transparent",
                // 그라데이션 선택 border
                borderLeft: isSelected ? "2px solid" : "2px solid transparent",
                borderImage: isSelected
                  ? "linear-gradient(180deg, #635bff 0%, #8b5cf6 50%, #ec4899 100%) 1"
                  : "none",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(0,0,0,0.025)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isStaged ? "rgba(99,91,255,0.02)" : "transparent"; }}
            >
              {/* 체크박스 */}
              <div
                onClick={e => toggleStage(e, file.id)}
                className="w-3 h-3 rounded flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  background: isStaged ? ACCENT : "transparent",
                  border: `1.5px solid ${isStaged ? ACCENT : "rgba(0,0,0,0.20)"}`,
                }}
              >
                {isStaged && <div className="w-1.5 h-1 border-b border-r border-white rotate-45 translate-y-px" />}
              </div>

              {/* 파일명 */}
              <span
                className="flex-1 text-[9px] truncate"
                style={{ color: isStaged ? TEXT_PRIMARY : TEXT_TERTIARY }}
              >
                {file.name}
              </span>

              {/* +/- */}
              <div className="flex items-center gap-0.5 shrink-0 text-[8px]">
                {file.additions > 0 && <span style={{ color: "#10b981" }}>+{file.additions}</span>}
                {file.deletions > 0 && <span style={{ color: "#ef4444" }}>−{file.deletions}</span>}
              </div>

              {/* 상태 */}
              <span className="text-[8px] font-bold shrink-0 w-3 text-center" style={{ color: sm.color, opacity: isStaged ? 1 : 0.4 }}>
                {sm.label}
              </span>
            </div>
          );
        })}

        {/* 최근 커밋 이력 */}
        {committed.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[8px] font-semibold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>Recent</p>
            {committed.map((c, i) => (
              <div key={i} className="flex items-start gap-1 mb-1">
                <CheckCircle2 className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                <p className="text-[8px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{c}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 커밋 메시지 + 버튼 */}
      <div className="shrink-0 px-3 py-2.5 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="커밋 메시지 (필수)"
          rows={2}
          className="w-full px-2.5 py-1.5 text-[10px] leading-relaxed rounded-xl outline-none resize-none"
          style={{
            background: "rgba(237,232,210,0.85)",
            border: `1px solid ${BORDER}`,
            color: TEXT_PRIMARY,
          }}
        />
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #E3DBBB, #AEB784)" }}
          >
            <span className="text-[7px] font-bold" style={{ color: ACCENT }}>병</span>
          </div>
          <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>병권</span>
          <span className="text-[8px] ml-auto" style={{ color: TEXT_TERTIARY }}>{stagedCount} file{stagedCount !== 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={handleCommitClick}
          disabled={stagedCount === 0 || !message.trim()}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-semibold transition-all"
          style={{
            background: stagedCount > 0 && message.trim()
              ? "linear-gradient(135deg, #41431B, #6B7040, #AEB784)"
              : "rgba(65,67,27,0.06)",
            color: stagedCount > 0 && message.trim() ? "rgba(248,243,225,0.95)" : TEXT_TERTIARY,
            boxShadow: stagedCount > 0 && message.trim() ? "0 4px 14px rgba(65,67,27,0.22)" : "none",
            cursor: stagedCount > 0 && message.trim() ? "pointer" : "not-allowed",
          }}
        >
          <Upload className="w-3 h-3" />
          Commit &amp; Push
        </button>
      </div>
    </>
  );
}