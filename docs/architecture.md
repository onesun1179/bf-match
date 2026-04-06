# 아키텍처와 API 초안

## 전체 구조

- `frontend`: Next.js App Router 기반 모바일 우선 UI
- `backend`: Spring Boot API + Kotlin + JPA
- `auth`: 카카오 OAuth 로그인 + 자체 JWT 발급
- `notification`: 앱 푸시 + 인앱 알림 테이블

## 프론트 권장 화면

### 인증

- 카카오 로그인
- 온보딩

### 메인

- 홈
- 번개 탐색
- 내 모임
- 알림
- 마이페이지

### 모임

- 모임 목록
- 모임 상세
- 멤버 목록
- 초대 관리
- 모임 통계

### 번개

- 번개 생성
- 번개 상세
- 참여 신청/취소
- 참가자 목록

## 백엔드 모듈 제안

- `auth`: 로그인, 토큰, 인증
- `user`: 프로필, 지역, 실력
- `group`: 모임, 멤버, 초대
- `flash`: 번개, 참가, 운영
- `notification`: 알림 발행/조회/읽음 처리
- `stats`: 전적, 참여 통계

## API 초안

### 인증

- `GET /api/v1/auth/kakao/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/me`

### 사용자/실력

- `GET /api/v1/users/{userId}`
- `PATCH /api/v1/me/profile`
- `PATCH /api/v1/me/skill`

### 모임

- `POST /api/v1/groups`
- `GET /api/v1/groups`
- `GET /api/v1/groups/{groupId}`
- `POST /api/v1/groups/{groupId}/invite`
- `POST /api/v1/groups/{groupId}/join`
- `PATCH /api/v1/groups/{groupId}/members/{userId}/role`

### 번개

- `POST /api/v1/flash-events`
- `GET /api/v1/flash-events`
- `GET /api/v1/flash-events/{flashEventId}`
- `POST /api/v1/flash-events/{flashEventId}/apply`
- `POST /api/v1/flash-events/{flashEventId}/invite`
- `POST /api/v1/flash-events/{flashEventId}/confirm`
- `POST /api/v1/flash-events/{flashEventId}/cancel`

### 알림

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{notificationId}/read`
- `POST /api/v1/notifications/read-all`

### 통계

- `GET /api/v1/me/stats`
- `GET /api/v1/groups/{groupId}/stats`
- `POST /api/v1/match-records`

## 기술 포인트

### 인증

- 모든 요청은 인증 필요
- 공개 탐색 페이지가 필요하더라도 상세 액션은 로그인 필수
- Spring Security OAuth2 Client + JWT 조합 추천
- 카카오 로그인 완료 후 백엔드가 서비스용 access/refresh token 발급
- 카카오 프로필 이미지 URL을 사용자 기본 이미지로 저장

### 카카오 로그인 플로우

1. 프론트에서 `카카오 로그인` 버튼 클릭
2. 백엔드 OAuth 시작 엔드포인트 또는 프론트 SDK를 통해 카카오 인증
3. 백엔드가 카카오 사용자 식별자와 프로필 정보를 수신
4. 기존 회원이면 로그인 처리, 없으면 자동 가입
5. 최초 가입 시 카카오 프로필 이미지를 `profileImageUrl`에 반영
6. 백엔드가 앱 전용 JWT를 발급

### 실력 필터링

- enum 순서를 활용해 급수 비교 가능하게 설계
- LV는 정수형으로 두어 범위 검색 가능하게 설계
- 예: `D/LV3 이상 C/LV2 이하`

### 알림

- 초기에는 DB 기반 인앱 알림 + FCM 푸시
- 도메인 이벤트 기반으로 발행
- 예: `GroupInvited`, `FlashApplied`, `FlashConfirmed`

### 통계

- 초기에는 참가 횟수, 승/패, 노쇼 횟수 정도부터 시작
- 모임 단위 집계와 개인 단위 집계를 분리

## 개발 순서 제안

1. 사용자 인증/인가
2. 프로필과 급수 체계
3. 모임 CRUD와 초대
4. 번개 CRUD와 참가
5. 알림
6. 통계

## 환경 변수 예시

- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
- `JWT_SECRET`
