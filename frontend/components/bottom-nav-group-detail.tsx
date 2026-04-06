"use client";

import Link from "next/link";
import { CSSProperties } from "react";

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
        <span style={{ fontSize: 18 }}>{"\u2139\uFE0F"}</span>
        <span style={{ fontSize: 11 }}>정보</span>
      </Link>
      <Link href={`/groups/${groupId}?view=members`} style={tabBtn(active === "members")}>
        <span style={{ fontSize: 18 }}>{"\u{1F465}"}</span>
        <span style={{ fontSize: 11 }}>멤버</span>
      </Link>
      <Link href={`/groups/${groupId}?view=games`} style={tabBtn(active === "games")}>
        <span style={{ fontSize: 18 }}>{"\u{1F3BE}"}</span>
        <span style={{ fontSize: 11 }}>게임</span>
      </Link>
      <Link href={`/groups/${groupId}?view=ranking`} style={tabBtn(active === "stats")}>
        <span style={{ fontSize: 18 }}>{"\u{1F4CA}"}</span>
        <span style={{ fontSize: 11 }}>랭킹</span>
      </Link>
      {isOwnerOrManager && (
        <Link href={`/groups/${groupId}?view=manage`} style={tabBtn(active === "manage")}>
          <span style={{ fontSize: 18 }}>{"\u2699\uFE0F"}</span>
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
