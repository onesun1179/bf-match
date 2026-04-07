"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { fetchMe, fetchMyRecord, getAccessToken, refreshAccessToken, type MeResponse, type MyRecord, type PartnerStat, type RecentGame, type TypeStat } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";
import { UserNameActions } from "@/components/user-name-actions";
import { UserInfoChip } from "@/components/user-info-chip";
import { GamePreviewDialog, type PreviewGame } from "@/components/game-preview-dialog";

function gameTypeLabel(t: string | null) {
  switch (t) { case "MALE_DOUBLES": return "남복"; case "FEMALE_DOUBLES": return "여복"; case "MIXED_DOUBLES": return "혼복"; case "FREE": return "자유"; default: return "-"; }
}

function PartnerRow({ p, color }: { p: PartnerStat; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <UserNameActions userId={p.userId} nickname={p.nickname} gender={p.gender} grade={p.nationalGrade} style={{ fontSize: 14 }} />
      <span style={{ fontSize: 13, color }}>{p.wins}승 {p.games}전 ({p.winRate.toFixed(0)}%)</span>
    </div>
  );
}

function GameRow({ g, me, onOpen }: { g: RecentGame; me: MeResponse | null; onOpen: (game: PreviewGame) => void }) {
  const teammateKey = g.teammates.length === 1 && me?.id ? [g.teammates[0].userId, me.id].sort((a, b) => a - b).join("-") : null;
  const opponentKey = g.opponents.length === 2 ? g.opponents.map((p) => p.userId).sort((a, b) => a - b).join("-") : null;
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(g)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(g); }} style={{ ...gameBtn, borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: g.isWin ? "var(--accent)" : "var(--danger)" }}>{g.isWin ? "승" : "패"}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{gameTypeLabel(g.gameType)}</span>
            {g.gradeAtTime && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-secondary)" }}>{g.gradeAtTime}</span>}
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>
            <Link href={`/groups/${g.groupId}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 700 }}>
              {g.groupName}
            </Link>
          </p>
          {g.teammates.length > 0 && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
              파트너:
              {" "}
              {teammateKey ? <Link href={`/groups/${g.groupId}/teams/${teammateKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink-secondary)", fontWeight: 700 }}>팀 기록</Link> : null}
              {" "}
              {g.teammates.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}
            </p>
          )}
          {g.opponents.length > 0 && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
              상대:
              {" "}
              {opponentKey ? <Link href={`/groups/${g.groupId}/teams/${opponentKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--muted)", fontWeight: 700 }}>팀 기록</Link> : null}
              {" "}
              {g.opponents.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {g.teamAScore != null && <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{g.teamAScore} : {g.teamBScore}</p>}
          {g.finishedAt && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{new Date(g.finishedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</p>}
        </div>
      </div>
    </div>
  );
}

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

export default function MyRecordPage() {
  const [data, setData] = useState<MyRecord | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGame, setSelectedGame] = useState<PreviewGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [meData, recordData] = await Promise.all([fetchMe(), fetchMyRecord()]);
        setMe(meData);
        setData(recordData);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <main style={main}><p style={{ color: "var(--muted)", textAlign: "center", padding: 60 }}>불러오는 중...</p></main>;
  if (!data) return <main style={main}><p style={{ color: "var(--muted)", textAlign: "center", padding: 60 }}>기록 없음</p></main>;

  const recentEventSummaries = buildRecentEventSummaries(data.recentGames).slice(0, 5);
  const recentTenGames = data.recentGames.slice(0, 10);
  const recentTenWins = recentTenGames.filter((g) => g.isWin).length;
  const recentTenRate = recentTenGames.length > 0 ? (recentTenWins / recentTenGames.length) * 100 : 0;
  const mainType = getMainType(data);
  const activeEventCount = new Set(data.recentGames.map((g) => g.groupId)).size;
  const latestPlayedAt = data.recentGames
    .map((g) => (g.finishedAt ? new Date(g.finishedAt).getTime() : 0))
    .reduce((max, v) => (v > max ? v : max), 0);
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
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>MY PERFORMANCE</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>내 기록</h1>
        </div>

        {/* Profile */}
        <div style={card}>
          {me ? (
            <UserNameActions
              userId={me.id}
              nickname={data.nickname}
              gender={data.gender}
              grade={data.nationalGrade}
              lv={data.lv}
              myUserId={me.id}
              style={{ margin: 0, fontWeight: 700, fontSize: 18 }}
            />
          ) : (
            <UserInfoChip nickname={data.nickname} gender={data.gender} grade={data.nationalGrade} lv={data.lv} style={{ margin: 0, fontWeight: 700, fontSize: 18 }} />
          )}
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>LV {data.lv} / 경험치 {data.exp.toFixed(1)}%</p>
        </div>

        {/* Overall */}
        <div style={card}>
          <h2 style={sh}>전체 전적</h2>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "12px 0" }}>
            <Stat value={`${data.totalWinRate.toFixed(0)}%`} label="승률" color="var(--brand-light)" />
            <Stat value={`${data.totalGames}`} label="전체" />
            <Stat value={`${data.totalWins}`} label="승" color="var(--accent)" />
            <Stat value={`${data.totalLosses}`} label="패" color="var(--danger)" />
          </div>
          {data.currentStreak > 0 && (
            <p style={{ margin: 0, textAlign: "center", fontSize: 14, fontWeight: 700, color: data.currentStreakType === "WIN" ? "var(--accent)" : "var(--danger)" }}>
              현재 {data.currentStreak}{data.currentStreakType === "WIN" ? "연승" : "연패"} 중
            </p>
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>핵심 지표</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
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
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                {latestPlayedAt > 0
                  ? `최근 ${new Date(latestPlayedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`
                  : "최근 기록 없음"}
              </p>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
            최근 흐름 {recentSeq} · 평균 득실 {recentAvgScoreGap >= 0 ? "+" : ""}{recentAvgScoreGap.toFixed(1)}
          </p>
        </div>

        <div style={card}>
          <h2 style={sh}>최근 이벤트</h2>
          {recentEventSummaries.length === 0 ? (
            <Empty />
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

        {/* Game Type */}
        <div style={card}>
          <h2 style={sh}>타입별</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <TypeCard label="남복" stat={data.maleDoubles} />
            <TypeCard label="여복" stat={data.femaleDoubles} />
            <TypeCard label="혼복" stat={data.mixedDoubles} />
            <TypeCard label="자유" stat={data.freeGame} />
          </div>
        </div>

        {/* Grade Stats */}
        {Object.keys(data.gradeStats).length > 0 && (
          <div style={card}>
            <h2 style={sh}>급수별 전적</h2>
            {Object.entries(data.gradeStats).sort((a, b) => b[0].localeCompare(a[0])).map(([grade, stat]) => (
              <div key={grade} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{grade}급</span>
                <span style={{ fontSize: 14, color: "var(--ink-secondary)" }}>{stat.wins}승 {stat.losses}패 ({stat.winRate.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        )}

        {/* Best Partners */}
        <Section title="베스트 파트너" moreHref="/my-record/best-partners">
          {data.topPartners.length === 0 ? <Empty /> : data.topPartners.slice(0, 3).map((p) => <PartnerRow key={p.userId} p={p} color="var(--ink-secondary)" />)}
        </Section>

        {/* Worst Partners */}
        <Section title="워스트 파트너" moreHref="/my-record/worst-partners">
          {data.worstPartners.length === 0 ? <Empty /> : data.worstPartners.slice(0, 3).map((p) => <PartnerRow key={p.userId} p={p} color="var(--danger)" />)}
        </Section>

        {/* Worst Opponents */}
        <Section title="워스트 상대" moreHref="/my-record/worst-opponents">
          {data.worstOpponents.length === 0 ? <Empty /> : data.worstOpponents.slice(0, 3).map((p) => <PartnerRow key={p.userId} p={p} color="var(--danger)" />)}
        </Section>

        {/* Monthly */}
        <Section title="월별 전적" moreHref="/my-record/monthly">
          {data.monthlyStats.length === 0 ? <Empty /> : data.monthlyStats.slice(0, 3).map((m) => (
            <div key={m.month} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{m.month}</span>
              <span style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{m.wins}승 {m.losses}패 / {m.games}전</span>
            </div>
          ))}
        </Section>

        {/* Recent Games */}
        <Section title="최근 경기" moreHref="/my-record/recent-games">
          {data.recentGames.length === 0 ? <Empty /> : data.recentGames.slice(0, 3).map((g) => <GameRow key={g.gameId} g={g} me={me} onOpen={setSelectedGame} />)}
        </Section>
      </section>

      <BottomNavMain active="my" />
      <GamePreviewDialog
        open={selectedGame != null}
        game={selectedGame}
        meUserId={me?.id ?? null}
        meNickname={data.nickname}
        meGender={data.gender}
        meGrade={data.nationalGrade}
        onClose={() => setSelectedGame(null)}
      />
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

function Section({ title, moreHref, children }: { title: string; moreHref: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={sh}>{title}</h2>
        <Link href={moreHref} style={{ fontSize: 13, color: "var(--brand-light)", fontWeight: 700 }}>더보기</Link>
      </div>
      {children}
    </div>
  );
}

function Empty() { return <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13 }}>데이터가 부족합니다</p>; }

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 620, margin: "0 auto", display: "grid", gap: 12 };
const hero: CSSProperties = {
  padding: "18px 20px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, rgba(91,140,255,0.22), rgba(24,210,182,0.08) 60%, rgba(255,255,255,0.02)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const card: CSSProperties = {
  padding: "18px 20px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const sh: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink-secondary)" };
const gameBtn: CSSProperties = { width: "100%", border: 0, background: "transparent", padding: "10px 0", textAlign: "left", color: "inherit", cursor: "pointer" };
