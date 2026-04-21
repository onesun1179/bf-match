"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import {
  fetchMe,
  fetchUnreadCount,
  getAccessToken,
  isAppsInTossEnvironment,
  loginWithTossApp,
  logout,
  refreshAccessToken,
  registerFcmToken,
  type MeResponse,
} from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";
import { UserNameActions } from "@/components/user-name-actions";
import { requestFcmToken } from "@/lib/firebase";

type ViewState = { loading: boolean; me: MeResponse | null; error: string | null };

export function HomePageClient() {
  const router = useRouter();
  const [v, setV] = useState<ViewState>({ loading: true, me: null, error: null });
  const [unread, setUnread] = useState(0);
  const [showExpGuide, setShowExpGuide] = useState(false);
  const [isTossEnv, setIsTossEnv] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tossEnv = await isAppsInTossEnvironment();
        setIsTossEnv(tossEnv);
        if (!getAccessToken()) {
          await refreshAccessToken();
        }
        const me = await fetchMe();
        if (!me.onboardingCompleted) { router.replace("/onboarding"); return; }
        setV({ loading: false, me, error: null });
        setUnread(await fetchUnreadCount());
        // FCM 토큰 등록
        requestFcmToken().then((token) => { if (token) void registerFcmToken(token); }).catch(() => {});
      } catch {
        setV({ loading: false, me: null, error: null });
      }
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
          <div style={heroGlowA} />
          <div style={heroGlowB} />
          <div style={heroTop}>
            <div style={brandBadge}>BF MATCH</div>
            <span style={heroGhostTag}>MATCH HUB</span>
          </div>
          <h1 style={{ margin: "14px 0 0", fontSize: 34, fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.04em", color: "#EEF3FF", textShadow: "0 2px 14px rgba(0,0,0,0.35)" }}>
            오늘 칠 사람,
            <br />
            실력 맞게 바로 찾기
          </h1>
          <p style={{ margin: "12px 0 0", color: "#D6E0F6", fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
            급수 + 경험치를 함께 반영해서
            이벤트, 팀, 게임 제안까지 한 흐름으로 연결합니다.
          </p>
          <div style={heroStatsRow}>
            <StatPill label="등급 기반" value="F~S" />
            <StatPill label="팀 매칭" value="2:2" />
            <StatPill label="기록 추적" value="실시간" />
          </div>
        </div>

        {/* Auth */}
        {v.loading && <p style={{ margin: 0, color: "var(--muted)", textAlign: "center", padding: 32 }}>로딩 중...</p>}

        {!v.loading && v.me && (
          <div style={cardMain}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <UserNameActions
                  userId={v.me.id}
                  nickname={v.me.nickname}
                  gender={v.me.gender}
                  grade={v.me.skill?.nationalGrade ?? null}
                  lv={v.me.skill?.lv ?? null}
                  myUserId={v.me.id}
                  style={{ margin: 0, fontWeight: 700, fontSize: 18 }}
                />
                {v.me.email && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{v.me.email}</p>}
              </div>
              <button type="button" onClick={() => { void handleLogout(); }} style={btnGhost}>로그아웃</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
              <QuickMetric title="읽지 않음" value={`${unread}`} />
              <QuickMetric
                title="다음 LV까지"
                value={v.me.skill ? `${Math.max(0, 100 - v.me.skill.exp).toFixed(1)} EXP` : "-"}
              />
              <QuickMetric
                title="오늘 경기"
                value="기록 누적"
              />
            </div>
            {v.me.skill && (
              <div style={xpWrap}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>경험치</span>
                  <button
                    type="button"
                    aria-label="경험치 습득량 안내"
                    onClick={() => setShowExpGuide(true)}
                    style={expInfoBtn}
                  >
                    i
                  </button>
                  <div style={xpTrack}>
                    <div style={{ ...xpFill, width: `${v.me.skill.exp}%` }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-secondary)", flexShrink: 0 }}>{v.me.skill.exp}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {!v.loading && !v.me && (
          <div style={{ ...cardMain, gap: 12 }}>
            <p style={{ margin: 0, color: "var(--ink)", fontSize: 15, textAlign: "center", fontWeight: 600 }}>
              로그인이 필요합니다
            </p>
            {isTossEnv && (
              <button
                type="button"
                style={btnPrimary}
                onClick={() => {
                  setV({ loading: true, me: null, error: null });
                  void (async () => {
                    try {
                      await loginWithTossApp();
                      const me = await fetchMe();
                      if (!me.onboardingCompleted) {
                        router.replace("/onboarding");
                        return;
                      }
                      setV({ loading: false, me, error: null });
                    } catch {
                      setV({ loading: false, me: null, error: "자동 로그인에 실패했습니다. 다시 시도해주세요." });
                    }
                  })();
                }}
              >
                토스로 로그인
              </button>
            )}
            <button
              type="button"
              style={btnSecondary}
              onClick={() => router.push("/auth/login")}
            >
              ID / 비밀번호 로그인
            </button>
          </div>
        )}

        {v.error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{v.error}</p>}

      </section>

      {/* Bottom Bar */}
      {!v.loading && v.me && (
        <BottomNavMain active="home" unreadCount={unread} />
      )}

      {showExpGuide && v.me?.skill && (
        <div style={overlay} onClick={() => setShowExpGuide(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>EXP 습득량 안내</h2>
              <button type="button" onClick={() => setShowExpGuide(false)} style={dialogCloseBtn} aria-label="닫기">
                ×
              </button>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-secondary)" }}>
              동일 LV 상대 승리 1회 기준 {calculateWinExp(v.me.skill.lv, v.me.skill.lv, v.me.skill.lv).toFixed(3)} EXP
              {" "}· 약 500승 시 LV +1
            </p>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <ExpGuideRow
                label="하위 상대 승리"
                value={calculateWinExp(v.me.skill.lv, v.me.skill.lv, Math.max(1, v.me.skill.lv - 2))}
              />
              <ExpGuideRow
                label="동급 매치 승리"
                value={calculateWinExp(v.me.skill.lv, v.me.skill.lv, v.me.skill.lv)}
              />
              <ExpGuideRow
                label="상위 상대 승리"
                value={calculateWinExp(v.me.skill.lv, v.me.skill.lv, v.me.skill.lv + 2)}
              />
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
              자유게임(FREE)은 EXP가 오르지 않습니다. 100.0 EXP 도달 시 LV가 1 상승합니다.
              파트너 LV, 상대 평균 LV를 함께 반영하며 점수 수정/취소 시 자동 재계산됩니다.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const section: CSSProperties = { maxWidth: 480, margin: "0 auto", display: "grid", gap: 16 };
const hero: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "20px 20px 18px",
  borderRadius: "var(--radius-xl)",
  background: "linear-gradient(145deg, rgba(13,20,36,0.96), rgba(9,14,26,0.92))",
  border: "1px solid rgba(173, 193, 230, 0.26)",
  boxShadow: "0 18px 48px rgba(2,6,16,0.42)",
  backdropFilter: "blur(24px)",
};
const heroTop: CSSProperties = { position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const brandBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 30,
  padding: "0 10px",
  borderRadius: 999,
  background: "rgba(91, 140, 255, 0.16)",
  border: "1px solid rgba(142, 178, 255, 0.4)",
  color: "var(--brand-light)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
};
const heroGhostTag: CSSProperties = {
  height: 30,
  padding: "0 11px",
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  color: "var(--ink-secondary)",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};
const heroGlowA: CSSProperties = {
  position: "absolute",
  width: 220,
  height: 220,
  borderRadius: 999,
  top: -120,
  right: -70,
  background: "radial-gradient(circle, rgba(91,140,255,0.35), rgba(91,140,255,0))",
};
const heroGlowB: CSSProperties = {
  position: "absolute",
  width: 180,
  height: 180,
  borderRadius: 999,
  bottom: -100,
  left: -50,
  background: "radial-gradient(circle, rgba(24,210,182,0.24), rgba(24,210,182,0))",
};
const heroStatsRow: CSSProperties = { position: "relative", zIndex: 2, marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" };
const cardMain: CSSProperties = {
  padding: "18px 18px 16px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.00)), var(--glass)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--shadow)",
  display: "grid",
  gap: 10,
};
const btnPrimary: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: "var(--radius-md)", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, border: 0, cursor: "pointer", textDecoration: "none", transition: "opacity .15s" };
const btnSecondary: CSSProperties = { ...btnPrimary, background: "var(--surface-3)", color: "var(--ink)" };
const btnGhost: CSSProperties = { padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-2)", background: "rgba(255,255,255,0.02)", color: "var(--ink-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0 };
const xpWrap: CSSProperties = {
  padding: "12px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0)), var(--surface-2)",
};
const xpTrack: CSSProperties = { flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" };
const xpFill: CSSProperties = { height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--accent), #44e3cc)", transition: "width .35s ease" };
const expInfoBtn: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  background: "var(--surface-2)",
  color: "var(--ink-secondary)",
  fontSize: 11,
  fontWeight: 800,
  padding: 0,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(3, 8, 18, 0.46)",
  zIndex: 2500,
  display: "grid",
  placeItems: "center",
  padding: 16,
};
const dialog: CSSProperties = {
  width: "min(360px, calc(100vw - 18px))",
  borderRadius: 16,
  background: "var(--surface)",
  border: "1px solid var(--line-2)",
  boxShadow: "var(--shadow-lg)",
  padding: "14px 14px 12px",
};
const dialogCloseBtn: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  background: "var(--surface-2)",
  color: "var(--ink-secondary)",
  fontSize: 18,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(7,12,22,0.56)" }}>
      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 800 }}>{value}</span>
    </span>
  );
}

function QuickMetric({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ borderRadius: 12, padding: "10px 8px", background: "var(--surface-2)", border: "1px solid var(--line)", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

function ExpGuideRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "8px 10px" }}>
      <span style={{ fontSize: 12, color: "var(--ink-secondary)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--brand-light)" }}>{value.toFixed(3)} EXP</span>
    </div>
  );
}

function calculateWinExp(myLv: number, partnerLv: number, avgOpponentLv: number): number {
  const baseExpPerWin = 100 / 500;
  const opponentGap = Math.max(-40, Math.min(40, avgOpponentLv - myLv));
  const partnerGap = Math.max(-40, Math.min(40, avgOpponentLv - partnerLv));

  const opponentMultiplier = Math.max(
    0.35,
    Math.min(3.2, opponentGap >= 0 ? 1 + opponentGap * 0.12 : 1 + opponentGap * 0.04),
  );
  const partnerMultiplier = Math.max(
    0.6,
    Math.min(2.2, partnerGap >= 0 ? 1 + partnerGap * 0.04 : 1 + partnerGap * 0.02),
  );
  const weighted = baseExpPerWin * opponentMultiplier * partnerMultiplier;
  return Math.max(0.03, Math.min(1.5, weighted));
}
