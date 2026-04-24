package com.bfmatch.api.group

import com.bfmatch.api.user.Gender
import com.bfmatch.api.user.NationalGrade

data class GamePlayerResponse(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val nationalGrade: NationalGrade?,
)

data class GameResponse(
    val id: Long,
    val groupId: Long,
    val status: GameStatus,
    val proposalStatus: GameProposalStatus,
    val proposedByUserId: Long?,
    val proposalReviewedByUserId: Long?,
    val proposalReviewedAt: String?,
    val proposalRejectReason: String?,
    val gameType: GameType?,
    val teamA: List<GamePlayerResponse>,
    val teamB: List<GamePlayerResponse>,
    val courtNumber: Int?,
    val teamAScore: Int?,
    val teamBScore: Int?,
    val winnerTeam: String?,
    val pendingTeamAScore: Int?,
    val pendingTeamBScore: Int?,
    val pendingWinnerTeam: String?,
    val pendingRequestedByTeam: String?,
    val pendingRequestedByUserId: Long?,
    val pendingRequestedAt: String?,
    val createdAt: String,
    val startedAt: String?,
    val finishedAt: String?,
)

data class CreateGameRequest(
    val teamAUserIds: List<Long>,
    val teamBUserIds: List<Long>,
    val asProposal: Boolean? = null,
)

data class FinishGameRequest(
    val winnerTeam: String,
)

data class UpdateGameCourtNumberRequest(
    val courtNumber: Int?,
)

data class RejectGameProposalRequest(
    val reason: String? = null,
)

data class MemberStatResponse(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val nationalGrade: NationalGrade?,
    val lv: Int,
    val exp: Double,
    val finishedGameCount: Int,
    val totalGameCount: Int,
    val winCount: Int,
    val winRate: Double,
    val overallFinishedGameCount: Int,
    val overallTotalGameCount: Int,
    val overallWinCount: Int,
    val overallWinRate: Double,
)

data class TeamStatResponse(
    val teamKey: String,
    val eventGames: Int,
    val eventWins: Int,
    val eventWinRate: Double,
    val overallGames: Int,
    val overallWins: Int,
    val overallWinRate: Double,
)

enum class GameType { MALE_DOUBLES, FEMALE_DOUBLES, MIXED_DOUBLES, FREE }

data class RecommendRequest(val type: GameType)

data class RecommendResponse(
    val teamAUserIds: List<Long>,
    val teamBUserIds: List<Long>,
)
