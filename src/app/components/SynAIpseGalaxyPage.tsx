import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { GitMerge, Loader2, Network, Radio } from "lucide-react";

type NodeStatus = "working" | "merged";
type NodeLevel = "project" | "repo" | "branch" | "commit";
type RepoKey = "project" | "client" | "server";

type GalaxyNode = {
  id: string;
  name: string;
  level: NodeLevel;
  repo: RepoKey;
  author: string;
  status: NodeStatus;
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

type ThemeTokens = {
  background: string;
  foreground: string;
  node: string;
  card: string;
  border: string;
  muted: string;
  primary: string;
  primaryForeground: string;
  repoColors: Record<RepoKey, string>;
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  working: "작업 중",
  merged: "머지 완료",
};

const STATUS_SUMMARY = [
  { label: "Working", status: "working" as const },
  { label: "Merged", status: "merged" as const },
];

const synaipseGalaxyData: GalaxyGraph = {
  nodes: [
    {
      id: "project-synaipse",
      name: "SynAIpse",
      level: "project",
      repo: "project",
      author: "WE-AI-Project",
      status: "merged",
      createdAt: "2026-03-28",
      summary: "GitHub organization 기준 프로젝트 중심점",
      x: 0,
      y: 0,
    },
    {
      id: "repo-client",
      name: "we-ai-client",
      level: "repo",
      repo: "client",
      author: "Frontend Team",
      status: "working",
      createdAt: "2026-03-30",
      summary: "React/Vite 프론트엔드 레포",
      x: -150,
      y: -40,
    },
    {
      id: "repo-server",
      name: "we-ai-server",
      level: "repo",
      repo: "server",
      author: "Backend Team",
      status: "working",
      createdAt: "2026-03-28",
      summary: "Spring Boot 백엔드와 배포/AI API 레포",
      x: 150,
      y: 40,
    },

    {
      id: "client-main",
      name: "main",
      level: "branch",
      repo: "client",
      author: "kimminhyeok",
      status: "merged",
      createdAt: "2026-07-19",
      summary: "09223af · npm 취약성 문제 수정",
    },
    {
      id: "client-mgjAPI",
      name: "mgjAPI",
      level: "branch",
      repo: "client",
      author: "alsrudwns",
      status: "working",
      createdAt: "2026-07-19",
      summary: ".env.local-backend 파일 추가, package 설정 수정",
    },
    {
      id: "client-ProjectAPI",
      name: "ProjectAPI",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-07-17",
      summary: "프로젝트 API 연동 브랜치",
    },
    {
      id: "client-NewPage",
      name: "NewPage",
      level: "branch",
      repo: "client",
      author: "alsrudwns",
      status: "working",
      createdAt: "2026-06-15",
      summary: "스켈레톤 수정, 로그인 창 및 팝업창 수정",
    },
    {
      id: "client-SkeletonUI",
      name: "SkeletonUI",
      level: "branch",
      repo: "client",
      author: "alsrudwns",
      status: "working",
      createdAt: "2026-06-14",
      summary: "스크롤바 전체 제거, 분할 화면 수정, 캘린더 수정",
    },
    {
      id: "client-Calendar",
      name: "Calendar",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-06-13",
      summary: "CalendarCard 작업",
    },
    {
      id: "client-choice",
      name: "choice",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-06-12",
      summary: "CodePartModify, multi-choice 흐름",
    },
    {
      id: "client-projectName",
      name: "projectName",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-06-11",
      summary: "SystemMenu 작업",
    },
    {
      id: "client-sideBarSplit",
      name: "sideBarSplit",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-05-19",
      summary: "사이드바 분할 화면",
    },
    {
      id: "client-headerBar",
      name: "headerBar",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-05-18",
      summary: "상단 헤더바 UI 작업",
    },
    {
      id: "client-pwConstraint",
      name: "pwConstraint",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-05-18",
      summary: "비밀번호 제약 조건 UI",
    },
    {
      id: "client-signupApi",
      name: "signupApi",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-05-17",
      summary: "회원가입 API 병합 브랜치",
    },
    {
      id: "client-Profile",
      name: "Profile",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-04-13",
      summary: "TeamProfile 화면",
    },
    {
      id: "client-mgj",
      name: "mgj",
      level: "branch",
      repo: "client",
      author: "alsrudwns",
      status: "working",
      createdAt: "2026-04-13",
      summary: "로그아웃, 채팅 추가 기능 화면",
    },
    {
      id: "client-Login",
      name: "Login",
      level: "branch",
      repo: "client",
      author: "JiHyeon-9",
      status: "working",
      createdAt: "2026-03-30",
      summary: "login upupdate",
    },
    {
      id: "client-Signin",
      name: "Signin",
      level: "branch",
      repo: "client",
      author: "alsrudwns",
      status: "working",
      createdAt: "2026-03-30",
      summary: "회원가입 페이지 수정본",
    },

    {
      id: "server-main",
      name: "main",
      level: "branch",
      repo: "server",
      author: "yongh465",
      status: "merged",
      createdAt: "2026-07-20",
      summary: "5fb6f45 · 라즈베리파이 자동 배포 워크플로우",
    },
    {
      id: "server-notification",
      name: "notification",
      level: "branch",
      repo: "server",
      author: "kimminhyeok",
      status: "working",
      createdAt: "2026-07-19",
      summary: "내 알림 목록 조회, 읽음 처리, 전체 읽음, 삭제 API",
    },
    {
      id: "server-daily",
      name: "daily",
      level: "branch",
      repo: "server",
      author: "kimminhyeok",
      status: "working",
      createdAt: "2026-07-19",
      summary: "프로젝트 나가기, 멤버 추방, 초대 코드 재발급, 보관, 삭제",
    },
    {
      id: "server-profile",
      name: "profile",
      level: "branch",
      repo: "server",
      author: "kimminhyeok",
      status: "working",
      createdAt: "2026-07-12",
      summary: "프로필 API 수정",
    },
    {
      id: "server-commits",
      name: "commits",
      level: "branch",
      repo: "server",
      author: "kimminhyeok",
      status: "working",
      createdAt: "2026-06-11",
      summary: "커밋 조회 API 4개 구현",
    },
    {
      id: "server-AI",
      name: "AI",
      level: "branch",
      repo: "server",
      author: "where-is-the-error",
      status: "working",
      createdAt: "2026-05-18",
      summary: "AI 기본 폴더와 설정",
    },
    {
      id: "server-projectCreate",
      name: "feature-WEAI-projectCreate",
      level: "branch",
      repo: "server",
      author: "kimminhyeok",
      status: "working",
      createdAt: "2026-05-03",
      summary: "프로젝트 생성, 내 프로젝트 목록, 초대 코드 참여 API",
    },
    {
      id: "server-socialLogin",
      name: "social-login-and-Signin",
      level: "branch",
      repo: "server",
      author: "김민혁",
      status: "working",
      createdAt: "2026-04-12",
      summary: "소셜 로그인 3개 API 구현",
    },

    {
      id: "commit-client-login-merge",
      name: "dfeb27e",
      level: "commit",
      repo: "client",
      author: "alsrudwns",
      status: "merged",
      createdAt: "2026-07-11",
      summary: "LoginScreen 충돌 해결 및 로그인 API 병합",
    },
    {
      id: "commit-client-ai-ui",
      name: "e39c1a5",
      level: "commit",
      repo: "client",
      author: "where-is-the-error",
      status: "merged",
      createdAt: "2026-06-29",
      summary: "Remove simulated loading & add AI agent features",
    },
    {
      id: "commit-client-local-stack",
      name: "43f2811",
      level: "commit",
      repo: "client",
      author: "where-is-the-error",
      status: "merged",
      createdAt: "2026-06-15",
      summary: "Add local project stack detection",
    },
    {
      id: "commit-client-dashboard",
      name: "1df7593",
      level: "commit",
      repo: "client",
      author: "JiHyeon-9",
      status: "merged",
      createdAt: "2026-06-14",
      summary: "DashboardApi",
    },
    {
      id: "commit-server-rag",
      name: "59db6ee",
      level: "commit",
      repo: "server",
      author: "where-is-the-error",
      status: "merged",
      createdAt: "2026-06-13",
      summary: "RAG-backed AI features and controllers",
    },
    {
      id: "commit-server-ai-health",
      name: "74c296a",
      level: "commit",
      repo: "server",
      author: "where-is-the-error",
      status: "merged",
      createdAt: "2026-06-15",
      summary: "AI health checks and project-aware automation",
    },
    {
      id: "commit-server-notification",
      name: "7cc3251",
      level: "commit",
      repo: "server",
      author: "kimminhyeok",
      status: "merged",
      createdAt: "2026-07-19",
      summary: "알림 API 구현",
    },
    {
      id: "commit-server-daily",
      name: "2254999",
      level: "commit",
      repo: "server",
      author: "kimminhyeok",
      status: "merged",
      createdAt: "2026-07-19",
      summary: "프로젝트 관리 API 구현",
    },
    {
      id: "commit-server-deploy",
      name: "5fb6f45",
      level: "commit",
      repo: "server",
      author: "yongh465",
      status: "merged",
      createdAt: "2026-07-20",
      summary: "라즈베리파이 자동 배포 워크플로우",
    },
  ],
  links: [
    { source: "project-synaipse", target: "repo-client", distance: 145 },
    { source: "project-synaipse", target: "repo-server", distance: 145 },

    { source: "repo-client", target: "client-main", distance: 92 },
    { source: "repo-client", target: "client-mgjAPI", distance: 112 },
    { source: "repo-client", target: "client-ProjectAPI", distance: 112 },
    { source: "repo-client", target: "client-NewPage", distance: 112 },
    { source: "repo-client", target: "client-SkeletonUI", distance: 112 },
    { source: "repo-client", target: "client-Calendar", distance: 112 },
    { source: "repo-client", target: "client-choice", distance: 112 },
    { source: "repo-client", target: "client-projectName", distance: 112 },
    { source: "repo-client", target: "client-sideBarSplit", distance: 112 },
    { source: "repo-client", target: "client-headerBar", distance: 112 },
    { source: "repo-client", target: "client-pwConstraint", distance: 112 },
    { source: "repo-client", target: "client-signupApi", distance: 112 },
    { source: "repo-client", target: "client-Profile", distance: 112 },
    { source: "repo-client", target: "client-mgj", distance: 112 },
    { source: "repo-client", target: "client-Login", distance: 112 },
    { source: "repo-client", target: "client-Signin", distance: 112 },

    { source: "repo-server", target: "server-main", distance: 92 },
    { source: "repo-server", target: "server-notification", distance: 112 },
    { source: "repo-server", target: "server-daily", distance: 112 },
    { source: "repo-server", target: "server-profile", distance: 112 },
    { source: "repo-server", target: "server-commits", distance: 112 },
    { source: "repo-server", target: "server-AI", distance: 112 },
    { source: "repo-server", target: "server-projectCreate", distance: 112 },
    { source: "repo-server", target: "server-socialLogin", distance: 112 },

    { source: "client-mgjAPI", target: "commit-client-login-merge", distance: 34 },
    { source: "client-main", target: "commit-client-ai-ui", distance: 30 },
    { source: "client-NewPage", target: "commit-client-local-stack", distance: 30 },
    { source: "client-main", target: "commit-client-dashboard", distance: 30 },
    { source: "server-AI", target: "commit-server-rag", distance: 30 },
    { source: "server-AI", target: "commit-server-ai-health", distance: 30 },
    { source: "server-notification", target: "commit-server-notification", distance: 34 },
    { source: "server-daily", target: "commit-server-daily", distance: 34 },
    { source: "server-main", target: "commit-server-deploy", distance: 28 },
  ],
};

function getCssVar(styles: CSSStyleDeclaration, name: string, fallback: string) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function useThemeTokens(): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(() => ({
    background: "#050604",
    foreground: "#F7F7F2",
    node: "#F5F6F0",
    card: "#11130D",
    border: "rgba(245,246,240,0.14)",
    muted: "#A4A89A",
    primary: "#F5F6F0",
    primaryForeground: "#050604",
    repoColors: {
      project: "#F5F6F0",
      client: "#D6D8D1",
      server: "#A9ACA3",
    },
  }));

  useEffect(() => {
    const readTokens = () => {
      const styles = getComputedStyle(document.documentElement);
      setTokens({
        background: "#050604",
        foreground: "#F7F7F2",
        node: "#F5F6F0",
        card: "#11130D",
        border: "rgba(245,246,240,0.14)",
        muted: "#A4A89A",
        primary: "#F5F6F0",
        primaryForeground: "#050604",
        repoColors: {
          project: "#F5F6F0",
          client: "#D6D8D1",
          server: "#A9ACA3",
        },
      });
    };

    readTokens();
    const observer = new MutationObserver(readTokens);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  return tokens;
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

function daysSince(date: string) {
  const created = new Date(`${date}T00:00:00`);
  const diff = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function nodeRadius(node: GalaxyNode) {
  if (node.level === "project") return 17;
  if (node.level === "repo") return 13;
  if (node.level === "branch") return node.status === "merged" ? 8 : 9;

  const age = daysSince(node.createdAt);
  if (node.status === "merged" && age >= 45) return 3.5;
  if (node.status === "merged" && age >= 20) return 4.5;
  return 5.5;
}

function getNodeId(node: string | GalaxyNode) {
  return typeof node === "string" ? node : node.id;
}

function staggeredLinkDistance(link: GalaxyLink) {
  const targetId = getNodeId(link.target);
  const target =
    typeof link.target === "string"
      ? synaipseGalaxyData.nodes.find((node) => node.id === targetId)
      : link.target;

  if (target?.level !== "branch") return link.distance ?? 62;

  const seed = targetId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return 108 + (seed % 5) * 30;
}

function nodeLabel(node: GalaxyNode) {
  return `${node.name}\n${node.author} · ${STATUS_LABEL[node.status]}`;
}

function levelLabel(level: NodeLevel) {
  if (level === "project") return "Project";
  if (level === "repo") return "GitHub Repo";
  if (level === "branch") return "Branch";
  return "Commit";
}

function repoLabel(repo: RepoKey) {
  if (repo === "client") return "we-ai-client";
  if (repo === "server") return "we-ai-server";
  return "SynAIpse";
}

export function SynAIpseGalaxyPage() {
  const theme = useThemeTokens();
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const graphRef = useRef<any>(null);
  const fitTimerRef = useRef<number | null>(null);
  const hasInitialFitRef = useRef(false);
  const ignoreZoomUntilRef = useRef(0);
  const [selected, setSelected] = useState<GalaxyNode | null>(null);

  const progress = useMemo(() => {
    const branches = synaipseGalaxyData.nodes.filter((node) => node.level === "branch");
    const merged = branches.filter((node) => node.status === "merged").length;
    return { merged, total: branches.length, working: branches.length - merged };
  }, []);

  const repoOverview = useMemo(() => ({
    client: synaipseGalaxyData.nodes.filter((node) => node.level === "branch" && node.repo === "client").length,
    server: synaipseGalaxyData.nodes.filter((node) => node.level === "branch" && node.repo === "server").length,
    commits: synaipseGalaxyData.nodes.filter((node) => node.level === "commit").length,
  }), []);

  const completionRate = progress.total ? Math.round((progress.merged / progress.total) * 100) : 0;

  useEffect(() => {
    if (!graphRef.current) return;

    graphRef.current.d3Force("charge")?.strength(-560);
    graphRef.current.d3Force("center")?.strength(0.018);
    graphRef.current.d3Force("link")?.distance(staggeredLinkDistance);
    graphRef.current.d3Force("collision")?.radius((node: GalaxyNode) => nodeRadius(node) + 30);
    graphRef.current.d3ReheatSimulation();
  }, []);

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
    const zoom = node.level === "project" ? 1.7 : node.level === "repo" ? 2.15 : node.level === "branch" ? 2.75 : 3.2;
    graphRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 520);
    graphRef.current?.zoom(zoom, 520);
    if (fitTimerRef.current !== null) {
      window.clearTimeout(fitTimerRef.current);
      fitTimerRef.current = null;
    }
  };

  const paintNodePointerArea = (
    node: GalaxyNode,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, Math.max(16, nodeRadius(node) + 8), 0, Math.PI * 2);
    ctx.fill();
  };

  const renderNode = (node: GalaxyNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const radius = nodeRadius(node);
    const color = theme.node;
    const accent = theme.repoColors[node.repo];
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
    ctx.lineWidth = node.level === "project" ? 3.2 : node.level === "repo" ? 2.7 : 2.2;
    ctx.strokeStyle = color;

    if (node.status === "working") {
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.stroke();
    }

    if (node.level === "project") {
      ctx.beginPath();
      ctx.arc(x, y, displayRadius - 5, 0, Math.PI * 2);
      ctx.fillStyle = theme.background;
      ctx.globalAlpha = opacity * 0.92;
      ctx.fill();
    }

    if (!isDimmed) {
      const fontSize = Math.max(8, node.level === "commit" ? 9 / globalScale : 11 / globalScale);
      ctx.font = `${node.level === "project" || node.level === "repo" ? 700 : 600} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = theme.foreground;
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
    ctx.strokeStyle = target.level === "repo" ? "#F5F6F0" : theme.repoColors[target.repo];
    ctx.lineWidth = isSelectedLine ? 1.8 : target.level === "repo" ? 1.4 : 1;
    ctx.beginPath();
    const sourceX = source.x ?? 0;
    const sourceY = source.y ?? 0;
    const targetX = target.x ?? 0;
    const targetY = target.y ?? 0;
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div
      className="relative flex size-full min-h-0 flex-col overflow-hidden"
      style={{ background: theme.background, color: theme.foreground }}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3"
        style={{ borderColor: theme.border, background: "rgba(7, 8, 6, 0.96)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: theme.primary, color: theme.primaryForeground }}
          >
            <Network className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">SynAIpse Galaxy</h1>
            <p className="truncate text-[11px]" style={{ color: theme.muted }}>
              Project → GitHub repo → branch → commit
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {STATUS_SUMMARY.map((item) => (
            <div
              key={item.status}
              className="flex h-8 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold"
              style={{ borderColor: theme.border, background: theme.card }}
            >
              {item.status === "working" ? <Radio className="h-3.5 w-3.5" /> : <GitMerge className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
              <span style={{ color: theme.muted }}>
                {item.status === "working" ? progress.working : progress.merged}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1" style={{ background: theme.background }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px), radial-gradient(circle at center, rgba(255,255,255,0.035), transparent 56%)",
            backgroundSize: "48px 48px, 48px 48px, 100% 100%",
          }}
        />
        <ForceGraph2D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={synaipseGalaxyData}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel={nodeLabel}
          nodeRelSize={1}
          nodeCanvasObject={renderNode}
          nodePointerAreaPaint={paintNodePointerArea}
          linkCanvasObject={renderLink}
          linkDirectionalParticles={(link) => {
            if (selected) return 0;
            const target = link.target as GalaxyNode;
            return target?.status === "working" && target.level === "branch" ? 1 : 0;
          }}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleSpeed={0.004}
          cooldownTicks={130}
          onNodeClick={handleNodeClick}
          onNodeDrag={() => scheduleViewportFit()}
          onNodeDragEnd={(node) => handleNodeClick(node as GalaxyNode)}
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

        {!graphRef.current && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.primary }} />
          </div>
        )}

        {!selected && (
          <div className="pointer-events-none absolute bottom-5 left-5 z-20 w-64 rounded-2xl border p-5 backdrop-blur-md" style={{ borderColor: theme.border, background: "rgba(11,12,10,0.86)" }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.muted }}>Branch progress</p>
                <p className="mt-2 text-2xl font-black">{completionRate}%</p>
              </div>
              <p className="text-xs" style={{ color: theme.muted }}>{progress.merged} / {progress.total} merged</p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full bg-white" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        )}

        {!selected && (
          <div className="pointer-events-none absolute bottom-5 right-5 z-20 w-56 rounded-2xl border p-5 backdrop-blur-md" style={{ borderColor: theme.border, background: "rgba(11,12,10,0.86)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.muted }}>Repository overview</p>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between"><span style={{ color: theme.muted }}>we-ai-client</span><strong>{repoOverview.client} branches</strong></div>
              <div className="flex justify-between"><span style={{ color: theme.muted }}>we-ai-server</span><strong>{repoOverview.server} branches</strong></div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: theme.border }}><span style={{ color: theme.muted }}>Commits</span><strong>{repoOverview.commits}</strong></div>
            </div>
          </div>
        )}

        {selected && (
          <div
            data-testid="galaxy-bottom-detail"
            className="pointer-events-none absolute bottom-4 left-4 right-4 z-30 min-h-24 rounded-2xl border px-6 py-5 shadow-xl backdrop-blur-md md:right-auto md:w-[min(720px,calc(100%-2rem))]"
            style={{ background: "rgba(11,12,10,0.94)", borderColor: theme.repoColors[selected.repo], color: theme.foreground }}
          >
            <div className="flex items-center gap-4">
              <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: theme.repoColors[selected.repo] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{selected.name}</p>
                <p className="mt-1 truncate text-xs" style={{ color: theme.muted }}>
                  {selected.summary}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-xs font-semibold">{selected.author}</p>
                <p className="mt-1 text-[11px]" style={{ color: theme.muted }}>{selected.createdAt}</p>
              </div>
              <span className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: theme.repoColors[selected.repo] }}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
          </div>
        )}

        {selected && (
          <aside
            data-testid="galaxy-side-detail"
            className="absolute right-4 top-4 z-40 w-[min(320px,calc(100%-2rem))] rounded-2xl border p-6 shadow-2xl backdrop-blur-md"
            style={{ background: "rgba(11,12,10,0.96)", borderColor: theme.border, color: theme.foreground }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: theme.muted }}>Selected node</p>
                <h2 className="mt-2 break-words text-lg font-bold">{selected.name}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: theme.border, color: theme.muted }}
                onClick={() => setSelected(null)}
              >
                닫기
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>레포</dt><dd className="max-w-[180px] truncate font-semibold">{repoLabel(selected.repo)}</dd></div>
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>종류</dt><dd className="font-semibold">{levelLabel(selected.level)}</dd></div>
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>상태</dt><dd className="font-semibold">{STATUS_LABEL[selected.status]}</dd></div>
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>작업자</dt><dd className="max-w-[180px] truncate font-semibold">{selected.author}</dd></div>
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>생성일</dt><dd className="font-semibold">{selected.createdAt}</dd></div>
              <div className="flex justify-between gap-3"><dt style={{ color: theme.muted }}>노드 ID</dt><dd className="max-w-[180px] truncate font-mono text-xs font-semibold">{selected.id}</dd></div>
            </dl>
            <p className="mt-6 border-t pt-4 text-sm leading-relaxed" style={{ borderColor: theme.border, color: theme.muted }}>
              {selected.summary}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
