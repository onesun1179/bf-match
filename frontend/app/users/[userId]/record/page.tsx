"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import { fetchUserRecord, getAccessToken, refreshAccessToken, type MyRecord, type RecentGame, type TypeStat } from "@/lib/auth";
import { UserNameActions } from "@/components/user-name-actions";

type EventSummary = {
  groupId: number;
  groupName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  latestAt: number;
};

function buildRecentEventSummaries(games: RecentGame[]): EventSummary[] {
  const map = new Map<number, EventSummary>();
  games.forEach((g) => {
    const prev = map.get(g.groupId);
    const finishedTs = g.finishedAt ? new Date(g.finishedAt).getTime() : 0;
    if (!prev) {
      map.set(g.groupId, {
        groupId: g.groupId,
        groupName: g.groupName,
        games: 1,
        wins: g.isWin ? 1 : 0,
        losses: g.isWin ? 0 : 1,
        winRate: 0,
        latestAt: finishedTs,
      });
      return;
    }
    prev.games += 1;
    if (g.isWin) prev.wins += 1;
    else prev.losses += 1;
    if (finishedTs > prev.latestAt) prev.latestAt = finishedTs;
  });
  return Array.from(map.values())
    .map((row) => ({ ...row, winRate: row.games > 0 ? (row.wins / row.games) * 100 : 0 }))
    .sort((a, b) => b.latestAt - a.latestAt || b.games - a.games || a.groupName.localeCompare(b.groupName, "ko"));
}

function getMainType(data: MyRecord): { label: string; stat: TypeStat } | null {
  const pairs: Array<{ label: string; stat: TypeStat }> = [
    { label: "남복", stat: data.maleDoubles },
    { label: "여복", stat: data.femaleDoubles },
    { label: "혼복", stat: data.mixedDoubles },
    { label: "자유", stat: data.freeGame },
  ];
  const sorted = pairs
    .filter((x) => x.stat.games > 0)
    .sort((a, b) => b.stat.games - a.stat.games || b.stat.winRate - a.stat.winRate);
  return sorted[0] ?? null;
}

function recentResultSequence(games: RecentGame[], size = 10): string {
  const recent = games.slice(0, size);
  if (recent.length === 0) return "-";
  return recent.map((g) => (g.isWin ? "승" : "패")).join(" ");
}

export default function UserRecordPage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const [data, setData] = useState<MyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        setData(await fetchUserRecord(userId));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <main style={main}><p style={muted}>불러오는 중...</p></main>;
  if (!data) return <main style={main}><p style={muted}>기록을 불러오지 못했습니다.</p></main>;

  const recentEventSummaries = buildRecentEventSummaries(data.recentGames).slice(0, 5);
  const recentTenGames = data.recentGames.slice(0, 10);
  const recentTenWins = recentTenGames.filter((g) => g.isWin).length;
  const recentTenRate = recentTenGames.length > 0 ? (recentTenWins / recentTenGames.length) * 100 : 0;
  const mainType = getMainType(data);
  const activeEventCount = new Set(data.recentGames.map((g) => g.groupId)).size;
  const recentAvgScoreGap =
    recentTenGames.filter((g) => g.teamAScore != null && g.teamBScore != null).length > 0
      ? recentTenGames
          .filter((g) => g.teamAScore != null && g.teamBScore != null)
          .reduce((sum, g) => {
            const a = g.teamAScore ?? 0;
            const b = g.teamBScore ?? 0;
            const diff = g.myTeam === "A" ? a - b : b - a;
            return sum + diff;
          }, 0) /
        recentTenGames.filter((g) => g.teamAScore != null && g.teamBScore != null).length
      : 0;
  const recentSeq = recentResultSequence(data.recentGames, 10);

  return (
    <main style={main}>
      <section style={sec}>
        <Link href="/groups/list" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 목록</Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>사용자 기록</h1>

        <div style={card}>
          <UserNameActions
            userId={userId}
            nickname={data.nickname}
            gender={data.gender}
            grade={data.nationalGrade}
            lv={data.lv}
            style={{ margin: 0, fontWeight: 700, fontSize: 18 }}
          />
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>LV {data.lv} / 경험치 {data.exp.toFixed(1)}%</p>
        </div>

        <div style={card}>
          <h2 style={sh}>전체 전적</h2>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "12px 0" }}>
            <Stat value={`${data.totalWinRate.toFixed(0)}%`} label="승률" color="var(--brand-light)" />
            <Stat value={`${data.totalGames}`} label="전체" />
            <Stat value={`${data.totalWins}`} label="승" color="var(--accent)" />
            <Stat value={`${data.totalLosses}`} label="패" color="var(--danger)" />
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>핵심 지표</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
            <TypeCard
              label="최근 10경기"
              stat={{
                games: recentTenGames.length,
                wins: recentTenWins,
                losses: Math.max(recentTenGames.length - recentTenWins, 0),
                winRate: recentTenRate,
              }}
            />
            <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink-secondary)" }}>주력 타입</p>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800 }}>{mainType?.label ?? "-"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                {mainType ? `${mainType.stat.games}전 / ${mainType.stat.winRate.toFixed(0)}%` : "기록 없음"}
              </p>
            </div>
            <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink-secondary)" }}>참여 이벤트</p>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800 }}>{activeEventCount}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>최근 이벤트 기준</p>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
            최근 흐름 {recentSeq} · 평균 득실 {recentAvgScoreGap >= 0 ? "+" : ""}{recentAvgScoreGap.toFixed(1)}
          </p>
        </div>

        <div style={card}>
          <h2 style={sh}>최근 이벤트</h2>
          {recentEventSummaries.length === 0 ? (
            <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>데이터가 부족합니다</p>
          ) : (
            recentEventSummaries.map((row) => (
              <div key={row.groupId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ minWidth: 0 }}>
                  <Link href={`/groups/${row.groupId}`} style={{ color: "var(--ink)", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                    {row.groupName}
                  </Link>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>{row.wins}승 {row.losses}패 / {row.games}전</p>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--brand-light)" }}>{row.winRate.toFixed(0)}%</p>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>타입별 전적</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <TypeCard label="남복" stat={data.maleDoubles} />
            <TypeCard label="여복" stat={data.femaleDoubles} />
            <TypeCard label="혼복" stat={data.mixedDoubles} />
            <TypeCard label="자유" stat={data.freeGame} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return <div><p style={{ margin: 0, fontSize: 28, fontWeight: 800, color }}>{value}</p><p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12 }}>{label}</p></div>;
}

function TypeCard({ label, stat }: { label: string; stat: TypeStat }) {
  return (
    <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink-secondary)" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800 }}>{stat.games > 0 ? `${stat.winRate.toFixed(0)}%` : "-"}</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>{stat.wins}승 {stat.losses}패 / {stat.games}전</p>
    </div>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 40px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { padding: "18px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)" };
const sh: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
