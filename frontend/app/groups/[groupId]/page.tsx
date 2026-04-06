"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import {
  acceptInvite, cancelGame, changeMemberRole, closeGroup, createGame, createInviteLink, declineInvite,
  confirmScore,
  displayName, fetchGames, fetchGroupDetail, fetchInviteLinkInfo, fetchMe, fetchMemberStats,
  finishGame, getAccessToken, joinPublicGroup, kickGroupMember, leaveGroup, recommendGame, refreshAccessToken,
  rejectScore, startGame, submitScore, updateGameCourtNumber,
  type GameResponse, type GameType, type Grade, type GroupDetail, type InviteLinkInfo, type MeResponse, type MemberStat,
} from "@/lib/auth";
import { BottomNavGroupDetail } from "@/components/bottom-nav-group-detail";

type Tab = "info" | "manage" | "members" | "games" | "stats";
type Dialog = { type: "none" } | { type: "invite"; token: string; info: InviteLinkInfo | null } | { type: "decline"; token: string; info: InviteLinkInfo | null };

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [dialog, setDialog] = useState<Dialog>({ type: "none" });
  const [declineReason, setDeclineReason] = useState("");
  const [ds, setDs] = useState(false); // dialog submitting
  const [de, setDe] = useState<string | null>(null); // dialog error
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [games, setGames] = useState<GameResponse[]>([]);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [scoreDialog, setScoreDialog] = useState<{ gameId: number } | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [courtInputs, setCourtInputs] = useState<Record<number, string>>({});
  const [gameSubTab, setGameSubTab] = useState<"IN_PROGRESS" | "PENDING" | "SCORE_PENDING" | "FINISHED" | "CANCELLED">("IN_PROGRESS");
  const [showAllRanking, setShowAllRanking] = useState(false);

  const isOwner = group?.myRole === "OWNER";
  const isOwnerOrManager = group?.myRole === "OWNER" || group?.myRole === "MANAGER";
  const isMember = group?.myRole != null && group?.myStatus === "ACTIVE";
  const view = searchParams.get("view");

  useEffect(() => {
    const nextTab: Tab =
      view === "members" ? "members" :
      view === "games" ? "games" :
      view === "ranking" ? "stats" :
      view === "manage" ? "manage" :
      "info";
    setTab(nextTab);
  }, [view]);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const meData = await fetchMe();
        setMe(meData);
        if (!meData.onboardingCompleted) { router.replace("/onboarding"); return; }
        const inviteToken = searchParams.get("invite");
        let inviteInfo: InviteLinkInfo | null = null;
        try {
          setGroup(await fetchGroupDetail(groupId));
        } catch {
          if (inviteToken) {
            inviteInfo = await fetchInviteLinkInfo(inviteToken);
          } else throw new Error("이벤트 정보를 불러오지 못했습니다.");
        }
        if (inviteToken) {
          if (!inviteInfo) inviteInfo = await fetchInviteLinkInfo(inviteToken);
          setDialog({ type: "invite", token: inviteToken, info: inviteInfo });
        }
      } catch (err) { setError(err instanceof Error ? err.message : "이벤트 정보를 불러오지 못했습니다."); }
      finally { setLoading(false); }
    })();
  }, [groupId, searchParams]);

  async function handleAccept() {
    if (dialog.type !== "invite") return;
    setDs(true); setDe(null);
    try { setGroup(await acceptInvite(dialog.token)); setDialog({ type: "none" }); router.replace(`/groups/${groupId}`); }
    catch (err) { setDe(err instanceof Error ? err.message : "승인 실패"); } finally { setDs(false); }
  }

  async function handleDecline() {
    if (dialog.type !== "decline") return;
    setDs(true); setDe(null);
    try { await declineInvite(dialog.token, declineReason.trim() || undefined); setDialog({ type: "none" }); router.replace("/groups/list"); }
    catch (err) { setDe(err instanceof Error ? err.message : "거절 실패"); } finally { setDs(false); }
  }

  async function handleCopyLink() {
    if (!group) return; setLinkLoading(true);
    try {
      const r = await createInviteLink(group.id);
      await navigator.clipboard.writeText([`\u{1F3F8} ${group.name} 초대`, group.description ?? "", `\u{1F449} ${r.inviteUrl}`].filter(Boolean).join("\n"));
      setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : "초대 링크 생성 실패"); }
    finally { setLinkLoading(false); }
  }

  async function handleKick(uid: number, name: string) {
    if (!group || !window.confirm(`${name} 님을 강퇴하시겠습니까?`)) return;
    try { setGroup(await kickGroupMember(group.id, uid)); } catch (err) { setError(err instanceof Error ? err.message : "강퇴 실패"); }
  }

  async function handleClose() {
    if (!group || !window.confirm("이벤트를 종료하시겠습니까? 종료 후 되돌릴 수 없습니다.")) return;
    try { setGroup(await closeGroup(group.id)); } catch (err) { setError(err instanceof Error ? err.message : "종료 실패"); }
  }

  async function handleLeave() {
    if (!group || !window.confirm("정말 이 이벤트에서 탈퇴하시겠습니까?")) return;
    try { await leaveGroup(group.id); router.push("/groups/list"); }
    catch (err) { setError(err instanceof Error ? err.message : "탈퇴 실패"); }
  }

  async function loadGames() {
    if (!group) return;
    try {
      const [g, s] = await Promise.all([fetchGames(group.id), fetchMemberStats(group.id)]);
      setGames(g); setMemberStats(s);
    } catch {}
  }

  useEffect(() => {
    if (tab === "games" || tab === "stats") {
      void loadGames();
    }
  }, [tab, group?.id]);

  useEffect(() => {
    if (tab === "manage" && group && !isOwnerOrManager) {
      router.replace(`/groups/${group.id}?view=info`);
    }
  }, [tab, group, isOwnerOrManager, router]);

  function togglePlayer(userId: number, team: "A" | "B") {
    const setter = team === "A" ? setTeamA : setTeamB;
    const other = team === "A" ? setTeamB : setTeamA;
    setter((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : prev.length < 2 ? [...prev, userId] : prev);
    other((prev) => prev.filter((id) => id !== userId));
  }

  async function handleCreateGame() {
    if (!group || teamA.length !== 2 || teamB.length !== 2) { setError("각 팀에 2명씩 선택하세요."); return; }
    try {
      const g = await createGame(group.id, teamA, teamB);
      setGames((prev) => [g, ...prev]);
      setShowCreateGame(false); setTeamA([]); setTeamB([]);
    } catch (err) { setError(err instanceof Error ? err.message : "게임 생성 실패"); }
  }

  async function handleRecommend(type: GameType) {
    if (!group) return;
    try {
      const r = await recommendGame(group.id, type);
      setTeamA(r.teamAUserIds); setTeamB(r.teamBUserIds);
    } catch (err) { setError(err instanceof Error ? err.message : "추천 실패"); }
  }

  async function handleStartGame(gameId: number) {
    if (!group) return;
    try { const g = await startGame(group.id, gameId); setGames((prev) => prev.map((x) => x.id === gameId ? g : x)); }
    catch (err) { setError(err instanceof Error ? err.message : "게임 시작 실패"); }
  }

  async function handleFinishGame(gameId: number) {
    if (!group) return;
    try {
      const g = await finishGame(group.id, gameId);
      setGames((prev) => prev.map((x) => x.id === gameId ? g : x));
    } catch (err) { setError(err instanceof Error ? err.message : "게임 종료 실패"); }
  }

  async function handleSubmitScore() {
    if (!group || !scoreDialog) return;
    const a = Number(scoreA); const b = Number(scoreB);
    if (isNaN(a) || isNaN(b) || a === b) { setError("올바른 점수를 입력하세요. (동점 불가)"); return; }
    try {
      const g = await submitScore(group.id, scoreDialog.gameId, a, b);
      setGames((prev) => prev.map((x) => x.id === scoreDialog.gameId ? g : x));
      setScoreDialog(null); setScoreA(""); setScoreB("");
    } catch (err) { setError(err instanceof Error ? err.message : "점수 요청 실패"); }
  }

  async function handleConfirmScore(gameId: number) {
    if (!group) return;
    try {
      const g = await confirmScore(group.id, gameId);
      setGames((prev) => prev.map((x) => x.id === gameId ? g : x));
    } catch (err) { setError(err instanceof Error ? err.message : "점수 확정 실패"); }
  }

  async function handleRejectScore(gameId: number) {
    if (!group) return;
    try {
      const g = await rejectScore(group.id, gameId);
      setGames((prev) => prev.map((x) => x.id === gameId ? g : x));
    } catch (err) { setError(err instanceof Error ? err.message : "점수 반려 실패"); }
  }

  async function handleSaveCourtNumber(gameId: number, currentCourtNumber: number | null) {
    if (!group) return;
    const raw = (courtInputs[gameId] ?? (currentCourtNumber != null ? String(currentCourtNumber) : "")).trim();
    const parsedCourtNumber = raw === "" ? null : Number(raw);
    if (parsedCourtNumber != null && (!Number.isInteger(parsedCourtNumber) || parsedCourtNumber < 1)) {
      setError("코트 번호는 1 이상의 정수로 입력하세요.");
      return;
    }
    try {
      const g = await updateGameCourtNumber(group.id, gameId, parsedCourtNumber);
      setGames((prev) => prev.map((x) => x.id === gameId ? g : x));
      setCourtInputs((prev) => ({ ...prev, [gameId]: parsedCourtNumber == null ? "" : String(parsedCourtNumber) }));
    } catch (err) { setError(err instanceof Error ? err.message : "코트 번호 저장 실패"); }
  }

  async function handleCancelGame(gameId: number) {
    if (!group || !window.confirm("게임을 취소하시겠습니까? 취소 시 통계/기록에서 제외되고, 반영된 경험치는 롤백됩니다.")) return;
    try { const g = await cancelGame(group.id, gameId); setGames((prev) => prev.map((x) => x.id === gameId ? g : x)); }
    catch (err) { setError(err instanceof Error ? err.message : "게임 취소 실패"); }
  }

  async function handleRole(uid: number, role: "MANAGER" | "MEMBER") {
    if (!group) return;
    try { setGroup(await changeMemberRole(group.id, uid, role)); } catch (err) { setError(err instanceof Error ? err.message : "권한 변경 실패"); }
  }

  async function handleJoinPublic() {
    if (!group) return;
    setJoinLoading(true);
    try { setGroup(await joinPublicGroup(group.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "참여 실패"); }
    finally { setJoinLoading(false); }
  }

  function getJoinBlock(): string | null {
    if (!group || !me?.skill) return null;
    const gradeOrder: Grade[] = ["F", "E", "D", "C", "B", "A", "S"];
    const myIdx = gradeOrder.indexOf(me.skill.nationalGrade);
    if (group.minGrade) {
      const minIdx = gradeOrder.indexOf(group.minGrade);
      if (myIdx < minIdx) return `최소 급수 ${group.minGrade} 이상만 참여 가능`;
    }
    if (group.maxGrade) {
      const maxIdx = gradeOrder.indexOf(group.maxGrade);
      if (myIdx > maxIdx) return `최대 급수 ${group.maxGrade} 이하만 참여 가능`;
    }
    if (group.maxMembers && group.memberCount >= group.maxMembers) return "최대 인원 초과";
    if (me.gender === "MALE" && group.maxMale != null) {
      const maleCount = group.members.filter((m) => m.gender === "MALE" && m.status === "ACTIVE").length;
      if (maleCount >= group.maxMale) return "남성 최대 인원 초과";
    }
    if (me.gender === "FEMALE" && group.maxFemale != null) {
      const femaleCount = group.members.filter((m) => m.gender === "FEMALE" && m.status === "ACTIVE").length;
      if (femaleCount >= group.maxFemale) return "여성 최대 인원 초과";
    }
    return null;
  }

  const joinBlock = getJoinBlock();
  const canJoin = group?.visibility === "PUBLIC" && !isMember && !joinBlock;
  const sortedMembers = group
    ? [...group.members].sort((a, b) => {
        const aIsMe = a.userId === me?.id;
        const bIsMe = b.userId === me?.id;
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;

        const rolePriority = { OWNER: 0, MANAGER: 1, MEMBER: 2 } as const;
        const roleDiff = rolePriority[a.role] - rolePriority[b.role];
        if (roleDiff !== 0) return roleDiff;

        const gradePriority: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
        const aGrade = a.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[a.nationalGrade];
        const bGrade = b.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[b.nationalGrade];
        if (aGrade !== bGrade) return aGrade - bGrade;

        const nicknameDiff = a.nickname.localeCompare(b.nickname, "ko");
        if (nicknameDiff !== 0) return nicknameDiff;

        return a.userId - b.userId;
      })
    : [];

  function fmtDate(s: string | null) { return s ? new Date(s).toLocaleString("ko-KR") : "-"; }

  const inviteInfo = dialog.type !== "none" ? dialog.info : null;
  const gameOrderMap = new Map(
    games
      .slice()
      .sort((a, b) => {
        const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return t !== 0 ? t : a.id - b.id;
      })
      .map((g, idx) => [g.id, idx + 1] as const),
  );

  if (loading) return <main style={main}><p style={{ color: "var(--muted)", textAlign: "center", padding: 60 }}>불러오는 중...</p></main>;
  if (error && !group && dialog.type === "none") return <main style={main}><div style={{ ...card, maxWidth: 400, margin: "60px auto" }}><p style={{ margin: 0, color: "var(--danger)", textAlign: "center" }}>{error}</p><Link href="/groups/list" style={{ color: "var(--brand-light)", fontWeight: 700, textAlign: "center" }}>이벤트 목록으로</Link></div></main>;

  return (
    <main style={{ ...main, paddingBottom: 80 }}>
      {/* ── Invite Dialog ── */}
      {(dialog.type === "invite" || dialog.type === "decline") && (
        <div style={overlay}><div style={dlg}>
          {dialog.type === "invite" && (<>
            <div style={{ fontSize: 40, textAlign: "center" }}>{"\u{1F3F8}"}</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>이벤트 초대</h2>
            <p style={{ margin: 0, color: "var(--ink-secondary)", textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink)" }}>{group?.name ?? inviteInfo?.groupName ?? "이벤트"}</strong>에 초대되었습니다.
            </p>
            {inviteInfo && (
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--surface-3)", display: "grid", gap: 4 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-secondary)" }}>초대자: <strong style={{ color: "var(--ink)" }}>{inviteInfo.inviterNickname}</strong></p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-secondary)" }}>초대일시: {fmtDate(inviteInfo.invitedAt)}</p>
              </div>
            )}
            {de && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{de}</p>}
            <div style={{ display: "grid", gap: 10 }}>
              <button disabled={ds} onClick={() => { void handleAccept(); }} style={{ ...btnP, width: "100%" }}>{ds ? "처리 중..." : "승인"}</button>
              <button disabled={ds} onClick={() => setDialog({ type: "decline", token: dialog.token, info: dialog.info })} style={{ ...btnDng, width: "100%" }}>거절</button>
            </div>
          </>)}
          {dialog.type === "decline" && (<>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>초대 거절</h2>
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="거절 사유 (선택)" rows={3} style={ta} />
            {de && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{de}</p>}
            <div style={{ display: "grid", gap: 10 }}>
              <button disabled={ds} onClick={() => { void handleDecline(); }} style={{ ...btnDng, width: "100%" }}>{ds ? "처리 중..." : "거절 확인"}</button>
              <button disabled={ds} onClick={() => setDialog({ type: "invite", token: dialog.token, info: dialog.info })} style={{ ...btnSec, width: "100%" }}>돌아가기</button>
            </div>
          </>)}
        </div></div>
      )}

      {/* ── Content ── */}
      {group && <section style={sec}>
        {/* Header */}
        <div style={{ ...card, gap: 8 }}>
          <Link href="/groups/list" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 목록</Link>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{group.name}</h1>
          {group.description && <p style={{ margin: 0, color: "var(--ink-secondary)", fontSize: 14, lineHeight: 1.5 }}>{group.description}</p>}
        </div>

        {/* ── Tab: Info ── */}
        {tab === "info" && (
          <div style={{ ...card, gap: 12 }}>
            <h2 style={sh}>이벤트 정보</h2>
            <div style={infoGrid}>
              <InfoRow label="장소" value={group.location ?? "-"} />
              <InfoRow label="공개 범위" value={group.visibility === "PUBLIC" ? "공개" : "초대 전용"} />
              <InfoRow label="멤버 수" value={`${group.memberCount}명`} />
              <InfoRow label="시작일시" value={fmtDate(group.startAt)} />
              <InfoRow label="종료일시" value={fmtDate(group.endAt)} />
              <InfoRow label="참여 마감" value={fmtDate(group.registrationDeadline)} />
              <InfoRow label="최소 급수" value={group.minGrade ?? "제한 없음"} />
              <InfoRow label="최대 급수" value={group.maxGrade ?? "제한 없음"} />
              <InfoRow label="최대 인원" value={group.maxMembers ? `${group.maxMembers}명` : "제한 없음"} />
              <InfoRow label="최대 남성" value={group.maxMale != null ? `${group.maxMale}명` : "제한 없음"} />
              <InfoRow label="최대 여성" value={group.maxFemale != null ? `${group.maxFemale}명` : "제한 없음"} />
            </div>

            {/* Join Button for public groups */}
            {group.visibility === "PUBLIC" && !isMember && (
              <div style={{ marginTop: 8 }}>
                {joinBlock && <p style={{ margin: "0 0 8px", color: "var(--warning)", fontSize: 13 }}>{joinBlock}</p>}
                <button
                  disabled={!canJoin || joinLoading}
                  onClick={() => { void handleJoinPublic(); }}
                  style={{ ...btnP, width: "100%", opacity: canJoin ? 1 : 0.4, cursor: canJoin ? "pointer" : "not-allowed" }}
                >
                  {joinLoading ? "참여 중..." : "참여하기"}
                </button>
              </div>
            )}

            {/* Leave Button for non-owner members */}
            {isMember && !isOwner && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => { void handleLeave(); }} style={{ ...btnDng, width: "100%" }}>
                  이벤트 탈퇴
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Manage ── */}
        {tab === "manage" && isOwnerOrManager && (
          <div style={{ ...card, gap: 12 }}>
            <h2 style={sh}>관리</h2>
            <button disabled={linkLoading} onClick={() => { void handleCopyLink(); }} style={{ ...btnP, background: linkCopied ? "var(--success)" : "var(--brand)" }}>
              {linkCopied ? "복사 완료!" : linkLoading ? "생성 중..." : "초대 링크 복사"}
            </button>
            <Link href={`/groups/${group.id}/invite-history`} style={{ textDecoration: "none" }}><div style={{ ...btnSec, textAlign: "center" }}>초대 이력</div></Link>
            {isOwnerOrManager && (
              <Link href={`/groups/${group.id}/edit`} style={{ textDecoration: "none" }}><div style={{ ...btnSec, textAlign: "center" }}>이벤트 정보 수정</div></Link>
            )}
            {isOwner && !group.closed && (
              <button onClick={() => { void handleClose(); }} style={{ ...btnDng, width: "100%" }}>이벤트 종료</button>
            )}
            {group.closed && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, fontWeight: 700, textAlign: "center" }}>이 이벤트는 종료되었습니다</p>}
          </div>
        )}

        {/* ── Tab: Members ── */}
        {tab === "members" && (
          <div style={{ ...card, gap: 10 }}>
            <h2 style={sh}>멤버 ({group.members.length})</h2>
            {sortedMembers.map((m) => (
              <div key={m.userId} style={{ ...item, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Link href={`/users/${m.userId}/record`} style={userRecordLink}>
                      {displayName(m.nickname, m.gender, m.nationalGrade)}
                    </Link>
                    {m.userId === me?.id && <span style={{ ...gBadge, background: "rgba(0,206,201,0.15)", color: "var(--accent)" }}>나</span>}
                  </div>
                  <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 13 }}>
                    {m.role === "OWNER" ? "이벤트장" : m.role === "MANAGER" ? "관리자" : "멤버"}
                  </p>
                </div>
                {isOwner && m.role !== "OWNER" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={m.role}
                      onChange={(e) => { void handleRole(m.userId, e.target.value as "MANAGER" | "MEMBER"); }}
                      style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface-3)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                    >
                      <option value="MANAGER">관리자</option>
                      <option value="MEMBER">멤버</option>
                    </select>
                    <button onClick={() => { void handleKick(m.userId, m.nickname); }} style={btnKick}>강퇴</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Games ── */}
        {tab === "games" && (
          <div style={{ ...card, gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={sh}>게임</h2>
              {isOwnerOrManager && !showCreateGame && (
                <button onClick={() => { setShowCreateGame(true); setTeamA([]); setTeamB([]); void loadGames(); }} style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ 게임 생성</button>
              )}
            </div>

            {/* Create Game */}
            {showCreateGame && (
              <div style={{ ...item, gap: 10, display: "grid" }}>
                {/* Recommend Buttons */}
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink-secondary)" }}>자동 추천</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([["MALE_DOUBLES", "남복"], ["FEMALE_DOUBLES", "여복"], ["MIXED_DOUBLES", "혼복"], ["FREE", "자유"]] as [GameType, string][]).map(([t, label]) => (
                    <button key={t} onClick={() => { void handleRecommend(t); }} style={{ ...gBadge, cursor: "pointer", border: 0, background: "var(--surface-2)", color: "var(--ink-secondary)" }}>{label}</button>
                  ))}
                </div>

                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink-secondary)" }}>멤버 선택 (팀당 2명)</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ ...gBadge, background: "rgba(108,92,231,0.15)", color: "var(--brand-light)" }}>팀A: {teamA.length}/2</span>
                  <span style={{ ...gBadge, background: "rgba(0,206,201,0.15)", color: "var(--accent)" }}>팀B: {teamB.length}/2</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.members.filter((m) => m.status === "ACTIVE").map((m) => {
                    const inA = teamA.includes(m.userId);
                    const inB = teamB.includes(m.userId);
                    const stat = memberStats.find((s) => s.userId === m.userId);
                    return (
                      <div key={m.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: inA ? "rgba(108,92,231,0.08)" : inB ? "rgba(0,206,201,0.08)" : "var(--surface-3)" }}>
                        <div>
                          <Link href={`/users/${m.userId}/record`} style={{ ...userRecordLink, fontSize: 14 }}>
                            {displayName(m.nickname, m.gender, m.nationalGrade)}
                          </Link>
                          {stat && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{stat.finishedGameCount}/{stat.totalGameCount}게임 / {stat.winRate.toFixed(0)}%</span>}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => togglePlayer(m.userId, "A")} style={{ ...gBadge, cursor: "pointer", border: 0, background: inA ? "var(--brand)" : "var(--surface-2)", color: inA ? "#fff" : "var(--muted)" }}>A</button>
                          <button onClick={() => togglePlayer(m.userId, "B")} style={{ ...gBadge, cursor: "pointer", border: 0, background: inB ? "var(--accent)" : "var(--surface-2)", color: inB ? "#fff" : "var(--muted)" }}>B</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { void handleCreateGame(); }} disabled={teamA.length !== 2 || teamB.length !== 2} style={{ ...btnP, flex: 1, opacity: teamA.length === 2 && teamB.length === 2 ? 1 : 0.4 }}>생성</button>
                  <button onClick={() => setShowCreateGame(false)} style={{ ...btnSec, flex: 1 }}>취소</button>
                </div>
              </div>
            )}

            {/* Game Sub Tabs */}
            {!showCreateGame && (
              <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)" }}>
                {([
                  ["PENDING", "대기"],
                  ["IN_PROGRESS", "진행중"],
                  ["SCORE_PENDING", "입력 대기"],
                  ["FINISHED", "종료"],
                  ...(isOwnerOrManager ? [["CANCELLED", "취소"]] : []),
                ] as [typeof gameSubTab, string][]).map(([s, label]) => (
                  <button key={s} onClick={() => setGameSubTab(s)} style={{ flex: 1, padding: "8px 0", border: 0, borderRadius: "var(--radius-sm)", background: gameSubTab === s ? "var(--brand)" : "transparent", color: gameSubTab === s ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s" }}>{label}</button>
                ))}
              </div>
            )}

            {/* Game List */}
            {(() => {
              const filtered = games.filter((g) => {
                if (gameSubTab === "IN_PROGRESS") return g.status === "IN_PROGRESS";
                if (gameSubTab === "PENDING") return g.status === "PENDING";
                if (gameSubTab === "SCORE_PENDING") return g.status === "FINISHED" && g.teamAScore == null;
                if (gameSubTab === "FINISHED") return g.status === "FINISHED" && g.teamAScore != null;
                return g.status === "CANCELLED";
              });
              if (filtered.length === 0 && !showCreateGame) {
                const label = gameSubTab === "IN_PROGRESS"
                  ? "진행중인"
                  : gameSubTab === "PENDING"
                    ? "대기중인"
                    : gameSubTab === "SCORE_PENDING"
                      ? "입력 대기중인"
                      : gameSubTab === "FINISHED"
                        ? "종료된"
                        : "취소된";
                return <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 20 }}>{label} 게임이 없습니다</p>;
              }
              return filtered.map((g) => {
              const isPlayer = [...g.teamA, ...g.teamB].some((p) => p.userId === me?.id);
              const myTeam = g.teamA.some((p) => p.userId === me?.id) ? "A" : g.teamB.some((p) => p.userId === me?.id) ? "B" : null;
              const pendingRequesterTeam = g.pendingRequestedByTeam;
              const canConfirmOrReject = g.status === "FINISHED" && isPlayer && g.teamAScore == null && pendingRequesterTeam != null && myTeam != null && myTeam !== pendingRequesterTeam;
              const pendingMessage = g.pendingTeamAScore != null && g.pendingTeamBScore != null && pendingRequesterTeam
                ? `점수 확인 대기: 팀 ${pendingRequesterTeam}가 ${g.pendingTeamAScore} : ${g.pendingTeamBScore} 요청`
                : null;
              const statusLabel = g.status === "PENDING" ? "대기" : g.status === "IN_PROGRESS" ? "진행중" : g.status === "FINISHED" ? "종료" : "취소";
              const statusTone = g.status === "IN_PROGRESS"
                ? { background: "rgba(0,206,201,0.14)", color: "var(--accent)", borderColor: "rgba(0,206,201,0.35)" }
                : g.status === "FINISHED"
                  ? { background: "var(--success-bg)", color: "var(--success)", borderColor: "rgba(16,185,129,0.35)" }
                  : g.status === "CANCELLED"
                    ? { background: "var(--danger-bg)", color: "var(--danger)", borderColor: "rgba(255,107,107,0.35)" }
                    : { background: "var(--surface-3)", color: "var(--ink-secondary)", borderColor: "var(--line-2)" };
              return (
                <div key={g.id} style={gameCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ ...gBadge, background: "var(--surface-3)", color: "var(--ink)", padding: "5px 11px", border: "1px solid var(--line-2)" }}>
                        {gameOrderMap.get(g.id)}번 게임
                      </span>
                      <span style={{ ...gBadge, padding: "5px 11px", border: `1px solid ${statusTone.borderColor}`, background: statusTone.background, color: statusTone.color }}>
                        {statusLabel}
                      </span>
                      {g.courtNumber != null && (
                        <span style={{ ...gBadge, padding: "5px 11px", border: "1px solid rgba(108,92,231,0.35)", background: "rgba(108,92,231,0.12)", color: "var(--brand-light)" }}>
                          코트 {g.courtNumber}번
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>
                      {new Date(g.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={gameTeamsGrid}>
                    <div style={gameTeamPanelLeft}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--brand-light)", marginBottom: 6 }}>
                        팀 A {g.winnerTeam === "A" ? "🏆" : ""}
                      </p>
                      {g.teamA.map((p) => (
                        <p key={p.userId} style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                          <Link href={`/users/${p.userId}/record`} style={{ ...userRecordLink, fontSize: 13 }}>
                            {displayName(p.nickname, p.gender, p.nationalGrade)}
                          </Link>
                        </p>
                      ))}
                    </div>
                    <div style={gameScoreWrap}>
                      {g.teamAScore != null ? (
                        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{g.teamAScore} : {g.teamBScore}</span>
                      ) : (
                        <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 700 }}>VS</span>
                      )}
                    </div>
                    <div style={gameTeamPanelRight}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--accent)", marginBottom: 6 }}>
                        팀 B {g.winnerTeam === "B" ? "🏆" : ""}
                      </p>
                      {g.teamB.map((p) => (
                        <p key={p.userId} style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                          <Link href={`/users/${p.userId}/record`} style={{ ...userRecordLink, fontSize: 13 }}>
                            {displayName(p.nickname, p.gender, p.nationalGrade)}
                          </Link>
                        </p>
                      ))}
                    </div>
                  </div>

                  {(g.status === "PENDING" || g.status === "IN_PROGRESS") && isMember && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>코트 번호</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="번호"
                        value={courtInputs[g.id] ?? (g.courtNumber != null ? String(g.courtNumber) : "")}
                        onChange={(e) => setCourtInputs((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        style={{ width: 84, height: 34, borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", padding: "0 10px", fontSize: 13, fontWeight: 700 }}
                      />
                      <button onClick={() => { void handleSaveCourtNumber(g.id, g.courtNumber); }} style={{ ...btnSec, minHeight: 34, padding: "0 12px", fontSize: 12 }}>
                        저장
                      </button>
                    </div>
                  )}
                  {pendingMessage && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--warning)", fontWeight: 700, padding: "8px 10px", borderRadius: 10, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.22)" }}>
                      {pendingMessage}
                    </p>
                  )}
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    {g.status === "PENDING" && isMember && <button onClick={() => { void handleStartGame(g.id); }} style={{ ...btnP, flex: 1, minHeight: 36, fontSize: 13 }}>시작</button>}
                    {g.status === "IN_PROGRESS" && isMember && <button onClick={() => { void handleFinishGame(g.id); }} style={{ ...btnP, flex: 1, minHeight: 36, fontSize: 13, background: "var(--accent)" }}>종료</button>}
                    {g.status === "FINISHED" && isPlayer && g.teamAScore == null && g.pendingTeamAScore == null && <button onClick={() => { setScoreDialog({ gameId: g.id }); setScoreA(""); setScoreB(""); }} style={{ ...btnP, flex: 1, minHeight: 36, fontSize: 13, background: "var(--warning)", color: "#000" }}>점수 입력</button>}
                    {canConfirmOrReject && (
                      <>
                        <button onClick={() => { void handleConfirmScore(g.id); }} style={{ ...btnP, flex: 1, minHeight: 36, fontSize: 13, background: "var(--success)", color: "#fff" }}>점수 수락</button>
                        <button onClick={() => { void handleRejectScore(g.id); }} style={{ ...btnDng, flex: 1, minHeight: 36, fontSize: 13 }}>점수 거절</button>
                      </>
                    )}
                    {isOwnerOrManager && g.status !== "CANCELLED" && <button onClick={() => { void handleCancelGame(g.id); }} style={{ ...btnDng, flex: 0, minHeight: 36, fontSize: 13, padding: "0 12px" }}>취소</button>}
                  </div>
                </div>
              );
            });
            })()}
          </div>
        )}

        {/* ── Tab: Stats ── */}
        {tab === "stats" && (
          <div style={{ ...card, gap: 10 }}>
            <h2 style={sh}>랭킹</h2>
            {memberStats.length === 0 && <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 20 }}>랭킹 데이터가 없습니다</p>}

            {/* 이벤트 내 랭킹 */}
            <div style={{ ...item, display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>이벤트 내 랭킹</p>
              {memberStats
                .slice()
                .sort((a, b) => b.winRate - a.winRate || b.winCount - a.winCount || b.finishedGameCount - a.finishedGameCount)
                .slice(0, showAllRanking ? undefined : 5)
                .map((s, idx) => (
                  <div key={s.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{idx + 1}.</span>
                        <Link href={`/users/${s.userId}/record`} style={{ ...userRecordLink, fontSize: 14 }}>
                          {displayName(s.nickname, s.gender, s.nationalGrade)}
                        </Link>
                      </div>
                      <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 12 }}>
                        LV {s.lv} / 경험치 {s.exp.toFixed(1)}%
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>{s.winRate.toFixed(0)}%</p>
                      <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 12 }}>{s.winCount}승 / {s.finishedGameCount}전</p>
                    </div>
                  </div>
                ))}
              {memberStats.length > 5 && (
                <button
                  onClick={() => setShowAllRanking((prev) => !prev)}
                  style={{ ...btnSec, minHeight: 36, fontSize: 13, marginTop: 4 }}
                >
                  {showAllRanking ? "접기" : "더보기"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Score Dialog */}
        {scoreDialog && (
          <div style={overlay}><div style={dlg}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, textAlign: "center" }}>점수 입력</h2>
            <p style={{ margin: 0, color: "var(--ink-secondary)", fontSize: 14, textAlign: "center" }}>세트 승수를 입력하세요</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--brand-light)" }}>팀 A</p>
                <input type="number" value={scoreA} onChange={(e) => setScoreA(e.target.value)} min={0} style={scoreInput} />
              </div>
              <span style={{ fontSize: 28, fontWeight: 800, color: "var(--muted)", paddingTop: 24 }}>:</span>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>팀 B</p>
                <input type="number" value={scoreB} onChange={(e) => setScoreB(e.target.value)} min={0} style={scoreInput} />
              </div>
            </div>
            {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={() => { void handleSubmitScore(); }} style={{ ...btnP, width: "100%" }}>확인</button>
              <button onClick={() => setScoreDialog(null)} style={{ ...btnSec, width: "100%" }}>취소</button>
            </div>
          </div></div>
        )}

        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{error}</p>}
      </section>}

      {/* ── Bottom Tab Bar ── */}
      {group && (
        <BottomNavGroupDetail
          groupId={group.id}
          active={tab}
          isOwnerOrManager={isOwnerOrManager}
        />
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 };
const card: CSSProperties = { padding: "20px 22px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid" };
const item: CSSProperties = { borderRadius: "var(--radius-md)", border: "1px solid var(--line)", padding: "12px 16px", background: "var(--surface-2)" };
const sh: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink-secondary)" };
const infoGrid: CSSProperties = { display: "grid", gap: 0 };
const btnP: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnSec: CSSProperties = { minHeight: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnDng: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: "1px solid rgba(255,107,107,0.3)", background: "var(--danger-bg)", color: "var(--danger)", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnKick: CSSProperties = { padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,107,107,0.3)", background: "var(--danger-bg)", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const gBadge: CSSProperties = { fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "var(--surface-3)", color: "var(--ink-secondary)" };
const gameCard: CSSProperties = {
  ...item,
  display: "grid",
  gap: 10,
  padding: "14px 14px 12px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00)), var(--surface-2)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
};
const gameTeamsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "stretch" };
const gameTeamPanelLeft: CSSProperties = {
  border: "1px solid rgba(108,92,231,0.22)",
  background: "rgba(108,92,231,0.08)",
  borderRadius: 12,
  padding: "10px 12px",
};
const gameTeamPanelRight: CSSProperties = {
  border: "1px solid rgba(0,206,201,0.22)",
  background: "rgba(0,206,201,0.08)",
  borderRadius: 12,
  padding: "10px 12px",
  textAlign: "right",
};
const gameScoreWrap: CSSProperties = {
  minWidth: 66,
  borderRadius: 12,
  border: "1px solid var(--line-2)",
  background: "var(--surface-3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 8px",
};
const userRecordLink: CSSProperties = {
  margin: 0,
  fontWeight: 700,
  fontSize: 15,
  color: "var(--ink)",
  textDecoration: "none",
};
const scoreInput: CSSProperties = { width: 80, height: 64, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 28, fontWeight: 800, textAlign: "center", outline: "none" };
const ta: CSSProperties = { borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", padding: 14, fontSize: 15, resize: "vertical", minHeight: 80, background: "var(--surface-2)", color: "var(--ink)", fontFamily: "inherit" };
const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 };
const dlg: CSSProperties = { background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "var(--radius-xl)", padding: "32px 24px", maxWidth: 400, width: "100%", display: "grid", gap: 16, boxShadow: "var(--shadow-lg)" };
