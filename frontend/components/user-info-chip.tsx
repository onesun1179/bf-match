"use client";

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
  const tone = gender === "MALE" ? maleTone : gender === "FEMALE" ? femaleTone : neutralTone;

  return <span style={{ ...chip, ...tone, ...style }} title={text}>{text}</span>;
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

const chip: CSSProperties = {
  display: "inline-block",
  maxWidth: "100%",
  padding: "4px 10px",
  borderRadius: 999,
  color: "var(--ink)",
  fontWeight: 700,
  fontSize: "inherit",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  verticalAlign: "top",
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
