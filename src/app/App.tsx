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
  ChevronUp,
  ChevronDown,
  Hash,
  GitPullRequest,
  MessageCircle,
  CalendarDays,
  Folder,
  Sun,
  Orbit,
  X,
  Menu,
} from "lucide-react";

// ── 페이지 컴포넌트 ──
import { SynAIpseGalaxyPage } from "./components/SynAIpseGalaxyPage";
import { JoinProjectScreen } from "./components/JoinProjectScreen";
import { LoginScreen } from "./components/LoginScreen";
import { DashboardPage } from "./components/DashboardPage";
import { WeAIDashboard } from "./components/WeAIDashboard";
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
import { loadProfile, saveProfile } from "./data/profileStore";
import { loadDocs } from "./data/chatStore";
import { saveSettings, loadSettings } from "./data/projectSettingsStore";
import { NotificationPanel } from "./components/NotificationPanel";
import { DailyStandupModal, isDismissedToday } from "./components/DailyStandupModal";
import {
  AUTH_SESSION_EVENT,
  AuthSession,
  CurrentUser,
  ProjectDetail,
  ProjectLaunchTarget,
  PUBLISHING_USER,
  clearSession,
  fetchCurrentUser,
  fetchProjectDetail,
  loadSession,
  logout,
  isPublishingSession,
  refreshSession,
} from "./lib/api";

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
const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 52;
const SIDEBAR_MIN = 44;
const SIDEBAR_MAX = 340;
const COLLAPSE_THRESHOLD = 100;
const TITLEBAR_DEFAULT = 38;

function genProjectCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildSidebarProfile(user: CurrentUser) {
  const cachedProfile = loadProfile();
  return {
    ...cachedProfile,
    displayName: user.name,
    email: user.email,
    role: user.role === "ADMIN" ? "Administrator" : "Project Member",
  };
}

function cacheProjectSummary(detail: ProjectDetail) {
  const currentSettings = loadSettings();
  saveSettings({
    ...currentSettings,
    projectName: detail.projectName,
    description: detail.description || currentSettings.description,
    startDate: detail.startDate || currentSettings.startDate,
    targetDate: detail.targetDate || currentSettings.targetDate,
    repository: detail.repositoryUrl || currentSettings.repository,
  });
}

function resetWorkspaceState({
  setAuthSession,
  setCurrentUser,
  setShowStandup,
  setScreen,
  setProjectId,
  setProject,
  setProjectCode,
  setLocalPath,
  setDiffFile,
}: {
  setAuthSession: React.Dispatch<React.SetStateAction<AuthSession | null>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
  setShowStandup: React.Dispatch<React.SetStateAction<boolean>>;
  setScreen: React.Dispatch<React.SetStateAction<"login" | "join" | "workspace">>;
  setProjectId: React.Dispatch<React.SetStateAction<number | null>>;
  setProject: React.Dispatch<React.SetStateAction<string>>;
  setProjectCode: React.Dispatch<React.SetStateAction<string>>;
  setLocalPath: React.Dispatch<React.SetStateAction<string>>;
  setDiffFile: React.Dispatch<React.SetStateAction<CommitFile | null>>;
}) {
  setAuthSession(null);
  setCurrentUser(null);
  setShowStandup(false);
  setScreen("login");
  setProjectId(null);
  setProject("");
  setProjectCode("");
  setLocalPath("");
  setDiffFile(null);
}

const NAV_ITEMS = [
  { id: "Dashboard", icon: Home, label: "Dashboard" },
  { id: "Changes", icon: GitPullRequest, label: "Changes" },
  { id: "Commits", icon: GitCommit, label: "Commits" },
  { id: "ServerBuild", icon: Terminal, label: "Server & Build" },
  { id: "Chat", icon: MessageCircle, label: "Chat" },
  { id: "Calendar", icon: CalendarDays, label: "Calendar" },
  { id: "Galaxy", icon: Orbit, label: "SynAIpse Galaxy" },
] as const;

const SYSTEM_ITEMS = [
  { id: "EnvSettings", icon: Settings, label: "Environment" },
  { id: "AIQA", icon: ShieldCheck, label: "QA & Agents" },
  { id: "ProjectSettings", icon: FolderGit2, label: "Project Settings" },
] as const;

type NavId =
  | "Dashboard" | "Changes" | "Commits" | "ServerBuild"
  | "Chat" | "Calendar" | "EnvSettings" | "AIQA"
  | "ProjectSettings" | "Profile" | "Galaxy";

const TAB_LABELS: Record<NavId, string> = {
  Dashboard: "Dashboard",
  Changes: "Changes",
  Commits: "Commits",
  ServerBuild: "Server & Build",
  Chat: "Chat",
  Calendar: "Calendar",
  EnvSettings: "Environment",
  AIQA: "QA & Agents",
  ProjectSettings: "Project Settings",
  Profile: "Profile",
  Galaxy: "SynAIpse Galaxy",
};

const HEADER_TAB_WIDTH = `${Math.max(...Object.values(TAB_LABELS).map(label => label.length)) + 8}ch`;

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
        onMouseDown={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(174,183,132,0.06)"; }}
        onMouseUp={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = hov ? SIDEBAR_HOVER : "transparent"; }}
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
export default function App() {
  const [screen, setScreen] = useState<"login" | "join" | "workspace">("login");
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadSession());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [projectName, setProject] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectCode, setProjectCode] = useState("");
  const [localPath, setLocalPath] = useState("");

  const [leftTabs, setLeftTabs] = useState<NavId[]>(["Dashboard"]);
  const [rightTabs, setRightTabs] = useState<NavId[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState<NavId>("Dashboard");
  const [activeRightTab, setActiveRightTab] = useState<NavId>("Chat");
  const [isSplit, setIsSplit] = useState(false);
  const [activePanel, setActivePanel] = useState<"left" | "right">("left");
  const [splitPercent, setSplitPercent] = useState<number>(50);

  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const [draggedTab, setDraggedTab] = useState<{ id: NavId; from: "left" | "right" } | null>(null);

  const [diffFile, setDiffFile] = useState<CommitFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [joinExiting, setJoinExiting] = useState(false);
  const [sidebarProfile, setSidebarProfile] = useState(() => loadProfile());
  const [docCount, setDocCount] = useState(() => loadDocs().length);

  const [showStandup, setShowStandup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_EXPANDED);
  const isCollapsed = sidebarWidth <= COLLAPSE_THRESHOLD;
  const [showTitleBar, setShowTitleBar] = useState(true);
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  const [titleBarHeight, setTitleBarHeight] = useState<number>(TITLEBAR_DEFAULT);
  const isHeaderDragging = useRef(false);
  const dragHeaderStartY = useRef(0);
  const dragHeaderStartH = useRef(TITLEBAR_DEFAULT);

  useEffect(() => {
    if (!showSystemMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(e.target as Node)) {
        setShowSystemMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showSystemMenu]);

  useEffect(() => {
    const handleSessionChange = () => {
      const nextSession = loadSession();
      setAuthSession(nextSession);

      if (!nextSession) {
        setCurrentUser(null);
        setShowStandup(false);
        setProjectId(null);
        setProject("");
        setProjectCode("");
        setLocalPath("");
        setDiffFile(null);
        setScreen("login");
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_SESSION_EVENT, handleSessionChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(AUTH_SESSION_EVENT, handleSessionChange);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      const existingSession = loadSession();

      if (!existingSession) {
        if (active) {
          setAuthSession(null);
          setCurrentUser(null);
          setScreen("login");
          setAuthBootstrapping(false);
        }
        return;
      }

      if (isPublishingSession(existingSession)) {
        if (active) {
          setAuthSession(existingSession);
          setCurrentUser(PUBLISHING_USER);
          setProjectId(111);
          setProject("퍼블리싱 테스트 프로젝트");
          setProjectCode("PUBLISH-111");
          setLocalPath("");
          setScreen("workspace");
          setAuthBootstrapping(false);
        }
        return;
      }

      try {
        const refreshedSession = await refreshSession(existingSession.refreshToken);
        const user = await fetchCurrentUser();

        if (!active) return;

        setAuthSession(refreshedSession);
        setCurrentUser(user);
        setScreen("join");
      } catch {
        if (!active) return;

        clearSession();
        setAuthSession(null);
        setCurrentUser(null);
        setScreen("login");
      } finally {
        if (active) setAuthBootstrapping(false);
      }
    };

    void bootstrapSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const nextProfile = buildSidebarProfile(currentUser);
    setSidebarProfile(nextProfile);
    saveProfile(nextProfile);
  }, [currentUser]);

  useEffect(() => {
    if (!projectId || isPublishingSession(authSession)) {
      return;
    }

    let active = true;

    const syncProjectContext = async () => {
      try {
        const detail = await fetchProjectDetail(projectId);
        if (!active) return;

        setProject(detail.projectName);
        setProjectCode(detail.projectCode);
        setLocalPath(detail.localPath ?? "");
        cacheProjectSummary(detail);
      } catch (error) {
        console.error(error);
      }
    };

    void syncProjectContext();

    return () => {
      active = false;
    };
  }, [authSession, projectId]);

  const handleNavClick = (id: NavId) => {
    setDiffFile(null);
    if (!isSplit || activePanel === "left") {
      if (!leftTabs.includes(id)) setLeftTabs([...leftTabs, id]);
      setActiveLeftTab(id);
      setActivePanel("left");
    } else {
      if (!rightTabs.includes(id)) setRightTabs([...rightTabs, id]);
      setActiveRightTab(id);
      setActivePanel("right");
    }
  };

  const handleTabDrop = (target: "left" | "right" | "split-left" | "split-right") => {
    if (!draggedTab) return;
    const { id: tabId, from: source } = draggedTab;

    setIsDraggingTab(false);
    setDraggedTab(null);

    if ((target === "split-left" || target === "split-right") && leftTabs.length <= 1) {
      return;
    }

    if (target === "split-left") {
      const remaining = leftTabs.filter(t => t !== tabId);
      setLeftTabs([tabId]);
      setActiveLeftTab(tabId);
      setRightTabs(remaining);
      setActiveRightTab(remaining[remaining.length - 1]);
      setIsSplit(true);
      setSplitPercent(50);
      setActivePanel("left");
      return;
    }

    if (target === "split-right") {
      const remaining = leftTabs.filter(t => t !== tabId);
      setLeftTabs(remaining);
      setActiveLeftTab(remaining[remaining.length - 1]);
      setRightTabs([tabId]);
      setActiveRightTab(tabId);
      setIsSplit(true);
      setSplitPercent(50);
      setActivePanel("right");
      return;
    }

    if (source === target) return;

    if (source === "left" && target === "right") {
      const nextLeft = leftTabs.filter(t => t !== tabId);
      if (nextLeft.length === 0) {
        setLeftTabs([...rightTabs, tabId]);
        setActiveLeftTab(tabId);
        setRightTabs([]);
        setIsSplit(false);
        setActivePanel("left");
      } else {
        setLeftTabs(nextLeft);
        if (activeLeftTab === tabId) setActiveLeftTab(nextLeft[nextLeft.length - 1]);
        if (!rightTabs.includes(tabId)) setRightTabs([...rightTabs, tabId]);
        setActiveRightTab(tabId);
        setActivePanel("right");
      }
    }
    else if (source === "right" && target === "left") {
      const nextRight = rightTabs.filter(t => t !== tabId);
      if (!leftTabs.includes(tabId)) setLeftTabs([...leftTabs, tabId]);
      setActiveLeftTab(tabId);
      setActivePanel("left");

      if (nextRight.length === 0) {
        setRightTabs([]);
        setIsSplit(false);
      } else {
        setRightTabs(nextRight);
        if (activeRightTab === tabId) setActiveRightTab(nextRight[nextRight.length - 1]);
      }
    }
  };

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(SIDEBAR_EXPANDED);
  const isSplitDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  const onSplitResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isSplitDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onHeaderResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isHeaderDragging.current = true;
    dragHeaderStartY.current = e.clientY;
    dragHeaderStartH.current = showTitleBar ? titleBarHeight : 0;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [titleBarHeight, showTitleBar]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStartW.current + e.clientX - dragStartX.current));
        setSidebarWidth(next);
      }
      if (isHeaderDragging.current) {
        const next = Math.max(0, Math.min(TITLEBAR_DEFAULT, dragHeaderStartH.current + e.clientY - dragHeaderStartY.current));
        setTitleBarHeight(next);
        if (next === 0) {
          setShowTitleBar(false);
        } else {
          setShowTitleBar(true);
        }
      }
      if (isSplitDragging.current && splitContainerRef.current) {
        const rect = splitContainerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = (offsetX / rect.width) * 100;
        setSplitPercent(Math.max(20, Math.min(80, percent)));
      }
    };

    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setSidebarWidth(w => w < COLLAPSE_THRESHOLD ? SIDEBAR_COLLAPSED : w);
      }
      if (isHeaderDragging.current) isHeaderDragging.current = false;
      if (isSplitDragging.current) isSplitDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const toggleSidebar = () => setSidebarWidth(w => w <= COLLAPSE_THRESHOLD ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED);

  // 🚀 로그인 성공 시 실행되는 함수 (async로 변경됨)
  const handleAuthenticated = async (session: AuthSession, user: CurrentUser) => {
    setAuthSession(session);
    setCurrentUser(user);

    if (isPublishingSession(session)) {
      setScreen("workspace");
      setProjectId(111);
      setProject("퍼블리싱 테스트 프로젝트");
      setProjectCode("PUBLISH-111");
      setLocalPath("");
      return;
    }

    setScreen("join");
    setProjectId(null);
    setProject("");
    setProjectCode("");
    setLocalPath("");
  };

  const handleJoin = (project: ProjectLaunchTarget) => {
    setJoinExiting(true);
    setTimeout(() => {
      setProjectId(project.projectId);
      setProject(project.projectName);
      setProjectCode(project.projectCode ?? genProjectCode());
      setLocalPath(project.localPath ?? "");
      setScreen("workspace");

      setLeftTabs(["Dashboard"]);
      setActiveLeftTab("Dashboard");
      setRightTabs([]);
      setIsSplit(false);
      setActivePanel("left");

      setDiffFile(null);
      setIsLoading(true);
      setJoinExiting(false);

      if (project.localPath || project.projectName) {
        const cur = loadSettings();
        saveSettings({
          ...cur,
          projectName: project.projectName || cur.projectName,
          repository: project.localPath || cur.repository,
          description: cur.description || `${project.projectName} project`,
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

  const handleLeaveProject = () => {
    setShowStandup(false);
    setScreen("join");
    setProjectId(null);
    setProject("");
    setProjectCode("");
    setLocalPath("");
    setDiffFile(null);
  };

  const handleLogout = async () => {
    resetWorkspaceState({
      setAuthSession,
      setCurrentUser,
      setShowStandup,
      setScreen,
      setProjectId,
      setProject,
      setProjectCode,
      setLocalPath,
      setDiffFile,
    });

    try {
      await logout();
    } catch {
      clearSession();
    }
  };

  const handleFileSelect = (file: CommitFile | null) => setDiffFile(file);
  const handleNavigateQA = () => { setDiffFile(null); handleNavClick("AIQA"); };

  const handleStandupNavigate = (page: string) => {
    handleNavClick(page as NavId);
    setDiffFile(null);
    setShowStandup(false);
  };

  const renderPage = (nav: NavId) => {
    switch (nav) {
      case "Dashboard": return isPublishingSession(authSession)
        ? <WeAIDashboard />
        : <DashboardPage projectId={projectId} projectName={projectName} />;
      case "Changes": return <ChangesPage projectId={projectId ?? 0} onNavigateQA={handleNavigateQA} />;
      case "Commits": return <CommitDiffPage projectId={projectId} />;
      case "ServerBuild": return <ServerBuildPage />;
      case "Chat": return <ChatPage projectId={projectId ?? 0} onDocsUpdate={setDocCount} />;
      case "Calendar": return <CalendarPage projectId={projectId} />;
      case "EnvSettings": return <EnvironmentSettingsPage />;
      case "AIQA": return <AIQAPage projectId={projectId ?? 0} autoStart />;
      case "ProjectSettings": return <ProjectSettingsPage projectId={projectId} currentUserId={currentUser?.id ?? null} />;
      case "Profile": return <ProfilePage />;
      case "Galaxy": return <SynAIpseGalaxyPage />;
      default: return isPublishingSession(authSession)
        ? <WeAIDashboard />
        : <DashboardPage projectId={projectId} projectName={projectName} />;
    }
  };

  const renderPanel = (
    panelType: "left" | "right",
    tabs: NavId[],
    activeTab: NavId,
    setActiveTab: (id: NavId) => void
  ) => {
    const isFocused = activePanel === panelType;
    const shouldShowTabs = isSplit || tabs.length > 1;

    return (
      <div
        className="size-full flex flex-col overflow-hidden transition-colors duration-200"
        style={{ background: "#0d1117", border: isFocused ? "1px solid #AEB784" : "1px solid transparent" }}
        onClickCapture={() => setActivePanel(panelType)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleTabDrop(panelType)}
      >
        {shouldShowTabs && (
          <div className="flex items-center shrink-0 overflow-x-auto select-none" style={{ background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.08)", height: "35px" }}>
            {tabs.map(tId => {
              const tabLabel = TAB_LABELS[tId];

              return (
                <div
                  key={tId}
                  draggable
                  onDragStart={(e) => {
                    setDraggedTab({ id: tId, from: panelType });
                    setTimeout(() => setIsDraggingTab(true), 0);
                  }}
                  onDragEnd={() => {
                    setIsDraggingTab(false);
                    setDraggedTab(null);
                  }}
                  onClick={() => setActiveTab(tId)}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium cursor-pointer transition-all border-r select-none"
                  style={{
                    width: HEADER_TAB_WIDTH,
                    minWidth: HEADER_TAB_WIDTH,
                    maxWidth: HEADER_TAB_WIDTH,
                    color: activeTab === tId ? "#c9d1d9" : "#8b949e",
                    background: activeTab === tId ? "#0d1117" : "transparent",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    borderTop: activeTab === tId ? "2px solid #AEB784" : "2px solid transparent"
                  }}
                  title={tabLabel}
                >
                  <span className="min-w-0 flex-1 truncate">{tabLabel}</span>
                  <X
                    className="w-3 h-3 hover:text-red-400 transition-colors rounded-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextTabs = tabs.filter(t => t !== tId);

                      if (panelType === "left") {
                        if (nextTabs.length === 0 && isSplit) {
                          setLeftTabs([...rightTabs]);
                          setActiveLeftTab(activeRightTab);
                          setRightTabs([]);
                          setIsSplit(false);
                          setActivePanel("left");
                        } else {
                          setLeftTabs(nextTabs);
                          if (nextTabs.length > 0 && activeTab === tId) {
                            setActiveLeftTab(nextTabs[nextTabs.length - 1]);
                          }
                        }
                      } else {
                        if (nextTabs.length === 0) {
                          setRightTabs([]);
                          setIsSplit(false);
                          setActivePanel("left");
                        } else {
                          setRightTabs(nextTabs);
                          if (activeTab === tId) {
                            setActiveRightTab(nextTabs[nextTabs.length - 1]);
                          }
                        }
                      }
                    }}
                  />
                </div>
              );
            })}
            <div className="ml-auto px-3 flex items-center gap-2" />
          </div>
        )}

        <div className="flex-1 overflow-auto scrollbar-hide relative">
          {tabs.length > 0 ? (
            <div className="flex-1 flex flex-col w-full h-full min-w-full min-h-full">
              {renderPage(activeTab)}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-white/30">
              열려있는 메뉴가 없습니다.
            </div>
          )}
        </div>
      </div>
    );
  };

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

    return (
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden relative">
        <div
          style={{ width: isSplit ? `${splitPercent}%` : "100%" }}
          className="h-full flex flex-col overflow-hidden shrink-0"
        >
          {renderPanel("left", leftTabs, activeLeftTab, setActiveLeftTab)}
        </div>

        {isSplit && (
          <div
            onMouseDown={onSplitResizeMouseDown}
            className="absolute top-0 bottom-0 w-2 hover:bg-[#AEB784]/60 cursor-col-resize z-30 transition-colors"
            style={{ left: `calc(${splitPercent}% - 4px)` }}
            title="드래그하여 크기 조절"
          />
        )}

        {isSplit && (
          <div
            style={{ width: `${100 - splitPercent}%` }}
            className="h-full flex flex-col overflow-hidden shrink-0"
          >
            {renderPanel("right", rightTabs, activeRightTab, setActiveRightTab)}
          </div>
        )}

        {!isSplit && isDraggingTab && (
          <div className="absolute inset-0 flex z-40 pointer-events-none animate-in fade-in duration-150">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleTabDrop("split-left")}
              className="w-1/2 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#AEB784]/40 bg-[#AEB784]/5 text-xs text-[#AEB784] pointer-events-auto backdrop-blur-[2px]"
            >
              <div className="p-5 border border-dashed border-[#AEB784]/30 rounded-xl bg-[#161b22]/95 text-center shadow-2xl">
                <p className="font-semibold mb-1 text-[11px] text-[#c9d1d9]">좌측 분할 영역</p>
                <p className="text-[10px] text-white/40">여기에 놓으면 왼쪽에 새 분할창을 엽니다</p>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleTabDrop("split-right")}
              className="w-1/2 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#AEB784]/40 bg-[#AEB784]/5 text-xs text-[#AEB784] pointer-events-auto backdrop-blur-[2px] border-l-0"
            >
              <div className="p-5 border border-dashed border-[#AEB784]/30 rounded-xl bg-[#161b22]/95 text-center shadow-2xl">
                <p className="font-semibold mb-1 text-[11px] text-[#c9d1d9]">우측 분할 영역</p>
                <p className="text-[10px] text-white/40">여기에 놓으면 오른쪽에 새 분할창을 엽니다</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (authBootstrapping) {
    return (
      <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER }}>
        <div
          className="flex-1 flex items-center justify-center rounded-xl"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)", background: SIDEBAR_BG }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: GRADIENT_LOGO }}>
              <FolderGit2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.92)" }} />
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: SIDEBAR_TEXT_ACTIVE }}>SynAIpse</p>
              <p className="text-sm" style={{ color: SIDEBAR_TEXT }}>
                saved session 복구 중...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authSession || screen === "login") {
    return (
      <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER }}>
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)" }}>
          <LoginScreen onAuthenticated={handleAuthenticated} />
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div
        className="size-full flex p-3"
        style={{
          background: GRADIENT_OUTER,
          opacity: joinExiting ? 0 : 1,
          transform: joinExiting ? "translateX(-28px) scale(0.99)" : "translateX(0) scale(1)",
          transition: joinExiting ? "opacity 0.40s ease, transform 0.40s ease" : "none",
        }}
      >
        <style>{`@keyframes _join-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden"
          style={{
            boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)",
            animation: "_join-fadein 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          <JoinProjectScreen
            currentUser={currentUser}
            onOpenProject={handleJoin}
            onLogout={() => void handleLogout()}
          />
        </div>
      </div>
    );
  }

  const currentActiveTab = activePanel === "left" ? activeLeftTab : activeRightTab;

  return (
    <div className="size-full flex p-3" style={{ background: GRADIENT_OUTER }}>
      {showStandup && (
        <DailyStandupModal
          userName={sidebarProfile.displayName}
          userPart={sidebarProfile.role}
          projectId={projectId ?? 0}
          onClose={() => setShowStandup(false)}
          onNavigate={handleStandupNavigate}
        />
      )}

      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        style={{
          background: SIDEBAR_BG,
          boxShadow: "0 2px 4px rgba(0,0,0,0.25), 0 12px 48px rgba(0,0,0,0.35)",
        }}
      >
        {(!showTitleBar || titleBarHeight === 0) && (
          <div className="absolute top-3 right-4 z-40 transition-all">
            <NotificationPanel />
          </div>
        )}

        <div
          className="flex items-center pl-2 pr-4 shrink-0 relative"
          style={{
            height: showTitleBar ? titleBarHeight : 0,
            borderBottom: (showTitleBar && titleBarHeight > 0) ? `1px solid ${SIDEBAR_BORDER}` : "none",
            background: (showTitleBar && titleBarHeight > 0) ? GRADIENT_SIDEBAR : "transparent",
            overflow: (showTitleBar && titleBarHeight > 0) ? "visible" : "hidden",
            transition: isHeaderDragging.current ? "none" : "height 0.18s ease",
          }}
        >
          {showTitleBar && titleBarHeight > 0 && (
            <div className="flex items-center w-full h-full pr-0">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: GRADIENT_LOGO }}>
                  <FolderGit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: SIDEBAR_TEXT_ACTIVE }}>SynAIpse Project Office</span>
              </div>

              {projectCode && (
                <div className="ml-3 flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0" style={{ background: "rgba(174,183,132,0.12)", border: `1px solid rgba(174,183,132,0.18)` }}>
                  <Hash className="w-2.5 h-2.5" style={{ color: SIDEBAR_TEXT_HOVER }} />
                  <span className="text-[9px] font-mono font-semibold tracking-wider" style={{ color: SIDEBAR_TEXT_HOVER }}>{projectCode}</span>
                </div>
              )}

              {diffFile && (
                <div className="ml-4 flex items-center gap-2 text-[11px] shrink-0" style={{ color: SIDEBAR_TEXT }}>
                  <span>/</span>
                  <span style={{ color: SIDEBAR_TEXT_ACTIVE }}>{diffFile.name}</span>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowStandup(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all"
                  style={{
                    background: showStandup ? "rgba(174,183,132,0.20)" : "rgba(174,183,132,0.10)",
                    color: "#D4CC9E",
                    border: `1px solid rgba(174,183,132,0.18)`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(174,183,132,0.20)"}
                  onMouseLeave={e => e.currentTarget.style.background = showStandup ? "rgba(174,183,132,0.20)" : "rgba(174,183,132,0.10)"}
                  title="데일리 스탠드업 브리핑"
                >
                  <Sun className="w-3 h-3" />
                  스탠드업
                </button>

                <NotificationPanel />
              </div>
            </div>
          )}
        </div>

        <div
          onMouseDown={onHeaderResizeMouseDown}
          className="absolute left-0 w-full z-50 transition-colors"
          style={{
            cursor: "row-resize",
            background: "transparent",
            top: `${showTitleBar ? titleBarHeight : 0}px`,
            height: showTitleBar ? "4px" : "8px",
            transform: showTitleBar ? "translateY(-50%)" : "translateY(0)",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(174,183,132,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        />

        <div className="flex-1 flex overflow-hidden">
          <div
            className="flex flex-col shrink-0 relative"
            style={{
              width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
              borderRight: `1px solid ${SIDEBAR_BORDER}`,
              background: GRADIENT_SIDEBAR,
              transition: isDragging.current ? "none" : "width 0.18s ease",
              overflow: showSystemMenu ? "visible" : "hidden",
            }}
          >
            <div className={`shrink-0 ${isCollapsed ? "py-1.5" : "p-3"}`} style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
              {isCollapsed ? (
                <div className="relative group">
                  <button
                    onClick={() => handleNavClick("Profile")}
                    className="w-full flex justify-center py-1 rounded-lg transition-all"
                    style={{ background: (currentActiveTab === "Profile" && !diffFile) ? SIDEBAR_ACTIVE : "transparent" }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GRADIENT_LOGO }}>
                      <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.90)" }} />
                    </div>
                  </button>
                  <Tooltip label="Profile — 병권" />
                </div>
              ) : (
                <button
                  onClick={() => handleNavClick("Profile")}
                  className="w-full text-left transition-all rounded-lg px-1 py-1"
                  style={{ background: (currentActiveTab === "Profile" && !diffFile) ? SIDEBAR_ACTIVE : "transparent" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: GRADIENT_LOGO }}>
                      <User className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: SIDEBAR_TEXT_ACTIVE }}>{sidebarProfile.displayName}</p>
                      <p className="text-[9px] truncate" style={{ color: SIDEBAR_TEXT }}>{sidebarProfile.role}</p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
              {!isCollapsed && (
                <div className="px-2.5 pt-2.5 pb-2" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: SIDEBAR_TEXT_LABEL }}>Current Project</p>
                  <div className="px-2 py-1.5 rounded-lg" style={{ background: "rgba(174,183,132,0.12)", border: `1px solid rgba(174,183,132,0.18)` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Circle className="w-1.5 h-1.5 fill-current shrink-0" style={{ color: "#10b981" }} />
                      <p className="text-[10px] font-semibold truncate" style={{ color: SIDEBAR_TEXT_ACTIVE }}>{projectName}</p>
                    </div>
                    {projectCode && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <Hash className="w-2.5 h-2.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[9px] font-mono tracking-widest" style={{ color: SIDEBAR_TEXT }}>{projectCode}</span>
                      </div>
                    )}
                    {localPath && (
                      <div className="flex items-center gap-1">
                        <Folder className="w-2.5 h-2.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[8px] font-mono truncate" style={{ color: SIDEBAR_TEXT }}>{localPath}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isCollapsed && projectCode && (
                <div className="flex justify-center py-2" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(174,183,132,0.12)" }} title={`${projectName} #${projectCode}`}>
                    <Circle className="w-2 h-2 fill-current" style={{ color: "#10b981" }} />
                  </div>
                </div>
              )}

              <div className={`pt-2.5 pb-2 ${isCollapsed ? "px-1" : "px-1.5"}`}>
                <SectionLabel collapsed={isCollapsed}>MAIN</SectionLabel>
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map(item => {
                    const badge = item.id === "Chat" && docCount > 0 && !isCollapsed ? (
                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "rgba(174,183,132,0.18)", color: SIDEBAR_TEXT_HOVER }}>
                        {docCount}
                      </span>
                    ) : null;
                    return (
                      <div key={item.id} className="relative">
                        <NavBtn
                          icon={item.icon}
                          label={item.label}
                          active={currentActiveTab === item.id && !diffFile}
                          collapsed={isCollapsed}
                          onClick={() => handleNavClick(item.id)}
                        />
                        {badge && <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">{badge}</div>}
                      </div>
                    );
                  })}
                </nav>
              </div>

              <div className={`pb-2 ${isCollapsed ? "px-1" : "px-1.5"}`}>
                <SectionLabel collapsed={isCollapsed}>SYSTEM</SectionLabel>
                <nav className="space-y-0.5">
                  {SYSTEM_ITEMS.map(item => (
                    <NavBtn
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={currentActiveTab === item.id && !diffFile}
                      collapsed={isCollapsed}
                      onClick={() => handleNavClick(item.id)}
                    />
                  ))}
                </nav>
              </div>
            </div>

            <div
              ref={systemMenuRef}
              className={`shrink-0 ${isCollapsed ? "px-1 py-2" : "px-1.5 py-2"} relative`}
              style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}
            >
              {showSystemMenu && (
                <div
                  className="absolute bottom-full left-2 mb-2 w-48 rounded-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  style={{
                    background: "#1c1c1e",
                    border: `1px solid ${SIDEBAR_BORDER}`,
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.45)",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowTitleBar(v => {
                        const next = !v;
                        if (next) {
                          setTitleBarHeight(TITLEBAR_DEFAULT);
                        } else {
                          setTitleBarHeight(0);
                        }
                        return next;
                      });
                    }}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-xs transition-all hover:bg-white/[0.06]"
                    style={{ color: SIDEBAR_TEXT }}
                  >
                    {showTitleBar ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[10px]">Hide Titlebar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[10px]">Show Titlebar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => { setShowSystemMenu(false); toggleSidebar(); }}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-xs transition-all hover:bg-white/[0.06]"
                    style={{ color: SIDEBAR_TEXT }}
                  >
                    {isCollapsed ? (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[10px]">Expand</span>
                      </>
                    ) : (
                      <>
                        <ChevronLeft className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                        <span className="text-[10px]">Collapse</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLeaveProject}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-xs transition-all hover:bg-white/[0.06]"
                    style={{ color: "#D4CC9E" }}
                  >
                    <FolderGit2 className="w-4 h-4 shrink-0" style={{ color: "#D4CC9E" }} />
                    <span className="text-xs">Back To Projects</span>
                  </button>

                  <button
                    onClick={() => void handleLogout()}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-xs transition-all hover:bg-[#B85450]/15"
                    style={{ color: "#B85450" }}
                  >
                    <LogOut className="w-4 h-4 shrink-0" style={{ color: "#B85450" }} />
                    <span className="text-xs">Sign Out</span>
                  </button>
                </div>
              )}

              <div className="relative group">
                <button
                  onClick={() => setShowSystemMenu(v => !v)}
                  className="w-full flex items-center gap-2 rounded-lg transition-all"
                  style={{
                    padding: isCollapsed ? "7px 0" : "6px 8px",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    color: SIDEBAR_TEXT_ACTIVE,
                    background: showSystemMenu ? SIDEBAR_ACTIVE : "transparent",
                  }}
                  onMouseEnter={e => { if (!showSystemMenu) e.currentTarget.style.background = SIDEBAR_HOVER; }}
                  onMouseLeave={e => { if (!showSystemMenu) e.currentTarget.style.background = "transparent"; }}
                >
                  <Menu className="w-4 h-4 shrink-0" style={{ color: SIDEBAR_TEXT_ACTIVE }} />
                  {!isCollapsed && <span className="text-xs font-medium">System Menu</span>}
                </button>
                {isCollapsed && <Tooltip label="시스템 메뉴" />}
              </div>
            </div>

            <div
              onMouseDown={onResizeMouseDown}
              className="absolute top-0 right-0 h-full w-1 z-20 transition-colors"
              style={{ cursor: "col-resize", background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(174,183,132,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            />
          </div>

          {renderContent()}
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "#F5F4F1" }}>
            <style>{`
              @keyframes _spin    { to { transform: rotate(360deg); } }
              @keyframes _spinRev { to { transform: rotate(-360deg); } }
              @keyframes _fadein  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes _dot     { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
              @keyframes _pulse   { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>
            <div style={{ animation: "_fadein 0.35s ease forwards", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(65,67,27,0.08)", borderTopColor: "#AEB784", borderRightColor: "#AEB784", animation: "_spin 2s linear infinite" }} />
                <div style={{ position: "absolute", inset: 7, borderRadius: "50%", border: "2px solid rgba(65,67,27,0.06)", borderBottomColor: "#41431B", borderLeftColor: "#41431B", animation: "_spinRev 1.2s linear infinite" }} />
                <div style={{ position: "absolute", inset: 16, borderRadius: 12, background: "#41431B", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(65,67,27,0.30)" }}>
                  <FolderGit2 style={{ width: 22, height: 22, color: "white" }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1C06", marginBottom: 5, letterSpacing: "-0.01em" }}>프로젝트 로딩 중</p>
                <p style={{ fontSize: 11, color: "#6B6C4E", fontWeight: 500, animation: "_pulse 1.8s ease infinite" }}>{projectName}</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#AEB784", animation: `_dot 1.2s ease ${i * 0.18}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
