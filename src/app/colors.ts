// ============================================================
// WE&AI Project Office — 중앙 색상 관리 파일
// 팔레트: 웜 베이지 캔버스 + 올리브 프라이머리 + 브라운 세컨더리
//         (가이드라인.md 2026-09-02 개정 기준)
// ============================================================

// ── 베이스 팔레트 ──────────────────────────────────────────
export const SIDEBAR_DEEP  = "#131507";   // Sidebar / Wrapper — 유일한 다크 앵커
export const OLIVE_DARK    = "#708238";   // Primary Accent — 올리브 (메인 액센트)
export const SAGE          = "#A67B5B";   // Secondary — 브라운 (서브 액센트)
export const BEIGE         = "#F5EFE6";   // Surface (Card/Panel)
export const CREAM         = "#F8F5F2";   // Background Base
export const BRIGHT_BEIGE  = "#FBF8F3";   // 가장 밝은 서피스 (popover 등)

// ── 텍스트 (콘텐츠 영역 밝은 배경용) ─────────────────────
export const TEXT_PRIMARY   = "#1F1F1F";   // Text Base
export const TEXT_SECONDARY = "#5C5C5C";   // 보조 텍스트 (Text Base 뮤트)
export const TEXT_TERTIARY  = "#7A7A7A";   // 3차 텍스트
export const TEXT_LABEL     = "#8A8A8A";   // 레이블 텍스트

// ── 사이드바 텍스트 (어두운 사이드바 배경 전용) ───────────
export const SIDEBAR_TEXT        = "rgba(255,255,255,0.55)";
export const SIDEBAR_TEXT_ACTIVE = "rgba(255,255,255,0.95)";
export const SIDEBAR_TEXT_HOVER  = "rgba(255,255,255,0.80)";
export const SIDEBAR_TEXT_LABEL  = "rgba(255,255,255,0.28)";
export const SIDEBAR_TEXT_MUTED  = "rgba(255,255,255,0.18)";

// ── 서피스 / 배경 ─────────────────────────────────────────
export const OUTER_BG       = "#131507";   // 최외부 래퍼 배경 (Sidebar/Wrapper와 통일)
export const SIDEBAR_BG     = "#131507";   // 사이드바 배경
export const TITLEBAR_BG    = "#131507";   // 타이틀바 배경
export const CONTENT_BG     = "#F8F5F2";   // Background Base — 메인 콘텐츠 배경
export const PANEL_BG       = "#F5EFE6";   // Surface — 패널 배경
export const CARD_BG        = "#FAF7F1";   // 카드 배경 (Surface보다 살짝 밝게 띄움)
export const INPUT_BG       = "#F5EFE6";   // 인풋 배경
export const TABLE_HEADER_BG = "#EFE6D5";  // 테이블 헤더 배경 (Surface보다 한 단계 진하게)
export const TABLE_BG       = "#F7F2EA";   // 테이블 배경
export const LOGIN_BG       = "#F8F5F2";   // 로그인/프로젝트 선택 배경

// ── 보더 ──────────────────────────────────────────────────
export const BORDER         = "rgba(31,31,31,0.12)";
export const BORDER_SUBTLE  = "rgba(31,31,31,0.07)";
export const SIDEBAR_BORDER = "rgba(255,255,255,0.08)";

// ── 인터랙션 (사이드바 어두운 배경 기준) ──────────────────
export const SIDEBAR_HOVER   = "rgba(255,255,255,0.06)";
export const SIDEBAR_ACTIVE  = "rgba(255,255,255,0.10)";

// ── 액센트 ────────────────────────────────────────────────
export const ACCENT         = "#708238";   // Primary Accent (Olive)
export const ACCENT_SAGE    = "#A67B5B";   // Secondary (Brown)
export const ACCENT_MID     = "#5C6B2E";   // 올리브 다크 톤 (Primary 어둡게)
export const ACCENT_BG      = "rgba(112,130,56,0.09)";
export const ACCENT_BORDER  = "rgba(112,130,56,0.22)";

// ── UI 상태 색상 (범용 시맨틱 컬러 — 브랜드와 무관, 변경 없음) ──
export const UI_GREEN       = "#10b981";   // 성공/활성/러닝
export const UI_GREEN_DARK  = "#059669";   // 진한 그린
export const UI_RED         = "#ef4444";   // 에러/삭제
export const UI_RED_DARK    = "#dc2626";   // 진한 레드 (critical)
export const UI_AMBER       = "#f59e0b";   // 경고/수정
export const UI_AMBER_DARK  = "#d97706";   // 진한 앰버
export const UI_VIOLET      = "#8b5cf6";   // 정보/메모리/보라
export const UI_INDIGO      = "#635bff";   // 인디고 액센트
export const UI_GRAY        = "#6b7280";   // 비활성/유휴
export const UI_GRAY_LIGHT  = "#9ca3af";   // 연한 그레이
export const UI_GRAY_BORDER = "#d1d5db";   // 보더/비활성 도트
export const UI_CYAN        = "#06b6d4";   // 시안 (네트워크 등)
export const UI_BLUE        = "#3b82f6";   // 블루 (TypeScript 등)
export const UI_PINK        = "#ec4899";   // 핑크 (CSS 등)

// ── UI 상태 배경 ──────────────────────────────────────────
export const UI_GREEN_BG    = "rgba(16,185,129,0.10)";
export const UI_GREEN_BG7   = "rgba(16,185,129,0.07)";
export const UI_GREEN_BG8   = "rgba(16,185,129,0.08)";
export const UI_RED_BG      = "rgba(239,68,68,0.10)";
export const UI_RED_BG7     = "rgba(239,68,68,0.07)";
export const UI_RED_BG8     = "rgba(239,68,68,0.08)";
export const UI_AMBER_BG    = "rgba(245,158,11,0.10)";
export const UI_AMBER_BG7   = "rgba(245,158,11,0.07)";
export const UI_AMBER_BG8   = "rgba(245,158,11,0.08)";
export const UI_VIOLET_BG   = "rgba(139,92,246,0.10)";
export const UI_VIOLET_BG7  = "rgba(139,92,246,0.07)";
export const UI_VIOLET_BG8  = "rgba(139,92,246,0.08)";
export const UI_INDIGO_BG   = "rgba(99,91,255,0.10)";
export const UI_GRAY_BG     = "rgba(107,114,128,0.10)";
export const UI_GRAY_BG8    = "rgba(107,114,128,0.08)";
export const UI_CYAN_BG     = "rgba(6,182,212,0.10)";
export const UI_BLUE_BG     = "rgba(59,130,246,0.10)";
export const UI_PINK_BG     = "rgba(236,72,153,0.08)";

// ── 터미널/코드 UI (GitHub Dark 테마 — 변경 없음) ───────────────────
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

// ── macOS 트래픽 라이트 (변경 없음) ────────────────────────────────
export const TRAFFIC_RED    = "#ff5f57";
export const TRAFFIC_YELLOW = "#ffbd2e";
export const TRAFFIC_GREEN  = "#28ca41";

// ── 버튼/서피스 ────────────────────────────────────────────
export const BTN_DARK       = "#1c1c1e";   // 다크 버튼 배경
export const CTA_BG         = "#3E4A1D";   // CTA 올리브 다크 (Primary 어둡게)
export const OLIVE_DARK_BG  = "#212308";   // 올리브 다크 배경

// ── 그라디언트 ─────────────────────────────────────────────
/** 페이지 헤더 — 단색 서피스 (장식용 그라디언트 제거) */
export const GRADIENT_HEADER      = "#F0E8DA";
export const GRADIENT_HEADER_SM   = "#F0E8DA";
export const GRADIENT_HEADER_SM2  = "#F0E8DA";
export const GRADIENT_HEADER_SM3  = "#F0E8DA";
/** 올리브 → 브라운 그라디언트 (CTA 버튼 등) */
export const GRADIENT_INDIGO      = "linear-gradient(135deg, #708238, #A67B5B)";
/** 올리브 → 브라운 세로 보더 */
export const GRADIENT_RAINBOW_BORDER = "linear-gradient(180deg, #708238 0%, #8C6E4A 45%, #A67B5B 80%, #C09840 100%) 1";
export const GRADIENT_RAINBOW_BORDER2 = "linear-gradient(180deg, #708238 0%, #8C6E4A 40%, #A67B5B 80%, #C09840 100%) 1";
export const GRADIENT_RAINBOW_BORDER3 = "linear-gradient(180deg, #708238 0%, #8C6E4A 50%, #A67B5B 100%) 1";

/** 페이지 콘텐츠 배경 — Background Base */
export const GRADIENT_PAGE = "#F8F5F2";
/** 사이드바 배경 — Sidebar/Wrapper 단색 */
export const GRADIENT_SIDEBAR = "#131507";
/** 외부 래퍼 배경 — Sidebar/Wrapper와 통일 */
export const GRADIENT_OUTER = "#131507";
/** 로고/아이콘 배경 — Secondary(브라운) 단색 */
export const GRADIENT_LOGO = "#A67B5B";
/** 활성 항목 배경 (사이드바) — 화이트 틴트 */
export const GRADIENT_ACTIVE = "rgba(255,255,255,0.10)";
/** 콘텐츠 영역 활성 항목 배경 */
export const GRADIENT_ACTIVE_LIGHT = "rgba(166,123,91,0.30)";
/** 배경 orb — 제거 */
export const GRADIENT_ORB_1 = "transparent";
export const GRADIENT_ORB_2 = "transparent";
export const GRADIENT_ORB_3 = "transparent";
/** 카드 배경 */
export const GRADIENT_CARD = "#FAF7F1";
/** 헤더 배너 배경 — 진한 베이지 */
export const GRADIENT_BANNER = "#F0E8DA";

// ── 상태 색상 (시맨틱 — 브랜드와 무관, 변경 없음) ──────────────────
export const STATUS_RUNNING = "#5A8A4A";
export const STATUS_IDLE    = "#9A9B72";
export const STATUS_ERROR   = "#B85450";
export const STATUS_SUCCESS = "#5A8A4A";
export const STATUS_WARNING = "#C09840";
export const STATUS_STOPPED = "#888A62";

// ── 코드 / 터미널 영역 (다크 — 변경 없음) ────────────────────
export const CODE_BG     = "#0E1003";
export const CODE_BG_MID = "#131507";
export const CODE_FG     = "#D4CC9E";
export const CODE_MUTED  = "#9A9B72";

// ── 로그인 화면 전용 ──────────────────────────────────────
export const LOGIN_MUTED       = "#9A9B7A";   // 뮤트 텍스트
export const LOGIN_ICON_MUTED  = "#B8B6A8";   // 뮤트 아이콘
export const LOGIN_CHECKBOX    = "#C8C5B8";   // 체크박스 비활성
export const LOGIN_CHEVRON     = "#C0BDB0";   // 화살표 색
export const LOGIN_OLIVE_TEXT  = "#5A6B2E";   // Primary(올리브) 톤 텍스트
export const LOGIN_DISABLED_BG = "#ECEAE4";   // 비활성 버튼 배경
export const LOGIN_DISABLED_BG2 = "#E8E6DF";  // 비활성 배경2
export const LOGIN_SHADOW_1    = "#E2E0DA";   // 카드 그림자1
export const LOGIN_SHADOW_2    = "#D4D2CC";   // 카드 그림자2

// ── 파일 타입 색상 ────────────────────────────────────────
export const FILE_COLORS: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(192,152,64,0.10)",  color: "#C09840" },
  gradle: { bg: "rgba(112,130,56,0.08)",  color: "#708238" },
  yml:    { bg: "rgba(90,138,74,0.10)",   color: "#5A8A4A" },
  ts:     { bg: "rgba(107,122,80,0.10)",  color: "#6B7A50" },
  tsx:    { bg: "rgba(166,123,91,0.12)",  color: "#A67B5B" },
  css:    { bg: "rgba(184,120,80,0.08)",  color: "#B87850" },
  env:    { bg: "rgba(136,138,98,0.08)",  color: "#888A62" },
  link:   { bg: "rgba(166,123,91,0.10)",  color: "#A67B5B" },
  pdf:    { bg: UI_RED_BG8,               color: UI_RED_DARK },
  md:     { bg: UI_VIOLET_BG,             color: UI_VIOLET },
};

// ── 터미널 파일 타입 (GitHub Dark용 — 변경 없음) ─────────────────────
export const FILE_COLORS_DARK: Record<string, { bg: string; color: string }> = {
  java:   { bg: "rgba(245,158,11,0.10)",  color: UI_AMBER },
  gradle: { bg: "rgba(112,130,56,0.08)",  color: ACCENT },
  yml:    { bg: UI_GREEN_BG,              color: UI_GREEN },
  ts:     { bg: UI_BLUE_BG,              color: UI_BLUE },
  tsx:    { bg: UI_CYAN_BG,              color: UI_CYAN },
  css:    { bg: UI_PINK_BG,              color: UI_PINK },
  env:    { bg: UI_GRAY_BG8,             color: UI_GRAY },
  pdf:    { bg: UI_RED_BG,               color: UI_RED },
  md:     { bg: UI_VIOLET_BG,            color: UI_VIOLET },
  link:   { bg: UI_VIOLET_BG8,           color: UI_VIOLET },
};

// ── 변경 상태 색상 (시맨틱 — 변경 없음) ─────────────────────
export const CHANGE_MODIFIED = { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" };
export const CHANGE_ADDED   = { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" };
export const CHANGE_DELETED = { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" };

// ── 브랜치 색상 팔레트 ────────────────────────────────────
export const BRANCH_COLORS = [
  "#A67B5B", "#5A8A4A", "#C09840", "#D4CC9E", "#6B7A50", "#B87850",
];

// ── 차트 색상 ─────────────────────────────────────────────
export const CHART_1 = "#708238";
export const CHART_2 = "#A67B5B";
export const CHART_3 = "#C09840";
export const CHART_4 = "#5A8A4A";
export const CHART_5 = "#B87850";

// ── 빌드 올리브 배경 ──────────────────────────────────────
export const BUILD_OLIVE_BG = "#1E1F0A";

// ── 언어 색상 (GitHub 언어 기반 — 변경 없음) ──────────────────────
export const LANG_GRADLE = "#02A0FF";
export const LANG_JAVA   = "#B07219";
export const LANG_YML    = "#CB171E";

// ── 채팅 아바타 단색 (사용자 구분용 — 그라디언트 대신 플랫 컬러) ────────────
export const CHAT_AVATARS = [
  "#708238",
  "#A67B5B",
  "#5A8A4A",
  "#C09840",
];

