package com.bfmatch.api.auth

data class TokenRefreshResponse(
    val accessToken: String,
    val nickname: String,
)
