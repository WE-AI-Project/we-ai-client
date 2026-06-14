import { clearSession, loadSession } from "../app/lib/api";
import type { CommitFile } from "../app/components/commitData";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8080";
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

type ApiEnvelope<T> = {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
};

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

export function buildDiffFromCommitFiles(files: CommitFile[]): string {
  return files.map((file) => {
    const oldPath = `a/${file.path}`;
    const newPath = `b/${file.path}`;
    const body = file.diff
      .map((line) => {
        if (line.type === "added") return `+${line.content}`;
        if (line.type === "removed") return `-${line.content}`;
        return ` ${line.content}`;
      })
      .join("\n");

    return [
      `diff --git ${oldPath} ${newPath}`,
      `--- ${oldPath}`,
      `+++ ${newPath}`,
      "@@",
      body,
    ].join("\n");
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
  const session = loadSession();
  const token = session?.accessToken;
  if (!token) {
    handleUnauthorized();
    throw new AiApiError("로그인이 필요합니다.", 401, "UNAUTHORIZED");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new AiApiError("세션이 만료되었습니다. 다시 로그인해 주세요.", 401, "UNAUTHORIZED");
  }

  const payload = await parsePayload<T>(response);
  if (!response.ok) {
    const envelope = payload as ApiEnvelope<T>;
    throw new AiApiError(
      envelope?.message || `AI API 요청이 실패했습니다. (${response.status})`,
      response.status,
      envelope?.code || "HTTP_ERROR"
    );
  }

  if (isEnvelope<T>(payload)) {
    if (payload.success === false) {
      throw new AiApiError(payload.message || "AI API 요청이 실패했습니다.", response.status, payload.code);
    }
    return payload.data as T;
  }

  return payload as T;
}

async function parsePayload<T>(response: Response): Promise<T | ApiEnvelope<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => "");
  return { message: text } as ApiEnvelope<T>;
}

function isEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return !!payload && typeof payload === "object" && ("data" in payload || "success" in payload);
}

function handleUnauthorized(): void {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
}
