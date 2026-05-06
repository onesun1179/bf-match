"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import {
  fetchMe,
  fetchUnreadCount,
  getAccessToken,
  getKakaoLoginUrl,
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

  useEffect(() => {
    (async () => {
      try {
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
          <div style={heroTop}>
            <div style={brandBadge}>BF MATCH</div>
            <span style={heroGhostTag}>MATCH HUB</span>
          </div>
          <h1 style={{ margin: "34px 0 0", fontSize: 40, fontWeight: 600, lineHeight: 1.1, letterSpacing: 0, color: "var(--on-dark)" }}>
            오늘 칠 사람,
            <br />
            실력 맞게 <span style={{ color: "var(--primary-on-dark)" }}>바로 찾기</span>
          </h1>
          <p style={{ margin: "14px 0 0", color: "var(--body-muted, #cccccc)", fontSize: 17, lineHeight: 1.47, maxWidth: 330 }}>
            급수 + 경험치를 함께 반영해서
            이벤트, 팀, 게임 제안까지 한 흐름으로 연결합니다.
          </p>
          <div aria-hidden="true" style={heroCourt}>
            <div style={courtNet} />
            <div style={courtLineA} />
            <div style={courtLineB} />
            <div style={shuttleMark}>BF</div>
          </div>
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
                  style={{ margin: 0, fontWeight: 600, fontSize: 20 }}
                />
                {v.me.email && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{v.me.email}</p>}
              </div>
              <button type="button" onClick={() => { void handleLogout(); }} className="btn-hover" style={btnGhost}>로그아웃</button>
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
          <div className="glass-card animate-fade-in-up" style={{ ...cardMain, gap: 16 }}>
            <p style={{ margin: 0, color: "var(--ink)", fontSize: 17, textAlign: "center", fontWeight: 600 }}>
              로그인이 필요합니다
            </p>
            <a href={getKakaoLoginUrl()} className="btn-hover" style={{...btnPrimary, background: "var(--kakao)", color: "#191919"}}>
              카카오로 로그인
            </a>
            <button
              type="button"
              className="btn-hover"
              style={btnSecondary}
              onClick={() => router.push("/auth/login")}
            >
              이메일 / 비밀번호 로그인
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
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>EXP 습득량 안내</h2>
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
  minHeight: 430,
  margin: "-24px -16px 0",
  padding: "44px 28px 24px",
  borderRadius: 0,
  background: "var(--surface-tile-1)",
};
const heroTop: CSSProperties = { position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const brandBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "var(--primary)",
  border: "1px solid var(--primary)",
  color: "var(--on-primary)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0,
};
const heroGhostTag: CSSProperties = {
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.26)",
  color: "var(--body-muted, #cccccc)",
  fontSize: 12,
  fontWeight: 400,
  display: "inline-flex",
  alignItems: "center",
};
const heroCourt: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "min(320px, 86vw)",
  aspectRatio: "4 / 3",
  margin: "32px auto 0",
  border: "2px solid rgba(255, 255, 255, 0.62)",
  background: "var(--surface-tile-2)",
  boxShadow: "var(--product-shadow)",
};
const courtNet: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: 2,
  background: "rgba(255, 255, 255, 0.58)",
};
const courtLineA: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "30%",
  width: 2,
  background: "rgba(255, 255, 255, 0.34)",
};
const courtLineB: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  right: "30%",
  width: 2,
  background: "rgba(255, 255, 255, 0.34)",
};
const shuttleMark: CSSProperties = {
  position: "absolute",
  right: 18,
  bottom: 16,
  width: 54,
  height: 54,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "var(--canvas)",
  color: "var(--ink)",
  fontSize: 18,
  fontWeight: 600,
};
const heroStatsRow: CSSProperties = { position: "relative", zIndex: 2, marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" };
const cardMain: CSSProperties = {
  padding: "24px",
  borderRadius: "var(--radius-lg)",
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "none",
  display: "grid",
  gap: 12,
};
const btnPrimary: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: "var(--radius-pill)", background: "var(--brand)", color: "var(--on-primary)", fontWeight: 400, fontSize: 17, border: 0, cursor: "pointer", textDecoration: "none" };
const btnSecondary: CSSProperties = { ...btnPrimary, background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)" };
const btnGhost: CSSProperties = { padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-2)", background: "var(--surface-3)", color: "var(--ink-secondary)", fontWeight: 400, fontSize: 14, cursor: "pointer", flexShrink: 0 };
const xpWrap: CSSProperties = {
  padding: "12px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
};
const xpTrack: CSSProperties = { flex: 1, height: 10, borderRadius: 999, background: "var(--divider-soft)", overflow: "hidden" };
const xpFill: CSSProperties = { height: "100%", borderRadius: 999, background: "var(--brand)", transition: "width .35s ease" };
const expInfoBtn: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  background: "var(--surface-2)",
  color: "var(--ink-secondary)",
  fontSize: 11,
  fontWeight: 600,
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
  background: "rgba(0, 0, 0, 0.34)",
  zIndex: 2500,
  display: "grid",
  placeItems: "center",
  padding: 16,
};
const dialog: CSSProperties = {
  width: "min(360px, calc(100vw - 18px))",
  borderRadius: "var(--radius-lg)",
  background: "var(--surface)",
  border: "1px solid var(--line-2)",
  boxShadow: "none",
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 30, padding: "0 11px", borderRadius: 999, border: "1px solid rgba(255, 255, 255, 0.22)", background: "transparent" }}>
      <span style={{ fontSize: 11, color: "var(--body-muted, #cccccc)", fontWeight: 400 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--on-dark)", fontWeight: 600 }}>{value}</span>
    </span>
  );
}

function QuickMetric({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ borderRadius: "var(--radius-sm)", padding: "10px 8px", background: "var(--surface-2)", border: "1px solid var(--line)", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function ExpGuideRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", padding: "8px 10px" }}>
      <span style={{ fontSize: 12, color: "var(--ink-secondary)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)" }}>{value.toFixed(3)} EXP</span>
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
