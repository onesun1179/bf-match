package com.bfmatch.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import com.bfmatch.api.notification.FcmTokenRepository
import com.bfmatch.api.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class TokenRefreshService(
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
    private val userRepository: UserRepository,
    private val fcmTokenRepository: FcmTokenRepository,
) {
    fun refresh(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): TokenRefreshResponse {
        val cookieToken = refreshTokenCookieManager.resolveRefreshToken(request)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token cookie is missing.")
        val refreshToken = refreshTokenService.findValidToken(cookieToken)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid or expired.")

        val user = refreshToken.user
        if (user.currentSessionId.isNullOrBlank()) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session is invalid.")
        }
        val accessToken = jwtTokenProvider.createAccessToken(
            AuthenticatedUser(
                userId = user.id ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."),
                provider = user.authProvider.name,
                providerUserId = user.providerUserId,
                email = user.email,
                nickname = user.nickname,
                sessionId = user.currentSessionId,
            ),
        )

        return TokenRefreshResponse(
            accessToken = accessToken,
            nickname = user.nickname,
        )
    }

    fun logout(request: HttpServletRequest, response: HttpServletResponse) {
        val cookieToken = refreshTokenCookieManager.resolveRefreshToken(request)
        if (!cookieToken.isNullOrBlank()) {
            val refreshToken = refreshTokenService.findValidToken(cookieToken)
            refreshTokenService.revoke(cookieToken)
            val userId = refreshToken?.user?.id
            if (userId != null) {
                userRepository.findById(userId).ifPresent { user ->
                    user.currentSessionId = null
                    userRepository.save(user)
                }
                fcmTokenRepository.deleteAllByUserId(userId)
            }
        }
        refreshTokenCookieManager.expireRefreshTokenCookie(response)
    }
}
