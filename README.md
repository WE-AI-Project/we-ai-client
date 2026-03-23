# we-ai-client

사용자가 에이전트들의 활동을 실시간으로 보는 '얼굴'입니다.

권장 개발환경: React + Vite

- node 버전 : v24.14.0
- npm 버전 : 11.11.1
- 백엔드로 요청하는 데이터 규격 : Axios

실행 방법: npm run dev

프로젝트 구조:

Plaintext
we-ai-client/

├── src/

│   ├── components/  # 채팅창, 에이전트 리스트 등 UI 부품

│   ├── hooks/       # API 통신 로직 (React Query 등)

│   ├── pages/       # 메인 화면, 설정 화면 등

│   └── assets/      # 이미지, 스타일 파일

└── index.html
