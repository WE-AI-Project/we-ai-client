import { SIDEBAR_TEXT_ACTIVE } from "../colors";
import { WindowControls } from "./WindowControls";
import { SynaipseAppIcon, SynaipseWordmark } from "./brand/SynaipseLogo";

// ── 보조 화면(부팅/로그인/참여) 전용 미니 타이틀바 ──
// 메인 화면은 로고+메뉴+윈도우 컨트롤이 있는 전체 커스텀 타이틀바를 쓰지만, 로그인 전
// 화면들에는 그런 메뉴가 없다. frame:false로 OS 타이틀바를 없앴기 때문에, 이 화면들에도
// 최소한 "드래그해서 창 이동" + "최소화/최대화/닫기"는 있어야 한다 — 없으면 로그인 화면에서
// 창을 움직이거나 닫을 방법이 사라진다. Electron이 아닌 웹 프리뷰에서는 렌더링하지 않는다.
export function AuxTitleBar() {
  const isElectron = typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
  if (!isElectron) return null;

  return (
    <div
      className="flex items-center h-8 pl-2.5 gap-1.5 shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <SynaipseAppIcon size={16} />
      <SynaipseWordmark onDark className="text-[10.5px] font-semibold" style={{ color: SIDEBAR_TEXT_ACTIVE }} />
      <div className="flex-1" />
      <WindowControls />
    </div>
  );
}
