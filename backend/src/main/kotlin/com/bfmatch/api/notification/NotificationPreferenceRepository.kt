package com.bfmatch.api.notification

import org.springframework.data.jpa.repository.JpaRepository

interface NotificationPreferenceRepository : JpaRepository<NotificationPreference, Long> {
    fun findByUserId(userId: Long): NotificationPreference?
}

