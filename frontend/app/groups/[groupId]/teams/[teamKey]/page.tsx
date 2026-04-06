"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { displayName, fetchGames, fetchTeamStats, getAccessToken, refreshAccessToken, type GameResponse, type Grade, type TeamStat } from "@/lib/auth";

export default function TeamRecordPage() {
  const params = useParams<{ groupId: string; teamKey: string }>();
  const groupId = Number(params.groupId);
  const teamKey = params.teamKey;
  const [games, setGames] = useState<GameResponse[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamIds = useMemo(() => {
    const [a, b] = teamKey.split("-").map((v) => Number(v));
    if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a === b) return null;
    return [Math.min(a, b), Math.max(a, b)] as const;
  }, [teamKey]);

  useEffect(() => {
    (async () => {
      if (!teamIds) {
        setError("잘못된 팀 정보입니다.");
        setLoading(false);
        return;
      }
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [gameData, teamStatData] = await Promise.all([fetchGames(groupId), fetchTeamStats(groupId)]);
        setGames(gameData);
        setTeamStats(teamStatData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "팀 기록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, teamIds]);

  const teamGames = useMemo(() => {
    if (!teamIds) return [] as { game: GameResponse; side: "A" | "B" }[];
    return games
      .map((g) => {
        const aIds = g.teamA.map((p) => p.userId).sort((x, y) => x - y);
        const bIds = g.teamB.map((p) => p.userId).sort((x, y) => x - y);
        if (aIds.length === 2 && aIds[0] === teamIds[0] && aIds[1] === teamIds[1]) return { game: g, side: "A" as const };
        if (bIds.length === 2 && bIds[0] === teamIds[0] && bIds[1] === teamIds[1]) return { game: g, side: "B" as const };
        return null;
      })
      .filter((v): v is { game: GameResponse; side: "A" | "B" } => v != null)
      .sort((x, y) => new Date(y.game.createdAt).getTime() - new Date(x.game.createdAt).getTime());
  }, [games, teamIds]);

  const finished = teamGames.filter(({ game }) => game.status === "FINISHED" && game.teamAScore != null && game.teamBScore != null);
  const wins = finished.filter(({ game, side }) => game.winnerTeam === side).length;
  const losses = Math.max(finished.length - wins, 0);
  const winRate = finished.length > 0 ? (wins / finished.length) * 100 : 0;
  const overall = teamStats.find((s) => s.teamKey === teamKey);

  const teamMembers = useMemo(() => {
    const first = teamGames[0];
    if (!first) return [];
    const gradePriority: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
    const players = (first.side === "A" ? first.game.teamA : first.game.teamB).slice();
    players.sort((a, b) => {
      const aGrade = a.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[a.nationalGrade];
      const bGrade = b.nationalGrade == null ? Number.MAX_SAFE_INTEGER : gradePriority[b.nationalGrade];
      if (aGrade !== bGrade) return aGrade - bGrade;

      const nicknameDiff = a.nickname.localeCompare(b.nickname, "ko");
      if (nicknameDiff !== 0) return nicknameDiff;

      return a.userId - b.userId;
    });
    return players;
  }, [teamGames]);
  const teamGrade = useMemo(() => {
    const gradePriority: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
    const grades = teamMembers.map((m) => m.nationalGrade).filter((g): g is Grade => g != null);
    if (grades.length === 0) return null;
    return grades.slice().sort((a, b) => gradePriority[a] - gradePriority[b])[0];
  }, [teamMembers]);

  if (loading) return <main style={main}><p style={muted}>불러오는 중...</p></main>;
  if (error) return <main style={main}><p style={{ ...muted, color: "var(--danger)" }}>{error}</p></main>;

  return (
    <main style={main}>
      <section style={sec}>
        <Link href={`/groups/${groupId}?view=games`} style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 게임으로</Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>팀 기록</h1>

        <div style={card}>
          {teamMembers.length > 0 ? (
            <>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{displayName(teamMembers[0].nickname, teamMembers[0].gender, teamMembers[0].nationalGrade)}</p>
              <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 16 }}>{displayName(teamMembers[1].nickname, teamMembers[1].gender, teamMembers[1].nationalGrade)}</p>
              {teamGrade && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-secondary)", fontWeight: 700 }}>팀 급수: {teamGrade}</p>}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>팀 구성 정보를 찾을 수 없습니다.</p>
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>전적 요약</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            <Stat title="승률" value={`${winRate.toFixed(0)}%`} />
            <Stat title="승" value={`${wins}`} />
            <Stat title="패" value={`${losses}`} />
            <Stat title="전" value={`${finished.length}`} />
          </div>
          {overall && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
              이벤트 {wins}승 {losses}패 / {finished.length}전 · 총 {overall.overallWins}승 {Math.max(overall.overallGames - overall.overallWins, 0)}패 / {overall.overallGames}전
            </p>
          )}
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--muted)" }}>점수가 확정된 종료 경기 기준</p>
        </div>

        <div style={card}>
          <h2 style={sh}>경기 기록</h2>
          {teamGames.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>기록이 없습니다.</p>}
          {teamGames.map(({ game, side }) => {
            const isFinished = game.status === "FINISHED" && game.teamAScore != null && game.teamBScore != null;
            const isWin = isFinished && game.winnerTeam === side;
            return (
              <div key={game.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isFinished ? (isWin ? "var(--accent)" : "var(--danger)") : "var(--ink-secondary)" }}>
                    {isFinished ? (isWin ? "승" : "패") : "미종료"} · 팀 {side}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                    {new Date(game.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
                  {isFinished ? `${game.teamAScore} : ${game.teamBScore}` : "점수 미확정"}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ borderRadius: 10, background: "var(--surface-2)", padding: "10px 8px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 40px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { padding: "18px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)" };
const sh: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
