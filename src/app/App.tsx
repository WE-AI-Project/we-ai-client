import { useState, useEffect, useRef, useCallback } from "react";
import {
  FolderGit2,
  Home,
  Terminal,
  Settings,
  User,
  LogOut,
  Circle,
  GitCommit,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Hash,
  GitPullRequest,
  MessageCircle,
  CalendarDays,
  Folder,
  Sun,
  Power, // 로그아웃 아이콘용 추가
} from "lucide-react";

// ── 페이지 컴포넌트 ──
import { JoinProjectScreen } from "./components/JoinProjectScreen";
import { LoginScreen } from "./components/LoginScreen";
import { DashboardPage } from "./components/DashboardPage";
import { EnvironmentSettingsPage } from "./components/EnvironmentSettingsPage";
import { ProfilePage } from "./components/ProfilePage";
import { CommitDiffPage } from "./components/CommitDiffPage";
import { AIQAPage } from "./components/AIQAPage";
import { ChangesPage } from "./components/ChangesPage";
import { FileDiffViewer } from "./components/FileDiffViewer";
import { ChatPage } from "./components/ChatPage";
import { ProjectSettingsPage } from "./components/ProjectSettingsPage";
import { CalendarPage } from "./components/CalendarPage";
import { ServerBuildPage } from "./components/ServerBuildPage";
import type { CommitFile } from "./components/commitData";
import { loadProfile } from "./data/profileStore";
import { loadDocs } from "./data/chatStore";
import { saveSettings, loadSettings } from "./data/projectSettingsStore";
import { NotificationPanel } from "./components/NotificationPanel";
import { DailyStandupModal, isDismissedToday } from "./components/DailyStandupModal";

// ── 디자인 토큰 ──
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, SIDEBAR_BG, SIDEBAR_HOVER, SIDEBAR_ACTIVE,
  GRADIENT_LOGO, GRADIENT_SIDEBAR, GRADIENT_OUTER,
  ACCENT_BG, CREAM,
  SIDEBAR_TEXT, SIDEBAR_TEXT_ACTIVE, SIDEBAR_TEXT_HOVER,
  SIDEBAR_TEXT_LABEL, SIDEBAR_BORDER,
} from "./colors";

// ── 사이드바 너비 상수 ──
const SIDEBAR_EXPANDED  = 220;
const SIDEBAR_COLLAPSED = 52;
const SIDEBAR_MIN       = 44;
const SIDEBAR_MAX       = 340;
const COLLAPSE_THRESHOLD = 100;

function genProjectCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const NAV_ITEMS = [
  { id: "Dashboard",   icon: Home,           label: "Dashboard"     },
  { id: "Changes",     icon: GitPullRequest, label: "Changes"       },
  { id: "Commits",     icon: GitCommit,      label: "Commits"       },
  { id: "ServerBuild", icon: Terminal,       label: "Server & Build" },
  { id: "Chat",        icon: MessageCircle,  label: "Chat"          },
  { id: "Calendar",    icon: CalendarDays,   label: "Calendar"      },
] as const;

const SYSTEM_ITEMS = [
  { id: "EnvSettings",      icon: Settings,    label: "Environment"      },
  { id: "AIQA",             icon: ShieldCheck, label: "QA & Agents"      },
  { id: "ProjectSettings",  icon: FolderGit2,  label: "Project Settings" },
] as const;

type NavId =
  | "Dashboard" | "Changes" | "Commits" | "ServerBuild"
  | "Chat" | "Calendar" | "EnvSettings" | "AIQA"
  | "ProjectSettings" | "Profile";

// ── Tooltip ──
function Tooltip({ label }: { label: string }) {
  return (
    <div
      className="absolute left-full ml-2 px-2 py-1 rounded-lg text-[10px] font-semibold pointer-events-none whitespace-nowrap z-50"
      style={{
        background: "#212308",
        color: SIDEBAR_TEXT_ACTIVE,
        border: `1px solid ${SIDEBAR_BORDER}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
      }}
    >
      {label}
    </div>
  );
}

// ── Nav 버튼 ──
function NavBtn({
  icon: Icon, label, active, collapsed, onClick,
}: { icon: any; label: string; active: boolean; collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="w-full flex items-center gap-2 text-left transition-all rounded-lg"
        style={{
          padding: collapsed ? "6px 0" : "6px 8px",
          justifyContent: collapsed ? "center" : "flex-start",
          color: active ? SIDEBAR_TEXT_ACTIVE : SIDEBAR_TEXT,
          background: active ? SIDEBAR_ACTIVE : hov ? SIDEBAR_HOVER : "transparent",
        }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: active ? SIDEBAR_TEXT_ACTIVE : hov ? SIDEBAR_TEXT_HOVER : SIDEBAR_TEXT }} />
        {!collapsed && (
          <span className="text-xs flex-1 truncate" style={{ color: active ? SIDEBAR_TEXT_ACTIVE : hov ? SIDEBAR_TEXT_HOVER : SIDEBAR_TEXT }}>
            {label}
          </span>
        )}
      </button>
      {collapsed && hov && <Tooltip label={label} />}
    </div>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="flex justify-center my-1"><div className="w-4 h-px" style={{ background: SIDEBAR_BORDER }} /></div>;
  return <p className="px-2 text-[9px] font-semibold tracking-wider mb-1" style={{ color: SIDEBAR_TEXT_LABEL }}>{children}</p>;
}

// ─────────────────────────────────────────────
// 메인 App
// ─────────────────────────────────────────────
export default function App() {
  const [screen,         setScreen]        = useState<"login" | "join" | "workspace">("login");
  const [projectName,   setProject]       = useState("");
  const [projectId,     setProjectId]     = useState("");
  const [projectCode,   setProjectCode]   = useState("");
  const [localPath,     setLocalPath]     = useState("");
  const [activeNav,     setActiveNav]     = useState<NavId>("Dashboard");
  const [diffFile,      setDiffFile]      = useState<CommitFile | null>(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [joinExiting,   setJoinExiting]   = useState(false);
  const [sidebarProfile, setSidebarProfile] = useState(() => loadProfile());
  const [docCount,      setDocCount]      = useState(() => loadDocs().length);

  // ── 데일리 스탠드업 ──
  const [showStandup, setShowStandup] = useState(false);

  // ── 사이드바 너비 ──
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_EXPANDED);
  const isCollapsed = sidebarWidth <= COLLAPSE_THRESHOLD;

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(SIDEBAR_EXPANDED);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStartW.current + e.clientX - dragStartX.current));
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSidebarWidth(w => w < COLLAPSE_THRESHOLD ? SIDEBAR_COLLAPSED : w);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const toggleSidebar = () => setSidebarWidth(w => w <= COLLAPSE_THRESHOLD ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED);

  // ── 프로젝트 참여 ──
  const handleJoin = (id: string, name: string, code?: string, path?: string) => {
    setJoinExiting(true);
    setTimeout(() => {
      setProjectId(id);
      setProject(name);
      setProjectCode(code ?? genProjectCode());
      setLocalPath(path ?? "");
      setScreen("workspace");
      setActiveNav("Dashboard");
      setDiffFile(null);
      setIsLoading(true);
      setJoinExiting(false);

      if (path || name) {
        const cur = loadSettings();
        saveSettings({
          ...cur,
          projectName: name || cur.projectName,
          repository:  path || cur.repository,
          description: cur.description || `${name} — WE&AI Enterprise Project`,
        });
      }

      setTimeout(() => {
        setIsLoading(false);
        if (!isDismissedToday()) {
          setTimeout(() => setShowStandup(true), 700);
        }
      }, 1000);
    }, 440);
  };

  // ── 로그아웃 핸들러 (로그인 화면으로) ──
  const handleLogout = () => {
    if (!window.confirm("정말 로그아웃 하시겠습니까?")) return;
    setScreen("login");
    setProjectId("");
    setProject("");
    setProjectCode("");
    setLocalPath("");
    setDiffFile(null);
    setActiveNav("Dashboard");
  };

  // ── 프로젝트 나가기 (조인 화면으로) ──
  const handleLeave = () => {
    setShowStandup(false);
    setScreen("join");
    setProjectId("");
    setProject("");
    setProjectCode("");
    setLocalPath("");
    setDiffFile(null);
  };

  const handleStandupNavigate = (page: string) => {
    setActiveNav(page as NavId);
    setDiffFile(null);
    setShowStandup(false);
  };

  // ── 페이지 렌더 ──
  const renderContent = () => {
    if (diffFile) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-9 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}`, background: "#2A2C10" }}>
            <span className="text-[11px] font-semibold" style={{ color: "#D4CC9E" }}>Diff — {diffFile.name}</span>
            <button onClick={() => setDiffFile(null)} className="ml-auto text-[10px] px-2.5 py-1 rounded-lg hover:bg-white/[0.08] transition-all" style={{ color: "#9A9B72" }}>
              ← 돌아가기
            </button>
          </div>
          <FileDiffViewer file={diffFile} onClose={() => setDiffFile(null)} />
        </div>
      );
    }
    switch (activeNav) {
      case "Dashboard":       return <DashboardPage projectName={projectName} />;
      case "Changes":         return <ChangesPage onNavigateQA={() => { setDiffFile(null); setActiveNav("AIQA"); }} />;
      case "Commits":         return <CommitDiffPage />;
      case "ServerBuild":     return <ServerBuildPage />;
      case "Chat":            return <ChatPage onDocsUpdate={setDocCount} />;
      case "Calendar":        return <CalendarPage />;
      case "EnvSettings":     return <EnvironmentSettingsPage />;
      case "AIQA":            return <AIQAPage autoStart />;
      case "ProjectSettings": return <ProjectSettingsPage />;
      case "Profile":         return <ProfilePage />;
      default:                return <DashboardPage projectName={projectName} />;
    }
  };

  if (screen === "login") {
    return (
      <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER }}>
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)" }}>
          <LoginScreen onLogin={() => setScreen("join")} />
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER, opacity: joinExiting ? 0 : 1, transform: joinExiting ? "translateX(-28px) scale(0.99)" : "translateX(0) scale(1)", transition: joinExiting ? "opacity 0.40s ease, transform 0.40s ease" : "none" }}>
        <style>{`@keyframes _join-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)", animation: "_join-fadein 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
          <div className="h-11 flex items-center px-4 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}`, background: GRADIENT_SIDEBAR }}>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: GRADIENT_LOGO }}><FolderGit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} /></div>
              <span className="text-xs font-semibold" style={{ color: SIDEBAR_TEXT_ACTIVE }}>WE&amp;AI Project Office</span>
            </div>
            {/* 조인 화면에서도 로그아웃 가능하게 배치 */}
            <button onClick={() => setScreen("login")} className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all">
              <LogOut className="w-3.5 h-3.5" /> 로그아웃
            </button>
          </div>
          <JoinProjectScreen onJoin={handleJoin} />
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER }}>
      {showStandup && <DailyStandupModal userName="병권" userPart="Frontend" onClose={() => setShowStandup(false)} onNavigate={handleStandupNavigate} />}

      <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: SIDEBAR_BG, boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)" }}>
        
        {/* 타이틀바 */}
        <div className="h-11 flex items-center px-4 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}`, background: GRADIENT_SIDEBAR }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: GRADIENT_LOGO }}><FolderGit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} /></div>
            <span className="text-xs font-semibold" style={{ color: SIDEBAR_TEXT_ACTIVE }}>WE&amp;AI Project Office</span>
          </div>

          {projectCode && (
            <div className="ml-3 flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(174,183,132,0.12)", border: `1px solid rgba(174,183,132,0.18)` }}>
              <Hash className="w-2.5 h-2.5" style={{ color: SIDEBAR_TEXT_HOVER }} />
              <span className="text-[9px] font-mono font-semibold tracking-wider" style={{ color: SIDEBAR_TEXT_HOVER }}>{projectCode}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowStandup(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all" style={{ background: showStandup ? "rgba(174,183,132,0.20)" : "rgba(174,183,132,0.10)", color: "#D4CC9E", border: `1px solid rgba(174,183,132,0.18)` }}>
              <Sun className="w-3 h-3" /> 스탠드업
            </button>
            <NotificationPanel />
          </div>
        </div>

        {/* 바디 */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex flex-col shrink-0 relative" style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, borderRight: `1px solid ${SIDEBAR_BORDER}`, background: GRADIENT_SIDEBAR, transition: isDragging.current ? "none" : "width 0.18s ease", overflow: "hidden" }}>
            
            {/* 프로필 섹션 */}
            <div className={`shrink-0 ${isCollapsed ? "py-1.5" : "p-3"}`} style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
              <button onClick={() => { setActiveNav("Profile"); setDiffFile(null); }} className="w-full text-left transition-all rounded-lg p-1" style={{ background: activeNav === "Profile" && !diffFile ? SIDEBAR_ACTIVE : "transparent" }}>
                <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: GRADIENT_LOGO }}><User className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} /></div>
                  {!isCollapsed && <div className="min-w-0"><p className="text-[11px] font-semibold truncate text-white">{sidebarProfile.displayName}</p><p className="text-[9px] truncate text-gray-500">{sidebarProfile.role}</p></div>}
                </div>
              </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar overflow-x-hidden">
              {!isCollapsed && projectCode && (
                <div className="px-2.5 pt-2.5 pb-2 border-b border-white/5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 text-gray-500">Current Project</p>
                  <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1"><Circle className="w-1.5 h-1.5 fill-current text-emerald-500" /><p className="text-[10px] font-semibold truncate text-white">{projectName}</p></div>
                    <div className="flex items-center gap-1 text-gray-500"><Hash className="w-2.5 h-2.5" /><span className="text-[9px] font-mono tracking-widest">{projectCode}</span></div>
                  </div>
                </div>
              )}

              <div className={`pt-2.5 pb-2 ${isCollapsed ? "px-1" : "px-1.5"}`}>
                <SectionLabel collapsed={isCollapsed}>MAIN</SectionLabel>
                <nav className="space-y-0.5">{NAV_ITEMS.map(item => <NavBtn key={item.id} icon={item.icon} label={item.label} active={activeNav === item.id && !diffFile} collapsed={isCollapsed} onClick={() => { setActiveNav(item.id as NavId); setDiffFile(null); }} />)}</nav>
              </div>

              <div className={`pb-2 ${isCollapsed ? "px-1" : "px-1.5"}`} style={{ borderTop: `1px solid ${SIDEBAR_BORDER}`, paddingTop: 8 }}>
                <SectionLabel collapsed={isCollapsed}>SYSTEM</SectionLabel>
                <nav className="space-y-0.5">{SYSTEM_ITEMS.map(item => <NavBtn key={item.id} icon={item.icon} label={item.label} active={activeNav === item.id && !diffFile} collapsed={isCollapsed} onClick={() => { setActiveNav(item.id as NavId); setDiffFile(null); }} />)}</nav>
              </div>
            </div>

            {/* 하단: Logout + Leave + Toggle */}
            <div className={`shrink-0 ${isCollapsed ? "px-1 py-2" : "px-1.5 py-2"}`} style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
              
              {/* 로그아웃 버튼 추가 */}
              <div className="relative group mb-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-lg transition-all"
                  style={{ padding: isCollapsed ? "6px 0" : "6px 8px", justifyContent: isCollapsed ? "center" : "flex-start", color: "#B8B6A8" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Power className="w-4 h-4 shrink-0" style={{ color: "#AEB784" }} />
                  {!isCollapsed && <span className="text-xs">Logout</span>}
                </button>
                {isCollapsed && <Tooltip label="Logout" />}
              </div>

              <div className="relative group">
                <button
                  onClick={handleLeave}
                  className="w-full flex items-center gap-2 rounded-lg transition-all"
                  style={{ padding: isCollapsed ? "6px 0" : "6px 8px", justifyContent: isCollapsed ? "center" : "flex-start", color: "#B85450" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(184,84,80,0.10)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut className="w-4 h-4 shrink-0" style={{ color: "#B85450" }} />
                  {!isCollapsed && <span className="text-xs">Leave Project</span>}
                </button>
                {isCollapsed && <Tooltip label="Leave Project" />}
              </div>

              <button
                onClick={toggleSidebar}
                className="w-full flex items-center rounded-lg mt-1 transition-all"
                style={{ padding: isCollapsed ? "6px 0" : "6px 8px", justifyContent: isCollapsed ? "center" : "flex-start", color: SIDEBAR_TEXT }}
                onMouseEnter={e => (e.currentTarget.style.background = SIDEBAR_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <><ChevronLeft className="w-3.5 h-3.5 shrink-0" /><span className="text-[10px] ml-2">Collapse</span></>}
              </button>
            </div>

            <div onMouseDown={onResizeMouseDown} className="absolute top-0 right-0 h-full w-1 z-20 cursor-col-resize transition-colors" onMouseEnter={e => (e.currentTarget.style.background = "rgba(174,183,132,0.25)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} />
          </div>

          {/* 메인 콘텐츠 영역 */}
          {renderContent()}
        </div>

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "#F5F4F1" }}>
            <style>{`
              @keyframes _spin { to { transform: rotate(360deg); } }
              @keyframes _fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes _pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>
            <div style={{ animation: "_fadein 0.35s ease forwards", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(65,67,27,0.08)", borderTopColor: "#AEB784", animation: "_spin 2s linear infinite" }} />
                <div style={{ position: "absolute", inset: 16, borderRadius: 12, background: "#41431B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderGit2 style={{ width: 22, height: 22, color: "white" }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1C06" }}>프로젝트 로딩 중</p>
                <p style={{ fontSize: 11, color: "#6B6C4E", animation: "_pulse 1.8s ease infinite" }}>{projectName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}