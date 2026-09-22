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
  Orbit,
  X,
  Menu,
  BarChart2,
  BookOpen,
  CheckSquare,
  Search,
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react";

// ── 페이지 컴포넌트 ──
import { SynAIpseGalaxyPage } from "./components/SynAIpseGalaxyPage";
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
import { NotificationsPage } from "./components/NotificationsPage";
import { TasksPage } from "./components/TasksPage";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { SharedLibraryPage } from "./components/SharedLibraryPage";
import type { CommitFile } from "./components/commitData";
import { loadProfile, saveProfile } from "./data/profileStore";
import { saveSettings, loadSettings } from "./data/projectSettingsStore";
import { saveLastActiveProject, loadLastActiveProject, clearLastActiveProject } from "./data/activeProjectStore";
import { NotificationPanel } from "./components/NotificationPanel";
import { NotificationModal } from "./components/NotificationModal";
import { WindowControls } from "./components/WindowControls";
import { AuxTitleBar } from "./components/AuxTitleBar";
import {
  DailyStandupModal,
  shouldShowDailyStandup,
  recordProjectAccessTime,
} from "./components/DailyStandupModal";
import {
  AUTH_SESSION_EVENT,
  AuthSession,
  CurrentUser,
  ApiError,
  ProjectDetail,
  ProjectLaunchTarget,
  clearSession,
  fetchCurrentUser,
  fetchProjectDetail,
  loadSession,
  logout,
  refreshSession,
} from "./lib/api";

// ── 디자인 토큰 ──
import {
  SIDEBAR_BG, SIDEBAR_HOVER, SIDEBAR_ACTIVE,
  GRADIENT_LOGO, GRADIENT_SIDEBAR, GRADIENT_OUTER,
  TITLEBAR_BG, CONTENT_BG, ACCENT,
  SIDEBAR_TEXT, SIDEBAR_TEXT_ACTIVE, SIDEBAR_TEXT_HOVER,
  SIDEBAR_TEXT_LABEL, SIDEBAR_BORDER,
  TERM_BG, TERM_HEADER, TERM_TEXT, TERM_MUTED, BTN_DARK,
} from "./colors";

// ── 사이드바 너비 상수 ──
const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 52;
const SIDEBAR_MIN = 44;
const SIDEBAR_MAX = 340;
const COLLAPSE_THRESHOLD = 100;

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
  clearLastActiveProject();
}

// 사용 빈도 순으로 정렬: 일상적으로 쓰는 항목(대시보드/채팅/캘린더)을 먼저, 개발 도구
// (Changes/Commits/Server & Build)를 다음에, 분석/부가 기능(Analytics/Galaxy)을 마지막에 둔다.
const NAV_ITEMS = [
  { id: "Dashboard", icon: Home, label: "Dashboard" },
  { id: "Chat", icon: MessageCircle, label: "Chat" },
  { id: "Calendar", icon: CalendarDays, label: "Calendar" },
  { id: "Tasks", icon: CheckSquare, label: "Tasks" },
  { id: "Changes", icon: GitPullRequest, label: "Changes" },
  { id: "Commits", icon: GitCommit, label: "Commits" },
  { id: "ServerBuild", icon: Terminal, label: "Server & Build" },
  { id: "Analytics", icon: BarChart2, label: "Analytics" },
  { id: "Galaxy", icon: Orbit, label: "SynAIpse Galaxy" },
] as const;

// QA Reports는 AIQA 탭 안으로 합쳐졌고(내부 서브탭), Agent Control은 Project Settings로
// 이동했다 - 둘 다 더 이상 별도 사이드바 항목이 아니다.
const SYSTEM_ITEMS = [
  { id: "ProjectSettings", icon: FolderGit2, label: "Project Settings" },
  { id: "EnvSettings", icon: Settings, label: "Environment" },
  { id: "AIQA", icon: ShieldCheck, label: "QA" },
  { id: "SharedLibrary", icon: BookOpen, label: "Shared Library" },
] as const;

type NavId =
  | "Dashboard" | "Changes" | "Commits" | "ServerBuild"
  | "Chat" | "Calendar" | "EnvSettings" | "AIQA"
  | "SharedLibrary" | "Analytics"
  | "ProjectSettings" | "Profile" | "Galaxy" | "Notifications" | "Tasks";

const TAB_LABELS: Record<NavId, string> = {
  Dashboard: "Dashboard",
  Changes: "Changes",
  Commits: "Commits",
  ServerBuild: "Server & Build",
  Chat: "Chat",
  Calendar: "Calendar",
  EnvSettings: "Environment",
  AIQA: "QA",
  SharedLibrary: "Shared Library",
  Analytics: "Analytics",
  ProjectSettings: "Project Settings",
  Profile: "Profile",
  Galaxy: "SynAIpse Galaxy",
  Notifications: "Notifications",
  Tasks: "Tasks",
};

const HEADER_TAB_WIDTH = `${Math.max(...Object.values(TAB_LABELS).map(label => label.length)) + 5}ch`;

// ── Tooltip ──
function Tooltip({ label }: { label: string }) {
  return (
    <div
      className="absolute left-full ml-2 px-2 py-1 rounded-lg text-[8px] font-semibold pointer-events-none whitespace-nowrap z-50"
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
          padding: collapsed ? "5px 0" : "5px 8px",
          justifyContent: collapsed ? "center" : "flex-start",
          color: active ? SIDEBAR_TEXT_ACTIVE : SIDEBAR_TEXT,
          background: active ? SIDEBAR_ACTIVE : hov ? SIDEBAR_HOVER : "transparent",
        }}
        onMouseDown={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(166,123,91,0.06)"; }}
        onMouseUp={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = hov ? SIDEBAR_HOVER : "transparent"; }}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? SIDEBAR_TEXT_ACTIVE : hov ? SIDEBAR_TEXT_HOVER : SIDEBAR_TEXT }} />
        {!collapsed && (
          <span className="text-[11px] font-medium flex-1 truncate" style={{ color: active ? SIDEBAR_TEXT_ACTIVE : hov ? SIDEBAR_TEXT_HOVER : SIDEBAR_TEXT }}>
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
  const [, setDocCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [showStandup, setShowStandup] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_EXPANDED);
  const isCollapsed = sidebarWidth <= COLLAPSE_THRESHOLD;
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  // 창이 활성(포커스)/비활성 상태인지 추적 — frame:false(Frameless Window)라 OS가 그려주는
  // 활성/비활성 타이틀바 표시가 없으므로, 앱이 직접 최상위 컨테이너 외곽선으로 대신 알려준다.
  const [isWindowFocused, setIsWindowFocused] = useState(
    () => typeof document === "undefined" || document.hasFocus()
  );

  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

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

  // ── 타이틀바 햄버거 메뉴 (File/Edit/View/Settings/Help) ──
  const [showTitlebarMenu, setShowTitlebarMenu] = useState(false);
  const titlebarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTitlebarMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (titlebarMenuRef.current && !titlebarMenuRef.current.contains(e.target as Node)) {
        setShowTitlebarMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showTitlebarMenu]);

  // ── 타이틀바 뒤로/앞으로 가기 — handleNavClick으로 방문한 탭의 단순 히스토리 스택 ──
  const [navHistory, setNavHistory] = useState<NavId[]>(["Dashboard"]);
  const [navHistoryIndex, setNavHistoryIndex] = useState(0);
  const isNavigatingHistoryRef = useRef(false);
  const canGoBack = navHistoryIndex > 0;
  const canGoForward = navHistoryIndex < navHistory.length - 1;

  // ── 타이틀바 중앙 검색(빠른 이동) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchResults = [...NAV_ITEMS, ...SYSTEM_ITEMS].filter(item =>
    searchQuery.trim() === "" || item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  useEffect(() => {
    if (!showSearchResults) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showSearchResults]);

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
        clearLastActiveProject();
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

      try {
        const refreshedSession = await refreshSession(existingSession.refreshToken);
        const user = await fetchCurrentUser();

        if (!active) return;

        setAuthSession(refreshedSession);
        setCurrentUser(user);

        // 세션은 살아있는데 화면(App)만 다시 마운트된 경우(예: 개발 서버 풀 리로드) 열려있던
        // 프로젝트를 잊어버리고 무조건 "프로젝트 시작하기"로 보내던 문제 - 마지막으로 연 프로젝트를
        // 기억해뒀다가 바로 workspace로 복귀시킨다. 실제로 더 이상 접근 권한이 없다면 아래
        // syncProjectContext 이펙트가 project 상태 변경 시 검증해서 join 화면으로 되돌린다.
        const lastProject = loadLastActiveProject();
        if (lastProject) {
          setProjectId(lastProject.projectId);
          setProject(lastProject.projectName);
          setProjectCode(lastProject.projectCode);
          setLocalPath(lastProject.localPath ?? "");
          setScreen("workspace");
        } else {
          setScreen("join");
        }
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
    if (!projectId) {
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
        if (!active) return;

        // 네트워크 오류/타임아웃 같은 일시적 실패는 무시한다 - 워크스페이스에서 쫓아낼 근거가
        // 아니다. 403/404(권한 없음/삭제됨)일 때만 더 이상 접근 불가능한 프로젝트로 확정하고
        // 선택 화면으로 되돌린다. (복원 시도가 실패한 경우도 여기로 들어온다.)
        const isAccessDenied = error instanceof ApiError && (error.status === 403 || error.status === 404);
        if (isAccessDenied) {
          clearLastActiveProject();
          setScreen("join");
          setProjectId(null);
          setProject("");
          setProjectCode("");
          setLocalPath("");
        }
      }
    };

    void syncProjectContext();

    return () => {
      active = false;
    };
  }, [authSession, projectId]);

  const handleNavClick = (id: NavId) => {
    setDiffFile(null);
    if (id === "Chat") {
      setUnreadChatCount(0);
    }

    if (!isNavigatingHistoryRef.current) {
      setNavHistory(prev => [...prev.slice(0, navHistoryIndex + 1), id]);
      setNavHistoryIndex(prev => prev + 1);
    }
    isNavigatingHistoryRef.current = false;

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

  // 타이틀바 뒤로/앞으로 가기 — 히스토리 스택만 이동하고 handleNavClick의 새 항목 push는 건너뛴다.
  const handleNavBack = () => {
    if (!canGoBack) return;
    const nextIndex = navHistoryIndex - 1;
    isNavigatingHistoryRef.current = true;
    setNavHistoryIndex(nextIndex);
    handleNavClick(navHistory[nextIndex]);
  };

  const handleNavForward = () => {
    if (!canGoForward) return;
    const nextIndex = navHistoryIndex + 1;
    isNavigatingHistoryRef.current = true;
    setNavHistoryIndex(nextIndex);
    handleNavClick(navHistory[nextIndex]);
  };

  const handleSearchSelect = (id: NavId) => {
    handleNavClick(id);
    setSearchQuery("");
    setShowSearchResults(false);
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


  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStartW.current + e.clientX - dragStartX.current));
        setSidebarWidth(next);
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

    setScreen("join");
    setProjectId(null);
    setProject("");
    setProjectCode("");
    setLocalPath("");
  };

  const handleJoin = (project: ProjectLaunchTarget) => {
    setProjectId(project.projectId);
    setProject(project.projectName);
    setProjectCode(project.projectCode ?? genProjectCode());
    setLocalPath(project.localPath ?? "");
    setScreen("workspace");
    saveLastActiveProject(project);

    setLeftTabs(["Dashboard"]);
    setActiveLeftTab("Dashboard");
    setRightTabs([]);
    setIsSplit(false);
    setActivePanel("left");

    setDiffFile(null);
    setIsLoading(false);
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

    if (shouldShowDailyStandup(project.projectId)) {
      setTimeout(() => setShowStandup(true), 300);
    }
    recordProjectAccessTime(project.projectId);
  };

  const handleLeaveProject = () => {
    setShowSystemMenu(false);
    setShowStandup(false);
    setScreen("join");
    setProjectId(null);
    setProject("");
    setProjectCode("");
    setLocalPath("");
    setDiffFile(null);
    clearLastActiveProject();
  };

  const handleLogout = async () => {
    setShowSystemMenu(false);
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

  const handleNavigateQA = () => { setDiffFile(null); handleNavClick("AIQA"); };

  const handleStandupNavigate = (page: string) => {
    handleNavClick(page as NavId);
    setDiffFile(null);
    setShowStandup(false);
  };

  const renderPage = (nav: NavId) => {
    switch (nav) {
      case "Dashboard": return <DashboardPage projectId={projectId} projectName={projectName} />;
      case "Changes": return <ChangesPage projectId={projectId} onNavigateQA={handleNavigateQA} />;
      case "Commits": return <CommitDiffPage projectId={projectId} />;
      case "ServerBuild": return <ServerBuildPage projectId={projectId} />;
      case "Chat":
        return (
          <ChatPage
            projectId={projectId}
            currentUserId={currentUser?.id}
            onDocsUpdate={setDocCount}
            onUnreadUpdate={setUnreadChatCount}
          />
        );
      case "Calendar": return <CalendarPage projectId={projectId} />;
      case "EnvSettings": return <EnvironmentSettingsPage localPath={localPath} />;
      case "AIQA": return <AIQAPage projectId={projectId} />;
      case "SharedLibrary": return <SharedLibraryPage projectId={projectId ?? 0} />;
      case "Analytics": return <AnalyticsPage projectId={projectId ?? 0} />;
      case "ProjectSettings": return <ProjectSettingsPage projectId={projectId} currentUserId={currentUser?.id ?? null} />;
      case "Profile": return <ProfilePage projectId={projectId} />;
      case "Galaxy": return <SynAIpseGalaxyPage projectId={projectId ?? 0} projectName={projectName} />;
      case "Notifications": return <NotificationsPage projectId={projectId} />;
      case "Tasks": return <TasksPage projectId={projectId} />;
      default: return <DashboardPage projectId={projectId} projectName={projectName} />;
    }
  };

  const renderPanel = (
    panelType: "left" | "right",
    tabs: NavId[],
    activeTab: NavId,
    setActiveTab: (id: NavId) => void
  ) => {
    const shouldShowTabs = leftTabs.length + rightTabs.length > 1;

    return (
      <div
        className="size-full flex flex-col overflow-hidden transition-colors duration-200"
        style={{ background: CONTENT_BG }}
        onClickCapture={() => setActivePanel(panelType)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleTabDrop(panelType)}
      >
        {shouldShowTabs && (
          <div className="flex items-center shrink-0 overflow-x-auto select-none" style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(27,31,58,0.10)", height: "34px" }}>
            {tabs.map(tId => {
              const tabLabel = TAB_LABELS[tId];

              return (
                <div
                  key={tId}
                  draggable
                  onDragStart={() => {
                    setDraggedTab({ id: tId, from: panelType });
                    setTimeout(() => setIsDraggingTab(true), 0);
                  }}
                  onDragEnd={() => {
                    setIsDraggingTab(false);
                    setDraggedTab(null);
                  }}
                  onClick={() => setActiveTab(tId)}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-medium cursor-pointer transition-all border-r select-none"
                  style={{
                    width: HEADER_TAB_WIDTH,
                    minWidth: HEADER_TAB_WIDTH,
                    maxWidth: HEADER_TAB_WIDTH,
                    color: activeTab === tId ? "#1B1F3A" : "#656B91",
                    background: activeTab === tId ? CONTENT_BG : "transparent",
                    borderRight: "1px solid rgba(27,31,58,0.08)",
                    borderTop: activeTab === tId ? `2px solid ${ACCENT}` : "2px solid transparent"
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
            <div className="h-full flex items-center justify-center text-xs" style={{ color: "#767DA6" }}>
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
            className="absolute top-0 bottom-0 w-2 hover:bg-[#5865F2]/60 cursor-col-resize z-30 transition-colors"
            style={{
              left: `calc(${splitPercent}% - 4px)`,
              background: "linear-gradient(90deg, transparent 45%, rgba(27,31,58,0.16) 45%, rgba(27,31,58,0.16) 55%, transparent 55%)",
            }}
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
              className="w-1/2 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#A67B5B]/40 bg-[#A67B5B]/5 text-xs text-[#A67B5B] pointer-events-auto backdrop-blur-[2px]"
            >
              <div className="p-5 border border-dashed border-[#A67B5B]/30 rounded-xl bg-[#161b22]/95 text-center shadow-2xl">
                <p className="font-semibold mb-1 text-[11px] text-[#c9d1d9]">좌측 분할 영역</p>
                <p className="text-[10px] text-white/40">여기에 놓으면 왼쪽에 새 분할창을 엽니다</p>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleTabDrop("split-right")}
              className="w-1/2 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#A67B5B]/40 bg-[#A67B5B]/5 text-xs text-[#A67B5B] pointer-events-auto backdrop-blur-[2px] border-l-0"
            >
              <div className="p-5 border border-dashed border-[#A67B5B]/30 rounded-xl bg-[#161b22]/95 text-center shadow-2xl">
                <p className="font-semibold mb-1 text-[11px] text-[#c9d1d9]">우측 분할 영역</p>
                <p className="text-[10px] text-white/40">여기에 놓으면 오른쪽에 새 분할창을 엽니다</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 타이틀바 햄버거 메뉴 내용 — 일반적인 데스크톱 앱 메뉴 구성(File/Edit/View/Settings/Help)을
  // 참고하되, 이 앱에 실제로 존재하는 기능에만 연결한다 (죽은 링크를 만들지 않는다).
  const titlebarMenuSections: { label: string; items: { label: string; icon: any; onClick: () => void }[] }[] = [
    {
      label: "File",
      items: [
        { label: "Switch Project", icon: FolderGit2, onClick: handleLeaveProject },
        ...(typeof window !== "undefined" && window.electronAPI?.isElectron
          ? [{ label: "Exit", icon: X, onClick: () => window.electronAPI!.windowControls.close() }]
          : []),
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Profile", icon: User, onClick: () => handleNavClick("Profile") },
      ],
    },
    {
      label: "View",
      items: [
        {
          label: isCollapsed ? "Expand Sidebar" : "Collapse Sidebar",
          icon: isCollapsed ? ChevronRight : ChevronLeft,
          onClick: toggleSidebar,
        },
        { label: "SynAIpse Galaxy", icon: Orbit, onClick: () => handleNavClick("Galaxy") },
        { label: "Analytics", icon: BarChart2, onClick: () => handleNavClick("Analytics") },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Environment Settings", icon: Settings, onClick: () => handleNavClick("EnvSettings") },
        { label: "Project Settings", icon: FolderGit2, onClick: () => handleNavClick("ProjectSettings") },
      ],
    },
  ];

  // 창 활성/비활성 상태를 앱 최상위 컨테이너의 외곽선(글로우)으로 표시한다.
  // 레이아웃에 영향을 주지 않도록 border 대신 inset box-shadow를 쓴다.
  const focusRingStyle: React.CSSProperties = {
    boxShadow: isWindowFocused
      ? `0 0 0 1px ${ACCENT} inset`
      : "0 0 0 1px rgba(255,255,255,0.08) inset",
    transition: "box-shadow 0.2s ease-in-out",
  };

  if (authBootstrapping) {
    return (
      <div className="size-full flex" style={{ background: GRADIENT_OUTER }}>
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: SIDEBAR_BG, ...focusRingStyle }}
        >
          <AuxTitleBar />
          <div className="flex-1 min-h-0 flex items-center justify-center">
          <style>{`
            @keyframes _boot-spin { to { transform: rotate(360deg); } }
            @keyframes _boot-dot  { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
          `}</style>
          <div className="flex flex-col items-center gap-5 text-center">
            <div style={{ position: "relative", width: 56, height: 56 }}>
              <div
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: "2px solid rgba(166,123,91,0.15)",
                  borderTopColor: "#A67B5B",
                  animation: "_boot-spin 1.4s linear infinite",
                }}
              />
              <div
                style={{ position: "absolute", inset: 8, borderRadius: "var(--radius-md)", background: GRADIENT_LOGO, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <FolderGit2 className="w-4.5 h-4.5" style={{ color: "rgba(255,255,255,0.92)" }} />
              </div>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight" style={{ color: SIDEBAR_TEXT_ACTIVE }}>SynAIpse</p>
              <p className="text-xs mt-1" style={{ color: SIDEBAR_TEXT }}>
                저장된 세션을 불러오는 중입니다
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{ width: 4, height: 4, borderRadius: "50%", background: "#A67B5B", animation: `_boot-dot 1.2s ease ${i * 0.18}s infinite` }}
                />
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authSession || screen === "login") {
    return (
      <div className="size-full flex" style={{ background: GRADIENT_OUTER }}>
        <div className="flex-1 flex flex-col overflow-hidden" style={focusRingStyle}>
          <AuxTitleBar />
          <div className="flex-1 min-h-0">
            <LoginScreen onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      </div>
    );
  }

  if (screen === "join") {
    return (
      <div
        className="size-full flex"
        style={{
          background: GRADIENT_OUTER,
          opacity: joinExiting ? 0 : 1,
          transform: joinExiting ? "translateX(-28px) scale(0.99)" : "translateX(0) scale(1)",
          transition: joinExiting ? "opacity 0.40s ease, transform 0.40s ease" : "none",
        }}
      >
        <style>{`@keyframes _join-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            animation: "_join-fadein 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            ...focusRingStyle,
          }}
        >
          <AuxTitleBar />
          <div className="flex-1 min-h-0">
            <JoinProjectScreen
              currentUser={currentUser}
              onOpenProject={handleJoin}
              onLogout={() => void handleLogout()}
            />
          </div>
        </div>
      </div>
    );
  }

  const currentActiveTab = activePanel === "left" ? activeLeftTab : activeRightTab;

  return (
    <div className="size-full flex" style={{ background: GRADIENT_OUTER }}>
      {showStandup && projectId != null && (
        <DailyStandupModal
          userName={sidebarProfile.displayName}
          userPart={sidebarProfile.role}
          projectId={projectId}
          onClose={() => setShowStandup(false)}
          onNavigate={handleStandupNavigate}
        />
      )}

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        projectId={projectId}
      />

      <div
        className="flex-1 flex flex-col overflow-hidden relative"
        style={{ background: TITLEBAR_BG, ...focusRingStyle }}
      >
        {/* 커스텀 타이틀바 — VS Code 스타일 단일 타이틀바 (탭 바 없음, 좌/중/우 3열 그리드).
            OS 기본 타이틀바는 frame:false(Frameless Window)로 제거되었고, 이 바가 그 자리를 대신한다.
            3열 그리드(auto 1fr auto)를 쓰는 이유는 중앙 검색창이 좌/우 콘텐츠 폭과 무관하게 항상
            타이틀바 정중앙에 오도록 하기 위함이다 (flex justify-between만으로는 폭이 다르면 안 맞음).
            배경 전체가 드래그 영역이고, 클릭 가능한 요소들은 각각 no-drag로 되돌려놓았다. */}
        <div
          className="grid items-center h-10 pl-2 shrink-0"
          style={{
            gridTemplateColumns: "auto 1fr auto",
            borderBottom: `1px solid ${SIDEBAR_BORDER}`,
            background: TITLEBAR_BG,
            WebkitAppRegion: "drag",
          } as React.CSSProperties}
        >
          {/* 좌측: 로고 + 햄버거 메뉴 + 뒤로/앞으로 + 프로젝트 코드/diff breadcrumb */}
          <div className="flex items-center gap-1 shrink-0" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mr-1" style={{ background: GRADIENT_LOGO }}>
              <FolderGit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.90)" }} />
            </div>

            <div className="relative" ref={titlebarMenuRef}>
              <button
                onClick={() => setShowTitlebarMenu(v => !v)}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                style={{ color: SIDEBAR_TEXT_ACTIVE, background: showTitlebarMenu ? SIDEBAR_ACTIVE : "transparent" }}
                onMouseEnter={e => { if (!showTitlebarMenu) e.currentTarget.style.background = SIDEBAR_HOVER; }}
                onMouseLeave={e => { if (!showTitlebarMenu) e.currentTarget.style.background = "transparent"; }}
                title="메뉴"
              >
                <Menu className="w-4 h-4" />
              </button>

              {showTitlebarMenu && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-56 rounded-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{ background: BTN_DARK, border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
                >
                  {titlebarMenuSections.map((section, i) => (
                    <div
                      key={section.label}
                      className={i > 0 ? "mt-1 pt-1" : ""}
                      style={i > 0 ? { borderTop: `1px solid ${SIDEBAR_BORDER}` } : undefined}
                    >
                      <p className="px-2.5 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: SIDEBAR_TEXT_LABEL }}>
                        {section.label}
                      </p>
                      {section.items.map(item => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => { item.onClick(); setShowTitlebarMenu(false); }}
                            className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-1.5 text-xs transition-all hover:bg-white/[0.06]"
                            style={{ color: SIDEBAR_TEXT_ACTIVE }}
                          >
                            <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <div className="mt-1 pt-1.5 flex items-center gap-2 px-2.5" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
                    <Info className="w-3 h-3 shrink-0" style={{ color: SIDEBAR_TEXT_LABEL }} />
                    <span className="text-[9px]" style={{ color: SIDEBAR_TEXT_LABEL }}>SynAIpse v1.0.0</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleNavBack}
              disabled={!canGoBack}
              className="flex items-center justify-center w-6 h-6 rounded-lg transition-all"
              style={{ color: SIDEBAR_TEXT_ACTIVE, opacity: canGoBack ? 1 : 0.35, cursor: canGoBack ? "pointer" : "default" }}
              onMouseEnter={e => { if (canGoBack) e.currentTarget.style.background = SIDEBAR_HOVER; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              title="뒤로"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNavForward}
              disabled={!canGoForward}
              className="flex items-center justify-center w-6 h-6 rounded-lg transition-all"
              style={{ color: SIDEBAR_TEXT_ACTIVE, opacity: canGoForward ? 1 : 0.35, cursor: canGoForward ? "pointer" : "default" }}
              onMouseEnter={e => { if (canGoForward) e.currentTarget.style.background = SIDEBAR_HOVER; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              title="앞으로"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {projectCode && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0 ml-1" style={{ background: "rgba(166,123,91,0.12)", border: `1px solid rgba(166,123,91,0.18)` }}>
                <Hash className="w-2.5 h-2.5" style={{ color: SIDEBAR_TEXT_HOVER }} />
                <span className="text-[9px] font-mono font-semibold tracking-wider" style={{ color: SIDEBAR_TEXT_HOVER }}>{projectCode}</span>
              </div>
            )}

            {diffFile && (
              <div className="flex items-center gap-2 text-[11px] shrink-0 ml-1" style={{ color: SIDEBAR_TEXT }}>
                <span>/</span>
                <span style={{ color: SIDEBAR_TEXT_ACTIVE }}>{diffFile.name}</span>
              </div>
            )}
          </div>

          {/* 중앙: 글로벌 검색 — VS Code 커맨드 팔레트 진입점처럼 화면(탭) 빠른 이동 */}
          <div className="flex justify-center min-w-0 px-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <div className="relative w-full max-w-[420px]" ref={searchRef}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: SIDEBAR_TEXT }} />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleSearchSelect(searchResults[0].id);
                  } else if (e.key === "Escape") {
                    setShowSearchResults(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="검색 또는 이동할 화면 입력..."
                className="w-full h-7 pl-8 pr-3 rounded-lg text-[11px] outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${showSearchResults ? ACCENT : "transparent"}`,
                  color: SIDEBAR_TEXT_ACTIVE,
                }}
              />

              {showSearchResults && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-xl p-1.5 z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ background: BTN_DARK, border: `1px solid ${SIDEBAR_BORDER}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
                >
                  {searchResults.map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSearchSelect(item.id)}
                        className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-1.5 text-xs transition-all hover:bg-white/[0.06]"
                        style={{ color: SIDEBAR_TEXT_ACTIVE }}
                      >
                        <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 우측: 주요 액션 아이콘 + 윈도우 컨트롤(창 끝에 딱 붙임, Electron 환경에서만 표시) */}
          <div className="flex items-center shrink-0" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={() => setShowStandup(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all"
                style={{
                  background: showStandup ? "rgba(88,101,242,0.25)" : "rgba(88,101,242,0.12)",
                  color: "#E2E8F0",
                  border: `1px solid ${showStandup ? "rgba(88,101,242,0.5)" : "rgba(88,101,242,0.25)"}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(88,101,242,0.25)"}
                onMouseLeave={e => e.currentTarget.style.background = showStandup ? "rgba(88,101,242,0.25)" : "rgba(88,101,242,0.12)"}
                title="데일리 스탠드업 브리핑"
              >
                <Sun className="w-3 h-3 text-amber-300" />
                스탠드업
              </button>
              <NotificationPanel
                projectId={projectId ?? undefined}
                onViewAll={() => setShowNotificationModal(true)}
              />
            </div>
            <WindowControls />
          </div>
        </div>

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
                  <div
                    className="w-full text-left px-2 py-1.5 rounded-lg select-none"
                    style={{ background: "rgba(166,123,91,0.12)", border: `1px solid rgba(166,123,91,0.18)` }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Circle className="w-1.5 h-1.5 fill-current shrink-0" style={{ color: "#10b981" }} />
                      <p className="text-[10px] font-semibold truncate flex-1" style={{ color: SIDEBAR_TEXT_ACTIVE }}>{projectName}</p>
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
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(166,123,91,0.12)" }}
                    title={`${projectName} #${projectCode}`}
                  >
                    <Circle className="w-2 h-2 fill-current" style={{ color: "#10b981" }} />
                  </div>
                </div>
              )}

              <div className={`pt-2.5 pb-2 ${isCollapsed ? "px-1" : "px-1.5"}`}>
                <SectionLabel collapsed={isCollapsed}>MAIN</SectionLabel>
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map(item => {
                    const badge = item.id === "Chat" && unreadChatCount > 0 && !isCollapsed ? (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                        style={{ background: "#e11d48", color: "#ffffff" }} // 안 읽은 알림처럼 붉은색 계열로 변경
                      >
                        {unreadChatCount}
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
                    background: BTN_DARK,
                    border: `1px solid ${SIDEBAR_BORDER}`,
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.45)",
                  }}
                >
                  <button
                    onClick={handleLeaveProject}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-[11px] transition-all hover:bg-white/[0.06]"
                    style={{ color: "#D4CC9E" }}
                  >
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#D4CC9E" }} />
                    <span className="text-[11px]">Back To Projects</span>
                  </button>

                  <button
                    onClick={() => void handleLogout()}
                    className="w-full flex items-center gap-2 rounded-lg text-left px-2.5 py-2 text-[11px] transition-all hover:bg-[#B85450]/15"
                    style={{ color: "#B85450" }}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" style={{ color: "#B85450" }} />
                    <span className="text-[11px]">Sign Out</span>
                  </button>
                </div>
              )}

              <div className="relative group mb-0.5">
                <button
                  onClick={toggleSidebar}
                  className="w-full flex items-center gap-2 rounded-lg transition-all"
                  style={{
                    padding: isCollapsed ? "7px 0" : "5px 8px",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    color: SIDEBAR_TEXT,
                    background: "transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = SIDEBAR_HOVER; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                  ) : (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT }} />
                      <span className="text-[11px] font-medium">Collapse</span>
                    </>
                  )}
                </button>
                {isCollapsed && <Tooltip label="펼치기" />}
              </div>

              <div className="relative group">
                <button
                  onClick={() => setShowSystemMenu(v => !v)}
                  className="w-full flex items-center gap-2 rounded-lg transition-all"
                  style={{
                    padding: isCollapsed ? "7px 0" : "5px 8px",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    color: SIDEBAR_TEXT_ACTIVE,
                    background: showSystemMenu ? SIDEBAR_ACTIVE : "transparent",
                  }}
                  onMouseEnter={e => { if (!showSystemMenu) e.currentTarget.style.background = SIDEBAR_HOVER; }}
                  onMouseLeave={e => { if (!showSystemMenu) e.currentTarget.style.background = "transparent"; }}
                >
                  <Menu className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR_TEXT_ACTIVE }} />
                  {!isCollapsed && <span className="text-[11px] font-medium">System Menu</span>}
                </button>
                {isCollapsed && <Tooltip label="시스템 메뉴" />}
              </div>
            </div>

            <div
              onMouseDown={onResizeMouseDown}
              className="absolute top-0 right-0 h-full w-1 z-20 transition-colors"
              style={{ cursor: "col-resize", background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(166,123,91,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: CONTENT_BG }}>
            {renderContent()}
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "#F8F5F2" }}>
            <style>{`
              @keyframes _spin    { to { transform: rotate(360deg); } }
              @keyframes _spinRev { to { transform: rotate(-360deg); } }
              @keyframes _fadein  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes _dot     { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
              @keyframes _pulse   { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>
            <div style={{ animation: "_fadein 0.35s ease forwards", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(112,130,56,0.08)", borderTopColor: "#A67B5B", borderRightColor: "#A67B5B", animation: "_spin 2s linear infinite" }} />
                <div style={{ position: "absolute", inset: 7, borderRadius: "50%", border: "2px solid rgba(112,130,56,0.06)", borderBottomColor: "#708238", borderLeftColor: "#708238", animation: "_spinRev 1.2s linear infinite" }} />
                <div style={{ position: "absolute", inset: 16, borderRadius: "var(--radius-md)", background: "#708238", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(112,130,56,0.14)" }}>
                  <FolderGit2 style={{ width: 22, height: 22, color: "white" }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1C06", marginBottom: 5, letterSpacing: "-0.01em" }}>프로젝트 로딩 중</p>
                <p style={{ fontSize: 11, color: "#6B6C4E", fontWeight: 500, animation: "_pulse 1.8s ease infinite" }}>{projectName}</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#A67B5B", animation: `_dot 1.2s ease ${i * 0.18}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
