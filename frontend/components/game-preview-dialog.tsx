"use client";

import Link from "next/link";
import { CSSProperties } from "react";
import { displayName, type Grade, type PlayerInfo } from "@/lib/auth";
import { UserNameActions } from "@/components/user-name-actions";

export type PreviewGame = {
  gameId: number;
  groupId: number;
  groupName: string;
  teamAScore: number | null;
  teamBScore: number | null;
  myTeam: string;
  finishedAt: string | null;
  teammates: PlayerInfo[];
  opponents: PlayerInfo[];
};

type Props = {
  open: boolean;
  game: PreviewGame | null;
  meUserId: number | null;
  meNickname?: string;
  meGender?: "MALE" | "FEMALE" | null;
  meGrade?: Grade | null;
  onClose: () => void;
};

export function GamePreviewDialog({ open, game, meUserId, meNickname = "나", meGender = null, meGrade = null, onClose }: Props) {
  if (!open || !game) return null;

  const myTeamPlayers: PlayerInfo[] = [{ userId: meUserId ?? -1, nickname: meNickname, gender: meGender, grade: meGrade }, ...game.teammates];
  const oppositePlayers: PlayerInfo[] = game.opponents;

  const teamAPlayers = game.myTeam === "A" ? myTeamPlayers : oppositePlayers;
  const teamBPlayers = game.myTeam === "B" ? myTeamPlayers : oppositePlayers;
  const winnerTeam = game.teamAScore != null && game.teamBScore != null
    ? game.teamAScore > game.teamBScore ? "A" : "B"
    : null;

  const teamAKey = teamAPlayers.map((p) => p.userId).filter((id) => id > 0).sort((a, b) => a - b).join("-");
  const teamBKey = teamBPlayers.map((p) => p.userId).filter((id) => id > 0).sort((a, b) => a - b).join("-");
  const teamAHref = teamAPlayers.length === 2 && teamAKey ? `/groups/${game.groupId}/teams/${teamAKey}` : null;
  const teamBHref = teamBPlayers.length === 2 && teamBKey ? `/groups/${game.groupId}/teams/${teamBKey}` : null;

  return (
    <div style={overlay} onClick={onClose}>
      <section style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" style={chip}>
              {game.gameId}번 게임
            </button>
            <button type="button" style={chipMuted}>
              종료
            </button>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="닫기">×</button>
        </div>

        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href={`/groups/${game.groupId}`} style={{ color: "var(--brand-light)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            {game.groupName}
          </Link>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            {game.finishedAt ? new Date(game.finishedAt).toLocaleString("ko-KR") : "-"}
          </p>
        </div>

        <div style={teamsWrap}>
          <div style={teamPanelLeft}>
            {teamAHref ? (
              <Link href={teamAHref} style={{ ...teamTitle, color: "var(--brand-light)" }}>
                팀 A {winnerTeam === "A" ? "🏆" : ""}
              </Link>
            ) : (
              <p style={{ ...teamTitle, color: "var(--brand-light)" }}>팀 A {winnerTeam === "A" ? "🏆" : ""}</p>
            )}
            {teamAPlayers.map((p) => (
              <p key={`a-${p.userId}-${p.nickname}`} style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                <UserNameActions userId={p.userId} nickname={p.nickname} gender={p.gender} grade={p.grade} myUserId={meUserId} style={{ ...nameBtn, fontSize: 13 }} />
              </p>
            ))}
          </div>
          <div style={scoreWrap}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {game.teamAScore ?? "-"} : {game.teamBScore ?? "-"}
            </span>
          </div>
          <div style={teamPanelRight}>
            {teamBHref ? (
              <Link href={teamBHref} style={{ ...teamTitle, color: "var(--accent)", textAlign: "right" }}>
                팀 B {winnerTeam === "B" ? "🏆" : ""}
              </Link>
            ) : (
              <p style={{ ...teamTitle, color: "var(--accent)", textAlign: "right" }}>팀 B {winnerTeam === "B" ? "🏆" : ""}</p>
            )}
            {teamBPlayers.map((p) => (
              <p key={`b-${p.userId}-${p.nickname}`} style={{ margin: 0, fontSize: 13, lineHeight: 1.45, textAlign: "right" }}>
                <UserNameActions userId={p.userId} nickname={p.nickname} gender={p.gender} grade={p.grade} myUserId={meUserId} style={{ ...nameBtn, fontSize: 13 }} />
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,4,10,0.78)",
  backdropFilter: "blur(10px)",
  zIndex: 100,
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const panel: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  borderRadius: 24,
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow-lg)",
  padding: 18,
  display: "grid",
  gap: 12,
};

const chip: CSSProperties = {
  border: "1px solid var(--line-2)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.00)), var(--surface-3)",
  color: "var(--ink)",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 800,
};
const chipMuted: CSSProperties = {
  border: "1px solid rgba(16,185,129,0.35)",
  background: "rgba(16,185,129,0.14)",
  color: "var(--success)",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 800,
};
const closeBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(255,109,122,0.35)",
  background: "rgba(255,109,122,0.14)",
  color: "var(--danger)",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};

const teamsWrap: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 126px 1fr", gap: 12, alignItems: "stretch" };
const teamPanelLeft: CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(91,140,255,0.36)",
  background: "rgba(91,140,255,0.12)",
  padding: "12px 14px",
  display: "grid",
  gap: 4,
};
const teamPanelRight: CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(24,210,182,0.36)",
  background: "rgba(24,210,182,0.12)",
  padding: "12px 14px",
  display: "grid",
  gap: 4,
};
const scoreWrap: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.00)), var(--surface-2)",
  display: "grid",
  placeItems: "center",
};
const teamTitle: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, textDecoration: "none" };
const nameBtn: CSSProperties = { fontWeight: 700, color: "var(--ink)" };
