import { useState, useEffect, useRef } from "react";
import {
  Bell, X, GitCommit, Bot, AlertCircle,
  CheckCircle2, Info, FolderGit2, Check,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  SIDEBAR_BORDER,
} from "../colors";

// ── 알림 타입 ──
type NotifLevel = "info" | "success" | "warning" | "error";

type Notification = {
  id:      number;
  level:   NotifLevel;
  icon:    typeof GitCommit;
  title:   string;
  desc:    string;
  time:    string;
  read:    boolean;
};

const LEVEL_COLORS: Record<NotifLevel, { color: string; bg: string }> = {
  info:    { color: "#6B7A50",    bg: "rgba(107,122,80,0.10)"  },
  success: { color: "#5A8A4A",    bg: "rgba(90,138,74,0.10)"   },
  warning: { color: "#C09840",    bg: "rgba(192,152,64,0.10)"  },
  error:   { color: "#B85450",    bg: "rgba(184,84,80,0.10)"   },
};

const INITIAL_NOTIFS: Notification[] = [
  {
    id: 1, level: "error", icon: AlertCircle, read: false,
    title: "AGT-04 연결 끊김",
    desc:  "에이전트 04번이 응답하지 않습니다. 재시작이 필요합니다.",
    time:  "방금 전",
  },
  {
    id: 2, level: "success", icon: CheckCircle2, read: false,
    title: "빌드 성공",
    desc:  "WE&AI Backend Server — v0.9.3 빌드가 완료됐습니다.",
    time:  "12분 전",
  },
  {
    id: 3, level: "info", icon: GitCommit, read: false,
    title: "새 커밋 3건",
    desc:  "main 브랜치에 새로운 커밋이 푸시됐습니다.",
    time:  "34분 전",
  },
  {
    id: 4, level: "warning", icon: Bot, read: false,
    title: "AGT-02 CPU 과부하",
    desc:  "멀티에이전트 오케스트레이터 CPU 사용률이 87%입니다.",
    time:  "1시간 전",
  },
  {
    id: 5, level: "info", icon: FolderGit2, read: true,
    title: "프로젝트 설정 변경됨",
    desc:  "Active Profile이 dev → staging으로 변경됐습니다.",
    time:  "2시간 전",
  },
  {
    id: 6, level: "success", icon: Info, read: true,
    title: "문서 동기화 완료",
    desc:  "RAG 문서 7건이 성공적으로 인덱싱됐습니다.",
    time:  "3시간 전",
  },
];

// ── 메인 컴포넌트 ──
export function NotificationPanel() {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);
  const [anim,   setAnim]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  // 패널 열릴 때 애니메이션
  useEffect(() => {
    if (open) requestAnimationFrame(() => setAnim(true));
    else       setAnim(false);
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

  const markRead   = (id: number) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAll    = ()           => setNotifs(ns => ns.map(n => ({ ...n, read: true })));
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
                  const Icon  = n.icon;
                  const style = LEVEL_COLORS[n.level];
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group relative"
                      style={{
                        borderBottom: idx < notifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                        background:   n.read ? "transparent" : "rgba(174,183,132,0.06)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = n.read ? "transparent" : "rgba(174,183,132,0.06)")}
                      onClick={() => markRead(n.id)}
                    >
                      {/* 미읽음 도트 */}
                      {!n.read && (
                        <div
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ background: ACCENT }}
                        />
                      )}

                      {/* 아이콘 */}
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: style.bg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[11px] font-semibold leading-tight"
                          style={{ color: n.read ? TEXT_SECONDARY : TEXT_PRIMARY }}
                        >
                          {n.title}
                        </p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: TEXT_TERTIARY }}>
                          {n.desc}
                        </p>
                        <p className="text-[9px] mt-1" style={{ color: TEXT_LABEL }}>
                          {n.time}
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
