"use client";

import styled from "@emotion/styled";
import {CSSProperties} from "react";
import type {Gender, Grade} from "@/lib/auth";

type Props = {
  nickname: string;
  gender?: Gender | null;
  grade?: Grade | null;
  lv?: number | null;
  style?: CSSProperties;
};

export function UserInfoChip({ nickname, gender = null, grade = null, lv = null, style }: Props) {
  const text = `${levelLabel(lv, grade)} ${nickname}`;
  const tone = gender === "MALE" || gender === "FEMALE" ? "accent" : "neutral";

  return <Chip $tone={tone} style={style} title={text}>{text}</Chip>;
}

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

const Chip = styled.span<{$tone: "neutral" | "accent"}>`
  display: inline-block;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid ${({$tone}) => $tone === "accent" ? "rgba(0, 102, 204, 0.28)" : "var(--hairline)"};
  background: var(--surface-3);
  color: var(--ink);
  font-weight: 600;
  font-size: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
`;
