"use client";

import {useParams, useRouter} from "next/navigation";
import {CSSProperties, useEffect, useState} from "react";
import {fetchInviteLinkInfo, getAccessToken, getKakaoLoginUrl, refreshAccessToken} from "@/lib/auth";

type S = { status: "loading" } | { status: "login_required" } | { status: "error"; message: string };

export default function JoinByInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<S>({ status: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const info = await fetchInviteLinkInfo(params.token);
        if (info.status !== "PENDING") { setState({ status: "error", message: "이미 사용되었거나 만료된 초대 링크입니다." }); return; }
        if (!getAccessToken()) { try { await refreshAccessToken(); } catch { setState({ status: "login_required" }); return; } }
        router.replace(`/groups/${info.groupId}?invite=${params.token}`);
      } catch (err) { setState({ status: "error", message: err instanceof Error ? err.message : "초대 링크를 처리할 수 없습니다." }); }
    })();
  }, [params.token, router]);

  function handleLogin() {
    sessionStorage.setItem("bf-match.join-redirect", `/groups/join/${params.token}`);
    window.location.href = getKakaoLoginUrl();
  }

  return (
    <main style={main}>
      <section style={sec}>
        <div style={card}>
          {state.status === "loading" && <p style={{ margin: 0, color: "var(--muted)", textAlign: "center" }}>초대 정보 확인 중...</p>}
          {state.status === "login_required" && (<>
            <div style={{ fontSize: 40, textAlign: "center" }}>{"\u{1F3F8}"}</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, textAlign: "center" }}>이벤트 초대</h1>
            <p style={{ margin: 0, color: "var(--ink-secondary)", textAlign: "center", fontSize: 15 }}>참여하려면 로그인이 필요합니다</p>
            <button type="button" onClick={handleLogin} style={btnKakao}>카카오로 로그인</button>
            <button type="button" onClick={() => router.push("/auth/login")} style={btnSec}>이메일로 로그인</button>
          </>)}
          {state.status === "error" && (<>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, textAlign: "center" }}>초대 링크 오류</h1>
            <p style={{ margin: 0, color: "var(--danger)", textAlign: "center" }}>{state.message}</p>
            <button type="button" onClick={() => router.push("/")} style={btnSec}>홈으로</button>
          </>)}
        </div>
      </section>
    </main>
  );
}

const main: CSSProperties = { minHeight: "100vh", padding: "24px 16px 80px", display: "grid", alignContent: "center" };
const sec: CSSProperties = { maxWidth: 400, margin: "0 auto", display: "grid", gap: 16 };
const card: CSSProperties = { padding: "32px 24px", borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", display: "grid", gap: 16 };
const btnKakao: CSSProperties = { minHeight: 48, borderRadius: "var(--radius-md)", border: 0, background: "var(--kakao)", color: "#191919", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnSec: CSSProperties = { minHeight: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--line-2)", background: "var(--surface-2)", color: "var(--ink)", fontWeight: 700, fontSize: 15, cursor: "pointer" };
