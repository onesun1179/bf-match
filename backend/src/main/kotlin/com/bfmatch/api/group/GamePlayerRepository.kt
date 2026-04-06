package com.bfmatch.api.group

import org.springframework.data.jpa.repository.JpaRepository

interface GamePlayerRepository : JpaRepository<GamePlayer, Long> {
    fun findAllByGameId(gameId: Long): List<GamePlayer>
    fun findByGameIdAndUserId(gameId: Long, userId: Long): GamePlayer?
    fun findAllByUserId(userId: Long): List<GamePlayer>
}
