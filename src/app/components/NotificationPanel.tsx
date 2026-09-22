import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Bell, GitCommit, Bot, AlertCircle,
  CheckCircle2, Info, Check, CheckCheck,
  ChevronRight, ChevronLeft, Trash2, X, Search, Filter
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_RED, UI_AMBER,
} from "../colors";
import {
  fetchProjectNotifications,
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  mapNotificationItem,
  fetchCurrentUser,
  NotificationItem,
} from "../lib/api";
import { subscribeToProjectNotifications } from "../lib/chatSocket";

export const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  info:    { color: ACCENT,       bg: "rgba(88,101,242,0.12)" },
  success: { color: "#10b981",    bg: "rgba(16,185,129,0.12)" },
  warning: { color: UI_AMBER,     bg: "rgba(245,158,11,0.12)" },
  error:   { color: UI_RED,       bg: "rgba(239,68,68,0.12)"  },
};

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return isToday(dateStr)
    ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export const getNotificationStyle = (type: string) => {
  switch (type) {
    case "error":   return { icon: AlertCircle, ...LEVEL_COLORS.error };
    case "success": return { icon: CheckCircle2, ...LEVEL_COLORS.success };
    case "warning": return { icon: Bot, ...LEVEL_COLORS.warning };
    case "commit":  return { icon: GitCommit, ...LEVEL_COLORS.info };
    case "info":
    default:        return { icon: Info, ...LEVEL_COLORS.info };
  }
};

type FilterType = "all" | "unread" | "info" | "success" | "warning" | "error";

interface NotificationPanelProps {
  projectId?: number | string;
  onViewAll?: () => void;
}

export function NotificationPanel({ projectId, onViewAll }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [anim, setAnim] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  // 패널 열릴 때 애니메이션
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setAnim(true));
    } else {
      setAnim(false);
    }
  }, [open]);

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // 프로젝트 알림 로드
  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      if (!projectId) return;
      try {
        const data = await fetchProjectNotifications(projectId);
        if (active) setNotifs(data || []);
      } catch (error) {
        console.error("알림 목록을 불러오지 못했습니다:", error);
      }
    }
    loadNotifications();
    return () => { active = false; };
  }, [projectId]);

  // 현재 사용자 조회
  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => { if (active) setCurrentUserId(user.id); })
      .catch((error) => console.error("현재 사용자 정보를 불러오지 못했습니다:", error));
    return () => { active = false; };
  }, []);

  // 실시간 알림 수신 (STOMP)
  useEffect(() => {
    if (!projectId || !currentUserId) return;

    const numericProjectId = Number(projectId);
    const subscription = subscribeToProjectNotifications(numericProjectId, currentUserId, (payload) => {
      const incoming = mapNotificationItem(payload);
      setNotifs((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
    });

    return () => subscription.unsubscribe();
  }, [projectId, currentUserId]);

  const markRead = (id: number) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (!projectId) return;
    markNotificationAsRead(projectId, id).catch((error) => {
      console.error("알림 읽음 처리에 실패했습니다:", error);
    });
  };

  const markAll = async () => {
    if (!projectId) return;
    const prev = notifs;
    setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(projectId);
      toast.success("모든 알림을 읽음 처리했습니다.");
    } catch (error) {
      console.error("전체 읽음 처리에 실패했습니다:", error);
      setNotifs(prev);
      toast.error("전체 읽음 처리에 실패했습니다.");
    }
  };

  const clearAll = async () => {
    if (!projectId || notifs.length === 0) return;
    if (!window.confirm("모든 알림을 삭제하시겠습니까?")) return;
    const prev = notifs;
    setNotifs([]);
    try {
      await Promise.all(
        notifs.map((n) => deleteNotification(projectId, n.id))
      );
      toast.success("모든 알림을 삭제했습니다.");
    } catch (error) {
      console.error("알림을 삭제하는 도중 문제가 발생했습니다:", error);
      setNotifs(prev);
      toast.error("일부 알림을 삭제하지 못했습니다.");
    }
  };

  const deleteSingle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!projectId) return;
    setNotifs(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(projectId, id);
      toast.success("알림이 삭제되었습니다.");
    } catch (error) {
      console.error("알림 삭제 실패:", error);
      toast.error("알림 삭제에 실패했습니다.");
      const data = await fetchProjectNotifications(projectId);
      setNotifs(data || []);
    }
  };

  const handleToggleShowAll = () => {
    setShowAll(v => !v);
    onViewAll?.();
  };

  // 좌측 전체 알림창 필터링 & 검색
  const filteredAllNotifs = useMemo(() => {
    return notifs.filter((n) => {
      // 1) 탭 필터
      if (filterType === "unread" && n.isRead) return false;
      if (filterType !== "all" && filterType !== "unread" && n.type !== filterType) return false;

      // 2) 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchBody = n.body?.toLowerCase().includes(q);
        if (!matchTitle && !matchBody) return false;
      }
      return true;
    });
  }, [notifs, filterType, searchQuery]);

  const todayAllNotifs = useMemo(
    () => filteredAllNotifs.filter(n => isToday(n.createdAt)),
    [filteredAllNotifs]
  );
  const earlierAllNotifs = useMemo(
    () => filteredAllNotifs.filter(n => !isToday(n.createdAt)),
    [filteredAllNotifs]
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* ── 벨 버튼 ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{ background: open ? "rgba(255,255,255,0.12)" : "transparent" }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
        title="알림"
      >
        <Bell
          className="w-3.5 h-3.5"
          style={{ color: unread > 0 ? ACCENT : "rgba(255,255,255,0.70)" }}
        />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
            style={{ background: UI_RED, lineHeight: 1 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── 드롭다운 팝업 컨테이너 (우측 정렬, 두 창 나란히 배치) ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 flex items-start gap-2.5 z-50 pointer-events-auto select-none"
          style={{
            transform: anim ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
            opacity: anim ? 1 : 0,
            transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease",
          }}
        >
          {/* ══════════════════════════════════════════════════════════
              [1] 좌측: 전체 알림창 (알림 아이콘 누르면 바로 왼쪽에 나란히 뜸)
              ══════════════════════════════════════════════════════════ */}
          {showAll && (
            <div
              className="w-[490px] max-w-[calc(100vw-380px)] rounded-2xl overflow-hidden flex flex-col shrink-0"
              style={{
                height: "530px",
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              {/* 1-1. 헤더 영역 */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{
                  borderBottom: `1px solid ${BORDER_SUBTLE}`,
                  background: "rgba(0,0,0,0.018)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: ACCENT_BG }}
                  >
                    <Bell className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
                        전체 알림
                      </span>
                      {unread > 0 ? (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: UI_RED }}
                        >
                          {unread}개 미읽음
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400">
                          모두 읽음
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {notifs.length > 0 && unread > 0 && (
                    <button
                      onClick={markAll}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all hover:bg-black/5"
                      style={{ color: ACCENT, background: ACCENT_BG }}
                      title="모두 읽음 처리"
                    >
                      <CheckCheck className="w-3 h-3" /> 전체 읽음
                    </button>
                  )}
                  {notifs.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md text-red-500 hover:bg-red-50 transition-all"
                      title="전체 삭제"
                    >
                      <Trash2 className="w-3 h-3" /> 전체 삭제
                    </button>
                  )}
                  <button
                    onClick={() => setShowAll(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-all ml-1"
                    title="전체 알림창 접기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1-2. 검색창 & 필터 바 */}
              <div
                className="px-4 py-2.5 shrink-0 space-y-2"
                style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "#FBFBFE" }}
              >
                {/* 검색 인풋 */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="알림 검색 (제목, 본문)..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-none transition-all placeholder:text-gray-400"
                    style={{
                      borderColor: BORDER_SUBTLE,
                      background: "#FFFFFF",
                      color: TEXT_PRIMARY,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = ACCENT; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = BORDER_SUBTLE; }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5"
                      title="검색어 지우기"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 필터 칩 목록 */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  <Filter className="w-3 h-3 text-gray-400 shrink-0 mr-0.5" />
                  {(
                    [
                      { id: "all", label: "전체", count: notifs.length },
                      { id: "unread", label: "미읽음", count: unread },
                      { id: "info", label: "정보", count: notifs.filter(n => n.type === "info").length },
                      { id: "success", label: "성공", count: notifs.filter(n => n.type === "success").length },
                      { id: "warning", label: "경고", count: notifs.filter(n => n.type === "warning").length },
                      { id: "error", label: "오류", count: notifs.filter(n => n.type === "error").length },
                    ] as const
                  ).map((item) => {
                    const isActive = filterType === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setFilterType(item.id)}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-all"
                        style={{
                          background: isActive ? ACCENT : "rgba(0,0,0,0.04)",
                          color: isActive ? "#FFFFFF" : TEXT_SECONDARY,
                        }}
                      >
                        <span>{item.label}</span>
                        <span
                          className="text-[9px] px-1 rounded-full font-bold"
                          style={{
                            background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
                            color: isActive ? "#FFFFFF" : TEXT_TERTIARY,
                          }}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-3. 전체 알림 스크롤 목록 */}
              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: BORDER_SUBTLE }}>
                {filteredAllNotifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: ACCENT_BG }}
                    >
                      <Bell className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
                      표시할 알림이 없습니다
                    </p>
                    <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
                      {searchQuery
                        ? "검색 조건과 일치하는 알림이 없습니다."
                        : filterType === "unread"
                        ? "모든 알림을 확인했습니다."
                        : "새로운 알림이 도착하면 여기에 표시됩니다."}
                    </p>
                    {(searchQuery || filterType !== "all") && (
                      <button
                        onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                        className="text-[10px] font-semibold underline mt-1"
                        style={{ color: ACCENT }}
                      >
                        필터 초기화
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* 오늘 알림 */}
                    {todayAllNotifs.length > 0 && (
                      <div>
                        <div
                          className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10"
                          style={{
                            background: "#F8F9FE",
                            color: TEXT_TERTIARY,
                            borderBottom: `1px solid ${BORDER_SUBTLE}`,
                          }}
                        >
                          Today ({todayAllNotifs.length})
                        </div>
                        {todayAllNotifs.map((n) => (
                          <AllNotifRow
                            key={n.id}
                            notif={n}
                            onRead={markRead}
                            onDelete={deleteSingle}
                          />
                        ))}
                      </div>
                    )}

                    {/* 이전 알림 */}
                    {earlierAllNotifs.length > 0 && (
                      <div>
                        <div
                          className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10"
                          style={{
                            background: "#F8F9FE",
                            color: TEXT_TERTIARY,
                            borderBottom: `1px solid ${BORDER_SUBTLE}`,
                          }}
                        >
                          Earlier ({earlierAllNotifs.length})
                        </div>
                        {earlierAllNotifs.map((n) => (
                          <AllNotifRow
                            key={n.id}
                            notif={n}
                            onRead={markRead}
                            onDelete={deleteSingle}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 1-4. 전체 알림창 푸터 */}
              <div
                className="px-4 py-2 shrink-0 flex items-center justify-between text-[10px]"
                style={{
                  borderTop: `1px solid ${BORDER_SUBTLE}`,
                  background: "rgba(0,0,0,0.015)",
                  color: TEXT_TERTIARY,
                }}
              >
                <span>총 {filteredAllNotifs.length}개 알림</span>
                <span>알림 클릭 시 읽음 처리</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              [2] 우측: 기본 빠른 알림 패널
              ══════════════════════════════════════════════════════════ */}
          <div
            className="w-84 rounded-2xl overflow-hidden flex flex-col shrink-0"
            style={{
              height: "530px",
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 20px 56px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {/* 2-1. 헤더 영역 */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.02)" }}
            >
              <div className="flex items-center">
                <Bell className="w-3.5 h-3.5 mr-2" style={{ color: ACCENT }} />
                <span className="text-xs font-bold mr-2" style={{ color: TEXT_PRIMARY }}>
                  최근 알림
                </span>
                {unread > 0 ? (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                  >
                    {unread}개 미읽음
                  </span>
                ) : (
                  <span className="text-[9px] text-gray-400">
                    모두 읽음
                  </span>
                )}
              </div>

              {notifs.length > 0 && unread > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all"
                  style={{ background: "rgba(0,0,0,0.04)", color: TEXT_SECONDARY }}
                  title="모두 읽음 처리"
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                >
                  <Check className="w-2.5 h-2.5" /> 전체 읽음
                </button>
              )}
            </div>

            {/* 2-2. 알림 목록 */}
            <div className="overflow-y-auto flex-1">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: ACCENT_BG }}
                  >
                    <Bell className="w-5 h-5" style={{ color: ACCENT }} />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: TEXT_TERTIARY }}>
                    새 알림이 없습니다
                  </p>
                </div>
              ) : (
                <div>
                  {notifs.map((n, idx) => {
                    const { icon: Icon, color, bg } = getNotificationStyle(n.type);

                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all relative group"
                        style={{
                          borderBottom: idx < notifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                          background: n.isRead ? "transparent" : "rgba(88,101,242,0.04)",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
                        onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(88,101,242,0.04)")}
                        onClick={() => markRead(n.id)}
                      >
                        {!n.isRead && (
                          <div
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                            style={{ background: ACCENT }}
                          />
                        )}
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: bg }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: color }} />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <p
                            className="text-[11px] font-semibold leading-tight"
                            style={{ color: n.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}
                          >
                            {n.title}
                          </p>
                          <p className="text-[10px] mt-0.5 leading-snug line-clamp-2" style={{ color: TEXT_TERTIARY }}>
                            {n.body}
                          </p>
                          <p className="text-[9px] mt-1" style={{ color: TEXT_LABEL }}>
                            {formatTime(n.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSingle(e, n.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all shrink-0"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2-3. 푸터 영역 (좌측 전체 알림창 토글 버튼) */}
            <div
              className="px-4 py-2.5 shrink-0 flex items-center justify-between"
              style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.015)" }}
            >
              <button
                onClick={handleToggleShowAll}
                className="flex items-center gap-1 text-[11px] font-bold transition-all group"
                style={{ color: ACCENT }}
                title={showAll ? "전체 알림창 접기" : "좌측에 전체 알림창 열기"}
              >
                {showAll ? (
                  <>
                    <span>전체창 접기</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>알림 전체보기</span>
                  </>
                )}
              </button>

              {notifs.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] font-semibold transition-all hover:text-red-500"
                  style={{ color: TEXT_TERTIARY }}
                >
                  전체 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 좌측 전체 알림창 개별 행 컴포넌트 ──
function AllNotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: NotificationItem;
  onRead: (id: number) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
}) {
  const meta = getNotificationStyle(notif.type);
  const Icon = meta.icon;

  return (
    <div
      onClick={() => onRead(notif.id)}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.025] cursor-pointer relative group"
      style={{
        background: notif.isRead ? "transparent" : "rgba(88,101,242,0.035)",
      }}
    >
      {/* 안읽음 파란 점 */}
      {!notif.isRead && (
        <div
          className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full"
          style={{ background: ACCENT }}
        />
      )}

      {/* 아이콘 */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: meta.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>

      {/* 본문 내용 */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded"
            style={{ background: meta.bg, color: meta.color }}
          >
            {notif.type}
          </span>
          {!notif.isRead && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded"
              style={{ background: ACCENT_BG, color: ACCENT }}
            >
              NEW
            </span>
          )}
          <span className="text-[9px] text-gray-400 ml-auto shrink-0">
            {formatTime(notif.createdAt)}
          </span>
        </div>
        <p
          className="text-xs font-semibold leading-snug"
          style={{ color: notif.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}
        >
          {notif.title}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-gray-500 whitespace-pre-line">
          {notif.body}
        </p>
      </div>

      {/* 개별 삭제 버튼 (호버 시 표시) */}
      <button
        onClick={(e) => onDelete(e, notif.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 self-center"
        title="이 알림 삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
