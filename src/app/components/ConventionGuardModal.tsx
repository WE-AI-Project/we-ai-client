import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, X, AlertCircle, AlertTriangle, Info,
  CheckCircle2, ChevronDown, ChevronRight,
  RefreshCw, Zap, BookOpen, SkipForward,
  FileCode2, Bot,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG, UI_AMBER, UI_AMBER_BG, UI_RED_BG,
  GRADIENT_LOGO, OLIVE_DARK,
} from "../colors";

// ─────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────
export type Severity = "error" | "warning" | "info";

export type ConventionRule = {
  id:          string;
  name:        string;
  category:    "naming" | "style" | "typescript" | "java" | "structure";
  description: string;
  severity:    Severity;
  bad:         string;
  good:        string;
};

export type Violation = {
  id:          string;
  ruleId:      string;
  severity:    Severity;
  file:        string;
  ext:         string;
  line:        number;
  code:        string;        // 위반 코드 스니펫
  suggestion:  string;        // 수정 제안 코드
  message:     string;        // AI 설명
  autoFixable: boolean;
};

// ─────────────────────────────────────────────────────────────
// 팀 컨벤션 규칙 데이터베이스
// ─────────────────────────────────────────────────────────────
export const CONVENTION_RULES: ConventionRule[] = [
  // ── Naming ──
  {
    id: "N001", name: "변수명 camelCase", category: "naming", severity: "error",
    description: "변수와 함수 이름은 camelCase를 사용합니다. snake_case는 금지입니다.",
    bad:  "String agent_id = \"AGT-01\";",
    good: "String agentId = \"AGT-01\";",
  },
  {
    id: "N002", name: "상수명 UPPER_SNAKE_CASE", category: "naming", severity: "error",
    description: "상수(final, const)는 대문자 + 언더스코어를 사용합니다.",
    bad:  "final int maxRetry = 3;",
    good: "final int MAX_RETRY = 3;",
  },
  {
    id: "N003", name: "클래스명 PascalCase", category: "naming", severity: "error",
    description: "클래스와 React 컴포넌트 이름은 PascalCase를 사용합니다.",
    bad:  "class agentController { }",
    good: "class AgentController { }",
  },
  {
    id: "N004", name: "boolean 변수 is/has/can 접두사", category: "naming", severity: "warning",
    description: "boolean 타입 변수는 is, has, can으로 시작해야 합니다.",
    bad:  "boolean loading = false;",
    good: "boolean isLoading = false;",
  },
  {
    id: "N005", name: "메서드명 동사로 시작", category: "naming", severity: "warning",
    description: "메서드 이름은 동사로 시작해야 합니다. (get, set, fetch, handle, create...)",
    bad:  "public List<Agent> agents() { }",
    good: "public List<Agent> getAgents() { }",
  },
  // ── TypeScript ──
  {
    id: "T001", name: "any 타입 사용 금지", category: "typescript", severity: "error",
    description: "TypeScript에서 any 타입은 타입 안전성을 해칩니다. 명시적 타입을 사용하세요.",
    bad:  "const data: any = fetchAgents();",
    good: "const data: AgentStatus[] = fetchAgents();",
  },
  {
    id: "T002", name: "var 사용 금지", category: "typescript", severity: "error",
    description: "var 대신 const 또는 let을 사용합니다. var는 블록 스코프를 지원하지 않습니다.",
    bad:  "var agentList = [];",
    good: "const agentList: Agent[] = [];",
  },
  {
    id: "T003", name: "함수 반환 타입 명시", category: "typescript", severity: "warning",
    description: "TypeScript 함수는 반환 타입을 명시해야 합니다.",
    bad:  "function getStatus() { return status; }",
    good: "function getStatus(): AgentStatus { return status; }",
  },
  // ── Java ──
  {
    id: "J001", name: "Java 접근 제어자 명시", category: "java", severity: "warning",
    description: "모든 필드와 메서드에 접근 제어자(public/private/protected)를 명시합니다.",
    bad:  "String agentId;",
    good: "private String agentId;",
  },
  {
    id: "J002", name: "매직 넘버 상수화", category: "java", severity: "warning",
    description: "코드에 직접 쓰인 숫자(매직 넘버)는 상수로 분리해야 합니다.",
    bad:  "if (retryCount > 3) { }",
    good: "if (retryCount > MAX_RETRY_COUNT) { }",
  },
  // ── Style ──
  {
    id: "S001", name: "중첩 삼항 연산자 금지", category: "style", severity: "warning",
    description: "삼항 연산자의 중첩은 가독성을 해칩니다. if-else 또는 변수 분리를 사용하세요.",
    bad:  "const label = a ? b ? 'x' : 'y' : 'z';",
    good: "const label = a ? (b ? 'x' : 'y') : 'z'; // 또는 if-else 사용",
  },
  {
    id: "S002", name: "빈 catch 블록 금지", category: "style", severity: "error",
    description: "빈 catch 블록은 예외를 무시합니다. 최소한 로그를 남겨야 합니다.",
    bad:  "try { ... } catch (Exception e) { }",
    good: "try { ... } catch (Exception e) { log.error(\"Error\", e); }",
  },
];

// ─────────────────────────────────────────────────────────────
// 스테이징 파일별 위반 데이터 생성
// ─────────────────────────────────────────────────────────────
function generateViolations(fileNames: string[]): Violation[] {
  const all: Violation[] = [];
  let idSeq = 1;

  fileNames.forEach(name => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "java") {
      if (/controller/i.test(name)) {
        all.push(
          {
            id: `v${idSeq++}`, ruleId: "N001", severity: "error", file: name, ext,
            line: 18,
            code:       "private List<Agent> agent_list = new ArrayList<>();",
            suggestion: "private List<Agent> agentList = new ArrayList<>();",
            message:    "agent_list는 snake_case입니다. 팀 규칙에 따라 camelCase를 사용해 주세요.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "N001", severity: "error", file: name, ext,
            line: 24,
            code:       "String agent_Id = agent.getId();",
            suggestion: "String agentId = agent.getId();",
            message:    "변수명에 언더스코어(agent_Id)가 포함되어 있습니다. agentId로 수정하세요.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "N002", severity: "error", file: name, ext,
            line: 9,
            code:       "private static final int maxAgentCount = 6;",
            suggestion: "private static final int MAX_AGENT_COUNT = 6;",
            message:    "상수 maxAgentCount는 UPPER_SNAKE_CASE로 작성해야 합니다.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "J001", severity: "warning", file: name, ext,
            line: 32,
            code:       "Map<String, AgentStatus> statusMap;",
            suggestion: "private Map<String, AgentStatus> statusMap;",
            message:    "statusMap 필드에 접근 제어자가 없습니다. private을 명시해 주세요.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "S002", severity: "error", file: name, ext,
            line: 58,
            code:       "} catch (InterruptedException e) {\n    // TODO\n}",
            suggestion: "} catch (InterruptedException e) {\n    log.error(\"Agent interrupted\", e);\n    Thread.currentThread().interrupt();\n}",
            message:    "빈 catch 블록은 예외를 삼킵니다. 최소한 로그를 남겨야 합니다.",
            autoFixable: false,
          },
        );
      } else if (/agent/i.test(name)) {
        all.push(
          {
            id: `v${idSeq++}`, ruleId: "N004", severity: "warning", file: name, ext,
            line: 15,
            code:       "private boolean running = false;",
            suggestion: "private boolean isRunning = false;",
            message:    "boolean 변수 running은 isRunning으로 명명해야 합니다.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "N002", severity: "error", file: name, ext,
            line: 11,
            code:       "private static final int max_retry = 3;",
            suggestion: "private static final int MAX_RETRY = 3;",
            message:    "상수 max_retry가 snake_case이고 소문자입니다. MAX_RETRY로 수정하세요.",
            autoFixable: true,
          },
          {
            id: `v${idSeq++}`, ruleId: "J002", severity: "warning", file: name, ext,
            line: 47,
            code:       "if (fetchResponse.getStatusCode().value() == 200) {",
            suggestion: "if (fetchResponse.getStatusCode().is2xxSuccessful()) {",
            message:    "200이라는 매직 넘버 대신 Spring 제공 is2xxSuccessful()을 사용하세요.",
            autoFixable: false,
          },
          {
            id: `v${idSeq++}`, ruleId: "N005", severity: "warning", file: name, ext,
            line: 29,
            code:       "public AgentStatus status() {",
            suggestion: "public AgentStatus getStatus() {",
            message:    "메서드명 status()는 명사입니다. getStatus()처럼 동사로 시작해야 합니다.",
            autoFixable: true,
          },
        );
      }
    }

    if (ext === "ts" || ext === "tsx") {
      all.push(
        {
          id: `v${idSeq++}`, ruleId: "T001", severity: "error", file: name, ext,
          line: 8,
          code:       "const agentData: any = useAgents();",
          suggestion: "const agentData: AgentStatus[] = useAgents();",
          message:    "any 타입은 TypeScript의 타입 안전성을 무력화합니다. 명시적 타입을 사용하세요.",
          autoFixable: false,
        },
        {
          id: `v${idSeq++}`, ruleId: "N004", severity: "warning", file: name, ext,
          line: 22,
          code:       "const [expanded, setExpanded] = useState(false);",
          suggestion: "const [isExpanded, setIsExpanded] = useState(false);",
          message:    "boolean 상태 expanded는 isExpanded로 명명해야 합니다.",
          autoFixable: true,
        },
        {
          id: `v${idSeq++}`, ruleId: "T003", severity: "warning", file: name, ext,
          line: 35,
          code:       "function fetchAgentStatus(id: string) {",
          suggestion: "function fetchAgentStatus(id: string): Promise<AgentStatus> {",
          message:    "함수 반환 타입이 명시되지 않았습니다. 반환 타입을 추가해 주세요.",
          autoFixable: false,
        },
      );
    }

    if (ext === "gradle") {
      all.push(
        {
          id: `v${idSeq++}`, ruleId: "N002", severity: "info", file: name, ext,
          line: 3,
          code:       "def springVersion = '3.2.0'",
          suggestion: "def SPRING_VERSION = '3.2.0'",
          message:    "Gradle 스크립트의 전역 변수도 팀 상수 명명 규칙(UPPER_SNAKE)을 따르면 더 명확합니다.",
          autoFixable: true,
        },
      );
    }
  });

  return all;
}

// ─────────────────────────────────────────────────────────────
// 작은 서브 컴포넌트
// ─────────────────────────────────────────────────────────────
const SEV_META: Record<Severity, { icon: any; color: string; bg: string; label: string }> = {
  error:   { icon: AlertCircle,   color: "#B85450", bg: UI_RED_BG,    label: "오류"   },
  warning: { icon: AlertTriangle, color: "#C09840", bg: UI_AMBER_BG,  label: "경고"   },
  info:    { icon: Info,          color: "#5A8A4A", bg: UI_GREEN_BG,  label: "정보"   },
};

const CAT_META: Record<string, { label: string; color: string }> = {
  naming:     { label: "명명 규칙",    color: "#5A8A4A" },
  typescript: { label: "TypeScript", color: "#3b82f6" },
  java:       { label: "Java",        color: "#C09840" },
  style:      { label: "코드 스타일", color: "#8b5cf6" },
  structure:  { label: "구조",        color: "#B85450" },
};

// 위반 항목 카드
function ViolationCard({
  v, idx, visible, autoFix,
}: {
  v: Violation; idx: number; visible: boolean; autoFix: (id: string) => void;
}) {
  const [show, setShow]     = useState(false);
  const [open, setOpen]     = useState(false);
  const [fixed, setFixed]   = useState(false);
  const meta = SEV_META[v.severity];
  const SevIcon = meta.icon;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), idx * 75);
    return () => clearTimeout(t);
  }, [visible, idx]);

  const handleFix = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFixed(true);
    autoFix(v.id);
  };

  if (fixed) return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: UI_GREEN_BG, border: `1px solid ${UI_GREEN}25` }}>
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: UI_GREEN }} />
      <span className="text-[10px]" style={{ color: UI_GREEN }}>자동 수정 완료 — {v.file}:{v.line}</span>
    </div>
  );

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border:    `1px solid ${show ? meta.color + "30" : "transparent"}`,
        background: show ? "rgba(255,255,255,0.95)" : "transparent",
        opacity:   show ? 1 : 0,
        transform: show ? "translateX(0)" : "translateX(-8px)",
        transition:"all 0.24s cubic-bezier(0.34,1.2,0.64,1)",
        boxShadow: show ? `0 1px 6px ${meta.color}0e` : "none",
      }}
    >
      {/* 헤더 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <SevIcon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold" style={{ color: TEXT_PRIMARY }}>{CONVENTION_RULES.find(r => r.id === v.ruleId)?.name}</span>
            <span className="text-[7.5px] px-1 py-0.5 rounded font-mono" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}>
              L{v.line}
            </span>
            {v.autoFixable && (
              <span className="text-[7.5px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: UI_GREEN_BG, color: UI_GREEN }}>
                ✦ 자동 수정 가능
              </span>
            )}
          </div>
          <p className="text-[9px] mt-0.5 truncate" style={{ color: TEXT_TERTIARY }}>{v.message}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {v.autoFixable && (
            <button
              onClick={handleFix}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-semibold transition-all"
              style={{ background: UI_GREEN_BG, color: UI_GREEN, border: `1px solid ${UI_GREEN}30` }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.92)"}
              onMouseLeave={e => e.currentTarget.style.filter = ""}
            >
              <Zap className="w-2.5 h-2.5" />Fix
            </button>
          )}
          {open
            ? <ChevronDown  className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
            : <ChevronRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          }
        </div>
      </button>

      {/* 확장 영역: before/after 코드 */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {/* Before */}
            <div className="px-2.5 py-1.5" style={{ background: "rgba(184,84,80,0.06)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold" style={{ color: "#B85450" }}>✗ 위반 코드</span>
                <span className="text-[7.5px] font-mono" style={{ color: TEXT_TERTIARY }}>:{v.line}</span>
              </div>
              <pre className="text-[9.5px] font-mono leading-relaxed" style={{ color: "#B85450", whiteSpace: "pre-wrap" }}>{v.code}</pre>
            </div>
            {/* After */}
            <div className="px-2.5 py-1.5" style={{ background: "rgba(90,138,74,0.06)" }}>
              <p className="text-[8px] font-bold mb-1" style={{ color: UI_GREEN }}>✓ 수정 제안</p>
              <pre className="text-[9.5px] font-mono leading-relaxed" style={{ color: "#5A8A4A", whiteSpace: "pre-wrap" }}>{v.suggestion}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 파일 그룹
function FileViolationGroup({
  file, violations, groupIdx, visible, autoFix,
}: {
  file: string; violations: Violation[]; groupIdx: number; visible: boolean;
  autoFix: (id: string) => void;
}) {
  const [open, setOpen]   = useState(true);
  const [show, setShow]   = useState(false);
  const ext               = file.split(".").pop()?.toLowerCase() ?? "";
  const errorCount        = violations.filter(v => v.severity === "error").length;
  const warnCount         = violations.filter(v => v.severity === "warning").length;
  const infoCount         = violations.filter(v => v.severity === "info").length;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), groupIdx * 120);
    return () => clearTimeout(t);
  }, [visible, groupIdx]);

  const EXT_COLOR: Record<string, string> = {
    java: "#C09840", ts: "#3b82f6", tsx: "#06b6d4", gradle: ACCENT,
    yml: "#5A8A4A", env: "#C09840",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border:    `1px solid ${show ? BORDER : "transparent"}`,
        background: show ? "rgba(250,250,248,0.95)" : "transparent",
        opacity:   show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(10px)",
        transition:"all 0.28s cubic-bezier(0.34,1.2,0.64,1)",
      }}
    >
      {/* 파일 헤더 */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all"
        style={{ background: "rgba(0,0,0,0.025)", borderBottom: open ? `1px solid ${BORDER_SUBTLE}` : "none" }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.045)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.025)"}
      >
        <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ color: EXT_COLOR[ext] ?? TEXT_SECONDARY }} />
        <span className="text-[10px] font-bold flex-1 text-left" style={{ color: TEXT_PRIMARY }}>{file}</span>
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: UI_RED_BG, color: "#B85450" }}>
              ✗ {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: UI_AMBER_BG, color: UI_AMBER }}>
              ⚠ {warnCount}
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: UI_GREEN_BG, color: UI_GREEN }}>
              ℹ {infoCount}
            </span>
          )}
          {open
            ? <ChevronDown  className="w-3.5 h-3.5 ml-1" style={{ color: TEXT_TERTIARY }} />
            : <ChevronRight className="w-3.5 h-3.5 ml-1" style={{ color: TEXT_TERTIARY }} />
          }
        </div>
      </button>

      {/* 위반 목록 */}
      {open && (
        <div className="p-2.5 space-y-1.5">
          {violations.map((v, i) => (
            <ViolationCard key={v.id} v={v} idx={i} visible={show} autoFix={autoFix} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 메인 모달 컴포넌트
// ─────────────────────────────────────────────────────────────
export function ConventionGuardModal({
  stagedFiles,
  userName = "병권",
  onIgnore,
  onFix,
  onClose,
}: {
  stagedFiles:  string[];      // 스테이징된 파일명 배열
  userName?:    string;
  onIgnore:     () => void;    // 무시하고 커밋
  onFix:        () => void;    // 수정 후 재검사
  onClose:      () => void;
}) {
  const [visible,     setVisible]     = useState(false);
  const [scanDone,    setScanDone]    = useState(false);
  const [fixedIds,    setFixedIds]    = useState<Set<string>>(new Set());
  const [activeTab,   setActiveTab]   = useState<"violations" | "rules">("violations");

  // 위반 생성 + 자동 수정 상태
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => {
      setViolations(generateViolations(stagedFiles));
      setScanDone(true);
    }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleAutoFix = (id: string) => {
    setFixedIds(prev => new Set([...prev, id]));
  };
  const handleAutoFixAll = () => {
    const fixable = violations.filter(v => v.autoFixable).map(v => v.id);
    setFixedIds(new Set(fixable));
  };

  const activeViolations = violations.filter(v => !fixedIds.has(v.id));
  const errorCount   = activeViolations.filter(v => v.severity === "error").length;
  const warnCount    = activeViolations.filter(v => v.severity === "warning").length;
  const infoCount    = activeViolations.filter(v => v.severity === "info").length;
  const fixableCount = activeViolations.filter(v => v.autoFixable).length;
  const totalFixed   = fixedIds.size;

  // 파일별 그룹핑
  const byFile = activeViolations.reduce<Record<string, Violation[]>>((acc, v) => {
    if (!acc[v.file]) acc[v.file] = [];
    acc[v.file].push(v);
    return acc;
  }, {});

  const greetingText = errorCount > 0
    ? `${userName} 님, 우리 팀 약속이랑 다른 코드가 발견됐어요! 커밋 전에 확인해 주세요.`
    : `${userName} 님, 오류는 없지만 몇 가지 개선 제안이 있어요. 확인해 볼까요?`;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };
  const handleIgnore = () => {
    setVisible(false);
    setTimeout(onIgnore, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{
        background:     `rgba(12,14,2,${visible ? "0.68" : "0"})`,
        backdropFilter: "blur(10px)",
        transition:     "background 0.28s ease",
      }}
    >
      <style>{`
        @keyframes _cg_scan { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes _cg_blink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes _cg_shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        @keyframes _cg_spin  { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth:   660,
          maxHeight:  "92vh",
          background: "#FAFAF7",
          border:     `1px solid ${errorCount > 0 ? "rgba(184,84,80,0.30)" : BORDER}`,
          boxShadow:  `0 28px 72px rgba(0,0,0,0.28), 0 4px 16px ${errorCount > 0 ? "rgba(184,84,80,0.12)" : "rgba(0,0,0,0.08)"}`,
          transform:  visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          opacity:    visible ? 1 : 0,
          transition: "all 0.32s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* ══ 헤더 ══ */}
        <div
          className="shrink-0 px-5 py-4"
          style={{
            background: errorCount > 0 ? "rgba(184,84,80,0.06)" : "rgba(192,152,64,0.06)",
            borderBottom: `1px solid ${errorCount > 0 ? "rgba(184,84,80,0.14)" : "rgba(192,152,64,0.14)"}`,
          }}
        >
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: errorCount > 0 ? UI_RED_BG : UI_AMBER_BG,
                animation:  !scanDone ? "_cg_blink 1.2s ease infinite" : "none",
              }}
            >
              <ShieldAlert className="w-5 h-5" style={{ color: errorCount > 0 ? "#B85450" : "#C09840" }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>코드 스타일 컨벤션 가드</h2>
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: ACCENT_BG, color: ACCENT }}
                >AI 분석</span>
              </div>

              {/* 스캔 중 프로그레스 */}
              {!scanDone ? (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ border: "2px solid transparent", borderTopColor: ACCENT, animation: "_cg_spin 0.8s linear infinite" }} />
                    <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                      {stagedFiles.length}개 파일 분석 중...
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ background: ACCENT, animation: "_cg_scan 1.4s ease forwards" }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                  <TypedGreeting text={greetingText} delay={100} />
                </p>
              )}
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg shrink-0 hover:bg-black/[0.06] transition-all"
            >
              <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
            </button>
          </div>

          {/* 통계 요약 */}
          {scanDone && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { label: "오류",   n: errorCount, color: "#B85450", bg: UI_RED_BG    },
                { label: "경고",   n: warnCount,  color: "#C09840", bg: UI_AMBER_BG  },
                { label: "정보",   n: infoCount,  color: "#5A8A4A", bg: UI_GREEN_BG  },
                { label: "자동 수정 가능", n: fixableCount, color: ACCENT, bg: ACCENT_BG },
              ].filter(s => s.n > 0).map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.n}</span>
                  <span className="text-[9px]" style={{ color: s.color + "cc" }}>{s.label}</span>
                </div>
              ))}
              {totalFixed > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: UI_GREEN_BG }}>
                  <CheckCircle2 className="w-3 h-3" style={{ color: UI_GREEN }} />
                  <span className="text-[9px] font-semibold" style={{ color: UI_GREEN }}>{totalFixed}개 수정됨</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{stagedFiles.length}개 파일 분석</span>
              </div>
            </div>
          )}
        </div>

        {/* ══ 탭 바 ══ */}
        {scanDone && (
          <div
            className="shrink-0 flex items-center px-5 gap-0"
            style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.98)" }}
          >
            {[
              { id: "violations", label: `위반 목록 (${activeViolations.length})` },
              { id: "rules",      label: "팀 컨벤션 규칙" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all"
                style={{
                  color:            activeTab === tab.id ? ACCENT : TEXT_TERTIARY,
                  borderBottomColor: activeTab === tab.id ? ACCENT : "transparent",
                }}
              >
                {tab.label}
              </button>
            ))}

            {fixableCount > 0 && activeTab === "violations" && (
              <button
                onClick={handleAutoFixAll}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-semibold transition-all"
                style={{ background: UI_GREEN_BG, color: UI_GREEN, border: `1px solid ${UI_GREEN}30` }}
                onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.92)"}
                onMouseLeave={e => e.currentTarget.style.filter = ""}
              >
                <Zap className="w-3 h-3" />
                전체 자동 수정 ({fixableCount}건)
              </button>
            )}
          </div>
        )}

        {/* ══ 스크롤 바디 ══ */}
        <div className="flex-1 overflow-y-auto">
          {!scanDone ? (
            /* 스캔 중 스켈레톤 */
            <div className="p-5 space-y-3">
              {stagedFiles.map((f, i) => (
                <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded" style={{ background: "rgba(0,0,0,0.10)" }} />
                    <div className="h-3 rounded flex-1" style={{ background: "rgba(0,0,0,0.08)", maxWidth: 140 }} />
                    <div className="h-3 rounded w-8" style={{ background: "rgba(0,0,0,0.05)" }} />
                  </div>
                  <div className="space-y-1.5">
                    {[1,2].map(j => (
                      <div key={j} className="h-2 rounded" style={{ background: "rgba(0,0,0,0.06)", width: `${55 + j * 15}%` }} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-center py-2">
                <p className="text-[9px]" style={{ color: TEXT_TERTIARY, animation: "_cg_blink 1.4s ease infinite" }}>
                  컨벤션 규칙 위반 검사 중...
                </p>
              </div>
            </div>
          ) : activeTab === "violations" ? (
            /* 위반 목록 */
            <div className="p-4 space-y-3">
              {Object.keys(byFile).length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: UI_GREEN_BG }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: UI_GREEN }} />
                  </div>
                  <p className="text-[12px] font-semibold" style={{ color: UI_GREEN }}>모든 위반이 수정됐어요!</p>
                  <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>이제 커밋할 준비가 됐습니다 🎉</p>
                </div>
              ) : (
                Object.entries(byFile).map(([file, vs], gi) => (
                  <FileViolationGroup
                    key={file}
                    file={file}
                    violations={vs}
                    groupIdx={gi}
                    visible={scanDone}
                    autoFix={handleAutoFix}
                  />
                ))
              )}
            </div>
          ) : (
            /* 팀 컨벤션 규칙 */
            <div className="p-4 space-y-2">
              {(["naming", "typescript", "java", "style"] as const).map(cat => {
                const rules = CONVENTION_RULES.filter(r => r.category === cat);
                const catMeta = CAT_META[cat];
                return (
                  <div key={cat} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(0,0,0,0.025)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: catMeta.color }} />
                      <p className="text-[10px] font-bold" style={{ color: catMeta.color }}>{catMeta.label}</p>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: `${catMeta.color}15`, color: catMeta.color }}>
                        {rules.length}개 규칙
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: BORDER_SUBTLE }}>
                      {rules.map(rule => {
                        const sev = SEV_META[rule.severity];
                        const SevIcon = sev.icon;
                        return (
                          <div key={rule.id} className="px-4 py-3">
                            <div className="flex items-start gap-2 mb-2">
                              <SevIcon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: sev.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold" style={{ color: TEXT_PRIMARY }}>{rule.name}</span>
                                  <span className="text-[7.5px] font-mono" style={{ color: TEXT_LABEL }}>{rule.id}</span>
                                </div>
                                <p className="text-[9px] mt-0.5 leading-relaxed" style={{ color: TEXT_SECONDARY }}>{rule.description}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "rgba(184,84,80,0.05)", border: `1px solid rgba(184,84,80,0.12)` }}>
                                <p className="text-[7.5px] font-bold mb-0.5" style={{ color: "#B85450" }}>✗ Bad</p>
                                <pre className="text-[8.5px] font-mono" style={{ color: "#B85450", whiteSpace: "pre-wrap" }}>{rule.bad}</pre>
                              </div>
                              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "rgba(90,138,74,0.05)", border: `1px solid rgba(90,138,74,0.12)` }}>
                                <p className="text-[7.5px] font-bold mb-0.5" style={{ color: "#5A8A4A" }}>✓ Good</p>
                                <pre className="text-[8.5px] font-mono" style={{ color: "#5A8A4A", whiteSpace: "pre-wrap" }}>{rule.good}</pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ 푸터 ══ */}
        {scanDone && (
          <div
            className="shrink-0 px-5 py-3.5 flex items-center gap-2.5"
            style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.98)" }}
          >
            {/* AI 메시지 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: GRADIENT_LOGO }}>
                <Bot className="w-3 h-3" style={{ color: "white" }} />
              </div>
              <p className="text-[9px] truncate" style={{ color: TEXT_TERTIARY }}>
                {activeViolations.length === 0
                  ? "모든 위반이 수정됐어요! 깨끗한 코드로 커밋할게요 ✓"
                  : `${errorCount > 0 ? `오류 ${errorCount}건을 수정한 후` : "경고를 확인한 후"} 커밋하는 것을 권장합니다.`
                }
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 무시하고 커밋 */}
              <button
                onClick={handleIgnore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.10)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
              >
                <SkipForward className="w-3.5 h-3.5" />
                무시하고 커밋
              </button>

              {/* 수정 후 재검사 */}
              <button
                onClick={onFix}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(65,67,27,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = ACCENT_BG}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                수정 후 재검사
              </button>

              {/* 오류 없으면 커밋 바로 진행 */}
              {(errorCount === 0 || activeViolations.length === 0) && (
                <button
                  onClick={handleIgnore}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                  style={{
                    background: OLIVE_DARK,
                    color: "rgba(255,255,255,0.93)",
                    boxShadow: "0 2px 8px rgba(65,67,27,0.25)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.12)"}
                  onMouseLeave={e => e.currentTarget.style.filter = ""}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  커밋 계속
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 내부 타이핑 헬퍼 (그리팅용)
function TypedGreeting({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown]     = useState("");
  const [started, setStarted] = useState(false);
  const idx = useRef(0);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started) return;
    idx.current = 0; setShown("");
    const t = setInterval(() => {
      idx.current++;
      setShown(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [started, text]);
  return <>{shown}{shown.length < text.length && started && <span className="animate-pulse">▌</span>}</>;
}