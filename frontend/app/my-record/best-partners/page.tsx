"use client";

import Link from "next/link";
import {CSSProperties, useEffect, useState} from "react";
import {fetchAllPartners, getAccessToken, type PartnerStat, refreshAccessToken} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";
import {UserNameActions} from "@/components/user-name-actions";

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
        <div style={hero}>
          <Link href="/my-record" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 내 기록</Link>
          <p style={{ margin: "10px 0 0", color: "var(--brand-light)", fontSize: 12, fontWeight: 700 }}>SYNERGY</p>
          <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>베스트 파트너</h1>
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && list.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>데이터가 부족합니다</p>
          </div>
        )}

        {list.map((p, idx) => (
          <div key={p.userId} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 24, fontSize: 14, color: "var(--muted)", fontWeight: 800 }}>{idx + 1}</span>
              <UserNameActions userId={p.userId} nickname={p.nickname} gender={p.gender} grade={p.nationalGrade} style={{ fontSize: 14, fontWeight: 600 }} />
            </div>
            <span style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{p.wins}승 {p.games}전 ({p.winRate.toFixed(0)}%)</span>
          </div>
        ))}
      </section>

      <BottomNavMain active="my" />
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
  padding: "14px 18px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
};
