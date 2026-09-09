// ============================================================
// WE&AI Project Office — 중앙 색상 관리 파일
// 팔레트: 다크 네이비 사이드바 + 인디고·핑크 액센트 (다크 전용, 단색 기반)
// ※ 상수명(OLIVE_DARK/SAGE/BEIGE/CREAM 등)은 구 올리브·베이지 팔레트의
//   잔재이며 값만 신규 팔레트로 교체되었다. 대규모 rename은 별도 작업으로 남겨둠.
// ============================================================

// ── 베이스 팔레트 ──────────────────────────────────────────
export const SIDEBAR_DEEP  = "#0A0D3A";   // 사이드바/타이틀바 — 다크 네이비
export const OLIVE_DARK    = "#5865F2";   // 인디고 (메인 액센트) — 상수명은 legacy
export const SAGE          = "#35ED7E";   // 그린 (서브 액센트) — 상수명은 legacy
export const BEIGE         = "#1E2353";   // 다크 네이비 패널톤 — 상수명은 legacy
export const CREAM         = "#0A0D3A";   // 다크 네이비 서브 배경 — 상수명은 legacy
export const BRIGHT_BEIGE  = "#23272A";   // 다크 차콜 카드 배경 — 상수명은 legacy

// ── 텍스트 (콘텐츠 영역 밝은 배경용) ─────────────────────
export const TEXT_PRIMARY   = "#1B1F3A";   // 밝은 콘텐츠 영역의 기본 텍스트
export const TEXT_SECONDARY = "#454B70";   // 밝은 콘텐츠 영역의 보조 텍스트
export const TEXT_TERTIARY  = "#656B91";   // 밝은 콘텐츠 영역의 3차 텍스트
export const TEXT_LABEL     = "#767DA6";   // 밝은 콘텐츠 영역의 레이블 텍스트
export const TEXT_ON_DARK   = "#FFFFFF";   // 어두운 표면 위 기본 텍스트
export const TEXT_ON_DARK_MUTED = "#B5B9DE"; // 어두운 표면 위 보조 텍스트

// ── 사이드바 텍스트 (어두운 사이드바 배경 전용) ───────────
export const SIDEBAR_TEXT        = "rgba(255,255,255,0.55)";
export const SIDEBAR_TEXT_ACTIVE = "rgba(255,255,255,0.95)";
export const SIDEBAR_TEXT_HOVER  = "rgba(255,255,255,0.80)";
export const SIDEBAR_TEXT_LABEL  = "rgba(255,255,255,0.28)";
export const SIDEBAR_TEXT_MUTED  = "rgba(255,255,255,0.18)";

// ── 서피스 / 배경 ─────────────────────────────────────────
export const OUTER_BG       = "#000000";   // 최외부 래퍼 배경 (순검정)
export const SIDEBAR_BG     = "#0A0D3A";   // 사이드바 배경
export const TITLEBAR_BG    = "#0A0D3A";   // 타이틀바 배경
export const CONTENT_BG     = "#0A0D3A";   // 메인 콘텐츠 배경
export const PANEL_BG       = "#1E2353";   // 패널 배경
export const CARD_BG        = "#23272A";   // 카드 배경
export const INPUT_BG       = "#1E2353";   // 인풋 배경
export const TABLE_HEADER_BG = "#1E2353";  // 테이블 헤더 배경
export const TABLE_BG       = "#23272A";   // 테이블 배경
export const LOGIN_BG       = "#0A0D3A";   // 로그인/프로젝트 선택 배경

// ── 보더 ──────────────────────────────────────────────────
export const BORDER         = "rgba(255,255,255,0.14)";
export const BORDER_SUBTLE  = "rgba(255,255,255,0.08)";
export const SIDEBAR_BORDER = "rgba(255,255,255,0.08)";

// ── 인터랙션 (사이드바 어두운 배경 기준) ──────────────────
export const SIDEBAR_HOVER   = "rgba(255,255,255,0.06)";
export const SIDEBAR_ACTIVE  = "rgba(255,255,255,0.10)";

// ── 액센트 ────────────────────────────────────────────────
export const ACCENT         = "#5865F2";
export const ACCENT_SAGE    = "#35ED7E";
export const ACCENT_MID     = "#EC48BD";
export const ACCENT_BG      = "rgba(88,101,242,0.16)";
export const ACCENT_BORDER  = "rgba(88,101,242,0.45)";
export const ACCENT_BG_10   = "rgba(88,101,242,0.10)";  // 옅은 액센트 배경 (배지 등)
export const ACCENT_BG_08   = "rgba(88,101,242,0.08)";  // 더 옅은 액센트 배경
export const ACCENT_BG_04   = "rgba(88,101,242,0.04)";  // 비활성 버튼 배경
export const ACCENT_TRACK   = "rgba(88,101,242,0.20)";  // 스피너 트랙 색상

// ── UI 상태 색상 (범용 시맨틱 컬러) ──────────────────────
export const UI_GREEN       = "#35ED7E";   // 성공/활성/러닝
export const UI_GREEN_DARK  = "#20C96A";   // 진한 그린
export const UI_RED         = "#ef4444";   // 에러/삭제
export const UI_RED_DARK    = "#dc2626";   // 진한 레드 (critical)
export const UI_AMBER       = "#f59e0b";   // 경고/수정
export const UI_AMBER_DARK  = "#d97706";   // 진한 앰버
export const UI_VIOLET      = "#EC48BD";   // 정보/메모리/보라
export const UI_INDIGO      = "#5865F2";   // 인디고 액센트
export const UI_GRAY        = "#6b7280";   // 비활성/유휴
export const UI_GRAY_LIGHT  = "#9ca3af";   // 연한 그레이
export const UI_GRAY_BORDER = "#d1d5db";   // 보더/비활성 도트
export const UI_CYAN        = "#00B0F4";   // 시안 (네트워크 등)
export const UI_BLUE        = "#3b82f6";   // 블루 (TypeScript 등)
export const UI_PINK        = "#EC48BD";   // 핑크 (CSS 등)

// ── UI 상태 배경 ──────────────────────────────────────────
// ※ 아래 rgba 값은 반드시 위 UI_* 솔리드 색상과 같은 RGB를 사용한다.
//   (팔레트 교체 시 여기 색만 따로 남아 어긋나는 사고가 있었음 — 값 변경 시 함께 갱신)
export const UI_GREEN_BG    = "rgba(53,237,126,0.10)";  // UI_GREEN(#35ED7E)
export const UI_GREEN_BG7   = "rgba(53,237,126,0.07)";
export const UI_GREEN_BG8   = "rgba(53,237,126,0.08)";
export const UI_RED_BG      = "rgba(239,68,68,0.10)";   // UI_RED(#ef4444)
export const UI_RED_BG7     = "rgba(239,68,68,0.07)";
export const UI_RED_BG8     = "rgba(239,68,68,0.08)";
export const UI_AMBER_BG    = "rgba(245,158,11,0.10)";  // UI_AMBER(#f59e0b)
export const UI_AMBER_BG7   = "rgba(245,158,11,0.07)";
export const UI_AMBER_BG8   = "rgba(245,158,11,0.08)";
export const UI_VIOLET_BG   = "rgba(236,72,189,0.10)";  // UI_VIOLET(#EC48BD)
export const UI_VIOLET_BG7  = "rgba(236,72,189,0.07)";
export const UI_VIOLET_BG8  = "rgba(236,72,189,0.08)";
export const UI_INDIGO_BG   = "rgba(88,101,242,0.10)";  // UI_INDIGO(#5865F2)
export const UI_GRAY_BG     = "rgba(107,114,128,0.10)";
export const UI_GRAY_BG8    = "rgba(107,114,128,0.08)";
export const UI_CYAN_BG     = "rgba(0,176,244,0.10)";   // UI_CYAN(#00B0F4)
export const UI_BLUE_BG     = "rgba(59,130,246,0.10)";
export const UI_PINK_BG     = "rgba(236,72,189,0.08)";  // UI_PINK(#EC48BD)

// ── 터미널/코드 UI (GitHub Dark 테마) ───────────────────
export const TERM_BG        = "#0d1117";   // 터미널 배경
export const TERM_HEADER    = "#161b22";   // 터미널 헤더
export const TERM_BORDER_D  = "#21262d";   // 터미널 어두운 보더
export const TERM_BORDER_L  = "#30363d";   // 터미널 밝은 보더
export const TERM_TEXT      = "#c9d1d9";   // 터미널 텍스트
export const TERM_MUTED     = "#8b949e";   // 터미널 뮤트
export const TERM_DIM       = "#6e7681";   // 터미널 딤
export const TERM_DIMMER    = "#484f58";   // 터미널 더 딤
export const TERM_GREEN     = "#7ee787";   // git 추가
export const TERM_RED       = "#ff7b72";   // git 삭제
export const TERM_RED2      = "#f97583";   // 에러 텍스트
export const TERM_YELLOW    = "#e3b341";   // 경고 텍스트
export const TERM_BLUE      = "#58a6ff";   // 링크/태그
export const TERM_BLUE2     = "#79c0ff";   // 키 하이라이트
export const TERM_BLUE3     = "#a5d6ff";   // 값 하이라이트
export const TERM_PURPLE    = "#a371f7";   // 머지 보라
export const TERM_INDIGO    = "#a5a0ff";   // 인디고 라이트
export const TERM_GREEN2    = "#3fb950";   // 활성 그린
export const TERM_GREEN_BAR = "#238636";   // 그린 바
export const TERM_GREEN_BAR2 = "#2ea043";  // 그린 바2
export const TERM_RED_BAR   = "#da3633";   // 레드 바
export const TERM_RED3      = "#f85149";   // git 삭제 밝음

// ── macOS 트래픽 라이트 ────────────────────────────────────
export const TRAFFIC_RED    = "#ff5f57";
export const TRAFFIC_YELLOW = "#ffbd2e";
export const TRAFFIC_GREEN  = "#28ca41";

// ── 버튼/서피스 ────────────────────────────────────────────
export const BTN_DARK       = "#1c1c1e";   // 다크 버튼 배경
// TODO: 아래 두 값은 구 올리브 팔레트 원본 hex가 그대로 남아있음(신규 네이비/인디고 팔레트로 미이관).
// 사용처(WeAIDashboard.tsx 등)가 여전히 라이트 배경 전제로 짜여 있어, 값만 바꾸면 그 화면들이 깨진다.
// 값 교체는 해당 사용처 전체를 다크 배경으로 맞추는 별도 작업으로 처리할 것.
export const CTA_BG         = "#2A2C10";   // CTA 배경 — legacy 올리브 hex, 미이관
export const OLIVE_DARK_BG  = "#212308";   // 배경 — legacy 올리브 hex, 미이관

// ── 그라디언트 ─────────────────────────────────────────────
/** 페이지 헤더 — 파스텔 레인보우 */
export const GRADIENT_HEADER      = "linear-gradient(135deg, #0A0D3A 0%, #1E2353 35%, #5865F2 68%, #EC48BD 100%)";
export const GRADIENT_HEADER_SM   = "linear-gradient(135deg, #0A0D3A, #1E2353, #5865F2, #EC48BD)";
export const GRADIENT_HEADER_SM2  = "linear-gradient(135deg, #0A0D3A, #5865F2, #EC48BD)";
export const GRADIENT_HEADER_SM3  = "linear-gradient(135deg, #1E2353, #5865F2, #EC48BD)";
/** 인디고 그라디언트 (CTA 버튼 등) */
export const GRADIENT_INDIGO      = "linear-gradient(135deg, #5865F2, #EC48BD)";
/** 프로젝트 헤더 배너 그라디언트 (ProjectSettingsPage/SkeletonLoader 공용) */
export const GRADIENT_HEADER_BANNER = "linear-gradient(135deg, #0A0D3A 0%, #1E2353 45%, #5865F2 74%, #EC48BD 118%)";
/** 인디고 세로 레인보우 보더 */
export const GRADIENT_RAINBOW_BORDER = "linear-gradient(180deg, #635bff 0%, #8b5cf6 45%, #ec4899 80%, #fbbf24 100%) 1";
export const GRADIENT_RAINBOW_BORDER2 = "linear-gradient(180deg, #635bff 0%, #8b5cf6 40%, #ec4899 80%, #fbbf24 100%) 1";
export const GRADIENT_RAINBOW_BORDER3 = "linear-gradient(180deg, #635bff 0%, #8b5cf6 50%, #ec4899 100%) 1";

/** 페이지 콘텐츠 배경 — 화이트 */
export const GRADIENT_PAGE = "#0A0D3A";
/** 사이드바 배경 — 다크 네이비 단색 */
export const GRADIENT_SIDEBAR = "#0A0D3A";
/** 외부 래퍼 배경 — 순검정 단색 */
export const GRADIENT_OUTER = "#000000";
/** 로고/아이콘 배경 — 인디고 단색 */
export const GRADIENT_LOGO = "#5865F2";
/** 활성 항목 배경 (사이드바) — 화이트 틴트 */
export const GRADIENT_ACTIVE = "rgba(88,101,242,0.28)";
/** 콘텐츠 영역 활성 항목 배경 */
export const GRADIENT_ACTIVE_LIGHT = "rgba(88,101,242,0.30)";
/** 배경 orb — 제거 */
export const GRADIENT_ORB_1 = "transparent";
export const GRADIENT_ORB_2 = "transparent";
export const GRADIENT_ORB_3 = "transparent";
/** 카드 배경 — 다크 차콜 단색 */
export const GRADIENT_CARD = "#23272A";
/** 헤더 배너 배경 — 다크 네이비 패널톤 단색 */
export const GRADIENT_BANNER = "#1E2353";

// ── 상태 색상 ─────────────────────────────────────────────
// STATUS_ERROR(#B85450)만 legacy 올리브 팔레트의 브라운레드가 그대로 남아있음
export const STATUS_RUNNING = "#35ED7E";
export const STATUS_IDLE    = "#B5B9DE";
export const STATUS_ERROR   = "#B85450";
export const STATUS_SUCCESS = "#35ED7E";
export const STATUS_WARNING = "#00B0F4";
export const STATUS_STOPPED = "#8F95C6";

// ── 코드 / 터미널 영역 ────────────────────────────────────
// TODO: 아래 4개는 legacy 올리브 팔레트 hex가 그대로 남아있음(신규 팔레트로 미이관).
// 코드/터미널 UI는 대신 TERM_*(GitHub Dark 팔레트, 아래) 사용을 권장.
export const CODE_BG     = "#0E1003";
export const CODE_BG_MID = "#131507";
export const CODE_FG     = "#D4CC9E";
export const CODE_MUTED  = "#9A9B72";

// ── 로그인 화면 전용 ──────────────────────────────────────
export const LOGIN_MUTED       = "#B5B9DE";   // 뮤트 텍스트 (인디고 계열)
export const LOGIN_ICON_MUTED  = "#8F95C6";   // 뮤트 아이콘
export const LOGIN_CHECKBOX    = "#8F95C6";   // 체크박스 비활성
export const LOGIN_CHEVRON     = "#B5B9DE";   // 화살표 색
export const LOGIN_OLIVE_TEXT  = "#D9DCFF";   // 밝은 인디고 텍스트 (상수명은 legacy)
export const LOGIN_DISABLED_BG = "#1E2353";   // 비활성 버튼 배경
export const LOGIN_DISABLED_BG2 = "#23272A";  // 비활성 배경2
export const LOGIN_SHADOW_1    = "#13184A";   // 카드 그림자1
export const LOGIN_SHADOW_2    = "#0A0D3A";   // 카드 그림자2

// ── 파일 타입 색상 ────────────────────────────────────────
// TODO: 라이트 배경 전제의 legacy 올리브 hex가 그대로 남아있음(신규 팔레트로 미이관).
// FILE_COLORS_DARK(신규 팔레트 적용 완료)로 통합하는 것을 고려할 것.
export const FILE_COLORS: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(192,152,64,0.10)",  color: "#C09840" },
  gradle: { bg: "rgba(65,67,27,0.08)",    color: "#41431B" },
  yml:    { bg: "rgba(90,138,74,0.10)",   color: "#5A8A4A" },
  ts:     { bg: "rgba(107,122,80,0.10)",  color: "#6B7A50" },
  tsx:    { bg: "rgba(174,183,132,0.12)", color: "#7A8B5A" },
  css:    { bg: "rgba(184,120,80,0.08)",  color: "#B87850" },
  env:    { bg: "rgba(136,138,98,0.08)",  color: "#888A62" },
  link:   { bg: "rgba(174,183,132,0.10)", color: "#AEB784" },
  pdf:    { bg: UI_RED_BG8,               color: UI_RED_DARK },
  md:     { bg: UI_VIOLET_BG,             color: UI_VIOLET },
};

// ── 터미널 파일 타입 (GitHub Dark용) ─────────────────────
export const FILE_COLORS_DARK: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(245,158,11,0.10)",  color: UI_AMBER },
  gradle: { bg: "rgba(65,67,27,0.08)",    color: ACCENT },
  yml:    { bg: UI_GREEN_BG,              color: UI_GREEN },
  ts:     { bg: UI_BLUE_BG,              color: UI_BLUE },
  tsx:    { bg: UI_CYAN_BG,              color: UI_CYAN },
  css:    { bg: UI_PINK_BG,              color: UI_PINK },
  env:    { bg: UI_GRAY_BG8,             color: UI_GRAY },
  pdf:    { bg: UI_RED_BG,               color: UI_RED },
  md:     { bg: UI_VIOLET_BG,            color: UI_VIOLET },
  link:   { bg: UI_VIOLET_BG8,           color: UI_VIOLET },
};

// ── 변경 상태 색상 ────────────────────────────────────────
// TODO: legacy 올리브 hex가 그대로 남아있음(신규 팔레트로 미이관).
export const CHANGE_MODIFIED = { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" };
export const CHANGE_ADDED   = { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" };
export const CHANGE_DELETED = { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" };

// ── 브랜치 색상 팔레트 ────────────────────────────────────
// TODO: legacy 올리브 hex가 그대로 남아있음(신규 팔레트로 미이관).
export const BRANCH_COLORS = [
  "#AEB784", "#5A8A4A", "#C09840", "#D4CC9E", "#6B7A50", "#B87850",
];

// ── 차트 색상 ─────────────────────────────────────────────
export const CHART_1 = "#5865F2";
export const CHART_2 = "#35ED7E";
export const CHART_3 = "#EC48BD";
export const CHART_4 = "#00B0F4";
export const CHART_5 = "#F59E0B";

// ── 빌드 페이지 배경 ──────────────────────────────────────
export const BUILD_OLIVE_BG = "#0A0D3A";   // 다크 네이비 (상수명은 legacy)

// ── 언어 색상 (GitHub 언어 기반) ──────────────────────────
export const LANG_GRADLE = "#02A0FF";
export const LANG_JAVA   = "#B07219";
export const LANG_YML    = "#CB171E";

// ── 채팅 아바타 그라디언트 ────────────────────────────────
export const CHAT_AVATARS = [
  "linear-gradient(135deg,#e0e7ff,#ddd6fe)",
  "linear-gradient(135deg,#d1fae5,#a7f3d0)",
  "linear-gradient(135deg,#fce7f3,#fbcfe8)",
  "linear-gradient(135deg,#dbeafe,#bfdbfe)",
];
