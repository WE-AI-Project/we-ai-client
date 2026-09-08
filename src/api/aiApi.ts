import { ApiError, request } from "../app/lib/api";
import type { CommitFile } from "../app/components/commitData";

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

export type EditorContextRequest = DebateRequest & {
  ragMaxResults?: number;
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
};

export type AiChatResponse = {
  answer: string;
  contexts?: string[];
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
  return aiRequest<AiChatResponse>("/api/v1/ai/chat", {
    method: "POST",
    body: {
      projectId: resolveProjectId(request.projectId),
      question: request.question,
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