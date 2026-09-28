import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plug, Loader2, CheckCircle2, XCircle,
  Server, Link2, KeyRound, FolderOpen,
} from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, UI_GREEN, UI_RED, UI_AMBER,
} from "../colors";
import {
  loadConnectionConfig,
  saveConnectionConfig,
  testConnection,
  isRemoteConnectionSupported,
  pickPrivateKeyFile,
  connectionKeyForProject,
  type ConnectionConfig,
  type ConnectionMode,
  type SshAuthType,
  type SshBuildTool,
  type ConnectionTestResult,
} from "../lib/serverConnection";

const MODE_META: Record<ConnectionMode, { label: string; desc: string; icon: any }> = {
  local: { label: "기본 (Local)", desc: "이 앱과 같은 백엔드의 기본 API를 사용합니다", icon: Server },
  link: { label: "링크", desc: "다른 곳에 떠 있는 백엔드 인스턴스의 주소를 직접 지정합니다", icon: Link2 },
  ssh: { label: "SSH", desc: "원격 머신에 SSH로 접속해 로그를 확인하고 빌드를 실행합니다", icon: KeyRound },
};

interface ConnectionSettingsCardProps {
  projectId?: number | null;
  onSaved?: (config: ConnectionConfig) => void;
}

export function ConnectionSettingsCard({ projectId, onSaved }: ConnectionSettingsCardProps) {
  const key = connectionKeyForProject(projectId);
  const remoteSupported = isRemoteConnectionSupported();

  const [loaded, setLoaded] = useState<ConnectionConfig | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("local");
  const [linkBaseUrl, setLinkBaseUrl] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<SshAuthType>("password");
  const [password, setPassword] = useState("");
  const [privateKeyPath, setPrivateKeyPath] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [remoteWorkingDir, setRemoteWorkingDir] = useState("");
  const [buildTool, setBuildTool] = useState<SshBuildTool>("GRADLE");
  const [logCommand, setLogCommand] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadConnectionConfig(key).then((cfg) => {
      if (cancelled) return;
      setLoaded(cfg);
      setMode(cfg.mode);
      setLinkBaseUrl(cfg.linkBaseUrl);
      setHost(cfg.ssh.host);
      setPort(cfg.ssh.port);
      setUsername(cfg.ssh.username);
      setAuthType(cfg.ssh.authType);
      setPrivateKeyPath(cfg.ssh.privateKeyPath);
      setRemoteWorkingDir(cfg.ssh.remoteWorkingDir);
      setBuildTool(cfg.ssh.buildTool);
      setLogCommand(cfg.ssh.logCommand);
      setPassword("");
      setPassphrase("");
      setTestResult(null);
    });
    return () => { cancelled = true; };
  }, [key]);

  const buildDraftSsh = () => ({
    host, port, username, authType, privateKeyPath, remoteWorkingDir, buildTool, logCommand,
    ...(authType === "password" ? { password: password || undefined } : { passphrase: passphrase || undefined }),
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        mode,
        linkBaseUrl,
        ssh: buildDraftSsh(),
      });
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (mode === "link" && !linkBaseUrl.trim()) {
      toast.error("링크 주소를 입력해 주세요.");
      return;
    }
    if (mode === "ssh" && (!host.trim() || !username.trim())) {
      toast.error("SSH 호스트와 사용자명을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveConnectionConfig(key, {
        mode,
        linkBaseUrl,
        ssh: {
          host, port, username, authType, privateKeyPath, remoteWorkingDir, buildTool, logCommand,
          password: authType === "password" && password.length > 0 ? password : undefined,
          passphrase: authType === "key" && passphrase.length > 0 ? passphrase : undefined,
        },
      });
      setLoaded(saved);
      setPassword("");
      setPassphrase("");
      if (saved.secretSaveFailed) {
        toast.error("다른 설정은 저장됐지만, 이 기기에서는 비밀 값을 안전하게 저장할 수 없어 저장되지 않았습니다.");
      } else {
        toast.success("연결 설정이 저장되었습니다.");
      }
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePickKeyFile = async () => {
    const picked = await pickPrivateKeyFile();
    if (picked) setPrivateKeyPath(picked);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT_BG }}>
          <Plug className="w-4 h-4" style={{ color: ACCENT }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>연결 설정</p>
          <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
            {loaded?.mode === "local" && "기본 백엔드 사용 중"}
            {loaded?.mode === "link" && `링크 사용 중 · ${loaded.linkBaseUrl || "(주소 없음)"}`}
            {loaded?.mode === "ssh" && `SSH 사용 중 · ${loaded.ssh.username || "?"}@${loaded.ssh.host || "?"}:${loaded.ssh.port}`}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
        {!remoteSupported && (
          <div className="px-2.5 py-2 rounded-lg text-[10px]" style={{ background: "rgba(245,158,11,0.10)", color: UI_AMBER }}>
            링크/SSH 연결은 데스크톱 앱(Electron)에서만 사용할 수 있습니다. 웹 브라우저에서는 기본 연결만 지원됩니다.
          </div>
        )}

        {/* 모드 선택 */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {(Object.keys(MODE_META) as ConnectionMode[]).map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            const disabled = m !== "local" && !remoteSupported;
            const active = mode === m;
            return (
              <button
                key={m}
                disabled={disabled}
                onClick={() => { setMode(m); setTestResult(null); }}
                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: active ? ACCENT_BG : "rgba(0,0,0,0.15)",
                  border: `1px solid ${active ? ACCENT_BORDER : BORDER_SUBTLE}`,
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: active ? ACCENT : TEXT_SECONDARY }} />
                <span className="text-[10.5px] font-semibold" style={{ color: active ? ACCENT : TEXT_PRIMARY }}>{meta.label}</span>
                <span className="text-[9px] leading-tight" style={{ color: TEXT_TERTIARY }}>{meta.desc}</span>
              </button>
            );
          })}
        </div>

        {mode === "link" && (
          <label className="block space-y-1">
            <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>백엔드 주소 (Base URL)</span>
            <input
              value={linkBaseUrl}
              onChange={(e) => { setLinkBaseUrl(e.target.value); setTestResult(null); }}
              placeholder="https://synaipse-server.example.com"
              className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
              style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
            />
          </label>
        )}

        {mode === "ssh" && (
          <div className="grid grid-cols-2 gap-2.5">
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>호스트</span>
              <input
                value={host}
                onChange={(e) => { setHost(e.target.value); setTestResult(null); }}
                placeholder="203.0.113.10 또는 my-cloud-server.com"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>포트</span>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 22)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>사용자명</span>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setTestResult(null); }}
                placeholder="ubuntu"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>인증 방식</span>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as SshAuthType)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              >
                <option value="password">비밀번호</option>
                <option value="key">개인 키 파일</option>
              </select>
            </label>

            {authType === "password" ? (
              <label className="col-span-2 space-y-1">
                <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loaded?.ssh.hasPassword ? "저장된 비밀번호가 있습니다 · 새 값 입력 시 교체" : "비밀번호 입력"}
                  className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                  style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                />
              </label>
            ) : (
              <>
                <label className="col-span-2 space-y-1">
                  <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>개인 키 파일 경로</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={privateKeyPath}
                      onChange={(e) => setPrivateKeyPath(e.target.value)}
                      placeholder="C:\\Users\\me\\.ssh\\id_rsa"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                      style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                    />
                    <button
                      onClick={handlePickKeyFile}
                      className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-semibold"
                      style={{ border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                    >
                      <FolderOpen className="w-3 h-3" /> 찾아보기
                    </button>
                  </div>
                </label>
                <label className="col-span-2 space-y-1">
                  <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>패스프레이즈 (선택)</span>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={loaded?.ssh.hasPassphrase ? "저장된 패스프레이즈가 있습니다" : "키에 암호가 없다면 비워두세요"}
                    className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                    style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                  />
                </label>
              </>
            )}

            <label className="col-span-2 space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>원격 작업 디렉터리</span>
              <input
                value={remoteWorkingDir}
                onChange={(e) => setRemoteWorkingDir(e.target.value)}
                placeholder="/home/ubuntu/we-ai-server"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>빌드 도구</span>
              <select
                value={buildTool}
                onChange={(e) => setBuildTool(e.target.value as SshBuildTool)}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              >
                <option value="GRADLE">Gradle</option>
                <option value="MAVEN">Maven</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[9.5px] font-semibold" style={{ color: TEXT_LABEL }}>로그 tail 커맨드</span>
              <input
                value={logCommand}
                onChange={(e) => setLogCommand(e.target.value)}
                placeholder="tail -n 200 -f app.log"
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none font-mono"
                style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
              />
            </label>
          </div>
        )}

        {testResult && (
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px]"
            style={{
              background: testResult.ok ? "rgba(53,237,126,0.10)" : "rgba(239,68,68,0.10)",
              color: testResult.ok ? UI_GREEN : UI_RED,
            }}
          >
            {testResult.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
            {testResult.ok
              ? `연결 성공 · ${testResult.latencyMs}ms${testResult.info ? ` · ${testResult.info}` : ""}`
              : testResult.reason}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {mode !== "local" && (
            <button
              onClick={handleTest}
              disabled={testing || !remoteSupported}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/[0.04]"
              style={{ border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
              연결 테스트
            </button>
          )}
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
    </div>
  );
}
