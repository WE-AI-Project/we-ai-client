// ── SynAIpse 채팅 & 문서 저장소 ──
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
    content: "안녕하세요! SynAIpse 프로젝트 킥오프 회의 시작합니다.",
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
  } catch (error) {
    console.warn("로컬 채팅 메시지 캐시를 불러오지 못했습니다:", error);
  }
  return INITIAL_MESSAGES.map(m => ({ ...m }));
}

export function saveMessages(msgs: ChatMessage[]): void {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
}

// ── 회의록 원문(트랜스크립트) 생성 ──
// 회의 중 오간 실제 채팅 메시지를 시간순으로 그대로 옮겨 적은 것 - 회의가 끝나면 이 원문을
// 서버로 보내고, 실제 요약(AI 생성)은 서버의 MeetingSummaryAiService가 만든다. 여기서는
// "요약"을 흉내내지 않는다 - 이전 버전은 이 함수 이름이 "요약 생성"이었지만 실제로는 원문을
// 그대로 나열하기만 했다.
export function buildMeetingTranscript(messages: { senderName: string; content: string; messageType: string }[]): string {
  if (messages.length === 0) return "회의 중 채팅 메시지가 없습니다.";
  return messages
    .map(m => m.messageType === "TEXT" ? `${m.senderName}: ${m.content}` : `${m.senderName}: [파일 공유] ${m.content}`)
    .join("\n");
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