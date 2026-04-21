"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useEffect, useState} from "react";
import {isAppsInTossEnvironment, loginLocal, loginWithTossApp} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isTossEnv, setIsTossEnv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void isAppsInTossEnvironment().then(setIsTossEnv).catch(() => setIsTossEnv(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginLocal(username.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={main}>
      <section style={section}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--brand)", display: "inline-grid", placeItems: "center", fontSize: 24, marginBottom: 16 }}>{"\u{1F3F8}"}</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>로그인</h1>
        </div>

        <div style={card}>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디" required minLength={2} style={input} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required minLength={4} style={input} />
            <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? "로그인 중..." : "로그인"}</button>
          </form>

          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}

          {isTossEnv && (
            <>
              <div style={divider}><span style={dividerText}>또는</span></div>
              <button
                type="button"
                style={btnKakao}
                onClick={() => {
                  setSubmitting(true);
                  setError(null);
                  void (async () => {
                    try {
                      await loginWithTossApp();
                      router.replace("/");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "토스 로그인에 실패했습니다.");
                    } finally {
                      setSubmitting(false);
                    }
                  })();
                }}
              >
                토스로 로그인
              </button>
            </>
          )}
        </div>

        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
          계정이 없으신가요?{" "}
          <Link href="/auth/register" style={{ color: "var(--brand-light)", fontWeight: 700 }}>회원가입</Link>
        </p>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px", display: "grid", alignContent: "center" };
const section: CSSProperties = { maxWidth: 400, width: "100%", margin: "0 auto", display: "grid", gap: 20 };
const card: CSSProperties = { padding: "24px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 16 };
const input: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", padding: "0 16px", fontSize: 15, background: "var(--surface-2)", color: "var(--ink)", outline: "none" };
const btnPrimary: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnKakao: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--kakao)", color: "#191919", fontWeight: 700, fontSize: 15, textDecoration: "none", cursor: "pointer" };
const divider: CSSProperties = { display: "flex", alignItems: "center", gap: 16 };
const dividerText: CSSProperties = { flex: "none", fontSize: 13, color: "var(--muted)", padding: "0 4px" };
