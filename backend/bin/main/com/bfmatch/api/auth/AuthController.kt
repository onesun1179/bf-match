package com.bfmatch.api.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val tokenRefreshService: TokenRefreshService,
    private val localAuthService: LocalAuthService,
) {
    @PostMapping("/register")
    fun register(
        @RequestBody @Valid request: RegisterRequest,
        response: HttpServletResponse,
    ): TokenRefreshResponse = localAuthService.register(request, response)

    @PostMapping("/login")
    fun login(
        @RequestBody @Valid request: LoginRequest,
        response: HttpServletResponse,
    ): TokenRefreshResponse = localAuthService.login(request, response)

    @PostMapping("/refresh")
    fun refresh(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): TokenRefreshResponse = tokenRefreshService.refresh(request, response)

    @PostMapping("/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): Map<String, String> {
        tokenRefreshService.logout(request, response)
        return mapOf("message" to "Logged out successfully.")
    }
}
