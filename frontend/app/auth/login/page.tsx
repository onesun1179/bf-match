"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useState} from "react";
import {getKakaoLoginUrl, loginLocal, resetPassword} from "@/lib/auth";
import {
  ContentStack,
  DisplayTitle,
  MutedText,
  PageShell,
  PillInput,
  PrimaryButton,
  PrimaryLink,
  SurfaceCard,
} from "@/components/ui/apple";

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
    <PageShell center>
      <ContentStack max={400} gap={20}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "var(--on-primary)", display: "inline-grid", placeItems: "center", fontSize: 17, fontWeight: 600, marginBottom: 16 }}>BF</div>
          <DisplayTitle style={{ margin: 0 }}>로그인</DisplayTitle>
        </div>

        <SurfaceCard padding="24px" style={{ gap: 16 }}>
          {!resetMode ? (
            <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
              <PillInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required />
              <PillInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required minLength={4} />
              <PrimaryButton type="submit" disabled={submitting}>{submitting ? "로그인 중..." : "로그인"}</PrimaryButton>
              <button type="button" onClick={() => { setResetMode(true); setResetEmail(email); setError(null); setMessage(null); }} style={textBtn}>
                비밀번호 초기화
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { void handleResetSubmit(e); }} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <PillInput type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="가입 이메일" required />
                <p style={helpText}>가입한 이메일로 임시 비밀번호를 전송합니다.</p>
              </div>
              <PrimaryButton type="submit" disabled={submitting}>{submitting ? "전송 중..." : "임시 비밀번호 받기"}</PrimaryButton>
              <button type="button" onClick={() => { setResetMode(false); setError(null); }} style={textBtn}>
                로그인으로 돌아가기
              </button>
            </form>
          )}

          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
          {message && <p style={{ margin: 0, color: "var(--brand)", fontSize: 14, textAlign: "center", fontWeight: 600 }}>{message}</p>}

          <div style={divider}><span style={dividerText}>또는</span></div>

          <PrimaryLink href={getKakaoLoginUrl()} style={{ background: "var(--kakao)", color: "#191919" }}>카카오로 로그인</PrimaryLink>
        </SurfaceCard>

        <MutedText style={{ textAlign: "center" }}>
          계정이 없으신가요?{" "}
          <Link href="/auth/register" style={{ color: "var(--brand)", fontWeight: 600 }}>회원가입</Link>
        </MutedText>
      </ContentStack>
    </PageShell>
  );
}

const textBtn: CSSProperties = { border: 0, background: "transparent", color: "var(--brand)", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 4 };
const helpText: CSSProperties = { margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 };
const divider: CSSProperties = { display: "flex", alignItems: "center", gap: 16 };
const dividerText: CSSProperties = { flex: "none", fontSize: 13, color: "var(--muted)", padding: "0 4px" };
