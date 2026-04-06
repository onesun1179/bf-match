package com.bfmatch.api.auth

import com.bfmatch.api.user.User
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.oauth2.core.user.OAuth2User

class CustomOAuth2User(
    val user: User,
    val authenticatedUser: AuthenticatedUser,
    private val attributesMap: Map<String, Any>,
) : OAuth2User {
    override fun getName(): String = authenticatedUser.userId.toString()

    override fun getAttributes(): Map<String, Any> = attributesMap

    override fun getAuthorities(): Collection<GrantedAuthority> = emptyList()
}
