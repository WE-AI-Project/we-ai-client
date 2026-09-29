import { ApiError, request, loadSession, buildApiUrl } from "../app/lib/api";
import { callCustomEndpointIfEnabled } from "../app/lib/customEndpoint";

export type DebateTurn = {
  round?: number;
  agent?: string;
  role?: string;
  model?: string;
  message?: string;
};

export type DebateResponse = {
  projectId?: number;
  fileName?: string;
  cursorLine?: number;
  userQuery?: string;
  completed?: boolean;
  executedRounds?: number;
  maxRounds?: number;
  oracleAnalysis?: string;
  backendOpinion?: string;
  frontendOpinion?: string;
  inspectorOpinion?: string;
  debateHistory?: string;
  markdown?: string;
  ragContexts?: string[];
  turns?: DebateTurn[];
};

export type DebateRequest = {
  projectId?: number | null;
  fileName: string;
  currentCodeSnippet: string;
  cursorLine: number;
  userQuery: string;
};

export type AiAgentKey = "ORACLE" | "BACKEND" | "FRONTEND" | "INSPECTOR";

export type AiAgent = {
  agent: AiAgentKey;
  name: string;
  role: string;
  model: string;
};

export type ThinkingLevel = "LOW" | "DEFAULT" | "HIGH";

export type EditorContextRequest = DebateRequest & {
  level?: ThinkingLevel;
};

export type CustomDebateRequest = {
  context: EditorContextRequest;
  agents: AiAgentKey[];
  maxRounds: number;
};

export type SingleAgentResponse = {
  projectId: number;
  agent: AiAgentKey;
  agentName: string;
  role: string;
  model: string;
  fileName: string;
  cursorLine: number;
  userQuery: string;
  answer: string;
  markdown?: string;
  ragContexts?: string[];
};

export type AiCommitRequest = {
  projectId?: number | null;
  diff: string;
  files?: string[];
};

export type AiCommitResponse = {
  message?: string;
  commitMessage?: string;
  commit_msg?: string;
  candidates?: Array<{
    message?: string;
    commitMessage?: string;
    commit_msg?: string;
    title?: string;
    body?: string;
    type?: string;
    scope?: string;
  }>;
};

export type QaRequest = {
  projectId?: number | null;
  diff: string;
};

export type QaResponse = {
  bugReport?: string;
  bug_report?: string;
  optimization?: string;
  commitMsg?: string;
  commit_msg?: string;
};

export type AiChatRequest = {
  projectId?: number | null;
  question: string;
  level?: ThinkingLevel;
};

export type AiChatResponse = {
  answer: string;
  contexts?: string[];
  /** "custom-endpoint"면 프로젝트 문서 RAG 검색을 거치지 않은 응답이라는 뜻 (contexts는 항상 빈 배열) */
  source?: "backend" | "custom-endpoint";
};

export class AiApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = "AI_API_ERROR"
  ) {
    super(message);
    this.name = "AiApiError";
  }
}

export function resolveProjectId(projectId?: number | null): number {
  if (typeof projectId !== "number" || !Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new AiApiError("AI 기능을 사용하려면 프로젝트를 먼저 선택해 주세요.", 400, "PROJECT_REQUIRED");
  }
  return projectId;
}

export function buildDiffFromCommitFiles(files: any[]): string {
  return files.map((file) => {
    if (typeof file.diff === "string" && file.diff.trim()) {
      return file.diff;
    }

    const oldPath = `a/${file.path || file.fileName || "unknown"}`;
    const newPath = `b/${file.path || file.fileName || "unknown"}`;

    if (Array.isArray(file.diff)) {
      const body = file.diff
        .map((line: any) => {
          if (line.type === "added") return `+${line.content}`;
          if (line.type === "removed") return `-${line.content}`;
          if (line.type === "hunk") return line.content;
          return ` ${line.content}`;
        })
        .join("\n");

      return [
        `diff --git ${oldPath} ${newPath}`,
        `--- ${oldPath}`,
        `+++ ${newPath}`,
        body,
      ].join("\n");
    }

    return `diff --git ${oldPath} ${newPath}\n--- ${oldPath}\n+++ ${newPath}\n@@ -1,1 +1,1 @@\n+// Modified ${file.name || file.fileName || "file"}`;
  }).join("\n\n");
}

export async function runAiDebate(request: DebateRequest): Promise<DebateResponse> {
  return aiRequest<DebateResponse>("/api/v1/ai/debate", {
    method: "POST",
    body: {
      ...request,
      projectId: resolveProjectId(request.projectId),
    },
  });
}

export async function generateCommitMessage(request: AiCommitRequest): Promise<AiCommitResponse> {
  return aiRequest<AiCommitResponse>("/api/v1/ai/commit", {
    method: "POST",
    body: {
      ...request,
      projectId: resolveProjectId(request.projectId),
    },
  });
}

export async function runAiQa(request: QaRequest): Promise<QaResponse> {
  return aiRequest<QaResponse>("/api/v1/ai/qa", {
    method: "POST",
    body: {
      ...request,
      projectId: resolveProjectId(request.projectId),
    },
  });
}

export async function runAiChat(request: AiChatRequest): Promise<AiChatResponse> {
  // 커스텀 엔드포인트가 설정·활성화되어 있으면 우리 백엔드 대신 그쪽으로 직접 질의한다.
  // 주의: 이 경로에서는 우리 백엔드가 해주는 프로젝트 문서 기반 RAG 컨텍스트 검색이
  // 빠지므로 항상 contexts: []로 반환된다 — 호출부에서 이를 구분해 안내해야 한다.
  const customResult = await callCustomEndpointIfEnabled(request.question);
  if (customResult) {
    return { answer: customResult.answer, contexts: [], source: "custom-endpoint" };
  }

  return aiRequest<AiChatResponse>("/api/v1/ai/chat", {
    method: "POST",
    body: {
      projectId: resolveProjectId(request.projectId),
      question: request.question,
      level: request.level,
    },
  });
}

async function aiRequest<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: Record<string, unknown> }
): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiApiError(error.message, error.status, error.code);
    }
    throw error;
  }
}

export async function fetchAiAgents(): Promise<AiAgent[]> {
  return aiRequest<AiAgent[]>("/api/v1/ai/agents", { method: "GET" });
}

export type AgentMetrics = {
  agent: AiAgentKey;
  displayName: string;
  role: string;
  model: string;
  totalInvocations: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  lastInvokedAt: string | null;
};

export async function fetchAgentMetrics(): Promise<AgentMetrics[]> {
  return aiRequest<AgentMetrics[]>("/api/v1/ai/agents/metrics", { method: "GET" });
}

export type AgentInvocation = {
  projectId: number;
  success: boolean;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
};

export async function fetchAgentInvocations(agent: AiAgentKey, limit = 20): Promise<AgentInvocation[]> {
  return aiRequest<AgentInvocation[]>(`/api/v1/ai/agents/${agent}/invocations?limit=${limit}`, { method: "GET" });
}

export async function askAiAgent(agent: AiAgentKey, request: EditorContextRequest): Promise<SingleAgentResponse> {
  return aiRequest<SingleAgentResponse>(`/api/v1/ai/agents/${agent}/ask`, {
    method: "POST",
    body: {
      ...request,
      projectId: resolveProjectId(request.projectId),
    },
  });
}

export async function runCustomAiDebate(request: CustomDebateRequest): Promise<DebateResponse> {
  return aiRequest<DebateResponse>("/api/v1/ai/debate/custom", {
    method: "POST",
    body: {
      context: {
        ...request.context,
        projectId: resolveProjectId(request.context.projectId),
      },
      agents: request.agents,
      maxRounds: request.maxRounds,
    },
  });
}

export type DebateStreamStart = {
  projectId: number;
  ragContextCount: number;
  agents: AiAgentKey[];
  maxRounds: number;
};

export type DebateStreamHandlers = {
  onStart?: (info: DebateStreamStart) => void;
  onTurn: (turn: DebateTurn) => void;
  onDone: (response: DebateResponse) => void;
  onError?: (message: string) => void;
};

// /debate/custom(한 번에 통째로 응답)은 라운드 x 에이전트 수만큼 Ollama 호출이 누적되어
// Cloudflare/브라우저 게이트웨이 타임아웃을 넘기기 쉽다. 이 함수는 같은 토론을 SSE로 받아서
// 에이전트가 응답할 때마다 즉시 콜백을 호출한다 - 타임아웃 회피 + 실시간 대화형 표시 둘 다 해결.
// fetch의 ReadableStream을 직접 파싱한다 (EventSource는 POST/커스텀 Authorization 헤더를
// 지원하지 않아서 여기서는 쓸 수 없다).
export async function runCustomAiDebateStream(
  request: CustomDebateRequest,
  handlers: DebateStreamHandlers
): Promise<void> {
  const session = loadSession();
  const response = await fetch(buildApiUrl("/api/v1/ai/debate/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: JSON.stringify({
      context: {
        ...request.context,
        projectId: resolveProjectId(request.context.projectId),
      },
      agents: request.agents,
      maxRounds: request.maxRounds,
    }),
  });

  if (!response.ok || !response.body) {
    let message = `AI 토론 스트림 요청이 실패했습니다 (${response.status}).`;
    try {
      const payload = await response.json();
      if (payload?.message) message = payload.message;
    } catch {
      // 응답 본문이 JSON이 아니면 기본 메시지를 그대로 사용한다.
    }
    throw new AiApiError(message, response.status, "AI_DEBATE_STREAM_FAILED");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (eventName: string, dataStr: string) => {
    if (!dataStr) return;
    let parsed: any;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      parsed = dataStr;
    }
    if (eventName === "start") handlers.onStart?.(parsed);
    else if (eventName === "turn") handlers.onTurn(parsed);
    else if (eventName === "done") handlers.onDone(parsed);
    else if (eventName === "error") {
      handlers.onError?.(typeof parsed === "string" ? parsed : (parsed?.message ?? "AI 토론 중 오류가 발생했습니다."));
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      if (!rawEvent.trim()) continue;

      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      dispatch(eventName, dataLines.join("\n"));
    }
  }
}


// 🟢 이 줄을 추가해 주세요! (구글, 카카오, 네이버만 들어올 수 있다고 못 박아두는 역할입니다)
export type SocialProvider = "google" | "kakao" | "naver";
/**
 * 소셜 로그인(Kakao, Naver, Google) 인증 URL을 백엔드에서 받아옵니다.
 */
export async function fetchSocialLoginUrl(
  provider: SocialProvider
): Promise<{ authorizationUrl: string }> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const response = await fetch(`${baseUrl}/api/v1/auth/${provider}/url`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${provider} 로그인 주소를 가져오는 데 실패했습니다.`);
  }

  const json = await response.json();
  return json?.data ?? json;
}