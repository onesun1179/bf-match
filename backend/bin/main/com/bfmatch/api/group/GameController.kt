package com.bfmatch.api.group

import com.bfmatch.api.auth.AuthenticatedUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups/{groupId}/games")
class GameController(
    private val gameService: GameService,
) {
    @PostMapping
    fun createGame(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @RequestBody request: CreateGameRequest,
    ): GameResponse = gameService.createGame(principal, groupId, request)

    @GetMapping
    fun listGames(
        @PathVariable groupId: Long,
    ): List<GameResponse> = gameService.getGames(groupId)

    @GetMapping("/member-stats")
    fun memberStats(@PathVariable groupId: Long): List<MemberStatResponse> =
        gameService.getMemberStats(groupId)

    @GetMapping("/team-stats")
    fun teamStats(@PathVariable groupId: Long): List<TeamStatResponse> =
        gameService.getTeamStats(groupId)

    @PostMapping("/recommend")
    fun recommendGame(
        @PathVariable groupId: Long,
        @RequestBody request: RecommendRequest,
    ): RecommendResponse = gameService.recommendGame(groupId, request.type)

    @PostMapping("/{gameId}/start")
    fun startGame(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.startGame(principal, groupId, gameId)

    @PostMapping("/{gameId}/finish")
    fun finishGame(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.finishGame(principal, groupId, gameId)

    @PostMapping("/{gameId}/score")
    fun submitScore(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
        @RequestBody request: FinishGameRequest,
    ): GameResponse = gameService.submitScore(principal, groupId, gameId, request)

    @PostMapping("/{gameId}/score/confirm")
    fun confirmScore(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.confirmScore(principal, groupId, gameId)

    @PostMapping("/{gameId}/score/reject")
    fun rejectScore(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.rejectScore(principal, groupId, gameId)

    @PostMapping("/{gameId}/court-number")
    fun updateCourtNumber(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
        @RequestBody request: UpdateGameCourtNumberRequest,
    ): GameResponse = gameService.updateCourtNumber(principal, groupId, gameId, request)

    @PostMapping("/{gameId}/proposal/approve")
    fun approveProposal(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.approveProposal(principal, groupId, gameId)

    @PostMapping("/{gameId}/proposal/reject")
    fun rejectProposal(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
        @RequestBody request: RejectGameProposalRequest,
    ): GameResponse = gameService.rejectProposal(principal, groupId, gameId, request)

    @PostMapping("/{gameId}/cancel")
    fun cancelGame(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ): GameResponse = gameService.cancelGame(principal, groupId, gameId)

    @DeleteMapping("/{gameId}")
    fun deleteGame(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable groupId: Long,
        @PathVariable gameId: Long,
    ) = gameService.deleteGame(principal, groupId, gameId)
}
