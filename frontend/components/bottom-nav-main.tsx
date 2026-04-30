"use client";

import Link from "next/link";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {CSSProperties} from "react";

type MainTab = "home" | "event" | "ranking" | "notifications" | "my";

type BottomNavMainProps = {
  active: MainTab;
  unreadCount?: number;
};

export function BottomNavMain({ active, unreadCount = 0 }: BottomNavMainProps) {
  return (
    <nav style={bottomBar}>
      <Link href="/" style={tabBtn(active === "home")}>
        <HomeRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>홈</span>
      </Link>
      <Link href="/groups/list" style={tabBtn(active === "event")}>
        <EventRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>이벤트</span>
      </Link>
      <Link href="/ranking" style={tabBtn(active === "ranking")}>
        <EmojiEventsRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>랭킹</span>
      </Link>
      <Link href="/notifications" style={{ ...tabBtn(active === "notifications"), position: "relative" }}>
        <NotificationsNoneRoundedIcon style={navIcon} />
        {unreadCount > 0 && <span style={unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
        <span style={{ fontSize: 11 }}>알림</span>
      </Link>
      <Link href="/my" style={tabBtn(active === "my")}>
        <PersonRoundedIcon style={navIcon} />
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
  background: "rgba(15, 18, 26, 0.85)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(173, 193, 230, 0.15)",
  padding: "6px 0 calc(6px + env(safe-area-inset-bottom))",
  zIndex: 100,
  boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.2)",
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

const navIcon: CSSProperties = {
  width: 22,
  height: 22,
  display: "block",
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
