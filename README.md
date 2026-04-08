# BF Match

배드민턴 이벤트/게임 운영을 위한 모바일 중심 매칭 서비스입니다.  
현재 리포지토리는 `Next.js(Frontend)` + `Spring Boot/Kotlin(Backend)` 모노레포 구조로 운영됩니다.

## 기술 스택

- Frontend: Next.js 15.5.14, React 19, TypeScript
- Backend: Spring Boot 3.5.0, Kotlin 2.1, Spring Security/JPA/OAuth2
- DB: MariaDB
- Auth: Kakao OAuth + JWT(Access/Refresh)
- Push: Firebase Admin(FCM)
- Analytics: Google Analytics (`G-R0CZ8WVKYV`)

## 디렉터리 구조

- `frontend`: 사용자 웹 앱 (하단바, 이벤트/게임/랭킹/마이/설정)
- `backend`: API 서버
- `docs`: 도메인/아키텍처 문서
- `.gitlab-ci.yml`: GitLab CI/CD 파이프라인

## 현재 구현 상태

### 1) 인증/사용자

- 카카오 로그인 및 카카오 프로필 이미지 연동
- Access Token + HttpOnly Refresh Cookie 기반 인증
- Access Token 기본 만료: 7일 (`604800`초)
- 온보딩: 닉네임 + 전국 급수(F~S) 입력
- LV는 온보딩에서 수정 불가(경험치 기반 성장 값)

### 2) 이벤트(모임) / 멤버

- 이벤트 생성/수정/상세/목록/공개목록
- 이벤트 링크 초대(수락/거절) + 초대 이력
- 멤버 역할 관리(모임장/관리자/멤버), 강퇴, 탈퇴
- 이벤트 종료(`closed`) 처리

### 3) 게임

- 게임 생성 / 게임 제안(멤버 제안, 관리자 승인/거절)
- 상태: 제안, 대기, 진행중, 입력대기, 종료, 취소
- 코트 번호 입력/수정(PENDING/IN_PROGRESS)
- 점수 입력 → 상대팀 확인 요청 → 확정/거절
- 관리자 점수 확정(상대팀 승인 없이 확정)
- 관리자 점수 수정(확정된 점수도 재입력 가능)
- 게임 취소 시 통계/전적/경험치 반영 롤백

### 4) 종료 이벤트 정책

종료된 이벤트에서는 아래처럼 제한됩니다.

- 불가: 게임 생성/제안, 시작, 종료, 일반 사용자 점수 입력, 점수 거절
- 가능: 관리자 점수 확정, 관리자 점수 수정, 게임 취소

### 5) 랭킹/통계

- 메인 랭킹: 개인/팀 분리
- 개인/팀 모두 급수 탭 + 유형 탭(전체/남복/여복/혼복/자유)
- 랭킹 정렬: 승률 → 급수 → 남자 우선 → 닉네임 → 기본키
- 최초 5개 노출 + 더보기(5개씩)
- 이벤트 상세 통계: 개인/팀 랭킹, 팀 기록 화면 이동

### 6) 알림

- 서버 DB 기반 알림 항목별 ON/OFF 관리 (기본값: 전부 ON)
- 전체 알림 ON/OFF + 항목별 ON/OFF
- 현재 제공 항목:
  - 초대 수락/거절, 멤버 참여/강퇴, 이벤트 정보 변경
  - 급수 승급
  - 게임 생성/시작/종료
  - 게임 제안 도착/수락/거절
  - 점수 확인 요청/확정/반려

## 실행 방법 (로컬)

### 사전 준비

- Java 21
- Node.js 20+
- MariaDB

### 환경 변수

예시 파일:

- [backend/.env.example](/Users/dongwon/project/bf-match/backend/.env.example)
- [frontend/.env.example](/Users/dongwon/project/bf-match/frontend/.env.example)

필수 체크 포인트:

- `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`/`KAKAO_REDIRECT_URI` 정확히 설정
- JWT 키는 반드시 32바이트 이상 (`WeakKeyException` 방지)
- 카카오 스코프는 현재 `profile_nickname`, `profile_image` 사용
- 프론트 API URL: `NEXT_PUBLIC_API_BASE_URL=https://mature-physiology-blessed-anti.trycloudflare.com`

### Backend 실행

```bash
cd backend
./gradlew bootRun
```

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저:

- Frontend: `http://localhost:3000`
- Backend: `https://mature-physiology-blessed-anti.trycloudflare.com`

### 빌드 검증

```bash
cd backend && ./gradlew build -x test
cd frontend && npm run build
```

## 주요 API 경로

- Auth: `/api/v1/auth/*`
- Me: `/api/v1/me/*`
- Users Record: `/api/v1/users/{userId}/record`
- Groups: `/api/v1/groups/*`
- Games: `/api/v1/groups/{groupId}/games/*`
- Ranking: `/api/v1/ranking`, `/api/v1/ranking/teams`
- Notifications: `/api/v1/notifications/*`

## 배포 (GitLab CI/CD)

- 루트 [`.gitlab-ci.yml`](/Users/dongwon/project/bf-match/.gitlab-ci.yml) 사용
- `verify` 단계에서 backend/frontend 빌드 실행
- `main`에서 `deploy_home_windows` 수동 실행 시 윈도우 러너 배포

### 1) GitLab Runner 준비 (로컬 윈도우 서버)

- GitLab Runner 설치 후 `shell` executor로 등록
- 러너 태그를 `home-windows`로 설정
- 러너 머신에 아래 툴 설치:
  - `git`
  - `JDK 21`
  - `Node.js 20+`
  - `npm`

### 2) GitLab CI/CD 변수

- `DEPLOY_DIR` (예: `C:\bf-match`)

선택 변수(서비스 재시작 자동화):

- `BACKEND_RESTART_CMD`
- `FRONTEND_RESTART_CMD`

예시(`powershell`):

- `BACKEND_RESTART_CMD`: `Restart-Service bfmatch-backend`
- `FRONTEND_RESTART_CMD`: `Restart-Service bfmatch-frontend`

파이프라인은 매 배포 시 아래 순서로 동작:

- `main` 최신 코드로 verify 빌드 통과
- 러너에서 `DEPLOY_DIR`로 코드 동기화
- backend `bootJar` 빌드
- frontend `npm ci && npm run build`
- 재시작 명령이 설정되어 있으면 서비스 재시작

### 3) 배포 실행

- GitLab `CI/CD > Pipelines`에서 `main` 파이프라인 선택
- `deploy_home_windows`를 수동 실행(Play)

윈도우 러너 요구사항(요약):

- 태그 `home-windows`
- `shell` executor
- `git`, `JDK 21`, `Node.js 20+`, `npm`

## 참고 문서

- [도메인 모델](/Users/dongwon/project/bf-match/docs/domain-model.md)
- [아키텍처/API 초안](/Users/dongwon/project/bf-match/docs/architecture.md)
