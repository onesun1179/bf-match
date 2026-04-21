"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {CSSProperties, useEffect, useMemo, useState} from "react";
import {
    fetchMe,
    fetchTeamRanking,
    getAccessToken,
    type Grade,
    refreshAccessToken,
    type TeamRankingEntry,
    type TeamRankingResponse
} from "@/lib/auth";
import {UserNameActions} from "@/components/user-name-actions";

const GRADES: Grade[] = ["S", "A", "B", "C", "D", "E", "F"];
const TYPE_TABS = [
  { key: "ALL", label: "전체" },
  { key: "MALE_DOUBLES", label: "남복" },
  { key: "FEMALE_DOUBLES", label: "여복" },
  { key: "MIXED_DOUBLES", label: "혼복" },
  { key: "FREE", label: "자유" },
] as const;

export default function TeamRecordPage() {
  const params = useParams<{ teamKey: string }>();
  const teamKey = decodeURIComponent(params.teamKey);
  const [data, setData] = useState<TeamRankingResponse | null>(null);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [me, ranking] = await Promise.all([fetchMe(), fetchTeamRanking()]);
        setMeId(me.id);
        setData(ranking);
      } catch (e) {
        setError(e instanceof Error ? e.message : "팀 기록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const entries = useMemo(() => {
    if (!data) return [] as Array<{ grade: Grade; type: string; typeLabel: string; entry: TeamRankingEntry }>;
    const out: Array<{ grade: Grade; type: string; typeLabel: string; entry: TeamRankingEntry }> = [];
    GRADES.forEach((grade) => {
      const byType = data.grades[grade];
      if (!byType) return;
      TYPE_TABS.forEach((t) => {
        const found = (byType[t.key] ?? []).find((entry) => entry.teamKey === teamKey);
        if (found) out.push({ grade, type: t.key, typeLabel: t.label, entry: found });
      });
    });
    return out;
  }, [data, teamKey]);

  const overall = entries.find((e) => e.type === "ALL") ?? entries[0] ?? null;
  const typeEntries = entries.filter((e) => e.type !== "ALL");
  const mainType = typeEntries
    .slice()
    .sort((a, b) => b.entry.gameCount - a.entry.gameCount || b.entry.winRate - a.entry.winRate)
    [0] ?? null;
  const bestType = typeEntries
    .filter((x) => x.entry.gameCount > 0)
    .slice()
    .sort((a, b) => b.entry.winRate - a.entry.winRate || b.entry.gameCount - a.entry.gameCount)
    [0] ?? null;
  const totalTypesPlayed = typeEntries.filter((x) => x.entry.gameCount > 0).length;

  if (loading) return <main style={main}><p style={muted}>불러오는 중...</p></main>;
  if (error) return <main style={main}><p style={{ ...muted, color: "var(--danger)" }}>{error}</p></main>;
  if (!overall) return <main style={main}><p style={muted}>팀 기록을 찾을 수 없습니다.</p></main>;

  return (
    <main style={main}>
      <section style={sec}>
        <Link href="/ranking" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 랭킹으로</Link>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>팀 기록</h1>

        <div style={card}>
          <h2 style={sh}>팀 구성</h2>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {overall.entry.members.map((member) => (
              <UserNameActions
                key={member.userId}
                userId={member.userId}
                nickname={member.nickname}
                gender={member.gender}
                grade={member.grade}
                myUserId={meId}
                style={{ fontSize: 15, fontWeight: 700 }}
              />
            ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>전체 전적</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            <Stat title="승률" value={`${overall.entry.winRate.toFixed(1)}%`} />
            <Stat title="승" value={`${overall.entry.winCount}`} />
            <Stat title="패" value={`${Math.max(overall.entry.gameCount - overall.entry.winCount, 0)}`} />
            <Stat title="전" value={`${overall.entry.gameCount}`} />
          </div>
        </div>

        <div style={card}>
          <h2 style={sh}>핵심 지표</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
            <Stat title="랭킹" value={`#${overall.entry.rank}`} />
            <Stat title="주력 타입" value={mainType ? mainType.typeLabel : "-"} />
            <Stat title="활성 타입" value={`${totalTypesPlayed}`} />
          </div>
          {bestType && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
              강점 타입: {bestType.typeLabel} · {bestType.entry.winRate.toFixed(0)}% ({bestType.entry.winCount}승 {Math.max(bestType.entry.gameCount - bestType.entry.winCount, 0)}패)
            </p>
          )}
        </div>

        <div style={card}>
          <h2 style={sh}>유형별 전적/랭킹</h2>
          {typeEntries.length === 0 && <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>유형별 기록이 없습니다.</p>}
          {typeEntries.map((row) => (
            <div key={`${row.grade}-${row.type}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", padding: "10px 0" }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{row.typeLabel} · #{row.entry.rank}</p>
                <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>{row.entry.winCount}승 {row.entry.gameCount}전</p>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--brand-light)" }}>{row.entry.winRate.toFixed(1)}%</p>
            </div>
          ))}
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
const sec: CSSProperties = { maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = {
  padding: "16px 18px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
const sh: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink-secondary)" };
const muted: CSSProperties = { color: "var(--muted)", textAlign: "center", padding: 60 };
