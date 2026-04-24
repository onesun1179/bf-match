package com.bfmatch.api.notification

import org.springframework.data.jpa.repository.JpaRepository

interface FcmTokenRepository : JpaRepository<FcmToken, Long> {
    fun findAllByUserId(userId: Long): List<FcmToken>
    fun findByToken(token: String): FcmToken?
    fun deleteAllByUserId(userId: Long)
}
