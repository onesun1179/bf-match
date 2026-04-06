package com.bfmatch.api.group

import org.springframework.data.jpa.repository.JpaRepository

interface MatchGroupRepository : JpaRepository<MatchGroup, Long> {
    fun findAllByVisibilityOrderByCreatedAtDesc(visibility: GroupVisibility): List<MatchGroup>
}
