package com.bfmatch.api.notification

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

interface FcmTokenRepository : JpaRepository<FcmToken, Long> {
    fun findAllByUserId(userId: Long): List<FcmToken>
    fun deleteAllByUserId(userId: Long)

    @Modifying
    @Query(
        value = """
            INSERT INTO fcm_tokens (user_id, token, created_at)
            VALUES (:userId, :token, :createdAt)
            ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), created_at = VALUES(created_at)
        """,
        nativeQuery = true,
    )
    fun upsertToken(
        @Param("userId") userId: Long,
        @Param("token") token: String,
        @Param("createdAt") createdAt: Instant,
    )
}
