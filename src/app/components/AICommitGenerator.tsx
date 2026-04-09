import { useState, useEffect, useRef } from "react";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Check, Copy, Wand2, FileCode2, Zap,
} from "lucide-react";
import type { CommitFile } from "./commitData";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG,
  GRADIENT_LOGO,
} from "../colors";

// ─────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────
type GeneratedMsg = {
  id:    string;
  tag:   string;       // feat / fix / refactor / chore / docs
  scope: string;       // 스코프 (optional)
  title: string;       // 한 줄 제목
  body:  string;       // 상세 설명 (optional)
  style: "conventional" | "short" | "korean";
  tagColor: string;
};

// ─────────────────────────────────────────────────────────────
// AI 분석 엔진 (완전 클라이언트사이드 + 결정론적)
// ─────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  feat:     "#5A8A4A",
  fix:      "#B85450",
  refactor: "#C09840",
  chore:    "#6B7A50",
  docs:     "#7A8B5A",
  perf:     "#B87850",
  test:     "#888A62",
  style:    "#AEB784",
};

function classifyFiles(files: CommitFile[]) {
  const java    = files.filter(f => f.ext === "java");
  const config  = files.filter(f => ["yml", "gradle", "env"].includes(f.ext));
  const front   = files.filter(f => ["tsx", "ts", "css"].includes(f.ext));
  const added   = files.filter(f => f.status === "added");
  const deleted = files.filter(f => f.status === "deleted");
  const modified= files.filter(f => f.status === "modified");

  const totalAdd = files.reduce((s, f) => s + f.additions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);

  return { java, config, front, added, deleted, modified, totalAdd, totalDel };
}

/** 파일명에서 의미 있는 컨텍스트 추출 */
function extractContext(files: CommitFile[]) {
  const names = files.map(f => f.name.replace(/\.[^.]+$/, ""));

  const agents       = names.filter(n => /agent|Agent/i.test(n));
  const controllers  = names.filter(n => /controller|Controller/i.test(n));
  const services     = names.filter(n => /service|Service/i.test(n));
  const hooks        = names.filter(n => /use[A-Z]/.test(n));
  const configs      = names.filter(n => /settings|gradle|yml|env|config/i.test(n));

  return { agents, controllers, services, hooks, configs, names };
}

/** diff 내용에서 키워드 분석 */
function analyzeDiff(files: CommitFile[]) {
  const allContent = files.flatMap(f => f.diff.map(d => d.content)).join(" ");

  const hasSpringAI   = /spring.ai|SpringAI/i.test(allContent);
  const hasConcurrent = /ConcurrentHashMap|concurrent/i.test(allContent);
  const hasScheduler  = /Scheduler|scheduler/i.test(allContent);
  const hasAutowired  = /@Autowired|@Component/i.test(allContent);
  const hasActuator   = /actuator/i.test(allContent);
  const hasRestTemplate = /RestTemplate/i.test(allContent);
  const hasMotion     = /motion|animation/i.test(allContent);
  const hasPolling    = /polling|setInterval|pollingRef/i.test(allContent);
  const hasJDK        = /JavaLanguageVersion|toolchain|sourceCompatibility/i.test(allContent);

  return {
    hasSpringAI, hasConcurrent, hasScheduler, hasAutowired, hasActuator,
    hasRestTemplate, hasMotion, hasPolling, hasJDK,
  };
}

function generateMessages(files: CommitFile[]): GeneratedMsg[] {
  if (files.length === 0) return [];

  const cls = classifyFiles(files);
  const ctx = extractContext(files);
  const diff = analyzeDiff(files);

  const msgs: GeneratedMsg[] = [];

  // ──── 1. Conventional (영문 + 스코프) ────
  let tag1    = "feat";
  let scope1  = "";
  let title1  = "";
  let body1   = "";

  // 스코프 결정
  if (cls.java.length > 0 && cls.front.length === 0)       scope1 = "backend";
  else if (cls.front.length > 0 && cls.java.length === 0)  scope1 = "frontend";
  else if (cls.config.length > 0 && cls.java.length === 0) scope1 = "config";

  // 태그 + 제목 결정
  if (diff.hasJDK) {
    tag1   = "chore"; scope1 = "build";
    title1 = "migrate Java toolchain to JDK 17 languageVersion API";
    body1  = "Replace deprecated sourceCompatibility with toolchain.languageVersion for Gradle 8.x compatibility.";
  } else if (ctx.agents.length >= 1 && cls.added.length >= 1) {
    tag1   = "feat"; scope1 = scope1 || "agent";
    const agentName = ctx.agents[0].replace(/Agent$/i, "").trim();
    title1 = `add ${agentName} agent with REST data sync`;
    body1  = `Introduce ${ctx.agents[0]} implementing the Agent interface.\nUses RestTemplate for endpoint polling and structured status reporting.`;
  } else if (ctx.controllers.length >= 1 && diff.hasConcurrent) {
    tag1   = "refactor"; scope1 = scope1 || "controller";
    title1 = "replace ArrayList with ConcurrentHashMap in AgentRegistry";
    body1  = "Thread-safe agent storage with DI-based AgentScheduler integration.\nSorted status responses via Comparator.comparing.";
  } else if (diff.hasMotion && ctx.hooks.length === 0) {
    tag1   = "feat"; scope1 = "ui";
    title1 = `add motion animation to ${cls.front[0]?.name ?? "component"}`;
    body1  = "Wrap component with motion.div for layout animation.\nExpanded state toggled on click with useCallback memoization.";
  } else if (diff.hasPolling && ctx.hooks.length >= 1) {
    tag1   = "feat"; scope1 = "hooks";
    title1 = `add ${ctx.hooks[0]} real-time polling hook`;
    body1  = "3-second interval polling with automatic cleanup on unmount.\nTyped AgentStatus union type for state safety.";
  } else if (cls.deleted.length >= 1 && cls.added.length === 0) {
    tag1   = "chore";
    title1 = `remove deprecated ${cls.deleted.map(f => f.name).join(", ")}`;
    body1  = "Clean up legacy files no longer referenced in the codebase.";
  } else if (cls.config.length >= cls.java.length && cls.config.length > 0) {
    tag1   = "chore"; scope1 = "config";
    const configName = ctx.configs[0] || cls.config[0]?.name || "settings";
    title1 = `update ${configName} for dev environment`;
    body1  = diff.hasActuator
      ? "Enable Spring Actuator and bump jackson-databind version."
      : `Adjust datasource URL and add weai agent thread/retry configuration.`;
  } else {
    tag1   = cls.modified.length > cls.added.length ? "refactor" : "feat";
    title1 = `update ${files.slice(0, 2).map(f => f.name).join(" and ")}`;
    body1  = `${cls.totalAdd} additions, ${cls.totalDel} deletions across ${files.length} file${files.length > 1 ? "s" : ""}.`;
  }

  msgs.push({
    id: "1", tag: tag1, scope: scope1, title: title1, body: body1,
    style: "conventional", tagColor: TAG_COLORS[tag1] ?? ACCENT,
  });

  // ──── 2. Short (한 줄, 간결) ────
  let tag2 = "feat", title2 = "", scope2 = "";

  if (diff.hasJDK) {
    tag2 = "chore"; scope2 = "build"; title2 = "update Java toolchain to JDK 17";
  } else if (ctx.agents.length >= 1 && cls.added.length >= 1) {
    tag2 = "feat"; scope2 = "agent";
    title2 = `add ${ctx.agents[0]}`;
  } else if (ctx.controllers.length >= 1 && diff.hasConcurrent) {
    tag2 = "refactor"; scope2 = "controller";
    title2 = "use ConcurrentHashMap for thread-safe agent registry";
  } else if (diff.hasPolling) {
    tag2 = "feat"; scope2 = "hooks";
    title2 = `add ${ctx.hooks[0] ?? "polling"} hook`;
  } else if (diff.hasMotion) {
    tag2 = "feat"; scope2 = "ui";
    title2 = "add animation to agent card";
  } else if (cls.deleted.length >= 1) {
    tag2 = "chore"; title2 = `remove ${cls.deleted[0].name}`;
  } else {
    tag2 = cls.added.length > 0 ? "feat" : "refactor";
    title2 = `${tag2 === "feat" ? "add" : "update"} ${files[0].name}`;
  }

  msgs.push({
    id: "2", tag: tag2, scope: scope2, title: title2, body: "",
    style: "short", tagColor: TAG_COLORS[tag2] ?? ACCENT,
  });

  // ──── 3. Korean (한국어 설명형) ────
  let title3 = "", body3 = "";

  if (diff.hasJDK) {
    title3 = "빌드 환경 Java 툴체인 JDK 17로 마이그레이션";
    body3  = "Gradle 8.x 호환을 위해 sourceCompatibility 방식을 JavaLanguageVersion API로 전환";
  } else if (ctx.agents.length >= 1 && cls.added.length >= 1) {
    title3 = `${ctx.agents[0]} 에이전트 신규 구현`;
    body3  = `Agent 인터페이스 구현 — RestTemplate 기반 데이터 동기화 및 상태 보고 포함`;
  } else if (ctx.controllers.length >= 1 && diff.hasConcurrent) {
    title3 = "멀티에이전트 레지스트리 스레드 안전성 개선";
    body3  = "ArrayList → ConcurrentHashMap 교체, AgentScheduler 의존성 주입 방식으로 리팩터링";
  } else if (diff.hasPolling && ctx.hooks.length >= 1) {
    title3 = `${ctx.hooks[0]} 실시간 폴링 훅 추가`;
    body3  = "3초 주기 자동 갱신, 언마운트 시 인터벌 정리 처리";
  } else if (diff.hasMotion) {
    title3 = "에이전트 카드에 모션 애니메이션 적용";
    body3  = "motion.div 레이아웃 애니메이션 + 클릭 시 확장 토글";
  } else if (cls.deleted.length >= 1) {
    title3 = `레거시 ${cls.deleted.map(f => f.name).join(", ")} 제거`;
    body3  = "더 이상 사용하지 않는 파일 정리";
  } else if (cls.config.length > 0) {
    title3 = "개발 환경 설정 업데이트";
    body3  = diff.hasActuator
      ? "Spring Actuator 활성화, jackson-databind 버전 업그레이드"
      : "데이터소스 URL 수정, 에이전트 스레드·재시도 설정 추가";
  } else {
    title3 = `${files.slice(0, 2).map(f => f.name).join(", ")} 수정`;
    body3  = `총 +${cls.totalAdd} −${cls.totalDel} 변경 (${files.length}개 파일)`;
  }

  msgs.push({
    id: "3", tag: "feat", scope: "", title: title3, body: body3,
    style: "korean", tagColor: ACCENT,
  });

  return msgs;
}

/** 커밋 메시지 포맷팅 */
function formatMsg(msg: GeneratedMsg): string {
  const header = msg.scope
    ? `${msg.tag}(${msg.scope}): ${msg.title}`
    : msg.style === "korean"
    ? msg.title
    : `${msg.tag}: ${msg.title}`;

  return msg.body ? `${header}\n\n${msg.body}` : header;
}

// ─────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────────────────────
function TagBadge({ tag, color }: { tag: string; color: string }) {
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 font-mono"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {tag}
    </span>
  );
}

function StyleLabel({ style }: { style: GeneratedMsg["style"] }) {
  const map = {
    conventional: { label: "Conventional", color: "#6B7A50" },
    short:        { label: "Short",         color: "#888A62" },
    korean:       { label: "한국어",          color: "#7A8B5A" },
  };
  const m = map[style];
  return (
    <span className="text-[8px] font-semibold" style={{ color: m.color }}>
      {m.label}
    </span>
  );
}

/** 타이핑 효과 텍스트 */
function TypedText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const t = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);

  return <>{displayed}</>;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export function AICommitGenerator({
  stagedFiles,
  onApply,
}: {
  stagedFiles:  CommitFile[];
  onApply:      (msg: string) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [messages,   setMessages]   = useState<GeneratedMsg[]>([]);
  const [applied,    setApplied]    = useState<string | null>(null);
  const [copied,     setCopied]     = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [revealed,   setRevealed]   = useState<Set<string>>(new Set());
  const [dotCount,   setDotCount]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로딩 점 애니메이션
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 380);
    return () => clearInterval(t);
  }, [loading]);

  const runGenerate = () => {
    if (loading) return;
    setLoading(true);
    setMessages([]);
    setApplied(null);
    setRevealed(new Set());

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const generated = generateMessages(stagedFiles);
      setMessages(generated);
      setLoading(false);

      // 순차적으로 카드 드러내기
      generated.forEach((m, i) => {
        setTimeout(() => {
          setRevealed(prev => new Set([...prev, m.id]));
        }, i * 200);
      });
    }, 1400 + Math.random() * 400);
  };

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      if (messages.length === 0 && stagedFiles.length > 0) {
        setTimeout(runGenerate, 80);
      }
    } else {
      setOpen(false);
    }
  };

  const handleApply = (msg: GeneratedMsg) => {
    const formatted = formatMsg(msg);
    onApply(formatted);
    setApplied(msg.id);
    setTimeout(() => setApplied(null), 2200);
  };

  const handleCopy = (msg: GeneratedMsg) => {
    navigator.clipboard.writeText(formatMsg(msg)).catch(() => {});
    setCopied(msg.id);
    setTimeout(() => setCopied(null), 1800);
  };

  const dots = ".".repeat(dotCount);

  const canGenerate = stagedFiles.length > 0;

  return (
    <div>
      {/* ── 트리거 버튼 ── */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handleOpen}
          disabled={!canGenerate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
          style={{
            background: open
              ? "rgba(65,67,27,0.12)"
              : canGenerate
              ? ACCENT_BG
              : "rgba(0,0,0,0.04)",
            border: `1px solid ${open ? ACCENT_BORDER : canGenerate ? ACCENT_BORDER : "transparent"}`,
            color:  canGenerate ? ACCENT : TEXT_TERTIARY,
            cursor: canGenerate ? "pointer" : "not-allowed",
          }}
          onMouseEnter={e => {
            if (canGenerate && !open)
              e.currentTarget.style.background = "rgba(65,67,27,0.10)";
          }}
          onMouseLeave={e => {
            if (canGenerate && !open)
              e.currentTarget.style.background = ACCENT_BG;
          }}
        >
          <Sparkles className="w-3 h-3" />
          AI 커밋 메시지 생성
          {open
            ? <ChevronUp   className="w-3 h-3 opacity-60" />
            : <ChevronDown className="w-3 h-3 opacity-60" />}
        </button>

        {!canGenerate && (
          <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
            스테이징된 파일이 없습니다
          </span>
        )}
      </div>

      {/* ── 드롭다운 패널 ── */}
      {open && (
        <div
          className="mb-2.5 rounded-2xl overflow-hidden"
          style={{
            border: `1px solid ${BORDER}`,
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
          }}
        >
          {/* 헤더 */}
          <div
            className="flex items-center px-3 py-2.5"
            style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: ACCENT_BG }}
          >
            {/* 아이콘 */}
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center mr-2 shrink-0"
              style={{ background: GRADIENT_LOGO }}
            >
              <Wand2 className="w-3 h-3" style={{ color: "rgba(255,255,255,0.90)" }} />
            </div>
            <span className="text-[10px] font-bold flex-1" style={{ color: TEXT_PRIMARY }}>
              AI 커밋 메시지 생성기
            </span>

            {/* 파일 요약 */}
            <span className="text-[9px] mr-2" style={{ color: TEXT_TERTIARY }}>
              {stagedFiles.length}개 파일 분석
            </span>

            {/* 재생성 버튼 */}
            {!loading && messages.length > 0 && (
              <button
                onClick={runGenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all"
                style={{
                  background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY,
                  border: `1px solid ${BORDER}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.09)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              >
                <RefreshCw className="w-2.5 h-2.5" />
                재생성
              </button>
            )}
          </div>

          {/* 분석 중 */}
          {loading && (
            <div className="px-4 py-5 flex flex-col items-center gap-3">
              {/* 스피너 */}
              <div className="relative w-10 h-10">
                <style>{`
                  @keyframes _ai-spin { to { transform: rotate(360deg); } }
                  @keyframes _ai-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
                `}</style>
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(65,67,27,0.08)",
                  borderTopColor: "#AEB784",
                  animation: "_ai-spin 0.9s linear infinite",
                }} />
                <div
                  className="absolute inset-2.5 rounded-full flex items-center justify-center"
                  style={{ background: GRADIENT_LOGO, animation: "_ai-pulse 1.2s ease infinite" }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: "rgba(255,255,255,0.9)" }} />
                </div>
              </div>

              <div className="text-center">
                <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                  변경 사항 분석 중{dots}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  {stagedFiles.length}개 파일 · diff 패턴 파악 중
                </p>
              </div>

              {/* 파일 칩 */}
              <div className="flex flex-wrap gap-1 justify-center">
                {stagedFiles.slice(0, 4).map(f => (
                  <span
                    key={f.id}
                    className="text-[8px] px-1.5 py-0.5 rounded-md font-mono"
                    style={{
                      background: "rgba(65,67,27,0.06)",
                      color: TEXT_TERTIARY,
                      border: `1px solid ${BORDER_SUBTLE}`,
                    }}
                  >
                    {f.name}
                  </span>
                ))}
                {stagedFiles.length > 4 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-md" style={{ color: TEXT_LABEL }}>
                    +{stagedFiles.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 생성된 메시지 카드들 */}
          {!loading && messages.length > 0 && (
            <div className="divide-y" style={{ borderColor: BORDER_SUBTLE }}>
              {messages.map((msg) => {
                const isApplied  = applied === msg.id;
                const isCopied   = copied  === msg.id;
                const isExpanded = expanded === msg.id;
                const isVisible  = revealed.has(msg.id);
                const formatted  = formatMsg(msg);

                return (
                  <div
                    key={msg.id}
                    style={{
                      opacity:   isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(6px)",
                      transition: "opacity 0.22s ease, transform 0.22s ease",
                      borderBottom: `1px solid ${BORDER_SUBTLE}`,
                    }}
                  >
                    <div className="px-3 py-2.5">
                      {/* 상단: 스타일 레이블 + 태그 */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StyleLabel style={msg.style} />
                        <span className="text-[8px]" style={{ color: BORDER }}>·</span>
                        <TagBadge tag={msg.tag} color={msg.tagColor} />
                        {msg.scope && (
                          <span
                            className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(0,0,0,0.04)", color: TEXT_TERTIARY }}
                          >
                            ({msg.scope})
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          {/* 복사 */}
                          <button
                            onClick={() => handleCopy(msg)}
                            className="p-1 rounded-md transition-all hover:bg-black/[0.06]"
                            title="클립보드 복사"
                          >
                            {isCopied
                              ? <Check className="w-3 h-3" style={{ color: UI_GREEN }} />
                              : <Copy className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                            }
                          </button>

                          {/* 본문 토글 */}
                          {msg.body && (
                            <button
                              onClick={() => setExpanded(p => p === msg.id ? null : msg.id)}
                              className="p-1 rounded-md transition-all hover:bg-black/[0.06]"
                              title="상세 보기"
                            >
                              {isExpanded
                                ? <ChevronUp   className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                                : <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                              }
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 제목 — 타이핑 효과 */}
                      <p
                        className="text-[11px] font-semibold font-mono leading-snug mb-2"
                        style={{ color: TEXT_PRIMARY }}
                      >
                        {msg.scope
                          ? <><span style={{ color: msg.tagColor }}>{msg.tag}</span>
                              <span style={{ color: TEXT_TERTIARY }}>({msg.scope})</span>
                              <span style={{ color: TEXT_SECONDARY }}>: </span>
                              <TypedText text={msg.title} speed={14} />
                            </>
                          : msg.style === "korean"
                          ? <TypedText text={msg.title} speed={14} />
                          : <><span style={{ color: msg.tagColor }}>{msg.tag}</span>
                              <span style={{ color: TEXT_SECONDARY }}>: </span>
                              <TypedText text={msg.title} speed={14} />
                            </>
                        }
                      </p>

                      {/* 본문 (확장 시) */}
                      {isExpanded && msg.body && (
                        <div
                          className="px-2.5 py-2 rounded-xl mb-2 text-[9px] leading-relaxed font-mono whitespace-pre-line"
                          style={{
                            background: "rgba(0,0,0,0.03)",
                            color: TEXT_SECONDARY,
                            border: `1px solid ${BORDER_SUBTLE}`,
                          }}
                        >
                          {msg.body}
                        </div>
                      )}

                      {/* 적용 버튼 */}
                      <button
                        onClick={() => handleApply(msg)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                        style={{
                          background: isApplied
                            ? UI_GREEN_BG
                            : "rgba(65,67,27,0.08)",
                          color:  isApplied ? UI_GREEN : ACCENT,
                          border: `1px solid ${isApplied ? `${UI_GREEN}30` : ACCENT_BORDER}`,
                        }}
                        onMouseEnter={e => {
                          if (!isApplied)
                            e.currentTarget.style.background = "rgba(65,67,27,0.13)";
                        }}
                        onMouseLeave={e => {
                          if (!isApplied)
                            e.currentTarget.style.background = "rgba(65,67,27,0.08)";
                        }}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3 h-3" />
                            적용됨
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" />
                            이 메시지 사용
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && messages.length === 0 && stagedFiles.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-6">
              <FileCode2 className="w-6 h-6" style={{ color: TEXT_TERTIARY }} />
              <button
                onClick={runGenerate}
                className="px-3 py-1.5 rounded-xl text-[10px] font-semibold"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                메시지 생성 시작
              </button>
            </div>
          )}

          {/* 푸터 안내 */}
          {!loading && messages.length > 0 && (
            <div
              className="px-3 py-2 flex items-center gap-1.5"
              style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.01)" }}
            >
              <Sparkles className="w-2.5 h-2.5 shrink-0" style={{ color: TEXT_LABEL }} />
              <p className="text-[8.5px]" style={{ color: TEXT_LABEL }}>
                변경 파일의 이름·확장자·diff 패턴을 분석해 생성합니다 — 직접 수정도 가능합니다
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
