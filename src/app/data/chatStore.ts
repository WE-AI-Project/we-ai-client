// ── WE&AI 채팅 & 문서 저장소 ──
// localStorage 기반 채팅 메시지 & 회의 문서 관리

// ── ID 생성 ──
export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type ChatMessage = {
  id:        string;
  sender:    string;
  avatar:    string;
  role:      "me" | "other";
  content:   string;
  time:      string;
  type:      "text" | "file" | "system" | "briefing";
  fileName?: string;
  fileType?: string;
  briefing?: { fileName: string; summary: string; points?: string[] };   // type="briefing" 일 때 — AI 브리핑 API 응답 요약
};

export type MeetingDoc = {
  id:        string;
  title:     string;
  createdAt: string;
  summary:   string;
  messages:  ChatMessage[];
  tags:      string[];
  sourceFile?: string;        // 원본 파일명 (AI 분석 결과)
};

const CHAT_KEY = "weai_chat_messages_v1";

// ── 초기 더미 채팅 메시지 ──
export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1", sender: "Admin", avatar: "A", role: "other",
    content: "안녕하세요! WE&AI 프로젝트 킥오프 회의 시작합니다.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: "text",
  },
  {
    id: "m2", sender: "병권", avatar: "병", role: "me",
    content: "네! Spring Boot 3.2 세팅 완료했습니다. 멀티에이전트 구조 공유할게요.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2.8).toISOString(), type: "text",
  },
  {
    id: "m3", sender: "Admin", avatar: "A", role: "other",
    content: "MultiAgentController 설계 리뷰 부탁드립니다. 동시성 이슈가 걱정돼요.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: "text",
  },
  {
    id: "m4", sender: "병권", avatar: "병", role: "me",
    content: "확인했습니다. synchronized 블록 추가해서 처리하겠습니다.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), type: "text",
  },
  {
    id: "m5", sender: "Admin", avatar: "A", role: "other",
    content: "DataSyncAgent.java 공유합니다.",
    time: new Date(Date.now() - 1000 * 60 * 45).toISOString(), type: "file",
    fileName: "DataSyncAgent.java", fileType: "java",
  },
  {
    id: "m6", sender: "병권", avatar: "병", role: "me",
    content: "고마워요! retryOnFailure 로직 참고해서 구현할게요.",
    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: "text",
  },
];

// ── CRUD ──
export function loadMessages(): ChatMessage[] {
  try {
    const s = localStorage.getItem(CHAT_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return INITIAL_MESSAGES.map(m => ({ ...m }));
}

export function saveMessages(msgs: ChatMessage[]): void {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
}

// ── 회의 요약 생성 ──
export function generateMeetingSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return "회의 내용 없음";
  const files   = messages.filter(m => m.type === "file").map(m => m.fileName);
  const senders = [...new Set(messages.map(m => m.sender))];
  const texts   = messages.filter(m => m.type === "text").map(m => `• ${m.sender}: ${m.content}`);
  let summary   = `참여자: ${senders.join(", ")} | 메시지 ${messages.length}건`;
  if (files.length > 0) summary += ` | 공유 파일: ${files.join(", ")}`;
  summary += "\n\n주요 내용:\n" + texts.slice(0, 8).join("\n");
  return summary;
}

// ── 시간 포맷 ──
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}