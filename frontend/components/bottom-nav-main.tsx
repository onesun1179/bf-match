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
    <nav aria-label="주요 화면" style={bottomBar}>
      <Link href="/" style={tabBtn(active === "home")}>
        <HomeRoundedIcon style={navIcon} />
        <span style={navLabel}>홈</span>
      </Link>
      <Link href="/groups/list" style={tabBtn(active === "event")}>
        <EventRoundedIcon style={navIcon} />
        <span style={navLabel}>이벤트</span>
      </Link>
      <Link href="/ranking" style={tabBtn(active === "ranking")}>
        <EmojiEventsRoundedIcon style={navIcon} />
        <span style={navLabel}>랭킹</span>
      </Link>
      <Link href="/notifications" style={{ ...tabBtn(active === "notifications"), position: "relative" }}>
        <NotificationsNoneRoundedIcon style={navIcon} />
        {unreadCount > 0 && <span style={unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
        <span style={navLabel}>알림</span>
      </Link>
      <Link href="/my" style={tabBtn(active === "my")}>
        <PersonRoundedIcon style={navIcon} />
        <span style={navLabel}>마이</span>
      </Link>
    </nav>
  );
}

const bottomBar: CSSProperties = {
  position: "fixed",
  bottom: "calc(10px + env(safe-area-inset-bottom))",
  left: "50%",
  width: "min(560px, calc(100% - 24px))",
  transform: "translateX(-50%)",
  display: "flex",
  justifyContent: "space-between",
  gap: 4,
  background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02)), var(--glass-strong)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  border: "1px solid var(--glass-border)",
  borderRadius: 22,
  padding: 6,
  zIndex: 100,
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.42)",
};

const unreadBadge: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 10,
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
const navLabel: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

function tabBtn(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flex: "1 1 0",
    minWidth: 0,
    minHeight: 52,
    padding: "7px 6px",
    borderRadius: 17,
    textDecoration: "none",
    color: active ? "var(--ink)" : "var(--muted)",
    fontWeight: active ? 700 : 500,
    background: active ? "linear-gradient(180deg, rgba(111,145,255,0.34), rgba(33,208,173,0.16))" : "transparent",
    border: active ? "1px solid rgba(169,190,255,0.32)" : "1px solid transparent",
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
    transition: "background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease",
  };
}
