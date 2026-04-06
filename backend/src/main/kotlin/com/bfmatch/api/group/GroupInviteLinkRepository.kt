package com.bfmatch.api.group

import org.springframework.data.jpa.repository.JpaRepository

interface GroupInviteLinkRepository : JpaRepository<GroupInviteLink, Long> {
    fun findByToken(token: String): GroupInviteLink?
    fun findAllByGroupIdOrderByCreatedAtDesc(groupId: Long): List<GroupInviteLink>
}
