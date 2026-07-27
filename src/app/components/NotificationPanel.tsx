import { useState, useEffect, useRef } from "react";
import {
  Bell, X, GitCommit, Bot, AlertCircle,
  CheckCircle2, Info, FolderGit2, Check,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
} from "../colors";
import { fetchMyNotifications, NotificationItem } from "../lib/api";

// ── 알림 레벨별 색상 설정 ──
const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  info:    { color: "#6B7A50",    bg: "rgba(107,122,80,0.10)"  },
  success: { color: "#5A8A4A",    bg: "rgba(90,138,74,0.10)"   },
  warning: { color: "#C09840",    bg: "rgba(192,152,64,0.10)"  },
  error:   { color: "#B85450",    bg: "rgba(184,84,80,0.10)"   },
};

// ── 서버의 type 문자열을 프론트엔드 아이콘과 색상으로 매칭하는 헬퍼 함수 ──
const getNotificationStyle = (type: string) => {
  switch (type) {
    case "error":
      return { icon: AlertCircle, ...LEVEL_COLORS.error };
    case "success":
      return { icon: CheckCircle2, ...LEVEL_COLORS.success };
    case "warning":
      return { icon: Bot, ...LEVEL_COLORS.warning };
    case "commit":
      return { icon: GitCommit, ...LEVEL_COLORS.info };
    case "info":
    default:
      return { icon: Info, ...LEVEL_COLORS.info };
  }
};

// ── 메인 컴포넌트 ──
export function NotificationPanel() {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [anim,   setAnim]   = useState(false);
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

  // 컴포넌트 마운트 시 알림 목록 조회 (API 연동)
  useEffect(() => { 
    async function loadNotifications() {
      try {
        const data = await fetchMyNotifications();
        setNotifs(data);
      } catch (error) {
        console.error("알림 목록을 불러오지 못했습니다:", error);
      }
    }
    loadNotifications();
  }, []);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // 🚀 기존 read -> isRead 로 모두 변경
  const markRead   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  const markAll    = ()           => setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
  const dismiss    = (id: number) => setNotifs(ns => ns.filter(n => n.id !== id));
  const clearAll   = ()           => setNotifs([]);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── 벨 버튼 ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{
          background: open ? "rgba(255,255,255,0.12)" : "transparent",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
        title="알림"
      >
        <Bell
          className="w-3.5 h-3.5"
          style={{ color: unread > 0 ? "#AEB784" : "rgba(255,255,255,0.55)" }}
        />
        {/* 미읽음 배지 */}
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: "#B85450", lineHeight: 1 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── 드롭다운 패널 ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50 flex flex-col"
          style={{
            background: "rgba(252,252,250,0.98)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)",
            transform: anim ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
            opacity:   anim ? 1 : 0,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.14s ease",
            maxHeight: "480px",
          }}
        >
          {/* 헤더 */}
          <div
            className="flex items-center px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: ACCENT_BG }}
          >
            <Bell className="w-3.5 h-3.5 mr-2" style={{ color: ACCENT }} />
            <span className="text-xs font-bold flex-1" style={{ color: TEXT_PRIMARY }}>
              알림
            </span>
            {unread > 0 && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mr-2"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                {unread}개 미읽음
              </span>
            )}
            {notifs.length > 0 && unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-lg mr-1 transition-all"
                style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}
                title="모두 읽음 처리"
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.09)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              >
                <Check className="w-2.5 h-2.5" /> 모두 읽음
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md transition-all hover:bg-black/[0.07]"
            >
              <X className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
            </button>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-7 h-7" style={{ color: "rgba(65,67,27,0.15)" }} />
                <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>새 알림이 없습니다</p>
              </div>
            ) : (
              <div>
                {notifs.map((n, idx) => {
                  // 🚀 API의 n.type을 기반으로 아이콘과 색상을 매칭
                  const { icon: Icon, color, bg } = getNotificationStyle(n.type);
                  
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group relative"
                      style={{
                        borderBottom: idx < notifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                        background:   n.isRead ? "transparent" : "rgba(174,183,132,0.06)", // read -> isRead
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(174,183,132,0.06)")}
                      onClick={() => markRead(n.id)}
                    >
                      {/* 미읽음 도트 */}
                      {!n.isRead && (
                        <div
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ background: ACCENT }}
                        />
                      )}

                      {/* 아이콘 */}
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: bg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: color }} />
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[11px] font-semibold leading-tight"
                          style={{ color: n.isRead ? TEXT_SECONDARY : TEXT_PRIMARY }}
                        >
                          {n.title}
                        </p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: TEXT_TERTIARY }}>
                          {n.body} {/* 🚀 desc -> body */}
                        </p>
                        <p className="text-[9px] mt-1" style={{ color: TEXT_LABEL }}>
                          {n.createdAt} {/* 🚀 time -> createdAt */}
                        </p>
                      </div>

                      {/* 닫기 */}
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/[0.07] shrink-0"
                      >
                        <X className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {notifs.length > 0 && (
            <div
              className="px-4 py-2.5 shrink-0 flex items-center justify-between"
              style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.015)" }}
            >
              <span className="text-[9px]" style={{ color: TEXT_LABEL }}>
                총 {notifs.length}개
              </span>
              <button
                onClick={clearAll}
                className="text-[9px] font-semibold transition-all"
                style={{ color: TEXT_TERTIARY }}
                onMouseEnter={e => (e.currentTarget.style.color = "#B85450")}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_TERTIARY)}
              >
                전체 지우기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}