import { useState, useEffect, useRef } from "react";
import {
  Sun, X, Sparkles, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ChevronRight, FileCode2, GitPullRequest,
  Zap, Bell, ExternalLink, Bot, RefreshCw, Loader2,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG, UI_AMBER, UI_AMBER_BG, UI_RED_BG,
  GRADIENT_LOGO, OLIVE_DARK,
} from "../colors";
import { fetchDailyStandup, updateProjectAccessTime, hideDailyStandupToday } from "../lib/api"; // 실제 API 함수 임포트

// ─────────────────────────────────────────────────────────────
// 데이터 타입
// ─────────────────────────────────────────────────────────────
type WorkItem = {
  text: string;
  files?: string[];
  badge?: string;  // "PR #42" 등
};

type StandupMember = {
  name: string;
  avatar: string;
  role: string;
  part: "Backend" | "Frontend" | "QA" | "DevOps";
  partKo: string;
  color: string;
  bg: string;
  completed: WorkItem[];
  inProgress: WorkItem[];
  blockers: string[];
  relevantToMe: boolean;
  relevantReason: string;
  relevantAction: string;
  navigatePage: string;
};

const DISMISS_KEY = "weai_standup_dismissed";
function getTodayKey() { return new Date().toISOString().slice(0, 10); }
function isDismissedToday(): boolean {
  return localStorage.getItem(DISMISS_KEY) === getTodayKey();
}
function dismissToday() { localStorage.setItem(DISMISS_KEY, getTodayKey()); }

// ─────────────────────────────────────────────────────────────
// 타이핑 애니메이션 텍스트
// ─────────────────────────────────────────────────────────────
function TypedGreeting({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState("");
  const [started, setStarted] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    idxRef.current = 0;
    setShown("");
    const t = setInterval(() => {
      idxRef.current++;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [started, text]);

  return <>{shown}{shown.length < text.length && started && <span className="animate-pulse">▌</span>}</>;
}

// ─────────────────────────────────────────────────────────────
// 관련 항목 하이라이트 카드
// ─────────────────────────────────────────────────────────────
function RelevantHighlight({
  member, visible, idx, onNavigate,
}: {
  member: StandupMember; visible: boolean; idx: number; onNavigate: (page: string) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), idx * 130);
    return () => clearTimeout(t);
  }, [visible, idx]);

  return (
    <div
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all"
      style={{
        background: show ? "rgba(255,255,255,0.92)" : "transparent",
        border: `1px solid ${show ? member.color + "30" : "transparent"}`,
        opacity: show ? 1 : 0,
        transform: show ? "translateX(0)" : "translateX(-12px)",
        transition: "all 0.28s cubic-bezier(0.34,1.3,0.64,1)",
        boxShadow: show ? `0 1px 8px ${member.color}10` : "none",
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: member.bg }}
      >
        <span className="text-[10px] font-bold" style={{ color: member.color }}>{member.avatar}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] font-bold" style={{ color: member.color }}>{member.name}</span>
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: member.bg, color: member.color }}
          >{member.partKo}</span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
          {member.relevantReason}
        </p>
      </div>

      <button
        onClick={() => onNavigate(member.navigatePage)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold shrink-0 transition-all"
        style={{
          background: member.bg,
          color: member.color,
          border: `1px solid ${member.color}25`,
        }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.05)"}
        onMouseLeave={e => e.currentTarget.style.filter = ""}
      >
        {member.relevantAction}
        <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 팀원 카드
// ─────────────────────────────────────────────────────────────
function MemberCard({
  member, idx, visible, onNavigate,
}: {
  member: StandupMember; idx: number; visible: boolean; onNavigate: (page: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), idx * 90);
    return () => clearTimeout(t);
  }, [visible, idx]);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${member.relevantToMe ? member.color + "25" : BORDER}`,
        background: "rgba(255,255,255,0.95)",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
        transition: "all 0.30s cubic-bezier(0.34,1.2,0.64,1)",
        boxShadow: show && member.relevantToMe ? `0 2px 12px ${member.color}12` : "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
        style={{ background: member.bg, borderBottom: `1px solid ${member.color}20` }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.97)"}
        onMouseLeave={e => e.currentTarget.style.filter = ""}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.65)", border: `1.5px solid ${member.color}40` }}
        >
          <span className="text-sm font-bold" style={{ color: member.color }}>{member.avatar}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold" style={{ color: member.color }}>{member.name}</p>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(255,255,255,0.55)", color: member.color }}
            >{member.partKo}</span>
            {member.relevantToMe && (
              <span
                className="text-[7.5px] px-1.5 py-0.5 rounded-full font-bold ml-0.5"
                style={{ background: member.color, color: "white" }}
              >나에게 관련</span>
            )}
          </div>
          <p className="text-[9px] mt-0.5" style={{ color: member.color + "99" }}>{member.role}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: UI_GREEN_BG, color: UI_GREEN }}>
            ✓ {member.completed.length}
          </span>
          {member.inProgress.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: UI_AMBER_BG, color: UI_AMBER }}>
              ↻ {member.inProgress.length}
            </span>
          )}
          {member.blockers.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: UI_RED_BG, color: "#B85450" }}>
              ⚠ {member.blockers.length}
            </span>
          )}
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform"
            style={{ color: member.color + "80", transform: expanded ? "rotate(90deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      <div className="px-4 py-2.5 space-y-1.5">
        {member.completed.slice(0, expanded ? member.completed.length : 2).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: UI_GREEN }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] leading-snug" style={{ color: TEXT_PRIMARY }}>{item.text}</p>
              {item.files && item.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.files.map(f => (
                    <span key={f} className="text-[7.5px] font-mono px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.04)", color: TEXT_TERTIARY }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {item.badge && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: member.bg, color: member.color }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}

        {!expanded && member.completed.length > 2 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[9px] font-semibold mt-0.5"
            style={{ color: member.color }}
          >
            + {member.completed.length - 2}개 더 보기
          </button>
        )}

        {expanded && member.inProgress.length > 0 && (
          <div className="pt-1.5 border-t" style={{ borderColor: BORDER_SUBTLE }}>
            {member.inProgress.map((item, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <Clock className="w-3 h-3 shrink-0 mt-0.5" style={{ color: UI_AMBER }} />
                <p className="text-[10px] leading-snug" style={{ color: TEXT_SECONDARY }}>{item.text}</p>
              </div>
            ))}
          </div>
        )}

        {expanded && member.blockers.length > 0 && (
          <div className="pt-1.5 border-t" style={{ borderColor: BORDER_SUBTLE }}>
            {member.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#B85450" }} />
                <p className="text-[10px] leading-snug" style={{ color: "#B85450" }}>{b}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {member.relevantToMe && (
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderTop: `1px solid ${member.color}15`, background: `${member.color}05` }}
        >
          <Zap className="w-2.5 h-2.5 shrink-0" style={{ color: member.color }} />
          <p className="text-[9px] flex-1" style={{ color: member.color + "cc" }}>{member.relevantReason}</p>
          <button
            onClick={() => onNavigate(member.navigatePage)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-semibold shrink-0 transition-all"
            style={{ background: member.bg, color: member.color, border: `1px solid ${member.color}30` }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.95)"}
            onMouseLeave={e => e.currentTarget.style.filter = ""}
          >
            {member.relevantAction}
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 메인 모달 컴포넌트
// ─────────────────────────────────────────────────────────────
export function DailyStandupModal({
  userName = "팀원",
  userPart = "Frontend",
  projectId,
  onClose,
  onNavigate,
}: {
  userName?: string;
  userPart?: string;
  projectId: number | string;
  onClose: () => void;
  onNavigate: (page: string) => void;
}) {
  const activeProjectId = Number(
    projectId || 
    localStorage.getItem("currentProjectId") || 
    localStorage.getItem("projectId") || 
    1
  );
  
  const [visible, setVisible] = useState(false);
  const [highlightShow, setHighlightShow] = useState(false);
  const [cardsShow, setCardsShow] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "relevant">("relevant");
  const [skipToday, setSkipToday] = useState(false);

  // API 연동 상태
  const [members, setMembers] = useState<StandupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const lastLoginStr = "어제 오전 11:42";

  // 데이터 로드 함수
  const loadStandupData = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetchDailyStandup(projectId);
      console.log("스탠드업 API 응답 데이터 확인:", res);

      const rawData = res?.data || res;
      // 백엔드 응답에서 lastAccessedAt 저장
      if (rawData?.lastAccessedAt) {
        setLastAccessedTime(rawData.lastAccessedAt);
      }

      const dataList = rawData?.members || (Array.isArray(rawData) ? rawData : []);

      setMembers(dataList);
    } catch (err) {
      console.error("Failed to load standup data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const closeWithPatch = async (callback: () => void) => {
    try {
      // 닫기 전에 PATCH 호출하여 이번 접속 시간 갱신
      await updateProjectAccessTime(projectId);
      console.log("프로젝트 접속 시간 갱신 완료");
    } catch (err) {
      console.error("프로젝트 접속 시간 갱신 실패", err);
    } finally {
      callback();
    }
  };

  const [lastAccessedTime, setLastAccessedTime] = useState<string | null>(null);  //접속 시간 저장

  // ✅ 1. 모든 종료/이동 액션 시 공통으로 실행될 통신 로직
  const executeCloseActions = async (callback: () => void) => {
    // 💡 F12 콘솔에서 projectId가 제대로 된 숫자로 뜨는지 확인해 보세요!
    console.log("🛠 현재 전달된 projectId:", projectId);

    // 안전 장치: projectId가 없거나 유효하지 않으면 API 호출을 건너뛰고 모달만 닫음
    if (!projectId || projectId === "undefined" || projectId === 0 || projectId === "0") {
      console.warn("⚠️ 유효하지 않은 projectId입니다. API를 호출하지 않고 모달을 닫습니다.");
      callback();
      return;
    }

    try {
      // 오늘 다시 보지 않기 체크 시 로컬스토리지 저장 및 API 호출
      if (skipToday) {
        dismissToday();
        await hideDailyStandupToday(Number(projectId));
        console.log("✅ 오늘 다시 보지 않기 설정 완료");
      }
      
      // 프로젝트 접속 시간 갱신 API 호출
      await updateProjectAccessTime(projectId);
      console.log("✅ 프로젝트 접속 시간 갱신 완료");
    } catch (err) {
      console.error("❌ 종료 액션 처리 중 서버 에러 발생:", err);
    } finally {
      callback();
    }
  };

  const formatLastLoginTime = (timeStr?: string | null) => {  //날짜 포멧팅 함수(이전 답변 코드 활용)
    if (!timeStr) return "최근 접속 기록 없음"; 
    const date = new Date(timeStr);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeFormatted = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true });

    if (isToday) return `오늘 ${timeFormatted}`;
    if (isYesterday) return `어제 ${timeFormatted}`;
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${timeFormatted}`;
  };

  useEffect(() => {
    if (!projectId || projectId === 0 || projectId === "0") {
      setLoading(false);
      return;
    }

    loadStandupData();
  }, [projectId]);

  // 관련 멤버 필터
  const relevantMembers = members.filter(m => m.relevantToMe && m.name !== userName);
  const allMembers = members.filter(m => m.name !== userName);
  const displayMembers = activeTab === "relevant" ? relevantMembers : allMembers;

  // 총계
  const totalCompleted = members.reduce((s, m) => s + (m.completed?.length || 0), 0);
  const totalInProgress = members.reduce((s, m) => s + (m.inProgress?.length || 0), 0);
  const totalBlockers = members.reduce((s, m) => s + (m.blockers?.length || 0), 0);

  // 스태거 등장
  useEffect(() => {
    if (loading || error) return;
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => setHighlightShow(true), 900);
    const t3 = setTimeout(() => setCardsShow(true), 1300);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [loading, error]);

  const handleClose = () => {
    executeCloseActions(() => {
      setVisible(false);
      setTimeout(onClose, 280);
    });
  };

  const handleNavigate = (page: string) => {
    executeCloseActions(() => {
      onNavigate(page);
      onClose();
    });
  };

  const greetingText = `안녕하세요, ${userName} 님! 마지막 접속(${lastLoginStr}) 이후 팀 변경 사항을 분석했어요.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(12,14,2,0.72)",
        backdropFilter: "blur(10px)",
        opacity: 1,
        transition: "opacity 0.28s ease",
      }}
    >
      <style>{`
        @keyframes _su_shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes _su_pulse {
          0%,100% { opacity: 0.6; } 50% { opacity: 1; }
        }
      `}</style>

      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth: 680,
          maxHeight: "90vh",
          background: "#FAFAF7",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.12)",
          transform: "translateY(0) scale(1)",
          transition: "transform 0.32s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* ══ 헤더 ══ */}
        <div
          className="shrink-0 px-5 py-4"
          style={{ background: OLIVE_DARK, borderBottom: `1px solid rgba(255,255,255,0.08)` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(174,183,132,0.20)" }}
            >
              <Sun className="w-5 h-5" style={{ color: "#D4CC9E" }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
                  데일리 스탠드업 브리핑
                </h2>
                <span
                  className="text-[8px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(174,183,132,0.20)", color: "#AEB784" }}
                >AI 자동 생성</span>
              </div>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {todayStr}
              </p>
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>
                <TypedGreeting text={greetingText} delay={400} />
              </p>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg shrink-0 transition-all hover:bg-white/[0.10]"
            >
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.55)" }} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { label: "완료 항목", value: totalCompleted, color: "#7ee787", bg: "rgba(126,231,135,0.12)" },
              { label: "진행 중", value: totalInProgress, color: "#D4CC9E", bg: "rgba(212,204,158,0.12)" },
              { label: "블로커", value: totalBlockers, color: "#ff7b72", bg: "rgba(255,123,114,0.12)" },
              { label: "관련 항목", value: relevantMembers.length, color: "#AEB784", bg: "rgba(174,183,132,0.15)" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: s.bg }}>
                <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7ee787", animation: "_su_pulse 1.8s ease infinite" }} />
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                마지막 분석: {lastLoginStr}
              </span>
            </div>
          </div>
        </div>

        {/* ══ 스크롤 영역 (내부 로딩/에러 처리) ══ */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: ACCENT }} />
              <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>데일리 스탠드업 데이터를 불러오는 중입니다...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle className="w-7 h-7" style={{ color: "#B85450" }} />
              <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>브리핑 데이터를 불러오지 못했습니다.</p>
              <button
                onClick={loadStandupData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all mt-1"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <RefreshCw className="w-3 h-3" />
                다시 시도
              </button>
            </div>
          ) : (
            <>
              {/* 나에게 관련 하이라이트 섹션 */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center"
                    style={{ background: ACCENT_BG }}
                  >
                    <Bell className="w-3 h-3" style={{ color: ACCENT }} />
                  </div>
                  <p className="text-[11px] font-bold" style={{ color: TEXT_PRIMARY }}>
                    나에게 관련된 항목
                  </p>
                  <span
                    className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: ACCENT_BG, color: ACCENT }}
                  >
                    {relevantMembers.length}건
                  </span>
                  <span className="ml-auto text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    {userPart} 파트 기준
                  </span>
                </div>

                <div
                  className="rounded-2xl p-3 space-y-1.5"
                  style={{ background: "rgba(255,255,255,0.70)", border: `1px solid ${ACCENT_BORDER}` }}
                >
                  {relevantMembers.map((m, i) => (
                    <RelevantHighlight
                      key={m.name}
                      member={m}
                      idx={i}
                      visible={highlightShow}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>

              <div className="mx-5 mb-3" style={{ height: 1, background: BORDER_SUBTLE }} />

              {/* 팀 전체 현황 */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(65,67,27,0.08)" }}
                  >
                    <Bot className="w-3 h-3" style={{ color: ACCENT }} />
                  </div>
                  <p className="text-[11px] font-bold" style={{ color: TEXT_PRIMARY }}>팀 전체 현황</p>

                  <div className="flex items-center gap-1 ml-auto">
                    {(["relevant", "all"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-semibold transition-all"
                        style={{
                          background: activeTab === tab ? ACCENT_BG : "transparent",
                          color: activeTab === tab ? ACCENT : TEXT_TERTIARY,
                          border: `1px solid ${activeTab === tab ? ACCENT_BORDER : "transparent"}`,
                        }}
                      >
                        {tab === "relevant" ? "관련된 팀원" : "전체 팀원"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {displayMembers.map((m, i) => (
                    <MemberCard
                      key={m.name}
                      member={m}
                      idx={i}
                      visible={cardsShow}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>

                {displayMembers.length === 0 && (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>
                      {activeTab === "relevant"
                        ? "나와 관련된 팀원의 항목이 없습니다."
                        : "전체 팀원의 항목이 없습니다."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ══ 푸터 ══ */}
        <div
          className="shrink-0 px-5 py-3.5 flex items-center gap-3"
          style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.98)" }}
        >
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <div
              onClick={() => setSkipToday(s => !s)}
              className="w-3.5 h-3.5 rounded flex items-center justify-center transition-all"
              style={{
                background: skipToday ? ACCENT : "transparent",
                border: `1.5px solid ${skipToday ? ACCENT : "rgba(0,0,0,0.22)"}`,
              }}
            >
              {skipToday && <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />}
            </div>
            <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>오늘 다시 보지 않기</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleNavigate("Changes")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
              style={{
                background: ACCENT_BG,
                color: ACCENT,
                border: `1px solid ${ACCENT_BORDER}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(65,67,27,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = ACCENT_BG}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Changes 확인
            </button>

            <button
              onClick={handleClose} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
              style={{
                background: OLIVE_DARK,
                color: "rgba(255,255,255,0.92)",
              }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.12)"}
              onMouseLeave={e => e.currentTarget.style.filter = ""}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              확인했어요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { isDismissedToday };