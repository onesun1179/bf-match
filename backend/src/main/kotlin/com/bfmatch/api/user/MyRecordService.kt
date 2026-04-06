package com.bfmatch.api.user

import com.bfmatch.api.group.GamePlayerRepository
import com.bfmatch.api.group.GameStatus
import com.bfmatch.api.group.GameType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class MyRecordService(
    private val userRepository: UserRepository,
    private val playerSkillRepository: PlayerSkillRepository,
    private val gamePlayerRepository: GamePlayerRepository,
) {
    @Transactional(readOnly = true)
    fun getMyRecord(userId: Long): MyRecordResponse {
        val user = userRepository.findById(userId).orElseThrow()
        val skill = playerSkillRepository.findByUserId(userId)

        val allPlays = gamePlayerRepository.findAllByUserId(userId)
        val finished = allPlays.filter { it.game.status == GameStatus.FINISHED }

        val totalGames = finished.size
        val totalWins = finished.count { it.team == it.game.winnerTeam }
        val totalLosses = totalGames - totalWins

        // 게임 타입별 통계
        fun typeStats(type: GameType?): TypeStatResponse {
            val plays = finished.filter { it.game.gameType == type }
            val wins = plays.count { it.team == it.game.winnerTeam }
            return TypeStatResponse(games = plays.size, wins = wins, losses = plays.size - wins, winRate = if (plays.isNotEmpty()) wins.toDouble() / plays.size * 100 else 0.0)
        }

        // 최근 10경기 결과
        val recentGames = finished.sortedByDescending { it.game.finishedAt }.take(10).map { gp ->
            val game = gp.game
            val isWin = gp.team == game.winnerTeam
            val allPlayers = gamePlayerRepository.findAllByGameId(game.id!!)
            val teammates = allPlayers.filter { it.team == gp.team && it.user.id != userId }
                .map { PlayerInfo(it.user.id!!, it.user.nickname, it.user.gender, it.gradeAtTime) }
            val opponents = allPlayers.filter { it.team != gp.team }
                .map { PlayerInfo(it.user.id!!, it.user.nickname, it.user.gender, it.gradeAtTime) }
            RecentGameRecord(
                gameId = game.id!!,
                groupName = game.group.name,
                gameType = game.gameType,
                isWin = isWin,
                teamAScore = game.teamAScore,
                teamBScore = game.teamBScore,
                myTeam = gp.team,
                gradeAtTime = gp.gradeAtTime,
                finishedAt = game.finishedAt?.toString(),
                teammates = teammates,
                opponents = opponents,
            )
        }

        // 연승/연패 계산
        val results = finished.sortedByDescending { it.game.finishedAt }.map { it.team == it.game.winnerTeam }
        var currentStreak = 0
        var streakType = true // true=연승, false=연패
        if (results.isNotEmpty()) {
            streakType = results[0]
            currentStreak = results.takeWhile { it == streakType }.size
        }

        // 파트너별 승률 (같은 팀이었던 사람)
        val partnerStats = mutableMapOf<Long, Pair<Int, Int>>() // userId -> (games, wins)
        for (gp in finished) {
            val teammates = gamePlayerRepository.findAllByGameId(gp.game.id!!)
                .filter { it.user.id != userId && it.team == gp.team }
            val isWin = gp.team == gp.game.winnerTeam
            for (tm in teammates) {
                val tid = tm.user.id!!
                val (g, w) = partnerStats.getOrDefault(tid, Pair(0, 0))
                partnerStats[tid] = Pair(g + 1, if (isWin) w + 1 else w)
            }
        }
        val topPartners = partnerStats.entries
            .sortedByDescending { it.value.first }
            .take(5)
            .map { (uid, pair) ->
                val partner = userRepository.findById(uid).orElse(null) ?: return@map null
                val pSkill = playerSkillRepository.findByUserId(uid)
                PartnerStatResponse(
                    userId = uid,
                    nickname = partner.nickname,
                    gender = partner.gender,
                    nationalGrade = pSkill?.nationalGrade,
                    games = pair.first,
                    wins = pair.second,
                    winRate = if (pair.first > 0) pair.second.toDouble() / pair.first * 100 else 0.0,
                )
            }.filterNotNull()

        val worstPartners = partnerStats.entries
            .filter { it.value.first >= 1 }
            .sortedBy { it.value.second.toDouble() / it.value.first }
            .take(5)
            .map { (uid, pair) ->
                val partner = userRepository.findById(uid).orElse(null) ?: return@map null
                val pSkill = playerSkillRepository.findByUserId(uid)
                PartnerStatResponse(
                    userId = uid,
                    nickname = partner.nickname,
                    gender = partner.gender,
                    nationalGrade = pSkill?.nationalGrade,
                    games = pair.first,
                    wins = pair.second,
                    winRate = if (pair.first > 0) pair.second.toDouble() / pair.first * 100 else 0.0,
                )
            }.filterNotNull()

        // 상대(적) 통계
        val opponentStats = mutableMapOf<Long, Pair<Int, Int>>() // userId -> (games, wins)
        for (gp in finished) {
            val opponents = gamePlayerRepository.findAllByGameId(gp.game.id!!)
                .filter { it.user.id != userId && it.team != gp.team }
            val isWin = gp.team == gp.game.winnerTeam
            for (op in opponents) {
                val oid = op.user.id!!
                val (g2, w2) = opponentStats.getOrDefault(oid, Pair(0, 0))
                opponentStats[oid] = Pair(g2 + 1, if (isWin) w2 + 1 else w2)
            }
        }
        val worstOpponents = opponentStats.entries
            .filter { it.value.first >= 3 }
            .sortedBy { it.value.second.toDouble() / it.value.first }
            .take(5)
            .map { (uid, pair) ->
                val op = userRepository.findById(uid).orElse(null) ?: return@map null
                val oSkill = playerSkillRepository.findByUserId(uid)
                PartnerStatResponse(
                    userId = uid, nickname = op.nickname, gender = op.gender,
                    nationalGrade = oSkill?.nationalGrade,
                    games = pair.first, wins = pair.second,
                    winRate = if (pair.first > 0) pair.second.toDouble() / pair.first * 100 else 0.0,
                )
            }.filterNotNull()

        // 급수별 전적
        val gradeStats = NationalGrade.entries.associateWith { grade ->
            val plays = finished.filter { it.gradeAtTime == grade }
            val wins = plays.count { it.team == it.game.winnerTeam }
            TypeStatResponse(games = plays.size, wins = wins, losses = plays.size - wins, winRate = if (plays.isNotEmpty()) wins.toDouble() / plays.size * 100 else 0.0)
        }.filter { it.value.games > 0 }

        // 월별 전적 (최근 6개월)
        val monthlyStats = finished
            .filter { it.game.finishedAt != null }
            .groupBy {
                val t = it.game.finishedAt!!
                val ym = t.toString().substring(0, 7) // "2026-04"
                ym
            }
            .entries
            .sortedByDescending { it.key }
            .take(6)
            .map { (month, plays) ->
                val wins = plays.count { it.team == it.game.winnerTeam }
                MonthlyStatResponse(month = month, games = plays.size, wins = wins, losses = plays.size - wins)
            }

        return MyRecordResponse(
            nickname = user.nickname,
            gender = user.gender,
            nationalGrade = skill?.nationalGrade,
            lv = skill?.lv ?: 1,
            exp = skill?.exp ?: 0.0,
            totalGames = totalGames,
            totalWins = totalWins,
            totalLosses = totalLosses,
            totalWinRate = if (totalGames > 0) totalWins.toDouble() / totalGames * 100 else 0.0,
            currentStreak = currentStreak,
            currentStreakType = if (streakType) "WIN" else "LOSS",
            maleDoubles = typeStats(GameType.MALE_DOUBLES),
            femaleDoubles = typeStats(GameType.FEMALE_DOUBLES),
            mixedDoubles = typeStats(GameType.MIXED_DOUBLES),
            freeGame = typeStats(GameType.FREE),
            recentGames = recentGames,
            topPartners = topPartners,
            worstPartners = worstPartners,
            worstOpponents = worstOpponents,
            gradeStats = gradeStats,
            monthlyStats = monthlyStats,
        )
    }

    @Transactional(readOnly = true)
    fun getAllRecentGames(userId: Long): List<RecentGameRecord> {
        val finished = gamePlayerRepository.findAllByUserId(userId)
            .filter { it.game.status == GameStatus.FINISHED }
            .sortedByDescending { it.game.finishedAt }
        return finished.map { gp ->
            val game = gp.game
            val allPlayers = gamePlayerRepository.findAllByGameId(game.id!!)
            RecentGameRecord(
                gameId = game.id!!, groupName = game.group.name, gameType = game.gameType,
                isWin = gp.team == game.winnerTeam,
                teamAScore = game.teamAScore, teamBScore = game.teamBScore,
                myTeam = gp.team, gradeAtTime = gp.gradeAtTime,
                finishedAt = game.finishedAt?.toString(),
                teammates = allPlayers.filter { it.team == gp.team && it.user.id != userId }.map { PlayerInfo(it.user.id!!, it.user.nickname, it.user.gender, it.gradeAtTime) },
                opponents = allPlayers.filter { it.team != gp.team }.map { PlayerInfo(it.user.id!!, it.user.nickname, it.user.gender, it.gradeAtTime) },
            )
        }
    }

    @Transactional(readOnly = true)
    fun getAllPartnerStats(userId: Long): Map<String, List<PartnerStatResponse>> {
        val finished = gamePlayerRepository.findAllByUserId(userId).filter { it.game.status == GameStatus.FINISHED }
        val partnerMap = mutableMapOf<Long, Pair<Int, Int>>()
        val opponentMap = mutableMapOf<Long, Pair<Int, Int>>()
        for (gp in finished) {
            val allP = gamePlayerRepository.findAllByGameId(gp.game.id!!)
            val isWin = gp.team == gp.game.winnerTeam
            allP.filter { it.user.id != userId && it.team == gp.team }.forEach { tm ->
                val (g, w) = partnerMap.getOrDefault(tm.user.id!!, Pair(0, 0))
                partnerMap[tm.user.id!!] = Pair(g + 1, if (isWin) w + 1 else w)
            }
            allP.filter { it.user.id != userId && it.team != gp.team }.forEach { op ->
                val (g, w) = opponentMap.getOrDefault(op.user.id!!, Pair(0, 0))
                opponentMap[op.user.id!!] = Pair(g + 1, if (isWin) w + 1 else w)
            }
        }
        fun toList(map: Map<Long, Pair<Int, Int>>, sortAsc: Boolean): List<PartnerStatResponse> {
            return map.entries
                .sortedBy { if (sortAsc) it.value.second.toDouble() / it.value.first else -(it.value.second.toDouble() / it.value.first) }
                .mapNotNull { (uid, pair) ->
                    val u = userRepository.findById(uid).orElse(null) ?: return@mapNotNull null
                    val s = playerSkillRepository.findByUserId(uid)
                    PartnerStatResponse(uid, u.nickname, u.gender, s?.nationalGrade, pair.first, pair.second, if (pair.first > 0) pair.second.toDouble() / pair.first * 100 else 0.0)
                }
        }
        return mapOf(
            "bestPartners" to toList(partnerMap, false),
            "worstPartners" to toList(partnerMap, true),
            "bestOpponents" to toList(opponentMap, false),
            "worstOpponents" to toList(opponentMap, true),
        )
    }

    @Transactional(readOnly = true)
    fun getAllMonthlyStats(userId: Long): List<MonthlyStatResponse> {
        return gamePlayerRepository.findAllByUserId(userId)
            .filter { it.game.status == GameStatus.FINISHED && it.game.finishedAt != null }
            .groupBy { it.game.finishedAt!!.toString().substring(0, 7) }
            .entries.sortedByDescending { it.key }
            .map { (month, plays) ->
                val wins = plays.count { it.team == it.game.winnerTeam }
                MonthlyStatResponse(month, plays.size, wins, plays.size - wins)
            }
    }
}

data class MyRecordResponse(
    val nickname: String,
    val gender: Gender?,
    val nationalGrade: NationalGrade?,
    val lv: Int,
    val exp: Double,
    val totalGames: Int,
    val totalWins: Int,
    val totalLosses: Int,
    val totalWinRate: Double,
    val currentStreak: Int,
    val currentStreakType: String,
    val maleDoubles: TypeStatResponse,
    val femaleDoubles: TypeStatResponse,
    val mixedDoubles: TypeStatResponse,
    val freeGame: TypeStatResponse,
    val recentGames: List<RecentGameRecord>,
    val topPartners: List<PartnerStatResponse>,
    val worstPartners: List<PartnerStatResponse>,
    val worstOpponents: List<PartnerStatResponse>,
    val gradeStats: Map<NationalGrade, TypeStatResponse>,
    val monthlyStats: List<MonthlyStatResponse>,
)

data class TypeStatResponse(val games: Int, val wins: Int, val losses: Int, val winRate: Double)

data class PlayerInfo(val userId: Long, val nickname: String, val gender: Gender?, val grade: NationalGrade?)

data class RecentGameRecord(
    val gameId: Long, val groupName: String, val gameType: GameType?,
    val isWin: Boolean, val teamAScore: Int?, val teamBScore: Int?,
    val myTeam: String, val gradeAtTime: NationalGrade?, val finishedAt: String?,
    val teammates: List<PlayerInfo>, val opponents: List<PlayerInfo>,
)

data class PartnerStatResponse(
    val userId: Long, val nickname: String, val gender: Gender?,
    val nationalGrade: NationalGrade?, val games: Int, val wins: Int, val winRate: Double,
)

data class MonthlyStatResponse(val month: String, val games: Int, val wins: Int, val losses: Int)
