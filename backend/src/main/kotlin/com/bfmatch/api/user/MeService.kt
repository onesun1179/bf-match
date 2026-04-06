package com.bfmatch.api.user

import com.bfmatch.api.auth.AuthenticatedUser
import com.bfmatch.api.notification.NotificationService
import com.bfmatch.api.notification.NotificationType
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class MeService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val notificationService: NotificationService,
) {
    @Transactional(readOnly = true)
    fun getMe(authenticatedUser: AuthenticatedUser): MeResponse {
        val user = getUser(authenticatedUser.userId)
        val skill = playerSkillRepository.findByUserId(user.id!!)

        return MeResponse(
            id = user.id!!,
            authProvider = user.authProvider.name,
            email = user.email,
            nickname = user.nickname,
            gender = user.gender,
            regionCode = user.regionCode,
            preferredCourt = user.preferredCourt,
            skill = skill?.let {
                SkillResponse(
                    nationalGrade = it.nationalGrade,
                    lv = it.lv,
                    exp = it.exp,
                    canUpgradeGrade = it.lv >= 99 && it.exp >= 100.0 && it.nationalGrade != NationalGrade.S,
                )
            },
            onboardingCompleted = skill != null,
            notificationEnabled = user.notificationEnabled,
        )
    }

    @Transactional
    fun updateMyProfile(authenticatedUser: AuthenticatedUser, request: UpdateMyProfileRequest): MeResponse {
        val user = getUser(authenticatedUser.userId)
        val trimmedNickname = request.nickname.trim()
        if (trimmedNickname != user.nickname && userRepository.existsByNickname(trimmedNickname)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.")
        }
        user.nickname = trimmedNickname
        if (request.gender != null) user.gender = request.gender
        user.regionCode = request.regionCode?.trim()?.ifBlank { null }
        user.preferredCourt = request.preferredCourt?.trim()?.ifBlank { null }

        userRepository.save(user)
        return getMe(authenticatedUser)
    }

    @Transactional
    fun updateMySkill(authenticatedUser: AuthenticatedUser, request: UpdateMySkillRequest): MeResponse {
        val user = getUser(authenticatedUser.userId)
        val existingSkill = playerSkillRepository.findByUserId(user.id!!)

        val skill = existingSkill?.apply {
            nationalGrade = request.nationalGrade
        } ?: PlayerSkill(
            user = user,
            nationalGrade = request.nationalGrade,
            lv = 1,
            exp = 0.0,
        )

        playerSkillRepository.save(skill)
        return getMe(authenticatedUser)
    }

    @Transactional
    fun updateNotificationSetting(authenticatedUser: AuthenticatedUser, enabled: Boolean): MeResponse {
        val user = getUser(authenticatedUser.userId)
        user.notificationEnabled = enabled
        userRepository.save(user)
        return getMe(authenticatedUser)
    }

    @Transactional
    fun upgradeGrade(authenticatedUser: AuthenticatedUser): MeResponse {
        val user = getUser(authenticatedUser.userId)
        val skill = playerSkillRepository.findByUserId(user.id!!)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Skill not found.")
        if (skill.lv < 99 || skill.exp < 100.0) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "LV 99, EXP 100 이상이어야 급수 업그레이드가 가능합니다.")
        }
        val grades = NationalGrade.entries
        val currentIdx = grades.indexOf(skill.nationalGrade)
        if (currentIdx >= grades.size - 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 최고 급수입니다.")
        }
        val newGrade = grades[currentIdx + 1]
        skill.nationalGrade = newGrade
        skill.lv = 1
        skill.exp = 0.0
        playerSkillRepository.save(skill)

        notificationService.send(user.id!!, NotificationType.GRADE_UPGRADED,
            "급수 업그레이드", "급수가 ${newGrade.name}로 업그레이드되었습니다.")

        return getMe(authenticatedUser)
    }

    private fun getUser(userId: Long): User =
        userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found.")
        }
}
