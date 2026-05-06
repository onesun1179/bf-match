"use client";

import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SportsTennisRoundedIcon from "@mui/icons-material/SportsTennisRounded";
import {CSSProperties} from "react";
import {BottomFrostedNav, BottomTabLink} from "@/components/ui/apple";

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
    <BottomFrostedNav aria-label="이벤트 상세 화면">
      <BottomTabLink href={`/groups/${groupId}?view=info`} selected={active === "info"}>
        <InfoRoundedIcon style={navIcon} />
        <span style={navLabel}>정보</span>
      </BottomTabLink>
      <BottomTabLink href={`/groups/${groupId}?view=members`} selected={active === "members"}>
        <GroupsRoundedIcon style={navIcon} />
        <span style={navLabel}>멤버</span>
      </BottomTabLink>
      <BottomTabLink href={`/groups/${groupId}?view=games`} selected={active === "games"}>
        <SportsTennisRoundedIcon style={navIcon} />
        <span style={navLabel}>게임</span>
      </BottomTabLink>
      <BottomTabLink href={`/groups/${groupId}?view=ranking`} selected={active === "stats"}>
        <LeaderboardRoundedIcon style={navIcon} />
        <span style={navLabel}>랭킹</span>
      </BottomTabLink>
      {isOwnerOrManager && (
        <BottomTabLink href={`/groups/${groupId}?view=manage`} selected={active === "manage"}>
          <ManageAccountsRoundedIcon style={navIcon} />
          <span style={navLabel}>관리</span>
        </BottomTabLink>
      )}
    </BottomFrostedNav>
  );
}

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
