package com.bfmatch.api.user

import jakarta.validation.constraints.Size

data class UpdateMyProfileRequest(
    @field:Size(min = 2, max = 10)
    val nickname: String,
    val gender: Gender? = null,
    @field:Size(max = 30)
    val regionCode: String? = null,
    @field:Size(max = 120)
    val preferredCourt: String? = null,
)
