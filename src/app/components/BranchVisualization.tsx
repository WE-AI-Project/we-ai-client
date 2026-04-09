import { useState } from "react";
import {
  GitBranch, GitMerge, GitCommit, Plus, X,
  Circle, ChevronRight, Clock, User,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, BRANCH_COLORS,
} from "../colors";

// ── 커밋/브랜치 데이터 타입 ──
type CommitNode = {
  id:     string;
  hash:   string;
  msg:    string;
  author: string;
  date:   string;
  branch: string;
  col:    number;    // 열 위치 (0 = main)
  row:    number;    // 행 순서
  mergeFrom?: string; // 머지 출처 브랜치
  mergeTo?:   string; // 머지 대상 브랜치
  tags?:  string[];
};

type BranchMeta = {
  name:     string;
  color:    string;
  col:      number;
  commits:  number;
  active:   boolean;
  created:  string;
  merged?:  string;
};

// ── 더미 브랜치 메타 ──
const BRANCHES: BranchMeta[] = [
  { name: "main",           color: BRANCH_COLORS[0], col: 0, commits: 12, active: true,  created: "2025-03-20" },
  { name: "feat/multi-agent",color: BRANCH_COLORS[1], col: 1, commits: 6,  active: false, created: "2025-03-25", merged: "2025-03-31" },
  { name: "fix/toolchain",   color: BRANCH_COLORS[2], col: 2, commits: 2,  active: false, created: "2025-03-30", merged: "2025-03-31" },
  { name: "feat/agent-retry",color: BRANCH_COLORS[3], col: 1, commits: 4,  active: false, created: "2025-03-29", merged: "2025-03-30" },
  { name: "feat/jwt",        color: BRANCH_COLORS[4], col: 2, commits: 3,  active: true,  created: "2025-03-28" },
  { name: "fix/scheduler",   color: BRANCH_COLORS[5], col: 3, commits: 2,  active: false, created: "2025-03-30", merged: "2025-03-30" },
];

// ── 더미 커밋 그래프 데이터 ──
const COMMITS: CommitNode[] = [
  { id:"c1",  hash:"a3f9d21", msg:"Refactored Multi-Agent communication logic",   author:"병권",  date:"03/31 14:22", branch:"main",           col:0, row:0, tags:["HEAD","main"] },
  { id:"c2",  hash:"b7c3e18", msg:"Merge fix/toolchain → main",                   author:"병권",  date:"03/31 11:05", branch:"main",           col:0, row:1, mergeFrom:"fix/toolchain" },
  { id:"c3",  hash:"d2a1f45", msg:"Fixed JDK 17 toolchain issue in settings.gradle", author:"병권", date:"03/31 10:50", branch:"fix/toolchain", col:2, row:2 },
  { id:"c4",  hash:"e5b8c72", msg:"Merge feat/multi-agent → main",                author:"Admin", date:"03/31 09:00", branch:"main",           col:0, row:3, mergeFrom:"feat/multi-agent" },
  { id:"c5",  hash:"f1d7a09", msg:"Added DataSyncAgent retry mechanism",           author:"병권",  date:"03/30 19:47", branch:"feat/multi-agent",col:1, row:4 },
  { id:"c6",  hash:"90c2b55", msg:"MultiAgentController dispatch refactor",        author:"Admin", date:"03/30 16:00", branch:"feat/multi-agent",col:1, row:5 },
  { id:"c7",  hash:"a1b3c4d", msg:"Merge feat/agent-retry → main",                author:"병권",  date:"03/30 15:00", branch:"main",           col:0, row:6, mergeFrom:"feat/agent-retry" },
  { id:"c8",  hash:"b2c5d6e", msg:"Updated AgentScheduler queue flush logic",     author:"병권",  date:"03/30 14:30", branch:"fix/scheduler",  col:3, row:7 },
  { id:"c9",  hash:"c3d7e8f", msg:"Merge fix/scheduler → feat/agent-retry",       author:"Admin", date:"03/30 13:00", branch:"feat/agent-retry",col:1, row:8, mergeFrom:"fix/scheduler" },
  { id:"c10", hash:"d4e8f9a", msg:"Agent retry with exponential backoff",          author:"병권",  date:"03/29 21:00", branch:"feat/agent-retry",col:1, row:9 },
  { id:"c11", hash:"e5f0a1b", msg:"Initial agent retry scaffold",                  author:"병권",  date:"03/29 18:00", branch:"feat/agent-retry",col:1, row:10 },
  { id:"c12", hash:"f6a1b2c", msg:"WIP: JWT auth middleware draft",                author:"병권",  date:"03/29 08:15", branch:"feat/jwt",        col:2, row:11 },
  { id:"c13", hash:"a7b2c3d", msg:"Initial project setup — Spring Boot 3.2.5",    author:"Admin", date:"03/29 10:00", branch:"main",           col:0, row:12, tags:["initial"] },
];

const MAX_COL = Math.max(...COMMITS.map(c => c.col));
const CELL_W  = 28;   // 열 간격
const CELL_H  = 42;   // 행 간격
const DOT_R   = 5;    // 커밋 점 반지름
const SVG_W   = (MAX_COL + 1) * CELL_W + 12;
const SVG_H   = COMMITS.length * CELL_H + 16;

function getBranchColor(branchName: string): string {
  const b = BRANCHES.find(b => b.name === branchName);
  return b?.color ?? BRANCH_COLORS[0];
}

function getColX(col: number) {
  return 8 + col * CELL_W;
}

function getRowY(row: number) {
  return 12 + row * CELL_H;
}

// ── SVG 브랜치 그래프 ──
function BranchGraph({ selectedCommit, onSelect }: {
  selectedCommit: string | null;
  onSelect: (id: string) => void;
}) {
  // 연결선 그리기
  const lines: JSX.Element[] = [];
  const commitMap = new Map(COMMITS.map(c => [c.id, c]));
  const branchLastCommit = new Map<string, CommitNode>();

  // 브랜치별 마지막 커밋 추적 (위 → 아래 순서)
  for (let i = COMMITS.length - 1; i >= 0; i--) {
    const c = COMMITS[i];
    if (!branchLastCommit.has(c.branch)) {
      branchLastCommit.set(c.branch, c);
    }
  }

  // 세로선 (같은 브랜치의 연속 커밋 연결)
  for (let i = 0; i < COMMITS.length - 1; i++) {
    const curr = COMMITS[i];
    const next = COMMITS[i + 1];
    // 같은 브랜치 연결
    const sameBranchNext = COMMITS.slice(i + 1).find(c => c.branch === curr.branch);
    if (sameBranchNext) {
      const x  = getColX(curr.col);
      const y1 = getRowY(curr.row);
      const y2 = getRowY(sameBranchNext.row);
      const color = getBranchColor(curr.branch);
      lines.push(
        <line
          key={`v-${curr.id}-${sameBranchNext.id}`}
          x1={x} y1={y1} x2={x} y2={y2}
          stroke={color} strokeWidth={2} strokeOpacity={0.7}
        />
      );
    }
  }

  // 머지 곡선
  COMMITS.filter(c => c.mergeFrom).forEach(c => {
    // 머지된 브랜치의 마지막 커밋 찾기
    const fromCommits = COMMITS.filter(cc => cc.branch === c.mergeFrom);
    if (fromCommits.length === 0) return;
    // 머지 직전 커밋 (row가 c.row 이후인 것 중 첫 번째)
    const fromCommit = fromCommits.find(cc => cc.row > c.row);
    if (!fromCommit) return;

    const x1 = getColX(fromCommit.col);
    const y1 = getRowY(fromCommit.row);
    const x2 = getColX(c.col);
    const y2 = getRowY(c.row);
    const color = getBranchColor(c.mergeFrom!);

    // 베지어 곡선
    const cx1 = x1;
    const cy1 = y1 - (y1 - y2) / 2;
    const cx2 = x2;
    const cy2 = y2 + (y1 - y2) / 2;

    lines.push(
      <path
        key={`merge-${c.id}`}
        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
        stroke={color}
        strokeWidth={1.8}
        strokeOpacity={0.65}
        fill="none"
        strokeDasharray="4 2"
      />
    );
  });

  // 브랜치 분기선 (main → 브랜치 시작점)
  BRANCHES.filter(b => b.name !== "main").forEach(b => {
    const branchFirst = [...COMMITS].reverse().find(c => c.branch === b.name);
    if (!branchFirst) return;
    // main에서 같은 row 근처에서 분기
    const mainNear = COMMITS.filter(c => c.branch === "main" && c.row >= branchFirst.row);
    if (mainNear.length === 0) return;
    const mainRef  = mainNear[mainNear.length - 1];

    const x1 = getColX(0);
    const y1 = getRowY(mainRef.row);
    const x2 = getColX(b.col);
    const y2 = getRowY(branchFirst.row);

    lines.push(
      <path
        key={`branch-${b.name}`}
        d={`M ${x1} ${y1} Q ${x1} ${y2}, ${x2} ${y2}`}
        stroke={b.color}
        strokeWidth={1.8}
        strokeOpacity={0.50}
        fill="none"
      />
    );
  });

  return (
    <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible" }}>
      {lines}
      {COMMITS.map(c => {
        const x     = getColX(c.col);
        const y     = getRowY(c.row);
        const color = getBranchColor(c.branch);
        const isSel = selectedCommit === c.id;
        const isMrg = !!c.mergeFrom;

        return (
          <g key={c.id} style={{ cursor: "pointer" }} onClick={() => onSelect(c.id)}>
            {/* 선택 강조 링 */}
            {isSel && (
              <circle cx={x} cy={y} r={DOT_R + 4} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.35} />
            )}
            {/* 커밋 점 */}
            <circle
              cx={x} cy={y} r={DOT_R}
              fill={isMrg ? "white" : color}
              stroke={color}
              strokeWidth={isMrg ? 2 : 0}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── 브랜치 추가 모달 ──
function AddBranchModal({ onAdd, onClose }: { onAdd: (name: string, from: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("main");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "rgba(252,252,251,0.98)", border: `1px solid ${BORDER}`, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(224,231,255,0.6), rgba(232,213,245,0.5))",
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,91,255,0.15)" }}>
            <GitBranch className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>새 브랜치 추가</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>브랜치 이름</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="feat/new-feature"
              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "60")}
              onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>베이스 브랜치</label>
            <select
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
            >
              {BRANCHES.filter(b => b.active).map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
            >
              취소
            </button>
            <button
              onClick={() => { if (name.trim()) { onAdd(name.trim(), from); onClose(); } }}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{
                background: name.trim()
                  ? "linear-gradient(135deg, #635bff, #8b5cf6)"
                  : "rgba(0,0,0,0.07)",
                color: name.trim() ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
                boxShadow: name.trim() ? "0 4px 14px rgba(99,91,255,0.28)" : "none",
              }}
            >
              브랜치 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// 메인 BranchVisualization
// ══════════════════════════════════════════
export function BranchVisualization({ onClose }: { onClose?: () => void }) {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [branches,   setBranches]   = useState<BranchMeta[]>(BRANCHES);
  const [showAdd,    setShowAdd]    = useState(false);
  const [filterBranch, setFilterBranch] = useState<string | null>(null);

  const selectedCommit = COMMITS.find(c => c.id === selected);

  const handleAddBranch = (name: string, from: string) => {
    const newBranch: BranchMeta = {
      name,
      color:   BRANCH_COLORS[branches.length % BRANCH_COLORS.length],
      col:     branches.length,
      commits: 0,
      active:  true,
      created: new Date().toLocaleDateString("ko-KR"),
    };
    setBranches(prev => [...prev, newBranch]);
  };

  const filteredCommits = filterBranch
    ? COMMITS.filter(c => c.branch === filterBranch)
    : COMMITS;

  const activeBranches  = branches.filter(b => b.active).length;
  const mergedBranches  = branches.filter(b => b.merged).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}
      >
        <GitBranch className="w-4 h-4" style={{ color: "#8b949e" }} />
        <p className="text-[11px] font-semibold" style={{ color: "#c9d1d9" }}>Branch Graph</p>

        {/* 요약 뱃지 */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#3fb950" }}>
            {activeBranches} active
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(99,91,255,0.15)", color: "#a5a0ff" }}>
            {mergedBranches} merged
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "#8b949e" }}>
            {COMMITS.length} commits
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: "rgba(99,91,255,0.20)", color: "#a5a0ff" }}
          >
            <Plus className="w-3 h-3" /> 새 브랜치
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
            >
              <X className="w-3.5 h-3.5" style={{ color: "#8b949e" }} />
            </button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── 왼쪽: 브랜치 목록 ── */}
        <div
          className="flex flex-col shrink-0 overflow-y-auto"
          style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.06)", background: "#161b22" }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#484f58" }}>
              BRANCHES ({branches.length})
            </p>
          </div>
          {/* 전체 보기 */}
          <button
            onClick={() => setFilterBranch(null)}
            className="flex items-center gap-2 px-3 py-2 transition-all text-left"
            style={{
              background: filterBranch === null ? "rgba(99,91,255,0.12)" : "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <GitCommit className="w-3 h-3 shrink-0" style={{ color: "#8b949e" }} />
            <span className="text-[10px]" style={{ color: filterBranch === null ? "#a5a0ff" : "#8b949e" }}>
              All branches
            </span>
          </button>
          {branches.map(b => (
            <button
              key={b.name}
              onClick={() => setFilterBranch(filterBranch === b.name ? null : b.name)}
              className="flex items-start gap-2 px-3 py-2 transition-all text-left"
              style={{
                background: filterBranch === b.name ? `${b.color}18` : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: b.color }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-medium truncate"
                  style={{ color: filterBranch === b.name ? b.color : "#c9d1d9" }}
                >
                  {b.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[8px]" style={{ color: "#484f58" }}>
                    {b.commits} commits
                  </span>
                  <span
                    className="text-[8px] px-1 py-0.5 rounded"
                    style={{
                      background: b.active ? "rgba(16,185,129,0.12)" : "rgba(139,92,246,0.12)",
                      color:      b.active ? "#3fb950"               : "#a371f7",
                    }}
                  >
                    {b.active ? "active" : "merged"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── 가운데: 그래프 ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto" style={{ background: "#0d1117" }}>
            <div className="flex" style={{ minHeight: SVG_H + 32 }}>
              {/* SVG 그래프 */}
              <div className="shrink-0 pt-3 pl-2" style={{ width: SVG_W + 24 }}>
                <BranchGraph
                  selectedCommit={selected}
                  onSelect={id => setSelected(prev => prev === id ? null : id)}
                />
              </div>

              {/* 커밋 메시지 목록 */}
              <div className="flex-1 pt-3">
                {COMMITS.map(c => {
                  const color  = getBranchColor(c.branch);
                  const isSel  = selected === c.id;
                  const isMrg  = !!c.mergeFrom;
                  const hidden = filterBranch && c.branch !== filterBranch;

                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 pr-4 cursor-pointer transition-all"
                      style={{
                        height:     CELL_H,
                        background: isSel ? `${color}12` : "transparent",
                        opacity:    hidden ? 0.2 : 1,
                        borderLeft: isSel ? `2px solid ${color}` : "2px solid transparent",
                      }}
                      onClick={() => setSelected(prev => prev === c.id ? null : c.id)}
                    >
                      {/* 커밋 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 해시 */}
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: `${color}20`, color }}
                          >
                            #{c.hash.slice(0, 7)}
                          </span>
                          {/* 태그 */}
                          {c.tags?.map(tag => (
                            <span
                              key={tag}
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                              style={{ background: "rgba(56,139,253,0.15)", color: "#58a6ff" }}
                            >
                              {tag}
                            </span>
                          ))}
                          {/* 머지 아이콘 */}
                          {isMrg && (
                            <GitMerge className="w-3 h-3 shrink-0" style={{ color: "#a371f7" }} />
                          )}
                        </div>
                        <p
                          className="text-[11px] mt-0.5 truncate"
                          style={{ color: isSel ? "#e6edf3" : "#8b949e" }}
                        >
                          {c.msg}
                        </p>
                      </div>

                      {/* 메타 */}
                      <div className="flex items-center gap-2 shrink-0 text-[9px]" style={{ color: "#484f58" }}>
                        <span className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> {c.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {c.date}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 선택된 커밋 상세 ── */}
        {selectedCommit && (
          <div
            className="flex flex-col shrink-0 overflow-y-auto"
            style={{
              width: 220,
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              background: "#161b22",
            }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#484f58" }}>
                COMMIT DETAIL
              </p>
            </div>
            <div className="p-3 space-y-3">
              {/* 해시 */}
              <div>
                <p className="text-[8px] mb-1" style={{ color: "#484f58" }}>HASH</p>
                <span
                  className="text-[10px] font-mono px-2 py-1 rounded"
                  style={{ background: `${getBranchColor(selectedCommit.branch)}18`, color: getBranchColor(selectedCommit.branch) }}
                >
                  {selectedCommit.hash}
                </span>
              </div>
              {/* 메시지 */}
              <div>
                <p className="text-[8px] mb-1" style={{ color: "#484f58" }}>MESSAGE</p>
                <p className="text-[11px] leading-snug" style={{ color: "#c9d1d9" }}>
                  {selectedCommit.msg}
                </p>
              </div>
              {/* 브랜치 */}
              <div>
                <p className="text-[8px] mb-1" style={{ color: "#484f58" }}>BRANCH</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: getBranchColor(selectedCommit.branch) }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: "#c9d1d9" }}>
                    {selectedCommit.branch}
                  </span>
                </div>
              </div>
              {/* 작성자 + 날짜 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px]">
                  <span style={{ color: "#484f58" }}>Author</span>
                  <span style={{ color: "#c9d1d9" }}>{selectedCommit.author}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span style={{ color: "#484f58" }}>Date</span>
                  <span style={{ color: "#c9d1d9" }}>{selectedCommit.date}</span>
                </div>
              </div>
              {/* 머지 정보 */}
              {selectedCommit.mergeFrom && (
                <div>
                  <p className="text-[8px] mb-1" style={{ color: "#484f58" }}>MERGED FROM</p>
                  <div className="flex items-center gap-1.5">
                    <GitMerge className="w-3 h-3" style={{ color: "#a371f7" }} />
                    <span className="text-[10px] font-mono" style={{ color: "#a371f7" }}>
                      {selectedCommit.mergeFrom}
                    </span>
                  </div>
                </div>
              )}
              {/* 태그 */}
              {selectedCommit.tags && selectedCommit.tags.length > 0 && (
                <div>
                  <p className="text-[8px] mb-1.5" style={{ color: "#484f58" }}>TAGS</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCommit.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(56,139,253,0.15)", color: "#58a6ff" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddBranchModal
          onAdd={handleAddBranch}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}