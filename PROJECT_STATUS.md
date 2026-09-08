# 🧠 SynAIpse (WE&AI) 프로젝트 현황 & AI 컨텍스트 지식 베이스
> **최종 업데이트**: 2026-08-25  
> **문서 목적**: 시나입스 프로젝트에 참여하는 모든 팀원과 AI 에이전트가 **현재 개발 진행도, AI가 인지하고 있는 시스템 구조, API 연동 현황 및 향후 과제**를 공유하고 동기화하기 위한 공식 문서입니다.

---

## 📌 1. 프로젝트 개요 (Overview)

* **프로젝트명**: SynAIpse (WE&AI) — AI 기반 풀스택 협업 및 프로젝트 관리 플랫폼
* **주요 목적**: 개발팀 내 프론트엔드/백엔드/QA/DevOps 간의 협업 자동화, 실시간 AI 에이전트 토론(Debate), Git 커밋 분석, QA 리포트, 데일리 스탠드업 브리핑 지원
* **저장소 구성**:
  * Frontend: `D:\SynAIpse\we-ai-client` (React 18 + TypeScript + Vite + Tailwind CSS v4)
  * Backend: `D:\SynAIpse\we-ai-server` (Spring Boot 3.2.5 + Java 17 + Gradle + JPA + Spring Security JWT)

---

## 🗺️ 2. AI 인지 상태 및 기능별 개발 진행 현황 (Status Board)

### 🟢 100% 완료 및 백엔드 실연동 (Complete & Verified)
| 기능 / 컴포넌트 | 연동된 백엔드 API | 상태 및 설명 |
| :--- | :--- | :---: |
| **인증 시스템 (`LoginScreen`)** | `/api/v1/auth/**` (로그인, 회원가입, 세션 복구, JWT 갱신) | ✅ 정상 작동 (401 Refresh Interceptor 포함) |
| **대시보드 (`DashboardPage`)** | `/api/v1/projects/{projectId}/dashboard/**` (통계, 진행률, 마일스톤, 활동) | ✅ 정상 작동 (실시간 백엔드 데이터 시각화) |
| **커밋 이력 & Diff (`CommitDiffPage`)** | `/api/v1/projects/{projectId}/commits/**` | ✅ 정상 작동 (FE/BE 레포 분리, Unified Diff 파싱) |
| **채팅 & AI 토론 (`ChatPage`)** | `/api/v1/projects/{projectId}/chat/**`, `/api/v1/ai/debate` | ✅ 정상 작동 (채팅방, 메시지 송수신, SSE 토론 스트리밍) |
| **프로젝트 설정 (`ProjectSettingsPage`)** | `/api/v1/projects/{projectId}/**` (정보수정, 멤버역할/부서, 스택CRUD, 탈퇴) | ✅ 정상 작동 (관리자 권한 제어 포함) |
| **데일리 스탠드업 (`DailyStandupModal`)** | `/api/v1/projects/{projectId}/daily-standup/**` | ✅ 정상 작동 (브리핑 조회, 접속시간 PATCH, 오늘하루 숨김) |

---

### 🔴 긴급 수정 필요한 코드 레벨 버그 (Critical Bugs)
| 번호 | 위치 | 현상 및 원인 | 해결 방안 |
| :---: | :--- | :--- | :--- |
| **1** | `src/app/components/ui/pagination.tsx:24` | `npx tsc` 빌드 실패 (JSX Spread `...props` 중괄호 누락) | `{...props}`로 수정 |
| **2** | `src/app/App.tsx:667-685` | 캘린더 메뉴 클릭 시 캘린더가 안 뜨고 대시보드로 이동 (`switch`문 `Calendar` 누락) | `case "Calendar": return <CalendarPage />;` 추가 |
| **3** | `src/app/App.tsx:947, 1000` | 알림 벨 패널 열었을 때 알림이 안 뜸 (`NotificationPanel`에 `projectId` 미전달) | `<NotificationPanel projectId={projectId ?? undefined} />`로 수정 |
| **4** | `src/app/App.tsx:679` | 프로젝트를 바꿔도 항상 1번 프로젝트 활동 통계만 조회됨 | `<ProfilePage projectId={projectId ?? 1} />`로 수정 |
| **5** | `src/api/aiApi.ts:255` | 소셜 로그인 URL이 `/api/auth/...` (v1 누락)로 하드코딩 및 `api.ts`와 중복 선언 | `src/app/lib/api.ts`의 공통 함수로 통합 |

---

### 🟡 백엔드 API 존재하나 프론트 Mock 상태인 항목 (Mock / In-Progress)
| 컴포넌트 | 백엔드 준비 API | 현재 프론트 상태 | 향후 개선 과제 |
| :--- | :--- | :--- | :--- |
| **CalendarPage** | `/api/v1/projects/{projectId}/schedules` CRUD | 로컬스토리지(`scheduleStore.ts`)만 사용 중 | `api.ts`의 스케줄 CRUD 함수로 전환 |
| **ChangesPage** | `/api/v1/ai/commits`, Git Status | 작성자 `"병권"` 하드코딩, 로컬 state 모의 커밋 | 로그인 사용자 이름 바인딩 및 커밋 생성 API 연동 |
| **AIQAPage (Commit QA/UI Test)** | `/api/v1/projects/{projectId}/qa/reports` | 정적분석만 연동, QA리포트는 더미 데이터와 Canvas 애니메이션 | 백엔드 QA 리포트 엔드포인트 연동 |
| **ServerLogs / Build** | `/api/v1/projects/{projectId}/build/tasks` | Spring Boot 더미 로그 & 타이머 시뮬레이션 | 백엔드 빌드 태스크 조회 API 연동 |
| **SynAIpseGalaxyPage** | Git Branch/Commit Graph | `synaipseGalaxyData` 정적 그래프 데이터 사용 | 백엔드 Git 커밋/브랜치 데이터 바인딩 |

---

## 📡 3. 백엔드 API 명세 매트릭스 (Backend Endpoint Matrix)

```
/api/v1/auth
  ├── POST /login                        (이메일/비밀번호 로그인)
  ├── POST /signup                       (회원가입)
  ├── POST /refresh                      (토큰 재발급)
  ├── POST /email-login/code             (이메일 인증코드 발송)
  ├── POST /email-login                  (이메일 코드 로그인)
  ├── POST /password-find/code           (비밀번호 찾기 코드 발송)
  ├── POST /password-find/verify         (비밀번호 재설정)
  └── GET  /auth/{provider}/url          (소셜 로그인 인증 URL)

/api/v1/projects
  ├── GET    /my                         (내 프로젝트 목록)
  ├── POST   /                           (프로젝트 생성)
  ├── POST   /join                       (참여 코드로 프로젝트 참여)
  ├── GET    /{projectId}                (프로젝트 상세 정보)
  ├── PUT    /{projectId}                (프로젝트 메타 정보 수정)
  ├── DELETE /{projectId}/leave          (프로젝트 나가기)
  ├── GET    /{projectId}/members        (프로젝트 멤버 목록)
  ├── PATCH  /{projectId}/members/{mId}/role       (멤버 역할 변경)
  ├── PATCH  /{projectId}/members/{mId}/department (멤버 부서 변경)
  ├── DELETE /{projectId}/members/{mId}            (멤버 추방)
  ├── GET    /{projectId}/tech-stacks    (기술 스택 목록)
  ├── POST   /{projectId}/tech-stacks    (기술 스택 추가)
  ├── PUT    /{projectId}/tech-stacks/{id} (기술 스택 수정)
  ├── DELETE /{projectId}/tech-stacks/{id} (기술 스택 삭제)
  ├── GET    /{projectId}/schedules      (프로젝트 일정 목록)
  ├── POST   /{projectId}/schedules      (일정 추가)
  ├── PUT    /{projectId}/schedules/{id} (일정 수정)
  ├── DELETE /{projectId}/schedules/{id} (일정 삭제)
  ├── GET    /{projectId}/daily-standup  (데일리 스탠드업 요약 조회)
  ├── POST   /{projectId}/daily-standup/dismiss (오늘 다시 보지 않기)
  ├── PATCH  /{projectId}/access-time    (프로젝트 최근 접속 시간 갱신)
  ├── GET    /{projectId}/notifications  (프로젝트 알림 목록)
  └── DELETE /{projectId}/notifications/{id} (알림 삭제)

/api/v1/projects/{projectId}/dashboard
  ├── GET /summary                       (대시보드 통계 요약)
  ├── GET /progress                      (프로젝트 전체 진행률)
  ├── GET /milestones                    (마일스톤 목록)
  ├── GET /activities                    (최근 활동 내역)
  └── GET /department-status             (부서별 인원 및 이슈 현황)

/api/v1/projects/{projectId}/commits
  ├── GET /                              (커밋 이력 목록 조회)
  ├── GET /{commitId}/files              (커밋 내 변경 파일 목록)
  └── GET /{commitId}/diff               (커밋 Unified Diff 조회)

/api/v1/projects/{projectId}/chat
  ├── GET  /rooms                        (채팅방 목록)
  ├── POST /rooms                        (채팅방 생성)
  ├── GET  /rooms/{roomId}/messages      (채팅 메시지 이력)
  ├── POST /rooms/{roomId}/messages      (메시지 전송)
  ├── GET  /meetings                     (회의록 목록)
  └── GET  /documents                    (문서 목록)

/api/v1/ai
  ├── POST /debate/stream                (AI 백엔드 vs 프론트엔드 토론 SSE 스트림)
  ├── POST /commits                      (AI 커밋 메시지 생성)
  └── POST /chat                         (AI 어시스턴트 질의)

/api/v1/users/me
  ├── GET   /profile                     (내 프로필 조회)
  ├── PATCH /profile                     (내 프로필 수정)
  ├── GET   /activity-summary            (내 활동 통계 요약)
  └── GET   /activities                  (내 최근 활동 이력)
```

---

## 🛠️ 4. 빠른 수정 가이드 (Code Fix Snippets)

### [Snippet 1] `src/app/components/ui/pagination.tsx` (24행)
```tsx
// AS-IS:
<nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} ...props />

// TO-BE:
<nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
```

### [Snippet 2] `src/app/App.tsx` (667행 ~ 685행)
```tsx
  const renderPage = (nav: NavId) => {
    switch (nav) {
      case "Dashboard": return isPublishingSession(authSession)
        ? <WeAIDashboard />
        : <DashboardPage projectId={projectId} projectName={projectName} />;
      case "Changes": return <ChangesPage projectId={projectId ?? 0} onNavigateQA={handleNavigateQA} />;
      case "Commits": return <CommitDiffPage projectId={projectId} />;
      case "ServerBuild": return <ServerBuildPage />;
      case "Chat": return <ChatPage projectId={projectId ?? 0} onDocsUpdate={setDocCount} />;
      case "Calendar": return <CalendarPage />; // 👈 추가
      case "EnvSettings": return <EnvironmentSettingsPage />;
      case "AIQA": return <AIQAPage projectId={projectId ?? 0} autoStart />;
      case "ProjectSettings": return <ProjectSettingsPage projectId={projectId} currentUserId={currentUser?.id ?? null} />;
      case "Profile": return <ProfilePage projectId={projectId ?? 1} />; // 👈 projectId 전달
      case "Galaxy": return <SynAIpseGalaxyPage />;
      default: return isPublishingSession(authSession)
        ? <WeAIDashboard />
        : <DashboardPage projectId={projectId} projectName={projectName} />;
    }
  };
```

### [Snippet 3] `src/app/App.tsx` (947행 & 1000행)
```tsx
// AS-IS:
<NotificationPanel />

// TO-BE:
<NotificationPanel projectId={projectId ?? undefined} />
```

---

## 🎯 5. 향후 작업 로드맵 (Next Action Plan)

1. **Phase 1: 빌드 및 라우팅 에러 완벽 해결**
   - `pagination.tsx` 문법 수정 및 `App.tsx` 캘린더 라우터/알림 props 바인딩
2. **Phase 2: 캘린더 & 일정 API 프론트엔드 연동**
   - `CalendarPage.tsx`에서 로컬스토리지 대신 `fetchProjectSchedules`, `createProjectSchedule` API 호출
3. **Phase 3: 변경사항(Changes) 및 AI 커밋 연동**
   - 하드코딩된 작성자명 동적화 및 커밋 생성 API 연동
4. **Phase 4: 졸업작품 심사 시연 시나리오 준비**
   - 소셜 로그인 ➡️ 프로젝트 생성/참여 ➡️ 데일리 스탠드업 확인 ➡️ 대시보드 진행률 확인 ➡️ AI 토론(Debate) 시연 ➡️ Git Diff 검토 ➡️ 프로젝트 설정
