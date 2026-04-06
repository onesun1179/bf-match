# BF Match

모바일 배드민턴 매칭 서비스의 초기 설계와 스캐폴딩입니다.

## 핵심 개념

- 모든 사용자는 카카오 로그인 후 서비스 이용
- 실력은 `전국 급수(F~S)` + `급수 내 LV` 조합으로 관리
- `모임`은 사람 기반 그룹
- `번개`는 특정 시간에 열리는 실제 일정
- 알림은 초대, 신청, 수락, 일정 변경, 시작 임박 중심
- 카카오 프로필 이미지를 기본 프로필 이미지로 사용

## 디렉터리 구조

- `frontend`: Next.js 앱
- `backend`: Spring Boot + Kotlin API 서버
- `docs`: 도메인/아키텍처 문서

## 로컬 환경 변수

- 백엔드 예시: [backend/.env.example](/Users/dongwon/project/bf-match/backend/.env.example)
- 프론트 예시: [frontend/.env.example](/Users/dongwon/project/bf-match/frontend/.env.example)

## 우선 구현 추천 순서

1. 인증/인가
2. 사용자 프로필과 급수 체계
3. 모임 생성/초대/가입
4. 번개 생성/참여/취소
5. 알림
6. 통계/전적

## 인증 정책

- 기본 로그인 방식은 카카오 OAuth
- 최초 로그인 시 카카오 계정 기반 회원 자동 생성
- 카카오 프로필 이미지 URL을 `profileImageUrl`의 초기값으로 저장
- 이후 사용자가 앱 내에서 프로필 이미지를 직접 변경할 수 있게 확장 가능

## 현재 인증 구현 상태

- 카카오 로그인 성공 시 백엔드가 refresh token을 발급하고 HttpOnly 쿠키로 저장
- 프론트는 `POST /api/v1/auth/refresh`로 access token을 재발급받아 세션 스토리지에 저장
- `GET /api/v1/me` 호출 시 Bearer access token 사용
- access token 만료로 `401`이 오면 프론트가 refresh 후 1회 재시도

## 현재 온보딩 구현 상태

- 로그인 사용자는 `/onboarding`에서 `닉네임/전국 급수`를 설정
- `PATCH /api/v1/me/skill`은 전국 급수만 갱신하고 LV는 변경하지 않음
- 홈 화면에서 급수 미설정 사용자는 온보딩 버튼이 노출됨
- LV는 게임/경험치 기반으로 추후 상승시키는 read-only 값

## 현재 모임 구현 상태

- `POST /api/v1/groups` 모임 생성
- `GET /api/v1/groups` 내 모임 목록 조회
- `GET /api/v1/groups/{groupId}` 모임 상세/멤버 조회
- `POST /api/v1/groups/{groupId}/invite` 사용자 ID 기반 초대
- 프론트 `/groups` 화면에서 모임 생성/상세/초대 동작

## 도메인 문서

- [도메인 모델](/Users/dongwon/project/bf-match/docs/domain-model.md)
- [아키텍처와 API 초안](/Users/dongwon/project/bf-match/docs/architecture.md)

## GitLab CI/CD (Option 1)

- 루트에 [`.gitlab-ci.yml`](/Users/dongwon/project/bf-match/.gitlab-ci.yml) 이 포함되어 있습니다.
- `verify` 단계에서 `backend`/`frontend` 빌드가 자동 실행됩니다.
- `main` 브랜치에서 `deploy_home_windows` 잡을 수동 실행하면 집 윈도우 러너에서 배포를 진행합니다.

필수 GitLab CI/CD 변수:

- `DEPLOY_DIR`: 윈도우 러너에서 프로젝트가 위치한 경로 (예: `C:\bf-match`)

선택 GitLab CI/CD 변수:

- `BACKEND_RESTART_CMD`: 백엔드 재시작 명령 (예: NSSM/PowerShell 스크립트)
- `FRONTEND_RESTART_CMD`: 프론트 재시작 명령 (예: PM2/PowerShell 스크립트)

윈도우 러너 요구사항:

- 태그 `home-windows` 로 등록된 GitLab Runner
- `git`, `JDK 21`, `Node.js 20+`, `npm` 설치
