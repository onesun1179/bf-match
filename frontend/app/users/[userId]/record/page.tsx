"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import { displayName, fetchUserRecord, getAccessToken, refreshAccessToken, type MyRecord, type TypeStat } from "@/lib/auth";

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

  return (
    <main style={main}>
      <section style={sec}>
        <Link href="/groups/list" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 목록</Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>사용자 기록</h1>

        <div style={card}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{displayName(data.nickname, data.gender, data.nationalGrade)}</p>
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

