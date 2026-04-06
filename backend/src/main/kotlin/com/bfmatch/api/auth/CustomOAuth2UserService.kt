package com.bfmatch.api.auth

import com.bfmatch.api.user.AuthProvider
import com.bfmatch.api.user.User
import com.bfmatch.api.user.UserRepository
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Service

@Service
class CustomOAuth2UserService(
    private val userRepository: UserRepository,
) : OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private val delegate = DefaultOAuth2UserService()

    override fun loadUser(userRequest: OAuth2UserRequest): OAuth2User {
        val oAuth2User = delegate.loadUser(userRequest)
        val registrationId = userRequest.clientRegistration.registrationId

        if (registrationId != "kakao") {
            throw OAuth2AuthenticationException(
                OAuth2Error("unsupported_provider", "Unsupported provider: $registrationId", null),
            )
        }

        val kakaoAccount = oAuth2User.attributes["kakao_account"] as? Map<*, *>
        val profile = kakaoAccount?.get("profile") as? Map<*, *>
        val providerUserId = oAuth2User.attributes["id"]?.toString()
            ?: throw OAuth2AuthenticationException(
                OAuth2Error("missing_user_id", "Missing Kakao user id", null),
            )
        val email = kakaoAccount?.get("email")?.toString()
        val nickname = profile?.get("nickname")?.toString()
            ?: "kakao_$providerUserId"

        val savedUser = userRepository.findByAuthProviderAndProviderUserId(AuthProvider.KAKAO, providerUserId)
            ?.apply {
                this.email = email ?: this.email
                this.nickname = nickname
            }
            ?: User(
                authProvider = AuthProvider.KAKAO,
                providerUserId = providerUserId,
                email = email,
                nickname = nickname,
            )

        val user = userRepository.save(savedUser)
        return CustomOAuth2User(
            user = user,
            authenticatedUser = AuthenticatedUser(
                userId = user.id!!,
                provider = user.authProvider.name,
                providerUserId = user.providerUserId,
                email = user.email,
                nickname = user.nickname,
            ),
            attributesMap = oAuth2User.attributes,
        )
    }
}
