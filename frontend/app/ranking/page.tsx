"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import { fetchRanking, fetchTeamRanking, getAccessToken, refreshAccessToken, type Grade, type GradeRankingEntry, type RankingByGrade, type TeamRankingResponse } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";
import { UserNameActions } from "@/components/user-name-actions";

const GRADES: Grade[] = ["S", "A", "B", "C", "D", "E", "F"];
const TYPE_TABS = [
  { key: "ALL", label: "전체" },
  { key: "MALE_DOUBLES", label: "남복" },
  { key: "FEMALE_DOUBLES", label: "여복" },
  { key: "MIXED_DOUBLES", label: "혼복" },
  { key: "FREE", label: "자유" },
];

export default function RankingPage() {
  const router = useRouter();
  const [data, setData] = useState<RankingByGrade | null>(null);
  const [teamData, setTeamData] = useState<TeamRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"PERSONAL" | "TEAM">("PERSONAL");
  const [gradeTab, setGradeTab] = useState<Grade>("F");
  const [teamGradeTab, setTeamGradeTab] = useState<Grade>("F");
  const [teamTypeTab, setTeamTypeTab] = useState("ALL");
  const [typeTab, setTypeTab] = useState("ALL");
  const [personalVisibleCount, setPersonalVisibleCount] = useState(5);
  const [teamVisibleCount, setTeamVisibleCount] = useState(5);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [d, teamRanking] = await Promise.all([fetchRanking(), fetchTeamRanking()]);
        setData(d);
        setTeamData(teamRanking);
        const first = GRADES.find((g) => {
          const byType = d.grades[g];
          return byType && Object.values(byType).some((arr) => arr.length > 0);
        });
        if (first) setGradeTab(first);
        const firstTeamGrade = GRADES.find((g) => {
          const byType = teamRanking.grades[g];
          return byType && Object.values(byType).some((arr) => arr.length > 0);
        });
        if (firstTeamGrade) setTeamGradeTab(firstTeamGrade);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const entries: GradeRankingEntry[] = data?.grades[gradeTab]?.[typeTab] ?? [];
  const teamEntriesByGrade = teamData?.grades?.[teamGradeTab]?.[teamTypeTab] ?? [];
  const visiblePersonalEntries = entries.slice(0, personalVisibleCount);
  const visibleTeamEntries = teamEntriesByGrade.slice(0, teamVisibleCount);

  useEffect(() => {
    setPersonalVisibleCount(5);
  }, [gradeTab, typeTab]);

  useEffect(() => {
    if (mode === "PERSONAL") setPersonalVisibleCount(5);
    if (mode === "TEAM") setTeamVisibleCount(5);
  }, [mode]);

  useEffect(() => {
    setTeamVisibleCount(5);
  }, [teamGradeTab, teamTypeTab]);

  function medal(idx: number) {
    if (idx === 0) return "\u{1F947}";
    if (idx === 1) return "\u{1F948}";
    if (idx === 2) return "\u{1F949}";
    return `${idx + 1}`;
  }

  function gradeHasData(g: Grade): boolean {
    const byType = data?.grades[g];
    return !!byType && Object.values(byType).some((arr) => arr.length > 0);
  }

  return (
    <main style={main}>
      <section style={sec}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>BF MATCH RANKING</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>랭킹</h1>
        </div>

        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <button onClick={() => setMode("PERSONAL")} style={{
            flex: 1, padding: "8px 0", border: 0, borderRadius: "var(--radius-sm)",
            background: mode === "PERSONAL" ? "var(--brand)" : "transparent",
            color: mode === "PERSONAL" ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>개인 랭킹</button>
          <button onClick={() => setMode("TEAM")} style={{
            flex: 1, padding: "8px 0", border: 0, borderRadius: "var(--radius-sm)",
            background: mode === "TEAM" ? "var(--brand)" : "transparent",
            color: mode === "TEAM" ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>팀 랭킹</button>
        </div>

        {mode === "PERSONAL" && (
          <>
            {/* Grade Tabs */}
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)", overflowX: "auto" }}>
              {GRADES.map((g) => {
                const has = gradeHasData(g);
                return (
                  <button key={g} onClick={() => { setGradeTab(g); setTypeTab("ALL"); }} style={{
                    padding: "8px 12px", border: 0, borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
                    background: gradeTab === g ? "var(--brand)" : "transparent",
                    color: gradeTab === g ? "#fff" : has ? "var(--ink-secondary)" : "var(--muted)",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: has ? 1 : 0.4,
                  }}>{g}</button>
                );
              })}
            </div>

            {/* Type Tabs */}
            <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
              {TYPE_TABS.map((t) => {
                const has = (data?.grades[gradeTab]?.[t.key]?.length ?? 0) > 0;
                return (
                  <button key={t.key} onClick={() => setTypeTab(t.key)} style={{
                    padding: "6px 14px", border: 0, borderRadius: 999, whiteSpace: "nowrap",
                    background: typeTab === t.key ? "var(--accent)" : "var(--surface-3)",
                    color: typeTab === t.key ? "#fff" : has ? "var(--ink-secondary)" : "var(--muted)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: has ? 1 : 0.5,
                  }}>{t.label}</button>
                );
              })}
            </div>
          </>
        )}

        {mode === "TEAM" && (
          <>
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)", overflowX: "auto" }}>
              {GRADES.map((g) => {
                const byType = teamData?.grades?.[g];
                const has = !!byType && Object.values(byType).some((arr) => arr.length > 0);
                return (
                  <button key={g} onClick={() => { setTeamGradeTab(g); setTeamTypeTab("ALL"); }} style={{
                    padding: "8px 12px", border: 0, borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
                    background: teamGradeTab === g ? "var(--brand)" : "transparent",
                    color: teamGradeTab === g ? "#fff" : has ? "var(--ink-secondary)" : "var(--muted)",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: has ? 1 : 0.4,
                  }}>{g}</button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
              {TYPE_TABS.map((t) => {
                const has = (teamData?.grades?.[teamGradeTab]?.[t.key]?.length ?? 0) > 0;
                return (
                  <button key={`team-${t.key}`} onClick={() => setTeamTypeTab(t.key)} style={{
                    padding: "6px 14px", border: 0, borderRadius: 999, whiteSpace: "nowrap",
                    background: teamTypeTab === t.key ? "var(--accent)" : "var(--surface-3)",
                    color: teamTypeTab === t.key ? "#fff" : has ? "var(--ink-secondary)" : "var(--muted)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: has ? 1 : 0.5,
                  }}>{t.label}</button>
                );
              })}
            </div>
          </>
        )}

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && mode === "PERSONAL" && entries.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>해당 조건의 랭킹이 없습니다</p>
          </div>
        )}

        {!loading && mode === "TEAM" && teamEntriesByGrade.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>팀 랭킹 데이터가 없습니다</p>
          </div>
        )}

        {mode === "PERSONAL" && visiblePersonalEntries.map((r, idx) => (
          <div
            key={`${r.userId}`}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/users/${r.userId}/record`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/users/${r.userId}/record`);
              }
            }}
            style={{ ...card, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
          >
            <div style={{ width: 36, textAlign: "center", fontSize: idx < 3 ? 24 : 16, fontWeight: 800, color: idx < 3 ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
              {medal(idx)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserNameActions userId={r.userId} nickname={r.nickname} gender={r.gender} grade={r.grade} lv={r.lv} style={{ fontWeight: 700, fontSize: 15 }} />
                {r.currentGrade !== r.grade && (
                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "rgba(108,92,231,0.15)", color: "var(--brand-light)" }}>현재 {r.currentGrade}</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--brand-light)" }}>{r.winRate.toFixed(1)}%</p>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>{r.winCount}승 {r.gameCount}전</p>
            </div>
          </div>
        ))}

        {mode === "PERSONAL" && entries.length > personalVisibleCount && (
          <button
            onClick={() => setPersonalVisibleCount((prev) => prev + 5)}
            style={{ border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            더보기
          </button>
        )}

        {mode === "TEAM" && visibleTeamEntries.map((r, idx) => (
          <div
            key={r.teamKey}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/teams/${encodeURIComponent(r.teamKey)}/record`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/teams/${encodeURIComponent(r.teamKey)}/record`);
              }
            }}
            style={{ ...card, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
          >
            <div style={{ width: 36, textAlign: "center", fontSize: idx < 3 ? 24 : 16, fontWeight: 800, color: idx < 3 ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
              {medal(idx)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "grid", gap: 6 }}>
                {r.members.map((m) => (
                  <div key={m.userId} style={teamMemberRow}>
                    <UserNameActions
                      userId={m.userId}
                      nickname={m.nickname}
                      gender={m.gender}
                      grade={m.grade}
                      style={teamMemberName}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--brand-light)" }}>{r.winRate.toFixed(1)}%</p>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>{r.winCount}승 {r.gameCount}전</p>
            </div>
          </div>
        ))}

        {mode === "TEAM" && teamEntriesByGrade.length > teamVisibleCount && (
          <button
            onClick={() => setTeamVisibleCount((prev) => prev + 5)}
            style={{ border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            더보기
          </button>
        )}
      </section>

      <BottomNavMain active="ranking" />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 620, margin: "0 auto", display: "grid", gap: 10 };
const hero: CSSProperties = {
  padding: "18px 20px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, rgba(91,140,255,0.22), rgba(24,210,182,0.08) 60%, rgba(255,255,255,0.02)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const card: CSSProperties = {
  padding: "15px 18px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const teamMemberRow: CSSProperties = {
  display: "block",
  padding: "1px 0",
  minWidth: 0,
};
const teamMemberName: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
