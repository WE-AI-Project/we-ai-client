import { useState, useEffect, useCallback } from "react";
import { Terminal, Hammer, Plug, ChevronDown, ChevronUp } from "lucide-react";
import { ServerLogsPage } from "./ServerLogsPage";
import { BuildManagementPage } from "./BuildManagementPage";
import { ConnectionSettingsCard } from "./ConnectionSettingsCard";
import {
  loadConnectionConfig,
  connectionKeyForProject,
  type ConnectionConfig,
} from "../lib/serverConnection";
import {
  BORDER,
  BORDER_SUBTLE,
  BRIGHT_BEIGE,
  ACCENT_BG_10,
  ACCENT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "../colors";

interface ServerBuildPageProps {
  projectId?: number | null;
}

function connectionBadgeText(config: ConnectionConfig | null): string {
  if (!config) return "확인 중...";
  if (config.mode === "local") return "LOCAL";
  if (config.mode === "link") return config.linkBaseUrl ? `LINK · ${config.linkBaseUrl}` : "LINK · (주소 없음)";
  return config.ssh.host ? `SSH · ${config.ssh.username || "?"}@${config.ssh.host}` : "SSH · (호스트 없음)";
}

// ── Server & Build 탭 통합 페이지 ──
export function ServerBuildPage({ projectId }: ServerBuildPageProps) {
  const [tab, setTab] = useState<"logs" | "build">("logs");
  const [showConnection, setShowConnection] = useState(false);
  const [connection, setConnection] = useState<ConnectionConfig | null>(null);
  const [connectionVersion, setConnectionVersion] = useState(0);

  const connectionKey = connectionKeyForProject(projectId);

  useEffect(() => {
    let cancelled = false;
    loadConnectionConfig(connectionKey).then((cfg) => {
      if (!cancelled) setConnection(cfg);
    });
    return () => { cancelled = true; };
  }, [connectionKey, connectionVersion]);

  const handleConnectionSaved = useCallback((cfg: ConnectionConfig) => {
    setConnection(cfg);
    setConnectionVersion((v) => v + 1);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 탭 헤더 */}
      <div
        className="flex items-center shrink-0 px-3 gap-1"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: BRIGHT_BEIGE,
          minHeight: 36,
        }}
      >
        <button
          onClick={() => setTab("logs")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            color:      tab === "logs" ? ACCENT : TEXT_SECONDARY,
            background: tab === "logs" ? "rgba(88,101,242,0.08)" : "transparent",
            borderBottom: tab === "logs" ? `2px solid ${ACCENT}` : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          <Terminal className="w-3.5 h-3.5" />
          Server Logs
        </button>
        <button
          onClick={() => setTab("build")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            color:      tab === "build" ? ACCENT : TEXT_SECONDARY,
            background: tab === "build" ? "rgba(88,101,242,0.08)" : "transparent",
            borderBottom: tab === "build" ? `2px solid ${ACCENT}` : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          <Hammer className="w-3.5 h-3.5" />
          Build Management
        </button>

        <button
          onClick={() => setShowConnection((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ml-auto"
          style={{
            background: showConnection ? ACCENT_BG_10 : "transparent",
            color: showConnection ? ACCENT : TEXT_SECONDARY,
          }}
          title="이 탭이 지금 어떤 서버/머신을 대상으로 동작 중인지 확인하고 바꿉니다"
        >
          <Plug className="w-3.5 h-3.5" />
          <span className="font-mono max-w-[220px] truncate">{connectionBadgeText(connection)}</span>
          {showConnection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showConnection && (
        <div className="shrink-0 px-3 pt-3 pb-1" style={{ background: BRIGHT_BEIGE, borderBottom: `1px solid ${BORDER}` }}>
          <ConnectionSettingsCard projectId={projectId} onSaved={handleConnectionSaved} />
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {tab === "logs" ? <ServerLogsPage projectId={projectId} connectionVersion={connectionVersion} /> : null}
        {tab === "build" ? <BuildManagementPage projectId={projectId} connectionVersion={connectionVersion} /> : null}
      </div>
    </div>
  );
}
