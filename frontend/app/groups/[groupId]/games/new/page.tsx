"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  createGame,
  displayName,
  fetchGroupDetail,
  fetchMe,
  fetchMemberStats,
  fetchTeamStats,
  getAccessToken,
  recommendGame,
  refreshAccessToken,
  type GameType,
  type Grade,
  type GroupDetail,
  type MemberStat,
  type TeamStat,
} from "@/lib/auth";

export default function NewGamePage() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<"CREATE" | "PROPOSE">(
    requestedMode === "create" ? "CREATE" : "PROPOSE",
  );

  useEffect(() => {
    setMode(requestedMode === "create" ? "CREATE" : "PROPOSE");
  }, [requestedMode]);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await fetchMe();
        if (!me.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }
        const [groupData, stats, teamStatData] = await Promise.all([
          fetchGroupDetail(groupId),
          fetchMemberStats(groupId),
          fetchTeamStats(groupId),
        ]);
        setGroup(groupData);
        setMemberStats(stats);
        setTeamStats(teamStatData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "게임 생성 화면을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, router]);

  const isOwnerOrManager = group?.myRole === "OWNER" || group?.myRole === "MANAGER";
  const isMember = group?.myRole != null && group?.myStatus === "ACTIVE";
  const effectiveMode: "CREATE" | "PROPOSE" = isOwnerOrManager ? mode : "PROPOSE";

  const activeMembers = useMemo(() => {
    if (!group) return [];
    const gradePriority: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
    return group.members
      .filter((m) => m.status === "ACTIVE")
      .slice()
      .sort((a, b) => {
        const aGrade = a.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[a.nationalGrade];
        const bGrade = b.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[b.nationalGrade];
        if (aGrade !== bGrade) return aGrade - bGrade;
        const nicknameDiff = a.nickname.localeCompare(b.nickname, "ko");
        if (nicknameDiff !== 0) return nicknameDiff;
        return a.userId - b.userId;
      });
  }, [group]);

  const selectedTeamA = useMemo(
    () => teamA.map((id) => activeMembers.find((m) => m.userId === id)).filter((m): m is NonNullable<typeof m> => m != null),
    [teamA, activeMembers],
  );
  const selectedTeamB = useMemo(
    () => teamB.map((id) => activeMembers.find((m) => m.userId === id)).filter((m): m is NonNullable<typeof m> => m != null),
    [teamB, activeMembers],
  );
  const teamAKey = useMemo(() => (teamA.length === 2 ? teamA.slice().sort((a, b) => a - b).join("-") : null), [teamA]);
  const teamBKey = useMemo(() => (teamB.length === 2 ? teamB.slice().sort((a, b) => a - b).join("-") : null), [teamB]);
  const teamAStat = useMemo(() => teamStats.find((t) => t.teamKey === teamAKey) ?? null, [teamStats, teamAKey]);
  const teamBStat = useMemo(() => teamStats.find((t) => t.teamKey === teamBKey) ?? null, [teamStats, teamBKey]);
  const teamARecord = teamAStat ?? { teamKey: teamAKey ?? "", eventGames: 0, eventWins: 0, eventWinRate: 0, overallGames: 0, overallWins: 0, overallWinRate: 0 };
  const teamBRecord = teamBStat ?? { teamKey: teamBKey ?? "", eventGames: 0, eventWins: 0, eventWinRate: 0, overallGames: 0, overallWins: 0, overallWinRate: 0 };

  function togglePlayer(userId: number, team: "A" | "B") {
    const setter = team === "A" ? setTeamA : setTeamB;
    const other = team === "A" ? setTeamB : setTeamA;
    setter((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 2
          ? [...prev, userId]
          : prev,
    );
    other((prev) => prev.filter((id) => id !== userId));
  }

  async function handleRecommend(type: GameType) {
    if (!group) return;
    try {
      const r = await recommendGame(group.id, type);
      setTeamA(r.teamAUserIds);
      setTeamB(r.teamBUserIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추천에 실패했습니다.");
    }
  }

  async function handleSubmit() {
    if (!group || !isMember) return;
    if (teamA.length !== 2 || teamB.length !== 2) {
      setError("각 팀에 2명씩 선택하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createGame(group.id, teamA, teamB, effectiveMode === "PROPOSE");
      router.push(`/groups/${group.id}?view=games`);
    } catch (e) {
      setError(e instanceof Error ? e.message : effectiveMode === "CREATE" ? "게임 생성 실패" : "게임 제안 실패");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main style={main}><p style={muted}>불러오는 중...</p></main>;
  if (error && !group) return <main style={main}><p style={{ ...muted, color: "var(--danger)" }}>{error}</p></main>;
  if (!group) return null;

  return (
    <main style={main}>
      <section style={sec}>
        <div style={card}>
          <Link href={`/groups/${group.id}?view=games`} style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 게임으로</Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {effectiveMode === "CREATE" ? "게임 생성" : "게임 제안"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: 13 }}>{group.name}</p>
          {isOwnerOrManager && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button onClick={() => setMode("CREATE")} style={{ ...modeBtn, ...(effectiveMode === "CREATE" ? modeBtnOn : modeBtnOff) }}>생성</button>
              <button onClick={() => setMode("PROPOSE")} style={{ ...modeBtn, ...(effectiveMode === "PROPOSE" ? modeBtnOn : modeBtnOff) }}>제안</button>
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>선택된 팀</h2>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <div style={selectedTeamRow}>
              <p style={{ ...teamLabel, color: "var(--brand-light)" }}>팀 A ({selectedTeamA.length}/2)</p>
              {teamAKey && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-secondary)", fontWeight: 700 }}>
                  팀 전적: 이벤트 {teamARecord.eventWins}승/{teamARecord.eventGames}전 · 총 {teamARecord.overallWins}승/{teamARecord.overallGames}전
                </p>
              )}
              {selectedTeamA.length === 0 ? (
                <p style={teamMembersText}>-</p>
              ) : (
                selectedTeamA.map((m) => {
                  const stat = memberStats.find((s) => s.userId === m.userId);
                  return (
                    <p key={m.userId} style={{ margin: 0, fontSize: 12, color: "var(--ink)" }}>
                      {displayName(m.nickname, m.gender, m.nationalGrade)}
                      {stat && ` · 이벤트 ${stat.winCount}승/${stat.finishedGameCount}전 · 총 ${stat.overallWinCount}승/${stat.overallFinishedGameCount}전`}
                    </p>
                  );
                })
              )}
            </div>
            <div style={selectedTeamRow}>
              <p style={{ ...teamLabel, color: "var(--accent)" }}>팀 B ({selectedTeamB.length}/2)</p>
              {teamBKey && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-secondary)", fontWeight: 700 }}>
                  팀 전적: 이벤트 {teamBRecord.eventWins}승/{teamBRecord.eventGames}전 · 총 {teamBRecord.overallWins}승/{teamBRecord.overallGames}전
                </p>
              )}
              {selectedTeamB.length === 0 ? (
                <p style={teamMembersText}>-</p>
              ) : (
                selectedTeamB.map((m) => {
                  const stat = memberStats.find((s) => s.userId === m.userId);
                  return (
                    <p key={m.userId} style={{ margin: 0, fontSize: 12, color: "var(--ink)" }}>
                      {displayName(m.nickname, m.gender, m.nationalGrade)}
                      {stat && ` · 이벤트 ${stat.winCount}승/${stat.finishedGameCount}전 · 총 ${stat.overallWinCount}승/${stat.overallFinishedGameCount}전`}
                    </p>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>자동 추천</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {([["MALE_DOUBLES", "남복"], ["FEMALE_DOUBLES", "여복"], ["MIXED_DOUBLES", "혼복"], ["FREE", "자유"]] as [GameType, string][])
              .map(([t, label]) => (
                <button key={t} onClick={() => { void handleRecommend(t); }} style={chipBtn}>{label}</button>
              ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>멤버 선택 (팀당 2명)</h2>
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {activeMembers.map((m) => {
              const inA = teamA.includes(m.userId);
              const inB = teamB.includes(m.userId);
              const stat = memberStats.find((s) => s.userId === m.userId);
              return (
                <div
                  key={m.userId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: inA ? "rgba(108,92,231,0.08)" : inB ? "rgba(0,206,201,0.08)" : "var(--surface-3)",
                  }}
                >
                  <div>
                    <Link href={`/users/${m.userId}/record`} style={{ color: "var(--ink)", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                      {displayName(m.nickname, m.gender, m.nationalGrade)}
                    </Link>
                    {stat && (
                      <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
                        이벤트 {stat.winCount}승/{stat.finishedGameCount}전 · 총 {stat.overallWinCount}승/{stat.overallFinishedGameCount}전
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => togglePlayer(m.userId, "A")} style={{ ...pickBtn, background: inA ? "var(--brand)" : "var(--surface-2)", color: inA ? "#fff" : "var(--muted)" }}>A</button>
                    <button onClick={() => togglePlayer(m.userId, "B")} style={{ ...pickBtn, background: inB ? "var(--accent)" : "var(--surface-2)", color: inB ? "#fff" : "var(--muted)" }}>B</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        {!isMember && <p style={{ margin: 0, color: "var(--danger)", fontSize: 13 }}>활성 멤버만 게임 생성/제안을 할 수 있습니다.</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={!isMember || teamA.length !== 2 || teamB.length !== 2 || submitting}
            style={{ ...actionBtn, ...actionPrimary, opacity: isMember && teamA.length === 2 && teamB.length === 2 && !submitting ? 1 : 0.45 }}
          >
            {submitting ? "처리 중..." : effectiveMode === "CREATE" ? "생성하기" : "제안하기"}
          </button>
          <Link href={`/groups/${group.id}?view=games`} style={{ ...actionBtn, ...actionSecondary, textDecoration: "none" }}>
            취소
          </Link>
        </div>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 40px" };
const sec: CSSProperties = { maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { padding: "16px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid" };
const sh: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
const selectedTeamRow: CSSProperties = { borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "10px 12px", display: "grid", gap: 4 };
const teamLabel: CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800 };
const teamMembersText: CSSProperties = { margin: 0, fontSize: 13, color: "var(--ink)", fontWeight: 700 };
const chipBtn: CSSProperties = { border: 0, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--surface-2)", color: "var(--ink-secondary)" };
const pickBtn: CSSProperties = { border: 0, borderRadius: 999, minWidth: 34, height: 28, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const actionBtn: CSSProperties = { flex: 1, minHeight: 40, borderRadius: "var(--radius-sm)", border: 0, fontWeight: 700, fontSize: 14, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const actionPrimary: CSSProperties = { background: "var(--brand)", color: "#fff", cursor: "pointer" };
const actionSecondary: CSSProperties = { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-2)" };
const modeBtn: CSSProperties = { border: 0, borderRadius: 999, height: 30, padding: "0 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const modeBtnOn: CSSProperties = { background: "var(--brand)", color: "#fff" };
const modeBtnOff: CSSProperties = { background: "var(--surface-2)", color: "var(--ink-secondary)" };
