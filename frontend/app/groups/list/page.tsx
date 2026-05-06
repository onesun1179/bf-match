"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {CSSProperties, useEffect, useMemo, useState} from "react";
import {
    fetchMe,
    fetchMyGroups,
    fetchPublicGroups,
    getAccessToken,
    type GroupSummary,
    refreshAccessToken
} from "@/lib/auth";
import {BottomNavMain} from "@/components/bottom-nav-main";
import {UserInfoChip} from "@/components/user-info-chip";
import {
  ContentStack,
  DisplayTitle,
  FilterChip,
  PageShell,
  PillInput,
  PrimaryLink,
  SegmentedControl,
  SegmentButton,
  SurfaceCard,
} from "@/components/ui/apple";

type Tab = "public" | "my";
type Status = "all" | "active" | "ended";

export default function GroupListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("public");
  const [publicGroups, setPublicGroups] = useState<GroupSummary[]>([]);
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("active");

  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await fetchMe();
        if (!me.onboardingCompleted) { router.replace("/onboarding"); return; }
        const [pub, my] = await Promise.all([fetchPublicGroups(), fetchMyGroups()]);
        setPublicGroups(pub);
        setMyGroups(my);
      } catch (err) { setError(err instanceof Error ? err.message : "이벤트 목록을 불러오지 못했습니다."); }
      finally { setLoading(false); }
    })();
  }, []);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const source = tab === "public" ? publicGroups : myGroups;
    return source.filter((g) => {
      // 검색
      const q = search.trim().toLowerCase();
      if (q && !g.name.toLowerCase().includes(q) && !(g.description ?? "").toLowerCase().includes(q)) return false;
      // 활성/비활성
      if (status === "active" && g.endAt && new Date(g.endAt) < now) return false;
      if (status === "ended" && (!g.endAt || new Date(g.endAt) >= now)) return false;
      return true;
    });
  }, [tab, publicGroups, myGroups, search, status, now]);

  function roleLabel(r: string | null) { return r === "OWNER" ? "이벤트장" : r === "MANAGER" ? "관리자" : "멤버"; }
  function isEnded(g: GroupSummary) { return g.endAt && new Date(g.endAt) < now; }

  return (
    <PageShell>
      <ContentStack className="animate-fade-in-up" max={520} gap={14}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <DisplayTitle style={{ margin: 0 }}>이벤트</DisplayTitle>
          <PrimaryLink as={Link} href="/groups/create" className="btn-hover" style={{ padding: "0 18px" }}>+ 새 이벤트</PrimaryLink>
        </div>

        {/* Tab */}
        <SegmentedControl>
          <SegmentButton className="btn-hover" onClick={() => setTab("public")} selected={tab === "public"}>공개 이벤트</SegmentButton>
          <SegmentButton className="btn-hover" onClick={() => setTab("my")} selected={tab === "my"}>내 이벤트</SegmentButton>
        </SegmentedControl>

        {/* Search + Filter */}
        <div style={{ display: "grid", gap: 8 }}>
          <PillInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이벤트명 또는 설명 검색"
          />
          <div style={{ display: "flex", gap: 6 }}>
            {(["active", "ended", "all"] as Status[]).map((s) => (
              <FilterChip key={s} onClick={() => setStatus(s)} selected={status === s}>
                {s === "active" ? "활성" : s === "ended" ? "종료" : "전체"}
              </FilterChip>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && filtered.length === 0 && !error && (
          <SurfaceCard style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ margin: 0, fontSize: 40 }}>{"\u{1F3F8}"}</p>
            <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 15 }}>
              {search ? "검색 결과가 없습니다" : tab === "public" ? "공개 이벤트이 없습니다" : "참여 중인 이벤트이 없습니다"}
            </p>
          </SurfaceCard>
        )}

        {filtered.map((g) => {
          const isMember = g.myRole != null && g.myStatus === "ACTIVE";
          const ended = isEnded(g);
          return (
            <Link key={g.id} href={`/groups/${g.id}`} className="btn-hover glass-card" style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: "var(--radius-lg)" }}>
              <div style={{ ...groupCard, opacity: ended ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{g.name}</h2>
                    {ended && <span style={{ ...badge, background: "var(--danger-bg)", color: "var(--danger)" }}>종료</span>}
                  </div>
                  {isMember && (
                    <span style={{ ...badge, background: "var(--surface-3)", border: "1px solid var(--hairline)", color: g.myRole === "OWNER" || g.myRole === "MANAGER" ? "var(--brand)" : "var(--ink-secondary)" }}>
                      {roleLabel(g.myRole)}
                    </span>
                  )}
                </div>
                {g.description && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.4 }}>{g.description}</p>}
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>이벤트장:</span>
                  <UserInfoChip nickname={g.ownerNickname} gender={g.ownerGender} grade={g.ownerGrade} style={{ fontSize: 13 }} />
                </div>
                {g.startAt && (
                  <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: 13 }}>
                    {new Date(g.startAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {g.endAt && <> ~ {new Date(g.endAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
                  </p>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={meta}>{g.memberCount}{g.maxMembers ? `/${g.maxMembers}` : ""}명</span>
                  {g.minGrade && <span style={meta}>최소 {g.minGrade}</span>}
                  {g.maxGrade && <span style={meta}>최대 {g.maxGrade}</span>}
                </div>
              </div>
            </Link>
          );
        })}

        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14, textAlign: "center" }}>{error}</p>}
      </ContentStack>

      <BottomNavMain active="event" />
    </PageShell>
  );
}

const groupCard: CSSProperties = { padding: "18px 20px", borderRadius: "var(--radius-lg)", transition: "opacity .15s" };
const badge: CSSProperties = { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999 };
const meta: CSSProperties = { fontSize: 12, fontWeight: 400, padding: "3px 8px", borderRadius: 8, background: "var(--surface-3)", color: "var(--muted)", border: "1px solid var(--hairline)" };
