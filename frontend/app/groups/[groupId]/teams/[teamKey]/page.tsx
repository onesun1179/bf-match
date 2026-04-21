"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {CSSProperties, useEffect, useMemo, useState} from "react";
import {
    fetchGames,
    fetchTeamStats,
    type GameResponse,
    type GameType,
    getAccessToken,
    type Grade,
    refreshAccessToken,
    type TeamStat
} from "@/lib/auth";
import {UserNameActions} from "@/components/user-name-actions";

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

  const finished = teamGames.filter(({ game }) => game.status === "FINISHED" && game.winnerTeam != null);
  const wins = finished.filter(({ game, side }) => game.winnerTeam === side).length;
  const losses = Math.max(finished.length - wins, 0);
  const winRate = finished.length > 0 ? (wins / finished.length) * 100 : 0;
  const overall = teamStats.find((s) => s.teamKey === teamKey);
  const recentFinished = finished.slice(0, 10);
  const recentWins = recentFinished.filter(({ game, side }) => game.winnerTeam === side).length;
  const recentRate = recentFinished.length > 0 ? (recentWins / recentFinished.length) * 100 : 0;

  const byType = useMemo(() => {
    const typeMap = new Map<GameType | "UNKNOWN", { games: number; wins: number }>();
    finished.forEach(({ game, side }) => {
      const key = (game.gameType ?? "UNKNOWN") as GameType | "UNKNOWN";
      const prev = typeMap.get(key) ?? { games: 0, wins: 0 };
      prev.games += 1;
      if (game.winnerTeam === side) prev.wins += 1;
      typeMap.set(key, prev);
    });
    return Array.from(typeMap.entries())
      .map(([type, stat]) => ({
        type,
        label: typeLabel(type),
        games: stat.games,
        wins: stat.wins,
        losses: Math.max(stat.games - stat.wins, 0),
        winRate: stat.games > 0 ? (stat.wins / stat.games) * 100 : 0,
      }))
      .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.label.localeCompare(b.label, "ko"));
  }, [finished]);

  const opponentSummary = useMemo(() => {
    const map = new Map<string, { label: string; games: number; wins: number }>();
    finished.forEach(({ game, side }) => {
      const opponents = (side === "A" ? game.teamB : game.teamA).slice().sort((a, b) => a.userId - b.userId);
      if (opponents.length !== 2) return;
      const key = `${opponents[0].userId}-${opponents[1].userId}`;
      const label = `${opponents[0].nickname} / ${opponents[1].nickname}`;
      const prev = map.get(key) ?? { label, games: 0, wins: 0 };
      prev.games += 1;
      if (game.winnerTeam === side) prev.wins += 1;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .map((x) => ({ ...x, winRate: x.games > 0 ? (x.wins / x.games) * 100 : 0 }))
      .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.label.localeCompare(b.label, "ko"));
  }, [finished]);
  const topOpponent = opponentSummary[0] ?? null;

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
              <UserNameActions
                userId={teamMembers[0].userId}
                nickname={teamMembers[0].nickname}
                gender={teamMembers[0].gender}
                grade={teamMembers[0].nationalGrade}
                style={{ margin: 0, fontWeight: 700, fontSize: 16 }}
              />
              <div style={{ marginTop: 2 }}>
                <UserNameActions
                  userId={teamMembers[1].userId}
                  nickname={teamMembers[1].nickname}
                  gender={teamMembers[1].gender}
                  grade={teamMembers[1].nationalGrade}
                  style={{ margin: 0, fontWeight: 700, fontSize: 16 }}
                />
              </div>
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
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--muted)" }}>결과가 확정된 종료 경기 기준</p>
        </div>

        <div style={card}>
          <h2 style={sh}>핵심 지표</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            <Stat title="최근 10경기" value={recentFinished.length > 0 ? `${recentRate.toFixed(0)}%` : "-"} />
            <Stat title="총 경기" value={`${finished.length}`} />
            <Stat title="최다 매치업" value={topOpponent ? `${topOpponent.games}전` : "-"} />
          </div>
          {topOpponent && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
              {topOpponent.label} · {topOpponent.wins}승 {Math.max(topOpponent.games - topOpponent.wins, 0)}패
            </p>
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>타입별 전적</h2>
          {byType.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>기록이 없습니다.</p>}
          {byType.map((row) => (
            <div key={row.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{row.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>{row.wins}승 {row.losses}패 / {row.games}전</p>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--brand-light)" }}>{row.winRate.toFixed(0)}%</p>
            </div>
          ))}
        </div>

        <div style={card}>
          <h2 style={sh}>경기 기록</h2>
          {teamGames.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>기록이 없습니다.</p>}
          {teamGames.map(({ game, side }) => {
            const isFinished = game.status === "FINISHED" && game.winnerTeam != null;
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
                  {isFinished ? `팀 ${game.winnerTeam} 승` : "결과 미확정"}
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

function typeLabel(type: GameType | "UNKNOWN"): string {
  if (type === "MALE_DOUBLES") return "남복";
  if (type === "FEMALE_DOUBLES") return "여복";
  if (type === "MIXED_DOUBLES") return "혼복";
  if (type === "FREE") return "자유";
  return "기타";
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 40px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { padding: "18px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)" };
const sh: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
