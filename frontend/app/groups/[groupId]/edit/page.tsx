"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import {
  fetchGroupDetail, fetchMe, getAccessToken, refreshAccessToken, updateGroup,
  type Grade, type GroupVisibility,
} from "@/lib/auth";

const gradeOpts: { value: Grade; label: string }[] = [
  { value: "F", label: "F" }, { value: "E", label: "E" }, { value: "D", label: "D" },
  { value: "C", label: "C" }, { value: "B", label: "B" }, { value: "A", label: "A" }, { value: "S", label: "S" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

export default function GroupEditPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const groupId = Number(params.groupId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "", description: "", visibility: "INVITE_ONLY" as GroupVisibility,
    location: "", startAt: "", endAt: "", registrationDeadline: "",
    minGrade: "" as string, maxGrade: "" as string,
    maxMembers: "", maxMale: "", maxFemale: "",
  });

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await fetchMe();
        if (!me.onboardingCompleted) { router.replace("/onboarding"); return; }
        const g = await fetchGroupDetail(groupId);
        if (g.myRole !== "OWNER" && g.myRole !== "MANAGER") { router.replace(`/groups/${groupId}`); return; }
        setF({
          name: g.name,
          description: g.description ?? "",
          visibility: g.visibility,
          location: g.location ?? "",
          startAt: toLocalInput(g.startAt),
          endAt: toLocalInput(g.endAt),
          registrationDeadline: toLocalInput(g.registrationDeadline),
          minGrade: g.minGrade ?? "",
          maxGrade: g.maxGrade ?? "",
          maxMembers: g.maxMembers?.toString() ?? "",
          maxMale: g.maxMale?.toString() ?? "",
          maxFemale: g.maxFemale?.toString() ?? "",
        });
      } catch (err) { setError(err instanceof Error ? err.message : "이벤트 정보를 불러오지 못했습니다."); }
      finally { setLoading(false); }
    })();
  }, [groupId]);

  function validate(): string | null {
    if (f.startAt && f.endAt && new Date(f.startAt) >= new Date(f.endAt)) return "시작일시는 종료일시보다 이전이어야 합니다.";
    if (f.registrationDeadline && f.endAt && new Date(f.registrationDeadline) > new Date(f.endAt)) return "참여 마감일시는 종료일시 이전이어야 합니다.";
    if (f.minGrade && f.maxGrade) {
      const order = ["F", "E", "D", "C", "B", "A", "S"];
      if (order.indexOf(f.minGrade) > order.indexOf(f.maxGrade)) return "최소 급수는 최대 급수 이하여야 합니다.";
    }
    const maxM = f.maxMembers ? Number(f.maxMembers) : null;
    const male = f.maxMale ? Number(f.maxMale) : 0;
    const female = f.maxFemale ? Number(f.maxFemale) : 0;
    if (maxM != null && maxM < male + female) return "최대 인원은 최대 남성 + 최대 여성 이상이어야 합니다.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const vErr = validate();
    if (vErr) { setError(vErr); return; }
    setSaving(true); setError(null);
    try {
      await updateGroup(groupId, {
        name: f.name.trim(),
        description: f.description.trim() || null,
        visibility: f.visibility,
        location: f.location.trim() || null,
        startAt: f.startAt ? new Date(f.startAt).toISOString() : null,
        endAt: f.endAt ? new Date(f.endAt).toISOString() : null,
        registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline).toISOString() : (f.endAt ? new Date(f.endAt).toISOString() : null),
        minGrade: (f.minGrade as Grade) || null,
        maxGrade: (f.maxGrade as Grade) || null,
        maxMembers: f.maxMembers ? Number(f.maxMembers) : null,
        maxMale: f.maxMale ? Number(f.maxMale) : null,
        maxFemale: f.maxFemale ? Number(f.maxFemale) : null,
      });
      router.push(`/groups/${groupId}`);
    } catch (err) { setError(err instanceof Error ? err.message : "수정에 실패했습니다."); }
    finally { setSaving(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  if (loading) return <main style={main}><p style={{ color: "var(--muted)", textAlign: "center", padding: 60 }}>불러오는 중...</p></main>;

  return (
    <main style={main}>
      <section style={sec}>
        <div>
          <Link href={`/groups/${groupId}`} style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 상세</Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>이벤트 정보 수정</h1>
        </div>
        <div style={card}>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
            <label style={lw}><span style={lb}>이벤트 이름 *</span>
              <input value={f.name} onChange={set("name")} minLength={2} maxLength={60} required style={inp} />
            </label>
            <label style={lw}><span style={lb}>이벤트 설명</span>
              <input value={f.description} onChange={set("description")} maxLength={400} style={inp} />
            </label>
            <label style={lw}><span style={lb}>장소</span>
              <input value={f.location} onChange={set("location")} maxLength={200} placeholder="체육관, 코트 이름 등" style={inp} />
            </label>

            <h3 style={st}>일정</h3>
            <div style={grid2}>
              <label style={lw}><span style={lb}>시작일시 *</span>
                <input type="datetime-local" value={f.startAt} onChange={set("startAt")} required style={inp} />
              </label>
              <label style={lw}><span style={lb}>종료일시 *</span>
                <input type="datetime-local" value={f.endAt} onChange={set("endAt")} required style={inp} />
              </label>
            </div>
            <label style={lw}><span style={lb}>참여 마감일시</span>
              <input type="datetime-local" value={f.registrationDeadline} onChange={set("registrationDeadline")} style={inp} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>미입력 시 종료일시와 동일</span>
            </label>

            <h3 style={st}>제한 설정</h3>
            <div style={grid2}>
              <label style={lw}><span style={lb}>최소 급수</span>
                <select value={f.minGrade} onChange={set("minGrade")} style={inp}><option value="">제한 없음</option>{gradeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </label>
              <label style={lw}><span style={lb}>최대 급수</span>
                <select value={f.maxGrade} onChange={set("maxGrade")} style={inp}><option value="">제한 없음</option>{gradeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <label style={lw}><span style={lb}>최대 인원</span><input type="number" value={f.maxMembers} onChange={set("maxMembers")} min={1} placeholder="-" style={inp} /></label>
              <label style={lw}><span style={lb}>최대 남성</span><input type="number" value={f.maxMale} onChange={set("maxMale")} min={0} placeholder="-" style={inp} /></label>
              <label style={lw}><span style={lb}>최대 여성</span><input type="number" value={f.maxFemale} onChange={set("maxFemale")} min={0} placeholder="-" style={inp} /></label>
            </div>

            <h3 style={st}>공개 설정</h3>
            <select value={f.visibility} onChange={set("visibility")} style={inp}>
              <option value="PUBLIC">공개</option><option value="INVITE_ONLY">초대 전용</option>
            </select>

            <button type="submit" disabled={saving} style={btn}>{saving ? "저장 중..." : "저장"}</button>
          </form>
          {error && <p style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 14 }}>{error}</p>}
        </div>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 16 };
const card: CSSProperties = { padding: "24px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 8 };
const lw: CSSProperties = { display: "grid", gap: 6 };
const lb: CSSProperties = { fontWeight: 600, fontSize: 13, color: "var(--ink-secondary)" };
const inp: CSSProperties = { minHeight: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", padding: "0 14px", fontSize: 15, background: "var(--surface-2)", color: "var(--ink)", outline: "none" };
const btn: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 };
const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const st: CSSProperties = { margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "var(--ink-secondary)" };
