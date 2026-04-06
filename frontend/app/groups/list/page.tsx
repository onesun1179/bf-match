"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { displayName, fetchMe, fetchMyGroups, fetchPublicGroups, getAccessToken, refreshAccessToken, type GroupSummary } from "@/lib/auth";
import { BottomNavMain } from "@/components/bottom-nav-main";

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
    <main style={main}>
      <section style={sec}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>이벤트</h1>
          <Link href="/groups/create" style={btnCreate}>+ 새 이벤트</Link>
        </div>

        {/* Tab */}
        <div style={tabBar}>
          <button onClick={() => setTab("public")} style={tabStyle(tab === "public")}>공개 이벤트</button>
          <button onClick={() => setTab("my")} style={tabStyle(tab === "my")}>내 이벤트</button>
        </div>

        {/* Search + Filter */}
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이벤트명 또는 설명 검색"
            style={searchInput}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {(["active", "ended", "all"] as Status[]).map((s) => (
              <button key={s} onClick={() => setStatus(s)} style={filterChip(status === s)}>
                {s === "active" ? "활성" : s === "ended" ? "종료" : "전체"}
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>불러오는 중...</p>}

        {!loading && filtered.length === 0 && !error && (
          <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
            <p style={{ margin: 0, fontSize: 40 }}>{"\u{1F3F8}"}</p>
            <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 15 }}>
              {search ? "검색 결과가 없습니다" : tab === "public" ? "공개 이벤트이 없습니다" : "참여 중인 이벤트이 없습니다"}
            </p>
          </div>
        )}

        {filtered.map((g) => {
          const isMember = g.myRole != null && g.myStatus === "ACTIVE";
          const ended = isEnded(g);
          return (
            <Link key={g.id} href={`/groups/${g.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ ...groupCard, opacity: ended ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{g.name}</h2>
                    {ended && <span style={{ ...badge, background: "var(--danger-bg)", color: "var(--danger)" }}>종료</span>}
                  </div>
                  {isMember && (
                    <span style={{ ...badge, background: g.myRole === "OWNER" ? "rgba(108,92,231,0.15)" : g.myRole === "MANAGER" ? "rgba(0,206,201,0.15)" : "var(--surface-3)", color: g.myRole === "OWNER" ? "var(--brand-light)" : g.myRole === "MANAGER" ? "var(--accent)" : "var(--ink-secondary)" }}>
                      {roleLabel(g.myRole)}
                    </span>
                  )}
                </div>
                {g.description && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.4 }}>{g.description}</p>}
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>이벤트장: {displayName(g.ownerNickname, g.ownerGender, g.ownerGrade)}</p>
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
      </section>

      <BottomNavMain active="event" />
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px" };
const sec: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 };
const card: CSSProperties = { padding: "20px 22px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid" };
const groupCard: CSSProperties = { padding: "18px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", transition: "opacity .15s" };
const btnCreate: CSSProperties = { padding: "8px 16px", borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" };
const badge: CSSProperties = { fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 };
const meta: CSSProperties = { fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "var(--surface-3)", color: "var(--muted)" };
const searchInput: CSSProperties = { minHeight: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", padding: "0 14px", fontSize: 15, background: "var(--surface-2)", color: "var(--ink)", outline: "none" };
function filterChip(active: boolean): CSSProperties {
  return { padding: "6px 14px", borderRadius: 999, border: 0, fontSize: 13, fontWeight: 700, cursor: "pointer", background: active ? "var(--brand)" : "var(--surface-3)", color: active ? "#fff" : "var(--muted)", transition: "all .15s" };
}
const tabBar: CSSProperties = { display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-md)", background: "var(--surface-2)" };
function tabStyle(active: boolean): CSSProperties {
  return { flex: 1, padding: "10px 0", border: 0, borderRadius: "var(--radius-sm)", background: active ? "var(--brand)" : "transparent", color: active ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .15s" };
}
