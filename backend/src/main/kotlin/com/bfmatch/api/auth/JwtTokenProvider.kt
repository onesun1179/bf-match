package com.bfmatch.api.auth

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    @Value("\${app.jwt.secret}") secret: String,
    @Value("\${app.jwt.access-token-expiration-seconds}") private val accessTokenExpirationSeconds: Long,
) {
    private val signingKey: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

    fun createAccessToken(user: AuthenticatedUser): String {
        val now = Instant.now()
        val expiresAt = now.plusSeconds(accessTokenExpirationSeconds)

        return Jwts.builder()
            .subject(user.userId.toString())
            .claim("provider", user.provider)
            .claim("providerUserId", user.providerUserId)
            .claim("email", user.email)
            .claim("nickname", user.nickname)
            .claim("sessionId", user.sessionId)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact()
    }

    fun validateToken(token: String): Boolean = runCatching {
        Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token)
        true
    }.getOrDefault(false)

    fun parseAuthenticatedUser(token: String): AuthenticatedUser {
        val claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).payload
        return AuthenticatedUser(
            userId = claims.subject.toLong(),
            provider = claims["provider"] as String,
            providerUserId = claims["providerUserId"] as String,
            email = claims["email"] as String?,
            nickname = claims["nickname"] as String,
            sessionId = claims["sessionId"] as String?,
        )
    }
}
