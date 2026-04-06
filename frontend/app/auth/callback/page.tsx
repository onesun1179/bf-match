"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await refreshAccessToken();
        const redirect = sessionStorage.getItem("bf-match.join-redirect");
        if (redirect) { sessionStorage.removeItem("bf-match.join-redirect"); router.replace(redirect); }
        else router.replace("/");
      } catch (err) { setError(err instanceof Error ? err.message : "로그인 상태를 불러오지 못했습니다."); }
    })();
  }, [router]);

  return (
    <main style={main}>
      <div style={card}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--brand)", display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto" }}>{"\u{1F3F8}"}</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, textAlign: "center" }}>로그인 완료</h1>
        {!error && <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, textAlign: "center" }}>잠시 후 이동합니다...</p>}
        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
      </div>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 };
const card: CSSProperties = { maxWidth: 400, width: "100%", padding: "40px 28px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 16 };
