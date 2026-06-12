import { useState, useEffect, useRef, useCallback } from "react";
import {
  GitBranch, GitMerge, GitCommit, Plus, X,
  Circle, ChevronRight, Clock, User,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, BRANCH_COLORS,
} from "../colors";

// ── 🚨 [추가] 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

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
  name:    string;
  color:   string;
  col:     number;
  commits: number;
  active:  boolean;
  created: string;
  merged?: string;
};

// ── 더미 브랜치 메타 ──
const BRANCHES: BranchMeta[] = [
  { name: "main",         color: BRANCH_COLORS[0], col: 0, commits: 12, active: true,  created: "2025-03-20" },
  { name: "feat/multi-agent",color: BRANCH_COLORS[1], col: 1, commits: 6,  active: false, created: "2025-03-25", merged: "2025-03-31" },
  { name: "fix/toolchain",   color: BRANCH_COLORS[2], col: 2, commits: 2,  active: false, created: "2025-03-30", merged: "2025-03-31" },
  { name: "feat/agent-retry",color: BRANCH_COLORS[3], col: 1, commits: 4,  active: false, created: "2025-03-29", merged: "2025-03-30" },
  { name: "feat/jwt",        color: BRANCH_COLORS[4], col: 2, commits: 3,  active: true,  created: "2025-03-28" },
  { name: "fix/scheduler",   color: BRANCH_COLORS[5], col: 3, commits: 2,  active: false, created: "2025-03-30", merged: "2025-03-30" },
];

// ── 더미 커밋 그래프 데이터 ──
const COMMITS: CommitNode[] = [
  { id:"c1",  hash:"a3f9d21", msg:"Refactored Multi-Agent communication logic",   author:"병권",  date:"03/31 14:22", branch:"main",           col:0, row:0, tags:["HEAD","main"] },
  { id:"c2",  hash:"b7c3e18", msg:"Merge fix/toolchain → main",                 author:"병권",  date:"03/31 11:05", branch:"main",           col:0, row:1, mergeFrom:"fix/toolchain" },
  { id:"c3",  hash:"d2a1f45", msg:"Fixed JDK 17 toolchain issue in settings.gradle", author:"병권", date:"03/31 10:50", branch:"fix/toolchain", col:2, row:2 },
  { id:"c4",  hash:"e5b8c72", msg:"Merge feat/multi-agent → main",               author:"Admin", date:"03/31 09:00", branch:"main",           col:0, row:3, mergeFrom:"feat/multi-agent" },
  { id:"c5",  hash:"f1d7a09", msg:"Added DataSyncAgent retry mechanism",          author:"병권",  date:"03/30 19:47", branch:"feat/multi-agent",col:1, row:4 },
  { id:"c6",  hash:"90c2b55", msg:"MultiAgentController dispatch refactor",        author:"Admin", date:"03/30 16:00", branch:"feat/multi-agent",col:1, row:5 },
  { id:"c7",  hash:"a1b3c4d", msg:"Merge feat/agent-retry → main",               author:"병권",  date:"03/30 15:00", branch:"main",           col:0, row:6, mergeFrom:"feat/agent-retry" },
  { id:"c8",  hash:"b2c5d6e", msg:"Updated AgentScheduler queue flush logic",     author:"병권",  date:"03/30 14:30", branch:"fix/scheduler",  col:3, row:7 },
  { id:"c9",  hash:"c3d7e8f", msg:"Merge fix/scheduler → feat/agent-retry",       author:"Admin", date:"03/30 13:00", branch:"feat/agent-retry",col:1, row:8, mergeFrom:"fix/scheduler" },
  { id:"c10", hash:"d4e8f9a", msg:"Agent retry with exponential backoff",         author:"병권",  date:"03/29 21:00", branch:"feat/agent-retry",col:1, row:9 },
  { id:"c11", hash:"e5f0a1b", msg:"Initial agent retry scaffold",                 author:"병권",  date:"03/29 18:00", branch:"feat/agent-retry",col:1, row:10 },
  { id:"c12", hash:"f6a1b2c", msg:"WIP: JWT auth middleware draft",                author:"병권",  date:"03/29 08:15", branch:"feat/jwt",       col:2, row:11 },
  { id:"c13", hash:"a7b2c3d", msg:"Initial project setup — Spring Boot 3.2.5",    author:"Admin", date:"03/29 10:00", branch:"main",           col:0, row:12, tags:["initial"] },
];

const MAX_COL = Math.max(...COMMITS.map(c => c.col));
const CELL_W  = 28;
const CELL_H  = 42;
const DOT_R   = 5;
const SVG_W   = (MAX_COL + 1) * CELL_W + 12;
const SVG_H   = COMMITS.length * CELL_H + 16;

function getBranchColor(branchName: string): string {
  const b = BRANCHES.find(b => b.name === branchName);
  return b?.color ?? BRANCH_COLORS[0];
}

function getColX(col: number) { return 8 + col * CELL_W; }
function getRowY(row: number) { return 12 + row * CELL_H; }

// ── SVG 브랜치 그래프 ──
function BranchGraph({ selectedCommit, onSelect }: {
  selectedCommit: string | null;
  onSelect: (id: string) => void;
}) {
  const lines: JSX.Element[] = [];
  
  // (생략된 연결선/그래프 그리기 로직은 동일)
  for (let i = 0; i < COMMITS.length - 1; i++) {
    const curr = COMMITS[i];
    const sameBranchNext = COMMITS.slice(i + 1).find(c => c.branch === curr.branch);
    if (sameBranchNext) {
      lines.push(<line key={`v-${curr.id}`} x1={getColX(curr.col)} y1={getRowY(curr.row)} x2={getColX(sameBranchNext.col)} y2={getRowY(sameBranchNext.row)} stroke={getBranchColor(curr.branch)} strokeWidth={2} strokeOpacity={0.7} />);
    }
  }

  return (
    <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible" }}>
      {lines}
      {COMMITS.map(c => {
        const x = getColX(c.col);
        const y = getRowY(c.row);
        const color = getBranchColor(c.branch);
        return (
          <circle key={c.id} cx={x} cy={y} r={DOT_R} fill={color} onClick={() => onSelect(c.id)} style={{ cursor: "pointer" }} />
        );
      })}
    </svg>
  );
}

// ── 메인 BranchVisualization ──
export function BranchVisualization({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [branches] = useState<BranchMeta[]>(BRANCHES);
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  
  // 🚨 [스켈레톤 관리]
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const selectedCommit = COMMITS.find(c => c.id === selected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#161b22" }}>
        <GitBranch className="w-4 h-4" style={{ color: "#8b949e" }} />
        <p className="text-[11px] font-semibold" style={{ color: "#c9d1d9" }}>Branch Graph</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── 좌측: 브랜치 목록 ── */}
        <div className="flex flex-col shrink-0 overflow-y-auto" style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.06)", background: "#161b22" }}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-3">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : (
            branches.map(b => (
              <button key={b.name} onClick={() => setFilterBranch(filterBranch === b.name ? null : b.name)}
                className="flex items-start gap-2 px-3 py-2 text-left" style={{ background: filterBranch === b.name ? `${b.color}18` : "transparent" }}>
                <div className="w-2.5 h-2.5 rounded-full mt-0.5" style={{ background: b.color }} />
                <span className="text-[10px]" style={{ color: filterBranch === b.name ? b.color : "#c9d1d9" }}>{b.name}</span>
              </button>
            ))
          )}
        </div>

        {/* ── 중앙: 그래프 ── */}
        <div className="flex-1 overflow-auto bg-[#0d1117]">
          {isLoading ? (
            <div className="p-4 space-y-4">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="flex gap-4 items-center">
                   <Skeleton className="w-6 h-6 rounded-full" />
                   <Skeleton className="h-4 w-64" />
                 </div>
               ))}
            </div>
          ) : (
            <div className="pt-3 pl-2" style={{ width: SVG_W + 24 }}>
              <BranchGraph selectedCommit={selected} onSelect={setSelected} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}