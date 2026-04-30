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
    var memberRoleChanged: Boolean = true,

    @Column(nullable = false)
    var groupUpdated: Boolean = true,

    @Column(nullable = false)
    var groupClosed: Boolean = true,

    @Column(nullable = false)
    var groupReminder: Boolean = true,

    @Column(nullable = false)
    var gradeUpgraded: Boolean = true,

    @Column(nullable = false)
    var gameCreated: Boolean = true,

    @Column(nullable = false)
    var gameCancelled: Boolean = true,

    @Column(nullable = false)
    var gameStarted: Boolean = true,

    @Column(nullable = false)
    var gameCourtChanged: Boolean = true,

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
)

data class NotificationPreferencesResponse(
    val inviteAccepted: Boolean,
    val inviteDeclined: Boolean,
    val memberJoined: Boolean,
    val memberKicked: Boolean,
    val memberRoleChanged: Boolean,
    val groupUpdated: Boolean,
    val groupClosed: Boolean,
    val groupReminder: Boolean,
    val gradeUpgraded: Boolean,
    val gameCreated: Boolean,
    val gameCancelled: Boolean,
    val gameStarted: Boolean,
    val gameCourtChanged: Boolean,
    val gameFinished: Boolean,
    val gameProposalReceived: Boolean,
    val gameProposalApproved: Boolean,
    val gameProposalRejected: Boolean,
    val gameScoreRequested: Boolean,
    val gameScoreConfirmed: Boolean,
    val gameScoreRejected: Boolean,
)

data class UpdateNotificationPreferencesRequest(
    val inviteAccepted: Boolean? = null,
    val inviteDeclined: Boolean? = null,
    val memberJoined: Boolean? = null,
    val memberKicked: Boolean? = null,
    val memberRoleChanged: Boolean? = null,
    val groupUpdated: Boolean? = null,
    val groupClosed: Boolean? = null,
    val groupReminder: Boolean? = null,
    val gradeUpgraded: Boolean? = null,
    val gameCreated: Boolean? = null,
    val gameCancelled: Boolean? = null,
    val gameStarted: Boolean? = null,
    val gameCourtChanged: Boolean? = null,
    val gameFinished: Boolean? = null,
    val gameProposalReceived: Boolean? = null,
    val gameProposalApproved: Boolean? = null,
    val gameProposalRejected: Boolean? = null,
    val gameScoreRequested: Boolean? = null,
    val gameScoreConfirmed: Boolean? = null,
    val gameScoreRejected: Boolean? = null,
)
