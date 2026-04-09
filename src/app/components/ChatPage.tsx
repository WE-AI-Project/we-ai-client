import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Video, VideoOff, Send, Paperclip,
  FileText, X, CheckCircle2, Download, Mic, MicOff,
  Clock, Hash, Users, Loader2, Sparkles, Bot,
  Code2, Server, ShieldCheck, Wrench, Globe,
  User, ChevronRight, Search, BookOpen,
} from "lucide-react";
import {
  ChatMessage, MeetingDoc,
  loadDocs, saveDocs,
  generateMeetingSummary, formatTime, formatDate, genId,
  generateDocBriefing, briefingToMeetingDoc, type BriefingData,
} from "../data/chatStore";
import { DocBriefingBubble, BriefingLoadingBubble } from "./DocBriefingBubble";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_GREEN, UI_AMBER,
  OLIVE_DARK,
} from "../colors";

// ══════════════════════════════════════════════════════════
// 프로젝트 지식 데이터 (AI 탭에서 사용)
// ══════════════════════════════════════════════════════════
type PartId = "all" | "frontend" | "backend" | "qa" | "devops";

const PROJECT_TEAM = [
  {
    name: "병권", part: "Backend", partKo: "백엔드", partId: "backend" as PartId,
    role: "Backend Dev · Team Lead", avatar: "병",
    color: "#41431B", bg: "rgba(65,67,27,0.10)",
    tasks: ["Multi-Agent Controller", "Spring Boot API 설계", "DB 스키마 관리", "에이전트 오케스트레이션"],
    stack: ["Java 17", "Spring Boot 3.2", "PostgreSQL", "Redis"],
    status: "online",
    joinDate: "2025.01",
  },
  {
    name: "지수", part: "Frontend", partKo: "프론트엔드", partId: "frontend" as PartId,
    role: "Frontend Developer", avatar: "지",
    color: "#5A8A4A", bg: "rgba(90,138,74,0.10)",
    tasks: ["React 대시보드 UI", "컴포넌트 라이브러리", "칸반 보드", "데이터 시각화"],
    stack: ["React 18", "TypeScript", "Tailwind CSS", "Recharts"],
    status: "online",
    joinDate: "2025.01",
  },
  {
    name: "민준", part: "Frontend", partKo: "프론트엔드", partId: "frontend" as PartId,
    role: "Frontend Developer", avatar: "민",
    color: "#7A8B5A", bg: "rgba(122,139,90,0.10)",
    tasks: ["채팅 UI", "캘린더 페이지", "알림 시스템", "프로필 페이지"],
    stack: ["React 18", "TypeScript", "CSS Modules", "Socket.io"],
    status: "away",
    joinDate: "2025.02",
  },
  {
    name: "서연", part: "QA", partKo: "QA", partId: "qa" as PartId,
    role: "QA Engineer", avatar: "서",
    color: "#B85450", bg: "rgba(184,84,80,0.10)",
    tasks: ["테스트 자동화 구축", "QA 리포트 작성", "버그 추적·관리", "회귀 테스트"],
    stack: ["JUnit 5", "Playwright", "JMeter", "Allure"],
    status: "online",
    joinDate: "2025.01",
  },
  {
    name: "Admin", part: "DevOps", partKo: "DevOps", partId: "devops" as PartId,
    role: "DevOps Engineer", avatar: "A",
    color: "#C09840", bg: "rgba(192,152,64,0.10)",
    tasks: ["CI/CD 파이프라인", "Docker · Kubernetes", "서버 인프라 관리", "배포 자동화"],
    stack: ["Docker", "Kubernetes", "Jenkins", "AWS EC2"],
    status: "online",
    joinDate: "2025.01",
  },
];

type TeamMember = typeof PROJECT_TEAM[number];

const PART_CONFIG: Record<PartId, { label: string; labelKo: string; icon: any; color: string; bg: string }> = {
  all:      { label: "All",       labelKo: "전체",       icon: Globe,       color: "#41431B", bg: "rgba(65,67,27,0.08)"    },
  frontend: { label: "Frontend",  labelKo: "프론트엔드",  icon: Code2,       color: "#5A8A4A", bg: "rgba(90,138,74,0.08)"   },
  backend:  { label: "Backend",   labelKo: "백엔드",      icon: Server,      color: "#41431B", bg: "rgba(65,67,27,0.08)"    },
  qa:       { label: "QA",        labelKo: "QA",          icon: ShieldCheck, color: "#B85450", bg: "rgba(184,84,80,0.08)"   },
  devops:   { label: "DevOps",    labelKo: "DevOps",      icon: Wrench,      color: "#C09840", bg: "rgba(192,152,64,0.08)"  },
};

// ── 파트별 초기 메시지 ──
const PART_INITIAL_MESSAGES: Record<PartId, Omit<ChatMessage, "id" | "time">[]> = {
  all: [
    { sender: "Admin",  avatar: "A", role: "other", content: "안녕하세요 팀 여러분! 이번 스프린트 킥오프 미팅 일정 공유합니다. 내일 오전 10시 확인 부탁드려요.", type: "text" },
    { sender: "병권",   avatar: "병", role: "other", content: "확인했습니다! 백엔드 쪽 배포 관련해서도 논의할게 있어요.", type: "text" },
    { sender: "지수",   avatar: "지", role: "other", content: "네 저도 UI 쪽 진행 상황 공유할게요 👍", type: "text" },
    { sender: "서연",   avatar: "서", role: "other", content: "QA 리포트 최신 버전 올려드렸습니다. 검토 부탁드려요!", type: "text" },
  ],
  frontend: [
    { sender: "지수",   avatar: "지", role: "other", content: "대시보드 컴포넌트 PR 올렸어요. 리뷰 부탁드립니다!", type: "text" },
    { sender: "민준",   avatar: "민", role: "other", content: "채팅 UI WebSocket 연결 테스트 완료했습니다. 내일 머지 예정이에요.", type: "text" },
    { sender: "지수",   avatar: "지", role: "other", content: "Recharts 최신 버전 업데이트했는데 Bar 차트 렌더링 이슈 있어요. 확인해볼게요.", type: "text" },
    { sender: "민준",   avatar: "민", role: "other", content: "캘린더 페이지 모바일 반응형 작업 완료! 스토리북도 추가했어요 🎉", type: "text" },
  ],
  backend: [
    { sender: "병권",   avatar: "병", role: "other", content: "Multi-Agent Controller v1.2 배포 완료했습니다. AGT-01~06 모두 정상 작동 확인.", type: "text" },
    { sender: "병권",   avatar: "병", role: "other", content: "PostgreSQL 인덱스 최적화 작업 진행 중입니다. 쿼리 성능 약 40% 개선 예상.", type: "text" },
    { sender: "Admin",  avatar: "A", role: "other", content: "DB 마이그레이션 스크립트 준비했어요. 배포 전에 검토 한 번 해주세요 병권님!", type: "text" },
    { sender: "병권",   avatar: "병", role: "other", content: "확인할게요! Spring Security JWT 토큰 갱신 로직도 같이 리뷰해주세요.", type: "text" },
  ],
  qa: [
    { sender: "서연",   avatar: "서", role: "other", content: "v1.3 릴리즈 QA 결과: 총 42개 테스트 케이스 중 39개 통과. 3개 이슈 발견했습니다.", type: "text" },
    { sender: "서연",   avatar: "서", role: "other", content: "이슈 #124 — Multi-Agent 동시 실행 시 레이스 컨디션 발생. 백엔드 팀에 전달했어요.", type: "text" },
    { sender: "Admin",  avatar: "A", role: "other", content: "자동화 테스트 CI에 붙이는 작업 완료했어요! PR 열면 자동으로 테스트 돌아가요 서연님~", type: "text" },
    { sender: "서연",   avatar: "서", role: "other", content: "감사합니다! Playwright E2E 테스트 케이스도 추가 중이에요. 이번 주 내로 배포 예정 🚀", type: "text" },
  ],
  devops: [
    { sender: "Admin",  avatar: "A", role: "other", content: "쿠버네티스 클러스터 업그레이드 완료했습니다. v1.28 → v1.30 정상 전환 확인.", type: "text" },
    { sender: "Admin",  avatar: "A", role: "other", content: "Jenkins 파이프라인 빌드 시간 23분 → 14분으로 단축! 캐싱 레이어 추가 덕분이에요.", type: "text" },
    { sender: "병권",   avatar: "병", role: "other", content: "백엔드 배포 환경에서 메모리 누수 감지됐어요. 같이 확인해볼 수 있을까요?", type: "text" },
    { sender: "Admin",  avatar: "A", role: "other", content: "확인했어요! Heap dump 분석해보니 Redis 커넥션 풀 설정 문제로 보이네요. 수정 후 재배포할게요.", type: "text" },
  ],
};

// ── AI 응답 생성 ──
type AIResponseKind = "text" | "team" | "profile" | "status" | "tasks";
interface AIMsg {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  kind?: AIResponseKind;
  data?: any;
}

function getAIResponse(input: string): { content: string; kind: AIResponseKind; data?: any } {
  const q = input.toLowerCase();

  const profileMatch = PROJECT_TEAM.find(m =>
    q.includes(m.name.toLowerCase()) && (q.includes("프로필") || q.includes("profile") || q.includes("님") || q.includes("누구"))
  );
  if (profileMatch) {
    return { content: `**${profileMatch.name}** 님의 프로필입니다.`, kind: "profile", data: profileMatch };
  }

  if (q.includes("프론트") || q.includes("frontend") || q.includes("react") || q.includes("ui")) {
    const team = PROJECT_TEAM.filter(m => m.partId === "frontend");
    return { content: `프론트엔드 팀 담당자는 **${team.map(m => m.name).join(", ")}** 님입니다.`, kind: "team", data: { part: "frontend", members: team } };
  }
  if (q.includes("백엔드") || q.includes("backend") || q.includes("spring") || q.includes("java") || q.includes("api")) {
    const team = PROJECT_TEAM.filter(m => m.partId === "backend");
    return { content: `백엔드 팀 담당자는 **${team.map(m => m.name).join(", ")}** 님입니다.`, kind: "team", data: { part: "backend", members: team } };
  }
  if (q.includes("qa") || q.includes("테스트") || q.includes("버그") || q.includes("품질")) {
    const team = PROJECT_TEAM.filter(m => m.partId === "qa");
    return { content: `QA 팀 담당자는 **${team.map(m => m.name).join(", ")}** 님입니다.`, kind: "team", data: { part: "qa", members: team } };
  }
  if (q.includes("devops") || q.includes("배포") || q.includes("docker") || q.includes("ci") || q.includes("cd") || q.includes("인프라")) {
    const team = PROJECT_TEAM.filter(m => m.partId === "devops");
    return { content: `DevOps 팀 담당자는 **${team.map(m => m.name).join(", ")}** 님입니다.`, kind: "team", data: { part: "devops", members: team } };
  }
  if (q.includes("팀") || q.includes("team") || q.includes("멤버") || q.includes("member") || q.includes("전체") || q.includes("모두")) {
    return { content: `WE&AI 프로젝트 전체 팀원은 **${PROJECT_TEAM.length}명** 입니다.`, kind: "team", data: { part: "all", members: PROJECT_TEAM } };
  }
  if (q.includes("담당") || q.includes("맡") || q.includes("업무") || q.includes("task") || q.includes("어떤")) {
    if (q.includes("에이전트") || q.includes("agent") || q.includes("controller")) {
      const m = PROJECT_TEAM.find(p => p.tasks.some(t => t.toLowerCase().includes("agent") || t.includes("에이전트")));
      if (m) return { content: `**${m.name}** 님 (${m.role})이 에이전트 관련 업무를 담당하고 있어요.`, kind: "profile", data: m };
    }
    return { content: "팀별 담당 업무 현황입니다.", kind: "tasks", data: PROJECT_TEAM };
  }
  if (q.includes("현황") || q.includes("상태") || q.includes("진행") || q.includes("status") || q.includes("지금")) {
    return {
      content: "현재 WE&AI 프로젝트 현황입니다.", kind: "status",
      data: { sprint: "Agent Deployment v1.0", deadline: "2026-06-30", progress: 67, agents: { running: 3, total: 6 }, buildStatus: "PASS", openIssues: 5, completedTasks: 12 },
    };
  }
  if (q.includes("에이전트") || q.includes("agent") || q.includes("agt")) {
    return {
      content: "현재 에이전트 운영 현황입니다. 6개 중 3개가 활성 상태예요.", kind: "status",
      data: { sprint: "Agent Deployment v1.0", deadline: "2026-06-30", progress: 67, agents: { running: 3, total: 6 }, buildStatus: "PASS", openIssues: 5, completedTasks: 12 },
    };
  }

  const fallbacks = [
    "프로젝트 데이터를 기반으로 답변드릴 수 있어요! \"백엔드 담당 누구야\", \"지수 님 프로필\", \"전체 팀 보여줘\" 등을 물어보세요.",
    "알고 싶은 정보를 구체적으로 질문해 주세요. 팀원 정보, 파트별 담당, 프로젝트 현황 등을 알 수 있어요.",
    "죄송해요, 해당 내용을 찾기 어렵네요. 팀원 이름이나 파트명을 포함해서 다시 질문해 주세요!",
    "프로젝트 학습 데이터에서 관련 정보를 찾고 있어요. 좀 더 구체적인 키워드로 질문해 주세요.",
  ];
  return { content: fallbacks[Math.floor(Math.random() * fallbacks.length)], kind: "text" };
}

// ══════════════════════════════════════════════════════════
// 아바타
// ══════════════════════════════════════════════════════════
function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const member = PROJECT_TEAM.find(m => m.name === name);
  const bg = member ? member.bg : "rgba(65,67,27,0.08)";
  const color = member ? member.color : OLIVE_DARK;
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center shrink-0`}
      style={{ background: bg }}
    >
      <span className="text-[10px] font-bold" style={{ color }}>{name[0]}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 프로필 카드 (AI 응답용)
// ══════════════════════════════════════════════════════════
function ProfileCard({ member }: { member: TeamMember }) {
  const cfg = PART_CONFIG[member.partId];
  const Icon = cfg.icon;
  return (
    <div className="rounded-2xl overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: member.bg, borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
          <span className="font-bold text-base" style={{ color: member.color }}>{member.avatar}</span>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: member.color }}>{member.name}</p>
          <p className="text-[10px]" style={{ color: "rgba(0,0,0,0.45)" }}>{member.role}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: cfg.bg }}>
          <Icon className="w-3 h-3" style={{ color: cfg.color }} />
          <span className="text-[9px] font-semibold" style={{ color: cfg.color }}>{member.partKo}</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>담당 업무</p>
        <div className="space-y-1">
          {member.tasks.map(t => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: member.color }} />
              <span className="text-[11px]" style={{ color: TEXT_PRIMARY }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {member.stack.map(s => (
            <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: member.bg, color: member.color }}>{s}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: member.status === "online" ? UI_GREEN : UI_AMBER }} />
          <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
            {member.status === "online" ? "온라인" : "자리 비움"} · 합류 {member.joinDate}
          </span>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ part, members }: { part: PartId; members: TeamMember[] }) {
  const cfg = PART_CONFIG[part];
  const Icon = cfg.icon;
  return (
    <div className="rounded-2xl overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: cfg.bg, borderBottom: `1px solid ${BORDER}` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        <p className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.labelKo} 팀 · {members.length}명</p>
      </div>
      <div className="divide-y" style={{ borderColor: BORDER }}>
        {members.map(m => (
          <div key={m.name} className="px-4 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: m.bg }}>
              <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.avatar}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{m.name}</p>
              <p className="text-[9px] truncate" style={{ color: TEXT_TERTIARY }}>{m.role}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {m.tasks.slice(0, 2).map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-md" style={{ background: m.bg, color: m.color }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCard({ data }: { data: any }) {
  const progress = data.progress as number;
  return (
    <div className="rounded-2xl overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(65,67,27,0.06)", borderBottom: `1px solid ${BORDER}` }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: OLIVE_DARK }} />
        <p className="text-[11px] font-semibold" style={{ color: OLIVE_DARK }}>프로젝트 현황 — {data.sprint}</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px]" style={{ color: TEXT_LABEL }}>전체 진행률</span>
            <span className="text-[11px] font-bold" style={{ color: OLIVE_DARK }}>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: OLIVE_DARK }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {[
            { label: "에이전트", value: `${data.agents.running}/${data.agents.total} 활성`, color: UI_GREEN },
            { label: "빌드 상태", value: data.buildStatus, color: data.buildStatus === "PASS" ? "#5A8A4A" : "#B85450" },
            { label: "완료 태스크", value: `${data.completedTasks}개`, color: OLIVE_DARK },
            { label: "오픈 이슈", value: `${data.openIssues}개`, color: "#C09840" },
          ].map(s => (
            <div key={s.label} className="px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] mb-0.5" style={{ color: TEXT_TERTIARY }}>{s.label}</p>
              <p className="font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>마감일: {data.deadline}</span>
        </div>
      </div>
    </div>
  );
}

function TasksCard({ members }: { members: TeamMember[] }) {
  return (
    <div className="rounded-2xl overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div className="px-4 py-2.5" style={{ background: "rgba(65,67,27,0.06)", borderBottom: `1px solid ${BORDER}` }}>
        <p className="text-[11px] font-semibold" style={{ color: OLIVE_DARK }}>파트별 담당 업무</p>
      </div>
      <div className="divide-y" style={{ borderColor: BORDER }}>
        {members.map(m => {
          const cfg = PART_CONFIG[m.partId];
          return (
            <div key={m.name} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: m.bg }}>
                  <span className="text-[8px] font-bold" style={{ color: m.color }}>{m.avatar}</span>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>{m.name}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: cfg.bg, color: cfg.color }}>{m.partKo}</span>
              </div>
              <div className="pl-7 space-y-0.5">
                {m.tasks.map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: m.color }} />
                    <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 채팅 메시지 버블
// ══════════════════════════════════════════════════════════
const FILE_COLOR: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(245,158,11,0.10)",  color: "#f59e0b" },
  ts:     { bg: "rgba(59,130,246,0.10)",  color: "#3b82f6" },
  tsx:    { bg: "rgba(6,182,212,0.10)",   color: "#06b6d4" },
  gradle: { bg: "rgba(99,91,255,0.10)",   color: ACCENT    },
  yml:    { bg: "rgba(16,185,129,0.10)",  color: "#10b981" },
  pdf:    { bg: "rgba(239,68,68,0.10)",   color: "#ef4444" },
  md:     { bg: "rgba(139,92,246,0.10)",  color: "#8b5cf6" },
};

function MessageBubble({ msg, onViewDoc }: { msg: ChatMessage; onViewDoc?: () => void }) {
  const isMe = msg.role === "me";

  // ── 브리핑 타입 ──
  if (msg.type === "briefing" && msg.briefing) {
    return (
      <DocBriefingBubble
        briefing={msg.briefing}
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
          <p className="text-[11px] leading-relaxed" style={{ color: isMe ? "rgba(255,255,255,0.95)" : TEXT_PRIMARY }}>
            {msg.content}
          </p>
        </div>
        <span className="text-[8px] px-1" style={{ color: TEXT_TERTIARY }}>{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

// ── AI 메시지 버블 ──
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
          <p className="text-[11px] leading-relaxed" style={{ color: isUser ? "rgba(255,255,255,0.95)" : TEXT_PRIMARY }}>
            {msg.content.replace(/\*\*/g, "")}
          </p>
        </div>
        {!isUser && msg.kind === "profile" && msg.data && <ProfileCard member={msg.data} />}
        {!isUser && msg.kind === "team" && msg.data && <TeamCard part={msg.data.part} members={msg.data.members} />}
        {!isUser && msg.kind === "status" && msg.data && <StatusCard data={msg.data} />}
        {!isUser && msg.kind === "tasks" && msg.data && <TasksCard members={msg.data} />}
        <span className="text-[8px] px-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

// ── 문서 카드 ──
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
            : <FileText  className="w-3 h-3" style={{ color: OLIVE_DARK }} />
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

// ── 문서 상세 모달 ──
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
const MEETING_MEMBERS = ["병권", "Admin", "QA Bot"];

export function ChatPage({ onDocsUpdate }: { onDocsUpdate?: (count: number) => void }) {
  const [mainTab,      setMainTab]      = useState<"chat" | "ai" | "docs">("chat");
  const [partTab,      setPartTab]      = useState<PartId>("all");
  const [partMessages, setPartMessages] = useState<Record<PartId, ChatMessage[]>>(() => {
    const init: Partial<Record<PartId, ChatMessage[]>> = {};
    (Object.keys(PART_INITIAL_MESSAGES) as PartId[]).forEach(p => {
      init[p] = PART_INITIAL_MESSAGES[p].map(m => ({
        ...m, id: genId(), time: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      }));
    });
    return init as Record<PartId, ChatMessage[]>;
  });
  const [docs,         setDocs]         = useState<MeetingDoc[]>(() => loadDocs());
  const [input,        setInput]        = useState("");
  const [aiInput,      setAIInput]      = useState("");
  const [isMeeting,    setIsMeeting]    = useState(false);
  const [meetingStart, setMeetingStart] = useState<Date | null>(null);
  const [meetingMsgs,  setMeetingMsgs]  = useState<ChatMessage[]>([]);
  const [elapsed,      setElapsed]      = useState(0);
  const [savingDoc,    setSavingDoc]    = useState(false);
  const [docSaved,     setDocSaved]     = useState(false);
  const [openDoc,      setOpenDoc]      = useState<MeetingDoc | null>(null);
  const [micOn,        setMicOn]        = useState(false);
  const [typing,       setTyping]       = useState(false);
  const [aiTyping,     setAITyping]     = useState(false);
  const [aiMessages,   setAIMessages]   = useState<AIMsg[]>([
    {
      id: genId(),
      role: "ai",
      content: "안녕하세요! WE&AI 프로젝트 AI 어시스턴트입니다 🤖\n\n프로젝트 전체 데이터를 학습했어요. 팀원 정보, 파트 담당, 업무 현황 등을 자유롭게 물어보세요!\n\n예: \"백엔드 담당 누구야?\", \"지수님 프로필 보여줘\", \"전체 팀원 알려줘\"",
      time: new Date().toISOString(),
      kind: "text",
    },
  ]);

  // ── 브리핑 상태 ──
  const [briefingLoading, setBriefingLoading] = useState<string | null>(null);
  const briefFileRef = useRef<HTMLInputElement>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const aiBottomRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [partMessages, partTab]);
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

  const addPartMessage = useCallback((msg: Omit<ChatMessage, "id" | "time">) => {
    const full: ChatMessage = { ...msg, id: genId(), time: new Date().toISOString() };
    setPartMessages(prev => ({ ...prev, [partTab]: [...(prev[partTab] || []), full] }));
    if (isMeeting) setMeetingMsgs(prev => [...prev, full]);
    return full;
  }, [partTab, isMeeting]);

  // ── 전체/파트 채팅 전송 ──
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (mainTab === "chat") {
      addPartMessage({ sender: "병권", avatar: "병", role: "me", content: text, type: "text" });
      setInput("");
      setTyping(true);
      const other = partTab === "all"
        ? PROJECT_TEAM[Math.floor(Math.random() * PROJECT_TEAM.length)]
        : PROJECT_TEAM.find(m => m.partId === partTab) ?? PROJECT_TEAM[0];
      const replies = [
        "네, 확인했습니다! 진행해볼게요.",
        "좋아요! 같이 검토해봐요.",
        "알겠습니다. 조금 더 확인해보겠습니다.",
        "수고했어요! 👍",
        "동의합니다. PR 올려주세요.",
      ];
      setTimeout(() => {
        setTyping(false);
        addPartMessage({ sender: other.name, avatar: other.avatar, role: "other", content: replies[Math.floor(Math.random() * replies.length)], type: "text" });
      }, 1000 + Math.random() * 800);
    }
  };

  // ── AI 채팅 전송 ──
  const handleAISend = () => {
    const text = aiInput.trim();
    if (!text || aiTyping) return;
    const userMsg: AIMsg = { id: genId(), role: "user", content: text, time: new Date().toISOString() };
    setAIMessages(prev => [...prev, userMsg]);
    setAIInput("");
    setAITyping(true);
    setTimeout(() => {
      const resp = getAIResponse(text);
      const aiMsg: AIMsg = {
        id: genId(), role: "ai",
        content: resp.content,
        time: new Date().toISOString(),
        kind: resp.kind,
        data: resp.data,
      };
      setAIMessages(prev => [...prev, aiMsg]);
      setAITyping(false);
    }, 800 + Math.random() * 600);
  };

  // ── 파일 공유 (일반) ──
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "file";
    addPartMessage({ sender: "병권", avatar: "병", role: "me", content: "", type: "file", fileName: file.name, fileType: ext });
    e.target.value = "";
  };

  // ── AI 문서 브리핑 업로드 ──
  const handleBriefingFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "file";
    e.target.value = "";

    // 1. 파일 공유 메시지 먼저
    addPartMessage({
      sender: "병권", avatar: "병", role: "me",
      content: "", type: "file",
      fileName: file.name, fileType: ext,
    });

    // 2. 로딩 상태 시작
    setBriefingLoading(file.name);
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, 80);

    // 3. AI 브리핑 생성 (2~3초 시뮬레이션)
    const delay = 2200 + Math.random() * 800;
    setTimeout(() => {
      const briefing   = generateDocBriefing(file.name, ext);
      const meetingDoc = briefingToMeetingDoc(briefing);

      // 로딩 해제 + 브리핑 메시지 추가
      setBriefingLoading(null);
      addPartMessage({
        sender: "WE&AI", avatar: "AI", role: "other",
        content: `📋 **${file.name}** 한글 브리핑이 완료됐습니다.`,
        type: "briefing",
        briefing,
      });

      // 4. Docs 저장
      setTimeout(() => {
        setDocs(prev => {
          const next = [meetingDoc, ...prev];
          saveDocs(next);
          return next;
        });
      }, 1200);
    }, delay);
  };

  // ── 회의 ──
  const startMeeting = () => {
    setIsMeeting(true); setMeetingStart(new Date()); setMeetingMsgs([]); setElapsed(0); setDocSaved(false);
    addPartMessage({ sender: "System", avatar: "S", role: "other", content: "🎙️ 회의 모드가 시작되었습니다.", type: "system" });
  };
  const endMeeting = () => {
    setIsMeeting(false); setMicOn(false);
    addPartMessage({ sender: "System", avatar: "S", role: "other", content: "⏹️ 회의 모드 종료. 문서로 저장 중...", type: "system" });
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

  const currentMessages = partMessages[partTab] ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {openDoc && <DocDetailModal doc={openDoc} onClose={() => setOpenDoc(null)} />}

      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(160deg, #f5f4ef 0%, #f0efe8 40%, #ede9df 100%)" }} />

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* ══ 메인 탭 바 ══ */}
        <div
          className="flex items-center gap-0 px-3 h-11 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}
        >
          <div className="flex items-center gap-0.5 mr-3">
            {[
              { id: "chat", icon: MessageCircle, label: "Chat" },
              { id: "ai",   icon: Bot,           label: "AI" },
              { id: "docs", icon: FileText,       label: `Docs${docs.length > 0 ? ` (${docs.length})` : ""}` },
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
            ))}
          </div>

          {/* 오른쪽: 회의 컨트롤 */}
          <div className="ml-auto flex items-center gap-2">
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
                  color:      isMeeting ? "#ef4444" : OLIVE_DARK,
                  border:     `1px solid ${isMeeting ? "rgba(239,68,68,0.2)" : "rgba(65,67,27,0.15)"}`,
                }}
              >
                {isMeeting ? <><VideoOff className="w-3.5 h-3.5" /> 회의 종료</> : <><Video className="w-3.5 h-3.5" /> 회의 시작</>}
              </button>
            )}
          </div>
        </div>

        {/* ══ CHAT 탭 ══ */}
        {mainTab === "chat" && (
          <>
            {/* 파트 서브탭 */}
            <div
              className="flex items-center gap-1 px-3 h-10 shrink-0 overflow-x-auto"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.95)" }}
            >
              {(Object.entries(PART_CONFIG) as [PartId, typeof PART_CONFIG[PartId]][]).map(([id, cfg]) => {
                const Icon = cfg.icon;
                const isActive = partTab === id;
                const memberCount = id === "all" ? PROJECT_TEAM.length : PROJECT_TEAM.filter(m => m.partId === id).length;
                return (
                  <button
                    key={id}
                    onClick={() => setPartTab(id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 transition-all"
                    style={{
                      background: isActive ? cfg.bg : "transparent",
                      color:      isActive ? cfg.color : TEXT_TERTIARY,
                      border:     `1px solid ${isActive ? "rgba(0,0,0,0.08)" : "transparent"}`,
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg.labelKo}
                    <span
                      className="text-[8px] px-1 py-0.5 rounded-full ml-0.5"
                      style={{ background: isActive ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)", color: isActive ? cfg.color : TEXT_TERTIARY }}
                    >
                      {memberCount}
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-1 shrink-0">
                {(partTab === "all" ? PROJECT_TEAM : PROJECT_TEAM.filter(m => m.partId === partTab)).slice(0, 4).map(m => (
                  <div
                    key={m.name}
                    title={`${m.name} — ${m.role}`}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: m.bg, border: `1px solid rgba(255,255,255,0.8)` }}
                  >
                    <span className="text-[7px] font-bold" style={{ color: m.color }}>{m.avatar}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 회의 배너 */}
            {isMeeting && (
              <div className="flex items-center gap-3 px-4 py-2 shrink-0"
                style={{ background: "rgba(184,84,80,0.07)", borderBottom: `1px solid rgba(184,84,80,0.12)` }}>
                <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "#ef4444" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#ef4444" }}>회의 진행 중</span>
                <div className="flex items-center gap-1.5 ml-2">
                  {MEETING_MEMBERS.map(m => (
                    <div key={m} className="flex items-center gap-1">
                      <Avatar name={m} size={5} />
                      <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{m}</span>
                    </div>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                  <Clock className="w-3 h-3" />{formatElapsed(elapsed)}
                </div>
              </div>
            )}

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "rgba(248,247,244,0.50)" }}>
              {currentMessages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onViewDoc={() => {
                    setMainTab("docs");
                  }}
                />
              ))}
              {/* AI 브리핑 로딩 버블 */}
              {briefingLoading && <BriefingLoadingBubble fileName={briefingLoading} />}
              {typing && (
                <div className="flex gap-2 items-end mb-3">
                  <Avatar name="Admin" />
                  <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.90)", border: `1px solid ${BORDER}` }}>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: TEXT_TERTIARY, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 입력창 */}
            <div className="shrink-0 p-3" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(250,249,246,0.98)" }}>
              <div className="flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.95)", border: `1px solid ${BORDER}` }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`${PART_CONFIG[partTab].labelKo} 채널에 메시지 입력...`}
                  rows={2}
                  className="flex-1 resize-none outline-none text-[11px] leading-relaxed"
                  style={{ background: "transparent", color: TEXT_PRIMARY }}
                />
                <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                  {/* 일반 파일 첨부 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg hover:bg-black/[0.05]"
                    title="파일 첨부"
                  >
                    <Paperclip className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />

                  {/* ✦ AI 문서 브리핑 버튼 */}
                  <button
                    onClick={() => briefFileRef.current?.click()}
                    disabled={!!briefingLoading}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all"
                    style={{
                      background: briefingLoading ? "rgba(0,0,0,0.04)" : "rgba(65,67,27,0.08)",
                      color:      briefingLoading ? TEXT_TERTIARY : OLIVE_DARK,
                      border:     `1px solid ${briefingLoading ? BORDER : "rgba(65,67,27,0.18)"}`,
                      cursor:     briefingLoading ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => { if (!briefingLoading) e.currentTarget.style.background = "rgba(65,67,27,0.14)"; }}
                    onMouseLeave={e => { if (!briefingLoading) e.currentTarget.style.background = "rgba(65,67,27,0.08)"; }}
                    title="AI 문서 한글 브리핑 생성"
                  >
                    {briefingLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <BookOpen className="w-3 h-3" />
                    }
                    {briefingLoading ? "분석 중..." : "AI 문서 분석"}
                  </button>
                  <input
                    ref={briefFileRef}
                    type="file"
                    className="hidden"
                    accept=".java,.ts,.tsx,.yml,.yaml,.gradle,.env,.pdf,.md,.mdx,.css,.txt,.json"
                    onChange={handleBriefingFile}
                  />

                  {/* 전송 버튼 */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
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
                <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>프로젝트 전체 데이터 학습됨 · 팀원 {PROJECT_TEAM.length}명</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: UI_GREEN }} />
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>온라인</span>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2 shrink-0 overflow-x-auto"
              style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(248,247,244,0.95)" }}
            >
              {[
                "전체 팀원 보여줘", "프론트엔드 담당 누구야?", "백엔드 팀 알려줘",
                "프로젝트 현황은?", "병권님 프로필", "담당 업무 목록",
              ].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    const r = getAIResponse(q);
                    setAIMessages(prev => [...prev, { id: genId(), role: "user", content: q, time: new Date().toISOString() }]);
                    setAITyping(true);
                    setTimeout(() => {
                      setAIMessages(p => [...p, { id: genId(), role: "ai", content: r.content, time: new Date().toISOString(), kind: r.kind, data: r.data }]);
                      setAITyping(false);
                    }, 700);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-medium whitespace-nowrap shrink-0 transition-all"
                  style={{ background: "rgba(65,67,27,0.07)", color: OLIVE_DARK, border: "1px solid rgba(65,67,27,0.12)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(65,67,27,0.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(65,67,27,0.07)"; }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "rgba(248,247,244,0.50)" }}>
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
                  placeholder="프로젝트 AI에게 질문하세요... (예: 지수님 프로필 보여줘)"
                  rows={2}
                  className="flex-1 resize-none outline-none text-[11px] leading-relaxed"
                  style={{ background: "transparent", color: TEXT_PRIMARY }}
                />
                <button
                  onClick={handleAISend}
                  disabled={!aiInput.trim() || aiTyping}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5"
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
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(65,67,27,0.08)", color: OLIVE_DARK }}
              >
                {docs.length}개 문서
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: OLIVE_DARK, opacity: 0.6 }} />
                <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>AI 한글화 문서 포함</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5" style={{ background: "rgba(248,247,244,0.50)" }}>
              {docs.length === 0 ? (
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
