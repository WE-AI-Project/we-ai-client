import { useState, useRef, useEffect } from "react";
import { Bot, Terminal, Plug, Loader2, CheckCircle2, XCircle, KeyRound, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, BRIGHT_BEIGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
  TERM_BG, TERM_TEXT, TERM_MUTED, TERM_GREEN, UI_RED,
} from "../colors";
import {
  fetchPersonalAiBackend,
  savePersonalAiBackend,
  deletePersonalAiBackendApiKey,
  fetchProjectAiBackend,
  saveProjectAiBackend,
  deleteProjectAiBackendApiKey,
  testAiBackendConnection,
  type AiBackendSetting,
  type AiBackendDialect,
  type AiBackendConnectionTestResult,
} from "../../api/aiBackendApi";
import {
  fetchAiAgents,
  fetchAgentMetrics,
  fetchAgentInvocations,
  type AiAgent,
  type AgentMetrics,
  type AgentInvocation,
} from "../../api/aiApi";

// ── 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

// 에이전트(ORACLE/BACKEND/FRONTEND/INSPECTOR)는 상시 실행되는 OS 프로세스가 아니라
// 디베이트/QA 요청 시점에 호출되는 LLM 페르소나다. 따라서 CPU/메모리/포트/가동시간처럼
// "항상 켜져 있는 서버"를 전제로 한 지표는 이 시스템에 존재하지 않는다.
// 대신 실제 호출 이력(agent_invocation_logs)에서 집계한 진짜 사용 현황을 보여준다.
function agentActivityMeta(metrics: AgentMetrics | undefined): { color: string; bg: string; label: string } {
  if (!metrics || metrics.totalInvocations === 0) {
    return { color: "#9A9B72", bg: "rgba(154,155,114,0.10)", label: "No activity yet" };
  }
  if (metrics.failureCount > 0 && metrics.failureCount === metrics.totalInvocations) {
    return { color: "#B85450", bg: "rgba(184,84,80,0.10)", label: "All calls failing" };
  }
  return { color: "#5A8A4A", bg: "rgba(90,138,74,0.10)", label: "Active" };
}

const DIALECT_LABEL: Record<AiBackendDialect, string> = {
  OLLAMA_NATIVE: "Ollama (네이티브)",
  OPENAI_COMPATIBLE: "OpenAI 호환 (vLLM, LM Studio 등)",
};

type AiBackendCardProps = {
  title: string;
  description: string;
  usageHint: string;
  load: () => Promise<AiBackendSetting>;
  save: (draft: {
    enabled: boolean;
    dialect: AiBackendDialect;
    baseUrl: string;
    modelName: string;
    healthPath: string;
    apiKey?: string;
  }) => Promise<AiBackendSetting>;
  deleteApiKey: () => Promise<void>;
};

// ── 커스텀 AI 백엔드 설정 카드 (개인 / 프로젝트 공용 공용 컴포넌트) ──
// 사용자가 기본 Ollama 클러스터 대신 자신의 GPU나 타 서비스 API 키를 등록해 답변 생성
// 단계만 그쪽으로 보내도록 서버에 저장하는 설정 UI. 실제 저장/헬스체크는 서버가 대행한다
// (../../api/aiBackendApi.ts, 서버 AiBackendSettingController) — 그래서 CORS 제약이 없고
// API 키가 이 렌더러 프로세스 밖으로 나가지 않으며, 프로젝트 문서 RAG 검색도 항상 유지된다.
function AiBackendCard({ title, description, usageHint, load, save, deleteApiKey }: AiBackendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState<AiBackendSetting | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [dialect, setDialect] = useState<AiBackendDialect>("OLLAMA_NATIVE");
  const [model, setModel] = useState("llama3.1");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiBackendConnectionTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load().then(cfg => {
      setLoaded(cfg);
      setEnabled(cfg.enabled);
      setBaseUrl(cfg.baseUrl ?? "");
      setDialect(cfg.dialect);
      setModel(cfg.modelName ?? "llama3.1");
      if (cfg.enabled || cfg.baseUrl) setExpanded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const healthPath = dialect === "OPENAI_COMPATIBLE" ? "/v1/models" : "/api/tags";

  const handleTest = async () => {
    if (!baseUrl.trim()) {
      toast.error("먼저 서버 주소를 입력해 주세요.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAiBackendConnection({ baseUrl, dialect, healthPath, apiKey: apiKeyInput || undefined });
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, reason: err instanceof Error ? err.message : "연결 테스트에 실패했습니다." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (enabled && !baseUrl.trim()) {
      toast.error("사용하려면 서버 주소가 필요합니다.");
      return;
    }
    setSaving(true);
    try {
      const saved = await save({ enabled, baseUrl, dialect, modelName: model, healthPath, apiKey: apiKeyInput || undefined });
      setLoaded(saved);
      setApiKeyInput("");
      toast.success("AI 백엔드 설정이 저장되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    setSaving(true);
    try {
      await deleteApiKey();
      const refreshed = await load();
      setLoaded(refreshed);
      toast.success("저장된 API 키를 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "키 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shrink-0"
      style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT_BG }}>
          <Plug className="w-4 h-4" style={{ color: ACCENT }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</p>
          <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
            {loaded?.enabled && loaded.baseUrl ? `사용 중 · ${loaded.baseUrl}` : description}
          </p>
        </div>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: loaded?.enabled ? "rgba(90,138,74,0.10)" : "rgba(0,0,0,0.06)",
            color: loaded?.enabled ? "#5A8A4A" : TEXT_TERTIARY,
          }}
        >
          {loaded?.enabled ? "ON" : "OFF"}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-[10.5px] font-semibold" style={{ color: TEXT_PRIMARY }}>이 백엔드 사용</p>
              <p className="text-[9.5px]" style={{ color: TEXT_TERTIARY }}>{usageHint}</p>
            </div>
            <button
              onClick={() => setEnabled(v => !v)}
              className="relative w-10 h-5 rounded-full transition-all shrink-0"
              style={{ background: enabled ? "#10b981" : "rgba(0,0,0,0.14)" }}
            >
              <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all" style={{ left: enabled ? "calc(100% - 1.125rem)" : "0.125rem" }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="col-span-2 space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>서버 주소 (Base URL)</span>
              <input
                value={baseUrl}
                onChange={e => { setBaseUrl(e.target.value); setTestResult(null); }}
                placeholder="http://192.168.0.10:11434 또는 https://xxxx.ngrok-free.app"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>API 방언</span>
              <select
                value={dialect}
                onChange={e => setDialect(e.target.value as AiBackendDialect)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              >
                {(Object.keys(DIALECT_LABEL) as AiBackendDialect[]).map(d => (
                  <option key={d} value={d}>{DIALECT_LABEL[d]}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>모델명</span>
              <input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="llama3.1"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>

            <label className="col-span-2 space-y-1">
              <span className="text-[9.5px] font-semibold flex items-center gap-1" style={{ color: TEXT_LABEL }}>
                <KeyRound className="w-2.5 h-2.5" /> API 키 (선택 — 프록시/터널/서비스에 인증이 있는 경우만)
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  type="password"
                  placeholder={loaded?.hasApiKey ? "저장된 키가 있습니다 · 새 값 입력 시 교체" : "비워두면 인증 없이 연결"}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                  style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                />
                {loaded?.hasApiKey && (
                  <button
                    onClick={handleRemoveKey}
                    disabled={saving}
                    className="shrink-0 text-[9px] font-semibold px-2 py-1.5 rounded-lg hover:bg-black/[0.06]"
                    style={{ color: "#B85450" }}
                  >
                    키 삭제
                  </button>
                )}
              </div>
            </label>
          </div>

          {testResult && (
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px]"
              style={{
                background: testResult.ok ? "rgba(90,138,74,0.08)" : "rgba(184,84,80,0.08)",
                color: testResult.ok ? "#5A8A4A" : "#B85450",
              }}
            >
              {testResult.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
              {testResult.ok
                ? `연결 성공 · ${testResult.latencyMs}ms${testResult.modelsFound != null ? ` · 모델 ${testResult.modelsFound}개 발견` : ""}`
                : testResult.reason}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:bg-black/[0.04]"
              style={{ border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
              연결 테스트
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ml-auto"
              style={{ background: ACCENT, color: "white", border: `1px solid ${ACCENT_BORDER}` }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonalAiBackendCard() {
  return (
    <AiBackendCard
      title="개인 AI 백엔드"
      description="기본 서버 대신 내 GPU나 개인 API 키를 이 계정의 모든 채팅에 사용합니다"
      usageHint="켜면 내 채팅 요청의 답변 생성 단계가 아래 서버로 전송됩니다 (프로젝트 문서 검색은 그대로 유지됩니다). 프로젝트 공용 설정보다 우선합니다."
      load={fetchPersonalAiBackend}
      save={savePersonalAiBackend}
      deleteApiKey={deletePersonalAiBackendApiKey}
    />
  );
}

function ProjectAiBackendCard({ projectId }: { projectId: number }) {
  return (
    <AiBackendCard
      title="프로젝트 공용 AI 백엔드"
      description="이 프로젝트 멤버 전원이 함께 쓸 GPU나 API 키를 등록합니다 (팀 리더만 저장 가능)"
      usageHint="켜면 개인 설정이 없는 멤버의 채팅 요청이 아래 서버로 전송됩니다 (프로젝트 문서 검색은 그대로 유지됩니다). 저장/삭제는 프로젝트 리더만 할 수 있습니다."
      load={() => fetchProjectAiBackend(projectId)}
      save={draft => saveProjectAiBackend(projectId, draft)}
      deleteApiKey={() => deleteProjectAiBackendApiKey(projectId)}
    />
  );
}

export function AgentControlPage({ projectId }: { projectId?: number | null }) {
  const [agents, setAgents]           = useState<AiAgent[]>([]);
  const [metrics, setMetrics]         = useState<Record<string, AgentMetrics>>({});
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);

  const [selectedAgent, setSelected]  = useState<string | null>(null);
  const [invocations, setInvocations] = useState<AgentInvocation[]>([]);
  const [invocationsLoading, setInvocationsLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([fetchAiAgents(), fetchAgentMetrics()])
      .then(([agentList, metricsList]) => {
        if (cancelled) return;
        setAgents(agentList);
        setMetrics(Object.fromEntries(metricsList.map(m => [m.agent, m])));
      })
      .catch((err: any) => { if (!cancelled) setLoadError(err?.message || "에이전트 정보를 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedAgentData = agents.find(a => a.agent === selectedAgent);

  const selectAgent = (agentKey: string) => {
    const next = selectedAgent === agentKey ? null : agentKey;
    setSelected(next);
    if (next) {
      setInvocationsLoading(true);
      fetchAgentInvocations(next as AiAgent["agent"], 20)
        .then(setInvocations)
        .catch(() => setInvocations([]))
        .finally(() => setInvocationsLoading(false));
    }
  };

  // 로그 패널 스크롤 최하단
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [selectedAgent, invocations]);

  const totalInvocations = Object.values(metrics).reduce((s, m) => s + m.totalInvocations, 0);
  const totalFailures    = Object.values(metrics).reduce((s, m) => s + m.failureCount, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: BRIGHT_BEIGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: GRADIENT_ORB_2, filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden p-5 gap-4">
        <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 gap-4 overflow-hidden">

          {/* ── 헤더 + 필터 ── */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Agent Control</h1>
              </div>

              {isLoading ? (
                /* [스켈레톤] 헤더 통계 서브타이틀 */
                <Skeleton className="h-3 w-32 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  실제 호출 이력 총 {totalInvocations}건{totalFailures > 0 ? ` · 실패 ${totalFailures}건` : ""}
                </p>
              )}
            </div>
          </div>

          {loadError && (
            <div className="rounded-xl p-3 text-[11px] shrink-0" style={{ background: "rgba(184,84,80,0.08)", color: "#B85450", border: `1px solid ${BORDER}` }}>
              {loadError}
            </div>
          )}

          {/* ── 커스텀 AI 백엔드 설정 (개인 / 프로젝트 공용) ── */}
          <PersonalAiBackendCard />
          {projectId != null && <ProjectAiBackendCard projectId={projectId} />}

          {/* ── 에이전트 카드 목록 ── */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {isLoading ? (
              /* [스켈레톤] 에이전트 카드 (6개 생성) */
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skel-agent-${i}`}
                  className="rounded-2xl p-4 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.78)",
                    border: `1px solid ${BORDER}`,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                      <div>
                        <Skeleton className="h-3 w-24 mb-1" />
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Skeleton className="h-2 w-10" />
                          <Skeleton className="h-3 w-12 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <Skeleton className="w-10 h-5 rounded-full" />
                  </div>
                  
                  {/* Task Skeleton */}
                  <Skeleton className="w-3/4 h-2.5 mb-4" />

                  {/* CPU/Mem bars Skeleton */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-2" />
                      <Skeleton className="flex-1 h-1.5 rounded-full" />
                      <Skeleton className="w-8 h-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-2" />
                      <Skeleton className="flex-1 h-1.5 rounded-full" />
                      <Skeleton className="w-8 h-2" />
                    </div>
                  </div>

                  {/* Footer Meta Skeleton */}
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="w-32 h-2" />
                    <Skeleton className="w-14 h-5 rounded-lg" />
                  </div>
                </div>
              ))
            ) : (
              /* 실제 에이전트 + 실제 호출 통계 렌더링 */
              agents.map(agent => {
                const m = metrics[agent.agent];
                const sm = agentActivityMeta(m);
                const isSelected = selectedAgent === agent.agent;
                return (
                  <div
                    key={agent.agent}
                    onClick={() => selectAgent(agent.agent)}
                    className="rounded-2xl p-4 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.78)",
                      border: isSelected ? "1.5px solid rgba(99,91,255,0.25)" : `1px solid ${BORDER}`,
                      backdropFilter: "blur(12px)",
                      boxShadow: isSelected ? "0 4px 16px rgba(99,91,255,0.08)" : "none",
                    }}
                  >
                    {/* 헤더 행 */}
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
                          <Bot className="w-4 h-4" style={{ color: sm.color }} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{agent.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>{agent.model}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>
                              {sm.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 역할 */}
                    <p className="text-[10px] mb-3 line-clamp-1 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      {agent.role}
                    </p>

                    {/* 실제 호출 성능 지표 */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(0,0,0,0.03)" }}>
                        <p className="text-[8px]" style={{ color: TEXT_LABEL }}>평균 응답</p>
                        <p className="text-[11px] font-mono font-semibold" style={{ color: ACCENT }}>
                          {m && m.totalInvocations > 0 ? `${(m.avgDurationMs / 1000).toFixed(1)}s` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(0,0,0,0.03)" }}>
                        <p className="text-[8px]" style={{ color: TEXT_LABEL }}>성공률</p>
                        <p className="text-[11px] font-mono font-semibold" style={{ color: m && m.failureCount > 0 ? UI_RED : "#10b981" }}>
                          {m && m.totalInvocations > 0 ? `${Math.round((m.successCount / m.totalInvocations) * 100)}%` : "—"}
                        </p>
                      </div>
                    </div>

                    {/* 하단 메타 */}
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <span>{m?.totalInvocations ?? 0} calls</span>
                      <span>·</span>
                      <span>
                        {m?.lastInvokedAt ? `Last ${new Date(m.lastInvokedAt).toLocaleString("ko-KR")}` : "호출 이력 없음"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── 선택한 에이전트의 실제 호출 이력 (선택 시 표시) ── */}
          {!isLoading && selectedAgent && selectedAgentData && (
            <div
              className="rounded-2xl overflow-hidden flex flex-col shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
            >
              {/* 헤더 */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 shrink-0"
                style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.85)" }}
              >
                <Terminal className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {selectedAgentData.name} — 최근 호출 이력
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[9px] ml-auto px-2 py-0.5 rounded hover:bg-black/10 transition-colors"
                  style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                >
                  Close
                </button>
              </div>
              {/* 이력 내용 */}
              <div
                ref={logRef}
                className="p-4 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1"
                style={{ maxHeight: 180, background: TERM_BG, color: TERM_TEXT }}
              >
                {invocationsLoading ? (
                  <p style={{ color: TERM_MUTED }}>불러오는 중...</p>
                ) : invocations.length === 0 ? (
                  <p style={{ color: TERM_MUTED }}>이 에이전트에 대한 실제 호출 이력이 아직 없습니다.</p>
                ) : (
                  invocations.map((inv, i) => (
                    <p key={i} style={{ color: inv.success ? TERM_GREEN : "#f97583" }}>
                      [{new Date(inv.createdAt).toLocaleString("ko-KR")}] project #{inv.projectId} ·{" "}
                      {inv.success ? `OK (${(inv.durationMs / 1000).toFixed(1)}s)` : `FAILED — ${inv.errorMessage ?? "unknown error"}`}
                    </p>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
