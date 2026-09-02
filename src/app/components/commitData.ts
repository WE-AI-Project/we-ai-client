// ── SynAIpse 공유 Diff / Commit 데이터 (GitHub 실제 커밋 내역 기반) ──

export type DiffLineType = "added" | "removed" | "context" | "hunk";
export type FileStatus   = "modified" | "added" | "deleted";

export type DiffLine = {
  type:    DiffLineType;
  oldNum?: number;
  newNum?: number;
  content: string;
};

export type CommitFile = {
  id:        string;
  name:      string;
  path:      string;
  ext:       string;
  status:    FileStatus;
  additions: number;
  deletions: number;
  diff:      DiffLine[];
};

export type Commit = {
  id:      string;
  hash:    string;
  message: string;
  author:  string;
  time:    string;
  repo:    "backend" | "frontend";
  files:   CommitFile[];
};

// ──────────────────────────────────────────────
// SynAIpse 실제 Diff 내역
// ──────────────────────────────────────────────

const AI_COMMIT_CONTROLLER_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -1,15 +1,28 @@ package com.weai.server.domain.ai.commit;" },
  { type: "context", oldNum: 1,  newNum: 1,  content: "package com.weai.server.domain.ai.commit;" },
  { type: "context", oldNum: 2,  newNum: 2,  content: "" },
  { type: "added",               newNum: 3,  content: "import com.weai.server.domain.project.service.ProjectService;" },
  { type: "added",               newNum: 4,  content: "import com.weai.server.global.dto.ApiResponse;" },
  { type: "added",               newNum: 5,  content: "import io.swagger.v3.oas.annotations.Operation;" },
  { type: "context", oldNum: 3,  newNum: 6,  content: "import org.springframework.web.bind.annotation.*;" },
  { type: "hunk",    content: "@@ -18,7 +31,16 @@ public class AiCommitController {" },
  { type: "context", oldNum: 18, newNum: 31, content: "    private final AiCommitService aiCommitService;" },
  { type: "context", oldNum: 19, newNum: 32, content: "    private final ProjectService projectService;" },
  { type: "added",               newNum: 33, content: "" },
  { type: "added",               newNum: 34, content: "    @Operation(summary = \"AI 커밋 메시지 후보 생성\")" },
  { type: "added",               newNum: 35, content: "    @PostMapping(\"/commit\")" },
  { type: "added",               newNum: 36, content: "    public ApiResponse<AiCommitResponse> generate(" },
  { type: "added",               newNum: 37, content: "        Authentication authentication," },
  { type: "added",               newNum: 38, content: "        @Valid @RequestBody AiCommitRequest request" },
  { type: "added",               newNum: 39, content: "    ) {" },
  { type: "added",               newNum: 40, content: "        User user = authenticatedUser(authentication);" },
  { type: "added",               newNum: 41, content: "        projectService.validateProjectAccess(request.projectId(), user.getId());" },
  { type: "added",               newNum: 42, content: "        return ApiResponse.success(\"AI_COMMIT_SUCCESS\", \"커밋 메시지 생성 완료\", aiCommitService.generate(request.projectId(), request.diff(), request.files()));" },
  { type: "added",               newNum: 43, content: "    }" },
];

const CALENDAR_PAGE_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -15,8 +15,16 @@ import {" },
  { type: "removed", oldNum: 15,             content: "// import { loadSchedules, saveSchedules } from \"../data/scheduleStore\";" },
  { type: "added",               newNum: 15, content: "import { fetchProjectSchedules, createProjectSchedule, updateProjectSchedule, deleteProjectSchedule } from \"../lib/api\";" },
  { type: "context", oldNum: 16, newNum: 16, content: "" },
  { type: "hunk",    content: "@@ -505,12 +513,24 @@ export function CalendarPage({ projectId }: { projectId?: number }) {" },
  { type: "context", oldNum: 505, newNum: 513, content: "  useEffect(() => {" },
  { type: "removed", oldNum: 506,              content: "    setSchedules(loadSchedules());" },
  { type: "added",                newNum: 514, content: "    async function load() {" },
  { type: "added",                newNum: 515, content: "      if (!projectId) return;" },
  { type: "added",                newNum: 516, content: "      try {" },
  { type: "added",                newNum: 517, content: "        const res = await fetchProjectSchedules(projectId);" },
  { type: "added",                newNum: 518, content: "        setSchedules(mapBackendSchedules(res.schedules));" },
  { type: "added",                newNum: 519, content: "      } catch (err) {" },
  { type: "added",                newNum: 520, content: "        console.error(\"일정 조회 실패\", err);" },
  { type: "added",                newNum: 521, content: "      }" },
  { type: "added",                newNum: 522, content: "    }" },
  { type: "added",                newNum: 523, content: "    load();" },
  { type: "context", oldNum: 507, newNum: 524, content: "  }, [projectId]);" },
];

const CHAT_MEETING_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -45,10 +45,22 @@ public class ChatMeetingController {" },
  { type: "context", oldNum: 45, newNum: 45, content: "    @PostMapping(\"/meetings/start\")" },
  { type: "context", oldNum: 46, newNum: 46, content: "    public ApiResponse<MeetingResponse> startMeeting(" },
  { type: "removed", oldNum: 47,             content: "        @RequestParam Long projectId" },
  { type: "added",               newNum: 47, content: "        @PathVariable Long projectId," },
  { type: "added",               newNum: 48, content: "        @RequestBody StartMeetingRequest request" },
  { type: "context", oldNum: 48, newNum: 49, content: "    ) {" },
  { type: "added",               newNum: 50, content: "        Meeting meeting = chatMeetingService.startMeeting(projectId, request.title());" },
  { type: "added",               newNum: 51, content: "        return ApiResponse.success(\"MEETING_START_SUCCESS\", \"회의가 시작되었습니다.\", MeetingResponse.from(meeting));" },
  { type: "context", oldNum: 49, newNum: 52, content: "    }" },
];

const APPLICATION_YML_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -85,6 +85,12 @@ ai:" },
  { type: "context", oldNum: 85, newNum: 85, content: "ollama:" },
  { type: "context", oldNum: 86, newNum: 86, content: "  base-url: https://ollama.yhy-server.com/" },
  { type: "context", oldNum: 87, newNum: 87, content: "  models:" },
  { type: "added",               newNum: 88, content: "    qwen: qwen2.5-coder" },
  { type: "added",               newNum: 89, content: "    llama: llama3.1" },
  { type: "added",               newNum: 90, content: "    embedding: nomic-embed-text" },
  { type: "context", oldNum: 88, newNum: 91, content: "smart-commit:" },
  { type: "context", oldNum: 89, newNum: 92, content: "  idle-threshold: PT10M" },
];

const TASKS_PAGE_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -25,7 +25,18 @@ export function TasksPage({ projectId }: { projectId?: number }) {" },
  { type: "added",   newNum: 25, content: "  const [tasks, setTasks] = useState<ProjectSchedule[]>([]);" },
  { type: "added",   newNum: 26, content: "  const [loading, setLoading] = useState(true);" },
  { type: "added",   newNum: 27, content: "" },
  { type: "added",   newNum: 28, content: "  const handleStatusChange = async (scheduleId: number, status: ProjectScheduleStatus) => {" },
  { type: "added",   newNum: 29, content: "    await updateProjectScheduleStatus(projectId!, scheduleId, { status });" },
  { type: "added",   newNum: 30, content: "    loadTasks();" },
  { type: "added",   newNum: 31, content: "  };" },
];

// ──────────────────────────────────────────────
// CommitPanel 파일 목록 (Changes 페이지 스테이징 후보)
// ──────────────────────────────────────────────
export const CHANGE_FILES: CommitFile[] = [
  {
    id: "1",
    name: "AiCommitController.java",
    path: "we-ai-server/src/main/java/com/weai/server/domain/ai/commit/AiCommitController.java",
    ext: "java",
    status: "modified",
    additions: 15,
    deletions: 2,
    diff: AI_COMMIT_CONTROLLER_DIFF,
  },
  {
    id: "2",
    name: "CalendarPage.tsx",
    path: "we-ai-client/src/app/components/CalendarPage.tsx",
    ext: "tsx",
    status: "modified",
    additions: 12,
    deletions: 2,
    diff: CALENDAR_PAGE_DIFF,
  },
  {
    id: "3",
    name: "TasksPage.tsx",
    path: "we-ai-client/src/app/components/TasksPage.tsx",
    ext: "tsx",
    status: "modified",
    additions: 7,
    deletions: 0,
    diff: TASKS_PAGE_DIFF,
  },
  {
    id: "4",
    name: "ChatMeetingController.java",
    path: "we-ai-server/src/main/java/com/weai/server/domain/chat/controller/ChatMeetingController.java",
    ext: "java",
    status: "added",
    additions: 22,
    deletions: 0,
    diff: CHAT_MEETING_DIFF,
  },
  {
    id: "5",
    name: "application.yml",
    path: "we-ai-server/src/main/resources/application.yml",
    ext: "yml",
    status: "modified",
    additions: 4,
    deletions: 1,
    diff: APPLICATION_YML_DIFF,
  },
];

// ──────────────────────────────────────────────
// 실제 SynAIpse 백엔드 커밋 이력 (GitHub WE-AI-Project 기준)
// ──────────────────────────────────────────────
export const BACKEND_COMMITS: Commit[] = [
  {
    id: "c1",
    hash: "32012ac",
    author: "kimminhyeok0707",
    time: "10분 전",
    message: "Merge pull request #18 from WE-AI-Project/chating",
    repo: "backend",
    files: [
      { id: "f1", name: "ChatRoomController.java", path: "src/main/java/com/weai/server/domain/chat/controller/ChatRoomController.java", ext: "java", status: "modified", additions: 18, deletions: 4, diff: CHAT_MEETING_DIFF },
      { id: "f2", name: "ProjectDepartmentController.java", path: "src/main/java/com/weai/server/domain/project/controller/ProjectDepartmentController.java", ext: "java", status: "added", additions: 35, deletions: 0, diff: AI_COMMIT_CONTROLLER_DIFF },
    ],
  },
  {
    id: "c2",
    hash: "c2337a7",
    author: "kimminhyeok0707",
    time: "1시간 전",
    message: "채팅방 생성 API 및 프로젝트 부서 목록 조회 API 구현",
    repo: "backend",
    files: [
      { id: "f3", name: "ChatRoomService.java", path: "src/main/java/com/weai/server/domain/chat/service/ChatRoomService.java", ext: "java", status: "modified", additions: 24, deletions: 2, diff: CHAT_MEETING_DIFF },
    ],
  },
  {
    id: "c3",
    hash: "2409fbb",
    author: "kimminhyeok",
    time: "1일 전",
    message: "채팅 문서 업로드 api, 문서 브리핑 생성 api, 회의 모드 시작 api, 회의 종료 및 회의록 저장 api 구현",
    repo: "backend",
    files: [
      { id: "f4", name: "ChatMeetingController.java", path: "src/main/java/com/weai/server/domain/chat/controller/ChatMeetingController.java", ext: "java", status: "added", additions: 42, deletions: 0, diff: CHAT_MEETING_DIFF },
      { id: "f5", name: "AiDebateService.java", path: "src/main/java/com/weai/server/domain/ai/debate/AiDebateService.java", ext: "java", status: "modified", additions: 19, deletions: 5, diff: AI_COMMIT_CONTROLLER_DIFF },
    ],
  },
  {
    id: "c4",
    hash: "159d07a",
    author: "kimminhyeok",
    time: "2일 전",
    message: "빌드 태스크 목록 조회 api, 프로파일별 실행 명령 조회 api, ai qa 리포트 조회 api 구현",
    repo: "backend",
    files: [
      { id: "f6", name: "ProjectBuildController.java", path: "src/main/java/com/weai/server/domain/project/controller/ProjectBuildController.java", ext: "java", status: "added", additions: 52, deletions: 0, diff: AI_COMMIT_CONTROLLER_DIFF },
      { id: "f7", name: "AiQaController.java", path: "src/main/java/com/weai/server/domain/ai/qa/AiQaController.java", ext: "java", status: "modified", additions: 14, deletions: 3, diff: AI_COMMIT_CONTROLLER_DIFF },
    ],
  },
  {
    id: "c5",
    hash: "fcb30ca",
    author: "kimminhyeok",
    time: "3일 전",
    message: "채팅 api 3종 구현 및 AI 멀티에이전트 토론 SSE 스트리밍 연동",
    repo: "backend",
    files: [
      { id: "f8", name: "application.yml", path: "src/main/resources/application.yml", ext: "yml", status: "modified", additions: 12, deletions: 2, diff: APPLICATION_YML_DIFF },
      { id: "f9", name: "AiController.java", path: "src/main/java/com/weai/server/domain/ai/debate/AiController.java", ext: "java", status: "modified", additions: 28, deletions: 6, diff: AI_COMMIT_CONTROLLER_DIFF },
    ],
  },
];

// ──────────────────────────────────────────────
// 실제 SynAIpse 프론트엔드 커밋 이력 (GitHub WE-AI-Project 기준)
// ──────────────────────────────────────────────
export const FRONTEND_COMMITS: Commit[] = [
  {
    id: "cf1",
    hash: "a724613",
    author: "JiHyeon-9",
    time: "15분 전",
    message: "Merge pull request #43 from WE-AI-Project/Chat",
    repo: "frontend",
    files: [
      { id: "ff1", name: "ChatPage.tsx", path: "src/app/components/ChatPage.tsx", ext: "tsx", status: "modified", additions: 35, deletions: 12, diff: CALENDAR_PAGE_DIFF },
    ],
  },
  {
    id: "cf2",
    hash: "9aa90a7",
    author: "JiHyeon-9",
    time: "1시간 전",
    message: "remove DummyDate and connect real backend Chat APIs",
    repo: "frontend",
    files: [
      { id: "ff2", name: "ChatPage.tsx", path: "src/app/components/ChatPage.tsx", ext: "tsx", status: "modified", additions: 18, deletions: 42, diff: CALENDAR_PAGE_DIFF },
    ],
  },
  {
    id: "cf3",
    hash: "18ea091",
    author: "alsrudwns",
    time: "5시간 전",
    message: "프로젝트 설정 권한 및 멤버 관리 개선",
    repo: "frontend",
    files: [
      { id: "ff3", name: "ProjectSettingsPage.tsx", path: "src/app/components/ProjectSettingsPage.tsx", ext: "tsx", status: "modified", additions: 29, deletions: 8, diff: CALENDAR_PAGE_DIFF },
    ],
  },
  {
    id: "cf4",
    hash: "9739ea3",
    author: "JiHyeon-9",
    time: "1일 전",
    message: "Merge pull request #40 from WE-AI-Project/Calendar",
    repo: "frontend",
    files: [
      { id: "ff4", name: "CalendarPage.tsx", path: "src/app/components/CalendarPage.tsx", ext: "tsx", status: "modified", additions: 44, deletions: 15, diff: CALENDAR_PAGE_DIFF },
    ],
  },
  {
    id: "cf5",
    hash: "840ff35",
    author: "alsrudwns",
    time: "2일 전",
    message: "채팅방 나가기 기능 구현 및 메시지 목록 자동 스크롤 개선",
    repo: "frontend",
    files: [
      { id: "ff5", name: "ChatPage.tsx", path: "src/app/components/ChatPage.tsx", ext: "tsx", status: "modified", additions: 22, deletions: 4, diff: CALENDAR_PAGE_DIFF },
    ],
  },
];
