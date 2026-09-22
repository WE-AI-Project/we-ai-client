import { useState, useEffect, useCallback } from "react";
import {
  Settings, Copy, Check, Plus, Trash2, Save, Eye, EyeOff,
  RefreshCw, FileText, Download, Upload, X, AlertTriangle, ShieldCheck, FolderOpen,
} from "lucide-react";
import {
  parseEnvFile, applyEnvValueEdit, renameEnvKeyInContent, removeEnvKeyFromContent,
  appendEnvKeyToContent, describeEnvKey,
} from "../data/envStore";
import { isRemoteConnectionSupported } from "../lib/serverConnection";
import type { ProjectStackDetection } from "../lib/api";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG,
  BRIGHT_BEIGE,
  TERM_BG, TERM_TEXT, TERM_MUTED, TERM_GREEN, TERM_DIM, TERM_RED, BTN_DARK, UI_RED, UI_AMBER,
} from "../colors";

type RuntimeInfo = {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
};

// ── 복사 버튼 ──
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded transition-all hover:bg-black/[0.06]"
    >
      {copied
        ? <Check className="w-3 h-3" style={{ color: "#10b981" }} />
        : <Copy  className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
      }
    </button>
  );
}

// ── .env 파일 뷰어 모달 (실제 파일 텍스트) ──
function EnvFileViewer({
  content,
  filePath,
  onClose,
  onImport,
}: {
  content: string;
  filePath: string;
  onClose: () => void;
  onImport: (text: string) => void;
}) {
  const [text, setText] = useState(content);
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: TERM_BG,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          maxHeight: "80vh",
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <FileText className="w-3.5 h-3.5" style={{ color: TERM_GREEN }} />
          <span className="text-[11px] font-semibold font-mono truncate" style={{ color: TERM_TEXT }} title={filePath}>
            {filePath}
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMode(m => m === "view" ? "edit" : "view")}
              className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: mode === "edit" ? "rgba(99,91,255,0.25)" : "rgba(255,255,255,0.07)",
                color: mode === "edit" ? "#a5a0ff" : TERM_MUTED,
              }}
            >
              {mode === "edit" ? "미리보기" : "편집"}
            </button>
            <CopyBtn value={text} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
              <X className="w-4 h-4" style={{ color: TERM_MUTED }} />
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto">
          {mode === "view" ? (
            <pre
              className="p-4 text-[11px] font-mono leading-relaxed"
              style={{ color: TERM_TEXT, whiteSpace: "pre" }}
            >
              {text.split("\n").map((line, i) => {
                const isComment = line.trim().startsWith("#");
                const eqIdx    = line.indexOf("=");
                if (isComment) return (
                  <div key={i} style={{ color: TERM_DIM }}>{line}</div>
                );
                if (eqIdx !== -1) {
                  const key = line.slice(0, eqIdx);
                  const val = line.slice(eqIdx + 1);
                  return (
                    <div key={i}>
                      <span style={{ color: "#79c0ff" }}>{key}</span>
                      <span style={{ color: TERM_RED }}>=</span>
                      <span style={{ color: "#a5d6ff" }}>{val}</span>
                    </div>
                  );
                }
                return <div key={i} style={{ color: TERM_DIM }}>{line || " "}</div>;
              })}
            </pre>
          ) : (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full h-full p-4 text-[11px] font-mono leading-relaxed outline-none resize-none"
              style={{
                background: "transparent",
                color: TERM_TEXT,
                minHeight: 360,
              }}
              spellCheck={false}
            />
          )}
        </div>

        {/* 푸터 */}
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {mode === "edit" && (
            <div className="flex items-center gap-1 text-[9px]" style={{ color: UI_AMBER }}>
              <AlertTriangle className="w-3 h-3" />
              편집 후 "적용"을 누르면 메인 화면에 반영됩니다 (실제 저장은 메인 화면의 "저장" 버튼)
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {mode === "edit" && (
              <button
                onClick={() => { onImport(text); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{ background: "rgba(99,91,255,0.25)", color: "#a5a0ff" }}
              >
                <Upload className="w-3 h-3" /> 적용
              </button>
            )}
            <button
              onClick={() => {
                const blob = new Blob([text], { type: "text/plain" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href = url; a.download = ".env";
                a.click(); URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: "rgba(16,185,129,0.20)", color: TERM_GREEN }}
            >
              <Download className="w-3 h-3" /> .env 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EnvironmentSettingsPageProps {
  localPath?: string | null;
}

// ── 메인 ──
export function EnvironmentSettingsPage({ localPath }: EnvironmentSettingsPageProps) {
  const electronAvailable = isRemoteConnectionSupported();
  const trimmedLocalPath = (localPath ?? "").trim();

  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState<string | null>(null);
  const [rawContent,     setRawContent]     = useState("");
  const [filePath,       setFilePath]       = useState("");
  const [fileExists,     setFileExists]     = useState(false);
  const [usedExample,    setUsedExample]    = useState(false);
  const [runtimeInfo,    setRuntimeInfo]    = useState<RuntimeInfo | null>(null);
  const [stackInfo,      setStackInfo]      = useState<ProjectStackDetection | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [showEnvFile,    setShowEnvFile]    = useState(false);

  const envVars = parseEnvFile(rawContent);
  const profile = envVars.find(v => v.key === "SPRING_PROFILES_ACTIVE")?.value || "";

  const loadReal = useCallback(async () => {
    if (!electronAvailable) {
      setLoading(false);
      setLoadError("이 화면은 데스크톱 앱(Electron)에서 실행할 때만 실제 로컬 .env 파일에 접근할 수 있습니다. 웹 프리뷰에서는 지원되지 않습니다.");
      return;
    }
    if (!trimmedLocalPath) {
      setLoading(false);
      setLoadError("프로젝트에 로컬 경로가 설정되어 있지 않습니다. Project Settings에서 로컬 경로를 먼저 지정해 주세요.");
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [envResult, runtime, stack] = await Promise.all([
        window.electronAPI!.env.read(trimmedLocalPath),
        window.electronAPI!.runtimeInfo(),
        window.electronAPI!.detectStack(trimmedLocalPath).catch(() => null),
      ]);
      setRawContent(envResult.content);
      setFilePath(envResult.path);
      setFileExists(envResult.exists);
      setUsedExample(envResult.usedExample);
      setRuntimeInfo(runtime);
      setStackInfo(stack);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : ".env 파일을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [electronAvailable, trimmedLocalPath]);

  useEffect(() => {
    void loadReal();
  }, [loadReal]);

  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateKey = (oldKey: string, newKey: string) =>
    setRawContent(prev => renameEnvKeyInContent(prev, oldKey, newKey));

  const updateValue = (key: string, value: string) =>
    setRawContent(prev => applyEnvValueEdit(prev, key, value));

  const removeVar = (key: string) =>
    setRawContent(prev => removeEnvKeyFromContent(prev, key));

  const addVar = () =>
    setRawContent(prev => appendEnvKeyToContent(prev, `CUSTOM_KEY_${envVars.length + 1}`, ""));

  const handleSave = async () => {
    if (!electronAvailable || !trimmedLocalPath) return;
    setSaving(true);
    try {
      const result = await window.electronAPI!.env.write(trimmedLocalPath, rawContent);
      setFilePath(result.path);
      setFileExists(true);
      setUsedExample(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : ".env 파일을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (text) setRawContent(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const findStackVersion = (name: string): string | null => {
    const match = stackInfo?.techStacks.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!match) return null;
    return match.version ? `${match.name} ${match.version}` : match.name;
  };

  const runtimeRows: { label: string; value: string }[] = runtimeInfo ? [
    { label: "OS",        value: `${runtimeInfo.platform} (${runtimeInfo.arch})` },
    { label: "Electron",  value: runtimeInfo.electronVersion },
    { label: "Node.js",   value: runtimeInfo.nodeVersion },
    { label: "Chromium",  value: runtimeInfo.chromeVersion },
    { label: "Java",      value: findStackVersion("Java") ?? "감지되지 않음" },
    { label: "Gradle",    value: findStackVersion("Gradle") ?? "감지되지 않음" },
    { label: "Spring Boot", value: findStackVersion("Spring Boot") ?? "감지되지 않음" },
  ] : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: BRIGHT_BEIGE }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* ── 로컬 보안 정책 배너 ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{
              background: "#DCFCE7",
              borderColor: "#86EFAC",
              boxShadow: "0 4px 14px rgba(22, 163, 74, 0.12)",
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#BBF7D0" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "#15803D" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold" style={{ color: "#14532D" }}>
                  🔒 실제 로컬 .env 파일을 직접 읽고 씁니다
                </span>
                <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded" style={{ background: "#86EFAC", color: "#14532D" }}>
                  서버 전송 없음
                </span>
              </div>
              <p className="text-[10px] mt-0.5 leading-normal font-mono truncate" style={{ color: "#166534" }} title={filePath}>
                {filePath || "프로젝트 로컬 경로 미설정"}
                {usedExample && " (실제 .env 없음 — .env.example 기반으로 표시 중, 저장 시 새로 생성됩니다)"}
              </p>
            </div>
          </div>

          {/* ── 헤더 ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                  Environment Settings
                </h1>
                {profile && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold" style={{ background: ACCENT_BG, color: ACCENT }}>
                    {profile.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                프로젝트 로컬 경로의 실제 .env 파일을 조회/편집합니다.
              </p>
            </div>

            {!loadError && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowEnvFile(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                >
                  <FileText className="w-3 h-3" /> .env 미리보기
                </button>
                <label
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                  style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                >
                  <Upload className="w-3 h-3" /> 다른 파일 불러오기
                  <input type="file" accept=".env,text/plain" className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  onClick={loadReal}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> 다시 불러오기
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-60"
                  style={{ background: saved ? "#10b981" : BTN_DARK, color: "rgba(255,255,255,0.92)" }}
                >
                  <Save className="w-3 h-3" />
                  {saving ? "저장 중..." : saved ? "저장 완료!" : "저장"}
                </button>
              </div>
            )}
          </div>

          {loadError ? (
            <div
              className="flex items-start gap-3 px-4 py-4 rounded-2xl border"
              style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.25)" }}
            >
              <FolderOpen className="w-5 h-5 shrink-0 mt-0.5" style={{ color: UI_RED }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: UI_RED }}>실제 .env 파일을 불러올 수 없습니다</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: TEXT_SECONDARY }}>{loadError}</p>
                {electronAvailable && trimmedLocalPath && (
                  <button
                    onClick={loadReal}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${BORDER}` }}
                  >
                    <RefreshCw className="w-3 h-3" /> 다시 시도
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ── Runtime Environment (실제 감지값) ── */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Runtime Environment</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}>
                    실제 감지값 · Read-only
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {loading ? (
                    <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>감지 중...</p>
                  ) : (
                    runtimeRows.map(r => (
                      <div key={r.label} className="flex items-start justify-between gap-2">
                        <span className="text-[10px] shrink-0" style={{ color: TEXT_LABEL }}>{r.label}</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[10px] font-mono truncate text-right" style={{ color: TEXT_PRIMARY }}>{r.value}</span>
                          <CopyBtn value={r.value} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── 환경 변수 테이블 ── */}
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                <div
                  className="grid px-4 py-2.5 text-[10px] font-semibold shrink-0"
                  style={{
                    gridTemplateColumns: "220px 1fr 180px 40px",
                    borderBottom: `1px solid ${BORDER}`,
                    background: "rgba(237,232,210,0.8)",
                    color: TEXT_LABEL,
                  }}
                >
                  <span>KEY</span><span>VALUE</span><span>DESCRIPTION</span><span />
                </div>

                <div className="flex-1 overflow-x-auto">
                  <div style={{ minWidth: 640 }}>
                    {loading ? (
                      <div className="px-4 py-8 text-center text-[10px]" style={{ color: TEXT_TERTIARY }}>
                        .env 파일을 불러오는 중...
                      </div>
                    ) : envVars.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[10px]" style={{ color: TEXT_TERTIARY }}>
                        정의된 환경 변수가 없습니다.
                      </div>
                    ) : (
                      envVars.map((v, i) => {
                        const isSecret = v.secret;
                        const showVal  = visibleSecrets.has(v.key);
                        return (
                          <div
                            key={`${v.key}-${i}`}
                            className="grid px-4 py-3 items-center transition-colors"
                            style={{
                              gridTemplateColumns: "220px 1fr 180px 40px",
                              borderBottom: i < envVars.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              {isSecret && (
                                <span className="text-[8px] font-semibold px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(245,158,11,0.10)", color: "#d97706" }}>
                                  SECRET
                                </span>
                              )}
                              <input
                                type="text"
                                defaultValue={v.key}
                                onBlur={e => { if (e.target.value.trim() && e.target.value !== v.key) updateKey(v.key, e.target.value.trim()); }}
                                className="flex-1 px-1.5 py-1 text-[10px] font-mono rounded outline-none min-w-0 font-semibold"
                                style={{ background: "rgba(0,0,0,0.03)", border: `1px solid transparent`, color: ACCENT }}
                                onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "50")}
                              />
                            </div>

                            <div className="flex items-center gap-1.5 px-2 min-w-0">
                              <input
                                type={isSecret && !showVal ? "password" : "text"}
                                value={v.value}
                                onChange={e => updateValue(v.key, e.target.value)}
                                className="flex-1 px-2 py-1 text-[10px] font-mono rounded outline-none min-w-0 transition-all"
                                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                              />
                              {isSecret && (
                                <button
                                  onClick={() => toggleSecret(v.key)}
                                  title={showVal ? "값 숨기기" : "실제 값 보기"}
                                  className="p-1 rounded shrink-0 hover:bg-black/[0.06] transition-colors"
                                >
                                  {showVal
                                    ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" />
                                    : <Eye    className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />}
                                </button>
                              )}
                              <CopyBtn value={v.value} />
                            </div>

                            <span className="px-2 text-[9px] truncate" style={{ color: TEXT_SECONDARY }}>
                              {describeEnvKey(v.key)}
                            </span>

                            <div className="flex justify-center">
                              <button
                                onClick={() => removeVar(v.key)}
                                title="환경 변수 삭제"
                                className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {!loading && (
                  <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
                    <button
                      onClick={addVar}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all hover:bg-black/5"
                      style={{ color: ACCENT }}
                    >
                      <Plus className="w-3.5 h-3.5" /> 새 환경 변수 추가
                    </button>
                    <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      {envVars.length}개 변수 · {fileExists ? "실제 .env 파일" : usedExample ? ".env.example 기반 (아직 저장 안 됨)" : "새 .env (아직 저장 안 됨)"}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── .env 파일 뷰어 모달 ── */}
      {showEnvFile && (
        <EnvFileViewer
          content={rawContent}
          filePath={filePath}
          onClose={() => setShowEnvFile(false)}
          onImport={setRawContent}
        />
      )}
    </div>
  );
}
