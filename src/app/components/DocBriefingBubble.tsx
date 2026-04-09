import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Bot, FileText, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, AlertCircle, FolderOpen,
  ListChecks, Layers, ArrowRight,
} from "lucide-react";
import type { BriefingData } from "../data/chatStore";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG, UI_AMBER, UI_AMBER_BG, UI_RED_BG,
  GRADIENT_LOGO,
} from "../colors";

// ── 리스크 레벨 표시 ──
const RISK_MAP = {
  low:    { label: "리스크 낮음",  color: UI_GREEN,    bg: UI_GREEN_BG,       icon: CheckCircle2  },
  medium: { label: "리스크 중간",  color: "#C09840",   bg: UI_AMBER_BG,       icon: AlertTriangle },
  high:   { label: "리스크 높음",  color: "#B85450",   bg: UI_RED_BG,         icon: AlertCircle   },
};

// ── 확장자 색상 ──
const EXT_COLORS: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(245,158,11,0.12)",  color: "#C09840" },
  ts:     { bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
  tsx:    { bg: "rgba(6,182,212,0.12)",   color: "#06b6d4" },
  gradle: { bg: "rgba(65,67,27,0.10)",   color: ACCENT    },
  yml:    { bg: "rgba(90,138,74,0.12)",  color: "#5A8A4A" },
  yaml:   { bg: "rgba(90,138,74,0.12)",  color: "#5A8A4A" },
  pdf:    { bg: "rgba(184,84,80,0.12)",  color: "#B85450" },
  md:     { bg: "rgba(139,92,246,0.12)", color: "#8b5cf6" },
  env:    { bg: "rgba(192,152,64,0.12)", color: "#C09840" },
  css:    { bg: "rgba(236,72,153,0.10)", color: "#ec4899" },
};

// ── 글자 단위 스트리밍 텍스트 ──
function StreamText({ text, delay = 0, speed = 16, onDone }: {
  text: string; delay?: number; speed?: number; onDone?: () => void;
}) {
  const [shown, setShown]   = useState("");
  const [started, setStarted] = useState(false);
  const idx  = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    idx.current = 0;
    setShown("");
    done.current = false;
    const t = setInterval(() => {
      idx.current++;
      setShown(text.slice(0, idx.current));
      if (idx.current >= text.length && !done.current) {
        done.current = true;
        clearInterval(t);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(t);
  }, [started, text]);

  return <>{shown}{!done.current && started && <span className="animate-pulse">▌</span>}</>;
}

// ── 단계별 키포인트 카드 ──
function KeyPointCard({ icon, label, text, visible, delay }: {
  icon: string; label: string; text: string; visible: boolean; delay: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);

  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-xl transition-all"
      style={{
        background:  show ? "rgba(255,255,255,0.85)" : "transparent",
        border:      `1px solid ${show ? BORDER : "transparent"}`,
        opacity:     show ? 1 : 0,
        transform:   show ? "translateX(0)" : "translateX(-8px)",
        transition:  "all 0.28s cubic-bezier(0.34,1.4,0.64,1)",
        boxShadow:   show ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
      }}
    >
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold mb-0.5" style={{ color: ACCENT }}>{label}</p>
        <p className="text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{text}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════
export function DocBriefingBubble({
  briefing,
  savedToDoc,
  onViewDoc,
  time,
}: {
  briefing:   BriefingData;
  savedToDoc: boolean;
  onViewDoc?: () => void;
  time:       string;
}) {
  // ── 단계적 공개 상태 ──
  const [phase, setPhase]         = useState(0); // 0: header, 1: purpose, 2: keypoints, 3: stack, 4: actions, 5: done
  const [expanded, setExpanded]   = useState(false);
  const [kpVisible, setKpVisible] = useState(false);

  useEffect(() => {
    const timings = [400, 1200, 2200, 4000, 5200];
    const timers = timings.map((t, i) =>
      setTimeout(() => setPhase(i + 1), t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase >= 2) setTimeout(() => setKpVisible(true), 200);
  }, [phase]);

  const risk    = RISK_MAP[briefing.riskLevel];
  const RiskIcon = risk.icon;
  const extColor = EXT_COLORS[briefing.fileExt] ?? { bg: "rgba(65,67,27,0.08)", color: ACCENT };

  return (
    <div className="flex gap-2.5 items-start mb-5">
      {/* AI 아바타 */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: GRADIENT_LOGO }}
      >
        <Bot className="w-3.5 h-3.5" style={{ color: "white" }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* AI 레이블 */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[9px] font-bold" style={{ color: ACCENT }}>WE&AI Doc Briefer</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}>
            AI
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(90,138,74,0.10)", color: "#5A8A4A" }}>
            🌐 한글화 완료
          </span>
        </div>

        {/* 브리핑 카드 */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: `1px solid ${BORDER}`,
            background: "rgba(252,252,250,0.98)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* ── 헤더 ── */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: ACCENT_BG, borderBottom: `1px solid ${ACCENT_BORDER}` }}
          >
            {/* 파일 아이콘 */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: extColor.bg }}
            >
              <FileText className="w-4 h-4" style={{ color: extColor.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[11px] font-bold truncate" style={{ color: TEXT_PRIMARY }}>
                  {briefing.fileName}
                </p>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: extColor.bg, color: extColor.color }}
                >
                  .{briefing.fileExt}
                </span>
              </div>
              <p className="text-[9px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                {briefing.docType}
              </p>
            </div>

            {/* 리스크 배지 */}
            {phase >= 1 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
                style={{ background: risk.bg, border: `1px solid ${risk.color}20` }}
              >
                <RiskIcon className="w-3 h-3" style={{ color: risk.color }} />
                <span className="text-[8px] font-bold" style={{ color: risk.color }}>
                  {risk.label}
                </span>
              </div>
            )}
          </div>

          <div className="px-4 py-3 space-y-3">

            {/* ── 목적 (스트리밍) ── */}
            {phase >= 1 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                    문서 목적
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                  <StreamText
                    text={briefing.purpose}
                    delay={100}
                    speed={12}
                    onDone={() => setPhase(p => Math.max(p, 2))}
                  />
                </p>
              </div>
            )}

            {/* ── 핵심 포인트 ── */}
            {phase >= 2 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                    핵심 요약
                  </span>
                </div>
                <div className="space-y-1.5">
                  {briefing.keyPoints.map((kp, i) => (
                    <KeyPointCard
                      key={i}
                      icon={kp.icon}
                      label={kp.label}
                      text={kp.text}
                      visible={kpVisible}
                      delay={i * 320}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── 기술 스택 ── */}
            {phase >= 3 && (
              <div
                style={{
                  opacity: phase >= 3 ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
                    기술 스택
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {briefing.techStack.map(t => (
                    <span
                      key={t}
                      className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "rgba(65,67,27,0.07)",
                        color: ACCENT,
                        border: `1px solid ${ACCENT_BORDER}`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── 필요 조치 (접기/펼치기) ── */}
            {phase >= 4 && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${BORDER}`,
                  opacity: phase >= 4 ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
                  style={{ background: "rgba(0,0,0,0.02)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                >
                  <ListChecks className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />
                  <span className="text-[9px] font-bold flex-1" style={{ color: ACCENT }}>
                    필요 조치 사항
                  </span>
                  <span
                    className="text-[8px] px-1.5 py-0.5 rounded-full mr-1"
                    style={{ background: ACCENT_BG, color: ACCENT }}
                  >
                    {briefing.actionItems.length}건
                  </span>
                  {expanded
                    ? <ChevronUp   className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    : <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                  }
                </button>

                {expanded && (
                  <div className="px-3 pb-3 pt-1 space-y-1.5">
                    {briefing.actionItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: ACCENT }} />
                        <p className="text-[10px] leading-snug" style={{ color: TEXT_SECONDARY }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Docs 저장 완료 배너 ── */}
            {phase >= 5 && savedToDoc && (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: UI_GREEN_BG,
                  border: `1px solid ${UI_GREEN}25`,
                  opacity: 1,
                  transition: "opacity 0.4s ease",
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: UI_GREEN_BG }}
                >
                  <FolderOpen className="w-3.5 h-3.5" style={{ color: UI_GREEN }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: UI_GREEN }}>
                    Docs에 저장 완료
                  </p>
                  <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    [AI 브리핑] {briefing.fileName} — 문서 탭에서 확인하세요
                  </p>
                </div>
                {onViewDoc && (
                  <button
                    onClick={onViewDoc}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-all"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      color: UI_GREEN,
                      border: `1px solid ${UI_GREEN}30`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.20)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"}
                  >
                    문서 보기 →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 카드 푸터 */}
          <div
            className="px-4 py-2 flex items-center gap-1.5"
            style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.01)" }}
          >
            <Sparkles className="w-2.5 h-2.5 shrink-0" style={{ color: TEXT_LABEL }} />
            <p className="text-[8.5px]" style={{ color: TEXT_LABEL }}>
              파일명·확장자·패턴 분석 기반 AI 자동 한글화 브리핑
            </p>
            <span className="ml-auto text-[8px]" style={{ color: TEXT_LABEL }}>
              {new Date(time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 분석 중 로딩 버블 ──
export function BriefingLoadingBubble({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0);
  const steps = [
    "파일 구조 파악 중...",
    "기술 키워드 추출 중...",
    "핵심 요약 생성 중...",
    "한글 브리핑 작성 중...",
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-2.5 items-start mb-4">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: GRADIENT_LOGO }}
      >
        <style>{`
          @keyframes _brief_spin { to { transform: rotate(360deg); } }
          @keyframes _brief_pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        `}</style>
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          borderTopColor: "white",
          animation: "_brief_spin 0.8s linear infinite",
        }} />
      </div>

      <div
        className="rounded-2xl px-4 py-3 flex-1"
        style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}` }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center"
            style={{ background: ACCENT_BG, animation: "_brief_pulse 1.4s ease infinite" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: ACCENT }} />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            AI 문서 분석 중
          </span>
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto"
            style={{ background: ACCENT_BG, color: ACCENT }}
          >
            {fileName}
          </span>
        </div>

        {/* 프로그레스 스텝 */}
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: i < step ? UI_GREEN_BG : i === step ? ACCENT_BG : "rgba(0,0,0,0.04)",
                  border: `1px solid ${i < step ? UI_GREEN + "40" : i === step ? ACCENT_BORDER : BORDER}`,
                }}
              >
                {i < step
                  ? <CheckCircle2 className="w-2 h-2" style={{ color: UI_GREEN }} />
                  : i === step
                  ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, animation: "_brief_pulse 1s ease infinite" }} />
                  : <div className="w-1 h-1 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }} />
                }
              </div>
              <span
                className="text-[9px] transition-all"
                style={{
                  color: i < step ? UI_GREEN : i === step ? TEXT_PRIMARY : TEXT_TERTIARY,
                  fontWeight: i === step ? 600 : 400,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}