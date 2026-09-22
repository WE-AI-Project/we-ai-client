import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Bell, GitCommit, Bot, AlertCircle,
  CheckCircle2, Info, Check, ChevronRight
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

interface NotificationPanelProps {
  projectId?: number | string;
  onViewAll?: () => void;
}

export function NotificationPanel({ projectId, onViewAll }: NotificationPanelProps) {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [anim,   setAnim]   = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  // 패널 열릴 때 애니메이션
  useEffect(() => {
    if (open) requestAnimationFrame(() => setAnim(true));
    else      setAnim(false);
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // 뱃지 카운트가 패널을 열기 전에도 정확해야 하므로 projectId가 잡히는 즉시 불러온다.
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

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => { if (active) setCurrentUserId(user.id); })
      .catch((error) => console.error("현재 사용자 정보를 불러오지 못했습니다:", error));
    return () => { active = false; };
  }, []);

  // 실시간 알림 수신: 서버가 새 알림을 생성하면 STOMP로 바로 밀어준다.
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
    } catch (error) {
      console.error("전체 읽음 처리에 실패했습니다:", error);
      setNotifs(prev);
    }
  };

  const clearAll = async () => {
    if (!projectId || notifs.length === 0) return;
    if (!window.confirm("모든 알림을 삭제하시겠습니까?")) return;
    try {
      await Promise.all(
        notifs.map((n) => deleteNotification(projectId, n.id))
      );
      setNotifs([]);
      toast.success("모든 알림을 삭제했습니다.");
    } catch (error) {
      console.error("알림을 삭제하는 도중 문제가 발생했습니다:", error);
      toast.error("일부 알림을 삭제하지 못했습니다.");
    }
  };

  const viewAll = () => {
    setOpen(false);
    onViewAll?.();
  };

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

      {/* ── 드롭다운 패널 ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-84 rounded-2xl overflow-hidden z-50 flex flex-col"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 20px 56px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)",
            transform: anim ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
            opacity:   anim ? 1 : 0,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.14s ease",
            maxHeight: "480px",
          }}
        >
          {/* 1. 헤더 영역 */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center">
              <Bell className="w-3.5 h-3.5 mr-2" style={{ color: ACCENT }} />
              <span className="text-xs font-bold mr-2" style={{ color: TEXT_PRIMARY }}>
                알림
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
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              >
                <Check className="w-2.5 h-2.5" /> 전체 읽음
              </button>
            )}
          </div>

          {/* 2. 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: ACCENT_BG }}>
                  <Bell className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <p className="text-[11px] font-medium" style={{ color: TEXT_TERTIARY }}>새 알림이 없습니다</p>
              </div>
            ) : (
              <div>
                {notifs.map((n, idx) => {
                  const { icon: Icon, color, bg } = getNotificationStyle(n.type);
                  
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all relative"
                      style={{
                        borderBottom: idx < notifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                        background:   n.isRead ? "transparent" : "rgba(88,101,242,0.04)",
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
                      <div className="flex-1 min-w-0 pr-2">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. 푸터 영역 (알림이 없어도 전체보기 팝업을 열 수 있도록 유지) */}
          <div
            className="px-4 py-2.5 shrink-0 flex items-center justify-between"
            style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.015)" }}
          >
            <button
              onClick={viewAll}
              className="flex items-center gap-1 text-[11px] font-bold transition-all group"
              style={{ color: ACCENT }}
            >
              알림 전체보기
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
      )}
    </div>
  );
}
