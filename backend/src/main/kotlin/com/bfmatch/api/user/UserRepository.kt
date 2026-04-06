package com.bfmatch.api.user

import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, Long> {
    fun findByAuthProviderAndProviderUserId(authProvider: AuthProvider, providerUserId: String): User?
    fun existsByNickname(nickname: String): Boolean
}
