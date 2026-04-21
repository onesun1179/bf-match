"use client";

import Link from "next/link";
import {CSSProperties, useEffect, useState} from "react";
import {
    fetchAllRecentGames,
    fetchMe,
    getAccessToken,
    type MeResponse,
    type RecentGame,
    refreshAccessToken
} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";
import {UserNameActions} from "@/components/user-name-actions";
import {GamePreviewDialog, type PreviewGame} from "@/components/game-preview-dialog";

function gameTypeLabel(t: string | null) {
  switch (t) { case "MALE_DOUBLES": return "남복"; case "FEMALE_DOUBLES": return "여복"; case "MIXED_DOUBLES": return "혼복"; case "FREE": return "자유"; default: return "-"; }
}

export default function RecentGamesPage() {
  const [list, setList] = useState<RecentGame[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGame, setSelectedGame] = useState<PreviewGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [meData, games] = await Promise.all([fetchMe(), fetchAllRecentGames()]);
        setMe(meData);
        setList(games);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <main style={main}>
      <section style={sec}>
        <div style={hero}>
          <Link href="/my-record" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 내 기록</Link>
          <p style={{ margin: "10px 0 0", color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>MATCH LOG</p>
          <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>최근 경기</h1>
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && list.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>경기 기록이 없습니다</p>
          </div>
        )}

        {list.map((g) => (
          <div key={g.gameId} style={card}>
            {(() => {
              const myTeamKey = g.teammates.length === 1 && me?.id ? [g.teammates[0].userId, me.id].sort((a, b) => a - b).join("-") : null;
              const opponentTeamKey = g.opponents.length === 2 ? g.opponents.map((p) => p.userId).sort((a, b) => a - b).join("-") : null;
              return (
            <div role="button" tabIndex={0} onClick={() => setSelectedGame(g)} onKeyDown={(e) => { if (e.key === "Enter") setSelectedGame(g); }} style={gameWrapBtn}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: g.isWin ? "var(--accent)" : "var(--danger)" }}>{g.isWin ? "승" : "패"}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{gameTypeLabel(g.gameType)}</span>
                  {g.gradeAtTime && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-secondary)" }}>{g.gradeAtTime}</span>}
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  <Link href={`/groups/${g.groupId}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 700 }}>{g.groupName}</Link>
                </p>
                {g.teammates.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>파트너: {myTeamKey && <Link href={`/groups/${g.groupId}/teams/${myTeamKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink-secondary)", fontWeight: 700, marginRight: 4 }}>팀 기록</Link>}{g.teammates.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}</p>}
                {g.opponents.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>상대: {opponentTeamKey && <Link href={`/groups/${g.groupId}/teams/${opponentTeamKey}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--muted)", fontWeight: 700, marginRight: 4 }}>팀 기록</Link>}{g.opponents.map((t, idx) => <span key={t.userId}>{idx > 0 ? ", " : ""}<UserNameActions userId={t.userId} nickname={t.nickname} gender={t.gender} grade={t.grade} myUserId={me?.id} style={{ fontSize: 12 }} /></span>)}</p>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {g.finishedAt && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{new Date(g.finishedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</p>}
              </div>
            </div>
            </div>
              );
            })()}
          </div>
        ))}
      </section>

      <BottomNavMain active="my" />
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
  padding: "18px 20px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, rgba(91,140,255,0.22), rgba(24,210,182,0.08) 60%, rgba(255,255,255,0.02)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const card: CSSProperties = {
  padding: "16px 18px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const gameWrapBtn: CSSProperties = { cursor: "pointer" };
