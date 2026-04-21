package com.bfmatch.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.Authentication
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder
import com.bfmatch.api.user.UserRepository
import java.util.UUID

@Component
class OAuth2AuthenticationSuccessHandler(
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
    private val userRepository: UserRepository,
    @Value("\${app.frontend.base-url}") private val frontendBaseUrl: String,
) : SimpleUrlAuthenticationSuccessHandler() {
    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val principal = authentication.principal as CustomOAuth2User
        principal.user.currentSessionId = UUID.randomUUID().toString()
        userRepository.save(principal.user)
        val refreshToken = refreshTokenService.rotateForUser(principal.user)
        refreshTokenCookieManager.addRefreshTokenCookie(response, refreshToken.token)

        val redirectUrl = UriComponentsBuilder
            .fromUriString("$frontendBaseUrl/auth/callback")
            .queryParam("status", "success")
            .build()
            .toUriString()

        redirectStrategy.sendRedirect(request, response, redirectUrl)
    }
}
