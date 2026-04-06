package com.bfmatch.api.group

import com.bfmatch.api.user.NationalGrade
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateGroupRequest(
    @field:NotBlank
    @field:Size(min = 2, max = 60)
    val name: String,
    @field:Size(max = 400)
    val description: String? = null,
    val visibility: GroupVisibility = GroupVisibility.INVITE_ONLY,
    @field:Size(max = 200)
    val location: String? = null,
    val startAt: String? = null,
    val endAt: String? = null,
    val registrationDeadline: String? = null,
    val minGrade: NationalGrade? = null,
    val maxGrade: NationalGrade? = null,
    val maxMembers: Int? = null,
    val maxMale: Int? = null,
    val maxFemale: Int? = null,
)
