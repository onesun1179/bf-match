package com.bfmatch.api.auth

data class AuthenticatedUser(
    val userId: Long,
    val provider: String,
    val providerUserId: String,
    val email: String?,
    val nickname: String,
    val sessionId: String? = null,
)
