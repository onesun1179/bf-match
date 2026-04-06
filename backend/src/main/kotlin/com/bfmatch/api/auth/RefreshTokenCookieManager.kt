package com.bfmatch.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class RefreshTokenCookieManager(
    @Value("\${app.refresh-token.cookie-name}") private val cookieName: String,
    @Value("\${app.refresh-token.expiration-seconds}") private val expirationSeconds: Long,
    @Value("\${app.refresh-token.secure}") private val secure: Boolean,
    @Value("\${app.refresh-token.same-site}") private val sameSite: String,
) {
    fun addRefreshTokenCookie(response: HttpServletResponse, refreshToken: String) {
        val cookie = ResponseCookie.from(cookieName, refreshToken)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite(sameSite)
            .maxAge(Duration.ofSeconds(expirationSeconds))
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }

    fun expireRefreshTokenCookie(response: HttpServletResponse) {
        val cookie = ResponseCookie.from(cookieName, "")
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite(sameSite)
            .maxAge(Duration.ZERO)
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }

    fun resolveRefreshToken(request: HttpServletRequest): String? =
        request.cookies
            ?.firstOrNull { it.name == cookieName }
            ?.value
}
