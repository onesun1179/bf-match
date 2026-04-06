const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const ACCESS_TOKEN_KEY = "bf-match.access-token";

type RefreshResponse = { accessToken: string; nickname: string };

export type Gender = "MALE" | "FEMALE";
export type Grade = "F" | "E" | "D" | "C" | "B" | "A" | "S";

export type MeResponse = {
  id: number;
  authProvider: string;
  email: string | null;
  nickname: string;
  gender: Gender | null;
  regionCode: string | null;
  preferredCourt: string | null;
  skill: { nationalGrade: Grade; lv: number; exp: number; canUpgradeGrade: boolean } | null; // exp: 0.0~100.0 (%)
  onboardingCompleted: boolean;
  notificationEnabled: boolean;
};

export type GroupVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type GroupRole = "OWNER" | "MANAGER" | "MEMBER";

export type GroupSummary = {
  id: number;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  memberCount: number;
  maxMembers: number | null;
  ownerNickname: string;
  ownerGender: Gender | null;
  ownerGrade: Grade | null;
  minGrade: Grade | null;
  maxGrade: Grade | null;
  startAt: string | null;
  endAt: string | null;
  myRole: GroupRole | null;
  myStatus: "INVITED" | "ACTIVE" | "LEFT" | "BLOCKED" | null;
};

export type GroupMember = {
  userId: number;
  nickname: string;
  gender: Gender | null;
  nationalGrade: Grade | null;
  role: GroupRole;
  status: "INVITED" | "ACTIVE" | "LEFT" | "BLOCKED";
};

export type GroupDetail = {
  id: number;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  ownerUserId: number;
  memberCount: number;
  myRole: GroupRole | null;
  myStatus: "INVITED" | "ACTIVE" | "LEFT" | "BLOCKED" | null;
  members: GroupMember[];
  location: string | null;
  startAt: string | null;
  endAt: string | null;
  registrationDeadline: string | null;
  minGrade: Grade | null;
  maxGrade: Grade | null;
  maxMembers: number | null;
  maxMale: number | null;
  maxFemale: number | null;
  closed: boolean;
};

export type InviteLinkResponse = { token: string; inviteUrl: string; expiresAt: string };

export type InviteLinkInfo = {
  token: string;
  groupId: number;
  groupName: string;
  groupDescription: string | null;
  inviterNickname: string;
  invitedAt: string;
  memberCount: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expiresAt: string;
};

export type InviteHistory = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  inviterNickname: string;
  inviterUserId: number;
  acceptedByNickname: string | null;
  acceptedByUserId: number | null;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  declineReason: string | null;
};

// ── Token ──

function isBrowser(): boolean { return typeof window !== "undefined"; }
export function getAccessToken(): string | null { return isBrowser() ? window.sessionStorage.getItem(ACCESS_TOKEN_KEY) : null; }
export function setAccessToken(token: string): void { if (isBrowser()) window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token); }
export function clearAccessToken(): void { if (isBrowser()) window.sessionStorage.removeItem(ACCESS_TOKEN_KEY); }

export async function refreshAccessToken(): Promise<string> {
  const r = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
  if (!r.ok) { clearAccessToken(); throw new Error("세션을 갱신하지 못했습니다."); }
  const d = (await r.json()) as RefreshResponse;
  setAccessToken(d.accessToken);
  return d.accessToken;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const h = new Headers(init.headers);
  const t = getAccessToken();
  if (t) h.set("Authorization", `Bearer ${t}`);
  let r = await fetch(`${API_BASE_URL}${input}`, { ...init, headers: h, credentials: "include" });
  if (r.status !== 401) return r;
  const rt = await refreshAccessToken();
  const rh = new Headers(init.headers);
  rh.set("Authorization", `Bearer ${rt}`);
  r = await fetch(`${API_BASE_URL}${input}`, { ...init, headers: rh, credentials: "include" });
  return r;
}

// ── Auth ──

export async function registerLocal(username: string, password: string, nickname: string, nationalGrade: string, gender: string): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/api/v1/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username, password, nickname, nationalGrade, gender }) });
  if (!r.ok) { if (r.status === 409) { const body = await r.json().catch(() => null) as { message?: string } | null; throw new Error(body?.message ?? "이미 사용 중인 아이디 또는 닉네임입니다."); } throw new Error("회원가입에 실패했습니다."); }
  setAccessToken(((await r.json()) as RefreshResponse).accessToken);
}

export async function loginLocal(username: string, password: string): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ username, password }) });
  if (!r.ok) { if (r.status === 401) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다."); throw new Error("로그인에 실패했습니다."); }
  setAccessToken(((await r.json()) as RefreshResponse).accessToken);
}

export function getKakaoLoginUrl(): string { return `${API_BASE_URL}/oauth2/authorization/kakao`; }

// ── Me ──

export async function fetchMe(): Promise<MeResponse> {
  const r = await apiFetch("/api/v1/me"); if (!r.ok) throw new Error("내 정보를 불러오지 못했습니다.");
  return (await r.json()) as MeResponse;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" }); clearAccessToken();
}

export async function updateMyProfile(request: { nickname: string; gender?: Gender | null; regionCode?: string | null; preferredCourt?: string | null }): Promise<MeResponse> {
  const r = await apiFetch("/api/v1/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  if (!r.ok) throw new Error("프로필을 저장하지 못했습니다."); return (await r.json()) as MeResponse;
}

export async function updateMySkill(request: { nationalGrade: string }): Promise<MeResponse> {
  const r = await apiFetch("/api/v1/me/skill", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  if (!r.ok) throw new Error("급수 정보를 저장하지 못했습니다."); return (await r.json()) as MeResponse;
}

export async function upgradeGrade(): Promise<MeResponse> {
  const r = await apiFetch("/api/v1/me/skill/upgrade-grade", { method: "POST" });
  if (!r.ok) throw new Error("급수 업그레이드에 실패했습니다."); return (await r.json()) as MeResponse;
}

// ── Groups ──

export type CreateGroupRequest = {
  name: string;
  description?: string | null;
  visibility?: GroupVisibility;
  location?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  registrationDeadline?: string | null;
  minGrade?: Grade | null;
  maxGrade?: Grade | null;
  maxMembers?: number | null;
  maxMale?: number | null;
  maxFemale?: number | null;
};

export async function fetchPublicGroups(): Promise<GroupSummary[]> {
  const r = await apiFetch("/api/v1/groups/public"); if (!r.ok) throw new Error("공개 이벤트을 불러오지 못했습니다.");
  return (await r.json()) as GroupSummary[];
}

export async function joinPublicGroup(groupId: number): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/join`, { method: "POST" });
  if (!r.ok) throw new Error("이벤트 참여에 실패했습니다."); return (await r.json()) as GroupDetail;
}

export async function fetchMyGroups(): Promise<GroupSummary[]> {
  const r = await apiFetch("/api/v1/groups"); if (!r.ok) throw new Error("이벤트 목록을 불러오지 못했습니다.");
  return (await r.json()) as GroupSummary[];
}

export async function createGroup(request: CreateGroupRequest): Promise<GroupDetail> {
  const r = await apiFetch("/api/v1/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  if (!r.ok) throw new Error("이벤트 생성에 실패했습니다."); return (await r.json()) as GroupDetail;
}

export async function updateGroup(groupId: number, request: CreateGroupRequest): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
  if (!r.ok) throw new Error("이벤트 수정에 실패했습니다."); return (await r.json()) as GroupDetail;
}

export async function fetchGroupDetail(groupId: number): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}`); if (!r.ok) throw new Error("이벤트 상세를 불러오지 못했습니다.");
  return (await r.json()) as GroupDetail;
}

export async function closeGroup(groupId: number): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/close`, { method: "POST" });
  if (!r.ok) throw new Error("이벤트 종료에 실패했습니다."); return (await r.json()) as GroupDetail;
}

export async function leaveGroup(groupId: number): Promise<void> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/leave`, { method: "POST" });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "탈퇴에 실패했습니다."); }
}

export async function kickGroupMember(groupId: number, targetUserId: number): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/kick/${targetUserId}`, { method: "POST" });
  if (!r.ok) throw new Error("강퇴 처리에 실패했습니다."); return (await r.json()) as GroupDetail;
}

export async function changeMemberRole(groupId: number, targetUserId: number, role: GroupRole): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/members/${targetUserId}/role`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
  if (!r.ok) throw new Error("권한 변경에 실패했습니다."); return (await r.json()) as GroupDetail;
}

// ── Invite ──

export async function createInviteLink(groupId: number): Promise<InviteLinkResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/invite-link`, { method: "POST" });
  if (!r.ok) throw new Error("초대 링크 생성에 실패했습니다."); return (await r.json()) as InviteLinkResponse;
}

export async function fetchInviteHistory(groupId: number): Promise<InviteHistory[]> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/invite-history`);
  if (!r.ok) throw new Error("초대 이력을 불러오지 못했습니다."); return (await r.json()) as InviteHistory[];
}

export async function fetchInviteLinkInfo(token: string): Promise<InviteLinkInfo> {
  const r = await fetch(`${API_BASE_URL}/api/v1/groups/join/${token}`);
  if (!r.ok) throw new Error("초대 링크 정보를 불러오지 못했습니다."); return (await r.json()) as InviteLinkInfo;
}

export async function acceptInvite(token: string): Promise<GroupDetail> {
  const r = await apiFetch(`/api/v1/groups/join/${token}/accept`, { method: "POST" });
  if (!r.ok) { if (r.status === 410) throw new Error("만료되었거나 이미 사용된 초대 링크입니다."); throw new Error("이벤트 참여에 실패했습니다."); }
  return (await r.json()) as GroupDetail;
}

export async function declineInvite(token: string, reason?: string): Promise<void> {
  const r = await apiFetch(`/api/v1/groups/join/${token}/decline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason ?? null }) });
  if (!r.ok) throw new Error("거절 처리에 실패했습니다.");
}

// ── Games ──

export type GameStatus = "PENDING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
export type GameProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type GamePlayerResponse = {
  userId: number;
  nickname: string;
  gender: Gender | null;
  nationalGrade: Grade | null;
};

export type GameResponse = {
  id: number;
  groupId: number;
  status: GameStatus;
  proposalStatus: GameProposalStatus;
  proposedByUserId: number | null;
  proposalReviewedByUserId: number | null;
  proposalReviewedAt: string | null;
  proposalRejectReason: string | null;
  gameType: GameType | null;
  teamA: GamePlayerResponse[];
  teamB: GamePlayerResponse[];
  courtNumber: number | null;
  teamAScore: number | null;
  teamBScore: number | null;
  winnerTeam: string | null;
  pendingTeamAScore: number | null;
  pendingTeamBScore: number | null;
  pendingRequestedByTeam: "A" | "B" | null;
  pendingRequestedByUserId: number | null;
  pendingRequestedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export async function fetchGames(groupId: number): Promise<GameResponse[]> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games`);
  if (!r.ok) throw new Error("게임 목록을 불러오지 못했습니다.");
  return (await r.json()) as GameResponse[];
}

export async function createGame(
  groupId: number,
  teamAUserIds: number[],
  teamBUserIds: number[],
  asProposal?: boolean,
): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamAUserIds, teamBUserIds, asProposal }),
  });
  if (!r.ok) throw new Error("게임 생성에 실패했습니다.");
  return (await r.json()) as GameResponse;
}

export async function startGame(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/start`, { method: "POST" });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "게임 시작에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function finishGame(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/finish`, { method: "POST" });
  if (!r.ok) throw new Error("게임 종료에 실패했습니다.");
  return (await r.json()) as GameResponse;
}

export async function submitScore(groupId: number, gameId: number, teamAScore: number, teamBScore: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/score`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamAScore, teamBScore }) });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "점수 입력에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function confirmScore(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/score/confirm`, { method: "POST" });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "점수 확정에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function rejectScore(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/score/reject`, { method: "POST" });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "점수 반려에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function updateGameCourtNumber(groupId: number, gameId: number, courtNumber: number | null): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/court-number`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courtNumber }),
  });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "코트 번호 저장에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function approveGameProposal(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/proposal/approve`, { method: "POST" });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "게임 제안 수락에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function rejectGameProposal(groupId: number, gameId: number, reason?: string): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/proposal/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "게임 제안 거절에 실패했습니다."); }
  return (await r.json()) as GameResponse;
}

export async function deleteGame(groupId: number, gameId: number): Promise<void> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("게임 삭제에 실패했습니다.");
}

export async function cancelGame(groupId: number, gameId: number): Promise<GameResponse> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/${gameId}/cancel`, { method: "POST" });
  if (!r.ok) throw new Error("게임 취소에 실패했습니다.");
  return (await r.json()) as GameResponse;
}

export type MemberStat = {
  userId: number;
  nickname: string;
  gender: Gender | null;
  nationalGrade: Grade | null;
  lv: number;
  exp: number;
  finishedGameCount: number;
  totalGameCount: number;
  winCount: number;
  winRate: number;
  overallFinishedGameCount: number;
  overallTotalGameCount: number;
  overallWinCount: number;
  overallWinRate: number;
};

export type TeamStat = {
  teamKey: string;
  eventGames: number;
  eventWins: number;
  eventWinRate: number;
  overallGames: number;
  overallWins: number;
  overallWinRate: number;
};

export type GameType = "MALE_DOUBLES" | "FEMALE_DOUBLES" | "MIXED_DOUBLES" | "FREE";

export async function fetchMemberStats(groupId: number): Promise<MemberStat[]> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/member-stats`);
  if (!r.ok) throw new Error("멤버 통계를 불러오지 못했습니다.");
  return (await r.json()) as MemberStat[];
}

export async function fetchTeamStats(groupId: number): Promise<TeamStat[]> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/team-stats`);
  if (!r.ok) throw new Error("팀 통계를 불러오지 못했습니다.");
  return (await r.json()) as TeamStat[];
}

export async function recommendGame(groupId: number, type: GameType): Promise<{ teamAUserIds: number[]; teamBUserIds: number[] }> {
  const r = await apiFetch(`/api/v1/groups/${groupId}/games/recommend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? "추천에 실패했습니다."); }
  return (await r.json()) as { teamAUserIds: number[]; teamBUserIds: number[] };
}

// ── Notifications ──

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  targetType: string | null;
  targetId: number | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPreferences = {
  inviteAccepted: boolean;
  inviteDeclined: boolean;
  memberJoined: boolean;
  memberKicked: boolean;
  groupUpdated: boolean;
  gradeUpgraded: boolean;
  gameCreated: boolean;
  gameStarted: boolean;
  gameFinished: boolean;
  gameProposalReceived: boolean;
  gameProposalApproved: boolean;
  gameProposalRejected: boolean;
  gameScoreRequested: boolean;
  gameScoreConfirmed: boolean;
  gameScoreRejected: boolean;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const r = await apiFetch("/api/v1/notifications"); if (!r.ok) throw new Error("알림을 불러오지 못했습니다.");
  return (await r.json()) as AppNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const r = await apiFetch("/api/v1/notifications/unread-count"); if (!r.ok) return 0;
  return ((await r.json()) as { count: number }).count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiFetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
}

export async function updateNotificationSetting(enabled: boolean): Promise<MeResponse> {
  const r = await apiFetch("/api/v1/me/notification-setting", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
  if (!r.ok) throw new Error("알림 설정 변경에 실패했습니다."); return (await r.json()) as MeResponse;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const r = await apiFetch("/api/v1/notifications/preferences");
  if (!r.ok) throw new Error("알림 항목 설정을 불러오지 못했습니다.");
  return (await r.json()) as NotificationPreferences;
}

export async function updateNotificationPreferences(request: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const r = await apiFetch("/api/v1/notifications/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!r.ok) throw new Error("알림 항목 설정 변경에 실패했습니다.");
  return (await r.json()) as NotificationPreferences;
}

export async function registerFcmToken(token: string): Promise<void> {
  await apiFetch("/api/v1/notifications/fcm-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
}

// ── My Record ──

export type TypeStat = { games: number; wins: number; losses: number; winRate: number };
export type PlayerInfo = { userId: number; nickname: string; gender: Gender | null; grade: Grade | null };
export type RecentGame = { gameId: number; groupName: string; gameType: GameType | null; isWin: boolean; teamAScore: number | null; teamBScore: number | null; myTeam: string; gradeAtTime: Grade | null; finishedAt: string | null; teammates: PlayerInfo[]; opponents: PlayerInfo[] };
export type PartnerStat = { userId: number; nickname: string; gender: Gender | null; nationalGrade: Grade | null; games: number; wins: number; winRate: number };
export type MonthlyStat = { month: string; games: number; wins: number; losses: number };

export type MyRecord = {
  nickname: string; gender: Gender | null; nationalGrade: Grade | null; lv: number; exp: number;
  totalGames: number; totalWins: number; totalLosses: number; totalWinRate: number;
  currentStreak: number; currentStreakType: string;
  maleDoubles: TypeStat; femaleDoubles: TypeStat; mixedDoubles: TypeStat; freeGame: TypeStat;
  recentGames: RecentGame[];
  topPartners: PartnerStat[];
  worstPartners: PartnerStat[];
  worstOpponents: PartnerStat[];
  gradeStats: Record<string, TypeStat>;
  monthlyStats: MonthlyStat[];
};

export async function fetchMyRecord(): Promise<MyRecord> {
  const r = await apiFetch("/api/v1/me/record"); if (!r.ok) throw new Error("기록을 불러오지 못했습니다.");
  return (await r.json()) as MyRecord;
}

export async function fetchUserRecord(userId: number): Promise<MyRecord> {
  const r = await apiFetch(`/api/v1/users/${userId}/record`); if (!r.ok) throw new Error("사용자 기록을 불러오지 못했습니다.");
  return (await r.json()) as MyRecord;
}

export async function fetchAllRecentGames(): Promise<RecentGame[]> {
  const r = await apiFetch("/api/v1/me/record/recent-games"); if (!r.ok) throw new Error("최근 경기를 불러오지 못했습니다.");
  return (await r.json()) as RecentGame[];
}

export async function fetchAllPartners(): Promise<Record<string, PartnerStat[]>> {
  const r = await apiFetch("/api/v1/me/record/partners"); if (!r.ok) throw new Error("파트너 통계를 불러오지 못했습니다.");
  return (await r.json()) as Record<string, PartnerStat[]>;
}

export async function fetchAllMonthly(): Promise<MonthlyStat[]> {
  const r = await apiFetch("/api/v1/me/record/monthly"); if (!r.ok) throw new Error("월별 전적을 불러오지 못했습니다.");
  return (await r.json()) as MonthlyStat[];
}

// ── Ranking ──

export type GradeRankingEntry = {
  userId: number;
  nickname: string;
  gender: Gender | null;
  grade: Grade;
  currentGrade: Grade;
  gameType: GameType | null;
  lv: number;
  exp: number;
  gameCount: number;
  winCount: number;
  winRate: number;
};

export type RankingByGrade = {
  grades: Record<Grade, Record<string, GradeRankingEntry[]>>;
};

export async function fetchRanking(): Promise<RankingByGrade> {
  const r = await apiFetch("/api/v1/ranking");
  if (!r.ok) throw new Error("랭킹을 불러오지 못했습니다.");
  return (await r.json()) as RankingByGrade;
}

export type TeamRankingMember = {
  userId: number;
  nickname: string;
  gender: Gender | null;
  grade: Grade;
};

export type TeamRankingEntry = {
  rank: number;
  teamKey: string;
  teamGrade: Grade;
  members: TeamRankingMember[];
  gameCount: number;
  winCount: number;
  winRate: number;
};

export type TeamRankingResponse = {
  grades: Record<Grade, Record<string, TeamRankingEntry[]>>;
};

export async function fetchTeamRanking(): Promise<TeamRankingResponse> {
  const r = await apiFetch("/api/v1/ranking/teams");
  if (!r.ok) throw new Error("팀 랭킹을 불러오지 못했습니다.");
  return (await r.json()) as TeamRankingResponse;
}

// ── Helpers ──

export function displayName(nickname: string, gender?: Gender | null, grade?: Grade | null): string {
  const parts = [nickname];
  if (gender) parts.push(gender === "MALE" ? "남" : "여");
  if (grade) parts.push(grade);
  return parts.join(" / ");
}
