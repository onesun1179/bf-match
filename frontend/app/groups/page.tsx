"use client";

import Link from "next/link";
import {CSSProperties} from "react";

export default function GroupsHomePage() {
  return (
    <main style={main}>
      <section style={sec}>
        <div>
          <Link href="/" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 홈</Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>이벤트</h1>
        </div>

        <Link href="/groups/create" style={{ textDecoration: "none" }}>
          <div style={card}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>새 이벤트 만들기</p>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>이벤트 이름, 설명, 공개 범위를 설정합니다</p>
          </div>
        </Link>

        <Link href="/groups/list" style={{ textDecoration: "none" }}>
          <div style={card}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>내 이벤트 목록</p>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>참여 중인 이벤트을 보고 관리합니다</p>
          </div>
        </Link>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 480, margin: "0 auto", display: "grid", gap: 14 };
const card: CSSProperties = { padding: "18px 22px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", cursor: "pointer", transition: "border-color .15s" };
