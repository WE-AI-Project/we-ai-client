import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Bell, GitCommit, Bot, AlertCircle,
  CheckCircle2, Info, Check, CheckCheck,
  ChevronRight, ChevronLeft, Trash2, X
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
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
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

interface NotificationPanelProps {
  projectId?: number | string;
  onViewAll?: () => void;
}

export function NotificationPanel({ projectId, onViewAll }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [anim, setAnim] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  // 창이 닫히면 전체보기 상태도 기본 닫힘(false)으로 초기화
  useEffect(() => {
    if (!open) {
      setShowAll(false);
    }
  }, [open]);

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
    if (!projectId) return;
    const prev = notifs;
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    markNotificationAsRead(projectId, id).catch((error) => {
      console.error("알림 읽음 처리에 실패했습니다:", error);
      setNotifs(prev);
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

  // 오늘 날짜 기준 분리
  const todayNotifs = useMemo(
    () => notifs.filter(n => isToday(n.createdAt)),
    [notifs]
  );
  const earlierNotifs = useMemo(
    () => notifs.filter(n => !isToday(n.createdAt)),
    [notifs]
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
              [1] 좌측: 전체 알림창 (알림 전체보기 클릭 시 바로 왼쪽에 나란히 뜸)
              ══════════════════════════════════════════════════════════ */}
          {showAll && (
            <div
              className="w-[480px] max-w-[calc(100vw-380px)] rounded-2xl overflow-hidden flex flex-col shrink-0"
              style={{
                height: "400px",
                background: "#FFFFFF",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 20px 56px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.06)",
              }}
            >
              {/* 1-1. 헤더 영역 (우측 최근 알림과 동일한 높이 h-11 및 동일한 아이콘 배치) */}
              <div
                className="h-11 flex items-center justify-between px-4 shrink-0"
                style={{
                  borderBottom: `1px solid ${BORDER_SUBTLE}`,
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div className="flex items-center">
                  <Bell className="w-3.5 h-3.5 mr-2" style={{ color: ACCENT }} />
                  <span className="text-xs font-bold mr-2" style={{ color: TEXT_PRIMARY }}>
                    전체 알림
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
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-all ml-0.5"
                    title="전체 알림창 접기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 1-2. 전체 알림 스크롤 목록 (오늘 / 이전 구분) */}
              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: BORDER_SUBTLE }}>
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: ACCENT_BG }}
                    >
                      <Bell className="w-4 h-4" style={{ color: ACCENT }} />
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: TEXT_TERTIARY }}>
                      알림이 없습니다
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* 오늘 알림 */}
                    {todayNotifs.length > 0 && (
                      <div>
                        <div
                          className="h-6 flex items-center px-4 text-[10px] font-bold sticky top-0 z-10"
                          style={{
                            background: "#F8F9FE",
                            color: TEXT_TERTIARY,
                            borderBottom: `1px solid ${BORDER_SUBTLE}`,
                          }}
                        >
                          오늘 ({todayNotifs.length})
                        </div>
                        {todayNotifs.map((n) => (
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
                    {earlierNotifs.length > 0 && (
                      <div>
                        <div
                          className="h-6 flex items-center px-4 text-[10px] font-bold sticky top-0 z-10"
                          style={{
                            background: "#F8F9FE",
                            color: TEXT_TERTIARY,
                            borderBottom: `1px solid ${BORDER_SUBTLE}`,
                            borderTop: todayNotifs.length > 0 ? `1px solid ${BORDER_SUBTLE}` : "none",
                          }}
                        >
                          이전 알림 ({earlierNotifs.length})
                        </div>
                        {earlierNotifs.map((n) => (
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

              {/* 1-3. 전체 알림창 푸터 (우측과 동일한 높이 h-9로 상단 경계선 높이 일치) */}
              <div
                className="h-9 flex items-center justify-between px-4 shrink-0 text-[10px]"
                style={{
                  borderTop: `1px solid ${BORDER_SUBTLE}`,
                  background: "rgba(0,0,0,0.015)",
                  color: TEXT_TERTIARY,
                }}
              >
                <span>총 {notifs.length}개 알림</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              [2] 우측: 기본 빠른 알림 패널
              ══════════════════════════════════════════════════════════ */}
          <div
            className="w-84 rounded-2xl overflow-hidden flex flex-col shrink-0"
            style={{
              height: "400px",
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 20px 56px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            {/* 2-1. 헤더 영역 (좌측과 동일한 높이 h-11로 하단 경계선 높이 일치) */}
            <div
              className="h-11 flex items-center justify-between px-4 shrink-0"
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

            {/* 2-2. 알림 목록 (오늘 / 이전 구분) */}
            <div className="overflow-y-auto flex-1">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: ACCENT_BG }}
                  >
                    <Bell className="w-4 h-4" style={{ color: ACCENT }} />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: TEXT_TERTIARY }}>
                    새 알림이 없습니다
                  </p>
                </div>
              ) : (
                <div>
                  {/* 오늘 알림 */}
                  {todayNotifs.length > 0 && (
                    <div>
                      <div
                        className="h-6 flex items-center px-4 text-[10px] font-bold sticky top-0 z-10"
                        style={{
                          background: "#F8F9FE",
                          color: TEXT_TERTIARY,
                          borderBottom: `1px solid ${BORDER_SUBTLE}`,
                        }}
                      >
                        오늘 ({todayNotifs.length})
                      </div>
                      {todayNotifs.map((n, idx) => (
                        <QuickNotifRow
                          key={n.id}
                          notif={n}
                          isLast={idx === todayNotifs.length - 1 && earlierNotifs.length === 0}
                          onRead={markRead}
                          onDelete={deleteSingle}
                        />
                      ))}
                    </div>
                  )}

                  {/* 이전 알림 */}
                  {earlierNotifs.length > 0 && (
                    <div>
                      <div
                        className="h-6 flex items-center px-4 text-[10px] font-bold sticky top-0 z-10"
                        style={{
                          background: "#F8F9FE",
                          color: TEXT_TERTIARY,
                          borderBottom: `1px solid ${BORDER_SUBTLE}`,
                          borderTop: todayNotifs.length > 0 ? `1px solid ${BORDER_SUBTLE}` : "none",
                        }}
                      >
                        이전 알림 ({earlierNotifs.length})
                      </div>
                      {earlierNotifs.map((n, idx) => (
                        <QuickNotifRow
                          key={n.id}
                          notif={n}
                          isLast={idx === earlierNotifs.length - 1}
                          onRead={markRead}
                          onDelete={deleteSingle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2-3. 푸터 영역 (좌측과 동일한 높이 h-9로 상단 경계선 높이 일치) */}
            <div
              className="h-9 flex items-center justify-between px-4 shrink-0"
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

// ── 우측 빠른 알림창 개별 행 컴포넌트 ──
function QuickNotifRow({
  notif,
  isLast,
  onRead,
  onDelete,
}: {
  notif: NotificationItem;
  isLast: boolean;
  onRead: (id: number) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
}) {
  const { icon: Icon, color, bg } = getNotificationStyle(notif.type);

  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-all relative group"
      style={{
        borderBottom: !isLast ? `1px solid ${BORDER_SUBTLE}` : "none",
        background: notif.isRead ? "transparent" : "rgba(88,101,242,0.04)",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
      onMouseLeave={e => (e.currentTarget.style.background = notif.isRead ? "transparent" : "rgba(88,101,242,0.04)")}
      onClick={() => onRead(notif.id)}
    >
      {!notif.isRead && (
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
          style={{ color: notif.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}
        >
          {notif.title}
        </p>
        <p className="text-[10px] mt-0.5 leading-snug line-clamp-2" style={{ color: TEXT_TERTIARY }}>
          {notif.body}
        </p>
        <p className="text-[9px] mt-1" style={{ color: TEXT_LABEL }}>
          {formatTime(notif.createdAt)}
        </p>
      </div>
      <button
        onClick={(e) => onDelete(e, notif.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all shrink-0 self-center"
        title="삭제"
      >
        <Trash2 className="w-3 h-3" />
      </button>
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
      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.025] cursor-pointer relative group"
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
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: meta.bg }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
      </div>

      {/* 본문 내용 */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-0.5">
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
