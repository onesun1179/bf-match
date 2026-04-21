"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {CSSProperties, useEffect, useState} from "react";
import {fetchInviteHistory, getAccessToken, type InviteHistory, refreshAccessToken} from "@/lib/auth";

export default function InviteHistoryPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);
  const [history, setHistory] = useState<InviteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        setHistory(await fetchInviteHistory(groupId));
      } catch (err) { setError(err instanceof Error ? err.message : "초대 이력을 불러오지 못했습니다."); }
      finally { setLoading(false); }
    })();
  }, [groupId]);

  function statusInfo(s: string): { label: string; bg: string; fg: string } {
    switch (s) {
      case "ACCEPTED": return { label: "승인", bg: "var(--success-bg)", fg: "var(--success)" };
      case "DECLINED": return { label: "거절", bg: "var(--danger-bg)", fg: "var(--danger)" };
      case "EXPIRED": return { label: "만료", bg: "var(--warning-bg)", fg: "var(--warning)" };
      default: return { label: "대기", bg: "var(--surface-3)", fg: "var(--ink-secondary)" };
    }
  }

  return (
    <main style={main}>
      <section style={sec}>
        <div>
          <Link href={`/groups/${groupId}`} style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 상세</Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>초대 이력</h1>
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && history.length === 0 && !error && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>초대 이력이 없습니다</p>
          </div>
        )}

        {history.map((h) => {
          const si = statusInfo(h.status);
          return (
            <div key={h.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{h.inviterNickname}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: si.bg, color: si.fg }}>{si.label}</span>
              </div>
              <p style={meta}>초대: {new Date(h.createdAt).toLocaleString("ko-KR")}</p>
              {h.acceptedByNickname && <p style={meta}>{h.status === "DECLINED" ? "거절자" : "승인자"}: {h.acceptedByNickname}{h.acceptedAt && ` / ${new Date(h.acceptedAt).toLocaleString("ko-KR")}`}</p>}
              {h.declineReason && (
                <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--danger-bg)", border: "1px solid rgba(255,107,107,0.2)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>사유: {h.declineReason}</p>
                </div>
              )}
              <p style={{ ...meta, color: "var(--muted)" }}>만료: {new Date(h.expiresAt).toLocaleString("ko-KR")}</p>
            </div>
          );
        })}

        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 };
const card: CSSProperties = { padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 6 };
const meta: CSSProperties = { margin: 0, color: "var(--ink-secondary)", fontSize: 13 };
