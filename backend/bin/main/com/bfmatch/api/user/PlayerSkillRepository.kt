package com.bfmatch.api.user

import org.springframework.data.jpa.repository.JpaRepository

interface PlayerSkillRepository : JpaRepository<PlayerSkill, Long> {
    fun findByUserId(userId: Long): PlayerSkill?
}
