import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Video, VideoOff, Send, Paperclip,
  FileText, X, CheckCircle2, Download, Mic, MicOff,
  Clock, Hash, Users, Loader2, Sparkles, Bot,
  Code2, Server, ShieldCheck, Wrench, Globe,
  User, ChevronRight, Search, BookOpen, Plus,
} from "lucide-react";
import {
  ChatMessage, MeetingDoc,
  loadDocs, saveDocs, loadMessages, // loadMessages 추가
  generateMeetingSummary, formatTime, formatDate, genId,
  generateDocBriefing, briefingToMeetingDoc, type BriefingData,
  loadChannels, addChannel, deleteChannel, type Channel,
} from "../data/chatStore";
import { DocBriefingBubble, BriefingLoadingBubble } from "./DocBriefingBubble";
import { CreateChatModal } from "./CreateChatModal";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_GREEN, UI_AMBER,
  OLIVE_DARK,
} from "../colors";

// ── 타입 정의 ──────────────────────────────────────────
type AIResponseKind = "text" | "team" | "profile" | "status" | "tasks";
interface AIMsg {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  kind?: AIResponseKind;
  data?: any;
}

type PartId = string;

// ── 프로젝트 지식 데이터 ───────────────────────────────
const PROJECT_TEAM = [
  { name: "병권", part: "Backend", partKo: "백엔드", partId: "backend", role: "Backend Dev · Team Lead", avatar: "병", color: "#41431B", bg: "rgba(65,67,27,0.10)", tasks: ["Multi-Agent Controller", "API 설계"], stack: ["Java 17", "Spring Boot 3.2"], status: "online", joinDate: "2025.01" },
  { name: "지수", part: "Frontend", partKo: "프론트엔드", partId: "frontend", role: "Frontend Developer", avatar: "지", color: "#5A8A4A", bg: "rgba(90,138,74,0.10)", tasks: ["React UI", "컴포넌트"], stack: ["React 18", "Tailwind CSS"], status: "online", joinDate: "2025.01" },
  { name: "서연", part: "QA", partKo: "QA", partId: "qa", role: "QA Engineer", avatar: "서", color: "#B85450", bg: "rgba(184,84,80,0.10)", tasks: ["테스트 자동화"], stack: ["JUnit 5", "Playwright"], status: "online", joinDate: "2025.01" },
  { name: "Admin", part: "DevOps", partKo: "DevOps", partId: "devops", role: "DevOps Engineer", avatar: "A", color: "#C09840", bg: "rgba(192,152,64,0.10)", tasks: ["CI/CD", "K8s"], stack: ["Docker", "AWS"], status: "online", joinDate: "2025.01" },
];

const PART_CONFIG: Record<string, any> = {
  all: { labelKo: "전체", icon: Globe, color: "#41431B", bg: "rgba(65,67,27,0.08)" },
  frontend: { labelKo: "프론트엔드", icon: Code2, color: "#5A8A4A", bg: "rgba(90,138,74,0.08)" },
  backend: { labelKo: "백엔드", icon: Server, color: "#41431B", bg: "rgba(65,67,27,0.08)" },
  qa: { labelKo: "QA", icon: ShieldCheck, color: "#B85450", bg: "rgba(184,84,80,0.08)" },
  devops: { labelKo: "DevOps", icon: Wrench, color: "#C09840", bg: "rgba(192,152,64,0.08)" },
};

// ── 보조 컴포넌트 ──────────────────────────────────────

function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const m = PROJECT_TEAM.find(x => x.name === name);
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold`} style={{ background: m?.bg || "rgba(0,0,0,0.05)", color: m?.color || "#888" }}>
      {name[0]}
    </div>
  );
}

function MessageBubble({ msg, onViewDoc }: { msg: ChatMessage; onViewDoc?: () => void }) {
  const isMe = msg.role === "me";
  if (msg.type === "briefing" && msg.briefing) return <DocBriefingBubble briefing={msg.briefing} savedToDoc={true} onViewDoc={onViewDoc} time={msg.time} />;
  if (msg.type === "system") return <div className="flex justify-center my-3"><span className="text-[9px] px-3 py-1 bg-black/5 text-gray-400 rounded-full">{msg.content}</span></div>;
  return (
    <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"} items-end mb-4`}>
      {!isMe && <Avatar name={msg.sender} />}
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isMe && <span className="text-[9px] text-gray-500 px-1">{msg.sender}</span>}
        <div className={`rounded-2xl px-4 py-2.5 text-[11px] leading-relaxed ${isMe ? "bg-[#41431B] text-white shadow-lg shadow-[#41431B]/10" : "bg-white border shadow-sm"}`} style={{ borderColor: BORDER }}>
          {msg.content}
        </div>
        <span className="text-[8px] text-gray-400 px-1">{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

function AIMessageBubble({ msg }: { msg: AIMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-5`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: isUser ? "#F3F4F6" : "#41431B" }}>
        {isUser ? <User className="w-4 h-4 text-gray-500" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        {!isUser && <span className="text-[10px] font-bold text-[#41431B]">WE&AI Assistant</span>}
        <div className={`rounded-2xl px-4 py-3 text-[11px] leading-relaxed ${isUser ? "bg-[#41431B] text-white" : "bg-white border shadow-sm"}`} style={{ borderColor: BORDER }}>
          {msg.content}
        </div>
        <span className="text-[8px] text-gray-400">{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

function DocCard({ doc, onOpen }: { doc: MeetingDoc; onOpen: () => void }) {
  return (
    <div onClick={onOpen} className="bg-white border p-4 rounded-2xl cursor-pointer hover:border-[#AEB784] hover:shadow-md transition-all mb-3 group">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[12px] font-bold text-[#1A1C06] group-hover:text-[#41431B]">{doc.title}</p>
        <span className="text-[9px] text-gray-400">{formatDate(doc.createdAt)}</span>
      </div>
      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{doc.summary}</p>
    </div>
  );
}

function DocDetailModal({ doc, onClose }: { doc: MeetingDoc; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-[#F8F7F5]">
          <div><p className="text-sm font-bold text-[#1A1C06]">{doc.title}</p><p className="text-[10px] text-gray-500 mt-1">{formatDate(doc.createdAt)} 생성됨</p></div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 text-[12px] leading-[1.8] text-gray-700 whitespace-pre-wrap">{doc.summary}</div>
      </div>
    </div>
  );
}

// ── 메인 ChatPage 컴포넌트 ─────────────────────────────

export function ChatPage({ onDocsUpdate }: { onDocsUpdate?: (count: number) => void }) {
  const [mainTab, setMainTab] = useState<"chat" | "ai" | "docs">("chat");
  const [partTab, setPartTab] = useState<PartId>("all");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [aiInput, setAIInput] = useState("");
  const [docs, setDocs] = useState<MeetingDoc[]>([]);
  const [openDoc, setOpenDoc] = useState<MeetingDoc | null>(null);

  // ★ 더미 데이터를 초기 상태로 로드하도록 수정 ★
  const [partMessages, setPartMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const savedMsgs = loadMessages();
    // 'all' 채널에 기본 메시지들을 할당
    return { all: savedMsgs };
  });

  const [aiMessages, setAIMessages] = useState<AIMsg[]>([
    { id: "1", role: "ai", content: "안녕하세요! 프로젝트 도우미 AI입니다. 궁금한 것을 물어보세요.", time: new Date().toISOString() }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChannels(loadChannels());
    setDocs(loadDocs());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [partMessages, partTab]);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const handleCreateChannel = (name: string, ids: string[]) => {
    const newChan = addChannel(name, ids);
    setChannels(prev => [...prev, newChan]);
    
    const sysMsg: ChatMessage = { 
      id: genId(), sender: "System", avatar: "S", role: "other", 
      content: `'${name}' 채널이 생성되었습니다.`, time: new Date().toISOString(), type: "system" 
    };
    setPartMessages(prev => ({ ...prev, [newChan.id]: [sysMsg] }));
    setPartTab(newChan.id);
    setIsModalOpen(false);
  };

  const handleDeleteChannel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("이 채팅방을 삭제하시겠습니까?")) return;
    deleteChannel(id);
    setChannels(prev => prev.filter(c => c.id !== id));
    if (partTab === id) setPartTab("all");
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = { 
      id: genId(), sender: "병권", avatar: "병", role: "me", 
      content: input, time: new Date().toISOString(), type: "text" 
    };
    setPartMessages(prev => ({ ...prev, [partTab]: [...(prev[partTab] || []), msg] }));
    setInput("");
  };

  const handleAISend = () => {
    if (!aiInput.trim()) return;
    const userMsg: AIMsg = { id: genId(), role: "user", content: aiInput, time: new Date().toISOString() };
    setAIMessages(prev => [...prev, userMsg]);
    setAIInput("");
    setTimeout(() => {
      const aiRes: AIMsg = { id: genId(), role: "ai", content: "프로젝트 데이터를 기반으로 답변을 생성 중입니다...", time: new Date().toISOString() };
      setAIMessages(prev => [...prev, aiRes]);
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8F7F4] relative overflow-hidden">
      
      {/* 상단 탭 */}
      <div className="flex h-12 border-b bg-white px-6 items-center gap-6 shrink-0" style={{ borderColor: BORDER }}>
        {["chat", "ai", "docs"].map((t: any) => (
          <button key={t} onClick={() => setMainTab(t)} className={`text-[12px] font-black h-full border-b-2 px-1 transition-all uppercase ${mainTab === t ? "border-[#41431B] text-[#41431B]" : "border-transparent text-gray-300"}`}>{t}</button>
        ))}
      </div>

      {mainTab === "chat" && (
        <>
          {/* 채널 탭 바 */}
          <div className="flex h-11 border-b bg-[#F8F7F4] items-center px-4 gap-1.5 overflow-x-auto no-scrollbar shrink-0" style={{ borderColor: BORDER }}>
            {channels.map(ch => {
              const cfg = PART_CONFIG[ch.id] || { labelKo: ch.label, icon: Hash, color: "#888A62", bg: "rgba(0,0,0,0.04)" };
              const Icon = cfg.icon;
              return (
                <div key={ch.id} className="relative group">
                  <button onClick={() => setPartTab(ch.id)} className={`flex items-center gap-1.5 pl-3.5 pr-8 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border ${partTab === ch.id ? "bg-[#AEB784]/20 text-[#41431B] border-[#AEB784]/30" : "text-gray-400 border-transparent hover:bg-gray-100"}`}>
                    <Icon className="w-3 h-3 opacity-40" />
                    {cfg.labelKo}
                  </button>
                  {ch.isCustom && (
                    <button onClick={(e) => handleDeleteChannel(e, ch.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={() => setIsModalOpen(true)} className="p-2 rounded-full hover:bg-white text-[#888A62] transition-all ml-1"><Plus className="w-4 h-4" /></button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-1">
            {(partMessages[partTab] || []).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                <MessageCircle className="w-12 h-12 mb-2" />
                <p className="text-xs font-bold">대화를 시작해보세요</p>
              </div>
            )}
            {(partMessages[partTab] || []).map(m => <MessageBubble key={m.id} msg={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="p-4 bg-white border-t flex gap-3 items-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)]" style={{ borderColor: BORDER }}>
            <div className="p-2 text-gray-400 cursor-pointer hover:bg-gray-50 rounded-xl transition-all"><Paperclip className="w-5 h-5" /></div>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="메시지를 입력하세요..." className="flex-1 bg-[#F3F4F6] px-5 py-3 rounded-[20px] text-[12px] outline-none" />
            <button onClick={handleSend} className="w-10 h-10 rounded-full bg-[#41431B] flex items-center justify-center shadow-lg text-white hover:scale-105 transition-all"><Send className="w-5 h-5" /></button>
          </div>
        </>
      )}

      {mainTab === "ai" && (
        <div className="flex-1 flex flex-col p-6 bg-white">
          <div className="flex-1 overflow-y-auto pr-2">
            {aiMessages.map(m => <AIMessageBubble key={m.id} msg={m} />)}
            <div ref={aiBottomRef} />
          </div>
          <div className="mt-6 flex gap-3 items-center bg-[#F9FAFB] p-3 rounded-[24px] border">
            <Bot className="w-5 h-5 text-[#41431B] ml-2" />
            <input value={aiInput} onChange={e => setAIInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAISend()} placeholder="AI에게 질문하기..." className="flex-1 bg-transparent px-2 text-[12px] outline-none" />
            <button onClick={handleAISend} className="p-2.5 bg-[#41431B] rounded-full text-white"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {mainTab === "docs" && (
        <div className="flex-1 p-8 overflow-y-auto bg-[#F8F7F4]">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-sm font-black text-[#41431B] mb-6 flex items-center gap-2 uppercase tracking-widest"><FileText className="w-4 h-4" /> Project Documents</h3>
            {docs.map(d => <DocCard key={d.id} doc={d} onOpen={() => setOpenDoc(d)} />)}
          </div>
        </div>
      )}

      {isModalOpen && <CreateChatModal onClose={() => setIsModalOpen(false)} onCreate={handleCreateChannel} />}
      {openDoc && <DocDetailModal doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  );
}