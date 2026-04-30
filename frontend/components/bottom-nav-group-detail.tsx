"use client";

import Link from "next/link";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SportsTennisRoundedIcon from "@mui/icons-material/SportsTennisRounded";
import {CSSProperties} from "react";

export type GroupDetailTab = "info" | "manage" | "members" | "games" | "stats";

type BottomNavGroupDetailProps = {
  groupId: number;
  active: GroupDetailTab;
  isOwnerOrManager: boolean;
};

export function BottomNavGroupDetail({
  groupId,
  active,
  isOwnerOrManager,
}: BottomNavGroupDetailProps) {
  return (
    <nav aria-label="이벤트 상세 화면" style={bottomBar}>
      <Link href={`/groups/${groupId}?view=info`} style={tabBtn(active === "info")}>
        <InfoRoundedIcon style={navIcon} />
        <span style={navLabel}>정보</span>
      </Link>
      <Link href={`/groups/${groupId}?view=members`} style={tabBtn(active === "members")}>
        <GroupsRoundedIcon style={navIcon} />
        <span style={navLabel}>멤버</span>
      </Link>
      <Link href={`/groups/${groupId}?view=games`} style={tabBtn(active === "games")}>
        <SportsTennisRoundedIcon style={navIcon} />
        <span style={navLabel}>게임</span>
      </Link>
      <Link href={`/groups/${groupId}?view=ranking`} style={tabBtn(active === "stats")}>
        <LeaderboardRoundedIcon style={navIcon} />
        <span style={navLabel}>랭킹</span>
      </Link>
      {isOwnerOrManager && (
        <Link href={`/groups/${groupId}?view=manage`} style={tabBtn(active === "manage")}>
          <ManageAccountsRoundedIcon style={navIcon} />
          <span style={navLabel}>관리</span>
        </Link>
      )}
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
    border: 0,
    background: active ? "linear-gradient(180deg, rgba(111,145,255,0.34), rgba(33,208,173,0.16))" : "transparent",
    color: active ? "var(--ink)" : "var(--muted)",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    textDecoration: "none",
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
    outline: active ? "1px solid rgba(169,190,255,0.32)" : "1px solid transparent",
    transition: "background .18s ease, outline-color .18s ease, color .18s ease, transform .18s ease",
  };
}
