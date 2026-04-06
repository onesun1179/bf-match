package com.bfmatch.api.auth

import com.bfmatch.api.user.AuthProvider
import com.bfmatch.api.user.Gender
import com.bfmatch.api.user.NationalGrade
import com.bfmatch.api.user.PlayerSkill
import com.bfmatch.api.user.PlayerSkillRepository
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class LocalAuthService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
) {
    @Transactional
    fun register(request: RegisterRequest, response: HttpServletResponse): TokenRefreshResponse {
        val username = request.username.trim()
        val existing = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.LOCAL, username)
        if (existing != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.")
        }

        if (userRepository.existsByNickname(request.nickname.trim())) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.")
        }

        val user = userRepository.save(
            User(
                authProvider = AuthProvider.LOCAL,
                providerUserId = username,
                nickname = request.nickname.trim(),
                password = passwordEncoder.encode(request.password),
                gender = request.gender,
            ),
        )

        playerSkillRepository.save(
            PlayerSkill(
                user = user,
                nationalGrade = request.nationalGrade,
                lv = 1,
                exp = 0.0,
            ),
        )

        return issueTokens(user, response)
    }

    @Transactional
    fun login(request: LoginRequest, response: HttpServletResponse): TokenRefreshResponse {
        val user = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.LOCAL, request.username.trim())
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.")

        if (user.password == null || !passwordEncoder.matches(request.password, user.password)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.")
        }

        return issueTokens(user, response)
    }

    private fun issueTokens(user: User, response: HttpServletResponse): TokenRefreshResponse {
        val authenticatedUser = AuthenticatedUser(
            userId = user.id!!,
            provider = user.authProvider.name,
            providerUserId = user.providerUserId,
            email = user.email,
            nickname = user.nickname,
        )

        val accessToken = jwtTokenProvider.createAccessToken(authenticatedUser)
        val refreshToken = refreshTokenService.rotateForUser(user)
        refreshTokenCookieManager.addRefreshTokenCookie(response, refreshToken.token)

        return TokenRefreshResponse(
            accessToken = accessToken,
            nickname = user.nickname,
        )
    }
}

data class RegisterRequest(
    val username: String,
    val password: String,
    val nickname: String,
    val nationalGrade: NationalGrade,
    val gender: Gender,
)

data class LoginRequest(
    val username: String,
    val password: String,
)
