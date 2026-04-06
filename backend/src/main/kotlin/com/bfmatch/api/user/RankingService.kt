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
    companion object {
        const val MIN_GAMES = 5
    }

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
                    if (gameCount < MIN_GAMES) continue
                    val winCount = filtered.count { it.team == it.game.winnerTeam }
                    val winRate = winCount.toDouble() / gameCount * 100

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
                    .sortedWith(compareByDescending<GradeTypeRankingEntry> { it.winRate }.thenByDescending { it.gameCount })
            }.mapKeys { it.key?.name ?: "ALL" }
        }

        return RankingByGradeResponse(grades = result)
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
