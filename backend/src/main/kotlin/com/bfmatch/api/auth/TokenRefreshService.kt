package com.bfmatch.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class TokenRefreshService(
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
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
        val accessToken = jwtTokenProvider.createAccessToken(
            AuthenticatedUser(
                userId = user.id ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."),
                provider = user.authProvider.name,
                providerUserId = user.providerUserId,
                email = user.email,
                nickname = user.nickname,
            ),
        )

        return TokenRefreshResponse(
            accessToken = accessToken,
            nickname = user.nickname,
        )
    }

    fun logout(request: HttpServletRequest, response: HttpServletResponse) {
        refreshTokenCookieManager.resolveRefreshToken(request)?.let(refreshTokenService::revoke)
        refreshTokenCookieManager.expireRefreshTokenCookie(response)
    }
}
