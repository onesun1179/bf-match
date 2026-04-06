package com.bfmatch.api.group

import org.springframework.data.jpa.repository.JpaRepository

interface GroupMemberRepository : JpaRepository<GroupMember, Long> {
    fun findAllByUserId(userId: Long): List<GroupMember>
    fun findAllByGroupId(groupId: Long): List<GroupMember>
    fun findByGroupIdAndUserId(groupId: Long, userId: Long): GroupMember?
    fun countByGroupIdAndStatus(groupId: Long, status: GroupMemberStatus): Long
}
