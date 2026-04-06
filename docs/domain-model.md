# 도메인 모델

## 1. User

사용자 기본 정보와 인증 주체입니다.

주요 필드:

- `id`
- `email`
- `authProvider` (`KAKAO`)
- `providerUserId`
- `nickname`
- `name`
- `gender`
- `birthYear`
- `regionCode`
- `preferredCourt`
- `profileImageUrl`
- `profileImageSource` (`KAKAO`, `CUSTOM`)
- `status` (`ACTIVE`, `SUSPENDED`, `WITHDRAWN`)

설계 포인트:

- 비밀번호 로그인 대신 카카오 로그인 기반으로 시작
- 카카오 `providerUserId`를 유니크 키로 관리
- 최초 로그인 시 카카오 프로필 이미지를 `profileImageUrl`에 저장
- 사용자가 직접 이미지를 바꾸면 `profileImageSource`를 `CUSTOM`으로 전환

## 2. PlayerSkill

배드민턴 실력을 표현합니다.

주요 필드:

- `userId`
- `nationalGrade` (`F`, `E`, `D`, `C`, `B`, `A`, `S`)
- `gradeLevel` (`LV1`, `LV2`, `LV3` 등 숫자형 권장)
- `mixedRankPreference`
- `singlesPreference`
- `doublesPreference`
- `verifiedAt`

권장 표현:

- 전국 급수는 enum
- 급수 내 LV는 숫자형 정렬 가능한 값
- 매칭 필터는 `급수 + LV 범위` 기준으로 처리

예시:

- `D / LV1`
- `D / LV3`
- `C / LV2`

## 3. Group

`모임`은 사람을 묶는 단위입니다.

주요 필드:

- `id`
- `name`
- `description`
- `ownerUserId`
- `regionCode`
- `visibility` (`PUBLIC`, `PRIVATE`, `INVITE_ONLY`)
- `createdAt`

모임의 목적:

- 지인 초대
- 정기 멤버 관리
- 그룹 내부 통계
- 번개 생성 주체

## 4. GroupMember

모임 멤버 관계입니다.

주요 필드:

- `groupId`
- `userId`
- `role` (`OWNER`, `MANAGER`, `MEMBER`)
- `status` (`INVITED`, `ACTIVE`, `LEFT`, `BLOCKED`)
- `joinedAt`

## 5. FlashEvent

`번개`는 특정 시간에 시작하는 일정입니다.

주요 필드:

- `id`
- `groupId` nullable
- `hostUserId`
- `title`
- `description`
- `courtName`
- `courtAddress`
- `regionCode`
- `startAt`
- `endAt`
- `capacity`
- `skillMinGrade`
- `skillMinLevel`
- `skillMaxGrade`
- `skillMaxLevel`
- `genderPolicy`
- `status` (`OPEN`, `CLOSED`, `FULL`, `CANCELLED`, `FINISHED`)

설계 포인트:

- 모임 소속 번개와 개인 주최 번개 모두 가능
- 실력 제한은 최소/최대 범위로 표현
- 종료 후 통계와 전적 데이터의 기준점이 됨

## 6. FlashParticipant

번개 참여 관계입니다.

주요 필드:

- `flashEventId`
- `userId`
- `status` (`APPLIED`, `CONFIRMED`, `WAITLIST`, `CANCELLED`, `REJECTED`, `ATTENDED`, `NOSHOW`)
- `joinedAt`

## 7. Invitation

초대 흐름을 통합 관리합니다.

주요 필드:

- `id`
- `type` (`GROUP_INVITE`, `FLASH_INVITE`)
- `targetId`
- `inviterUserId`
- `inviteeUserId`
- `status` (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`)
- `sentAt`
- `respondedAt`

## 8. Notification

사용자 알림입니다.

주요 필드:

- `id`
- `userId`
- `type`
- `title`
- `body`
- `targetType`
- `targetId`
- `isRead`
- `sentAt`

알림 예시:

- 모임 초대 도착
- 번개 초대 도착
- 번개 참여 승인
- 번개 정원 마감
- 번개 시작 1시간 전
- 일정 변경/취소

## 9. MatchRecord

통계와 전적의 기본 단위입니다.

초기 MVP에서는 단순화해도 됩니다.

주요 필드:

- `id`
- `flashEventId`
- `groupId`
- `playerUserId`
- `result` (`WIN`, `LOSE`, `DRAW`)
- `matchType` (`DOUBLES`, `MIXED`, `SINGLES`)
- `recordedAt`

## 핵심 관계

- `User 1:N Group`
- `User N:M Group` through `GroupMember`
- `User 1:N FlashEvent` as host
- `Group 1:N FlashEvent`
- `FlashEvent N:M User` through `FlashParticipant`
- `User 1:N Notification`
- `User 1:1 PlayerSkill`

## MVP 범위 추천

반드시 먼저:

- 사용자 인증
- 프로필
- 급수/레벨
- 모임 생성/초대/가입
- 번개 생성/참여
- 기본 알림

2차 추천:

- 전적 입력
- 모임 통계
- 추천 매칭
- 신고/제재

## 인증/프로필 초기 정책

- 로그인 방식은 카카오 단일 로그인으로 시작
- 가입과 로그인을 분리하지 않고 `카카오 로그인 1회`로 자동 가입 처리
- 카카오에서 받은 닉네임/프로필 이미지는 초기값으로만 사용
- 서비스 내 닉네임 정책이 따로 있으면 로그인 후 온보딩에서 수정 가능
