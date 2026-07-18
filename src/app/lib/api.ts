const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
const isDev = import.meta.env.DEV;
const isPreview = import.meta.env.VITE_IS_PREVIEW === "true";

const AUTH_SESSION_KEY = "weai_auth_session_v1";

export const AUTH_SESSION_EVENT = "weai:auth-session-changed";

export type ApiEnvelope<T> = {
  success: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
};

export type UserRole = "USER" | "ADMIN";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type ProjectDepartment =
  | "BACKEND"
  | "FRONTEND"
  | "QA"
  | "DEVOPS"
  | "AI"
  | "DATABASE"
  | "DESIGN"
  | "PM";
export type ProjectMemberRole = "LEADER" | "MEMBER" | "GUEST";
export type ProjectMemberStatus = "ACTIVE" | "LEFT" | "KICKED";
export type ProjectTechStackCategory =
  | "BACKEND"
  | "FRONTEND"
  | "DEVOPS"
  | "AI"
  | "DATABASE"
  | "BUILD_TOOL"
  | "LANGUAGE"
  | "ETC";
export type ProjectScheduleStatus = "TODO" | "IN_PROGRESS" | "DONE" | "COMPLETED" | "HOLD";
export type ProjectSchedulePriority = "LOW" | "MEDIUM" | "HIGH";
export type VerificationDeliveryChannel = "EMAIL" | "KAKAO_TALK";
export type SocialProvider = "kakao" | "naver" | "google";

export type CurrentUser = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresInSeconds: number;
  username: string;
  email: string;
  role: UserRole;
};

export type VerificationCodeDispatchResponse = {
  purpose: "EMAIL_LOGIN";
  deliveryChannel: VerificationDeliveryChannel;
  deliveryTarget: string;
  deliveryMode: string;
  expiresAt: string;
  debugCode?: string | null;
};

export type SocialAuthorizationUrlResponse = {
  provider: SocialProvider;
  authorizationUrl: string;
  state?: string | null;
};

export type MyProject = {
  projectId: number;
  projectName: string;
  description: string;
  projectCode: string;
  role: ProjectMemberRole;
  department: ProjectDepartment;
  status: ProjectStatus;
  techStacks: string[];
  deadlineDate?: string | null;
  daysRemaining?: number | null;
  memberCount: number;
  createdAt: string;
};

export type ProjectLaunchTarget = {
  projectId: number;
  projectName: string;
  projectCode: string;
  localPath?: string | null;
};

export type ProjectCreatePayload = {
  projectName: string;
  description?: string;
  repositoryUrl?: string;
  localPath: string;
  department: ProjectDepartment;
  deadlineDate?: string;
  techStacks?: ProjectTechStackInput[];
};

export type ProjectCreateResponse = {
  projectId: number;
  projectName: string;
  projectCode: string;
  repositoryUrl?: string | null;
  localPath?: string | null;
  deadlineDate?: string | null;
  daysRemaining?: number | null;
  techStackCount: number;
  techStacks: string[];
  role: ProjectMemberRole;
  department: ProjectDepartment;
  status: ProjectStatus;
  createdAt: string;
};

export type ProjectJoinPayload = {
  projectCode: string;
  department: ProjectDepartment;
};

export type ProjectJoinResponse = {
  projectId: number;
  projectName: string;
  projectCode: string;
  role: ProjectMemberRole;
  department: ProjectDepartment;
  joinedAt: string;
};

export type ProjectDetail = {
  projectId: number;
  projectName: string;
  description: string;
  projectCode: string;
  repositoryUrl?: string | null;
  localPath?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  targetDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDashboardDepartmentProgress = {
  department: ProjectDepartment;
  totalCount: number;
  completedCount: number;
  progressRate: number;
};

export type ProjectDashboardRecentSchedule = {
  scheduleId: number;
  title: string;
  department: ProjectDepartment;
  status: ProjectScheduleStatus;
  endDate?: string | null;
};

export type ProjectDashboard = {
  projectId: number;
  projectName: string;
  projectCode: string;
  status: ProjectStatus;
  startDate?: string | null;
  targetDate?: string | null;
  memberCount: number;
  scheduleCount: number;
  completedScheduleCount: number;
  progressRate: number;
  departmentProgress: ProjectDashboardDepartmentProgress[];
  recentSchedules: ProjectDashboardRecentSchedule[];
};

export type ProjectMember = {
  projectMemberId: number;
  userId: number;
  name: string;
  email: string;
  profileImageUrl?: string | null;
  role: ProjectMemberRole;
  department: ProjectDepartment;
  status: ProjectMemberStatus;
  joinedAt: string;
};

export type ProjectMemberList = {
  projectId: number;
  members: ProjectMember[];
};

export type ProjectTechStack = {
  techStackId: number;
  name: string;
  version: string;
  category: ProjectTechStackCategory;
  isRequired: boolean;
};

export type ProjectTechStackInput = {
  name: string;
  version?: string;
  category: ProjectTechStackCategory;
  isRequired?: boolean;
};

export type ProjectUpdatePayload = {
  projectName?: string;
  description?: string;
  repositoryUrl?: string;
  localPath?: string;
  startDate?: string | null;
  targetDate?: string | null;
  status?: ProjectStatus;
};

export type ProjectMemberRoleUpdatePayload = {
  role: ProjectMemberRole;
};

export type ProjectMemberDepartmentUpdatePayload = {
  department: ProjectDepartment;
};

export type ProjectStackDetection = {
  localPath: string;
  stack: string[];
  framework: string;
  language: string;
  build: string;
  techStacks: Array<{
    name: string;
    version?: string | null;
    category: ProjectTechStackCategory;
    isRequired: boolean;
  }>;
  detectedFiles: string[];
};

export type ProjectTechStackList = {
  projectId: number;
  techStacks: ProjectTechStack[];
};

export type ProjectSchedule = {
  scheduleId: number;
  title: string;
  description?: string | null;
  assigneeId: number;
  assigneeName: string;
  department: ProjectDepartment;
  startDate?: string | null;
  endDate?: string | null;
  priority: ProjectSchedulePriority;
  status: ProjectScheduleStatus;
  createdAt: string;
};

export type ProjectScheduleCreatePayload = {
  title: string;
  description?: string;
  assigneeId?: number | null;
  department: ProjectDepartment;
  startDate: string;
  endDate: string;
  priority?: ProjectSchedulePriority;
  status?: ProjectScheduleStatus;
};

export type ProjectScheduleUpdatePayload = {
  title?: string;
  description?: string | null;
  assigneeId?: number | null;
  department?: ProjectDepartment;
  startDate?: string | null;
  endDate?: string | null;
  priority?: ProjectSchedulePriority;
  status?: ProjectScheduleStatus;
};

export type ProjectScheduleStatusUpdatePayload = {
  status: ProjectScheduleStatus;
};

export type ProjectScheduleFilterParams = {
  department?: ProjectDepartment | null;
  status?: ProjectScheduleStatus | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type ProjectScheduleList = {
  projectId: number;
  schedules: ProjectSchedule[];
};

export type ProjectRepositoryType = "BACKEND" | "FRONTEND";
export type ProjectCommitFileStatus = "ADDED" | "MODIFIED" | "DELETED";

export type ProjectCommitSummary = {
  commitHash: string;
  shortCommitHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  changedFileCount: number;
  additions: number;
  deletions: number;
};

export type ProjectCommitList = {
  projectId: number;
  repositoryType: ProjectRepositoryType;
  limit: number;
  commits: ProjectCommitSummary[];
};

export type ProjectCommitDetail = {
  projectId: number;
  repositoryType: ProjectRepositoryType;
  commitHash: string;
  shortCommitHash: string;
  message: string;
  body?: string | null;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  changedFileCount: number;
  additions: number;
  deletions: number;
};

export type ProjectCommitChangedFile = {
  path: string;
  fileName: string;
  extension: string;
  status: ProjectCommitFileStatus;
  additions: number;
  deletions: number;
};

export type ProjectCommitFileList = {
  projectId: number;
  repositoryType: ProjectRepositoryType;
  commitHash: string;
  files: ProjectCommitChangedFile[];
};

export type ProjectCommitFileDiff = {
  projectId: number;
  repositoryType: ProjectRepositoryType;
  commitHash: string;
  filePath: string;
  fileName: string;
  extension: string;
  status: ProjectCommitFileStatus;
  additions: number;
  deletions: number;
  diff: string;
};

export type ProjectActivity = {  //프로젝트 최근 활동
  activityId: number;
  title: string;
  description?: string | null;
  activityType: string;
  memberId: number;
  memberName: string;
  createdAt: string;
};

export type ProjectActivityList = { //프로젝트 최근 활동
  projectId: number;
  activities: ProjectActivity[];
};

export async function fetchProjectActivities(projectId: number): Promise<ProjectActivityList> {  //프로젝트 최근 활동 함수
  return request<ProjectActivityList>(`/api/v1/projects/${projectId}/dashboard/activities`);
}

export type WeeklyProgressTrend = {  //프로젝트 진행률 통계 조회
  week: string;
  progressRate: number;
};

export type ProjectProgressStats = {  //프로젝트 진행률 통계 조회
  projectId: number;
  progressRate: number;
  weeklyTrends: WeeklyProgressTrend[];
};

export async function fetchProjectProgress(projectId: number): Promise<ProjectProgressStats> {  //프로젝트 진행률 통계 함수
  return request<ProjectProgressStats>(`/api/v1/projects/${projectId}/dashboard/progress`);
}

export type ProjectMilestone = {  //프로젝트 마일스톤 목록 조회
  milestoneId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: string; 
  progressRate: number;
};

export type ProjectMilestoneList = {  //프로젝트 마일스톤 목록 조회
  projectId: number;
  milestones: ProjectMilestone[];
};

export async function fetchProjectMilestones(projectId: number): Promise<ProjectMilestoneList> {  //프로젝트 마일스톤 목록 조회 함수
  return request<ProjectMilestoneList>(`/api/v1/projects/${projectId}/dashboard/milestones`);
}

export type DepartmentStatusDetail = {  //프로젝트 파트별 현황 조회
  department: ProjectDepartment;
  memberCount: number;
  totalScheduleCount: number;
  completedScheduleCount: number;
  progressRate: number;
  status: string;
};

export type ProjectDepartmentStatusList = {  //프로젝트 파트별 현황 조회
  projectId: number;
  departments: DepartmentStatusDetail[];
};

export interface MyActivitySummary {  //내 활동 요약 조회
  totalTasks: number;
  completedTasks: number;
  recentCommitsCount: number;
  lastActivityDate?: string | null;
}

export async function fetchMyActivitySummary(projectId: number | string): Promise<MyActivitySummary> {  //내 활동 요약 조회
  return request<MyActivitySummary>(`/api/v1/projects/${projectId}/dashboard/my-summary`);
}

export type MyActivity = {  //내 최근 활동 조회
  activityId: number;
  title: string;
  description?: string | null;
  activityType: string;
  memberName: string;
  createdAt: string;
};

export type MyActivityList = {  //내 최근 활동 조회
  projectId: number;
  activities: MyActivity[];
};

export async function fetchMyActivities(projectId: number | string): Promise<MyActivityList> {  //내 최근 활동 조회
  return request<MyActivityList>(`/api/v1/projects/${projectId}/dashboard/my-activities`);
}

export type TechEntryInput = {  //내 프로필 수정
  name: string;
  slug: string;
  variant: string;
};

export type ProfileUpdatePayload = {  //내 프로필 수정
  displayName: string;
  role: string;
  email: string;
  location: string;
  bio: string;
  avatarColor: string;
  techStack: TechEntryInput[];
};

export async function updateMyProfile(payload: ProfileUpdatePayload): Promise<void> {  //내 프로필 수정
  return request<void>("/api/v1/users/me/profile", {
    method: "PATCH",
    body: payload,
  });
}

export async function fetchProjectDepartmentStatus(projectId: number): Promise<ProjectDepartmentStatusList> {  //프로젝트 파트별 현황 조회
  return request<ProjectDepartmentStatusList>(`/api/v1/projects/${projectId}/dashboard/departments`);
}

export async function fetchProjectCommits(
  projectId: number,
  repositoryType: ProjectRepositoryType,
  limit = 20
): Promise<ProjectCommitList> {
  return request<ProjectCommitList>(
    `/api/v1/projects/${projectId}/commits${buildQueryString({ repositoryType, limit })}`
  );
}

export async function fetchFilteredProjectCommits(
  projectId: number,
  repositoryType: ProjectRepositoryType,
  limit = 20
): Promise<ProjectCommitList> {
  return request<ProjectCommitList>(
    `/api/v1/projects/${projectId}/commits/filter${buildQueryString({ repositoryType, limit })}`
  );
}

export async function fetchProjectCommitDetail(
  projectId: number,
  repositoryType: ProjectRepositoryType,
  commitHash: string
): Promise<ProjectCommitDetail> {
  return request<ProjectCommitDetail>(
    `/api/v1/projects/${projectId}/commits/${encodeURIComponent(commitHash)}${buildQueryString({ repositoryType })}`
  );
}

export async function fetchProjectCommitFiles(
  projectId: number,
  repositoryType: ProjectRepositoryType,
  commitHash: string
): Promise<ProjectCommitFileList> {
  return request<ProjectCommitFileList>(
    `/api/v1/projects/${projectId}/commits/${encodeURIComponent(commitHash)}/files${buildQueryString({ repositoryType })}`
  );
}

export async function fetchProjectCommitFileDiff(
  projectId: number,
  repositoryType: ProjectRepositoryType,
  commitHash: string,
  filePath: string
): Promise<ProjectCommitFileDiff> {
  return request<ProjectCommitFileDiff>(
    `/api/v1/projects/${projectId}/commits/${encodeURIComponent(commitHash)}/diff${buildQueryString({
      repositoryType,
      filePath,
    })}`
  );
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  username?: string;
  name: string;
  email: string;
  password: string;
};

export type EmailCodeSendPayload = {
  email: string;
  deliveryChannel: VerificationDeliveryChannel;
  kakaoAuthorizationCode?: string;
  kakaoAccessToken?: string;
};

export type EmailCodeLoginPayload = {
  email: string;
  verificationCode: string;
};

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | FormData | URLSearchParams | Record<string, unknown> | unknown[] | null;
};

type RequestOptions = {
  auth?: boolean;
  retryOnAuthFailure?: boolean;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "API_ERROR", status = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function emitSessionEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
  }
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "success" in payload && "code" in payload && "message" in payload;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildQueryString(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function prepareBody(body: ApiRequestInit["body"], headers: Headers): BodyInit | null | undefined {
  if (body == null) {
    return body;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob
  ) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    if (isApiEnvelope(payload)) {
      throw new ApiError(payload.message, payload.code, response.status);
    }

    if (typeof payload === "string" && payload.trim()) {
      throw new ApiError(payload, "HTTP_ERROR", response.status);
    }

    throw new ApiError(`Request failed with status ${response.status}.`, "HTTP_ERROR", response.status);
  }

  if (response.status === 204 || payload == null || payload === "") {
    return undefined as T;
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) {
      throw new ApiError(payload.message, payload.code, response.status);
    }

    return payload.data;
  }

  return payload as T;
}

export async function request<T>(
  path: string,
  init: ApiRequestInit = {},
  options: RequestOptions = {}
): Promise<T> {
  const normalizedPath = normalizePath(path);
  const headers = new Headers(init.headers);
  const session = loadSession();

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.auth !== false && session?.accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(buildApiUrl(normalizedPath), {
    ...init,
    headers,
    body: prepareBody(init.body, headers),
  });

  if (
    response.status === 401 &&
    options.retryOnAuthFailure !== false &&
    normalizedPath !== "/api/v1/auth/refresh"
  ) {
    const refreshToken = loadSession()?.refreshToken;

    if (refreshToken) {
      try {
        await refreshSession(refreshToken);
        return request<T>(normalizedPath, init, { ...options, retryOnAuthFailure: false });
      } catch {
        clearSession();
      }
    }
  }

  return parseResponse<T>(response);
}

export function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);

  if (isDev) {
    return normalizedPath;
  }

  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function loadSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  emitSessionEvent();
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
  emitSessionEvent();
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

export async function signUp(payload: SignUpPayload): Promise<void> {
  await request<void>(
    "/api/v1/auth/signup",
    {
      method: "POST",
      body: payload,
    },
    { auth: false, retryOnAuthFailure: false }
  );
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  if (isPreview) {
    console.log("🛠️ [Preview Mode] 가짜 이메일/비밀번호 로그인 성공");
    await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5초 로딩 딜레이
    
    const dummySession: AuthSession = {
      tokenType: "Bearer",
      accessToken: "preview_access_token_123",
      accessTokenExpiresInSeconds: 3600,
      refreshToken: "preview_refresh_token_456",
      refreshTokenExpiresInSeconds: 86400,
      username: payload.email.split("@")[0] || "preview_user",
      email: payload.email,
      role: "ADMIN",
    };
    
    saveSession(dummySession);
    return dummySession;
  }
  
  const session = await request<AuthSession>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: payload,
    },
    { auth: false, retryOnAuthFailure: false }
  );

  saveSession(session);
  return session;
}

export async function sendEmailLoginCode(
  payload: EmailCodeSendPayload
): Promise<VerificationCodeDispatchResponse> {
  if (isPreview) {
    console.log("🛠️ [Preview Mode] 가짜 인증 코드(123456)가 발송되었습니다.");
    await new Promise((resolve) => setTimeout(resolve, 500)); // 로딩 딜레이
    return {
      purpose: "EMAIL_LOGIN",
      deliveryChannel: payload.deliveryChannel,
      deliveryTarget: payload.email,
      deliveryMode: "MOCK",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      debugCode: "123456", // 아무 번호나 입력해도 통과하게 하거나, 이 번호로 확인
    };
  }

  return request<VerificationCodeDispatchResponse>(
    "/api/v1/auth/email-login/code",
    {
      method: "POST",
      body: payload,
    },
    { auth: false, retryOnAuthFailure: false }
  );
}

export async function loginWithEmailCode(payload: EmailCodeLoginPayload): Promise<AuthSession> {
  if (isPreview) {
    console.log("🛠️ [Preview Mode] 가짜 이메일 코드 로그인 성공");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const dummySession: AuthSession = {
      tokenType: "Bearer",
      accessToken: "preview_access_token_123",
      accessTokenExpiresInSeconds: 3600,
      refreshToken: "preview_refresh_token_456",
      refreshTokenExpiresInSeconds: 86400,
      username: payload.email.split("@")[0] || "preview_user",
      email: payload.email,
      role: "ADMIN", // 교수님이 볼 때 모든 권한이 있도록 ADMIN 부여
    };
    saveSession(dummySession);
    return dummySession;
  }

  const session = await request<AuthSession>(
    "/api/v1/auth/email-login",
    {
      method: "POST",
      body: payload,
    },
    { auth: false, retryOnAuthFailure: false }
  );

  saveSession(session);
  return session;
}

export async function fetchSocialLoginUrl(
  provider: SocialProvider
): Promise<SocialAuthorizationUrlResponse> {
  return request<SocialAuthorizationUrlResponse>(
    `/api/v1/auth/${provider}/url`,
    { method: "GET" },
    { auth: false, retryOnAuthFailure: false }
  );
}

export async function loginWithSocialCode(
  provider: SocialProvider,
  payload: { code: string; state?: string }
): Promise<AuthSession> {
  const requestBody =
    provider === "naver"
      ? { code: payload.code, state: payload.state ?? "" }
      : { code: payload.code };

  const session = await request<AuthSession>(
    `/api/v1/auth/${provider}/login`,
    {
      method: "POST",
      body: requestBody,
    },
    { auth: false, retryOnAuthFailure: false }
  );

  saveSession(session);
  return session;
}

export async function refreshSession(refreshToken = loadSession()?.refreshToken): Promise<AuthSession> {
  if (!refreshToken) {
    clearSession();
    throw new ApiError("No refresh token is available.", "MISSING_REFRESH_TOKEN", 401);
  }

  try {
    const session = await request<AuthSession>(
      "/api/v1/auth/refresh",
      {
        method: "POST",
        body: { refreshToken },
      },
      { auth: false, retryOnAuthFailure: false }
    );

    saveSession(session);
    return session;
  } catch (error) {
    clearSession();
    throw error;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = loadSession()?.refreshToken;
  clearSession();

  try {
    if (refreshToken) {
      await request<void>(
        "/api/v1/auth/logout",
        {
          method: "POST",
          body: { refreshToken },
        },
        { auth: false, retryOnAuthFailure: false }
      );
    }
  } catch (error) {
    console.warn("Logout request failed after local session was cleared.", error);
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  if (isPreview) {
    const session = loadSession(); // 위에서 저장한 dummySession을 불러옴
    return {
      id: 9999, // 가짜 유저 ID
      username: session?.username || "evaluator",
      name: "SynAIpse 평가자", // 화면 우측 상단 등에 표시될 이름
      email: session?.email || "preview@synaipse.com",
      role: "ADMIN",
    };
  }

  return request<CurrentUser>("/api/v1/users/me");
}

export async function fetchMyProjects(): Promise<MyProject[]> {
  return request<MyProject[]>("/api/v1/projects/my");
}

export async function createProject(payload: ProjectCreatePayload): Promise<ProjectCreateResponse> {
  return request<ProjectCreateResponse>("/api/v1/projects", {
    method: "POST",
    body: payload,
  });
}

export async function detectProjectStack(localPath: string): Promise<ProjectStackDetection> {
  if (isDev) {
    const response = await fetch("/__local/detect-stack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localPath }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(payload?.message || "로컬 프로젝트 경로를 분석할 수 없습니다.", "LOCAL_STACK_DETECTION_FAILED", response.status);
    }
    return payload as ProjectStackDetection;
  }

  return request<ProjectStackDetection>("/api/v1/projects/detect-stack", {
    method: "POST",
    body: { localPath },
  });
}

export async function joinProject(payload: ProjectJoinPayload): Promise<ProjectJoinResponse> {
  return request<ProjectJoinResponse>("/api/v1/projects/join", {
    method: "POST",
    body: payload,
  });
}

export async function fetchProjectDetail(projectId: number): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export async function fetchProjectDashboard(projectId: number): Promise<ProjectDashboard> {
  return request<ProjectDashboard>(`/api/v1/projects/${projectId}/dashboard`);
}

export async function updateProject(
  projectId: number,
  payload: ProjectUpdatePayload
): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function fetchProjectMembers(projectId: number): Promise<ProjectMemberList> {
  return request<ProjectMemberList>(`/api/v1/projects/${projectId}/members`);
}

export async function fetchProjectMemberDetail(
  projectId: number,
  memberId: number
): Promise<ProjectMember> {
  return request<ProjectMember>(`/api/v1/projects/${projectId}/members/${memberId}`);
}

export async function updateProjectMemberRole(
  projectId: number,
  memberId: number,
  payload: ProjectMemberRoleUpdatePayload | ProjectMemberRole
): Promise<ProjectMember> {
  const requestBody =
    typeof payload === "string"
      ? { role: payload }
      : payload;

  return request<ProjectMember>(`/api/v1/projects/${projectId}/members/${memberId}/role`, {
    method: "PATCH",
    body: requestBody,
  });
}

export async function updateProjectMemberDepartment(
  projectId: number,
  memberId: number,
  payload: ProjectMemberDepartmentUpdatePayload | ProjectDepartment
): Promise<ProjectMember> {
  const requestBody =
    typeof payload === "string"
      ? { department: payload }
      : payload;

  return request<ProjectMember>(`/api/v1/projects/${projectId}/members/${memberId}/department`, {
    method: "PATCH",
    body: requestBody,
  });
}

export async function fetchProjectTechStacks(projectId: number): Promise<ProjectTechStackList> {
  return request<ProjectTechStackList>(`/api/v1/projects/${projectId}/tech-stacks`);
}

export async function createProjectTechStack(
  projectId: number,
  payload: ProjectTechStackInput
): Promise<ProjectTechStack> {
  return request<ProjectTechStack>(`/api/v1/projects/${projectId}/tech-stacks`, {
    method: "POST",
    body: payload,
  });
}

export async function addProjectTechStack(
  projectId: number,
  payload: ProjectTechStackInput
): Promise<ProjectTechStack> {
  return createProjectTechStack(projectId, payload);
}

export async function updateProjectTechStack(
  projectId: number,
  techStackId: number,
  payload: ProjectTechStackInput
): Promise<ProjectTechStack> {
  return request<ProjectTechStack>(`/api/v1/projects/${projectId}/tech-stacks/${techStackId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteProjectTechStack(projectId: number, techStackId: number): Promise<void> {
  await request<void>(`/api/v1/projects/${projectId}/tech-stacks/${techStackId}`, {
    method: "DELETE",
  });
}

export async function fetchProjectSchedules(projectId: number): Promise<ProjectScheduleList> {
  return request<ProjectScheduleList>(`/api/v1/projects/${projectId}/schedules`);
}

export async function fetchFilteredProjectSchedules(
  projectId: number,
  params: ProjectScheduleFilterParams = {}
): Promise<ProjectScheduleList> {
  const queryString = buildQueryString({
    department: params.department,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  return request<ProjectScheduleList>(`/api/v1/projects/${projectId}/schedules/filter${queryString}`);
}

export async function createProjectSchedule(
  projectId: number,
  payload: ProjectScheduleCreatePayload
): Promise<ProjectSchedule> {
  return request<ProjectSchedule>(`/api/v1/projects/${projectId}/schedules`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProjectSchedule(
  projectId: number,
  scheduleId: number,
  payload: ProjectScheduleUpdatePayload
): Promise<ProjectSchedule> {
  return request<ProjectSchedule>(`/api/v1/projects/${projectId}/schedules/${scheduleId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function updateProjectScheduleStatus(
  projectId: number,
  scheduleId: number,
  payload: ProjectScheduleStatusUpdatePayload
): Promise<ProjectSchedule> {
  return request<ProjectSchedule>(`/api/v1/projects/${projectId}/schedules/${scheduleId}/status`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteProjectSchedule(projectId: number, scheduleId: number): Promise<void> {
  await request<void>(`/api/v1/projects/${projectId}/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}