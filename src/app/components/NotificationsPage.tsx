import { useState } from "react";
import { Bell, AlertCircle, GitCommit, CheckCircle2, Server, Bot, Circle, CheckCheck, Settings } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  UI_RED, UI_RED_BG, UI_GREEN, UI_GREEN_BG, UI_GRAY, UI_GRAY_BG, UI_INDIGO, UI_INDIGO_BG,
  GRADIENT_HEADER,
} from "../colors";

type Notif = {
  id: number;
  type: "agent" | "commit" | "task" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// 더미 알림 데이터 (오늘 + 어제)
const TODAY_NOTIFS: Notif[] = [
  { id: 1, type: "agent",  title: "Agent Error — AGT-04 Parser Delta",    body: "JSON parse error: Unexpected token '<' at position 0. Retry #3 failed.",    time: "2m ago",   read: false },
  { id: 2, type: "task",   title: "Task Completed — Deploy to staging",    body: "Admin marked 'Deploy WE&AI Backend to staging environment' as Done.",      time: "1hr ago",  read: false },
  { id: 3, type: "commit", title: "2 new commits — WE&AI Backend",         body: "병권 pushed to main: 'Fixed JDK 17 toolchain issue in settings.gradle'",   time: "2hr ago",  read: false },
  { id: 4, type: "agent",  title: "High Memory — AGT-02 Classifier Beta",  body: "Memory usage reached 83%. Consider scaling or reducing batch size.",        time: "5hr ago",  read: true  },
];

const YESTERDAY_NOTIFS: Notif[] = [
  { id: 5, type: "system", title: "Server Restarted",                       body: "Spring Boot server restarted on port 8080. Active profile: dev.",          time: "Yesterday", read: true },
  { id: 6, type: "commit", title: "PR Merged — feature/agent",              body: "Admin merged 'Refactored Multi-Agent communication logic' into main.",      time: "Yesterday", read: true },
  { id: 7, type: "task",   title: "Task Assigned — API Documentation",      body: "병권, you have been assigned: 'Write REST API documentation' (Medium).",   time: "Yesterday", read: true },
  { id: 8, type: "agent",  title: "Agent Restarted — AGT-01 DataSync",      body: "AGT-01 was successfully restarted. Resuming: Fetching API endpoints.",    time: "Yesterday", read: true },
];

const TYPE_META: Record<Notif["type"], { icon: any; color: string; bg: string; label: string }> = {
  agent:  { icon: Bot,          color: UI_RED,    bg: UI_RED_BG,    label: "Agent Alert"  },
  commit: { icon: GitCommit,    color: UI_INDIGO, bg: UI_INDIGO_BG, label: "Commit"       },
  task:   { icon: CheckCircle2, color: UI_GREEN,  bg: UI_GREEN_BG,  label: "Task Update"  },
  system: { icon: Server,       color: UI_GRAY,   bg: UI_GRAY_BG,   label: "System"       },
};

function NotifItem({ notif, onRead }: { notif: Notif; onRead: (id: number) => void }) {
  const meta = TYPE_META[notif.type];
  const Icon = meta.icon;
  return (
    <div
      onClick={() => onRead(notif.id)}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] cursor-pointer relative"
    >
      {/* 읽지 않은 알림 표시 점 */}
      {!notif.read && (
        <div className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full" style={{ background: UI_INDIGO }} />
      )}
      {/* 아이콘 */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
        <Icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>
      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          {!notif.read && (
            <span className="text-[9px] font-semibold" style={{ color: UI_INDIGO }}>NEW</span>
          )}
        </div>
        <p className="text-xs font-medium" style={{ color: notif.read ? TEXT_SECONDARY : TEXT_PRIMARY }}>{notif.title}</p>
        <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: TEXT_TERTIARY }}>{notif.body}</p>
      </div>
      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: TEXT_TERTIARY }}>{notif.time}</span>
    </div>
  );
}

export function NotificationsPage() {
  const [todayNotifs, setTodayNotifs] = useState(TODAY_NOTIFS);
  const [yesterdayNotifs, setYesterdayNotifs] = useState(YESTERDAY_NOTIFS);

  const unreadCount = todayNotifs.filter(n => !n.read).length;

  const markRead = (id: number) => {
    setTodayNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setYesterdayNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setTodayNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setYesterdayNotifs(prev => prev.map(n => ({ ...n, read: true })));
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

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Notifications</h1>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : "모든 알림을 확인했습니다"}
              </p>
            </div>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          </div>

          {/* 알림 타입 요약 */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const count = [...todayNotifs, ...yesterdayNotifs].filter(n => n.type === type).length;
              const Icon = meta.icon;
              return (
                <div key={type} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.bg }}>
                    <Icon className="w-3 h-3" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: meta.color }}>{count}</p>
                    <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{meta.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 오늘 알림 */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_TERTIARY }}>Today</p>
              {unreadCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(99,91,255,0.12)", color: ACCENT }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {todayNotifs.map((n, i) => (
              <div key={n.id} style={{ borderBottom: i < todayNotifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                <NotifItem notif={n} onRead={markRead} />
              </div>
            ))}
          </div>

          {/* 어제 알림 */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_TERTIARY }}>Yesterday</p>
            </div>
            {yesterdayNotifs.map((n, i) => (
              <div key={n.id} style={{ borderBottom: i < yesterdayNotifs.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                <NotifItem notif={n} onRead={markRead} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}