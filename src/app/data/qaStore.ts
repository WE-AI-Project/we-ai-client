// ── QA 커밋 정보 브릿지 ──
// ChangesPage → AIQAPage 커밋 데이터 전달용

export type QACommitInfo = {
  message:  string;
  author:   string;
  branch:   string;
  files:    string[];
  hash:     string;
  time:     string;
};

let _pending: QACommitInfo | null = null;

export function setPendingQA(info: QACommitInfo): void {
  _pending = info;
}

export function getPendingQA(): QACommitInfo | null {
  return _pending;
}

export function clearPendingQA(): void {
  _pending = null;
}
