"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  displayName,
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
                {g.isWin ? "승" : "패"} · {g.teamAScore ?? "-"} : {g.teamBScore ?? "-"}
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

  return (
    <main style={main}>
      <section style={sec}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>HEAD TO HEAD</p>
          <h1 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800 }}>
            {displayName(data.targetNickname, data.targetGender, data.targetNationalGrade)}
          </h1>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Link href={`/users/${data.targetUserId}/record`} style={linkBtn}>개인 기록</Link>
            <Link href="/ranking" style={linkBtn}>랭킹</Link>
          </div>
        </div>

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
