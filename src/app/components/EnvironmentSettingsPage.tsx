import { useState, useEffect } from "react";
import {
  Settings, Copy, Check, Plus, Trash2, Save, Eye, EyeOff,
  RefreshCw, FileText, Download, Upload, X, AlertTriangle,
} from "lucide-react";
import {
  loadEnvVars, saveEnvVars, generateEnvContent, parseEnvContent,
  DEFAULT_ENV_VARS, EnvVar,
} from "../data/envStore";

import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, GRADIENT_PAGE, GRADIENT_ORB_1,
} from "../colors";

// ── 런타임 읽기 전용 정보 ──
const RUNTIME_INFO = [
  { label: "JDK Version",    value: "17.0.18+8 (LTS)"                       },
  { label: "Build Tool",     value: "Gradle 8.7"                             },
  { label: "Spring Boot",    value: "3.2.5"                                  },
  { label: "Active Profile", value: "dev"                                    },
  { label: "OS",             value: "Windows 11 Pro (Build 22631)"           },
  { label: "JVM Args",       value: "-Xms256m -Xmx1g -Dfile.encoding=UTF-8" },
];

const PROFILE_COLORS = {
  dev:  { color: "#10b981", bg: "rgba(16,185,129,0.10)"  },
  prod: { color: "#ef4444", bg: "rgba(239,68,68,0.10)"   },
  test: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)"  },
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

// ── .env 파일 뷰어 모달 ──
function EnvFileViewer({
  content,
  onClose,
  onImport,
}: {
  content: string;
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
          background: "#0d1117",
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
          <FileText className="w-3.5 h-3.5" style={{ color: "#7ee787" }} />
          <span className="text-[11px] font-semibold font-mono" style={{ color: "#c9d1d9" }}>.env</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.07)", color: "#8b949e" }}>
            WE&AI Project
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setMode(m => m === "view" ? "edit" : "view")}
              className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: mode === "edit" ? "rgba(99,91,255,0.25)" : "rgba(255,255,255,0.07)",
                color: mode === "edit" ? "#a5a0ff" : "#8b949e",
              }}
            >
              {mode === "edit" ? "미리보기" : "편집"}
            </button>
            <CopyBtn value={text} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
              <X className="w-4 h-4" style={{ color: "#8b949e" }} />
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto">
          {mode === "view" ? (
            <pre
              className="p-4 text-[11px] font-mono leading-relaxed"
              style={{ color: "#c9d1d9", whiteSpace: "pre" }}
            >
              {text.split("\n").map((line, i) => {
                const isComment = line.trim().startsWith("#");
                const eqIdx    = line.indexOf("=");
                if (isComment) return (
                  <div key={i} style={{ color: "#6e7681" }}>{line}</div>
                );
                if (eqIdx !== -1) {
                  const key = line.slice(0, eqIdx);
                  const val = line.slice(eqIdx + 1);
                  return (
                    <div key={i}>
                      <span style={{ color: "#79c0ff" }}>{key}</span>
                      <span style={{ color: "#ff7b72" }}>=</span>
                      <span style={{ color: "#a5d6ff" }}>{val}</span>
                    </div>
                  );
                }
                return <div key={i} style={{ color: "#6e7681" }}>{line || "\u00A0"}</div>;
              })}
            </pre>
          ) : (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full h-full p-4 text-[11px] font-mono leading-relaxed outline-none resize-none"
              style={{
                background: "transparent",
                color: "#c9d1d9",
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
            <div className="flex items-center gap-1 text-[9px]" style={{ color: "#f59e0b" }}>
              <AlertTriangle className="w-3 h-3" />
              편집 후 "불러오기"를 눌러 적용하세요
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {mode === "edit" && (
              <button
                onClick={() => { onImport(text); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{ background: "rgba(99,91,255,0.25)", color: "#a5a0ff" }}
              >
                <Upload className="w-3 h-3" /> 불러오기
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
              style={{ background: "rgba(16,185,129,0.20)", color: "#7ee787" }}
            >
              <Download className="w-3 h-3" /> .env 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ──
export function EnvironmentSettingsPage() {
  const [envVars,        setEnvVars]        = useState<EnvVar[]>(() => loadEnvVars());
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [saved,          setSaved]          = useState(false);
  const [profile,        setProfile]        = useState<"dev" | "prod" | "test">("dev");
  const [showEnvFile,    setShowEnvFile]    = useState(false);
  const [envContent,     setEnvContent]     = useState("");

  // envVars에서 프로파일 동기화
  useEffect(() => {
    const p = envVars.find(v => v.key === "SPRING_PROFILES_ACTIVE")?.value ?? "dev";
    if (p === "dev" || p === "prod" || p === "test") setProfile(p);
  }, []);

  // .env 파일 내용 미리 생성
  useEffect(() => {
    setEnvContent(generateEnvContent(envVars));
  }, [envVars]);

  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateValue = (key: string, value: string) =>
    setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value } : v));

  const removeVar = (key: string) =>
    setEnvVars(prev => prev.filter(v => v.key !== key));

  const handleSave = () => {
    saveEnvVars(envVars);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProfileChange = (p: "dev" | "prod" | "test") => {
    setProfile(p);
    setEnvVars(prev => prev.map(v =>
      v.key === "SPRING_PROFILES_ACTIVE" ? { ...v, value: p } : v
    ));
  };

  const handleReset = () => {
    setEnvVars(DEFAULT_ENV_VARS.map(v => ({ ...v })));
    setProfile("dev");
  };

  // 파일에서 불러오기 (파싱 후 적용)
  const handleImportFromFile = (text: string) => {
    const parsed = parseEnvContent(text, envVars);
    setEnvVars(parsed);
    saveEnvVars(parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 파일 업로드 (input[type=file])
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (text) handleImportFromFile(text);
    };
    reader.readAsText(file);
    e.target.value = ""; // 초기화
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,152,64,0.14) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Environment Settings</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                Spring 환경 변수 · JDK 정보 · 프로파일 관리 · .env 파일 편집
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* .env 파일 보기 */}
              <button
                onClick={() => setShowEnvFile(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all"
                style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,243,225,0.95)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,243,225,0.80)")}
              >
                <FileText className="w-3 h-3" /> .env 파일
              </button>
              {/* 업로드 */}
              <label
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,243,225,0.95)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,243,225,0.80)")}
              >
                <Upload className="w-3 h-3" /> .env 업로드
                <input type="file" accept=".env,text/plain" className="hidden" onChange={handleFileUpload} />
              </label>
              {/* 리셋 */}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all"
                style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,243,225,0.95)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,243,225,0.80)")}
              >
                <RefreshCw className="w-3 h-3" /> 초기화
              </button>
              {/* 저장 */}
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: saved ? "#10b981" : "#1c1c1e", color: "rgba(255,255,255,0.92)" }}
              >
                <Save className="w-3 h-3" />
                {saved ? "저장됨!" : "Apply Changes"}
              </button>
            </div>
          </div>

          {/* ── Active Spring Profile ── */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Active Spring Profile</p>
            <div className="flex items-center gap-2 mb-3">
              {(["dev", "prod", "test"] as const).map(p => {
                const pc = PROFILE_COLORS[p];
                return (
                  <button
                    key={p}
                    onClick={() => handleProfileChange(p)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all"
                    style={{
                      background: profile === p ? pc.bg : "rgba(0,0,0,0.04)",
                      color:      profile === p ? pc.color : TEXT_SECONDARY,
                      border:     `1.5px solid ${profile === p ? pc.color + "40" : "transparent"}`,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {/* PowerShell 커맨드 */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-[10px]"
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)", color: "#c9d1d9" }}
            >
              <span style={{ color: "#7ee787" }}>$</span>
              <span className="flex-1">
                <span style={{ color: "#79c0ff" }}>$env:SPRING_PROFILES_ACTIVE</span>
                <span style={{ color: "#ff7b72" }}> = </span>
                <span style={{ color: "#a5d6ff" }}>"{profile}"</span>
                <span style={{ color: "#8b949e" }}>; </span>
                <span style={{ color: "#7ee787" }}>./gradlew.bat bootRun</span>
              </span>
              <CopyBtn value={`$env:SPRING_PROFILES_ACTIVE = "${profile}"; ./gradlew.bat bootRun`} />
            </div>
          </div>

          {/* ── 런타임 정보 (Read-only) ── */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Runtime Environment</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_TERTIARY }}>Read-only</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {RUNTIME_INFO.map(r => (
                <div key={r.label} className="flex items-start justify-between gap-2">
                  <span className="text-[10px] shrink-0" style={{ color: TEXT_LABEL }}>{r.label}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] font-mono truncate text-right" style={{ color: TEXT_PRIMARY }}>{r.value}</span>
                    <CopyBtn value={r.value} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 환경 변수 테이블 ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(248,243,225,0.80)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {/* 테이블 헤더 */}
            <div
              className="grid px-4 py-2.5 text-[10px] font-semibold"
              style={{
                gridTemplateColumns: "200px 1fr 200px 40px",
                borderBottom: `1px solid ${BORDER}`,
                background: "rgba(237,232,210,0.8)",
                color: TEXT_LABEL,
              }}
            >
              <span>KEY</span><span>VALUE</span><span>DESCRIPTION</span><span />
            </div>

            {envVars.map((v, i) => {
              const isSecret  = v.secret;
              const showVal   = visibleSecrets.has(v.key);
              return (
                <div
                  key={v.key}
                  className="grid px-4 py-3 items-center transition-colors"
                  style={{
                    gridTemplateColumns: "200px 1fr 200px 40px",
                    borderBottom: i < envVars.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* 키 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSecret && (
                      <span className="text-[8px] font-semibold px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(245,158,11,0.10)", color: "#d97706" }}>
                        SECRET
                      </span>
                    )}
                    <span className="text-[10px] font-mono truncate" style={{ color: ACCENT }}>{v.key}</span>
                  </div>

                  {/* 값 */}
                  <div className="flex items-center gap-1.5 px-2 min-w-0">
                    {v.editable ? (
                      <input
                        type={isSecret && !showVal ? "password" : "text"}
                        value={v.value}
                        onChange={e => updateValue(v.key, e.target.value)}
                        className="flex-1 px-2 py-1 text-[10px] font-mono rounded outline-none min-w-0 transition-all"
                        style={{
                          background: "rgba(0,0,0,0.04)",
                          border: `1px solid ${BORDER}`,
                          color: TEXT_PRIMARY,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "50")}
                        onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                      />
                    ) : (
                      <span className="text-[10px] font-mono truncate" style={{ color: TEXT_SECONDARY }}>
                        {isSecret && !showVal ? "••••••••••••" : v.value}
                      </span>
                    )}
                    {isSecret && (
                      <button onClick={() => toggleSecret(v.key)} className="p-1 rounded shrink-0 hover:bg-black/[0.06]">
                        {showVal
                          ? <EyeOff className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                          : <Eye    className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />}
                      </button>
                    )}
                    <CopyBtn value={v.value} />
                  </div>

                  {/* 설명 */}
                  <span className="text-[9px] truncate px-2" style={{ color: TEXT_TERTIARY }}>{v.desc}</span>

                  {/* 삭제 */}
                  <div className="flex justify-center">
                    {v.editable ? (
                      <button
                        onClick={() => removeVar(v.key)}
                        className="p-1 rounded transition-all hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: "#9ca3af" }} />
                      </button>
                    ) : (
                      <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 새 환경변수 추가 */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
              <button
                onClick={() => setEnvVars(prev => [
                  ...prev,
                  { key: "NEW_VAR", value: "", secret: false, editable: true, desc: "" },
                ])}
                className="flex items-center gap-2 text-[10px] font-semibold transition-all hover:opacity-70"
                style={{ color: ACCENT }}
              >
                <Plus className="w-3.5 h-3.5" /> Add variable
              </button>
              <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                {envVars.length}개 변수 · localStorage 저장
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── .env 파일 뷰어 모달 ── */}
      {showEnvFile && (
        <EnvFileViewer
          content={envContent}
          onClose={() => setShowEnvFile(false)}
          onImport={handleImportFromFile}
        />
      )}
    </div>
  );
}