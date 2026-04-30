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
    <nav style={bottomBar}>
      <Link href={`/groups/${groupId}?view=info`} style={tabBtn(active === "info")}>
        <InfoRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>정보</span>
      </Link>
      <Link href={`/groups/${groupId}?view=members`} style={tabBtn(active === "members")}>
        <GroupsRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>멤버</span>
      </Link>
      <Link href={`/groups/${groupId}?view=games`} style={tabBtn(active === "games")}>
        <SportsTennisRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>게임</span>
      </Link>
      <Link href={`/groups/${groupId}?view=ranking`} style={tabBtn(active === "stats")}>
        <LeaderboardRoundedIcon style={navIcon} />
        <span style={{ fontSize: 11 }}>랭킹</span>
      </Link>
      {isOwnerOrManager && (
        <Link href={`/groups/${groupId}?view=manage`} style={tabBtn(active === "manage")}>
          <ManageAccountsRoundedIcon style={navIcon} />
          <span style={{ fontSize: 11 }}>관리</span>
        </Link>
      )}
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
    border: 0,
    background: "transparent",
    color: active ? "var(--brand-light)" : "var(--muted)",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    textDecoration: "none",
  };
}
