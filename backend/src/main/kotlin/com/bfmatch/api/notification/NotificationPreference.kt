package com.bfmatch.api.notification

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "notification_preferences")
class NotificationPreference(
    @Id
    @Column(name = "user_id")
    var userId: Long? = null,

    @Column(nullable = false)
    var inviteAccepted: Boolean = true,

    @Column(nullable = false)
    var inviteDeclined: Boolean = true,

    @Column(nullable = false)
    var memberJoined: Boolean = true,

    @Column(nullable = false)
    var memberKicked: Boolean = true,

    @Column(nullable = false)
    var groupUpdated: Boolean = true,

    @Column(nullable = false)
    var gradeUpgraded: Boolean = true,

    @Column(nullable = false)
    var gameCreated: Boolean = true,

    @Column(nullable = false)
    var gameStarted: Boolean = true,

    @Column(nullable = false)
    var gameFinished: Boolean = true,

    @Column(nullable = false)
    var gameProposalReceived: Boolean = true,

    @Column(nullable = false)
    var gameProposalApproved: Boolean = true,

    @Column(nullable = false)
    var gameProposalRejected: Boolean = true,

    @Column(nullable = false)
    var gameScoreRequested: Boolean = true,

    @Column(nullable = false)
    var gameScoreConfirmed: Boolean = true,

    @Column(nullable = false)
    var gameScoreRejected: Boolean = true,

    @Column(nullable = false)
    var webInviteAccepted: Boolean = true,

    @Column(nullable = false)
    var webInviteDeclined: Boolean = true,

    @Column(nullable = false)
    var webMemberJoined: Boolean = true,

    @Column(nullable = false)
    var webMemberKicked: Boolean = true,

    @Column(nullable = false)
    var webGroupUpdated: Boolean = true,

    @Column(nullable = false)
    var webGradeUpgraded: Boolean = true,

    @Column(nullable = false)
    var webGameCreated: Boolean = true,

    @Column(nullable = false)
    var webGameStarted: Boolean = true,

    @Column(nullable = false)
    var webGameFinished: Boolean = true,

    @Column(nullable = false)
    var webGameProposalReceived: Boolean = true,

    @Column(nullable = false)
    var webGameProposalApproved: Boolean = true,

    @Column(nullable = false)
    var webGameProposalRejected: Boolean = true,

    @Column(nullable = false)
    var webGameScoreRequested: Boolean = true,

    @Column(nullable = false)
    var webGameScoreConfirmed: Boolean = true,

    @Column(nullable = false)
    var webGameScoreRejected: Boolean = true,
)

data class NotificationChannelPreferencesResponse(
    val inviteAccepted: Boolean,
    val inviteDeclined: Boolean,
    val memberJoined: Boolean,
    val memberKicked: Boolean,
    val groupUpdated: Boolean,
    val gradeUpgraded: Boolean,
    val gameCreated: Boolean,
    val gameStarted: Boolean,
    val gameFinished: Boolean,
    val gameProposalReceived: Boolean,
    val gameProposalApproved: Boolean,
    val gameProposalRejected: Boolean,
    val gameScoreRequested: Boolean,
    val gameScoreConfirmed: Boolean,
    val gameScoreRejected: Boolean,
)

data class NotificationPreferencesResponse(
    val toss: NotificationChannelPreferencesResponse,
    val web: NotificationChannelPreferencesResponse,
)

data class UpdateNotificationChannelPreferencesRequest(
    val inviteAccepted: Boolean? = null,
    val inviteDeclined: Boolean? = null,
    val memberJoined: Boolean? = null,
    val memberKicked: Boolean? = null,
    val groupUpdated: Boolean? = null,
    val gradeUpgraded: Boolean? = null,
    val gameCreated: Boolean? = null,
    val gameStarted: Boolean? = null,
    val gameFinished: Boolean? = null,
    val gameProposalReceived: Boolean? = null,
    val gameProposalApproved: Boolean? = null,
    val gameProposalRejected: Boolean? = null,
    val gameScoreRequested: Boolean? = null,
    val gameScoreConfirmed: Boolean? = null,
    val gameScoreRejected: Boolean? = null,
)

data class UpdateNotificationPreferencesRequest(
    val toss: UpdateNotificationChannelPreferencesRequest? = null,
    val web: UpdateNotificationChannelPreferencesRequest? = null,
)
