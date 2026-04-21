"use client";

import Link from "next/link";
import {useParams, useRouter, useSearchParams} from "next/navigation";
import {CSSProperties, useEffect, useMemo, useState} from "react";
import {
    createGame,
    fetchGames,
    fetchGroupDetail,
    fetchMe,
    type GameResponse,
    type GameType,
    getAccessToken,
    type Grade,
    type GroupDetail,
    recommendGame,
    refreshAccessToken,
} from "@/lib/auth";
import {UserNameActions} from "@/components/user-name-actions";

export default function NewGamePage() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [games, setGames] = useState<GameResponse[]>([]);
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
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
        setMeId(me.id);
        if (!me.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }
        const [groupData, gameData] = await Promise.all([
          fetchGroupDetail(groupId),
          fetchGames(groupId),
        ]);
        setGroup(groupData);
        setGames(gameData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "게임 생성 화면을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, router]);

  const isOwnerOrManager = group?.myRole === "OWNER" || group?.myRole === "MANAGER";
  const isMember = group?.myRole != null && group?.myStatus === "ACTIVE";
  const isClosed = group?.closed === true;
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
  const gameFrequencyByUser = useMemo(() => {
    const map = new Map<number, number>();
    games
      .filter((g) => g.status !== "CANCELLED")
      .forEach((g) => {
        [...g.teamA, ...g.teamB].forEach((p) => {
          map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
        });
      });
    return map;
  }, [games]);

  const partnerPairCount = useMemo(() => {
    const map = new Map<string, number>();
    games
      .filter((g) => g.status !== "CANCELLED")
      .forEach((g) => {
        const teams = [g.teamA, g.teamB];
        teams.forEach((team) => {
          const ids = team.map((p) => p.userId).sort((a, b) => a - b);
          if (ids.length !== 2) return;
          const key = `${ids[0]}-${ids[1]}`;
          map.set(key, (map.get(key) ?? 0) + 1);
        });
      });
    return map;
  }, [games]);

  const opponentPairCount = useMemo(() => {
    const map = new Map<string, number>();
    games
      .filter((g) => g.status !== "CANCELLED")
      .forEach((g) => {
        const a = g.teamA.map((p) => p.userId);
        const b = g.teamB.map((p) => p.userId);
        a.forEach((aid) => {
          b.forEach((bid) => {
            const key = aid < bid ? `${aid}-${bid}` : `${bid}-${aid}`;
            map.set(key, (map.get(key) ?? 0) + 1);
          });
        });
      });
    return map;
  }, [games]);

  function pairKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  function formatSelectionStats(
    personal: number,
    partner: { nickname: string; count: number } | null,
    opponents: Array<{ nickname: string; count: number }>,
  ): string {
    const parts: string[] = [];
    if (personal > 0) parts.push(`${personal}회`);
    if (partner && partner.count > 0) parts.push(`파트너 ${partner.nickname} ${partner.count}`);
    if (opponents.length > 0) {
      parts.push(`상대 ${opponents.map((op) => `${op.nickname} ${op.count}`).join(", ")}`);
    }
    if (parts.length === 0) return "첫 매치";
    return parts.join(" · ");
  }
  function togglePlayer(userId: number, team: "A" | "B") {
    if (isClosed) return;
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
    if (!group || isClosed) return;
    try {
      const r = await recommendGame(group.id, type);
      setTeamA(r.teamAUserIds);
      setTeamB(r.teamBUserIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추천에 실패했습니다.");
    }
  }

  async function handleSubmit() {
    if (!group || !isMember || isClosed) return;
    if (teamA.length !== 2 || teamB.length !== 2) {
      setError("각 팀에 2명씩 선택하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createGame(group.id, teamA, teamB, effectiveMode === "PROPOSE");
      router.replace(`/groups/${group.id}?view=games`);
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
          <Link href={`/groups/${group.id}?view=games`} style={closeIconLink} aria-label="닫기">
            ×
          </Link>
          <Link href={`/groups/${group.id}?view=games`} style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 게임으로</Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {effectiveMode === "CREATE" ? "게임 생성" : "게임 제안"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: 13 }}>{group.name}</p>
          {isClosed && (
            <p style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>
              종료된 이벤트에서는 게임 생성/제안을 할 수 없습니다.
            </p>
          )}
          {isOwnerOrManager && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button
                disabled={isClosed}
                onClick={() => setMode("CREATE")}
                style={{ ...modeBtn, ...(effectiveMode === "CREATE" ? modeBtnOn : modeBtnOff), opacity: isClosed ? 0.45 : 1, cursor: isClosed ? "not-allowed" : "pointer" }}
              >
                생성
              </button>
              <button
                disabled={isClosed}
                onClick={() => setMode("PROPOSE")}
                style={{ ...modeBtn, ...(effectiveMode === "PROPOSE" ? modeBtnOn : modeBtnOff), opacity: isClosed ? 0.45 : 1, cursor: isClosed ? "not-allowed" : "pointer" }}
              >
                제안
              </button>
            </div>
          )}
        </div>

        <div style={stickyWrap}>
          <div style={card}>
            <h2 style={sh}>선택된 팀</h2>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <div style={selectedTeamRow}>
                <p style={{ ...teamLabel, color: "var(--brand-light)" }}>팀 A ({selectedTeamA.length}/2)</p>
                {selectedTeamA.length === 0 ? (
                  <p style={teamMembersText}>-</p>
                ) : (
                  selectedTeamA.map((m) => {
                    const partnerMember = selectedTeamA.find((member) => member.userId !== m.userId) ?? null;
                    const partnerInfo = partnerMember
                      ? {
                          nickname: partnerMember.nickname,
                          count: partnerPairCount.get(pairKey(m.userId, partnerMember.userId)) ?? 0,
                        }
                      : null;
                    const opponents = selectedTeamB
                      .map((op) => ({
                        nickname: op.nickname,
                        count: opponentPairCount.get(pairKey(m.userId, op.userId)) ?? 0,
                      }))
                      .filter((op) => op.count > 0);
                    const personalCount = gameFrequencyByUser.get(m.userId) ?? 0;
                    return (
                      <p key={m.userId} style={{ margin: 0, fontSize: 12, color: "var(--ink)" }}>
                        <UserNameActions
                          userId={m.userId}
                          nickname={m.nickname}
                          gender={m.gender}
                          grade={m.nationalGrade}
                          myUserId={meId}
                          style={{ fontSize: 12 }}
                        />
                        {` · ${formatSelectionStats(personalCount, partnerInfo, opponents)}`}
                      </p>
                    );
                  })
                )}
              </div>
              <div style={selectedTeamRow}>
                <p style={{ ...teamLabel, color: "var(--accent)" }}>팀 B ({selectedTeamB.length}/2)</p>
                {selectedTeamB.length === 0 ? (
                  <p style={teamMembersText}>-</p>
                ) : (
                  selectedTeamB.map((m) => {
                    const partnerMember = selectedTeamB.find((member) => member.userId !== m.userId) ?? null;
                    const partnerInfo = partnerMember
                      ? {
                          nickname: partnerMember.nickname,
                          count: partnerPairCount.get(pairKey(m.userId, partnerMember.userId)) ?? 0,
                        }
                      : null;
                    const opponents = selectedTeamA
                      .map((op) => ({
                        nickname: op.nickname,
                        count: opponentPairCount.get(pairKey(m.userId, op.userId)) ?? 0,
                      }))
                      .filter((op) => op.count > 0);
                    const personalCount = gameFrequencyByUser.get(m.userId) ?? 0;
                    return (
                      <p key={m.userId} style={{ margin: 0, fontSize: 12, color: "var(--ink)" }}>
                        <UserNameActions
                          userId={m.userId}
                          nickname={m.nickname}
                          gender={m.gender}
                          grade={m.nationalGrade}
                          myUserId={meId}
                          style={{ fontSize: 12 }}
                        />
                        {` · ${formatSelectionStats(personalCount, partnerInfo, opponents)}`}
                      </p>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={!isMember || isClosed || teamA.length !== 2 || teamB.length !== 2 || submitting}
            style={{ ...actionBtn, ...actionPrimary, opacity: isMember && !isClosed && teamA.length === 2 && teamB.length === 2 && !submitting ? 1 : 0.45 }}
          >
            {submitting ? "처리 중..." : effectiveMode === "CREATE" ? "생성하기" : "제안하기"}
          </button>
        </div>
        </div>

        <div style={card}>
          <h2 style={sh}>자동 추천</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {([["MALE_DOUBLES", "남복"], ["FEMALE_DOUBLES", "여복"], ["MIXED_DOUBLES", "혼복"], ["FREE", "자유"]] as [GameType, string][])
              .map(([t, label]) => (
                <button key={t} disabled={isClosed} onClick={() => { void handleRecommend(t); }} style={{ ...chipBtn, opacity: isClosed ? 0.45 : 1, cursor: isClosed ? "not-allowed" : "pointer" }}>{label}</button>
              ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>멤버 선택 (팀당 2명)</h2>
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {activeMembers.map((m) => {
              const inA = teamA.includes(m.userId);
              const inB = teamB.includes(m.userId);
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
                    <UserNameActions
                      userId={m.userId}
                      nickname={m.nickname}
                      gender={m.gender}
                      grade={m.nationalGrade}
                      myUserId={meId}
                      style={{ fontSize: 14, fontWeight: 700 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
                      {(gameFrequencyByUser.get(m.userId) ?? 0)}회
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      disabled={isClosed}
                      onClick={() => togglePlayer(m.userId, "A")}
                      style={{ ...pickBtn, background: inA ? "var(--brand)" : "var(--surface-2)", color: inA ? "#fff" : "var(--muted)", opacity: isClosed ? 0.45 : 1, cursor: isClosed ? "not-allowed" : "pointer" }}
                    >
                      A
                    </button>
                    <button
                      disabled={isClosed}
                      onClick={() => togglePlayer(m.userId, "B")}
                      style={{ ...pickBtn, background: inB ? "var(--accent)" : "var(--surface-2)", color: inB ? "#fff" : "var(--muted)", opacity: isClosed ? 0.45 : 1, cursor: isClosed ? "not-allowed" : "pointer" }}
                    >
                      B
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        {!isMember && <p style={{ margin: 0, color: "var(--danger)", fontSize: 13 }}>활성 멤버만 게임 생성/제안을 할 수 있습니다.</p>}
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 40px" };
const sec: CSSProperties = { maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { position: "relative", padding: "16px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid" };
const sh: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
const selectedTeamRow: CSSProperties = { borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "10px 12px", display: "grid", gap: 4 };
const teamLabel: CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800 };
const teamMembersText: CSSProperties = { margin: 0, fontSize: 13, color: "var(--ink)", fontWeight: 700 };
const stickyWrap: CSSProperties = {
  position: "sticky",
  top: 10,
  zIndex: 20,
  display: "grid",
  gap: 8,
  paddingBottom: 2,
  background: "linear-gradient(to bottom, rgba(8,10,20,0.95), rgba(8,10,20,0.82) 70%, rgba(8,10,20,0))",
  backdropFilter: "blur(6px)",
};
const chipBtn: CSSProperties = { border: 0, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--surface-2)", color: "var(--ink-secondary)" };
const pickBtn: CSSProperties = { border: 0, borderRadius: 999, minWidth: 34, height: 28, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const actionBtn: CSSProperties = { flex: 1, minHeight: 40, borderRadius: "var(--radius-sm)", border: 0, fontWeight: 700, fontSize: 14, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const actionPrimary: CSSProperties = { background: "var(--brand)", color: "#fff", cursor: "pointer" };
const modeBtn: CSSProperties = { border: 0, borderRadius: 999, height: 30, padding: "0 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const modeBtnOn: CSSProperties = { background: "var(--brand)", color: "#fff" };
const modeBtnOff: CSSProperties = { background: "var(--surface-2)", color: "var(--ink-secondary)" };
const closeIconLink: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 30,
  height: 30,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "var(--surface-2)",
  color: "var(--ink-secondary)",
  fontSize: 20,
  lineHeight: 1,
  border: "1px solid var(--line-2)",
};
