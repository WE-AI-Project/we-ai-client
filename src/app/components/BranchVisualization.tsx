import { useState, useMemo } from "react";
import {
  GitBranch,
  GitMerge,
  GitCommit,
  Copy,
  Check,
  Search,
  Filter,
  User,
  Clock,
  ChevronRight,
  X,
  FileCode,
  Tag,
  ArrowUpRight,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  BORDER,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_LABEL,
  ACCENT,
  ACCENT_BG,
} from "../colors";

// ── 브랜치 색상 팔레트 ──
const BRANCH_PALETTE = [
  "#10b981", // Emerald (main)
  "#38bdf8", // Sky Blue (feat/multi-agent)
  "#a855f7", // Purple (feat/chat-room)
  "#f59e0b", // Amber (fix/toolchain)
  "#ec4899", // Pink (feat/ai-qa)
  "#06b6d4", // Cyan (feat/split-view)
  "#f43f5e", // Rose (fix/scheduler)
  "#6366f1", // Indigo (chore/release)
];

type CommitNode = {
  id: string;
  hash: string;
  shortHash: string;
  msg: string;
  author: string;
  authorAvatarBg: string;
  date: string;
  timeAgo: string;
  branch: string;
  col: number; // 0 = main, 1 = feat, etc.
  parents: string[]; // parent commit ids
  mergeFrom?: string;
  mergeTo?: string;
  tags?: string[];
  changedFiles?: Array<{ name: string; path: string; additions: number; deletions: number; status: "modified" | "added" | "deleted" }>;
};

type BranchInfo = {
  name: string;
  color: string;
  col: number;
  commitsCount: number;
  isDefault?: boolean;
  status: "active" | "merged";
};

const BRANCHES: BranchInfo[] = [
  { name: "main", color: BRANCH_PALETTE[0], col: 0, commitsCount: 15, isDefault: true, status: "active" },
  { name: "feat/split-view", color: BRANCH_PALETTE[5], col: 1, commitsCount: 5, status: "active" },
  { name: "feat/multi-agent", color: BRANCH_PALETTE[1], col: 2, commitsCount: 6, status: "merged" },
  { name: "feat/chat-room", color: BRANCH_PALETTE[2], col: 3, commitsCount: 4, status: "merged" },
  { name: "fix/toolchain", color: BRANCH_PALETTE[3], col: 1, commitsCount: 3, status: "merged" },
  { name: "feat/ai-qa", color: BRANCH_PALETTE[4], col: 2, commitsCount: 4, status: "active" },
  { name: "fix/scheduler", color: BRANCH_PALETTE[6], col: 3, commitsCount: 2, status: "merged" },
];

const COMMITS_DATA: CommitNode[] = [
  {
    id: "c1",
    hash: "a7246138288f30106d9ab5abcbbfa5933b762785",
    shortHash: "a724613",
    msg: "Merge pull request #43 from WE-AI-Project/Chat (실시간 채팅 및 문서 브리핑)",
    author: "시연용 마스터",
    authorAvatarBg: "#62683A",
    date: "2026-09-01 10:25",
    timeAgo: "25분 전",
    branch: "main",
    col: 0,
    parents: ["c2", "c4"],
    mergeFrom: "feat/chat-room",
    tags: ["HEAD", "origin/main"],
    changedFiles: [
      { name: "ChatPage.tsx", path: "src/app/components/ChatPage.tsx", additions: 48, deletions: 12, status: "modified" },
      { name: "chatStore.ts", path: "src/app/data/chatStore.ts", additions: 22, deletions: 0, status: "added" },
      { name: "api.ts", path: "src/app/lib/api.ts", additions: 15, deletions: 2, status: "modified" },
    ],
  },
  {
    id: "c2",
    hash: "9aa90a7b4c3e1290ff8a992d1948bc01934efa21",
    shortHash: "9aa90a7",
    msg: "feat: Commits 탭 동적 파트 수 분배 및 스플릿 뷰 온/오프 토글 스위치 구현",
    author: "시연용 마스터",
    authorAvatarBg: "#62683A",
    date: "2026-09-01 09:40",
    timeAgo: "1시간 전",
    branch: "feat/split-view",
    col: 1,
    parents: ["c3"],
    tags: ["feat/split-view"],
    changedFiles: [
      { name: "CommitDiffPage.tsx", path: "src/app/components/CommitDiffPage.tsx", additions: 65, deletions: 18, status: "modified" },
      { name: "App.tsx", path: "src/app/App.tsx", additions: 8, deletions: 2, status: "modified" },
    ],
  },
  {
    id: "c3",
    hash: "f314cdb89012a456fe89ab3412cd67ef901234aa",
    shortHash: "f314cdb",
    msg: "Merge pull request #42 from WE-AI-Project/SystemMenu (환경설정 및 시스템 메뉴)",
    author: "병권",
    authorAvatarBg: "#0284c7",
    date: "2026-08-31 18:30",
    timeAgo: "15시간 전",
    branch: "main",
    col: 0,
    parents: ["c5", "c6"],
    mergeFrom: "feat/ai-qa",
    changedFiles: [
      { name: "EnvironmentSettingsPage.tsx", path: "src/app/components/EnvironmentSettingsPage.tsx", additions: 35, deletions: 4, status: "modified" },
      { name: "AIQAPage.tsx", path: "src/app/components/AIQAPage.tsx", additions: 28, deletions: 6, status: "modified" },
    ],
  },
  {
    id: "c4",
    hash: "840ff3581290bb34cd56ea78129034fe890123bb",
    shortHash: "840ff35",
    msg: "feat(chat): 다중 에이전트 AI 토론 및 회의록 자동 브리핑 추출 연동",
    author: "병권",
    authorAvatarBg: "#0284c7",
    date: "2026-08-31 16:15",
    timeAgo: "17시간 전",
    branch: "feat/chat-room",
    col: 3,
    parents: ["c7"],
    changedFiles: [
      { name: "ChatPage.tsx", path: "src/app/components/ChatPage.tsx", additions: 52, deletions: 8, status: "modified" },
      { name: "aiApi.ts", path: "src/api/aiApi.ts", additions: 24, deletions: 3, status: "modified" },
    ],
  },
  {
    id: "c5",
    hash: "63b671890ab45cd89e0123456fa789012345678c",
    shortHash: "63b6718",
    msg: "Merge pull request #41 from WE-AI-Project/ProjectAPI (프로젝트 탈퇴 및 멤버 권한)",
    author: "Admin",
    authorAvatarBg: "#8b5cf6",
    date: "2026-08-31 14:00",
    timeAgo: "19시간 전",
    branch: "main",
    col: 0,
    parents: ["c8", "c9"],
    mergeFrom: "feat/multi-agent",
    changedFiles: [
      { name: "ProjectSettingsPage.tsx", path: "src/app/components/ProjectSettingsPage.tsx", additions: 42, deletions: 9, status: "modified" },
      { name: "api.ts", path: "src/app/lib/api.ts", additions: 30, deletions: 5, status: "modified" },
    ],
  },
  {
    id: "c6",
    hash: "18ea091234fa5678bc901234def567890123456d",
    shortHash: "18ea091",
    msg: "refactor(agent): MultiAgentController 분산 오케스트레이션 및 락 경합 방지",
    author: "시연용 마스터",
    authorAvatarBg: "#62683A",
    date: "2026-08-31 11:20",
    timeAgo: "22시간 전",
    branch: "feat/multi-agent",
    col: 2,
    parents: ["c10"],
    changedFiles: [
      { name: "MultiAgentController.java", path: "src/main/java/com/weai/controller/MultiAgentController.java", additions: 38, deletions: 12, status: "modified" },
      { name: "DataSyncAgent.java", path: "src/main/java/com/weai/agent/DataSyncAgent.java", additions: 31, deletions: 0, status: "added" },
    ],
  },
  {
    id: "c7",
    hash: "9739ea3456bc7890def1234567890abcdef1234e",
    shortHash: "9739ea3",
    msg: "Merge pull request #40 from WE-AI-Project/Calendar (월간 캘린더 복구 및 일정 필터)",
    author: "병권",
    authorAvatarBg: "#0284c7",
    date: "2026-08-30 17:45",
    timeAgo: "1일 전",
    branch: "main",
    col: 0,
    parents: ["c11", "c12"],
    mergeFrom: "fix/toolchain",
    tags: ["v1.2.0"],
    changedFiles: [
      { name: "CalendarPage.tsx", path: "src/app/components/CalendarPage.tsx", additions: 60, deletions: 15, status: "modified" },
      { name: "scheduleStore.ts", path: "src/app/data/scheduleStore.ts", additions: 25, deletions: 4, status: "modified" },
    ],
  },
  {
    id: "c8",
    hash: "205dace1234567890abcdef1234567890abcdef1f",
    shortHash: "205dace",
    msg: "fix(toolchain): Java 17 toolchain 및 Spring Boot 3.2.5 의존성 정렬",
    author: "시연용 마스터",
    authorAvatarBg: "#62683A",
    date: "2026-08-30 15:10",
    timeAgo: "1일 전",
    branch: "fix/toolchain",
    col: 1,
    parents: ["c13"],
    changedFiles: [
      { name: "build.gradle", path: "build.gradle", additions: 8, deletions: 3, status: "modified" },
      { name: "settings.gradle", path: "settings.gradle", additions: 4, deletions: 2, status: "modified" },
    ],
  },
  {
    id: "c9",
    hash: "9d77083456789abcdef1234567890abcdef123456",
    shortHash: "9d77083",
    msg: "Merge pull request #38 from WE-AI-Project/notification (실시간 알림 패널)",
    author: "Admin",
    authorAvatarBg: "#8b5cf6",
    date: "2026-08-29 19:20",
    timeAgo: "2일 전",
    branch: "main",
    col: 0,
    parents: ["c14", "c15"],
    mergeFrom: "fix/scheduler",
    changedFiles: [
      { name: "NotificationPanel.tsx", path: "src/app/components/NotificationPanel.tsx", additions: 40, deletions: 5, status: "modified" },
    ],
  },
  {
    id: "c10",
    hash: "c4173de123456789abcdef0123456789abcdef012",
    shortHash: "c4173de",
    msg: "fix(scheduler): AgentScheduler 큐 플러시 타임아웃 및 재시도 백오프 로직 보완",
    author: "병권",
    authorAvatarBg: "#0284c7",
    date: "2026-08-29 14:00",
    timeAgo: "2일 전",
    branch: "fix/scheduler",
    col: 3,
    parents: ["c16"],
    changedFiles: [
      { name: "AgentScheduler.java", path: "src/main/java/com/weai/scheduler/AgentScheduler.java", additions: 18, deletions: 4, status: "modified" },
    ],
  },
  {
    id: "c11",
    hash: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    shortHash: "a1b2c3d",
    msg: "chore: Initial SynAIpse multi-repository workspace scaffold",
    author: "Admin",
    authorAvatarBg: "#8b5cf6",
    date: "2026-08-28 10:00",
    timeAgo: "3일 전",
    branch: "main",
    col: 0,
    parents: [],
    tags: ["initial"],
    changedFiles: [
      { name: "package.json", path: "package.json", additions: 75, deletions: 0, status: "added" },
      { name: "build.gradle", path: "build.gradle", additions: 55, deletions: 0, status: "added" },
    ],
  },
];

const ROW_HEIGHT = 56;
const COL_WIDTH = 26;
const START_X = 24;
const START_Y = 28;

function getBranchColor(branchName: string): string {
  const b = BRANCHES.find((item) => item.name === branchName);
  return b?.color ?? BRANCH_PALETTE[0];
}

export function BranchVisualization() {
  const [selectedCommitId, setSelectedCommitId] = useState<string>("c1");
  const [selectedBranch, setSelectedBranch] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const selectedCommit = useMemo(() => {
    return COMMITS_DATA.find((c) => c.id === selectedCommitId) ?? COMMITS_DATA[0];
  }, [selectedCommitId]);

  const filteredCommits = useMemo(() => {
    return COMMITS_DATA.filter((c) => {
      const matchBranch = selectedBranch === "all" || c.branch === selectedBranch;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.msg.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.branch.toLowerCase().includes(q);
      return matchBranch && matchSearch;
    });
  }, [selectedBranch, searchQuery]);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const svgHeight = filteredCommits.length * ROW_HEIGHT + 40;
  const maxCol = Math.max(...COMMITS_DATA.map((c) => c.col), 3);
  const svgWidth = START_X + (maxCol + 1) * COL_WIDTH + 20;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
      {/* ── 상단 툴바 ── */}
      <div
        className="flex items-center gap-3 px-5 h-12 shrink-0 select-none"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, #161b22 0%, #0d1117 100%)",
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
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-white/10 text-gray-300">
                WE-AI-Project
              </span>
            </h2>
            <p className="text-[10px] text-gray-400">
              실시간 레포지토리 브랜치 분기 및 머지 히스토리 인터랙티브 시각화
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
              color: selectedBranch === "all" ? "#ffffff" : "#8b949e",
            }}
          >
            All Branches ({COMMITS_DATA.length})
          </button>
          {BRANCHES.slice(0, 5).map((b) => (
            <button
              key={b.name}
              onClick={() => setSelectedBranch(b.name)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: selectedBranch === b.name ? `${b.color}25` : "transparent",
                color: selectedBranch === b.name ? b.color : "#8b949e",
                border: selectedBranch === b.name ? `1px solid ${b.color}40` : "1px solid transparent",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.color }} />
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
                const currX = START_X + curr.col * COL_WIDTH;
                const currY = START_Y + idx * ROW_HEIGHT;
                const currColor = getBranchColor(curr.branch);

                const nextSameBranchIdx = filteredCommits.findIndex(
                  (c, i) => i > idx && (c.branch === curr.branch || c.col === curr.col)
                );

                const lines = [];

                // 같은 브랜치 수직선
                if (nextSameBranchIdx !== -1) {
                  const nextY = START_Y + nextSameBranchIdx * ROW_HEIGHT;
                  lines.push(
                    <line
                      key={`vertical-${curr.id}-${nextSameBranchIdx}`}
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

                // 머지 연결선 (Curved Bezier)
                if (curr.parents && curr.parents.length > 1) {
                  curr.parents.slice(1).forEach((parentId) => {
                    const parentIdx = filteredCommits.findIndex((c) => c.id === parentId);
                    if (parentIdx !== -1) {
                      const parentCommit = filteredCommits[parentIdx];
                      const parentX = START_X + parentCommit.col * COL_WIDTH;
                      const parentY = START_Y + parentIdx * ROW_HEIGHT;
                      const mergeColor = getBranchColor(parentCommit.branch);

                      const midY = (currY + parentY) / 2;
                      const pathData = `M ${parentX} ${parentY} C ${parentX} ${midY}, ${currX} ${midY}, ${currX} ${currY}`;

                      lines.push(
                        <path
                          key={`merge-${curr.id}-${parentId}`}
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

                return <g key={`group-lines-${curr.id}`}>{lines}</g>;
              })}

              {/* 1-3. 커밋 노드 점(Circle) 및 강조 링 */}
              {filteredCommits.map((commit, idx) => {
                const cx = START_X + commit.col * COL_WIDTH;
                const cy = START_Y + idx * ROW_HEIGHT;
                const color = getBranchColor(commit.branch);
                const isSelected = commit.id === selectedCommitId;
                const isMerge = Boolean(commit.mergeFrom);

                return (
                  <g
                    key={`node-${commit.id}`}
                    className="cursor-pointer transition-transform duration-150"
                    onClick={() => setSelectedCommitId(commit.id)}
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
                      fill="#0d1117"
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
            {filteredCommits.map((commit, idx) => {
              const isSelected = commit.id === selectedCommitId;
              const color = getBranchColor(commit.branch);

              return (
                <div
                  key={commit.id}
                  onClick={() => setSelectedCommitId(commit.id)}
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
                    {commit.branch}
                  </span>

                  {/* 태그 / HEAD 뱃지 */}
                  {commit.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 flex items-center gap-1"
                      style={{
                        background: tag.includes("HEAD")
                          ? "rgba(16,185,129,0.2)"
                          : "rgba(255,255,255,0.12)",
                        color: tag.includes("HEAD") ? "#34d399" : "#e2e8f0",
                        border: `1px solid ${tag.includes("HEAD") ? "#10b98150" : "rgba(255,255,255,0.2)"}`,
                      }}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}

                  {/* 커밋 메시지 */}
                  <span
                    className="flex-1 min-w-0 text-[12px] font-medium truncate"
                    style={{ color: isSelected ? "#ffffff" : "#c9d1d9" }}
                    title={commit.msg}
                  >
                    {commit.msg}
                  </span>

                  {/* 작성자 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: commit.authorAvatarBg }}
                    >
                      {commit.author.slice(0, 1)}
                    </div>
                    <span className="text-[11px] text-gray-300">{commit.author}</span>
                  </div>

                  {/* 시간 */}
                  <span className="text-[10px] text-gray-500 shrink-0 w-16 text-right">
                    {commit.timeAgo}
                  </span>

                  {/* 해시 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(commit.hash);
                    }}
                    className="px-2 py-0.5 rounded font-mono text-[10px] text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1 shrink-0"
                    title="해시 복사"
                  >
                    {copiedHash === commit.hash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {commit.shortHash}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 우측: 선택된 커밋 상세 패널 (Slide-in Drawer) ── */}
        <div
          className="w-84 shrink-0 flex flex-col overflow-y-auto"
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            background: "#161b22",
          }}
        >
          {/* 헤더 */}
          <div className="p-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                style={{
                  background: `${getBranchColor(selectedCommit.branch)}20`,
                  color: getBranchColor(selectedCommit.branch),
                  border: `1px solid ${getBranchColor(selectedCommit.branch)}40`,
                }}
              >
                {selectedCommit.branch}
              </span>
              <button
                onClick={() => copyToClipboard(selectedCommit.hash)}
                className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
              >
                {copiedHash === selectedCommit.hash ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {selectedCommit.shortHash}
              </button>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug mb-3">
              {selectedCommit.msg}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span>{selectedCommit.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{selectedCommit.date}</span>
              </div>
            </div>
          </div>

          {/* 변경된 파일 목록 */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Changed Files ({selectedCommit.changedFiles?.length ?? 0})
              </p>
              <div className="text-[10px] font-mono flex items-center gap-1.5">
                <span className="text-emerald-400">
                  +{selectedCommit.changedFiles?.reduce((s, f) => s + f.additions, 0) ?? 0}
                </span>
                <span className="text-rose-400">
                  −{selectedCommit.changedFiles?.reduce((s, f) => s + f.deletions, 0) ?? 0}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {selectedCommit.changedFiles?.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                >
                  <FileCode className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-200 truncate">{file.name}</p>
                    <p className="text-[9px] font-mono text-gray-500 truncate">{file.path}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono shrink-0">
                    {file.additions > 0 && <span className="text-emerald-400">+{file.additions}</span>}
                    {file.deletions > 0 && <span className="text-rose-400">−{file.deletions}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 팁 */}
          <div className="p-3 border-t border-white/10 bg-white/[0.01] text-[10px] text-gray-500 text-center">
            💡 커밋 노드를 클릭하면 해당 커밋의 변경 상세 정보를 실시간으로 확인합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
