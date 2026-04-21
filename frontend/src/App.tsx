import {useEffect, useMemo, useRef, useState} from "react";
import {isAxiosError} from "axios";
import {Button, List, ListRow, SegmentedControl, Spacing, Switch, Text, Top,} from "@toss/tds-mobile";
import {
  type NotificationPreferences,
  useAppLoginMutation,
  useGroupsQuery,
  useLogoutMutation,
  useMeQuery,
  useNotificationPreferencesQuery,
  useNotificationsQuery,
  useRankingQuery,
  useUpdateNotificationPreferencesMutation,
} from "./api/query";

type Tab = "home" | "events" | "ranking" | "notifications" | "my";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const hasAttemptedAutoLoginRef = useRef(false);

  const meQuery = useMeQuery(true);
  const appLoginMutation = useAppLoginMutation();
  const logoutMutation = useLogoutMutation();

  const isLoggedIn = meQuery.data != null;

  const groupsQuery = useGroupsQuery(isLoggedIn && tab === "events");
  const rankingQuery = useRankingQuery(isLoggedIn && tab === "ranking");
  const notificationsQuery = useNotificationsQuery(isLoggedIn && tab === "notifications");
  const preferencesQuery = useNotificationPreferencesQuery(
    isLoggedIn && tab === "notifications",
  );
  const updatePreferencesMutation = useUpdateNotificationPreferencesMutation();

  const rankingTop = useMemo(() => {
    const raw = rankingQuery.data;
    if (raw == null) return [];
    return Object.values(raw.grades)
      .flatMap((perType) => Object.values(perType).flatMap((rows) => rows))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);
  }, [rankingQuery.data]);

  useEffect(() => {
    if (meQuery.isLoading || isLoggedIn || appLoginMutation.isPending) return;
    if (hasAttemptedAutoLoginRef.current) return;
    hasAttemptedAutoLoginRef.current = true;
    appLoginMutation.mutate();
  }, [appLoginMutation, isLoggedIn, meQuery.isLoading]);

  function handleToggleAll(enabled: boolean) {
    const prefs = preferencesQuery.data;
    if (prefs == null) return;
    const payload = Object.keys(prefs).reduce((acc, key) => {
      acc[key as keyof NotificationPreferences] = enabled;
      return acc;
    }, {} as NotificationPreferences);
    updatePreferencesMutation.mutate(payload);
  }

  if (meQuery.isLoading) {
    return <main className="page center">불러오는 중...</main>;
  }

  if (!isLoggedIn) {
    const isAutoLoggingIn =
      appLoginMutation.isPending || (!appLoginMutation.isError && !hasAttemptedAutoLoginRef.current);
    return (
      <main className="page">
        <Top title="BF Match" subtitleBottom="연결 중" />
        <Spacing size={20} />
        <section className="block">
          {isAutoLoggingIn ? (
            <Text typography="t5">토스 계정 연결 중...</Text>
          ) : (
            <>
              <Text typography="t5">자동 로그인에 실패했습니다.</Text>
              <Spacing size={8} />
              <Text color="red">{formatLoginError(appLoginMutation.error)}</Text>
              <Spacing size={12} />
              <Button
                display="full"
                disabled={appLoginMutation.isPending}
                onClick={() => appLoginMutation.mutate()}
              >
                다시 시도
              </Button>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <Top title="BF Match" subtitleBottom={meQuery.data.nickname} />
      <Spacing size={12} />
      <section className="block">
        <SegmentedControl
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          alignment="fixed"
        >
          <SegmentedControl.Item value="home">홈</SegmentedControl.Item>
          <SegmentedControl.Item value="events">이벤트</SegmentedControl.Item>
          <SegmentedControl.Item value="ranking">랭킹</SegmentedControl.Item>
          <SegmentedControl.Item value="notifications">알림</SegmentedControl.Item>
          <SegmentedControl.Item value="my">마이</SegmentedControl.Item>
        </SegmentedControl>
      </section>
      <Spacing size={12} />

      {tab === "home" && (
        <section className="block">
          <List>
            <ListRow
              onClick={() => setTab("events")}
              contents={<ListRow.Texts type="2RowTypeA" top="이벤트" bottom="모임/경기 관리" />}
              arrowType="right"
            />
            <ListRow
              onClick={() => setTab("ranking")}
              contents={<ListRow.Texts type="2RowTypeA" top="랭킹" bottom="개인/팀 성적 보기" />}
              arrowType="right"
            />
            <ListRow
              onClick={() => setTab("notifications")}
              contents={<ListRow.Texts type="2RowTypeA" top="알림" bottom="알림 항목 ON/OFF" />}
              arrowType="right"
            />
          </List>
        </section>
      )}

      {tab === "events" && (
        <section className="block">
          {groupsQuery.isLoading && <Text color="gray500">이벤트 불러오는 중...</Text>}
          <List>
            {groupsQuery.data?.map((g) => (
              <ListRow
                key={g.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={g.name}
                    bottom={`${g.description ?? "설명 없음"} · ${g.memberCount}${
                      g.maxMembers != null ? `/${g.maxMembers}` : ""
                    }명`}
                  />
                }
              />
            ))}
          </List>
        </section>
      )}

      {tab === "ranking" && (
        <section className="block">
          <Text typography="t5">상위 랭킹</Text>
          <Spacing size={8} />
          {rankingQuery.isLoading && <Text color="gray500">랭킹 불러오는 중...</Text>}
          <List>
            {rankingTop.map((r, idx) => (
              <ListRow
                key={`${r.userId}-${idx}`}
                contents={
                  <ListRow.Texts
                    type="1RowTypeA"
                    top={`${idx + 1}. ${r.nickname}`}
                  />
                }
                right={<Text typography="t6">{Math.round(r.winRate * 100)}%</Text>}
              />
            ))}
          </List>
        </section>
      )}

      {tab === "notifications" && (
        <section className="block">
          <div className="row">
            <Button variant="weak" onClick={() => handleToggleAll(true)}>
              전체 ON
            </Button>
            <Button color="danger" variant="weak" onClick={() => handleToggleAll(false)}>
              전체 OFF
            </Button>
          </div>
          <Spacing size={12} />
          <Text typography="t5">알림 설정</Text>
          <Spacing size={8} />
          <List>
            {Object.entries(preferencesQuery.data ?? {}).map(([key, enabled]) => (
              <ListRow
                key={key}
                contents={<ListRow.Texts type="1RowTypeA" top={toLabel(key)} />}
                right={
                  <Switch
                    checked={enabled}
                    onChange={(_, checked) =>
                      updatePreferencesMutation.mutate({
                        [key]: checked,
                      } as Partial<NotificationPreferences>)
                    }
                  />
                }
              />
            ))}
          </List>
          <Spacing size={12} />
          <Text typography="t5">최근 알림</Text>
          <Spacing size={8} />
          {notificationsQuery.isLoading && <Text color="gray500">알림 불러오는 중...</Text>}
          <List>
            {notificationsQuery.data?.map((n) => (
              <ListRow
                key={n.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={n.title}
                    bottom={new Date(n.createdAt).toLocaleString("ko-KR")}
                  />
                }
              />
            ))}
          </List>
        </section>
      )}

      {tab === "my" && (
        <section className="block">
          <List>
            <ListRow
              contents={<ListRow.Texts type="1RowTypeA" top={`닉네임: ${meQuery.data.nickname}`} />}
            />
            <ListRow
              contents={<ListRow.Texts type="1RowTypeA" top={`LV: ${meQuery.data.skill?.lv ?? "-"}`} />}
            />
            <ListRow
              contents={
                <ListRow.Texts
                  type="1RowTypeA"
                  top={`EXP: ${meQuery.data.skill?.exp?.toFixed(4) ?? "-"}`}
                />
              }
            />
          </List>
          <Spacing size={12} />
          <Button
            color="danger"
            display="full"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
          </Button>
        </section>
      )}
    </main>
  );
}

function toLabel(key: string): string {
  const labels: Record<string, string> = {
    inviteAccepted: "초대 수락",
    inviteDeclined: "초대 거절",
    memberJoined: "멤버 합류",
    memberKicked: "멤버 제외",
    groupUpdated: "이벤트 변경",
    gradeUpgraded: "급수 업그레이드",
    gameCreated: "게임 생성",
    gameStarted: "게임 시작",
    gameFinished: "게임 종료",
    gameProposalReceived: "게임 제안 도착",
    gameProposalApproved: "게임 제안 수락",
    gameProposalRejected: "게임 제안 거절",
    gameScoreRequested: "점수 입력 요청",
    gameScoreConfirmed: "점수 확정",
    gameScoreRejected: "점수 반려",
  };
  return labels[key] ?? key;
}

function formatLoginError(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.length > 0) return message;
    if (typeof error.response?.status === "number") {
      return `서버 오류 (${error.response.status})`;
    }
  }
  if (error instanceof Error && error.message.length > 0) return error.message;
  return "로그인 연결 중 오류가 발생했습니다.";
}
