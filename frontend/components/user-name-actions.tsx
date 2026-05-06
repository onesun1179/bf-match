"use client";

import styled from "@emotion/styled";
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
  const chipTone = gender === "MALE" || gender === "FEMALE" ? "accent" : "neutral";

  function handleChipPointer(e: { preventDefault: () => void; stopPropagation: () => void }) {
    // This component is often rendered inside a parent Link card.
    // Prevent the parent navigation and keep the action menu interaction local.
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  }

  const dialog = (
    <>
      <Backdrop data-testid="user-actions-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
      <MenuWrap
        data-testid="user-actions-wrap"
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <Menu ref={menuRef}>
          <MenuHeader>
            <UserInfoChip nickname={nickname} gender={gender} grade={grade} lv={lv} style={{ fontSize: 13 }} />
            <CloseButton
              type="button"
              aria-label="액션 메뉴 닫기"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            >
              ✕
            </CloseButton>
          </MenuHeader>
          <MenuItem href={`/users/${userId}/record`} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
            개인 기록 보기
          </MenuItem>
          {showWithMe && (
            <MenuItem href={`/users/${userId}/record/with-me`} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
              나와의 전적 보기
            </MenuItem>
          )}
        </Menu>
      </MenuWrap>
    </>
  );

  return (
    <NameWrap
      ref={wrapRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <NameButton
        type="button"
        className="btn-hover"
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
        style={style}
      >
        <NameTag $tone={chipTone}>{chipText}</NameTag>
      </NameButton>
      {open && mounted ? createPortal(dialog, document.body) : null}
    </NameWrap>
  );
}

const NameWrap = styled.span`
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: top;
`;

const NameButton = styled.button`
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  padding: 0;
  text-align: left;
  font-size: inherit;
  font-weight: inherit;
  display: inline-flex;
  align-items: center;
  line-height: 1.25;
  max-width: 100%;
  min-width: 0;
`;

const NameTag = styled.span<{$tone: "neutral" | "accent"}>`
  display: inline-block;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid ${({$tone}) => $tone === "accent" ? "rgba(0, 102, 204, 0.28)" : "var(--hairline)"};
  background: var(--surface-3);
  color: var(--ink);
  font-size: inherit;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.18s ease;
`;

const MenuWrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 16px;
`;

const Menu = styled.div`
  position: relative;
  width: min(320px, calc(100vw - 16px));
  max-height: min(70vh, 420px);
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  animation: fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.34);
  z-index: 1999;
`;

const MenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink-secondary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CloseButton = styled.button`
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line-2);
  background: var(--surface-3);
  color: var(--muted);
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  cursor: pointer;
`;

const MenuItem = styled(Link)`
  display: block;
  padding: 10px 12px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
`;

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
