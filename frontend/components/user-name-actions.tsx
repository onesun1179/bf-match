"use client";

import Link from "next/link";
import {CSSProperties, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import type {Gender, Grade} from "@/lib/auth";
import {UserInfoChip} from "@/components/user-info-chip";

type Props = {
  userId: number;
  nickname: string;
  gender?: Gender | null;
  grade?: Grade | null;
  lv?: number | null;
  myUserId?: number | null;
  style?: CSSProperties;
};

export function UserNameActions({ userId, nickname, gender = null, grade = null, lv = null, myUserId = null, style }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const clickedChip = wrapRef.current?.contains(target) ?? false;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      if (!clickedChip && !clickedMenu) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevBodyOverscrollBehavior = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.touchAction = prevBodyTouchAction;
      document.body.style.overscrollBehavior = prevBodyOverscrollBehavior;
    };
  }, [open]);

  const showWithMe = myUserId == null || myUserId !== userId;
  const chipText = `${levelLabel(lv, grade)} ${nickname}`;
  const chipTone = gender === "MALE" ? maleTone : gender === "FEMALE" ? femaleTone : neutralTone;

  function handleChipPointer(e: { preventDefault: () => void; stopPropagation: () => void }) {
    // This component is often rendered inside a parent Link card.
    // Prevent the parent navigation and keep the action menu interaction local.
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  }

  const dialog = (
    <>
      <div style={backdrop} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
      <div style={menuWrap} onClick={(e) => e.stopPropagation()}>
        <div ref={menuRef} style={menu}>
          <div style={menuHeader}>
            <UserInfoChip nickname={nickname} gender={gender} grade={grade} lv={lv} style={{ fontSize: 13 }} />
          </div>
          <Link href={`/users/${userId}/record`} style={menuItem} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
            개인 기록 보기
          </Link>
          {showWithMe && (
            <Link href={`/users/${userId}/record/with-me`} style={menuItem} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
              나와의 전적 보기
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-block", maxWidth: "100%", verticalAlign: "top" }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={handleChipPointer}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleChipPointer(e);
          }
        }}
        style={{ ...nameBtn, ...style }}
      >
        <span style={{ ...tagUnified, ...chipTone }}>{chipText}</span>
      </button>
      {open && mounted ? createPortal(dialog, document.body) : null}
    </span>
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
  lineHeight: 1.25,
  maxWidth: "100%",
  minWidth: 0,
};

const tagUnified: CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  color: "var(--ink)",
  fontWeight: 700,
  fontSize: "inherit",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const neutralTone: CSSProperties = {
  border: "1px solid rgba(173,193,230,0.36)",
  background: "linear-gradient(180deg, rgba(173,193,230,0.14), rgba(173,193,230,0.06))",
};

const maleTone: CSSProperties = {
  border: "1px solid rgba(91,140,255,0.45)",
  background: "linear-gradient(180deg, rgba(91,140,255,0.24), rgba(91,140,255,0.10))",
};

const femaleTone: CSSProperties = {
  border: "1px solid rgba(255,109,179,0.42)",
  background: "linear-gradient(180deg, rgba(255,109,179,0.22), rgba(255,109,179,0.10))",
};

const menuWrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const menu: CSSProperties = {
  position: "relative",
  width: "min(320px, calc(100vw - 16px))",
  maxHeight: "min(70vh, 420px)",
  background: "var(--surface)",
  border: "1px solid var(--line-2)",
  borderRadius: 14,
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
  boxShadow: "var(--shadow-lg)",
};

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(3, 8, 18, 0.34)",
  zIndex: 1999,
};

const menuHeader: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--line)",
  fontSize: 13,
  fontWeight: 800,
  color: "var(--ink-secondary)",
  background: "var(--surface-2)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const menuItem: CSSProperties = {
  display: "block",
  padding: "10px 12px",
  textDecoration: "none",
  color: "var(--ink)",
  fontSize: 13,
  fontWeight: 700,
};

function levelLabel(lv: number | null, grade: Grade | null): string {
  if (lv != null && Number.isFinite(lv)) return `Lv ${Math.max(1, Math.floor(lv))}`;
  const initialLvByGrade: Record<Grade, number> = {
    F: 1,
    E: 2,
    D: 3,
    C: 4,
    B: 5,
    A: 6,
    S: 7,
  };
  if (grade) return `Lv ${initialLvByGrade[grade]}`;
  return "Lv -";
}
