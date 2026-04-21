package com.bfmatch.api.auth

import com.bfmatch.api.user.AuthProvider
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import com.bfmatch.api.notification.FcmTokenRepository
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.time.Duration
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import java.util.UUID

@Service
class TossAuthService(
    private val userRepository: UserRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenService: RefreshTokenService,
    private val refreshTokenCookieManager: RefreshTokenCookieManager,
    private val fcmTokenRepository: FcmTokenRepository,
    private val objectMapper: ObjectMapper,
    @Value("\${app.auth.toss.base-url:https://apps-in-toss-api.toss.im}")
    private val tossBaseUrl: String,
    @Value("\${app.auth.toss.mtls.pkcs12-path:}")
    private val mtlsPkcs12Path: String,
    @Value("\${app.auth.toss.mtls.pkcs12-password:}")
    private val mtlsPkcs12Password: String,
) {
    private val httpClient: HttpClient by lazy { buildMtlsHttpClient() }

    @Transactional
    fun login(request: TossLoginRequest, response: HttpServletResponse): TokenRefreshResponse {
        val accessToken = fetchTossAccessToken(
            authorizationCode = request.authorizationCode.trim(),
            referrer = request.referrer?.trim()?.ifBlank { null } ?: "DEFAULT",
        )
        val userKey = fetchTossUserKey(accessToken)
        val providerUserId = "toss:$userKey"

        val user = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.TOSS, providerUserId)
            ?: userRepository.save(
                User(
                    authProvider = AuthProvider.TOSS,
                    providerUserId = providerUserId,
                    nickname = generateUniqueNickname(userKey),
                ),
            )

        return issueTokens(user, response)
    }

    @Transactional
    fun loginWithAnonymousKey(
        request: TossAnonymousLoginRequest,
        response: HttpServletResponse,
    ): TokenRefreshResponse {
        val normalizedHash = request.userKeyHash.trim()
        if (normalizedHash.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "userKeyHash는 비어 있을 수 없습니다.")
        }

        val providerUserId = "toss-anon:$normalizedHash"
        val user = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.TOSS, providerUserId)
            ?: userRepository.save(
                User(
                    authProvider = AuthProvider.TOSS,
                    providerUserId = providerUserId,
                    nickname = generateUniqueNicknameFromHash(normalizedHash),
                ),
            )

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

    private fun generateUniqueNickname(userKey: Long): String {
        val base = "토스유저$userKey"
        if (!userRepository.existsByNickname(base)) return base

        var seq = 1
        while (true) {
            val candidate = "${base}_$seq"
            if (!userRepository.existsByNickname(candidate)) return candidate
            seq += 1
        }
    }

    private fun generateUniqueNicknameFromHash(hash: String): String {
        val suffix = hash.takeLast(6).ifBlank { "USER" }
        val base = "토스유저_$suffix"
        if (!userRepository.existsByNickname(base)) return base

        var seq = 1
        while (true) {
            val candidate = "${base}_$seq"
            if (!userRepository.existsByNickname(candidate)) return candidate
            seq += 1
        }
    }

    private fun fetchTossAccessToken(authorizationCode: String, referrer: String): String {
        val payload = objectMapper.writeValueAsString(
            mapOf(
                "authorizationCode" to authorizationCode,
                "referrer" to referrer,
            ),
        )
        val request = HttpRequest.newBuilder()
            .uri(URI.create("$tossBaseUrl/api-partner/v1/apps-in-toss/user/oauth2/generate-token"))
            .timeout(Duration.ofSeconds(10))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8))
        val body = response.body()
        if (response.statusCode() !in 200..299) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토스 토큰 발급에 실패했습니다. code=${response.statusCode()}")
        }

        val root = objectMapper.readTree(body)
        if (root.has("error")) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토스 인가코드가 유효하지 않습니다.")
        }

        val resultType = root.path("resultType").asText("")
        if (resultType != "SUCCESS") {
            throw ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                root.path("error").path("reason").asText("토스 토큰 발급에 실패했습니다."),
            )
        }

        val token = root.path("success").path("accessToken").asText("")
        if (token.isBlank()) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토스 accessToken 응답이 비어 있습니다.")
        }
        return token
    }

    private fun fetchTossUserKey(accessToken: String): Long {
        val request = HttpRequest.newBuilder()
            .uri(URI.create("$tossBaseUrl/api-partner/v1/apps-in-toss/user/oauth2/login-me"))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", "Bearer $accessToken")
            .GET()
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8))
        val body = response.body()
        if (response.statusCode() !in 200..299) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토스 사용자 조회에 실패했습니다. code=${response.statusCode()}")
        }

        val root = objectMapper.readTree(body)
        val resultType = root.path("resultType").asText("")
        if (resultType != "SUCCESS") {
            throw ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                root.path("error").path("reason").asText("토스 사용자 조회에 실패했습니다."),
            )
        }

        val userKeyNode: JsonNode = root.path("success").path("userKey")
        if (!userKeyNode.isNumber) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토스 userKey를 확인할 수 없습니다.")
        }
        return userKeyNode.asLong()
    }

    private fun buildMtlsHttpClient(): HttpClient {
        if (mtlsPkcs12Path.isBlank() || mtlsPkcs12Password.isBlank()) {
            throw ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "mTLS 설정이 없습니다. APP_TOSS_MTLS_PKCS12_PATH / APP_TOSS_MTLS_PKCS12_PASSWORD 를 설정하세요.",
            )
        }

        val keyStore = KeyStore.getInstance("PKCS12")
        java.io.FileInputStream(mtlsPkcs12Path).use { fis ->
            keyStore.load(fis, mtlsPkcs12Password.toCharArray())
        }

        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(keyStore, mtlsPkcs12Password.toCharArray())

        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(null as KeyStore?)

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(kmf.keyManagers, tmf.trustManagers, null)

        return HttpClient.newBuilder()
            .sslContext(sslContext)
            .connectTimeout(Duration.ofSeconds(5))
            .build()
    }
}

data class TossLoginRequest(
    @field:NotBlank
    val authorizationCode: String,
    val referrer: String? = null,
)

data class TossAnonymousLoginRequest(
    @field:NotBlank
    val userKeyHash: String,
)
