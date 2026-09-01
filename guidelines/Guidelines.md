# WE&AI Project Office — 통합 디자인 시스템 가이드라인 (Design Guidelines)

> 본 문서는 **WE&AI Project Office (synAIpse)** 프론트엔드 및 전체 애플리케이션의 일관된 사용자 경험(UX)과 시각적 완성도(UI)를 유지하기 위한 종합 디자인 시스템 지침서입니다.

---

## 1. 디자인 철학 및 콘셉트 (Design Philosophy)

- **Olive Dark Sidebar + Clean Warm Content**: 깊이감 있는 극다크 올리브 사이드바와 눈이 편안한 밝은 웜톤 콘텐츠 서피스의 조화로 전문성과 가독성을 극대화합니다.
- **GitHub Dark Code & Terminal**: 개발자 친화적인 직관성을 위해 코드, 터미널, 빌드/서버 로그 영역은 GitHub Dark 테마 규격을 따릅니다.
- **Micro-Interactions & Visual Hierarchy**: 과도한 장식을 배제하고 정보의 중요도에 따른 명확한 타이포그래피 계층과 섬세한 상태 피드백(Pulse, Alpha Tint, Pill Badge)을 제공합니다.

---

## 2. 색상 시스템 (Color Palette & Tokens)

색상은 `pteropod/src/app/colors.ts`에 정의된 토큰을 단일 진실 공급원(Single Source of Truth)으로 사용합니다.

### 2.1. 베이스 팔레트 (Brand Identity)
| 토큰명 | Hex Code | 용도 / 설명 |
| :--- | :--- | :--- |
| `SIDEBAR_DEEP` | `#131507` | 사이드바, 최상단 타이틀바 — 초극다크 올리브 |
| `OLIVE_DARK` | `#41431B` | 메인 액센트, 주요 버튼 및 브랜드 컬러 |
| `SAGE` (`ACCENT_SAGE`) | `#AEB784` | 서브 액센트, 로고 배경, 활성 탭 하이라이트 |
| `BEIGE` | `#E3DBBB` | 워밍 베이지, 보조 서피스 틴트 |
| `CREAM` | `#F8F3E1` | 크림 틴트, 서브 배경 |
| `BRIGHT_BEIGE` | `#FEFCF5` | 아주 밝은 베이지, 활성 텍스트 포인트 |
| `OUTER_BG` | `#0C0E02` | 최외부 래퍼 배경 (초극다크 올리브) |

---

### 2.2. 서피스 및 배경 (Surfaces & Backgrounds)
```text
[ Outer Layer: OUTER_BG (#0C0E02) ]
  ├── [ Sidebar Layer: SIDEBAR_BG (#131507) ]
  └── [ Content Layer: CONTENT_BG (#F3F4F1) ]
        ├── [ Panel Layer: PANEL_BG (#ECEEE9) ]
        │     └── [ Card Layer: CARD_BG (#FBFCFA) ]
        └── [ Terminal Layer: TERM_BG (#0D1117) ]
```

| 구분 | 토큰명 | 값 | 적용 대상 |
| :--- | :--- | :--- | :--- |
| 메인 콘텐츠 | `CONTENT_BG` | `#F3F4F1` | 대시보드, 탭 페이지 기본 배경 |
| 서브 패널 | `PANEL_BG` | `#ECEEE9` | 분할 뷰 패널, 보조 컨테이너 |
| 카드 서피스 | `CARD_BG` | `#FBFCFA` | 데이터 카드, 리스트 컨테이너 |
| 입력 필드 | `INPUT_BG` | `#F0F1EE` | 텍스트 입력창, 검색 인풋 |
| 테이블 헤더 | `TABLE_HEADER_BG` | `#E9ECE6` | 테이블 헤더 행 (`<th>`) |
| 테이블 본문 | `TABLE_BG` | `#F7F8F5` | 테이블 데이터 행 |
| 로그인/온보딩 | `LOGIN_BG` | `#F5F4F1` | 로그인 카드 및 온보딩 화면 |

---

### 2.3. 텍스트 색상 계층 (Typography Colors)

#### (1) 콘텐츠 영역 (밝은 배경용)
- **Primary Text (`TEXT_PRIMARY`)**: `#20231B` — 본문 제목, 핵심 수치, 활성 텍스트
- **Secondary Text (`TEXT_SECONDARY`)**: `#4F554A` — 보조 설명, 일반 본문 라벨
- **Tertiary Text (`TEXT_TERTIARY`)**: `#747A70` — 타임스탬프, 메타데이터, 카운터
- **Label Text (`TEXT_LABEL`)**: `#858B80` — 폼 필드 레이블, 테이블 컬럼 헤더

#### (2) 사이드바 영역 (어두운 배경 전용)
- **Active (`SIDEBAR_TEXT_ACTIVE`)**: `rgba(255,255,255,0.95)` — 현재 선택된 네비게이션
- **Hover (`SIDEBAR_TEXT_HOVER`)**: `rgba(255,255,255,0.80)` — 마우스 오버 시
- **Default (`SIDEBAR_TEXT`)**: `rgba(255,255,255,0.55)` — 비활성 네비게이션
- **Label / Muted (`SIDEBAR_TEXT_LABEL`)**: `rgba(255,255,255,0.28)` — 섹션 제목, 축약 정보

---

### 2.4. 시맨틱 상태 색상 (Semantic Status Colors)
| 상태 | 텍스트/아이콘 (`Color`) | 배경 틴트 (`BG`) | 용도 |
| :--- | :--- | :--- | :--- |
| **Success / Live** | `#10b981` (`UI_GREEN`) | `rgba(16,185,129,0.10)` | 정상 완료, LIVE 스트림, 정상 빌드 |
| **Warning** | `#f59e0b` (`UI_AMBER`) | `rgba(245,158,11,0.10)` | 경고, 수정 필요, 연결 중 (Connecting) |
| **Error / Failed** | `#ef4444` (`UI_RED`) | `rgba(239,68,68,0.10)` | 에러, 빌드 실패, 오프라인 |
| **Info / Indigo** | `#635bff` (`UI_INDIGO`) | `rgba(99,91,255,0.10)` | 주요 기능 안내, 자동 스크롤 스위치 |
| **Muted / Idle** | `#6b7280` (`UI_GRAY`) | `rgba(107,114,128,0.10)` | 대기(Idle), 일시정지(Paused) |

---

### 2.5. 터미널 및 로그 영역 (GitHub Dark Code UI)
- **터미널 배경 (`TERM_BG`)**: `#0D1117`
- **터미널 타이틀바 (`TERM_HEADER`)**: `#161B22`
- **터미널 보더 (`TERM_BORDER_D` / `TERM_BORDER_L`)**: `#21262D` / `#30363D`
- **터미널 텍스트 (`TERM_TEXT`)**: `#C9D1D9`
- **터미널 뮤트 텍스트 (`TERM_MUTED` / `TERM_DIM`)**: `#8B949E` / `#6E7681`
- **로그 레벨별 색상**:
  - `INFO`: `#58A6FF` (Tag), `#C9D1D9` (Message)
  - `WARN`: `#E3B341` (Tag/Message)
  - `ERROR`: `#F97583` (Tag/Message)
  - `DEBUG`: `#8B949E` (Tag/Message)
  - `STARTED` / `SUCCESS`: `#7EE787` (Tag/Message)
- **macOS 트래픽 라이트 (Window Controls)**:
  - 🔴 닫기: `#FF5F57`
  - 🟡 최소화: `#FFBD2E`
  - 🟢 최대화: `#28CA41`

---

## 3. 레이아웃 및 규격 (Layout & Spacing Standards)

### 3.1. 사이드바 규격
```typescript
const SIDEBAR_EXPANDED  = 220; // 기본 펼침 너비 (px)
const SIDEBAR_COLLAPSED = 52;  // 접힘 너비 (px)
const SIDEBAR_MIN       = 44;  // 최소 드래그 너비 (px)
const SIDEBAR_MAX       = 340; // 최대 드래그 너비 (px)
const COLLAPSE_THRESHOLD = 100; // 접힘 임계값 (px)
```

### 3.2. 상단 바 및 헤더 규격
- **메인 타이틀바**: 높이 `38px` (배경: `#131507`, 트래픽 라이트 버튼 및 프로젝트 타이틀)
- **서브 탭 헤더 (Server & Build 등)**: 높이 `36px` (배경: `GRADIENT_SIDEBAR`, 하단 2px 액센트 라인)

### 3.3. 여백 및 컨테이너 규격
- **페이지 기본 패딩**: `p-5` (`20px`) 또는 `p-4` (`16px`)
- **콘텐츠 최대 너비**:
  - `max-w-3xl` (`768px`) — Build Management, Profile, Form 페이지
  - `max-w-4xl` (`896px`) — Server Logs, Settings, Analytics 페이지
  - `max-w-5xl` (`1024px`) / `max-w-7xl` — Dashboard, SynAIpse Galaxy

---

## 4. 타이포그래피 시스템 (Typography)

| 계층 | 폰트 크기 | 굵기 (Weight) | 색상 토큰 | 용도 예시 |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-base` (`16px`) | `font-bold` (700) | `TEXT_PRIMARY` | 페이지 대제목, 모달 타이틀 |
| **Section Title** | `text-sm` (`14px`) | `font-semibold` (600) | `TEXT_PRIMARY` | 카드 헤더, 섹션 제목 |
| **Item Title** | `text-[11px]` / `12px` | `font-semibold` (600) | `TEXT_PRIMARY` | 리스트 태스크명, 네비게이션 |
| **Body / Desc** | `text-[10px]` / `11px` | `font-normal` (400) | `TEXT_TERTIARY` | 항목 설명, 메타 정보 |
| **Caption / Badge**| `text-[9px]` | `font-semibold` (600) | 시맨틱 색상 | 상태 배지, 그룹 태그 |
| **Code / Log** | `text-[10px]` | `font-mono` (400/600) | `TERM_TEXT` | 터미널 로그, 쉘 명령어, 타임스탬프 |

---

## 5. UI 컴포넌트 가이드라인 (Component Standards)

### 5.1. 버튼 (Buttons)
1. **Primary Action / CTA**:
   - 배경: `ACCENT_BG` (`rgba(65,67,27,0.09)`), 테두리: `ACCENT_BORDER` (`rgba(65,67,27,0.22)`), 글자: `ACCENT` (`#41431B`)
   - Hover: 밝기 10% 증가 또는 배경 농도 0.14로 확대
2. **Secondary / Ghost**:
   - 배경: `rgba(255,255,255,0.80)`, 테두리: `BORDER` (`rgba(32,35,27,0.12)`), 글자: `TEXT_SECONDARY`
3. **Danger / Delete**:
   - 배경: `UI_RED_BG` (`rgba(239,68,68,0.10)`), 글자: `UI_RED` (`#EF4444`)
4. **Control (Play / Pause / Resume)**:
   - 실행 중: `rgba(239,68,68,0.10)` / `#EF4444` (Pause 아이콘)
   - 정지 중: `rgba(16,185,129,0.10)` / `#10B981` (Play 아이콘)

### 5.2. 모서리 곡률 (Border Radius Hierarchy)
- **Outer Shell**: `rounded-2xl` (`16px`)
- **Card & Terminal Container**: `rounded-2xl` (`16px`)
- **Filter / Search Bar**: `rounded-xl` (`12px`)
- **Button / Input**: `rounded-lg` (`8px`)
- **Tag / Status Badge**: `rounded-full` (`9999px`) 또는 `rounded` (`4px`)

### 5.3. 스켈레톤 로딩 (Loading States)
- **Light Content Skeleton**: `bg-black/10 animate-pulse rounded-md`
- **Dark Terminal Skeleton**: `bg-white/10 animate-pulse rounded-md`

---

## 6. 인터랙션 및 애니메이션 (Interactions & Feedback)

- **트랜지션 기본 속도**: `transition-all duration-150 ease-in-out` (색상, 배경, 보더 부드러운 전환)
- **실시간 스트리밍 인디케이터**:
  - `LIVE`: 녹색 1.5x1.5 dot + `animate-pulse`
  - `Executing`: 앰버 1.5x1.5 dot + `animate-ping` / 스피너 `animate-spin`
- **텍스트 선택 (Selection)**:
  - 일반 UI: 시스템 기본 또는 `select-none` 방지
  - 터미널 및 로그 본문: 복사가 원활하도록 명시적 `select-text` 적용

---

## 7. 파일 및 디렉터리 구조 규칙
- 색상 토큰 변경 시: `pteropod/src/app/colors.ts`
- 공통 컴포넌트 추가 시: `pteropod/src/app/components/common/`
- 본 가이드라인 파일 위치: `pteropod/guidelines/Guidelines.md`
