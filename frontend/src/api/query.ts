import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {api, clearAccessToken, setAccessToken} from "./client";
import {appLogin, getAnonymousKey} from "@apps-in-toss/web-framework";

export type Grade = "F" | "E" | "D" | "C" | "B" | "A" | "S";
export type Gender = "MALE" | "FEMALE";

export type MeResponse = {
  id: number;
  nickname: string;
  email: string | null;
  gender: Gender | null;
  onboardingCompleted: boolean;
  skill: { nationalGrade: Grade; lv: number; exp: number } | null;
};

export type GroupSummary = {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  maxMembers: number | null;
};

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type GradeRankingEntry = {
  userId: number;
  nickname: string;
  winRate: number;
};

export type RankingByGrade = {
  grades: Record<Grade, Record<string, GradeRankingEntry[]>>;
};

export type NotificationPreferences = {
  inviteAccepted: boolean;
  inviteDeclined: boolean;
  memberJoined: boolean;
  memberKicked: boolean;
  groupUpdated: boolean;
  gradeUpgraded: boolean;
  gameCreated: boolean;
  gameStarted: boolean;
  gameFinished: boolean;
  gameProposalReceived: boolean;
  gameProposalApproved: boolean;
  gameProposalRejected: boolean;
  gameScoreRequested: boolean;
  gameScoreConfirmed: boolean;
  gameScoreRejected: boolean;
};

type LoginResponse = { accessToken: string };

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/api/v1/me")).data,
    enabled,
    retry: false,
  });
}

export function useGroupsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get<GroupSummary[]>("/api/v1/groups")).data,
    enabled,
  });
}

export function useNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get<AppNotification[]>("/api/v1/notifications")).data,
    enabled,
  });
}

export function useRankingQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["ranking"],
    queryFn: async () =>
      (await api.get<RankingByGrade>("/api/v1/ranking")).data,
    enabled,
  });
}

export function useNotificationPreferencesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () =>
      (await api.get<NotificationPreferences>("/api/v1/notifications/preferences"))
        .data,
    enabled,
  });
}

export function useAppLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const { authorizationCode, referrer } = await appLogin();
        const res = await api.post<LoginResponse>("/api/v1/auth/toss/login", {
          authorizationCode,
          referrer,
        });
        setAccessToken(res.data.accessToken);
        return res.data;
      } catch (appLoginError) {
        const anonymousKey = await getAnonymousKey();
        if (anonymousKey == null || anonymousKey === "ERROR") {
          throw appLoginError;
        }

        const res = await api.post<LoginResponse>("/api/v1/auth/toss/anonymous-login", {
          userKeyHash: anonymousKey.hash,
        });
        setAccessToken(res.data.accessToken);
        return res.data;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/api/v1/auth/logout");
      clearAccessToken();
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: Partial<NotificationPreferences>) =>
      (
        await api.patch<NotificationPreferences>(
          "/api/v1/notifications/preferences",
          request,
        )
      ).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
    },
  });
}
