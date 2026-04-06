export type NotificationPreferenceKey =
  | "inviteAccepted"
  | "inviteDeclined"
  | "memberJoined"
  | "memberKicked"
  | "groupUpdated"
  | "gradeUpgraded"
  | "gameCreated"
  | "gameStarted"
  | "gameFinished"
  | "gameScoreRequested"
  | "gameScoreConfirmed"
  | "gameScoreRejected";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  inviteAccepted: true,
  inviteDeclined: true,
  memberJoined: true,
  memberKicked: true,
  groupUpdated: true,
  gradeUpgraded: true,
  gameCreated: true,
  gameStarted: true,
  gameFinished: true,
  gameScoreRequested: true,
  gameScoreConfirmed: true,
  gameScoreRejected: true,
};
