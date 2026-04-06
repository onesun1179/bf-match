package com.bfmatch.api.notification

import org.springframework.data.jpa.repository.JpaRepository

interface NotificationRepository : JpaRepository<Notification, Long> {
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<Notification>
    fun countByUserIdAndIsReadFalse(userId: Long): Long
    fun findByIdAndUserId(id: Long, userId: Long): Notification?
}
