import { useEffect, useState } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  UI_INDIGO,
  GRADIENT_HEADER,
} from "../colors";
import {
  fetchProjectNotifications,
  deleteNotification,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "../lib/api";
import { LEVEL_COLORS, getNotificationStyle } from "./NotificationPanel";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return isToday(dateStr)
    ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function NotifItem({ notif, onRead }: { notif: NotificationItem; onRead: (id: number) => void }) {
  const meta = getNotificationStyle(notif.type);
  const Icon = meta.icon;
  return (
    <div
      onClick={() => onRead(notif.id)}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] cursor-pointer relative"
    >
      {!notif.isRead && (
        <div className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full" style={{ background: UI_INDIGO }} />
      )}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>
            {notif.type}
          </span>
          {!notif.isRead && (
            <span className="text-[9px] font-semibold" style={{ color: UI_INDIGO }}>NEW</span>
          )}
        </div>
        <p className="text-xs font-medium" style={{ color: notif.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}>{notif.title}</p>
        <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: TEXT_TERTIARY }}>{notif.body}</p>
      </div>
      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: TEXT_TERTIARY }}>{formatTime(notif.createdAt)}</span>
    </div>
  );
}

export function NotificationsPage({ projectId }: { projectId: number | string | null }) {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!projectId) {
      setNotifs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchProjectNotifications(projectId)
      .then((data) => { if (active) setNotifs(data || []); })
      .catch((error) => {
        console.error("알림 목록을 불러오지 못했습니다:", error);
        if (active) setNotifs([]);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const todayNotifs = notifs.filter((n) => isToday(n.createdAt));
  const earlierNotifs = notifs.filter((n) => !isToday(n.createdAt));

  const markRead = (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    if (!projectId) return;
    const prev = notifs;
    setNotifs((ns) => ns.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(projectId);
    } catch (error) {
      console.error("전체 읽음 처리에 실패했습니다:", error);
      setNotifs(prev);
    }
  };

  const clearAll = async () => {
    if (!projectId || notifs.length === 0) return;
    const prev = notifs;
    setNotifs([]);
    try {
      await Promise.all(notifs.map((n) => deleteNotification(projectId, n.id)));
    } catch (error) {
      console.error("알림을 삭제하는 도중 문제가 발생했습니다:", error);
      setNotifs(prev);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_HEADER }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Notifications</h1>
              {isLoading ? (
                <Skeleton className="h-3 w-32 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : "모든 알림을 확인했습니다"}
                </p>
              )}
            </div>

            {!isLoading && notifs.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: "#B85450" }}
                >
                  <Trash2 className="w-3 h-3" />
                  전체 삭제
                </button>
              </div>
            )}
          </div>

          {/* ── 알림 타입 요약 카드 ── */}
          <div className="grid grid-cols-4 gap-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-6" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
              ))
            ) : (
              Object.entries(LEVEL_COLORS).map(([type, meta]) => {
                const count = notifs.filter((n) => n.type === type).length;
                const { icon: Icon } = getNotificationStyle(type);
                return (
                  <div key={type} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.bg }}>
                      <Icon className="w-3 h-3" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: meta.color }}>{count}</p>
                      <p className="text-[9px] capitalize" style={{ color: TEXT_TERTIARY }}>{type}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isLoading ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5" style={{ borderBottom: i < 3 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                  <Skeleton className="w-8 h-2 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : notifs.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 gap-2" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
              <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>새 알림이 없습니다</p>
            </div>
          ) : (
            <>
              {/* ── 오늘 알림 리스트 ── */}
              {todayNotifs.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_TERTIARY }}>Today</p>
                  </div>
                  {todayNotifs.map((n, i) => (
                    <div key={n.id} style={{ borderBottom: i < todayNotifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                      <NotifItem notif={n} onRead={markRead} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── 이전 알림 리스트 ── */}
              {earlierNotifs.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                  <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_TERTIARY }}>Earlier</p>
                  </div>
                  {earlierNotifs.map((n, i) => (
                    <div key={n.id} style={{ borderBottom: i < earlierNotifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                      <NotifItem notif={n} onRead={markRead} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
