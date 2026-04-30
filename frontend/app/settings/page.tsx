"use client";

import Link from "next/link";
import {CSSProperties} from "react";

export default function SettingsPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 80px" }}>
      <section style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontWeight: 700 }}>설정</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 30, fontWeight: 800 }}>설정 항목</h1>
          <p style={{ margin: 0, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
            설정 메뉴를 선택해 기능별 관리 화면으로 이동하세요.
          </p>
          <div style={{ marginTop: 10 }}>
            <Link href="/" style={{ color: "var(--brand-light)", fontWeight: 700 }}>
              홈으로 돌아가기
            </Link>
          </div>
        </div>

        <Link href="/settings/notifications" style={itemLink}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>알림 관리</p>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
              전체 알림 on/off와 항목별 알림 설정을 관리합니다.
            </p>
          </div>
          <span style={{ color: "var(--brand-light)", fontWeight: 700 }}>이동</span>
        </Link>

        <Link href="/settings/account" style={itemLink}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>계정 및 보안</p>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
              닉네임과 비밀번호를 관리합니다.
            </p>
          </div>
          <span style={{ color: "var(--brand-light)", fontWeight: 700 }}>이동</span>
        </Link>
      </section>
    </main>
  );
}

const hero: CSSProperties = {
  padding: "22px 20px",
  borderRadius: 20,
  background: "var(--surface)",
  border: "1px solid var(--line)",
};

const card: CSSProperties = {
  padding: "18px 20px",
  borderRadius: 20,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 8,
};

const itemLink: CSSProperties = {
  ...card,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  textDecoration: "none",
};
