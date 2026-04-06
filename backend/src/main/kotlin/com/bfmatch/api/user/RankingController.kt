package com.bfmatch.api.user

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/ranking")
class RankingController(
    private val rankingService: RankingService,
) {
    @GetMapping
    fun ranking(): RankingByGradeResponse = rankingService.getRanking()

    @GetMapping("/teams")
    fun teamRanking(): TeamRankingByGradeResponse = rankingService.getTeamRanking()
}
