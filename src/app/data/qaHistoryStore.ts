// ── AI QA 실행 이력 스토어 ──
// AIQAPage에서 실제로 실행된 Phase 1(정적 분석)/Phase 2(화면 조작 테스트) 결과를
// 로컬에 누적 기록한다. "커밋" 탭과 QA Reports 페이지가 이 실제 이력을 함께 읽는다.

export type QaHistorySeverity = "critical" | "warning" | "passed";

export type QaHistoryError = {
  id: string;
  file: string;
  line: number;
  type: string;
  message: string;
  severity: QaHistorySeverity;
  fix?: string;
};

export type QaHistoryRecord = {
  id: string;
  projectId: number | null;
  commitMessage: string;
  commitHash: string;
  author: string;
  branch: string;
  filesScanned: string[];
  errors: QaHistoryError[];
  phase2PassedCount: number;
  phase2FailedCount: number;
  ranAt: string; // ISO
};

const QA_HISTORY_KEY = "weai_qa_history_v1";
const MAX_HISTORY = 30;

export function loadQaHistory(): QaHistoryRecord[] {
  try {
    const raw = localStorage.getItem(QA_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function recordQaRun(entry: Omit<QaHistoryRecord, "id" | "ranAt">): QaHistoryRecord {
  const record: QaHistoryRecord = {
    ...entry,
    id: "qa-" + Math.random().toString(36).slice(2, 9),
    ranAt: new Date().toISOString(),
  };
  const history = [record, ...loadQaHistory()].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(history));
  } catch {}
  return record;
}

export function clearQaHistory(): void {
  try { localStorage.removeItem(QA_HISTORY_KEY); } catch {}
}
