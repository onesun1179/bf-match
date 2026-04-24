package com.bfmatch.api.group

import jakarta.validation.constraints.Positive

data class InviteGroupMemberRequest(
    @field:Positive
    val inviteeUserId: Long,
)
