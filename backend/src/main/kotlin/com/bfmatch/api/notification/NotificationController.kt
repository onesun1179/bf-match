package com.bfmatch.api.notification

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.user.UserRepository
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

@RestController
@RequestMapping("/api/v1/notifications")
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
}
