import { useState, useMemo, useEffect } from "react";
import {
  GitBranch,
  Copy,
  Check,
  Search,
  User,
  Clock,
  Tag,
  Loader2,
  AlertCircle,
  GitMerge,
} from "lucide-react";
import { TERM_BG, TERM_HEADER, TERM_TEXT, TERM_MUTED, UI_AMBER } from "../colors";
import {
  fetchProjectBranchGraph,
  type ProjectGitBranchGraph,
  type ProjectGitCommitNode,
} from "../lib/api";

// ── 브랜치 색상 팔레트 ──
const BRANCH_PALETTE = [
  "#10b981", // Emerald
  "#38bdf8", // Sky Blue
  "#a855f7", // Purple
  UI_AMBER,  // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#6366f1", // Indigo
];

const AVATAR_PALETTE = ["#62683A", "#0284c7", "#8b5cf6", "#0d9488", "#b45309", "#be123c"];

const ROW_HEIGHT = 56;
const COL_WIDTH = 26;
const START_X = 24;
const START_Y = 28;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function primaryBranch(node: ProjectGitCommitNode, currentBranch: string | null): string {
  return node.branchNames[0] ?? currentBranch ?? "main";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export function BranchVisualization({ projectId }: { projectId?: number | null }) {
  const [graph, setGraph] = useState<ProjectGitBranchGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchProjectBranchGraph(projectId, { maxCount: 60, includeRemote: true })
      .then((res) => {
        if (cancelled) return;
        setGraph(res);
        setSelectedCommitHash((prev) => prev ?? res.nodes[0]?.commitHash ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "브랜치 그래프를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const branchColorOf = useMemo(() => {
    const order = graph?.branches.map((b) => b.name) ?? [];
    return (branchName: string) => {
      const idx = order.indexOf(branchName);
      return BRANCH_PALETTE[(idx >= 0 ? idx : hashString(branchName)) % BRANCH_PALETTE.length];
    };
  }, [graph]);

  const avatarColorOf = (authorName: string) => AVATAR_PALETTE[hashString(authorName) % AVATAR_PALETTE.length];

  const parentEdgesFor = (commitHash: string) => graph?.edges.filter((e) => e.to === commitHash) ?? [];

  const filteredCommits = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      const matchBranch = selectedBranch === "all" || n.branchNames.includes(selectedBranch);
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        n.message.toLowerCase().includes(q) ||
        n.authorName.toLowerCase().includes(q) ||
        n.shortCommitHash.toLowerCase().includes(q) ||
        n.branchNames.some((b) => b.toLowerCase().includes(q));
      return matchBranch && matchSearch;
    });
  }, [graph, selectedBranch, searchQuery]);

  const selectedCommit = useMemo(
    () => graph?.nodes.find((n) => n.commitHash === selectedCommitHash) ?? filteredCommits[0] ?? null,
    [graph, selectedCommitHash, filteredCommits]
  );

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const maxCol = Math.max(...(graph?.nodes.map((n) => n.x ?? 0) ?? [0]), 3);
  const svgHeight = filteredCommits.length * ROW_HEIGHT + 40;
  const svgWidth = START_X + (maxCol + 1) * COL_WIDTH + 20;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ background: TERM_BG }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: TERM_MUTED }} />
        <p className="text-[11px]" style={{ color: TERM_MUTED }}>브랜치 그래프를 불러오는 중...</p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ background: TERM_BG }}>
        <GitBranch className="w-6 h-6" style={{ color: TERM_MUTED }} />
        <p className="text-[11px]" style={{ color: TERM_MUTED }}>프로젝트를 선택하면 브랜치 그래프가 표시됩니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center" style={{ background: TERM_BG }}>
        <AlertCircle className="w-6 h-6 text-rose-400" />
        <p className="text-[11px] text-rose-400">{error}</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ background: TERM_BG }}>
        <GitBranch className="w-6 h-6" style={{ color: TERM_MUTED }} />
        <p className="text-[11px]" style={{ color: TERM_MUTED }}>이 프로젝트의 로컬 저장소에 커밋 히스토리가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: TERM_BG }}>
      {/* ── 상단 툴바 ── */}
      <div
        className="flex items-center gap-3 px-5 h-12 shrink-0 select-none"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: TERM_HEADER,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              Git Branch Railway Graph
              {graph.currentBranch && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-gray-300">
                  {graph.currentBranch}
                </span>
              )}
            </h2>
            <p className="text-[10px] text-gray-400">
              프로젝트 로컬 저장소의 실제 브랜치 분기 및 머지 히스토리
            </p>
          </div>
        </div>

        {/* 브랜치 필터 알약 버튼들 */}
        <div className="ml-6 flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 overflow-x-auto">
          <button
            onClick={() => setSelectedBranch("all")}
            className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap"
            style={{
              background: selectedBranch === "all" ? "rgba(255,255,255,0.15)" : "transparent",
              color: selectedBranch === "all" ? "#ffffff" : TERM_MUTED,
            }}
          >
            All Branches ({graph.nodes.length})
          </button>
          {graph.branches.slice(0, 5).map((b) => (
            <button
              key={b.name}
              onClick={() => setSelectedBranch(b.name)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: selectedBranch === b.name ? `${branchColorOf(b.name)}25` : "transparent",
                color: selectedBranch === b.name ? branchColorOf(b.name) : TERM_MUTED,
                border: selectedBranch === b.name ? `1px solid ${branchColorOf(b.name)}40` : "1px solid transparent",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: branchColorOf(b.name) }} />
              {b.name}
            </button>
          ))}
        </div>

        {/* 검색 인풋 */}
        <div className="ml-auto relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="커밋 메시지, 작성자, 해시 검색..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-[11px] bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500 outline-none focus:border-emerald-500/50 w-52 transition-all"
          />
        </div>
      </div>

      {/* ── 메인 콘텐츠: 좌측 그래프+목록 & 우측 커밋 상세 서랍 ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── 좌측: 인터랙티브 Git Railway + 커밋 리스트 ── */}
        <div className="flex-1 flex overflow-y-auto relative select-none">
          {/* 1. SVG Railway 트랙 영역 */}
          <div className="shrink-0 relative sticky top-0" style={{ width: svgWidth }}>
            <svg width={svgWidth} height={svgHeight} className="overflow-visible">
              <defs>
                <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1-1. 레일 가이드 배경 라인 */}
              {Array.from({ length: maxCol + 1 }).map((_, colIdx) => (
                <line
                  key={`rail-${colIdx}`}
                  x1={START_X + colIdx * COL_WIDTH}
                  y1={0}
                  x2={START_X + colIdx * COL_WIDTH}
                  y2={svgHeight}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
              ))}

              {/* 1-2. 커밋 간 베지어 곡선 연결선 (Branch Lines) */}
              {filteredCommits.map((curr, idx) => {
                const currCol = curr.x ?? 0;
                const currX = START_X + currCol * COL_WIDTH;
                const currY = START_Y + idx * ROW_HEIGHT;
                const currBranch = primaryBranch(curr, graph.currentBranch);
                const currColor = branchColorOf(currBranch);

                const nextSameBranchIdx = filteredCommits.findIndex(
                  (c, i) => i > idx && (primaryBranch(c, graph.currentBranch) === currBranch || (c.x ?? 0) === currCol)
                );

                const lines = [];

                // 같은 브랜치 수직선
                if (nextSameBranchIdx !== -1) {
                  const nextY = START_Y + nextSameBranchIdx * ROW_HEIGHT;
                  lines.push(
                    <line
                      key={`vertical-${curr.commitHash}-${nextSameBranchIdx}`}
                      x1={currX}
                      y1={currY}
                      x2={currX}
                      y2={nextY}
                      stroke={currColor}
                      strokeWidth={2.5}
                      strokeOpacity={0.8}
                    />
                  );
                }

                // 머지 연결선 (Curved Bezier) - 부모가 2개 이상이면 두 번째 부모부터 머지선으로 그린다
                const parents = parentEdgesFor(curr.commitHash);
                if (parents.length > 1) {
                  parents.slice(1).forEach((edge) => {
                    const parentIdx = filteredCommits.findIndex((c) => c.commitHash === edge.from);
                    if (parentIdx !== -1) {
                      const parentCommit = filteredCommits[parentIdx];
                      const parentX = START_X + (parentCommit.x ?? 0) * COL_WIDTH;
                      const parentY = START_Y + parentIdx * ROW_HEIGHT;
                      const mergeColor = branchColorOf(primaryBranch(parentCommit, graph.currentBranch));

                      const midY = (currY + parentY) / 2;
                      const pathData = `M ${parentX} ${parentY} C ${parentX} ${midY}, ${currX} ${midY}, ${currX} ${currY}`;

                      lines.push(
                        <path
                          key={`merge-${curr.commitHash}-${edge.from}`}
                          d={pathData}
                          fill="none"
                          stroke={mergeColor}
                          strokeWidth={2.2}
                          strokeDasharray="4 2"
                          strokeOpacity={0.85}
                        />
                      );
                    }
                  });
                }

                return <g key={`group-lines-${curr.commitHash}`}>{lines}</g>;
              })}

              {/* 1-3. 커밋 노드 점(Circle) 및 강조 링 */}
              {filteredCommits.map((commit, idx) => {
                const cx = START_X + (commit.x ?? 0) * COL_WIDTH;
                const cy = START_Y + idx * ROW_HEIGHT;
                const color = branchColorOf(primaryBranch(commit, graph.currentBranch));
                const isSelected = commit.commitHash === selectedCommitHash;
                const isMerge = parentEdgesFor(commit.commitHash).length > 1;

                return (
                  <g
                    key={`node-${commit.commitHash}`}
                    className="cursor-pointer transition-transform duration-150"
                    onClick={() => setSelectedCommitHash(commit.commitHash)}
                  >
                    {/* 선택 시 발광 링 */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={12}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.6}
                        filter="url(#node-glow)"
                      />
                    )}

                    {/* 노드 외곽 흰 테두리 */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isMerge ? 7 : 6}
                      fill={TERM_BG}
                      stroke={color}
                      strokeWidth={isMerge ? 3 : 2.5}
                    />

                    {/* 노드 중심부 */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isMerge ? 3.5 : 3}
                      fill={color}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 2. 커밋 리스트 행들 (우측 텍스트 정렬) */}
          <div className="flex-1 min-w-0 pr-4">
            {filteredCommits.map((commit) => {
              const isSelected = commit.commitHash === selectedCommitHash;
              const branch = primaryBranch(commit, graph.currentBranch);
              const color = branchColorOf(branch);
              const currentBranchInfo = graph.branches.find((b) => b.current);
              const isHead = Boolean(currentBranchInfo && currentBranchInfo.lastCommitHash === commit.commitHash);

              return (
                <div
                  key={commit.commitHash}
                  onClick={() => setSelectedCommitHash(commit.commitHash)}
                  className="flex items-center gap-3 px-3 cursor-pointer transition-all border-b border-white/[0.04] hover:bg-white/[0.03]"
                  style={{
                    height: ROW_HEIGHT,
                    background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
                    borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                  }}
                >
                  {/* 브랜치 뱃지 */}
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold shrink-0"
                    style={{
                      background: `${color}18`,
                      color: color,
                      border: `1px solid ${color}35`,
                    }}
                  >
                    {branch}
                  </span>

                  {/* HEAD 뱃지 */}
                  {isHead && (
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 flex items-center gap-1"
                      style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid #10b98150" }}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      HEAD
                    </span>
                  )}

                  {/* 커밋 메시지 */}
                  <span
                    className="flex-1 min-w-0 text-[12px] font-medium truncate"
                    style={{ color: isSelected ? "#ffffff" : TERM_TEXT }}
                    title={commit.message}
                  >
                    {commit.message}
                  </span>

                  {/* 작성자 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: avatarColorOf(commit.authorName) }}
                    >
                      {commit.authorName.slice(0, 1)}
                    </div>
                    <span className="text-[11px] text-gray-300">{commit.authorName}</span>
                  </div>

                  {/* 시간 */}
                  <span className="text-[10px] text-gray-500 shrink-0 w-16 text-right">
                    {formatTimeAgo(commit.committedAt)}
                  </span>

                  {/* 해시 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(commit.commitHash);
                    }}
                    className="px-2 py-0.5 rounded font-mono text-[10px] text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1 shrink-0"
                    title="해시 복사"
                  >
                    {copiedHash === commit.commitHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {commit.shortCommitHash}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 우측: 선택된 커밋 상세 패널 (Slide-in Drawer) ── */}
        {selectedCommit && (
          <div
            className="w-84 shrink-0 flex flex-col overflow-y-auto"
            style={{
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              background: TERM_HEADER,
            }}
          >
            {/* 헤더 */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    background: `${branchColorOf(primaryBranch(selectedCommit, graph.currentBranch))}20`,
                    color: branchColorOf(primaryBranch(selectedCommit, graph.currentBranch)),
                    border: `1px solid ${branchColorOf(primaryBranch(selectedCommit, graph.currentBranch))}40`,
                  }}
                >
                  {primaryBranch(selectedCommit, graph.currentBranch)}
                </span>
                <button
                  onClick={() => copyToClipboard(selectedCommit.commitHash)}
                  className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                >
                  {copiedHash === selectedCommit.commitHash ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {selectedCommit.shortCommitHash}
                </button>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug mb-3">
                {selectedCommit.message}
              </h3>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>{selectedCommit.authorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>{formatDate(selectedCommit.committedAt)}</span>
                </div>
              </div>

              {selectedCommit.branchNames.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedCommit.branchNames.map((b) => (
                    <span
                      key={b}
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono"
                      style={{ background: "rgba(255,255,255,0.08)", color: TERM_MUTED }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 부모 커밋 (머지 정보) */}
            <div className="p-4 flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Parent Commits ({parentEdgesFor(selectedCommit.commitHash).length})
              </p>

              {parentEdgesFor(selectedCommit.commitHash).length === 0 ? (
                <p className="text-[10px] text-gray-500">최초 커밋입니다 (부모 없음).</p>
              ) : (
                <div className="space-y-1.5">
                  {parentEdgesFor(selectedCommit.commitHash).map((edge) => {
                    const parentNode = graph.nodes.find((n) => n.commitHash === edge.from);
                    return (
                      <div
                        key={edge.from}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer"
                        onClick={() => setSelectedCommitHash(edge.from)}
                      >
                        <GitMerge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-200 truncate">
                            {parentNode?.message ?? edge.from.slice(0, 7)}
                          </p>
                          <p className="text-[9px] font-mono text-gray-500">{edge.from.slice(0, 7)} · {edge.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[9px] text-gray-600 mt-4">
                파일별 변경 내역은 이 그래프 뷰에서는 제공되지 않습니다. 좌측 상단 파일 목록에서 현재 작업 트리의 변경 파일을 확인하세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
