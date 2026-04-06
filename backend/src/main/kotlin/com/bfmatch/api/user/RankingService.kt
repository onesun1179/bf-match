package com.bfmatch.api.user

import com.bfmatch.api.group.GamePlayerRepository
import com.bfmatch.api.group.GameStatus
import com.bfmatch.api.group.GameType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RankingService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val gamePlayerRepository: GamePlayerRepository,
) {
    @Transactional(readOnly = true)
    fun getRanking(): RankingByGradeResponse {
        val users = userRepository.findAll()
        val gradeOrder = NationalGrade.entries
        val gameTypes = listOf(null) + GameType.entries // null = 전체

        val allEntries = mutableListOf<GradeTypeRankingEntry>()

        for (user in users) {
            val skill = playerSkillRepository.findByUserId(user.id!!) ?: continue
            val plays = gamePlayerRepository.findAllByUserId(user.id!!)
                .filter { it.game.status == GameStatus.FINISHED && it.gradeAtTime != null }

            val byGrade = plays.groupBy { it.gradeAtTime!! }

            for ((grade, gradePlays) in byGrade) {
                for (gameType in gameTypes) {
                    val filtered = if (gameType == null) gradePlays else gradePlays.filter { it.game.gameType == gameType }
                    val gameCount = filtered.size
                    val winCount = filtered.count { it.team == it.game.winnerTeam }
                    val winRate = if (gameCount == 0) 0.0 else winCount.toDouble() / gameCount * 100

                    allEntries.add(
                        GradeTypeRankingEntry(
                            userId = user.id!!,
                            nickname = user.nickname,
                            gender = user.gender,
                            grade = grade,
                            currentGrade = skill.nationalGrade,
                            gameType = gameType,
                            lv = skill.lv,
                            exp = skill.exp,
                            gameCount = gameCount,
                            winCount = winCount,
                            winRate = winRate,
                        ),
                    )
                }
            }
        }

        // grade -> gameType -> entries (승률순)
        val result = gradeOrder.associateWith { grade ->
            gameTypes.associateWith { type ->
                allEntries
                    .filter { it.grade == grade && it.gameType == type }
                    .sortedWith(
                        compareByDescending<GradeTypeRankingEntry> { it.winRate }
                            .thenByDescending { it.currentGrade.ordinal }
                            .thenBy { genderOrder(it.gender) }
                            .thenBy { it.nickname }
                            .thenBy { it.userId },
                    )
            }.mapKeys { it.key?.name ?: "ALL" }
        }

        return RankingByGradeResponse(grades = result)
    }

    @Transactional(readOnly = true)
    fun getTeamRanking(): TeamRankingByGradeResponse {
        val gradeOrder = NationalGrade.entries
        val gameTypes = listOf(null) + GameType.entries // null = 전체
        val teamRankMap = linkedMapOf<String, TeamRankAccumulator>()

        val finishedGamesById = gamePlayerRepository.findAll()
            .map { it.game }
            .distinctBy { it.id }
            .filter { it.status == GameStatus.FINISHED && it.winnerTeam != null }
            .associateBy { it.id!! }

        for (gameId in finishedGamesById.keys) {
            val game = finishedGamesById[gameId] ?: continue
            val players = gamePlayerRepository.findAllByGameId(gameId)
                .filter { it.gradeAtTime != null }
            if (players.isEmpty()) continue

            applyTeamResult(players.filter { it.team == "A" }, game.winnerTeam == "A", game.gameType, teamRankMap)
            applyTeamResult(players.filter { it.team == "B" }, game.winnerTeam == "B", game.gameType, teamRankMap)
        }

        val result = gradeOrder.associateWith { grade ->
            gameTypes.associateWith { type ->
                teamRankMap.values
                    .filter { it.teamGrade == grade && it.gameType == type }
                    .sortedWith(
                        compareByDescending<TeamRankAccumulator> { it.winRate() }
                            .thenByDescending { it.teamGrade.ordinal }
                            .thenBy { it.memberNames() },
                    )
                    .mapIndexed { idx, acc ->
                        TeamRankingEntry(
                            rank = idx + 1,
                            teamKey = acc.teamKey,
                            teamGrade = acc.teamGrade,
                            members = acc.members.map {
                                TeamRankingMember(
                                    userId = it.userId,
                                    nickname = it.nickname,
                                    gender = it.gender,
                                    grade = it.grade,
                                )
                            },
                            gameCount = acc.gameCount,
                            winCount = acc.winCount,
                            winRate = acc.winRate(),
                        )
                    }
            }.mapKeys { it.key?.name ?: "ALL" }
        }

        return TeamRankingByGradeResponse(grades = result)
    }

    private fun genderOrder(gender: Gender?): Int = when (gender) {
        Gender.MALE -> 0
        Gender.FEMALE -> 1
        else -> 2
    }

    private fun applyTeamResult(
        teamPlayers: List<com.bfmatch.api.group.GamePlayer>,
        isWinner: Boolean,
        gameType: GameType?,
        teamRankMap: MutableMap<String, TeamRankAccumulator>,
    ) {
        if (teamPlayers.isEmpty()) return
        val sortedPlayers = teamPlayers.sortedWith(
            compareByDescending<com.bfmatch.api.group.GamePlayer> { it.gradeAtTime!!.ordinal }
                .thenBy { it.user.nickname }
                .thenBy { it.user.id!! },
        )
        val teamKey = sortedPlayers.joinToString("-") { it.user.id.toString() }
        val members = sortedPlayers.map {
            TeamRankingMemberSnapshot(
                userId = it.user.id!!,
                nickname = it.user.nickname,
                gender = it.user.gender,
                grade = it.gradeAtTime!!,
            )
        }
        val teamGrade = members.maxBy { it.grade.ordinal }.grade

        val typeKeys = mutableListOf<String?>(null)
        if (gameType != null) typeKeys.add(gameType.name)

        for (typeKey in typeKeys) {
            val scopedTeamKey = "${teamGrade.name}:${typeKey ?: "ALL"}:$teamKey"
            val acc = teamRankMap[scopedTeamKey] ?: TeamRankAccumulator(
                teamKey = teamKey,
                members = members,
                teamGrade = teamGrade,
                gameType = typeKey?.let { GameType.valueOf(it) },
            )
            acc.gameCount += 1
            if (isWinner) acc.winCount += 1
            teamRankMap[scopedTeamKey] = acc
        }
    }
}

data class GradeTypeRankingEntry(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val grade: NationalGrade,
    val currentGrade: NationalGrade,
    val gameType: GameType?,
    val lv: Int,
    val exp: Double,
    val gameCount: Int,
    val winCount: Int,
    val winRate: Double,
)

data class RankingByGradeResponse(
    val grades: Map<NationalGrade, Map<String, List<GradeTypeRankingEntry>>>,
)

data class TeamRankingMember(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val grade: NationalGrade,
)

data class TeamRankingEntry(
    val rank: Int,
    val teamKey: String,
    val teamGrade: NationalGrade,
    val members: List<TeamRankingMember>,
    val gameCount: Int,
    val winCount: Int,
    val winRate: Double,
)

data class TeamRankingByGradeResponse(
    val grades: Map<NationalGrade, Map<String, List<TeamRankingEntry>>>,
)

private data class TeamRankingMemberSnapshot(
    val userId: Long,
    val nickname: String,
    val gender: Gender?,
    val grade: NationalGrade,
)

private data class TeamRankAccumulator(
    val teamKey: String,
    val members: List<TeamRankingMemberSnapshot>,
    val teamGrade: NationalGrade,
    val gameType: GameType?,
    var gameCount: Int = 0,
    var winCount: Int = 0,
) {
    fun winRate(): Double = if (gameCount == 0) 0.0 else winCount.toDouble() / gameCount * 100
    fun memberNames(): String = members.joinToString(",") { it.nickname }
}
