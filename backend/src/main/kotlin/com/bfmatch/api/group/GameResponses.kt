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
    val gameType: GameType?,
    val teamA: List<GamePlayerResponse>,
    val teamB: List<GamePlayerResponse>,
    val courtNumber: Int?,
    val teamAScore: Int?,
    val teamBScore: Int?,
    val winnerTeam: String?,
    val pendingTeamAScore: Int?,
    val pendingTeamBScore: Int?,
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
)

data class FinishGameRequest(
    val teamAScore: Int,
    val teamBScore: Int,
)

data class UpdateGameCourtNumberRequest(
    val courtNumber: Int?,
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
)

enum class GameType { MALE_DOUBLES, FEMALE_DOUBLES, MIXED_DOUBLES, FREE }

data class RecommendRequest(val type: GameType)

data class RecommendResponse(
    val teamAUserIds: List<Long>,
    val teamBUserIds: List<Long>,
)
