"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useState} from "react";
import {registerLocal} from "@/lib/auth";
import {
  ContentStack,
  DisplayTitle,
  MutedText,
  PageShell,
  PillInput,
  PillSelect,
  PrimaryButton,
  SurfaceCard,
} from "@/components/ui/apple";

const gradeOptions = [
  { value: "F", label: "F (왕초심)" }, { value: "E", label: "E (초심)" },
  { value: "D", label: "D" }, { value: "C", label: "C" },
  { value: "B", label: "B" }, { value: "A", label: "A" }, { value: "S", label: "S" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "", passwordConfirm: "", nickname: "", nationalGrade: "F", gender: "MALE" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (f.password !== f.passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError(null); setSubmitting(true);
    try {
      await registerLocal(f.email.trim(), f.password, f.nickname.trim(), f.nationalGrade, f.gender);
      router.replace("/");
    } catch (err) { setError(err instanceof Error ? err.message : "회원가입에 실패했습니다."); }
    finally { setSubmitting(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <PageShell center>
      <ContentStack max={400} gap={20}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={logo}>BF</div>
          <DisplayTitle style={{ margin: 0 }}>회원가입</DisplayTitle>
        </div>
        <SurfaceCard padding="24px" style={{ gap: 16 }}>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
            <label style={lw}>
              <span style={lb}>이메일</span>
              <PillInput type="email" value={f.email} onChange={set("email")} placeholder="name@example.com" required maxLength={100} />
              <span style={helpText}>이메일은 로그인 아이디로 사용되며 비밀번호 초기화 등 개인정보 관련 안내에 사용됩니다.</span>
            </label>
            <label style={lw}><span style={lb}>비밀번호</span><PillInput type="password" value={f.password} onChange={set("password")} placeholder="4자 이상" required minLength={4} /></label>
            <label style={lw}><span style={lb}>비밀번호 확인</span><PillInput type="password" value={f.passwordConfirm} onChange={set("passwordConfirm")} placeholder="비밀번호 다시 입력" required minLength={4} /></label>
            <label style={lw}><span style={lb}>닉네임</span><PillInput value={f.nickname} onChange={set("nickname")} placeholder="이름" required minLength={2} maxLength={10} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={lw}><span style={lb}>성별</span>
                <PillSelect value={f.gender} onChange={set("gender")}>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </PillSelect>
              </label>
              <label style={lw}><span style={lb}>시작 급수</span>
                <PillSelect value={f.nationalGrade} onChange={set("nationalGrade")}>
                  {gradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </PillSelect>
              </label>
            </div>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? "가입 중..." : "가입하기"}</PrimaryButton>
          </form>
          {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
        </SurfaceCard>
        <MutedText style={{ textAlign: "center" }}>
          이미 계정이 있으신가요? <Link href="/auth/login" style={{ color: "var(--brand)", fontWeight: 600 }}>로그인</Link>
        </MutedText>
      </ContentStack>
    </PageShell>
  );
}

const logo: CSSProperties = { width: 48, height: 48, borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "var(--on-primary)", display: "inline-grid", placeItems: "center", fontSize: 17, fontWeight: 600, marginBottom: 16 };
const lw: CSSProperties = { display: "grid", gap: 6 };
const lb: CSSProperties = { fontWeight: 600, fontSize: 13, color: "var(--ink-secondary)" };
const helpText: CSSProperties = { color: "var(--muted)", fontSize: 12, lineHeight: 1.45 };
