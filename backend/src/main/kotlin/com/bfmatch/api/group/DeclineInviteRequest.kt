package com.bfmatch.api.group

import jakarta.validation.constraints.Size

data class DeclineInviteRequest(
    @field:Size(max = 400)
    val reason: String? = null,
)
