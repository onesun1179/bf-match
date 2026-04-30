"use client";

import Link from "next/link";
import {CSSProperties, FormEvent, useEffect, useState} from "react";
import {changePassword, fetchMe, updateMyProfile} from "@/lib/auth";

export default function AccountSettingsPage() {
  const [nickname, setNickname] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setNickname(me.nickname);
        setInitialNickname(me.nickname);
      } catch (err) {
        setError(err instanceof Error ? err.message : "계정 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleNicknameSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextNickname = nickname.trim();
    if (nextNickname.length < 2 || nextNickname.length > 10) {
      setError("닉네임은 2~10자로 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const me = await updateMyProfile({ nickname: nextNickname });
      setNickname(me.nickname);
      setInitialNickname(me.nickname);
      setMessage("닉네임이 변경되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "닉네임 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      setMessage("");
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      setError("새 비밀번호는 4자 이상 입력해 주세요.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      setMessage("비밀번호가 변경되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const setPassword = (key: keyof typeof passwordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px 80px" }}>
      <section style={wrap}>
        <div style={hero}>
          <p style={{ margin: 0, color: "var(--brand-light)", fontWeight: 700 }}>계정 및 보안</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 28, fontWeight: 800 }}>계정 관리</h1>
          <Link href="/settings" style={{ color: "var(--brand-light)", fontWeight: 700 }}>
            설정으로 돌아가기
          </Link>
        </div>

        <form onSubmit={handleNicknameSubmit} style={card}>
          <div>
            <p style={title}>닉네임 변경</p>
            <p style={desc}>다른 사용자에게 표시되는 이름입니다.</p>
          </div>
          <label style={label}>
            <span style={labelText}>닉네임</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={10}
              disabled={loading || saving}
              style={input}
            />
          </label>
          <button
            type="submit"
            className="mui-btn"
            disabled={loading || saving || nickname.trim() === initialNickname}
            style={primaryBtn}
          >
            {saving ? "저장 중" : "변경하기"}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} style={card}>
          <div>
            <p style={title}>비밀번호 변경</p>
            <p style={desc}>현재 비밀번호 확인 후 새 비밀번호로 변경합니다.</p>
          </div>
          <label style={label}>
            <span style={labelText}>현재 비밀번호</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={setPassword("currentPassword")}
              minLength={4}
              disabled={saving}
              style={input}
            />
          </label>
          <label style={label}>
            <span style={labelText}>새 비밀번호</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={setPassword("newPassword")}
              minLength={4}
              disabled={saving}
              style={input}
            />
          </label>
          <label style={label}>
            <span style={labelText}>새 비밀번호 확인</span>
            <input
              type="password"
              value={passwordForm.newPasswordConfirm}
              onChange={setPassword("newPasswordConfirm")}
              minLength={4}
              disabled={saving}
              style={input}
            />
          </label>
          <button
            type="submit"
            className="mui-btn"
            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.newPasswordConfirm}
            style={primaryBtn}
          >
            {saving ? "저장 중" : "비밀번호 변경"}
          </button>
        </form>

        {(message || error) && (
          <p style={{ margin: 0, color: error ? "var(--danger)" : "var(--brand-light)", fontSize: 14, fontWeight: 700 }}>
            {error || message}
          </p>
        )}
      </section>
    </main>
  );
}

const wrap: CSSProperties = { maxWidth: 520, margin: "0 auto", display: "grid", gap: 16 };
const hero: CSSProperties = {
  padding: "22px 20px",
  borderRadius: 20,
  background: "var(--surface)",
  border: "1px solid var(--line)",
};
const card: CSSProperties = {
  padding: "18px 20px",
  borderRadius: 20,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 14,
};
const title: CSSProperties = { margin: 0, fontWeight: 800, fontSize: 17 };
const desc: CSSProperties = { margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.5 };
const label: CSSProperties = { display: "grid", gap: 8 };
const labelText: CSSProperties = { color: "var(--ink-secondary)", fontSize: 13, fontWeight: 700 };
const input: CSSProperties = {
  height: 46,
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  padding: "0 14px",
  fontSize: 16,
  outline: "none",
};
const primaryBtn: CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: 0,
  background: "var(--brand)",
  color: "#fff",
  fontWeight: 800,
};
