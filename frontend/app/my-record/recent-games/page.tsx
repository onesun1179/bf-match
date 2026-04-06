"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { displayName, fetchAllRecentGames, getAccessToken, refreshAccessToken, type RecentGame } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";

function gameTypeLabel(t: string | null) {
  switch (t) { case "MALE_DOUBLES": return "남복"; case "FEMALE_DOUBLES": return "여복"; case "MIXED_DOUBLES": return "혼복"; case "FREE": return "자유"; default: return "-"; }
}

export default function RecentGamesPage() {
  const [list, setList] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        setList(await fetchAllRecentGames());
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <main style={main}>
      <section style={sec}>
        <Link href="/my-record" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 내 기록</Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>최근 경기</h1>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && list.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>경기 기록이 없습니다</p>
          </div>
        )}

        {list.map((g) => (
          <div key={g.gameId} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: g.isWin ? "var(--accent)" : "var(--danger)" }}>{g.isWin ? "승" : "패"}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{gameTypeLabel(g.gameType)}</span>
                  {g.gradeAtTime && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "var(--surface-3)", color: "var(--ink-secondary)" }}>{g.gradeAtTime}</span>}
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>{g.groupName}</p>
                {g.teammates.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>파트너: {g.teammates.map((t) => displayName(t.nickname, t.gender, t.grade)).join(", ")}</p>}
                {g.opponents.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>상대: {g.opponents.map((t) => displayName(t.nickname, t.gender, t.grade)).join(", ")}</p>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {g.teamAScore != null && <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{g.teamAScore} : {g.teamBScore}</p>}
                {g.finishedAt && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>{new Date(g.finishedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</p>}
              </div>
            </div>
          </div>
        ))}
      </section>

      <BottomNavMain active="my" />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 10 };
const card: CSSProperties = { padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)" };
