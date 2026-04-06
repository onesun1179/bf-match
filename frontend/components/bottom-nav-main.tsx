"use client";

import Link from "next/link";
import { CSSProperties } from "react";

type MainTab = "home" | "event" | "ranking" | "notifications" | "my";

type BottomNavMainProps = {
  active: MainTab;
  unreadCount?: number;
};

export function BottomNavMain({ active, unreadCount = 0 }: BottomNavMainProps) {
  return (
    <nav style={bottomBar}>
      <Link href="/" style={tabBtn(active === "home")}>
        <span style={{ fontSize: 18 }}>{"\u{1F3E0}"}</span>
        <span style={{ fontSize: 11 }}>홈</span>
      </Link>
      <Link href="/groups/list" style={tabBtn(active === "event")}>
        <span style={{ fontSize: 18 }}>{"\u{1F3F8}"}</span>
        <span style={{ fontSize: 11 }}>이벤트</span>
      </Link>
      <Link href="/ranking" style={tabBtn(active === "ranking")}>
        <span style={{ fontSize: 18 }}>{"\u{1F3C6}"}</span>
        <span style={{ fontSize: 11 }}>랭킹</span>
      </Link>
      <Link href="/notifications" style={{ ...tabBtn(active === "notifications"), position: "relative" }}>
        <span style={{ fontSize: 18 }}>{"\u{1F514}"}</span>
        {unreadCount > 0 && <span style={unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
        <span style={{ fontSize: 11 }}>알림</span>
      </Link>
      <Link href="/my" style={tabBtn(active === "my")}>
        <span style={{ fontSize: 18 }}>{"\u{1F464}"}</span>
        <span style={{ fontSize: 11 }}>마이</span>
      </Link>
    </nav>
  );
}

const bottomBar: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  gap: 0,
  background: "var(--surface)",
  borderTop: "1px solid var(--line)",
  padding: "6px 0",
  zIndex: 100,
};

const unreadBadge: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 16,
  background: "var(--danger)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  padding: "1px 5px",
  borderRadius: 10,
  lineHeight: 1.4,
};

function tabBtn(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "6px 22px",
    textDecoration: "none",
    color: active ? "var(--brand-light)" : "var(--muted)",
    fontWeight: active ? 700 : 500,
  };
}
