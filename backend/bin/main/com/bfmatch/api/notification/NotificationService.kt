package com.bfmatch.api.notification

import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

@Service
class NotificationService(
    private val notificationRepository: NotificationRepository,
    private val notificationPreferenceRepository: NotificationPreferenceRepository,
    private val fcmTokenRepository: FcmTokenRepository,
    private val userRepository: UserRepository,
    private val fcmService: FcmService,
) {
    @Transactional
    fun send(userId: Long, type: NotificationType, title: String, body: String, targetType: String? = null, targetId: Long? = null) {
        val user = userRepository.findById(userId).orElse(null) ?: return
        if (!user.notificationEnabled) return
        val preference = getOrCreatePreference(userId)
        if (!isTypeEnabled(preference, type)) return

        notificationRepository.save(
            Notification(user = user, type = type, title = title, body = body, targetType = targetType, targetId = targetId),
        )

        val tokens = fcmTokenRepository.findAllByUserId(userId)
        val data = mutableMapOf("type" to type.name)
        if (targetType != null) data["targetType"] = targetType
        if (targetId != null) data["targetId"] = targetId.toString()
        tokens.forEach { fcmService.sendPush(it.token, title, body, data) }
    }

    @Transactional
    fun sendToGroupMembers(
        memberUserIds: List<Long>,
        excludeUserId: Long?,
        type: NotificationType,
        title: String,
        body: String,
        targetType: String? = null,
        targetId: Long? = null,
    ) {
        memberUserIds
            .filter { it != excludeUserId }
            .forEach { send(it, type, title, body, targetType, targetId) }
    }

    @Transactional(readOnly = true)
    fun getNotifications(userId: Long): List<NotificationResponse> =
        notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId).map { it.toResponse() }

    @Transactional(readOnly = true)
    fun getUnreadCount(userId: Long): Long =
        notificationRepository.countByUserIdAndIsReadFalse(userId)

    @Transactional
    fun markAsRead(userId: Long, notificationId: Long) {
        val n = notificationRepository.findByIdAndUserId(notificationId, userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.")
        n.isRead = true
        notificationRepository.save(n)
    }

    @Transactional
    fun markAllAsRead(userId: Long) {
        notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
            .filter { !it.isRead }
            .forEach { it.isRead = true; notificationRepository.save(it) }
    }

    @Transactional
    fun registerFcmToken(user: User, token: String) {
        fcmTokenRepository.upsertToken(user.id!!, token, Instant.now())
    }

    @Transactional
    fun getPreferences(userId: Long): NotificationPreferencesResponse =
        getOrCreatePreference(userId).toResponse()

    @Transactional
    fun updatePreferences(userId: Long, request: UpdateNotificationPreferencesRequest): NotificationPreferencesResponse {
        val preference = getOrCreatePreference(userId)
        request.inviteAccepted?.let { preference.inviteAccepted = it }
        request.inviteDeclined?.let { preference.inviteDeclined = it }
        request.memberJoined?.let { preference.memberJoined = it }
        request.memberKicked?.let { preference.memberKicked = it }
        request.memberRoleChanged?.let { preference.memberRoleChanged = it }
        request.groupUpdated?.let { preference.groupUpdated = it }
        request.groupClosed?.let { preference.groupClosed = it }
        request.groupReminder?.let { preference.groupReminder = it }
        request.gradeUpgraded?.let { preference.gradeUpgraded = it }
        request.gameCreated?.let { preference.gameCreated = it }
        request.gameCancelled?.let { preference.gameCancelled = it }
        request.gameStarted?.let { preference.gameStarted = it }
        request.gameCourtChanged?.let { preference.gameCourtChanged = it }
        request.gameFinished?.let { preference.gameFinished = it }
        request.gameProposalReceived?.let { preference.gameProposalReceived = it }
        request.gameProposalApproved?.let { preference.gameProposalApproved = it }
        request.gameProposalRejected?.let { preference.gameProposalRejected = it }
        request.gameScoreRequested?.let { preference.gameScoreRequested = it }
        request.gameScoreConfirmed?.let { preference.gameScoreConfirmed = it }
        request.gameScoreRejected?.let { preference.gameScoreRejected = it }
        return notificationPreferenceRepository.save(preference).toResponse()
    }

    private fun getOrCreatePreference(userId: Long): NotificationPreference =
        notificationPreferenceRepository.findByUserId(userId)
            ?: notificationPreferenceRepository.save(NotificationPreference(userId = userId))

    private fun isTypeEnabled(preference: NotificationPreference, type: NotificationType): Boolean = when (type) {
        NotificationType.INVITE_ACCEPTED -> preference.inviteAccepted
        NotificationType.INVITE_DECLINED -> preference.inviteDeclined
        NotificationType.MEMBER_JOINED -> preference.memberJoined
        NotificationType.MEMBER_KICKED -> preference.memberKicked
        NotificationType.MEMBER_ROLE_CHANGED -> preference.memberRoleChanged
        NotificationType.GROUP_UPDATED -> preference.groupUpdated
        NotificationType.GROUP_CLOSED -> preference.groupClosed
        NotificationType.GROUP_REMINDER -> preference.groupReminder
        NotificationType.GRADE_UPGRADED -> preference.gradeUpgraded
        NotificationType.GAME_CREATED -> preference.gameCreated
        NotificationType.GAME_CANCELLED -> preference.gameCancelled
        NotificationType.GAME_STARTED -> preference.gameStarted
        NotificationType.GAME_COURT_CHANGED -> preference.gameCourtChanged
        NotificationType.GAME_FINISHED -> preference.gameFinished
        NotificationType.GAME_PROPOSAL_RECEIVED -> preference.gameProposalReceived
        NotificationType.GAME_PROPOSAL_APPROVED -> preference.gameProposalApproved
        NotificationType.GAME_PROPOSAL_REJECTED -> preference.gameProposalRejected
        NotificationType.GAME_SCORE_REQUESTED -> preference.gameScoreRequested
        NotificationType.GAME_SCORE_CONFIRMED -> preference.gameScoreConfirmed
        NotificationType.GAME_SCORE_REJECTED -> preference.gameScoreRejected
    }

    private fun Notification.toResponse() = NotificationResponse(
        id = id!!,
        type = type,
        title = title,
        body = body,
        targetType = targetType,
        targetId = targetId,
        isRead = isRead,
        createdAt = createdAt.toString(),
    )

    private fun NotificationPreference.toResponse() = NotificationPreferencesResponse(
        inviteAccepted = inviteAccepted,
        inviteDeclined = inviteDeclined,
        memberJoined = memberJoined,
        memberKicked = memberKicked,
        memberRoleChanged = memberRoleChanged,
        groupUpdated = groupUpdated,
        groupClosed = groupClosed,
        groupReminder = groupReminder,
        gradeUpgraded = gradeUpgraded,
        gameCreated = gameCreated,
        gameCancelled = gameCancelled,
        gameStarted = gameStarted,
        gameCourtChanged = gameCourtChanged,
        gameFinished = gameFinished,
        gameProposalReceived = gameProposalReceived,
        gameProposalApproved = gameProposalApproved,
        gameProposalRejected = gameProposalRejected,
        gameScoreRequested = gameScoreRequested,
        gameScoreConfirmed = gameScoreConfirmed,
        gameScoreRejected = gameScoreRejected,
    )
}

data class NotificationResponse(
    val id: Long,
    val type: NotificationType,
    val title: String,
    val body: String,
    val targetType: String?,
    val targetId: Long?,
    val isRead: Boolean,
    val createdAt: String,
)
