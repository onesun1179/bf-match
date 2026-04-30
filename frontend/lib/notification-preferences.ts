export type NotificationPreferenceKey =
  | "inviteAccepted"
  | "inviteDeclined"
  | "memberJoined"
  | "memberKicked"
  | "memberRoleChanged"
  | "groupUpdated"
  | "groupClosed"
  | "groupReminder"
  | "gradeUpgraded"
  | "gameCreated"
  | "gameCancelled"
  | "gameStarted"
  | "gameCourtChanged"
  | "gameFinished"
  | "gameProposalReceived"
  | "gameProposalApproved"
  | "gameProposalRejected"
  | "gameScoreRequested"
  | "gameScoreConfirmed"
  | "gameScoreRejected";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  inviteAccepted: true,
  inviteDeclined: true,
  memberJoined: true,
  memberKicked: true,
  memberRoleChanged: true,
  groupUpdated: true,
  groupClosed: true,
  groupReminder: true,
  gradeUpgraded: true,
  gameCreated: true,
  gameCancelled: true,
  gameStarted: true,
  gameCourtChanged: true,
  gameFinished: true,
  gameProposalReceived: true,
  gameProposalApproved: true,
  gameProposalRejected: true,
  gameScoreRequested: true,
  gameScoreConfirmed: true,
  gameScoreRejected: true,
};
