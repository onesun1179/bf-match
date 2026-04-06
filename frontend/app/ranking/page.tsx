"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { displayName, fetchRanking, getAccessToken, refreshAccessToken, type Grade, type GradeRankingEntry, type RankingByGrade } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";

const GRADES: Grade[] = ["S", "A", "B", "C", "D", "E", "F"];
const TYPE_TABS = [
  { key: "ALL", label: "전체" },
  { key: "MALE_DOUBLES", label: "남복" },
  { key: "FEMALE_DOUBLES", label: "여복" },
  { key: "MIXED_DOUBLES", label: "혼복" },
  { key: "FREE", label: "자유" },
];

export default function RankingPage() {
  const [data, setData] = useState<RankingByGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeTab, setGradeTab] = useState<Grade>("F");
  const [typeTab, setTypeTab] = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const d = await fetchRanking();
        setData(d);
        const first = GRADES.find((g) => {
          const byType = d.grades[g];
          return byType && Object.values(byType).some((arr) => arr.length > 0);
        });
        if (first) setGradeTab(first);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const entries: GradeRankingEntry[] = data?.grades[gradeTab]?.[typeTab] ?? [];

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

  function typeCount(key: string): number {
    return data?.grades[gradeTab]?.[key]?.length ?? 0;
  }

  return (
    <main style={main}>
      <section style={sec}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>랭킹</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>5경기 이상 참여자만 표시 / 승률순</p>

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
            const cnt = typeCount(t.key);
            return (
              <button key={t.key} onClick={() => setTypeTab(t.key)} style={{
                padding: "6px 14px", border: 0, borderRadius: 999, whiteSpace: "nowrap",
                background: typeTab === t.key ? "var(--accent)" : "var(--surface-3)",
                color: typeTab === t.key ? "#fff" : cnt > 0 ? "var(--ink-secondary)" : "var(--muted)",
                fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: cnt > 0 ? 1 : 0.5,
              }}>{t.label}{cnt > 0 && <span style={{ fontSize: 11, marginLeft: 3, opacity: 0.7 }}>{cnt}</span>}</button>
            );
          })}
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && entries.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>해당 조건의 랭킹이 없습니다</p>
          </div>
        )}

        {entries.map((r, idx) => (
          <div key={`${r.userId}`} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, textAlign: "center", fontSize: idx < 3 ? 24 : 16, fontWeight: 800, color: idx < 3 ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
              {medal(idx)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link href={`/users/${r.userId}/record`} style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", textDecoration: "none" }}>
                  {displayName(r.nickname, r.gender, r.grade)}
                </Link>
                {r.currentGrade !== r.grade && (
                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "rgba(108,92,231,0.15)", color: "var(--brand-light)" }}>현재 {r.currentGrade}</span>
                )}
              </div>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>LV {r.lv}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--brand-light)" }}>{r.winRate.toFixed(1)}%</p>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>{r.winCount}승 {r.gameCount}전</p>
            </div>
          </div>
        ))}
      </section>

      <BottomNavMain active="ranking" />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 10 };
const card: CSSProperties = { padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)" };
