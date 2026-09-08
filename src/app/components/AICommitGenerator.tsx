import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Check, Copy, Wand2, FileCode2, Zap,
} from "lucide-react";
import type { CommitFile } from "./commitData";
import { buildDiffFromCommitFiles, generateCommitMessage } from "../../api/aiApi";
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


/** 커밋 메시지 포맷팅 */
function formatMsg(msg: GeneratedMsg): string {
  const header = msg.scope
    ? `${msg.tag}(${msg.scope}): ${msg.title}`
    : msg.style === "korean"
    ? msg.title
    : `${msg.tag}: ${msg.title}`;

  return msg.body ? `${header}\n\n${msg.body}` : header;
}

function normalizeCommitCandidates(response: Awaited<ReturnType<typeof generateCommitMessage>>): GeneratedMsg[] {
  const candidates = response.candidates?.length
    ? response.candidates
    : [{ message: response.message ?? response.commitMessage ?? response.commit_msg }];

  return candidates
    .map((candidate, index): GeneratedMsg | null => {
      const rawMessage = candidate.message ?? candidate.commitMessage ?? candidate.commit_msg ?? candidate.title ?? "";
      if (!rawMessage.trim()) return null;

      const [header, ...bodyLines] = rawMessage.trim().split(/\r?\n/);
      const match = header.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
      const tag = candidate.type ?? match?.[1] ?? "feat";
      const scope = candidate.scope ?? match?.[2] ?? "";
      const title = candidate.title ?? match?.[3] ?? header;

      return {
        id: String(index + 1),
        tag,
        scope,
        title,
        body: candidate.body ?? bodyLines.join("\n").trim(),
        style: index === 0 ? "conventional" : "short",
        tagColor: TAG_COLORS[tag] ?? ACCENT,
      };
    })
    .filter((message): message is GeneratedMsg => message !== null);
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
  projectId = 0,
  stagedFiles,
  onApply,
}: {
  projectId?: number | null;
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

  // 로딩 점 애니메이션
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 380);
    return () => clearInterval(t);
  }, [loading]);

  const runGenerateFromApi = async () => {
    if (loading) return;
    setLoading(true);
    setMessages([]);
    setApplied(null);
    setRevealed(new Set());

    try {
      const generated = normalizeCommitCandidates(await generateCommitMessage({
        projectId,
        files: stagedFiles.map((file) => file.path),
        diff: buildDiffFromCommitFiles(stagedFiles),
      }));

      setMessages(generated);
      generated.forEach((m, i) => {
        setTimeout(() => {
          setRevealed(prev => new Set([...prev, m.id]));
        }, i * 200);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "커밋 메시지 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      if (messages.length === 0 && stagedFiles.length > 0) {
        setTimeout(() => void runGenerateFromApi(), 80);
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
                onClick={() => void runGenerateFromApi()}
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
                onClick={() => void runGenerateFromApi()}
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
