// ── 커스텀 AI 백엔드(개인 / 프로젝트 공용) 설정 API ──
// 예전에는 이 설정이 클라이언트에만 저장되고, 켜져 있으면 우리 서버를 완전히 건너뛰고
// 사용자가 등록한 서버로 직접 질의했다 (그 결과 프로젝트 문서 RAG 컨텍스트가 빠졌다).
// 지금은 서버가 개인/프로젝트 설정을 직접 들고 있다가 매 채팅 요청마다 "개인 설정 > 프로젝트
// 공용 설정 > 기본 Ollama 클러스터" 순서로 어떤 백엔드를 쓸지 고르고, RAG 검색은 항상 우리
// 인프라로 수행한 뒤 마지막 답변 생성 단계만 고른 백엔드로 보낸다. 그래서 커스텀 백엔드를
// 쓰더라도 프로젝트 문서 컨텍스트는 그대로 유지된다.
import { ApiError, request } from "../app/lib/api";

export type AiBackendDialect = "OLLAMA_NATIVE" | "OPENAI_COMPATIBLE";

export type AiBackendSetting = {
  enabled: boolean;
  dialect: AiBackendDialect;
  baseUrl: string | null;
  modelName: string | null;
  healthPath: string;
  hasApiKey: boolean;
  updatedAt: string | null;
};

export type AiBackendSettingDraft = {
  enabled: boolean;
  dialect: AiBackendDialect;
  baseUrl: string;
  modelName: string;
  healthPath: string;
  /** 비워두면(undefined/빈 문자열) 기존에 저장된 키가 그대로 유지됩니다. 키 삭제는 별도 API를 쓰세요. */
  apiKey?: string;
};

export type AiBackendConnectionTestDraft = {
  baseUrl: string;
  dialect: AiBackendDialect;
  healthPath?: string;
  apiKey?: string;
};

export type AiBackendConnectionTestResult = {
  ok: boolean;
  latencyMs?: number | null;
  modelsFound?: number | null;
  reason?: string | null;
};

export class AiBackendApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = "AI_BACKEND_API_ERROR"
  ) {
    super(message);
    this.name = "AiBackendApiError";
  }
}

async function backendRequest<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: Record<string, unknown> }
): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiBackendApiError(error.message, error.status, error.code);
    }
    throw error;
  }
}

export async function fetchPersonalAiBackend(): Promise<AiBackendSetting> {
  return backendRequest<AiBackendSetting>("/api/v1/ai/backend/personal", { method: "GET" });
}

export async function savePersonalAiBackend(draft: AiBackendSettingDraft): Promise<AiBackendSetting> {
  return backendRequest<AiBackendSetting>("/api/v1/ai/backend/personal", {
    method: "PUT",
    body: {
      enabled: draft.enabled,
      dialect: draft.dialect,
      baseUrl: draft.baseUrl.trim(),
      modelName: draft.modelName.trim(),
      healthPath: draft.healthPath.trim(),
      apiKey: draft.apiKey && draft.apiKey.length > 0 ? draft.apiKey : undefined,
    },
  });
}

export async function deletePersonalAiBackendApiKey(): Promise<void> {
  await backendRequest<void>("/api/v1/ai/backend/personal/api-key", { method: "DELETE" });
}

export async function fetchProjectAiBackend(projectId: number): Promise<AiBackendSetting> {
  return backendRequest<AiBackendSetting>(`/api/v1/ai/backend/projects/${projectId}`, { method: "GET" });
}

export async function saveProjectAiBackend(projectId: number, draft: AiBackendSettingDraft): Promise<AiBackendSetting> {
  return backendRequest<AiBackendSetting>(`/api/v1/ai/backend/projects/${projectId}`, {
    method: "PUT",
    body: {
      enabled: draft.enabled,
      dialect: draft.dialect,
      baseUrl: draft.baseUrl.trim(),
      modelName: draft.modelName.trim(),
      healthPath: draft.healthPath.trim(),
      apiKey: draft.apiKey && draft.apiKey.length > 0 ? draft.apiKey : undefined,
    },
  });
}

export async function deleteProjectAiBackendApiKey(projectId: number): Promise<void> {
  await backendRequest<void>(`/api/v1/ai/backend/projects/${projectId}/api-key`, { method: "DELETE" });
}

export async function testAiBackendConnection(draft: AiBackendConnectionTestDraft): Promise<AiBackendConnectionTestResult> {
  return backendRequest<AiBackendConnectionTestResult>("/api/v1/ai/backend/test", {
    method: "POST",
    body: {
      baseUrl: draft.baseUrl.trim(),
      dialect: draft.dialect,
      healthPath: draft.healthPath?.trim() || undefined,
      apiKey: draft.apiKey || undefined,
    },
  });
}
