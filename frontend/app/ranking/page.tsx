"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {CSSProperties, Suspense, useEffect, useState} from "react";
import {
  fetchRanking,
  fetchTeamRanking,
  getAccessToken,
  type Grade,
  type GradeRankingEntry,
  type RankingByGrade,
  refreshAccessToken,
  type TeamRankingResponse
} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";
import {UserNameActions} from "@/components/user-name-actions";

const GRADES: Grade[] = ["S", "A", "B", "C", "D", "E", "F"];
const TYPE_TABS = [
  { key: "ALL", label: "전체" },
  { key: "MALE_DOUBLES", label: "남복" },
  { key: "FEMALE_DOUBLES", label: "여복" },
  { key: "MIXED_DOUBLES", label: "혼복" },
  { key: "FREE", label: "자유" },
] as const;

type RankingMode = "PERSONAL" | "TEAM";
type RankingType = (typeof TYPE_TABS)[number]["key"];
type RankingQuery = {
  mode: RankingMode;
  grade: Grade;
  type: RankingType;
  hasGrade: boolean;
};

export default function RankingPage() {
  return (
    <Suspense fallback={<RankingPageFallback />}>
      <RankingPageContent />
    </Suspense>
  );
}

function RankingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialQuery] = useState<RankingQuery>(() => parseRankingQuery(searchParams));
  const [data, setData] = useState<RankingByGrade | null>(null);
  const [teamData, setTeamData] = useState<TeamRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<RankingMode>(initialQuery.mode);
  const [gradeTab, setGradeTab] = useState<Grade>(initialQuery.grade);
  const [teamGradeTab, setTeamGradeTab] = useState<Grade>(initialQuery.grade);
  const [teamTypeTab, setTeamTypeTab] = useState<RankingType>(initialQuery.type);
  const [typeTab, setTypeTab] = useState<RankingType>(initialQuery.type);
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
        if (first && !(initialQuery.mode === "PERSONAL" && initialQuery.hasGrade)) setGradeTab(first);
        const firstTeamGrade = GRADES.find((g) => {
          const byType = teamRanking.grades[g];
          return byType && Object.values(byType).some((arr) => arr.length > 0);
        });
        if (firstTeamGrade && !(initialQuery.mode === "TEAM" && initialQuery.hasGrade)) setTeamGradeTab(firstTeamGrade);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [initialQuery]);

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

  useEffect(() => {
    if (loading) return;
    replaceRankingQuery({
      mode,
      grade: mode === "PERSONAL" ? gradeTab : teamGradeTab,
      type: mode === "PERSONAL" ? typeTab : teamTypeTab,
    });
  }, [gradeTab, loading, mode, teamGradeTab, teamTypeTab, typeTab]);

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

        {loading && <RankingLoadingState />}

        {!loading && mode === "PERSONAL" && (
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

        {!loading && mode === "TEAM" && (
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

        {!loading && mode === "PERSONAL" && visiblePersonalEntries.map((r, idx) => (
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

        {!loading && mode === "PERSONAL" && entries.length > personalVisibleCount && (
          <button
            onClick={() => setPersonalVisibleCount((prev) => prev + 5)}
            style={{ border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            더보기
          </button>
        )}

        {!loading && mode === "TEAM" && visibleTeamEntries.map((r, idx) => (
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

        {!loading && mode === "TEAM" && teamEntriesByGrade.length > teamVisibleCount && (
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

function RankingPageFallback() {
  return (
    <main style={main}>
      <section style={sec}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>BF MATCH RANKING</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>랭킹</h1>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div style={{ flex: 1, minHeight: 34, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ flex: 1, minHeight: 34, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.07)" }} />
        </div>
        <RankingLoadingState />
      </section>
      <BottomNavMain active="ranking" />
    </main>
  );
}

function RankingLoadingState() {
  return (
    <div role="status" aria-label="랭킹 불러오는 중" aria-busy="true" style={loadingWrap}>
      <div style={loadingTabRow}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={`grade-skeleton-${idx}`} style={loadingGradePill} />
        ))}
      </div>
      <div style={loadingTypeRow}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`type-skeleton-${idx}`} style={loadingTypePill} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={`ranking-skeleton-${idx}`} style={loadingCard}>
          <div style={loadingRank} />
          <div style={loadingTextBlock}>
            <div style={loadingLineWide} />
            <div style={loadingLineNarrow} />
          </div>
          <div style={loadingScoreBlock}>
            <div style={loadingScoreLine} />
            <div style={loadingScoreSmall} />
          </div>
        </div>
      ))}
    </div>
  );
}

function parseRankingQuery(searchParams: { get(name: string): string | null }): RankingQuery {
  const mode = parseRankingMode(searchParams.get("mode"));
  const rawGrade = searchParams.get("grade")?.toUpperCase();
  const hasGrade = isGrade(rawGrade);
  const rawType = searchParams.get("type")?.toUpperCase();

  return {
    mode,
    grade: hasGrade ? rawGrade : "F",
    type: isRankingType(rawType) ? rawType : "ALL",
    hasGrade,
  };
}

function parseRankingMode(value: string | null): RankingMode {
  const normalized = value?.toUpperCase();
  if (normalized === "TEAM") return "TEAM";
  return "PERSONAL";
}

function isGrade(value: string | null | undefined): value is Grade {
  return GRADES.includes(value as Grade);
}

function isRankingType(value: string | null | undefined): value is RankingType {
  return TYPE_TABS.some((typeTab) => typeTab.key === value);
}

function replaceRankingQuery(query: { mode: RankingMode; grade: Grade; type: RankingType }) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", query.mode.toLowerCase());
  url.searchParams.set("grade", query.grade);
  url.searchParams.set("type", query.type);
  window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
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
const loadingWrap: CSSProperties = { display: "grid", gap: 10 };
const loadingSurface: CSSProperties = {
  background: "rgba(255,255,255,0.07)",
};
const loadingTabRow: CSSProperties = {
  display: "flex",
  gap: 4,
  padding: 4,
  borderRadius: "var(--radius-md)",
  background: "var(--surface-2)",
  overflow: "hidden",
};
const loadingGradePill: CSSProperties = {
  ...loadingSurface,
  width: 37,
  height: 34,
  borderRadius: "var(--radius-sm)",
  flexShrink: 0,
};
const loadingTypeRow: CSSProperties = { display: "flex", gap: 4, overflow: "hidden" };
const loadingTypePill: CSSProperties = {
  ...loadingSurface,
  width: 56,
  height: 30,
  borderRadius: 999,
  flexShrink: 0,
};
const loadingCard: CSSProperties = {
  ...card,
  display: "flex",
  alignItems: "center",
  gap: 14,
  minHeight: 74,
};
const loadingRank: CSSProperties = { ...loadingSurface, width: 36, height: 28, borderRadius: 8, flexShrink: 0 };
const loadingTextBlock: CSSProperties = { flex: 1, display: "grid", gap: 8, minWidth: 0 };
const loadingLineWide: CSSProperties = { ...loadingSurface, width: "72%", height: 14, borderRadius: 999 };
const loadingLineNarrow: CSSProperties = { ...loadingSurface, width: "44%", height: 10, borderRadius: 999 };
const loadingScoreBlock: CSSProperties = { display: "grid", gap: 8, justifyItems: "end", flexShrink: 0 };
const loadingScoreLine: CSSProperties = { ...loadingSurface, width: 54, height: 14, borderRadius: 999 };
const loadingScoreSmall: CSSProperties = { ...loadingSurface, width: 46, height: 10, borderRadius: 999 };
