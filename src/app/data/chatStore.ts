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
  briefing?: BriefingData;   // type="briefing" 일 때
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

// ── AI 문서 브리핑 데이터 타입 ──────────────────────────────
export type BriefingKeyPoint = {
  icon:  string;   // 이모지
  label: string;   // 한글 레이블
  text:  string;   // 설명
};

export type BriefingData = {
  id:          string;
  fileName:    string;
  fileExt:     string;
  docType:     string;    // 문서 유형 (예: Spring Controller, 환경 설정...)
  purpose:     string;    // 문서 목적 (1~2줄)
  keyPoints:   BriefingKeyPoint[];
  techStack:   string[];
  actionItems: string[];  // 필요 조치 사항
  riskLevel:   "low" | "medium" | "high";
  savedDocId?: string;    // 저장된 MeetingDoc ID
};

// ── 파일별 브리핑 템플릿 ──────────────────────────────────────
function matchTemplate(fileName: string, ext: string): BriefingData {
  const name = fileName.toLowerCase().replace(/\.[^.]+$/, "");
  const id   = genId();

  // ── Java — Controller ──
  if (ext === "java" && /controller/i.test(name)) return {
    id, fileName, fileExt: ext,
    docType:  "Spring MVC 컨트롤러",
    purpose:  "멀티에이전트 오케스트레이션 REST API 엔드포인트 정의 및 에이전트 상태 관리 클래스입니다. 기존 ArrayList 방식을 ConcurrentHashMap으로 전환하여 스레드 안전성을 확보했습니다.",
    keyPoints: [
      { icon: "🔒", label: "스레드 안전성",  text: "ConcurrentHashMap 기반 에이전트 레지스트리로 동시 접근 충돌 원천 차단" },
      { icon: "🔧", label: "의존성 주입",    text: "@Autowired AgentScheduler — 스케줄링 관심사를 컨트롤러에서 완전 분리" },
      { icon: "📡", label: "API 엔드포인트", text: "GET /status — 에이전트 목록을 이름순 정렬(Comparator.comparing)로 반환" },
      { icon: "⚡", label: "성능 영향",      text: "기존 동기 블록 대비 락 경합 제거로 고부하 환경에서 처리량 향상 기대" },
    ],
    techStack:   ["Spring Boot 3.2", "Java 17", "ConcurrentHashMap", "REST API", "@Autowired"],
    actionItems: ["병권님 PR 리뷰 후 main 머지", "AGT-01~06 동시 호출 통합 테스트 필요", "서연님 — 레이스 컨디션 재현 테스트 케이스 업데이트"],
    riskLevel: "medium",
  };

  // ── Java — Agent ──
  if (ext === "java" && /agent/i.test(name)) return {
    id, fileName, fileExt: ext,
    docType:  "멀티에이전트 컴포넌트",
    purpose:  "Agent 인터페이스를 구현하는 데이터 동기화 에이전트 클래스입니다. RestTemplate 기반으로 외부 엔드포인트에서 데이터를 페치하고 구조화된 상태를 보고합니다.",
    keyPoints: [
      { icon: "🤖", label: "에이전트 ID",    text: `AGENT_ID = "${name.replace(/agent/i, "").trim() || "AGT"}-01" — 시스템 내 고유 식별자` },
      { icon: "🌐", label: "데이터 페치",    text: "RestTemplate.getForEntity() — HTTP 2xx 성공 시 레코드 수 로깅 처리" },
      { icon: "📊", label: "상태 보고",      text: "AgentStatus.builder() 패턴 — id, name, status 필드 구조화 반환" },
      { icon: "🪵", label: "Slf4j 로깅",    text: "@Slf4j — 페치 시작/완료/실패 단계별 로그 출력으로 운영 가시성 확보" },
    ],
    techStack:   ["Java 17", "Spring Boot", "@Component", "RestTemplate", "Slf4j", "Lombok"],
    actionItems: ["Admin — Docker 컨테이너 환경 변수 주입 확인", "retryOnFailure 로직 추가 권고", "Agent Health Check 엔드포인트 연동 필요"],
    riskLevel: "low",
  };

  // ── Java — Service ──
  if (ext === "java" && /service|repository|mapper/i.test(name)) return {
    id, fileName, fileExt: ext,
    docType:  "Spring 서비스 레이어",
    purpose:  "비즈니스 로직을 캡슐화하는 @Service 컴포넌트입니다. Repository 레이어와 Controller 사이의 트랜잭션 경계를 관리합니다.",
    keyPoints: [
      { icon: "🔄", label: "트랜잭션",      text: "@Transactional 어노테이션으로 데이터 일관성 보장" },
      { icon: "🏗️", label: "아키텍처",      text: "Repository 패턴으로 데이터 접근 추상화 — 테스트 용이성 향상" },
      { icon: "✅", label: "유효성 검사",   text: "입력 데이터 Bean Validation 적용 (@Valid, @NotNull)" },
      { icon: "📌", label: "DI 구조",       text: "생성자 주입 방식으로 불변성 및 테스트 가능성 확보" },
    ],
    techStack:   ["Spring Boot", "@Service", "@Transactional", "JPA", "Bean Validation"],
    actionItems: ["단위 테스트 (Mockito) 작성 필요", "서연님 — 서비스 레이어 테스트 커버리지 확인"],
    riskLevel: "low",
  };

  // ── YML / YAML — 환경 설정 ──
  if (ext === "yml" || ext === "yaml") return {
    id, fileName, fileExt: ext,
    docType:  "Spring 환경 설정",
    purpose:  "Spring Boot 애플리케이션의 데이터소스, 에이전트 스레드 풀, 재시도 정책, 로깅 등 런타임 설정을 정의합니다. 개발(dev) 프로파일 전용 설정입니다.",
    keyPoints: [
      { icon: "🗄️", label: "데이터소스",    text: "H2 인메모리 DB — weaidb, DB_CLOSE_DELAY=-1로 세션 간 데이터 유지" },
      { icon: "⚙️", label: "에이전트 설정", text: "max-threads: 6, retry-delay-ms: 5000 — 동시 실행 및 재시도 정책" },
      { icon: "📝", label: "로깅",          text: "agent-events: true — 에이전트 이벤트 상세 로그 활성화" },
      { icon: "🔀", label: "프로파일",      text: "spring.profiles.active: dev — 로컬/CI 환경 분리 전략 적용" },
    ],
    techStack:   ["Spring Boot", "H2 Database", "YAML", "Spring Profiles", "Actuator"],
    actionItems: ["staging/prod 프로파일 분리 필요", "민감 값 환경 변수 또는 Vault로 이관 권고", "Admin — 쿠버네티스 ConfigMap 동기화 확인"],
    riskLevel: "medium",
  };

  // ── Gradle ──
  if (ext === "gradle") return {
    id, fileName, fileExt: ext,
    docType:  "Gradle 빌드 스크립트",
    purpose:  "프로젝트 의존성 관리 및 빌드 설정 파일입니다. Java 17 툴체인 마이그레이션과 Spring AI, Jackson, Actuator 의존성이 추가되었습니다.",
    keyPoints: [
      { icon: "☕", label: "JDK 마이그레이션", text: "sourceCompatibility → JavaLanguageVersion.of(17) 툴체인 방식으로 전환" },
      { icon: "🤖", label: "Spring AI 추가",  text: "spring-ai-core:0.8.1 — 멀티에이전트 AI 파이프라인 기반 의존성" },
      { icon: "🔌", label: "Actuator 추가",   text: "spring-boot-starter-actuator — 헬스체크 /actuator/health 엔드포인트 활성화" },
      { icon: "📦", label: "Jackson 업그레이드", text: "jackson-databind:2.15.2 — JSON 직렬화 보안 취약점 패치 버전" },
    ],
    techStack:   ["Gradle 8.7", "Java 17", "Spring AI", "Spring Actuator", "Jackson 2.15"],
    actionItems: ["Admin — CI Jenkins 파이프라인 JDK 버전 확인 필요", "기존 빌드 캐시 무효화 후 클린 빌드 권고"],
    riskLevel: "medium",
  };

  // ── TypeScript / TSX ──
  if (ext === "ts" || ext === "tsx") {
    const isHook = /use[A-Z]/.test(name);
    return {
      id, fileName, fileExt: ext,
      docType: isHook ? "React 커스텀 훅" : "React 컴포넌트",
      purpose: isHook
        ? `${fileName} — 실시간 폴링 기반 커스텀 훅입니다. 3초 인터벌로 에이전트 상태를 자동 갱신하며, 언마운트 시 인터벌을 안전하게 정리합니다.`
        : `${fileName} — 에이전트 대시보드 UI 컴포넌트입니다. Motion 라이브러리를 활용한 레이아웃 애니메이션과 useCallback 메모이제이션이 적용되어 있습니다.`,
      keyPoints: isHook ? [
        { icon: "🔄", label: "실시간 폴링",    text: "setInterval 3000ms 주기 자동 갱신 — unmount 시 clearInterval 클린업" },
        { icon: "🔷", label: "타입 안전성",    text: "AgentStatus 유니온 타입 — running | idle | error | stopped 상태 정의" },
        { icon: "⚛️", label: "React 훅",       text: "useState + useEffect + useRef 조합으로 사이드 이펙트 관리" },
        { icon: "🌐", label: "API 연동",       text: "/api/agents/status?project={id} — 프로젝트별 에이전트 상태 조회" },
      ] : [
        { icon: "🎬", label: "Motion 애니메이션", text: "motion.div layout 애니메이션 — 컴포넌트 크기 변화 자동 보간" },
        { icon: "🖱️", label: "인터랙션",       text: "클릭 시 확장/축소 토글 — useCallback 메모이제이션으로 렌더 최적화" },
        { icon: "🎨", label: "UI 구조",        text: "agent-header — Bot 아이콘 + 이름 표시, Cpu 메트릭 영역 포함" },
        { icon: "📱", label: "반응형",         text: "Tailwind CSS 유틸리티 클래스 기반 반응형 레이아웃 적용" },
      ],
      techStack: isHook
        ? ["React 18", "TypeScript", "Custom Hook", "REST API", "Polling"]
        : ["React 18", "TypeScript", "Motion/React", "Tailwind CSS", "lucide-react"],
      actionItems: isHook
        ? ["민준님 — 채팅 UI WebSocket 연동 시 폴링 훅 대체 고려", "에러 상태 핸들링 추가 권고"]
        : ["지수님 — Storybook 스토리 추가 예정", "스냅샷 테스트 업데이트 필요"],
      riskLevel: "low",
    };
  }

  // ── ENV 파일 ──
  if (ext === "env") return {
    id, fileName, fileExt: ext,
    docType:  "환경 변수 파일",
    purpose:  "로컬 개발 환경 전용 환경 변수 파일입니다. DB 접속 정보, API 키, 시크릿 등 민감한 설정값을 포함합니다. 절대 Git에 커밋하지 마세요.",
    keyPoints: [
      { icon: "🔑", label: "보안 주의",   text: ".gitignore 등록 여부 반드시 확인 — 유출 시 즉시 값 갱신 필요" },
      { icon: "🌍", label: "환경 분리",   text: ".env.dev / .env.staging / .env.prod 파일 분리 전략 권고" },
      { icon: "🔒", label: "민감 데이터", text: "DB 비밀번호, JWT 시크릿, API 키 포함 — Vault 또는 AWS Secrets Manager 이관 검토" },
      { icon: "📋", label: "문서화",      text: ".env.example 파일로 변수 목록만 공유 (실제 값 제외)" },
    ],
    techStack:   ["dotenv", "Spring Boot", "환경 변수", "Secret Management"],
    actionItems: ["Admin — .gitignore 등록 확인 즉시 처리", "프로덕션 배포 전 Secrets Manager 이관 필수", "팀 전체 env 파일 공유 방식 논의 필요"],
    riskLevel: "high",
  };

  // ── PDF ──
  if (ext === "pdf") return {
    id, fileName, fileExt: ext,
    docType:  "기술 문서 (PDF)",
    purpose:  `${name} — 프로젝트 관련 기술 사양 또는 아키텍처 문서입니다. 팀 전체가 참고해야 할 공식 문서입니다.`,
    keyPoints: [
      { icon: "📐", label: "아키텍처",     text: "멀티에이전트 시스템 전체 구조 및 컴포넌트 간 인터페이스 정의" },
      { icon: "📊", label: "성능 지표",    text: "에이전트별 처리 용량 및 SLA 기준 — 응답 시간 < 200ms (p95)" },
      { icon: "🔗", label: "인터페이스",   text: "REST API 엔드포인트 스펙 — OpenAPI 3.0 기준 정의" },
      { icon: "🗓️", label: "마일스톤",     text: "v1.0 릴리즈: 에이전트 기본 기능 / v1.5: AI 파이프라인 통합" },
    ],
    techStack:   ["Spring Boot", "REST API", "OpenAPI 3.0", "PostgreSQL", "Redis"],
    actionItems: ["전체 팀 리뷰 및 피드백 수집", "병권님 — API 스펙 Confluence 반영", "서연님 — 테스트 케이스 문서 기준으로 업데이트"],
    riskLevel: "low",
  };

  // ── Markdown ──
  if (ext === "md" || ext === "mdx") return {
    id, fileName, fileExt: ext,
    docType:  "마크다운 문서",
    purpose:  `${name} 관련 개발 가이드 또는 README 문서입니다. 설치 방법, 사용법, 기여 가이드를 포함합니다.`,
    keyPoints: [
      { icon: "📖", label: "개요",         text: "프로젝트 목적, 주요 기능, 기술 스택 소개 섹션 포함" },
      { icon: "🚀", label: "시작하기",     text: "로컬 개발 환경 셋업 단계별 가이드 (Prerequisites → Install → Run)" },
      { icon: "🤝", label: "기여 가이드",  text: "브랜치 전략, PR 규칙, 코드 리뷰 프로세스 정의" },
      { icon: "📝", label: "변경 이력",    text: "CHANGELOG 섹션 — 버전별 주요 변경사항 기록" },
    ],
    techStack:   ["Markdown", "GitHub", "Confluence", "Documentation"],
    actionItems: ["지수님 — Storybook 링크 및 UI 가이드 추가", "병권님 — API 문서 링크 업데이트"],
    riskLevel: "low",
  };

  // ── CSS ──
  if (ext === "css") return {
    id, fileName, fileExt: ext,
    docType:  "CSS 스타일시트",
    purpose:  "전역 스타일 또는 컴포넌트별 스타일 정의 파일입니다. 다크 모드 지원 및 CSS 변수 기반 테마 시스템이 포함되어 있습니다.",
    keyPoints: [
      { icon: "🎨", label: "CSS 변수",     text: "--color-* 커스텀 속성으로 테마 토큰 중앙 관리" },
      { icon: "🌙", label: "다크 모드",    text: "@media (prefers-color-scheme: dark) 미디어 쿼리 기반 자동 전환" },
      { icon: "📐", label: "레이아웃",     text: "CSS Grid / Flexbox 기반 반응형 레이아웃 시스템" },
      { icon: "✨", label: "트랜지션",     text: "초기 로드 시 깜빡임 방지 로직 적용 — transition 타이밍 최적화" },
    ],
    techStack:   ["CSS3", "CSS Variables", "Tailwind CSS", "Dark Mode"],
    actionItems: ["민준님 — 다크 모드 깜빡임 이슈 추가 재현 테스트", "디자인 토큰 Figma와 동기화 권고"],
    riskLevel: "low",
  };

  // ── 기본값 (알 수 없는 확장자) ──
  return {
    id, fileName, fileExt: ext,
    docType:  "기술 파일",
    purpose:  `${fileName} — WE&AI 프로젝트 관련 파일입니다. 팀 내 공유 및 검토가 필요한 문서입니다.`,
    keyPoints: [
      { icon: "📎", label: "파일 정보",    text: `확장자: .${ext} — 팀 내 공유 목적 업로드` },
      { icon: "👥", label: "공유 대상",    text: "해당 파트 팀원 및 리드 개발자 검토 권장" },
      { icon: "🔍", label: "검토 필요",    text: "내용 확인 후 관련 문서에 반영 또는 태스크 생성 권고" },
      { icon: "📅", label: "타임라인",     text: "이번 스프린트 내 검토 및 조치 사항 정리 필요" },
    ],
    techStack:   ["WE&AI", "문서 관리"],
    actionItems: ["담당자 확인 후 검토 진행", "관련 태스크 생성 권고"],
    riskLevel: "low",
  };
}

export function generateDocBriefing(fileName: string, ext: string): BriefingData {
  return matchTemplate(fileName, ext);
}

export function briefingToMeetingDoc(briefing: BriefingData): MeetingDoc {
  const now    = new Date();
  const points = briefing.keyPoints.map(k => `${k.icon} **${k.label}**: ${k.text}`).join("\n");
  const actions = briefing.actionItems.map(a => `• ${a}`).join("\n");

  const summary = [
    `📋 문서 유형: ${briefing.docType}`,
    ``,
    `📌 목적`,
    briefing.purpose,
    ``,
    `🔑 핵심 요약`,
    points,
    ``,
    `🔧 기술 스택`,
    briefing.techStack.join(", "),
    ``,
    `✅ 필요 조치`,
    actions,
  ].join("\n");

  const riskMap = { low: "낮음", medium: "중간", high: "높음" };

  return {
    id:         briefing.id,
    title:      `[AI 브리핑] ${briefing.fileName}`,
    createdAt:  now.toISOString(),
    summary,
    messages:   [],
    sourceFile: briefing.fileName,
    tags: [
      briefing.docType.split(" ")[0],
      briefing.fileExt.toUpperCase(),
      `리스크-${riskMap[briefing.riskLevel]}`,
      "AI브리핑",
      now.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }).replace(". ", "-").replace(".", ""),
    ],
  };
}

const CHAT_KEY = "weai_chat_messages_v1";
const DOCS_KEY = "weai_meeting_docs_v1";

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

// ── 초기 더미 문서 ──
const INITIAL_DOCS: MeetingDoc[] = [
  {
    id: "doc1",
    title: "2025-03-29 킥오프 회의",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    summary: "WE&AI 프로젝트 킥오프. Java 17 + Spring Boot 3 + Gradle 8.7 기술 스택 확정. 멀티에이전트 아키텍처 초안 공유. 역할 분담 결정.",
    messages: INITIAL_MESSAGES.slice(0, 4),
    tags: ["킥오프", "아키텍처", "역할분담"],
  },
  {
    id: "doc2",
    title: "2025-03-31 DataSync 리뷰",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    summary: "DataSyncAgent 배치 페치 로직 리뷰. retryOnFailure 구현 방향 결정. ParserAgent JSON 파싱 오류 이슈 파악 및 수정 계획 수립.",
    messages: INITIAL_MESSAGES.slice(4),
    tags: ["DataSync", "버그리뷰", "파서"],
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

export function loadDocs(): MeetingDoc[] {
  try {
    const s = localStorage.getItem(DOCS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return INITIAL_DOCS.map(d => ({ ...d }));
}

export function saveDocs(docs: MeetingDoc[]): void {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
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