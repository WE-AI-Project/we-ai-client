import { useState, useEffect, useRef } from "react";
import {
  Sun, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ChevronRight, GitPullRequest,
  Zap, ExternalLink, RefreshCw, Loader2,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG, UI_AMBER, UI_AMBER_BG, UI_RED_BG,
  OLIVE_DARK,
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
  lastAccessedAt?: string;
};

const DISMISS_KEY = "weai_standup_dismissed";
const DISMISS_1HOUR_PREFIX = "weai_standup_dismiss_1hour_";
const LAST_ACCESS_PREFIX = "weai_last_access_time_";

export function getTodayKey() { return new Date().toISOString().slice(0, 10); }

export function isDismissedToday(): boolean {
  return localStorage.getItem(DISMISS_KEY) === getTodayKey();
}

export function dismissToday() {
  localStorage.setItem(DISMISS_KEY, getTodayKey());
}

export function isDismissedFor1Hour(projectId: number | string): boolean {
  const raw = localStorage.getItem(`${DISMISS_1HOUR_PREFIX}${projectId}`);
  if (!raw) return false;
  const until = parseInt(raw, 10);
  return !isNaN(until) && Date.now() < until;
}

export function dismissFor1Hour(projectId: number | string) {
  const until = Date.now() + 60 * 60 * 1000; // 1시간
  localStorage.setItem(`${DISMISS_1HOUR_PREFIX}${projectId}`, until.toString());
}

export function isRecentAccessWithin10Min(projectId: number | string): boolean {
  const raw = localStorage.getItem(`${LAST_ACCESS_PREFIX}${projectId}`);
  if (!raw) return false;
  const lastTime = parseInt(raw, 10);
  if (isNaN(lastTime)) return false;
  const diff = Date.now() - lastTime;
  // 10분 이내 (600,000ms)
  return diff > 0 && diff < 10 * 60 * 1000;
}

export function recordProjectAccessTime(projectId: number | string) {
  localStorage.setItem(`${LAST_ACCESS_PREFIX}${projectId}`, Date.now().toString());
}

export function shouldShowDailyStandup(projectId: number | string): boolean {
  if (isDismissedToday()) return false;
  if (isDismissedFor1Hour(projectId)) return false;
  if (isRecentAccessWithin10Min(projectId)) return false;
  return true;
}

export function formatRelativeAccessTime(dateInput?: string | number | Date | null): {
  label: string;
  isOnline: boolean;
  badgeClass: string;
  dotColor: string;
} {
  if (!dateInput) {
    return { label: "접속 기록 없음", isOnline: false, badgeClass: "text-gray-400 bg-gray-500/10", dotColor: "#9ca3af" };
  }
  const date = typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return { label: "방금 전 접속", isOnline: true, badgeClass: "text-emerald-600 bg-emerald-500/10", dotColor: "#10b981" };
  }

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0 || diffSec < 60) {
    return { label: "방금 전 접속", isOnline: true, badgeClass: "text-emerald-600 bg-emerald-500/10", dotColor: "#10b981" };
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    const isRecent = mins <= 10;
    return {
      label: `${mins}분 전 접속`,
      isOnline: isRecent,
      badgeClass: isRecent ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10",
      dotColor: isRecent ? "#10b981" : "#f59e0b",
    };
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return { label: `${hours}시간 전 접속`, isOnline: false, badgeClass: "text-gray-600 bg-gray-500/10", dotColor: "#6b7280" };
  }
  const days = Math.floor(diffSec / 86400);
  return { label: `${days}일 전 접속`, isOnline: false, badgeClass: "text-gray-500 bg-gray-500/10", dotColor: "#9ca3af" };
}

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
          <div className="flex items-center gap-1.5 flex-wrap">
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
            {/* 접속 시간 뱃지 */}
            {(() => {
              const rel = formatRelativeAccessTime(member.lastAccessedAt || new Date(Date.now() - (idx + 1) * 3 * 60 * 1000).toISOString());
              return (
                <span className={`text-[7.5px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0 ${rel.badgeClass}`}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rel.dotColor }} />
                  {rel.label}
                </span>
              );
            })()}
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
  const [visible, setVisible] = useState(false);
  const [highlightShow, setHighlightShow] = useState(false);
  const [cardsShow, setCardsShow] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "relevant">("relevant");
  const [skip1Hour, setSkip1Hour] = useState(false);
  const [skipToday, setSkipToday] = useState(false);

  // API 연동 상태
  const [members, setMembers] = useState<StandupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastAccessedTime, setLastAccessedTime] = useState<string | null>(null);

  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const FALLBACK_MEMBERS: StandupMember[] = [
  {
    name: "민우",
    avatar: "M",
    role: "Backend Lead",
    part: "Backend",
    partKo: "백엔드",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    completed: [
      { text: "Spring Boot JPA 다중 데이터소스 및 커넥션 풀 최적화", files: ["DataSourceConfig.java"] },
      { text: "JWT 리프레시 토큰 자동 갱신 인터셉터 적용", files: ["JwtAuthFilter.java"] },
    ],
    inProgress: [
      { text: "AI QA 분석 결과 벡터 스토리지 비동기 색인 파이프라인 구축", files: ["AiQaService.java"] },
    ],
    blockers: [],
    relevantToMe: true,
    relevantReason: "백엔드 API 엔드포인트 수정 사항이 있어 프론트엔드 통신 스펙 동기화가 필요합니다.",
    relevantAction: "API 변경사항 확인",
    navigatePage: "Changes",
    lastAccessedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    name: "지우",
    avatar: "J",
    role: "Frontend Lead",
    part: "Frontend",
    partKo: "프론트엔드",
    color: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    completed: [
      { text: "Air-Gapped 로컬 환경 변수 관리자 및 보안 마스킹 구현", files: ["EnvironmentSettingsPage.tsx"] },
      { text: "보안 위험 파일(env/secret) 자동 탐지 및 붉은색 경고 배너", files: ["ChangesPage.tsx"] },
    ],
    inProgress: [
      { text: "AI 화면 조작 테스트 실시간 뷰어 및 마우스 커서 에뮬레이션", files: ["AIQAPage.tsx"] },
    ],
    blockers: [],
    relevantToMe: true,
    relevantReason: "환경 변수 및 커밋 변경점 보안 검증 파이프라인이 완료되었습니다.",
    relevantAction: "Changes 확인",
    navigatePage: "Changes",
    lastAccessedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
  {
    name: "병권",
    avatar: "B",
    role: "QA / Security",
    part: "QA",
    partKo: "품질보증",
    color: "#f472b6",
    bg: "rgba(244,114,182,0.12)",
    completed: [
      { text: "커밋 단위 자동화 회귀 테스트 및 성능 부하 검증", files: ["QaTestSuite.java"] },
    ],
    inProgress: [
      { text: "멀티 에이전트 동시성 데드락 탐지 룰셋 추가", files: ["AgentScheduler.java"] },
    ],
    blockers: [],
    relevantToMe: false,
    relevantReason: "전체 테스트 파이프라인 98.4% 통과 상태입니다.",
    relevantAction: "AI QA 확인",
    navigatePage: "AIQA",
    lastAccessedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
];

  // 데이터 로드 함수
  const loadStandupData = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetchDailyStandup(projectId);
      const rawData = res?.data || res;
      if (rawData?.lastAccessedAt) {
        setLastAccessedTime(rawData.lastAccessedAt);
      }
      const dataList = rawData?.members || (Array.isArray(rawData) ? rawData : []);
      if (dataList && dataList.length > 0) {
        setMembers(dataList);
      } else {
        setMembers(FALLBACK_MEMBERS);
      }
    } catch (err) {
      console.warn("Standup data loaded with fallback dataset:", err);
      setMembers(FALLBACK_MEMBERS);
      setError(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 모든 종료/이동 액션 시 공통으로 실행될 통신 로직
  const executeCloseActions = async (callback: () => void) => {
    if (!projectId || projectId === "undefined" || projectId === 0 || projectId === "0") {
      callback();
      return;
    }

    try {
      if (skip1Hour) {
        dismissFor1Hour(projectId);
      }
      if (skipToday) {
        dismissToday();
        await hideDailyStandupToday(Number(projectId)).catch(() => null);
      }
      recordProjectAccessTime(projectId);
      await updateProjectAccessTime(projectId).catch(() => null);
    } catch (err) {
      console.error("❌ 종료 액션 처리 중 서버 에러 발생:", err);
    } finally {
      callback();
    }
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

  const lastLoginStr = formatRelativeAccessTime(lastAccessedTime).label.replace(" 접속", "");

  const greetingText = `안녕하세요, ${userName}(${userPart}) 님! 마지막 접속(${lastLoginStr}) 이후 팀 변경 사항을 분석했어요.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(12,14,2,0.72)",
        backdropFilter: "blur(10px)",
        opacity: visible ? 1 : 0,
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
              style={{ background: "rgba(166,123,91,0.20)" }}
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
                  style={{ background: "rgba(166,123,91,0.20)", color: "#A67B5B" }}
                >AI 자동 생성</span>
              </div>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {todayStr}
              </p>
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>
                <TypedGreeting text={greetingText} delay={400} />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {[
              { label: "완료 항목", value: totalCompleted, color: "#7ee787", bg: "rgba(126,231,135,0.12)" },
              { label: "진행 중", value: totalInProgress, color: "#D4CC9E", bg: "rgba(212,204,158,0.12)" },
              { label: "블로커", value: totalBlockers, color: "#ff7b72", bg: "rgba(255,123,114,0.12)" },
              { label: "관련 항목", value: relevantMembers.length, color: "#A67B5B", bg: "rgba(166,123,91,0.15)" },
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
              {/* ── 나와 관련된 항목 미리보기 하이라이트 ── */}
              {relevantMembers.length > 0 && (
                <div className="px-5 pt-3 space-y-1.5">
                  {relevantMembers.slice(0, 3).map((m, i) => (
                    <RelevantHighlight
                      key={m.name}
                      member={m}
                      visible={highlightShow}
                      idx={i}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}

              {/* ── 탭 바 ── */}
              <div
                className="flex items-center gap-1 px-5 pt-3 pb-2 sticky top-0 z-10"
                style={{ background: "rgba(250,250,247,0.95)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}
              >
                <button
                  onClick={() => setActiveTab("relevant")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{
                    background: activeTab === "relevant" ? ACCENT_BG : "transparent",
                    color: activeTab === "relevant" ? ACCENT : TEXT_TERTIARY,
                    border: `1px solid ${activeTab === "relevant" ? ACCENT_BORDER : "transparent"}`,
                  }}
                >
                  <Zap className="w-3 h-3" />
                  나와 관련된 항목
                  {relevantMembers.length > 0 && (
                    <span
                      className="text-[8px] px-1.5 py-0.2 rounded-full font-bold ml-0.5"
                      style={{ background: ACCENT, color: "white" }}
                    >{relevantMembers.length}</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{
                    background: activeTab === "all" ? ACCENT_BG : "transparent",
                    color: activeTab === "all" ? ACCENT : TEXT_TERTIARY,
                    border: `1px solid ${activeTab === "all" ? ACCENT_BORDER : "transparent"}`,
                  }}
                >
                  전체 팀원 ({allMembers.length}명)
                </button>
              </div>

              {/* ── 팀원별 카드 목록 ── */}
              <div className="p-5 space-y-3">
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
          className="shrink-0 px-5 py-3.5 flex items-center gap-3 flex-wrap"
          style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.98)" }}
        >
          {/* 1시간 동안 보지 않기 */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <div
              onClick={() => {
                setSkip1Hour(s => !s);
                if (!skip1Hour) setSkipToday(false);
              }}
              className="w-3.5 h-3.5 rounded flex items-center justify-center transition-all"
              style={{
                background: skip1Hour ? ACCENT : "transparent",
                border: `1.5px solid ${skip1Hour ? ACCENT : "rgba(0,0,0,0.22)"}`,
              }}
            >
              {skip1Hour && <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />}
            </div>
            <span className="text-[9px] font-medium" style={{ color: TEXT_SECONDARY }}>1시간 동안 보지 않기</span>
          </label>

          {/* 오늘 하루 보지 않기 */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <div
              onClick={() => {
                setSkipToday(s => !s);
                if (!skipToday) setSkip1Hour(false);
              }}
              className="w-3.5 h-3.5 rounded flex items-center justify-center transition-all"
              style={{
                background: skipToday ? ACCENT : "transparent",
                border: `1.5px solid ${skipToday ? ACCENT : "rgba(0,0,0,0.22)"}`,
              }}
            >
              {skipToday && <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />}
            </div>
            <span className="text-[9px] font-medium" style={{ color: TEXT_SECONDARY }}>오늘 다시 보지 않기</span>
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
              onMouseEnter={e => e.currentTarget.style.background = "rgba(112,130,56,0.12)"}
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
