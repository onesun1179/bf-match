"use client";

import Link from "next/link";
import {CSSProperties, useEffect, useState} from "react";
import {fetchUnreadCount, getAccessToken, refreshAccessToken} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";

export default function MyPage() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        setUnread(await fetchUnreadCount());
      } catch {
        setUnread(0);
      }
    })();
  }, []);

  return (
    <main style={main}>
      <section className="animate-fade-in-up" style={sec}>
        <div className="glass-card" style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontWeight: 700 }}>마이</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 30, fontWeight: 800 }}>내 메뉴</h1>
          <p style={{ margin: 0, color: "var(--ink-secondary)", fontSize: 15 }}>
            기록과 설정을 여기에서 관리하세요.
          </p>
        </div>

        <Link href="/my-record" className="glass-card btn-hover" style={itemLink}>
          <div style={itemIcon}>{"\u{1F4CB}"}</div>
          <div style={{ display: "grid", gap: 4 }}>
            <p style={itemTitle}>기록</p>
            <p style={itemDesc}>내 전적, 파트너/상대, 월별 기록 보기</p>
          </div>
          <div style={arrow}>&rsaquo;</div>
        </Link>

        <Link href="/settings" className="glass-card btn-hover" style={itemLink}>
          <div style={itemIcon}>{"\u2699\uFE0F"}</div>
          <div style={{ display: "grid", gap: 4 }}>
            <p style={itemTitle}>설정</p>
            <p style={itemDesc}>알림 관리 및 계정 관련 설정</p>
          </div>
          <div style={arrow}>&rsaquo;</div>
        </Link>
      </section>

      <BottomNavMain active="my" unreadCount={unread} />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 12 };
const hero: CSSProperties = {
  padding: "24px 24px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, rgba(91, 140, 255, 0.1), rgba(24, 210, 182, 0.05))",
  border: "1px solid rgba(173, 193, 230, 0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
};
const itemLink: CSSProperties = {
  padding: "18px 20px",
  borderRadius: "var(--radius-lg)",
  textDecoration: "none",
  color: "inherit",
  display: "grid",
  gridTemplateColumns: "40px 1fr auto",
  alignItems: "center",
  gap: 12,
};
const itemIcon: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: "var(--surface-2)",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
};
const itemTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 700 };
const itemDesc: CSSProperties = { margin: 0, fontSize: 13, color: "var(--ink-secondary)" };
const arrow: CSSProperties = { fontSize: 22, color: "var(--muted)" };
