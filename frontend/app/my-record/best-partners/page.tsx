"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { displayName, fetchAllPartners, getAccessToken, refreshAccessToken, type PartnerStat } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";

export default function BestPartnersPage() {
  const [list, setList] = useState<PartnerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const data = await fetchAllPartners();
        setList(data.bestPartners ?? []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <main style={main}>
      <section style={sec}>
        <Link href="/my-record" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 내 기록</Link>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>베스트 파트너</h1>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && list.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>데이터가 부족합니다</p>
          </div>
        )}

        {list.map((p) => (
          <div key={p.userId} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{displayName(p.nickname, p.gender, p.nationalGrade)}</span>
            <span style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{p.wins}승 {p.games}전 ({p.winRate.toFixed(0)}%)</span>
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
