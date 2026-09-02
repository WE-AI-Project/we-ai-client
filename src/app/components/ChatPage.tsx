import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  MessageCircle, Video, VideoOff, Send, Paperclip,
  FileText, X, CheckCircle2, Download, Mic, MicOff,
  Hash, Globe, Server, ShieldCheck, Wrench, Loader2, Sparkles, Bot,
  Code2, User, BookOpen, Plus, Building2, MessageSquarePlus,
} from "lucide-react";

import {
  ChatMessage, MeetingDoc,
  loadDocs, saveDocs,
  generateMeetingSummary, formatTime, formatDate, genId,
  generateDocBriefing, briefingToMeetingDoc,
} from "../data/chatStore";

import {
  askAiAgent,
  fetchAiAgents,
  runAiChat,
  runCustomAiDebate,
  type AiAgent,
  type AiAgentKey,
  type AiChatResponse,
  type DebateResponse,
  type SingleAgentResponse,
} from "../../api/aiApi";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_GREEN,
  OLIVE_DARK,
} from "../colors";

import {
  fetchChatRooms,
  fetchChatMessages,
  sendChatMessage,
  fetchDepartments,
  createChatRoom,
  fetchProjectMembers,
  type ChatRoom,
  type ChatMessageResponse,
  type Department,
  type ProjectMember
} from "../lib/api";

// ══════════════════════════════════════════════════════════
// UI 컴포넌트들
// ══════════════════════════════════════════════════════════

export type BriefingData = {
  fileName: string;
  summary: string;
  points?: string[];
};

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

function DocBriefingBubble({ briefing, savedToDoc, onViewDoc, time }: { briefing: BriefingData; savedToDoc?: boolean; onViewDoc?: () => void; time?: string }) {
  return (
    <div className="flex gap-2.5 items-start mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(90,138,74,0.12)" }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#5A8A4A" }} />
      </div>
      <div className="flex-1 max-w-[85%] flex flex-col gap-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-semibold" style={{ color: "#5A8A4A" }}>WE&AI Briefing</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white border" style={{ borderColor: BORDER, color: TEXT_TERTIARY }}>System</span>
        </div>
        <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
            <FileText className="w-3 h-3" style={{ color: TEXT_SECONDARY }} />
            {briefing.fileName} 분석 완료
          </p>
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider block mb-1" style={{ color: TEXT_LABEL }}>핵심 요약</span>
              <p className="text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{briefing.summary}</p>
            </div>
            {briefing.points && briefing.points.length > 0 && (
              <div>
                <span className="text-[9px] font-semibold uppercase tracking-wider block mb-1 mt-2" style={{ color: TEXT_LABEL }}>주요 포인트</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {briefing.points.map((pt, i) => (
                    <li key={i} className="text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {savedToDoc && (
            <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" style={{ color: "#5A8A4A" }} />
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>Docs에 저장됨</span>
              </div>
              {onViewDoc && (
                <button onClick={onViewDoc} className="text-[9px] font-semibold hover:underline" style={{ color: OLIVE_DARK }}>
                  문서 보기
                </button>
              )}
            </div>
          )}
        </div>
        {time && <span className="text-[8px] px-1" style={{ color: TEXT_TERTIARY }}>{formatTime(time)}</span>}
      </div>
    </div>
  );
}

function BriefingLoadingBubble({ fileName }: { fileName: string }) {
  return (
    <div className="flex gap-2.5 items-start mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(90,138,74,0.12)" }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#5A8A4A" }} />
      </div>
      <div className="flex-1 max-w-[70%]">
        <div className="rounded-2xl p-3 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.90)", border: `1px solid ${BORDER}` }}>
          <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
            <strong>{fileName}</strong> 문서를 AI가 읽고 있습니다...
          </span>
        </div>
      </div>
    </div>
  );
}

type AIResponseKind = "text" | "rag" | "agent" | "debate";
interface AIMsg {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  kind?: AIResponseKind;
  data?: any;
}

function formatAiChatAnswer(response: AiChatResponse): string {
  const answer = response.answer?.trim();
  const contexts = (response.contexts ?? []).filter(Boolean);

  if (!answer && contexts.length === 0) {
    return "주의: 충분한 프로젝트의 표본이 없습니다.";
  }

  if (contexts.length === 0) {
    return `주의: 충분한 프로젝트의 표본이 없습니다.\n\n${answer || "프로젝트 문서를 추가하면 더 정확한 답변을 받을 수 있습니다."}`;
  }

  return compactAiAnswer(answer || "답변");
}

function compactAiAnswer(text: string, maxLength = 900): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= maxLength) return normalized;

  const shortened = normalized.slice(0, maxLength);
  const lastBoundary = Math.max(
    shortened.lastIndexOf(". "),
    shortened.lastIndexOf("다."),
    shortened.lastIndexOf("\n"),
  );
  const safeEnd = lastBoundary >= Math.floor(maxLength * 0.65) ? lastBoundary + 1 : maxLength;
  return `${shortened.slice(0, safeEnd).trim()}\n\n… 답변이 길어 핵심 내용만 표시했습니다.`;
}

function buildEditorContext(projectId: number | null | undefined, question: string, ragMaxResults: number) {
  return {
    projectId,
    fileName: "SYNAIPSE Chat AI Console",
    currentCodeSnippet: "No editor selection was provided. Use the project RAG context and the user question.",
    cursorLine: 1,
    userQuery: question,
    ragMaxResults,
  };
}

function formatSingleAgentAnswer(response: SingleAgentResponse) {
  const warning = (response.ragContexts?.length ?? 0) === 0
    ? "주의: 충분한 프로젝트의 표본이 없습니다.\n\n"
    : "";
  return `${warning}${compactAiAnswer(response.answer)}`;
}

function formatDebateSummary(response: DebateResponse) {
  const warning = (response.ragContexts?.length ?? 0) === 0
    ? "주의: 충분한 표본이 없습니다. · "
    : "";
  return `${warning}선택한 에이전트 토론 완료 · ${response.executedRounds ?? 0}/${response.maxRounds ?? 0} 라운드`;
}

const DEFAULT_AI_AGENTS: AiAgent[] = [
  { agent: "ORACLE", name: "Oracle", role: "Chief coordinator", model: "llama3.1" },
  { agent: "BACKEND", name: "Backend", role: "Server/API specialist", model: "qwen2.5-coder" },
  { agent: "FRONTEND", name: "Frontend", role: "UI/UX specialist", model: "llama3.1" },
  { agent: "INSPECTOR", name: "Inspector", role: "QA/Security inspector", model: "qwen2.5-coder" },
];

function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const bg = "rgba(65,67,27,0.08)";
  const color = OLIVE_DARK;
  const initial = name ? name[0] : "?";

  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center shrink-0`}
      style={{ background: bg }}
    >
      <span className="text-[10px] font-bold" style={{ color }}>{initial}</span>
    </div>
  );
}

const FILE_COLOR: Record<string, { bg: string; color: string }> = {
  java: { bg: "rgba(245,158,11,0.10)", color: "#f59e0b" },
  ts: { bg: "rgba(59,130,246,0.10)", color: "#3b82f6" },
  tsx: { bg: "rgba(6,182,212,0.10)", color: "#06b6d4" },
  gradle: { bg: "rgba(99,91,255,0.10)", color: ACCENT },
  yml: { bg: "rgba(16,185,129,0.10)", color: "#10b981" },
  pdf: { bg: "rgba(239,68,68,0.10)", color: "#ef4444" },
  md: { bg: "rgba(139,92,246,0.10)", color: "#8b5cf6" },
};

function MessageBubble({ msg, onViewDoc }: { msg: ChatMessage; onViewDoc?: () => void }) {
  const isMe = msg.role === "me";

  if (msg.type === "briefing" && (msg as any).briefing) {
    return (
      <DocBriefingBubble
        briefing={(msg as any).briefing}
        savedToDoc={true}
        onViewDoc={onViewDoc}
        time={msg.time}
      />
    );
  }

  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[9px] px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}>
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.type === "file") {
    const fc = FILE_COLOR[msg.fileType ?? ""] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY };
    return (
      <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} items-end mb-3`}>
        {!isMe && <Avatar name={msg.sender} />}
        <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
          {!isMe && <span className="text-[9px] px-1" style={{ color: TEXT_TERTIARY }}>{msg.sender}</span>}
          <div
            className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
            style={{
              background: isMe ? OLIVE_DARK : "rgba(255,255,255,0.90)",
              border: isMe ? "none" : `1px solid ${BORDER}`,
              boxShadow: isMe ? "0 2px 8px rgba(65,67,27,0.20)" : "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: fc.bg }}>
              <FileText className="w-3.5 h-3.5" style={{ color: fc.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: isMe ? "rgba(255,255,255,0.95)" : TEXT_PRIMARY }}>{msg.fileName}</p>
              <p className="text-[9px]" style={{ color: isMe ? "rgba(255,255,255,0.65)" : TEXT_TERTIARY }}>.{msg.fileType} 파일</p>
            </div>
            <Download className="w-3.5 h-3.5 shrink-0" style={{ color: isMe ? "rgba(255,255,255,0.70)" : TEXT_TERTIARY }} />
          </div>
          <span className="text-[8px] px-1" style={{ color: TEXT_TERTIARY }}>{formatTime(msg.time)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} items-end mb-3`}>
      {!isMe && <Avatar name={msg.sender} />}
      <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!isMe && <span className="text-[9px] px-1" style={{ color: TEXT_TERTIARY }}>{msg.sender}</span>}
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isMe ? OLIVE_DARK : "rgba(255,255,255,0.90)",
            border: isMe ? "none" : `1px solid ${BORDER}`,
            boxShadow: isMe ? "0 2px 8px rgba(65,67,27,0.20)" : "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: isMe ? "rgba(255,255,255,0.95)" : TEXT_PRIMARY }}>
            {msg.content}
          </p>
        </div>
        <span className="text-[8px] px-1" style={{ color: TEXT_TERTIARY }}>{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

function AIMessageBubble({ msg }: { msg: AIMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-start mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: OLIVE_DARK }}>
          <Bot className="w-3.5 h-3.5" style={{ color: "white" }} />
        </div>
      )}
      {isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(65,67,27,0.12)" }}>
          <User className="w-3.5 h-3.5" style={{ color: OLIVE_DARK }} />
        </div>
      )}
      <div className={`flex-1 ${isUser ? "items-end" : "items-start"} flex flex-col gap-0.5 min-w-0`} style={{ maxWidth: "82%" }}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-semibold" style={{ color: OLIVE_DARK }}>WE&AI Assistant</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(65,67,27,0.08)", color: OLIVE_DARK }}>AI</span>
          </div>
        )}
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isUser ? OLIVE_DARK : "rgba(255,255,255,0.95)",
            border: isUser ? "none" : `1px solid ${BORDER}`,
            boxShadow: isUser ? "0 2px 8px rgba(65,67,27,0.20)" : "0 1px 6px rgba(0,0,0,0.06)",
            alignSelf: isUser ? "flex-end" : "flex-start",
          }}
        >
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed" style={{ color: isUser ? "rgba(255,255,255,0.95)" : TEXT_PRIMARY }}>
            {msg.content.replace(/\*\*/g, "")}
          </p>
        </div>
        {!isUser && msg.kind === "rag" && msg.data && (msg.data.contexts?.length ?? 0) > 0 && (
          <p className="mt-1 px-1 text-[9px]" style={{ color: TEXT_TERTIARY }}>
            프로젝트 문서 {msg.data.contexts.length}개를 참고한 답변
          </p>
        )}
        {!isUser && msg.kind === "agent" && msg.data && (
          <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(65,67,27,0.04)", border: `1px solid ${BORDER}` }}>
            <div className="flex flex-wrap gap-1.5 text-[9px]" style={{ color: TEXT_TERTIARY }}>
              <span>{msg.data.agentName}</span><span>·</span><span>{msg.data.role}</span><span>·</span><span>{msg.data.model}</span>
            </div>
            {(msg.data.ragContexts?.length ?? 0) > 0 && (
              <p className="mt-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>RAG 컨텍스트 {msg.data.ragContexts.length}개 사용</p>
            )}
          </div>
        )}
        {!isUser && msg.kind === "debate" && msg.data && (
          <div className="mt-2 space-y-2">
            {(msg.data.turns ?? []).map((turn: any, index: number) => (
              <div key={`${turn.round}-${turn.agent}-${index}`} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.92)", border: `1px solid ${BORDER}` }}>
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold" style={{ color: OLIVE_DARK }}>
                  <span>Round {turn.round}</span><span>·</span><span>{turn.agent}</span><span>·</span><span>{turn.role}</span>
                  <span className="rounded-full px-1.5 py-0.5" style={{ background: "rgba(65,67,27,0.08)" }}>{turn.model}</span>
                </div>
                <p className="whitespace-pre-wrap text-[10px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{compactAiAnswer(turn.message, 700)}</p>
              </div>
            ))}
            {(msg.data.ragContexts?.length ?? 0) > 0 && (
              <p className="px-1 text-[9px]" style={{ color: TEXT_TERTIARY }}>RAG 컨텍스트 {msg.data.ragContexts.length}개 · 실행 {msg.data.executedRounds}/{msg.data.maxRounds} 라운드</p>
            )}
          </div>
        )}
        <span className="text-[8px] px-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

function DocCard({ doc, onOpen }: { doc: MeetingDoc; onOpen: () => void }) {
  const isAI = doc.title.startsWith("[AI 브리핑]");
  return (
    <div
      className="rounded-xl p-3 cursor-pointer transition-all"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: `1px solid ${isAI ? "rgba(65,67,27,0.15)" : BORDER}`,
      }}
      onClick={onOpen}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.98)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.85)")}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: isAI ? "rgba(65,67,27,0.10)" : "rgba(65,67,27,0.08)" }}
        >
          {isAI
            ? <Sparkles className="w-3 h-3" style={{ color: OLIVE_DARK }} />
            : <FileText className="w-3 h-3" style={{ color: OLIVE_DARK }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>{doc.title}</p>
          {isAI && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: "rgba(90,138,74,0.10)", color: "#5A8A4A" }}>
              🌐 AI 한글화
            </span>
          )}
        </div>
      </div>
      <p className="text-[9px] leading-relaxed line-clamp-2 mb-2" style={{ color: TEXT_SECONDARY }}>
        {doc.summary.split("\n")[0]}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {doc.tags.map(tag => (
          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(65,67,27,0.06)", color: OLIVE_DARK }}>
            #{tag}
          </span>
        ))}
        <span className="ml-auto text-[8px]" style={{ color: TEXT_TERTIARY }}>{formatDate(doc.createdAt)}</span>
      </div>
    </div>
  );
}

function DocDetailModal({ doc, onClose }: { doc: MeetingDoc; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "rgba(252,252,251,0.98)", border: `1px solid ${BORDER}`, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "80vh" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ background: "rgba(65,67,27,0.06)", borderBottom: `1px solid ${BORDER_SUBTLE}` }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(65,67,27,0.12)" }}>
            <FileText className="w-4 h-4" style={{ color: OLIVE_DARK }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>{doc.title}</p>
            <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{formatDate(doc.createdAt)} · {doc.messages.length}개 메시지</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.06]">
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: OLIVE_DARK }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>AI 요약</p>
            </div>
            <div className="rounded-xl p-3.5 text-[11px] leading-relaxed whitespace-pre-line" style={{ background: "rgba(65,67,27,0.05)", border: `1px solid rgba(65,67,27,0.10)`, color: TEXT_SECONDARY }}>
              {doc.summary}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {doc.tags.map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(65,67,27,0.06)", color: OLIVE_DARK }}>
                #{tag}
              </span>
            ))}
          </div>
          {doc.messages.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: TEXT_LABEL }}>채팅 기록</p>
              <div className="space-y-2">
                {doc.messages.map(m => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg p-2" style={{ background: "rgba(0,0,0,0.025)" }}>
                    <Avatar name={m.sender} size={5} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-semibold" style={{ color: TEXT_PRIMARY }}>{m.sender}</span>
                        <span className="text-[8px]" style={{ color: TEXT_TERTIARY }}>{formatTime(m.time)}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                        {m.type === "file" ? `📎 ${m.fileName}` : m.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 메인 ChatPage
// ══════════════════════════════════════════════════════════
export function ChatPage({
  projectId = 0,
  currentUserId,
  onDocsUpdate,
  onUnreadUpdate,
}: {
  projectId?: number | null;
  currentUserId?: number;
  onDocsUpdate?: (count: number) => void;
  onUnreadUpdate?: (count: number | ((prev: number) => number)) => void;
}) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [serverMessages, setServerMessages] = useState<ChatMessageResponse[]>([]);

  // 프로젝트 팀원 목록 관리 상태
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // 채팅방 생성 모달 관련 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"GENERAL" | "DEPARTMENT">("GENERAL");
  const [newRoomName, setNewRoomName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const [mainTab, setMainTab] = useState<"chat" | "ai" | "docs">("chat");
  const [docs, setDocs] = useState<MeetingDoc[]>(() => loadDocs());
  const [input, setInput] = useState("");
  const [aiInput, setAIInput] = useState("");

  const [isMeeting, setIsMeeting] = useState(false);
  const [meetingStart, setMeetingStart] = useState<Date | null>(null);
  const [meetingMsgs, setMeetingMsgs] = useState<ChatMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docSaved, setDocSaved] = useState(false);
  const [openDoc, setOpenDoc] = useState<MeetingDoc | null>(null);
  const [micOn, setMicOn] = useState(false);

  const [typing, setTyping] = useState(false);
  const [aiTyping, setAITyping] = useState(false);
  const [aiMessages, setAIMessages] = useState<AIMsg[]>([]);
  const [aiMode, setAiMode] = useState<"rag" | "agent" | "debate">("rag");
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<AiAgentKey[]>(["ORACLE", "BACKEND"]);
  const [singleAgent, setSingleAgent] = useState<AiAgentKey>("ORACLE");
  const [maxRounds, setMaxRounds] = useState(2);
  const [ragMaxResults, setRagMaxResults] = useState(4);
  const [briefingLoading, setBriefingLoading] = useState<string | null>(null);

  const briefFileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. 방 목록 및 팀원 정보 불러오기 API 연동
  const loadChatData = useCallback(() => {
    if (!projectId) return;
    setIsLoadingRooms(true);

    Promise.all([
      fetchChatRooms(projectId),
      fetchProjectMembers(projectId)
    ])
      .then(([roomsRes, membersRes]) => {
        const roomsArray = Array.isArray(roomsRes)
          ? roomsRes
          : (Array.isArray((roomsRes as any)?.data) ? (roomsRes as any).data
            : (Array.isArray((roomsRes as any)?.rooms) ? (roomsRes as any).rooms
              : (Array.isArray((roomsRes as any)?.chatRooms) ? (roomsRes as any).chatRooms : [])));
        setChatRooms(roomsArray);

        if (roomsArray.length > 0 && activeRoomId === null) {
          setActiveRoomId(roomsArray[0].chatRoomId);
        }

        const membersArray = membersRes?.members || [];
        setProjectMembers(membersArray);
      })
      .catch(() => toast.error("데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoadingRooms(false));
  }, [projectId, activeRoomId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // 2. 방 선택 시 메시지 불러오기 API 연동
  useEffect(() => {
    if (!projectId || !activeRoomId) return;
    setIsLoadingMessages(true);
    setLocalMessages([]);

    fetchChatMessages(projectId, activeRoomId)
      .then((res: any) => {
        const msgsArray = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.messages) ? res.messages : []));

        setServerMessages(msgsArray);
      })
      .catch(() => {
        toast.error("채팅 메시지를 불러오지 못했습니다.");
        setServerMessages([]);
      })
      .finally(() => setIsLoadingMessages(false));
  }, [projectId, activeRoomId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [serverMessages, localMessages, activeRoomId]);
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  useEffect(() => {
    if (isMeeting) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMeeting]);

  useEffect(() => { onDocsUpdate?.(docs.length); }, [docs.length]);

  useEffect(() => {
    if (!projectId) return;
    void fetchAiAgents()
      .then((result) => setAgents(result))
      .catch((error) => toast.error(error instanceof Error ? error.message : "AI 에이전트 목록을 불러오지 못했습니다."));
  }, [projectId]);

  const handleSelectCreateType = async (type: "GENERAL" | "DEPARTMENT") => {
    setCreateType(type);
    setSelectedDept(null);
    setNewRoomName("");

    if (type === "DEPARTMENT" && projectId) {
      setIsLoadingDepts(true);
      try {
        const res = await fetchDepartments(projectId);
        const deptsArray = Array.isArray(res)
          ? res
          : (Array.isArray((res as any)?.data) ? (res as any).data
            : (Array.isArray((res as any)?.departments) ? (res as any).departments : []));

        setDepartments(deptsArray);
      } catch (error) {
        toast.error("부서 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingDepts(false);
      }
    }
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    let targetName = "";
    if (createType === "GENERAL") {
      if (!newRoomName.trim()) {
        toast.error("채팅방 이름을 입력해 주세요.");
        return;
      }
      targetName = newRoomName.trim();
    } else {
      if (!selectedDept) {
        toast.error("생성할 부서를 선택해 주세요.");
        return;
      }
      targetName = selectedDept.name;
    }

    setIsCreatingRoom(true);
    try {
      const newRoom = await createChatRoom(projectId, targetName, createType);
      const actualName = newRoom?.name || (newRoom as any)?.data?.name || targetName;
      const actualRoomId = newRoom?.chatRoomId || (newRoom as any)?.data?.chatRoomId;

      toast.success(`'${actualName}' 채팅방이 생성되었습니다.`);

      setIsCreateModalOpen(false);
      setNewRoomName("");
      setSelectedDept(null);

      loadChatData();

      if (actualRoomId) {
        setActiveRoomId(actualRoomId);
      }
    } catch (error: any) {
      toast.error(error?.message || "채팅방 생성에 실패했습니다.");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const getRoomStyle = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("프론트") || lowerName.includes("frontend")) return { icon: Code2, color: "#5A8A4A", bg: "rgba(90,138,74,0.08)" };
    if (lowerName.includes("백엔드") || lowerName.includes("backend")) return { icon: Server, color: "#41431B", bg: "rgba(65,67,27,0.08)" };
    if (lowerName.includes("qa")) return { icon: ShieldCheck, color: "#B85450", bg: "rgba(184,84,80,0.08)" };
    if (lowerName.includes("devops")) return { icon: Wrench, color: "#C09840", bg: "rgba(192,152,64,0.08)" };
    if (lowerName.includes("전체") || lowerName.includes("all")) return { icon: Globe, color: "#41431B", bg: "rgba(65,67,27,0.08)" };
    return { icon: Hash, color: "#41431B", bg: "rgba(65,67,27,0.08)" };
  };

  const activeRoom = Array.isArray(chatRooms)
    ? chatRooms.find(r => r.chatRoomId === activeRoomId)
    : undefined;

  const addLocalMessage = useCallback((msg: Omit<ChatMessage, "id" | "time">) => {
    const full: ChatMessage = { ...msg, id: genId(), time: new Date().toISOString() };
    setLocalMessages(prev => [...prev, full]);
    if (isMeeting) setMeetingMsgs(prev => [...prev, full]);
    return full;
  }, [isMeeting]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    if (!projectId || !activeRoomId) {
      toast.error("선택된 채팅방 정보가 없습니다.");
      return;
    }

    setInput("");
    setTyping(true);

    try {
      const newMsg = await sendChatMessage(projectId, activeRoomId, text);
      if (newMsg) {
        setServerMessages(prev => [...prev, newMsg]);

        if (isMeeting) {
          setMeetingMsgs(prev => [...prev, {
            id: (newMsg.messageId ?? genId()).toString(),
            sender: newMsg.senderName || "나",
            avatar: (newMsg.senderName?.[0]) || "나",
            role: (newMsg.senderId === currentUserId ? "me" : "other") as "me" | "other",
            content: newMsg.content,
            time: newMsg.createdAt || new Date().toISOString(),
            type: "text",
          }]);
        }
      }
    } catch (error: any) {
      console.error("메시지 전송 실패 상세:", error);
      toast.error(error?.message || "메시지 전송에 실패했습니다.");
    } finally {
      setTyping(false);
    }
  };

  const sendAiQuestion = async (text: string) => {
    const userMsg: AIMsg = { id: genId(), role: "user", content: text, time: new Date().toISOString() };
    setAIMessages(prev => [...prev, userMsg]);
    setAITyping(true);

    try {
      let aiMsg: AIMsg;
      if (aiMode === "rag") {
        const response = await runAiChat({ projectId, question: text });
        aiMsg = { id: genId(), role: "ai", content: formatAiChatAnswer(response), time: new Date().toISOString(), kind: "rag", data: response };
      } else if (aiMode === "agent") {
        const response = await askAiAgent(singleAgent, buildEditorContext(projectId, text, ragMaxResults));
        aiMsg = { id: genId(), role: "ai", content: formatSingleAgentAnswer(response), time: new Date().toISOString(), kind: "agent", data: response };
      } else {
        if (selectedAgents.length === 0) throw new Error("토론에 참여할 에이전트를 한 명 이상 선택해 주세요.");
        const response = await runCustomAiDebate({
          context: buildEditorContext(projectId, text, ragMaxResults),
          agents: selectedAgents,
          maxRounds,
        });
        aiMsg = { id: genId(), role: "ai", content: formatDebateSummary(response), time: new Date().toISOString(), kind: "debate", data: response };
      }
      setAIMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 채팅 요청에 실패했습니다.");
    } finally {
      setAITyping(false);
    }
  };

  const handleAISend = () => {
    const text = aiInput.trim();
    if (!text || aiTyping) return;
    setAIInput("");
    void sendAiQuestion(text);
  };

  const availableAgents = agents.length > 0 ? agents : DEFAULT_AI_AGENTS;

  const updateDebateAgentCount = (count: number) => {
    const ordered = availableAgents.map(agent => agent.agent);
    setSelectedAgents(current => {
      const next = current.filter(agent => ordered.includes(agent)).slice(0, count);
      for (const agent of ordered) {
        if (next.length >= count) break;
        if (!next.includes(agent)) next.push(agent);
      }
      return next;
    });
  };

  const toggleDebateAgent = (agent: AiAgentKey) => {
    setSelectedAgents(current => {
      if (current.includes(agent)) {
        return current.length === 1 ? current : current.filter(item => item !== agent);
      }
      return [...current, agent];
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "file";
    addLocalMessage({ sender: "나", avatar: "나", role: "me", content: "", type: "file", fileName: file.name, fileType: ext });
    e.target.value = "";
  };

  const handleBriefingFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "file";
    e.target.value = "";

    addLocalMessage({
      sender: "나", avatar: "나", role: "me",
      content: "", type: "file",
      fileName: file.name, fileType: ext,
    });

    setBriefingLoading(file.name);
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, 80);

    const delay = 2200 + Math.random() * 800;
    setTimeout(() => {
      const briefing = generateDocBriefing(file.name, ext);
      const meetingDoc = briefingToMeetingDoc(briefing);

      setBriefingLoading(null);
      addLocalMessage({
        sender: "WE&AI", avatar: "AI", role: "other",
        content: `📋 **${file.name}** 한글 브리핑이 완료됐습니다.`,
        type: "briefing",
        briefing,
      });

      setTimeout(() => {
        setDocs(prev => {
          const next = [meetingDoc, ...prev];
          saveDocs(next);
          return next;
        });
      }, 1200);
    }, delay);
  };

  const startMeeting = () => {
    setIsMeeting(true); setMeetingStart(new Date()); setMeetingMsgs([]); setElapsed(0); setDocSaved(false);
    addLocalMessage({ sender: "System", avatar: "S", role: "other", content: "🎙️ 회의 모드가 시작되었습니다.", type: "system" });
  };

  const endMeeting = () => {
    setIsMeeting(false); setMicOn(false);
    addLocalMessage({ sender: "System", avatar: "S", role: "other", content: "⏹️ 회의 모드 종료. 문서로 저장 중...", type: "system" });
    setSavingDoc(true);
    setTimeout(() => {
      const now = new Date();
      const title = `${now.toLocaleDateString("ko-KR")} 회의 — ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
      const newDoc: MeetingDoc = {
        id: genId(), title, createdAt: now.toISOString(),
        summary: generateMeetingSummary(meetingMsgs),
        messages: meetingMsgs,
        tags: ["회의", "자동저장", now.toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")],
      };
      setDocs(prev => { const next = [newDoc, ...prev]; saveDocs(next); return next; });
      setSavingDoc(false); setDocSaved(true); setMainTab("docs");
    }, 1500);
  };

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const displayMessages: ChatMessage[] = [
    ...serverMessages.map(m => ({
      id: m.messageId.toString(),
      sender: m.senderName,
      avatar: m.senderName?.[0] || "?",
      role: (m.senderId === currentUserId ? "me" : "other") as "me" | "other",
      content: m.content,
      time: m.createdAt,
      type: "text" as const,
    })),
    ...localMessages,
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {openDoc && <DocDetailModal doc={openDoc} onClose={() => setOpenDoc(null)} />}

      {/* 채팅방 생성 모달 */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !isCreatingRoom) setIsCreateModalOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-2xl transition-all"
            style={{ background: "#FCFCFB", border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(65,67,27,0.10)" }}>
                  <MessageSquarePlus className="w-4 h-4" style={{ color: OLIVE_DARK }} />
                </div>
                <h3 className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>새 채팅방 만들기</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingRoom}
                className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-4" style={{ background: "rgba(65,67,27,0.06)" }}>
              <button
                type="button"
                onClick={() => handleSelectCreateType("GENERAL")}
                className="py-1.5 text-[10px] font-bold rounded-lg transition-all"
                style={{
                  background: createType === "GENERAL" ? OLIVE_DARK : "transparent",
                  color: createType === "GENERAL" ? "white" : TEXT_SECONDARY,
                }}
              >
                일반 채팅
              </button>
              <button
                type="button"
                onClick={() => handleSelectCreateType("DEPARTMENT")}
                className="py-1.5 text-[10px] font-bold rounded-lg transition-all"
                style={{
                  background: createType === "DEPARTMENT" ? OLIVE_DARK : "transparent",
                  color: createType === "DEPARTMENT" ? "white" : TEXT_SECONDARY,
                }}
              >
                부서 채팅
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              {createType === "GENERAL" ? (
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: TEXT_LABEL }}>
                    채팅방 이름
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="예: 프로젝트 기획 회의실"
                    disabled={isCreatingRoom}
                    className="w-full px-3 py-2 text-xs rounded-xl outline-none transition-all"
                    style={{ background: "white", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5" style={{ color: TEXT_LABEL }}>
                    생성할 부서 선택
                  </label>
                  {isLoadingDepts ? (
                    <div className="text-center py-6 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                      부서 목록을 불러오는 중입니다...
                    </div>
                  ) : departments.length === 0 ? (
                    <div className="text-center py-6 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                      생성 가능한 부서 정보가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {departments.map((dept) => {
                        const isExists = dept.chatRoomExists;
                        const isSelected = selectedDept?.departmentId === dept.departmentId;

                        return (
                          <div
                            key={dept.departmentId}
                            onClick={() => {
                              if (!isExists && !isCreatingRoom) {
                                setSelectedDept(dept);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${isExists
                              ? "opacity-50 cursor-not-allowed bg-black/[0.02]"
                              : "cursor-pointer hover:border-black/20"
                              }`}
                            style={{
                              borderColor: isSelected ? OLIVE_DARK : BORDER_SUBTLE,
                              background: isSelected ? "rgba(65,67,27,0.06)" : isExists ? "rgba(0,0,0,0.02)" : "white",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5" style={{ color: isSelected ? OLIVE_DARK : TEXT_TERTIARY }} />
                              <span className="font-semibold" style={{ color: isSelected ? OLIVE_DARK : TEXT_PRIMARY }}>
                                {dept.name}
                              </span>
                            </div>
                            {isExists ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_TERTIARY }}>
                                이미 생성됨
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: isSelected ? OLIVE_DARK : "rgba(65,67,27,0.08)", color: isSelected ? "white" : OLIVE_DARK }}>
                                {isSelected ? "선택됨" : "생성 가능"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 생성 제출 버튼 */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingRoom}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-black/5 transition-all"
                  style={{ color: TEXT_SECONDARY }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreatingRoom ||
                    (createType === "GENERAL" && !newRoomName.trim()) ||
                    (createType === "DEPARTMENT" && !selectedDept)
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                  style={{ background: OLIVE_DARK }}
                >
                  {isCreatingRoom && <Loader2 className="w-3 h-3 animate-spin" />}
                  채팅방 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(160deg, #f5f4ef 0%, #f0efe8 40%, #ede9df 100%)" }} />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* ══ 메인 탭 바 ══ */}
        <div
          className="flex items-center gap-0 px-3 h-11 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}
        >
          <div className="flex items-center gap-0.5 mr-3">
            {isLoadingRooms ? (
              <div className="flex items-center gap-2">
                <Skeleton className="w-16 h-7 rounded-lg" />
                <Skeleton className="w-16 h-7 rounded-lg" />
                <Skeleton className="w-20 h-7 rounded-lg" />
              </div>
            ) : (
              [
                { id: "chat", icon: MessageCircle, label: "Chat" },
                { id: "ai", icon: Bot, label: "AI" },
                { id: "docs", icon: FileText, label: `Docs${docs.length > 0 ? ` (${docs.length})` : ""}` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as any)}
                  className="flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold transition-all border-b-2"
                  style={{
                    height: 44,
                    color: mainTab === tab.id ? OLIVE_DARK : TEXT_TERTIARY,
                    borderBottomColor: mainTab === tab.id ? OLIVE_DARK : "transparent",
                    background: tab.id === "ai" && mainTab === "ai" ? "rgba(65,67,27,0.05)" : "transparent",
                  }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === "ai" && (
                    <span className="ml-0.5 text-[8px] px-1 py-0.5 rounded-full font-bold" style={{ background: "rgba(65,67,27,0.12)", color: OLIVE_DARK }}>AI</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!isLoadingRooms && (
              <>
                {isMeeting && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.10)" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] font-semibold" style={{ color: "#ef4444" }}>REC {formatElapsed(elapsed)}</span>
                  </div>
                )}
                {savingDoc && (
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> 저장 중…
                  </div>
                )}
                {docSaved && !savingDoc && (
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "#5A8A4A" }}>
                    <CheckCircle2 className="w-3 h-3" /> 저장됨
                  </div>
                )}
                {isMeeting && (
                  <button onClick={() => setMicOn(m => !m)} className="p-1.5 rounded-lg transition-all"
                    style={{ background: micOn ? "rgba(16,185,129,0.12)" : "rgba(0,0,0,0.05)" }}>
                    {micOn ? <Mic className="w-3.5 h-3.5" style={{ color: "#10b981" }} /> : <MicOff className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />}
                  </button>
                )}
                {mainTab === "chat" && (
                  <button
                    onClick={isMeeting ? endMeeting : startMeeting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: isMeeting ? "rgba(239,68,68,0.10)" : "rgba(65,67,27,0.08)",
                      color: isMeeting ? "#ef4444" : OLIVE_DARK,
                      border: `1px solid ${isMeeting ? "rgba(239,68,68,0.2)" : "rgba(65,67,27,0.15)"}`,
                    }}
                  >
                    {isMeeting ? <><VideoOff className="w-3.5 h-3.5" /> 회의 종료</> : <><Video className="w-3.5 h-3.5" /> 회의 시작</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ CHAT 탭 ══ */}
        {mainTab === "chat" && (
          <>
            <div
              className="flex items-center gap-2 px-3 h-10 shrink-0"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.95)" }}
            >
              {/* 1. [맨 왼쪽] + 채팅방 추가 버튼 */}
              {!isLoadingRooms && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all hover:bg-black/10"
                  title="채팅방 추가"
                  style={{
                    background: "rgba(65,67,27,0.08)",
                    color: OLIVE_DARK,
                    border: "1px solid rgba(65,67,27,0.15)",
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}

              {/* 2. [중앙] 채팅방 목록 (가로 스크롤 영역) */}
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                {isLoadingRooms ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-20 h-6 rounded-lg shrink-0" />
                  ))
                ) : (
                  <>
                    {/* 방 목록 렌더링 */}
                    {Array.isArray(chatRooms) && chatRooms.map((room) => {
                      const { icon: Icon, color, bg } = getRoomStyle(room.name);
                      const isActive = activeRoomId === room.chatRoomId;

                      return (
                        <button
                          key={room.chatRoomId}
                          onClick={() => setActiveRoomId(room.chatRoomId)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 transition-all whitespace-nowrap"
                          style={{
                            background: isActive ? bg : "transparent",
                            color: isActive ? color : TEXT_TERTIARY,
                            border: `1px solid ${isActive ? "rgba(0,0,0,0.08)" : "transparent"}`,
                          }}
                        >
                          <Icon className="w-3 h-3" />
                          {room.name}
                          <span
                            className="text-[8px] px-1 py-0.5 rounded-full ml-0.5"
                            style={{ background: isActive ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)", color: isActive ? color : TEXT_TERTIARY }}
                          >
                            {room.memberCount ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* 3. [맨 오른쪽] 팀원 목록 (4명 제한 + 마우스 호버 시 팝업) */}
              {!isLoadingRooms && (() => {
                const displayMembers = projectMembers || [];
                const visibleMembers = displayMembers.slice(0, 4);
                const remainingCount = displayMembers.length - 4;

                return (
                  <div className="relative group shrink-0 flex items-center gap-1 pl-2.5 border-l border-black/10">
                    {/* 기본 4명 아바타 */}
                    <div className="flex items-center -space-x-1.5">
                      {visibleMembers.length > 0 ? (
                        visibleMembers.map((m: any, idx: number) => {
                          const name = m.name || m.memberName || "팀원";
                          return (
                            <div
                              key={m.userId || m.id || idx}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white shadow-sm cursor-pointer"
                              style={{ background: m.color || OLIVE_DARK }}
                              title={name}
                            >
                              {name[0]}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-gray-400 pl-1 font-medium">팀원 없음</span>
                      )}
                      
                      {remainingCount > 0 && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white shadow-sm cursor-pointer"
                          style={{ background: "rgba(0,0,0,0.08)", color: TEXT_SECONDARY }}
                        >
                          ...
                        </div>
                      )}
                    </div>

                    {/* 마우스 호버 시 전체 팀원 목록 팝업창 */}
                    {displayMembers.length > 0 && (
                      <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col gap-1.5 p-3 bg-white rounded-xl shadow-xl border border-black/10 z-50 min-w-[150px]">
                        <div className="text-[10px] font-bold pb-1.5 border-b border-black/5 text-gray-500 flex items-center justify-between">
                          <span>전체 팀원 목록</span>
                          <span className="text-[9px] font-normal text-gray-400">{displayMembers.length}명</span>
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {displayMembers.map((m: any, idx: number) => {
                            const name = m.name || m.memberName || "팀원";
                            const role = m.role || m.part || "";
                            return (
                              <div key={m.userId || m.id || idx} className="flex items-center gap-2 py-0.5">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                  style={{ background: m.color || OLIVE_DARK }}
                                >
                                  {name[0]}
                                </div>
                                <span className="text-[11px] font-semibold text-gray-700 truncate">{name}</span>
                                {role && <span className="text-[9px] text-gray-400 ml-auto shrink-0">{role}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "rgba(248,247,244,0.50)" }}>
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const isMe = i % 2 !== 0;
                    return (
                      <div key={i} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} items-end`}>
                        {!isMe && <Skeleton className="w-7 h-7 rounded-full shrink-0" />}
                        <Skeleton className={`h-12 rounded-2xl ${isMe ? "w-48" : "w-64"}`} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {displayMessages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      onViewDoc={() => setMainTab("docs")}
                    />
                  ))}
                  {briefingLoading && <BriefingLoadingBubble fileName={briefingLoading} />}
                  {typing && (
                    <div className="flex gap-2 items-end mb-3 flex-row-reverse">
                      <div className="rounded-2xl px-4 py-3" style={{ background: OLIVE_DARK, border: `1px solid ${BORDER}` }}>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full"
                              style={{ background: "white", animation: `bounce 1s ${i * 0.15}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            <div className="shrink-0 p-3" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}>
              <div className="flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}` }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={isLoadingMessages || isLoadingRooms}
                  placeholder={isLoadingMessages ? "채팅 불러오는 중..." : `${activeRoom?.name || ""} 채널에 메시지 입력...`}
                  rows={2}
                  className="flex-1 resize-none outline-none text-[11px] leading-relaxed disabled:opacity-50"
                  style={{ background: "transparent", color: TEXT_PRIMARY }}
                />
                <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoadingMessages}
                    className="p-1.5 rounded-lg hover:bg-black/[0.05] disabled:opacity-50"
                  >
                    <Paperclip className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />

                  <button
                    onClick={() => briefFileRef.current?.click()}
                    disabled={!!briefingLoading || isLoadingMessages}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: briefingLoading ? "rgba(0,0,0,0.04)" : "rgba(65,67,27,0.08)",
                      color: briefingLoading ? TEXT_TERTIARY : OLIVE_DARK,
                      border: `1px solid ${briefingLoading ? BORDER : "rgba(65,67,27,0.18)"}`,
                      cursor: briefingLoading || isLoadingMessages ? "not-allowed" : "pointer",
                    }}
                  >
                    {briefingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
                    {briefingLoading ? "분석 중..." : "AI 문서 분석"}
                  </button>
                  <input ref={briefFileRef} type="file" className="hidden" accept=".java,.ts,.tsx,.yml,.yaml,.gradle,.env,.pdf,.md,.mdx,.css,.txt,.json" onChange={handleBriefingFile} />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoadingMessages || typing}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                    style={{ background: input.trim() ? OLIVE_DARK : "rgba(0,0,0,0.06)" }}
                  >
                    <Send className="w-3.5 h-3.5" style={{ color: input.trim() ? "white" : TEXT_TERTIARY }} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ AI 탭 ══ */}
        {mainTab === "ai" && (
          <>
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(65,67,27,0.05)" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: OLIVE_DARK }}>
                <Bot className="w-4 h-4" style={{ color: "white" }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>WE&AI Project Assistant</p>
                <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                  {aiMode === "rag" && "프로젝트 RAG 질의"}
                  {aiMode === "agent" && "선택 에이전트 단독 분석"}
                  {aiMode === "debate" && `${selectedAgents.length}명 · 최대 ${maxRounds}라운드 심화 토론`}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: UI_GREEN }} />
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>온라인</span>
              </div>
            </div>

            <div className="shrink-0 px-3 py-2.5 space-y-2" style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.95)" }}>
              <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: "rgba(65,67,27,0.07)" }}>
                {([
                  ["rag", "RAG 질문"],
                  ["agent", "단일 AI"],
                  ["debate", "AI 토론"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setAiMode(mode)}
                    disabled={aiTyping}
                    className="rounded-lg px-2 py-1.5 text-[9px] font-semibold transition-all disabled:opacity-50"
                    style={{
                      color: aiMode === mode ? "white" : TEXT_SECONDARY,
                      background: aiMode === mode ? OLIVE_DARK : "transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {aiMode === "agent" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {availableAgents.map(agent => (
                    <button
                      key={agent.agent}
                      onClick={() => setSingleAgent(agent.agent)}
                      disabled={aiTyping}
                      className="rounded-xl px-2.5 py-2 text-left transition-all disabled:opacity-50"
                      style={{
                        border: `1px solid ${singleAgent === agent.agent ? OLIVE_DARK : BORDER}`,
                        background: singleAgent === agent.agent ? "rgba(65,67,27,0.09)" : "rgba(255,255,255,0.8)",
                      }}
                    >
                      <span className="block text-[9px] font-bold" style={{ color: TEXT_PRIMARY }}>{agent.name}</span>
                      <span className="block truncate text-[8px]" style={{ color: TEXT_TERTIARY }}>{agent.role} · {agent.model}</span>
                    </button>
                  ))}
                </div>
              )}

              {aiMode === "debate" && (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    <label className="text-[8px] font-medium" style={{ color: TEXT_SECONDARY }}>
                      참여 인원
                      <select
                        value={selectedAgents.length}
                        onChange={event => updateDebateAgentCount(Number(event.target.value))}
                        disabled={aiTyping}
                        className="mt-1 w-full rounded-lg px-2 py-1.5 text-[9px] outline-none"
                        style={{ border: `1px solid ${BORDER}`, background: "white", color: TEXT_PRIMARY }}
                      >
                        {availableAgents.map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}명</option>)}
                      </select>
                    </label>
                    <label className="text-[8px] font-medium" style={{ color: TEXT_SECONDARY }}>
                      심화 토론
                      <select
                        value={maxRounds}
                        onChange={event => setMaxRounds(Number(event.target.value))}
                        disabled={aiTyping}
                        className="mt-1 w-full rounded-lg px-2 py-1.5 text-[9px] outline-none"
                        style={{ border: `1px solid ${BORDER}`, background: "white", color: TEXT_PRIMARY }}
                      >
                        {[1, 2, 3, 4, 5].map(round => <option key={round} value={round}>{round}라운드</option>)}
                      </select>
                    </label>
                    <label className="text-[8px] font-medium" style={{ color: TEXT_SECONDARY }}>
                      RAG 문서
                      <select
                        value={ragMaxResults}
                        onChange={event => setRagMaxResults(Number(event.target.value))}
                        disabled={aiTyping}
                        className="mt-1 w-full rounded-lg px-2 py-1.5 text-[9px] outline-none"
                        style={{ border: `1px solid ${BORDER}`, background: "white", color: TEXT_PRIMARY }}
                      >
                        {[2, 4, 6, 8, 10, 12].map(count => <option key={count} value={count}>{count}개</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {availableAgents.map(agent => {
                      const selected = selectedAgents.includes(agent.agent);
                      return (
                        <button
                          key={agent.agent}
                          onClick={() => toggleDebateAgent(agent.agent)}
                          disabled={aiTyping}
                          title={`${agent.role} · ${agent.model}`}
                          className="rounded-lg px-1.5 py-1.5 text-[8px] font-semibold transition-all disabled:opacity-50"
                          style={{
                            border: `1px solid ${selected ? OLIVE_DARK : BORDER}`,
                            color: selected ? OLIVE_DARK : TEXT_TERTIARY,
                            background: selected ? "rgba(65,67,27,0.10)" : "white",
                          }}
                        >
                          {agent.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {aiMode === "agent" && (
                <label className="flex items-center justify-between text-[8px] font-medium" style={{ color: TEXT_SECONDARY }}>
                  RAG 검색 문서 수
                  <select
                    value={ragMaxResults}
                    onChange={event => setRagMaxResults(Number(event.target.value))}
                    disabled={aiTyping}
                    className="rounded-lg px-2 py-1 text-[9px] outline-none"
                    style={{ border: `1px solid ${BORDER}`, background: "white", color: TEXT_PRIMARY }}
                  >
                    {[2, 4, 6, 8, 10, 12].map(count => <option key={count} value={count}>{count}개</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "rgba(248,247,244,0.50)" }}>
              {isLoadingRooms ? (
                <div className="flex gap-2.5 items-start mb-4">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <Skeleton className="h-16 w-3/4 rounded-2xl" />
                </div>
              ) : (
                <>
                  {aiMessages.length === 0 && (
                    <div className="mx-auto mt-8 max-w-xs rounded-2xl px-4 py-5 text-center" style={{ border: `1px dashed ${BORDER}`, background: "rgba(255,255,255,0.65)" }}>
                      <Bot className="mx-auto mb-2 h-5 w-5" style={{ color: OLIVE_DARK }} />
                      <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>실제 AI 응답만 표시됩니다</p>
                      <p className="mt-1 text-[9px] leading-relaxed" style={{ color: TEXT_TERTIARY }}>
                        모드를 고르고 질문을 입력하세요. 단일 AI와 토론 모드에서는 에이전트별 역할과 모델도 함께 확인할 수 있습니다.
                      </p>
                    </div>
                  )}
                  {aiMessages.map(msg => <AIMessageBubble key={msg.id} msg={msg} />)}
                  {aiTyping && (
                    <div className="flex gap-2.5 items-start mb-4">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: OLIVE_DARK }}>
                        <Bot className="w-3.5 h-3.5" style={{ color: "white" }} />
                      </div>
                      <div className="rounded-2xl px-4 py-3 mt-0.5" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}` }}>
                        <div className="flex gap-1 items-center">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full"
                              style={{ background: OLIVE_DARK, opacity: 0.5, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                          ))}
                          <span className="ml-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>분석 중...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={aiBottomRef} />
                </>
              )}
            </div>

            <div className="shrink-0 p-3" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}>
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.95)", border: `1.5px solid rgba(65,67,27,0.15)` }}
              >
                <Bot className="w-4 h-4 shrink-0 mb-1.5" style={{ color: OLIVE_DARK, opacity: 0.5 }} />
                <textarea
                  value={aiInput}
                  onChange={e => setAIInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAISend(); } }}
                  disabled={isLoadingRooms}
                  placeholder={
                    aiMode === "rag"
                      ? "프로젝트 문서를 기반으로 질문하세요..."
                      : aiMode === "agent"
                        ? `${availableAgents.find(agent => agent.agent === singleAgent)?.name ?? "AI"}에게 분석을 요청하세요...`
                        : `${selectedAgents.length}명의 AI에게 토론시킬 주제를 입력하세요...`
                  }
                  rows={2}
                  className="flex-1 resize-none outline-none text-[11px] leading-relaxed disabled:opacity-50"
                  style={{ background: "transparent", color: TEXT_PRIMARY }}
                />
                <button
                  onClick={handleAISend}
                  disabled={!aiInput.trim() || aiTyping || isLoadingRooms}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5 disabled:opacity-50"
                  style={{ background: aiInput.trim() && !aiTyping ? OLIVE_DARK : "rgba(0,0,0,0.06)" }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: aiInput.trim() && !aiTyping ? "white" : TEXT_TERTIARY }} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══ DOCS 탭 ══ */}
        {mainTab === "docs" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}
            >
              <FileText className="w-4 h-4 shrink-0" style={{ color: OLIVE_DARK }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Meeting Docs</p>
              {!isLoadingRooms && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(65,67,27,0.08)", color: OLIVE_DARK }}>
                  {docs.length}개 문서
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: OLIVE_DARK, opacity: 0.6 }} />
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>AI 한글화 문서 포함</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5" style={{ background: "rgba(248,247,244,0.50)" }}>
              {isLoadingRooms ? (
                /* [스켈레톤] 문서 카드들 */
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 border bg-white/50 border-black/5 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="w-6 h-6 rounded-lg" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <FileText className="w-10 h-10" style={{ color: "rgba(65,67,27,0.15)" }} />
                  <p className="text-[12px] font-semibold" style={{ color: TEXT_TERTIARY }}>저장된 문서가 없습니다</p>
                  <p className="text-[10px]" style={{ color: TEXT_LABEL }}>AI 문서 분석 버튼으로 파일을 업로드하거나 회의를 시작하세요</p>
                </div>
              ) : (
                docs.map(doc => (
                  <DocCard key={doc.id} doc={doc} onOpen={() => setOpenDoc(doc)} />
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}