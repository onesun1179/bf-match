"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  fetchMe,
  fetchWithMeRecord,
  getAccessToken,
  refreshAccessToken,
  type MeResponse,
  type WithMeBucket,
  type WithMeRecord,
} from "@/lib/auth";
import { UserNameActions } from "@/components/user-name-actions";
import { GamePreviewDialog, type PreviewGame } from "@/components/game-preview-dialog";

type MatchEventSummary = {
  groupId: number;
  groupName: string;
  games: number;
  partnerGames: number;
  opponentGames: number;
  wins: number;
  losses: number;
  latestAt: number;
};

function recentForm(bucket: WithMeBucket, size = 10): { wins: number; games: number; sequence: string } {
  const recent = bucket.recentGames.slice(0, size);
  const wins = recent.filter((g) => g.isWin).length;
  const sequence = recent.map((g) => (g.isWin ? "승" : "패")).join(" ");
  return { wins, games: recent.length, sequence: sequence || "-" };
}

function mergeEventSummary(partner: WithMeBucket, opponent: WithMeBucket): MatchEventSummary[] {
  const map = new Map<number, MatchEventSummary>();
  const fill = (games: WithMeBucket["recentGames"], side: "partner" | "opponent") => {
    games.forEach((g) => {
      const prev = map.get(g.groupId);
      const ts = g.finishedAt ? new Date(g.finishedAt).getTime() : 0;
      if (!prev) {
        map.set(g.groupId, {
          groupId: g.groupId,
          groupName: g.groupName,
          games: 1,
          partnerGames: side === "partner" ? 1 : 0,
          opponentGames: side === "opponent" ? 1 : 0,
          wins: g.isWin ? 1 : 0,
          losses: g.isWin ? 0 : 1,
          latestAt: ts,
        });
        return;
      }
      prev.games += 1;
      if (side === "partner") prev.partnerGames += 1;
      else prev.opponentGames += 1;
      if (g.isWin) prev.wins += 1;
      else prev.losses += 1;
      if (ts > prev.latestAt) prev.latestAt = ts;
    });
  };
  fill(partner.recentGames, "partner");
  fill(opponent.recentGames, "opponent");
  return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt || b.games - a.games);
}

function BucketSection({
  title,
  bucket,
  me,
  onOpen,
}: {
  title: string;
  bucket: WithMeBucket;
  me: MeResponse | null;
  onOpen: (g: PreviewGame) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(5);
  const visible = useMemo(() => bucket.recentGames.slice(0, visibleCount), [bucket.recentGames, visibleCount]);

  return (
    <section style={card}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
      <p style={{ margin: "6px 0 0", color: "var(--ink-secondary)", fontSize: 13 }}>
        {bucket.wins}승 {bucket.losses}패 / {bucket.games}전 · 승률 {bucket.winRate.toFixed(1)}%
      </p>

      {bucket.recentGames.length === 0 ? (
        <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13 }}>최근 경기 없음</p>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {visible.map((g) => (
            <div key={g.gameId} role="button" tabIndex={0} onClick={() => onOpen(g)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(g); }} style={{ ...gameRow, cursor: "pointer" }}>
              {(() => {
                const myTeamKey = g.teammates.length === 1 && me?.id ? [g.teammates[0].userId, me.id].sort((a, b) => a - b).join("-") : null;
                const opponentTeamKey = g.opponents.length === 2 ? g.opponents.map((p) => p.userId).sort((a, b) => a - b).join("-") : null;
              return (
                <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {g.isWin ? "승" : "패"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                <Link href={`/groups/${g.groupId}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--brand-light)", fontWeight: 700, textDecoration: "none" }}>{g.groupName}</Link>
                {" · "}
                {g.finishedAt ? new Date(g.finishedAt).toLocaleString("ko-KR") : "-"}
              </p>
              {g.teammates.length > 0 && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
                  파트너: {myTeamKey && <Link href={`/groups/${g.groupId}/teams/${myTeamKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink-secondary)", fontWeight: 700, marginRight: 4 }}>팀 기록</Link>}{g.teammates.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}
                </p>
              )}
              {g.opponents.length > 0 && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  상대: {opponentTeamKey && <Link href={`/groups/${g.groupId}/teams/${opponentTeamKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--muted)", fontWeight: 700, marginRight: 4 }}>팀 기록</Link>}{g.opponents.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}
                </p>
              )}
                  </>
                );
              })()}
            </div>
          ))}
          {bucket.recentGames.length > visibleCount && (
            <button onClick={() => setVisibleCount((prev) => prev + 5)} style={moreBtn}>
              더보기
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default function WithMeRecordPage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const [data, setData] = useState<WithMeRecord | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGame, setSelectedGame] = useState<PreviewGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [meData, d] = await Promise.all([fetchMe(), fetchWithMeRecord(userId)]);
        setMe(meData);
        setData(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "나와의 전적을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <main style={main}><p style={muted}>불러오는 중...</p></main>;
  if (error || !data) return <main style={main}><p style={{ ...muted, color: "var(--danger)" }}>{error ?? "데이터가 없습니다."}</p></main>;

  const partnerForm = recentForm(data.partner, 10);
  const opponentForm = recentForm(data.opponent, 10);
  const eventSummaries = mergeEventSummary(data.partner, data.opponent).slice(0, 5);
  const totalGames = data.partner.games + data.opponent.games;
  const totalWins = data.partner.wins + data.opponent.wins;
  const totalRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
  const synergyGap = data.partner.winRate - data.opponent.winRate;

  return (
    <main style={main}>
      <section style={sec}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>HEAD TO HEAD</p>
          <div style={{ marginTop: 6 }}>
            <UserNameActions
              userId={data.targetUserId}
              nickname={data.targetNickname}
              gender={data.targetGender}
              grade={data.targetNationalGrade}
              myUserId={me?.id}
              style={{ fontSize: 24, fontWeight: 800 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Link href={`/users/${data.targetUserId}/record`} style={linkBtn}>개인 기록</Link>
            <Link href="/ranking" style={linkBtn}>랭킹</Link>
          </div>
        </div>

        <section style={card}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>상성 요약</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            <MiniStat title="전체" value={`${totalGames}전`} />
            <MiniStat title="통합 승률" value={`${totalRate.toFixed(0)}%`} />
            <MiniStat title="파트너 승률" value={`${data.partner.winRate.toFixed(0)}%`} />
            <MiniStat title="상대 승률" value={`${data.opponent.winRate.toFixed(0)}%`} />
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: synergyGap >= 0 ? "var(--accent)" : "var(--danger)" }}>
            상성 지수 {synergyGap >= 0 ? "+" : ""}{synergyGap.toFixed(1)}p (파트너 승률 - 상대 승률)
          </p>
        </section>

        <section style={card}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>최근 흐름</h2>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={flowRow}>
              <p style={flowTitle}>파트너 최근 10</p>
              <p style={flowMeta}>{partnerForm.wins}승 {Math.max(partnerForm.games - partnerForm.wins, 0)}패</p>
              <p style={flowSeq}>{partnerForm.sequence}</p>
            </div>
            <div style={flowRow}>
              <p style={flowTitle}>상대 최근 10</p>
              <p style={flowMeta}>{opponentForm.wins}승 {Math.max(opponentForm.games - opponentForm.wins, 0)}패</p>
              <p style={flowSeq}>{opponentForm.sequence}</p>
            </div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>함께 뛴 이벤트</h2>
          {eventSummaries.length === 0 ? (
            <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13 }}>최근 경기 없음</p>
          ) : (
            <div style={{ marginTop: 8, display: "grid" }}>
              {eventSummaries.map((row) => (
                <div key={row.groupId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/groups/${row.groupId}`} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>{row.groupName}</Link>
                    <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>
                      파트너 {row.partnerGames} · 상대 {row.opponentGames} · {row.wins}승 {row.losses}패
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-secondary)" }}>{row.games}전</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <BucketSection title="파트너일 때" bucket={data.partner} me={me} onOpen={setSelectedGame} />
        <BucketSection title="상대일 때" bucket={data.opponent} me={me} onOpen={setSelectedGame} />
      </section>
      <GamePreviewDialog
        open={selectedGame != null}
        game={selectedGame}
        meUserId={me?.id ?? null}
        meNickname={me?.nickname}
        meGender={me?.gender}
        meGrade={me?.skill?.nationalGrade}
        onClose={() => setSelectedGame(null)}
      />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 620, margin: "0 auto", display: "grid", gap: 12 };
const hero: CSSProperties = {
  border: "1px solid var(--glass-border)",
  background: "linear-gradient(135deg, rgba(91,140,255,0.22), rgba(24,210,182,0.08) 60%, rgba(255,255,255,0.02)), var(--glass)",
  borderRadius: "var(--radius-lg)",
  padding: "18px 20px",
  boxShadow: "var(--shadow)",
};
const card: CSSProperties = {
  border: "1px solid var(--glass-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 18px",
  boxShadow: "var(--shadow)",
};
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
const gameRow: CSSProperties = {
  border: "1px solid var(--line)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.00)), var(--surface-2)",
  borderRadius: 12,
  padding: "10px 12px",
};
const moreBtn: CSSProperties = { border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const linkBtn: CSSProperties = { textDecoration: "none", color: "var(--brand-light)", fontWeight: 700, fontSize: 13 };
const flowRow: CSSProperties = { border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 10, padding: "8px 10px" };
const flowTitle: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 700 };
const flowMeta: CSSProperties = { margin: "2px 0 0", fontSize: 12, color: "var(--ink-secondary)" };
const flowSeq: CSSProperties = { margin: "3px 0 0", fontSize: 12, color: "var(--muted)" };

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ borderRadius: 10, background: "var(--surface-2)", padding: "10px 8px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
