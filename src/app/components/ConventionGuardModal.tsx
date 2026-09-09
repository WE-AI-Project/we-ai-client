import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, X, AlertCircle, AlertTriangle, Info,
  CheckCircle2, ChevronDown, ChevronRight,
  RefreshCw, BookOpen, SkipForward,
  FileCode2, Bot,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  UI_GREEN, UI_GREEN_BG, UI_AMBER, UI_AMBER_BG, UI_RED_BG,
  GRADIENT_LOGO, OLIVE_DARK,
} from "../colors";
import { fetchProjectChangedFileDiff } from "../lib/api";

// ─────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────
export type Severity = "error" | "warning" | "info";

export type ConventionRule = {
  id:           string;
  name:         string;
  category:     "naming" | "style" | "typescript" | "java" | "structure";
  description:  string;
  severity:     Severity;
  bad:          string;
  good:         string;
  // 이 규칙이 실제 정적 분석(정규식 기반)으로 자동 감지되는지 여부.
  // false인 규칙은 "팀 컨벤션 규칙" 탭에 참고용으로만 표시되고, 위반 목록에는 나타나지 않는다.
  autoDetected: boolean;
};

export type Violation = {
  id:         string;
  ruleId:     string;
  severity:   Severity;
  file:       string;
  ext:        string;
  line:       number;
  code:       string;   // 실제 diff에서 추출한 위반 코드 라인
  suggestion: string;   // 규칙 기반 자동 치환 제안
  message:    string;
};

// ─────────────────────────────────────────────────────────────
// 팀 컨벤션 규칙 데이터베이스
// ─────────────────────────────────────────────────────────────
export const CONVENTION_RULES: ConventionRule[] = [
  // ── Naming ──
  {
    id: "N001", name: "변수명 camelCase", category: "naming", severity: "error", autoDetected: true,
    description: "변수와 함수 이름은 camelCase를 사용합니다. snake_case는 금지입니다.",
    bad:  "String agent_id = \"AGT-01\";",
    good: "String agentId = \"AGT-01\";",
  },
  {
    id: "N002", name: "상수명 UPPER_SNAKE_CASE", category: "naming", severity: "error", autoDetected: true,
    description: "상수(final, const)는 대문자 + 언더스코어를 사용합니다.",
    bad:  "final int maxRetry = 3;",
    good: "final int MAX_RETRY = 3;",
  },
  {
    id: "N003", name: "클래스명 PascalCase", category: "naming", severity: "error", autoDetected: true,
    description: "클래스와 React 컴포넌트 이름은 PascalCase를 사용합니다.",
    bad:  "class agentController { }",
    good: "class AgentController { }",
  },
  {
    id: "N004", name: "boolean 변수 is/has/can 접두사", category: "naming", severity: "warning", autoDetected: true,
    description: "boolean 타입 변수는 is, has, can으로 시작해야 합니다.",
    bad:  "boolean loading = false;",
    good: "boolean isLoading = false;",
  },
  {
    id: "N005", name: "메서드명 동사로 시작", category: "naming", severity: "warning", autoDetected: false,
    description: "메서드 이름은 동사로 시작해야 합니다. (get, set, fetch, handle, create...)",
    bad:  "public List<Agent> agents() { }",
    good: "public List<Agent> getAgents() { }",
  },
  // ── TypeScript ──
  {
    id: "T001", name: "any 타입 사용 금지", category: "typescript", severity: "error", autoDetected: true,
    description: "TypeScript에서 any 타입은 타입 안전성을 해칩니다. 명시적 타입을 사용하세요.",
    bad:  "const data: any = fetchAgents();",
    good: "const data: AgentStatus[] = fetchAgents();",
  },
  {
    id: "T002", name: "var 사용 금지", category: "typescript", severity: "error", autoDetected: true,
    description: "var 대신 const 또는 let을 사용합니다. var는 블록 스코프를 지원하지 않습니다.",
    bad:  "var agentList = [];",
    good: "const agentList: Agent[] = [];",
  },
  {
    id: "T003", name: "함수 반환 타입 명시", category: "typescript", severity: "warning", autoDetected: false,
    description: "TypeScript 함수는 반환 타입을 명시해야 합니다.",
    bad:  "function getStatus() { return status; }",
    good: "function getStatus(): AgentStatus { return status; }",
  },
  // ── Java ──
  {
    id: "J001", name: "Java 접근 제어자 명시", category: "java", severity: "warning", autoDetected: false,
    description: "모든 필드와 메서드에 접근 제어자(public/private/protected)를 명시합니다.",
    bad:  "String agentId;",
    good: "private String agentId;",
  },
  {
    id: "J002", name: "매직 넘버 상수화", category: "java", severity: "warning", autoDetected: false,
    description: "코드에 직접 쓰인 숫자(매직 넘버)는 상수로 분리해야 합니다.",
    bad:  "if (retryCount > 3) { }",
    good: "if (retryCount > MAX_RETRY_COUNT) { }",
  },
  // ── Style ──
  {
    id: "S001", name: "중첩 삼항 연산자 금지", category: "style", severity: "warning", autoDetected: true,
    description: "삼항 연산자의 중첩은 가독성을 해칩니다. if-else 또는 변수 분리를 사용하세요.",
    bad:  "const label = a ? b ? 'x' : 'y' : 'z';",
    good: "const label = a ? (b ? 'x' : 'y') : 'z'; // 또는 if-else 사용",
  },
  {
    id: "S002", name: "빈 catch 블록 금지", category: "style", severity: "error", autoDetected: true,
    description: "빈 catch 블록은 예외를 무시합니다. 최소한 로그를 남겨야 합니다.",
    bad:  "try { ... } catch (Exception e) { }",
    good: "try { ... } catch (Exception e) { log.error(\"Error\", e); }",
  },
];

// ─────────────────────────────────────────────────────────────
// 실제 정적 분석 — 스테이징된 파일의 real diff를 가져와 추가된(+) 라인만
// CONVENTION_RULES(autoDetected=true) 정규식으로 검사한다. 파일명이나
// 확장자만 보고 결과를 지어내지 않고, 실제 코드 내용을 검사한다.
// ─────────────────────────────────────────────────────────────

type AddedLine = { lineNumber: number; content: string };

/** unified diff 텍스트에서 추가된(+) 라인만, 새 파일 기준 실제 줄 번호와 함께 추출 */
function parseAddedLines(diffContent: string): AddedLine[] {
  const result: AddedLine[] = [];
  let newLine = 0;
  for (const raw of diffContent.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      continue;
    }
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (raw.startsWith("+")) {
      result.push({ lineNumber: newLine, content: raw.slice(1) });
      newLine++;
    } else if (!raw.startsWith("-")) {
      newLine++;
    }
  }
  return result;
}

function toCamelCase(name: string): string {
  return name.replace(/_([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}
function toUpperSnake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}
function toPascalCase(name: string): string {
  return name.length === 0 ? name : name.charAt(0).toUpperCase() + name.slice(1);
}

const BOOL_PREFIXES = ["is", "has", "can", "should", "will"];

type RuleHit = { ruleId: string; severity: Severity; message: string; suggestion: string };

/** 한 줄(추가된 코드 라인)에 대해 단일 라인 기준 규칙을 검사한다 */
function detectLineViolations(line: string, ext: string): RuleHit[] {
  const hits: RuleHit[] = [];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ") || trimmed.startsWith("package ")) {
    return hits;
  }

  const isJava = ext === "java";
  const isTs = ext === "ts" || ext === "tsx";

  // T001: any 타입
  if (isTs && /:\s*any\b/.test(trimmed)) {
    hits.push({
      ruleId: "T001", severity: "error",
      message: "any 타입은 타입 안전성을 해칩니다. 명시적 타입을 사용하세요.",
      suggestion: trimmed.replace(/:\s*any\b/, ": unknown /* TODO: 구체적 타입 지정 */"),
    });
  }

  // T002: var 사용 금지
  if ((isTs || ext === "js" || ext === "jsx") && /(^|[^.\w$])var\s+[a-zA-Z_$]/.test(trimmed)) {
    hits.push({
      ruleId: "T002", severity: "error",
      message: "var 대신 const 또는 let을 사용하세요.",
      suggestion: trimmed.replace(/\bvar\b/, "const"),
    });
  }

  // N003: 클래스명이 소문자로 시작
  const classMatch = trimmed.match(/\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  if (classMatch && /^[a-z]/.test(classMatch[1])) {
    hits.push({
      ruleId: "N003", severity: "error",
      message: `클래스명 ${classMatch[1]}는 PascalCase여야 합니다.`,
      suggestion: trimmed.replace(classMatch[1], toPascalCase(classMatch[1])),
    });
  }

  // S001: 한 줄에 중첩된 삼항 연산자 (물음표 2개, 콜론 2개)
  if ((trimmed.match(/\?/g)?.length ?? 0) >= 2 && /\?[^?:]*\?[^?:]*:[^?:]*:/.test(trimmed)) {
    hits.push({
      ruleId: "S001", severity: "warning",
      message: "중첩된 삼항 연산자는 가독성을 해칩니다. if-else로 분리하세요.",
      suggestion: "// TODO: if-else 또는 변수 분리로 리팩터링",
    });
  }

  if (isJava) {
    // N002: final 상수인데 UPPER_SNAKE_CASE가 아님
    const finalMatch = trimmed.match(/\bfinal\s+(?:static\s+)?[\w<>\[\],\s]+?\s([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    if (finalMatch && !/^[A-Z0-9_]+$/.test(finalMatch[1])) {
      hits.push({
        ruleId: "N002", severity: "error",
        message: `상수 ${finalMatch[1]}는 UPPER_SNAKE_CASE로 작성해야 합니다.`,
        suggestion: trimmed.replace(finalMatch[1], toUpperSnake(finalMatch[1])),
      });
    } else {
      // N001: snake_case 필드/변수명 (final 상수가 아닌 경우만)
      const snakeMatch = trimmed.match(/[\sA-Za-z_$][\w<>\[\],]*[\s>]([a-z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)+)\s*[=;)]/);
      if (snakeMatch) {
        hits.push({
          ruleId: "N001", severity: "error",
          message: `${snakeMatch[1]}는 snake_case입니다. camelCase로 수정하세요.`,
          suggestion: trimmed.replace(snakeMatch[1], toCamelCase(snakeMatch[1])),
        });
      }
    }

    // N004: boolean 필드/변수가 is/has/can 접두사 없음
    const boolMatch = trimmed.match(/\bboolean\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=;)]/);
    if (boolMatch && !BOOL_PREFIXES.some(p => boolMatch[1].toLowerCase().startsWith(p))) {
      hits.push({
        ruleId: "N004", severity: "warning",
        message: `boolean 변수 ${boolMatch[1]}는 is/has/can으로 시작해야 합니다.`,
        suggestion: trimmed.replace(boolMatch[1], `is${toPascalCase(boolMatch[1])}`),
      });
    }
  }

  if (isTs) {
    // N004: useState(true/false) boolean 상태가 is/has/can 접두사 없음
    const stateMatch = trimmed.match(/const\s*\[\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,\s*set[A-Za-z0-9_$]+\s*\]\s*=\s*useState(?:<[^>]+>)?\(\s*(?:true|false)\s*\)/);
    if (stateMatch && !BOOL_PREFIXES.some(p => stateMatch[1].toLowerCase().startsWith(p))) {
      hits.push({
        ruleId: "N004", severity: "warning",
        message: `boolean 상태 ${stateMatch[1]}는 is/has/can으로 시작해야 합니다.`,
        suggestion: trimmed.replace(stateMatch[1], `is${toPascalCase(stateMatch[1])}`),
      });
    }
  }

  return hits;
}

/** 추가된 라인들 중 "catch (...) { ... }"가 비어있는 경우(같은 줄 또는 바로 다음 줄이 닫는 중괄호)를 찾는다 */
function detectEmptyCatchBlocks(addedLines: AddedLine[]): (RuleHit & { lineNumber: number; code: string })[] {
  const hits: (RuleHit & { lineNumber: number; code: string })[] = [];
  for (let i = 0; i < addedLines.length; i++) {
    const line = addedLines[i];
    const trimmed = line.content.trim();
    if (!/catch\s*\([^)]*\)\s*\{/.test(trimmed)) continue;

    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(trimmed)) {
      hits.push({ ruleId: "S002", severity: "error", message: "빈 catch 블록은 예외를 무시합니다. 최소한 로그를 남겨야 합니다.", suggestion: "catch 블록에 최소 log.error(...) 등을 추가하세요.", lineNumber: line.lineNumber, code: line.content });
      continue;
    }
    if (/catch\s*\([^)]*\)\s*\{\s*$/.test(trimmed)) {
      const next = addedLines[i + 1]?.content.trim();
      if (next === "}" || next === undefined) {
        hits.push({ ruleId: "S002", severity: "error", message: "빈 catch 블록은 예외를 무시합니다. 최소한 로그를 남겨야 합니다.", suggestion: "catch 블록에 최소 log.error(...) 등을 추가하세요.", lineNumber: line.lineNumber, code: line.content });
      }
    }
  }
  return hits;
}

/**
 * 스테이징된 파일들의 실제 diff(추가된 라인)를 서버에서 가져와 정적 분석을 수행한다.
 * 파일 하나의 diff 조회가 실패해도 나머지 파일은 계속 분석하며, 실패한 파일은 결과에 포함하지 않는다.
 */
async function analyzeStagedFiles(
  projectId: number,
  files: { name: string; path: string }[]
): Promise<Violation[]> {
  const violations: Violation[] = [];
  let idSeq = 1;

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    let addedLines: AddedLine[];
    try {
      const diff = await fetchProjectChangedFileDiff(projectId, file.path, true);
      addedLines = parseAddedLines(diff.diffContent || "");
    } catch {
      continue; // diff를 가져올 수 없는 파일은 건너뜀 (가짜 결과를 만들지 않음)
    }

    for (const line of addedLines) {
      for (const hit of detectLineViolations(line.content, ext)) {
        violations.push({
          id: `v${idSeq++}`, ruleId: hit.ruleId, severity: hit.severity,
          file: file.name, ext, line: line.lineNumber,
          code: line.content.trim(), suggestion: hit.suggestion, message: hit.message,
        });
      }
    }
    if (ext === "java") {
      for (const hit of detectEmptyCatchBlocks(addedLines)) {
        violations.push({
          id: `v${idSeq++}`, ruleId: hit.ruleId, severity: hit.severity,
          file: file.name, ext, line: hit.lineNumber,
          code: hit.code.trim(), suggestion: hit.suggestion, message: hit.message,
        });
      }
    }
  }

  return violations;
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
  v, idx, visible,
}: {
  v: Violation; idx: number; visible: boolean;
}) {
  const [show, setShow]     = useState(false);
  const [open, setOpen]     = useState(false);
  const meta = SEV_META[v.severity];
  const SevIcon = meta.icon;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), idx * 75);
    return () => clearTimeout(t);
  }, [visible, idx]);

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
          </div>
          <p className="text-[9px] mt-0.5 truncate" style={{ color: TEXT_TERTIARY }}>{v.message}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
  file, violations, groupIdx, visible,
}: {
  file: string; violations: Violation[]; groupIdx: number; visible: boolean;
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
            <ViolationCard key={v.id} v={v} idx={i} visible={show} />
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
  projectId,
  stagedFiles,
  userName,
  onIgnore,
  onFix,
  onClose,
}: {
  projectId:    number;
  stagedFiles:  { name: string; path: string }[]; // 스테이징된 파일 (표시용 이름 + 실제 diff 조회용 경로)
  userName?:    string;
  onIgnore:     () => void;    // 무시하고 커밋
  onFix:        () => void;    // 수정 후 재검사
  onClose:      () => void;
}) {
  const [visible,     setVisible]     = useState(false);
  const [scanDone,    setScanDone]    = useState(false);
  const [activeTab,   setActiveTab]   = useState<"violations" | "rules">("violations");

  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    let cancelled = false;
    setScanDone(false);
    analyzeStagedFiles(projectId, stagedFiles).then((result) => {
      if (cancelled) return;
      setViolations(result);
      setScanDone(true);
    });
    return () => { cancelled = true; clearTimeout(t1); };
  }, [projectId, stagedFiles]);

  const activeViolations = violations;
  const errorCount   = activeViolations.filter(v => v.severity === "error").length;
  const warnCount    = activeViolations.filter(v => v.severity === "warning").length;
  const infoCount    = activeViolations.filter(v => v.severity === "info").length;

  // 파일별 그룹핑
  const byFile = activeViolations.reduce<Record<string, Violation[]>>((acc, v) => {
    if (!acc[v.file]) acc[v.file] = [];
    acc[v.file].push(v);
    return acc;
  }, {});

  const displayName = userName || "팀원";
  const greetingText = errorCount > 0
    ? `${displayName} 님, 우리 팀 약속이랑 다른 코드가 발견됐어요! 커밋 전에 확인해 주세요.`
    : `${displayName} 님, 오류는 없지만 몇 가지 개선 제안이 있어요. 확인해 볼까요?`;

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
                >정적 분석</span>
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
              ].filter(s => s.n > 0).map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.n}</span>
                  <span className="text-[9px]" style={{ color: s.color + "cc" }}>{s.label}</span>
                </div>
              ))}
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
          </div>
        )}

        {/* ══ 스크롤 바디 ══ */}
        <div className="flex-1 overflow-y-auto">
          {!scanDone ? (
            /* 스캔 중 스켈레톤 */
            <div className="p-5 space-y-3">
              {stagedFiles.map((_, i) => (
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
                  <p className="text-[12px] font-semibold" style={{ color: UI_GREEN }}>위반 사항이 발견되지 않았어요!</p>
                  <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>이제 커밋할 준비가 됐습니다</p>
                </div>
              ) : (
                Object.entries(byFile).map(([file, vs], gi) => (
                  <FileViolationGroup
                    key={file}
                    file={file}
                    violations={vs}
                    groupIdx={gi}
                    visible={scanDone}
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
                                  <span
                                    className="text-[7px] px-1 py-0.5 rounded font-semibold"
                                    style={rule.autoDetected
                                      ? { background: UI_GREEN_BG, color: UI_GREEN }
                                      : { background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}
                                  >
                                    {rule.autoDetected ? "자동 감지" : "수동 검토"}
                                  </span>
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
                onMouseEnter={e => e.currentTarget.style.background = "rgba(112,130,56,0.12)"}
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
                    boxShadow: "0 2px 8px rgba(112,130,56,0.25)",
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