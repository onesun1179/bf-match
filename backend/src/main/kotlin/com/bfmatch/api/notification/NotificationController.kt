package com.bfmatch.api.notification

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.user.UserRepository
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.validation.annotation.Validated

@RestController
@RequestMapping("/api/v1/notifications")
@Validated
class NotificationController(
    private val notificationService: NotificationService,
    private val userRepository: UserRepository,
) {
    @GetMapping
    fun list(@AuthenticationPrincipal principal: AuthenticatedUser): List<NotificationResponse> =
        notificationService.getNotifications(principal.userId)

    @GetMapping("/unread-count")
    fun unreadCount(@AuthenticationPrincipal principal: AuthenticatedUser): Map<String, Long> =
        mapOf("count" to notificationService.getUnreadCount(principal.userId))

    @PostMapping("/{id}/read")
    fun markRead(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable id: Long,
    ) = notificationService.markAsRead(principal.userId, id)

    @PostMapping("/read-all")
    fun markAllRead(@AuthenticationPrincipal principal: AuthenticatedUser) =
        notificationService.markAllAsRead(principal.userId)

    @PostMapping("/fcm-token")
    fun registerFcmToken(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody request: Map<String, String>,
    ) {
        val token = request["token"] ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "token is required")
        val user = userRepository.findById(principal.userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")
        }
        notificationService.registerFcmToken(user, token)
    }

    @GetMapping("/preferences")
    fun getPreferences(@AuthenticationPrincipal principal: AuthenticatedUser): NotificationPreferencesResponse =
        notificationService.getPreferences(principal.userId)

    @PatchMapping("/preferences")
    fun updatePreferences(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody request: UpdateNotificationPreferencesRequest,
    ): NotificationPreferencesResponse =
        notificationService.updatePreferences(principal.userId, request)

    @PostMapping("/test")
    fun sendTestNotification(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody request: SendTestNotificationRequest,
    ): Map<String, String> {
        notificationService.send(
            userId = principal.userId,
            type = request.type ?: NotificationType.GAME_CREATED,
            title = request.title.trim(),
            body = request.body.trim(),
        )
        return mapOf("message" to "Test notification sent.")
    }
}

data class SendTestNotificationRequest(
    val type: NotificationType? = null,
    @field:NotBlank
    val title: String,
    @field:NotBlank
    val body: String,
)
