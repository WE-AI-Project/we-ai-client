import { X, Plus, Minus } from "lucide-react";
import type { CommitFile, DiffLine } from "./commitData";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, ACCENT_BG,
} from "../colors";

const EXT_COLOR: Record<string, string> = {
  java:   "#f59e0b", gradle: ACCENT,    yml: "#10b981",
  ts:     "#3b82f6", tsx:    "#06b6d4", css: "#ec4899",
  env:    "#6b7280",
};

function DiffLineRow({ line, idx }: { line: DiffLine; idx: number }) {
  const isAdded   = line.type === "added";
  const isRemoved = line.type === "removed";
  const isHunk    = line.type === "hunk";

  if (isHunk) {
    return (
      <div
        key={idx}
        className="flex font-mono text-[10px] leading-5 select-none"
        style={{ background: "rgba(56,139,253,0.08)", borderTop: `1px solid rgba(56,139,253,0.15)`, borderBottom: `1px solid rgba(56,139,253,0.15)` }}
      >
        <span className="w-10 text-right pr-2 shrink-0 select-none" style={{ color: "rgba(100,160,255,0.5)" }}>…</span>
        <span className="w-10 text-right pr-2 shrink-0 select-none" style={{ color: "rgba(100,160,255,0.5)" }}>…</span>
        <span className="w-5 text-center shrink-0" />
        <span style={{ color: "#58a6ff" }}>{line.content}</span>
      </div>
    );
  }

  const bg = isAdded   ? "rgba(46,160,67,0.10)"
           : isRemoved ? "rgba(248,81,73,0.10)"
           : "transparent";
  const numColor = isAdded   ? "rgba(46,160,67,0.5)"
                 : isRemoved ? "rgba(248,81,73,0.5)"
                 : "rgba(140,140,140,0.35)";
  const textColor = isAdded   ? "#7ee787"
                  : isRemoved ? "#ff7b72"
                  : "#c9d1d9";
  const symbol = isAdded ? "+" : isRemoved ? "−" : " ";
  const symbolColor = isAdded ? "#7ee787" : isRemoved ? "#ff7b72" : "transparent";

  return (
    <div
      key={idx}
      className="flex font-mono text-[10px] leading-5 hover:brightness-110"
      style={{ background: bg }}
    >
      {/* old line num */}
      <span className="w-10 text-right pr-2 shrink-0 select-none" style={{ color: numColor }}>
        {line.oldNum ?? ""}
      </span>
      {/* new line num */}
      <span className="w-10 text-right pr-2 shrink-0 select-none" style={{ color: numColor }}>
        {line.newNum ?? ""}
      </span>
      {/* +/- symbol */}
      <span className="w-5 text-center shrink-0" style={{ color: symbolColor }}>{symbol}</span>
      {/* content */}
      <span className="flex-1 whitespace-pre" style={{ color: textColor }}>{line.content}</span>
    </div>
  );
}

type Props = {
  file:    CommitFile;
  onClose?: () => void;
};

export function FileDiffViewer({ file, onClose }: Props) {
  const extColor = EXT_COLOR[file.ext] ?? TEXT_SECONDARY;
  const totalAdded   = file.additions;
  const totalRemoved = file.deletions;

  const statusLabel = file.status === "added"    ? "NEW FILE"
                    : file.status === "deleted"  ? "DELETED"
                    : "MODIFIED";
  const statusColor = file.status === "added"    ? "#10b981"
                    : file.status === "deleted"  ? "#ef4444"
                    : "#f59e0b";

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d1117" }}>
      {/* ── 파일 헤더 ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}
      >
        <span
          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0"
          style={{ background: `${extColor}18`, color: extColor }}
        >
          .{file.ext}
        </span>
        <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "#c9d1d9" }}>
          {file.path}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: `${statusColor}18`, color: statusColor }}
          >
            {statusLabel}
          </span>
          {totalAdded > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "#7ee787" }}>
              <Plus className="w-2.5 h-2.5" />{totalAdded}
            </span>
          )}
          {totalRemoved > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "#ff7b72" }}>
              <Minus className="w-2.5 h-2.5" />{totalRemoved}
            </span>
          )}
        </div>
        {/* 시각적 변경 바 */}
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: Math.min(5, totalAdded + totalRemoved) }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-3 rounded-sm"
              style={{
                background: i < Math.round(5 * totalAdded / Math.max(1, totalAdded + totalRemoved))
                  ? "#238636" : "#da3633",
              }}
            />
          ))}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded transition-all hover:bg-white/[0.06] shrink-0"
          >
            <X className="w-3.5 h-3.5" style={{ color: "#8b949e" }} />
          </button>
        )}
      </div>

      {/* ── Diff 본문 ── */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {file.diff.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px]" style={{ color: "#8b949e" }}>
              {file.status === "deleted" ? "파일이 삭제되었습니다." : "변경 내용 없음"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {file.diff.map((line, i) => (
              <DiffLineRow key={i} line={line} idx={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}