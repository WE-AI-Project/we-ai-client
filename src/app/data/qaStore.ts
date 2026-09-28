// ── QA 커밋 정보 브릿지 ──
// ChangesPage → AIQAPage 커밋 데이터 전달용

import type { CommitFile } from "../components/commitData";

export type QACommitInfo = {
  message:  string;
  author:   string;
  branch:   string;
  files:    string[];
  hash:     string;
  time:     string;
  // 실제 정적 분석에 사용할 스테이징된 파일의 전체 diff 데이터
  diffFiles?: CommitFile[];
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
