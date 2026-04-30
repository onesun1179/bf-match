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
import jakarta.mail.internet.MimeMessage
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.beans.factory.ObjectProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import kotlin.random.Random
import java.util.UUID

@Service
class LocalAuthService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
    private val fcmTokenRepository: FcmTokenRepository,
    private val mailSenderProvider: ObjectProvider<JavaMailSender>,
    @Value("\${spring.mail.host:}") private val mailHost: String,
    @Value("\${app.mail.from}") private val mailFrom: String,
) {
    @Transactional
    fun register(request: RegisterRequest, response: HttpServletResponse): TokenRefreshResponse {
        val email = normalizeEmail(request.email)
        val existing = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.LOCAL, email)
        if (existing != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.")
        }

        if (userRepository.existsByNickname(request.nickname.trim())) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.")
        }

        val user = userRepository.save(
            User(
                authProvider = AuthProvider.LOCAL,
                providerUserId = email,
                email = email,
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
        val user = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.LOCAL, normalizeEmail(request.email))
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.")

        if (user.password == null || !passwordEncoder.matches(request.password, user.password)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.")
        }

        return issueTokens(user, response)
    }

    @Transactional
    fun resetPassword(request: PasswordResetRequest) {
        val email = normalizeEmail(request.email)
        val user = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.LOCAL, email)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "가입된 이메일을 찾을 수 없습니다.")

        val temporaryPassword = generateTemporaryPassword()
        user.password = passwordEncoder.encode(temporaryPassword)
        user.currentSessionId = null
        userRepository.save(user)
        refreshTokenRepository.deleteAllByUser(user)
        fcmTokenRepository.deleteAllByUserId(user.id!!)
        sendTemporaryPassword(email, temporaryPassword)
    }

    @Transactional
    fun changePassword(authenticatedUser: AuthenticatedUser, request: PasswordChangeRequest) {
        val user = userRepository.findById(authenticatedUser.userId).orElseThrow {
            ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found.")
        }
        if (user.authProvider != AuthProvider.LOCAL) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호를 변경할 수 없는 계정입니다.")
        }
        if (user.password == null || !passwordEncoder.matches(request.currentPassword, user.password)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.")
        }
        if (passwordEncoder.matches(request.newPassword, user.password)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호가 현재 비밀번호와 같습니다.")
        }

        user.password = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
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

    private fun normalizeEmail(email: String): String = email.trim().lowercase()

    private fun generateTemporaryPassword(): String {
        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
        return (1..12).map { chars[Random.nextInt(chars.length)] }.joinToString("")
    }

    private fun sendTemporaryPassword(email: String, temporaryPassword: String) {
        if (mailHost.isBlank()) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "메일 발송 설정이 필요합니다.")
        }
        val mailSender = mailSenderProvider.getIfAvailable()
            ?: throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "메일 발송 설정이 필요합니다.")
        try {
            val message: MimeMessage = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(message, false, "UTF-8")
            helper.setFrom(mailFrom)
            helper.setTo(email)
            helper.setSubject("[BF Match] 임시 비밀번호 안내")
            helper.setText(
                """
                BF Match 임시 비밀번호입니다.

                임시 비밀번호: $temporaryPassword

                로그인 후 비밀번호를 변경해 주세요.
                """.trimIndent(),
            )
            mailSender.send(message)
        } catch (ex: Exception) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "임시 비밀번호 메일 발송에 실패했습니다.", ex)
        }
    }
}

data class RegisterRequest(
    @field:NotBlank
    @field:Email
    @field:Size(max = 100)
    val email: String,
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
    @field:NotBlank
    @field:Email
    val email: String,
    val password: String,
)

data class PasswordResetRequest(
    @field:NotBlank
    @field:Email
    val email: String,
)

data class PasswordChangeRequest(
    @field:NotBlank
    val currentPassword: String,
    @field:NotBlank
    @field:Size(min = 4, max = 255)
    val newPassword: String,
)
