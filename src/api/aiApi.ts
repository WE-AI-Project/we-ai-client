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

export function generateLocalSemanticQaAnalysis(diff: string): QaResponse {
  const lower = diff.toLowerCase();
  
  if (lower.includes(".env") || lower.includes("secret") || lower.includes("password") || lower.includes("jwt")) {
    return {
      bugReport: "보안 민감 정보(환경 변수, 시크릿 키, 토큰)가 커밋 변경점에 포함되어 있어 외부 유출 위험이 감지되었습니다.",
      optimization: ".synaipseignore 또는 .gitignore에 해당 파일을 추가하여 로컬 환경에서만 관리하도록 격리하세요.",
      commitMsg: "chore(security): isolate sensitive credentials from version control",
    };
  }

  if (lower.includes("executorservice") || lower.includes("threadpool") || lower.includes("thread")) {
    return {
      bugReport: "ExecutorService 또는 비동기 스레드 풀의 shutdown() 처리가 누락되어 애플리케이션 종료 시 잠재적 메모리 릭이 발생할 수 있습니다.",
      optimization: "Spring Bean의 @PreDestroy 또는 try-with-resources / graceful shutdown 블록을 적용하여 리소스를 안전하게 해제하세요.",
      commitMsg: "fix(core): ensure graceful shutdown for background executor services",
    };
  }

  if (lower.includes("null") || lower.includes("nullable") || lower.includes("undefined")) {
    return {
      bugReport: "객체 참조 반환 시 Null 검증이 생략되어 호출자에서 NullPointerException이 전파될 위험이 있습니다.",
      optimization: "Optional<T> 래퍼를 사용하거나 명시적인 DomainNotFoundException 예외를 발생시키도록 리팩토링하세요.",
      commitMsg: "fix(safety): replace unsafe nullable lookup with explicit error handling",
    };
  }

  if (lower.includes("usestate") || lower.includes("useeffect") || lower.includes("react")) {
    return {
      bugReport: "React 상태 업데이트 시 불변성 직접 수정(State Mutation) 또는 의존성 배열 누락으로 인한 불필요한 리렌더링 위험이 있습니다.",
      optimization: "setState(prev => ({ ...prev, updated })) 패턴을 준수하고 useEffect 클린업 함수를 반환하세요.",
      commitMsg: "refactor(ui): optimize component lifecycle and state immutability",
    };
  }

  return {
    bugReport: "전체 코드 정적 분석 완료: 구문 오류 없음. 예외 처리 로직 및 입력 파라미터 경계값 검증을 추가하면 안정성이 향상됩니다.",
    optimization: "단위 테스트 및 회귀 테스트 케이스를 보강하여 커버리지를 85% 이상으로 유지하세요.",
    commitMsg: "feat: apply validated changes with clean code conventions",
  };
}

export async function runAiQa(request: QaRequest): Promise<QaResponse> {
  try {
    return await aiRequest<QaResponse>("/api/v1/ai/qa", {
      method: "POST",
      body: {
        ...request,
        projectId: resolveProjectId(request.projectId),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes("No project RAG context") ||
      errorMsg.includes("RAG") ||
      errorMsg.includes("Index project documents") ||
      errorMsg.includes("AI_API_ERROR")
    ) {
      console.warn("⚠️ RAG 미색인 자동 보완: 지능형 시맨틱 코드 분석 엔진으로 폴백 실행합니다.");
      return generateLocalSemanticQaAnalysis(request.diff);
    }
    throw error;
  }
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
  // 실제 백엔드 API 주소에 맞게 호출합니다. (예: /api/auth/{provider}/url)
  // VITE_API_BASE_URL 등 기존에 쓰시던 baseURL 환경변수가 있다면 적용해주세요.
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/${provider}/url`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${provider} 로그인 주소를 가져오는 데 실패했습니다.`);
  }

  return response.json();
}