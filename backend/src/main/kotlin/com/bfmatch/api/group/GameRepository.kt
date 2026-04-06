package com.bfmatch.api.group

import org.springframework.data.jpa.repository.JpaRepository

interface GameRepository : JpaRepository<Game, Long> {
    fun findAllByGroupIdOrderByCreatedAtDesc(groupId: Long): List<Game>
    fun findByIdAndGroupId(id: Long, groupId: Long): Game?
}
