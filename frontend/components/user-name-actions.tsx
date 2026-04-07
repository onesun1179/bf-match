"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import type { Gender, Grade } from "@/lib/auth";

type Props = {
  userId: number;
  nickname: string;
  gender?: Gender | null;
  grade?: Grade | null;
  myUserId?: number | null;
  style?: CSSProperties;
};

export function UserNameActions({ userId, nickname, gender = null, grade = null, myUserId = null, style }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const showWithMe = myUserId == null || myUserId !== userId;
  const genderLabel = gender === "MALE" ? "남" : gender === "FEMALE" ? "여" : null;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }} style={{ ...nameBtn, ...style }}>
        <span style={tagPrimary}>{nickname}</span>
        {genderLabel && <span style={tagSecondary}>{genderLabel}</span>}
        {grade && <span style={tagSecondary}>{grade}</span>}
      </button>
      {open && (
        <div style={menu} onClick={(e) => e.stopPropagation()}>
          <Link href={`/users/${userId}/record`} style={menuItem} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
            개인 기록 보기
          </Link>
          {showWithMe && (
            <Link href={`/users/${userId}/record/with-me`} style={menuItem} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
              나와의 전적 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const nameBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--ink)",
  cursor: "pointer",
  padding: 0,
  textAlign: "left",
  fontSize: "inherit",
  fontWeight: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  lineHeight: 1.25,
};

const tagPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(142,178,255,0.42)",
  background: "linear-gradient(180deg, rgba(91,140,255,0.22), rgba(91,140,255,0.10))",
  color: "var(--ink)",
  fontWeight: 700,
  fontSize: "inherit",
};

const tagSecondary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 7px",
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  background: "rgba(255,255,255,0.06)",
  color: "var(--ink-secondary)",
  fontWeight: 700,
  fontSize: "inherit",
};

const menu: CSSProperties = {
  position: "absolute",
  left: 0,
  top: "calc(100% + 6px)",
  minWidth: 180,
  zIndex: 50,
  background: "var(--surface)",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
};

const menuItem: CSSProperties = {
  display: "block",
  padding: "10px 12px",
  textDecoration: "none",
  color: "var(--ink)",
  fontSize: 13,
  fontWeight: 700,
};
