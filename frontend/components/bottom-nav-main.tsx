"use client";

import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {CSSProperties} from "react";
import {BottomFrostedNav, BottomTabLink} from "@/components/ui/apple";

type MainTab = "home" | "event" | "ranking" | "notifications" | "my";

type BottomNavMainProps = {
  active: MainTab;
  unreadCount?: number;
};

export function BottomNavMain({ active, unreadCount = 0 }: BottomNavMainProps) {
  return (
    <BottomFrostedNav aria-label="주요 화면">
      <BottomTabLink href="/" selected={active === "home"}>
        <HomeRoundedIcon style={navIcon} />
        <span style={navLabel}>홈</span>
      </BottomTabLink>
      <BottomTabLink href="/groups/list" selected={active === "event"}>
        <EventRoundedIcon style={navIcon} />
        <span style={navLabel}>이벤트</span>
      </BottomTabLink>
      <BottomTabLink href="/ranking" selected={active === "ranking"}>
        <EmojiEventsRoundedIcon style={navIcon} />
        <span style={navLabel}>랭킹</span>
      </BottomTabLink>
      <BottomTabLink href="/notifications" selected={active === "notifications"} style={{ position: "relative" }}>
        <NotificationsNoneRoundedIcon style={navIcon} />
        {unreadCount > 0 && <span style={unreadBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
        <span style={navLabel}>알림</span>
      </BottomTabLink>
      <BottomTabLink href="/my" selected={active === "my"}>
        <PersonRoundedIcon style={navIcon} />
        <span style={navLabel}>마이</span>
      </BottomTabLink>
    </BottomFrostedNav>
  );
}

const unreadBadge: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 10,
  background: "var(--danger)",
  color: "var(--on-primary)",
  fontSize: 10,
  fontWeight: 600,
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
  letterSpacing: 0,
  whiteSpace: "nowrap",
};
