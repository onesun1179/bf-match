package com.bfmatch.api.auth

import com.bfmatch.api.user.User
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class RefreshTokenService(
    private val refreshTokenRepository: RefreshTokenRepository,
    @Value("\${app.refresh-token.expiration-seconds}") private val expirationSeconds: Long,
) {
    @Transactional
    fun rotateForUser(user: User): RefreshToken {
        refreshTokenRepository.deleteAllByUser(user)

        val refreshToken = RefreshToken(
            user = user,
            token = UUID.randomUUID().toString(),
            expiresAt = Instant.now().plusSeconds(expirationSeconds),
        )

        return refreshTokenRepository.save(refreshToken)
    }

    @Transactional
    fun findValidToken(token: String): RefreshToken? {
        val refreshToken = refreshTokenRepository.findByToken(token) ?: return null
        if (refreshToken.expiresAt.isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken)
            return null
        }
        return refreshToken
    }

    @Transactional
    fun revoke(token: String) {
        refreshTokenRepository.deleteByToken(token)
    }
}
