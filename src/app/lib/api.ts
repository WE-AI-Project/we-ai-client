const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
const isDev = import.meta.env.DEV;

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

export type ProjectScheduleList = {
  projectId: number;
  schedules: ProjectSchedule[];
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

export async function fetchProjectDepartmentStatus(projectId: number): Promise<ProjectDepartmentStatusList> {  //프로젝트 파트별 현황 조회
  return request<ProjectDepartmentStatusList>(`/api/v1/projects/${projectId}/dashboard/departments`);
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

async function request<T>(
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

export async function fetchProjectMembers(projectId: number): Promise<ProjectMemberList> {
  return request<ProjectMemberList>(`/api/v1/projects/${projectId}/members`);
}

export async function fetchProjectTechStacks(projectId: number): Promise<ProjectTechStackList> {
  return request<ProjectTechStackList>(`/api/v1/projects/${projectId}/tech-stacks`);
}

export async function fetchProjectSchedules(projectId: number): Promise<ProjectScheduleList> {
  return request<ProjectScheduleList>(`/api/v1/projects/${projectId}/schedules`);
}
