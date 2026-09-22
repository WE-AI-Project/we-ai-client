import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Bell, CheckCheck, Trash2, X, Filter,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, ACCENT_BG,
  OLIVE_DARK,
} from "../colors";
import {
  fetchProjectNotifications,
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  mapNotificationItem,
  fetchCurrentUser,
  type NotificationItem,
} from "../lib/api";
import { subscribeToProjectNotifications } from "../lib/chatSocket";
import { LEVEL_COLORS, getNotificationStyle } from "./NotificationPanel";

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

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

type FilterType = "all" | "unread" | "info" | "success" | "warning" | "error";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number | string | null;
}

export function NotificationModal({ isOpen, onClose, projectId }: NotificationModalProps) {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [anim, setAnim] = useState(false);

  // 모달 오픈 시 애니메이션
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setAnim(true));
    } else {
      setAnim(false);
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 알림 데이터 불러오기
  const loadNotifications = async () => {
    if (!projectId) {
      setNotifs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchProjectNotifications(projectId);
      setNotifs(data || []);
    } catch (err) {
      console.error("알림 목록을 불러오지 못했습니다:", err);
      toast.error("알림 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadNotifications();
    }
  }, [isOpen, projectId]);

  // 현재 사용자 정보 조회
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setCurrentUserId(user.id))
      .catch((err) => console.error("현재 사용자 정보 로드 실패:", err));
  }, []);

  // 실시간 웹소켓 구독
  useEffect(() => {
    if (!isOpen || !projectId || !currentUserId) return;
    const numericProjectId = Number(projectId);
    const subscription = subscribeToProjectNotifications(numericProjectId, currentUserId, (payload) => {
      const incoming = mapNotificationItem(payload);
      setNotifs((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
    });
    return () => subscription.unsubscribe();
  }, [isOpen, projectId, currentUserId]);

  const unreadCount = useMemo(() => notifs.filter((n) => !n.isRead).length, [notifs]);

  const filteredNotifs = useMemo(() => {
    if (filter === "unread") return notifs.filter((n) => !n.isRead);
    if (filter === "all") return notifs;
    return notifs.filter((n) => n.type === filter);
  }, [notifs, filter]);

  const todayNotifs = useMemo(() => filteredNotifs.filter((n) => isToday(n.createdAt)), [filteredNotifs]);
  const earlierNotifs = useMemo(() => filteredNotifs.filter((n) => !isToday(n.createdAt)), [filteredNotifs]);

  const markRead = async (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (!projectId) return;
    try {
      await markNotificationAsRead(projectId, id);
    } catch (err) {
      console.error("알림 읽음 처리에 실패했습니다:", err);
    }
  };

  const markAllRead = async () => {
    if (!projectId || notifs.length === 0) return;
    const prev = notifs;
    setNotifs((ns) => ns.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(projectId);
      toast.success("모든 알림을 읽음 처리했습니다.");
    } catch (err) {
      console.error("전체 읽음 처리 실패:", err);
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
      await Promise.all(notifs.map((n) => deleteNotification(projectId, n.id)));
      toast.success("모든 알림을 삭제했습니다.");
    } catch (err) {
      console.error("알림 전체 삭제 실패:", err);
      setNotifs(prev);
      toast.error("일부 알림 삭제에 실패했습니다.");
    }
  };

  const deleteSingle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!projectId) return;
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(projectId, id);
      toast.success("알림이 삭제되었습니다.");
    } catch (err) {
      console.error("알림 삭제 실패:", err);
      loadNotifications();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200"
      style={{
        background: "rgba(10,13,58,0.65)",
        backdropFilter: "blur(8px)",
        opacity: anim ? 1 : 0,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
        style={{
          maxHeight: "85vh",
          background: "#FAFAF7",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 28px 72px rgba(0,0,0,0.30), 0 4px 20px rgba(0,0,0,0.12)",
          transform: anim ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.97)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══ 헤더 ══ */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: OLIVE_DARK,
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">알림 센터</h2>
                {unreadCount > 0 ? (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#ef4444" }}
                  >
                    {unreadCount}개 미읽음
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white/70"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    모두 확인 완료
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/70 mt-0.5">
                프로젝트의 모든 알림과 실시간 업데이트 내역을 확인하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifs.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 transition-all"
                    title="모두 읽음 처리"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    전체 읽음
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200 bg-red-500/20 hover:bg-red-500/30 transition-all"
                  title="전체 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  전체 삭제
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all ml-1"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ══ 타입 요약 카드 바 ══ */}
        <div
          className="grid grid-cols-4 gap-2 px-6 py-3 shrink-0"
          style={{ background: "rgba(0,0,0,0.02)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}
        >
          {Object.entries(LEVEL_COLORS).map(([type, meta]) => {
            const count = notifs.filter((n) => n.type === type).length;
            const { icon: Icon } = getNotificationStyle(type);
            const isSelected = filter === type;
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? "all" : (type as FilterType))}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all"
                style={{
                  background: isSelected ? meta.bg : "rgba(255,255,255,0.85)",
                  borderColor: isSelected ? meta.color : BORDER_SUBTLE,
                  boxShadow: isSelected ? `0 2px 8px ${meta.color}20` : "none",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: meta.bg }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-none" style={{ color: meta.color }}>
                    {count}
                  </p>
                  <p className="text-[10px] capitalize text-gray-500 mt-0.5 truncate">{type}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ══ 필터 칩 바 ══ */}
        <div
          className="flex items-center justify-between px-6 py-2.5 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "#FFFFFF" }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {(
              [
                { id: "all", label: "전체", count: notifs.length },
                { id: "unread", label: "읽지 않음", count: unreadCount },
              ] as const
            ).map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? ACCENT : "rgba(0,0,0,0.04)",
                    color: active ? "#FFFFFF" : TEXT_SECONDARY,
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                    style={{
                      background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)",
                      color: active ? "#FFFFFF" : TEXT_TERTIARY,
                    }}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-gray-400 font-medium">
            총 {filteredNotifs.length}건
          </span>
        </div>

        {/* ══ 알림 리스트 스크롤 영역 ══ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-white"
                  style={{ borderColor: BORDER_SUBTLE }}
                >
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="w-12 h-3 shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: ACCENT_BG }}
              >
                <Bell className="w-8 h-8" style={{ color: ACCENT }} />
              </div>
              <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                알림이 없습니다
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                {filter === "unread"
                  ? "모든 알림을 확인했습니다. 새로운 소식이 도착하면 알려드릴게요!"
                  : "현재 표시할 프로젝트 알림 내역이 비어있습니다."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 오늘 알림 */}
              {todayNotifs.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden border bg-white"
                  style={{ borderColor: BORDER_SUBTLE }}
                >
                  <div
                    className="px-4 py-2 border-b flex items-center justify-between"
                    style={{ background: "rgba(0,0,0,0.02)", borderColor: BORDER_SUBTLE }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Today ({todayNotifs.length})
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: BORDER_SUBTLE }}>
                    {todayNotifs.map((n) => (
                      <ModalNotifRow
                        key={n.id}
                        notif={n}
                        onRead={markRead}
                        onDelete={deleteSingle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 이전 알림 */}
              {earlierNotifs.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden border bg-white"
                  style={{ borderColor: BORDER_SUBTLE }}
                >
                  <div
                    className="px-4 py-2 border-b flex items-center justify-between"
                    style={{ background: "rgba(0,0,0,0.02)", borderColor: BORDER_SUBTLE }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Earlier ({earlierNotifs.length})
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: BORDER_SUBTLE }}>
                    {earlierNotifs.map((n) => (
                      <ModalNotifRow
                        key={n.id}
                        notif={n}
                        onRead={markRead}
                        onDelete={deleteSingle}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ 푸터 ══ */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "#FFFFFF" }}
        >
          <span className="text-[11px] text-gray-400">
            알림을 클릭하면 읽음 처리됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-black/5"
            style={{ color: TEXT_SECONDARY, border: `1px solid ${BORDER_SUBTLE}` }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNotifRow({
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
      className="flex items-start gap-3.5 p-4 transition-colors hover:bg-black/[0.02] cursor-pointer relative group"
      style={{
        background: notif.isRead ? "transparent" : "rgba(88,101,242,0.03)",
      }}
    >
      {/* 안읽음 파란 점 */}
      {!notif.isRead && (
        <div
          className="absolute left-2 top-5 w-1.5 h-1.5 rounded-full"
          style={{ background: ACCENT }}
        />
      )}

      {/* 아이콘 */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: meta.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>

      {/* 본문 내용 */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: meta.bg, color: meta.color }}
          >
            {notif.type}
          </span>
          {!notif.isRead && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: ACCENT_BG, color: ACCENT }}
            >
              NEW
            </span>
          )}
        </div>
        <p
          className="text-xs font-semibold leading-snug"
          style={{ color: notif.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}
        >
          {notif.title}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-gray-500">
          {notif.body}
        </p>
        <span className="text-[10px] text-gray-400 mt-1.5 inline-block">
          {formatTime(notif.createdAt)}
        </span>
      </div>

      {/* 액션 버튼 (호버 시 표시) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-1">
        <button
          onClick={(e) => onDelete(e, notif.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          title="이 알림 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
