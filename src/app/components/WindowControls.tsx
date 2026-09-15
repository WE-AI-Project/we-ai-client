import { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { SIDEBAR_TEXT, SIDEBAR_TEXT_ACTIVE } from "../colors";

// ── 커스텀 타이틀바 윈도우 컨트롤 (VS Code 스타일) ──
// frame:false(Frameless Window)로 OS 타이틀바를 없앤 뒤, 그 자리를 대신하는 최소화/최대화·복원/닫기
// 버튼. 실제 창 제어는 렌더러(Chromium 샌드박스)에서 할 수 없으므로 전부 Electron IPC를 거친다
// (electron/main.cjs의 window:* 핸들러 참고). Electron이 아닌 웹 프리뷰에서는 아무것도 렌더링하지 않는다.
export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.windowControls.isMaximized().then(setIsMaximized);
    const unsubscribe = window.electronAPI!.windowControls.onMaximizeChange(setIsMaximized);
    return unsubscribe;
  }, [isElectron]);

  if (!isElectron) return null;

  const buttonBaseStyle: React.CSSProperties = {
    WebkitAppRegion: "no-drag",
    width: 46,
    color: SIDEBAR_TEXT,
  } as React.CSSProperties;

  return (
    <div className="flex items-stretch h-full shrink-0" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button
        onClick={() => window.electronAPI!.windowControls.minimize()}
        title="최소화"
        aria-label="최소화"
        className="flex items-center justify-center h-full transition-colors"
        style={buttonBaseStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = SIDEBAR_TEXT_ACTIVE; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = SIDEBAR_TEXT; }}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => window.electronAPI!.windowControls.toggleMaximize()}
        title={isMaximized ? "이전 크기로 복원" : "최대화"}
        aria-label={isMaximized ? "이전 크기로 복원" : "최대화"}
        className="flex items-center justify-center h-full transition-colors"
        style={buttonBaseStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = SIDEBAR_TEXT_ACTIVE; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = SIDEBAR_TEXT; }}
      >
        {isMaximized ? <Copy className="w-3 h-3 scale-x-[-1]" /> : <Square className="w-3 h-3" />}
      </button>
      <button
        onClick={() => window.electronAPI!.windowControls.close()}
        title="닫기"
        aria-label="닫기"
        className="flex items-center justify-center h-full transition-colors"
        style={buttonBaseStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#e81123"; e.currentTarget.style.color = "#ffffff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = SIDEBAR_TEXT; }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
