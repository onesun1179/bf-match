"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import {
  fetchMe,
  fetchNotificationPreferences,
  getAccessToken,
  refreshAccessToken,
  updateNotificationPreferences,
  updateNotificationSetting,
} from "@/lib/auth";
import {
  defaultNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

const notificationItems: { key: NotificationPreferenceKey; title: string; description: string }[] = [
  {
    key: "inviteAccepted",
    title: "초대 수락",
    description: "내가 보낸 이벤트 초대가 수락되었을 때 알림",
  },
  {
    key: "inviteDeclined",
    title: "초대 거절",
    description: "내가 보낸 이벤트 초대가 거절되었을 때 알림",
  },
  {
    key: "memberJoined",
    title: "멤버 참여",
    description: "이벤트에 새로운 멤버가 참여했을 때 알림",
  },
  {
    key: "memberKicked",
    title: "강퇴 알림",
    description: "이벤트에서 강퇴되었을 때 알림",
  },
  {
    key: "groupUpdated",
    title: "이벤트 정보 변경",
    description: "이벤트 정보가 수정되었을 때 알림",
  },
  {
    key: "gradeUpgraded",
    title: "급수 승급",
    description: "내 전국 급수가 승급되었을 때 알림",
  },
  {
    key: "gameCreated",
    title: "게임 생성",
    description: "내가 포함된 새로운 게임이 생성되었을 때 알림",
  },
  {
    key: "gameStarted",
    title: "게임 시작",
    description: "이벤트 내 게임이 시작되었을 때 알림 (코트 번호 포함)",
  },
  {
    key: "gameFinished",
    title: "게임 종료",
    description: "내가 포함된 게임이 종료되었을 때 알림",
  },
  {
    key: "gameProposalReceived",
    title: "게임 제안 도착",
    description: "관리자에게 새로운 게임 제안이 도착했을 때 알림",
  },
  {
    key: "gameProposalApproved",
    title: "게임 제안 수락",
    description: "내가 제안한/참여한 게임 제안이 수락되었을 때 알림",
  },
  {
    key: "gameProposalRejected",
    title: "게임 제안 거절",
    description: "내가 제안한 게임이 거절되었을 때 알림",
  },
  {
    key: "gameScoreRequested",
    title: "점수 확인 요청",
    description: "상대 팀이 점수 확인을 요청했을 때 알림",
  },
  {
    key: "gameScoreConfirmed",
    title: "점수 확정",
    description: "내가 요청한 점수가 상대 팀 확인으로 확정되었을 때 알림",
  },
  {
    key: "gameScoreRejected",
    title: "점수 반려",
    description: "내가 요청한 점수가 반려되어 재입력이 필요할 때 알림",
  },
];

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const [me, prefs] = await Promise.all([fetchMe(), fetchNotificationPreferences()]);
        setGlobalEnabled(me.notificationEnabled);
        setPreferences(prefs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleGlobal() {
    try {
      const me = await updateNotificationSetting(!globalEnabled);
      setGlobalEnabled(me.notificationEnabled);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전체 알림 설정 변경 실패");
    }
  }

  async function toggleItem(key: NotificationPreferenceKey) {
    const nextValue = !preferences[key];
    const prev = preferences;
    const next = { ...preferences, [key]: nextValue };
    setPreferences(next);
    try {
      const saved = await updateNotificationPreferences({ [key]: nextValue });
      setPreferences(saved);
      setError(null);
    } catch (e) {
      setPreferences(prev);
      setError(e instanceof Error ? e.message : "항목 알림 설정 변경 실패");
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 80px" }}>
      <section style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontWeight: 700 }}>설정 &gt; 알림 관리</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 30, fontWeight: 800 }}>알림 관리</h1>
          <p style={{ margin: 0, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
            현재 제공되는 알림 항목을 확인하고 항목별로 ON/OFF를 설정할 수 있습니다.
          </p>
          <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
            <Link href="/settings" style={{ color: "var(--brand-light)", fontWeight: 700 }}>
              설정으로
            </Link>
            <Link href="/" style={{ color: "var(--brand-light)", fontWeight: 700 }}>
              홈으로
            </Link>
          </div>
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>전체 알림 수신</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                서버 저장 설정. OFF면 알림 수신이 전체 중단됩니다.
              </p>
            </div>
            <button type="button" onClick={() => { void toggleGlobal(); }} style={{ ...toggleBtn, background: globalEnabled ? "var(--brand)" : "var(--surface-3)" }}>
              <span style={{ ...toggleDot, transform: globalEnabled ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ margin: 0, fontSize: 18 }}>알림 항목별 설정</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            항목별 설정은 서버 DB에 저장됩니다.
          </p>
          {!loading &&
            notificationItems.map((item) => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{item.title}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void toggleItem(item.key);
                  }}
                  style={{ ...toggleBtn, background: preferences[item.key] ? "var(--brand)" : "var(--surface-3)" }}
                >
                  <span style={{ ...toggleDot, transform: preferences[item.key] ? "translateX(20px)" : "translateX(0)" }} />
                </button>
              </div>
            ))}
        </div>

        {error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{error}</p> : null}
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

const toggleBtn: CSSProperties = {
  width: 44,
  height: 24,
  borderRadius: 12,
  border: 0,
  padding: 2,
  cursor: "pointer",
  position: "relative",
  transition: "background .2s",
  flexShrink: 0,
};

const toggleDot: CSSProperties = {
  display: "block",
  width: 20,
  height: 20,
  borderRadius: 10,
  background: "#fff",
  transition: "transform .2s",
};
