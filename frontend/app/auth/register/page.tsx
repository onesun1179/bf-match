"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useState } from "react";
import { registerLocal } from "@/lib/auth";

const gradeOptions = [
  { value: "F", label: "F (왕초심)" }, { value: "E", label: "E (초심)" },
  { value: "D", label: "D" }, { value: "C", label: "C" },
  { value: "B", label: "B" }, { value: "A", label: "A" }, { value: "S", label: "S" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ username: "", password: "", passwordConfirm: "", nickname: "", nationalGrade: "F", gender: "MALE" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (f.password !== f.passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError(null); setSubmitting(true);
    try {
      await registerLocal(f.username.trim(), f.password, f.nickname.trim(), f.nationalGrade, f.gender);
      router.push("/");
    } catch (err) { setError(err instanceof Error ? err.message : "회원가입에 실패했습니다."); }
    finally { setSubmitting(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <main style={main}>
      <section style={sec}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={logo}>{"\u{1F3F8}"}</div>
          <h1 style={h1}>회원가입</h1>
        </div>
        <div style={card}>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
            <label style={lw}><span style={lb}>아이디</span><input value={f.username} onChange={set("username")} placeholder="2자 이상" required minLength={2} maxLength={60} style={inp} /></label>
            <label style={lw}><span style={lb}>비밀번호</span><input type="password" value={f.password} onChange={set("password")} placeholder="4자 이상" required minLength={4} style={inp} /></label>
            <label style={lw}><span style={lb}>비밀번호 확인</span><input type="password" value={f.passwordConfirm} onChange={set("passwordConfirm")} placeholder="비밀번호 다시 입력" required minLength={4} style={inp} /></label>
            <label style={lw}><span style={lb}>닉네임</span><input value={f.nickname} onChange={set("nickname")} placeholder="이름" required minLength={2} maxLength={30} style={inp} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={lw}><span style={lb}>성별</span>
                <select value={f.gender} onChange={set("gender")} style={inp}>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </select>
              </label>
              <label style={lw}><span style={lb}>시작 급수</span>
                <select value={f.nationalGrade} onChange={set("nationalGrade")} style={inp}>
                  {gradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" disabled={submitting} style={btn}>{submitting ? "가입 중..." : "가입하기"}</button>
          </form>
          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
          이미 계정이 있으신가요? <Link href="/auth/login" style={{ color: "var(--brand-light)", fontWeight: 700 }}>로그인</Link>
        </p>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px", display: "grid", alignContent: "center" };
const sec: CSSProperties = { maxWidth: 400, width: "100%", margin: "0 auto", display: "grid", gap: 20 };
const card: CSSProperties = { padding: "24px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 16 };
const logo: CSSProperties = { width: 48, height: 48, borderRadius: 14, background: "var(--brand)", display: "inline-grid", placeItems: "center", fontSize: 24, marginBottom: 16 };
const h1: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" };
const lw: CSSProperties = { display: "grid", gap: 6 };
const lb: CSSProperties = { fontWeight: 600, fontSize: 13, color: "var(--ink-secondary)" };
const inp: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", padding: "0 16px", fontSize: 15, background: "var(--surface-2)", color: "var(--ink)", outline: "none" };
const btn: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 };
