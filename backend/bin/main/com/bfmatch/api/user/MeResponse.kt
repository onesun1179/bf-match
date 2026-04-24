package com.bfmatch.api.user

data class MeResponse(
    val id: Long,
    val authProvider: String,
    val email: String?,
    val nickname: String,
    val gender: Gender?,
    val regionCode: String?,
    val preferredCourt: String?,
    val skill: SkillResponse?,
    val onboardingCompleted: Boolean,
    val notificationEnabled: Boolean,
)

data class SkillResponse(
    val nationalGrade: NationalGrade,
    val lv: Int,
    val exp: Double,
    val canUpgradeGrade: Boolean,
)
