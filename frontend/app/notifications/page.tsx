"use client";

import {useRouter} from "next/navigation";
import {CSSProperties, useEffect, useState} from "react";
import {
    type AppNotification,
    fetchNotifications,
    getAccessToken,
    markAllNotificationsRead,
    markNotificationRead,
    refreshAccessToken,
} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        setNotifications(await fetchNotifications());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleClick(n: AppNotification) {
    if (!n.isRead) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
    }
    if (n.targetType === "GROUP" && n.targetId) router.push(`/groups/${n.targetId}`);
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
  }

  return (
    <main style={main}>
      <section style={sec}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>알림</h1>
          {notifications.some((n) => !n.isRead) && (
            <button onClick={() => { void handleReadAll(); }} style={btnGhost}>모두 읽음</button>
          )}
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && notifications.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
            <p style={{ margin: 0, fontSize: 36 }}>{"\u{1F514}"}</p>
            <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 15 }}>알림이 없습니다</p>
          </div>
        )}

        {notifications.map((n) => (
          <button key={n.id} onClick={() => { void handleClick(n); }} style={{ ...nCard, opacity: n.isRead ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{n.title}</p>
              {!n.isRead && <span style={dot} />}
            </div>
            <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: 14, lineHeight: 1.4 }}>{n.body}</p>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>{new Date(n.createdAt).toLocaleString("ko-KR")}</p>
          </button>
        ))}
      </section>

      <BottomNavMain active="notifications" />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 12 };
const card: CSSProperties = { padding: "20px 22px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid" };
const nCard: CSSProperties = { width: "100%", textAlign: "left", padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", cursor: "pointer", display: "block" };
const dot: CSSProperties = { width: 8, height: 8, borderRadius: 4, background: "var(--brand)", flexShrink: 0, marginTop: 6 };
const btnGhost: CSSProperties = { padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-2)", background: "transparent", color: "var(--ink-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
