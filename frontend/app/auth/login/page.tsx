"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useState} from "react";
import {getKakaoLoginUrl, loginLocal, resetPassword} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await loginLocal(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await resetPassword(resetEmail.trim());
      setMessage("임시 비밀번호를 이메일로 전송했습니다.");
      setResetMode(false);
      setEmail(resetEmail.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 초기화에 실패했습니다.");
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
          {!resetMode ? (
            <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required style={input} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required minLength={4} style={input} />
              <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? "로그인 중..." : "로그인"}</button>
              <button type="button" onClick={() => { setResetMode(true); setResetEmail(email); setError(null); setMessage(null); }} style={textBtn}>
                비밀번호 초기화
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { void handleResetSubmit(e); }} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="가입 이메일" required style={input} />
                <p style={helpText}>가입한 이메일로 임시 비밀번호를 전송합니다.</p>
              </div>
              <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? "전송 중..." : "임시 비밀번호 받기"}</button>
              <button type="button" onClick={() => { setResetMode(false); setError(null); }} style={textBtn}>
                로그인으로 돌아가기
              </button>
            </form>
          )}

          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
          {message && <p style={{ margin: 0, color: "var(--brand-light)", fontSize: 14, textAlign: "center", fontWeight: 700 }}>{message}</p>}

          <div style={divider}><span style={dividerText}>또는</span></div>

          <a href={getKakaoLoginUrl()} style={btnKakao}>카카오로 로그인</a>
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
const textBtn: CSSProperties = { border: 0, background: "transparent", color: "var(--brand-light)", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 4 };
const helpText: CSSProperties = { margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 };
const divider: CSSProperties = { display: "flex", alignItems: "center", gap: 16 };
const dividerText: CSSProperties = { flex: "none", fontSize: 13, color: "var(--muted)", padding: "0 4px" };
