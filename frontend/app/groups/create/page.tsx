"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, FormEvent, useState} from "react";
import {createGroup, type Grade, type GroupVisibility} from "@/lib/auth";
import {
  ContentStack,
  DisplayTitle,
  PageShell,
  PillInput,
  PillSelect,
  PrimaryButton,
  SurfaceCard,
} from "@/components/ui/apple";

const gradeOpts: { value: Grade; label: string }[] = [
  { value: "F", label: "F" }, { value: "E", label: "E" }, { value: "D", label: "D" },
  { value: "C", label: "C" }, { value: "B", label: "B" }, { value: "A", label: "A" }, { value: "S", label: "S" },
];

function toLocalInput(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function defaultStart(): string {
  return toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000));
}
function defaultEnd(startAt: string): string {
  const base = startAt ? new Date(startAt) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  return toLocalInput(new Date(base.getTime() + 2 * 60 * 60 * 1000));
}
const _initStart = defaultStart();
const _initEnd = defaultEnd(_initStart);

export default function GroupCreatePage() {
  const router = useRouter();
  const [f, setF] = useState({
    name: "", description: "", visibility: "INVITE_ONLY" as GroupVisibility,
    location: "", startAt: _initStart, endAt: _initEnd, registrationDeadline: "",
    minGrade: "" as string, maxGrade: "" as string,
    maxMembers: "", maxMale: "", maxFemale: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (f.startAt && f.endAt && new Date(f.startAt) >= new Date(f.endAt)) {
      return "시작일시는 종료일시보다 이전이어야 합니다.";
    }
    if (f.registrationDeadline && f.endAt && new Date(f.registrationDeadline) > new Date(f.endAt)) {
      return "참여 마감일시는 종료일시 이전이어야 합니다.";
    }
    if (f.minGrade && f.maxGrade) {
      const order = ["F", "E", "D", "C", "B", "A", "S"];
      if (order.indexOf(f.minGrade) > order.indexOf(f.maxGrade)) return "최소 급수는 최대 급수 이하여야 합니다.";
    }
    const maxM = f.maxMembers ? Number(f.maxMembers) : null;
    const male = f.maxMale ? Number(f.maxMale) : 0;
    const female = f.maxFemale ? Number(f.maxFemale) : 0;
    if (maxM != null && maxM < male + female) {
      return "최대 인원은 최대 남성 + 최대 여성 이상이어야 합니다.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const vErr = validate();
    if (vErr) { setError(vErr); return; }
    setSubmitting(true); setError(null);
    try {
      const g = await createGroup({
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
      router.replace(`/groups/${g.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "이벤트 생성에 실패했습니다."); }
    finally { setSubmitting(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <PageShell>
      <ContentStack max={520} gap={16}>
        <div>
          <Link href="/groups/list" style={{ color: "var(--muted)", fontSize: 13 }}>&larr; 이벤트 목록</Link>
          <DisplayTitle>새 이벤트 만들기</DisplayTitle>
        </div>
        <SurfaceCard padding="24px" style={{ gap: 8 }}>
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "grid", gap: 14 }}>
            <label style={lw}><span style={lb}>이벤트 이름 *</span>
              <PillInput value={f.name} onChange={set("name")} minLength={2} maxLength={60} required placeholder="강남 평일 저녁 배드민턴" />
            </label>
            <label style={lw}><span style={lb}>이벤트 설명</span>
              <PillInput value={f.description} onChange={set("description")} maxLength={400} placeholder="운영 시간, 지역, 분위기 등" />
            </label>
            <label style={lw}><span style={lb}>장소</span>
              <PillInput value={f.location} onChange={set("location")} maxLength={200} placeholder="체육관, 코트 이름 등" />
            </label>

            <h3 style={sectionTitle}>일정</h3>
            <div style={grid2}>
              <label style={lw}><span style={lb}>시작일시 *</span>
                <PillInput type="datetime-local" value={f.startAt} onChange={set("startAt")} required />
              </label>
              <label style={lw}><span style={lb}>종료일시 *</span>
                <PillInput type="datetime-local" value={f.endAt} onChange={set("endAt")} required />
              </label>
            </div>
            <label style={lw}><span style={lb}>참여 마감일시</span>
              <PillInput type="datetime-local" value={f.registrationDeadline} onChange={set("registrationDeadline")} placeholder={f.endAt || ""} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>미입력 시 종료일시와 동일</span>
            </label>

            <h3 style={sectionTitle}>제한 설정</h3>
            <div style={grid2}>
              <label style={lw}><span style={lb}>최소 급수</span>
                <PillSelect value={f.minGrade} onChange={set("minGrade")}><option value="">제한 없음</option>{gradeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</PillSelect>
              </label>
              <label style={lw}><span style={lb}>최대 급수</span>
                <PillSelect value={f.maxGrade} onChange={set("maxGrade")}><option value="">제한 없음</option>{gradeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</PillSelect>
              </label>
            </div>
            <div style={grid3}>
              <label style={lw}><span style={lb}>최대 인원</span><PillInput type="number" value={f.maxMembers} onChange={set("maxMembers")} min={1} placeholder="-" /></label>
              <label style={lw}><span style={lb}>최대 남성</span><PillInput type="number" value={f.maxMale} onChange={set("maxMale")} min={0} placeholder="-" /></label>
              <label style={lw}><span style={lb}>최대 여성</span><PillInput type="number" value={f.maxFemale} onChange={set("maxFemale")} min={0} placeholder="-" /></label>
            </div>

            <h3 style={sectionTitle}>공개 설정</h3>
            <PillSelect value={f.visibility} onChange={set("visibility")}>
              <option value="PUBLIC">공개</option><option value="INVITE_ONLY">초대 전용</option>
            </PillSelect>

            <PrimaryButton type="submit" disabled={submitting}>{submitting ? "생성 중..." : "이벤트 생성"}</PrimaryButton>
          </form>
          {error && <p style={{ margin: "8px 0 0", color: "var(--danger)", fontSize: 14 }}>{error}</p>}
        </SurfaceCard>
      </ContentStack>
    </PageShell>
  );
}

const lw: CSSProperties = { display: "grid", gap: 6 };
const lb: CSSProperties = { fontWeight: 600, fontSize: 13, color: "var(--ink-secondary)" };
const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 };
const grid3: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12 };
const sectionTitle: CSSProperties = { margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "var(--ink-secondary)" };
