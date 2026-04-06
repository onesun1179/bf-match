package com.bfmatch.api.user

import com.bfmatch.api.auth.AuthenticatedUser
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/me")
class MeController(
    private val meService: MeService,
    private val myRecordService: MyRecordService,
) {
    @GetMapping
    fun me(@AuthenticationPrincipal principal: AuthenticatedUser): MeResponse =
        meService.getMe(principal)

    @PatchMapping("/profile")
    fun updateProfile(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody @Valid request: UpdateMyProfileRequest,
    ): MeResponse = meService.updateMyProfile(principal, request)

    @PatchMapping("/skill")
    fun updateSkill(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody @Valid request: UpdateMySkillRequest,
    ): MeResponse = meService.updateMySkill(principal, request)

    @PostMapping("/skill/upgrade-grade")
    fun upgradeGrade(
        @AuthenticationPrincipal principal: AuthenticatedUser,
    ): MeResponse = meService.upgradeGrade(principal)

    @GetMapping("/record")
    fun myRecord(@AuthenticationPrincipal principal: AuthenticatedUser): MyRecordResponse =
        myRecordService.getMyRecord(principal.userId)

    @GetMapping("/record/recent-games")
    fun recentGames(@AuthenticationPrincipal principal: AuthenticatedUser): List<RecentGameRecord> =
        myRecordService.getAllRecentGames(principal.userId)

    @GetMapping("/record/partners")
    fun partners(@AuthenticationPrincipal principal: AuthenticatedUser): Map<String, List<PartnerStatResponse>> =
        myRecordService.getAllPartnerStats(principal.userId)

    @GetMapping("/record/monthly")
    fun monthly(@AuthenticationPrincipal principal: AuthenticatedUser): List<MonthlyStatResponse> =
        myRecordService.getAllMonthlyStats(principal.userId)

    @PatchMapping("/notification-setting")
    fun updateNotificationSetting(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestBody request: Map<String, Boolean>,
    ): MeResponse = meService.updateNotificationSetting(
        principal, request["enabled"] ?: true,
    )
}
