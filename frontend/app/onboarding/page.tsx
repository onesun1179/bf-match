"use client";

import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useEffect, useState} from "react";
import {fetchMe, getAccessToken, refreshAccessToken, updateMyProfile, updateMySkill} from "@/lib/auth";
import {
  ContentStack,
  DisplayTitle,
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

type GradeValue = (typeof gradeOptions)[number]["value"];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nickname: "", gender: "MALE", nationalGrade: "F" as GradeValue, lv: 1, exp: 0 });

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await fetchMe();
        setForm({
          nickname: me.nickname ?? "",
          gender: me.gender ?? "MALE",
          nationalGrade: me.skill?.nationalGrade ?? "F",
          lv: me.skill?.lv ?? 1,
          exp: me.skill?.exp ?? 0,
        });
      } catch (err) { setError(err instanceof Error ? err.message : "로그인 상태를 확인하지 못했습니다."); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await updateMyProfile({ nickname: form.nickname.trim(), gender: form.gender as "MALE" | "FEMALE" });
      await updateMySkill({ nationalGrade: form.nationalGrade });
      router.replace("/");
    } catch (err) { setError(err instanceof Error ? err.message : "저장에 실패했습니다."); }
    finally { setSaving(false); }
  }

  return (
    <PageShell center>
      <ContentStack max={440} gap={20}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "var(--on-primary)", display: "inline-grid", placeItems: "center", fontSize: 17, fontWeight: 600, marginBottom: 16 }}>BF</div>
          <DisplayTitle style={{ margin: 0 }}>프로필 설정</DisplayTitle>
          <p style={{ margin: "8px 0 0", color: "var(--ink-secondary)", fontSize: 17 }}>성별과 급수를 설정하면 매칭 정확도가 올라갑니다</p>
        </div>

        <SurfaceCard padding="24px" style={{ gap: 8 }}>
          {loading ? <p style={{ margin: 0, color: "var(--muted)", textAlign: "center" }}>불러오는 중...</p> : (
            <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
              <label style={lw}><span style={lb}>닉네임</span>
                <PillInput value={form.nickname} onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))} placeholder="이름" required minLength={2} maxLength={10} />
              </label>
              <label style={lw}><span style={lb}>성별</span>
                <PillSelect value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </PillSelect>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={lw}><span style={lb}>시작 급수</span>
                  <PillSelect value={form.nationalGrade} onChange={(e) => setForm((p) => ({ ...p, nationalGrade: e.target.value as GradeValue }))}>
                    {gradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </PillSelect>
                </label>
                <label style={lw}><span style={lb}>LV / EXP</span>
                  <div style={{ minHeight: 44, borderRadius: "var(--radius-pill)", border: "1px solid var(--line-2)", padding: "0 18px", display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 600, color: "var(--brand)", background: "var(--surface-3)" }}>
                    <span>LV {form.lv}</span><span style={{ color: "var(--muted)" }}>/</span><span style={{ color: "var(--brand)" }}>EXP {form.exp}</span>
                  </div>
                </label>
              </div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>LV과 EXP는 활동으로 쌓이며, LV 99 / EXP 99에서 급수 업그레이드가 가능합니다.</p>
              <PrimaryButton type="submit" disabled={saving}>{saving ? "저장 중..." : "시작하기"}</PrimaryButton>
            </form>
          )}
          {error && <p style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
        </SurfaceCard>
      </ContentStack>
    </PageShell>
  );
}

const lw: CSSProperties = { display: "grid", gap: 6 };
const lb: CSSProperties = { fontWeight: 600, fontSize: 13, color: "var(--ink-secondary)" };
