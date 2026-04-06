"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import {
  displayName,
  fetchMe,
  fetchUnreadCount,
  getAccessToken,
  logout,
  refreshAccessToken,
  registerFcmToken,
  upgradeGrade,
  type MeResponse,
} from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";
import { requestFcmToken } from "@/lib/firebase";

type ViewState = { loading: boolean; me: MeResponse | null; error: string | null };

export function HomePageClient() {
  const router = useRouter();
  const [v, setV] = useState<ViewState>({ loading: true, me: null, error: null });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await fetchMe();
        if (!me.onboardingCompleted) { router.replace("/onboarding"); return; }
        setV({ loading: false, me, error: null });
        setUnread(await fetchUnreadCount());
        // FCM 토큰 등록
        requestFcmToken().then((token) => { if (token) void registerFcmToken(token); }).catch(() => {});
      } catch { setV({ loading: false, me: null, error: null }); }
    })();
  }, []);

  async function handleLogout() {
    await logout();
    setV({ loading: false, me: null, error: null });
  }

  return (
    <main style={main}>
      <section style={section}>
        {/* Hero */}
        <div style={hero}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "grid", placeItems: "center", fontSize: 18 }}>
              {"\u{1F3F8}"}
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>BF Match</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            배드민턴 이벤트과 번개를<br />더 정확하게 연결합니다
          </h1>
          <p style={{ margin: "12px 0 0", color: "var(--ink-secondary)", fontSize: 15, lineHeight: 1.6 }}>
            전국 급수와 경험치(EXP)를 함께 반영해서 같은 급수 안에서도 더 잘 맞는 사람을 찾아줍니다.
          </p>
        </div>

        {/* Auth */}
        {v.loading && <p style={{ margin: 0, color: "var(--muted)", textAlign: "center", padding: 32 }}>로딩 중...</p>}

        {!v.loading && v.me && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{displayName(v.me.nickname, v.me.gender, v.me.skill?.nationalGrade)}</p>
                {v.me.email && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{v.me.email}</p>}
              </div>
              <button type="button" onClick={() => { void handleLogout(); }} style={btnGhost}>로그아웃</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {v.me.skill && <span style={{ ...chip, background: "rgba(108,92,231,0.15)", color: "var(--brand-light)" }}>{v.me.skill.nationalGrade} / LV {v.me.skill.lv}</span>}
            </div>
            {v.me.skill && (
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--surface-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>경험치</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--surface-2)" }}>
                    <div style={{ width: `${v.me.skill.exp}%`, height: "100%", borderRadius: 4, background: "var(--accent)", transition: "width .3s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-secondary)", flexShrink: 0 }}>{v.me.skill.exp}%</span>
                </div>
                {v.me.skill.canUpgradeGrade && (
                  <button
                    type="button"
                    onClick={async () => { try { const me = await upgradeGrade(); setV({ loading: false, me, error: null }); } catch (err) { setV((p) => ({ ...p, error: err instanceof Error ? err.message : "업그레이드 실패" })); } }}
                    style={{ ...btnPrimary, marginTop: 10, background: "var(--accent)", fontSize: 14, minHeight: 40, width: "100%" }}
                  >
                    급수 업그레이드
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!v.loading && !v.me && (
          <div style={{ ...card, gap: 12 }}>
            <p style={{ margin: 0, color: "var(--ink-secondary)", fontSize: 15, textAlign: "center" }}>시작하려면 로그인하세요</p>
            <Link href="/auth/login" style={btnPrimary}>로그인</Link>
            <Link href="/auth/register" style={btnSecondary}>회원가입</Link>
          </div>
        )}

        {v.error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{v.error}</p>}

      </section>

      {/* Bottom Bar */}
      {!v.loading && v.me && (
        <BottomNavMain active="home" unreadCount={unread} />
      )}
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const section: CSSProperties = { maxWidth: 480, margin: "0 auto", display: "grid", gap: 16 };
const hero: CSSProperties = { padding: "28px 24px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", backdropFilter: "blur(20px)" };
const card: CSSProperties = { padding: "20px 22px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 8 };
const chip: CSSProperties = { padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)" };
const btnPrimary: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: "var(--radius-md)", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, border: 0, cursor: "pointer", textDecoration: "none", transition: "opacity .15s" };
const btnSecondary: CSSProperties = { ...btnPrimary, background: "var(--surface-3)", color: "var(--ink)" };
const btnGhost: CSSProperties = { padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-2)", background: "transparent", color: "var(--ink-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
