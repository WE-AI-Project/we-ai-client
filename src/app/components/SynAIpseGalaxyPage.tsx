import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { GitBranch, Loader2, Network } from "lucide-react";
import { fetchProjectBranchGraph, type ProjectGitBranchGraph } from "../lib/api";

type NodeLevel = "project" | "branch" | "commit";

type GalaxyNode = {
  id: string;
  name: string;
  level: NodeLevel;
  isCurrent: boolean;
  author: string;
  createdAt: string;
  summary: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GalaxyLink = {
  source: string | GalaxyNode;
  target: string | GalaxyNode;
  distance?: number;
};

type GalaxyGraph = {
  nodes: GalaxyNode[];
  links: GalaxyLink[];
};

const THEME = {
  background: "#050604",
  foreground: "#F7F7F2",
  node: "#F5F6F0",
  card: "#11130D",
  border: "rgba(245,246,240,0.14)",
  muted: "#A4A89A",
  primary: "#F5F6F0",
  primaryForeground: "#050604",
  accentCurrent: "#5865F2",
  accentOther: "#A9ACA3",
};

/** 실제 프로젝트의 브랜치 그래프(GET /changes/branches/graph)를 시각화용 그래프 구조로 변환한다. */
function buildGalaxyGraph(data: ProjectGitBranchGraph, projectName: string): GalaxyGraph {
  const nodes: GalaxyNode[] = [];
  const links: GalaxyLink[] = [];
  const nodeIds = new Set<string>();

  const rootId = "project-root";
  nodes.push({
    id: rootId,
    name: projectName,
    level: "project",
    isCurrent: true,
    author: "",
    createdAt: "",
    summary: `현재 브랜치: ${data.currentBranch ?? "—"}`,
  });
  nodeIds.add(rootId);

  data.branches.forEach((branch) => {
    const branchId = `branch-${branch.name}`;
    nodes.push({
      id: branchId,
      name: branch.name,
      level: "branch",
      isCurrent: branch.current,
      author: "",
      createdAt: "",
      summary: branch.lastCommitMessage ?? "커밋 없음",
    });
    nodeIds.add(branchId);
    links.push({ source: rootId, target: branchId, distance: 110 });

    if (branch.lastCommitHash) {
      links.push({ source: branchId, target: branch.lastCommitHash, distance: 40 });
    }
  });

  data.nodes.forEach((commit) => {
    nodes.push({
      id: commit.commitHash,
      name: commit.shortCommitHash,
      level: "commit",
      isCurrent: commit.branchNames.includes(data.currentBranch ?? ""),
      author: commit.authorName,
      createdAt: commit.committedAt,
      summary: commit.message,
    });
    nodeIds.add(commit.commitHash);
  });

  data.edges.forEach((edge) => {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      links.push({ source: edge.from, target: edge.to, distance: 26 });
    }
  });

  // branch -> lastCommitHash 링크 중, 해당 커밋이 nodes에 없는 경우(maxCount로 잘린 경우) 제거
  const validLinks = links.filter((l) => nodeIds.has(typeof l.source === "string" ? l.source : l.source.id) && nodeIds.has(typeof l.target === "string" ? l.target : l.target.id));

  return { nodes, links: validLinks };
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 960, height: 640 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(420, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function nodeRadius(node: GalaxyNode) {
  if (node.level === "project") return 17;
  if (node.level === "branch") return node.isCurrent ? 10 : 8;
  return node.isCurrent ? 5.5 : 4;
}

function getNodeId(node: string | GalaxyNode) {
  return typeof node === "string" ? node : node.id;
}

function nodeLabel(node: GalaxyNode) {
  return node.level === "commit"
    ? `${node.name}\n${node.author}`
    : `${node.name}${node.isCurrent ? " (current)" : ""}`;
}

function levelLabel(level: NodeLevel) {
  if (level === "project") return "Repository";
  if (level === "branch") return "Branch";
  return "Commit";
}

export function SynAIpseGalaxyPage({ projectId, projectName = "Repository" }: { projectId: number; projectName?: string }) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const graphRef = useRef<any>(null);
  const fitTimerRef = useRef<number | null>(null);
  const hasInitialFitRef = useRef(false);
  const ignoreZoomUntilRef = useRef(0);
  const [selected, setSelected] = useState<GalaxyNode | null>(null);

  const [rawData, setRawData] = useState<ProjectGitBranchGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchProjectBranchGraph(projectId, { maxCount: 120 })
      .then((data) => { if (!cancelled) setRawData(data); })
      .catch((err: any) => { if (!cancelled) setError(err?.message || "브랜치/커밋 그래프를 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const graphData = useMemo<GalaxyGraph>(
    () => (rawData ? buildGalaxyGraph(rawData, projectName) : { nodes: [], links: [] }),
    [rawData, projectName]
  );

  const branchCount = rawData?.branches.length ?? 0;
  const commitCount = rawData?.nodes.length ?? 0;

  useEffect(() => {
    if (!graphRef.current) return;

    graphRef.current.d3Force("charge")?.strength(-560);
    graphRef.current.d3Force("center")?.strength(0.018);
    graphRef.current.d3Force("link")?.distance((l: GalaxyLink) => l.distance ?? 60);
    graphRef.current.d3Force("collision")?.radius((node: GalaxyNode) => nodeRadius(node) + 30);
    graphRef.current.d3ReheatSimulation();
  }, [graphData]);

  useEffect(() => {
    return () => {
      if (fitTimerRef.current !== null) window.clearTimeout(fitTimerRef.current);
    };
  }, []);

  const fitGraphToViewport = (duration = 700) => {
    graphRef.current?.zoomToFit(duration, 64);
  };

  const scheduleViewportFit = () => {
    if (selected) return;
    if (fitTimerRef.current !== null) window.clearTimeout(fitTimerRef.current);

    fitTimerRef.current = window.setTimeout(() => {
      fitGraphToViewport(800);
      fitTimerRef.current = null;
    }, 5000);
  };

  const handleNodeClick = (node: GalaxyNode) => {
    setSelected(node);
    ignoreZoomUntilRef.current = Date.now() + 800;
    const zoom = node.level === "project" ? 1.7 : node.level === "branch" ? 2.4 : 3.0;
    graphRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 520);
    graphRef.current?.zoom(zoom, 520);
    if (fitTimerRef.current !== null) {
      window.clearTimeout(fitTimerRef.current);
      fitTimerRef.current = null;
    }
  };

  const paintNodePointerArea = (node: GalaxyNode, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, Math.max(16, nodeRadius(node) + 8), 0, Math.PI * 2);
    ctx.fill();
  };

  const renderNode = (node: GalaxyNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const radius = nodeRadius(node);
    const color = THEME.node;
    const accent = node.isCurrent ? THEME.accentCurrent : THEME.accentOther;
    const isSelected = selected?.id === node.id;
    const isDimmed = Boolean(selected && !isSelected);
    const opacity = isDimmed ? 0.14 : 1;
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    ctx.save();
    ctx.globalAlpha = opacity;

    const displayRadius = isSelected ? radius * 1.42 : radius;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, displayRadius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, displayRadius, 0, Math.PI * 2);
    ctx.lineWidth = node.level === "project" ? 3.2 : node.level === "branch" ? 2.7 : 2.2;
    ctx.strokeStyle = color;

    if (node.isCurrent || node.level === "project") {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.stroke();
    }

    if (node.level === "project") {
      ctx.beginPath();
      ctx.arc(x, y, displayRadius - 5, 0, Math.PI * 2);
      ctx.fillStyle = THEME.background;
      ctx.globalAlpha = opacity * 0.92;
      ctx.fill();
    }

    if (!isDimmed) {
      const fontSize = Math.max(8, node.level === "commit" ? 9 / globalScale : 11 / globalScale);
      ctx.font = `${node.level === "project" || node.level === "branch" ? 700 : 600} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = THEME.foreground;
      ctx.globalAlpha = node.level === "commit" ? 0.68 : 0.9;
      ctx.fillText(node.name, x, y + displayRadius + 5);
    }

    ctx.restore();
  };

  const renderLink = (link: GalaxyLink, ctx: CanvasRenderingContext2D) => {
    const source = link.source as GalaxyNode;
    const target = link.target as GalaxyNode;
    const sourceId = getNodeId(source);
    const targetId = getNodeId(target);
    const isSelectedLine = Boolean(selected && (sourceId === selected.id || targetId === selected.id));
    const isDimmed = Boolean(selected && !isSelectedLine);

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.09 : isSelectedLine ? 0.7 : 0.4;
    ctx.strokeStyle = target.isCurrent ? THEME.accentCurrent : THEME.accentOther;
    ctx.lineWidth = isSelectedLine ? 1.8 : target.level === "branch" ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(source.x ?? 0, source.y ?? 0);
    ctx.lineTo(target.x ?? 0, target.y ?? 0);
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div className="relative flex size-full min-h-0 flex-col overflow-hidden" style={{ background: THEME.background, color: THEME.foreground }}>
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3" style={{ borderColor: THEME.border, background: "rgba(7, 8, 6, 0.96)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: THEME.primary, color: THEME.primaryForeground }}>
            <Network className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">SynAIpse Galaxy</h1>
            <p className="truncate text-[11px]" style={{ color: THEME.muted }}>Repository → branch → commit (실제 git 데이터)</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex h-8 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold" style={{ borderColor: THEME.border, background: THEME.card }}>
            <GitBranch className="h-3.5 w-3.5" />
            <span>{rawData?.currentBranch ?? "—"}</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1" style={{ background: THEME.background }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px), radial-gradient(circle at center, rgba(255,255,255,0.035), transparent 56%)",
            backgroundSize: "48px 48px, 48px 48px, 100% 100%",
          }}
        />

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: THEME.muted }}>{error}</p>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: THEME.primary }} />
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            width={size.width}
            height={size.height}
            graphData={graphData as any}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={nodeLabel as any}
            nodeRelSize={1}
            nodeCanvasObject={renderNode as any}
            nodePointerAreaPaint={paintNodePointerArea as any}
            linkCanvasObject={renderLink as any}
            linkDirectionalParticles={(link: any) => {
              if (selected) return 0;
              const target = link.target as GalaxyNode;
              return target?.isCurrent && target.level === "branch" ? 1 : 0;
            }}
            linkDirectionalParticleWidth={1.4}
            linkDirectionalParticleSpeed={0.004}
            cooldownTicks={130}
            onNodeClick={handleNodeClick as any}
            onNodeDrag={() => scheduleViewportFit()}
            onNodeDragEnd={(node: any) => handleNodeClick(node as GalaxyNode)}
            onZoom={() => {
              if (Date.now() >= ignoreZoomUntilRef.current) scheduleViewportFit();
            }}
            onEngineStop={() => {
              if (!hasInitialFitRef.current) {
                hasInitialFitRef.current = true;
                fitGraphToViewport(700);
              }
            }}
            onBackgroundClick={() => {
              setSelected(null);
              ignoreZoomUntilRef.current = Date.now() + 800;
              fitGraphToViewport(700);
            }}
          />
        )}

        {!selected && !isLoading && !error && (
          <div className="pointer-events-none absolute bottom-5 right-5 z-20 w-56 rounded-2xl border p-5 backdrop-blur-md" style={{ borderColor: THEME.border, background: "rgba(11,12,10,0.86)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: THEME.muted }}>Repository overview</p>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between"><span style={{ color: THEME.muted }}>Branches</span><strong>{branchCount}</strong></div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: THEME.border }}><span style={{ color: THEME.muted }}>Commits shown</span><strong>{commitCount}</strong></div>
            </div>
          </div>
        )}

        {selected && (
          <div
            data-testid="galaxy-bottom-detail"
            className="pointer-events-none absolute bottom-4 left-4 right-4 z-30 min-h-24 rounded-2xl border px-6 py-5 shadow-xl backdrop-blur-md md:right-auto md:w-[min(720px,calc(100%-2rem))]"
            style={{ background: "rgba(11,12,10,0.94)", borderColor: selected.isCurrent ? THEME.accentCurrent : THEME.accentOther, color: THEME.foreground }}
          >
            <div className="flex items-center gap-4">
              <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: selected.isCurrent ? THEME.accentCurrent : THEME.accentOther }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{selected.name}</p>
                <p className="mt-1 truncate text-xs" style={{ color: THEME.muted }}>{selected.summary}</p>
              </div>
              {selected.author && (
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs font-semibold">{selected.author}</p>
                  {selected.createdAt && <p className="mt-1 text-[11px]" style={{ color: THEME.muted }}>{new Date(selected.createdAt).toLocaleString("ko-KR")}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {selected && (
          <aside
            data-testid="galaxy-side-detail"
            className="absolute right-4 top-4 z-40 w-[min(320px,calc(100%-2rem))] rounded-2xl border p-6 shadow-2xl backdrop-blur-md"
            style={{ background: "rgba(11,12,10,0.96)", borderColor: THEME.border, color: THEME.foreground }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: THEME.muted }}>Selected node</p>
                <h2 className="mt-2 break-words text-lg font-bold">{selected.name}</h2>
              </div>
              <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: THEME.border, color: THEME.muted }} onClick={() => setSelected(null)}>
                닫기
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt style={{ color: THEME.muted }}>종류</dt><dd className="font-semibold">{levelLabel(selected.level)}</dd></div>
              {selected.level !== "project" && (
                <div className="flex justify-between gap-3"><dt style={{ color: THEME.muted }}>현재 브랜치 포함</dt><dd className="font-semibold">{selected.isCurrent ? "예" : "아니오"}</dd></div>
              )}
              {selected.author && (
                <div className="flex justify-between gap-3"><dt style={{ color: THEME.muted }}>작성자</dt><dd className="max-w-[180px] truncate font-semibold">{selected.author}</dd></div>
              )}
              {selected.createdAt && (
                <div className="flex justify-between gap-3"><dt style={{ color: THEME.muted }}>커밋 시각</dt><dd className="font-semibold">{new Date(selected.createdAt).toLocaleString("ko-KR")}</dd></div>
              )}
              <div className="flex justify-between gap-3"><dt style={{ color: THEME.muted }}>노드 ID</dt><dd className="max-w-[180px] truncate font-mono text-xs font-semibold">{selected.id}</dd></div>
            </dl>
            <p className="mt-6 border-t pt-4 text-sm leading-relaxed" style={{ borderColor: THEME.border, color: THEME.muted }}>
              {selected.summary}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
