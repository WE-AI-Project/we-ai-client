import { useState } from "react";
import { Terminal, Hammer } from "lucide-react";
import { ServerLogsPage } from "./ServerLogsPage";
import { BuildManagementPage } from "./BuildManagementPage";
import {
  BORDER_SUBTLE,
  GRADIENT_SIDEBAR,
  SIDEBAR_BORDER,
} from "../colors";

// ── Server & Build 탭 통합 페이지 ──
export function ServerBuildPage() {
  const [tab, setTab] = useState<"logs" | "build">("logs");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 탭 헤더 */}
      <div
        className="flex items-center shrink-0 px-3 gap-1"
        style={{
          borderBottom: `1px solid ${BORDER_SUBTLE}`,
          background: GRADIENT_SIDEBAR,
          minHeight: 36,
        }}
      >
        <button
          onClick={() => setTab("logs")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            color:      tab === "logs" ? "rgba(254,252,245,0.95)" : "rgba(154,155,114,0.85)",
            background: tab === "logs" ? "rgba(174,183,132,0.18)" : "transparent",
            borderBottom: tab === "logs" ? "2px solid #AEB784" : "2px solid transparent",
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
            color:      tab === "build" ? "rgba(254,252,245,0.95)" : "rgba(154,155,114,0.85)",
            background: tab === "build" ? "rgba(174,183,132,0.18)" : "transparent",
            borderBottom: tab === "build" ? "2px solid #AEB784" : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          <Hammer className="w-3.5 h-3.5" />
          Build Management
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {tab === "logs"  ? <ServerLogsPage />      : null}
        {tab === "build" ? <BuildManagementPage /> : null}
      </div>
    </div>
  );
}