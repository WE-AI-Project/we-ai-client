import { useState } from "react";
import {
  Bot, ArrowRight, Hash, FolderPlus,
  ChevronRight, X, Play, Plus, Folder, FolderOpen,
  CheckCircle2, Loader2, AlertCircle, CalendarDays,
} from "lucide-react";
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, GRADIENT_PAGE, GRADIENT_LOGO,
  CREAM, CONTENT_BG, BEIGE,
} from "../colors";

// ── OS별 경로 플레이스홀더 ──
const PATH_EXAMPLES = [
  "D:\\WE_AI\\enterprise",
  "C:\\Users\\병권\\projects\\weai",
  "/Users/byungkwon/projects/weai",
  "/home/dev/weai-enterprise",
];

// ── 자동 감지 시뮬레이션 결과 ──
type DetectedInfo = {
  stack:     string[];
  framework: string;
  language:  string;
  build:     string;
};

function detectFromPath(path: string): DetectedInfo {
  // 경로 힌트로 기술 스택 추론 시뮬레이션
  const lower = path.toLowerCase();
  const isJava  = lower.includes("java") || lower.includes("spring") || lower.includes("weai");
  const isNode  = lower.includes("node") || lower.includes("react") || lower.includes("frontend");
  const isPython= lower.includes("python") || lower.includes("py");

  if (isJava || (!isNode && !isPython)) {
    return {
      stack:     ["Java 17", "Spring Boot 3.2.5", "Gradle 8.7", "PostgreSQL 16", "React 18", "TypeScript 5.4"],
      framework: "Spring Boot",
      language:  "Java / TypeScript",
      build:     "Gradle",
    };
  }
  if (isNode) {
    return {
      stack:     ["Node.js 20", "React 18", "TypeScript 5.4", "Vite 5", "Tailwind CSS 4"],
      framework: "React",
      language:  "TypeScript",
      build:     "Vite",
    };
  }
  return {
    stack:     ["Python 3.12", "FastAPI 0.110", "PostgreSQL 16", "Docker", "Redis"],
    framework: "FastAPI",
    language:  "Python",
    build:     "pip / Poetry",
  };
}

// ── 랜덤 8자리 코드 ──
function genCode(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

// ── 경로 입력 필드 ──
function LocalPathInput({
  value, onChange, label = "프로젝트 저장 위치",
}: {
  value: string; onChange: (v: string) => void; label?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
        {label} <span style={{ color: "#B85450" }}>*</span>
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
        style={{
          background: "rgba(65,67,27,0.04)",
          border: `1.5px solid ${focused ? "rgba(65,67,27,0.35)" : BORDER}`,
        }}
      >
        <Folder className="w-4 h-4 shrink-0" style={{ color: value ? ACCENT : TEXT_TERTIARY }} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PATH_EXAMPLES[0]}
          className="flex-1 text-sm outline-none font-mono"
          style={{ background: "transparent", color: TEXT_PRIMARY }}
        />
        {value && (
          <button onClick={() => onChange("")} className="shrink-0">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        )}
      </div>
      <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
        예: {PATH_EXAMPLES[0]} 또는 {PATH_EXAMPLES[2]}
      </p>
    </div>
  );
}

// ── 자동 감지 결과 카드 ──
function DetectResult({ info, path }: { info: DetectedInfo; path: string }) {
  return (
    <div
      className="rounded-xl p-3.5 space-y-2.5"
      style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#5A8A4A" }} />
        <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>프로젝트 감지 완료</p>
        <span className="ml-auto text-[8px] font-mono truncate" style={{ color: TEXT_TERTIARY, maxWidth: 200 }}>{path}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        {[
          { label: "프레임워크", value: info.framework },
          { label: "언어",      value: info.language   },
          { label: "빌드 툴",   value: info.build      },
          { label: "감지 스택", value: `${info.stack.length}개` },
        ].map(r => (
          <div key={r.label}>
            <span style={{ color: TEXT_TERTIARY }}>{r.label}: </span>
            <span className="font-semibold" style={{ color: ACCENT }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {info.stack.map(s => (
          <span key={s} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: ACCENT_BG, color: ACCENT }}>
            {s}
          </span>
        ))}
      </div>
      <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
        💡 팀 구성 및 기술 스택은 <strong>Project Settings</strong>에서 세부 설정 가능합니다.
      </p>
    </div>
  );
}

// ── 새 프로젝트 만들기 모달 ──
function CreateProjectModal({
  onClose, onCreate,
}: {
  onClose:  () => void;
  onCreate: (name: string, code: string, localPath: string) => void;
}) {
  const [step,       setStep]      = useState<1 | 2 | 3>(1);
  const [name,       setName]      = useState("");
  const [desc,       setDesc]      = useState("");
  const [deadline,   setDeadline]  = useState("");
  const [localPath,  setLocalPath] = useState("");
  const [detecting,  setDetecting] = useState(false);
  const [detected,   setDetected]  = useState<DetectedInfo | null>(null);
  const [code]                     = useState(genCode());
  const [creating,   setCreating]  = useState(false);

  const TOTAL_STEPS = 3;

  const handleDetect = () => {
    if (!localPath.trim()) return;
    setDetecting(true);
    setTimeout(() => {
      setDetected(detectFromPath(localPath.trim()));
      setDetecting(false);
    }, 1000);
  };

  const handleCreate = () => {
    if (!name.trim() || !localPath.trim()) return;
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      onCreate(name.trim(), code, localPath.trim());
    }, 900);
  };

  const canNext1 = name.trim().length > 0;
  const canNext2 = localPath.trim().length > 0;

  // 마감일까지 남은 일수 계산
  const deadlineDays = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 480, maxHeight: "92vh", background: "rgba(255,255,255,0.97)", border: `1px solid ${BORDER}`, boxShadow: "0 12px 48px rgba(0,0,0,0.16)" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #e0e7ff, #e8d5f5)" }}>
            <FolderPlus className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>새 프로젝트 만들기</p>
            <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>WE&AI Project Office</p>
          </div>
          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-1.5 mr-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: step === i + 1 ? 18 : 6, height: 6,
                  background: i + 1 <= step ? ACCENT : "rgba(0,0,0,0.12)",
                }}
              />
            ))}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.06]">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Step 1: 프로젝트 기본 정보 ── */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  프로젝트 이름 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: WE&AI Backend Server"
                  className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: "rgba(0,0,0,0.03)", border: `1.5px solid ${name ? "rgba(65,67,27,0.30)" : BORDER}`, color: TEXT_PRIMARY }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>프로젝트 설명</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="프로젝트 목적 및 개요를 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none"
                  style={{ background: "rgba(0,0,0,0.03)", border: `1.5px solid ${BORDER}`, color: TEXT_PRIMARY }}
                />
              </div>

              {/* ── 마감일 ── */}
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    프로젝트 마감일
                    <span className="text-[9px] font-normal" style={{ color: TEXT_TERTIARY }}>(선택)</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                    style={{
                      background: deadline ? "rgba(65,67,27,0.04)" : "rgba(0,0,0,0.03)",
                      border: `1.5px solid ${deadline ? "rgba(65,67,27,0.28)" : BORDER}`,
                      color: deadline ? TEXT_PRIMARY : TEXT_TERTIARY,
                    }}
                  />
                </div>
                {deadline && deadlineDays !== null && (
                  <p className="text-[9px] mt-1.5 flex items-center gap-1" style={{
                    color: deadlineDays < 7 ? "#B85450" : deadlineDays < 30 ? "#C09840" : "#5A8A4A"
                  }}>
                    <CalendarDays className="w-2.5 h-2.5" />
                    {deadlineDays > 0
                      ? `마감까지 ${deadlineDays}일 남음`
                      : deadlineDays === 0
                        ? "오늘이 마감일입니다"
                        : "마감일이 지났습니다"}
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: 저장 경로 + 자동 감지 ── */}
          {step === 2 && (
            <>
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <p className="text-[10px] font-semibold mb-0.5" style={{ color: ACCENT }}>프로젝트 저장 위치 설정</p>
                <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
                  로컬 절대 경로를 입력하면 기술 스택을 자동으로 감지하고, 팀 구성·빌드 설정이 자동으로 적용됩니다.
                </p>
              </div>

              <LocalPathInput
                value={localPath}
                onChange={v => { setLocalPath(v); setDetected(null); }}
              />

              {/* 경로 감지 버튼 */}
              <button
                onClick={handleDetect}
                disabled={!localPath.trim() || detecting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: localPath.trim() && !detecting ? "rgba(65,67,27,0.08)" : "rgba(0,0,0,0.06)",
                  color:      localPath.trim() && !detecting ? ACCENT : TEXT_TERTIARY,
                  border:     `1px solid ${localPath.trim() && !detecting ? ACCENT_BORDER : "transparent"}`,
                }}
              >
                {detecting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 프로젝트 분석 중...</>
                  : <><FolderOpen className="w-3.5 h-3.5" /> 경로 분석 및 기술 스택 감지</>
                }
              </button>

              {/* 감지 결과 */}
              {detected && <DetectResult info={detected} path={localPath} />}

              {/* 감지 전 안내 */}
              {!detected && !detecting && localPath && (
                <div className="flex items-start gap-2 px-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: TEXT_TERTIARY }} />
                  <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    위 버튼을 눌러 경로를 분석하면 기술 스택이 자동으로 감지됩니다. (개발 환경 설치는 별도로 진행)
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: 참여 코드 + 요약 ── */}
          {step === 3 && (
            <>
              {/* 코드 */}
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>참여 코드 (자동 생성)</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}` }}>
                  <Hash className="w-4 h-4 shrink-0" style={{ color: TEXT_TERTIARY }} />
                  <span className="flex-1 text-2xl font-mono font-bold tracking-[0.4em]" style={{ color: ACCENT }}>{code}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: ACCENT_BG, color: ACCENT }}>8자리</span>
                </div>
                <p className="text-[9px] mt-1.5" style={{ color: TEXT_TERTIARY }}>
                  팀원에게 이 코드를 공유하면 프로젝트에 참여할 수 있습니다.
                </p>
              </div>

              {/* 요약 카드 */}
              <div className="rounded-xl p-3.5 space-y-2" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>생성 요약</p>
                {[
                  { label: "프로젝트명",   value: name },
                  { label: "저장 위치",    value: localPath || "—" },
                  { label: "마감일",       value: deadline ? `${deadline}${deadlineDays !== null ? ` (${deadlineDays > 0 ? `${deadlineDays}일 후` : deadlineDays === 0 ? "오늘" : "기간 초과"})` : ""}` : "미설정" },
                  { label: "감지된 스택",  value: detected ? `${detected.stack.length}개 자동 감지됨` : "수동 설정 필요" },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-3 text-[10px]">
                    <span style={{ color: TEXT_TERTIARY, flexShrink: 0 }}>{r.label}</span>
                    <span className="font-semibold text-right font-mono truncate" style={{ color: r.label === "마감일" && deadline && deadlineDays !== null && deadlineDays < 7 ? "#B85450" : TEXT_PRIMARY, maxWidth: 260 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div
                className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
                  프로젝트 생성 후 <strong>Project Settings</strong>에서 팀 구성, 기술 스택 버전, 일정을 추가로 설정할 수 있습니다. 개발 환경(JDK, Node.js 등) 설치는 별도로 진행하세요.
                </p>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 flex gap-2.5 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as any)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>
              이전
            </button>
          )}
          {step === 1 && (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>
              취소
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as any)}
              disabled={step === 1 ? !canNext1 : !canNext2}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: (step === 1 ? canNext1 : canNext2) ? ACCENT : "rgba(0,0,0,0.07)",
                color:      (step === 1 ? canNext1 : canNext2) ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
                boxShadow:  (step === 1 ? canNext1 : canNext2) ? "0 4px 16px rgba(65,67,27,0.28)" : "none",
              }}
            >
              다음 <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: ACCENT, color: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(65,67,27,0.30)" }}
            >
              {creating
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />생성 중...</>
                : <><FolderPlus className="w-3 h-3" />프로젝트 생성</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 기존 프로젝트 시작 모달 ──
const EXISTING_PROJECTS = [
  { id: "weai-backend",    name: "WE&AI Backend Server",   code: "WEAI2025", path: "D:\\WE_AI\\enterprise"         },
  { id: "ma-simulator",    name: "Multi-Agent Simulator",  code: "SIM2B3XX", path: "D:\\WE_AI\\ma-simulator"       },
  { id: "devops-pipeline", name: "DevOps Pipeline",         code: "DEV9XZAB", path: "/home/dev/devops-pipeline"    },
];

function StartModal({ onClose, onSelect }: {
  onClose:  () => void;
  onSelect: (id: string, name: string, localPath: string) => void;
}) {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [localPath,  setLocalPath]  = useState("");
  const [joining,    setJoining]    = useState(false);
  const [detecting,  setDetecting]  = useState(false);
  const [detected,   setDetected]   = useState<DetectedInfo | null>(null);

  const selectedProj = EXISTING_PROJECTS.find(p => p.id === selected);

  const handleSelect = (id: string) => {
    setSelected(id);
    const proj = EXISTING_PROJECTS.find(p => p.id === id);
    if (proj) {
      setLocalPath(proj.path);
      setDetected(null);
      // 자동 감지
      setTimeout(() => {
        setDetecting(true);
        setTimeout(() => {
          setDetected(detectFromPath(proj.path));
          setDetecting(false);
        }, 800);
      }, 100);
    }
  };

  const handleEnter = () => {
    if (!selectedProj) return;
    setJoining(true);
    setTimeout(() => {
      setJoining(false);
      onSelect(selectedProj.id, selectedProj.name, localPath.trim() || selectedProj.path);
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 440, maxHeight: "88vh", background: "rgba(255,255,255,0.97)", border: `1px solid ${BORDER}`, boxShadow: "0 12px 48px rgba(0,0,0,0.16)" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(65,67,27,0.10)" }}>
            <Play className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>프로젝트 시작하기</p>
            <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>참여 중인 프로젝트를 선택하세요</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.06]">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 프로젝트 목록 */}
          <div className="space-y-2">
            {EXISTING_PROJECTS.map(p => {
              const isSel = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: isSel ? "rgba(65,67,27,0.07)" : "rgba(0,0,0,0.03)",
                    border: `1.5px solid ${isSel ? ACCENT_BORDER : BORDER}`,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isSel ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.06)" }}>
                    <Bot className="w-4 h-4" style={{ color: isSel ? ACCENT : TEXT_SECONDARY }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isSel ? ACCENT : TEXT_PRIMARY }}>{p.name}</p>
                    <p className="text-[9px] font-mono mt-0.5 truncate" style={{ color: TEXT_TERTIARY }}>
                      <Folder className="w-2.5 h-2.5 inline mr-1" />{p.path}
                    </p>
                  </div>
                  {isSel && <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT }}><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
                </button>
              );
            })}
          </div>

          {/* 선택된 경우: 경로 수정 + 감지 결과 */}
          {selected && (
            <>
              <LocalPathInput
                value={localPath}
                onChange={v => { setLocalPath(v); setDetected(null); }}
                label="저장 경로 확인/수정"
              />
              {detecting && (
                <div className="flex items-center gap-2 px-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} />
                  <p className="text-[10px]" style={{ color: TEXT_SECONDARY }}>프로젝트 분석 중...</p>
                </div>
              )}
              {detected && !detecting && <DetectResult info={detected} path={localPath} />}
            </>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 flex gap-2.5 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            onClick={handleEnter}
            disabled={!selected || joining}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: selected ? ACCENT : "rgba(0,0,0,0.07)",
              color:      selected ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
              boxShadow:  selected ? "0 4px 16px rgba(65,67,27,0.28)" : "none",
            }}
          >
            {joining ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Loading...</> : <>시작하기 <ArrowRight className="w-3 h-3" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 코드로 참여 ──
const PROJECTS_BY_CODE: Record<string, { id: string; name: string; path: string }> = {
  "WEAI2025": { id: "weai-backend",    name: "WE&AI Backend Server",  path: "D:\\WE_AI\\enterprise"   },
  "SIM2B3XX": { id: "ma-simulator",    name: "Multi-Agent Simulator", path: "D:\\WE_AI\\ma-simulator" },
  "DEV9XZAB": { id: "devops-pipeline", name: "DevOps Pipeline",        path: "/home/dev/devops-pipeline" },
};

// ────────────────────────────────────────────
// 메인 JoinProjectScreen
// ────────────────────────────────────────────
type Props = {
  onJoin: (projectId: string, projectName: string, code?: string, localPath?: string) => void;
};

export function JoinProjectScreen({ onJoin }: Props) {
  const [modal,       setModal]       = useState<"none" | "start" | "create">("none");
  const [codeInput,   setCode]        = useState("");
  const [codeError,   setCodeError]   = useState(false);
  const [codeJoining, setCodeJoining] = useState(false);
  const [codePath,    setCodePath]    = useState("");
  const [codeDetect,  setCodeDetect]  = useState<DetectedInfo | null>(null);
  const [codeStep,    setCodeStep]    = useState<"input" | "path">("input");

  const handleCodeJoin = () => {
    const c = codeInput.trim().toUpperCase();
    const p = PROJECTS_BY_CODE[c];
    if (p) {
      setCodeError(false);
      if (codeStep === "input") {
        setCodePath(p.path);
        setCodeStep("path");
        // 자동 감지
        setTimeout(() => setCodeDetect(detectFromPath(p.path)), 600);
      } else {
        setCodeJoining(true);
        setTimeout(() => {
          setCodeJoining(false);
          onJoin(p.id, p.name, c, codePath || p.path);
        }, 800);
      }
    } else {
      setCodeError(true);
    }
  };

  const handleCreate = (name: string, code: string, localPath: string) => {
    setModal("none");
    onJoin(`proj-${Date.now()}`, name, code, localPath);
  };

  const handleSelect = (id: string, name: string, localPath: string) => {
    setModal("none");
    const proj = EXISTING_PROJECTS.find(p => p.id === id);
    onJoin(id, name, proj?.code, localPath);
  };

  return (
    <>
      {modal === "start"  && <StartModal  onClose={() => setModal("none")} onSelect={handleSelect} />}
      {modal === "create" && <CreateProjectModal onClose={() => setModal("none")} onCreate={handleCreate} />}

      {/* ── 단색 배경 (login과 동일한 #F5F4F1) ── */}
      <div
        className="size-full flex items-center justify-center relative overflow-hidden"
        style={{ background: "#F5F4F1" }}
      >
        {/* 카드 */}
        <div className="relative z-10 flex flex-col items-center gap-7 w-full px-6" style={{ maxWidth: 400 }}>
          {/* 로고 */}
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#41431B", boxShadow: "0 8px 24px rgba(65,67,27,0.25)" }}
            >
              <Bot className="w-7 h-7" style={{ color: "white" }} />
            </div>
            <h1 className="text-xl font-bold mb-1.5" style={{ color: TEXT_PRIMARY }}>Welcome to WE&amp;AI Office</h1>
            <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Intelligent Multi-Agent Project Office</p>
          </div>

          {/* 액션 카드 */}
          <div className="w-full space-y-3">

            {/* 1. 시작하기 */}
            <button
              onClick={() => setModal("start")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left group"
              style={{ background: "#FFFFFF", border: `1px solid rgba(0,0,0,0.07)`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(65,67,27,0.14)"; e.currentTarget.style.border = "1px solid rgba(65,67,27,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; e.currentTarget.style.border = "1px solid rgba(0,0,0,0.07)"; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(65,67,27,0.08)" }}>
                <Play className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>시작하기</p>
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_SECONDARY }}>참여 중인 프로젝트 목록에서 선택</p>
              </div>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: TEXT_TERTIARY }} />
            </button>

            {/* 2. 새 프로젝트 */}
            <button
              onClick={() => setModal("create")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left group"
              style={{ background: "#FFFFFF", border: `1px solid rgba(0,0,0,0.07)`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(65,67,27,0.14)"; e.currentTarget.style.border = "1px solid rgba(65,67,27,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; e.currentTarget.style.border = "1px solid rgba(0,0,0,0.07)"; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(174,183,132,0.15)" }}>
                <Plus className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>새 프로젝트</p>
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_SECONDARY }}>저장 경로 지정 후 자동으로 세팅</p>
              </div>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: TEXT_TERTIARY }} />
            </button>

            {/* 3. 코드로 참여 */}
            <div className="w-full px-5 py-4 rounded-2xl" style={{ background: "#FFFFFF", border: `1px solid rgba(0,0,0,0.07)`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(65,67,27,0.06)" }}>
                  <Hash className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>코드로 참여</p>
                  <p className="text-[11px] mt-0.5" style={{ color: TEXT_SECONDARY }}>8자리 초대 코드로 바로 참여</p>
                </div>
              </div>

              {codeStep === "input" ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    <input
                      value={codeInput}
                      onChange={e => { setCodeError(false); setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); }}
                      onKeyDown={e => e.key === "Enter" && handleCodeJoin()}
                      placeholder="WEAI2025"
                      maxLength={8}
                      className="w-full pl-8 pr-3 py-2.5 text-sm font-mono rounded-xl outline-none uppercase tracking-widest"
                      style={{ background: codeError ? "rgba(184,84,80,0.05)" : "#F4F3F0", border: `1.5px solid ${codeError ? "rgba(184,84,80,0.35)" : "transparent"}`, color: TEXT_PRIMARY }}
                    />
                  </div>
                  <button
                    onClick={handleCodeJoin}
                    disabled={codeInput.length < 6 || codeJoining}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0"
                    style={{
                      background: codeInput.length >= 6 ? "#41431B" : "rgba(0,0,0,0.07)",
                      color:      codeInput.length >= 6 ? "white" : TEXT_TERTIARY,
                    }}
                  >
                    {codeJoining ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <LocalPathInput
                    value={codePath}
                    onChange={v => { setCodePath(v); setCodeDetect(null); }}
                    label="저장 경로 확인"
                  />
                  {codeDetect && <DetectResult info={codeDetect} path={codePath} />}
                  <div className="flex gap-2">
                    <button onClick={() => setCodeStep("input")} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>이전</button>
                    <button
                      onClick={handleCodeJoin}
                      disabled={codeJoining}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "#41431B", color: "white" }}
                    >
                      {codeJoining ? "참여 중..." : "참여하기"}
                    </button>
                  </div>
                </div>
              )}

              {codeError && (
                <p className="text-[10px] mt-2" style={{ color: "#ef4444" }}>
                  존재하지 않는 코드입니다. 다시 확인해주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}