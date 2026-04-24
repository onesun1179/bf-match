package com.bfmatch.api.auth

import com.bfmatch.api.user.AuthProvider
import com.bfmatch.api.user.Gender
import com.bfmatch.api.user.NationalGrade
import com.bfmatch.api.user.PlayerSkill
import com.bfmatch.api.user.PlayerSkillRepository
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import com.bfmatch.api.notification.FcmTokenRepository
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@Service
class LocalAuthService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
    private val fcmTokenRepository: FcmTokenRepository,
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
                lv = initialLvByGrade(request.nationalGrade),
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
        val sessionId = UUID.randomUUID().toString()
        user.currentSessionId = sessionId
        userRepository.save(user)
        fcmTokenRepository.deleteAllByUserId(user.id!!)

        val authenticatedUser = AuthenticatedUser(
            userId = user.id!!,
            provider = user.authProvider.name,
            providerUserId = user.providerUserId,
            email = user.email,
            nickname = user.nickname,
            sessionId = sessionId,
        )

        val accessToken = jwtTokenProvider.createAccessToken(authenticatedUser)
        val refreshToken = refreshTokenService.rotateForUser(user)
        refreshTokenCookieManager.addRefreshTokenCookie(response, refreshToken.token)

        return TokenRefreshResponse(
            accessToken = accessToken,
            nickname = user.nickname,
        )
    }

    private fun initialLvByGrade(grade: NationalGrade): Int = when (grade) {
        NationalGrade.F -> 1
        NationalGrade.E -> 2
        NationalGrade.D -> 3
        NationalGrade.C -> 4
        NationalGrade.B -> 5
        NationalGrade.A -> 6
        NationalGrade.S -> 7
    }
}

data class RegisterRequest(
    @field:NotBlank
    @field:Size(min = 2, max = 60)
    val username: String,
    @field:NotBlank
    @field:Size(min = 4, max = 255)
    val password: String,
    @field:NotBlank
    @field:Size(min = 2, max = 10)
    val nickname: String,
    val nationalGrade: NationalGrade,
    val gender: Gender,
)

data class LoginRequest(
    val username: String,
    val password: String,
)
